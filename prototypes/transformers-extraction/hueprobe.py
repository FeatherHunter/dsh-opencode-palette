# -*- coding: utf-8 -*-
"""hueprobe.py — 回答一个具体问题：每个色相窗口里，「在原图上成片存在」的颜色到底有哪些？

口径：global near-pop = 全图有多少像素与该色 L1 距离 ≤ 6（空间哈希 + 像素计数表，精确）。
这是「这个颜色在图里不是一个孤点」的最低证据。
"""
import os, sys, io, math
from collections import defaultdict
import numpy as np
from model import ALL, POOL, CH, CL, rgb_of

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


HSL = np.array([CH[k] for k in ALL])       # N x 3
LUM = np.array([CL[k] for k in ALL])

WINDOWS = [
    ("红（徽章/胸窗）",   0,  22, 0.130, 0.330, 0.60, 1.00),
    ("深红（徽章）",    340, 358, 0.130, 0.200, 0.65, 1.00),
    ("橙（火焰/熔炉）",   8,  34, 0.180, 0.340, 0.55, 1.00),
    ("琥珀（炮口）",    28,  48, 0.290, 0.490, 0.60, 1.00),
    ("金（车漆深金）",   36,  56, 0.260, 0.420, 0.60, 1.00),
    ("黄（大黄蜂漆）",   42,  58, 0.450, 0.720, 0.45, 1.00),
    ("粉（Arcee）",    290, 345, 0.180, 0.340, 0.25, 0.85),
    ("紫（霸天虎）",    250, 305, 0.180, 0.340, 0.15, 0.60),
    ("青（全息）",     180, 210, 0.140, 0.280, 0.50, 1.00),
    ("蓝（晶体）",     200, 230, 0.110, 0.240, 0.50, 1.00),
    ("绿（苔/草）",     55, 105, 0.110, 0.340, 0.08, 0.50),
    ("钢灰蓝",        190, 235, 0.040, 0.120, 0.08, 0.45),
    ("钢灰（文字）",    185, 250, 0.230, 0.650, 0.00, 0.30),
    ("暖灰（引用/尘）",   15,  55, 0.170, 0.350, 0.03, 0.34),
]

for label, h0, h1, l0, l1, s0, s1 in WINDOWS:
    m = ((HSL[:, 0] >= h0) & (HSL[:, 0] <= h1) & (LUM >= l0) & (LUM <= l1)
         & (HSL[:, 1] >= s0) & (HSL[:, 1] <= s1))
    idx = np.nonzero(m)[0]
    scored = []
    for i in idx:
        k = ALL[i]
        scored.append((near_pop(k), k))
    scored.sort(reverse=True)
    print("\n%-18s 窗口内 %5d 个颜色   人口前 10：" % (label, len(scored)))
    for n, k in scored[:10]:
        f = max(POOL[k]["files"], key=lambda x: POOL[k]["files"][x])
        print("      %s  邻域人口 %6d   精确 %5d px (%s)" % (k, n, POOL[k]["pop"], f))
    sys.stdout.flush()
