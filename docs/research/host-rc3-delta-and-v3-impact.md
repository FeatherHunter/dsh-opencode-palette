# 宿主 0.2.1-rc.3 变更全量核查与 V3 影响判定

> 调查日期：2026-10-24。基线：rc.2 = `687f282e8625c6b8d11ff58211a90524be2e4317`，目标：rc.3 = `1f81c047fc48fa190a683e469daa699857e9afe8`。
> 方法：把 rc.3 tag 取进本地 rc.2 稀疏检出（`D:\Temp\dsh-src`，`git fetch origin refs/tags/dsh-v0.2.1-rc.3`），做真实 `git diff` + 逐文件字节比对；token 计数按本仓既有口径（`ui-theme/src/styles/*.css` 里 `--name:` 声明去重）在**两个 commit 上分别重算**，而不是套用旧数；另下载 **npm 已发布产物**复核源码结论是否等于线上物。
> 每条结论都标了证据（GitHub blob URL 或本地 diff 命令/行号）。未确证项集中在 §7。

---

## §0 一页结论

**rc.3 存在**：tag `dsh-v0.2.1-rc.3` → commit `1f81c047fc48fa190a683e469daa699857e9afe8`，GitHub Release 发布于 2026-10-23T15:26:39Z，距 rc.2 共 **6 个提交 / 640 个文件**。

**主题面：零变更，零影响。** 三条独立证据互相印证：

1. `packages/client/ui-theme/src/styles/` 下 **9 个 CSS 全部 SHA256 相同**（不是"看起来没改"，是逐字节相同）。
2. 整个 640 文件 diff 里，**新增 0 条、删除 0 条** CSS 自定义属性声明（`^\+\s*--x` / `^-\s*--x` 双查为空）。所以 `425 / 403 / 11 / 11 / 222 / 184 / 38 / 182 / 602 声明` 全部原封不动。
3. 已发布 npm 产物 `@deepseek-ai/dsh-client-ui-theme@0.2.1-rc.3` 的 `lib/client.js` 里数出来仍是 **403 / 11 / 11 / 182**，与源码一致 → 结论对"用户实际装到的宿主"成立，不只是对仓库成立。

**机制面：零变更。** `overrideTokens`（`ui-theme/src/client/index.ts:369`）、`validateOverrides`（`:466`，名字零校验）、`composeActive`（`:405`）、body inline 写入 / `data-ds-dark-theme`（`ui-layout/src/client/theme-presenter.ts:17`、`:78-88`）、`claimStyles`（`modules/src/client/system.ts:76`）、CSS Modules 哈希 pattern（`tsdown.client.ts`）、窗口外壳探针 + `MutationObserver`（`apps/desktop/src/preload-windows.ts:21-50`）、`setTitleBarOverlay`（`apps/desktop/src/main.ts:1059`）—— **全部字节相同**，连行号都还能照旧引用。

**rc.3 真正的增量在 DOM 层，不在契约层**（4 条，全部是**加**，没有一条是改或删）：

| # | 变更 | 对 V3 的性质 |
|---|---|---|
| 1 | 新增 **3 个 root 作用域 list slot**（左侧栏面板列表 / 会话视图标签行 / 右侧栏 guide 各一个「更多」菜单）+ 新包 `ui-entry-customization`，且**默认打进 web bundle** | 新增能力：V3 可占这 3 个席位放自己的行 |
| 2 | 新增 DOM：3 个「更多」启动器（`button.panelRow` / `button.viewsMore` / `a.entry`，带 `aria-haspopup="menu"` + `aria-expanded`）+ 对应 portal 菜单 | 需新增兼容：`.panelRow` 选择器现在会**同时命中**「更多」按钮 |
| 3 | Tooltip 侧位新增 `'left'`（`TooltipSide` 四值），`.bubble` 加 `max-height`/`overflow`/`box-sizing`；DOM 出现 `data-side="left"` | 需新增兼容：按 `data-side` 分支的规则要覆盖第 4 个值 |
| 4 | 会话视图标签行改 `flex-wrap: wrap`（`gap` 36px→`16px 20px`），header 注释从「76px 定死」改为「可超过 76px」；侧栏面板列表 `gap` 4px→2px | 需改假设：几何不能按固定 76px / 固定间距算 |

**要不要改 V3 基准？不要。** 425 / 222 / 184 / 38 / 573 / 182 一个都不用改，`check` 逻辑也不用改（`src/` `scripts/` `tests/` 里没有任何一处把 403/425/222/184/573 写成断言，只有研究文档引用）。需要动的只有两类东西：(a) 四个**运行期实测**数（897 元素 / 4342 规则 / 156 哈希类 / 40 个 `data-slot` 值）必须重测而不是手改；(b) §4 里那 3 条 DOM 兼容注意要进 V3 的规则约束。

---

## §1 版本与获取方式

| 项 | 值 |
|---|---|
| Release 标题 / tag | `v0.2.1-rc.3` / **`dsh-v0.2.1-rc.3`**（注意有 `dsh-` 前缀，`v0.2.1-rc.3` 只是 display name） |
| tag → commit | **`1f81c047fc48fa190a683e469daa699857e9afe8`** |
| Release 发布时刻 | 2026-10-23T15:26:39Z（release 对象 `created_at` 2026-10-23T03:29:36Z） |
| 基线 rc.2 | tag `dsh-v0.2.1-rc.2` → `687f282e8625c6b8d11ff58211a90524be2e4317` |
| 提交数 / 文件数 | **6 个提交 / 640 个文件**（GitHub compare API 的 `files` 数组在 300 处截断，真实总数取自本地 `git diff --name-only \| Measure-Object`） |
| npm 已发布 | 是：`@deepseek-ai/dsh-client-ui-theme@0.2.1-rc.3`，registry 时间 2026-10-23T07:54:53Z，dist-tag `next`；tarball sha1 `92f24585793a840b68262f6a9504bb9862196982`（本地下载复核一致） |

6 个提交（`git log 687f282..1f81c04`）：

```
5ff29190ed  feat(ui): add navigation entry customization (#6247)
675164957a  feat(analytics): track navigation entries and preset selections (#6600)
39d2903841  fix(ui): separate navigation pins from selection and show menu icons (#6883)
c48f8523f2  feat(llm): follow the official /models listing on the DeepSeek API-key route (#6944)
d02ea370ee  release(dsh): 0.2.1-rc.3
1f81c047fc  Merge pull request #6999 .../release-dsh-0.2.1-rc.3
```

Release notes 正文只有 3 条用户可见变更（左侧栏/会话视图/右侧栏「更多」菜单、新会话草稿找回、API Key 模型列表刷新方式），**没有一个字提到主题/token/CSS**：
<https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.1-rc.3>

复现命令（本机已验证可跑通）：

```powershell
cd D:\Temp\dsh-src            # 已在 rc.2 的稀疏检出
git fetch --no-tags origin refs/tags/dsh-v0.2.1-rc.3:refs/tags/dsh-v0.2.1-rc.3
git rev-parse 'dsh-v0.2.1-rc.3^{commit}'   # 1f81c047fc48fa190a683e469daa699857e9afe8
git diff --stat 687f282e8625c6b8d11ff58211a90524be2e4317 1f81c047fc48fa190a683e469daa699857e9afe8 -- <path>
```

> 注意：该检出是 `blob:none` 偏稀疏克隆，`git diff`/`git show` 会按需拉 blob，首跑慢，结果正常。

---

## §2 token 面 diff

### 2.1 结论先行：9 个 CSS 逐字节相同

对 `packages/client/ui-theme/src/styles/` 下每个 `*.css` 取两次 `git show <sha>:<path>` 后比 SHA256：

| 文件 | rc.2 vs rc.3 |
|---|---|
| `base.css` / `corner-shape.css` / `design-platform.css` / `focus.css` / `gradient-shadow-text.css` / `onboarding.css` / `scrollbar.css` / `shiki.css` / `brand-font.css` | **9/9 相同** |

目录：<https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.1-rc.3/packages/client/ui-theme/src/styles>

### 2.2 数字对比（同口径，两个 commit 各算一遍）

计数式：`(--(dsw|shiki|dsh)-[A-Za-z0-9_-]+)\s*:` 去重，范围 `packages/client/ui-theme/src/styles/*.css`。

| 指标 | rc.2 | rc.3 | 差 |
|---|---:|---:|---:|
| `--dsw-*` 唯一声明名 | **403** | **403** | 0 |
| `--shiki-*` 唯一声明名 | **11** | **11** | 0 |
| `--dsh-*` 唯一声明名 | **11** | **11** | 0 |
| **三前缀合计（425 口径）** | **425** | **425** | **0** |
| `--dsw-font-*` | **182** | **182** | 0 |
| 颜色轴（alias 107 + specific 11 + shiki 11 + static 77 + focus 1 + menu 1 + shadow 4 + elevation 5 + gradient 3 + linear 2） | **222** | **222** | 0 |
| 颜色轴活名 / 死名 | **184 / 38** | **184 / 38** | 0 |

分文件 `--dsw-*` 唯一名（rc.3，各文件互不重叠，加总恰为 403）：

| 文件 | 唯一名 |
|---|---:|
| `gradient-shadow-text.css` | 193 |
| `design-platform.css` | 190 |
| `base.css` | 10 |
| `onboarding.css` | 7 |
| `focus.css` | 2 |
| `corner-shape.css` | 1 |
| `scrollbar.css` | 0（该文件贡献 `--dsh-*` 5 条） |
| `shiki.css` | 0（20 处声明 / 11 唯一 `--shiki-*`） |
| `brand-font.css` | 0 |

`--dsh-*` 11 名（rc.3 全量）：`--dsh-code-font-delta`、`--dsh-content-font-delta`、`--dsh-content-font-delta-secondary`、`--dsh-content-font-size-secondary`、`--dsh-font-family-code-default`、`--dsh-font-family-text-default`、`--dsh-scrollbar-thumb`、`--dsh-scrollbar-thumb-border`、`--dsh-scrollbar-thumb-hover`、`--dsh-scrollbar-track-margin`、`--dsh-scrollbar-width`。

`--shiki-*` 11 名：`--shiki-background`、`--shiki-foreground`、`--shiki-token-comment`、`-constant`、`-function`、`-keyword`、`-link`、`-parameter`、`-punctuation`、`-string`、`-string-expression`。

### 2.3 新增 / 删除 / 改名：全部为空

| 类别 | 数量 | 证据 |
|---|---:|---|
| 新增 token 名 | **0** | `git diff -U0 <rc2> <rc3>` 全仓查 `^+\s*--[A-Za-z]` → 空 |
| 删除 token 名 | **0** | 同上查 `^-\s*--[A-Za-z]` → 空 |
| 改名 | **0** | 无删 + 无增 ⇒ 无映射可给 |

> 这条比"CSS 没改"更强：它覆盖了**全仓 640 个文件**，所以也不存在"某个组件 CSS Module 偷偷新增了一个 `--dsw-*` 或 `--dsh-*` 声明"的情况。

### 2.4 线上产物复核（源码结论 = 用户装到的宿主）

npm tarball `dsh-client-ui-theme-0.2.1-rc.3.tgz` → `package/lib/client.js`（120212 B，CSS 内联在 JS 里）：

| 项 | 数 |
|---|---:|
| `--dsw-*` 唯一声明 | **403** |
| `--shiki-*` | **11** |
| `--dsh-*` | **11** |
| `--dsw-font-*` | **182** |

与本仓 `host-token-probe-136.md:196` 记的 rc.2 方法（"`resources/app.asar` 内联的 `lib/client.js` 与源码 `687f282` 的 403/唯一名完全一致"）同口径，结论对 rc.3 依然成立。

### 2.5 死名清单：38 个一个没动

死名不可能变多（无声明删除、无消费方删除），只可能变少（rc.3 新增的 CSS 若消费了某个死名，该名就"活了"）。逐条查过——**rc.3 全部新增 CSS 只引用了 3 个 token，且 3 个在 rc.2 就都是活名**：

| 新增引用 | 出处（rc.3） | rc.2 是否已有声明 | 是否在 38 死名里 |
|---|---|---|---|
| `--dsw-alias-label-secondary` | `ui-conversation/src/client/skeleton/ConversationRoot.module.css:265`（`.viewsMore`） | 是，`design-platform.css:223` | 否 |
| `--dsw-alias-state-business-primary` | `ConversationRoot.module.css:266`（`.viewsMoreActive`） | 是，`design-platform.css:240` | 否 |
| `--dsw-alias-interactive-bg-hover` | `ConversationRoot.module.css:270`、`ui-sidebar/src/client/SidebarRoot.module.css:531`、`ui-sidebar-right/src/client/tabs/guide/GuideBody.module.css:127` | 是，`design-platform.css:213` | 否 |

注意别把 `--dsw-alias-interactive-bg-hover`（活）和 `--dsw-alias-interactive-bg-hover-accent`（死，38 名之一）看混：前者一直是活的，后者在 rc.3 里仍然零消费。

⇒ **38 死名清单逐名不变；184 活名集合逐名不变。** 无需修订 `moddable-surface-registry.md:44-49` 与 `color-axis-token-inventory.md:94-110` 里的任何一条。

---

## §3 机制面 diff

### 3.1 判定表

逐文件 `git show` 比对（rc.2 vs rc.3），下列全部 **SAME（字节相同）**：

| 机制 | 文件 | 关键行（rc.3 与 rc.2 同） |
|---|---|---|
| 主题注册 / 覆盖 / 校验 | `packages/client/ui-theme/src/client/index.ts` | `overrideTokens` `:369`、`composeActive` `:405`、`validateOverrides` `:466` |
| body 级 token 快照 + 暗色开关 + theme-color | `packages/client/ui-layout/src/client/theme-presenter.ts` | `DARK_ATTRIBUTE='data-ds-dark-theme'` `:17`；`theme-color` meta `:57`；`body.style.setProperty` 字号 `:78`、字族 `:83`、token `:88`；跟踪清理 `:85-88`、`:104-106` |
| 插件样式认领 / 注入 | `packages/client/modules/src/client/system.ts` | `untaggedStyles()` `:67-68`；`claimStyles` `:76`；调用点 `:312`；`removeOwnedStyles` `:317` |
| CSS Modules 哈希 pattern | `packages/client/tsdown.client.ts` | 未改 |
| 窗口外壳（token→标题栏探针 + 观察者） | `apps/desktop/src/preload-windows.ts` | 探针 `:21-23`；`getComputedStyle` 取色 `:37-39`；IPC `:45`；`MutationObserver` 观察 `document.documentElement[lang]` / `body[data-ds-dark-theme,style]` / `head` 子树+字符 `:47-50` |
| `setTitleBarOverlay` | `apps/desktop/src/main.ts` | `:1059`（`titleBarOverlay` 初始化 `:216-217`，macOS `hiddenInset` `:223`） |
| Windows 标题栏菜单（shadow root + 宿主 token） | `apps/desktop/src/preload-menu.ts` | 未改 |
| markdown / 代码块 token 与全局类名 | `packages/client/ui-primitives/src/markdown/*` | **整个目录零改动** |
| 页面外壳 / CSP | `apps/web/index.html` | 未改（`apps/web` 只动了 `tsconfig.json`、`package.json`、e2e 用例） |
| 静态前端托管 | `packages/host/frontend-static/**` | 只 bump `package.json` 版本 |

结论：**注入通道 5 条（token 写入 / 样式表规则 / DOM 操作 / 资源媒体 / 字体）的宿主侧实现一条没变**；"名字零校验""body 内联压 `:root`""认领未标记 `<style>`""暗色靠 `body[data-ds-dark-theme]`""elevation 逐元素重声明"这些结论全部继续成立，连引用行号都能照抄。

### 3.2 变了什么（全部在 DOM / 布局层）

#### (1) 3 个新 slot（root 作用域，kind=list）

| slot | 声明位置 | 业主 props |
|---|---|---|
| `sidebar.panellist.actions` | `packages/client/ui-sidebar/src/client/contract/slots.ts:38` | `SidebarPanelActionsOwnerProps`（`entries/onOpen/onPinnedChange/onDismiss`） |
| `conversation.session.header.views.actions` | `packages/client/ui-conversation/src/client/contract/slots.ts:258` | `ConversationViewActionsOwnerProps`（同上签名） |
| `sidebar.right.tab.guide.actions` | `packages/client/ui-sidebar-right/src/client/contract/slots.ts:91` | `SidebarRightGuideActionsOwnerProps`（同上签名） |

文档：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/docs/subsystems/slots.md>（新增一段，`docs/subsystems/slots.md` +3 行）。

新包 `packages/client/ui-entry-customization/`（`src/client/index.ts` 56 行）向三个 slot 各注册一行，id 固定为 `'entry-customization'`；**默认进 web bundle**：

```yaml
# packages/bundle/web-app/cordis.patch.yml（rc.3 新增 5 行）
    - id: entry-customization
      name: '@deepseek-ai/dsh-client-ui-entry-customization'
```

⇒ 默认安装的 rc.3 会出现 3 个「更多」启动器与菜单（**只在对应 list 有注册时**才显示 More —— 但默认 bundle 恰好注册了，所以默认可见）。

#### (2) 新增 DOM 形态（这是主题插件唯一真正要看的）

| 区域 | 新元素 | rc.3 关键位置 |
|---|---|---|
| 左侧栏面板列表 | `button.panelRow` + `aria-haspopup="menu"` + `aria-expanded`，外层 `Menu` 用 `className={css.moreAnchor}`、`listClassName={css.moreMenu}` | `ui-sidebar/src/client/SidebarRoot.tsx`（`PanelMoreMenu`）；CSS `SidebarRoot.module.css:525` `.moreAnchor`、`:530` `.panelRow[aria-expanded='true']`、`:534` `.moreMenu` |
| 会话视图标签行 | `button.viewsMore`（22×22）+ `aria-expanded`，新类 `.viewsMoreAnchor` / `.viewsMore` / `.viewsMoreActive` / `.tabLabel` / `.viewsMoreMenu` / `.viewTabs` | `ConversationRoot.module.css:208` `.viewTabs`、`:254` `.viewsMoreAnchor`、`:258` `.viewsMore`、`:266` `.viewsMoreActive`、`:268` `.tabLabel`、`:274` `.viewsMoreMenu` |
| 右侧栏 guide | `a.entry[aria-expanded='true']` 包在 `.moreAnchor` 里 | `GuideBody.module.css:126-130` |

**`data-slot` 契约没变，但值的集合会长**：`ui-renderer/src/client/scoped-slots.tsx:1089-1098` 的注释与实现仍是"每个 slot 渲染点暴露稳定 `[data-slot="<key>"]` 包装（`display:contents`，布局中性）"，代码未改。三个新 slot 各有自己的渲染点 ⇒ 运行期 `data-slot` 不同值最多 **+3**（rc.2 实测 40）。

#### (3) Tooltip：`data-side` 多了第 4 个值

`packages/client/ui-primitives/src/tooltip-placement.ts:3`（**新文件**）：

```ts
export type TooltipSide = 'right' | 'left' | 'bottom' | 'top'
```

`Tooltip.module.css` 同步加了 `data-side='left'` 分支（`:36-37`），并把气泡改成可收缩：`max-height: calc(100vh - 24px)`（`:13`）、`overflow: auto`（`:14`）、`box-sizing: border-box`、`max-width: min(50vw, calc(100vw - 24px))`、`align-items: safe center`。

> 顺带：这是本仓 `theme-ceiling-absolute.md` 里没记的一条——**气泡现在会在内容过长时内部滚动**，如果 V3 给气泡做背景/毛玻璃，滚动条会出现在气泡内部。

#### (4) 布局：两个"定死"的数字松了

| 位置 | rc.2 | rc.3 |
|---|---|---|
| 会话视图标签行 | `.tabs { gap: 36px; }`（不换行） | `.tabs { gap: 16px 20px; flex-wrap: wrap; }` + 新增 `.viewTabs { flex-wrap: wrap; gap: 32px; }`（`ConversationRoot.module.css:193-211`） |
| 会话 header 高度 | 注释断言"下面任何一行都不许超过 76px"，`min-height: 76px` | 注释改为"视图与 More 放不下时该行换行，header 会长过 76px"；`min-height: 76px` 保留（`:16-24`） |
| 侧栏面板列表 | `.panelList { gap: 4px; }` | `gap: 2px;`（`SidebarRoot.module.css:486`） |

#### (5) 顺带的其他公开面变化（与主题无关，但插件 API 层有动静）

- `MenuItemButtonProps.current`（→ `aria-current="page"`）与 `Menu` 的 `minWidthFromAnchor` 是新 prop（`ui-primitives/src/Menu.tsx`）。
- 会话生命周期语义变了：`startSession` 改为"打开 `connectWorkspace` 解析到的那个 blank"，`DraftInitializationOptions` 新增 `whenDraftExists?: 'replace' | 'append' | 'keep'`；配套新升级指南 `docs/upgrade-guide/v0.2.1-rc.2/new-session-blank-reuse/guide.md`。**主题插件不调 `startSession`，无影响。**
- 产品分析新增 `trackEntryClick` / `more_menu_item_click` 等事件（`ui-sidebar`、`ui-conversation` 的 injected face 扩了字段）。
- 其余 640 文件里绝大多数是 `package.json` 版本 bump（每个包 `0.2.1-rc.2` → `0.2.1-rc.3`）。

---

## §4 对 V3 方案的逐项影响

| # | V3 依赖的 rc.2 事实 | rc.3 判定 | 要做什么 |
|---|---|---|---|
| 1 | token 命名空间 425（--dsw 403 + --shiki 11 + --dsh 11） | **无影响** | 不改。可加一行"rc.3 复核一致" |
| 2 | 颜色轴 222（活 184 / 死 38） | **无影响**（无增删名、无死名复活） | 不改 |
| 3 | `theme.overrideTokens(source, {name:{light,dark}})` 名字零校验 | **无影响**（`index.ts` 字节相同） | 不改；`:369` `:466` 行号仍可引 |
| 4 | body 级 token 快照（theme-presenter 写 body inline）/ `body[data-ds-dark-theme]` | **无影响** | 不改 |
| 5 | `claimStyles` 认领未标记 `<style>`、注入顺序 | **无影响** | 不改 |
| 6 | `data-slot` 锚点 | **新增能力 + 需补清单**：契约不变，值集合最多 +3 | 把 3 个新 `data-slot` 值补进锚点候选；运行期重测总数 |
| 7 | CSS Modules 哈希类名 `[hash]_[local]` | **无影响**（pattern 未改），但**新增类名** | 不改机制；新增类名清单见 §3.2 |
| 8 | `.panelRow` / `.tab` 等既有类名做选择器 | **需新增兼容（重要）**：`.panelRow` 现在**同时**是「更多」按钮的类；宿主自己新增了 `.panelRow[aria-expanded='true']` 与 `.panelRow[aria-haspopup]` 语义 | 规则里避免"一条 `.panelRow` 通吃"；若要区分，用 `[aria-haspopup="menu"]` / `[aria-expanded]` 反向排除 |
| 9 | Tooltip 只有 3 个 `data-side` | **需新增兼容**：第 4 值 `'left'` + 气泡可内部滚动 | 按 `data-side` 写的定位/箭头规则要覆盖 `left`；气泡背景规则要考虑内部滚动条 |
| 10 | 会话 header 高 76px、标签 `gap: 36px` 的几何假设 | **需改方案**：标签行会换行，header 可超过 76px | 禁止按固定头部高度算位置（任何 `calc()` 里写 76px 的地方改为不依赖） |
| 11 | 侧栏面板行间距 4px | **需改方案（小）**：2px | 若 V3 有按行高/间距推的几何，改成不假设 |
| 12 | 排版：182 个 `--dsw-font-*`（31 复合 + 151 长手）、`--dsh-*` 字号增量 | **无影响**（`gradient-shadow-text.css`/`base.css` 字节相同） | 不改 |
| 13 | 窗口外壳 `titleBarOverlay`：探针 + `MutationObserver` + `setTitleBarOverlay` | **无影响**（`preload-windows.ts`/`main.ts` 字节相同，`theme-ceiling-absolute.md:133` 的行号引用仍有效） | 不改 |
| 14 | 资源 / 字体 / 媒体能力、CSP、Shadow DOM、插件加载 | **无影响**（`index.html` 未改，`modules/src/client/system.ts` 字节相同） | 不改 |
| 15 | 滚动条 `--dsh` 变量 | **无影响**（`scrollbar.css` 字节相同；注意气泡新增内部滚动，见 #9） | 不改 |
| 16 | elevation 族元素级重声明（gated） | **无影响**（`gradient-shadow-text.css:17-44` 字节相同） | 不改 |

**新增能力（V3 可以拿去用，但非必须）**

| 能力 | 用途 |
|---|---|
| 3 个 root list slot | 主题插件可以在这 3 个「更多」菜单里各放一行（例如「打开主题设置」/「导出当前主题」），拿到的是官方 `onDismiss` + 本地化 `label` 席位，比自建悬浮球稳。注意：`scope: 'root'`，`kind: 'list'`，`id` 自己起；复用 shipped id 会**替换**宿主那行。参考实现：`ui-entry-customization/src/client/index.ts`（56 行，是这三个 slot 的最小可用样例）。 |
| `Menu` 的 `current` / `minWidthFromAnchor` | 若 V3 自建菜单（比如主题选择器），可以用 `aria-current="page"` 标当前项、用 `minWidthFromAnchor` 让菜单不窄于锚点。 |
| `tooltip-placement.ts` | 纯函数定位器（`placeTooltip`），若 V3 要自绘提示可复用同一套边距/翻转策略，视觉与宿主一致。 |

---

## §5 需要修正的基准数字与文档清单

### 5.1 不需要改的（结论：原样保留）

| 文档:行 | 现内容 | rc.3 状态 |
|---|---|---|
| `docs/research/color-axis-token-inventory.md:39-42` | 425 = 403+11+11 / 222 / 184 / 38 表 | **不变**（建议加一句 "rc.3 (`1f81c04`) 复核一致"） |
| `docs/research/color-axis-token-inventory.md:22-23` | 222 = alias 107 + … 分族 | 不变 |
| `docs/research/color-axis-token-inventory.md:94-110` | 38 死名逐名（dead static 17 / specific 3 / linear 2 / shadow 2 / alias 14） | 不变 |
| `docs/research/dsh-source-theme-token-surface.md:13` | 403 唯一名 / 602 处声明 | 不变（CSS 同字节 ⇒ 602 也同） |
| `docs/research/dsh-source-theme-token-surface.md:50-63` | 按 family 的唯一名/声明数表 | 不变 |
| `docs/research/dsh-source-theme-token-surface.md:277-282` | 182 = 30×6+2（31 复合 + 151 长手） | 不变 |
| `docs/research/dsh-source-typography-surface.md:277-282` | 182 排版名 | 不变 |
| `docs/research/moddable-surface-registry.md:39-42` | 425 / 222 / 184 / 38 | 不变 |
| `docs/research/moddable-surface-registry.md:79-87` | 573 构成（`--dsw` 415 + `--dsh` 71 + `--dsl` 20 + `--shiki` 11 + 组件局部 56） | **不变**——全 diff 无新增自定义属性声明，变量名集合只可能因"删除"缩小，而删除数也是 0 |
| `docs/research/theme-ceiling-absolute.md:109`、`:123`、`:126`、`:133-136` | 标题栏 / body 内联 / focus / 探针 的 file:line | **全部仍有效**（目标文件字节相同，行号不变） |
| `docs/research/palette-v3-structure.yaml:257-260` | `window.titleBar` 无 DOM 锚点、走 token 探针 | 不变 |
| `docs/research/palette-v3-structure.yaml:254-256` | `[role="tooltip"]` 锚点 | 不变（role 未改） |

### 5.2 必须重测、**不许手改**的四个运行期数

| 文档:行 | 数字 | 为什么会变 | 处理 |
|---|---|---|---|
| `docs/research/moddable-surface-registry.md:70` | 元素数（首屏）**897** | 新增 3 个 More 启动器 + 菜单（portal，打开时才在 DOM） | 重跑 Playwright 扫描；打开 3 个菜单各扫一次，首屏基线单独记 |
| `docs/research/moddable-surface-registry.md:71` | CSS 规则数 **4342** | 新增多个 CSS Module 类规则 | 重测 |
| `docs/research/moddable-surface-registry.md:72` | 哈希类名（唯一）**156** | 新增 `.moreAnchor`/`.moreMenu`/`.viewsMore*`/`.tabLabel`/`.viewTabs` 等 | 重测 |
| `docs/research/moddable-surface-registry.md:74` | `data-*` 属性名 **51** | `aria-haspopup`/`aria-expanded` 是 ARIA 不算 `data-*`；但只要宿主新增任何 `data-*` 就会变 | 重测 |
| `docs/research/moddable-surface-registry.md:75` | `data-slot` 不同值 **40** | 3 个新 slot 各一个渲染点 ⇒ 最多 +3 | 重测（注意右侧栏 guide 只在切到该 tab 时挂载） |
| `docs/research/moddable-surface-registry.md:76` | 带 inline style 的元素 **74** | 新组件带 `style`（如 `viewsMore` 的 `margin-top` 在 CSS 里，但 `Menu` 的 portal 定位写 inline） | 重测 |

> 纪律：这四个数是**实测**，rc.3 变了不是"文档错了"，是基线漂移。改法只有一条——重跑 `moddable-surface-registry.md §7` 的扫描脚本，把结果连"测量条件（视口、主题、是否开菜单）"一起写回去。

### 5.3 check 逻辑

**零改动。** 全仓 `src/` `scripts/` `tests/` 里没有任何一处把 `403 / 425 / 222 / 184 / 573` 写成断言或常量（grep 命中仅两处无关：`tests/custom-editor.test.ts:848` 的数字是像素历史注释，`tests/sync-verify.test.ts:353` 是 `'#222'` 色值）。这些数字只活在研究文档里，所以 `npm test` 不受影响。

### 5.4 建议补进 V3 规则约束的 3 条（属于"新增兼容"，不是"改基准"）

1. **选择器扇出**：`.panelRow` 现在是"面板行 + 更多按钮"共用类；凡按 `.panelRow` 写整行样式的规则，必须显式排除 `[aria-haspopup="menu"]`，否则「更多」按钮会继承面板行的 hover/active 视觉（宿主自己就是用 `[aria-expanded='true']` 单独处理它的）。
2. **几何不假设**：会话视图标签行会换行、header 可超 76px；侧栏面板行间距 2px。任何 `calc()` 里出现的固定头部高度都要重写。
3. **Tooltip 第 4 侧位 + 内部滚动**：`data-side` 现有 `right|left|bottom|top`；`.bubble` 有 `overflow:auto`，长内容时气体内部出滚动条。

---

## §6 证据索引

**版本事实**
- Release：<https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.1-rc.3>
- tag→sha：`curl https://api.github.com/repos/deepseek-ai/deepseek-harness/tags` → `dsh-v0.2.1-rc.3 -> 1f81c047fc48fa190a683e469daa699857e9afe8`
- 6 提交 / 640 文件：compare API `ahead_by=6`；`git diff --name-only 687f282e... 1f81c047f...` 计 640
- npm：<https://registry.npmjs.org/@deepseek-ai%2Fdsh-client-ui-theme/0.2.1-rc.3>（`dist.shasum=92f2458…`，与本地 tarball sha1 一致）

**token 面**
- 9 个 CSS（rc.3）：<https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.1-rc.3/packages/client/ui-theme/src/styles>
- `design-platform.css`：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/packages/client/ui-theme/src/styles/design-platform.css>（`:213` interactive-bg-hover、`:223` label-secondary、`:240` state-business-primary）
- `scrollbar.css` / `shiki.css`：同目录
- 零增删声明：`git diff -U0 687f282e 1f81c047f | Select-String '^[+-]\s*--[A-Za-z]'` → 空

**机制面**
- `ui-theme/src/client/index.ts` `:369` / `:405` / `:466`：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/packages/client/ui-theme/src/client/index.ts>
- `ui-layout/src/client/theme-presenter.ts` `:17` `:57` `:78-88` `:104-106`：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/packages/client/ui-layout/src/client/theme-presenter.ts>
- `modules/src/client/system.ts` `:67-68` `:76` `:312` `:317`：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/packages/client/modules/src/client/system.ts>
- `apps/desktop/src/preload-windows.ts` `:21-23` `:37-39` `:45` `:47-50`：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/apps/desktop/src/preload-windows.ts>
- `apps/desktop/src/main.ts` `:216-223` `:1059`：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/apps/desktop/src/main.ts>
- `ui-renderer/src/client/scoped-slots.tsx` `:1089-1098`（`[data-slot]` 锚点契约）：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/packages/client/ui-renderer/src/client/scoped-slots.tsx>

**DOM / 新能力**
- `ui-sidebar/src/client/contract/slots.ts:38`：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/packages/client/ui-sidebar/src/client/contract/slots.ts>
- `ui-conversation/src/client/contract/slots.ts:258`：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/packages/client/ui-conversation/src/client/contract/slots.ts>
- `ui-sidebar-right/src/client/contract/slots.ts:91`：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/packages/client/ui-sidebar-right/src/client/contract/slots.ts>
- `ui-entry-customization/src/client/index.ts`：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/packages/client/ui-entry-customization/src/client/index.ts>
- `docs/subsystems/slots.md`（三个新 slot 的说明段）：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/docs/subsystems/slots.md>
- `ui-primitives/src/tooltip-placement.ts:3`：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/packages/client/ui-primitives/src/tooltip-placement.ts>
- `ConversationRoot.module.css:193-211,254-274`：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/packages/client/ui-conversation/src/client/skeleton/ConversationRoot.module.css>
- `SidebarRoot.module.css:486,525,530,534`：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/packages/client/ui-sidebar/src/client/SidebarRoot.module.css>
- `bundle/web-app/cordis.patch.yml`（`entry-customization` 进默认 bundle）：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/packages/bundle/web-app/cordis.patch.yml>

**本仓被引用的基线**
- `docs/research/moddable-surface-registry.md:39-42`（425/222/184/38）、`:44-49`（死名清单）、`:66-89`（运行期实测 6 项 + 573 构成）、`:117-125`（A–F 分层）
- `docs/research/color-axis-token-inventory.md:22-23`、`:39-42`、`:94-110`、`:139-158`
- `docs/research/dsh-source-theme-token-surface.md:13`、`:50-63`、`:277-282`
- `docs/research/theme-ceiling-absolute.md:109`、`:123-127`、`:133-136`
- `docs/research/palette-v3-structure.yaml:257-260`、`:254-256`

---

## §7 未确证项

1. **运行期实测数未重跑**。897 元素 / 4342 规则 / 156 哈希类 / 51 `data-*` / 40 `data-slot` / 74 inline-style 是 rc.2 时用 Playwright 扫出来的；本轮没有起宿主实例（需要装好 rc.3 + 本插件再扫描），所以 §5.2 只给"会变"的机制判断，不给新数字。**573 例外**：它可以从"全 diff 零增删声明"直接推出不变。
2. **3 个新 slot 的 `data-slot` 是否默认渲染**。机制上每个 slot 渲染点都有 `[data-slot]` 包装（`scoped-slots.tsx:1089-1098`），但三个 More 区域"只在 list 有注册时才显示"——默认 bundle 注册了 `entry-customization`，所以推定为可见；实际 DOM 未实测。右侧栏 guide 那个还要求用户先切到 guide tab。
3. **桌面版产物未验证**。`apps/desktop` 只 bump 了 `package.json` 版本，但 rc.3 的 Electron 安装包是否随之发布、装出来的 `app.asar` 内联 `client.js` 是否仍等于源码，未比对（只比了 npm 上的 `ui-theme` 包）。
4. **Release notes 与代码不完全对应**。notes 只写了 3 条用户可见变更，没提「更多」菜单的 3 个 slot/包（那是 #6247 的实现细节），也没提 tooltip/布局改动；这三块的意图是从代码与 `docs/subsystems/slots.md` 反推的。
5. **视觉未截图确认**。三个 More 启动器的实际外观（22×22 图标、菜单 288px / guide 480px 宽）只从 CSS 读出，没有截图佐证；V3 若要对它们做视觉打磨，仍需实机看一眼。
6. **`--dsw-*` 声明数 602 的 rc.3 值**未单独重算（只重算了"唯一名 403"与"182"）。因为 CSS 字节相同，602 必然相同，但这属于推理而非实测，故记在此处。
