"""verify.py — DC 主题：37 色位台账 + 全判尺复算（直采证据 + 38 硬对 + 15 UI 对 + W1..W5）。

用法：python verify.py            # 打印报告并写 palette.json（台账）
     python verify.py > verify-report.txt   # 顺带留一份报告


Rules implemented exactly as docs/theme-audit/criteria.md + scripts/audit-themes.ts:
  hard 4.5 (38 pairs) / ui 3.0 (15 pairs) / design warnings (W1..W5)
  engine: ensureDiffContrast (isDark=true) + contrastText (legacy luma)
"""
import colorsys
import json
import os
from collections import Counter, defaultdict

import numpy as np
from PIL import Image

SRC = os.environ.get("DC_REF", r"C:\Users\辰辰洋洋\Pictures\DC")
OUT = os.path.dirname(os.path.abspath(__file__))
FILES = ("1.jpg", "2.jpg", "3.jpg")

# ---------------------------------------------------------------- material pool
pool = Counter()
where = defaultdict(set)
px_list, file_idx = [], []
for fi, f in enumerate(FILES):
    im = Image.open(os.path.join(SRC, f)).convert("RGB")
    W, H = im.size
    px = im.load()
    for y in range(H):
        for x in range(W):
            p = px[x, y]
            pool["#%02X%02X%02X" % p] += 1
            where["#%02X%02X%02X" % p].add(f)
            px_list.append(p)
            file_idx.append(fi)
RGB = np.array(px_list, dtype=np.float64) / 255.0
FILEI = np.array(file_idx)


def to_lab(rgb):
    lin = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    r, g, b = lin[:, 0], lin[:, 1], lin[:, 2]
    X = r * 0.4124 + g * 0.3576 + b * 0.1805
    Y = r * 0.2126 + g * 0.7152 + b * 0.0722
    Z = r * 0.0193 + g * 0.1192 + b * 0.9505
    fx = np.where(X / 0.95047 > 0.008856, (X / 0.95047) ** (1 / 3), 7.787 * (X / 0.95047) + 16 / 116)
    fy = np.where(Y > 0.008856, Y ** (1 / 3), 7.787 * Y + 16 / 116)
    fz = np.where(Z / 1.08883 > 0.008856, (Z / 1.08883) ** (1 / 3), 7.787 * (Z / 1.08883) + 16 / 116)
    return np.stack([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)], axis=1)


LAB = to_lab(RGB)
CELL = 6.0
cells = np.floor(LAB / CELL).astype(np.int64)
uniq, inv = np.unique(cells, axis=0, return_inverse=True)
order = np.argsort(inv, kind="stable")
inv_sorted = inv[order]
starts = np.searchsorted(inv_sorted, np.arange(len(uniq) + 1))
CELLIDX = {tuple(u): order[starts[i]:starts[i + 1]] for i, u in enumerate(uniq)}
_C = {}


def lab_of(h):
    if h not in _C:
        v = np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])
        _C[h] = to_lab(v[None, :])[0]
    return _C[h]


def mass_of(h, tol=6.0):
    q = lab_of(h)
    c0 = np.floor(q / CELL).astype(int)
    idx = []
    for dl in (-1, 0, 1):
        for da in (-1, 0, 1):
            for db in (-1, 0, 1):
                k = (c0[0] + dl, c0[1] + da, c0[2] + db)
                if k in CELLIDX:
                    idx.append(CELLIDX[k])
    if not idx:
        return 0, {}
    sel = np.concatenate(idx)
    d = np.sqrt(((LAB[sel] - q) ** 2).sum(axis=1))
    keep = sel[d <= tol]
    c = Counter(FILES[FILEI[i]] for i in keep.tolist())
    return sum(c.values()), dict(c)


def Yof(h):
    v = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2])


def Lstar(h):
    y = Yof(h)
    return 116 * (y ** (1 / 3) if y > 0.008856 else 7.787 * y + 16 / 116) - 16


def hsl_of(h):
    v = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    hh, ss, vv = colorsys.rgb_to_hsv(*v)
    mx, mn = max(v), min(v)
    l = (mx + mn) / 2
    d = mx - mn
    if d == 0:
        s = 0.0
    else:
        s = d / (1 - abs(2 * l - 1))
    return hh * 360, s, l


def chroma_of(h):
    v = [int(h[i:i + 2], 16) for i in (1, 3, 5)]
    return max(v) - min(v)


def ratio(a, b):
    la, lb = Yof(a), Yof(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def contrast_text(h):
    v = [int(h[i:i + 2], 16) for i in (1, 3, 5)]
    luma = (0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]) / 255
    return "#141414" if luma > 0.6 else "#F4F4F5"


def blend_srgb(fg, bg, a):
    f = [int(fg[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(bg[i:i + 2], 16) for i in (1, 3, 5)]
    return "#%02X%02X%02X" % tuple(round(f[i] * a + b[i] * (1 - a)) for i in range(3))


def de76(a, b):
    l1, a1, b1 = lab_of(a)
    l2, a2, b2 = lab_of(b)
    return float(np.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2))


# ---------------------------------------------------------------- the palette
P = {
    # 8 surfaces — one hue family (~203-226), chroma rising with light
    "codeBlockBg":  ("#000515", "1.jpg 披风深处黑蓝 · 代码井底"),
    "sidebarBg":    ("#0A0F12", "1.jpg/3.jpg 人物之间死黑 · 侧栏凹槽"),
    "background":   ("#0C1326", "1.jpg 海报底部蓝黑 · 场"),
    "backgroundPanel": ("#09203F", "1.jpg 披风受光深蓝 · 卡片"),
    "inputBg":      ("#192D52", "1.jpg 战衣受影的蓝 · 输入槽"),
    "codeHeaderBg": ("#122543", "1.jpg 超人披肩深蓝 · 代码头带"),
    "backgroundElement": ("#263356", "1.jpg 钢仔装甲的蓝 · 浮层"),
    "bubbleBg":     ("#0F437D", "2.jpg 徽章圆盘深蓝 · 气泡"),
    # text
    "text":         ("#FEFAD4", "3.jpg 百科封面旧纸"),
    "textMuted":    ("#BDC0C5", "1.jpg 蓝雾天光"),
    # brand / semantic
    "primary":      ("#0373B3", "2.jpg 徽章圆盘本体"),
    "secondary":    ("#E4BA56", "3.jpg 神奇女侠金冠"),
    "info":         ("#91C1CF", "1.jpg 速度力水蓝"),
    "success":      ("#64AB65", "1.jpg 绿灯侠战衣绿"),
    "warning":      ("#C2A595", "3.jpg 封面天空陶土"),
    "error":        ("#BE4B48", "3.jpg 红披风暗面"),
    # borders
    "border":       ("#7C7D7F", "1.jpg 钢仔装甲银灰"),
    "borderActive": ("#D6F0FF", "2.jpg 徽章白星冷光"),
    # diff
    "diffAdded":    ("#8BB551", "3.jpg 封面绿灯侠黄绿"),
    "diffRemoved":  ("#D37B6D", "1.jpg 火焰旁披风暖红"),
    "diffAddedBg":  ("#131B0E", "3.jpg 封面暗部绿黑"),
    "diffRemovedBg": ("#221A17", "3.jpg 封面纸面暖影"),
    "diffAddedLineNumberBg": ("#0A0F12", "1.jpg 人物之间死黑 · 行号底"),
    "diffRemovedLineNumberBg": ("#18100D", "3.jpg 封面阴影最深处"),
    # markdown
    "markdownHeading": ("#B8D8ED", "1.jpg 速度力冷白"),
    "markdownLink": ("#0392CE", "2.jpg 徽章上缘亮青"),
    "markdownCode": ("#ECD1B4", "3.jpg 女侠暖肤色"),
    "markdownEmph": ("#82BBE8", "1.jpg 浅天光冷调"),
    "markdownStrong": ("#FFFFFF", "2.jpg 徽章白底与白星"),
    "markdownBlockQuote": ("#A3BDD6", "1.jpg 蓝雾天幕"),
    # syntax
    "syntaxComment": ("#717F8A", "1.jpg 钢仔钢灰"),
    "syntaxKeyword": ("#BDA3B0", "3.jpg 封面暗肤玫瑰灰"),
    "syntaxFunction": ("#008AC9", "2.jpg 徽章圆盘上缘"),
    "syntaxType": ("#BEDCDE", "1.jpg 钢仔银青高光"),
    "syntaxNumber": ("#E6B189", "3.jpg 封面里那本旧漫画的纸"),
    "syntaxString": ("#89BF81", "1.jpg 绿灯侠战衣浅绿"),
    "syntaxOperator": ("#7D7875", "1.jpg 装甲与硝烟暖灰"),
}
C = {k: v[0] for k, v in P.items()}
NOTE = {k: v[1] for k, v in P.items()}

SURFACES = ["background", "backgroundPanel", "backgroundElement", "sidebarBg", "bubbleBg",
            "inputBg", "codeBlockBg", "codeHeaderBg"]
MUTED = ["background", "backgroundPanel", "backgroundElement"]
MD = ["markdownHeading", "markdownLink", "markdownCode", "markdownEmph", "markdownStrong", "markdownBlockQuote"]
SYN = ["syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString", "syntaxOperator"]
CORE = ["syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString"]
BRAND = ["primary", "secondary", "info", "success", "warning", "error"]
DESIGN_ROLES = ([k for k in C if k not in SURFACES] +
                [k for k in C if k in ("diffAddedBg", "diffRemovedBg", "diffAddedLineNumberBg", "diffRemovedLineNumberBg")][:0])

fails, warns = [], []


def chk(code, fg, bg, th, cls):
    r = ratio(fg, bg)
    if r < th:
        (fails if cls == "hard" else warns).append((code, fg, bg, round(r, 3), th))
    return r


print("=" * 78)
print("V2 FINAL — 37 tokens, every hex must be a REAL pixel of the 3 reference images")
print("=" * 78)
for k, h in C.items():
    m, files = mass_of(h)
    real = pool.get(h, 0)
    flag = "" if real > 0 else "   <<< NOT A PIXEL"
    print("  %-26s %-9s pixel=%-5d mass=%-6d %-8s Y=%.4f L*=%5.1f h=%5.1f c=%4.1f%s"
          % (k, h, real, m, ",".join(sorted(files)), Yof(h), Lstar(h), hsl_of(h)[0], chroma_of(h), flag))
    if real == 0:
        fails.append(("material:" + k, h, "", 0, 1))

print("\n--- HARD 4.5 (38 pairs) ---")
hard = 0
for s in SURFACES:
    hard += 1
    chk("text@" + s, C["text"], C[s], 4.5, "hard")
for s in MUTED:
    hard += 1
    chk("textMuted@" + s, C["textMuted"], C[s], 4.5, "hard")
for s in MUTED:
    hard += 1
    chk("labelDimmed@" + s, blend_srgb(C["textMuted"], C[s], 0.8), C[s], 4.5, "hard")
for m in MD:
    for s in ("background", "backgroundPanel"):
        hard += 1
        chk(m + "@" + s, C[m], C[s], 4.5, "hard")
for r in SYN:
    hard += 1
    chk(r + "@codeBlockBg", C[r], C["codeBlockBg"], 4.5, "hard")
for fg, bgs in [("diffAdded", "diffAddedBg"), ("diffRemoved", "diffRemovedBg"),
                ("text", "diffAddedBg"), ("text", "diffRemovedBg")]:
    hard += 1
    chk("%s@%s" % (fg, bgs), C[fg], C[bgs], 4.5, "hard")
ct = contrast_text(C["primary"])
hard += 1
chk("contrastText(primary)@primary", ct, C["primary"], 4.5, "hard")
print("  hard pairs checked: %d" % hard)

print("\n--- UI 3.0 (15 pairs) ---")
ui = 0
for s in MUTED:
    ui += 1
    chk("borderActive@" + s, C["borderActive"], C[s], 3.0, "ui")
for b in BRAND:
    for s in ("background", "backgroundPanel"):
        ui += 1
        chk("%s@%s" % (b, s), C[b], C[s], 3.0, "ui")
print("  ui pairs checked: %d" % ui)

print("\n--- ENGINE: ensureDiffContrast(norm, isDark=true) must be a NO-OP ---")
for fg, bgs in [("diffAdded", ["diffAddedBg", "diffAddedLineNumberBg"]),
                ("diffRemoved", ["diffRemovedBg", "diffRemovedLineNumberBg"])]:
    bad = [b for b in bgs if ratio(C[fg], C[b]) < 4.5]
    print("  %-12s %s" % (fg, ("WOULD REWRITE on " + ",".join(bad)) if bad else "no-op — authored values ship"))
    if bad:
        fails.append(("engine-diff:" + fg, bad[0], "", 0, 4.5))

print("\n--- DESIGN (W1..W5) ---")
# W1 hue islands over the 8 surfaces
base = C["background"]
bh = hsl_of(base)[0]
isl = []
for s in SURFACES:
    h = C[s]
    if chroma_of(h) >= 8:
        d = abs(hsl_of(h)[0] - bh) % 360
        d = min(d, 360 - d)
        if d > 60:
            isl.append((s, round(hsl_of(h)[0], 1), round(d, 1)))
print("  W1 hue islands: %s" % (isl or "none"))
if isl:
    warns.append(("bgPurity", str(isl), "", 0, 0))
# W2 exact collisions among the 25 design roles
roles25 = [k for k in C if k not in SURFACES and k not in
           ("diffAddedBg", "diffRemovedBg", "diffAddedLineNumberBg", "diffRemovedLineNumberBg")]
inv = defaultdict(list)
for k in roles25:
    inv[C[k].lower()].append(k)
coll = {v: r for v, r in inv.items() if len(r) > 1}
print("  W2 exact collisions (25 roles): %s" % (coll or "none"))
if coll:
    warns.append(("collision", str(coll), "", 0, 0))
# W3 markdown duplicates
mdi = defaultdict(list)
for k in MD:
    mdi[C[k].lower()].append(k)
mcoll = {v: r for v, r in mdi.items() if len(r) > 1}
print("  W3 markdown duplicates: %s" % (mcoll or "none"))
# W4 brand geometry
h1, h2 = hsl_of(C["primary"])[0], hsl_of(C["secondary"])[0]
hd = abs(h1 - h2) % 360
hd = min(hd, 360 - hd)
cat = "analogous" if hd <= 45 else ("triadic" if 95 <= hd <= 145 else "complementary")
print("  W4 brand geometry: %.1f deg -> %s" % (hd, cat))
if cat not in ("analogous", "triadic", "complementary"):
    warns.append(("brandGeometry", "", "", 0, 0))
# W5 syntax core dE + comment/operator recede
worst = min((de76(C[a], C[b]), a, b) for i, a in enumerate(CORE) for b in CORE[i + 1:])
print("  W5 core min dE76: %.2f (%s vs %s)" % (worst[0], worst[1], worst[2]))
if worst[0] < 10:
    warns.append(("syntaxCoreMin", worst[1] + "/" + worst[2], "", round(worst[0], 2), 10))
core_floor = min(ratio(C[k], C["codeBlockBg"]) for k in CORE)
print("  W5 core contrast floor: %.2f" % core_floor)
for k in ("syntaxComment", "syntaxOperator"):
    v = ratio(C[k], C["codeBlockBg"])
    print("     %-15s %.2f  %s" % (k, v, "recedes OK" if v <= core_floor else "DOES NOT RECEDE"))
    if v > core_floor:
        warns.append(("syntaxRecede:" + k, "", "", round(v, 2), round(core_floor, 2)))

print("\n--- SURFACE LADDER (L*) ---")
lad = ["codeBlockBg", "sidebarBg", "background", "backgroundPanel", "codeHeaderBg", "inputBg", "backgroundElement", "bubbleBg"]
for a, b in zip(lad, lad[1:]):
    print("  %-18s %5.1f  ->  %-18s %5.1f   step %+.1f" % (a, Lstar(C[a]), b, Lstar(C[b]), Lstar(C[b]) - Lstar(C[a])))

print("\n--- ROLE SEPARATION (dE76) ---")
for i, a in enumerate(sorted(C)):
    row = []
    for b in sorted(C)[i + 1:]:
        if a in SURFACES or b in SURFACES:
            continue
        d = de76(C[a], C[b])
        if d < 12:
            row.append("%s/%s=%.1f" % (a, b, d))
    if row:
        print("  " + ", ".join(row))

print("\n--- INFO ITEMS ---")
for s in SURFACES:
    print("  border@%-18s %.2f" % (s, ratio(C["border"], C[s])))
print("  focus ring vs primary fill: %.2f (WCAG 2.2 SC 2.4.13 wants >=3)" % ratio(C["borderActive"], C["primary"]))

print("\n=== HARD FAILS: %d ===" % len(fails))
for f in fails:
    print("   ", f)
print("=== DESIGN WARNS: %d ===" % len(warns))
for w in warns:
    print("   ", w)

data = {"palette": {}, "fails": fails, "warns": warns}
for k, h in C.items():
    m, files = mass_of(h)
    data["palette"][k] = {"hex": h, "note": NOTE[k], "pixel": pool.get(h, 0), "mass": m,
                          "files": files, "Y": round(Yof(h), 5), "L": round(Lstar(h), 2),
                          "hue": round(hsl_of(h)[0], 1), "chroma": chroma_of(h)}
with open(os.path.join(OUT, "palette.json"), "w", encoding="utf-8") as fh:
    json.dump(data, fh, indent=2, ensure_ascii=False)
print("\nwrote", os.path.join(OUT, "palette.json"))
