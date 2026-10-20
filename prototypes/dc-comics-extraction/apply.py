# -*- coding: utf-8 -*-
"""apply.py — 把台账 palette.json 落盘成 src/custom-presets/dc-comics.json。

仓库同构：紧凑单行 JSON（无空格分隔符）、颜色键字母序、hex 大写、
顶层键序 appearance / basePreset / colors / id / name / schema / updatedAt。
id / name / appearance 三个字段不随配色改动而变。
"""
import collections
import io
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
TARGET = os.path.join(ROOT, "src", "custom-presets", "dc-comics.json")
STAMP = "2026-10-20T12:05:00+08:00"

pal = json.load(io.open(os.path.join(HERE, "palette.json"), encoding="utf-8"))
palette = pal["palette"] if "palette" in pal else pal

old = json.load(io.open(TARGET, encoding="utf-8"))
assert old["id"] == "dc-comics" and old["name"] == "DC" and old["appearance"] == "dark"

colors = {k: v["hex"].upper() for k, v in palette.items()}
assert len(colors) == 37, "色位数量应为 37，实得 %d" % len(colors)
assert set(colors) == set(old["colors"]), "色位集合与仓库不一致"

out = collections.OrderedDict()
out["appearance"] = old["appearance"]
out["basePreset"] = old["basePreset"]
out["colors"] = collections.OrderedDict((k, colors[k]) for k in sorted(colors))
out["id"] = old["id"]
out["name"] = old["name"]
out["schema"] = old["schema"]
out["updatedAt"] = STAMP

text = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
io.open(TARGET, "w", encoding="utf-8", newline="\n").write(text)
print("wrote %s (%d bytes)" % (TARGET, os.path.getsize(TARGET)))
