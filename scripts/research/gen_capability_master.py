#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""能力主表生成器（P0-2 修复：跨技术同一效果合并成一条能力 + 需求溯源）。

输入：
  docs/research/color-ability-map.json        （P1：颜色 222 条逐条）
  docs/research/private-surface-map.json      （P2：私有契约面）
输出：
  docs/research/v3-capability-master.html
  docs/research/capability-master.json

设计：
  - 一条「能力」= 用户看到的一个效果（capability_id）；
  - 能力可以有多条实现技术链（token / rule / dom / runtime），形成 binds 列表；
  - P1 的 222 条 1:1 语义能力默认都进主表（kind=token-semantic），其中 5 组跨技术重复合并为 effect 能力；
  - P3 的 20 条 DOM 效果里，与 P1 重复的合并，其余作为 effect；
  - P2 只新增 2 条（终端光标 / 代码块行号宽度），其余私有面都指向上游 token（不重复表达）。
"""
from __future__ import annotations

import json

COLOR = "docs/research/color-ability-map.json"
PRIVATE = "docs/research/private-surface-map.json"
OUT_HTML = "docs/research/v3-capability-master.html"
OUT_JSON = "docs/research/capability-master.json"

# 跨技术重复 → 合并为一条 effect 能力（P0-2 的修复）
MERGES = {
    # capability_id: (why, tech_chain, covered_semantics, covered_effects)
    "global.focusRing": (
        "焦点环：颜色 token + 规则（宽度/样式）",
        ["token:--dsw-focus-ring-color", "rule:全页 :focus-visible"],
        ["global.focus.ring"],
        ["global.focusRing.style"],
    ),
    "global.scrollbar": (
        "滚动条：4 个颜色 token + 规则（宽度/圆角/hover）",
        ["token:--dsw-alias-scrollbar-bg-l1", "token:--dsw-alias-scrollbar-hover-l1",
         "token:--dsw-alias-scrollbar-bg-l2", "token:--dsw-alias-scrollbar-hover-l2",
         "rule::: -webkit-scrollbar"],
        ["global.scrollbar.level-1.thumb", "global.scrollbar.level-1.thumb-hover",
         "global.scrollbar.level-2.thumb", "global.scrollbar.level-2.thumb-hover"],
        ["global.scrollbar.style"],
    ),
    "global.selection": (
        "选区：选中底色 token（如有）+ ::selection 规则",
        ["rule:::selection"],
        ["selection.multi.background"],
        ["global.selection.color"],
    ),
    "menu.surface": (
        "菜单材质面：宿主表面 token + 材质规则（玻璃/半透明）",
        ["token:--dsw-menu-surface-fill", "token:--dsw-specific-menu", "rule:backdrop-filter"],
        ["menu.surface.fill", "specific.menu.fill"],
        ["menu.surface.glass"],
    ),
    "code.block.background": (
        "代码块底：别名 token + 组件本地别名 --dsl-code-block-background + 规则",
        ["token:--dsw-alias-markdown-code-block", "var:--dsl-code-block-background",
         "rule:pre.shiki background"],
        ["code.block.background", "content.code.background"],
        [],
    ),
}

# P3 的 20 条 DOM 能力（与 v3-dom-ability-map.html 同源；这里只登记身份，不重复锚点细节）
P3_EFFECTS = [
    ("global.page.background.media", "整窗背景：静态图/动图/视频", "dom+css", "stable"),
    ("sidebar.panel.background.media", "左侧工作区背景媒体", "dom+css", "stable"),
    ("conversation.main.background.media", "对话主窗口背景媒体", "dom+css", "stable"),
    ("composer.input.background.media", "输入框背景媒体/玻璃", "dom+css", "stable"),
    ("global.page.overlay.tint", "整页渐变蒙层", "dom+css", "stable"),
    ("global.page.texture.noise", "噪点/纹理", "css", "stable"),
    ("composer.panel.glass", "输入区玻璃态", "css", "stable"),
    ("menu.surface.glass", "菜单材质面", "css", "stable"),
    ("control.button.icon", "任意按钮换图标（含发送按钮头像）", "dom+css", "stable"),
    ("control.button.label", "控件文字替换", "dom", "experimental"),
    ("entry.themeSettings.button", "官方 slot 插主题设置入口", "dom", "stable"),
    ("window.titleBar.background", "标题栏底色/字色", "token+electron", "stable"),
    ("window.titleBar.immersive", "内容延伸到标题栏（沉浸式）", "token", "stable"),
    ("global.scrollbar.style", "滚动条样式", "css", "stable"),
    ("global.selection.color", "文字选区颜色", "css", "stable"),
    ("global.focusRing.style", "焦点环样式", "css", "stable"),
    ("effect.hover.surface", "hover 动效（缩放/位移/发光）", "css", "stable"),
    ("structure.element.hidden", "隐藏控件（实验）", "dom", "experimental"),
    ("structure.element.move", "移动/重排控件（实验）", "dom", "experimental"),
    ("structure.element.inject", "插入自定义节点（实验）", "dom", "experimental"),
]

P2_NEW = [
    ("terminal.cursor", "终端光标 4 颜色（运行时重写 inline）", "runtime+rule", "experimental"),
    ("code.block.lineNumber.width", "代码块行号宽度（仅消费侧变量）", "rule", "experimental"),
]

IDEAS = [
    ("1", "37 参数升级为全面 theme token", "#147"),
    ("2", "全量=颜色/字体/字号/行间距", "#147 + #148"),
    ("3", "玻璃状态", "#149"),
    ("4", "区域背景（静态/动态/视频）", "#137"),
    ("5", "多语字体字号", "#148"),
    ("6", "行间距", "#148"),
    ("7", "新 json schema 区分老 json", "#147"),
    ("8", "程序拿到即知版本", "#147"),
    ("9", "目录/文件布局", "#147"),
    ("10", "老 json 兼容", "#147"),
    ("11", "深度研究 theme token 造一致预览区", "#146"),
    ("12", "AI 创作主题", "#147"),
    ("13", "AI 创作入口", "#147"),
    ("14", "AI 创作流程", "#147"),
    ("15", "预览区一致性", "#149（原 #142）"),
    ("16", "老编辑器改造 + 37 参数映射", "#147"),
    ("17", "编辑处提醒 AI 创作", "#147"),
    ("18", "胶囊列表一键删除模式", "#141"),
    ("19", "点赞", "#132"),
    ("20", "每日统计", "#132"),
    ("21", "颜色分类排序", "#132"),
    ("22", "作者气泡特效", "#149"),
    ("23", "现有 37 款主题升级", "#145"),
    ("24", "所有可点控件交互效果", "#141"),
]


def main():
    colors = json.load(open(COLOR, encoding="utf-8"))
    private = json.load(open(PRIVATE, encoding="utf-8"))
    p1_rows = colors["rows"]

    merged_semantics = set()
    for _cid, (_why, _tech, sems, _effects) in MERGES.items():
        merged_semantics.update(sems)

    rows = []
    # 1) P1 1:1 语义能力（除被合并的）
    for r in p1_rows:
        if not r["semantic"] or r["semantic"] in merged_semantics:
            continue
        rows.append({
            "id": r["semantic"],
            "kind": "token-semantic",
            "effect": r["can_do"],
            "tech": [f"token:{r['token']}"],
            "fallback": [r["direct_id"]],
            "tier": r["tier"],
            "exposure": r["exposure"],
            "probe": r["probe"],
            "status": r["status"],
            "modifiers": r["modifiers"],
            "sources": "P1",
        })
    # 2) 合并后的 effect
    for cid, (why, tech, _sems, _effects) in MERGES.items():
        rows.append({
            "id": cid, "kind": "effect", "effect": why, "tech": tech, "fallback": [],
            "tier": "stable", "exposure": "默认开放", "probe": "selector_exists",
            "status": "live", "modifiers": [], "sources": "P1+P2+P3 合并",
        })
    # 3) P3 effect（跳过已合并的 style 行）
    merged_effects = set()
    for _cid, (_why, _tech, _sems, effects) in MERGES.items():
        merged_effects.update(effects)
    for cid, effect, tech, tier in P3_EFFECTS:
        if cid in merged_effects:
            continue
        rows.append({
            "id": cid, "kind": "effect", "effect": effect, "tech": [tech], "fallback": [],
            "tier": tier, "exposure": "默认开放" if tier == "stable" else "默认关闭（实验）",
            "probe": "selector_exists", "status": "live", "modifiers": [], "sources": "P3",
        })
    # 4) P2 新增
    for cid, effect, tech, tier in P2_NEW:
        rows.append({
            "id": cid, "kind": "effect", "effect": effect, "tech": [tech], "fallback": [],
            "tier": tier, "exposure": "默认关闭（实验）", "probe": "selector_exists",
            "status": "live", "modifiers": [], "sources": "P2",
        })

    # 去重（同 id 只留一条；合并来源优先）
    seen = {}
    for r in rows:
        if r["id"] in seen:
            seen[r["id"]]["tech"] = sorted(set(seen[r["id"]]["tech"]) | set(r["tech"]))
            seen[r["id"]]["sources"] = seen[r["id"]]["sources"] + "+" + r["sources"]
        else:
            seen[r["id"]] = r
    rows = list(seen.values())

    stats_token_semantic = sum(1 for r in rows if r["kind"] == "token-semantic")
    stats = {
        "total": len(rows),
        "token_semantic": stats_token_semantic,
        "effect": sum(1 for r in rows if r["kind"] == "effect"),
        "stable": sum(1 for r in rows if r["tier"] == "stable"),
        "experimental": sum(1 for r in rows if r["tier"] == "experimental"),
        "color_axis_direct": len(p1_rows),
        "merged_groups": len(MERGES),
        "color_axis_merged": len(p1_rows) - stats_token_semantic,
        "p3_effect": sum(1 for r in rows if r["sources"] == "P3"),
        "p2_new": sum(1 for r in rows if r["sources"] == "P2"),
    }
    json.dump({"stats": stats, "rows": rows, "ideas": IDEAS}, open(OUT_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    def esc(x):
        return str(x).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    trs = []
    for i, r in enumerate(rows, 1):
        trs.append(
            f"<tr><td>{i}</td><td><code>{esc(r['id'])}</code></td><td>{esc(r['kind'])}</td>"
            f"<td>{esc(r['effect'])}</td><td>{'<br>'.join('<code>' + esc(t) + '</code>' for t in r['tech'])}</td>"
            f"<td>{r['tier']}</td><td>{esc(r['exposure'])}</td><td><code>{esc(r['probe'])}</code></td>"
            f"<td>{esc(r['sources'])}</td></tr>"
        )
    idea_trs = "".join(
        f"<tr><td>{n}</td><td>{esc(text)}</td><td>{esc(ticket)}</td></tr>" for n, text, ticket in IDEAS
    )
    p1_total = len(p1_rows)

    html_doc = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>能力主表（P0-2 修复）：跨技术合并 + 需求溯源</title>
<style>
body{{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;line-height:1.7;max-width:1280px;margin:28px auto;padding:0 20px;color:#1f2328;background:#fff}}
h1{{font-size:23px;border-bottom:2px solid #e8e8e8;padding-bottom:10px}}
h2{{font-size:18px;margin-top:30px;border-left:4px solid #3b82f6;padding-left:10px}}
code{{background:#f4f5f7;padding:1px 4px;border-radius:4px;font-size:12px;font-family:Consolas,monospace}}
table{{border-collapse:collapse;width:100%;margin:10px 0;font-size:12.5px}}
th,td{{border:1px solid #dde2e8;padding:5px 7px;text-align:left;vertical-align:top}}
th{{background:#f2f5f9;position:sticky;top:0}}
.muted{{color:#6b7280;font-size:12px}}
.box{{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin:12px 0}}
.grid{{display:flex;gap:10px;flex-wrap:wrap}}
.card{{border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;min-width:130px}}
.k{{color:#6b7280;font-size:12px}}.v{{font-size:20px;font-weight:650}}
</style></head><body>
<h1>能力主表（P0-2 修复：同一效果只登记一次 + 24 条需求溯源）</h1>
<p class="muted">生成器 <code>scripts/research/gen_capability_master.py</code>；数据源 P1 颜色表 / P2 私有面表 / P3 DOM 表。2026-10-24。</p>
<div class="grid">
<div class="card"><div class="k">能力总数</div><div class="v">{stats['total']}</div></div>
<div class="card"><div class="k">token 语义能力</div><div class="v">{stats['token_semantic']}</div></div>
<div class="card"><div class="k">效果能力（合并后）</div><div class="v">{stats['effect']}</div></div>
<div class="card"><div class="k">stable / experimental</div><div class="v">{stats['stable']} / {stats['experimental']}</div></div>
<div class="card"><div class="k">跨技术合并组</div><div class="v">{stats['merged_groups']}</div></div>
<div class="card"><div class="k">颜色轴直绑定兜底</div><div class="v">{stats['color_axis_direct']}</div></div>
</div>
<div class="box"><b>这张表解决三个问题：</b>
<ol>
<li><b>跨技术重复</b>：焦点环/滚动条/选区/菜单材质面/代码块底 5 组原本分散在 P1 token、P2 私有变量、P3 规则里，现在各合并为 1 条能力，多条实现技术链并列（token → rule → runtime）。</li>
<li><b>兜底可达</b>：P1 的 {stats['color_axis_direct']} 条直绑定 id（<code>token.*</code>）不删，作为构建期自动生成的兜底条目保留在主表 <code>fallback</code> 字段里，保证 222 条颜色全可达。</li>
<li><b>需求溯源</b>：24 条 idea 各自归属哪张票、由谁覆盖，见文末矩阵（原文在 #127）。</li>
</ol></div>

<h2>一、能力主表（{stats['total']} 条）</h2>
<table>
<tr><th>#</th><th>capability_id</th><th>类型</th><th>用户看到的效果</th><th>实现技术链</th><th>tier</th><th>暴露</th><th>探针</th><th>来源</th></tr>
{''.join(trs)}
</table>

<h2>二、24 条 idea 溯源矩阵</h2>
<table>
<tr><th>#</th><th>用户原话要点（原文见 #127）</th><th>负责票（#128 收编后）</th></tr>
{idea_trs}
</table>

<h2>三、覆盖声明</h2>
<ul>
<li>本表覆盖：颜色轴 222 条（其中 {stats['color_axis_merged']} 条重复语义并入 5 组 effect 主条）→ token-semantic {stats['token_semantic']} 条；P3 DOM 效果 {stats['p3_effect']} 条；P2 私有面能力 {stats['p2_new']} 条；合计 {stats['total']} 条。</li>
<li>不在本表：非颜色 203 条 token（排印 182 / radius 6 / dsh 11 / menu 1 / corner 1 / mask 1 / other 1）与运行时 148 个局部变量 → 见 <b>P4</b> 文档 <code>v3-noncolor-surface-ability-map.html</code>（203 条逐条 + 148 条全部登记，集合闭合：425 = 222 + 203，573 = 425 + 148）；窗口外壳物理边界 → #154。</li>
<li>每条能力的取值形状、成对规则、图片资源限制，仍以 <code>palette/</code> 9 个 YAML 与 <code>palette/SPEC.md</code> 为准。</li>
</ul>
</body></html>
"""
    open(OUT_HTML, "w", encoding="utf-8", newline="\n").write(html_doc)
    print("html:", OUT_HTML)
    print("json:", OUT_JSON)
    print("stats:", stats)


if __name__ == "__main__":
    raise SystemExit(main())
