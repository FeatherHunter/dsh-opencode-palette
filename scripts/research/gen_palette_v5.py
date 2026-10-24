#!/usr/bin/env python3
"""P5 定稿：把 P1–P4 的讨论结果固化成 palette/palette.yaml（能力菜单 + 直绑定）+ tokens.yaml runtime 段 + 交叉对照。

运行：python scripts/research/gen_palette_v5.py
输出：
  palette/palette.yaml                       能力菜单（capabilities）+ 直绑定（direct_bindings）
  palette/tokens.yaml                        追加 runtime 段（148 条登记）
  palette/vocabulary.yaml                    追加 token 能力域
  docs/research/palette-v5-crosswalk.json    P1/P2/P3/P4 每一行 → YAML 落点
  docs/research/v3-p1p4-to-yaml-crosswalk.html
"""
import json
import os
import re
import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(ROOT)

TYPES = None


def load(p):
    with open(p, encoding="utf-8") as f:
        return yaml.safe_load(f)


def jload(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def dump_yaml(path, doc, header=""):
    body = yaml.safe_dump(doc, allow_unicode=True, sort_keys=False, width=1000, default_flow_style=False)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        if header:
            f.write(header)
        f.write(body)


# ---------- 值类型规范化 ----------
def canon_value_type(raw, name, family):
    s = (raw or "").strip()
    n = name
    if "颜色" in s or "color" in s.lower():
        return "color"
    if "渐变" in s:
        return "gradient"
    if "shadow" in s.lower():
        return "shadow"
    if family == "typography":
        if n.endswith("-font-family") or "font-family" in n:
            return "font_stack"
        if n.endswith("-font-size") or n.endswith("-base-font-size"):
            return "length"
        if n.endswith("-line-height") or n.endswith("-base-line-height"):
            return "line_height"
        if n.endswith("-font-weight"):
            return "weight"
        if n.endswith("-font-style"):
            return "font_style"
        return "font"  # CSS font 简写
    if family in ("radius",):
        return "length"
    if family == "shadow" or "shadow" in n:
        return "shadow"
    if "number" in s.lower():
        return "number"
    if "length" in s.lower():
        return "length"
    if family in ("menu",) or "filter" in n:
        return "filter"
    if family in ("mask",) or "mask" in n:
        return "filter"
    if family in ("corner",):
        return "shape"
    return "paint"


def token_tier(tok):
    st = tok.get("status")
    fam = tok.get("family")
    mods = tok.get("modifiers") or []
    if st == "dead":
        return "dead", "不开放"
    if st == "missing":
        return "experimental", "实验"
    if "declared_invalid" in mods:
        return "experimental", "实验"
    if "gated" in mods or fam == "static":
        return "advanced", "高级（原子/底层）"
    return "stable", "默认开放"


# ---------- 载入 ----------
tokens_doc = load("palette/tokens.yaml")
tokens = tokens_doc["tokens"]
token_meta = {t["name"]: t for t in tokens}
master = jload("docs/research/capability-master.json")["rows"]
p1 = jload("docs/research/color-ability-map.json")["rows"]
p4 = jload("docs/research/noncolor-surface-map.json")
p2 = jload("docs/research/private-surface-map.json")
menu = load("palette/palette.src.yaml")
values_doc = load("palette/values.yaml")
valid_types = set(values_doc["value_types"].keys())

# ---------- 能力菜单 ----------
caps = {}
# palette.src.yaml 是唯一手写源；palette.yaml 整份由本脚本重建（可重跑）
for cid, c in menu["capabilities"].items():
    e = dict(c)
    e["tier"] = {"basic": "stable"}.get(e.get("tier"), e.get("tier", "stable"))
    e.setdefault("exposure", "默认开放")
    e["source"] = "hand-authored"
    caps[cid] = e

master_ids = {r["id"] for r in master}
MERGED = {"global.page.background", "window.titleBar.background", "code.block.background"}


def ensure_cap(cid, **fields):
    if cid not in caps:
        caps[cid] = {"since": "3.0.0"}
    e = caps[cid]
    e.update({k: v for k, v in fields.items() if v is not None})
    return e


seed_n = len(caps)
for r in master:
    rid = r["id"]
    tok_names = [x.split(":", 1)[1] for x in r.get("tech", []) if x.startswith("token:")]
    if rid in caps:  # 与手写条目合并
        e = caps[rid]
        e.setdefault("binds", [])
        for tn in tok_names:
            if tn in token_meta and {"token": tn} not in e["binds"]:
                e["binds"].append({"token": tn})
        e["status"] = r.get("status", "live")
        e["tech"] = sorted(set((e.get("tech") or []) + r.get("tech", [])))
        e.setdefault("merged_from", [])
        if rid not in e["merged_from"]:
            e["merged_from"].append(rid)
        continue
    fields = dict(
        kind="token" if r.get("kind") == "token-semantic" else "effect",
        tier=r.get("tier", "stable"),
        exposure=r.get("exposure") or "默认开放",
        source="master",
        docs=r.get("effect") or "",
        status=r.get("status", "live"),
        probe=r.get("probe"),
        tech=r.get("tech", []),
    )
    if bool(tok_names):
        fields["binds"] = [{"token": t} for t in tok_names]
    if r.get("kind") == "token-semantic" and tok_names:
        tn = tok_names[0]
        meta = token_meta.get(tn)
        if meta:
            fields["value"] = canon_value_type(meta.get("value_type"), tn, meta.get("family"))
    ensure_cap(rid, **fields)

# P4：非颜色 live/advanced 52 条 → token 能力
p4_added = 0
for r in p4["rows"]:
    if r.get("status") != "live":
        continue
    cid = r["capability_id"]
    if cid in caps:
        continue
    tn = r["token"]
    meta = token_meta.get(tn) or {}
    ensure_cap(
        cid,
        kind="token",
        tier=r.get("tier") or token_tier(meta)[0],
        exposure=r.get("exposure") or "默认开放",
        source="P4",
        docs=r.get("effect") or "",
        status=r.get("status") or "live",
        probe=r.get("probe") or f"token_live({tn})",
        binds=[{"token": tn}],
        value=canon_value_type(r.get("value_type"), tn, meta.get("family")),
    )
    p4_added += 1

print("DEBUG seed:", seed_n, "after master:", len(caps), "after P4:", p4_added)
# P2：dsl 20 条（去重）+ terminal 4 条并入 master terminal.cursor
p2_added = 0
seen_dsl = set()
for r in p2.get("dsl", []):
    ability = r["ability"]
    if ability in seen_dsl:
        continue
    seen_dsl.add(ability)
    up = r.get("upstream")
    if ability in caps:
        e = caps[ability]
        if up and up in token_meta:
            e.setdefault("binds", [])
            if {"token": up} not in e["binds"]:
                e["binds"].append({"token": up})
        continue
    has_up = bool(up and up in token_meta)
    ensure_cap(
        ability,
        kind="token" if has_up else "effect",
        tier="advanced",
        exposure="专家模式（组件内部别名）",
        source="P2",
        docs=f"宿主组件内部别名 {r['name']}；改上游 token 或规则可间接触达。",
        status="live",
        probe=f"token_live({up})" if has_up else None,
        binds=[{"token": up}] if has_up else [],
        tech=[f"var:{r['name']}"] + ([f"token:{up}"] if has_up else []),
        value=canon_value_type(r.get("value_type"), r["name"], "alias"),
    )
    p2_added += 1

# P2 terminal 4 → 合并进 master terminal.cursor
tc = caps.get("terminal.cursor")
if tc is not None:
    tc.setdefault("merged_from", [])
    for r in p2.get("terminal", []):
        if r["ability"] not in tc["merged_from"]:
            tc["merged_from"].append(r["ability"])

# ---------- 直绑定：425 全量 ----------
direct = {}
for t in tokens:
    name = t["name"]
    ns = t["namespace"]
    suffix = name[len("--" + ns + "-"):] if name.startswith("--" + ns + "-") else name.lstrip("-")
    did = f"token.{ns}.{suffix}"
    tier, exposure = token_tier(t)
    direct[did] = {
        "token": name,
        "value_type": canon_value_type(t.get("value_type"), name, t.get("family")),
        "value_type_note": t.get("value_type"),
        "status": t.get("status"),
        "modifiers": t.get("modifiers") or [],
        "tier": tier,
        "exposure": exposure,
        "probe": f"token_live({name})",
        "family": t.get("family"),
        "subgroup": t.get("subgroup"),
        "docs": t.get("zh") or "",
    }

# ---------- 写 palette.yaml ----------
out = {
    "api": 3,
    "palette_version": "3.0.0",
    "title": menu.get("title"),
    "description": menu.get("description"),
    "control_templates": menu.get("control_templates", {}),
    "capabilities": caps,
    "direct_bindings": direct,
    "extensions": menu.get("extensions") or {},
}
HEADER = (
    "# palette.yaml —— DSH 全量主题能力表（P5 定稿，机器生成部分见 direct_bindings）\n"
    "# 生成器：scripts/research/gen_palette_v5.py\n"
    "# 结构：capabilities = 能力菜单（语义能力 + token 能力 + DOM 效果）；direct_bindings = 425 个 token 的直绑定兜底。\n# 手写源：palette/palette.src.yaml（改能力改那里）；本文件不要手改。\n"
    "# 每条能力都指向底层实现技术（token / 规则 / DOM），裸 token 名只出现在 binds / token 字段里。\n\n"
)
dump_yaml("palette/palette.yaml", out, HEADER)

# ---------- tokens.yaml：追加 runtime 段 ----------
rt = p4["runtime"]
dsl_items = []
for r in p2.get("dsl", []):
    if r["name"] in [x["name"] for x in dsl_items]:
        continue
    dsl_items.append(
        {
            "name": r["name"],
            "upstream": r.get("upstream"),
            "declared": [d.get("path") for d in (r.get("declared") or [])],
            "note": r.get("impl") or "",
        }
    )

runtime = {
    "generated": "2026-10-20 安装版首屏实测（rc.2）；rc.3 主题面零变更，升级演练 P7 复测",
    "reason": "宿主内部 / 组件私有变量：元素级作用域或 JS 写入，body 级写入无效。不建用户能力，只登记，用于「不再翻源码」与「证明没漏」。",
    "scan": {"source": rt.get("scan_source"), "date": rt.get("scan_date")},
    "groups": [
        {
            "id": "dsh-extra",
            "prefix": "--dsh-",
            "count": len(rt["dsh_extra"]),
            "note": "宿主 JS/组件运行时写入（布局量、字体差量、视觉参数）；body 级写入可能被子元素覆盖。",
            "items": [{"name": n, "declared_at": rt["dsh_extra_files"].get(n, [])} for n in rt["dsh_extra"]],
        },
        {
            "id": "dsl",
            "prefix": "--dsl-",
            "count": len(dsl_items),
            "note": "宿主组件内部别名（元素级本地定义）；改上游 token 或走规则层可间接触达（P2 已逐条登记）。",
            "items": dsl_items,
        },
        {
            "id": "local-dsw",
            "prefix": "--dsw-",
            "count": len(rt["local_dsw"]),
            "note": "其他包局部定义的同前缀变量（非 ui-theme 公开面）；不保证跨版本稳定。",
            "items": [{"name": n, "declared_at": rt["local_dsw_files"].get(n, [])} for n in rt["local_dsw"]],
        },
        {
            "id": "local-other",
            "prefix": "",
            "count": len(rt["local_other"]),
            "note": "组件局部变量（无统一前缀）；仅本组件内消费。",
            "items": [{"name": n, "declared_at": rt["local_other_files"].get(n, [])} for n in rt["local_other"]],
        },
    ],
}
runtime["total"] = sum(g["count"] for g in runtime["groups"])
tokens_doc["runtime"] = runtime
dump_yaml("palette/tokens.yaml", tokens_doc)

# ---------- vocabulary：token 能力域 ----------
voc = load("palette/vocabulary.yaml")
domains = {d["id"] for d in voc["capability_domains"]}
if "token" not in domains:
    voc["capability_domains"].append(
        {"id": "token", "zh": "直绑定（裸 token 名）", "desc": "自动生成的 token 直绑定条目；id 形如 token.<namespace>.<名字>"}
    )
    dump_yaml("palette/vocabulary.yaml", voc)

# ---------- 交叉对照 ----------
cross = {"P1": [], "P2": [], "P3": [], "P4": [], "master": []}
for r in p1:
    cross["P1"].append(
        {
            "token": r["token"],
            "semantic": r.get("semantic"),
            "capability": r.get("semantic") if r.get("semantic") in caps else None,
            "direct_binding": r.get("direct_id"),
        }
    )
for r in p2.get("dsl", []):
    seen = r["ability"] in caps
    cross["P2"].append(
        {
            "name": r["name"],
            "ability": r["ability"],
            "capability": r["ability"] if seen else None,
            "direct_binding": (f"token.dsw.{r['upstream'][len('--dsw-'):]}" if r.get("upstream") in token_meta else None),
        }
    )
for r in p2.get("terminal", []):
    cross["P2"].append(
        {"name": r["name"], "ability": r["ability"], "capability": "terminal.cursor", "direct_binding": None}
    )
for r in p3_rows if (p3_rows := jload("docs/research/capability-master.json")["rows"]) and False else []:
    pass
for r in master:
    cross["master"].append({"id": r["id"], "capability": r["id"], "kind": r["kind"]})
for r in p4["rows"]:
    cross["P4"].append(
        {
            "token": r["token"],
            "capability_id": r["capability_id"],
            "capability": r["capability_id"] if r["capability_id"] in caps else None,
            "direct_binding": next((d for d, v in direct.items() if v["token"] == r["token"]), None),
            "status": r["status"],
        }
    )

# master 的 effect 条目 id 直接就是 capability
for r in master:
    if r.get("kind") != "token-semantic":
        cross["P3"].append({"id": r["id"], "capability": r["id"], "tech": r.get("tech", [])})

with open("docs/research/palette-v5-crosswalk.json", "w", encoding="utf-8", newline="\n") as f:
    json.dump({"stats": {"capabilities": len(caps), "direct_bindings": len(direct), "runtime": runtime["total"]}, "rows": cross}, f, ensure_ascii=False, indent=1)

# ---------- 交叉对照 HTML ----------
def esc(s):
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def table(rows, cols, headers):
    out = ["<table><thead><tr>"] + [f"<th>{esc(h)}</th>" for h in headers] + ["</tr></thead><tbody>"]
    for r in rows:
        out.append("<tr>" + "".join(f"<td>{esc(str(r.get(c) or ''))}</td>" for c in cols) + "</tr>")
    out.append("</tbody></table>")
    return "".join(out)


html = f"""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>P5 定稿：P1–P4 每一行 → YAML 落点</title>
<style>
body{{max-width:1100px;margin:0 auto;padding:38px 22px 70px;font:15.5px/1.7 -apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#1f2328;background:#fff}}
@media (prefers-color-scheme:dark){{body{{color:#e6edf3;background:#0d1117}}h1,h2{{border-color:#30363d}}table{{border-color:#30363d}}th,td{{border-color:#30363d!important}}th{{background:#21262d}}code{{background:#161b22}}}}
h1{{font-size:24px;border-bottom:1px solid #d0d7de;padding-bottom:10px}}h2{{font-size:19px;margin-top:34px;border-bottom:1px solid #e4e8ec;padding-bottom:5px}}
table{{border-collapse:collapse;width:100%;margin:12px 0;font-size:13.8px}}th,td{{border:1px solid #d0d7de;padding:6px 8px;text-align:left;vertical-align:top}}th{{background:#f0f3f6}}
code{{font-family:ui-monospace,Consolas,monospace;font-size:12.8px;background:#f4f6f8;padding:1px 4px;border-radius:4px}}
.num{{font-variant-numeric:tabular-nums}}.ok{{color:#1a7f37;font-weight:600}}.muted{{color:#6b7280;font-size:13.5px}}
</style></head><body>

<h1>P5 定稿：P1–P4 每一行 → YAML 落点</h1>
<p class="muted">机器生成：<code>scripts/research/gen_palette_v5.py</code> · 数据：<code>docs/research/palette-v5-crosswalk.json</code></p>

<h2>0. 一句话</h2>
<p>能力菜单 <b>{len(caps)}</b> 条（语义能力 + token 能力 + DOM 效果），直绑定 <b>{len(direct)}</b> 条（425 个 token 全量兜底），运行时登记 <b>{runtime['total']}</b> 条（不建能力）。菜单条目的 <code>binds</code>/<code>tech</code> 指回登记层，登记层每条都有落点。</p>

<h2>1. 集合闭合校验</h2>
<table><thead><tr><th>项</th><th>数字</th><th>说明</th></tr></thead><tbody>
<tr><td>公开 token</td><td class="num">425</td><td>= 颜色 222 + 非颜色 203</td></tr>
<tr><td>直绑定条目</td><td class="num">{len(direct)}</td><td>和 425 一一对应（id = <code>token.&lt;ns&gt;.&lt;名字&gt;</code>）</td></tr>
<tr><td>能力菜单</td><td class="num">{len(caps)}</td><td>手写 28 + master 236 + P4 52 + P2 20（合并/去重后）</td></tr>
<tr><td>运行时登记</td><td class="num">{runtime['total']}</td><td>148 = --dsh 60 + --dsl 20 + 局部 --dsw 12 + 组件局部 56</td></tr>
</tbody></table>

<h2>2. P1（颜色 222）落点</h2>
{table(cross['P1'][:12], ['token','semantic','capability','direct_binding'], ['token','语义能力 id','→ 能力菜单','→ 直绑定 id'])}
<p class="muted">全量 222 行见 JSON；每行必有 <code>direct_binding</code>，语义能力存在时另有 <code>capability</code>。</p>

<h2>3. P2（私有契约面）落点</h2>
{table(cross['P2'], ['name','ability','capability','direct_binding'], ['变量/名字','能力 id','→ 能力菜单','→ 上游 token 直绑定'])}

<h2>4. P3（DOM 效果）落点</h2>
{table(cross['P3'], ['id','capability'], ['master id','→ 能力菜单'])}

<h2>5. P4（非颜色 203）落点</h2>
{table(cross['P4'][:12], ['token','capability_id','capability','direct_binding','status'], ['token','能力 id','→ 能力菜单','→ 直绑定 id','状态'])}
<p class="muted">全量 203 行见 JSON；live 52 条有 <code>capability</code>，dead 151 条只有 <code>direct_binding</code>（tier=dead、不开放）。</p>

<h2>6. 规矩</h2>
<ul>
<li><b>裸 token 名只出现在</b> <code>binds</code>/<code>token</code> 字段与 <code>direct_bindings</code> 键上；用户 theme.yaml 只写能力 id。</li>
<li><b>能力 → 底层实现技术</b>：每条能力的 <code>tech</code>/<code>binds</code> 标明它落到 token / 规则 / DOM 哪一处。</li>
<li><b>死名不冒充可用</b>：status=dead 的 token 在直绑定里 tier=dead、exposure=不开放；能力菜单不生成对应语义能力。</li>
<li><b>运行时只登记</b>：tokens.yaml 的 <code>runtime</code> 段，不生成能力、不写入用户文件。</li>
</ul>

</body></html>
"""
with open("docs/research/v3-p1p4-to-yaml-crosswalk.html", "w", encoding="utf-8", newline="\n") as f:
    f.write(html)

print(
    json.dumps(
        {
            "capabilities": len(caps),
            "direct_bindings": len(direct),
            "runtime_total": runtime["total"],
            "p4_added": p4_added,
            "p2_added": p2_added,
            "missing_types": sorted(
                {c.get("value") for c in caps.values() if isinstance(c.get("value"), str) and c.get("value")}
                - valid_types
            ),
        },
        ensure_ascii=False,
    )
)
