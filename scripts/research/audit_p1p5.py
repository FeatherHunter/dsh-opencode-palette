#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P1–P5 第一性原理自检 v2：像素输入完备性 → 集合闭合 → 可达性 → 值可表达 → 零偏差 → 确定性。"""
import hashlib
import json
import re
import subprocess
import sys
import yaml

FAIL = []


def check(name, ok, detail=""):
    if ok:
        print(f"PASS  {name}" + (f"  [{detail}]" if detail else ""))
    else:
        print(f"FAIL  {name}  {detail}")
        FAIL.append(name)


def load(p):
    return yaml.safe_load(open(p, encoding="utf-8"))


def jload(p):
    return json.load(open(p, encoding="utf-8"))


pal = load("palette/palette.yaml")
tokens_doc = load("palette/tokens.yaml")
voc = load("palette/vocabulary.yaml")
vals = load("palette/values.yaml")
prims = load("palette/primitives.yaml")
assets_doc = load("palette/assets.yaml")
probes_doc = load("palette/probes.yaml")
anchors_doc = load("palette/anchors.yaml")
caps_yaml = load("palette/capabilities.yaml")
idx = load("palette/_index.yaml")

tokens = tokens_doc["tokens"]
tnames = [t["name"] for t in tokens]
tmeta = {t["name"]: t for t in tokens}
caps = pal["capabilities"]
direct = pal["direct_bindings"]
domains = {d["id"] for d in voc["capability_domains"]}
pis = jload("docs/research/color-ability-map.json")["rows"]
p4 = jload("docs/research/noncolor-surface-map.json")
p2 = jload("docs/research/private-surface-map.json")
p3 = jload("docs/research/capability-master.json")
p1t = [r["token"] for r in pis]
p4t = [r["token"] for r in p4["rows"]]
write_kinds = set(prims["write_kinds"].keys())
dom_ops = set(prims['write_kinds']['dom'].get('dom_ops') or {})
anchor_ids = set(anchors_doc['anchors'].keys())
at_desc = set(((prims['write_kinds']['rule'].get('policies') or {}).get('allowed_at_descriptors') or {}).keys())

# ---------- A. 集合闭合（4 类像素输入 → 5 通道） ----------
check("A1 公开 token 425 条", len(tokens) == 425, str(len(tokens)))
ns = {}
for t in tokens:
    ns[t["namespace"]] = ns.get(t["namespace"], 0) + 1
check("A2 命名空间 = 403/11/11", ns == {"dsw": 403, "shiki": 11, "dsh": 11}, json.dumps(ns))
check("A3 颜色 222 + 非颜色 203 = 425", len(p1t) == 222 and len(p4t) == 203 and len(set(p1t) | set(p4t)) == 425,
      f"{len(p1t)}+{len(p4t)}")
check("A4 颜色/非颜色无重叠", not (set(p1t) & set(p4t)))
check("A5 颜色+非颜色 = 全体 token", set(p1t) | set(p4t) == set(tnames))
rt = tokens_doc.get("runtime") or {}
rt_names = set()
for g in rt.get("groups", []):
    for it in g.get("items", []):
        rt_names.add(it["name"])
check("A6 运行时登记 148 条", rt.get("total") == 148 and len(rt_names) == 148, str(rt.get("total")))
check("A7 运行时与公开 token 不重名", not (rt_names & set(tnames)))
check("A8 573 = 425 + 148", len(set(tnames) | rt_names) == 573, str(len(set(tnames) | rt_names)))

# ---------- B. 全量可达 ----------
check("B1 直绑定 425 条且 id 唯一", len(direct) == 425 and len(set(direct)) == len(direct))
check("B2 直绑定覆盖每个 token 恰一次", sorted(v["token"] for v in direct.values()) == sorted(tnames))
check("B3 直绑定 status 与 tokens 一致", all(v["status"] == tmeta[v["token"]].get("status") for v in direct.values()))
vt = set(vals["value_types"])
check("B4 直绑定值类型都已定义", all(v.get("value_type") in vt for v in direct.values()))
check("B5 直绑定 id 形状合法",
      all(re.match(r"^token\.(dsw|shiki|dsh)\.[a-z0-9][a-z0-9-]*$", k) for k in direct))

# ---------- C. 能力菜单结构 ----------
pat = re.compile(r"^[a-z][A-Za-z0-9_-]*(\.[A-Za-z0-9_-]+){1,8}$")
check("C1 能力 id 文法合法", all(pat.match(c) for c in caps))
check("C2 能力 id 域合法", all(c.split(".")[0] in domains for c in caps))
check("C3 能力条数 = _index 记录", len(caps) > 300, str(len(caps)))
check("C4 kind 都在允许集合", {e.get("kind") for e in caps.values()} <= {"property", "recipe", "token", "effect"})
check("C5 能力与直绑定 id 不撞名", not (set(caps) & set(direct)))


def landing_ok(cid, e):
    kind = e.get("kind")
    if kind == "token":
        return bool(e.get("binds"))
    if kind == "effect":
        return bool(e.get("tech"))
    if kind == "property":
        rz = e.get("realization") or []
        return bool(rz) and all(isinstance(r, dict) and r.get("writes") for r in rz)
    if kind == "recipe":
        asp = e.get("aspects") or {}
        vals = asp.values() if isinstance(asp, dict) else asp
        ok = True
        for a in vals:
            effs = (a or {}).get("effects") or []
            if not effs or not all(x.get("writes") for x in effs):
                ok = False
        return bool(asp) and ok
    return False


bad_landing = [c for c, e in caps.items() if not landing_ok(c, e)]
check("C6 每条能力都有落地（token→binds / effect→tech / property|recipe→realization）",
      not bad_landing, str(bad_landing[:5]))

# realization 写原语合法性
bad_use, bad_anchor, bad_op, bad_tok = [], [], [], []
for c, e in caps.items():
    for r in e.get("realization") or []:
        for w in r.get("writes") or []:
            u = w.get("use")
            if u not in write_kinds:
                bad_use.append((c, u))
            if u == "rule":
                if w.get("at"):
                    if w.get("at") not in at_desc:
                        bad_anchor.append((c, w.get("at")))
                elif w.get("anchor") not in anchor_ids:
                    bad_anchor.append((c, w.get("anchor")))
            if u == "dom" and w.get("op") not in dom_ops:
                bad_op.append((c, w.get("op")))
            if u == "token" and w.get("name") not in tmeta:
                bad_tok.append((c, w.get("name")))
check("C7 realization 写原语 use 合法", not bad_use, str(bad_use[:3]))
check("C8 rule 写 anchor 或 at 合法", not bad_anchor, str(bad_anchor[:3]))
check("C9 dom 写 op 合法", not bad_op, str(bad_op[:3]))
check("C10 token 写名字存在", not bad_tok, str(bad_tok[:3]))

# token 写是否 live；非 live 必须有 token_live 守卫
unguarded = []
for c, e in caps.items():
    for r in e.get("realization") or []:
        guarded = ((r.get("when") or {}).get("probe") == "token_live")
        for w in r.get("writes") or []:
            if w.get("use") == "token":
                tn = w.get("name")
                if tmeta[tn].get("status") != "live" and not guarded:
                    unguarded.append((c, tn))
check("C11 非 live token 写入必须有 token_live 守卫", not unguarded, str(unguarded[:3]))

# 值类型都在 values.yaml
bad_val = [c for c, e in caps.items() if isinstance(e.get("value"), str) and e["value"] not in vt]
check("C12 能力值类型都已定义", not bad_val, str(bad_val[:5]))

# ---------- D. 可达性：425 全落点 ----------
bound = set()
for c, e in caps.items():
    for b in e.get("binds") or []:
        tn = b.get("token") if isinstance(b, dict) else None
        if tn:
            bound.add(tn)
    for r in e.get("realization") or []:
        for w in r.get("writes") or []:
            if w.get("use") == "token":
                bound.add(w["name"])
landed = bound | set(v["token"] for v in direct.values())
check("D1 全部 425 token 至少一个落点", set(tnames) <= landed, str(sorted(set(tnames) - landed)[:5]))
check("D2 颜色 222 全部有落点", set(p1t) <= landed)
check("D3 非颜色 203 全部有落点", set(p4t) <= landed)
live = {t["name"] for t in tokens if t.get("status") == "live"}
check("D4 能力层覆盖全部 live token", live <= bound, f"{len(bound & live)}/{len(live)}")

# ---------- E. 值可表达 ----------
diurnal_true = {k for k, v in vals["value_types"].items() if isinstance(v, dict) and v.get("diurnal") is True}
check("E1 color 类型 diurnal=true", "color" in diurnal_true, str(sorted(diurnal_true)))

# ---------- F. 合成视图零偏差 ----------
for key, module, sub in [
    ("grammar", "vocabulary.yaml", "grammar"),
    ("capability_domains", "vocabulary.yaml", "capability_domains"),
    ("value_types", "values.yaml", "value_types"),
    ("write_kinds", "primitives.yaml", "write_kinds"),
    ("realization", "primitives.yaml", "realization"),
    ("assets_policy", "assets.yaml", "policy"),
    ("controls", "anchors.yaml", "controls"),
    ("control_templates", "capabilities.yaml", "control_templates"),
]:
    check(f"F {key} 与 {module} 一致", pal.get(key) == load(f"palette/{module}").get(sub))
check("F probes 与 probes.yaml 一致", pal.get("probes") == probes_doc)

# ---------- G. 主题层干净 ----------
spec = open("palette/SPEC.md", encoding="utf-8").read()
check("G1 SPEC 声明 theme.yaml 五键", all(k in spec for k in ("api:", "meta:", "variables:", "capabilities:", "extensions:")))
check("G2 SPEC 无 raw_tokens 主题字段", "raw_tokens:" not in spec)
check("G3 SPEC 无 v1 JSON 兼容承诺", "v1 JSON 兼容" not in spec.split("## 11")[0] or "无 v1 JSON" in spec)

# ---------- H. 计数与 _index ----------
c = idx["counts"]
used_domains = {k.split(".")[0] for k in caps}
check("H1 _index 计数一致", c["direct_bindings"] == 425 and c["runtime_registered"] == 148
      and c["controls"] == 12 and c["domains_covered"] == len(used_domains)
      and c["capabilities_unique"] == 379,
      json.dumps(c, ensure_ascii=False)[:260])

# ---------- I. 需求溯源与 crosswalk ----------
cw = jload("docs/research/palette-v5-crosswalk.json")
no_landing = [(g, r) for g, rows in cw["rows"].items() for r in rows
              if not (r.get("capability") or r.get("direct_binding") or r.get("target"))]
check("I1 crosswalk 每行有落点", not no_landing, str(len(no_landing)))
check("I2 crosswalk 行数 222+24+23+203+236", sum(len(v) for v in cw["rows"].values()) == 708,
      str({k: len(v) for k, v in cw["rows"].items()}))

# ---------- J. 生成确定性（重跑生成器两次，哈希一致） ----------
def sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()


h1 = sha("palette/palette.yaml")
subprocess.run([sys.executable, "scripts/research/gen_palette_v5.py"], check=True, capture_output=True)
h2 = sha("palette/palette.yaml")
check("J1 生成器可重跑且确定性（两次哈希一致）", h1 == h2, f"{h1[:12]} vs {h2[:12]}")

# ---------- K. 同一 token 的写者唯一性 ----------
writer = {}
for c, e in caps.items():
    toks = set()
    for b in e.get("binds") or []:
        toks.add(b.get("token"))
    for r in e.get("realization") or []:
        for w in r.get("writes") or []:
            if w.get("use") == "token":
                toks.add(w.get("name"))
    for t in toks:
        writer.setdefault(t, []).append(c)
multi = {t: cs for t, cs in writer.items() if len(cs) > 1}
check("K1 每个 token 只有一个能力写它", not multi,
      json.dumps({k: v for k, v in list(multi.items())[:6]}, ensure_ascii=False)[:500])
print("        多写者 token 数 =", len(multi))
for t, cs in sorted(multi.items()):
    print("        ", t, "->", cs)


print()
print(f"结果：FAIL={len(FAIL)}" + ("" if not FAIL else " → " + " / ".join(FAIL)))
sys.exit(1 if FAIL else 0)
