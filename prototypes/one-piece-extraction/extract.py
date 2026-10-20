# -*- coding: utf-8 -*-
"""extract.py — 从三张海贼王参考图里确定性取色。

规则：任何进入主题的颜色都必须来自本脚本的采样输出（聚类中心 / 区域均值），
不接受"想象"出来的色相。
"""
import json, math, os, sys
from collections import Counter
import numpy as np
from PIL import Image

SRC = r"C:\Users\辰辰洋洋\Pictures\海贼王"
IMAGES = {
    "images.jpg": "路飞 · 草帽（晴空）",
    "2.jpg": "ONE PIECE 标志（天海）",
    "3.jpg": "草帽团全员（沙滩）",
}
OUT = r"D:\dsh-plugin\dsh-opencode-palette\prototypes\one-piece-extraction"


def srgb_to_lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def rel_lum(rgb):
    r, g, b = srgb_to_lin(np.array(rgb, dtype=float))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = rel_lum(a), rel_lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def hexs(rgb):
    return "#%02X%02X%02X" % tuple(int(round(v)) for v in rgb)


def hex2rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=float)


def rgb2hsv(rgb):
    import colorsys
    r, g, b = [v / 255.0 for v in rgb]
    return colorsys.rgb_to_hsv(r, g, b)


def kmeans(px, k, seed=7, iters=60):
    rng = np.random.default_rng(seed)
    # k-means++ 初始化
    centers = [px[rng.integers(len(px))]]
    for _ in range(k - 1):
        d = np.min(np.stack([np.sum((px - c) ** 2, axis=1) for c in centers]), axis=0)
        p = d / d.sum() if d.sum() > 0 else np.full(len(px), 1 / len(px))
        centers.append(px[rng.choice(len(px), p=p)])
    centers = np.array(centers, dtype=float)
    for _ in range(iters):
        dist = np.sum((px[:, None, :] - centers[None, :, :]) ** 2, axis=2)
        labels = dist.argmin(axis=1)
        new = centers.copy()
        for i in range(k):
            m = labels == i
            if m.any():
                new[i] = px[m].mean(axis=0)
        if np.allclose(new, centers, atol=0.6):
            centers = new
            break
        centers = new
    dist = np.sum((px[:, None, :] - centers[None, :, :]) ** 2, axis=2)
    labels = dist.argmin(axis=1)
    return centers, labels


def patch(arr, x, y, r=3):
    """取 (x,y) 邻域 r 像素的均值（去 JPEG 噪点），越界裁剪。"""
    h, w = arr.shape[:2]
    x0, x1 = max(0, x - r), min(w, x + r + 1)
    y0, y1 = max(0, y - r), min(h, y + r + 1)
    return arr[y0:y1, x0:x1].reshape(-1, 3).mean(axis=0)


report = {"images": {}, "samples": {}}

for fname, label in IMAGES.items():
    path = os.path.join(SRC, fname)
    im = Image.open(path).convert("RGB")
    arr = np.asarray(im).astype(float)
    H, W = arr.shape[:2]
    small = np.asarray(Image.open(path).convert("RGB").resize((160, int(160 * H / W))))
    px = small.reshape(-1, 3)
    k = 14
    centers, labels = kmeans(px, k)
    counts = Counter(labels.tolist())
    total = len(labels)
    # 每个聚类在原图里的平均位置
    sw = small.shape[1]
    ys, xs = np.mgrid[0:small.shape[0], 0:small.shape[1]]
    flat_y, flat_x = ys.ravel(), xs.ravel()
    rows = []
    for i, c in enumerate(centers):
        m = labels == i
        share = counts[i] / total
        cy = float(flat_y[m].mean() / small.shape[0] * H)
        cx = float(flat_x[m].mean() / sw * W)
        # 该聚类在原图里的代表像素坐标（离质心最近者）
        cxy = (cx, cy)
        rgb = np.array([int(round(v)) for v in c])
        hsv = rgb2hsv(rgb)
        rows.append({
            "hex": hexs(rgb),
            "rgb": [int(v) for v in rgb],
            "share": round(share * 100, 2),
            "at": [int(round(cx)), int(round(cy))],
            "h": round(hsv[0] * 360, 1),
            "s": round(hsv[1] * 100, 1),
            "v": round(hsv[2] * 100, 1),
            "lum": round(float(rel_lum(rgb)), 4),
            "patch_at": [int(round(cx)), int(round(cy))],
        })
    rows.sort(key=lambda r: -r["share"])
    report["images"][fname] = {"label": label, "size": [W, H], "clusters": rows}
    print(f"=== {fname} ({label}) {W}x{H} ===")
    for r in rows:
        print(f"  {r['hex']}  {r['share']:5.2f}%  @({r['at'][0]:>3},{r['at'][1]:>3})  "
              f"H{r['h']:>5.1f} S{r['s']:>5.1f} V{r['v']:>5.1f}  L{r['lum']:.4f}")

with open(os.path.join(OUT, "clusters.json"), "w", encoding="utf-8") as f:
    json.dump(report, f, ensure_ascii=False, indent=2)
print("\nwrote", os.path.join(OUT, "clusters.json"))
