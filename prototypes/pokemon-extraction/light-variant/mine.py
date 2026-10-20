# -*- coding: utf-8 -*-
"""Mine the pokemon image supply for a LIGHT theme candidate.
Reads only D:\\Temp\\pokemon-theme\\histogram.json (per-file exact-pixel counts).
Never writes outside adv3.
"""
import json, os, colorsys, sys

HIST = r'D:\Temp\pokemon-theme\histogram.json'
H = json.load(open(HIST, encoding='utf-8'))
PER = H['per_file']
GRAND = {e['hex'].upper(): e['n'] for e in H['grand']}

FILES = {
    '01': '01-pikachu-official-pokedex-art.png',
    '02': '2.jpg',
    '03': '3.jpg',
    '04': '4.jpg',
}

def rgb(h):
    h = h.lstrip('#')
    if len(h) == 3: h = ''.join(c*2 for c in h)
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def hx(c):
    return '#%02X%02X%02X' % tuple(c)

def lin(v):
    s = v/255.0
    return s/12.92 if s <= 0.04045 else ((s+0.055)/1.055)**2.4

def lum(c):
    r, g, b = (lin(x) for x in c)
    return 0.2126*r + 0.7152*g + 0.0722*b

def cr(a, b):
    la, lb = lum(rgb(a)) if isinstance(a, str) else lum(a), lum(rgb(b)) if isinstance(b, str) else lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi+0.05)/(lo+0.05)

def hsv(c):
    r, g, b = [x/255 for x in c]
    return colorsys.rgb_to_hsv(r, g, b)

def hue(c):
    return hsv(c)[0]*360

def sat(c):
    return hsv(c)[1]

def luma(c):
    r, g, b = c
    return (0.299*r + 0.587*g + 0.114*b)/255

def find(hexstr):
    hits = []
    for k, f in FILES.items():
        for e in PER[f]:
            if e['hex'].upper() == hexstr.upper():
                hits.append((k, e['n']))
    return hits, GRAND.get(hexstr.upper(), 0)

def fam(c):
    h, s, v = hsv(c)
    if s < 0.10: return 'neutral'
    hh = h*360
    if 25 <= hh <= 75: return 'gold'
    if 190 <= hh <= 250: return 'blue'
    if 100 <= hh <= 175: return 'green'
    if 10 <= hh < 25: return 'orange/red'
    return 'other'

def ladder(famname, minn=12, top=None):
    rows = []
    for c, n in GRAND.items():
        if n < minn: continue
        if fam(rgb(c)) != famname: continue
        rows.append((lum(rgb(c)), c, n))
    rows.sort()
    if top: rows = rows[:top]
    return rows

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'help'
    if cmd == 'find':
        for hxq in sys.argv[2:]:
            hits, g = find(hxq)
            print(f'{hxq}: total={g}  per-file={hits}')
    elif cmd == 'ladder':
        f = sys.argv[2]; mn = int(sys.argv[3]) if len(sys.argv) > 3 else 12
        rows = ladder(f, mn)
        print(f'--- {f} ({len(rows)} colors n>={mn}) ---')
        for L, c, n in rows:
            print(f'  {hx(c)}  n={n:7d}  L={L:.5f}  H={hue(c):6.1f} S={sat(c):.2f} luma={luma(rgb(c)):.3f}  vsWhite={cr(c,"#FFFFFF"):5.2f} vsInk={cr(c,"#1C1C22"):5.2f}')
    elif cmd == 'contrast':
        a = sys.argv[2]; b = sys.argv[3]
        print(f'{a} / {b} = {cr(a,b):.3f}')
