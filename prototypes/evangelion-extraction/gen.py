# -*- coding: utf-8 -*-
"""从 palette.json 生成 EVA IP 主题预览页 ../evangelion-theme-preview.html。

用法：python gen.py
输出：prototypes/evangelion-theme-preview.html（单文件，色值与图内裁切全部内联）
"""
import json, os, re, html

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'evangelion-theme-preview.html')
P = json.load(open(os.path.join(HERE, 'palette.json'), encoding='utf-8'))

D = P['colors']
L = P['colorsLight']
SLOTS = P['slots']
ANCHORS = P['anchors']

# ── 变量映射：37 槽 → 页面用到的 CSS 变量 ──
VAR_MAP = [
    ('--bg', 'background'), ('--panel', 'backgroundPanel'), ('--elem', 'backgroundElement'),
    ('--sidebar', 'sidebarBg'), ('--bubble', 'bubbleBg'), ('--input', 'inputBg'),
    ('--code', 'codeBlockBg'), ('--codehead', 'codeHeaderBg'),
    ('--text', 'text'), ('--muted', 'textMuted'),
    ('--primary', 'primary'), ('--secondary', 'secondary'), ('--info', 'info'),
    ('--success', 'success'), ('--warning', 'warning'), ('--error', 'error'),
    ('--border', 'border'), ('--active', 'borderActive'),
    ('--dadd', 'diffAdded'), ('--drem', 'diffRemoved'),
    ('--daddbg', 'diffAddedBg'), ('--drembg', 'diffRemovedBg'),
    ('--daddln', 'diffAddedLineNumberBg'), ('--dremln', 'diffRemovedLineNumberBg'),
    ('--h', 'markdownHeading'), ('--link', 'markdownLink'), ('--mcode', 'markdownCode'),
    ('--em', 'markdownEmph'), ('--strong', 'markdownStrong'), ('--quote', 'markdownBlockQuote'),
    ('--scom', 'syntaxComment'), ('--skw', 'syntaxKeyword'), ('--sfn', 'syntaxFunction'),
    ('--styp', 'syntaxType'), ('--snum', 'syntaxNumber'), ('--sstr', 'syntaxString'),
    ('--sop', 'syntaxOperator'),
]

def var_block(mode):
    src = D if mode == 'dark' else L
    return '\n'.join('    %s:%s;' % (v, src[k]) for v, k in VAR_MAP)

def preset_obj(pid, title, appearance, colors):
    return {'schema': 'dsh-opencode-palette.custom-theme.v1', 'id': pid, 'name': title,
            'appearance': appearance, 'basePreset': pid, 'updatedAt': '2026-10-20T10:30:00+08:00',
            'colors': {k: colors[k] for k in sorted(colors)}}

def hl_json(obj):
    out = []
    for line in json.dumps(obj, indent=2, ensure_ascii=False).split('\n'):
        m = re.match(r'^(\s*)"([^"]+)"(\s*:\s*)(.*?)(,?)$', line)
        if m:
            indent, key, colon, val, comma = m.groups()
            if val.startswith('"'):
                v = '<span class="tk-str">%s</span>' % val
            elif re.match(r'^-?\d+(\.\d+)?$', val):
                v = '<span class="tk-num">%s</span>' % val
            elif val in ('true', 'false', 'null'):
                v = '<span class="tk-kw">%s</span>' % val
            else:
                v = '<span class="tk-op">%s</span>' % val
            cm = '<span class="tk-op">%s</span>' % comma if comma else ''
            out.append('%s<span class="tk-plain">"%s"</span><span class="tk-op">%s</span>%s%s' % (indent, key, colon, v, cm))
        else:
            out.append('<span class="tk-op">%s</span>' % line)
    return '\n'.join(out)

CSS = r"""
:root{
  color-scheme:dark;
__DARK__
}
html[data-mode="light"]{
  color-scheme:light;
__LIGHT__
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{
  background:var(--bg);color:var(--text);
  font-family:"Inter","Segoe UI","Microsoft YaHei UI","Microsoft YaHei",system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
}
html[data-mode="dark"] body{
  background:
    radial-gradient(1200px 620px at 18% -8%, color-mix(in srgb,var(--primary) 16%,transparent), transparent 62%),
    radial-gradient(900px 520px at 92% 4%, color-mix(in srgb,var(--info) 11%,transparent), transparent 58%),
    var(--bg);
}
html[data-mode="light"] body{
  background:
    radial-gradient(1100px 560px at 16% -10%, color-mix(in srgb,var(--primary) 13%,transparent), transparent 60%),
    var(--bg);
}
/* ── 顶栏 ── */
.top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:14px;
  padding:11px 30px;border-bottom:.5px solid var(--border);
  background:color-mix(in srgb,var(--bg) 84%,transparent);backdrop-filter:blur(14px)}
.top .mark{width:26px;height:26px;flex:none}
.top .ttl{font-size:13px;font-weight:650;letter-spacing:.04em}
.top .ttl span{color:var(--muted);font-weight:400;letter-spacing:.14em;font-size:10.5px;margin-left:8px}
.top .right{margin-left:auto;display:flex;align-items:center;gap:10px}
.pill{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);
  background:var(--panel);border:.5px solid var(--border);border-radius:999px;padding:4px 11px;
  font-family:"Cascadia Code",Consolas,monospace}
.pill i{width:6px;height:6px;border-radius:50%;background:var(--success)}
.seg{display:flex;border:.5px solid var(--border);border-radius:8px;overflow:hidden;background:var(--panel)}
.seg button{border:0;background:transparent;color:var(--muted);font:inherit;font-size:11.5px;padding:5px 13px;cursor:pointer}
.seg button.on{background:var(--primary);color:var(--bg);font-weight:650}
/* ── 版面 ── */
.sheet{width:1400px;margin:0 auto;padding:38px 60px 64px}
.eyebrow{font-size:10.5px;letter-spacing:.3em;color:var(--muted);text-transform:uppercase;
  font-family:"Cascadia Code",Consolas,monospace}
h1.title{font-size:38px;line-height:1.08;margin:12px 0 10px;letter-spacing:-.01em;font-weight:650}
h1.title em{font-style:normal;color:var(--primary)}
h1.title .v{font-family:"Cascadia Code",Consolas,monospace;font-size:15px;color:var(--muted);
  letter-spacing:.22em;vertical-align:6px;margin-left:12px}
.sub{font-size:13.5px;color:var(--muted);max-width:900px;line-height:1.85}
.sub b{color:var(--text);font-weight:600}
.rule{height:1px;background:linear-gradient(90deg,var(--primary),color-mix(in srgb,var(--info) 60%,transparent),transparent);margin:18px 0 0}
.chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
.chip{display:flex;align-items:center;gap:9px;background:var(--panel);border:.5px solid var(--border);
  border-radius:10px;padding:6px 12px 6px 7px;font-size:11.5px;color:var(--muted)}
.chip img{width:26px;height:26px;border-radius:6px;display:block;border:.5px solid var(--border)}
.chip b{color:var(--text);font-weight:600;font-family:"Cascadia Code",Consolas,monospace;font-size:11px}
.ideas{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:26px}
.idea{background:var(--panel);border:.5px solid var(--border);border-radius:12px;padding:14px 15px 15px}
.idea .no{font-family:"Cascadia Code",Consolas,monospace;font-size:10px;color:var(--primary);letter-spacing:.2em}
.idea h4{margin:7px 0 6px;font-size:13px;font-weight:650}
.idea p{margin:0;font-size:12px;line-height:1.75;color:var(--muted)}
.idea code{font-family:"Cascadia Code",Consolas,monospace;font-size:11px;color:var(--mcode)}
/* ── 应用窗口 ── */
.win{margin-top:30px;border-radius:14px;overflow:hidden;position:relative;
  background:var(--bg);border:.5px solid var(--border);
  box-shadow:0 26px 60px -18px color-mix(in srgb,var(--text) 26%,transparent);display:flex}
.sb{width:248px;flex:none;background:var(--sidebar);border-right:.5px solid var(--border);
  display:flex;flex-direction:column;padding:14px 12px 12px}
.brand{display:flex;align-items:center;gap:9px;padding:2px 6px 14px}
.brand .name{font-size:13.5px;font-weight:650;letter-spacing:.02em}
.brand .badge{font-size:9.5px;color:var(--muted);border:.5px solid var(--border);border-radius:4px;padding:1px 4px;margin-left:auto;letter-spacing:.08em}
.ws{display:flex;align-items:center;gap:8px;background:var(--panel);border:.5px solid var(--border);
  border-radius:9px;padding:7px 9px;font-size:12.5px;margin-bottom:14px}
.ws .dot{width:17px;height:17px;border-radius:4px;background:var(--primary);color:var(--bg);font-size:9px;
  display:grid;place-items:center;font-weight:700}
.ws .caret{margin-left:auto;color:var(--muted);font-size:10px}
.nav{display:flex;flex-direction:column;gap:2px}
.nav .it{position:relative;display:flex;align-items:center;gap:9px;font-size:12.5px;color:var(--muted);
  padding:7px 9px;border-radius:7px}
.nav .it:hover{background:color-mix(in srgb,var(--text) 7%,transparent)}
.nav .it.on{background:color-mix(in srgb,var(--primary) 15%,transparent);color:var(--text);font-weight:600}
.nav .it.on:before{content:"";position:absolute;left:0;top:6px;bottom:6px;width:3px;border-radius:3px;background:var(--primary)}
.nav .it .ic{width:14px;height:14px;border:1.4px solid currentColor;border-radius:3px;opacity:.7;flex:none}
.nav .it .ic.round{border-radius:50%}
.nav .it .ic.dia{transform:rotate(45deg);border-radius:2px}
.side-lbl{font-size:10px;letter-spacing:.2em;color:var(--muted);margin:16px 8px 6px;text-transform:uppercase;opacity:.7}
.threads{display:flex;flex-direction:column;gap:1px}
.th{font-size:12px;color:var(--muted);padding:6px 9px;border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.th:hover{background:color-mix(in srgb,var(--text) 7%,transparent)}
.th.sel{background:color-mix(in srgb,var(--text) 12%,transparent);color:var(--text)}
.sb-foot{margin-top:auto;display:flex;align-items:center;gap:9px;padding:9px 6px 2px;border-top:.5px solid var(--border);font-size:12px}
.av{width:24px;height:24px;border-radius:50%;background:var(--primary);color:var(--bg);display:grid;place-items:center;font-size:11px;font-weight:700}
.sb-foot .gear{margin-left:auto;color:var(--muted);font-size:13px}
.main{flex:1;display:flex;flex-direction:column;min-width:0;position:relative}
.topbar{height:46px;flex:none;display:flex;align-items:center;gap:10px;padding:0 18px;border-bottom:.5px solid var(--border)}
.topbar .h{font-size:13px;font-weight:650}
.topbar .crumb{font-size:11.5px;color:var(--muted);font-family:"Cascadia Code",Consolas,monospace}
.topbar .right{margin-left:auto;display:flex;align-items:center;gap:8px}
.chip2{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);
  background:var(--panel);border:.5px solid var(--border);border-radius:999px;padding:4px 10px}
.chip2 i{width:6px;height:6px;border-radius:50%;background:var(--info)}
.chip2 i.idle{background:var(--secondary)}
.btn{border:0;border-radius:7px;font-size:12px;padding:6px 12px;font-family:inherit;cursor:pointer}
.btn.primary{background:var(--primary);color:var(--bg);font-weight:650}
.btn.ghost{background:transparent;color:var(--muted)}
.btn.ghost:hover{background:color-mix(in srgb,var(--text) 10%,transparent);color:var(--text)}
.btn.outline{background:transparent;border:.5px solid var(--active);color:var(--text)}
.btn.contrast{background:var(--text);color:var(--bg)}
.feed{flex:1;padding:22px 26px 80px;overflow:hidden}
.col{width:720px;margin:0 auto}
.user{display:flex;justify-content:flex-end;margin-bottom:20px}
.user .bub{background:var(--bubble);border-radius:12px 12px 3px 12px;padding:10px 14px;font-size:13px;
  line-height:1.65;max-width:520px;border:.5px solid var(--border)}
.who{display:flex;align-items:center;gap:7px;margin-bottom:9px}
.who .k{width:20px;height:20px;display:grid;place-items:center}
.who .n{font-size:12px;font-weight:650;letter-spacing:.02em}
.who .t{font-size:10.5px;color:var(--muted);border:.5px solid var(--border);border-radius:5px;padding:1px 5px;font-family:"Cascadia Code",Consolas,monospace}
.md{font-size:13px;line-height:1.78}
.md h2{font-size:15.5px;line-height:1.4;color:var(--h);margin:0 0 8px;font-weight:650;letter-spacing:.01em}
.md p{margin:0 0 10px}
.md strong{color:var(--strong);font-weight:700}
.md em{color:var(--em);font-style:italic}
.md a{color:var(--link);text-decoration:underline;text-underline-offset:2px;text-decoration-thickness:.5px}
.md code{font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px;color:var(--mcode);
  border:.5px solid var(--border);border-radius:4px;padding:0 4px}
.md ul{margin:0 0 10px;padding-left:18px}
.md li{margin:2px 0}
.md blockquote{margin:0 0 12px;padding:2px 0 2px 12px;border-left:2px solid var(--active);color:var(--quote);font-size:12.5px}
.warn{display:flex;gap:9px;align-items:flex-start;background:color-mix(in srgb,var(--warning) 12%,transparent);
  border-left:2.5px solid var(--warning);border-radius:5px;padding:9px 12px;margin:0 0 12px;font-size:12px;line-height:1.65;color:var(--warning)}
.warn b{font-weight:700}
.warn .tag{font-size:10px;letter-spacing:.1em;border:.5px solid color-mix(in srgb,var(--warning) 45%,transparent);
  border-radius:4px;padding:0 5px;flex:none;margin-top:1px}
.md table{border-collapse:collapse;font-size:12px;margin:0 0 12px;width:100%}
.md th{text-align:left;font-weight:650;padding:7px 10px;border-bottom:.5px solid var(--active);
  background:color-mix(in srgb,var(--panel) 70%,transparent)}
.md td{padding:7px 10px;border-bottom:.5px solid var(--border)}
.md td .ok{color:var(--success);font-weight:700}
.md td .no{color:var(--error);font-weight:700}
.md td.mono{font-family:"Cascadia Code",Consolas,monospace;font-size:11px;color:var(--muted)}
.cc{border-radius:9px;overflow:hidden;margin:2px 0 12px;background:var(--code);border:.5px solid var(--border)}
.cc .hd{display:flex;align-items:center;gap:8px;background:var(--codehead);padding:7px 12px 6px;font-size:11px;color:var(--muted)}
.cc .hd .lang{color:var(--muted);font-family:"Cascadia Code",Consolas,monospace}
.cc .hd .cp{margin-left:auto;font-size:10.5px;opacity:.7}
.cc pre{margin:0;padding:11px 14px 13px;overflow:hidden;
  font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px;line-height:1.85;white-space:pre}
.tk-com{color:var(--scom);font-style:italic}
.tk-kw{color:var(--skw)}
.tk-fn{color:var(--sfn)}
.tk-typ{color:var(--styp)}
.tk-num{color:var(--snum)}
.tk-str{color:var(--sstr)}
.tk-op{color:var(--sop)}
.tk-plain{color:var(--text)}
.diff{border-radius:9px;overflow:hidden;background:var(--code);margin:0 0 12px;border:.5px solid var(--border);
  font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px}
.diff .ln{display:flex;gap:10px;padding:2px 12px 2px 0}
.diff .ln .no{width:30px;padding-right:7px;text-align:right;opacity:.75;border-right:.5px solid transparent}
.diff .rm{background:var(--drembg)}
.diff .rm .no{background:var(--dremln);color:var(--drem);border-right-color:var(--drembg)}
.diff .rm .sign,.diff .rm .code{color:var(--drem)}
.diff .add{background:var(--daddbg)}
.diff .add .no{background:var(--daddln);color:var(--dadd);border-right-color:var(--daddbg)}
.diff .add .sign,.diff .add .code{color:var(--dadd)}
.diff .ln .sign{width:8px}
.tool{background:var(--elem);border-radius:9px;padding:10px 13px;margin:0 0 12px;font-size:12px}
.tool .row{display:flex;align-items:center;gap:8px}
.tool .name{font-weight:650}
.tool .st{margin-left:auto;color:var(--success);font-size:11px;display:flex;align-items:center;gap:5px}
.tool .st i{width:6px;height:6px;border-radius:50%;background:var(--success)}
.tool .out{margin-top:7px;font-family:"Cascadia Code",Consolas,monospace;font-size:10.8px;line-height:1.75;color:var(--muted)}
.tool .out b{color:var(--success);font-weight:700}
.pulse{width:14px;height:14px;border-radius:50%;border:1.6px solid color-mix(in srgb,var(--info) 35%,transparent);border-top-color:var(--info)}
.toast{position:absolute;right:22px;bottom:126px;background:var(--elem);border:.5px solid var(--border);
  border-radius:9px;padding:9px 13px;display:flex;align-items:center;gap:9px;font-size:12px;
  box-shadow:0 12px 26px -12px color-mix(in srgb,var(--text) 45%,transparent)}
.toast i{width:7px;height:7px;border-radius:50%;background:var(--success)}
.toast .sub{color:var(--muted);font-size:11px}
.composer{flex:none;padding:10px 26px 14px}
.cbox{background:var(--input);border:.5px solid var(--active);border-radius:12px;padding:11px 13px 9px}
.cbox .ph{font-size:13px;color:var(--muted)}
.cbox .row{display:flex;align-items:center;gap:7px;margin-top:9px}
.cbox .row .sp{margin-left:auto}
.pill2{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;color:var(--muted);
  background:var(--panel);border:.5px solid var(--border);border-radius:999px;padding:3px 8px}
.pill2 i{width:5px;height:5px;border-radius:50%;background:var(--primary)}
.send{width:28px;height:28px;border-radius:8px;background:var(--primary);color:var(--bg);display:grid;place-items:center;
  font-size:13px;font-weight:700;border:0}
.hint{display:flex;align-items:center;gap:8px;font-size:10.5px;color:var(--muted);padding:7px 4px 0}
.hint .r{margin-left:auto;display:flex;gap:6px;align-items:center}
/* ── 区块 ── */
.sec{margin-top:46px}
.sec .head{display:flex;align-items:baseline;gap:14px;margin-bottom:6px}
.sec h3{font-size:13px;letter-spacing:.26em;text-transform:uppercase;margin:0;font-weight:650}
.sec .hintx{font-size:11.5px;color:var(--muted)}
.sec .lede{font-size:12.5px;color:var(--muted);max-width:980px;line-height:1.8;margin:0 0 16px}
.sec .lede b{color:var(--text);font-weight:600}
.groups{display:flex;flex-direction:column;gap:14px}
.group{background:var(--panel);border:.5px solid var(--border);border-radius:12px;overflow:hidden}
.group .ghead{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:.5px solid var(--border);
  background:color-mix(in srgb,var(--elem) 60%,transparent)}
.group .ghead b{font-size:12px;letter-spacing:.12em}
.group .ghead span{font-size:11px;color:var(--muted);margin-left:auto;font-family:"Cascadia Code",Consolas,monospace}
.slot{display:grid;grid-template-columns:36px 1fr 1fr 250px 250px;gap:12px;align-items:center;
  padding:9px 14px;border-bottom:.5px solid var(--border)}
.slot:last-child{border-bottom:0}
.slot:hover{background:color-mix(in srgb,var(--text) 4%,transparent)}
.chipsw{display:flex;gap:4px}
.chipsw i{width:16px;height:26px;border-radius:4px;display:block;border:.5px solid var(--border)}
.slot .key{font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px;color:var(--text);font-weight:600}
.slot .key em{display:block;font-style:normal;font-size:10.5px;color:var(--muted);font-weight:400;margin-top:2px;font-family:inherit}
.slot .hex{font-family:"Cascadia Code",Consolas,monospace;font-size:11px;color:var(--muted)}
.slot .hex b{display:block;color:var(--text);font-weight:600}
.slot .rc{font-size:10.5px;color:var(--muted);font-family:"Cascadia Code",Consolas,monospace;line-height:1.5}
.slot .rc .k{color:var(--info)}
.slot .rc .k2{color:var(--secondary)}
.stat{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
.stat div{background:var(--panel);border:.5px solid var(--border);border-radius:10px;padding:12px 13px}
.stat .v{font-family:"Cascadia Code",Consolas,monospace;font-size:21px;color:var(--primary);font-weight:700;line-height:1}
.stat .l{font-size:11px;color:var(--muted);margin-top:6px;line-height:1.5}
.stat .l b{color:var(--text);font-weight:600}
.anchors{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
.anc{background:var(--panel);border:.5px solid var(--border);border-radius:10px;overflow:hidden}
.anc img{width:100%;height:88px;object-fit:cover;display:block}
.anc .m{padding:8px 9px 9px}
.anc .m b{font-family:"Cascadia Code",Consolas,monospace;font-size:11px;color:var(--text)}
.anc .m p{margin:3px 0 0;font-size:10.5px;color:var(--muted);line-height:1.55}
.anc .m .f{font-size:9.5px;color:var(--muted);opacity:.8;margin-top:4px;font-family:"Cascadia Code",Consolas,monospace}
.audit{width:100%;border-collapse:collapse;font-size:11.5px}
.audit th{text-align:left;padding:8px 10px;border-bottom:.5px solid var(--active);color:var(--muted);
  font-weight:650;letter-spacing:.06em;font-size:10.5px;text-transform:uppercase}
.audit td{padding:5px 10px;border-bottom:.5px solid var(--border)}
.audit td.mono{font-family:"Cascadia Code",Consolas,monospace;font-size:10.5px;color:var(--muted)}
.badge{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;border-radius:5px;padding:1px 7px}
.badge.ok{color:var(--success);background:color-mix(in srgb,var(--success) 14%,transparent)}
.badge.no{color:var(--error);background:color-mix(in srgb,var(--error) 14%,transparent)}
details{margin-top:10px}
details summary{cursor:pointer;font-size:11.5px;color:var(--muted);padding:6px 0}
details summary:hover{color:var(--text)}
.notice{display:flex;gap:10px;align-items:flex-start;background:color-mix(in srgb,var(--info) 10%,transparent);
  border-left:2.5px solid var(--info);border-radius:5px;padding:10px 13px;margin:0 0 14px;font-size:12px;line-height:1.7;color:var(--text)}
.notice .tag{font-size:10px;letter-spacing:.1em;border:.5px solid color-mix(in srgb,var(--info) 45%,transparent);
  border-radius:4px;padding:0 5px;flex:none;margin-top:2px;color:var(--info)}
.notice b{font-weight:700}
.sec2col{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.ccard-h{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--text);
  font-family:"Cascadia Code",Consolas,monospace;margin-bottom:8px}
.ccard-h span{color:var(--muted);margin-left:auto;font-size:10.5px}
.ccard-h .dotd,.ccard-h .dotl{width:8px;height:8px;border-radius:2px;background:var(--primary)}
.ccard-h .dotl{background:var(--info)}
.jsoncard{border-radius:10px;overflow:hidden;border:.5px solid var(--border);background:var(--code)}
.jsoncard .hd{display:flex;align-items:center;gap:8px;background:var(--codehead);padding:7px 12px 6px;font-size:11px;color:var(--muted)}
.jsoncard pre{margin:0;padding:12px 14px;overflow:auto;max-height:560px;
  font-family:"Cascadia Code",Consolas,monospace;font-size:11px;line-height:1.7}
.foot{display:flex;justify-content:space-between;margin-top:26px;font-size:10.5px;color:var(--muted);
  border-top:.5px solid var(--border);padding-top:14px;font-family:"Cascadia Code",Consolas,monospace}
"""

JS = r"""
const PAL = window.__PALETTE__;
let mode = 'dark';
function lum(h){h=h.replace('#','');const v=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)
  .map(c=>c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4));return .2126*v[0]+.7152*v[1]+.0722*v[2]}

/* 37 色位表 */
const groups=[];
PAL.slots.forEach(s=>{let g=groups.find(x=>x.name===s.group);if(!g){g={name:s.group,slots:[]};groups.push(g)}g.slots.push(s)});
document.getElementById('groups').innerHTML=groups.map(g=>`
 <div class="group">
   <div class="ghead"><b>${g.name}</b><span>${g.slots.length} slots</span></div>
   ${g.slots.map(s=>`
     <div class="slot">
       <div class="chipsw"><i style="background:${s.dark.hex}" title="深色 ${s.dark.hex}"></i><i style="background:${s.light.hex}" title="浅色 ${s.light.hex}"></i></div>
       <div class="key">${s.key}<em>${s.role}</em></div>
       <div class="hex"><b>${s.dark.hex}</b>${s.light.hex}</div>
       <div class="rc"><span class="k">${s.dark.recipe.kind}</span> · ${s.dark.recipe.formula}<br>${s.dark.recipe.sources[0]}</div>
       <div class="rc"><span class="k2">${s.light.recipe.kind}</span> · ${s.light.recipe.formula}<br>${s.light.recipe.sources[0]}</div>
     </div>`).join('')}
 </div>`).join('');

/* 溯源 */
const used=new Set();
PAL.slots.forEach(s=>['dark','light'].forEach(m=>{
  const a=s[m].recipe.anchor; (Array.isArray(a)?a:[a]).forEach(x=>used.add(x))}));
const an=document.getElementById('anchors');
an.innerHTML=Object.entries(PAL.anchors).filter(([k])=>used.has(k)).map(([k,a])=>`
 <div class="anc">
   <img src="data:image/png;base64,${a.crop}" alt="${a.label}">
   <div class="m"><b>${a.hex}</b><p>${a.label}</p><div class="f">${a.file} · ${a.support>0 ? '同色 '+a.support.toLocaleString()+' px · 邻域方差 '+a.flatness : '三张图里没有成片平涂面 · 保留声明值 '+a.declared}</div></div>
 </div>`).join('');

/* 审计 */
const hard=PAL.checks.filter(r=>r.kind!=='matrix');
const matrix=PAL.checks.filter(r=>r.kind==='matrix');
function rows(list){
  return list.map(r=>`<tr><td>${r.code}</td><td class="mono">${r.fg}</td><td class="mono">${r.bg}</td>
   <td class="mono">${r.ratio.toFixed(2)} : 1</td><td class="mono">≥ ${r.threshold}</td>
   <td><span class="badge ${r.verdict==='pass'?'ok':'no'}">${r.verdict==='pass'?'通过':'未过'}</span></td>
   <td class="mono">${r.mode==='dark'?'深色':'浅色'}</td></tr>`).join('')
}
document.getElementById('audit').innerHTML=rows(hard);
document.getElementById('matrix').innerHTML=rows(matrix);
const fails=PAL.checks.filter(r=>r.verdict!=='pass').length;
document.getElementById('st-checks').textContent=PAL.checks.length;
document.getElementById('st-fails').textContent=fails;
document.getElementById('st-slots').textContent=PAL.slots.length;
document.getElementById('st-distinct').textContent=new Set(PAL.slots.map(s=>s.dark.hex)).size;
document.getElementById('st-anchors').textContent=Object.keys(PAL.anchors).length;

/* 模式切换 */
function setMode(m){
  mode=m;
  document.documentElement.dataset.mode=m;
  document.querySelectorAll('.seg button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
  document.querySelectorAll('[data-mode-label]').forEach(e=>e.textContent=m);
}
document.querySelectorAll('.seg button').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.m)));
const mm=/[?&]mode=(light|dark)/.exec(location.href);
setMode(mm?mm[1]:'dark');
"""

HERO = [('success', '同步绿 · Eva-01 肩甲'), ('primary', '机体高光淡紫'), ('error', '装甲红受光面'),
        ('info', '天空蓝 · 云'), ('warning', '装甲橙')]

def hero_chips():
    out = []
    for key, label in HERO:
        meta = None
        for a in ANCHORS.values():
            if a['hex'].lower() == D[key].lower():
                meta = a
                break
        if meta is None:  # 混色项：退到配方里的第一个采样锚点
            slot = next(s for s in SLOTS if s['key'] == key)
            first = slot['dark']['recipe']['sources'][0]
            fname = first.split(' · ')[0]
            for a in ANCHORS.values():
                if a['file'] == fname and a['label'] == slot['dark']['recipe']['sources'][0].split(' · ', 1)[1]:
                    meta = a
                    break
        if meta is None:
            continue
        out.append('<span class="chip"><img src="data:image/png;base64,%s" alt=""><b>%s</b>%s</span>'
                   % (meta['crop'], D[key], label))
    return ''.join(out)

CSS = CSS.replace('__DARK__', var_block('dark')).replace('__LIGHT__', var_block('light'))

TEMPLATE = r"""<!DOCTYPE html>
<html lang="zh-CN" data-mode="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>新世纪福音战士 EVA — IP 主题配色预览</title>
<style>
__CSS__
</style>
</head>
<body>
<div class="top">
  <svg class="mark" viewBox="0 0 28 28" aria-hidden="true">
    <path d="M14 1.6 25.4 7.6v12.8L14 26.4 2.6 20.4V7.6Z" fill="none" stroke="var(--primary)" stroke-width="1.4"/>
    <path d="M14 6.2 19.8 9.6v7.2L14 20.2 8.2 16.8V9.6Z" fill="var(--primary)" opacity=".16"/>
    <path d="M9.4 12.4 13.2 13.6v2.2l-3.8 1.2Z" fill="var(--success)"/>
    <path d="M18.6 12.4 14.8 13.6v2.2l3.8 1.2Z" fill="var(--success)"/>
    <path d="M11.2 18.4h5.6" stroke="var(--primary)" stroke-width="1.2" stroke-linecap="round"/>
  </svg>
  <div class="ttl">新世纪福音战士 <span>NEON GENESIS EVANGELION · DSH IP THEME</span></div>
  <div class="right">
    <span class="pill"><i></i><span id="st-slots">37</span> 色位 · 深浅两套</span>
    <div class="seg">
      <button data-m="dark">深色 · 夜战</button>
      <button data-m="light">浅色 · 晴空</button>
    </div>
  </div>
</div>

<div class="sheet">
  <div class="eyebrow">DSH / OpenCode Palette · 预置 IP 主题</div>
  <h1 class="title">新世纪福音战士 <em>EVA</em><span class="v">EVA-01 / UNIT-02</span></h1>
  <div class="sub">
    三张参考图：<b>1.jpg</b> 明日香装甲红与标题金、<b>2.jpg</b> Eva-01 机体紫与同步绿、<b>3.jpg</b> 天空云白与角色涂装。
    全部 <b>37</b> 个色位只有两种来源：<b>直采</b>（该 hex 是参考图里一块<b>平涂区域</b>的代表色——同色像素成片、3×3 邻域方差 0）、
    <b>定比混色</b>（两个采样色的固定比例，配方随值记录）。<b>没有一个色值是想象出来的</b>。
    落地形态：<b>evangelion</b>（深色，<b>替换</b>仓库既有同名预置）与 <b>evangelion-day</b>（浅色，新增）两份 IP 预置。
  </div>
  <div class="rule"></div>
  <div class="chips">__HERO__</div>

  <div class="ideas">
    <div class="idea"><div class="no">01 / 场</div><h4>底色是海报，不是画布</h4><p>深色底取 2.jpg 的海报黑 <code>__BG_D__</code>，面板取 3.jpg 的夜蓝 <code>__PANEL_D__</code>——界面像剧照里的夜空，而不是一块中性灰板。浅色那套则是 3.jpg 的云层。</p></div>
    <div class="idea"><div class="no">02 / 骨</div><h4>骨架靠亮度，不靠边框</h4><p>八个表面槽是一条亮度梯子（黑 → 暗紫 → 夜蓝 → 浮层），边框只留 <code>__BORDER__</code> 一档，避免线框噪声。深色侧栏比页面底略亮，浅色侧栏比页面底略暗——两种模式各按自己的直觉走。</p></div>
    <div class="idea"><div class="no">03 / 跳</div><h4>稀有色才配当主角</h4><p>绿色只占三张图 <b>2.5%</b> 的面积，红色占 <b>14.1%</b>（口径 B，见 census.py）——所以同步绿只当成功态，红色留给错误与删除行，海报标题的橙独占警告。</p></div>
    <div class="idea"><div class="no">04 / 义</div><h4>一槽一色，不撞车</h4><p>深浅两套各 <b>37/37</b> 个色位都是<b>互不相同的色值</b>：同一色相家族用不同明度台阶区分语义（新增行 / 成功 / 字符串各占一阶），避免"角色语义被抹平"。</p></div>
  </div>

  <div class="win">
    <aside class="sb">
      <div class="brand">
        <svg width="24" height="24" viewBox="0 0 28 28" aria-hidden="true">
          <path d="M14 1.6 25.4 7.6v12.8L14 26.4 2.6 20.4V7.6Z" fill="none" stroke="var(--primary)" stroke-width="1.5"/>
          <path d="M9.4 12.4 13.2 13.6v2.2l-3.8 1.2Z" fill="var(--success)"/>
          <path d="M18.6 12.4 14.8 13.6v2.2l3.8 1.2Z" fill="var(--success)"/>
        </svg>
        <span class="name">NERV</span><span class="badge">IP THEME</span>
      </div>
      <div class="ws"><span class="dot">N</span><span>midori</span><span class="caret">▾</span></div>
      <div class="nav">
        <div class="it on"><span class="ic round"></span>新会话<span style="margin-left:auto;font-size:10px;opacity:.6">⌘N</span></div>
        <div class="it"><span class="ic"></span>会话历史</div>
        <div class="it"><span class="ic dia"></span>文件</div>
        <div class="it"><span class="ic round"></span>终端</div>
      </div>
      <div class="side-lbl">最近</div>
      <div class="threads">
        <div class="th sel">EVA 主题 · 设计评审</div>
        <div class="th">把配色写进 IP 预置</div>
        <div class="th">37 色位落位与对比度</div>
        <div class="th">参考图取色溯源</div>
      </div>
      <div class="sb-foot"><span class="av">须</span><span>惣</span><span class="gear">⚙</span></div>
    </aside>

    <main class="main">
      <div class="topbar">
        <span class="h">EVA 主题 · 设计评审</span>
        <span class="crumb">/ 37 slots · <span data-mode-label>dark</span></span>
        <div class="right">
          <span class="chip2"><i class="idle"></i>就绪</span>
          <span class="chip2"><i></i>deepseek-flash</span>
          <button class="btn ghost">分享</button>
          <button class="btn primary">新建会话</button>
        </div>
      </div>

      <div class="feed"><div class="col">
        <div class="user"><div class="bub">用这三张 EVA 参考图重做一套主题配色，要求每个颜色都能说出是从图里哪一块取的。</div></div>

        <div class="who">
          <span class="k">
            <svg width="20" height="20" viewBox="0 0 28 28"><path d="M14 1.6 25.4 7.6v12.8L14 26.4 2.6 20.4V7.6Z" fill="none" stroke="var(--primary)" stroke-width="1.5"/><path d="M9.4 12.4 13.2 13.6v2.2l-3.8 1.2Z" fill="var(--success)"/><path d="M18.6 12.4 14.8 13.6v2.2l3.8 1.2Z" fill="var(--success)"/></svg>
          </span>
          <span class="n">惣</span><span class="t">evangelion.json</span>
        </div>

        <div class="md">
          <h2>37 色位 · 每个色值都能溯源</h2>
          <p>整套配色只有两个动作：<strong>直采</strong> 与 <strong>定比混色</strong>。对抗式审查推翻了第一版的「直采」定义——<em>离原图最近的那个像素</em>会锁死在 JPEG 振铃与文字描边上（第一版 44 个锚点里 <b>17 个整图只有 1 个同色像素</b>，颜色名还与实际像素对不上）。现在的直采 = <strong>平涂区域代表色</strong>：该处 3×3 邻域方差为 0、同色像素成片存在。混色写明配方与比例，任何人都能复算。核心取舍：</p>
          <ul>
            <li>错误色不取图里的纯红 <code>__PURE_RED__</code>：它在浮层底上只有 <code>__PURE_RED_R__ : 1</code>；改取「装甲红受光面 <code>__REDHOT__</code> × 云白 35%」，<code>__ERR_D__</code> 落到 <code>__ERR_R__ : 1</code>，八个表面上全部过线。</li>
            <li>判尺之外另做<b>真机复核</b>：把配色灌进仓库真实编辑器原型截图，量出三处审计器看不见的失败——行内码芯片 <code>__CHIP_R__ : 1</code>、浅色次按钮药丸 <code>__PILL_R__ : 1</code>、浅色信息按钮白字 <code>__INFO_R__ : 1</code>。三条已修，并已写进判尺常驻（见下方审计表）。</li>
            <li>深浅两套不是「反过来」：浅色底来自 3.jpg 的云层 <code>__BG_L__</code>，文字用 2.jpg 的夜蓝 <code>__TXT_L__</code>，所以白天那套是<em>天空</em>，不是同一批颜色反相。</li>
            <li>同一色相家族用不同明度台阶区分语义：新增行 <code>__DADD_D__</code>、成功态 <code>__SUC_D__</code>、字符串 <code>__SSTR_D__</code> 三阶分开，37 个槽两套各 37 个不同色值，零角色碰撞。</li>
            <li>六个品牌色都会被引擎当<b>填充色</b>用（按钮底 / 徽标底），所以每个品牌色都必须落在 BT.601 luma 0.6 的<b>同一侧</b>，否则引擎的 pickText 会挑到读不清的那一支——浅色信息色就是这么翻车的。</li>
          </ul>
          <blockquote>黑色是海报的夜，绿是同步的呼吸，红是明日香——三种情绪各占一个色相家族，互不串味。</blockquote>

          <div class="cc">
            <div class="hd"><span class="lang">json</span><span>evangelion.json</span><span class="cp">复制</span></div>
<pre>__PRESET_HEAD__</pre>
          </div>

          <table>
            <tr><th>检查项</th><th>结果</th><th>色值</th></tr>
            <tr><td>正文 on 页面底</td><td><span class="ok">__TXT_R__ : 1</span></td><td class="mono">__TXT_D__ / __BG_D__</td></tr>
            <tr><td>错误色 on 页面底</td><td><span class="ok">__ERR_R__ : 1</span></td><td class="mono">__ERR_D__ / __BG_D__</td></tr>
            <tr><td>图里纯红（已否决）</td><td><span class="no">__PURE_RED_R__ : 1</span></td><td class="mono">__PURE_RED__ / __BG_E__</td></tr>
          </table>

          <div class="warn">
            <span class="tag">落地注意</span>
            <span>深色那套的 id 是 <strong>evangelion</strong>，与仓库<strong>既有同名预置同位替换</strong>——老用户已经选中的「新世纪福音战士」会直接变成这套配色；浅色那套是新 id <strong>evangelion-day</strong>，需要同步改 <code>src/engine/ip-presets.ts</code> 与 <code>tests/ip-presets.test.ts</code> 的 id 清单与计数。</span>
          </div>

          <div class="diff">
            <div class="ln rm"><span class="no">41</span><span class="sign">-</span><span class="code">  "error": "__PURE_RED__",   <span style="opacity:.7">// 1.jpg 平涂红（浮层底上只 __PURE_RED_R__:1）</span></span></div>
            <div class="ln add"><span class="no">41</span><span class="sign">+</span><span class="code">  "error": "__ERR_D__",   <span style="opacity:.7">// 1.jpg 装甲红受光面 × 云白 35%</span></span></div>
          </div>

          <div class="tool">
            <div class="row"><span class="pulse"></span><span class="name">validate.ts · 仓库引擎复算</span><span class="st"><i></i>已完成</span></div>
            <div class="out">
              [1] 硬性正文对 <b>38 × 2 套 · 0 违例</b><br>
              [2] UI / 交互对 <b>15 × 2 套 · 0 违例</b><br>
              [3] IP 设计规范 <b>角色碰撞 0 · 语法 ΔE76 ≥ __DELTA__ · 退后通过</b><br>
              [4] 扩展矩阵（文字类 × 8 表面）<b>__MATRIX_N__ 对 · 0 未过</b><br>
              [5] 真机复核（行内码芯片 / 次按钮药丸 / 六品牌色 pickText）<b>__REALUI_N__ 对 · 0 未过</b>
            </div>
          </div>
        </div>
      </div></div>

      <div class="toast"><i></i><span>主题已保存 · 37 色位</span><span class="sub">深浅两套</span></div>

      <div class="composer"><div class="col">
        <div class="cbox">
          <div class="ph">继续调整配色，或问我任意细节…</div>
          <div class="row">
            <span class="pill2"><i></i>evangelion.json</span>
            <span class="pill2" data-mode-label>dark</span>
            <button class="btn ghost" style="width:26px;height:26px;padding:0">＋</button>
            <span class="sp"></span>
            <button class="btn ghost" style="width:26px;height:26px;padding:0">⚙</button>
            <button class="send">↑</button>
          </div>
        </div>
        <div class="hint">Enter 发送 · Shift + Enter 换行
          <span class="r"><span class="chip2" style="padding:2px 8px">37 slots</span><span>NERV</span></span>
        </div>
      </div></div>
    </main>
  </div>

  <div class="sec">
    <div class="head"><h3>37 Color Slots</h3><span class="hintx">左起两枚色块 = 深色 / 浅色；右二列为各自的取色配方</span></div>
    <p class="lede">色位与 DSH 的 <b>--dsw-alias-*</b> 变量一一对应（取自 <code>src/engine/map-dsh.ts</code>）。
      <b>直采</b> = 参考图里一块平涂区域的代表色（同色像素成片、3×3 邻域方差 0）；<b>定比混色</b> = 两个采样色的固定比例，配方可复算。</p>
    <div class="groups" id="groups"></div>
  </div>

  <div class="sec">
    <div class="head"><h3>取色溯源</h3><span class="hintx">每块色值都标出了它来自哪张图的哪个位置</span></div>
    <p class="lede">下面每一张缩略图都是从参考图里裁下来的原像素区域，颜色即该区域的实际取样值。
      锚点全部来自三张参考图，没有任何外部色卡；每张缩略图下方标出该颜色在原图里的<b>同色像素数</b>与<b>邻域方差</b>（方差 0 = 真平涂，不是描边也不是振铃）。其中 <b>__NOSUP__</b> 个锚点（林绿 / 冷纸白）在三张图里找不到成片平涂面，保留声明值并在卡片上如实标注。</p>
    <div class="stat">
      <div><div class="v" id="st-slots2">37</div><div class="l"><b>色位</b> × 深浅两套 = 74 个色值</div></div>
      <div><div class="v" id="st-distinct">37</div><div class="l">深色套<b>去重后</b>色值数（37 槽零碰撞）</div></div>
      <div><div class="v" id="st-checks">234</div><div class="l">条对比度实测，<b>未过 <span id="st-fails">0</span></b> 条</div></div>
      <div><div class="v" id="st-anchors">44</div><div class="l">个取样锚点，全部取自三张图的<b>平涂区域</b></div></div>
    </div>
    <div class="anchors" id="anchors"></div>
  </div>

  <div class="sec">
    <div class="head"><h3>对比度审计</h3><span class="hintx">WCAG 2.1 相对亮度比 · 正文/语义色 ≥ 4.5:1，非文本组件 ≥ 3:1</span></div>
    <p class="lede">口径与仓库 <code>docs/theme-audit/criteria.md</code> 一致：<code>label-dimmed</code> 按
      <code>withAlpha(textMuted, 0.8)</code> 在 gamma 编码的 sRGB 空间合成后再比。</p>
    <table class="audit">
      <thead><tr><th>检查项</th><th>前景</th><th>背景</th><th>比值</th><th>阈值</th><th>结果</th><th>模式</th></tr></thead>
      <tbody id="audit"></tbody>
    </table>
    <details><summary>展开扩展矩阵：文字类角色 × 8 个渲染表面（__MATRIX_N__ 对，全部 ≥ 4.5:1）</summary>
      <table class="audit">
        <thead><tr><th>检查项</th><th>前景</th><th>背景</th><th>比值</th><th>阈值</th><th>结果</th><th>模式</th></tr></thead>
        <tbody id="matrix"></tbody>
      </table>
    </details>
  </div>

  <div class="sec">
    <div class="head"><h3>落地为 IP 预置</h3><span class="hintx">src/custom-presets/*.json · custom-theme.v1</span></div>
    <div class="notice">
      <span class="tag">注意</span>
      <span><b>evangelion.json</b> 会<b>替换</b>仓库里既有的同名预置（id / name 不变），老用户选中的「新世纪福音战士」会直接换成这套配色；
        <b>evangelion-day.json</b> 是新增的浅色预置，需要在 <code>src/engine/ip-presets.ts</code> 登记，并在 <code>tests/ip-presets.test.ts</code> 的
        <code>EXPECTED_IDS</code> 与计数里同步。</span>
    </div>
    <div class="sec2col">
      <div>
        <div class="ccard-h"><span class="dotd"></span>evangelion.json<span>深色 · 夜战</span></div>
        <div class="jsoncard">
          <div class="hd"><span class="lang">json</span><span>evangelion.json</span><span class="cp">复制</span></div>
          <pre>__PRESET_DARK__</pre>
        </div>
      </div>
      <div>
        <div class="ccard-h"><span class="dotl"></span>evangelion-day.json<span>浅色 · 晴空</span></div>
        <div class="jsoncard">
          <div class="hd"><span class="lang">json</span><span>evangelion-day.json</span><span class="cp">复制</span></div>
          <pre>__PRESET_LIGHT__</pre>
        </div>
      </div>
    </div>
  </div>

  <div class="foot">
    <span>EVA IP theme · 37 slots × 2 modes · 取自 1.jpg / 2.jpg / 3.jpg 的平涂区域</span>
    <span>dsh-opencode-palette · prototypes/evangelion-extraction</span>
  </div>
</div>

<script>
window.__PALETTE__ = __PALETTE_JSON__;
__JS__
</script>
</body>
</html>
"""

def ratio(f, b):
    def lum(h):
        v = []
        for c in [int(h.lstrip('#')[i:i+2], 16) / 255 for i in (0, 2, 4)]:
            v.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
        return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
    l1, l2 = sorted((lum(f), lum(b)), reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)

pd = preset_obj('evangelion', '新世纪福音战士', 'dark', D)
pl = preset_obj('evangelion-day', '新世纪福音战士 · 晴空', 'light', L)

def find_ratio(fg, bg):
    for r in P['checks']:
        if r['mode'] == 'dark' and r['fg'] == fg and r['bg'] == bg and r['kind'] != 'matrix':
            return r['ratio']
    return round(ratio(fg, bg), 2)

matrix_n = len([r for r in P['checks'] if r['kind'] == 'matrix'])

html = TEMPLATE
html = html.replace('__CSS__', CSS)
html = html.replace('__HERO__', hero_chips())
html = html.replace('__PALETTE_JSON__', json.dumps(P, ensure_ascii=False).replace('</', '<\\/'))
html = html.replace('__JS__', JS)
html = html.replace('__PRESET_HEAD__', '\n'.join(hl_json(pd).split('\n')[:13]))
html = html.replace('__PRESET_DARK__', hl_json(pd))
html = html.replace('__PRESET_LIGHT__', hl_json(pl))
html = html.replace('__BG_D__', D['background']).replace('__BG_L__', L['background'])
html = html.replace('__PANEL_D__', D['backgroundPanel'])
html = html.replace('__TXT_D__', D['text']).replace('__TXT_L__', L['text'])
html = html.replace('__ERR_D__', D['error']).replace('__ERR_L__', L['error'])
html = html.replace('__SUC_D__', D['success']).replace('__SUC_L__', L['success'])
html = html.replace('__DADD_D__', D['diffAdded']).replace('__SSTR_D__', D['syntaxString'])
html = html.replace('__BORDER__', D['border'])
html = html.replace('__BG_E__', D['backgroundElement'])
html = html.replace('__ERR_R__', str(find_ratio(D['error'], D['background'])))
html = html.replace('__TXT_R__', str(find_ratio(D['text'], D['background'])))
html = html.replace('__DELTA__', str(P['stats']['dark']['coreMin']))
html = html.replace('__MATRIX_N__', str(matrix_n))

# 真机复核三条的实测值（审计器原本测不到的三处）
def check_ratio(mode, code):
    for r in P['checks']:
        if r['mode'] == mode and r['code'] == code:
            return r['ratio']
    return None
realui_n = len([r for r in P['checks'] if r['code'] in ('markdownCode@inlineChip', 'secondary@secondaryPill')
                or r['code'].startswith('contrastText(')])
html = html.replace('__REALUI_N__', str(realui_n))
html = html.replace('__CHIP_R__', str(check_ratio('dark', 'markdownCode@inlineChip')))
html = html.replace('__PILL_R__', str(check_ratio('light', 'secondary@secondaryPill')))
html = html.replace('__INFO_R__', str(check_ratio('light', 'contrastText(info)@info')))
html = html.replace('__PURE_RED__', ANCHORS['red']['hex'])
html = html.replace('__REDHOT__', ANCHORS['redHot']['hex'])
html = html.replace('__PURE_RED_R__', str(round(ratio(ANCHORS['red']['hex'], D['backgroundElement']), 2)))
html = html.replace('__NOSUP__', str(len([a for a in ANCHORS.values() if a.get('support', 0) == 0])))

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)
print('written:', OUT, os.path.getsize(OUT), 'bytes')
print('slots:', len(SLOTS), '· matrix rows:', matrix_n, '· anchors:', len(ANCHORS))
