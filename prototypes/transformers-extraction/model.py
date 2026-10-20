# -*- coding: utf-8 -*-
"""model.py — 变形金刚配色推导的共享模型层。

把「像素池 / 角色定义 / 叙事靶心 / 对比度可行性 / 色斑度量」集中在这里，
solve.py（求解）与 blobcensus.py（普查）都从这里取，避免两份真相。
"""
import os, sys, io, math, colorsys
from functools import lru_cache
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
from sources import SRC_DIR, IMAGES   # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


# ── 颜色数学 ─────────────────────────────────────────────────────────
def rgb_of(h):
    h = h.lstrip("#")[:6]
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def hx(c):
    return "#%02X%02X%02X" % tuple(int(round(max(0, min(255, v)))) for v in c)


def lum(rgb):
    if isinstance(rgb, str):
        rgb = rgb_of(rgb)
    def lin(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = [lin(v) for v in rgb]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    l1, l2 = lum(a), lum(b)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


_LAB = {}


def to_lab(hexv):
    if hexv in _LAB:
        return _LAB[hexv]
    def lin(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = [lin(v) for v in rgb_of(hexv)]
    x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
    y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b)
    z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883
    f = lambda t: (t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116)
    fx, fy, fz = f(x), f(y), f(z)
    lab = (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))
    _LAB[hexv] = lab
    return lab


@lru_cache(maxsize=None)
def de(a, b):
    A, B = to_lab(a), to_lab(b)
    return sum((A[i] - B[i]) ** 2 for i in range(3)) ** 0.5


def hsl(hexv):
    r, g, b = [v / 255 for v in rgb_of(hexv)]
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    d = mx - mn
    if d == 0:
        return 0.0, 0.0, l
    if mx == r:
        h = ((g - b) / d) % 6
    elif mx == g:
        h = (b - g) / d + 2
    else:
        h = (r - g) / d + 4
    h *= 60
    s = 0 if l in (0, 1) else d / (1 - abs(2 * l - 1))
    return h, s, l


def from_hsl(h, s, l):
    r, g, b = colorsys.hls_to_rgb(h / 360.0, l, s)
    return hx((r * 255, g * 255, b * 255))


def hue_dist(a, b):
    d = abs(a - b) % 360
    return 360 - d if d > 180 else d


# ── 五张图的像素账本 ─────────────────────────────────────────────────
print("载入五张图…", end=" ", flush=True)
POOL = {}          # hex -> {pop, files{}}
ARR = {}           # file -> (W, H, flat uint8 array)
for fname, _, _ in IMAGES:
    im = Image.open(os.path.join(SRC_DIR, fname)).convert("RGB")
    W, H = im.size
    a = np.asarray(im).reshape(-1, 3)
    ARR[fname] = (W, H, a)
    u, cnt = np.unique(a, axis=0, return_counts=True)
    for px, c in zip(u, cnt):
        k = hx(px)
        e = POOL.setdefault(k, {"pop": 0, "files": {}})
        e["pop"] += int(c)
        e["files"][fname] = e["files"].get(fname, 0) + int(c)
ALL = list(POOL.keys())
CH = {k: hsl(k) for k in ALL}          # (H 度, S 0..1, HSL 明度 L 0..1)
CL = {k: lum(rgb_of(k)) for k in ALL}   # WCAG 相对亮度
HL = {k: CH[k][2] for k in ALL}         # HSL 明度（设计师眼里的 L）
print("%d 种真实像素颜色" % len(ALL))


# ── 邻域人口全表（一次性算完，之后 O(1) 查询）────────────────────────
def _near_pop_table():
    """pop[k] = 全图有多少像素与该色 L1 距离 ≤ 6。

    做法：把 336,185 个不同颜色编码成整数 r*65536+g*256+b，排序后
    枚举 L1 球（半径 6，377 个格点）逐个平移查表。numpy 向量化，秒级完成。
    """
    n = len(ALL)
    arr = np.array([rgb_of(k) for k in ALL], dtype=np.int64)
    codes = (arr[:, 0] << 16) | (arr[:, 1] << 8) | arr[:, 2]
    order = np.argsort(codes)
    scodes = codes[order]
    spop = np.array([POOL[ALL[i]]["pop"] for i in order], dtype=np.int64)
    total = np.zeros(n, dtype=np.int64)
    offs = []
    for dr in range(-6, 7):
        for dg in range(-6, 7):
            for db in range(-6, 7):
                if abs(dr) + abs(dg) + abs(db) <= 6:
                    offs.append((dr, dg, db))
    for dr, dg, db in offs:
        r = arr[:, 0] + dr
        g = arr[:, 1] + dg
        b = arr[:, 2] + db
        ok = (r >= 0) & (r < 256) & (g >= 0) & (g < 256) & (b >= 0) & (b < 256)
        if not ok.any():
            continue
        shifted = (r[ok] << 16) | (g[ok] << 8) | b[ok]
        pos = np.searchsorted(scodes, shifted)
        pos = np.clip(pos, 0, n - 1)
        hit = scodes[pos] == shifted
        idx = np.nonzero(ok)[0][hit]
        np.add.at(total, idx, spop[pos[hit]])
    return {ALL[i]: int(total[i]) for i in range(n)}


print("计算邻域人口全表…", end=" ", flush=True)
NEAR = _near_pop_table()
print("完成")


# ── 色斑度量：颜色在原图上是不是「一块看得见的实色」──────────────────
_IICACHE = {}


def _integral(fname):
    if fname not in _IICACHE:
        W, H, a = ARR[fname]
        ii = np.zeros((H + 1, W + 1), dtype=np.int32)
        ii[1:, 1:] = a.astype(np.int32).sum(axis=1).reshape(H, W).cumsum(0).cumsum(1)
        _IICACHE[fname] = ii
    return _IICACHE[fname]


@lru_cache(maxsize=None)
def blob(k, fname, R=24):
    """该颜色在 fname 里最大的连续色斑（49×49 窗口内 L1≤6 的像素数）"""
    W, H, a = ARR[fname]
    t = np.array(rgb_of(k), dtype=np.int16)
    mask = (np.abs(a.astype(np.int16) - t).sum(axis=1) <= 6).reshape(H, W)
    ys, xs = np.nonzero(mask)
    if len(ys) == 0:
        return 0
    ii = _integral(fname)
    y0 = np.clip(ys - R, 0, H); y1 = np.clip(ys + R + 1, 0, H)
    x0 = np.clip(xs - R, 0, W); x1 = np.clip(xs + R + 1, 0, W)
    s = ii[y1, x1] - ii[y0, x1] - ii[y1, x0] + ii[y0, x0]
    return int(s.max())


@lru_cache(maxsize=None)
def best_blob(k):
    b, bf = 0, None
    for fname in ARR:
        n = blob(k, fname)
        if n > b:
            b, bf = n, fname
    return b, bf


# ── 8 个背景槽：5.jpg 夜空的真实像素明度阶 ───────────────────────────
# 这一步是整套设计的立足点：界面底色不是「算出来的蓝」，而是《变形金刚 One》
# 海报那片夜空里的真实像素，按明度排成一条阶。每一阶都可在原图上指认。
SKY_BASE = "#030C1B"     # 5.jpg 夜空，精确 208 px，H217.5 S80.0 L5.9（族锚点）
LADDER = [
    ("codeBlockBg",       "#020B1C",  "地核停机坪：全场最深的舞台，代码像停在地核里"),
    ("sidebarBg",         "#021128",  "侧舱走道：比主场再沉半档，视线先落在正文"),
    ("background",        "#08122B",  "赛博坦午夜天台：整块界面的「场」"),
    ("backgroundPanel",   "#04133A",  "舱室面板：浮起一层，承接卡片"),
    ("inputBg",           "#022447",  "输入甲板：比气泡再凹一点，一浮一沉不靠边框分层"),
    ("codeHeaderBg",      "#0A2250",  "代码盖板：卡片的顶灯，比代码区亮一整档"),
    ("backgroundElement", "#0D2354",  "悬浮钢层：浮层 / 悬浮卡的落点，阶梯顶端"),
    ("bubbleBg",          "#241340",  "Arcee 紫气室：唯一离开蓝家族的表面（5.jpg 星云洋红）"),
]
bg = {name: hexv for name, hexv, _ in LADDER}

SURF = {k: bg[k] for k in ("background", "backgroundPanel", "backgroundElement",
                           "sidebarBg", "bubbleBg", "inputBg", "codeBlockBg", "codeHeaderBg")}
PANEL, BGND, ELEM, CODEBG = SURF["backgroundPanel"], SURF["background"], SURF["backgroundElement"], SURF["codeBlockBg"]


def alpha_over(hexv, alpha, base):
    s = rgb_of(hexv); b = rgb_of(base)
    return hx(tuple(s[i] * alpha + b[i] * (1 - alpha) for i in range(3)))


# ── 25 个设计岗位 ────────────────────────────────────────────────────
# 窗口全部由「原图里这个色相家族实际存在的明度台阶」倒推而来（见 ladderprobe），
# 不是拍脑袋定的色相区间。每个岗位在窗口里挑一个「在图上成片存在」的真实像素。
# (name, h0, h1, lmin, lmax, smin, smax, minpop, 说明)
ROLES = [
    ("primary",           338, 359, 0.36, 0.52, 0.80, 1.00, 2,  "汽车人徽章红：品牌心跳"),
    ("secondary",         206, 218, 0.36, 0.46, 0.50, 0.75, 2,  "能量电蓝：晶体蓝里点亮的那一档"),
    ("info",              186, 202, 0.28, 0.40, 0.80, 1.00, 2,  "塞伯坦全息青：能量晶体的冷光"),
    ("success",            88, 140, 0.48, 0.74, 0.02, 0.20, 2,  "山林苔灰：素材里没有鲜绿，完成态只能是苔色"),
    ("warning",            30,  52, 0.22, 0.42, 0.85, 1.00, 2,  "炮口琥珀：车漆的暗部，压暗一档"),
    ("error",               2,  30, 0.40, 0.58, 0.80, 1.00, 2,  "熔炉橙红：过热告急，与徽章红分家"),
    ("borderActive",       38,  56, 0.38, 0.56, 0.88, 1.00, 2,  "焦点环＝大黄蜂车漆黄：全场最醒目的点"),
    ("border",            190, 232, 0.24, 0.46, 0.04, 0.32, 2,  "钢板接缝：分割线是金属缝不是描边"),
    ("diffAdded",          45, 140, 0.38, 0.64, 0.02, 0.40, 2,  "新增＝战场上重新长出的草坡"),
    ("diffRemoved",        15,  52, 0.48, 0.62, 0.12, 0.46, 2,  "删除＝被击穿的旧装甲铜"),
    ("markdownHeading",    44,  58, 0.66, 0.78, 0.85, 1.00, 2,  "标题＝海报上那轮太阳：主题的签名色"),
    ("markdownLink",      188, 206, 0.32, 0.50, 0.70, 1.00, 2,  "链接＝能量电弧"),
    ("markdownCode",      285, 318, 0.42, 0.66, 0.12, 0.40, 2,  "行内码＝霸天虎紫"),
    ("markdownEmph",       14,  32, 0.60, 0.76, 0.85, 1.00, 2,  "强调＝肩炮喷出的火"),
    ("markdownStrong",      0, 360, 0.90, 1.00, 0.00, 0.36, 2,  "粗体＝装甲上最亮的那块高光"),
    ("markdownBlockQuote",  28,  58, 0.42, 0.58, 0.02, 0.24, 2,  "引用＝雾都飘着的尘"),
    ("syntaxComment",       20,  80, 0.40, 0.56, 0.00, 0.14, 2,  "注释＝战场烟灰（暖灰，退后）"),
    ("syntaxKeyword",     335, 359, 0.40, 0.60, 0.78, 1.00, 2,  "关键字＝擎天柱胸窗的辉光红"),
    ("syntaxFunction",     30,  52, 0.32, 0.50, 0.85, 1.00, 2,  "函数＝大黄蜂的车漆深金"),
    ("syntaxType",        340, 359, 0.64, 0.80, 0.60, 1.00, 2,  "类型＝Arcee 的玫瑰粉"),
    ("syntaxNumber",       14,  42, 0.56, 0.84, 0.35, 0.95, 2,  "数字＝引擎盖的暖砂橙"),
    ("syntaxString",      180, 225, 0.46, 0.60, 0.00, 0.24, 2,  "字符串＝没上漆的钢灰蓝"),
    ("syntaxOperator",    185, 240, 0.42, 0.56, 0.00, 0.26, 2,  "运算符＝远景雾蓝（冷灰，退后）"),
    ("text",              170, 255, 0.86, 1.00, 0.00, 0.36, 2,  "钢白正文：被夜光照过的装甲反光"),
    ("textMuted",         180, 215, 0.54, 0.88, 0.00, 0.30, 2,  "次级文字：冷白雾蓝，退到正文之后"),
]

QUIET = {"syntaxComment", "syntaxOperator", "textMuted"}

ADJACENT = [
    ("markdownCode", "text"), ("markdownCode", "textMuted"), ("markdownStrong", "text"),
    ("markdownStrong", "markdownCode"), ("markdownCode", "syntaxType"),
    ("markdownHeading", "borderActive"), ("markdownHeading", "syntaxFunction"),
    ("markdownHeading", "markdownLink"), ("markdownEmph", "warning"),
    ("markdownEmph", "error"), ("markdownEmph", "syntaxNumber"),
    ("markdownBlockQuote", "textMuted"), ("markdownBlockQuote", "syntaxComment"),
    ("markdownBlockQuote", "diffRemoved"),
    ("primary", "error"), ("primary", "syntaxKeyword"), ("error", "syntaxKeyword"),
    ("secondary", "markdownLink"), ("secondary", "info"), ("info", "syntaxOperator"),
    ("info", "markdownLink"),
    ("success", "diffAdded"), ("diffAdded", "syntaxString"),
    ("diffRemoved", "error"), ("diffRemoved", "warning"), ("diffRemoved", "diffAdded"),
    ("syntaxType", "syntaxString"), ("syntaxType", "syntaxKeyword"),
    ("syntaxComment", "syntaxOperator"), ("syntaxComment", "textMuted"),
    ("syntaxString", "textMuted"), ("syntaxOperator", "syntaxComment"),
    ("borderActive", "warning"), ("border", "syntaxOperator"),
    ("syntaxFunction", "syntaxNumber"), ("syntaxFunction", "borderActive"),
    ("syntaxFunction", "syntaxKeyword"),
    ("text", "textMuted"), ("text", "syntaxString"), ("text", "syntaxComment"),
    ("markdownHeading", "markdownStrong"), ("text", "syntaxComment"),
    ("syntaxNumber", "syntaxString"), ("syntaxNumber", "syntaxType"),
    ("syntaxString", "syntaxOperator"), ("syntaxType", "markdownCode"),
]

TARGET = {
    "primary": "#D10A29", "secondary": "#2C65AA", "info": "#0583A9",
    "success": "#9AA4A3", "warning": "#A26400", "error": "#FE5E00",
    "borderActive": "#E7B401", "border": "#515B65",
    "diffAdded": "#808076", "diffRemoved": "#B0987C",
    "markdownHeading": "#FEED6B", "markdownLink": "#0C90C0",
    "markdownCode": "#9B6A99", "markdownEmph": "#FBA069", "markdownStrong": "#F9F9FB",
    "markdownBlockQuote": "#8B8579", "syntaxComment": "#7C7D78",
    "syntaxKeyword": "#FE0141", "syntaxFunction": "#CB9400", "syntaxType": "#F68C8E",
    "syntaxNumber": "#D9BA9B", "syntaxString": "#838C91", "syntaxOperator": "#707A84",
    "text": "#F8F8FA", "textMuted": "#B9CDD4",
}
TOL = 22.0
TOL_ROLE = {"markdownLink": 24.0, "syntaxType": 24.0, "markdownCode": 24.0,
            "syntaxKeyword": 22.0, "error": 24.0, "primary": 20.0,
            "markdownStrong": 20.0, "diffRemoved": 24.0, "borderActive": 20.0,
            "markdownHeading": 20.0, "textMuted": 26.0, "text": 20.0,
            "success": 26.0, "diffAdded": 26.0, "markdownBlockQuote": 26.0,
            "syntaxComment": 28.0, "syntaxOperator": 28.0, "syntaxString": 28.0,
            "syntaxNumber": 26.0, "syntaxFunction": 22.0, "warning": 24.0}
POP_MIN = int(os.environ.get("POP_MIN", "24"))


def feasible(role_name, k):
    if role_name == "text":
        return all(contrast(k, v) >= 4.5 for v in SURF.values())
    if role_name == "textMuted":
        if not all(contrast(k, SURF[s]) >= 4.5 for s in ("background", "backgroundPanel", "backgroundElement")):
            return False
        for s in ("background", "backgroundPanel", "backgroundElement"):
            if contrast(alpha_over(k, 0.8, SURF[s]), SURF[s]) < 4.5:
                return False
        return True
    if role_name in ("primary", "secondary", "info", "success", "warning", "error"):
        return contrast(k, BGND) >= 3.0 and contrast(k, PANEL) >= 3.0
    if role_name == "borderActive":
        return all(contrast(k, SURF[s]) >= 3.0
                   for s in ("background", "backgroundPanel", "backgroundElement"))
    if role_name.startswith("markdown"):
        return contrast(k, BGND) >= 4.5 and contrast(k, PANEL) >= 4.5
    if role_name.startswith("syntax"):
        return contrast(k, CODEBG) >= 4.5
    if role_name in ("diffAdded", "diffRemoved"):
        return contrast(k, alpha_over(k, 0.12, BGND)) >= 4.5
    return True


def window_candidates(role):
    """按角色的色相/HSL明度/彩度窗口 + 叙事靶心 + 对比度硬约束 + 人口门槛筛候选。

    再加一层「人口优先」：窗口里人口最强的那些色先留下（top_keep 个），
    否则求解器会用 ΔE 换掉人口，把边缘色挑进来 —— 那是噪点，不是实色。
    """
    name, h0, h1, lmin, lmax, smin, smax, pop, _ = role
    tgt = TARGET.get(name)
    tol = TOL_ROLE.get(name, TOL)
    out = []
    for k in ALL:
        if not (h0 <= CH[k][0] <= h1 and lmin <= HL[k] <= lmax and smin <= CH[k][1] <= smax):
            continue
        if POOL[k]["pop"] < pop:
            continue
        if NEAR[k] < POP_MIN:
            continue
        if tgt and de(k, tgt) > tol:
            continue
        if not feasible(name, k):
            continue
        out.append(k)
    if not out:
        return out
    out.sort(key=lambda k: -NEAR[k])
    return out[:int(os.environ.get("POOL_TOP", "400"))]
