# -*- coding: utf-8 -*-
"""query_pixels.py — 按「岗位需求」检索五张图里的真实像素，并用「像素人口」排序。

为什么不用「这个 hex 恰好等于某个像素」：JPEG 压缩会在平坦区制造大量一次性噪点像素，
任何颜色都能靠一个杂散像素「凑」成直采——那是弱证明。
真正要证明的是：**这个颜色是图里一片真实区域的代表色**，
所以这里用「ΔRGB ≤ 6 的邻域像素人口」当排序键，人口越大说明这个色越是这片图的主色。
"""
import os, sys, io, json, colorsys
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from sources import SRC_DIR, IMAGES

HERE = os.path.dirname(os.path.abspath(__file__))


def rgb_of(h):
    h = h.lstrip("#")[:6]
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def hx(c):
    return "#%02X%02X%02X" % tuple(int(round(v)) for v in c)


def lum(rgb):
    if isinstance(rgb, str):
        rgb = rgb_of(rgb)
    def lin(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = [lin(v) for v in rgb]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def hsl(rgb):
    r, g, b = [v / 255 for v in rgb]
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    d = mx - mn
    if d == 0:
        return 0.0, 0.0, l
    if mx == r:
        h = ((g - b) / d) % 6
    elif mx == g:
        h = (b - r) / d + 2
    else:
        h = (r - g) / d + 4
    h *= 60
    s = 0 if l in (0, 1) else d / (1 - abs(2 * l - 1))
    return h, s, l


IMGS = {}
for fname, _, _ in IMAGES:
    a = np.asarray(Image.open(os.path.join(SRC_DIR, fname)).convert("RGB")).reshape(-1, 3)
    IMGS[fname] = a
ALL = np.concatenate([a for a in IMGS.values()], axis=0)

PANEL = "#111832"
CODE = "#050811"


def ratio(a, b):
    l1, l2 = lum(a), lum(b)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def population(hexv, radius=6):
    """ΔRGB ≤ radius 的像素人口，按图统计"""
    t = np.array(rgb_of(hexv), dtype=np.int16)
    out = {}
    for f, a in IMGS.items():
        d = np.abs(a.astype(np.int16) - t).sum(axis=1)
        out[f] = int((d <= radius).sum())
    out["exact"] = int((np.abs(ALL.astype(np.int16) - t).sum(axis=1) == 0).sum())
    return out


def query(name, hue_lo, hue_hi, min_lum=0.0, max_lum=1.0, min_sat=0.0,
          cand=None, top=10):
    """在候选像素里按（色相窗 / 亮度窗 / 彩度窗）+ 像素人口排序"""
    t = np.array(rgb_of(cand), dtype=np.int16) if cand else None
    mask = np.ones(len(ALL), dtype=bool)
    if t is not None:
        mask &= (np.abs(ALL.astype(np.int16) - t).sum(axis=1) <= 18)
    sub = ALL[mask]
    if len(sub) == 0:
        print("\n### %s → 无候选" % name)
        return []
    hs = np.array([hsl(tuple(int(v) for v in px)) for px in sub[::7]])
    keep = (hs[:, 0] >= hue_lo) & (hs[:, 0] <= hue_hi) & \
           (np.array([lum(tuple(int(v) for v in px)) for px in sub[::7]]) >= min_lum) & \
           (np.array([lum(tuple(int(v) for v in px)) for px in sub[::7]]) <= max_lum) & \
           (hs[:, 1] >= min_sat)
    sub = sub[::7][keep]
    if len(sub) == 0:
        print("\n### %s → 无候选" % name)
        return []
    u, cnt = np.unique(sub, axis=0, return_counts=True)
    rows = []
    for px, c in zip(u, cnt):
        pop = population(hx(px))
        rows.append((sum(pop.values()), hx(px), pop, c))
    rows.sort(reverse=True)
    print("\n### %s" % name)
    for tot, h, pop, c in rows[:top]:
        L = lum(h)
        print("   %s  lum %.4f  panel %5.2f  code %5.2f  人口 %6d  %s" %
              (h, L, ratio(h, PANEL), ratio(h, CODE), tot,
               " ".join("%s:%d" % (k, v) for k, v in pop.items() if v)))
    return rows


if __name__ == "__main__":
    print("五张图合计像素：%d" % len(ALL))
    print("（口径：像素人口 = ΔRGB≤6 的邻域像素数，代表这个色在图里有多「成片」）")

    query("primary 徽章红（要 lum≥0.13）", 340, 358, 0.130, 0.30, 0.60, "#CD0924")
    query("error 熔炉红", 0, 18, 0.135, 0.30, 0.60, "#DA0E09")
    query("success 翠绿", 140, 175, 0.150, 0.60, 0.25, "#5EBA90")
    query("success 翠绿（放宽）", 100, 175, 0.130, 0.60, 0.18, "#5EBA90")
    query("info 全息青", 185, 200, 0.150, 0.35, 0.45, "#0686AC")
    query("warning 琥珀", 30, 48, 0.30, 0.60, 0.70, "#E99F29")
    query("borderActive 车漆黄", 42, 58, 0.55, 0.72, 0.85, "#FBC701")
    query("markdownHeading 日轮淡金", 42, 58, 0.45, 0.80, 0.50, "#EFD34C")
    query("syntaxFunction 车漆深金", 35, 52, 0.28, 0.50, 0.65, "#CB9410")
    query("syntaxType 洋红", 300, 330, 0.185, 0.75, 0.45, "#DE1BBA")
    query("markdownCode 粉（Arcee）", 300, 330, 0.185, 0.75, 0.45, "#DE1BBA")
    query("markdownEmph 火焰橙", 15, 35, 0.20, 0.55, 0.60, "#F16312")
    query("syntaxNumber 暖橙", 15, 35, 0.25, 0.60, 0.60, "#EB8E48")
    query("text 钢白", 190, 215, 0.55, 0.85, 0.03, "#DAE7EA")
    query("textMuted 钢灰蓝", 190, 220, 0.30, 0.60, 0.03, "#A3BBC4")
    query("syntaxString 钢灰蓝", 185, 215, 0.25, 0.55, 0.02, "#97A2A5")
    query("syntaxComment 钢灰", 180, 215, 0.185, 0.45, 0.02, "#708082")
    query("syntaxOperator 雾蓝", 195, 225, 0.185, 0.45, 0.06, "#6E8397")
    query("diffAdded 橄榄", 55, 85, 0.18, 0.45, 0.10, "#90947B")
    query("diffRemoved 锈铜", 28, 50, 0.18, 0.45, 0.22, "#A28342")
    query("markdownBlockQuote 尘褐", 20, 48, 0.185, 0.45, 0.04, "#AD9886")
    query("markdownLink 电光蓝", 198, 215, 0.20, 0.45, 0.60, "#138FE7")
    query("border 钢板蓝", 195, 230, 0.045, 0.12, 0.12, "#354A5C")
    query("markdownStrong 纯白", 0, 360, 0.80, 1.0, 0.0, "#FCFDFD")
