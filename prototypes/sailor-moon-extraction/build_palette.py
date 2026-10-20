# -*- coding: utf-8 -*-
"""美少女战士 · 月光星纱 —— 37 色位取色台账 + 计算器（v3 终稿候选）
三种合法来源（与 prototypes/harry-potter-theme-preview.html 同规则）：
  ① 直采  direct(hex)       —— hex 与参考图某个像素完全一致
  ② 阶梯  step(hex, L)       —— 采样色在 OKLCH 空间沿明度轴取台阶（C/h 保持，越界时收敛彩度）
  ③ 混色  mix(hexA, hexB, t) —— 两个采样色在 sRGB 空间按固定比例混合（t = B 的占比）
"""
import json, math, os
from PIL import Image
import numpy as np

SRC = r"C:\Users\辰辰洋洋\Pictures\美少女战士"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_JSON = os.path.join(HERE, "palette.json")

def s2l(c):
    c = np.asarray(c, dtype=np.float64) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def l2s(c):
    c = np.clip(c, 0.0, 1.0)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * (c ** (1 / 2.4)) - 0.055)

def hex2rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)], dtype=np.float64)

def rgb2hex(rgb):
    return "#%02X%02X%02X" % tuple(int(round(v)) for v in rgb)

def rgb2oklab(rgb):
    r, g, b = s2l(rgb)
    l = 0.4122214708*r + 0.5363325363*g + 0.0514459929*b
    m = 0.2119034982*r + 0.6806995451*g + 0.1073969566*b
    s = 0.0883024619*r + 0.2817188376*g + 0.6299787005*b
    l_, m_, s_ = np.cbrt(l), np.cbrt(m), np.cbrt(s)
    return np.array([0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_,
                     1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_,
                     0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_])

def oklab2lin(lab):
    l_, m_, s_ = (lab[0] + 0.3963377774*lab[1] + 0.2158037573*lab[2],
                  lab[0] - 0.1055613458*lab[1] - 0.0638541728*lab[2],
                  lab[0] - 0.0894841775*lab[1] - 1.2914855480*lab[2])
    l_, m_, s_ = l_**3, m_**3, s_**3
    return np.array([4.0767416621*l_ - 3.3077115913*m_ + 0.2309699292*s_,
                     -1.2684380046*l_ + 2.6097574011*m_ - 0.3413193965*s_,
                     -0.0041960863*l_ - 0.7034186147*m_ + 1.7076147010*s_])

def oklch(hexv):
    lab = rgb2oklab(hex2rgb(hexv))
    C = float(math.hypot(lab[1], lab[2]))
    h = float(math.degrees(math.atan2(lab[2], lab[1])) % 360.0)
    return float(lab[0]), C, h

def step(hexv, targetL):
    L, C, h = oklch(hexv)
    rad = math.radians(h)
    c2 = C
    for _ in range(300):
        lin = oklab2lin(np.array([targetL, c2*math.cos(rad), c2*math.sin(rad)]))
        if np.all(lin >= -0.001) and np.all(lin <= 1.001):
            out = rgb2hex(l2s(lin) * 255.0)
            L2, C2, h2 = oklch(out)
            return out, round(C2, 4), round(h2, 1)
        c2 *= 0.98
    out = rgb2hex(l2s(oklab2lin(np.array([targetL, 0.0, 0.0]))) * 255.0)
    L2, C2, h2 = oklch(out)
    return out, round(C2, 4), round(h2, 1)

def mix(hexA, hexB, t):
    a, b = hex2rgb(hexA), hex2rgb(hexB)
    return rgb2hex(a * (1 - t) + b * t)

def lum(hexv):
    r, g, b = s2l(hex2rgb(hexv))
    return float(0.2126*r + 0.7152*g + 0.0722*b)

def cr(a, b):
    la, lb = lum(a), lum(b)
    if la < lb: la, lb = lb, la
    return (la + 0.05) / (lb + 0.05)

def hsl_hue(hexv):
    r, g, b = [v / 255.0 for v in hex2rgb(hexv)]
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d == 0: return 0.0
    if mx == r: h = 60 * (((g - b) / d) % 6)
    elif mx == g: h = 60 * ((b - r) / d + 2)
    else: h = 60 * ((r - g) / d + 4)
    return round(h, 1)

# ───────────────────────── 直采源 ─────────────────────────
S = {
    "white_wing":  dict(hex="#FFFFFF", file="3.jpg",           box=(334, 500, 436, 598), label="白色羽翼"),
    "pink_wing":   dict(hex="#FEB7D7", file="3.jpg",           box=(352, 336, 400, 392), label="翅膀粉饰"),
    "night_ink":   dict(hex="#041541", file="3.jpg",           box=(0, 0, 452, 46),     label="夜空暗部"),
    "star_blue":   dict(hex="#2449EF", file="3.jpg",           box=(0, 0, 80, 40),      label="夜空星蓝"),
    "ruby":        dict(hex="#B33149", file="3.jpg",           box=(104, 108, 126, 132),label="红宝石胸饰"),
    "bow_rose":    dict(hex="#C51E56", file="2.jpg",           box=(476, 364, 528, 412),label="深红蝴蝶结"),
    "bow_maroon":  dict(hex="#74284F", file="2.jpg",           box=(152, 252, 196, 286),label="暗红蝴蝶结"),
    "gold_warm":   dict(hex="#EAA627", file="2.jpg",           box=(472, 14, 588, 106), label="暖金长发"),
    "pale_green":  dict(hex="#7DA67E", file="2.jpg",           box=(150, 45, 215, 105), label="浅绿前发"),
    "cyan_star":   dict(hex="#6FC2EC", file="2.jpg",           box=(100, 150, 165, 215),label="星云亮青"),
    "nebula_teal": dict(hex="#0A2D4D", file="2.jpg",           box=(263, 311, 316, 362),label="星云深青"),
    "nebula_blue": dict(hex="#1659A7", file="2.jpg",           box=(0, 0, 100, 130),    label="星云蓝"),
    "pink_skirt":  dict(hex="#F8C7CB", file="2.jpg",           box=(614, 304, 728, 402),label="粉色短裙"),
    "navy_skirt":  dict(hex="#133284", file="images (1).jpg",  box=(46, 116, 110, 164), label="藏青短裙"),
    "teal_ribbon": dict(hex="#006D72", file="images (1).jpg",  box=(96, 190, 134, 237), label="青绿飘带"),
    "mint_light":  dict(hex="#83B4B8", file="images (1).jpg",  box=(118, 244, 162, 306),label="薄荷飘带"),
    "red_sun":     dict(hex="#AA171F", file="images (1).jpg",  box=(4, 4, 58, 54),      label="海报红日"),
    "city_grey":   dict(hex="#596C8C", file="images (1).jpg",  box=(0, 150, 30, 250),   label="城市灰蓝"),
    "pure_black":  dict(hex="#000009", file="images (1).jpg",  box=(19, 190, 58, 237),  label="海报纯黑"),
}

_IMG = {}
def _img(name):
    if name not in _IMG:
        _IMG[name] = np.asarray(Image.open(f"{SRC}\\{name}").convert("RGB"))
    return _IMG[name]

def hits(key):
    s = S[key]
    a = _img(s["file"])
    t = hex2rgb(s["hex"]).astype(np.uint8)
    n = int((np.all(a == t, axis=2)).sum())
    b = s["box"]
    ib = int((np.all(a[b[1]:b[3], b[0]:b[2]] == t, axis=2)).sum())
    return n, ib

# ───────────────────────── 台账 DSL ─────────────────────────
def D(key, cn):
    s = S[key]
    return dict(value=s["hex"], rule="direct", src=key, cn=cn, label=s["label"],
                file=s["file"], box=list(s["box"]),
                formula=f"直采 · {s['file']} {s['label']} {s['hex']}")

def MIX(a, b, t, cn, label):
    pct = round(t * 100)
    return dict(value=mix(S[a]["hex"], S[b]["hex"], t), rule="mix", a=a, b=b, t=t, cn=cn, label=label,
                file=S[a]["file"], box=list(S[a]["box"]),
                formula=f"混色 · {S[a]['label']} {100-pct}% × {S[b]['label']} {pct}%")

def STEP(a, L, cn, label):
    hx, c2, h2 = step(S[a]["hex"], L)
    return dict(value=hx, rule="step", src=a, L=L, chroma=c2, cn=cn, label=label,
                file=S[a]["file"], box=list(S[a]["box"]),
                formula=f"阶梯 · {S[a]['label']} {S[a]['hex']} 沿 OKLCH 明度轴取 L={L:.2f}（h {h2}°）")

W, P, INK = "white_wing", "pink_wing", "night_ink"
GOLD, ROSE = "gold_warm", "bow_rose"

LEDGER = [
    # ── 背景场域：白羽 × 樱粉 的一条混色阶梯 ──
    dict(token="background",        **MIX(W, P, 0.24, "页面底",   "樱纸")),
    dict(token="backgroundPanel",   **MIX(W, P, 0.56, "面板底",   "樱纸")),
    dict(token="backgroundElement", **MIX(W, P, 0.64, "浮层底",   "樱纸")),
    dict(token="sidebarBg",         **MIX(W, P, 0.46, "侧栏底",   "樱纸")),
    dict(token="bubbleBg",          **MIX(W, P, 0.12, "气泡底",   "樱纸")),
    dict(token="inputBg",           **MIX(W, P, 0.30, "输入底",   "樱纸")),
    dict(token="codeBlockBg",       **MIX(W, P, 0.42, "代码底",   "樱纸")),
    dict(token="codeHeaderBg",      **MIX(W, P, 0.52, "代码头",   "樱纸")),
    # ── 文字结构 ──
    dict(token="text",              **D(INK, "正文")),
    dict(token="textMuted",         **MIX("city_grey", INK, 0.50, "次级文字", "夜雾蓝灰")),
    # ── 品牌与语义 ──
    dict(token="primary",           **D(ROSE, "品牌主色")),
    dict(token="secondary",         **D("navy_skirt", "品牌第二色")),
    dict(token="info",              **D("nebula_blue", "信息")),
    dict(token="success",           **D("teal_ribbon", "成功")),
    dict(token="warning",           **STEP(GOLD, 0.50, "警告", "月牙金")),
    dict(token="error",             **D("red_sun", "错误")),
    # ── 边界 ──
    dict(token="border",            **MIX(W, P, 0.40, "描边", "樱纸描边")),
    dict(token="borderActive",      **MIX(ROSE, INK, 0.30, "焦点环", "深玫焦点")),
    # ── diff ──
    dict(token="diffAdded",         **STEP("teal_ribbon", 0.34, "新增行字", "深青")),
    dict(token="diffRemoved",       **STEP("red_sun", 0.36, "删除行字", "深砖红")),
    dict(token="diffAddedBg",       **MIX("mint_light", W, 0.08, "新增行底", "薄荷纸")),
    dict(token="diffRemovedBg",     **MIX("pink_skirt", W, 0.08, "删除行底", "樱纸")),
    dict(token="diffAddedLineNumberBg",   **MIX("mint_light", W, 0.20, "新增行号底", "薄荷纸")),
    dict(token="diffRemovedLineNumberBg", **MIX("pink_skirt", W, 0.22, "删除行号底", "樱纸")),
    # ── markdown ──
    dict(token="markdownHeading",   **STEP("navy_skirt", 0.46, "标题", "藏青亮阶")),
    dict(token="markdownLink",      **D("star_blue", "链接")),
    dict(token="markdownCode",      **STEP("navy_skirt", 0.34, "行内码", "藏青深阶")),
    dict(token="markdownEmph",      **D("bow_maroon", "强调")),
    dict(token="markdownStrong",    **MIX(INK, "pure_black", 0.50, "加粗", "浓墨")),
    dict(token="markdownBlockQuote",**MIX(INK, P, 0.35, "引用", "暗紫灰")),
    # ── syntax ──
    dict(token="syntaxComment",     **MIX("city_grey", INK, 0.10, "注释", "星尘灰")),
    dict(token="syntaxKeyword",     **STEP(ROSE, 0.44, "关键字", "深玫")),
    dict(token="syntaxFunction",    **STEP("star_blue", 0.44, "函数名", "星蓝")),
    dict(token="syntaxType",        **STEP("cyan_star", 0.44, "类型", "海青")),
    dict(token="syntaxNumber",      **STEP(GOLD, 0.44, "数字", "赤铜")),
    dict(token="syntaxString",      **STEP("pale_green", 0.44, "字符串", "海绿")),
    dict(token="syntaxOperator",    **MIX("bow_maroon", "city_grey", 0.65, "运算符", "藕紫灰")),
]

def main():
    colors, ledger = {}, []
    for row in LEDGER:
        colors[row["token"]] = row["value"]
        ledger.append({k: v for k, v in row.items() if k != "value"} | {"hex": row["value"]})
    preset = {
        "appearance": "light", "basePreset": "sailor-moon", "colors": colors,
        "id": "sailor-moon", "name": "美少女战士",
        "schema": "dsh-opencode-palette.custom-theme.v1",
        "updatedAt": "2026-10-20T10:30:00+08:00",
    }
    with open(OUT_JSON, "w", encoding="utf-8") as fh:
        json.dump(preset, fh, ensure_ascii=False, indent=1)
    with open(os.path.join(HERE, "ledger.json"), "w", encoding="utf-8") as fh:
        json.dump(ledger, fh, ensure_ascii=False, indent=1)

    print(f"{'token':<26}{'hex':<10}{'rule':<8}{'L':>7}{'C':>7}{'h':>7}{'hsl':>7}  source")
    for row in LEDGER:
        L, C, h = oklch(row["value"])
        print(f"{row['token']:<26}{row['value']:<10}{row['rule']:<8}{L:>7.3f}{C:>7.3f}{h:>7.1f}{hsl_hue(row['value']):>7.1f}  {row['formula']}")
    print("\n── 直采凭证（全图精确像素数 / 区域内命中数）──")
    for k in S:
        n, ib = hits(k)
        print(f"  {k:<13} {S[k]['hex']}  {S[k]['file']:<16} 全图 {n:<6} 区域 {ib:<6} {S[k]['label']}")
    print("\n── syntax 在代码底上的对比 ──")
    cb = colors["codeBlockBg"]
    for t in ("syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString", "syntaxOperator"):
        print(f"  {t:<16} {cr(colors[t], cb):5.2f}")
    print(f"  contrastText(primary) #F4F4F5 on primary : {cr('#F4F4F5', colors['primary']):5.2f}")

if __name__ == "__main__":
    main()
