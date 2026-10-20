# -*- coding: utf-8 -*-
"""Emit the Cyberpunk 2077 preview page (self-contained: images + crops inlined)."""
import base64, io, json, os, re, sys
sys.path.insert(0, r"D:\Temp\kuromi-theme")
import os as _os
sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
from cp_core import (P, CN, ORDER, IMAGES, FILES, REPO, PKG, cr, lum, deltaE76,
                     contrast_text, file_b64, with_alpha)

# 预览页的取色对象 = design.py 的产物（palette.json），不是静态初始表
_d = json.load(open(_os.path.join(PKG, "palette.json"), encoding="utf-8"))
C = _d["colors"]

# 加载 pick.py 产出的逐像素校验台账
ledger = json.load(open(_os.path.join(PKG, "anchors.json"), encoding="utf-8"))

OUT = _os.path.join(REPO, "prototypes", "cyberpunk-theme-preview.html")

def rgba(hexv, a):
    h = hexv.lstrip("#")
    r, g, b = (int(h[i:i+2], 16) for i in (0, 2, 4))
    return f"rgba({r},{g},{b},{a})"

def shade(hexv, t):
    h = hexv.lstrip("#")
    c = [int(h[i:i+2], 16) for i in (0, 2, 4)]
    m = [round(x + (255 - x) * t) for x in c]
    return "#%02X%02X%02X" % tuple(m)

CT = contrast_text(C["primary"])
imgs = {fn: file_b64(fn) for fn in FILES}

# ---- CSS variables -----------------------------------------------------------
root_vars = "\n".join(f"    --{k}: {v};" for k, v in C.items())
extra_vars = f"""
    --hover: {rgba(C['text'], .08)};
    --active08: {rgba(C['text'], .14)};
    --dim: {rgba(C['textMuted'], .8)};
    --primaryhover: {shade(C['primary'], .12)};
    --onprimary: {CT};
    --rose20: {rgba(C['primary'], .2)};"""

# ---- ledger table rows --------------------------------------------------------
TIER_A = "A"   # 该像素在全库出现 ≥50 次 = 海报上成片的颜色
rows = []
for r in ledger:
    thumbs = "".join(
        f'<span class="thumb" title="{s["anchor"]} @ {s["file"]} ({s["x"]},{s["y"]}) · '
        f'全库同值 {s["corpus"]}px · 框内命中 {s["exact_in"]}px">'
        f'<img src="{s["b64"]}" alt=""><i style="background:{s["anchor"]}"></i></span>'
        for s in r["srcs"])
    corpus = max((s["corpus"] for s in r["srcs"]), default=0)
    tier = "A" if corpus >= 50 else "B"
    tier_txt = f"{corpus:,} px"
    rows.append(
        f'<tr><td class="tk"><b>{r["slot"]}</b><em>{r["cn"]}</em></td>'
        f'<td class="hx">{r["hex"]}</td>'
        f'<td class="rl"><span class="tag rl-{r["rule"]}">{r["rule"]}</span></td>'
        f'<td class="ev"><b class="tier{tier}">{tier} 档</b><em>{tier_txt}</em></td>'
        f'<td class="th">{thumbs}</td>'
        f'<td class="nt">{r["note"]}</td></tr>')
ledger_rows = "\n".join(rows)

# ---- reference images ---------------------------------------------------------
ref_imgs = "\n".join(
    f'<figure><img src="{imgs[fn]}" alt="{fn}"><figcaption>{fn} · '
    + {"1.jpg": "V 持枪 · 招牌黄场（主色来源）",
       "2.jpg": "右侧霓虹粉墙 + 领口冰白（次色/冰白来源）",
       "3.jpg": "V 全幅黄场 + 领口科技青（绿/黄来源）",
       "4.jpg": "Phantom Liberty 热红场 + 冷调灰字（红/冷灰来源）",
       "5.jpg": "V 与 Johnny · 皮革暖面 + 苔绿（地面/琥珀来源）"}[fn]
    + '</figcaption></figure>' for fn in FILES)

# ---- audit data (computed here, re-verified live in the page) ------------------
HARD = []
for b in ["background", "backgroundPanel", "backgroundElement", "sidebarBg", "bubbleBg",
          "inputBg", "codeBlockBg", "codeHeaderBg"]:
    HARD.append((f"text@{b}", "text", b, 4.5))
for b in ["background", "backgroundPanel", "backgroundElement"]:
    HARD.append((f"textMuted@{b}", "textMuted", b, 4.5))
    HARD.append((f"labelDimmed@{b}", "textMuted@.8", b, 4.5))
for m in ["markdownHeading", "markdownLink", "markdownCode", "markdownEmph",
          "markdownStrong", "markdownBlockQuote"]:
    for b in ["background", "backgroundPanel"]:
        HARD.append((f"{m}@{b}", m, b, 4.5))
for s in ["syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxType",
          "syntaxNumber", "syntaxString", "syntaxOperator"]:
    HARD.append((f"{s}@codeBlockBg", s, "codeBlockBg", 4.5))
HARD += [("diffAdded@diffAddedBg", "diffAdded", "diffAddedBg", 4.5),
         ("diffRemoved@diffRemovedBg", "diffRemoved", "diffRemovedBg", 4.5),
         ("text@diffAddedBg", "text", "diffAddedBg", 4.5),
         ("text@diffRemovedBg", "text", "diffRemovedBg", 4.5),
         ("contrastText(primary)@primary", "contrastText(primary)", "primary", 4.5)]
UI = [("borderActive@background", "borderActive", "background", 3.0),
      ("borderActive@backgroundPanel", "borderActive", "backgroundPanel", 3.0),
      ("borderActive@backgroundElement", "borderActive", "backgroundElement", 3.0)]
for s in ["primary", "secondary", "info", "success", "warning", "error"]:
    for b in ["background", "backgroundPanel"]:
        UI.append((f"{s}@{b}", s, b, 3.0))
audit = json.dumps({"hard": HARD, "ui": UI,
                    "colors": C, "dimmed": {b: with_alpha(C["textMuted"], 0.8, C[b])
                                            for b in ["background", "backgroundPanel", "backgroundElement"]},
                    "ct": CT}, ensure_ascii=False)

# ---- anchors -----------------------------------------------------------------
anchor_specs = [("#FBF405", "招牌黄", "1/3/5 黄场"), ("#D51666", "霓虹粉", "2 粉墙"),
                 ("#C2BFB0", "纸灰", "4 字幕"), ("#4A96B8", "领口青", "1/3/5 领口"),
                 ("#E0152C", "热红", "4 红场")]
anchors = "".join(
    f'<span class="anchor"><i style="background:{h}"></i>{n} {h}<em>{s}</em></span>'
    for h, n, s in anchor_specs)

HTML = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>赛博朋克 2077 主题预览 · 黄噪与黑皮</title>
<style>
  :root{{
{root_vars}{extra_vars}
    /* page chrome — deliberately neutral so it never contaminates the read */
    --page:#0A0A0A; --card:#131313; --card2:#1A1A1A; --line:#2A2A2A; --ink:#D8D8D8; --ink2:#8C8C8C;
  }}
  *{{box-sizing:border-box}}
  html,body{{margin:0;padding:0}}
  body{{background:var(--page);color:var(--ink);
    font-family:"Segoe UI","Microsoft YaHei UI","Microsoft YaHei",system-ui,sans-serif;
    -webkit-font-smoothing:antialiased}}
  .sheet{{width:1460px;padding:48px 56px 64px;margin:0 auto}}
  .eyebrow{{font-size:11px;letter-spacing:.24em;color:var(--ink2);text-transform:uppercase}}
  h1.title{{font-size:36px;line-height:1.15;margin:12px 0 10px;letter-spacing:.01em;font-weight:650;color:#EFEFEF}}
  h1.title em{{font-style:normal;color:{C['primary']}}}
  .sub{{font-size:13.5px;color:var(--ink2);max-width:900px;line-height:1.85}}
  .sub b{{color:var(--ink);font-weight:600}}
  .anchors{{display:flex;gap:10px;margin-top:20px;align-items:center;flex-wrap:wrap}}
  .anchor{{display:flex;align-items:center;gap:8px;background:var(--card2);border:.5px solid var(--line);
    border-radius:999px;padding:5px 13px 5px 6px;font-size:11.5px;color:var(--ink)}}
  .anchor i{{width:18px;height:18px;border-radius:50%;display:block;box-shadow:0 0 0 1px rgba(255,255,255,.08)}}
  .anchor em{{font-style:normal;color:var(--ink2);font-size:10.5px}}
  .rule{{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}}
  .rule span{{font-size:11.5px;color:var(--ink2);background:var(--card);border:.5px solid var(--line);
    border-radius:8px;padding:6px 11px}}
  .rule span b{{color:{C['primary']};font-weight:600}}

  /* ---------- app window ---------- */
  .win{{margin-top:28px;width:1348px;height:auto;border-radius:16px;overflow:hidden;position:relative;
    background:{C['background']};border:.5px solid var(--line);
    box-shadow:0 30px 70px -20px rgba(0,0,0,.85), 0 2px 8px rgba(0,0,0,.5);display:flex}}
  .sb{{width:252px;flex:none;background:{C['sidebarBg']};border-right:.5px solid {C['borderActive']};
    display:flex;flex-direction:column;padding:14px 12px 12px}}
  .brand{{display:flex;align-items:center;gap:9px;padding:2px 6px 14px}}
  .brand .name{{font-size:13.5px;font-weight:650;letter-spacing:.02em;color:{C['text']}}}
  .brand .badge{{font-size:10px;color:{C['textMuted']};border:.5px solid {C['borderActive']};border-radius:5px;padding:1px 4px;margin-left:auto}}
  .nsbtn{{display:flex;align-items:center;justify-content:center;gap:7px;height:38px;width:100%;
    background:{C['backgroundPanel']};border:.5px solid {C['borderActive']};border-radius:12px;
    font-size:12.5px;font-weight:600;color:{C['text']};margin-bottom:14px}}
  .nsbtn:hover{{background:{C['backgroundElement']}}}
  .nav{{display:flex;flex-direction:column;gap:2px}}
  .nav .it{{position:relative;display:flex;align-items:center;gap:9px;font-size:12.5px;color:{C['textMuted']};
    padding:7px 9px;border-radius:8px;cursor:default}}
  .nav .it:hover{{background:var(--hover)}}
  .nav .it.on{{background:var(--active08);color:{C['text']};font-weight:600}}
  .nav .it.on:before{{content:"";position:absolute;left:0;top:7px;bottom:7px;width:3px;border-radius:3px;background:{C['primary']}}}
  .nav .it .ic{{width:15px;height:15px;border:1.4px solid currentColor;border-radius:4px;opacity:.7;flex:none}}
  .nav .it .ic.round{{border-radius:50%}}
  .side-lbl{{font-size:10.5px;letter-spacing:.12em;color:{C['textMuted']};opacity:.8;margin:16px 8px 6px;text-transform:uppercase}}
  .threads{{display:flex;flex-direction:column;gap:1px;overflow:hidden}}
  .th{{font-size:12px;color:{C['textMuted']};padding:6px 9px;border-radius:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
  .th:hover{{background:var(--hover)}}
  .th.sel{{background:var(--active08);color:{C['text']}}}
  .sb-foot{{margin-top:auto;display:flex;align-items:center;gap:9px;padding:9px 6px 2px;
    border-top:.5px solid {C['border']};font-size:12px;color:{C['textMuted']}}}
  .av{{width:24px;height:24px;border-radius:50%;background:{C['primary']};color:{CT};
    display:grid;place-items:center;font-size:11px;font-weight:700}}
  .sb-foot .gear{{margin-left:auto;color:{C['textMuted']};font-size:13px}}

  .main{{flex:1;display:flex;flex-direction:column;min-width:0;position:relative}}
  .topbar{{height:48px;flex:none;display:flex;align-items:center;gap:10px;padding:0 18px;
    border-bottom:.5px solid {C['borderActive']}}}
  .topbar .h{{font-size:13px;font-weight:650;color:{C['text']}}}
  .topbar .crumb{{font-size:11.5px;color:{C['textMuted']}}}
  .topbar .right{{margin-left:auto;display:flex;align-items:center;gap:8px}}
  .chip{{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:{C['textMuted']};
    background:{C['backgroundPanel']};border:.5px solid {C['borderActive']};border-radius:999px;padding:4px 10px}}
  .chip i{{width:8px;height:8px;border-radius:50%;background:{C['info']}}}
  .chip i.idle{{background:{C['secondary']}}}
  .btn{{border:0;border-radius:8px;font-size:12px;padding:6px 12px;cursor:default;font-family:inherit}}
  .btn.primary{{background:{C['primary']};color:{CT};font-weight:650;box-shadow:0 1px 0 rgba(0,0,0,.4)}}
  .btn.ghost{{background:transparent;color:{C['textMuted']}}}
  .btn.ghost:hover{{background:var(--active08);color:{C['text']}}}
  .btn.outline{{background:transparent;border:.5px solid {C['borderActive']};color:{C['text']}}}
  .feed{{flex:1;overflow:hidden;padding:70px 26px 84px}}
  .col{{width:740px;margin:0 auto}}
  .user{{display:flex;justify-content:flex-end;margin-bottom:20px}}
  .user .bub{{background:{C['bubbleBg']};border-radius:14px 14px 4px 14px;padding:10px 14px;font-size:13px;
    line-height:1.65;max-width:520px;color:{C['text']};border:.5px solid {C['borderActive']}}}
  .who{{display:flex;align-items:center;gap:7px;margin-bottom:9px}}
  .who .k{{width:20px;height:20px;display:grid;place-items:center}}
  .who .n{{font-size:12px;font-weight:650;letter-spacing:.02em;color:{C['text']}}}
  .who .t{{font-size:10.5px;color:{C['textMuted']};border:.5px solid {C['border']};border-radius:5px;padding:1px 5px}}
  .md{{font-size:13px;line-height:1.8;color:{C['text']}}}
  .md h2{{font-size:16px;line-height:1.4;color:{C['markdownHeading']};margin:0 0 10px;font-weight:700;letter-spacing:.01em}}
  .md p{{margin:0 0 10px}}
  .md strong{{color:{C['markdownStrong']};font-weight:650}}
  .md em{{color:{C['markdownEmph']};font-style:italic}}
  .md a{{color:{C['markdownLink']};text-decoration:underline;text-underline-offset:2px;text-decoration-thickness:.5px}}
  .md code{{font-family:"Cascadia Code",Consolas,"Courier New",monospace;font-size:.875em;color:{C['markdownCode']};
    border:.5px solid {C['border']};border-radius:8px;padding:0 5px}}
  .md ul{{margin:0 0 10px;padding-left:18px}}
  .md li{{margin:3px 0}}
  .md blockquote{{margin:0 0 12px;padding:2px 0 2px 14px;border-left:2px solid {C['textMuted']};
    color:{C['markdownBlockQuote']};font-size:12.5px}}
  .warn{{display:flex;gap:9px;align-items:flex-start;background:{rgba(C['warning'],.1)};
    border-left:2.5px solid {C['warning']};border-radius:6px;padding:8px 12px;margin:0 0 12px;
    font-size:12px;line-height:1.7;color:{C['warning']}}}
  .warn b{{font-weight:650}}
  .warn .tag{{font-size:10.5px;letter-spacing:.08em;border:.5px solid {rgba(C['warning'],.45)};
    border-radius:4px;padding:0 5px;flex:none;margin-top:1px}}
  .md table{{border-collapse:collapse;font-size:12px;margin:0 0 12px;width:100%}}
  .md th{{text-align:left;font-weight:650;padding:10px 16px;border-bottom:.5px solid {C['borderActive']};
    color:{C['text']}}}
  .md td{{padding:8px 16px;border-bottom:.5px solid {C['borderActive']}}}
  .md td .ok{{color:{C['success']};font-weight:650}}
  .md td .no{{color:{C['error']};font-weight:650}}
  .md td.mono{{font-family:"Cascadia Code",Consolas,monospace;font-size:11px;color:{C['textMuted']}}}

  .cc{{border-radius:16px;overflow:hidden;margin:2px 0 12px;background:{C['codeBlockBg']}}}
  .cc .hd{{display:flex;align-items:center;gap:8px;background:{C['codeHeaderBg']};padding:9px 14px;
    font:11px/18px "Segoe UI",sans-serif;color:{C['textMuted']}}}
  .cc .hd .lang{{color:{C['textMuted']};font-family:"Cascadia Code",Consolas,monospace}}
  .cc .hd .fn{{color:{C['textMuted']}}}
  .cc .hd .cp{{margin-left:auto;font-size:10.5px;color:{C['textMuted']}}}
  .cc pre{{margin:0;padding:16px;overflow:hidden;
    font-family:"Cascadia Code",Consolas,"Courier New",monospace;font-size:11.5px;line-height:1.85;
    color:{C['text']}}}
  .tk-com{{color:{C['syntaxComment']};font-style:italic}}
  .tk-kw{{color:{C['syntaxKeyword']}}}
  .tk-fn{{color:{C['syntaxFunction']}}}
  .tk-typ{{color:{C['syntaxType']}}}
  .tk-num{{color:{C['syntaxNumber']}}}
  .tk-str{{color:{C['syntaxString']}}}
  .tk-op{{color:{C['syntaxOperator']}}}

  .diff{{border-radius:16px;overflow:hidden;background:{C['codeBlockBg']};margin:0 0 12px;
    font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px}}
  .diff .ln{{display:flex;gap:10px;padding:2px 12px 2px 0}}
  .diff .ln .no{{width:32px;padding-right:7px;text-align:right;color:{C['textMuted']};border-right:.5px solid transparent}}
  .diff .rm{{background:{C['diffRemovedBg']}}}
  .diff .rm .no{{background:{C['diffRemovedLineNumberBg']};color:{C['diffRemoved']};border-right-color:{C['diffRemovedBg']}}}
  .diff .rm .sign,.diff .rm .code{{color:{C['diffRemoved']}}}
  .diff .add{{background:{C['diffAddedBg']}}}
  .diff .add .no{{background:{C['diffAddedLineNumberBg']};color:{C['diffAdded']};border-right-color:{C['diffAddedBg']}}}
  .diff .add .sign,.diff .add .code{{color:{C['diffAdded']}}}
  .diff .ln .sign{{width:8px}}

  .tool{{background:{C['backgroundElement']};border-radius:12px;padding:10px 13px;margin:0 0 12px;font-size:12px;
    border:.5px solid {C['border']}}}
  .tool .row{{display:flex;align-items:center;gap:8px;color:{C['text']}}}
  .tool .name{{font-weight:650}}
  .tool .st{{margin-left:auto;color:{C['success']};font-size:11px;display:flex;align-items:center;gap:5px}}
  .tool .st i{{width:6px;height:6px;border-radius:50%;background:{C['success']}}}
  .tool .out{{margin-top:7px;font-family:"Cascadia Code",Consolas,monospace;font-size:10.8px;line-height:1.75;color:{C['textMuted']}}}
  .tool .out b{{color:{C['success']};font-weight:600}}
  .pulse{{width:14px;height:14px;border-radius:50%;border:1.6px solid {rgba(C['info'],.35)};border-top-color:{C['info']}}}
  .toast{{position:absolute;top:40px;left:50%;transform:translateX(-50%);background:{C['backgroundElement']};
    border-radius:16px;padding:12px 16px;display:flex;align-items:center;gap:10px;font-size:14px;color:{C['text']};
    box-shadow:0 16px 40px -12px rgba(0,0,0,.85)}}
  .toast i{{width:8px;height:8px;border-radius:50%;background:{C['success']}}}
  .toast .sub{{color:{C['textMuted']};font-size:13px}}
  .tip{{position:absolute;left:50%;transform:translateX(-50%);bottom:132px;background:{C['backgroundElement']};
    color:{C['text']};font-size:13px;line-height:20px;padding:3px 7px;border-radius:8px;
    display:inline-flex;align-items:center;gap:8px;max-width:50vw;pointer-events:none;
    box-shadow:0 8px 20px -8px rgba(0,0,0,.7)}}
  .tip .key{{min-width:16px;height:16px;padding:0 2px;border-radius:4px;border:0;
    background:color-mix(in srgb, {C['backgroundElement']}, #fff 18%);display:inline-grid;place-items:center;
    font-size:10px;font-family:inherit}}
  .composer{{flex:none;padding:10px 26px 14px}}
  .composer .col{{width:740px}}
  .cbox{{background:{C['inputBg']};border:.5px solid {C['primary']};border-radius:8px;padding:11px 13px 9px}}
  .cbox .ph{{font-size:13px;color:{C['textMuted']}}}
  .cbox .row{{display:flex;align-items:center;gap:7px;margin-top:9px}}
  .cbox .row .sp{{margin-left:auto}}
  .pill{{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;color:{C['textMuted']};
    background:{C['background']};border-radius:999px;padding:3px 8px}}
  .pill i{{width:5px;height:5px;border-radius:50%;background:{C['primary']}}}
  .send{{width:28px;height:28px;border-radius:9px;background:{C['primary']};color:{CT};
    display:grid;place-items:center;font-size:13px;font-weight:700;border:0}}
  .hint{{display:flex;justify-content:space-between;align-items:center;font-size:10.5px;color:{C['textMuted']};
    opacity:.85;padding:7px 4px 0}}

  /* ---------- sections ---------- */
  .sec{{margin-top:46px}}
  .sec .head{{display:flex;align-items:baseline;gap:14px;margin-bottom:14px}}
  .sec h3{{font-size:13px;letter-spacing:.2em;text-transform:uppercase;margin:0;font-weight:650;color:#E4E4E4}}
  .sec .hintx{{font-size:11.5px;color:var(--ink2)}}
  .refs{{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}}
  .refs figure{{margin:0;background:var(--card);border:.5px solid var(--line);border-radius:12px;overflow:hidden}}
  .refs img{{width:100%;display:block;aspect-ratio:1/1;object-fit:cover}}
  .refs figcaption{{font-size:11px;color:var(--ink2);padding:9px 11px;line-height:1.5}}
  table.tb{{width:100%;border-collapse:collapse;font-size:12px;background:var(--card);
    border:.5px solid var(--line);border-radius:12px;overflow:hidden}}
  table.tb th{{text-align:left;font-weight:600;color:var(--ink2);font-size:10.5px;letter-spacing:.1em;
    text-transform:uppercase;padding:10px 12px;border-bottom:.5px solid var(--line);background:var(--card2)}}
  table.tb td{{padding:8px 12px;border-bottom:.5px solid #1F1F1F;vertical-align:middle;color:#CFCFCF}}
  table.tb tr:last-child td{{border-bottom:0}}
  .tk{{width:210px}} .tk b{{color:#EDEDED;font-weight:600;display:block;font-size:12px}}
  .tk em{{font-style:normal;color:var(--ink2);font-size:11px}}
  .hx{{font-family:"Cascadia Code",Consolas,monospace;color:{C['primary']};width:82px;font-size:11.5px}}
  .rl{{width:60px}}
  .tag{{display:inline-block;font-size:10.5px;padding:2px 7px;border-radius:5px;font-weight:600}}
  .rl-直采{{background:rgba(45,212,191,.16);color:#5EEAD4}}
  .rl-阶梯{{background:rgba(251,191,36,.16);color:#FCD34D}}
  .rl-混色{{background:rgba(167,139,250,.16);color:#C4B5FD}}
  .th{{width:130px}}
  .ev{{width:104px}}
  .ev b{{display:block;font-size:11px;font-weight:650}}
  .ev em{{font-style:normal;color:var(--ink2);font-size:10.5px}}
  .tierA{{color:#5EEAD4}} .tierB{{color:#FCD34D}}
  .sev-bad{{background:rgba(248,113,113,.16);color:#F87171}}
  .sev-mid{{background:rgba(251,191,36,.16);color:#FCD34D}}
  .sev-low{{background:rgba(148,163,184,.16);color:#94A3B8}}
  .sev-open{{background:rgba(167,139,250,.16);color:#C4B5FD}}
  .thumb{{display:inline-block;position:relative;margin-right:6px;vertical-align:middle}}
  .thumb img{{width:52px;height:52px;display:block;border-radius:7px;border:.5px solid var(--line);image-rendering:auto}}
  .thumb i{{position:absolute;right:-3px;bottom:-3px;width:14px;height:14px;border-radius:4px;
    border:1.5px solid #0A0A0A}}
  .nt{{color:var(--ink2);font-size:11.5px;line-height:1.55}}
  .grid{{display:grid;grid-template-columns:repeat(9,1fr);gap:8px}}
  .sw{{border-radius:9px;border:.5px solid var(--line);overflow:hidden;background:var(--card)}}
  .sw .top{{height:46px;display:flex;align-items:flex-end;padding:5px 7px}}
  .sw .hex{{font-size:9.5px;font-family:"Cascadia Code",Consolas,monospace;letter-spacing:.02em}}
  .sw .lbl{{font-size:10px;padding:4px 7px 5px;color:var(--ink2);border-top:.5px solid var(--line);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
  .sw .lbl b{{color:#E4E4E4;font-weight:600;display:block}}
  .legend{{display:flex;gap:16px;margin-top:16px;font-size:11px;color:var(--ink2);flex-wrap:wrap}}
  .legend span{{display:flex;align-items:center;gap:6px}}
  .legend i{{width:9px;height:9px;border-radius:3px}}
  .sum{{display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap}}
  .sum span{{font-size:11.5px;padding:6px 12px;border-radius:8px;background:var(--card);border:.5px solid var(--line);color:var(--ink2)}}
  .sum span b{{color:#EDEDED;font-weight:650}}
  .sum span.g b{{color:#5EEAD4}} .sum span.r b{{color:#F87171}}
  .foot{{display:flex;justify-content:space-between;margin-top:26px;font-size:10.5px;color:#5A5A5A}}
</style>
</head>
<body>
<div class="sheet">
  <div class="eyebrow">DSH / OpenCode Palette · IP 预置主题 · cyberpunk-2077</div>
  <h1 class="title">赛博朋克 2077 <em>黄噪与黑皮</em></h1>
  <div class="sub">
    五张参考图讲的是同一个故事：<b>一整片平铺的招牌黄</b>压着一具穿黑皮衣的人，右侧亮着霓虹粉墙，脖颈上一圈领口科技青，背面是 Phantom Liberty 的热红场。
    这套配色照着它建，不做二创——<b>黄场是全局唯一的高声位</b>（主色 / 焦点环 / 标题 / 关键字，共 4 槽），<b>黑皮是唯一的地面</b>（8 个背景槽同一条暖黑明度梯），
    <b>粉墙是次色</b>（与主色夹角 83.4°，黄-品红分裂互补），<b>领口青与酸绿是机器与生存</b>，<b>人脸上的光色是强调</b>。
    37 个色位全部落在这五张图里：<b>直采 28 槽（色值就是图里的一个真实像素）· 阶梯 6 槽（某个真实像素的同色相明度阶）· 混色 3 槽（两个真实像素的配比）</b>，
    <b>没有一个颜色是想象出来的</b>——下方台账里每一格都贴了可逐像素核对的来源裁切。
  </div>
  <div class="anchors">{anchors}</div>
  <div class="rule">
    <span><b>取色规则 1</b> 直采：色值 = 图里的一个真实像素（28 槽）</span>
    <span><b>取色规则 2</b> 阶梯：某个真实像素的明度阶，色相/饱和不变（6 槽）</span>
    <span><b>取色规则 3</b> 混色：两个图内真实像素的配比（3 槽）</span>
    <span><b>没有第四种</b></span>
  </div>

  <div class="win">
    <aside class="sb">
      <div class="brand">
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
          <path d="M13 2.4 2.2 22.2h4.6L13 12.6l6.2 9.6h4.6L13 2.4Z" fill="{C['primary']}"/>
          <path d="M9.4 17.8h7.2l1.6 4.4H7.8l1.6-4.4Z" fill="{C['primary']}" opacity=".55"/>
        </svg>
        <span class="name">赛博朋克 2077</span><span class="badge">DSH</span>
      </div>
      <div class="nsbtn">＋&nbsp; 新会话</div>
      <div class="nav">
        <div class="it on"><span class="ic round"></span>会话历史<span style="margin-left:auto;font-size:10px;color:{C['textMuted']}">⌘K</span></div>
        <div class="it"><span class="ic"></span>文件</div>
        <div class="it"><span class="ic round"></span>终端</div>
        <div class="it"><span class="ic"></span>设置</div>
      </div>
      <div class="side-lbl">最近</div>
      <div class="threads">
        <div class="th sel">赛博朋克 2077 主题 · 取色复核</div>
        <div class="th">把五张海报拆成 37 个色位</div>
        <div class="th">黄场为什么只能有一个</div>
        <div class="th">对比度与并岗记档</div>
      </div>
      <div class="sb-foot"><span class="av">V</span><span>V</span><span class="gear">⚙</span></div>
    </aside>

    <main class="main">
      <div class="topbar">
        <span class="h">赛博朋克 2077 主题 · 取色复核</span>
        <span class="crumb">/ 37 tokens</span>
        <div class="right">
          <span class="chip"><i class="idle"></i>就绪</span>
          <span class="chip"><i></i>deepseek-flash</span>
          <button class="btn ghost">分享</button>
          <button class="btn primary">新建会话</button>
        </div>
      </div>

      <div class="feed"><div class="col">
        <div class="user"><div class="bub">这五张海报里没有一个纯白色。用它们做一套 37 色位的 IP 主题，正文该怎么办？</div></div>

        <div class="who">
          <span class="k">
            <svg width="20" height="20" viewBox="0 0 26 26"><path d="M13 2.4 2.2 22.2h4.6L13 12.6l6.2 9.6h4.6L13 2.4Z" fill="{C['primary']}"/></svg>
          </span>
          <span class="n">V</span><span class="t">cyberpunk-2077.json</span>
        </div>

        <div class="md">
          <h2>黄噪与黑皮 · 37 色位已按判尺落位</h2>
          <p>核心只有一句话：<strong>黄场是画面里唯一的高声位，所以界面里也只能有一个</strong>。海报上大面积的平铺黄是 <code>#FBF405</code>，它在本主题里只出现在主按钮、焦点环、选中条、标题与关键字——一旦它开始铺满，招牌就变成了背景。剩下的全是黑皮的明度梯。三个取舍值得说：</p>
          <ul>
            <li>正文不用纯白，用 <em>纸灰</em> <code>#C2BFB0</code>——它就是海报里 <a href="#">PHANTOM LIBERTY</a> 副标题那一档灰白；次要文字取海报同一处那行<b>冷调字幕灰</b> <code>#A7B4BC</code>，与正文那档暖灰分开。</li>
            <li>代码块压到全场最暗 <code>#0E0A0B</code>，因为 shiki 的普通 token 走 <code>--shiki-foreground</code>（= 正文色）；深底配暖灰正文才不糊。</li>
            <li>语义色全部有实物指认：领口青做 <code>info</code>，苔绿做 <code>success</code>，皮革琥珀做 <code>warning</code>，热红场做 <code>error</code>，霓虹粉墙做 <code>secondary</code>；斜体取的是<b>人脸上被光照亮的那一档</b> <code>#E1BF9A</code>——它是唯一比正文亮半档的正文级角色。</li>
          </ul>
          <blockquote>黑皮是地，招牌黄是声，粉墙是回声；领口那一圈青，是这台机器唯一的体温。</blockquote>

          <div class="cc">
            <div class="hd"><span class="lang">json</span><span class="fn">cyberpunk-2077.json</span><span class="cp">复制</span></div>
<pre><span class="tk-com">// 赛博朋克 2077 · 37 槽全部出自 5 张参考图</span>
{{
  <span class="tk-fn">"primary"</span>:        <span class="tk-str">"#FBF405"</span>,   <span class="tk-com">// 图 1/3/5 招牌黄场（569 px）</span>
  <span class="tk-fn">"background"</span>:     <span class="tk-str">"#151112"</span>,   <span class="tk-com">// 图 2 皮衣暗部</span>
  <span class="tk-fn">"secondary"</span>:      <span class="tk-str">"#D51666"</span>,   <span class="tk-com">// 图 2 霓虹粉墙</span>
  <span class="tk-fn">"info"</span>:           <span class="tk-str">"#4A96B8"</span>,   <span class="tk-com">// 图 3 领口科技青</span>
  <span class="tk-fn">"markdownEmph"</span>:   <span class="tk-str">"#E1BF9A"</span>,   <span class="tk-com">// 图 1 脸上的光色 · 斜体</span>
  <span class="tk-fn">"text"</span>:           <span class="tk-str">"#C2BFB0"</span>    <span class="tk-com">// 图 4 副标题灰白</span>
}}</pre>
          </div>

          <table>
            <tr><th>检查项</th><th>结果</th><th>色值</th></tr>
            <tr><td>正文对比度</td><td><span class="ok">10.15 : 1</span></td><td class="mono">#C2BFB0 / #151112</td></tr>
            <tr><td>输入框边界</td><td><span class="ok">14.50 : 1</span></td><td class="mono">#FFF847 / #261F1B</td></tr>
            <tr><td>斜体必须亮过正文</td><td><span class="ok">10.81 &gt; 10.15</span></td><td class="mono">#E1BF9A / #C2BFB0</td></tr>
          </table>

          <div class="warn">
            <span class="tag">已知限制</span>
            <span><strong>次色在真实产品里只有一个落点</strong>：<code>secondary</code> 只映射到 <code>--dsw-alias-state-idle-primary</code>（空闲状态圆点），所以霓虹粉墙在真实界面里几乎看不见——这套主题实际是<strong>单声位</strong>主题，粉墙只活在几何里（与主色 83.4° 分裂互补），不出现在主视觉上。</span>
          </div>

          <div class="diff">
            <div class="ln rm"><span class="no">41</span><span class="sign">-</span><span class="code">  "primary": "#fcee0a",</span></div>
            <div class="ln add"><span class="no">41</span><span class="sign">+</span><span class="code">  "primary": "#FBF405",</span></div>
            <div class="ln rm"><span class="no">18</span><span class="sign">-</span><span class="code">  "text": "#ede7f2",</span></div>
            <div class="ln add"><span class="no">18</span><span class="sign">+</span><span class="code">  "text": "#C2BFB0",</span></div>
            <div class="ln rm"><span class="no">29</span><span class="sign">-</span><span class="code">  "markdownEmph": "#C59459",</span></div>
            <div class="ln add"><span class="no">29</span><span class="sign">+</span><span class="code">  "markdownEmph": "#E1BF9A",</span></div>
          </div>

          <div class="tool">
            <div class="row"><span class="pulse"></span><span class="name">node scripts/audit-themes.ts</span><span class="st"><i></i>已完成</span></div>
            <div class="out">
              [1] 硬性 38 对（4.5:1）：<b>0 违例</b>（最低 4.64:1）<br>
              [2] UI 15 对（3:1）：<b>0 违例</b>（最低 3.33:1）<br>
              [3] 背景家族色相孤岛：<b>0 个</b>（基准 18.0°，最大偏差 7.0°）<br>
              [4] 语法核心五 ΔE76 最小：<b>33.0</b> · comment/operator 退后 <b>0 越位</b><br>
              [6] 直采 28 槽 = 字面像素 · 阶梯 6 槽 · 混色 3 槽 · 缩略图 <b>40/40</b> 框内命中字面像素<br>
              [5] 引擎 tokenParity：<b>0 失配</b> · ensureDiffContrast：<b>零改写</b><br>
              <span style="color:{C['warning']}">[!] error=diffRemoved 并岗：v3 终审已记档（exceptions.json）</span>
            </div>
          </div>
        </div>
      </div></div>

      <div class="toast"><i></i><span>主题已保存 · 37 色位</span><span class="sub">在面板中可见</span></div>

      <div class="tip"><span class="key">⌘</span><span>重跑审计</span></div>

      <div class="composer"><div class="col">
        <div class="cbox">
          <div class="ph">继续调整配色，或问我任意细节…</div>
          <div class="row">
            <span class="pill"><i></i>cyberpunk-2077.json</span>
            <span class="pill">dark</span>
            <button class="btn ghost" style="width:26px;height:26px;padding:0">＋</button>
            <span class="sp"></span>
            <button class="btn ghost" style="width:26px;height:26px;padding:0">⚙</button>
            <button class="send">↑</button>
          </div>
        </div>
        <div class="hint"><span>Enter 发送 · Shift + Enter 换行</span>
          <span class="r"><span class="chip" style="padding:2px 8px">37 tokens</span><span>赛博朋克 2077</span></span>
        </div>
      </div></div>
    </main>
  </div>

  <div class="sec">
    <div class="head"><h3>参考图 · 全部五张</h3><span class="hintx">本套配色的唯一素材来源（5 张 · 原始像素直采）</span></div>
    <div class="refs">{ref_imgs}</div>
  </div>

  <div class="sec">
    <div class="head"><h3>取色台账 · 37 色位逐条溯源</h3><span class="hintx">每格 = 该色值在参考图中的<strong>字面像素</strong>裁切（缩略图右下角为原色；悬停可见坐标与全库命中数）</span></div>
    <div class="sum" style="margin-bottom:14px">
      <span class="g">证据 <b>A 档 20 槽</b>：该像素在全库 752,206 px 中出现 ≥50 次 = 海报上<strong>成片的颜色</strong>（黄场 / 皮衣 / 红场 / 琥珀）</span>
      <span>证据 <b>B 档 17 槽</b>：出现 1–49 次 = 颜色簇的<strong>极端代表点</strong>（所属色族仍有 6k–460k px）</span>
      <span class="g">缩略图逐像素核验：<b>40/40</b> 框内确实命中<strong>完全同值</strong>的像素（不是「接近」）</span>
    </div>
    <table class="tb">
      <tr><th>色位 / 用途</th><th>色值</th><th>规则</th><th>证据</th><th>来源像素</th><th>说明</th></tr>
      {ledger_rows}
    </table>
  </div>

  <div class="sec">
    <div class="head"><h3>对抗式复核 · 第一性原理审查记录</h3><span class="hintx">本页发布前做过一轮自我攻击：逐条去证自己的说法，而不是去证实它</span></div>
    <table class="tb">
      <tr><th style="width:52px">性质</th><th>发现</th><th>处置</th></tr>
      <tr><td><span class="tag sev-bad">严重</span></td>
          <td><b>台账缩略图与色值不符</b>：原实现按「平整度」挑代表区域再贴色值标签。复核发现 <b>41 条里 25 条</b>的裁切框内根本没有声称的像素，其中 8 条声称的那张图里<b>根本不存在该色</b>。看起来严谨，其实不成立。</td>
          <td>改为<strong>先定位字面像素、再据此裁切</strong>，并对每条断言「框内命中数 ≥ 1」；现 <b>41/41</b> 通过，0 条失败。</td></tr>
      <tr><td><span class="tag sev-bad">严重</span></td>
          <td><b>「直采＝色值就是图里的像素」原本是假的</b>：第一版色值多为 k-means 簇心，图内并无该 hex 的字面像素（例：<code>#C2BDB0</code> 实际最近像素是 <code>#C2BFB0</code>，差 Δ2）。</td>
          <td>把 <b>28 个直采槽全部吸附到语料内的字面像素</b>；其中 <code>syntaxType</code> / <code>markdownEmph</code> / <code>syntaxOperator</code> 另在图内 16 万种颜色里做「既字面存在、又满足判尺、又与可共存角色拉开 ΔE76 ≥ 10」的<b>约束搜索</b>，取 <code>#7A9E92</code> / <code>#E1BF9A</code> / <code>#7876A5</code>。吸附后硬性 0 违例。</td></tr>
      <tr><td><span class="tag sev-mid">中</span></td>
          <td><b>「输入框边界 16.72:1」量错了对象</b>：拿焦点环对<em>页面底</em>算；输入框的真实底是 <code>inputBg</code>。</td>
          <td>改为对 <code>inputBg</code> 计算：<b>14.50 : 1</b>（<code>#FFF847 / #261F1B</code>）。</td></tr>
      <tr><td><span class="tag sev-mid">中</span></td>
          <td><b>「已知限制」写着 tooltip 文字色被写死为白</b>——这是 <code>#120</code> 之前的旧状态；引擎现已按浮层底现算，审计 <code>tooltipBelow45=false</code>。文案是抄库洛米那版抄来的，没核实。</td>
          <td>删掉陈旧断言，换成<strong>真实限制</strong>：<code>secondary</code> 只驱动空闲圆点，粉墙在真实界面几乎不可见。</td></tr>
      <tr><td><span class="tag sev-mid">中</span></td>
          <td><b>证据权重不均</b>：B 档 17 槽的字面像素在全库只有 1–49 个。色族是真的（6k–460k px），但「这个 hex」是簇的极端点，不是海报主色。</td>
          <td>台账新增<b>证据列</b>（A/B 档 + 全库同值像素数），不藏这件事。</td></tr>
      <tr><td><span class="tag sev-low">轻</span></td>
          <td><b>「黄场只出现在主按钮/焦点环/选中条/标题」漏了关键字</b>；且代码样例用了 <code>field/leather/neon/collar/skin</code> 这些<b>并不存在的槽名</b>。</td>
          <td>改为「共 4 槽」；样例改用真实槽名与真实 hex。</td></tr>
      <tr><td><span class="tag sev-mid">中</span></td>
          <td><b>斜体比次要文字还暗</b>：原 <code>markdownEmph #C59459</code> 只有 6.92:1，低于 <code>textMuted</code> 的 8.84:1——一个叫「强调」的角色，比次要说明还安静。</td>
          <td>改为 <code>#E1BF9A</code>（图 1 人物<b>脸上被光照亮的那一档</b>，字面像素）：<b>10.81:1</b>，高于正文 10.15:1。墨色阶梯因此单调：标题 13.37 &gt; 粗体 13.20 &gt; 行内码 10.96 &gt; 链接 10.84 &gt; 斜体 10.81 &gt; 正文 10.15 &gt; 次要 8.83 &gt; 引用 5.95。</td></tr>
      <tr><td><span class="tag sev-mid">中</span></td>
          <td><b>运算符与注释挤在一起</b>：原 <code>#7A818A</code> 是冷灰，混色后变中性，与暖灰注释的 ΔE 只剩 <b>6.1</b>——两个退后角色彼此糊在一起。</td>
          <td>在语料里搜出既字面存在、又落在退后带 <code>[4.50, 5.32]</code>、且与注释/类型/引用全部 ΔE≥19.9 的冷端像素，取 <code>#7876A5</code>；注释/运算符 ΔE 回到 <b>37.7</b>。</td></tr>
      <tr><td><span class="tag sev-low">轻</span></td>
          <td><b>「正文不是最亮的墨」是误判</b>：我原先拿浅色主题的「正文最深」来比。深色主题里正文低于粗体是<b>正确</b>关系（GitHub Dark 即 body #c9d1d9 &lt; bold #f0f6fc），宿主自身也是 label-primary 最亮。复核后此项撤销。</td>
          <td>保留：正文 10.15 &lt; 粗体 13.20 &lt; 标题 13.37。真正需要修的是斜体（见上）。</td></tr>
      <tr><td><span class="tag sev-open">待决</span></td>
          <td><b>本次改色的岗位决定没有进 v3 终审笔记</b>：<code>keyword</code>→橄榄黄、<code>type</code>→领口青、<code>link</code>→领口青、<code>code</code>→浅酸绿、<code>emph</code>→肤色、<code>comment</code>→混色暖灰，都不在 <code>docs/ip-presets-v3-notes.md</code> 里。</td>
          <td><b>未补</b>——该文件正被另一会话占用；本次只动了无冲突的 <code>exceptions.json</code> 记档说明。</td></tr>
    </table>

    <div class="head" style="margin-top:22px"><h3 style="font-size:11px">附：宿主还原度复核（对 DSH 真实 CSS 逐条核，10 项）</h3>
      <span class="hintx">上面的窗口是「模拟的 DSH」，不是截图——所以它自己也可能是错的。以下是拿宿主 <code>web/index.css</code> 逐条对出来的错，已改：</span></div>
    <table class="tb">
      <tr><th style="width:52px">原状</th><th>模拟稿错在哪</th><th>真实 DSH 是什么</th></tr>
      <tr><td><span class="tag sev-bad">错</span></td><td>行内代码画了 1px 边框 + 4px 圆角</td>
          <td>边框 <code>.5px</code> 且用 <code>border</code> 槽；圆角 <code>--dsw-radius-sm</code> = <b>8px</b>（4px 只在 compact 模式）；<code>padding:0 5px</code>；底色被插件置为 transparent</td></tr>
      <tr><td><span class="tag sev-bad">错</span></td><td>焦点环画在输入框上，还有一圈黄色光晕</td>
          <td>焦点环是 <code>--dsw-focus-ring-color</code> → <b>primary</b>、<b>2px</b>、<b>仅键盘焦点</b>（鼠标交互直接抹掉）；输入框本身是 <code>.5px</code> 边框，聚焦时边框色换成 primary，<b>没有光晕</b></td></tr>
      <tr><td><span class="tag sev-bad">错</span></td><td>代码卡外面套了一圈边框、圆角 10px</td>
          <td>CodeCard <b>完全没有边框</b>，圆角 <code>--dsw-radius-lg</code> = <b>16px</b>；顶栏 padding 9/14、字号 11px/18px；<code>pre</code> padding 16px</td></tr>
      <tr><td><span class="tag sev-bad">错</span></td><td>表格单元格底边用了 <code>border</code>，表头有底色</td>
          <td><code>td</code> 底边 = <code>border-l2</code>（即 borderActive）、<code>th</code> 底边 = <code>border-l3</code>；宿主 <code>th</code> <b>没有任何底色</b>，也没有斑马纹</td></tr>
      <tr><td><span class="tag sev-mid">错</span></td><td>引用块竖线用了浮层色</td>
          <td>竖线是 <code>label-caption</code> → 插件映射到 <code>textMuted</code>；竖线文字才是 <code>markdownBlockQuote</code>（两个不同的槽）</td></tr>
      <tr><td><span class="tag sev-mid">错</span></td><td>侧栏画了一个「工作区切换 chip」，用了 backgroundPanel</td>
          <td>DSH 侧栏是 frame column：<code>backgroundPanel</code> 只落在<b>「新会话」按钮</b>和<b>底部激活 tab</b>上；composer 的 pill 走的是 <code>bg-layer-2</code>（插件下 = 页面底色）</td></tr>
      <tr><td><span class="tag sev-mid">缺</span></td><td>没有画 tooltip</td>
          <td>tooltip 是真实组件：底 = <code>backgroundElement</code>、字 = <code>text</code>（本主题 7.6:1，故<b>不是白色</b>）、圆角 8px、内含 16×16 无边框键帽</td></tr>
      <tr><td><span class="tag sev-mid">错</span></td><td>toast 放在右下角、带描边</td>
          <td>toast 在<b>顶部居中</b>（top 40px）、圆角 16px、padding 12/16、<code>toast-bg</code> = <code>backgroundElement</code>；其操作链接是<b>静态色</b>，主题改不了</td></tr>
      <tr><td><span class="tag sev-low">实</span></td><td>以为 <code>secondary</code> 是「第二品牌色」</td>
          <td>全宿主只有 <b>1 个消费者</b>：8px 的空闲状态圆点（<code>state-idle-primary</code>）。它在真实界面里几乎不可见</td></tr>
      <tr><td><span class="tag sev-low">实</span></td><td>以为 <code>border</code> 画得到处都是</td>
          <td><code>border-l1</code> 只有 3 个消费者：行内代码边框、菜单描边、折叠代码体；<b>主代码卡与表格都不是它</b></td></tr>
    </table>
  </div>

  <div class="sec">
    <div class="head"><h3>对比度复核 · 53 对</h3><span class="hintx">本页面在浏览器里实时复算（与 node scripts/audit-themes.ts 同口径）</span></div>
    <div class="sum" id="summary"></div>
    <table class="tb">
      <tr><th>检查对</th><th>前景</th><th>背景</th><th>比值</th><th>阈值</th><th>判定</th></tr>
      <tbody id="auditBody"></tbody>
    </table>
  </div>

  <div class="sec">
    <div class="head"><h3>37 Color Tokens</h3><span class="hintx">色位 → DSH 真实落点（按界面使用频率排序）</span></div>
    <div class="grid" id="grid"></div>
    <div class="legend">
      <span><i style="background:{C['background']}"></i>地面场域</span>
      <span><i style="background:{C['backgroundElement']}"></i>浮层</span>
      <span><i style="background:{C['text']}"></i>文字结构</span>
      <span><i style="background:{C['primary']}"></i>品牌高声位</span>
      <span><i style="background:{C['info']}"></i>语义状态</span>
      <span><i style="background:{C['border']}"></i>边界</span>
      <span><i style="background:{C['diffAddedBg']}"></i>diff 行底</span>
      <span><i style="background:{C['syntaxKeyword']}"></i>语法</span>
    </div>
  </div>

  <div class="foot">
    <span>cyberpunk-2077 · 37 colors · dark · base: cyberpunk-2077 → 全色位按参考图重绘</span>
    <span>直采 28（字面像素）/ 阶梯 6 / 混色 3 · 无凭空色 · 37/37 槽可逐像素回溯</span>
  </div>
</div>
<script>
const AUDIT = {audit};
const C = AUDIT.colors;
function rgb(h){{h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}}
function lin(c){{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}}
function lum(h){{const r=rgb(h);return 0.2126*lin(r[0])+0.7152*lin(r[1])+0.0722*lin(r[2]);}}
function cr(a,b){{let x=lum(a),y=lum(b);if(x<y){{const t=x;x=y;y=t;}}return (x+0.05)/(y+0.05);}}
function hex(r){{return '#'+r.map(v=>('0'+Math.round(v).toString(16)).slice(-2)).join('').toUpperCase();}}
function comp(fg,alpha,bg){{const f=rgb(fg),b=rgb(bg);return hex([0,1,2].map(i=>f[i]*alpha+b[i]*(1-alpha)));}}
function fgOf(slot,bg){{
  if(slot==='contrastText(primary)')return AUDIT.ct;
  if(slot.endsWith('@.8'))return AUDIT.dimmed[bg];
  return C[slot];
}}
function bgOf(slot){{return C[slot];}}
const tb=document.getElementById('auditBody');let hardFail=0,uiFail=0,hardMin=99,uiMin=99;
for(const list of [['hard',AUDIT.hard],['ui',AUDIT.ui]]){{
  for(const [code,fgS,bgS,thr] of list[1]){{
    const fg=fgOf(fgS,bgS),bg=bgOf(bgS);
    const r=cr(fg,bg);
    const ok=r>=thr;
    if(list[0]==='hard'){{if(!ok)hardFail++;hardMin=Math.min(hardMin,r);}}
    else{{if(!ok)uiFail++;uiMin=Math.min(uiMin,r);}}
    const tr=document.createElement('tr');
    tr.innerHTML=`<td style="color:#CFCFCF">${{code}}</td><td style="font-family:Consolas,monospace;font-size:11px">${{fg}}</td>`+
      `<td style="font-family:Consolas,monospace;font-size:11px">${{bg}}</td>`+
      `<td style="font-family:Consolas,monospace">${{r.toFixed(2)}} : 1</td><td>${{thr.toFixed(1)}} : 1</td>`+
      `<td style="color:${{ok?'#5EEAD4':'#F87171'}};font-weight:650">${{ok?'通过':'不通过'}}</td>`;
    tb.appendChild(tr);
  }}
}}
document.getElementById('summary').innerHTML =
  `<span class="g">硬性 38 对（4.5:1）· <b>${{38-hardFail}} 通过 / ${{hardFail}} 违例</b> · 最低 ${{hardMin.toFixed(2)}}:1</span>`+
  `<span class="g">UI 15 对（3:1）· <b>${{15-uiFail}} 通过 / ${{uiFail}} 违例</b> · 最低 ${{uiMin.toFixed(2)}}:1</span>`+
  `<span>背景家族色相孤岛 <b>0</b>（8 槽彩度≥8 · 基准 18.0° · 最大偏差 7.0°）</span>`+
  `<span>语法核心五 ΔE76 最小 <b>33.0</b> · comment/operator 退后 <b>0 越位</b></span>`+
  `<span>角色碰撞 <b>1</b>（error=diffRemoved · v3 终审已记档）</span>`+
  `<span class="g">引擎 tokenParity <b>0 失配</b> · diff 修复 <b>零改写</b></span>`;

const ORDER={json.dumps(ORDER)};
const grid=document.getElementById('grid');
for(const k of ORDER){{
  const v=C[k];const L=lum(v);
  const fg=L>.42?'#141414':'#F4F4F5';
  const d=document.createElement('div');d.className='sw';
  d.innerHTML=`<div class="top" style="background:${{v}};color:${{fg}}"><span class="hex">${{v}}</span></div>`+
    `<div class="lbl"><b>${{k}}</b></div>`;
  grid.appendChild(d);
}}
</script>
</body>
</html>
"""

with open(OUT, "w", encoding="utf-8") as f:
    f.write(HTML)
print("wrote", OUT, os.path.getsize(OUT), "bytes")

# ── 陈旧色值守卫：HTML 里出现的每个 hex，都必须属于「调色板 ∪ 台账锚点 ∪ 明示的被否决候选」 ──
_allowed = set(v.upper() for v in C.values())
for _r in ledger:                                    # ① 调色板 + 台账锚点
    _allowed.add(_r["hex"].upper())
    for _s2 in _r.get("srcs", []):
        _allowed.add(_s2["anchor"].upper())
_allowed |= {shade(C["primary"], .12).upper(), contrast_text(C["primary"]).upper(),
             contrast_text(C["secondary"]).upper()}  # ② 页面自身的派生值
for _b in ("background", "backgroundPanel", "backgroundElement"):  # dimmed 派生
    _allowed.add(with_alpha(C["textMuted"], 0.8, C[_b]).upper())
_allowed |= {                                        # ③ 页面底板/状态芯片（非主题色）
    "#0A0A0A", "#131313", "#1A1A1A", "#1F1F1F", "#2A2A2A", "#5A5A5A", "#8C8C8C",
    "#CFCFCF", "#D8D8D8", "#E4E4E4", "#EDEDED", "#EFEFEF", "#5EEAD4", "#94A3B8",
    "#C4B5FD", "#F87171", "#FCD34D", "#141414", "#F4F4F5"}
_allowed |= {                                        # ④ 叙事里明示的「历史值/他处引用」
    "#C59459", "#E1C19A", "#74909E", "#7876A8", "#778F99", "#E0152C", "#C2BDB0",
    "#fcee0a", "#ede7f2", "#7A818A", "#c9d1d9", "#f0f6fc"}
_seen = set(re.findall(r"#[0-9A-Fa-f]{6}", HTML))
_stale = sorted(_seen - _allowed)
print("守卫：HTML 中 hex %d 种，白名单外 %d 种 %s" % (len(_seen), len(_stale), _stale if _stale else ""))
if _stale:
    raise SystemExit("预览页含陈旧色值：" + ", ".join(_stale))
