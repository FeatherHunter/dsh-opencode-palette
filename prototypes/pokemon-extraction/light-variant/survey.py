# -*- coding: utf-8 -*-
"""Survey the per-family supply for the LIGHT candidate."""
import json, colorsys
HIST = r'D:\Temp\pokemon-theme\histogram.json'
H = json.load(open(HIST, encoding='utf-8'))
GRAND = [(e['hex'].upper(), e['n']) for e in H['grand']]
PER = H['per_file']
FILES = {'01':'01-pikachu-official-pokedex-art.png','02':'2.jpg','03':'3.jpg','04':'4.jpg'}
WHERE = {}
for k, f in FILES.items():
    for e in PER[f]:
        WHERE.setdefault(e['hex'].upper(), []).append((k, e['n']))

def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def lin(v):
    s = v/255.0
    return s/12.92 if s <= 0.04045 else ((s+0.055)/1.055)**2.4
def lum(c):
    r,g,b = (lin(x) for x in c); return 0.2126*r+0.7152*g+0.0722*b
def cr(a,b):
    la,lb = lum(rgb(a)), lum(rgb(b)); hi,lo = max(la,lb), min(la,lb); return (hi+0.05)/(lo+0.05)
def hsv(c):
    r,g,b=[x/255 for x in c]; return colorsys.rgb_to_hsv(r,g,b)
def fam(h):
    c = rgb(h); s = hsv(c)[1]
    if s < 0.10: return 'neutral'
    hh = hsv(c)[0]*360
    if 25 <= hh <= 75: return 'gold'
    if 190 <= hh <= 250: return 'blue'
    if 100 <= hh <= 175: return 'green'
    if 10 <= hh < 25: return 'orange/red'
    return 'other'

MIN = 40
fam_rows = {}
for h, n in GRAND:
    if n < MIN: continue
    fam_rows.setdefault(fam(h), []).append((lum(rgb(h)), h, n))
for f in fam_rows: fam_rows[f].sort()

print('grand total colors:', len(GRAND), ' min n:', min(n for _, n in GRAND), ' n>=40 count:', sum(len(v) for v in fam_rows.values()))
for f, rows in fam_rows.items():
    print(f'\n===== {f}  ({len(rows)} colors, n>={MIN}) =====')
    for L, h, n in rows:
        c = rgb(h); hh, s, v = hsv(c)
        print(f'  {h}  n={n:7d}  L={L:.4f}  H={hh*360:6.1f} S={s:.2f}  vs#FFF={cr(h,"#FFFFFF"):5.2f}  vs#FDFBF6={cr(h,"#FDFBF6"):5.2f}')
