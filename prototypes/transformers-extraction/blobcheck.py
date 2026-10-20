# -*- coding: utf-8 -*-
"""blobcheck.py — 量化「这个颜色在图上是不是一块看得见的色斑」。

判据：localPop = 在该像素周围 49×49 窗口内，与它 L1 距离 ≤ 6 的像素数。
  ≥ 240  → 一整片实色（≈15×15），肉眼一眼可见
  ≥ 60   → 8×8 的实色块，可辨
  < 20   → 孤点，JPEG 噪点级别，判负
"""
import os, sys, io, json
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stdout.reconfigure(line_buffering=True)
from sources import SRC_DIR, IMAGES


def rgb_of(h):
    h = h.lstrip("#")[:6]
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


ARR = {}
for fname, _, _ in IMAGES:
    im = Image.open(os.path.join(SRC_DIR, fname)).convert("RGB")
    W, H = im.size
    ARR[fname] = (W, H, np.asarray(im).reshape(-1, 3))


def local_pop(k, fname, R=24):
    W, H, a = ARR[fname]
    t = np.array(rgb_of(k), dtype=np.int16)
    mask = (np.abs(a.astype(np.int16) - t).sum(axis=1) <= 6).reshape(H, W)
    ys, xs = np.nonzero(mask)
    if len(ys) == 0:
        return 0, None
    ii = np.zeros((H + 1, W + 1), dtype=np.int32)
    ii[1:, 1:] = mask.cumsum(0).cumsum(1)
    y0 = np.clip(ys - R, 0, H); y1 = np.clip(ys + R + 1, 0, H)
    x0 = np.clip(xs - R, 0, W); x1 = np.clip(xs + R + 1, 0, W)
    s = ii[y1, x1] - ii[y0, x1] - ii[y1, x0] + ii[y0, x0]
    i = int(np.argmax(s))
    return int(s[i]), (int(xs[i]), int(ys[i]))


def best_blob(k):
    """这个颜色在五张图里最实的一块色斑有多大盘子"""
    best = (0, None, None)
    for fname in ARR:
        n, pos = local_pop(k, fname)
        if n > best[0]:
            best = (n, fname, pos)
    return best


if __name__ == "__main__":
    stage = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "_stage1.json"),
                           encoding="utf-8"))
    for name, k in stage["colors"].items():
        if name.endswith("Bg") and len(k) > 7:
            continue
        n, f, pos = best_blob(k)
        flag = "OK " if n >= 60 else ("weak" if n >= 20 else "FAIL")
        print("  %-20s %-9s 最大色斑 %6d px  %s  %s" % (name, k[:7], n, f or "-", flag))
