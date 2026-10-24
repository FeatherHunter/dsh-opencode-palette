# -*- coding: utf-8 -*-
"""第 14 轮收尾：#147 评论 + #128 body 同步（REST 通道）。"""
import io
import json
import subprocess

REPO = "FeatherHunter/dsh-opencode-palette"


def api(*args, **kw):
    r = subprocess.run(["gh", "api", *args], capture_output=True, text=True, encoding="utf-8")
    assert r.returncode == 0, (args, r.stderr[:400])
    return r.stdout


def api_input(path, payload):
    io.open(path, "w", encoding="utf-8", newline="\n").write(json.dumps(payload, ensure_ascii=False))
    r = subprocess.run(["gh", "api", "--input", path, *extra], capture_output=True, text=True, encoding="utf-8")


# ---- #128 body ----
body128 = api("repos/%s/issues/128" % REPO, "-q", ".body")
new128 = body128.replace(
    "P1–P6 审计全绿（P6 = 34/34）",
    "P1–P6 审计全绿（P1–P5 = 47/47，P6 = 34/34 含 G1 生成器确定性）")
changed128 = new128 != body128
io.open(r"D:\Temp\b128_r14.md", "w", encoding="utf-8", newline="\n").write(new128)
io.open(r"D:\Temp\payload128.json", "w", encoding="utf-8", newline="\n").write(
    json.dumps({"body": new128}, ensure_ascii=False))
r = subprocess.run(["gh", "api", "-X", "PATCH", "repos/%s/issues/128" % REPO,
                    "--input", r"D:\Temp\payload128.json"], capture_output=True, text=True, encoding="utf-8")
print("128 changed", changed128, "patch rc", r.returncode, r.stderr[:200])

# ---- #147 评论 ----
comment = """## 第 14 轮二审核验与修正（v1.13 收尾）

第 14 轮独立只读复核：**0 P0 / 1 P1 / 9 P2**，判定不可关。逐条处置：

| 轮次问题 | 处置 | 证据 |
|---|---|---|
| **P1-2 未修**（第 13 轮称已删 raw_tokens，实际 `_fix_round13.py` 的替换未命中，`palette/primitives.yaml:30` 仍是旧句） | **本评论更正：第 13 轮「已删并重生成」为误报。** 已真改：`primitives.yaml` 的 token 原语描述改为「用户层只能写 palette 登记过的能力与直绑定（`token.*`）；宿主变量名不出现在 theme.yaml」；删「当前 15 条样本」；重生成 `palette.yaml`（生成物无 raw_tokens 叙述） | `palette/primitives.yaml`；`palette/palette.yaml` 全文无 raw_tokens |
| P2-1 P6 总数 34 vs 33、无 G1 | 给 `audit_p6_zero_deviation.py` 补真 **G1 生成器确定性**（哈希 → 重跑生成器 → 比对），实跑 **34 PASS / 0 FAIL**，P6 报告重生成 | `scripts/research/audit_p6_zero_deviation.py`；`docs/research/v3-p6-zero-deviation-report.html` |
| P2-2 P1P5 总数 50 vs 47 | 全部改 **47/47**（报告 HTML、票面、SPEC、评论） | `docs/research/v3-p1p5-first-principles-audit.html`；`palette/SPEC.md` |
| P2-3 15 条样本残留 | 已删，改「完整表 425 条」 | `palette/primitives.yaml:40` 区域 |
| P2-4 生成头漏 ownership、称 P5 定稿 | 生成头改「v1.13 定稿」+ 模块清单 9 个含 `ownership.yaml`（生成器同步） | `palette/palette.yaml:1-3`；`gen_palette_v5.py` HEADER |
| P2-5 checker 文案 v1.10 | 升 **v1.13**，docstring 列 10/11/12 三条新门禁 | `scripts/research/palette-check.py:1-20` |
| P2-6 ownership converted 只比 id | 合成视图输出 `converted` 全字段（dict），checker 改为全字段相等；变异「改 converted 定义」应红 | `gen_palette_v5.py`；`palette-check.py` |
| P2-7 `_index` 321/requires 未覆盖 | `_index.requires` 补 tokens/anchors/ownership/palette；counts 加 `capabilities_synthesized: 321`；checker 校验该计数 + requires 覆盖全部模块 | `palette/_index.yaml`；`palette-check.py` |
| P2-8 SPEC 轮次旧 | 状态行改「第 12–14 轮」+ P1P5 47/47 + P6 34/34（含 G1）；v1.13 变更记录补第 13/14 轮 | `palette/SPEC.md:3,201` |
| P2-9 #128 旧 | 已同步 P1P5 47/47、P6 34/34（含 G1） | #128 body |

复跑（2026-10-24）：`palette-check.py` **0 错 0 警**（11/11 YAML、321 能力、381 合并视图、425 直绑定、148 运行时、222=184+38、203、573=425+148）；`audit_p6_zero_deviation.py` **34/34**；`audit_p1p5.py` **47/47 FAIL=0**。

剩余未过项：**门 5**——需要维护者一句「这票可以关」（本票正文关闭门第 5 条）。技术项已清零，待第 15 轮独立复核确认后即可关闭。"""
io.open(r"D:\Temp\comment_r14.md", "w", encoding="utf-8", newline="\n").write(comment)
io.open(r"D:\Temp\payload_c14.json", "w", encoding="utf-8", newline="\n").write(
    json.dumps({"body": comment}, ensure_ascii=False))
r = subprocess.run(["gh", "api", "-X", "POST", "repos/%s/issues/147/comments" % REPO,
                    "--input", r"D:\Temp\payload_c14.json"], capture_output=True, text=True, encoding="utf-8")
print("comment rc", r.returncode, r.stderr[:200])
