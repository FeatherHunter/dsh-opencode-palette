# -*- coding: utf-8 -*-
"""query_base3.py — 每张图最常见的 25 个像素（真实像素的主色分布）。

这是「阶梯基色该选谁」的依据：不看单点，看哪个颜色在图里成片。
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


for fname, title, _ in IMAGES:
    a = np.asarray(Image.open(os.path.join(SRC_DIR, fname)).convert("RGB")).reshape(-1, 3)
    u, cnt = np.unique(a, axis=0, return_counts=True)
    order = np.argsort(-cnt)[:20]
    total = a.shape[0]
    print("\n%s  %s  （%d px）" % (fname, title, total))
    for i in order:
        k = hx(u[i])
        h, s, l = hsl(k)
        print("   %s  %6d px (%5.2f%%)  H%6.1f S%5.1f%% L%5.1f%%" %
              (k, cnt[i], cnt[i] * 100.0 / total, h, s * 100, l * 100))
