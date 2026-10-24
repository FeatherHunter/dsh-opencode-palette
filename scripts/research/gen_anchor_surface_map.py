#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P2 锚点层 → 可命中面清单生成器（rc.3 源码扫描）。

生成：
  docs/research/anchor-surface-map.json
  docs/research/v3-anchor-surface-map.html

锚点 = 「规则能命中谁」，不是「能改什么」。七类：
  1. data-slot（源码字面量；运行态更多，见扫描说明）
  2. data-* 属性（源码枚举）
  3. role / aria-*
  4. 全局类名（:global 或字符串字面量）
  5. 标准 HTML 标签（公开）
  6. 哈希类名（CSS Modules，不稳定，只能后缀匹配）
  7. 稳定钩子清单（人工确认，来自 docs/research/theme-ceiling-absolute.md §1.4）
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
OUT_HTML = r"docs/research/v3-anchor-surface-map.html"
OUT_JSON = r"docs/research/anchor-surface-map.json"

ATTR = re.compile(r"\bdata-([a-z0-9-]+)\s*=")
SLOT_LIT = re.compile(r"""data-slot\s*=\s*["']([^"']+)["']""")
ROLE_LIT = re.compile(r"""role\s*=\s*["']([a-z]+)["']""")
ARIA_LIT = re.compile(r"""aria-([a-z-]+)\s*=""")
GLOBAL_CLASS = re.compile(r"""["']((?:md|katex|line)[a-z0-9-]*)["']""")

STABLE_HOOKS = [
    ("[data-slot]", "官方槽位；升级风险最低（rc.3 新增 3 个）"),
    ("[data-shell-*]", "应用外壳区域"),
    ("[data-conversation-region]", "会话区域划分"),
    ("[data-conversation-session]", "会话根"),
    ("[data-conversation-content]", "会话内容区"),
    ("[data-composer-seat]", "输入框座位"),
    ("[data-chat-flow-kind]", "对话流类型"),
    ("[data-chat-node-key]", "对话节点键"),
    ("[data-chat-turn]", "对话轮次"),
    ("[data-tool-*]", "工具调用区"),
    ("[data-diff]", "diff 区"),
    ("[data-read]", "读文件区"),
    ("[data-search]", "搜索区"),
    ("[data-terminal]", "终端区"),
    (".md-code-block", "代码块（全局类，非哈希）"),
    ('[role="menu"]', "菜单"),
    ('[role="dialog"]', "弹窗"),
    ('[role="tooltip"]', "提示气泡"),
    ("[data-menu-material]", "菜单材质层"),
]


def read(path: str) -> str:
    try:
        with open(path, encoding="utf-8", errors="ignore") as fh:
            return fh.read()
    except OSError:
        return ""


def scan(src: str) -> tuple[list[str], collections.Counter, collections.Counter, collections.Counter, collections.Counter]:
    files: list[str] = []
    for root in ("packages", "apps"):
        for cur, dirs, names in os.walk(os.path.join(src, root)):
            dirs[:] = [d for d in dirs if d not in ("node_modules", "dist", "coverage", "tests")]
            for name in names:
                if name.endswith((".tsx", ".ts")):
                    files.append(os.path.join(cur, name))
    attrs: collections.Counter = collections.Counter()
    slots: collections.Counter = collections.Counter()
    roles: collections.Counter = collections.Counter()
    arias: collections.Counter = collections.Counter()
    globals_: collections.Counter = collections.Counter()
    for fp in files:
        text = read(fp)
        if not text:
            continue
        rel = os.path.relpath(fp, src).replace(os.sep, "/")
        for m in ATTR.finditer(text):
            attrs[m.group(1)] += 1
        for m in SLOT_LIT.finditer(text):
            slots[m.group(1)] += 1
        for m in ROLE_LIT.finditer(text):
            roles[m.group(1)] += 1
        for m in ARIA_LIT.finditer(text):
            arias[m.group(1)] += 1
        for m in GLOBAL_CLASS.finditer(text):
            globals_[m.group(1)] += 1
    return files, attrs, slots, roles, arias, globals_


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=HOST_SRC)
    args = ap.parse_args()
    src = args.src
    if not os.path.isdir(src):
        print(f"host src not found: {src}", file=sys.stderr)
        return 2
    files, attrs, slots, roles, arias, globals_ = scan(src)

    payload = {
        "host": {"version": "0.2.1-rc.3", "commit": "1f81c047fc48fa190a683e469daa699857e9afe8"},
        "counts": {
            "tsx_files": len(files),
            "data_attr_names": len(attrs),
            "data_slot_literals": len(slots),
            "roles": len(roles),
            "aria_attrs": len(arias),
            "global_classes": len(globals_),
        },
        "data_attrs": attrs.most_common(60),
        "data_slots": slots.most_common(60),
        "roles": roles.most_common(60),
        "arias": arias.most_common(60),
        "global_classes": globals_.most_common(20),
        "stable_hooks": STABLE_HOOKS,
    }
    with open(OUT_JSON, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
    render(payload)
    print("files=%d attrs=%d slots=%d roles=%d aria=%d global=%d"
          % (len(files), len(attrs), len(slots), len(roles), len(arias), len(globals_)))
    print("html:", OUT_HTML)
    return 0


def esc(v) -> str:
    return html.escape(str(v), quote=True)


def rows(items, with_count=True) -> str:
    out = []
    for it in items:
        if with_count:
            name, count = it
            out.append(f"<tr><td><code>{esc(name)}</code></td><td>{count}</td></tr>")
        else:
            out.append(f"<tr><td><code>{esc(it[0])}</code></td><td>{esc(it[1])}</td></tr>")
    return "\n".join(out)


def render(p: dict) -> None:
    c = p["counts"]
    slot_rows = rows(p["data_slots"])
    attr_rows = rows(p["data_attrs"])
    role_rows = "".join(f"<code>{esc(n)}</code> " for n, _ in p["roles"])
    aria_rows = "".join(f"<code>aria-{esc(n)}</code> " for n, _ in p["arias"])
    gc_rows = rows(p["global_classes"])
    hook_rows = rows(p["stable_hooks"], with_count=False)
    page = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>P2 锚点层（规则能命中谁）</title>
<style>
 body{{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;line-height:1.72;max-width:1100px;margin:30px auto;padding:0 22px;color:#1f2328}}
 h1{{font-size:23px;border-bottom:2px solid #e8e8e8;padding-bottom:10px}}
 h2{{font-size:18px;margin-top:32px;border-left:4px solid #3b82f6;padding-left:10px}}
 code{{background:#f4f5f7;padding:1px 4px;border-radius:4px;font-size:12.5px}}
 table{{border-collapse:collapse;width:100%;margin:10px 0;font-size:13px}}
 th,td{{border:1px solid #dde2e8;padding:6px 8px;text-align:left;vertical-align:top}}
 th{{background:#f2f5f9}} .muted{{color:#6b7280;font-size:12.5px}}
 .box{{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin:14px 0}}
 .warn{{background:#fff8e6;border-color:#f5d38a}}
</style></head><body>
<h1>P2 锚点层：规则能命中谁（宿主 rc.3 @ 1f81c04）</h1>
<p class="muted">数据由 <code>scripts/research/gen_anchor_surface_map.py</code> 扫描宿主源码生成。统计：tsx/ts 文件 {c['tsx_files']}；<code>data-*</code> 属性名 {c['data_attr_names']}；<code>data-slot</code> 源码字面量 {c['data_slot_literals']}；role {c['roles']}；aria-* {c['aria_attrs']}；全局类名 {c['global_classes']}。</p>

<div class="box warn"><b>核心规则（V3 绑定策略的输入）：</b>
<ul>
<li><b>锚点优先级</b>：官方 <code>data-slot</code> &gt; 语义 <code>data-*</code>（semantic 的）&gt; <code>role</code>/<code>aria</code> &gt; 非哈希全局类 &gt; 标签/结构 &gt; 哈希类名后缀（最后兜底）。</li>
<li><b>哈希类名不可写死</b>：CSS Modules 构建产物形如 <code>f3ab12_markdown</code>，只能用 <code>[class$="_markdown"]</code> 这类后缀匹配；升级会变 hash。</li>
<li><b>rc.3 新增 3 个官方 slot</b>（<code>sidebar.panellist.actions</code> / <code>conversation.session.header.views.actions</code> / <code>sidebar.right.tab.guide.actions</code>）→ 可白拿席位放「打开主题设置」。</li>
</ul></div>

<h2>1. data-slot 源码字面量（{c['data_slot_literals']}）</h2>
<table><tr><th>data-slot</th><th>出现次数</th></tr>{slot_rows}</table>
<p class="muted">运行态 data-slot 更多（rc.3 约 43 个）：由库/动态拼接产生，需 Playwright 扫描才能拿到全量；这里只是源码字面量。</p>

<h2>2. data-* 属性名（{c['data_attr_names']}，取前 60）</h2>
<table><tr><th>data-*</th><th>出现次数</th></tr>{attr_rows}</table>

<h2>3. role（{c['roles']} 种）</h2><p>{role_rows}</p>
<h2>4. aria-*（{c['aria_attrs']} 种）</h2><p>{aria_rows}</p>
<h2>5. 全局类名（{c['global_classes']}）</h2>
<table><tr><th>类名字面量</th><th>出现次数</th></tr>{gc_rows}</table>
<h2>6. 哈希类名</h2>
<p>运行时 156 个（上次扫描），源码不可枚举（构建生成）。策略：<b>只作最后兜底</b>，按 <code>[class$="_local名"]</code> 后缀匹配，并在 probe 里标记 <code>volatile: true</code>。</p>

<h2>7. 稳定钩子清单（人工确认，来自主题上限研究 §1.4）</h2>
<table><tr><th>选择器</th><th>含义</th></tr>{hook_rows}</table>

<h2>8. 对 palette 的影响</h2>
<ul>
<li>锚点不是用户能力，是<b>能力条目的绑定目标</b>；palette 里每条能力声明它的锚点候选列表（按优先级）。</li>
<li>rc.3 的 <code>.panelRow</code> 冲突：它现在同时是「更多」按钮的类，规则要加 <code>:not([aria-haspopup])</code> 排除。</li>
<li>升级演练验收：锚点失效要能在 probe 里被发现（<code>selector_exists</code> = unknown → 降级到下一候选）。</li>
</ul>
</body></html>
"""
    with open(OUT_HTML, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(page)


if __name__ == "__main__":
    raise SystemExit(main())
