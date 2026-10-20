# -*- coding: utf-8 -*-
"""色相普查：把三张海报的像素按色相扇区分桶，报告每个扇区的代表色 + 覆盖率。
目的：确认海报里到底有哪些色系可用（例如是否真的有绿色系给 success 槽）。"""
import os
import colorsys
import numpy as np
from PIL import Image

SRC = r"C:\Users\辰辰洋洋\Pictures\星球大战"
IMGS = ["1.jpg", "2.jpg", "3.jpg"]

SECTORS = [
    ("红 340-20", 340, 380), ("品红/绯 320-340", 320, 340), ("紫 260-320", 260, 320),
    ("蓝紫 230-260", 230, 260), ("蓝 200-230", 200, 230), ("青 180-200", 180, 200),
    ("青绿 160-180", 160, 180), ("绿 90-160", 90, 160), ("黄绿 60-90", 60, 90),
    ("黄 40-60", 40, 60), ("橙 20-40", 20, 40), ("暖红 0-20", 0, 20),
    ("无彩 0-360", 0, 360),
]


def sectors_of(h):
    out = []
    for name, lo, hi in SECTORS:
        if lo == 0 and hi == 360:
            continue
        if lo < hi:
            if lo <= h < hi:
                out.append(name)
        else:
            if h >= lo or h < hi:
                out.append(name)
    return out


def main():
    allpx = []
    per_img = {}
    for fn in IMGS:
        im = Image.open(os.path.join(SRC, fn)).convert("RGB")
        a = np.asarray(im).reshape(-1, 3).astype(np.float32)
        per_img[fn] = a
        allpx.append(a)
    A = np.vstack(allpx)
    Asub = A[::7]
    mx = Asub.max(axis=1)
    mn = Asub.min(axis=1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    hsv = np.array([colorsys.rgb_to_hsv(r / 255, g / 255, b / 255) for r, g, b in Asub], dtype=np.float32)
    hue = hsv[:, 0] * 360
    s = hsv[:, 1]
    v = hsv[:, 2]

    print("total sampled px: %d" % len(Asub))
    print("\n=== 色相扇区普查（三张合计） ===")
    for name, lo, hi in SECTORS:
        m = (sectors_of_all := None)
        if lo == 0 and hi == 360:
            m = sat < 0.12
        else:
            if lo < hi:
                m = (hue >= lo) & (hue < hi)
            else:
                m = (hue >= lo) | (hue < hi)
            m = m & (sat >= 0.12)
        idx = np.where(m)[0]
        if len(idx) == 0:
            print("  %-18s  (无)" % name)
            continue
        # 该扇区内取「高饱和高亮」的代表（最有信息量的那个色）
        sub = Asub[idx]
        score = sub[:, 1] * 0.5 + sub[:, 2] * 0.5
        order = np.argsort(-score)
        picks = []
        used = []
        for o in order:
            c = sub[o]
            # 去重：与已选色距离小于 40 就跳过
            if all(float(((c - u) ** 2).sum()) ** 0.5 > 40 for u in used):
                picks.append(c)
                used.append(c)
            if len(picks) >= 3:
                break
        hexes = "  ".join("#%02X%02X%02X" % tuple(int(round(x)) for x in p) for p in picks)
        print("  %-18s %5.2f%%   %s" % (name, len(idx) * 100.0 / len(Asub), hexes))

    print("\n=== 绿色系专项搜索（sat>=0.25, hue 95..175）===")
    m = (hue >= 95) & (hue <= 175) & (sat >= 0.25)
    idx = np.where(m)[0]
    print("  命中像素占比: %.3f%%  (%d px)" % (len(idx) * 100.0 / len(Asub), len(idx)))
    if len(idx):
        sub = Asub[idx]
        for fn in IMGS:
            a = per_img[fn]
            amx = a.max(axis=1); amn = a.min(axis=1)
            asat = np.where(amx > 0, (amx - amn) / np.maximum(amx, 1e-6), 0)
            g = a[:, 1]
            gm = (asat >= 0.25) & (g > a[:, 0] * 1.15) & (g > a[:, 2] * 1.05)
            print("    %s 绿感像素 %d (%.3f%%)" % (fn, gm.sum(), gm.sum() * 100.0 / len(a)))
        order = np.argsort(-(sub[:, 1] * 0.6 + sub[:, 2] * 0.4))
        for o in order[:12]:
            c = sub[o]
            h, ss, vv = colorsys.rgb_to_hsv(c[0] / 255, c[1] / 255, c[2] / 255)
            print("    #%02X%02X%02X  H%.0f S%.0f V%.0f" % (
                int(c[0]), int(c[1]), int(c[2]), h * 360, ss * 100, vv * 100))


main()
