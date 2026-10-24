# -*- coding: utf-8 -*-
"""修 checker FILES/文案、_index ownership 版本与计数、audit 的 YAML 数量断言。"""
import io
import re

import yaml

REPO = r"D:\dsh-plugin\dsh-opencode-palette"

# 1) checker FILES + 文案
p = REPO + r"\scripts\research\palette-check.py"
s = io.open(p, encoding="utf-8").read()
if "'ownership.yaml'," not in s:
    s = s.replace("    'anchors.yaml',\n]", "    'anchors.yaml',\n    'ownership.yaml',\n]")
s = s.replace("不在 10 个 YAML 内", "不在 FILES 注册清单内")
s = s.replace("`_index` modules 文件必须在 10 个 YAML 内", "`_index` modules 文件必须在 FILES 注册清单内")
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

# 2) _index：ownership version、计数 381、capabilities summary 30
p = REPO + r"\palette\_index.yaml"
d = yaml.safe_load(io.open(p, encoding="utf-8"))
d["counts"]["capabilities_unique"] = 381
d["modules"]["ownership"]["version"] = "3.0.0"
d["modules"]["capabilities"]["summary"] = "手写能力源——30 条手写能力 + 控件模板 + api/palette_version；改能力改这里"
io.open(p, "w", encoding="utf-8", newline="\n").write(
    yaml.safe_dump(d, allow_unicode=True, sort_keys=False, width=120)
)

# 3) audit：YAML 数量断言（10 → 11）
p = REPO + r"\scripts\research\audit_p6_zero_deviation.py"
s = io.open(p, encoding="utf-8").read()
s = s.replace('"""P6 零偏差审计：SPEC ↔ palette/ 10 个 YAML', '"""P6 零偏差审计：SPEC ↔ palette/ 11 个 YAML')
s = s.replace('check("D1 palette/ 下 10 个 YAML", len(yamls) == 10, yamls)',
              'check("D1 palette/ 下 11 个 YAML", len(yamls) == 11, yamls)')
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("fixed")
