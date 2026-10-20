# -*- coding: utf-8 -*-
"""Surface-ladder benchmark: shipped light IP presets vs the light candidate vs the dark candidate.
Prints L* (CIE) of the 8 surface slots, the L* runway, and the min adjacent-surface contrast.
"""
import json, io, os, glob, math

REPO = r'D:\dsh-plugin\dsh-opencode-palette\src\custom-presets'
SURF = ['background', 'backgroundPanel', 'backgroundElement', 'sidebarBg', 'bubbleBg', 'inputBg', 'codeBlockBg', 'codeHeaderBg']


def hex2rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lum(h):
    def f(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = hex2rgb(h)
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def lstar(h):
    y = lum(h)
    return 116 * (y ** (1 / 3)) - 16 if y > 0.008856 else y * 903.3


def report(name, colors):
    vals = {}
    for s in SURF:
        v = colors.get(s)
        if v:
            vals[s] = (v, lstar(v))
    if not vals:
        return None
    lss = [x[1] for x in vals.values()]
    # adjacent contrasts that a designer actually sees
    pairs = [('background', 'backgroundPanel'), ('backgroundPanel', 'backgroundElement'),
             ('background', 'sidebarBg'), ('background', 'bubbleBg'), ('background', 'inputBg'),
             ('background', 'codeBlockBg'), ('codeBlockBg', 'codeHeaderBg')]
    cs = [(round(ratio(vals[a][0], vals[b][0]), 3), '%s/%s' % (a, b))
          for a, b in pairs if a in vals and b in vals]
    minc = min(cs) if cs else (0, '')
    return dict(name=name, runway=round(max(lss) - min(lss), 1),
                lstar={k: round(v[1], 1) for k, v in vals.items()},
                minpair=minc[0], minpairname=minc[1],
                lrange='%.1f–%.1f' % (min(lss), max(lss)))


rows = []
for f in sorted(glob.glob(os.path.join(REPO, '*.json'))):
    d = json.load(io.open(f, encoding='utf-8'))
    c = d.get('colors') or {}
    app = d.get('appearance', '?')
    bg = c.get('background', '')
    if not bg:
        continue
    L = lstar(bg)
    if L < 50:      # dark preset -> skip
        continue
    r = report(os.path.basename(f)[:-5] + ' (light)', c)
    if r:
        rows.append(r)

cand = json.load(io.open(r'D:\Temp\pokemon-theme\adv3\palette.light.json', encoding='utf-8'))['colors']
rows.append(report('>>> CANDIDATE light', cand))
dark = json.load(io.open(r'D:\Temp\pokemon-theme\palette.json', encoding='utf-8'))['colors']
rows.append(report('>>> CURRENT pokemon (dark)', dark))

out = []
out.append('%-34s %-9s %-8s %s' % ('preset', 'L* range', 'runway', 'min adjacent contrast (worst pair)'))
for r in rows:
    out.append('%-34s %-9s %-8s %.3f  %s' % (r['name'], r['lrange'], r['runway'], r['minpair'], r['minpairname']))
out.append('')
for r in rows:
    out.append('%-34s %s' % (r['name'], r['lstar']))
io.open(r'D:\Temp\pokemon-theme\adv3\ladders-bench.txt', 'w', encoding='utf-8').write('\n'.join(out))
print('\n'.join(out[:1] + [l for l in out[1:] if '>>>' in l or 'kuromi' in l or 'zelda' in l or 'genshin' in l or 'mario' in l or 'hello' in l or 'sailor' in l or 'lego' in l or 'doraemon' in l or 'disney' in l or 'one-piece' in l]))
