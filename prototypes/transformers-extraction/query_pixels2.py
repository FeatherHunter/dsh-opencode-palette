# -*- coding: utf-8 -*-
"""query_pixels2.py — 全局像素普查（不加候选掩码），按岗位约束 + 像素人口排序。

用途：为「success 绿 / syntaxType 洋红 / warning 琥珀」等人口稀薄的色族找到真正成片的区域。
"""
import os, sys, io
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from sources import SRC_DIR, IMAGES

PANEL = "#111832"
CODE = "#050811"


def rgb_of(h):
    h = h.lstrip("#")[:6]
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def hx(c):
    return "#%02X%02X%02X" % tuple(int(round(v)) for v in c)


def lum(rgb):
    if isinstance(rgb, str):
        rgb = rgb_of(rgb)
    def lin(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = [lin(v) for v in rgb]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def hsl(rgb):
    r, g, b = [v / 255 for v in rgb]
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    d = mx - mn
    if d == 0:
        return 0.0, 0.0, l
    if mx == r:
        h = ((g - b) / d) % 6
    elif mx == g:
        h = (b - r) / d + 2
    else:
        h = (r - g) / d + 4
    h *= 60
    s = 0 if l in (0, 1) else d / (1 - abs(2 * l - 1))
    return h, s, l


def ratio(a, b):
    l1, l2 = lum(a), lum(b)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


IMGS = {}
for fname, _, _ in IMAGES:
    IMGS[fname] = np.asarray(Image.open(os.path.join(SRC_DIR, fname)).convert("RGB")).reshape(-1, 3)


def census(name, hue_lo, hue_hi, min_lum, max_lum, min_sat, top=12):
    rows = {}
    for f, a in IMGS.items():
        u, cnt = np.unique(a, axis=0, return_counts=True)
        for px, c in zip(u, cnt):
            h, s, l = hsl(tuple(int(v) for v in px))
            L = lum(tuple(int(v) for v in px))
            if not (hue_lo <= h <= hue_hi) or not (min_lum <= L <= max_lum) or s < min_sat:
                continue
            k = hx(px)
            e = rows.setdefault(k, {"pop": 0, "files": {}, "lum": L, "s": s, "h": h})
            e["pop"] += int(c)
            e["files"][f] = e["files"].get(f, 0) + int(c)
    out = sorted(rows.items(), key=lambda kv: -kv[1]["pop"])[:top]
    print("\n### %s" % name)
    for k, e in out:
        print("   %s  H%5.1f S%3d%% lum %.4f  panel %5.2f  code %5.2f  人口 %6d  %s" %
              (k, e["h"], e["s"] * 100, e["lum"], ratio(k, PANEL), ratio(k, CODE), e["pop"],
               " ".join("%s:%d" % (f, n) for f, n in sorted(e["files"].items(), key=lambda x: -x[1])[:3])))


if __name__ == "__main__":
    census("success 用的绿（H120-180, lum≥0.13）", 120, 180, 0.130, 0.60, 0.20)
    census("success 用的绿（H90-180, lum≥0.13）", 90, 180, 0.130, 0.60, 0.15)
    census("洋红 / 粉（H300-345, lum≥0.185）", 300, 345, 0.185, 0.60, 0.30)
    census("紫（H255-300, lum≥0.185）", 255, 300, 0.185, 0.60, 0.30)
    census("琥珀 / 金（H30-50, lum≥0.28）", 30, 50, 0.280, 0.62, 0.60)
    census("暖橙 / 红橙（H12-32, lum≥0.22）", 12, 32, 0.220, 0.62, 0.60)
    census("热红（H0-14, lum≥0.15）", 0, 14, 0.150, 0.40, 0.70)
    census("深红（H344-360, lum≥0.13）", 344, 360, 0.130, 0.30, 0.65)
    census("青（H175-200, lum≥0.17）", 175, 200, 0.170, 0.45, 0.40)
    census("夜幕蓝（H215-240, lum≤0.09）", 215, 240, 0.001, 0.090, 0.20, 14)
    census("夜幕蓝（H215-240, lum 0.09-0.20）", 215, 240, 0.090, 0.200, 0.20, 14)
    census("夜幕蓝紫（H240-270, lum≤0.12）", 240, 270, 0.001, 0.120, 0.20, 12)
    census("钢蓝灰（H195-215, lum 0.18-0.50）", 195, 215, 0.180, 0.500, 0.02, 12)
    census("钢白（H190-215, lum≥0.60）", 190, 215, 0.600, 0.95, 0.02, 10)
    census("土黄 / 橄榄（H40-90, lum 0.18-0.45）", 40, 90, 0.180, 0.450, 0.10, 12)
    census("褐 / 沙（H20-50, lum 0.18-0.45）", 20, 50, 0.180, 0.450, 0.05, 12)
