# 主题插件的绝对能力上限：DSH 宿主上的 EC 与它的边界

> 证据基线：`D:\Temp\dsh-src` @ `687f282`（v0.2.1-rc.2），只读源码与文档，未安装、未运行、未改宿主。
> 除标注「推断」外，本文每条都是源码、文档或既有笔记里的事实。既有笔记只引「路径 §节 + 一句话」，不重复其市面对标内容。
> 本文只回答「上限是什么、边界在哪」，不写实现方案。

---

## §0 一页结论

**① 能力上限的一句话定义。**
在同宿主（同一 DSH 构建、同一页面）、不改宿主源码、只走插件公开接口、且必须通过四道验收（重渲染 / 主题切换 / 卸载还原 / 上游升级）的前提下，主题插件的绝对能力上限是：

> **对同一 document 的 DOM、CSSOM、媒体资源、字体四类渲染输入的全集写入权。**

操作上分成 5 条通道（token 层、样式表层、DOM 层、资源层、字体层）。形式化沿用 [theme-ceiling-benchmark-151.md](./theme-ceiling-benchmark-151.md) §1.1：

```
EC_abs = ⋃_{c ∈ {C1..C5}} ( Expressible(c) ∩ Survivable(c) )
```

一句话：**能改的是「页面已经要画的东西怎么画」，不能改的是「页面画什么、由谁画、画在哪个窗口」。**

**② 穷尽性论证 3 步。**
1. 屏幕上的每个像素，只由四类输入决定：DOM 结构（布局树）、CSSOM（计算样式）、解码后的媒体（图片/视频/canvas 位图）、字体光栅（字形）。
2. JavaScript 没有沙箱，但 JS 本身不是第五类输入，它只能**修改上面四类**：改 DOM、改 CSSOM、加载资源、注册字体。CSS Houdini、canvas、WebGL、SVG filter 也都落在「CSS 或 DOM」里，不构成新输入。
3. 要产生第五类效果，只有两条路：改渲染器/宿主前端源码，或改 OS 窗口合成器。前者被「不改宿主」前提排除，后者在页面之外、插件不可达。故无第六通道。

**③ 「无人可超越」的严格适用条件。**
- 同一宿主构建（允许版本漂移，但必须是官方产物，不是 fork）。
- 不改宿主源码、不分发宿主补丁、不 fork 前端。
- 只用公开插件接口：Host 侧 `ctx` API，客户端侧 bundle 的 DOM/CSS 能力；不 monkeypatch 宿主内部模块、原型或私有单例。
- 目标仍是**外观语义**（像素、样式、素材），不是功能、数据或安全能力。
- 产物要过四道验收；过不了的表达不计入 EC。
- 补充：这里有两个「绝对」。**绝对-1** 是宿主进程权限（全信任 Node 代码，可读写文件、起进程、碰 Electron），它没有上限、等于宿主本身；**绝对-2** 是「插件身份内的外观上限」，即本文的 EC。用户问的是后者；把前者当答案，问题就退化成「宿主能做什么」。

**④ 我们能 / 我们不能。**
能：
1. 颜色面：184 个 live 色名全可填，且 `overrideTokens` 名字零校验，任意 `--*` 都能写（`packages/client/ui-theme/src/client/index.ts:466-486`）。
2. 样式面：主 UI 在同一 document、无 shadow root、无 CSP，任意选择器、`::selection`、`::-webkit-scrollbar`、`@keyframes`、`@font-face` 都可注入。
3. 资源与字体：无 CSP，`http(s):`、`data:`、`blob:` 图片/视频/字体都可用；随包已有 15 个 latin 子集 woff2。
不能：
1. 改 DOM 结构与组件语义：React 组件树私有，无通用插入/替换 hook；侧栏会话行没有 `data-*`，逐行地址不存在。
2. 打穿封闭 shadow 与跨源 iframe：强制更新遮罩是 closed shadow + `dsh-app://` iframe；浏览器侧栏是任意目标 URL 的 iframe。
3. 改原生窗口 chrome、OS 外观、终端字形：标题栏由 `titleBarOverlay` 固定；终端字号只吃 JS 选项（xterm），CSS token 零消费。

**⑤ 最容易误读的 3 句话。**
- 「有 token 就能全改」——token 只是 C1；`--dsw-elevation-*` 在 `body, body *` 上逐元素重声明，`:root` 写不进去；`--dsw-mask-blur` 宿主默认 `none`；149/150 个排印 longhand 是死名。
- 「没沙箱 = 什么都能做」——没沙箱只扩大 JS 能做的事，不增加渲染输入；改 DOM 会被 React 重渲染抹掉，改宿主文件则已越出插件身份。
- 「13 款都没做到 = 宿主做不到」——13 款是市场采样，不是能力证明；真正的天花板由宿主暴露的表面决定（benchmark §0 第 1 条）。

---

## §1 通道穷尽性证明

### 1.1 像素输出的四类输入

浏览器把 web 内容画到屏幕上，输入只有：

| 输入 | 具体形态 | 谁在写 |
|---|---|---|
| DOM 结构 | 元素树、属性、文本节点、伪元素 | HTML 解析、React、插件 JS |
| CSSOM | 规则表、内联 style、自定义属性、`@keyframes`、`@media` 等 at-rule（`@font-face` 归字体行） | `<style>`、`adoptedStyleSheets`、`el.style` |
| 媒体资源 | `<img>`/`<video>`/`<canvas>` 解码后的位图、`background-image` | 网络、`data:`/`blob:`、canvas 绘制 |
| 字体 | 字形轮廓与度量 | `@font-face`、系统字体 |

### 1.2 为什么是 5 条通道而不是 6 条

C1（token）与 C2（样式表）都是 **CSSOM 的两个写入口**：

- C1 写的是「自定义属性的值」，只有宿主 sheet 里有消费方时才产生像素；官方通道，语义窄。
- C2 写的是「规则/内联声明」，凡选择器能命中的元素都产生像素；非官方通道，表达力宽。

把 C1 单列，是因为它有独立契约（`{light,dark}` 成对、宿主 token 名、四道验收的语义），不是因为它是第五类渲染输入。C3（DOM）、C4（资源）、C5（字体）分别对应上表其余三行。**五通道的并集 = 四类输入的并集**，没有剩余。

反例逐一归位：
- **canvas / WebGL / Houdini paint worklet**：都需要一个 DOM 元素承载，且像素仍由 CSS/DOM 触发绘制 → C2/C3。
- **slot 挂载（`shell.overlay` / `settings.section`）**：只决定「你的 DOM 挂到哪个席位」，挂上去之后仍走 C2/C3。
- **Host 侧 Node 能力（fs/net/child_process）**：要影响页面，只能改写响应字节（C4/C2）或经客户端通道；它扩大的是「能拿到什么素材」，不是「能多画一类东西」。
- **Service Worker / 请求拦截（推断，未实机）**：能改写 HTML/CSS 字节，但送进渲染器的仍是 DOM/CSS/媒体/字体，未跳出四类；且在 `dsh-app://` 下是否可用未确证。

### 1.3 每通道的最大表达面与存活率

存活率按四道验收数（重渲染 / 主题切换 / 卸载还原 / 上游升级），4/4 为满。

| 通道 | 最大表达面 | 四道验收 | 备注 |
|---|---|---|---|
| C1 token | 宿主 184 个 live 色名 + 任意名字（含非 `--` 名，代码路径允许） | 重渲染 4/4、切换 4/4（宿主接管）、卸载 4/4（disposer）、升级 2/4（改名即失效） | 语义窄：无消费方写了也没用；`body` 内联值与宿主互相覆盖 |
| C2 样式表 | 全页任意选择器、状态伪类、`::selection`、`::-webkit-scrollbar`、`@keyframes`、内联 style | 重渲染 4/4、切换 4/4、卸载 4/4（自己删 `<style>`）、升级 2/4（哈希类名与结构会变） | 表达力最宽；稳定钩子只有 `[data-*]`、`[role=*]`、`.md-code-block` 等 |
| C3 DOM | 同 document 内任意增删改、覆盖层、装饰节点 | 重渲染 1/4（React 重渲染抹掉）、切换 3/4、卸载 4/4（需自管）、升级 2/4 | 能改结构但不稳定；等于把 C3 用到极限 |
| C4 资源 | 任意图片/视频/音频/纹理，`http(s)`/`data:`/`blob:` | 重渲染 4/4、切换 4/4、卸载 4/4（节点删即回收）、升级 4/4 | 受体积、解码、自动播放策略约束 |
| C5 字体 | 任意 `@font-face`、字族/字重/字距/`unicode-range` | 重渲染 4/4、切换 4/4、卸载 4/4、升级 4/4 | CJK 体积大；终端字形不走 CSS |

**关键判断**：存活率不是「能力」的附属品，而是 EC 的定义项。一个 100% 可表达但升级即碎的通道，贡献为 0；这也是 C3 只能算「可达但低存活」的原因。

### 1.4 宿主实际给的「稳定钩子」比想象少

稳定钩子集合（benchmark §2.4 已清点）：`[data-slot]`、`[data-shell-*]`、`[data-conversation-region|session|content]`、`[data-composer-seat]`、`[data-chat-flow-kind|node-key|turn]`、`[data-tool…]`、`[data-diff|read|search|terminal]`、`.md-code-block`、`[role=menu|dialog|tooltip]`、`[data-menu-material]`。CSS Modules 哈希类不可依赖。**C2 的上限不是「CSS 有多强」，而是「宿主留了多少稳定名字」。**

---

## §2 不可达清单（硬墙）

### 2.1 宿主结构级（真硬墙）

- **封闭 shadow root**：强制更新遮罩用 `host.attachShadow({ mode: 'closed' })`，内部是 `dsh-app://shell/mandatory-update.html` iframe（`apps/desktop/src/preload-mandatory-overlay.ts:29-36`）。document CSS 选择器进不去，token 也过不了 iframe 边界。
- **跨源 iframe**：浏览器侧栏的 iframe 指向任意目标 URL，sandbox 为 `allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox`（`packages/client/ui-sidebar-browser/src/client/view/IframePresentation.ts:7`），宿主只能观察 load/fail，不能注入样式（同文件 `:15-20`）。
- **文档预览 iframe**：`sandbox="allow-scripts"` 的 `srcDoc`（`packages/client/ui-sidebar-documentpreview/src/client/html/HtmlBody.tsx:68`）与 `sandbox=""` 的静态预览（同文件 `:102`），均为不透明源，主题 CSS 不可达。
- **原生标题栏**：桌面窗口 `titleBarStyle: 'hidden'` + `titleBarOverlay`（颜色、高度、symbol 色由 shell 决定，`apps/desktop/src/main.ts:216-223`）；macOS 用 `hiddenInset`。它不在 DOM 里。
- **Windows 标题栏菜单**：preload 注入，挂在 `attachShadow({ mode: 'open' })` 里（`apps/desktop/src/preload-menu.ts:13`）；选择器进不去，但 `:host` 内用宿主 token（`:16-26`），所以 token 通道可影响它，C2 不行。

反证：主 UI 本身**没有** shadow root。全仓 `attachShadow` 只命中上述两处 preload、测试，以及 `packages/client/shortcuts/src/client/native.ts:21-22` 读取 `shadowRoot.activeElement`。主 React 树直接挂在 `#root`（`apps/web/src/main.ts:17-20`），文档只有 15 行且无 CSP（`apps/web/index.html:1-15`）。**对主 UI 而言，CSS 是全域可达的；墙只在遮罩、侧栏 iframe、原生 chrome 三处。**

### 2.2 钩子缺失级（真硬墙）

- **终端字号/字族只走 JS**：`--dsh-terminal-font-size` 名义是 token，但 CSS 零消费；xterm 从选项读（`packages/client/ui-sidebar-terminal/src/client/terminal.tsx:85-93`，转引 `v3-capability-matrix.md` §2.3）。C1/C2/C5 都改不动 canvas/DOM 渲染器里的字号。
- **组件级插入/替换**：客户端 `ctx` 没有 router/modal/http/fs（`dsh-source-plugin-capability-surface.md` §2）；平台单例表 11 项含 `ui-primitives`，不含 `ui-chat`/`ui-conversation`（`v3-capability-matrix.md` §2.4）。只能挂宿主声明的 slot，不能替换宿主组件。
- **逐行地址缺失**：`packages/client/ui-sidebar/src` 零 `data-*`（benchmark §1.2/§2.4），「按会话行上背景」没有选择器入口；要做得走 C3 或宿主补 hook。
- **图标替换**：宿主图标是组件内 SVG，无统一 `data-icon`；C2 只能着色/遮罩，换路径需要 C-hook（benchmark F10 判 C-hook）。

### 2.3 优先级墙（半硬墙：可达但不稳定）

- **宿主把全部 token 写成 body 内联**：`theme-presenter.apply` 先写 `html` 的 `color-scheme`/主题源，再在 `body.style.setProperty` 上逐个写字号、字族、全部 token（`packages/client/ui-layout/src/client/theme-presenter.ts:69-90`）。内联声明胜过任何 `:root`/`html` 规则。
- **宿主自带 19 处 CSS `!important`**（5 个 CSS 文件；全仓 24 命中，其余在测试/工具字符串）。典型：代码块底色 `background: var(--dsl-code-block-background) !important`（`packages/client/ui-primitives/src/markdown/CodeBlock.module.css:94`）、行内码 `font-size: 0.875em !important`（`packages/client/ui-primitives/src/markdown/MarkdownText.module.css:169`，转引 benchmark §2.3）。
- **elevation 派生值逐元素重声明**：`body, body * { --dsw-elevation-stroke/panel/prominent/soft: … }`（`packages/client/ui-theme/src/styles/gradient-shadow-text.css:31-40`），注释说明是为了让组件重绑描边色生效（`:27-30`）。因此在 `:root`/`html` 上写这些派生 token 会被 `body` 的重声明压掉，必须写到 `body` 或 `body *`（C2）。
- **焦点环在指针模态被强制透明**：`html[data-input-modality='pointer'] body :focus-visible:not(:read-write) { --dsw-focus-ring-color: transparent }`（`packages/client/ui-theme/src/styles/focus.css:18-20`），想「点按也显示环」必须打赢 0-3-2 特异性。
- **两难**：不用 `!important`，你的 `:root` 值被宿主 body 内联盖；用了 `!important` 写同名变量，就会长期压住用户设置，且宿主 `apply` 只移除自己 tracked 的名字（`packages/client/ui-layout/src/client/theme-presenter.ts:85-90`），换主题时可能被清掉。**不是不能，是不能又稳又不伤用户。**

### 2.4 原生窗口 chrome 与菜单

> 2026-10-20 复核修正：本节原先写「标题栏颜色固定、只能跟 light/dark 三档」，**错**。宿主有一条把页面颜色量出来回写标题栏的路径，因此标题栏底色/字色是**可达**的。

- **可达（例外）**：Windows 标题栏填充色与 symbol 色由宿主从页面里**量出来**——`apps/desktop/src/preload-windows.ts:21-23` 造一个探针元素，`background-color:var(--dsw-specific-sidebar-fill); color:var(--dsw-alias-label-primary)`；`:36-45` 用 `getComputedStyle` 取色后经 IPC 发给主进程；`apps/desktop/src/main.ts:1049-1059` 收到后调 `setTitleBarOverlay({color, symbolColor})`；`:47-50` 的 `MutationObserver` 监听 `body` 的 `style` 属性变化，所以我们注入 token 后标题栏**立即跟随**。
  - 推论 1：`--dsw-specific-sidebar-fill` 与 `--dsw-alias-label-primary` 这两个 token 能**任意**决定标题栏底色与字色（不受 light/dark 三档限制）。
  - 推论 2：把 `--dsw-specific-sidebar-fill` 设成**渐变**时，探针的 `background-color` 变成不合法值 → 计算为透明 → `setTitleBarOverlay` 收到 `rgba(0,0,0,0)` → overlay 透明，页面内容透出来。这就是生态里「渐变铺到标题栏」的机制（`renjie2026/dsh-theme-gallery` 的做法，采样笔记 §0-5）。
- **不可达**：标题栏高度（`WINDOWS_TITLEBAR_HEIGHT` 常量）、窗口控制按钮的位置与形状（OS 绘制）、macOS 顶部应用菜单（OS 原生 Menu，不在 DOM；推断：Electron 标准行为）。
- **只能跟随明暗三档的部分**：`nativeTheme.themeSource`（`apps/desktop/src/preload-theme.ts:7-24`、`main.ts:749-751`）。但因为上面那条「量取回写」路径不经过它，我们不需要它也能改标题栏色。

### 2.5 OS 级外观

系统强调色、字体平滑、窗口背板、overlay 滚动条的悬浮行为，都在页面合成器之外。`nativeTheme` 只暴露明暗三档；`titleBarOverlay` 的 symbol 色也只跟随明暗。插件改不了。

### 2.6 宿主未暴露的数据

主题能绑定的只有 DOM 上已渲染出来的东西。React state/props（当前模型、上下文用量、会话状态、路由参数）不在 DOM，也没有公开读取口（客户端 `ctx` 的 T1 能力表只到 DOM/CSS/slot，见 `dsh-source-plugin-capability-surface.md` §2）。因此「按状态换主题」「按模型换强调色」这类条件外观，只能靠宿主已有的 `data-*`，不能靠内部状态。

---

## §3 对手等价论证

### 3.1 同进程、同信任、同 API 面

- **Host 侧**：外部插件是 in-process Node 代码。安装期准入检查只有版本匹配（`engines.dsh`，或退而求其次的 `peerDependencies`），文档明说「These checks are not a sandbox against malicious package code.」（`packages/boot/app-boot/README.md:52`）；已安装的 Host 代码「executes in-process outside the workspace sandbox」（`packages/boot/plugin-manager/README.md:31`）。
- **客户端**：插件 bundle 是 same-origin classic script（`document.createElement('script')` + `src`，`packages/client/modules/src/client/system.ts:15-29`），执行后只在 `window.__ModuleLoader__` 注册 lazy-CJS factory，副作用（含 CSS 注入）在 factory 物化时发生（`packages/client/modules/src/client/manifest.ts:9-16`）。它和宿主 UI 同处一个页面、一个 document、一个 JS realm。
- **同一个 `ctx`**：token 是 `ctx.theme.overrideTokens` 同一层（`packages/client/ui-theme/src/client/index.ts:369-378`）；slot 是同一批宿主声明席位；没有「高级插件」专用通道。

### 3.2 形式化

对任意两个只使用公开接口的插件 P、Q，在同一宿主构建上：

```
Reach(P) ⊆ EC_abs，Reach(Q) ⊆ EC_abs
```

因为 EC_abs 已按「四类渲染输入」穷尽，而任何插件动作最终都只能改这四类。故不存在 P 使 `Reach(P) \ EC_abs ≠ ∅`。反过来，EC_abs 内任一元素都可以被某个插件实现（取并集的定义），所以**上限可达、但不必由我们全部达到**。

### 3.3 我们仍会被超过的三种情形

- **(a) 对手改宿主源码 / 分发宿主补丁 / fork 前端。** 这已经换了宿主，不是「同一宿主上的插件」；EC 随之变成新宿主的 EC。它不构成「插件能力超越」，只构成「换赛道」。
- **(b) 我们没有穷尽 EC。** 例如图标替换、布局密度、声音、光标选区、逐行背景——有些是 C-hook 真不可达，有些只是我们没做。对手把可达部分做全，就会在**覆盖面**上超过我们。
- **(c) 能力相等、完成度更高。** 同样的 EC，对手的稳定性（升级不炸）、预设质量、性能、AI 生成命中率更好，用户会认为它「更强」，但这是工程与内容，不是能力上限。

### 3.4 边界：恶意插件不是「主题能力」

全信任意味着对手能读密钥、写文件、起进程、碰 Electron。这些**确实**超过 EC，但它们不是外观能力，也不该拿来论证「主题插件更强」。本文的「无人可超越」只在外观语义内成立；一旦允许越界，唯一的上限是宿主进程权限，讨论对象就不再是主题插件。

---

## §4 EC 覆盖度自评矩阵

读法：**通道** = 宿主上能用的最大通道；**V2** = 当前已实现；**V3** = [benchmark §4](./theme-ceiling-benchmark-151.md) 的计划字段；**原因** = 未覆盖/不可达的理由。符号：✅ 覆盖、◐ 部分、❌ 未覆盖、⊘ 主动不做、⛔ 不可达。
**必须区分「能力可达」与「已实现」：下表「通道」列回答可达性，「V2」列回答已实现。**

| 效果家族 | 宿主通道（最大表达面） | V2 现在 | V3 计划 | 不覆盖原因 / 备注 |
|---|---|---|---|---|
| 颜色语义 | C1+C2，184 live 色名 + 任意名 | ✅ 37 槽 → 105 名（91 live）+ 40 派生 | ✅ P0-1 `tokens` 直通 | 尚有 93 个 live 名未写；死名 14 个 |
| 排印 | C2+C5，字号/字族/行高/字距/字重 | ◐ 仅 `mode/size/fontKey` 三参数 | ✅ P0-4 `typography` 扩展 | 宿主无全局行高轴；45 处 inline `calc` 需 C2 抢回；终端字号仍不可达 |
| 形状/圆角 | C1 六个 radius token + C2 | ❌ | ✅ P0-2 `shape` | 142 处硬编码半径需兜底 |
| 边框与描边 | C1+C2 | ◐ border 色 | ✅ `shape.border` + P1-7 elevation | elevation 派生值逐元素重声明，`:root` 写入无效 |
| 阴影/发光 | C1+C2 | ◐ lv1–lv3 色 | ✅ P1-7 `effects` | 宿主 `text-shadow`/`background-clip:text` 均为 0，冲突小 |
| 材质/玻璃 | C1+C2 | ❌ | ✅ P1-6 `material` | 遮罩默认 `--dsw-mask-blur: none`（`packages/client/ui-theme/src/styles/gradient-shadow-text.css:19`），做玻璃是主动分叉 |
| 背景媒体 | C3+C4+C2 | ❌ | ✅ P0-3 `background`+`assets` | 需 4 面透明化 + `body` 下 `z-index:-1`；无 CSP，`data:`/`blob:`/video 可行 |
| 动效/过渡 | C1+C2+C3 | ❌ | ✅ P1-8 `motion` | V2 无字段；`reducedMotion` 必须 clamp |
| hover/active 交互态 | C1+C2 | ◐ alias hover/active 色 | ✅ `effects`+`motion`（F12） | 几何反馈需状态选择器；指针模态焦点环被强制透明 |
| 图标 | C2 着色 / C-hook 替换 | ◐ 着色 | ◐ P2-12 `icons`（仅 mask-image 覆盖工具类目） | 任意图标替换无通用钩子，⛔ |
| 内容层（代码高亮、markdown） | C1+C2 | ◐ shiki 10 + markdown 6 | ✅ P1-9 `regions` | banner 写死 11/18；行内码 `0.875em !important` |
| 声音 | 无视觉通道（C4 技术可行） | ⊘ | ⊘ F13 不做 | 自动播放需手势、体积大、与外观定义无关 |
| 布局密度 | C2 | ❌ | ✅ P2-11 `density`（3 类目标） | 宿主无 spacing token 族；padding 硬编码遍布 |
| 滚动条 | C1 四色 + C2 | ◐ 四色 | ✅ P1-9 `regions.scrollbar` | 宽度/滑块/圆角需 C2 逐元素；overlay 行为受 OS 影响 |
| 光标与选区 | C2（`cursor`、`::selection`） | ❌ | ❌ 未列入 13 家族 | 可达但未规划；选区色与正文对比度耦合 |

**三条读数：**

1. **可达 14/15**（声音是主动不做，不算不可达）；**已实现只有 1 个完整家族 + 6 个部分**；**V3 计划覆盖 12/15**，缺声音、光标选区，图标只到着色。
2. 能力缺口和实现缺口要分开说：图标替换、逐行背景是 **C-hook 真不可达**；排印、形状、背景、动效是**可达但 V2 schema 没字段**；密度、光标是**可达但没排期**。
3. V3 的扩张主要发生在 C2/C3/C4/C5，不是 C1（benchmark §1.3 的同一判断）。

---

## §5 会被误认为「超过」但其实没超过的 5 种做法

**5.1 分发宿主 CSS 补丁。**
往宿主 `dist`/`index.html` 里塞覆盖样式，或让用户替换 `design-platform.css`。这改的是宿主产物，不是插件；宿主升级即覆盖，且违反「不改宿主源码」前提。它把 EC 换成「宿主源码的 EC」，讨论对象已不是插件。

**5.2 打包 / fork 宿主前端。**
自带一份宿主 UI 发出去。这等于发明新宿主，「同一宿主」不成立；能力上限由新前端决定，与 DSH 插件能力无关。

**5.3 注入 monkeypatch，改宿主模块或 React 组件树。**
运行时替换组件、改 render、往私有单例里塞东西。短期能改结构，但依赖私有内部名，四道验收里的「上游升级」必挂；而且它没有新增通道，只是把 C3 用到极限。若把它算作插件能力，就等于允许宿主补丁，2.1 的结构墙也失去意义。

**5.4 预置主题数量多。**
1000 套色板仍然是 1000 次 C1 写入。数量是内容覆盖与生产效率，不是 Expressible 的扩大；用户感知的「更强」来自选择多，不来自能力多。

**5.5 AI 生成 prompt / 生成质量好。**
生成器再强，产物仍是同一份 JSON/CSS、走同一批通道。它提高的是「命中 EC 内好点」的采样率，不改变 EC 的边界。把生成质量当能力上限，等于把「会拍照」当成「能看见更多颜色」。

---

## §6 未确证项（需实机验证）

1. **主 UI 的重渲染粒度**：路由切换、会话切换时 React 是否重建整棵 DOM；这决定 C3 的真实存活率（本文按 1/4 估，推断）。
2. **body 内联与 `!important` 的最终层叠**：宿主 `apply` 之后，插件用 `setProperty(name, value, 'important')` 写同名 token 的实际胜负（代码上 inline important 应胜，未实机）。
3. **非 `--` 名字的副作用**：`validateOverrides` 不校验名字，`body.style.setProperty('color', …)` 这类写法是否真被 snapshot 接受并渲染（代码路径允许，未实机）。
4. **背景视频/大图的性能预算**：Electron 下的内存、掉帧、首帧闪烁阈值。
5. **自动播放策略**：muted autoplay 在桌面构建里的默认行为（推断允许，未实测）。
6. **跨源 iframe 的唯一例外**：浏览器侧栏指向 `localhost`/同源页面时，是否可注入（若同源，2.1 的跨源墙对该场景不成立）。
7. **终端渲染方式**：xterm 是否 canvas 渲染；若 DOM 渲染，C5 是否还有部分作用。
8. **升级稳定性**：`[data-*]` 钩子与 CSS Modules 类名在连续版本间的漂移频率（需跨版本采样，单 pin 无法证明）。
9. **Windows 菜单条的 token 继承**：open shadow 内 `:host` 使用 `--dsw-*` 是否随 body 内联实时更新（代码上应继承，未实机）。
10. **强制更新遮罩的出现条件**：只在 `policy.blocking` 时挂载（`apps/desktop/src/preload-mandatory-overlay.ts:18-30`），非阻塞时主题一致性范围更大。

---

## §7 证据索引

| # | 一句话结论 | 证据 |
|---|---|---|
| 1 | 外部插件无沙箱，`engines.dsh` 只做版本准入 | `packages/boot/app-boot/README.md:52` |
| 2 | 已安装 Host 代码在 workspace 沙箱外、进程内执行 | `packages/boot/plugin-manager/README.md:31` |
| 3 | 客户端 bundle 是 same-origin classic script | `packages/client/modules/src/client/system.ts:15-29` |
| 4 | bundle 只注册 lazy-CJS factory，CSS 注入在 factory 内 | `packages/client/modules/src/client/manifest.ts:9-16` |
| 5 | 插件注入的 `<style>` 被 `data-plugin` 认领，卸载时按归属移除 | `packages/client/modules/src/client/system.ts:66-86` |
| 6 | 主 UI 挂在 `#root`，非 iframe | `apps/web/src/main.ts:17-20` |
| 7 | 页面 15 行、无 CSP meta | `apps/web/index.html:1-15` |
| 8 | 主 UI 无 shadow root；只有两处 preload 与测试命中 `attachShadow` | `apps/desktop/src/preload-menu.ts:13`、`apps/desktop/src/preload-mandatory-overlay.ts:30` |
| 9 | 强制更新遮罩是 closed shadow + `dsh-app://` iframe | `apps/desktop/src/preload-mandatory-overlay.ts:29-36` |
| 10 | 浏览器侧栏是带 sandbox 的任意 URL iframe | `packages/client/ui-sidebar-browser/src/client/view/IframePresentation.ts:7`、`:15-20` |
| 11 | 文档预览 iframe 为不透明源 | `packages/client/ui-sidebar-documentpreview/src/client/html/HtmlBody.tsx:68`、`:102` |
| 12 | 原生标题栏由 `titleBarOverlay` 固定 | `apps/desktop/src/main.ts:216-223` |
| 13 | 主题源只同步 light/dark/system 到 `nativeTheme` | `apps/desktop/src/preload-theme.ts:7-24`、`apps/desktop/src/main.ts:749-751` |
| 14 | `overrideTokens` 只校验 `{light,dark}` 对，不校验名字 | `packages/client/ui-theme/src/client/index.ts:369-378`、`:466-486` |
| 15 | override 层按 seq 合并，无名字过滤 | `packages/client/ui-theme/src/client/index.ts:405-413` |
| 16 | 宿主把全部 token 写成 body 内联 | `packages/client/ui-layout/src/client/theme-presenter.ts:69-90` |
| 17 | elevation 派生值在 `body, body *` 上逐元素重声明 | `packages/client/ui-theme/src/styles/gradient-shadow-text.css:31-40` |
| 18 | 遮罩默认 `--dsw-mask-blur: none` | 同文件 `:19` |
| 19 | 指针模态强制焦点环透明 | `packages/client/ui-theme/src/styles/focus.css:18-20` |
| 20 | 代码块底色带 `!important` | `packages/client/ui-primitives/src/markdown/CodeBlock.module.css:94` |
| 21 | 代码块用局部变量承接宿主 token | 同文件 `:11`、`:16` |
| 22 | `/api/file` 响应用 `sandbox; default-src 'none'` 的 CSP | `packages/api/session-controller/src/media-references.ts:19` |
| 23 | 五通道定义与三道墙 | `theme-ceiling-benchmark-151.md` §1.1–§1.3 |
| 24 | 13 个效果家族与 V3 P0/P1/P2 字段 | `theme-ceiling-benchmark-151.md` §3–§4 |
| 25 | 可还原性承诺与三类不可达 | `theme-ceiling-benchmark-151.md` §5、§7 |
| 26 | T0–T4 分级、三个真天花板、权限比预想宽 | `v3-capability-matrix.md` §0–§1 |
| 27 | 宿主 403 token / 602 声明 / 6 sheet；排印无行高轴；终端字号只走 JS | `v3-capability-matrix.md` §2.1、§2.3 |
| 28 | 客户端 ctx 无 router/modal/http/fs；T1–T4 能力表 | `dsh-source-plugin-capability-surface.md` §0–§5 |
| 29 | 13 仓只覆盖 6 个效果家族；布局密度/图标/全局字号 0 家 | `theme-13-synthesis-100.md`「跨仓事实」 |
| 30 | 颜色轴 222 声明 / 184 live / 38 死；本仓写 105 名、14 死 | `color-axis-token-inventory.md` §0–§5 |
| 31 | token 状态机与探针三通道 5:4:1 | `host-token-probe-136.md` §0–§2 |
| 32 | 宿主无静态目录、无 CSP，4 面透明化清单 | `v3-capability-matrix.md` §2.4 |

> 结论：EC_abs 就是本文 §0① 的那句话。任何「超过」若不改宿主、不出外观语义，只可能发生在 §3.3 的 (b)(c)——覆盖不全或完成度不够，而不是能力被突破。真正的墙只有三类：**结构（closed shadow / 跨源 iframe / 原生 chrome）、钩子（终端字体 / 组件替换 / 逐行地址）、优先级（body 内联 / `!important` / 逐元素重声明）**。
