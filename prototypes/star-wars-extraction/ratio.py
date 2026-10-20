# -*- coding: utf-8 -*-
"""配比审计：从仓库自己的 map-dsh.ts 里数出「每个色位驱动多少个 DSH 变量」，
再按色相把 37 个色位归入阵营，算出红刃 / 蓝刃的着色权重比。
读 palette.json + src/engine/map-dsh.ts；不写仓库任何文件。"""
import json
import os
import re
from collections import OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
MAP = os.path.join(ROOT, "src", "engine", "map-dsh.ts")
PAL = json.load(open(os.path.join(HERE, "palette.json"), encoding="utf-8"))
C = PAL["colors"]

# ── 1. 解析 map-dsh.ts：静态直配 + 派生 token + markdown CSS 规则 ──
src = open(MAP, encoding="utf-8").read()
static = re.findall(r"\['(--[a-z0-9-]+)',\s*'([A-Za-z_][A-Za-z0-9_]*)'\]", src)
derived = re.findall(r"\['(--[a-z0-9-]+)',\s*\(c\)\s*=>\s*([^\]]+)\]", src)
mdrules = re.findall(r"from:\s*'([A-Za-z_][A-Za-z0-9_]*)'", src)

# 权重：填充类（fill/bg/accent 底）算 2（着色面积），线/字类算 1
def alias_weight(name):
    if re.search(r"fill|bg|tertiary|dimmed|hover|accent|active", name):
        return 2
    return 1


weight = OrderedDict()
alias_map = OrderedDict()
for name, slot in static:
    weight[slot] = weight.get(slot, 0) + alias_weight(name)
    alias_map.setdefault(slot, []).append(name)
for name, expr in derived:
    for slot in re.findall(r"c\.([A-Za-z_][A-Za-z0-9_]*)", expr):
        if slot in C:
            weight[slot] = weight.get(slot, 0) + alias_weight(name)
            alias_map.setdefault(slot, []).append(name + " (derived)")
# markdown 的 CSS 规则（h1-h6 / a / code / em / strong / blockquote）也算落点
for slot in mdrules:
    if slot in C:
        weight[slot] = weight.get(slot, 0) + 1
        alias_map.setdefault(slot, []).append("markdown 规则")

# ── 2. 归营 ──
def hex2hsl(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    d = mx - mn
    if d == 0:
        return 0.0, 0.0
    s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
    if mx == r:
        hh = ((g - b) / d) % 6
    elif mx == g:
        hh = (b - r) / d + 2
    else:
        hh = (r - g) / d + 4
    return hh * 60, s * 100


STAGE = {"background", "backgroundPanel", "backgroundElement", "sidebarBg", "bubbleBg",
         "inputBg", "codeBlockBg", "codeHeaderBg", "border"}


def camp(hexv, slot=None):
    h, s = hex2hsl(hexv)
    r, g, b = (int(hexv.lstrip("#")[i:i + 2], 16) / 255 for i in (0, 2, 4))
    l = (max(r, g, b) + min(r, g, b)) / 2
    if slot in STAGE:
        return "场域"
    if l > 0.85 or s < 16:
        return "墨"
    if h >= 330 or h < 18:
        return "红刃"
    if 18 <= h < 55:
        return "金"
    if 55 <= h < 130:
        return "黄绿"
    if 130 <= h < 185:
        return "绿剑"
    if 185 <= h < 200:
        return "青"
    if 200 <= h < 265:
        return "蓝刃"
    if 265 <= h < 330:
        return "紫"
    return "墨"


# ── 3. 统计 ──
rows = []
camp_w = OrderedDict()
for slot, hexv in C.items():
    cp = camp(hexv, slot)
    w = weight.get(slot, 0)
    rows.append((slot, hexv, cp, w, alias_map.get(slot, [])))
    if cp not in ("场域", "墨"):
        camp_w[cp] = camp_w.get(cp, 0) + w

total = sum(camp_w.values())
red = camp_w.get("红刃", 0)
blue = camp_w.get("蓝刃", 0) + camp_w.get("青", 0) + camp_w.get("紫", 0)

print("=" * 88)
print("配比审计 · 星球大战（权重 = 该色位驱动的 DSH 变量数，填充类 ×2）")
print("=" * 88)
for slot, hexv, cp, w, al in sorted(rows, key=lambda r: -r[3]):
    if w == 0:
        continue
    print("  %-24s %s  %-4s  w=%-3d  %s" % (slot, hexv, cp, w, ", ".join(al[:4])))
print()
print("  阵营权重（只算「着色岗位」，场域与墨不计入）：")
for k, v in sorted(camp_w.items(), key=lambda x: -x[1]):
    print("    %-6s %3d  (%.1f%%)" % (k, v, v * 100.0 / total))
print()
print("  红刃 %d  :  蓝刃 %d   →  红 %.0f%% / 蓝 %.0f%%" % (
    red, blue, red * 100.0 / (red + blue), blue * 100.0 / (red + blue)))
print("  差值 %.1f%%（越小越接近对分）" % (abs(red - blue) * 100.0 / (red + blue)))
print("  注脚：金 %d + 绿剑 %d = %.1f%%（其余为场域与墨）" % (
    camp_w.get("金", 0), camp_w.get("绿剑", 0),
    (camp_w.get("金", 0) + camp_w.get("绿剑", 0)) * 100.0 / total))

out = {
    "rows": [{"slot": s, "hex": h, "camp": c, "weight": w, "aliases": a} for s, h, c, w, a in rows],
    "campWeight": camp_w,
    "red": red, "blue": blue,
    "redPct": round(red * 100.0 / (red + blue), 1),
    "bluePct": round(blue * 100.0 / (red + blue), 1),
}
with open(os.path.join(HERE, "ratio.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print("\nwritten:", os.path.join(HERE, "ratio.json"))
