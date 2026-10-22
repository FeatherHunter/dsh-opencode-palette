# DSH 可变外观要素登记：现状盘点、分层清单与 YAML registry 设计

> 状态：讨论底稿（2026-10-20）。用途：把「主题插件到底能改什么」的源码事实 + 真实 DOM 扫描结果 + YAML 登记表设计固化成一份可继续生长的文档，避免散在会话里丢失。
>
> 事实来源：
> - 宿主源码 `D:\Temp\dsh-src` @ `687f282`（v0.2.1-rc.2，3169 文件，排除 `node_modules`）
> - 本仓源码 `D:\dsh-plugin\dsh-opencode-palette`
> - Playwright 实测 DSH web 实例（headless Chromium，见 §7）
> - 既有研究笔记：`docs/research/color-axis-token-inventory.md`、`docs/research/host-style-override-attention.md`、`docs/research/theme-ceiling-absolute.md`、`docs/research/theme-ceiling-ecosystem-sample.md`
>
> 相关票：#147（Token 模型与「全量」边界）、#148（排印）、#153（绝对能力上限）、#154（桌面窗口外壳）、#128（地图）、#127（24 条原文）。

---

## 1. 术语与口径

| 词 | 含义 | 备注 |
|---|---|---|
| **宿主** | DSH 主程序本身：前端页面代码 + Electron 桌面外壳 | 浏览器只是渲染引擎；我们做的是「装上来的插件」 |
| **主题 token** | 宿主声明的 `--dsw-*` / `--shiki-*` / `--dsh-*` 变量（ui-theme 样式目录） | 公开契约面 = 425 个名 |
| **opencode token** | 本仓 37 个用户可配语义槽（bg/text/brand/border/diff/md/syn） | 用户 JSON 里写的是它；旧称「颜色 / 色槽」已废弃 |
| **注入（A 通道）** | 调 `theme.overrideTokens(id, tokens)`，由宿主写 body inline | 落点 = body 的 `style` |
| **注入（B 通道）** | 自建 `<style>` 塞进 `document.head` | 落点 = 样式表规则 |
| **inline style** | 元素 `style` 属性里的声明（两种写法：JSX `style={{}}` / `el.style.setProperty()`） | 优先级高于外部样式表，低于 `!important` |
| **规则层** | 我们写的「选择器 → 声明」CSS | 打不过宿主 inline，需 `!important` 或更高优先级 |
| **锚点** | 规则层可用来定位元素的稳定标记：标签 / `data-*` / `role` / 全局类名 | 哈希类名不算稳定锚点 |
| **哈希类名** | 宿主 CSS Modules 构建产物，形如 `f3ab12_markdown`（`[hash]_[local]`） | 前缀每次宿主构建都变 |
| **私有面** | 宿主没承诺、但能被改动碰到的内部实现（哈希类、内部属性、内部变量） | 用了不保证未来还在，但失效不崩 |
| **公开契约面** | 宿主对外声明、可稳定依赖的东西（425 token、标准 HTML 元素、ARIA） | |

---

## 2. 基础数字（已复核，口径自洽）

### 2.1 宿主 token

| 数 | 含义 | 组成 |
|---|---|---|
| **425** | 宿主 `ui-theme/src/styles/*.css` 声明的主题命名空间 | `--dsw` 403 + `--shiki` 11 + `--dsh` 11 |
| **222** | 颜色轴（425 的子集） | alias 107 + specific 11 + shiki 11 + static 77 + focus 1 + menu 1 + shadow 4 + elevation 5 + gradient 3 + linear 2 |
| **184** | 颜色轴里当前有 `var()` 消费方的（真能生效的） | 222 − 38 死名 |
| **38** | 颜色轴死名（声明了但无人消费） | static 17 + alias 14 + specific 3 + linear 2 + shadow 2 |

死名清单（颜色轴）：
- dead static 17：`blue-100/50/50p/75/800`、`deepseek-300/600/700-delete/900`、`neutral-150/250/500/900`、`red-100/50/500/900`
- dead alias 14：`bg-multi-select`、`border-inverted2`、`brand-primary-invert`、`brand-text`、`button-ghost-active-hover`、`button-primary-dimmed`、`button-tool-bar-fill-invisible`、`interactive-bg-hover-accent`、`markdown-code-segment-selected`、`markdown-code-segment-unselected`、`markdown-placeholder`、`bg-mask-2`、`bg-mask-3`、`bg-mask-photo`
- dead specific 3：`bubble-highlight`、`login-input`、`tip`
- dead linear 2：`linear-gradient-think`、`linear-think-select`
- dead shadow 2：`shadow-lv1`、`shadow-lv1-blur`

口径澄清：早期「403 个 token 有效只有 180」是**排印轴主导的混合口径**；颜色轴自己的折算率是 184/222（38 个死名）。

### 2.2 本仓现状

- `src/engine/map-dsh.ts` 共写 **105 个宿主颜色名**（alias 85 + specific 10 + shiki 10）+ 1 个自造名 `--dsl-code-block-background`。
- 这 105 个全部能在宿主声明里找到（**0 个拼错 / 过期名**）。
- 其中 **14 个是死名**（11 alias + 3 specific），行号：`:30` markdown-code-segment-unselected、`:31` markdown-code-segment-selected、`:34` markdown-placeholder、`:36` bg-multi-select、`:41` specific-tip、`:42` specific-bubble-highlight、`:45` specific-login-input、`:65` brand-text、`:126` brand-primary-invert、`:128` button-primary-dimmed、`:143` button-tool-bar-fill-invisible、`:145` button-ghost-active-hover、`:148` interactive-bg-hover-accent、`:153` border-inverted2。
- 宿主有而本仓未写的活名 **93** 个（19 alias + specific-menu + shiki-background + focus + menu + shadow lv2/lv3 + elevation 5 + gradient 3 + static 60）。

### 2.3 注入面数量

- token 注入（A 通道）：105 名（见上）。
- 规则注入（B 通道）：**9 条** = `CSS_RULES` 8 条 + tooltip 1 条（此前「11 条」口径作废）。
- 本仓 `!important`：**0 条**。

### 2.4 运行时真实 DOM（Playwright 扫描）

| 指标 | 数值 |
|---|---|
| 元素数（首屏） | **897** |
| CSS 规则数 | **4342** |
| 哈希类名（唯一） | **156** |
| CSS 变量名（唯一） | **573** |
| `data-*` 属性名（实测出现） | **51** |
| `data-slot` 不同值 | **40** |
| 带 inline style 的元素 | **74** |
| role 出现数（首屏） | 6（源码共 35） |

**573 的构成**：`--dsw` 415 + `--dsh` 71 + `--dsl` 20 + `--shiki` 11 + 组件局部 56。
其中 `--dsw` 415 里：运行时声明 404、有 `var()` 消费 210。

**573 与 425 的关系（已算清）**：

- 425 是源码主题命名空间；运行时 573 **完全包含** 425（425 个全部命中）。
- 多出的 **148** = `--dsh` 60（布局/尺寸，运行时由 JS 写或组件声明）+ `--dsl` 20（组件内部别名）+ 其他包局部定义的 `--dsw` 12 + 组件局部 56。
- 局部 `--dsw` 12 名：`--dsw-alias-bg-l1`、`--dsw-alias-bg-layer-4`、`--dsw-alias-fill-l1`、`--dsw-alias-fill-l2`、`--dsw-alias-fill-tertiary`、`--dsw-alias-fill-tsp-secondary`、`--dsw-alias-label-error`、`--dsw-alias-label-quaternary`、`--dsw-alias-separator-primary`、`--dsw-font`、`--dsw-font-mono`、`--dsw-hovercard-bg`。
- 组件局部 56：`--trajectory-*` 16、`--json-*` 9、`--ds-*` 5、`--diff-*` 3、`--card-*` 3、`--turn-*` 3、`--document-*` 3、`--plan-*` 2、`--notice-*` 2、`--request-*` 2、`--deliverable-*` 2、`--changes-*` 2、`--meter-*` / `--detail-*` / `--interval-*` / `--page-*` 各 1。

> **结论：「全量」= 573 个变量名**（不是 425 + 222 + 184 + 573 的加法，四个数是不同切面）。

### 2.5 真实 DOM 关键值样本（light 主题）

```
html: lang="zh-CN" data-ds-theme-source="light" style="color-scheme: light;"
body: style="--dsh-content-font-size: 14px; --dsh-code-font-size: 11px; --dsh-terminal-font-size: 13px;"

--dsw-alias-bg-base:            #fff
--dsw-alias-label-primary:      #0f1115
--dsw-alias-link:               #4176e6
--dsw-specific-sidebar-fill:    #f9fafb
--dsw-alias-brand-primary:      #0f1115
--dsw-static-neutral-00:        #fff
--dsw-menu-surface-fill:        #f8f9fa94
--dsw-shadow-lv2:               0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a
--dsw-elevation-panel:          0 0 0 .5px #00000029, 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005
--dsw-font-markdown-base:       14px / calc(24px + calc(14px - 14px)) …
--shiki-foreground:             （body 为空串）
--shiki-background:             （body 为空串）
```

最多出现的哈希类名：`hIlkoa_iconButton` ×40、`hIlkoa_slot` ×32、`_root_4ub78_1` ×23、`hIlkoa_title` ×19、`_root_38jqx_3` ×18、`hIlkoa_rowActions` ×18。

---

## 3. 可变要素分层清单（A–F）

### A. token 层（573 个变量名）

| 子层 | 数量 | 说明 | 稳定性 |
|---|---|---|---|
| 公开主题 token | 425 | ui-theme 声明；含颜色 222 / 排印 / 尺寸 / 渐变 / 滤镜 | 公开契约 |
| 运行时布局量 `--dsh-*` | 71 | 运行时 JS 写（如 `--dsh-composer-height`）或组件声明 | 内部，用于布局不宜抢 |
| 组件内部别名 `--dsl-*` | 20 | 见 C 层 | 内部，body 级写入无效 |
| 其他包局部 `--dsw` | 12 | 如 `--dsw-hovercard-bg`、`--dsw-font-mono` | 内部，消费方在组件本地 |
| 组件局部其他 | 56 | `--trajectory-*`、`--diff-*`、`--card-*` 等 | 内部，逐组件 |

**能实现**：颜色、字体族、字号、行高（字体 token 含 line-height）、圆角（部分 token）、阴影、渐变、玻璃（部分 token 值是整条 background，可接渐变）。
**怎么用**：A 通道 `overrideTokens`；或 B 通道写 `body{--dsw-x:…}` 规则（会被宿主 body inline 快照遮住，需要看 A 通道是否已写）。
**失效表现**：名字不存在 → 无消费方 → 不生效；`var()` 无 fallback 时该声明被丢弃，页面不崩。

### B. 规则锚点层（决定「规则能命中谁」）

| 锚点类型 | 数量 | 稳定性 | 例子 |
|---|---|---|---|
| 标准 HTML 标签 | 9 类 | 公开标准 | `body`、`h1`–`h6`、`a`、`code`、`em`、`strong`、`blockquote`、`hr` |
| **全局类名** | **5 个**（可能更多） | 半公开（`:global()` 产出，非哈希） | `md-code-block`、`line`、`md-table-wide`、`katex`、`katex-display` |
| **`data-slot` 值** | 源码硬编码 6 个 / 运行时 40 个 | 内部但语义清晰 | `conversation.chat.flow`、`conversation.chat.node`、`conversation.session`、`root`、`settings.general.item` |
| `data-*` 属性 | 实测出现 51 / 源码枚举 432 | 内部 | `data-ds-dark-theme`、`data-markdown-variant`、`data-ds-theme-source`、`data-conversation-scroll`、`data-chat-*` |
| role / aria | role 35 / aria-* 25 | 公开标准（W3C） | `[role="tooltip"]`、`[aria-expanded="true"]` |
| 哈希类名 | 运行时 156 | **易变**（前缀每次构建变） | `f3ab12_markdown` → 明名 `markdown` |

#### B1. 5 个全局类名的语义（源码已确认）

| 类名 | 源码出处 | 管什么 | 能改什么 |
|---|---|---|---|
| `md-code-block` | `ui-primitives/src/markdown/CodeBlock.tsx:188` `className={clsx(css.block, 'md-code-block', …)}` | markdown 代码块容器 | 圆角、背景、边框、宽度、块间距 |
| `line` | `CodeBlock.tsx:64`、`:180` `<span className="line">` | 代码的每一行 | 行高、行背景、高亮某行 |
| `md-table-wide` | `render.tsx:492` `className={clsx(css.tableScroll, wide ? 'md-table-wide' : css.tableFill)}` | ≥4 列的宽表格容器 | 列宽、横向滚动、溢出 |
| `katex` | KaTeX 标准类 | 行内数学公式 | 公式字号、颜色、间距 |
| `katex-display` | KaTeX 标准类 | 块级公式 | 居中、间距、横向滚动 |

> 更多全局类的自动发现方法：扫宿主 CSS 里的 `:global(...)` + 扫源码里字符串字面量 class（如 `className="line"`）。

#### B2. 三个最常用 `data-*`

| 属性 | 位置 | 值 | 用途 |
|---|---|---|---|
| `data-ds-dark-theme` | `body`（深色时存在） | 标记（无值） | 只在深色生效的规则 |
| `data-markdown-variant` | markdown 容器 | `compact` 等 | 只改紧凑版 markdown |
| `data-ds-theme-source` | `html` | 实测 `light`（插件主题激活时待验） | 只在我方主题激活时生效 |

#### B3. 哈希类名机制

- 宿主构建：`packages/client/tsdown.client.ts:595` `cssModules: { pattern: '[hash]_[local]' }` → `f3ab12_markdown`。
- 本仓 `src/engine/map-dsh.ts:192` 的 `.markdown a, .markdown .fileLink` 在现行宿主**命中不了**（属对老版宿主的加法兜底）；markdown 链接色实际由 `:62` 注入的 `--dsw-alias-link` 生效（宿主 `ui-primitives/src/markdown/MarkdownText.module.css:63` 消费）。
- 使用方式：只能按后缀命中（`[class$="_markdown"]`）或运行时探测；**不能写死 hash**。
- 全部 156 个可自动还原明名（去掉 hash 前缀），再回源码 grep 出「哪个组件、管什么」。

### C. 私有变量层

| 族 | 数量 | 写入方式 | 能否从 body 覆盖 | 已知用途 |
|---|---|---|---|---|
| `--dsl-*` | 20 | 宿主组件在**元素本地**定义（`CodeBlock.module.css:5-17` 等） | **不能**（本地定义遮蔽 body 级） | 代码块/命令等的组件级别名，值链到 `--dsw-*` |
| `--terminal-cursor*` | 4 | 宿主 `terminal-cursor.ts:32-35` **逐元素 inline 写** | 不能直接，需 `!important` 或运行时重写 inline | 终端光标配色 |
| 组件局部 | 56 | 组件内定义 | 不能 | 各组件内部（diff/卡片/轨迹等） |

`--terminal-cursor` 四名：`--terminal-cursor`（光标底色）、`--terminal-cursor-accent`（光标上的字色）、`--terminal-cursor-cell-background`、`--terminal-cursor-cell-foreground`（选区单元格）。两色需成对校验对比度。

### D. inline 层（74 个点）

- 宿主 body 上只写 3 个字号变量：`--dsh-content-font-size`、`--dsh-code-font-size`、`--dsh-terminal-font-size`。
- 其余 inline：`--dsh-workspace-indent` ×13、`--dsh-composer-height`、`--dsh-conversation-column-width`、`--dsh-conversation-viewport-height`、`--dsh-sidebar-width` 等**布局量**；57 个是普通内联属性（宽高/transform 等）。
- 颜色 inline 仅 1 处：`ui-primitives/src/markdown/katex.tsx:80` `style={{ color: '#cc0000' }}`（KaTeX 报错红）。
- 结论：inline 层**不是行间距的来源**（行间距走排印 token/规则），它是布局量的通道；对我们价值在于「知道哪些被 inline 钉死」。

### E. 硬编码色层

- 宿主 client CSS 含颜色字面量 **351 行**；其中 `var(--token, #hex)` 形式 fallback **13 行**（设了 token 就覆盖）。
- 独立出现 338 行，分三类：
  1. **真视觉色**（需规则层改）：`ui-attachment/src/FileCard.module.css:128` `color:#fff`；`ui-primitives/src/HoverCard.module.css:10` `--dsw-hovercard-bg:#2C2C2E`；`ui-conversation/src/client/skeleton/ContextMeter.module.css:127` `--meter-tint: rgb(167,139,250)`；`ui-layout/src/client/AppFrame.module.css:118-136` 的 `rgb(122 155 240 / …)` 渐变。
  2. **遮罩 alpha**（无视觉意义）：`ChatGroupSeat.module.css:102/106`、`TurnNavigator.module.css:63/67` 的 `mask-image` `#000`。
  3. **注释里的色值**：`InputBar.module.css:214/374-375`（figma 标注）。
- JS 内联硬编码色：仅 `katex.tsx:80`（见上）。

### F. 规则层（4342 条）分类计划

「全部拿下」的准确目标 = **每条都可控制、或至少知道它在哪**，不是重写 4342 条。分三类登记：

| 类 | 含义 | 处理 |
|---|---|---|
| token 驱动 | 规则里只有 `var(--dsw-…)` | 改 token 即变，不必逐条登记 |
| 字面量/结构 | 含硬编码色、固定圆角/间距 | 登记进「规则兜底清单」，逐条给配方 |
| 不可控 | 宿主 inline、`!important` 字面量、JS 计算布局 | 登记为「需运行时修正 / 不可控」 |

已知的 `!important` 注意表（详见 `docs/research/host-style-override-attention.md`）：
- 宿主全仓 22 行；影响外观的 6 行 / 7 条声明；其中 5 条可经 token 或祖先色绕过；唯一钉死的是桌面强制更新辅助页 `apps/desktop/renderer/mandatory-update.css:10` `#copy-message { color: #d93025 !important }`（不在主 UI）。

---

## 4. 每层能实现什么 / 怎么用 / 失效表现（速查）

| 层 | 能实现 | 用法 | 失效表现 |
|---|---|---|---|
| A token | 颜色、字体、字号、行高、阴影、渐变、部分玻璃 | `overrideTokens` / B 通道写变量 | 名字不存在 → 不生效，不崩 |
| B 规则（标签） | 标题/正文/链接/引用/分隔线分色 | `body h1{…}` 等 | 结构变则失配 |
| B 规则（全局类） | 代码块、代码行、宽表格、公式 | `.md-code-block{…}` | 宿主改名则失配 |
| B 规则（data-slot / data-*） | 按区域改（侧栏、输入区、会话区） | `[data-slot="conversation.composer"]{…}` | 宿主改语义则失配 |
| B 规则（role/aria） | 按语义改（tooltip、菜单、tab） | `[role="tooltip"]{…}` | 语义变则失配 |
| B 规则（哈希类） | 同类元素通用改（markdown、图标按钮） | `[class$="_markdown"]{…}` | hash 变但仍按后缀命中 |
| C 私有变量 | 终端光标、代码块内部 | `!important` / 运行时重写 inline | 被宿主 inline 压制 |
| D inline | 布局量（不宜抢） | 读为主 | 宿主随时重写 |
| E 硬编码色 | 少量宿主写死的颜色 | 规则 + 高优先级/`!important` | 宿主改结构则失配 |
| 运行时 DOM 操作 | **自插图层**：壁纸、渐变蒙层、毛玻璃、装饰 | `createElement` + 自己的 CSS + `MutationObserver` | 自管清理；层级/pointer-events 需协调 |

命令式 DOM 的 5 个更强能力（对应问题 m00973-②）：
1. 自插图层 → 壁纸 / 毛玻璃（`backdrop-filter`）/ 渐变蒙层 / 噪点纹理；
2. 读当前计算结果再派生（如取图片主色生成整套配色）；
3. 局部作用域（只在某子树 `setProperty`，不写 body）；
4. 运行时修正（`MutationObserver` 监听宿主 inline，被盖掉后写回——终端光标、KaTeX 红字这类）；
5. 时间维度（过渡、hover、动画）。

代价：自己插的节点要自己清理、z-index 与宿主协调、`pointer-events` 别挡鼠标；桌面版能到页面层，到不了窗口外壳（标题栏另见 #154）。

---

## 5. 语义拆分 vs 原子色阶（问题 m00973-⑤）

「把一个变量拆成多种颜色」指**语义槽拆分**，不是把绿色拆成五档：

- 宿主 `--dsw-alias-label-primary` 同时给正文和 `h1`–`h6`；opencode 里 `text` 与 `markdownHeading` 是两个 token → 只能靠规则给 `body h1`–`h6` 单独上色（本仓 9 条规则第 1 条）。
- 宿主 `--dsw-alias-bg-base` 同时用于页面底、卡片、输入框；想让卡片不同 → 规则拆。
- 另一层是「原子派生」：60 个 static 原子 → 派生语义名（token 层映射）。

---

## 6. YAML registry 设计（唯一真源）

> **2026-10-22 superseded**：本节的单文件 `registry/*.yaml` 设计已演进为 `palette/` 目录（9 个按技术域拆分的 YAML + `palette/SPEC.md`）。本节保留为历史设计记录，不再作为实现依据；现行真源见 `palette/_index.yaml`、`palette/SPEC.md` 与 `docs/research/color-region-map.md`。

### 6.1 目标

一份 `registry/*.yaml` 同时承担三个角色：

1. **内部唯一真源**：所有可变要素（token / 锚点 / 私有变量 / inline / 硬编码色 / 规则兜底 / 效果配方）都登记，可注释、可扩展。
2. **构建期代码生成源**：生成运行时映射常量 + 类型 + 校验。
3. **AI 说明书**：生成 JSON Schema + prompt + 示例主题，让用户的外部 AI 能按规则产出主题 JSON。

### 6.2 关键决策：YAML 只在构建期读

插件运行时不解析 YAML（否则要带解析器、体积与风险都涨）。YAML → 构建期脚本 → `src/engine/registry.generated.ts`（与「字体生成」同套路）。用户主题 JSON 仍是 JSON。

### 6.3 映射与改名语义

用户 JSON 里永远写**稳定的 opencode 名**；宿主变量名是可变的内部细节。

```yaml
# registry/tokens.yaml —— 主题 token 登记表（唯一真源）
version: 1
tokens:
  - opencode: markdownLink        # 用户 JSON 里永远写这个（稳定名）
    dsh:
      current: --dsw-alias-link   # 宿主今天叫这个
      legacy:                     # 宿主以前叫过、以后可能改回来
        - --dsw-alias-label-primary-bluish
    status: live                  # live / dead / declared-invalid / pinned
    axis: color
    consumers: 12                 # 扫描得出
    ui_role: markdown 正文里的链接
    evidence: [design-platform.css:227, MarkdownText.module.css:63]
    since: 0.2.1
    note: |
      宿主 MarkdownText.module.css:63 消费这个变量。
      0.2.1 起宿主把链接色收口到 --dsw-alias-link；
      更早的版本用 --dsw-alias-label-primary-bluish。
```

解析顺序：**先 `current`，再按序试 `legacy`；都不存在 → 静默跳过 + 诊断字段**。

- 宿主改名：只改 YAML 一行（`current: 新名`，旧名挪进 `legacy`）。
- 宿主删名：解析全部落空 → 该配置不生效，但**不抛错、不闪退**。
- 用户配置永不因宿主改名而改。

### 6.4 文件拆分

```
registry/
  tokens.yaml        # 425 公开 token + 映射 + 备注
  variables.yaml     # 573 运行时变量（含内部/局部）
  anchors.yaml       # 标签 / data-slot / data-* / role / aria / 全局类
  hashed.yaml        # 156 哈希类 → 明名 → 作用（脚本生成）
  inline.yaml        # 74 个 inline 点
  colors.yaml        # 硬编码色 + JS 内联色
  rules.yaml         # 规则兜底候选
  effects.yaml       # 效果配方（玻璃/蒙层/壁纸/渐变）
  schema.yaml        # 表结构定义（自校验）
  _index.yaml        # 生成的总索引
```

### 6.5 每条目的标准字段

| 字段 | 作用 |
|---|---|
| `id` / `kind` | 标识与类别（token / anchor / private_var / inline / color / rule / effect） |
| `opencode` | 用户可写的稳定名（若属 37 槽体系） |
| `dsh.current` / `dsh.legacy[]` | 宿主现名 / 历史名（解析候选链） |
| `status` | `live` / `dead` / `declared-invalid` / `pinned` / `gated` / `missing` |
| `axis` | 所属轴（color / typography / geometry / material / effect） |
| `consumers` | 消费者数量（扫描） |
| `ui_role` | 在 UI 上的作用（一句话，人类可读） |
| `usage` | 用法模板（CSS 选择器 / JSON 写法） |
| `stability` | `public` / `semi-public` / `internal` / `volatile` |
| `evidence` | `file:line` 或扫描产物引用 |
| `note` | 多行备注（历史、坑、代价） |

### 6.6 附属产物（同一份 YAML 生成）

1. `src/engine/registry.generated.ts`：映射与候选链常量（运行时使用）；
2. `schema/theme.schema.json`：用户主题 JSON 的 JSON Schema（AI 可写可校验）；
3. `prompt/custom-theme-guide.md`：给外部 AI 的说明书；
4. `docs/registry/*.md`：人类可读文档（由 YAML 渲染）；
5. 校验器：重复名、死名引用、light/dark 成对、值形状。

### 6.7 容量估算

| 内容 | 条目 |
|---|---|
| 变量名 | ~573 |
| 哈希类明名 | 156 |
| data 属性（实测 51 / 源码 432，分两级） | 51–432 |
| data-slot 值 | 40 |
| role / aria | 35 + 25 |
| inline 点 | 74 |
| 硬编码色（有效） | 50–100 |
| 规则兜底 | 待扫描分类 |
| 效果配方 | 20–50 |

合计约 **1000–1300 条**，每条 6–10 行 → **8000–13000 行 / 400–600 KB**。YAML 可以承载；人类阅读靠拆文件 + 生成索引。

### 6.8 依赖与纪律

- 构建期需 devDependency `yaml`（不进发布包；运行时零依赖不变）。
- YAML 是唯一真源，生成物不入库（与构建产物政策一致）；改完跑测试校验。
- YAML 子集规范：允许注释 / 多行文本 / 锚点，但生成时展开；禁止自定义 tag。

---

## 7. Playwright 扫描方法（可复现）

### 7.1 环境

- Python 3.13：`D:\0Tools\Python313\python.exe`（已装 playwright）。
- headless Chromium 已缓存于 `%LOCALAPPDATA%\ms-playwright`。
- 扫描脚本：`scripts/research/scan-dsh-web-dom.py`（本仓）。

### 7.2 启动一个可扫描的 DSH web 实例

DSH web 首次访问需要启动令牌（`packages/client/connection/src/browser-auth.ts:17` `TOKEN_QUERY='token'`）。启动时打印带 token 的 URL：

```powershell
& "D:\DeepseekHarness\resources\runtime\cli\bin\dsh.cmd" web --port 0 --no-open
# 输出形如：dsh web: http://127.0.0.1:62794/?token=<launch-token>
```

> token 每次启动都变，仅本机使用；扫描完关闭该实例。

### 7.3 运行扫描

```powershell
& D:\0Tools\Python313\python.exe scripts/research/scan-dsh-web-dom.py `
    "http://127.0.0.1:<port>/?token=<token>" "scan.json"
```

产出（首屏一次）：
- 每类标签数量、元素总数
- 哈希类名清单（含出现次数）
- `data-*` 属性清单（含值分布）
- role / aria 清单
- inline style 元素清单（含自定义属性名）
- 全部样式表里的变量名、声明数、消费数、消费方选择器样本
- body / html 属性、关键 token 计算值、字体与 color-scheme

### 7.4 结果（2026-10-20 首屏）

见 §2.4 与 §2.5。

### 7.5 限制

- 只覆盖 DSH web 版；桌面版需按 F12 手动（`apps/desktop/src/main.ts:981` 隐藏菜单项绑定 F12，`main.ts:238` `devTools: true`）。
- 只覆盖当前屏幕；深层 UI 需脚本化点击后再扫。
- 跨域 iframe 内部扫不到（宿主文档预览用 `sandbox` iframe）。
- token 每次启动变；扫描实例用完即关。

---

## 8. 未确证清单

1. `--dsw` 源码 403 vs 运行时 415：12 个局部 `--dsw` 名的声明位置与消费方需逐个确认（已列名）。
2. `data-ds-theme-source` 在插件主题激活时的取值（实测只有 `light`）。
3. 4342 条规则的三类分类统计（待跑）。
4. `--terminal-cursor*` 的 `!important` 与运行时重写两条路径的实测效果（含 `[data-terminal]` 等锚点是否可用）。
5. 窗口标题栏机制的边界（已由 #154 记录：可改两色/渐变延伸；不可改高度、按钮形状位置、macOS 菜单）。
6. 更多非哈希全局类清单（自动发现脚本未跑）。
7. 渐变作为 token 值的合法形状与 light/dark 成对校验（#147 决策点④待裁）。
8. 60 个 static 原子在 L2 的呈现方式（#147 ❓Q2 待裁）。

---

## 9. 下一步

1. 用户拍板 YAML registry 结构（8 文件拆分 + codegen + 子集规范 + `yaml` devDependency）。
2. 写 30–50 条样例表 + `registry/schema.yaml` + codegen 打样。
3. 跑 4342 条规则分类扫描（token 驱动 / 字面量结构 / 不可控）。
4. 全量铺开：tokens → anchors → hashed → inline → colors → rules → effects。
5. 生成 JSON Schema + AI prompt + 示例主题（对应「别人拿来自定义直接还原」）。
6. 把这套登记表接进 #147（暴露层级）与 #148（排印）与 #140（JSON 结构）。

---

## 附录 A：本仓注入通道的源码位置

| 通道 | 位置 | 说明 |
|---|---|---|
| token 注入 | `runtime/client.ts:736` | `theme.overrideTokens('opencode-palette', render.tokens)` |
| style 注入 | `runtime/client.ts:739-743` | `createElement('style')` → `dataset.plugin` → `appendChild(head)` → `textContent = render.css + UPDATE_ENTRY_TRANSPARENT_BG` |
| 规则生成 | `src/engine/map-dsh.ts:188-206` | `CSS_RULES` 8 条 + tooltip 1 条 |
| 变量映射 | `src/engine/map-dsh.ts:242` `COLOR_SLOTS` | 7 组 37 个 opencode token |
| token 表生成 | `src/engine/generate.ts:157/233/257/259` | `body` / `body[data-ds-dark-theme]` 两套声明 |

## 附录 B：宿主关键机制位置

| 机制 | 位置 |
|---|---|
| CSS Modules 哈希 | `packages/client/tsdown.client.ts:595` `pattern: '[hash]_[local]'` |
| token 校验 | `packages/client/ui-theme/src/client/index.ts:466-486`（只校验值形状，名字零校验） |
| body inline 写入 | `packages/client/ui-layout/src/client/theme-presenter.ts:69-93`（`:87-90` setProperty；`:101-107` 只回收自己写的） |
| 暗色标记 | `body[data-ds-dark-theme]` |
| 主题来源标记 | `html[data-ds-theme-source]` |
| web 鉴权 | `packages/client/connection/src/browser-auth.ts:17`（token 查询参数 + cookie） |
| 桌面 F12 | `apps/desktop/src/main.ts:981`、`:238` |

---

## 10. V3 两层 YAML 架构（2026-10-20 用户提出，待细化）

> palette.yaml 的正式设计（第一性原理、能力 id 文法、效果链、写原语、值类型、编译 plan、codegen、版本契约）见 **`docs/research/palette-yaml-v3-design.md`**。本节只保留架构结论。

### 10.1 两层产物（2026-10-20 用户裁定：不要落盘的编译产物）

| 层 | 文件 | 谁维护 | 内容 |
|---|---|---|---|
| 能力全集 | `palette.yaml`（本仓） | 我们（随插件版本） | 全部可配置能力条目 + 每条在用户文件里的键/类型 + 如何绑定到宿主（token / 规则 / 运行时 / 资源）+ 注释 |
| 用户主题 | `theme.yaml` + `assets/` | 用户 / 发行主题作者 / 外部 AI | 只写「能力 id → 值」与资源引用；不出现宿主原生名字 |

**没有第三个文件。** `theme.yaml` 就是主题的唯一定义（抽象文件名固定叫 `theme.yaml`，显示名取其中的 `name` 字段；不同主题 = 不同目录，目录名随意）。加载后只在**内存**里编译出 plan 对象 `{tokens, rules, runtimeOps, assets}`，预览与运行时共用同一份内存 plan，不落盘、不生成 `theme-plan.json`。

### 10.2 核心概念：capability（能力条目）= 翻译单元

不是所有东西都能做成「token → token」映射。能力条目的结构：

```yaml
# palette.yaml（能力全集，节选）
version: 1
capabilities:
  - id: bg.base                        # 用户侧稳定 id（点分命名空间）
    kind: token
    title: 页面底色
    user_schema: { type: color-or-gradient }
    bind:
      - { strategy: token, name: --dsw-alias-bg-base }
    notes: |
      改这里会影响所有共用该变量的面（页面/卡片/输入框）。
      想单独改卡片用 control.card.background。

  - id: control.sidebar.background
    kind: rule
    title: 侧栏底色/背景图
    user_schema: { type: color-or-image }
    bind:
      - { strategy: token, name: --dsw-specific-sidebar-fill }       # 首选：渐变也可以
      - { strategy: rule, anchor: '[data-slot="conversation.session"]', property: background-color }
      - { strategy: runtime, op: insert-layer, anchor: '[data-sidebar-right-panel]' }
    degradation: 1/3                    # 记录有多少条策略在当前宿主可用

  - id: icon.composer.send
    kind: asset
    title: 发送按钮图标
    user_schema: { type: image-ref }
    bind:
      - { strategy: rule, anchor: '[data-composer-send] svg', property: 'mask-image', as: url }
      - { strategy: runtime, op: replace-svg-children, anchor: '[data-composer-send]' }
    notes: |
      宿主用 React 渲染图标；运行时替换后需要 MutationObserver 重新应用。

  - id: effect.glass-panel
    kind: composite
    title: 毛玻璃面板
    user_schema: { type: bool }
    bind:
      - { strategy: rule, anchor: '[data-slot="conversation.composer"]', property: 'backdrop-filter', value: 'blur(12px)' }
      - { strategy: rule, anchor: '[data-slot="conversation.composer"]', property: 'background', value: 'color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent)' }
```

**绑定策略链**（capability 的关键设计）：

1. `token`：宿主有变量 → 注入变量（最稳，支持 light/dark 成对）。
2. `rule`：没有变量或变量不够细 → 用锚点 + 属性（锚点优先级：`data-slot` > 语义 `data-*` > `role` > 全局类 > 哈希后缀）；同一能力可写多条规则。
3. `runtime`：图标替换、图层插入、inline 修正 → 客户端运行时执行。
4. `asset`：图片/图标/字体/音频 → 资源文件。

策略链按顺序尝试，取「当前宿主可用」的最高优先级；全不可用 = 配置不生效 + 诊断提示（不崩）。

### 10.3 用户主题文件形状（草案）

```yaml
# theme.yaml（用户/发行主题）
schema_version: 3
name: 海贼王
palette_requires: '>=3.0'      # 依赖的能力全集版本
assets:
  wallpaper: assets/wallpaper.jpg
  send_icon: assets/send.svg
tokens:
  bg.base: { light: '#f7f3ea', dark: '#12100c' }
  text.primary: { light: '#241d12', dark: '#f2ead9' }
controls:
  control.sidebar.background: { light: 'linear-gradient(180deg,#fdf6e3,#f5e6c8)', dark: '#1a1508' }
  icon.composer.send: assets.send_icon
effects:
  effect.glass-panel: true
patches:                      # 专家层（可选）：直接写原始宿主名，校验后提示
  - { name: --dsw-alias-label-primary, light: '#241d12', dark: '#f2ead9' }
```

### 10.4 命名与翻译方向

- 用户层**只出现**能力 id（点分命名空间：`bg.*` / `text.*` / `brand.*` / `border.*` / `control.*` / `icon.*` / `font.*` / `effect.*`）与资源路径。
- 宿主名（`--dsw-*`、哈希类、data 属性）只出现在 `palette.yaml` 的 `bind` 里 → **宿主改名只改 palette，不碰用户文件**。
- 老 v1/v2 JSON（37 token）→ 由 palette 里的 `legacy` 表适配到 v3 id（老文件零迁移）。

### 10.5 加载管线（内存编译，不落盘）

```
主题目录：theme.yaml + assets/
  → 解析（YAML）
  → 校验（schema 由 palette.yaml 生成；未知 id = 警告不阻断）
  → 归一化（light/dark 成对、别名展开、资源引用解析、范围检查）
  → 内存编译：plan = { tokens, rules, runtimeOps, assets }
  → 预览（同一份 plan 渲染，保证与运行时一致）
  → 运行时（插件应用 plan；刷新重新编译）
```

内存 plan 同时喂「预览区」与「实际注入」→ 满足原句第 11 条「几乎一致的预览区」。`theme.yaml` 是唯一真源，plan 只是加载期中间对象（可缓存，但**不作为文件存档、不参与主题包分发**）。

### 10.6 待决技术问题

1. **运行期 YAML 解析路线**（去掉编译产物后，插件加载 `theme.yaml` 时必须解析 YAML）：palette.yaml 仍只在构建期读（生成 TS 常量）；用户 `theme.yaml` 二选一：
   - **A（建议）**：把 `yaml` 作为 devDependency，**构建期内联进客户端 bundle**（同 `dsh-plugin-update` 的内联先例），运行时零依赖政策不变；正确性由成熟库保证，代价是 client.js 变大（几十 KB 原始 / 十几 KB gzip，需实测）。
   - B：自己写「受限于我们 schema 的 YAML 子集解析器」（只支持映射/序列/标量/`|` 块/注释），约 200 行，体积小、但边界 bug 风险自担，必须配金标测试。
   先按 A 打样，体积不可接受再换 B。
2. **能力条目粒度**：太细（每个控件）维护成本高；太粗（每个区域）满足不了需求。需要按 UI 地图切分（对话区/侧栏/右侧栏/输入区/设置页/代码块/终端…）。
3. **图标与 React**：运行时替换 DOM 后宿主重渲染会覆盖，需要 MutationObserver + 幂等重放；性能与闪烁要实测。
4. **资源交付**：主题包目录、资源体积上限、缓存与卸载、字体走宿主路由（已有先例）。
5. **能力全集版本化**：`palette_requires` 与 `since/deprecated` 字段、旧主题在新插件上的降级策略。
