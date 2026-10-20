# -*- coding: utf-8 -*-
"""Structural analysis: what is the GROUND of each reference image?
Prints colour runs along selected rows/columns + a role census.
"""
from PIL import Image
import os, collections, colorsys

SRC = r'C:\Users\辰辰洋洋\Pictures\宝可梦'
FILES = ['01-pikachu-official-pokedex-art.png', '2.jpg', '3.jpg', '4.jpg']

def hx(c): return '#%02X%02X%02X' % tuple(c)
def lin(v):
    s = v/255.0
    return s/12.92 if s <= 0.04045 else ((s+0.055)/1.055)**2.4
def lum(c):
    r,g,b = (lin(x) for x in c); return 0.2126*r+0.7152*g+0.0722*b

def runs(seq):
    out = []
    for v in seq:
        if out and out[-1][0] == v: out[-1][1] += 1
        else: out.append([v, 1])
    return out

for f in FILES:
    im = Image.open(os.path.join(SRC, f)).convert('RGB')
    W, H = im.size
    px = im.load()
    print(f'\n########## {f}  {W}x{H}  ({W*H} px) ##########')
    cnt = collections.Counter(im.getdata())
    print('--- top 8 colours by area ---')
    tot = W*H
    for c, n in cnt.most_common(8):
        print(f'   {hx(c)}  n={n:7d}  {100*n/tot:5.2f}%  L={lum(c):.4f}')
    # classify every pixel into a lightness bucket to see the ground
    buckets = collections.Counter()
    for c, n in cnt.items():
        L = lum(c)
        b = 'ink(L<0.02)' if L < 0.02 else 'dark(0.02-0.12)' if L < 0.12 else 'mid(0.12-0.45)' if L < 0.45 else 'light(0.45-0.85)' if L < 0.85 else 'paper(>0.85)'
        buckets[b] += n
    print('--- lightness census of the whole image ---')
    for b, n in buckets.most_common():
        print(f'   {b:<16} {n:8d}  {100*n/tot:5.2f}%')
    # horizontal runs at a few rows
    for y in [int(H*0.05), int(H*0.30), int(H*0.60), int(H*0.88), int(H*0.97)]:
        r = runs([px[x, y] for x in range(W)])
        txt = '  '.join(f'{hx(c)}x{n}' for c, n in r if n >= 3)
        print(f'  row y={y:4d}: {txt[:300]}')
    # vertical runs at a few columns
    for x in [int(W*0.03), int(W*0.50), int(W*0.97)]:
        r = runs([px[x, y] for y in range(H)])
        txt = '  '.join(f'{hx(c)}x{n}' for c, n in r if n >= 3)
        print(f'  col x={x:4d}: {txt[:300]}')
