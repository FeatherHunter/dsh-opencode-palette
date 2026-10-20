# 宿主样式压制注意表：`!important` 与 inline style

> 目的：DSH 宿主自己写的 `!important` 和 inline style，会让「我们设置了这个名字却看不到变化」。
> 本表把每一处查清、分类、标注「现在能不能绕、以后会不会自己活过来」，作为引擎与编辑器的**事实底稿**。
> 锚点：DSH 源码 `D:\Temp\dsh-src` @ `687f282`（v0.2.1-rc.2）；本仓 `src/engine/*`。
> 采集日期：2026-10-20。

## §0 一页结论

1. **量**：宿主全仓 CSS `!important` 共 **22 行** = `packages/client` 19 行（轨迹表 10 / markdown 文本 5 / 代码块 2 / 闪烁文本 1 / 终端 1）+ `apps/desktop/renderer` 辅助页 3 行。
2. **其中真正影响外观的只有 6 行 / 7 条声明**：代码块背景、markdown 颜色继承、闪烁文本颜色继承、终端光标（背景+字色）、轨迹事件背景、更新页错误红。其余 15 行是 padding / margin / overflow / 显隐，属排版与布局。
3. **7 条里有 5 条仍能经 token 层 / 祖先色绕过**（值是 `var()` 或 `inherit`）；真正被钉死的只有桌面「强制更新」辅助页的固定红 `#d93025`（不在主 UI）。
4. **`!important` 不总是敌人**：宿主写 `background: var(--dsw-...) !important` 时，我们改的是变量值，不需要跟它抢属性——这也是 token 层比 style 层稳的原因。
5. **本仓目前 0 条 `!important`**（`grep` 全仓 `src/`），所以现在打不过任何宿主 `!important`。这不是 bug，是「注意表」要暴露的第一个缺口。
6. **A 通道的 body 行内快照**由宿主自己写：`ui-layout/src/client/theme-presenter.ts:87-90` 把快照里的 token 逐个 `body.style.setProperty(name, value)`；它只回收自己写过的（`:85`、`:101-107`），**外来 inline 一律保留**。
7. **`overrideTokens` 名字零校验**（`ui-theme/src/client/index.ts:369-378`、`:466-486`）：任意 `--x` 名都能进快照、落 body；只校验值形状必须是 `{ light, dark }` 两个字符串。
8. **用户策略（2026-10-20，m00801 #4）**：不论宿主当前是否 `!important`，**我们一律允许设置、照常发规则**；本表只标「当前被压制」，不因此删规则——宿主哪天去掉，我们就自动生效。

## §1 级联速查（这张表的读法）

同一属性的优先级，从低到高：

| 优先 | 来源 | 例子 |
|---|---|---|
| ① | 作者普通规则 | `.x { color: red }` |
| ② | 元素普通 inline 声明 | `style="color: red"` |
| ③ | 作者 `!important` 规则 | `.x { color: red !important }` |
| ④ | 元素 `!important` inline | `style="color: red !important"`（宿主几乎不用） |

三条推论：

- 我们的 `<style>` 规则（①）**打不过宿主 inline（②）**；加 `!important`（③）才打得过。
- 我们的 `!important`（③）与宿主 `!important`（③）撞车时，比选择器 specificity，再比书写顺序（CSS Modules 的哈希类名 specificity 通常 0-1-0，我们的 `body …` 可更高，但依赖宿主类名不变 → **脆**）。
- **变量是另一条路**：宿主写 `property: var(--x) !important` 时，属性被它自己钉死，但值来自 `--x` → 我们改 `--x` 即可，不需要 `!important`。同理 `color: inherit !important` 跟祖先走，我们改祖先。

## §2 A 通道机制（为什么 token 能改）

```
theme.overrideTokens(source, { '--dsw-…': { light, dark } })
  → ui-theme composeActive() 合并层（index.ts:405-414）
  → snapshot.active.tokens
  → ThemePresenter.apply()（ui-layout/src/client/theme-presenter.ts:69-93）
  → body.style.setProperty(name, value)            ← 行内快照，就在这里
```

另外注意：presenter 还会写 `html` 的 `color-scheme`（`:71`）、`html[data-ds-theme-source]`（`:72`）、`body[data-ds-dark-theme]`（`:75`）、以及一个 `meta[name="theme-color"]`（`:91-92`，取 body 计算背景色）。所以「body 行内 token 快照」= A 通道的落点，不是我们自己写的。

本仓的调用点：`runtime/client.ts:735-743`（`tokenDispose = theme.overrideTokens('opencode-palette', render.tokens)` + 自建 `<style>`）。

## §3 `!important` 全表（22 行逐条）

### 3.1 影响外观（6 行 / 7 条）

| # | 位置 | 规则 | 值类型 | 能否绕过 | 怎么绕 / 备注 |
|---|---|---|---|---|---|
| 1 | `ui-primitives/src/markdown/CodeBlock.module.css:94` | `.block :where(pre.shiki) { background: var(--dsl-code-block-background) !important }` | var | ✅ 能 | 改 `--dsw-alias-markdown-code-block`；注意 `--dsl-*` 在 CodeBlock 根上被本地定义（`:11`），body 级同名值被遮蔽 |
| 2 | `ui-primitives/src/markdown/MarkdownText.module.css:407` | `.compact pre, .compact pre :is(code, span) { color: inherit !important }` | inherit | ✅ 能 | 改祖先（markdown 容器）的文字 token / 规则 |
| 3 | `ui-primitives/src/TextShimmer.module.css:46` | `.sweep * { color: inherit !important }` | inherit | ✅ 能 | 同上，改祖先色 |
| 4 | `ui-sidebar-terminal/src/client/terminal.module.css:14` | `.xterm-cursor… { background-color: var(--terminal-cursor) !important; color: var(--terminal-cursor-accent) !important }` | var，但值由 JS 内联写 | ⚠️ 脆 | `terminal-cursor.ts:32-35` 用 xterm 主题 + 亮度反推写入；我们只能用 `!important` 规则压内联（宿主内联无 important），与宿主自身 `!important` 同权比 specificity → 依赖类名，脆 |
| 5 | `ui-trajectory/src/client/TrajectoryTable.module.css:1345` | `.programSource { background: var(--dsw-alias-bg-layer-1) !important }` | var | ✅ 能 | 改 `--dsw-alias-bg-layer-1` |
| 6 | `apps/desktop/renderer/mandatory-update.css:10` | `#copy-message { color: #d93025 !important }` | 字面量 | ⛔ 不能（也没必要） | 强制更新辅助页，不在主 UI 主题范围 |

### 3.2 排版 / 布局 / 显隐（16 行，颜色轴不碰，排印轴 #148 再议）

| 位置 | 规则 | 管什么 |
|---|---|---|
| `CodeBlock.module.css:81` | `margin: 0 !important` | 代码块外边距 |
| `MarkdownText.module.css:169` | `font-size: 0.875em !important` | 紧凑行内代码字号 |
| `MarkdownText.module.css:279` | `margin-top: 0 !important` | 首元素上边距 |
| `MarkdownText.module.css:284` | `margin-bottom: 0 !important` | 末元素下边距 |
| `MarkdownText.module.css:388` | `font-size: 1em !important` | 紧凑 pre 字号归一 |
| `TrajectoryTable.module.css:147` | `padding-right: 4px !important` | 事件表头 |
| `TrajectoryTable.module.css:148` | `text-align: right !important` | 事件表头 |
| `TrajectoryTable.module.css:370` | `overflow: visible !important` | 事件行 |
| `TrajectoryTable.module.css:371` | `padding-right: 4px !important` | 事件行 |
| `TrajectoryTable.module.css:372` | `padding-left: 36px !important` | 事件行 |
| `TrajectoryTable.module.css:446` | `padding-left: 4px !important` | 内容块 |
| `TrajectoryTable.module.css:497` | `padding-right: 3px !important` | 嵌套事件 |
| `TrajectoryTable.module.css:498` | `padding-left: 28px !important` | 嵌套事件 |
| `TrajectoryTable.module.css:1335` | `margin: 0 !important` | 程序源码块 |
| `apps/desktop/renderer/update-dialog.css:27` | `[hidden] { display: none !important }` | 显隐工具 |
| `apps/desktop/renderer/welcome.css:45` | `display: none !important` | 显隐工具 |

> 这 16 行如果将来要做「排印全量」（第 2 条的字号/行距轴），必须逐条决定：跟它（不改）还是用 `!important` 抢。颜色轴不涉及。

## §4 宿主 inline style 全表（外观相关）

### 4.1 颜色 / 视觉值（少得出奇）

| 位置 | 内容 | 影响 | 我们的做法 |
|---|---|---|---|
| `ui-primitives/src/markdown/katex.tsx:80` | `style={{ color: '#cc0000' }}` | KaTeX 公式报错红，唯一硬编码颜色 inline | 可用 `!important` 规则覆盖，但 React 重渲染可能写回 → 需实测；也可不碰（数学公式错误态） |
| `ui-sidebar-terminal/src/client/terminal-cursor.ts:32-35` | `--terminal-cursor`、`--terminal-cursor-accent`、`--terminal-cursor-cell-background`、`--terminal-cursor-cell-foreground` | 终端光标块（由 xterm 主题 + 亮度反推） | 见 §3.1 第 4 条 |
| `ui-layout/src/client/theme-presenter.ts:87-90` | 全部 token 变量 | A 通道本体 | 就是我们的主通道 |
| `ui-theme/src/boot-theme.ts:30,33` | 字号、字体列表变量 | 排印轴 | #148 再议 |

### 4.2 尺寸 / 测量类（不要抢）

宿主 inline 大量用于「量完再写」的数值，抢了会破坏布局：

- `ui-conversation/src/client/skeleton/ConversationContent.tsx:59` `--dsh-composer-height`
- `ui-conversation/src/client/skeleton/ConversationWidthControls.tsx:78` `--dsh-width-handle-pointer-y`、`:140` `--dsh-conversation-column-width`、`:143/:161` `--dsh-chat-user-width`
- `ui-sidebar-documentpreview/src/client/pdf/document.ts:59-60`、`pdf/pdf.tsx:176-177` `--pdf-page-width/height`
- `ui-sidebar-documentpreview/src/client/pdf/text.ts:17-19` `--total-scale-factor`、`--scale-round-x/y`
- `ui-sidebar-documentpreview/src/client/zoom/ZoomViewport.tsx:103/124/148/167` `--document-zoom`
- `ui-primitives/tests/…`、`ui-dockkit/tests/…` 为测试夹具（`--dsh-frame-top-clearance`、`--dsh-windows-titlebar-height` 等）

### 4.3 `--dsl-*` 局部别名（宿主内部）

宿主在**元素本地**定义了一批 `--dsl-*` 短名，再在规则里消费，例如：

- `CodeBlock.module.css:5-17`：`--dsl-code-block-background: var(--dsw-alias-markdown-code-block)` 等
- `CodeBlock.module.css:16` 用 `var(--dsl-code-block-background, var(--dsw-alias-markdown-code-block))`
- `CodeCard.module.css:16` 用同名变量 + fallback
- `ui-jobs/JobListAction.module.css:347-357`、`ui-plugin-manager/PluginManagerPage.module.css:1180-1182`、`SearchBlock.module.css:2`、`ReadBlock.module.css:9`

**结论**：在 body 上写 `--dsl-*` 只在「消费方没有元素本地定义、且靠继承」的地方生效；元素本地定义会遮蔽。本仓 `src/engine/map-dsh.ts:49` 的自造名 `--dsl-code-block-background` 因此**部分生效**（CodeCard 走 fallback 会用到；CodeBlock 内被本地定义遮蔽），不是等价于 `--dsw-alias-markdown-code-block` 的可靠写法。

## §5 本仓注入面自检

| 项 | 事实 | 含义 |
|---|---|---|
| `src/engine/map-dsh.ts:188-199` | `CSS_RULES` 10 条：`body h1..h6`、`a`、`.markdown a, .markdown .fileLink`、`code:not(pre code)`、`em`、`strong`、`blockquote`、`hr` | 私有面只有 `.markdown` 类名 1/10 |
| `src/engine/map-dsh.ts:206` | `TOOLTIP_TEXT_SELECTOR = '[role="tooltip"]'` | ARIA 公开标准，不算私有 |
| `src/engine/map-dsh.ts:49` | 自造 `--dsl-code-block-background` | 见 §4.3，建议改为双写或直接写 `--dsw-alias-markdown-code-block` |
| `src/` 全仓 | `!important` 0 条 | 颜色轴第一版若要与宿主 `!important` 竞争，需引擎生成期统一追加（表驱动），不手写 |

## §6 建议的引擎规则（待用户裁定）

- **R1**：生成 CSS 时对「外观类 + 宿主已知 `!important`」的属性追加 `!important`，由一张生成期表驱动（表即本文件 §3），不散落手写。
- **R2**：排版类 16 条不在颜色轴处理，转 #148 排印轴。
- **R3**：**永不因为「当前被压制」就不发规则**（用户 m00801 #4）——表里标 `suppressed` 状态，只在编辑器里提示「当前宿主未消费/被压制，宿主升级后可能生效」。
- **R4**：`--dsl-*` 内部别名**不作为稳定设置项暴露**；若要用，优先写它们指向的 `--dsw-*` 上游变量。
- **R5**：宿主版本升级后重跑 §7 脚本，diff 22 行表；新增/消失都要更新本文件与本仓测试。

## §7 复现脚本

```powershell
# 22 条 !important（排除 node_modules）
Get-ChildItem -Recurse -Include *.css -File |
  Where-Object { $_.FullName -notmatch 'node_modules' } |
  Select-String -Pattern '!important'

# 宿主体内写 CSS 变量的地方（A 通道 + 测量值）
Get-ChildItem -Path packages -Recurse -Include *.ts,*.tsx -File |
  Select-String -Pattern 'style\.setProperty'

# 本仓注入面
Select-String -Path src\engine\map-dsh.ts -Pattern 'CSS_RULES|!important|--dsl-'
```

## §8 未确证（需实测，别当结论）

1. React 重渲染是否会把 KaTeX 的 `color:#cc0000` 写回（覆盖我们的 `!important` 规则）。
2. 我们的 `body …` 规则与宿主 CSS Modules 哈希类名撞车时的实际 specificity 胜负（宿主构建产物类名会变）。
3. 终端光标覆盖的实机效果（xterm 内部也有 canvas 渲染路径，可能不走 CSS）。
4. `!important` 在 Web 版与 Desktop 版是否有差异（当前扫描为同一代码库）。
5. 宿主升级后 `--dsl-*` 的存续（内部命名，无兼容承诺）。
