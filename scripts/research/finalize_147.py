# -*- coding: utf-8 -*-
"""P6 收口：重写 #147 票面为裁定记录；同步地图 #128。"""
import io
import subprocess

REPO = "FeatherHunter/dsh-opencode-palette"
ROOT = r"D:\dsh-plugin\dsh-opencode-palette"

old = io.open(r"D:\Temp\i147_body_now.md", encoding="utf-8").read()
head = old[: old.index("## 裁定记录")]
idem = "<!-- DSH-IDEMPOTENCY-KEY: v3-palette-map-2026-10-20/token-model -->"

body = head + """## 裁定记录（最终，2026-10-24；权威 = 维护者原话）

**总原则**

- 不同实现技术只要能达成同一效果，全部讨论、全部支持，不因「重复」跳过（m02863）。
- 一个 token 一个语义，**禁止合并**（m03131）。
- V3 核心理念：一个小功能，哪个途径的技术可以精细实现就用哪个实现；探索到确实无法实现才放弃（m04010）。
- 零偏差：代码/文档与讨论结论不符时，按讨论结论实现（m02743）。

**格式与范围**

| 项 | 最终裁定 |
|---|---|
| 主题包 | 目录 `theme.yaml` + `assets/`；内置 `src/themes/<id>/`、本地用户目录；**不做市场/在线下载**（U12 / U14） |
| theme.yaml | 五键 `api` / `meta` / `variables` / `capabilities` / `extensions`；无 `raw_tokens`、无 v1 JSON、无落盘产物（U13 / U15 / U9） |
| 能力集 | `palette/` 10 个 YAML；`palette.yaml` 是全部模块的合成视图；能力 = **能力 → 底层实现技术** 的映射（token / 规则 / DOM / 资源 / 字体 / 外壳） |
| 覆盖范围 | C1–C5 通道 × A–F 六层全部收录（收录 ≠ 承诺生效；重大安全隐患除外）（U1） |
| 暴露层级 | L1 = 37 个 opencode token；L2 = 语义能力菜单（379 条）；L3 = 直绑定（425 条） |
| 编辑器 | 预览区复刻 + 区模型（6 区）+ 变量表；入口 = DSH 设置 → opencode palette → 新增/编辑 → 编辑弹窗；「创意工坊」复制 Prompt（U3–U6） |
| tier | `stable` / `advanced` / `experimental` / `dead`；结构性改动默认实验、可一键恢复（U7） |
| 安全 | 数据默认；脚本/HTML 扩展允许，安装时强提示，内置主题走 PR 审核（U8 / U8b） |
| 容错 | 严格拒收 + 事务切换（失败保持当前主题）+ 别名链 `current → legacy`（U16 / U17） |
| 动效 | **不做** reduced-motion 适配（U18） |
| 验收 | U20 六条全绿 = V3 做完（U11 一次全做） |
| 自检 | U21：技术自检归我方负责，维护者只说一句「这票可以关」 |

**技术委托结论（M1–M7）**：能力粒度 `<domain>.<segment>…`（34 个能力域）；绑定优先级 token → 规则 → DOM；白名单 = CSS 属性 + `@font-face/@keyframes/@property`；状态模型 = `live/dead/missing` + 修饰 `pinned/gated/declared_invalid`；锚点公开面优先（26 个锚点，其中 19 个 `data-slot` 由宿主测试反查确认）；资源 32 MiB、woff2/webp/avif/gif/mp4/webm；加载期校验 + 运行时探针。

**V3 基准**：DSH `0.2.1-rc.3` @ `1f81c047fc48fa190a683e469daa699857e9afe8`（2026-10-23）。rc.3 主题面与 rc.2 逐字节相同（9 CSS SHA256 全同、640 文件 diff 新增/删除自定义属性声明均为 0、npm 产物仍 403/11/11 + font 182）；DOM 增量三条（3 个新 root list slot、`.panelRow` 需排除菜单按钮、几何松动）已写入 V3 规则约束。

## 最终落地（v1.13）

| 项 | 值 |
|---|---|
| 公开 token | **425** = `--dsw` 403 + `--shiki` 11 + `--dsh` 11 |
| 颜色轴 | **222** = 184 live + 38 dead；gated 修饰 5 |
| 非颜色 | **203**（typography 182 + radius 6 + dsh 11 + menu/corner/mask/other 4） |
| 运行时登记 | **148**（573 = 425 + 148，不建用户能力） |
| 能力菜单 | **319** 条（手写 30 + master 213 + P4 51 + P2 19） |
| 合并视图 | **379** 条唯一能力（319 + 模板展开 65 − 重名 5） |
| 直绑定 | **425** 条（每个 token 恰一条） |
| 词表 | 区域 14 / 角色 29 / 能力域 34 / 锚点 26 / 控件 12 |
| 规格 | `palette/SPEC.md` **v1.13** |

## 验收门（全部通过）

| 门 | 结果 | 证据 |
|---|---|---|
| P1–P5 第一性原理审计 | 50/50 PASS | `docs/research/v3-p1p5-first-principles-audit.html` |
| P6 零偏差审计（SPEC ↔ YAML ↔ 研究表） | 34/34 PASS | `docs/research/v3-p6-zero-deviation-report.html` |
| `palette-check.py` 跨模块检查 | 0 错 0 警 | 10/10 YAML；425 条 token；319 能力；425 直绑定；148 runtime |
| 主题层干净 | 五键、无 `raw_tokens`、无 v1 JSON、无落盘产物 | `palette/SPEC.md` §3 §7 |
| 生成器确定性 | 两次跑哈希一致 | P6 审计 G1 |

## 交付物

- 规格：`palette/SPEC.md`（v1.13）、`palette/README.md`
- 模块：`palette/{capabilities,vocabulary,values,primitives,assets,probes,anchors,tokens,_index}.yaml` + 合成视图 `palette/palette.yaml`
- 生成与校验：`scripts/research/{gen_palette_v5,gen_token_registry,gen_color_ability_map,gen_noncolor_surface_map,gen_private_surface_map,gen_capability_master,palette-check,audit_p1p5,audit_p6_zero_deviation}.py`
- 逐条清单：`docs/research/v3-color-222-ability-map.html`、`v3-noncolor-surface-ability-map.html`、`v3-private-surface-ability-map.html`、`v3-dom-ability-map.html`、`v3-capability-master.html`、`v3-p1p4-to-yaml-crosswalk.html`
- 归属策略：`docs/research/v3-ownership-policy.md`（合并 10 / 改规则层 9 / 改名 4 / 移出 2）

## 下游票可用的稳定输入

- **#140**：字段名细节（五键与概念集合已定）
- **#145**：37 款主题迁移（目录制 `theme.yaml`，老 JSON 一次性迁移，无兼容层）
- **#148**：排印值域（30 复合 live + 150 长手 dead；规则层按内容角色）
- **#149**：材质档位（`--dsw-menu-backdrop-filter` 等）
- **#137**：背景媒体（`insert-media-layer` 原语 + assets kinds）
- **#146**：预览区复刻（DOM 骨架 + 6 区）
- **#141 / #132 / #154**：交互效果 / 点赞统计 / 标题栏实验

## 关闭门

- [x] 设计全部裁定（D1–D7 + U1–U22）
- [x] 落地与文档零偏差（P1–P6 审计全绿）
- [ ] **维护者一句「这票可以关」**
- [ ] 关闭后同步地图 #128（Decisions so far / 24 条矩阵 / fog）

""" + idem + "\n"

io.open(r"D:\Temp\i147_final.md", "w", encoding="utf-8", newline="\n").write(body)
print("body chars", len(body))

r = subprocess.run(["gh", "issue", "edit", "147", "--repo", REPO, "--body-file", r"D:\Temp\i147_final.md"],
                   capture_output=True, text=True, encoding="utf-8")
print("issue edit rc", r.returncode, (r.stderr or r.stdout)[:200])
