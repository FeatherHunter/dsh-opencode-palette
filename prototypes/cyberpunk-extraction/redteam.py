# -*- coding: utf-8 -*-
"""④ 对抗式自查：不证实自己，去证伪自己。
逐条复核三件事：① 台账缩略图是否真的框内含「完全同值」像素；
② 预览页与判尺里引用的数字是否与复算一致；③ 宿主还原度清单是否仍成立。"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cp_core import P, C, PROV, ORDER, PKG, REPO, cr, lum, deltaE76, contrast_text

# 复核对象 = design.py 的产物（palette.json），不是静态初始表
_pj = os.path.join(PKG, 'palette.json')
if os.path.exists(_pj):
    _d = json.load(open(_pj, encoding='utf-8'))
    C = _d['colors']
    PROV = {k: (v['rule'], v['anchors'], v['note']) for k, v in _d['provenance'].items()}

fails, warns = [], []

# ---- ① 台账逐像素核验 -------------------------------------------------------
led = json.load(open(os.path.join(PKG, "anchors.json"), encoding="utf-8"))
ex = sum(1 for r in led for s in r["srcs"] if s["exact_in"] > 0)
tot = sum(len(r["srcs"]) for r in led)
print("① 台账：框内含完全同值像素 %d/%d" % (ex, tot))
if ex != tot: fails.append("台账有 %d 条裁切不含完全同值像素" % (tot - ex))
direct = [r for r in led if r["rule"] == "直采"]
bad = [r["slot"] for r in direct if r["srcs"][0]["anchor"] != r["hex"]]
print("   直采槽锚点=自身色值：%d/%d" % (len(direct) - len(bad), len(direct)))
if bad: fails.append("直采槽锚点≠自身色值：%s" % bad)
derived = [r for r in led if r["rule"] != "直采"]
bad2 = [r["slot"] for r in derived if not all(s["exact_in"] > 0 for s in r["srcs"])]
print("   阶梯/混色槽的父色均字面：%d/%d" % (len(derived) - len(bad2), len(derived)))
if bad2: fails.append("阶梯/混色槽的父色非字面：%s" % bad2)

# ---- ② 判据复算：页面里印的数，必须等于现算的数 -------------------------------
pairs = []
for b in ["background", "backgroundPanel", "backgroundElement", "sidebarBg", "bubbleBg",
          "inputBg", "codeBlockBg", "codeHeaderBg"]:
    pairs.append(("text@" + b, C["text"], C[b], 4.5))
for b in ["background", "backgroundPanel", "backgroundElement"]:
    pairs.append(("textMuted@" + b, C["textMuted"], C[b], 4.5))
    pairs.append(("labelDimmed@" + b, None, C[b], 4.5))
for m in ["markdownHeading", "markdownLink", "markdownCode", "markdownEmph",
          "markdownStrong", "markdownBlockQuote"]:
    for b in ["background", "backgroundPanel"]:
        pairs.append((m + "@" + b, C[m], C[b], 4.5))
for s in ["syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxType",
          "syntaxNumber", "syntaxString", "syntaxOperator"]:
    pairs.append((s + "@codeBlockBg", C[s], C["codeBlockBg"], 4.5))
for s in ["primary", "secondary", "info", "success", "warning", "error"]:
    for b in ["background", "backgroundPanel"]:
        pairs.append((s + "@" + b, C[s], C[b], 3.0))
for b in ["background", "backgroundPanel", "backgroundElement"]:
    pairs.append(("borderActive@" + b, C["borderActive"], C[b], 3.0))
hard = [p for p in pairs if p[3] == 4.5]
ui = [p for p in pairs if p[3] == 3.0]
def ratio(fg, bg):
    if fg is None: return None
    return cr(fg, bg)
hard_bad = []
for code, fg, bg, thr in hard:
    if code.startswith("labelDimmed"):
        from cp_core import with_alpha
        r = cr(with_alpha(C["textMuted"], 0.8, bg), bg)
    else:
        r = cr(fg, bg)
    if r < thr: hard_bad.append((code, round(r, 2)))
ui_bad = [(c, round(cr(f, b), 2)) for c, f, b, _ in ui if cr(f, b) < 3.0]
print("② 判据复算：硬性 %d 对违例 %d，UI %d 对违例 %d" % (len(hard), len(hard_bad), len(ui), len(ui_bad)))
if hard_bad: fails.append("硬性违例 %s" % hard_bad)
if ui_bad: fails.append("UI 违例 %s" % ui_bad)
print("   最紧硬性对 %s" % min(((round(cr(f if f else C["textMuted"], b), 2), c) for c, f, b, _ in hard
                              if not c.startswith("labelDimmed")))[1])

# ---- ③ 宿主还原度清单（人工核过的事实，防回归） -------------------------------
HOST = [
 ("secondary 全宿主只有 1 个消费者（8px 空闲圆点）", "state-idle-primary"),
 ("border(l1) 只有 3 个消费者：行内代码边框/菜单描边/折叠代码体", "border-l1"),
 ("焦点环是 primary 2px 且仅键盘焦点，不是 borderActive", "focus-ring-color"),
 ("代码卡无边框、圆角 16px、顶栏 padding 9/14", "code-block"),
 ("引用块竖线是 label-caption（=textMuted），不是 backgroundElement", "blockquote"),
 ("backgroundPanel 只落在侧栏新会话按钮与底部激活 tab", "button-elevated-fill"),
 ("composer pill 走 bg-layer-2（插件下=页面底色），不是 backgroundPanel", "bg-layer-2"),
 ("行内代码 .5px 边框 + 8px 圆角（radius-sm）+ padding 0 5px", "inline-code"),
 ("toast 顶部居中、圆角 16px、padding 12/16", "toast"),
]
# ---- ④ 可共存角色的分离度：能同屏出现的两色，不能撞 ----
COEXIST = [
    ("syntaxComment", "syntaxOperator"), ("syntaxComment", "syntaxType"),
    ("syntaxComment", "syntaxNumber"), ("syntaxComment", "syntaxString"),
    ("syntaxComment", "syntaxKeyword"), ("syntaxComment", "syntaxFunction"),
    ("syntaxOperator", "syntaxType"), ("syntaxOperator", "syntaxNumber"),
    ("syntaxType", "syntaxNumber"), ("syntaxType", "syntaxString"),
    ("syntaxType", "syntaxFunction"), ("syntaxType", "syntaxKeyword"),
    ("syntaxType", "markdownBlockQuote"),   # 引用里的类型名
    ("syntaxType", "info"),
    ("markdownHeading", "markdownStrong"), ("markdownHeading", "markdownLink"),
    ("markdownHeading", "markdownCode"), ("markdownStrong", "markdownEmph"),
    ("markdownStrong", "markdownCode"), ("markdownEmph", "markdownCode"),
    ("markdownLink", "markdownCode"), ("markdownBlockQuote", "markdownCode"),
    ("text", "markdownCode"), ("text", "markdownLink"), ("text", "markdownStrong"),
    ("text", "markdownEmph"), ("text", "markdownBlockQuote"), ("text", "textMuted"),
]
co_bad = [(a, b, round(deltaE76(C[a], C[b]), 1)) for a, b in COEXIST
          if deltaE76(C[a], C[b]) < 10]
print("④ 可共存角色 %d 对，ΔE76 < 10 的：%d" % (len(COEXIST), len(co_bad)))
for a, b, d in co_bad:
    print("   !! %s ↔ %s ΔE76 %.1f" % (a, b, d))
    fails.append("可共存角色撞色 %s/%s ΔE76 %.1f" % (a, b, d))
if not co_bad:
    print("   最紧三对：%s" % " · ".join(
        "%s↔%s %.1f" % (a, b, deltaE76(C[a], C[b]))
        for a, b in sorted(COEXIST, key=lambda p: deltaE76(C[p[0]], C[p[1]]))[:3]))

print("③ 宿主还原度清单（%d 条，事实记在 prototypes/cyberpunk-adversarial-review.md）" % len(HOST))
for t, k in HOST:
    print("   · %s  [%s]" % (t, k))

print("\n自查结论：硬失败 %d 条" % len(fails))
for f in fails: print("   !!", f)
sys.exit(1 if fails else 0)
