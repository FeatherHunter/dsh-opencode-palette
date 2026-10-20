# -*- coding: utf-8 -*-
"""Extract real pixel colours from the Harry Potter reference images.

Two outputs per image:
  1. dominant palette (k-means over pixels, with share + centroid in image coords)
  2. a coarse grid of per-cell average colours, so specific objects can be located
     by pixel coordinate (moon, gold title, tie stripes, robe black, ice chamber ...)
"""
import json
import os
import sys

import numpy as np
from PIL import Image

SRC = r"C:\Users\辰辰洋洋\Pictures\哈利波特"
OUT = os.path.dirname(os.path.abspath(__file__))

FILES = ["images.jpg", "4.jpg", "2.jpg", "3.jpg"]


def srgb_to_linear(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def rel_lum(rgb):
    v = srgb_to_linear(np.asarray(rgb, dtype=float))
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]


def hexs(rgb):
    return "#%02X%02X%02X" % (int(rgb[0]), int(rgb[1]), int(rgb[2]))


def kmeans(img, k, iters=40, seed=7):
    """Plain k-means in RGB space over a subsample of pixels."""
    a = np.asarray(img.convert("RGB"), dtype=np.float32)
    h, w, _ = a.shape
    flat = a.reshape(-1, 3)
    rng = np.random.default_rng(seed)
    # deterministic, spread-out init via quantiles of a channel projection
    idx = rng.choice(flat.shape[0], size=min(20000, flat.shape[0]), replace=False)
    pts = flat[idx]
    # k-means++ style init
    centers = [pts[rng.integers(pts.shape[0])]]
    for _ in range(k - 1):
        d = np.min(
            np.stack([np.sum((pts - c) ** 2, axis=1) for c in centers], axis=0), axis=0
        )
        p = d / d.sum() if d.sum() > 0 else None
        centers.append(pts[rng.choice(pts.shape[0], p=p)])
    centers = np.array(centers, dtype=np.float32)
    for _ in range(iters):
        d = np.stack([np.sum((flat - c) ** 2, axis=1) for c in centers], axis=0)
        lab = np.argmin(d, axis=0)
        newc = np.array(
            [flat[lab == i].mean(axis=0) if np.any(lab == i) else centers[i] for i in range(k)],
            dtype=np.float32,
        )
        if np.allclose(newc, centers, atol=0.6):
            centers = newc
            break
        centers = newc
    d = np.stack([np.sum((flat - c) ** 2, axis=1) for c in centers], axis=0)
    lab = np.argmin(d, axis=0)
    counts = np.bincount(lab, minlength=k)
    out = []
    for i in range(k):
        ys, xs = np.nonzero((lab == i).reshape(h, w))
        cy = float(ys.mean()) / h if ys.size else 0.0
        cx = float(xs.mean()) / w if xs.size else 0.0
        out.append(
            {
                "hex": hexs(centers[i]),
                "rgb": [round(float(x)) for x in centers[i]],
                "share": round(float(counts[i]) / lab.size * 100, 2),
                "lum": round(float(rel_lum(centers[i])), 4),
                "cx": round(cx, 3),
                "cy": round(cy, 3),
            }
        )
    out.sort(key=lambda d_: -d_["share"])
    return out


def grid(img, n=16):
    a = np.asarray(img.convert("RGB"), dtype=np.float32)
    h, w, _ = a.shape
    cells = []
    for r in range(n):
        row = []
        for c in range(n):
            y0, y1 = int(r * h / n), int((r + 1) * h / n)
            x0, x1 = int(c * w / n), int((c + 1) * w / n)
            patch = a[y0:y1, x0:x1].reshape(-1, 3)
            mean = patch.mean(axis=0)
            row.append(hexs(mean))
        cells.append(row)
    return {"size": [w, h], "n": n, "cells": cells}


def patch(img, x0, y0, x1, y1):
    """Average colour of a normalised rect (0..1 fractions)."""
    a = np.asarray(img.convert("RGB"), dtype=np.float32)
    h, w, _ = a.shape
    p = a[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)].reshape(-1, 3)
    return hexs(p.mean(axis=0))


def main():
    os.makedirs(OUT, exist_ok=True)
    result = {}
    for f in FILES:
        p = os.path.join(SRC, f)
        im = Image.open(p)
        result[f] = {
            "size": list(im.size),
            "dominant": kmeans(im, 14),
            "grid": grid(im, 16),
        }
        print(f, im.size, "ok", file=sys.stderr)
    with open(os.path.join(OUT, "extracted.json"), "w", encoding="utf-8") as fp:
        json.dump(result, fp, ensure_ascii=False, indent=1)

    # human-readable digest
    for f in FILES:
        d = result[f]
        print("\n=== %s %s ===" % (f, d["size"]))
        for e in d["dominant"]:
            print(
                "  %-9s %5.2f%%  lum=%.3f  at(%.2f,%.2f)"
                % (e["hex"], e["share"], e["lum"], e["cx"], e["cy"])
            )


if __name__ == "__main__":
    main()
