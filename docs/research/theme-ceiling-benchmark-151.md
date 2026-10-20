# 市面主题插件「上限」对标与可还原性矩阵（票 #151）

- 票：FeatherHunter/dsh-opencode-palette #151「研究：市面主题插件「上限」对标与可还原性矩阵」（parent #128）
- 日期：2026-10-20
- 宿主基线：DSH 源码 checkout `D:\Temp\dsh-src`，commit `687f282`（212 个 CSS 文件）
- 本插件基线：V2（schema = opencode theme.json 37 色槽 + 排印三参数 `{mode,size,fontKey}`）
- 方法：一手来源优先（宿主 CSS/TS 源码逐行、本仓引擎源码、仓库既有 5 份 DSH 生态调查）；网络只用于 VSCode / Chrome / Windows Terminal 三份官方文档，各 1 次取用。
- 标注约定：**（事实，出处）** = 可在源码/文档里逐字核对；**（计数）** = 本次会话用 `Select-String`/`Measure-Object` 在 `D:\Temp\dsh-src\packages` 下数出来的；**（推断）** = 我基于事实的分析，未被实测证伪，也未实测证实。

---

## §0 结论（先读这段）

1. **「市面主题插件」不是一个有用的对标物。** 13 款 DSH 生态插件覆盖的效果家族只有 6 个（颜色 13/13、背景媒体 3–4/13、玻璃 3/13、排印 2/13、装饰 2/13、动效 2/13），全局字号、布局密度、图标替换三类 **0 家**，内容层只有 shiki 配色一种形态（事实，`theme-13-synthesis-100.md` 表 A/表 B + `skin-5-repos-99.md` §8）。真正的天花板是**宿主暴露的表面**，不是同行已经做到的事。以「13 款的上限」定义目标，会把 V3 锁在市场水平（粗略估计不到宿主能力的两成，推断）上。
2. **上限可以写成一个可判定的集合**：`E = ⋃通道 (可表达 ∩ 可存活)`，通道只有 5 条（token 层 / 样式表层 / DOM 层 / 资源层 / 字体层），存活要过 4 道验收（重渲染、主题切换、卸载还原、上游升级）。见 §1.1–§1.4。
3. **V2 的 JSON 只能表达 13 个效果家族里的 1.5 个**（颜色语义 + 排印粗调），因为 schema 只有色槽与三参数；宿主能力远大于此。**「JSON 100% 还原任意主题」在 V3 当前形态下不成立**，缺的不是通道，是字段。
4. **最重要的 3 个缺口**（按「不补就撑不起上限承诺」排序）：
   - **G1 语义覆盖面**：37 色槽 → 宿主 403 个唯一 `--dsw-*` 名 / 约 180 个有效名。37 槽已覆盖 diff 一族（`diffAdded`/`diffHunkHeader` 等）、tooltip 底色、滚动条四色与键帽底（后两者由 `DERIVED_TOKENS` 计算得出，用户不可指定），但仍有一整批语义面无 JSON 入口：**focus ring、selection、mask、elevation、radius、motion、菜单材质面（`--dsw-menu-surface-fill`/`--dsw-specific-menu`）、滚动条形状/宽度、hover/active 一族的显式槽位**。
   - **G2 形状与材质轴缺失**：`--dsw-radius-*`（6 个 token，307 处消费）、`--ds-transition-duration/ease`（53 处消费）、`--dsw-shadow-lv*`/`--dsw-elevation-*`、`--dsw-menu-backdrop-filter` 全部是「非颜色」轴，V2 schema 里没有对应字段，而宿主已经把它们做成了干净的 token 杠杆。
   - **G3 背景与媒体层**：区域背景（静图/动图/视频）需要「DOM 层挂载 + 4 个不透明面透明化 + 资源解析」三件事同时做，V2 一件都没有；且宿主**没有静态资源目录**（只有 `client.<hash>.js` 可被服务），资源必须走 `data:`/`blob:`/自建路由，这是工程门槛最高的一条。
5. **P0 扩展点（5 个，缺一即无法交付「还原」承诺）**：`tokens`（任意 `--dsw-*` 直通）、`shape`（radius/border/cornerShape）、`background`（页面/区域 + 资源形态）、`typography` 扩展（行距/字距/字重/per-role 字号/CJK）、`schema` 版本与未知字段保留。字段形态见 §4。
6. **三类不可达**（不是「暂不做」，是「不改宿主源码就做不到」）：宿主结构级（前端路由、组件结构、`ctx.remote` 命名空间）、钩子缺失级（侧栏会话行级背景、逐消息气泡级背景）、优先级墙（宿主 20 处 `!important` 与 body 行内样式快照）。另有两类「不做」：BGM/声音（13/13 无通道，且非外观）、iframe 复用整页（无路由 + 第二实例含 WS）。
7. **对「100% 还原」的诚实口径**：应表述为「在 13 个效果家族 × 稳定钩子集合内 100% 还原；家族外由受控 `css` 逃生舱兜底；上述三类硬墙除外」。这句可以写进 README 而不被打脸，见 §5.4。

---

## §1 「上限」的定义与验证口径

### 1.1 定义

> **效果上限（Effect Ceiling, EC）**：固定同一宿主（commit 级）+ 外部插件以 in-process 全信任运行时注入（可写 `<style>`、可改 DOM、可读本地文件、可自建路由、无沙箱、无 CSP）时，**一个主题插件在不修改宿主源码的前提下**能使外观发生的全部变化的集合。

形式化：`EC = ⋃_{c ∈ C} (Expressible(c) ∩ Survivable(c))`

- `C` = 注入通道集合（§1.3，5 条）
- `Expressible(c)` = 该通道单次可写入的最大 CSS/媒体面
- `Survivable(c)` = 通过 §1.4 四道验收的子集（很多效果「能写进去」但活不过一次主题切换或升级）

「同一宿主」不限定版本号，但 V3 必须带**宿主探针**：403 个 token 名是宿主 v0.2.1-rc.2 的事实，宿主改名后一切映射都会静默失效（事实，`v3-capability-matrix.md` §4）。

### 1.2 三道墙（上限不是无限的）

| 墙 | 机制 | 后果 | 证据 |
|---|---|---|---|
| **语义墙** | 插件只能给「宿主已有消费方的变量」填值，不能造消费点 | 自创 `--palette-*` 名字写了也无人读；能改的语义面 = 宿主 sheet 里已声明的名字 | 宿主 602 条 token 声明集中在 6 个 token sheet，其余是组件局部变量（如 `--terminal-cursor`）（事实，`v3-capability-matrix.md` §2.1）；`overrideTokens` 名字零校验、值零校验（事实，`ui-theme/src/client/index.ts:466-486`）→ 通道很宽，消费方很窄 |
| **结构墙** | 只能「附加」或「改样式」，不能把不存在的节点变成宿主的语义节点 | 侧栏会话行没有 `data-*`，逐行背景不可行；`ui-chat`/`ui-conversation` 不在平台单例表内，不能复用宿主气泡组件 | `ui-sidebar/src` 零 `data-*`（事实，`v3-capability-matrix.md` §2.4）；平台单例表 11 项含 `ui-primitives` 不含 `ui-chat`（事实，`packages/client/web/src/platform.ts:8-15`） |
| **权限墙** | 行内样式 > `!important` > 普通规则；同特异性按后序 | body 行内 token 快照无法被规则夺回；宿主 20 处 `!important` 必须用同级 `!important` 才盖得住 | 主题快照写 body 行内（事实，`packages/client/ui-layout/theme-presenter.ts:87-90`）；全仓 `!important` 约 20 处（计数），集中在 `MarkdownText`/`CodeBlock`/`TrajectoryTable`/terminal |

三道墙决定了「不可达清单」的边界（§5），也决定了为什么有些效果「需引擎代码」而不是「纯 JSON」：**JSON 只是字段，字段背后必须有引擎替它选对通道**。

### 1.3 注入通道（C1–C5）

| 通道 | 形态 | 强度 | 硬限制 | 证据 |
|---|---|---|---|---|
| **C1 Token 层** | `ctx.theme.overrideTokens(source, {name: {light,dark}})` | 落到 **body 行内**，单值最强 | 必须成对 light/dark；被后代自身重声明击败（`body *` 逐元素）；一个 source 一层，重注册替换整层 | 事实：`overrideTokens` 校验形状与类型、不校验名字与值（`ui-theme/src/client/index.ts:369-378, 466-486`）；落地 `theme-presenter.ts:87-90`；逐元素重声明 `gradient-shadow-text.css:31-40` |
| **C2 样式表层** | 自注 `<style data-plugin=…>`（本插件已在用） | 与宿主同特异性时后序胜 | 宿主无 `@layer`（计数 0）→ 无层叠层干扰；夺不回行内样式；遇 `!important` 需同级 `!important` | 事实：本插件 `runtime/client.ts:739-743`；宿主 `@layer` 0 处、`!important` 约 20 处（计数） |
| **C3 DOM 层** | T1 槽位（`shell.overlay`/`main`/`sidebar`/`rightbar`/`settings.section`）或直接 `body.appendChild` | 可新增视觉层、可挂 React 组件 | 不能改宿主节点结构；CSS Modules 哈希类不可依赖；`body > :not(#root)` 在 darwin 自动 no-drag | 事实：槽位 `AppFrame.tsx:258-307`；`base.css:69-71`（no-drag）；**宿主无官方 stylesheet 注入 API**（计数：`addStyleSheet/injectStyle/adoptedStyleSheets` 在 packages 下 0 命中）→ C2 本质是 T2 |
| **C4 资源层** | `data:`/`blob:`/远程 `http(s)`/自建 `fetchRegistry` 路由 | 图片、GIF、APNG、视频、字体皆可 | **宿主没有静态目录**：只有 `client.<hash>.js` 被服务，其余路径 404；`file://` 子资源在 http 页面被浏览器拦（事实：Chromium 行为；本仓未实测，故资源必须先转 data/blob 或回环服务） | 事实：`packages/client/modules/index.ts:193`、`frontend-static/src/index.ts:88-99`；本插件已有路由先例 `runtime/host.ts:510` |
| **C5 字体层** | `@font-face` + `--dsh-font-family-{text,code,terminal}` | 可换字族、可加可变字体、可用 `unicode-range` 切分 | 随包字体只能 Latin 子集（体积）；CJK 需用户提供文件；终端字族/字号**只走 JS**（xterm），CSS token 零消费 | 事实：本插件已带 15 个 latin-subset woff2（`src/fonts/`，5 族×3 字重）；`--dsh-terminal-font-size` 零 CSS 消费、xterm 走 `ui-sidebar-terminal/src/client/terminal.tsx:85-93`（`v3-capability-matrix.md` §2.3） |

**关键判断（推断）**：C1 是「官方通道但语义窄」，C2 是「非官方通道但表达力宽」。V2 只用 C1 + C2 的一小块（8 条元素规则）。V3 的上限扩张主要发生在 C2/C3/C4/C5，而不是 C1。

### 1.4 可还原性三档（判定规则）

| 档 | 定义 | 判定问句 | 交付成本 |
|---|---|---|---|
| **A 纯 JSON 可达** | 现有 schema 字段 + 现有 renderer 已能表达，用户改 JSON 即生效 | 「今天把这段 JSON 粘进编辑器，像素会变吗？」 | 0 代码 |
| **B 需引擎代码支持** | 通道内可实现，但需要新增 schema 字段 + renderer（可能含 DOM/资源逻辑） | 「通道能写吗？宿主有消费方/钩子吗？」两个都「是」→ B | 一次 schema + 一次 renderer + 一条快照测试 |
| **C 不可达** | 在 §1.2 三道墙内无法稳定实现；或需改宿主源码；或需宿主未暴露的钩子 | 「不 fork 宿主能不能做到？」否 → C | 只能进「不做清单」并写清理由 |

补充规则（本次研究新增，建议写进 schema 文档）：

- **B0 子档**：只需往 C1 塞一个已有 token（无选择器、无 DOM），实现量 < 半天。`radius`/`motion`/`shadow` 属此类——它们是「JSON 没字段」，不是「引擎做不到」。
- **B1 子档**：需要 C2 选择器（含逐元素覆盖、`!important`、伪元素）。`行距`、`代码块横幅`、`滚动条` 属此类。
- **B2 子档**：需要 C3 DOM 层 + C4 资源。`区域背景`、`装饰叠加层`、`背景视频` 属此类。
- **C 再分三层**：`C-token`（token 层不可达但规则可达，如 `--dsw-elevation-*`）、`C-hook`（规则可达但 DOM 无钩子，如侧栏逐行）、`C-struct`（结构性，如无后端、无前端路由）。

### 1.5 验证口径（「上限」怎么验）

**6 个探针主题**（每个只压 2–3 个家族，全部用 JSON 写、不用代码）：

| # | 探针 | 压的家族 | 通过判据 |
|---|---|---|---|
| P1 | VSCode Dark+ 复刻 | F1 颜色 | 37 槽 + 至少 12 个非色槽 token（focus/diff/selection/tooltip）与截图肉眼一致 |
| P2 | Catppuccin Mocha | F1 + F11 | 11 枚 shiki 正交、diff 三色可辨、行内码不吞背景 |
| P3 | Glass Aurora | F2 + F6 | 菜单玻璃可读（对比度 ≥ 4.5）、遮罩仍可辨内容、无「糊成一片」 |
| P4 | Wallpaper Video | F4 | 4 个不透明面全部透出、滚动不抖、卸载后 0 残留节点 |
| P5 | Print Paper | F3 + F5 + F9 | 行距/字距/圆角/间距全改后无溢出、无裁切、29 个固定 height 组件不破版 |
| P6 | CRT Terminal | F10/F11/F13 | 滚动条/代码块/图标着色一致，动效在 `prefers-reduced-motion` 下全降级 |

**4 道验收**（每个探针都要过）：

1. **重渲染存活**：切换会话、打开设置、发一条消息后外观不变（排除「只对首屏生效」的假还原）。
2. **主题切换存活**：dark↔light 来回 3 次，无残留颜色、无 `light` 半边缺值（C1 强制成对）。
3. **卸载全还原**：禁用插件后 `document.querySelectorAll('[data-plugin="dsh-opencode-palette"]').length === 0`，body 行内 token 清空，背景层节点移除（对照 13 仓里 5 家有可验证还原、3 家只有 README 级证据，事实 `theme-13-synthesis-100.md`）。
4. **上游升级不炸**：宿主 commit 前滚时只允许「视觉退化」，不允许报错/白屏（要求 V3 所有选择器来自稳定钩子白名单 + 宿主探针降级）。

---

## §2 效果家族枚举（F1–F13）

每族固定五段：表达力来源 / 宿主事实 / V2 现状 / 判定 / 外部先例。

### F1 颜色语义

- **表达力来源**：C1（token）+ C2（少量元素规则，如 `blockquote` 边框）。
- **宿主事实**：403 个唯一 `--dsw-*`、602 条声明、6 个 sheet（design-platform 382 / gradient-shadow-text 196 / base 11 / onboarding 10 / focus 2 / corner-shape 1）；family 分布 static 77、alias 107、font 182、specific 11、radius 6、elevation 5、shadow 4、linear 2、gradient 3、menu 2、focus-ring 2、corner 1、mask 1；268 条含 `var()`、13 处 `color-mix`（事实，`v3-capability-matrix.md` §2.1）。
- **V2 现状**：37 槽 → `TOKEN_MAP` 约 62 条 + `DERIVED_TOKENS` 约 40 条 + `SHIKI_MAP` 10 枚（事实，`src/engine/map-dsh.ts`）。覆盖面约「宿主有效名面」的 1/3。
- **判定**：**A**（已有字段）；但「任意主题都能还原」要求下，A 档必须靠 P0-1 扩到「任意 `--dsw-*` 直通」。
- **外部先例**：13/13 都做颜色（`theme-13-synthesis-100.md`）；VSCode 本身就是一张 color-id 表（[Theme Color](https://code.visualstudio.com/api/references/theme-color)）；Windows Terminal scheme 20 个色字段（[官方文档](https://learn.microsoft.com/en-us/windows/terminal/customize-settings/color-schemes)）。
- **风险**：`--dsw-static-*` 是调色板原子（77 个），改它等于改整套语义面；`--dsw-elevation-stroke-color` 有 ≥10 处组件重绑，C1 改不动（事实，`v3-capability-matrix.md` §2.1）。

### F2 材质 / 玻璃

- **表达力来源**：C1（浮层两个 token）+ C2（任意面板 `backdrop-filter`）。
- **宿主事实**：菜单玻璃 = `--dsw-menu-surface-fill`（light `rgba(248,249,250,0.58)` / dark `rgba(67,69,74,0.45)`） + `--dsw-menu-backdrop-filter: blur(40px) saturate(150%)`；`--dsw-mask-blur` 固定 `none`（注释原文 "Blocking masks dim the page; menu backgrounds retain their blur."）；darwin 把 `--dsw-specific-menu` 钉到 94% 不透明（`design-platform.css:403/407`），覆盖它需要 0-1-2 特异性；宿主 32 处 `backdrop-filter`（计数）。
- **V2 现状**：无字段、无规则。
- **判定**：**B0**（浮层玻璃：两个 token 直写即可，零选择器）；**遮罩玻璃 B1/C-token 混合**——`--dsw-mask-blur` 可覆盖，但遮罩的实际观感主要来自 `--dsw-alias-bg-mask-1/2/3` 纯色（`:174-178/292-296`），改玻璃要同时改两者，且宿主是否消费 mask-blur 需实测。
- **外部先例**：open-sea 九 token 玻璃；bloom 用 `::before` + `backdrop-filter`；ui-appearance 三层（base canvas / 图片层 blur≤30 / scrim）（`skin-5-repos-99.md`、`color-appearance-catppuccin-claude-ui-102.md`）。
- **风险**：玻璃 + 壁纸叠加会同时压低对比度；必须在 schema 里强制「scrim 或 tint 二选一」并给对比度审计（V2 已有 `TOOLTIP_TEXT_THRESHOLD = 4.5` 先例，`src/engine/generate.ts`）。

### F3 排印（字体/字号/行距/字距）

- **表达力来源**：C1（3 字号 + 3 字族 token）+ C2（`font-size/line-height/letter-spacing/font-weight/font-feature-settings`）+ C5（`@font-face`）。
- **宿主事实**：官方可改面只有 3 字号（`--dsh-content-font-size` 10–22 默认 14、`--dsh-code-font-size` 10–16 默认 11、`--dsh-terminal-font-size` 10–20 默认 13）+ 3 族；**只有一条轴**：字号 → delta → 14 个 Markdown 角色 × 6 token（composite 被 103 处引用）+ 13 档静态阶梯；另 150 个 per-role longhand 里 149 个无消费方；**无全局行高**（45 处组件 `calc(基准px + δ)`、29 个固定 height 绑字号 delta、10 处 line-clamp）；行内码先给 token 再 `font-size: 0.875em !important`（`MarkdownText.module.css:169`）；代码块 banner 写死 11px/18px（`CodeBlock.module.css:47-49`）；终端字号/字族只走 JS；4 套互不相干字体栈，全仓零 CJK 字体、零 `unicode-range`；硬编码规模 `font-size:Npx` 529 处/126 文件、`line-height:Npx` 421 处、仅 31 文件吃字号轴（事实，`v3-capability-matrix.md` §2.3 + 计数）。
- **V2 现状**：`buildTypographyCss` 输出 `FONT_FACE_CSS` + body 上的字族/markdown 阶梯（h1=size+3、h2=size+2、h3=size+1、lh=size+9、small=size−1）+ `body{font-size}`（事实，`src/engine/generate.ts`）。即：**只有「一条轴」的粗调**，与宿主同构。
- **判定**：
  - 字号/字族：**A**
  - 行距：**B1**（无全局轴 → 必须逐组件选择器覆盖，并抢回 45 处 inline `calc`；可行但脆，这正是用户 24 条第 6 条标 🔴 的原因）
  - 字距 / 字重 / OpenType 特性：**B0/B1**（宿主 `letter-spacing` 仅 12 处、`font-variation-settings|font-feature-settings` 0 处 → 新增不冲突，收益高、风险低）
  - per-role 细粒度字号：**B1 但收益低**（150 longhand 只有 1 个消费方，改角色字号只能靠选择器；推断：优先级 P1 之后）
  - CJK 字体：**B2**（需用户文件或子集化 + `unicode-range`；随包不可行）
  - 终端字号：**C-token**（只走 JS，CSS token 零消费）
- **外部先例**：claude-style 全栈接管 + 7 组 `@font-face`（含 OFL 自带字体，Anthropic 三款需用户自放）；mineradio 只换 `--dsw-font-family` 且 Inter base64 + CJK 回退；**13 仓 0 家接管全局字号**（`color-appearance-catppuccin-claude-ui-102.md`、`theme-13-synthesis-100.md`）。VSCode 主题完全不能改字体（主题只有 color + token 的 `fontStyle`），Windows Terminal 也不能——这说明「排印」是我们相对成熟生态的**差异化区**，也是最容易被「100% 还原」承诺拖下水的一区。

### F4 区域背景与静态图/动图/视频

- **表达力来源**：C2（透明化 + 背景层样式）+ C3（挂载层）+ C4（资源）。
- **宿主事实**：要透出壁纸必须同时打通 **4 个不透明面**：`body`（`packages/client/web/src/base.css:30`）、帧（`AppFrame.module.css:1-8`）、侧栏列（`--dsw-specific-sidebar-fill`）、会话列（`ConversationRoot.module.css:5-7`）；设置面板另走 `--dsw-alias-bg-layer-2`；z-index 序 overlay 20 < 模态/设置 1000 < 菜单 portal 1100 → 页面级背景层必须挂在 `body` 下且 `z-index:-1`；`body > :not(#root)` 在 darwin 自动 no-drag（`base.css:69-71`），是唯一同时避开 app-region 与层叠问题的注入位；**宿主无 CSP**，`<img>`/GIF/APNG/`<video autoplay muted loop playsinline>` 可行；**无静态目录**（见 C4）（事实，`v3-capability-matrix.md` §2.4 + 媒体段）。
- **V2 现状**：无字段、无 DOM 层。
- **判定**：**B2**（页面级背景：DOM 层 + 4 面透明化 + 资源解析，工程量最大的一项）；区域级（侧栏列/会话列分别上背景）**B2**；**侧栏会话行逐行背景 = C-hook**（`ui-sidebar` 零 `data-*`）。
- **外部先例**：13 仓两种哲学 `page-fixed`（body 级 fixed −1/−2 + `pointer-events:none` + 页面透明化）vs `column-inner`（maid 对话列内）；资源寻址四制（bundle 指纹相对 / 同源 serve+token / blob+dataURL+IndexedDB / 本地绝对路径+回环服务）；视频自动播放交集 = muted+loop+autoplay+playsinline；engine 有 Range/HEAD/ETag（video seek 依赖）、any 2GB 上限、model 无视频（`wallpaper-dynamic-background-103.md`、`theme-13-synthesis-100.md`）。
- **风险**：视频 + 玻璃 + 阴影三层叠加时性能与可读性双崩；schema 必须带 `maxBytes`、`poster`、`reducedMotion` 三件套。

### F5 边框与圆角

- **表达力来源**：C1（radius 6 token + corner-shape 1 token）+ C2（剩余硬编码半径、边框宽度/虚线）。
- **宿主事实**：`:root` 声明 `--dsw-radius-xs/sm/md/lg/xl/panel = 4/8/12/16/20/28px`（`base.css:18-23`），**仅此一处声明、无组件重绑**（计数）；消费 `var(--dsw-radius-*)` 307 处，硬编码数字半径 142 处，`border-radius:` 总计 471 处（计数）→ token 轴覆盖 65%；另有宿主独有的曲率轴 `--dsw-corner-shape: superellipse(1.5)` 由 `*` 消费（`corner-shape.css:16-25`），全圆形状在组件内配 `corner-shape: round` 退出。
- **V2 现状**：无字段。
- **判定**：**B0**（radius/cornerShape：纯 token，零选择器，风险最低、性价比最高）；边框宽度/样式/虚线 **B1**（无 token，需选择器 + 142 处硬编码半径兜底）。
- **外部先例**：bloom 10 变体改 radius 变量；open-sea 圆角体系（`skin-5-repos-99.md`）。**VSCode 主题不能表达圆角/边框宽度**（只有颜色）→ 这是我们能明确超过成熟生态的一条。
- **风险**：`superellipse` 需要 `@supports` 守卫，老浏览器退化；滚动条部件必须保持圆形（`::-webkit-scrollbar` 不吃 corner-shape）。

### F6 阴影、发光与渐变文字

- **表达力来源**：C1（`--dsw-shadow-lv*` / `--dsw-elevation-*`）+ C2（`text-shadow`、`background-clip:text`、`drop-shadow`）。
- **宿主事实**：`--dsw-shadow-lv1/lv1-blur/lv2/lv3` 四件在 body（`gradient-shadow-text.css:5-9`）；`--dsw-elevation-stroke/panel/prominent/soft` 被 `body, body *` **逐元素**重声明（`:31-40`，注释说明是为了让组件重绑描边色能生效）→ **C1 对 elevation 无效**，必须 C2 写 `body *{}` 后序覆盖；`text-shadow` 0 处、`background-clip: text` 0 处、`filter: drop-shadow` 0 处（计数）→ 新增发光/渐变文字**不与宿主冲突**，纯 C2。
- **V2 现状**：无字段。
- **判定**：**B0**（shadow/elevation 值）+ **B1**（发光、渐变文字：需要宿主语义选择器，如 `h1`/`strong`/`.md-code-block`）。
- **外部先例**：宿主自己的 sheet 就叫 `gradient-shadow-text.css`（196 条声明）——说明宿主设计语言里「渐变 + 阴影」本就是一等公民，只是没开放成 token；prts 用 SVG data-URI/粒子做光效；bloom 有发光（`skin-5-repos-99.md`）。VSCode 只有 `widget.shadow` 一个颜色，无模糊/扩散参数（[Theme Color](https://code.visualstudio.com/api/references/theme-color)）。
- **风险**：elevation 三件套是「描边 + 内柔光」的复合体，用户改坏会导致浮层没有边界；schema 必须允许「只改 stroke 色」这种最小介入。

### F7 动效与过渡

- **表达力来源**：C1（运动轴 `--ds-*`）+ C2（`@keyframes`/`transition`/`animation`）+ C3（canvas/装饰层）。
- **宿主事实**：运动轴是 `--ds-ease-in-out: cubic-bezier(0.4,0,0.2,1)`、`--ds-transition-duration: 0.2s`、`-fast: 0.1s`、`-slow: 0.3s`，全部在 `:root`（`base.css:14-17`），消费 43 + 10 处（计数）；**`--dsw-motion-*` 0 处**（计数）——命名不是 `--dsw-`，做 token 映射时极易漏；宿主有 43 个 `@keyframes`、52 处 `prefers-reduced-motion` 降级先例（计数）；本插件 `runtime/ui-fx.ts` 已有 150–160ms + `cubic-bezier(0.22,1,0.36,1)` + reduced-motion 全量降级的成熟范式。
- **V2 现状**：主题 JSON 无字段；ui-fx 的交互微动效是**引擎内置**而非用户可配。
- **判定**：**B0**（duration/easing 四 token）+ **B1**（hover/press 预设：需要状态选择器，`ui-fx.ts` 已有 `!important` 只允许出现在状态选择器的纪律）+ **B2**（环境动效：背景流光/浮动层，需要 DOM 层）。
- **外部先例**：prts 粒子 canvas、open-sea iframe 实时 WebGPU 海洋（`skin-5-repos-99.md`）；**VSCode / Chrome / Windows Terminal 的主题格式都没有动效表达能力**（Chrome 主题只有 colors/tints/images/properties，无 CSS 注入）→ 动效是纯增量区，没有外部先例可抄，必须自己定纪律。
- **风险**：动效是最容易违反「重渲染存活」与「升级不炸」的一族；必须默认 `reducedMotion: clamp`，且 ambient 动效上限 1 层。

### F8 装饰性伪元素与叠加层

- **表达力来源**：C2（`::before/::after` + `content`/`mask`/`background-image`）+ C3（自挂层）。
- **宿主事实**：稳定钩子集合有限但够用：`[data-slot]`、`[data-shell-*]`、`[data-conversation-region|session|content]`、`[data-composer-seat]`、`[data-chat-flow-kind|node-key|turn]`、`[data-tool…]`、`[data-diff|read|search|terminal]`、`.md-code-block`、`[role=menu|dialog|tooltip]`、`[data-menu-material]`；**CSS Modules 哈希类不可依赖**（事实，`v3-capability-matrix.md` §2.4）。
- **V2 现状**：无字段；`CSS_RULES` 只有 8 条元素规则。
- **判定**：**B1**（受控装饰：selector 白名单 + 伪元素声明表）；**完全自由 CSS = 不做原则下的 C**（见 §5.2），但可作为 P2 逃生舱单独开关。
- **外部先例**：prts 自有 `--prts-*` + SVG data-URI/粒子；bloom `::before` 壁纸层（v0.5.0 又移除）；没有一家做「用户可写装饰」→ 这一族是**新设计**，没有成熟形态可对标。
- **风险**：伪元素会与组件的 `::before/::after`（如菜单材质、角标）打架；必须限定白名单且做「已有伪元素检测」。

### F9 布局微调（间距/密度）

- **表达力来源**：C2（`gap/padding/margin/height`）+ 无 token 轴。
- **宿主事实**：**没有 spacing token 族**（6 个 sheet 里 radius/motion/shadow/elevation 都有，间距没有）；`padding` 等硬编码遍布组件（`font-size:Npx` 529 处可作规模参照）；29 个固定 height 绑字号 delta（事实，`v3-capability-matrix.md` §2.3）。
- **判定**：**B1 且必须受控**——全局 `zoom` 会破坏 fixed 定位与 xterm 网格（推断）；`transform: scale` 破坏命中测试（推断）；可行路径只有「间距类选择器白名单 × 单一 scale 系数」。
- **外部先例**：**13 仓 0 家做密度**；VSCode 的 `window.zoomLevel` 不是主题能力（是用户设置）；浏览器扩展（Stylus 类）能全 CSS 但那是「注入器」不是「主题」。
- **结论（推断）**：这一族应当**降级为 P2 且只做 3 个安全目标**（消息列表行距、工具结果块内边距、侧栏项高度），不做全局缩放。

### F10 图标与字体替换

- **表达力来源**：C5（图标字体，不现实）+ C2（`mask-image` 替换、`currentColor` 着色）。
- **宿主事实**：图标是 inline SVG（TSX 组件），可被 `currentColor` 着色；`*.svg` 资源仅 10 个（计数）；无图标字体。
- **判定**：着色 **A**（颜色 token 已覆盖）；字形替换 **C-hook 边缘**（只能对已知稳定选择器做 `mask-image` 替换，且需重置 `background-color: currentColor`、尺寸/线宽不可控）；图标字体方案 **不做**。
- **外部先例**：**VSCode 把图标做成独立贡献点**（[File Icon Theme](https://code.visualstudio.com/api/extension-guides/file-icon-theme)、[Product Icon Theme](https://code.visualstudio.com/api/extension-guides/product-icon-theme)），颜色主题本身不带图标 —— 这是成熟生态给出的架构答案：图标与配色是两层，不该塞进同一个 JSON。本仓采纳同一结论（P2 仅做映射表，且只覆盖工具类图标）。
- **风险**：`mask-image` 会丢失多色图标与线宽语义；用户上传 SVG 有 XSS 面（SVG 可含 script）→ 只能走 `<img>`/mask，不能内联。

### F11 内容层增强（代码块 / diff / Markdown / 工具栏 / 滚动条）

- **表达力来源**：C1（shiki 10 枚 + `--dsh-scrollbar-thumb`）+ C2（`.md-code-block` 等稳定钩子）。
- **宿主事实**：`.md-code-block` 自称 stable semantic hooks（`CodeBlock.tsx:188-194`）；diff/read/search/terminal 有 `data-*`；`--dsh-scrollbar-thumb` 4 处 var 消费但约 15 处组件重绑（C1 不可达，C2 可达）；代码块背景被 `CodeBlock.module.css:92-94` 的 `background: … !important` 钉住 → 改代码块底色必须同级 `!important`；banner 写死 11px/18px 且用正文字族（`CodeBlock.module.css:47-49`、`CodeCard.module.css:20`）；表格内 code 写死 11px（`MarkdownText.module.css:274`）。
- **判定**：**A**（shiki 颜色）；**B1**（banner 高度/字号、行号色、滚动条宽度与圆角、Markdown 分隔线样式）；**C**（在代码块工具栏加按钮 = 功能改造，不改宿主逻辑做不到）。
- **外部先例**：catppuccin 11 枚 shiki 正交（`color-appearance-catppuccin-claude-ui-102.md`）；VSCode 有 `textCodeBlock.background` 等 color-only 入口（[Theme Color](https://code.visualstudio.com/api/references/theme-color)）。
- **风险**：`!important` 军备竞赛会掩蔽宿主升级（本仓既有红线：ui-theme 自身 0 个 `!important`，滥用会吞掉上游修复）。

### F12 状态与交互反馈（hover/focus/active/selection）

- **表达力来源**：C1（alias hover/active 一族、focus-ring）+ C2（`:hover/:focus-visible` 规则）+ 既有 ui-fx。
- **宿主事实**：焦点环由 `--dsw-focus-ring-color`（默认回退到 `--dsw-alias-state-business-primary`）与 `--dsw-focus-ring-width: 2px`（`:root`，`focus.css:3`）驱动；`[data-dsh-automatic-focus]:focus{outline:none}` 关掉了默认 outline（`base.css:36-38`）→ **移除默认 outline 后必须自己给可见焦点**，否则可访问性倒退（WCAG 2.4.7）；且指针模态下 `html[data-input-modality='pointer'] body :focus-visible:not(:read-write)` 会把环色强制 transparent（`focus.css:21-25`，特异性 0-3-2）→ 想「点按也显示环」必须打赢这条（事实）。
- **判定**：颜色 **A**；环宽/颜色 **B0**（token 直写）；指针模态强制显示 **B1**（需更高特异性规则）；缩放/阴影/位移反馈 **B1**（状态选择器 + `!important` 纪律）；与 F7 共用 motion 字段。
- **外部先例**：VSCode 每个控件都有 `*.hoverBackground/*.activeBackground` 颜色入口（[Theme Color](https://code.visualstudio.com/api/references/theme-color)），但**没有几何反馈**；24 条第 24 项要的「所有可点控件交互效果」在成熟生态里同样没有先例。
- **风险**：焦点可见性是最容易被主题做坏的一项；schema 应内置 `focusVisible: 'ring' | 'glow' | 'none'` 且 `none` 需要显式确认。

### F13 声音与媒体动态（BGM）

- **表达力来源**：无通道。
- **宿主事实**：13 仓 **0/13** 有独立 BGM 通道（事实，`theme-13-synthesis-100.md` 结论）。
- **判定**：**不做**（不是 C，是主动排除）。理由三条：产物体积（音频 ≥ 数百 KB/主题）、自动播放策略（必须有用户手势）、与「外观」定义无关。
- **外部先例**：无。

---

## §3 可还原性矩阵（总表）

读法：**档** = A 纯 JSON / B0 token 型 / B1 选择器型 / B2 DOM+资源型 / C 不可达（C-token / C-hook / C-struct）。**P** = 扩展点优先级。

| # | 效果家族 | 主要通道 | 档 | V2 是否可达 | 需要的扩展点 | P | 外部先例强度 |
|---|---|---|---|---|---|---|---|
| F1 | 颜色语义 | C1+C2 | A | ✅（37 槽） | `tokens` 直通 | P0 | 强（13/13、VSCode、WT） |
| F2 | 材质/玻璃 | C1+C2 | B0 / 遮罩 B1 | ❌ | `material` | P1 | 中（3/13） |
| F3 | 排印 | C1+C2+C5 | A / B1 / CJK B2 | 部分（粗调） | `typography` 扩展 | P0 | 弱（2/13；VSCode/WT 无） |
| F4 | 区域背景与媒体 | C2+C3+C4 | B2 / 逐行 C-hook | ❌ | `background`+`assets` | P0 | 中（3–4/13） |
| F5 | 边框与圆角 | C1+C2 | B0 / 边框 B1 | ❌ | `shape` | P0 | 弱（2/13；VSCode 无） |
| F6 | 阴影/发光/渐变文字 | C1+C2 | B0 / B1 | ❌ | `effects` | P1 | 弱（1–2/13） |
| F7 | 动效与过渡 | C1+C2+C3 | B0 / B1 / B2 | ❌ | `motion` | P1 | 极弱（2/13；成熟生态无） |
| F8 | 装饰伪元素/叠加层 | C2+C3 | B1 / 自由 CSS C | ❌ | `decorations` | P2 | 弱（2/13） |
| F9 | 布局微调/密度 | C2 | B1（受控 3 目标） | ❌ | `density` | P2 | 无（0/13） |
| F10 | 图标替换 | C2+C5 | 着色 A / 替换 C-hook | 着色 ✅ | `icons` | P2 | 架构先例（VSCode 独立层） |
| F11 | 内容层增强 | C1+C2 | A / B1 / 功能 C | 部分（shiki） | `regions` | P1 | 中（1/13、VSCode color-only） |
| F12 | 状态交互反馈 | C1+C2 | A / B1 | 部分 | `motion`+`effects` | P1 | 颜色强、几何弱 |
| F13 | 声音/BGM | — | 不做 | — | — | — | 无（0/13） |

矩阵的三条读数：

1. **A 档只覆盖 2 个家族**（F1、F3 粗调、F11 shiki），而 13 个家族里 9 个是 B 档 → **上限扩张 = 引擎扩张**，不是 prompt 扩张。
2. **B0 有 4 项**（radius/motion/shadow/glass 的 token 部分），全部只需「JSON 字段 → 一条 token 注入」，是投入产出比最高的第一批（推断：4 项合计 < 2 天）。
3. **B2 只有 2 项**（背景、装饰叠加），但这两项承担了「市面主题插件最炫的效果」，也是工程量与风险的大头。

---

## §4 V3 schema 必须补的扩展点（P0/P1/P2）

字段形态即交付契约；`{light,dark}` 由引擎按 `appearance` 自动成对（沿用 C1 的强制成对规则）。

### 4.1 P0（不补则「还原」承诺不成立）

**P0-1 `tokens`：任意 token 直通**

```jsonc
"tokens": {
  "--dsw-radius-md": "10px",
  "--dsw-focus-ring-color": { "light": "#0a66ff", "dark": "#7ab8ff" },
  "--dsw-focus-ring-width": "2px",
  "--ds-transition-duration": "220ms"
}
```

- 语义：键必须是 `--` 前缀；值允许字符串或 `{light,dark}` 对；引擎对未在 37 槽映射表内的名字**原样透传**，不做颜色解析。
- 通道：C1。落地：并入 `overrideTokens` 的同一层（`'opencode-palette'`），与既有 40 条 derived token 合并去重。
- 为什么 P0：这是把 A 档从 37 槽扩到宿主约 180 个有效名的**唯一**入口；没有它，「任意主题」在第一屏颜色上就还原不了。
- 风险：`--dsw-static-*`（77 个原子）被误改会全局崩，需在编辑器里分组 + 警告；`--dsw-elevation-*` 应在此字段**排除**（C-token，交给 `effects.elevation` 走 C2）。

**P0-2 `shape`：圆角、边框、曲率**

```jsonc
"shape": {
  "radius": { "xs": "4px", "sm": "8px", "md": "12px", "lg": "16px", "xl": "20px", "panel": "28px", "scale": 1 },
  "cornerShape": "superellipse(1.5)",
  "border": { "width": "1px", "style": "solid", "color": "borderSubtle" },
  "hairline": true
}
```

- 通道：`radius`/`cornerShape` → C1（B0）；`border` → C2（B1，需选择器白名单 + 142 处硬编码半径兜底）。
- 依据：radius 六 token 只在 `base.css:18-23` 声明、无组件重绑，307 处消费（计数）→ 这是宿主给的最干净的杠杆。

**P0-3 `background` + `assets`：区域背景与资源形态**

```jsonc
"background": {
  "page": { "kind": "image", "src": "bg.webp", "fit": "cover", "opacity": 0.8,
            "blur": "0px", "scrim": "#00000066", "attachment": "fixed" },
  "regions": [ { "target": "sidebar", "kind": "video", "src": "https://…/a.mp4",
                 "opacity": 0.35, "muted": true, "loop": true, "poster": "p.webp" } ],
  "transparentize": ["body", "frame", "sidebarColumn", "conversationColumn"]
},
"assets": { "root": "relative-to-json", "maxBytes": 8388608, "delivery": "data" }
```

- 通道：C3（`body` 下 `z-index:-1` 层 + `pointer-events:none`）+ C2（4 面透明化）+ C4（资源解析：本地文件 → `data:`/`blob:`；远程 → 直链；大文件 → 自建路由 + Range）。
- 必须字段：`poster`（视频首帧）、`maxBytes`（包体/内存门禁）、`scrim`（可读性兜底）。
- 依据：宿主无静态目录、无 CSP；4 面透明化清单见 `v3-capability-matrix.md` §2.4。

**P0-4 `typography` 扩展：行距、字距、字重、per-role、CJK**

```jsonc
"typography": {
  "mode": "sans", "size": 14, "fontKey": "inter",
  "scale": { "h1": 24, "h2": 20, "h3": 16, "body": 14, "small": 12, "code": 12 },
  "lineHeight": { "body": 1.6, "heading": 1.3, "code": 1.5 },
  "letterSpacing": { "body": "0.01em", "heading": "-0.01em" },
  "weight": { "body": 400, "strong": 600, "heading": 600 },
  "features": { "liga": true, "calt": true },
  "families": { "text": "…", "code": "…", "terminal": "…" },
  "fonts": [ { "family": "Inter", "src": "inter-400.woff2", "weight": 400,
               "unicodeRange": "U+0000-00FF" } ]
}
```

- 通道：`scale`/`lineHeight` → C2（B1，必须逐组件覆盖并抢回 45 处 inline `calc`）；`letterSpacing`/`weight`/`features` → C2（B0/B1，宿主几乎无占用，冲突面小）；`fonts` → C5（B2）。
- 为什么 P0：用户 24 条第 2/5/6 条全压在这里；且宿主「只有一条轴」的现实决定了**不改引擎就永远做不出真正的行距**。

**P0-5 `schema` 版本与未知字段保留**

```jsonc
"schema": 3,
"$compat": { "minEngine": "3.0.0", "unknownFields": "preserve" }
```

- 语义：读旧 JSON 时按版本升级；写回时保留不认识的字段（避免用户在新旧版之间丢配置）。
- 依据：24 条第 7–8 条已列为 ✅，但这是 P0 的**隐式前提**——没有版本位，后面 4 个 P0 字段一改就破坏存量 37 款主题（24 条第 23 条）。

### 4.2 P1（决定「像不像高端主题」）

**P1-6 `material`**

```jsonc
"material": {
  "menu":  { "fill": "#00000066", "blur": "40px", "saturate": 1.5 },
  "panel": { "fill": "#00000033", "blur": "24px" },
  "mask":  { "tint": "#00000044", "blur": "12px" }
}
```

- 通道：`menu` → C1 两 token（B0）；`panel`/`mask` → C2（B1，逐面选择器 + 0-1-2 覆盖 darwin 的 `--dsw-specific-menu`）。
- 依据：`design-platform.css:403/407`；`gradient-shadow-text.css:19-20`。

**P1-7 `effects`**

```jsonc
"effects": {
  "shadow": { "lv1": "…", "lv2": "…", "lv3": "…" },
  "elevation": { "stroke": "#0000001a", "panel": "…", "prominent": "…", "soft": "…" },
  "glow": { "color": "#7cc7ff", "radius": "24px", "targets": ["h1", "codeBlock"] },
  "textGradient": { "from": "#8bd4ff", "to": "#ffa9d4", "angle": 90,
                    "targets": ["markdownHeading", "strong"] }
}
```

- 通道：`shadow` → C1（B0）；`elevation` → **C2 `body *{}` 后序**（B1，必须用选择器，不能用 token）；`glow`/`textGradient` → C2（B1，`background-clip:text` + `-webkit-text-fill-color: transparent`）。
- 依据：`gradient-shadow-text.css:31-40` 的逐元素重声明；宿主 `text-shadow`/`background-clip:text` 均为 0（计数）。

**P1-8 `motion`**

```jsonc
"motion": {
  "duration": { "fast": "100ms", "base": "200ms", "slow": "300ms" },
  "easing": { "standard": "cubic-bezier(0.4,0,0.2,1)", "enter": "…", "exit": "…" },
  "presets": { "hover": { "scale": 1.02, "shadow": "lv1" }, "press": { "scale": 0.98 } },
  "ambient": [ { "kind": "float", "targets": ["sidebar"], "duration": "8s" } ],
  "reducedMotion": "clamp"
}
```

- 通道：`duration`/`easing` → C1（`--ds-*`，B0）；`presets` → C2（B1，状态选择器内允许 `!important`，沿用 `ui-fx.ts` 纪律）；`ambient` → C2+C3（B2）。
- 纪律：`reducedMotion` 默认 `clamp`，不可关闭；`ambient` 最多 1 层（推断：两层以上必然触发重绘抖动）。

**P1-9 `regions`**

```jsonc
"regions": {
  "codeBlock": { "background": "#0d1117", "bannerHeight": 28, "bannerSize": 11,
                 "lineNumber": "#6e7681", "radius": "md" },
  "scrollbar": { "width": "10px", "thumb": "#ffffff33", "thumbHover": "#ffffff55" },
  "markdown":  { "blockquoteRule": "3px", "hrStyle": "dashed" },
  "diff":      { "hunkHeader": "#…", "addedBg": "#…" }
}
```

- 通道：C2（B1）；代码块底色需 `!important` 对抗 `CodeBlock.module.css:94`；滚动条需逐元素重绑。
- 依据：`.md-code-block` 稳定钩子；`--dsh-scrollbar-thumb` 约 15 处重绑。

### 4.3 P2（差异化，但可延后）

**P2-10 `decorations`**：`[{ target, when, pseudo, css }]`，受控子集（只允许 `background-image/mask/opacity/filter` 五个属性），白名单选择器，禁 `content:` 之外的文本注入。
**P2-11 `density`**：`{ scale: 1, targets: ["message","tool","listRow"] }`，只作用 3 类目标，禁止全局 `zoom`。
**P2-12 `icons`**：`{ map: { "toolRead": "read.svg", … } }`，只覆盖工具类目，走 `mask-image` + `currentColor`，不内联 SVG。
**P2-13 `css` 逃生舱**：`"css": "…"` 原样追加到主题 `<style>` 末尾，**仅用户 JSON 允许、预置主题禁止**，需在编辑器里显示「此段不被引擎保证」的警告。这是把「100% 还原」从 13 家族推广到任意主题的最后一道兜底，但它把「可还原性」责任转移给用户，因此不能算进 P0 承诺。

---

## §5 不可达 / 不做清单

### 5.1 C-struct（结构性，需改宿主源码）

| 项 | 理由 | 证据 |
|---|---|---|
| 自定义前端路由 / 新页面 | 前端只服务 `client.<hash>.js`，未知路径 404 | `frontend-static/src/index.ts:88-99` |
| 新 `ctx.remote` 命名空间 | 宿主未暴露 | `v3-capability-matrix.md` §1 T4 |
| 改宿主组件结构 / 设置 schema | 属 fork | 同上 |
| 在代码块工具栏加按钮 | 需宿主渲染逻辑 | 同上 |
| 每日脚本 / 一人一票 / 全局排序（24 条第 20 条） | 无后端；只能本地存储 | 同上 |

### 5.2 C-hook（规则可达但 DOM 无钩子）

| 项 | 理由 |
|---|---|
| 侧栏会话行逐行背景 | `ui-sidebar/src` 零 `data-*`，只能按 `:nth-child` 猜（脆弱，违反「升级不炸」） |
| 逐消息气泡独立背景 | `ui-chat` 不在平台单例表，节点无稳定身份；`:nth-child` 在流式渲染下漂移 |
| 终端区域配色 | xterm canvas/渲染层不接受 CSS token，字号字族走 JS |

### 5.3 C-token（token 层不可达，规则层可达）

| token | 机制 | 走哪条路 |
|---|---|---|
| `--dsw-elevation-*` | `body, body *` 逐元素重声明 | 必须 C2 写 `body *{}` 后序 |
| `--dsh-scrollbar-thumb` | 约 15 处组件重绑 | 逐元素/specificity 覆盖 |
| `--shiki-foreground/background` | `:root` 引用 body 级 alias，计算期无效，被 `CodeBlock.module.css:92-94` 的 `!important` 兜住 | 改 shiki 色需 `!important` |
| `--dsw-elevation-stroke-color` | ≥10 组件重绑 | 只能改各重绑点的 color-mix 输入 |

### 5.4 不做（主动排除，非技术限制）

1. **BGM/声音**：13/13 无通道；体积、自动播放策略、非外观。
2. **iframe 复用整页做预览保真**：无路由、未知路径 404、第二实例含 WS。
3. **随包 CJK 字体**：体积不可接受；只做「用户提供 + 子集化 + `unicode-range`」。
4. **全局 `zoom`/`transform: scale` 做密度**：破坏 fixed 定位与命中测试。
5. **自由 CSS 进预置主题**：破坏「升级不炸」与可审计性；只留用户侧 P2 逃生舱。

### 5.5 「100% 还原」的诚实表述（建议写进 README / 编辑器说明）

> 在 V3 schema 覆盖的 13 个效果家族内，任意主题都能用 JSON 100% 还原；家族外的效果可用 `css` 段兜底（用户自担，不随宿主升级保证）；宿主结构级、DOM 钩子缺失级、优先级墙三类效果无法在不修改宿主源码的前提下实现。

---

## §6 与用户 24 条升级计划的对应关系

| # | 计划 | 状态 | 归属 | 依赖扩展点 |
|---|---|---|---|---|
| 1 | 37 参数 → 全量 token | 🟡 可做 | 本插件 | **P0-1** |
| 2 | 颜色/字体/字号/行间距全量 | 🟡（行间距缺轴） | 本插件 | P0-1 + P0-4 |
| 3 | 玻璃状态 | 🟡（遮罩玻璃不稳） | 本插件 | P1-6 |
| 4 | 区域背景（静图/动图/视频） | 🟡（侧栏逐行不可行） | 本插件 | **P0-3** |
| 5 | 多内容类型 / 多语言文字 | 🟡（CJK 需资源方案） | 本插件 | P0-4 |
| 6 | 行间距 | 🔴（宿主无独立轴） | 本插件 | **P0-4** |
| 7 | JSON schema 版本区分 | ✅ | 本插件 | **P0-5** |
| 8 | 兼容老 JSON | ✅ | 本插件 | P0-5 |
| 9 | 预置/用户主题目录 | ✅ | 本插件 | — |
| 10 | 资源与主题同目录 | ✅（T2 `node:fs`） | 本插件 | P0-3（assets.root） |
| 11 | 几乎一致的预览区 | 🟡 | 本插件 | P1-9（区域渲染）+ 真实 DOM |
| 12 | AI 创作 prompt | ✅ | 本插件 | 依赖 schema 表达能力（1–6 落地后 prompt 才有意义） |
| 13 | 复制/二次创作 | ✅ | 本插件 | — |
| 14 | 二次创作工作流 | ✅ | 本插件 | — |
| 15 | 提交线上（fork+PR） | ✅ | **本插件之外**（GitHub） | — |
| 16 | 老编辑器改造 | ✅ | 本插件（UI） | — |
| 17 | AI 创作提示 | ✅ | 本插件（UI） | — |
| 18 | 胶囊一键删除 + popconfirm | ✅ | 本插件（UI） | — |
| 19 | 点赞 + 生成 issue 模板 | 🟡（无后端，只能预填 URL） | 本插件 + GitHub | — |
| 20 | 每日脚本 / 一人一票 / 排序 | 🔴 | **本插件之外**（需服务端） | C-struct |
| 21 | 按颜色组合分类 + 点赞排序 | 🟡（分类本地、排序需服务端） | 混合 | — |
| 22 | 提交者小气泡特效 | ✅（`ui-fx.ts` 先例） | 本插件 | P1-8（可选） |
| 23 | 现有 37 款主题升级 | ✅ | 本插件 | P0-1 + P0-5 |
| 24 | 所有可点击控件交互效果 | ✅（`ui-fx.ts` 先例） | 本插件 | P1-8 + P1-7 |

统计：**8 条直接依赖扩展点**（1/2/4/5/6/7/11 + 23 的兼容前提），**3 条属本插件之外**（15/20 部分、21 的排序），**其余为 UI/流程**。

两条对计划的修正建议（推断）：

- 第 2 条「行间距全量」与第 6 条应合并为一项 P0-4 交付，否则会两次返工。
- 第 20 条的「排序」与第 21 条的「点赞排序」在无后端前提下只能做**本地排序 + 静态榜单**，建议显式降级为「按内置权重排序」，避免承诺落空。

---

## §7 市面对标：四类生态的表达力上限

### 7.1 横向对照表

| 能力 | VSCode 主题 | Chrome 主题 | Windows Terminal | DSH 13 仓 | **本插件 V3 目标** |
|---|---|---|---|---|---|
| 颜色 | ✅ color-id 表（含 alpha） | ✅ colors + tints | ✅ 20 字段 | ✅ 13/13 | ✅ 37 槽 + 任意 token |
| 材质/玻璃 | ❌ | ❌ | ❌ | ✅ 3/13 | ✅ |
| 排印 | ❌（仅 token 的 fontStyle） | ❌ | ❌ | ✅ 2/13 | ✅ |
| 背景媒体 | ❌（图片仅限 NTP/窗体图） | ✅ images（限于 chrome 皮肤） | ✅ 仅背景色 | ✅ 3–4/13 | ✅ |
| 圆角/边框宽度 | ❌ | ❌ | ❌ | ✅ 2/13 | ✅ |
| 阴影/发光 | ❌（仅 `widget.shadow` 色） | ❌ | ❌ | ✅ 1–2/13 | ✅ |
| 动效 | ❌ | ❌ | ❌ | ✅ 2/13 | ✅ |
| 布局/密度 | ❌（`window.zoomLevel` 非主题） | ❌ | ❌ | ❌ 0/13 | 🟡 受控 3 目标 |
| 图标 | 独立贡献点（file/product icon theme） | ❌ | ❌ | ❌ 0/13 | 🟡 工具类目 |
| 内容层 | ✅ 仅颜色 | ❌ | ❌ | ✅ 1/13 | ✅ |
| 声音 | ❌ | ❌ | ❌ | ❌ 0/13 | ❌ 不做 |

结论（推断）：**成熟生态（VSCode/Chrome/WT）的主题格式一律是「颜色 + 少量资源」，没有一家把排印、圆角、动效做进主题 JSON。** 所以「市面主题插件的上限」在浏览器/编辑器语境里其实是**下限**；DSH 生态因为允许 in-process 注入，天花板高出一个数量级。对标应当以「宿主表面」为准（§1.3 通道 × 宿主消费面），而不是以任何一款现成插件为准。

### 7.2 证据（可点链接）

- VSCode：[Theme Color](https://code.visualstudio.com/api/references/theme-color)（color-id 全表，颜色支持 alpha，`contrastBorder`/`widget.shadow` 是唯一的「非纯色」入口）；[Color Theme 指南](https://code.visualstudio.com/api/extension-guides/color-theme)（token 颜色仅允许 `fontStyle`：italic/bold/underline/strikethrough）；图标为独立贡献点：[File Icon Theme](https://code.visualstudio.com/api/extension-guides/file-icon-theme)、[Product Icon Theme](https://code.visualstudio.com/api/extension-guides/product-icon-theme)。
- Chrome：[What are themes?](https://developer.chrome.com/docs/extensions/develop/ui/themes)（主题是特殊扩展，不含 JS/HTML；manifest `theme` 只有 `images`/`colors`/`tints`/`properties` 四组，无 CSS 注入能力）。
- Windows Terminal：[Color schemes](https://learn.microsoft.com/en-us/windows/terminal/customize-settings/color-schemes)（`name` 必填 + 16 个 ANSI 色 + `foreground`/`background`/`cursorColor`/`selectionBackground`，**无字体、无图片、无效果**）。
- DSH 生态：本仓既有 5 份调查（`theme-13-synthesis-100.md`、`skin-5-repos-99.md`、`wallpaper-dynamic-background-103.md`、`color-appearance-catppuccin-claude-ui-102.md`、`special-integration-maid-beautiCode-101.md`）。
- 宿主表面：`v3-capability-matrix.md` §2.1–§2.4（token / 排印 / DOM / 媒体四域）+ 本次在 `D:\Temp\dsh-src` @ `687f282` 的计数。

### 7.3 可直接复用的外部先例（不必重查）

| 需求 | 抄谁 | 抄什么 |
|---|---|---|
| 页面级背景挂载 | 13 仓的 `page-fixed` 三仓 + ui-appearance | `body` 下 `z-index:-1` + `pointer-events:none` + 4 面透明化 + 三层（canvas/图片/scrim） |
| 媒体服务 | beautiCode / engine | Range + HEAD + ETag + poster-first；2GB 上限先例 |
| 玻璃 | open-sea / bloom | 九 token 玻璃配方 + `::before` backdrop-filter |
| 排印全栈 | claude-style | `@font-face` 7 组 + scoped 根属性 + 壁纸让位 |
| 卸载还原 | maid / ui-appearance | disposer 按表还原 + 可验证的节点清理 |
| 按模型/内容切换外观 | background-by-model | 有序子串首命中 + fallback + `advanceOnSwitch` |

---

## §8 未决问题

1. **遮罩玻璃是否真的可做**：`--dsw-mask-blur: none` 可覆盖，但宿主是否有消费方（`--dsw-alias-bg-mask-*` 是纯色）未实测。需要一次 headless 截图对比（改 mask-blur 12px 前后像素差异）。→ 影响 P1-6 的 `material.mask` 是否要标 B1/C。
2. **行距覆盖的可维护性**：45 处组件 inline `calc` + 421 处 `line-height:Npx`，全量覆盖会不会在宿主小版本升级时大面积错位？需要一次「只改 14 个 Markdown 角色行距」的最小实现 + 3 个版本的回归。
3. **背景媒体的体积门禁**：`maxBytes` 定多少？engine 的 2GB 是服务端上限，用户 JSON 里 base64 会直接撑爆编辑器；倾向「JSON 只存相对路径，资源走 assets 目录 + data/blob 运行时转换」，需与 24 条第 10 条（资源同目录）对齐。
4. **CJK 字体方案**：完全不给 / 只给子集化提示 / 允许用户放字体文件并自动 `unicode-range` 切分。三种选择的体积与体验差异大，需产品拍板。
5. **`tokens` 直通的危险面**：`--dsw-static-*`（77 个原子）与 `--dsw-elevation-stroke-color`（≥10 重绑）是否要在 schema 里**硬禁**？硬禁＝安全但少能力；不禁＝自由但易做出不可读主题。倾向：编辑器分组 + 危险名警告 + 对比度审计，不硬禁。
6. **验收口径的自动化**：§1.5 的 6 探针 × 4 验收能否做成 `npm run verify:themes`（headless 截图 + 像素 diff + 卸载后 DOM 断言）？这是把「上限」从口头承诺变成 CI 门禁的唯一方式，但会引入 Playwright 依赖（与「零依赖内联」构建纪律冲突，需评估）。
7. **P2-13 `css` 逃生舱的审计责任**：用户写坏 CSS 导致界面崩，责任与回滚路径（一键清除 `css` 段）必须在编辑器里显式呈现。
8. **宿主 token 改名风险**：403 个名字是 v0.2.1-rc.2 事实；V3 的探针降级策略（缺名即跳过、不报错）需要一份「名字 → 是否必需」的分级表。

---

## §9 证据索引

### 9.1 宿主源码（`D:\Temp\dsh-src` @ `687f282`）

| 事实 | 位置 |
|---|---|
| token 6 sheet（base 1933B / corner-shape 1135B / design-platform 23492B / focus 1018B / gradient-shadow-text 15273B / shiki 1181B） | `packages/client/ui-theme/src/styles/` |
| radius 6 token / motion 4 token 仅在 `:root` 声明，无组件重绑 | `ui-theme/src/styles/base.css:14-23` |
| `--dsw-corner-shape` 由 `*` 消费，`@supports` 守卫 | `ui-theme/src/styles/corner-shape.css:16-25` |
| shadow 4 件 + `--dsw-mask-blur: none` + 菜单 blur 40px | `ui-theme/src/styles/gradient-shadow-text.css:5-20` |
| elevation 被 `body, body *` 逐元素重声明 | `ui-theme/src/styles/gradient-shadow-text.css:31-40` |
| darwin 把 `--dsw-specific-menu` 钉 94% | `ui-theme/src/styles/design-platform.css:403/407` |
| `overrideTokens` 形状校验（不校验名字/值语义） | `ui-theme/src/client/index.ts:369-378, 466-486` |
| 合成规则：seq 排序、后层胜、按 active colorScheme 取值 | `ui-theme/src/client/index.ts:405-414` |
| 主题快照写 body 行内 | `ui-layout/src/theme-presenter.ts:87-90` |
| 槽位 `shell.overlay`/`main`/`sidebar`/`rightbar` | `ui-layout/src/AppFrame.tsx:258-307` |
| `body > :not(#root)` 自动 no-drag | `packages/client/web/src/base.css:69-71` |
| 无静态目录（只有 `client.<hash>.js` 可服务；未知路径 404） | `client/modules/index.ts:193`、`frontend-static/src/index.ts:88-99` |
| 平台单例表 11 项（含 `ui-primitives`，不含 `ui-chat`） | `packages/client/web/src/platform.ts:8-15` |
| 代码块底色 `!important` | `ui-primitives/src/markdown/CodeBlock.module.css:92-94` |
| 行内码 `0.875em !important` | `ui-primitives/src/markdown/MarkdownText.module.css:169` |
| 代码块 banner 写死 11px/18px | `ui-primitives/src/markdown/CodeBlock.module.css:47-49` |
| 终端字族/字号走 JS（xterm） | `ui-sidebar-terminal/src/client/terminal.tsx:85-93` |
| 默认 outline 被关掉 | `ui-theme/src/styles/base.css:36-38` |
| 焦点环 token + 指针模态强制透明 | `ui-theme/src/styles/focus.css:3, 11-25` |

### 9.2 计数（本次会话在 `D:\Temp\dsh-src\packages` 下）

| 指标 | 值 |
|---|---|
| CSS 文件数 | 212 |
| `var(--dsw-radius-` 引用 | 316（+6 声明 = 322 总出现） |
| `border-radius:` 总计 / 其中 var / 其中硬编码数字 | 471 / 307 / 142 |
| `var(--ds-ease-in-out` / `var(--ds-transition-duration` | 43 / 10 |
| `var(--dsw-elevation-` / `var(--dsw-shadow-lv` | 37 / 3 |
| `backdrop-filter` / `@keyframes` / `prefers-reduced-motion` | 32 / 43 / 52 |
| `text-shadow` / `background-clip: text` / `filter: drop-shadow` | 0 / 0 / 0 |
| `font-variation-settings` \| `font-feature-settings` | 0 |
| `letter-spacing` | 12 |
| `!important` 全仓 | 约 20（19 行，集中在 Markdown/CodeBlock/TrajectoryTable/terminal） |
| `@layer` | 0 |
| `@font-face` | 3 |
| `::_scrollbar` 规则（`scrollbar-width` + `::-webkit-scrollbar`） | 58 |
| `*.svg` 资源 | 10 |

### 9.3 本仓证据

| 事实 | 位置 |
|---|---|
| V2 schema 只有色槽 + `{mode,size,fontKey}` | `src/engine/index.ts`、`runtime/custom-store.ts`（`CustomTheme` 类型） |
| 37 槽 → 约 62 token + 约 40 derived + 10 shiki | `src/engine/map-dsh.ts` |
| 8 条元素规则（h1–h6/a/code/em/strong/blockquote/hr） | `src/engine/map-dsh.ts`（`CSS_RULES`） |
| 排印只发射一条轴 | `src/engine/generate.ts`（`buildTypographyCss`） |
| 主题 `<style>` 单标签 + `data-plugin` 认领 | `runtime/client.ts:739-743` |
| 装饰性 CSS + 钩子属性 + reduced-motion 降级先例 | `runtime/ui-fx.ts` |
| 自建路由先例（`fetchRegistry.register`） | `runtime/host.ts:510` |
| 随包 15 个 latin-subset woff2（5 族 × 3 字重） | `src/fonts/` |
| 既有 V3 能力矩阵与 24 条映射 | `docs/research/v3-capability-matrix.md` §1–§4 |
| 13 仓横向事实 | `docs/research/theme-13-synthesis-100.md` |
| 背景三仓对照 | `docs/research/wallpaper-dynamic-background-103.md` |
| 5 仓整包皮肤 | `docs/research/skin-5-repos-99.md` |
| 配色/外观三仓 | `docs/research/color-appearance-catppuccin-claude-ui-102.md` |
| 深度集成两仓 | `docs/research/special-integration-maid-beautiCode-101.md` |

---

## 附：本票的一句话交付

> 「上限」= 5 条通道 × 13 个效果家族的交集减去三道墙；V3 要补的不是更多颜色，而是 **token 直通 + 形状 + 背景 + 排印轴 + schema 版本** 这 5 个 P0 字段；补完之前，「任意主题 100% 还原」不成立。
