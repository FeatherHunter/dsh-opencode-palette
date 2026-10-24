# -*- coding: utf-8 -*-
"""P1/P2 机械修复：tier 词表、recipe 保留、SPEC/README/_index 数字与指针、checker 断言。"""
import io
import re

import yaml

REPO = r"D:\dsh-plugin\dsh-opencode-palette"

# ---------- 1. capabilities.yaml：tier 词表 basic→stable / expert→advanced ----------
p = REPO + r"\palette\capabilities.yaml"
s = io.open(p, encoding="utf-8").read()
n_basic = len(re.findall(r"(?m)^(\s*)tier: basic$", s))
n_expert = len(re.findall(r"(?m)^(\s*)tier: expert$", s))
s = re.sub(r"(?m)^(\s*)tier: basic$", r"\1tier: stable", s)
s = re.sub(r"(?m)^(\s*)tier: expert$", r"\1tier: advanced", s)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("tier fixed basic", n_basic, "expert", n_expert)

# ---------- 2. 生成器：recipe 保留 + tier 严格校验 ----------
p = REPO + r"\scripts\research\gen_palette_v5.py"
s = io.open(p, encoding="utf-8").read()

s = s.replace(
    '    e["tier"] = {"basic": "stable"}.get(e.get("tier"), e.get("tier", "stable"))\n',
    '    e["tier"] = e.get("tier", "stable")\n'
    '    if e["tier"] not in ("stable", "advanced", "experimental", "dead"):\n'
    '        raise SystemExit("capability " + cid + ": tier 不在四档: " + repr(e["tier"]))\n',
)
s = s.replace(
    '    if e.get("kind") in ("property", "recipe") and not e.get("realization") and not e.get("binds"):\n        caps.pop(cid)',
    '    if (e.get("kind") in ("property", "recipe") and not e.get("realization")\n'
    '            and not e.get("binds") and not e.get("aspects")):\n        caps.pop(cid)',
)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("generator fixed")

# ---------- 3. SPEC v1.13 ----------
p = REPO + r"\palette\SPEC.md"
s = io.open(p, encoding="utf-8").read()
s = s.replace(
    "- 状态：**P5 定稿（2026-10-24，v1.12）**。决策来源 = #147「讨论：Token 模型与「全量」边界」，已过九轮独立对抗式二审（v1.1 → v1.10）与 P1–P4 逐技术组讨论。",
    "- 状态：**P6 定稿（2026-10-24，v1.13）**。决策来源 = #147「讨论：Token 模型与「全量」边界」；已过 P1–P5 逐技术组讨论、P6 零偏差审计（34/34），并经第 12 轮独立对抗式二审（2026-10-24，发现 5 P1 + 8 P2，已按 v1.13 修正）。",
)
s = s.replace("  capabilities.yaml             手写能力源（28 条手写能力 + 控件模板）← 人工维护入口",
              "  capabilities.yaml             手写能力源（30 条手写能力 + 控件模板）← 人工维护入口")
s = s.replace("  ownership.yaml",
              "  ownership.yaml")
if "ownership.yaml" not in s:
    s = s.replace("  palette.yaml",
                  "  ownership.yaml                能力归属策略（merged / renamed / converted / dropped）\n  palette.yaml")
s = s.replace("- 字段细节（`meta` 子字段、license、hostContract 等）与 `api` 最终编号：由 #140 承接（本票只定承载格式与概念集合）。",
              "- 字段细节（`meta` 子字段、license 等）：2026-10-24 起由本 SPEC §3 固定；后续调整走 §11 变更记录（#140 已关闭，字段清单以本文件为唯一真源）。")
s = s.replace("- #147 裁定记录（U1–U22）：全量收录（C1–C5 × A–F）、可达=编辑器+手写、预览区、区模型、变量表保留、入口层级、三级 tier、扩展层、主题来源两类、变量 $ref、多语言字体、V3 一次做全、主题包目录、只有 YAML、内置+本地、字段 6 键、别名链、严格拒收、不做 reduced-motion、本票只定承载格式、六条验收、技术自检归我方、5 条增量设计逐条裁定。",
              "- #147 裁定记录（U1–U22）：全量收录（C1–C5 × A–F）、可达=编辑器+手写、预览区、区模型、变量表保留、入口层级、三级 tier、扩展层、主题来源两类、变量 $ref、多语言字体、V3 一次做全、主题包目录、只有 YAML、内置+本地、theme.yaml **五键**（api/meta/variables/capabilities/extensions）、别名链、严格拒收、不做 reduced-motion、本票只定承载格式、六条验收、技术自检归我方。")
# 追加 v1.13 变更记录
if "v1.13" not in s.split("## 11. 变更记录")[-1]:
    s = s.rstrip() + "\n- 2026-10-24 v1.13（P6 定稿）：`ownership` 策略从生成器硬编码迁到 `palette/ownership.yaml` 模块（merged 10 / renamed 4 / converted 9 / dropped 2），合成视图不再产生新事实；两条 recipe 能力（`composer.glass`、`menu.surface.glass`）保留进合成能力集；tier 词表统一为 stable/advanced/experimental/dead；`capabilities.yaml` 手写能力 30 条、合成能力 321 条；第 12 轮独立二审的 5 P1 + 8 P2 已修。\n"
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("SPEC updated")

# ---------- 4. README ----------
p = REPO + r"\palette\README.md"
s = io.open(p, encoding="utf-8").read()
s = s.replace("**手写能力源**：28 条手写能力", "**手写能力源**：30 条手写能力")
s = s.replace("`capabilities`（331 条）", "`capabilities`（合成条数以 `_index.yaml` 为准）")
s = s.replace("- `_merged.yaml`：合并视图，给人和 AI 通读（不参与校验）",
              "- `palette.yaml`：合并视图，给人和 AI 通读（由 `scripts/research/gen_palette_v5.py` 生成，不手改）")
if "ownership.yaml" not in s:
    s = s.replace("| `palette.yaml` |", "| `ownership.yaml` | 能力归属策略：merged / renamed / converted / dropped | 手写 |\n| `palette.yaml` |")
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("README updated")

# ---------- 5. _index.yaml ----------
p = REPO + r"\palette\_index.yaml"
d = yaml.safe_load(io.open(p, encoding="utf-8"))
d["counts"]["capabilities_authored"] = 30
d["counts"]["capabilities_unique"] = 321
d["modules"]["ownership"] = {
    "file": "ownership.yaml",
    "kind": "policy",
    "generated": False,
    "summary": "能力归属策略——merged 10 / renamed 4 / converted 9 / dropped 2；palette.yaml 的 ownership 段来自本模块",
}
if "ownership" not in d["requires"].get("capabilities", []):
    pass
d["artifacts"] = {
    "palette": "palette/palette.yaml",
    "crosswalk": "docs/research/palette-v5-crosswalk.json",
    "capability_master": "docs/research/capability-master.json",
}
d["modules"]["anchors"]["version"] = "dsh 0.2.1-rc.3 @ 1f81c04（anchors 清单为人工核对，rc.3 无锚点变化）"
io.open(p, "w", encoding="utf-8", newline="\n").write(
    yaml.safe_dump(d, allow_unicode=True, sort_keys=False, width=120)
)
print("index updated")

# ---------- 6. checker：FILES + 断言 + 标签 ----------
p = REPO + r"\scripts\research\palette-check.py"
s = io.open(p, encoding="utf-8").read()
if '"palette/ownership.yaml"' not in s:
    s = s.replace('"palette/capabilities.yaml"', '"palette/capabilities.yaml",\n    "palette/ownership.yaml"', 1)
s = s.replace("print(f'能力（手写）      = {len(caps)}')", "print(f'能力（合成）      = {len(caps)}')")
marker = "# ---------- 展开 id"
addition = '''# ---------- 手写能力 id ⊆ 合成能力 ∪ ownership.dropped（v1.13 二审 P1-5）----------
_hand = load(REPO / "palette/capabilities.yaml").get("capabilities", {})
_owned = load(REPO / "palette/ownership.yaml")
_dropped_ids = set((_owned.get("dropped") or {}).keys())
_pal = load(REPO / "palette/palette.yaml")
_pal_caps = set((_pal.get("capabilities") or {}).keys())
_missing = sorted(set(_hand) - _pal_caps - _dropped_ids)
if _missing:
    err(f"手写能力未出现在合成视图且未登记 ownership.dropped: {_missing}")

'''
if "ownership.dropped（v1.13" not in s:
    s = s.replace(marker, addition + marker, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("checker updated")
