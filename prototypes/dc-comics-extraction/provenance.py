"""provenance.py — 逐色位回原图取证： for every token find the densest tonal neighbourhood
in each reference image and crop it, so every claim in the preview is visually checkable."""
import json
import os
from collections import Counter, defaultdict

import numpy as np
from PIL import Image, ImageDraw

SRC = os.environ.get("DC_REF", r"C:\Users\辰辰洋洋\Pictures\DC")
OUT = os.path.dirname(os.path.abspath(__file__))
FILES = ("1.jpg", "2.jpg", "3.jpg")

P = json.load(open(os.path.join(OUT, "palette.json"), encoding="utf-8"))["palette"]
HEXES = [info["hex"] for info in P.values()]

imgs = {}
for f in FILES:
    im = Image.open(os.path.join(SRC, f)).convert("RGB")
    w, h = im.size
    a = np.asarray(im).reshape(-1, 3).astype(np.float64) / 255.0
    lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    r, g, b = lin[:, 0], lin[:, 1], lin[:, 2]
    X = r * 0.4124 + g * 0.3576 + b * 0.1805
    Y = r * 0.2126 + g * 0.7152 + b * 0.0722
    Z = r * 0.0193 + g * 0.1192 + b * 0.9505
    fx = np.where(X / 0.95047 > 0.008856, (X / 0.95047) ** (1 / 3), 7.787 * (X / 0.95047) + 16 / 116)
    fy = np.where(Y > 0.008856, Y ** (1 / 3), 7.787 * Y + 16 / 116)
    fz = np.where(Z / 1.08883 > 0.008856, (Z / 1.08883) ** (1 / 3), 7.787 * (Z / 1.08883) + 16 / 116)
    lab = np.stack([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)], axis=1)
    imgs[f] = (im, w, h, lab)


def lab_of_hex(hx):
    v = np.array([int(hx[i:i + 2], 16) / 255 for i in (1, 3, 5)])
    lin = np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)
    r, g, b = lin
    X = r * 0.4124 + g * 0.3576 + b * 0.1805
    Y = r * 0.2126 + g * 0.7152 + b * 0.0722
    Z = r * 0.0193 + g * 0.1192 + b * 0.9505
    fx = (X / 0.95047) ** (1 / 3)
    fy = Y ** (1 / 3)
    fz = (Z / 1.08883) ** (1 / 3)
    return np.array([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)])


def densest(lab, w, h, q, tol=6.0, win=26):
    d = np.sqrt(((lab - q) ** 2).sum(axis=1))
    ys, xs = np.nonzero((d <= tol).reshape(h, w))
    if len(ys) == 0:
        return None
    # grid histogram -> pick the densest window centre
    g = defaultdict(int)
    for y, x in zip(ys, xs):
        g[(y // win, x // win)] += 1
    (gy, gx), _ = max(g.items(), key=lambda kv: kv[1])
    sel = [(y, x) for (y, x) in zip(ys, xs) if gy * win <= y < (gy + 1) * win and gx * win <= x < (gx + 1) * win]
    if not sel:
        sel = list(zip(ys, xs))
    cy = int(np.median([p[0] for p in sel]))
    cx = int(np.median([p[1] for p in sel]))
    return (cx, cy, len(ys))


rows = []
for slot, info in P.items():
    hx = info["hex"]
    q = lab_of_hex(hx)
    best = []
    for f in FILES:
        im, w, h, lab = imgs[f]
        r = densest(lab, w, h, q)
        if r:
            best.append((r[2], f, r[0], r[1], w, h))
    best.sort(reverse=True)
    top = best[0] if best else None
    rows.append({"slot": slot, "hex": hx, "file": top[1], "x": top[2], "y": top[3],
                 "near": top[0], "mass": info["mass"], "note": info["note"]})
    print("%-26s %-9s %-7s (%4d,%4d)  near=%-6d mass=%-6d %s" %
          (slot, hx, top[1], top[2], top[3], top[0], info["mass"], info["note"]))

with open(os.path.join(OUT, "provenance.json"), "w", encoding="utf-8") as fh:
    json.dump(rows, fh, indent=1, ensure_ascii=False)

# contact sheet: 8 columns, one crop per token
CELL, PAD, LBL = 150, 10, 30
cols = 8
n = len(rows)
rowsn = (n + cols - 1) // cols
sheet = Image.new("RGB", (cols * CELL, rowsn * (CELL + PAD + LBL)), (16, 16, 20))
d = ImageDraw.Draw(sheet)
for i, row in enumerate(rows):
    f = row["file"]
    im, w, h, lab = imgs[f]
    half = 70
    box = (max(0, row["x"] - half), max(0, row["y"] - half),
           min(w, row["x"] + half), min(h, row["y"] + half))
    crop = im.crop(box).resize((CELL, CELL), Image.LANCZOS)
    x0 = (i % cols) * CELL
    y0 = (i // cols) * (CELL + PAD + LBL)
    sheet.paste(crop, (x0, y0))
    d.rectangle([x0, y0, x0 + CELL - 1, y0 + CELL - 1], outline=(60, 60, 70))
    d.text((x0 + 3, y0 + CELL + 2), "%s  %s" % (row["hex"], f), fill=(238, 238, 238))
    d.text((x0 + 3, y0 + CELL + 14), row["slot"][:22], fill=(150, 150, 165))
sheet.save(os.path.join(OUT, "provenance-sheet.png"))
print("sheet:", sheet.size)

