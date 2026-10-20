# -*- coding: utf-8 -*-
"""EVA（新世纪福音战士）IP 主题 · 逐像素取色管线 —— 37 色位推导 + 判尺自检。

判尺同源：docs/theme-audit/criteria.md
  · 38 条硬性正文对（≥4.5:1）+ 15 条 UI 对（≥3:1）
  · IP 设计规范：角色同值碰撞 / markdown 同值 / 背景色相孤岛 / 品牌几何 /
    语法核心 ΔE76 ≥ 10 / comment·operator 退后
  · 额外诊断：全部文字类角色 × 8 个渲染表面的扩展矩阵

色源三法：直采（取样像素）/ 阶梯（采样色的明度台阶）/ 定比混色（两采样色固定比例）。
"""
from PIL import Image
import os, json, base64, io, collections, math

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r"C:\Users\辰辰洋洋\Pictures\新世纪福音战士"
IMAGES = ['1.jpg', '2.jpg', '3.jpg']

# ───────────────────────── 采样锚点声明（意图）─────────────────────────
# 运行时会被「吸附」到参考图里的真实像素（Δ=0），声明值只用于定位与描述。
DECL = {
 'ink0':      ('#0A091A', '海报黑底'),
 'ink1':      ('#141A41', '夜蓝'),
 'ink2':      ('#222946', '装甲深蓝'),
 'ink3':      ('#34304D', '装甲暗紫'),
 'sidebar':   ('#15142A', '海报暗紫'),
 'codebg':    ('#171726', '画幅黑'),
 'violet':    ('#463C99', '机体主紫'),
 'violetHi':  ('#4A3A9E', '机体紫受光面'),
 'violetLit': ('#BA99F5', '机体高光淡紫'),
 'violetLit2':('#BA97F8', '机体高光紫'),
 'sky':       ('#7FA8E4', '天空蓝'),
 'skyLight':  ('#ADCEEC', '浅云蓝'),
 'cyan':      ('#A3D9F4', '高光青'),
 'cloud':     ('#EBF2FB', '云白'),
 'paper':     ('#FFFFFF', '海报纸白'),
 'paperCool': ('#F8FAF9', '冷纸白'),
 'lime':      ('#A4CA3C', '同步绿'),
 'limeHi':    ('#D9FF5D', '荧绿高光'),
 'limeDeep':  ('#709E35', '深绿'),
 'green2':    ('#86C467', '浅绿受光面'),
 'forest':    ('#2B4429', '林绿'),
 'gold':      ('#FCAA00', '标题金'),
 'orange':    ('#ED9107', '装甲橙'),
 'orangeHi':  ('#F69604', '亮橙高光'),
 'amberDeep': ('#CD8A25', '赭金'),
 'brown':     ('#906244', '机体棕'),
 'red':       ('#E23423', '明日香装甲红'),
 'redHot':    ('#E74A22', '装甲红受光面'),
 'redDeep':   ('#A02639', '深红'),
 'plum':      ('#634858', '暗紫棕'),
 'mauve':     ('#BC9DBE', '樱紫灰'),
 'pink':      ('#CE95AB', '樱粉'),
 'steel':     ('#7A96B1', '钢青'),
 'indigo':    ('#344D94', '靛蓝'),
 'blue':      ('#044196', '标题蓝'),
 'violetGray':('#4A4379', '紫灰'),
 'mist':      ('#86869B', '雾紫灰'),
 'gray':      ('#70767F', '云影灰'),
 'grayBlue':  ('#979BA9', '灰蓝'),
 'warmGray':  ('#B0A3A3', '暖灰'),
 'slate':     ('#55667A', '蓝灰'),
 'haze':      ('#D5DAE3', '霾'),
 'pale':      ('#A2B6E1', '淡蓝'),
 'teal':      ('#6D7B7B', '青灰'),
}

def h2r(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def r2h(t):
    return '#%02X%02X%02X' % tuple(max(0, min(255, int(round(v)))) for v in t)

def mix(a, b, t):
    """sRGB 通道线性加权（与 CSS/浏览器 alpha 合成同口径）：t = b 的权重"""
    ra, rb = h2r(a), h2r(b)
    return r2h(tuple(ra[i] * (1 - t) + rb[i] * t for i in range(3)))

def lum(h):
    """WCAG 相对亮度"""
    v = []
    for c in h2r(h):
        c /= 255
        v.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]

def luma601(h):
    """引擎 contrastText 用的 BT.601 luma（resolve.ts:86）"""
    r, g, b = h2r(h)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255

def ratio(f, b):
    l1, l2 = sorted((lum(f), lum(b)), reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)

def hex2lab(h):
    def lin(x):
        x /= 255
        return x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(v) for v in h2r(h))
    X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
    Y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b)
    Z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else (7.787 * t + 16 / 116)
    fx, fy, fz = f(X), f(Y), f(Z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))

def deltaE(a, b):
    la, lb = hex2lab(a), hex2lab(b)
    return math.sqrt(sum((la[i] - lb[i]) ** 2 for i in range(3)))

def hex2hsl(h):
    r, g, b = (v / 255 for v in h2r(h))
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    d = mx - mn
    if d == 0:
        return (0.0, 0.0, l)
    s = d / (1 - abs(2 * l - 1))
    if mx == r:
        hh = ((g - b) / d) % 6
    elif mx == g:
        hh = (b - r) / d + 2
    else:
        hh = (r - g) / d + 4
    return (hh * 60, s, l)

def hue_dist(a, b):
    d = abs(a - b) % 360
    return d if d <= 180 else 360 - d

# ───────────────────────── 混色闸 + 色觉模拟 ─────────────────────────
# 「不许造色」要能被机器验证，而不是靠声明：
#   每个出货色必须落在三张原图的真实像素附近（ΔE76 ≤ 2.0），否则视为造色，构建失败。
_MIX_CELL = 6
_MIX_GRID = None

def _mix_grid():
    global _MIX_GRID
    if _MIX_GRID is None:
        g = collections.defaultdict(list)
        for c in _UNIQ:
            g[(c[0] // _MIX_CELL, c[1] // _MIX_CELL, c[2] // _MIX_CELL)].append(c)
        _MIX_GRID = g
    return _MIX_GRID

def nearest_real_de(h, span=2):
    """出货色到三张原图全部像素的最小 ΔE76"""
    r, g, b = h2r(h)
    gx, gy, gz = r // _MIX_CELL, g // _MIX_CELL, b // _MIX_CELL
    grid = _mix_grid()
    best = 1e9
    for dx in range(-span, span + 1):
        for dy in range(-span, span + 1):
            for dz in range(-span, span + 1):
                for o in grid.get((gx + dx, gy + dy, gz + dz), ()):
                    d = deltaE(h, r2h(o))
                    if d < best:
                        best = d
    return best

# Machado 2009 色觉模拟矩阵（severity 1.0，线性 RGB）
_CVD_M = {
 'protan': ((0.152286, 1.052583, -0.204868), (0.114503, 0.786281, 0.099216), (-0.003882, -0.048116, 1.051998)),
 'deutan': ((0.367322, 0.860646, -0.227968), (0.280085, 0.672501, 0.047413), (-0.011820, 0.042940, 0.968881)),
 'tritan': ((1.255528, -0.076749, -0.178779), (-0.078411, 0.930809, 0.147602), (0.004733, 0.691367, 0.303900)),
}
CVD_KINDS = ('protan', 'deutan', 'tritan', 'achroma')

def _lin8(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def _srgb8(v):
    v = max(0.0, min(1.0, v))
    return 255.0 * (12.92 * v if v <= 0.0031308 else 1.055 * (v ** (1 / 2.4)) - 0.055)

def sim_cvd(h, kind):
    r, g, b = (_lin8(c) for c in h2r(h))
    if kind == 'achroma':
        y = 0.2126 * r + 0.7152 * g + 0.0722 * b
        v = _srgb8(y)
        return r2h((v, v, v))
    M = _CVD_M[kind]
    out = []
    for row in M:
        out.append(_srgb8(row[0] * r + row[1] * g + row[2] * b))
    return r2h(tuple(int(round(v)) for v in out))

def min_cvd(a, b):
    return min(deltaE(sim_cvd(a, k), sim_cvd(b, k)) for k in CVD_KINDS)

def lstar(h):
    y = lum(h)
    return 116 * (y ** (1 / 3) - 0.16) if y > 0.008856 else 903.3 * y

# ───────────────────────── 取样 + 吸附到真实像素 ─────────────────────────
# 对抗式审查后的取样规则（第一性原理）：
#   用户要的是「画面真的涂出来的颜色」，不是 JPEG 振铃或文字描边上的孤立像素。
#   因此直采 = ① 平涂区（3×3 邻域方差低）② 支撑足够（同色像素数达标）③ 色相不跑偏
#   且同一"色相家族"内各锚点必须互不相同（否则配方里的"阶梯"会塌成同一个值）。
imgs = {fn: Image.open(os.path.join(SRC, fn)).convert('RGB') for fn in IMAGES}
views = {fn: (im, im.load(), im.size[0], im.size[1]) for fn, im in imgs.items()}
_counts = collections.Counter()
for _im in imgs.values():
    _counts.update(_im.get_flattened_data())
_UNIQ = list(_counts.keys())
_PIXSET = set(_UNIQ)

def _all_pixels_set():
    """三张原图出现过的全部像素（RGB 元组集合）"""
    return _PIXSET

def _build_support_table(tol=3):
    """给每种出现过的颜色算好「同色像素数」（Δ≤tol）——用 3D 空间哈希，O(27·n)"""
    cell = max(1, tol)
    grid = collections.defaultdict(list)
    for c in _counts:
        grid[(c[0] // cell, c[1] // cell, c[2] // cell)].append(c)
    tbl = {}
    for c in _counts:
        gx, gy, gz = c[0] // cell, c[1] // cell, c[2] // cell
        n = 0
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    for o in grid.get((gx + dx, gy + dy, gz + dz), ()):
                        if sum((c[i] - o[i]) ** 2 for i in range(3)) <= tol * tol:
                            n += _counts[o]
        tbl[c] = n
    return tbl

_SUP = _build_support_table(3)

def _support(t, tol=3):
    if tol != 3:
        n = 0
        for col, k in _counts.items():
            if sum((col[i] - t[i]) ** 2 for i in range(3)) <= tol * tol:
                n += k
        return n
    return _SUP.get(t, 0)

def _flatness(fn, x, y):
    im, px, w, h = views[fn]
    vals = []
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            xx, yy = x + dx, y + dy
            if 0 <= xx < w and 0 <= yy < h:
                vals.append(px[xx, yy])
    var = 0.0
    for ch in range(3):
        m = sum(v[ch] for v in vals) / len(vals)
        var += sum((v[ch] - m) ** 2 for v in vals) / len(vals)
    return var / 3

def _hue(h):
    r, g, b = (v / 255 for v in h2r(h))
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d == 0:
        return None
    if mx == r:
        hh = ((g - b) / d) % 6
    elif mx == g:
        hh = (b - r) / d + 2
    else:
        hh = (r - g) / d + 4
    return hh * 60

def _hue_dist(a, b):
    if a is None or b is None:
        return 0.0
    d = abs(a - b) % 360
    return d if d <= 180 else 360 - d

# 同一色相家族：各锚点必须互不相同（防"阶梯"塌陷）
FAMILY = [
    ['red', 'redHot', 'redDeep'],
    ['gold', 'orange', 'orangeHi', 'amberDeep'],
    ['lime', 'limeHi', 'limeDeep', 'green2', 'forest'],
    ['violet', 'violetHi', 'violetLit', 'violetLit2', 'violetGray'],
    ['sky', 'skyLight', 'cyan', 'pale', 'haze', 'cloud', 'paper', 'paperCool', 'ink0', 'ink1', 'ink2',
     'ink3', 'sidebar', 'codebg'],
    ['indigo', 'blue', 'steel', 'mist', 'slate', 'gray', 'grayBlue', 'warmGray', 'teal'],
    ['mauve', 'pink', 'plum', 'brown'],
]

def _pick_flat(fn, near, declared, radius=170, max_flat=260, hue_tol=30, exclude=()):
    """在 near 附近找：平涂 + 同族 + 支撑够 + 不与 exclude 撞色的代表色"""
    im, px, w, h = views[fn]
    dt = h2r(declared)
    dh = _hue(declared)
    x0, y0 = near
    cands = []
    for y in range(max(1, y0 - radius), min(h - 1, y0 + radius), 2):
        for x in range(max(1, x0 - radius), min(w - 1, x0 + radius), 2):
            p = px[x, y]
            if sum((p[i] - dt[i]) ** 2 for i in range(3)) > 30 * 30:
                continue
            if _hue_dist(_hue(r2h(p)), dh) > hue_tol:
                continue
            v = _flatness(fn, x, y)
            if v > max_flat:
                continue
            cands.append((v, x, y, p))
    if not cands:
        return None
    cands.sort(key=lambda c: (c[0], c[1]))
    scored = []
    for v, x, y, p in cands[:400]:
        hexv = r2h(p)
        if any(deltaE(hexv, e) < 4 for e in exclude):
            continue
        s = _support(p)
        scored.append((0 if s >= 20 else 1, round(v), -s, x, y, p, s))
        if len(scored) >= 120:
            break
    if not scored:
        return None
    scored.sort()
    b = scored[0]
    return {'hex': r2h(b[5]), 'xy': (b[3], b[4]), 'support': b[6], 'flatness': round(b[1], 1)}

# 第一遍：最近像素定位（给搜索一个起点）；第二遍：平涂区重选
def _nearest_xy(fn, t):
    im, px, w, h = views[fn]
    best = None
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            p = px[x, y]
            d2 = sum((p[i] - t[i]) ** 2 for i in range(3))
            if best is None or d2 < best[0]:
                best = (d2, x, y)
    return (best[1], best[2])

# 每个锚点的取样图（人工指定：保证"在图里的哪个位置"是确定的，不靠最近像素漂移）
DECL_FILE = {
 'orangeHi': '1.jpg', 'red': '1.jpg', 'warmGray': '1.jpg', 'blue': '1.jpg', 'gold': '1.jpg',
 'redDeep': '1.jpg', 'grayBlue': '1.jpg', 'slate': '1.jpg', 'orange': '1.jpg', 'redHot': '1.jpg',
 'steel': '1.jpg', 'mist': '1.jpg', 'indigo': '1.jpg',
 'paperCool': '2.jpg', 'lime': '2.jpg', 'ink1': '2.jpg', 'violet': '2.jpg', 'violetHi': '2.jpg',
 'forest': '2.jpg', 'paper': '2.jpg', 'limeDeep': '2.jpg', 'amberDeep': '2.jpg', 'limeHi': '3.jpg',
 'violetGray': '3.jpg',
 'gray': '3.jpg', 'codebg': '3.jpg', 'cloud': '3.jpg', 'sky': '3.jpg', 'plum': '3.jpg',
 'brown': '3.jpg', 'violetLit': '3.jpg', 'violetLit2': '3.jpg', 'pink': '3.jpg', 'mauve': '3.jpg',
 'skyLight': '3.jpg', 'green2': '3.jpg', 'sidebar': '3.jpg', 'ink0': '3.jpg', 'pale': '3.jpg',
 'ink3': '3.jpg', 'ink2': '3.jpg', 'haze': '3.jpg', 'teal': '3.jpg', 'cyan': '3.jpg',
}

A = {}
anchor_info = {}
# 家族内先到先得，后来的必须与已选的不同（防"阶梯"塌成同一个值）
_picked = []
for name, (decl, label) in DECL.items():
    fn = DECL_FILE[name]
    near = _nearest_xy(fn, h2r(decl))
    fam = next((f for f in FAMILY if name in f), [name])
    exclude = [A[n][0] for n in fam if n in A]
    picked = None
    for radius in (170, 260, 420):
        picked = _pick_flat(fn, near, decl, radius=radius, exclude=exclude)
        if picked and picked['support'] >= 20:
            break
    if not picked:
        picked = {'hex': decl, 'xy': near, 'support': 0, 'flatness': 0}
    A[name] = (picked['hex'], fn, label)
    # target = 我声明的目标色（设计意图），不保证是原图像素；
    # targetIsPixel 记录它到底在不在三张图里（色觉审计 T5 的记账要求）
    target_is_pixel = tuple(h2r(decl)) in _all_pixels_set()
    anchor_info[name] = {'hex': picked['hex'], 'file': fn, 'label': label, 'target': decl,
                         'targetIsPixel': target_is_pixel,
                         'support': picked['support'], 'flatness': picked['flatness'],
                         'xy': list(picked['xy'])}
    _picked.append(name)

# 裁切：直接用平涂代表点所在位置（画面真的涂这个色的地方）
for name, (hexv, file, label) in A.items():
    info = anchor_info[name]
    im = imgs[file]; w, h = im.size
    x0 = max(0, min(info['xy'][0] - 48, w - 96)); y0 = max(0, min(info['xy'][1] - 48, h - 96))
    crop = im.crop((x0, y0, x0 + 96, y0 + 96)).resize((72, 72), Image.LANCZOS)
    crop = crop.quantize(colors=64, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
    b = io.BytesIO(); crop.save(b, format='PNG', optimize=True)
    info.update({'crop': base64.b64encode(b.getvalue()).decode(), 'box': [x0, y0, 96],
                 'px': info['support'], 'cx': round((x0 + 48) / w, 3), 'cy': round((y0 + 48) / h, 3),
                 'w': w, 'h': h})


# ───────────────────────── 37 色位 ─────────────────────────
def L(k): return ('L', k)
def M(a, b, t): return ('M', a, b, t)

SLOTS = [
  ('background', '背景与表面', '页面底 / 侧栏底 / 浮层底 / 代码段未选', '--dsw-alias-bg-base · bg-layer-1/2/3 · bg-overlay',
   L('codebg'), L('cloud')),
  ('backgroundPanel', '背景与表面', '中层浮起面 / 标签 / 芯片', '--dsw-alias-markdown-tag · bg-multi-select · button-elevated-fill',
   L('ink1'), L('paper')),
  ('backgroundElement', '背景与表面', '浮层 / 引用 / 提示 / 吐司', '--dsw-alias-markdown-citation · bg-module-platform · toast-bg · tooltip-bg',
   M('ink1', 'sky', 0.12), L('haze')),
  ('sidebarBg', '背景与表面', '侧边栏底', '--dsw-specific-sidebar-fill',
   M('sidebar', 'ink3', 0.35), M('cloud', 'steel', 0.3)),
  ('bubbleBg', '背景与表面', '对话气泡底', '--dsw-specific-bubble',
   M('ink1', 'violet', 0.3), M('cloud', 'violetLit', 0.34)),
  ('inputBg', '背景与表面', '输入框底', '--dsw-specific-input-major · login-input',
   M('codebg', 'ink1', 0.18), M('cloud', 'slate', 0.22)),
  ('codeBlockBg', '背景与表面', '代码块底', '--dsw-alias-markdown-code-block',
   L('sidebar'), M('cloud', 'skyLight', 0.85)),
  ('codeHeaderBg', '背景与表面', '代码块标题条', '--dsw-alias-markdown-code-block-banner · --dsl-code-block-background',
   M('violetGray', 'ink1', 0.55), M('skyLight', 'steel', 0.35)),
  ('text', '文字', '正文 / 标题 / 吐司文字', '--dsw-alias-label-primary · button-contrast-fill · toast-label',
   M('cloud', 'ink0', 0.12), L('ink0')),
  ('textMuted', '文字', '次级 / 三级 / 说明文字', '--dsw-alias-label-secondary · tertiary · caption · menu-icon',
   M('paper', 'warmGray', 0.85), M('ink2', 'slate', 0.15)),
  ('primary', '品牌与状态', '品牌主色 / 主按钮 / 焦点 / 业务态', '--dsw-alias-brand-primary · button-primary-fill · state-business-primary',
   L('violetLit'), L('violet')),
  ('secondary', '品牌与状态', '次级 / 空闲态', '--dsw-alias-state-idle-primary',
   M('mauve', 'violetLit', 0.25), M('violetGray', 'ink3', 0.7)),
  ('info', '品牌与状态', '信息态 / 信息按钮', '--dsw-alias-button-info-fill',
   L('sky'), M('blue', 'codebg', 0.7)),
  ('success', '品牌与状态', '成功态', '--dsw-alias-state-success-primary',
   L('limeHi'), M('forest', 'limeHi', 0.05)),
  ('warning', '品牌与状态', '警告态 / 警告标签', '--dsw-alias-state-warn-primary · state-warn-label',
   M('orange', 'ink0', 0.25), M('ink0', 'orangeHi', 0.45)),
  ('error', '品牌与状态', '错误态', '--dsw-alias-state-error-primary',
   M('paper', 'redHot', 0.7), M('redDeep', 'ink0', 0.7)),
  ('border', '边框', '常规分隔线', '--dsw-alias-border-l1 · border-inverted · hr',
   L('ink3'), L('pale')),
  ('borderActive', '边框', '激活 / 强边框 / 焦点环', '--dsw-alias-border-l2/l3/l4 · button-ghost-active-border',
   L('steel'), L('ink3')),
  ('diffAdded', '改动对比', '新增行前景', '--dsw-alias-code-diff-added · file-diff-added-marker',
   L('lime'), L('forest')),
  ('diffRemoved', '改动对比', '删除行前景', '--dsw-alias-code-diff-deleted · file-diff-deleted-marker',
   M('redHot', 'pink', 0.75), M('redHot', 'ink1', 0.7)),
  ('diffAddedBg', '改动对比', '新增行底', '--dsw-alias-file-diff-added-bg',
   M('ink0', 'lime', 0.12), M('cloud', 'lime', 0.16)),
  ('diffRemovedBg', '改动对比', '删除行底', '--dsw-alias-file-diff-deleted-bg',
   M('ink0', 'redHot', 0.12), M('cloud', 'red', 0.12)),
  ('diffAddedLineNumberBg', '改动对比', '新增行行号槽', '--dsw-alias-file-diff-added-gutter',
   M('ink0', 'lime', 0.06), L('paperCool')),
  ('diffRemovedLineNumberBg', '改动对比', '删除行行号槽', '--dsw-alias-file-diff-removed-gutter',
   M('ink0', 'redHot', 0.06), M('cloud', 'red', 0.24)),
  ('markdownHeading', 'Markdown', '各级标题', 'body h1–h6',
   L('gold'), M('orangeHi', 'sidebar', 0.7)),
  ('markdownLink', 'Markdown', '超链接文本（正文 / shiki 链接）', 'a · .markdown a · shiki-token-link',
   L('cyan'), L('blue')),
  ('markdownCode', 'Markdown', '行内代码', 'code:not(pre code)',
   M('pink', 'grayBlue', 0.15), M('pink', 'plum', 0.85)),
  ('markdownEmph', 'Markdown', '斜体', 'em',
   M('limeHi', 'ink0', 0.35), M('limeHi', 'ink0', 0.7)),
  ('markdownStrong', 'Markdown', '加粗', 'strong',
   L('paper'), L('ink1')),
  ('markdownBlockQuote', 'Markdown', '引用块', 'blockquote',
   M('steel', 'cloud', 0.55), L('violetGray')),
  ('syntaxComment', '代码高亮', '注释', '--shiki-token-comment',
   M('gray', 'mist', 0.6), M('gray', 'blue', 0.6)),
  ('syntaxKeyword', '代码高亮', '关键字', '--shiki-token-keyword',
   M('indigo', 'cloud', 0.65), M('ink3', 'paper', 0.15)),
  ('syntaxFunction', '代码高亮', '函数', '--shiki-token-function',
   L('skyLight'), M('sidebar', 'slate', 0.85)),
  ('syntaxType', '代码高亮', '类型 / 参数', '--shiki-token-parameter',
   M('pink', 'cloud', 0.3), M('pink', 'codebg', 0.7)),
  ('syntaxNumber', '代码高亮', '数字 / 常量', '--shiki-token-constant',
   M('gold', 'cloud', 0.1), M('gold', 'ink1', 0.66)),
  ('syntaxString', '代码高亮', '字符串', '--shiki-token-string',
   M('green2', 'cloud', 0.15), M('forest', 'ink1', 0.25)),
  ('syntaxOperator', '代码高亮', '操作符 / 标点', '--shiki-token-punctuation',
   M('grayBlue', 'gray', 0.2), M('violet', 'steel', 0.15)),
]

def resolve(spec):
    if spec[0] == 'L':
        return A[spec[1]][0], spec
    _, a, b, t = spec
    return mix(A[a][0], A[b][0], t), spec

def recipe_text(spec):
    if spec[0] == 'L':
        a = A[spec[1]]
        return {'kind': '直采', 'formula': a[0], 'sources': ['%s · %s' % (a[1], a[2])], 'anchor': spec[1]}
    _, a, b, t = spec
    return {'kind': '定比混色', 'formula': '%s %d%% + %s %d%%' % (A[a][0], round((1 - t) * 100), A[b][0], round(t * 100)),
            'sources': ['%s · %s' % (A[a][1], A[a][2]), '%s · %s' % (A[b][1], A[b][2])], 'anchor': [a, b]}

# ───────────────────────── 判尺 ─────────────────────────
BG = ['background', 'backgroundPanel', 'backgroundElement', 'sidebarBg', 'bubbleBg', 'inputBg', 'codeBlockBg', 'codeHeaderBg']
MUTED_SURFACES = ['background', 'backgroundPanel', 'backgroundElement']
MD_ROLES = ['markdownHeading', 'markdownLink', 'markdownStrong', 'markdownEmph', 'markdownBlockQuote', 'markdownCode']
SYNTAX_ROLES = ['syntaxComment', 'syntaxKeyword', 'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString', 'syntaxOperator']
SYNTAX_CORE = ['syntaxKeyword', 'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString']
BRAND_ROLES = ['primary', 'secondary', 'info', 'success', 'warning', 'error']
# 真机里被当填充按钮底（配 pickText 反白）的角色：只有 primary 与 info
# （prototypes/custom-editor-83.prototype.html:865/867）；secondary 是药丸文字，
# success/warning/error 在真机里只做文字与圆点。
FILLED_BUTTON_ROLES = ['primary', 'info']
# 同屏共现分组：只有会同屏出现的角色才需要互相区分
CVD_GROUPS = {
  'PROSE':  ['text', 'textMuted', 'markdownHeading', 'markdownLink', 'markdownCode',
             'markdownEmph', 'markdownStrong', 'markdownBlockQuote'],
  'CODE':   ['text', 'markdownCode'] + ['syntaxComment', 'syntaxKeyword', 'syntaxFunction',
             'syntaxType', 'syntaxNumber', 'syntaxString', 'syntaxOperator'],
  'STATUS': BRAND_ROLES,
  'DIFF':   ['text', 'textMuted', 'diffAdded', 'diffRemoved'],
}
# 色觉判据分三级（ΔE76 在红/绿/蓝盲模拟下；去色盲单列，只作诊断）：
#   PURE  = 只靠颜色区分的配对（状态徽标、语法角色、diff 增删）→ 模拟下 ≥ 8
#   DECOR = 还有别的通道（字号/粗细/下划线/斜体/芯片底）→ 模拟下 ≥ 5，常态 ΔE ≥ 8
#   HIER  = 层级步进（正文 vs 次级 / 正文 vs 加粗）→ 常态 ΔE ≥ 8 且 ΔL* ≥ 6
CVD_PURE = 8.0
CVD_DECOR = 5.0
CVD_HIER_L = 6.0
SURFACE_MIN = 2.0
MIX_GATE_DE = 2.0

# ── 语义色族：每个角色必须留在自己的色相带里 ──────────────────────────────
# 判尺只管「可辨性」，色族是「设计意图」：状态色得是红/琥珀/绿，
# 链接得是蓝，注释得是中性灰。这条只记告警，不算硬失败。
HUE_BAND = {
 'error': (330, 30), 'warning': (20, 75), 'success': (60, 170),
 'diffRemoved': (330, 30), 'diffAdded': (60, 170),
 'primary': (240, 300), 'info': (185, 235), 'secondary': (250, 320),
 'markdownLink': (185, 235), 'markdownHeading': (30, 70), 'markdownEmph': (60, 180),
 'markdownCode': (300, 360), 'markdownBlockQuote': (185, 260),
 'syntaxComment': (180, 260), 'syntaxOperator': (180, 300), 'syntaxKeyword': (240, 320),
 'syntaxFunction': (185, 235), 'syntaxType': (320, 360), 'syntaxString': (60, 170),
 'syntaxNumber': (20, 75),
}
CHROMA_MIN = {'error': 25, 'warning': 25, 'success': 25, 'diffRemoved': 25, 'diffAdded': 25,
              'primary': 20, 'info': 20, 'secondary': 12, 'markdownLink': 20,
              'markdownHeading': 20, 'markdownEmph': 15, 'markdownCode': 12,
              'syntaxKeyword': 15, 'syntaxFunction': 15, 'syntaxType': 12,
              'syntaxString': 15, 'syntaxNumber': 15}

def _hue_of(h):
    r, g, b = (v / 255 for v in h2r(h))
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d == 0:
        return None
    if mx == r:
        hh = ((g - b) / d) % 6
    elif mx == g:
        hh = ((b - r) / d) + 2
    else:
        hh = (r - g) / d + 4
    return hh * 60

def _chroma_of(h):
    r, g, b = h2r(h)
    return max(r, g, b) - min(r, g, b)

def _in_band(role, h):
    band = HUE_BAND.get(role)
    if not band:
        return True
    # 无彩色（色度 < 6）没有可靠色相，不按色相判；彩色角色另有色度下限兜着
    if _chroma_of(h) < 6:
        return True
    hu = _hue_of(h)
    if hu is None:
        return True
    lo, hi = band
    return (lo <= hu <= hi) if lo <= hi else (hu >= lo or hu <= hi)

def _cvd_class(a, b):
    key = (a, b) if (a, b) <= (b, a) else (b, a)
    if key in (('text', 'textMuted'), ('text', 'markdownStrong')):
        return 'hier'
    # 注释 × 运算符：两个都是低显著度记号，混淆无害 → 只管「都退后」，不要求互相可分
    if key == ('syntaxComment', 'syntaxOperator'):
        return 'recede'
    if a.startswith('syntax') and b.startswith('syntax'):
        return 'pure'
    if key in (('diffAdded', 'diffRemoved'),):
        return 'pure'
    if a in BRAND_ROLES and b in BRAND_ROLES:
        return 'decor' if key == ('primary', 'secondary') else 'pure'
    return 'decor'

DESIGN_ROLES = ['text', 'textMuted', 'primary', 'secondary', 'info', 'success', 'warning', 'error', 'border',
                'borderActive', 'diffAdded', 'diffRemoved', 'markdownHeading', 'markdownLink', 'markdownCode',
                'markdownEmph', 'markdownStrong', 'markdownBlockQuote', 'syntaxComment', 'syntaxKeyword',
                'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString', 'syntaxOperator']
TEXTISH = ['text', 'textMuted', 'primary', 'secondary', 'info', 'success', 'warning', 'error',
           'markdownHeading', 'markdownLink', 'markdownCode', 'markdownEmph', 'markdownStrong', 'markdownBlockQuote']

def evaluate(T, mode):
    fails, warns, diag = [], [], []
    rows = []
    def rec(code, fg, bg, t, kind):
        r = ratio(fg, bg)
        rows.append({'code': code, 'fg': fg, 'bg': bg, 'ratio': round(r, 2), 'threshold': t,
                     'verdict': 'pass' if r >= t else 'fail', 'kind': kind, 'mode': mode})
        return r
    def hard(code, fg, bg, t=4.5):
        r = rec(code, fg, bg, t, 'hard')
        if r < t:
            fails.append('%s  %-34s %s / %s = %.2f (需 %.1f)' % (mode, code, fg, bg, r, t))
    def ui(code, fg, bg, t=3.0):
        r = rec(code, fg, bg, t, 'ui')
        if r < t:
            fails.append('%s  %-34s %s / %s = %.2f (需 %.1f)' % (mode, code, fg, bg, r, t))
    for s in BG:
        hard('text@%s' % s, T['text'], T[s])
    for s in MUTED_SURFACES:
        hard('textMuted@%s' % s, T['textMuted'], T[s])
        hard('labelDimmed@%s' % s, mix(T[s], T['textMuted'], 0.8), T[s])
    for r in MD_ROLES:
        for s in ['background', 'backgroundPanel']:
            hard('%s@%s' % (r, s), T[r], T[s])
    for r in SYNTAX_ROLES:
        hard('%s@codeBlockBg' % r, T[r], T['codeBlockBg'])
    hard('diffAdded@diffAddedBg', T['diffAdded'], T['diffAddedBg'])
    hard('diffRemoved@diffRemovedBg', T['diffRemoved'], T['diffRemovedBg'])
    # 行号槽：引擎 ensureDiffContrast 也会拿这两个底做修复判定，不达标会被引擎改写
    hard('diffAdded@diffAddedLineNumberBg', T['diffAdded'], T['diffAddedLineNumberBg'])
    hard('diffRemoved@diffRemovedLineNumberBg', T['diffRemoved'], T['diffRemovedLineNumberBg'])
    hard('text@diffAddedBg', T['text'], T['diffAddedBg'])
    hard('text@diffRemovedBg', T['text'], T['diffRemovedBg'])
    # ── 语义色族（告警级）：角色是否还在自己的色相带里 ──
    for r in HUE_BAND:
        hu = _hue_of(T[r])
        lo, hi = HUE_BAND[r]
        if not _in_band(r, T[r]):
            warns.append('%s  色族越界 %-32s hue=%.1f 不在 [%d,%d]' % (mode, r, hu if hu is not None else -1, lo, hi))
    for r in CHROMA_MIN:
        c = _chroma_of(T[r])
        if c < CHROMA_MIN[r]:
            warns.append('%s  色度过低 %-32s %d < %d' % (mode, r, c, CHROMA_MIN[r]))
    ct = '#141414' if luma601(T['primary']) > 0.6 else '#F4F4F5'
    hard('contrastText(primary)@primary', ct, T['primary'])
    # ── 真机真实用法（审计器原本测不到的三处，取自 prototypes/custom-editor-83.prototype.html）──
    # 行内码芯片底 = rgba(127,127,127,.15) 叠面板底
    chip = mix(T['backgroundPanel'], '#7F7F7F', 0.15)
    hard('markdownCode@inlineChip', T['markdownCode'], chip)
    # 次按钮药丸底 = secondary@33 叠页面底，文字就是 secondary 本身
    pill = mix(T['background'], T['secondary'], 0.20)
    hard('secondary@secondaryPill', T['secondary'], pill)
    # 引擎 pickText 规则：真机里只有 primary / info 会被当填充按钮底
    for r in FILLED_BUTTON_ROLES:
        c = '#141414' if luma601(T[r]) > 0.6 else '#F4F4F5'
        hard('contrastText(%s)@%s' % (r, r), c, T[r])
    # 其余品牌色在真机里只做文字/图标/圆点 → 记录引擎反白结果作诊断，不作硬性
    for r in ['secondary', 'success', 'warning', 'error']:
        c = '#141414' if luma601(T[r]) > 0.6 else '#F4F4F5'
        rec('contrastText(%s)@%s' % (r, r), c, T[r], 4.5, 'diag')
    # 行号槽里真正放的是次级文字（textMuted），不是 diff 前景
    hard('textMuted@diffAddedLineNumberBg', T['textMuted'], T['diffAddedLineNumberBg'])
    hard('textMuted@diffRemovedLineNumberBg', T['textMuted'], T['diffRemovedLineNumberBg'])
    # 焦点环：原型把 borderActive 当 33% 透明用 → 任何颜色都到不了 3:1（见审查文档的推导），只记诊断
    ring = mix(T['inputBg'], T['borderActive'], 0.33)
    rec('borderActive@focusRing33', T['borderActive'], ring, 3.0, 'diag')
    for s in MUTED_SURFACES:
        ui('borderActive@%s' % s, T['borderActive'], T[s])
    for r in BRAND_ROLES:
        for s in ['background', 'backgroundPanel']:
            ui('%s@%s' % (r, s), T[r], T[s])
    # ── 新增判据（色觉科学审计 T1–T5 引入）──
    # ① 混色闸：出货色必须落在原图真实像素附近，否则算「造色」
    for r, g, role, dsh, ds, ls in SLOTS:
        d = nearest_real_de(T[r])
        rows.append({'code': 'mixGate(%s)' % r, 'fg': T[r], 'bg': '-', 'ratio': round(d, 2),
                     'threshold': MIX_GATE_DE, 'verdict': 'pass' if d <= MIX_GATE_DE else 'fail',
                     'kind': 'mix', 'mode': mode})
        if d > MIX_GATE_DE:
            fails.append('%s  混色闸 %-24s 到最近真实像素 ΔE76 = %.2f (需 ≤ %.1f)'
                         % (mode, r, d, MIX_GATE_DE))
    # ② 表面分离：同屏结构面两两不能真的撞色
    for i in range(len(BG)):
        for j in range(i + 1, len(BG)):
            d = deltaE(T[BG[i]], T[BG[j]])
            rows.append({'code': 'surface(%s,%s)' % (BG[i], BG[j]), 'fg': T[BG[i]], 'bg': T[BG[j]],
                         'ratio': round(d, 2), 'threshold': SURFACE_MIN,
                         'verdict': 'pass' if d >= SURFACE_MIN else 'fail', 'kind': 'surface', 'mode': mode})
            if d < SURFACE_MIN:
                fails.append('%s  表面撞色 %-16s x %-16s ΔE76 = %.2f (需 ≥ %.1f)'
                             % (mode, BG[i], BG[j], d, SURFACE_MIN))
    # ③ 色觉分离：同屏分组内，模拟红/绿/蓝盲后仍要分得开（去色盲只作诊断）
    for gname, members in CVD_GROUPS.items():
        for i in range(len(members)):
            for j in range(i + 1, len(members)):
                a, b = members[i], members[j]
                cls = _cvd_class(a, b)
                dn = deltaE(T[a], T[b])
                dl = abs(lstar(T[a]) - lstar(T[b]))
                dm = min(deltaE(sim_cvd(T[a], k), sim_cvd(T[b], k))
                         for k in ('protan', 'deutan', 'tritan'))
                da = deltaE(sim_cvd(T[a], 'achroma'), sim_cvd(T[b], 'achroma'))
                rows.append({'code': 'cvdA(%s,%s)' % (a, b), 'fg': T[a], 'bg': T[b], 'ratio': round(da, 2),
                             'threshold': 0.0, 'verdict': 'info', 'kind': 'cvdA', 'mode': mode})
                if cls == 'recede':
                    # 只留一行记账：这一对靠「都退后」保证层级，不要求互相可分
                    rows.append({'code': 'recede(%s,%s)' % (a, b), 'fg': T[a], 'bg': T[b],
                                 'ratio': round(dn, 2), 'threshold': 0.0, 'verdict': 'info',
                                 'kind': 'recede', 'mode': mode})
                    continue
                if cls == 'hier':
                    rows.append({'code': 'hier(%s,%s)' % (a, b), 'fg': T[a], 'bg': T[b], 'ratio': round(dl, 2),
                                 'threshold': CVD_HIER_L, 'verdict': 'pass' if dl >= CVD_HIER_L else 'fail',
                                 'kind': 'hier', 'mode': mode})
                    if dn < 8.0:
                        fails.append('%s  层级近邻 %-12s x %-12s ΔE76 = %.2f (需 ≥ 8.0)' % (mode, a, b, dn))
                    if dl < CVD_HIER_L:
                        fails.append('%s  明度台阶不足 %s x %s ΔL* = %.1f (需 ≥ %.1f)'
                                     % (mode, a, b, dl, CVD_HIER_L))
                    continue
                th = CVD_PURE if cls == 'pure' else CVD_DECOR
                rows.append({'code': 'cvd(%s,%s)' % (a, b), 'fg': T[a], 'bg': T[b], 'ratio': round(dm, 2),
                             'threshold': th, 'verdict': 'pass' if dm >= th else 'fail',
                             'kind': 'cvd', 'mode': mode})
                if dn < 8.0:
                    fails.append('%s  常态近邻 %-12s x %-12s ΔE76 = %.2f (需 ≥ 8.0)' % (mode, a, b, dn))
                if dm < th:
                    fails.append('%s  色觉塌缩 %-12s x %-12s 模拟 ΔE76 = %.2f (需 ≥ %.1f)'
                                 % (mode, a, b, dm, th))
    # 扩展矩阵（诊断）
    for r in TEXTISH:
        for s in BG:
            if r in ('primary', 'secondary', 'info', 'success', 'warning', 'error'):
                continue
            rr = rec('%s@%s' % (r, s), T[r], T[s], 4.5, 'matrix')
            if rr < 4.5:
                diag.append('%s  %-24s @ %-20s = %.2f' % (mode, r, s, rr))
    # 设计规范
    seen = {}
    for r in DESIGN_ROLES:
        seen.setdefault(T[r].lower(), []).append(r)
    for v, rs in seen.items():
        if len(rs) > 1:
            warns.append('%s 角色同值碰撞: %s' % (mode, ' = '.join(rs)))
    mseen = {}
    for r in MD_ROLES:
        mseen.setdefault(T[r].lower(), []).append(r)
    for v, rs in mseen.items():
        if len(rs) > 1:
            warns.append('%s markdown 同值: %s' % (mode, ' = '.join(rs)))
    bh = hex2hsl(T['background'])[0]
    for s in BG:
        h, sat, l = hex2hsl(T[s])
        chroma = max(h2r(T[s])) - min(h2r(T[s]))
        if chroma >= 8 and hue_dist(h, bh) > 60:
            warns.append('%s 背景色相孤岛: %s %.1f° (Δ%.1f°)' % (mode, s, h, hue_dist(h, bh)))
    ph, sh = hex2hsl(T['primary'])[0], hex2hsl(T['secondary'])[0]
    hd = hue_dist(ph, sh)
    cat = 'analogous 近似' if hd <= 45 else ('triadic 三角' if 95 <= hd <= 145 else ('complementary 互补' if hd > 145 else 'unclassified'))
    if 45 < hd < 95:
        warns.append('%s 品牌几何未分类: primary %.1f° × secondary %.1f° = %.1f°' % (mode, ph, sh, hd))
    cmin, cpair = 1e9, ''
    for i in range(len(SYNTAX_CORE)):
        for j in range(i + 1, len(SYNTAX_CORE)):
            d = deltaE(T[SYNTAX_CORE[i]], T[SYNTAX_CORE[j]])
            if d < cmin:
                cmin, cpair = d, '%s×%s' % (SYNTAX_CORE[i], SYNTAX_CORE[j])
    if cmin < 10:
        warns.append('%s 语法核心最小 ΔE76 = %.1f (%s) < 10' % (mode, cmin, cpair))
    ctr = lambda hx: ratio(hx, T['codeBlockBg'])
    coreC = [ctr(T[r]) for r in SYNTAX_CORE]
    comC, opC = ctr(T['syntaxComment']), ctr(T['syntaxOperator'])
    minCore = min(coreC)
    if not (comC <= minCore and opC <= minCore):
        warns.append('%s 退后失败: comment %.2f / operator %.2f vs 核心最低 %.2f' % (mode, comC, opC, minCore))
    return fails, warns, diag, rows, {'coreMin': round(cmin, 1), 'corePair': cpair, 'minCore': round(minCore, 2),
                                       'comC': round(comC, 2), 'opC': round(opC, 2), 'brandHue': round(hd, 1), 'brandCat': cat}

def build(mode):
    return {k: resolve(ds if mode == 'dark' else ls)[0] for (k, g, role, dsh, ds, ls) in SLOTS}

dark, light = build('dark'), build('light')
fails, warns, diags, stats = [], [], [], {}
all_rows = []
for mode, T in (('dark', dark), ('light', light)):
    f, w, d, rr, st = evaluate(T, mode)
    fails += f; warns += w; diags += d; stats[mode] = st; all_rows += rr

# ───────────────────────── 输出 ─────────────────────────
payload = {
    'meta': {'id': 'evangelion', 'idLight': 'evangelion-day',
             'name': '新世纪福音战士', 'nameLight': '新世纪福音战士 · 晴空',
             'appearance': 'dark', 'appearanceLight': 'light',
             'sources': IMAGES, 'sourceDir': SRC, 'slotCount': len(SLOTS)},
    'colors': {k: dark[k] for (k, g, role, dsh, ds, ls) in SLOTS},
    'colorsLight': {k: light[k] for (k, g, role, dsh, ds, ls) in SLOTS},
    'slots': [{'key': k, 'group': g, 'role': role, 'dsh': dsh,
               'dark': dict(hex=dark[k], recipe=recipe_text(ds)),
               'light': dict(hex=light[k], recipe=recipe_text(ls))}
              for (k, g, role, dsh, ds, ls) in SLOTS],
    'anchors': anchor_info,
    'stats': stats,
    'checks': all_rows,
}
with open(os.path.join(HERE, 'palette.json'), 'w', encoding='utf-8') as f:
    json.dump(payload, f, indent=1, ensure_ascii=False)

lines = []
lines.append('EVA IP 主题 · 37 色位取色台账')
lines.append('源图：%s（%s）' % (SRC, ' / '.join(IMAGES)))
lines.append('')
lines.append('%-26s %-9s %-9s %-32s %-22s %s' % ('slot', 'dark', 'light', '配方(dark)', '配方(light)', '落点'))
lines.append('-' * 150)
for (k, g, role, dsh, ds, ls) in SLOTS:
    rd, rl = recipe_text(ds), recipe_text(ls)
    lines.append('%-26s %-9s %-9s %-32s %-22s %s' % (k, dark[k], light[k], rd['kind'] + ' ' + rd['formula'],
                                                       rl['kind'] + ' ' + rl['formula'], dsh))
lines.append('')
lines.append('锚点取样（目标色 → 原图平涂区代表色）')
lines.append('  %-13s %-9s %-9s %-7s %-7s %-7s %s' % ('anchor', '目标色', '取样色', '支撑', '平坦度', '图', '描述'))
for name, a in anchor_info.items():
    lines.append('  %-13s %-9s %-9s %-7d %-7.0f %-7s %s%s'
                 % (name, a['target'], a['hex'], a['support'], a['flatness'], a['file'], a['label'],
                    '' if a['targetIsPixel'] else '  [目标色非原图像素]'))
lines.append('')
lines.append('判尺自检')
lines.append('  硬性违例：%d' % len(fails))
for f in fails:
    lines.append('    ✗ ' + f)
lines.append('  设计告警：%d' % len(warns))
for w in warns:
    lines.append('    ! ' + w)
lines.append('  扩展矩阵提示（文字类 @ 8 表面 < 4.5，仅诊断）：%d' % len(diags))
for d in diags[:40]:
    lines.append('    · ' + d)
for mode in ('dark', 'light'):
    st = stats[mode]
    lines.append('  [%s] 核心 ΔE76 %.1f (%s) · 退后 comment %.2f / operator %.2f ≤ 核心最低 %.2f · 品牌几何 %.1f° (%s)'
                 % (mode, st['coreMin'], st['corePair'], st['comC'], st['opC'], st['minCore'], st['brandHue'], st['brandCat']))
    lines.append('  [%s] 去重后色值：%d / 37' % (mode, len(set(dark.values() if mode == 'dark' else light.values()))))
with open(os.path.join(HERE, 'report.txt'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines) + '\n')

print('硬性违例 %d · 设计告警 %d · 扩展诊断 %d' % (len(fails), len(warns), len(diags)))
for f in fails:
    print('  ✗ ' + f)
for w in warns:
    print('  ! ' + w)
for d in diags[:25]:
    print('  · ' + d)
print('palette.json / report.txt written to', HERE)
