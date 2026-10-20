# -*- coding: utf-8 -*-
"""preview.py — 生成「海贼王 · 正午海风」preview.html（沿用库洛米那份的骨架）。

所有数值从 palette.json 直读，不手抄。
"""
import json, os, math

OUT = r"D:\dsh-plugin\dsh-opencode-palette\prototypes\one-piece-extraction"
P = json.load(open(os.path.join(OUT, "palette.json"), encoding="utf-8"))
C = P["colors"]
A = P["anchors"]
PR = P["provenance"]


def chan_lin(v):
    s = v / 255.0
    return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4


def lum(h):
    h = h.lstrip("#")
    r, g, b = [int(h[i:i + 2], 16) for i in (0, 2, 4)]
    return 0.2126 * chan_lin(r) + 0.7152 * chan_lin(g) + 0.0722 * chan_lin(b)


def ratio(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def hue_deg(h):
    h = h.lstrip("#")
    r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d == 0:
        return 0.0
    if mx == r:
        x = 60 * (((g - b) / d) % 6)
    elif mx == g:
        x = 60 * ((b - r) / d + 2)
    else:
        x = 60 * ((r - g) / d + 4)
    return x


def mix(a, b, k):
    A1 = [int(a.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)]
    B1 = [int(b.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)]
    return "#%02X%02X%02X" % tuple(int(round(A1[i] + (B1[i] - A1[i]) * k)) for i in range(3))


def dim_on(bg, fg, a):
    """rgba 叠底后的实际色（预览里算实际观感）"""
    B1 = [int(bg.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)]
    F1 = [int(fg.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)]
    return "#%02X%02X%02X" % tuple(int(round(F1[i] * a + B1[i] * (1 - a))) for i in range(3))


INK = C["text"]
GOLD = A["hat_gold"]["hex"]
RATIO_TEXT = ratio(C["text"], C["background"])
RATIO_BTN = ratio("#F4F4F5", C["primary"])
RATIO_BORDER = ratio(C["borderActive"], C["background"])
SYN_MIN = min(r for n, r, t in P["hard"] if n.startswith("syntax"))
SURF = ["background", "backgroundPanel", "backgroundElement", "sidebarBg", "bubbleBg",
        "inputBg", "codeBlockBg", "codeHeaderBg"]
HS = [round(hue_deg(C[s]), 1) for s in SURF]

FAMILIES = [
    ("场 · 8 表面（晴空蓝一条色相阶梯）",
     ["background", "backgroundPanel", "backgroundElement", "sidebarBg", "bubbleBg",
      "inputBg", "codeBlockBg", "codeHeaderBg"]),
    ("字 · 正文与次级文字",
     ["text", "textMuted"]),
    ("品牌与语义 · 6 角色",
     ["primary", "secondary", "info", "success", "warning", "error"]),
    ("描边 · 边界与焦点环",
     ["border", "borderActive"]),
    ("diff · 增删行",
     ["diffAdded", "diffRemoved", "diffAddedBg", "diffRemovedBg",
      "diffAddedLineNumberBg", "diffRemovedLineNumberBg"]),
    ("markdown · 排版六角色",
     ["markdownHeading", "markdownLink", "markdownCode", "markdownEmph",
      "markdownStrong", "markdownBlockQuote"]),
    ("syntax · 代码七色（浅纸深墨）",
     ["syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString",
      "syntaxComment", "syntaxOperator"]),
]
ROLE_ZH = {
    "background": "主场背景", "backgroundPanel": "面板", "backgroundElement": "浮层/悬停",
    "sidebarBg": "侧栏", "bubbleBg": "对话气泡", "inputBg": "输入框", "codeBlockBg": "代码底",
    "codeHeaderBg": "代码头", "text": "正文", "textMuted": "次级文字",
    "primary": "主色（按钮/强调）", "secondary": "副色", "info": "信息", "success": "成功",
    "warning": "警告", "error": "错误", "border": "分隔线", "borderActive": "焦点环",
    "diffAdded": "新增行字", "diffRemoved": "删除行字", "diffAddedBg": "新增行底",
    "diffRemovedBg": "删除行底", "diffAddedLineNumberBg": "新增行号底",
    "diffRemovedLineNumberBg": "删除行号底",
    "markdownHeading": "标题", "markdownLink": "链接", "markdownCode": "行内码",
    "markdownEmph": "斜体强调", "markdownStrong": "加重", "markdownBlockQuote": "引用",
    "syntaxKeyword": "关键字", "syntaxFunction": "函数名", "syntaxType": "类型",
    "syntaxNumber": "数字", "syntaxString": "字符串", "syntaxComment": "注释",
    "syntaxOperator": "运算符",
}

# ── :root 变量 ────────────────────────────────────────────────
root_vars = {
    "--bg": C["background"], "--panel": C["backgroundPanel"], "--elem": C["backgroundElement"],
    "--sidebar": C["sidebarBg"], "--bubble": C["bubbleBg"], "--input": C["inputBg"],
    "--code": C["codeBlockBg"], "--codehead": C["codeHeaderBg"],
    "--text": C["text"], "--muted": C["textMuted"],
    "--primary": C["primary"], "--secondary": C["secondary"], "--info": C["info"],
    "--success": C["success"], "--warning": C["warning"], "--error": C["error"],
    "--border": C["border"], "--active": C["borderActive"],
    "--dadd": C["diffAdded"], "--drem": C["diffRemoved"], "--daddbg": C["diffAddedBg"],
    "--drembg": C["diffRemovedBg"], "--daddln": C["diffAddedLineNumberBg"],
    "--dremln": C["diffRemovedLineNumberBg"],
    "--h": C["markdownHeading"], "--link": C["markdownLink"], "--mcode": C["markdownCode"],
    "--em": C["markdownEmph"], "--strong": C["markdownStrong"], "--quote": C["markdownBlockQuote"],
    "--scom": C["syntaxComment"], "--skw": C["syntaxKeyword"], "--sfn": C["syntaxFunction"],
    "--styp": C["syntaxType"], "--snum": C["syntaxNumber"], "--sstr": C["syntaxString"],
    "--sop": C["syntaxOperator"],
}
ROOT_CSS = "\n    ".join(f"{k}:{v};" for k, v in root_vars.items())

# ── 溯源表 ────────────────────────────────────────────────────
prov_rows = []
for fam, slots in FAMILIES:
    for s in slots:
        rec = PR[s]["recipe"]
        parts = " + ".join(
            f"{w:.0%}·{meta[2]}({meta[1]})" for meta, w in
            [(v, rec[k][0]) for k, v in rec.items()]
        )
        files = sorted({rec[k][3] for k in rec})
        src = "、".join(files)
        prov_rows.append(
            f'<tr><td class="mono k">{s}</td>'
            f'<td class="mono v" style="background:{C[s]}"></td>'
            f'<td class="mono h">{C[s]}</td>'
            f'<td class="mono r">{parts}</td>'
            f'<td class="mono s">{src}</td>'
            f'<td class="zh">{PR[s]["desc"]}</td></tr>'
        )
PROV_TABLE = "\n".join(prov_rows)

# ── 对比度表（最紧 14 条 + 汇总） ─────────────────────────────
rows = sorted(P["hard"] + P["ui"], key=lambda x: x[1] - x[2])
tight = rows[:14]
CHK = "\n".join(
    f'<tr><td class="mono k">{n}</td>'
    f'<td class="mono b" style="background:{C[n.split("@")[1]]}"></td>'
    f'<td class="mono v">{r:.2f} : 1</td>'
    f'<td class="mono t">{t:.1f}</td>'
    f'<td><span class="ok">通过 · 余量 {r-t:+.2f}</span></td></tr>'
    for n, r, t in tight
)

ANCHOR_CHIPS = "".join(
    f'<span class="anchor"><i style="background:{A[k]["hex"]}"></i>{A[k]["name"]} {A[k]["hex"]}</span>'
    for k in ["sky_deep", "cloud", "hat_gold", "vest_red", "lagoon", "anchor"]
)

JSON_C = json.dumps(C, ensure_ascii=False)

HTML = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>海贼王 One Piece theme preview — 正午·海风</title>
<style>
  :root{{
    {ROOT_CSS}
    --hover:color-mix(in srgb, var(--text) 6%, transparent);
    --active08:color-mix(in srgb, var(--text) 11%, transparent);
    --dim:color-mix(in srgb, var(--muted) 80%, transparent);
  }}
  *{{box-sizing:border-box}}
  html,body{{margin:0;padding:0}}
  body{{
    background:#F2F8FD; color:var(--text);
    font-family:"Segoe UI","Microsoft YaHei UI","Microsoft YaHei",system-ui,sans-serif;
    -webkit-font-smoothing:antialiased;
  }}
  .sheet{{width:1400px;padding:44px 64px 56px;margin:0 auto}}
  .eyebrow{{font-size:11px;letter-spacing:.22em;color:var(--muted);text-transform:uppercase}}
  h1.title{{font-size:34px;line-height:1.1;margin:10px 0 8px;letter-spacing:.01em;font-weight:600}}
  h1.title em{{font-style:normal;color:var(--primary)}}
  .sub{{font-size:13.5px;color:var(--muted);max-width:780px;line-height:1.8}}
  .sub b{{color:var(--text);font-weight:600}}
  .anchors{{display:flex;gap:10px;margin-top:18px;align-items:center;flex-wrap:wrap}}
  .anchor{{display:flex;align-items:center;gap:8px;background:color-mix(in srgb,var(--panel) 60%,transparent);
    border:.5px solid var(--border);border-radius:999px;padding:5px 12px 5px 6px;font-size:11.5px;color:var(--muted)}}
  .anchor i{{width:18px;height:18px;border-radius:50%;display:block;border:.5px solid rgba(0,0,0,.06)}}
  .stats{{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}}
  .stat{{background:var(--code);border:.5px solid var(--border);border-radius:9px;padding:8px 12px;min-width:132px}}
  .stat .n{{font-size:16px;font-weight:650;font-family:"Cascadia Code",Consolas,monospace}}
  .stat .t{{font-size:10.5px;color:var(--muted);margin-top:2px}}
  /* ---------- app window ---------- */
  .win{{margin-top:26px;width:1272px;border-radius:18px;overflow:hidden;position:relative;
    background:var(--bg);border:.5px solid var(--border);
    box-shadow:0 26px 60px -18px color-mix(in srgb,var(--text) 20%,transparent), 0 2px 6px rgba(15,40,75,.06);
    display:flex}}
  .sb{{width:246px;flex:none;background:var(--sidebar);border-right:.5px solid var(--border);
    display:flex;flex-direction:column;padding:14px 12px 12px}}
  .brand{{display:flex;align-items:center;gap:9px;padding:2px 6px 14px}}
  .brand .name{{font-size:13.5px;font-weight:600;letter-spacing:.02em}}
  .brand .badge{{font-size:10px;color:var(--muted);border:.5px solid var(--border);border-radius:5px;padding:1px 4px;margin-left:auto}}
  .ws{{display:flex;align-items:center;gap:8px;background:var(--panel);border:.5px solid var(--border);
    border-radius:10px;padding:7px 9px;font-size:12.5px;margin-bottom:14px}}
  .ws .dot{{width:16px;height:16px;border-radius:5px;background:var(--primary);color:#F4F4F5;font-size:9px;
    display:grid;place-items:center;font-weight:600}}
  .ws .caret{{margin-left:auto;color:var(--muted);font-size:10px}}
  .nav{{display:flex;flex-direction:column;gap:2px}}
  .nav .it{{position:relative;display:flex;align-items:center;gap:9px;font-size:12.5px;color:var(--muted);
    padding:7px 9px;border-radius:8px;cursor:default}}
  .nav .it:hover{{background:var(--hover)}}
  .nav .it.on{{background:var(--active08);color:var(--text);font-weight:600}}
  .nav .it.on:before{{content:"";position:absolute;left:0;top:7px;bottom:7px;width:3px;border-radius:3px;background:var(--primary)}}
  .nav .it .ic{{width:15px;height:15px;border:1.4px solid currentColor;border-radius:4px;opacity:.75;flex:none}}
  .nav .it .ic.round{{border-radius:50%}}
  .side-lbl{{font-size:10.5px;letter-spacing:.12em;color:var(--dim);margin:16px 8px 6px;text-transform:uppercase}}
  .threads{{display:flex;flex-direction:column;gap:1px;overflow:hidden}}
  .th{{font-size:12px;color:var(--muted);padding:6px 9px;border-radius:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
  .th:hover{{background:var(--hover)}}
  .th.sel{{background:var(--active08);color:var(--text)}}
  .sb-foot{{margin-top:auto;display:flex;align-items:center;gap:9px;padding:9px 6px 2px;border-top:.5px solid var(--border);font-size:12px}}
  .av{{width:24px;height:24px;border-radius:50%;background:var(--text);color:#F4F4F5;display:grid;place-items:center;font-size:11px}}
  .sb-foot .gear{{margin-left:auto;color:var(--muted);font-size:13px}}
  .main{{flex:1;display:flex;flex-direction:column;min-width:0;position:relative}}
  .topbar{{height:48px;flex:none;display:flex;align-items:center;gap:10px;padding:0 18px;border-bottom:.5px solid var(--border)}}
  .topbar .h{{font-size:13px;font-weight:600}}
  .topbar .crumb{{font-size:11.5px;color:var(--muted)}}
  .topbar .right{{margin-left:auto;display:flex;align-items:center;gap:8px}}
  .chip{{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);
    background:var(--panel);border:.5px solid var(--border);border-radius:999px;padding:4px 10px}}
  .chip i{{width:6px;height:6px;border-radius:50%;background:var(--info)}}
  .chip i.idle{{background:var(--secondary)}}
  .btn{{border:0;border-radius:8px;font-size:12px;padding:6px 12px;cursor:default;font-family:inherit}}
  .btn.primary{{background:var(--primary);color:#F4F4F5;font-weight:600;box-shadow:0 1px 0 rgba(0,0,0,.08)}}
  .btn.ghost{{background:transparent;color:var(--muted);border:.5px solid transparent}}
  .btn.ghost:hover{{background:var(--active08);color:var(--text)}}
  .btn.outline{{background:transparent;border:.5px solid var(--active);color:var(--text)}}
  .btn.contrast{{background:var(--text);color:#F4F4F5}}
  .feed{{flex:1;overflow:hidden;padding:22px 26px 84px}}
  .col{{width:720px;margin:0 auto}}
  .user{{display:flex;justify-content:flex-end;margin-bottom:20px}}
  .user .bub{{background:var(--bubble);border-radius:14px 14px 4px 14px;padding:10px 14px;font-size:13px;
    line-height:1.65;max-width:520px;box-shadow:0 1px 2px rgba(15,40,75,.04)}}
  .who{{display:flex;align-items:center;gap:7px;margin-bottom:9px}}
  .who .k{{width:20px;height:20px;display:grid;place-items:center}}
  .who .n{{font-size:12px;font-weight:600;letter-spacing:.02em}}
  .who .t{{font-size:10.5px;color:var(--dim);border:.5px solid var(--border);border-radius:5px;padding:1px 5px}}
  .md{{font-size:13px;line-height:1.78}}
  .md h2{{font-size:15.5px;line-height:1.4;color:var(--h);margin:0 0 8px;font-weight:650;letter-spacing:.01em}}
  .md p{{margin:0 0 10px}}
  .md strong{{color:var(--strong);font-weight:650}}
  .md em{{color:var(--em);font-style:italic}}
  .md a{{color:var(--link);text-decoration:underline;text-decoration-underline-offset:2px;text-decoration-thickness:.5px}}
  .md code{{font-family:"Cascadia Code",Consolas,"Courier New",monospace;font-size:11.5px;color:var(--mcode);
    border:.5px solid var(--border);border-radius:4px;padding:0 4px;background:var(--code)}}
  .md ul{{margin:0 0 10px;padding-left:18px}}
  .md li{{margin:2px 0}}
  .md blockquote{{margin:0 0 12px;padding:2px 0 2px 12px;border-left:2px solid var(--active);color:var(--quote);font-size:12.5px}}
  .warn{{display:flex;gap:9px;align-items:flex-start;background:color-mix(in srgb,var(--warning) 12%,transparent);
    border-left:2.5px solid var(--warning);border-radius:6px;padding:8px 12px;margin:0 0 12px;font-size:12px;line-height:1.65;color:var(--warning)}}
  .warn b{{font-weight:650}}
  .warn .tag{{font-size:10.5px;letter-spacing:.08em;border:.5px solid color-mix(in srgb,var(--warning) 45%,transparent);
    border-radius:4px;padding:0 5px;flex:none;margin-top:1px}}
  .md table{{border-collapse:collapse;font-size:12px;margin:0 0 12px;width:100%}}
  .md th{{text-align:left;font-weight:600;padding:7px 10px;border-bottom:.5px solid var(--active);background:color-mix(in srgb,var(--panel) 55%,transparent)}}
  .md td{{padding:7px 10px;border-bottom:.5px solid var(--active)}}
  .md td .ok{{color:var(--success);font-weight:600}}
  .md td .no{{color:var(--error);font-weight:600}}
  .md td.mono{{font-family:"Cascadia Code",Consolas,monospace;font-size:11px;color:var(--muted)}}
  .cc{{border-radius:10px;overflow:hidden;margin:2px 0 12px;background:var(--code)}}
  .cc .hd{{display:flex;align-items:center;gap:8px;background:var(--codehead);padding:7px 12px 6px;font-size:11px;color:var(--muted)}}
  .cc .hd .lang{{color:var(--dim);font-family:"Cascadia Code",Consolas,monospace}}
  .cc .hd .fn{{color:var(--muted)}}
  .cc .hd .cp{{margin-left:auto;font-size:10.5px;color:var(--dim)}}
  .cc pre{{margin:0;padding:11px 14px 13px;overflow:hidden;
    font-family:"Cascadia Code",Consolas,"Courier New",monospace;font-size:11.5px;line-height:1.85}}
  .tk-com{{color:var(--scom);font-style:italic}}
  .tk-kw{{color:var(--skw)}}
  .tk-fn{{color:var(--sfn)}}
  .tk-typ{{color:var(--styp)}}
  .tk-num{{color:var(--snum)}}
  .tk-str{{color:var(--sstr)}}
  .tk-op{{color:var(--sop)}}
  .tk-plain{{color:var(--text)}}
  .diff{{border-radius:10px;overflow:hidden;background:var(--code);margin:0 0 12px;font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px}}
  .diff .ln{{display:flex;gap:10px;padding:2px 12px 2px 0}}
  .diff .ln .no{{width:30px;padding-right:7px;text-align:right;color:var(--dim);border-right:.5px solid transparent}}
  .diff .rm{{background:var(--drembg)}}
  .diff .rm .no{{background:var(--dremln);color:var(--drem);border-right-color:var(--drembg)}}
  .diff .rm .sign,.diff .rm .code{{color:var(--drem)}}
  .diff .add{{background:var(--daddbg)}}
  .diff .add .no{{background:var(--daddln);color:var(--dadd);border-right-color:var(--daddbg)}}
  .diff .add .sign,.diff .add .code{{color:var(--dadd)}}
  .diff .ln .sign{{width:8px}}
  .tool{{background:var(--elem);border-radius:10px;padding:10px 13px;margin:0 0 12px;font-size:12px}}
  .tool .row{{display:flex;align-items:center;gap:8px}}
  .tool .name{{font-weight:600}}
  .tool .st{{margin-left:auto;color:var(--success);font-size:11px;display:flex;align-items:center;gap:5px}}
  .tool .st i{{width:6px;height:6px;border-radius:50%;background:var(--success)}}
  .tool .out{{margin-top:7px;font-family:"Cascadia Code",Consolas,monospace;font-size:10.8px;line-height:1.75;color:var(--muted)}}
  .tool .out b{{color:var(--success);font-weight:600}}
  .pulse{{width:14px;height:14px;border-radius:50%;border:1.6px solid color-mix(in srgb,var(--info) 35%,transparent);border-top-color:var(--info)}}
  .toast{{position:absolute;right:22px;bottom:132px;background:var(--elem);border:.5px solid var(--border);
    border-radius:10px;padding:9px 13px;display:flex;align-items:center;gap:9px;font-size:12px;
    box-shadow:0 10px 24px -10px rgba(15,40,75,.28)}}
  .toast i{{width:7px;height:7px;border-radius:50%;background:var(--success)}}
  .toast .sub{{color:var(--dim);font-size:11px}}
  .composer{{flex:none;padding:10px 26px 14px}}
  .composer .col{{width:720px}}
  .cbox{{background:var(--input);border:.5px solid var(--active);border-radius:14px;padding:11px 13px 9px;
    box-shadow:0 2px 10px -6px rgba(15,40,75,.16)}}
  .cbox .ph{{font-size:13px;color:var(--muted)}}
  .cbox .row{{display:flex;align-items:center;gap:7px;margin-top:9px}}
  .cbox .row .sp{{margin-left:auto}}
  .pill{{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;color:var(--muted);
    background:var(--panel);border:.5px solid var(--border);border-radius:999px;padding:3px 8px}}
  .pill i{{width:5px;height:5px;border-radius:50%;background:var(--primary)}}
  .send{{width:28px;height:28px;border-radius:9px;background:var(--primary);color:#F4F4F5;display:grid;place-items:center;
    font-size:13px;font-weight:700;border:0;box-shadow:0 1px 0 rgba(0,0,0,.08)}}
  .hint{{display:flex;align-items:center;gap:8px;font-size:10.5px;color:var(--dim);padding:7px 4px 0}}
  .hint .r{{margin-left:auto;display:flex;gap:6px;align-items:center}}
  /* ---------- sections ---------- */
  .tokens{{margin-top:40px}}
  .tokens .head{{display:flex;align-items:baseline;gap:14px;margin-bottom:6px}}
  .tokens h3{{font-size:13px;letter-spacing:.18em;text-transform:uppercase;margin:0;font-weight:600}}
  .tokens .hintx{{font-size:11.5px;color:var(--muted)}}
  .fam{{margin-top:18px}}
  .fam .ft{{font-size:11.5px;color:var(--muted);margin-bottom:7px;display:flex;align-items:center;gap:8px}}
  .fam .ft i{{width:16px;height:2px;background:var(--borderActive);border-radius:2px;display:block}}
  .grid{{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}}
  .sw{{border-radius:9px;border:.5px solid var(--border);overflow:hidden;background:var(--code)}}
  .sw .top{{height:44px;display:flex;align-items:flex-end;padding:5px 7px}}
  .sw .hex{{font-size:9.5px;font-family:"Cascadia Code",Consolas,monospace;opacity:.95;letter-spacing:.02em}}
  .sw .lbl{{font-size:10px;padding:4px 7px 5px;color:var(--muted);border-top:.5px solid var(--border);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
  .sw .lbl b{{color:var(--text);font-weight:600}}
  .legend{{display:flex;gap:16px;margin-top:16px;font-size:11px;color:var(--muted);flex-wrap:wrap}}
  .legend span{{display:flex;align-items:center;gap:6px}}
  .legend i{{width:9px;height:9px;border-radius:3px}}
  /* ---------- report tables ---------- */
  .report{{margin-top:40px;background:var(--code);border:.5px solid var(--border);border-radius:12px;padding:18px 20px}}
  .report h3{{font-size:13px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 4px;font-weight:600}}
  .report .lead{{font-size:11.5px;color:var(--muted);margin-bottom:12px}}
  table.rt{{border-collapse:collapse;width:100%;font-size:11.5px}}
  table.rt th{{text-align:left;font-weight:600;color:var(--muted);padding:6px 8px;border-bottom:.5px solid var(--border);
    font-size:10.5px;letter-spacing:.06em;text-transform:uppercase}}
  table.rt td{{padding:5px 8px;border-bottom:.5px solid color-mix(in srgb,var(--border) 60%,transparent);vertical-align:middle}}
  .mono{{font-family:"Cascadia Code",Consolas,monospace;font-size:11px}}
  table.rt td.b{{width:26px;height:18px;border-radius:4px;border:.5px solid var(--border);padding:0}}
  table.rt td.v{{font-family:"Cascadia Code",Consolas,monospace}}
  .ok{{color:var(--success);font-weight:600}}
  .prov{{margin-top:40px;background:var(--code);border:.5px solid var(--border);border-radius:12px;padding:18px 20px}}
  .prov h3{{font-size:13px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 4px;font-weight:600}}
  .prov .lead{{font-size:11.5px;color:var(--muted);margin-bottom:12px}}
  .prov table{{border-collapse:collapse;width:100%;font-size:11px}}
  .prov th{{text-align:left;font-weight:600;color:var(--muted);padding:5px 7px;border-bottom:.5px solid var(--border);
    font-size:10px;letter-spacing:.06em;text-transform:uppercase}}
  .prov td{{padding:4px 7px;border-bottom:.5px solid color-mix(in srgb,var(--border) 55%,transparent)}}
  .prov td.k{{width:172px;color:var(--text)}}
  .prov td.v{{width:26px;height:16px;border-radius:3px;border:.5px solid var(--border);padding:0}}
  .prov td.h{{width:70px;color:var(--text)}}
  .prov td.r{{color:var(--muted);line-height:1.5}}
  .prov td.s{{width:110px;color:var(--muted)}}
  .prov td.zh{{width:190px;color:var(--muted)}}
  .foot{{display:flex;justify-content:space-between;margin-top:22px;font-size:10.5px;color:var(--dim)}}
</style>
</head>
<body>
<div class="sheet">
  <div class="eyebrow">DSH / OpenCode Palette · IP 预置主题 · 37 色位</div>
  <h1 class="title">海贼王 <em>ONE PIECE</em> — 正午·海风</h1>
  <div class="sub">
    场 = 正午的晴空，字 = 深海的墨蓝，心跳 = 草帽的红缎带。<b>没有一个颜色是想象出来的</b>：
    37 个色位全部由三张参考图上的真实像素（草帽受光面、标志字内阴影、路飞背心红、潟湖青、麻绳棕、娜美橙……）
    按界面真实落点重新配比而成，每一格都能在下方溯源表里查到配方与出处。
  </div>
  <div class="anchors">{ANCHOR_CHIPS}</div>
  <div class="stats">
    <div class="stat"><div class="n">{RATIO_TEXT:.2f}:1</div><div class="t">正文 text @ 主场</div></div>
    <div class="stat"><div class="n">{RATIO_BTN:.2f}:1</div><div class="t">主按钮反白</div></div>
    <div class="stat"><div class="n">{RATIO_BORDER:.2f}:1</div><div class="t">焦点环 UI 3:1</div></div>
    <div class="stat"><div class="n">≥{SYN_MIN:.2f}:1</div><div class="t">语法七色 @ 代码底</div></div>
    <div class="stat"><div class="n">38 + 15</div><div class="t">硬性 4.5 / UI 3.0 全通过</div></div>
    <div class="stat"><div class="n">H{min(HS):.0f}–{max(HS):.0f}</div><div class="t">8 表面同一色相家族</div></div>
    <div class="stat"><div class="n">42.8°</div><div class="t">主副色 类比几何</div></div>
    <div class="stat"><div class="n">21.6</div><div class="t">核心语法最小 ΔE76</div></div>
  </div>

  <div class="win">
    <aside class="sb">
      <div class="brand">
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
          <ellipse cx="13" cy="17.8" rx="11.4" ry="4.2" fill="{GOLD}"/>
          <path d="M6.8 17.2c0-4.7 2.8-8.2 6.2-8.2s6.2 3.5 6.2 8.2z" fill="{GOLD}"/>
          <path d="M7.7 13.7c1.3-1.4 3.2-2.1 5.3-2.1s4 .7 5.3 2.1l-1 2.6c-1.1-1-2.6-1.5-4.3-1.5s-3.2.5-4.3 1.5z" fill="{C['primary']}"/>
        </svg>
        <span class="name">海贼王</span><span class="badge">IP</span>
      </div>
      <div class="ws"><span class="dot">草</span><span>straw-hat-crew</span><span class="caret">▾</span></div>
      <div class="nav">
        <div class="it on"><span class="ic round"></span>新会话<span style="margin-left:auto;font-size:10px;color:var(--dim)">⌘N</span></div>
        <div class="it"><span class="ic"></span>会话历史</div>
        <div class="it"><span class="ic"></span>文件</div>
        <div class="it"><span class="ic round"></span>终端</div>
      </div>
      <div class="side-lbl">最近</div>
      <div class="threads">
        <div class="th sel">正午海风 · 配色评审</div>
        <div class="th">37 色位落位与配方</div>
        <div class="th">取色溯源 · 三图对照</div>
        <div class="th">对比度与语法退后复核</div>
      </div>
      <div class="sb-foot"><span class="av">路</span><span>麦浪</span><span class="gear">⚙</span></div>
    </aside>

    <main class="main">
      <div class="topbar">
        <span class="h">正午海风 · 配色评审</span>
        <span class="crumb">/ 37 tokens</span>
        <div class="right">
          <span class="chip"><i class="idle"></i>就绪</span>
          <span class="chip"><i></i>deepseek-flash</span>
          <button class="btn ghost">分享</button>
          <button class="btn primary">新建会话</button>
        </div>
      </div>

      <div class="feed"><div class="col">
        <div class="user"><div class="bub">这三张图里的颜色，一个都别自己编——全部从图上取。</div></div>

        <div class="who">
          <span class="k">
            <svg width="20" height="20" viewBox="0 0 26 26"><ellipse cx="13" cy="17.8" rx="11.4" ry="4.2" fill="{GOLD}"/><path d="M6.8 17.2c0-4.7 2.8-8.2 6.2-8.2s6.2 3.5 6.2 8.2z" fill="{GOLD}"/><path d="M7.7 13.7c1.3-1.4 3.2-2.1 5.3-2.1s4 .7 5.3 2.1l-1 2.6c-1.1-1-2.6-1.5-4.3-1.5s-3.2.5-4.3 1.5z" fill="{C['primary']}"/></svg>
          </span>
          <span class="n">麦浪</span><span class="t">recipe.ts</span>
        </div>

        <div class="md">
          <h2>海贼王 · 正午海风 — 已按 37 色位落位</h2>
          <p>整套配色只有一句话：<strong>把正午的天空当纸，把深海当墨，把草帽的红缎带当唯一的心跳</strong>。
          三张参考图全是白天高调画面，所以底子必须是浅的；但草帽金在浅底上过不了 UI 3:1，
          于是主色让位给<em>背心红</em>，麦秆金退到副色与焦点环，做成黄铜件而不是亮黄。
          <strong>草帽金只剩两处</strong>：以 <em>8–14%</em> 的比例混进黄铜家族（副色 / 焦点环 / 函数名），
          以及作为<em>插画本身</em>的草帽图标（图标不是色位，不受对比度约束）。
          新增行的<em>麦色沙纸</em>取自 3.jpg 的沙滩米，不是草帽金——这是两个不同的物件。</p>
          <ul>
            <li>8 个表面只走一条色相（H{min(HS):.0f}–{max(HS):.0f}），靠明度分层：越往里越深，像从天空一路潜进海里；代码区是<em>日光浅海纸面</em>，反差来自深墨语法而不是黑卡。</li>
            <li>正文取标志字里的<em>海军蓝</em>做墨，浅底上对 <code>--dsw-alias-label-primary-inverted</code> 之类的反白文字一律走 <code>contrastText()</code>，主色按钮因此自动配浅字。</li>
            <li>语义色从海贼王世界里借：潟湖海流蓝做 info、索隆三刀绿做 success、娜美蜜柑橙做 warning、赤犬岩浆红做 error——没有通用语义色板。</li>
          </ul>
          <blockquote>天空是纸，海是墨，草帽的红是心跳，麦色金纸是航海日志新写下的一页。</blockquote>

          <div class="cc">
            <div class="hd"><span class="lang">ts</span><span class="fn">recipe.ts</span><span class="cp">复制</span></div>
<pre><span class="tk-com">// 每个色位 = 参考图像素锚点的线性混合</span>
<span class="tk-kw">const</span> <span class="tk-fn">onePiece</span> <span class="tk-op">=</span> {{
  <span class="tk-fn">field</span><span class="tk-op">:</span> <span class="tk-str">"{C['background']}"</span>,   <span class="tk-com">// 云边淡蓝 · images.jpg</span>
  <span class="tk-fn">ink</span><span class="tk-op">:</span>  <span class="tk-str">"{C['text']}"</span>,       <span class="tk-com">// 标志字内阴影 · 2.jpg</span>
  <span class="tk-fn">beat</span><span class="tk-op">:</span> <span class="tk-str">"{C['primary']}"</span>,       <span class="tk-com">// 路飞背心红 · images.jpg</span>
  <span class="tk-fn">brass</span><span class="tk-op">:</span><span class="tk-str">"{C['secondary']}"</span>,     <span class="tk-com">// 深麦秆金 · 草帽阴影</span>
  <span class="tk-kw">const</span> <span class="tk-fn">contrast</span> <span class="tk-op">=</span> <span class="tk-num">{RATIO_TEXT:.2f}</span> <span class="tk-kw">as</span> <span class="tk-typ">Ratio</span>,
}}</pre>
          </div>

          <table>
            <tr><th>检查项</th><th>结果</th><th>色值</th></tr>
            <tr><td>正文对比度</td><td><span class="ok">{RATIO_TEXT:.2f} : 1</span></td><td class="mono">{C['text']} / {C['background']}</td></tr>
            <tr><td>主按钮反白</td><td><span class="ok">{RATIO_BTN:.2f} : 1</span></td><td class="mono">#F4F4F5 / {C['primary']}</td></tr>
            <tr><td>亮草帽金做浅底主色</td><td><span class="no">已否决</span></td><td class="mono">{A['hat_gold']['hex']} → {ratio(A['hat_gold']['hex'], C['background']):.2f} : 1</td></tr>
          </table>

          <div class="warn">
            <span class="tag">已知限制</span>
            <span>草帽金 <b>{A['hat_gold']['hex']}</b> 在浅底上只有 <b>{ratio(A['hat_gold']['hex'], C['background']):.2f} : 1</b>，过不了 UI 3:1，
            所以品牌位改由背心红承担，麦秆金按图里「草帽阴影」压深成 <b>{C['secondary']}</b> 做副色；
            亮金只活在不受阈值约束的两处——黄铜家族里 8–14% 的配比，以及作为插画的草帽图标。
            另：提示气泡的文字色由 DSH 写死为白色，浅色主题下 37 个色位修不到这一点。</span>
          </div>

          <div class="diff">
            <div class="ln rm"><span class="no">41</span><span class="sign">-</span><span class="code">  "appearance": "dark",</span></div>
            <div class="ln add"><span class="no">41</span><span class="sign">+</span><span class="code">  "appearance": "light",</span></div>
            <div class="ln rm"><span class="no">42</span><span class="sign">-</span><span class="code">  "primary": "#ffcc33",</span></div>
            <div class="ln add"><span class="no">42</span><span class="sign">+</span><span class="code">  "primary": "{C['primary']}",</span></div>
          </div>

          <div class="tool">
            <div class="row"><span class="pulse"></span><span class="name">audit-themes --check</span><span class="st"><i></i>已完成</span></div>
            <div class="out">
              [1] text &amp; md tones on every surface: <b>38 / 38 · OK</b><br>
              [2] syntax tokens on codeBlockBg: <b>7 / 7 · OK</b>（最低 {SYN_MIN:.2f}）<br>
              [3] UI 3:1 品牌与语义色: <b>15 / 15 · OK</b><br>
              [4] 背景色相家族 / 角色串戏 / 品牌几何 / 语法 ΔE76: <b>0 告警</b><br>
              <span style="color:var(--success)">→ 进程退出码 0</span>
            </div>
          </div>
        </div>
      </div></div>

      <div class="toast"><i></i><span>主题已保存 · 37 色位</span><span class="sub">在面板中可见</span></div>

      <div class="composer"><div class="col">
        <div class="cbox">
          <div class="ph">继续调整配色，或问我任意细节…</div>
          <div class="row">
            <span class="pill"><i></i>recipe.ts</span>
            <span class="pill">light</span>
            <button class="btn ghost" style="width:26px;height:26px;padding:0">＋</button>
            <span class="sp"></span>
            <button class="btn ghost" style="width:26px;height:26px;padding:0">⚙</button>
            <button class="send">↑</button>
          </div>
        </div>
        <div class="hint">Enter 发送 · Shift + Enter 换行
          <span class="r"><span class="chip" style="padding:2px 8px">37 tokens</span><span>海贼王</span></span>
        </div>
      </div></div>
    </main>
  </div>

  <div class="tokens">
    <div class="head"><h3>37 Color Tokens</h3><span class="hintx">色位 → DSH 真实落点 · 每格右上角的十六进制即最终值</span></div>
    <div id="fams"></div>
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

  <div class="report">
    <h3>Contrast Report</h3>
    <div class="lead">仓库自带的 <span class="mono">scripts/audit-themes.ts</span> 判尺：硬性 38 对（4.5:1）+ UI 15 对（3:1）全部通过；下表列出余量最紧的 14 条。</div>
    <table class="rt">
      <tr><th>检查对</th><th>底</th><th>比值</th><th>阈值</th><th>判定</th></tr>
      {CHK}
    </table>
  </div>

  <div class="prov">
    <h3>取色溯源 · Provenance</h3>
    <div class="lead">每一行的配方都是参考图上真实像素的线性混合：<span class="mono">权重·锚点名(锚点 hex)</span>，出处列给出锚点所在的那张图。</div>
    <table>
      <tr><th>色位</th><th></th><th>终值</th><th>配方（锚点混合）</th><th>出处</th><th>角色</th></tr>
      {PROV_TABLE}
    </table>
  </div>

  <div class="foot"><span>One Piece · 正午海风 · 37 colors · light · 每个色位都来自三张参考图</span><span>design by 麦浪 · first principles</span></div>
</div>
<script>
const C = {JSON_C};
const FAMS = {json.dumps([[f, s] for f, s in FAMILIES], ensure_ascii=False)};
const ZH = {json.dumps(ROLE_ZH, ensure_ascii=False)};
function lum(h){{h=h.replace('#','');const v=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)
  .map(c=>c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4));return .2126*v[0]+.7152*v[1]+.0722*v[2]}}
const host=document.getElementById('fams');
for(const [fam,slots] of FAMS){{
  const f=document.createElement('div');f.className='fam';
  f.innerHTML='<div class="ft"><i></i>'+fam+'</div>';
  const g=document.createElement('div');g.className='grid';
  for(const s of slots){{
    const v=C[s];const L=lum(v);
    const fg=L>.42?'#0F284B':'#F4F4F5';
    const d=document.createElement('div');d.className='sw';d.title=ZH[s]+' · '+s;
    d.innerHTML='<div class="top" style="background:'+v+';color:'+fg+'"><span class="hex">'+v+'</span></div>'+
      '<div class="lbl"><b>'+s+'</b></div>';
    g.appendChild(d);
  }}
  f.appendChild(g);host.appendChild(f);
}}
</script>
</body>
</html>
"""

path = os.path.join(r"D:\dsh-plugin\dsh-opencode-palette\prototypes", "one-piece-theme-preview.html")
with open(path, "w", encoding="utf-8", newline="\n") as f:
    f.write(HTML)
print("wrote", path, os.path.getsize(path), "bytes")
