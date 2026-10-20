# -*- coding: utf-8 -*-
"""write_preset.py — 把 palette.json 的 37 色位写进 src/custom-presets/transformers.json。

与仓库既有 IP 预设完全同形：单行 JSON / 键字母序 / UTF-8 无 BOM / 无尾换行。
默认不写；需要落库时显式执行 `python write_preset.py`。
"""
import json
import os
from collections import OrderedDict
from datetime import datetime, timezone, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
PRESET = os.path.join(REPO, "src", "custom-presets", "transformers.json")
PAL = json.load(open(os.path.join(HERE, "palette.json"), encoding="utf-8"))

if PAL["audit"]["hardFails"] or PAL["audit"]["uiFails"] or PAL["audit"]["designWarnings"] \
        or PAL["audit"]["recipeFails"]:
    raise SystemExit("审计未全绿，拒绝写库：%s" % json.dumps(
        {k: PAL["audit"][k] for k in ("hardFails", "uiFails", "designWarnings", "recipeFails")},
        ensure_ascii=False))

# diff 底色必须是不透明的 6 位 hex（src/engine/map-dsh.ts：这 4 个槽 allowTransparent:false）
for k in ("diffAddedBg", "diffRemovedBg", "diffAddedLineNumberBg", "diffRemovedLineNumberBg"):
    if len(PAL["colors"][k].lstrip("#")) != 6:
        raise SystemExit("%s 必须是 6 位不透明 hex，实际 %s" % (k, PAL["colors"][k]))

colors = OrderedDict((k, PAL["colors"][k]) for k in sorted(PAL["colors"]))
stamp = datetime.now(timezone(timedelta(hours=8))).replace(microsecond=0).isoformat()
obj = OrderedDict([
    ("appearance", "dark"),
    ("basePreset", "transformers"),
    ("colors", colors),
    ("id", "transformers"),
    ("name", "变形金刚"),
    ("schema", "dsh-opencode-palette.custom-theme.v1"),
    ("updatedAt", stamp),
])
line = json.dumps(obj, ensure_ascii=False, separators=(", ", ": "))
with open(PRESET, "w", encoding="utf-8", newline="") as fp:
    fp.write(line)
print("wrote", PRESET, os.path.getsize(PRESET), "bytes,", len(colors), "slots")
print("line ends with newline:", open(PRESET, "rb").read()[-1:] == b"\n")
