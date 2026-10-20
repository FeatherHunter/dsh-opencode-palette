# -*- coding: utf-8 -*-
"""把 v3.6 逐像素重绘的 37 色写进 src/custom-presets/doraemon.json。
只改 colors 与 updatedAt；序列化格式与原文件逐字节同构（无尾换行、键序按字母序）。"""
import io, json, datetime, sys, os

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(REPO, 'src', 'custom-presets', 'doraemon.json')
raw = open(P, 'rb').read().decode('utf-8')
obj = json.loads(raw)

# 先自证序列化同构：原样读回再 dumps，字节必须完全一致
rebuilt = json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(', ', ': '))
if rebuilt != raw:
    print('!! 序列化格式与原文件不一致，中止')
    print('orig  :', raw[:120])
    print('rebuilt:', rebuilt[:120])
    sys.exit(1)
print('[ok] 序列化格式自检通过（与原文件逐字节同构）')

NEW = {
    'background':              '#EFF9FF',
    'backgroundElement':       '#AEE2FE',
    'backgroundPanel':         '#D0EFFF',
    'border':                  '#B7DDF4',
    'borderActive':            '#025DA1',
    'bubbleBg':                '#E4F6FF',
    'codeBlockBg':             '#C5EBFF',
    'codeHeaderBg':            '#B9E7FE',
    'diffAdded':               '#36473D',
    'diffAddedBg':             '#E8EFEA',
    'diffAddedLineNumberBg':   '#D7E2DA',
    'diffRemoved':             '#7D141A',
    'diffRemovedBg':           '#FDE4E5',
    'diffRemovedLineNumberBg': '#FBD1D3',
    'error':                   '#6F1319',
    'info':                    '#2D61A1',
    'inputBg':                 '#FBFDFF',
    'markdownBlockQuote':      '#666666',
    'markdownCode':            '#7B4F42',
    'markdownEmph':            '#843F59',
    'markdownHeading':         '#056D96',
    'markdownLink':            '#063F6B',
    'markdownStrong':          '#0C0C10',
    'primary':                 '#135F7B',
    'secondary':               '#9E7F09',
    'sidebarBg':               '#DBF2FF',
    'success':                 '#496352',
    'syntaxComment':           '#626262',
    'syntaxFunction':          '#204069',
    'syntaxKeyword':           '#821823',
    'syntaxNumber':            '#5A3B34',
    'syntaxOperator':          '#4B5B62',
    'syntaxString':            '#3E5345',
    'syntaxType':              '#175B7B',
    'text':                    '#1A1617',
    'textMuted':               '#202E42',
    'warning':                 '#733D18',
}

old = obj['colors']
assert set(old) == set(NEW), ('色位集合不一致', set(old) ^ set(NEW))
assert len(NEW) == 37, len(NEW)
obj['colors'] = NEW

now = datetime.datetime.now().astimezone().replace(microsecond=0)
obj['updatedAt'] = now.isoformat()

out = json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(', ', ': '))
open(P, 'wb').write(out.encode('utf-8'))
print('[ok] 已写', P, len(out.encode('utf-8')), 'bytes；updatedAt =', obj['updatedAt'])
print('     变更色位 %d 个' % sum(1 for k in NEW if old[k] != NEW[k]))
