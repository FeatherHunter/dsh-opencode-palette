# -*- coding: utf-8 -*-
"""把设计好的两套 37 色写成 src/custom-presets/ 的 IP 预置 JSON（单行、LF、无尾换行、键序同形）。"""
import json, os, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = HERE
tok = {m: json.load(open(os.path.join(OUT, "solved-%s.json" % m), encoding="utf-8"))["colors"] for m in ("light", "dark")}

ORDER = ["background", "backgroundElement", "backgroundPanel", "border", "borderActive",
         "bubbleBg", "codeBlockBg", "codeHeaderBg", "diffAdded", "diffAddedBg",
         "diffAddedLineNumberBg", "diffRemoved", "diffRemovedBg", "diffRemovedLineNumberBg",
         "error", "info", "inputBg", "markdownBlockQuote", "markdownCode", "markdownEmph",
         "markdownHeading", "markdownLink", "markdownStrong", "primary", "secondary",
         "sidebarBg", "success", "syntaxComment", "syntaxFunction", "syntaxKeyword",
         "syntaxNumber", "syntaxOperator", "syntaxString", "syntaxType", "text",
         "textMuted", "warning"]

now = datetime.datetime.now().astimezone().replace(microsecond=0).isoformat()

TARGETS = [
    ("genshin",        "原神",         "light", "light", "genshin"),
    ("genshin-night",  "原神 · 夜航",  "dark",  "dark",  "genshin-night"),
]

for pid, name, appearance, mode, base in TARGETS:
    t = tok[mode]
    assert set(ORDER) == set(t.keys()), set(ORDER) ^ set(t.keys())
    preset = {
        "appearance": appearance,
        "basePreset": base,
        "colors": {k: t[k] for k in ORDER},
        "id": pid,
        "name": name,
        "schema": "dsh-opencode-palette.custom-theme.v1",
        "updatedAt": now,
    }
    path = os.path.join(REPO, "src", "custom-presets", pid + ".json")
    blob = json.dumps(preset, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    with open(path, "wb") as fp:
        fp.write(blob.encode("utf-8"))          # 单行、无尾换行、无 CR
    print("written:", path, len(blob.encode('utf-8')), "bytes")
    for k in ORDER:
        print("   %-26s %s" % (k, preset["colors"][k]))
