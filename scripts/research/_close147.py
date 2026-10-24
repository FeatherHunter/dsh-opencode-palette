# -*- coding: utf-8 -*-
"""关闭 #147：勾选门 5 + 关闭评论 + 关闭 + 地图评论。REST 通道。"""
import io
import json
import subprocess

REPO = "FeatherHunter/dsh-opencode-palette"


def gh(*args, inp=None):
    cmd = ["gh", "api", *args]
    if inp:
        cmd += ["--input", inp]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    return r.returncode, r.stdout, r.stderr


def post_json(path, payload):
    io.open(path, "w", encoding="utf-8", newline="\n").write(json.dumps(payload, ensure_ascii=False))


# ---- 1. body 勾选 ----
rc, body, err = gh("repos/%s/issues/147" % REPO, "-q", ".body")
assert rc == 0, err[:300]
old212 = "- [ ] **维护者一句「这票可以关」**"
new212 = "- [x] **维护者一句「这票可以关」**：2026-10-24 本会话 m04537「同意」（回应作者明确请求「请回一句『这票可以关』」）。"
assert old212 in body
body = body.replace(old212, new212, 1)
old213 = "- [ ] 关闭后同步地图 #128（Decisions so far / 24 条矩阵 / fog）"
new213 = "- [x] 关闭后同步地图 #128（Decisions so far / 24 条矩阵 / fog）——已于关闭前完成同步，关闭评论复核。"
assert old213 in body
body = body.replace(old213, new213, 1)
post_json(r"D:\Temp\payload147_close.json", {"body": body})
rc, out, err = gh("-X", "PATCH", "repos/%s/issues/147" % REPO, inp=r"D:\Temp\payload147_close.json")
print("body rc", rc, err[:200])

# ---- 2. 关闭评论 ----
comment = """## 关闭：#147 定稿

维护者授权（2026-10-24，本会话 m04537「同意」，回应作者「请回一句『这票可以关』」）。五道关闭门全部满足：

| 门 | 状态 | 证据 |
|---|---|---|
| ① 覆盖矩阵无「待决」 | ✅ | 地图 #128 中 #147 负责行全部 ✅/🔁 |
| ② 每条决定有可执行判据 | ✅ | 正文「验收门」5 项：P1P5 47/47、P6 34/34（含 G1）、checker 0 错 0 警、主题五键、生成器确定性 |
| ③ U22 与 m04344 一致 | ✅ | 1 采纳 / 2 采纳 / 3 否决 / 4 采纳 / 5 延后 |
| ④ 技术项清零 | ✅ | 第 15 轮独立二审：0 P0 / 0 P1 / 0 P2；变异实验 3/3 被门禁拦截 |
| ⑤ 维护者授权 | ✅ | m04537「同意」 |

**最终裁定（摘要）**
- 覆盖上限 = C1–C5 五通道 × A–F 六层全部收录；收录≠承诺生效（状态标注 + 探针 + 失败诊断）。
- 主题包 = 目录 `theme.yaml`（五键 api/meta/variables/capabilities/extensions）+ `assets/`；仅 YAML、无 v1 JSON、无落盘编译产物。
- 能力集 = `palette/` 11 个 YAML，`palette.yaml` 为合成视图；能力 = **能力 → 底层实现技术** 映射。
- 暴露层级：L1 37 opencode token（默认）/ L2 语义能力菜单 381 / L3 直绑定 425。
- 一个 token 一个语义（禁止合并）；tier = stable / advanced / experimental / dead；tier 由「哪种技术能精细实现」决定。
- 严格拒收 + 事务切换 + 别名链 current→legacy；来源 = 内置 + 本地两类，不做市场/在线下载。
- 落地数字：425 token = 403+11+11；222 颜色 = 184 live + 38 dead；203 非颜色；148 运行时；321 能力；425 直绑定。
- 规格入口：`palette/SPEC.md` v1.13；研究依据：`docs/research/`（P1–P4 逐条表 + P5/P6 审计 + rc.3 基准）。

**下游稳定输入**：#148（排印值域/多语言字体）、#149（视觉特效档位）、#137（区域背景与媒体）、#146（预览区复刻）、#141（老 37 款迁移）、#145（37 款视觉重定）、#132（点赞/统计设计）、#154（桌面窗口外壳配色）。

**后续**：P7 升级演练（rc.3 复测运行时数、theme.yaml 零改动）待维护者升级宿主后执行；P8 由保留票接力。
"""
post_json(r"D:\Temp\payload147_comment_close.json", {"body": comment})
rc, out, err = gh("-X", "POST", "repos/%s/issues/147/comments" % REPO, inp=r"D:\Temp\payload147_comment_close.json")
print("comment rc", rc, err[:200])

# ---- 3. 关闭 issue ----
rc, out, err = gh("-X", "PATCH", "repos/%s/issues/147" % REPO, "-f", "state=closed")
print("close rc", rc, err[:200])

# ---- 4. 地图评论 ----
mapc = "## #147 已关闭（2026-10-24）\n\n维护者授权后关闭：#147「Token 模型与『全量』边界」定稿。规格入口 `palette/SPEC.md` v1.13；本图 Decisions so far 第 18 行、24 条矩阵第 1/2/7/8/9/10 条已同步（#147 负责行无待决）。\n\n下游稳定输入不变：#148 / #149 / #137 / #146 / #141 / #145 / #132 / #154。P7 升级演练待宿主升级 rc.3 后执行。"
post_json(r"D:\Temp\payload128_close.json", {"body": mapc})
rc, out, err = gh("-X", "POST", "repos/%s/issues/128/comments" % REPO, inp=r"D:\Temp\payload128_close.json")
print("map comment rc", rc, err[:200])

# ---- 5. 校验状态 ----
rc, out, err = gh("repos/%s/issues/147" % REPO, "-q", ".state")
print("state:", out.strip(), "rc", rc)
