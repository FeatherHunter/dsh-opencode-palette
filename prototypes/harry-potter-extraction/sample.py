# -*- coding: utf-8 -*-
"""Precise modal-colour extraction for the iconic elements of the 4 reference images.

For each named element we take a bounding box + an optional hue band and return:
  modal  = most common quantised colour in the box (the 'true' flat colour of that object)
  vivid  = most saturated colour in the band (the poster's brightest rendering of it)
  mean   = straight average
These become the palette's sampled anchors.
"""
import json
import os

import numpy as np
from PIL import Image

SRC = r"C:\Users\辰辰洋洋\Pictures\哈利波特"
OUT = os.path.dirname(os.path.abspath(__file__))

# file, x0,y0,x1,y1, label, hue-band (lo,hi) or None
ELEMENTS = [
    # ---------- 4.jpg : Chinese theatrical poster ----------
    ("4.jpg", 0.015, 0.012, 0.30, 0.085, "HP 银色 LOGO 字体", (180, 260)),
    ("4.jpg", 0.44, 0.012, 0.56, 0.085, "WIZARDING WORLD 银标", (180, 260)),
    ("4.jpg", 0.27, 0.545, 0.80, 0.630, "金色片名 哈利·波特", (28, 60)),
    ("4.jpg", 0.47, 0.632, 0.73, 0.675, "副题 与魔法石", (28, 60)),
    ("4.jpg", 0.02, 0.60, 0.24, 0.72, "片名后蓝雾", (185, 225)),
    ("4.jpg", 0.60, 0.005, 0.98, 0.045, "夜空顶", (200, 240)),
    ("4.jpg", 0.66, 0.02, 0.98, 0.10, "夜空云层", (195, 235)),
    ("4.jpg", 0.79, 0.775, 0.95, 0.865, "霍格沃茨特快 车身红", (340, 20)),
    ("4.jpg", 0.685, 0.700, 0.775, 0.745, "5972 车牌金", (28, 62)),
    ("4.jpg", 0.705, 0.790, 0.775, 0.840, "车窗暖灯", (25, 55)),
    ("4.jpg", 0.02, 0.40, 0.17, 0.55, "霍格沃茨城堡剪影", (200, 250)),
    ("4.jpg", 0.80, 0.31, 0.95, 0.50, "邓布利多黑袍", None),
    ("4.jpg", 0.385, 0.275, 0.50, 0.375, "哈利面部", (15, 40)),
    ("4.jpg", 0.40, 0.40, 0.62, 0.47, "哈利青领", (185, 215)),
    ("4.jpg", 0.03, 0.86, 0.34, 0.93, "底部红金字幕区", (0, 40)),
    # ---------- images.jpg : the ice chamber trio ----------
    ("images.jpg", 0.44, 0.03, 0.66, 0.20, "冰窟亮蓝", (185, 215)),
    ("images.jpg", 0.02, 0.02, 0.18, 0.20, "冰窟深蓝阴影", (195, 235)),
    ("images.jpg", 0.42, 0.12, 0.52, 0.22, "冰晶近白高光", None),
    ("images.jpg", 0.86, 0.05, 0.99, 0.20, "冰面亮蓝", (185, 210)),
    ("images.jpg", 0.62, 0.02, 0.74, 0.16, "哈利黑发", None),
    ("images.jpg", 0.62, 0.44, 0.72, 0.54, "哈利面部", (15, 40)),
    ("images.jpg", 0.55, 0.80, 0.60, 0.88, "哈利领结红", (340, 20)),
    ("images.jpg", 0.575, 0.87, 0.615, 0.94, "哈利领结金", (30, 58)),
    ("images.jpg", 0.30, 0.56, 0.40, 0.64, "赫敏面部", (15, 40)),
    ("images.jpg", 0.05, 0.86, 0.20, 0.95, "罗恩黑袍", None),
    # ---------- 2.jpg : firelit close-up ----------
    ("2.jpg", 0.30, 0.755, 0.68, 0.815, "白衬衫", None),
    ("2.jpg", 0.455, 0.845, 0.520, 0.900, "领带 酒红条", (340, 20)),
    ("2.jpg", 0.520, 0.845, 0.580, 0.900, "领带 金条", (32, 56)),
    ("2.jpg", 0.25, 0.05, 0.75, 0.19, "哈利棕发", (18, 42)),
    ("2.jpg", 0.30, 0.29, 0.70, 0.33, "眼镜金丝", (25, 55)),
    ("2.jpg", 0.40, 0.45, 0.60, 0.55, "面部皮肤", (12, 38)),
    ("2.jpg", 0.02, 0.02, 0.16, 0.16, "木墙暗部", None),
    ("2.jpg", 0.80, 0.03, 0.99, 0.22, "木墙暖棕", (15, 40)),
    ("2.jpg", 0.03, 0.80, 0.25, 0.98, "黑袍", None),
    # ---------- 3.jpg : the merch plate ----------
    ("3.jpg", 0.62, 0.03, 0.95, 0.14, "白背景", None),
    ("3.jpg", 0.07, 0.45, 0.16, 0.85, "格兰芬多黑袍", None),
    ("3.jpg", 0.125, 0.285, 0.150, 0.340, "袍身金边", (30, 58)),
    ("3.jpg", 0.108, 0.360, 0.135, 0.420, "袍身猩红里衬", (340, 20)),
    ("3.jpg", 0.175, 0.155, 0.235, 0.330, "陈列领带 红", (340, 20)),
    ("3.jpg", 0.175, 0.155, 0.235, 0.330, "陈列领带 金", (30, 58)),
    ("3.jpg", 0.490, 0.085, 0.700, 0.175, "哈利棕发", (18, 42)),
    ("3.jpg", 0.545, 0.170, 0.660, 0.205, "眼镜", (25, 55)),
    ("3.jpg", 0.615, 0.400, 0.700, 0.480, "格兰芬多徽章红", (345, 15)),
    ("3.jpg", 0.605, 0.385, 0.710, 0.495, "徽章金边", (30, 58)),
    ("3.jpg", 0.395, 0.560, 0.470, 0.640, "魔杖木色", (18, 45)),
    ("3.jpg", 0.520, 0.250, 0.640, 0.310, "哈利面部", (12, 38)),
]


def hsv(a):
    a = a.astype(np.float32) / 255.0
    mx = a.max(axis=-1); mn = a.min(axis=-1); d = mx - mn
    h = np.zeros_like(mx)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    nz = d > 1e-6
    i = nz & (mx == r); h[i] = ((g[i] - b[i]) / d[i]) % 6
    i = nz & (mx == g); h[i] = (b[i] - r[i]) / d[i] + 2
    i = nz & (mx == b); h[i] = (r[i] - g[i]) / d[i] + 4
    h *= 60.0
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    return h, s, mx


def hexs(rgb):
    return "#%02X%02X%02X" % (int(round(rgb[0])), int(round(rgb[1])), int(round(rgb[2])))


def extract(f, x0, y0, x1, y1, band):
    im = Image.open(os.path.join(SRC, f)).convert("RGB")
    w, h = im.size
    crop = im.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
    a = np.asarray(crop, dtype=np.float32)
    H, S, V = hsv(a)
    if band:
        lo, hi = band
        if lo <= hi:
            m = (H >= lo) & (H <= hi)
        else:
            m = (H >= lo) | (H <= hi)
        m &= (S >= 0.24) & (V >= 0.20)
        if m.sum() >= 12:
            a = a[m]; H, S, V = H[m], S[m], V[m]
    flat = a.reshape(-1, 3)
    if flat.size == 0:
        return None
    H, S, V = H.ravel(), S.ravel(), V.ravel()
    # modal colour on a 5-bit-per-channel grid (finer than 4-bit)
    q = (flat.astype(int) >> 3)
    keys = q[:, 0] * 1024 + q[:, 1] * 32 + q[:, 2]
    vals, counts = np.unique(keys, return_counts=True)
    best = vals[np.argmax(counts)]
    sel = keys == best
    modal = hexs(flat[sel].mean(axis=0))
    # brightest representative in the band (what the poster actually renders at full strength)
    order = np.argsort(-V)
    vivid = hexs(flat[order[0]])
    # most chromatic representative
    vivid_s = hexs(flat[np.argmax(S)])
    return {
        "modal": modal,
        "vivid": vivid,
        "vivid_s": vivid_s,
        "mean": hexs(flat.mean(axis=0)),
        "n": int(flat.shape[0]),
    }


res = []
for f, x0, y0, x1, y1, label, band in ELEMENTS:
    r = extract(f, x0, y0, x1, y1, band)
    if not r:
        continue
    r.update({"file": f, "label": label, "rect": [x0, y0, x1, y1], "band": list(band) if band else None})
    res.append(r)
    print("%-9s %-9s %-9s  %-22s  band=%s" % (r["modal"], r["vivid"], r["mean"], label, band))

with open(os.path.join(OUT, "elements.json"), "w", encoding="utf-8") as fp:
    json.dump(res, fp, ensure_ascii=False, indent=1)
