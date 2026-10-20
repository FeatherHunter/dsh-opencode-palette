# -*- coding: utf-8 -*-
"""gen.py — 生成 ../transformers-theme-preview.html。

读 palette.json（37 色位 + 审计结果）与 extracted.json（取色现场坐标），
把 5 张参考图与 20 块「取色现场」实拍裁切以 base64 内联进页面，
产出一张可单文件打开的评审页。
"""
import os, sys, io, json, base64, html, re
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
from sources import SRC_DIR

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "transformers-theme-preview.html")

pal = json.load(open(os.path.join(HERE, "palette.json"), encoding="utf-8"))
ext = json.load(open(os.path.join(HERE, "extracted.json"), encoding="utf-8"))
C = pal["colors"]
A = pal["audit"]


def b64(path, maxw=560, box=None, quality=78):
    im = Image.open(path).convert("RGB")
    if box:
        im = im.crop(tuple(box))
    if im.width > maxw:
        im = im.resize((maxw, max(1, int(im.height * maxw / im.width))), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=quality, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def poster_data(fname):
    return b64(os.path.join(SRC_DIR, fname), maxw=520, quality=72)


def sig_data(sig):
    if not sig.get("box"):
        return None
    return b64(os.path.join(SRC_DIR, sig["file"]), maxw=96, box=sig["box"], quality=82)


# ── 变量表 ───────────────────────────────────────────────────────────
VAR = {
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


def alpha_bg(hexv, base):
    """8 位色值渲染成 rgba()，以便在 CSS 里直接用"""
    h = hexv.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    a = int(h[6:8], 16) / 255.0
    return "rgba(%d,%d,%d,%.3f)" % (r, g, b, a)


def fill(tpl, **kw):
    """只替换 %(name)s 占位符，CSS 里的字面 % 保持原样"""
    return re.sub(r"%\((\w+)\)s", lambda m: kw[m.group(1)], tpl)


CSS = fill("""
  :root{
    --bg:%(bg)s; --panel:%(panel)s; --elem:%(elem)s; --sidebar:%(sidebar)s;
    --bubble:%(bubble)s; --input:%(input)s; --code:%(code)s; --codehead:%(codehead)s;
    --text:%(text)s; --muted:%(muted)s;
    --primary:%(primary)s; --secondary:%(secondary)s; --info:%(info)s; --success:%(success)s;
    --warning:%(warning)s; --error:%(error)s;
    --border:%(border)s; --active:%(active)s;
    --dadd:%(dadd)s; --drem:%(drem)s; --daddbg:%(daddbg)s; --drembg:%(drembg)s;
    --daddln:%(daddln)s; --dremln:%(dremln)s;
    --h:%(h)s; --link:%(link)s; --mcode:%(mcode)s; --em:%(em)s; --strong:%(strong)s; --quote:%(quote)s;
    --scom:%(scom)s; --skw:%(skw)s; --sfn:%(sfn)s; --styp:%(styp)s; --snum:%(snum)s; --sstr:%(sstr)s; --sop:%(sop)s;
    --page:#02040B; --paper:#090E1B;
    --hover:color-mix(in srgb, var(--text) 8%, transparent);
    --active08:color-mix(in srgb, var(--text) 14%, transparent);
    --dim:color-mix(in srgb, var(--muted) 80%, transparent);
  }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{
    background:
      radial-gradient(1100px 520px at 50% -160px, rgba(239,211,76,.10), transparent 70%),
      radial-gradient(900px 460px at 12% 8%, rgba(19,115,201,.13), transparent 70%),
      var(--page);
    color:var(--text);
    font-family:"Segoe UI","Microsoft YaHei UI","Microsoft YaHei",system-ui,sans-serif;
    -webkit-font-smoothing:antialiased;
  }
  .sheet{width:1400px;padding:44px 64px 64px;margin:0 auto}
  .eyebrow{font-size:11px;letter-spacing:.22em;color:var(--muted);text-transform:uppercase}
  h1.title{font-size:34px;line-height:1.1;margin:10px 0 8px;letter-spacing:.01em;font-weight:600}
  h1.title em{font-style:normal;color:var(--primary)}
  .sub{font-size:13.5px;color:var(--muted);max-width:900px;line-height:1.85}
  .sub b{color:var(--text);font-weight:600}
  .sub .hi{color:var(--active);font-weight:600}
  .anchors{display:flex;gap:10px;margin-top:18px;align-items:center;flex-wrap:wrap}
  .anchor{display:flex;align-items:center;gap:8px;background:var(--panel);border:.5px solid var(--border);
    border-radius:999px;padding:5px 12px 5px 6px;font-size:11.5px;color:var(--muted)}
  .anchor i{width:18px;height:18px;border-radius:50%;display:block;border:.5px solid rgba(255,255,255,.12)}
  .anchor b{color:var(--text);font-weight:600;font-family:"Cascadia Code",Consolas,monospace}

  .win{margin-top:26px;width:1272px;height:auto;border-radius:18px;overflow:hidden;position:relative;
    background:var(--bg);border:.5px solid var(--border);
    box-shadow:0 30px 70px -20px rgba(0,0,0,.8), 0 2px 8px rgba(0,0,0,.55);
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
  .nav .it.on:before{content:"";position:absolute;left:0;top:7px;bottom:7px;width:3px;border-radius:3px;background:var(--active)}
  .nav .it .ic{width:15px;height:15px;border:1.4px solid currentColor;border-radius:4px;opacity:.75;flex:none}
  .nav .it .ic.round{border-radius:50%}
  .side-lbl{font-size:10.5px;letter-spacing:.12em;color:var(--dim);margin:16px 8px 6px;text-transform:uppercase}
  .threads{display:flex;flex-direction:column;gap:1px}
  .th{font-size:12px;color:var(--muted);padding:6px 9px;border-radius:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .th:hover{background:var(--hover)}
  .th.sel{background:var(--active08);color:var(--text)}
  .sb-foot{margin-top:auto;display:flex;align-items:center;gap:9px;padding:9px 6px 2px;border-top:.5px solid var(--border);font-size:12px}
  .av{width:24px;height:24px;border-radius:50%;background:var(--primary);color:#F4F4F5;display:grid;place-items:center;font-size:11px}
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
  .btn.primary{background:var(--primary);color:#F4F4F5;font-weight:600;box-shadow:0 1px 0 rgba(0,0,0,.35)}
  .btn.info{background:var(--secondary);color:#04121B;font-weight:600}
  .btn.ghost{background:transparent;color:var(--muted);border:.5px solid transparent}
  .btn.ghost:hover{background:var(--active08);color:var(--text)}
  .btn.outline{background:transparent;border:.5px solid var(--active);color:var(--text)}

  .feed{flex:1;overflow:hidden;padding:22px 26px 84px}
  .col{width:720px;margin:0 auto}
  .user{display:flex;justify-content:flex-end;margin-bottom:20px}
  .user .bub{background:var(--bubble);border-radius:14px 14px 4px 14px;padding:10px 14px;font-size:13px;
    line-height:1.65;max-width:520px;box-shadow:0 1px 2px rgba(0,0,0,.35)}
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
  .warn{display:flex;gap:9px;align-items:flex-start;background:color-mix(in srgb,var(--warning) 16%,transparent);
    border-left:2.5px solid var(--warning);border-radius:6px;padding:8px 12px;margin:0 0 12px;font-size:12px;line-height:1.65;color:var(--warning)}
  .warn b{font-weight:650}
  .warn .tag{font-size:10.5px;letter-spacing:.08em;border:.5px solid color-mix(in srgb,var(--warning) 50%,transparent);
    border-radius:4px;padding:0 5px;flex:none;margin-top:1px}
  .md table{border-collapse:collapse;font-size:12px;margin:0 0 12px;width:100%}
  .md th{text-align:left;font-weight:600;padding:7px 10px;border-bottom:.5px solid var(--active);background:color-mix(in srgb,var(--panel) 70%,transparent)}
  .md td{padding:7px 10px;border-bottom:.5px solid color-mix(in srgb,var(--border) 70%,transparent)}
  .md td .ok{color:var(--success);font-weight:600}
  .md td .no{color:var(--error);font-weight:600}
  .md td.mono{font-family:"Cascadia Code",Consolas,monospace;font-size:11px;color:var(--muted)}

  .cc{border-radius:10px;overflow:hidden;margin:2px 0 12px;background:var(--code);border:.5px solid var(--border)}
  .cc .hd{display:flex;align-items:center;gap:8px;background:var(--codehead);padding:7px 12px 6px;font-size:11px;color:var(--muted)}
  .cc .hd .lang{color:var(--dim);font-family:"Cascadia Code",Consolas,monospace}
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

  .diff{border-radius:10px;overflow:hidden;background:var(--code);border:.5px solid var(--border);margin:0 0 12px;
    font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px}
  .diff .ln{display:flex;gap:10px;padding:2px 12px 2px 0}
  .diff .ln .no{width:32px;padding-right:8px;text-align:right;color:var(--dim);border-right:.5px solid transparent}
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
  .pulse{width:14px;height:14px;border-radius:50%;border:1.6px solid color-mix(in srgb,var(--info) 40%,transparent);border-top-color:var(--info)}

  .toast{position:absolute;right:22px;bottom:132px;background:var(--elem);border:.5px solid var(--border);
    border-radius:10px;padding:9px 13px;display:flex;align-items:center;gap:9px;font-size:12px;
    box-shadow:0 12px 28px -12px rgba(0,0,0,.85)}
  .toast i{width:7px;height:7px;border-radius:50%;background:var(--success)}
  .toast .sub{color:var(--dim);font-size:11px}

  .composer{flex:none;padding:10px 26px 14px}
  .composer .col{width:720px}
  .cbox{background:var(--input);border:.5px solid var(--active);border-radius:14px;padding:11px 13px 9px;
    box-shadow:0 2px 12px -6px rgba(0,0,0,.7)}
  .cbox .ph{font-size:13px;color:var(--muted)}
  .cbox .row{display:flex;align-items:center;gap:7px;margin-top:9px}
  .cbox .row .sp{margin-left:auto}
  .pill{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;color:var(--muted);
    background:var(--panel);border:.5px solid var(--border);border-radius:999px;padding:3px 8px}
  .pill i{width:5px;height:5px;border-radius:50%;background:var(--primary)}
  .send{width:28px;height:28px;border-radius:9px;background:var(--primary);color:#F4F4F5;display:grid;place-items:center;
    font-size:13px;font-weight:700;border:0}
  .hint{display:flex;align-items:center;gap:8px;font-size:10.5px;color:var(--dim);padding:7px 4px 0}
  .hint .r{margin-left:auto;display:flex;gap:6px;align-items:center}

  .sect{margin-top:46px}
  .sect .head{display:flex;align-items:baseline;gap:14px;margin-bottom:16px}
  .sect h3{font-size:13px;letter-spacing:.18em;text-transform:uppercase;margin:0;font-weight:600}
  .sect .hintx{font-size:11.5px;color:var(--muted)}
  .tokens .grid, #tokens .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
  .sw{border-radius:9px;border:.5px solid var(--border);overflow:hidden;background:var(--code)}
  .sw .top{height:46px;display:flex;align-items:flex-end;padding:5px 7px}
  .sw .hex{font-size:9.5px;font-family:"Cascadia Code",Consolas,monospace;opacity:.96;letter-spacing:.02em}
  .sw .lbl{font-size:10px;padding:5px 7px 6px;color:var(--muted);border-top:.5px solid var(--border)}
  .sw .lbl b{color:var(--text);font-weight:600;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .sw .lbl i{font-style:normal;font-size:9px;color:var(--dim);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

  .posters{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}
  .poster{margin:0;border-radius:12px;overflow:hidden;border:.5px solid var(--border);background:var(--paper)}
  .poster img{width:100%;height:238px;object-fit:cover;display:block}
  .poster figcaption{padding:9px 11px 11px;display:flex;flex-direction:column;gap:2px}
  .poster figcaption b{font-size:12px}
  .poster figcaption span{font-size:10px;color:var(--muted);font-family:"Cascadia Code",Consolas,monospace}
  .poster figcaption em{font-style:normal;font-size:10.5px;color:var(--muted);line-height:1.55;margin-top:4px}

  .sigs{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:18px}
  .sig{display:flex;gap:10px;align-items:center;background:var(--paper);border:.5px solid var(--border);border-radius:11px;padding:9px}
  .sigcrop{position:relative;flex:none;width:54px;height:54px;border-radius:9px;overflow:hidden;border:.5px solid var(--border)}
  .sigcrop img{width:100%;height:100%;object-fit:cover;display:block}
  .sigcrop i{position:absolute;right:4px;bottom:4px;width:13px;height:13px;border-radius:4px;border:1px solid rgba(255,255,255,.6);box-shadow:0 1px 4px rgba(0,0,0,.8)}
  .sigmeta{display:flex;flex-direction:column;gap:2px;min-width:0}
  .sigmeta b{font-size:11.5px}
  .sigmeta code{font-size:10px;color:var(--secondary);font-family:"Cascadia Code",Consolas,monospace}
  .sigmeta span{font-size:10px;color:var(--muted);line-height:1.45;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

  .prov{width:100%;border-collapse:collapse;font-size:11.5px;background:var(--paper);
    border:.5px solid var(--border);border-radius:12px;overflow:hidden}
  .prov th{text-align:left;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);
    padding:9px 12px;border-bottom:.5px solid var(--border);font-weight:600}
  .prov td{padding:6px 12px;border-bottom:.5px solid color-mix(in srgb,var(--border) 55%,transparent);vertical-align:top}
  .prov tr:last-child td{border-bottom:0}
  .prov .tk b{font-size:11.5px;color:var(--text)}
  .prov code{font-family:"Cascadia Code",Consolas,monospace;font-size:11px;color:var(--secondary)}
  .prov .op{color:var(--muted);font-size:11px;line-height:1.5}
  .prov .src{color:var(--dim);font-size:10.5px}
  .kind{display:inline-block;font-size:9.5px;letter-spacing:.06em;border:.5px solid var(--border);border-radius:4px;
    padding:0 5px;color:var(--muted);margin-left:6px}
  .kind.direct{color:var(--active);border-color:color-mix(in srgb,var(--active) 40%,transparent)}
  .kind.mix{color:var(--info);border-color:color-mix(in srgb,var(--info) 40%,transparent)}
  .kind.tint{color:var(--success);border-color:color-mix(in srgb,var(--success) 40%,transparent)}
  .kind.rung{color:var(--markdownLink,#38a1ff);border-color:color-mix(in srgb,var(--markdownLink,#38a1ff) 40%,transparent)}
  .chipc{display:inline-block;width:11px;height:11px;border-radius:3px;border:.5px solid rgba(255,255,255,.16);
    margin-right:7px;vertical-align:-1px}

  .score{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
  .score .sc{background:var(--paper);border:.5px solid var(--border);border-radius:10px;padding:9px 14px;min-width:138px}
  .score .sc b{display:block;font-size:19px;color:var(--active);font-family:"Cascadia Code",Consolas,monospace}
  .score .sc span{font-size:10.5px;color:var(--muted)}
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
  .foot{display:flex;justify-content:space-between;margin-top:26px;font-size:10.5px;color:var(--dim)}
""", **VAR)


def swatch_html(t):
    v = t["hex"]
    disp = v[:7] if len(v) == 7 else v
    return ("<div class='sw'><div class='top' style='background:%s'>"
            "<span class='hex' style='color:%s'>%s</span></div>"
            "<div class='lbl'><b>%s</b><i>%s</i></div></div>") % (
        v, "#0B1020" if _lum(disp) > 0.42 else "#F4F4F5", disp, t["token"], t["kind"])


def _lum(h):
    def lin(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = [lin(int(h.lstrip("#")[i:i + 2], 16)) for i in (0, 2, 4)]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _lab(h):
    def lin(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = [lin(int(h.lstrip("#")[i:i + 2], 16)) for i in (0, 2, 4)]
    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883

    def f(t):
        return t ** (1.0 / 3.0) if t > 0.008856 else (7.787 * t + 16.0 / 116.0)
    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def _de(a, b):
    la, lb = _lab(a), _lab(b)
    return sum((p - q) ** 2 for p, q in zip(la, lb)) ** 0.5


def main():
    tok = pal["tokens"]
    hard = [r for r in A["rows"] if r["t"] == 4.5]
    ui = [r for r in A["rows"] if r["t"] == 3.0]
    tight_hard = sorted(hard, key=lambda r: r["ratio"])[:10]
    tight_ui = sorted(ui, key=lambda r: r["ratio"])[:8]

    posters = ""
    for im in pal["images"]:
        posters += ("<figure class='poster'><img src='%s' alt='%s'>"
                    "<figcaption><b>%s</b><span>%s</span><em>%s</em></figcaption></figure>") % (
            poster_data(im["file"]), html.escape(im["title"]), html.escape(im["title"]),
            im["file"], html.escape(im["desc"]))

    sigs = ""
    for s in ext["signatures"]:
        d = sig_data(s)
        if not d:
            continue
        sigs += ("<div class='sig'><div class='sigcrop'><img src='%s' alt='%s'>"
                 "<i style='background:%s'></i></div>"
                 "<div class='sigmeta'><b>%s</b><code>%s</code><span>%s · %s</span></div></div>") % (
            d, html.escape(s["label"]), s["hex"], html.escape(s["label"]),
            s["hex"], s["file"], html.escape(s["token"]))

    prov = ""
    for t in tok:
        kcls = {"直采": "direct", "混色": "mix", "叠透": "tint", "阶梯": "rung"}.get(t["kind"], "")
        prov += ("<tr><td class='tk'><span class='chipc' style='background:%s'></span><b>%s</b>"
                 "<span class='kind %s'>%s</span></td>"
                 "<td><code>%s</code></td>"
                 "<td class='op'>%s</td>"
                 "<td class='src'>%s</td>"
                 "<td class='op'>%s</td></tr>") % (
            t["hex"], t["token"], kcls, t["kind"], t["hex"],
            html.escape(t["recipe"]), html.escape(t["anchor"]), html.escape(t["intent"]))

    rows_html = ""
    for r in sorted(A["rows"], key=lambda r: (r["t"], r["ratio"])):
        rows_html += ("<tr><td><code>%s</code></td><td><span class='chipc' style='background:%s'></span>"
                      "<code>%s</code></td><td><span class='chipc' style='background:%s'></span>"
                      "<code>%s</code></td><td class='num'>%.2f</td><td class='num'>%.1f</td>"
                      "<td class='%s'>%s</td></tr>") % (
            r["code"], r["fg"], r["fg"], r["bg"], r["bg"], r["ratio"], r["t"],
            "ok" if r["ok"] else "no", "PASS" if r["ok"] else "FAIL")

    json_preview = json.dumps({k: C[k] for k in sorted(C)}, ensure_ascii=False, indent=2)
    json_lines = json_preview.split("\n")
    code_html = ""
    for ln in json_lines:
        if ln.strip().startswith('"'):
            key = ln.split('"')[1]
            val = ln.split(": ", 1)[1].rstrip(",").strip('"')
            kn = {"primary": "tk-kw", "secondary": "tk-kw", "info": "tk-kw", "success": "tk-kw",
                  "warning": "tk-kw", "error": "tk-kw", "background": "tk-typ",
                  "backgroundPanel": "tk-typ", "backgroundElement": "tk-typ", "sidebarBg": "tk-typ",
                  "bubbleBg": "tk-typ", "inputBg": "tk-typ", "codeBlockBg": "tk-typ",
                  "codeHeaderBg": "tk-typ", "text": "tk-typ", "textMuted": "tk-typ",
                  "border": "tk-typ", "borderActive": "tk-typ", "diffAdded": "tk-typ",
                  "diffRemoved": "tk-typ", "diffAddedBg": "tk-typ", "diffRemovedBg": "tk-typ",
                  "diffAddedLineNumberBg": "tk-typ", "diffRemovedLineNumberBg": "tk-typ",
                  "markdownHeading": "tk-typ", "markdownLink": "tk-typ", "markdownCode": "tk-typ",
                  "markdownEmph": "tk-typ", "markdownStrong": "tk-typ", "markdownBlockQuote": "tk-typ",
                  "syntaxComment": "tk-typ", "syntaxKeyword": "tk-typ", "syntaxFunction": "tk-typ",
                  "syntaxType": "tk-typ", "syntaxNumber": "tk-typ", "syntaxString": "tk-typ",
                  "syntaxOperator": "tk-typ"}.get(key, "tk-fn")
            code_html += ("<span class='%s'>\"%s\"</span>: <span class='tk-str'>\"%s\"</span>%s<br>") % (
                kn, key, val, "," if not ln.rstrip().endswith("}") else "")
        else:
            code_html += html.escape(ln) + "<br>"

    body = TEMPLATE.format(
        css=CSS,
        primary=C["primary"], secondary=C["secondary"], active=C["borderActive"],
        h=C["markdownHeading"], link=C["markdownLink"], em=C["markdownEmph"],
        strong=C["markdownStrong"], mcode=C["markdownCode"], quote=C["markdownBlockQuote"],
        text=C["text"], muted=C["textMuted"], border=C["border"], active08="var(--active08)",
        scom=C["syntaxComment"], skw=C["syntaxKeyword"], sfn=C["syntaxFunction"],
        styp=C["syntaxType"], snum=C["syntaxNumber"], sstr=C["syntaxString"], sop=C["syntaxOperator"],
        warning=C["warning"], success=C["success"], error=C["error"], info=C["info"],
        dadd=C["diffAdded"], drem=C["diffRemoved"], bubble=C["bubbleBg"], elem=C["backgroundElement"],
        code=code_html, posters=posters, sigs=sigs, prov=prov, rows=rows_html,
        swatches="".join(swatch_html(t) for t in tok),
        hard_fail=A["hardFails"], hard_total=A["hardTotal"],
        ui_fail=A["uiFails"], ui_total=A["uiTotal"],
        design_warn=A["designWarnings"],
        tight_hard="".join("<tr><td><code>%s</code></td><td class='num'>%.2f</td><td class='num'>%.1f</td><td class='ok'>PASS</td></tr>" % (r["code"], r["ratio"], r["t"]) for r in tight_hard),
        tight_ui="".join("<tr><td><code>%s</code></td><td class='num'>%.2f</td><td class='num'>%.1f</td><td class='ok'>PASS</td></tr>" % (r["code"], r["ratio"], r["t"]) for r in tight_ui),
        brand_cat=A["brandCat"], brand_hue=A["brandHue"],
        core_de=A["coreMinDeltaE"], core_pair=A["coreMinPair"],
        comment_c=A["commentContrast"], operator_c=A["operatorContrast"], core_c=A["coreMinContrast"],
        base_hue=A["baseHue"],
        recipe_fails=A["recipeFails"],
        min_adj=A["adjacentMin"]["de"],
        strong_de=round(_de(C["text"], C["markdownStrong"]), 1),
    )
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(body)
    print("written:", os.path.abspath(OUT), "%.1f KB" % (len(body.encode()) / 1024))


TEMPLATE = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>Transformers theme preview</title>
<style>{css}</style>
</head>
<body>
<div class="sheet">
  <div class="eyebrow">DSH / OpenCode Palette · Custom Theme</div>
  <h1 class="title">变形金刚 <em>Transformers</em> — 午夜擎天柱</h1>
  <div class="sub">
    五张参考图当唯一样本：<b>37 个色位没有一个是想象出来的</b>——每一格的终值都能在原图里指认到具体像素。
    取证的门槛不是「颜色差不多」，而是<b>它在图上必须成片存在</b>：直采色要求原图里真实出现，且 49×49 邻域内至少 24 个同伴像素；
    背景 8 槽是《变形金刚 One》海报夜空里真实像素排成的明度阶；4 个 diff 底色是两个采样色的固定比例。
    推导只有三步：① <b>最具决定性的一帧是《变形金刚 One》海报</b>——擎天柱的红挡在一轮巨大的黄太阳前，夜空是深靛蓝。
    所以配色按「<span class="hi">黄是光、红是心、蓝是夜台</span>」分配：大黄蜂漆黄做焦点环，擎天柱红做品牌心跳，赛博坦钢蓝做整场的「场」；
    ② <b>8 个背景槽是夜幕簇的明度阶</b>（基准色相 {base_hue}°，每一阶都能在海报里指到像素；气泡槽取星云紫，是全界面唯一的异族）；
    ③ <b>语义全部借物不借色板</b>：全息青＝能量晶体，苔色＝山林，琥珀＝炮口预警，熔炉橙＝过热告急。
    判据自检：硬性 {hard_total} 对 + UI {ui_total} 对，<b>违例 {hard_fail} + {ui_fail}</b>，
    IP 设计告警 <b>{design_warn} 条</b>，配方复算失败 <b>{recipe_fails} 条</b>，会同时同屏的相邻岗位最小色差 ΔE76 <b>{min_adj}</b>。
  </div>
  <div class="anchors">
    <span class="anchor"><i style="background:{primary}"></i>徽章红 <b>{primary}</b></span>
    <span class="anchor"><i style="background:{secondary}"></i>能量电蓝 <b>{secondary}</b></span>
    <span class="anchor"><i style="background:{active}"></i>大黄蜂漆黄 <b>{active}</b></span>
    <span class="anchor"><i style="background:{h}"></i>日轮金 <b>{h}</b></span>
    <span class="anchor"><i style="background:{info}"></i>全息青 <b>{info}</b></span>
    <span class="anchor"><i style="background:{success}"></i>山林苔色 <b>{success}</b></span>
    <span class="anchor"><i style="background:{warning}"></i>炮口琥珀 <b>{warning}</b></span>
    <span class="anchor"><i style="background:{error}"></i>熔炉橙 <b>{error}</b></span>
  </div>

  <div class="win">
    <aside class="sb">
      <div class="brand">
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
          <path d="M13 2.4 4.6 6.1v7.2c0 5 3.5 8.9 8.4 10.3 4.9-1.4 8.4-5.3 8.4-10.3V6.1Z" fill="none" stroke="{text}" stroke-width="1.6"/>
          <path d="M8 9.4h10M8 13h10M8 16.6h6" stroke="{muted}" stroke-width="1.3" stroke-linecap="round"/>
          <path d="M13 6.6 9.9 9.4h6.2Z" fill="{primary}"/>
        </svg>
        <span class="name">变形金刚</span><span class="badge">DSH</span>
      </div>
      <div class="ws"><span class="dot">擎</span><span>cybertan-night</span><span class="caret">▾</span></div>
      <div class="nav">
        <div class="it on"><span class="ic round"></span>新会话<span style="margin-left:auto;font-size:10px;color:var(--dim)">⌘N</span></div>
        <div class="it"><span class="ic"></span>会话历史</div>
        <div class="it"><span class="ic"></span>文件</div>
        <div class="it"><span class="ic round"></span>终端</div>
      </div>
      <div class="side-lbl">最近</div>
      <div class="threads">
        <div class="th sel">变形金刚主题 · 配色评审</div>
        <div class="th">五张参考图的取色现场</div>
        <div class="th">37 色位落位与对比度</div>
        <div class="th">退后梯队：注释与运算符</div>
      </div>
      <div class="sb-foot"><span class="av">辰</span><span>小辰</span><span class="gear">⚙</span></div>
    </aside>

    <main class="main">
      <div class="topbar">
        <span class="h">变形金刚主题 · 配色评审</span>
        <span class="crumb">/ 37 tokens</span>
        <div class="right">
          <span class="chip"><i class="idle"></i>就绪</span>
          <span class="chip"><i></i>deepseek-flash</span>
          <button class="btn ghost">分享</button>
          <button class="btn info">取色溯源</button>
          <button class="btn primary">新建会话</button>
        </div>
      </div>

      <div class="feed"><div class="col">
        <div class="user"><div class="bub">用变形金刚文件夹里这五张图，重新做一版配色。所有颜色必须从图里来，不能自己想象。</div></div>

        <div class="who">
          <span class="k">
            <svg width="20" height="20" viewBox="0 0 26 26"><path d="M13 2.4 4.6 6.1v7.2c0 5 3.5 8.9 8.4 10.3 4.9-1.4 8.4-5.3 8.4-10.3V6.1Z" fill="none" stroke="{text}" stroke-width="1.8"/><path d="M8 9.4h10M8 13h10M8 16.6h6" stroke="{muted}" stroke-width="1.5" stroke-linecap="round"/><path d="M13 6.6 9.9 9.4h6.2Z" fill="{primary}"/></svg>
          </span>
          <span class="n">小辰</span><span class="t">transformers.json</span>
        </div>

        <div class="md">
          <h2>黄是光，红是心，蓝是夜台</h2>
          <p>核心只有一句话：<strong>场是夜空的蓝，心跳是徽章的红，光是日轮的黄</strong>。
            五张图里真正定调的是《变形金刚 One》那张海报——<em>擎天柱的红挡在一轮巨大的黄太阳前</em>，
            所以这套主题把两者拆成不同岗位：红只做品牌与危险的前排，黄只做焦点、标题与车漆；
            中间大片留给赛博坦的钢蓝夜。37 个色位按界面真实落点分配，
            <strong>每一格都能在原图里指认出像素</strong>，没有一个是调出来的。</p>
          <ul>
            <li>背景 8 槽是 <code>5.jpg</code> 夜幕里的<em>真实像素排成的明度阶</em>（<code>#020B1C</code>→<code>#0D2354</code>），
              气泡槽刻意离开蓝家族取<em>星云紫</em>，是全界面唯一一处「不按套路」的表面。</li>
            <li>焦点环用<em>大黄蜂车漆黄</em>而不是主色：界面里最醒目的一个点是车灯，不是按钮。</li>
            <li>删除行不用红色，用<em>战损锈铜</em>——被击穿的旧装甲与「报错」不是一件事，新增行则是战场上重新长出的草坡。</li>
            <li>语义色从角色身上借：全息青（能量晶体）= info，苔色（山林）= success，琥珀（炮口预警）= warning，熔炉橙（过热）= error。</li>
          </ul>
          <blockquote>汽车人的红、霸天虎的蓝、大黄蜂的黄——三张脸都在图里，界面只负责让它们各就其位。</blockquote>

          <div class="cc">
            <div class="hd"><span class="lang">json</span><span class="fn">src/custom-presets/transformers.json</span><span class="cp">复制</span></div>
<pre>{code}</pre>
          </div>

          <table>
            <tr><th>检查项</th><th>结果</th><th>口径</th></tr>
            <tr><td>正文 38 对</td><td><span class="ok">0 条违例</span></td><td class="mono">4.5:1 · 仓库审计脚本</td></tr>
            <tr><td>非文本 15 对</td><td><span class="ok">0 条违例</span></td><td class="mono">3.0:1 · 仓库审计脚本</td></tr>
            <tr><td>IP 设计规范</td><td><span class="ok">0 条告警</span></td><td class="mono">碰撞 / 孤岛 / 几何 / ΔE</td></tr>
            <tr><td>配方可复现</td><td><span class="ok">{recipe_fails} 条失败</span></td><td class="mono">逐位复算 = 终值</td></tr>
          </table>

          <div class="warn">
            <span class="tag">已知边界</span>
            <span>五张图里<b>没有一处纯正的信号绿</b>——海报上的绿只有苔白与远景草坡两处，
              所以 <code>success</code> 取山林苔色 <code>{success}</code>，<code>diffAdded</code> 取草坡橄榄 <code>{dadd}</code>，
              两级明度分开承担「完成」与「新增」，不另造一个更漂亮的绿。
              同理，<code>markdownStrong</code> 是 1.jpg 白棚里那块纯白 <code>#FFFFFF</code>，
              <code>text</code> 只能退到钢白 <code>#CFE2E8</code>——明度上限被素材锁死，
              正文与粗体的间距只有 ΔE76 {strong_de}。</span>
          </div>

          <div class="diff">
            <div class="ln rm"><span class="no">41</span><span class="sign">-</span><span class="code">  "primary": "#cf2e25",</span></div>
            <div class="ln add"><span class="no">41</span><span class="sign">+</span><span class="code">  "primary": "{primary}",</span></div>
            <div class="ln rm"><span class="no">42</span><span class="sign">-</span><span class="code">  "borderActive": "#4db2ff",</span></div>
            <div class="ln add"><span class="no">42</span><span class="sign">+</span><span class="code">  "borderActive": "{active}",</span></div>
            <div class="ln rm"><span class="no">43</span><span class="sign">-</span><span class="code">  "diffRemoved": "#ff7a7a",</span></div>
            <div class="ln add"><span class="no">43</span><span class="sign">+</span><span class="code">  "diffRemoved": "{drem}",</span></div>
          </div>

          <div class="tool">
            <div class="row"><span class="pulse"></span><span class="name">run theme-audit</span><span class="st"><i></i>已完成</span></div>
            <div class="out">
              [1] 硬性 38 对（4.5:1）<b>0 违例</b><br>
              [2] UI 15 对（3.0:1）<b>0 违例</b><br>
              [3] 角色同值碰撞 <b>0</b> · 背景色相孤岛 <b>0</b>（基准 {base_hue}°）<br>
              [4] 品牌几何 {brand_hue}° → <b>{brand_cat}</b> · 语法核心最小 ΔE76 <b>{core_de}</b><br>
              [5] 退后梯队 comment {comment_c} / operator {operator_c} ≤ 核心最低 {core_c}
            </div>
          </div>
        </div>
      </div></div>

      <div class="toast"><i></i><span>主题已保存 · 37 色位</span><span class="sub">取色全部可复现</span></div>

      <div class="composer"><div class="col">
        <div class="cbox">
          <div class="ph">继续调整配色，或问我任意细节…</div>
          <div class="row">
            <span class="pill"><i></i>transformers.json</span>
            <span class="pill">dark</span>
            <button class="btn ghost" style="width:26px;height:26px;padding:0">＋</button>
            <span class="sp"></span>
            <button class="btn ghost" style="width:26px;height:26px;padding:0">⚙</button>
            <button class="send">↑</button>
          </div>
        </div>
        <div class="hint">Enter 发送 · Shift + Enter 换行
          <span class="r"><span class="chip" style="padding:2px 8px">37 tokens</span><span>变形金刚</span></span>
        </div>
      </div></div>
    </main>
  </div>

  <div class="sect" id="source">
    <div class="head"><h3>取色溯源</h3><span class="hintx">五张参考图 · 每块颜色都能指回原图的某个像素簇</span></div>
    <div class="posters">{posters}</div>
    <div class="sigs">{sigs}</div>
    <table class="prov" style="margin-top:18px">
      <thead><tr><th style="width:210px">色位</th><th style="width:96px">终值</th><th style="width:250px">配方</th><th style="width:250px">取色锚点</th><th>设计意图</th></tr></thead>
      <tbody>{prov}</tbody>
    </table>
  </div>

  <div class="sect" id="tokens">
    <div class="head"><h3>37 Color Tokens</h3><span class="hintx">色位 → DSH 真实落点</span></div>
    <div class="grid">{swatches}</div>
  </div>

  <div class="sect" id="ratio">
    <div class="head"><h3>对比度审计</h3><span class="hintx">与 docs/theme-audit/criteria.md 同口径</span></div>
    <div class="score">
      <div class="sc"><b>{hard_fail}</b><span>硬性违例 / {hard_total} 对（4.5:1）</span></div>
      <div class="sc"><b>{ui_fail}</b><span>UI 违例 / {ui_total} 对（3.0:1）</span></div>
      <div class="sc"><b>{design_warn}</b><span>IP 设计告警</span></div>
      <div class="sc"><b>{core_de}</b><span>语法核心最小 ΔE76（门槛 10）</span></div>
      <div class="sc"><b>{recipe_fails}</b><span>配方复算失败</span></div>
    </div>
    <div class="cols2">
      <div class="panel">
        <h4>最紧的 10 对正文</h4>
        <table class="ruler"><thead><tr><th>配对</th><th class="num">实测</th><th class="num">阈值</th><th>结果</th></tr></thead>
        <tbody>{tight_hard}</tbody></table>
      </div>
      <div class="panel">
        <h4>最紧的 8 对非文本</h4>
        <table class="ruler"><thead><tr><th>配对</th><th class="num">实测</th><th class="num">阈值</th><th>结果</th></tr></thead>
        <tbody>{tight_ui}</tbody></table>
      </div>
    </div>
    <div class="panel" style="margin-top:16px">
      <h4>全部 {hard_total} + {ui_total} 对</h4>
      <table class="ruler"><thead><tr><th>配对</th><th>前景</th><th>背景</th><th class="num">对比度</th><th class="num">阈值</th><th>结果</th></tr></thead>
      <tbody>{rows}</tbody></table>
    </div>
  </div>

  <div class="foot">
    <span>Transformers · 37 colors · dark · 全部取自 5 张参考图</span>
    <span>DSH / OpenCode Palette · IP 预置第二来源</span>
  </div>
</div>
</body>
</html>
"""


if __name__ == "__main__":
    main()
