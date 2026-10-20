# -*- coding: utf-8 -*-
"""For each hue family, list ladder steps that clear 3:1 / 4.5:1 on a light ground,
so the light candidate can be sourced by 阶梯 (a real pixel on the image's own hue ladder).
"""
import json, colorsys

L = json.load(open(r'D:\Temp\pokemon-theme\ladders.json', encoding='utf-8'))

def lin(v):
    s = v/255.0
    return s/12.92 if s <= 0.04045 else ((s+0.055)/1.055)**2.4
def lum(c):
    r,g,b = (lin(x) for x in c); return 0.2126*r+0.7152*g+0.0722*b
def cr(a,b):
    la,lb=lum(a),lum(b); hi,lo=max(la,lb),min(la,lb); return (hi+0.05)/(lo+0.05)
def rgb(h):
    h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
def hsl(h):
    r,g,b=[x/255 for x in rgb(h)]
    hh,ll,ss=colorsys.rgb_to_hls(r,g,b)
    return hh*360, ss, ll

PAPER = rgb('#FEF9F1')   # candidate light ground
INK   = rgb('#1C1C22')
print(f'ground #FEF9F1 L={lum(PAPER):.4f}   ink #1C1C22 L={lum(INK):.4f}  cr(ink,ground)={cr(INK,PAPER):.2f}')

for fam, rows in L.items():
    print(f'\n########## family: {fam}  ({len(rows)} steps) ##########')
    # ladder steps whose contrast vs PAPER is in [3.0, 9.0]
    cand = []
    for e in rows:
        c = rgb(e['hex'])
        k = cr(c, PAPER)
        if 3.0 <= k <= 9.5 and e['n'] >= 1:
            cand.append((e, k))
    cand.sort(key=lambda t: -t[0]['L'])
    for e, k in cand:
        h, s, l = hsl(e['hex'])
        print(f"  {e['hex']} n={e['n']:6d} L={e['L']:.4f} H={h:6.1f} S={s:.2f}  vsPaper={k:5.2f}  vsInk={cr(rgb(e['hex']),INK):5.2f}")
