# -*- coding: utf-8 -*-
"""
census.py — 六张参考图的逐像素色簇普查（v3.5+「逐像素取色」判尺的第一步）

输出：每个颜色的 命中像素数 / 包围盒 / 色相 / 彩度 / CIE L*
按"成片度"排序，帮助挑出可当锚点的"地面色"（成片出现），
而不是抗锯齿细边（薄样本）。
"""
import os, json
from collections import Counter
from PIL import Image, ImageFilter

REF = os.environ.get('DORAEMON_REF',
                   r'C:\Users\辰辰洋洋\Pictures\哆啦A梦')
OUT = os.path.dirname(os.path.abspath(__file__))

def h2r(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
def r2h(rgb):
    return '#%02X%02X%02X' % tuple(max(0, min(255, int(v + 0.5))) for v in rgb)

def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def lab(rgb):
    r, g, b = [srgb_to_lin(v) for v in rgb]
    X = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
    Y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
    Z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041
    Xn, Yn, Zn = 0.95047, 1.0, 1.08883
    def f(t):
        return t ** (1 / 3) if t > 0.008856 else (7.787 * t + 16 / 116)
    fx, fy, fz = f(X / Xn), f(Y / Yn), f(Z / Zn)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))

def hue_chroma(rgb):
    r, g, b = rgb
    mx, mn = max(r, g, b), min(r, g, b)
    chroma = mx - mn
    if chroma == 0:
        return None, 0
    d = mx - mn
    if mx == r: h = 60 * (((g - b) / d) % 6)
    elif mx == g: h = 60 * (((b - r) / d) + 2)
    else: h = 60 * (((r - g) / d) + 4)
    return h, chroma

report = {}
allc = Counter()
for f in sorted(os.listdir(REF)):
    p = os.path.join(REF, f)
    im = Image.open(p).convert('RGB')
    im = im.filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.MedianFilter(3))
    cnt = Counter(im.getdata())
    report[f] = []
    for c, n in cnt.most_common(60):
        if n < 40: continue
        h, chroma = hue_chroma(c)
        L, a, bb = lab(c)
        report[f].append({
            'hex': r2h(c), 'px': n, 'pct': round(100.0 * n / (im.width * im.height), 3),
            'hue': None if h is None else round(h, 1),
            'chroma': chroma, 'Lstar': round(L, 1),
        })
    allc.update({(f, r2h(c)): n for c, n in cnt.items() if n >= 40})

with open(os.path.join(OUT, 'census.json'), 'w', encoding='utf-8') as fh:
    json.dump(report, fh, ensure_ascii=False, indent=1)

for f, rows in report.items():
    print('=' * 96)
    print(f)
    print('%-9s %7s %8s %7s %7s %7s' % ('hex', 'px', 'pct', 'hue', 'chroma', 'L*'))
    for r_ in rows[:30]:
        print('%-9s %7d %7.2f%% %7s %7d %7.1f'
              % (r_['hex'], r_['px'], r_['pct'], '-' if r_['hue'] is None else r_['hue'],
                 r_['chroma'], r_['Lstar']))
