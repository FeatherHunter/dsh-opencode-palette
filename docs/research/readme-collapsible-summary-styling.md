# README 折叠区块（`<details>`/`<summary>`）能自定义样式吗？primary-source 研究

> 日期：2026-10-24 · 触发问题：README 里的章节折叠按钮外观不满意（纯深色/浅色背景 + 黑色三角，点开再点收回）。
> 范围：只研究 GitHub.com 的 Markdown 渲染（README / issue / PR 同一渲染栈），不覆盖 Typora、VS Code、npm、第三方站点等其他 Markdown 渲染器。
> 方法：官方规范/文档原文 + GitHub 官方开源 sanitizer 源码 + 对 GitHub Markdown API 与真实仓库页面的实测。所有 URL 见文末「来源一览」，均可复验。

---

## 0. 结论（TL;DR，先看这节）

| 你的问题 | 答案 |
| --- | --- |
| 1）这种样式问题在 **Markdown 语法** 中能解决吗？ | **不能。** Markdown（CommonMark/GFM）规范里没有“折叠”语法，也没有任何样式语法。`<details>` / `<summary>` 是**直接透传的 raw HTML**；按钮长什么样属于 CSS，不属于 Markdown。 |
| 2）是 **Markdown 本身能解决、但 GitHub 有限制** 吗？ | **是“HTML/CSS 能，GitHub 不许”。** 任何接 CSS 的 Markdown 渲染器都能给 `<details>` 加皮肤；但 GitHub 在 GFM→HTML 之后会**额外 sanitize**（GFM 规范 §1.1 明写），白名单**剥掉 `style` / `class`**，`<style>` 被转义、`<link>` 被删除、`<script>` 不可用。 |
| 3）**GitHub 的渲染机制里** 其实有技术可以解决吗？ | **没有可用的 CSS 通道**；但有“内容层”技巧可以明显改善观感：`<picture>` 深浅色自适应（GitHub 原生组件 `themed-picture`）、SVG/PNG 设计图塞进 summary、emoji、`<kbd>`/`<mark>`/`<sub>`/`<sup>`、`align`/`width`/`height`/`title`/`open`、GitHub 原生 alert 区块；此外同时带 `width`+`height` 的图片会被 GitHub 自动附加 `max-width:100%` 并实测加主题 muted 背景 + 6px 圆角（`js-gh-image-fallback`）。**原生三角箭头、summary 行背景、展开区外观仍然改不了**；要完全自定义只能走 GitHub Pages / 外部站（或只对本人生效的浏览器 userstyle）。 |

**一句话**：GitHub 只让 `<details>` 带“结构”，不让带“皮肤”；皮肤只能以**图片/语义标签**的形式塞进 summary 的**内容**里。

---

## 1. 官方文档：只讲结构和行为，完全不讲样式

来源：[GitHub Docs · Organizing information with collapsed sections](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-collapsed-sections)
（正文抓取：`https://docs.github.com/api/article/body?pathname=/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-collapsed-sections`，2026-10-24；本地快照 `.local/gh-docs/collapsed.md`）

原文关键句（逐字；原文的 ▷ 处是一个右三角 octicon 图标，页面显示为 ▷，下同）：

> You can streamline your Markdown by creating a collapsed section with the `<details>` tag.

> Any Markdown within the `<details>` block will be collapsed until the reader clicks ▷ to expand the details.

> Within the `<details>` block, use the `<summary>` tag to let readers know what is inside. The label appears to the right of ▷.

> Optionally, to make the section display as open by default, add the `open` attribute to the `<details>` tag:

官方示例结构（原样）：

```markdown
<details>

<summary>Tips for collapsed sections</summary>

### You can add a header

You can add text within a collapsed section.

You can add an image or a code block, too.

</details>
```

文档配图的 alt 原文也印证默认外观就是浏览器原生三角：

> … showing a right-facing arrow and the header "Tips for collapsed sections."
> … The collapsed section contains headers, text, images, and code blocks.

**关键事实**：整页官方文档只教 `<details>`、`<summary>`、`open` 三件事，**没有任何** style / class / 主题 / 自定义 CSS 的说明。也就是说，GitHub 官方从文档层面就没打算让你改折叠按钮的外观。

---

## 2. GFM 规范：raw HTML 透传 + 渲染后“额外 sanitize”

来源：[GitHub Flavored Markdown Spec](https://github.github.com/gfm/)

### 2.1 `<details>` 是 raw HTML 块，Markdown 解析器不碰它

GFM 基于 CommonMark；[§4.6 HTML blocks](https://github.github.com/gfm/#html-blocks) 的 type 6 起始条件标签列表（原文节选，省略处用 … 表示）包含 `details`（同一列表里还有 `summary`）：

> Start condition: line begins the string `<` or `</` followed by one of the strings (case-insensitive) address, article, aside, base, … dd, details, dialog, … 

所以 `<details>`/`<summary>` 会作为**原始 HTML 块**进入 HTML 输出，Markdown 不会解析其内部标签，也不会替它生成任何样式。

### 2.2 GitHub 会在 GFM 规范之外再做一层 sanitize（决定性引文）

[§1.1 What is GitHub Flavored Markdown?](https://github.github.com/gfm/#what-is-github-flavored-markdown-) 逐字：

> While GFM supports a wide range of inputs, it's worth noting that GitHub.com and GitHub Enterprise perform additional post-processing and sanitization after GFM is converted to HTML to ensure security and consistency of the website.

[§6.11 Disallowed Raw HTML (extension)](https://github.github.com/gfm/#disallowed-raw-html-extension-) 逐字：

> GFM enables the tagfilter extension, where the following HTML tags will be filtered when rendering HTML output:
> `<title> <textarea> <style> <xmp> <iframe> <noembed> <noframes> <script> <plaintext>`
> Filtering is done by replacing the leading `<` with the entity `&lt;`.
> …
> **All other HTML tags are left untouched.**

注意这句 “All other HTML tags are left untouched” 容易被误读成“<details> 会原样保留、可以带样式”。它只说明 **tagfilter 这个扩展**不转义 details/summary；GFM 规范 §1.1 已明说还有一层**额外 sanitize**，而那层 sanitize 才是真正决定“允许哪些属性”的地方（见 §3、§4）。

**结论**：GitHub 上 `<details>` 的标签结构可用，但“能带什么属性、什么样式”由 GitHub 的 sanitizer 白名单决定，规范本身不保证任何样式能力。

---

## 3. GitHub 实际渲染管线的 API 一手实测（可复现）

GitHub 提供一个无需登录的 Markdown 渲染接口（有匿名限流）：`POST https://api.github.com/markdown`，Body `{"text": "<markdown>", "mode": "gfm"}`，返回渲染后的 HTML 字符串。

为什么它代表站内真实管线：输出里带有 GitHub 站内组件特征——`camo.githubusercontent.com` 图片代理、`<themed-picture data-catalyst-inline="true">`、`octicon` SVG、`id="user-content-…"` 前缀等；与 github.com 页面渲染出的 HTML 特征一致（见 §5 真页实测）。

### 3.1 实测对照表（输入 → GitHub 输出 → 结论）

| 输入（README 里写的 HTML） | GitHub 渲染结果 | 结论 |
| --- | --- | --- |
| `<summary style="background:#f0f0f0;color:red" class="foo" id="bar">…` | `<summary id="user-content-bar">…` | **style / class 被剥光**；`id` 保留且自动加 `user-content-` 前缀 |
| `<details style="background:#123456" class="x" open>` | `<details open="">` | style / class 剥光；`open` 保留 |
| `<summary bgcolor="…" align="center" title="tip">` | `<summary align="center" title="tip">` | `bgcolor` 剥掉；`align` / `title` 保留 |
| `<img src="…" width="200" height="30" align="right">` | 保留；GitHub 用 `<a target="_blank" … href="camo…">` 包一层，并追加自己的 `style="max-width: 100%; …"` | 能用 width/height/align 控制**尺寸与对齐**；颜色/边框仍不可控 |
| `<picture><source media="(prefers-color-scheme: dark)" srcset="…"><img src="…"></picture>` | `<themed-picture data-catalyst-inline="true"><picture><source media="…" srcset="camo…"><img …></picture></themed-picture>` | **GitHub 支持深浅色自适应图**（这是少数“渲染机制级”的样式能力） |
| `<kbd>` / `<mark>` / `<sub>` / `<sup>` / `<s>` | 全部保留 | 这些语义标签自带浏览器外观，可用于内容层美化 |
| `<p style="…">` / `<span class="…">` | `<p>` / `<span>` | style / class 一律剥掉 |
| `<font color="red">` | 只剩文字 | 不支持 |
| `<style>…</style>` / `<script>…</script>` | 整个被转义成可见文本：`&lt;style&gt;…` | **不可用**（与 GFM tagfilter 一致） |
| `<link rel="stylesheet" …>` / `<meta>` / `<base>` | 整个标签被删除 | 不可用 |
| 内联 `<svg><circle …/></svg>` | `svg` 标签被剥，只剩周围文字 | 不可用（但 `<img src="*.svg">` 可以） |
| `<table bgcolor="#f00" width="100%">` | `bgcolor` 剥掉，`width` 保留 | 同上 |
| `<summary>**Bold MD**</summary>` | 原样输出 `**Bold MD**`（Markdown 不解析） | summary 里只能用 HTML，不能写 Markdown 语法 |
| `<summary><h3>标题</h3></summary>` | `<h3>` 保留 | summary 允许块级标签，但官方未记载、不建议 |
| `<video src="https://github.com/user-attachments/assets/…" controls>` | 保留 | video 只认 GitHub 自家 user-attachments（前序研究已证） |
| 裸 `https://github.com/user-attachments/assets/<uuid>` | GitHub 自动生成原生视频卡：`<details open="" class="details-reset border rounded-2">…` | 这个“带边框圆角的卡片”是 GitHub 自己的组件；用户手写 `class` 会被剥掉 |

补充：`<details>` 内有多行/空行时，其中 Markdown（列表、粗体、代码块）会正常解析；`<summary>` 是单行 raw HTML，内部 Markdown 不解析。

补充：API 输出与站内渲染的一个已知差异——API 不重写相对链接；站内会把 README 里的 `assets/x.svg` 重写成 `/owner/repo/raw/main/assets/x.svg`（见 §5）。HTML 属性与标签的白名单行为一致。

### 3.2 结论

- 没有任何“属性通道”能改 `summary` 的背景色、文字色、边框、圆角、三角箭头。
- `style` 属性被剥、`class` 被剥（所以用不了 GitHub 自己的 `.details-reset` 等类名）、`<style>`/`<link>` 被废、`<script>` 不可用。
- 唯一留给你的是**内容**：图片（含 SVG，走 camo 代理）、`<picture>` 深浅色、emoji、语义标签、尺寸/对齐属性、`open`/`title`。

---

## 4. 官方开源 sanitizer：白名单解释“为什么被剥”

GitHub 公开维护 Markdown 处理用的 `html-pipeline` 库；其中 `SanitizationFilter` 定义了“用户内容允许的 HTML”：

来源：`https://raw.githubusercontent.com/github/html-pipeline/master/lib/html/pipeline/sanitization_filter.rb`（本地快照 `.local/gh-docs/sanitization_filter.rb`）

逐字摘录：

```ruby
# HTML filter with sanization routines and whitelists. This module defines
# what HTML is allowed in user provided content and fixes up issues with
# unbalanced tags and whatnot.
...
WHITELIST = {
  :elements => %w(
    h1 h2 h3 h4 h5 h6 h7 h8 br b i strong em a pre code img tt
    div ins del sup sub p ol ul table thead tbody tfoot blockquote
    dl dt dd kbd q samp var hr ruby rt rp li tr td th s strike summary details
  ),
  :remove_contents => ['script'],
  :attributes => {
    'a'          => ['href'],
    'img'        => ['src', 'longdesc'],
    ...
    :all         => ['abbr', 'accept', 'accept-charset',
                     'accesskey', 'action', 'align', 'alt', 'axis',
                     'border', 'cellpadding', 'cellspacing', 'char',
                     'charoff', 'charset', 'checked',
                     'clear', 'cols', 'colspan', 'color',
                     ...
                     'name', 'nohref', 'noshade',
                     'nowrap', 'open', 'prompt', 'readonly', 'rel', 'rev',
                     'rows', 'rowspan', 'rules', 'scope',
                     'selected', 'shape', 'size', 'span',
                     'start', 'summary', 'tabindex', 'target',
                     'title', 'type', 'usemap', 'valign', 'value',
                     'vspace', 'width', 'itemprop']
  },
  ...
}
```

可以直接读出的结论：

1. `:elements` 里**有** `summary`、`details` —— 所以折叠标签本身被允许。
2. `:attributes :all` 里**有** `align`、`title`、`width`、`height`、`name`、`open` 等 —— 对应实测里这些属性保留。
3. `:attributes :all` 里**没有** `style`、`class`，也没有 `id` —— 对应实测里 style / class 被剥。
4. `:remove_contents => ['script']` —— script 连内容一起删。

对照底层 `sanitize` gem 的 RELAXED 配置（`https://raw.githubusercontent.com/rgrove/sanitize/main/lib/sanitize/config/relaxed.rb`）：它**允许** `style` 属性与 `class`/`id`。也就是说，“HTML/CSS 能解决”在 Ruby 生态里本来成立，是 GitHub 用自家 `WHITELIST` **收紧**掉了——这正是问题 2 的答案：不是 Markdown 不给，是 GitHub 关了这扇门。

需要保留的谨慎：开源库 ≠ GitHub 生产环境的全部细节（例如实测中保留并加前缀的 `id` 并不在这个开源白名单里，说明生产管线还有额外处理）。因此本报告的最终判据是 §3 的 API 实测；两者在“style / class 被剥”这一核心结论上完全一致。

---

## 5. 真实页面验证：本仓 README 当前渲染

实测对象：`https://github.com/FeatherHunter/dsh-opencode-palette`（2026-10-24 抓取渲染后 HTML；本地快照 `.local/gh-docs/live-readme-page.html`）

1. 手写的折叠块被原样保留、**没有任何 class/属性**：

```html
<details>
<summary>基础使用演示：点开看 7 段操作视频</summary>
<details>
<summary>安装插件</summary>
...
```

2. 每个折叠条目里的**裸 user-attachments 视频链接**被 GitHub 自动渲染成自家组件：

```html
<details open="" class="details-reset border rounded-2">
  <summary class="tmp-px-3 py-2">
    <svg class="octicon octicon-device-camera-video" ...>
```

`details-reset` / `border` / `rounded-2` / `tmp-px-3` 都是 GitHub 自己的类名与设计系统；用户即使在 Markdown 里手写这些 class，也会在 sanitize 阶段被剥掉（§3 实测）。

3. README 里的相对图片路径被重写（证明 README 内相对路径能解析、图片可用；summary 内嵌图片另见 §3 的 API 实测）：

```html
<img src="/FeatherHunter/dsh-opencode-palette/raw/main/assets/opencode.png" ...>
```

**结论**：你看到的“边框圆角卡片”是 GitHub 对裸视频链接的**原生组件**；你自己写的 `<details>` 则是**浏览器原生外观**（三角箭头由浏览器绘制、行背景是页面背景、深浅色跟随 GitHub 主题）。两者都不提供用户可调的样式入口。

---

## 6. 三个问题的完整回答

### 6.1 问题 1：Markdown 语法本身能解决吗？

**不能。**

- CommonMark/GFM 没有折叠语法；`<details>` 是 raw HTML，不是 Markdown 语法。
- Markdown 规范从未定义“样式”：颜色、背景、边框、圆角、箭头都属于 CSS，由**渲染器**决定。
- 你在别的工具里看到的“好看的 Markdown 折叠”，来源是那个工具自带的 CSS 主题，不是 Markdown 语法。

### 6.2 问题 2：是 Markdown 能解决、但 GitHub 有限制吗？

**是的，更准确地说：HTML/CSS 能解决，GitHub 的安全策略不允许。**

- 通用的 Markdown→HTML 渲染器里，`<details>` 是标准 HTML 元素，写 `style="…"`、`class="…"`、甚至引入 `<style>` 都可以自定义外观；`summary::marker` 也能用 CSS 隐藏三角。
- 但 GitHub 在 GFM→HTML 之后有额外 sanitize（GFM §1.1 明写）；其白名单：
  - 允许 `<details>` / `<summary>` 标签本身；
  - 剥掉 `style` / `class`；
  - 把 `<style>` 转义成可见文本（GFM §6.11 tagfilter）；
  - 删除 `<link>`、`<meta>`、`<base>`；
  - 不允许 `<script>`；
  - 内联 `<svg>` 被剥（但外链 SVG 图片可以）。
- 所以在 GitHub 上，**不是“Markdown 语法不支持折叠样式”，而是“GitHub 渲染器把可样式化的通道整体关闭了”**。

### 6.3 问题 3：GitHub 的渲染机制里其实有技术可以解决吗？

**没有“改外观”的技术；有“换内容形式”的技术。**

在 GitHub 允许的范围内，能用来提升折叠区块观感的手段（均已实测保留）：

| 能做 | 做法 / 说明 |
| --- | --- |
| 深浅色自适应 banner | `<picture><source media="(prefers-color-scheme: dark)" srcset="…"><img src="…"></picture>`，GitHub 渲染为 `themed-picture`，跟随主题切换 |
| 设计好的按钮/横幅图 | 在 summary 内放 `<img src="assets/xxx.svg" width=… height=…>`；GitHub 会给图片加 `max-width:100%` 等自身样式，视觉上像“设计过的按钮” |
| 图片自动“卡片化” | 同时写 `width` + `height` 的图片，GitHub 实测会追加 `background-color: var(--bgColor-muted); border-radius: 6px` 与 `js-gh-image-fallback` 类（主题色自动适配深浅色） |
| 图标/符号 | emoji 短码（`:movie_camera:` → 🎥）、`<kbd>`、`<mark>`、`<sub>` / `<sup>` |
| 对齐/尺寸 | `<p align="center">`、`<div align="center">`、`<img align=… width=… height=…>`；`<summary align=… title=…>` 的属性会保留（视觉是否生效依浏览器而定） |
| 默认展开 | `<details open>` |
| GitHub 原生 alert 区块 | `> [!NOTE]` / `[!TIP]` / `[!IMPORTANT]` / `[!WARNING]` / `[!CAUTION]` 会得到带主题色和图标框（官方文档：Alerts，“displayed with distinctive colors and icons”；不能折叠、不能嵌套，但可做“好看的说明区”） |
| 视频卡 | 裸 user-attachments 链接 = GitHub 原生视频卡（可折叠、带边框圆角），但它的皮肤同样不可改 |

| 不能做 | 原因 |
| --- | --- |
| 改 summary 背景色/文字色/边框/圆角 | `style`、`class` 被剥；`bgcolor` 被剥 |
| 隐藏/替换原生三角箭头 | 需要 `summary::marker` / `list-style` CSS；没有 CSS 通道 |
| 引入自定义 CSS | `<style>` 被转义、`<link>` 被删 |
| 用 JS 做动画/美化 | `<script>` 不可用 |
| 内联 SVG 图标 | `svg` 标签被剥（改用 `<img src="*.svg">`） |
| 用 GitHub 自己的 class（如 `details-reset`） | `class` 被剥 |

**要真正完全自定义折叠按钮外观**，只有离开 GitHub 的 Markdown 渲染器：

1. **GitHub Pages / 自建文档站**：自己写 HTML/CSS（Jekyll、VitePress、Docusaurus…），按钮外观随意；README 里只留入口链接或截图。
2. **浏览器 userstyle / 插件**：只对“你自己看”生效，读者不会得到同样效果，不能作为 README 方案。
3. **README 里用图片“伪装”皮肤**：summary 内容做成设计图（见 §7 方案 A），原生三角仍在，但整体观感可控——这是 GitHub 内唯一接近“样式定制”的做法。

---

## 7. 对 palette README DEMO 章的可落地方案（本次不改 README，只给选项）

现状（`README.md` L72–L180）：`<h2 align="center">` DEMO 标题 → 外层 `<details>` → 7 个内层 `<details>`（summary 为纯文本：安装插件 / 设置字体字号 / 选择主题 / 新增自定义主题 / 编辑自定义主题 / 删除自定义主题 / AI 编辑自定义主题）→ 每条 = 一句说明 + 一行裸 user-attachments 视频链接 + 三步有序列表，条目间 `---` 分隔。

### 方案 A（推荐，改动小、风险低）：内容层美化 summary

保留现有嵌套结构，把 summary 从“纯文本”换成“主题自适应 SVG 横幅 + 少量语义标签”。语法已用 Markdown API 验证：`<picture>` 保留、summary 内 `<img>` 保留、emoji 短码会转换。

```html
<details>
<summary><picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/demo-banner-dark.svg">
  <img src="assets/demo-banner-light.svg" alt="DEMO · 基础使用演示">
</picture></summary>

...（保持原有 7 段内层折叠与视频链接）...

</details>
```

要点：

- 图片走相对路径即可，GitHub 会重写到 `/owner/repo/raw/main/…`（§5 已证）；SVG 通过 camo 代理显示。
- 不要依赖 `width="100%"`：`width` 是整数属性，百分比不合法、可能被浏览器忽略；把 SVG 本身画成足够宽，GitHub 会加 `max-width:100%` 自动适配容器。
- 建议横幅图只用图形 + 英文/系统字体，避免依赖特殊字体。
- 原生三角不会消失，但视觉重心变成你设计的横幅；这是 GitHub 内能做到的上限。

### 方案 B（最轻量）：summary 符号化

不用图片，summary 用 `🎬 <kbd>安装插件</kbd>` 这类组合，正文第一行加一句说明；零资源成本，观感提升有限但比纯文本活泼。

### 方案 C（能真正换皮肤）：DEMO 搬到 GitHub Pages

用 GitHub Pages 做一个可完全自定义折叠按钮的演示页，README 的 DEMO 章只留截图 + 链接。代价：多一套部署面、多一个需要维护的站点；README 里的折叠视频体验改为跳转。

### 方案 D：接受原生外观，不改

GitHub 上大量头部项目都保持原生 `<details>`；`<details>`/`<summary>` 的可访问性（键盘、读屏）是最好的，DIY 替代品反而容易退步。

### 决策时必须考虑的约束

- **npm / 插件市场页会剥离 raw HTML**（前序研究 `readme-collapsible-demo-videos.md` 的结论）：这些页面看不到折叠块，因此裸 user-attachments URL 的兜底必须保留。
- 第三方 Markdown 渲染器（VS Code 预览、某些客户端）对 `<details>` 支持不一。
- summary 内 Markdown 不解析（§3），只能用 HTML/emoji。
- GitHub sanitizer 可能随版本收紧；今天能用的属性未来不保证。
- 原生 `<details>` 的可访问性优于任何“图片伪装按钮”。

---

## 8. 来源一览（回溯用，全部可复验）

| # | 来源 | 用途 |
| --- | --- | --- |
| 1 | [GitHub Docs · Organizing information with collapsed sections](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-collapsed-sections) | 官方折叠语法；只有 details/summary/open，无样式说明 |
| 2 | [GFM Spec §1.1](https://github.github.com/gfm/#what-is-github-flavored-markdown-) | GitHub 在 GFM→HTML 后额外 post-process + sanitize |
| 3 | [GFM Spec §4.6 HTML blocks](https://github.github.com/gfm/#html-blocks) | `details` 属于 type 6 raw HTML 块 |
| 4 | [GFM Spec §6.11 Disallowed Raw HTML](https://github.github.com/gfm/#disallowed-raw-html-extension-) | tagfilter 只转义 9 个标签；其余标签不被 tagfilter 处理 |
| 5 | [GitHub REST API · Markdown](https://docs.github.com/en/rest/markdown/markdown?apiVersion=2022-11-28) | `POST /markdown` 渲染接口（实测入口） |
| 6 | [`github/html-pipeline` sanitization_filter.rb](https://raw.githubusercontent.com/github/html-pipeline/master/lib/html/pipeline/sanitization_filter.rb) | 官方开源白名单：允许 details/summary；无 style/class |
| 7 | [`rgrove/sanitize` relaxed.rb](https://raw.githubusercontent.com/rgrove/sanitize/main/lib/sanitize/config/relaxed.rb) | 底层 gem 默认允许 style/class（被 GitHub 覆盖收紧） |
| 8 | 实测：`POST https://api.github.com/markdown`（本文 §3 对照表） | GitHub 真实渲染管线的属性剥离行为 |
| 9 | 实测：[FeatherHunter/dsh-opencode-palette 渲染页](https://github.com/FeatherHunter/dsh-opencode-palette) | 真实页面：手写 details 无属性；裸视频链接 = GitHub 原生卡片 |
| 10 | 本仓前序研究 `docs/research/readme-collapsible-demo-videos.md` | 视频嵌入、嵌套折叠、npm/市场页剥离 HTML 等既有结论 |
| 11 | [GitHub Docs · Basic writing and formatting syntax · Alerts](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts) | GitHub 原生 alert（`> [!NOTE]` 等）：自带颜色与图标，是唯一“有样式感”的区块 |

### 附：最小复现脚本（PowerShell，无需登录）

```powershell
$body = @{ mode = 'gfm'; text = @'
<details style="background:#123456" class="x" open>
<summary style="color:red" class="foo">Banner</summary>

**markdown body**
</details>
'@ } | ConvertTo-Json -Depth 3
$r = Invoke-RestMethod -Method Post -Uri 'https://api.github.com/markdown' `
  -Headers @{'User-Agent'='probe'; 'Content-Type'='application/json'} -Body $body
$r   # 预期：<details open=""><summary>Banner</summary><p><strong>markdown body</strong></p></details>
```

（匿名有速率限制；如需批量测，加 `Authorization: Bearer <token>`。）
