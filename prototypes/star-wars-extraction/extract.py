# -*- coding: utf-8 -*-
"""从三张星球大战海报里抽取真实颜色（k-means + 区域统计），供配色设计使用。
只报告图里真实存在的像素颜色，不做任何想象。
"""
import json
import math
import os
import colorsys

import numpy as np
from PIL import Image

SRC = r"C:\Users\辰辰洋洋\Pictures\星球大战"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = HERE

IMG = {
    "1.jpg": "天行者崛起 (The Force Awakens, 2015)",
    "2.jpg": "天行者的崛起 (The Rise of Skywalker, 2019)",
    "3.jpg": "最后的绝地武士 (The Last Jedi, 2017)",
}


def kmeans(data, k, iters=60, seed=7):
    """data: (N,3) float32 in 0..255. 返回 (k,3) 质心 与 每个像素最近簇的索引。"""
    rng = np.random.default_rng(seed)
    n = data.shape[0]
    # k-means++ 初始化
    centers = np.empty((k, 3), dtype=np.float32)
    idx = rng.integers(0, n)
    centers[0] = data[idx]
    d2 = ((data - centers[0]) ** 2).sum(axis=1)
    for i in range(1, k):
        probs = d2 / d2.sum() if d2.sum() > 0 else np.full(n, 1.0 / n)
        centers[i] = data[rng.choice(n, p=probs)]
        d2 = np.minimum(d2, ((data - centers[i]) ** 2).sum(axis=1))
    for _ in range(iters):
        dist = ((data[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)
        labels = dist.argmin(axis=1)
        newc = np.zeros_like(centers)
        for i in range(k):
            m = labels == i
            if m.any():
                newc[i] = data[m].mean(axis=0)
        if np.allclose(newc, centers, atol=0.6):
            centers = newc
            break
        centers = newc
    dist = ((data[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)
    labels = dist.argmin(axis=1)
    return centers, labels


def hexof(rgb):
    return "#%02X%02X%02X" % (int(round(rgb[0])), int(round(rgb[1])), int(round(rgb[2])))


def hsv_of(rgb):
    r, g, b = [v / 255.0 for v in rgb[:3]]
    return colorsys.rgb_to_hsv(r, g, b)


def analyze(path, name):
    im = Image.open(path).convert("RGB")
    W, H = im.size
    arr = np.asarray(im).reshape(-1, 3).astype(np.float32)
    total = arr.shape[0]

    out = {"file": name, "size": [W, H], "px": total}

    # 1) 整体主色（k=10）
    samp = arr[:: max(1, total // 40000)]
    cen, lab = kmeans(samp, 10)
    order = np.argsort(-np.bincount(lab, minlength=10))
    overall = []
    for i in order:
        c = cen[i]
        share = float((lab == i).sum()) / len(samp)
        h, s, v = hsv_of(c)
        overall.append({
            "hex": hexof(c), "rgb": [int(c[0]), int(c[1]), int(c[2])],
            "share": round(share * 100, 2),
            "hue": round(h * 360), "sat": round(s * 100), "val": round(v * 100),
        })
    out["overall"] = overall

    # 2) 高饱和像素（光剑 / 霓虹光）—— 找 S>=0.55
    mx = arr.max(axis=1)
    mn = arr.min(axis=1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    hi = arr[sat >= 0.55]
    out["saturated"] = []
    if len(hi) > 200:
        cs, ls = kmeans(hi[:: max(1, len(hi) // 20000)], 8)
        o = np.argsort(-np.bincount(ls, minlength=8))
        for i in o:
            c = cs[i]
            h, s, v = hsv_of(c)
            out["saturated"].append({
                "hex": hexof(c), "rgb": [int(c[0]), int(c[1]), int(c[2])],
                "hue": round(h * 360), "sat": round(s * 100), "val": round(v * 100),
            })

    # 3) 亮部（高光 / 白色标题 / 星云）
    lum = 0.2126 * arr[:, 0] + 0.7152 * arr[:, 1] + 0.0722 * arr[:, 2]
    thr = float(np.percentile(lum, 97))
    br = arr[lum >= thr]
    out["bright"] = []
    if len(br) > 200:
        cs, ls = kmeans(br[:: max(1, len(br) // 20000)], 6)
        o = np.argsort(-np.bincount(ls, minlength=6))
        for i in o:
            c = cs[i]
            h, s, v = hsv_of(c)
            out["bright"].append({
                "hex": hexof(c), "rgb": [int(c[0]), int(c[1]), int(c[2])],
                "hue": round(h * 360), "sat": round(s * 100), "val": round(v * 100),
            })

    # 4) 暗部（深空 / 阴影）
    thr2 = float(np.percentile(lum, 12))
    dk = arr[lum <= thr2]
    out["dark"] = []
    if len(dk) > 200:
        cs, ls = kmeans(dk[:: max(1, len(dk) // 20000)], 6)
        o = np.argsort(-np.bincount(ls, minlength=6))
        for i in o:
            c = cs[i]
            h, s, v = hsv_of(c)
            out["dark"].append({
                "hex": hexof(c), "rgb": [int(c[0]), int(c[1]), int(c[2])],
                "hue": round(h * 360), "sat": round(s * 100), "val": round(v * 100),
            })
    return out


def main():
    res = []
    for fn, title in IMG.items():
        p = os.path.join(SRC, fn)
        d = analyze(p, title)
        d["file"] = fn
        d["title"] = title
        res.append(d)
    with open(os.path.join(OUT, "extracted.json"), "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)

    for d in res:
        print("=" * 78)
        print("%s  %s  %sx%s" % (d["file"], d["title"], d["size"][0], d["size"][1]))
        for grp, tag in (("overall", "整体主色"), ("saturated", "高饱和(光剑/霓虹)"),
                         ("bright", "亮部(高光/标题)"), ("dark", "暗部(深空)")):
            print("  -- %s" % tag)
            for c in d[grp]:
                print("     %s  share=%5.2f%%  H%3d S%3d V%3d" % (
                    c["hex"], c.get("share", 0), c["hue"], c["sat"], c["val"]))
    print("\nwritten:", os.path.join(OUT, "extracted.json"))


main()
