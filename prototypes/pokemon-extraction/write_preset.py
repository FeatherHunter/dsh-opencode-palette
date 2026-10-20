# -*- coding: utf-8 -*-
"""写 src/custom-presets/pokemon.json（单行 JSON / 字母序 / 无尾换行）。读同目录 palette.json。"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
PAL = json.load(open(os.path.join(HERE, 'palette.json'), encoding='utf-8'))
colors = PAL['colors']
assert len(colors) == 37, len(colors)
assert not PAL.get('fails'), PAL.get('fails')
assert not PAL.get('warns'), PAL.get('warns')

out = {
    'appearance': 'dark',
    'basePreset': 'pokemon',
    'colors': dict(sorted(colors.items())),
    'id': 'pokemon',
    'name': '宝可梦',
    'schema': 'dsh-opencode-palette.custom-theme.v1',
    'updatedAt': '2026-10-20T12:20:00+08:00',
}
dest = os.path.join(REPO, 'src', 'custom-presets', 'pokemon.json')
txt = json.dumps(out, ensure_ascii=False, separators=(', ', ': '))
with open(dest, 'w', encoding='utf-8', newline='\n') as fh:
    fh.write(txt)
print('wrote', dest, os.path.getsize(dest), 'bytes')
