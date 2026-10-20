# -*- coding: utf-8 -*-
"""终稿数字复算：v3 记录里的每一个数，都从 palette.json 现算，不手抄。"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cp_core import PKG, cr, deltaE76

pal = json.load(open(os.path.join(PKG, "palette.json"), encoding="utf-8"))
C = pal["colors"]
prov = pal["provenance"]
led = json.load(open(os.path.join(PKG, "anchors.json"), encoding="utf-8"))

print("=== 墨色阶梯（对页面底 %s）===" % C["background"])
order = [("标题", "markdownHeading"), ("粗体", "markdownStrong"), ("斜体", "markdownEmph"),
         ("行内码", "markdownCode"), ("链接", "markdownLink"), ("正文", "text"),
         ("次要", "textMuted"), ("引用", "markdownBlockQuote")]
for cn, k in order:
    print("  %-5s %-20s %s  %.2f:1" % (cn, k, C[k], cr(C[k], C["background"])))

print("=== 关键比值 ===")
for k, bg in [("syntaxComment", "codeBlockBg"), ("syntaxOperator", "codeBlockBg"),
              ("syntaxType", "codeBlockBg"), ("syntaxKeyword", "codeBlockBg"),
              ("syntaxFunction", "codeBlockBg"), ("syntaxNumber", "codeBlockBg"),
              ("syntaxString", "codeBlockBg"), ("text", "background"),
              ("textMuted", "background"), ("secondary", "backgroundPanel"),
              ("error", "backgroundPanel"), ("primary", "primary")]:
    print("  %-20s on %-16s %s  %.2f:1" % (k, bg, C[k], cr(C[k], C[bg])))

CORE = ["syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString"]
def mind(keyset):
    best = None
    for i in range(len(keyset)):
        for j in range(i + 1, len(keyset)):
            d = deltaE76(C[keyset[i]], C[keyset[j]])
            if best is None or d < best[0]:
                best = (d, keyset[i], keyset[j])
    return best
print("=== 分离度 ===")
print("  核心五最小 ΔE76 = %.1f (%s ↔ %s)" % mind(CORE))
for a, b in [("syntaxComment", "syntaxOperator"), ("syntaxType", "syntaxOperator"),
             ("syntaxType", "syntaxComment"), ("syntaxType", "markdownBlockQuote")]:
    print("  %-22s ↔ %-22s ΔE76 %.1f" % (a, b, deltaE76(C[a], C[b])))

print("=== 证据（字面像素全库出现次数）===")
A, B = [], []
for r in led:
    if r["rule"] != "直采":
        continue
    n = max(s["corpus"] for s in r["srcs"])
    (A if n >= 50 else B).append((r["slot"], n, r["hex"]))
print("  A 档（≥50 px）%d 槽：" % len(A))
for s, n, h in sorted(A, key=lambda t: -t[1]): print("     %-24s %5d px  %s" % (s, n, h))
print("  B 档（1–49 px）%d 槽：" % len(B))
for s, n, h in sorted(B, key=lambda t: -t[1]): print("     %-24s %5d px  %s" % (s, n, h))

print("=== 规则分布 ===")
from collections import Counter
print("  " + str(Counter(r["rule"] for r in led)))
print("  背景槽色相：")
import colorsys
for k in ["codeBlockBg", "codeHeaderBg", "background", "sidebarBg", "backgroundPanel",
          "inputBg", "bubbleBg", "backgroundElement"]:
    r_, g_, b_ = [int(C[k][i:i+2], 16) / 255 for i in (1, 3, 5)]
    h_, l_, s_ = colorsys.rgb_to_hls(r_, g_, b_)
    print("     %-20s %s  H %5.1f  L %.3f  S %.3f" % (k, C[k], h_ * 360, l_, s_))
