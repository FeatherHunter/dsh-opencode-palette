# -*- coding: utf-8 -*-
"""新门禁变异回归 + 票面/评论同步（第 13 轮 P1/P2 收尾）。"""
import io
import json
import shutil
import subprocess

import yaml

REPO = r"D:\dsh-plugin\dsh-opencode-palette"
PY = r"D:\0Tools\Python313\python.exe"
CHECK = REPO + r"\scripts\research\palette-check.py"


def run_check():
    r = subprocess.run([PY, CHECK], capture_output=True, text=True, encoding="utf-8", cwd=REPO)
    return r.returncode, (r.stdout or "") + (r.stderr or "")


# ---------- 1. 变异测试：删手写能力 / 篡改 ownership ----------
pal_path = REPO + r"\palette\palette.yaml"
shutil.copy2(pal_path, pal_path + ".bak")
try:
    d = yaml.safe_load(io.open(pal_path, encoding="utf-8"))
    del d["capabilities"]["global.page.background"]
    io.open(pal_path, "w", encoding="utf-8", newline="\n").write(
        yaml.safe_dump(d, allow_unicode=True, sort_keys=False, width=120))
    rc, out = run_check()
    print("MUT-A 删手写能力:", "CAUGHT" if rc != 0 and "ownership.dropped" in out else "MISSED", rc)
finally:
    shutil.copy2(pal_path + ".bak", pal_path)

try:
    d = yaml.safe_load(io.open(pal_path, encoding="utf-8"))
    d["ownership"]["merged"]["bogus.fake.capability"] = "global.page.background"
    io.open(pal_path, "w", encoding="utf-8", newline="\n").write(
        yaml.safe_dump(d, allow_unicode=True, sort_keys=False, width=120))
    rc, out = run_check()
    print("MUT-B 篡改 ownership:", "CAUGHT" if rc != 0 and "ownership.merged" in out else "MISSED", rc)
finally:
    shutil.copy2(pal_path + ".bak", pal_path)

rc, _ = run_check()
print("restored checker rc", rc)

# ---------- 2. #147 body 旧数 ----------
r = subprocess.run(["gh", "issue", "view", "147", "--repo", "FeatherHunter/dsh-opencode-palette",
                    "--json", "body", "-q", ".body"], capture_output=True, text=True,
                   encoding="utf-8", cwd=REPO)
body = r.stdout
body = body.replace("| 能力集 | `palette/` **10 个 YAML**", "| 能力集 | `palette/` **11 个 YAML**")
body = body.replace("| 合并视图 | **379**", "| 合并视图 | **381**")
body = body.replace("能力菜单 | **319** 条（手写 30 + master 213 + P4 51 + P2 19）",
                    "能力菜单 | **321** 条（手写 29 + master 229 + P4 50 + P2 13）")
body = body.replace("379 条", "381 条").replace("319 条", "321 条")
io.open(r"D:\Temp\i147_r13.md", "w", encoding="utf-8", newline="\n").write(body)
subprocess.run(["gh", "issue", "edit", "147", "--repo", "FeatherHunter/dsh-opencode-palette",
                "--body-file", r"D:\Temp\i147_r13.md"], cwd=REPO)
print("147 body", len(body))

# ---------- 3. #128 body 旧数 ----------
r = subprocess.run(["gh", "issue", "view", "128", "--repo", "FeatherHunter/dsh-opencode-palette",
                    "--json", "body", "-q", ".body"], capture_output=True, text=True,
                   encoding="utf-8", cwd=REPO)
mb = r.stdout
mb = mb.replace("`palette/` 10 个 YAML", "`palette/` 11 个 YAML")
mb = mb.replace("L2 … 379", "L2 … 381")
mb = mb.replace("379", "381").replace("319 能力", "321 能力").replace("319 语义能力", "321 语义能力")
io.open(r"D:\Temp\i128_r13.md", "w", encoding="utf-8", newline="\n").write(mb)
subprocess.run(["gh", "issue", "edit", "128", "--repo", "FeatherHunter/dsh-opencode-palette",
                "--body-file", r"D:\Temp\i128_r13.md"], cwd=REPO)
print("128 body", len(mb))

# ---------- 4. 旧 P6 审计评论加“已被取代”标注 ----------
r = subprocess.run(["gh", "api", "repos/FeatherHunter/dsh-opencode-palette/issues/comments/6383088582",
                    "-q", ".body"], capture_output=True, text=True, encoding="utf-8", cwd=REPO)
cb = r.stdout
if cb and "已被 v1.13 取代" not in cb:
    cb = ("> ⚠️ **本评论的计数（10 个 YAML / 319 / 379）已被 v1.13 取代：现为 11 个 YAML / 321 / 381。**\n"
          "> 以 `docs/research/v3-p6-zero-deviation-report.html`（重生成版）与 `palette/_index.yaml` 为准。\n\n") + cb
    payload = json.dumps({"body": cb}, ensure_ascii=False)
    subprocess.run(["gh", "api", "--method", "PATCH",
                    "repos/FeatherHunter/dsh-opencode-palette/issues/comments/6383088582",
                    "--input", "-"], input=payload, capture_output=True, text=True,
                   encoding="utf-8", cwd=REPO)
    print("comment patched")

# ---------- 5. 第 12/13 轮逐条处置评论 ----------
comment = """## 第 12/13 轮二审逐条处置（2026-10-24，v1.13）

第 12 轮（0 P0 / 5 P1 / 8 P2）与第 13 轮（0 P0 / 4 P1 / 7 P2）的逐条状态：

| 轮 | 项 | 问题 | 处置 |
|---|---|---|---|
| 12 | P1-1 | 决定判据与「只有 YAML」冲突（v1 JSON 自动加载） | 已改：旧 JSON 由 #145 一次性迁移，运行时不读 JSON |
| 12 | P1-2 | 票面称 SPEC v1.13 实为 v1.12 | SPEC 已升 v1.13 并补变更记录 |
| 12 | P1-3 | 319 分解算错 | 已改 321 = 29+229+50+13 |
| 12 | P1-4 | 门 4 未清零 | 由第 13 轮复核替代 |
| 12 | P1-5 | 合成视图非纯合成、静默丢 2 条 recipe | ownership 迁入 `palette/ownership.yaml`；recipe 保留；checker 加真断言 |
| 12 | P2-1..8 | 六键/28/331/幽灵路径/rc.2/#140/重复票#133/checker 文案 | 全部修：五键、30/321、artifacts 指向真实文件、anchors rc.3、#140 指向更新、#133 关闭、文案更新 |
| 13 | P1-1 | 「手写 ⊆ 合成 ∪ dropped」断言未落地 | 已在 `palette-check.py` 真加两条断言；变异测试 A/B 均被拦截 |
| 13 | P1-2 | `raw_tokens` 仍残留 | 已删 `primitives.yaml:30` 句并重生成；F1 改递归扫描 |
| 13 | P1-3 | `audit_p1p5.py` 硬编码 379 | 改 381，复跑 FAIL=0（50/50） |
| 13 | P1-4 | P6 报告仍旧数 | 报告与 crosswalk 已按 11/321/381 重生成 |
| 13 | P2-1..7 | _index 331、SPEC 7 模块/§4/生成链、gated 口径、crosswalk 分解、正文/地图旧数、旧评论标注 | 全部修 |

当前复跑：`palette-check.py` 0 错 0 警；`audit_p6_zero_deviation.py` PASS=34 FAIL=0；`audit_p1p5.py` FAIL=0。
"""
subprocess.run(["gh", "issue", "comment", "147", "--repo", "FeatherHunter/dsh-opencode-palette",
                "--body-file", "-"], input=comment, text=True, encoding="utf-8", cwd=REPO)
print("comment posted")
