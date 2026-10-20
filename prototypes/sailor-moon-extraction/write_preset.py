# -*- coding: utf-8 -*-
"""把台账写成仓库预置主题文件（与 src/custom-presets/ 其余文件同形：单行、键字典序、hex 小写）。"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_palette as bp

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(os.path.dirname(HERE)), "src", "custom-presets", "sailor-moon.json")

colors = {k: v.lower() for k, v in {r["token"]: r["value"] for r in bp.LEDGER}.items()}
preset = {
    "appearance": "light",
    "basePreset": "sailor-moon",
    "colors": dict(sorted(colors.items())),
    "id": "sailor-moon",
    "name": "美少女战士",
    "schema": "dsh-opencode-palette.custom-theme.v1",
    "updatedAt": "2026-10-20T10:45:00+08:00",
}
line = json.dumps(preset, ensure_ascii=False, sort_keys=True, separators=(", ", ": "))
# colors 内部已是字典序；json.dumps(sort_keys=True) 也会重排，一致
with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
    fh.write(line + "\n")
print("written:", OUT, os.path.getsize(OUT), "bytes")
print(line[:200], "...")
