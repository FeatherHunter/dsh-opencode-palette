# GitHub README 折叠块外观能不能改？——`<details>/<summary>` 的样式边界与可行替代（v2）

> 研究日期 2026-10-24 ｜ 对象：**github.com 站内 Markdown 渲染（GFM）** ｜ 关联前序：[README 折叠语法与视频嵌入研究](./readme-collapsible-demo-videos.md)（2026-10-23）
>
> **文件说明**：任务目标路径 `readme-collapsible-summary-styling.md` 在本报告落笔前已被并行产出占用（359 行，含 `.local/gh-docs` 快照）。按「不覆盖他人文件」约定，本文件独立成稿为 `-v2`，不复制其正文；与它的差异和一处勘误见 §5.1。
>
> 本文只回答一件事：折叠块的「按钮/标签行长什么样」能不能改、改到什么程度、边界在哪。折叠语法本身、视频嵌入方式见前序报告，不重复。

---

## 0. 结论先行（3 问 3 答）

**Q1：这种样式问题在 Markdown 语法中能解决吗？——不能。**
GFM 规范里没有任何「颜色 / 背景 / 边框 / 字体」语法，折叠也不是 Markdown 语法：`<details>/<summary>` 是原生 HTML，只是被 GFM 当作 HTML block 原样放行。你看到的深色/浅色条和黑色三角，是**浏览器给 `<summary>` 画的默认 disclosure 标记** + GitHub 主题色，不是 Markdown 元素。

**Q2：是 Markdown 能解决、但 GitHub 有限制吗？——能力在 HTML/CSS，不在 Markdown；GitHub 确实在清洗层把它拦住了。**
同一段 `<details><summary style="…">` 放到普通网页（或 GitHub Pages）里是有效的；在 github.com 上，`style` 属性、`class`、`<style>` 标签全部被剥掉或转义。所以不是「Markdown 写错了」，而是**渲染管线的安全策略不允许作者注入 CSS**。GitHub 官方仓库自己写明会「aggressively removing … inline-styles, and `class` or `id` attributes」。

**Q3：GitHub 渲染机制内其实有技术能解决吗？——只能改「内容」，不能改「控件」。**
在 github.com 内可以做到：给 summary 加 emoji、粗体、`<kbd>`、`<mark>`、图片/主题自适应横幅，加 `open` / `title` / `name` / `align` 等属性；**不能**改三角形状与颜色、行背景、hover、字体、间距、圆角。想要完全自定义外观，只有离开 README 渲染器：GitHub Pages 自建页，或放一张「假按钮」图片（但图片不能真的展开/收起）。

---

## 1. 先定性：那个「黑箭头 + 灰条」不是 Markdown 画的

### 1.1 GFM 没有折叠语法，`<details>` 是 HTML block

[GFM 规范](https://github.github.com/gfm/) 第 4.6 节「HTML blocks」的 type 6 起始条件原文（节选，`details`、`summary` 都在列表内）：

```text
Start condition: line begins the string < or </ followed by one of the strings
(case-insensitive) address, article, aside, ... details, dialog, dir, div, dl, dt,
fieldset, figcaption, figure, footer, form, ... summary, table, ...
```

也就是说：`<details>` 之所以能出现在 README 里，是因为 GFM 允许 HTML block 透传，而不是因为 Markdown 有折叠语法。规范第 3–6 章定义的块级/行内语法只覆盖结构（标题、列表、引用、代码、强调、链接、表格、任务列表、删除线等），**没有颜色、背景、边框、字体这类呈现属性**。

### 1.2 GitHub 官方文档也把它当 HTML 讲

[Organizing information with collapsed sections](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-collapsed-sections)（正文纯文本 API：[article/body](https://docs.github.com/api/article/body?pathname=/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-collapsed-sections)）原文：

```text
You can streamline your Markdown by creating a collapsed section with the `<details>` tag.

Within the `<details>` block, use the `<summary>` tag to let readers know what is inside.
The label appears to the right of ▶.
```

最后一句很关键：**▶ 是 GitHub/浏览器 UI 的位置说明**，文档从头到尾没有承诺任何外观定制能力。该文全文出现 `style` 0 次、`color` 0 次、`CSS` 0 次。

### 1.3 三角到底是谁画的

- 浏览器默认样式：`summary { display: list-item; }`，三角来自 list-item 的 `::marker` 伪元素，**不在 DOM 里**，无法用 HTML 属性选中。
- GitHub 的 Primer CSS 只加了两条相关规则（[primer 样式包](https://github.githubassets.com/assets/primer-38ae573fa780d76a.css)）：`summary{display:list-item}` 与 `details summary{cursor:pointer}`；**没有**给 summary 设背景色/文字色，行背景来自所在容器与主题变量。
- 于是：三角形状/颜色 = 浏览器 + 主题；行背景 = 主题容器。两者都不接受作者输入。

---

## 2. GitHub 限制的机制证据

### 2.1 官方自述：清洗是流水线的一步

[github/markup README L7](https://github.com/github/markup/blob/master/README.md)：

```text
2. The HTML is sanitized, aggressively removing things that could harm you and your kin
   —such as `script` tags, inline-styles, and `class` or `id` attributes.
```

同文件 L12 补充：markup 这个 gem 本身**不做**清洗，清洗发生在 GitHub.com 的管线里。这与 GFM 规范 §1.1 的说法一致：

```text
While GFM supports a wide range of inputs, it's worth noting that GitHub.com and GitHub
Enterprise perform additional post-processing and sanitization after GFM is converted to
HTML to ensure security and consistency of the website.
```

### 2.2 白名单源码：`SanitizationFilter`

[github/html-pipeline · sanitization_filter.rb](https://github.com/github/html-pipeline/blob/master/lib/html/pipeline/sanitization_filter.rb)（仓库已 archived，最后推送 2022-03-18，但仍是公开可查的官方实现）：

- `WHITELIST` 定义在 L44–L76；允许元素 L45–L49：`h1`–`h8`、`br`、`b`、`i`、`strong`、`em`、`a`、`pre`、`code`、`img`、`tt`、`div`、`ins`、`del`、`sup`、`sub`、`p`、`ol`、`ul`、`table`、`thead`、`tbody`、`tfoot`、`blockquote`、`dl`、`dt`、`dd`、`kbd`、`q`、`samp`、`var`、`hr`、`ruby`、`rt`、`rp`、`li`、`tr`、`td`、`th`、`s`、`strike`、`summary`、`details`；
- 允许属性 L51–L76：`a[href]`、`img[src|longdesc]`、`div[itemscope|itemtype]`，以及 `:all`（L59–L75）里的 `align`、`title`、`width`、`height`、`name`、`open`、`dir`、`span` 等；
- **`:all` 里没有 `class`、`id`、`style`、`hidden`**（已按 L59–L75 逐行核对，无这三项）；
- `remove_contents ['script']`，并在 L119 调 `Sanitize.clean_node!(doc, whitelist)`。

### 2.3 对照：GitHub 比 sanitize gem 的 RELAXED 更严

[sanitize · relaxed.rb](https://github.com/rgrove/sanitize/blob/main/lib/sanitize/config/relaxed.rb) 的 RELAXED 配置：

- L6–L11 的元素列表**包含 `style`**；
- L15–L16 `:all => %w[class dir hidden id lang style tabindex title translate]`；
- L26 还给 `style` 元素配了 `media scoped type` 属性。

`<style>` 在 RELAXED 里是放行的，但 GitHub 的白名单里没有 → **不是底层库做不到，是 GitHub 主动选了更严的策略**。这正好回答 Q2：限制来自 GitHub 的产品/安全决策。

### 2.4 实测：`POST https://api.github.com/markdown`（未登录）

请求：`POST https://api.github.com/markdown`，Body `{"text":"…","mode":"gfm"}`（PowerShell `Invoke-RestMethod`，未登录，匿名限流）。返回 200，`Content-Type: text/html`。原文节选：

```html
<!-- 输入：<details open class="d" id="d1" hidden style="background:#eee">
     <summary style="background:red;color:blue" class="sum" id="sid" title="tip">styled</summary> -->
<details open="" id="user-content-d1">
<summary id="user-content-sid" title="tip">styled</summary>
<p>para</p>
&lt;style&gt;summary{background:#000;color:#fff}&lt;/style&gt;
</details>

<!-- 输入：<summary>**bold** [link](https://example.com) `code` :smile:</summary> -->
<summary>**bold** [link](https://example.com) `code` 😄</summary>

<!-- 输入：<details name="demo-group">（两个同名实例） -->
<details name="user-content-demo-group">
<details name="user-content-demo-group">

<!-- 输入：<picture><source media="(prefers-color-scheme: dark)" srcset="dark.png">
     <img src="light.png" alt="b"></picture> -->
<themed-picture data-catalyst-inline="true"><picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://camo.githubusercontent.com/…">
  <img src="https://camo.githubusercontent.com/…" alt="b" data-canonical-src="light.png" style="max-width: 100%;">
</picture></themed-picture>

<!-- 输入：<img src="assets/x.svg" width="600" height="80" alt="banner"> -->
<img src="assets/x.svg" width="600" height="80" alt="banner"
     style="max-width: 100%; height: auto; max-height: 80px;">
```

汇总（同一轮全部 200）：

| 输入 | 结果 | 判定 |
| --- | --- | --- |
| `style="…"`（summary / p / details） | 属性消失 | 剥 |
| `class="…"` | 消失 | 剥 |
| `id="…"` | 保留但改写为 `user-content-…` | 保留（不可控） |
| `<style>…</style>` | 转义成 `&lt;style&gt;…` 可见文本 | 转义 |
| `<script>` / `<iframe>` | 同上，变成文本 | 转义 |
| `<link>` | 整个元素消失 | 剥 |
| `hidden` | 消失 | 剥 |
| `poster`（video） | 消失 | 剥 |
| `<source src>`（video 内） | `src` 消失 | 剥 |
| `bgcolor`（table/td） | 消失 | 剥 |
| `<svg>` | 整个移除 | 剥 |
| `open` / `title` / `align` / `name` / `width` / `height` | 保留 | **属性通道** |
| `**bold**`/`[link]()`/`` `code` `` 写在 summary 内 | 原样字面量 | **不解析** |
| emoji `:smile:` | 😄 | 解析 |
| `<b>`/`<kbd>`/`<code>`/`<mark>`/`<h3>` | 保留 | 保留 |
| `<img>` | 保留，外包 `<a>`，按尺寸补 `max-width/height:auto/max-height` | 保留（被代理） |
| `<picture>` | 外包 `<themed-picture>` | 保留（有前置条件） |

> 注：归档白名单里没有 `id`，但实测 `id` 保留并加 `user-content-` 前缀，说明生产管线比 2022 年的开源代码多了锚点处理；核心结论（`style`/`class` 被剥）两边一致。

### 2.5 这套实测能证明什么、不能证明什么

**能证明：** github.com 的 Markdown 渲染管线对 README 类文档做的服务端清洗结果——返回里出现了 `camo.githubusercontent.com`、`class="notranslate"`、`user-content-` 前缀、`<themed-picture>` 这些**只有 GitHub 站内后处理才会产生**的痕迹，说明跑的是同一套管线（`/markdown` 与站内共用后处理，属推断，官方未明文承诺）。

**不能证明：** ①浏览器端 CSS/JS 的最终视觉效果（例如主题横幅是否真的加载，见 §4.1）；②移动端 App、GitHub 新版前端是否有额外处理；③第三方渲染器（npm 包页、VS Code 预览、邮件、marketplace 详情页）——它们各有各的白名单，前序报告已记录 marketplace 详情页会整段剥掉 raw HTML；④`align="center"` 的实际居中效果（只验证了属性保留）。`POST /markup` 返回 404，故结论一律以 `/markdown` 为准。

---

## 3. 三问逐条回答

### Q1：Markdown 语法层能解决吗？——不能，而且这不是「语法没用对」

GFM 没有样式语法，也没有折叠语法；`<details>` 是 HTML block 透传（§1.1）。「折叠按钮太丑」在 Markdown 里**没有对应表达**，不存在「写法对了就好看」的路径；凡称「Markdown 支持自定义折叠样式」，实质都是「HTML+CSS 支持」。

### Q2：是 Markdown 能解决、GitHub 限制了吗？——能力在 HTML/CSS；GitHub 的清洗是那道墙

同一段带 `style` 的 `<details>` 在普通网页有效；在 github.com 上 `style`、`class`、`<style>` 全部被处理掉（§2.2、§2.4）。且有**两道独立的闸**：GFM 的 tagfilter 先把 `<style>` 的 `<` 转义（§6.11 原文列出 `style`，处理方式是「replacing the leading `<` with the entity `&lt;`」），即使清洗器放行，标签也已经是文本；随后 SanitizationFilter 再剥 `style`/`class`。结论：不是 Markdown 语法缺陷，是管线**有意不允许作者注入 CSS**；同理 `<link>` 被移除、`<script>` 被转义、内联 `<svg>` 被移除。

### Q3：GitHub 渲染机制内其实有技术能解决吗？——有，但天花板在「summary 内部」

**能改（内容层）：** emoji、`<b>/<strong>/<i>/<em>`、`<code>`、`<kbd>`、`<mark>`、`<s>/<del>/<ins>`、`<img>`、`<picture>` 深浅色自适应、`<h3>`–`<h6>`（保留但视觉未验证）、`open`、`title`、`name`（手风琴）、`align`（保留、效果未验证）、`width/height`。

**不能改（控件层）：** 三角的形状/颜色/大小/位置、summary 行背景、hover/focus、字体字号、行高内边距、圆角边框、展开动画——全部依赖 CSS 选择 `summary` / `details[open]` / `::marker`，而 CSS 无通道。

**边界一句话：** 你能决定「标签行里写什么、放什么图」，不能决定「这一行本身长什么样」。

---

## 4. 可行手段清单（逐条给证据）

### 4.1 summary 内容层

| 手段 | 可行性 | 证据 | 代价/风险 |
| --- | --- | --- | --- |
| emoji 前缀（🎬 📦 🎨 …） | ✅ 实测 | `:smile:` → 😄；emoji 过滤在清洗之后 | 各平台 emoji 字体不同；别让 emoji 成为唯一语义（读屏会读名称） |
| 粗体/斜体/`<code>`/`<kbd>` | ✅ 实测 | `<b>`、`<kbd>`、`<code>` 均保留；Primer 给 `kbd` 画了边框+底色 | `kbd` 语义是键盘键，拿来做装饰不合适 |
| `<mark>` 高亮 | ✅ 实测 + 有样式 | `mark` 在白名单；Primer `mark{background-color:var(--bgColor-attention-muted)}` | 唯一「真彩色」通道，但高亮色偏黄，容易显脏 |
| shields.io 徽章 `<img>` | ⚠️ 可用但不建议 | img 保留但被包 `<a>` 并走 camo 代理，加 `max-width:100%` | 多一次外网请求；行高被撑高；marketplace/邮件里可能整段消失（前序 R1） |
| `<picture>` 深浅色横幅 | ✅ 官方博客有写法 | [GitHub Blog 2025-04-18](https://github.blog/developer-skills/github/how-to-make-your-images-in-markdown-on-github-adjust-for-dark-mode-and-light-mode/) 明确 `<source media="(prefers-color-scheme: dark)">`；实测返回 `<themed-picture>` | 需要两张图；[community #210469](https://github.com/orgs/community/discussions/210469) 报告新版 UI 下 `themed-picture` 未加载（未证实）；只适合头图，不适合当按钮 |
| 指定尺寸的图片 | ✅ 实测 | `width`+`height` 会补 `max-width:100%; height:auto; max-height:<h>px` | 只保证不溢出，**没有**圆角/底色；不能当卡片 |
| summary 内写 Markdown | ❌ 不解析 | 实测 `**bold**`、`[link]()`、`` `code` `` 原样输出；官方文档那句「The Markdown inside the `<summary>` label will be collapsed by default」实测不成立（文档与实现有出入） | 只能写纯文本 + 行内 HTML |
| summary 内放块级元素 | ⚠️ 保留但语义/视觉存疑 | `<h3>` 实测保留；WHATWG 规定 summary 内容模型为「Phrasing content, optionally intermixed with heading content」 | 行高、对齐不可控，可能把一行撑成两行 |
| `title` 悬停提示 | ✅ 实测 | `<summary title="tt">` 保留 | 移动端无 hover；不能替代可见文案 |

> 结论：**summary 内部是唯一「有技术可做」的地方**，但做出来的是「更好看的一行文字」，不是「更好看的按钮」。

### 4.2 原生三角与行背景

| 想法 | 结果 | 依据 |
| --- | --- | --- |
| `style="…"` 改背景/颜色 | ❌ 被剥 | §2.4 实测 |
| `<style>summary{…}</style>` | ❌ 变成可见文本，页面更丑 | §2.4、GFM §6.11 |
| `class` + 自定义 CSS | ❌ class 被剥，且没有作者 CSS 入口 | §2.2 白名单 |
| `id` + `:target` 技巧 | ❌ id 被改写为 `user-content-*`，且仍需 CSS | §2.4 |
| `hidden` 隐藏三角 | ❌ 属性被剥 | §2.4 |
| 用 `::marker`/伪元素 | ❌ 无 CSS 通道 | §1.3 |
| `dir="rtl"` 把三角挪到右边 | ⚠️ 理论可行（`dir` 在白名单 L64） | 会把整段文字方向翻转，得不偿失；未实测 |
| `open` 默认展开 | ✅ 只改状态 | 官方文档明确支持 |
| `name` 手风琴 | ✅ 实测保留（带 `user-content-` 前缀，同名仍同组） | [MDN details](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details)：同 `name` 组内同时只开一个 |
| `details` 上有没有 `marker`/`icon` 属性 | ❌ 规范只有 `open`、`name` | WHATWG HTML：details 内容属性仅此两个 |

### 4.3 替代呈现

| 方案 | 收益 | 代价 | 是否值得本仓 |
| --- | --- | --- | --- |
| GitHub Alerts（`> [!NOTE]` 等 5 种） | 自带彩色左边框/背景，零自定义 | **不可折叠**，且官方明确「Alerts cannot be nested within other elements」 | 可做「提示条」，不能替代折叠 |
| GitHub Pages 自建页 | 完全自定义 CSS/JS，三角随便改 | 要另建站点/部署；README 里只能放链接；维护成本 | 若「按钮颜值」是硬需求，这是唯一正解 |
| 图片/SVG 假按钮 | 视觉完全可控 | **点了不会展开**；包 `<a>` 只会跳转；SVG 内联被移除，只能当 `<img>` | 仅适合做「封面/入口」，不能做折叠控件 |
| `<table border="1">` 当卡片 | GitHub 给 table 自带边框/表头底色，可框住视频 | 移动端横向滚动；语义错误；代码变长 | 可选，收益一般 |
| `<blockquote>` 当 callout | 左边框 + 弱化文字色，零成本 | 不可折叠；嵌套层级多时视觉吵 | 可选 |
| 结构替代：7 个内层 details 改成 `###` 小标题 | 全页只剩 1 个三角，阅读连续 | 一次展开后页面很长；失去逐条开合 | 值得作为 B 方案评估 |

### 4.4 明确不可行清单（别白试）

`style="…"`、`<style>`、`class`、`id`（可控锚点）、`<link rel=stylesheet>`、`<script>`、`<iframe>`、内联 `<svg>`、`hidden`、`poster`、`bgcolor`、`<video><source src>`、CSS 变量、`::marker`、`@import`、`<object>/<embed>`（未实测，按白名单推断）、任何 JS 交互。
> 一个反直觉点：`<style>` 不是「被忽略」，而是**被转义成正文显示出来**——试图加 CSS 会让页面多出一段 CSS 源码。

---

## 5. 对本仓的建议（只给方案，不改 README）

现状：`README.md` L72–L180 是「外层 1 个 `<details>` + 内层 7 个 `<details>`」，summary 全是单行纯文本，无任何装饰；英文镜像 `docs/README.en.md` 同结构。

**S1（低风险，建议做）：外层 summary 换成「有信息量的标题行」**
把 L75 的单行文本改成：

```html
<summary>🎬 基础使用演示：7 段短视频（安装 / 字体 / 主题 / 自定义 / AI 编辑）</summary>
```

预期：折叠状态下也能看出「点开有什么」，减少「一个光秃秃的三角」的廉价感。风险：几乎为零（纯文本 + emoji）；英文镜像同步改成英文即可。

**S2（低风险，建议做）：7 条内层 summary 统一「emoji + 动作化措辞」**
示意（按现有七条实际标题替换）：`📦 安装`、`🔤 字体与字号`、`🎨 选择主题`、`➕ 新增自定义`、`✏️ 编辑现有`、`🗑️ 删除`、`🤖 AI 编辑`。
预期：七行形成视觉节奏，扫读成本下降。风险：emoji 在部分 Linux 字体下是单色；不要用 emoji 替代文字（可访问性）。

**S3（中风险，建议先在一个分支验证）：给 7 个内层 details 加同名分组**

```html
<details name="demo">
```

预期：手风琴效果，一次只开一个，避免「全展开后 7 个三角排一列」。证据：`name` 保留且同名仍同组（§2.4）。风险：旧浏览器忽略 `name` → 退化为可多开（可接受）；GitHub 移动端/新版前端未实测；若用户想同时对比两段视频，手风琴反而碍事。

**S4（可选，视觉收益最大但最脆）：在外层 details 上方放一张 `<picture>` 深浅色横幅**
用 GitHub 官方博客的 `prefers-color-scheme` 写法，浅色/深色各一张封面图。
预期：折叠行上方有视觉锚点，整体不像「裸 HTML」。风险：需要维护两张图；community 有「新版 UI 不加载 themed-picture」的未证实报告；只解决「页面观感」，不解决「按钮丑」。

**明确不做：** `<style>`、`style=`、`class`、隐藏三角、summary 里塞徽章、`<iframe>` 嵌播放器。

### 5.1 与同目录 v1（`readme-collapsible-summary-styling.md`）的差异

1. v1 未提 `name` 手风琴；本报告补了属性实测、MDN 行为与风险。
2. v1 把「summary 内放块级元素」标为「官方未记载、不建议」；本报告补了 WHATWG 内容模型原文（允许 intermixed heading content），并同样标为「视觉未验证」。
3. v1 说「同时写 width + height 的图片会被自动追加 `background-color: var(--bgColor-muted); border-radius: 6px` 与 `js-gh-image-fallback`」；本报告用同一 API 复测**未复现**：只得到 `style="max-width: 100%; height: auto; max-height: 80px;"`。该「卡片化」可能发生在站内前端而非 API 输出，未能独立验证，故本报告不把它列为可用手段。
4. v1 推荐把 `<picture>` 横幅放进 summary（方案 A）；本报告认为横幅放在外层 details **上方**更稳：summary 是一行控件，塞宽图会把行撑高、并挤压三角与文字的对齐，且英文镜像需两张图。
5. v1 的 `prefers-color-scheme` 用法未给一手出处；本报告补了 GitHub 官方博客（2025-04-18）。

---

## 6. 未核实 / 失败项（如实记录）

1. `POST https://api.github.com/markup` → **404**，该端点不可用；未取得官方「API 与站内同管线」的明文，仅有输出痕迹推断。
2. `align="center"` 只验证了「属性保留」，**未做像素级验证**其居中效果；Primer 公共 CSS 里只有 `img[align]` 规则，居中更可能来自浏览器对遗留属性的处理。GitHub 自家 README 模板使用 `<h2 align="center">`，可作间接旁证。
3. npm 包详情页 `https://www.npmjs.com/package/dsh-opencode-palette` **403**，未能抓取；其渲染差异只能引用前序报告的实测（R1）。
4. `themed-picture` 在新版 UI 的加载问题来自 [community #210469](https://github.com/orgs/community/discussions/210469)（2026-10-16，未回复），**未独立复现**。
5. 移动端 App、GitHub 新版 React 前端、VS Code/邮件等第三方渲染器均未逐一样本测试；本文结论限定「github.com 服务端 Markdown 管线」。
6. 官方文档「summary 内 Markdown 会被折叠」与实测「不解析」冲突，已按实测记录，未找到官方勘误。
7. v1 所述「图片自动卡片化」未复现（见 §5.1 第 3 条）。

---

## 7. 来源

1. [GFM Spec](https://github.github.com/gfm/)（§1.1 post-processing、§4.6 HTML block type 6、§6.11 tagfilter）
2. [GitHub Docs · Organizing information with collapsed sections](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-collapsed-sections)（[纯文本 API](https://docs.github.com/api/article/body?pathname=/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-collapsed-sections)）
3. [github/markup README](https://github.com/github/markup/blob/master/README.md)（L7、L12）
4. [github/html-pipeline · SanitizationFilter](https://github.com/github/html-pipeline/blob/master/lib/html/pipeline/sanitization_filter.rb)（L44–L76 白名单、L119）
5. [rgrove/sanitize · relaxed.rb](https://github.com/rgrove/sanitize/blob/main/lib/sanitize/config/relaxed.rb)（L6–L11、L15–L16、L26）
6. [GitHub Blog · dark/light mode images](https://github.blog/developer-skills/github/how-to-make-your-images-in-markdown-on-github-adjust-for-dark-mode-and-light-mode/)
7. [GitHub Changelog · #gh-dark-mode-only](https://github.blog/changelog/2021-11-24-specify-theme-context-for-images-in-markdown/)（旧机制）
8. [GitHub Docs · Alerts](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts)
9. [GitHub Docs · What is GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
10. [MDN · `<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details)（`name` 手风琴、`open` 布尔属性）
11. [WHATWG HTML · summary 内容模型](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-summary-element)
12. [Primer CSS 样式包](https://github.githubassets.com/assets/primer-38ae573fa780d76a.css)（`summary`/`kbd`/`mark` 规则；未压缩，可检索）
13. 实测：`POST https://api.github.com/markdown`（mode=gfm，未登录，200）；本文所有 snippet 均为返回原文节选（长 URL 以 `…` 截断）。
14. 前序研究：[readme-collapsible-demo-videos.md](./readme-collapsible-demo-videos.md)（折叠语法、视频嵌入、marketplace R1）
