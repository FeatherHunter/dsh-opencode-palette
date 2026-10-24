# -*- coding: utf-8 -*-
"""第 15 轮收尾：#147 body 勾选复核项 + 评论。REST 通道。"""
import io
import json
import subprocess

REPO = "FeatherHunter/dsh-opencode-palette"


def gh(*args, inp=None):
    cmd = ["gh", "api", *args]
    if inp:
        cmd += ["--input", inp]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    assert r.returncode == 0, (args, r.stderr[:400])
    return r.stdout


body = gh("repos/%s/issues/147" % REPO, "-q", ".body")
n = body.count("- [ ]")
print("unchecked before", n)

body = body.replace(
    "- [ ] 第 15 轮独立复核清零（第 12 轮 0 P0/5 P1/8 P2、第 13 轮 0 P0/4 P1/7 P2、第 14 轮 0 P0/1 P1/9 P2，均已按 v1.13 收尾修正；第 15 轮复核待回）",
    "- [x] 第 15 轮独立复核清零（第 12 轮 0 P0/5 P1/8 P2、第 13 轮 0 P0/4 P1/7 P2、第 14 轮 0 P0/1 P1/9 P2，均已按 v1.13 收尾修正；**第 15 轮：0 P0 / 0 P1 / 0 P2，技术项清零，唯一未过 = 门 5 维护者授权**）")
if "第 15 轮独立复核清零" in body and "- [x] 第 15 轮" not in body:
    # 兜底：按前缀替换
    lines = body.split("\n")
    for i, ln in enumerate(lines):
        if ln.startswith("- [ ] 第 15 轮"):
            lines[i] = ln.replace("- [ ]", "- [x]", 1) + "（第 15 轮：0 P0 / 0 P1 / 0 P2，技术项清零，唯一未过 = 门 5）"
    body = "\n".join(lines)
io.open(r"D:\Temp\b147_r15.md", "w", encoding="utf-8", newline="\n").write(body)
io.open(r"D:\Temp\payload147_r15.json", "w", encoding="utf-8", newline="\n").write(
    json.dumps({"body": body}, ensure_ascii=False))
gh("-X", "PATCH", "repos/%s/issues/147" % REPO, inp=r"D:\Temp\payload147_r15.json")
print("body patched; unchecked after", body.count("- [ ]"))

comment = """## 第 15 轮二审核验结论：技术项清零，只差门 5

第 15 轮独立只读复核（HEAD `6f2cb3b`）：

- **判定：不可关。唯一阻塞项 = 门 5（维护者「这票可以关」原话）。**
- **0 P0 / 0 P1 / 0 P2**；第 14 轮 1 P1 + 9 P2 已逐条复核真修。
- 复核员自做变异实验（临时副本）：删手写能力 / 改 `ownership.yaml` converted 定义 / 改 `_index.capabilities_synthesized` → 三种都必须让门禁非 0，实测全部拦截。
- 复跑：`palette-check.py` 0 错 0 警；`audit_p6_zero_deviation.py` 34/34；`audit_p1p5.py` 47/47。
- 五道闭票门：①✅ ②✅ ③✅ ④✅ ⑤❌（待维护者原话）。

按复核建议顺手清了 3 处纯文案（checker 输出「全量表 / 状态表」、生成器 docstring 升 v1.13 + 输入清单补 ownership、SPEC v1.12 变更记录注明「格式层」），复跑三门仍全绿。

**下一步：等维护者一句「这票可以关」→ 勾选门 5 → 关闭 #147 → 地图 #128 已同步无需再改 → 进入 P7 升级演练。**"""
io.open(r"D:\Temp\comment_r15.md", "w", encoding="utf-8", newline="\n").write(comment)
io.open(r"D:\Temp\payload_c15.json", "w", encoding="utf-8", newline="\n").write(
    json.dumps({"body": comment}, ensure_ascii=False))
gh("-X", "POST", "repos/%s/issues/147/comments" % REPO, inp=r"D:\Temp\payload_c15.json")
print("comment posted")
