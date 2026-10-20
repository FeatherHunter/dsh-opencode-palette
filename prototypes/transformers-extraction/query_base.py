# -*- coding: utf-8 -*-
"""query_base.py — 找一个「最接近某个目标、且本身是真实像素」的阶梯基色。

阶梯配方要求：基色必须是图里真实存在的像素（不能是我拍脑袋写的十六进制）。
这里对每个目标色，在五图的全部真实像素里找 RGB 距离最小、且出现次数最多的那个。
"""
import os, sys, io, json, colorsys
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

print("五图去重像素：%d 种" % len(COUNT))

TARGETS = ["#08112C", "#240F35"]
for t in TARGETS:
    tr = np.array(rgb_of(t), dtype=np.int16)
    best = []
    for k in COUNT:
        d = int(np.abs(np.array(rgb_of(k), dtype=np.int16) - tr).sum())
        if d <= 12:
            best.append((d, -COUNT[k], k))
    best.sort()
    print("\n目标 %s 附近真实像素（按 RGB 距离，限制 ≤12）：" % t)
    for d, negc, k in best[:8]:
        h, s, l = hsl(k)
        print("   %s  ΔRGB=%2d  出现 %6d px  (%s)  H%.1f S%.1f%% L%.1f%%" %
              (k, d, -negc, FILEOF[k], h, s * 100, l * 100))
