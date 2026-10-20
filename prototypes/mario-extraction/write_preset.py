# -*- coding: utf-8 -*-
"""写马里奥 IP 预置（浅色 1-1 白昼 + 深色 1-2 夜行）两个 JSON。

沿用仓库既有文件形状：单行 JSON / 字母序 / UTF-8 无 BOM / 无尾换行
（与 src/custom-presets/harry-potter.json 一致，由 tests/ip-presets.test.ts 与
scripts/build-client.ts 的 JSON 内联共同依赖）。
"""
import json
import os
from collections import OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
PRESET_DIR = os.path.join(ROOT, "src", "custom-presets")
PAL = json.load(open(os.path.join(HERE, "palette.json"), encoding="utf-8"))

TARGETS = [
    ("mario", "light", "超级马里奥", "2026-10-20T10:30:00+08:00"),
    ("mario-night", "dark", "超级马里奥 · 夜行", "2026-10-20T10:30:00+08:00"),
]

for pid, appearance, title, updated in TARGETS:
    colors = OrderedDict((k, PAL[appearance]["colors"][k]) for k in sorted(PAL[appearance]["colors"]))
    obj = OrderedDict([
        ("appearance", appearance),
        ("basePreset", pid),
        ("colors", colors),
        ("id", pid),
        ("name", title),
        ("schema", "dsh-opencode-palette.custom-theme.v1"),
        ("updatedAt", updated),
    ])
    path = os.path.join(PRESET_DIR, pid + ".json")
    line = json.dumps(obj, ensure_ascii=False, separators=(", ", ": "))
    with open(path, "w", encoding="utf-8", newline="") as fp:
        fp.write(line)
    raw = open(path, "rb").read()
    print("wrote %-46s %6d bytes, %2d slots, 尾换行=%s, BOM=%s"
          % (path, len(raw), len(colors), raw[-1:] == b"\n", raw[:3] == b"\xef\xbb\xbf"))
