# -*- coding: utf-8 -*-
"""第 12 轮二审 P0/P1/P2 收尾：票面 #147、决定评论、地图 #128、重复票 #133。"""
import io
import json
import subprocess

REPO = "FeatherHunter/dsh-opencode-palette"


def gh(*args, stdin=None):
    r = subprocess.run(["gh", *args], capture_output=True, text=True, encoding="utf-8",
                       input=stdin, cwd=r"D:\dsh-plugin\dsh-opencode-palette")
    if r.returncode != 0:
        print("GH FAIL", args[:3], (r.stderr or r.stdout)[:300])
    return r


# ---------- 1. #147 body ----------
p = r"D:\Temp\i147_now.md"
s = io.open(p, encoding="utf-8").read()
s = s.replace("原话（对 5 条增量设计的裁定意见）：",
              "原话（**部分回应**：缺第 2 条；未逐条给「采纳/延后/否决」——U22 仍待维护者逐条裁定）：")
s = s.replace("| 能力菜单 | **319** 条（手写 30 + master 213 + P4 51 + P2 19） |",
              "| 能力菜单 | **321** 条（手写 29 + master 229 + P4 50 + P2 13；手写源 30 条，其中 `window.titleBar.background` 移出到 #154） |")
s = s.replace("| 合并视图 | **379** 条唯一能力（319 + 模板展开 65 − 重名 5） |",
              "| 合并视图 | **381** 条唯一能力（321 + 模板展开 65 − 重名 5） |")
s = s.replace("10/10 YAML；425 条 token；319 能力；425 直绑定；148 runtime",
              "11/11 YAML；425 条 token；321 能力；425 直绑定；148 runtime")
s = s.replace("- 模块：`palette/{capabilities,vocabulary,values,primitives,assets,probes,anchors,tokens,_index}.yaml` + 合成视图 `palette/palette.yaml`",
              "- 模块：`palette/{capabilities,vocabulary,values,primitives,assets,probes,anchors,tokens,ownership,_index}.yaml` + 合成视图 `palette/palette.yaml`")
s = s.replace("- [x] 设计全部裁定（D1–D7 + U1–U22）",
              "- [ ] 设计全部裁定（D1–D7 + U1–U21 已定；**U22 五条增量设计待维护者逐条给「采纳/延后/否决」**）")
s = s.replace("- [x] 落地与文档零偏差（P1–P6 审计全绿）",
              "- [x] 落地与文档零偏差（P1–P6 审计全绿；v1.13）\n- [ ] 第 13 轮独立复核清零（第 12 轮：0 P0 / 5 P1 / 8 P2，v1.13 已修）")
io.open(r"D:\Temp\i147_v113.md", "w", encoding="utf-8", newline="\n").write(s)
gh("issue", "edit", "147", "--repo", REPO, "--body-file", r"D:\Temp\i147_v113.md")
print("147 body ok", len(s))

# ---------- 2. 决定评论：标注已被取代 + 修正两条判据 ----------
r = gh("api", f"repos/{REPO}/issues/comments/6341759476", "-q", ".body")
body = r.stdout
if body:
    banner = ("> ⚠️ **本评论是 2026-10-22 的中间版决定记录，已被 #147 正文「裁定记录（最终）」取代，保留作历史。**\n"
              "> 其中「L3 = raw_tokens」「无 api 字段的 v1 JSON 自动加载」「palette/ 9 个 YAML」等表述均已作废：\n"
              "> 最终形态 = 五键 theme.yaml（无 raw_tokens）+ 直绑定 425 兜底 + 11 个 YAML 模块；旧 JSON 由 #145 一次性迁移，运行时不读 JSON。\n\n")
    body = banner + body
    body = body.replace(
        "②L1 的 37 个 opencode token 保留且老 v1 JSON 零迁移加载（夹具测试）；",
        "②L1 的 37 个 opencode token 保留（旧 v1 JSON 由 #145 一次性迁移，运行时不读 JSON——本条判据已按 m02752 校正）；")
    body = body.replace(
        "- **验收判据**：①无 `api` 字段的 v1 JSON 自动按 v1 加载，37 个 opencode token 全部命中；②未写 token 取宿主默认；③#145 的视觉改动不改 v1 字段名。",
        "- **验收判据（v1.13 校正）**：①37 个 opencode token 保留为内部映射层；旧 v1 JSON 由 #145 一次性迁移为 `theme.yaml`，运行时不再读 JSON；②未写 token 取宿主默认；③#145 的视觉改动不改能力 id。")
    payload = json.dumps({"body": body}, ensure_ascii=False)
    r2 = subprocess.run(["gh", "api", "--method", "PATCH", f"repos/{REPO}/issues/comments/6341759476",
                         "--input", "-"], capture_output=True, text=True, encoding="utf-8",
                        input=payload, cwd=r"D:\dsh-plugin\dsh-opencode-palette")
    print("comment patch rc", r2.returncode)

# ---------- 3. #128 body ----------
p = r"D:\Temp\i128_now.md"
s = io.open(p, encoding="utf-8").read()
s = s.replace("能力集 = `palette/`（9 个 YAML + `palette/SPEC.md`，v3.0.0）",
              "能力集 = `palette/`（11 个 YAML + `palette/SPEC.md` v1.13）")
s = s.replace(
    "- **#147 采纳（2026-10-22）**：语义能力菜单（palette capability）替代 token 名平铺——解决「425 个名字人读不懂」；代价 = 维护能力→token 映射；`palette/palette.yaml`。",
    "- **#147 已落盘、待维护者逐条裁定（U22）**：语义能力菜单（palette capability）替代 token 名平铺——解决「425 个名字人读不懂」；代价 = 维护能力→token 映射；`palette/palette.yaml`。")
s = s.replace(
    "- **#147 采纳**：主题包 = `theme.yaml` + `assets/` 目录，加载时内存编译、无落盘编译产物——解决「主题带资源且不被中间产物污染」；代价 = 运行期需解析 YAML；`palette/SPEC.md` §2–§3。",
    "- **#147 已落盘、待维护者逐条裁定（U22）**：主题包 = `theme.yaml` + `assets/` 目录，加载时内存编译、无落盘编译产物——解决「主题带资源且不被中间产物污染」；代价 = 运行期需解析 YAML；`palette/SPEC.md` §2–§3。")
s = s.replace(
    "- **#147 采纳**：`raw_tokens` 逃生舱 + 渐变合法——解决「菜单之外的效果永远无法表达」；代价 = 值形状严格校验防注入；`palette/values.yaml`。",
    "- **#147 否决**：`raw_tokens` 逃生舱（m02828「我们完全不支持 raw_tokens」）——改为 425 条直绑定 `token.<ns>.<名>` 兜底，覆盖每个公开 token 且不引入裸名写入。")
s = s.replace(
    "- **#147 采纳**：palette 按实现技术拆模块（token/rule/dom/asset 各自 YAML + 注册表 + 门禁）——解决「新技术不断加、单文件不可维护」；代价 = 多文件与生成物管理；`palette/_index.yaml`。",
    "- **#147 已落盘、待维护者逐条裁定（U22）**：palette 按实现技术拆模块（11 个 YAML + 注册表 + 门禁 + 合成视图）——解决「新技术不断加、单文件不可维护」；代价 = 多文件与生成物管理；`palette/_index.yaml`。")
s = s.replace(
    "- **#147 采纳（实现延后）**：视频/动态图背景走 DOM 媒体层原语（`insert-media-layer`）——解决「静态图以外的整窗/区域背景」；代价 = 生命周期撤销与性能兜底；`palette/primitives.yaml`。",
    "- **#147 延后（实现轴归 #137）**：视频/动态图背景走 DOM 媒体层原语（`insert-media-layer`）——解决「静态图以外的整窗/区域背景」；代价 = 生命周期撤销与性能兜底；`palette/primitives.yaml`。")
io.open(r"D:\Temp\i128_v113.md", "w", encoding="utf-8", newline="\n").write(s)
gh("issue", "edit", "128", "--repo", REPO, "--body-file", r"D:\Temp\i128_v113.md")
print("128 body ok", len(s))

# ---------- 4. #133 重复票关闭 ----------
gh("issue", "close", "133", "--repo", REPO, "--reason", "not planned",
   "--comment", "同题重复票：Token 模型与「全量」边界的讨论与定稿已在 #147（含裁定记录、落地对照与验收门）。本票不再单独跟踪，关闭。")
print("133 closed")
