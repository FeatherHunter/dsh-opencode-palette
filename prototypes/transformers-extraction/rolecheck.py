# -*- coding: utf-8 -*-
"""rolecheck.py — 逐岗位求证：哪些像素既「在图上成片」又「当得起这个岗位」。

对每个岗位窗口输出：
  · 人口前 6 的候选（含对比度、ΔE 间距）
  · 在「对比度达标 + 邻域人口达标」的子集里，人口前 6
这样窗口怎么定就不是拍脑袋，而是由像素证据决定。
"""
import os, sys, io
from collections import defaultdict
import numpy as np
from model import (ALL, POOL, CH, HL, CL, rgb_of, de, from_hsl, contrast, TARGET,
                   TOL_ROLE, TOL, feasible, bg, SURF)

CELL = 7
HASH = defaultdict(list)
for k, v in POOL.items():
    r, g, b = rgb_of(k)
    HASH[(r // CELL, g // CELL, b // _CELL if False else b // CELL)].append((k, v["pop"]))


def near_pop(k):
    t = rgb_of(k)
    cx, cy, cz = t[0] // CELL, t[1] // CELL, t[2] // CELL
    tot = 0
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                for pk, pop in HASH.get((cx + dx, cy + dy, cz + dz), ()):
                    q = rgb_of(pk)
                    if abs(q[0] - t[0]) + abs(q[1] - t[1]) + abs(q[2] - t[2]) <= 6:
                        tot += pop
    return tot


POP_MIN = 24
BG = bg["background"]
PANEL = bg["backgroundPanel"]

# (label, h0,h1, l0,l1, s0,s1, role_or_None)
WINDOWS = [
    ("primary 徽章红",    338, 359, 0.26, 0.56, 0.70, 1.00, "primary"),
    ("syntaxKeyword 胸窗红", 338, 359, 0.22, 0.50, 0.62, 1.00, "syntaxKeyword"),
    ("error 熔炉",         4,  30, 0.32, 0.72, 0.68, 1.00, "error"),
    ("markdownEmph 肩炮火", 4,  32, 0.26, 0.64, 0.55, 1.00, "markdownEmph"),
    ("syntaxNumber 引擎橙", 6,  36, 0.28, 0.62, 0.60, 1.00, "syntaxNumber"),
    ("warning 炮口",      34,  56, 0.30, 0.58, 0.70, 1.00, "warning"),
    ("borderActive 漆黄",  38,  58, 0.34, 0.72, 0.72, 1.00, "borderActive"),
    ("markdownHeading 日轮", 40, 60, 0.44, 0.84, 0.30, 0.90, "markdownHeading"),
    ("syntaxFunction 深金", 30, 52, 0.22, 0.48, 0.60, 1.00, "syntaxFunction"),
    ("success 苔绿",       72, 128, 0.30, 0.80, 0.08, 0.42, "success"),
    ("diffAdded 草坡",     40,  90, 0.26, 0.80, 0.03, 0.34, "diffAdded"),
    ("diffRemoved 锈铜",   16,  50, 0.32, 0.78, 0.15, 0.48, "diffRemoved"),
    ("markdownBlockQuote 尘", 18, 64, 0.22, 0.70, 0.00, 0.18, "markdownBlockQuote"),
    ("secondary 晶体蓝",  196, 218, 0.18, 0.46, 0.62, 1.00, "secondary"),
    ("markdownLink 电光蓝", 196, 220, 0.22, 0.50, 0.55, 1.00, "markdownLink"),
    ("info 全息青",       180, 202, 0.20, 0.50, 0.60, 1.00, "info"),
    ("markdownCode 霸天虎紫", 278, 320, 0.26, 0.72, 0.10, 0.42, "markdownCode"),
    ("syntaxType 玫粉",    305, 348, 0.28, 0.80, 0.08, 0.42, "syntaxType"),
    ("border 钢缝",        190, 232, 0.16, 0.58, 0.04, 0.42, "border"),
    ("syntaxString 钢灰",  188, 232, 0.28, 0.72, 0.00, 0.22, "syntaxString"),
    ("syntaxOperator 雾蓝", 192, 238, 0.24, 0.62, 0.02, 0.26, "syntaxOperator"),
    ("syntaxComment 烟灰", 180, 235, 0.20, 0.60, 0.00, 0.16, "syntaxComment"),
    ("textMuted 蓝灰",     178, 244, 0.26, 0.72, 0.00, 0.20, "textMuted"),
    ("text 钢白",          172, 255, 0.74, 1.00, 0.00, 0.22, "text"),
    ("markdownStrong 高光", 172, 255, 0.80, 1.00, 0.00, 0.18, "markdownStrong"),
]

for label, h0, h1, l0, l1, s0, s1, role in WINDOWS:
    cand = []
    for k in ALL:
        h, s, l = CH[k]
        if not (h0 <= h <= h1 and l0 <= l <= l1 and s0 <= s <= s1):
            continue
        if POOL[k]["pop"] < 2:
            continue
        cand.append(k)
    scored = sorted(((near_pop(k), k) for k in cand), reverse=True)
    ok = []
    for n, k in scored:
        if n < POP_MIN:
            continue
        if role and not feasible(role, k):
            continue
        ok.append((n, k))
    tgt = TARGET.get(role, "")
    print("\n%-22s 窗口 %5d 色  人口≥%d 且过对比度: %d" % (label, len(cand), POP_MIN, len(ok)))
    for n, k in ok[:6]:
        h, s, l = CH[k]
        f = max(POOL[k]["files"], key=lambda x: POOL[k]["files"][x])
        d = (" ΔE%.1f" % de(k, tgt)) if tgt else ""
        print("      %s  pop %5d  精确 %4d px (%s)  H%.0f S%.0f%% L%.0f%%  对底 %.2f:1%s"
              % (k, n, POOL[k]["pop"], f, h, s * 100, l * 100, contrast(k, BG), d))
    if not ok:
        print("      （无）")
    sys.stdout.flush()
