# -*- coding: utf-8 -*-
"""fineprobe.py — 细窗口普查：每个岗位该去哪里「借色」，由原图的像素证据决定。

口径：global near-pop = 全图有多少像素与该色 L1 距离 ≤ 6。
窗口用 HSL（H / S / 明度 L），不用相对亮度——那是给对比度用的另一把尺子。
"""
import os, sys, io
from collections import defaultdict
import numpy as np
from model import ALL, POOL, CH, HL, rgb_of

CELL = 7
HASH = defaultdict(list)
for k, v in POOL.items():
    r, g, b = rgb_of(k)
    HASH[(r // CELL, g // CELL, b // CELL)].append((k, v["pop"]))


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


HSL = np.array([CH[k] for k in ALL])
LIT = np.array([HL[k] for k in ALL])

WINDOWS = [
    ("深红 徽章",        340, 358, 0.24, 0.50, 0.80, 1.00),
    ("火橙 熔炉",          6,  30, 0.36, 0.82, 0.75, 1.00),
    ("琥珀 炮口",         36,  54, 0.34, 0.60, 0.85, 1.00),
    ("亮黄 车漆",         42,  56, 0.40, 0.68, 0.88, 1.00),
    ("深金 阴影漆",       32,  50, 0.26, 0.46, 0.85, 1.00),
    ("苔绿 唯一绿",        80, 125, 0.38, 0.88, 0.08, 0.35),
    ("草坡 枯黄绿",       45,  88, 0.34, 0.88, 0.03, 0.32),
    ("青 全息",          183, 203, 0.20, 0.50, 0.70, 1.00),
    ("蓝 晶体",          196, 216, 0.20, 0.50, 0.70, 1.00),
    ("钢蓝 接缝",        193, 228, 0.16, 0.56, 0.05, 0.40),
    ("紫 霸天虎",        282, 318, 0.34, 0.70, 0.12, 0.38),
    ("玫粉 Arcee",       305, 345, 0.40, 0.76, 0.10, 0.40),
    ("暖粉 腮红",        340, 359, 0.38, 0.74, 0.08, 0.34),
    ("近白 正文",        175, 252, 0.82, 1.00, 0.00, 0.18),
    ("中灰 次级",        175, 240, 0.32, 0.68, 0.00, 0.16),
    ("暖尘 引用",         20,  62, 0.26, 0.66, 0.00, 0.14),
    ("锈铜 战损",         18,  48, 0.38, 0.76, 0.16, 0.44),
    ("石板 暗面",         40,  90, 0.60, 1.00, 0.00, 0.10),
]

for label, h0, h1, l0, l1, s0, s1 in WINDOWS:
    m = ((HSL[:, 0] >= h0) & (HSL[:, 0] <= h1) & (LIT >= l0) & (LIT <= l1)
         & (HSL[:, 1] >= s0) & (HSL[:, 1] <= s1))
    idx = np.nonzero(m)[0]
    scored = sorted(((near_pop(ALL[i]), ALL[i]) for i in idx), reverse=True)
    print("\n%-16s 窗口 %5d 色   人口前 6：" % (label, len(scored)))
    for n, k in scored[:6]:
        f = max(POOL[k]["files"], key=lambda x: POOL[k]["files"][x])
        h, s, l = CH[k]
        print("      %s  pop %6d  精确 %5d px (%s)  H%.0f S%.0f%% L%.0f%%" % (k, n, POOL[k]["pop"], f, h, s * 100, l * 100))
    sys.stdout.flush()
