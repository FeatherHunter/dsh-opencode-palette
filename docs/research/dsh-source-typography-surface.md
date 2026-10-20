# DSH Web 客户端排版面调查：字体 / 字号 / 行高 / 各内容类型角色 / CJK

- 调查对象：`https://github.com/deepseek-ai/deepseek-harness`，commit `687f282`（`v0.2.1-rc.2`），本地只读检出 `D:\Temp\dsh-src`
- 唯一目的：把 V3 主题插件要碰的排版面（哪些是 token、哪些是硬编码、哪些根本不可达）铺平，供后续设计取舍
- 正文中文，token 名/文件路径保持英文字面；所有 `file:line` 均相对 `D:\Temp\dsh-src`
- 分档口径：**T1 官方插件 API** / **T2 文档化 CSS 自定义属性覆盖** / **T3 选择器注入的 CSS 规则** / **T4 阻塞**（定义见 §9）
- 本文件不含实施建议，只给事实与可达性

---

## 0. 结论速览

1. 官方只开放 **3 个字号** + **3 个字体族**：`--dsh-content-font-size`（10–22，默认 14）、`--dsh-code-font-size`（10–16，默认 11）、`--dsh-terminal-font-size`（10–20，默认 13）；族名 `--dsh-font-family-{text,code,terminal}`。契约唯一定义在 `packages/client/ui-theme/src/theme-settings.ts`。
2. 字号是**一条轴**：`--dsh-content-font-size` 派生出 `--dsh-content-font-delta`、`--dsh-content-font-size-secondary`、`--dsh-content-font-delta-secondary`，再由 `packages/client/ui-theme/src/styles/gradient-shadow-text.css` 摊成 **14 个 Markdown 排版角色 × 6 个属性 token**（font 简写 / font-family / font-weight / line-height / font-size / font-style）。
3. **行高不是独立轴**：每个角色的行高都写成 `calc(<基准>px + <某个 delta>)`，即"跟着字号算"，没有"行高倍率"入口；全局 `body { line-height }` 在官方样式里**一处都没有**（`packages/client/web/src/base.css:11-33` 只设 font-family / smoothing / text-autospace）。
4. 硬编码仍然占绝对多数：`packages/client` 下 209 个 `.css` 中 `font-size: Npx` **529 处 / 126 文件**、`line-height: Npx` **421 处**、无单位 line-height 61 处。受字号轴影响的只有 **31 个文件**（`--dsh-content-font-size*` 82 处命中）。
5. 真正的死角是**行内代码**：`packages/client/ui-primitives/src/markdown/MarkdownText.module.css:169` 用 `font-size: 0.875em !important` 覆盖了行内码的 token，实际尺寸 = 正文 × 0.875（默认 12.25px），**与 `--dsh-code-font-size` 无关**；`ui-theme/README.md:32` 的「inline code stays 1 px larger」是文档错误。
6. **侧栏终端字号只走 JS**：`--dsh-terminal-font-size` 在 `packages/client` 里**零个 CSS 消费者**，它只经 `theme.fontSizes.terminal` 进 xterm options（`packages/client/ui-sidebar-terminal/src/client/terminal.tsx:85-93`）。外部改这个 CSS 变量对终端**完全无效**（T4）。
7. 终端有**第四套字体栈** `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`（`terminal.tsx:169`），既不同 `--dsw-font-family` 也不同 `--ds-font-family-code`。
8. 仓库**不打包任何 CJK 字体**（`@font-face` 全仓只有 `ui-theme/src/styles/brand-font.css` 的 Montserrat ×3）；中文全靠系统族名 `'PingFang SC' / 'Hiragino Sans GB' / 'Microsoft YaHei'` 出现在栈里。
9. **源码里没有"按语言选字体"的概念**：locale 只做选择/持久化/key 回退/`<html lang>`（`packages/client/locale/src/client/index.ts:148-152`），不碰字体。按语言分派只能靠 `html[lang="zh-CN"]` / `:lang(zh)` 的 CSS 规则（已有先例，见 §7.2）。
10. 存在一条**被低估的 T1 通道**：`ctx.theme.overrideTokens(source, { '<任意 CSS 变量>': { light, dark } })`（`packages/client/ui-theme/src/client/index.ts:369-378`）不限颜色，且 `ThemePresenter` 把 token 写在**字号之后**（`packages/client/ui-layout/src/client/theme-presenter.ts:77-90`）——用它可以正式覆盖 `--dsw-font-markdown-*` 等排版 token，且优先级高于设置值。

---

## 1. 官方可改面

### 1.1 三个字号旋钮

`packages/client/ui-theme/src/theme-settings.ts`

| 角色 | 字段 | CSS 变量 | 范围 | 默认 | 源码 |
|---|---|---|---|---|---|
| text | `fontSize` | `--dsh-content-font-size` | 10–22（步长 1） | 14 | `theme-settings.ts:57-61`，`FONT_SIZE_MIN/MAX/DEFAULT` 见 `:24/:27/:30` |
| code | `codeFontSize` | `--dsh-code-font-size` | 10–16 | 11 | 同上 |
| terminal | `terminalFontSize` | `--dsh-terminal-font-size` | 10–20 | 13 | 同上 |

- `FONT_ROLES = ['text','code','terminal']`：`theme-settings.ts:33`
- 校验：`fontSizeSchema = .step(1).min().max().default()`：`theme-settings.ts:114-116`；schema 组装：`:139-147`
- 设置 UI：`FontSizeRow.tsx:66-79`（±1 步进、边界 disable）；`FontSettingsGroup.tsx:45-53`（展开区顺序 text 族 → code 族 → code 号 → terminal 族 → terminal 号，每次挂载收起，`:35`）

### 1.2 三个字体族入口

| 角色 | 字段 | 变量 | 默认值 | 源码 |
|---|---|---|---|---|
| text | `textFontFamily` | `--dsh-font-family-text` | `''`（空选中内置栈） | `theme-settings.ts:72-76`、`fontFamilyVariable()` `:84-86` |
| code | `codeFontFamily` | `--dsh-font-family-code` | `''` | 同上 |
| terminal | `terminalFontFamily` | `--dsh-font-family-terminal` | `''` | 同上 |

`FontFamilyRow.tsx`：单行 Input，`onBlur`/`Enter` 提交 `normalizeFontFamily(input.value)`（`:37-40`、`:57-61`，带 IME 守卫 `isComposing || keyCode === 229`），`maxLength={200}`、`spellCheck={false}`；**不枚举本机字体**（`ui-theme/README.md:38`）。

### 1.3 运行期投影：谁盖谁（决定插件能不能"抢"字号）

| 写入者 | 目标与内容 | 时机 | 覆盖关系 |
|---|---|---|---|
| Host boot script | `document.body.style`：三字号 + 非空三族 | 首帧前（`ui-theme/src/boot-theme.ts:28-44`，注入 `:55-63`） | 被后续 `ThemePresenter.apply` 重写；被样式表 `!important` 击败 |
| `ThemePresenter.apply` | `documentElement.style.colorScheme`、`html[data-ds-theme-source]`、`body[data-ds-dark-theme]`，随后**按序**写：三字号（`theme-presenter.ts:77-79`）→ 三族（`:80-84`）→ `snapshot.active.tokens` 逐条（`:85-90`） | 每次 snapshot | 同一元素同一属性的**后写者赢**，故 token 层压过设置值；样式表 `!important` 又可压过内联 |
| ui-theme 的 sheet | `body` 上的派生 token（delta / secondary / 阶梯 / 静态档） | 样式表 | 插件后注入的同名 `body` 规则或 `!important` 可改 |
| 插件 | 自建 `<style>` 或 `ctx.theme.overrideTokens` | 任意 | — |

- 插件 sheet 的注入顺序（8 张）：`ui-theme/src/client/styles.ts:13-22`，挂载逻辑 `:28-39`（`<style>` + `dataset.plugin='@deepseek-ai/dsh-client-ui-theme'`）
- 关键结论：**"设置面板改了没反应"**在机制上是有可能的——插件只要用 `!important` 写同名变量就会长期压制用户设置；反之不用 `!important`，插件的 `body{...}` 会被内联样式盖掉（内联优先级高于普通声明）。这是 V3 必须先定的策略。

### 1.4 官方插件 API 面（T1 的真实边界）

`packages/client/ui-theme/src/client/index.ts`

| API | 签名要点 | 与排版的关系 |
|---|---|---|
| `ctx.theme.overrideTokens(source, tokens)` | `tokens: Record<string, { light: string; dark: string }>`，`:369-378`；运行时校验只检查"是字符串对"，**不限颜色**（`:466-486`） | 可写任意 `--dsw-*` / `--dsh-*` 自定义属性，落在 `body` 内联、优先于字号设置（§1.3） |
| `ctx.theme.register({ id, colorScheme, tokens })` | `ThemeDefinition`，`:71-81`、`:336-351`；id 不可为 `system`、不可重复 | 只能带 `tokens`（同上是自由字符串），**不能**带字号/行高结构 |
| `ctx.theme.exportInspectTokens()` | 内置 14 个 `--dsw-alias-*` 描述，全是颜色（`:137-152`）；动态 token 记为 `valueType: 'CSS value'`（`:488-496`） | 说明官方**没有**排版 token 的注册表 |
| 设置 slot | `ctx.slots.inject('settings.general.item', …)`，`:570-579` | V3 可以在设置里加自己的行（只改自有状态，不扩展官方 schema） |

注意 `register()` 的第二参数 `colorScheme` 决定 `body[data-ds-dark-theme]`，与排版无关；`ThemeSnapshot.fontSizes/fontFamilies` 只来自官方 schema（`:84-101`），插件无法往 snapshot 里塞第四种字号。

---

## 2. tokenized 面：分层与取值

### 2.1 字体栈（唯一定义处）

`packages/client/ui-theme/src/styles/base.css`

| 变量 | 值 | 行 |
|---|---|---|
| `--dsh-font-family-text-default` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif` | `:7-8` |
| `--dsw-font-family` | `var(--dsh-font-family-text-default)`（`:root`）→ `body` 上重定义为 `var(--dsh-font-family-text, <default>), <default>` | `:9`、`:30` |
| `--dsw-font-family-brand` | `'Montserrat', var(--dsh-font-family-text-default)` | `:10` |
| `--dsh-font-family-code-default` | `'SF Mono', 'JetBrains Mono', 'Fira Code', Consolas, 'Liberation Mono', Menlo, Courier, 'PingFang SC', 'Microsoft YaHei'` | `:11-12` |
| `--ds-font-family-code` | `var(--dsh-font-family-code-default)`（`:root`）→ `body` 上 `var(--dsh-font-family-code, <default>), <default>` | `:13`、`:31` |

- 注释明确：代码栈**故意不带裸 `monospace` 尾巴**，否则 Windows CJK 会掉到 SimSun（`base.css:4-5`）
- `body` 上"用户列表在前、内置栈重复一次兜底"（`:26-28` 注释：重复无害）
- 第二份内联兜底栈在壳层：`packages/client/web/src/base.css:12-24`（`body { font-family: var(--dsw-font-family, <同一串>) }`），另有 `-webkit-font-smoothing: antialiased` / `-moz-osx-font-smoothing: grayscale`（`:27-28`）、`text-autospace: normal`（`:32`）、`button,input,select,textarea { font-family: inherit }`（`:105-110`）

### 2.2 delta 体系（字号轴的传动）

`packages/client/ui-theme/src/styles/gradient-shadow-text.css`

| 变量 | 公式 | 行 | 语义 |
|---|---|---|---|
| `--dsh-content-font-delta` | `calc(var(--dsh-content-font-size,14px) - 14px)` | `:57` | 正文档增量 |
| `--dsh-content-font-size-secondary` | `min(calc(size - 1px), max(13px, calc(size - 2px)))` | `:58` | ≤14 时 = size−1；>14 时 = size−2（下限 13） |
| `--dsh-content-font-delta-secondary` | `calc(secondary - 13px)` | `:59` | 次级档增量 |
| `--dsh-code-font-delta` | `calc(var(--dsh-code-font-size,11px) - 11px)` | `:63` | 代码档增量 |

`ui-theme/README.md:84` 与源码一致；`docs/web-styling.md:20`（中文版 `docs/web-styling.zh.md:20`）是唯一的官方配对规则原文：**「字体大小必须与行高配对；已有角色匹配时使用主题排版变量」**。

### 2.3 Markdown 排版阶梯（14 角色 × 6 token）

同文件，全部声明在 `body`（`:56-275`）。token 命名规则：`--dsw-font-markdown-<role>{,-font-family,-font-weight,-line-height,-font-size,-font-style}`。

| role | font 简写 | 行 | 备注 |
|---|---|---|---|
| h1 | `700 calc(21px+δ)/calc(30px+δ)` + `var(--dsw-font-family)` | `:65-70` | |
| h2 | `700 calc(19px+δ)/calc(28px+δ)` | `:72-77` | |
| h3 | `700 calc(18px+δ)/calc(26px+δ)` | `:79-84` | |
| h4 | `600 var(--dsh-content-font-size,14px)/calc(24px+δ)` | `:86-91` | 与正文同字号、仅加粗 |
| base | `var(--dsh-content-font-size,14px)/calc(24px+δ)` | `:93-98` | 正文，leading 10px |
| base-strong | `600 …(同上)` | `:100-105` | |
| base-italic | `italic …` | `:107-112` | |
| base-strong-italic | `italic 600 …` | `:114-119` | |
| table | `var(--dsh-content-font-size-secondary,13px)/calc(22px+δ₂)` | `:121-126` | 次级档 |
| table-head | `500 …(同上)` | `:128-133` | |
| small 系 | **固定 `12px/20px`**（含 strong 600 / italic / strong-italic） | `:135-161` | 不吃任何轴 |
| code | `calc(12px+codeδ)/calc(19px+codeδ)` + `var(--ds-font-family-code)` | `:163-168` | = 代码字号 +1px |
| code-block | `var(--dsh-code-font-size,11px)/calc(19px+codeδ)` | `:170-175` | |
| code-block-small | `var(--dsh-code-font-size,11px)/calc(16px+codeδ)` | `:178-183` | 注释 `:177` 标「手工补充，非插件导出」，用于工具行展开卡片 |

### 2.4 固定界面阶梯（不吃字号的静态档）

`gradient-shadow-text.css:185-274`，命名与取值**有一处不一致**：

| token | 实际值 | 行 |
|---|---|---|
| `--dsw-font-xl-24` | `600 24px/32px` | `:186-191` |
| `--dsw-font-l-20` | `500 20px/28px` | `:193-198` |
| `--dsw-font-m-18` | **`500 16px/28px`**（名为 18，实为 16） | `:200-205` |
| `--dsw-font-base-16` | `16px/24px` | `:207-212` |
| `--dsw-font-base-strong-16` | `500 16px/24px` | `:214-219` |
| `--dsw-font-s-14` | `14px/22px` | `:221-226` |
| `--dsw-font-s-strong-14` | `500 14px/22px` | `:228-233` |
| `--dsw-font-xs-13` | `13px/20px` | `:235-240` |
| `--dsw-font-xs-strong-13` | `500 13px/20px` | `:242-247` |
| `--dsw-font-xxs-12` | `12px/18px` | `:249-254` |
| `--dsw-font-xxs-strong-12` | `500 12px/18px` | `:256-261` |
| `--dsw-font-xxxs-11` | `11px/14px` | `:263-268` |
| `--dsw-font-xxxs-strong-11` | `500 11px/14px` | `:270-274`（`:270` 起） |

### 2.5 shiki（只有色，没有字）

`packages/client/ui-theme/src/styles/shiki.css:7-19`：`--shiki-foreground: var(--dsw-alias-label-primary)`、`--shiki-background: var(--dsw-alias-markdown-code-block)`、`--shiki-token-{constant,string,comment,keyword,parameter,function,string-expression,punctuation,link}` 各自硬编码色值；深色替换在 `body[data-ds-dark-theme]`（`:21-31`）。**无任何字号/字体变量**。

集成点：`packages/client/ui-primitives/src/markdown/highlight.ts:21`（`createCssVariablesTheme`），`:257-262` 固定 `variablePrefix: '--shiki-'`、`fontStyle: true`；token 只带 `color` 与 vscode-textmate 的 italic/bold/underline 位（`:427-436`），**不带字号/字族**——字体全部继承自容器。

### 2.6 Montserrat

`packages/client/ui-theme/src/styles/brand-font.css:2-24`：3 个 `@font-face`（family `'Montserrat'`，normal，weight 300/400/500，`font-display: swap`，src `./montserrat-{light,regular,medium}.woff2`）。资产与 `Montserrat-OFL.txt` 同目录。

实际消费点只有两处（全仓 grep `--dsw-font-family-brand` 仅 11 命中，其中 3 处是定义/文档）：
- `apps/desktop/renderer/welcome.css:22`（定义等价变量）、`:68`、`:123`、`:206`
- `packages/client/ui-settings-account/src/client/DesktopOnboarding.module.css:43`、`:51`、`:56`、`:304`

即 **Web 正文/标题/代码/终端都不用它**，V3 想用品牌字必须自己把 token 指过去。

---

## 3. 各内容类型角色表（tokenized vs hardcoded）

图例：**TOKEN** = 有变量可改；**HARD** = 组件里写死（需 T3 选择器注入）；**MIX** = 一半 token 一半 `!important`。

| # | 角色 | 生效值来源 | file:line | 分档 |
|---|---|---|---|---|
| 1 | 助手正文 | `--dsw-font-markdown-base`（14 / 24+δ） | `ui-primitives/src/markdown/MarkdownText.module.css:8`；容器 `ui-chat/src/client/chat/AssistantMarkdown.module.css:12-13` | TOKEN |
| 2 | 用户气泡正文 | `--dsh-content-font-size` + `calc(22px+δ)`（leading 8） | `ui-chat/src/client/chat/MessageItem.module.css:33-34` | TOKEN |
| 3 | 次级正文（摘要/流内行/时间/统计） | `--dsh-content-font-size-secondary` + `calc(18~20px+δ₂)` | `MessageItem.module.css:44-45`、`:265`、`:278-279`；`ChatView.module.css:139`、`:224`；`ReasoningRow.module.css:48-49`；`StatsPills.module.css:10`；`TurnUsagePanel.module.css:30` | TOKEN |
| 4 | 更低一档（行内 -1px / -2px） | `calc(secondary - 1px)` / `calc(secondary - 2px)` | `ui-tool/.../ToolRow.module.css:67`；`QuestionToolRow.module.css:15-16` | TOKEN（公式写死） |
| 5 | Markdown 标题 h1–h4 | `--dsw-font-markdown-h1..h4` | `MarkdownText.module.css:17,22,27,32` | TOKEN |
| 6 | 标题 h5/h6 | `--dsw-font-markdown-base-strong` | `MarkdownText.module.css:37` | TOKEN（无独立档） |
| 7 | **行内代码** | `font: var(--dsw-font-markdown-code)` **但** `font-size: 0.875em !important` | `MarkdownText.module.css:163-174`（关键 `:167`、`:169`） | **MIX（实际 HARD）** |
| 8 | 标题里的行内代码 | `font: inherit` + 代码族 | `MarkdownText.module.css:176-179` | HARD（继承标题） |
| 9 | 代码块正文 | `--dsw-font-markdown-code-block`（11 / 19+codeδ） | `MarkdownText.module.css:157-161`；`CodeBlock.module.css:10`、`:79` | TOKEN |
| 10 | 代码块 banner（语言名/复制） | `11px/18px` + `var(--dsw-font-family)`（**用正文字族**） | `CodeBlock.module.css:9`、`:47-49`；`CodeCard.module.css:20` | HARD |
| 11 | CodeCard 头部/正文 | `--dsw-font-markdown-code-block`；banner 同 #10 | `CodeCard.module.css:7`、`:20`、`:33`、`:81` | MIX |
| 12 | 表格 | `--dsw-font-markdown-table` / `-table-head`（13 / 22+δ₂） | `MarkdownText.module.css:249`、`:258` | TOKEN |
| 13 | **表格内行内代码** | `font-size: 11px` | `MarkdownText.module.css:274` | HARD |
| 14 | 紧凑变体（compact） | 容器 `--dsh-content-font-size-secondary` + `calc(20px+δ₂)`；内部标题 `font: inherit; 600`；内部行内码 `1em !important` | `MarkdownText.module.css:333-334`、`:340-341`、`:388`、`:423` | TOKEN（内码 HARD） |
| 15 | 对话内终端（TerminalBlock） | `--dsl-terminal-font`（= code-block token）+ **`--dsl-terminal-line-height: 22px`（固定）** | `ui-primitives/src/TerminalBlock.module.css:3`、`:7`、`:75`、`:84`、`:145`、`:155`、`:203` | MIX（行高固定） |
| 16 | 终端状态字 | `--dsw-font-xs-13` | `TerminalBlock.module.css:144` | HARD（静态档） |
| 17 | diff（DiffBlock） | `--dsw-font-markdown-code-block`；`white-space: pre` | `DiffBlock.module.css:9`、`:17`、`:25`、`:31` | TOKEN |
| 18 | read（ReadBlock） | `font: inherit`（继承 code 容器） | `ReadBlock.module.css:37`、`:4`、`:22` | TOKEN（间接） |
| 19 | thinking（ReasoningRow） | 正文次级档；行高/面板高 `calc(24px+δ)`、`calc(20px+δ₂)` | `ReasoningRow.module.css:8`、`:29`、`:48-49` | TOKEN |
| 20 | 搜索块（SearchBlock） | `--dsl-search-line-height: 22px` 固定 + `--dsw-font-xs-13` + code-block token | `SearchBlock.module.css:3`、`:28`、`:40`、`:45`、`:110` | MIX |
| 21 | JSON 块 | `12px/18px`；内部 code `11px/16px` | `ui-primitives/src/markdown/JsonBlock.module.css:6-7`、`:29-30` | HARD |
| 22 | JSON 树 | `12px/16px` + 代码族 | `ui-primitives/src/JsonTree.module.css:15` | HARD |
| 23 | Web 抓取块 | `14px/500/20px`、`13px/19px`、`13px/500/19px` + `--dsw-font-xs-13` | `WebBlock.module.css:56-58`、`:81-82`、`:89`、`:95`、`:100`、`:113-115`、`:134` | HARD |
| 24 | 工具行（ToolRow） | `--dsh-content-font-size-secondary` + `calc(24px+δ)`（**字号用次级、行高用主 δ**） | `ui-tool/.../ToolRow.module.css:41-42`、`:54-55`、`:96-97`；`:67` | TOKEN（口径混用） |
| 25 | 工具详情（ToolDetails） | `--dsw-font-xs-13` + 多处 `12px`/`13px`/`16px` | `ToolDetails.module.css:7`、`:38`、`:63-64`、`:82`、`:159`、`:179`、`:224` | HARD |
| 26 | bash 示例卡 | `--dsw-font-markdown-code-block-small` + `--dsl-terminal-line-height: 18px` | `ui-tool/.../bash-sample.module.css:16-17`、`:34`、`:219-220` | MIX |
| 27 | 提问卡（AskQuestionCard） | 正文档 + `calc(24px+δ)` | `AskQuestionCard.module.css:26-27`、`:49-50`、`:65-66` | TOKEN |
| 28 | 组件文本预览/文档预览 | `--dsw-font-xs-13` / code-block；含 `12px/18px` 硬编码 | `ui-sidebar-documentpreview/.../TextPreview.module.css`、`markdown/MarkdownBody.module.css` | MIX |
| 29 | shell 启动页（boot page） | `16px/24px/600`、`12px/18px`、`14px/22px/600`、code `12px/18px` + 内联 CJK 兜底栈 | `packages/client/web/src/boot-page.module.css:32-34`、`:40-41`、`:80-82`、`:87-100` | HARD |
| 30 | **侧栏终端（xterm）** | JS：`theme.fontSizes.terminal` + `terminalFontFamily(...)` | `ui-sidebar-terminal/src/client/terminal.tsx:85-93`、`:169-173` | **JS only（CSS 无效）** |
| 31 | 终端容器/空态/引导 | `13px`、`line-height: 1.6`、`14px/1.4`、`11px/1.4` | `terminal.module.css:1`、`:8`；`TerminalCleanup.module.css:2`；`TerminalGuide.module.css:7-8` | HARD（不影响 xterm 网格） |

补充：`.markdown li::marker { line-height: 24px }` 硬编码（`MarkdownText.module.css:116`）；`.previewName { 12px/18px }`（`:465-466`）；KaTeX 显示式只做横向滚动，不改字号（`:181-185`）；compact 内 `.katex { font-size: 1em }`（`:430-432`）。

---

## 4. hardcoded 面：规模与分布

### 4.1 计数（`packages/client` 下 209 个 `.css`）

| 指标 | 数量 | 说明 |
|---|---|---|
| `font-size: Npx` | **529 处 / 126 文件** | 12px×165、14px×114、13px×113、11px×54 为主 |
| `line-height: Npx` | **421 处** | |
| 无单位 `line-height` | 61 处 | 多为 `1`/`1.4`/`1.6` |
| 受字号轴 `--dsh-content-font-size*` | 82 处 / **31 文件** | 对话层与工具层 |
| `--ds-font-family-code` 消费 | 56 处 / 25 文件 | |
| `--dsw-font-family` 消费 | 71 处 / **仅 11 文件** | 绝大多数 UI 文字靠 `body` 继承 |
| `--dsw-font-markdown-*` 消费 | 29 处 / 16 文件 | `ui-chat`、`ui-primitives`、`ui-tool`、`ui-deliverables/FileDiff`、`ui-skill`、`ui-plugin-manager`、`ui-sidebar-documentpreview` |
| `height: calc(<n>px + var(--dsh-content-font-…))` | 29 处 | 图标/行高几何挂在**字号 delta**上（§5.2） |
| `line-height: calc(<n>px + var(--dsh-content-font-…))` | 45 处 | 组件自己算，不读 `-line-height` token |
| `line-clamp: N` | ~10 处 | 固定行数截断，行高变化即改变可见内容 |

### 4.2 值得单独记的硬编码

| 内容 | 值 | file:line |
|---|---|---|
| 代码块 banner | `11px/18px`（正文字族） | `CodeBlock.module.css:47-49`、`CodeCard.module.css:20` |
| 表格内 code | `11px` | `MarkdownText.module.css:274` |
| 行内 code | `0.875em !important` | `MarkdownText.module.css:169` |
| 紧凑变体行内 code | `1em !important` | `MarkdownText.module.css:388` |
| 列表 marker 行高 | `24px` | `MarkdownText.module.css:116` |
| 终端行高 | `22px` / `18px` | `TerminalBlock.module.css:3`、`bash-sample.module.css:17`、`ToolRow.module.css:306` |
| JSON 块 | `12px/18px`、`11px/16px` | `markdown/JsonBlock.module.css:6-7`、`:29-30` |
| JSON 树 | `12px/16px` | `JsonTree.module.css:15` |
| Web 块 | `14px/500/20px` 等 | `WebBlock.module.css:56-58`、`:81-82`、`:113-115` |
| 消息尾部细节 | `14px/500/22px`、`12px/15px` | `MessageItem.module.css:352-354`、`:362-363` |
| 助手消息脚注 | `11px/18px` | `AssistantMarkdown.module.css:69-70` |
| 终端容器 | `13px` | `terminal.module.css:1` |
| 启动页 | `16px/24px/600` 等 | `web/src/boot-page.module.css:32-34`、`:87-100` |

> CSS Modules 类名带哈希（形如 `VnbZpq_compactionTitle`，原类名作为后缀保留）——这是**已发布产物** `lib/client.js` 的形态；源仓未构建，故 `file:line` 只能给源文件。选择器注入只能靠 `[class*="_markdown"]` 这类后缀匹配、属性钩子（`[data-diff]`/`[data-read]`/`[data-search]`/`[data-terminal]`，见 `web/src/base.css:92-100`）、`html[lang]`、`:lang()`。

---

## 5. font-size 与 line-height 的配对机制

### 5.1 三层结构

| 层 | 形态 | 覆盖范围 | 例子 |
|---|---|---|---|
| L1 token 配对 | 每角色 6 个 token，`font` 简写里同时给 size 与 line-height，另有独立 `-font-size`/`-line-height` | Markdown 14 角色 + 13 档静态阶梯 | `gradient-shadow-text.css:65-183` |
| L2 组件 calc 配对 | 组件直接写 `font-size: var(...)` + `line-height: calc(<n>px + var(--dsh-content-font-delta...))` | 45 处，覆盖对话/工具/工作流/技能/提问等 | `MessageItem.module.css:33-34`、`ToolRow.module.css:41-42` |
| L3 固定 px | size 与 line-height 都是字面量 | 剩下的 ~500 处 | `JsonBlock.module.css:6-7`、`CodeBlock.module.css:47-49` |

**没有"行高倍率"入口**：不存在 `--dsh-line-height-scale` 之类的全局变量；`body` 在官方样式里没有 `line-height` 声明（`web/src/base.css:11-33` 无该属性）。

### 5.2 谁在用 delta 做几何

- 29 处 `height: calc(<14~28>px + var(--dsh-content-font-delta…))`：图标盒与行盒（`ChatView.module.css:188`、`MessageIconActions.module.css:9/:68/:81/:86`、`SkillRow.module.css:13/:31/:41`、`ChatGroupSeat.module.css:34/:40/:45`、`DisclosureRow.module.css:36/:54/:71`、`WorkflowRunPanel.module.css:28/:92/:172/:202/:222`、`TurnUsagePanel.module.css:22/:45`、`MessageFeedbackActions.module.css:9/:22`、`bash-sample.module.css:96/:116/:132`、`QuestionToolRow.module.css:8`、`MessageItem.module.css:129/:138`）
- 45 处 `line-height: calc(...)`（同类包）
- 4 处用 `1lh`（自动跟随行高，是这套体系里唯一"行高无关"的写法）：`DiffBlock.module.css:15`、`ReadBlock.module.css:3`、`markdown/CodeBlock.module.css:131`、`ui-plugin-manager/src/client/PluginManagerPage.module.css:367`

### 5.3 改行高会破什么（按机制归类）

| 破坏点 | 机制 | 证据 |
|---|---|---|
| 图标/行盒垂直错位 | 盒高只跟 **font-delta**，不跟行高；行高一旦变大，文字溢出盒、图标与文字基线不再对齐 | §5.2 的 29 处 `height` |
| 头部/压缩卡高度不匹配 | `--dsh-compaction-header-height: calc(24px+δ)` 被当作布局尺寸 | `MessageItem.module.css:57` |
| 终端/搜索块溢出或裁切 | `--dsl-terminal-line-height: 22px`、`--dsl-search-line-height: 22px` 固定，字号一涨就挤；`maxLines` 默认 16 的输出卡按行数截断 | `TerminalBlock.module.css:3`、`:128`、`:180`；`SearchBlock.module.css:3`；`ui-primitives/README.md:167` |
| 列表基线偏移 | `li::marker` 行高写死 24px | `MarkdownText.module.css:116` |
| 截断内容变化 | 10 处 `line-clamp` 按行数截断 | `InputBar.module.css:250-251`、`TurnNavigator.module.css:186`、`:193`、`AgentPresetSection.module.css:227` 等 |
| 表格变高/横向滚动条位置 | 表头/单元格行高 22+δ₂，宽表靠 `.tableScroll` 横滚 | `MarkdownText.module.css:121-133`、`:192-196` |
| 代码块行号列错位 | 行号列 padding 依赖 `--dsl-code-block-line-number-width` + 行高 | `CodeBlock.module.css:131-132` |

结论：**全局改行高是高风险动作**；能安全动的只有 L1 那批自带 `-line-height` 的 token，且必须同时把 L2 的 `calc(...)` 行高一起重写，否则同屏两种行高。

---

## 6. 字体

### 6.1 四套栈（互相独立）

| 用途 | 栈 | 定义处 |
|---|---|---|
| UI + 正文 | `--dsh-font-family-text-default` / `--dsw-font-family` | `ui-theme/src/styles/base.css:7-9`（+壳层兜底 `web/src/base.css:12-24`） |
| 代码（含行内码、代码块、diff、JSON） | `--dsh-font-family-code-default` / `--ds-font-family-code` | `base.css:11-13` |
| 品牌 | `--dsw-font-family-brand` = Montserrat + 正文档 | `base.css:10` |
| **终端** | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`（硬编码常量 `TERMINAL_FONT_STACK`） | `ui-sidebar-terminal/src/client/terminal.tsx:169` |

终端栈拼装：`terminalFontFamily(list)` = `list === '' ? TERMINAL_FONT_STACK : '${list}, ${TERMINAL_FONT_STACK}'`（`terminal.tsx:171-173`）——用户列表同样**前置**，但兜底不是 `--dsh-font-family-code-default`。

### 6.2 用户输入如何被清洗

`theme-settings.ts:163-169` `normalizeFontFamily`：

1. 按 `,` 切分
2. 去掉 `"` `'` `\` `<` `>` 与 `\u0000-\u001f`、`\u007f`
3. 空白折叠 + trim，丢空项
4. 非 generic 的族名加双引号；`GENERIC_FAMILIES`（`:150-153`）= serif / sans-serif / monospace / cursive / fantasy / system-ui / ui-serif / ui-sans-serif / ui-monospace / ui-rounded / emoji / math / fangsong / -apple-system / blinkmacsystemfont

前提是**逗号分隔的族名列表**，一次最多 200 字符（`FontFamilyRow.tsx` `maxLength`），不校验字体是否存在、不枚举本机字体。

### 6.3 覆盖语义

`base.css:29-34`：`--dsw-font-family: var(--dsh-font-family-text, <default>), <default>`。用户列表在前、内置栈在后且**重复一次**（注释 `:26-28` 说重复对字体匹配无影响）。空值 → `ThemePresenter` 直接 `removeProperty`（`theme-presenter.ts:80-84`），回落到内置栈。

含义：**外部无法"替换"内置栈，只能前置**。想让某个字绝对生效必须让它在列表里排在系统族前面，且用户机上有该族名（或插件自带 `@font-face`）。

### 6.4 KaTeX

`apps/web/katex-fonts.ts:11-32`：Vite 插件只保留 KaTeX CSS 的 woff2 源（缺 woff2 直接构建失败）。KaTeX 自带 `KaTeX_Main` 等族与字号规则，DSH 侧只补横向滚动（`MarkdownText.module.css:181-185`、`:434-444`）。数学排版不受 `--dsw-*` 排版 token 控制。

### 6.5 CJK 现状

- 全仓 `@font-face` 只有 Montserrat 三档（`ui-theme/src/styles/brand-font.css`），**无 CJK 字体**
- 中文靠系统族名出现在栈里：`base.css:7-12`、`web/src/base.css:17-19`、`web/src/boot-page.module.css:96-97`、`ui-trajectory/.../TrajectoryTable.module.css:788-789`、`apps/desktop/renderer/update-dialog.css:3`
- 代码栈刻意去掉裸 `monospace` 以避免 Windows CJK 掉 SimSun（`base.css:4-5` 注释）——这是仓库里唯一显式的 CJK 排版决策
- 中英混排间距：`text-autospace: normal` 在 `body`（`web/src/base.css:32`），`code, pre, [data-diff], [data-read], [data-search], [data-terminal]` 反设为 `no-autospace`（`:92-100`）

---

## 7. 多语言

### 7.1 locale 系统事实

| 事实 | 位置 |
|---|---|
| 只有 `zh` / `en`：`LOCALE_IDS = ['zh','en']` | `packages/client/locale/src/locale-settings.ts:15` |
| 持久字段 `preference`（BCP 47 pattern） | `locale-settings.ts:31` |
| `<html lang>` 同步：`zh → zh-CN`，其余原样 | `locale/src/client/index.ts:148-152` |
| 回退链 `FALLBACK_LOCALE='en'`；`zh` 的 fallback 是 `en` | `locale/src/client/index.ts:109`、`:119-120` |
| 可注册外部语言：`addLanguage({id,label,fallback})`，链必须终止于 en | `locale/src/client/index.ts:275-286`、`:333-351` |
| 命名空间词条：`register(ns,{zh,en})` | `locale/src/client/index.ts:389` |
| 官方限制：语言包只管语言相关行为；注册表只提供选择/持久化/浏览器匹配/key 回退/`<html lang>`，**不提供复数规则或双向布局** | `packages/client/locale/README.md`（Known Limitations） |

DOM 上的稳定钩子：`html[lang="zh-CN"]` 或 `html[lang="en"]`。

### 7.2 是否支持"按语言选字体"

**源码层面完全没有这个概念**：没有 `fontForLocale`、没有 per-locale 字体表，`ThemeSnapshot` 里也没有语言维度。可行路径只有 CSS：

已有 `:lang()` 先例（证明机制可用）：
- `packages/client/ui-settings-account/src/client/DesktopOnboarding.module.css:50`（`.page:lang(en) .copy h1`）、`:55`、`:303`
- `packages/client/ui-trajectory/src/client/TrajectoryTable.module.css:119`（`.eventColumn:where(:lang(zh))`）、`:434`

因此按 **UI 语言** 分派字体 = T3（`html[lang="zh-CN"] body { --dsw-font-family: … }` 或 `:lang(zh)`）。但要注意两点：

1. `lang` 描述的是**界面语言**，不是每段文本的**字符脚本**。英文界面里的中文内容（用户自己写的中文提示词、中文标题的会话名）仍走同一套栈。
2. 真正按**脚本**分派（中文走 CJK 字、拉丁走拉丁字）在 CSS 里只有 `@font-face` + `unicode-range` 一条路。仓库内**没有任何 `unicode-range`**（`@font-face` 仅 Montserrat 3 条，无 unicode-range）；本仓的字体生成器则是按 latin 子集发 `unicode-range`（`D:\dsh-plugin\dsh-opencode-palette\scripts\inline-fonts.ts:42`），说明这条路在本仓侧是现成的、在 DSH 侧是空白的。

结论：per-language 字体 = 源码不支持、需插件自定义 CSS；per-script 字体 = 源码不支持、需插件自带带 `unicode-range` 的 `@font-face` 并选对族名（否则内置栈的系统 CJK 字会先命中）。

---

## 8. 终端

### 8.1 侧栏终端（xterm，走 JS）

`packages/client/ui-sidebar-terminal/src/client/terminal.tsx`（184 行）

| 环节 | 实现 | 行 |
|---|---|---|
| 取字体/字号 | `terminalFontFamily(theme.fontFamilies.terminal)`、`theme.fontSizes.terminal` | `:85-86` |
| 初始选项 | `{ minimumContrastRatio: 4.5, cursorBlink: true, fontSize, fontFamily, scrollback }` | `:93-94` |
| 网格测量 | `FitAddon` + `ResizeObserver` → `measure()` → `fitScreen` | `:96`、`:107-111` |
| 选项变更 | 值未变直接 return；变了赋值后注释「xterm remeasures cells on option change; refit so the Host grid follows the new cell size」并 `fitScreen(...)` | `:131-139` |
| refit 算法 | `proposeDimensions()` → `cols = min(dim.cols, environment.maxCols)`、`rows = min(dim.rows, environment.maxRows)` → `cols<2 || rows<1` 直接返回 → `xterm.resize` + `model.resize` | `:175-183` |
| 宿主驱动的 resize | 收到 `frame.type === 'snapshot'` 时用 `frame.info.cols/rows` 直接 resize | `:146-150` |
| 字体栈 | `TERMINAL_FONT_STACK`（§6.1） | `:169-171` |

`maxCols` / `maxRows` 来自宿主侧 `state.environment`（终端环境快照），不是 CSS，也不是 `proportions` 常量——即**列宽行高完全由 xterm 的字符测量结果与宿主上限共同决定**。

容器 CSS 与网格无关：`terminal.module.css:1` `.root { font-size: 13px }`（写死）、`:8` `.emptyMessage { line-height: 1.6 }`；`TerminalCleanup.module.css:2` 13px；`TerminalGuide.module.css:7-8` 14px/1.4、11px/1.4。

`--dsh-terminal-font-size` / `--dsh-font-family-terminal` 的消费者统计：**CSS 消费者 0 处**。它们只出现在 `theme-settings.ts:60`、`theme-presenter.ts:37`、`theme-presenter.ts:44`、`boot-theme.ts`、以及 `theme-settings`/`theme-presenter` 的测试里；运行期唯一读者是 `bootstrapFontSizes()` / `bootstrapFontFamilies()`（`ui-theme/src/client/index.ts:430-450`）读 **body 内联值**，再变成 snapshot 值喂给 xterm。

→ 外部想改终端字号，只有三条路：(a) 走官方设置（T1，但范围 10–20 且写进用户设置）；(b) 在 ui-theme 启动前往 `body.style` 写同名变量让它被 bootstrap 读到（脆弱、越界、会被后续 apply 覆盖）；(c) 改 xterm 实例（T4）。**纯 CSS 覆盖无效**。

### 8.2 对话内终端（TerminalBlock，走 CSS）

`packages/client/ui-primitives/src/TerminalBlock.module.css`：`--dsl-terminal-line-height: 22px`（`:3`，固定）、`--dsl-terminal-font: var(--dsw-font-markdown-code-block)`（`:7`）、`--dsl-terminal-gutter: 30px`（`:10`）、`--dsl-terminal-radius`（`:2`）。字号随 `--dsh-code-font-size`，**行高不随**（`:84`、`:145`），字号一涨就挤；`:128`、`:180` 还用 22px 做行数几何。可重绑变量见 `ui-primitives/README.md:167`（`--dsl-terminal-command-whitespace`、`--dsl-terminal-line-whitespace`、`--dsl-terminal-output-max-height`、`--dsl-terminal-gutter`）。

---

## 9. 控制分级（V3 需求逐项）

分档定义：
- **T1** 官方插件 API：`ctx.theme.overrideTokens` / `ctx.theme.register` / 设置 slot / 官方设置 schema 字段
- **T2** 文档化 CSS 自定义属性覆盖：有 token 名、源码确实读它，改它不需要选择器
- **T3** 选择器注入：无 token，只能靠标签 / 属性 / 哈希类名 + 必要时 `!important`
- **T4** 阻塞：源码里没有可用的注入点

| 需求项 | 档 | 手段与依据 | 主要限制 |
|---|---|---|---|
| 正文字号（全局） | **T1/T2** | `--dsh-content-font-size`；T1 走 `overrideTokens`（`index.ts:369-378`，写在字号之后 `theme-presenter.ts:77-90`），T2 走 CSS | 与设置面板争抢同一值（§1.3）；范围默认 10–22 只是 schema 约定，CSS 侧无钳制 |
| 正文字体 | **T1/T2** | 官方字段 `textFontFamily` → `--dsh-font-family-text`（`theme-settings.ts:72-86`）；或直接写 `--dsh-font-family-text` / `--dsw-font-family`（`base.css:9`、`:30`） | 只能前置，不能替换内置栈；空值会被 `removeProperty` |
| 标题 | **T2** | `--dsw-font-markdown-h1..h4`（含 `-font-size`/`-line-height`/`-font-weight`），`gradient-shadow-text.css:65-91` | h5/h6 无独立档（共用 base-strong，`MarkdownText.module.css:37`） |
| 代码块 | **T2** | `--dsh-code-font-size` → `--dsw-font-markdown-code-block`（`:170-175`），或直接重写该 token | banner 的 `11px/18px` 是 HARD（`CodeBlock.module.css:47-49`），字号改了 banner 不跟 |
| **行内代码** | **T3** | 只有字体族可 T2（`--ds-font-family-code` / `--dsw-font-markdown-code-font-family`）；字号被 `0.875em !important` 锁死（`MarkdownText.module.css:169`），必须选择器注入 + `!important` | 需同时覆盖 `.compact` 的 `1em !important`（`:388`）与标题内 `font: inherit`（`:176-179`）；与 README 描述矛盾 |
| 表格 | **T2** | `--dsw-font-markdown-table` / `-table-head`（`:121-133`） | 表内行内码 `11px` 是 HARD（`:274`） |
| 对话内终端 | **T2 半** | 字号走 code 轴；行高必须同时重绑 `--dsl-terminal-line-height`（`TerminalBlock.module.css:3`） | 状态字与 `--dsl-search-line-height` 是固定档 |
| **侧栏终端** | **T4** | 字号/字族只经 `theme.fontSizes/fontFamilies.terminal` → xterm options（`terminal.tsx:85-93`） | CSS 变量零消费者；容器 `font-size: 13px` 与网格无关（`terminal.module.css:1`） |
| diff | **T2** | `--dsw-font-markdown-code-block`（`DiffBlock.module.css:9`），行高继承 | `font-weight: 500`（`:31`）与 `white-space: pre` 固定 |
| thinking | **T2** | 次级字号 + 次级 delta（`ReasoningRow.module.css:48-49`） | 面板高 `height: calc(24px+δ)`（`:8`）需同步 |
| 静态 UI 阶梯（13 档） | **T2** | 直接重写 `--dsw-font-xl-24`…`--dsw-font-xxxs-11`（`gradient-shadow-text.css:185-274`），吃掉这 29 处引用的场景 | 值全部固定，重写后与 500 处 HARD 的组件字号风格不一 |
| **行高（逐角色）** | **T2** | 每角色 `--dsw-font-markdown-*-line-height`（`:68`、`:75`、`:82`、`:89`、`:96`、`:103`、`:110`、`:117`、`:124`、`:131`） | 只覆盖读 token 的 14 个 Markdown 角色；45 处组件 calc 行高不在内 |
| **行高（全局）** | **T3（高风险）** | 无全局 token；只能 `body { line-height }` 或逐选择器注入 | 29 处固定 `height` + 10 处 `line-clamp` + 4 处 `1lh` 会错位（§5.3） |
| 按 UI 语言换字体 | **T3** | `html[lang="zh-CN"]` / `:lang(zh)`（先例见 §7.2）；locale 会维护 `<html lang>` | 语言 ≠ 脚本；英文界面里的中文不切换 |
| 按脚本（CJK/Latin）换字体 | **T3** | 需自带 `@font-face` + `unicode-range`，并让该族排在系统 CJK 族之前 | DSH 侧零 `unicode-range`、零 CJK 字体；系统栈里的 `PingFang SC`/`Microsoft YaHei` 会先命中 |
| 中英混排间距 | **T2** | `text-autospace: normal / no-autospace`（`web/src/base.css:32`、`:92-100`） | 依赖浏览器支持；代码/终端/diff 已显式关闭 |
| 品牌字（Montserrat） | **T2** | `--dsw-font-family-brand`（`base.css:10`） | 现只用于 Desktop 引导与欢迎页（§2.6） |
| 在设置里加"按内容类型"面板 | **T1** | `ctx.slots.inject('settings.general.item', …)`（`ui-theme/src/client/index.ts:570-579`） | 只能存自有状态；官方 schema 仍是 3 字号 3 族，插件值要自己落成 CSS |
| 扩展官方字号/字体 schema | **T4** | `ThemeSettingsSchema` 固定（`theme-settings.ts:139-147`），`ThemeSnapshot.fontSizes/fontFamilies` 只有三角色（`index.ts:84-101`） | 需要上游改动 |

---

## 10. 阻塞点（按影响排序）

1. **行内代码的 `!important` 锁**（`MarkdownText.module.css:169`）：任何"行内码跟随代码字号"的设计都失效，且这是最容易被用户当成"排版没生效"的地方。要控必须 T3，并且是 `!important` 对抗 `!important`。
2. **侧栏终端不可由 CSS 控制**（T4）：`--dsh-terminal-font-size` 名义上是官方 token，实际只喂 JS。若 V3 承诺"终端字号"，只能走官方设置值或放弃。
3. **行高没有独立轴 + 29 处 delta 绑定的固定高度**：全局行高方案会把图标盒、压缩卡头、终端/搜索块、`li::marker` 一起错位。安全区只有 L1 的 10 个 `-line-height` token。
4. **大量 HARD 组件**（529 处 font-size / 421 处 line-height / 126 文件）：按内容类型精细排版时，代码块 banner、表格内码、JSON/Web/tool 卡片、启动页会与主题调过的 token 打架。
5. **per-language / per-script 无源码支持**：`:lang` 只能到"UI 语言"粒度；真正的 CJK/Latin 分派要插件自带 `unicode-range` 字体（并压过系统 CJK 族），工作量与风险都在插件侧。
6. **CSS Modules 哈希类名**：T3 的选择器只能靠后缀匹配与少量属性钩子（`[data-diff]` 等），跨版本稳定性未验证。

---

## 11. 需 live-DOM 实测的未知

1. **内联 vs `!important` 的实际胜负**：设置面板改字号后，插件用不用 `!important` 的两种写法谁生效、谁会"吞掉"用户设置（机制上确定，行为需实测）。
2. **`overrideTokens` 写 `--dsh-content-font-size` 后的长期一致性**：presenter 每次 apply 都先写设置值再写 token，需确认没有第三条路径（如设置页写回、快捷键 `Cmd±`）让两者长期背离。
3. **类名哈希的稳定性**：同一版本内哈希是否随文件内容变动；插件卸载/HMR 后注入的 `<style>` 是否残留（官方 sheet 靠 `dataset.plugin` 标记，插件自己的没有）。
4. **`li::marker` 24px 与行高联动**：行高改动后列表缩进/基线是否可见偏移。
5. **TerminalBlock 22px 行高 vs 代码字号 16**：是否出现行盒裁切、行号列错位。
6. **表格在字号 22 时的横向滚动手感**：`.tableScroll` 的 hover 才显形滚动条（`MarkdownText.module.css:192-206`）在宽表 + 大字号下是否仍可用。
7. **xterm 在 webfont 加载完成后是否重新 measure**：源码未见 `document.fonts.ready` 监听，自定义等宽字体可能按 fallback 宽度定列宽（首屏列数偏大/偏小）。
8. **`text-autospace` 在当前 Chromium 版本是否生效**，以及关掉后中英混排的观感差异。
9. **`--dsw-font-family-brand` 指到自定义族后**，Desktop 引导页（`DesktopOnboarding.module.css`）是否仍是预期字形（该页有 `:lang(en)` 分支）。
10. **插件自带 `@font-face` 的族名与用户 fontFamily 列表的交互**：用户填了同名字族时，是否出现"预览与实际不一致"（`FontFamilyRow` 只是纯文本输入，无预览）。

---

## 12. 与既有文档的差异（需更正）

| 出处 | 说法 | 源码事实 |
|---|---|---|
| `docs/research/dsh-text-fontsize-inventory.md` C8 | 「code 固定 12px/19px，不可改」 | 错。源码是 `calc(12px + var(--dsh-code-font-delta))/calc(19px + …)`（`gradient-shadow-text.css:163-168`），**跟随 `--dsh-code-font-size`**；该文件测的是已发布产物、口径偏旧 |
| 同文件 C9 | 「静态阶梯不可改」 | 部分错。13 档全部是 `body` 上的自定义属性（`:185-274`），可重写（T2）；不可改的只是**引用它们的组件** |
| `ui-theme/README.md:32` | 「inline code stays 1 px larger」 | 错。行内码实际是 `0.875em`（正文 ×0.875 ≈ 12.25px），且 token 的 12px+codeδ 被 `!important` 覆盖（`MarkdownText.module.css:167-169`） |
| 同处 | 「the small tool-output variant uses the same size」 | 半对：`--dsw-font-markdown-code-block-small` 的 **font-size 与 code 相同**、行高不同（16px vs 19px，`:178-183`）；但 `bash-sample`/`ToolRow` 又把它配上 18px 的 `--dsl-terminal-line-height`（`bash-sample.module.css:16-17`） |
| `ui-theme/README.md:34` | 「`Cmd/Ctrl + ±` 三字号同时 ±1」 | 对，但仅 Desktop；Web 保留浏览器缩放（同段已述） |

---

## 附录 A：取证命令（可复现）

```powershell
$root='D:\Temp\dsh-src'
# 1) 全部 .css 里的硬编码字号/行高
Get-ChildItem "$root\packages\client" -Recurse -File -Include *.css |
  Select-String -Pattern 'font-size:\s*[\d.]+px' | Measure-Object   # 529 / 126 文件
Get-ChildItem "$root\packages\client" -Recurse -File -Include *.css |
  Select-String -Pattern 'line-height:\s*[\d.]+px' | Measure-Object   # 421
# 2) 不跟字号的固定几何（挂在 font-delta 上的 height）
Get-ChildItem "$root\packages\client" -Recurse -File -Include *.css |
  Select-String -Pattern '(height|min-height): calc\([^)]*var\(--dsh-content' | Measure-Object   # 29
Get-ChildItem "$root\packages\client" -Recurse -File -Include *.css |
  Select-String -Pattern 'line-height: calc\([^)]*var\(--dsh-content' | Measure-Object  # 45
# 3) token 消费面
Select-String -Path (Get-ChildItem "$root\packages\client" -Recurse -Include *.css) -Pattern 'var\(--dsw-font-markdown-' | Measure-Object
# 4) CJK / 字体面
Select-String -Path (Get-ChildItem "$root" -Recurse -Include *.css,*.ts,*.tsx -Exclude *.spec.ts) -Pattern '@font-face|unicode-range'
# 5) 行内码的 !important 锁
Select-String -Path "$root\packages\client\ui-primitives\src\markdown\MarkdownText.module.css" -Pattern '!important'
```
