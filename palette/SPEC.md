# V3 主题格式规格（palette.yaml + theme.yaml + assets）

- 状态：架构已定（2026-10-22），由「讨论：Token 模型与「全量」边界（第 1/2 条·颜色轴）」(#147) 收口；已过九轮独立对抗式二审修正（v1.1 → v1.9）
- 上位地图：「[wayfinder] V3 主题系统」（#128）
- 机器源：`palette/` 目录；本文件是给人/新 AI 的规范入口；两者冲突时以 `palette/` + 门禁为准
- 未定项：见 §9，由后续票承接（不在本文假装已定）

## 0. 一页结论

V3 主题系统只有三样东西：

| 东西 | 归谁 | 何时生效 | 用户看得见吗 |
|---|---|---|---|
| **能力集** `palette/`（palette.yaml + 8 个技术域模块 + 本文件） | 插件作者维护，构建期 | 随插件版本 | 看不见；只决定「能配什么」 |
| **主题包** `theme.yaml` + `assets/` | 主题作者 / 用户 / 外部 AI | 安装或编辑时加载 | 看得见；用户唯一要写的东西 |
| **运行时 plan**（内存对象，无文件产物） | 插件运行时 | 加载时编译 | 看不见；预览与运行时共用同一份 |

一句话：**palette 是菜单，theme.yaml 是点菜，assets 是食材；宿主 token 名/选择器/类名全部藏在 palette 里，用户永远不写。**

## 1. 术语

- **能力（capability）**：一个语义化可配置项，id 形如 `<区域>.<角色>.<属性>`（如 `sidebar.panel.background`）或 `<区域>.<recipe>`（如 `composer.glass`）；控件级 recipe 允许 `<区域>.<角色>.<recipe>`。
- **能力集（palette）**：全部能力的真源，按技术域拆成多个 YAML 模块（§4）。「合并视图」= 手写能力 + `control_templates × anchors.controls` 展开结果。
- **主题包（theme package）**：一个目录，含 `theme.yaml` 与 `assets/`；目录名可自由取（如「海贼王」），显示名取 `theme.yaml` 的 `meta.name`。
- **raw_tokens**：主题里的逃生舱，直接写任意 `--` 开头的宿主变量名（兜底 425 公开合约全量可达）。名字不校验，值只校验形状（单值或 `{light,dark}`）。
- **注入**：把主题写进宿主的动作（A 通道 `theme.overrideTokens` / B 通道自建 `<style>`）；「写」这个词停用。
- **绑定（binding）**：能力 → 宿主落地手段的映射：`token`（变量）/ `rule`（规则）/ `dom`（命令式 DOM）/ `asset`（资源）。绑定策略链按「当前宿主可用」降级。
- **diurnal**：值类型是否需要 light/dark 两套。`diurnal: true` 的类型接受成对值；`diurnal: false` 的类型只接受单值。
- **liveness（存活判定）**：token 是否有消费方。`live` = 有 `var()` 消费；`dead` = 声明但零消费；`missing` = 宿主从未声明。判定方式见 §5。
- **legacy 能力**：老 v1 JSON 的 37 个 opencode token 在内部映射成 `legacy.<组>.<名字>` 能力 id（组 = bg/text/brand/border/diff/md/syn），用户不可直接写这个前缀；由 v1 自动识别。

## 2. 仓库内布局

```
palette/                        能力集（构建期真源，随插件版本发布）
  _index.yaml                   注册表：模块/版本/生成命令/计数 ← 唯一入口
  palette.yaml                  能力菜单 + 控件模板
  vocabulary.yaml               区域/角色/属性/recipe/状态/语言词表 + grammar
  values.yaml                   值类型 + Unicode 范围 + 变量语法
  primitives.yaml               写原语：token/rule/dom/host_api
  assets.yaml                   资源类型与安全策略
  probes.yaml                   探测原语
  tokens.yaml                   宿主 token 事实表（扫描器产出后整表替换；当前 partial，15 条手工核实样本）
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
api: 3                      # 主题 schema 版本；缺省视为 v1 老 JSON（api 编号暂定，见 §9）
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

capabilities:               # 只写能力 id（来自 palette 合并视图）；diurnal 类型可写 light/dark 成对
  global.page.background: { light: '$ink', dark: '#12100c' }
  global.text.font_family:
    latin: assets/Font-Latin.woff2
    han: assets/Font-CJK.woff2
  sidebar.panel.background: { light: 'assets/sidebar-light.jpg', dark: 'assets/sidebar-dark.mp4' }
  composer.glass: { blur: 12px, opacity: 0.6 }

raw_tokens:                 # 逃生舱：任意 -- 名；单值或 {light,dark} 两种形态都接受
  '--dsw-static-neutral-100': { light: '#f5f5f5', dark: '#1a1a1a' }   # 成对
  '--dsw-specific-sidebar-fill': 'linear-gradient(180deg, #fdf6e3, #f5e6c8)'  # 单值
  '--dsw-alias-bg-layer-2': '#f0f0f0'                                 # 颜色 token：单值

assets:                     # 资源清单（可省略，由引用自动收集）
  - assets/bg.mp4
```

硬规则：

1. `capabilities` 的键必须是合并视图里登记过的能力 id（拼错 = 校验错误）；合并视图 = `palette.yaml` 手写能力（28）+ `control_templates × anchors.controls` 展开能力（65）− 与手写重名（4）= 89 条唯一 id。展开 id 规则：`<region>.<controlName>.<property>`，`controlName` 是 `anchors.controls` 的键的第二段（如 `composer.sendButton`），不是 `role`；与手写 id 重名时手写优先（当前 4 条重名：`menu.item.background`、`sidebar.item.background`、`code.block.background`、`markdown.link.foreground`）。
2. `capabilities` 的值必须符合能力声明的值类型；`diurnal: true` 的类型（颜色/渐变/阴影/图片/媒体）接受单值或 `{light, dark}` 成对，`diurnal: false` 的类型（长度/数字/字体栈/字重/图标）只接受单值；`null` = 清掉该层；没写 = 不注入。
3. `raw_tokens` 的名字不校验（任意 `--` 名，包含 `--dsl-*`、组件局部变量、宿主未来新增名）；值接受**单值字符串**或 **`{light, dark}` 对象**，不强制成对、不按 token 语义分类。
4. 所有值与资源在写进样式表前必须解析后重新序列化（防 CSS 注入）；资源路径必须落在主题包内。
5. 老 v1 JSON（37 个 opencode token）没有 `api`/`capabilities` 时，程序按 v1 识别并归一化为 37 个 legacy 能力（`legacy.<组>.<名字>`，组 = bg/text/brand/border/diff/md/syn），无需用户迁移（对应原第 16 条）。
6. `theme-plan.json` 之类的落盘编译产物**不存在**：加载后只在内存编译。

## 4. palette 模块的职责边界

| 模块 | 管什么 | 不许管什么 |
|---|---|---|
| `palette.yaml` | 能力条目、控件模板 | 宿主 token 名（token 引用可以）、选择器（用 anchor 引用） |
| `vocabulary.yaml` | 名字的合法性（id 每段） | 任何实现细节 |
| `values.yaml` | 值长什么样、怎么解析/序列化 | 值写到哪儿 |
| `primitives.yaml` | 写入手段与字段、撤销、冲突策略 | 具体能力 |
| `assets.yaml` | 资源类型与安全约束 | 资源内容 |
| `probes.yaml` | 生效前探测原语 | 探测结果的使用策略（在能力里） |
| `tokens.yaml` | 宿主 token 全集事实 | 我们决定暴露哪些（在 palette） |
| `anchors.yaml` | 宿主选择器/控件清单 | 能力语义 |

扩展规则：新技术 = 新模块 + 在 `_index.yaml` 注册 + 在 `primitives.yaml` 加写原语；`palette.yaml` 条目形状不变。

`tokens.yaml` / `anchors.yaml` 是**生成物**：当前版本只含 15 条已核实 token 样本与 23 个锚点；完整 425 条与全量锚点由扫描器（`palette:scan-tokens` / `palette:scan-anchors`，实现期）生成，生成后替换整表，不手工补。

## 5. 加载管线

```
theme.yaml + assets/
  → 解析 YAML（版本识别：有无 api / capabilities）
  → 校验（能力 id 存在、值类型合法、资源路径合法；未知 id = 错误，死名/未知 token = 警告不阻止）
  → 归一化（diurnal 成对/单值规则、变量展开、旧 v1 JSON 映射到 legacy 能力、raw_tokens 并入）
  → 内存编译出 plan { tokens, rules, runtimeOps, assets }（不落盘）
  → 预览（同一份 plan） + 运行时（同一份 plan）
```

存活判定（#136 结论进管线）：`tokens.yaml` 的每条 token 记录 `consumers` 计数（源码 `var()` 扫描）与三点采样结果（A/B/A，两次 A 必须一致才算稳定）；`consumers === 0` → `dead`；名字在宿主声明表里不存在 → `missing`；编辑/保存时据此给状态标记与提示，不阻止写入。宿主升级（`tokens.yaml` 版本变化）→ 重新生成 → diff 报告新增/消失/改名，作为漂移测试。

## 6. 暴露层级（对应原第 1 条）

| 层 | 内容 | 谁用 |
|---|---|---|
| L1 | 37 个 opencode token（等价今天编辑器；内部 id = `legacy.<组>.<名字>`） | 普通用户、老主题 |
| L2 | 语义能力菜单（`palette.yaml` 合并视图 89 条 = 28 手写 + 65 展开去重 4，14 区域分组；12/14 区域已有能力，detail/plugin 为登记缺口） | 想让主题「像某个世界」的用户 |
| L3 | `raw_tokens`：任意 `--` 名（含 60 个 static 原子、死名、排印 token），425 个公开 token 全部可达 | 专家、外部 AI 逃生舱 |

规则：L2 只列活名对应的能力，避免「调了不变」；L3 一律允许设置，保存只给状态提示，不阻止、不删除。

补充定义：

- **状态模型（主状态 + 修饰，不是单值互斥）**：主状态 `live`（有消费方）/ `dead`（声明但零消费方）/ `missing`（宿主从未声明），三者互斥；颜色轴 184 + 38 + 0 = 222 恰好分完。修饰状态可叠加在主状态上：`declared_invalid`（声明链断裂，颜色轴 2：`--shiki-foreground/background`，写在 body 级可救）、`pinned`（被宿主字面量 / `!important` / inline 压制，写入当前不生效但**仍允许设置**、只提示不阻止，1–2）、`gated`（宿主元素级重声明，body 级写入被盖掉；颜色轴 **5** = `--dsw-elevation-stroke/-panel/-prominent/-soft/-stroke-color`；另有 `--dsh-scrollbar-thumb` 1 名属 `--dsh` 轴、不在 222 内；旧记「gated 6」是跨轴合计）。UI 显示「主状态 + 修饰标签」，不是六选一。机器源：`palette/tokens.yaml` §2（`status_model`）+ `palette/primitives.yaml` token 原语字段（`allow_primary_status` / `allow_modifiers`），由 `palette-check.py` 校验。`gated` 只指「元素级重声明」这一种机制；shiki 运行时消费（CSS 扫描看不见消费方）属探测盲区，主状态仍记 `live`，不是 gated。来源：`docs/research/host-style-override-attention.md` + `docs/research/color-axis-token-inventory.md` §5 + #136 判死规则。
- **425 / 573 / 任意 `--` 的边界**：425 = 公开合约命名空间（`--dsw` 403 + `--shiki` 11 + `--dsh` 11，源码声明总量）；573 = 运行时页面实际出现的变量名（多出 148 个包内局部变量，如 `--dsl-*` 20 个、组件局部 56 个）；`raw_tokens` 允许任意 `--` 名（可以写 573 之外的），但只有宿主有消费方的名字才生效。「全量可达」指 425 公开合约面。
- **14 区域覆盖**：12/14（detail、plugin 为登记缺口，见 `docs/research/color-region-map.md`）；门禁目标 14/14，是目标不是现状。
- **184 活名的归属**：不是 L2 条目数；L2 条目是语义菜单，184 是宿主事实层名字数，映射表见 `docs/research/color-region-map.md`。425 个 token 名与 37 个 opencode token 不是同一单位，不做加法。

效果家族 × 暴露层（#153 结论的落地标记；不假装全量）：

| 效果家族 | L1 | L2 | L3（raw_tokens） | 备注 |
|---|---|---|---|---|
| 颜色（含渐变/半透明） | ✅ | ✅ | ✅ | 主战场 |
| 排印（字体/字号/行距/字重） | ⛔（37 个 token 里没有排印名） | ✅ 能力已定义 | ✅ 排印 token | 本票只定承载格式，排印验收归 #148（待用户确认拆分） |
| 圆角/阴影/模糊/玻璃 | ⛔ | ✅ recipe | ✅ shadow token | 玻璃依赖 backdrop-filter，需实测层叠 |
| 图标替换 | ⛔ | ✅ 控件级 icon 能力 | 宿主无图标 token | 运行时 DOM 替换，幂等重放 |
| 图片/动态图/视频背景 | ⛔ | ✅ media 值类型 | 宿主无媒体 token | 视频走 `insert-media-layer`，见验收 6 |
| 动效细节（过渡曲线/时长） | ⛔ | ⛔ | ⛔ | 宿主无 token；C2 任意属性未对外开放（见 §9） |
| 密度（padding/margin/gap） | ⛔ | ⛔ | ⛔ | `primitives.rule` 白名单不含间距；属范围外（见 §9） |
| DOM 结构/控件行为 | ⛔ | ⛔ | ⛔ | 本票不做 |

## 7. 版本与兼容

- `api`：主题 schema 版本（当前暂定 3）；v1 JSON 无此字段 → 自动按 v1 处理。**api 编号与 `raw_tokens` 字段名由 #140 最终确认**（本票只定「有版本、有逃生舱」）。
- `palette_version`：能力集自身版本（新增能力 +0.1.0，破坏性 +1.0.0）。
- 模块 `version` + `_index.yaml` 的 `requires`：跨模块不兼容时门禁报错（`palette-check.py` v1.10 已实现）。
- `tokens.yaml` / `anchors.yaml` 版本 = 宿主版本 + commit（当前 `dsh 0.2.1-rc.2 @ 687f282`），随宿主升级整体替换；`tokens.yaml` 自身 `api: 1` 是事实表独立版本，与主题 `api: 3` 无关。
- 旧 v1 37 个 opencode token 保留为映射层、不改名（对应原第 16 条）；第 23 条（37 款预置主题颜色升级）是主题数据升级，归 #145，与本映射层不是同一件事。
- `vocabulary.yaml` roles 当前 27 个（注释计数已删，以 `_index.yaml` 合并视图为准）。

## 8. 验收判据（可变成测试）

1. `palette/` 9 个 YAML 全部被解析（`palette-check.py` v1.10 会 load 全部 9 个）；跨模块检查 0 错误（校验：手写/展开 id 各段词表与唯一性、value 类型、anchor/token（存在性）/写原语/dom op/recipe 名引用、decl 属性白名单与 @ 描述符、realization.when 守卫（probe 必须登记、args 键合法、token_live 显式 `args.name` 与写入 token 一致、守卫不得写在 write 级）、锚点与控件置信度计数、tokens 状态模型 schema（主状态/修饰/`allow_*` 一致）、tokens 表条目名语法与命名空间前缀、写死名或非 live 名时 `allow_primary_status`/`allow_modifiers` 强制（`allow_reason` 必填、live 名不得放宽主状态；被 `when: { probe: token_live }` 守卫的条件写视为合法，不强制 `allow_*`）、token 表条目重名拒绝、declared 路径必须为仓库根相对且在 host.source 可访问时存在、`_index` 计数（含 `regions_gap`，不符 = 错误）、模块 `version` 与 `requires` 约束（语义版本比较）；`npm run palette:gate` 接入 npm/CI 属实现期，见 §9）。
2. 主题校验：拼错能力 id → 报错；写死名/未知 token → 警告不阻止。
3. 425 个公开 token 全量可达（扫描器实现后）：生成完整 `tokens.yaml` 后，把表中每个名字依次写进 `raw_tokens`（单值/成对两种形态）校验全部通过；当前先行用例 = 15 条样本 + 37 个 legacy 名 + 38 个死名。
4. 老 v1 JSON 加载后 37 个 legacy 能力全部命中（夹具 + 测试）；未写的 token 取宿主默认。
5. 值形状：`diurnal: true` 类型单值/成对都通过、`diurnal: false` 类型只接受单值、`raw_tokens` 两种形态都通过；非法值被拒。
6. 视频背景经 `insert-media-layer` 生效，切主题后被精确撤销（无残留节点）。
7. 预览与运行时对同一 theme.yaml 产生同一份 plan（快照测试）。
8. 区域覆盖：合并视图 89 条唯一能力覆盖 12/14 区域（detail/plugin 已登记为缺口）；实现期门禁提升到 14/14。
9. `_index.yaml` 计数与重算一致：`capabilities_authored`=28、`capabilities_generated`=65、`capabilities_unique`=89、`regions_covered`=12、`regions_gap`=[detail, plugin]；不一致 = 错误，不是 warning。

## 9. 未定项（不要假装已定）

- 主题包分发/市场/审核/版本升级：地图 #128 「Not yet specified」。
- 字段细节（`meta` 子字段、`basedOn` 语义、license、hostContract）、`api` 编号、`raw_tokens` 最终字段名：由 #140 承接；本文只定「有这些概念」。
- 主题包资源如何送到浏览器（插件客户端读不到本地文件）：未确证，需宿主文件通道或 URL 方案。
- 能力条目从 28 条手写+65 条展开扩到 100+、扫描器生成完整 `tokens.yaml` / `anchors.yaml`；`npm run palette:gate` / `palette:scan-tokens` / `palette:scan-anchors` 尚未接入 `package.json`：实现期。
- 排印轴（字体/字号/行距/多语言）与材质轴（玻璃档位）承载格式已定义，但排印验收归 #148、材质归 #149 的拆分**待用户确认**。
- C2「任意选择器 + 任意属性」不开放给用户（安全与可维护性），用户只通过 `capabilities` 菜单 + `raw_tokens` 表达；需要新效果 = 作者扩 palette（待用户确认是否接受）。
- 动效细节（过渡曲线/时长）与密度（padding/margin/gap）当前标 ⛔：前者宿主无 token、后者不在 rule 白名单；是否扩进 V3 范围待定。
- 37 预置主题从 `*.json` 迁到目录包：归 #145。
- `palette-check.py` 当前是 research 原型（v1.10）：已覆盖全部 9 个 YAML 解析、手写/展开 id 词表与唯一性、value 类型、anchor/token 存在性/写原语/dom op/recipe 名引用、decl 属性白名单与 @ 描述符、realization.when 守卫（probe 已登记、args 键合法、token_live 显式 `args.name` 与写入 token 一致）、锚点与控件置信度计数、tokens 状态模型 schema（主状态恰为 live/dead/missing、修饰恰为 pinned/gated/declared_invalid、`primitives.token.allow_*` 与 `status_model` 一致）、tokens 表条目名语法与命名空间前缀、能力写死名或非 live 名时强制 `allow_primary_status`/`allow_modifiers`（`allow_reason` 必填、live 名不得给 `allow_primary_status`；被 `when: { probe: token_live }` 守卫的条件写不强制）、token 表条目重名拒绝、declared 路径格式（仓库根相对）与存在性（host.source 可访问时）、`_index` 计数（含 `regions_gap`，不符为 error）、模块 `version` 与 `requires` 约束（语义版本比较）；**未覆盖** `raw_tokens` 值形状、主题加载管线、token 表 425 全量扫描校验与表内条目真实性（是否真在宿主存在/被消费；checker 只做 declared 文件存在性，真实性与消费关系由扫描器负责）、`values` 细节契约——这些属实现期门禁。
- **状态模型单源化**（第四轮二审修正）：`palette/tokens.yaml` §2 的 `status_model`（primary_status + modifiers）与 `palette/primitives.yaml` token 原语字段 `allow_primary_status` / `allow_modifiers` 是唯一机器源；旧研究笔记里的「gated 6」是跨轴合计（颜色轴 5 + `--dsh` 轴 1），颜色轴计数以 5 为准。**v1.5 定义统一**：`gated` = 元素级重声明（`gradient-shadow-text.css:31-40` 的 elevation 族等）；shiki 运行时消费不是 gated——它是「CSS var() 扫描看不见消费方」的探测盲区，主状态仍按「有运行时消费方」记 `live`。**v1.6 再统一 `pinned`**：`pinned` = 宿主字面量 / `!important` / inline 压制（写入当前不生效，但用户层与 L3 **一律允许设置**、只提示不阻止）；旧探针笔记里的「拒绝写入 / `PINNED_NO_EMIT` / G2」只是**引擎自动生成过滤层**的策略，不是用户层禁令。**v1.10 单源化条件写契约**：`when`（probe + args）的结构与 `token_live` 守卫的绑定规则落在 `primitives.yaml` §1b `realization` 段；`palette-check.py` 按该契约校验 probe 已登记、args 键合法、显式 `args.name` 与写入 token 一致，守卫豁免不再是 checker 里的隐藏例外。
- **控件展开 id 规则**是本轮（第二轮二审）新定的：此前 65 条展开中有 48 条第二段不是词表 role（`sendButton`/`tooltip`/`tab` 等），且 4 条与手写 id 重名；现统一为 `<region>.<controlName>.<property>` 并在 `palette-check.py` 中强制校验。若后续要改用别的命名（如四段式 `region.role.control.property`），属破坏性变更，需 palette_version +1.0.0。
- #153（EC 研究票）结论被本 SPEC 引用，但该票仍 open：本 SPEC 相关结论标 `provisional`，研究票收口后复核。

## 10. 决策来源

- #147 决定评论：三档暴露、死名呈现、分区、raw_tokens 边界、存量 37 保留；v1.1 修正见 #147 二审核验评论。
- 证据文档：`docs/research/color-axis-token-inventory.md`、`theme-ceiling-absolute.md`、`host-style-override-attention.md`、`moddable-surface-registry.md`、`palette-v3-requirement-coverage.md`、`palette-yaml-v3-adversarial-review.md`、`color-region-map.md`。
- 机器源：`palette/`（v3.0.0，2026-10-22 提交入库）。

## 11. 变更记录

- 2026-10-22 v1.0：格式确定，落盘 palette/。
- 2026-10-22 v1.1（第一轮二审修正）：425 数字、raw_tokens 值形状、`gradient`/`asset_font`/`line_height` 类型、颜色分区表落盘、状态模型、425/573 边界、存活判定进管线。
- 2026-10-22 v1.2（第二轮二审修正）：控件模板展开 id 规则定案（`<region>.<controlName>.<property>`，65 展开 − 4 重名 = 89 唯一）；`palette-check.py` 升级校验展开合法性/唯一性/去重与计数；L1 排印能力更正为 ⛔（37 token 无排印名）；状态名统一 `declared_invalid`；tokens 样本状态计数更正（12 live + 1 dead + 1 gated）。
- 2026-10-22 v1.3（第三轮二审修正）：状态模型改「主状态 live/dead/missing + 修饰 declared_invalid/pinned/gated」（消除 6 值互斥与 184+38 的算术冲突）；`palette-check.py` 升级为 load 全部 9 个 YAML、token 存在性/recipe 名/decl 白名单/控件 role/置信度计数/`regions_gap` 全部 error；修正 28+65−4 算式、锚点覆盖计数（15/7/1）、`color-region-map` 的「93 个活名未写」口误；Q3 在决定评论与文档中统一标「推荐 A、待用户逐字裁定」。
- 2026-10-22 v1.4（第四轮二审修正）：机器源单源化——`tokens.yaml` 改 `status_model`（primary_status + modifiers）、样本 `--shiki-token-string` 改 `status: live` + `modifiers: [gated]`、`primitives.token` 的 `allow_status` 拆为 `allow_primary_status` / `allow_modifiers`；`palette-check.py` 增加状态模型 schema 校验与 `allow_*` 一致性校验；gated 计数改为「颜色轴 5 + `--dsh` 轴 1」；`color-axis-token-inventory.md` §5 改主状态+修饰表；`anchors.coverage.template_expandable` 改名 `template_expandable_controls`；决定评论同步第 4 轮与 ❓Q5 定义。
- 2026-10-22 v1.5（第五轮二审修正）：修饰标签**定义**统一——`gated` 只指元素级重声明，shiki 运行时消费改为「探测盲区」注记（样本 `--shiki-token-string` 去掉 gated，新增 `--dsw-elevation-panel` 作 gated 样本）；`palette-check.py` 增加 tokens 表条目名语法/命名空间前缀校验与「写死名或非 live 名必须显式 `allow_primary_status`/`allow_modifiers`」强制；修正 checker 文档版本号与决定评论验收判据①的 v1.3 残留；body 第 1 条判据措辞改为「①可执行；②③ 属实现期门禁」。
- 2026-10-22 v1.6（第六轮二审修正）：样本计数全仓统一为 15（14 live + 1 dead；1 gated）；checker 增加 token 表重名拒绝、`allow_reason` 必填、live 名不得给 `allow_primary_status`、declared 路径格式（仓库根相对）与存在性（host.source 可访问时）校验；`tokens.yaml` 的 declared 统一为 `packages/client/...` 全路径；`pinned` 定义统一为「宿主压制、仍允许设置、只提示」，旧探针笔记的「拒绝写入/PINNED_NO_EMIT」注明为引擎过滤层策略。
- 2026-10-22 v1.7（第七轮二审修正）：文档级 P2 补正——§9「未覆盖」段改为 declared 只做存在性、不校验宿主真实性；`tokens.yaml` 的 `--dsh-content-font-size` declared 行号改 `:31`（字面量位置，非 `:78` 的 setProperty 写循环）；inventory §0 #7 注明「平台门控/主动拒写」属引擎过滤层分类、不进入用户层状态机；探针笔记六值枚举补 v1.6 注。
- 2026-10-22 v1.8（第八轮二审修正）：`tokens.yaml` 的 `--dsw-static-blue-50` 补第二处声明行 `design-platform.css:96`；`palette-check.py` 补 `_index` 模块 `version` 与 `requires` 语义版本约束校验（此前 SPEC §7/README 声称门禁校验但未实现），并输出校验项 9；文档版本号同步 v1.8。
- 2026-10-22 v1.9（第九轮二审修正）：`tokens.yaml` 两条排印长手 `--dsw-font-markdown-base-font-size` / `--dsw-font-markdown-base-line-height` 由 `live` 改 `dead`（宿主只声明长手、无消费方；消费方用复合 `font: var(--dsw-font-markdown-base)`，从不引用长手），样本计数改 12 live + 3 dead；`palette-check.py` 新增校验项 7f「被 `when: { probe: token_live }` 守卫的条件写视为合法、不强制 `allow_*`」（此前两条能力会因写 dead 名报错），并加守卫变异测试（去掉守卫 / 拼错探测名 → exit 1）；`host-style-override-attention.md` §0 算术 15→16；`color-axis-token-inventory.md` `CodeBlock.tsx` 引用行号 :53→:52；决定评论验收判据① checker 版本标签 v1.6→v1.9。
- 2026-10-22 v1.10（第十轮二审修正）：条件写契约单源化——`primitives.yaml` 新增 §1b `realization` 段（`when` = probe + args 的结构与校验规则；`token_live` 守卫绑定：显式 `args.name` 必须与写入 token 一致、省略时逐写绑定），`token` 原语 description/validates 写明守卫例外；`probes.yaml` 注明 probe/args 门禁与守卫绑定语义；`palette-check.py` 新增校验项 7g（probe 必须登记、args 键合法、token_live 显式 `args.name` 与写入 token 一致、守卫不得写在 write 级），并加变异测试（拼错探测名 / args.name 不一致 / 去掉 dead 名守卫 / write 级守卫 → exit 1；显式 args.name 正确 → exit 0）；`SPEC.md` raw_tokens 示例换 live 样本；`host-style-override-attention.md` §0 补「字号/对齐」；票面进度与标签同步 v1.10。
