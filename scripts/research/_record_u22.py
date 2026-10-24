# -*- coding: utf-8 -*-
"""记录 U22 五条增量设计裁定（m04344）：票面原话区 + 关闭门 + 评论 + 地图 #128 状态。"""
import io
import subprocess

REPO = "FeatherHunter/dsh-opencode-palette"
CWD = r"D:\dsh-plugin\dsh-opencode-palette"


def gh(*args, stdin=None):
    r = subprocess.run(["gh", *args], capture_output=True, text=True, encoding="utf-8",
                       input=stdin, cwd=CWD)
    if r.returncode != 0:
        print("GH FAIL", args[:3], (r.stderr or r.stdout)[:300])
    return r


# ---------- 1. #147 body ----------
body = gh("issue", "view", "147", "--repo", REPO, "--json", "body", "-q", ".body").stdout

quote = """
- **出处：本会话（2026-10-24）m04344** — 原话：
  > 这五个完全认可你的推荐。
  > （上下文：对 U22 五条增量设计的裁定 = 1 采纳 / 2 采纳 / 3 否决 / 4 采纳 / 5 延后，逐条与推荐一致。）
"""
# 插在原话区最后一个条目之后（原话区结束于 "## " 下一节之前）
marker = "\n## "
idx = body.find(marker)
if idx == -1:
    raise SystemExit("quote section not found")
body = body[:idx] + "\n" + quote + body[idx:]

body = body.replace(
    "- [ ] 设计全部裁定（D1–D7 + U1–U21 已定；**U22 五条增量设计待维护者逐条给「采纳/延后/否决」**）",
    "- [x] 设计全部裁定（D1–D7 + U1–U22；U22 = 2026-10-24 m04344「这五个完全认可你的推荐」：1 采纳 / 2 采纳 / 3 否决 / 4 采纳 / 5 延后）")
body = body.replace(
    "- [ ] 第 13 轮独立复核清零（第 12 轮：0 P0 / 5 P1 / 8 P2，v1.13 已修）",
    "- [ ] 第 13 轮独立复核清零（第 12 轮：0 P0 / 5 P1 / 8 P2，v1.13 已修；第 13 轮进行中）")
io.open(r"D:\Temp\i147_u22.md", "w", encoding="utf-8", newline="\n").write(body)
gh("issue", "edit", "147", "--repo", REPO, "--body-file", r"D:\Temp\i147_u22.md")
print("147 body", len(body))

# ---------- 2. #147 评论 ----------
comment = """## U22 五条增量设计：维护者逐条裁定（2026-10-24）

维护者原话（m04344）：「这五个完全认可你的推荐。」裁定结果：

| # | 增量设计 | 裁定 | 落地 |
|---|---|---|---|
| 1 | 语义能力菜单（能力 id 替代 425 token 平铺） | **采纳** | `palette/capabilities.yaml` 30 手写 + 合成 321；425 直绑定兜底 |
| 2 | 主题包 = `theme.yaml` + `assets/`，内存编译、无落盘产物 | **采纳** | `palette/SPEC.md` §2–§3 |
| 3 | `raw_tokens` 逃生舱 + 渐变合法 | **否决** | 以 425 条直绑定 `token.<ns>.<名>` 替代；theme.yaml 五键无 raw_tokens |
| 4 | palette 按实现技术拆模块（11 YAML + 注册表 + 门禁 + 合成视图） | **采纳** | `palette/_index.yaml` + `ownership.yaml` + 合成 `palette.yaml` |
| 5 | 视频/动态图背景走 DOM `insert-media-layer` | **延后** | 实现轴归 #137；能力条目已登记 |

关闭门更新：门 3（增量设计逐条裁定）✅。剩门 4（第 13 轮独立复核）与门 5（维护者「这票可以关」）。
"""
gh("issue", "comment", "147", "--repo", REPO, "--body-file", "-", stdin=comment)

# ---------- 3. #128 增量设计状态 ----------
mb = gh("issue", "view", "128", "--repo", REPO, "--json", "body", "-q", ".body").stdout
mb = mb.replace("- **#147 已落盘、待维护者逐条裁定（U22）**：语义能力菜单",
                "- **#147 采纳（2026-10-24，U22）**：语义能力菜单")
mb = mb.replace("- **#147 已落盘、待维护者逐条裁定（U22）**：主题包",
                "- **#147 采纳（2026-10-24，U22）**：主题包")
mb = mb.replace("- **#147 否决**：`raw_tokens` 逃生舱（m02828「我们完全不支持 raw_tokens」）",
                "- **#147 否决（2026-10-24，U22）**：`raw_tokens` 逃生舱（m02828「我们完全不支持 raw_tokens」）")
mb = mb.replace("- **#147 已落盘、待维护者逐条裁定（U22）**：palette 按实现技术拆模块",
                "- **#147 采纳（2026-10-24，U22）**：palette 按实现技术拆模块")
mb = mb.replace("- **#147 延后（实现轴归 #137）**：视频/动态图背景",
                "- **#147 延后（2026-10-24，U22；实现轴归 #137）**：视频/动态图背景")
io.open(r"D:\Temp\i128_u22.md", "w", encoding="utf-8", newline="\n").write(mb)
gh("issue", "edit", "128", "--repo", REPO, "--body-file", r"D:\Temp\i128_u22.md")
print("128 body", len(mb))
