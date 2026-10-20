# DSH 官方源码主题 token 面调研（V3 前置取证）

> 回答任务：为第三方 DSH Web 主题插件（本仓 `dsh-opencode-palette`）的 V3 重做，摸清官方 dsh 源码里**主题 token 能力的上限**。
> 版本基线：`https://github.com/deepseek-ai/deepseek-harness` @ `687f282`（v0.2.1-rc.2），本地只读稀疏检出 `D:\Temp\dsh-src`。
> 本仓路径：`docs/research/dsh-source-theme-token-surface.md`（本次取证唯一新增文件）。
> 方法：只读源码与文档；token 计数用 `^\s*(--dsw-[a-zA-Z0-9-]+)\s*:` 正则在 8 个 CSS 上枚举后按名去重。**不安装、不运行**任何代码，所有"运行时行为"结论均标注为"待运行时验证"。
> 本文所有 `path:line` 均相对于 `D:\Temp\dsh-src`。

---

## 1. 结论速览

1. **`--dsw-*` 共 403 个唯一名、602 处声明**，分布在 6 个 sheet（`design-platform.css` 382 处、`gradient-shadow-text.css` 196 处、`base.css` 11、`onboarding.css` 10、`focus.css` 2、`corner-shape.css` 1；`scrollbar.css` 与 `shiki.css` 声明 0 个 `--dsw-*`）。
2. **除了 `:root` 上少数 6+1+2 个结构性 token，几乎全部调色板/排版/elevation token 都声明在 `body` 上**（`design-platform.css:4`、`:85`、`:166`、`:284`；`base.css:29`；`gradient-shadow-text.css:1`、`:31`、`:42`）。后果：**在 `:root` / `html` 上设同名变量对 `body` 及其后代完全无效**（被 body 自身声明遮蔽），第三方插件最容易踩的就是这一条。
3. **公共 API 只有两个半入口**：`ctx.theme.register(definition)`、`ctx.theme.overrideTokens(source, {token: {light, dark}})`、`theme/change` 事件（`packages/client/ui-theme/src/client/index.ts:336-378`、`:117-130`）。校验只查"值形状"，**不查 token 名**：任何名字（包括插件自创的新名字）都能写进 `body` 的行内样式。
4. **零运行时强制**：源码里没有任何运行时代码会拒绝、回滚或告警主题 token。所有"材质/elevation/radius 不许改"的规矩，落地形式是 **in-tree vitest 守卫**（只扫 `packages/` 下的 CSS 与 tsx）+ 文档约定；对 npm 外部包不可见。
5. **排版 150 个 per-role longhand token 里 149 个没有消费方**：组件只吃 30 个 composite 简写（103 处引用）与 `--dsw-font-family`（17 处）。改 `--dsw-font-markdown-base-font-size` 这类名字在视觉上不会有任何变化。
6. **真正"有效可配"的集合约 180 个名字**（107 alias + 11 specific + 2 menu + 6 radius + 5 elevation + 4 shadow + 2 linear + 3 gradient + 2 focus + 1 mask + 1 corner + 30 typography composite + 家族入口 2~3 个），而非 403。

---

## 2. 取证基线

| 项 | 值 |
|---|---|
| 源码 | `deepseek-ai/deepseek-harness` @ `687f282`（v0.2.1-rc.2） |
| 本地检出 | `D:\Temp\dsh-src`（只读，sparse checkout） |
| 主题核心包 | `packages/client/ui-theme`（token sheet + 注册表 + 设置行 + boot 脚本） |
| 快照落地消费方 | `packages/client/ui-layout`（`src/client/theme-presenter.ts` 110 行） |
| 规范文档 | `docs/web-styling.md`（39 行）、`docs/ui-radius.md` |
| 样式注入方 | `packages/client/ui-theme/src/client/styles.ts`（40 行） |
| 未取证 | `packages/settings`、`packages/host`、`apps/` 与主题 token 面无关部分未逐行读 |

---

## 3. `--dsw-*` token 全量清点

### 3.1 文件级分布

| 文件（`packages/client/ui-theme/src/styles/`） | `--dsw-*` 声明数 | 内容 |
|---|---:|---|
| `design-platform.css` | 382 | 静态色阶 + alias + specific + menu（4 个 `body` 块 + 2 个 darwin 块） |
| `gradient-shadow-text.css` | 196 | 排版阶梯 + linear/shadow/elevation/mask/menu-filter |
| `base.css` | 11 | 半径、家族、motion、alias 补充 |
| `onboarding.css` | 10 | onboarding 专属 alias + 3 个 gradient stops |
| `focus.css` | 2 | 焦点环宽/色 |
| `corner-shape.css` | 1 | 超椭圆 |
| `scrollbar.css` | 0 | 只消费，改 `--dsh-scrollbar-*` 间接层 |
| `shiki.css` | 0 | 只声明 `--shiki-*`（20 处） |
| **合计** | **602 处 / 403 唯一名** | |

### 3.2 按 family

| family | 唯一名 | 声明数 | 定义位置 | 静态 or 派生 |
|---|---:|---:|---|---|
| `--dsw-static-*` | 77 | 154 | `design-platform.css:5-82`（light，`body`）、`:86-163`（dark，`body[data-ds-dark-theme]`） | 纯字面 hex；dark 块是 light 的**逐名镜像重声明** |
| `--dsw-alias-*` | 107 | 211 | `design-platform.css:167-266` + `:272`（light）、`:285-384` + `:390`（dark）；补充 `base.css:32-33`、`onboarding.css:3`、`:7-9`（light）、`:13-15`（dark） | 多数 `var(--dsw-static-*)`；13 处 `color-mix()` |
| `--dsw-font-*` | 182 | 183 | `base.css:9-10`；`gradient-shadow-text.css:65-274` | markdown 阶梯为 `calc(基准px + var(--dsh-content-font-delta))` 派生；`--dsw-font-family` 在 `:root`（`base.css:9`）与 `body`（`:30`）各声明一次，故 183 处 / 182 名 |
| `--dsw-specific-*` | 11 | 24 | `design-platform.css:267-270`、`:273-279`（light）；`:385-397`（dark）；`:403`、`:407`（darwin） | 派生到 static；darwin 覆盖为字面 rgba |
| `--dsw-radius-*` | 6 | 6 | `base.css:18-23`（`:root`） | 字面 px：4/8/12/16/20/28 |
| `--dsw-elevation-*` | 5 | 6 | `gradient-shadow-text.css:17`、`:33-39` | 派生：由 `--dsw-elevation-stroke-color` 拼 0.5px 发丝描边 |
| `--dsw-shadow-*` | 4 | 4 | `gradient-shadow-text.css:5-9` | 字面 rgba |
| `--dsw-linear-*` | 2 | 4 | `gradient-shadow-text.css:2-3`（light）、`:43-44`（dark） | 字面渐变 |
| `--dsw-gradient-*` | 3 | 3 | `onboarding.css:4-6` | 字面色标 |
| `--dsw-menu-*` | 2 | 3 | `design-platform.css:271`、`:389`；`gradient-shadow-text.css:20` | 字面 rgba + 字面 filter |
| `--dsw-focus-ring-*` | 2 | 2 | `focus.css:3`（width=2px，`:root`）、`:19`（pointer 模态下置 transparent） | width 字面；color **主题不声明默认值**，由消费处 fallback |
| `--dsw-corner-shape` | 1 | 1 | `corner-shape.css:18`（`:root`，`@supports` 内） | 字面 `superellipse(1.5)` |
| `--dsw-mask-blur` | 1 | 1 | `gradient-shadow-text.css:19` | 字面 `none` |

### 3.3 alias 子组（107 个，按第 5 段分组）

| 组 | 数 | 组 | 数 |
|---|---:|---|---:|
| `bg` | 15 | `scrollbar` | 4 |
| `button` | 15 | `tooltip` | 2 |
| `label` | 13 | `menu` | 2 |
| `state` | 12 | `settings` | 2 |
| `markdown` | 8 | `toast` | 2 |
| `border` | 7 | `code` | 2 |
| `file` | 6 | `turn` | 2 |
| `interactive` | 5 | `link` | 1 |
| `brand` | 4 | `switch` | 1 |
| `onboarding` | 4 | | |

### 3.4 非 alias / 非 font / 非 static 的全部名字（可直接抄）

```
--dsw-corner-shape
--dsw-elevation-panel  --dsw-elevation-prominent  --dsw-elevation-soft
--dsw-elevation-stroke  --dsw-elevation-stroke-color
--dsw-focus-ring-color  --dsw-focus-ring-width
--dsw-gradient-onboarding-blue-stops  --dsw-gradient-onboarding-cyan-stops  --dsw-gradient-onboarding-violet-stops
--dsw-linear-gradient-think  --dsw-linear-think-select
--dsw-mask-blur  --dsw-menu-backdrop-filter  --dsw-menu-surface-fill
--dsw-radius-xs  --dsw-radius-sm  --dsw-radius-md  --dsw-radius-lg  --dsw-radius-xl  --dsw-radius-panel
--dsw-shadow-lv1  --dsw-shadow-lv1-blur  --dsw-shadow-lv2  --dsw-shadow-lv3
--dsw-specific-bubble  --dsw-specific-bubble-highlight  --dsw-specific-input-major
--dsw-specific-login-input  --dsw-specific-menu  --dsw-specific-selector
--dsw-specific-sidebar-fill  --dsw-specific-sidebar-nav-item-active
--dsw-specific-sidebar-nav-item-active-accent  --dsw-specific-sidebar-nav-item-hover
--dsw-specific-tip
```

### 3.5 派生化程度（"静态 vs 运行时计算"）

- **602 处声明中 268 处（44.5%）的值里带 `var()`**（`--dsw-alias-*` 绝大多数指向 `--dsw-static-*`，elevation 指向 `--dsw-elevation-stroke-color`）。
- **`color-mix()` 共 13 处**：`design-platform.css` 10 处、`onboarding.css` 3 处。没有 `oklch()`/相对颜色/`light-dark()`。
- **dark 不是"计算"出来的**：`body[data-ds-dark-theme]` 把 light 的静态色阶与 alias 再写一遍（`design-platform.css:85-164`、`:284-401`），属于**双份字面值**，不是函数派生。
- 因此第三方映射要注意：改 `--dsw-static-*` 会连带改掉所有引用它的 alias；但这要求映射表知道 alias→static 的引用关系（107 条）。

---

## 4. 承载体结构（为什么"写在 body 上"是硬约束）

`design-platform.css` 的六个顶层块，可直接看出层级：

| 选择器 | 行 | 特异性 | 作用 |
|---|---|---:|---|
| `body` | `:4` | 0-0-1 | light 静态色阶（77 个） |
| `body[data-ds-dark-theme]` | `:85` | 0-1-1 | dark 静态色阶 |
| `body` | `:166` | 0-0-1 | light alias + specific |
| `body[data-ds-dark-theme]` | `:284` | 0-1-1 | dark alias + specific |
| `html[data-platform='darwin'] body` | `:402` | 0-1-2 | macOS 菜单 fill 提到 94% 不透明 |
| `html[data-platform='darwin'] body[data-ds-dark-theme]` | `:406` | 0-1-2 | 同上 dark |

关键推论：

1. **变量声明在 `body` ⇒ html 上的继承值会被 body 自身声明遮蔽。** 插件写 `:root{--dsw-alias-bg-base:…}`（特异性更高，0-1-0）**不会**影响 body 及其后代——这是最常见的"注入了但没生效"。
2. **主题 API 走的是 body 行内样式**（`packages/client/ui-layout/src/client/theme-presenter.ts:87-90` 的 `body.style.setProperty`），所以它能盖过上表任何一块规则，且不需要 `!important`。
3. **`!important` 在 ui-theme 的 8 个 sheet 里出现 0 次**；全仓 client CSS 只有 5 个文件用到（`ui-trajectory/src/client/TrajectoryTable.module.css` 10 处、`ui-primitives/src/markdown/MarkdownText.module.css` 5 处、`ui-primitives/src/markdown/CodeBlock.module.css` 2 处、`ui-sidebar-terminal/src/client/terminal.module.css` 2 处、`ui-primitives/src/TextShimmer.module.css` 1 处）。
4. `:root` 上只有这些结构性 token：`--dsh-font-family-text-default`/`-code-default`（`base.css:7`、`:11`）、`--dsw-font-family`/`-brand`（`:9-10`）、`--ds-font-family-code`（`:13`）、motion 4 个 `--ds-*`（`:14-17`）、半径 6 个（`:18-23`）、`--dsw-corner-shape`（`corner-shape.css:18`）、`--dsw-focus-ring-width`（`focus.css:3`）、`--shiki-*`（`shiki.css:4-18`）。
5. `--dsw-elevation-*` 故意**逐元素声明**（`gradient-shadow-text.css:31-40` 的 `body, body *`），源码注释（`:27-30`）说明原因：继承只会传"已在 body 上替换完"的值，组件重绑描边色就进不去。这直接导致主题从 body 覆盖 `--dsw-elevation-panel` 时，**子元素的同名声明会盖掉它**。

---

## 5. 公共 API（T1 层）

### 5.1 类型签名（原文）

`packages/client/ui-theme/src/client/index.ts`：

```ts
// :53
export type ThemeTokens = Record<string, string>

// :60-65  — 两个模式都必填；同色也重复写
export interface ThemeTokenModes { light: string; dark: string }

// :68
export type ThemeTokenOverrides = Record<string, ThemeTokenModes>

// :71-81
export interface ThemeDefinition {
  id: string
  colorScheme: 'light' | 'dark'   // 决定 presenter 切 body[data-ds-dark-theme]，与 id 无关
  tokens: ThemeTokens             // 单模式：本主题只对一个 base palette 叠加
}

// :84-101
export interface ThemeSnapshot {
  preference: ThemePreference            // 含 'system'
  fontSizes: FontSizes                   // text/code/terminal，整数 px
  fontFamilies: FontFamilies             // '' = 用内置栈
  active: ThemeDefinition                // 已折入 override 层
  themes: readonly ThemeDefinition[]     // 注册顺序
  revision: number
}
```

Cordis 侧（同文件 `:117-130`）：`Context.theme: ThemeRuntime`，事件 `theme/change(snapshot)`。

### 5.2 Runtime 语义

| 方法 | 行 | 语义 |
|---|---|---|
| `register(definition)` | `:336-351` | 追加到注册表尾部（顺序即 `snapshot.themes` 顺序）；`id === 'system'` 抛错；重复 id 抛错；返回 disposer，销毁时若正被选中则回落到默认偏好 |
| `overrideTokens(source, tokens)` | `:369-378` | 按 `source` 一层，`seq` 单调递增；同 source 再次调用**整体替换**该层并重新压栈顶；返回的 disposer 只摘自己那一层 |
| `composeActive(active)` | `:405-414` | 按 seq 升序折叠，后层逐 token 覆盖；**每个值取 `modes[active.colorScheme]`**（注意：取的是当前激活主题的 scheme，不是 OS 的） |
| `validateOverrides(source, tokens)` | `:466-486` | 只做形状校验：值是裸字符串 → 抛 `TypeError`（带教学文案）；缺 `light`/`dark` → 抛 `TypeError`。**不校验名字、不校验值是否合法 CSS** |

### 5.3 "只能覆盖 alias token 吗？" —— 不是

- 名字**零校验**：`validateOverrides` 只遍历 `Object.entries`，不检查前缀（`:466-486`）。
- 值是任意字符串，直接 `body.style.setProperty(name, value)`（`theme-presenter.ts:88`），浏览器负责合法性。
- **可以定义新名字**：`dynamicToken()`（`:488-496`）对非 `--` 开头的名字也照收，只是不给 `cssVariable` 字段。新名字写进 body 行内后，插件自己的 CSS 用 `var()` 就能读到——但这已经属于 T3。
- 官方**"声明"面比"能力"面窄**：`BUILTIN_INSPECT_TOKENS`（`:137-152`）只公开 14 个 token 作为可发现项的示例（bg-base/layer-1/layer-2/overlay、border-l1/l2、brand-primary、label-primary/secondary、state 四色、specific-sidebar-fill），而 alias 实际有 107 个。**14 ≠ 能力上限**，只是"预定义期检查"的示例集。

### 5.4 明暗成对的两种表示（V3 必看）

| 路径 | 类型 | 是否强制成对 | 生效方式 |
|---|---|---|---|
| `register({tokens})` | `ThemeTokens = Record<string,string>` | **否**，单一值 | 主题自带 `colorScheme` 决定用哪套 base palette；要"明暗成对"必须注册**两个 id** |
| `overrideTokens(src, {token:{light,dark}})` | `ThemeTokenOverrides` | **是**，缺一即抛错 | 一个层同时覆盖两套 scheme，`composeActive` 按当前 `active.colorScheme` 取值 |

对本仓（现状已用 overrideTokens pairs，见 `src/engine/generate.ts:70`）的结论：**明暗成对该走 override 层，不要靠注册两个主题 id**。

### 5.5 注入与下发链路

1. **8 个 sheet 以 `<style>` 注入**（`packages/client/ui-theme/src/client/styles.ts:28-40`）：`document.head.appendChild`，带 `data-plugin="@deepseek-ai/dsh-client-ui-theme"` 与 `data-plugin-css="…/name.css"`，按数组顺序（`:13-22`）追加，随 fiber dispose 移除。
2. **首帧前 boot**（`packages/client/ui-theme/src/boot-theme.ts`）：head CSS 只写 `:root{color-scheme}` + `body{background-color}` + `--dsh-boot-bg`（`:20-24`，`--dsh-boot-bg` 是第 12 个 `--dsh-*`，只此一处）；body 脚本写 `data-ds-theme-source`、toggle `body[data-ds-dark-theme]`、写 3 个字号与 3 个家族变量（`:35-43`）。
3. **快照落地**（`theme-presenter.ts:69-93`）顺序：`html.style.colorScheme`（`:71`）→ `html[data-ds-theme-source]`（`:72-73`，值 `light`/`dark`/`system`）→ body dark 属性（`:75-76`）→ 字号（`:77-79`）→ 家族（`:80-84`，空串则 removeProperty）→ **撤销上一轮 token**（`:85-86`）→ 写本轮 token（`:87-90`）→ `meta[name=theme-color]` 取 `getComputedStyle(body).backgroundColor`（`:91-92`）。
4. 顺序含义：字号/家族先写、token 后写，**所以主题 token 里若含 `--dsh-content-font-size` 会盖掉用户设置**（副作用，不是保护）。
5. presenter 只撤销自己写过的名字（`:99-109`），外来行内样式不会被清掉（注释 `:10-12`）。

---

## 6. 什么被"强制"了？三分法

### (a) 运行时强制

**没有一条是针对主题 token 的。** 唯一在运行时必然生效的"保护"来自 CSS 级联本身：

| 现象 | 机制 | 证据 |
|---|---|---|
| `:root`/`html` 设调色板 token 无效 | body 自身声明遮蔽继承 | `design-platform.css:4`、`:166` 等 |
| body 行内主题 token 盖过一切非 `!important` 规则 | 行内 > 作者样式 | `theme-presenter.ts:87-90` |
| 组件可局部重绑，从 body 覆盖不进去 | 子元素同名声明优先 | 见下表 |
| pointer 模态下焦点环被撤色 | `html[data-input-modality='pointer'] body :focus-visible:not(:read-write){--dsw-focus-ring-color:transparent}` | `focus.css:18-20` |
| `--dsw-mask-blur` 恒为 `none` | 主题自己写死的值 | `gradient-shadow-text.css:19` |

**组件局部重声明清单（运行时真正不受主题控制的部分）**：

| token | 重声明处（示例） |
|---|---|
| `--dsw-elevation-stroke-color` | `ui-attachment/src/AttachmentRail.module.css:95`、`ui-chat/src/client/chat/ChatView.module.css:287`、`ui-chat/src/client/chat/stat-dialog.module.css:25`、`ui-commands/src/client/PopupSelectView.module.css:28`、`ui-conversation/src/client/skeleton/ContextMeter.module.css:56`、`InputBar.module.css:60`、`:83`、`TodoPanel.module.css:23`、`ui-dockkit/src/components/dockkit.module.css:762`、`ui-goal/src/client/GoalBar.module.css:32` 等 ≥10 处 |
| `--dsw-alias-label-shimmer` | `ui-chat/src/client/chat/ChatView.module.css:147`（改指 `--dsw-alias-label-deep-diving-shimmer`） |
| `--dsh-scrollbar-thumb` / `-hover` | 约 15 个 sheet（`ui-commands/src/client/PopupSelectView.module.css:25-26`、`ui-dockkit/src/components/dockkit.module.css:587-588`、`ui-sidebar-terminal/…` 等） |
| `--dsh-scrollbar-width` | `ui-input-trigger/src/client/MenuView.module.css:20`（6px） |

### (b) 仓库边界 vitest 守卫（只对 `packages/` 内的 in-tree CSS/TSX 生效）

| 守卫文件（`packages/client/ui-theme/tests/`） | 断言 | 关键行 |
|---|---|---|
| `menu-surfaces.client.spec.ts` | 菜单/listbox 必须包在 `MenuSurface`；消费方 CSS 不许改 `background`/`backdrop-filter`/`anchor-name`；**`--dsw-menu-*`/`--dsw-specific-menu` 只许 ui-theme 自己声明** | `:106-113`（扫描范围 = `packageStylesheets()`） |
| `elevation-styles.client.spec.ts` | 菜单 fill 必须配同一 backdrop filter；elevation 阴影不许配中性 border；中性实线 border 一律 0.5px | `:89-118`、`:159-224`、`:226-258` |
| `radius-styles.client.spec.ts` | 组件半径只许用 `--dsw-radius-*`，例外走 `expected/radius-exceptions.expected.json` | `:30-41` |
| `scrollbar-styles.client.spec.ts` | light/dark 两块的 scrollbar token 集合必须一致；必须指向静态色阶而非别的 alias；每个 token 都得有消费方 | `:218`、`:226`、`:241-256` |
| `focus-ring-styles.client.spec.ts` | 焦点环色必须走共享 color 间接层（不许写非蓝色） | `:55-64` |
| `corner-shape-styles.client.spec.ts` | `--dsw-corner-shape` 只能声明在 `@supports` 内；满圆半径必须配 `corner-shape: round` | `:39-50`、`:76-83` |
| `app-region-styles.client.spec.ts` | 拖拽区只能出现在两处 | `:232-272` |
| `stylesheet-scan.ts` | 扫描根 = `packages/`（`PACKAGES_DIR`，`:16`、`:81-101`），**发现不了 node_modules 里的外部包** | `:16` |

→ **对 npm 外部插件，这套守卫在物理上不可见**；它约束的是官方 feature package 的作者，不是第三方。

### (c) 仅约定（文档）

`docs/web-styling.md`：

- `:9` ui-theme 拥有 `--dsw-*` 全部静态/语义/排版/motion/渐变/阴影/滚动条；ui-layout 负责落地快照；feature 包只消费语义 alias，"不得自带全局主题"。
- `:18` 组件只用 `--dsw-alias-*`；不许抄静态色值或写字面色。
- `:25` 浮层：`border: 0` + `box-shadow: var(--dsw-elevation-panel|prominent|soft)`；**永远不要**把 `--dsw-alias-border-*` 与 elevation 阴影搭配（spec 会拒）。
- `:26` 菜单材质 = 主题拥有的 `--dsw-menu-surface-fill` + `--dsw-menu-backdrop-filter`；"feature 与 platform CSS **must not override either**"。
- `:27` 模态遮罩保留半透明深色但**不带模糊**，主题把 `--dsw-mask-blur` 设为 `none`。
- `:28` macOS 无 backing 的浮层用 `--dsw-specific-menu`，94% 不透明。
- `:29` 中性实线 0.5px（Chromium 画成 1 设备像素）。
- `:37-39` "改系统"的方式：改 ui-theme 的 sheet，再从 feature 消费语义 alias（**这条只对 in-tree 作者成立**）。

`docs/ui-radius.md`：半径阶 R4/R8/R12/R16/R20/R28 → `--dsw-radius-xs|sm|md|lg|xl|panel`，含组件尺寸映射、圆形/胶囊例外、嵌套 hover 几何。

---

## 7. 排版 token 全景

### 7.1 三个字号入口 + 家族入口

| 变量 | 角色 | 范围 | 默认 | 定义 |
|---|---|---|---|---|
| `--dsh-content-font-size` | text（会话正文基准） | 10–22 | 14 | `theme-settings.ts:24-30`、`:58` |
| `--dsh-code-font-size` | code | 10–16 | 11 | `theme-settings.ts:59` |
| `--dsh-terminal-font-size` | terminal | 10–20 | 13 | `theme-settings.ts:60` |
| `--dsh-font-family-text` | 用户文本字体栈 | 任意（归一化） | `''`=内置 | `theme-presenter.ts:41-45`、`theme-settings.ts:84` |
| `--dsh-font-family-code` | 代码字体栈 | 同上 | `''`=内置 | 同上 |
| `--dsh-font-family-terminal` | 终端字体栈 | 同上 | `''`=内置（**注意：`base.css` 没有它的默认值**，只在 presenter 写入时存在） | 同上 |

`normalizeFontFamily()`（`theme-settings.ts:163-169`）：逗号分隔、去引号/反斜杠/尖括号/控制字符、非通用族一律加双引号。通用族白名单在 `:150-153`。

### 7.2 30 个角色 × 5 个 longhand + 1 个 composite = 182 个名字

- 13 个 UI 角色：`xxxs-11`、`xxxs-strong-11`、`xxs-12`、`xxs-strong-12`、`xs-13`、`xs-strong-13`、`s-14`、`s-strong-14`、`base-16`、`base-strong-16`、`m-18`、`l-20`、`xl-24`
- 17 个 markdown 角色：`h1`–`h4`、`base`、`base-strong`、`base-italic`、`base-strong-italic`、`small`、`small-strong`、`small-italic`、`small-strong-italic`、`code`、`code-block`、`code-block-small`、`table`、`table-head`
- 每个角色 6 个名字：`--dsw-font-<role>`（`font:` 简写）+ `-font-family` / `-font-size` / `-font-style` / `-font-weight` / `-line-height`
- 加上家族入口 `--dsw-font-family`、`--dsw-font-family-brand` → 30×6+2 = **182**

### 7.3 消费实况（决定"哪些 typography token 真的能动"）

| 引用 | 次数 |
|---|---:|
| composite 简写（`var(--dsw-font-markdown-h1)` 等） | **103** |
| `--dsw-font-family` | **17** |
| per-role longhand（`-font-size`/`-font-weight`/`-line-height`/`-font-family`） | **1**（仅 `ui-primitives/src/user-text.module.css:31` 的 `--dsw-font-markdown-code-font-family`） |

→ **150 个 longhand 里 149 个是"导出了但没人读"**。而且 composite 是**独立复写**的，不引用自己的 longhand：`gradient-shadow-text.css:65` 的 `--dsw-font-markdown-h1` 直接写 `700 calc(21px + var(--dsh-content-font-delta)) / calc(30px + …) var(--dsw-font-family)`，并不 `var(--dsw-font-markdown-h1-font-size)`。所以覆盖 longhand **既不改变 composite，也不改变任何组件**。

### 7.4 line-height 是否 token 化？

**是 token 化，但是 px 而非比例**，两条阶梯策略不同：

| 阶梯 | 形态 | 例子 |
|---|---|---|
| markdown（17 个角色） | `calc(基准px + var(--dsh-content-font-delta))`，随用户字号线性走 | h1 `calc(30px + delta)`（`gradient-shadow-text.css:68`）、base `calc(24px + delta)`（`:96`）、code `calc(19px + var(--dsh-code-font-delta))`（`:166`） |
| UI 13 个角色 | 固定 px，与字号设置**无关** | `xl-24` 32px（`:188`）、`base-16` 24px（`:209`）、`xxxs-11` 14px（`:265`） |

delta 的定义：`--dsh-content-font-delta: calc(var(--dsh-content-font-size,14px) - 14px)`（`gradient-shadow-text.css:57`），次字号 `--dsh-content-font-size-secondary`（`:58`）、`--dsh-content-font-delta-secondary`（`:59`）、`--dsh-code-font-delta: calc(var(--dsh-code-font-size,11px) - 11px)`（`:63`）。全部 `--dsh-*` 前缀（主题"拥有"但不是 `--dsw-` 命名空间）。

### 7.5 附带：shiki token 的真实状态

- `shiki.css:8-9` 在 `:root` 上写 `--shiki-foreground: var(--dsw-alias-label-primary)`、`--shiki-background: var(--dsw-alias-markdown-code-block)`——**而这两个 alias 只声明在 body**，所以这两条在 `:root` 上是"计算期无效"值。
- 后果被代码兜住：背景由 `CodeBlock.module.css:92-94` 用 `!important` 改route 到 `--dsl-code-block-background`（= `--dsw-alias-markdown-code-block`），文字色由 `CodeBlock.module.css:15`、`:46` 直接写 `var(--dsw-alias-label-primary)`。
- 真正活着的 shiki token 是 9 个 `--shiki-token-*`（light `shiki.css:10-18`，dark `:22-30`），值是字面色 —— **这 9 个是主题可改的、且文档里没提的 token**。
- 需运行时验证（见 §10）。

---

## 8. T1–T4 分层结论

| 层 | 手段 | 覆盖范围 | 现实约束 |
|---|---|---|---|
| **T1** | `ctx.theme.register()` / `ctx.theme.overrideTokens()` + `theme/change` | 任意 `--` 名字写进 `body` 行内 | 只对"真的有人读"的 token 有效；被组件局部重声明的 5 类名字无效；`light/dark` 必须成对（仅 override 层） |
| **T2** | 插件自己注入 `<style>` 设自定义属性（或 JS 写 `body.style`） | 全部 token，含 T1 不可达的组件局部 token | 必须落在 **`body` 级**且压过 `body[data-ds-dark-theme]`（0-1-1）；macOS 上 `--dsw-specific-menu` 被 `html[data-platform='darwin'] body`（0-1-2）压住，需 ≥0-1-2 或 `!important` |
| **T3** | 注入选择器规则（改 `background`/`backdrop-filter`/`border-radius`/`font-*` 等属性） | 视觉上无上限 | 要对抗 CSS Modules 哈希类名的 0-2-0 特异性；DSH 自身 0 个 `!important` 但 shiki 兜底用了 1 个；任何防御性改动都无运行时校验 |
| **T4** | DOM/JS 运行时改写（属性、行内样式、节点） | 与 T2/T3 重叠，但可绕开选择器特异性 | `ThemePresenter` 只撤自己写的名字（`theme-presenter.ts:99-109`），不冲突；但 React 重渲染可能覆盖被改的 DOM 属性 |

映射：调色板/alias/specific/menu/elevation/shadow/gradient/linear/mask/corner/radius/focus-width **→ T1 可达**（除组件局部重绑的 5 类）；`--dsw-elevation-stroke-color`、`--dsw-alias-label-shimmer`、`--dsh-scrollbar-*` **→ 只能 T2/T3**；非 token 的视觉（边框宽度、圆角双层、玻璃层的 `isolation`）**→ T3/T4**。

---

## 9. 对 V3 四项要求的含义

### 9.1 全量主题 token 可配

- 名字层面"全量"是 403；**能动的"全量"约 180**（见 §1.6）。建议 V3 把槽位定义为"**有效 token 集合**"，并在 UI 上把 149 个 dead longhand 明确标灰，否则"全量可配"是自欺。
- 覆盖必须走 T1（overrideTokens pairs）或 T2 的 **body 级**声明；`:root` 一律无效。
- `--dsw-static-*`（77 个）可改，但 alias 已经引用它们，改静态色阶会产生"全局连锁"；V3 若要保持"37 槽 → 60 变量"的可控映射，仍应以 alias 为主入口。
- 149 个 dead token 若真要"可配"，唯一办法是 T3 注入 `font-size`/`font-weight`/`line-height` 规则，而不是设变量。

### 9.2 玻璃状态

- 玻璃 = **2 个 token**：`--dsw-menu-surface-fill`（light `rgba(248,249,250,0.58)` / dark `rgba(67,69,74,0.45)`，`design-platform.css:271`、`:389`）+ `--dsw-menu-backdrop-filter`（`blur(40px) saturate(150%)`，`gradient-shadow-text.css:20`）。
- 运行时**不阻止**改：`menu-surfaces.client.spec.ts:106-113` 只在 in-tree 生效；外部包改这两个名字不会被任何测试发现。
- 但注意三点：① macOS 无 backing 的浮层用 `--dsw-specific-menu`，被 darwin 规则钉到 94% 不透明（`design-platform.css:403`、`:407`），玻璃在这些浮层上本来就是"准不透明"；② 模态遮罩的 `--dsw-mask-blur` 被主题写死 `none`（`:19`），要"遮罩也毛玻璃"就与 `docs/web-styling.md:27` 正面冲突，且 Desktop 端还有原生 vibrancy；③ `MenuSurface` 在 macOS 会插不透明 backing（`docs/web-styling.md:28`），玻璃观感由宿主代码决定，不是纯 CSS。
- 结论：**菜单玻璃可做（T1/T2），遮罩玻璃与"全玻璃"不可靠**，需要运行时验证（§10）。

### 9.3 明暗成对

- 官方**只有 override 层强制成对**（`validateOverrides:466-486`，裸字符串抛错并给出教学文案）。
- `register()` 一条定义只对应一个 `colorScheme`；想"明暗成对"要么注册两个 id，要么用 override 层。**本仓现状已是后者**（`src/engine/generate.ts:70`）。
- 关键细节：`composeActive` 用 `modes[active.colorScheme]`（`:410`），取的是"当前激活主题"的 scheme —— 若用户选了一个自定义 dark 主题，override 层给的是 dark 值，与 OS 无关。V3 的"明暗成对"应理解为"每个主题自带 light/dark 两套值，由主题自己的 colorScheme 决定取哪套"。
- 另外 `preference === 'system'` 时由 `ThemeRuntime` 监听 `prefers-color-scheme`（`:191-203`）选择内置 light/dark，**自定义主题不参与 system 切换**（除非注册成 id 并被选中）。

### 9.4 预览保真

- 预览要复刻的不是"变量值"，而是**落地链路**：`body` 行内、`html[style=color-scheme]`、`body[data-ds-dark-theme]`、`html[data-ds-theme-source]`、以及字号/家族 3+3 个变量（`theme-presenter.ts:69-93`）。
- 只在预览容器里设 `--dsw-alias-*` 会漏掉：elevation（逐元素 + 描边色重绑，`gradient-shadow-text.css:31-40`）、scrollbar（`--dsh-scrollbar-*` 间接层，`scrollbar.css:17-25`）、radius（`:root` 上的 `--dsw-radius-*`）、shiki（9 个 `--shiki-token-*`）、字体阶梯（30 个 composite）。
- 保真的最低建议：预览 iframe/容器内联同一份 8 个 sheet（或至少 ui-theme 的 8 个文件）+ 同一套 `body` 行内 token + 同一 dark 属性；否则"预览像、实装不像"。

---

## 10. 待运行时验证 / 未知项

| # | 待验证 | 为什么必须验 | 建议做法 |
|---|---|---|---|
| 1 | `--shiki-foreground`/`--shiki-background` 在 `:root` 上是否真的 invalid | 静态推断为"计算期无效"，但被 `CodeBlock.module.css:92-94` 的 `!important` 兜住；若某些代码块没走到那条规则会露底 | 实机 DevTools 看 `pre.shiki` 的 computed `background-color` |
| 2 | 149 个 dead longhand 是否有**宿主外**（apps/、未来版本）消费 | 当前结论只覆盖 `packages/client` | 全仓 `grep 'var(--dsw-font-.*-font-size'` 已做，未来版本需回归 |
| 3 | `--dsh-font-family-terminal` 无默认值时的回退表现 | `base.css` 只给 text/code 默认栈（`:7`、`:11-12`） | 终端面板实机看字体 |
| 4 | T2 在 darwin 上的特异性实战（`--dsw-specific-menu`） | 0-1-2 规则在 macOS 上压 `body[data-ds-dark-theme]` 0-1-1 | macOS 实机注入对比 |
| 5 | 组件局部重绑是否覆盖了 V3 想控的全部槽位 | 本仓 37 槽里若含 elevation 描边色/滚动条，实际无效 | 逐槽位在实机截图比对 |
| 6 | `MenuSurface` macOS backing 对玻璃观感的实际影响 | 决定"玻璃菜单"能不能做到 100% 一致 | macOS 实机 + Windows 对照 |
| 7 | 是否存在未在 `packages/client/ui-theme` 内的第 9 个 token sheet | 本次只读 ui-theme/styles | `grep -r 'dsw-' packages/boot packages/web apps` |
| 8 | 主题 token 里写非颜色值（如 `--dsw-radius-md: 99px`）的边界 | 无校验，浏览器照收 | 实机验证半径连锁 |

---

## 11. 复现命令（PowerShell，只读）

```powershell
# 1) 全量计数（403 / 602）
$rows = Get-ChildItem D:\Temp\dsh-src\packages\client\ui-theme\src\styles\*.css |
  ForEach-Object { Select-String -Path $_.FullName -Pattern '^\s*(--dsw-[a-zA-Z0-9-]+)\s*:' -AllMatches }
$rows.Count                              # 602 处声明
($rows | ForEach-Object { $_.Matches[0].Groups[1].Value } | Sort-Object -Unique).Count   # 403 唯一

# 2) 排版 longhand 的消费方（应只剩 1 条）
Select-String -Path D:\Temp\dsh-src\packages\client\*\src\**\*.css `
  -Pattern 'var\(\s*--dsw-font-[a-z0-9-]+-(?:font-size|font-weight|line-height|font-style|font-family)\b'

# 3) !important 分布（ui-theme 应为 0）
Select-String -Path D:\Temp\dsh-src\packages\client\ui-theme\src\styles\*.css -Pattern '!important'
```

---

## 12. 一句话交付

> DSH 的 token 面很宽（403 个名字）但**有效面窄（约 180）**；唯一官方扩展点是 `ctx.theme.{register,overrideTokens}`，它把值写成 **body 行内**、名字零校验、明暗只在 override 层强制成对；所有"材质/elevation/radius 不许动"的规矩都活在 **in-tree vitest** 与文档里，对 npm 外部包不构成运行时强制——**能力上限由 CSS 级联和 5 处组件局部重声明共同决定，而不是由 API 决定**。
