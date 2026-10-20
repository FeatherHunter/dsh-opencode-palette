# -*- coding: utf-8 -*-
"""palette lab: for every candidate hex print HSL, luminance, contrast vs key surfaces, ΔE76 vs the syntax core."""
import json, colorsys, sys, itertools

def rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def lin(v):
    s = v/255.0
    return s/12.92 if s <= 0.04045 else ((s+0.055)/1.055)**2.4
def lum(h):
    r, g, b = (lin(x) for x in rgb(h)); return 0.2126*r+0.7152*g+0.0722*b
def cr(a, b):
    la, lb = lum(a), lum(b); hi, lo = max(la, lb), min(la, lb); return (hi+0.05)/(lo+0.05)
def hsl(h):
    r, g, b = [x/255 for x in rgb(h)]
    hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
    return hh*360, ss, ll
def lab(h):
    r, g, b = (lin(x) for x in rgb(h))
    x = (0.4124564*r + 0.3575761*g + 0.1804375*b)/0.95047
    y = (0.2126729*r + 0.7151522*g + 0.072175*b)
    z = (0.0193339*r + 0.119192*g + 0.9503041*b)/1.08883
    f = lambda t: (t**(1/3) if t > 0.008856 else 7.787*t + 16/116)
    fx, fy, fz = f(x), f(y), f(z)
    return (116*fy-16, 500*(fx-fy), 200*(fy-fz))
def dE(a, b):
    A, B = lab(a), lab(b)
    return sum((A[i]-B[i])**2 for i in range(3))**0.5
def mix(a, b, t):
    A, B = rgb(a), rgb(b)
    return '#%02X%02X%02X' % tuple(round(A[i]*(1-t)+B[i]*t) for i in range(3))

P = json.load(open(r'D:\Temp\pokemon-theme\adv3\palette.light.json', encoding='utf-8'))['colors']
SURF = {k: P[k] for k in ['background','backgroundPanel','backgroundElement','sidebarBg','bubbleBg','inputBg','codeBlockBg','codeHeaderBg']}
CORE = ['syntaxKeyword','syntaxFunction','syntaxType','syntaxNumber','syntaxString']

def report(pal, extra=None):
    print(f'{"slot":<24}{"hex":<9}{"H":>7}{"S":>6}{"L":>7}   vsBg   vsPanel  vsCode')
    for k, h in pal.items():
        H, S, L = hsl(h)
        cb = pal.get('codeBlockBg', '#FFFFFF')
        print(f'{k:<24}{h:<9}{H:7.1f}{S:6.2f}{L:7.3f}   {cr(h,pal["background"]):5.2f}  {cr(h,pal["backgroundPanel"]):5.2f}  {cr(h,cb):5.2f}')
    print('\nsyntax core ΔE76 matrix:')
    for a, b in itertools.combinations(CORE, 2):
        d = dE(pal[a], pal[b])
        print(f'   {a:<16}×{b:<16} {d:6.1f} {"✓" if d>=10 else "✗"}')

if __name__ == '__main__':
    report(P)
    print('\n── hue/dE of candidate replacements ──')
    cands = ['#3C5552','#3E756F','#2E514D','#40756F','#41766E','#3D746F','#405654','#3E5452',
             '#3D5351','#2B534B','#4C7C40','#4D7D43','#4E7E44','#508044','#518145',
             '#83633C','#84643C','#86653D','#E70006','#E70207','#E80308','#E40404',
             '#135D9C','#125C9B','#155F9E','#16609F','#207BC2','#4B76E7',
             '#727272','#737378','#6E6F77','#68686D','#575759','#58585A','#555557','#545456','#505052','#4E4E50','#48484D']
    for c in cands:
        H, S, L = hsl(c)
        print(f'  {c}  H={H:6.1f} S={S:.2f} L={L:.3f}  vsBg={cr(c,P["background"]):5.2f} vsCode={cr(c,"#FFFFFF"):5.2f}')
