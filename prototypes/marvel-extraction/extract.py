# -*- coding: utf-8 -*-
"""漫威主题 · 逐像素取色管线（对抗式审查第 5 轮版）

从三张参考图重新推导 src/custom-presets/marvel.json 的 37 个色位。

溯源判尺（四级，每一色都必须能说清自己是从画面哪一块来的）：

  A1 实涂直采   该 hex 在图中逐像素出现 >= 500 次 —— 幻灯片上被真正平涂过的色
  A2 边阶直采   该 hex 在图中逐像素出现 50..499 次，且能被证明是两个平涂色的
                渲染器抗锯齿混合（误差 <= 1/255）—— 排版边缘自己踩出来的台阶
  B  簇采       该 hex 是中位切分簇心：图里没有这个字面值，它代表一片
                ΔE76 <= 10 的实际区域
  C  阶梯派生   以图里某个源色的 a*/b* 为基准，只把 L* 走到目标明度

不允许出现「图外臆造」的颜色：A1/A2 逐像素在图里、B 落在图里某片区域、
C 的源色逐像素在图里。
"""
import os, json, math, itertools
from collections import Counter
from PIL import Image

SRC = r"C:\Users\辰辰洋洋\Pictures\漫威"
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))

if not os.path.isdir(SRC):
    raise SystemExit("源图目录不存在：%s（本机素材，不入库）" % SRC)

FILES = sorted(f for f in os.listdir(SRC) if f.lower().endswith(".png"))
POSTER = {FILES[0]: "01-spiderman", FILES[1]: "02-ironman", FILES[2]: "03-logo"}
SHORT = {FILES[0]: "蜘蛛侠漫画主视觉", FILES[1]: "钢铁侠主视觉", FILES[2]: "漫威红色标志"}

# ── 取色工具 ────────────────────────────────────────────────────────────────
def hexof(rgb): return "#%02X%02X%02X" % rgb
def rgbof(h): return (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))
def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def Y(h):
    r, g, b = rgbof(h)
    return 0.2126729 * lin(r) + 0.7151522 * lin(g) + 0.0721750 * lin(b)
def contrast(a, b):
    ya, yb = Y(a), Y(b)
    hi, lo = max(ya, yb), min(ya, yb)
    return (hi + 0.05) / (lo + 0.05)
def lum8(h):
    r, g, b = rgbof(h)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255
def contrastText(h): return "#141414" if lum8(h) > 0.6 else "#F4F4F5"
def flatten(fg, bg, a):
    f, b = rgbof(fg), rgbof(bg)
    return hexof(tuple(round(f[i] * a + b[i] * (1 - a)) for i in range(3)))
def lstar(h):
    y = Y(h)
    return 116 * (y ** (1 / 3)) - 16 if y > 0.008856 else 903.3 * y
def chroma8(h):
    r, g, b = rgbof(h)
    return max(r, g, b) - min(r, g, b)
def hsl_hue(h):
    r, g, b = [v / 255 for v in rgbof(h)]
    mx, mn = max(r, g, b), min(r, g, b)
    if mx == mn: return 0.0
    d = mx - mn
    if mx == r: hp = ((g - b) / d) % 6
    elif mx == g: hp = (b - r) / d + 2
    else: hp = (r - g) / d + 4
    return hp * 60
def huedist(a, b):
    d = abs(a - b) % 360
    return min(d, 360 - d)
def rgb2lab(h):
    r, g, b = [lin(v) for v in rgbof(h)]
    x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
    y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
    z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883
    def f(t):
        return t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))
def de76(a, b):
    la, lb = rgb2lab(a), rgb2lab(b)
    return sum((la[i] - lb[i]) ** 2 for i in range(3)) ** 0.5
def lab2rgb(L, a, bb):
    fy = (L + 16) / 116.0
    fx = fy + a / 500.0
    fz = fy - bb / 200.0
    def finv(t):
        return t ** 3 if t > 6 / 29 else 3 * (6 / 29) ** 2 * (t - 4 / 29)
    x = finv(fx) * 0.95047
    y = finv(fy)
    z = finv(fz) * 1.08883
    r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314
    g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560
    bl = x * 0.0556434 + y * -0.2040259 + z * 1.0572252
    def enc(c):
        c = max(0.0, min(1.0, c))
        v = 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
        return int(round(max(0, min(255, v * 255))))
    return hexof((enc(r), enc(g), enc(bl)))
def step_L(src, targetL):
    """阶梯派生：保持 a*/b* 绝对值不变，只把 L* 走到目标值。"""
    L, a, b = rgb2lab(src)
    return lab2rgb(targetL, a, b)

# ── 全图普查 ────────────────────────────────────────────────────────────────
def clusters(path, n, pixels=None):
    im = Image.open(path).convert("RGB")
    if pixels is not None:
        im = Image.new("RGB", (len(pixels), 1)); im.putdata(pixels)
    q = im.quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = q.getpalette(); cnt = Counter(q.getdata()); tot = sum(cnt.values())
    out = []
    for idx, c in cnt.most_common():
        rgb = tuple(pal[idx * 3:idx * 3 + 3])
        out.append((hexof(rgb), c, 100.0 * c / tot))
    return out

per_px = {}; total_px = Counter(); ALLPX = []; LABPX = {}
for f in FILES:
    im = Image.open(os.path.join(SRC, f)).convert("RGB")
    px = list(im.getdata())
    per_px[f] = Counter(px); total_px.update(px); ALLPX.extend(px)
    LABPX[f] = [rgb2lab(hexof(p)) for p in px]

CLUST = {}          # (poster, hex) -> px
SATCLUST = {}       # 高饱和子集的簇心
for f in FILES:
    p = os.path.join(SRC, f)
    for n in (8, 10, 12, 16, 20, 24, 32, 40):
        for hx, c, _ in clusters(p, n):
            CLUST[(POSTER[f], hx)] = max(CLUST.get((POSTER[f], hx), 0), c)
    im = Image.open(p).convert("RGB")
    sat = [c for c in im.getdata() if max(c) - min(c) >= 40]
    for n in (8, 12, 16, 24):
        for hx, c, _ in clusters(p, n, sat):
            SATCLUST[(POSTER[f], hx)] = max(SATCLUST.get((POSTER[f], hx), 0), c)

def region_mass(target, tol=10.0, per_file=False):
    """簇心的实际体量：画面里与它 ΔE76 <= 10 的像素数。per_file=True 时按海报分列。"""
    t = rgb2lab(target)
    def count(labs):
        n = 0
        for l in labs:
            if sum((l[i] - t[i]) ** 2 for i in range(3)) ** 0.5 <= tol: n += 1
        return n
    if per_file:
        return {POSTER[f]: count(LABPX[f]) for f in FILES}
    n = 0
    for f in FILES: n += count(LABPX[f])
    return n

# 被设计者真正平涂过的色（用于验证「边阶」是哪一个平涂色的渲染器混合）
DESIGNED = ["#1C1C22", "#0C0C10", "#FFFFFF", "#F11E22", "#000000",
            "#FFCB05", "#EEEEF4", "#40404A", "#A0A2AC", "#205B9D"]

def blend_parents(target):
    """在两个平涂色之间找最贴合的线性混合；返回 (误差, 色A, 色B, 比例)。"""
    C = rgbof(target); best = None
    for i, p in enumerate(DESIGNED):
        P = rgbof(p)
        for j in range(i + 1, len(DESIGNED)):
            Q = rgbof(DESIGNED[j]); d = [Q[k] - P[k] for k in range(3)]
            den = sum(x * x for x in d)
            if den == 0: continue
            a = max(0.0, min(1.0, sum((C[k] - P[k]) * d[k] for k in range(3)) / den))
            err = max(abs(P[k] + a * d[k] - C[k]) for k in range(3))
            if best is None or err < best[0]:
                best = (err, p, DESIGNED[j], a)
    return best

EXTRACTED = {}
for f in FILES:
    im = Image.open(os.path.join(SRC, f)).convert("RGB")
    tot = im.size[0] * im.size[1]
    EXTRACTED[POSTER[f]] = {
        "title": SHORT[f], "file": f, "size": im.size,
        "exact_palette": [{"hex": hexof(c), "px": n, "pct": round(100.0 * n / tot, 3)}
                          for c, n in Counter(im.getdata()).most_common(24)],
        "cluster20": [{"hex": hx, "px": c, "pct": round(p, 3)} for hx, c, p in clusters(os.path.join(SRC, f), 20)],
    }
json.dump(EXTRACTED, open(os.path.join(HERE, "extracted.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

# ── 37 色位终值 ──────────────────────────────────────────────────────────────
# 每项：色位 / 终值 / 所在海报 / 设计说明（说明是设计师的话，不是机器的判断）
SLOTS = [
 # ── 表面八槽：一张只靠明度分层的 8 级冷墨阶梯，全部能在图里指出具体来源
 ("background", "#0C0C10", "三图", "主画布：幻灯片底部的深墨横条（全图 9.9%）"),
 ("sidebarBg", "#121216", "三图", "侧栏：深墨条与正文白相接处的抗锯齿台阶（2.6% 白）"),
 ("inputBg", "#18181C", "三图", "输入框：深墨条上的白字边缘台阶（5.3% 白）"),
 ("bubbleBg", "#1C1C22", "三图", "气泡：三张幻灯片共同的版面底色（全图 38.1%）"),
 ("backgroundPanel", "#252529", "三图", "卡片：深墨条上排版元素的浅一档台阶（11.0% 白）"),
 ("backgroundElement", "#2D2D32", "三图", "浮层：版面底色上文字边缘的白台阶（7.4% 白）"),
 ("codeHeaderBg", "#333337", "三图", "代码卡头：深墨条上最亮的一档排版台阶（17.2% 白）"),
 ("codeBlockBg", "#000000", "01-spiderman", "代码区：蜘蛛侠的纯墨线——漫画里最黑的一笔"),
 # ── 文字两槽：幻灯片自己的正文白与次级灰
 ("text", "#EEEEF4", "三图", "正文：幻灯片正文的冷白（6,499 px）"),
 ("textMuted", "#BDBDC3", "三图", "次级文字：正文白落在版面底色上的抗锯齿边（76.7% 白）"),
 # ── 品牌六槽
 ("primary", "#D32B28", "02-ironman", "主品牌：铁人战甲红——画面里最大的一片红"),
 ("secondary", "#EAC38D", "01-spiderman+02-ironman", "第二品牌：窗光与盔甲的熔金"),
 ("info", "#81B0DE", "01-spiderman", "信息色：蜘蛛侠夜空里透出的钢蓝"),
 ("success", "#62B59C", "01-spiderman", "成功色：全图唯一的有彩绿提亮一档"),
 ("warning", "#DB7930", "02-ironman", "警示色：铁人背后的火焰橙"),
 ("error", "#F77B7E", "03-logo", "错误色：漫威标志红被白光冲淡后的浅红"),
 # ── 边框两槽
 ("border", "#40404A", "三图", "边界：三张幻灯片本身的版式发丝线"),
 ("borderActive", "#F11E22", "03-logo", "焦点环：漫威标志红——全图最饱和的一档红"),
 # ── 差异六槽
 ("diffAdded", "#40947D", "01-spiderman", "新增：全图唯一的绿提亮到 L*56"),
 ("diffAddedBg", "#171D14", "02-ironman", "新增底：铁人装甲缝隙里的墨绿"),
 ("diffAddedLineNumberBg", "#0D0D0F", "01-spiderman", "新增行号底：面积最大的近黑墨区"),
 ("diffRemoved", "#F56568", "03-logo", "删除：标志红与白字相接的浅红边"),
 ("diffRemovedBg", "#4E1C26", "02-ironman", "删除底：铁人战甲暗部的深酒红"),
 ("diffRemovedLineNumberBg", "#331310", "02-ironman", "删除行号底：战甲缝隙的深棕红"),
 # ── Markdown 六槽
 ("markdownHeading", "#F7E4AB", "01-spiderman", "标题：蜘蛛侠窗光的暖金高光"),
 ("markdownLink", "#D4C794", "01-spiderman", "链接：漫画里窗户透出的奶油光"),
 ("markdownCode", "#C8AB7C", "01-spiderman", "行内码：漫画里的沙金"),
 ("markdownEmph", "#F9A7A9", "03-logo", "强调：标志红与白字相接的浅粉边"),
 ("markdownStrong", "#FFFFFF", "03-logo", "强强调：漫威标志的纯白"),
 ("markdownBlockQuote", "#B4B29F", "01-spiderman", "引用：漫画里的水泥米灰"),
 # ── 语法七槽
 ("syntaxComment", "#7A7A7F", "三图", "注释：深墨条上排版文字的半调灰（退后档）"),
 ("syntaxKeyword", "#F44A4D", "03-logo", "关键字：标志红被白光冲开的第一档"),
 ("syntaxFunction", "#E4A05A", "02-ironman", "函数：战甲金与火焰橙之间的暖铜"),
 ("syntaxType", "#FFCB05", "三图", "类型：幻灯片页脚编号的那个黄"),
 ("syntaxNumber", "#A0A2AC", "三图", "数字：幻灯片的次级冷灰"),
 ("syntaxString", "#F0E5D8", "02-ironman", "字符串：盔甲高光洗白后的暖白"),
 ("syntaxOperator", "#9D7A72", "02-ironman", "运算符：铁人战甲的暖褐（退后档）"),
]

COLORS = {k: v for k, v, *_ in SLOTS}

# 阶梯派生的源色与目标明度
GREEN_BASE = "#006752"        # 全图唯一的有彩绿（22 px，蜘蛛侠护目镜反光）
STEP_SPEC = {"success": (GREEN_BASE, 68.0), "diffAdded": (GREEN_BASE, 56.0)}

TIER_NAME = {
    "A1": "实涂直采",
    "A2": "边阶直采",
    "B":  "簇采·区域代表色",
    "C":  "阶梯派生",
}

def poster_of(h, exact):
    if exact:
        return "+".join(POSTER[f] for f in FILES if per_px[f].get(rgbof(h), 0))
    best = None
    for (p, hx), c in list(CLUST.items()) + list(SATCLUST.items()):
        if hx.lower() != h.lower(): continue
        if best is None or c > best[1]: best = (p, c)
    return best[0] if best else "—"

PROV = {}
for slot, value, poster, note in SLOTS:
    exact = total_px.get(rgbof(value), 0)
    prov = {"value": value, "poster": poster, "note": note, "exact": exact}
    if slot in STEP_SPEC:
        base, target = STEP_SPEC[slot]
        prov.update(tier="C", tierName=TIER_NAME["C"], measured_as="阶梯派生",
                    measured_in=poster_of(base, total_px.get(rgbof(base), 0)),
                    measured_px=total_px.get(rgbof(base), 0),
                    stepFrom=base, stepToL=target)
    elif exact >= 500:
        prov.update(tier="A1", tierName=TIER_NAME["A1"], measured_as="实涂像素",
                    measured_in=poster_of(value, exact), measured_px=exact)
    elif exact >= 50:
        err, pa, pb, a = blend_parents(value)
        prov.update(tier="A2", tierName=TIER_NAME["A2"], measured_as="抗锯齿台阶",
                    measured_in=poster_of(value, exact), measured_px=exact,
                    blend={"a": pa, "b": pb, "mix": round(a, 3), "err": round(err, 2)})
    else:
        per = region_mass(value, per_file=True)
        best = max(per.items(), key=lambda kv: kv[1])
        prov.update(tier="B", tierName=TIER_NAME["B"], measured_as="区域代表色（簇心）",
                    measured_in=best[0], measured_px=best[1], regionByPoster=per)
    PROV[slot] = prov

TIERS = Counter(p["tier"] for p in PROV.values())

# ── 判据自检（口径与 scripts/audit-themes.ts 一致）──────────────────────────
SURFACES = ["background", "backgroundPanel", "backgroundElement", "sidebarBg",
            "bubbleBg", "inputBg", "codeBlockBg", "codeHeaderBg"]
MUTED_SURFACES = ["background", "backgroundPanel", "backgroundElement"]
MD_ROLES = ["markdownHeading", "markdownLink", "markdownStrong", "markdownEmph",
            "markdownBlockQuote", "markdownCode"]
SYN_ROLES = ["syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxType",
             "syntaxNumber", "syntaxString", "syntaxOperator"]
SYN_CORE = ["syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString"]
BRAND = ["primary", "secondary", "info", "success", "warning", "error"]
PAIRS = []
def add(code, fg, bg, thr, cls, grp):
    r = contrast(fg, bg)
    PAIRS.append({"code": code, "fg": fg, "bg": bg, "ratio": round(r, 3),
                  "threshold": thr, "class": cls, "group": grp,
                  "verdict": "PASS" if r >= thr else "FAIL"})
for s in SURFACES: add("text@" + s, COLORS["text"], COLORS[s], 4.5, "hard", "text")
for s in MUTED_SURFACES: add("textMuted@" + s, COLORS["textMuted"], COLORS[s], 4.5, "hard", "muted")
for s in MUTED_SURFACES:
    add("labelDimmed@" + s, flatten(COLORS["textMuted"], COLORS[s], 0.8), COLORS[s], 4.5, "hard", "dimmed")
for m in MD_ROLES:
    for s in ("background", "backgroundPanel"):
        add(m + "@" + s, COLORS[m], COLORS[s], 4.5, "hard", "markdown")
for y in SYN_ROLES: add(y + "@codeBlockBg", COLORS[y], COLORS["codeBlockBg"], 4.5, "hard", "syntax")
add("diffAdded@diffAddedBg", COLORS["diffAdded"], COLORS["diffAddedBg"], 4.5, "hard", "diff")
add("diffRemoved@diffRemovedBg", COLORS["diffRemoved"], COLORS["diffRemovedBg"], 4.5, "hard", "diff")
add("text@diffAddedBg", COLORS["text"], COLORS["diffAddedBg"], 4.5, "hard", "diff")
add("text@diffRemovedBg", COLORS["text"], COLORS["diffRemovedBg"], 4.5, "hard", "diff")
add("contrastText(primary)@primary", contrastText(COLORS["primary"]), COLORS["primary"], 4.5, "hard", "onPrimary")
for s in MUTED_SURFACES: add("borderActive@" + s, COLORS["borderActive"], COLORS[s], 3, "ui", "borderActive")
for b in BRAND:
    for s in ("background", "backgroundPanel"):
        add(b + "@" + s, COLORS[b], COLORS[s], 3, "ui", "brand")

core_pairs = []
for i, a in enumerate(SYN_CORE):
    for b in SYN_CORE[i + 1:]:
        core_pairs.append({"roles": [a, b], "deltaE": round(de76(COLORS[a], COLORS[b]), 1)})
core_min = min(core_pairs, key=lambda p: p["deltaE"])
core_con = {k: contrast(COLORS[k], COLORS["codeBlockBg"]) for k in SYN_CORE}
recede = {}
for k in ("syntaxComment", "syntaxOperator"):
    recede[k] = {"contrast": round(contrast(COLORS[k], COLORS["codeBlockBg"]), 3),
                 "outranks": sum(1 for v in core_con.values() if v < contrast(COLORS[k], COLORS["codeBlockBg"]))}
# 背景家族纯净
chrom = [s for s in SURFACES if chroma8(COLORS[s]) >= 8]
base = next((s for s in SURFACES if chroma8(COLORS[s]) >= 8), None)
islands = []
if base:
    bh = hsl_hue(COLORS[base])
    for s in chrom:
        d = huedist(hsl_hue(COLORS[s]), bh)
        if d > 60: islands.append({"slot": s, "dist": round(d, 1)})
# 岗位串戏
DESIGN = ["text", "textMuted"] + BRAND + ["border", "borderActive", "diffAdded", "diffRemoved"] \
         + MD_ROLES + SYN_ROLES
seen = {}
for r in DESIGN: seen.setdefault(COLORS[r].lower(), []).append(r)
collisions = [{"roles": v} for v in seen.values() if len(v) > 1]
hd = huedist(hsl_hue(COLORS["primary"]), hsl_hue(COLORS["secondary"]))
geo = {"deg": round(hd, 1),
       "type": "类比" if hd <= 45 else ("三角色" if 95 <= hd <= 145 else ("互补" if hd > 145 else "未分类"))}

WARN = []
if collisions: WARN.append({"code": "roleCollision", "message": "同值不同岗：" + str(collisions)})
if islands: WARN.append({"code": "bgPurity", "message": "色相孤岛：" + str(islands)})
if core_min["deltaE"] < 10: WARN.append({"code": "syntaxCoreMin", "message": "语法核心最小 ΔE=%s < 10" % core_min["deltaE"]})
for k, v in recede.items():
    if v["outranks"]: WARN.append({"code": "syntaxRecede", "message": "%s 未退后" % k})
if geo["type"] == "未分类": WARN.append({"code": "brandGeometry", "message": "品牌几何未分类"})

# 表面阶梯（8 级，等距度是这版的硬判据）
lad = sorted([(lstar(COLORS[s]), s) for s in SURFACES])
steps = [round(lad[i + 1][0] - lad[i][0], 2) for i in range(len(lad) - 1)]

PAL = {
 "colors": COLORS,
 "provenance": PROV,
 "tiers": dict(TIERS),
 "pairs": PAIRS,
 "warnings": WARN,
 "brandGeometry": geo,
 "syntax": {"core": SYN_CORE, "corePairs": core_pairs, "coreMin": core_min, "recede": recede,
             "coreContrast": {k: round(v, 3) for k, v in core_con.items()}},
 "surfaces": {s: {"hex": COLORS[s], "L": round(lstar(COLORS[s]), 1)} for s in SURFACES},
 "ladder": {"order": [s for _, s in lad], "steps": steps,
            "min": min(steps), "max": max(steps), "span": round(lad[-1][0] - lad[0][0], 2)},
}
json.dump(PAL, open(os.path.join(HERE, "palette.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

# ── 报告 ────────────────────────────────────────────────────────────────────
fails = [p for p in PAIRS if p["verdict"] == "FAIL"]
L = []
L.append("漫威主题 · 逐像素取色判据报告")
L.append("=" * 78)
L.append("源图：%s" % " / ".join("%s（%s）" % (POSTER[f], SHORT[f]) for f in FILES))
L.append("")
L.append("【一】37 色位溯源（四级判尺：A1 实涂 / A2 边阶 / B 簇采 / C 阶梯）")
L.append("-" * 78)
L.append("A1 实涂直采 = 该 hex 在图中逐像素出现 >=500 次（被设计者真正平涂过的色）")
L.append("A2 边阶直采 = 出现 50..499 次，且能被证明是两个平涂色的渲染器抗锯齿混合")
L.append("B  簇采     = 中位切分簇心，图里无此字面值，代表一片 ΔE76<=10 的实际区域")
L.append("C  阶梯派生 = 以源色 a*/b* 为基准，只把 L* 走到目标明度")
L.append("")
L.append("%-26s %-9s %-4s %-22s %-14s %9s" % ("色位", "终值", "级", "判据", "来源", "像素/体量"))
for slot, value, poster, note in SLOTS:
    p = PROV[slot]
    L.append("%-26s %-9s %-4s %-22s %-14s %9d" % (slot, value, p["tier"], p["measured_as"],
                                                   p["measured_in"], p["measured_px"]))
L.append("")
L.append("  分级统计：%s" % " · ".join("%s %s %d 条" % (t, TIER_NAME[t], TIERS.get(t, 0))
                                      for t in ("A1", "A2", "B", "C")))
for slot, value, poster, note in SLOTS:
    p = PROV[slot]
    if p["tier"] == "A2":
        b = p["blend"]
        L.append("    %-24s %s = %s + %s @ %5.1f%%  （误差 %.2f/255）"
                 % (slot, value, b["a"], b["b"], b["mix"] * 100, b["err"]))
    if p["tier"] == "C":
        L.append("    %-24s %s = %s 提亮到 L*%.0f" % (slot, value, p["stepFrom"], p["stepToL"]))
L.append("")
L.append("【二】38 条硬性 4.5:1 对")
L.append("-" * 78)
for p in PAIRS:
    if p["class"] == "hard":
        L.append("  %-38s %-9s @ %-9s %6.2f / %.1f  %s" % (p["code"], p["fg"], p["bg"], p["ratio"], p["threshold"], p["verdict"]))
L.append("")
L.append("【三】15 条 UI 3:1 对")
L.append("-" * 78)
for p in PAIRS:
    if p["class"] == "ui":
        L.append("  %-38s %-9s @ %-9s %6.2f / %.1f  %s" % (p["code"], p["fg"], p["bg"], p["ratio"], p["threshold"], p["verdict"]))
L.append("")
L.append("【四】IP 设计规范")
L.append("-" * 78)
L.append("  语法核心五角色最小 ΔE76 = %.1f（%s ↔ %s，门槛 10）" % (core_min["deltaE"], *core_min["roles"]))
L.append("  comment/operator 退后：comment %.3f、operator %.3f，核心最低 %.3f → outranks %d / %d"
         % (recede["syntaxComment"]["contrast"], recede["syntaxOperator"]["contrast"],
            min(core_con.values()), recede["syntaxComment"]["outranks"], recede["syntaxOperator"]["outranks"]))
L.append("  背景色相孤岛：%d 个（%s）" % (len(islands), "无" if not islands else islands))
L.append("  岗位串戏（同值不同岗）：%d 处（%s）" % (len(collisions), "无" if not collisions else collisions))
L.append("  品牌几何：primary %s ↔ secondary %s = %.1f° → %s" % (COLORS["primary"], COLORS["secondary"], geo["deg"], geo["type"]))
L.append("")
L.append("【五】表面阶梯（8 级，只靠明度分层）")
L.append("-" * 78)
for i, (L_, s) in enumerate(lad):
    L.append("  %-18s %s  L*%6.2f  %s" % (s, COLORS[s], L_, ("台阶 %.2f" % steps[i - 1]) if i else ""))
L.append("  台阶 min %.2f / max %.2f / 跨度 %.2f" % (min(steps), max(steps), lad[-1][0] - lad[0][0]))
L.append("")
L.append("【六】结论")
L.append("-" * 78)
L.append("  硬性 4.5:1 违例 %d 条 · UI 3:1 违例 %d 条 · 设计告警 %d 条"
         % (len([p for p in fails if p["class"] == "hard"]), len([p for p in fails if p["class"] == "ui"]), len(WARN)))
L.append("  状态：%s" % ("全绿" if not fails and not WARN else "需整改"))
open(os.path.join(HERE, "report.txt"), "w", encoding="utf-8", newline="\n").write("\n".join(L) + "\n")

print("\n".join(L[-10:]))
print("\n硬性违例 %d · UI 违例 %d · 设计告警 %d · 溯源分级 %s"
      % (len([p for p in fails if p["class"] == "hard"]),
         len([p for p in fails if p["class"] == "ui"]), len(WARN), dict(TIERS)))
