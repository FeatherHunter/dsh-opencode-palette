# -*- coding: utf-8 -*-
"""v1.13 计数同步（321/381/11 YAML）+ audit C5 recipe 豁免 + audit D2 期望值。"""
import io

REPO = r"D:\dsh-plugin\dsh-opencode-palette"

p = REPO + r"\palette\SPEC.md"
s = io.open(p, encoding="utf-8").read()
s = s.replace("`capabilities`（319）∪ `control_templates × controls` 展开（65，去重 5） = **379 条唯一能力**",
              "`capabilities`（321）∪ `control_templates × controls` 展开（65，去重 5） = **381 条唯一能力**")
s = s.replace("capabilities（319）+ direct_bindings（425）", "capabilities（321）+ direct_bindings（425）")
s = s.replace("**合并视图里登记过的能力 id**（379 条", "**合并视图里登记过的能力 id**（381 条")
s = s.replace("| L2 | 语义能力菜单（合并视图 379 条 = 319 条能力 + 65 条模板展开 − 5 条重名；按 34 个能力域分组） |",
              "| L2 | 语义能力菜单（合并视图 381 条 = 321 条能力 + 65 条模板展开 − 5 条重名；按 34 个能力域分组） |")
s = s.replace("1. `palette/` 10 个 YAML 全部解析", "1. `palette/` 11 个 YAML 全部解析")
s = s.replace("`capabilities_unique`=379", "`capabilities_unique`=381")
# v1.12 变更记录是历史，保留 319；只确保 321 行存在
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = REPO + r"\scripts\research\audit_p6_zero_deviation.py"
s = io.open(p, encoding="utf-8").read()
s = s.replace('    if c.get("probe") or c.get("kind") == "effect":',
              '    if c.get("probe") or c.get("kind") in ("effect", "recipe"):')
s = s.replace('for n in ("319", "379", "425", "148", "26", "29", "34"):',
              'for n in ("321", "381", "425", "148", "26", "29", "34"):')
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("done")
