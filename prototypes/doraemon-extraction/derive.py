# -*- coding: utf-8 -*-
"""
derive.py — 哆啦A梦 IP 主题推导器 + 加固判尺（v3.6 逐像素重绘）

判尺来源（仓库内权威）：
  docs/theme-audit/criteria.md  §2 硬性判据（38 正文对 + 15 UI 对）
                               §4 IP 主题设计规范（色相孤岛 / 角色碰撞 / markdown 同值 /
                                                  品牌第二色几何 / 语法 ΔE76 与退后梯队）
  src/engine/map-dsh.ts        槽位→宿主 token 映射（品牌/状态色都是文字色）
  src/engine/resolve.ts        shade/withAlpha/contrastText 语义
  宿主 app.asar 实测            state-*-primary 是 11~13px 文字色；state-*-tertiary 是同色 14% 底
                               button-info-fill 配宿主写死 #fff；state-idle-primary 是 8px 圆点

来源规则（v3.5+ 逐像素取色）：每个色位只允许三种来源
  ① 直采   hex 与参考图某个像素完全一致（脚本回原图逐像素复核命中数）
  ② 混色   两个采样色的固定比例线性 sRGB 混合（比例写进台账）
  ③ 阶梯   采样色沿同一色相的明度台阶取阶（比例写进台账）
第四种（凭想象指定）直接判负。
"""
import os, json, sys, math
from collections import Counter
from PIL import Image, ImageFilter

REF = os.environ.get('DORAEMON_REF',
                   r'C:\Users\辰辰洋洋\Pictures\哆啦A梦')
OUT = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------- 色彩数学

def h2r(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
def r2h(rgb):
    return '#%02X%02X%02X' % tuple(max(0, min(255, int(v + 0.5))) for v in rgb)
def mix(a, b, t):
    a, b = (h2r(a) if isinstance(a, str) else a), (h2r(b) if isinstance(b, str) else b)
    return r2h(tuple(a[i] * (1 - t) + b[i] * t for i in range(3)))
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
def alpha_over(fg, bg, a):
    f, b = h2r(fg), h2r(bg)
    return r2h(tuple(f[i] * a + b[i] * (1 - a) for i in range(3)))
def luma(h):                      # resolve.ts contrastText 口径
    r, g, b = h2r(h)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
def contrast_text(h):            # resolve.ts contrastText
    return '#141414' if luma(h) > 0.6 else '#F4F4F5'
def lab(h):
    r, g, b = [lin(v) for v in h2r(h)]
    X = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
    Yv = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
    Z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041
    def f(t): return t ** (1 / 3) if t > 0.008856 else (7.787 * t + 16 / 116)
    fx, fy, fz = f(X / 0.95047), f(Yv / 1.0), f(Z / 1.08883)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))
def lstar(h): return lab(h)[0]
def dE76(a, b):
    la, aa, ba = lab(a); lb, ab, bb = lab(b)
    return math.sqrt((la - lb) ** 2 + (aa - ab) ** 2 + (ba - bb) ** 2)
def hue_chroma(h):
    r, g, b = h2r(h)
    mx, mn = max(r, g, b), min(r, g, b)
    chroma = mx - mn
    if chroma == 0: return None, 0
    d = mx - mn
    if mx == r: hh = 60 * (((g - b) / d) % 6)
    elif mx == g: hh = 60 * (((b - r) / d) + 2)
    else: hh = 60 * (((r - g) / d) + 4)
    return hh, chroma

# ---------------------------------------------------------------- 源色

SOURCES = [
    ('1.png', '#FFFFFF', '漫画纸白',   '1.png 全身立绘的纯白纸面', 0),
    ('1.png', '#189BC8', '身体蓝',     '1.png 躯干与手臂的平涂青蓝', 0),
    ('1.png', '#E22233', '鼻尖红',     '1.png 圆鼻子与红球', 0),
    ('1.png', '#FFCB05', '铃铛黄',     '1.png 铃铛与左下角标', 0),
    ('1.png', '#0C0C10', '纯墨黑',     '1.png 底部信息栏纯黑', 0),
    ('3.png', '#0168B5', '字标深蓝',   '3.png "Doraemon" 字标描边深蓝', 0),
    ('3.png', '#00ADEF', '招牌青蓝',   '3.png 字标与身体的亮青蓝', 0),
    ('3.png', '#CAE1F0', '浅天蓝',     '3.png 字标内圈的浅天蓝描边', 0),
    ('3.png', '#1A1617', '勾线墨',     '3.png 全部描边的墨线', 0),
    ('3.png', '#6F997A', '叠色绿',     '3.png 字标蓝与黄底交叠处的真绿', 0),
    ('4.jpg', '#F07A22', '舌头橙',     '4.jpg 张嘴造型的橙舌', 3),
    ('4.jpg', '#ED1B24', '嘴内红',     '4.jpg 口腔内壁的正红', 3),
    ('4.jpg', '#21A3DD', '暗场亮蓝',   '4.jpg 暗背景里受光的身体蓝', 3),
    ('4.jpg', '#515151', '暗场中灰',   '4.jpg 深色渐变背景中段中灰', 3),
    ('5.jpg', '#7FD2FE', '柔蓝',       '5.jpg 近景造型的柔调身体蓝', 3),
    ('5.jpg', '#AF6E5A', '铜锣烧棕',   '5.jpg 手里铜锣烧的焦糖棕', 3),
    ('6.jpg', '#316AB1', '字标靛蓝',   '6.jpg "ドラえもん" 字标主蓝', 3),
    ('6.jpg', '#F36E9D', '标题粉点',   '6.jpg 字标上的粉点', 3),
]

IMAGES = {}
def load(name):
    if name not in IMAGES:
        p = os.path.join(REF, name)
        if not os.path.exists(p): p = os.path.join(OUT, 'ref', name)
        IMAGES[name] = Image.open(p).convert('RGB')
    return IMAGES[name]

def verify_source(name, hexv, tol):
    im = load(name); px = im.load(); t = h2r(hexv)
    hits = []
    for y in range(im.height):
        for x in range(im.width):
            c = px[x, y]
            if max(abs(c[i] - t[i]) for i in range(3)) <= tol: hits.append((x, y))
    return len(hits)

print('=' * 94)
print('① 源色逐像素回验（每个锚点必须在原图里真实存在）')
print('=' * 94)
SRC = {}
for name, hexv, element, note, tol in SOURCES:
    n = verify_source(name, hexv, tol)
    if n == 0:
        print('  [FAIL] %-8s %-10s 未在 %s 命中' % (hexv, element, name)); sys.exit(1)
    SRC[hexv] = {'img': name, 'element': element, 'note': note, 'px': n, 'exact': tol == 0}
    print('  [ok]   %-8s %-10s %-6s %7d px  %s' % (hexv, element, name, n, '精确' if tol == 0 else 'JPEG±%d' % tol))

def S(h): return h

# ---------------------------------------------------------------- 背景阶梯（沿 A1×A7 明度轴反解比例）
A1, A7 = '#FFFFFF', '#7FD2FE'

def solve_ratio(target_L, a=A1, b=A7):
    lo, hi = 0.0, 1.0
    for _ in range(60):
        mid = (lo + hi) / 2
        if lstar(mix(a, b, mid)) > target_L: lo = mid
        else: hi = mid
    return (lo + hi) / 2

BG_TARGETS = [('inputBg', 99.3), ('background', 97.6), ('bubbleBg', 95.9), ('sidebarBg', 94.2),
              ('backgroundPanel', 92.5), ('codeBlockBg', 90.8), ('codeHeaderBg', 89.1),
              ('backgroundElement', 87.4)]
BG = {}
BG_RATIO = {}
for slot, tgt in BG_TARGETS:
    t = solve_ratio(tgt)
    BG[slot] = mix(A1, A7, t)
    BG_RATIO[slot] = t
    print('  场域 %-18s L*%.1f  纸白×柔蓝 %.3f  →  %s' % (slot, lstar(BG[slot]), t, BG[slot]))

# ---------------------------------------------------------------- 37 色位
# (槽, 值, 来源说明)
T = {}
PROV = {}
def put(slot, val, note, kind, recipe):
    T[slot] = val; PROV[slot] = {'note': note, 'kind': kind, 'recipe': recipe}

for slot in BG: put(slot, BG[slot], '5.jpg 柔蓝 × 1.png 漫画纸白 定比混色（按实测 L* 目标反解）', '混色',
                     'mix(#FFFFFF, #7FD2FE, %.3f)' % BG_RATIO[slot])

put('text',          '#1A1617', '3.png 漫画勾线墨', '直采', '#1A1617')
put('textMuted',     mix('#1A1617', '#316AB1', 0.28), '3.png 勾线墨 × 6.jpg 字标靛蓝 定比混色', '混色',
    'mix(#1A1617, #316AB1, 0.28)')
put('primary',       mix('#189BC8', '#0C0C10', 0.42), '1.png 身体青蓝 × 1.png 纯墨黑 定比混色', '混色',
    'mix(#189BC8, #0C0C10, 0.42)')
put('secondary',     mix('#FFCB05', '#0C0C10', 0.40), '1.png 铃铛黄 × 1.png 纯墨黑 定比混色', '混色',
    'mix(#FFCB05, #0C0C10, 0.40)')
put('info',          mix('#316AB1', '#0C0C10', 0.10), '6.jpg 字标靛蓝 × 1.png 纯墨黑 定比混色', '混色',
    'mix(#316AB1, #0C0C10, 0.10)')
put('success',       mix('#6F997A', '#0C0C10', 0.38), '3.png 蓝黄交叠真绿 × 1.png 纯墨黑 定比混色', '混色',
    'mix(#6F997A, #0C0C10, 0.38)')
put('warning',       mix('#F07A22', '#0C0C10', 0.55), '4.jpg 舌头橙 × 1.png 纯墨黑 定比混色', '混色',
    'mix(#F07A22, #0C0C10, 0.55)')
put('error',         mix('#ED1B24', '#0C0C10', 0.56), '4.jpg 嘴内红 × 1.png 纯墨黑 定比混色', '混色',
    'mix(#ED1B24, #0C0C10, 0.56)')
put('border',        mix('#CAE1F0', '#7FD2FE', 0.25), '3.png 浅天蓝 × 5.jpg 柔蓝 定比混色', '混色',
    'mix(#CAE1F0, #7FD2FE, 0.25)')
put('borderActive',  mix('#0168B5', '#0C0C10', 0.12), '3.png 字标深蓝 × 1.png 纯墨黑 定比混色', '混色',
    'mix(#0168B5, #0C0C10, 0.12)')
put('diffAdded',     mix('#6F997A', '#0C0C10', 0.58), '3.png 叠色绿 × 1.png 纯墨黑 定比混色', '混色',
    'mix(#6F997A, #0C0C10, 0.58)')
put('diffAddedBg',   mix('#6F997A', '#FFFFFF', 0.84), '3.png 叠色绿 × 1.png 漫画纸白 定比混色', '混色',
    'mix(#6F997A, #FFFFFF, 0.84)')
put('diffAddedLineNumberBg', mix('#6F997A', '#FFFFFF', 0.72), '3.png 叠色绿 × 1.png 漫画纸白 定比混色', '混色',
    'mix(#6F997A, #FFFFFF, 0.72)')
put('diffRemoved',   mix('#ED1B24', '#0C0C10', 0.50), '4.jpg 嘴内红 × 1.png 纯墨黑 定比混色', '混色',
    'mix(#ED1B24, #0C0C10, 0.50)')
put('diffRemovedBg', mix('#ED1B24', '#FFFFFF', 0.88), '4.jpg 嘴内红 × 1.png 漫画纸白 定比混色', '混色',
    'mix(#ED1B24, #FFFFFF, 0.88)')
put('diffRemovedLineNumberBg', mix('#ED1B24', '#FFFFFF', 0.80), '4.jpg 嘴内红 × 1.png 漫画纸白 定比混色', '混色',
    'mix(#ED1B24, #FFFFFF, 0.80)')
put('markdownHeading', mix('#00ADEF', '#0C0C10', 0.40), '3.png 招牌青蓝 × 1.png 纯墨黑 定比混色', '混色',
    'mix(#00ADEF, #0C0C10, 0.40)')
put('markdownLink',  mix('#0168B5', '#0C0C10', 0.45), '3.png 字标深蓝 × 1.png 纯墨黑 定比混色', '混色',
    'mix(#0168B5, #0C0C10, 0.45)')
put('markdownCode',  mix('#AF6E5A', '#0C0C10', 0.32), '5.jpg 铜锣烧棕 × 1.png 纯墨黑 定比混色', '混色',
    'mix(#AF6E5A, #0C0C10, 0.32)')
put('markdownEmph',  mix('#F36E9D', '#0C0C10', 0.48), '6.jpg 标题粉点 × 1.png 纯墨黑 定比混色', '混色',
    'mix(#F36E9D, #0C0C10, 0.48)')
put('markdownStrong','#0C0C10', '1.png 信息栏纯黑（全场最重的墨）', '直采', '#0C0C10')
put('markdownBlockQuote', mix('#515151', '#FFFFFF', 0.12), '4.jpg 暗场中灰 × 1.png 漫画纸白 定比混色', '混色',
    'mix(#515151, #FFFFFF, 0.12)')
put('syntaxComment', mix('#515151', '#FFFFFF', 0.10), '4.jpg 暗场中灰 × 1.png 漫画纸白 定比混色', '混色',
    'mix(#515151, #FFFFFF, 0.10)')
put('syntaxKeyword', mix('#E22233', '#0C0C10', 0.45), '1.png 鼻尖红 × 1.png 纯墨黑 定比混色', '混色',
    'mix(#E22233, #0C0C10, 0.45)')
put('syntaxFunction',mix('#316AB1', '#0C0C10', 0.45), '6.jpg 字标靛蓝 × 1.png 纯墨黑 定比混色', '混色',
    'mix(#316AB1, #0C0C10, 0.45)')
put('syntaxType',   mix('#21A3DD', '#0C0C10', 0.48), '4.jpg 暗场亮蓝 × 1.png 纯墨黑 定比混色', '混色',
    'mix(#21A3DD, #0C0C10, 0.48)')
put('syntaxNumber', mix('#AF6E5A', '#0C0C10', 0.52), '5.jpg 铜锣烧棕 × 1.png 纯墨黑 定比混色', '混色',
    'mix(#AF6E5A, #0C0C10, 0.52)')
put('syntaxString', mix('#6F997A', '#0C0C10', 0.50), '3.png 叠色绿 × 1.png 纯墨黑 定比混色', '混色',
    'mix(#6F997A, #0C0C10, 0.50)')
put('syntaxOperator',mix('#515151', '#21A3DD', 0.12), '4.jpg 暗场中灰 × 4.jpg 暗场亮蓝 定比混色', '混色',
    'mix(#515151, #21A3DD, 0.12)')

assert len(T) == 37, len(T)

# ---------------------------------------------------------------- 加固判尺
SURFACES = ['background', 'backgroundPanel', 'backgroundElement', 'sidebarBg',
            'bubbleBg', 'inputBg', 'codeBlockBg', 'codeHeaderBg']
MUTED_SURFACES = ['background', 'backgroundPanel', 'backgroundElement']
MD_ROLES = ['markdownHeading', 'markdownLink', 'markdownStrong', 'markdownEmph',
            'markdownBlockQuote', 'markdownCode']
SYN_ROLES = ['syntaxComment', 'syntaxKeyword', 'syntaxFunction', 'syntaxType',
             'syntaxNumber', 'syntaxString', 'syntaxOperator']
SYN_CORE = ['syntaxKeyword', 'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString']
BRAND = ['primary', 'secondary', 'info', 'success', 'warning', 'error']

fails, notes, CHECKS = [], [], []
# 'repo'  = 仓库判尺 docs/theme-audit/criteria.md 的 40 条硬对
# 'extra' = 对抗式加固新增的 47 条（品牌色按 11~13px 正文口径 / 自染底 / 宿主写死白字）
_CUR_SRC = ['repo']
def hard(code, fg, bg, thr=4.5):
    r = cr(fg, bg)
    CHECKS.append({'cls': 'hard', 'src': _CUR_SRC[0], 'code': code, 'fg': fg, 'bg': bg, 'ratio': round(r, 3), 'thr': thr})
    if r < thr: fails.append('硬性 %-40s %s / %s = %.3f (< %.1f)' % (code, fg, bg, r, thr))
    return r
def ui(code, fg, bg, thr=3.0):
    r = cr(fg, bg)
    CHECKS.append({'cls': 'ui', 'code': code, 'fg': fg, 'bg': bg, 'ratio': round(r, 3), 'thr': thr})
    if r < thr: fails.append('UI   %-40s %s / %s = %.3f (< %.1f)' % (code, fg, bg, r, thr))
    return r

print()
print('=' * 94)
print('② §2.1 正文/内容类 38 对 ≥ 4.5:1')
print('=' * 94)
n_hard = 0
n_extra = 0
for s in SURFACES:
    n_hard += 1; hard('text@' + s, T['text'], T[s])
for s in MUTED_SURFACES:
    n_hard += 1; hard('textMuted@' + s, T['textMuted'], T[s])
    n_hard += 1; hard('labelDimmed@' + s, alpha_over(T['textMuted'], T[s], 0.8), T[s])
for r_ in MD_ROLES:
    for s in ['background', 'backgroundPanel']:
        n_hard += 1; hard(r_ + '@' + s, T[r_], T[s])
for r_ in SYN_ROLES:
    n_hard += 1; hard(r_ + '@codeBlockBg', T[r_], T['codeBlockBg'])
hard('diffAdded@diffAddedBg', T['diffAdded'], T['diffAddedBg'])
hard('diffAdded@diffAddedLineNumberBg', T['diffAdded'], T['diffAddedLineNumberBg'])
hard('diffRemoved@diffRemovedBg', T['diffRemoved'], T['diffRemovedBg'])
hard('diffRemoved@diffRemovedLineNumberBg', T['diffRemoved'], T['diffRemovedLineNumberBg'])
hard('text@diffAddedBg', T['text'], T['diffAddedBg'])
hard('text@diffRemovedBg', T['text'], T['diffRemovedBg'])
n_hard += 6
n_hard += 1; hard('contrastText(primary)@primary', contrast_text(T['primary']), T['primary'])
print('  额外加固（宿主实测：品牌/状态色是 11~13px 文字色）')
_CUR_SRC[0] = 'extra'
for r_ in BRAND:
    for s in SURFACES:
        if r_ == 'secondary': continue     # secondary 宿主只有 8px idle 圆点一个消费者
        n_extra += 1; hard(r_ + '@' + s, T[r_], T[s])
# 同色自染底：宿主 .j_8BDW_strip{background:state-warn-tertiary;color:state-warn-primary}
for role, alpha, bgslot in [('warning', 0.14, 'background'), ('warning', 0.14, 'inputBg'),
                             ('error', 0.12, 'background'), ('success', 0.14, 'background')]:
    comp = alpha_over(T[role], T[bgslot], alpha)
    n_extra += 1
    hard('%s@自身%.0f%%底(%s)' % (role, alpha * 100, bgslot), T[role], comp)
# 宿主写死 #fff 的填充
for role in ['error', 'info', 'primary']:
    n_extra += 1
    hard('#fff@' + role + '(宿主写死白字)', '#FFFFFF', T[role])
_CUR_SRC[0] = 'repo'

print()
print('=' * 94)
print('③ §2.2 UI/交互类 15 对 ≥ 3:1')
print('=' * 94)
n_ui = 0
for s in ['background', 'backgroundPanel', 'backgroundElement']:
    n_ui += 1; ui('borderActive@' + s, T['borderActive'], T[s])
for r_ in BRAND:
    for s in ['background', 'backgroundPanel']:
        n_ui += 1; ui(r_ + '@' + s, T[r_], T[s])

print()
print('=' * 94)
print('④ §4 IP 设计规范')
print('=' * 94)
design = []
# 4.1 背景家族纯净
base_h, base_c = hue_chroma(T['background'])
for s in SURFACES:
    hh, cc = hue_chroma(T[s])
    if cc < 8: continue
    dev = abs(hh - base_h); dev = min(dev, 360 - dev)
    if dev > 60: design.append('色相孤岛 %-18s H%.1f 偏离基色相 %.1f° > 60°' % (s, hh, dev))
# 4.2/4.3 角色碰撞 + markdown 同值
EXEMPT = set(SURFACES) | {'diffAddedBg', 'diffRemovedBg', 'diffAddedLineNumberBg', 'diffRemovedLineNumberBg'}
roles = [k for k in T if k not in EXEMPT]
byval = {}
for k in roles: byval.setdefault(T[k], []).append(k)
for v, ks in byval.items():
    if len(ks) > 1: design.append('角色碰撞 %s = %s' % (v, ks))
mdv = {}
for k in MD_ROLES: mdv.setdefault(T[k], []).append(k)
for v, ks in mdv.items():
    if len(ks) > 1: design.append('markdown 同值 %s = %s' % (v, ks))
# 4.4 品牌第二色几何
hp, _ = hue_chroma(T['primary']); hs, _ = hue_chroma(T['secondary'])
if hs is None: design.append('品牌几何：secondary 无色相（中性灰）')
else:
    diff = abs(hp - hs); diff = min(diff, 360 - diff)
    geo = '类比' if diff <= 45 else ('三角' if 95 <= diff <= 145 else ('互补' if diff > 145 else '不落类'))
    if geo == '不落类': design.append('品牌几何 %.1f° 不落类比/三角/互补' % diff)
# 4.5 语法区分度与退后
core_cr = {r_: cr(T[r_], T['codeBlockBg']) for r_ in SYN_CORE}
for i in range(len(SYN_CORE)):
    for j in range(i + 1, len(SYN_CORE)):
        d = dE76(T[SYN_CORE[i]], T[SYN_CORE[j]])
        if d < 10: design.append('语法 ΔE76 %s↔%s = %.1f (< 10)' % (SYN_CORE[i], SYN_CORE[j], d))
core_min = min(core_cr.values())
for r_ in ['syntaxComment', 'syntaxOperator']:
    c = cr(T[r_], T['codeBlockBg'])
    if c >= core_min: design.append('语法退后 %s 对比 %.2f 未低于核心最低 %.2f' % (r_, c, core_min))
# 附加：场域阶梯 L* 步长
ls = sorted((lstar(T[s]), s) for s in SURFACES)
for i in range(len(ls) - 1):
    if ls[i + 1][0] - ls[i][0] < 1.4:
        design.append('场域阶梯 %s→%s L* 差 %.2f (< 1.4)' % (ls[i][1], ls[i + 1][1], ls[i + 1][0] - ls[i][0]))

for d in design: print('  [告警]', d)
if not design: print('  设计告警 0（色相孤岛 0 / 角色碰撞 0 / markdown 同值 0 / 几何合规 / 语法 ΔE76 与退后成立）')

# ---- 附加：宿主 8px 状态圆点四态的可分性（含色觉模拟）----
def simulate_cvd(hexv, kind):
    r, g, b = [lin(v) for v in h2r(hexv)]
    L = 17.8824 * r + 43.5161 * g + 4.11935 * b
    M = 3.45565 * r + 27.1554 * g + 3.86714 * b
    S = 0.0299566 * r + 0.184309 * g + 1.46709 * b
    if kind == 'deutan':
        M = 0.494207 * L + 1.24827 * S
    elif kind == 'protan':
        L = 2.02344 * M - 2.52581 * S
    r = 0.080944 * L - 0.130504 * M + 0.116721 * S
    g = -0.0102485 * L + 0.0540194 * M - 0.113615 * S
    b = -0.000365294 * L - 0.00412163 * M + 0.693513 * S
    def enc(v):
        v = max(0.0, min(1.0, v))          # 逆变换已回到 0..1 线性尺度
        v = 12.92 * v if v <= 0.0031308 else 1.055 * (v ** (1 / 2.4)) - 0.055
        return max(0, min(255, int(v * 255 + 0.5)))
    return r2h((enc(r), enc(g), enc(b)))

print()
print('=' * 94)
print('④b 宿主 8px 状态圆点四态可分性（secondary=idle / success / warning / error）')
print('=' * 94)
DOTS = ['secondary', 'success', 'warning', 'error']
for kind in ['normal', 'deutan', 'protan']:
    worst = None
    for i in range(len(DOTS)):
        for j in range(i + 1, len(DOTS)):
            a, b = DOTS[i], DOTS[j]
            ca = T[a] if kind == 'normal' else simulate_cvd(T[a], kind)
            cb = T[b] if kind == 'normal' else simulate_cvd(T[b], kind)
            d = dE76(ca, cb)
            if worst is None or d < worst[0]: worst = (d, a, b, ca, cb)
    print('  %-7s 最小 ΔE76 = %5.1f   (%s ↔ %s)' % (kind, worst[0], worst[1], worst[2]))
    if kind == 'normal':
        for i in range(len(DOTS)):
            for j in range(i + 1, len(DOTS)):
                print('      %-9s ↔ %-9s  ΔE76 %5.1f  互相对比 %.3f:1'
                      % (DOTS[i], DOTS[j], dE76(T[DOTS[i]], T[DOTS[j]]), cr(T[DOTS[i]], T[DOTS[j]])))


print()
print('=' * 94)
print('⑤ 判尺结论')
print('=' * 94)
print('  硬性对 %d 项，违例 %d' % (n_hard, sum(1 for f in fails if f.startswith('硬性'))))
print('  UI   对 %d 项，违例 %d' % (n_ui, sum(1 for f in fails if f.startswith('UI'))))
for f in fails: print('   ', f)
print('  设计告警 %d 条' % len(design))
print('  硬性最小余量：', min(
    [cr(T['text'], T[s]) for s in SURFACES] +
    [cr(alpha_over(T['textMuted'], T[s], 0.8), T[s]) for s in MUTED_SURFACES] +
    [cr(T[r_], T['codeBlockBg']) for r_ in SYN_ROLES]))

payload = {'tokens': T, 'provenance': PROV, 'sources': SRC, 'bg_ratio': BG_RATIO,
           'fails': fails, 'design': design, 'checks': CHECKS,
           'n_hard': n_hard, 'n_extra': n_extra, 'n_ui': n_ui,
           'core_min_syntax': core_min,
           'dots': {k: {'hex': T[k], 'L': round(lstar(T[k]), 1)} for k in DOTS},
           'brand_geometry': '类比' if abs(hp - hs) <= 45 else ('三角' if 95 <= abs(hp - hs) <= 145 else '互补'),
           'brand_hue_diff': round(abs(hp - hs), 1),
           'ladder': [[s, round(lstar(T[s]), 1), T[s]] for s in SURFACES]}
with open(os.path.join(OUT, 'palette.json'), 'w', encoding='utf-8') as fh:
    json.dump(payload, fh, ensure_ascii=False, indent=1)

print()
print('  37 色位：')
for s in SURFACES + ['text', 'textMuted'] + BRAND + ['border', 'borderActive'] + \
        ['diffAdded', 'diffRemoved', 'diffAddedBg', 'diffRemovedBg',
         'diffAddedLineNumberBg', 'diffRemovedLineNumberBg'] + MD_ROLES + SYN_ROLES:
    hh, cc = hue_chroma(T[s])
    print('   %-26s %-9s L*%5.1f  Y%.4f  H%s  C%3d  %s'
          % (s, T[s], lstar(T[s]), Y(T[s]), ('--' if hh is None else '%.0f' % hh), cc, PROV[s]['recipe']))
sys.exit(1 if (fails or design) else 0)
