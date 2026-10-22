# 颜色轴的 token 实名面：222 / 184 / 38（票 #147）

> 票：[#147](https://github.com/FeatherHunter/dsh-opencode-palette/issues/147)（父票 #128，上下文底稿 #127）
> 采集日期：2026-10-20
> 基线：DSH 源码 `D:\Temp\dsh-src` @ `687f282`（v0.2.1-rc.2）；本仓 `D:\dsh-plugin\dsh-opencode-palette`
> 证据约定：宿主路径相对 `D:\Temp\dsh-src`，本仓路径相对仓库根。**（事实）** = 逐行读过或脚本逐条数过；**（计数）** = 本次用 PowerShell 全量扫描数出来的，复现脚本见 §8；**（推断）** = 由事实外推、未实机验证。
> 本文不重复既有研究：宿主 token 契约、状态机（`live / declared_invalid / missing / dead / pinned / gated`；旧笔记写作 `declared-invalid`，以 palette 机器值 `declared_invalid` 为准）与漂移探针见 [host-token-probe-136.md](./host-token-probe-136.md)；403 总数与排印轴见 [v3-capability-matrix.md](./v3-capability-matrix.md)；"全量"的市面上限对标见 [theme-ceiling-benchmark-151.md](./theme-ceiling-benchmark-151.md)。
> **本文只回答既有笔记没回答的一问**：把范围收紧到**颜色轴**，逐名给出「声明 / 有效 / 死名」三份清单，并把本仓今天写出的名字逐条对上号。既有笔记给的是「425 名里约 180 个有效」的**混合口径**（180 里含排印名的折算），且没有颜色轴逐名清单，也没有「本仓今天写错了哪几个」的对照——所以需要这一次新查。

**用语（2026-10-20 与用户对齐后）**

- **opencode token**：本插件最初基于 opencode 主题设计的那 37 个参数（`COLOR_SLOTS` 的 `key`，如 `background` / `textMuted` / `syntaxKeyword`）。旧称「颜色 / 色槽」，**已废弃**，新文档一律用 opencode token。
- **主题 token**：宿主 DSH 画界面用的 CSS 变量名（`--dsw-*` / `--shiki-*` / `--dsh-*`），即 opencode token 落到宿主上的"宿主名"。
- **注入（inject）**：本插件把 token 值送进页面的动作。两条通道：宿主 API `theme.overrideTokens('opencode-palette', tokens)`（`runtime/client.ts:736`）与自建 `<style data-plugin>` 节点里的 `body{--x:…}` 规则（`runtime/client.ts:739-741`）。**「写」这个词不专业，停用。**
- **覆盖（override）**：同名 token 上我们的值优先于宿主样式表的值——这是"注入"的结果，不是动作名。
- **活名 / 死名**：宿主有组件在读 / 宿主声明了但全仓没有 `var()` 消费方。

---

## 0. 结论速览（先看这 8 条）

1. **颜色轴的声明面是 222 名，不是 403 也不是 425。** 222 = alias 107 + static 77 + specific 11 + shiki 11 + elevation 5 + shadow 4 + gradient 3 + focus 1 + menu 1 + linear 2（计数，§2）。425 是 `--dsw*/--shiki*/--dsh*` 三前缀全量，其中排印轴（`--dsw-font-*` 184 名）占了最大的块；403 是只看 `--dsw-` 前缀的口径。**两个数都不是颜色轴的数字**——这是本轮对既有笔记的口径澄清。
2. **颜色轴真正常用的只有 184 名，死名 38 名**（184 + 38 = 222，无重叠、无遗漏，§3 逐名）。死名 = 宿主声明了但**全仓没有任何 `var()` 消费方**。
3. **38 个死名的构成**：static 17 + alias 14 + specific 3 + linear 2 + shadow 2（§3.1–§3.3）。排印轴的 149/150 longhand 死名是另一回事，**不在这 38 里**。
4. **本仓今天写出 105 个宿主颜色名，其中 14 个正落在死名清单上**（§4.2）。也就是说：**用户现在调这 14 个名字，界面一定不变**。14 个的死名身份不是我们猜的，是宿主侧零消费方判定的。
5. **本仓写的名字没有拼错、没有过期、没有自造名混进宿主命名空间**：105 个全部能在宿主声明里找到（§4.1）；唯一自造名 `--dsl-code-block-background` 用 `--dsl-` 前缀，不占用宿主名。
6. **宿主有、本仓没写的活名 = 93 个**（§4.3）。按族拆：static 60 + alias 19 + elevation 5 + gradient 3 + shadow 2 + focus 1 + menu 1 + shiki 1 + specific 1。这 93 个就是"全量"要求里**真正的新增面**——注意其中 60 个是调色板原子（static），它们不直接出现在组件样式里，而是被 alias 定义引用。
7. **"配了不生效"有 5 种成因，不止死名一种**（§5）：死名 38、声明期值链断裂 2、元素级重绑 5（颜色轴；另有 `--dsh` 轴 1）、平台门控 2、我们主动拒写 1（第 4/5 类属**引擎自动生成过滤层**的分类，不进入用户层状态机）。**v1.6 注**：「主动拒写」不是用户禁令——用户层 / L3 一律允许设置、只提示。票面决策点②要的"5 类"应当对齐既有状态机（`dead / declared_invalid / pinned / gated / missing`；其中 declared_invalid / pinned / gated 是叠加在 `live` 上的修饰标签，不是并列状态），而不是只讲死名。
8. **三档暴露的候选数字**（§6）：基础档 37 个 opencode token → 105 名；分区全表 → 184 活名（含 60 原子）；专家档 → 任意 `--` 名。死名一律不进默认 UI。

---

## 1. 口径：为什么"403 个 token 只有 180 个有效"对颜色轴不成立

（事实 + 计数）三个数字的口径互不相同，混用就会出现"222 个颜色名怎么只有 180 个有效"这类对不上的问题：

| 口径 | 数字 | 含什么 | 出处 |
| --- | --- | --- | --- |
| 三前缀全量声明 | **425** | `--dsw-*` 403 + `--shiki-*` 11 + `--dsh-*` 11 | `host-token-probe-136.md:267`（本轮复核一致） |
| 仅 `--dsw-` 前缀 | **403** | 含排印 184、圆角 6、滚动条 5、撑满 3… | 同上 |
| **颜色轴（本票范围）** | **222** | 见 §2 分族 | 本轮新数（§8 脚本） |
| 颜色轴有效 | **184** | 222 − 38 死名 | 本轮新数 |
| 颜色轴死名 | **38** | 无任何 `var()` 消费方 | 本轮新数 |

对照 #127 §1.5 用户的原始提问「为什么有 403 个 token 但是有效的只有 180 个」：**403→180 是排印轴主导的折算**（150 个 per-role longhand 里 149 个是死名，见 `v3-capability-matrix.md:47`）。颜色轴自己的折算率是 **184/222 ≈ 83%**，比排印轴高得多。**这个差别值得在票里讲清楚**：用户看到的"有效率很低"，病根在排印轴的 longhand 死名，不在颜色轴。

---

## 2. 颜色轴 222 名的分族表（计数）

判定方法（§8 脚本）：在 `packages/client/ui-theme/src/styles/*.css` 里抓 `--(dsw|shiki|dsh)-...:` 声明；剔除**几何量、滤镜、时长**等非颜色 token；用全仓非本仓样式表的 `var(\s*--name` 计数判定消费方；`--shiki-token-*` 9 名由 shiki 运行时的 `css-variables` 主题消费（`CodeBlock.tsx:52` 的 `className: 'shiki css-variables'`），记为活。

| 族 | 声明数 | 死名 | 活名 | 说明 |
| --- | --- | --- | --- | --- |
| `--dsw-alias-*` | 107 | 14 | 93 | 语义层，宿主组件直接消费的主层 |
| `--dsw-static-*` | 77 | 17 | 60 | 调色板原子层；只被 alias 定义引用，不被组件直接消费 |
| `--dsw-specific-*` | 11 | 3 | 8 | 特定区域（气泡/输入/侧栏/菜单…） |
| `--shiki-*` | 11 | 0 | 11 | 代码高亮；9 个 `--shiki-token-*` 由 shiki 运行时消费 |
| `--dsw-elevation-*` | 5 | 0 | 5 | 浮层材质（半透明底/描边） |
| `--dsw-shadow-*` | 4 | 2 | 2 | 阴影层 |
| `--dsw-gradient-*` | 3 | 0 | 3 | onboarding 渐变 |
| `--dsw-focus-*` | 1 | 0 | 1 | `--dsw-focus-ring-color`（`--dsw-focus-ring-width` 是几何量，不计） |
| `--dsw-menu-*` | 1 | 0 | 1 | `--dsw-menu-surface-fill`（`--dsw-menu-backdrop-filter` 是滤镜，不计） |
| `--dsw-linear-*` | 2 | 2 | 0 | 两条渐变**双双是死名** |
| **合计** | **222** | **38** | **184** | |

> 计数口径说明：`--dsw-elevation-stroke`（颜色）与 `--dsw-elevation-stroke-color` 都算在 elevation 5 里；`--dsl-code-block-background` 是本仓自造名，**不计入 222**。

---

## 3. 38 个死名逐名清单

**死名 = 宿主在某处声明了它，但全仓（含宿主组件、`apps/web`、本仓以外的所有包）没有任何 `var(--这个名字)` 消费方。** 声明位置用 `file:line` 给出（`:a/:b` = light/dark 两处声明）。

### 3.1 dead alias（14 个）

| # | 名字 | 声明位置 | 本仓是否在写 |
| --- | --- | --- | --- |
| 1 | `--dsw-alias-bg-multi-select` | `design-platform.css:180/:298` | **写**（`map-dsh.ts:36`） |
| 2 | `--dsw-alias-border-inverted2` | `design-platform.css`（inverted 组） | **写**（`map-dsh.ts:153`） |
| 3 | `--dsw-alias-brand-primary-invert` | `design-platform.css` | **写**（`map-dsh.ts:126`） |
| 4 | `--dsw-alias-brand-text` | `design-platform.css` | **写**（`map-dsh.ts:65`） |
| 5 | `--dsw-alias-button-ghost-active-hover` | `design-platform.css` | **写**（`map-dsh.ts:145`） |
| 6 | `--dsw-alias-button-primary-dimmed` | `design-platform.css` | **写**（`map-dsh.ts:128`） |
| 7 | `--dsw-alias-button-tool-bar-fill-invisible` | `design-platform.css` | **写**（`map-dsh.ts:143`） |
| 8 | `--dsw-alias-interactive-bg-hover-accent` | `design-platform.css` | **写**（`map-dsh.ts:148`） |
| 9 | `--dsw-alias-markdown-code-segment-selected` | `design-platform.css` | **写**（`map-dsh.ts:31`） |
| 10 | `--dsw-alias-markdown-code-segment-unselected` | `design-platform.css` | **写**（`map-dsh.ts:30`） |
| 11 | `--dsw-alias-markdown-placeholder` | `design-platform.css:234/:352` | **写**（`map-dsh.ts:34`） |
| 12 | `--dsw-alias-bg-mask-2` | `design-platform.css:175/:293` | 否 |
| 13 | `--dsw-alias-bg-mask-3` | `design-platform.css`（mask 组） | 否 |
| 14 | `--dsw-alias-bg-mask-photo` | `design-platform.css`（mask 组） | 否 |

### 3.2 dead static（17 个）

`--dsw-static-blue-100`、`-blue-50`、`-blue-50p`、`-blue-75`、`-blue-800`、`--dsw-static-deepseek-300`、`-deepseek-600`、`-deepseek-700-delete`、`-deepseek-900`、`--dsw-static-neutral-150`、`-neutral-250`、`-neutral-500`、`-neutral-900`、`--dsw-static-red-100`、`-red-50`、`-red-500`、`-red-900`（17 名，全在 `design-platform.css` 声明；`--dsw-static-blue-50` 的两处声明是 `:15` 与 `:96`）。**本仓一个都不写**（本仓不写 static 层，见 §4.1）。

> 一条被澄清的旧数：既有笔记提过"22 个 static 未被 alias 引用"。那是**只看 `design-platform.css` 的 alias 定义**得出的 22；按"全仓任意 `var()` 消费方"判定是 **17**。差别在 5 个：它们被 alias 之外的消费方（组件 CSS 直接引用）用到。**权威死 static = 17**。

### 3.3 dead specific（3）、dead linear（2）、dead shadow（2）

| 名字 | 声明位置 | 本仓是否在写 |
| --- | --- | --- |
| `--dsw-specific-bubble-highlight` | `design-platform.css` | **写**（`map-dsh.ts:42`） |
| `--dsw-specific-login-input` | `design-platform.css` | **写**（`map-dsh.ts:45`） |
| `--dsw-specific-tip` | `design-platform.css:279/:397` | **写**（`map-dsh.ts:41`） |
| `--dsw-linear-gradient-think` | `gradient-shadow-text.css:2/:43` | 否 |
| `--dsw-linear-think-select` | `gradient-shadow-text.css` | 否 |
| `--dsw-shadow-lv1` | `gradient-shadow-text.css:5` | 否 |
| `--dsw-shadow-lv1-blur` | `gradient-shadow-text.css` | 否 |

> **`--dsw-linear-*` 两条全死**：这是"配了不生效"最干净的一组——宿主自己声明了两条渐变，自己不用。本仓也没写，所以现状无损失，但"全量"若把 linear 算进去就是在卖空气。

---

## 4. 本仓现状：写 105、活 91、死 14、活未写 93

### 4.1 写出面的分族（计数）

来源：`src/engine/map-dsh.ts` 里的单引号 token 名（`TOKEN_MAP` 61 条 = alias 53 + specific 7 + 自造名 1；`DERIVED_TOKENS` 32 条 alias；`SHIKI_MAP` 10 条；`CSS_RULES` 8 条里的引用）。

| 族 | 本仓写出 | 宿主声明 | 覆盖率 |
| --- | --- | --- | --- |
| alias | 85 | 107 | 79% |
| specific | 10 | 11 | 91% |
| shiki | 10 | 11 | 91% |
| static | 0 | 77 | 0% |
| elevation | 0 | 5 | 0% |
| shadow | 0 | 4 | 0% |
| gradient | 0 | 3 | 0% |
| focus | 0 | 1 | 0% |
| menu | 0 | 1 | 0% |
| linear | 0 | 2 | 0% |
| **宿主颜色名合计** | **105** | **222** | **47%** |

- **105 个全部是宿主真实声明的名字**（0 个拼错/过期/自造混入）。自造名 `--dsl-code-block-background` 用 `--dsl-` 前缀，不占宿主命名空间。
- 105 名对应 37 个用户可见的 **opencode token**（原称"颜色"，2026-10-20 由用户定名；`COLOR_SLOTS` 37；`src/engine/map-dsh.ts:230` 的注释称"37 个颜色元数据"）→ **平均每个 opencode token 落 2.8 个宿主名**。这是"37 参数"与"全量 token"之间最容易让人误判的地方：加名字不等于加可见控制项。

### 4.2 本仓写出的 14 个死名（用户改了不会变）

11 个 alias + 3 个 specific。逐条行号见 §3.1（11 条标"写"的行）与 §3.3（前 3 行）：

```
--dsw-alias-markdown-code-segment-unselected   src/engine/map-dsh.ts:30
--dsw-alias-markdown-code-segment-selected     src/engine/map-dsh.ts:31
--dsw-alias-markdown-placeholder               src/engine/map-dsh.ts:34
--dsw-alias-bg-multi-select                    src/engine/map-dsh.ts:36
--dsw-specific-tip                             src/engine/map-dsh.ts:41
--dsw-specific-bubble-highlight                src/engine/map-dsh.ts:42
--dsw-specific-login-input                     src/engine/map-dsh.ts:45
--dsw-alias-brand-text                         src/engine/map-dsh.ts:65
--dsw-alias-brand-primary-invert               src/engine/map-dsh.ts:126
--dsw-alias-button-primary-dimmed              src/engine/map-dsh.ts:128
--dsw-alias-button-tool-bar-fill-invisible     src/engine/map-dsh.ts:143
--dsw-alias-button-ghost-active-hover          src/engine/map-dsh.ts:145
--dsw-alias-interactive-bg-hover-accent        src/engine/map-dsh.ts:148
--dsw-alias-border-inverted2                   src/engine/map-dsh.ts:153
```

**这不是 bug，是宿主契约漂移的历史残留**：这些名字在更早的宿主版本里多半有消费方，宿主删了消费方但保留声明，我们跟着旧版写。票面决策点②要裁的就是"这 14 个怎么呈现"。

### 4.3 宿主有、本仓没写的活名（93 个）

| 族 | 数量 | 清单 |
| --- | --- | --- |
| static | 60 | 全部活 static（§3.2 的补集）：`--dsw-static-amber-*` / `blue-300/400/450/500/600/900/950` / `deepseek-50/100/200/400/450/500/800` / `green-*` / `neutral-*` / `neutral-bluish-*` / `red-400/600` 含带 alpha 后缀的 |
| alias | 19 | `--dsw-alias-brand-primary-new-colorprimary-new-color`（畸形名但**19 处消费**）、`bg-document-preview`、`bg-document-selection`、`label-document-preview`、`bg-mask-1`、`bg-mask-drop`、`label-deep-diving`、`label-deep-diving-shimmer`、`label-shimmer`、`menu-group-header-fill`、`switch-thumb`、`turn-trigger-bg`、`turn-trigger-bg-hover`、`onboarding-accent`、`onboarding-card-fill`、`onboarding-checkbox-border`、`onboarding-secondary-fill`、`settings-card-fill`、`settings-card-stroke` |
| elevation | 5 | `panel` / `prominent` / `soft` / `stroke` / `stroke-color` |
| gradient | 3 | `onboarding-blue-stops` / `cyan-stops` / `violet-stops` |
| shadow | 2 | `lv2` / `lv3` |
| focus | 1 | `--dsw-focus-ring-color`（`focus.css:19` **有默认值声明**；消费方普遍带 fallback） |
| menu | 1 | `--dsw-menu-surface-fill`（`design-platform.css:271/:389`） |
| shiki | 1 | `--shiki-background` |
| specific | 1 | `--dsw-specific-menu`（本仓注释 `map-dsh.ts:28-29` 记录过"主动删除"的理由：不透明底会杀掉毛玻璃） |

> 两个值得单独记住的名字：
> - `--dsw-alias-brand-primary-new-colorprimary-new-color` 是宿主里**明显的手滑产物**（两个名字粘在一起），但有 19 处真实消费。要"100% 还原别人的主题"，它必须能被写。
> - `--dsw-specific-menu` 本仓**主动不写**（设计意图），不是遗漏。这类"有意留白"在"全量"UI 上要么隐藏、要么标注，不能当成缺失。

---

## 5. "配了不生效"的成因（主状态 + 修饰标签，对齐既有状态机）

既有探针笔记（`host-token-probe-136.md:248`）把状态定义成 `live | declared_invalid | missing | dead | pinned | gated`；palette 机器源（`palette/tokens.yaml` §2、`palette/SPEC.md` §6）把它规范成「主状态互斥 + 修饰标签可叠加」——旧笔记里的 `declared-invalid` 是显示写法，机器值统一 `declared_invalid`。

### 5.1 主状态（三选一，颜色轴 184 + 38 + 0 = 222）

| 主状态 | 含义 | 颜色轴实测 | 代表 |
| --- | --- | --- | --- |
| `dead` | 无任何消费方 | **38** | §3 全表 |
| `live` | 有消费方 | **184** | — |
| `missing` | 宿主从未声明 | **0** | 本仓 105 名全部可寻址（§4.1） |

### 5.2 修饰标签（叠加在主状态上，不另计基数）

| 修饰 | 含义 | 颜色轴实测 | 代表 |
| --- | --- | --- | --- |
| `declared_invalid` | 声明合法但值链断裂（`:root` 引 body 级 alias） | **2** | `--shiki-foreground`、`--shiki-background`（`shiki.css:7-19`；宿主靠 `CodeBlock.module.css:92-94` 的 `!important` 兜底） |
| `pinned` | 宿主用字面量 / `!important` / inline 压制，写入当前不生效；**仍允许设置、只提示不阻止**（旧「我们不发射」是引擎过滤层策略，不是用户禁令） | **1–2** | `--dsw-mask-blur: none`（`gradient-shadow-text.css:19`）、darwin `--dsw-specific-menu: rgba(…,0.94)`（`design-platform.css:400-408`，Windows 不匹配） |
| `gated` | 宿主元素级重声明，body 级写入被盖掉 | **5** | 见 5.3 |

> **算术纪律**：184 + 38 = 222 是唯一成立的加法；修饰标签不增加基数。不要再对「184 + 38 + 2 + 1–2 + 6」求和。
>
> **`gated` 定义（v1.5 统一）**：只指「宿主在元素级重声明同名变量、body 级写入被覆盖」。由 JS / shiki 运行时读取计算值消费、CSS var() 扫描看不见消费方的 token（如 `--shiki-token-*`）主状态仍按「有运行时消费方」记 `live`——这是探测口径盲区，不是 `gated`。

### 5.3 `gated` 精确清单（颜色轴 5 + 轴外 1）

- 颜色轴 5 名：`--dsw-elevation-stroke`、`--dsw-elevation-panel`、`--dsw-elevation-prominent`、`--dsw-elevation-soft`（`gradient-shadow-text.css:31-40` 在 `body, body *` 逐元素重声明）+ `--dsw-elevation-stroke-color`（≥10 个组件局部重绑，`gradient-shadow-text.css` 注释与组件样式）。
- 轴外 1 名：`--dsh-scrollbar-thumb`（`scrollbar.css:55-60` 每元素声明 `scrollbar-color`；该路径无 hover 对应变量），属 `--dsh` 命名空间，不在 §2 的 222 颜色轴分族表内。
- 旧记「gated 6」是跨轴合计（5 + 1），不是颜色轴计数；SPEC §6 与决定评论已按 5 + 1 修正。

**用途**：`dead / declared_invalid / pinned / gated` 是"配了不生效"的四种成因，`missing` 是第五种（宿主声明面驱动）。`host-token-probe-136.md:143`、`:496` 已把"不硬编码死名清单"定为原则；判定由探针数据驱动。

**一条重要的机制修正**（本轮新发现）：`--shiki-foreground` 虽然默认 `declared-invalid`，但**本仓在 body 级写它反而修好了宿主的坏链**——内联 style 里的 `var(--shiki-foreground)` 从 body 继承到了我们写的字面量。所以 `declared-invalid` 不等于"写它一定无效"：写在 body 级可以救场。而 `--shiki-background` 本仓没写 → 仍是坏链，属"补上即活"。这两条直接说明：**决策点②不能简单地"死名一律隐藏"**，要按成因分别处理。

---

## 6. 三档暴露的候选数字（为决策点①服务）

| 档 | 内容 | 名字数 | 已有实现 | 代价 |
| --- | --- | --- | --- | --- |
| **L1 基础** | 现有 37 个 opencode token | 37 个控件 → 105 名 | ✅ 今天就是这样 | 0（已是现状） |
| **L2 分区全表** | 按颜色分区展开活名 | **184** 活名（建议：语义 93 + 特定 8 + shiki 11 + 材质 15 + 原子 60，或把原子单列） | 需建分区表 | 要做分区 UI、死名标注、名字→中文释义 |
| **L3 专家** | `tokenPatches` 任意 `--` 名 | 222 + 宿主未来新增 | 需写入通道 | 安全闸（只允许 `--` 前缀、值做形状校验） |

- L2 若把 60 个 static 摆进主表，用户会看到"蓝 50 / 蓝 75 / 蓝 100…"这种没有语义的原子，容易迷惑；但它们是**别人主题 100% 还原**的关键（很多主题作者直接改原子）。
- L3 是"全量"字面要求的兜底：不枚举、只校验。代价是普通用户不会写。
- 死名：L1 不涉及；L2 **不进默认展开**，做"显示无效项"开关或灰显（与 `host-token-probe-136.md:497` 的既有结论一致：`dead` 的旋钮"不展示，或置灰 + tooltip"）。

---

## 7. 机制红线（写之前必须知道的 5 条）

1. **写 body 级是唯一默认位置**：宿主的 alias/static/specific/shadow/linear/gradient 都声明在 `body` 与 `body[data-ds-dark-theme]`；写在 `:root` 会被 body 声明盖掉。（`design-platform.css` 全文）
2. **light/dark 必须成对**：`overrideTokens` 的值形状是 `{light, dark}`（本仓 `src/engine/map-dsh.ts` 的 `TOKEN_MAP` 结构），单个值类型不符会被拒。这是票面决策点④的现成约束。
3. **`body, body *` 逐元素重绑的 5 个颜色轴名字**（§5.3 `gated`：`--dsw-elevation-stroke/-panel/-prominent/-soft/-stroke-color`）写 body 无效，只能进 L3 且要提示"可能不生效"；`--dsh-scrollbar-thumb` 同理但不在颜色轴。
4. **`--dsw-elevation-*` 是半透明材质**：改它会连带改变浮层通透度，与"毛玻璃"效果耦合，不宜放进普通用户档。
5. **darwin 平台门控**：`html[data-platform='darwin']` 下的 `--dsw-specific-menu` 是宿主钉死的 0.94，Windows 用户看不到差异——跨平台主题的"还原度"要在文档里声明这个例外。

---

## 8. 复现脚本（PowerShell，只读）

```powershell
$root = 'D:\Temp\dsh-src'
$themeDir = Join-Path $root 'packages\client\ui-theme\src\styles'

# A 通道：声明面
$decl = @{}
Get-ChildItem $themeDir -Filter '*.css' | ForEach-Object {
  $t = [regex]::Replace((Get-Content $_.FullName -Raw), '/\*[\s\S]*?\*/', '')
  foreach ($m in [regex]::Matches($t, '(--(?:dsw|shiki|dsh)-[a-zA-Z0-9_-]+)\s*:')) { $decl[$m.Groups[1].Value] = $true }
}
"declared = $($decl.Count)"

# B 通道：消费方（排除本仓与 node_modules）
$use = @{}
Get-ChildItem $root -Recurse -File -Include '*.css','*.tsx','*.ts' |
  Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\\.git\\' } |
  ForEach-Object {
    $t = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $t) { return }
    $t = [regex]::Replace($t, '/\*[\s\S]*?\*/', '')
    foreach ($m in [regex]::Matches($t, 'var\(\s*(--(?:dsw|shiki|dsh)-[a-zA-Z0-9_-]+)')) { $use[$m.Groups[1].Value] = $true }
  }
"consumed = $($use.Count)"

# 死名（颜色轴前缀内，排除 shiki-token 运行时消费）
@($decl.Keys | Where-Object { -not $use.ContainsKey($_) } | Sort-Object) -join "`n"
```

- 基线可复现性：`host-token-probe-136.md:196` 记录过——`resources/app.asar` 内联的 `lib/client.js` 与源码 `687f282` 的 403/唯一名完全一致，所以源码扫描结论可直接用于已发布宿主。
- 死名判定**不要硬编码**（本轮 38 是快照；宿主补上消费方就变），生产实现按 `consumers === 0` 动态判。

---

## 9. 未能确证 / 留给票内裁定

1. **static 60 里哪些是"主题作者真的会改"的**：本轮只数出了名字与引用关系，没有统计"市面上主题 JSON 实际用到 static 的比例"。若要论证 L2 该不该摆原子，需要补一份对市面主题包（如 `palette-picker-survey.md` 里的样本）的 static 使用率统计——**未做**。
2. **`--dsw-alias-brand-primary-new-colorprimary-new-color` 的消费语义**：19 处消费，但名字畸形，无法从名字判断它到底对应哪个 UI 位置（需要逐处读上下文）。**未做**，但它必须在 L2 出现。
3. **14 个死名是"曾经活、被宿主删了消费方"还是"从未活"**：需要一份旧版宿主（更早 tag）的对照扫描。**未做**。这影响决策点②的措辞（"历史残留"还是"宿主预留"）。
4. **elevation 5 个的"能不能救"**：写在 `body, body *` 之前还是之后决定胜负；我们没有实测"用更高特异度的选择器重绑能不能盖住逐元素声明"。**未做**，属 L3 机制问题。
