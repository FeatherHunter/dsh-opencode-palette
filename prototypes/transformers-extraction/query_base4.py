# -*- coding: utf-8 -*-
"""query_base4.py — 家族普查：为每个要用的家族找「成片」的真实像素。

判尺口径（house）：直采色必须与参考图某个像素完全一致。
但 JPEG 噪点会让「恰好等于某像素」变弱，所以还要看邻域人口（ΔRGB≤6 有多少像素）。
所以基色要选：精确命中多 + 邻域人口大。
"""
import os, sys, io
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from sources import SRC_DIR, IMAGES


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


def scan(title, h0, h1, lmin, lmax, smin, smax, top=12):
    rows = []
    for k, c in COUNT.items():
        h, s, l = hsl(k)
        if not (h0 <= h <= h1 and lmin <= l <= lmax and smin <= s <= smax):
            continue
        rows.append((c, k))
    rows.sort(reverse=True)
    print("\n%s  （%d 个候选）" % (title, len(rows)))
    for c, k in rows[:top]:
        h, s, l = hsl(k)
        print("   %s  精确 %6d px  (%s)  H%6.1f S%5.1f%% L%5.1f%%" % (k, c, FILEOF[k], h, s * 100, l * 100))
    return rows


scan("夜蓝（背景阶梯基色）H205-235, S≥0.55, L 0.04-0.14", 205, 235, 0.04, 0.14, 0.55, 1.0)
scan("夜紫（bubbleBg 家族）H255-300, S≥0.40, L 0.08-0.20", 255, 300, 0.08, 0.20, 0.40, 1.0)
scan("钢蓝灰（border 家族）H195-225, S 0.05-0.30, L 0.20-0.45", 195, 225, 0.20, 0.45, 0.05, 0.30)
