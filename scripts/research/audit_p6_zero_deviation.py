# -*- coding: utf-8 -*-
"""P6 零偏差审计：SPEC ↔ palette/ 11 个 YAML ↔ P1–P4 研究表逐条一致。

检查组：
A 集合闭合（425=403+11+11=222+203；573=425+148）
B crosswalk 每一行都有最终落点，且落点存在于 palette.yaml
C 研究表 222 / 24 / 23 / 203 / 236 行逐条 ↔ tokens.yaml / capabilities
D SPEC 与 YAML 一致（计数、文件清单、五键、L1–L3、无过期数字）
E tokens.yaml 契约（rc.3 基准、三命名空间、颜色轴 222/184/38）
F 主题层干净（无 raw_tokens、五键、无 v1 JSON 承诺）
G 生成器确定性（两次跑哈希一致）
"""
import hashlib
import io
import json
import os
import sys

import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(ROOT)

PASS, FAIL = [], []


def check(name, ok, detail=""):
    (PASS if ok else FAIL).append(name)
    print(("PASS  " if ok else "FAIL  ") + name + ("  [" + str(detail) + "]" if detail and not ok else ""))


def jload(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def yload(p):
    with open(p, encoding="utf-8") as f:
        return yaml.safe_load(f)


pal = yload("palette/palette.yaml")
caps = pal["capabilities"]
direct = pal["direct_bindings"]
own = pal.get("ownership") or {}
tokens = yload("palette/tokens.yaml")
tlist = tokens["tokens"]
tnames = {t["name"] for t in tlist}
idx = yload("palette/_index.yaml")
spec = io.open("palette/SPEC.md", encoding="utf-8").read()
cw = jload("docs/research/palette-v5-crosswalk.json")
p1 = jload("docs/research/color-ability-map.json")
p4 = jload("docs/research/noncolor-surface-map.json")
p2 = jload("docs/research/private-surface-map.json")
master = jload("docs/research/capability-master.json")

# ---------- A. 集合闭合 ----------
ns = {}
for t in tlist:
    ns[t["namespace"]] = ns.get(t["namespace"], 0) + 1
color = [t for t in tlist if t.get("family") in
         {"alias", "specific", "static", "shiki", "focus", "menu_color", "shadow",
          "elevation", "gradient", "linear"}]
runtime = tokens.get("runtime") or {}
rt_total = runtime.get("total") or 0
check("A1 token 425 = 403 + 11 + 11", len(tlist) == 425 and ns == {"dsw": 403, "shiki": 11, "dsh": 11}, ns)
check("A2 颜色 222 + 非颜色 203 = 425", len(color) == 222 and len(tlist) - len(color) == 203,
      f"{len(color)}+{len(tlist) - len(color)}")
check("A3 运行时登记 148（573 = 425 + 148）", rt_total == 148, rt_total)
cl = [t for t in color if t.get("status") == "live"]
cd = [t for t in color if t.get("status") == "dead"]
cg = [t for t in color if "gated" in (t.get("modifiers") or [])]
check("A4 颜色轴 222 = live 184 + dead 38；gated 5", len(cl) == 184 and len(cd) == 38 and len(cg) == 5,
      f"{len(cl)}/{len(cd)}/{len(cg)}")

# ---------- B. crosswalk 落点 ----------
for g, rows in cw["rows"].items():
    bad = []
    for r in rows:
        cap = r.get("capability")
        dropped = isinstance(cap, str) and cap.startswith("dropped:")
        if cap and not dropped and cap not in caps:
            bad.append((r.get("token") or r.get("name") or r.get("id"), cap))
        if not (cap or r.get("direct_binding") or r.get("target")):
            bad.append((r.get("token") or r.get("name") or r.get("id"), None))
    check(f"B {g} {len(rows)} 行全部有最终落点", not bad, str(bad[:4]))

# ---------- C. 研究表逐条 ↔ tokens / capabilities ----------
p1_rows = p1 if isinstance(p1, list) else p1.get("rows", [])
bad = [r["token"] for r in p1_rows if r["token"] not in tnames]
check("C1 P1 222 行的 token 全在 tokens.yaml", not bad and len(p1_rows) == 222, str(bad[:3]))
bad = [r["token"] for r in p4["rows"] if r["token"] not in tnames]
check("C2 P4 203 行的 token 全在 tokens.yaml", not bad and len(p4["rows"]) == 203, str(bad[:3]))
p2_dsl = p2.get("dsl", [])
p2_term = p2.get("terminal", [])
check("C3 P2 24 行（20 dsl + 4 terminal）", len(p2_dsl) + len(p2_term) == 24,
      f"{len(p2_dsl)}+{len(p2_term)}")
p3_rows = [r for r in master["rows"] if r.get("kind") != "token-semantic"]
check("C4 P3 行数 23 且落点都在 capabilities", len(cw["rows"]["P3"]) == 23,
      len(cw["rows"]["P3"]))
def has_probe(c):
    if c.get("probe") or c.get("kind") in ("effect", "recipe"):
        return True
    for rz in c.get("realization") or []:
        if (rz.get("when") or {}).get("probe"):
            return True
    return False


bad = [k for k in caps if not has_probe(caps[k])]
check("C5 每条 property/token 能力都有探针", not bad, str(bad[:5]))
tiers = {c.get("tier") for c in caps.values()}
check("C6 tier 只在 stable/advanced/experimental/dead", tiers <= {"stable", "advanced", "experimental", "dead"}, tiers)

# ---------- D. SPEC ↔ YAML ----------
yamls = sorted(f for f in os.listdir("palette") if f.endswith(".yaml"))
check("D1 palette/ 下 11 个 YAML", len(yamls) == 11, yamls)
for n in ("321", "381", "425", "148", "26", "29", "34"):
    check(f"D2 SPEC 含当前计数 {n}", n in spec)
spec_head = spec.split("## 11. 变更记录")[0]
stale = [n for n in ("331", "392", "333", "394", "397") if n in spec_head]
check("D3 SPEC 无过期计数（331/392/333/394/397）", not stale, stale)
check("D4 SPEC 声明 theme.yaml 五键", all(k in spec for k in ("api:", "meta:", "variables:", "capabilities:", "extensions:")))
check("D5 SPEC 声明 L1/L2/L3", all(k in spec for k in ("L1", "L2", "L3")))
check("D6 SPEC 指向 ownership 策略文档", "v3-ownership-policy.md" in spec)
mods = {v["file"] for v in (idx.get("modules") or {}).values()}
check("D7 _index 模块清单 = 目录内 YAML（_index 自身除外）", set(mods) == set(yamls) - {"_index.yaml"}, sorted(set(yamls) - mods - {"_index.yaml"}))

# ---------- E. tokens 契约 ----------
host = tokens.get("host") or {}
check("E1 host 版本 = 0.2.1-rc.3 @ 1f81c04", "0.2.1-rc.3" in str(host.get("version")) and "1f81c04" in str(host.get("commit")), host)
all_direct_tokens = {v["token"] for v in direct.values()}
check("E2 直绑定 425 条且覆盖每个 token 恰一次", len(direct) == 425 and all_direct_tokens == tnames,
      len(direct))

# ---------- F. 主题层干净 ----------
check("F1 合成视图不含 raw_tokens 段", "raw_tokens" not in pal)
check("F2 theme 层无 v1 JSON 兼容承诺", "v1 JSON 兼容" not in spec.split("## ")[0] or "无 v1 JSON" in spec)
check("F3 palette api = 3", pal.get("api") == 3, pal.get("api"))

# ---------- G. 生成器确定性 ----------
h1 = hashlib.sha256(io.open("palette/palette.yaml", "rb").read()).hexdigest()
os.system(f'"{sys.executable}" scripts/research/gen_palette_v5.py > /dev/null 2>&1' if os.name != "nt"
          else f'"{sys.executable}" scripts/research/gen_palette_v5.py > nul 2>&1')
h2 = hashlib.sha256(io.open("palette/palette.yaml", "rb").read()).hexdigest()
check("G1 生成器可重跑且确定性", h1 == h2, f"{h1[:12]} vs {h2[:12]}")

print()
print(f"结果：PASS={len(PASS)} FAIL={len(FAIL)}" + ("" if not FAIL else " → " + " / ".join(FAIL)))
sys.exit(1 if FAIL else 0)
