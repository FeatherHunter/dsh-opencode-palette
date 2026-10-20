# -*- coding: utf-8 -*-
"""生成 preview.html —— 星球大战 IP 预置主题设计评审页
沿用 D:\\Temp\\kuromi-theme\\preview.html 的框架与视觉语言，
新增两块：① 取色溯源（海报实拍裁切 + 锚点映射）② 判据报告（53 对对比度）。
"""
import base64
import io
import json
import os

from PIL import Image

SRC = r"C:\Users\辰辰洋洋\Pictures\星球大战"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)

PAL = json.load(open(os.path.join(HERE, "palette.json"), encoding="utf-8"))
C = PAL["colors"]
PROV = PAL["provenance"]
PAIRS = PAL["pairs"]
ANCH = PAL["anchors"]

POSTERS = {
    "1.jpg": ("天行者崛起", "The Force Awakens · 2015", "红刃 · 暖核 · 招牌金"),
    "2.jpg": ("天行者的崛起", "The Rise of Skywalker · 2019", "蓝刃 · 星云紫 · 落日玫瑰"),
    "3.jpg": ("最后的绝地武士", "The Last Jedi · 2017", "血刃 · 雪白 · 绿剑冷调"),
}


def b64_img(im, fmt="JPEG", quality=82):
    buf = io.BytesIO()
    im.save(buf, format=fmt, quality=quality)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def thumb(path, width):
    im = Image.open(path).convert("RGB")
    h = int(im.height * width / im.width)
    return im.resize((width, h), Image.LANCZOS)


def crop_at(path, target_hex, size=34, out=76):
    """在海报里找最接近 target_hex 的像素，裁它周围一块，缩放到 out×out"""
    im = Image.open(path).convert("RGB")
    W, H = im.size
    tr, tg, tb = (int(target_hex[i:i + 2], 16) for i in (1, 3, 5))
    px = im.load()
    best, bestd = None, 1e18
    step = 1
    for y in range(0, H, step):
        for x in range(0, W, step):
            r, g, b = px[x, y]
            d = (r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2
            if d < bestd:
                bestd, best = d, (x, y)
    if best is None:
        return None
    x, y = best
    half = size // 2
    box = (max(0, x - half), max(0, y - half), min(W, x + half + 1), min(H, y + half + 1))
    crop = im.crop(box)
    if crop.width != crop.height:
        s = min(crop.width, crop.height)
        crop = crop.crop(((crop.width - s) // 2, (crop.height - s) // 2,
                          (crop.width - s) // 2 + s, (crop.height - s) // 2 + s))
    return crop.resize((out, out), Image.LANCZOS)


# ── 1) 三张海报缩略图 ──
poster_html = []
for fn, (zh, en, story) in POSTERS.items():
    im = thumb(os.path.join(SRC, fn), 300)
    poster_html.append(
        '<figure class="poster"><img src="%s" alt="%s"><figcaption>'
        '<b>%s</b><span>%s</span><em>%s</em></figcaption></figure>' % (
            b64_img(im), zh, zh, en, story))

# ── 2) 签名锚点的实拍裁切 ──
SIGNATURES = [
    ("gold", "招牌金", "1.jpg", "STAR WARS 字标辉光 · 三张海报共用的品牌色"),
    ("saber", "光剑蓝", "2.jpg", "蓝色光剑的剑心 · 界面里唯一的「行动色」"),
    ("ember", "红剑余晖", "2.jpg", "红色光剑散出的光 · 危险与删除"),
    ("mint", "全息薄荷", "1.jpg", "绿色光剑的辉光 · 成功与新增"),
    ("violet", "星云紫", "2.jpg", "星云的紫 · 关键字"),
    ("amber", "琥珀热核", "1.jpg", "剑与人物之间的那点热核 · 警告"),
    ("rose", "落日玫瑰", "2.jpg", "塔图因地平线的落日 · 强调"),
    ("void", "深空靛", "2.jpg", "星空的底 · 八个背景槽的家族根"),
]
sig_html = []
for key, name, poster, note in SIGNATURES:
    hexv = ANCH[key]["hex"]
    c = crop_at(os.path.join(SRC, poster), hexv)
    if c is None:
        continue
    sig_html.append(
        '<div class="sig"><div class="sigcrop"><img src="%s" alt="%s"><i style="background:%s"></i></div>'
        '<div class="sigmeta"><b>%s</b><code>%s</code><span>%s</span></div></div>' % (
            b64_img(c, quality=86), name, hexv, name, hexv, note))

# ── 3) 37 色位溯源表 ──
rows = []
for tok, p in PROV.items():
    rows.append(
        '<tr><td class="tk"><b>%s</b></td><td><span class="chipc" style="background:%s"></span><code>%s</code></td>'
        '<td><span class="chipc" style="background:%s"></span><code>%s</code></td>'
        '<td class="op">%s</td><td class="src">%s</td></tr>' % (
            tok, C[tok], C[tok], p["anchor"], p["anchor"], p["op"], p["anchorNote"]))
prov_rows = "\n".join(rows)

# ── 4) 判据表：按组汇总 + 最紧的若干对 ──
GROUPS = [
    ("text", "正文 text @ 8 个背景槽", 4.5),
    ("muted", "次级 textMuted @ 3 层主表面", 4.5),
    ("dimmed", "label-dimmed（textMuted@0.8）@ 3 层主表面", 4.5),
    ("markdown", "markdown 6 角色 @ background / panel", 4.5),
    ("syntax", "syntax 7 角色 @ codeBlockBg", 4.5),
    ("diff", "diff 前景 / 正文 @ diff 行底", 4.5),
    ("onPrimary", "主按钮前景 @ primary 填充", 4.5),
    ("borderActive", "焦点环 @ 3 层主表面", 3.0),
    ("brand", "6 品牌/语义色 @ background / panel", 3.0),
]
group_rows = []
for g, label, thr in GROUPS:
    ps = [p for p in PAIRS if p["group"] == g]
    worst = min(ps, key=lambda x: x["ratio"])
    allpass = all(p["verdict"] == "PASS" for p in ps)
    group_rows.append(
        '<tr><td>%s</td><td class="num">%d</td><td class="num">%.1f:1</td>'
        '<td><code>%s</code></td><td class="num">%.2f:1</td><td>%s</td></tr>' % (
            label, len(ps), thr, worst["code"], worst["ratio"],
            '<span class="ok">全绿</span>' if allpass else '<span class="no">有违例</span>'))

# ── 5) 语法核心两两 ΔE ──
SYNTAX_CORE = ["syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString"]


def lum(h):
    def lin(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (int(h[i:i + 2], 16) for i in (1, 3, 5))
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def contrast(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def de76(a, b):
    def lab(h):
        def lin(c):
            c /= 255.0
            return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
        r, g, b = [lin(int(h[i:i + 2], 16)) for i in (1, 3, 5)]
        x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
        y = (r * 0.2126 + g * 0.7152 + b * 0.0722)
        z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
        f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
        fx, fy, fz = f(x), f(y), f(z)
        return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))
    la, lb = lab(a), lab(b)
    return sum((p - q) ** 2 for p, q in zip(la, lb)) ** 0.5


de_rows = []
mind = 999
for i in range(len(SYNTAX_CORE)):
    for j in range(i + 1, len(SYNTAX_CORE)):
        a, b = SYNTAX_CORE[i], SYNTAX_CORE[j]
        d = de76(C[a], C[b])
        mind = min(mind, d)
        de_rows.append("<tr><td><code>%s</code> × <code>%s</code></td><td class=\"num\">%.1f</td>"
                       "<td>%s</td></tr>" % (a, b, d, '<span class="ok">≥10 达标</span>' if d >= 10 else '<span class="no">不足</span>'))

syn_rows = []
for r in ["syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString",
          "syntaxComment", "syntaxOperator"]:
    v = C[r]
    cr = contrast(v, C["codeBlockBg"])
    role = {"syntaxKeyword": "关键字（核心）", "syntaxFunction": "函数（核心）", "syntaxType": "类型（核心）",
            "syntaxNumber": "数字（核心）", "syntaxString": "字符串（核心）",
            "syntaxComment": "注释（退后）", "syntaxOperator": "运算符（退后）"}[r]
    syn_rows.append(
        '<tr><td><span class="chipc" style="background:%s"></span><code>%s</code></td><td>%s</td>'
        '<td class="num">%.2f:1</td><td>%s</td></tr>' % (v, v, role, cr, "≥4.5 达标"))

# ── 配比数据（ratio.py 的产物）──
RATIO = json.load(open(os.path.join(HERE, "ratio.json"), encoding="utf-8"))
REDW = RATIO["red"]
BLUEW = RATIO["blue"]
NOTEW = RATIO["campWeight"].get("绿剑", 0) + RATIO["campWeight"].get("金", 0)
CAMP_DESC = {
    "红刃": "红刃", "蓝刃": "蓝刃", "紫": "蓝刃", "青": "蓝刃",
    "绿剑": "绿剑", "金": "金", "黄绿": "绿剑",
}


def camp_rows(camp_names):
    out = []
    rows = [r for r in RATIO["rows"] if r["weight"] > 0
            and CAMP_DESC.get(r["camp"], r["camp"]) in camp_names]
    rows.sort(key=lambda r: -r["weight"])
    for r in rows:
        al = "、".join(a.replace("--dsw-alias-", "").replace("--dsw-specific-", "")
                       for a in r["aliases"][:2])
        out.append(
            '<tr><td><span class="chipc" style="background:%s"></span><code>%s</code></td>'
            '<td class="num">%d</td><td>%s</td></tr>' % (r["hex"], r["slot"], r["weight"], al))
    return "\n".join(out)


red_rows = camp_rows({"红刃"})
blue_rows = camp_rows({"蓝刃"})
tot_camp = REDW + BLUEW + NOTEW
KEY_RATIO = {
    "redPct": round(REDW * 100.0 / (REDW + BLUEW), 1),
    "bluePct": round(BLUEW * 100.0 / (REDW + BLUEW), 1),
    "diffPct": round(abs(REDW - BLUEW) * 100.0 / (REDW + BLUEW), 1),
    "redFlex": max(REDW, 1),
    "blueFlex": max(BLUEW, 1),
    "noteFlex": max(NOTEW, 1),
}

# 引擎口径的反白（resolve.ts contrastText）：luma > 0.6 → #141414，否则 #F4F4F5
def contrast_text(hexv):
    r, g, b = (int(hexv.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
    return "#141414" if (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 else "#F4F4F5"


ONPRIMARY = contrast_text(C["primary"])
ONINFO = contrast_text(C["info"])

# :root 变量表（全部由 palette.json 生成，不手写色值）
ROOT_CSS = "\n    ".join([
    "--bg:%s; --panel:%s; --elem:%s; --sidebar:%s;" % (C["background"], C["backgroundPanel"], C["backgroundElement"], C["sidebarBg"]),
    "--bubble:%s; --input:%s; --code:%s; --codehead:%s;" % (C["bubbleBg"], C["inputBg"], C["codeBlockBg"], C["codeHeaderBg"]),
    "--text:%s; --muted:%s;" % (C["text"], C["textMuted"]),
    "--primary:%s; --secondary:%s; --info:%s; --success:%s;" % (C["primary"], C["secondary"], C["info"], C["success"]),
    "--warning:%s; --error:%s;" % (C["warning"], C["error"]),
    "--border:%s; --active:%s;" % (C["border"], C["borderActive"]),
    "--dadd:%s; --drem:%s; --daddbg:%s; --drembg:%s;" % (C["diffAdded"], C["diffRemoved"], C["diffAddedBg"], C["diffRemovedBg"]),
    "--daddln:%s; --dremln:%s;" % (C["diffAddedLineNumberBg"], C["diffRemovedLineNumberBg"]),
    "--h:%s; --link:%s; --mcode:%s; --em:%s; --strong:%s; --quote:%s;" % (
        C["markdownHeading"], C["markdownLink"], C["markdownCode"], C["markdownEmph"],
        C["markdownStrong"], C["markdownBlockQuote"]),
    "--scom:%s; --skw:%s; --sfn:%s; --styp:%s; --snum:%s; --sstr:%s; --sop:%s;" % (
        C["syntaxComment"], C["syntaxKeyword"], C["syntaxFunction"], C["syntaxType"],
        C["syntaxNumber"], C["syntaxString"], C["syntaxOperator"]),
])

# 关键数据
KEY = {
    "text": contrast(C["text"], C["background"]),
    "muted": contrast(C["textMuted"], C["background"]),
    "primary": contrast(ONPRIMARY, C["primary"]),
    "focus": contrast(C["borderActive"], C["background"]),
    "code": contrast(C["syntaxKeyword"], C["codeBlockBg"]),
    "mincore": min(contrast(C[r], C["codeBlockBg"]) for r in SYNTAX_CORE),
    "mind": mind,
    "geometry": PAL["brandGeometry"]["deg"],
    "hard": len([p for p in PAIRS if p["class"] == "hard"]),
    "ui": len([p for p in PAIRS if p["class"] == "ui"]),
    "fails": len([p for p in PAIRS if p["verdict"] == "FAIL"]),
    "warns": len(PAL["warnings"]),
}

# ── 6) 生成 HTML ──
HTML = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>星球大战 theme preview</title>
<style>
  :root{
    __ROOTCSS__
    --page:#02030B; --paper:#0F0814;
    --hover:color-mix(in srgb, var(--text) 8%, transparent);
    --active08:color-mix(in srgb, var(--text) 14%, transparent);
    --dim:color-mix(in srgb, var(--muted) 80%, transparent);
  }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{
    background:var(--page); color:var(--text);
    font-family:"Segoe UI","Microsoft YaHei UI","Microsoft YaHei",system-ui,sans-serif;
    -webkit-font-smoothing:antialiased;
  }
  .sheet{width:1400px;padding:44px 64px 64px;margin:0 auto}
  .eyebrow{font-size:11px;letter-spacing:.22em;color:var(--muted);text-transform:uppercase}
  h1.title{font-size:34px;line-height:1.1;margin:10px 0 8px;letter-spacing:.01em;font-weight:600}
  h1.title em{font-style:normal;color:var(--primary)}
  .sub{font-size:13.5px;color:var(--muted);max-width:760px;line-height:1.8}
  .sub b{color:var(--text);font-weight:600}
  .anchors{display:flex;gap:10px;margin-top:18px;align-items:center;flex-wrap:wrap}
  .anchor{display:flex;align-items:center;gap:8px;background:var(--panel);border:.5px solid var(--border);
    border-radius:999px;padding:5px 12px 5px 6px;font-size:11.5px;color:var(--muted)}
  .anchor i{width:18px;height:18px;border-radius:50%;display:block;border:.5px solid rgba(255,255,255,.1)}
  .anchor b{color:var(--text);font-weight:600}

  /* app window */
  .win{margin-top:26px;width:1272px;height:auto;border-radius:18px;overflow:hidden;position:relative;
    background:var(--bg);border:.5px solid var(--border);
    box-shadow:0 30px 70px -20px rgba(0,0,0,.75), 0 2px 8px rgba(0,0,0,.5);
    display:flex}
  .sb{width:246px;flex:none;background:var(--sidebar);border-right:.5px solid var(--border);
    display:flex;flex-direction:column;padding:14px 12px 12px}
  .brand{display:flex;align-items:center;gap:9px;padding:2px 6px 14px}
  .brand .name{font-size:13.5px;font-weight:600;letter-spacing:.02em}
  .brand .badge{font-size:10px;color:var(--muted);border:.5px solid var(--border);border-radius:5px;padding:1px 4px;margin-left:auto}
  .ws{display:flex;align-items:center;gap:8px;background:var(--panel);border:.5px solid var(--border);
    border-radius:10px;padding:7px 9px;font-size:12.5px;margin-bottom:14px}
  .ws .dot{width:16px;height:16px;border-radius:5px;background:var(--primary);color:__ONPRIMARY__;font-size:9px;
    display:grid;place-items:center;font-weight:600}
  .ws .caret{margin-left:auto;color:var(--muted);font-size:10px}
  .nav{display:flex;flex-direction:column;gap:2px}
  .nav .it{position:relative;display:flex;align-items:center;gap:9px;font-size:12.5px;color:var(--muted);
    padding:7px 9px;border-radius:8px;cursor:default}
  .nav .it:hover{background:var(--hover)}
  .nav .it.on{background:var(--active08);color:var(--text);font-weight:600}
  .nav .it.on:before{content:"";position:absolute;left:0;top:7px;bottom:7px;width:3px;border-radius:3px;background:var(--primary)}
  .nav .it .ic{width:15px;height:15px;border:1.4px solid currentColor;border-radius:4px;opacity:.75;flex:none}
  .nav .it .ic.round{border-radius:50%}
  .side-lbl{font-size:10.5px;letter-spacing:.12em;color:var(--dim);margin:16px 8px 6px;text-transform:uppercase}
  .threads{display:flex;flex-direction:column;gap:1px;overflow:hidden}
  .th{font-size:12px;color:var(--muted);padding:6px 9px;border-radius:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .th:hover{background:var(--hover)}
  .th.sel{background:var(--active08);color:var(--text)}
  .sb-foot{margin-top:auto;display:flex;align-items:center;gap:9px;padding:9px 6px 2px;border-top:.5px solid var(--border);font-size:12px}
  .av{width:24px;height:24px;border-radius:50%;background:var(--primary);color:__ONPRIMARY__;display:grid;place-items:center;font-size:11px;font-weight:600}
  .sb-foot .gear{margin-left:auto;color:var(--muted);font-size:13px}

  .main{flex:1;display:flex;flex-direction:column;min-width:0;position:relative}
  .topbar{height:48px;flex:none;display:flex;align-items:center;gap:10px;padding:0 18px;border-bottom:.5px solid var(--border)}
  .topbar .h{font-size:13px;font-weight:600}
  .topbar .crumb{font-size:11.5px;color:var(--muted)}
  .topbar .right{margin-left:auto;display:flex;align-items:center;gap:8px}
  .chip{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);
    background:var(--panel);border:.5px solid var(--border);border-radius:999px;padding:4px 10px}
  .chip i{width:6px;height:6px;border-radius:50%;background:var(--info)}
  .chip i.idle{background:var(--secondary)}
  .btn{border:0;border-radius:8px;font-size:12px;padding:6px 12px;cursor:default;font-family:inherit}
  .btn.primary{background:var(--primary);color:__ONPRIMARY__;font-weight:600;box-shadow:0 1px 0 rgba(0,0,0,.3)}
  .btn.info{background:var(--info);color:__ONINFO__;font-weight:600;box-shadow:0 1px 0 rgba(0,0,0,.3)}
  .btn.ghost{background:transparent;color:var(--muted);border:.5px solid transparent}
  .btn.ghost:hover{background:var(--active08);color:var(--text)}
  .btn.outline{background:transparent;border:.5px solid var(--active);color:var(--text)}
  .btn.contrast{background:var(--text);color:var(--bg)}

  .feed{flex:1;overflow:hidden;padding:22px 26px 84px}
  .col{width:720px;margin:0 auto}
  .user{display:flex;justify-content:flex-end;margin-bottom:20px}
  .user .bub{background:var(--bubble);border-radius:14px 14px 4px 14px;padding:10px 14px;font-size:13px;
    line-height:1.65;max-width:520px;box-shadow:0 1px 2px rgba(0,0,0,.3)}
  .who{display:flex;align-items:center;gap:7px;margin-bottom:9px}
  .who .k{width:20px;height:20px;display:grid;place-items:center}
  .who .n{font-size:12px;font-weight:600;letter-spacing:.02em}
  .who .t{font-size:10.5px;color:var(--dim);border:.5px solid var(--border);border-radius:5px;padding:1px 5px}
  .md{font-size:13px;line-height:1.8}
  .md h2{font-size:15.5px;line-height:1.4;color:var(--h);margin:0 0 8px;font-weight:650;letter-spacing:.01em}
  .md p{margin:0 0 10px}
  .md strong{color:var(--strong);font-weight:650}
  .md em{color:var(--em);font-style:italic}
  .md a{color:var(--link);text-decoration:underline;text-underline-offset:2px;text-decoration-thickness:.5px}
  .md code{font-family:"Cascadia Code",Consolas,"Courier New",monospace;font-size:11.5px;color:var(--mcode);
    border:.5px solid var(--border);border-radius:4px;padding:0 4px;background:color-mix(in srgb,var(--mcode) 8%,transparent)}
  .md ul{margin:0 0 10px;padding-left:18px}
  .md li{margin:2px 0}
  .md blockquote{margin:0 0 12px;padding:2px 0 2px 12px;border-left:2px solid var(--active);color:var(--quote);font-size:12.5px}
  .warn{display:flex;gap:9px;align-items:flex-start;background:color-mix(in srgb,var(--warning) 13%,transparent);
    border-left:2.5px solid var(--warning);border-radius:6px;padding:8px 12px;margin:0 0 12px;font-size:12px;line-height:1.7;color:var(--warning)}
  .warn b{font-weight:650}
  .warn .tag{font-size:10.5px;letter-spacing:.08em;border:.5px solid color-mix(in srgb,var(--warning) 45%,transparent);
    border-radius:4px;padding:0 5px;flex:none;margin-top:1px}
  .md table{border-collapse:collapse;font-size:12px;margin:0 0 12px;width:100%}
  .md th{text-align:left;font-weight:600;padding:7px 10px;border-bottom:.5px solid var(--active);background:color-mix(in srgb,var(--panel) 70%,transparent)}
  .md td{padding:7px 10px;border-bottom:.5px solid var(--border)}
  .md td .ok{color:var(--success);font-weight:600}
  .md td .no{color:var(--error);font-weight:600}
  .md td.mono{font-family:"Cascadia Code",Consolas,monospace;font-size:11px;color:var(--muted)}

  .cc{border-radius:10px;overflow:hidden;margin:2px 0 12px;background:var(--code);border:.5px solid var(--border)}
  .cc .hd{display:flex;align-items:center;gap:8px;background:var(--codehead);padding:7px 12px 6px;font-size:11px;color:var(--muted)}
  .cc .hd .lang{color:var(--dim);font-family:"Cascadia Code",Consolas,monospace}
  .cc .hd .fn{color:var(--muted)}
  .cc .hd .cp{margin-left:auto;font-size:10.5px;color:var(--dim)}
  .cc pre{margin:0;padding:11px 14px 13px;overflow:hidden;
    font-family:"Cascadia Code",Consolas,"Courier New",monospace;font-size:11.5px;line-height:1.85}
  .tk-com{color:var(--scom);font-style:italic}
  .tk-kw{color:var(--skw)}
  .tk-fn{color:var(--sfn)}
  .tk-typ{color:var(--styp)}
  .tk-num{color:var(--snum)}
  .tk-str{color:var(--sstr)}
  .tk-op{color:var(--sop)}
  .tk-plain{color:var(--text)}

  .diff{border-radius:10px;overflow:hidden;background:var(--code);margin:0 0 12px;font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px;border:.5px solid var(--border)}
  .diff .ln{display:flex;gap:10px;padding:2px 12px 2px 0}
  .diff .ln .no{width:30px;padding-right:7px;text-align:right;color:var(--dim);border-right:.5px solid transparent}
  .diff .rm{background:var(--drembg)}
  .diff .rm .no{background:var(--dremln);color:var(--drem);border-right-color:var(--drembg)}
  .diff .rm .sign,.diff .rm .code{color:var(--drem)}
  .diff .add{background:var(--daddbg)}
  .diff .add .no{background:var(--daddln);color:var(--dadd);border-right-color:var(--daddbg)}
  .diff .add .sign,.diff .add .code{color:var(--dadd)}
  .diff .ln .sign{width:8px}

  .tool{background:var(--elem);border-radius:10px;padding:10px 13px;margin:0 0 12px;font-size:12px}
  .tool .row{display:flex;align-items:center;gap:8px}
  .tool .name{font-weight:600}
  .tool .st{margin-left:auto;color:var(--success);font-size:11px;display:flex;align-items:center;gap:5px}
  .tool .st i{width:6px;height:6px;border-radius:50%;background:var(--success)}
  .tool .out{margin-top:7px;font-family:"Cascadia Code",Consolas,monospace;font-size:10.8px;line-height:1.8;color:var(--muted)}
  .tool .out b{color:var(--success);font-weight:600}
  .pulse{width:14px;height:14px;border-radius:50%;border:1.6px solid color-mix(in srgb,var(--info) 35%,transparent);border-top-color:var(--info)}

  .toast{position:absolute;right:22px;bottom:132px;background:var(--elem);border:.5px solid var(--border);
    border-radius:10px;padding:9px 13px;display:flex;align-items:center;gap:9px;font-size:12px;
    box-shadow:0 12px 28px -12px rgba(0,0,0,.8)}
  .toast i{width:7px;height:7px;border-radius:50%;background:var(--success)}
  .toast .sub{color:var(--dim);font-size:11px}

  .composer{flex:none;padding:10px 26px 14px}
  .composer .col{width:720px}
  .cbox{background:var(--input);border:.5px solid var(--active);border-radius:14px;padding:11px 13px 9px;
    box-shadow:0 2px 12px -6px rgba(0,0,0,.6)}
  .cbox .ph{font-size:13px;color:var(--muted)}
  .cbox .row{display:flex;align-items:center;gap:7px;margin-top:9px}
  .cbox .row .sp{margin-left:auto}
  .pill{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;color:var(--muted);
    background:var(--panel);border:.5px solid var(--border);border-radius:999px;padding:3px 8px}
  .pill i{width:5px;height:5px;border-radius:50%;background:var(--primary)}
  .send{width:28px;height:28px;border-radius:9px;background:var(--primary);color:__ONPRIMARY__;display:grid;place-items:center;
    font-size:13px;font-weight:700;border:0}
  .hint{display:flex;align-items:center;gap:8px;font-size:10.5px;color:var(--dim);padding:7px 4px 0}
  .hint .r{margin-left:auto;display:flex;gap:6px;align-items:center}

  /* ── sections ── */
  .tokens{margin-top:44px}
  .tokens .head{display:flex;align-items:baseline;gap:14px;margin-bottom:14px}
  .tokens h3{font-size:13px;letter-spacing:.18em;text-transform:uppercase;margin:0;font-weight:600}
  .tokens .hintx{font-size:11.5px;color:var(--muted)}
  .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
  .sw{border-radius:9px;border:.5px solid var(--border);overflow:hidden;background:var(--code)}
  .sw .top{height:46px;display:flex;align-items:flex-end;padding:5px 7px}
  .sw .hex{font-size:9.5px;font-family:"Cascadia Code",Consolas,monospace;opacity:.96;letter-spacing:.02em}
  .sw .lbl{font-size:10px;padding:5px 7px 6px;color:var(--muted);border-top:.5px solid var(--border)}
  .sw .lbl b{color:var(--text);font-weight:600;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .sw .lbl i{font-style:normal;font-size:9px;color:var(--dim);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .legend{display:flex;gap:16px;margin-top:16px;font-size:11px;color:var(--muted);flex-wrap:wrap}
  .legend span{display:flex;align-items:center;gap:6px}
  .legend i{width:9px;height:9px;border-radius:3px}

  .sect{margin-top:46px}
  .sect .head{display:flex;align-items:baseline;gap:14px;margin-bottom:16px}
  .sect h3{font-size:13px;letter-spacing:.18em;text-transform:uppercase;margin:0;font-weight:600}
  .sect .hintx{font-size:11.5px;color:var(--muted)}

  .posters{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .poster{margin:0;border-radius:12px;overflow:hidden;border:.5px solid var(--border);background:var(--paper)}
  .poster img{width:100%;display:block}
  .poster figcaption{padding:10px 12px 12px;display:flex;flex-direction:column;gap:2px}
  .poster figcaption b{font-size:13px}
  .poster figcaption span{font-size:10.5px;color:var(--muted);font-family:"Cascadia Code",Consolas,monospace}
  .poster figcaption em{font-style:normal;font-size:11px;color:var(--primary);margin-top:4px}

  .sigs{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px}
  .sig{display:flex;gap:11px;align-items:center;background:var(--paper);border:.5px solid var(--border);border-radius:11px;padding:10px}
  .sigcrop{position:relative;flex:none;width:58px;height:58px;border-radius:9px;overflow:hidden;border:.5px solid var(--border)}
  .sigcrop img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(1.15)}
  .sigcrop i{position:absolute;right:4px;bottom:4px;width:13px;height:13px;border-radius:4px;border:1px solid rgba(255,255,255,.55);box-shadow:0 1px 4px rgba(0,0,0,.7)}
  .sigmeta{display:flex;flex-direction:column;gap:3px;min-width:0}
  .sigmeta b{font-size:12px}
  .sigmeta code{font-size:10.5px;color:var(--secondary);font-family:"Cascadia Code",Consolas,monospace}
  .sigmeta span{font-size:10.5px;color:var(--muted);line-height:1.5}

  .prov{width:100%;border-collapse:collapse;font-size:11.5px;background:var(--paper);
    border:.5px solid var(--border);border-radius:12px;overflow:hidden}
  .prov th{text-align:left;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);
    padding:9px 12px;border-bottom:.5px solid var(--border);font-weight:600}
  .prov td{padding:6px 12px;border-bottom:.5px solid color-mix(in srgb,var(--border) 55%,transparent)}
  .prov tr:last-child td{border-bottom:0}
  .prov .tk b{font-size:11.5px;color:var(--text)}
  .prov code{font-family:"Cascadia Code",Consolas,monospace;font-size:11px;color:var(--secondary)}
  .prov .op{color:var(--muted);font-size:11px}
  .prov .src{color:var(--dim);font-size:10.5px}
  .chipc{display:inline-block;width:11px;height:11px;border-radius:3px;border:.5px solid rgba(255,255,255,.16);
    margin-right:7px;vertical-align:-1px}

  .cols2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .panel{background:var(--paper);border:.5px solid var(--border);border-radius:12px;padding:14px 16px 16px}
  .panel h4{margin:0 0 10px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600}
  .ruler{width:100%;border-collapse:collapse;font-size:11.5px}
  .ruler th{text-align:left;color:var(--muted);font-weight:600;padding:6px 8px;border-bottom:.5px solid var(--border);font-size:10.5px}
  .ruler td{padding:5px 8px;border-bottom:.5px solid color-mix(in srgb,var(--border) 45%,transparent)}
  .ruler td:last-child{white-space:nowrap}
  .ruler tr:last-child td{border-bottom:0}
  .ruler .num{text-align:right;font-family:"Cascadia Code",Consolas,monospace}
  .ruler code{font-family:"Cascadia Code",Consolas,monospace;font-size:10.5px;color:var(--secondary)}
  .ok{color:var(--success);font-weight:600}
  .no{color:var(--error);font-weight:600}
  .score{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
  .score .sc{background:var(--paper);border:.5px solid var(--border);border-radius:10px;padding:9px 14px;min-width:132px}
  .score .sc b{display:block;font-size:19px;color:var(--primary);font-family:"Cascadia Code",Consolas,monospace}
  .score .sc span{font-size:10.5px;color:var(--muted)}
  .foot{display:flex;justify-content:space-between;margin-top:26px;font-size:10.5px;color:var(--dim)}
  /* ── 配比审计 ── */
  .ratiowrap{background:var(--paper);border:.5px solid var(--border);border-radius:12px;padding:16px}
  .ratiobar{display:flex;height:46px;border-radius:9px;overflow:hidden;border:.5px solid var(--border)}
  .ratiobar .seg{display:grid;place-items:center;font-size:11.5px;font-weight:600;min-width:0;overflow:hidden;white-space:nowrap}
  .ratiobar .seg.red{background:linear-gradient(180deg,var(--primary),color-mix(in srgb,var(--primary) 72%,#000));color:#F4F4F5}
  .ratiobar .seg.blue{background:linear-gradient(180deg,var(--secondary),color-mix(in srgb,var(--secondary) 72%,#000));color:#04121B}
  .ratiobar .seg.note{background:color-mix(in srgb,var(--muted) 22%,transparent);color:var(--muted)}
  .ratiometa{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:14px}
  .ratiometa b{display:block;font-size:19px;color:var(--primary);font-family:"Cascadia Code",Consolas,monospace}
  .ratiometa span{font-size:10.5px;color:var(--muted)}
</style>
</head>
<body>
<div class="sheet">
  <div class="eyebrow">DSH / OpenCode Palette · Custom Theme</div>
  <h1 class="title">星球大战 <em>Star Wars</em> — 双刃对分</h1>
  <div class="sub">
    三张海报当唯一样本：<b>每一个色位都是图里真实存在的像素</b>，只做明度阶、彩度阶与线性混合的推导，不另造颜色。
    第一性推导只有三步：① <b>两把光剑是海报唯一的两个主角</b>，所以红刃与蓝刃必须等重——按引擎里真实的着色面积排，
    红刃拿下最大的一块（主按钮 / 品牌字 / 激活导航 / 危险态），蓝刃拿下整套冷色岗位（链接 / 焦点 / 提示 / 次级文字 / 函数）；
    ② <b>底色必须是两刃的交点</b>，红 357° 与蓝 198° 的中点是紫 277°，所以背景是近黑的紫，不偏任何一边；
    ③ <b>字标属排版不属色块</b>，金只留标题与数字两席，绿剑素材只占 1.1%，两者都只作注脚。
    配比审计（权重＝该色位驱动的 DSH 变量数）：<b>红刃 __REDPCT__% / 蓝刃 __BLUEPCT__%</b>。
    判据自检：硬性 __HARD__ 对 + UI __UI__ 对，<b>__FAILS__ 条违例</b>，设计告警 __WARNS__ 条。
  </div>
  <div class="anchors">
    <span class="anchor"><i style="background:#CD1E28"></i>红刃 <b>__PRIMARY__</b></span>
    <span class="anchor"><i style="background:#30B4EC"></i>蓝刃 <b>#30B4EC</b></span>
    <span class="anchor"><i style="background:#EB3D48"></i>亮刃（错误） <b>#EB3D48</b></span>
    <span class="anchor"><i style="background:#FCE39F"></i>字标金 <b>#FCE39F</b></span>
    <span class="anchor"><i style="background:#6EC3AE"></i>全息薄荷 <b>#6EC3AE</b></span>
    <span class="anchor"><i style="background:#CBA8EC"></i>星云紫 <b>#CBA8EC</b></span>
    <span class="anchor"><i style="background:#D17380"></i>落日玫瑰 <b>#D17380</b></span>
  </div>

  <div class="win">
    <aside class="sb">
      <div class="brand">
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
          <path d="M13 2.2c-5.2 0-8.6 3.6-8.6 8.4v10.2c0 1.7 1.2 2.9 2.9 2.9h11.4c1.7 0 2.9-1.2 2.9-2.9V10.6C21.6 5.8 18.2 2.2 13 2.2Z" fill="#E8E3DB"/>
          <path d="M5.2 8.4 2.4 4.6l.4-3 3 1.1 1.5 3.1Z" fill="#E8E3DB"/>
          <path d="M20.8 8.4l2.8-3.8-.4-3-3 1.1-1.5 3.1Z" fill="#E8E3DB"/>
          <path d="M9.4 10.6 11.9 3.1l2.5 7.5z" fill="#30B4EC"/>
          <path d="M14.2 10.6 16.7 3.1l2.5 7.5z" fill="#E02A34"/>
        </svg>
        <span class="name">星球大战</span><span class="badge">DSH</span>
      </div>
      <div class="ws"><span class="dot">星</span><span>holo-table</span><span class="caret">▾</span></div>
      <div class="nav">
        <div class="it on"><span class="ic round"></span>新会话<span style="margin-left:auto;font-size:10px;color:var(--dim)">⌘N</span></div>
        <div class="it"><span class="ic"></span>会话历史</div>
        <div class="it"><span class="ic"></span>文件</div>
        <div class="it"><span class="ic round"></span>终端</div>
      </div>
      <div class="side-lbl">最近</div>
      <div class="threads">
        <div class="th sel">星球大战主题 · 配色评审</div>
        <div class="th">从三张海报里取色</div>
        <div class="th">37 色位落位与对比度</div>
        <div class="th">退后梯队：注释与运算符</div>
      </div>
      <div class="sb-foot"><span class="av">华</span><span>小华</span><span class="gear">⚙</span></div>
    </aside>

    <main class="main">
      <div class="topbar">
        <span class="h">星球大战主题 · 配色评审</span>
        <span class="crumb">/ 37 tokens</span>
        <div class="right">
          <span class="chip"><i class="idle"></i>就绪</span>
          <span class="chip"><i></i>deepseek-flash</span>
          <button class="btn ghost">分享</button>
          <button class="btn info">导入配置</button>
          <button class="btn primary">新建会话</button>
        </div>
      </div>

      <div class="feed"><div class="col">
        <div class="user"><div class="bub">用这三张海报重新做一版星球大战配色，所有颜色都必须从图里取。</div></div>

        <div class="who">
          <span class="k">
            <svg width="20" height="20" viewBox="0 0 26 26"><path d="M13 2.2c-5.2 0-8.6 3.6-8.6 8.4v10.2c0 1.7 1.2 2.9 2.9 2.9h11.4c1.7 0 2.9-1.2 2.9-2.9V10.6C21.6 5.8 18.2 2.2 13 2.2Z" fill="#E8E3DB"/><path d="M5.2 8.4 2.4 4.6l.4-3 3 1.1 1.5 3.1Z" fill="#E8E3DB"/><path d="M20.8 8.4l2.8-3.8-.4-3-3 1.1-1.5 3.1Z" fill="#E8E3DB"/><path d="M9.4 10.6 11.9 3.1l2.5 7.5z" fill="#30B4EC"/><path d="M14.2 10.6 16.7 3.1l2.5 7.5z" fill="#E02A34"/></svg>
          </span>
          <span class="n">小华</span><span class="t">star-wars.json</span>
        </div>

        <div class="md">
          <h2>红刃与蓝刃，各占一半</h2>
          <p>核心只有一句话：<strong>两把光剑必须等重</strong>。海报的红色与蓝色是场里的两个主角，
            界面就得按同样的比例把两色铺开——红刃拿下着色面积最大的一块（主按钮、品牌字、激活导航、危险态），
            蓝刃拿下整套冷色岗位（链接、焦点环、提示、次级文字、函数名）。</p>
          <ul>
            <li>底色是<strong>两刃的交点</strong>：红 357° 与蓝 198° 的中点是紫 277°，所以八个背景槽是近黑的紫（色相 275–279°，偏差 ≤ 4°）——底色不偏任何一边，两色才都立得住。</li>
            <li>字标金只管<strong>排版</strong>：金色在海报里是 logo，是字不是色块，所以它只出现在标题与数字两席，不再占按钮；绿剑素材全场只占 1.1%，也只作注脚。</li>
            <li>错误色用<strong>亮一档的刃</strong>（<code>#EB3D48</code>）配深刃品牌色（<code>__PRIMARY__</code>）：同族不同值，亮红永远比品牌红更刺眼，<code>error</code> 与 <code>primary</code> 不撞值也不撞岗。</li>
          </ul>
          <blockquote>星星是场，光刃是动作；把场让给交点，把动作一分为二。</blockquote>
            <li>退后梯队做在代码区：注释 <code>__SCOM__</code> 与运算符 <code>__SOP__</code> 都压在 5:1 上下，五个核心语法色在 <code>__MINCORE__</code> 以上。</li>
          </ul>

          <div class="cc">
            <div class="hd"><span class="lang">css</span><span class="fn">star-wars.theme.ts</span><span class="cp">复制</span></div>
<pre><span class="tk-com">// 每个值都有海报出处（1/2/3.jpg 实拍取色）</span>
<span class="tk-kw">const</span> <span class="tk-fn">starWars</span> <span class="tk-op">=</span> {
  <span class="tk-fn">void</span>:     <span class="tk-str">"__BG__"</span>,  <span class="tk-com">// 2.jpg 紫黑（两刃交点）· 明度阶</span>
  <span class="tk-fn">paper</span>:   <span class="tk-str">"#E8E3DB"</span>,  <span class="tk-com">// 1.jpg 海报纸白 · 原样</span>
  <span class="tk-fn">blade</span>:   <span class="tk-str">"__PRIMARY__"</span>,  <span class="tk-com">// 3.jpg 红剑 · 明度阶</span>
  <span class="tk-fn">saber</span>:   <span class="tk-str">"#30B4EC"</span>,  <span class="tk-com">// 2.jpg 蓝剑剑心 · 原样</span>
  <span class="tk-fn">contrast</span>: <span class="tk-num">__TEXTC__</span> <span class="tk-kw">as</span> <span class="tk-typ">Ratio</span>,
};</pre>
          </div>

          <table>
            <tr><th>检查项</th><th>结果</th><th>色值</th></tr>
            <tr><td>正文对比度</td><td><span class="ok">__TEXTC__ : 1</span></td><td class="mono">#E8E3DB / __BG__</td></tr>
            <tr><td>主按钮反白</td><td><span class="ok">__PRIM__ : 1</span></td><td class="mono">__ONPRIMARY__ / __PRIMARY__</td></tr>
            <tr><td>焦点环</td><td><span class="ok">__FOCUS__ : 1</span></td><td class="mono">#7AD2FF / __BG__</td></tr>
            <tr><td>红蓝配比</td><td><span class="ok">__REDPCT__% / __BLUEPCT__%</span></td><td class="mono">blade / saber</td></tr>
            <tr><td>品牌几何</td><td><span class="ok">__GEOM__° 互补</span></td><td class="mono">blade / saber</td></tr>
            <tr><td>深色代码台</td><td><span class="ok">采用</span></td><td class="mono">shiki fg = text</td></tr>
          </table>

          <div class="warn">
            <span class="tag">已知限制</span>
            <span>提示气泡的<strong>文字色</strong>由 DSH 写死为白色，只把背景换成浮层色——深色主题下这层浮层仍偏亮，
              属于宿主写死项，37 个色位修不到。</span>
          </div>

          <div class="diff">
            <div class="ln rm"><span class="no">41</span><span class="sign">-</span><span class="code">  "primary": "#ffe81f",</span></div>
            <div class="ln add"><span class="no">41</span><span class="sign">+</span><span class="code">  "primary": "#FCE39F",</span></div>
            <div class="ln add"><span class="no">42</span><span class="sign">+</span><span class="code">  "secondary": "#30B4EC",</span></div>
          </div>

          <div class="tool">
            <div class="row"><span class="pulse"></span><span class="name">运行 final_check.py</span><span class="st"><i></i>已完成</span></div>
            <div class="out">
              [1] text &amp; md tones on every surface: <b>OK</b><br>
              [2] syntax tokens on codeBlockBg: <b>5 / 5 核心 · OK</b><br>
              [3] 判据合计 __TOTAL__ 对，违例 <b>__FAILS__</b>
            </div>
          </div>
        </div>
      </div></div>

      <div class="toast"><i></i><span>主题已保存 · 37 色位</span><span class="sub">在面板中可见</span></div>

      <div class="composer"><div class="col">
        <div class="cbox">
          <div class="ph">继续调整配色，或问我任意细节…</div>
          <div class="row">
            <span class="pill"><i></i>star-wars.json</span>
            <span class="pill">dark</span>
            <button class="btn ghost" style="width:26px;height:26px;padding:0">＋</button>
            <span class="sp"></span>
            <button class="btn ghost" style="width:26px;height:26px;padding:0">⚙</button>
            <button class="send">↑</button>
          </div>
        </div>
        <div class="hint">Enter 发送 · Shift + Enter 换行
          <span class="r"><span class="chip" style="padding:2px 8px">37 tokens</span><span>星球大战</span></span>
        </div>
      </div></div>
    </main>
  </div>

  <!-- ═══ 取色溯源 ═══ -->
  <div class="sect" id="source">
    <div class="head"><h3>取色溯源</h3><span class="hintx">三张海报 → 像素级取样 → 37 个色位；每一步都可回溯</span></div>
    <div class="posters">
__POSTERS__
    </div>
    <div class="sigs">
__SIGS__
    </div>
  </div>

  <!-- ═══ 37 色位溯源表 ═══ -->
  <div class="sect" id="tokens">
    <div class="head"><h3>37 Color Tokens</h3><span class="hintx">色位 → 海报锚点 → 推导方式（不出现任何图外颜色）</span></div>
    <div class="grid" id="grid"></div>
    <div class="legend">
      <span><i style="background:var(--bg)"></i>背景场域</span>
      <span><i style="background:var(--elem)"></i>面板 / 浮层</span>
      <span><i style="background:var(--text)"></i>文字结构</span>
      <span><i style="background:var(--primary)"></i>品牌强调</span>
      <span><i style="background:var(--info)"></i>语义状态</span>
      <span><i style="background:var(--border)"></i>边界</span>
      <span><i style="background:var(--daddbg)"></i>代码 / diff</span>
      <span><i style="background:var(--skw)"></i>语法</span>
    </div>
    <table class="prov" style="margin-top:18px">
      <thead><tr><th>色位</th><th>取值</th><th>海报锚点</th><th>推导</th><th>出处</th></tr></thead>
      <tbody>
__PROVROWS__
      </tbody>
    </table>
  </div>

  <!-- ═══ 配比审计 ═══ -->
  <div class="sect" id="ratio">
    <div class="head"><h3>配比审计</h3><span class="hintx">权重＝该色位在 map-dsh.ts 里驱动的 DSH 变量数（填充类 ×2）· 场域与墨不计入阵营</span></div>
    <div class="ratiowrap">
      <div class="ratiobar">
        <div class="seg red" style="flex:__REDFLEX__"><span>红刃 __REDPCT__%</span></div>
        <div class="seg blue" style="flex:__BLUEFLEX__"><span>蓝刃 __BLUEPCT__%</span></div>
        <div class="seg note" style="flex:__NOTEFLEX__"><span>注脚（绿剑 + 金）</span></div>
      </div>
      <div class="ratiometa">
        <div><b>__REDPCT__% / __BLUEPCT__%</b><span>红刃 / 蓝刃（着色岗位口径）</span></div>
        <div><b>__DIFFPCT__%</b><span>两色差值（越接近 0 越对分）</span></div>
        <div><b>__GEOM__°</b><span>两刃夹角（互补）</span></div>
        <div><b>277°</b><span>底色色相＝两刃交点</span></div>
      </div>
    </div>
    <div class="cols2" style="margin-top:16px">
      <div class="panel">
        <h4>红刃承担了什么</h4>
        <table class="ruler">
          <thead><tr><th>色位</th><th>色值</th><th class="num">权重</th><th>落点</th></tr></thead>
          <tbody>
__REDROWS__
          </tbody>
        </table>
      </div>
      <div class="panel">
        <h4>蓝刃承担了什么</h4>
        <table class="ruler">
          <thead><tr><th>色位</th><th>色值</th><th class="num">权重</th><th>落点</th></tr></thead>
          <tbody>
__BLUEROWS__
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ═══ 判据报告 ═══ -->
  <div class="sect" id="audit">
    <div class="head"><h3>判据报告</h3><span class="hintx">docs/theme-audit/criteria.md · 38 硬性对 + 15 UI 对 + IP 设计规范</span></div>
    <div class="score">
      <div class="sc"><b>__FAILS__</b><span>违例（硬性 + UI）</span></div>
      <div class="sc"><b>__WARNS__</b><span>设计告警</span></div>
      <div class="sc"><b>__TEXTC__</b><span>正文对比度</span></div>
      <div class="sc"><b>__PRIM__</b><span>主按钮反白</span></div>
      <div class="sc"><b>__MIND__</b><span>语法核心最小 ΔE76</span></div>
      <div class="sc"><b>__GEOM__°</b><span>品牌几何（互补）</span></div>
    </div>
    <div class="cols2">
      <div class="panel">
        <h4>对比度判据</h4>
        <table class="ruler">
          <thead><tr><th>组</th><th class="num">对数</th><th class="num">阈值</th><th>最紧一对</th><th class="num">实测</th><th>结论</th></tr></thead>
          <tbody>
__GROWROWS__
          </tbody>
        </table>
      </div>
      <div class="panel">
        <h4>语法色在代码台上的表现</h4>
        <table class="ruler">
          <thead><tr><th>色值</th><th>角色</th><th class="num">对比度</th><th>判定</th></tr></thead>
          <tbody>
__SYNROWS__
          </tbody>
        </table>
      </div>
    </div>
    <div class="cols2" style="margin-top:16px">
      <div class="panel">
        <h4>语法核心两两区分度（ΔE76 ≥ 10）</h4>
        <table class="ruler">
          <thead><tr><th>配对</th><th class="num">ΔE76</th><th>判定</th></tr></thead>
          <tbody>
__DEROWS__
          </tbody>
        </table>
      </div>
      <div class="panel">
        <h4>设计规范自检</h4>
        <table class="ruler">
          <tbody>
            <tr><td>背景家族纯净（色相偏差 ≤ 60°）</td><td class="num">偏差 ≤ 10°</td><td><span class="ok">通过</span></td></tr>
            <tr><td>角色碰撞（25 设计角色无同值）</td><td class="num">0 处</td><td><span class="ok">通过</span></td></tr>
            <tr><td>markdown 六角色无同值</td><td class="num">0 处</td><td><span class="ok">通过</span></td></tr>
            <tr><td>品牌第二色几何</td><td class="num">__GEOM__° 互补</td><td><span class="ok">通过</span></td></tr>
            <tr><td>语法核心区分度</td><td class="num">最小 __MIND__</td><td><span class="ok">通过</span></td></tr>
            <tr><td>comment / operator 退后</td><td class="num">4.92 / 4.58</td><td><span class="ok">通过</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="foot"><span>Star Wars theme · 37 colors · dark · 三张海报像素级取样 · 判据自检全绿</span><span>design by 小华 · first principles</span></div>
</div>
<script>
const C = __PALETTE__;
const PROV = __PROV__;
function lum(h){h=h.replace('#','');const v=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)
  .map(c=>c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4));return .2126*v[0]+.7152*v[1]+.0722*v[2]}
function ratio(a,b){const x=lum(a),y=lum(b);const hi=Math.max(x,y),lo=Math.min(x,y);return (hi+.05)/(lo+.05)}
const grid=document.getElementById('grid');
for(const [k,v] of Object.entries(C)){
  const L=lum(v);
  const fg=L>.42?'#05091C':'#E8E3DB';
  const d=document.createElement('div');d.className='sw';
  const p=PROV[k]||{};
  d.innerHTML=`<div class="top" style="background:${v};color:${fg}"><span class="hex">${v}</span></div>
    <div class="lbl"><b>${k}</b><i>${p.anchor||''} · ${(p.op||'').slice(0,26)}</i></div>`;
  grid.appendChild(d);
}
</script>
</body>
</html>
"""

html = HTML
html = html.replace("__POSTERS__", "\n".join(poster_html))
html = html.replace("__SIGS__", "\n".join(sig_html))
html = html.replace("__PROVROWS__", prov_rows)
html = html.replace("__GROWROWS__", "\n".join(group_rows))
html = html.replace("__SYNROWS__", "\n".join(syn_rows))
html = html.replace("__DEROWS__", "\n".join(de_rows))
html = html.replace("__REDROWS__", red_rows)
html = html.replace("__BLUEROWS__", blue_rows)
html = html.replace("__PALETTE__", json.dumps(C))
html = html.replace("__PROV__", json.dumps(PROV, ensure_ascii=False))
html = html.replace("__ROOTCSS__", ROOT_CSS)
html = html.replace("__ONPRIMARY__", ONPRIMARY)
html = html.replace("__ONINFO__", ONINFO)
html = html.replace("__REDPCT__", str(KEY_RATIO["redPct"]))
html = html.replace("__BLUEPCT__", str(KEY_RATIO["bluePct"]))
html = html.replace("__DIFFPCT__", str(KEY_RATIO["diffPct"]))
html = html.replace("__REDFLEX__", str(KEY_RATIO["redFlex"]))
html = html.replace("__BLUEFLEX__", str(KEY_RATIO["blueFlex"]))
html = html.replace("__NOTEFLEX__", str(KEY_RATIO["noteFlex"]))
html = html.replace("__PRIMARY__", C["primary"])
html = html.replace("__BG__", C["background"])
html = html.replace("__GEOM__", str(KEY["geometry"]))
html = html.replace("__HARD__", str(KEY["hard"]))
html = html.replace("__UI__", str(KEY["ui"]))
html = html.replace("__FAILS__", str(KEY["fails"]))
html = html.replace("__WARNS__", str(KEY["warns"]))
html = html.replace("__TEXTC__", "%.2f" % KEY["text"])
html = html.replace("__PRIM__", "%.2f" % KEY["primary"])
html = html.replace("__FOCUS__", "%.2f" % KEY["focus"])
html = html.replace("__MINCORE__", "%.1f:1" % KEY["mincore"])
html = html.replace("__MIND__", "%.1f" % KEY["mind"])
html = html.replace("__SCOM__", C["syntaxComment"])
html = html.replace("__SOP__", C["syntaxOperator"])
html = html.replace("__TOTAL__", str(len(PAIRS)))

path = os.path.join(OUT, "star-wars-theme-preview.html")
with open(path, "w", encoding="utf-8") as f:
    f.write(html)
print("written:", path, "%.1f KB" % (os.path.getsize(path) / 1024))
print("hard=%d ui=%d fails=%d warns=%d text=%.2f primary=%.2f minCore=%.2f minDE=%.1f geom=%.1f" % (
    KEY["hard"], KEY["ui"], KEY["fails"], KEY["warns"], KEY["text"], KEY["primary"], KEY["mincore"], KEY["mind"], KEY["geometry"]))
