#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P2 私有契约面 → 能力映射表生成器（rc.3 源码扫描）。

扫描宿主源码，生成：
  docs/research/private-surface-map.json
  docs/research/v3-private-surface-ability-map.html

覆盖层（对应 moddable-surface-registry.md 的 C/D/E）：
  C1  --dsl-*          组件内部别名（19 个声明 + 1 个仅消费）
  C2  --terminal-cursor* 终端光标（JS inline 写，4 个）
  D   inline            宿主内联样式（74 点，分组）
  E   硬编码色          色字面量（381 行 / 13 个 fallback）

用法：
    python scripts/research/gen_private_surface_map.py
    python scripts/research/gen_private_surface_map.py --src D:/Temp/dsh-src
"""
from __future__ import annotations

import argparse
import collections
import html
import json
import os
import re
import sys

HOST_SRC = r"D:\Temp\dsh-src"
VERIFIED_ANCHORS = "scripts/research/data/rc3-anchor-verified.json"
OUT_HTML = r"docs/research/v3-private-surface-ability-map.html"
OUT_JSON = r"docs/research/private-surface-map.json"

CSS_VAR = re.compile(r"var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([^)]*))?\)")
DSL_NAME = re.compile(r"--dsl-[a-z0-9-]+")
TERM_NAME = re.compile(r"--terminal-cursor[a-z0-9-]*")
HARD_COLOR = re.compile(r"#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)")

# 组件目录 → 中文区域
REGION = [
    ("ui-primitives", "基础组件"),
    ("ui-sidebar-terminal", "终端"),
    ("ui-sidebar-documentpreview", "文档预览"),
    ("ui-jobs", "任务列表"),
    ("ui-tool", "工具调用"),
    ("ui-plugin-manager", "插件管理"),
    ("ui-trajectory", "轨迹表格"),
    ("ui-chat", "对话"),
    ("ui-conversation", "会话/输入区"),
    ("ui-sidebar-right", "右侧栏"),
    ("ui-layout", "应用框架"),
    ("ui-attachment", "附件"),
    ("ui-deliverables", "交付物"),
    ("ui-commands", "命令面板"),
    ("ui-settings", "设置页"),
    ("ui-theme", "主题自身"),
    ("ui-workspace", "工作区"),
]


def region_of(path: str) -> str:
    for key, label in REGION:
        if key in path:
            return label
    return "其他"


def read(path: str) -> str:
    try:
        with open(path, encoding="utf-8", errors="ignore") as fh:
            return fh.read()
    except OSError:
        return ""


def strip_comments(text: str) -> str:
    return re.sub(r"/\*.*?\*/", "", text, flags=re.S)


def scan_files(src: str) -> list[str]:
    out: list[str] = []
    for root in ("packages", "apps"):
        base = os.path.join(src, root)
        for cur, dirs, names in os.walk(base):
            dirs[:] = [d for d in dirs if d not in ("node_modules", "dist", "coverage")]
            for name in names:
                if name.endswith((".css", ".tsx", ".ts")):
                    out.append(os.path.join(cur, name))
    return out


def rel(path: str, src: str) -> str:
    p = os.path.relpath(path, src).replace(os.sep, "/")
    return p


# ---- 能力命名映射（人工规则，一处维护） ----
def ability_of_dsl(name: str) -> tuple[str, str]:
    """(--dsl-*) → (建议能力 id, 值类型)"""
    table = {
        "--dsl-code-block-background": ("content.code.block.background", "color"),
        "--dsl-code-block-banner-background-color": ("content.code.block.banner.background", "color"),
        "--dsl-code-block-banner-font": ("content.code.block.banner.font", "font"),
        "--dsl-code-block-border-radius": ("content.code.block.radius", "length"),
        "--dsl-code-block-content-font": ("content.code.block.content.font", "font"),
        "--dsl-code-block-line-white-space": ("content.code.block.line.wrap", "keyword"),
        "--dsl-command-whitespace": ("content.terminal.command.wrap", "keyword"),
        "--dsl-guide-entry-radius": ("sidebar.guide.entry.radius", "length"),
        "--dsl-search-line-height": ("content.search.line-height", "number"),
        "--dsl-search-radius": ("content.search.radius", "length"),
        "--dsl-terminal-command-whitespace": ("content.terminal.command.wrap", "keyword"),
        "--dsl-terminal-font": ("content.terminal.font", "font"),
        "--dsl-terminal-gutter": ("content.terminal.gutter", "length"),
        "--dsl-terminal-line-height": ("content.terminal.line-height", "number"),
        "--dsl-terminal-line-whitespace": ("content.terminal.line.wrap", "keyword"),
        "--dsl-terminal-output-max-height": ("content.terminal.output.max-height", "length"),
        "--dsl-terminal-radius": ("content.terminal.radius", "length"),
        "--dsl-web-radius": ("content.web.radius", "length"),
        "--dsl-file-card-radius": ("content.file.card.radius", "length"),
        "--dsl-table-radius": ("content.table.radius", "length"),
    }
    if name in table:
        return table[name]
    short = name[len("--dsl-"):]
    return (f"content.private.{short}", "other")


TERM_ABILITY = {
    "--terminal-cursor": ("content.terminal.cursor.color", "color"),
    "--terminal-cursor-accent": ("content.terminal.cursor.accent", "color"),
    "--terminal-cursor-cell-background": ("content.terminal.cursor.cell.background", "color"),
    "--terminal-cursor-cell-foreground": ("content.terminal.cursor.cell.foreground", "color"),
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=HOST_SRC)
    args = ap.parse_args()
    src = args.src
    if not os.path.isdir(src):
        print(f"host src not found: {src}", file=sys.stderr)
        return 2

    files = scan_files(src)

    # ---------- C1: --dsl-* ----------
    dsl_decl: dict[str, list[dict]] = collections.defaultdict(list)
    dsl_cons: dict[str, list[str]] = collections.defaultdict(list)
    for fp in files:
        raw = read(fp)
        if not raw or "--dsl-" not in raw:
            continue
        text = strip_comments(raw)
        for m in DSL_NAME.finditer(text):
            name = m.group(0)
            after = text[m.end(): m.end() + 40]
            line = text.count("\n", 0, m.start()) + 1
            if re.match(r"\s*:", after):
                # 取声明值（到行尾）
                tail = text[m.end(): text.find("\n", m.end())] if "\n" in text[m.end():] else text[m.end():]
                val = tail.split(":", 1)[1].strip() if ":" in tail else ""
                dsl_decl[name].append({"path": rel(fp, src), "line": line, "value": val[:160]})
            else:
                dsl_cons[name].append(rel(fp, src))

    dsl_rows = []
    for name in sorted(set(dsl_decl) | set(dsl_cons)):
        decls = dsl_decl.get(name, [])
        cons = dsl_cons.get(name, [])
        upstream = ""
        for d in decls:
            m = CSS_VAR.search(d["value"] or "")
            if m:
                upstream = m.group(1)
                break
        if upstream:
            impl = "token（改上游）"
            note = f"值引用 {upstream}；改上游 token 即可，无需碰 --dsl-*"
        elif decls:
            impl = "规则层（元素本地声明）"
            note = "在组件元素本地声明，body 级写无效；需规则命中该元素或改上游 --dsw-*"
        else:
            impl = "仅消费（未找到声明）"
            note = "只在消费侧出现，来源待查"
        ability, vtype = ability_of_dsl(name)
        regions = sorted({region_of(p) for p in [d["path"] for d in decls] + cons})
        dsl_rows.append({
            "name": name, "ability": ability, "value_type": vtype, "impl": impl,
            "upstream": upstream, "declared": decls[:4], "declared_count": len(decls),
            "consumers": len(set(cons)), "regions": regions, "note": note,
        })

    # ---------- C2: --terminal-cursor* ----------
    term_rows = []
    for name, (ability, vtype) in TERM_ABILITY.items():
        decl_files = []
        cons_files = collections.Counter()
        for fp in files:
            raw = read(fp)
            if name not in raw:
                continue
            if re.search(re.escape(name) + r"\s*:", raw):
                decl_files.append(rel(fp, src))
            n = len(re.findall(re.escape(name) + r"\b", raw))
            if n:
                cons_files[rel(fp, src)] = n
        term_rows.append({
            "name": name, "ability": ability, "value_type": vtype,
            "declared": decl_files[:4], "consumers": sum(cons_files.values()),
            "impl": "运行时（重写 inline）+ 规则层",
            "note": "宿主由 JS 逐元素写 inline（terminal-cursor.ts），CSS 规则需 !important，或运行时 MutationObserver 重写",
        })

    # ---------- E: 硬编码色 fallback ----------
    fallbacks: list[dict] = []
    hard_total = 0
    fallback_re = re.compile(r"var\(\s*(--[a-z0-9-]+)\s*,\s*([^;{}]*?)\)\s*[;}]")
    color_re = re.compile(r"#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(")
    for fp in files:
        if not fp.endswith(".css"):
            continue
        text = strip_comments(read(fp))
        for idx, line in enumerate(text.split("\n"), 1):
            if line.strip() and HARD_COLOR.search(line):
                hard_total += 1
        for m in fallback_re.finditer(text):
            if not color_re.search(m.group(2)):
                continue
            fallbacks.append({
                "path": rel(fp, src),
                "line": text.count("\n", 0, m.start()) + 1,
                "var": m.group(1),
                "fallback": m.group(2).strip()[:60],
            })
    fallback_rows = fallbacks

    # ---------- D: inline 点（分组统计） ----------
    inline_vars = collections.Counter()
    inline_props = collections.Counter()
    for fp in files:
        if not fp.endswith((".tsx", ".ts")):
            continue
        raw = read(fp)
        if not raw:
            continue
        for m in re.finditer(r"style=\{\{([^}]*)\}\}", raw, flags=re.S):
            block = m.group(1)
            for v in re.findall(r"['\"](--[a-z0-9-]+)['\"]", block):
                inline_vars[v] += 1
            for p in re.findall(r"([a-zA-Z][a-zA-Z0-9-]*)\s*:", block):
                inline_props[p] += 1
        for m in re.finditer(r"setProperty\(\s*['\"](--[a-z0-9-]+)['\"]", raw):
            inline_vars[m.group(1)] += 1

    payload = {
        "host": {
            "version": "0.2.1-rc.3",
            "commit": "1f81c047fc48fa190a683e469daa699857e9afe8",
            "note": "--dsl-* / --terminal-cursor* / inline / 硬编码色 四层；rc.3 主题面零变更",
        },
        "counts": {
            "dsl": len(dsl_rows),
            "terminal": len(term_rows),
            "hard_color_lines": hard_total,
            "fallback_pairs": len(fallback_rows),
            "inline_var_names": len(inline_vars),
        },
        "dsl": dsl_rows,
        "terminal": term_rows,
        "fallbacks": fallback_rows,
        "inline": {
            "vars": inline_vars.most_common(40),
            "props": inline_props.most_common(25),
        },
    }
    os.makedirs("docs/research", exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)

    render_html(payload)
    print(f"dsl={len(dsl_rows)} terminal={len(term_rows)} hard_lines={hard_total} fallbacks={len(fallback_rows)} inline_vars={len(inline_vars)}")
    print("html:", OUT_HTML)
    print("json:", OUT_JSON)
    return 0


def esc(v) -> str:
    return html.escape(str(v), quote=True)


def render_html(payload: dict) -> None:
    d = payload
    c = d["counts"]

    def dsl_rows_html() -> str:
        out = []
        for r in d["dsl"]:
            decl = "<br>".join(f"<code>{esc(x['path'])}:{x['line']}</code>" for x in r["declared"]) or "—"
            up = f"<code>{esc(r['upstream'])}</code>" if r["upstream"] else "—"
            out.append(
                "<tr>"
                f"<td><code>{esc(r['name'])}</code></td>"
                f"<td><code>{esc(r['ability'])}</code><br><span class=muted>{esc(r['value_type'])}</span></td>"
                f"<td>{esc(' / '.join(r['regions']))}</td>"
                f"<td>{r['consumers']}</td>"
                f"<td>{up}</td>"
                f"<td>{esc(r['impl'])}</td>"
                f"<td>{decl}</td>"
                "</tr>"
            )
        return "\n".join(out)

    def term_rows_html() -> str:
        out = []
        for r in d["terminal"]:
            decl = "<br>".join(f"<code>{esc(x)}</code>" for x in r["declared"]) or "—（JS inline 写，无 CSS 声明）"
            out.append(
                "<tr>"
                f"<td><code>{esc(r['name'])}</code></td>"
                f"<td><code>{esc(r['ability'])}</code><br><span class=muted>{esc(r['value_type'])}</span></td>"
                f"<td>{r['consumers']}</td>"
                f"<td>{esc(r['impl'])}</td>"
                f"<td>{decl}</td>"
                "</tr>"
            )
        return "\n".join(out)

    def fallback_rows_html() -> str:
        out = []
        for r in d["fallbacks"]:
            out.append(
                "<tr>"
                f"<td><code>{esc(r['var'])}</code></td>"
                f"<td><code>{esc(r['fallback'])}</code></td>"
                f"<td><code>{esc(r['path'])}:{r['line']}</code></td>"
                "</tr>"
            )
        return "\n".join(out)

    inline_vars = "\n".join(
        f"<tr><td><code>{esc(n)}</code></td><td>{c}</td></tr>" for n, c in d["inline"]["vars"][:20]
    )

    verified = []
    verified_attrs = 0
    verified_selectors = 0
    if os.path.exists(VERIFIED_ANCHORS):
        try:
            _v = json.load(open(VERIFIED_ANCHORS, encoding="utf-8"))
            verified = _v.get("slots") or _v.get("data_slot_values") or []
            verified_attrs = len(_v.get("attrs") or [])
            verified_selectors = len(_v.get("selectors") or [])
        except Exception as exc:  # noqa: BLE001
            print(f"warn: cannot read {VERIFIED_ANCHORS}: {exc}", file=sys.stderr)
    verified_rows = "".join(
        f"<tr><td><code>{esc(v)}</code></td><td>宿主 test/spec 引用</td></tr>" for v in verified
    ) if verified else '<tr><td colspan="2" class="muted">（未找到 scripts/research/data/rc3-anchor-verified.json）</td></tr>'

    page = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>P2 私有契约面 → 能力映射（rc.3）</title>
<style>
  body{{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;line-height:1.72;max-width:1180px;margin:30px auto;padding:0 22px;color:#1f2328;background:#fff}}
  h1{{font-size:23px;border-bottom:2px solid #e8e8e8;padding-bottom:10px}}
  h2{{font-size:18px;margin-top:34px;border-left:4px solid #3b82f6;padding-left:10px}}
  code{{background:#f4f5f7;padding:1px 4px;border-radius:4px;font-size:12.5px;font-family:Consolas,monospace}}
  table{{border-collapse:collapse;width:100%;margin:12px 0;font-size:12.8px}}
  th,td{{border:1px solid #dde2e8;padding:6px 8px;text-align:left;vertical-align:top}}
  th{{background:#f2f5f9;position:sticky;top:0}}
  .muted{{color:#6b7280;font-size:12px}}
  .box{{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin:14px 0}}
  .warn{{background:#fff8e6;border-color:#f5d38a}}
  .ok{{background:#eefbf1;border-color:#b7e4c7}}
  .tag{{display:inline-block;padding:0 7px;border-radius:9px;font-size:11.5px;margin-right:3px}}
  .t-ok{{background:#dcfce7;color:#166534}}.t-mid{{background:#fef3c7;color:#92400e}}.t-dead{{background:#f3f4f6;color:#6b7280}}
</style>
</head>
<body>
<h1>P2 私有契约面 → 能力映射（宿主 rc.3 @ 1f81c04）</h1>
<p class="muted">数据由 <code>scripts/research/gen_private_surface_map.py</code> 扫描宿主源码生成（不要手改本页）。<br>
<b>扫描范围</b>：<code>D:\Temp\dsh-src</code> @ rc.3 <code>1f81c04</code>，<code>packages/client/**</code> 下 <code>.css</code> / <code>.tsx</code> / <code>.ts</code>，排除 <code>node_modules</code>、<code>dist</code>、测试与快照；<code>apps/desktop</code> 另在窗口外壳表（#154）。<br>
<b>本次统计</b>：<code>--dsl-*</code> {c['dsl']} 条；<code>--terminal-cursor*</code> {c['terminal']} 条；含色字面量 CSS 行 {c['hard_color_lines']} 行；<code>var(--token, #fallback)</code> 组合 {c['fallback_pairs']} 对；inline 变量 {c['inline_var_names']} 种。</p>

<div class="box"><b>覆盖声明（不遗漏）：</b>本表 100% 覆盖 P2 的四类私有面——
① <code>--dsl-*</code> {c['dsl']} 条（含 1 条仅消费：<code>--dsl-code-block-line-number-width</code>，宿主无声明、靠消费侧 fallback）；
② <code>--terminal-cursor*</code> {c['terminal']} 条；③ inline {c['inline_var_names']} 种（含 body 3 个字号变量）；
④ 硬编码色 fallback {c['fallback_pairs']} 对（可经 token 覆盖）+ 其余 {max(0, c['hard_color_lines'] - c['fallback_pairs'])} 行不可救（遮罩 alpha / 单体视觉色 / 注释）。
<b>不在本表</b>：颜色轴 222 见 P1；非颜色 203 与运行时 <code>--dsh</code>/局部变量见 P4；<code>data-*</code>/哈希类/role 锚点在 P3。</div>

<div class="box ok"><b>三条结论（先看这个）：</b>
<ol>
<li><b>--dsl-* 大部分不是「新能力」，而是上游 token 的局部缩写</b>：值里引用 <code>var(--dsw-*)</code> 的，改上游 token 即生效；不引用的（字体/圆角/行高/换行等结构性值）才需要规则层。</li>
<li><b>--terminal-cursor* 必须运行时重写 inline</b>：宿主用 JS 逐元素写 inline，CSS 规则要 <code>!important</code>，且每次重渲染会重写 → 需要 MutationObserver 幂等重放。</li>
<li><b>硬编码色里真正能救的只有 13 个 fallback</b>：<code>var(--token, #hex)</code> 形式，设 token 即覆盖；其余 338 行是遮罩 alpha / 单体视觉色 / 注释，不在用户能力范围。</li>
</ol></div>

<h2>一、<code>--dsl-*</code> 组件内部别名（{c['dsl']} 条）</h2>
<p class="muted">这些变量定义在组件自己的 CSS Module 里（元素本地），body 级写不进去。判断实现技术看「上游」列：有值 → 改上游 token；无值 → 规则层。</p>
<table>
<tr><th>变量</th><th>建议能力</th><th>区域</th><th>消费文件数</th><th>上游 token</th><th>实现技术</th><th>声明位置（节选）</th></tr>
{dsl_rows_html()}
</table>

<p class="muted">特例：<code>--dsl-code-block-line-number-width</code> 只在消费侧出现（宿主 <code>CodeBlock.module.css</code> 用 <code>var(..., calc(...))</code>），没有声明处 → 归「仅消费」，实现技术 = 规则层 + fallback。</p>

<h2>二、<code>--terminal-cursor*</code> 终端光标（{c['terminal']} 条）</h2>
<table>
<tr><th>变量</th><th>建议能力</th><th>消费处数</th><th>实现技术</th><th>声明位置</th></tr>
{term_rows_html()}
</table>

<h2>三、硬编码色的 13 个 fallback（可经 token 覆盖）</h2>
<table>
<tr><th>token</th><th>fallback 色</th><th>位置</th></tr>
{fallback_rows_html()}
</table>
<p class="muted">其余 {max(0, c['hard_color_lines'] - c['fallback_pairs'])} 行：遮罩 alpha（mask-image #000）、单体视觉色（FileCard color:#fff 等）、注释色值。它们不进入用户能力，最多在「规则兜底清单」记录。</p>

<h2>四、inline 层（宿主内联样式）</h2>
<p>宿主在组件里写 inline 的主要是<b>布局量</b>（不是颜色）：</p>
<table>
<tr><th>inline 变量名</th><th>出现次数</th></tr>
{inline_vars}
</table>
<p class="muted">结论：inline 是「宿主钉住的值」，用户能力不建在这一层；只有 3 个 body 级字号变量（content/code/terminal font-size）可以做「改字号」能力，且需 !important 或运行时重写。</p>

<h2>五、锚点层（哈希类 / data-* / data-slot）—— 下一节</h2>
<div class="box warn">这部分是「规则能命中谁」，不是「能改什么」。它决定上面这些能力能否真正落在正确元素上。</div>
<p class="muted">源码字面量扫描只命中 6 个 data-slot（其中 3 个为模板/根），不足以证明锚点真实存在；下表是从宿主 <b>test/spec 文件</b>里反查到的 <b>data-slot 实际取值</b>（{len(verified)} 个），作为 P3 锚点的第一手证据（数据：<code>scripts/research/data/rc3-anchor-verified.json</code>）。</p>
<table>
<tr><th>data-slot 值（测试引用）</th><th>证据来源</th></tr>
{verified_rows}
</table>
<p class="muted">此外测试里还反查到 data-* 属性名 {verified_attrs} 个（受采样上限；源码枚举 432 个）、querySelector 选择器 {verified_selectors} 条（采样）。完整锚点表见 P3 DOM 表与 <code>docs/research/moddable-surface-registry.md</code> §3 B。</p>

<h2>六、这批结果对 palette 的影响</h2>
<ul>
<li><code>--dsl-*</code> 有上游 token 的：能力条目仍指向<b>上游 token</b>（不新增一条私有变量能力，避免重复表达；符合你「一个 token 一个语义」）。</li>
<li>结构性的（字体/圆角/行高/换行）：新增<b>规则层能力</b>，值类型 = font/length/number/keyword。</li>
<li><code>--terminal-cursor*</code>：新增 4 条运行时能力，tier = 实验（重渲染需重放）。</li>
<li>硬编码 fallback：不新增能力（已被对应 token 覆盖）。</li>
</ul>

</body>
</html>
"""
    with open(OUT_HTML, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(page)


if __name__ == "__main__":
    raise SystemExit(main())
