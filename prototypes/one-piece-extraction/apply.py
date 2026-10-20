# -*- coding: utf-8 -*-
"""apply.py — 把校验通过的主题写成 src/custom-presets/one-piece.json（单行、键字母序）。"""
import json, os, sys

PAL = json.load(open(r"D:\Temp\onepiece-theme\palette.json", encoding="utf-8"))
REPO = r"D:\dsh-plugin\dsh-opencode-palette"
TARGET = os.path.join(REPO, "src", "custom-presets", "one-piece.json")

mode = sys.argv[1] if len(sys.argv) > 1 else "apply"

if mode == "apply":
    theme = {
        "appearance": "light",
        "basePreset": "one-piece",
        "colors": dict(sorted(PAL["colors"].items())),
        "id": "one-piece",
        "name": "海贼王",
        "schema": "dsh-opencode-palette.custom-theme.v1",
        "updatedAt": "2026-10-20T10:45:00+08:00",
    }
    body = json.dumps(theme, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    with open(TARGET, "w", encoding="utf-8", newline="") as f:
        f.write(body)
    print("wrote", TARGET, len(body), "bytes")
    print("slots:", len(theme["colors"]))

