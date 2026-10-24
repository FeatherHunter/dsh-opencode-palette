# -*- coding: utf-8 -*-
import io

REPO = r"D:\dsh-plugin\dsh-opencode-palette"

p = REPO + r"\scripts\research\audit_p1p5.py"
s = io.open(p, encoding="utf-8").read()
s = s.replace('c["capabilities_unique"] == 379', 'c["capabilities_unique"] == 381')
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = REPO + r"\scripts\research\gen_palette_v5.py"
s = io.open(p, encoding="utf-8").read()
s = s.replace('        "dropped": ownership_dropped,',
              '        "dropped": {d["id"]: d["reason"] for d in ownership_dropped},')
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("patched")
