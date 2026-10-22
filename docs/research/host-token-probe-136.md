# 宿主契约探针与版本漂移（研究 #136）

> 票：[#136](https://github.com/FeatherHunter/dsh-opencode-palette/issues/136)（父票 #128）· 采集日期 2026-10-20
> 基线：DSH 源码 commit `687f282`（tag `dsh-v0.2.1-rc.2`），本机桌面安装 `44.7.0`（Electron）/ `@deepseek-ai/dsh-desktop 0.2.1-rc.2`
> 证据路径约定：DSH 源码路径相对 `D:\Temp\dsh-src`；本仓路径相对仓库根。**标注「事实」= 已读源码或已实测；「推断」= 由事实外推未验证；「实机」= 只能在运行中的 GUI 里确认。**
> 本文不重复三份既有研究的内容：token 面全量清点见 [dsh-source-theme-token-surface.md](./dsh-source-theme-token-surface.md)，T0–T4 分级与四条红线见 [v3-capability-matrix.md](./v3-capability-matrix.md)，插件运行时能力边界见 [dsh-source-plugin-capability-surface.md](./dsh-source-plugin-capability-surface.md)。

---

## 0 结论速览

**一句话**：探针的本质不是「读版本号」，而是「读效果」。宿主版本号在桌面版退化成纯 semver（无 commit），而 token 面的真实契约——403 个名字、它们声明在哪个元素上、还有没有消费方——**全部可以在页面内 200 ms 内自证**，不需要信任任何版本字段。

1. **探针 = 三通道组合，权重 5:4:1。** A 样式表声明扫描（权威）+ B `getComputedStyle` 三点实测（权威）+ C 打包清单 sha256（可选加速器）。A 与 B 互相校验：A 给「名字与值域」，B 给「承载体与生效性」。两者都缺的才叫「不知道」。
2. **最小可行实现约 150 行 TS、零依赖**，跑在 `runtime/client.ts` 内；产物是一个 manifest 对象 + 两个指纹（`shapeDigest` 契约形状 / `valueDigest` 值域）。不需要宿主配合，不需要新权限，不需要 `gh` 或文件系统。
3. **降级优先级（P0 最高）**：P0 不写该名（回到宿主默认）→ P1 引擎派生 → P2 已知改名表 → P3 功能禁用 + UI 提示 → P4 探针告警。核心判据：**「没有效果」可接受，「静默错色」不可接受**，所以默认永远走 P0，绝不猜名字。
4. **最大风险点不是 token 集合变化，而是「承载体迁移」**：名字、值域、消费方全不变，宿主把 `--dsw-alias-bg-base` 从 `body` 挪到 `:root`（或反向），我们的 `body{...}` 覆盖**静默失效且不报任何错**。这类漂移只能靠 B 通道的 html/body 双点差值检出，必须作为一等漂移信号（D5）。
5. **第二风险是纯 JS 契约漂移，会真白屏**：`theme.overrideTokens` 在 `runtime/client.ts:736` **没有 typeof 守卫**（同仓 `host.ts:448` 的 `register` 有），而 8 个 `applyStyle()` 调用点（`:630 / :890 / :901 / :919 / :926 / :931 / :941`）**全部裸奔无 try/catch**。宿主一旦改名该方法，启动路径（`:941`）直接抛错。这与 token 无关但同属宿主契约，必须一并兜。
6. **一个反直觉的现状确认**：桌面安装（`app.asar` 内的 `dsh/node_modules/@deepseek-ai/dsh-client-ui-theme`）的 token 面与源码 `687f282` **逐项一致**（`--dsw-` 出现 902 次 / 唯一 403 / 声明 602 处）。→ 当前基线是准的，漂移是**跨版本**问题而非版本内问题。探针的价值窗口 = **用户升级宿主后的那一次启动**，不需要每帧跑，也不需要持续监听。
7. **引擎复用度约 70%**：`usable()`（`src/engine/generate.ts:61-68`）、`put2`（同文件 `:85-107`）、`DERIVED_TOKENS` 的逐条 `try/catch`（`src/engine/generate.ts:112-122`）、`normalizeThemeColors` 的别名槽链（`src/engine/map-dsh.ts:289-297`）都能直接接探针。**缺的是两个维度**：`TOKEN_MAP`（`src/engine/map-dsh.ts:20-97`）是「宿主名 → 我们的槽」的二维表，没有「这个宿主名还活着吗」和「它声明在哪个元素上」的位置。
8. **接入方式是「过滤层」而不是「重写生成器」**：`renderTheme/renderCustomTheme` 返回的 `render.tokens` 是 `Record<string,string>`，探针只需拿 `Object.keys(render.tokens)` 与 manifest 的 `declared` 集合做交集，剔除死名后再交给 `theme.overrideTokens`。生成器的不变式（`src/engine/generate.ts:1-2`「输出完全由输入决定」）因此不被破坏，且过滤层是**纯函数**，可在 Node 里单测（本仓测试直接跑 `.ts`，不需要 DOM）。
9. **`update-tokens.ts` 不接探针**：它产的是 `dsh-plugin-update` 的 `themeTokens`（24 键、只出 hex，`src/engine/update-tokens.ts:42-47 / :64-83`），与宿主 `--dsw-*` 是两套契约，接探针只会制造假依赖。
10. **三条已知钉死项应当被探针显式建模为「常量」而非「数据」**：darwin 的 `--dsw-specific-menu: rgba(...,0.94)`（`design-platform.css:400-408`，只在 `html[data-platform='darwin']` 下生效，Windows 上根本不匹配）、`--dsw-mask-blur: none`（`gradient-shadow-text.css:19`，绝不发射）、149/150 个字体 longhand 的「死名」（`consumers === 0`）。探针把它们标 `pinned` / `dead` 并**拒绝写入**，需要一条负向断言测试守住。（2026-10-22 #147 定稿口径：**用户层 / L3 一律允许写入**，`pinned` 只提示不阻止；这里的「拒绝写入」仅是探针过滤层对引擎自动生成物的策略，见 `palette/SPEC.md` §6。）
11. **自动化实机探测不可行**：本机 `http://127.0.0.1:61570/` 对裸 HTTP 返回 `401 Unauthorized`（桌面版 `main.ts:454` 用 `authenticateWebHost` 换 cookie 才可访问）。所以验收门禁里的「实机采集」必须在**页面内**执行（DevTools console 调探针 / 设置页「诊断 · 导出 manifest」按钮），不能靠 curl。
12. **门禁的核心不是「一致」，而是「变化必须被看见」**：同 `hostVersion` 而 `shapeDigest` 变化 → 强制人工复核；不同 `hostVersion` 而 `shapeDigest` 未变 → 自动放行。这条规则把「每次宿主升级都重新做人」的成本降到只有真变化时才付。

---

## 1 目标与不变量

### 1.1 要防的三种失败（严重度递增）

| # | 失败模式 | 表现 | 我们当前是否已防住 |
|---|---|---|---|
| F1 | 无效果 | 颜色没变、字体没换 | 部分：`usable()` 会跳过缺槽，但**静默** |
| F2 | **静默错色** | 写了 token，宿主不消费 / 消费在别的元素上 / 值域语义变了，界面出现「半对半错」的配色 | **否**。这是本文要解决的主目标 |
| F3 | 白屏 | 脚本抛错，`#root` 渲染不出来 | **否**：`overrideTokens` 无守卫 + 8 个调用点无 try/catch |

任务书要求「不白屏、不静默错色」——正好对应 F3 与 F2，F1 允许（且必须允许，因为它是我们的默认降级）。

### 1.2 不变量（探针与集成都不得违反）

- **INV-1 采集失败 ≠ 应用失败**。探针任一步抛错都被吞掉，`applyStyle()` 继续跑完并注入原有的 CSS。探针是**旁路**，不在关键路径上（除了「用它的结果过滤 token 名」这一步，而那一步的输入缺失时退化为「不过滤」）。
- **INV-2 不猜名字**。名字找不到就跳过。不做「同前缀最相似」模糊匹配来自动改名——那会把一个可诊断的缺色变成不可诊断的错色。
- **INV-3 幂等**。同一宿主版本、同一外观下重复采集，两个指纹必须逐字节相同。因此指纹输入里**不能有** `capturedAt`、对象键序、`Map` 迭代序、未归一化的原始值。
- **INV-4 只读**。探针不改 DOM、不写样式、不改变宿主状态。唯一副作用是可选地写一条日志/落一份 manifest。
- **INV-5 成功时静默**。零日志。失败时**一条聚合 warn**（不是每个 token 一条，403 个 token 会把控制台刷成不可读）。
- **INV-6 不依赖网络与宿主内部 API**。只用 DOM 与（可选的）`window.__DSH_BOOT__`。不调 `connection.fetch`，不读 `/api/file`（见插件能力研究 §6 的「会坏」表）。

### 1.3 「漂移」的定义

漂移 = **宿主契约相对我们的基线发生了我们没预料到的变化**，且变化会让 F1/F2/F3 之一发生。注意两个反例：

- 宿主**新增** token 而我们不用 → 不是漂移（不处理，不告警，只在 manifest 里记 `newNames` 供以后接入）。
- 宿主**换值但语义不变**（设计师微调了 `--dsw-static-amber-500`）→ 对纯颜色 token 不是漂移（我们本来就覆盖它）；对**结构 token**（radius 梯度、elevation 三件套、字体复合值）**是**漂移，因为我们的派生逻辑假设了值域形状（见 5.2 G3）。

---

## 2 采集通道

### 2.1 通道 A：样式表声明扫描（权威，负责「名字与值域」）

#### 2.1.1 为什么用 `textContent` 而不是 CSSOM

**事实**：宿主 ui-theme 用 `createElement('style')` + `textContent = css` + `head.appendChild` 注入 8 张表（`packages/client/ui-theme/src/client/styles.ts:11-39`），并且给每个节点打了两个属性：

```
tag.dataset.plugin     = '@deepseek-ai/dsh-client-ui-theme'
tag.dataset.pluginCss  = `${PLUGIN_ID}/${name}`     // 例：@deepseek-ai/dsh-client-ui-theme/design-platform.css
```

`STYLES` 的顺序是固定的 8 项：`base.css, corner-shape.css, design-platform.css, focus.css, onboarding.css, scrollbar.css, gradient-shadow-text.css, shiki.css`（同文件 `:11-39`）。

由此得到三个可依赖的点（**事实**）：

- `style[data-plugin-css^="@deepseek-ai/dsh-client-ui-theme/"]` 是一个**精确、无歧义**的锚点，不依赖类名 hash、不依赖 DOM 结构、不依赖版本号。
- 因为用的是 `textContent`（不是 `insertRule`），节点里**留着 CSS 原文**，可以用与静态分析完全相同的正则去扫——这让「线上实测」与「读源码」两套证据可以直接对齐（本研究的 403/602 就是这样对齐的）。
- **全仓无 shadow DOM**（`attachShadow` 只在 `packages/client/shortcuts/src/client/native.ts:21-22` 被读取）、**无 constructable stylesheet**（grep `new CSSStyleSheet` / `adoptedStyleSheets` 零命中）、**无 `<link rel=stylesheet>`**（`apps/web/index.html` 只有 manifest 与 favicon 两个 `<link>`）。→ 不存在「样式藏在取不到的地方」的情况，`document.styleSheets` 与 `document.querySelectorAll('style')` 覆盖全集。

**为什么仍然保留 CSSOM 兜底**：以上三条是**当前版本**的事实，不是契约。宿主一旦改成 `adoptedStyleSheets` 或 `sheet.insertRule`，`textContent` 路径会静默返回空字符串——**空扫描结果必须被当成「通道 A 失败」而不是「token 全没了」**，否则 D7（注入机制变化）会被误判成 D3（全部删除）从而触发整个主题禁用。这是本方案里最容易写错的一处。

#### 2.1.2 采集骨架

```ts
const HOST_CSS_PREFIX = '@deepseek-ai/dsh-client-ui-theme/'
const OWN_PLUGIN = 'dsh-opencode-palette'

type Sheet = { id: string; text: string }
type Decl  = { name: string; raw: string; gates: string[]; from: string }

function collectSheets(doc: Document): { sheets: Sheet[]; via: 'dom' | 'cssom' | 'none' } {
  // 1) 权威：textContent
  const dom: Sheet[] = []
  for (const el of Array.from(doc.querySelectorAll('style[data-plugin-css]'))) {
    const id = el.getAttribute('data-plugin-css') ?? ''
    if (!id.startsWith(HOST_CSS_PREFIX)) continue
    const text = el.textContent ?? ''
    if (text.length > 0) dom.push({ id: id.slice(HOST_CSS_PREFIX.length), text })
  }
  if (dom.length > 0) return { sheets: dom, via: 'dom' }

  // 2) 兜底：CSSOM（含 adoptedStyleSheets），全部 try/catch —— cssRules 可能抛 SecurityError
  const cssom: Sheet[] = []
  const walk = (list: CSSStyleSheet[], tag: string) => {
    for (const s of Array.from(list)) {
      try {
        const text = Array.from(s.cssRules).map(r => r.cssText).join('\n')
        if (text.includes('--dsw-')) cssom.push({ id: tag + (s.href ? ':' + s.href : ''), text })
      } catch { /* 跨域或已禁用 → 跳过 */ }
    }
  }
  walk(Array.from(doc.styleSheets), 'sheet')
  walk(Array.from(doc.adoptedStyleSheets ?? []), 'adopted')
  return cssom.length > 0 ? { sheets: cssom, via: 'cssom' } : { sheets: [], via: 'none' }
}
```

`via === 'none'` 是**一等状态**，必须进 manifest（`channels.declared: 'failed'`），并且在 UI 上区别于「扫到了但名字没了」。

**排除自己的表**（否则「我们消费宿主的 token」会被算成宿主自消费，反转 liveness 判断）：

- 我们的 token 层不是 `<style>`，是 `theme.overrideTokens('opencode-palette', ...)`（`runtime/client.ts:736`）——presenter 写成 `body` 的行内 `style.setProperty`（`packages/client/ui-layout/src/client/theme-presenter.ts:87-90`），**不在任何样式表里**，天然不会被 A 通道扫到。这是好事：A 通道看到的是「宿主的原始声明」，没有被我们污染。
- 我们的 CSS 层是一个 `style[data-plugin="dsh-opencode-palette"]` 节点（`runtime/client.ts:739-741`），消费约 180 个 token。**统计 `consumers` 时必须排除它**，否则每个我们引用的名字都恒有消费者 ≥1，`dead` 判定永远为假。

#### 2.1.3 解析：两遍就够，不要写完整 CSS 解析器

我们**不需要**选择器语义，只需要三件事：名字、原始值、被哪些 at-rule 包着。

- **第一遍（正则）**：`/(--(?:dsw|dsh|shiki)-[a-z0-9-]+)\s*:\s*([^;{}]+)/g` 扫全文 → `Map<name, raw[]>`。这一步不能区分真声明与 `var(--x)` 引用，所以**必须在第一遍之后、第二遍之前，用 `var\(` 反查**剔除「只在 `var()` 里出现」的假阳性——`var(--dsw-alias-bg-base)` 中的 `--dsw-...` 后面跟的是 `)` 而不是 `:`，所以上述正则实际不会误匹配，但**值里内联的 `color-mix(in srgb, var(--x) 10%, ...)` 会被 `[^;{}]+` 吃进 raw**，这是我们要的（值域就要原样看）。
- **第二遍（大括号走行 + 前导记录）**：角色是给每条声明找回 enveloping `@supports` / `@media` 条件。约 30 行：遇到 `{` 时把 `depth++` 并记录该层的 prelude（`{` 之前的文本），遇到 `}` 时 `depth--`；当一条声明出现时，把它顶层到当前的 prelude 里以 `@` 开头的都记为 `gates`。

为什么 `gates` 是一等字段（**事实**支撑）：

- `corner-shape.css:16` 是 `@supports (corner-shape: superellipse(1.5)) { :root { --dsw-corner-shape: superellipse(1.5) } ... }`——**token 和规则都只存在于守卫内部**（该文件 `:1-15` 的注释原文说明了这个设计：不支持的引擎保持圆角、token 干脆不存在）。
- `scrollbar.css:45` 是 `@supports not selector(::-webkit-scrollbar)`——反向条件。

所以「declared」不等于「active」。若探针只记 `declared: true`，「宿主新引擎没实现 corner-shape」会被误读成「token 丢了」，而真相是「它从来就不该存在于此引擎」。`gates` 让这两种情况可分。

#### 2.1.4 消费方计数（liveness）

`consumers(name)` = 所有**非自己**样式表里 `var\(\s*--name` 的出现次数。它解决两个具体问题：

- **死名识别**：149/150 个 `--dsw-font-*-*` longhand 没有消费方（见 v3 矩阵），只有 1 个活 longhand（`packages/client/ui-text/src/client/user-text.module.css:31` 引用 `--dsw-font-markdown-code-font-family`）。manifest 里 `consumers === 0` → `state: 'dead'`，UI 上这些旋钮显示为不可用。**用数据判定，不用硬编码清单**——硬编码清单会在宿主补上消费方的那天变成骗人的。
- **局部重绑定识别**：`--dsw-elevation-stroke-color` 在 ≥10 处组件内被重新绑定（见 token 面研究），`--dsh-scrollbar-*` 约 15 处。`scrollbar.css:46-50` 的注释把原因写得很清楚：**「Declared on every element rather than inherited from body. Inheriting would pass down the COLOUR already substituted at body, so a descendant rebinding --dsh-scrollbar-thumb could not change it」**。→ 这条事实直接推出 2.2 的**三点采样**：只在 body 量会漏掉元素级的重绑定。

### 2.2 通道 B：计算值实测（权威，负责「承载体与生效性」）

#### 2.2.1 三点采样

对 A 通道扫到的每个名字（以及我们自己至少要写的名字），在三个位置各取一次 `getComputedStyle(el).getPropertyValue(name)`：

| 采样点 | 取法 | 它能回答什么 |
|---|---|---|
| `html` | `document.documentElement` | token 是否声明在 `:root`（可继承） |
| `body` | `document.body` | token 是否声明在 `body`（宿主的默认承载体） |
| `surface` | 第一个命中的「高层浮层」：`[data-menu-material], [role="dialog"], [role="tooltip"]` | 是否有元素级重绑定（`scrollbar.css:46-50`、`gradient-shadow-text.css:31-40` 的 `body, body *` 逐元素重绑） |

三点的组合能唯一确定承载体，**不需要读选择器**：

| html | body | 判定 |
|---|---|---|
| 有值 | 有值 | 声明在 `:root`（继承下来），**或**同时在两处声明 |
| 空 | 有值 | 声明在 `body` —— **宿主的主流形态，也是我们覆盖的默认位置** |
| 有值 | 空 | 声明在 `:root` 但 body 被打断（罕见，可能是 `all: revert` 一类，记为 `anomaly`） |
| 空 | 空 | 有 `declared` 但无 `computed` → **`declared-invalid`（值链断裂）** |
| 空 | 空（且 A 也没扫到） | `missing` |

**`declared-invalid` 不是假设，是现成的样本**：`shiki.css:7-19` 把 `--shiki-foreground` / `--shiki-background` 声明在 `:root`，而它们引用的 alias 只在 `body` 上声明 → 声明合法、计算期为空。宿主的兜底是 `CodeBlock.module.css:92-94` 的 `!important` 字面色。**我们的 `SHIKI_MAP`（`src/engine/map-dsh.ts:173-184`）里就含 `--shiki-foreground`**，所以我们的写入在这个位置是「救场」而不是「覆盖」——探针必须能把这两种情况区分开，否则会误报。

#### 2.2.2 值归一化（指纹稳定的前提）

`getComputedStyle` 返回的是**序列化后的**值，宿主改一下书写顺序（`#fff` → `rgb(255, 255, 255)`）、加个空格、把 `0.94` 写成 `.94`，都会让原始字符串不等而语义相同。归一化规则（短，但要写死）：

| 类型 | 规则 | 例 |
|---|---|---|
| 颜色 | 解析为 `rgba(r,g,b,a)`，`a===1` 时省略 alpha；十六进制小写；`rgb()` 与 `#rrggbb` 统一到 hex | `#FFFFFF` ≡ `rgb(255,255,255)` ≡ `#fff` → `#ffffff` |
| 长度 | `px` 保留一位小数；`0` 去掉单位；`em/rem` 保留原单位不换算（我们只做相等比较，不做算术） | `.5rem` ≡ `0.50rem` → `0.5rem` |
| 复合（字体/阴影/滤镜） | 折叠连续空白 → 单空格；`，`/`,` 后统一一个空格；块级函数（`blur()`）内部同样处理 | `blur(40px)  saturate(150%)` → `blur(40px) saturate(150%)` |
| 无法解析 | 保留归一化空白后的原文，标 `kind: 'opaque'` | — |

归一化失败（解析器抛错）不得让整个采集失败：退化为 `opaque` 并把 `kind` 记进 manifest。

#### 2.2.3 一个必须写进文档的局限

`getComputedStyle` 给的是**该元素上解析后的值**，不是「宿主作者写的值」。对 `body, body *` 这种逐元素重绑（`gradient-shadow-text.css:31-40` 重绑 elevation 三件套），我们在 body 上量到的可能已经是 `var()` 代入后的结果——够用（我们关心的是「最终生效什么」），但**不能反推作者意图**。凡是要判断「宿主是不是改了写法」的地方，一律以 A 通道的 raw 为准。

### 2.3 通道 C：打包清单（可选加速器，**不承担正确性**）

#### 2.3.1 能力现状（本机实测）

| 项 | 实测 | 含义 |
|---|---|---|
| `resources/app.asar` | 单个归档 182 794 869 B | 宿主全部代码在这里面 |
| `resources/app.asar.unpacked/dsh/node_modules` | 只有原生依赖（node-pty / sharp@img / koffi / sherpa-onnx / fontkit …） | 纯 JS 包不落在磁盘上 |
| asar 内 `dsh/node_modules/@deepseek-ai/dsh-client-ui-theme` | `0.2.1-rc.2`，仅 `lib/client.js`(120 426 B) / `lib/index.js` / `lib/styles/{brand-font.css,3×woff2,OFL}` / `locale/{en,zh}.json` | **8 张 token 表不以文件形式发布**，被内联进 `lib/client.js`（形如 `var design_platform_css_default = "body{--dsw-static-amber-100:#fef5e7;..."`，注释为 `//#region \0dsh-inline-css:...\design-platform.css.mjs`） |
| 对 `lib/client.js` 的字符串统计 | 120 024 字符；`--dsw-` 出现 902 / 唯一 403；`--dsw-*:` 声明 602 处 / 唯一 403 | **与源码 `687f282` 完全一致** → 当前基线准 |
| profile 里的宿主包 | `C:\Users\<user>\.dsh\profiles\*\node_modules` 下**没有** `@deepseek-ai/dsh-*`（desktop 只有 cosmokit / dsh-brand / schemastery） | 插件从 profile 树 `createRequire().resolve(...)` 预期失败 |

#### 2.3.2 为什么它只能当加速器

- 桌面版要靠**自己解析 asar 头**才能拿到清单（Pickle 格式：bytes 4-7 = header pickle size，bytes 12-15 = JSON 长度）。本研究的取证脚本能跑通（数据起点 = 8 + pickle = 4 779 796），但这是**未文档化的二进制格式**，且要读 `resources/` 下的特权路径。把它放进插件的关键路径 = 给自己造一个会随 Electron 升级而碎的依赖。**推断**：Electron 的 asar 补丁是否作用于宿主进程（utility process）的内置 `fs` 未知，即便可用也不该赌。
- npm 安装形态下 `createRequire(import.meta.url).resolve('@deepseek-ai/dsh-client-ui-theme/package.json')` 能工作，但**桌面版（本机主分发形态）不成立**——同一份代码两种行为，是最难测的那种。
- 清单指纹的价值（「不启动页面就能知道 token 面」）在桌面版被 asar 抵消，在 Web 版又已经被 A+B 覆盖。→ **降为可选：`manifest.channels.packaged = 'unavailable' | { sha256, version }`，永不参与决策。**

保留它的唯一理由是**离线排障**：用户报告「升级后配色错了」，让他跑一个 `npm ls @deepseek-ai/dsh-client-ui-theme --json` 也许能拿到版本，但拿不到 403 个名字。A+B 能。所以优先级是 A+B 先做，C 有一行占位就够。

### 2.4 三通道对比

| 通道 | 采集对象 | 强项 | 盲区 | 失败模式 | 权重 |
|---|---|---|---|---|---|
| A 声明扫描 | `style[data-plugin-css]` 的 `textContent` | 名字/值域/at-rule 门/消费方，与源码可逐字对齐 | 看不懂选择器语义；对 shadow DOM 与 constructable sheet 无解 | 宿主改注入机制 → 空结果（须与「全删」区分） | 5 |
| B 计算实测 | `getComputedStyle` × 3 点 | 生效性/承载体/被引擎吃掉的值 | 拿不到作者原文；对 403 个名各取 3 次有成本（实测见 §8） | 无 DOM（服务端渲染路径）→ 不可用 | 4 |
| C 打包清单 | `lib/client.js` 的 sha256 / asar | 不依赖页面 | 桌面版要读 asar；Web 版无意义 | 路径/格式变化 | 1 |

---

## 3 manifest 结构

### 3.1 完整快照（人看、排障、可作为门禁基线）

```jsonc
{
  "schemaVersion": 1,                    // manifest 自身格式版本，与我们解析器绑定
  "capturedAt": "2026-10-20T15:02:11.418Z", // 仅展示用，不进指纹
  "host": {
    "version": "0.2.1-rc.2",             // 见 §6；拿不到就是 null，不猜
    "versionSource": "boot-release",     // boot-release | env-client-version | package-json | none
    "commit": null,                      // 桌面官方包极可能未注入（推断，见 §6.3）
    "platform": "win32",                 // html[data-platform]；缺失 → "web"
    "surface": "desktop",                // desktop | web，由 platform/全局推断
    "engine": { "chrome": "140.x", "supports": { "cornerShape": true, "scrollbarSelector": true } }
  },
  "appearance": {
    "scheme": "dark",                    // document.body.hasAttribute('data-ds-dark-theme')
    "preference": "system",              // html[data-ds-theme-source]
    "colorScheme": "dark"                // html.style.colorScheme（presenter 写，theme-presenter.ts:69-73）
  },
  "channels": { "declared": "dom", "computed": "ok", "packaged": "unavailable" },
  "tokens": {
    "--dsw-alias-bg-base": {
      "family": "alias",
      "declared": true,
      "declaredBy": ["body"],            // 来自 B 的三点组合（不是选择器解析）
      "gates": [],                        // ["@supports (corner-shape: superellipse(1.5))"]
      "raw": "var(--dsw-static-neutral-950)",  // A 通道原文，排障用
      "computed": { "html": "", "body": "#0d0d0d", "surface": "#161616" },
      "consumers": 37,                    // 宿主 CSS 内 var() 引用数（排除我们的表）
      "state": "live",                    // 旧版六值口径；v1.6 起用户层状态 = 主状态 live/dead/missing + 修饰 declared_invalid/pinned/gated——「拒绝写入」仅引擎过滤层
      "normalized": "#0d0d0d"
    }
    // …403 条
  },
  "hooks": {
    "html[data-platform]":   { "hit": 1, "value": "win32" },
    "body[data-ds-dark-theme]": { "hit": 1, "present": true },
    "[data-menu-material]":  { "hit": 2 },
    "[role=\"tooltip\"]":     { "hit": 0 },
    ".markdown":             { "hit": 6 },
    "[data-chat-flow-kind]": { "hit": 3 }
  },
  "digests": { "shape": "a3f19c7d", "value": "5e0b2d41", "schema": 1 }
}
```

字段设计说明：

- **`family`** 由名字前缀判定，19 个前缀簇（对 8 张表实测自动聚类：`--dsw-` / `--dsh-` / `--shiki-` 三个前缀合计 **425** 个唯一名，其中 `--dsw-` 恰 **403**，与既有矩阵一致）：`font 184 / alias 107 / static 77 / specific 11 / token 9 / radius 6 / elevation 5 / scrollbar 5 / shadow 4 / content 3 / gradient 3 / focus 2 / linear 2 / menu 2 / foreground 1 / background 1 / code 1 / mask 1 / corner 1`，其余落 `other`。**分类只影响 UI 分组与「结构 vs 纯色」的降级判定，不影响采集**——所以它必须可由前缀推导，不能靠人工表。
- **`declaredBy` 是三点组合的结论而非选择器解析**（见 2.2.1 表）。这是刻意的：选择器解析会随宿主把 `body` 换成 `body,body *` 而碎，三点组合不会。
- **`consumers` 排除我们的表**（见 2.1.2）。这是 `dead` 判定的唯一依据，写错就会把所有名字都判活。
- **`hooks` 只统计我们真正依赖的钩子**（约 10 个），不全量抓 DOM。全量抓 `[...document.querySelectorAll('*')].map(x=>x.className)` 会得到几十万个 hash 类名，manifest 变 20 MB 且下次升级全变——毫无 diff 价值。

### 3.2 两个指纹（门禁的实际载体）

```
shapeInput = canonicalJson({
  schemaVersion,
  platform, surface, scheme,                                    // 不含 hostVersion！
  tokens: sorted([name, declared ? 1 : 0, declaredBy, state]),   // 不含值
  hooks:  sorted([selector, hit > 0 ? 1 : 0])                    // 不含具体命中数
})
valueInput = canonicalJson(
  sorted([name, normalized])  // 只含 state === 'live' 的
)
shapeDigest = fnv1a32(shapeInput)   // 8 hex
valueDigest = fnv1a32(valueInput)
```

**`hostVersion` 刻意不进指纹输入**。它只作为基线的**键**（`<hostVersion>.manifest.json`）与分组标签。若把版本号混进哈希，「升版本但 token 面没变」也会让 `shapeDigest` 变，G6 的「版本变而形状未变 → 自动放行」就永远触发不了。指纹只描述**观测到的形状**，不描述「应该是什么形状」——这是整个方案能长期存活的关键。

为什么两个而不是一个：

- `shapeDigest` 变 = **契约形状变了**（名字增删、承载体迁移、生效性翻转、钩子消失）→ 必须处理，必须人看。
- 只有 `valueDigest` 变 = **值域变了**（设计师调色）→ 对纯色 token 无害；对结构 token（radius/elevation/font 复合）需要评估。分不开这两者，就无法把「无害的调色」和「要命的迁移」区分开，门禁会天天红。
- 用 FNV-1a 而不是 SHA-256：这是**比较用**的指纹，不是安全哈希；FNV-1a 在浏览器里 20 行且没有异步（`crypto.subtle.digest` 是 Promise，会把采集变成异步链路，增加「探针抛错时页面还没画完」的窗口）。若将来要寄给服务端排障再换 SHA-256。

### 3.3 存储与生命周期

| 时机 | 行为 |
|---|---|
| 每次 `applyStyle()` 前 | 若 `state.hostDigest !== 上次缓存的 shapeDigest`（或首次）→ 跑一次完整采集 |
| 采集完成 | manifest 与两个 digest 存进插件自己的持久化（`localStorage` key `dsh-opencode-palette:probe:v1`），只存 digest + 精简摘要（约 8 KB），**不存 403 条全量** |
| 全量快照 | 只在用户点「诊断 · 导出 manifest」时生成并下载；或门禁脚本里由页面内探针直接 `console.log(JSON.stringify(...))` |
| 采集失败 | 写 `channels.*` 状态，**不覆盖**上次成功的 digest（否则下一次会误判成「全都变了」） |
| 绝不 | 每帧/每次主题切换都重扫。8 张表约 120 KB 文本 + 403×3 次 `getComputedStyle`，成本不可忽略（§8 待测） |

---

## 4 漂移检测与降级矩阵

### 4.1 漂移分类（7 类）

| ID | 类 | 检测信号 | 严重度 |
|---|---|---|---|
| **D1** | 新增 | manifest 出现我们不认识的 `--dsw-*` / data 钩子 | 无（记录） |
| **D2** | 改名 | 我们依赖的名 `state==='missing'`，且同族出现新名 | 高 |
| **D3** | 删除 | 我们依赖的名 `state==='missing'`，同族无候选 | 高 |
| **D4** | 值域变化 | `declared`/`declaredBy`/`state` 不变，`valueDigest` 变 | 中（纯色）／高（结构） |
| **D5** | **承载体迁移** | 名在、值在，但 `declaredBy` 从 `['body']` 变成 `['html']`（或反向） | **最高** |
| **D6** | 选择器/钩子消失 | `hooks[sel].hit === 0` | 中 |
| **D7** | 注入机制变化 | `channels.declared === 'none'`（或 sheet 数从 8 掉到 1） | 高 |

D5 单独列为最高，理由在结论 4：**它同时满足「静默」「看起来正常」「影响全局」三条**。名字还在、值还对、消费方还在，唯独我们的覆盖写到了不生效的元素上。界面上会出现「一半界面是我们的配色、一半是宿主默认」——这种半对半错比全错更难被用户描述清楚。

### 4.2 降级优先级（P0 最高）

| 级 | 动作 | 语义 | 何时用 |
|---|---|---|---|
| **P0** | **不写该名** | 把名字从 `render.tokens` 里剔除 → 宿主默认生效 | 任何 `missing` / `declared-invalid` / `pinned` 命中。默认路径 |
| **P1** | 引擎派生 | 用 `DERIVED_TOKENS` 从已知颜色算出值；或从同族仍活着的 token 推导 | P0 会明显破版（如前景色没了会变黑底黑字）时 |
| **P2** | 已知改名表 | `TOKEN_ALIASES: 旧名 → 新名`，只在**确认**改名时用 | 探针报 D2 且我们已把映射写进表 |
| **P3** | 功能禁用 + UI 提示 | 整块能力关掉（毛玻璃、背景图、字体预设），设置页顶部显示一条可关闭的横幅 | D5/D7 且 P0–P2 都不够 |
| **P4** | 探针告警 | 一条聚合 `console.warn` + `probe/last-warning` 摘要 | 上述任一发生后，统一收口 |

**P0 之所以排第一**，不是因为它最好，而是因为它**不产生新的错误信息**。我们的每一个「聪明的兜底」（用近似色、用最像的名字）都会把一个「明显没生效」变成「说不上哪里不对」。对主题插件来说，用户看到宿主默认配色会立刻来报；看到错色会怀疑自己的眼睛。

### 4.3 响应矩阵

| 漂移 | 探针输出 | 引擎侧 | UI | 日志 |
|---|---|---|---|---|
| D1 新增 | `newNames: string[]`（不告警） | 无动作 | 无 | 无 |
| D2 改名 | `drift: 'renamed'`，附 `candidates`（同族、名相近，**仅作提示**） | 旧名 → P0 剔除；若表内有映射 → P2 换名 | 诊断页列出「N 个颜色疑似改名，点此查看」 | 一条 warn |
| D3 删除 | `state: 'missing'` | P0 剔除；若该名是 `TOKEN_MAP` 的必需项 → P1 派生 | 诊断页列出缺失名 + 影响的颜色 | 一条 warn |
| D4 值域（纯色） | `valueDrift: true` | 无（我们覆盖它） | 无 | 无 |
| D4 值域（结构） | `valueDrift: true` + `structural: true`（radius/elevation/font/shadow/gradient/mask 族） | 相关预设进 `degraded` 集合，不发射不合形状的值 | 设置页对应分组出现「宿主版本变化，此组暂不可用」 | 一条 warn |
| D5 承载迁移 | `relocated: [{name, from:'body', to:'html'}]` | 覆盖目标切换：写 `html` 而不是 `body`（或两处都写，按 `declaredBy` 决定） | 一条横幅「检测到宿主样式层变化，已自动适配」 | 一条 info |
| D6 钩子消失 | `hooks[sel].hit === 0` | 该条 `CSS_RULES` / fx 规则跳过（CSS 本来也静默失效，但**我们要能说出来**） | 诊断页显示「代码块圆角样式未生效」类具体项 | 一条 warn |
| D7 注入机制变 | `channels.declared: 'none'` | **不剔除任何名字**（避免把「读不到」当成「不存在」），退回纯 `TOKEN_MAP` 发射 | 横幅「无法读取宿主样式表，已按内置清单运行」 | 一条 warn |
| 采集抛错 | `channels.* = 'failed'` + `error.name` | 同上，不过滤 | 无（INV-5 静默成功路径） | 一条 warn |

D5 的实现要点：我们的 CSS 与 token 注入**当前都锚在 `body`**（`runtime/client.ts:736` 让 presenter 写 body 行内；`buildTypographyCss` 用 `'body,body[data-ds-dark-theme]{...}'` 前缀，`src/engine/generate.ts:140-180`）。若 `declaredBy === ['html']`，正确做法不是改生成器，而是**给生成器的输出加一个前缀重写**（把 `body` 选择器换成 `html`）——但注意特异性会变（`body[data-ds-dark-theme]` 是 0-1-1，`html[data-ds-dark-theme]` 同权重），且 `:root` 与 `html` 不同源（`:root` 是伪类，特异性 0-1-0）。**这是一个必须在实机上验的点（§8-9），本研究只坐下结论：优先用「两处都写」`html,body{...}` 规避特异性重算。**

### 4.4 改名表怎么维护（以及为什么它必须是「表」而不是「启发式」）

- 表放在 `src/engine/host-aliases.ts`（新文件），形如 `{ from: '--dsw-alias-brand-foo', to: '--dsw-alias-brand-bar', since: '0.2.2' }`。
- **填表时机**：只在「探针报 D2 + 人工在实机确认宿主改名 + 该名不可替代」时填。日常不填。
- **不允许自动填**：把 `candidates` 自动写进表，等于把一次可诊断的缺色固化成一次静默错色。`candidates` 只用来在诊断页上给人看。
- 与既有先例的关系：`src/engine/map-dsh.ts:28-29` 的注释记录了「`--dsw-specific-menu` 的不透明底会杀掉毛玻璃，所以主动从 TOKEN_MAP 删除」——**这就是一次人工漂移响应**，只是当时没有机制承载它，只能写注释。改名表 + `pinned` 集合就是把这类注释变成可执行数据。

---

## 5 现有引擎 fallback 复用评审

### 5.1 可直接复用（4 项）

| 机制 | 位置 | 复用于 | 备注 |
|---|---|---|---|
| `usable()`：缺槽 / `transparent` / `__error` → `null` | `src/engine/generate.ts:61-68` | **P0 的实现原型** | 它已经在做「缺了就不写」，只需把判据从「槽缺」扩到「宿主名缺」 |
| `put2()`：单/双半发射 + `singlePalette` 修复 | `src/engine/generate.ts:85-107` | 过滤层之后的值写入 | 探针只决定「写不写」，不碰「怎么写」——`put2` 不用改 |
| `DERIVED_TOKENS` 逐条 `try/catch` | `src/engine/generate.ts:112-122`；表在 `src/engine/map-dsh.ts:120-170` | **P1**：单条派生失败不污染整体 | 现成证据：40+ 条派生里任何一条抛错都被隔离。探针的 D3 响应可以直接复用这个隔离粒度 |
| 槽级别名链 `fallback` | `src/engine/map-dsh.ts:242-297`（`COLOR_SLOTS` 的 `fallback` + `normalizeThemeColors`） | **P2 的一种形态** | 形状完全对：`sidebarBg ← background`。探针版是 `旧宿主名 ← 新宿主名`。**方向不同但结构同构**，可以抄实现（一个是「槽缺了下游顶上」，一个是「名没了上游换名」） |

### 5.2 三个缺口

- **G1 没有「名字存在性」维度**。`TOKEN_MAP` 是 `[hostName, slot]` 的二元组（`src/engine/map-dsh.ts:20-97`），静态、无条件下信任。缺的是第三列语义：「这个名字在几个版本里叫过什么」。→ 探针以**外部集合**注入，不改表结构（改表会让 403 名的对照表与源码脱钩）。
- **G2 没有「承载体」维度**。所有输出默认锚在 `body`。D5 无处表达。
- **G3 没有「值域语义」维度**。`KEYCAP` 那组常量（`src/engine/map-dsh.ts:102-116`）是对**值域**的隐式假设：radius 会被当成 0.16–0.4 的键帽比例来算对比度。若宿主把 radius 梯度从「6 档 px」换成「2/4/6/8」，这些派生不会抛错，只会**算出一个不合法但能渲染的值**——这正是「静默错色」的引擎侧版本。探针的 D4 结构判定就是给它补一个显式闸门。

### 5.3 接入点：过滤层，不是重写

```
renderTheme / renderCustomTheme        // 不变
  → render = { tokens: Record<string,string>, css: string, meta }
  → probe.filter(render.tokens)        // 新：纯函数，(tokens, manifest) => { tokens, dropped[], relocated? }
  → theme.overrideTokens('opencode-palette', tokens)   // 现状 runtime/client.ts:736
  → styleTag.textContent = render.css  // 现状 :743（css 层不改，选择器问题由 D6 只报不修）
```

三个理由：

1. **不破坏生成器的不变式**。「输出完全由输入决定」（`src/engine/generate.ts:1-2`）——过滤层是输入的一部分，生成器本身仍是纯函数。若改生成器，`renderCustomTheme` 的自定义主题预览路径（`runtime/custom-editor.ts:776/789` 用独立小画布）也要跟着改，测试面翻倍。
2. **可单测**。本仓测试直接跑 `.ts`（Node 原生类型剥离），`filter` 的签名是 `(tokens, manifest) => tokens`，manifest 是普通对象 → 用一份合成 manifest 就能覆盖 D2/D3/D5/D7 全部分支，**不需要 DOM**。这是本方案里唯一能在 CI 里跑的部分，也应该是唯一强制的部分。
3. **回滚面最小**。探针坏了就 `filter` 直通（退化为今天的行为）。

`filter` 的签名建议（含「不给结果就当没采集」的退化语义）：

```ts
type FilterResult = {
  tokens: Record<string, string>
  dropped: string[]            // P0 剔除
  relocated: 'html' | 'body' | null
  degraded: string[]           // 结构族，P3
  note: string | null          // 给 UI/日志的一句话
}
function filterTokens(
  tokens: Record<string, string>,
  manifest: ProbeManifest | null,   // null = 采集失败 → 直通
): FilterResult
```

`manifest === null` 时**直通**（不过滤），这是 INV-1 的落点：采集坏了不能变成「主题不生效」。

### 5.4 `update-tokens.ts` 不接探针

它产的是 `dsh-plugin-update` 的 `themeTokens`（24 键，`src/engine/update-tokens.ts:64-83`），且只允许 hex（`hexOf` 在 `:42-47` 把 rgba 判为不合规）。这是**另一个软件**的契约，与宿主 `--dsw-*` 没有任何交集。接上探针只会让「更新器皮肤」的发布多一个失败维度。明确记录为「不接」。

---

## 6 宿主版本来源与判定

### 6.1 三个候选来源

| 源 | 可达性 | 形态 | 稳定性 |
|---|---|---|---|
| `window.__DSH_BOOT__.release.{version, commit?}` | 浏览器侧，页面内 | semver + 可选 commit | T2（已进既有 T 级表：是公开注入的 wire） |
| `process.env.DSH_CLIENT_VERSION` | 宿主进程（Node 侧） | semver | 桌面专属，Web/CLI 无 |
| `@deepseek-ai/dsh-client-ui-theme/package.json` 的 `version` | 需能 resolve 该包 | semver | 桌面 asar 下不可达 |

细节（**事实**）：

- `packages/client/modules/src/client/manifest.ts:85-98` 定义 `WebBootRelease { version: string; commit?: string }`；`:237-239` 解码时校验 `version` 必须是 string；`:343` 是 `readRelease(wire)`。wire 即 `window.__DSH_BOOT__`（同文件 `:223-231`，`packages/client/modules/src/index.ts:563/677`，`packages/client/web/src/boot.ts:61`）。
- `packages/client/modules/src/index.ts:607-610` 的注释说明：release 标识「this package's version, which releases share with the CLI, and the source commit the client build fixes into the built Host artifact」；`:633` 用 `createRequire(import.meta.url)('../package.json')` 拿 `version`；`:635` `const commit = process.env.DSH_CLIENT_COMMIT_HASH`；`:636` `this.release = commit === undefined ? { version } : { version, commit }`。→ **commit 是构建期环境变量注入，缺失时字段直接不存在。**
- 桌面：`apps/desktop/src/main.ts:447-450` 在启动宿主进程时注入 `DSH_CLIENT_VERSION: desktopClientVersion()`；`apps/desktop/src/client-metadata.ts:9-15` 的 `desktopClientVersion()` 读该 env，缺失即 throw；`apps/desktop/README.md:321` 写「Electron 将构建内联的 DSH_CLIENT_VERSION 传给 Host」。Web/CLI 侧 grep `DSH_CLIENT_VERSION` 零命中。
- 宿主侧还有 `getDshRuntimeVersion()`：`packages/boot/app-boot/src/plugin-compatibility.ts:44-49`，读本包 `package.json` 的 `version`，导出在 `app-boot/src/index.ts:22`，`apps/cli/src/bin.ts:27` 用它做 `engines.dsh` 兼容闸门（规则见 `app-boot/README.md:52`）。

### 6.2 桌面 vs Web 差异

| 维度 | 桌面（Electron） | Web / CLI |
|---|---|---|
| `html[data-platform]` | 有：`darwin/win32/linux`（`apps/desktop/src/preload-platform.ts:11`；`ui-primitives/src/darwin-desktop.ts:5` 注释「plain web never sets it」） | **无**（缺失即视为 web） |
| 窗口全局 | `__DSH_HOST_PATHS__` / `dshDesktopBoot` / `dshPlatform` / `dshDesktop` / `__DSH_LOCALE__`（`apps/desktop/src/preload-app.ts:82-103`） | 无 |
| `process.env.DSH_CLIENT_VERSION` | 有 | 无 |
| `__DSH_BOOT__.release` | 有（**推断**：由 `packages/client/web` 的 boot 统一注入，桌面只是把同一份 web 产物装进 Electron；§8-1 可一行确认） | 有 |
| 宿主 package 可达性 | 在 `app.asar` 内，profile 树里没有 | 视安装方式而定 |
| DOM 版本标记 | **无**（`apps/web/index.html` 没有 meta/generator 标记，`<html lang="en">` 由 `DSH_CLIENT_TITLE` 换 title） | 同 |
| HTTP 可达性 | `401`（`main.ts:454` 用 `authenticateWebHost` 换 cookie） | 视部署 |

**结论**：唯一同时覆盖两端的版本源是 `__DSH_BOOT__.release.version`；`commit` 是**可选**（桌面官方包很可能没有，见 6.3）；`data-platform` 是**平台**不是版本，绝不能拿它当版本判据（darwin 才能区分、win32/linux 都只是「非 mac」）。

### 6.3 semver-only 的指纹缺陷（以及为什么这不致命）

本机实测：`dsh-client-modules/lib/index.js` 里 `this.release = { version, commit }`，但全文**没有 40 位 hex 字面量、也没有 `DSH_CLIENT_COMMIT_HASH` 字样** → **推断**：官方桌面构建未注入 commit，`release` 实际是 `{ version }` 单字段。同理，asar 内所有 `@deepseek-ai/*` 的 package.json 都是 `0.2.1-rc.2` —— 意味着**构建期没有写任何 build 号**。

后果：同一个 `0.2.1-rc.2` 可能对应两个不同的产物（重新构建、patch 打进去）。**版本号无法唯一决定 token 面。**

对策不是「想办法拿到更细的版本」，而是**不靠版本**：

- 指纹来自 A+B 的观测结果，天然覆盖「同版本不同产物」。
- 版本号只作为**分组标签**：`(hostVersion, shapeDigest)` 二元组才是基线键。门禁规则「同 `hostVersion` 而 `shape` 变 → 强制复核」正是为这个场景写的。
- 反过来：「`hostVersion` 变而 `shape` 未变」→ 自动放行。这在宿主只改文案/改 bug 的版本里是常态，能让门禁长期保持绿色。

---

## 7 已知钉死项的处理

### 7.1 darwin `--dsw-specific-menu` = 94% 不透明

**事实**：`packages/client/ui-theme/src/styles/design-platform.css:400-408` 有两条覆盖：

```css
html[data-platform='darwin'] body                  { --dsw-specific-menu: rgba(248,249,250,0.94); }
html[data-platform='darwin'] body[data-ds-dark-theme] { --dsw-specific-menu: rgba(48,49,54,0.94); }
```

特异性 0-1-2 / 0-2-2，**只在 `html[data-platform='darwin']` 下匹配**。文件内注释解释了原因：「没有 MenuSurface 不透明背板的浮层在 macOS 上保持近不透明」。

处理：

- 探针把该名在该平台下标 `state: 'pinned'`（2026-10-22 #147 定稿：pinned 只表示宿主压制；用户层仍允许设置、只提示，引擎默认不覆盖），**不当成漂移**（值域里 `0.94` 是设计意图，不是异常）。
- 我们默认**不覆盖**它。要毛玻璃就必须写 `html[data-platform='darwin'] body{--dsw-specific-menu: ...}` 同权重规则，且排在宿主之后——可以做到，但那是**主动背离宿主平台设计**，必须做成用户可见的开关（默认关）并每次宿主升级复验。
- 非 darwin 平台上该规则的 `html[data-platform]` 不匹配 → 值来自 `design-platform.css` 主声明。Windows 桌面实测 `data-platform="win32"`，所以**本机永远看不到 94%**——这也是为什么这条必须在 mac 上单独验，不能拿 Windows 的效果推断。

### 7.2 `--dsw-mask-blur: none`

**事实**：`gradient-shadow-text.css:19` 声明 `--dsw-mask-blur: none`。文件内注释（同段）说明了它与 `--dsw-menu-backdrop-filter: blur(40px) saturate(150%)`（`:20`）的配合：宿主自己控制遮罩模糊，插件不应参与。

处理：进**拒绝发射名单**（`PINNED_NO_EMIT`）。探针把它标 `pinned`，`filter` 若发现 `render.tokens` 里出现该名则剔除并记一条 warn（真正的 bug 信号：我们不该生成它）。加一条负向断言测试：`Object.keys(renderTheme(...).tokens) ∩ PINNED_NO_EMIT === ∅`。（注：这是引擎过滤层策略；2026-10-22 #147 决定用户层仍允许写 pinned 名、只提示不阻止。）

**现状核查**：`src/engine/*.ts` 里 grep `mask-blur` / `specific-menu` 只命中 `map-dsh.ts:28` 的一句注释（记录 F3 退出），引擎当前**不发射**这两个名 → G2 天然通过，这条测试是防回归而不是修 bug。

### 7.3 字体 149/150 longhand 死名

**事实**：`--dsw-font-*` 族 184 个唯一名（含复合值与 longhand），其中 149/150 个 longhand 无消费方，唯一活的是 `--dsw-font-markdown-code-font-family`（`packages/client/ui-text/src/client/user-text.module.css:31` 引用）。我们目前仍会生成 `--dsw-font-markdown-*` 的复合 + longhand（`src/engine/generate.ts:140-180`）。

处理：

- 不硬编码「149 个死名」清单（宿主补上消费方那天它就骗人了），而是**用 `consumers === 0` 动态判定** `dead`。
- UI 上：`dead` 的排印旋钮不展示，或展示为置灰 + tooltip「宿主当前不消费此变量」。
- 生成器侧**不需要改**：发射死名无害（多几个没人读的自定义属性），有害的是**让用户以为它有效**。所以这项的修复点在 UI 与文档，不在引擎。这条区分很重要——否则会有人去删生成逻辑，把 `--dsw-font-family`（复合值，宿主消费）和 longhand（可能哪天被消费）混为一谈。

---

## 8 需实机验证清单（只能在运行中的 GUI 里确认）

> 前提：裸 HTTP 取页返回 **401**（本机实测），桌面版的页面必须带 `authenticateWebHost` 换来的 cookie。所以下面每一条都设计成「在 DevTools console 里一行或走设置页诊断按钮」，**不要依赖 curl**。

| # | 要确认的 | 怎么验 | 若不成立的影响 |
|---|---|---|---|
| 1 | `window.__DSH_BOOT__.release` 实际形状 | `JSON.stringify(__DSH_BOOT__.release)` | 若 `release` 都不存在 → 版本源全灭，只能靠指纹 |
| 2 | 桌面是否真的没有 `commit` | 同上，看有没有 `commit` 字段 | 推断若错，则多一个更细的基线键可用 |
| 3 | `html[data-platform]` 的实际值（win32）与 Web 版缺失 | `document.documentElement.dataset.platform` | 平台判定失效 → darwin 钉死项无法条件化 |
| 4 | 8 张表能否被 `style[data-plugin-css]` 全部命中 | `[...document.querySelectorAll('style[data-plugin-css]')].map(e=>e.dataset.pluginCss)` | 若属性的实际值与源码不符 → A 通道锚点失效 |
| 5 | `--dsw-corner-shape` 在本机 Electron 里算不算有值 | `getComputedStyle(document.documentElement).getPropertyValue('--dsw-corner-shape')` | 决定 `gates` 字段是否真有区分力（Electron 44 的 Chromium 版本待确认） |
| 6 | `--shiki-foreground` 在 html 与 body 的差值 | 两行 `getComputedStyle` | 校验 `declared-invalid` 三态判定 |
| 7 | `--dsw-specific-menu` 在 win32 的实际值 | 同上 | 校验「非 darwin 不该看到 94%」 |
| 8 | A 通道耗时（8 表 / 约 120 KB 文本） | `performance.now()` 前后差值 | 决定能否放在启动路径（>50 ms 就要挪到 `requestIdleCallback`） |
| 9 | `html,body{...}` 双写是否等价于 `body{...}`（D5 的规避方案） | 临时在 console 注入一条对比规则 | 不成立则承载体迁移必须走「前缀重写 + 特异性重算」 |
| 10 | 我们注入的 `<style>` 与宿主 8 张表的先后（级联顺序） | `[...document.head.querySelectorAll('style')].indexOf(ourTag)` | 我们的表是 `appendChild` 到 head（`runtime/client.ts:741`），理论上在宿主之后 → 同权重下我们赢。需确认宿主不在之后插表 |
| 11 | 宿主 `ctx.get('theme')` 在无 theme 服务时的返回（`undefined` 还是抛错） | 只能读 cordis 语义，页面内难验 | `:713` 的 `if (!theme) return` 已兜；但 `:736` 的 `theme.overrideTokens` 仍需 typeof 守卫（**这是唯一确定要改的点，不依赖实机**） |
| 12 | `data-menu-material` / `[data-shell-overlay]` / `[data-composer-seat]` 等钩子的实际命中 | 逐个 `querySelectorAll(...).length` | 决定 hooks 表里哪些能进（命中恒 0 的钩子应从断言里删掉，否则门禁恒红） |
| 13 | 采集中途切主题（light↔dark）时 `computed` 是否稳定 | 切两次再采一次，比 `valueDigest` | 不稳定说明采集必须锁定外观，否则指纹噪声化 |
| 14 | 用户机上 `app.asar` 是否都能按本机方式解析 | 换一台/换版本试 | 决定 C 通道是否值得保留（大概率不值得） |

---

## 9 验收门禁（V3 发布前）

**门禁 G1–G6 全部自动化，跑在 CI（Node，无 DOM）**，只有 G0 需要人在页面内跑一次。

| 门 | 断言 | 失败含义 |
|---|---|---|
| **G0** 基线采集 | 在 win32 桌面 + Web 各导出一次 manifest，入库为 `docs/research/probe-baseline/<hostVersion>.manifest.json` | 没有基线就没有 diff 参照 |
| **G1** 覆盖率 | 我们对 `TOKEN_MAP ∪ DERIVED_TOKENS ∪ SHIKI_MAP` 声明的每个名字，在基线里 `state` ∈ {`live`, `dead`, `pinned`}（**不允许 `missing` / `declared-invalid`**，除非在例外清单里且带理由；`pinned` 仅表示宿主压制，不是用户禁令） | 有名字在我们以为活着的地方其实不存在 |
| **G2** 拒绝发射 | `PINNED_NO_EMIT`（含 `--dsw-mask-blur`）与生成器输出交集为空（**仅引擎过滤层**；用户层 raw_tokens / 能力仍允许写 pinned 名，只提示） | 有人给钉死项加了写入口 |
| **G3** 过滤层单测 | 用合成 manifest 覆盖 D2/D3/D5/D7 四类分支 + `manifest === null` 直通分支 | 降级逻辑本身没被测 |
| **G4** 白屏门禁 | 在 `overrideTokens` 缺失、`manifest` 为 null、`getComputedStyle` 抛错三种注入故障下，`applyStyle()` 仍返回值且 `styleTag` 有内容 | 探针或宿主变化能把整套主题带崩 |
| **G5** 指纹稳定 | 同一输入跑两次 `filter` + `digest`，逐字节相同（含键序） | INV-3 破了，基线 diff 全是噪声 |
| **G6** 漂移可见 | 用构造的「承载体迁移」manifest 跑一遍，必须产出 `relocated !== null` 且 UI 文案非空 | 最危险的 D5 静默通过 |

> 注：上表 `state` 是探针内部六值口径；**用户层**状态模型见 `palette/tokens.yaml` 的 `status_model`（主状态 live/dead/missing + 修饰 declared_invalid/pinned/gated），v1.6 已单源化。

G0 的「入库基线」要不要进 git：**要**（几 KB 的 JSON，是唯一能让人在 review 时看见「宿主这次改了什么」的东西）。但**不要**入库完整 403 条快照（约 80 KB 且每次升级全变）——入 `digests` + `hooks` + `drift` 摘要即可，全量快照只在本地排障时生成。

---

## 10 复现命令与证据索引

### 10.1 源码侧（对齐 403/602）

```powershell
cd D:\Temp\dsh-src\packages\client\ui-theme\src\styles
# 唯一名
(Select-String -Path *.css -Pattern '(--dsw-[a-z0-9-]+)\s*:' -AllMatches |
  ForEach-Object { $_.Matches } | ForEach-Object { $_.Groups[1].Value } |
  Sort-Object -Unique).Count            # → 403
# 声明处数
(Select-String -Path *.css -Pattern '--dsw-[a-z0-9-]+:' -AllMatches |
  ForEach-Object { $_.Matches.Count } | Measure-Object -Sum).Sum   # → 602
```

### 10.2 桌面安装侧（asar）

```powershell
$asar = 'D:\DeepseekHarness\resources\app.asar'
$fs = [IO.File]::OpenRead($asar)
$hdr = New-Object byte[] 16; $null = $fs.Read($hdr, 0, 16)
$pickle = [BitConverter]::ToInt32($hdr, 4)          # 0x0048ef0c
$jsonLen = [BitConverter]::ToInt32($hdr, 12)        # 0x0048ef04
$dataStart = 8 + $pickle                            # 4779796
# 之后按 JSON 目录（filename/offset/size）取 dsh/node_modules/@deepseek-ai/dsh-client-ui-theme/lib/client.js
```

本机取到的：`lib/client.js` 120 426 B / 120 024 字符；`--dsw-` 902 次 / 唯一 403；`--dsw-*:` 602 处 / 唯一 403 → 与源码一致。

### 10.3 证据索引

| 事实 | 证据 |
|---|---|
| 8 张 sheet 的注入方式与 `data-plugin-css` 锚点 | `packages/client/ui-theme/src/client/styles.ts:11-39` |
| 403 / 602 / 承载体在 body | `docs/research/v3-capability-matrix.md` §2；本文 §10.1 复现 |
| `@supports` 门（corner-shape / scrollbar） | `corner-shape.css:16-25`、`scrollbar.css:45` |
| 逐元素重绑的理由 | `scrollbar.css:46-50`、`gradient-shadow-text.css:31-40` |
| `declared-invalid` 样本 | `shiki.css:7-19` + `CodeBlock.module.css:92-94` |
| darwin 94% | `design-platform.css:400-408` |
| `mask-blur: none` | `gradient-shadow-text.css:19` |
| 唯一活 longhand | `packages/client/ui-text/src/client/user-text.module.css:31` |
| release wire 定义与解码 | `packages/client/modules/src/client/manifest.ts:85-98 / :237-239 / :343` |
| release 来源（version / commit） | `packages/client/modules/src/index.ts:607-610 / :633 / :635-636` |
| 桌面 env 注入 | `apps/desktop/src/main.ts:447-450`、`apps/desktop/src/client-metadata.ts:9-15` |
| `data-platform` | `apps/desktop/src/preload-platform.ts:11` |
| 宿主侧 version | `packages/boot/app-boot/src/plugin-compatibility.ts:44-49` |
| presenter 写 body 行内 | `packages/client/ui-layout/src/client/theme-presenter.ts:87-90` |
| 我们注入 style 的位置 | `runtime/client.ts:736-743` |
| `applyStyle()` 的 8 个裸调用点 | `runtime/client.ts:630 / 890 / 901 / 919 / 926 / 931 / 941` |
| `usable()` | `src/engine/generate.ts:61-68` |
| `put2()` | `src/engine/generate.ts:85-107` |
| DERIVED 逐条 try/catch | `src/engine/generate.ts:112-122` |
| `TOKEN_MAP` / `DERIVED_TOKENS` / `SHIKI_MAP` / `CSS_RULES` | `src/engine/map-dsh.ts:20-97 / 120-170 / 173-184 / 188-199` |
| 槽级别名链 | `src/engine/map-dsh.ts:242-297` |
| `update-tokens` 与宿主无关 | `src/engine/update-tokens.ts:42-47 / 64-83` |

---

## 11 未决问题（交给后续票）

1. **`.dsh` profile 里的插件能否拿到宿主包路径**：本机 profile 树无 `@deepseek-ai/dsh-*`，所以「用 package.json 的 version」在当前分发形态下不可行。要不要在插件清单里要求宿主暴露一个版本 API（上游合作项）？本文倾向「不要」，因为指纹已覆盖。
2. **`html,body` 双写的等价性**（§8-9）未验证。若不成立，D5 的响应要升级为「生成器输出前缀重写」，改动面会从过滤层扩到 `generate.ts`——这条会改变 5.3 的结论，必须先验。
3. **采集成本**（§8-8）未测。若 >50 ms，manifest 采集必须挪到 `requestIdleCallback`，且首次启动会有一小段「未探测」窗口——那时用 `TOKEN_MAP` 直通（同 §4.3 D7）。
4. **`hooks` 表的最终名单**（§8-12）。命中恒 0 的钩子会把 G6 变成常红。需要一次实机命中统计来定表。
5. **darwin 覆盖要不要给开关**（§7.1）。这是产品决策，不是技术决策。
6. **基线入库的粒度**（§9 G0）。摘要 vs 全量，本文建议摘要，但若将来要做「宿主升级 diff 报告」生成器，可能需要全量——那时应该单独一个 `probe-snapshots/` 目录并不进 npm 包。
