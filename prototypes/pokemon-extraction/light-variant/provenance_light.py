# -*- coding: utf-8 -*-
"""Provenance table for the light candidate: per-slot source (直采 / 混色) + real pixel counts.
Reads histogram.json (per-file + grand) and palette.light.json.
"""
import json, io, os

BASE = r'D:\Temp\pokemon-theme'
hist = json.load(io.open(os.path.join(BASE, 'histogram.json'), encoding='utf-8'))
grand = {}
for h in hist.get('grand', []):
    grand[h['hex'].upper()] = h['n']
per = {}
for fname, lst in hist.get('per_file', {}).items():
    d = {}
    for h in lst:
        d[h['hex'].upper()] = h['n']
    per[fname] = d

FILES = list(per.keys())

# documented source for every slot of the light candidate
# ('直采', note) or ('混色', formula-string, [(hex, ratio), ...])
M = {
 'background':        ('混色', 'mix(#FFFFFF × #FDE7B5, 20%)', [('#FFFFFF', .8), ('#FDE7B5', .2)]),
 'backgroundPanel':   ('混色', 'mix(#FFFFFF × #FDE7B5, 28%)', [('#FFFFFF', .72), ('#FDE7B5', .28)]),
 'backgroundElement': ('混色', 'mix(#FFFFFF × #FDE7B5, 46%)', [('#FFFFFF', .54), ('#FDE7B5', .46)]),
 'sidebarBg':         ('混色', 'mix(#FFFFFF × #FDE7B5, 36%)', [('#FFFFFF', .64), ('#FDE7B5', .36)]),
 'bubbleBg':          ('直采', '01 卡纸白'),
 'inputBg':           ('混色', 'mix(#FFFFFF × #FDE7B5, 12%)', [('#FFFFFF', .88), ('#FDE7B5', .12)]),
 'codeBlockBg':       ('直采', '01 卡纸白（代码卡纸面）'),
 'codeHeaderBg':      ('直采', '01 编号徽章黄（代码卡头带）'),
 'text':              ('直采', '01 卡面页底墨'),
 'textMuted':         ('直采', '01 图注灰'),
 'primary':           ('直采', '01 徽章金暗面（唯一能过 3:1 的金）'),
 'secondary':         ('直采', '02 wikiHow 蓝'),
 'info':              ('直采', '04 杰尼龟蓝暗面'),
 'success':           ('直采', '04 妙蛙种子绿暗面'),
 'warning':           ('混色', 'mix(#FB8603 × #8F161D, 50%)', [('#FB8603', .5), ('#8F161D', .5)]),
 'error':             ('直采', '03 周年「30」红'),
 'border':            ('混色', 'mix(#FDE7B5 × #A0A2AC, 55%)', [('#FDE7B5', .45), ('#A0A2AC', .55)]),
 'borderActive':      ('直采', '04 天空蓝'),
 'diffAdded':         ('直采', '04 妙蛙种子青'),
 'diffAddedBg':       ('混色', 'mix(#FFFFFF × #7FC9AE, 10%)', [('#FFFFFF', .90), ('#7FC9AE', .10)]),
 'diffAddedLineNumberBg': ('混色', 'mix(#FFFFFF × #7FC9AE, 17%)', [('#FFFFFF', .83), ('#7FC9AE', .17)]),
 'diffRemoved':       ('直采', '01 深红阶（精灵球红暗面）'),
 'diffRemovedBg':     ('混色', 'mix(#FFFFFF × #8F161D, 10%)', [('#FFFFFF', .90), ('#8F161D', .10)]),
 'diffRemovedLineNumberBg': ('混色', 'mix(#FFFFFF × #8F161D, 18%)', [('#FFFFFF', .82), ('#8F161D', .18)]),
 'markdownHeading':   ('混色', 'mix(#FFCB05 × #1C1C22, 55%)', [('#FFCB05', .45), ('#1C1C22', .55)]),
 'markdownLink':      ('混色', 'mix(#4B76E7 × #145E9D, 50%)', [('#4B76E7', .5), ('#145E9D', .5)]),
 'markdownCode':      ('混色', 'mix(#4B76E7 × #1C1C22, 55%)', [('#4B76E7', .45), ('#1C1C22', .55)]),
 'markdownEmph':      ('混色', 'mix(#84633C × #1C1C22, 45%)', [('#84633C', .55), ('#1C1C22', .45)]),
 'markdownStrong':    ('直采', '01 页脚栏近黑'),
 'markdownBlockQuote': ('混色', 'mix(#A0A2AC × #1C1C22, 45%)', [('#A0A2AC', .55), ('#1C1C22', .45)]),
 'syntaxComment':     ('直采', '01 灰阶'),
 'syntaxKeyword':     ('混色', 'mix(#C790A3 × #1C1C22, 40%)', [('#C790A3', .60), ('#1C1C22', .40)]),
 'syntaxFunction':    ('混色', 'mix(#289BCA × #1C1C22, 35%)', [('#289BCA', .65), ('#1C1C22', .35)]),
 'syntaxType':        ('直采', '04 青灰暗面'),
 'syntaxNumber':      ('混色', 'mix(#FB8603 × #1C1C22, 45%)', [('#FB8603', .55), ('#1C1C22', .45)]),
 'syntaxString':      ('混色', 'mix(#7AA85D × #1C1C22, 45%)', [('#7AA85D', .55), ('#1C1C22', .45)]),
 'syntaxOperator':    ('直采', '01 灰阶'),
}

cand = json.load(io.open(os.path.join(BASE, 'adv3', 'palette.light.json'), encoding='utf-8'))['colors']


def mix(parts):
    tot = sum(p[1] for p in parts)
    r = sum(int(p[0].lstrip('#')[i:i+2], 16) * p[1] / tot for i, p in
            [(0, parts[0]), (2, parts[0]), (4, parts[0])]) if False else 0
    out = []
    for i in (0, 2, 4):
        v = sum(int(p[0].lstrip('#')[i:i+2], 16) * p[1] / tot for p in parts)
        out.append(max(0, min(255, int(round(v)))))
    return '#%02X%02X%02X' % tuple(out)


rows = []
nd = nm = 0
for slot, hexv in cand.items():
    h = hexv.upper()
    kind = M[slot][0]
    n = grand.get(h, 0)
    dist = ', '.join('%s:%d' % (f[:12], per[f].get(h, 0)) for f in FILES if per[f].get(h, 0))
    if kind == '直采':
        nd += 1
        if n == 0:
            kind = '直采(0命中!)'
    else:
        nm += 1
        calc = mix(M[slot][2])
        if calc != h:
            kind = '混色(公式算出 %s != %s)' % (calc, h)
    rows.append((slot, h, kind, M[slot][1], n, dist))

out = ['slot,hex,source,formula/note,grand_px,per-file']
for r in rows:
    out.append('%s,%s,%s,"%s",%d,"%s"' % r)
out.append('')
out.append('直采 %d / 混色 %d / 想象 0  (共 %d)' % (nd, nm, len(rows)))
txt = '\n'.join(out)
io.open(os.path.join(BASE, 'adv3', 'provenance-light.csv'), 'w', encoding='utf-8').write(txt)
print(txt)
