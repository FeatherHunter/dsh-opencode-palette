# palette.yaml 设计（V3）

> 2026-10-20 与用户对齐：V3 不再兼容 opencode 的 37 个颜色 JSON 形式，而是**以 opencode 的语义为灵感重新设计一份 YAML 主题系统**。
> 本文只设计 `palette.yaml`（我们的能力全集）；`theme.yaml`（用户主题）与编译产物在 §8–§9 给出配套形状。
> 运行时解析 YAML 已确认可行（插件构建期内联解析器，见 §12）。

---

## 0. 一页结论

1. `palette.yaml` 不是「token 表」，也不是「CSS 规则表」，而是**能力注册表**：声明「有哪些语义外观维度可配、每个维度接受什么值、如何落到宿主、如何降级」。
2. 能力按**语义作用域**定义（全局 / 区域 / 角色 / 属性），**不按实现机制分类**。token / 规则 / DOM 只是「落地的三原语」，由能力条目内部的**效果链**按可用性选择。
3. 宿主只提供三个写入口（已由源码与实测证明）：**① token 注入**（`theme.overrideTokens` / body 内联变量）、**② CSS 规则注入**（我们自建 `<style>`）、**③ DOM/JS 运行时修改**。palette 的全部实现只能由这三原语组合而成。
4. 编译是**纯函数**：`compile(palette, theme, hostProbe) → plan`，无副作用、可快照测试；预览与运行时共用同一个 plan。
5. 一切可降级：效果链逐条尝试，部分字段失效只降级该字段并给出诊断，不整体崩溃。
6. 单一真源：palette 生成 JSON Schema、TS 类型、AI 提示词、能力文档、编辑器表单。新增能力只改数据，不改执行器代码。

---

## 1. 第一性原理

### 1.1 问题是什么

我们不改宿主源码，却要让用户「用数据描述任意外观」。因此必须回答四个问题：

| 问题 | 设计回答 |
|---|---|
| 可配的「东西」是什么？ | 语义能力（capability），不是宿主变量 |
| 用户写什么？ | 能力 id → 值（+ 资源引用） |
| 如何变成宿主上的效果？ | 每个能力带有序的**效果链**，逐条降级 |
| 如何保证不崩、可进化？ | 纯编译 + 诊断 + 版本契约 + 锚点符号表 |

### 1.2 用到的设计模式（名字只是标签，关键在职责切分）

- **Registry（注册表）**：能力/值类型/锚点/词汇表全部是数据；执行器是通用解释器。
- **Strategy / Chain of Responsibility（策略链）**：一个能力的多个实现按保真度排序，运行时取第一个可用。
- **Compiler（编译器）**：theme → 中间表示（plan）→ 三类后端写入；IR 让预览与运行时一致。
- **Schema-first / Codegen**：palette 是唯一真源，其余产物全部派生。
- **Value Object + 类型系统**：值有类型（color/paint/length/font/asset/object），验证与归一化集中在类型层。
- **Diagnostics Collector**：所有忽略、降级、失败都变成结构化诊断码，而不是异常。

### 1.3 宿主写入口（穷举，来自源码侦察）

| 原语 | 机制 | 证据 |
|---|---|---|
| `token` | `theme.overrideTokens(source, tokens)` 合并进宿主 token 层，宿主以 `body{--x:…}` 内联写出 | `packages/client/ui-theme/src/client/index.ts:369-378`、`theme-presenter.ts:87-90` |
| `rule` | 插件 `document.head.appendChild(<style>)`，写任意选择器与声明 | `runtime/client.ts:739-741` |
| `dom` | 插件 JS 直接改 DOM（属性、内联样式、插节点、监听 MutationObserver） | 客户端插件是页面内普通脚本，无沙箱（`packages/client/modules/src/client/system.ts:76-86`） |

**没有第四个入口**：窗口外壳（标题栏）也要靠 token 间接到达（宿主探针读取特定 token 再调 `setTitleBarOverlay`），本质仍是 `token` 原语。

### 1.4 由此推出的硬约束

- 能力条目必须能表达「同一个语义维度，多种落地方式」→ 效果链。
- 值类型必须在**编译期**区分形状，因为同一个 token 可能只接受颜色、不接受渐变（例如 `--dsw-specific-sidebar-fill` 取渐变会让标题栏探针拿到非法 `background-color` → 透明）。
- 任何依赖宿主内部名字（token 名、`data-*`、类名、哈希后缀）的东西都必须集中在**锚点表 / 实现段**，绝不进入用户文件。
- 诊断必须能区分「用户写错」与「宿主没这个能力」。

---

## 2. 分层与真源

```
palette.yaml（能力全集，我们维护，随插件版本）
        │ 构建期 codegen
        ▼
registry.generated.ts + theme.schema.json + capability docs + AI prompt
        │
theme.yaml + assets/（用户/发行作者/AI 维护）
        │ 运行时：解析 → 校验 → 归一化 → 编译
        ▼
plan（内存对象 {tokens, rules, ops, assets, diagnostics}）
        ├─→ 预览区（同一份 plan）
        └─→ 运行时注入（同一份 plan）
```

- `palette.yaml` **不随用户主题分发**，它是插件的资产。
- `theme.yaml` 是主题的唯一真源；plan 不落盘。
- 没有「与 opencode JSON 兼容」这一层：V3 模型是全新的；若需要吸收老主题，只做**一次性导入器**（§11）。

---

## 3. palette.yaml 顶层结构

```yaml
palette: 3.0.0            # 本文件的语义版本（能力全集版本）
api: 3                    # 用户 theme.yaml 的 schema 版本
title: DSH 全量主题能力表
description: |
  本文件是插件的唯一能力真源。所有字段修改必须通过本文件，
  不得在代码里硬编码宿主 token 名、选择器、类名。

# 1) 词汇表：自动拼装能力标签、编辑器分组、文档
vocabulary:
  regions:      # 区域（UI 地图）
    - { id: global, label: 全局 }
    - { id: window, label: 窗口外壳 }
    - { id: sidebar, label: 侧栏 }
    - { id: conversation, label: 对话区 }
    - { id: composer, label: 输入区 }
    - { id: detail, label: 详情面板 }
    - { id: settings, label: 设置页 }
    - { id: menu, label: 菜单与弹层 }
    - { id: code, label: 代码与差异 }
    - { id: markdown, label: Markdown 排版 }
    - { id: tool, label: 工具调用卡片 }
    - { id: terminal, label: 终端 }
    - { id: deliverable, label: 产物与文件 }
    - { id: plugin, label: 插件市场 }
  roles:        # 角色（区域内元素）
    - { id: page, label: 页面 }
    - { id: panel, label: 面板 }
    - { id: card, label: 卡片 }
    - { id: item, label: 列表项 }
    - { id: button, label: 按钮 }
    - { id: input, label: 输入框 }
    - { id: text, label: 正文 }
    - { id: heading, label: 标题 }
    - { id: link, label: 链接 }
    - { id: icon, label: 图标 }
    - { id: menu, label: 菜单 }
    - { id: tooltip, label: 气泡提示 }
    - { id: tab, label: 标签页 }
    - { id: badge, label: 徽标 }
    - { id: scrollbar, label: 滚动条 }
    - { id: selection, label: 选区 }
  properties:   # 属性（能力维度）
    - { id: background, label: 背景 }
    - { id: foreground, label: 前景色 }
    - { id: border, label: 边框 }
    - { id: radius, label: 圆角 }
    - { id: shadow, label: 阴影 }
    - { id: typography, label: 排版（字体/字号/行高/字重） }
    - { id: icon, label: 图标 }
    - { id: opacity, label: 透明度 }
    - { id: blur, label: 模糊 }
    - { id: transition, label: 过渡 }
    - { id: image, label: 背景图 }

# 2) 值类型：验证 + 归一化 + 能否用于某个实现段
value_types:
  color:
    kind: color
    normalize: [trim, expand_light_dark]
  paint:                       # 任何能当绘制值的东西
    kind: union
    of: [color, gradient, image]
  length:
    kind: length
    units: [px, rem, em, %, vh, vw]
  font_family:
    kind: font_stack
  asset_image:
    kind: asset
    media: [png, jpg, jpeg, webp, avif, gif, svg]
  asset_icon:
    kind: asset
    media: [svg, png]
  asset_font:
    kind: asset
    media: [woff2, woff, ttf, otf]
  number:
    kind: number

# 3) 状态：全局面板（能力可选启用）
states:
  hover:   ':hover'
  active:  ':active'
  focus:   ':focus-visible'
  disabled: '[disabled], [aria-disabled="true"]'
  selected: '[aria-selected="true"], [data-state="selected"]'

# 4) 锚点符号表：宿主私有细节全部集中在这里
anchors:
  global.root:        { selector: 'body' }
  window.probe:       { selector: 'body' }    # 标题栏靠宿主探针读 token，不需要新选择器
  sidebar.root:       { selector: '[data-slot="conversation.session"]' }
  sidebar.scroll:     { selector: '[data-slot="conversation.session"] [data-scroll]' }
  conversation.root:  { selector: '[data-slot="conversation.chat.flow"]' }
  composer.root:      { selector: '[data-slot="conversation.composer"]' }
  composer.sendButton:{ selector: '[data-composer-send]' }
  menu.surface:       { selector: '[role="menu"]' }
  tooltip.root:       { selector: '[role="tooltip"]' }
  # …按需增加；每个锚点可带 probe（运行时是否存在的判定方式）

# 5) 能力全集（见 §4–§6）
capabilities: {}

# 6) 编辑器分组（展示用；缺省按 id 前缀自动分组）
groups: []

# 7) 专家层规则（可选）
patches:
  allow_raw_tokens: true        # theme.yaml 的 patches 是否允许直接写宿主 token 名
  allowed_token_status: [live]  # 只允许活名；dead 名给警告
```

---

## 4. 能力 id 文法

推荐（不强制）三段式：

```
<region>.<role>.<property>
```

例：

| id | 含义 |
|---|---|
| `global.page.background` | 全局页面背景 |
| `global.text.foreground` | 全局正文颜色 |
| `sidebar.panel.background` | 侧栏面板背景 |
| `sidebar.item.background` | 侧栏列表项背景（含状态） |
| `composer.input.background` | 输入框背景 |
| `composer.sendButton.icon` | 发送按钮图标 |
| `menu.surface.radius` | 菜单圆角 |
| `code.block.background` | 代码块背景 |
| `markdown.heading.typography` | Markdown 标题排版 |
| `window.titleBar.background` | 标题栏底色（走 token 探针） |

规则：

- 段数 2–3 段；允许自由段（不进词汇表时标 `custom: true`，编辑器归到「自定义」）。
- id 一经发布**不可改名**；废弃用 `deprecated: 说明 + replaced_by`。
- 标签由词汇表自动拼装：`regions[region].label + roles[role].label + properties[property].label`，例如「侧栏 · 列表项 · 背景」。减少 200 条手写文案。

---

## 5. 能力条目结构

```yaml
capabilities:
  sidebar.panel.background:
    label: 侧栏背景                       # 可省略，缺省自动拼装
    since: 3.0
    deprecated: null
    docs: |
      侧栏整体底色。可填纯色/渐变/图片。
      想只改列表项用 sidebar.item.background。
    value: paint                          # 引用 value_types
    default: { light: '#f9fafb', dark: '#111315' }
    states: [hover]                       # 可选；启用状态化取值
    availability:                         # 可选：能力整体可用性判定
      probe: token_declared               # token_declared | selector_exists | always
    realization:                          # 有序效果链，见 §6
      - id: prefer-token
        writes:
          - use: token
            name: --dsw-specific-sidebar-fill
      - id: fallback-rule
        accepts: paint
        writes:
          - use: rule
            anchor: sidebar.root
            decl:
              background: $value
      - id: runtime-layer
        writes:
          - use: dom
            anchor: sidebar.root
            op: insert-layer
            payload: $value
```

字段说明：

| 字段 | 必填 | 作用 |
|---|---|---|
| `label` | 否 | 展示名；缺省由词汇表拼装 |
| `since` / `deprecated` / `replaced_by` | 否 | 版本契约（§11） |
| `docs` | 否 | 面向用户/AI 的说明，进入生成文档与 prompt |
| `value` | 是 | 值类型（可内联对象 schema，见 §7.3） |
| `default` | 否 | 用户没写时的默认值（用于预览与「恢复默认」） |
| `states` | 否 | 启用状态化取值（hover/active/…） |
| `availability` | 否 | 能力整体探测方式 |
| `realization` | 是 | 效果链，至少一条 |

---

## 6. 效果链与三个写原语

### 6.1 效果（Effect）

一个 Effect = **一次「要么全做、要么换下一条」的落地尝试**，内部可含多条 Write（写原语）。

```yaml
realization:
  - id: tokens-fast-path
    accepts: color                 # 可选：只有这个形状的值才进这条效果
    when:                          # 可选：状态/宿主条件
      state: hover
      probe: token_declared
    writes:
      - { use: token, name: --dsw-alias-bg-layer-2 }
```

选择算法（伪代码）：

```ts
for (state, value) of expandStates(themeValue, cap.states) {
  const shape = shapeOf(value, cap.value);
  const effect = cap.realization.find(e =>
      stateMatches(e.when?.state, state) &&
      shapeAccepts(e.accepts ?? cap.value, shape) &&
      probeOk(e.when?.probe));
  if (!effect) { diagnostics.push(NO_AVAILABLE_EFFECT, cap, state); continue; }
  for (const w of effect.writes) {
    if (!writeAvailable(w)) { diagnostics.push(WRITE_UNAVAILABLE, w); continue; }
    lower(w, value, plan);       // token → tokens[]; rule → rules[]; dom → ops[]
  }
}
```

要点：

- **粒度是「字段级降级」**：一个能力的多个 Write 里哪条不可用，只丢那条并诊断，其余照常。
- **形状不匹配即跳过**：同一个能力，纯色可以走 token，渐变/图片自动落到规则，图标落到 asset 相关写原语。
- **顺序即优先级**：越靠前的效果越保真/越稳定（token 最稳，DOM 最灵活但最脆）。

### 6.2 写原语 `token`

```yaml
- use: token
  name: --dsw-alias-bg-base          # 宿主 token 名（可写数组表示成对写入）
  value_template: $value             # 默认直接取值
  # 宿主 token 的已知状态来自登记表（live/dead/declared-invalid/pinned），
  # dead 名默认不允许进入实现段；确需保留时写 allow_dead: true + 原因
```

### 6.3 写原语 `rule`

```yaml
- use: rule
  anchor: composer.root              # 引用 anchors，不写裸选择器
  state: hover                       # 可选：拼 :hover（来自 states 表）
  decl:
    background: $value
    border-color: color-mix(in srgb, $value 80%, transparent)
  important: false                   # 需要打穿宿主 inline/高特异性时才为 true，并写注释
  layer: 100                         # 插件规则层序号，固定分层，避免互相踩
```

### 6.4 写原语 `dom`

```yaml
- use: dom
  anchor: composer.sendButton
  op: replace-children               # 见下方算子表
  payload: $value
  guard: observer                    # observer = 监听宿主重渲染后幂等重放
```

算子表（第一版，按需扩展）：

| op | 作用 | 备注 |
|---|---|---|
| `set-inline` | 对锚点元素 `style.setProperty` | 打不过宿主 inline 时最后手段 |
| `add-class` / `remove-class` | 加/移除类 | 需要我们自己注入的样式配合 |
| `insert-layer` | 在锚点内插入自管图层（壁纸、蒙层、玻璃） | 自管 z-index / pointer-events / 清理 |
| `replace-children` | 替换 SVG/图标子节点 | 必须 `guard: observer` |
| `replace-svg` | 用资源整颗替换 SVG | 同上 |
| `set-attr` | 设置 data-* / aria-* / title | 用于状态或图标选择 |

### 6.5 资源（asset）

图片/图标/字体不是写原语，是**值类型 + 资源解析**：值里写 `assets.send_icon`，编译时解析成 `blob:` / data URL / 宿主路由 URL，再作为 `$value` 进入 `rule`（`background-image: url($value)`）或 `dom`（`replace-children`）。

字体额外一条：`@font-face` 规则由 `rule` 写原语生成（`font-family` + `src`），宿主字体路由有先例可复用。

---

## 7. 值类型系统

### 7.1 light/dark

所有颜色/绘制值支持两种写法：

```yaml
sidebar.panel.background: '#f9fafb'                       # 两套主题同值
sidebar.panel.background: { light: '#f9fafb', dark: '#111' }
```

`expand_light_dark` 归一化为 `{light, dark}`；纯色/渐变/图片都适用；长度类同样支持（可选）。

### 7.2 状态值

能力启用 `states` 后：

```yaml
sidebar.item.background:
  default: '#ffffff'
  hover:   { light: '#f2f2f2', dark: '#1c1e21' }
  active:  '#e8e8e8'
```

缺省状态回落到 `default`。

### 7.3 内联对象（复合能力）

需要多属性联动的能力（毛玻璃、聊天气泡等）用内联对象：

```yaml
effect.glass:
  label: 毛玻璃面板
  value:
    type: object
    fields:
      blur:    { type: length, default: 12px }
      opacity: { type: number, default: 0.6, min: 0, max: 1 }
      tint:    { type: color,  default: 'var(--dsw-alias-bg-base)' }
  realization:
    - writes:
        - use: rule
          anchor: composer.root
          decl:
            backdrop-filter: 'blur($value.blur)'
            background-color: 'color-mix(in srgb, $value.tint calc($value.opacity * 100%), transparent)'
```

对象字段在规则模板里用 `$value.<field>` 取。

---

## 8. 用户主题文件形状（theme.yaml，配套设计）

```yaml
schema_version: 3
name: 海贼王
version: 1.0.0
author: 某人
palette: '>=3.0 <4'            # 依赖的能力全集版本范围
assets:
  wallpaper: assets/wallpaper.jpg
  send_icon: assets/send.svg
values:                        # 扁平的「能力 id → 值」
  global.page.background: { light: '#f7f3ea', dark: '#12100c' }
  sidebar.panel.background: 'linear-gradient(180deg, #fdf6e3, #f5e6c8)'
  composer.sendButton.icon: assets.send_icon
  effect.glass: { blur: 16px, opacity: 0.7 }
patches:                       # 专家层，可选；直接写宿主 token 名
  - name: --dsw-alias-label-primary
    value: { light: '#241d12', dark: '#f2ead9' }
```

设计取舍：

- **扁平点分 id**，不做深层嵌套：校验、diff、合并、schema 生成、AI 生成都更简单；编辑器的分组只是展示层（由 palette 的 vocabulary 提供）。
- 用户文件里**不出现**宿主 token 名（除专家层 `patches`），保证宿主改版时用户文件不动。
- `assets` 用逻辑名；值里通过逻辑名引用资源，校验时检查类型（图片/图标/字体）。
- 主题包 = 目录：`theme.yaml` + `assets/`；显示名取 `name`。

---

## 9. 编译与 plan

### 9.1 编译函数

```ts
compile(palette, theme, probe): Plan
```

步骤：

1. 解析 YAML（一次）。
2. 校验：`schema_version` / `palette` 范围 / 未知能力 id / 值类型 / 资源存在性 → 诊断（警告不阻断）。
3. 归一化：light/dark 展开、状态展开、单位校验、资源解析。
4. 逐能力走效果链选择（§6.1），把 Write 降级成 plan 条目。
5. 合并 `patches`（只允许登记的 token 名，dead 名警告）。
6. 排序与去重：token → rules（按 layer + 选择器稳定排序）→ ops（按锚点文档序）→ assets。
7. 输出 `Plan` + `diagnostics` + `stats`。

### 9.2 plan 数据结构

```ts
interface Plan {
  tokens: Array<{ name: string; light: string; dark: string; source: string /* capId */ }>;
  rules:  Array<{ layer: number; selector: string; decls: Record<string, string>; important: boolean; source: string }>;
  ops:    DomOp[];                                   // 有序，运行时逐步执行
  assets: Array<{ id: string; url: string; media: string }>;
  diagnostics: Diagnostic[];
  stats: { requested: number; applied: number; degraded: number; skipped: number };
}
```

- 纯数据、可 JSON 快照 → 金标测试直接对比。
- 预览与运行时消费同一个 `Plan` 对象 → 保证「预览 = 实际」。
- 缓存：按 `hash(theme 内容 + palette 版本 + 宿主探测结果)` 缓存 plan；切换主题只换对象。
- 性能：YAML 解析 + 编译在毫秒级（能力 ~200 条、主题 ~100 个值）；预览切主题不重新注入页面。

### 9.3 诊断码

| code | 含义 | 处理 |
|---|---|---|
| `UNKNOWN_CAPABILITY` | 主题里的 id 不在 palette | 警告，跳过 |
| `UNKNOWN_FIELD` | 能力对象里多写的字段 | 警告，忽略 |
| `INVALID_VALUE` | 值形状/单位/范围不合法 | 警告，该能力不生效 |
| `ASSET_MISSING` / `ASSET_TYPE_MISMATCH` | 资源缺失或类型不符 | 警告，该能力不生效 |
| `NO_AVAILABLE_EFFECT` | 所有效果都不可用（含状态） | 警告，该能力不生效 |
| `WRITE_UNAVAILABLE` | 某条 Write 的锚点/token 不可用 | 警告，该字段降级 |
| `PALETTE_TOO_NEW` | 主题要求比插件新的 palette | 提示升级插件；能应用的应用 |
| `HOST_ANCHOR_MISSING` | 运行时锚点探测失败（宿主改版） | 警告 + 上报（可选） |

---

## 10. 生成物（codegen）

palette.yaml 构建期生成：

| 产物 | 用途 |
|---|---|
| `src/engine/registry.generated.ts` | 冻结的能力/锚点/值类型数据 + TS 类型 |
| `schema/theme-v3.schema.json` | 校验器 + CI 门禁 |
| `docs/capabilities.md` | 能力目录（按 region/role 分组，含默认值与说明） |
| `docs/ai/theme-authoring.md` | 给外部 AI 的提示词：schema + 示例 + 规则（只能写 id） |
| 编辑器表单元数据 | label/分组/控件类型 |

构建门禁（进 `npm test`）：

- palette 自身通过 meta-schema；
- 能力 id 全局唯一、段数合法、词汇表引用存在；
- 每个能力 ≥1 条效果链，第一条效果至少一条 Write；
- 锚点引用存在；token 名必须在登记表且非 dead（除非 `allow_dead` 带原因）；
- 每个能力有 `value`；`default` 通过自身校验；
- 生成的 Schema 与上一次提交的产物一致（防止手改产物）。

---

## 11. 版本与兼容

- `palette` 版本（能力全集）与 `api` 版本（theme schema）分开：新增能力 = palette minor；theme 文件格式破坏性变化 = api major。
- 能力条目 `since` / `deprecated` / `replaced_by`；theme 用 `palette: '>=3.0 <4'` 声明范围。
- **不兼容 opencode 的 37 个颜色 JSON**：V3 模型全新。老主题若要吸收，做一次性导入器（独立表 `migrations/opencode-37.json` → 映射到能力 id），导入产物是 `theme.yaml`，导入器不进入运行时模型。
- 未知能力/未知字段前向兼容：警告不阻断（旧插件读新主题不会崩）。

---

## 12. 运行时 YAML 解析

- `yaml` 作为 devDependency，构建期内联进 `client.js`（与 `dsh-plugin-update` 内联同套路），发布包仍零运行时依赖。
- 解析在「加载主题 / 预览」时发生一次，计划缓存；不参与每帧渲染。
- DSH 宿主自身大量配置就是 YAML，解析器是成熟库，性能与兼容风险低。
- 备选：若体积不可接受，后续换自写「受限子集解析器」（只支持映射/序列/标量/`|` 块/注释）。

---

## 13. 规模估算

- 区域 ~14 × 角色 ~16 × 属性 ~11 ≈ 理论 2464 组合；实际有价值的能力估计 **120–200 条**（全局语义 ~60 + 区域特化 ~60–140）。
- palette.yaml 预计 **2000–4000 行**（含注释/文档）；codegen 产物不计入。
- 用户主题通常写 30–150 个值；YAML 文件几十 KB 以内。

---

## 14. 实施顺序（建议）

1. **骨架**：palette.yaml 的 vocabulary / value_types / states / anchors / 30 条真实能力（覆盖 token / rule / dom / asset / object 五类）。
2. **codegen + 门禁**：生成 TS 类型 + JSON Schema + 能力目录；接入 `npm test`。
3. **执行器**：`compile()` + 三原语 lower + 诊断 + plan；金标测试对比 plan 快照。
4. **主题侧**：`theme.yaml` schema、示例主题、导入/导出（含老 JSON 一次性导入）。
5. **接线**：把现有 `map-dsh.ts` 的硬编码映射迁移成 palette 数据（先并存，对照测试一致后删除旧路径）。
6. **预览**：同一 plan 渲染预览区；与真实页面截图对比。

---

## 15. 待定问题

1. 能力 id 文法是否按 `<region>.<role>.<property>` 固定（推荐固定，便于自动生成与 AI 稳定输出）。
2. 状态是否只在「有状态角色」（item/button/input/tab）启用（推荐是）。
3. 能力数量先做 120 条还是先做 60 条打样（推荐先 60 条打通全链路，再批量补）。
4. `patches` 专家层是否保留 + 是否允许写死名（推荐保留、默认警告）。
5. 主题包目录的读取通道（宿主是否给插件文件系统/目录扫描能力）需实测确认。
