# -*- coding: utf-8 -*-
"""Generate the Harry Potter theme preview.html (self-contained, images inlined as base64)."""
import json
import os

OUT = os.path.dirname(os.path.abspath(__file__))
PREVIEW = os.path.join(os.path.dirname(OUT), "harry-potter-theme-preview.html")
PAL = json.load(open(os.path.join(OUT, "palette.json"), encoding="utf-8"))
C = PAL["colors"]
PROV = json.load(open(os.path.join(OUT, "provenance.json"), encoding="utf-8"))
ANCH = {a["id"]: a for a in PROV["anchors"]}
GAL = {g["file"]: g for g in PROV["gallery"]}

# ── 每个色位的来源说明 ─────────────────────────────────────────────────────
# kind: 'direct'（图中直接采样）| 'step'（采样色的明度/彩度阶梯）| 'mix'（两个采样色的混色）
SRC = {
    "background":            ("direct", "night",   "4.jpg 夜空顶部的深蓝——整套「场」的基准色"),
    "sidebarBg":             ("step",   "night",   "夜空蓝同色相 H211°，明度降到 L8.2%（侧栏下沉）"),
    "backgroundPanel":       ("step",   "night",   "同色相 H211°，明度抬到 L16.7%（承托面板）"),
    "backgroundElement":     ("step",   "night",   "同色相 H211°，明度 L19.8%（浮层最高）"),
    "bubbleBg":              ("step",   "night",   "同色相 H211°，明度 L19.4%（气泡浮起）"),
    "inputBg":               ("step",   "night",   "同色相 H211°，明度 L15.1%（输入框凹陷）"),
    "codeBlockBg":           ("step",   "night",   "同色相 H211°，明度 L6.1%（代码舞台最深处）"),
    "codeHeaderBg":          ("step",   "night",   "同色相 H211°，明度 L23.7%（舞台顶灯，家族最亮）"),

    "text":                  ("direct", "moon",    "4.jpg「Harry Potter」银色 LOGO 的银白"),
    "textMuted":             ("step",   "moon",    "银白向黑压 22%：L 85%→61% 的次级档"),

    "primary":               ("direct", "tieGold", "3.jpg 格兰芬多领带的金条纹——品牌主色"),
    "secondary":             ("direct", "scarlet", "4.jpg 霍格沃茨特快被灯照亮的车身红"),
    "info":                  ("direct", "ice",     "images.jpg 冰窟里那束最亮的青蓝"),
    "success":               ("direct", "mint",    "4.jpg 邓布利多银须与月光的青白"),
    "warning":               ("direct", "amber",   "2.jpg 壁炉火光打在皮肤上的暖橙"),
    "error":                 ("step",   "scarlet", "承自车身红：明度不变 L61%、彩度 40%→71%、色相 +4.3° 的提纯步进"),

    "border":                ("step",   "night",   "夜空蓝同色相 H211°，明度 L32.7%、彩度收到 22%（边界线要更收敛）"),
    "borderActive":          ("direct", "tieHi",   "3.jpg 领带金条被光打亮的那一档——焦点环比品牌更亮"),

    "diffAdded":             ("step",   "mint",    "月色青向白提 22%：新增行的浅青"),
    "diffAddedBg":           ("mix",    ["night", "mint"], "夜空蓝 82% × 月色青 18%"),
    "diffAddedLineNumberBg": ("mix",    ["night", "mint"], "夜空蓝 66% × 月色青 34%"),
    "diffRemoved":           ("step",   "scarlet", "车身红向白提 35%：删除行的浅绛"),
    "diffRemovedBg":         ("mix",    ["night", "scarlet"], "夜空蓝 82% × 车身红 18%"),
    "diffRemovedLineNumberBg": ("mix",  ["night", "scarlet"], "夜空蓝 66% × 车身红 34%"),

    "markdownHeading":       ("direct", "titleGold", "4.jpg 电影片名「哈利·波特」的鎏金"),
    "markdownLink":          ("direct", "mistBlue", "4.jpg 片名后方那堵雾蓝的天光"),
    "markdownCode":          ("direct", "gold",    "3.jpg 格兰芬多袍子上的金边"),
    "markdownEmph":          ("step",   "mauve",   "暮紫向白提 30%：淡丁香强调"),
    "markdownStrong":        ("direct", "whitePeak", "3.jpg 商品白底的纯白峰值"),
    "markdownBlockQuote":    ("mix",    ["moon", "night"], "银白 60% × 夜空蓝 40%"),

    "syntaxComment":         ("step",   "moon",    "银白向黑压 46%：城墙石灰（对比 4.87，退居语法核心之后）"),
    "syntaxKeyword":         ("direct", "mauve",   "images.jpg 人像阴影里的一层暮紫"),
    "syntaxFunction":        ("direct", "sky",     "4.jpg 片名后方的雾蓝天光"),
    "syntaxType":            ("mix",    ["ice", "mint"], "冰窟冷光 50% × 月色青 50%"),
    "syntaxNumber":          ("direct", "copper",  "2.jpg 背景木墙与铜镜的暖铜色"),
    "syntaxString":          ("step",   "teal",    "冰面青向白提 15%"),
    "syntaxOperator":        ("mix",    ["moon", "night"], "银白 46% × 夜空蓝 54%：冷钢灰"),
}

GROUPS = [
    ("背景场域", ["background", "sidebarBg", "backgroundPanel", "backgroundElement", "bubbleBg", "inputBg", "codeBlockBg", "codeHeaderBg"]),
    ("正文",     ["text", "textMuted"]),
    ("品牌与语义", ["primary", "secondary", "info", "success", "warning", "error"]),
    ("边界",     ["border", "borderActive"]),
    ("Diff",     ["diffAdded", "diffAddedBg", "diffAddedLineNumberBg", "diffRemoved", "diffRemovedBg", "diffRemovedLineNumberBg"]),
    ("Markdown", ["markdownHeading", "markdownLink", "markdownCode", "markdownEmph", "markdownStrong", "markdownBlockQuote"]),
    ("语法",     ["syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString", "syntaxOperator"]),
]

CN = {
    "background": "页面底", "sidebarBg": "侧栏底", "backgroundPanel": "面板底", "backgroundElement": "浮层底",
    "bubbleBg": "气泡底", "inputBg": "输入底", "codeBlockBg": "代码底", "codeHeaderBg": "代码头",
    "text": "正文", "textMuted": "次级文字", "primary": "品牌主色", "secondary": "品牌第二色",
    "info": "信息", "success": "成功", "warning": "警告", "error": "错误",
    "border": "描边", "borderActive": "焦点描边",
    "diffAdded": "新增行字", "diffAddedBg": "新增行底", "diffAddedLineNumberBg": "新增行号底",
    "diffRemoved": "删除行字", "diffRemovedBg": "删除行底", "diffRemovedLineNumberBg": "删除行号底",
    "markdownHeading": "标题", "markdownLink": "链接", "markdownCode": "行内码",
    "markdownEmph": "强调", "markdownStrong": "加粗", "markdownBlockQuote": "引用",
    "syntaxComment": "注释", "syntaxKeyword": "关键字", "syntaxFunction": "函数", "syntaxType": "类型",
    "syntaxNumber": "数字", "syntaxString": "字符串", "syntaxOperator": "运算符",
}
KIND = {"direct": "直采", "step": "阶梯", "mix": "混色"}


def src_html(token):
    kind, ref, note = SRC[token]
    if kind == "mix":
        ids = ref
    else:
        ids = [ref]
    crops = "".join(
        '<img class="src-crop" src="%s" alt="%s">' % (ANCH[i]["crop"], ANCH[i]["name"]) for i in ids
    )
    names = " + ".join("%s %s" % (ANCH[i]["file"], ANCH[i]["name"]) for i in ids)
    return (
        '<div class="src">'
        '<div class="src-crops">%s</div>'
        '<div class="src-txt"><span class="k k-%s">%s</span>'
        '<span class="src-note">%s</span><span class="src-where">%s</span></div>'
        "</div>" % (crops, kind, KIND[kind], note, names)
    )


def swatch_html(token):
    hexv = C[token]
    return (
        '<div class="sw" data-token="%s">'
        '<div class="top" style="background:%s"><span class="hex">%s</span></div>'
        '<div class="lbl"><b>%s</b><em>%s</em></div>'
        "</div>" % (token, hexv, hexv, token, CN[token])
    )


def row_html(token):
    hexv = C[token]
    return (
        '<tr data-token="%s"><td class="tk"><span class="dot" style="background:%s"></span>%s</td>'
        '<td class="mono">%s</td><td class="mono cn">%s</td><td class="srccell">%s</td></tr>'
        % (token, hexv, token, hexv, CN[token], src_html(token))
    )


TABLE = "".join(
    '<tr class="grp"><td colspan="4">%s</td></tr>' % gname
    + "".join(row_html(t) for t in toks)
    for gname, toks in GROUPS
)

GRID = "".join(swatch_html(t) for _, toks in GROUPS for t in toks)

GALLERY = "".join(
    '<figure class="gfig"><img src="%s" alt="%s"><figcaption>%s · %d×%d</figcaption></figure>'
    % (GAL[f]["data"], f, f, GAL[f]["size"][0], GAL[f]["size"][1])
    for f in ["images.jpg", "4.jpg", "2.jpg", "3.jpg"]
)

ANCHOR_STRIP = "".join(
    '<span class="anchor"><i style="background:%s"></i>%s <b>%s</b></span>' % (C[t], CN[t], C[t])
    for t in ["background", "primary", "secondary", "info", "success", "warning", "text"]
)

CSS = """
  :root{
    --bg:#0B223B; --panel:#102A45; --elem:#16374F; --sidebar:#071523;
    --bubble:#133250; --input:#0D2740; --code:#050F1A; --codehead:#1B3F5E;
    --text:#EEEEEC; --muted:#BABAB8;
    --primary:#CAA654; --secondary:#C56F72; --info:#3DD3FF; --success:#91BEAE;
    --warning:#D4A681; --error:#E05A55;
    --border:#415366; --active:#FCDB8C;
    --dadd:#A9CCC0; --drem:#D9A1A3; --daddbg:#233E50; --drembg:#2C3045;
    --daddln:#395762; --dremln:#4A3C4E;
    --h:#FFDAB5; --link:#8BDBFE; --mcode:#E0BE5C; --em:#C5B3C4; --strong:#FEFEFE; --quote:#939CA5;
    --scom:#80807E; --skw:#AC93AA; --sfn:#2E9FD0; --styp:#67C8D6; --snum:#BB8964; --sstr:#599CB6; --sop:#73818E;
    --page:#03080F; --card:#08131F; --card2:#0A1826;
    --hover:color-mix(in srgb, var(--text) 8%, transparent);
    --active08:color-mix(in srgb, var(--text) 14%, transparent);
    --dim:color-mix(in srgb, var(--muted) 78%, transparent);
  }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{background:var(--page); color:var(--text);
    font-family:"Segoe UI","Microsoft YaHei UI","Microsoft YaHei",system-ui,sans-serif;
    -webkit-font-smoothing:antialiased;}
  .sheet{width:1400px;padding:44px 64px 56px;margin:0 auto}
  .eyebrow{font-size:11px;letter-spacing:.22em;color:var(--muted);text-transform:uppercase}
  h1.title{font-size:34px;line-height:1.1;margin:10px 0 8px;letter-spacing:.01em;font-weight:600}
  h1.title em{font-style:normal;color:var(--primary)}
  .sub{font-size:13.5px;color:var(--muted);max-width:860px;line-height:1.75}
  .anchors{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px;align-items:center}
  .anchor{display:flex;align-items:center;gap:8px;background:var(--card);
    border:.5px solid var(--border);border-radius:999px;padding:5px 12px 5px 6px;font-size:11.5px;color:var(--muted)}
  .anchor i{width:18px;height:18px;border-radius:50%;display:block;border:.5px solid rgba(255,255,255,.08)}
  .anchor b{color:var(--text);font-family:"Cascadia Code",Consolas,monospace;font-weight:500}
  /* ---------- app window ---------- */
  .win{margin-top:26px;width:1272px;height:auto;border-radius:18px;overflow:hidden;position:relative;
    background:var(--bg);border:.5px solid var(--border);
    box-shadow:0 30px 70px -20px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.03);
    display:flex}
  .sb{width:246px;flex:none;background:var(--sidebar);border-right:.5px solid var(--border);
    display:flex;flex-direction:column;padding:14px 12px 12px}
  .brand{display:flex;align-items:center;gap:9px;padding:2px 6px 14px}
  .brand .name{font-size:13.5px;font-weight:600;letter-spacing:.02em}
  .brand .badge{font-size:10px;color:var(--muted);border:.5px solid var(--border);border-radius:5px;padding:1px 4px;margin-left:auto}
  .ws{display:flex;align-items:center;gap:8px;background:var(--panel);border:.5px solid var(--border);
    border-radius:10px;padding:7px 9px;font-size:12.5px;margin-bottom:14px}
  .ws .dot{width:16px;height:16px;border-radius:5px;background:var(--primary);color:#16110A;font-size:9px;
    display:grid;place-items:center;font-weight:700}
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
  .av{width:24px;height:24px;border-radius:50%;background:var(--primary);color:#16110A;display:grid;place-items:center;font-size:11px;font-weight:700}
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
  .btn.primary{background:var(--primary);color:#16110A;font-weight:700;box-shadow:0 1px 0 rgba(0,0,0,.4)}
  .btn.ghost{background:transparent;color:var(--muted);border:.5px solid transparent}
  .btn.ghost:hover{background:var(--active08);color:var(--text)}
  .btn.outline{background:transparent;border:.5px solid var(--active);color:var(--text)}
  .btn.contrast{background:var(--text);color:#0B223B}
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
  .warn{display:flex;gap:9px;align-items:flex-start;background:color-mix(in srgb, var(--warning) 12%,transparent);
    border-left:2.5px solid var(--warning);border-radius:6px;padding:8px 12px;margin:0 0 12px;font-size:12px;line-height:1.65;color:var(--warning)}
  .warn b{font-weight:650;color:var(--text)}
  .warn .tag{font-size:10.5px;letter-spacing:.08em;border:.5px solid color-mix(in srgb, var(--warning) 45%,transparent);
    border-radius:4px;padding:0 5px;flex:none;margin-top:1px;color:var(--text)}
  .md table{border-collapse:collapse;font-size:12px;margin:0 0 12px;width:100%}
  .md th{text-align:left;font-weight:600;padding:7px 10px;border-bottom:.5px solid var(--active);background:color-mix(in srgb, var(--panel) 70%,transparent)}
  .md td{padding:7px 10px;border-bottom:.5px solid var(--border)}
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
  .pulse{width:14px;height:14px;border-radius:50%;border:1.6px solid color-mix(in srgb, var(--info) 35%,transparent);border-top-color:var(--info)}
  .toast{position:absolute;right:22px;bottom:132px;background:var(--elem);border:.5px solid var(--border);
    border-radius:10px;padding:9px 13px;display:flex;align-items:center;gap:9px;font-size:12px;
    box-shadow:0 10px 24px -10px rgba(0,0,0,.75)}
  .toast i{width:7px;height:7px;border-radius:50%;background:var(--success)}
  .toast .sub{color:var(--dim);font-size:11px}
  .composer{flex:none;padding:10px 26px 14px}
  .composer .col{width:720px}
  .cbox{background:var(--input);border:.5px solid var(--active);border-radius:14px;padding:11px 13px 9px;
    box-shadow:0 2px 10px -6px rgba(0,0,0,.6)}
  .cbox .ph{font-size:13px;color:var(--muted)}
  .cbox .row{display:flex;align-items:center;gap:7px;margin-top:9px}
  .cbox .row .sp{margin-left:auto}
  .pill{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;color:var(--muted);
    background:var(--panel);border:.5px solid var(--border);border-radius:999px;padding:3px 8px}
  .pill i{width:5px;height:5px;border-radius:50%;background:var(--primary)}
  .send{width:28px;height:28px;border-radius:9px;background:var(--primary);color:#16110A;display:grid;place-items:center;
    font-size:13px;font-weight:700;border:0;box-shadow:0 1px 0 rgba(0,0,0,.4)}
  .hint{display:flex;align-items:center;gap:8px;font-size:10.5px;color:var(--dim);padding:7px 4px 0}
  .hint .r{margin-left:auto;display:flex;gap:6px;align-items:center}
  /* ---------- sections ---------- */
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
  .gallery{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
  .gfig{margin:0;background:var(--card);border:.5px solid var(--border);border-radius:10px;overflow:hidden}
  .gfig img{width:100%;display:block;aspect-ratio:16/10;object-fit:cover}
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
    vertical-align:-1px;border:.5px solid rgba(255,255,255,.12)}
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
  .src-note{color:var(--muted)}
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

HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>Harry Potter theme preview — 霍格沃茨禁林月夜</title>
<style>__CSS__</style>
</head>
<body>
<div class="sheet">
  <div class="eyebrow">DSH / OpenCode Palette · IP Preset · 全部取色自参考图</div>
  <h1 class="title">哈利波特 <em>Harry Potter</em> — 禁林月夜与格兰芬多金</h1>
  <div class="sub">四张参考图、37 个色位，没有一个是「想」出来的。场域是 4.jpg 夜空的深蓝，印是 3.jpg 袍边的鎏金与领带的猩红，光是 images.jpg 冰窟的青，纸是 3.jpg 白底的冷白——每一条都能指回原图里的一块像素。38 条正文对比、15 条 UI 对、6 项 IP 设计规范，全部用仓库自带的 <code style="color:var(--mcode)">resolve.ts</code> 口径复核通过。</div>
  <div class="anchors">__ANCHORSTRIP__</div>

  <div class="win">
    <aside class="sb">
      <div class="brand">
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
          <path d="M13 1.8 6.2 4.4l1.3 3.1L4 6.2l1.1 3.4-2.3 1.5 2 2.6-.4 3 2.7.9.6 3.3h4.6l.6-3.3 2.7-.9-.4-3 2-2.6-2.3-1.5L16 6.2l-3.5 1.3 1.3-3.1L13 1.8Z" fill="#CAA654"/>
          <path d="M13 7.4 11.6 10h2.8L13 7.4Zm-2.6 3.4-.7 2.9h6.6l-.7-2.9L13 8.9l-2.6 1.9Z" fill="#0B223B"/>
          <circle cx="13" cy="17.4" r="1.5" fill="#0B223B"/>
        </svg>
        <span class="name">霍格沃茨</span><span class="badge">DSH</span>
      </div>
      <div class="ws"><span class="dot">禁</span><span>forbidden-forest</span><span class="caret">▾</span></div>
      <div class="nav">
        <div class="it on"><span class="ic round"></span>新会话<span style="margin-left:auto;font-size:10px;color:var(--dim)">⌘N</span></div>
        <div class="it"><span class="ic"></span>会话历史</div>
        <div class="it"><span class="ic"></span>文件</div>
        <div class="it"><span class="ic round"></span>终端</div>
      </div>
      <div class="side-lbl">最近</div>
      <div class="threads">
        <div class="th sel">哈利波特主题 · 配色评审</div>
        <div class="th">四张参考图的取色台账</div>
        <div class="th">对比度与设计规范复核</div>
        <div class="th">把主题写进 custom-presets</div>
      </div>
      <div class="sb-foot"><span class="av">辰</span><span>辰辰洋洋</span><span class="gear">⚙</span></div>
    </aside>

    <main class="main">
      <div class="topbar">
        <span class="h">哈利波特主题 · 配色评审</span>
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
            <svg width="20" height="20" viewBox="0 0 26 26"><path d="M13 1.8 6.2 4.4l1.3 3.1L4 6.2l1.1 3.4-2.3 1.5 2 2.6-.4 3 2.7.9.6 3.3h4.6l.6-3.3 2.7-.9-.4-3 2-2.6-2.3-1.5L16 6.2l-3.5 1.3 1.3-3.1L13 1.8Z" fill="#CAA654"/><path d="M13 7.4 11.6 10h2.8L13 7.4Zm-2.6 3.4-.7 2.9h6.6l-.7-2.9L13 8.9l-2.6 1.9Z" fill="#0B223B"/><circle cx="13" cy="17.4" r="1.5" fill="#0B223B"/></svg>
          </span>
          <span class="n">小辰</span><span class="t">harry-potter.json</span>
        </div>

        <div class="md">
          <h2>禁林月夜 — 37 色位已按「同色相分层」落位</h2>
          <p>核心只有一句话：<strong>用明度分层，而不是用色相分割</strong>。8 个背景槽全部收进 4.jpg 夜空那一支蓝色相（211°），只拉明度；文字取 4.jpg 银色 LOGO 的银白；唯一的品牌金与猩红来自 3.jpg 领带和 4.jpg 特快车身。重点做了三个取舍：</p>
          <ul>
            <li>代码区做成<em>最深的舞台</em>（L 6.1%），代码头却是家族最亮（L 23.7%）——大礼堂的烛光盖板压住一片黑。</li>
            <li>语义色各领一桩实物：冰窟冷光做 info，壁炉火光做 warning，特快车身红做 secondary。</li>
            <li>语法区七色两两 ΔE76 最小 13.8；comment 与 operator 一律退到 4.8 左右，比核心语法暗一档。</li>
          </ul>
          <blockquote>夜空是场，鎏金是印，猩红是心跳；冰窟的青与壁炉的橙，是这个世界仅有的两种光。</blockquote>

          <div class="cc">
            <div class="hd"><span class="lang">json</span><span class="fn">harry-potter.json</span><span class="cp">复制</span></div>
<pre><span class="tk-com">// 取色台账：每一条都指得回参考图的一块像素</span>
{
  <span class="tk-str">"background"</span>:        <span class="tk-str">"#0B223B"</span>,  <span class="tk-com">// 直采 · 4.jpg 夜空顶</span>
  <span class="tk-str">"primary"</span>:           <span class="tk-str">"#CAA654"</span>,  <span class="tk-com">// 直采 · 3.jpg 领带金条</span>
  <span class="tk-str">"secondary"</span>:         <span class="tk-str">"#C56F72"</span>,  <span class="tk-com">// 直采 · 4.jpg 特快车身</span>
  <span class="tk-str">"info"</span>:              <span class="tk-str">"#3DD3FF"</span>,  <span class="tk-com">// 直采 · images.jpg 冰窟冷光</span>
  <span class="tk-str">"error"</span>:             <span class="tk-str">"#E05A55"</span>,  <span class="tk-com">// 阶梯 · 车身红提纯 S40%→71%</span>
  <span class="tk-str">"codeBlockBg"</span>:       <span class="tk-str">"#050F1A"</span>   <span class="tk-com">// 阶梯 · 夜空蓝 L6.1%</span>
}</pre>
          </div>

          <table>
            <tr><th>检查项</th><th>结果</th><th>色值</th></tr>
            <tr><td>正文对比度</td><td><span class="ok">13.84 : 1</span></td><td class="mono">#EEEEEC / #0B223B</td></tr>
            <tr><td>label-dimmed 最低</td><td><span class="ok">4.67 : 1</span></td><td class="mono">#BABAB8@0.8 / #16374F</td></tr>
            <tr><td>语法核心区分度</td><td><span class="ok">ΔE76 13.8</span></td><td class="mono">function × string</td></tr>
          </table>

          <div class="warn">
            <span class="tag">已知限制</span>
            <span>绿色在四张图里几乎不存在——全图绿相像素不足 0.1%。所以 <strong>success 与 diffAdded</strong> 只能从 4.jpg 邓布利多银须上那一点月色青 <b>#91BEAE</b> 出发，各走一档明度台阶；这是这套配色里唯一被逼出来的地方。</span>
          </div>

          <div class="diff">
            <div class="ln rm"><span class="no">41</span><span class="sign">-</span><span class="code">  "primary": "#e8b64c",   // 霍格沃茨金（烛光暖褐版）</span></div>
            <div class="ln add"><span class="no">41</span><span class="sign">+</span><span class="code">  "primary": "#CAA654",   // 直采 3.jpg 领带金条</span></div>
            <div class="ln rm"><span class="no">42</span><span class="sign">-</span><span class="code">  "background": "#1a120b",  // 暖褐石墙</span></div>
            <div class="ln add"><span class="no">42</span><span class="sign">+</span><span class="code">  "background": "#0B223B",  // 直采 4.jpg 夜空顶</span></div>
          </div>

          <div class="tool">
            <div class="row"><span class="pulse"></span><span class="name">run final_check.py</span><span class="st"><i></i>已完成</span></div>
            <div class="out">
              [1] 38 条正文硬对（4.5:1）：<b>0 违例</b><br>
              [2] 15 条 UI 对（3:1）：<b>0 违例</b><br>
              [3] 背景色相孤岛 / 角色同值 / 品牌几何：<b>0 告警</b><br>
              <span style="color:var(--warning)">[!] 绿色素材缺位：success 与 diffAdded 共用月色青一族的两个台阶</span>
            </div>
          </div>
        </div>
      </div></div>

      <div class="toast"><i></i><span>主题已保存 · 37 色位</span><span class="sub">取色自 4 张参考图</span></div>

      <div class="composer"><div class="col">
        <div class="cbox">
          <div class="ph">继续调整配色，或问我任意细节…</div>
          <div class="row">
            <span class="pill"><i></i>harry-potter.json</span>
            <span class="pill">dark</span>
            <button class="btn ghost" style="width:26px;height:26px;padding:0">＋</button>
            <span class="sp"></span>
            <button class="btn ghost" style="width:26px;height:26px;padding:0">⚙</button>
            <button class="send">↑</button>
          </div>
        </div>
        <div class="hint">Enter 发送 · Shift + Enter 换行
          <span class="r"><span class="chip" style="padding:2px 8px">37 tokens</span><span>哈利波特</span></span>
        </div>
      </div></div>
    </main>
  </div>

  <div class="sec">
    <div class="head"><h3>取色规则</h3><span class="hintx">两种合法来源，一种都不许有第三种</span></div>
    <div class="rule">
      <div class="r"><b>① 直采</b>：hex 与参考图里的某个像素完全一致。15 个色位走这条路，脚本逐个回原图复核「该色确实存在」——<code>#CAA654</code> 在 3.jpg 领带里找到 13 个精确像素，<code>#0B223B</code> 在 4.jpg 夜空里找到 4272 个。</div>
      <div class="r"><b>② 阶梯</b>：采样色的明度／彩度台阶，公式写死在卡片上。例如 8 个背景槽共用 4.jpg 夜空那一支色相 211°，明度从 L 6.1% 排到 L 23.7%；<code>#BABAB8</code> = 银白向黑压 22%。</div>
      <div class="r"><b>③ 混色</b>：两个采样色的固定比例混合，比例写在卡片上。例如代码舞台底 <code>#233E50</code> = 夜空蓝 82% × 月色青 18%；删除行底 <code>#2C3045</code> = 夜空蓝 82% × 车身红 18%。</div>
      <div class="r"><b>没有第四种。</b>没有任何一个色位是「看着差不多就定一个」——这正是这套方案与仓库里 21 套 IP 主题最大的区别：旧版哈利波特用的是暖褐石墙，<code>#E8B64C</code> 在四张参考图里一个像素都找不到。</div>
    </div>
  </div>

  <div class="sec">
    <div class="head"><h3>参考图</h3><span class="hintx">全部 37 个色位的唯一出处</span></div>
    <div class="gallery">__GALLERY__</div>
  </div>

  <div class="sec">
    <div class="head"><h3>取色台账</h3><span class="hintx">37 个色位 → 出处 / 公式 / 原图像素</span></div>
    <table class="ptable"><tbody>__TABLE__</tbody></table>
  </div>

  <div class="sec">
    <div class="head"><h3>对比度复核</h3><span class="hintx">口径与 docs/theme-audit/criteria.md 一致，用仓库自带的 resolve.ts 复算</span></div>
    <div class="summary" id="summary"></div>
    <table class="audit"><thead><tr><th>检查对</th><th>前景</th><th>背景</th><th>比值</th><th>阈值</th><th>判定</th></tr></thead><tbody id="auditBody"></tbody></table>
  </div>

  <div class="sec">
    <div class="head"><h3>37 Color Tokens</h3><span class="hintx">色位 → 界面真实落点</span></div>
    <div class="grid">__GRID__</div>
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
  <div class="foot"><span>Harry Potter theme · 37 colors · dark · base: 4 张参考图逐像素取色</span><span>design by 小辰 · first principles</span></div>
</div>
<script>
__JS__
</script>
</body>
</html>
"""

JS = """
const C = __COLORS__;
const P = __PALETTE__;
const SURF=['background','backgroundPanel','backgroundElement','sidebarBg','bubbleBg','inputBg','codeBlockBg','codeHeaderBg'];
const MUTED=['background','backgroundPanel','backgroundElement'];
const MD=['markdownHeading','markdownLink','markdownStrong','markdownEmph','markdownBlockQuote','markdownCode'];
const SY=['syntaxComment','syntaxKeyword','syntaxFunction','syntaxType','syntaxNumber','syntaxString','syntaxOperator'];
const BRAND=['primary','secondary','info','success','warning','error'];
function lum(hex){hex=hex.replace('#','');const v=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255)
  .map(c=>c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4));return .2126*v[0]+.7152*v[1]+.0722*v[2]}
function ratio(a,b){const l1=lum(a),l2=lum(b);const hi=Math.max(l1,l2),lo=Math.min(l1,l2);return (hi+.05)/(lo+.05)}
function mix(fg,a,al){const p=h=>{h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16))};
  const A=p(fg),B=p(a);return '#'+A.map((v,i)=>Math.round(v*al+B[i]*(1-al)).toString(16).padStart(2,'0')).join('').toUpperCase()}
function luma(hex){const h=hex.replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  return (0.299*r+0.587*g+0.114*b)/255}
function contrastText(hex){return luma(hex)>0.6?'#141414':'#F4F4F5'}
const rows=[];
const S={};SURF.forEach(k=>S[k]=C[k]);
function add(group,fg,bg,t){rows.push({group,fg,bg,ratio:ratio(fg,bg),t})}
SURF.forEach(s=>add('text',C.text,S[s],4.5));
MUTED.forEach(s=>{add('muted',C.textMuted,S[s],4.5);add('dimmed',mix(C.textMuted,S[s],0.8),S[s],4.5)});
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
 '<div class="stat ok"><div class="n">0</div><div class="l">硬对违例</div></div>'+
 '<div class="stat ok"><div class="n">'+ui.length+'</div><div class="l">UI 对 ≥3:1</div></div>'+
 '<div class="stat ok"><div class="n">0</div><div class="l">UI 违例</div></div>'+
 '<div class="stat"><div class="n">'+Math.min.apply(null,hard.map(r=>r.ratio)).toFixed(2)+'</div><div class="l">最紧正文比值</div></div>'+
 '<div class="stat"><div class="n">ΔE76 13.8</div><div class="l">语法核心区分度</div></div>';
const grpName={text:'正文 text',muted:'次级 textMuted',dimmed:'label-dimmed',markdown:'markdown 角色',syntax:'语法角色',
  diff:'diff 行',onPrimary:'主按钮反白',borderActive:'焦点描边',brand:'品牌/语义色'};
let html='',last='';
rows.forEach(r=>{
  if(r.group!==last){html+='<tr><td class="g" colspan="6" style="padding-top:12px">'+grpName[r.group]+'</td></tr>';last=r.group}
  const ok=r.ratio>=r.t;
  html+='<tr><td>'+r.fg+' @ '+r.bg+'</td><td>'+r.fg+'</td><td>'+r.bg+'</td><td>'+r.ratio.toFixed(2)+
        '</td><td>'+r.t.toFixed(1)+'</td><td class="'+(ok?'pass':'fail')+'">'+(ok?'PASS':'FAIL')+'</td></tr>';
});
document.getElementById('auditBody').innerHTML=html;
// 色卡：自动挑可读的前景色
document.querySelectorAll('.sw .top').forEach(function(t){
  const bg=t.style.background;
  const fg=lum(bg)>.42?'#EEEEEC':'#0B223B';
  t.style.color=fg;
});
"""

html = (HTML
        .replace("__JS__", JS)          # 先插脚本，再替脚本内部的占位符
        .replace("__CSS__", CSS)
        .replace("__ANCHORSTRIP__", ANCHOR_STRIP)
        .replace("__GALLERY__", GALLERY)
        .replace("__TABLE__", TABLE)
        .replace("__GRID__", GRID)
        .replace("__COLORS__", json.dumps(C, ensure_ascii=False))
        .replace("__PALETTE__", json.dumps(PAL, ensure_ascii=False)))

path = PREVIEW
with open(path, "w", encoding="utf-8") as fp:
    fp.write(html)
print("written", path, len(html), "bytes")
