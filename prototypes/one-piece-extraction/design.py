# -*- coding: utf-8 -*-
"""design.py — 「海贼王 · 正午海风」37 色位：图上取色 → 配方 → 机器校验。

铁律：37 个色位全部是参考图锚点的线性混合（recipe 可回溯到像素坐标），
再由 scripts/audit-themes.ts 的规则复核：硬性 4.5 / UI 3.0 / 背景色相家族 /
角色不串戏 / 品牌几何 / 语法 ΔE76 / 语法退后。
"""
import json, os, math, colorsys
import numpy as np
from PIL import Image

SRC = r"C:\Users\辰辰洋洋\Pictures\海贼王"
OUT = r"D:\dsh-plugin\dsh-opencode-palette\prototypes\one-piece-extraction"

# ═════════ 1. 锚点（区域 + 色相窗口内取像素） ═════════
TARGETS = [
    ("sky_deep",   "images.jpg", (470, 0, 597, 90),   (195, 225), "sat_top", "晴空浓蓝"),
    ("sky_soft",   "images.jpg", (0, 0, 200, 120),    (195, 225), "sat_top", "晴空薄蓝"),
    ("sky_pale",   "images.jpg", (0, 120, 130, 240),  (190, 220), "low_sat", "云边淡蓝"),
    ("cloud",      "images.jpg", (0, 250, 120, 335),  (0, 360),   "light",  "积云白"),
    ("hat_lit",    "images.jpg", (215, 0, 430, 110),  (25, 50),   "light",  "草帽受光"),
    ("hat_shade",  "images.jpg", (215, 0, 430, 110),  (25, 50),   "dark",   "草帽阴影"),
    ("hat_brown",  "images.jpg", (215, 0, 430, 110),  (20, 45),   "median", "草帽棕"),
    ("skin",       "images.jpg", (60, 100, 220, 240), (15, 40),   "median", "手臂肤色"),
    ("vest_red",   "images.jpg", (230, 195, 400, 335),(340, 20),  "sat_top", "路飞背心红"),
    ("hair",       "images.jpg", (215, 55, 420, 150), (0, 360),   "dark",   "黑发"),
    ("teeth",      "images.jpg", (270, 150, 340, 190),(0, 360),   "light",  "牙齿白"),
    ("sea_deep",   "2.jpg", (0, 300, 200, 414),      (205, 225), "dark",   "深海海底"),
    ("logo_blue",  "2.jpg", (230, 140, 620, 250),    (200, 220), "median", "标志字蓝"),
    ("lagoon",     "2.jpg", (250, 60, 560, 135),    (185, 200), "sat_top", "潟湖青"),
    ("sky_green",  "2.jpg", (500, 60, 700, 160),     (80, 160),  "median", "天际浅绿"),
    ("red_figure", "2.jpg", (405, 125, 470, 250),    (340, 20),  "sat_top", "标志红人"),
    ("hat_gold",   "2.jpg", (100, 120, 250, 200),    (40, 62),   "sat_top", "标志草帽金"),
    ("anchor",     "2.jpg", (615, 200, 700, 270),    (15, 45),   "median", "船锚棕"),
    ("p_sand",     "3.jpg", (0, 340, 280, 420),      (40, 70),   "median", "沙滩米"),
    ("p_green",    "3.jpg", (15, 170, 75, 340),      (90, 170),  "median", "索隆绿"),
    ("p_orange",   "3.jpg", (225, 130, 270, 200),    (15, 45),   "sat_top", "娜美橙"),
    ("p_balloon",  "3.jpg", (100, 45, 155, 95),      (340, 20),  "median", "BIG 红气球"),
    ("p_navy",     "3.jpg", (85, 160, 135, 210),     (200, 230), "dark",   "乌索普藏青"),
]


def hexs(rgb):
    return "#%02X%02X%02X" % tuple(int(round(max(0, min(255, v)))) for v in rgb)


def rgb_of(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=float)


A = {}
for key, f, (x0, y0, x1, y1), hr, mode, name in TARGETS:
    arr = np.asarray(Image.open(os.path.join(SRC, f)).convert("RGB")).astype(float)
    sub = arr[y0:y1, x0:x1].reshape(-1, 3)
    hsv = np.array([colorsys.rgb_to_hsv(*(v / 255.0)) for v in sub])
    hue, sat, val = hsv[:, 0] * 360, hsv[:, 1], hsv[:, 2]
    m = ((hue >= hr[0]) & (hue <= hr[1])) if hr[0] <= hr[1] else ((hue >= hr[0]) | (hue <= hr[1]))
    cand, cs, cv = sub[m], sat[m], val[m]
    if len(cand) < 20:
        cand, cs, cv = sub, sat, val
    if mode == "sat_top":
        sel = cand[cs >= np.quantile(cs, 0.88)]
    elif mode == "dark":
        sel = cand[cv <= np.quantile(cv, 0.12)]
    elif mode == "light":
        sel = cand[cv >= np.quantile(cv, 0.90)]
    elif mode == "low_sat":
        sel = cand[cs <= np.quantile(cs, 0.25)]
    else:
        sel = cand
    A[key] = dict(hex=hexs(np.median(sel, axis=0)), file=f, name=name,
                  rect=[x0, y0, x1, y1], hue=hr, mode=mode, n=int(len(cand)))

# k-means 簇中心锚点（同样取自像素，非手写）
A["navy_shadow"] = dict(hex="#183B68", file="2.jpg", name="标志字内阴影·海军蓝",
                        rect=[230, 140, 620, 250], hue=[213.8, 225], mode="kmeans簇", n=5839)

# ═════════ 2. 37 色位配方 ═════════
RECIPE = {
    # ── 场：晴空蓝家族，一条色相只拉开度（越深＝越往海里） ──
    "inputBg":             ("输入框 · 云白天",          {"cloud": 0.62, "teeth": 0.38}),
    "bubbleBg":            ("气泡 · 云与淡蓝之间",      {"cloud": 0.72, "sky_pale": 0.28}),
    "background":          ("主场 · 云边淡蓝",          {"sky_pale": 0.56, "cloud": 0.44}),
    "backgroundPanel":     ("面板 · 淡蓝",              {"sky_pale": 0.88, "sky_soft": 0.12}),
    "sidebarBg":           ("侧栏 · 晴空蓝",            {"sky_pale": 0.80, "sky_soft": 0.20}),
    "codeBlockBg":         ("代码舞台 · 日光浅海纸面",  {"sky_pale": 0.68, "sky_soft": 0.32}),
    "backgroundElement":   ("浮层 · 更深一档的海",      {"sky_pale": 0.52, "sky_soft": 0.48}),
    "codeHeaderBg":        ("舞台顶栏 · 压边盖板",      {"sky_pale": 0.44, "sky_soft": 0.56}),

    # ── 字 ──
    "text":                ("正文 · 深海墨蓝",          {"navy_shadow": 0.55, "p_navy": 0.45}),
    "textMuted":           ("次级文字 · 远海退色",      {"navy_shadow": 0.85, "p_navy": 0.15}),

    # ── 品牌 / 语义 ──
    "primary":             ("主色 · 草帽红缎带",        {"vest_red": 1.0}),
    "secondary":           ("副色 · 深麦秆金",          {"hat_gold": 0.12, "hat_shade": 0.88}),
    "info":                ("提示 · 潟湖海流蓝",        {"lagoon": 0.30, "navy_shadow": 0.70}),
    "success":             ("成功 · 索隆三刀绿",        {"p_green": 0.88, "p_navy": 0.12}),
    "warning":             ("警告 · 娜美蜜柑橙",        {"p_orange": 0.80, "p_navy": 0.20}),
    "error":               ("错误 · 赤犬岩浆红",        {"vest_red": 0.30, "red_figure": 0.70}),

    # ── 描边 ──
    "border":              ("分隔线 · 海图浅水色",      {"sky_pale": 0.78, "sky_soft": 0.22}),
    "borderActive":        ("焦点环 · 麦秆暗档",        {"hat_gold": 0.14, "hat_shade": 0.42, "anchor": 0.44}),

    # ── diff ──
    "diffAdded":           ("新增 · 索隆绿·暗一档",     {"p_green": 0.72, "p_navy": 0.28}),
    "diffAddedBg":         ("新增底 · 麦色沙纸",        {"p_sand": 0.58, "cloud": 0.42}),
    "diffAddedLineNumberBg": ("新增行号底 · 沙纸",     {"p_sand": 0.48, "sky_soft": 0.12, "cloud": 0.40}),
    "diffRemoved":         ("删除 · 沉船锈红",          {"vest_red": 0.40, "p_navy": 0.60}),
    "diffRemovedBg":       ("删除底 · 浅珊瑚",          {"vest_red": 0.09, "cloud": 0.91}),
    "diffRemovedLineNumberBg": ("删除行号底 · 珊瑚",    {"vest_red": 0.14, "cloud": 0.86}),

    # ── markdown ──
    "markdownHeading":     ("标题 · 草帽红深一档",      {"vest_red": 0.75, "red_figure": 0.25}),
    "markdownLink":        ("链接 · 航线蓝",            {"sea_deep": 0.55, "navy_shadow": 0.45}),
    "markdownCode":        ("行内码 · 潟湖青",          {"lagoon": 0.36, "p_navy": 0.64}),
    "markdownEmph":        ("强调 · 娜美橙·深一档",     {"p_orange": 0.60, "p_navy": 0.40}),
    "markdownStrong":      ("加重 · 墨线加粗（近黑）",  {"p_navy": 0.60, "hair": 0.40}),
    "markdownBlockQuote":  ("引用 · 海图边注",          {"navy_shadow": 0.72, "sky_soft": 0.28}),

    # ── syntax：浅底 → 七色深墨 ──
    "syntaxKeyword":       ("关键字 · 赤犬岩浆红",      {"vest_red": 0.55, "red_figure": 0.45}),
    "syntaxFunction":      ("函数 · 深麦秆金",          {"hat_gold": 0.08, "hat_shade": 0.42, "anchor": 0.32, "p_navy": 0.18}),
    "syntaxType":          ("类型 · 深天蓝",            {"sea_deep": 0.30, "navy_shadow": 0.70}),
    "syntaxNumber":        ("数字 · 娜美橙·再深一档",   {"p_orange": 0.45, "p_navy": 0.55}),
    "syntaxString":        ("字符串 · 可可亚草叶绿",    {"p_green": 0.58, "p_navy": 0.42}),
    "syntaxComment":       ("注释 · 海图雾灰",          {"navy_shadow": 0.50, "sky_soft": 0.28, "anchor": 0.22}),
    "syntaxOperator":      ("运算符 · 船锚钢灰（暖）",  {"anchor": 0.20, "hat_shade": 0.60, "navy_shadow": 0.20}),
}

# ═════════ 3. 混合 + 校验 ═════════
def chan_lin(v):
    s = v / 255.0
    return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4


def lum(rgb):
    return 0.2126 * chan_lin(rgb[0]) + 0.7152 * chan_lin(rgb[1]) + 0.0722 * chan_lin(rgb[2])


def ratio(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def alpha_blend(fg, bg, a):
    return fg * a + bg * (1 - a)


def hue_deg(rgb):
    r, g, b = [v / 255 for v in rgb]
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d == 0:
        return 0.0
    if mx == r:
        h = 60 * (((g - b) / d) % 6)
    elif mx == g:
        h = 60 * ((b - r) / d + 2)
    else:
        h = 60 * ((r - g) / d + 4)
    return h


def chroma(rgb):
    return int(max(rgb) - min(rgb))


def lab(rgb):
    def f(t):
        return t ** (1 / 3) if t > 216 / 24389 else (841 / 108) * t + 4 / 29
    r, g, b = [chan_lin(v) for v in rgb]
    X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    fx, fy, fz = f(X), f(Y), f(Z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def de76(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(lab(a), lab(b))))


cols, prov = {}, {}
for slot, (desc, rec) in RECIPE.items():
    acc = np.zeros(3)
    for k, w in rec.items():
        acc += rgb_of(A[k]["hex"]) * w
    cols[slot] = hexs(acc)
    prov[slot] = dict(desc=desc, recipe={k: (w, A[k]["hex"], A[k]["name"], A[k]["file"]) for k, w in rec.items()})

v = {k: rgb_of(h) for k, h in cols.items()}
errs, warns, hard, ui = [], [], [], []

for s in ["background", "backgroundPanel", "backgroundElement", "sidebarBg", "bubbleBg",
          "inputBg", "codeBlockBg", "codeHeaderBg"]:
    hard.append((f"text@{s}", ratio(v["text"], v[s]), 4.5))
for s in ["background", "backgroundPanel", "backgroundElement"]:
    hard.append((f"textMuted@{s}", ratio(v["textMuted"], v[s]), 4.5))
    dd = alpha_blend(v["textMuted"], v[s], 0.8)
    hard.append((f"labelDimmed@{s}", ratio(dd, v[s]), 4.5))
for s in ["background", "backgroundPanel"]:
    for m in ["markdownHeading", "markdownLink", "markdownCode", "markdownEmph",
              "markdownStrong", "markdownBlockQuote"]:
        hard.append((f"{m}@{s}", ratio(v[m], v[s]), 4.5))
for sy in ["syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxType",
           "syntaxNumber", "syntaxString", "syntaxOperator"]:
    hard.append((f"{sy}@codeBlockBg", ratio(v[sy], v["codeBlockBg"]), 4.5))
hard.append(("diffAdded@diffAddedBg", ratio(v["diffAdded"], v["diffAddedBg"]), 4.5))
hard.append(("diffRemoved@diffRemovedBg", ratio(v["diffRemoved"], v["diffRemovedBg"]), 4.5))
hard.append(("text@diffAddedBg", ratio(v["text"], v["diffAddedBg"]), 4.5))
hard.append(("text@diffRemovedBg", ratio(v["text"], v["diffRemovedBg"]), 4.5))
luma = (0.299 * v["primary"][0] + 0.587 * v["primary"][1] + 0.114 * v["primary"][2]) / 255
ct = rgb_of("#141414") if luma > 0.6 else rgb_of("#F4F4F5")
hard.append(("contrastText(primary)@primary", ratio(ct, v["primary"]), 4.5))

for s in ["background", "backgroundPanel", "backgroundElement"]:
    ui.append((f"borderActive@{s}", ratio(v["borderActive"], v[s]), 3.0))
for c in ["primary", "secondary", "info", "success", "warning", "error"]:
    for s in ["background", "backgroundPanel"]:
        ui.append((f"{c}@{s}", ratio(v[c], v[s]), 3.0))

for n, r, t in hard:
    if r < t:
        errs.append(f"[硬性 4.5] {n} = {r:.2f}")
for n, r, t in ui:
    if r < t:
        errs.append(f"[UI 3.0] {n} = {r:.2f}")

SURF = ["background", "backgroundPanel", "backgroundElement", "sidebarBg", "bubbleBg",
        "inputBg", "codeBlockBg", "codeHeaderBg"]
colored = [s for s in SURF if chroma(v[s]) >= 8]
base_h = hue_deg(v["background"]) if chroma(v["background"]) >= 8 else hue_deg(v[colored[0]])
for s in colored:
    d = abs(hue_deg(v[s]) - base_h)
    d = min(d, 360 - d)
    if d > 60:
        warns.append(f"[色相孤岛] {s} 偏离基相 {d:.0f}°")

ROLES = ["text", "textMuted", "primary", "secondary", "info", "success", "warning", "error",
         "border", "borderActive", "diffAdded", "diffRemoved",
         "markdownHeading", "markdownLink", "markdownCode", "markdownEmph",
         "markdownStrong", "markdownBlockQuote",
         "syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxType",
         "syntaxNumber", "syntaxString", "syntaxOperator"]
seen = {}
for r_ in ROLES:
    seen.setdefault(cols[r_].upper(), []).append(r_)
for hx, rs in seen.items():
    if len(rs) > 1:
        warns.append(f"[角色碰撞] {hx} ← {rs}")

dh = abs(hue_deg(v["primary"]) - hue_deg(v["secondary"]))
dh = min(dh, 360 - dh)
geo = ("类比 %.1f°" if dh <= 45 else "三角 %.1f°" if 95 <= dh <= 145 else "互补 %.1f°" if dh > 145 else "未分类 %.1f°") % dh
if not (dh <= 45 or 95 <= dh <= 145 or dh > 145):
    warns.append(f"[品牌几何] {geo}")
core = ["syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString"]
mind = 99
for i in range(len(core)):
    for j in range(i + 1, len(core)):
        d = de76(v[core[i]], v[core[j]])
        mind = min(mind, d)
        if d < 10:
            warns.append(f"[语法 ΔE76] {core[i]}×{core[j]} = {d:.1f}")
core_min = min(ratio(v[c], v["codeBlockBg"]) for c in core)
for c in ["syntaxComment", "syntaxOperator"]:
    r = ratio(v[c], v["codeBlockBg"])
    if r > core_min + 1e-9:
        warns.append(f"[语法退后] {c} = {r:.2f} > 核心最低 {core_min:.2f}")
if cols["diffAddedBg"].upper() == cols["diffRemovedBg"].upper():
    errs.append("[diff] 两 diff 底同值")
if cols["diffAddedLineNumberBg"].upper() == cols["diffRemovedLineNumberBg"].upper():
    errs.append("[diff] 两 diff 行号底同值")

print("═══ 海贼王 · 正午海风 · 37 色位 ═══")
for k in RECIPE:
    print(f"  {k:26s} {cols[k]}  L={lum(rgb_of(cols[k])):.4f}  H={hue_deg(rgb_of(cols[k])):5.1f}  {prov[k]['desc']}")
print(f"\n品牌几何 {geo}｜核心语法最低对比 {core_min:.2f}｜核心语法最小 ΔE76 {mind:.1f}")
print(f"硬性 {len(hard)} 对违例 {sum(1 for n,r,t in hard if r<t)}｜UI {len(ui)} 对违例 {sum(1 for n,r,t in ui if r<t)}")
print("✅ 硬性 + UI 全部通过" if not errs else "\n❌ " + "\n".join("   " + e for e in errs))
print("✅ 设计规范零告警" if not warns else "\n⚠️\n" + "\n".join("   " + w for w in warns))
print("\n最紧 8 条：")
for n, r, t in sorted(hard + ui, key=lambda x: x[1] - x[2])[:8]:
    print(f"   {n:40s} {r:6.2f} / {t}   余量 {r-t:+.2f}")

json.dump({"colors": cols, "anchors": A, "provenance": prov, "errors": errs,
           "warnings": warns, "geometry": geo,
           "hard": [[n, round(r, 3), t] for n, r, t in hard],
           "ui": [[n, round(r, 3), t] for n, r, t in ui]},
          open(os.path.join(OUT, "palette.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("\nwrote palette.json")
