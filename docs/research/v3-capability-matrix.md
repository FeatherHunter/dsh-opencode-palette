# V3 能力矩阵：真实 DSH 源码给出的最大能力集

> 目的：在动笔写 V3 规格之前，先用官方源码把"能做 / 只能绕 / 做不到 / 不可依赖"钉死，作为 24 条升级计划的判据。
>
> 源码锚点：`D:\Temp\dsh-src`，commit `687f282`（v0.2.1-rc.2，sparse checkout）。文中 `path:line` 均相对该目录。
>
> 取证来源（同目录四份侦察文档）：
> - `dsh-source-theme-token-surface.md` — token 面（403 唯一 `--dsw-*` / 602 声明 / 注入位置 / 保护面）
> - `dsh-source-plugin-capability-surface.md` — 插件能力面（全信任模型 / 客户端 bundle / 三条宿主通道 / 席位）
> - `dsh-source-typography-surface.md` — 排印面（3 入口 / 30 角色 / 无行高轴 / 终端只走 JS / 零 CJK）
> - `dsh-source-dom-regions-preview.md` — DOM 区域与预览保真（待回填）
>
> 状态：四域全部已归档（2026-10-20）。

---

## 0. 三句话结论

1. **权限上比预想宽**：外部插件是全信任 in-process Node 代码（唯一准入是 `engines.dsh`，`packages/boot/app-boot/README.md:52`），客户端可注册 frame-wide 的 `shell.overlay` 与 `settings.section`，`ctx.theme.overrideTokens` 接受**任意** CSS 变量名（`packages/client/ui-theme/src/client/index.ts:369-378`，名字零校验 `:466-486`）。V3 里"自定义区域背景 / 玻璃 / 保真预览"这类需求，权限不是瓶颈，**实现细节才是**。
2. **三个真天花板**：① 排印**没有行高轴**——45 处组件用 `calc(<基准>px + δ)` 现算行高，29 个固定 `height` 绑在**字号** delta 上，全局改行高会错位（`gradient-shadow-text.css:57-63`、`MessageItem.module.css:57`）；② 材质有写死项——`--dsw-mask-blur` 固定 `none`（`design-platform.css:19`）、darwin 把 `--dsw-specific-menu` 钉到 94% 不透明（`:403/:407`），"遮罩玻璃"不可靠；③ 终端字号/字族**只走 JS**（`theme.fontSizes.terminal` → xterm，`ui-sidebar-terminal/src/client/terminal.tsx:85-93`），CSS 变量 `--dsh-terminal-font-size` 零消费者。
3. **"全量"必须重新定义**：403 个 `--dsw-*` 里约 180 个是有效名（150 个 per-role 字体 longhand 有 149 个无消费方）；排印真正被组件消费的是 30 个 composite（103 处引用）+ `--dsw-font-family`（17 处）；另有 529 处硬编码 `font-size` / 421 处 `line-height` 散在 209 个组件 CSS Modules 里。如果 V3 规格承诺"任意 token 全可配"，用户会得到大量转不动的旋钮。

---

## 1. 能力分级定义（贯穿全表）

| 级别 | 定义 | 稳定性 |
| --- | --- | --- |
| **T0** | 官方用户设置项（当前 3 字号 + 3 字族，`theme-settings.ts:24-147`） | 文档承诺，跨版本 |
| **T1** | 官方插件 API / 可注册席位：`ctx.theme.register/overrideTokens`、`settings.section`、`shell.overlay`、`main/sidebar/rightbar`、`locale.addLanguage`、`connection.fetch.register`、`GET /api/file`、`ctx.fs`（文本子集）、`ctx.commands/settings/jobs/storage`、`ctx.setInterval`、`configForms`、`shortcuts` | 文档承诺，但签名会演进 |
| **T2** | 普通运行时能力（无官方契约，但机制稳固）：客户端注入 `<style>`（`data-plugin` 认领、卸载即清，`modules/src/client/system.ts:66-82`）、body 级变量覆盖、`node:fs`、`child_process`、`global fetch`、`<img>/<video>`、自建 exact route（Range/大视频）、只读 DOM | 可用，但宿主改造可能破坏 |
| **T3** | 依赖宿主内部实现：宿主 CSS Modules 类名、内部组件选择器、React 重渲染后的 DOM 改写、iframe 复用整页、逐元素 elevation 覆盖 | 明确易碎，必须探针+降级 |
| **T4** | 不可达：自定义前端路由/页面、新 `ctx.remote` 命名空间（build-time typert 仅宿主 ts.Program 可生成）、改宿主组件或设置 schema、插件沙箱、市场侧代码审查 | — |

> 外部插件**没有运行时强制**：menu/elevation/radius/scrollbar/focus 的守卫全是 in-tree vitest（`menu-surfaces:106-113` 等），`stylesheet-scan.ts:16/81-101` 只扫 `packages/`、看不见 npm 外部包。所谓"保护条款"对我们只是**约定**——可以越，但要为版本升级后的翻车负责。

---

## 2. 分域事实

### 2.1 Token 面

- **规模**：403 个唯一 `--dsw-*`、602 处声明，6 个 sheet（design-platform 382 / gradient-shadow-text 196 / base 11 / onboarding 10 / focus 2 / corner-shape 1）。family：static 77、alias 107、font 182、specific 11、radius 6、elevation 5、shadow 4、linear 2、gradient 3、menu 2、focus-ring 2、corner 1、mask 1。268/602 声明值含 `var()`，13 处 `color-mix`；dark 不是计算，是 light 的逐名重声明。
- **注入位置是硬约束**：调色板/排版/elevation 全部声明在 **body**（`design-platform.css:4/85/166/284`、`base.css:29`、`gradient-shadow-text.css:1/31/42`）；只有 radius/motion/corner/focus-width/shiki/家族默认在 `:root`（`base.css:6-24`、`focus.css:3`、`corner-shape.css:18`）。→ 插件往 `:root`/`html` 写变量会被 body 自身声明遮蔽，必须 body 级注入并压过 0-1-1（macOS `--dsw-specific-menu` 需 0-1-2）。
- **官方 API 形状**：`ctx.theme.register` 单 `colorScheme`（`client/index.ts:336`，`ThemeDefinition` `:71-81`）；`ctx.theme.overrideTokens` 的值必须 `{light,dark}` 成对（唯一强制成对点），名字零校验、可自创新名；层按 seq 折叠取 `modes[active.colorScheme]`（`:405-414`）；注册顺序=数组顺序，builtin light/dark 在前（`:132-135`）。
- **落地机制**：8 个 `<style>` 进 head（`styles.ts:28-40`，ui-theme 自身 **0 个 `!important`**）；主题快照以 **body 行内样式**写入（`ui-layout/theme-presenter.ts:87-90`），顺序 html color-scheme → `data-ds-theme-source` → `body[data-ds-dark-theme]` → 字号/家族 → token（`:69-93`），撤销只撤自己写过的名字。
- **T1 有效名约 180**：5 类名字因组件局部重绑而不可达（`--dsw-elevation-*` 被逐元素声明 `body, body *` 盖住 `:31-40`；≥10 组件重绑 `--dsw-elevation-stroke-color`；约 15 处重绑 `--dsh-scrollbar-thumb`；`--shiki-foreground/background` 在 `:root` 引用 body 级 alias（`shiki.css:8-9`）计算期无效，被 `CodeBlock.module.css:92-94` 的 `!important` 兜住）。
- **玻璃可行性**：菜单玻璃=2 个 token（`--dsw-menu-surface-fill` + `--dsw-menu-backdrop-filter`），运行时不禁；但 darwin 的 `--dsw-specific-menu` 钉 94% 不透明、`--dsw-mask-blur` 写死 `none` 且与 `web-styling.md:27` 冲突 → **浮层玻璃可行，遮罩玻璃不可靠**。

### 2.2 插件能力面

- **信任模型**：全信任 in-process Node；准入只查 `engines.dsh`（`app-boot/README.md:52`）；无网络/fs 白名单、无代码审查；市场是第三方内容（`docs/user/guide/plugin-market.md:34`）。分发= `dsh.bundle.patch` + `dsh plugin add`（`docs/user/develop/basic/publish.md:5,13`），bundle → profile → `$DSH_HOME` → `--patch` 分层，后层整行替换（`app-boot/README.md:61`）。
- **客户端 bundle**：`dsh.client{platform:'web'}` + `exports["./client"]` + `inject/immediately/external`（`docs/subsystems/client-modules.md:94,17`；`packages/client/AGENTS.md:66`）。必须是**预构建 lazy-CJS factory**（`docs/cookbook/adding-a-settings-card.md:60`）；官方 tsdown preset **未发布**，外部仓得自己复刻。共享表只有 React/Cordis/zod/react-virtual + `dsh-client-{store,ui-slots,ui-primitives,ui-dockkit}`（`packages/client/web/src/platform.ts:9-20`）→ 必须用宿主同款 React。
- **客户端 ctx**：slots、theme、locale、connection、configForms、shortcuts、uiWorkspace、resources… **没有** router / modal / http / fs 服务。
- **可注册席位**：`settings.section`（`ui-agent-preset/src/client/index.ts:266`）、`settings.general.item`、**`shell.overlay`（list/root，官方措辞是 "the additive seat for a frame-wide surface of your own"，`ui-layout/src/client/index.ts:105`）**、`main`（按 sidebar id，`:73`）、`sidebar`/`rightbar`（单/替换 `:68,87`）。`register(options, Component)`；注册未声明 slot 会抛。
- **CSS/i18n**：factory 内注入的 `<style>` 以 `data-plugin=<id>` 认领、卸载即清（`modules/client/system.ts:66-82`）；`addLanguage` + `register(ns, locale, dict)` 明确对外部插件开放（`locale/README.md:53`）。
- **宿主通道只有三条**：① 已生成的 `ctx.remote.<ns>`（`docs/api-gateway.md:80-82`，新命名空间 T4）；② 自有 exact route `connection.fetch.register({path, methods, requestBody, fetch})`——T2，必须 `/api` 前缀、`(path,method)` 唯一、body 缓冲、非 owner 403（`connection/README.md:12`、`tests/fetch-routes.host.spec.ts:36-111`）；③ 内置 `GET|HEAD /api/file?path=<abs>`——任意绝对路径、mime-types、**20 MiB 上限、无 Range**、`private,no-store`（`session-controller/README.md:87`）。本插件已在正确使用 ②（`runtime/host.ts:448`，`register` 缺失时降级）。
- **宿主侧**：`ctx.fs` 是 T1 但**纯文本、无 mkdir/unlink/rename**、目标不透明、可能被 fs-sandbox（`filesystem.md:5,278,431,445,270`）→ 目录/资源必须 `node:fs`（T2，不沙箱）；`ctx.subprocess` 只是抽象 seam（`subprocess.md:267`），`child_process` 是直接 T2 路径；周期任务用 Cordis `ctx.setInterval`（`cordis-api/inherited.md:19`），**没有插件 cron seam**；`ctx.webServer` 虽 T1 但在 `/api` 鉴权围栏**之外**——不得用它发文件。
- **对 24 条的关键五判**：(a) 扫描"JSON+图/视频"目录 = T2（`node:fs`；`ctx.fs` 只够读文本）· (b) 本地媒体进浏览器 = T1 走 `/api/file`，要 Range/大视频就自建 exact route（T2）· (c) 拉远端排行榜 JSON = T2（`global fetch`，无 `ctx.http`，schema/超时/代理自己扛）· (d) `git clone` 投稿流程 = T2（`child_process`，**无审批门**，风险全在我们）· (e) 主题/排印 = T1（`ctx.theme`），任意 CSS = T2，宿主内部选择器 = T3。

### 2.3 排印面

- **官方可改面只有 3 字号 + 3 族**：`--dsh-content-font-size` 10–22/默认 14、`--dsh-code-font-size` 10–16/11、`--dsh-terminal-font-size` 10–20/13；`--dsh-font-family-{text,code,terminal}`（契约 `theme-settings.ts:24-147`）。
- **一条轴不是两条**：字号 → delta/secondary（`gradient-shadow-text.css:57-63`）→ 14 个 Markdown 角色 × 6 token（`:65-183`，composite 被 103 处引用）+ 13 档静态阶梯（`:185-274`）；另有 150 个 per-role longhand，**149 个无消费方**。
- **没有全局行高**：壳层 body 只设 font-family/smoothing/`text-autospace`（`web/src/base.css:11-33`）；行高要么是 px token（UI 阶梯 `:188/:209`），要么组件 `calc(基准px + δ)`（45 处）；**29 个固定 height 绑在字号 delta 上**（不绑行高）→ 全局改行高会错位图标盒、压缩卡头、终端/搜索块、`li::marker`、10 处 line-clamp。
- **行内代码陷阱**：`MarkdownText.module.css:167-169` 先给 token 再 `font-size: 0.875em !important` → 实际 = 正文 × 0.875，与 `--dsh-code-font-size` **无关**；官方 README:32「行内码大 1px」不成立，此前 `.scratch` 普查 C8「code 固定 12px/19px」也不对（源码是 `calc(12px + codeδ)`，`:163-168`）。
- **代码块 banner** 写死 11px/18px 且用**正文字族**（`CodeBlock.module.css:47-49`、`CodeCard.module.css:20`）；表格内 code 写死 11px（`MarkdownText.module.css:274`）。
- **终端只走 JS**：`--dsh-terminal-font-size` **零 CSS 消费者**，经 `theme.fontSizes.terminal` 进 xterm（`terminal.tsx:85-93`），第四套栈 `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`（`:169-173`），refit = FitAddon + ResizeObserver + `min(dim, environment.maxCols/maxRows)`（`:175-183`）。
- **硬编码规模**：209 个组件 CSS，`font-size:Npx` 529 处/126 文件、`line-height:Npx` 421 处；只有 31 个文件吃字号轴；`--dsw-font-family` 仅 11 个文件消费。
- **字体**：四套互不相干的栈（正文/代码/品牌/终端）；用户列表**前置**、内置栈重复兜底（`base.css:29-34`）；Montserrat 只服务 Desktop 引导/欢迎页；**全仓零 CJK 字体、零 `unicode-range`**。
- **多语言**：locale 只维护 `html[lang]`=zh-CN|en（`locale/src/client/index.ts:148-152`），**没有"按语言选字体"概念**；`:lang()` 有先例（`DesktopOnboarding.module.css:50/55/303`、`TrajectoryTable.module.css:119/434`）→ 按脚本换字体只能插件自带 `@font-face` + `unicode-range`，且要压过系统 PingFang/YaHei。

### 2.4 DOM 区域与预览保真

- **骨架三层**：`html[data-platform]` → `body[data-ds-dark-theme][data-ds-theme-source]`（`ui-layout/theme-presenter.ts:17,28`）→ `#root`（`apps/web/src/main.ts:19`）；区域由 `AppFrame.tsx:258-307` 一次摆好：`[data-slot="sidebar"]`、`[data-shell-overlay]`、`[data-shell-bottom]`、`[data-shell-leading]`，帧上带 `data-sidebar-collapsed` / `data-rightbar-*` / `data-dragging` / `data-animating`。
- **可依赖的钩子**：`[data-slot]`（`display:contents`，自身不能承背景）、`[data-shell-*]`、`[data-conversation-region|session|content]`、`[data-composer-seat]`（`ConversationContent.tsx:184-198`）、`[data-chat-flow-kind|node-key|turn]`（`ChatNodeSeat.tsx:150-156`）、`[data-tool…]`、`[data-diff|read|search|terminal]`（`base.css:94-100`）、字面类 `.md-code-block`（`CodeBlock.tsx:188-194` 注释自称 stable semantic hooks）、`[role=menu|dialog|tooltip]`、`[data-menu-material]`。**不可依赖**：所有 CSS Modules 哈希类。**负面发现**：`ui-sidebar/src` 零个 `data-*` → 侧栏会话行没有稳定钩子，**逐行背景不可行**。
- **背景分层**：必须打通 4 个不透明面——`body`（`web/src/base.css:30`）、帧（`AppFrame.module.css:1-8`）、侧栏列（`--dsw-specific-sidebar-fill`，`:58-63`）、会话列（`ConversationRoot.module.css:5-7`）；设置面板走 `--dsw-alias-bg-layer-2`（`SettingsRoot.module.css:85-94`），不被 `bg-base` 改透明牵连。z-index 序：overlay 20 < 模态/设置 1000 < 菜单 portal 1100 → 页面级背景层放 `body` 下 `z-index:-1` 永远在浮层之下，且 `body > :not(#root)` 在 darwin 自动 no-drag（`base.css:69-71`），是唯一同时避开 app-region 与层叠问题的注入位。
- **玻璃**：官方只允许菜单有玻璃（`--dsw-menu-backdrop-filter: blur(40px) saturate(150%)`，`gradient-shadow-text.css:20`）；`--dsw-mask-blur: none`（`:19`），`docs/web-styling.md:26-27` 明文禁止覆盖菜单材质、遮罩故意不虚化 → 遮罩磨砂=主动分叉，升级必翻车。
- **媒体**：Web 宿主**无 CSP**（index.html/frontend-static/webserver 都没有），`<img>`/GIF/APNG/`<video autoplay muted loop playsinline>` 均可行；但只有 `client.<hash>.js` 能被服务（`modules/index.ts:193`），其它路径 404（`frontend-static/src/index.ts:88-99`）→ **没有静态目录**，资源只能 `data:` / `blob:` / 远程 `http(s)`（本地大文件走自建 `/api/file` 或 Range 路由）。
- **预览保真（推荐路线）**：平台单例表 11 项含 `ui-primitives`（`platform.ts:8-15` + seed）→ 第三方可 import MarkdownText/CodeBlock/DiffBlock/Menu/Modal；`ui-chat`/`ui-conversation` 不在表内**不可导入**。主预览=**同文档 DOM 克隆**（CSS 全局同一份，克隆即像素级；限制：只含已加载窗口、iframe/canvas 是空壳、动画/滚动需冻结、portal 节点在 body 别处），辅以 ui-primitives 渲染真 markdown/代码/diff，手搭静态兜底。**iframe 方案否决**：无前端路由、未知路径 404、无主题 query、会起第二个完整实例（含 WS 连接）。

---

## 3. 24 条 × 能力映射

图例：✅ 可做（T1/T2 内）· 🟡 可做但要绕/需改定义 · 🔴 受限或需砍 · ⏳ 待 DOM 侦察。

| # | 需求 | 判定 | 源码级依据 / 风险 |
| --- | --- | --- | --- |
| 1 | 37 参数 → 全量 theme token | 🟡 | T1 有效名 ~180（403 里 149 个字体 longhand 是死名）；5 类名字不可达；"全量"须重定义为"有效集 + 分区暴露" |
| 2 | 颜色/字体/字号/行间距全量 | 🟡 | 颜色 ✅；字体 ✅ T1（3 族）→T3（按内容类型）；字号 ✅（3 入口 + 30 composite）；**行间距 🔴 无独立轴**，只能角色级 + 补丁 |
| 3 | 玻璃状态 | 🟡 | 浮层/菜单玻璃 ✅（2 token，运行时不禁）；**遮罩玻璃 🔴**（mask-blur 写死 none）；面板玻璃需逐元素 elevation 覆盖（T3） |
| 4 | 区域背景（静图/动图/视频） | 🟡 | Web 宿主**无 CSP** → img/GIF/APNG/`<video autoplay muted loop playsinline>` 均可行；但**无静态目录**（只有 `client.<hash>.js` 被服务，其它路径 404，`frontend-static/src/index.ts:88-99`），媒体只能 data:/blob:/远程或自建路由；区域钩子稳定（`[data-shell-*]`/`[data-conversation-*]`/`[data-composer-seat]`/`[data-diff]`），但需先把 4 个不透明面改透；**侧栏会话行无稳定钩子 → 逐行背景不可行** |
| 5 | 代码块/正文等多内容类型的多语言文字设置 | 🟡 | 内容类型：30 composite 可映射，行内码被 `!important` 锁；多语言：官方无概念，需 `:lang()`+`unicode-range`（T3） |
| 6 | 行间距设置 | 🔴 | 同 #2；全局行高会错位 29 个固定高度 + 10 处 line-clamp，只能按角色小步调 + 自测 |
| 7-8 | 新 JSON schema 版本区分 + 兼容老 JSON | ✅ | 纯数据层设计，无宿主依赖；老 37 参数本来就映射到 token 默认值 |
| 9-10 | 预置/用户主题目录 + 资源同目录 | ✅ | T2 `node:fs`；预置用 bundle 相对路径；用户目录在 `$DSH_HOME` |
| 11 | 几乎与 DSH 完全一致的预览区 | 🟡 | 平台单例表含 `ui-primitives`（`platform.ts:8-15`+seed）→ 可 import MarkdownText/CodeBlock/DiffBlock/Menu/Modal；`ui-chat/ui-conversation` 不可 import。**首选同文档 DOM 克隆**（CSS 全局同一份→像素级；限制：只含已加载窗口、iframe/canvas 空壳、动画/滚动需冻结、portal 在 body 别处），辅以 ui-primitives 渲真 markdown/代码/diff，手搭静态兜底；**iframe 否决**（无路由、未知路径 404、无主题 query、第二实例含 WS） |
| 12-14 | AI 创作 prompt 弹窗/复制/二次创作 | ✅ | 纯前端（clipboard）；二次创作需新增 provenance 字段（开源许可） |
| 15 | 提交到线上（fork + 放目录 + PR） | ✅ | T2 `child_process git` + `global fetch`，无审批门 → 风险与体验全在我们这边设计 |
| 16-17 | 老编辑器改造 / AI 创作提示 | ✅ | UI 层 |
| 18 | 胶囊列表一键删除模式 + popconfirm | ✅ | UI 层（popconfirm 自建或 ui-primitives） |
| 19 | 点赞模式 + 生成 issue 模板 | 🟡 | 无后端：推荐"生成预填 GitHub issue URL"（用户点开即提交，零 token）；直接 API 提交需用户 PAT |
| 20 | 每日脚本 + 一人一票 + 作为排序依据 | 🔴 | 无官方后端/数据库；只能把 GitHub issue/labels/reactions 当存储（可行但脆），或自建服务（超出插件范围）→ 需拍板 |
| 21 | 按颜色组合分类 + 分类点赞排序 | 🟡 | 分类规则在数据层可做；排序依赖 #20 的存储方案 |
| 22 | 提交者小气泡特效（泡泡/爱心/太阳/玫瑰/火把） | ✅ | CSS/Canvas + `[data-shell-overlay]` 席位；绝对定位 + `pointer-events:none`，宿主无 CSP 可自由动效；注意别进 `[data-slot]`（`display:contents` 不能承位） |
| 23 | 现有 37 款主题升级 | ✅ | 数据/调色工作；关联已关闭的 #115 审计结论（37 预置 + 21 IP → 58 套），需按新 schema 重新定尺 |
| 24 | 所有可点击控件有交互效果 | ✅ | UI/CSS 层；成本在"覆盖全插件组件 + 不干扰宿主控件"的设计系统 |

---

## 4. 红线与既有契约（实现时不能忘）

1. **注入位置**：变量必须 body 级且压过 0-1-1；macOS `--dsw-specific-menu` 要 0-1-2。`:root/html` 写入对 body 无效。
2. **克制 `!important`**：ui-theme 自身 0 个 `!important`；我们的 `<style>` 一旦滥用，宿主升级/用户设置都会被吞。已确认两个必须对抗的点：行内码 `0.875em !important`、`CodeBlock.module.css:92-94` 的 shiki 兜底。
3. **材质约定**：菜单材质由 ui-theme 拥有（`--dsw-menu-surface-fill` + `--dsw-menu-backdrop-filter` 两 token）；遮罩玻璃不可靠；elevation 逐元素声明会被子元素盖住。
4. **版本漂移**：403 token 数字是 v0.2.1-rc.2 的事实，宿主实际跑的 desktop 构建可能略有差异；V3 必须带**宿主探针**（检测 token/类名/席位是否存在，缺失降级）。
5. **信任与风险**：对外部插件零运行时强制，但我们的代码可以 `git clone`、读写任意路径、发网络请求——因此"投稿/点赞/下载"这类流程要自己设审批与超时，不能假设宿主兜底。

---

## 5. 需实机验证清单（合并三份侦察的 unknowns）

- **主题落地**：`overrideTokens` 写入 vs 官方设置/`Cmd±` 快捷键的相互覆盖；插件 `<style>` 与 body inline 的最终胜负；类名哈希稳定性与卸载清理；darwin 特异性实战。
- **排印**：行内码 `!important` 实战表现；全局行高改动后的错位清单；xterm webfont 加载后是否 re-measure（源码无 `document.fonts.ready`）；`text-autospace` 实际效果。
- **性能/媒体**：`<video>` 背景的功耗与菜单 backdrop-filter 实时采样的帧率；`/api/file` 无 Range 时大图/视频表现；20 MiB 上限；Desktop 渲染页 CSP 是否放行 `data:`/`blob:`。
- **背景改透的连锁**：body/帧/侧栏列/会话列 4 个不透明面改透后哪些面意外变透；`:has()` 在目标 Electron 的支持度；`[data-tool]` 的取值集合。
- **预览**：DOM 克隆在真实会话里的完整性（窗口化只含已加载节点）、动画/滚动冻结方式、portal 节点处理。
- **席位/交互**：`shell.overlay` 的 pointer/focus/Esc 行为与 z-index；settings.section 外部插件注册的样式隔离；iframe 预览是否受 CSP/X-Frame-Options 限制。
- **存储/网络**：GitHub API 从客户端/宿主发起是否受 CORS/代理限制；issue 模板 URL 预填的可用性。

---

## 6. 交给第二轮拷问的决策点（草稿）

- **D1 全量边界**：直接暴露 ~180 有效 token？还是"语义分区（颜色/排印/材质/背景）+ 高级模式全表"？死名怎么标？
- **D2 排印模型**：只给官方 3 入口？还是角色级覆盖表（正文/标题/代码/行内码/终端/表格）× 注入补丁？行高按角色小步调是否值得做？
- **D3 玻璃范围**：A 只做菜单/浮层玻璃（守 `--dsw-menu-*` 两 token 契约，推荐）/ B 面板玻璃（需逐元素 elevation 覆盖，T3）/ C 遮罩磨砂（`--dsw-mask-blur` 写死 none，等于主动分叉，升级易翻车）。
- **D4 背景区域**：A 仅页面背景层（body 下 `z-index:-1`，天然在浮层之下，推荐）/ B + 对话列/设置面板（要先改透 4 个不透明面）/ C 逐行/逐气泡（侧栏行无稳定钩子，不可行）。媒体范围：静图/动图/视频三档是否都上？
- **D5 预览实现**：A 同文档 DOM 克隆 + ui-primitives 渲真内容（推荐，像素级但只含已加载窗口）/ B 纯 ui-primitives 手搭（可控但非像素级）/ C iframe（否决）。
- **D6 预置主题资源与 IP**：预置主题带不带图/视频？IP 主题（原神/库洛米等）是否维持"只色不带素材"？
- **D7 社区层（点赞/排行/投稿）**：存储与身份方案（GitHub issue/reactions 当库 vs 用户 PAT vs 自建服务）；是否独立成图（V3 只定数据契约）。
- **D8 波次**：24 条怎么切（建议：A 数据模型+排印+编辑器/预览 → B 玻璃+背景 → C 社区/投稿/特效）。
