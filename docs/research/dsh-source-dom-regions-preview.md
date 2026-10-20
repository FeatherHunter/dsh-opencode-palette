# dsh Web 客户端：DOM 区域、背景/毛玻璃分层与主题预览保真度

调研对象：`D:\Temp\dsh-src`——<https://github.com/deepseek-ai/deepseek-harness> 的浅层稀疏检出，commit `687f282`（v0.2.1-rc.2）。
**本文所有 `path:line` 均相对 `D:\Temp\dsh-src`**，源码为只读事实来源；凡标注「待活体验证」的结论，源码里没有足够证据。

---

## 0. 结论速览

| 问题 | 结论 |
|---|---|
| 外部插件能不能稳定选中各区域？ | 能。`[data-slot]` / `[data-shell-*]` / `[data-conversation-*]` / `[data-chat-*]` / `[data-tool]` / `[role=*]` / `body[data-ds-dark-theme]` 都是刻意的语义钩子；CSS Modules 类名（`.frame` `.root` `.composerSeat`…）每次构建都变，**不可依赖**。 |
| 整页能不能铺静态图 / 动图 / 视频？ | 能。Web 宿主**没有任何 CSP**；`<img>`、GIF/APNG/WebP、`<video autoplay muted loop playsinline>` 都不受限。 |
| 背景会不会被现有不透明面盖住？ | 会。`body`、AppFrame 帧、侧栏列、会话列都各自涂 `--dsw-alias-bg-base` / `--dsw-specific-sidebar-fill`，必须用**令牌作用域**或结构选择器一次性改透。 |
| 毛玻璃能动吗？ | 菜单材质与模态遮罩的模糊是官方列为「功能/平台 CSS 不得覆盖」的资产（`--dsw-menu-backdrop-filter`、`--dsw-mask-blur`，后者默认 `none`）。技术上就是两个 CSS 变量，改等于主动偏离官方观感。 |
| 预览能多像真页面？ | 同文档内 **DOM 克隆 ≈ 像素级**（同一套全局 CSS）；可再用平台单例 `ui-primitives` 渲染真实的 markdown / 代码块 / diff；`ui-chat`、`ui-conversation` 组件**不可导入**；iframe 方案不可行。 |

---

## 1. 文档骨架：谁拥有哪个区域

### 1.1 三层宿主：`html` → `body` → `#root`

```html
<html data-platform="…">            <!-- darwin / windows / web -->
  <body data-ds-dark-theme           <!-- 暗色开关 -->
        data-ds-theme-source="…"      <!-- light | dark | system -->
        style="--dsh-content-font-size:…; …">
    <div id="root"> … AppFrame … </div>
    <!-- 所有浮层（菜单/设置/Toast）portal 到 body，紧邻 #root -->
  </body>
</html>
```

- 尺寸与底色：`html, body, #root { height:100%; margin:0 }`（`packages/client/web/src/base.css:4-9`）。
- `body` 字体 / 前景 / **底色**：`packages/client/web/src/base.css:11-30`，其中 `background: var(--dsw-alias-bg-base, #fff)` 在 `:30`——这是「整页背景」必须首先处理的一层。
- macOS 桌面：`html[data-platform='darwin'], … body { background: transparent }`（`base.css:33-36`），并对 `body` 施加 `isolation: isolate`（`base.css:38-42`），注释写明 *「Menu backings paint below page content but above the native vibrancy」*——**darwin 下的层叠语义与普通 Web 不同**。
- 窗口拖拽（`app-region`）只有一处声明：`[data-window-drag] { -webkit-app-region: drag }`（`base.css:53-55`，注释称其为 "the one drag declaration"）；随后 `body > :not(#root)` 统一 `no-drag`（`base.css:69-71`），`role=dialog/menu/menuitem/tooltip/…` 整组 `no-drag`（`base.css:80-92`）；`code, pre, [data-diff], [data-read], [data-search], [data-terminal]` 关闭 `text-autospace`（`base.css:94-100`）。工程含义：**挂到 `body` 下的浮层自动获得 no-drag**，而挂进 `#root` 的覆盖层需要自己处理。
- 主题属性的写入方是 ui-theme：`data-ds-dark-theme`（`packages/client/ui-theme/src/client/theme-presenter.ts:17`）、`data-ds-theme-source`（`:28`）、三种字号变量 `--dsh-content-font-size` / `--dsh-code-font-size` / `--dsh-terminal-font-size`（`:34-38`）与三种字族变量 `--dsh-font-family-text|code|terminal`（`:41-45`）；`apply()` 把当前主题 token **内联写到 `body`**（`:85-90`），并在切换时先撤销上一轮写入再写新值（`:99-109`）；首帧前由 boot 脚本先行写入（`packages/client/ui-theme/src/boot-theme.ts:55-64`）。

> 后果：**主题 token 全部落在 `body` 的行内样式上**。任何 `html { … }` 层级的覆盖都会被 `body` 行内值压住；要作用到全局就必须走 `theme.overrideTokens()`（见 §2.5）。

### 1.2 AppFrame：区域的唯一所有者

`packages/client/ui-layout/src/client/shell/AppFrame.tsx:258-307` 一次性把骨架摆好：

| 区域 | 标记 | 内容 |
|---|---|---|
| 帧（整页网格） | 同元素上的 `data-sidebar-collapsed` / `data-rightbar-collapsed` / `data-rightbar-fullscreen` / `data-rightbar-instant` / `data-dragging` / `data-animating` | 两行网格（主体 + 底栏） |
| 侧栏列 | 无 data 属性，内部是 `[data-slot="sidebar"]` | `renderSlot('sidebar')` |
| 中列 | 无 data 属性 | 主面板（会话） |
| 右栏列 | 无 data 属性 | `renderSlot('rightbar')` |
| 底栏 | `data-shell-bottom` | `shell.bottom` |
| 浮层座椅 | **`data-shell-overlay`** | `shell.overlay` |
| 拖拽把手 | — | `side="sidebar"` / `"rightbar"` |

帧样式（`packages/client/ui-layout/src/client/shell/AppFrame.module.css`）：`.frame` 自身 `background: var(--dsw-alias-bg-base)`（`:1-8`）；侧栏列 `background: var(--dsw-specific-sidebar-fill)` + 0.5px 右描边（`:58-63`）；darwin 下 frame/sidebar/center/right 各自透明或毛玻璃组合（`:77-79`、`:110-125`、`:129-139`、`:152-164`），`prefers-reduced-transparency` 回落 90% 不透明（`:145-150`）；Windows 标题栏额外 `padding-top` + `::before` 拖拽条（`:26-46`、`:93-96`）。

**结构定位**（不写死任何类名，只靠槽位锚点）：

```css
/* AppFrame 帧：其子树上存在 sidebar 槽位锚点 */
#root > div:has([data-slot="sidebar"]) { background: transparent; }
```

### 1.3 会话区域

`packages/client/ui-conversation/src/client/skeleton/ConversationContent.tsx:184-198` 同时给出：

- `data-conversation-content`
- `data-conversation-session="<session id>"`
- **`data-conversation-region="chat" | "composer"`**
- `data-content-phase`

配合 `[data-conversation-scroll]`（滚动容器）与 `[data-composer-seat]`（输入区座椅）。
会话列自身不透明：`.root { height:100%; background: var(--dsw-alias-bg-base) }`（`ConversationRoot.module.css:5-7`）——**铺背景必须同时让这一层透出来**。

### 1.4 Chat 行与消息

`packages/client/ui-chat/src/client/chat/ChatNodeSeat.tsx:150-156` 逐节点标注：

`data-chat-anchor-key`、`data-chat-flow-key`、`data-chat-paging-anchor`、`data-chat-node-key`、`data-chat-group-part`、**`data-chat-flow-kind`**（节点种类）、`data-chat-turn`；另有 `data-chat-flow`、`data-chat-group-key`、`data-chat-following-tail`、`data-chat-motion` 等。

用户气泡：`ui-chat/src/client/chat/UserContent.tsx:47` 的 `<div className={css.bubble}>`——**只有哈希类名**，稳定钩子仅有祖先的 `[data-chat-flow-kind]` 与 `data-message-attachments`（`:24`）。
Assistant markdown 容器：`ui-primitives/src/markdown/MarkdownText.tsx:197-198` 渲染 `.markdown`（+`.compact`），且 `data-markdown-variant` **只在 compact 时出现**——正文 markdown **没有**专属稳定属性，只能经语义标签（`h1..h6, p, ul, table, pre, blockquote, a`）在区域内做后代样式。

### 1.5 输入区（composer）

- 座椅：`[data-composer-seat]`；内部 `.composerStack` / `.composerSeat`（`ConversationRoot.module.css:335`、`:346`），`.composerSeat` 自身带 z-index 两态（常态 / 带触发菜单时）。
- 编辑器：`[contenteditable]`（`ui-conversation/src/client/composer/ComposerContentEditable.tsx:42`）+ `[data-placeholder]`（`ui-conversation/src/client/composer/DraftEditor.tsx:44`）。

### 1.6 设置浮层

- `createPortal(…, document.body)`：`packages/client/ui-settings-general/src/client/SettingsRoot.tsx:104`。
- `role="dialog"`、`aria-modal`、`data-shortcut-modal="settings"`：`SettingsRoot.tsx:70`。
- 样式（`SettingsRoot.module.css`）：`.overlay` `z-index:1000`（`:61-64`）；`.mask` = `--dsw-alias-bg-mask-1` + `backdrop-filter: var(--dsw-mask-blur)`（`:71-75`）；`.panel` = **`--dsw-alias-bg-layer-2`**（`:85-94`）、`z-index:1`。

> 关键收益：设置面板用的是 `bg-layer-2` 而非 `bg-base`，**所以「把 bg-base 改透明」不会顺手把设置面板弄成透明**（对整页背景是好事）；反过来，想给设置卡片上玻璃，改的是 `bg-layer-2` 与 `--dsw-alias-settings-card-fill`（`packages/client/ui-theme/src/styles/base.css:29-34` 把 card fill/stroke 别名到 `bg-layer-2` / `border-l4`）。

### 1.7 菜单与浮层材质

`packages/client/ui-primitives/src/MenuSurface.module.css`：材质层 `z-index:-1` + `isolation:isolate`（`:16`），`backdrop-filter: var(--dsw-menu-backdrop-filter)`（`:27`）；菜单 portal 到 body，`z-index:1100`。菜单上带 **`data-menu-material="translucent"`**（`packages/client/ui-theme/src/styles/gradient-shadow-text.css:23` 用它做暗色描边）。

### 1.8 稳定钩子 vs 构建脆弱钩子

| 类别 | 钩子 | 稳定性 | 证据 |
|---|---|---|---|
| 主题/环境 | `body[data-ds-dark-theme]`、`body[data-ds-theme-source]`、`html[data-platform]` | ✅ 稳定（对外语义） | `theme-presenter.ts:17,28`、`packages/client/web/src/base.css:33,53` |
| 字体/字号 | `body` 行内 `--dsh-*-font-size` / `--dsh-font-family-*` | ✅ 稳定 | `theme-presenter.ts:31-45` |
| 槽位 | `[data-slot="sidebar"|"rightbar"|"root"|…]` | ✅ 稳定，但 `display:contents`（布局中性，**自身不能承载背景**） | `packages/client/ui-slots/src/client/scoped-slots.tsx:1088-1097,1293` |
| 壳层 | `[data-shell-overlay]`、`[data-shell-bottom]` | ✅ 稳定 | `AppFrame.tsx:258-307` |
| 会话 | `[data-conversation-region]`、`[data-conversation-session]`、`[data-conversation-content]`、`[data-content-phase]`、`[data-conversation-scroll]`、`[data-composer-seat]` | ✅ 稳定 | `ConversationContent.tsx:184-198` |
| 消息 | `[data-chat-flow-kind]`、`[data-chat-node-key]`、`[data-chat-turn]`、`[data-chat-group-*]` | ✅ 稳定 | `ChatNodeSeat.tsx:150-156` |
| 工具行 | `[data-tool]`、`[data-caption]`、`[data-change]`、`[data-inspect]`、`[data-tone]`、`[data-expandable]` | ✅ 稳定（取值待活验） | `packages/client/ui-tool/src/client/tool/components/ToolRow.tsx` |
| 代码/差异 | 全局字面类 `.md-code-block`（+ `-numbered`/`-card`）、`[data-code-block-banner]`、`[data-code-block-content]`、`[data-diff]`、`[data-read]`、`[data-search]`、`[data-terminal]` | ✅ 有意公开（源码注释称 "stable semantic hooks for owner styling and DOM tests"） | `ui-primitives/src/markdown/CodeBlock.tsx:188-194`；`packages/client/web/src/base.css:94-100` |
| 输入 | `[contenteditable][data-placeholder]` | ⚠️ 半稳定（Lexical 宿主） | `ComposerContentEditable.tsx:42`、`DraftEditor.tsx:44` |
| 浮层 | `role="menu"`、`role="dialog"`、`role="tooltip"`、`[data-menu-material]`、`[data-shortcut-modal]` | ✅ 稳定（ARIA 语义） | `base.css:80-92`、`MenuSurface.module.css:16-27` |
| 布局类 | `.frame`、`.sidebarCol`、`.root`、`.composerSeat`、`.bubble`、`.panel`、`.mask`、`.card` | ❌ 哈希，逐构建变化 | 各 `*.module.css` |
| 侧栏行 | **无任何 `data-*`**（`ui-sidebar/src` 全量 tsx 扫描为零命中） | ❌ 无稳定钩子 | 见 §5 注 |

---

## 2. 分层：背景、玻璃与 z-index

### 2.1 z-index 实测表（取自组件 CSS）

| 层 | z-index | 来源 |
|---|---|---|
| AppFrame 把手 / leadingSeat / overlayLayer | 11 / 15 / **20** | `AppFrame.module.css` |
| 侧栏折叠浮起 | 30 | `packages/client/ui-sidebar/.../SidebarRoot.module.css` |
| dockkit 菜单 / scrim / divider | 70 / 10 / 1 | `packages/client/ui-dockkit/src/client/*.module.css` |
| MenuSurface 材质层 | **-1**（+ `isolation:isolate`） | `MenuSurface.module.css:16` |
| 工具提示气泡 / portal | 100 / 1100 | `Tooltip.module.css` |
| 菜单 portal | 1100 | `Menu.module.css` |
| Toast | 1100 | `Toast.module.css` |
| 模态 / 图片灯箱 / 设置浮层 | 1000（面板内 1） | `Modal.module.css`、`ImageLightbox.module.css`、`SettingsRoot.module.css:61-64` |
| 会话内：tabs / composerSeat / toBottom / 高度把手 | 1 / 7、9 / 8 / 0、8 | `ConversationRoot.module.css`、`ChatView.module.css` |
| 上下文计量 / stat 面板 | 1100 | `ContextMeter.module.css`、`stat-dialog.module.css` |

**结论**：菜单（1100）与模态（1000）都在页面内容之上、且都 portal 到 `body`；**页面级背景层只要落在 `#root` 之下（`z-index:-1` 或 `0` 且不建立新的覆盖关系），就永远在菜单/遮罩之下**，不需要动任何浮层的 z-index。

### 2.2 会盖住背景的不透明面

| 面 | 令牌 | 位置 |
|---|---|---|
| `body` | `--dsw-alias-bg-base` | `base.css:30` |
| AppFrame 帧 | `--dsw-alias-bg-base` | `AppFrame.module.css:1-8` |
| 侧栏列 | `--dsw-specific-sidebar-fill` | `AppFrame.module.css:58-63`；浅色 `design-platform.css:275` / 暗色 `:393` |
| 会话列 | `--dsw-alias-bg-base` | `ConversationRoot.module.css:5-7` |
| 设置面板 | `--dsw-alias-bg-layer-2` | `SettingsRoot.module.css:85-94` |
| 菜单材质 | `--dsw-menu-surface-fill` + 模糊 | `MenuSurface.module.css:16-27` |
| 设置卡片 | `--dsw-alias-settings-card-fill` = `bg-layer-2` | `packages/client/ui-theme/src/styles/base.css:29-34` |

浅/暗底色的 token 定义：`packages/client/ui-theme/src/styles/design-platform.css:166-181`（浅色 `bg-base` = `neutral-bluish-00`、`bg-mask-1` = `rgba(0,0,0,.24)`、`bg-overlay` = `bluish-150`）、`:284-299`（暗色 `bg-base` = `bluish-950`、`bg-mask-1` = `rgba(0,0,0,.5)`、`bg-overlay` = `bluish-700`）。

### 2.3 玻璃消费者（全量扫描）

`--dsw-menu-backdrop-filter`（默认 `blur(40px) saturate(150%)`，`gradient-shadow-text.css:20`）与 `--dsw-mask-blur`（默认 **`none`**，`gradient-shadow-text.css:19`）的消费点：

- 菜单材质：`MenuSurface.module.css:27`（唯一"官方允许"的玻璃）
- 遮罩类：`Modal.module.css:21`、`SettingsRoot.module.css:71-75`、`ImageLightbox.module.css:23`
- 卡片/浮岛类：`HoverCard.module.css:88`、`QueueDock.module.css:45`、`ContextMeter.module.css:55`、`TodoPanel.module.css:26`、`GoalBar.module.css:43`、`stat-dialog.module.css:24`、`PickerPopover.module.css:13`、`TaskMenu.module.css:20`、`ScheduleCatalogAction.module.css:52`
- 特例：`SubagentHeaderLineage.module.css:120` 把菜单皮肤画在伪元素上（`:109` 注释说明原因：backdrop-filter 画在菜单自身会失效）；`DropOverlay` `blur(10px)`；dockkit `.dockScrim` `blur(6px)`；Desktop onboarding `blur(32.609px)`。

隔离上下文（`isolation`）出现在：`MenuSurface.module.css:16`、`QueueDock.module.css:30`、`GoalBar.module.css:21`、`TrajectoryTimeline.module.css:4`。

### 2.4 官方约束（必须写进设计约束里）

`docs/web-styling.md:26`：

> 菜单一律走 `Menu`/`MenuSurface`；材质 = `--dsw-menu-surface-fill` + `--dsw-menu-backdrop-filter`；**功能与平台 CSS 不得覆盖这两者**；ui-theme 的菜单检查会拒绝「材质覆盖」与「token 重定义」。

`docs/web-styling.md:27`：

> 模态遮罩（含设置、确认框）保留黑色半透明、**不模糊**背景；主题把 `--dsw-mask-blur` 设为 `none`。

即：官方观感里**玻璃只属于菜单**，遮罩是「暗化」而非「磨砂」。V3 若要做「遮罩磨砂」，就是有意识地与官方规则分叉（技术上只需把 `--dsw-mask-blur` 改成 `blur(...)`，且它会一次性影响 Modal / 设置 / 灯箱 / 多个浮岛）。

### 2.5 页面级背景层的推荐注入方式

目标：不动类名、不漏面、不破浮层、不破 darwin 拖拽。

```css
/* ① 令牌层：让"涂底色"的面一次透出来（官方支持路径，见 theme.overrideTokens） */
/* --dsw-alias-bg-base: transparent;         ← body / 帧 / 会话列 一起透 */
/* --dsw-specific-sidebar-fill: <rgba>;      ← 侧栏单独给半透明色 */

/* ② 背景节点：body 的直接子节点（不在 #root 内） */
body > [data-opcp-bg] {
  position: fixed; inset: 0;
  z-index: -1;                 /* 永远在 #root 内容、菜单(1100)、模态(1000) 之下 */
  pointer-events: none;
  background: #000 center/cover no-repeat;
}
body { background: transparent; }   /* 否则 body 自己的底色会压住这层 */

/* ③ 帧/会话列兜底（令牌被别处重定义时）——结构选择器，不写任何哈希类名 */
#root > div:has([data-slot="sidebar"]) { background: transparent; }  /* AppFrame 帧 */
[data-conversation-scroll] { background: transparent; }              /* 会话滚动容器 */
```

要点与坑：

1. **`body > :not(#root)` 在 darwin 下自动 `no-drag`**（`base.css:69-71`），所以背景节点不需要任何 app-region 处理；但若把覆盖层挂进 `#root`，就必须自己 `-webkit-app-region: no-drag`（见 §2.6）。
2. `z-index:-1` 在有 `isolation:isolate` 的 `body`（darwin）内仍然只在 **`body` 的层叠上下文内**沉底，不会跑到 canvas 下面——安全。
3. 更省事但等价的做法：`body::before { position: fixed; inset: 0; z-index: -1; content: ''; }`——不新增 DOM，继承 `body` 的 no-drag，且不参与 `:not(#root)` 计数。
4. 背景层**不要**用 `filter`/`backdrop-filter`/`transform` 建新层叠上下文，否则 `z-index:-1` 的语义会变。
5. 菜单材质是 `backdrop-filter`，它采样的是**它背后的已合成结果**——背景视频/动图会实时进入模糊采样。这是最贵的一条路径（见 §2.7）。

### 2.6 darwin 的 app-region 约束

- 唯一 drag 声明：`html[data-platform='darwin'] [data-window-drag]`（`base.css:53-55`）。
- Electron **按几何合成** app-region，不做命中测试；`ConversationRoot.module.css:55` 注释：覆盖层必须 portal 到 `body`（在 `#root` 之后），否则会「把整行变成拖拽区而不是接收点击」。
- 已内建的减法：`body > :not(#root)`（`base.css:69-71`）、`role=dialog/menu/…` 整组（`:80-92`）、`[data-window-drag-recall]`（`:65-67`）。
- 推论：**任何跨越标题栏/header 的整页覆盖层，必须挂在 `body` 下或显式 no-drag**，否则 macOS 上会吞点击。Windows 11 标题栏由 `[data-windows-titlebar]` 的帧内边距 + `::before` 拖拽条承担（`AppFrame.module.css:26-46`），同理。

### 2.7 性能约束（源码层面）

- **没有**任何文档化的渲染预算/性能门禁与 `backdrop-filter` 相关；`docs/` 里只有菜单材质与遮罩的观感规定。
- 会话语义本身就是「窗口化」的：`packages/client/ui-chat/README.md:194` 明确 transcript 反映的是"loaded Session window"，翻历史靠分页；`@tanstack/react-virtual` 是平台单例模块（`packages/client/web/src/platform.ts:8-15`），滚动按需渲染。
  → 对背景层：**整页一层静态/视频背景是常数成本**；但"逐行背景"只对已加载行生效，且克隆/截图会随窗口变化。
- 真正的风险点：`backdrop-filter` 覆盖大面积（背景视频 + 每帧重采样）与 `<video>` 常驻解码在低端机上的功耗。建议：视频背景只在 `data-conversation-region="chat"` 之外或降低分辨率；提供 `prefers-reduced-motion` 静态回退（官方已有 `prefers-reduced-transparency` 回退先例，`AppFrame.module.css:145-150`）。

---

## 3. 媒体可行性（浏览器侧）

### 3.1 CSP：Web 宿主没有 CSP

- `apps/web/index.html` 是 15 行骨架（`<div id="root">` + `/src/main.ts`），**无 CSP meta**。
- `packages/host/webserver` 与 `packages/host/frontend-static` 都**没有**输出 `Content-Security-Policy` 响应头。
- 全仓 CSP 只出现在三处，且都与 Web 页面无关：Desktop 渲染层自有页面、iframe 预览的 `srcdoc` fixture（`packages/client/ui-sidebar-documentpreview/src/client/html/basic-document.ts:18`）、以及宿主侧媒体引用的沙箱属性（`packages/host/session-controller/src/media-references.ts:19`，`sandbox; default-src 'none'`）。

→ 在 **Web 宿主**里，`<img src="data:…">`、`<img src="blob:…">`、`<video src="…">` 均不受 CSP 限制。
⚠️ **Desktop（Electron）宿主未验证**：Desktop 的渲染页面自有 CSP，`data:`/`blob:` 是否放行需在桌面端实测（列为未知项 U3）。

### 3.2 资源 URL：没有静态资源通道

- 只有 `client.<hash>.js` 形态的模块脚本会被服务（`packages/client/modules/src/index.ts:193` 的 chunk 正则），插件前端路由是 `/plugins` 前缀（`modules/index.ts:226`、注册点在 `:665`）。
- 其余路径一律 404：`packages/host/frontend-static/src/index.ts:88-99,117-121`（只有 dist 根与配置的 index 路径返回 `index.html`）。
- 索引注入只有三种能力：全局/脚本/样式/HTML 片段（`packages/host/webserver/src/injections.ts:15-31`），且 `style` 会被搬进 `<head>`。

→ **插件没有"静态图片目录"可放背景**，可用 URL 只有三类：

| 方案 | 适用 | 注意 |
|---|---|---|
| `data:` | 小图、一次性预览 | base64 体积 +33%，大图会拖慢注入/内存 |
| `blob:` | 大图/视频（插件自行 fetch 后 `createObjectURL`） | 需在插件卸载时 `revokeObjectURL` |
| 远程 `http(s):` | 用户自备 URL / CDN | 需 CORS（尤其 `<video>`）、离线不可用 |

### 3.3 播放策略

- `<video autoplay muted loop playsinline>` 在 Chromium 下 `muted` 即满足自动播放策略；再补 `disablePictureInPicture`、`pointer-events:none`、`aria-hidden`。
- GIF/APNG/WebP 动图用 `<img>` 即可；**APNG/WebP 动图比 GIF 省内存**。
- 建议统一走 `object-fit: cover` + `background-attachment` 无关的固定层（`position:fixed`），避免虚拟滚动时的重排。

---

## 4. 预览保真度：四种方案

### 4.1 关键前提：哪些东西第三方插件真的拿得到

第三方客户端插件与官方包共享 **11 项平台单例**（`packages/client/web/src/platform.ts:8-15`，实现在 `packages/client/web/src/seed.ts`）：

```
react, react/jsx-runtime, react-dom, react-dom/client, @deepseek-ai/cordis, zod,
@tanstack/react-virtual, dsh-client-store, dsh-client-ui-slots,
dsh-client-ui-primitives, dsh-client-ui-dockkit
```

- 模块加载器用**冻结的静态表**解析 bundle 的 external 请求（`seed.ts` 头注释："fetch bundles resolve their externals against exactly this set through the loader's require"）。
- `dsh.client.external` 只登记**非基线**模块，且必须指向一个插件包行；行不得声明自身（`packages/client/modules/src/index.ts:500-529`）。
- 结论：**`ui-primitives` 可导入**（`MarkdownText`、`CodeBlock`、`DiffBlock`、`TerminalBlock`、`ReadBlock`、`SearchBlock`、`Menu`、`MenuSurface`、`Modal`、`Tooltip`、`Tag`、`Button`、`icons`、`settings-form`）。
  **`ui-chat` / `ui-conversation` / `ui-sidebar` 等不在表内 → 不可导入**（它们被编进各自的 combo 行）。
- 另一个有利事实：官方 CSS 是**全局、整页一份**的（组件 CSS 随 bundle 一次性进 document），所以**同一 document 内克隆出来的 DOM 天然带着正确样式**；跨 iframe 就必须自己搬运 CSS。

### 4.2 四方案对照

| 方案 | 依赖 | 保真度 | 风险 | 结论 |
|---|---|---|---|---|
| (a) 在插件面板里挂真组件 | 平台单例 `ui-primitives`（可用）；`ui-chat`/`ui-conversation`（不可用） | markdown/代码块/diff/菜单/模态 = **真组件级**；气泡、工具行、turn 布局 = 需自建 | 中：需自己维护容器布局；`ui-primitives` 版本随宿主，类名/属性可能变（但 `.md-code-block` 等已声明为稳定钩子） | ✅ 作为「内容级」增强，最佳搭档 |
| (b) iframe 真路由 + 主题 query | 无 | 理论最高 | 高：应用**没有路由**、未知路径 404（`frontend-static/src/index.ts:88-99`）、**没有主题 query 协议**；iframe `/` 会起第二个完整实例（模块表 + WebSocket + 认证），且无法在创建时指定主题 | ❌ 不推荐 |
| (c) 克隆真实 DOM 到面板 | 只需同 document | **最高**（同 CSS、同 token、同字体） | 中：只含已加载窗口（`ui-chat/README.md:194`）；portal 节点在 `body` 别处需另取；`iframe`/`canvas` 克隆后是空壳；动画/滚动状态需冻结；宽高需固定 | ✅ **首选**（像素级） |
| (d) 手搭静态预览 + 同 token/字体 | 无 | 中高（尺寸/间距靠手写） | 低：完全可控、无宿主依赖 | ✅ 兜底与「区域开关演示」 |

### 4.3 为什么 (c) 在技术上成立

- 克隆发生在**同一 document**：`cloneNode(true)` 保留哈希类名，而 CSS Modules 的规则本来就指向那些类名 → 样式立即生效，无需搬运 CSS。
- `--dsw-*` 令牌写在 `body` 行内（`theme-presenter.ts:85-90`），克隆到面板里仍从祖先继承 → 明暗、字号、字体自动一致。
- 字体没有 webfont 依赖正文：文本栈是系统栈（`packages/client/ui-theme/src/styles/base.css:6-24` 的 `--dsh-font-family-text-default` / `--dsh-font-family-code-default`），因此预览与真实页面同字形；唯一自带字体是品牌字 Montserrat（`ui-theme/src/styles/montserrat-*.woff2`），与正文无关。
- **保真度上限**：React 的测量/虚拟化状态、`ResizeObserver` 驱动的滚动渐隐、进行中的动画、composer 的 Lexical 编辑器（克隆后是静态 HTML，`contenteditable` 不可用）、`<video>`/`<canvas>`/内部 iframe 内容。

### 4.4 (a) 的正确用法（内容级真组件）

用 `MarkdownText` + `CodeBlock` + `DiffBlock` 渲染"示例消息"，外面套自建气泡/工具行容器：

```tsx
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'   // 平台单例，需 external
// CodeBlock 自带稳定字面类 .md-code-block / -numbered / -card
```

限制：`ui-primitives` 的 `MarkdownText` 在非 compact 时**不带** `data-markdown-variant`（`MarkdownText.tsx:197-198`），所以气泡级样式仍要靠外层容器；气泡/工具行的间距、行高需自己对齐官方（官方值在 `ui-chat/src/client/chat/*.module.css`，可读不可导入）。

### 4.5 推荐组合

1. **主预览 = (c) DOM 克隆**：进入设置/面板时抓取 `[data-conversation-region="chat"]` 的一段子树 + composer 座椅 + 侧栏，`cloneNode(true)` 进缩放容器（`transform: scale()`），冻结动画（`* { animation-play-state: paused; transition: none }`），阻断交互（`pointer-events:none`）。
2. **内容增强 = (a)**：当克隆不可用（首屏无会话、或用户想看"任意主题 × 任意内容"矩阵）时，用 `ui-primitives` 渲染 markdown/代码/diff 的真实观感。
3. **兜底 = (d)**：静态骨架 + 真 token，用于「区域开关」这种需要可控合成演示的场景。
4. **不做 (b)**。

---

## 5. 区域清单：能否上背景 / 玻璃

| 区域 | 稳定钩子 | 可上背景图 | 可上玻璃 | 备注 |
|---|---|---|---|---|
| 整页/窗口底 | `body`（无 CSP）、`#root`、`#root > div:has([data-slot="sidebar"])` | ✅ 推荐 | — | 需先把 `bg-base` 改透明；darwin 用 `body > :not(#root)` 自动 no-drag |
| 侧栏 | `[data-slot="sidebar"]`（display:contents，不可承背景）→ 用其父/子树；颜色令牌 `--dsw-specific-sidebar-fill` | ✅（改令牌 + 结构选择器） | ⚠️ darwin 已自带 vibrancy 渐变（`AppFrame.module.css:110-125`），叠加玻璃会二次模糊 | **侧栏会话行无任何 data 钩子**，逐行背景不可行 |
| 会话正文（markdown） | `[data-conversation-region="chat"]`、`[data-chat-flow-kind]` | ✅ | ✅（容器级） | 正文 markdown 无专属属性，样式走语义标签后代 |
| 消息气泡 | 仅 `[data-chat-flow-kind]` + `data-message-attachments` | ⚠️ 需自建容器（无气泡钩子） | ⚠️ 同上 | `.bubble` 是哈希类 |
| 代码块 | `.md-code-block`、`[data-code-block-banner]`、`[data-code-block-content]`、`--shiki-background`（`ui-theme/src/styles/shiki.css:9`） | ✅ | ✅ | 官方在此声明了「稳定语义钩子」 |
| Diff / 读文件 / 搜索 / 终端 | `[data-diff]`、`[data-read]`、`[data-search]`、`[data-terminal]` | ✅ | ✅ | `base.css:94-100` 已把它们列入特殊排版组 |
| 工具行 | `[data-tool]`、`[data-caption]`、`[data-change]`、`[data-inspect]`、`[data-tone]`、`[data-expandable]` | ✅（行级） | ⚠️ 行高固定，模糊会露边 | `ToolRow.tsx` 内还有 `[data-shimmer]` |
| composer | `[data-conversation-region="composer"]`、`[data-composer-seat]`、`[contenteditable][data-placeholder]` | ✅ | ✅（座椅是唯一稳定面） | composerSeat 自带 z-index，玻璃需注意与触发菜单的先后 |
| 设置浮层 | `role="dialog"`、`[data-shortcut-modal="settings"]` | ⚠️ 面板本身不宜放图 | ✅ 改 `--dsw-alias-bg-layer-2` / `--dsw-alias-settings-card-fill` | 面板走 layer-2，与页面背景解耦；遮罩走 `--dsw-mask-blur` |
| 菜单/浮层 | `role="menu"`、`[data-menu-material="translucent"]`、`MenuSurface` 材质层 | ❌ | ⚠️ 官方明令不得覆盖 | 覆盖 = 明确分叉（`docs/web-styling.md:26`） |
| 工具提示 | `role="tooltip"` | ❌ | ⚠️ | 小面积，收益低 |

---

## 6. 未知项：必须在活页面（真实 dsh Web/Desktop）上验

| # | 未知 | 为什么源码不足 | 怎么验 |
|---|---|---|---|
| U1 | `bg-base` 改透明后，还有哪些面意外变透（输入框、空态、滚动渐隐、boot 期占位） | 消费点分散在 200+ 个 `*.module.css`，静态扫描无法确定视觉后果 | 在真页面注入 `--dsw-alias-bg-base: transparent` 截图逐区域比对 |
| U2 | `:has()` 结构选择器在目标 Electron/Chromium 的实际支持 | 源码不含运行版本；`:has()` 需 Chromium 105+ | 桌面端 `CSS.supports('selector(:has(a))')` |
| U3 | Desktop（Electron）宿主的 CSP 是否放行 `data:`/`blob:` 背景 | 桌面渲染页自有 CSP，源码未给出完整策略 | 桌面端分别试 data:/blob:/远程三种 |
| U4 | 侧栏折叠态与 `[data-shell-leading]` 的几何（darwin）是否影响背景层 | 依赖窗口尺寸与 `data-window-drag` 几何合成 | 折叠/展开各截一次，检查拖拽区 |
| U5 | `[data-tool]` 的取值集合 | 只确认属性存在，未枚举取值 | 抓 DOM 统计 `data-tool` 去重 |
| U6 | 第二个 `iframe` 实例是否与主实例争用连接/会话 | `docs/` 无「单客户端」明文；`packages/client/connection` 未给结论 | 开两个标签页观察 WebSocket 与状态 |
| U7 | 视频背景 + 菜单 `backdrop-filter` 的实际帧率 | 无性能门禁可引用 | DevTools Performance，滚动 + 开菜单各 10s |
| U8 | 克隆 DOM 面板在不同缩放比下的文字锐度 | 依赖 `transform: scale` 的合成 | 100%/125%/150% DPI 各看一次 |

---

## 附：可直接复用的官方机制

| 需求 | 官方机制 | 位置 |
|---|---|---|
| 全局改 token | `theme.overrideTokens(source, tokens)` + `theme/change` 事件 | `packages/client/ui-theme/src/client/index.ts:466-486`（校验：裸字符串或缺一对明暗会抛 TypeError）、`:550`（`provide('theme')`） |
| 读取官方 token 清单 | `BUILTIN_INSPECT_TOKENS`（14 项：bg-base/layer-1/layer-2/overlay、border-l1/l2、brand、label-primary/secondary、state-*、`--dsw-specific-sidebar-fill`） | 同上 `:137-152` |
| 注入插件样式表 | `style[data-plugin][data-plugin-css="<id>/<name>"]`，随 effect 增删 | `packages/client/ui-theme/src/client/styles.ts:28-40` |
| 主题声明结构 | `ThemeDefinition { id, colorScheme, tokens }`、`ThemeTokenModes { light, dark }`、`ThemeSnapshot { preference, fontSizes, fontFamilies, active, themes, revision }` | `ui-theme/src/client/index.ts`（导出类型） |
| 索引注入 | `IndexInjection` = global / script / script-src / script-preload / style / html | `packages/host/webserver/src/injections.ts:15-31` |
