# -*- coding: utf-8 -*-
"""locate.py — 找出某个 hex 在某张图里的位置，存一张带标记的裁切图，用来肉眼验证「取色现场」。

用法：python locate.py "#021229" 5.jpg
"""
import os, sys, io
import numpy as np
from PIL import Image, ImageDraw

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from sources import SRC_DIR, IMAGES

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "_locate")
os.makedirs(OUT, exist_ok=True)


def rgb_of(h):
    h = h.lstrip("#")[:6]
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


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


for arg in sys.argv[1:]:
    if ":" in arg:
        hx, fname = arg.split(":", 1)
    else:
        hx, fname = arg, IMAGES[0][0]
    img = Image.open(os.path.join(SRC_DIR, fname)).convert("RGB")
    a = np.asarray(img).reshape(-1, 3)
    t = np.array(rgb_of(hx), dtype=np.int16)
    d = np.abs(a.astype(np.int16) - t).sum(axis=1)
    idx = np.where(d == 0)[0]
    ys, xs = idx // img.width, idx % img.width
    h, s, l = hsl(hx)
    print("%s @ %s  精确 %d px  H%.1f S%.1f%% L%.1f%%" % (hx, fname, len(xs), h, s * 100, l * 100))
    if len(xs) == 0:
        continue
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    print("    包围盒 x[%d..%d] y[%d..%d]  中心 (%.0f, %.0f)" % (x0, x1, y0, y1, xs.mean(), ys.mean()))
    cx, cy = int(xs.mean()), int(ys.mean())
    half = 110
    L, T = max(0, cx - half), max(0, cy - half)
    R, B = min(img.width, cx + half), min(img.height, cy + half)
    crop = img.crop((L, T, R, B)).resize((440, 440), Image.LANCZOS)
    d2 = ImageDraw.Draw(crop)
    sx, sy = (cx - L) * 440 / (R - L), (cy - T) * 440 / (B - T)
    d2.ellipse([sx - 14, sy - 14, sx + 14, sy + 14], outline=(255, 0, 0), width=3)
    p = os.path.join(OUT, "%s_%s.png" % (hx.lstrip("#"), fname))
    crop.save(p)
    print("    → %s" % p)
