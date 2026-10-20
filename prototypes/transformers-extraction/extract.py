# -*- coding: utf-8 -*-
"""extract.py — 五张参考图的逐像素取色。

做三件事：
  1) 每张图跑 median-cut 量化 + k-means 聚类，得到「主色簇」；
  2) 按 15° 色相扇区做材质普查（含绿色专项），得到「色相中位色」——这才是品牌色的来源；
  3) 为每个签名色在原图上定位一块「取色现场」（像素最接近该色的区域中心），供预览页内联实拍裁切。

输出 extracted.json（结论 + 取色现场坐标）。不写仓库任何文件。
"""
import os, sys, io, json, colorsys
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from sources import SRC_DIR, IMAGES, SIGNATURES


def hx(c):
    return "#%02X%02X%02X" % tuple(int(round(max(0, min(255, v)))) for v in c)


def rgb_of(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def kmeans(X, k=12, iters=30, seed=11):
    rng = np.random.default_rng(seed)
    C = X[rng.choice(len(X), size=k, replace=False)].astype(np.float64).copy()
    for _ in range(iters):
        lab = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
        for j in range(k):
            m = lab == j
            if m.sum():
                C[j] = X[m].mean(axis=0)
    lab = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
    out = []
    for j in range(k):
        m = lab == j
        if not m.sum():
            continue
        out.append({"hex": hx(C[j]), "pct": round(100.0 * m.sum() / len(X), 2)})
    return sorted(out, key=lambda x: -x["pct"])


def hue_medians(a):
    """a: HxWx3 uint8 → 15° 扇区中位色（只收 S≥0.45 且 6%<L<97% 的像素）"""
    buckets = {}
    for px in a.reshape(-1, 3):
        r, g, b = px / 255.0
        h, l, s = colorsys.rgb_to_hls(r, g, b)
        if s < 0.45 or l < 0.06 or l > 0.97:
            continue
        buckets.setdefault(int(h * 360) // 15, []).append((px, s, l))
    out = []
    for k in sorted(buckets):
        items = buckets[k]
        if len(items) < 40:
            continue
        med = np.median(np.array([i[0] for i in items], dtype=np.float64), axis=0)
        out.append({"h": k * 15, "hex": hx(med), "n": len(items),
                    "s": round(float(np.median([i[1] for i in items])), 2),
                    "l": round(float(np.median([i[2] for i in items])), 2)})
    return out


def find_crop(path, target, size=64):
    """在图里找该色最密集的区块，返回 (left, top, w, h)"""
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(np.int16)
    d = np.abs(a - np.array(target, dtype=np.int16)).sum(axis=2)
    close = (d <= 24).astype(np.uint8)
    if close.sum() < 8:                      # 没有近邻就放宽
        close = (d <= 90).astype(np.uint8)
    ys, xs = np.nonzero(close)
    if len(xs) == 0:
        return None
    cx, cy = int(np.median(xs)), int(np.median(ys))
    half = size // 2
    left = max(0, min(im.width - size, cx - half))
    top = max(0, min(im.height - size, cy - half))
    return (left, top, left + size, top + size)


def main():
    report = {"srcDir": SRC_DIR, "images": {}, "signatures": []}
    for fname, title, desc in IMAGES:
        path = os.path.join(SRC_DIR, fname)
        im = Image.open(path).convert("RGB")
        small = im.resize((200, max(1, int(200 * im.height / im.width))), Image.LANCZOS)
        arr = np.asarray(small)
        flat = arr.reshape(-1, 3).astype(np.float64)
        q = im.quantize(colors=16, method=Image.MEDIANCUT)
        pal = q.getpalette()[: 16 * 3]
        counts = sorted(q.getcolors(), reverse=True)
        mc = [{"hex": hx(pal[i * 3:i * 3 + 3]), "pct": round(100.0 * c / (im.width * im.height), 2)}
              for c, i in counts]
        hm = hue_medians(arr)
        report["images"][fname] = {
            "title": title, "desc": desc, "size": list(im.size),
            "medianCut": mc, "kmeans": kmeans(flat), "hueMedians": hm,
        }
        print("%s  %s  median-cut %d 色 / 色相中位 %d 段" % (fname, im.size, len(mc), len(hm)))

    for hexv, fname, label, token in SIGNATURES:
        path = os.path.join(SRC_DIR, fname)
        box = find_crop(path, rgb_of(hexv))
        report["signatures"].append({"hex": hexv, "file": fname, "label": label,
                                     "token": token, "box": list(box) if box else None})
        print("签名 %s %-12s %-8s %s" % (hexv, fname, label, box))

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "extracted.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)
    print("\nwritten:", out)


if __name__ == "__main__":
    main()
