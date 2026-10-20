# palette.yaml v2 结构对「11 条真实能力需求」的覆盖核对

- 日期：2026-10-20
- 对象：`docs/research/palette-v3-structure.yaml`（v2 结构设计稿）
- 问题：用户提出的 11 条能力，现有结构能否全部包揽
- 结论：**11 条里 7 条可做（其中 4 条需小幅扩结构），4 条受 CSS 物理边界限制（1 条可通过字体技术做到，3 条只能按「整段语言 / 内容角色」做，不能逐字生效）**

## 0. 一页结论

| # | 需求 | 判定 | 一句话 |
|---|---|---|---|
| 1 | 按语言配字体（英/中/某语言各用各的字体） | ✅ 可做（需扩 `font_set`） | `@font-face` + `unicode-range` 可按书写系统逐字分派；语言整段切换用 `:lang()` |
| 2 | 按语言配字号 | ⛔ 逐字不可行 / 🔁 整段可行 | `font-size` 是元素属性，不能按字形分；同一段混排英文 13px、中文 14px 做不到 |
| 3 | 按语言配颜色 | ⛔ 逐字不可行 / 🔁 整段可行 | `color` 是元素属性，同上 |
| 4 | 按语言配字重 | ⛔ 逐字不可行 / 🔁 整段可行 | `font-weight` 是元素属性，同上；可用不同字重的字体文件近似，但不是声明式 |
| 5 | 不同内容行距各自不同 | ✅ 可做 | 每个内容角色一条 `line_height` 能力，各写各的规则 |
| 6 | 输入框 / 某些控件玻璃态 | ✅ 可做（需扩 recipe 粒度） | `backdrop-filter` + 半透明底色；要能指定到「某个控件」 |
| 7 | 发送按钮换成 Hello Kitty 头像 | ✅ 可做 | `icon` 资源 + `mask-image`；背景图用 `background` + `radius` 圆形裁切 |
| 8 | 整个窗口背景：静态图/动态图/视频 | 🔁 静态/动态图可做，视频需扩 | 图 = CSS 背景；视频 = 插入 `<video>` 层（新值类型 + 新写原语） |
| 9 | 左侧工作区背景：同上 | 🔁 同上 | 区域换成 sidebar，机制相同 |
| 10 | 对话主窗口背景：同上 | 🔁 同上 | 区域换成 conversation，机制相同 |
| 11 | 输入框背景：同上 | 🔁 同上 | 区域换成 composer，机制相同 |

## 1. 逐条说明

### 1. 按语言配字体 —— ✅ 可做，需扩 `font_set`

CSS 有两套互补机制：

1. **`@font-face` + `unicode-range`**：同一个字体家族可以挂多个字体文件，每个文件声明自己覆盖的字符范围。浏览器逐字挑选覆盖该字符的文件。
   → 同一段中英文混排，英文取拉丁字体文件、中文取中文字体文件，**能做到**。
2. **`:lang()` 选择器**：按元素的语言标记（`html lang`、`lang` 属性）应用不同规则。
   → UI 语言整体切换（中文界面 / 英文界面）时，可整段换字体，**能做到**。

做不到的：同一段里区分「简体中文」与「繁体中文」用不同字体——两者共用汉字码位，`unicode-range` 无法区分；只能靠 `:lang()` 整段切换。

结构缺口：v2 的 `typeface` 只能是一个字体栈或一个资源。要表达「一组语言 → 各自字体」，需要新的值类型 `font_set`（映射表）和 Unicode 范围表。

### 2/3/4. 按语言配字号 / 颜色 / 字重 —— ⛔ 逐字不可行

`font-size`、`color`、`font-weight` 都是**元素属性**：一个元素一个值。CSS 没有「按字形设置字号/颜色/字重」的机制。

- 同一段混排文字：做不到英文 13px、中文 14px；做不到英文红、中文黑。
- 语言分段（例如中文界面 / 英文界面整体切换，或不同语言在不同元素里）：**可以**用 `:lang()` 规则整段设置。
- 实际替代（更符合 UI 结构）：按**内容角色**分别配——标题、正文、代码、表格、工具卡片各自一套字号/字重/颜色。第 5 条的行距就是同一个思路。

结构缺口：如要支持整段语言维度，需在能力写入上加语言条件，编译成 `:lang(...)` 选择器。

### 5. 不同内容行距各自设置 —— ✅ 可做

v2 的 `kind: property` 每个能力只写自己那条规则，天然支持「多套并存」：

- `markdown.paragraph.line_height`
- `markdown.heading.line_height`
- `code.block.line_height`
- `tool.card.line_height`

需要补的是「内容角色的锚点」（markdown 的 `p / h1–h6 / li / blockquote` 等）和对应能力条目，结构本身不用改。

注意：宿主把 markdown 的字体/行高打包成了复合 token（如 `--dsw-font-markdown-base`），不要写复合 token，直接写规则更稳。

### 6. 输入框 / 某些控件玻璃态 —— ✅ 可做，需扩 recipe 粒度

机制：`backdrop-filter: blur(...)` + 半透明底色（`color-mix`）。v2 的 `composer.glass` recipe 已经能表达「模糊」和「底色」两个 aspect 独立降级。

缺口：如果要指定「某个具体控件」（例如只给发送按钮、只给菜单、只给某类卡片加玻璃），recipe 的 id 文法 `<region>.<recipe>` 只有两段、指向整个区域。需增加控件级 recipe 文法 `<region>.<role>.<recipe>`（如 `composer.sendButton.glass`）。

技术风险：玻璃要透过背景图/视频，`backdrop-filter` 能否吃到我们插到最底层的媒体层，取决于层叠上下文（backdrop root）。需要实测确认。

### 7. 发送按钮换成 Hello Kitty 头像 —— ✅ 可做

- 图标方案：`composer.sendButton.icon` 值 = icon 资源 → `mask-image` 保留按钮原色和 hover 色。
- 图片方案：`composer.sendButton.background` 值 = image → 铺图 + `radius` 圆形裁切 + `background-size: contain`。
- 资产从主题包 `assets/` 读，相对路径，禁外链。
- 风险：按钮由 React 渲染，替换 DOM 后重渲染会还原，需要 `MutationObserver` 幂等重放（v2 的 `guard: observer` 已为此留位）。

### 8–11. 窗口 / 侧栏 / 对话区 / 输入框背景（静态图 / 动态图 / 视频）

分三档：

| 档 | 机制 | 现状 |
|---|---|---|
| 静态图 | CSS `background-image` 或插入 `<img>` 层 | ✅ v2 的 `paint → image` 已支持 |
| 动态图（GIF / WebP / AVIF / APNG） | 同上，浏览器自动播放 | 🔁 资源类型要补 `gif` 等，值类型不变 |
| 视频（mp4 / webm） | 必须插入 `<video>` 元素，CSS 背景做不了 | 🔁 需要新值类型 + 新写原语 + 资源类型 |

结构缺口（视频）：

- 值类型 `media`（`image | animated_image | video`），效果链按类型降级：图 → CSS 背景；视频 → 插入媒体层。
- 新写原语 `insert-media-layer`：参数含 `fit`、`loop`、`muted`、`autoplay`、`poster`、`playback_rate`、`prefers-reduced-motion` 时暂停/换静态图。
- 资源类型 `video`：mp4/webm，体积上限、海报帧、编码约束。
- 层级与交互：媒体层在内容之下（`pointer-events: none`），且不能盖住文字可读性（可加遮罩/透明度）。
- 四个区域各一条能力：窗口（全局）、侧栏、对话区、输入框；锚点各不相同。

诚实边界：**视频背景只能铺在应用内容区**。桌面原生标题栏是宿主用 `setTitleBarOverlay` 画的，不能放视频；若标题栏 overlay 设为透明，内容区视频可以「透到」标题栏下方，但标题栏按钮仍是原生的。

## 2. 已并入 v3 的结构扩展

以下扩展已并入 `palette/` 目录（v3.0.0）：

- `font_set` / `media` / `video` 值类型 → `palette/values.yaml`
- `video` 资源类型 → `palette/assets.yaml`
- `insert-media-layer` 写原语 → `palette/primitives.yaml`
- 控件级 recipe 文法 → `palette/vocabulary.yaml`
- 控件清单与 `control_templates` → `palette/anchors.yaml` + `palette/palette.yaml`

原 v2 设计稿（`docs/research/palette-v3-structure.yaml`）已标为历史版本。

### 2.1 新值类型

```yaml
value_types:
  animated_image:
    kind: asset
    asset_kind: wallpaper
    animated: true
  video:
    kind: asset
    asset_kind: video
  media:                       # 背景媒体三态
    kind: union
    of: [image, animated_image, video]
    diurnal: true
  font_set:                    # 语言/书写系统 → 字体
    kind: map
    key: script                # latin / han / kana / hangul / cyrillic / arabic ...
    value: typeface
    unicode_range: builtin     # 由内置范围表生成 @font-face
```

### 2.2 新资源类型

```yaml
assets:
  kinds:
    wallpaper: { media: [jpg, jpeg, png, webp, avif, gif], max_bytes: 8388608, diurnal: true }
    video:
      media: [mp4, webm]
      max_bytes: 67108864
      diurnal: true
      codecs: [h264, vp9]
      poster: optional
```

### 2.3 新写原语（dom）

```yaml
# op: insert-media-layer
# payload: image | animated_image | video
# params:
#   position: fixed | absolute
#   inset: 0
#   z: -1
#   fit: cover | contain | repeat
#   loop / muted / autoplay / poster / playback_rate
#   reduced_motion: pause | static_poster
#   pointer_events: none
# teardown: remove-node
# guard: observer
```

### 2.4 文法扩展：控件级 recipe

```yaml
grammar:
  recipe_role_id: '<region>.<role>.<recipe>'   # 例：composer.sendButton.glass
```

### 2.5 语言维度（可选）

```yaml
languages:
  selector: ':lang({tag})'
  tags: [zh-CN, zh-TW, en, ja, ko, fr, de, es, ru, ar]

# 能力写入示例：
# writes:
#   - { id: rule-zh, use: rule, anchor: global.root, lang: zh-CN, layer: component,
#       decl: { 'font-size': '14px' } }
```

## 3. 还有哪些没确证（做之前必须验证）

1. 主题包资产如何送到浏览器：插件客户端是浏览器代码，读不到本地文件；需要宿主的文件读取接口或 URL 方案（**未确证**）。
2. `backdrop-filter` 能否吃到插入的媒体层（取决于 backdrop root，**需实测**）。
3. 视频背景的性能与功耗（尤其桌面端），需要体积/分辨率上限与「低电量/减弱动效」策略。
4. 动态图（GIF/WebP/AVIF）在宿主 `background-image` 上是否被任何规则覆盖（本仓规则优先级需实测）。
5. 按语言配字体时，`unicode-range` 与宿主现有字体栈的叠加顺序（需实测中英文混排）。

## 4. 下一步

- 用户拍板：接受「7 可做 / 4 受限」的结论，以及是否把这些扩展并入 v2.1。
- 并入后：按 v2.1 结构产出真实能力条目（建议先 60 条：14 区域 × 基础项 + 这 11 条需求）。
- 再验证第 3 节的 5 个未确证项，能落地的写进实现票，不能落地的写进 `gaps`。
