# palette.yaml 格式对抗式审查（v1 → v2 修订）

> 审查对象：`docs/research/palette-yaml-v3-design.md` 里的 v1 格式。
> 审查立场：假设这个格式会被用户、AI、发行主题作者、未来 3 年的宿主升级反复使用；任何「以后再说」的模糊点都按缺陷处理。
> 结论先说：**v1 的骨架方向对（能力注册表 + 效果链 + 编译纯函数），但有 6 个会伤到真实使用的结构缺陷，必须改格式，不是改实现。**

---

## 0. 判决

| 级别 | 数量 | 一句话 |
|---|---|---|
| P0 致命（不改会在真实使用中出事故） | 6 | 值注入、缺少变量层、效果链正交性、生命周期、契约完整性、稀疏语义 |
| P1 结构（不改会持续增加维护成本/歧义） | 8 | kind 二义、锚点单选择器、层级策略、写顺序、探测环境、AI schema 体积、文件组织、默认值归属 |
| P2 完善（可以后补，但格式要预留位置） | 8 | YAML 严格子集、变换函数枚举、能力分级、资源约束、37 主题可表达性、诊断可解释、第四条通道存疑、模式自省 |

**不建议推翻重来**：能力 id 文法、效果链、三原语、编译 plan、codegen 这几个地基是对的。问题集中在「值怎么进、怎么写回、怎么撤销、怎么证明契约没撒谎」。

---

## 1. 攻击面清单（我怎么审的）

1. 把它交给不懂技术的用户 → 会不会写出「看起来合法、实际炸掉」的主题？
2. 把它交给 AI → 它能否稳定产出合法文件？schema 会不会大到装不进上下文？
3. 宿主升级改名 → 坏掉的是哪个文件？用户主题要不要改？
4. 主题切换 A → B → 空白 → A → 会不会残留图层/监听器/规则？
5. 200 条能力 × 状态 × light/dark → 编译是否确定、可测、可解释？
6. 恶意/手滑主题 → 能不能注入 CSS 破坏页面、能不能把外部资源引进来？
7. 3 年后回头看 → 数据文件还能读懂吗？生成物会不会有人手改？

---

## 2. P0 致命缺陷

### P0-1 值原文插值 = CSS 注入漏洞（安全 + 正确性）

**v1 的问题**：`decl: { background: $value }` 把用户写的字符串直接拼进 `<style>` 文本。用户（或 AI、或恶意主题包）写：

```yaml
sidebar.panel.background: "red; } body { display: none } .x {"
```

就能逃出作用域、破坏整个页面。即使不是恶意，AI 也会输出各种不合法 CSS 值，拼进去后整条规则作废，而诊断只能事后猜。

**修法**：**类型化解析，不信任原文**。

- 每个值类型在代码里有正式解析器（颜色/渐变/长度/资源引用/对象），解析成功 → 由我们**重新序列化**成规范值；解析失败 → `INVALID_VALUE`。
- 规则模板里的 `$value` 只允许「已序列化的安全值」，禁止出现 `;`、`}`、`@`、`url()` 以外未登记的写法。
- `url()` 只允许 `asset:` 引用编译成 `blob:`/data URL；禁止外部 http(s) 地址（除非将来显式开白名单）。
- 专家层 `patches` 若允许原文 token 值，必须走同一个解析器；不允许「任意 CSS 片段」这个后门。

**格式变化**：值类型定义增加 `parse: color|paint|length|asset|object`，并且 `patches` 不再允许裸 CSS 字符串。

### P0-2 缺少「用户变量层」= 主题必然写成一盘散沙

**v1 的问题**：主题只能一个能力一个值地写。用户想让「品牌色」同时用于按钮、链接、选中项、标题，只能三处重复写同一个色值；改一处漏一处。这恰恰是 opencode 37 色位存在的理由，v1 把它丢了。

**修法**：`theme.yaml` 增加顶层 `variables`（用户自定义语义变量，light/dark 类型化），能力值可引用变量：

```yaml
variables:
  accent: { light: '#d4a017', dark: '#f0c040' }
  ink:    { light: '#241d12', dark: '#f2ead9' }
values:
  global.link.foreground: $accent
  sidebar.item.foreground: $ink
```

编译时变量落成 `--palette-var-accent` 这层 CSS 自定义属性，能力实现里以 `var(--palette-var-accent)` 引用 → **改一次全局生效**，且运行时可实时调，不用重编译。

**为什么这是格式问题而不是功能**：如果不预留引用语法，未来加变量层要改所有主题文件；现在预留，用户文件零迁移。

### P0-3 效果链「只选一条」不能表达正交降级

**v1 的问题**：`realization` 是「选一条效果」。但真实能力经常是好几个正交量：排版的字族、字号、行高是三件事，分别可能命中/落空不同实现；如果只选一条效果，字族那条成功就吞掉了字号、行高（或者反过来），降级粒度是错的。

**修法**：把能力分成两种 `kind`：

| kind | 值 | 实现结构 | 例子 |
|---|---|---|---|
| `property` | 标量/颜色/长度（单一 aspect） | `realization: [effect…]` 选一条 | `sidebar.panel.background` |
| `recipe` | 对象（多 aspect） | `aspects: { aspectName: [effect…] }`，每个 aspect 独立选、独立降级 | `effect.glass`、`global.text.typography` |

这样「字号降级了但字族还在」是合法状态，并且诊断能精确定位到 aspect。

**顺带修正一处含糊**：`global.text.typography` 不应该作为一个「属性」塞进 vocabulary——要么拆成 `font_family / font_size / line_height / font_weight` 四个原子 property（推荐，符合「一个旋钮一个能力」），要么明确它是 `recipe`。v1 两头占，必须二选一。

### P0-4 没有生命周期/撤销模型 = 切主题必然残留

**v1 的问题**：plan 只有「写」，没有「怎么撤」。切换主题时：之前插入的壁纸图层还在、加过的 class 还在、MutationObserver 还在、规则文本被替换了但 DOM 补丁没人回收。真实用户会频繁切换和预览，残留会立刻显形（颜色变了但图标还是旧的、两个壁纸叠在一起）。

**修法**：plan 里每个写操作有**稳定 id** 和**撤销语义**：

```yaml
writes:
  - id: sidebar.bg.rule          # 由 capability/aspect/state 派生，稳定
    use: rule
    ...
    teardown: remove             # rule/token 天然可整体替换
  - id: sidebar.bg.layer
    use: dom
    op: insert-layer
    teardown: remove-node        # 每个 dom op 必须声明撤销动作
```

执行器语义：**应用新 plan = 计算差集**：撤销「旧 plan 有、新 plan 无」的条目，更新同 id 条目，新增新条目。每个 dom op 还必须声明 `key`（属于哪条能力）以便冲突检测（两个能力抢同一个元素要报错，而不是后写覆盖前写）。

### P0-5 契约完整性没有门禁 = 能力会「撒谎」

**v1 的问题**：能力声明 `value: paint`（纯色/渐变/图片都行），但效果链可能只写了接受纯色的 token。用户传渐变 → 校验通过、编译后掉进 `NO_AVAILABLE_EFFECT`。声音是「这个能力支持图片」，实际不支持。

**修法**：构建期强制 **shape coverage 门禁**：

> 对每个能力：`value` 能产生的所有形状 ⊆ 所有 effect 的 `accepts` 并集。

不满足就构建失败，三选一：收窄 value 类型 / 补一条效果 / 显式声明 `partial: true` + 文档写明缺口。另加一条门禁：`default` 必须落在覆盖范围内。

### P0-6 「没写」和「写了空」和「恢复默认」没区分 = 会互相覆盖

**v1 的问题**：palette 里带 `default` 颜色，插件又总是把 token 写出去。结果：用户只改了一个图标，页面其他颜色却被插件默认值覆盖（和宿主自己的主题打架）。原句第 16 条「老 json 没写的取默认」说的是**用户主题没写 → 不要写**，v1 做反了。

**修法**：三层语义显式化：

| 用户写法 | 含义 |
|---|---|
| 没写 | **不注入**，让宿主/底层主题决定 |
| `null` / `unset: true` | 明确「清掉我这层」→ 用底层值 |
| 写了值 | 注入 |

palette 不携带视觉默认值；默认值放到单独的 `themes/default/theme.yaml`（它本身就是一个主题文件），可被继承。主题支持 `extends:` 用于做「深色变体 / 小改款」，合并规则 = 子覆盖父，变量后合并。

---

## 3. P1 结构缺陷

### P1-1 能力 id 文法有歧义

`<region>.<role>.<property>` 允许 2–3 段，`menu.surface.radius` 到底是 region=menu, role=surface 还是 region=menu.surface？`effect.glass` 又只有两段。**修法**：固定 3 段 + 词表闭集；自由能力放 `custom.<namespace>.<name>` 并标 `custom: true`；词表不允许复数（统一 `item` 不写 `items`），门禁检查。

### P1-2 锚点只有单个选择器

宿主改一次类名/结构就全废。**修法**：锚点 = **候选选择器列表**（按优先级尝试）+ `scope`（document / element-scope）+ 可选的 `attribute` 型探测；效果链只引用锚点符号，落地时展开成候选。改版只需改锚点表。

### P1-3 规则层级与 `!important` 策略太随意

v1 里 `layer: 100` 由能力作者拍脑袋写，冲突时顺序不可预测。**修法**：`palette` 顶层固定层级枚举（`tokens / base / component / state / override`），能力只能引用枚举，不能写数字；`!important` 改为**结构化策略**（`when: inline_conflict` 才允许，自动生成并在诊断里记一条「此规则用了 !important，原因 X」）。

### P1-4 没有写顺序与原子性声明

一条效果里的多个写可能互相依赖（先插图层才能给它设背景）；部分失败时可能留下半套（只有模糊没有底色）。**修法**：write 增加 `after: [id]`（编译器拓扑排序，有环报错）与 `atomic: true`（默认 true：一条效果的写全成或全不成；需要「能丢字段」时显式 `atomic: false`）。

### P1-5 探测环境没抽象，预览与真实会漂移

预览里的 DOM 与真实页面不同，同样的 probe 会得到不同结果；测试也没法稳定。**修法**：`compile(palette, theme, probe)` 的 probe 是**可注入 profile**：`live` / `preview` / `fixture`（金标测试用固定探测结果）。plan 里记录 `probeProfile` 与探测快照，缓存键包含它。

### P1-6 AI 提示词/schema 体积失控

200 条能力全量生成 JSON Schema + prompt，AI 上下文装不下；用户看文档也晕。**修法**：生成**三层目录**：①紧凑 id 清单（一行一条，无说明）②按 region 分片的详细说明（按需加载）③schema 按 region 拆文件 + `$ref` 组合。AI 提示词默认只带 id 清单 + 一个区域示例。

### P1-7 单文件 2000–4000 行不可评审

**修法**：`palette/` 目录按 region 拆分（`palette/regions/sidebar.yaml`），`_index.yaml` 声明引用顺序，构建期确定性合并 → 单一生成物。评审 diff 只在一个区域文件里，冲突不外溢。

### P1-8 `default` 与 `patches` 的归属混乱

`patches` 的开关（是否允许写裸 token）属于**插件策略**，不该写进能力全集；`default` 属于默认主题，不该写进能力全集。**修法**：拆出 `config/policy.yaml`（插件策略）与 `themes/default/theme.yaml`（默认主题）。palette 只描述「能配什么、怎么落、怎么降级」。

---

## 4. P2 完善项（格式要先留位置）

1. **YAML 严格子集**：禁止锚点/别名/自定义 tag/合并键；重复键直接报错；先转成 JSON 语义模型再校验；错误信息带行列号。YAML 只是作者编码，语义模型是 JSON。
2. **`normalize` 里的函数名改成枚举**（代码实现），YAML 里只能引用枚举值，不允许写自由函数名。
3. **能力分级元数据**：`tier: basic|advanced|expert`（对应 #147 的三档暴露讨论）+ `tags`，供编辑器分组与 AI 取舍；不参与编译。
4. **资源类型约束**：`media`、`max_bytes`、`dimensions`、`light/dark 成对`、只允许相对路径（安全）。
5. **37 款现有主题可表达性测试**：把现有主题各转一份 `theme.yaml`，全部能编译且 plan 与旧实现等价，否则模型有缺口。
6. **诊断可解释**：每条诊断带 `capability/aspect/state/theme 路径` + `hint`，并提供「为什么这个设置没生效」查询（plan 记录每个值的最终去向）。
7. **重新验证「只有三个写入口」这个断言**：宿主是否有插件可写的配置/设置 API（能触发宿主重新渲染主题设置）、或 `CSS.registerProperty` 这类第四条通道。若有，palette 要预留 `host_api` 原语的格式位（先留字段、暂不实现）。
8. **模式自省**：效果链是 Strategy，能力注册表是 Registry，编译是 Compiler——都对；但要防止 Registry 变成 God Data（单文件、无门禁、无切片）和 Codegen 产物被手改（加校验和进 `npm test`）。

---

## 5. 修订后的格式（v2 关键片段）

```yaml
# palette/_index.yaml
palette: 3.0.0
api: 3
layers: [tokens, base, component, state, override]     # 固定层级枚举

value_types:
  color:  { kind: color,  diurnal: true,  parse: color }
  paint:  { kind: union,  of: [color, gradient, image], diurnal: true, parse: paint }
  length: { kind: length, units: [px, rem, em, %], diurnal: false, parse: length }
  asset:  { kind: asset,  uri: relative_only, parse: asset_ref }

states:
  hover: ':hover'
  selected: '[aria-selected="true"]'

anchors:
  sidebar.root:
    candidates: ['[data-slot="conversation.session"]', '[data-sidebar]']
  composer.sendButton:
    candidates: ['[data-composer-send]', 'button[data-role="send"]']

capabilities:
  sidebar.panel.background:              # 固定三段 id
    kind: property
    since: 3.0
    tier: basic
    value: paint
    realization:
      - id: token
        accepts: color
        writes:
          - { id: token, use: token, name: --dsw-specific-sidebar-fill }
      - id: rule
        writes:
          - { id: bg, use: rule, anchor: sidebar.root, layer: component, decl: { background: $value } }
      - id: dom-layer
        writes:
          - { id: layer, use: dom, anchor: sidebar.root, op: insert-layer, payload: $value, teardown: remove-node }

  global.text.typography:                # recipe：多 aspect，各自降级
    kind: recipe
    value:
      type: object
      fields:
        family:     { type: font_family }
        size:       { type: length, default: 14px }
        line_height:{ type: length }
    aspects:
      family:
        - { id: token, writes: [{ id: t, use: token, name: --dsw-font-markdown-base, value_template: '$value.family' }] }
        - { id: rule,  writes: [{ id: r, use: rule, anchor: global.root, layer: base, decl: { 'font-family': '$value.family' } }] }
      size:
        - { id: token, writes: [{ id: t, use: token, name: --dsw-font-size-base, value_template: '$value.size' }] }
        - { id: rule,  writes: [{ id: r, use: rule, anchor: global.root, layer: base, decl: { 'font-size': '$value.size' } }] }
```

```yaml
# themes/default/theme.yaml（默认主题，palette 不再携带视觉默认值）
schema_version: 3
name: 默认
palette: '>=3.0 <4'
variables:
  accent: { light: '#d4a017', dark: '#f0c040' }
assets: {}
values:
  sidebar.panel.background: { light: '#f9fafb', dark: '#111315' }
  global.link.foreground: $accent
```

```yaml
# theme.yaml（用户主题，允许继承与稀疏）
schema_version: 3
name: 海贼王
extends: default              # 可选：继承默认主题
palette: '>=3.0 <4'
variables:
  ink: { light: '#241d12', dark: '#f2ead9' }
values:
  sidebar.item.foreground: $ink
  sidebar.panel.background: null        # 显式「清掉我这层」，用底层值
```

---

## 6. 构建门禁（对付 P0/P1 的硬检查，全部进 `npm test`）

1. palette 自身过 meta-schema；id 固定三段、词表闭集、无重复键。
2. 每个能力的 `value` 形状 ⊆ 效果 `accepts` 并集（契约完整性）。
3. 每个 write 有稳定 id；每个 dom write 有 `teardown`；同锚点同属性的写不得冲突（或显式声明优先级）。
4. 所有 token 名在登记表且非 dead；锚点候选非空；效果链非空。
5. 值解析器对每个 value type 有金标用例；非法值必须报 `INVALID_VALUE` 而不是写出去。
6. 37 款现有主题全部转成 theme.yaml 可编译且 plan 等价旧实现。
7. 生成物校验和：registry/schema/docs 与 palette 一致，禁止手改。
8. YAML 解析：重复键、别名、自定义 tag、外部 URL 资源 → 一律报错。
9. 主题切换 A→B→空 的残留测试：应用/撤销/再应用后 DOM 与样式快照一致。

---

## 7. 仍未解决的问题（不装懂）

1. **第四条写入口**：宿主插件配置/设置 API 是否足以直接影响外观（而不是绕道 token）——需要在源码里再证一次；格式先留 `host_api` 原语位置。
2. **主题包目录读取**：插件能否列出/读取本地主题目录（fs 或宿主路由），决定「安装」流程；未实测。
3. **recipe 的字段可选性**：对象值里某字段缺省时，对应 aspect 是跳过还是报错——倾向「跳过 + 信息级诊断」，但会影响契约完整性门禁的口径。
4. **变量层的求值位置**：CSS 自定义属性 vs 编译期内联。倾向 CSS 变量（可运行时调、缓存友好），但宿主个别 token 可能不接受 `var()` 值，需要实测清单。
5. **多主题叠加/用户微调层**：V3 是否需要「基础主题 + 个人覆盖」两层合并——影响 theme.yaml 的 `extends` 与冲突诊断设计。

---

## 8. 自我批评（设计模式层面）

- **Registry 有变 God Data 的趋势**：单文件承载 200 条能力 + 锚点 + 值类型 → 必须目录化 + 门禁，否则三年后没人敢改。
- **Strategy 用在了两处**（效果链、锚点候选），要保证语义不同：一个是「落地保真度排序」，一个是「宿主改名保命」，文档必须分开讲，否则实现者会混用。
- **Compiler 的 IR（plan）不能成为第二真源**：它必须可从 palette + theme 完全重算；一旦有人开始手改 plan，整个架构腐化。
- **Codegen 的最大敌人是「不可读的 diff」**：生成物要么确定序、要么不进 git（选择：生成物进 git + 校验和，让评审能看到能力变化）。
- 该设计真正的复杂度不在格式，而在**宿主探测的诚实度**：probe 撒谎，所有降级逻辑都是装饰。probe 必须可测试、可观测、可上报。
