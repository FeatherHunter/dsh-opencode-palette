# -*- coding: utf-8 -*-
"""生成「颜色轴 222 个 token」逐条清单（JSON + HTML）。

数据源：宿主源码 sparse checkout（默认 D:\\Temp\\dsh-src，@687f282）。
- 声明位置：packages/client/ui-theme/src/styles/*.css
- 消费方：packages/client、apps 下的 .css/.tsx/.ts 里 var(--x) / getPropertyValue('--x')
输出：
- docs/research/v3-color-token-catalog.json
- docs/research/v3-color-tokens-222-catalog.html
"""
import json
import os
import re
from collections import OrderedDict, defaultdict

SRC = os.environ.get("DSH_SRC", r"D:\Temp\dsh-src")
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STYLES = os.path.join(SRC, "packages", "client", "ui-theme", "src", "styles")
OUT_JSON = os.path.join(ROOT, "docs", "research", "v3-color-token-catalog.json")
OUT_HTML = os.path.join(ROOT, "docs", "research", "v3-color-tokens-222-catalog.html")

# ---------- 222 的口径（与 docs/research/color-axis-token-inventory.md 一致） ----------
def is_color_token(name: str) -> bool:
    prefixes = (
        "--dsw-alias-", "--dsw-specific-", "--dsw-static-",
        "--dsw-shadow-", "--dsw-elevation-", "--dsw-gradient-", "--dsw-linear-",
        "--shiki-",
    )
    if name in ("--dsw-focus-ring-color", "--dsw-menu-surface-fill"):
        return True
    return name.startswith(prefixes)

DEAD = set("""
--dsw-alias-bg-multi-select
--dsw-alias-border-inverted2
--dsw-alias-brand-primary-invert
--dsw-alias-brand-text
--dsw-alias-button-ghost-active-hover
--dsw-alias-button-primary-dimmed
--dsw-alias-button-tool-bar-fill-invisible
--dsw-alias-interactive-bg-hover-accent
--dsw-alias-markdown-code-segment-selected
--dsw-alias-markdown-code-segment-unselected
--dsw-alias-markdown-placeholder
--dsw-alias-bg-mask-2
--dsw-alias-bg-mask-3
--dsw-alias-bg-mask-photo
--dsw-specific-bubble-highlight
--dsw-specific-login-input
--dsw-specific-tip
--dsw-linear-gradient-think
--dsw-linear-think-select
--dsw-shadow-lv1
--dsw-shadow-lv1-blur
--dsw-static-blue-100
--dsw-static-blue-50
--dsw-static-blue-50p
--dsw-static-blue-75
--dsw-static-blue-800
--dsw-static-deepseek-300
--dsw-static-deepseek-600
--dsw-static-deepseek-700-delete
--dsw-static-deepseek-900
--dsw-static-neutral-150
--dsw-static-neutral-250
--dsw-static-neutral-500
--dsw-static-neutral-900
--dsw-static-red-100
--dsw-static-red-50
--dsw-static-red-500
--dsw-static-red-900
""".split())

GATED = {
    "--dsw-elevation-panel", "--dsw-elevation-prominent", "--dsw-elevation-soft",
    "--dsw-elevation-stroke", "--dsw-elevation-stroke-color",
}

# ---------- 中文释义词典 ----------
GROUP_ZH = OrderedDict([
    ("bg", "背景与填充"), ("file", "文件"), ("label", "文字"), ("state", "状态"),
    ("button", "按钮"), ("border", "边框"), ("interactive", "交互"), ("brand", "品牌"),
    ("onboarding", "引导页"), ("scrollbar", "滚动条"), ("tooltip", "提示"), ("menu", "菜单"),
    ("settings", "设置"), ("toast", "轻提示"), ("code", "代码"), ("turn", "对话轮次"),
    ("link", "链接"), ("switch", "开关"), ("markdown", "Markdown"),
])
GROUP_ORDER = list(GROUP_ZH.keys())

SUFFIX_ZH = OrderedDict([
    ("base", "基础"), ("layer-1", "第 1 层"), ("layer-2", "第 2 层"), ("layer-3", "第 3 层"),
    ("layer-4", "第 4 层"), ("mask", "蒙层"), ("mask-drop", "拖放蒙层"),
    ("mask-1", "蒙层 1"), ("mask-2", "蒙层 2"), ("mask-3", "蒙层 3"), ("mask-photo", "照片蒙层"),
    ("multi-select", "多选"), ("document-preview", "文档预览"), ("document-selection", "文档选区"),
    ("fill", "填充"), ("fill-l1", "填充 1 级"), ("fill-l2", "填充 2 级"),
    ("fill-tertiary", "三级填充"), ("fill-tsp-secondary", "半透明次级填充"),
    ("primary", "主"), ("secondary", "次"), ("tertiary", "三级"), ("quaternary", "四级"),
    ("disabled", "禁用"), ("error", "错误"), ("success", "成功"), ("warning", "警告"),
    ("business", "业务"), ("invert", "反色"), ("inverted2", "反色 2"), ("brand", "品牌"),
    ("text", "文字"), ("active", "激活"), ("hover", "悬停"), ("selected", "选中"),
    ("focus", "聚焦"), ("ghost", "幽灵"), ("dimmed", "弱化"), ("invisible", "隐形"),
    ("divider", "分隔线"), ("separator", "分隔线"), ("wash", "淡彩"), ("hovered", "悬停"),
    ("pressed", "按下"), ("nav", "导航"), ("item", "条目"), ("nav-item", "导航条目"),
    ("group", "分组"), ("header", "头部"), ("group-header-fill", "分组头填充"),
    ("code", "代码"), ("block", "块"), ("code-block", "代码块"), ("header", "头部"),
    ("markdown", "Markdown"), ("segment", "代码段"), ("placeholder", "占位"),
    ("think", "思考"), ("select", "选择"), ("scrollbar", "滚动条"), ("thumb", "滑块"),
    ("track", "轨道"), ("turn", "轮次"), ("trigger", "触发器"), ("accent", "强调"),
    ("card", "卡片"), ("checkbox", "勾选框"), ("stroke", "描边"), ("border", "边框"),
    ("tooltip", "提示"), ("toast", "轻提示"), ("menu", "菜单"), ("settings", "设置"),
    ("switch", "开关"), ("onboarding", "引导页"), ("link", "链接"), ("turn-trigger", "轮次触发器"),
    ("bubble", "气泡"), ("input", "输入"), ("bubble-highlight", "气泡高亮"),
    ("login-input", "登录输入"), ("selector", "选择器"), ("sidebar-fill", "侧栏填充"),
    ("sidebar-nav-item-active", "侧栏导航激活"), ("sidebar-nav-item-active-accent", "侧栏导航激活强调"),
    ("sidebar-nav-item-hover", "侧栏导航悬停"), ("tip", "提示"), ("app", "应用"),
    ("surface", "表面"), ("material", "材质"), ("shadow", "阴影"), ("elevation", "高度"),
])

STATIC_FAMILY_ZH = OrderedDict([
    ("amber", "琥珀"), ("blue", "蓝"), ("deepseek", "DeepSeek"), ("green", "绿"),
    ("neutral-bluish", "中性偏蓝"), ("neutral", "中性"), ("red", "红"),
])
SHIKI_ZH = OrderedDict([
    ("--shiki-background", "代码高亮背景"), ("--shiki-foreground", "代码高亮前景"),
    ("--shiki-token-comment", "注释"), ("--shiki-token-constant", "常量"),
    ("--shiki-token-function", "函数"), ("--shiki-token-keyword", "关键字"),
    ("--shiki-token-link", "链接"), ("--shiki-token-parameter", "参数"),
    ("--shiki-token-punctuation", "标点"), ("--shiki-token-string", "字符串"),
    ("--shiki-token-string-expression", "字符串插值"),
])

DECL_RE = re.compile(r"(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);", re.S)
CONSUMER_RE = re.compile(r"var\(\s*(--[a-zA-Z0-9-]+)")
GETPROP_RE = re.compile(r"getPropertyValue\(\s*['\"](--[a-zA-Z0-9-]+)['\"]")


def rel(path: str) -> str:
    try:
        return os.path.relpath(path, SRC).replace("\\", "/")
    except ValueError:
        return path.replace("\\", "/")


def short(path: str) -> str:
    p = rel(path)
    for pref in ("packages/client/", "apps/web/", "apps/desktop/"):
        if p.startswith(pref):
            p = p[len(pref):]
            break
    return p


def collect_declarations():
    decls = defaultdict(list)  # name -> [(file, line, value)]
    for fn in sorted(os.listdir(STYLES)):
        if not fn.endswith(".css"):
            continue
        path = os.path.join(STYLES, fn)
        with open(path, encoding="utf-8") as f:
            text = f.read()
        for m in DECL_RE.finditer(text):
            name, value = m.group(1), " ".join(m.group(2).split())
            if not is_color_token(name):
                continue
            lineno = text.count("\n", 0, m.start()) + 1
            decls[name].append((fn, lineno, value))
    return decls


def collect_consumers():
    counts = defaultdict(int)
    files = defaultdict(set)
    roots = [os.path.join(SRC, "packages", "client"), os.path.join(SRC, "apps", "web"),
             os.path.join(SRC, "apps", "desktop")]
    for root in roots:
        if not os.path.isdir(root):
            continue
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in ("node_modules", "dist", ".git", "tests", "__tests__", "test")]
            for fn in filenames:
                if not fn.endswith((".css", ".tsx", ".ts", ".jsx")):
                    continue
                if ".test." in fn or ".spec." in fn or ".e2e." in fn or fn.endswith(".d.ts") or fn.startswith("__"):
                    continue
                path = os.path.join(dirpath, fn)
                try:
                    with open(path, encoding="utf-8", errors="ignore") as f:
                        text = f.read()
                except OSError:
                    continue
                found = CONSUMER_RE.findall(text) + GETPROP_RE.findall(text)
                for name in set(found):
                    if is_color_token(name):
                        counts[name] += found.count(name)
                        files[name].add(short(path))
    return counts, files


def zh_for(name: str) -> str:
    if name in SHIKI_ZH:
        base = SHIKI_ZH[name]
        return base + "（shiki）" if name.startswith("--shiki-token") else base
    if name == "--dsw-focus-ring-color":
        return "焦点环颜色"
    if name == "--dsw-menu-surface-fill":
        return "菜单表面填充（材质层）"
    if name.startswith("--dsw-static-"):
        body = name[len("--dsw-static-"):]
        for fam, zh in STATIC_FAMILY_ZH.items():
            if body.startswith(fam + "-"):
                shade = body[len(fam) + 1:]
                return f"调色板原子：{zh} {shade}"
        return "调色板原子：" + body
    if name.startswith("--dsw-shadow-"):
        return "阴影：" + name[len("--dsw-shadow-"):]
    if name.startswith("--dsw-elevation-"):
        return "材质阴影：" + name[len("--dsw-elevation-"):]
    if name.startswith("--dsw-gradient-"):
        return "渐变：" + name[len("--dsw-gradient-"):].replace("-stops", " 色标")
    if name.startswith("--dsw-linear-"):
        return "线性渐变：" + name[len("--dsw-linear-"):]
    if name.startswith("--dsw-specific-"):
        body = name[len("--dsw-specific-"):]
        return "区域特化：" + SUFFIX_ZH.get(body, body)
    if name.startswith("--dsw-alias-"):
        body = name[len("--dsw-alias-"):]
        parts = body.split("-")
        group = parts[0]
        rest = "-".join(parts[1:])
        gzh = GROUP_ZH.get(group, group)
        zh = SUFFIX_ZH.get(rest) or SUFFIX_ZH.get("-".join(parts[1:2]))
        if zh is None:
            pieces = [SUFFIX_ZH.get(p) for p in parts[1:] if SUFFIX_ZH.get(p)]
            zh = " ".join(pieces) if pieces else rest
        return f"{gzh}：{zh}"
    return name


def value_type(name: str) -> str:
    if name.startswith(("--dsw-shadow-", "--dsw-elevation-")):
        return "shadow（多段阴影）"
    if name.startswith(("--dsw-gradient-", "--dsw-linear-")):
        return "渐变（颜色停滞）"
    if name.startswith("--shiki-"):
        return "color"
    return "color（背景类可接受 paint）"


def status_of(name: str):
    if name in DEAD:
        return "dead", "宿主当前无消费方：改了不生效（死名，条目保留但标 dead）"
    if name in GATED:
        return "gated", "被组件元素级重声明（elevation 族）：body 级 token 写入会被子元素盖掉；能力需走规则层（body *{} 或更高特异性）"
    if name.startswith("--shiki-token-"):
        return "live(runtime)", "由 shiki 运行时读取 CSS 变量消费；CSS 扫描看不见，改颜色仍生效"
    return "live", "可改：见消费方与示例"


def subgroup_of(name: str):
    if name.startswith("--dsw-static-"):
        body = name[len("--dsw-static-"):]
        for fam in ("neutral-bluish", "deepseek", "neutral", "amber", "blue", "green", "red"):
            if body.startswith(fam + "-"):
                return "static/" + fam
        return "static/other"
    if name.startswith("--shiki-"):
        return "shiki"
    if name.startswith("--dsw-specific-"):
        return "specific"
    if name == "--dsw-focus-ring-color":
        return "focus"
    if name == "--dsw-menu-surface-fill":
        return "menu"
    if name.startswith("--dsw-shadow-"):
        return "shadow"
    if name.startswith("--dsw-elevation-"):
        return "elevation"
    if name.startswith("--dsw-gradient-"):
        return "gradient"
    if name.startswith("--dsw-linear-"):
        return "linear"
    if name.startswith("--dsw-alias-"):
        body = name[len("--dsw-alias-"):]
        return "alias/" + body.split("-")[0]
    return "other"


GROUP_LABELS = {
    "alias/bg": "alias · 背景与表面", "alias/file": "alias · 文件", "alias/label": "alias · 文字",
    "alias/state": "alias · 状态", "alias/button": "alias · 按钮", "alias/border": "alias · 边框",
    "alias/interactive": "alias · 交互", "alias/brand": "alias · 品牌", "alias/onboarding": "alias · 引导页",
    "alias/scrollbar": "alias · 滚动条", "alias/tooltip": "alias · 提示", "alias/menu": "alias · 菜单",
    "alias/settings": "alias · 设置", "alias/toast": "alias · 轻提示", "alias/code": "alias · 代码",
    "alias/turn": "alias · 对话轮次", "alias/link": "alias · 链接", "alias/switch": "alias · 开关",
    "alias/markdown": "alias · Markdown", "specific": "specific · 区域特化",
    "shiki": "shiki · 代码高亮", "static/blue": "static · 蓝", "static/deepseek": "static · DeepSeek",
    "static/green": "static · 绿", "static/amber": "static · 琥珀", "static/neutral": "static · 中性",
    "static/neutral-bluish": "static · 中性偏蓝", "static/red": "static · 红",
    "focus": "focus · 焦点环", "menu": "menu · 菜单材质", "shadow": "shadow · 阴影",
    "elevation": "elevation · 材质阴影（gated）", "gradient": "gradient · 渐变",
    "linear": "linear · 线性渐变",
}
SUBORDER = ["alias/bg", "alias/label", "alias/state", "alias/button", "alias/border",
            "alias/interactive", "alias/brand", "alias/markdown", "alias/code", "alias/file",
            "alias/menu", "alias/scrollbar", "alias/onboarding", "alias/settings", "alias/tooltip",
            "alias/toast", "alias/turn", "alias/link", "alias/switch",
            "specific", "shiki", "focus", "menu", "shadow", "elevation", "gradient", "linear",
            "static/blue", "static/deepseek", "static/green", "static/amber",
            "static/neutral", "static/neutral-bluish", "static/red"]


def main():
    decls = collect_declarations()
    counts, files = collect_consumers()
    names = sorted(decls.keys())
    tokens = []
    for name in names:
        status, note = status_of(name)
        d0 = decls[name][0]
        consumers = sorted(files[name])
        tokens.append({
            "name": name,
            "subgroup": subgroup_of(name),
            "zh": zh_for(name),
            "value_type": value_type(name),
            "status": status,
            "note": note,
            "declared": f"{d0[0]}:{d0[1]}",
            "declared_all": [f"{f}:{l}" for f, l, _ in decls[name]],
            "declared_value": d0[2][:120],
            "consumers": counts.get(name, 0),
            "consumer_examples": consumers[:3],
        })
    tokens.sort(key=lambda t: (SUBORDER.index(t["subgroup"]) if t["subgroup"] in SUBORDER else 99, t["name"]))

    def cnt(pred):
        return sum(1 for t in tokens if pred(t))

    summary = {
        "total": len(tokens),
        "live": cnt(lambda t: t["status"].startswith("live")),
        "dead": cnt(lambda t: t["status"] == "dead"),
        "gated": cnt(lambda t: t["status"] == "gated"),
        "with_consumers": cnt(lambda t: t["consumers"] > 0),
        "dead_names": [t["name"] for t in tokens if t["status"] == "dead"],
    }

    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump({"summary": summary, "tokens": tokens}, f, ensure_ascii=False, indent=1)

    # ---------- HTML ----------
    def esc(s):
        return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))

    groups = OrderedDict()
    for t in tokens:
        groups.setdefault(t["subgroup"], []).append(t)

    cards = f"""
    <div class="grid">
      <div class="card"><div class="k">颜色轴 token</div><div class="v">{summary['total']}</div></div>
      <div class="card"><div class="k">live</div><div class="v" style="color:var(--good)">{summary['live']}</div></div>
      <div class="card"><div class="k">gated（需规则层）</div><div class="v" style="color:var(--warn)">{summary['gated']}</div></div>
      <div class="card"><div class="k">可用合计（live + gated）</div><div class="v">{summary['live'] + summary['gated']}</div></div>
      <div class="card"><div class="k">dead（无消费方）</div><div class="v" style="color:var(--bad)">{summary['dead']}</div></div>
      <div class="card"><div class="k">有静态消费方</div><div class="v">{summary['with_consumers']}</div></div>
    </div>"""

    sections = []
    for sg in SUBORDER:
        if sg not in groups:
            continue
        rows = []
        for i, t in enumerate(groups[sg], 1):
            badge = {"live": "b-ok", "dead": "b-bad", "gated": "b-warn"}.get(t["status"], "b-info")
            if t["status"].startswith("live(runtime)"):
                cons = "运行时消费<br>（CSS 扫描不可见）"
            elif t["consumers"]:
                cons = f"{t['consumers']} 处"
            else:
                cons = "0（死名）"
            ex = "<br>".join(esc(x) for x in t["consumer_examples"]) or "<span class='muted'>—</span>"
            rows.append(f"""
          <tr>
            <td>{i}</td>
            <td><code>{esc(t['name'])}</code></td>
            <td>{esc(t['zh'])}</td>
            <td><span class="badge {badge}">{esc(t['status'])}</span></td>
            <td>{cons}</td>
            <td class="muted">{esc(t['note'])}</td>
            <td class="muted">{esc(t['declared'])}<br>{esc(t['declared_value'])}</td>
            <td class="muted" style="font-size:12px">{ex}</td>
          </tr>""")
        sections.append(f"""
      <h2>{esc(GROUP_LABELS.get(sg, sg))}（{len(groups[sg])} 条）</h2>
      <table>
        <thead><tr><th>#</th><th>token</th><th>是什么</th><th>状态</th><th>宿主消费</th>
        <th>能做什么 / 限制</th><th>声明位置（首处）</th><th>消费方示例</th></tr></thead>
        <tbody>{''.join(rows)}</tbody>
      </table>""")

    html = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>颜色轴 222 token 逐条清单·#147</title>
<style>
:root{{--bg:#0f1115;--panel:#161a20;--panel2:#1c2128;--line:#2a313a;--fg:#e6e9ef;--fg2:#a9b2bf;--fg3:#7d8794;--accent:#7aa2ff;--good:#5bd08a;--warn:#f0b24a;--bad:#f2708a;--chip:#222a34}}
@media (prefers-color-scheme:light){{:root{{--bg:#f6f7f9;--panel:#fff;--panel2:#f0f2f5;--line:#dde1e6;--fg:#14181d;--fg2:#4a5360;--fg3:#77808c;--chip:#eceff3}}}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;line-height:1.6;font-size:14px}}
.wrap{{max-width:1280px;margin:0 auto;padding:28px 18px 80px}}
h1{{font-size:22px;margin:0 0 4px}} h2{{font-size:17px;margin:30px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--line)}}
.sub{{color:var(--fg2);font-size:13px;margin-bottom:18px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}}
.card{{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px}}
.k{{color:var(--fg3);font-size:12px}} .v{{font-size:22px;font-weight:650}}
table{{width:100%;border-collapse:collapse;margin:10px 0;font-size:12.5px}}
th,td{{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}}
th{{color:var(--fg2);font-weight:600;font-size:12.5px;background:var(--panel2);position:sticky;top:0}}
tr:hover td{{background:var(--panel2)}}
code{{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;background:var(--chip);padding:1px 4px;border-radius:4px}}
.badge{{display:inline-block;font-size:11px;padding:1px 7px;border-radius:999px}}
.b-ok{{background:rgba(91,208,138,.15);color:var(--good)}} .b-warn{{background:rgba(240,178,74,.15);color:var(--warn)}}
.b-bad{{background:rgba(242,112,138,.15);color:var(--bad)}} .b-info{{background:rgba(122,162,255,.15);color:var(--accent)}}
.muted{{color:var(--fg2)}} .note{{border-left:3px solid var(--warn);background:rgba(240,178,74,.07);padding:10px 14px;border-radius:0 8px 8px 0;margin:10px 0}}
.foot{{margin-top:36px;color:var(--fg3);font-size:12px;border-top:1px solid var(--line);padding-top:12px}}
</style></head><body><div class="wrap">
<h1>颜色轴 222 个 token 逐条清单</h1>
<div class="sub">#147 · 2026-10-24 · 数据源宿主源码 @687f282 · 声明位置 = ui-theme/src/styles/*.css · 消费方 = packages/client + apps 的 var() 引用<br>
口径：222 = alias 107 + specific 11 + shiki 11 + static 77 + focus 1 + menu 1 + shadow 4 + elevation 5 + gradient 3 + linear 2</div>
{cards}
<div class="note"><b>状态说明</b>：<b>live</b> = 宿主有消费方，写 token 即生效；<b>dead</b> = 无任何消费方，写了不生效（条目保留、标注死名）；<b>gated</b> = 被组件元素级重声明，body 级 token 写入会被子元素盖掉，能力需走规则层；<b>live(runtime)</b> = 由运行时（shiki）读取，CSS 扫描看不见但生效。</div>
{''.join(sections)}
<div class="foot">生成脚本：<code>scripts/research/gen_color_token_catalog.py</code> · 机器可读数据：<code>docs/research/v3-color-token-catalog.json</code> · 用于 #147 颜色组 A 方案（语义条目 + 直绑定兜底）的逐条核对</div>
</div></body></html>"""

    with open(OUT_HTML, "w", encoding="utf-8") as f:
        f.write(html)
    print(json.dumps(summary, ensure_ascii=False, indent=1))
    print("tokens:", len(tokens))
    print("html:", OUT_HTML)
    print("json:", OUT_JSON)


if __name__ == "__main__":
    main()
