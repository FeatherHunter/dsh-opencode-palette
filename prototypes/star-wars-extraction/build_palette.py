# -*- coding: utf-8 -*-
"""星球大战 IP 预置主题 · 配色构建器 v2
每个色位 = 海报真实像素（锚点）经 明度阶 / 与白或黑线性混合 推导而来。
自带判尺自检：硬性 38 对 (4.5:1) + UI 15 对 (3:1) + 设计告警。
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = HERE

# 锚点表：key -> (hex, 说明, 所属海报)
ANCHORS = {
    "void":       ("#091031", "2.jpg 深空底 · 天行者的崛起 星空", "2.jpg"),
    "void2":      ("#030318", "1.jpg 夜空最深处 · 天行者崛起 边框", "1.jpg"),
    "indigo":     ("#252645", "1.jpg 远景靛蓝 · 天行者崛起 人物背后的夜", "1.jpg"),
    "navy":       ("#273554", "2.jpg 海军蓝 · 天行者的崛起 主色场", "2.jpg"),
    "saber":      ("#30B4EC", "2.jpg 蓝色光剑核心 · 天行者的崛起 中央斜剑", "2.jpg"),
    "sky":        ("#78C1E9", "2.jpg 天蓝 · 天行者的崛起 剑光散射", "2.jpg"),
    "ice":        ("#A5E0FF", "1.jpg 冰蓝 · 天行者崛起 蓝色剑光高光", "1.jpg"),
    "icehot":     ("#7AD2FF", "1.jpg 剑光炽白 · 天行者崛起 剑光最亮处", "1.jpg"),
    "peri":       ("#97A5FE", "1.jpg 蓝紫 · 天行者崛起 蓝色剑晕", "1.jpg"),
    "blade":      ("#B4131D", "3.jpg 红色光剑 · 最后的绝地武士 左剑", "3.jpg"),
    "blade2":     ("#AA1921", "3.jpg 红色光剑亮部 · 最后的绝地武士 剑身", "3.jpg"),
    "ember":      ("#D65166", "2.jpg 红剑余晖 · 天行者的崛起 右侧剑光", "2.jpg"),
    "blood":      ("#560A0C", "3.jpg 血色深部 · 最后的绝地武士 背景红雾", "3.jpg"),
    "maroon":     ("#501521", "2.jpg 酒红 · 天行者的崛起 暗部红", "2.jpg"),
    "rust":       ("#C25E3E", "1.jpg 锈橙 · 天行者崛起 人物逆光", "1.jpg"),
    "amber":      ("#E28950", "1.jpg 琥珀暖光 · 天行者崛起 剑与人物之间的热核", "1.jpg"),
    "sand":       ("#DFA47B", "1.jpg 暖沙 · 天行者崛起 人物肤色受光", "1.jpg"),
    "ochre":      ("#3C110F", "1.jpg 焦褐 · 天行者崛起 暗部棕红", "1.jpg"),
    "gold":       ("#FCE39F", "1.jpg 招牌金 · 天行者崛起 STAR WARS 字标辉光", "1.jpg"),
    "cream":      ("#FAEAD3", "1.jpg 奶油白 · 天行者崛起 剑光溢出", "1.jpg"),
    "parchment":  ("#E8E3DB", "1.jpg 纸白 · 天行者崛起 海报纸面", "1.jpg"),
    "starwhite":  ("#F5FAFB", "1.jpg 星尘白 · 天行者崛起 冷调高光", "1.jpg"),
    "rose":       ("#D17380", "2.jpg 塔图因落日玫瑰 · 天行者的崛起 地平线", "2.jpg"),
    "violet":     ("#CBA8EC", "2.jpg 紫水晶 · 天行者的崛起 星云紫", "2.jpg"),
    "grayviolet": ("#716882", "2.jpg 灰紫 · 天行者的崛起 阴影面", "2.jpg"),
    "warmgray":   ("#605057", "1.jpg 暖灰 · 天行者崛起 雾霾面", "1.jpg"),
    "periwinkle": ("#8793CA", "1.jpg 长春花蓝 · 天行者崛起 冷调剑晕", "1.jpg"),
    "mint":       ("#6EC3AE", "1.jpg 绿光剑辉 · 天行者崛起 右下绿剑", "1.jpg"),
    "mint2":      ("#7DD2B5", "1.jpg 绿剑亮部 · 天行者崛起 绿剑过曝", "1.jpg"),
    "mint3":      ("#8ADCD0", "3.jpg 绿剑冷调 · 最后的绝地武士 Luke 绿剑", "3.jpg"),
}


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgb2hex(rgb):
    return "#%02X%02X%02X" % tuple(max(0, min(255, int(round(c)))) for c in rgb)


def rgb2hsl(rgb):
    r, g, b = [c / 255.0 for c in rgb]
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    d = mx - mn
    if d == 0:
        h = s = 0.0
    else:
        s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
        if mx == r:
            h = ((g - b) / d) % 6
        elif mx == g:
            h = (b - r) / d + 2
        else:
            h = (r - g) / d + 4
        h *= 60
    return h, s * 100, l * 100


def hsl2rgb(h, s, l):
    h %= 360
    s = max(0.0, min(100.0, s)) / 100.0
    l = max(0.0, min(100.0, l)) / 100.0
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = l - c / 2
    if h < 60:
        r, g, b = c, x, 0
    elif h < 120:
        r, g, b = x, c, 0
    elif h < 180:
        r, g, b = 0, c, x
    elif h < 240:
        r, g, b = 0, x, c
    elif h < 300:
        r, g, b = x, 0, c
    else:
        r, g, b = c, 0, x
    return ((r + m) * 255, (g + m) * 255, (b + m) * 255)


def hsl(hexv, l=None, s=None):
    h, s0, l0 = rgb2hsl(hex2rgb(hexv))
    return rgb2hex(hsl2rgb(h, s0 if s is None else s, l0 if l is None else l))


def _lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _enc(c):
    c = max(0.0, min(1.0, c))
    return (12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055) * 255


def mix(a, b, t):
    ra, ga, ba = hex2rgb(a)
    rb, gb, bb = hex2rgb(b)
    return rgb2hex([_enc(_lin(x) * (1 - t) + _lin(y) * t) for x, y in zip((ra, ga, ba), (rb, gb, bb))])


def lum(hexv):
    r, g, b = hex2rgb(hexv)
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def contrast(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def alpha_over(fg, a, bg):
    return rgb2hex([hex2rgb(fg)[i] * a + hex2rgb(bg)[i] * (1 - a) for i in range(3)])


def contrast_text(hexv):
    r, g, b = hex2rgb(hexv)
    return "#141414" if (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 else "#F4F4F5"


def delta_e76(a, b):
    def lab(h):
        r, g, b = [c / 255.0 for c in hex2rgb(h)]
        x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
        y = (r * 0.2126 + g * 0.7152 + b * 0.0722)
        z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
        f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
        fx, fy, fz = f(x), f(y), f(z)
        return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))
    la, lb = lab(a), lab(b)
    return sum((x - y) ** 2 for x, y in zip(la, lb)) ** 0.5


def hue_of(hexv):
    return rgb2hsl(hex2rgb(hexv))[0]


# ══════════════════════════════════════════════════════════
#  37 色位规格
#  ("token", "anchor", "op", arg, note)
#   op "exact" 原样 | "L" 明度阶 | "mix" 与白/黑线性混合 | "auto" 自动求解
# ══════════════════════════════════════════════════════════
SPEC = [
    # ── 8 背景：深空靛单家族（一个色相 + 纯明度阶梯）──
    ("background",            "void",   "L",   6.5,  "主画布：星海最底"),
    ("sidebarBg",             "void",   "L",   9.0,  "侧栏：比主画布抬一档"),
    ("codeHeaderBg",          "void",   "L",   10.5, "代码卡头：比侧栏再抬半档"),
    ("backgroundPanel",       "void",   "L",   12.5, "面板：卡片底"),
    ("inputBg",               "void",   "L",   15.0, "输入框：可编辑面"),
    ("backgroundElement",     "navy",   "L",   17.0, "浮层：下拉/提示/工具条"),
    ("bubbleBg",              "navy",   "L",   20.0, "气泡：对话主体"),
    ("codeBlockBg",           "void2",  "L",   4.5,  "代码台：全屏最深处"),

    # ── 2 正文 ──
    ("text",                  "parchment", "exact", None, "正文：海报纸白"),
    ("textMuted",             "periwinkle", "auto", None, "次级正文：长春花蓝提亮阶（自动求最低可读档）"),

    # ── 6 品牌 / 语义 ──
    ("primary",               "gold",   "exact", None, "品牌：STAR WARS 字标的招牌金"),
    ("secondary",             "saber",  "exact", None, "第二品牌色：光剑蓝"),
    ("info",                  "peri",   "exact", None, "信息：蓝紫剑晕"),
    ("success",               "mint",   "exact", None, "成功：绿光剑辉"),
    ("warning",               "amber",  "exact", None, "警告：剑与人物之间的热核"),
    ("error",                 "blade2", "L",   52.0, "错误：红剑纯色阶"),

    # ── 2 边框 ──
    ("border",                "navy",   "exact", None, "装饰边框：海报海军蓝"),
    ("borderActive",          "icehot", "exact", None, "焦点环：剑光炽白"),

    # ── 6 diff ──
    ("diffAdded",             "mint2",  "exact", None, "新增行：绿剑亮部"),
    ("diffRemoved",           "ember",  "exact", None, "删除行：红剑余晖"),
    ("diffAddedBg",           "mint",   "L",   11.0, "新增行底"),
    ("diffRemovedBg",         "maroon", "L",   10.5, "删除行底"),
    ("diffAddedLineNumberBg", "mint",   "L",   16.0, "新增行号槽"),
    ("diffRemovedLineNumberBg", "blood", "L", 14.0, "删除行号槽"),

    # ── 6 markdown ──
    ("markdownHeading",       "gold",   "L",   62.0, "标题：招牌金的暗一档"),
    ("markdownLink",          "sky",    "exact", None, "链接：天蓝"),
    ("markdownCode",          "cream",  "exact", None, "行内码：奶油白"),
    ("markdownEmph",          "rose",   "exact", None, "强调：塔图因落日玫瑰"),
    ("markdownStrong",        "starwhite", "exact", None, "强调正文：星尘白"),
    ("markdownBlockQuote",    "periwinkle", "L", 62.0, "引用：长春花蓝的暗一档"),

    # ── 7 syntax ──
    ("syntaxComment",         "grayviolet", "auto", None, "注释：退后梯队的浅档"),
    ("syntaxKeyword",         "violet", "exact", None, "关键字：星云紫"),
    ("syntaxFunction",        "ice",    "exact", None, "函数：冰蓝"),
    ("syntaxType",            "rust",   "mix", ("starwhite", 0.25), "类型：锈橙提亮"),
    ("syntaxNumber",          "gold",   "L",   42.0, "数字：招牌金的鎏金档"),
    ("syntaxString",          "mint3",  "exact", None, "字符串：Luke 绿剑冷调"),
    ("syntaxOperator",        "grayviolet", "auto", None, "运算符：退后梯队的深档"),
]

SURFACES = ["background", "backgroundPanel", "backgroundElement", "sidebarBg",
            "bubbleBg", "inputBg", "codeBlockBg", "codeHeaderBg"]
MUTED_SURFACES = ["background", "backgroundPanel", "backgroundElement"]
MD_SURFACES = ["background", "backgroundPanel"]
MARKDOWN_ROLES = ["markdownHeading", "markdownLink", "markdownStrong", "markdownEmph",
                  "markdownBlockQuote", "markdownCode"]
SYNTAX_ROLES = ["syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxType",
                "syntaxNumber", "syntaxString", "syntaxOperator"]
SYNTAX_CORE = ["syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString"]
BRAND_ROLES = ["primary", "secondary", "info", "success", "warning", "error"]


def derive(anchor, op, arg, colors):
    hexv = ANCHORS[anchor][0]
    if op == "exact":
        return hexv
    if op == "L":
        return hsl(hexv, l=arg)
    if op == "mix":
        other, t = arg
        return mix(hexv, ANCHORS[other][0], t)
    raise ValueError(op)


def build():
    colors, prov = {}, {}
    # 背景先算（textMuted / comment / operator 的自动求解要用到）
    for tok, anchor, op, arg, note in SPEC:
        if op == "auto":
            continue
        v = derive(anchor, op, arg, colors)
        colors[tok] = v
        if op == "exact":
            how = "原样取用"
        elif op == "L":
            how = "锚点 H/S 不变，明度阶 %s%%" % arg
        else:
            how = "与 %s 线性混合 %.0f%%" % (arg[0], arg[1] * 100)
        prov[tok] = {"anchor": ANCHORS[anchor][0], "anchorNote": ANCHORS[anchor][1],
                     "poster": ANCHORS[anchor][2],
                     "op": how, "value": v, "note": note}

    # ── 自动求解 1：textMuted（找「最暗但仍达标」的档位，保持正文层级）──
    best = None
    for t in [i / 100.0 for i in range(0, 101, 2)]:
        cand = mix(ANCHORS["periwinkle"][0], ANCHORS["starwhite"][0], t)
        ok = True
        for s in MUTED_SURFACES:
            if contrast(cand, colors[s]) < 4.5:
                ok = False
            if contrast(alpha_over(cand, 0.8, colors[s]), colors[s]) < 4.5:
                ok = False
        if ok:
            best = (cand, t)
            break
    assert best, "textMuted 无解"
    colors["textMuted"] = best[0]
    prov["textMuted"] = {"anchor": ANCHORS["periwinkle"][0], "anchorNote": ANCHORS["periwinkle"][1],
                          "op": "与 #F5FAFB 线性混合 %.0f%%（自动求「最暗且全档达标」）" % (best[1] * 100),
                          "value": best[0], "note": "次级正文：长春花蓝提亮阶"}

    # ── 自动求解 2：syntaxComment / syntaxOperator（退后梯队：取「刚好达标」的最暗档）──
    core_min = min(contrast(colors[r_], colors["codeBlockBg"]) for r_ in SYNTAX_CORE)

    def darkest_gray(min_ratio):
        """在灰紫家族里找刚好不小于 min_ratio 的最暗档（越暗越退后）"""
        for L in [x / 2.0 for x in range(90, 121)]:          # 45.0 → 60.0
            c = hsl(ANCHORS["grayviolet"][0], l=L)
            v = contrast(c, colors["codeBlockBg"])
            if v >= min_ratio and v <= core_min:
                return c, L, v
        return None, None, None

    c, L, v = darkest_gray(4.85)
    assert c, "syntaxComment 无解"
    colors["syntaxComment"] = c
    prov["syntaxComment"] = {"anchor": ANCHORS["grayviolet"][0], "anchorNote": ANCHORS["grayviolet"][1],
                              "op": "锚点 H/S 不变，明度阶 %.1f%%（退后档 %.2f:1）" % (L, v),
                              "value": c, "note": "注释：退后梯队的浅档"}
    c2, L2, v2 = darkest_gray(4.50)
    assert c2, "syntaxOperator 无解"
    colors["syntaxOperator"] = c2
    prov["syntaxOperator"] = {"anchor": ANCHORS["grayviolet"][0], "anchorNote": ANCHORS["grayviolet"][1],
                               "op": "锚点 H/S 不变，明度阶 %.1f%%（退后档 %.2f:1）" % (L2, v2),
                               "value": c2, "note": "运算符：退后梯队的深档"}
    return colors, prov


def verify(colors):
    pairs = []

    def add(code, fg, bg, thr, cls, group):
        r = contrast(fg, bg)
        pairs.append({"code": code, "fg": fg, "bg": bg, "ratio": r, "threshold": thr,
                      "class": cls, "group": group, "verdict": "PASS" if r >= thr else "FAIL"})

    for s in SURFACES:
        add("text@" + s, colors["text"], colors[s], 4.5, "hard", "text")
    for s in MUTED_SURFACES:
        add("textMuted@" + s, colors["textMuted"], colors[s], 4.5, "hard", "muted")
        add("labelDimmed@" + s, alpha_over(colors["textMuted"], 0.8, colors[s]), colors[s], 4.5, "hard", "dimmed")
    for r_ in MARKDOWN_ROLES:
        for s in MD_SURFACES:
            add(r_ + "@" + s, colors[r_], colors[s], 4.5, "hard", "markdown")
    for r_ in SYNTAX_ROLES:
        add(r_ + "@codeBlockBg", colors[r_], colors["codeBlockBg"], 4.5, "hard", "syntax")
    add("diffAdded@diffAddedBg", colors["diffAdded"], colors["diffAddedBg"], 4.5, "hard", "diff")
    add("diffRemoved@diffRemovedBg", colors["diffRemoved"], colors["diffRemovedBg"], 4.5, "hard", "diff")
    add("text@diffAddedBg", colors["text"], colors["diffAddedBg"], 4.5, "hard", "diff")
    add("text@diffRemovedBg", colors["text"], colors["diffRemovedBg"], 4.5, "hard", "diff")
    add("contrastText(primary)@primary", contrast_text(colors["primary"]), colors["primary"], 4.5, "hard", "onPrimary")
    for s in MUTED_SURFACES:
        add("borderActive@" + s, colors["borderActive"], colors[s], 3.0, "ui", "borderActive")
    for r_ in BRAND_ROLES:
        for s in ["background", "backgroundPanel"]:
            add(r_ + "@" + s, colors[r_], colors[s], 3.0, "ui", "brand")
    return pairs


def design_checks(colors):
    warn = []
    bg_slots = set(SURFACES) | {"diffAddedBg", "diffRemovedBg", "diffAddedLineNumberBg", "diffRemovedLineNumberBg"}
    roles = [t for t in colors if t not in bg_slots]
    seen = {}
    for r_ in roles:
        seen.setdefault(colors[r_], []).append(r_)
    for hexv, rs in seen.items():
        if len(rs) > 1:
            warn.append(("collision", "%s 同值 %s" % ("/".join(sorted(rs)), hexv)))
    base_h = hue_of(colors["background"])
    for s in SURFACES:
        h = hue_of(colors[s])
        d = min(abs(h - base_h) % 360, 360 - abs(h - base_h) % 360)
        if d > 60:
            warn.append(("hueIsland", "%s 色相 %.0f° 偏离底色 %.0f°" % (s, h, base_h)))
    dh = abs(hue_of(colors["primary"]) - hue_of(colors["secondary"])) % 360
    dh = min(dh, 360 - dh)
    cat = "近似" if dh <= 45 else ("三角" if 95 <= dh <= 145 else ("互补" if dh > 145 else "未归类"))
    if cat == "未归类":
        warn.append(("brandGeometry", "primary/secondary 夹角 %.1f°" % dh))
    md_seen = {}
    for r_ in MARKDOWN_ROLES:
        md_seen.setdefault(colors[r_], []).append(r_)
    for hexv, rs in md_seen.items():
        if len(rs) > 1:
            warn.append(("markdownDuplicate", "%s 同值 %s" % ("/".join(rs), hexv)))
    for i in range(len(SYNTAX_CORE)):
        for j in range(i + 1, len(SYNTAX_CORE)):
            a, b = SYNTAX_CORE[i], SYNTAX_CORE[j]
            de = delta_e76(colors[a], colors[b])
            if de < 10:
                warn.append(("syntaxCoreMin", "%s/%s ΔE76=%.1f" % (a, b, de)))
    core_c = [contrast(colors[r_], colors["codeBlockBg"]) for r_ in SYNTAX_CORE]
    for r_ in ("syntaxComment", "syntaxOperator"):
        c = contrast(colors[r_], colors["codeBlockBg"])
        if c > min(core_c) + 1e-9:
            warn.append(("syntaxRecede", "%s %.2f 高于核心最低 %.2f" % (r_, c, min(core_c))))
    return warn, cat, dh


def main():
    colors, prov = build()
    pairs = verify(colors)
    fails = [p for p in pairs if p["verdict"] == "FAIL"]
    warns, cat, dh = design_checks(colors)

    print("=" * 100)
    print("星球大战 IP 主题 · 37 色位（深色）")
    print("=" * 100)
    for tok, anchor, op, arg, note in SPEC:
        h, s, l = rgb2hsl(hex2rgb(colors[tok]))
        print("  %-24s %s  H%3.0f S%3.0f L%3.0f  <- %s  %s" % (
            tok, colors[tok], h, s, l, prov[tok]["anchor"], prov[tok]["op"]))

    print("\n--- 判据 %d 对（硬性 4.5 / UI 3.0）· 失败 %d ---" % (len(pairs), len(fails)))
    for p in sorted(fails, key=lambda x: x["ratio"]):
        print("    FAIL %-38s %.2f (需 %.1f)  %s / %s" % (p["code"], p["ratio"], p["threshold"], p["fg"], p["bg"]))
    print("  最紧 10 对：")
    for p in sorted(pairs, key=lambda x: x["ratio"])[:10]:
        print("    %-38s %6.2f / %.1f  %s" % (p["code"], p["ratio"], p["threshold"], p["verdict"]))

    print("\n--- 设计告警：%d ---" % len(warns))
    for code, msg in warns:
        print("    [%s] %s" % (code, msg))
    print("  品牌几何：primary/secondary 夹角 %.1f° = %s" % (dh, cat))

    print("\n--- 色相家族分布（37 色位）---")
    fam = {}
    for tok, _a, _o, _ar, _n in SPEC:
        h = hue_of(colors[tok])
        s = rgb2hsl(hex2rgb(colors[tok]))[1]
        name = "无彩/灰" if s < 12 else (
            ("金 %d" % (round(h / 10) * 10)) if 35 <= h < 55 else
            ("橙 %d" % (round(h / 10) * 10)) if 20 <= h < 35 else
            ("红 %d" % (round(h / 10) * 10)) if h < 15 else
            ("玫 %d" % (round(h / 10) * 10)) if 340 <= h < 360 else
            ("紫 %d" % (round(h / 10) * 10)) if 255 <= h < 340 else
            ("蓝 %d" % (round(h / 10) * 10)) if 215 <= h < 255 else
            ("青 %d" % (round(h / 10) * 10)) if 185 <= h < 215 else
            ("薄荷 %d" % (round(h / 10) * 10)) if 150 <= h < 185 else
            ("绿 %d" % (round(h / 10) * 10)))
        fam.setdefault(name, []).append(tok)
    for k in sorted(fam, key=lambda k: -len(fam[k])):
        print("    %-10s %d 个：%s" % (k, len(fam[k]), " ".join(fam[k])))

    out = {"colors": colors, "provenance": prov,
           "anchors": {k: {"hex": v[0], "note": v[1], "poster": v[2]} for k, v in ANCHORS.items()},
           "pairs": [{k: (round(v, 3) if isinstance(v, float) else v) for k, v in p.items()} for p in pairs],
           "warnings": warns, "brandGeometry": {"deg": round(dh, 1), "type": cat}}
    with open(os.path.join(OUT, "palette.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print("\nwritten:", os.path.join(OUT, "palette.json"))


main()
