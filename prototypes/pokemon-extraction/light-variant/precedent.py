# -*- coding: utf-8 -*-
"""Precedent scan #2: (a) do any shipped LIGHT presets put a saturated colour in codeHeaderBg
(a bg slot) over a light code card? (b) what is each light preset's primary luminance?
"""
import json, io, os, glob

REPO = r'D:\dsh-plugin\dsh-opencode-palette\src\custom-presets'


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lum(h):
    def f(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb(h)
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def ratio(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def hsl(h):
    r, g, b = [c / 255.0 for c in rgb(h)]
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    d = mx - mn
    s = 0 if d == 0 else d / (1 - abs(2 * l - 1))
    if d == 0:
        hu = 0
    elif mx == r:
        hu = ((g - b) / d) % 6
    elif mx == g:
        hu = (b - r) / d + 2
    else:
        hu = (r - g) / d + 4
    return hu * 60, s, l


def lstar(h):
    y = lum(h)
    return 116 * (y ** (1 / 3)) - 16 if y > 0.008856 else y * 903.3


rows = []
for f in sorted(glob.glob(os.path.join(REPO, '*.json'))):
    d = json.load(io.open(f, encoding='utf-8'))
    c = d.get('colors') or {}
    bg = c.get('background')
    if not bg or lstar(bg) < 50:
        continue
    name = os.path.basename(f)[:-5]
    ch = c.get('codeHeaderBg', '')
    cb = c.get('codeBlockBg', '')
    tx = c.get('text', '')
    hs, ss, ls = hsl(ch) if ch else (0, 0, 0)
    rows.append((name, c.get('primary', ''), round(lum(c.get('primary', '#000000')), 3),
                 round(ratio(c.get('primary', '#000000'), bg), 2),
                 ch, round(ss, 2), cb, tx,
                 round(ratio(tx, ch), 2) if ch and tx else 0))

out = []
out.append('=== shipped LIGHT IP presets: primary (brand) + codeHeaderBg (the band) ===')
out.append('%-14s %-9s %-7s %-9s %-9s %-6s %-9s %-7s %s' %
           ('preset', 'primary', 'L(prim)', 'prim@bg', 'codeHead', 'S', 'codeBlock', 'text@head', 'head L*'))
for r in sorted(rows, key=lambda x: -x[5]):
    out.append('%-14s %-9s %-7.3f %-9.2f %-9s %-6.2f %-9s %-7.2f %.1f' %
               (r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[8], lstar(r[4])))
out.append('')
out.append('=== the same table for the two pokemon candidates ===')
for lbl, p in [('pokemon CURRENT (dark)', r'D:\Temp\pokemon-theme\palette.json'),
               ('pokemon CANDIDATE (light)', r'D:\Temp\pokemon-theme\adv3\palette.light.json')]:
    c = json.load(io.open(p, encoding='utf-8'))['colors']
    hs, ss, ls = hsl(c['codeHeaderBg'])
    out.append('%-26s primary %-9s L %.3f  prim@bg %.2f | codeHeaderBg %-9s S %.2f  text@head %.2f  head L* %.1f' %
               (lbl, c['primary'], lum(c['primary']), ratio(c['primary'], c['background']),
                c['codeHeaderBg'], ss, ratio(c['text'], c['codeHeaderBg']), lstar(c['codeHeaderBg'])))
io.open(r'D:\Temp\pokemon-theme\adv3\precedent-header.txt', 'w', encoding='utf-8').write('\n'.join(out))
print('\n'.join(out))
