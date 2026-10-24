# -*- coding: utf-8 -*-
"""同步地图 #128：Decisions so far 改写 #147 条目、24 条矩阵状态、fog 注记。"""
import io
import subprocess

REPO = "FeatherHunter/dsh-opencode-palette"
s = io.open(r"D:\Temp\i128_body_now.md", encoding="utf-8").read()

# 1) Decisions so far：替换旧的 #147 条目
old_start = s.index("- **Token 模型与「全量」边界（颜色轴）**")
old_end = s.index("\n\n", old_start)
new_line = (
    "- **Token 模型与「全量」边界 + V3 主题格式** — [#147](https://github.com/FeatherHunter/dsh-opencode-palette/issues/147)，"
    "2026-10-24 定稿：① 覆盖上限 = C1–C5 五通道 × A–F 六层全部收录（收录≠承诺生效）；"
    "② 主题包 = 目录 `theme.yaml`（五键 api/meta/variables/capabilities/extensions）+ `assets/`，仅 YAML、无 v1 JSON、无落盘编译产物；"
    "③ 能力集 = `palette/` 10 个 YAML，`palette.yaml` 为合成视图；能力 = 能力→底层实现技术映射；"
    "④ 暴露 = L1 37 opencode token / L2 语义能力菜单 379 / L3 直绑定 425；"
    "⑤ 一个 token 一个语义禁止合并；tier = stable/advanced/experimental/dead；"
    "⑥ 严格拒收 + 事务切换 + 别名链 current→legacy；不做市场/在线下载，内置+本地两类来源；"
    "⑦ 落地：425 token = 403+11+11；222 颜色 = 184 live + 38 dead；203 非颜色；148 运行时；319 能力；425 直绑定；"
    "规格 `palette/SPEC.md` v1.13；P1–P6 审计全绿（P6 = 34/34）。"
)
s = s[:old_start] + new_line + s[old_end:]

# 2) 24 条矩阵：第 1、7、8、9、10 条改为 ✅；第 2 条保留 🔁 但更新说明
s = s.replace(
    "| 1 | 将只对37个参数的设置，升级为全面允许设置 theme token 的全部的围绕主题功能相关的全部内容 | #147 | 🔁 改造后落地 |",
    "| 1 | 将只对37个参数的设置，升级为全面允许设置 theme token 的全部的围绕主题功能相关的全部内容 | #147 | ✅ 落地（425 全量可达 + 319 语义能力 + 主题格式定稿） |",
)
s = s.replace("| 7 | 推出新版 json 通过 schema 参数区分老 json，对于我们程序是为了兼容老json | #147 | 🔁 改造后落地（U13：只有 YAML，无 JSON 版本） |",
              "| 7 | 推出新版 json 通过 schema 参数区分老 json，对于我们程序是为了兼容老json | #147 | ✅ 落地（U13：只有 YAML，无 v1 JSON 兼容层） |")
s = s.replace("| 8 | 程序拿到 json 时就知道是哪种版本 | #147 | 🔁 改造后落地（api: 3 显式版本号） |",
              "| 8 | 程序拿到 json 时就知道是哪种版本 | #147 | ✅ 落地（`api: 3` 显式版本号） |")
s = s.replace("| 9 | 源码特定目录用于放置预置的主题，该目录下包含 json 文件和相关全部资源，不同文件夹代表不同主题 | #147 | 🔁 改造后落地（预置主题 = 仓库 themes/<id>/ 目录） |",
              "| 9 | 源码特定目录用于放置预置的主题，该目录下包含 json 文件和相关全部资源，不同文件夹代表不同主题 | #147 | ✅ 落地（预置主题 = `src/themes/<id>/theme.yaml + assets/`） |")
s = s.replace("| 10 | 用户自定义的主题会在 dsh 默认目录生成一个子目录 目录名为主题相关，目录下是 json 和各个资源 | #147 | 🔁 改造后落地（用户主题 = DSH 默认目录下子目录） |",
              "| 10 | 用户自定义的主题会在 dsh 默认目录生成一个子目录 目录名为主题相关，目录下是 json 和各个资源 | #147 | ✅ 落地（用户主题 = DSH 默认目录子目录 + theme.yaml + assets/） |")
s = s.replace("| 2 | 全量是支持颜色、字体、字号、行间距 | #147（颜色轴）/ #148（字体·字号·行距） | 🔁 颜色轴已落地；排印三轴待 #148 |",
              "| 2 | 全量是支持颜色、字体、字号、行间距 | #147（颜色轴）/ #148（字体·字号·行距） | 🔁 颜色轴 ✅（222 逐条）；排印 203 已登记，值域待 #148 |")

# 3) fog：分发/市场与文档教程两条更新
s = s.replace("主题包分发 / 市场 / 审核与版本升级", "主题包分发/市场（已定：不做市场，U14；审核与版本升级留给内置 PR 流程）")
s = s.replace("主题 JSON 文档 / 教程与 AI 生成质量", "主题 YAML 文档 / 教程与 AI 生成质量（U9 权威样例 + 创意工坊 Prompt 已定方向）")

io.open(r"D:\Temp\i128_final.md", "w", encoding="utf-8", newline="\n").write(s)
print("map chars", len(s))

r = subprocess.run(["gh", "issue", "edit", "128", "--repo", REPO, "--body-file", r"D:\Temp\i128_final.md"],
                   capture_output=True, text=True, encoding="utf-8")
print("map edit rc", r.returncode, (r.stderr or r.stdout)[:200])
