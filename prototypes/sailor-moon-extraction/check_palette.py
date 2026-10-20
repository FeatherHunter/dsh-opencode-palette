#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""check_palette.py — dsh-opencode-palette 37-token 调色板判尺检查器（独立、确定性）。

判尺权威：docs/theme-audit/criteria.md（§1 口径 / §2 硬性判据 / §3 信息项 / §4 IP 设计规范）
机器对位：scripts/audit-themes.ts + src/engine/resolve.ts + src/engine/map-dsh.ts
           （逐位复刻 resolveThemeColors / normalizeThemeColors / ensureDiffContrast /
             表面合成 / contrastText / labelDimmed / ΔE76 / HSL 色相 / 设计告警分类器）

用法：
  python check_palette.py <palette.json> [--json-out report.json] [--appearance light|dark]
                 [--theme-name NAME] [--exceptions PATH] [--no-design]

输入形态（自动识别）：
  1. 预置自定义主题：{"appearance": "light", "colors": { 37 个 token }}
  2. 裸色板：        {"colors": { 37 个 token }}
  3. 扁平表：        { "background": "#...", ... }（token -> hex）
  4. opencode 主题： {"defs": {...}, "theme": {...}}（引用链由 resolveThemeColors 解析）

退出码：
  1 = 存在硬性违例（正文/内容 4.5:1 或 UI/交互 3:1 任一不达标）
  0 = 无硬性违例（设计告警与信息项不改变退出码）

只读、离线、确定性：无时间戳、无随机数、无网络。
"""

from __future__ import annotations

import argparse
import io
import json
import math
import os
import re
import sys
import unicodedata

# ═══════════════════════════════════════════════════════════════════════════
# 0. 判尺常量（criteria.md §2；scripts/audit-themes.ts 同值）
# ═══════════════════════════════════════════════════════════════════════════

TEXT_THRESHOLD = 4.5
UI_THRESHOLD = 3.0
INFO_THRESHOLD = 3.0
SYNTAX_HEADER_THRESHOLD = 4.5

HOST_CANVAS = {'light': '#FFFFFF', 'dark': '#000000'}

# 8 个背景槽（评估顺序固定，与 audit-themes.ts 的 SURFACES 一致）
SURFACES = (
    'background', 'backgroundPanel', 'backgroundElement', 'sidebarBg',
    'bubbleBg', 'inputBg', 'codeBlockBg', 'codeHeaderBg',
)
MUTED_SURFACES = ('background', 'backgroundPanel', 'backgroundElement')
MD_SURFACES = ('background', 'backgroundPanel')
MARKDOWN_ROLES = (
    'markdownHeading', 'markdownLink', 'markdownStrong',
    'markdownEmph', 'markdownBlockQuote', 'markdownCode',
)
SYNTAX_ROLES = (
    'syntaxComment', 'syntaxKeyword', 'syntaxFunction', 'syntaxType',
    'syntaxNumber', 'syntaxString', 'syntaxOperator',
)
SYNTAX_CORE = ('syntaxKeyword', 'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString')
BRAND_ROLES = ('primary', 'secondary', 'info', 'success', 'warning', 'error')
BORDER_ACTIVE_SURFACES = ('background', 'backgroundPanel', 'backgroundElement')
BRAND_SURFACES = ('background', 'backgroundPanel')

# 37 token 分组（criteria.md §1；顺序与 map-dsh.ts 的 COLOR_SLOTS 一致）
COLOR_SLOTS = (
    ('background', 'bg'), ('backgroundPanel', 'bg'), ('backgroundElement', 'bg'),
    ('sidebarBg', 'bg'), ('bubbleBg', 'bg'), ('inputBg', 'bg'),
    ('codeBlockBg', 'bg'), ('codeHeaderBg', 'bg'),
    ('text', 'text'), ('textMuted', 'text'),
    ('primary', 'brand'), ('secondary', 'brand'), ('info', 'brand'),
    ('success', 'brand'), ('warning', 'brand'), ('error', 'brand'),
    ('border', 'border'), ('borderActive', 'border'),
    ('diffAdded', 'diff'), ('diffRemoved', 'diff'),
    ('diffAddedBg', 'diff'), ('diffRemovedBg', 'diff'),
    ('diffAddedLineNumberBg', 'diff'), ('diffRemovedLineNumberBg', 'diff'),
    ('markdownHeading', 'md'), ('markdownLink', 'md'), ('markdownCode', 'md'),
    ('markdownEmph', 'md'), ('markdownStrong', 'md'), ('markdownBlockQuote', 'md'),
    ('syntaxComment', 'syn'), ('syntaxKeyword', 'syn'), ('syntaxFunction', 'syn'),
    ('syntaxType', 'syn'), ('syntaxNumber', 'syn'), ('syntaxString', 'syn'),
    ('syntaxOperator', 'syn'),
)
DESIGN_GROUP = dict(COLOR_SLOTS)
TOKEN_KEYS = tuple(k for k, _ in COLOR_SLOTS)
DIFF_BG_KEYS = ('diffAddedBg', 'diffRemovedBg', 'diffAddedLineNumberBg', 'diffRemovedLineNumberBg')
# 25 个设计角色：除 8 个背景槽与 4 个 diff 背景槽外的全部角色
DESIGN_ROLES = tuple(k for k, g in COLOR_SLOTS if g != 'bg' and k not in DIFF_BG_KEYS)

# 设计告警的画布：与 scripts/audit-themes.ts 的 buildDesignRecord 一致（恒为黑底）。
# 与 criteria.md §1「background 合成到宿主画布」在浅色主题 + 半透明 background 时会有差异；
# 对不透明 background（IP 预置与本工具的典型输入）两者等价。
DESIGN_CANVAS = '#000000'


# ═══════════════════════════════════════════════════════════════════════════
# 1. 与 JS 逐位对齐的原子操作
# ═══════════════════════════════════════════════════════════════════════════

def js_round(x: float) -> int:
    """JS Math.round：ties 向 +∞（不是 Python 的银行家舍入）。"""
    if x != x or x in (float('inf'), float('-inf')):  # NaN / inf
        return 0
    f = math.floor(x)
    return f + 1 if (x - f) >= 0.5 else f


def js_mod(a: float, b: float) -> float:
    """JS %：向零截断（fmod），与 Python % 的正模语义不同。"""
    return math.fmod(a, b)


def clamp255(v: float) -> int:
    v = js_round(v)
    return 0 if v < 0 else (255 if v > 255 else v)


def rgb_to_hex(r: float, g: float, b: float) -> str:
    """resolve.ts rgbToHex：round + clamp + 大写。"""
    return '#%02X%02X%02X' % (clamp255(r), clamp255(g), clamp255(b))


def _parse_int_hex(text: str) -> int:
    """JS parseInt(text, 16)：取最长的合法十六进制前缀；非法则 NaN（按 0 处理）。"""
    s = text.strip()
    sign = 1
    if s[:1] in ('+', '-'):
        if s[0] == '-':
            sign = -1
        s = s[1:]
    if s[:2].lower() == '0x':
        s = s[2:]
    acc = 0
    for ch in s:
        if ch in '0123456789abcdefABCDEF':
            acc = acc * 16 + int(ch, 16)
        else:
            break
    return sign * acc


def hex_to_rgb(value):
    """resolve.ts hexToRgb：接受 3/4/6/8 位十六进制，返回 (r, g, b, a)。"""
    t = str(value or '').strip()
    if t[:1] == '#':
        t = t[1:]
    if len(t) in (3, 4):
        t = ''.join(ch * 2 for ch in t)
    n = _parse_int_hex(t) & 0xFFFFFFFF
    if len(t) == 8:
        return ((n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255)
    return ((n >> 16) & 255, (n >> 8) & 255, n & 255, 255)


_RGBA_RE = re.compile(
    r'^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$',
    re.IGNORECASE)


def parse_color(value):
    """audit-themes.ts parseColor：返回 (r, g, b, a)；不可解析返回 None。"""
    if not isinstance(value, str):
        return None
    t = value.strip()
    if t in ('', 'transparent', 'none'):
        return None
    if t[0] == '#':
        h = t[1:]
        if len(h) in (3, 4):
            h = ''.join(ch * 2 for ch in h)
        if len(h) not in (6, 8):
            return None
        n = _parse_int_hex(h)
        if len(h) == 8:
            return ((n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, (n & 255) / 255.0)
        return ((n >> 16) & 255, (n >> 8) & 255, n & 255, 1.0)
    m = _RGBA_RE.match(t)
    if not m:
        return None
    r, g, b = float(m.group(1)), float(m.group(2)), float(m.group(3))
    a = 1.0 if m.group(4) is None else float(m.group(4))
    a = max(0.0, min(1.0, a))
    return (r, g, b, a)


def flatten(value, base_hex):
    """audit-themes.ts flatten：把带 alpha 的颜色合成到底色，返回不透明 hex（失败 None）。"""
    c = parse_color(value)
    if c is None:
        return None
    if c[3] >= 1:
        return rgb_to_hex(c[0], c[1], c[2])
    b = parse_color(base_hex)
    if b is None:
        return None
    inv = 1.0 - c[3]
    return rgb_to_hex(c[0] * c[3] + b[0] * inv, c[1] * c[3] + b[1] * inv, c[2] * c[3] + b[2] * inv)


def channel_luminance(v: float) -> float:
    """resolve.ts channelLuminance（阈值 0.03928，注意与 Lab 的 0.04045 不同）。"""
    s = v / 255.0
    return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4


def relative_luminance(value: float) -> float:
    r, g, b, _ = hex_to_rgb(value)
    return 0.2126 * channel_luminance(r) + 0.7152 * channel_luminance(g) + 0.0722 * channel_luminance(b)


def contrast_ratio(a, b) -> float:
    """WCAG 2.x 相对亮度比（resolve.ts contrastRatio）。"""
    l1 = relative_luminance(a)
    l2 = relative_luminance(b)
    hi, lo = (l1, l2) if l1 >= l2 else (l2, l1)
    return (hi + 0.05) / (lo + 0.05)


def with_alpha(value, alpha: float) -> str:
    """resolve.ts withAlpha：输出 rgba() 字符串（保持与引擎同源的字符串形态）。"""
    r, g, b, _ = hex_to_rgb(value)
    return 'rgba(%d,%d,%d,%s)' % (r, g, b, _js_num(alpha))


def _js_num(x: float) -> str:
    """JS Number -> String（用于 rgba() 文本化）。"""
    if isinstance(x, int):
        return str(x)
    if x == int(x) and abs(x) < 1e21:
        return str(int(x))
    return repr(float(x))


def contrast_text(value) -> str:
    """resolve.ts contrastText：luma > 0.6 -> #141414，否则 #F4F4F5。"""
    r, g, b, _ = hex_to_rgb(value)
    luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
    return '#141414' if luma > 0.6 else '#F4F4F5'


def mix_hex(a, b, k: float) -> str:
    """resolve.ts mixHex：a 向 b 线性插值 k。"""
    A, B = hex_to_rgb(a), hex_to_rgb(b)
    return rgb_to_hex(A[0] + (B[0] - A[0]) * k,
                      A[1] + (B[1] - A[1]) * k,
                      A[2] + (B[2] - A[2]) * k)


def blend_onto_base(fg_hex, base_hex) -> str:
    """resolve.ts blendOntoBase：仅 8 位 hex 参与合成，否则原样大写。"""
    t = str(fg_hex or '').strip()
    if re.match(r'^#[0-9a-fA-F]{8}$', t):
        alpha = int(t[7:9], 16) / 255.0
        F, B = hex_to_rgb('#' + t[1:7]), hex_to_rgb(base_hex)
        inv = 1.0 - alpha
        return rgb_to_hex(F[0] * alpha + B[0] * inv, F[1] * alpha + B[1] * inv, F[2] * alpha + B[2] * inv)
    return str(fg_hex).upper()


def readable_text_on(bg_hex) -> str:
    """resolve.ts readableTextOn：黑/白中对比度更高者。"""
    try:
        return '#000000' if contrast_ratio('#000000', bg_hex) >= contrast_ratio('#FFFFFF', bg_hex) else '#FFFFFF'
    except Exception:
        return '#FFFFFF'


def round3(n: float) -> float:
    """audit-themes.ts round3（报告用；判定用未舍入值）。"""
    return js_round(n * 1000) / 1000.0


# ── CIELAB / ΔE76（audit-themes.ts toLab / deltaE76，D65） ────────────────

def srgb_channel(v: float) -> float:
    s = v / 255.0
    return s / 12.92 if s <= 0.04045 else ((s + 0.055) / 1.055) ** 2.4


def to_lab(value):
    c = parse_color(value)
    if c is None:
        return None
    r, g, b = srgb_channel(c[0]), srgb_channel(c[1]), srgb_channel(c[2])
    x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
    y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
    z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883

    def f(t: float) -> float:
        return (t ** (1.0 / 3.0)) if t > 0.008856 else 7.787 * t + 16.0 / 116.0

    fx, fy, fz = f(x), f(y), f(z)
    return (116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz))


def delta_e76(hex_a, hex_b) -> float:
    a, b = to_lab(hex_a), to_lab(hex_b)
    if a is None or b is None:
        return 0.0
    dL, da, db = a[0] - b[0], a[1] - b[1], a[2] - b[2]
    return math.sqrt(dL * dL + da * da + db * db)


# ── HSL 色相 / 彩度（audit-themes.ts toHsl / hueDistance / chromaOf） ────

def to_hsl(value):
    c = parse_color(value)
    if c is None:
        return None
    r, g, b = c[0] / 255.0, c[1] / 255.0, c[2] / 255.0
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2.0
    d = mx - mn
    h = 0.0
    if d != 0:
        if mx == r:
            h = js_mod((g - b) / d, 6.0)
        elif mx == g:
            h = (b - r) / d + 2.0
        else:
            h = (r - g) / d + 4.0
        h *= 60.0
        if h < 0:
            h += 360.0
    s = 0.0 if d == 0 else d / (1.0 - abs(2.0 * l - 1.0))
    return (h, s, l)


def hue_distance(a: float, b: float) -> float:
    d = abs(a - b) % 360.0
    return 360.0 - d if d > 180.0 else d


def chroma_of(value) -> float:
    c = parse_color(value)
    if c is None:
        return 0.0
    return max(c[0], c[1], c[2]) - min(c[0], c[1], c[2])


# ═══════════════════════════════════════════════════════════════════════════
# 2. 引擎口径层（resolve.ts / map-dsh.ts 逐位复刻）
# ═══════════════════════════════════════════════════════════════════════════

class ResolveError(Exception):
    pass


_ANSI_16 = (
    '#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#C0C0C0',
    '#808080', '#FF0000', '#00FF00', '#FFFF00', '#0000FF', '#FF00FF', '#00FFFF', '#FFFFFF',
)


def ansi_to_hex(code: int) -> str:
    """resolve.ts ansiToHex。"""
    if not isinstance(code, int) or code < 0 or code > 255:
        return '#FF00FF'
    if code < 16:
        return _ANSI_16[code]
    if code < 232:
        index = code - 16
        b = index % 6
        g = index // 6
        r = index // 36
        val = (lambda x: 0 if x == 0 else x * 40 + 55)
        return rgb_to_hex(val(r), val(g), val(b))
    gray = (code - 232) * 10 + 8
    return rgb_to_hex(gray, gray, gray)


_HEX_RE = re.compile(r'^#([0-9a-fA-F]{3,8})$')


def resolve_color(ref, defs, theme, mode, chain=None):
    """resolve.ts resolveColor。"""
    seen = list(chain or [])
    if isinstance(ref, bool):
        raise ResolveError('非法颜色值: ' + str(ref))
    if isinstance(ref, (int, float)):
        return ansi_to_hex(int(ref))
    if isinstance(ref, str):
        t = ref.strip()
        if t in ('none', 'transparent'):
            return 'transparent'
        if _HEX_RE.match(t):
            return t.upper()
        if t in seen:
            raise ResolveError('循环颜色引用: ' + ' -> '.join(seen + [t]))
        if t in defs:
            nxt = defs[t]
        elif t in theme:
            nxt = theme[t]
        else:
            raise ResolveError('未知颜色引用 "%s"（不在 defs 与 theme 中）' % t)
        return resolve_color(nxt, defs, theme, mode, seen + [t])
    if isinstance(ref, dict):
        if mode in ref:
            v = ref[mode]
        elif 'dark' in ref:
            v = ref['dark']
        elif 'light' in ref:
            v = ref['light']
        else:
            raise ResolveError('颜色变体缺少 dark/light: ' + json.dumps(ref, ensure_ascii=False))
        return resolve_color(v, defs, theme, mode, seen)
    raise ResolveError('非法颜色值: ' + str(ref))


def resolve_theme_colors(json_obj, mode='dark'):
    """resolve.ts resolveThemeColors：解析引用链得到原始槽位。"""
    src = json_obj if isinstance(json_obj, dict) else {}
    defs = src.get('defs') or {}
    theme = src.get('theme') or {}
    out = {}
    for key in theme:
        if key == 'thinkingOpacity':
            continue
        try:
            out[key] = resolve_color(theme[key], defs, theme, mode, [])
        except ResolveError as exc:
            out[key] = {'__error': str(exc)}
    if out.get('selectedListItemText') is None:
        out['selectedListItemText'] = out.get('background')
    if out.get('backgroundMenu') is None:
        out['backgroundMenu'] = out.get('backgroundElement')
    return out


def normalize_theme_colors(colors):
    """map-dsh.ts normalizeThemeColors：补齐 5 个扩展槽（不改入参）。"""
    c = dict(colors or {})
    if c.get('sidebarBg') is None:
        c['sidebarBg'] = c.get('background')
    if c.get('bubbleBg') is None:
        c['bubbleBg'] = c.get('backgroundPanel')
    if c.get('inputBg') is None:
        c['inputBg'] = c.get('backgroundPanel')
    if c.get('codeBlockBg') is None:
        c['codeBlockBg'] = c.get('backgroundPanel')
    if c.get('codeHeaderBg') is None:
        c['codeHeaderBg'] = c.get('backgroundElement')
    return {k: v for k, v in c.items() if v is not None}


def _is_skipped(v) -> bool:
    """resolve.ts isSkipped。"""
    if v is None:
        return True
    if isinstance(v, str):
        return v == 'transparent'
    if isinstance(v, dict):
        return bool(v.get('__error'))
    return False


DIFF_CONTRAST_THRESHOLD = 4.5
DIFF_TINT_DARK = 0.22
DIFF_TINT_LIGHT = 0.14


def ensure_diff_contrast(colors, is_dark=True, threshold=DIFF_CONTRAST_THRESHOLD):
    """resolve.ts ensureDiffContrast：diff 前景/背景可读性兜底（issue #73/#80）。"""
    src = dict(colors or {})
    base = src.get('background')
    if _is_skipped(base):
        return dict(src)
    alpha = DIFF_TINT_DARK if is_dark else DIFF_TINT_LIGHT
    bg_target = '#000000' if is_dark else '#FFFFFF'
    fg_target = '#FFFFFF' if is_dark else '#000000'
    out = dict(src)
    groups = (
        ('diffAdded', ('diffAddedBg', 'diffAddedLineNumberBg')),
        ('diffRemoved', ('diffRemovedBg', 'diffRemovedLineNumberBg')),
    )
    for fg, bgs in groups:
        fg0 = src.get(fg)
        if _is_skipped(fg0) or not isinstance(fg0, str):
            continue
        need_fix = False
        for bk in bgs:
            bv = src.get(bk)
            if _is_skipped(bv) or not isinstance(bv, str):
                continue
            eff = blend_onto_base(bv, base)
            if contrast_ratio(fg0, eff) < threshold:
                need_fix = True
        if not need_fix:
            continue
        fixed = None
        for j in (0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6):
            fg_c = fg0 if j == 0 else mix_hex(fg0, fg_target, j)
            tinted_c = mix_hex(base, fg_c, alpha)
            bg_cands = []
            ok = True
            for bk in bgs:
                bv = src.get(bk)
                if _is_skipped(bv) or not isinstance(bv, str):
                    bg_cands.append(None)
                    continue
                found = None
                for k in (0, 0.2, 0.4, 0.6, 0.8, 1.0):
                    cand = mix_hex(tinted_c, bg_target, k)
                    if contrast_ratio(fg_c, cand) >= threshold:
                        found = cand
                        break
                if found is None:
                    ok = False
                    break
                bg_cands.append(found)
            if ok:
                fixed = (fg_c, bg_cands, j)
                break
        if fixed is None:
            continue
        fg_c, bg_cands, j = fixed
        if j > 0:
            out[fg] = fg_c
        for bk, cand in zip(bgs, bg_cands):
            if cand is not None:
                out[bk] = cand
    # 增删背景不可同值透出
    for fg_side, bg_side in (('diffAddedBg', 'diffRemovedBg'),
                             ('diffAddedLineNumberBg', 'diffRemovedLineNumberBg')):
        ab, db = out.get(fg_side), out.get(bg_side)
        if not (isinstance(ab, str) and isinstance(db, str)) or ab.upper() != db.upper():
            continue
        del_fg = out.get('diffRemoved')
        if not isinstance(del_fg, str) or _is_skipped(del_fg):
            continue
        tinted = mix_hex(base, del_fg, alpha)
        for k in (0.4, 0.6, 0.8, 1.0):
            cand = mix_hex(tinted, bg_target, k)
            if cand.upper() == ab.upper():
                continue
            if contrast_ratio(del_fg, cand) >= threshold:
                out[bg_side] = cand
                break
    return out


def slot_value(pal, key):
    """audit-themes.ts slotValue：字符串且非 'transparent' 才算有效。"""
    v = pal.get(key)
    if isinstance(v, str) and v != 'transparent':
        return v
    return None


# ═══════════════════════════════════════════════════════════════════════════
# 3. 表面合成（criteria.md §1；audit-themes.ts buildSurfaces）
# ═══════════════════════════════════════════════════════════════════════════

def build_surfaces(pal, canvas):
    """返回 (hexes, unresolved)：8 个背景槽按真实叠放顺序做 alpha 合成。"""
    hexes = {}
    unresolved = []
    base = flatten(slot_value(pal, 'background'), canvas) or canvas
    hexes['background'] = base
    for key in ('backgroundPanel', 'backgroundElement'):
        v = flatten(slot_value(pal, key), base)
        if v is None:
            unresolved.append(key)
            hexes[key] = base
        else:
            hexes[key] = v
    for key in ('sidebarBg', 'bubbleBg', 'inputBg'):
        v = flatten(slot_value(pal, key), base)
        if v is None:
            unresolved.append(key)
            hexes[key] = base
        else:
            hexes[key] = v
    v = flatten(slot_value(pal, 'codeBlockBg'), base)
    if v is None:
        unresolved.append('codeBlockBg')
        hexes['codeBlockBg'] = base
    else:
        hexes['codeBlockBg'] = v
    v = flatten(slot_value(pal, 'codeHeaderBg'), hexes['codeBlockBg'])
    if v is None:
        unresolved.append('codeHeaderBg')
        hexes['codeHeaderBg'] = hexes['codeBlockBg']
    else:
        hexes['codeHeaderBg'] = v
    return hexes, unresolved


# ═══════════════════════════════════════════════════════════════════════════
# 4. 判尺对（audit-themes.ts PAIR_DEFS，逐条同序）
# ═══════════════════════════════════════════════════════════════════════════

def _def(code, fg_role, bg_role, threshold, cls, group, note):
    return {'code': code, 'fg_role': fg_role, 'bg_role': bg_role,
            'threshold': threshold, 'cls': cls, 'group': group, 'note': note}


def build_pair_defs():
    pairs = []
    # 硬性 4.5:1 —— 正文 text 落在 8 个背景槽上
    for s in SURFACES:
        pairs.append(_def('text@' + s, 'text', s, TEXT_THRESHOLD, 'hard', 'text',
                          '正文 text 落在每个背景槽上'))
    # 硬性 4.5:1 —— 次级文本与 80% dimmed（宿主 label-dimmed ≈ textMuted@0.8）
    for s in MUTED_SURFACES:
        pairs.append(_def('textMuted@' + s, 'textMuted', s, TEXT_THRESHOLD, 'hard', 'muted',
                          '次级文本 textMuted 落在主表面'))
    for s in MUTED_SURFACES:
        pairs.append(_def('labelDimmed@' + s, 'labelDimmed', s, TEXT_THRESHOLD, 'hard', 'dimmed',
                          'label-dimmed = withAlpha(textMuted,0.8) 合成后的实际色'))
    # 硬性 4.5:1 —— markdown 6 角色 x (background, backgroundPanel)
    for r in MARKDOWN_ROLES:
        for s in MD_SURFACES:
            pairs.append(_def(r + '@' + s, r, s, TEXT_THRESHOLD, 'hard', 'markdown',
                              'markdown 角色落在主表面'))
    # 硬性 4.5:1 —— 语法 7 角色落在代码块底
    for r in SYNTAX_ROLES:
        pairs.append(_def(r + '@codeBlockBg', r, 'codeBlockBg', TEXT_THRESHOLD, 'hard', 'syntax',
                          '代码着色角色落在代码块底'))
    # 硬性 4.5:1 —— diff 前景 / 正文落在 diff 底（修复后有效值）
    pairs.append(_def('diffAdded@diffAddedBg', 'diffAdded', 'diffAddedBg', TEXT_THRESHOLD,
                      'hard', 'diff', '新增行前景落在新增行底'))
    pairs.append(_def('diffRemoved@diffRemovedBg', 'diffRemoved', 'diffRemovedBg', TEXT_THRESHOLD,
                      'hard', 'diff', '删除行前景落在删除行底'))
    pairs.append(_def('text@diffAddedBg', 'text', 'diffAddedBg', TEXT_THRESHOLD,
                      'hard', 'diff', '新增行底上的正文'))
    pairs.append(_def('text@diffRemovedBg', 'text', 'diffRemovedBg', TEXT_THRESHOLD,
                      'hard', 'diff', '删除行底上的正文'))
    # 硬性 4.5:1 —— contrastText(primary) 落在 primary 填充上
    pairs.append(_def('contrastText(primary)@primary', 'contrastText(primary)', 'primary',
                      TEXT_THRESHOLD, 'hard', 'onPrimary', '主按钮前景（label-primary-foreground）落在 primary 填充'))
    # 硬性 3:1 —— UI / 交互态
    for s in BORDER_ACTIVE_SURFACES:
        pairs.append(_def('borderActive@' + s, 'borderActive', s, UI_THRESHOLD, 'ui', 'borderActive',
                          '聚焦/选中边框落在主表面'))
    for r in BRAND_ROLES:
        for s in BRAND_SURFACES:
            pairs.append(_def(r + '@' + s, r, s, UI_THRESHOLD, 'ui', 'brand',
                              '品牌/交互色作为 UI 前景落在主表面'))
    # 信息项（无阈值判定，只记录离阈值多近）
    for s in SURFACES:
        pairs.append(_def('border@' + s, 'border', s, INFO_THRESHOLD, 'info', 'border',
                          'DSH 装饰性边框（深色默认 16% 白），信息项'))
    pairs.append(_def('diffAddedBg@background', 'diffAddedBg', 'background', INFO_THRESHOLD,
                      'info', 'diffBg', '新增行弱化底与页面底关系，信息项'))
    pairs.append(_def('diffRemovedBg@background', 'diffRemovedBg', 'background', INFO_THRESHOLD,
                      'info', 'diffBg', '删除行弱化底与页面底关系，信息项'))
    for r in SYNTAX_ROLES:
        pairs.append(_def(r + '@codeHeaderBg', r, 'codeHeaderBg', SYNTAX_HEADER_THRESHOLD,
                          'diagnostic', 'syntaxHeader', '代码头底上的语法色（诊断项，非 map 硬性对）'))
    pairs.append(_def('tooltipText@backgroundElement', 'tooltipText', 'backgroundElement',
                      TEXT_THRESHOLD, 'diagnostic', 'host',
                      '引擎映射的 tooltip 标签色落在浮层底上'))
    return pairs


PAIR_DEFS = build_pair_defs()

GROUP_TITLES = {
    'text': '硬性正文 text @ 8 个背景槽',
    'muted': '硬性次级文本 textMuted @ 3 层主表面',
    'dimmed': '硬性 dimmed labelDimmed(textMuted@0.8) @ 3 层主表面',
    'markdown': '硬性 markdown 6 角色 @ background / backgroundPanel',
    'syntax': '硬性 syntax 7 角色 @ codeBlockBg',
    'diff': '硬性 diff 前景/正文 @ diff 行底',
    'onPrimary': '硬性主按钮前景 contrastText(primary) @ primary',
    'borderActive': 'UI 聚焦/选中边框 borderActive @ 3 层主表面',
    'brand': 'UI 品牌/语义色 @ background / backgroundPanel',
    'border': '信息项 装饰性边框 @ 8 个背景槽（不计分）',
    'diffBg': '信息项 diff 行底 @ background（不计分）',
    'syntaxHeader': '诊断项 语法色 @ codeHeaderBg（不计分）',
    'host': '诊断项 tooltip 标签色 @ backgroundElement（不计分）',
}


# ═══════════════════════════════════════════════════════════════════════════
# 5. 评估（audit-themes.ts evaluatePair / evaluate）
# ═══════════════════════════════════════════════════════════════════════════

def resolve_fg(d, pal, bg):
    """audit-themes.ts resolveFg。"""
    if d['fg_role'] == 'labelDimmed':
        muted = slot_value(pal, 'textMuted')
        if not muted:
            return None
        return flatten(with_alpha(muted, 0.8), bg)
    if d['fg_role'] == 'contrastText(primary)':
        primary = slot_value(pal, 'primary')
        if not primary:
            return None
        return flatten(contrast_text(primary), bg)
    raw = slot_value(pal, d['fg_role'])
    if not raw:
        return None
    return flatten(raw, bg)


def resolve_bg(d, pal, surfaces):
    """audit-themes.ts resolveBg。"""
    if d['bg_role'] == 'primary':
        primary = slot_value(pal, 'primary')
        if not primary:
            return None
        return flatten(primary, surfaces['background'])
    if d['bg_role'] in ('diffAddedBg', 'diffRemovedBg'):
        raw = slot_value(pal, d['bg_role'])
        if not raw:
            return None
        return flatten(raw, surfaces['background'])
    return surfaces.get(d['bg_role'])


def tooltip_pair(pal):
    """复刻 generate.ts tooltipTextColor + audit-themes.ts tooltipPairFromTokens。

    tooltip 底 = backgroundElement（合成到页面底 background），
    文字 = text；与底 ≥4.5 用正文色，否则退 readableTextOn（黑/白）。
    """
    bg_raw = slot_value(pal, 'backgroundElement')
    if not bg_raw:
        return None
    bg_eff = bg_raw
    page = slot_value(pal, 'background')
    if page:
        bg_eff = blend_onto_base(bg_raw, page)
    text = slot_value(pal, 'text')
    if text:
        flat = blend_onto_base(text, bg_eff)
        if contrast_ratio(flat, bg_eff) >= TEXT_THRESHOLD:
            return {'fg': flat, 'bg': bg_eff}
    return {'fg': readable_text_on(bg_eff), 'bg': bg_eff}


def evaluate_pair(d, pal, surfaces):
    if d['fg_role'] == 'tooltipText':
        pair = tooltip_pair(pal)
        if pair is None:
            return {'code': d['code'], 'group': d['group'], 'cls': d['cls'], 'fg': None, 'bg': None,
                    'ratio': None, 'threshold': d['threshold'], 'verdict': 'skip', 'below': False,
                    'note': d['note']}
        ratio = contrast_ratio(pair['fg'], pair['bg'])
        return {'code': d['code'], 'group': d['group'], 'cls': d['cls'], 'fg': pair['fg'],
                'bg': pair['bg'], 'ratio': round3(ratio), 'threshold': d['threshold'],
                'verdict': 'info', 'below': ratio < d['threshold'], 'note': d['note']}
    bg = resolve_bg(d, pal, surfaces)
    fg = None if bg is None else resolve_fg(d, pal, bg)
    if fg is None or bg is None:
        return {'code': d['code'], 'group': d['group'], 'cls': d['cls'], 'fg': fg, 'bg': bg,
                'ratio': None, 'threshold': d['threshold'], 'verdict': 'skip', 'below': False,
                'note': d['note']}
    ratio = contrast_ratio(fg, bg)
    below = ratio < d['threshold']
    verdict = 'info'
    if d['cls'] in ('hard', 'ui'):
        verdict = 'fail' if below else 'pass'
    return {'code': d['code'], 'group': d['group'], 'cls': d['cls'], 'fg': fg, 'bg': bg,
            'ratio': round3(ratio), 'threshold': d['threshold'], 'verdict': verdict,
            'below': below, 'note': d['note']}


def evaluate(pal, canvas):
    """返回评估结果（surface 合成 + 逐对判定 + 计数）。"""
    surfaces, unresolved = build_surfaces(pal, canvas)
    pairs = [evaluate_pair(d, pal, surfaces) for d in PAIR_DEFS]
    counts = {
        'hardFails': 0, 'hardTotal': 0, 'uiFails': 0, 'uiTotal': 0,
        'byGroup': {}, 'skipped': 0,
        'info': {'borderBelow3': 0, 'diffBgBelow3': 0, 'syntaxHeaderBelow45': 0,
                 'tooltipBelow45': False},
    }
    for p in pairs:
        if p['verdict'] == 'skip':
            counts['skipped'] += 1
        if p['cls'] == 'hard':
            counts['hardTotal'] += 1
            if p['verdict'] == 'fail':
                counts['hardFails'] += 1
                counts['byGroup'][p['group']] = counts['byGroup'].get(p['group'], 0) + 1
        if p['cls'] == 'ui':
            counts['uiTotal'] += 1
            if p['verdict'] == 'fail':
                counts['uiFails'] += 1
        if p['cls'] == 'info':
            if p['group'] == 'border' and p['below']:
                counts['info']['borderBelow3'] += 1
            if p['group'] == 'diffBg' and p['below']:
                counts['info']['diffBgBelow3'] += 1
        if p['cls'] == 'diagnostic':
            if p['group'] == 'syntaxHeader' and p['below']:
                counts['info']['syntaxHeaderBelow45'] += 1
            if p['group'] == 'host' and p['below']:
                counts['info']['tooltipBelow45'] = True
    worst = sorted(
        (p for p in pairs if p['cls'] == 'hard' and p['verdict'] == 'fail' and p['ratio'] is not None),
        key=lambda p: (p['ratio'], p['code']))[:5]
    return {
        'canvas': canvas,
        'surfaces': surfaces,
        'unresolvedSurfaces': unresolved,
        'distinctSurfaces': len(set(surfaces.values())),
        'counts': counts,
        'worst': [{'code': p['code'], 'ratio': p['ratio'], 'threshold': p['threshold']} for p in worst],
        'pairs': pairs,
    }


# ═══════════════════════════════════════════════════════════════════════════
# 6. IP 设计规范（criteria.md §4；audit-themes.ts buildDesignRecord）
# ═══════════════════════════════════════════════════════════════════════════

def _collision_key(roles):
    return '|'.join(sorted(roles))


def _match_exception(entry, field, roles):
    if not entry:
        return False
    lst = entry.get(field)
    if not lst:
        return False
    key = _collision_key(roles)
    for pair in lst:
        if _collision_key(pair) == key:
            return True
    return False


def build_design_record(seed_colors, theme_name, exceptions):
    """返回 (design, warnings)。warnings 每项含 code/message/detail/documented。"""
    authored = normalize_theme_colors(seed_colors)
    surfaces, _ = build_surfaces(authored, DESIGN_CANVAS)
    warnings = []
    entry = (exceptions or {}).get('themes', {}).get(theme_name) or {}

    # ① 背景家族纯净：彩度 ≥ 8 的表面按色相聚类，离基色相 > 60 度记孤岛
    chromatic = []
    for role in SURFACES:
        hexv = surfaces[role]
        if chroma_of(hexv) >= 8:
            hsl = to_hsl(hexv)
            if hsl is not None:
                chromatic.append({'role': role, 'hue': hsl[0]})
    bg_hsl = to_hsl(surfaces['background'])
    if bg_hsl is not None and chroma_of(surfaces['background']) >= 8:
        base_hue = bg_hsl[0]
    elif chromatic:
        base_hue = chromatic[0]['hue']
    else:
        base_hue = 0.0
    hue_islands = []
    for c in chromatic:
        delta = hue_distance(c['hue'], base_hue)
        if delta > 60:
            hue_islands.append({'role': c['role'], 'hue': round(c['hue'], 1),
                                'deltaToBase': round(delta, 1)})
    islands_documented = entry.get('allowedBackgroundIslands') is True
    if hue_islands:
        warnings.append({'code': 'bgPurity', 'documented': islands_documented,
                         'message': '背景家族出现色相孤岛（>60 度）', 'detail': hue_islands})

    # 明暗 straddle（浅色主题里混入极暗表面）只记录，不判违规
    lums = [contrast_ratio(surfaces[k], '#000000') for k in surfaces]
    min_lum, max_lum = min(lums), max(lums)
    dark_straddle = min_lum < 2 and max_lum > 10

    # ② 角色碰撞（精确同值）：25 个设计角色
    collisions = []
    seen = {}
    for role in DESIGN_ROLES:
        v = slot_value(authored, role)
        if not v:
            continue
        seen.setdefault(v.lower(), []).append(role)
    for key in sorted(seen):
        roles = seen[key]
        if len(roles) < 2:
            continue
        groups = set(DESIGN_GROUP.get(r, '') for r in roles)
        cross = len(groups) > 1
        documented = _match_exception(entry, 'allowedCollisions', roles)
        collisions.append({'roles': roles, 'crossGroup': cross, 'documented': documented})
        warnings.append({
            'code': 'roleCollision', 'documented': documented,
            'message': ('跨组' if cross else '同组') + '角色取同值：' + ' = '.join(roles) + '（' + key + '）',
            'detail': roles,
        })

    # ③ markdown 层级：6 个 markdown 角色内部同值
    markdown_duplicates = []
    for c in collisions:
        if all(DESIGN_GROUP.get(r) == 'md' for r in c['roles']):
            markdown_duplicates.append(c['roles'])
            documented = _match_exception(entry, 'allowedMarkdownDuplicates', c['roles'])
            warnings.append({'code': 'markdownDuplicate', 'documented': documented,
                             'message': 'markdown 角色同值，层级被抹平：' + ' = '.join(c['roles']),
                             'detail': c['roles']})

    # ④ 品牌第二色几何（HSL 色相）
    primary_hex = slot_value(authored, 'primary')
    secondary_hex = slot_value(authored, 'secondary')
    primary_hsl = to_hsl(primary_hex) if primary_hex else None
    secondary_hsl = to_hsl(secondary_hex) if secondary_hex else None
    hue_diff = 0.0
    brand_category = 'unknown'
    if primary_hsl is not None and secondary_hsl is not None:
        hue_diff = round(hue_distance(primary_hsl[0], secondary_hsl[0]), 1)
        if hue_diff <= 45:
            brand_category = 'analogous'
        elif 95 <= hue_diff <= 145:
            brand_category = 'triadic'
        elif hue_diff > 145:
            brand_category = 'complementary'
        else:
            brand_category = 'unclassified'
    allowed_brand = entry.get('allowedBrandGeometry') or []
    brand_documented = brand_category in allowed_brand or 'unclassified' in allowed_brand
    if brand_category == 'unclassified':
        warnings.append({
            'code': 'brandGeometry', 'documented': brand_documented,
            'message': 'primary 与 secondary 色相差 ' + _js_num(hue_diff) +
                       ' 度，既非近似(<=45)也非三角(95-145)或互补(>145)',
            'detail': {'primarySecondaryHueDiff': hue_diff},
        })

    # ⑤ 语法区分度与层次
    syntax_pairs = []
    for i in range(len(SYNTAX_CORE)):
        for j in range(i + 1, len(SYNTAX_CORE)):
            syntax_pairs.append({
                'roles': [SYNTAX_CORE[i], SYNTAX_CORE[j]],
                'deltaE': delta_e76(slot_value(authored, SYNTAX_CORE[i]),
                                    slot_value(authored, SYNTAX_CORE[j])),
            })
    min_pair = min(syntax_pairs, key=lambda p: (p['deltaE'], '↔'.join(p['roles']))) if syntax_pairs else None
    core_min = round(min_pair['deltaE'], 1) if min_pair else 0.0
    comment_hex = slot_value(authored, 'syntaxComment')
    operator_hex = slot_value(authored, 'syntaxOperator')

    def nearest_core(hexv):
        if not hexv:
            return 0.0
        return round(min(delta_e76(hexv, slot_value(authored, r)) for r in SYNTAX_CORE), 1)

    code_bg = surfaces['codeBlockBg']

    def contrast_on_code(hexv):
        if not hexv:
            return 0.0
        eff = flatten(hexv, code_bg)
        if not eff:
            return 0.0
        return contrast_ratio(eff, code_bg)

    core_contrasts = [contrast_on_code(slot_value(authored, r)) for r in SYNTAX_CORE]
    comment_contrast = contrast_on_code(comment_hex)
    operator_contrast = contrast_on_code(operator_hex)
    comment_outranks = sum(1 for c in core_contrasts if c < comment_contrast)
    operator_outranks = sum(1 for c in core_contrasts if c < operator_contrast)
    allowed_recede = entry.get('allowedSyntaxRecede') or []
    if core_min < 10:
        warnings.append({'code': 'syntaxCoreMin', 'documented': False,
                         'message': '语法核心五角色最小 ΔE=' + _js_num(core_min) + ' < 10（相邻角色难辨）',
                         'detail': min_pair})
    if comment_outranks > 0:
        warnings.append({'code': 'syntaxRecede',
                         'documented': 'syntaxComment' in allowed_recede,
                         'message': 'syntaxComment 亮度超过 ' + str(comment_outranks) + ' 个核心语法角色，未退后',
                         'detail': {'outranks': comment_outranks}})
    if operator_outranks > 0:
        warnings.append({'code': 'syntaxRecede',
                         'documented': 'syntaxOperator' in allowed_recede,
                         'message': 'syntaxOperator 亮度超过 ' + str(operator_outranks) + ' 个核心语法角色，未退后',
                         'detail': {'outranks': operator_outranks}})

    design = {
        'surfaces': surfaces,
        'distinctSurfaces': len(set(surfaces.values())),
        'darkStraddle': dark_straddle,
        'hueIslands': hue_islands,
        'collisions': collisions,
        'markdownDuplicates': markdown_duplicates,
        'brand': {'primarySecondaryHueDiff': hue_diff, 'category': brand_category,
                  'documented': brand_documented},
        'syntax': {
            'coreMinDeltaE': core_min,
            'coreMinPair': ' ↔ '.join(min_pair['roles']) if min_pair else '',
            'commentNearestCoreDeltaE': nearest_core(comment_hex),
            'operatorNearestCoreDeltaE': nearest_core(operator_hex),
            'commentOutranks': comment_outranks,
            'operatorOutranks': operator_outranks,
        },
    }
    return design, warnings


# ═══════════════════════════════════════════════════════════════════════════
# 7. 输入装载
# ═══════════════════════════════════════════════════════════════════════════

def load_palette(path):
    """识别输入形态，返回 (colors, meta)。"""
    with io.open(path, 'r', encoding='utf-8-sig') as fh:
        obj = json.load(fh)
    meta = {
        'path': os.path.abspath(path),
        'id': obj.get('id') if isinstance(obj, dict) else None,
        'name': obj.get('name') if isinstance(obj, dict) else None,
        'appearance': None,
        'sourceForm': None,
    }
    if not isinstance(obj, dict):
        raise ValueError('调色板根必须是 JSON 对象')
    if isinstance(obj.get('colors'), dict):
        meta['sourceForm'] = 'custom-preset'
        meta['appearance'] = obj.get('appearance')
        return dict(obj['colors']), meta
    if isinstance(obj.get('theme'), dict):
        meta['sourceForm'] = 'opencode-theme'
        meta['appearance'] = obj.get('appearance')
        mode = 'light' if meta['appearance'] == 'light' else 'dark'
        return resolve_theme_colors(obj, mode), meta
    # 扁平表
    meta['sourceForm'] = 'flat-map'
    colors = {k: v for k, v in obj.items() if isinstance(v, str)}
    if isinstance(obj.get('appearance'), str) and obj.get('appearance') in ('light', 'dark'):
        meta['appearance'] = obj['appearance']
        colors.pop('appearance', None)
    return colors, meta


def load_exceptions(path):
    if not path or not os.path.isfile(path):
        return {'themes': {}}
    try:
        with io.open(path, 'r', encoding='utf-8-sig') as fh:
            data = json.load(fh)
        if isinstance(data, dict) and isinstance(data.get('themes'), dict):
            return data
    except Exception:
        pass
    return {'themes': {}}


# ═══════════════════════════════════════════════════════════════════════════
# 8. 报告
# ═══════════════════════════════════════════════════════════════════════════

def _disp_width(s):
    return sum(2 if unicodedata.east_asian_width(ch) in ('W', 'F') else 1 for ch in s)


def _pad(s, width):
    s = str(s)
    gap = width - _disp_width(s)
    return s + (' ' * gap if gap > 0 else '')


def _rule(char, width):
    return char * width


VERDICT_LABEL = {'pass': 'PASS', 'fail': 'FAIL', 'info': 'info', 'skip': 'skip'}


def render_report(result):
    """人读报告（纯文本）。"""
    L = []
    pal = result['palette']
    ev = result['evaluation']
    W = 92
    L.append(_rule('=', W))
    L.append(' dsh-opencode-palette · 37-token 调色板判尺检查')
    L.append(_rule('=', W))
    L.append(' 调色板    : ' + pal['path'])
    ident = pal.get('id') or os.path.splitext(os.path.basename(pal['path']))[0]
    if pal.get('name'):
        ident += '  (' + pal['name'] + ')'
    L.append(' 主题 id   : ' + ident + '    [输入形态: ' + pal['sourceForm'] + ']')
    L.append(' 外观      : ' + pal['appearance'] + '    宿主画布 ' + ev['canvas'] +
             '    diff 修复方向 ' + result['diffRepair'])
    tk = result['tokens']
    L.append(' token     : ' + str(tk['present']) + '/' + str(tk['expected']) + ' 齐' +
             ('' if not tk['missing'] else '   缺: ' + ', '.join(tk['missing'])))
    L.append('')

    L.append(' -- 表面合成 ' + _rule('-', W - 14))
    surfaces = ev['surfaces']
    for i in range(0, len(SURFACES), 2):
        left = SURFACES[i]
        right = SURFACES[i + 1] if i + 1 < len(SURFACES) else None
        line = '   ' + _pad(left, 16) + surfaces[left]
        if right:
            line += '    ' + _pad(right, 16) + surfaces[right]
        L.append(line)
    L.append('   不同表面数 ' + str(ev['distinctSurfaces']) +
             ('    未解析（回落到底色）: ' + ', '.join(ev['unresolvedSurfaces'])
              if ev['unresolvedSurfaces'] else ''))
    L.append('')

    groups = []
    for d in PAIR_DEFS:
        if d['group'] not in groups:
            groups.append(d['group'])
    by_group = {}
    for p in ev['pairs']:
        by_group.setdefault(p['group'], []).append(p)

    for group in groups:
        rows = by_group.get(group, [])
        if not rows:
            continue
        L.append(' -- ' + GROUP_TITLES.get(group, group) + ' ' + _rule('-', max(0, W - 12 - len(GROUP_TITLES.get(group, group)))))
        L.append('   ' + _pad('对 (fg @ bg)', 34) + _pad('fg', 10) + _pad('bg', 10) +
                 _pad('比值', 9) + _pad('阈值', 7) + '判定')
        for p in rows:
            ratio = '-' if p['ratio'] is None else ('%.3f' % p['ratio'])
            L.append('   ' + _pad(p['code'], 34) + _pad(p['fg'] or '-', 10) +
                     _pad(p['bg'] or '-', 10) + _pad(ratio, 9) +
                     _pad(('%.1f' % p['threshold']), 7) + VERDICT_LABEL.get(p['verdict'], p['verdict']))
        L.append('')

    c = ev['counts']
    L.append(' -- 汇总 ' + _rule('-', W - 8))
    L.append('   硬性正文/内容对 (4.5:1) : ' + str(c['hardTotal']) + ' 评估 / ' +
             str(c['hardFails']) + ' 违例')
    L.append('   硬性 UI/交互对   (3.0:1) : ' + str(c['uiTotal']) + ' 评估 / ' +
             str(c['uiFails']) + ' 违例')
    L.append('   硬性违例合计              : ' + str(c['hardFails'] + c['uiFails']) +
             '    跳过（无法解析）: ' + str(c['skipped']))
    if c['byGroup']:
        L.append('   违例分布                  : ' +
                 ', '.join('%s=%d' % (k, v) for k, v in sorted(c['byGroup'].items())))
    L.append('   信息项（不计分）          : border<3 ' + str(c['info']['borderBelow3']) +
             ' 处, diffBg<3 ' + str(c['info']['diffBgBelow3']) +
             ' 处, 语法@codeHeaderBg<4.5 ' + str(c['info']['syntaxHeaderBelow45']) +
             ' 处, tooltip<4.5 ' + ('是' if c['info']['tooltipBelow45'] else '否'))
    L.append('')

    L.append(' -- IP 设计规范告警（warning 级，不计硬性条数、不改退出码） ' +
             _rule('-', 8))
    dsg = result['design']
    if dsg is None:
        L.append('   （未计算）')
    else:
        L.append('   背景色相孤岛 : ' + str(len(dsg['hueIslands'])) +
                 '    角色碰撞: ' + str(len(dsg['collisions'])) +
                 '    markdown 同值: ' + str(len(dsg['markdownDuplicates'])) +
                 '    品牌几何: ' + dsg['brand']['category'] +
                 ' (Δh ' + _js_num(dsg['brand']['primarySecondaryHueDiff']) + '°)' +
                 '    语法核心最小 ΔE: ' + _js_num(dsg['syntax']['coreMinDeltaE']) +
                 ' (' + dsg['syntax']['coreMinPair'] + ')' +
                 '    明暗 straddle: ' + ('是' if dsg['darkStraddle'] else '否'))
        if result['designWarnings']:
            for w in result['designWarnings']:
                L.append('   ! [' + w['code'] + '] ' + w['message'] +
                         ('   [已记档 exceptions.json]' if w['documented'] else '   [待处理]'))
        else:
            L.append('   （无告警）')
    L.append('')

    total = c['hardFails'] + c['uiFails']
    if total:
        L.append(' 结论: FAIL — ' + str(total) + ' 条硬性违例（退出码 1）')
    else:
        L.append(' 结论: PASS — 0 条硬性违例' +
                 ('，' + str(len(result['designWarnings'])) + ' 条设计告警待处理'
                  if result['designWarnings'] else '，0 条设计告警') + '（退出码 0）')
    return '\n'.join(L)


def build_result(path, appearance_override=None, theme_name=None, exceptions_path=None,
                 with_design=True):
    colors, meta = load_palette(path)
    appearance = appearance_override or meta.get('appearance')
    appearance = 'light' if appearance == 'light' else 'dark'
    is_dark = appearance != 'light'
    canvas = HOST_CANVAS[appearance]

    norm = normalize_theme_colors(colors)
    pal = ensure_diff_contrast(norm, is_dark)

    ev = evaluate(pal, canvas)

    exceptions = load_exceptions(exceptions_path)
    candidates = []
    if theme_name:
        candidates.append(theme_name)
    if meta.get('id'):
        candidates.append(meta['id'])
    candidates.append(os.path.splitext(os.path.basename(path))[0])
    if meta.get('name'):
        candidates.append(meta['name'])
    resolved_name = None
    for cand in candidates:
        if cand and cand in exceptions.get('themes', {}):
            resolved_name = cand
            break
    resolved_name = resolved_name or (candidates[0] if candidates else None)

    design = None
    design_warnings = []
    if with_design:
        design, design_warnings = build_design_record(colors, resolved_name, exceptions)

    present = [k for k in TOKEN_KEYS if isinstance(colors.get(k), str)]
    missing = [k for k in TOKEN_KEYS if k not in present]

    violations = [p for p in ev['pairs'] if p['verdict'] == 'fail']
    exit_code = 1 if violations else 0

    result = {
        'schema': 'dsh-opencode-palette.audit-check.v1',
        'palette': {
            'path': meta['path'],
            'id': meta.get('id'),
            'name': meta.get('name'),
            'sourceForm': meta['sourceForm'],
            'appearance': appearance,
            'hostCanvas': canvas,
            'exceptionsKey': resolved_name,
        },
        'criteria': {
            'source': 'docs/theme-audit/criteria.md',
            'text': TEXT_THRESHOLD,
            'ui': UI_THRESHOLD,
            'info': 'no-threshold',
            'syntaxHeaderDiagnostic': SYNTAX_HEADER_THRESHOLD,
            'pairCount': len(PAIR_DEFS),
        },
        'tokens': {
            'expected': len(TOKEN_KEYS),
            'present': len(present),
            'missing': missing,
            'extra': sorted(k for k in colors if k not in TOKEN_KEYS),
        },
        'diffRepair': 'dark' if is_dark else 'light',
        'evaluation': ev,
        'violations': violations,
        'design': design,
        'designWarnings': design_warnings,
        'exitCode': exit_code,
    }
    return result


# ═══════════════════════════════════════════════════════════════════════════
# 9. CLI
# ═══════════════════════════════════════════════════════════════════════════

def find_repo_root(start):
    cur = os.path.abspath(start)
    for _ in range(6):
        if os.path.isfile(os.path.join(cur, 'docs', 'theme-audit', 'criteria.md')):
            return cur
        parent = os.path.dirname(cur)
        if parent == cur:
            break
        cur = parent
    return None


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog='check_palette.py',
        description='dsh-opencode-palette 37-token 调色板判尺检查器（criteria.md §1–§4）')
    parser.add_argument('palette', help='调色板 JSON：{"appearance","colors"} / {"colors"} / 扁平 token 表')
    parser.add_argument('--json-out', metavar='PATH', help='把 JSON 报告写到该文件')
    parser.add_argument('--appearance', choices=['light', 'dark'], help='覆盖调色板声明的外观')
    parser.add_argument('--theme-name', help='例外登记（exceptions.json）用的主题名，默认按 id/文件名推断')
    parser.add_argument('--exceptions', metavar='PATH',
                        help='例外登记文件；默认取仓库 docs/theme-audit/exceptions.json')
    parser.add_argument('--no-design', action='store_true', help='跳过 IP 设计规范告警计算')
    parser.add_argument('--quiet', action='store_true', help='不打印人读报告（配合 --json-out 使用）')
    args = parser.parse_args(argv)

    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

    if not os.path.isfile(args.palette):
        print('错误：找不到调色板文件 ' + args.palette, file=sys.stderr)
        return 2
    exceptions_path = args.exceptions
    if not exceptions_path:
        root = find_repo_root(os.path.dirname(os.path.abspath(args.palette))) or find_repo_root(os.getcwd())
        if root:
            exceptions_path = os.path.join(root, 'docs', 'theme-audit', 'exceptions.json')

    try:
        result = build_result(args.palette, appearance_override=args.appearance,
                              theme_name=args.theme_name, exceptions_path=exceptions_path,
                              with_design=not args.no_design)
    except Exception as exc:  # noqa: BLE001
        print('错误：无法解析调色板 ' + args.palette + '：' + str(exc), file=sys.stderr)
        return 2

    if not args.quiet:
        print(render_report(result))
    if args.json_out:
        out_dir = os.path.dirname(os.path.abspath(args.json_out))
        if out_dir and not os.path.isdir(out_dir):
            os.makedirs(out_dir, exist_ok=True)
        with io.open(args.json_out, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=False) + '\n')
        if not args.quiet:
            print('JSON 报告已写入 ' + os.path.abspath(args.json_out))
    return result['exitCode']


if __name__ == '__main__':
    sys.exit(main())
