#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P4 生成器：非颜色公开 token（203）+ 运行时局部变量（148）。

输入：
  palette/tokens.yaml           （公开命名空间 425，含 typography/radius/dsh/menu/corner/mask/other）
  宿主源码 D:/Temp/dsh-src        （运行时 --dsh / 其他包局部 --dsw / 组件局部变量）
输出：
  docs/research/v3-noncolor-surface-ability-map.html
  docs/research/noncolor-surface-map.json

口径：
  公开命名空间 425 = 颜色 222（P1）+ 非颜色 203（本表）
  运行时 573 ⊃ 425：额外 148 = --dsh 60 + --dsl 20（P2）+ 其他包局部 --dsw 12 + 组件局部其他 56
"""
from __future__ import annotations

import collections
import json
import os
import re

TOKENS = "palette/tokens.yaml"
HOST = r"D:\Temp\dsh-src"
OUT_HTML = "docs/research/v3-noncolor-surface-ability-map.html"
OUT_JSON = "docs/research/noncolor-surface-map.json"
RUNTIME_SCAN = "scripts/research/data/runtime-scan-web-2026-10-20.json"

COLOR_FAMILIES = {"alias", "specific", "shiki", "static", "focus", "menu_color",
                  "shadow", "elevation", "gradient", "linear"}

COLOR_RE = re.compile(r"var\(\s*(--[a-z0-9-]+)")
DECL_RE = re.compile(r"^\s*(--[a-z0-9-]+)\s*:", re.M)

SKIP_DIRS = {"node_modules", "dist", ".git", "__snapshots__", "tests", "test", "e2e"}


def iter_host_files():
    for root, dirs, files in os.walk(HOST):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fn in files:
            if fn.endswith((".css", ".ts", ".tsx", ".scss")):
                yield os.path.join(root, fn)


def scan_runtime():
    """扫描宿主，收集 --dsh-* / 局部 --dsw-* / 组件局部变量。"""
    dsh_decl = collections.defaultdict(set)      # name -> files
    dsh_consume = collections.Counter()
    local_dsw = collections.defaultdict(set)
    local_other = collections.defaultdict(set)   # name -> files (非 dsw/dsh/dsl/shiki)

    for path in iter_host_files():
        rel = path.replace("\\", "/").split("/dsh-src/")[-1]
        try:
            text = open(path, encoding="utf-8", errors="ignore").read()
        except OSError:
            continue
        # 消费
        for name in COLOR_RE.findall(text):
            if name.startswith("--dsh-"):
                dsh_consume[name] += 1
        # 声明
        for name in DECL_RE.findall(text):
            if name.startswith("--dsh-"):
                dsh_decl[name].add(rel)
            elif name.startswith("--dsw-"):
                if "ui-theme/src/styles/" not in rel:
                    local_dsw[name].add(rel)
            elif name.startswith(("--dsl-", "--shiki-", "--dsw-")):
                continue
            else:
                local_other[name].add(rel)

    # ui-theme 公开 425 里的 --dsh 11 个用于排除
    return {
        "dsh_decl": {k: sorted(v) for k, v in dsh_decl.items()},
        "dsh_consume": dict(dsh_consume),
        "local_dsw": {k: sorted(v) for k, v in local_dsw.items()},
        "local_other": {k: sorted(v) for k, v in local_other.items()},
    }


def load_runtime(toks):
    """运行时 573 名的权威来源 = 2026-10-20 安装版首屏 Playwright 实测；
    源码扫描只用于补「声明位置」（不要求全命中：JS 写/引号键/第三方 bundle 会漏）。"""
    import json as _json
    scan = _json.load(open(RUNTIME_SCAN, encoding="utf-8"))
    names = set(scan.get("tokenNames") or {})
    pub = {t["name"] for t in toks}
    assert not (pub - names), f"公开 425 有 {len(pub - names)} 个不在运行时实测里"

    extra = sorted(names - pub)
    dsh_extra = [n for n in extra if n.startswith("--dsh-")]
    dsl = [n for n in extra if n.startswith("--dsl-")]
    dsw_local = [n for n in extra if n.startswith("--dsw-")]
    other = [n for n in extra if not n.startswith(("--dsh-", "--dsl-", "--dsw-", "--shiki-"))]

    # 源码扫描（best-effort）补声明位置
    src = scan_runtime()
    loc = {}
    for n in dsh_extra:
        loc[n] = src["dsh_decl"].get(n, [])
    for n in dsw_local:
        loc[n] = src["local_dsw"].get(n, [])
    for n in other:
        loc[n] = src["local_other"].get(n, [])

    return {
        "dsh_extra": dsh_extra,
        "dsh_extra_files": {n: loc[n] for n in dsh_extra},
        "local_dsw": dsw_local,
        "local_dsw_files": {n: loc[n] for n in dsw_local},
        "local_other": other,
        "local_other_files": {n: loc[n] for n in other},
        "dsl_count": len(dsl),
        "counts": {
            "dsh_extra": len(dsh_extra),
            "local_dsw": len(dsw_local),
            "local_other": len(other),
            "total_extra": len(extra),
        },
        "scan_source": RUNTIME_SCAN,
        "scan_date": "2026-10-20（安装版 rc.2 首屏实测；rc.3 主题面零变更，升级演练 P7 复测）",
    }


def capability_id_of(name: str, family: str, zh: str):
    """非颜色 token → capability_id + 用户看到的效果。"""
    if family == "typography":
        if name == "--dsw-font-family":
            return "typography.family.default", "全局正文字族（默认）"
        if name == "--dsw-font-family-brand":
            return "typography.family.brand", "品牌字族"
        m = re.match(r"--dsw-font-(.+)-(font-family|font-size|line-height|font-weight|font-style|letter-spacing)$", name)
        if m:
            role, axis = m.group(1), m.group(2).replace("-", "_")
            return f"typography.{role}.{axis}", f"排印长手：{role} / {axis}"
        role = name[len("--dsw-font-"):]
        return f"typography.{role}.composite", f"排印复合：{role}（一次给 字号/行高/字重/字族）"
    if family == "radius":
        seg = name[len("--dsw-radius-"):]
        return f"radius.{seg}", f"圆角：{seg}"
    if family == "dsh":
        seg = name[len("--dsh-"):]
        return f"runtime.{seg}", f"运行时布局量：{seg}（宿主 JS/组件写，非公开契约）"
    if family == "menu":
        return "menu.surface.backdrop_filter", "菜单材质：backdrop-filter（模糊/噪点）"
    if family == "corner":
        return "structure.corner.shape", "圆角形状（squircle 类）"
    if family == "mask":
        return "mask.blur", "蒙层模糊（宿主钉死 none）"
    if family == "other":
        return "global.focusRing", "焦点环宽度（并入主表 global.focusRing）"
    return None, None


def value_type_of(name: str, family: str):
    if family == "typography":
        if "font-family" in name or family == "typography" and name in ("--dsw-font-family", "--dsw-font-family-brand"):
            return "font_stack / asset"
        if "font-size" in name or "line-height" in name:
            return "length / number（行高可无单位）"
        if "font-weight" in name:
            return "weight"
        if "font-style" in name:
            return "keyword（italic/normal）"
        if "letter-spacing" in name:
            return "length"
        return "font composite（简写）"
    if family == "radius":
        return "length"
    if family == "menu":
        return "filter（blur 等）"
    if family == "corner":
        return "keyword（round/squircle）"
    if family == "mask":
        return "length / keyword（none）"
    if family == "other":
        return "length（宽度）"
    return "length / keyword"


def exposure_of(t):
    if t["status"] == "dead":
        return "不列（仅登记）"
    if t["family"] in ("typography", "radius", "other"):
        return "默认开放"
    return "专家模式（运行时/内部）"


def tier_of(t):
    if t["status"] == "dead":
        return "dead"
    if t["family"] in ("dsh", "mask"):
        return "advanced"
    return "stable"


def main():
    import yaml

    data = yaml.safe_load(open(TOKENS, encoding="utf-8"))
    toks = [t for t in data["tokens"] if t["family"] not in COLOR_FAMILIES]
    assert len(toks) == 203, f"expect 203 non-color tokens, got {len(toks)}"

    runtime = load_runtime(data["tokens"])

    rows = []
    for t in toks:
        cid, effect = capability_id_of(t["name"], t["family"], t.get("zh") or "")
        areas = []
        for it in t.get("consumed_by") or []:
            parts = it["path"].split("/")
            key = parts[2] if len(parts) > 2 and parts[1] == "client" else "?"
            if key not in areas:
                areas.append(key)
        rows.append({
            "token": t["name"],
            "zh": t.get("zh") or "",
            "family": t["family"],
            "status": t["status"],
            "modifiers": t.get("modifiers") or [],
            "consumers": t.get("consumers", 0),
            "areas": areas[:3],
            "value_type": value_type_of(t["name"], t["family"]),
            "tier": tier_of(t),
            "exposure": exposure_of(t),
            "capability_id": cid,
            "effect": effect or (t.get("zh") or ""),
            "probe": ("token_live(" + t["name"] + ")") if t["status"] == "live" else "—",
            "declared": (t.get("declared") or ["—"])[0],
        })

    # 运行时统计（实测 148 = dsh 额外 60 + dsl 20[P2] + local_dsw 12 + local_other 56）
    rt = runtime

    stats = {
        "total": len(rows),
        "by_family": dict(collections.Counter(r["family"] for r in rows)),
        "live": sum(1 for r in rows if r["status"] == "live"),
        "dead": sum(1 for r in rows if r["status"] == "dead"),
        "with_capability_id": sum(1 for r in rows if r["capability_id"]),
        "runtime": rt["counts"],
    }
    json.dump({"stats": stats, "rows": rows, "runtime": rt},
              open(OUT_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    def esc(x):
        return str(x).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    def badge(r):
        if r["status"] == "dead":
            return '<span class="b b-bad">dead</span>'
        return '<span class="b b-ok">live</span>'

    fam_zh = {"typography": "排印（字体/字号/行高/字重/字族）", "radius": "圆角",
              "dsh": "运行时布局量（--dsh）", "menu": "菜单材质", "corner": "圆角形状",
              "mask": "蒙层", "other": "其它（焦点环宽度）"}
    fam_order = ["typography", "radius", "dsh", "menu", "corner", "mask", "other"]

    groups = []
    for fam in fam_order:
        items = [r for r in rows if r["family"] == fam]
        items.sort(key=lambda r: (r["status"] != "live", -r["consumers"], r["token"]))
        groups.append((fam, items))

    trs = []
    for fam, items in groups:
        trs.append(f'<h2>{esc(fam_zh.get(fam, fam))}（{len(items)} 条）</h2>')
        trs.append('<table><tr><th>#</th><th>token</th><th>中文</th><th>状态</th><th>消费</th>'
                   '<th>能力 id</th><th>用户看到的效果</th><th>值类型</th><th>tier / 暴露</th><th>探针</th></tr>')
        for i, r in enumerate(items, 1):
            trs.append(
                f"<tr><td>{i}</td><td><code>{esc(r['token'])}</code></td><td>{esc(r['zh'])}</td>"
                f"<td>{badge(r)}</td><td>{r['consumers']} 处</td><td><code>{esc(r['capability_id'])}</code></td>"
                f"<td>{esc(r['effect'])}</td><td>{esc(r['value_type'])}</td>"
                f"<td>{esc(r['tier'])}<div class='muted'>{esc(r['exposure'])}</div></td>"
                f"<td><code>{esc(r['probe'])}</code></td></tr>"
            )
        trs.append("</table>")

    def rt_table(title, names, files, note):
        if not names:
            return f"<h3>{esc(title)}（0）</h3><p class='muted'>{esc(note)}</p>"
        body = "".join(
            f"<tr><td><code>{esc(n)}</code></td><td class='muted'>{esc(', '.join(os.path.basename(f) for f in files.get(n, [])[:3]))}</td></tr>"
            for n in names
        )
        return f"<h3>{esc(title)}（{len(names)}）</h3><p class='muted'>{esc(note)}</p><table><tr><th>变量</th><th>声明位置（节选）</th></tr>{body}</table>"

    rt_html = (
        rt_table("--dsh 额外（公开 11 之外）", rt["dsh_extra"], rt["dsh_extra_files"],
                 "宿主 JS/组件在运行期写；属内部布局量，不从主题层覆盖，登记以防漏。")
        + rt_table("其他包局部 --dsw", rt["local_dsw"], rt["local_dsw_files"],
                   "ui-theme 之外的文件里定义；元素级作用域，body 级写无效，只能规则层命中或改上游。")
        + rt_table("组件局部其它变量", rt["local_other"], rt["local_other_files"],
                   "组件 CSS Module 内部自定义属性（--trajectory-* / --diff-* / --card-* 等），不属公开契约，不建用户能力。")
    )

    html_doc = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>P4 非颜色 203 + 运行时 148：能力映射</title>
<style>
body{{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;line-height:1.7;max-width:1280px;margin:28px auto;padding:0 20px;color:#1f2328;background:#fff}}
h1{{font-size:23px;border-bottom:2px solid #e8e8e8;padding-bottom:10px}}
h2{{font-size:18px;margin-top:32px;border-left:4px solid #3b82f6;padding-left:10px}}
h3{{font-size:15px;margin-top:22px;color:#374151}}
code{{background:#f4f5f7;padding:1px 4px;border-radius:4px;font-size:12px;font-family:Consolas,monospace}}
table{{border-collapse:collapse;width:100%;margin:10px 0;font-size:12.6px}}
th,td{{border:1px solid #dde2e8;padding:5px 7px;text-align:left;vertical-align:top}}
th{{background:#f2f5f9;position:sticky;top:0}}
.muted{{color:#6b7280;font-size:12px}}
.box{{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin:12px 0}}
.grid{{display:flex;gap:10px;flex-wrap:wrap}}
.card{{border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;min-width:130px}}
.k{{color:#6b7280;font-size:12px}}.v{{font-size:20px;font-weight:650}}
.b{{display:inline-block;padding:0 7px;border-radius:9px;font-size:11.5px}}
.b-ok{{background:#dcfce7;color:#166534}}.b-bad{{background:#f3f4f6;color:#6b7280}}
</style></head><body>
<h1>P4：非颜色公开 token 203 + 运行时局部变量 148 → 能力映射</h1>
<p class="muted">生成器 <code>scripts/research/gen_noncolor_surface_map.py</code>；数据源 <code>palette/tokens.yaml</code>（公开命名空间 425）+ 宿主源码扫描（运行时）。2026-10-24。</p>

<div class="box"><b>覆盖声明（集合算术）：</b>
公开命名空间 <b>425</b> = 颜色轴 <b>222</b>（P1）+ 本表非颜色 <b>203</b>（排印 182 + radius 6 + <code>--dsh</code> 11 + menu 1 + corner 1 + mask 1 + other 1）。
运行时 <b>573</b> ⊃ 425，额外 <b>148</b> = <code>--dsh</code> 额外 <b>{stats['runtime']['dsh_extra']}</b> + <code>--dsl</code> <b>20</b>（P2 已过）+ 其他包局部 <code>--dsw</code> <b>{stats['runtime']['local_dsw']}</b> + 组件局部其它 <b>{stats['runtime']['local_other']}</b>。
合计 425 + 148 = 573 ✓（P1 颜色 + P2 私有面 + P4 本表 = 全量登记）。</div>

<div class="grid">
<div class="card"><div class="k">非颜色 token</div><div class="v">{stats['total']}</div></div>
<div class="card"><div class="k">live / dead</div><div class="v">{stats['live']} / {stats['dead']}</div></div>
<div class="card"><div class="k">运行时额外变量</div><div class="v">{stats['runtime']['total_extra']}</div></div>
<div class="card"><div class="k">排印</div><div class="v">{stats['by_family'].get('typography', 0)}</div></div>
<div class="card"><div class="k">其它</div><div class="v">{stats['total'] - stats['by_family'].get('typography', 0)}</div></div>
</div>

<div class="box"><b>第一性口径（与 P1/P2/P3 一致）：</b>
<ol>
<li><b>排印 182 的结构</b>：2 个全局字族 + 30 个复合（一次给字号/行高/字重/字族，宿主用 <code>font: var(...)</code> 简写消费）+ 150 条长手（5 轴 × 30 角色）。宿主消费的是复合，长手大多无人消费 → <b>长手死名不假装可用</b>，但全部登记（用户要全量）。</li>
<li><b>可改能力落点</b>：排印能力优先落在<b>复合</b>（token 写入即生效）；只改某角色字号/行高时，复合不可拆 → 走<b>规则层</b>（如 <code>p / h1 / code</code> 选择器），这与 P2「有上游走上游、无上游落规则」同一判据。</li>
<li><b>--dsh / 局部变量不是用户能力</b>：它们是宿主内部布局量/组件私有实现，元素级声明或 JS 写入，body 级覆盖无效；登记目的是「以后不用再翻源码」，tier=advanced/内部，不建用户能力条目。</li>
<li><b>不可达诚实标注</b>：<code>--dsw-mask-blur</code> 宿主钉死 <code>none</code>；<code>--dsh-scrollbar-thumb*</code> 由 JS/组件逐元素写 → 只能运行时重写；<code>--dsw-corner-shape</code> 目前无消费方。</li>
</ol></div>

<h2>一、非颜色 203 条（公开命名空间内的全部非颜色 token）</h2>
{''.join(trs)}

<h2>二、运行时额外 148 个变量（不在公开契约内，登记防漏）</h2>
<p class="muted">数据口径：<b>2026-10-20 安装版（rc.2）首屏 Playwright 实测</b>，573 = 425 公开 + 148 额外；rc.3 主题面零变更、DOM 仅新增 3 个 slot，变量名单预计不变，P7 升级演练时复测。证据文件：<code>scripts/research/data/runtime-scan-web-2026-10-20.json</code>。</p>
<div class="box"><b>结论先说：</b>这 148 个不建用户能力。它们分三类——
① <code>--dsh</code> 额外 {stats['runtime']['dsh_extra']} 个：宿主 JS/组件运行期写（布局量与尺寸）；
② 其他包局部 <code>--dsw</code> {stats['runtime']['local_dsw']} 个：元素级作用域，body 级写无效，只能规则层命中或改上游；
③ 组件局部其它 {stats['runtime']['local_other']} 个：组件 CSS Module 内部实现，不属契约。
（<code>--dsl</code> 20 个已在 P2 逐条过。）</div>
{rt_html}

<h2>三、P4 对 palette 的影响</h2>
<ul>
<li>新增能力域：<code>typography</code>（排印）、<code>radius</code>（圆角）、<code>runtime</code>（运行时布局量登记）、<code>mask</code>（蒙层）、<code>structure.corner.shape</code>（圆角形状）。</li>
<li>排印复合 = stable 能力（30 条）；长手 150 条 = dead/advanced（登记但不作为默认入口）；显示改字号/行高用规则层能力（P5 定稿时进 palette 条目）。</li>
<li>运行时 148 = 「已知但不可从主题层写」，写入 <code>palette/tokens.yaml</code> 的 runtime 段与 <code>_index</code> 计数，编辑器不暴露为可点条目。</li>
<li>本表完成后，公开 425 全部有归宿：P1 颜色 222 + P4 非颜色 203；运行时 573 = 425 + 148 全部登记，<b>「全量」在集合意义上闭合</b>。</li>
</ul>

<div class="muted" style="margin-top:26px;border-top:1px solid #e5e7eb;padding-top:12px">
相关：<code>docs/research/v3-capability-master.html</code> · <code>v3-color-222-ability-map.html</code> · <code>v3-private-surface-ability-map.html</code> · <code>v3-dom-ability-map.html</code> · <code>palette/SPEC.md</code>
</div>
</body></html>
"""
    open(OUT_HTML, "w", encoding="utf-8", newline="\n").write(html_doc)
    print("html:", OUT_HTML)
    print("json:", OUT_JSON)
    print("stats:", json.dumps(stats, ensure_ascii=False))


if __name__ == "__main__":
    raise SystemExit(main())
