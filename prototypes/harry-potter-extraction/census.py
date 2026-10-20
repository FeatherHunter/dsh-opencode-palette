# -*- coding: utf-8 -*-
"""Material census: segment every pixel of the 4 reference images into colour
families (gold, crimson, ice-cyan, midnight-blue, ember/amber, parchment, ink,
green ...) and report each family's mean hex, share, and bounding box.

This is the ground truth the palette must be built from -- every hex in the
theme is either an exact sample from here, or a documented lightness step of one.
"""
import colorsys
import json
import os

import numpy as np
from PIL import Image

SRC = r"C:\Users\辰辰洋洋\Pictures\哈利波特"
OUT = os.path.dirname(os.path.abspath(__file__))
FILES = ["images.jpg", "4.jpg", "2.jpg", "3.jpg"]


def to_hsv(arr):
    a = arr.astype(np.float32) / 255.0
    mx = a.max(axis=-1)
    mn = a.min(axis=-1)
    d = mx - mn
    h = np.zeros_like(mx)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    nz = d > 1e-6
    idx = nz & (mx == r)
    h[idx] = ((g[idx] - b[idx]) / d[idx]) % 6
    idx = nz & (mx == g)
    h[idx] = (b[idx] - r[idx]) / d[idx] + 2
    idx = nz & (mx == b)
    h[idx] = (r[idx] - g[idx]) / d[idx] + 4
    h = h * 60.0
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0.0)
    return h, s, mx


# family: (name, hue ranges deg (may be list of (lo,hi)), sat range, val range)
FAMILIES = [
    ("gold",        [(32, 58)],        (0.28, 1.01), (0.38, 1.01)),
    ("crimson",     [(340, 361), (0, 16)], (0.30, 1.01), (0.25, 1.01)),
    ("ice-cyan",    [(180, 214)],      (0.28, 1.01), (0.35, 1.01)),
    ("midnight",    [(200, 244)],      (0.20, 1.01), (0.03, 0.30)),
    ("ember-amber", [(14, 32)],        (0.22, 1.01), (0.22, 0.85)),
    ("parchment",   [(0, 360)],        (0.00, 0.16), (0.80, 1.01)),
    ("ink",         [(0, 360)],        (0.00, 0.30), (0.00, 0.14)),
    ("green",       [(80, 165)],       (0.16, 1.01), (0.14, 1.01)),
    ("violet",      [(265, 320)],      (0.14, 1.01), (0.14, 1.01)),
]


def in_hue(h, ranges):
    m = np.zeros(h.shape, dtype=bool)
    for lo, hi in ranges:
        if lo <= hi:
            m |= (h >= lo) & (h <= hi)
        else:
            m |= (h >= lo) | (h <= hi)
    return m


def census(im):
    a = np.asarray(im.convert("RGB"), dtype=np.float32)
    h, w, _ = a.shape
    H, S, V = to_hsv(a)
    out = {}
    for name, hr, (slo, shi), (vlo, vhi) in FAMILIES:
        m = in_hue(H, hr) & (S >= slo) & (S < shi) & (V >= vlo) & (V < vhi)
        cnt = int(m.sum())
        if cnt < 40:
            out[name] = {"count": cnt, "share": round(cnt / (h * w) * 100, 2)}
            continue
        px = a[m]
        mean = px.mean(axis=0)
        # brightest & darkest members of the family (useful for accent steps)
        order = np.argsort(V[m])
        vlow = px[order[: max(1, len(order) // 20)]].mean(axis=0)
        vhigh = px[order[-max(1, len(order) // 20):]].mean(axis=0)
        ys, xs = np.nonzero(m)
        out[name] = {
            "count": cnt,
            "share": round(cnt / (h * w) * 100, 2),
            "mean": "#%02X%02X%02X" % tuple(int(x) for x in mean),
            "mean_rgb": [round(float(x)) for x in mean],
            "dark": "#%02X%02X%02X" % tuple(int(x) for x in vlow),
            "light": "#%02X%02X%02X" % tuple(int(x) for x in vhigh),
            "bbox": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
            "bbox_norm": [
                round(xs.min() / w, 3), round(ys.min() / h, 3),
                round(xs.max() / w, 3), round(ys.max() / h, 3),
            ],
        }
    return out


res = {}
for f in FILES:
    im = Image.open(os.path.join(SRC, f))
    res[f] = census(im)
    print("\n=== %s %s ===" % (f, im.size))
    for k, v in res[f].items():
        if v["count"] < 40:
            print("  %-12s  --  (%d px)" % (k, v["count"]))
        else:
            print(
                "  %-12s  mean %-8s  dark %-8s  light %-8s  %5.2f%%  bbox %s"
                % (k, v["mean"], v["dark"], v["light"], v["share"], v["bbox_norm"])
            )

with open(os.path.join(OUT, "census.json"), "w", encoding="utf-8") as fp:
    json.dump(res, fp, ensure_ascii=False, indent=1)
