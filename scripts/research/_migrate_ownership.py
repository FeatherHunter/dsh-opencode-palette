# -*- coding: utf-8 -*-
"""把生成器内硬编码的 ownership 常量迁到 palette/ownership.yaml，并改写生成器读取该模块。"""
import io
import re

import yaml

REPO = r"D:\dsh-plugin\dsh-opencode-palette"
gen_path = REPO + r"\scripts\research\gen_palette_v5.py"
src = io.open(gen_path, encoding="utf-8").read()

start = src.index("OWNERSHIP_MERGED = [")
end = src.index("for old, new in OWNERSHIP_RENAME.items():")
block = src[start:end]

ns = {}
exec(block, ns)
merged = ns["OWNERSHIP_MERGED"]
convert = ns["OWNERSHIP_CONVERT"]
drop = ns["OWNERSHIP_DROP"]
rename = ns["OWNERSHIP_RENAME"]

# merged 可能是 (id, owner) 元组列表
pairs = []
for item in merged:
    if isinstance(item, (list, tuple)):
        pairs.append([str(item[0]), str(item[1])])
    else:
        raise SystemExit(f"unexpected merged item {item!r}")

doc = {
    "api": 3,
    "description": "能力归属决策（v1.13）：哪些重复语义合并到哪条能力、哪些区域旋钮降级为规则层、哪些改名、哪些不设旋钮。palette.yaml 的 ownership 段直接来自本模块。",
    "merged": dict(pairs),
    "renamed": dict(rename),
    "dropped": dict(drop),
    "converted": convert,
}
out = REPO + r"\palette\ownership.yaml"
io.open(out, "w", encoding="utf-8", newline="\n").write(
    "# 能力归属策略（手写源）。改归属改这里，palette.yaml 由生成器合成。\n"
    + yaml.safe_dump(doc, allow_unicode=True, sort_keys=False, width=120)
)
print("wrote", out, "merged", len(pairs), "converted", len(convert), "dropped", len(drop), "renamed", len(rename))

# ---- 改写生成器：删常量块，改读模块 ----
new_block = '''ownership_doc = load("palette/ownership.yaml")
OWNERSHIP_MERGED = list(ownership_doc.get("merged", {}).items())
OWNERSHIP_CONVERT = dict(ownership_doc.get("converted", {}))
OWNERSHIP_DROP = dict(ownership_doc.get("dropped", {}))
OWNERSHIP_RENAME = dict(ownership_doc.get("renamed", {}))

'''
src = src[:start] + new_block + src[end:]
io.open(gen_path, "w", encoding="utf-8", newline="\n").write(src)
print("patched generator")
