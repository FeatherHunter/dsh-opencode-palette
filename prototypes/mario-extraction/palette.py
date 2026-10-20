# -*- coding: utf-8 -*-
"""马里奥主题 · 逐像素取色 → 37 色位 × 2 外观（light/dark）终值。

判尺（与仓库 docs/theme-audit/criteria.md 同口径，本脚本自检）：
  · 8 个背景槽同色族（色相孤岛 ≤60°）
  · 25 个设计角色两两不同值（角色碰撞）
  · 38 条硬性 4.5:1 + 15 条 UI 3:1
  · 语法核心五角色 ΔE76 ≥ 10；comment / operator 退后
  · primary × secondary 品牌几何（近似 / 三角 / 互补）
每个色位只允许三种来源：直采（等于某个源像素）/ 阶梯（源色与黑白混）/ 混色（两源色定比）。

源图（本机，不入库）：
  C:\\Users\\辰辰洋洋\\Pictures\\超级马里奥\\1.png  NES 标题画面
  C:\\Users\\辰辰洋洋\\Pictures\\超级马里奥\\2.jpg  3D 手办
  C:\\Users\\辰辰洋洋\\Pictures\\超级马里奥\\3.jpg  经典卡通
"""
import io
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))

# ── 源像素（实测值，见 extract 阶段）────────────────────────────────────────
SRC = {
    "sky":      ("#5A96FF", "1.png", "天空背景", "全图 51.4%"),
    "skyHi":   ("#6C9FF6", "1.png", "天空高光", "1.98%"),
    "brick":    ("#CE4D08", "1.png", "砖块 / 地面", "10.3%"),
    "brickMid": ("#D6510A", "1.png", "砖块中间调", "3.01%"),
    "brickHi":  ("#EA7A49", "1.png", "砖块亮面", "2.98%"),
    "brickDk":  ("#BE4204", "1.png", "砖块暗面", "2.97%"),
    "cream":    ("#FFBEB5", "1.png", "标题字面 / 浅沙", "横幅内 39.6%"),
    "black":    ("#000000", "1.png", "勾线", "8.4%"),
    "brickInk": ("#3A1E13", "1.png", "砖缝墨", "5.5%"),
    "mutedBrown": ("#966C64", "1.png", "灰褐", "2.83%"),
    "green":    ("#00AA00", "1.png", "山丘绿", "8.2%"),
    "lime":     ("#84D310", "1.png", "灌木绿", "3.9%"),
    "gold":     ("#8C7100", "1.png", "金币黄", "0.21%"),
    "nesRed":   ("#DE2800", "1.png", "小马里奥红", "0.17%"),
    "nesOrg":   ("#FF9A39", "1.png", "小马里奥橙", "0.16%"),
    "white":    ("#FFFFFF", "2.jpg / 3.jpg", "手套白 · 底色", "43.1%"),
    "ink":      ("#1D100A", "2.jpg", "胡子 / 瞳孔黑", "—"),
    "blue":     ("#0C4BAA", "3.jpg", "背带蓝", "6.1%"),
    "blueHi":   ("#4284DA", "2.jpg", "背带蓝受光", "—"),
    "blueDk":   ("#173D7D", "2.jpg", "背带蓝暗部", "4.9%"),
    "red":      ("#C7280E", "3.jpg", "帽子红", "8.9%"),
    "redHi":    ("#F2300D", "3.jpg", "帽子红亮面", "—"),
    "redLit":   ("#FD4E4B", "2.jpg", "上衣红 · 受光", "—"),
    "redTom":   ("#F7470E", "3.jpg", "红 · 亮橙面", "24 px"),
    "coin":     ("#F3CD24", "3.jpg", "纽扣金", "16 px"),
    "skin":     ("#FFD992", "3.jpg", "肤色", "932 px"),
    "shoe":     ("#7E370B", "3.jpg", "鞋棕", "127 px"),
    "shoeHi":   ("#BD8870", "2.jpg", "鞋棕亮面", "6.0%"),
    "eye":      ("#529DF0", "2.jpg", "眼睛蓝", "—"),
}

# ── 外观定义：role → (源键, 混合目标, 比例)─────────────────────────────────
# 混合目标：None = 直采；'white' = 向白提亮；'black' = 向黑压暗；'ink' = 向 2.jpg 墨线压深
LIGHT = [
    # 8 个背景槽：天蓝一族的明度阶梯（背景家族纯净，无色相孤岛）
    ("background",              "sky",   "white", 0.940),
    ("backgroundPanel",         "sky",   "white", 0.905),
    ("backgroundElement",       "sky",   "white", 0.875),
    ("sidebarBg",               "sky",   "white", 0.920),
    ("bubbleBg",                "sky",   "white", 0.845),
    ("inputBg",                 "sky",   "white", 0.970),
    ("codeBlockBg",             "sky",   "white", 0.955),
    ("codeHeaderBg",            "sky",   "white", 0.890),
    # 文字结构：墨线一族
    ("text",                    "ink",   None,    0.0),
    ("textMuted",               "ink",   "white", 0.220),
    ("markdownStrong",          "black", None,    0.0),
    ("markdownBlockQuote",      "mutedBrown", "ink", 0.200),
    ("syntaxComment",           "ink",   "white", 0.410),
    ("syntaxOperator",          "ink",   "white", 0.380),
    # 品牌六色：红 / 蓝 / 绿 / 金 / 砖
    ("primary",                 "red",   None,    0.0),
    ("secondary",               "blue",  None,    0.0),
    ("info",                    "sky",   "ink",   0.300),
    ("success",                 "green", "ink",   0.460),
    ("warning",                 "gold",  "ink",   0.260),
    ("error",                   "red",   "ink",   0.300),
    # 边界
    ("border",                  "sky",   "white", 0.660),
    ("borderActive",            "sky",   "ink",   0.200),
    # diff 前景
    ("diffAdded",               "green", "ink",   0.660),
    ("diffRemoved",             "brick", "ink",   0.200),
    ("diffAddedBg",             "green", "white", 0.900),
    ("diffRemovedBg",           "brick", "white", 0.910),
    ("diffAddedLineNumberBg",   "green", "white", 0.740),
    ("diffRemovedLineNumberBg", "brick", "white", 0.790),
    # markdown 六角色
    ("markdownHeading",         "blueDk", None,   0.0),
    ("markdownLink",            "red",   "ink",   0.100),
    ("markdownCode",            "brickInk", "white", 0.150),
    ("markdownEmph",            "brick", "ink",   0.350),
    # 语法七角色
    ("syntaxKeyword",           "red",   "ink",   0.180),
    ("syntaxFunction",          "blueHi", "ink",  0.400),
    ("syntaxType",              "lime",  "ink",   0.500),
    ("syntaxNumber",            "nesOrg", "ink",  0.500),
    ("syntaxString",            "shoe",  None,    0.0),
]

DARK = [
    ("background",              "sky",   "black", 0.930),
    ("backgroundPanel",         "sky",   "black", 0.880),
    ("backgroundElement",       "sky",   "black", 0.840),
    ("sidebarBg",               "sky",   "black", 0.900),
    ("bubbleBg",                "sky",   "black", 0.870),
    ("inputBg",                 "sky",   "black", 0.910),
    ("codeBlockBg",             "sky",   "black", 0.960),
    ("codeHeaderBg",            "sky",   "black", 0.945),
    ("text",                    "cream", "white", 0.550),
    ("textMuted",               "cream", "black", 0.220),
    ("markdownStrong",          "cream", "white", 0.750),
    ("markdownBlockQuote",      "mutedBrown", "white", 0.300),
    ("syntaxComment",           "cream", "black", 0.360),
    ("syntaxOperator",          "cream", "black", 0.400),
    ("primary",                 "nesRed", "black", 0.120),
    ("secondary",               "blueHi", None,   0.0),
    ("info",                    "sky",   "black", 0.300),
    ("success",                 "lime",  None,    0.0),
    ("warning",                 "coin",  "black", 0.250),
    ("error",                   "redTom", None,   0.0),
    ("border",                  "cream", "black", 0.750),
    ("borderActive",            "sky",   None,    0.0),
    ("diffAdded",               "green", None,    0.0),
    ("diffRemoved",             "nesRed", "white", 0.120),
    ("diffAddedBg",             "green", "black", 0.850),
    ("diffRemovedBg",           "nesRed", "black", 0.850),
    ("diffAddedLineNumberBg",   "green", "black", 0.780),
    ("diffRemovedLineNumberBg", "nesRed", "black", 0.780),
    ("markdownHeading",         "sky",   "white", 0.550),
    ("markdownLink",            "eye",   "white", 0.100),
    ("markdownCode",            "shoe",  "white", 0.450),
    ("markdownEmph",            "coin",  "white", 0.300),
    ("syntaxKeyword",           "redHi", "white", 0.100),
    ("syntaxFunction",          "eye",   None,    0.0),
    ("syntaxType",              "coin",  None,    0.0),
    ("syntaxNumber",            "nesOrg", None,   0.0),
    ("syntaxString",            "lime",  "white", 0.350),
]

# 语义标签（写进 notes 用）
LABELS = {
    "background": "晴空纸", "backgroundPanel": "云层", "backgroundElement": "浮空",
    "sidebarBg": "侧栏", "bubbleBg": "气泡", "inputBg": "输入面", "codeBlockBg": "代码纸",
    "codeHeaderBg": "代码头", "text": "墨线", "textMuted": "淡墨", "markdownStrong": "重墨",
    "markdownBlockQuote": "引用", "syntaxComment": "注释", "syntaxOperator": "运算符",
    "primary": "帽红", "secondary": "背带蓝", "info": "天蓝", "success": "山丘绿",
    "warning": "金币黄", "error": "砖红", "border": "砖缝蓝", "borderActive": "焦点蓝",
    "diffAdded": "新增绿", "diffRemoved": "删砖橙", "markdownHeading": "标题蓝",
    "markdownLink": "链接红", "markdownCode": "行内码棕", "markdownEmph": "强调橙",
    "syntaxKeyword": "关键字红", "syntaxFunction": "函数蓝", "syntaxType": "类型橄榄",
    "syntaxNumber": "数字橙", "syntaxString": "字符串棕",
}


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def hx(t):
    return "#%02X%02X%02X" % tuple(int(round(float(c))) for c in t[:3])


def mix(a, b, t):
    ra, rb = rgb(a), rgb(b)
    return hx(tuple(ra[i] + (rb[i] - ra[i]) * t for i in range(3)))


def lum(h):
    out = []
    for c in rgb(h):
        c = c / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]


def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def hexlab(h):
    def ch(v):
        v = v / 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = ch(rgb(h)[0]), ch(rgb(h)[1]), ch(rgb(h)[2])
    x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
    y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
    z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy - 16, 500 * (fx - fz and fx - fy), 200 * (fy - fz))


def deltaE(a, b):
    la, lb = hexlab(a), hexlab(b)
    return (sum((x - y) ** 2 for x, y in zip(la, lb))) ** 0.5


def hsl(h):
    r, g, b = [c / 255 for c in rgb(h)]
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    d = mx - mn
    if d == 0:
        return (0.0, 0.0, 0.0)
    if mx == r:
        hu = ((g - b) / d) % 6
    elif mx == g:
        hu = (b - r) / d + 2
    else:
        hu = (r - g) / d + 4
    hu *= 60
    s = d / (1 - abs(2 * l - 1)) if l not in (0, 1) else 0
    return (hu, s, l)


def chroma(h):
    c = rgb(h)
    return max(c) - min(c)


def hue_dist(a, b):
    d = abs(a - b) % 360
    return d if d <= 180 else 360 - d


def build(spec):
    colors, prov = {}, {}
    for role, src, tgt, t in spec:
        base = SRC[src][0]
        if tgt is None:
            val, formula = base, "直采"
        else:
            val = mix(base, SRC[tgt][0], t)
            formula = "%s → %s 混 %d%%" % (base, SRC[tgt][0], round(t * 100))
        colors[role] = val
        prov[role] = {
            "role": role, "label": LABELS.get(role, role), "value": val,
            "srcKey": src, "srcHex": base, "srcFile": SRC[src][1],
            "srcWhere": SRC[src][2], "srcShare": SRC[src][3],
            "mixTarget": tgt, "mixRatio": t, "formula": formula,
            "kind": "直采" if tgt is None else ("阶梯" if tgt in ("white", "black") else "压深"),
        }
    return colors, prov


SURFACES = ["background", "backgroundPanel", "backgroundElement", "sidebarBg",
            "bubbleBg", "inputBg", "codeBlockBg", "codeHeaderBg"]
MUTED_SURFACES = ["background", "backgroundPanel", "backgroundElement"]
MD_ROLES = ["markdownHeading", "markdownLink", "markdownStrong", "markdownEmph",
            "markdownBlockQuote", "markdownCode"]
SYNTAX_ROLES = ["syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxType",
                "syntaxNumber", "syntaxString", "syntaxOperator"]
SYNTAX_CORE = ["syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString"]
BRAND_ROLES = ["primary", "secondary", "info", "success", "warning", "error"]
DESIGN_ROLES = ["text", "textMuted"] + BRAND_ROLES + ["border", "borderActive",
                "diffAdded", "diffRemoved"] + MD_ROLES + SYNTAX_ROLES


def audit(colors, name):
    issues = []
    surf = {k: colors[k] for k in SURFACES}

    def hard(code, fg, bg, need=4.5):
        r = contrast(fg, bg)
        if r < need:
            issues.append("硬性 %s = %.2f (需 %.1f) %s / %s" % (code, r, need, fg, bg))

    def ui(code, fg, bg, need=3.0):
        r = contrast(fg, bg)
        if r < need:
            issues.append("UI %s = %.2f (需 %.1f) %s / %s" % (code, r, need, fg, bg))

    for s in SURFACES:
        hard("text@" + s, colors["text"], surf[s])
    for s in MUTED_SURFACES:
        hard("textMuted@" + s, colors["textMuted"], surf[s])
        hard("labelDimmed@" + s, mix(colors["textMuted"], "#FFFFFF", 0.2), surf[s])
    for r in MD_ROLES:
        for s in ["background", "backgroundPanel"]:
            hard(r + "@" + s, colors[r], surf[s])
    for r in SYNTAX_ROLES:
        hard(r + "@codeBlockBg", colors[r], surf["codeBlockBg"])
    hard("diffAdded@diffAddedBg", colors["diffAdded"], colors["diffAddedBg"])
    hard("diffRemoved@diffRemovedBg", colors["diffRemoved"], colors["diffRemovedBg"])
    hard("text@diffAddedBg", colors["text"], colors["diffAddedBg"])
    hard("text@diffRemovedBg", colors["text"], colors["diffRemovedBg"])
    luma = (0.299 * rgb(colors["primary"])[0] + 0.587 * rgb(colors["primary"])[1]
            + 0.114 * rgb(colors["primary"])[2]) / 255
    hard("contrastText(primary)@primary", "#141414" if luma > 0.6 else "#F4F4F5", colors["primary"])
    for s in MUTED_SURFACES:
        ui("borderActive@" + s, colors["borderActive"], surf[s])
    for r in BRAND_ROLES:
        for s in ["background", "backgroundPanel"]:
            ui(r + "@" + s, colors[r], surf[s])

    # 角色碰撞
    seen = {}
    for r in DESIGN_ROLES:
        seen.setdefault(colors[r].lower(), []).append(r)
    for k, roles in seen.items():
        if len(roles) > 1:
            issues.append("角色同值碰撞 %s = %s" % (" = ".join(roles), k))

    # 背景色相孤岛
    base = surf["background"]
    bh = hsl(base)[0]
    islands = []
    for s in SURFACES:
        if chroma(surf[s]) < 8:
            continue
        hh = hsl(surf[s])[0]
        d = hue_dist(hh, bh)
        if d > 60:
            islands.append("%s(%.1f°, Δ%.1f°)" % (s, hh, d))
    if islands:
        issues.append("背景色相孤岛: " + ", ".join(islands))

    # 品牌几何
    hd = hue_dist(hsl(colors["primary"])[0], hsl(colors["secondary"])[0])
    cat = "analogous" if hd <= 45 else ("triadic" if 95 <= hd <= 145 else ("complementary" if hd > 145 else "unclassified"))
    if cat == "unclassified":
        issues.append("品牌几何未分类 primary × secondary = %.1f°" % hd)

    # 语法核心 ΔE
    core = []
    for i in range(len(SYNTAX_CORE)):
        for j in range(i + 1, len(SYNTAX_CORE)):
            core.append((deltaE(colors[SYNTAX_CORE[i]], colors[SYNTAX_CORE[j]]),
                         SYNTAX_CORE[i], SYNTAX_CORE[j]))
    core.sort()
    if core and core[0][0] < 10:
        issues.append("语法核心最小 ΔE=%.1f (%s × %s)" % (core[0][0], core[0][1], core[0][2]))

    # comment / operator 退后
    def c_on_code(role):
        return contrast(colors[role], surf["codeBlockBg"])
    min_core = min(c_on_code(r) for r in SYNTAX_CORE)
    for r in ("syntaxComment", "syntaxOperator"):
        if c_on_code(r) > min_core:
            issues.append("%s 未退后 %.2f > 核心最低 %.2f" % (r, c_on_code(r), min_core))

    print("── %s ──" % name)
    print("  硬性/UI 违例与设计告警：%d" % len(issues))
    for i in issues:
        print("    ✗ " + i)
    if not issues:
        print("    ✓ 全部通过")
    print("  语法核心最小 ΔE = %.1f；comment %.2f / operator %.2f vs 核心最低 %.2f"
          % (core[0][0], c_on_code("syntaxComment"), c_on_code("syntaxOperator"), min_core))
    print("  品牌几何 %.1f° → %s" % (hd, cat))
    print("  背景孤岛：无" if not islands else "  背景孤岛：" + ", ".join(islands))
    return issues


def main():
    lc, lp = build(LIGHT)
    dc, dp = build(DARK)
    print("浅色 37 色位：")
    for k in sorted(lc):
        print("  %-26s %s  (%s)" % (k, lc[k], lp[k]["formula"]))
    print()
    print("深色 37 色位：")
    for k in sorted(dc):
        print("  %-26s %s  (%s)" % (k, dc[k], dp[k]["formula"]))
    print()
    i1 = audit(lc, "light")
    i2 = audit(dc, "dark")
    out = {
        "schema": "mario-extraction.palette.v1",
        "source": {k: {"hex": v[0], "file": v[1], "where": v[2], "share": v[3]} for k, v in SRC.items()},
        "light": {"appearance": "light", "colors": lc, "provenance": lp},
        "dark": {"appearance": "dark", "colors": dc, "provenance": dp},
        "audit": {"light": len(i1), "dark": len(i2)},
    }
    with io.open(os.path.join(HERE, "palette.json"), "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(out, ensure_ascii=False, indent=1))
    print("\nwrote palette.json；违例 浅色 %d / 深色 %d" % (len(i1), len(i2)))
    return 0 if not i1 and not i2 else 1


if __name__ == "__main__":
    raise SystemExit(main())
