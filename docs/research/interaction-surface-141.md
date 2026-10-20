# 列表交互与全局交互效果的事实面（票 #141）

> 票：[#141](https://github.com/FeatherHunter/dsh-opencode-palette/issues/141)（父票 #128）
> 采集日期：2026-10-20
> 基线：DSH 源码 `D:\Temp\dsh-src` @ `687f282`（v0.2.1-rc.2）；本仓 `D:\dsh-plugin\dsh-opencode-palette` @ `38c8d88`
> 证据路径约定：DSH 路径相对 `D:\Temp\dsh-src`，本仓路径相对仓库根。**（事实）** = 已逐行读过的源码；**（计数）** = 本次会话用 `Select-String`/`Measure-Object` 数出来的；**（推断）** = 由事实外推、尚未实机验证。
> 本文不重复既有研究：能力分级与红线见 [v3-capability-matrix.md](./v3-capability-matrix.md)，市面主题插件上限与运动轴见 [theme-ceiling-benchmark-151.md](./theme-ceiling-benchmark-151.md)，宿主 token 契约与漂移探针见 [host-token-probe-136.md](./host-token-probe-136.md)。本文只回答两条新问题：**(a) 破坏性删除确认在宿主侧到底有什么可复用的原语？(b) 本插件自己的可点控件与交互规范覆盖到什么程度、缺什么？**

---

## 0. 结论速览

1. **宿主没有 popconfirm 原语。** 全仓 grep `popconfirm|PopConfirm` **0 命中**；`packages/client/ui-primitives/src/index.ts:5-119` 的公共导出里只有 `Modal` / `RiskConfirmation` / `Menu` / `MenuSurface` / `Tooltip` / `Toast` / `HoverCard` / `useAnchoredPosition` / `useDismissOnOutsidePointer`，**无 popconfirm**。⇒ 原句「点击后就 popconfirm 提示」只能**自建**。
2. **自建的成本比预想低**：本仓已经有一份可搬的实现——`runtime/custom-editor.ts:1682-1713` 的就地 popconfirm（`role='alertdialog'` + 绝对定位 + 两按钮），原型同款在 `prototypes/custom-editor-83.prototype.html:181-184,656`。第 18 条的工程实质是**把它从编辑弹窗搬到胶囊列表**，而不是从零写。
3. **既有笔记有一处要更正**：`v3-capability-matrix.md:102` 写的「popconfirm 自建或 ui-primitives」——后半句作废（ui-primitives 既无此原语，见第 1 条）。
4. **但「用宿主原语做破坏性确认」并非不可能**，宿主有两种现成范式：**Modal 确认框**（`apps/web/tests/models-settings.e2e.ts:181-190`「删除 minimax-cn？」；`ui-plugin-manager/src/client/PluginManagerPage.tsx:1476`+ConfirmDialog `:1803`；`ui-plugin-market/src/client/DiscoverSection.tsx:319,591`）与**原地 armed 二次点击**（`ui-jobs/src/client/JobListAction.module.css:185-224`：20px 方钮 → 变红 danger 药丸并把确认语显式写出来）。后者与「胶囊上长出删除按钮」的形态天然契合。
5. **第 24 条的真实缺口不在覆盖率，在规范。** 可点元素 51 个里 48 个已带交互钩子（**94%**）；缺钩子的 3 个里有 2 个是弹窗遮罩/防护层这种**不该有几何反馈**的元素。真正缺的是：样式表**没有任何 `:disabled` 样式块**、6 档里 5 档缺 `:not(:disabled)` 守卫（只有 LEGACY 与 BUTTON 两档有）、**完全没有 loading/busy 态**。
6. **浮层座位有硬约束**：宿主 `shell.overlay` 浮层层只有 `z-index:20`，低于设置页遮罩的 1000，**不能用作 popconfirm 载体**；设置页内容区 `.options` 是 `overflow-y:auto` 滚动容器 ⇒ 面板内 `position:absolute` 浮层会被裁剪。本仓已有正确姿势的先例：字体菜单用 `position:fixed` + 量矩形算视口坐标（`runtime/client.ts:1351-1360` + `src/engine/float-geometry.ts:43`），`runtime/client.ts:988` 的注释写明「fixed 逃的是祖先 overflow 裁剪（z-index 再高也逃不出去）」。
7. **焦点有一个坑**：宿主 `focus.css:18-21` 在指针模态（`html[data-input-modality='pointer']`）下把非输入控件的 `:focus-visible` 焦点环**置为透明**。⇒ 本插件的「键盘可达可见」不能靠继承宿主的 outline 变量兜底，得自己给。
8. **可对齐的宿主动效轴**：`--ds-ease-in-out: cubic-bezier(0.4,0,0.2,1)`、`--ds-transition-duration: 0.2s`（fast 0.1s / slow 0.3s），见 `packages/client/ui-theme/src/styles/base.css:14-17`；宿主 `docs/web-styling.md:23` 明文要求「加过渡/hover 控件须保留键盘焦点可见与 reduced-motion」。本插件 `runtime/ui-fx.ts` 现有的 `160ms + cubic-bezier(0.22,1,0.36,1)` + reduced-motion 全量降级已是自洽的一套（见 `theme-ceiling-benchmark-151.md:590`）。

---

## 1. 第 18 条：删除入口、删除模式与确认原语

### 1.1 胶囊列表现状：没有任何删除入口（事实）

`runtime/client.ts:1647-1674` 的 `renderCustomSection` 结构：

| 行 | 内容 |
| --- | --- |
| `:1657-1667` | 区标题行：`dot('#FAB283',8)` + `trf('customTitle',{n:list.length})` + 「复制配置路径」按钮（TIER_BUTTON） |
| `:1669-1672` | 一行 `flexWrap:'wrap'` 容器：`shownCustom.map(customChip)` + `funcCapsule('+new', …)` + `funcCapsule('~edit', …)` |
| `:1488-1513` | `customChip`：TIER_CHIP 按钮，点击 = `applyCustomChip`（`:1641-1645` → `props.setCustomTheme(t.id)`）；当前主题追加 ✓（`:1511`） |
| `:1514-1530` | `funcCapsule`：TIER_BUTTON，底色写死 `#FAB283`；`disabled` 时 `opacity:0.45` + `disabled` 属性 |

⇒ 列表里只有「换肤 / 新增 / 编辑」三种语义，**没有删除**。

### 1.2 编辑弹窗里的删除按钮与就地 popconfirm（事实）

`runtime/custom-editor.ts:1682-1713`（仅 `mode==='edit'` 渲染）：

- 外层 `span{position:relative;display:inline-flex}`；未确认时是 trash 图标按钮 → `setDelConfirm(true)`。
- 确认态：`span role='alertdialog' aria-label=tr('edDelete')`，`position:absolute; top:calc(100% + 8px); right:0; zIndex:70; width:max-content; maxWidth:min(300px,86vw)`。
- 内部三段：`b` 标题 `trf('edDelConfirm',{name:shownName})` + `small` 警示 `tr('edDelNote')` + 两按钮 `edDelYes` / `edDelNo`。
- 原型同款：`prototypes/custom-editor-83.prototype.html:181-184`（样式）与 `:656`（DOM 结构）。

⇒ **这份实现可以整体搬到列表**：文案键（`edDelete` / `edDelConfirm` / `edDelNote` / `edDelYes` / `edDelNo`）已在 `runtime/client.ts:240-293` 的 i18n 表里；`custom-editor.ts` 本身不带文案表，走 `props.tr` / `props.trf`（`runtime/custom-editor.ts:714-715`，传入点 `runtime/client.ts:1684` 附近）。

### 1.3 宿主侧：破坏性确认的两种现成范式（事实）

**范式甲 · Modal 确认框**

| 位置 | 内容 |
| --- | --- |
| `apps/web/tests/models-settings.e2e.ts:181-190` | 宿主自己的 e2e：`dialog`「删除 minimax-cn？」 |
| `packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx:1476`，ConfirmDialog 定义 `:1803` | 插件管理页删除插件 |
| `packages/client/ui-plugin-market/src/client/DiscoverSection.tsx:319,591` | 市场页 |
| `packages/client/ui-workspace/src/client/session-actions/ArchiveSession.tsx:82` | 注册进 `shell.overlay` |

**范式乙 · 原地 armed 二次点击**

`packages/client/ui-jobs/src/client/JobListAction.module.css:185-224`：

- `.stop`：20×20 方钮，hover/focus-visible 描 `--dsw-alias-state-error-primary` 45%。
- `.stopArmed`：`width:auto; padding:0 7px`，danger 底 12% + 同色文字；源码注释写明「armed press widens into a labeled danger pill so the confirm step is legible without hover」。
- `.stopLabel`：11px/18px。

⇒ 范式乙与「胶囊上自动长出删除按钮、点一下就进入待确认」的形态是同一物种。

**宿主没有的**：`popconfirm` / `PopConfirm` 全仓 0 命中；`ui-primitives/src/index.ts:5-119` 无此导出。

### 1.4 浮层座位与 z-index 契约（事实）

| 层 | 位置 | z-index | 对我们的含义 |
| --- | --- | --- | --- |
| `shell.overlay` 浮层 | `packages/client/ui-layout/src/client/AppFrame.module.css:281-290`（`.overlayLayer{position:absolute;inset:0;z-index:20;pointer-events:none}`，子元素 auto） | 20 | **不可用作 popconfirm 载体**：低于设置页遮罩 |
| 设置页遮罩 | `packages/client/ui-settings-general/src/client/SettingsRoot.module.css:61-68` | 1000 | 我们面板的宿主上下文 |
| 设置页内容区 | 同上 `:228-233` `.options{flex:1;min-height:0;overflow-y:auto}` | — | **滚动容器**：面板内 `position:absolute` 浮层会被裁剪 |
| 宿主菜单 portal | `packages/client/ui-primitives/src/Menu.module.css:37-46`（`.portal{position:fixed;top:auto;left:auto;z-index:1100}`，注释：portaled list 必须压过 modal overlay 1000） | 1100 | 若走宿主原语的参考值 |
| 本插件字体下拉 / 字体菜单 | `runtime/client.ts:1192-1194`（absolute, z 1000）/ `:1351-1360`（**fixed** + 锚点坐标, z 1000） | 1000 | 本仓正确姿势的先例 |
| 本插件编辑弹窗遮罩 | `runtime/custom-editor.ts:1529-1535`（fixed inset 0，z 2000） | 2000 | 编辑弹窗座位 |
| 本插件 saveError 横幅 | `runtime/client.ts:1961-1967`（fixed, z 3000） | 3000 | 提示条座位 |

本仓浮层定位基础设施：`src/engine/float-geometry.ts:43` 的 `computeMenuGeometry`（`runtime/client.ts:10` 引入），用法见 `runtime/client.ts:1333-1362` 的字体选择器。

**我们的面板确实落在那个滚动容器里（事实，链路已逐环核对）**：`runtime/client.ts:2021` `slots!.register({name:'settings.plugins.tab', …})` → 宿主 `packages/client/ui-settings-plugins/src/client/PluginsSettingsSection.tsx:58` `<div className={css.panel}>{renderSlot('settings.plugins.tab', {}, { only: single.id })}</div>`（多标签时走 `:111`）→ 宿主设置页外壳 `packages/client/ui-settings-general/src/client/SettingsRoot.module.css:228-233` `.options{…overflow-y:auto}`；slot 契约见 `packages/client/ui-settings/src/client/contract/slots.ts:66`（`'settings.plugins.tab': { kind: 'list'; scope: 'root' }`），目录条目见 `packages/extensions/cordis-client-runner/src/client/slot-catalog.ts:3145`。⇒ **列表内 popconfirm 若用 `position:absolute` 会被设置页滚动容器裁剪**，必须走 `position:fixed` + 锚点矩形（本仓字体菜单先例）或 body 级 portal（宿主菜单 portal 参考值 z-index 1100）。

### 1.5 宿主 ui-primitives 到底能不能用（事实 + 推断）

- **宿主把它暴露给插件**：`packages/client/web/src/platform.ts:8-15` 的 `PLATFORM_MODULES` 含 `@deepseek-ai/dsh-client-ui-primitives`；`packages/client/modules/src/client/system.ts:325-348` 的 `makeRequire` 先查 seed 表 → 已物化模块 → 已注册 factory，都没有才抛错。
- **有插件这么用**：`apps/web/tests/fixtures/plugins/fixture-input-extension/client.js:5-6,40-42` 确实 `require('@deepseek-ai/dsh-client-ui-primitives')` 取 Modal/Button。
- **本仓构建链不接受源码级 import**：`scripts/build-client.ts:140-181` 的 `INLINE_PACKAGES` 只登记 dsh-log / dsh-plugin-update；`:345-349` 对未登记包引用直接抛 `[build] 未登记的包引用：<spec>`。
- **但本仓产物形态允许运行时 require**：`scripts/build-client.ts:380-429`——包版产物是 `window.__ModuleLoader__.load({ id, factory: function (require) { … } })`，**factory 收宿主给的 require**；`runtime/client.ts:95-105` 的 `getReact()` 已经在用 `require('react')`（失败再退 `globalThis.React`）。动态版（`:415-423`）是 `cordis_define`，**没有 require**。
- **npm 上的版本与宿主不同步**：`npm view @deepseek-ai/dsh-client-ui-primitives` → latest `0.0.1-rc.1`，dist-tags `{latest: 0.0.1-rc.1, alpha: 0.2.1-alpha.5, next: 0.2.1-rc.2}`；宿主基线是 workspace 的 `0.2.1-rc.2`。

⇒ **（推断）** 想在源码里用宿主 ui-primitives，必须改构建链（新增 INLINE 登记）或走运行时 require（仅包版可用、动态版不可用）。两者都是工程改动，超出本票「只做规划与决策」的范围；而且它**仍然没有 popconfirm**，用它只能换来 Modal/RiskConfirmation，与原句「popconfirm 提示」的形态不符。

### 1.6 删除链路与失败语义（事实）

- `runtime/client.ts:636-655` `deleteCustomTheme(id)` → RPC `palette.customThemesDelete`；面板 API 暴露在 `runtime/client.ts:2005`；编辑弹窗在 `runtime/custom-editor.ts:1578` 调用。
- 宿主侧实现 `runtime/host.ts:348-362`：id 非法直接拒绝且不碰盘；目标不存在 → **幂等成功**。
- 删掉正在生效的主题会自动回落 `opencode`（`runtime/client.ts:650`）。
- `✎ 编辑` 的打开逻辑 `runtime/client.ts:1540-1560`：没有自定义主题时什么都不做。
- **删除成功没有反馈通道**：本仓无 toast 基建；`customDeleteOk`「已删除 {name}」已在 `runtime/client.ts:237` 定义但**未被使用**；现成的「失败横幅」是 `runtime/client.ts:1961-1967` 的 `saveError`（fixed, z 3000）。

---

## 2. 第 24 条：交互效果的覆盖面与规范缺口

### 2.1 机制全量（事实，`runtime/ui-fx.ts` 116 行）

| 项 | 位置 | 内容 |
| --- | --- | --- |
| 钩子属性 | `:9` | `UI_INTERACTIVE_ATTR = 'data-palette-interactive'` |
| 样式表认领标记 | `:12` | `UI_STYLE_ATTR = 'data-dsh-opencode-palette-ui'` |
| 6 个档位常量 | `:15-20` | `TIER_CHIP` / `TIER_BUTTON` / `TIER_ROW` / `TIER_SWATCH` / `TIER_INPUT` / `TIER_SWITCH` |
| 缓动 | `:33` | `EASE = 'cubic-bezier(0.22,1,0.36,1)'` |
| BASE | `:34-35` | 统一 transition：transform/box-shadow 0.16s EASE；border-color/background-color/color/filter 0.16s ease |
| LEGACY（空值档） | `:40-44` | 裸选择器特异度 (0,3,1) 会抢具名档的 box-shadow，故必须限定空值 |
| CHIP_FX | `:47-50` | 上浮 + 品牌色外环 |
| BUTTON_FX | `:53-56` | 微抬升 + `brightness(1.08)` + `scale(0.98)` |
| ROW_FX | `:59-61` | 背景高亮 + 右移 1px |
| SWATCH_FX | `:64-67` | `scale(1.12)` |
| INPUT_FX | `:70-73` | 描边 + 光环，**不位移** |
| SWITCH_FX | `:76-78` | 光环 + 按压 `scale(0.95)` |
| REDUCED | `:81-82` | `prefers-reduced-motion` 全量降级（transition:none，去 transform/box-shadow/filter） |
| 汇总 / 注入 | `:84` / `:101-116` | `UI_FX_CSS`；`injectUiFx(doc)` 幂等注入 `<style>` 到 head（调用点 `runtime/client.ts:562`） |

文件头注释（`:1-6`）写明的硬约束：既有主题胶囊/分段按钮的 SSR 内联 style 字符串一个字符都不碰（`tests/panel-render.test.ts` 的 chipSegment 子串断言必须继续通过），动效只挂数据属性钩子；`!important` 只允许出现在 `:hover` / `:active` / `:focus-visible`；颜色一律取主题变量。

### 2.2 覆盖率审计（计数）

| 指标 | 数值 | 出处 |
| --- | --- | --- |
| 可点元素总数（审计估计） | 51 | `onClick` 出现 36 处（`runtime/client.ts` 17 + `runtime/custom-editor.ts` 19，PowerShell 计数）；差额来自 map 渲染出的重复元素与 label 包裹的 input，**逐元素点算，非逐行点算** |
| 已带钩子（审计估计） | 48（**94%**） | `runtime/client.ts` 19/19；`runtime/custom-editor.ts` 29/32。钩子**属性出现处**是 43 处（见下行），元素数多于属性数是因为同一处属性在 `.map()` 里渲染出多个元素（如 `runtime/custom-editor.ts:1157`、`:646` 的 swatch） |
| 钩子点位 | 43 处 | `runtime/client.ts` 19 处（`:1169,1184,1237,1255,1295,1321,1340,1377,1415,1498,1520,1660,1753,1832,1845,1859,1872,1914,1933`）；`runtime/custom-editor.ts` 24 处（`:556,566,591,612,634,646,656,662,680,689,693,1157,1251,1277,1328,1579,1597,1633,1671,1697,1702,1707,1716,1726`） |
| 档位分布（按属性出现处计，43 处） | button 19 / input 10 / chip 5 / row 4 / switch 3 / swatch 2 | `runtime/client.ts`：BUTTON 8（`:1169,1184,1255,1340,1520,1660,1845,1859`）、CHIP 3（`:1377,1415,1498`）、INPUT 2（`:1321,1933`）、ROW 4（`:1237,1295,1753,1914`）、SWITCH 2（`:1832,1872`）；`runtime/custom-editor.ts`：BUTTON 11（`:556,662,689,693,1633,1671,1697,1702,1707,1716,1726`）、INPUT 8（`:566,591,634,656,1251,1328,1579,1597`）、CHIP 2（`:612,1277`）、SWATCH 2（`:646,1157`）、SWITCH 1（`:680`）。6 档全有使用者，无未定义档位值 |
| 空值（LEGACY）钩子 | **0 处** | grep `UI_INTERACTIVE_ATTR]: ''` 0 命中 ⇒ LEGACY 档在 runtime 内无使用者，**是死 CSS** |
| 内联 `cursor:'pointer'` 却无钩子 | 0 处 | — |

**3 处缺口**（均在 `runtime/custom-editor.ts`）：

| 位置 | 元素 | 是否该有几何反馈 |
| --- | --- | --- |
| `:682` | 透明 `<input type=checkbox>` 本体（父 `label` `:678-680` 已带 TIER_SWITCH，input 本体透明不可见） | 否——视觉由父 label 承担 |
| `:1529-1535` | 弹窗遮罩 div（`position:fixed;inset:0;zIndex:2000;background:rgba(0,0,0,0.6)`，`onClick` → `props.onClose()`） | 否——遮罩不该有 hover 抬升 |
| `:1541-1549` | 弹窗内层 div（`onClick` = stopPropagation 防护层） | 否 |

⇒ **（推断）** 覆盖率本身已基本达标；第 24 条的工作量在**样式表规范**，不在补钩子。

### 2.3 规范侧缺口（事实）

| 缺口 | 证据 |
| --- | --- |
| `UI_FX_CSS` **无任何 `:disabled` 样式块** | `runtime/ui-fx.ts` 全文无 `:disabled` |
| `:not(:disabled)` 守卫只在 2 档 | 仅 `:41,:43`（LEGACY）与 `:53,:55`（BUTTON）；chip / row / swatch / input / switch **5 档缺守卫** ⇒ 禁用态的 chip 仍会有 hover 上浮 |
| **无 loading / busy / pending 态** | runtime 内唯一的忙态是 `runtime/client.ts:980` 的 `fontBusy`，不产生任何视觉态 |
| 禁用态只靠内联 opacity / cursor | `runtime/client.ts:1519,1526`；`runtime/custom-editor.ts:624,635`（透明模式数字输入）、`:661,663`（拾色器按钮）、`:1725` |

### 2.4 可对齐的宿主动效与焦点契约（事实）

- 动效轴：`packages/client/ui-theme/src/styles/base.css:14-17` —— `--ds-ease-in-out: cubic-bezier(0.4,0,0.2,1)`、`--ds-transition-duration: 0.2s`、`--ds-transition-duration-fast: 0.1s`、`--ds-transition-duration-slow: 0.3s`。
- 焦点环：`packages/client/ui-theme/src/styles/focus.css:1-21` —— `--dsw-focus-ring-width:2px`；`:focus-visible` 用 `outline-color: var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary))`；**`:18-21`** 在 `html[data-input-modality='pointer']` 下把 `body :focus-visible:not(:read-write)` 的环色置为透明（指针模态下非输入控件不显环）。
- 宿主书面纪律：`docs/web-styling.md` —— `:16` 复用 control 优先于重造；`:23` 加过渡/hover 控件须保留键盘焦点可见与 reduced-motion；`:25` 抬升面 `border:0` + `--dsw-elevation-*`；`:26` 菜单材质归 ui-theme；`:27` 模态遮罩不 blur；`:29` 中性边框 0.5px 发丝。
- 危险色：`packages/client/ui-theme/src/styles/design-platform.css:211,250,329,368` —— `--dsw-alias-state-error-primary`、`--dsw-alias-interactive-bg-hover-danger`。

⇒ **（推断）** 本插件的「键盘可达可见」必须自带反馈：宿主在指针模态下主动隐藏非输入控件的焦点环，我们若只靠继承 outline 变量，键盘用户切到指针模态后按 Tab 会看不到任何指示。

---

## 3. 对既有笔记的更正与重述

| 既有位置 | 原文 | 本文的处置 |
| --- | --- | --- |
| `v3-capability-matrix.md:102` | 第 18 条 ✅「UI 层（popconfirm 自建或 ui-primitives）」 | **后半句作废**：ui-primitives 无 popconfirm 原语（§1.3）；可用的只有 Modal / RiskConfirmation / Menu / Tooltip / Toast / 两个锚点 hook |
| `v3-capability-matrix.md:108` | 第 24 条 ✅「UI/CSS 层；成本在覆盖全插件组件 + 不干扰宿主控件」 | **成本重述**：覆盖率已 94%，成本在**状态规范**（`:disabled` / `:not(:disabled)` 守卫 / loading 态 / 焦点可见），不在「覆盖组件」 |
| `theme-ceiling-benchmark-151.md:210` | VSCode 只有 hover/active 背景色、无几何反馈；成熟生态无「所有可点控件交互效果」先例 | 维持：本仓 `ui-fx.ts` 的 6 档几何反馈是**自创先例**，无外部规范可抄 |
| `theme-ceiling-benchmark-151.md:362-375` | P1-8 motion 通道（duration/easing/presets/ambient/reducedMotion=clamp 不可关闭） | **归属 schema 票 #140/#147**，本票不动；本票只用「固定一套值 + 不可关闭降级」的现状口径 |
| `v3-capability-matrix.md:114-118` | 五条红线（注入位置 / 克制 `!important` / 材质归 ui-theme / 版本漂移需探针 / 信任模型） | 全部沿用；§2.4 的焦点环与 reduced-motion 条款与之同向 |

---

## 4. 实机验证清单（源码判不了的）

1. 设置页内容区滚动时，胶囊列表底部弹出的 popconfirm 是否被 `.options` 的 `overflow-y:auto` 裁剪（若走 absolute）；走 fixed + 锚点坐标是否与宿主菜单层级打架。
2. 宿主指针模态（`html[data-input-modality='pointer']`）下，键盘 Tab 走到本插件控件时是否真的没有任何可见焦点指示。
3. 宿主设置页被其他插件/浮层覆盖时，本插件 popconfirm 的实际叠放次序。
4. 删除正在生效的自定义主题后，回落到 `opencode` 是否在 UI 上可感知（现无任何提示通道）。
5. `prefers-reduced-motion` 打开时，chip 上浮 / button 抬升 / switch 按压是否全部静止。

---

## 5. 本文不回答的

- 删除入口的**具体形态**、删除模式的具体视觉、删除成功/失败的提示形态 —— 这些是用户裁定项，本票正文以「## 决定：」模板落评论。
- 交互效果是否做成主题 JSON 可配 —— 属 P1-8 motion 通道（schema 票 #140/#147）。
- 实现代码 —— 本图只做规划与决策。
