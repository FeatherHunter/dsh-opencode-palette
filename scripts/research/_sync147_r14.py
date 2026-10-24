# -*- coding: utf-8 -*-
"""第 14 轮收尾：更新 #147 body 数字与轮次；确认文件状态。"""
import io
import os
import subprocess

os.chdir(r"D:\dsh-plugin\dsh-opencode-palette")

# ---- 本地文件自检 ----
prim = io.open("palette/primitives.yaml", encoding="utf-8").read()
pal = io.open("palette/palette.yaml", encoding="utf-8").read()
idx = io.open("palette/_index.yaml", encoding="utf-8").read()
assert "raw_tokens" not in prim, "primitives 仍有 raw_tokens"
assert "raw_tokens" not in pal, "palette.yaml 仍有 raw_tokens"
assert "15 条样本" not in prim, "primitives 仍有 15 条样本"
assert "ownership.yaml" in chr(10).join(pal.split(chr(10))[:4]), "生成头缺 ownership"
assert "capabilities_synthesized: 321" in idx, "_index 缺 capabilities_synthesized"
print("local files OK")

# ---- #147 body ----
out = subprocess.run(["gh", "issue", "view", "147", "--repo", "FeatherHunter/dsh-opencode-palette",
                      "--json", "body", "-q", ".body"], capture_output=True, text=True, encoding="utf-8")
body = out.stdout
assert out.returncode == 0, out.stderr[:300]
body = body.replace("| P1–P5 第一性原理审计 | 50/50 PASS |", "| P1–P5 第一性原理审计 | 47/47 PASS |")
body = body.replace(
    "- [ ] 第 13 轮独立复核清零（第 12 轮：0 P0 / 5 P1 / 8 P2，v1.13 已修；第 13 轮进行中）",
    "- [ ] 第 15 轮独立复核清零（第 12 轮 0 P0/5 P1/8 P2、第 13 轮 0 P0/4 P1/7 P2、第 14 轮 0 P0/1 P1/9 P2，均已按 v1.13 收尾修正；第 15 轮复核待回）")
io.open(r"D:\Temp\b147_r14.md", "w", encoding="utf-8", newline="\n").write(body)
r = subprocess.run(["gh", "issue", "edit", "147", "--repo", "FeatherHunter/dsh-opencode-palette",
                    "--body-file", r"D:\Temp\b147_r14.md"], capture_output=True, text=True, encoding="utf-8")
print("issue147 edit rc", r.returncode, r.stderr[:200])

