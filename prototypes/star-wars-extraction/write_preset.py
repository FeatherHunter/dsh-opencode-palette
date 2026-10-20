# -*- coding: utf-8 -*-
"""Write the redesigned star-wars IP preset, matching the repo's exact file shape:
single-line JSON, alphabetically sorted keys, UTF-8 no BOM, no trailing newline."""
import json
import os
from collections import OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
PRESET = os.path.join(os.path.dirname(os.path.dirname(HERE)), "src", "custom-presets", "star-wars.json")
PAL = json.load(open(os.path.join(HERE, "palette.json"), encoding="utf-8"))

colors = OrderedDict((k, PAL["colors"][k]) for k in sorted(PAL["colors"]))
obj = OrderedDict([
    ("appearance", "dark"),
    ("basePreset", "star-wars"),
    ("colors", colors),
    ("id", "star-wars"),
    ("name", "星球大战"),
    ("schema", "dsh-opencode-palette.custom-theme.v1"),
    ("updatedAt", "2026-10-20T10:25:00+08:00"),
])
line = json.dumps(obj, ensure_ascii=False, separators=(", ", ": "))
with open(PRESET, "w", encoding="utf-8", newline="") as fp:
    fp.write(line)
print("wrote", PRESET, os.path.getsize(PRESET), "bytes,", len(colors), "slots")
print("line ends with newline:", open(PRESET, "rb").read()[-1:] == b"\n")
