#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""gen.py — 由 palette.json 生成 ../marvel-theme-preview.html
参考图裁切后 base64 内联，页面自包含（不依赖本机路径）。
跑法：python gen.py
"""
import os, json, base64, io
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
SRC = r"C:\Users\辰辰洋洋\Pictures\漫威"
P = json.load(open(os.path.join(HERE, "palette.json"), encoding="utf-8"))
C = P["colors"]; PROV = P["provenance"]; PAIRS = P["pairs"]

FILES = sorted(f for f in os.listdir(SRC) if f.lower().endswith(".png"))
POSTER = {FILES[0]: "01-spiderman", FILES[1]: "02-ironman", FILES[2]: "03-logo"}
CROP = {FILES[0]: (0, 106, 560, 312), FILES[1]: (0, 66, 560, 352), FILES[2]: (0, 74, 560, 348)}
NAMES = {FILES[0]: ("01 · Spider-Man 漫画风主视觉", "夜城墨 · 战衣暗红 · 窗灯金"),
         FILES[1]: ("02 · Iron Man 官方主视觉", "熔金 · 战甲红 · 火焰橙"),
         FILES[2]: ("03 · Marvel 红色标志", "标志红 · 字幕白 · 页脚黄")}

def b64_crop(f, box, w=460):
    im = Image.open(os.path.join(SRC, f)).convert("RGB").crop(box)
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=84)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

IMGS = [b64_crop(f, CROP[f]) for f in FILES]

def lum(h):
    h = h.lstrip('#'); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]
def fgof(h): return '#141414' if lum(h) > .42 else '#F4F4F5'

VARS = """
    --bg:%(background)s; --panel:%(backgroundPanel)s; --elem:%(backgroundElement)s; --sidebar:%(sidebarBg)s;
    --bubble:%(bubbleBg)s; --input:%(inputBg)s; --code:%(codeBlockBg)s; --codehead:%(codeHeaderBg)s;
    --text:%(text)s; --muted:%(textMuted)s;
    --primary:%(primary)s; --secondary:%(secondary)s; --info:%(info)s; --success:%(success)s;
    --warning:%(warning)s; --error:%(error)s;
    --border:%(border)s; --active:%(borderActive)s;
    --dadd:%(diffAdded)s; --drem:%(diffRemoved)s; --daddbg:%(diffAddedBg)s; --drembg:%(diffRemovedBg)s;
    --daddln:%(diffAddedLineNumberBg)s; --dremln:%(diffRemovedLineNumberBg)s;
    --h:%(markdownHeading)s; --link:%(markdownLink)s; --mcode:%(markdownCode)s; --em:%(markdownEmph)s;
    --strong:%(markdownStrong)s; --quote:%(markdownBlockQuote)s;
    --scom:%(syntaxComment)s; --skw:%(syntaxKeyword)s; --sfn:%(syntaxFunction)s; --styp:%(syntaxType)s;
    --snum:%(syntaxNumber)s; --sstr:%(syntaxString)s; --sop:%(syntaxOperator)s;
""" % C

CSS = """
  :root{__VARS__
    --hover:color-mix(in srgb, var(--text) 8%, transparent);
    --active08:color-mix(in srgb, var(--text) 14%, transparent);
    --dim:color-mix(in srgb, var(--muted) 80%, transparent);
    --page:#05060A;
  }
  *{box-sizing:border-box} html,body{margin:0;padding:0}
  body{background:var(--page);color:var(--text);
    font-family:"Segoe UI","Microsoft YaHei UI","Microsoft YaHei",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  .sheet{width:1400px;padding:44px 64px 56px;margin:0 auto}
  .eyebrow{font-size:11px;letter-spacing:.22em;color:var(--muted);text-transform:uppercase}
  h1.title{font-size:34px;line-height:1.1;margin:10px 0 8px;letter-spacing:.01em;font-weight:600}
  h1.title em{font-style:normal;color:var(--primary)}
  .sub{font-size:13.5px;color:var(--muted);max-width:780px;line-height:1.78}
  .sub b{color:var(--text);font-weight:600}
  .sub code{font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px;color:var(--mcode);
    border:.5px solid var(--border);border-radius:4px;padding:0 4px}
  .anchors{display:flex;gap:10px;margin-top:18px;align-items:center;flex-wrap:wrap}
  .anchor{display:flex;align-items:center;gap:8px;background:color-mix(in srgb,var(--panel) 70%,transparent);
    border:.5px solid var(--border);border-radius:999px;padding:5px 12px 5px 6px;font-size:11.5px;color:var(--muted)}
  .anchor i{width:18px;height:18px;border-radius:50%;display:block;border:.5px solid rgba(255,255,255,.08)}
  .anchor em{font-style:normal;color:var(--text)}
  .win{margin-top:26px;width:1272px;border-radius:18px;overflow:hidden;position:relative;background:var(--bg);
    border:.5px solid var(--border);box-shadow:0 30px 70px -20px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.02);display:flex}
  .sb{width:246px;flex:none;background:var(--sidebar);border-right:.5px solid var(--border);
    display:flex;flex-direction:column;padding:14px 12px 12px}
  .brand{display:flex;align-items:center;gap:9px;padding:2px 6px 14px}
  .brand .name{font-size:13.5px;font-weight:600;letter-spacing:.02em}
  .brand .badge{font-size:10px;color:var(--muted);border:.5px solid var(--border);border-radius:5px;padding:1px 4px;margin-left:auto}
  .ws{display:flex;align-items:center;gap:8px;background:var(--panel);border:.5px solid var(--border);
    border-radius:10px;padding:7px 9px;font-size:12.5px;margin-bottom:14px}
  .ws .dot{width:16px;height:16px;border-radius:5px;background:var(--primary);color:#F4F4F5;font-size:9px;
    display:grid;place-items:center;font-weight:600}
  .ws .caret{margin-left:auto;color:var(--muted);font-size:10px}
  .nav{display:flex;flex-direction:column;gap:2px}
  .nav .it{position:relative;display:flex;align-items:center;gap:9px;font-size:12.5px;color:var(--muted);
    padding:7px 9px;border-radius:8px;cursor:default}
  .nav .it.on{background:var(--active08);color:var(--text);font-weight:600}
  .nav .it.on:before{content:"";position:absolute;left:0;top:7px;bottom:7px;width:3px;border-radius:3px;background:var(--primary)}
  .nav .it .ic{width:15px;height:15px;border:1.4px solid currentColor;border-radius:4px;opacity:.75;flex:none}
  .nav .it .ic.round{border-radius:50%}
  .side-lbl{font-size:10.5px;letter-spacing:.12em;color:var(--dim);margin:16px 8px 6px;text-transform:uppercase}
  .threads{display:flex;flex-direction:column;gap:1px}
  .th{font-size:12px;color:var(--muted);padding:6px 9px;border-radius:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .th.sel{background:var(--active08);color:var(--text)}
  .sb-foot{margin-top:auto;display:flex;align-items:center;gap:9px;padding:9px 6px 2px;border-top:.5px solid var(--border);font-size:12px}
  .av{width:24px;height:24px;border-radius:50%;background:var(--secondary);color:#141414;display:grid;place-items:center;font-size:11px;font-weight:700}
  .sb-foot .gear{margin-left:auto;color:var(--muted);font-size:13px}
  .main{flex:1;display:flex;flex-direction:column;min-width:0;position:relative}
  .topbar{height:48px;flex:none;display:flex;align-items:center;gap:10px;padding:0 18px;border-bottom:.5px solid var(--border)}
  .topbar .h{font-size:13px;font-weight:600} .topbar .crumb{font-size:11.5px;color:var(--muted)}
  .topbar .right{margin-left:auto;display:flex;align-items:center;gap:8px}
  .chip{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);
    background:var(--panel);border:.5px solid var(--border);border-radius:999px;padding:4px 10px}
  .chip i{width:6px;height:6px;border-radius:50%;background:var(--info)} .chip i.idle{background:var(--secondary)}
  .btn{border:0;border-radius:8px;font-size:12px;padding:6px 12px;cursor:default;font-family:inherit}
  .btn.primary{background:var(--primary);color:#F4F4F5;font-weight:600;box-shadow:0 1px 0 rgba(0,0,0,.35)}
  .btn.ghost{background:transparent;color:var(--muted);border:.5px solid transparent}
  .btn.ghost:hover{background:var(--active08);color:var(--text)}
  .feed{flex:1;overflow:hidden;padding:22px 26px 84px}
  .col{width:720px;margin:0 auto}
  .user{display:flex;justify-content:flex-end;margin-bottom:20px}
  .user .bub{background:var(--bubble);border-radius:14px 14px 4px 14px;padding:10px 14px;font-size:13px;
    line-height:1.65;max-width:520px;box-shadow:0 1px 2px rgba(0,0,0,.3)}
  .who{display:flex;align-items:center;gap:7px;margin-bottom:9px}
  .who .k{width:20px;height:20px;display:grid;place-items:center}
  .who .n{font-size:12px;font-weight:600;letter-spacing:.02em}
  .who .t{font-size:10.5px;color:var(--dim);border:.5px solid var(--border);border-radius:5px;padding:1px 5px}
  .md{font-size:13px;line-height:1.78}
  .md h2{font-size:15.5px;line-height:1.4;color:var(--h);margin:0 0 8px;font-weight:650}
  .md p{margin:0 0 10px} .md strong{color:var(--strong);font-weight:650}
  .md em{color:var(--em);font-style:italic}
  .md a{color:var(--link);text-decoration:underline;text-underline-offset:2px;text-decoration-thickness:.5px}
  .md code{font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px;color:var(--mcode);
    border:.5px solid var(--border);border-radius:4px;padding:0 4px}
  .md ul{margin:0 0 10px;padding-left:18px} .md li{margin:3px 0}
  .md blockquote{margin:0 0 12px;padding:2px 0 2px 12px;border-left:2px solid var(--active);color:var(--quote);font-size:12.5px}
  .warn{display:flex;gap:9px;align-items:flex-start;background:color-mix(in srgb,var(--warning) 13%,transparent);
    border-left:2.5px solid var(--warning);border-radius:6px;padding:8px 12px;margin:0 0 12px;font-size:12px;
    line-height:1.65;color:var(--warning)}
  .warn b{font-weight:650}
  .warn .tag{font-size:10.5px;letter-spacing:.08em;border:.5px solid color-mix(in srgb,var(--warning) 45%,transparent);
    border-radius:4px;padding:0 5px;flex:none;margin-top:1px}
  .md table{border-collapse:collapse;font-size:12px;margin:0 0 12px;width:100%}
  .md th{text-align:left;font-weight:600;padding:7px 10px;border-bottom:.5px solid var(--active);
    background:color-mix(in srgb,var(--panel) 55%,transparent)}
  .md td{padding:7px 10px;border-bottom:.5px solid var(--border)}
  .md td .ok{color:var(--success);font-weight:600} .md td.mono{font-family:"Cascadia Code",Consolas,monospace;font-size:11px;color:var(--muted)}
  .cc{border-radius:10px;overflow:hidden;margin:2px 0 12px;background:var(--code)}
  .cc .hd{display:flex;align-items:center;gap:8px;background:var(--codehead);padding:7px 12px 6px;font-size:11px;color:var(--muted)}
  .cc .hd .lang{color:var(--dim);font-family:"Cascadia Code",Consolas,monospace}
  .cc .hd .cp{margin-left:auto;font-size:10.5px;color:var(--dim)}
  .cc pre{margin:0;padding:11px 14px 13px;overflow:hidden;
    font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px;line-height:1.85}
  .tk-com{color:var(--scom);font-style:italic} .tk-kw{color:var(--skw)} .tk-fn{color:var(--sfn)}
  .tk-typ{color:var(--styp)} .tk-num{color:var(--snum)} .tk-str{color:var(--sstr)} .tk-op{color:var(--sop)}
  .diff{border-radius:10px;overflow:hidden;background:var(--code);margin:0 0 12px;
    font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px}
  .diff .ln{display:flex;gap:10px;padding:2px 12px 2px 0}
  .diff .ln .no{width:30px;padding-right:7px;text-align:right;color:var(--dim);border-right:.5px solid transparent}
  .diff .rm{background:var(--drembg)} .diff .rm .no{background:var(--dremln);color:var(--drem);border-right-color:var(--drembg)}
  .diff .rm .sign,.diff .rm .code{color:var(--drem)}
  .diff .add{background:var(--daddbg)} .diff .add .no{background:var(--daddln);color:var(--dadd);border-right-color:var(--daddbg)}
  .diff .add .sign,.diff .add .code{color:var(--dadd)}
  .diff .ln .sign{width:8px}
  .tool{background:var(--elem);border-radius:10px;padding:10px 13px;margin:0 0 12px;font-size:12px}
  .tool .row{display:flex;align-items:center;gap:8px} .tool .name{font-weight:600}
  .tool .st{margin-left:auto;color:var(--success);font-size:11px;display:flex;align-items:center;gap:5px}
  .tool .st i{width:6px;height:6px;border-radius:50%;background:var(--success)}
  .tool .out{margin-top:7px;font-family:"Cascadia Code",Consolas,monospace;font-size:10.8px;line-height:1.75;color:var(--muted)}
  .tool .out b{color:var(--success);font-weight:600}
  .pulse{width:14px;height:14px;border-radius:50%;border:1.6px solid color-mix(in srgb,var(--info) 35%,transparent);border-top-color:var(--info)}
  .toast{position:absolute;right:22px;bottom:132px;background:var(--elem);border:.5px solid var(--border);
    border-radius:10px;padding:9px 13px;display:flex;align-items:center;gap:9px;font-size:12px;
    box-shadow:0 10px 24px -10px rgba(0,0,0,.7)}
  .toast i{width:7px;height:7px;border-radius:50%;background:var(--success)}
  .toast .sub{color:var(--dim);font-size:11px}
  .composer{flex:none;padding:10px 26px 14px} .composer .col{width:720px}
  .cbox{background:var(--input);border:.5px solid var(--active);border-radius:14px;padding:11px 13px 9px;
    box-shadow:0 2px 14px -6px rgba(0,0,0,.6),0 0 0 3px color-mix(in srgb,var(--primary) 12%,transparent)}
  .cbox .ph{font-size:13px;color:var(--muted)}
  .cbox .row{display:flex;align-items:center;gap:7px;margin-top:9px} .cbox .row .sp{margin-left:auto}
  .pill{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;color:var(--muted);
    background:var(--panel);border:.5px solid var(--border);border-radius:999px;padding:3px 8px}
  .pill i{width:5px;height:5px;border-radius:50%;background:var(--primary)}
  .send{width:28px;height:28px;border-radius:9px;background:var(--primary);color:#F4F4F5;display:grid;
    place-items:center;font-size:13px;font-weight:700;border:0;box-shadow:0 1px 0 rgba(0,0,0,.35)}
  .hint{display:flex;align-items:center;gap:8px;font-size:10.5px;color:var(--dim);padding:7px 4px 0}
  .hint .r{margin-left:auto;display:flex;gap:6px;align-items:center}
  .sect{margin-top:40px}
  .sect .head{display:flex;align-items:baseline;gap:14px;margin-bottom:14px}
  .sect h3{font-size:13px;letter-spacing:.18em;text-transform:uppercase;margin:0;font-weight:600}
  .sect .hintx{font-size:11.5px;color:var(--muted)}
  .src{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  .sc{border:.5px solid var(--border);border-radius:12px;overflow:hidden;background:var(--panel)}
  .sc img{display:block;width:100%;height:176px;object-fit:cover;object-position:center}
  .sc .meta{padding:11px 13px 13px}
  .sc .meta h4{margin:0 0 3px;font-size:12.5px;font-weight:600;letter-spacing:.02em}
  .sc .meta p{margin:0 0 9px;font-size:11px;color:var(--muted);line-height:1.6}
  .sc .chips{display:flex;flex-wrap:wrap;gap:6px}
  .sc .chips span{display:inline-flex;align-items:center;gap:5px;font-size:10px;color:var(--muted);
    background:var(--elem);border:.5px solid var(--border);border-radius:5px;padding:2px 7px;
    font-family:"Cascadia Code",Consolas,monospace}
  .sc .chips i{width:8px;height:8px;border-radius:2px;display:block}
  .lad{display:flex;border-radius:12px;overflow:hidden;border:.5px solid var(--border);background:var(--code)}
  .lad .step{flex:1;padding:14px 12px 13px;display:flex;flex-direction:column;justify-content:flex-end;min-height:118px;
    border-right:.5px solid rgba(0,0,0,.45);position:relative}
  .lad .step:last-child{border-right:0}
  .lad .step .k{font-size:10px;letter-spacing:.06em;color:var(--muted);text-transform:uppercase;opacity:.85}
  .lad .step .h{font-size:12px;font-weight:600;margin-top:3px}
  .lad .step .x{font-size:10.5px;font-family:"Cascadia Code",Consolas,monospace;opacity:.8;margin-top:2px}
  .lad .step .l{position:absolute;top:10px;right:12px;font-size:10px;font-family:"Cascadia Code",Consolas,monospace;opacity:.75}
  .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
  .sw{border-radius:9px;border:.5px solid var(--border);overflow:hidden;background:var(--code)}
  .sw .top{height:46px;display:flex;align-items:flex-end;padding:5px 7px}
  .sw .hex{font-size:9.5px;font-family:"Cascadia Code",Consolas,monospace;opacity:.95}
  .sw .lbl{font-size:10px;padding:5px 7px 6px;color:var(--muted);border-top:.5px solid var(--border);line-height:1.35;word-break:break-word}
  .sw .lbl b{color:var(--text);font-weight:600}
  .sw .lbl i{display:block;font-style:normal;font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;opacity:.6;margin-bottom:1px}
  .prov{width:100%;border-collapse:collapse;font-size:11.5px;border:.5px solid var(--border);border-radius:10px;overflow:hidden}
  .prov th{text-align:left;font-weight:600;padding:8px 11px;background:var(--panel);color:var(--text);
    border-bottom:.5px solid var(--border);font-size:10.5px;letter-spacing:.04em}
  .prov td{padding:6px 11px;border-bottom:.5px solid var(--border);color:var(--muted)}
  .prov tr:last-child td{border-bottom:0}
  .prov td.k{color:var(--text);font-weight:600}
  .prov td.m{font-family:"Cascadia Code",Consolas,monospace;font-size:11px}
  .prov td .chipx{display:inline-block;width:9px;height:9px;border-radius:2px;vertical-align:-1px;margin-right:5px;
    border:.5px solid rgba(255,255,255,.15)}
  .prov td .tg{display:inline-block;padding:1px 6px;border-radius:5px;font-size:10px;font-weight:700;
    letter-spacing:.04em;border:.5px solid rgba(255,255,255,.12)}
  .prov td .t-a1{background:rgba(46,160,67,.20);color:#7ee2a0}
  .prov td .t-a2{background:rgba(210,153,34,.20);color:#f0c674}
  .prov td .t-b{background:rgba(56,139,253,.18);color:#8cc0ff}
  .prov td .t-c{background:rgba(188,140,255,.18);color:#c9a6ff}
  .atab{width:100%;border-collapse:collapse;font-size:12px;border:.5px solid var(--border);border-radius:10px;overflow:hidden}
  .atab th{text-align:left;font-weight:600;padding:9px 12px;background:var(--panel);color:var(--text);
    border-bottom:.5px solid var(--border);font-size:11px}
  .atab td{padding:9px 12px;border-bottom:.5px solid var(--border);color:var(--muted)}
  .atab tr:last-child td{border-bottom:0}
  .atab td.v{color:var(--success);font-weight:600}
  .atab td.k{color:var(--text);font-weight:600}
  .atab td.m{font-family:"Cascadia Code",Consolas,monospace;font-size:11px}
  .legend{display:flex;gap:16px;margin-top:16px;font-size:11px;color:var(--muted);flex-wrap:wrap}
  .legend span{display:flex;align-items:center;gap:6px}
  .legend i{width:9px;height:9px;border-radius:3px}
  .foot{display:flex;justify-content:space-between;margin-top:22px;font-size:10.5px;color:var(--dim)}
"""

def swatch_grid():
    order = [("bg", "background"), ("bg", "backgroundPanel"), ("bg", "backgroundElement"), ("bg", "sidebarBg"),
             ("bg", "bubbleBg"), ("bg", "inputBg"), ("bg", "codeBlockBg"), ("bg", "codeHeaderBg"),
             ("text", "text"), ("text", "textMuted"),
             ("brand", "primary"), ("brand", "secondary"), ("brand", "info"), ("brand", "success"),
             ("brand", "warning"), ("brand", "error"),
             ("border", "border"), ("border", "borderActive"),
             ("diff", "diffAdded"), ("diff", "diffAddedBg"), ("diff", "diffAddedLineNumberBg"),
             ("diff", "diffRemoved"), ("diff", "diffRemovedBg"), ("diff", "diffRemovedLineNumberBg"),
             ("md", "markdownHeading"), ("md", "markdownLink"), ("md", "markdownCode"),
             ("md", "markdownEmph"), ("md", "markdownStrong"), ("md", "markdownBlockQuote"),
             ("syn", "syntaxComment"), ("syn", "syntaxKeyword"), ("syn", "syntaxFunction"),
             ("syn", "syntaxType"), ("syn", "syntaxNumber"), ("syn", "syntaxString"), ("syn", "syntaxOperator")]
    out = []
    for g, k in order:
        v = C[k]; f = fgof(v)
        out.append('<div class="sw"><div class="top" style="background:%s;color:%s"><span class="hex">%s</span></div>'
                   '<div class="lbl"><i>%s</i><b>%s</b></div></div>' % (v, f, v, g, k))
    return "\n".join(out)

TIER_CLS = {"A1": "t-a1", "A2": "t-a2", "B": "t-b", "C": "t-c"}
def prov_rows():
    out = []
    for slot, p in PROV.items():
        v = p["value"]
        detail = p["measured_as"]
        if p["tier"] == "A2" and "blend" in p:
            b = p["blend"]
            detail = "%s + %s @%.0f%%" % (b["a"], b["b"], b["mix"] * 100)
        elif p["tier"] == "C":
            detail = "%s → L*%.0f" % (p["stepFrom"], p["stepToL"])
        out.append('<tr><td class="k">%s</td>'
                   '<td class="m"><span class="chipx" style="background:%s"></span>%s</td>'
                   '<td class="m"><span class="tg %s">%s</span></td>'
                   '<td class="m">%s</td>'
                   '<td class="m">%s</td>'
                   '<td class="m">%s</td>'
                   '<td>%s</td></tr>'
                   % (slot, v, v, TIER_CLS[p["tier"]], p["tier"],
                      p["measured_in"].replace("+", " / "), detail,
                      "{:,}".format(p["measured_px"]), p["note"]))
    return "\n".join(out)

def ladder():
    out = []
    for i, k in enumerate(P["ladder"]["order"]):
        s = P["surfaces"][k]; v = s["hex"]
        st = P["ladder"]["steps"]
        gap = ("<span class='x'>ΔL %+.2f</span>" % st[i - 1]) if i else ""
        out.append('<div class="step" style="background:%s;color:%s"><span class="l">L* %s</span>'
                   '<span class="k">bg</span><span class="h">%s</span><span class="x">%s</span>%s</div>'
                   % (v, fgof(v), s["L"], k, v, gap))
    return "\n".join(out)

hard_f = [p for p in PAIRS if p["class"] == "hard"]
ui_f = [p for p in PAIRS if p["class"] == "ui"]
worst_h = sorted(hard_f, key=lambda p: p["ratio"])[:4]
worst_u = sorted(ui_f, key=lambda p: p["ratio"])[:4]
syn = P["syntax"]
def bycode(code):
    return next(p for p in PAIRS if p["code"] == code)

def rows(ps):
    return "\n".join('<tr><td class="k">%s</td><td class="v">%s : 1</td><td class="m">%s / %s</td></tr>'
                     % (p["code"], ("%.2f" % p["ratio"]), p["fg"], p["bg"]) for p in ps)

HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>Marvel theme preview — 逐像素取色 · 墨夜熔金</title>
<style>__CSS__</style>
</head>
<body>
<div class="sheet">
  <div class="eyebrow">DSH / OpenCode Palette · IP Preset · 逐像素取色重绘</div>
  <h1 class="title">漫威 <em>Marvel</em> — 墨夜 · 熔金 · 火焰</h1>
  <div class="sub">这一版<b>没有一个颜色是我想出来的</b>。对抗式审查把「37/37 直采」这句自夸拆成了四级判尺：<b>A1 实涂 9 条</b>（图上真被平涂过的色）、<b>A2 边阶 11 条</b>（能被证明是两个平涂色的抗锯齿混合）、<b>B 簇采 15 条</b>（中位切分簇心，图里没有这个字面值，代表一片实际区域）、<b>C 阶梯 2 条</b>（以画面里唯一的有彩绿为源，只改 L*）。三张图本身是幻灯片，所以版面本身也是色源：<b>#1C1C22</b> 的版式底占了全部像素的 38.1%，<b>#FFCB05</b> 的页脚黄出现了 8,917 次，<b>#F11E22</b> 的标志红占 logo 图的 22.5%。仓库审计器实测：38 条硬性 4.5:1 与 15 条 UI 3:1 <b>零违例</b>，语法五核心两两 ΔE 最小 <b>__CORMIN__</b>。</div>
  <div class="anchors">
    <span class="anchor"><i style="background:#D32B28"></i>战甲红 <em>#D32B28</em></span>
    <span class="anchor"><i style="background:#EAC38D"></i>熔金 <em>#EAC38D</em></span>
    <span class="anchor"><i style="background:#DB7930"></i>火焰橙 <em>#DB7930</em></span>
    <span class="anchor"><i style="background:#FFCB05"></i>页脚黄 <em>#FFCB05</em></span>
    <span class="anchor"><i style="background:#1C1C22"></i>版面墨 <em>#1C1C22</em></span>
    <span class="anchor"><i style="background:#81B0DE"></i>夜空蓝 <em>#81B0DE</em></span>
  </div>

  <div class="win">
    <aside class="sb">
      <div class="brand">
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
          <rect x="1" y="1" width="24" height="24" rx="4" fill="#F11E22"/>
          <path d="M6 18.5V7.5L13 13.6L20 7.5V18.5" stroke="#F3F1F5" stroke-width="2.6" fill="none" stroke-linejoin="miter" stroke-linecap="square"/>
        </svg>
        <span class="name">漫威</span><span class="badge">DSH</span>
      </div>
      <div class="ws"><span class="dot">漫</span><span>marvel</span><span class="caret">▾</span></div>
      <div class="nav">
        <div class="it on"><span class="ic round"></span>新会话<span style="margin-left:auto;font-size:10px;color:var(--dim)">⌘N</span></div>
        <div class="it"><span class="ic"></span>会话历史</div>
        <div class="it"><span class="ic"></span>文件</div>
        <div class="it"><span class="ic round"></span>终端</div>
      </div>
      <div class="side-lbl">最近</div>
      <div class="threads">
        <div class="th sel">漫威主题 · 逐像素取色</div>
        <div class="th">三张参考图的全图普查</div>
        <div class="th">37 色位溯源表</div>
        <div class="th">反白约束：为什么主品牌不是标志红</div>
        <div class="th">语法七色的 ΔE 重建</div>
      </div>
      <div class="sb-foot"><span class="av">辰</span><span>辰辰洋洋</span><span class="gear">⚙</span></div>
    </aside>

    <main class="main">
      <div class="topbar">
        <span class="h">漫威主题 · 设计评审</span>
        <span class="crumb">/ 37 tokens · dark · 逐像素取色</span>
        <div class="right">
          <span class="chip"><i class="idle"></i>就绪</span>
          <span class="chip"><i></i>deepseek-flash</span>
          <button class="btn ghost">分享</button>
          <button class="btn primary">新建会话</button>
        </div>
      </div>

      <div class="feed"><div class="col">
        <div class="user"><div class="bub">别自己配色了，把这三张图里真实存在的颜色用起来。</div></div>

        <div class="who">
          <span class="k">
            <svg width="20" height="20" viewBox="0 0 26 26"><rect x="1" y="1" width="24" height="24" rx="4" fill="#F11E22"/><path d="M6 18.5V7.5L13 13.6L20 7.5V18.5" stroke="#F3F1F5" stroke-width="2.6" fill="none" stroke-linejoin="miter" stroke-linecap="square"/></svg>
          </span>
          <span class="n">辰辰洋洋</span><span class="t">marvel.json</span>
        </div>

        <div class="md">
          <h2>漫威主题 · 37 色位，四级判尺，没有一色是臆造的</h2>
          <p>核心只有一句话：<strong>版面本身也是色源</strong>。这三张是幻灯片，所以它们的底色 <code>#1C1C22</code>（占全部像素 38.1%）、页脚黄 <code>#FFCB05</code>（8,917 px）、版式边框 <code>#40404A</code>（1,540 px）全都成了主题的表面与边界——代码区甚至直接用蜘蛛侠的<b>纯墨线</b> <code>#000000</code>，让语法色跳出来。四个取舍：</p>
          <ul>
            <li>主品牌不是标志红。标志红 <code>#F11E22</code> 是全图最饱和的红，但太亮——反白只有 <b>3.83:1</b>，撑不起主按钮。改用铁人的战甲红 <code>#D32B28</code>，反白 <b>4.61:1</b>，色相一帧未让（358°→1°）。</li>
            <li>焦点环与主按钮<b>故意拆开</b>：焦点环用最亮的标志红 <code>#F11E22</code>，主按钮用能反白的战甲红。这样「红即品牌即焦点」不再是同一个值——岗位串戏从 1 处降到 <b>0 处</b>。</li>
            <li>第二品牌是<b>熔金</b> <code>#EAC38D</code>，不是通用蓝：铁人盔甲本体是金。primary↔secondary 色相差 33.8°，是<b>类比</b>几何（暖对暖），比旧版红蓝 145.9° 的互补更接近海报质感。</li>
            <li>成功色只有 22 个像素：<code>#006752</code> 是蜘蛛侠护目镜反光里唯一的一道绿。全图再没有第二个绿——那就让它稀有，并只沿明度往上走一档（<code>#62B59C</code> / <code>#40947D</code>），保住色相不漂。</li>
          </ul>
          <blockquote>墨是夜的，金是火里的，红只负责让人看见按钮。</blockquote>

          <div class="cc">
            <div class="hd"><span class="lang">json</span><span class="fn">src/custom-presets/marvel.json</span><span class="cp">复制</span></div>
<pre><span class="tk-com">// 37 槽 · 每一行都能在参考图里指出来</span>
{
  <span class="tk-fn">"background"</span>:     <span class="tk-str">"#0C0C10"</span>,   <span class="tk-com">// A1 幻灯片深墨条（81,125 px）</span>
  <span class="tk-fn">"codeBlockBg"</span>:   <span class="tk-str">"#000000"</span>,   <span class="tk-com">// A1 蜘蛛侠 纯墨线（20,078 px）</span>
  <span class="tk-fn">"text"</span>:          <span class="tk-str">"#EEEEF4"</span>,   <span class="tk-com">// A1 幻灯片正文冷白（6,499 px）</span>
  <span class="tk-fn">"primary"</span>:       <span class="tk-str">"#D32B28"</span>,   <span class="tk-com">// B  铁人 战甲红（区域 21,526 px，反白 4.61:1）</span>
  <span class="tk-fn">"borderActive"</span>:  <span class="tk-str">"#F11E22"</span>,   <span class="tk-com">// A1 标志红（60,287 px，焦点环）</span>
  <span class="tk-fn">"secondary"</span>:     <span class="tk-str">"#EAC38D"</span>,   <span class="tk-com">// B  窗光与盔甲的熔金</span>
  <span class="tk-fn">"success"</span>:       <span class="tk-str">"#62B59C"</span>,   <span class="tk-com">// C  #006752 提亮到 L*68</span>
  <span class="tk-fn">"syntaxKeyword"</span>: <span class="tk-str">"#F44A4D"</span>,   <span class="tk-com">// A2 标志红被白光冲开的第一档</span>
  <span class="tk-fn">"syntaxString"</span>:  <span class="tk-str">"#F0E5D8"</span>    <span class="tk-com">// B  盔甲高光洗白后的暖白</span>
}</pre>
          </div>

          <table>
            <tr><th>检查项</th><th>结果</th><th>色值</th></tr>
            <tr><td>正文对比（最深表面）</td><td><span class="ok">__R_TEXT__ : 1</span></td><td class="mono">#EEEEF4 / #000000</td></tr>
            <tr><td>主按钮反白</td><td><span class="ok">__R_INV__ : 1</span></td><td class="mono">#F4F4F5 / #D32B28</td></tr>
            <tr><td>焦点环（最浅表面）</td><td><span class="ok">__R_FOCUS__ : 1</span></td><td class="mono">#F11E22 / #2D2D32</td></tr>
            <tr><td>语法五核心最小 ΔE</td><td><span class="ok">__CORMIN__</span></td><td class="mono">__CORMINROLES__</td></tr>
            <tr><td>品牌几何</td><td><span class="ok">__GEOM__</span></td><td class="mono">primary ↔ secondary</td></tr>
          </table>

          <div class="warn">
            <span class="tag">已知限制</span>
            <span>提示气泡的<strong>文字色</strong>由 DSH 写死为白色，只把背景换成主题浮层色——深色主题下这一项不成立；真正修不到的是 <code>border</code> 的 8 个表面本身都低于 3:1，这是暗色细线的固有代价。</span>
          </div>

          <div class="diff">
            <div class="ln rm"><span class="no">41</span><span class="sign">-</span><span class="code">  "primary": "#d51a20",</span></div>
            <div class="ln rm"><span class="no">42</span><span class="sign">-</span><span class="code">  "secondary": "#2e8fff",</span></div>
            <div class="ln add"><span class="no">41</span><span class="sign">+</span><span class="code">  "primary": "#D32B28",</span></div>
            <div class="ln add"><span class="no">42</span><span class="sign">+</span><span class="code">  "secondary": "#EAC38D",</span></div>
          </div>

          <div class="tool">
            <div class="row"><span class="pulse"></span><span class="name">node scripts/audit-themes.ts --check</span><span class="st"><i></i>已完成</span></div>
            <div class="out">
              [1] 38 条硬性 4.5:1 对：<b>0 违例</b><br>
              [2] 15 条 UI 3:1 对：<b>0 违例</b><br>
              [3] 背景色相孤岛：<b>0</b>（8 级表面同族）<br>
              [4] 岗位串戏：<b>0</b>（primary 与 borderActive 已拆开）<br>
              [5] 设计告警：<b>0 条待处理</b>
            </div>
          </div>
        </div>
      </div></div>

      <div class="toast"><i></i><span>主题已保存 · 37 色位</span><span class="sub">A1 9 · A2 11 · B 15 · C 2</span></div>

      <div class="composer"><div class="col">
        <div class="cbox">
          <div class="ph">继续调整配色，或问我任意细节…</div>
          <div class="row">
            <span class="pill"><i></i>marvel.json</span>
            <span class="pill">dark</span>
            <button class="btn ghost" style="width:26px;height:26px;padding:0">＋</button>
            <span class="sp"></span>
            <button class="btn ghost" style="width:26px;height:26px;padding:0">⚙</button>
            <button class="send">↑</button>
          </div>
        </div>
        <div class="hint">Enter 发送 · Shift + Enter 换行
          <span class="r"><span class="chip" style="padding:2px 8px">37 tokens</span><span>漫威</span></span>
        </div>
      </div></div>
    </main>
  </div>

  <!-- 取色溯源 -->
  <div class="sect">
    <div class="head"><h3>取色溯源</h3><span class="hintx">三张参考图 → 全图量化普查 → 37 个色位；每一步都可回溯</span></div>
    <div class="src">
      __SRC_CARDS__
    </div>
  </div>

  <!-- 37 色位溯源表 -->
  <div class="sect">
    <div class="head"><h3>37 槽溯源表</h3><span class="hintx">终值 → 判据级别 → 来源图 → 推导方式 → 图中体量（四级判尺，没有一色来自图外臆造）</span></div>
    <table class="prov">
      <tr><th style="width:15%">色位</th><th style="width:9%">终值</th><th style="width:5%">级</th>
          <th style="width:13%">来源</th><th style="width:18%">推导方式</th><th style="width:8%">体量</th><th>说明</th></tr>
      __PROV_ROWS__
    </table>
  </div>

  <!-- 表面阶梯 -->
  <div class="sect">
    <div class="head"><h3>Surface Ladder</h3><span class="hintx">8 级表面 · 同一色相族 · 只靠明度分层（不靠边框分割）</span></div>
    <div class="lad">__LADDER__</div>
  </div>

  <!-- 37 tokens -->
  <div class="tokens sect">
    <div class="head"><h3>37 Color Tokens</h3><span class="hintx">色位 → DSH 真实槽名 → 终值</span></div>
    <div class="grid">
__GRID__
    </div>
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
  </div>

  <!-- 判据报告 -->
  <div class="sect">
    <div class="head"><h3>判据报告</h3><span class="hintx">docs/theme-audit/criteria.md · 38 硬性对 + 15 UI 对 + IP 设计规范</span></div>
    <table class="atab">
      <tr><th style="width:30%">检查项</th><th style="width:14%">结果</th><th style="width:56%">色值 / 说明</th></tr>
      <tr><td class="k">硬性对比（38 对 · 4.5:1）</td><td class="v">0 违例</td><td class="m">最紧 __WH__
      </td></tr>
      <tr><td class="k">UI / 交互（15 对 · 3:1）</td><td class="v">0 违例</td><td class="m">最紧 __WU__</td></tr>
      <tr><td class="k">主按钮反白（contrastText）</td><td class="v">__R_INV__ : 1</td><td class="m">#F4F4F5 @ #D32B28 · luma 0.365 → 取浅色前景</td></tr>
      <tr><td class="k">背景家族纯净（色相孤岛）</td><td class="v">0 个</td><td class="m">8 级表面同族，最大色相偏差 ≤ 18°</td></tr>
      <tr><td class="k">岗位串戏（同值不同岗）</td><td class="v">0 处</td><td class="m">primary 与 borderActive 主动拆开（焦点环要最亮，按钮要能反白）</td></tr>
      <tr><td class="k">品牌第二色几何</td><td class="v">__GEOM__</td><td class="m">primary 1° ↔ secondary 35° · 红金暖对暖</td></tr>
      <tr><td class="k">语法五核心区分度（ΔE76）</td><td class="v">__CORMIN__</td><td class="m">__CORMINROLES__ · 门槛 ≥ 10</td></tr>
      <tr><td class="k">comment / operator 退后</td><td class="v">__RC__ / __RO__</td><td class="m">低于全部核心角色（最低 __COREMINCON__），构成两级退后梯队</td></tr>
      <tr><td class="k">markdown 六角色同值</td><td class="v">0 处</td><td class="m">heading / link / code / emph / strong / blockQuote 全部独立</td></tr>
      <tr><td class="k">色源约束（四级判尺）</td><td class="v">A1 9 · A2 11 · B 15 · C 2</td><td class="m">9 条是图上真平涂过的色，11 条能被证明是两个平涂色的抗锯齿混合，15 条落在实际区域里，2 条是画面唯一那抹绿的明度台阶</td></tr>
    </table>
  </div>

  <div class="foot"><span>Marvel theme · 37 colors · dark · 逐像素取色 · src/custom-presets/marvel.json</span><span>design by 辰辰洋洋 · first principles</span></div>
</div>
</body>
</html>
"""

src_cards = []
KEYCHIPS = {"01-spiderman": ["#1C1C22", "#0C0C10", "#000000", "#FFCB05", "#81B0DE", "#006752"],
            "02-ironman": ["#1C1C22", "#D32B28", "#EAC38D", "#DB7930", "#F7E4AB", "#331310"],
            "03-logo": ["#1C1C22", "#F11E22", "#FFFFFF", "#F44A4D", "#F56568", "#40404A"]}
for f, img in zip(FILES, IMGS):
    title, sub = NAMES[f]
    chips = "".join('<span><i style="background:%s"></i>%s</span>' % (h, h)
                    for h in KEYCHIPS[POSTER[f]])
    src_cards.append(
        '<div class="sc"><img src="%s" alt="%s"><div class="meta"><h4>%s</h4><p>%s</p>'
        '<div class="chips">%s</div></div></div>' % (img, title, title, sub, chips))

HTML = (HTML.replace("__CSS__", CSS.replace("__VARS__", VARS))
        .replace("__SRC_CARDS__", "\n".join(src_cards))
        .replace("__PROV_ROWS__", prov_rows())
        .replace("__LADDER__", ladder())
        .replace("__GRID__", swatch_grid())
        .replace("__CORMIN__", str(syn["coreMin"]["deltaE"]))
        .replace("__CORMINROLES__", "%s ↔ %s" % tuple(syn["coreMin"]["roles"]))
        .replace("__GEOM__", "%.1f° %s" % (P["brandGeometry"]["deg"], P["brandGeometry"]["type"]))
        .replace("__WH__", "%s %s" % (worst_h[0]["code"], "%.2f" % worst_h[0]["ratio"]))
        .replace("__WU__", "%s %s" % (worst_u[0]["code"], "%.2f" % worst_u[0]["ratio"]))
        .replace("__R_TEXT__", "%.2f" % bycode("text@codeBlockBg")["ratio"])
        .replace("__R_INV__", "%.2f" % bycode("contrastText(primary)@primary")["ratio"])
        .replace("__R_FOCUS__", "%.2f" % bycode("borderActive@backgroundElement")["ratio"])
        .replace("__RC__", "%.2f" % syn["recede"]["syntaxComment"]["contrast"])
        .replace("__RO__", "%.2f" % syn["recede"]["syntaxOperator"]["contrast"])
        .replace("__COREMINCON__", "%.2f" % min(syn["coreContrast"].values())))

out = os.path.join(REPO, "prototypes", "marvel-theme-preview.html")
open(out, "w", encoding="utf-8", newline="\n").write(HTML)
print("wrote", out, os.path.getsize(out), "bytes")
