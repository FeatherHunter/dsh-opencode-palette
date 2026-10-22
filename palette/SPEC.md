# V3 主题格式规格（palette.yaml + theme.yaml + assets）

- 状态：架构已定（2026-10-22），由「讨论：Token 模型与「全量」边界（第 1/2 条·颜色轴）」(#147) 收口
- 上位地图：「[wayfinder] V3 主题系统」（#128）
- 机器源：`palette/` 目录；本文件是给人/新 AI 的规范入口；两者冲突时以 `palette/` + 门禁为准
- 未定项：见 §9，由后续票承接（不在本文假装已定）

## 0. 一页结论

V3 主题系统只有三样东西：

| 东西 | 归谁 | 何时生效 | 用户看得见吗 |
|---|---|---|---|
| **能力集** `palette/`（palette.yaml + 7 个技术域模块） | 插件作者维护，构建期 | 随插件版本 | 看不见；只决定「能配什么」 |
| **主题包** `theme.yaml` + `assets/` | 主题作者 / 用户 / 外部 AI | 安装或编辑时加载 | 看得见；用户唯一要写的东西 |
| **运行时 plan**（内存对象，无文件产物） | 插件运行时 | 加载时编译 | 看不见；预览与运行时共用同一份 |

一句话：**palette 是菜单，theme.yaml 是点菜，assets 是食材；宿主 token 名/选择器/类名全部藏在 palette 里，用户永远不写。**

## 1. 术语

- **能力（capability）**：一个语义化可配置项，id 形如 `<区域>.<角色>.<属性>`（如 `sidebar.panel.background`）或 `<区域>.<recipe>`（如 `composer.glass`）。值只来自值类型系统。
- **能力集（palette）**：全部能力的真源，按技术域拆成多个 YAML 模块（§4）。
- **主题包（theme package）**：一个目录，含 `theme.yaml` 与 `assets/`；目录名可自由取（如「海贼王」），显示名取 `theme.yaml` 的 `meta.name`。
- **raw_tokens**：主题里的逃生舱，直接写任意 `--` 开头的宿主变量名（兜底 425 全量可达）。
- **注入**：把主题写进宿主的动作（A 通道 `theme.overrideTokens` / B 通道自建 `<style>`）；「写」这个词停用。
- **绑定（binding）**：能力 → 宿主落地手段的映射：`token`（变量）/ `rule`（规则）/ `dom`（命令式 DOM）/ `asset`（资源）。绑定策略链按「当前宿主可用」降级。

## 2. 仓库内布局

```
palette/                        能力集（构建期真源，随插件版本发布）
  _index.yaml                   注册表：模块/版本/生成命令/计数 ← 唯一入口
  palette.yaml                  能力菜单 + 控件模板
  vocabulary.yaml               区域/角色/属性/recipe/状态/语言词表
  values.yaml                   值类型 + Unicode 范围 + 变量语法
  primitives.yaml               写原语：token/rule/dom/host_api
  assets.yaml                   资源类型与安全策略
  probes.yaml                   探测原语
  tokens.yaml                   宿主 token 事实表（扫描生成，禁手改）
  anchors.yaml                  锚点候选 + 控件清单（扫描生成，人工确认）
  SPEC.md                       本文件
```

主题包（V3 新格式）：

```
<任意主题目录>/
  theme.yaml                    唯一主题定义文件（抽象名固定 theme.yaml）
  assets/                       图片 / 动态图 / 视频 / 字体 / 图标
```

目录规则：

- **预置主题**：`src/themes/<主题名>/theme.yaml + assets/`；旧 `src/themes/*.json` 继续只读兼容（迁移归 #145，见 §9）。
- **用户主题**：DSH 默认目录下新建 `<主题名>/theme.yaml + assets/`（对应原第 10 条）。
- 资源只允许主题包内相对路径；禁 http(s) 外链、禁 base64 内联（`assets.yaml` policy）。

## 3. theme.yaml 结构

```yaml
# 版本：程序拿到文件就知道是哪种格式（对应原第 7/8 条）
api: 3                      # 主题 schema 版本；缺省视为 v1 老 JSON
meta:
  name: 海贼王
  id: one-piece             # 稳定 id；改名不改 id
  author: 某某
  license: CC-BY-4.0
  version: 1.0.0
  basedOn: default          # 二次创作：基于哪个主题（对应原第 14 条）
  description: 一句话说明
  createdForPalette: 3.0.0  # 生成/校验时的能力集版本

variables:                  # 主题变量层：编译成 --palette-var-<name>，值里写 $name 引用
  ink: { light: '#241d12', dark: '#f2ead9' }

capabilities:               # 只写能力 id（来自 palette.yaml）；light/dark 成对
  global.page.background: { light: '$ink', dark: '#12100c' }
  global.text.font_family:
    latin: assets/Font-Latin.woff2
    han: assets/Font-CJK.woff2
  sidebar.panel.background: { light: 'assets/sidebar-light.jpg', dark: 'assets/sidebar-dark.mp4' }
  composer.glass: { blur: 12px, opacity: 0.6 }

raw_tokens:                 # 逃生舱：任意 -- 名，只校验值形状，不校验名字
  '--dsw-static-neutral-100': { light: '#f5f5f5', dark: '#1a1a1a' }
  '--dsw-specific-sidebar-fill': 'linear-gradient(180deg, #fdf6e3, #f5e6c8)'

assets:                     # 资源清单（可省略，由引用自动收集）
  - assets/bg.mp4
```

硬规则：

1. `capabilities` 的键必须是 `palette.yaml` 登记过的能力 id（拼错 = 校验错误）。
2. 值必须符合能力声明的值类型；颜色/渐变支持 `{light, dark}` 成对；`null` = 清掉该层；没写 = 不注入。
3. 值与资源在写进样式表前必须解析后重新序列化（防 CSS 注入）。
4. 老 v1 JSON（37 个 opencode token）没有 `api`/`capabilities` 时，程序按 v1 识别并归一化为「37 个 legacy 能力」，无需用户迁移（对应原第 16 条）。
5. `theme-plan.json` 之类的落盘编译产物**不存在**：加载后只在内存编译。

## 4. palette 模块的职责边界

| 模块 | 管什么 | 不许管什么 |
|---|---|---|
| `palette.yaml` | 能力条目、控件模板 | 宿主 token 名（写进 token 引用可以）、选择器（用 anchor 引用） |
| `vocabulary.yaml` | 名字的合法性（id 每段） | 任何实现细节 |
| `values.yaml` | 值长什么样、怎么解析/序列化 | 值写到哪儿 |
| `primitives.yaml` | 写入手段与字段、撤销、冲突策略 | 具体能力 |
| `assets.yaml` | 资源类型与安全约束 | 资源内容 |
| `probes.yaml` | 生效前探测原语 | 探测结果的使用策略（在能力里） |
| `tokens.yaml` | 宿主 token 全集事实 | 我们决定暴露哪些（在 palette） |
| `anchors.yaml` | 宿主选择器/控件清单 | 能力语义 |

扩展规则：新技术 = 新模块 + 在 `_index.yaml` 注册 + 在 `primitives.yaml` 加写原语；`palette.yaml` 条目形状不变。

## 5. 加载管线

```
theme.yaml + assets/
  → 解析 YAML（版本识别：有无 api / capabilities）
  → 校验（能力 id 存在、值类型合法、资源路径合法；未知 id = 错误，死名/未知 token = 警告不阻止）
  → 归一化（light/dark 成对、变量展开、旧 v1 JSON 映射到 legacy 能力、raw_tokens 并入）
  → 内存编译出 plan { tokens, rules, runtimeOps, assets }（不落盘）
  → 预览（同一份 plan） + 运行时（同一份 plan）
```

## 6. 暴露层级（对应原第 1 条）

| 层 | 内容 | 谁用 |
|---|---|---|
| L1 | 37 个 opencode token（等价今天编辑器） | 普通用户、老主题 |
| L2 | 语义能力菜单（`palette.yaml`，14 区域分组，覆盖 184 个活名的语义部分） | 想让主题「像某个世界」的用户 |
| L3 | `raw_tokens`：任意 `--` 名（含 60 个 static 原子、死名、排印 token），425 个公开 token 全部可达 | 专家、外部 AI 逃生舱 |

规则：L2 只列活名对应的能力，避免「调了不变」；L3 一律允许设置，保存只给状态提示（dead / declared-invalid / pinned / gated / missing），不阻止、不删除。

## 7. 版本与兼容

- `api`：主题 schema 版本（当前 3）；v1 JSON 无此字段 → 自动按 v1 处理。
- `palette_version`：能力集自身版本（新增能力 +0.1.0，破坏性 +1.0.0）。
- 模块 `version` + `_index.yaml` 的 `requires`：跨模块不兼容时门禁报错。
- `tokens.yaml` / `anchors.yaml` 版本 = 宿主版本 + commit（当前 `dsh 0.2.1-rc.2 @ 687f282`），随宿主升级整体替换。
- 旧 v1 37 个 opencode token 保留为映射层、不改名（对应原第 16/23 条）；视觉重定归 #145。

## 8. 验收判据（可变成测试）

1. `palette/` 9 个 YAML 解析通过；跨模块检查 0 错误（`scripts/research/palette-check.py`）。
2. 主题校验：拼错能力 id → 报错；写死名/未知 token → 警告不阻止。
3. 42 个公开 token 全量可达：抽样 60 个 static 原子 + 全部死名，写进 `raw_tokens` 均不报错。
4. 老 v1 JSON 加载后 37 个 opencode token 全部命中，未写的 token 取宿主默认。
5. 颜色/渐变值 `{light, dark}` 成对通过校验；单词值被拒。
6. 视频背景经 `insert-media-layer` 生效，切主题后被精确撤销（无残留节点）。
7. 预览与运行时对同一 theme.yaml 产生同一份 plan（快照测试）。

## 9. 未定项（不要假装已定）

- 主题包分发/市场/审核/版本升级：地图 #128 「Not yet specified」。
- 字段细节（`meta` 子字段、`basedOn` 语义、license、hostContract）：由 #140 承接；本文只定「有这些概念」。
- 主题包资源如何送到浏览器（插件客户端读不到本地文件）：未确证，需宿主文件通道或 URL 方案。
- 能力条目从 28 条扩到 100+、扫描器生成完整 `tokens.yaml` / `anchors.yaml`：实现期。
- 排印轴（字体/字号/行距/多语言）与材质轴（玻璃档位）：归 #148 / #149，本文只定义承载格式。
- 37 预置主题从 `*.json` 迁到目录包：归 #145。

## 10. 决策来源

- #147 决定评论：三档暴露、死名呈现、分区、raw_tokens 边界、存量 37 保留。
- 证据文档：`docs/research/color-axis-token-inventory.md`、`theme-ceiling-absolute.md`、`moddable-surface-registry.md`、`palette-v3-requirement-coverage.md`、`palette-yaml-v3-adversarial-review.md`。
- 机器源：`palette/`（v3.0.0，2026-10-22 提交入库）。
