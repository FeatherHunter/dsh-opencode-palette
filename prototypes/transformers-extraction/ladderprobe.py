# -*- coding: utf-8 -*-
"""ladderprobe.py — 一个色相家族里，哪些明度台阶是「真的站得住」的。

对每个家族按 HSL 明度分桶（每档 2%），报出该档里人口最高的颜色、
它的邻域人口、精确命中数与对底对比度。
这张表直接决定「同一个家族能承担几个岗位、每个岗位坐哪一阶」。
"""
import os, sys, io
from collections import defaultdict
import numpy as np
from model import ALL, POOL, CH, HL, rgb_of, contrast, bg

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


BG = bg["background"]
FAMILIES = [
    ("黄 车漆/日轮", 36, 60, 0.45, 1.00),
    ("红 徽章/辉光", 336, 359, 0.60, 1.00),
    ("橙 火焰/熔炉", 2, 34, 0.60, 1.00),
    ("蓝 晶体/电光", 178, 224, 0.55, 1.00),
    ("紫 霸天虎", 276, 322, 0.08, 0.48),
    ("粉 Arcee", 320, 352, 0.05, 0.48),
    ("绿 苔/草", 60, 132, 0.04, 0.48),
    ("棕 锈铜/尘", 12, 55, 0.04, 0.50),
    ("钢蓝灰 雾都", 190, 232, 0.03, 0.40),
    ("中性 钢白", 0, 360, 0.00, 0.06),
]

for label, h0, h1, s0, s1 in FAMILIES:
    buckets = defaultdict(list)
    for k in ALL:
        h, s, l = CH[k]
        if not (h0 <= h <= h1 and s0 <= s <= s1):
            continue
        buckets[int(l / 0.02)].append(k)
    print("\n=== %s ===" % label)
    for b in sorted(buckets):
        best = None
        for k in buckets[b]:
            n = near_pop(k)
            if best is None or n > best[0]:
                best = (n, k)
        n, k = best
        h, s, l = CH[k]
        f = max(POOL[k]["files"], key=lambda x: POOL[k]["files"][x])
        print("   L %2d%%-%2d%%  %s  pop %5d  精确 %4d px (%s)  H%.0f S%.0f%%  对底 %5.2f:1"
              % (b * 2, b * 2 + 2, k, n, POOL[k]["pop"], f, h, s * 100, contrast(k, BG)))
    sys.stdout.flush()
