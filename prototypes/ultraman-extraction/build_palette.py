# -*- coding: utf-8 -*-
"""奥特曼 IP 预置主题：逐像素取色 + 全量自检管线（v4 稿）。

用法（需本机存在参考图）：
    python prototypes/ultraman-extraction/build_palette.py
参考图目录默认 C:\\Users\\辰辰洋洋\\Pictures\\奥特曼，可用环境变量 ULTRAMAN_REF 覆盖。

管线做四件事：
  ① 取色：26 个色位是「参考图里某张图的某个像素」——脚本按坐标**重新读像素**得出颜色，
     再与 EXPECTED 里钉死的出货值逐位比对（参考图被替换或解码器换版本会当场报错）。
  ② 梯子：8 个表面槽是画布 #000600 染上海报标题靛 #2D2C8A 的 7 档明度阶，
     每档 α 由目标 L* 反解（二分），alpha 精确到 4 位小数，按配方可复算同值 hex。
  ③ 4 个 diff 底：把直采的 diffAdded / diffRemoved 按固定 α 染在画布上。
  ④ 自检：house 判尺 53 对（硬性 38 + UI 15）、宿主现实 49 对、设计规范 4 项、
     色盲四态可分性，并写出 palette.json / provenance.json / checks.json / report.txt。

诚实边界（写在这里，不要在报告里偷偷抹掉）：
  * 参考图是 JPEG，**不存在平坦像素**——26 个直采色全部落在边缘过渡处（5×5 极差 43–255），
    「与原图某像素完全一致」保证的是「没有一个标志性颜色是想象出来的」，不是「取到了大块实色」。
  * 每个直采色在原 JPEG 里通常只出现 1 次，换解码器/重存可能带来 ±1 偏移。
  * 11 个混合槽按构造不是原图像素，是可复算配方。
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HERE = Path(__file__).resolve().parent
REF = Path(os.environ.get('ULTRAMAN_REF', r'C:\Users\辰辰洋洋\Pictures\奥特曼'))
IMAGES = ('2.jpg', 'images.jpg')

# ── 取色规格：26 个直采色位 = (来源图, x, y, 设计意图) ────────────────────
DIRECT = {
    'background':        ('2.jpg',     12, 224, '森林最深处的阴影（画布）'),
    'text':              ('2.jpg',    206,  27, '战甲银白高光（头冠尖脊）'),
    'textMuted':         ('2.jpg',    148, 111, '战甲银灰暗面（向左伸出的手臂）'),
    'primary':           ('2.jpg',    199, 249, '战甲受光正红（胸腹甲片）'),
    'secondary':         ('images.jpg', 317, 214, '角色立绘金瞳的边缘高光（第二声部）'),
    'info':              ('2.jpg',    380, 241, '战甲之外的天空（森林树梢上方）'),
    'success':           ('images.jpg', 211, 237, '角色胸前绿色计时器的核心'),
    'warning':           ('images.jpg', 139, 457, '角色立绘金色头冠的暗面（琥珀）'),
    'error':             ('2.jpg',    266, 216, '战甲受光朱红（侧腹甲片）'),
    'border':            ('images.jpg',  31, 633, '海报画框的深靛'),
    'borderActive':      ('2.jpg',    145, 118, '战甲肩后的天空（焦点环）'),
    'diffAdded':         ('2.jpg',     39, 209, '森林树冠的翠绿'),
    'diffRemoved':       ('images.jpg', 154, 340, '角色立绘的玫瑰红'),
    'markdownHeading':   ('images.jpg', 328, 324, '角色立绘冰蓝装甲的高光'),
    'markdownLink':      ('2.jpg',    327, 224, '天海交界的青'),
    'markdownCode':      ('2.jpg',    393, 393, '山坡的赭金'),
    'markdownEmph':      ('images.jpg', 258, 637, '海报下缘的淡紫'),
    'markdownStrong':    ('2.jpg',    223,  51, '战甲近白高光（额侧）'),
    'markdownBlockQuote':('images.jpg',  37, 576, '角色立绘的银白甲片'),
    'syntaxComment':     ('images.jpg', 443, 372, '角色立绘的紫灰（战甲暗部）'),
    'syntaxKeyword':     ('2.jpg',    268, 219, '战甲受光红·亮档'),
    'syntaxFunction':    ('images.jpg', 472,  16, '海报画框的能量蓝'),
    'syntaxType':        ('2.jpg',    314,   0, '天顶的淡蓝'),
    'syntaxNumber':      ('images.jpg', 318, 214, '角色立绘金瞳的核心（与次色相邻 1 px）'),
    'syntaxString':      ('images.jpg', 212, 235, '角色胸前绿色计时器的外缘'),
    'syntaxOperator':    ('images.jpg', 458, 627, '海报下缘的紫灰'),
}

# 出货值（src/custom-presets/ultraman.json 里的 37 个 hex，钉死用于回归比对）
EXPECTED = {
    'background': '#000600', 'codeBlockBg': '#060B11', 'sidebarBg': '#0A0F1F', 'inputBg': '#0E112A',
    'bubbleBg': '#111433', 'backgroundPanel': '#14163C', 'backgroundElement': '#161945',
    'codeHeaderBg': '#191C4E', 'text': '#DEEFF6', 'textMuted': '#AFB9BB', 'primary': '#D52518',
    'secondary': '#EFCB5D', 'info': '#2AA1B7', 'success': '#2F9877', 'warning': '#BD8E36',
    'error': '#F05F4E', 'border': '#2F3D6A', 'borderActive': '#87C3F5', 'diffAdded': '#3C9B6F',
    'diffRemoved': '#C9667B', 'diffAddedBg': '#08190E', 'diffRemovedBg': '#1A1210',
    'diffAddedLineNumberBg': '#0C2416', 'diffRemovedLineNumberBg': '#281919',
    'markdownHeading': '#C0ECFF', 'markdownLink': '#51AEB5', 'markdownCode': '#D0B26C',
    'markdownEmph': '#B6A8CB', 'markdownStrong': '#F8FBE6', 'markdownBlockQuote': '#91B2B7',
    'syntaxComment': '#747D86', 'syntaxKeyword': '#D95638', 'syntaxFunction': '#3A80FA',
    'syntaxType': '#8CCDE9', 'syntaxNumber': '#F4C738', 'syntaxString': '#67CDA6',
    'syntaxOperator': '#8774A2',
}

# 梯子：画布 → 海报标题靛，按目标 L* 反解 α
BASE, TINT = '#000600', '#2D2C8A'
LSTAR = [1.27, 2.90, 4.50, 6.10, 7.70, 9.40, 11.20, 13.00]
SURF_ORDER = ['background', 'codeBlockBg', 'sidebarBg', 'inputBg', 'bubbleBg',
              'backgroundPanel', 'backgroundElement', 'codeHeaderBg']
DIFF_MIX = {'diffAddedBg': ('diffAdded', 0.13), 'diffRemovedBg': ('diffRemoved', 0.13),
            'diffAddedLineNumberBg': ('diffAdded', 0.20), 'diffRemovedLineNumberBg': ('diffRemoved', 0.20)}


# ── 颜色工具（与 src/engine/resolve.ts 同口径：sRGB 线性化 + 相对亮度） ────
def h2r(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def r2h(t):
    return '#%02X%02X%02X' % tuple(max(0, min(255, int(round(v)))) for v in t)


def mix(a, b, t):
    A, B = h2r(a), h2r(b)
    return r2h([A[i] + (B[i] - A[i]) * t for i in range(3)])


def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def Y(h):
    r, g, b = [lin(v) for v in h2r(h)]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def cr(a, b):
    ya, yb = Y(a), Y(b)
    hi, lo = max(ya, yb), min(ya, yb)
    return (hi + 0.05) / (lo + 0.05)


def luma(h):
    r, g, b = h2r(h)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255.0


def contrast_text(h):
    """与 resolve.ts 的 contrastText 同口径：感知 luma > 0.6 给深墨，否则给浅字。"""
    return '#141414' if luma(h) > 0.6 else '#F4F4F5'


def over(fg, a, base):
    f, b = h2r(fg), h2r(base)
    return r2h([f[i] * a + b[i] * (1 - a) for i in range(3)])


def hsv(h):
    r, g, b = [v / 255 for v in h2r(h)]
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d < 1e-9:
        return 0.0, 0.0
    if mx == r:
        hh = ((g - b) / d) % 6
    elif mx == g:
        hh = ((b - r) / d) + 2
    else:
        hh = ((r - b) / d) + 4
    return hh * 60, d / mx if mx else 0


def lab(h):
    r, g, b = [lin(v) for v in h2r(h)]
    X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
    Yv = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
    Z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(X), f(Yv), f(Z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def dE76(a, b):
    A, B = lab(a), lab(b)
    return (sum((A[i] - B[i]) ** 2 for i in range(3))) ** 0.5


def Lstar(h):
    y = Y(h)
    return 116 * (y ** (1 / 3)) - 16 if y > 0.008856 else 903.3 * y


# ── 读像素 ────────────────────────────────────────────────────────────────
def load_images():
    out = {}
    for n in IMAGES:
        p = REF / n
        if not p.exists():
            sys.exit(f'[ultraman] 缺参考图：{p}（本机需要 C:\\Users\\辰辰洋洋\\Pictures\\奥特曼\\{n}）')
        out[n] = np.asarray(Image.open(p).convert('RGB'))
    return out


def main():
    imgs = load_images()

    print('═══ ① 直采：从参考图重新读像素')
    P = {}
    for slot, (img, x, y, note) in DIRECT.items():
        P[slot] = r2h(imgs[img][y, x])
    hits = sum(1 for s in P if P[s] == EXPECTED[s])
    for s in sorted(DIRECT):
        mark = 'OK ' if P[s] == EXPECTED[s] else '***'
        print(f'  {mark} {s:23s} {P[s]}  {DIRECT[s][0]} ({DIRECT[s][1]}, {DIRECT[s][2]})  {DIRECT[s][3]}')
    print(f'  直采 {len(DIRECT)} 槽：命中 {hits} / {len(DIRECT)}')

    print('\n═══ ② 梯子：画布 #000600 染标题靛 #2D2C8A，按目标 L* 反解 α')

    def y_for_Lstar(ls):
        return ((ls + 16) / 116) ** 3 if ls > 8.0 else ls / 903.3

    def alpha_for(tY):
        lo, hi = 0.0, 1.0
        for _ in range(60):
            mid = (lo + hi) / 2
            if Y(mix(BASE, TINT, mid)) < tY:
                lo = mid
            else:
                hi = mid
        return round((lo + hi) / 2, 4)

    ALPHAS = [0.0] + [alpha_for(y_for_Lstar(l)) for l in LSTAR[1:]]
    for i, s in enumerate(SURF_ORDER):
        P[s] = mix(BASE, TINT, ALPHAS[i])
        delta = '' if i == 0 else 'ΔL*=%+.2f' % (Lstar(P[s]) - Lstar(P[SURF_ORDER[i - 1]]))
        print(f'  {s:17s} {P[s]}  α={ALPHAS[i]:.4f}  L*={Lstar(P[s]):.2f}  {delta}')

    print('\n═══ ③ diff 底：直采色按固定 α 染在画布上')
    for slot, (src, a) in DIFF_MIX.items():
        P[slot] = mix(BASE, P[src], a)
        print(f'  {slot:26s} {P[slot]}  = {P[src]} × {a:.2f} + {BASE} × {1-a:.2f}')

    drift = [s for s in EXPECTED if P[s] != EXPECTED[s]]
    print(f'\n  与出货值（src/custom-presets/ultraman.json）比对：{37-len(drift)}/37 一致' +
          ('' if not drift else '  漂移：' + ', '.join(f'{s} {P[s]}≠{EXPECTED[s]}' for s in drift)))

    # ── house 判尺 53 对 ──────────────────────────────────────────────────
    MD = ['markdownHeading', 'markdownLink', 'markdownCode', 'markdownEmph', 'markdownStrong', 'markdownBlockQuote']
    SYN = ['syntaxComment', 'syntaxKeyword', 'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString', 'syntaxOperator']
    BRAND = ['primary', 'secondary', 'info', 'success', 'warning', 'error']
    hp = []
    for s in SURF_ORDER:
        hp.append((f'text@{s}', P['text'], P[s], 4.5, 'hard', '正文 8 表面'))
    for s in ['background', 'backgroundPanel', 'backgroundElement']:
        hp.append((f'textMuted@{s}', P['textMuted'], P[s], 4.5, 'hard', '次级文字'))
        hp.append((f'labelDimmed@{s}', over(P['textMuted'], 0.8, P[s]), P[s], 4.5, 'hard', '弱化文字 80%'))
    for m in MD:
        for s in ['background', 'backgroundPanel']:
            hp.append((f'{m}@{s}', P[m], P[s], 4.5, 'hard', 'markdown 正文'))
    for y in SYN:
        hp.append((f'{y}@codeBlockBg', P[y], P['codeBlockBg'], 4.5, 'hard', '语法高亮'))
    hp += [('diffAdded@diffAddedBg', P['diffAdded'], P['diffAddedBg'], 4.5, 'hard', '新增行'),
           ('diffRemoved@diffRemovedBg', P['diffRemoved'], P['diffRemovedBg'], 4.5, 'hard', '删除行'),
           ('text@diffAddedBg', P['text'], P['diffAddedBg'], 4.5, 'hard', 'diff 底上的正文'),
           ('text@diffRemovedBg', P['text'], P['diffRemovedBg'], 4.5, 'hard', 'diff 底上的正文'),
           ('contrastText(primary)@primary', contrast_text(P['primary']), P['primary'], 4.5, 'hard', '主按钮反白')]
    for s in ['background', 'backgroundPanel', 'backgroundElement']:
        hp.append((f'borderActive@{s}', P['borderActive'], P[s], 3.0, 'ui', '描边/焦点'))
    for b in BRAND:
        for s in ['background', 'backgroundPanel']:
            hp.append((f'{b}@{s}', P[b], P[s], 3.0, 'ui', '品牌/状态色'))

    print('\n═══ ④ house 判尺（硬性 38 + UI 15）')
    hf = uf = 0
    tight = []
    for code, fg, bg, need, cls, note in hp:
        r = cr(fg, bg)
        if r < need:
            print(f'  FAIL [{cls}] {code}: {r:.2f} < {need}')
            hf += cls == 'hard'
            uf += cls == 'ui'
        else:
            tight.append((r - need, code, r, need))
    tight.sort()
    print(f'  硬性 {len([p for p in hp if p[4]=="hard"])} 对违例 {hf}；UI {len([p for p in hp if p[4]=="ui"])} 对违例 {uf}')
    print('  最紧 6：', ', '.join(f'{c} {r:.2f}(+{m:.2f})' for m, c, r, n in tight[:6]))

    # ── 宿主现实 49 对 ────────────────────────────────────────────────────
    print('\n═══ ⑤ 宿主现实（app.asar 实证契约）')
    hr = []

    def add(name, fg, b, need, note, kind='hard'):
        r = cr(fg, b)
        hr.append(dict(name=name, fg=fg, bg=b, ratio=round(r, 2), need=need, ok=r >= need, note=note, kind=kind))

    for s in ['background', 'sidebarBg', 'inputBg', 'bubbleBg', 'backgroundPanel', 'backgroundElement', 'codeBlockBg']:
        add(f'error@{s}', P['error'], P[s], 4.5, '.KZf9OG_error · 12px 文字')
    for c in ('warning', 'success'):
        add(f'{c}@自染底14%', P[c], over(P[c], 0.14, P['background']), 4.5, 'state-*-tertiary · 13px')
        for s in ['background', 'sidebarBg', 'bubbleBg', 'backgroundPanel']:
            add(f'{c}@{s}', P[c], P[s], 4.5, '13px 文字')
    for s in ['inputBg', 'sidebarBg', 'background', 'backgroundPanel']:
        add(f'info@{s}', P['info'], P[s], 4.5, '.mAtvLq_badge · 11px')
    add('info 填充 + #fff', '#FFFFFF', P['info'], 3.0, '.RlGAzG_primary · 34px 图标钮')
    for s in SURF_ORDER:
        add(f'primary@{s}', P['primary'], P[s], 3.0, '2px 焦点环')
        add(f'secondary@{s}', P['secondary'], P[s], 3.0, '8px 空闲圆点')
    add('error brokenBadge 底', P['background'], P['error'], 4.5, '.KZf9OG_brokenBadge · 底色反白')
    add('error@danger-hover 底', P['error'], over(P['error'], 0.15, P['background']), 4.5, 'interactive-bg-hover-danger')
    add('warning@warn-label', P['warning'], P['background'], 4.5, 'state-warn-label')
    accent = over(P['primary'], 0.35, P['sidebarBg'])
    add('text@侧栏选中底', P['text'], accent, 4.5, 'sidebar-nav-item-active-accent')
    add('info@侧栏选中底', P['info'], accent, 4.5, '.mAtvLq_badge 底 = 选中强调色')
    for s in ['background', 'backgroundPanel', 'backgroundElement']:
        add(f'labelDimmed@{s}', over(P['textMuted'], 0.8, P[s]), P[s], 4.5, 'withAlpha(textMuted,0.8)')
    biz = over(P['primary'], 0.12, P['background'])
    add('primary@business-tertiary 芯片(13px)', P['primary'], biz, 4.5, '._0D_3ea_chip · 12% 主色底', kind='limit')
    add('primary@交互悬停强调底(20%)', P['primary'], over(P['primary'], 0.2, P['background']), 4.5, 'interactive-bg-hover-accent', kind='limit')
    add('primary@页面底(12px 文字)', P['primary'], P['background'], 4.5, 'state-business-primary 当文字色', kind='limit')

    hfail = [x for x in hr if not x['ok'] and x['kind'] == 'hard']
    for x in hfail:
        print(f"  FAIL {x['name']}: {x['ratio']} < {x['need']}   [{x['fg']} on {x['bg']}]  // {x['note']}")
    for x in hr:
        if x['kind'] == 'limit':
            print(f"  LIMIT {x['name']}: {x['ratio']} (需 {x['need']})")
    print(f'  共 {len(hr)} 对，硬判违例 {len(hfail)}；已知限制 {len([x for x in hr if x["kind"]=="limit"])} 条')
    hs = sorted([x for x in hr if x['ok'] and x['kind'] == 'hard'], key=lambda x: x['ratio'] - x['need'])
    print('  最紧 6：', ', '.join(f"{x['name']} {x['ratio']}(+{round(x['ratio']-x['need'],2)})" for x in hs[:6]))

    # ── 设计规范 ─────────────────────────────────────────────────────────
    print('\n═══ ⑥ IP 设计规范')
    d1 = 0
    for i in range(len(BRAND)):
        for j in range(i + 1, len(BRAND)):
            if P[BRAND[i]] == P[BRAND[j]]:
                print(f'  roleCollision {BRAND[i]}=={BRAND[j]}')
                d1 += 1
    for i in range(len(MD)):
        for j in range(i + 1, len(MD)):
            if P[MD[i]] == P[MD[j]]:
                print(f'  markdownDuplicate {MD[i]}=={MD[j]}')
                d1 += 1
    print(f'  roleCollision / markdownDuplicate：{d1}')
    h1, _ = hsv(P['primary'])
    h2, _ = hsv(P['secondary'])
    dh = min(abs(h1 - h2), 360 - abs(h1 - h2))
    geo_ok = dh <= 45 or 95 <= dh <= 145 or dh > 145
    print(f'  brandGeometry: primary h{h1:.1f} ↔ secondary h{h2:.1f} = {dh:.1f}° (类比 ≤45)  {"OK" if geo_ok else "BAD"}')
    core = ['syntaxKeyword', 'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString']
    mins = min(dE76(P[a], P[b]) for i, a in enumerate(core) for b in core[i + 1:])
    core_min = min(cr(P[c], P['codeBlockBg']) for c in core)
    cm, om = cr(P['syntaxComment'], P['codeBlockBg']), cr(P['syntaxOperator'], P['codeBlockBg'])
    print(f'  syntaxCoreMin ΔE76 = {mins:.1f} (≥10)  {"OK" if mins >= 10 else "BAD"}')
    print(f'  syntaxRecede: comment {cm:.2f} / operator {om:.2f} ≤ 核心最低 {core_min:.2f}  {"OK" if cm <= core_min and om <= core_min else "BAD"}')
    alls = BRAND + MD + SYN + ['text', 'textMuted', 'border', 'borderActive', 'diffAdded', 'diffRemoved']
    lo = sorted(((dE76(P[a], P[b]), a, b) for i, a in enumerate(alls) for b in alls[i + 1:]))[:4]
    print('  最小两两 ΔE76：', ', '.join(f'{a}↔{b} {v:.1f}' for v, a, b in lo))

    # ── 色盲四态 ─────────────────────────────────────────────────────────
    print('\n═══ ⑦ 色盲四态可分性（宿主 8px 状态圆点）')

    def lin_arr(c):
        c = np.asarray(c, dtype=float)
        return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

    def gam_arr(c):
        return np.where(c <= 0.0031308, 12.92 * c, 1.055 * np.power(np.clip(c, 0, None), 1 / 2.4) - 0.055)

    MATS = {'deutan': np.array([[0.625, 0.375, 0], [0.7, 0.3, 0], [0, 0.3, 0.7]]),
            'protan': np.array([[0.567, 0.433, 0], [0.558, 0.442, 0], [0, 0.242, 0.758]])}

    def lab_arr(rgb):
        rgb = np.atleast_2d(np.asarray(rgb, dtype=float))
        r, g, b = lin_arr(rgb / 255.0).T
        X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
        Yv = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
        Z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883
        f = lambda t: np.where(t > 0.008856, np.cbrt(np.clip(t, 0, None)), 7.787 * t + 16 / 116)
        fx, fy, fz = f(X), f(Yv), f(Z)
        return np.stack([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)], axis=1)

    STATES = ['secondary', 'success', 'warning', 'error']
    states = {}
    for kind in ('normal', 'deutan', 'protan'):
        arr = []
        for s in STATES:
            rgb = np.array(h2r(P[s]), dtype=float)
            if kind != 'normal':
                rgb = np.clip(gam_arr(lin_arr(rgb / 255.0) @ MATS[kind].T), 0, 1) * 255
            arr.append(rgb)
        ls = lab_arr(np.array(arr))
        d = [(float(np.linalg.norm(ls[i] - ls[j])), '%s↔%s' % (STATES[i], STATES[j])) for i in range(4) for j in range(i + 1, 4)]
        states[kind] = [round(min(d)[0], 1), min(d)[1]]
    print("  normal %.1f (%s)   deutan %.1f (%s)   protan %.1f (%s)" % (
        states['normal'][0], states['normal'][1], states['deutan'][0], states['deutan'][1], states['protan'][0], states['protan'][1]))
    print('  亮度阶梯 L*：', ', '.join('%s %.1f' % (s, Lstar(P[s])) for s in STATES))
    print('  house 24 套参考：中位 9.8，最好 18.3，最差 3.4；doraemon（house 复核样板）4.5；旧 ultraman 7.3')
    print('  borderActive ↔ syntaxComment ΔE76 = %.1f（house 24 套最小 11.7，无一套 <10）' % dE76(P['borderActive'], P['syntaxComment']))

    # ── 落盘 ─────────────────────────────────────────────────────────────
    prov = {}
    for slot, (img, x, y, note) in DIRECT.items():
        prov[slot] = {'kind': 'direct', 'image': img, 'xy': [x, y], 'hex': P[slot], 'note': note}
    for i, s in enumerate(SURF_ORDER):
        if i == 0:
            continue
        prov[s] = {'kind': 'mix', 'recipe': f'{BASE} + {TINT} @ α={ALPHAS[i]:.4f}', 'hex': P[s], 'note': f'画布染海报标题靛，L* {Lstar(P[s]):.2f}'}
    for slot, (src, a) in DIFF_MIX.items():
        prov[slot] = {'kind': 'mix', 'recipe': f'{P[src]} @ α={a:.2f} over {BASE}', 'hex': P[slot], 'note': '直采色染在画布上'}

    (HERE / 'palette.json').write_text(json.dumps(P, ensure_ascii=False, indent=1), encoding='utf-8')
    (HERE / 'provenance.json').write_text(json.dumps(prov, ensure_ascii=False, indent=1), encoding='utf-8')
    (HERE / 'checks.json').write_text(json.dumps({
        'alphas': dict(zip(SURF_ORDER, ALPHAS)),
        'house': [[c, f, b, round(cr(f, b), 2), n, k, note] for c, f, b, n, k, note in hp],
        'host': hr,
        'states': states,
    }, ensure_ascii=False, indent=1), encoding='utf-8')

    total = (len(drift) + hf + uf + len(hfail))
    print('\n═══ 汇总')
    print(f'  直采命中 {hits}/{len(DIRECT)}  ·  与出货值一致 {37-len(drift)}/37')
    print(f'  house 硬性 {hf} 违例 / UI {uf} 违例  ·  宿主现实硬判 {len(hfail)} 违例')
    print(f'  总违例：{total}')
    print('  写出 palette.json / provenance.json / checks.json（report.txt 由调用方重定向捕获）')
    return 0 if total == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
