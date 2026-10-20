# -*- coding: utf-8 -*-
"""redteam.py — 对抗式审查：拿引擎真值与数值关系去挑自己方案的毛病。"""
import json, os, math, itertools

OUT = r"D:\dsh-plugin\dsh-opencode-palette\prototypes\one-piece-extraction"
P = json.load(open(os.path.join(OUT, "palette.json"), encoding="utf-8"))
C, A, PR = P["colors"], P["anchors"], P["provenance"]


def chan_lin(v):
    s = v / 255.0
    return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4


def lum(h):
    h = h.lstrip("#")
    return sum(w * chan_lin(int(h[i:i + 2], 16)) for w, i in ((0.2126, 0), (0.7152, 2), (0.0722, 4)))


def ratio(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def hue(h):
    h = h.lstrip("#")
    r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d == 0:
        return 0.0
    if mx == r:
        return 60 * (((g - b) / d) % 6)
    if mx == g:
        return 60 * ((b - r) / d + 2)
    return 60 * ((r - g) / d + 4)


def lab(h):
    h = h.lstrip("#")
    r, g, b = [chan_lin(int(h[i:i + 2], 16)) for i in (0, 2, 4)]

    def f(t):
        return t ** (1 / 3) if t > 216 / 24389 else (841 / 108) * t + 4 / 29
    X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    fx, fy, fz = f(X), f(Y), f(Z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def de76(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(lab(a), lab(b))))


ROLES = ["text", "textMuted", "primary", "secondary", "info", "success", "warning", "error",
         "border", "borderActive", "diffAdded", "diffRemoved",
         "markdownHeading", "markdownLink", "markdownCode", "markdownEmph",
         "markdownStrong", "markdownBlockQuote",
         "syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxType",
         "syntaxNumber", "syntaxString", "syntaxOperator"]

print("═══ 反例 1：设计角色两两 ΔE76（审计器只管核心 5 个，其余没人管） ═══")
pairs = []
for a, b in itertools.combinations(ROLES, 2):
    d = de76(C[a], C[b])
    pairs.append((d, a, b))
pairs.sort()
for d, a, b in pairs[:10]:
    print(f"  ΔE {d:5.1f}  {a:20s} × {b:20s}  {C[a]} / {C[b]}")

print("\n═══ 反例 2：文字层级方向（加重必须比正文更重） ═══")
for k in ["markdownStrong", "text", "textMuted", "markdownBlockQuote"]:
    print(f"  {k:20s} {C[k]}  L={lum(C[k]):.4f}  H={hue(C[k]):5.1f}")
print(f"  → strong({lum(C['markdownStrong']):.4f}) 应 < text({lum(C['text']):.4f})，"
      f"现在 {'成立' if lum(C['markdownStrong']) < lum(C['text']) else '❌ 倒置'}")

print("\n═══ 反例 3：同一锚点被多个角色占用（借物叙事是否成立） ═══")
by_anchor = {}
for slot in ROLES:
    for k, (w, hexv, name, f) in PR[slot]["recipe"].items():
        by_anchor.setdefault(k, []).append((slot, w))
for k, lst in sorted(by_anchor.items(), key=lambda x: -len(x[1])):
    if len(lst) > 1:
        names = {PR[s]["recipe"][k][2] for s, _ in lst}
        print(f"  {k:14s} {A[k]['name']:12s} → {len(lst)} 个角色 {lst}")
        if len(names) > 1:
            print(f"      ⚠️ 这些角色声称了不同物件：{names}")

print("\n═══ 反例 4：焦点环/强边框的实际余量（引擎里它用得最广） ═══")
for s in ["background", "backgroundPanel", "backgroundElement"]:
    print(f"  borderActive@{s:18s} = {ratio(C['borderActive'], C[s]):.2f} : 1")
print("  引擎 map：border-l2/l3/l4 + ghost-active-border + scrollbar-hover-l1/l2 全部取 borderActive")

print("\n═══ 反例 5：secondary 的白字风险（引擎只对 primary 做 contrastText 保护） ═══")
print(f"  secondary {C['secondary']} 上放白字 = {ratio('#F4F4F5', C['secondary']):.2f} : 1"
      f"（引擎 map：secondary → state-idle-primary，是状态色不是填充色，暂无此用法）")

print("\n═══ 反例 6：浅底里'浮起/凹陷'的方向是否与仓库其他浅色主题一致 ═══")
lad = ["inputBg", "bubbleBg", "background", "backgroundPanel", "sidebarBg",
       "codeBlockBg", "backgroundElement", "codeHeaderBg"]
for k in lad:
    print(f"  {k:20s} {C[k]}  L={lum(C[k]):.4f}  H={hue(C[k]):5.1f}")
print(f"  表面色相跨度 {max(hue(C[k]) for k in lad) - min(hue(C[k]) for k in lad):.1f}°")
print(f"  最亮-最暗 L 跨度 {lum(C[lad[0]]) - lum(C[lad[-1]]):.3f}（压缩到 {lum(C[lad[-1]])/lum(C[lad[0]]):.0%}）")
