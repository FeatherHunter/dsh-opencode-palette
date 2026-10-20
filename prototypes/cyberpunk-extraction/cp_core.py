# -*- coding: utf-8 -*-
"""Cyberpunk 2077 — 共享库：颜色数学 · 37 色位调色板 · 判尺复算。

路径全部相对于仓库根目录；参考图目录可在 CYBERPUNK_IMAGES 覆盖。

Every hex in PALETTE is traceable to a pixel (or a same-hue value step of one)
in C:\\Users\\辰辰洋洋\\Pictures\\赛博朋克2077\\*.jpg — see SRC column.

This script mirrors docs/theme-audit/criteria.md so the palette can be iterated
to green before the repo's real audit runs.
"""
import json, math, itertools, sys

# ---------------------------------------------------------------- color math
def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def lum(h):
    r, g, b = rgb(h)
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

def cr(a, b):
    la, lb = lum(a), lum(b)
    if la < lb:
        la, lb = lb, la
    return (la + 0.05) / (lb + 0.05)

def with_alpha(fg, alpha, bg):
    """sRGB-space composite — matches scripts/audit-themes.ts flatten() exactly
    (r = c.r*a + b.r*(1-a); NOT linear-light)"""
    f = rgb(fg); b = rgb(bg)
    return "#%02X%02X%02X" % tuple(
        round(f[i] * alpha + b[i] * (1 - alpha)) for i in range(3))

def hsv(h):
    r, g, b = [c / 255 for c in rgb(h)]
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d == 0:
        hue = 0.0
    elif mx == r:
        hue = 60 * (((g - b) / d) % 6)
    elif mx == g:
        hue = 60 * ((b - r) / d + 2)
    else:
        hue = 60 * ((r - g) / d + 4)
    s = 0 if mx == 0 else d / mx
    return hue, s, mx

def to_hsl(h):
    """matches scripts/audit-themes.ts toHsl (standard RGB->HSL)"""
    r, g, b = [c / 255 for c in rgb(h)]
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    l = (mx + mn) / 2
    if d == 0:
        return (0.0, 0.0, l)
    s = d / (1 - abs(2 * l - 1))
    if mx == r:
        hue = 60 * (((g - b) / d) % 6)
    elif mx == g:
        hue = 60 * ((b - r) / d + 2)
    else:
        hue = 60 * ((r - g) / d + 4)
    return (hue, s, l)

def chroma_of(h):
    c = rgb(h)
    return max(c) - min(c)

def hue_distance(a, b):
    d = abs(a - b) % 360
    return d if d <= 180 else 360 - d

def mix_hex(a, b, k):
    """linear per-channel interpolation, matches resolve.ts mixHex"""
    ra, ga, ba = rgb(a); rb, gb, bb = rgb(b)
    return "#%02X%02X%02X" % tuple(
        round(x + (y - x) * k) for x, y in ((ra, rb), (ga, gb), (ba, bb)))

def ensure_diff_contrast(src, is_dark=True, threshold=4.5):
    """port of src/engine/resolve.ts ensureDiffContrast (dark branch)"""
    base = src["background"]
    alpha = 0.22 if is_dark else 0.14
    bg_target = "#000000" if is_dark else "#FFFFFF"
    fg_target = "#FFFFFF" if is_dark else "#000000"
    out = dict(src)
    changed = []
    groups = [("diffAdded", ["diffAddedBg", "diffAddedLineNumberBg"]),
              ("diffRemoved", ["diffRemovedBg", "diffRemovedLineNumberBg"])]
    for fg, bgs in groups:
        fg0 = src[fg]
        need = any(cr(fg0, src[b]) < threshold for b in bgs)
        if not need:
            continue
        fixed = None
        for j in [0, .1, .2, .3, .4, .5, .6]:
            fgC = fg0 if j == 0 else mix_hex(fg0, fg_target, j)
            tinted = mix_hex(base, fgC, alpha)
            cands, ok = [], True
            for bk in bgs:
                found = None
                for k in [0, .2, .4, .6, .8, 1.0]:
                    cand = mix_hex(tinted, bg_target, k)
                    if cr(fgC, cand) >= threshold:
                        found = cand; break
                if found is None:
                    ok = False; break
                cands.append(found)
            if ok:
                fixed = (fgC, cands, j); break
        if not fixed:
            continue
        fgC, cands, j = fixed
        if j > 0:
            out[fg] = fgC; changed.append(fg)
        for bk, c in zip(bgs, cands):
            out[bk] = c; changed.append(bk)
    return out, changed

def deltaE76(h1, h2):
    """CIEDE76 with D65"""
    def lab(h):
        r, g, b = [lin(c) for c in rgb(h)]
        X = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
        Y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
        Z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041
        Xn, Yn, Zn = 0.95047, 1.0, 1.08883
        def f(t):
            return t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
        fx, fy, fz = f(X / Xn), f(Y / Yn), f(Z / Zn)
        return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))
    L1, a1, b1 = lab(h1); L2, a2, b2 = lab(h2)
    return math.sqrt((L1 - L2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2)

def contrast_text(hexv):
    """engine-exact: raw 0-255 luma (not WCAG), threshold > 0.6 — src/engine/resolve.ts"""
    r, g, b = rgb(hexv)
    luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return "#141414" if luma > 0.6 else "#F4F4F5"

# ---------------------------------------------------------------- the palette
# slot: (hex, source-in-the-images)
P = {
 "background":                ("#151112", "图 2 皮衣暗部（字面像素 92 px）——全套最底的一层"),
 "backgroundPanel":           ("#231B19", "图 1 皮衣褶皱中调"),
 "backgroundElement":         ("#2C2829", "图 3 金属件反光灰面"),
 "sidebarBg":                 ("#1C1616", "图 1 领口阴影"),
 "bubbleBg":                  ("#2A231D", "图 5 皮衣暖面"),
 "inputBg":                   ("#261F1B", "皮衣中调 × 皮衣暖面 各半"),
 "codeBlockBg":               ("#0E0A0B", "图 2 主体深影——代码舞台压到最暗"),
 "codeHeaderBg":              ("#100B08", "图 1 皮革最深色"),
 "text":                      ("#C2BFB0", "图 4「PHANTOM LIBERTY」副标题灰白"),
 "textMuted":                 ("#A7B4BC", "图 4 同处那行冷调字幕灰"),
 "primary":                   ("#FBF405", "图 1/3/5 招牌黄场主色——全局唯一的高声位"),
 "secondary":                 ("#D51666", "图 2 霓虹粉墙"),
 "info":                      ("#4A96B8", "图 1/3/5 领口科技青"),
 "success":                   ("#CDED66", "图 3 绿光反光"),
 "warning":                   ("#E7A257", "图 5 皮革高光琥珀"),
 "error":                     ("#FF1932", "图 4 热红场 #E0162C 提亮到 V=1.0（同色相最高阶）"),
 "border":                    ("#625B51", "图 5 金属暖灰"),
 "borderActive":              ("#FFF847", "图 2/3 黄场最亮一档——焦点环取全场最亮"),
 "diffAdded":                 ("#91A657", "图 3 苔绿反光"),
 "diffRemoved":               ("#FF1932", "与 error 同一色相阶梯（v3 终审已记档并岗）"),
 "diffAddedBg":               ("#14170C", "#91A657 同色相压暗到 V=0.09"),
 "diffRemovedBg":             ("#240407", "#E0162C 同色相压暗到 V=0.14"),
 "diffAddedLineNumberBg":     ("#1D2111", "#91A657 同色相压暗到 V=0.13"),
 "diffRemovedLineNumberBg":   ("#36050B", "#E0162C 同色相压暗到 V=0.21"),
 "markdownHeading":           ("#E8DF04", "图 1/3 饱和深黄——标题唯一的高声位"),
 "markdownLink":              ("#84CFEF", "图 1/3 领口青亮档"),
 "markdownCode":              ("#B7D072", "图 3 浅酸绿"),
 "markdownEmph":              ("#E1C19A", "图 3 人物脸上被光照亮的一档——斜体用「人」的颜色，且必须比正文亮"),
 "markdownStrong":            ("#E6D7BA", "图 1 旧纸羊皮色"),
 "markdownBlockQuote":        ("#89929E", "夜蓝灰 × 冷亮灰 各半——引用是「冷」的旁声"),
 "syntaxComment":             ("#847C6A", "皮料暖灰 × 金属暖灰 各半——注释退到最底"),
 "syntaxKeyword":             ("#C3B50C", "图 3 橄榄黄"),
 "syntaxFunction":            ("#B8ECFA", "图 1/2 领口冰白"),
 "syntaxType":                ("#74909E", "图 1 领口青暗面（语料搜索：既字面存在又满足判尺）"),
 "syntaxNumber":              ("#AD7B3E", "图 5 皮革琥珀深阶"),
 "syntaxString":              ("#A2B772", "图 3 苔绿亮档"),
 "syntaxOperator":            ("#7876A8", "图 5 夜景冷紫——运算符取冷端，与暖灰注释/钢蓝引用全部拉开"),
}
C = {k: v[0] for k, v in P.items()}

# ---------------------------------------------------------------- groupings
BG8 = ["background", "backgroundPanel", "backgroundElement", "sidebarBg",
       "bubbleBg", "inputBg", "codeBlockBg", "codeHeaderBg"]
DIFFBG4 = ["diffAddedBg", "diffRemovedBg", "diffAddedLineNumberBg", "diffRemovedLineNumberBg"]
TEXT2 = ["text", "textMuted"]
BRAND6 = ["primary", "secondary", "info", "success", "warning", "error"]
BORDER2 = ["border", "borderActive"]
MARK6 = ["markdownHeading", "markdownLink", "markdownCode", "markdownEmph",
         "markdownStrong", "markdownBlockQuote"]
SYN7 = ["syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxType",
        "syntaxNumber", "syntaxString", "syntaxOperator"]
CORE5 = ["syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString"]



# ---------------------------------------------------------------- 路径
import os
import os as _os
REPO = _os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
PKG = _os.path.join(REPO, "prototypes", "cyberpunk-extraction")
IMAGES = _os.environ.get("CYBERPUNK_IMAGES", r"C:\Users\辰辰洋洋\Pictures\赛博朋克2077")
FILES = ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"]

# ---------------------------------------------------------------- 取色规则台账
# slot -> (规则, [父色/锚点 hex], 出处说明)
PROV = {
 "background":                ("直采", ["#151112"], "图 2 皮衣暗部（字面像素 92 px）——全套最底的一层"),
 "backgroundPanel":           ("直采", ["#231B19"], "图 1 皮衣褶皱中调"),
 "backgroundElement":         ("直采", ["#2C2829"], "图 3 金属件反光灰面"),
 "sidebarBg":                 ("直采", ["#1C1616"], "图 1 领口阴影"),
 "bubbleBg":                  ("直采", ["#2A231D"], "图 5 皮衣暖面"),
 "inputBg":                   ("混色", ["#231B19", "#2A231D"], "皮衣中调 × 皮衣暖面 各半"),
 "codeBlockBg":               ("直采", ["#0E0A0B"], "图 2 主体深影——代码舞台压到最暗"),
 "codeHeaderBg":              ("直采", ["#100B08"], "图 1 皮革最深色"),
 "text":                      ("直采", ["#C2BFB0"], "图 4「PHANTOM LIBERTY」副标题灰白"),
 "textMuted":                 ("直采", ["#A7B4BC"], "图 4 同处那行冷调字幕灰"),
 "primary":                   ("直采", ["#FBF405"], "图 1/3/5 招牌黄场主色——全局唯一的高声位"),
 "secondary":                 ("直采", ["#D51666"], "图 2 霓虹粉墙"),
 "info":                      ("直采", ["#4A96B8"], "图 1/3/5 领口科技青"),
 "success":                   ("直采", ["#CDED66"], "图 3 绿光反光"),
 "warning":                   ("直采", ["#E7A257"], "图 5 皮革高光琥珀"),
 "error":                     ("阶梯", ["#E0162C"], "图 4 热红场 #E0162C 提亮到 V=1.0（同色相最高阶）"),
 "border":                    ("直采", ["#625B51"], "图 5 金属暖灰"),
 "borderActive":              ("直采", ["#FFF847"], "图 2/3 黄场最亮一档——焦点环取全场最亮"),
 "diffAdded":                 ("直采", ["#91A657"], "图 3 苔绿反光"),
 "diffRemoved":               ("阶梯", ["#E0162C"], "与 error 同一色相阶梯（v3 终审已记档并岗）"),
 "diffAddedBg":               ("阶梯", ["#91A657"], "#91A657 同色相压暗到 V=0.09"),
 "diffRemovedBg":             ("阶梯", ["#E0162C"], "#E0162C 同色相压暗到 V=0.14"),
 "diffAddedLineNumberBg":     ("阶梯", ["#91A657"], "#91A657 同色相压暗到 V=0.13"),
 "diffRemovedLineNumberBg":   ("阶梯", ["#E0162C"], "#E0162C 同色相压暗到 V=0.21"),
 "markdownHeading":           ("直采", ["#E8DF04"], "图 1/3 饱和深黄——标题唯一的高声位"),
 "markdownLink":              ("直采", ["#84CFEF"], "图 1/3 领口青亮档"),
 "markdownCode":              ("直采", ["#B7D072"], "图 3 浅酸绿"),
 "markdownEmph":              ("直采", ["#E1C19A"], "图 3 人物脸上被光照亮的一档——斜体用「人」的颜色，且必须比正文亮"),
 "markdownStrong":            ("直采", ["#E6D7BA"], "图 1 旧纸羊皮色"),
 "markdownBlockQuote":        ("混色", ["#6B717F", "#A7B4BC"], "夜蓝灰 × 冷亮灰 各半——引用是「冷」的旁声"),
 "syntaxComment":             ("混色", ["#78705D", "#8F8876"], "皮料暖灰 × 金属暖灰 各半——注释退到最底"),
 "syntaxKeyword":             ("直采", ["#C3B50C"], "图 3 橄榄黄"),
 "syntaxFunction":            ("直采", ["#B8ECFA"], "图 1/2 领口冰白"),
 "syntaxType":                ("直采", ["#74909E"], "图 1 领口青暗面（语料搜索：既字面存在又满足判尺）"),
 "syntaxNumber":              ("直采", ["#AD7B3E"], "图 5 皮革琥珀深阶"),
 "syntaxString":              ("直采", ["#A2B772"], "图 3 苔绿亮档"),
 "syntaxOperator":            ("直采", ["#7876A8"], "图 5 夜景冷紫——运算符取冷端，与暖灰注释/钢蓝引用全部拉开"),
}

CN = {
 "background": "页面底", "backgroundPanel": "浮起面", "backgroundElement": "浮层",
 "sidebarBg": "侧边栏", "bubbleBg": "气泡", "inputBg": "输入框", "codeBlockBg": "代码块",
 "codeHeaderBg": "代码块顶栏", "text": "主要文字", "textMuted": "次要文字",
 "primary": "品牌主色", "secondary": "空闲", "info": "信息", "success": "成功",
 "warning": "警告", "error": "错误", "border": "边框", "borderActive": "强边框",
 "diffAdded": "新增文字", "diffRemoved": "删除文字", "diffAddedBg": "新增行底",
 "diffRemovedBg": "删除行底", "diffAddedLineNumberBg": "新增行号底",
 "diffRemovedLineNumberBg": "删除行号底", "markdownHeading": "标题", "markdownLink": "链接",
 "markdownCode": "行内代码", "markdownEmph": "斜体", "markdownStrong": "粗体",
 "markdownBlockQuote": "引用", "syntaxComment": "注释", "syntaxKeyword": "关键字",
 "syntaxFunction": "函数", "syntaxType": "参数", "syntaxNumber": "数字",
 "syntaxString": "字符串", "syntaxOperator": "运算符",
}
ORDER = (["background","backgroundPanel","backgroundElement","sidebarBg","bubbleBg","inputBg",
          "codeBlockBg","codeHeaderBg","text","textMuted"] + BRAND6 + ["border","borderActive"]
         + ["diffAdded","diffRemoved","diffAddedBg","diffRemovedBg",
            "diffAddedLineNumberBg","diffRemovedLineNumberBg"]
         + MARK6 + SYN7)

def judge(pal):
    """复算判尺：38 硬对(4.5) + 15 UI 对(3) + 角色碰撞 + 退后 + 核心五 ΔE。"""
    fails, warns = [], []
    for b in BG8:
        if cr(pal["text"], pal[b]) < 4.5: fails.append(("text@"+b, cr(pal["text"], pal[b])))
    for b in ["background","backgroundPanel","backgroundElement"]:
        if cr(pal["textMuted"], pal[b]) < 4.5: fails.append(("muted@"+b, cr(pal["textMuted"], pal[b])))
        d = with_alpha(pal["textMuted"], 0.8, pal[b])
        if cr(d, pal[b]) < 4.5: fails.append(("dimmed@"+b, cr(d, pal[b])))
    for m in MARK6:
        for b in ["background","backgroundPanel"]:
            if cr(pal[m], pal[b]) < 4.5: fails.append((m+"@"+b, cr(pal[m], pal[b])))
    for s in SYN7:
        if cr(pal[s], pal["codeBlockBg"]) < 4.5: fails.append((s+"@code", cr(pal[s], pal["codeBlockBg"])))
    for f, b in [("diffAdded","diffAddedBg"),("diffRemoved","diffRemovedBg")]:
        if cr(pal[f], pal[b]) < 4.5: fails.append((f+"@"+b, cr(pal[f], pal[b])))
    for b in ["diffAddedBg","diffRemovedBg"]:
        if cr(pal["text"], pal[b]) < 4.5: fails.append(("text@"+b, cr(pal["text"], pal[b])))
    if cr(contrast_text(pal["primary"]), pal["primary"]) < 4.5: fails.append(("onPrimary", 0))
    for b in ["background","backgroundPanel","backgroundElement"]:
        if cr(pal["borderActive"], pal[b]) < 3.0: fails.append(("borderActive@"+b, cr(pal["borderActive"], pal[b])))
    for s in BRAND6:
        for b in ["background","backgroundPanel"]:
            if cr(pal[s], pal[b]) < 3.0: fails.append((s+"@"+b, cr(pal[s], pal[b])))
    core_cr = {k: cr(pal[k], pal["codeBlockBg"]) for k in CORE5}
    for k in ["syntaxComment","syntaxOperator"]:
        if cr(pal[k], pal["codeBlockBg"]) > min(core_cr.values()): warns.append(k+" 未退后")
    for a, b in itertools.combinations(CORE5, 2):
        if deltaE76(pal[a], pal[b]) < 10: warns.append("core ΔE %s/%s" % (a, b))
    roles = [k for k in pal if k not in BG8 + DIFFBG4]
    seen = {}
    for k in roles: seen.setdefault(pal[k], []).append(k)
    for k, v in seen.items():
        if len(v) > 1 and set(v) != {"error", "diffRemoved"}:
            warns.append("collision %s: %s" % (k, v))
    return fails, warns, core_cr


def file_b64(fn):
    """整图 base64（预览页内联用，保证单文件自包含）。"""
    import base64
    with open(os.path.join(IMAGES, fn), "rb") as f:
        return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()
