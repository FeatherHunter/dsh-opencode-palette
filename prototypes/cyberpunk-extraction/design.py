# -*- coding: utf-8 -*-
"""③ 设计与判尺：37 色位终值 + 判尺复算 + 语料约束搜索（把某个色位换成语料里
既字面存在、又满足判尺的那一个像素）。→ palette.json"""
import itertools, json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cp_core import (P, C, PROV, CN, ORDER, IMAGES, FILES, PKG, cr, lum, deltaE76,
                     to_hsl, hue_distance, contrast_text, judge, with_alpha)

def rgb_of(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)], dtype=np.int16)
def hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(axis=-1), a.min(axis=-1); d = mx - mn
    h = np.zeros_like(mx)
    m = (mx == r) & (d > 0); h[m] = ((g - b)[m] / d[m]) % 6
    m = (mx == g) & (d > 0); h[m] = ((b - r)[m] / d[m]) + 2
    m = (mx == b) & (d > 0); h[m] = ((r - g)[m] / d[m]) + 4
    h = h * 60.0
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return h, s, mx
def step(parent, tv):
    """同色相同饱和、明度阶到 tv"""
    c = rgb_of(parent) / 255.0
    h, s, _ = hsv(c[None, :]); h, s = float(h[0]), float(s[0])
    Cc = tv * s; X = Cc * (1 - abs((h / 60) % 2 - 1))
    if h < 60: v = (Cc + X, X, 0)
    elif h < 120: v = (X, Cc, 0)
    elif h < 180: v = (0, Cc, X)
    elif h < 240: v = (0, X, Cc)
    elif h < 300: v = (X, 0, Cc)
    else: v = (Cc, 0, X)
    m = tv - Cc
    return "#" + "".join("%02X" % int(round(x * 255)) for x in (v[0]+m, v[1]+m, v[2]+m))
def mix(a, b, k=0.5):
    ra, rb = rgb_of(a), rgb_of(b)
    return "#" + "".join("%02X" % int(x) for x in np.round(ra + (rb - ra) * k).astype(int))
def hue_of(h): return float(hsv((rgb_of(h) / 255.0)[None, :])[0][0])

CORPUS = np.concatenate([
    np.asarray(Image.open(os.path.join(IMAGES, f)).convert("RGB")).astype(np.int16).reshape(-1, 3)
    for f in FILES], axis=0)
UNIQ, INV = np.unique(CORPUS, axis=0, return_inverse=True)
COUNTS = np.bincount(INV, minlength=len(UNIQ))

def literal_candidates(hue_lo, hue_hi, sat_lo, sat_hi, contrast_lo, contrast_hi, code_bg, vs):
    """在语料里找：字面像素 + 色相带内 + 落在对比度带内 + 与给定角色 ΔE 拉开。"""
    u = UNIQ / 255.0
    mx, mn = u.max(axis=1), u.min(axis=1); dd = mx - mn
    hue = np.zeros(len(u))
    m = (mx == u[:, 0]) & (dd > 0); hue[m] = ((u[m, 1]-u[m, 2])/dd[m]) % 6
    m = (mx == u[:, 1]) & (dd > 0); hue[m] = ((u[m, 2]-u[m, 0])/dd[m]) + 2
    m = (mx == u[:, 2]) & (dd > 0); hue[m] = ((u[m, 0]-u[m, 1])/dd[m]) + 4
    hue *= 60.0
    sat = np.where(mx > 0, dd/np.maximum(mx, 1e-6), 0)
    out = []
    for i, c in enumerate(UNIQ):
        hx = "#" + "".join("%02X" % int(v) for v in c)
        if hx in C.values(): continue
        if not (hue_lo <= hue[i] <= hue_hi): continue
        if not (sat_lo <= sat[i] <= sat_hi): continue
        r = cr(hx, code_bg)
        if not (contrast_lo <= r <= contrast_hi): continue
        if any(deltaE76(hx, C[v]) < 10 for v in vs): continue
        out.append((int(COUNTS[i]), hx, r, float(hue[i])))
    out.sort(key=lambda t: (-t[0], -t[2]))
    return out

pal = dict(C)
CORE = ["syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString"]
ALL_ROLES = [k for k in C if k not in ("background", "backgroundPanel", "backgroundElement",
             "sidebarBg", "bubbleBg", "inputBg", "codeBlockBg", "codeHeaderBg",
             "diffAddedBg", "diffRemovedBg", "diffAddedLineNumberBg", "diffRemovedLineNumberBg")]

def corpus_index():
    u = UNIQ / 255.0
    mx, mn = u.max(axis=1), u.min(axis=1); dd = mx - mn
    hue = np.zeros(len(u))
    m = (mx == u[:, 0]) & (dd > 0); hue[m] = ((u[m, 1]-u[m, 2])/dd[m]) % 6
    m = (mx == u[:, 1]) & (dd > 0); hue[m] = ((u[m, 2]-u[m, 0])/dd[m]) + 2
    m = (mx == u[:, 2]) & (dd > 0); hue[m] = ((u[m, 0]-u[m, 1])/dd[m]) + 4
    hue *= 60.0
    sat = np.where(mx > 0, dd/np.maximum(mx, 1e-6), 0)
    val = mx
    return hue, sat, val

HUE, SAT, VAL = corpus_index()

def search(hue_lo, hue_hi, sat_lo, sat_hi, val_lo, val_hi, bg, ratio_lo, ratio_hi, vs):
    """语料约束搜索：字面像素 + 色相/饱和/明度带 + 对比度带 + 与 vs 各角色 ΔE76 ≥ 10。
    排序：全库出现次数多的优先（同色相族里最「成片」的那个），其次对比度高者。"""
    out = []
    for i, c in enumerate(UNIQ):
        hx = "#" + "".join("%02X" % int(v) for v in c)
        if hx in pal.values(): continue
        if not (hue_lo <= HUE[i] <= hue_hi): continue
        if not (sat_lo <= SAT[i] <= sat_hi): continue
        if not (val_lo <= VAL[i] <= val_hi): continue
        r = cr(hx, bg)
        if not (ratio_lo <= r <= ratio_hi): continue
        if any(deltaE76(hx, pal[v]) < 10 for v in vs): continue
        out.append((int(COUNTS[i]), hx, r, float(HUE[i])))
    out.sort(key=lambda t: (-t[0], -t[2]))
    return out

print("── 语料约束搜索 ──")
# ① syntaxType：领口青暗面（青绿带），与核心五其余四拉开，且要留出退后带
cands = search(150, 205, 0.18, 0.62, 0.22, 0.62, pal["codeBlockBg"], 5.30, 9.0,
               [k for k in CORE if k != "syntaxType"] + ["markdownBlockQuote", "info"])
if cands:
    pal["syntaxType"] = cands[0][1]
    print("  syntaxType    → %s（全库 %d px，code 底 %.2f:1）" % (cands[0][1], cands[0][0], cands[0][2]))
# ② markdownEmph：暖色相带、页面底 10.8~13.4（比正文亮、比粗体暗）、与全部设计角色拉开
cands = search(25, 50, 0.10, 0.60, 0.30, 0.95, pal["background"], 10.8, 13.4,
               [k for k in ALL_ROLES if k != "markdownEmph"])
if cands:
    pal["markdownEmph"] = cands[0][1]
    print("  markdownEmph  → %s（全库 %d px，页面底 %.2f:1）" % (cands[0][1], cands[0][0], cands[0][2]))
# ③ syntaxOperator：冷端、落在退后带 [4.50, 核心五最弱]、与注释/类型/引用全部拉开
band_hi = min(cr(pal[k], pal["codeBlockBg"]) for k in CORE)
cands = search(200, 250, 0.05, 0.30, 0.15, 0.75, pal["codeBlockBg"], 4.5, band_hi,
               ["syntaxComment", "syntaxType", "markdownBlockQuote"])
if cands:
    best = max(cands, key=lambda t: min(deltaE76(t[1], pal["syntaxComment"]),
                                            deltaE76(t[1], pal["syntaxType"]),
                                            deltaE76(t[1], pal["markdownBlockQuote"])))
    pal["syntaxOperator"] = best[1]
    print("  syntaxOperator→ %s（全库 %d px，code 底 %.2f:1，退后带上沿 %.2f）"
          % (best[1], best[0], best[2], band_hi))

fails, warns, core_cr = judge(pal)
print("\n── 判尺 ──")
print("  硬性/UI 违例 %d %s" % (len(fails), fails))
print("  设计告警   %d %s" % (len(warns), warns))
print("  核心五最弱 %.2f · comment %.2f operator %.2f" % (
    min(core_cr.values()), cr(pal["syntaxComment"], pal["codeBlockBg"]),
    cr(pal["syntaxOperator"], pal["codeBlockBg"])))
print("\n── 墨色阶梯（页面底 %s）" % pal["background"])
for k, n in [("markdownHeading", "标题"), ("markdownStrong", "粗体"), ("markdownEmph", "斜体"),
             ("markdownCode", "行内码"), ("markdownLink", "链接"), ("text", "正文"),
             ("textMuted", "次要"), ("markdownBlockQuote", "引用")]:
    print("  %-6s %-20s %s  %5.2f:1" % (n, k, pal[k], cr(pal[k], pal["background"])))

# 语料约束搜索命中的三槽：父色 = 搜索结果本身（它们是直采，不是派生）
prov = {k: {"rule": PROV[k][0], "anchors": list(PROV[k][1]), "note": PROV[k][2]}
        for k in ORDER}
for _k in ("syntaxType", "markdownEmph", "syntaxOperator"):
    prov[_k]["anchors"] = [pal[_k]]
    prov[_k]["note"] = PROV[_k][2] + "（语料约束搜索：字面像素 + 判尺约束下的唯一解）"

out = {"colors": pal, "provenance": {k: {"rule": prov[k]["rule"], "anchors": prov[k]["anchors"],
                                        "note": prov[k]["note"], "name": CN.get(k, "")} for k in ORDER},
       "judge": {"hardFails": len(fails), "warnings": warns,
                 "coreMin": round(min(deltaE76(pal[a], pal[b]) for a, b in itertools.combinations(
                     ["syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString"], 2)), 1)}}
json.dump(out, open(os.path.join(PKG, "palette.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("\n→ palette.json")
sys.exit(1 if fails else 0)
