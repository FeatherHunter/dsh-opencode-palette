# V3 主题格式规格（palette 能力集 + theme.yaml 主题包）

- 状态：**P6 定稿（2026-10-24，v1.13）**。决策来源 = #147「讨论：Token 模型与「全量」边界」；已过 P1–P5 逐技术组讨论、P1–P5 第一性原理审计（47/47）、P6 零偏差审计（34/34，含 G1 生成器确定性），并经第 12–14 轮独立对抗式二审（第 14 轮 1 P1 + 9 P2，已按 v1.13 收尾修正）。
- 上位地图：「[wayfinder] V3 主题系统」（#128）
- 机器源：`palette/` 目录（手写能力源 `capabilities.yaml` + 8 个底层模块 → 合成为 `palette.yaml`）；本文件是给人/新 AI 的规范入口；两者冲突时以 `palette/` + 门禁（`scripts/research/palette-check.py`）为准。
- 零偏差对照：P1–P4 每一行 → YAML 落点见 `docs/research/v3-p1p4-to-yaml-crosswalk.html`（机器生成）。

## 0. 一页结论

V3 主题系统只有三样东西：

| 东西 | 归谁 | 何时生效 | 用户看得见吗 |
|---|---|---|---|
| **能力集** `palette/` | 插件作者维护，构建期 | 随插件版本 | 看不见；只决定「能配什么」 |
| **主题包** `<主题目录>/theme.yaml + assets/` | 主题作者 / 用户 / 外部 AI | 安装或编辑时加载 | 看得见；用户唯一要写的东西 |
| **运行时 plan**（内存对象，无文件产物） | 插件运行时 | 加载时编译 | 看不见；预览与运行时共用同一份 |

一句话：**palette 是菜单，theme.yaml 是点菜，assets 是食材**。宿主 token 名、选择器、类名全部藏在 palette 里，用户不写宿主名字。

## 1. 术语

- **能力（capability）**：一个可配置项。`kind` 四种：`property`（区域.角色.属性，带 realization 链）、`recipe`（复合效果，按 aspect 独立降级）、`token`（直指 token 的语义能力，`binds` 指向登记层）、`effect`（DOM/规则效果，`tech` 说明实现技术）。
- **能力 id**：`<domain>.<segment>(.<segment>){1,5}`；`domain` 取 `vocabulary.yaml` 的 `capability_domains`（34 个：14 区域 + 15 语义域 + typography/radius/runtime/mask + `token`）。展开 id 规则仍为 `<region>.<controlName>.<property>`。
- **直绑定（direct binding）**：425 个公开 token 每条一个兜底能力，id = `token.<namespace>.<名字去前缀>`，如 `token.dsw.alias-bg-base`。保证「425 全量可达」，语义能力覆盖不到时用它。
- **能力菜单（合并视图）**：`palette.yaml` 的 `capabilities`（321）∪ `control_templates × controls` 展开（65，去重 5） = **381 条唯一能力**；`direct_bindings` = **425 条**（与 token 一一对应）。
- **词表规模（v1.13）**：区域 14、角色 29、属性 16、recipe 7、状态 5、能力域 34、锚点 26（documented 17 / inferred 8 / fragile 1）、控件 12。
- **token 归属（v1.13）**：每个宿主 token 只有一个 owner 能力。三套来源表合并时做归属唯一化：重复语义行并入 owner 的 `merged_from`；区域级旋钮（圆角/字色/行高/背景等）改走**规则层**（精确技术路径，不再抢共享 token）；宿主未给独立通道的项目移出菜单（标题栏独立配色归 #154，侧栏引导项圆角暂不可达）。详见 `docs/research/v3-ownership-policy.md`。
- **主题包（theme package）**：一个目录，含 `theme.yaml` 与 `assets/`；目录名可自由取，显示名取 `theme.yaml` 的 `meta.name`。
- **绑定（binding）**：能力 → 宿主落地手段：`token`（变量）/ `rule`（规则）/ `dom`（命令式 DOM）/ `asset`（资源）。策略链按「当前宿主可用」降级。
- **tier**：`stable`（正式）/ `advanced`（高级·默认折叠）/ `experimental`（实验，默认关闭）/ `dead`（不可用，只登记）。
- **exposure**：编辑器里的呈现位置（默认开放 / 高级 / 专家模式 / 实验 / 不开放）。
- **diurnal**：值类型是否需要 light/dark 两套；`true` 接受单值或成对，`false` 只接受单值。
- **liveness（存活判定）**：`live` = 有 `var()` 或运行时消费；`dead` = 声明但零消费；`missing` = 宿主从未声明。修饰：`gated`（元素级重声明）/`pinned`（宿主字面量或 `!important` 压制）/`declared_invalid`（声明链断裂）。机器源 `tokens.yaml` §2 `status_model`。
- **注入**：把主题写进宿主的动作（A 通道 `theme.overrideTokens` / B 通道自建 `<style>`）。

## 2. 仓库内布局

```
palette/                        能力集（构建期真源，随插件版本发布）
  _index.yaml                   注册表：模块/版本/生成命令/计数 ← 唯一入口
  capabilities.yaml             手写能力源（30 条手写能力 + 控件模板）← 人工维护入口
  ownership.yaml                能力归属策略（merged / renamed / converted / dropped）
  palette.yaml                  合成视图：全部底层模块 + capabilities（321）+ direct_bindings（425）← 不要手改
  vocabulary.yaml               区域/角色/属性/recipe/状态/语言/能力域 + grammar
  values.yaml                   值类型（23 种，含 font/font_style/filter/shape）+ Unicode 范围 + 变量语法
  primitives.yaml               写原语：token/rule/dom/host_api + realization 契约
  assets.yaml                   资源类型与安全策略
  probes.yaml                   探测原语（token_live 等）
  tokens.yaml                   宿主 token 事实表（425 条全量 + runtime 148 条登记；勿手改）
  anchors.yaml                  锚点候选 + 控件清单（扫描生成，人工确认）
  SPEC.md                       本文件
```

主题包（V3 唯一格式）：

```
<任意主题目录>/
  theme.yaml                    唯一主题定义文件（抽象名固定 theme.yaml）
  assets/                       图片 / 动态图 / 视频 / 字体 / 图标
```

目录规则：

- **预置主题**：`src/themes/<主题名>/theme.yaml + assets/`；旧 `src/themes/*.json` 一次性迁移归 #145，**不再保留 JSON 读取兼容**。
- **用户主题**：DSH 默认目录下 `<主题名>/theme.yaml + assets/`（自建与导入同一类）。
- 资源只允许主题包内相对路径；禁 http(s) 外链、禁 base64 内联（`assets.yaml` policy）。

## 3. theme.yaml 结构

```yaml
api: 3                      # 主题 schema 版本；只有 YAML，没有 v1 JSON 兼容分支
meta:
  name: 海贼王
  id: one-piece             # 稳定 id；改名不改 id
  author: 某某
  license: CC-BY-4.0
  version: 1.0.0
  description: 一句话说明
  createdForPalette: 3.0.0  # 生成/校验时的能力集版本

variables:                  # 可选变量层：编译成 --palette-var-<name>，值里写 $name
  ink: { light: '#241d12', dark: '#f2ead9' }

capabilities:               # 只写能力 id；diurnal 类型可写成对
  global.page.background: { light: '$ink', dark: '#12100c' }
  global.text.font_family:
    latin: assets/Font-Latin.woff2
    han: assets/Font-CJK.woff2
  sidebar.panel.background: { light: 'assets/sidebar-light.jpg', dark: 'assets/sidebar-dark.mp4' }
  composer.panel.glass: { blur: 12px, opacity: 0.6 }
  token.dsw.alias-bg-layer-2: '#f0f0f0'          # 直绑定：425 个 token 全部可用

extensions: {}              # 预留扩展层（B 脚本 / C HTML 片段）；当前加载器不执行，实现期再开
```

硬规则：

1. `capabilities` 的键必须是**合并视图里登记过的能力 id**（381 条；拼错 = 校验错误）。直绑定 id（`token.*`，425 条）同样合法。
2. 值必须符合该能力的值类型；`diurnal: true` 的类型接受单值或 `{light, dark}`，`diurnal: false` 只接受单值；`null` = 清掉该层，没写 = 不注入。
3. 宿主名字不出现：宿主 token 名只出现在 palette 的 `binds` / `token` 字段；直绑定 id 里的名字是稳定 id 的一部分，不是宿主运行时名。
4. 值与资源在写进样式表前必须解析后重新序列化（防 CSS 注入）；资源路径必须落在主题包内。
5. **没有落盘编译产物**：加载后在内存编译出 plan；`theme-plan.json` 之类不存在。
6. `extensions` 当前不执行（扩展层按 U8 预留，实现期开；开启时必须安装前强提示）。

## 4. palette 模块的职责边界

| 模块 | 管什么 | 不许管什么 |
|---|---|---|
| `capabilities.yaml` | 手写能力条目、控件模板 | 生成条目（在 palette.yaml） |
| `palette.yaml`（合成） | 全部底层模块的合成视图：词表/值类型/原语/资源/探测/锚点 + 能力菜单 + 直绑定 | 手改；改任何模块后重跑生成器 |
| `vocabulary.yaml` | 名字合法性（id 每段/能力域） | 任何实现细节 |
| `values.yaml` | 值长什么样、怎么解析/序列化 | 值写到哪儿 |
| `primitives.yaml` | 写入手段与字段、撤销、冲突策略、realization 契约 | 具体能力 |
| `assets.yaml` | 资源类型与安全约束 | 资源内容 |
| `probes.yaml` | 生效前探测原语 | 探测结果的使用策略（在能力里） |
| `tokens.yaml` | 宿主 token 全集事实 + runtime 登记 | 我们决定暴露哪些（在 palette） |
| `anchors.yaml` | 宿主选择器/控件清单 | 能力语义 |
| `ownership.yaml` | 能力归属策略：merged / renamed / converted / dropped | 能力条目本身（在 capabilities.yaml） |

生成链（全部可重跑）：

- `scripts/research/gen_token_registry.py` → `palette/tokens.yaml`（425 条 + runtime 段）
- `scripts/research/gen_palette_v5.py` → `palette/palette.yaml`（由 capabilities/vocabulary/values/primitives/assets/probes/anchors/tokens/ownership 合成：capabilities + direct_bindings + 各段视图）+ `docs/research/palette-v5-crosswalk.json`
- `scripts/research/palette-check.py` → 全量门禁

## 5. 加载管线

```
<主题目录>/theme.yaml + assets/
  → 解析 YAML（只认 api；无 v1 JSON 分支）
  → 校验（能力 id 存在、值类型合法、资源路径合法；拼错 id = 错误；死名/未知 token = 警告不阻止）
  → 归一化（diurnal 成对/单值规则、变量展开 $ref、直绑定解析）
  → 内存编译出 plan { tokens, rules, runtimeOps, assets }（不落盘）
  → 预览（同一份 plan） + 运行时（同一份 plan）
```

存活判定：`tokens.yaml` 每条记录 `consumers`（源码 `var()` 扫描）与三点采样（A/B/A；两次 A 一致才算稳定）；`consumers === 0` → `dead`；宿主声明表没有 → `missing`。编辑/保存按状态给提示，不阻止。宿主升级 → 重扫 → diff 报告新增/消失/改名，作为漂移测试（P7 升级演练）。

## 6. 暴露层级（对应原第 1 条）

| 层 | 内容 | 谁用 |
|---|---|---|
| L1 | 37 个 opencode token（老编辑器等价物；内部映射保留，不改名） | 普通用户、老主题 |
| L2 | 语义能力菜单（合并视图 381 条 = 321 条能力 + 65 条模板展开 − 5 条重名；按 34 个能力域分组） | 想让主题「像某个世界」的用户 |
| L3 | 直绑定 425 条（`token.<ns>.<名字>`）+ 状态提示（live/dead/gated/pinned） | 专家、外部 AI 逃生舱 |

规则：L2 只列可达能力（dead 只登记不默认暴露）；L3 一律允许设置，保存只提示状态，不阻止、不删除。

补充定义：

- **425 / 573 边界**：425 = 公开合约命名空间（`--dsw` 403 + `--shiki` 11 + `--dsh` 11）；573 = 运行时页面出现的变量名，多出 148 个局部变量（`--dsh` 额外 60 + `--dsl` 20 + 局部 `--dsw` 12 + 组件局部 56），登记在 `tokens.yaml` 的 `runtime` 段、不建用户能力。
- **状态模型**：主状态（live/dead/missing）互斥 + 修饰（declared_invalid/pinned/gated）可叠加；颜色轴 184 + 38 = 222；当前 gated 仅 elevation 五名（颜色轴内），无 `--dsh` 轴 gated。
- **效果家族**：颜色/排印/圆角/阴影/玻璃/图标/媒体背景/外壳已落能力；动效曲线与密度（padding/margin/gap）当前不开放（宿主无 token + rule 白名单不含间距）；DOM 结构改动标 experimental（默认关闭）。

## 7. 版本与兼容

- `api`：主题 schema 版本（当前 3）；**只有 YAML**。
- `palette_version`：能力集版本（新增能力 +0.1.0，破坏性 +1.0.0）。
- 模块 `version` + `_index.yaml` 的 `requires`：跨模块不兼容时门禁报错（`palette-check.py` 已实现）。
- `tokens.yaml` 版本 = 宿主版本 + commit（当前 `dsh 0.2.1-rc.3 @ 1f81c04`；rc.3 主题面与 rc.2 逐字节相同）；`tokens.yaml` 自身 `api: 1` 是事实表独立版本，与主题 `api: 3` 无关。
- 37 个 opencode token 保留为映射层、不改名（原第 16 条）；37 款预置主题颜色升级是主题数据升级，归 #145。

## 8. 验收判据（可变成测试）

1. `palette/` 11 个 YAML 全部解析；`palette-check.py` 跨模块检查 **0 错误 0 警告**（id 文法/能力域、token 存在与状态、realization 契约、锚点、值类型、直接绑定 425 覆盖、runtime 148 登记、`_index` 计数、模块 version/requires）。
2. 主题校验：拼错能力 id → 报错；写死名/未知 token → 警告不阻止。
3. **425 全量可达**：`direct_bindings` 恰 425 条且与 `tokens.yaml` 一一对应（无遗漏、无多余、id 唯一）。
4. **集合闭合**：425 = 颜色 222 + 非颜色 203；573 = 425 + 148；`crosswalk` 中 P1–P4 每一行都有落点（能力或直绑定）。
5. 值形状：`diurnal: true` 单值/成对都通过、`diurnal: false` 只接受单值；非法值被拒。
6. 视频背景经 `insert-media-layer` 生效，切主题后精确撤销（无残留节点）。
7. 预览与运行时对同一 theme.yaml 产生同一份 plan（快照测试）。
8. 状态提示：dead/gated/pinned 名在编辑器显示状态、可写、不阻止。
9. `_index.yaml` 计数与重算一致：`capabilities_authored`=30、`capabilities_generated`=65、`capabilities_unique`=381、`regions_covered`=12（缺口 detail/plugin，目标 14/14）、`domains_covered`=30、`direct_bindings`=425、`runtime_registered`=148。
10. 零偏差：`gen_palette_v5.py` 重跑结果与提交一致；`docs/research/palette-v5-crosswalk.json` 覆盖 P1/P2/P3/P4 全部行。

## 9. 未定项（不要假装已定）

- 字段细节（`meta` 子字段、license 等）：2026-10-24 起由本 SPEC §3 固定；后续调整走 §11 变更记录（#140 已关闭，字段清单以本文件为唯一真源）。
- 主题包资源如何从本地目录送到浏览器（文件通道/URL 方案）：未确证。
- 排印轴验收归 #148、材质档位归 #149、区域背景与媒体归 #137、预览区复刻归 #146、主题编辑器 UI 归 #141、37 款迁移归 #145（切分已入 #147 裁定记录，用户仍可调）。
- `extensions`（B 脚本 / C HTML 片段）扩展层：格式预留，加载器未实现；开启时必须有安装前强提示。
- C2「任意选择器 + 任意属性」不开放给用户；需要新效果 = 作者扩 palette。
- 动效细节（过渡曲线/时长）与密度（padding/margin/gap）当前不开放：是否扩进 V3 待定。
- `npm run palette:gate` / `palette:scan-tokens` / `palette:scan-anchors` 尚未接入 `package.json`：实现期。
- 主题包分发/市场/审核：地图 #128 fog，不在 V3 范围（用户裁定不做市场/在线下载）。
- 运行时 148 与 DOM 增量（rc.3 新增 3 个 slot、`.panelRow` 排除、几何兼容）：P7 升级演练复测后更新。

## 10. 决策来源

- #147 裁定记录（U1–U22）：全量收录（C1–C5 × A–F）、可达=编辑器+手写、预览区、区模型、变量表保留、入口层级、三级 tier、扩展层、主题来源两类、变量 $ref、多语言字体、V3 一次做全、主题包目录、只有 YAML、内置+本地、theme.yaml **五键**（api/meta/variables/capabilities/extensions）、别名链、严格拒收、不做 reduced-motion、本票只定承载格式、六条验收、技术自检归我方。
- 逐技术组讨论：P1 颜色 222 / P2 私有契约面 / P3 DOM / P4 非颜色 203 + 运行时 148（各 HTML 表见 `docs/research/`）。
- 证据文档：`v3-color-222-ability-map.html`、`v3-private-surface-ability-map.html`、`v3-dom-ability-map.html`、`v3-noncolor-surface-ability-map.html`、`v3-capability-master.html`、`color-axis-token-inventory.md`、`theme-ceiling-absolute.md`、`moddable-surface-registry.md`。
- 机器源：`palette/`（v3.0.0）。

## 11. 变更记录

- 2026-10-22 v1.0：格式确定，落盘 palette/。
- 2026-10-22 v1.1～v1.10：九轮独立对抗式二审修正（425 数字、值类型、状态模型主状态+修饰、展开 id 规则、checker 从 7 项扩到全量 YAML/守卫/declared/version 校验、条件写契约单源化等；详见 git 历史）。
- 2026-10-24 v1.11：`tokens.yaml` 由扫描器全量生成 425 条（含状态/声明/全部消费位置/运行时段），宿主基准升 rc.3。
- 2026-10-24 v1.12（P5 定稿）：能力菜单固化为手写源 `capabilities.yaml` + 由全部底层模块合成的 `palette.yaml`（`capabilities` 319 + `direct_bindings` 425）；新增 kind `token`/`effect`、字段 `tier`/`exposure`/`status`/`probe`/`binds`/`tech`/`source`；`values.yaml` 新增 `font`/`font_style`/`filter`/`shape`；`vocabulary.yaml` 新增 `token` 能力域（34）；`tokens.yaml` 新增 `runtime` 段（148 条登记）；格式层去除 v1 JSON 兼容、`raw_tokens`、legacy 映射层（叙述层清除见 v1.13）；验收改 10 条（含 direct_bindings 覆盖、集合闭合、crosswalk 零偏差）。
- 2026-10-24 v1.13（P6 定稿）：`ownership` 策略从生成器硬编码迁到 `palette/ownership.yaml` 模块（merged 10 / renamed 4 / converted 9 / dropped 2），合成视图不再产生新事实；两条 recipe 能力（`composer.glass`、`menu.surface.glass`）保留进合成能力集；tier 词表统一为 stable/advanced/experimental/dead；`capabilities.yaml` 手写能力 30 条、合成能力 321 条；第 12 轮独立二审的 5 P1 + 8 P2 已修。第 13/14 轮二审收尾：`primitives.yaml` 的 raw_tokens 叙述清除、`palette.yaml` 生成头补 ownership、checker 升 v1.13（ownership converted 全字段、`_index.capabilities_synthesized`、requires 覆盖全部模块）、P6 补 G1（34/34）、P1P5 计 47/47。
