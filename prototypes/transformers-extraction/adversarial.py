# -*- coding: utf-8 -*-
"""adversarial.py — 对抗式审查：假设自己的配方是错的，逐条找破绽。

审查项：
  A1 「直采」是否真的等于图里某个像素（仓库判尺要求「hex 与参考图某个像素完全一致」，
     而我用的是聚类中位色——中位色可能根本不是任何一个像素）
  A2 每个色位与「相邻岗位」之间的 ΔE76 盲区（审计只查 5 个语法核心两两 ΔE，
     不查 markdown vs text、不查 diff vs error——这些盲区要自己补）
  A3 对比度余量：离阈值最近的一条，抖动 1 个色阶会不会翻车
  A4 色族失衡：暖族/冷族/绿族各占多少岗位
  A5 背景 8 槽的色相纯度（是否真在同一条家族上）
"""
import os, sys, io, json, colorsys
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from sources import SRC_DIR, IMAGES

HERE = os.path.dirname(os.path.abspath(__file__))
PAL = json.load(open(os.path.join(HERE, "palette.json"), encoding="utf-8"))
C = PAL["colors"]
TOKS = {t["token"]: t for t in PAL["tokens"]}


def rgb_of(h):
    h = h.lstrip("#")[:6]
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def hx(c):
    return "#%02X%02X%02X" % tuple(int(round(max(0, min(255, v)))) for v in c)


def to_lab(h):
    def lin(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = [lin(v) for v in rgb_of(h)]
    x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
    y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
    z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883
    f = lambda t: (t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116)
    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def de(a, b):
    A, B = to_lab(a), to_lab(b)
    return sum((A[i] - B[i]) ** 2 for i in range(3)) ** 0.5


def lum(h):
    def lin(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = [lin(v) for v in rgb_of(h)]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    l1, l2 = lum(a), lum(b)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def hsl(h):
    r, g, b = [v / 255 for v in rgb_of(h)]
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    d = mx - mn
    if d == 0:
        return 0.0, 0.0, l
    if mx == r:
        hh = ((g - b) / d) % 6
    elif mx == g:
        hh = (b - r) / d + 2
    else:
        hh = (r - g) / d + 4
    hh *= 60
    s = 0 if l in (0, 1) else d / (1 - abs(2 * l - 1))
    return hh, s, l


# ── 载入五张图的精确像素集合 ─────────────────────────────────────────
print("=" * 96)
print("A1 「直采」是否等于图里真实存在的某个像素")
print("=" * 96)
PIX = {}          # (r,g,b) -> [(file, count)]
for fname, _, _ in IMAGES:
    a = np.asarray(Image.open(os.path.join(SRC_DIR, fname)).convert("RGB")).reshape(-1, 3)
    u, cnt = np.unique(a, axis=0, return_counts=True)
    for px, c in zip(u, cnt):
        PIX.setdefault(tuple(int(v) for v in px), []).append((fname, int(c)))
print("五张图去重后共 %d 个不同像素值" % len(PIX))

exact_hits, fake_hits = [], []
for t in PAL["tokens"]:
    if t["kind"] != "直采":
        continue
    key = rgb_of(t["hex"])
    hit = PIX.get(key)
    if hit:
        exact_hits.append((t["token"], t["hex"], hit))
    else:
        # 最近的真实像素
        best = min(PIX.items(), key=lambda kv: sum((kv[0][i] - key[i]) ** 2 for i in range(3)))
        d = sum((best[0][i] - key[i]) ** 2 for i in range(3)) ** 0.5
        fake_hits.append((t["token"], t["hex"], hx(best[0]), d, best[1]))

print("\n真·直采（就是图里的像素）%d 个：" % len(exact_hits))
for tok, h, hit in exact_hits:
    f, c = hit[0]
    print("   ✓ %-26s %s  出现在 %s（%d px）" % (tok, h, f, c))
print("\n伪·直采（中位色根本不是任何像素）%d 个：" % len(fake_hits))
for tok, h, near, d, hit in fake_hits:
    print("   ✗ %-26s %s  最近真实像素 %s  Δ=%.1f  (%s ×%d px)" %
          (tok, h, near, d, hit[0][0], hit[0][1]))

# ── A2 岗位盲区 ────────────────────────────────────────────────────
print()
print("=" * 96)
print("A2 岗位盲区：审计不查的组合（跨组同义岗位）")
print("=" * 96)
BLIND = [
    ("markdownCode", "text", "行内码 vs 正文"),
    ("markdownCode", "textMuted", "行内码 vs 次级文字"),
    ("markdownStrong", "text", "粗体 vs 正文"),
    ("markdownEmph", "warning", "强调 vs 警示"),
    ("markdownHeading", "borderActive", "标题 vs 焦点环"),
    ("markdownBlockQuote", "textMuted", "引用 vs 次级文字"),
    ("diffAdded", "success", "新增行 vs 成功态"),
    ("diffRemoved", "error", "删除行 vs 报错"),
    ("diffRemoved", "primary", "删除行 vs 品牌红"),
    ("syntaxType", "markdownCode", "类型 vs 行内码"),
    ("syntaxString", "textMuted", "字符串 vs 次级文字"),
    ("syntaxComment", "textMuted", "注释 vs 次级文字"),
    ("syntaxOperator", "textMuted", "运算符 vs 次级文字"),
    ("borderActive", "warning", "焦点环 vs 警示"),
    ("borderActive", "markdownHeading", "焦点环 vs 标题"),
    ("secondary", "markdownLink", "二级色 vs 链接"),
    ("info", "secondary", "信息 vs 二级色"),
    ("syntaxFunction", "borderActive", "函数 vs 焦点环"),
]
for a, b, why in BLIND:
    if a not in C or b not in C:
        continue
    d = de(C[a], C[b])
    flag = "BLIND" if d < 10 else ("near" if d < 16 else "ok")
    print("   %-26s %-26s ΔE76=%6.1f  %-5s  %s" % (a, b, d, flag, why))

# ── A3 对比度余量 ──────────────────────────────────────────────────
print()
print("=" * 96)
print("A3 对比度余量：离阈值最近的岗位，抖 1 个色阶会不会翻车")
print("=" * 96)
rows = sorted(PAL["audit"]["rows"], key=lambda r: (r["ratio"] / r["t"]))
for r in rows[:10]:
    margin = r["ratio"] - r["t"]
    fg = rgb_of(r["fg"])
    bg = rgb_of(r["bg"])
    # 把前景朝"离背景更远"的方向推 1 个色阶（±1/255 量级），看是否翻车
    worst = min(contrast(hx((max(0, min(255, c + d)) for c in fg)), r["bg"])
                for d in (-2, -1, 1, 2))
    print("   %-34s %6.2f / %.1f  余量 %+.3f   抖 ±2/255 后最低 %6.2f  %s" %
          (r["code"], r["ratio"], r["t"], margin, worst,
           "FRAGILE" if worst < r["t"] else "ok"))

# ── A4 色族失衡 ────────────────────────────────────────────────────
print()
print("=" * 96)
print("A4 色族分布（25 个设计岗位）")
print("=" * 96)
DESIGN = [t["token"] for t in PAL["tokens"]
          if t["token"] not in ("background", "backgroundPanel", "backgroundElement",
                                "sidebarBg", "bubbleBg", "inputBg", "codeBlockBg", "codeHeaderBg",
                                "diffAddedBg", "diffRemovedBg", "diffAddedLineNumberBg",
                                "diffRemovedLineNumberBg")]
fam = {}
for t in DESIGN:
    h, s, l = hsl(C[t])
    if s < 0.12:
        k = "无彩/中性"
    elif h < 15 or h >= 345:
        k = "红"
    elif h < 45:
        k = "橙"
    elif h < 70:
        k = "黄"
    elif h < 160:
        k = "绿"
    elif h < 200:
        k = "青"
    elif h < 260:
        k = "蓝"
    else:
        k = "紫"
    fam.setdefault(k, []).append(t)
for k in sorted(fam, key=lambda k: -len(fam[k])):
    print("   %-8s %2d  %s" % (k, len(fam[k]), " ".join(fam[k])))

# ── A5 背景家族纯度 ────────────────────────────────────────────────
print()
print("=" * 96)
print("A5 背景 8 槽的色相纯度")
print("=" * 96)
base_h = hsl(C["background"])[0]
for t in ("codeBlockBg", "background", "sidebarBg", "backgroundPanel", "inputBg",
          "bubbleBg", "codeHeaderBg", "backgroundElement"):
    h, s, l = hsl(C[t])
    d = abs(h - base_h)
    d = 360 - d if d > 180 else d
    print("   %-20s %s  H%6.1f  S%3d%%  L%3d%%   Δ色相 %5.1f°  %s" %
          (t, C[t], h, round(s * 100), round(l * 100), d,
           "★ 偏离" if d > 25 else ""))

print()
print("=" * 96)
print("审查结论：伪直采 %d 个；盲区 ΔE<10 %d 处；余量 <0.1 的对 %d 条" % (
    len(fake_hits),
    sum(1 for a, b, _ in BLIND if a in C and b in C and de(C[a], C[b]) < 10),
    sum(1 for r in rows if r["ratio"] - r["t"] < 0.1)))
