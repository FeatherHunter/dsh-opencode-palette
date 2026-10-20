# -*- coding: utf-8 -*-
"""把宝可梦主题落地到 src/custom-presets/pokemon.json（保持仓库既有文件格式）。"""
import io, json, os, shutil, datetime

REPO = r"D:\dsh-plugin\dsh-opencode-palette"
TGT = os.path.join(REPO, "src", "custom-presets", "pokemon.json")
SRC = r"D:\Temp\pokemon-theme-final\pokemon.json"
BAK = r"D:\Temp\pokemon-theme-final\other-session-pokemon.json.bak"

# 1) 备份仓库当前版本（可能是另一会话的工作成果，不能丢）
cur = io.open(TGT, encoding="utf-8").read()
io.open(BAK, "w", encoding="utf-8", newline="").write(cur)
print("已备份仓库现版本 ->", BAK, "(%d bytes)" % len(cur.encode("utf-8")))

# 2) 读我的配色，套用仓库既有文件格式（colors 键字母序、分隔符 ', ' / ': '、无尾换行）
mine = json.load(io.open(SRC, encoding="utf-8"))
colors = dict(sorted(mine["colors"].items()))
obj = {
    "appearance": mine["appearance"],
    "basePreset": mine["basePreset"],
    "colors": colors,
    "id": mine["id"],
    "name": mine["name"],
    "schema": mine["schema"],
    "updatedAt": "2026-10-20T11:30:00+08:00",
}
out = json.dumps(obj, ensure_ascii=False, separators=(", ", ": "))
io.open(TGT, "w", encoding="utf-8", newline="").write(out)
print("已写入", TGT, "(%d bytes)" % len(out.encode("utf-8")))
print("色位数:", len(colors))
assert len(colors) == 37, "色位数不对：%d" % len(colors)
print("37 个色位 ✓")
# 判尺豁免：8 个背景槽 + 4 个 diff 底槽 可同值；25 个设计角色必须两两不同
BG_SLOTS = {"background", "backgroundPanel", "backgroundElement", "sidebarBg", "bubbleBg",
            "inputBg", "codeBlockBg", "codeHeaderBg",
            "diffAddedBg", "diffAddedBg", "diffRemovedBg", "diffRemovedLineNumberBg"}
DESIGN = [k for k in colors if k not in BG_SLOTS]
dup = {}
for k in DESIGN:
    dup.setdefault(colors[k].lower(), []).append(k)
coll = {v: ks for v, ks in dup.items() if len(ks) > 1}
print("设计角色 %d 个，同值组: %s" % (len(DESIGN), coll if coll else "无 ✓"))
assert not coll, "设计角色存在同值：%s" % coll
