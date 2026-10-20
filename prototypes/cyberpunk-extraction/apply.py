# -*- coding: utf-8 -*-
"""⑥ 落盘：把 palette.json 的 37 色位写进 src/custom-presets/cyberpunk-2077.json"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cp_core import PKG, REPO

pal = json.load(open(os.path.join(PKG, "palette.json"), encoding="utf-8"))["colors"]
ORDER = ["background", "backgroundElement", "backgroundPanel", "border", "borderActive", "bubbleBg",
 "codeBlockBg", "codeHeaderBg", "diffAdded", "diffAddedBg", "diffAddedLineNumberBg", "diffRemoved",
 "diffRemovedBg", "diffRemovedLineNumberBg", "error", "info", "inputBg", "markdownBlockQuote",
 "markdownCode", "markdownEmph", "markdownHeading", "markdownLink", "markdownStrong", "primary",
 "secondary", "sidebarBg", "success", "syntaxComment", "syntaxFunction", "syntaxKeyword",
 "syntaxNumber", "syntaxOperator", "syntaxString", "syntaxType", "text", "textMuted", "warning"]
assert len(ORDER) == 37 and set(ORDER) == set(pal), "槽位不匹配"
doc = {"appearance": "dark", "basePreset": "cyberpunk-2077",
       "colors": {k: pal[k] for k in ORDER},
       "id": "cyberpunk-2077", "name": "赛博朋克 2077",
       "schema": "dsh-opencode-palette.custom-theme.v1",
       "updatedAt": "2026-10-20T11:25:00+08:00"}
out = os.path.join(REPO, "src", "custom-presets", "cyberpunk-2077.json")
with open(out, "w", encoding="utf-8", newline="\n") as f:
    f.write(json.dumps(doc, ensure_ascii=False, separators=(", ", ": ")) + "\n")
print("→ %s（%d 槽）" % (out, len(doc["colors"])))
