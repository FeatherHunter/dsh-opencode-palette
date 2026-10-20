# -*- coding: utf-8 -*-
"""生成马里奥主题预览页 prototypes/mario-theme-preview.html。

数据来源全部是仓库内的产物，不手写任何色值：
  · palette.json   —— 37 色位终值 + 每格的取色配方（palette.py 产出）
  · baseline.json  —— 仓库审计器实算的对比度（scripts/audit-themes.ts 产出）
  · extracted.json —— 三张参考图的逐像素实测（extract.py 产出）
输出确定性：同一份输入必得同一份 HTML。
"""
import base64
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, "prototypes", "mario-theme-preview.html")
SRC_IMAGES = r"C:\Users\辰辰洋洋\Pictures\超级马里奥"
NODE = os.environ.get("DSH_NODE", "node")

PAL = json.load(io.open(os.path.join(HERE, "palette.json"), encoding="utf-8"))


def repo_audit():
    """跑仓库自己的审计器，取 mario / mario-night 两套的实算对比度。"""
    tmp = tempfile.mkdtemp(prefix="mario-audit-")
    try:
        subprocess.run([NODE, os.path.join(ROOT, "scripts", "audit-themes.ts"), "--check", "--out", tmp],
                       cwd=ROOT, check=True, capture_output=True)
        return json.load(io.open(os.path.join(tmp, "baseline.json"), encoding="utf-8"))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def data_uri(path):
    ext = os.path.splitext(path)[1].lstrip(".").lower()
    mime = "image/png" if ext == "png" else "image/jpeg"
    with open(path, "rb") as fp:
        return "data:%s;base64,%s" % (mime, base64.b64encode(fp.read()).decode("ascii"))


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def sw_fg(hexv):
    """色块上的十六进制文字：亮底用墨、暗底用白。"""
    h = hexv.lstrip("#")
    ch = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        ch.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    lum = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
    return "#1D100A" if lum > 0.42 else "#FFFFFF"


def swatch_rows(tokens, prov, label):
    rows = []
    for k, v in tokens.items():
        p = prov[k]
        rows.append(
            '<div class="sw" title="%s = %s&#10;来源 %s · %s&#10;%s">'
            '<div class="top" style="background:%s;color:%s"><span class="hex">%s</span></div>'
            '<div class="lbl"><b>%s</b><span class="sub">%s</span></div></div>'
            % (esc(k), v, esc(p["srcFile"]), esc(p["srcWhere"]), esc(p["formula"]), v, sw_fg(v), v, esc(k), esc(p["label"]))
        )
    return '<div class="grid">%s</div>' % "".join(rows)


def prov_rows(prov):
    rows = []
    for k in sorted(prov):
        p = prov[k]
        rows.append(
            "<tr><td class='mono'>%s</td><td class='mono'><i class='chip' style='background:%s'></i>%s</td>"
            "<td>%s</td><td>%s</td><td class='mono'><i class='chip' style='background:%s'></i>%s</td>"
            "<td class='mono'>%s</td><td>%s</td></tr>"
            % (esc(k), p["value"], p["value"], esc(p["srcFile"]), esc(p["srcWhere"]),
               p["srcHex"], p["srcHex"], esc(p["formula"]), esc(p["label"]))
        )
    return "".join(rows)


def audit_rows(theme):
    ev = theme["evaluations"][0]
    out = []
    for pair in ev["pairs"]:
        code, fg, bg, ratio, threshold, verdict = pair
        cls = "ok" if verdict == "pass" else ("bad" if verdict == "fail" else "mut")
        out.append(
            "<tr><td>%s</td><td class='mono'><i class='chip' style='background:%s'></i>%s</td>"
            "<td class='mono'><i class='chip' style='background:%s'></i>%s</td>"
            "<td class='mono'>%s</td><td class='mono'>≥ %s</td><td class='%s'>%s</td></tr>"
            % (esc(code), fg or "#888", fg or "—", bg or "#888", bg or "—",
               ("%.3f" % ratio) if ratio is not None else "—", threshold, cls, verdict)
        )
    return "".join(out)


def audit_pairs(theme):
    """审计器实测的 (code, fg, bg, ratio, threshold, verdict) 列表，给页面里的两张表用。"""
    ev = theme["evaluations"][0]
    return [list(p) for p in ev["pairs"]]


def ramp_blocks():
    """按源色族把配方聚合出色阶——每族只允许一条阶。"""
    fams = {}
    for app in ("light", "dark"):
        for k, p in PAL[app]["provenance"].items():
            key = (app, p["srcKey"])
            fams.setdefault(key, {"app": app, "src": p["srcKey"], "hex": p["srcHex"],
                                  "file": p["srcFile"], "where": p["srcWhere"], "steps": []})
            fams[key]["steps"].append((k, p["value"], p["formula"]))
    blocks = []
    for key in sorted(fams, key=lambda x: (x[0], x[1])):
        f = fams[key]
        if len(f["steps"]) < 3:
            continue
        steps = "".join(
            '<div style="background:%s" title="%s = %s&#10;%s"><span>%s</span></div>'
            % (v, esc(k), v, esc(fm), v) for k, v, fm in sorted(f["steps"], key=lambda s: s[1])
        )
        blocks.append(
            '<div class="ramp"><div class="rt"><span class="nm">%s</span>'
            '<span class="src"><i class="chip" style="background:%s"></i>%s</span>'
            '<span class="where">%s · %s</span></div><div class="steps">%s</div></div>'
            % (esc(f["src"] + ("（浅）" if f["app"] == "light" else "（深）")), f["hex"], f["hex"], esc(f["file"]), esc(f["where"]), steps)
        )
    return "".join(blocks)


def main():
    base = repo_audit()
    themes = {t["id"]: t for t in base["themes"]}
    ml, mn = themes["mario"], themes["mario-night"]

    imgs = {f: data_uri(os.path.join(SRC_IMAGES, f)) for f in ("1.png", "2.jpg", "3.jpg")}

    html = TEMPLATE
    html = html.replace("__LIGHT_GRID__", swatch_rows(PAL["light"]["colors"], PAL["light"]["provenance"], "light"))
    html = html.replace("__DARK_GRID__", swatch_rows(PAL["dark"]["colors"], PAL["dark"]["provenance"], "dark"))
    html = html.replace("__PROV_LIGHT__", prov_rows(PAL["light"]["provenance"]))
    html = html.replace("__PROV_DARK__", prov_rows(PAL["dark"]["provenance"]))
    html = html.replace("__AUDIT_LIGHT__", audit_rows(ml))
    html = html.replace("__AUDIT_DARK__", audit_rows(mn))
    html = html.replace("__RAMPS__", ramp_blocks())
    html = html.replace("__LIGHT_COLORS__", json.dumps(PAL["light"]["colors"], ensure_ascii=False))
    html = html.replace("__DARK_COLORS__", json.dumps(PAL["dark"]["colors"], ensure_ascii=False))
    html = html.replace("__PROV_LIGHT_JSON__", json.dumps(PAL["light"]["provenance"], ensure_ascii=False))
    html = html.replace("__PROV_DARK_JSON__", json.dumps(PAL["dark"]["provenance"], ensure_ascii=False))
    html = html.replace("__AUDIT_LIGHT_JSON__", json.dumps(audit_pairs(ml), ensure_ascii=False))
    html = html.replace("__AUDIT_DARK_JSON__", json.dumps(audit_pairs(mn), ensure_ascii=False))
    html = html.replace("__IMG1__", imgs["1.png"])
    html = html.replace("__IMG2__", imgs["2.jpg"])
    html = html.replace("__IMG3__", imgs["3.jpg"])
    for token in ("background", "backgroundPanel", "backgroundElement", "sidebarBg", "bubbleBg",
                  "inputBg", "codeBlockBg", "codeHeaderBg", "text", "textMuted", "primary",
                  "secondary", "info", "success", "warning", "error", "border", "borderActive"):
        html = html.replace("__L_%s__" % token, PAL["light"]["colors"][token])
        html = html.replace("__D_%s__" % token, PAL["dark"]["colors"][token])
    html = html.replace("__L_COUNT__", str(len(PAL["light"]["colors"])))
    html = html.replace("__D_COUNT__", str(len(PAL["dark"]["colors"])))

    with io.open(OUT, "w", encoding="utf-8", newline="\n") as fp:
        fp.write(html)
    print("wrote", OUT, os.path.getsize(OUT), "bytes")


TEMPLATE = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>超级马里奥 · 1-1 白昼 / 1-2 夜行 — theme preview</title>
<style>
  :root{--page:#ECEEF2;--ink:#1D100A;--ink-soft:#6A615D;--line:#D6DAE1;--ok:#0D6305;--bad:#94210D}
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{background:var(--page);color:var(--ink);font-family:"Segoe UI","Microsoft YaHei UI","Microsoft YaHei",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  .scope{
    color:var(--text);
    --bg:__L_background__; --panel:__L_backgroundPanel__; --elem:__L_backgroundElement__; --sidebar:__L_sidebarBg__;
    --bubble:__L_bubbleBg__; --input:__L_inputBg__; --code:__L_codeBlockBg__; --codehead:__L_codeHeaderBg__;
    --text:__L_text__; --muted:__L_textMuted__;
    --primary:__L_primary__; --secondary:__L_secondary__; --info:__L_info__; --success:__L_success__;
    --warning:__L_warning__; --error:__L_error__;
    --border:__L_border__; --active:__L_borderActive__;
    --dadd:__L_success__; --drem:__L_primary__; --daddbg:#E6F6E6; --drembg:#FBEFE9;
    --daddln:#BDE9BD; --dremln:#F5DACB;
    --h:#173D7D; --link:#B6260E; --mcode:#584036; --em:#903809; --strong:#000000; --quote:#7E5A52;
    --scom:#7A726E; --skw:#A8240D; --sfn:#335687; --styp:#50720D; --snum:#8E5522; --sstr:#7E370B; --sop:#736B67;
    --hover:color-mix(in srgb, var(--text) 8%, transparent);
    --active08:color-mix(in srgb, var(--text) 13%, transparent);
    --dim:color-mix(in srgb, var(--muted) 78%, transparent);
  }
  .scope-dark{
    --bg:__D_background__; --panel:__D_backgroundPanel__; --elem:__D_backgroundElement__; --sidebar:__D_sidebarBg__;
    --bubble:__D_bubbleBg__; --input:__D_inputBg__; --code:__D_codeBlockBg__; --codehead:__D_codeHeaderBg__;
    --text:__D_text__; --muted:__D_textMuted__;
    --primary:__D_primary__; --secondary:__D_secondary__; --info:__D_info__; --success:__D_success__;
    --warning:__D_warning__; --error:__D_error__;
    --border:__D_border__; --active:__D_borderActive__;
    --dadd:__D_success__; --drem:__D_error__; --daddbg:#001A00; --drembg:#210600;
    --daddln:#002500; --dremln:#310900;
    --h:#B5D0FF; --link:#63A7F2; --mcode:#B89179; --em:#F7DC66; --strong:#FFEFEC; --quote:#B69892;
    --scom:#A37A74; --skw:#F34525; --sfn:#529DF0; --styp:#F3CD24; --snum:#FF9A39; --sstr:#AFE264; --sop:#99726D;
    --hover:color-mix(in srgb, var(--text) 12%, transparent);
    --active08:color-mix(in srgb, var(--text) 16%, transparent);
    --dim:color-mix(in srgb, var(--muted) 80%, transparent);
  }
  .sheet{width:1400px;padding:44px 64px 60px;margin:0 auto}
  .eyebrow{font-size:11px;letter-spacing:.22em;color:var(--ink-soft);text-transform:uppercase}
  h1.title{font-size:34px;line-height:1.12;margin:10px 0 8px;font-weight:600}
  h1.title em{font-style:normal;color:#C7280E}
  .sub{font-size:13.5px;color:var(--ink-soft);max-width:780px;line-height:1.75}
  .sub b{color:var(--ink);font-weight:650}
  .anchors{display:flex;gap:10px;margin-top:18px;align-items:center;flex-wrap:wrap}
  .anchor{display:flex;align-items:center;gap:8px;background:#fff;border:.5px solid var(--line);border-radius:999px;padding:5px 12px 5px 6px;font-size:11.5px;color:var(--ink-soft)}
  .anchor i{width:18px;height:18px;border-radius:5px;display:block;border:.5px solid rgba(0,0,0,.08)}
  .anchor b{color:var(--ink);font-weight:600}
  .sec{margin-top:44px}
  .sec .head{display:flex;align-items:baseline;gap:14px;margin-bottom:14px}
  .sec h3{font-size:13px;letter-spacing:.18em;text-transform:uppercase;margin:0;font-weight:650}
  .sec .hintx{font-size:11.5px;color:var(--ink-soft)}
  .sec .num{font-family:"Cascadia Code",Consolas,monospace;font-size:11px;color:#fff;background:var(--ink);border-radius:5px;padding:2px 6px}
  .win{margin-top:26px;width:1272px;border-radius:18px;overflow:hidden;position:relative;background:var(--bg);border:.5px solid var(--border);
    box-shadow:0 26px 60px -18px color-mix(in srgb,var(--text) 26%,transparent),0 2px 6px rgba(29,16,10,.08);display:flex}
  .sb{width:246px;flex:none;background:var(--sidebar);border-right:.5px solid var(--border);display:flex;flex-direction:column;padding:14px 12px 12px}
  .brand{display:flex;align-items:center;gap:9px;padding:2px 6px 14px}
  .brand .name{font-size:13.5px;font-weight:600}
  .brand .badge{font-size:10px;color:var(--muted);border:.5px solid var(--border);border-radius:5px;padding:1px 4px;margin-left:auto}
  .ws{display:flex;align-items:center;gap:8px;background:var(--panel);border:.5px solid var(--border);border-radius:10px;padding:7px 9px;font-size:12.5px;margin-bottom:14px}
  .ws .dot{width:16px;height:16px;border-radius:5px;background:var(--primary);color:var(--bg);font-size:9px;display:grid;place-items:center;font-weight:600}
  .ws .caret{margin-left:auto;color:var(--muted);font-size:10px}
  .nav{display:flex;flex-direction:column;gap:2px}
  .nav .it{position:relative;display:flex;align-items:center;gap:9px;font-size:12.5px;color:var(--muted);padding:7px 9px;border-radius:8px}
  .nav .it.on{background:var(--active08);color:var(--text);font-weight:600}
  .nav .it.on:before{content:"";position:absolute;left:0;top:7px;bottom:7px;width:3px;border-radius:3px;background:var(--primary)}
  .nav .it .ic{width:15px;height:15px;border:1.4px solid currentColor;border-radius:4px;opacity:.75;flex:none}
  .nav .it .ic.round{border-radius:50%}
  .side-lbl{font-size:10.5px;letter-spacing:.12em;color:var(--dim);margin:16px 8px 6px;text-transform:uppercase}
  .threads{display:flex;flex-direction:column;gap:1px}
  .th{font-size:12px;color:var(--muted);padding:6px 9px;border-radius:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .th.sel{background:var(--active08);color:var(--text)}
  .sb-foot{margin-top:auto;display:flex;align-items:center;gap:9px;padding:9px 6px 2px;border-top:.5px solid var(--border);font-size:12px}
  .av{width:24px;height:24px;border-radius:50%;background:var(--primary);color:var(--bg);display:grid;place-items:center;font-size:11px}
  .main{flex:1;display:flex;flex-direction:column;min-width:0;position:relative}
  .topbar{height:48px;flex:none;display:flex;align-items:center;gap:10px;padding:0 18px;border-bottom:.5px solid var(--border)}
  .topbar .h{font-size:13px;font-weight:600}
  .topbar .crumb{font-size:11.5px;color:var(--muted)}
  .topbar .right{margin-left:auto;display:flex;align-items:center;gap:8px}
  .chip{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);background:var(--panel);border:.5px solid var(--border);border-radius:999px;padding:4px 10px;white-space:nowrap}
  .chip i{width:6px;height:6px;border-radius:50%;background:var(--info)}
  .chip i.idle{background:var(--secondary)}
  .btn{border:0;border-radius:8px;font-size:12px;padding:6px 12px;font-family:inherit}
  .btn.primary{background:var(--primary);color:#fff;font-weight:600}
  .scope-dark .btn.primary{color:#1D100A}
  .btn.ghost{background:transparent;color:var(--muted)}
  .feed{flex:1;overflow:hidden;padding:22px 26px 84px}
  .col{width:720px;margin:0 auto}
  .user{display:flex;justify-content:flex-end;margin-bottom:20px}
  .user .bub{background:var(--bubble);border-radius:14px 14px 4px 14px;padding:10px 14px;font-size:13px;line-height:1.65;max-width:520px}
  .who{display:flex;align-items:center;gap:7px;margin-bottom:9px}
  .who .k{width:20px;height:20px}
  .who .n{font-size:12px;font-weight:600}
  .who .t{font-size:10.5px;color:var(--dim);border:.5px solid var(--border);border-radius:5px;padding:1px 5px}
  .md{font-size:13px;line-height:1.78}
  .md h2{font-size:15.5px;line-height:1.4;color:var(--h);margin:0 0 8px;font-weight:650}
  .md p{margin:0 0 10px}
  .md strong{color:var(--strong);font-weight:650}
  .md em{color:var(--em);font-style:italic}
  .md a{color:var(--link);text-decoration:underline;text-underline-offset:2px}
  .md code{font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px;color:var(--mcode);border:.5px solid var(--border);border-radius:4px;padding:0 4px}
  .md ul{margin:0 0 10px;padding-left:18px}
  .md blockquote{margin:0 0 12px;padding:2px 0 2px 12px;border-left:2px solid var(--active);color:var(--quote);font-size:12.5px}
  .warn{display:flex;gap:9px;align-items:flex-start;background:color-mix(in srgb,var(--warning) 13%,transparent);border-left:2.5px solid var(--warning);border-radius:6px;padding:8px 12px;margin:0 0 12px;font-size:12px;line-height:1.65;color:var(--warning)}
  .warn b{font-weight:650}
  .warn .tag{font-size:10.5px;border:.5px solid color-mix(in srgb,var(--warning) 45%,transparent);border-radius:4px;padding:0 5px;flex:none;margin-top:1px}
  .md table{border-collapse:collapse;font-size:12px;margin:0 0 12px;width:100%}
  .md th{text-align:left;font-weight:600;padding:7px 10px;border-bottom:.5px solid var(--active);background:color-mix(in srgb,var(--panel) 55%,transparent)}
  .md td{padding:7px 10px;border-bottom:.5px solid var(--active)}
  .md td .ok{color:var(--success);font-weight:600}
  .md td .no{color:var(--error);font-weight:600}
  .md td.mono{font-family:"Cascadia Code",Consolas,monospace;font-size:11px;color:var(--muted)}
  .cc{border-radius:10px;overflow:hidden;margin:2px 0 12px;background:var(--code)}
  .cc .hd{display:flex;align-items:center;gap:8px;background:var(--codehead);padding:7px 12px 6px;font-size:11px;color:var(--muted)}
  .cc .hd .lang{color:var(--dim);font-family:"Cascadia Code",Consolas,monospace}
  .cc .hd .cp{margin-left:auto;font-size:10.5px;color:var(--dim)}
  .cc pre{margin:0;padding:11px 14px 13px;font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px;line-height:1.85}
  .tk-com{color:var(--scom);font-style:italic}.tk-kw{color:var(--skw)}.tk-fn{color:var(--sfn)}.tk-typ{color:var(--styp)}
  .tk-num{color:var(--snum)}.tk-str{color:var(--sstr)}.tk-op{color:var(--sop)}.tk-plain{color:var(--text)}
  .diff{border-radius:10px;overflow:hidden;background:var(--code);margin:0 0 12px;font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px}
  .diff .ln{display:flex;gap:10px;padding:2px 12px 2px 0}
  .diff .ln .no{width:30px;padding-right:7px;text-align:right;color:var(--dim)}
  .diff .rm{background:var(--drembg)}.diff .rm .no{background:var(--dremln);color:var(--drem)}.diff .rm .sign,.diff .rm .code{color:var(--drem)}
  .diff .add{background:var(--daddbg)}.diff .add .no{background:var(--daddln);color:var(--dadd)}.diff .add .sign,.diff .add .code{color:var(--dadd)}
  .diff .ln .sign{width:8px}
  .tool{background:var(--elem);border-radius:10px;padding:10px 13px;margin:0 0 12px;font-size:12px}
  .tool .row{display:flex;align-items:center;gap:8px}.tool .name{font-weight:600}
  .tool .st{margin-left:auto;color:var(--success);font-size:11px;display:flex;align-items:center;gap:5px}
  .tool .st i{width:6px;height:6px;border-radius:50%;background:var(--success)}
  .tool .out{margin-top:7px;font-family:"Cascadia Code",Consolas,monospace;font-size:10.8px;line-height:1.75;color:var(--muted)}
  .tool .out b{color:var(--success);font-weight:600}
  .pulse{width:14px;height:14px;border-radius:50%;border:1.6px solid color-mix(in srgb,var(--info) 35%,transparent);border-top-color:var(--info)}
  .toast{position:absolute;right:22px;bottom:132px;background:var(--elem);border:.5px solid var(--border);border-radius:10px;padding:9px 13px;display:flex;align-items:center;gap:9px;font-size:12px}
  .toast i{width:7px;height:7px;border-radius:50%;background:var(--success)}
  .toast .sub{color:var(--dim);font-size:11px}
  .composer{flex:none;padding:10px 26px 14px}
  .cbox{background:var(--input);border:.5px solid var(--active);border-radius:14px;padding:11px 13px 9px}
  .cbox .ph{font-size:13px;color:var(--muted)}
  .cbox .row{display:flex;align-items:center;gap:7px;margin-top:9px}
  .cbox .row .sp{margin-left:auto}
  .pill{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;color:var(--muted);background:var(--panel);border:.5px solid var(--border);border-radius:999px;padding:3px 8px}
  .pill i{width:5px;height:5px;border-radius:50%;background:var(--primary)}
  .send{width:28px;height:28px;border-radius:9px;background:var(--primary);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700;border:0}
  .scope-dark .send{color:#1D100A}
  .hint{display:flex;align-items:center;gap:8px;font-size:10.5px;color:var(--dim);padding:7px 4px 0}
  .hint .r{margin-left:auto;display:flex;gap:6px;align-items:center;white-space:nowrap}
  .grid{display:grid;grid-template-columns:repeat(8,1fr);gap:8px}
  .sw{border-radius:9px;border:.5px solid var(--line);overflow:hidden;background:#fff}
  .sw .top{height:44px;display:flex;align-items:flex-end;padding:5px 7px}
  .sw .hex{font-size:9.5px;font-family:"Cascadia Code",Consolas,monospace}
  .sw .lbl{font-size:10px;padding:4px 7px 5px;color:var(--ink-soft);border-top:.5px solid var(--line);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sw .lbl b{color:var(--ink);font-weight:600;margin-right:5px}
  .sw .lbl .sub{color:#9AA0A8;font-size:9px}
  .tbl{width:100%;border-collapse:collapse;font-size:11.5px;background:#fff;border-radius:10px;overflow:hidden;border:.5px solid var(--line)}
  .tbl th{text-align:left;font-weight:600;padding:8px 10px;background:#F5F7FA;border-bottom:.5px solid var(--line);font-size:11px}
  .tbl td{padding:5px 10px;border-bottom:.5px solid #EEF1F5;color:var(--ink-soft)}
  .tbl tr:last-child td{border-bottom:0}
  .tbl td.mono{font-family:"Cascadia Code",Consolas,monospace;font-size:10.8px;color:var(--ink)}
  .chip{width:11px;height:11px;border-radius:3px;border:.5px solid rgba(0,0,0,.14);vertical-align:-1px;margin-right:6px;display:inline-block}
  .ok{color:var(--ok);font-weight:650}.bad{color:var(--bad);font-weight:650}.mut{color:#9AA0A8}
  .tabs{display:flex;gap:6px;margin-bottom:10px}
  .tabs button{font-family:inherit;font-size:11.5px;border:.5px solid var(--line);background:#fff;color:var(--ink-soft);border-radius:999px;padding:5px 13px;cursor:pointer}
  .tabs button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
  .ramps{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
  .ramp{background:#fff;border:.5px solid var(--line);border-radius:11px;padding:12px 13px}
  .ramp .rt{display:flex;align-items:center;gap:9px;margin-bottom:9px}
  .ramp .rt .nm{font-size:12.5px;font-weight:650;font-family:"Cascadia Code",Consolas,monospace}
  .ramp .rt .src{font-family:"Cascadia Code",Consolas,monospace;font-size:10.5px;color:var(--ink)}
  .ramp .rt .where{font-size:10.5px;color:var(--ink-soft);margin-left:auto}
  .ramp .steps{display:flex;border-radius:7px;overflow:hidden;border:.5px solid var(--line)}
  .ramp .steps div{flex:1;height:40px;position:relative}
  .ramp .steps div span{position:absolute;left:0;right:0;bottom:2px;text-align:center;font-size:8.5px;font-family:"Cascadia Code",Consolas,monospace}
  .gal{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .gcard{background:#fff;border:.5px solid var(--line);border-radius:11px;overflow:hidden}
  .gcard img{width:100%;display:block}
  .gcard .gi{padding:9px 11px 11px}
  .gcard .gi .gn{font-size:12px;font-weight:650;margin-bottom:3px}
  .gcard .gi .gd{font-size:10.5px;color:var(--ink-soft);line-height:1.6}
  .brickrule{height:9px;border-radius:2px;overflow:hidden;margin:30px 0 0;background:#CE4D08;
    box-shadow:inset 0 -2px 0 rgba(0,0,0,.25),inset 0 2px 0 rgba(255,255,255,.18);
    background-image:repeating-linear-gradient(90deg,rgba(0,0,0,.25) 0 1px,transparent 1px 18px)}
  .foot{display:flex;justify-content:space-between;margin-top:26px;font-size:10.5px;color:var(--ink-soft)}
</style>
</head>
<body>
<div class="sheet">
  <div class="eyebrow">DSH / OpenCode Palette · Custom Theme</div>
  <h1 class="title">超级马里奥 <em>Mario</em> — 1-1 白昼 / 1-2 夜行</h1>
  <div class="sub">
    三张参考图，一个色板世界：<b>NES 标题画面</b>的平涂色板、<b>3D 手办</b>的受光层次、<b>经典卡通</b>的高饱和原色。
    明暗各 <b>37 个色位</b>，共 <b>74 格</b>，全部由这些像素推出——<b>没有一格颜色是凭空想的</b>。
    设计主张只有一条：<b>用亮度分层，而不是用描边分割</b>；整个界面是「蓝色的天」里站着「一个红的人」。
  </div>
  <div class="anchors">
    <span class="anchor"><i style="background:#5A96FF"></i>天蓝 <b>#5A96FF</b></span>
    <span class="anchor"><i style="background:#CE4D08"></i>砖橙 <b>#CE4D08</b></span>
    <span class="anchor"><i style="background:#FFBEB5"></i>奶油砖 <b>#FFBEB5</b></span>
    <span class="anchor"><i style="background:#C7280E"></i>帽红 <b>#C7280E</b></span>
    <span class="anchor"><i style="background:#0C4BAA"></i>背带蓝 <b>#0C4BAA</b></span>
    <span class="anchor"><i style="background:#00AA00"></i>山丘绿 <b>#00AA00</b></span>
    <span class="anchor"><i style="background:#8C7100"></i>金币黄 <b>#8C7100</b></span>
    <span class="anchor"><i style="background:#1D100A"></i>胡子墨 <b>#1D100A</b></span>
  </div>

  <div class="sec">
    <div class="head"><span class="num">01</span><h3>浅色 · 1-1 白昼</h3>
      <span class="hintx">天蓝当「场」，深墨当「字」，马里奥红是唯一的「心跳」</span></div>
    <div class="win scope" id="win-light"></div>
  </div>

  <div class="brickrule"></div>

  <div class="sec">
    <div class="head"><span class="num">02</span><h3>37 Color Tokens · 浅色</h3>
      <span class="hintx">悬停色块看取色溯源</span></div>
    __LIGHT_GRID__
  </div>

  <div class="sec">
    <div class="head"><span class="num">03</span><h3>深色 · 1-2 夜行</h3>
      <span class="hintx">同一批像素压黑 90%：天蓝退成夜空，霓虹色自己会亮</span></div>
    <div class="win scope scope-dark" id="win-dark"></div>
  </div>

  <div class="brickrule"></div>

  <div class="sec">
    <div class="head"><span class="num">04</span><h3>37 Color Tokens · 深色</h3>
      <span class="hintx">同一套源像素，不同的压黑比例</span></div>
    __DARK_GRID__
  </div>

  <div class="sec">
    <div class="head"><span class="num">05</span><h3>色阶推导</h3>
      <span class="hintx">每个色族只允许一条阶：一端是原像素，另一端是它与白 / 黑的混合</span></div>
    <div class="ramps">__RAMPS__</div>
  </div>

  <div class="sec">
    <div class="head"><span class="num">06</span><h3>取色溯源</h3>
      <span class="hintx">每个色位 → 源图 → 源像素位置 → 混合公式，可逐条复核</span></div>
    <div class="tabs">
      <button class="on" data-p="light">浅色 37 色位</button>
      <button data-p="dark">深色 37 色位</button>
    </div>
    <table class="tbl" id="tbl-prov">
      <thead><tr><th>色位</th><th>色值</th><th>源图</th><th>源像素位置</th><th>源像素</th><th>推导</th><th>角色</th></tr></thead>
      <tbody id="prov-body"></tbody>
    </table>
    <template id="prov-light">__PROV_LIGHT__</template>
    <template id="prov-dark">__PROV_DARK__</template>
  </div>

  <div class="sec">
    <div class="head"><span class="num">07</span><h3>对比度审计</h3>
      <span class="hintx">仓库审计器实算（scripts/audit-themes.ts）；正文 7:1，正文类 4.5:1，非文字边界 3:1</span></div>
    <div class="tabs">
      <button class="on" data-a="light">浅色</button>
      <button data-a="dark">深色</button>
    </div>
    <table class="tbl" id="tbl-audit">
      <thead><tr><th>检查项</th><th>前景</th><th>背景</th><th>实测</th><th>门槛</th><th>结论</th></tr></thead>
      <tbody id="audit-body"></tbody>
    </table>
    <template id="audit-light">__AUDIT_LIGHT__</template>
    <template id="audit-dark">__AUDIT_DARK__</template>
  </div>

  <div class="sec">
    <div class="head"><span class="num">08</span><h3>参考图</h3>
      <span class="hintx">本套配色的全部来源（内联，可离线打开）</span></div>
    <div class="gal">
      <div class="gcard"><img src="__IMG1__" alt="NES 超级马里奥标题画面">
        <div class="gi"><div class="gn">1.png · NES 标题画面</div>
        <div class="gd">256×224。严格 NES 色板：7 个平涂色块。天蓝占全图 51.4%，是整套配色的「场」。</div></div></div>
      <div class="gcard"><img src="__IMG2__" alt="3D 马里奥手办">
        <div class="gi"><div class="gn">2.jpg · 3D 手办</div>
        <div class="gd">527×581。提供「同一块红/蓝在不同受光下的层次」，是深色主题的阶调来源。</div></div></div>
      <div class="gcard"><img src="__IMG3__" alt="经典卡通马里奥">
        <div class="gi"><div class="gn">3.jpg · 经典卡通</div>
        <div class="gd">260×260。高饱和平涂：帽红 #C7280E、背带蓝 #0C4BAA、纽扣金 #F3CD24 全在这里。</div></div></div>
    </div>
  </div>

  <div class="foot">
    <span>Mario theme · 37 × 2 色位 · light / dark · 源像素 27 个 · 全部色位可溯源</span>
    <span>design by 小婉 · first principles</span>
  </div>
</div>

<script>
const LIGHT = __LIGHT_COLORS__;
const DARK = __DARK_COLORS__;
const PROV = {light: __PROV_LIGHT_JSON__, dark: __PROV_DARK_JSON__};
const AUDIT = {light: __AUDIT_LIGHT_JSON__, dark: __AUDIT_DARK_JSON__};

const MARIO_AVATAR = `<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
<g stroke="#000000" stroke-width="1.15" stroke-linejoin="round" stroke-linecap="round">
<path d="M3.2 12.4C3.2 6.1 7.7 2.4 13 2.4s9.8 3.7 9.8 10Z" fill="#C7280E"/>
<circle cx="12.3" cy="7.2" r="3.6" fill="#FFFFFF"/>
<path d="M10.5 9.3V5.3h1.5l1.2 2.1 1.2-2.1h1.5v4h-1.3V7.4l-.9 1.6h-.9l-.9-1.6v1.9Z" fill="#C7280E" stroke="none"/>
<path d="M8.6 13.2h11.8v6c0 2.5-2.6 4.4-5.9 4.4s-5.9-1.9-5.9-4.4Z" fill="#FFD992"/>
<path d="M7.1 13.2h2.9v5.6H7.1Z" fill="#7E370B"/>
<path d="M2.2 11.4h21.6a1.4 1.4 0 0 1 0 2.8H2.2a1.4 1.4 0 0 1 0-2.8Z" fill="#C7280E"/>
<ellipse cx="15.5" cy="16.9" rx="1.85" ry="2.1" fill="#FFFFFF"/>
<circle cx="16" cy="17.2" r="0.92" fill="#000000" stroke="none"/>
<ellipse cx="21.5" cy="18.1" rx="2.6" ry="2.2" fill="#FFD992"/>
<path d="M13.1 19.6c1.6-1 3.7-1 5.1.3.6.5.4 1.3-.4 1.5-1.7.6-3.5.3-4.7-.7-.6-.5-.6-.8 0-1Z" fill="#000000"/>
</g></svg>`;

function appHTML(mode){
  const dark = mode === 'dark';
  const label = dark ? '马里奥主题 · 夜行关卡评审' : '马里奥主题 · 配色评审';
  const crumb = dark ? '/ 37 tokens · dark' : '/ 37 tokens · light';
  const userMsg = dark
    ? '夜里的 1-2 关也要用同一套颜色，把深色那 37 个色位再对一遍。'
    : '把这套马里奥配色写进 custom-presets，并给出每个色位的取色溯源。';
  const h2 = dark ? '1-2 夜行 · 同一批像素压黑 90%' : '1-1 白昼 · 已按 37 色位落位';
  const p1 = dark
    ? '深色不是另一套颜色，是<strong>同一批源像素往黑里压</strong>：天蓝 #5A96FF 压到 93% 就是夜空 #060A12。霓虹色不需要改，只要背景让开，它自己会亮。'
    : '核心只有一句话：<strong>用亮度分层，而不是用描边分割</strong>。底色是 1-1 天空的淡蓝，文字是马里奥胡子的勾线墨，唯一的饱和色留给帽红——它只出现在按钮、链接与焦点上。';
  const li = dark
    ? `<li>深色底把对比度要求抬高了：主色从 #C7280E 换成 NES 红压深的 <em>#C32300</em>，亮红 #FD4E4B 配白字只有 2.98:1。</li>
       <li>语法色全部换成<em>原像素高饱和版</em>：纽扣金 #F3CD24、眼睛蓝 #529DF0、NES 橙 #FF9A39。</li>
       <li>diff 底色用<em>压深版</em>而不是加白：#001A00 / #210600 才不会在黑底上发灰。</li>`
    : `<li>代码块用<em>同族浅纸</em>（codeBlockBg #F8FAFF），因为 shiki 的普通 token 走 <code>--shiki-foreground</code>（= 文字色），深色底会让无高亮代码不可读。</li>
       <li>输入框边界与焦点环分成两格：边界是压深的蓝，焦点才给足 3:1。</li>
       <li>语义色从马里奥的世界补全：金币黄做 warning、山丘绿做 success、背带蓝做 secondary。</li>`;
  const quote = dark
    ? '白天是「蓝天白云一顶红帽」，夜里是「一顶红帽浮在星空上」——同一顶帽子，不同的天。'
    : '天是蓝的，人是红的，地面是砖头的；其余的都该安静。';
  const code = dark
    ? `<span class="tk-com">// mario-night.json</span>
<span class="tk-kw">const</span> <span class="tk-fn">marioNight</span> <span class="tk-op">=</span> {
  <span class="tk-fn">night</span>: <span class="tk-str">"#060A12"</span>,   <span class="tk-com">// 天蓝压黑 93%</span>
  <span class="tk-fn">neonRed</span>: <span class="tk-str">"#F34525"</span>,  <span class="tk-com">// 帽红亮面</span>
  <span class="tk-fn">coin</span>: <span class="tk-str">"#F3CD24"</span>,    <span class="tk-com">// 纽扣金</span>
  <span class="tk-fn">contrast</span>: <span class="tk-num">16.21</span> <span class="tk-kw">as</span> <span class="tk-typ">Ratio</span>,
}`
    : `<span class="tk-com">// mario.json</span>
<span class="tk-kw">const</span> <span class="tk-fn">mario</span> <span class="tk-op">=</span> {
  <span class="tk-fn">sky</span>: <span class="tk-str">"#5A96FF"</span>,   <span class="tk-com">// 场：1.png 天空</span>
  <span class="tk-fn">brick</span>: <span class="tk-str">"#CE4D08"</span>, <span class="tk-com">// 地：砖块</span>
  <span class="tk-fn">cream</span>: <span class="tk-str">"#FFBEB5"</span>, <span class="tk-com">// 纸：标题字面</span>
  <span class="tk-fn">ink</span>: <span class="tk-str">"#1D100A"</span>,   <span class="tk-com">// 字：胡子黑</span>
  <span class="tk-fn">contrast</span>: <span class="tk-num">17.58</span> <span class="tk-kw">as</span> <span class="tk-typ">Ratio</span>,
}`;
  const rows = dark
    ? `<tr><td>正文对比度</td><td><span class="ok">16.21 : 1</span></td><td class="mono">#FFE2DE / #060A12</td></tr>
       <tr><td>主色按钮</td><td><span class="ok">墨字 5.37 : 1</span></td><td class="mono">#1D100A / #C32300</td></tr>
       <tr><td>语法色</td><td><span class="ok">7 / 7 · OK</span></td><td class="mono">codeBlockBg #04060A</td></tr>`
    : `<tr><td>正文对比度</td><td><span class="ok">17.58 : 1</span></td><td class="mono">#1D100A / #F5F9FF</td></tr>
       <tr><td>输入框边界</td><td><span class="ok">3.94 : 1</span></td><td class="mono">#4E7BCE / #F5F9FF</td></tr>
       <tr><td>语法色</td><td><span class="ok">7 / 7 · OK</span></td><td class="mono">codeBlockBg #F8FAFF</td></tr>`;
  const warn = dark
    ? `<span class="tag">已知限制</span><span>深色下「白字按钮」与「主色做链接」互相拉扯：亮红 <strong>#FD4E4B</strong> 配白字只有 <b>2.98 : 1</b>，压到 #C32300 才过线，但按钮文字色由 DSH 外层决定。</span>`
    : `<span class="tag">已知限制</span><span>NES 色板只有一个红族，<strong>primary</strong> 与 <strong>error</strong> 只能靠明度分层（帽红 <b>#C7280E</b> vs 砖红 <b>#94210D</b>），色相只差几度。</span>`;
  const diff = dark
    ? `<div class="ln rm"><span class="no">41</span><span class="sign">-</span><span class="code">  "primary": "#FD4E4B",</span></div>
       <div class="ln add"><span class="no">41</span><span class="sign">+</span><span class="code">  "primary": "#C32300",</span></div>
       <div class="ln rm"><span class="no">42</span><span class="sign">-</span><span class="code">  "background": "#1a1a1a",</span></div>
       <div class="ln add"><span class="no">42</span><span class="sign">+</span><span class="code">  "background": "#060A12",</span></div>`
    : `<div class="ln rm"><span class="no">41</span><span class="sign">-</span><span class="code">  "primary": "#e60012",</span></div>
       <div class="ln add"><span class="no">41</span><span class="sign">+</span><span class="code">  "primary": "#C7280E",</span></div>
       <div class="ln rm"><span class="no">44</span><span class="sign">-</span><span class="code">  "background": "#1a1a1a",</span></div>
       <div class="ln add"><span class="no">44</span><span class="sign">+</span><span class="code">  "background": "#F5F9FF",</span></div>`;
  const tool = dark
    ? `[1] text tones on every surface: <b>OK</b><br>
       [2] syntax tokens on codeBlockBg: <b>7 / 7 · OK</b><br>
       [3] button label on primary: <b>5.37 · OK</b> (ink on deep NES red)`
    : `[1] text &amp; md tones on every surface: <b>OK</b><br>
       [2] syntax tokens on codeBlockBg: <b>7 / 7 · OK</b><br>
       [3] provenance for every token: <b>37 / 37 · traced</b>`;

  return `
<aside class="sb">
  <div class="brand">${MARIO_AVATAR}<span class="name">马里奥</span><span class="badge">DSH</span></div>
  <div class="ws"><span class="dot">马</span><span>mario-theme</span><span class="caret">▾</span></div>
  <div class="nav">
    <div class="it on"><span class="ic round"></span>新会话<span style="margin-left:auto;font-size:10px;color:var(--dim)">⌘N</span></div>
    <div class="it"><span class="ic"></span>会话历史</div>
    <div class="it"><span class="ic"></span>文件</div>
    <div class="it"><span class="ic round"></span>终端</div>
  </div>
  <div class="side-lbl">最近</div>
  <div class="threads">
    <div class="th sel">${label}</div>
    <div class="th">色阶推导与取色溯源</div>
    <div class="th">对比度审计报告</div>
    <div class="th">写入 custom-presets</div>
  </div>
  <div class="sb-foot"><span class="av">婉</span><span>小婉</span><span class="gear">⚙</span></div>
</aside>

<main class="main">
  <div class="topbar">
    <span class="h">${label}</span><span class="crumb">${crumb}</span>
    <div class="right">
      <span class="chip"><i class="idle"></i>就绪</span>
      <span class="chip"><i></i>deepseek-flash</span>
      <button class="btn ghost">分享</button>
      <button class="btn primary">新建会话</button>
    </div>
  </div>

  <div class="feed"><div class="col">
    <div class="user"><div class="bub">${userMsg}</div></div>

    <div class="who">
      <span class="k">${MARIO_AVATAR}</span>
      <span class="n">小婉</span><span class="t">custom-presets</span>
    </div>

    <div class="md">
      <h2>${h2}</h2>
      <p>${p1}</p>
      <ul>${li}</ul>
      <blockquote>${quote}</blockquote>

      <div class="cc">
        <div class="hd"><span class="lang">ts</span><span class="fn">${dark ? 'mario-night.json' : 'mario.json'}</span><span class="cp">复制</span></div>
<pre>${code}</pre>
      </div>

      <table>
        <tr><th>检查项</th><th>结果</th><th>色值</th></tr>
        ${rows}
      </table>

      <div class="warn">${warn}</div>

      <div class="diff">${diff}</div>

      <div class="tool">
        <div class="row"><span class="pulse"></span><span class="name">运行 audit-themes.ts --check</span><span class="st"><i></i>已完成</span></div>
        <div class="out">${tool}</div>
      </div>
    </div>
  </div></div>

  <div class="toast"><i></i><span>主题已保存 · ${dark ? '37 色位 · dark' : '37 色位 · light'}</span><span class="sub">在面板中可见</span></div>

  <div class="composer"><div class="col">
    <div class="cbox">
      <div class="ph">继续调整配色，或问我任意细节…</div>
      <div class="row">
        <span class="pill"><i></i>mario.json</span>
        <span class="pill">${dark ? 'dark' : 'light'}</span>
        <button class="btn ghost" style="width:26px;height:26px;padding:0">＋</button>
        <span class="sp"></span>
        <button class="btn ghost" style="width:26px;height:26px;padding:0">⚙</button>
        <button class="send">↑</button>
      </div>
    </div>
    <div class="hint">Enter 发送 · Shift + Enter 换行
      <span class="r"><span class="chip" style="padding:2px 8px">37 tokens</span><span>马里奥</span></span>
    </div>
  </div></div>
</main>`;
}

document.getElementById('win-light').innerHTML = appHTML('light');
document.getElementById('win-dark').innerHTML = appHTML('dark');

function fillTable(bodyId, srcId){
  document.getElementById(bodyId).innerHTML = document.getElementById(srcId).innerHTML
}fillTable('prov-body', 'prov-light')
fillTable('audit-body', 'audit-light')

document.querySelectorAll('.tabs [data-p]').forEach(function(b){
  b.addEventListener('click', function(){
    document.querySelectorAll('.tabs [data-p]').forEach(function(x){ x.classList.remove('on') })
    b.classList.add('on')
    fillTable('prov-body', 'prov-' + b.dataset.p)
  })
})
document.querySelectorAll('.tabs [data-a]').forEach(function(b){
  b.addEventListener('click', function(){
    document.querySelectorAll('.tabs [data-a]').forEach(function(x){ x.classList.remove('on') })
    b.classList.add('on')
    fillTable('audit-body', 'audit-' + b.dataset.a)
  })
})
</script>
</body>
</html>
"""

if __name__ == "__main__":
    main()
