# -*- coding: utf-8 -*-
"""query_base2.py — 在真实像素池里挑「阶梯基色」：必须本身是某张图的像素，且人口足够。

阶梯的基色只决定整条台阶的色相与饱和度来源，所以它必须站得住：
  · 本身是参考图里的像素（直采口径）
  · 出现次数足够多（不是单像素噪点）
  · 色相落在想要的家族区间里
"""
import os, sys, io, json
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from sources import SRC_DIR, IMAGES

HERE = os.path.dirname(os.path.abspath(__file__))


def rgb_of(h):
    h = h.lstrip("#")[:6]
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def hx(c):
    return "#%02X%02X%02X" % tuple(int(round(max(0, min(255, v)))) for v in c)


def hsl(h):
    r, g, b = [v / 255 for v in rgb_of(h)]
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    d = mx - mn
    if d == 0:
        return 0.0, 0.0, l
    if mx == r:
        hh = ((g - b) / d) % 6
    elif mx == g:
        hh = (b - g) / d + 2
    else:
        hh = (r - g) / d + 4
    hh *= 60
    s = 0 if l in (0, 1) else d / (1 - abs(2 * l - 1))
    return hh, s, l


COUNT = {}
FILEOF = {}
for fname, _, _ in IMAGES:
    a = np.asarray(Image.open(os.path.join(SRC_DIR, fname)).convert("RGB")).reshape(-1, 3)
    u, cnt = np.unique(a, axis=0, return_counts=True)
    for px, c in zip(u, cnt):
        k = hx(px)
        COUNT[k] = COUNT.get(k, 0) + int(c)
        FILEOF.setdefault(k, fname)


def scan(title, h0, h1, lmin, lmax, smin, smax, minpop, top=10):
    rows = []
    for k, c in COUNT.items():
        h, s, l = hsl(k)
        if not (h0 <= h <= h1 and lmin <= l <= lmax and smin <= s <= smax):
            continue
        if c < minpop:
            continue
        rows.append((c, k))
    rows.sort(reverse=True)
    print("\n%s" % title)
    for c, k in rows[:top]:
        h, s, l = hsl(k)
        print("   %s  出现 %6d px  (%s)  H%.1f S%.1f%% L%.1f%%" % (k, c, FILEOF[k], h, s * 100, l * 100))
    return rows


scan("蓝夜家族 (H215-235, S≥0.45, L 0.07-0.16, ≥30px)", 215, 235, 0.07, 0.16, 0.45, 1.0, 30)
scan("紫气家族 (H265-285, S≥0.45, L 0.10-0.20, ≥10px)", 265, 285, 0.10, 0.20, 0.45, 1.0, 10)
scan("钢灰家族 (H190-215, S 0.02-0.25, L 0.30-0.55, ≥40px)", 190, 215, 0.30, 0.55, 0.02, 0.25, 40)
