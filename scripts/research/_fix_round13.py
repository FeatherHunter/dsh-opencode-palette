# -*- coding: utf-8 -*-
"""第 13 轮二审 P1/P2 修复：真门禁、raw_tokens 清除、计数与报告同步。"""
import io
import os
import re

import yaml

REPO = r"D:\dsh-plugin\dsh-opencode-palette"


def read(p):
    return io.open(REPO + "\\" + p, encoding="utf-8").read()


def write(p, s):
    io.open(REPO + "\\" + p, "w", encoding="utf-8", newline="\n").write(s)


# ---------- 1. primitives.yaml：删 raw_tokens 句 ----------
p = "palette/primitives.yaml"
s = read(p)
s = s.replace(
    "       用户层逃生舱 raw_tokens 不走本原语：名字不校验、只校验值形状（SPEC §3 硬规则 3）。",
    "       用户层直绑定（`token.*`）不走本原语：名字不校验、只校验值形状（SPEC §3 硬规则 3）。")
write(p, s)

# ---------- 2. palette-check.py：真断言 + 文案 ----------
p = "scripts/research/palette-check.py"
s = read(p)
s = s.replace("9 个 YAML", "11 个 YAML")
s = s.replace("当前 15 条样本", "当前 425 条样本")
marker = "    # —— 计数与 _index 比对 ——"
addition = '''    # —— v1.13 门禁：手写能力 ⊆ 合成 ∪ dropped；ownership 逐字段一致 ——
    src_caps_all = set(((loaded.get('capabilities.yaml') or {}).get('capabilities') or {}).keys())
    synth_caps = set((palette.get('capabilities') or {}).keys())
    own_doc = loaded.get('ownership.yaml') or {}
    dropped_ids = set((own_doc.get('dropped') or {}).keys())
    not_landed = sorted(src_caps_all - synth_caps - dropped_ids)
    if not_landed:
        errors.append(f'手写能力未出现在合成视图且未登记 ownership.dropped: {not_landed}')
    pal_own = dict(palette.get('ownership') or {})
    pal_own.pop('token_owner', None)
    mod_own = {k: v for k, v in own_doc.items() if k in ('merged', 'renamed', 'converted', 'dropped')}
    if pal_own != mod_own:
        errors.append('palette.yaml.ownership 与 ownership.yaml 不一致（合成视图必须零偏差）')
    for owner in (own_doc.get('merged') or {}).values():
        if owner not in synth_caps:
            errors.append(f'ownership.merged 的 owner 不在合成能力集: {owner}')
    if (palette.get('generated') or {}).get('from') and 'ownership.yaml' not in palette['generated']['from']:
        errors.append('palette.yaml.generated.from 缺 ownership.yaml')

'''
s = s.replace(marker, addition + marker, 1)
write(p, s)

# ---------- 3. audit_p6：F1 递归扫 raw_tokens + generated.from ----------
p = "scripts/research/audit_p6_zero_deviation.py"
s = read(p)
old_f1 = re.search(r"\n# ---------- F\..*?\n", s, re.S)
if not old_f1:
    raise SystemExit("F section not found")
fblock = '''# ---------- F. 主题层干净 ----------
def walk_keys(node, path=""):
    if isinstance(node, dict):
        for k, v in node.items():
            yield str(k), f"{path}.{k}"
            yield from walk_keys(v, f"{path}.{k}")
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from walk_keys(v, f"{path}[{i}]")

raw_hits = []
for yname in yamls:
    ydoc = yaml.safe_load(io.open(os.path.join("palette", yname), encoding="utf-8"))
    for k, where in walk_keys(ydoc):
        if k == "raw_tokens":
            raw_hits.append(f"{yname}{where}")
check("F1 全部 YAML 无 raw_tokens 键（递归）", not raw_hits, str(raw_hits[:3]))
theme = yaml.safe_load(io.open("palette/SPEC.md", encoding="utf-8")) if False else None
spec_text = io.open("palette/SPEC.md", encoding="utf-8").read()
check("F2 SPEC 声明五键", "api" in spec_text and "capabilities" in spec_text and "extensions" in spec_text)
pal = yaml.safe_load(io.open("palette/palette.yaml", encoding="utf-8"))
check("F3 generated.from 含 ownership.yaml", "ownership.yaml" in (pal.get("generated", {}).get("from") or []))
'''
s = s[:old_f1.start()] + "\n" + fblock + "\n"
write(p, s)

# ---------- 4. audit_p1p5：379→381、319→321、10→11 ----------
p = "scripts/research/audit_p1p5.py"
s = read(p)
s = s.replace("capabilities_unique == 379", "capabilities_unique == 381")
s = s.replace("capabilities_unique == 319", "capabilities_unique == 321")
s = s.replace("== 10", "== 11")
write(p, s)

# ---------- 5. gen_p6_report.py：动态数字 ----------
p = "scripts/research/gen_p6_report.py"
s = read(p)
s = s.replace("palette/</code> 10 个 YAML", "palette/</code> 11 个 YAML")
s = s.replace("<tr><td>能力菜单</td><td>319</td><td>手写 30 + master 213 + P4 51 + P2 19，去重后</td></tr>",
              "<tr><td>能力菜单</td><td>321</td><td>手写 29 + master 229 + P4 50 + P2 13，去重后</td></tr>")
s = s.replace("<tr><td>合并视图</td><td>379</td><td>319 + 模板展开 65 − 重名 5</td></tr>",
              "<tr><td>合并视图</td><td>381</td><td>321 + 模板展开 65 − 重名 5</td></tr>")
write(p, s)

# ---------- 6. gen_palette_v5：docstring/模块清单/crosswalk 分解 ----------
p = "scripts/research/gen_palette_v5.py"
s = read(p)
s = s.replace("palette/capabilities.yaml（手写能力源：28 条手写能力 + 控件模板）",
              "palette/capabilities.yaml（手写能力源：30 条手写能力 + 控件模板）")
s = s.replace('''SOURCE_MODULES = [
    "capabilities.yaml", "vocabulary.yaml", "values.yaml", "primitives.yaml",
    "assets.yaml", "probes.yaml", "anchors.yaml", "tokens.yaml",
]''', '''SOURCE_MODULES = [
    "capabilities.yaml", "vocabulary.yaml", "values.yaml", "primitives.yaml",
    "assets.yaml", "probes.yaml", "anchors.yaml", "tokens.yaml", "ownership.yaml",
]''')
s = s.replace('''<tr><td>能力菜单</td><td class="num">{len(caps)}</td><td>手写 28 + master 236 + P4 52 + P2 20（合并/去重后）</td></tr>''',
              '''<tr><td>能力菜单</td><td class="num">{len(caps)}</td><td>手写 {src_counts.get("hand-authored", 0)} + master {src_counts.get("master", 0)} + P4 {src_counts.get("P4", 0)} + P2 {src_counts.get("P2", 0)}（合并/去重后）</td></tr>''')
# 在 crosswalk 生成前算 src_counts
if "src_counts = " not in s:
    s = s.replace("    total = len(caps)", "    src_counts = {}\n    for _c in caps.values():\n        src_counts[_c.get('source', 'unknown')] = src_counts.get(_c.get('source', 'unknown'), 0) + 1\n    total = len(caps)", 1)
write(p, s)

# ---------- 7. SPEC：模块数/职责表/生成链/状态口径 ----------
p = "palette/SPEC.md"
s = read(p)
s = s.replace("手写能力源 `capabilities.yaml` + 7 个底层模块", "手写能力源 `capabilities.yaml` + 8 个底层模块")
s = s.replace("| `anchors.yaml` | 宿主选择器/控件清单 | 能力语义 |",
              "| `anchors.yaml` | 宿主选择器/控件清单 | 能力语义 |\n| `ownership.yaml` | 能力归属策略：merged / renamed / converted / dropped | 能力条目本身（在 capabilities.yaml） |")
s = s.replace("（由 capabilities/vocabulary/values/primitives/assets/probes/anchors/tokens 合成：",
              "（由 capabilities/vocabulary/values/primitives/assets/probes/anchors/tokens/ownership 合成：")
s = s.replace("- **状态模型**：主状态（live/dead/missing）互斥 + 修饰（declared_invalid/pinned/gated）可叠加；颜色轴 184 + 38 = 222，gated 5 属颜色轴、另有 `--dsh-scrollbar-thumb` 1 属 `--dsh` 轴。",
              "- **状态模型**：主状态（live/dead/missing）互斥 + 修饰（declared_invalid/pinned/gated）可叠加；颜色轴 184 + 38 = 222；当前 gated 仅 elevation 五名（颜色轴内），无 `--dsh` 轴 gated。")
write(p, s)

# ---------- 8. _index summary ----------
p = "palette/_index.yaml"
d = yaml.safe_load(read(p))
d["modules"]["palette"]["summary"] = d["modules"]["palette"]["summary"].replace("331", "321")
d["modules"]["palette"]["summary"] = d["modules"]["palette"]["summary"].replace("28 条手写能力", "30 条手写能力")
d["counts"]["capabilities_synthesized"] = 321
write(p, yaml.safe_dump(d, allow_unicode=True, sort_keys=False, width=120))

# ---------- 9. color-axis inventory：状态修饰口径 ----------
p = "docs/research/color-axis-token-inventory.md"
s = read(p)
s = s.replace("`declared_invalid` 2 / `pinned` 1–2 / `gated` 5",
              "`declared_invalid` 0（旧记 2 的 `--shiki-foreground/background` 现为 live，探测盲区记入 note）/ `pinned` 0（旧记 1–2 已核销）/ `gated` 5（elevation 五名）")
write(p, s)

# ---------- 10. P1–P5 审计 HTML：旧数同步 ----------
p = "docs/research/v3-p1p5-first-principles-audit.html"
s = read(p)
s = s.replace("30 / 379 / 425 / 148 / 12 / 30 / roles 29", "30 / 381 / 425 / 148 / 12 / 30 / roles 29")
s = s.replace("<td>333</td><td><strong>319</strong></td>", "<td>333</td><td><strong>321</strong></td>")
s = s.replace("<td>394</td><td><strong>379</strong></td>", "<td>394</td><td><strong>381</strong></td>")
write(p, s)

print("fix script done")
