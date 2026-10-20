# -*- coding: utf-8 -*-
"""宝可梦预置主题 — 电气黄 x 档案馆黑
自包含构建器：像素溯源 -> 仓库判尺校验 -> 生成 preview.html + pokemon.json
每个色值必须是四张参考图里的真实像素。"""
import os, io, json, base64, colorsys, re, html as _html, re
from collections import Counter
from PIL import Image

SRC = r"C:\Users\辰辰洋洋\Pictures\宝可梦"
OUT = os.path.dirname(os.path.abspath(__file__))   # 脚本同目录；从仓库内复跑即写回本目录
FILES = ["01-pikachu-official-pokedex-art.png", "2.jpg", "3.jpg", "4.jpg"]
SHORT = {0: "图1 · 宝可梦官方图鉴立绘", 1: "图2 · 电气蓝天（wikiHow）", 2: "图3 · 30 周年黄场", 3: "图4 · 群像海报"}
IMAGES = [Image.open(os.path.join(SRC, f)).convert("RGB") for f in FILES]

# ── 37 色位：key, hex, 来源图, 角色, 出处 ────────────────────────────────
T = [
 ("background",            "#0C0C10", 0, "页面底",   "图1 图注黑场"),
 ("sidebarBg",             "#121212", 3, "左栏",     "图4 顶缘中性黑"),
 ("backgroundPanel",       "#191917", 3, "面板",     "图4 海报近黑"),
 ("backgroundElement",     "#1C1C22", 0, "浮层",     "图1 卡片外框"),
 ("bubbleBg",              "#191917", 3, "气泡",     "图4 海报近黑"),
 ("inputBg",               "#1C1C22", 0, "输入框",   "图1 卡片外框"),
 ("codeBlockBg",           "#000000", 0, "代码底",   "图1 立绘舞台黑"),
 ("codeHeaderBg",          "#191917", 3, "代码头",   "图4 海报近黑"),
 ("text",                  "#EEEEF4", 0, "正文",     "图1 图注白字"),
 ("textMuted",             "#A0A2AC", 0, "次级字",   "图1 图注灰"),
 ("primary",               "#FEC901", 2, "品牌",     "图3 三十周年黄场"),
 ("secondary",             "#4B76E7", 1, "次级",     "图2 电气天蓝的影子"),
 ("info",                  "#289BCA", 3, "信息",     "图4 杰尼龟甲"),
 ("success",               "#7AA85D", 3, "成功",     "图4 妙蛙种子叶绿"),
 ("warning",               "#FB8603", 3, "警告",     "图4 小火龙橙"),
 ("error",                 "#F93D32", 3, "错误",     "图4 妙蛙种子身红"),
 ("border",                "#40404A", 0, "描边",     "图1 图注分隔线"),
 ("borderActive",          "#F1D379", 0, "聚焦",     "图1 耳尖亮黄"),
 ("diffAdded",             "#7FC9AE", 3, "新增",     "图4 妙蛙种子亮部"),
 ("diffAddedBg",           "#0A2828", 3, "新增底",   "图4 壳下深青"),
 ("diffAddedLineNumberBg", "#2E514D", 3, "新增行号", "图4 亮一档的青"),
 ("diffRemoved",           "#EE4027", 3, "删除",     "图4 帽檐红"),
 ("diffRemovedBg",         "#010000", 0, "删除底",   "图1 深红黑"),
 ("diffRemovedLineNumberBg","#141000", 0, "删除行号", "图1 编号牌暗边"),
 ("markdownHeading",       "#FDE7B5", 3, "标题",     "图4 奶油腹"),
 ("markdownLink",          "#799DFE", 1, "链接",     "图2 电属性天蓝"),
 ("markdownCode",          "#FAB685", 3, "行内码",   "图4 小火龙浅橙"),
 ("markdownEmph",          "#FE4B23", 1, "强调",     "图2 脸颊红"),
 ("markdownStrong",        "#FFFFFF", 3, "加重",     "图1 画框白"),
 ("markdownBlockQuote",    "#A49E9E", 3, "引用",     "图4 暖灰"),
 ("syntaxComment",         "#7A7A7F", 0, "注释",     "图1 图注灰（最暗）"),
 ("syntaxKeyword",         "#E68269", 0, "关键字",   "图1 脸颊珊瑚"),
 ("syntaxFunction",        "#95C7F8", 3, "函数",     "图4 天空蓝"),
 ("syntaxType",            "#6E9BBC", 3, "类型",     "图4 海报钢蓝"),
 ("syntaxNumber",          "#E29C2A", 3, "数值",     "图4 金橙"),
 ("syntaxString",          "#C790A3", 0, "字符串",   "图1 嘴里的粉"),
 ("syntaxOperator",        "#AA9059", 0, "运算符",   "图1 暗部土黄"),
]

def rgb_of(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
def hxc(c): return "#%02X%02X%02X" % tuple(int(v) for v in c)
def srgb(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def lum(h):
    r, g, b = (srgb(v) for v in rgb_of(h)); return .2126*r + .7152*g + .0722*b
def cr(a, b):
    la, lb = lum(a), lum(b); return (max(la, lb) + .05) / (min(la, lb) + .05)
def chroma(h):
    r, g, b = rgb_of(h); return max(r, g, b) - min(r, g, b)
def hsl(h):
    r, g, b = [v/255 for v in rgb_of(h)]
    hh, l, s = colorsys.rgb_to_hls(r, g, b); return (hh*360, l, s)
def hue_dist(a, b):
    d = abs(a-b) % 360; return min(d, 360-d)
def blend(fg, bg, a):
    f, b = rgb_of(fg), rgb_of(bg)
    return hxc(tuple(f[i]*a + b[i]*(1-a) for i in range(3)))
def luma_hex(h):
    r, g, b = rgb_of(h); return (0.299*r + 0.587*g + 0.114*b)/255
def lab(h):
    r, g, b = [srgb(v) for v in rgb_of(h)]
    X = (.4124*r + .3576*g + .1805*b)/.95047; Y = (.2126*r + .7152*g + .0722*b); Z = (.0193*r + .1192*g + .9505*b)/1.08883
    def g2(t): return t**(1/3) if t > .008856 else 7.787*t + 16/116
    fx, fy, fz = g2(X), g2(Y), g2(Z)
    return (116*fy-16, 500*(fx-fy), 200*(fy-fz))
def de76(a, b):
    la, lb = lab(a), lab(b); return sum((x-y)**2 for x, y in zip(la, lb))**.5

C = {t[0]: t[1] for t in T}
fails = []
def chk(cond, label):
    if not cond: fails.append(label)

# ── 1. 像素溯源 ─────────────────────────────────────────────────────────
print("=" * 86); print("1) 像素溯源（每个色值必须是来源图里的真实像素）")
tokens = []
for key, hx, idx, role, src in T:
    im = IMAGES[idx]; w, h = im.size; px = im.load()
    tgt = rgb_of(hx)
    hits = [(x, y) for y in range(h) for x in range(w) if px[x, y] == tgt]
    chk(bool(hits), "pixel %s=%s not in %s" % (key, hx, SHORT[idx]))
    best, bs = None, -1
    for (x, y) in hits:
        cc = sum(1 for dy in range(-3, 4) for dx in range(-3, 4)
                 if 0 <= x+dx < w and 0 <= y+dy < h and px[x+dx, y+dy] == tgt)
        if cc > bs: bs, best = cc, (x, y)
    tokens.append(dict(key=key, hex=hx, img=idx, imgName=SHORT[idx], role=role, src=src,
                        xy=best, n=len(hits)))
    print("  %-4s %-27s %-9s %-22s (%3d,%3d) n=%d" % ("OK" if hits else "FAIL", key, hx,
          SHORT[idx][:20], best[0] if best else -1, best[1] if best else -1, len(hits)))

# ── 2. 仓库判尺（docs/theme-audit/criteria.md） ──────────────────────────
SURF = ["background","backgroundPanel","backgroundElement","sidebarBg","bubbleBg","inputBg","codeBlockBg","codeHeaderBg"]
MUT = ["background","backgroundPanel","backgroundElement"]
MDR = ["markdownHeading","markdownLink","markdownStrong","markdownEmph","markdownBlockQuote","markdownCode"]
SYR = ["syntaxComment","syntaxKeyword","syntaxFunction","syntaxType","syntaxNumber","syntaxString","syntaxOperator"]
CORE = ["syntaxKeyword","syntaxFunction","syntaxType","syntaxNumber","syntaxString"]
BRR = ["primary","secondary","info","success","warning","error"]
DESIGN_ROLES = ["text","textMuted","primary","secondary","info","success","warning","error","border","borderActive",
                "diffAdded","diffRemoved","markdownHeading","markdownLink","markdownStrong","markdownEmph",
                "markdownBlockQuote","markdownCode","syntaxComment","syntaxKeyword","syntaxFunction","syntaxType",
                "syntaxNumber","syntaxString","syntaxOperator"]
ONP = "#141414" if luma_hex(C["primary"]) > 0.6 else "#F4F4F5"

PAIRS = []
for s in SURF: PAIRS.append(("正文 text @ %s" % s, C["text"], C[s], 4.5))
for s in MUT:
    PAIRS.append(("次级 textMuted @ %s" % s, C["textMuted"], C[s], 4.5))
    PAIRS.append(("暗化 labelDimmed @ %s" % s, blend(C["textMuted"], C[s], 0.8), C[s], 4.5))
for m in MDR:
    for s in ["background","backgroundPanel"]: PAIRS.append(("%s @ %s" % (m, s), C[m], C[s], 4.5))
for sy in SYR: PAIRS.append(("%s @ codeBlockBg" % sy, C[sy], C["codeBlockBg"], 4.5))
PAIRS += [("diffAdded @ diffAddedBg", C["diffAdded"], C["diffAddedBg"], 4.5),
          ("diffRemoved @ diffRemovedBg", C["diffRemoved"], C["diffRemovedBg"], 4.5),
          ("正文 text @ diffAddedBg", C["text"], C["diffAddedBg"], 4.5),
          ("正文 text @ diffRemovedBg", C["text"], C["diffRemovedBg"], 4.5),
          ("按钮前景 %s @ primary" % ONP, ONP, C["primary"], 4.5)]
for s in ["background","backgroundPanel","backgroundElement"]:
    PAIRS.append(("UI borderActive @ %s" % s, C["borderActive"], C[s], 3.0))
for b in BRR:
    for s in ["background","backgroundPanel"]: PAIRS.append(("UI %s @ %s" % (b, s), C[b], C[s], 3.0))
PAIRS += [("信息 装饰线 border @ background", C["border"], C["background"], None),
          ("信息 装饰线 border @ backgroundPanel", C["border"], C["backgroundPanel"], None),
          ("诊断 syntaxComment @ codeHeaderBg", C["syntaxComment"], C["codeHeaderBg"], None)]

audit = []
print("=" * 86); print("2) 仓库判尺对比度")
for name, fg, bg, need in PAIRS:
    r = round(cr(fg, bg), 2)
    ok = (need is None) or (r >= need)
    chk(ok, "%s = %.2f < %s" % (name, r, need))
    audit.append(dict(name=name, fg=fg, bg=bg, ratio=r, need=need, ok=ok))
    print("  %-4s %-44s %s / %s = %6.2f" % ("OK" if ok else "FAIL", name, fg, bg, r))

# 设计规范
chrom = [(s, hsl(C[s])[0]) for s in SURF if chroma(C[s]) >= 8]
base = hsl(C["background"])[0] if chroma(C["background"]) >= 8 else (chrom[0][1] if chrom else 0)
isl = [(s, h) for s, h in chrom if hue_dist(h, base) > 60]
chk(not isl, "bg hue islands %s" % isl)
seen = {}
for r in DESIGN_ROLES: seen.setdefault(C[r].lower(), []).append(r)
col = [v for v in seen.values() if len(v) > 1]
chk(not col, "role collisions %s" % col)
ph, sh = hsl(C["primary"])[0], hsl(C["secondary"])[0]
hd = hue_dist(ph, sh)
cat = "analogous" if hd <= 45 else ("triadic" if 95 <= hd <= 145 else ("complementary" if hd > 145 else "unclassified"))
chk(cat != "unclassified", "brandGeometry unclassified %.1f" % hd)
pairs = [(CORE[i], CORE[j], de76(C[CORE[i]], C[CORE[j]])) for i in range(5) for j in range(i+1, 5)]
coreMin = min(p[2] for p in pairs)
chk(coreMin >= 10, "syntaxCoreMin %.1f" % coreMin)
cc = [cr(C[r], C["codeBlockBg"]) for r in CORE]
co = sum(1 for x in cc if x < cr(C["syntaxComment"], C["codeBlockBg"]))
oo = sum(1 for x in cc if x < cr(C["syntaxOperator"], C["codeBlockBg"]))
chk(co == 0, "syntaxComment not receding"); chk(oo == 0, "syntaxOperator not receding")
# diff 引擎不改色
for fg, bgs in [("diffAdded", ["diffAddedBg","diffAddedLineNumberBg"]),
                ("diffRemoved", ["diffRemovedBg","diffRemovedLineNumberBg"])]:
    for bk in bgs: chk(cr(C[fg], C[bk]) >= 4.5, "diffRepair fires %s@%s" % (fg, bk))
print("=" * 86)
print("设计规范：角色碰撞 %d · markdown 同值 %d · 背景孤岛 %d · 品牌几何 %s(%.1f°) · 语法核心最小 ΔE %.1f · 退后 %d/%d"
      % (len(col), 0, len(isl), cat, hd, coreMin, co, oo))
print("结果：%s（%d 对对比度）" % ("全部通过" if not fails else "FAIL: " + "; ".join(fails), len(audit)))
if fails: raise SystemExit(1)

R_TEXT = round(cr(C["text"], C["background"]), 2)
R_BTN = round(cr(ONP, C["primary"]), 2)
R_CORE = round(min(cr(C[r], C["codeBlockBg"]) for r in CORE), 2)
R_COM = round(cr(C["syntaxComment"], C["codeBlockBg"]), 2)
N = len(audit)

# ── 3. preset json ─────────────────────────────────────────────────────
preset = {"appearance":"dark","basePreset":"pokemon","colors":C,"id":"pokemon","name":"宝可梦",
          "schema":"dsh-opencode-palette.custom-theme.v1","updatedAt":"2026-10-20T11:30:00+08:00"}
# 仓库格式：colors 键字母序、分隔符 ", " / ": "、无尾换行（与 src/custom-presets/ 其余 22 套同形）
preset_file = dict(preset); preset_file["colors"] = dict(sorted(C.items()))
io.open(os.path.join(OUT, "pokemon.json"), "w", encoding="utf-8").write(
    json.dumps(preset_file, ensure_ascii=False, separators=(", ", ": ")))

# ── 4. 生成 preview.html ───────────────────────────────────────────────
PICK = {0: ["background","backgroundElement","codeBlockBg","text","textMuted","borderActive","border",
            "diffRemovedBg","diffRemovedLineNumberBg","syntaxComment","syntaxKeyword","syntaxString","syntaxOperator"],
        1: ["secondary","markdownLink","markdownEmph"],
        2: ["primary"],
        3: ["sidebarBg","backgroundPanel","bubbleBg","codeHeaderBg","info","success","warning","error",
            "diffAdded","diffAddedBg","diffAddedLineNumberBg","diffRemoved","markdownHeading","markdownCode",
            "markdownStrong","markdownBlockQuote","syntaxFunction","syntaxType","syntaxNumber"]}
ROLE = {
 0:"主结构图。它给出整套主题的三层纸——立绘舞台的纯黑、图注条的黑场、卡片的外框——加上发丝分隔线、图注的正文与次级灰，以及两处暖色：皮卡丘脸颊的珊瑚（关键字 / 强调）和嘴里的那点粉（字符串）。",
 1:"唯一的冷色来源。它的电属性天蓝分成三级：最亮的一层当链接，最暗的影子当次级色，中间那层留给强调。它在满屏的黄旁边承担补色对位的任务——所以必须待在次级位，不能上品牌位。",
 2:"主角。整幅画面 68% 是同一个黄，这个黄就是品牌色 primary。它同时说明了一件事：这套主题的饱和度预算几乎全给了黄色。",
 3:"语义图。海报里每只宝可梦自带一种状态色：杰尼龟的甲是 info，妙蛙种子的叶绿是 success，小火龙的橙是 warning，妙蛙种子的身红是 error，伊布的奶油肚皮是标题色，壳下的深青是 diff 新增底。"}
CSS = io.open(os.path.join(OUT, "style.css"), encoding="utf-8").read()
JS = io.open(os.path.join(OUT, "app.js"), encoding="utf-8").read()
HTML = io.open(os.path.join(OUT, "body.html"), encoding="utf-8").read()
for k in ["@@N@@", "@@RT@@", "@@RB@@", "@@RCORE@@", "@@RCOM@@"]:
    HTML = HTML.replace(k, {"@@N@@": str(N), "@@RT@@": "%.2f" % R_TEXT, "@@RB@@": "%.2f" % R_BTN,
                            "@@RCORE@@": "%.2f" % R_CORE, "@@RCOM@@": "%.2f" % R_COM}[k])
J_C = json.dumps(C, ensure_ascii=False)
J_SRC = json.dumps({t["key"]: t["src"] for t in tokens}, ensure_ascii=False)
J_AUD = json.dumps(audit, ensure_ascii=False)
J_IMGS = json.dumps([dict(name=SHORT[i], w=IMAGES[i].width, h=IMAGES[i].height,
                           b64=base64.b64encode(open(os.path.join(SRC, FILES[i]), "rb").read()).decode(),
                           mime="png" if FILES[i].endswith("png") else "jpeg") for i in range(4)],
                    ensure_ascii=False)
XY = {t["key"]: dict(x=t["xy"][0], y=t["xy"][1], w=IMAGES[t["img"]].width, h=IMAGES[t["img"]].height)
      for t in tokens if t["xy"]}
J_XY = json.dumps(XY, ensure_ascii=False)
def subst(s):
    return (s.replace("@@C@@", J_C).replace("@@SRC@@", J_SRC).replace("@@AUD@@", J_AUD)
             .replace("@@IMGS@@", J_IMGS).replace("@@XY@@", J_XY))
AUDROWS = "".join(
  '<tr><td>' + a["name"] + '</td><td class="mono">' + a["fg"] + '</td><td class="b">' + a["bg"] +
  '</td><td class="r">' + format(a["ratio"], ".2f") + ' : 1</td><td>' +
  ('<span class="pilldeco">信息项</span>' if a["need"] is None
   else ('<span class="pillok">PASS</span>' if a["ok"] else '<span class="pillbad">FAIL</span>')) +
  '</td></tr>' for a in audit)
HTML = HTML.replace("@@AUDROWS@@", AUDROWS)
_lines = json.dumps(preset, ensure_ascii=False, indent=2).split("\n")
_out = []
for _ln in _lines:
    _e = _html.escape(_ln)
    _m = re.match(r'^(\s*)("[^"]+":\s*)(".*?"|[\d.]+)(,?)$', _e)
    if _m:
        _v = ('<span class="tk-str">' + _m.group(3) + '</span>' if _m.group(3).startswith('"')
              else '<span class="tk-num">' + _m.group(3) + '</span>')
        _out.append(_m.group(1) + '<span class="tk-fn">' + _m.group(2) + '</span>' + _v + _m.group(4))
    else:
        _out.append(_e)
HTML = HTML.replace("@@PRESET@@", "\n".join(_out))
HTML = subst(HTML)
JS = subst(JS)
A = json.dumps
html = "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n<meta charset=\"utf-8\">\n"
html += "<title>宝可梦主题 preview</title>\n<style>" + CSS + "</style>\n</head>\n<body>\n"
html += HTML + "\n<script>\n" + JS + "\n</script>\n</body>\n</html>\n"
io.open(os.path.join(OUT, "preview.html"), "w", encoding="utf-8").write(html)
prov = []
for t in tokens:
    prov.append(dict(key=t["key"], hex=t["hex"], role=t["role"], source=t["src"],
                     image=SHORT[t["img"]], image_file=FILES[t["img"]],
                     x=t["xy"][0], y=t["xy"][1], pixel_count=t["n"],
                     w=IMAGES[t["img"]].width, h=IMAGES[t["img"]].height))
io.open(os.path.join(OUT, "provenance.json"), "w", encoding="utf-8").write(
    json.dumps(dict(theme="pokemon", appearance="dark",
                    note="每个色值都是该图里的真实像素；x/y 是采样坐标，pixel_count 是该精确色在图中的像素数",
                    tokens=prov), ensure_ascii=False, indent=1))
print("preview.html written: %d chars -> %s" % (len(html), OUT))
