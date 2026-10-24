# -*- coding: utf-8 -*-
import io
import subprocess

p = r"D:\Temp\b147.md"
s = io.open(p, encoding="utf-8").read()
s2 = s.replace("`palette/` 10 个 YAML", "`palette/` 11 个 YAML")
print("changed", s2 != s)
io.open(p, "w", encoding="utf-8", newline="\n").write(s2)
r = subprocess.run(["gh", "issue", "edit", "147", "--repo", "FeatherHunter/dsh-opencode-palette",
                    "--body-file", p], capture_output=True, text=True, encoding="utf-8")
print("rc", r.returncode)
