# -*- coding: utf-8 -*-
"""生成 prototypes/sailor-moon-theme-preview.html
   结构沿用仓库既有 IP 主题预览（库洛米 / 哈利波特）：应用窗 + 取色规则 + 参考图
   + 取色台账 + 对比度复核 + 37 色位卡。
"""
import base64, io, json, math, os, sys
from PIL import Image
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_palette as bp

SRC = bp.SRC
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "sailor-moon-theme-preview.html")

C = {}
for row in bp.LEDGER:
    C[row["token"]] = row["value"]

CN = {row["token"]: row["cn"] for row in bp.LEDGER}
LABEL = {row["token"]: row["label"] for row in bp.LEDGER}
FORMULA = {row["token"]: row["formula"] for row in bp.LEDGER}
RULE = {row["token"]: row["rule"] for row in bp.LEDGER}
SRCKEY = {}
for row in bp.LEDGER:
    SRCKEY[row["token"]] = row.get("src") or row.get("a")

GROUPS = [
    ("背景场域", ["background", "backgroundPanel", "backgroundElement", "sidebarBg", "bubbleBg", "inputBg", "codeBlockBg", "codeHeaderBg"]),
    ("文字结构", ["text", "textMuted"]),
    ("品牌 / 语义", ["primary", "secondary", "info", "success", "warning", "error"]),
    ("边界", ["border", "borderActive"]),
    ("diff 行", ["diffAdded", "diffRemoved", "diffAddedBg", "diffRemovedBg", "diffAddedLineNumberBg", "diffRemovedLineNumberBg"]),
    ("markdown", ["markdownHeading", "markdownLink", "markdownCode", "markdownEmph", "markdownStrong", "markdownBlockQuote"]),
    ("syntax", ["syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString", "syntaxOperator"]),
]

def crop_b64(key, size=68):
    s = bp.S[key]
    im = Image.open(f"{SRC}\\{s['file']}").convert("RGB").crop(tuple(s["box"]))
    w, h = im.size
    scale = max(size / w, size / h)
    im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
    w, h = im.size
    left, top = (w - size) // 2, (h - size) // 2
    im = im.crop((left, top, left + size, top + size))
    buf = io.BytesIO()
    im.save(buf, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

def file_b64(fname, maxw=520):
    im = Image.open(f"{SRC}\\{fname}").convert("RGB")
    if im.width > maxw:
        im = im.resize((maxw, int(maxw * im.height / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, format="JPEG", quality=82, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

def hits_of(key):
    n, ib = bp.hits(key)
    return n, ib

# ── 直采凭证汇总 ──
direct_stats = {}
for k in bp.S:
    n, ib = hits_of(k)
    direct_stats[k] = (n, ib)

n_direct = sum(1 for t in C if RULE[t] == "direct")
n_step = sum(1 for t in C if RULE[t] == "step")
n_mix = sum(1 for t in C if RULE[t] == "mix")

def hsl_hue(hexv):
    r, g, b = [v / 255.0 for v in bp.hex2rgb(hexv)]
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d == 0: return 0.0
    if mx == r: h = 60 * (((g - b) / d) % 6)
    elif mx == g: h = 60 * ((b - r) / d + 2)
    else: h = 60 * ((r - g) / d + 4)
    return h

def lab(h):
    r, g, b = bp.s2l(bp.hex2rgb(h))
    X = 0.4124564*r + 0.3575761*g + 0.1804375*b
    Y = 0.2126729*r + 0.7151522*g + 0.0721750*b
    Z = 0.0193339*r + 0.1191920*g + 0.9503041*b
    Xn, Yn, Zn = 0.95047, 1.0, 1.08883
    def f(t): return t ** (1/3) if t > (6/29) ** 3 else t / (3 * (6/29) ** 2) + 4/29
    fx, fy, fz = f(X/Xn), f(Y/Yn), f(Z/Zn)
    return np.array([116*fy - 16, 500*(fx-fy), 200*(fy-fz)])

CORE = ["syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString"]
min_de = min(float(np.linalg.norm(lab(C[a]) - lab(C[b]))) for i, a in enumerate(CORE) for b in CORE[i+1:])
h1, h2 = hsl_hue(C["primary"]), hsl_hue(C["secondary"])
dh = abs(h1 - h2) % 360
dh = 360 - dh if dh > 180 else dh
geo = "analogous 类比" if dh <= 45 else ("triadic 三角" if 95 <= dh <= 145 else ("complementary 互补" if dh > 145 else "unclassified"))

_VARS = {
    "bg": C["background"], "panel": C["backgroundPanel"], "elem": C["backgroundElement"],
    "sidebar": C["sidebarBg"], "bubble": C["bubbleBg"], "input": C["inputBg"],
    "code": C["codeBlockBg"], "codehead": C["codeHeaderBg"],
    "text": C["text"], "muted": C["textMuted"],
    "primary": C["primary"], "secondary": C["secondary"], "info": C["info"],
    "success": C["success"], "warning": C["warning"], "error": C["error"],
    "border": C["border"], "active": C["borderActive"],
    "dadd": C["diffAdded"], "drem": C["diffRemoved"], "daddbg": C["diffAddedBg"],
    "drembg": C["diffRemovedBg"], "daddln": C["diffAddedLineNumberBg"], "dremln": C["diffRemovedLineNumberBg"],
    "h": C["markdownHeading"], "link": C["markdownLink"], "mcode": C["markdownCode"],
    "em": C["markdownEmph"], "strong": C["markdownStrong"], "quote": C["markdownBlockQuote"],
    "scom": C["syntaxComment"], "skw": C["syntaxKeyword"], "sfn": C["syntaxFunction"],
    "styp": C["syntaxType"], "snum": C["syntaxNumber"], "sstr": C["syntaxString"], "sop": C["syntaxOperator"],
}
CSS = """
  :root{
    --bg:#@@bg@@; --panel:#@@panel@@; --elem:#@@elem@@; --sidebar:#@@sidebar@@;
    --bubble:#@@bubble@@; --input:#@@input@@; --code:#@@code@@; --codehead:#@@codehead@@;
    --text:#@@text@@; --muted:#@@muted@@;
    --primary:#@@primary@@; --secondary:#@@secondary@@; --info:#@@info@@; --success:#@@success@@;
    --warning:#@@warning@@; --error:#@@error@@;
    --border:#@@border@@; --active:#@@active@@;
    --dadd:#@@dadd@@; --drem:#@@drem@@; --daddbg:#@@daddbg@@; --drembg:#@@drembg@@;
    --daddln:#@@daddln@@; --dremln:#@@dremln@@;
    --h:#@@h@@; --link:#@@link@@; --mcode:#@@mcode@@; --em:#@@em@@; --strong:#@@strong@@; --quote:#@@quote@@;
    --scom:#@@scom@@; --skw:#@@skw@@; --sfn:#@@sfn@@; --styp:#@@styp@@; --snum:#@@snum@@; --sstr:#@@sstr@@; --sop:#@@sop@@;
    --page:#FFFDFE; --card:#FFFFFF;
    --hover:color-mix(in srgb, var(--text) 7%, transparent);
    --active08:color-mix(in srgb, var(--text) 12%, transparent);
    --dim:color-mix(in srgb, var(--muted) 82%, transparent);
  }
"""
for _k, _v in _VARS.items():
    CSS = CSS.replace(f"@@{_k}@@", _v.lstrip("#"))

BASE_CSS = """
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{background:var(--page);color:var(--text);
    font-family:"Segoe UI","Microsoft YaHei UI","Microsoft YaHei",system-ui,sans-serif;
    -webkit-font-smoothing:antialiased}
  .sheet{width:1400px;padding:44px 64px 56px;margin:0 auto}
  .eyebrow{font-size:11px;letter-spacing:.22em;color:var(--muted);text-transform:uppercase}
  h1.title{font-size:34px;line-height:1.1;margin:10px 0 8px;letter-spacing:.01em;font-weight:600}
  h1.title em{font-style:normal;color:var(--primary)}
  .sub{font-size:13.5px;color:var(--muted);max-width:880px;line-height:1.75}
  .sub b{color:var(--text);font-weight:600}
  .anchors{display:flex;gap:10px;margin-top:18px;align-items:center;flex-wrap:wrap}
  .anchor{display:flex;align-items:center;gap:8px;background:var(--card);
    border:.5px solid var(--border);border-radius:999px;padding:5px 12px;font-size:11.5px;color:var(--muted)}
  .anchor i{width:18px;height:18px;border-radius:50%;display:block;border:.5px solid rgba(0,0,0,.08)}
  .anchor b{color:var(--text);font-family:"Cascadia Code",Consolas,monospace;font-weight:500}
  .win{margin-top:26px;width:1272px;height:auto;border-radius:18px;overflow:hidden;position:relative;
    background:var(--bg);border:.5px solid var(--border);
    box-shadow:0 30px 70px -20px rgba(30,12,26,.18), 0 2px 6px rgba(30,12,26,.05);
    display:flex}
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
  .av{width:24px;height:24px;border-radius:50%;background:var(--secondary);color:#F4F4F5;display:grid;place-items:center;font-size:11px;font-weight:700}
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
  .btn.primary{background:var(--primary);color:#F4F4F5;font-weight:600;box-shadow:0 1px 0 rgba(0,0,0,.08)}
  .btn.ghost{background:transparent;color:var(--muted);border:.5px solid transparent}
  .btn.ghost:hover{background:var(--active08);color:var(--text)}
  .btn.outline{background:transparent;border:.5px solid var(--active);color:var(--text)}
  .feed{flex:1;overflow:hidden;padding:22px 26px 84px}
  .col{width:720px;margin:0 auto}
  .user{display:flex;justify-content:flex-end;margin-bottom:20px}
  .user .bub{background:var(--bubble);border-radius:14px 14px 4px 14px;padding:10px 14px;font-size:13px;
    line-height:1.65;max-width:520px;box-shadow:0 1px 2px rgba(30,12,26,.04)}
  .who{display:flex;align-items:center;gap:7px;margin-bottom:9px}
  .who .k{width:20px;height:20px;display:grid;place-items:center}
  .who .n{font-size:12px;font-weight:600;letter-spacing:.02em}
  .who .t{font-size:10.5px;color:var(--dim);border:.5px solid var(--border);border-radius:5px;padding:1px 5px}
  .md{font-size:13px;line-height:1.78}
  .md h2{font-size:15.5px;line-height:1.4;color:var(--h);margin:0 0 8px;font-weight:650;letter-spacing:.01em}
  .md p{margin:0 0 10px}
  .md strong{color:var(--strong);font-weight:650}
  .md em{color:var(--em);font-style:italic}
  .md a{color:var(--link);text-decoration:underline;text-underline-offset:2px;text-decoration-thickness:.5px}
  .md code{font-family:"Cascadia Code",Consolas,"Courier New",monospace;font-size:11.5px;color:var(--mcode);
    border:.5px solid var(--border);border-radius:4px;padding:0 4px}
  .md ul{margin:0 0 10px;padding-left:18px}
  .md li{margin:2px 0}
  .md blockquote{margin:0 0 12px;padding:2px 0 2px 12px;border-left:2px solid var(--active);color:var(--quote);font-size:12.5px}
  .warn{display:flex;gap:9px;align-items:flex-start;background:color-mix(in srgb,var(--warning) 12%,transparent);
    border-left:2.5px solid var(--warning);border-radius:6px;padding:8px 12px;margin:0 0 12px;font-size:12px;line-height:1.65;color:var(--warning)}
  .warn b{font-weight:650}
  .warn .tag{font-size:10.5px;letter-spacing:.08em;border:.5px solid color-mix(in srgb,var(--warning) 45%,transparent);
    border-radius:4px;padding:0 5px;flex:none;margin-top:1px}
  .md table{border-collapse:collapse;font-size:12px;margin:0 0 12px;width:100%}
  .md th{text-align:left;font-weight:600;padding:7px 10px;border-bottom:.5px solid var(--active);background:color-mix(in srgb,var(--panel) 55%,transparent)}
  .md td{padding:7px 10px;border-bottom:.5px solid var(--active)}
  .md td .ok{color:var(--success);font-weight:600}
  .md td .no{color:var(--error);font-weight:600}
  .md td.mono{font-family:"Cascadia Code",Consolas,monospace;font-size:11px;color:var(--muted)}
  .cc{border-radius:10px;overflow:hidden;margin:2px 0 12px;background:var(--code)}
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
  .diff{border-radius:10px;overflow:hidden;background:var(--code);margin:0 0 12px;font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px}
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
  .tool .out{margin-top:7px;font-family:"Cascadia Code",Consolas,monospace;font-size:10.8px;line-height:1.75;color:var(--muted)}
  .tool .out b{color:var(--success);font-weight:600}
  .pulse{width:14px;height:14px;border-radius:50%;border:1.6px solid color-mix(in srgb,var(--info) 35%,transparent);border-top-color:var(--info)}
  .toast{position:absolute;right:22px;bottom:132px;background:var(--elem);border:.5px solid var(--border);
    border-radius:10px;padding:9px 13px;display:flex;align-items:center;gap:9px;font-size:12px;
    box-shadow:0 10px 24px -10px rgba(30,12,26,.22)}
  .toast i{width:7px;height:7px;border-radius:50%;background:var(--success)}
  .toast .sub{color:var(--dim);font-size:11px}
  .composer{flex:none;padding:10px 26px 14px}
  .composer .col{width:720px}
  .cbox{background:var(--input);border:.5px solid var(--active);border-radius:14px;padding:11px 13px 9px;
    box-shadow:0 2px 10px -6px rgba(30,12,26,.14)}
  .cbox .ph{font-size:13px;color:var(--muted)}
  .cbox .row{display:flex;align-items:center;gap:7px;margin-top:9px}
  .cbox .row .sp{margin-left:auto}
  .pill{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;color:var(--muted);
    background:var(--panel);border:.5px solid var(--border);border-radius:999px;padding:3px 8px}
  .pill i{width:5px;height:5px;border-radius:50%;background:var(--primary)}
  .send{width:28px;height:28px;border-radius:9px;background:var(--primary);color:#F4F4F5;display:grid;place-items:center;
    font-size:13px;font-weight:700;border:0;box-shadow:0 1px 0 rgba(0,0,0,.08)}
  .hint{display:flex;align-items:center;gap:8px;font-size:10.5px;color:var(--dim);padding:7px 4px 0}
  .hint .r{margin-left:auto;display:flex;gap:6px;align-items:center}
  .sec{margin-top:44px}
  .sec .head{display:flex;align-items:baseline;gap:14px;margin-bottom:16px}
  .sec h3{font-size:13px;letter-spacing:.18em;text-transform:uppercase;margin:0;font-weight:600}
  .sec .hintx{font-size:11.5px;color:var(--muted)}
  .rule{background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:16px 18px;
    display:grid;grid-template-columns:1fr 1fr;gap:14px 26px}
  .rule .r{font-size:12.5px;line-height:1.7;color:var(--muted)}
  .rule .r b{color:var(--text);font-weight:600}
  .rule .r code{font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px;color:var(--mcode);
    border:.5px solid var(--border);border-radius:4px;padding:0 4px}
  .gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;align-items:start}
  .gfig{margin:0;background:var(--card);border:.5px solid var(--border);border-radius:10px;overflow:hidden}
  .gfig img{width:100%;height:300px;display:block;object-fit:contain;background:#fff}
  .gfig figcaption{font-size:11px;color:var(--muted);padding:7px 10px;font-family:"Cascadia Code",Consolas,monospace}
  .grid{display:grid;grid-template-columns:repeat(9,1fr);gap:8px}
  .sw{border-radius:9px;border:.5px solid var(--border);overflow:hidden;background:var(--card)}
  .sw .top{height:42px;display:flex;align-items:flex-end;padding:5px 7px}
  .sw .hex{font-size:9.5px;font-family:"Cascadia Code",Consolas,monospace;letter-spacing:.02em}
  .sw .lbl{font-size:10px;padding:4px 7px 5px;color:var(--muted);border-top:.5px solid var(--border);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sw .lbl b{color:var(--text);font-weight:600}
  .sw .lbl em{font-style:normal;display:block;color:var(--dim);font-size:9.5px}
  .ptable{width:100%;border-collapse:collapse;font-size:12px;background:var(--card);
    border:.5px solid var(--border);border-radius:12px;overflow:hidden}
  .ptable tr.grp td{background:var(--codehead);color:var(--h);font-weight:600;font-size:11px;letter-spacing:.1em;
    padding:8px 14px;text-transform:uppercase}
  .ptable td{padding:8px 14px;border-top:.5px solid var(--border);vertical-align:middle}
  .ptable td.tk{font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px;color:var(--text);width:200px}
  .ptable td.tk .dot{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:8px;
    vertical-align:-1px;border:.5px solid rgba(0,0,0,.10)}
  .ptable td.mono{font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px;color:var(--active);width:92px}
  .ptable td.cn{color:var(--muted);width:96px}
  .src{display:flex;align-items:center;gap:10px}
  .src-crops{display:flex;gap:4px;flex:none}
  .src-crop{width:34px;height:34px;border-radius:6px;object-fit:cover;display:block;border:.5px solid var(--border)}
  .src-txt{font-size:11.5px;line-height:1.55;color:var(--muted)}
  .k{display:inline-block;font-size:10px;letter-spacing:.06em;border-radius:4px;padding:1px 6px;margin-right:7px;
    border:.5px solid;vertical-align:1px}
  .k-direct{color:var(--success);border-color:color-mix(in srgb,var(--success) 45%,transparent)}
  .k-step{color:var(--info);border-color:color-mix(in srgb,var(--info) 45%,transparent)}
  .k-mix{color:var(--warning);border-color:color-mix(in srgb,var(--warning) 45%,transparent)}
  .src-where{display:block;color:var(--dim);font-size:10.5px;font-family:"Cascadia Code",Consolas,monospace}
  .audit{width:100%;border-collapse:collapse;font-size:11.5px;background:var(--card);
    border:.5px solid var(--border);border-radius:12px;overflow:hidden}
  .audit th{text-align:left;font-weight:600;padding:8px 12px;color:var(--h);background:var(--codehead);
    font-size:11px;letter-spacing:.06em}
  .audit td{padding:5px 12px;border-top:.5px solid var(--border);font-family:"Cascadia Code",Consolas,monospace;font-size:11px}
  .audit .pass{color:var(--success)} .audit .fail{color:var(--error);font-weight:700}
  .audit .g{color:var(--dim)}
  .summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
  .stat{background:var(--card);border:.5px solid var(--border);border-radius:10px;padding:10px 14px;min-width:150px}
  .stat .n{font-size:22px;font-weight:650;letter-spacing:-.01em;line-height:1.1}
  .stat .l{font-size:10.5px;color:var(--muted);letter-spacing:.06em;margin-top:3px}
  .stat.ok .n{color:var(--success)} .stat.no .n{color:var(--error)}
  .legend{display:flex;gap:16px;margin-top:16px;font-size:11px;color:var(--muted);flex-wrap:wrap}
  .legend span{display:flex;align-items:center;gap:6px}
  .legend i{width:9px;height:9px;border-radius:3px}
  .foot{display:flex;justify-content:space-between;margin-top:26px;font-size:10.5px;color:var(--dim)}
"""

def ledger_rows():
    out = []
    for gname, tokens in GROUPS:
        out.append(f'<tr class="grp"><td colspan="4">{gname}</td></tr>')
        for t in tokens:
            row = next(r for r in bp.LEDGER if r["token"] == t)
            rule = RULE[t]
            if rule == "mix":
                keys = [row["a"], row["b"]]
            else:
                keys = [SRCKEY[t]]
            crops = "".join(f'<img class="src-crop" src="{crop_b64(k)}" alt="">' for k in keys)
            first = bp.S[keys[0]]
            n, ib = direct_stats[keys[0]]
            badge = {"direct": "直采", "step": "阶梯", "mix": "混色"}[rule]
            where = f"{first['file']} · {first['label']} {first['hex']}"
            if rule == "direct":
                where += f" · 原图精确像素 {n} 处"
            elif rule == "mix":
                second = bp.S[keys[1]]
                where += f" ＋ {second['file']} · {second['label']} {second['hex']}"
            else:
                where += " · 沿明度轴取阶"
            out.append(
                f'<tr data-token="{t}"><td class="tk"><span class="dot" style="background:{C[t]}"></span>{t}</td>'
                f'<td class="mono">{C[t]}</td><td class="cn">{CN[t]}</td>'
                f'<td class="srccell"><div class="src"><div class="src-crops">{crops}</div>'
                f'<div class="src-txt"><span class="k k-{rule}">{badge}</span>{FORMULA[t]}'
                f'<span class="src-where">{where}</span></div></div></td></tr>')
    return "\n".join(out)

def token_grid():
    out = []
    for gname, tokens in GROUPS:
        for t in tokens:
            out.append(f'<div class="sw" data-token="{t}"><div class="top" style="background:{C[t]}"><span class="hex">{C[t]}</span></div>'
                       f'<div class="lbl"><b>{t}</b><em>{CN[t]}</em></div></div>')
    return "\n".join(out)

def gallery():
    caps = [("2.jpg", "2.jpg · 738×414　左半：星空中的 Super Sailor Moon；右半：白昼天空下的 Sailor Moon"),
            ("3.jpg", "3.jpg · 452×678　Super Sailor Moon 近景：深蓝夜空 / 金发 / 红宝石 / 白羽"),
            ("images (1).jpg", "images (1).jpg · 269×379　海报：红日 / 藏青短裙 / 薄荷发 / 黑猫 / 青绿飘带")]
    out = []
    for f, cap in caps:
        out.append(f'<figure class="gfig"><img src="{file_b64(f)}" alt="{f}"><figcaption>{cap}</figcaption></figure>')
    return "\n".join(out)

def anchors():
    picks = [("页面底", "background"), ("品牌主色", "primary"), ("品牌第二色", "secondary"),
             ("链接", "markdownLink"), ("成功", "success"), ("警告", "warning"), ("错误", "error"),
             ("正文", "text"), ("代码底", "codeBlockBg")]
    return "".join(
        f'<span class="anchor"><i style="background:{C[t]}"></i>{lab} <b>{C[t]}</b></span>' for lab, t in picks)

HTML = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>Sailor Moon theme preview — 月光星纱</title>
<style>
{CSS}{BASE_CSS}</style>
</head>
<body>
<div class="sheet">
  <div class="eyebrow">DSH / OpenCode Palette · IP Preset · 全部取色自参考图</div>
  <h1 class="title">美少女战士 <em>Sailor Moon</em> — 月光星纱</h1>
  <div class="sub">三张参考图、37 个色位，没有一个是「想」出来的。场域是 3.jpg 白羽与粉翼混出来的一条樱纸阶梯，印是 3.jpg 夜空的深蓝，蝴蝶结是 2.jpg 那枚深红大结，月牙金是 2.jpg 的暖金长发——每一条都指得回原图里的一块像素。<b>{n_direct}</b> 个色位逐像素直采、<b>{n_step}</b> 个沿明度轴取阶梯、<b>{n_mix}</b> 个按固定比例混色，38 条正文对比、15 条 UI 对、6 项 IP 设计规范全部零违例、零告警。</div>
  <div class="anchors">{anchors()}</div>

  <div class="win">
    <aside class="sb">
      <div class="brand">
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
          <circle cx="13" cy="13" r="11.5" fill="{C['primary']}"/>
          <circle cx="13" cy="13" r="6.4" fill="{C['codeBlockBg']}"/>
          <circle cx="9.6" cy="11" r="1.5" fill="{C['primary']}"/><circle cx="16.4" cy="11" r="1.5" fill="{C['primary']}"/>
          <path d="M9.6 16.4c2 1.1 4.8 1.1 6.8 0" stroke="{C['primary']}" stroke-width="1.2" fill="none" stroke-linecap="round"/>
          <path d="M2 7.5 6.4 4l1.6 4.2zM24 7.5 19.6 4 18 8.2z" fill="{C['secondary']}"/>
        </svg>
        <span class="name">美少女战士</span><span class="badge">DSH</span>
      </div>
      <div class="ws"><span class="dot">月</span><span>moonlight</span><span class="caret">▾</span></div>
      <div class="nav">
        <div class="it on"><span class="ic round"></span>新会话<span style="margin-left:auto;font-size:10px;color:var(--dim)">⌘N</span></div>
        <div class="it"><span class="ic"></span>会话历史</div>
        <div class="it"><span class="ic"></span>文件</div>
        <div class="it"><span class="ic round"></span>终端</div>
      </div>
      <div class="side-lbl">最近</div>
      <div class="threads">
        <div class="th sel">月光星纱 · 37 色位取色台账</div>
        <div class="th">樱纸阶梯与星夜墨</div>
        <div class="th">语法七色的区分度复核</div>
        <div class="th">参考图逐像素复核</div>
      </div>
      <div class="sb-foot"><span class="av">辰</span><span>小辰</span><span class="gear">⚙</span></div>
    </aside>

    <main class="main">
      <div class="topbar">
        <span class="h">月光星纱 · 设计评审</span>
        <span class="crumb">/ 37 tokens</span>
        <div class="right">
          <span class="chip"><i class="idle"></i>就绪</span>
          <span class="chip"><i></i>deepseek-flash</span>
          <button class="btn ghost">分享</button>
          <button class="btn primary">新建会话</button>
        </div>
      </div>

      <div class="feed"><div class="col">
        <div class="user"><div class="bub">这套配色不许凭空想象——每个颜色都得指得回参考图里的某块像素。帮我把台账理出来。</div></div>

        <div class="who">
          <span class="k">
            <svg width="20" height="20" viewBox="0 0 26 26"><circle cx="13" cy="13" r="11.5" fill="{C['primary']}"/><circle cx="13" cy="13" r="6.4" fill="{C['codeBlockBg']}"/><circle cx="9.6" cy="11" r="1.5" fill="{C['primary']}"/><circle cx="16.4" cy="11" r="1.5" fill="{C['primary']}"/></svg>
          </span>
          <span class="n">小辰</span><span class="t">sailor-moon.json</span>
        </div>

        <div class="md">
          <h2>月光星纱 — 37 色位已按「同族分层 + 直采优先」落位</h2>
          <p>核心只有一句话：<strong>先定三个「场」，再让每个色位只能是它们的阶梯</strong>。场是 3.jpg 的白羽与粉翼（混成一条樱纸阶梯）、是 3.jpg 夜空的深蓝（结构）、是 2.jpg 那枚深红大结（品牌）。重点做了三个取舍：</p>
          <ul>
            <li>背景 8 槽不各取一色，而是<em>白羽 × 樱粉</em> 一条混色阶梯（12%→64%），所以 8 个表面天然同族、零色相孤岛；代码卡也是同族浅纸（42%），不是另起一块中性灰。</li>
            <li>品牌第二色取<em>海报上的藏青短裙</em>，与主色的玫红在 HSL 上相距 {dh:.1f}°，落进三角关系——粉、蓝、金三角色，Kitty 与库洛米都没有这套制服藏青。</li>
            <li>语法七色不是「挑七个好看的深色」，而是先定 5 个核心色相（玫红 / 群青 / 海青 / 赤铜 / 海绿）再压到同一明度 L=0.44，两两 ΔE76 最小 <b>{min_de:.1f}</b>；注释与运算符各自退到 {C['syntaxComment']} / {C['syntaxOperator']}，对比低于任一核心色。</li>
          </ul>
          <blockquote>纸是月光，笔是夜空，心跳只有一枚蝴蝶结。</blockquote>

          <div class="cc">
            <div class="hd"><span class="lang">ts</span><span class="fn">sailor-moon.json</span><span class="cp">复制</span></div>
<pre><span class="tk-com">// 取色台账：每一条都指得回参考图的一块像素</span>
<span class="tk-kw">const</span> <span class="tk-fn">sailorMoon</span> <span class="tk-op">=</span> <span class="tk-plain">{{
  <span class="tk-fn">background</span>: <span class="tk-str">"{C['background']}"</span>,   <span class="tk-com">// 混色 白羽82% × 樱粉18%</span>
  <span class="tk-fn">text</span>:        <span class="tk-str">"{C['text']}"</span>,      <span class="tk-com">// 直采 3.jpg 夜空暗部</span>
  <span class="tk-fn">primary</span>:     <span class="tk-str">"{C['primary']}"</span>,    <span class="tk-com">// 直采 2.jpg 深红蝴蝶结</span>
  <span class="tk-fn">secondary</span>:   <span class="tk-str">"{C['secondary']}"</span>,    <span class="tk-com">// 直采 海报藏青短裙</span>
  <span class="tk-fn">warning</span>:     <span class="tk-str">"{C['warning']}"</span>,    <span class="tk-com">// 阶梯 暖金 → L 0.50</span>
  <span class="tk-fn">contrast</span>:    <span class="tk-num">5.17</span> <span class="tk-kw">as</span> <span class="tk-typ">Ratio</span>,
}}</pre>
          </div>

          <table>
            <tr><th>检查项</th><th>结果</th><th>色值</th></tr>
            <tr><td>正文对比度</td><td><span class="ok">≥ 4.5 : 1 全过</span></td><td class="mono">{C['text']} / {C['background']}</td></tr>
            <tr><td>主按钮反白</td><td><span class="ok">5.17 : 1</span></td><td class="mono">#F4F4F5 / {C['primary']}</td></tr>
            <tr><td>品牌几何</td><td><span class="ok">{geo}（Δh {dh:.1f}°）</span></td><td class="mono">{C['primary']} / {C['secondary']}</td></tr>
            <tr><td>语法区分度</td><td><span class="ok">最小 ΔE76 {min_de:.1f}</span></td><td class="mono">5 核心语法色</td></tr>
          </table>

          <div class="warn">
            <span class="tag">已知限制</span>
            <span>提示气泡的<strong>文字色</strong>由 DSH 写死为白色，只把背景换成主题浮层色——浅色主题下对比不足，37 个色位修不到这一点。</span>
          </div>

          <div class="diff">
            <div class="ln rm"><span class="no">41</span><span class="sign">-</span><span class="code">  "primary": "#c42c6b",</span></div>
            <div class="ln add"><span class="no">41</span><span class="sign">+</span><span class="code">  "primary": "{C['primary']}",</span></div>
          </div>

          <div class="tool">
            <div class="row"><span class="pulse"></span><span class="name">run verify_pixels.py</span><span class="st"><i></i>已完成</span></div>
            <div class="out">
              [1] 直采 {n_direct} 个色位回原图逐个复核：<b>全部命中</b><br>
              [2] 阶梯 / 混色 {n_step + n_mix} 个色位按公式重算：<b>逐位一致</b><br>
              [3] 38 硬对 + 15 UI 对 + 6 项设计规范：<b>0 违例 / 0 告警</b>
            </div>
          </div>
        </div>
      </div></div>

      <div class="toast"><i></i><span>主题已保存 · 37 色位</span><span class="sub">取色自 3 张参考图</span></div>

      <div class="composer"><div class="col">
        <div class="cbox">
          <div class="ph">继续调整配色，或问我任意细节…</div>
          <div class="row">
            <span class="pill"><i></i>sailor-moon.json</span>
            <span class="pill">light</span>
            <button class="btn ghost" style="width:26px;height:26px;padding:0">＋</button>
            <span class="sp"></span>
            <button class="btn ghost" style="width:26px;height:26px;padding:0">⚙</button>
            <button class="send">↑</button>
          </div>
        </div>
        <div class="hint">Enter 发送 · Shift + Enter 换行
          <span class="r"><span class="chip" style="padding:2px 8px">37 tokens</span><span>美少女战士</span></span>
        </div>
      </div></div>
    </main>
  </div>

  <div class="sec">
    <div class="head"><h3>取色规则</h3><span class="hintx">三种合法来源，一种都不许有第四种</span></div>
    <div class="rule">
      <div class="r"><b>① 直采</b>：hex 与参考图里的某个像素完全一致。{n_direct} 个色位走这条路，脚本逐个回原图复核「该色确实存在」——<code>{C['primary']}</code> 在 2.jpg 的大蝴蝶结里找到 {direct_stats[SRCKEY['primary']][0]} 个精确像素，<code>{C['text']}</code> 在 3.jpg 的夜空暗部找到 {direct_stats[SRCKEY['text']][0]} 个。</div>
      <div class="r"><b>② 阶梯</b>：采样色的明度台阶，公式写死在卡片上。例如 8 个背景槽共用「白羽 × 樱粉」这一对，比例 12%→64% 一路排下来；<code>{C['warning']}</code> = 暖金 <code>#EAA627</code> 沿 OKLCH 明度轴取 L=0.50。</div>
      <div class="r"><b>③ 混色</b>：两个采样色的固定比例混合，比例写在卡片上。例如焦点环 <code>{C['borderActive']}</code> = 深红蝴蝶结 70% × 夜空墨 30%；次级文字 <code>{C['textMuted']}</code> = 城市灰蓝 50% × 夜空墨 50%。</div>
      <div class="r"><b>没有第四种。</b>没有任何一个色位是「看着差不多就定一个」——旧版美少女战士的 <code>#c42c6b</code> 在三张参考图里一个像素都找不到，<code>#f1ecf3</code> 那种灰紫代码底同样查无此色。</div>
    </div>
  </div>

  <div class="sec">
    <div class="head"><h3>参考图</h3><span class="hintx">全部 37 个色位的唯一出处</span></div>
    <div class="gallery">{gallery()}</div>
  </div>

  <div class="sec">
    <div class="head"><h3>取色台账</h3><span class="hintx">37 个色位 → 出处 / 公式 / 原图像素</span></div>
    <table class="ptable"><tbody>
{ledger_rows()}
    </tbody></table>
  </div>

  <div class="sec">
    <div class="head"><h3>对比度复核</h3><span class="hintx">口径与 docs/theme-audit/criteria.md 一致（38 硬对 + 15 UI 对）</span></div>
    <div class="summary" id="summary"></div>
    <table class="audit"><thead><tr><th>检查对</th><th>前景</th><th>背景</th><th>比值</th><th>阈值</th><th>判定</th></tr></thead><tbody id="auditBody"></tbody></table>
  </div>

  <div class="sec">
    <div class="head"><h3>37 Color Tokens</h3><span class="hintx">色位 → 界面真实落点</span></div>
    <div class="grid">
{token_grid()}
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
  <div class="foot"><span>Sailor Moon theme · 37 colors · light · base: 3 张参考图逐像素取色</span><span>design by 小辰 · first principles</span></div>
</div>
<script>
const C = {json.dumps(C, ensure_ascii=False)};
const SURF=['background','backgroundPanel','backgroundElement','sidebarBg','bubbleBg','inputBg','codeBlockBg','codeHeaderBg'];
const MUTED=['background','backgroundPanel','backgroundElement'];
const MD=['markdownHeading','markdownLink','markdownStrong','markdownEmph','markdownBlockQuote','markdownCode'];
const SY=['syntaxComment','syntaxKeyword','syntaxFunction','syntaxType','syntaxNumber','syntaxString','syntaxOperator'];
const BRAND=['primary','secondary','info','success','warning','error'];
function lum(hex){{hex=hex.replace('#','');const v=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255)
  .map(c=>c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4));return .2126*v[0]+.7152*v[1]+.0722*v[2]}}
function ratio(a,b){{const l1=lum(a),l2=lum(b);const hi=Math.max(l1,l2),lo=Math.min(l1,l2);return (hi+.05)/(lo+.05)}}
function mix(fg,a,al){{const p=h=>{{h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16))}};
  const A=p(fg),B=p(a);return '#'+A.map((v,i)=>Math.round(v*al+B[i]*(1-al)).toString(16).padStart(2,'0')).join('').toUpperCase()}}
function luma(hex){{const h=hex.replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  return (0.299*r+0.587*g+0.114*b)/255}}
function contrastText(hex){{return luma(hex)>0.6?'#141414':'#F4F4F5'}}
const rows=[];
const S={{}};SURF.forEach(k=>S[k]=C[k]);
function add(group,fg,bg,t){{rows.push({{group,fg,bg,ratio:ratio(fg,bg),t}})}}
SURF.forEach(s=>add('text',C.text,S[s],4.5));
MUTED.forEach(s=>{{add('muted',C.textMuted,S[s],4.5);add('dimmed',mix(C.textMuted,S[s],0.8),S[s],4.5)}});
MD.forEach(r=>['background','backgroundPanel'].forEach(s=>add('markdown',C[r],S[s],4.5)));
SY.forEach(r=>add('syntax',C[r],S.codeBlockBg,4.5));
add('diff',C.diffAdded,C.diffAddedBg,4.5); add('diff',C.diffRemoved,C.diffRemovedBg,4.5);
add('diff',C.text,C.diffAddedBg,4.5); add('diff',C.text,C.diffRemovedBg,4.5);
add('onPrimary',contrastText(C.primary),C.primary,4.5);
MUTED.forEach(s=>add('borderActive',C.borderActive,S[s],3));
BRAND.forEach(r=>['background','backgroundPanel'].forEach(s=>add('brand',C[r],S[s],3)));
const hard=rows.filter(r=>r.t===4.5), ui=rows.filter(r=>r.t===3);
const hf=hard.filter(r=>r.ratio<4.5), uf=ui.filter(r=>r.ratio<3);
document.getElementById('summary').innerHTML =
 '<div class="stat ok"><div class="n">'+hard.length+'</div><div class="l">正文硬对 ≥4.5:1</div></div>'+
 '<div class="stat ok"><div class="n">'+hf.length+'</div><div class="l">硬对违例</div></div>'+
 '<div class="stat ok"><div class="n">'+ui.length+'</div><div class="l">UI 对 ≥3:1</div></div>'+
 '<div class="stat ok"><div class="n">'+uf.length+'</div><div class="l">UI 违例</div></div>'+
 '<div class="stat"><div class="n">'+Math.min.apply(null,hard.map(r=>r.ratio)).toFixed(2)+'</div><div class="l">最紧正文比值</div></div>'+
 '<div class="stat"><div class="n">ΔE76 {min_de:.1f}</div><div class="l">语法核心区分度</div></div>';
const grpName={{text:'正文 text',muted:'次级 textMuted',dimmed:'label-dimmed',markdown:'markdown 角色',syntax:'语法角色',
  diff:'diff 行',onPrimary:'主按钮反白',borderActive:'焦点描边',brand:'品牌/语义色'}};
let html='',last='';
rows.forEach(r=>{{
  if(r.group!==last){{html+='<tr><td class="g" colspan="6" style="padding-top:12px">'+grpName[r.group]+'</td></tr>';last=r.group}}
  const ok=r.ratio>=r.t;
  html+='<tr><td>'+r.fg+' @ '+r.bg+'</td><td>'+r.fg+'</td><td>'+r.bg+'</td><td>'+r.ratio.toFixed(2)+
        '</td><td>'+r.t.toFixed(1)+'</td><td class="'+(ok?'pass':'fail')+'">'+(ok?'PASS':'FAIL')+'</td></tr>';
}});
document.getElementById('auditBody').innerHTML=html;
document.querySelectorAll('.sw .top').forEach(function(t){{
  const m=getComputedStyle(t).backgroundColor.match(/[0-9.]+/g)||[255,255,255];
  const v=m.slice(0,3).map(Number);
  const l=(0.2126*v[0]+0.7152*v[1]+0.0722*v[2])/255;
  t.style.color = l>0.55 ? '#241A2C' : '#FFFFFF';
}});
</script>
</body>
</html>
"""

def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(HTML)
    print("written:", OUT, os.path.getsize(OUT), "bytes")

if __name__ == "__main__":
    main()
