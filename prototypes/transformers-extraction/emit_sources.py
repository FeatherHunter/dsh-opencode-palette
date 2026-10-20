# -*- coding: utf-8 -*-
"""emit_sources.py — 把求解结果写成「配方 + 锚点 + 人口」的最终表，并生成 sources.py 的 TOKENS 段。

每个直采色位都要输出：它在哪张图、是哪个真实像素、邻域（ΔRGB≤6）有多少像素支撑。
"""
import os, sys, io, json
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from sources import SRC_DIR, IMAGES

HERE = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(HERE, "_stage1.json"), encoding="utf-8"))
C = S["colors"]
LAD = S["ladder"]


def rgb_of(h):
    h = h.lstrip("#")[:6]
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def hx(c):
    return "#%02X%02X%02X" % tuple(int(round(v)) for v in c)


IMGS = {}
for fname, _, _ in IMAGES:
    IMGS[fname] = np.asarray(Image.open(os.path.join(SRC_DIR, fname)).convert("RGB")).reshape(-1, 3)


def provenance(hexv):
    t = np.array(rgb_of(hexv), dtype=np.int16)
    best = None
    for f, a in IMGS.items():
        d = np.abs(a.astype(np.int16) - t).sum(axis=1)
        near = int((d <= 6).sum())
        exact = int((d == 0).sum())
        if best is None or near > best[1]:
            best = (f, near, exact)
    return best


print("=" * 100)
for k, v in C.items():
    if k in LAD:
        kind, base, note, hexv = LAD[k]
        f, near, exact = provenance(base)
        print("%-26s %-9s 阶梯 ← %s (%s，邻域 %d px / 精确 %d px)" % (k, v, base, f, near, exact))
    elif k.endswith("Bg") and k.startswith("diff"):
        src = "diffAdded" if "Added" in k else "diffRemoved"
        f, near, exact = provenance(C[src])
        print("%-26s %-9s 叠透 ← %s (%s)" % (k, v, C[src], f))
    else:
        f, near, exact = provenance(v)
        print("%-26s %-9s 直采 %s（邻域 %d px / 精确 %d px）" % (k, v, f, near, exact))
