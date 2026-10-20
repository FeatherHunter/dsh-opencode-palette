# audit_sim.py — 复刻 scripts/audit-themes.ts 的判尺（IP 浅色主题口径），本地迭代用。
# 目标：硬性 4.5/3.0 违例 = 0；设计告警（碰撞/markdown 同值/语法区分度/退后/孤岛）= 0。
import json, math, re, sys

# ── 颜色工具（与 resolve.ts 同口径）──
def hex2rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def rgb2hex(r, g, b):
    return '#%02X%02X%02X' % (tuple(max(0, min(255, round(v))) for v in (r, g, b)))

def chan_lum(v):
    s = v / 255
    return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4

def rel_lum(hx):
    r, g, b = hex2rgb(hx)
    return 0.2126 * chan_lum(r) + 0.7152 * chan_lum(g) + 0.0722 * chan_lum(b)

def contrast(a, b):
    la, lb = rel_lum(a), rel_lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

def mix_hex(a, b, k):
    ar, ag, ab = hex2rgb(a); br, bg_, bb = hex2rgb(b)
    return rgb2hex(ar + (br - ar) * k, ag + (bg_ - ag) * k, ab + (bb - ab) * k)

def with_alpha(hx, a):
    r, g, b = hex2rgb(hx)
    return 'rgba(%d,%d,%d,%s)' % (r, g, b, a)

def contrast_text(hx):
    r, g, b = hex2rgb(hx)
    luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return '#141414' if luma > 0.6 else '#F4F4F5'

def blend_onto_base(fg, base):
    """对应 audit-themes.ts 的 flatten：支持 8 位 hex 与 rgba() 字符串。"""
    t = str(fg or '').strip()
    if re.match(r'^#[0-9A-Fa-f]{8}$', t):
        alpha = int(t[7:9], 16) / 255
        fr, fg_, fb = hex2rgb(t[:7]); br, bg_, bb = hex2rgb(base)
        return rgb2hex(fr * alpha + br * (1 - alpha), fg_ * alpha + bg_ * (1 - alpha), fb * alpha + bb * (1 - alpha))
    m = re.match(r'^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$', t, re.I)
    if m:
        r, g, b = float(m.group(1)), float(m.group(2)), float(m.group(3))
        a = 1.0 if m.group(4) is None else float(m.group(4))
        if a >= 1:
            return rgb2hex(r, g, b)
        br, bg_, bb = hex2rgb(base)
        return rgb2hex(r * a + br * (1 - a), g * a + bg_ * (1 - a), b * a + bb * (1 - a))
    return t.upper()

# ── normalizeThemeColors ──
def normalize(c):
    c = dict(c)
    c.setdefault('sidebarBg', c['background'])
    for k in ('bubbleBg', 'inputBg', 'codeBlockBg'):
        c.setdefault(k, c['backgroundPanel'])
    c.setdefault('codeHeaderBg', c['backgroundElement'])
    return c

# ── ensureDiffContrast (isDark=False, 与 resolve.ts 同逻辑) ──
def ensure_diff_contrast(src, is_dark=False, threshold=4.5):
    src = dict(src)
    base = src.get('background')
    if not isinstance(base, str) or base in ('transparent', 'none'):
        return src
    alpha = 0.22 if is_dark else 0.14
    bg_target = '#000000' if is_dark else '#FFFFFF'
    fg_target = '#FFFFFF' if is_dark else '#000000'
    out = dict(src)
    for fg_key, bg_keys in (('diffAdded', ['diffAddedBg', 'diffAddedLineNumberBg']),
                            ('diffRemoved', ['diffRemovedBg', 'diffRemovedLineNumberBg'])):
        fg0 = src.get(fg_key)
        if not isinstance(fg0, str):
            continue
        need_fix = False
        for bk in bg_keys:
            bv = src.get(bk)
            if not isinstance(bv, str):
                continue
            eff = blend_onto_base(bv, base)
            if contrast(fg0, eff) < threshold:
                need_fix = True
        if not need_fix:
            continue
        fixed = None
        for j in (0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6):
            fgC = fg0 if j == 0 else mix_hex(fg0, fg_target, j)
            tintedC = mix_hex(base, fgC, alpha)
            cands = []
            ok = True
            for bk in bg_keys:
                bv = src.get(bk)
                if not isinstance(bv, str):
                    cands.append(None); continue
                found = None
                for k in (0, 0.2, 0.4, 0.6, 0.8, 1.0):
                    cand = mix_hex(tintedC, bg_target, k)
                    if contrast(fgC, cand) >= threshold:
                        found = cand; break
                if found is None:
                    ok = False; break
                cands.append(found)
            if ok:
                fixed = (fgC, cands, j); break
        if not fixed:
            continue
        fgC, cands, j = fixed
        if j > 0:
            out[fg_key] = fgC
        for bk, c in zip(bg_keys, cands):
            if c is not None:
                out[bk] = c
    ab, db = out.get('diffAddedBg'), out.get('diffRemovedBg')
    if isinstance(ab, str) and isinstance(db, str) and ab.upper() == db.upper():
        delFg = out.get('diffRemoved')
        if isinstance(delFg, str):
            tinted = mix_hex(base, delFg, alpha)
            for k in (0.4, 0.6, 0.8, 1.0):
                cand = mix_hex(tinted, bg_target, k)
                if cand.upper() == ab.upper():
                    continue
                if contrast(delFg, cand) >= threshold:
                    out['diffRemovedBg'] = cand; break
    ag, dg = out.get('diffAddedLineNumberBg'), out.get('diffRemovedLineNumberBg')
    if isinstance(ag, str) and isinstance(dg, str) and ag.upper() == dg.upper():
        delFg = out.get('diffRemoved')
        if isinstance(delFg, str):
            tinted = mix_hex(base, delFg, alpha)
            for k in (0.4, 0.6, 0.8, 1.0):
                cand = mix_hex(tinted, bg_target, k)
                if cand.upper() == ag.upper():
                    continue
                if contrast(delFg, cand) >= threshold:
                    out['diffRemovedLineNumberBg'] = cand; break
    return out

# ── 表面合成 ──
def build_surfaces(pal, canvas):
    h = {}
    def flat(v, base):
        if v is None or v == 'transparent':
            return None
        return blend_onto_base(v, base)
    h['background'] = flat(pal.get('background'), canvas) or canvas
    h['backgroundPanel'] = flat(pal.get('backgroundPanel'), h['background']) or h['background']
    h['backgroundElement'] = flat(pal.get('backgroundElement'), h['background']) or h['background']
    for k in ('sidebarBg', 'bubbleBg', 'inputBg'):
        h[k] = flat(pal.get(k), h['background']) or h['background']
    h['codeBlockBg'] = flat(pal.get('codeBlockBg'), h['background']) or h['background']
    h['codeHeaderBg'] = flat(pal.get('codeHeaderBg'), h['codeBlockBg']) or h['codeBlockBg']
    return h

SURFACES = ['background', 'backgroundPanel', 'backgroundElement', 'sidebarBg', 'bubbleBg', 'inputBg', 'codeBlockBg', 'codeHeaderBg']
MUTED_SURFACES = ['background', 'backgroundPanel', 'backgroundElement']
MD_ROLES = ['markdownHeading', 'markdownLink', 'markdownStrong', 'markdownEmph', 'markdownBlockQuote', 'markdownCode']
SYNTAX_ROLES = ['syntaxComment', 'syntaxKeyword', 'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString', 'syntaxOperator']
SYNTAX_CORE = ['syntaxKeyword', 'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString']
BRAND_ROLES = ['primary', 'secondary', 'info', 'success', 'warning', 'error']
DESIGN_GROUPS = {
    'text': ['text', 'textMuted'], 'brand': ['primary', 'secondary', 'info', 'success', 'warning', 'error'],
    'border': ['border', 'borderActive'], 'diff': ['diffAdded', 'diffRemoved'],
    'md': MD_ROLES, 'syn': SYNTAX_ROLES,
}
DESIGN_ROLES = [k for g in DESIGN_GROUPS.values() for k in g]

def to_hsl(hx):
    r, g, b = [v / 255 for v in hex2rgb(hx)]
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    d = mx - mn
    h = 0
    if d:
        if mx == r: h = ((g - b) / d) % 6
        elif mx == g: h = (b - r) / d + 2
        else: h = (r - g) / d + 4
        h *= 60
    s = 0 if d == 0 else d / (1 - abs(2 * l - 1))
    return h, s, l

def chroma(hx):
    r, g, b = hex2rgb(hx)
    return max(r, g, b) - min(r, g, b)

def to_lab(hx):
    def lin(v):
        s = v / 255
        return s / 12.92 if s <= 0.04045 else ((s + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(v) for v in hex2rgb(hx))
    x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
    y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
    z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(x), f(y), f(z)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)

def delta_e(a, b):
    la, lb = to_lab(a), to_lab(b)
    return math.sqrt(sum((p - q) ** 2 for p, q in zip(la, lb)))

def hue_distance(a, b):
    d = abs(a - b) % 360
    return d if d <= 180 else 360 - d

def evaluate(seed, appearance='light', canvas='#FFFFFF'):
    """返回 (hard_violations, ui_violations, design_warnings)"""
    pal = ensure_diff_contrast(normalize(seed), is_dark=(appearance != 'light'))
    surf = build_surfaces(pal, canvas)
    hard, ui = [], []

    def flat_on(v, base):
        return blend_onto_base(v, base)

    # text @ 8 surfaces
    for s in SURFACES:
        r = contrast(seed['text'], surf[s])
        if r < 4.5: hard.append(('text@' + s, round(r, 3), surf[s]))
    # textMuted + labelDimmed @ 3 main surfaces
    for s in MUTED_SURFACES:
        r = contrast(seed['textMuted'], surf[s])
        if r < 4.5: hard.append(('textMuted@' + s, round(r, 3), surf[s]))
        dim = flat_on(with_alpha(seed['textMuted'], 0.8), surf[s])
        r = contrast(dim, surf[s])
        if r < 4.5: hard.append(('labelDimmed@' + s, round(r, 3), surf[s]))
    # markdown @ background, backgroundPanel
    for role in MD_ROLES:
        for s in ('background', 'backgroundPanel'):
            r = contrast(seed[role], surf[s])
            if r < 4.5: hard.append((role + '@' + s, round(r, 3), surf[s]))
    # syntax @ codeBlockBg
    for role in SYNTAX_ROLES:
        r = contrast(seed[role], surf['codeBlockBg'])
        if r < 4.5: hard.append((role + '@codeBlockBg', round(r, 3), surf['codeBlockBg']))
    # diff（用修复后有效值）
    for fg, bg in (('diffAdded', 'diffAddedBg'), ('diffRemoved', 'diffRemovedBg')):
        eff_bg = blend_onto_base(pal[bg], pal['background'])
        r = contrast(pal[fg], eff_bg)
        if r < 4.5: hard.append((fg + '@' + bg, round(r, 3), eff_bg))
        r = contrast(pal['text'], eff_bg)
        if r < 4.5: hard.append(('text@' + bg, round(r, 3), eff_bg))
    # onPrimary
    eff_primary = blend_onto_base(pal['primary'], surf['background'])
    r = contrast(contrast_text(pal['primary']), eff_primary)
    if r < 4.5: hard.append(('contrastText(primary)@primary', round(r, 3), eff_primary))
    # UI
    for s in ('background', 'backgroundPanel', 'backgroundElement'):
        r = contrast(seed['borderActive'], surf[s])
        if r < 3.0: ui.append(('borderActive@' + s, round(r, 3), surf[s]))
    for role in BRAND_ROLES:
        for s in ('background', 'backgroundPanel'):
            r = contrast(seed[role], surf[s])
            if r < 3.0: ui.append((role + '@' + s, round(r, 3), surf[s]))

    # ── 设计规范 ──
    warn = []
    seen = {}
    for role in DESIGN_ROLES:
        seen.setdefault(seed[role].lower(), []).append(role)
    for k in sorted(seen):
        roles = seen[k]
        if len(roles) < 2: continue
        groups = set()
        for r in roles:
            for g, ks in DESIGN_GROUPS.items():
                if r in ks: groups.add(g)
        warn.append(('roleCollision', '跨组' if len(groups) > 1 else '同组', roles, k))
    md_seen = {}
    for role in MD_ROLES:
        md_seen.setdefault(seed[role].lower(), []).append(role)
    for k, roles in sorted(md_seen.items()):
        if len(roles) > 1:
            warn.append(('markdownDuplicate', '', roles, k))
    # brand geometry
    ph, _, _ = to_hsl(seed['primary']); sh, _, _ = to_hsl(seed['secondary'])
    hd = round(hue_distance(ph, sh), 1)
    cat = 'analogous' if hd <= 45 else ('triadic' if 95 <= hd <= 145 else ('complementary' if hd > 145 else 'unclassified'))
    if cat == 'unclassified':
        warn.append(('brandGeometry', '', [], 'hue diff %.1f' % hd))
    # syntax core ΔE
    pairs = []
    for i in range(len(SYNTAX_CORE)):
        for j in range(i + 1, len(SYNTAX_CORE)):
            pairs.append((SYNTAX_CORE[i], SYNTAX_CORE[j], delta_e(seed[SYNTAX_CORE[i]], seed[SYNTAX_CORE[j]])))
    if pairs:
        mn = min(pairs, key=lambda p: p[2])
        if mn[2] < 10:
            warn.append(('syntaxCoreMin', '', [mn[0], mn[1]], 'ΔE=%.1f' % mn[2]))
    # comment/operator 退后
    cbg = surf['codeBlockBg']
    def c_on(hexv):
        return contrast(blend_onto_base(hexv, cbg), cbg)
    core_c = {r: c_on(seed[r]) for r in SYNTAX_CORE}
    for role in ('syntaxComment', 'syntaxOperator'):
        c = c_on(seed[role])
        out = sum(1 for r in SYNTAX_CORE if core_c[r] < c)
        if out > 0:
            warn.append(('syntaxRecede', '', [role], 'outranks %d' % out))
    # hue islands
    chromatic = [(role, to_hsl(surf[role])[0]) for role in SURFACES if chroma(surf[role]) >= 8]
    base_hue = to_hsl(surf['background'])[0] if chroma(surf['background']) >= 8 else (chromatic[0][1] if chromatic else 0)
    islands = [(role, round(h, 1), round(hue_distance(h, base_hue), 1)) for role, h in chromatic if hue_distance(h, base_hue) > 60]
    if islands:
        warn.append(('bgPurity', '', [], str(islands)))
    return hard, ui, warn, pal, surf

def report(seed, label=''):
    hard, ui, warn, pal, surf = evaluate(seed)
    print('=' * 84)
    print('评估：%s   硬性违例 %d · UI 违例 %d · 设计告警 %d' % (label, len(hard), len(ui), len(warn)))
    for c, r, bg in hard:
        print('  [硬性] %-34s %.2f  (底 %s)' % (c, r, bg))
    for c, r, bg in ui:
        print('  [UI]   %-34s %.2f  (底 %s)' % (c, r, bg))
    for code, kind, roles, detail in warn:
        print('  [%s] %s %s %s' % (code, kind, ' = '.join(roles) if roles else '', detail))
    repaired = {k: v for k, v in pal.items() if seed.get(k) != v}
    if repaired:
        print('  ⚠ 引擎 diff 修复改动了这些槽位：')
        for k, v in sorted(repaired.items()):
            print('      %-26s %s -> %s' % (k, seed.get(k), v))
    return len(hard), len(ui), len(warn)

if __name__ == '__main__':
    seed = json.load(open(sys.argv[1], encoding='utf-8'))['colors'] if len(sys.argv) > 1 else None
    if seed:
        report(seed, sys.argv[1])
