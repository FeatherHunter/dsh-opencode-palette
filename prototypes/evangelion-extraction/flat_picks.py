# -*- coding: utf-8 -*-
"""对抗式审查实验：把「最近像素」吸附改成「平涂区代表色」吸附。

第一性原理：用户要的「颜色必须来自图里」，指的是**画面真的涂出来的颜色**，
不是 JPEG 压缩振铃或文字描边上的孤立像素。判据：
  ① 平坦：3×3 邻域方差低（不是边缘像素）
  ② 覆盖：同色像素数（Δ≤3）在图里有足够支撑
  ③ 同族：与声明色相不跑偏
在原像素位置附近搜索，满足 ①②③ 的最优解。
"""
from PIL import Image
import os, json, math, collections

SRC = r"C:\Users\辰辰洋洋\Pictures\新世纪福音战士"
HERE = os.path.dirname(os.path.abspath(__file__))

def h2r(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def r2h(t):
    return '#%02X%02X%02X' % tuple(max(0, min(255, int(round(v)))) for v in t)

def lum(h):
    v = []
    for c in h2r(h):
        c /= 255
        v.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]

imgs = {}
counts = collections.Counter()
for fn in ('1.jpg', '2.jpg', '3.jpg'):
    im = Image.open(os.path.join(SRC, fn)).convert('RGB')
    px = im.load()
    w, h = im.size
    imgs[fn] = (im, px, w, h)
    c = collections.Counter(im.get_flattened_data())
    counts.update(c)

def support(t, tol=3):
    """整图内与 t 距离 ≤ tol 的像素数（按精确色计数近似）"""
    n = 0
    for col, k in counts.items():
        if sum((col[i] - t[i]) ** 2 for i in range(3)) <= tol * tol:
            n += k
    return n

def flatness(fn, x, y):
    im, px, w, h = imgs[fn]
    vals = []
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            xx, yy = x + dx, y + dy
            if 0 <= xx < w and 0 <= yy < h:
                vals.append(px[xx, yy])
    var = 0.0
    for ch in range(3):
        m = sum(v[ch] for v in vals) / len(vals)
        var += sum((v[ch] - m) ** 2 for v in vals) / len(vals)
    return var / 3

def hue(h):
    r, g, b = (v / 255 for v in h2r(h))
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d == 0:
        return None
    if mx == r:
        hh = ((g - b) / d) % 6
    elif mx == g:
        hh = (b - r) / d + 2
    else:
        hh = (r - g) / d + 4
    return hh * 60

def hue_dist(a, b):
    if a is None or b is None:
        return 0.0
    d = abs(a - b) % 360
    return d if d <= 180 else 360 - d

def flat_pick(fn, near_xy, declared, radius=150, max_flat=260, hue_tol=28, need_support=20):
    """在 near_xy 附近找：平涂（3x3 方差小）+ 同族（色相不跑偏）+ 支撑足够 的代表色"""
    im, px, w, h = imgs[fn]
    dt = h2r(declared)
    dh = hue(declared)
    x0, y0 = near_xy
    cands = []
    for y in range(max(1, y0 - radius), min(h - 1, y0 + radius)):
        for x in range(max(1, x0 - radius), min(w - 1, x0 + radius)):
            p = px[x, y]
            d2 = sum((p[i] - dt[i]) ** 2 for i in range(3))
            if d2 > 30 * 30:
                continue
            if hue_dist(hue(r2h(p)), dh) > hue_tol:
                continue
            v = flatness(fn, x, y)
            if v > max_flat:
                continue
            cands.append((v, x, y, p))
    if not cands:
        return None
    # 先按方差升序，再在方差接近的里面挑支撑大的
    cands.sort(key=lambda c: (c[0] // 40, c[0]))
    best = None
    for v, x, y, p in cands:
        s = support(p)
        if s >= need_support:
            best = (v, x, y, p, s)
            break
    if best is None:
        v, x, y, p = cands[0]
        best = (v, x, y, p, support(p))
    return best

if __name__ == '__main__':
    P = json.load(open(os.path.join(HERE, 'palette.json'), encoding='utf-8'))
    out = {}
    print('%-12s %-7s %-9s %6s %7s | %-9s %6s %7s %8s  %s' % (
        'anchor', 'file', 'current', 'sup', 'flat', 'flat-pick', 'sup', 'flat', 'Δhue', 'near'))
    for name, a in sorted(P['anchors'].items()):
        fn = a['file']
        im, px, w, h = imgs[fn]
        # 当前像素坐标：找与 hex 最接近的位置
        t = h2r(a['hex'])
        bestxy = None
        for y in range(0, h, 2):
            for x in range(0, w, 2):
                p = px[x, y]
                d2 = sum((p[i] - t[i]) ** 2 for i in range(3))
                if bestxy is None or d2 < bestxy[0]:
                    bestxy = (d2, x, y)
        cur_sup = support(t)
        cur_flat = flatness(fn, bestxy[1], bestxy[2])
        r = flat_pick(fn, (bestxy[1], bestxy[2]), a['hex'])
        if r is None:
            print('%-12s %-7s %-9s %6d %7.0f | 无平涂候选' % (name, fn, a['hex'], cur_sup, cur_flat))
            continue
        v, x, y, p, s = r
        nh = r2h(p)
        print('%-12s %-7s %-9s %6d %7.0f | %-9s %6d %7.0f %8.1f  (%d,%d)' % (
            name, fn, a['hex'], cur_sup, cur_flat, nh, s, v, hue_dist(hue(nh), hue(a['hex'])), x, y))
        out[name] = {'file': fn, 'flatHex': nh, 'support': s, 'flatness': round(v, 1),
                     'xy': [x, y], 'curSupport': cur_sup, 'curFlatness': round(cur_flat, 1),
                     'curHex': a['hex'], 'hueShift': round(hue_dist(hue(nh), hue(a['hex'])), 1)}
    json.dump(out, open(os.path.join(HERE, 'flat-picks.json'), 'w', encoding='utf-8'),
              indent=1, ensure_ascii=False)
    print('\nflat-picks.json written')
