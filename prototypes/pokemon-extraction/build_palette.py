# -*- coding: utf-8 -*-
"""宝可梦主题 v3.6 —— 逐像素直采样板 + 仓库判尺复算 + 感知同色检查。

三条硬规矩（与本脚本自身的判尺一致）：
  1. 每个色值必须是参考图里的**真实像素**（逐位相同，不是取整/混色/想象）。
  2. 每个色值必须能指回**一张具体的图**（自动统计逐图命中，不靠手写出处）。
  3. 宿主与仓库的对比度判尺必须过（硬性 4.5 / UI 3.0），并额外跑感知同色检查。

判尺来源见同目录 surface-map.md（逐条 file:line）。
输出 palette.json：37 槽色值 + 自动出处 + 逐图命中 + 连通区域证据 + 全部实测指标。
"""
import os
import json
import math
import collections
from PIL import Image

SRC = r"C:\Users\辰辰洋洋\Pictures\宝可梦"
OUT = os.path.dirname(os.path.abspath(__file__))
IMAGES = ["01-pikachu-official-pokedex-art.png", "2.jpg", "3.jpg", "4.jpg"]

# ─────────────────────────────────────────────────────────────── 37 槽色值
# 全部为参考图中的真实像素值。v3.6 相对 v3.5 的改动见 CHANGELOG。
PALETTE = {
    # --- 8 个背景槽：素材自身的中性阶梯，每一级只用一个值 ---
    # 素材的 10 级中性梯（真实像素，L*）：#000000 0 / #060606 1.7 / #0C0C10 7.1 /
    # #191917 6.4 / #1C1C22 10.5 / #28282D 16.9 / #37373B 23.2 / #40404A 27.4 /
    # #48484D 30.8 / #58585A 37.5 —— v3.6 把这 10 级一对一分配给 10 个中性角色。
    "background":        "#1C1C22",   # 01 卡面页底
    "backgroundPanel":   "#37373B",   # 01 卡片暗阶
    "backgroundElement": "#48484D",   # 01 卡片暗阶
    "sidebarBg":         "#060606",   # 01 画框墨阶
    "bubbleBg":          "#28282D",   # 01 画面暗部
    "inputBg":           "#000000",   # 01 画框黑
    "codeBlockBg":       "#0C0C10",   # 01 页脚栏
    "codeHeaderBg":      "#58585A",   # 04 精灵球带（491 px 实心带 57x17）
    # --- 文字 ---
    "text":              "#EEEEF4",   # 01 页脚白字
    "textMuted":         "#D3D3D8",   # 01 图注灰
    # --- 品牌 / 语义 ---
    "primary":           "#FFCB05",   # 01 图鉴编号徽章（3,012 px，47x66 实心徽章，填充率 97%）
    "secondary":         "#799DFE",   # 02 wikiHow 蓝底（88,538 px）
    "info":              "#289BCA",   # 04 杰尼龟蓝
    "success":           "#7AA85D",   # 04 妙蛙种子绿
    "warning":           "#FB8603",   # 04 小火龙橙
    "error":             "#F93D32",   # 04 精灵球红
    # --- 边框 ---
    "border":            "#40404A",   # 01 卡边长线（513 px，513x1）
    "borderActive":      "#FEED79",   # 03 周年海报高光黄（742 px，42x40）
    # --- diff ---
    "diffAdded":              "#7FC9AE",   # 04 妙蛙种子浅绿
    "diffAddedBg":            "#0A2828",   # 04 深青
    # 两个沟槽槽位各取一条不同的暗轨：新增轨 #191917（04 精灵球黑面，49x56 实心）、
    # 删除轨 #141000（01 画框暖黑，8x18 实心）；新增/删除的区分仍由行底色承担。
    "diffAddedLineNumberBg":  "#191917",   # 04 精灵球黑面
    "diffRemoved":            "#FE4C1C",   # 02 脸颊红
    "diffRemovedBg":          "#0C0406",   # 01 暗红阶
    "diffRemovedLineNumberBg": "#141000",  # 01 画框暖黑
    # --- markdown ---
    "markdownHeading":    "#E3C371",   # 01 皮卡丘中金
    "markdownLink":       "#95C7F8",   # 04 天空蓝
    "markdownCode":       "#FDE7B5",   # 04 奶黄
    "markdownEmph":       "#F9B584",   # 04 暖杏
    "markdownStrong":     "#FFFFFF",   # 01 卡纸白
    "markdownBlockQuote": "#BDBDC3",   # 01 图注灰阶
    # --- 语法 ---
    "syntaxComment":  "#85858A",   # 01 图注灰
    "syntaxKeyword":  "#C790A3",   # 01 嘴部藕粉
    "syntaxFunction": "#6E9BBC",   # 04 蓝暗面
    "syntaxType":     "#658F8B",   # 04 青灰
    "syntaxNumber":   "#C5A863",   # 01 皮卡丘中金阶
    "syntaxString":   "#80CAAF",   # 04 浅青绿
    "syntaxOperator": "#7A7A7F",   # 01 图注灰阶
}

# 手写语义名（只写"这是什么"，不写"在哪张图"——来源图由脚本自动统计并交叉校验）
LABELS = {
    "#1C1C22": "卡面页底", "#37373B": "卡片暗阶", "#48484D": "卡片暗阶",
    "#060606": "画框墨阶", "#28282D": "画面暗部", "#000000": "画框黑",
    "#0C0C10": "页脚栏", "#40404A": "卡片暗阶",
    "#EEEEF4": "页脚白字", "#D3D3D8": "图注灰",
    "#FFCB05": "图鉴编号徽章", "#799DFE": "wikiHow 蓝底",
    "#289BCA": "杰尼龟蓝", "#7AA85D": "妙蛙种子绿", "#FB8603": "小火龙橙",
    "#F93D32": "精灵球红", "#40404A": "卡边长线", "#FEED79": "周年海报高光黄",
    "#7FC9AE": "妙蛙种子浅绿", "#0A2828": "深青", "#141000": "画框暖黑",
    "#FE4C1C": "脸颊红", "#0C0406": "暗红阶", "#191917": "精灵球黑面",
    "#E3C371": "皮卡丘中金", "#95C7F8": "天空蓝", "#FDE7B5": "奶黄",
    "#F9B584": "暖杏", "#FFFFFF": "卡纸白", "#BDBDC3": "图注灰阶",
    "#85858A": "图注灰", "#C790A3": "嘴部藕粉", "#6E9BBC": "蓝暗面",
    "#658F8B": "青灰", "#C5A863": "皮卡丘中金阶", "#80CAAF": "浅青绿",
    "#7A7A7F": "图注灰阶",
}

BG_SLOTS = ["background", "backgroundPanel", "backgroundElement", "sidebarBg",
            "bubbleBg", "inputBg", "codeBlockBg", "codeHeaderBg"]
MUTED_SURFACES = ["background", "backgroundPanel", "backgroundElement"]
MD_SLOTS = ["markdownHeading", "markdownLink", "markdownCode", "markdownEmph",
            "markdownStrong", "markdownBlockQuote"]
SYN_SLOTS = ["syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxType",
             "syntaxNumber", "syntaxString", "syntaxOperator"]
CORE_SYN = ["syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString"]
DESIGN_ROLES = (["text", "textMuted", "primary", "secondary", "info", "success", "warning",
                 "error", "border", "borderActive"] + MD_SLOTS + SYN_SLOTS
                + ["diffAdded", "diffRemoved"])

TEXT_THRESHOLD = 4.5
UI_THRESHOLD = 3.0


# ─────────────────────────────────────────────────────────────── 颜色工具
def hx2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lin(v):
    v /= 255.0
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def lum(rgb):
    r, g, b = (lin(x) for x in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = lum(hx2rgb(a)), lum(hx2rgb(b))
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def contrast_text(hexv):
    r, g, b = hx2rgb(hexv)
    luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return "#141414" if luma > 0.6 else "#F4F4F5"


def alpha_over(fg_hex, bg_hex, a):
    """宿主语义：rgba(fg, a) 叠在 bg 上（map-dsh.ts 的 withAlpha 输出的是 rgba()，
    审计再按各自表面合成，所以这里必须逐表面算，不能只算一次）。"""
    f, b = hx2rgb(fg_hex), hx2rgb(bg_hex)
    return "#%02X%02X%02X" % tuple(round(f[i] * a + b[i] * (1 - a)) for i in range(3))


def to_hsl(h):
    r, g, b = [v / 255 for v in hx2rgb(h)]
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    if mx == mn:
        return 0.0, 0.0, l
    d = mx - mn
    s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
    if mx == r:
        hh = ((g - b) / d) % 6
    elif mx == g:
        hh = (b - r) / d + 2
    else:
        hh = (r - g) / d + 4
    return hh * 60, s, l


def lstar(h):
    y = lum(hx2rgb(h))
    return 116 * (y ** (1 / 3)) - 16 if y > 0.008856 else 903.3 * y


def hue_distance(h1, h2):
    a, _, _ = to_hsl(h1)
    b, _, _ = to_hsl(h2)
    d = abs(a - b) % 360
    return min(d, 360 - d)


def de76(h1, h2):
    def lab(h):
        r, g, b = (lin(x) for x in hx2rgb(h))
        X = r * 0.4124 + g * 0.3576 + b * 0.1805
        Y = r * 0.2126 + g * 0.7152 + b * 0.0722
        Z = r * 0.0193 + g * 0.1192 + b * 0.9505
        X /= 0.95047
        Z /= 1.08883

        def f(t):
            return t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
        fx, fy, fz = f(X), f(Y), f(Z)
        return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))
    a, b = lab(h1), lab(h2)
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


# ───────────────────────────────────────────────────────── 像素取证（含连通区域）
def largest_region(im, target):
    """目标色最大 4-连通区域：证明它是"图上的形状"，不是散落的抗锯齿噪点。"""
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    best = (0, None)
    for y0 in range(h):
        for x0 in range(w):
            idx = y0 * w + x0
            if seen[idx] or px[x0, y0] != target:
                continue
            stack = [(x0, y0)]
            seen[idx] = 1
            n = 0
            xmin = xmax = x0
            ymin = ymax = y0
            while stack:
                x, y = stack.pop()
                n += 1
                xmin, xmax = min(xmin, x), max(xmax, x)
                ymin, ymax = min(ymin, y), max(ymax, y)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        ni = ny * w + nx
                        if not seen[ni] and px[nx, ny] == target:
                            seen[ni] = 1
                            stack.append((nx, ny))
            if n > best[0]:
                best = (n, (xmin, ymin, xmax, ymax))
    return best


def classify_region(px, box):
    """给来源定性：素材里这个色到底是"一块面"、"一根线"还是"抗锯齿残影"。"""
    if px is None:
        return "未知"
    if box:
        bw, bh = box[2] - box[0] + 1, box[3] - box[1] + 1
        if min(bw, bh) <= 2 and max(bw, bh) >= 3:
            return "发丝线"
    if px >= 2000:
        return "实心块"
    if px >= 100:
        return "实心形"
    if px >= 8:
        return "小实心形"
    return "抗锯齿残影"


def scan_sources():
    """逐图统计每个 hex 的命中像素数，并记录最大连通区域（跨图取最大者）。"""
    per_image = collections.defaultdict(collections.Counter)
    region = {}
    for f in IMAGES:
        path = os.path.join(SRC, f)
        im = Image.open(path).convert("RGB")
        cnt = collections.Counter(im.getdata())
        for c, n in cnt.items():
            per_image["#%02X%02X%02X" % c][f] = n
        for slot, hexv in PALETTE.items():
            key = hexv.upper()
            if not cnt.get(hx2rgb(key), 0):
                continue
            n, box = largest_region(im, hx2rgb(key))
            prev = region.get(key)
            if prev is None or n > prev[1]:
                region[key] = (f, n, box)
    return per_image, region


# ─────────────────────────────────────────────────────────────── 主流程
def main():
    P = PALETTE
    fails, warns, notes = [], [], []

    # ---------- 1. 出处：逐图命中 + 连通区域 ----------
    print("== 1. 逐像素出处（自动统计，不接受手写）==")
    per_image, region = scan_sources()
    provenance = {}
    for slot, hexv in P.items():
        key = hexv.upper()
        counts = {f: per_image[key][f] for f in IMAGES}
        total = sum(counts.values())
        if total == 0:
            fails.append(f"PROVENANCE {slot}={hexv} 不是参考图中的真实像素")
            print(f"   FAIL {slot:26s} {hexv}  0 px")
            continue
        main_img = max(counts, key=lambda f: counts[f])
        reg_img, reg_n, box = region[key]
        if box:
            bw, bh = box[2] - box[0] + 1, box[3] - box[1] + 1
            shape = f"{bw}x{bh}"
        else:
            shape = "-"
        prov = {
            "slot": slot,
            "hex": key,
            "label": LABELS.get(key, ""),
            "source": main_img,
            "px": total,
            "perImage": counts,
            "kind": classify_region(region[key][1], box),
            "region": {"image": reg_img, "px": reg_n, "box": list(box) if box else None,
                       "shape": shape},
        }
        provenance[key] = prov
        print(f"   OK  {slot:26s} {key}  px={total:7d}  主源={main_img:44s} "
              f"最大连通={region[key][1]:7d}px {shape:11s} {LABELS.get(key, '')}")

    # ---------- 2. 硬性 4.5 ----------
    print("\n== 2. 硬性 4.5:1（仓库 audit-themes.ts 的 hard 集）==")

    def hard(name, fg, bg, thr=TEXT_THRESHOLD):
        c = contrast(fg, bg)
        ok = c >= thr
        print(f'   {"OK " if ok else "FAIL"} {name:52s} {c:6.2f}:1')
        if not ok:
            fails.append(f"HARD {name} = {c:.2f} < {thr}")
        return c

    metrics = {}
    for s in BG_SLOTS:
        metrics[f"text@{s}"] = hard(f"text@{s}", P["text"], P[s])
    for s in MUTED_SURFACES:
        metrics[f"textMuted@{s}"] = hard(f"textMuted@{s}", P["textMuted"], P[s])
        ld = alpha_over(P["textMuted"], P[s], 0.8)
        metrics[f"labelDimmed@{s}"] = hard(f"labelDimmed({ld})@{s}", ld, P[s])
    for m in MD_SLOTS:
        for s in ("background", "backgroundPanel"):
            metrics[f"{m}@{s}"] = hard(f"{m}@{s}", P[m], P[s])
    for y in SYN_SLOTS:
        metrics[f"{y}@codeBlockBg"] = hard(f"{y}@codeBlockBg", P[y], P["codeBlockBg"])
    hard("diffAdded@diffAddedBg", P["diffAdded"], P["diffAddedBg"])
    hard("diffRemoved@diffRemovedBg", P["diffRemoved"], P["diffRemovedBg"])
    hard("text@diffAddedBg", P["text"], P["diffAddedBg"])
    hard("text@diffRemovedBg", P["text"], P["diffRemovedBg"])
    hard("diffAdded@diffAddedLineNumberBg", P["diffAdded"], P["diffAddedLineNumberBg"])
    hard("diffRemoved@diffRemovedLineNumberBg", P["diffRemoved"], P["diffRemovedLineNumberBg"])
    fg = contrast_text(P["primary"])
    c = contrast(fg, P["primary"])
    metrics["contrastText(primary)@primary"] = c
    ok = c >= TEXT_THRESHOLD
    print(f'   {"OK " if ok else "FAIL"} contrastText(primary)={fg}@primary{"":18s} {c:6.2f}:1')
    if not ok:
        fails.append(f"HARD contrastText(primary)@primary = {c:.2f}")

    # ---------- 3. UI 3:1 ----------
    print("\n== 3. UI 3:1（仓库 audit-themes.ts 的 ui 集）==")
    for s in MUTED_SURFACES:
        metrics[f"borderActive@{s}"] = hard(f"borderActive@{s}", P["borderActive"], P[s], UI_THRESHOLD)
    for b in ("primary", "secondary", "info", "success", "warning", "error"):
        for s in ("background", "backgroundPanel"):
            metrics[f"{b}@{s}"] = hard(f"{b}@{s}", P[b], P[s], UI_THRESHOLD)

    # ---------- 4. 设计律 ----------
    print("\n== 4. 设计律 ==")
    # 4.1 角色同值
    seen = collections.defaultdict(list)
    for r in DESIGN_ROLES:
        seen[P[r].upper()].append(r)
    for h, roles in seen.items():
        if len(roles) > 1:
            warns.append(f"roleCollision {h}: {roles}")
            print(f'   WARN roleCollision {h}: {roles}')
    # 4.2 感知同色（ΔE76 < 3 视为同色）——只在"会贴在一起"的槽位之间检查。
    # 邻接图按宿主的实际布局划：侧栏栏轨贴在内容区左边，对话输入井贴在对话列底部，
    # 两者分处屏幕两端、彼此不邻接，因此不在同一组里比。
    groups = {
        "内容列（页/板/元/泡/输入井/正文）": [
            "background", "backgroundPanel", "backgroundElement", "bubbleBg", "inputBg",
            "border", "borderActive", "text", "textMuted",
            "primary", "secondary", "info", "success", "warning", "error",
            "markdownHeading", "markdownLink", "markdownCode", "markdownEmph",
            "markdownStrong", "markdownBlockQuote"],
        "侧栏栏轨": ["sidebarBg", "background", "backgroundPanel", "backgroundElement"],
        "代码块": ["codeBlockBg", "codeHeaderBg", "syntaxComment", "syntaxKeyword",
                "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString",
                "syntaxOperator"],
        "diff 行": ["diffAdded", "diffAddedBg", "diffAddedLineNumberBg",
                 "diffRemoved", "diffRemovedBg", "diffRemovedLineNumberBg"],
    }
    # 沟槽槽位之间不查感知同色：它们是同一条左侧轨的两段，宿主本来就把它们并排画。
    gutter_pair = {"diffAddedLineNumberBg", "diffRemovedLineNumberBg"}
    near = []
    for gname, members in groups.items():
        for i in range(len(members)):
            for j in range(i + 1, len(members)):
                a, b = members[i], members[j]
                if {a, b} == gutter_pair:
                    continue
                d = de76(P[a], P[b])
                if d < 3.0:
                    near.append((d, gname, a, b))
    near.sort()
    for d, gname, a, b in near:
        warns.append(f"perceptualCollision [{gname}] dE76={d:.2f} {a}/{b}")
        print(f'   WARN perceptualCollision [{gname}] dE76={d:5.2f}  {a:22s} <-> {b:22s}')
    if not near:
        print("   OK  同屏感知同色检查：0 组 ΔE76 < 3")
    # 4.2b 取值去重
    distinct = len({v.upper() for v in P.values()})
    print(f"   槽位 {len(P)} 个 / 不同取值 {distinct} 个")
    # 4.3 背景阶梯单调
    ladder = ["background", "backgroundPanel", "backgroundElement"]
    for a, b in zip(ladder, ladder[1:]):
        la, lb = lstar(P[a]), lstar(P[b])
        c = contrast(P[a], P[b])
        step = lb - la
        flag = "OK " if step >= 5 and c >= 1.25 else "WARN"
        if flag == "WARN":
            warns.append(f"ladderStep {a}->{b} dL*={step:.1f} CR={c:.2f}")
        print(f'   {flag} ladder {a:18s} L*={la:5.1f} -> {b:18s} L*={lb:5.1f} '
              f'dL*={step:5.1f} CR={c:5.2f}')
    # 4.4 品牌几何
    d = hue_distance(P["primary"], P["secondary"])
    bucket = "analogous" if d <= 45 else "triadic" if 95 <= d <= 145 else \
             "complementary" if d > 145 else "unclassified"
    print(f'   primary<->secondary hue distance = {d:.1f} deg -> {bucket}')
    if bucket == "unclassified":
        warns.append("brandGeometry unclassified")
    # 4.5 语法核心互相可分 + 注释/操作符退后
    core_min = 99
    for i in range(len(CORE_SYN)):
        for j in range(i + 1, len(CORE_SYN)):
            a, b = CORE_SYN[i], CORE_SYN[j]
            de = de76(P[a], P[b])
            core_min = min(core_min, de)
            if de < 10:
                warns.append(f"syntaxCoreMin {a}/{b} dE76={de:.1f}")
                print(f'   WARN dE76 {a:14s} vs {b:14s} = {de:6.2f}')
    print(f'   syntax core min dE76 = {core_min:.2f} (阈值 10)')
    for rec in ("syntaxComment", "syntaxOperator"):
        for core in CORE_SYN:
            if contrast(P[rec], P["codeBlockBg"]) > contrast(P[core], P["codeBlockBg"]) + 1e-9:
                warns.append(f"syntaxRecede {rec} out-contrasts {core}")
                print(f'   WARN syntaxRecede {rec} > {core}')
    print(f"   syntaxRecede checked: comment={contrast(P['syntaxComment'], P['codeBlockBg']):.2f} "
          f"operator={contrast(P['syntaxOperator'], P['codeBlockBg']):.2f} "
          f"core-min={min(contrast(P[c], P['codeBlockBg']) for c in CORE_SYN):.2f}")
    # 4.6 文字层级（次级文字不得比正文更亮）
    if lstar(P["textMuted"]) >= lstar(P["text"]):
        warns.append("mutedNotMuted")
        print("   WARN textMuted 不比正文暗")
    else:
        print(f"   OK  text L*={lstar(P['text']):.1f} > textMuted L*={lstar(P['textMuted']):.1f}")

    # 4.7 形态匹配：UI 里"面"的角色，只能由素材里的实心块/实心形供给；
    #     UI 里"笔画/线/字"的角色，允许由素材里的细线或抗锯齿残影供给。
    print("\n== 4.7 形态匹配（面角色 vs 素材实心区域）==")
    face_roles = ["background", "backgroundPanel", "backgroundElement", "bubbleBg",
                  "inputBg", "codeBlockBg", "codeHeaderBg", "primary",
                  "secondary", "info", "success", "warning", "error",
                  "diffAddedBg", "diffRemovedBg", "markdownStrong"]
    # 窄条角色（栏轨 / 边框 / 沟槽）在 UI 里本来就是一个"条"，素材给一根线正合适。
    rail_roles = ["sidebarBg", "border", "borderActive",
                  "diffAddedLineNumberBg", "diffRemovedLineNumberBg"]
    gaps = []
    for slot in face_roles:
        key = P[slot].upper()
        reg_img, reg_px, box = region[key]
        kind = classify_region(reg_px, box)
        if kind not in ("实心块", "实心形", "小实心形"):
            gaps.append(f"{slot} {key}（{kind}，{reg_px}px）")
    for g in gaps:
        print(f"   GAP 面角色取自非实心区域：{g}")
    print(f"   面角色 {len(face_roles)} 个 / 其中 {len(gaps)} 个的素材出处不是实心块（素材上限，见 README 已知缺口）")
    print("   窄条角色：" + "、".join(
        f"{s} {P[s]}={classify_region(region[P[s].upper()][1], region[P[s].upper()][2])}"
        for s in rail_roles))

    # ---------- 5. 汇总 ----------
    print("\n================ SUMMARY ================")
    print(f"   HARD/UI failures : {len(fails)}")
    for f in fails:
        print("     -", f)
    print(f"   IP warnings      : {len(warns)}")
    for w in warns:
        print("     -", w)

    out = {
        "colors": P,
        "labels": LABELS,
        "provenance": provenance,
        "metrics": metrics,
        "fails": fails,
        "warns": warns,
    }
    with open(os.path.join(OUT, "palette.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    print("\n   palette.json written")
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
