# -*- coding: utf-8 -*-
"""① 普查：五张参考图的色彩全貌（簇 / 色相族 / 明度族）。只读参考图。"""
import json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cp_core import IMAGES, FILES, REPO, PKG

ALL = np.concatenate([
    (np.asarray(Image.open(os.path.join(IMAGES, f)).convert("RGB")).astype(np.float32) / 255.0).reshape(-1, 3)
    for f in FILES], axis=0)

def hexs(a): return "#" + "".join("%02X" % int(round(v * 255)) for v in a)
def rgb_of(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)], dtype=float)
def hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(axis=-1), a.min(axis=-1); d = mx - mn
    h = np.zeros_like(mx)
    m = (mx == r) & (d > 0); h[m] = ((g - b)[m] / d[m]) % 6
    m = (mx == g) & (d > 0); h[m] = ((b - r)[m] / d[m]) + 2
    m = (mx == b) & (d > 0); h[m] = ((r - g)[m] / d[m]) + 4
    h = h * 60.0
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return h, s, mx

H, S, V = hsv(ALL)
out = {"images": FILES, "totalPixels": int(len(ALL)), "families": {}}
FAM = [
    ("yellow-core", 48, 68, 0.55, 0.70, 1.00), ("yellow-deep", 45, 70, 0.40, 0.30, 0.75),
    ("cyan-tech", 180, 215, 0.30, 0.40, 1.00), ("teal", 140, 180, 0.25, 0.30, 1.00),
    ("green", 70, 160, 0.25, 0.25, 1.00), ("red-hot", 340, 360, 0.55, 0.40, 1.00),
    ("red-hot2", 0, 12, 0.55, 0.40, 1.00), ("magenta", 300, 340, 0.35, 0.30, 1.00),
    ("violet", 250, 300, 0.25, 0.30, 1.00), ("blue", 215, 250, 0.30, 0.25, 1.00),
    ("orange-amber", 20, 45, 0.45, 0.40, 1.00), ("neutral-bright", 0, 360, 0.00, 0.55, 1.00),
    ("neutral-mid", 0, 360, 0.02, 0.30, 0.55), ("shadow", 0, 360, 0.00, 0.00, 0.20),
]
uniq, counts = np.unique((ALL * 255).round().astype(np.uint8).reshape(-1, 3), axis=0, return_counts=True)
for name, h0, h1, s0, v0, v1 in FAM:
    m = (H >= h0) & (H <= h1) & (S >= s0) & (V >= v0) & (V <= v1)
    px = ALL[m]
    if len(px) < 30: continue
    if len(px) > 60000:
        px = px[np.random.default_rng(7).choice(len(px), 60000, replace=False)]
    from sklearn.cluster import MiniBatchKMeans
    km = MiniBatchKMeans(n_clusters=3, random_state=11, n_init=6, batch_size=2048)
    km.fit(px); cnt = np.bincount(km.labels_, minlength=3)
    out["families"][name] = [{"hex": hexs(km.cluster_centers_[i]),
                              "pct": round(float(cnt[i]) / cnt.sum(), 4),
                              "pixels": int(m.sum())} for i in np.argsort(-cnt)]
    print("%-14s n=%-7d %s" % (name, int(m.sum()),
          "  ".join(hexs(km.cluster_centers_[i]) for i in np.argsort(-cnt))))
out["uniqueColors"] = int(len(uniq))
with open(os.path.join(PKG, "clusters.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print("→ clusters.json（%d 种不同颜色）" % len(uniq))
