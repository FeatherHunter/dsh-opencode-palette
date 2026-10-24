# -*- coding: utf-8 -*-
"""修正 _index tokens/anchors 的 version 字段（语义版本），宿主版本移到 host 字段。"""
import io
import os

os.chdir(r"D:\dsh-plugin\dsh-opencode-palette")
p = "palette/_index.yaml"
s = io.open(p, encoding="utf-8").read()

old_tokens = "    version: dsh 0.2.1-rc.3 @ 1f81c04（rc.3 主题面与 rc.2 逐字节相同）"
new_tokens = "    version: 3.0.0\n    host: dsh 0.2.1-rc.3 @ 1f81c04（rc.3 主题面与 rc.2 逐字节相同）"
assert old_tokens in s, "tokens version not found"
s = s.replace(old_tokens, new_tokens, 1)

old_anchors = "    version: dsh 0.2.1-rc.3 @ 1f81c04（anchors 清单为人工核对，rc.3 无锚点变化）"
new_anchors = "    version: 3.0.0\n    host: dsh 0.2.1-rc.3 @ 1f81c04（anchors 清单为人工核对，rc.3 无锚点变化）"
assert old_anchors in s, "anchors version not found"
s = s.replace(old_anchors, new_anchors, 1)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("patched", p)
