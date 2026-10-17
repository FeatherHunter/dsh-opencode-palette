# 取色控件调研：为什么「拖色相条选不准」，以及该怎么重做

> 调研对象：`runtime/custom-editor.mjs` 里 `renderPop()`（`runtime/custom-editor.mjs:528-678`）那个 250px 宽的取色 Popover。
> 目标读者：要动手改这个弹板的人。
> 约束前提：零外部 UI 依赖（手写 `e()`/`h()` + 内联样式）、输出只有大写 `#RRGGBB` 或 `'transparent'`（仅 8 个背景槽）、Chromium webview、SVG 禁 `<circle>`、弹板宽 250–320px、双语、单测要能 pin 住结构。

---

## 结论先行

1. **头号根因不是手感，是信息丢失。** 色相没有独立状态：每次渲染都由 hex 反推（`runtime/custom-editor.mjs:533` 的 `const hsv = hexToHsv(pop.hex)`），而 `hexToHsv` 在灰色/黑色/白色时（`d === 0`，`runtime/custom-color.mjs:29-37`）把 `h` 归 0。于是用户把明度拖到 0（黑）或饱和度拖到 0（灰）的那一刻，色相条弹回红色 0°、SV 底板也变红；此后无论怎么拖，都只能在这个「假红色相」里选。「总感觉选不到自己满意的」首先是被这个确定性 bug 挡住的。
2. **第二层是交互语义自相矛盾。** 拖动时已经 live commit（`runtime/custom-editor.mjs:556-558` 每次 move 都 `setColor`），但点弹窗外或按「关闭」又会整体回滚到 `orig`（`runtime/custom-editor.mjs:391-397`、`:292-317`）。用户调好颜色去点下一个色位，上一步的调色被静默丢弃 —— 这比「不准」更伤。
3. **第三层是控件表达力不足。** 色相用的是原生 `<input type="range">`（`runtime/custom-editor.mjs:608-618`）：没有渐变轨道、没有刻度、数字不回显、thumb 吃掉行程（226px 行程 ≈ 1.6°/px）。MDN 自己写着 range「imprecise，只应在精确值不重要时使用」（下面证据表 E1）。
4. **第四层是色彩空间本身。** HSV/HSL 的色相不是感知均匀的：同 value/saturation 扫一圈色相，黄、品红、青明显比红蓝亮（Oklab 作者原文，E6）。用户只想「换个色相」，拿到的却是亮暗也变了的颜色 → 观感落空。
5. **主推方案 A**：320px「精确控制版」——296×136 SV 面板 + 带渐变与刻度的横向色相轨 + H/S/V 三个数字输入（±1 步进）+ 8 个主题色 + 最近色 + HEX 输入/吸管/对比度徽章 + 仅背景槽的透明行 + 取消/完成。高度约 378px（要改定位常量）。
6. **备选方案 B**：250px「紧凑微调版」——SV + 色相轨 + **当前色的 11 级明度阶**（专门服务「从已有主题色微调」），高度约 286px，**不动现有 350px 定位常量**，可先上线。
7. 修复的核心一行逻辑：**`{h,s,v}` 是状态，hex 只是投影**；从 hex 回填时用 `mergeHsv(prev, next)` —— `v===0` 保留 h 与 s，`s===0` 保留 h。再配 Pointer Events 拖拽、`role="slider"` 键盘映射、`EyeDropper` 特性检测。

---

## 1. 现状：把「感觉」翻译成可测的机制

| 事实 | 位置 |
| --- | --- |
| 弹板 `width: '250px'`、`padding: '12px'`、`borderRadius: '10px'`、`position: 'fixed'`、`zIndex: 60` | `runtime/custom-editor.mjs:581-588` |
| 标题是 `h4`，`fontSize: '12px', margin: '0 0 8px'`，无加粗 | `runtime/custom-editor.mjs:589`（被 `tests/custom-editor.test.mjs:588` pin 住） |
| SV 面板 226×120（100% 宽 × `height: '120px'`），三层渐变叠加，`cursor: crosshair` | `runtime/custom-editor.mjs:579-598` |
| SV 手柄 12×12 圆点（`borderRadius: '50%'`、白描边、`pointerEvents: 'none'`），按 `s%` / `(100-v)%` 定位 | `runtime/custom-editor.mjs:599-606` |
| SV 拖拽：`onMouseDown` → 立刻 `setColor` → 在 `document` 上挂 `mousemove`/`mouseup`，**无节流** | `runtime/custom-editor.mjs:546-578` |
| 色相：原生 range `min=0 max=360 step=1`，`aria-label: 'Hue'`，样式只有 `width:'100%', margin:'4px 0 8px'` | `runtime/custom-editor.mjs:608-618` |
| 「本主题用过的颜色」：`distinctThemeColors(colors).slice(0, 8)`，24×18 色块 | `runtime/custom-editor.mjs:534`、`:619-631` |
| HEX 输入：`onChange` 只在 `normalizeHexInput` 成功时提交，非法输入**静默无效**（无错误态、不回显） | `runtime/custom-editor.mjs:633-646` |
| 透明：仅 `meta.allow` 时显示 checkbox，切换即 `setColor(key, pop.hex, on)` | `runtime/custom-editor.mjs:647-659` |
| 底部：`确定`（主按钮）/`关闭`（次按钮） | `runtime/custom-editor.mjs:661-676` |
| 点弹窗外 = `closePop(true)` = **回滚** | `runtime/custom-editor.mjs:292-317`、`:391-397` |
| 定位：`left` 用 `vw-270` 与 `pv.left - 250 - 8`；`top` 用**硬编码 350** 判翻转 | `runtime/custom-editor.mjs:321-341` |
| 色相状态来源：`hexToHsv(pop.hex)`，灰/黑时 `h=0` | `runtime/custom-editor.mjs:533`、`runtime/custom-color.mjs:21-38` |

两个额外发现（不在痛点原话里，但会放大挫败感）：

- **「最近色」被 8 个背景色占满。** `distinctThemeColors` 按 `Object.keys(colors)` 顺序去重（`runtime/custom-color.mjs:65-76`），而 `COLOR_SLOT_GROUPS` 恰好把 8 个 bg 槽排在最前（`src/engine/map-dsh.mjs:196-204`）。若 seed 的 key 顺序以 `background` 开头（内置主题基本如此），`.slice(0, 8)` 正好一个不差地取走 8 个背景色 —— 用户正在调的品牌色、语法色一个都进不来。
- **hex 输入与透明状态会打架。** hex 输入的 `onChange` 写 `setColor(..., false)` 但不改 `pop.transparent`（`:633-646`），而 SV/色相处理器都会顺手 `transparent: false`。于是「勾着透明 → 在 hex 框里打字」会出现色值已是 hex、复选框仍勾着的错位状态。

---

## 2. 产品对照表

> 图例：✅ 有；◐ 有但弱/可选；— 无。`†` = 本章证据只能到功能清单级，未见一手交互规范（见 §11）。

| 产品 | SV / 主面板 | 色相控件 | 数值输入 | 吸管 | 最近色 / 预设 | 键盘 | 对比度 | 透明度 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Figma** | 色板（palette）里取色 + 色相滑杆 + 不透明度滑杆 | 横向滑杆 | 数值表示 + 色模下拉（RGB/HEX/CSS/HSL/HSB） | ✅ 画布内吸色 | ✅ 当前文件颜色 + 库/样式/变量 | 未取证 † | ✅ 4.5/3/7:1 + **一键吸附到最近合规色**，分 Auto/Large/Normal/Graphics 与 AA/AAA | ✅ 独立滑杆 |
| **Chrome DevTools** | Shades 区 + 可拖的 Color circle | 横向滑杆 | Display value（可切 12 个色彩空间，含 oklch/lab） | ✅ 按 `C` 激活 / `Esc` 退出，**只采 sRGB，越界裁到最近** | ✅ Material / Custom / CSS 变量 / Page colors 四种色板 | `C` 吸管、`Shift`+点击预览图标直接开色模下拉 | ✅ Contrast ratio（仅 `color`），可切 WebAIM/APCA，点「Use suggested color」一键合规 | 不透明度滑杆 |
| **react-colorful** | `__saturation` 面板 | `__hue` 滑杆（可换环） | 不内置，另配 `HexColorInput` | — | 不内置（recipe 里给 preset 方案） | ✅ `onChange` 每次按键触发，`onChangeEnd` 在 keyup | — | 单独 `*Alpha*` 组件 |
| **Coloris** | marker（SV）面板 | hueSlider | 颜色值输入框（打开时 `focusInput`/`selectInput`） | — | swatches 数组 | ✅ a11y `instruction`：SV 面板用上下左右方向键 | — | alpha 开关 / alphaSlider |
| **iro.js** | 组件化（SV 方框 / 色相环 / 色相条可拆装），`width` 控制尺寸 | 环或条，按组件选 | 读写 `hex/rgb/hsv/hsl/kelvin` | — | 多手柄做配色和声 | 文档首屏未给 † | — | — |
| **Radix Colors**（配色体系，非控件） | — | — | — | — | 12 阶，每阶绑定用途 | — | 11/12 阶保证 Lc 60 / Lc 90（APCA） | — |
| **Tailwind / shadcn / tweakcn** | 站点抓不到正文，未取证 † | | | | | | | |
| **macOS 系统取色器 / Photoshop** | Apple、Adobe 一手文档均为 JS 渲染，三次抓取全失败 † | | | | | | | |

**从对照表能直接抄的四件事**

1. 色相一律是**横向滑杆**，没人用色环做「精确微调」的主力（iro.js 把环当可选组件）。
2. 吸管是**标配**，且都做了失败/越界处理（DevTools 明说只采 sRGB 并裁到最近）。
3. 对比度是**取色面板里的常驻信息**，不是另开一个检查器（Figma、DevTools 都在面板内）。
4. 数值输入与色模切换是**面板内的一行**，不是另一个弹窗（Figma、DevTools）。

---

## 3. 证据表

| # | Claim | 来源 |
| --- | --- | --- |
| E1 | 原生 range「imprecise」，官方建议只在**精确值不重要**时使用；默认 `step=1`，值被钳制在 min/max | [MDN `<input type="range">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/range) |
| E2 | 滑动条键盘映射：←/→/↑/↓ 步进 1，Home/End 到两端，PageUp/PageDown 用更大增量；配 `role="slider"` + `aria-valuenow/min/max`，数值不直观时给 `aria-valuetext` | [W3C WAI-ARIA APG Slider Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) |
| E3 | 取色器黄金组合：色板 + 色相滑杆 + 不透明度滑杆 + 数值/色模切换 + 吸管 + 最近色/库色 + 对比度检查 | [Figma: Apply paints with the color picker](https://help.figma.com/hc/en-us/articles/360041003774-Apply-paints-with-the-color-picker) |
| E4 | 对比度阈值 4.5:1 正文 / 3:1 大字与图形 / 7:1 AAA；不达标时**点一下吸附到最近的合规色** | 同上（Figma） |
| E5 | DevTools 取色器：Shades + Color circle + 色相 + 不透明度 + Display value + 对比度 + 色板切换 + 吸管（`C`/`Esc`，仅 sRGB，越界裁切）+ 高动态范围 gamut 边界线与裁切警告 + 「Use suggested color」一键合规（WebAIM / APCA 可切） | [Chrome DevTools: Inspect and debug colors（文档源文件）](https://raw.githubusercontent.com/GoogleChrome/developer.chrome.com/main/site/en/docs/devtools/css/color/index.md) |
| E6 | HSV 同 value/saturation 扫色相时亮度极不均匀：「Yellow, magenta and cyan appear much lighter than red and blue」 | [Oklab 作者原文](https://bottosson.github.io/posts/oklab/) |
| E7 | 拖拽期与提交期应分两个回调：`onChange` 拖动中（含每次按键），`onChangeEnd` 在 mouseup/touchend/keyup —— 后者才做贵操作 | [react-colorful README](https://github.com/omgovich/react-colorful/blob/master/README.md) |
| E8 | 关闭语义的先例：**点页面任意处关闭并保留**；**Esc 关闭并恢复原值**；另有 `close()` / `close(true)` | [Coloris README](https://github.com/mdbassit/Coloris) |
| E9 | SV 面板用四向键微调是通行做法（官方 a11y 文案直接这么写） | 同上（Coloris） |
| E10 | `EyeDropper.open()` 返回 `{ sRGBHex }`，Esc 取消，可用 `AbortSignal` 中止；**非 Baseline、实验性、要求 secure context** | [MDN EyeDropper](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper) |
| E11 | UI 组件与其状态（含**滑块 thumb**）与相邻色至少 3:1；焦点指示同样要有对比 | [WCAG 2.2 SC 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) |
| E12 | 12 阶色板每阶绑定用途（1 应用底 … 12 高对比文字），9 阶最纯，11/12 阶保证 Lc 60/90 | [Radix Colors: Understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) |
| E13 | 取色器可以做到零依赖、3.1KB、带 WAI-ARIA、支持触屏与键盘 | [react-colorful README](https://github.com/omgovich/react-colorful/blob/master/README.md) |
| E14 | 仓内约束（非外部证据）：37 槽只有 8 个 bg 槽 `allowTransparent: true`；hex 只接受 `#RGB`/`#RRGGBB` | [`src/engine/map-dsh.mjs:205-243`](../src/engine/map-dsh.mjs)、[`runtime/custom-color.mjs:6-16`](../runtime/custom-color.mjs) |

---

## 4. 根因分析

### R1（P0，必复现）色相没有独立状态，灰/黑时被清零

`runtime/custom-editor.mjs:533` 每次都从 hex 反推 hsv；`runtime/custom-color.mjs:21-38` 在 `d === 0` 时 `let h = 0`、`s = 0`。复现路径：拖 SV 到底（V=0）→ 渲染 → `hexToHsv('#000000')` → `{h:0, s:0, v:0}` → 色相条回 0、SV 底板变纯红 → 再拖 SV 只能出红色系。**这是「选不到满意」最直接的一条。**
外层还有第二个精度抖动：`hsvToHex` 只对最终字节取整（`runtime/custom-color.mjs:41-62`），hex→hsv 往回反推时 h 会抖 ±1°，`value={Math.round(hsv.h)}` 被 React 回写，thumb 会在拖动 SV 时微微跳。

### R2（P0）live commit 与「点外面就回滚」互相打脸

拖动已经在改真实颜色（`:565-575`），而 `closePop(true)` 把 `colors` 还原成 `orig`（`:391-397`）。用户的心智模型是「已经改了」，实际是「点别处就白改」。Coloris 的先例相反：点外面＝保留，Esc＝回滚（E8）。

### R3（P1）色相控件表达力不够

原生 range 无渐变轨道 → 用户不知道哪个位置是哪个色相；无刻度 → 没有「红/黄/绿/青/蓝/品红」的路标；226px 行程对应 360°，约 **1.6°/px**（thumb 再吃掉十几 px，实际约 1.7°/px）；没有数字回显 → 想从 210° 挪到 205° 只能靠猜；`step=1` 的键盘微调能到 1°，但**没有可见的焦点态/刻度**，用户不会用。MDN 对 range 的定位说得很直白（E1）。

### R4（P1）HSV 色相非感知均匀

同 S/V 扫色相，黄/品红/青比红蓝亮（E6）。用户「只想换个色相」时亮度一起变，观感必然落空。这不是控件能完全消除的，但可以通过三件事缓解：① 色相轨上给出**当前 S/V 下**的真实渐变（而不是纯色相条）；② 提供「锁定 S/V，只改 H」的显式开关；③ 把 HSV 数字摆在明面上，让用户理解自己在动哪一个维度。

### R5（P1）缺精确输入与反馈闭环

没有 H/S/V 数字输入、没有步进按钮、没有吸管、没有对比度提示、hex 非法输入静默失败（`:633-646`）。用户唯一的精确通道是 hex 文本框，而它连「你输入无效」都不说。

### R6（P2）尺寸与定位把升级空间锁死

SV 只有 120px 高、弹板 250px 宽；定位用**硬编码 350** 判翻转（`:338`），左右钳制也把 `270`/`250` 写死（`:330-334`）。任何加高/加宽的设计都必须先改造这三个数，否则弹板会跑出窗口或被裁。

### R7（P2）最近色取错集合

见 §1 的「8 个背景色占满」：`.slice(0, 8)` + key 顺序 = 背景专享。用户想复用的是刚调过的品牌色。

---

## 5. 色相条 / 色相环 / 角度输入 / HSL-OKLCH 数值：任务矩阵

精度换算（供决策）：行程 W px 时，`1 px = 360/W 度`。

| 行程 | 1px 对应 | 说明 |
| --- | --- | --- |
| 226px（现状） | 1.59° | 现状 |
| 296px（方案 A） | 1.22° | 全宽 296 的色相轨 |
| 160px（竖轨） | 2.25° | 竖向摆放的代价 |

| 任务 | 色相条 | 色相环 | 直接输入角度 | HSL/OKLCH 数值 | 结论 |
| --- | --- | --- | --- | --- | --- |
| 从零选一个品牌色 | ◎ 扫一遍就知道大概区间 | ○ 更快找到色相家族，但环内圈浪费空间、直径小则精度差 | △ 得先知道要几度 | △ 门槛高 | **条** |
| **从已有主题色微调（本产品主场景）** | ◎ 起点就在当前色相上，往左/右挪一点 | ✕ 起点定位不直观 | ○ 知道目标值就最快 | ○ 改 S/V 不动 H 很顺手 | **条 + 数字 + 锁定 S/V** |
| 复刻设计稿里的某个色 | ✕ | ✕ | ✕ | ✕ | **hex 粘贴 / 吸管** |
| 把 5 个语法色统一到同一色相 | ○ | ◎ 环上一眼看到「都在这条弧上」 | ○ | ◎ 同 H 直接抄数值 | 数值（本产品不需要环） |
| 只想要「更深一点 / 更浅一点」 | ✕ | ✕ | ✕ | ○ | **明度阶（11 级）** |
| 键盘精确 ±1° | ○（需要自绘 + `role=slider`） | ✕ | ◎（数字框 ↑↓） | ◎ | **数字框 + 键盘** |

**给本产品的取舍**：色相条负责「找方向」，数字输入负责「拧准」，明度阶负责「微调深浅」，吸管/hex 负责「复刻」。色环不进入任何方案 —— 250–320px 宽的下拉弹板里，环的直径撑死 120px，绝对精度比一条 296px 的横轨更差，还多占竖向空间。

---

## 6. 方案 A（主推）：320px「精确控制版」

### 6.1 线框

```
┌────────────────────────────────────────────┐ 320px（content 296）
│ primary · 主色                     #FAB283 │ 22  ← 标题 + 当前 hex（点击复制）
├────────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐ │
│ │▼                                       │ │  ← SV 面板 296×136，三层渐变
│ │                                        │ │     手柄 14px（白环+深描边+本色芯）
│ │                                        │ │     hover/拖拽时显示十字辅助线
│ └────────────────────────────────────────┘ │
│ ▕▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▏ │ 18  ← 色相轨 296×14（13 个 30° 停）
│  0   60  120  180  240  300  360           │     刻度只在该轨 hover/focus 时出现
├────────────────────────────────────────────┤
│ H [210]±   S [ 72]±   V [ 98]±   [🔒S/V]  │ 26  ← 3 个数字框 46×26 + 锁定开关
├────────────────────────────────────────────┤
│ 本主题用过的颜色   ■ ■ ■ ■ ■ ■ ■ ■ ■ ■    │ 20  ← 10 个 20×20（见 §6.4）
├────────────────────────────────────────────┤
│ HEX [#FAB283]  [吸管]  [4.7:1 AA]         │ 28  ← 输入 150 + 吸管 30 + 对比徽章 64
├────────────────────────────────────────────┤
│ □ 透明（仅背景槽）                          │ 20
│                          [ 取消 ] [ 完成 ] │ 30
└────────────────────────────────────────────┘
合计高度 ≈ 378px（12 padding + 22 + 8 + 136 + 8 + 18 + 8 + 26 + 8 + 20 + 8 + 28 + 6 + 20 + 8 + 30 + 12）
```

### 6.2 控件清单

| # | 元素 | 尺寸 | 内容 | 交互 | 无障碍 |
| --- | --- | --- | --- | --- | --- |
| 1 | 标题行 | 22 高，12px 字 | 色位名（`tr` 取 zh/en）+ 等宽 hex | hex 点击复制（失败静默） | `aria-live="polite"` 播报新 hex |
| 2 | SV 面板 | 296×136，圆角 8 | 三层渐变（现状口径可直接复用 `:579-580`） | pointer 拖拽；方向键 ±1、Shift+方向键 ±10 | 可聚焦；`aria-label="饱和度与明度"`；`aria-describedby` 指向操作提示 |
| 3 | SV 手柄 | 14×14 | 白环 2px + `#0009` 外描边 + 本色芯 | `pointerEvents: 'none'`（命中靠面板） | 不单独聚焦 |
| 4 | 色相轨 | 296×14（含 2px 命中扩展） | 13 个 30° 停的渐变（用**当前 S/V** 生成，不是纯色相） | 点击/拖拽跳转；←→ ±1、Shift ±10、PageUp/Down ±15、Home 0、End 360 | `role="slider"` + `aria-valuemin=0` / `max=360` / `now=H` + `aria-valuetext="色相 210°"` |
| 5 | 刻度 | 6 个 1px 竖线 + 数字 9px | 0/60/…/360 | 仅 hover / `:focus-visible` 显示 | 纯装饰，`aria-hidden` |
| 6 | H/S/V 数字框 | 3 × 46×26，等宽 11px | H 0–360，S/V 0–100 | 输入提交；↑↓ ±1、Shift+↑↓ ±10；越界钳制；非法回退 | 每个 `aria-label`；`inputmode="numeric"` |
| 7 | 锁定 S/V | 24×24 图标按钮 | 开=只改 H | 拖动色相时 s/v 恒定为锁定值 | `aria-pressed` |
| 8 | 主题色条 | 10 × 20×20，gap 6（10×20+9×6=254 ≤ 296） | 见 §6.4 | 点击即应用；Enter 应用 | 每个 `button` + `title=hex` + `aria-label` |
| 9 | HEX 输入 | 150×28，等宽 12px | `#` 前缀固定，值大写 | 输入/粘贴；Enter 提交；Esc 还原；非法显红框 | `aria-invalid` + `aria-describedby` 错误文本 |
| 10 | 吸管 | 30×28 | CSS 画的图标（**不用 SVG**） | `window.EyeDropper` 可用则开；否则降级为「从预览取样」或禁用 | `aria-label`；禁用时 `title` 说明原因 |
| 11 | 对比徽章 | 64×22 | `4.7:1 AA` / `2.1:1 低` | hover 显示基准色 | `role="status"` |
| 12 | 透明行 | 20 高 | checkbox + 20×20 棋盘格 | 勾选 → 只读显示 `transparent`，SV/色相/hex 置灰 | `aria-disabled` 检查组 |
| 13 | 取消 / 完成 | 30 高 | `tr('edCancel')` / `tr('edDone')` | 取消 = 回滚 `orig` 并关闭；完成 = 关闭并保留 | 焦点顺序收尾 |

### 6.3 关键交互

- **拖拽**：`pointerdown` 时 `setPointerCapture(ev.pointerId)`，`pointermove` 只更新内部状态（rAF 节流，一帧一次），`pointerup`/`pointercancel` 释放。**不要**再往 `document` 上挂 `mousemove`（现状 `:546-578` 的写法在指针移出窗口时收不到 `mouseup`，会留下监听器）。
- **提交语义**（对齐 Coloris，E8）：拖动期间 **live commit**（预览要动）；**点弹窗外 = 保留并关闭**；**Esc / 取消 = 回滚**；完成 = 保留。这一条同时解决 R2。
- **色相拖动的维度约束**：拖色相**只改 h**，s/v 原样保留；即使 `v===0` 或 `s===0` 也照改 h（反正 hex 不变），一旦用户把 V 拉起来，色相立刻生效。这就是 R1 的根治。
- **键盘**（对齐 APG，E2）：色相轨 `role=slider`；SV 面板用四向键（民间通行做法，E9）；数字框用原生 `type="text" inputmode="numeric"` + 自己处理 ↑↓（避免原生 number 的滚轮误触）。
- **粘贴 hex**：`onPaste` 里先 `trim`、去掉全角 `＃`、去空格、允许缺 `#`；`#RGB` 展开；`#RRGGBBAA` 取前 6 位并提示「已忽略透明度」。
- **吸管**：`if (!window.EyeDropper) → 禁用`；`open()` 返回 `sRGBHex` 后转大写写回。`catch` 里吞掉 `AbortError`（用户按 Esc）。因为要求 secure context（E10），必须有一键降级路径：见 §7.3 的「从预览取样」。
- **对比度**：按色位映射一个基准槽（`text`/`textMuted` → `background`；`brand`/`md`/`syn`/`diff`/`border` → `backgroundPanel`；bg 槽 → 反过来对 `text`），算 WCAG 对比度显示徽章。低于 3:1 用 `TK.dangerText` 上色（不可达时也不报错，只显示数字）。
- **焦点陷阱**：Tab 在弹板内循环，Esc 关闭；打开时把焦点放到色相轨（用户最可能先动的控件）。

### 6.4 「本主题用过的颜色」怎么修

- 取 **10** 个而不是 8：先按 `distinctThemeColors(colors)`，**跳过当前槽自身的现值**，再按「分组优先级」排序（brand → md → syn → diff → text → border → bg），这样不会再被 8 个背景色占满（R7）。
- 另加一个 6 格「本次会话最近取用」环形缓冲（组件内 state 即可，不落盘），第 7 格起溢出。
- 色块 20×20（现状 24×18 偏扁），`title=hex`，`data-palette-interactive="swatch"`。

### 6.5 与现状的差异清单（改哪些行）

| 位置 | 现在 | 改成 |
| --- | --- | --- |
| `runtime/custom-editor.mjs:528-678` | 单个 `renderPop()` | 拆成 `PalettePicker`（纯展示，可导出）+ 状态容器 |
| `:533` | `const hsv = hexToHsv(pop.hex)` | `pick.h/s/v` 状态；hex 为派生值 |
| `:378-397` | `openPop`/`closePop(revert)` | 增加 `applyPick` / `cancelPick`；外面点击不再 revert |
| `:292-317` | 外面 mousedown → `closePop(true)` | 同上（保留并关闭） |
| `:321-341` | 硬编码 350 / 270 / 250 | 提到 `POP_W` / `POP_H` 常量（A：320 / 378） |
| `:608-618` | 原生 range | 自绘色相轨 div + `role=slider` |
| `:633-646` | 静默失败 | 错误态 + 保留草稿 |
| `runtime/client.mjs:190-193` | 4 个 i18n key | 补 §8.8 的 key |

---

## 7. 方案 B（备选）：250px「紧凑微调版」

适用：不想动定位常量、想先小步上线、或窗口高度紧张。

```
┌──────────────────────────────────┐ 250px（content 226）
│ primary · 主色         #FAB283   │ 20
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │                              │ │  SV 226×110
│ └──────────────────────────────┘ │
│ ▕▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▏ │ 16  色相轨 226×12
├──────────────────────────────────┤
│ 深浅  ▮▮▮▮▮▮▮▮▮▮▮                │ 30  11 级明度阶 16×16（当前 h/s 固定，v 递增）
├──────────────────────────────────┤
│ HEX [#FAB283]        [吸管]      │ 26
├──────────────────────────────────┤
│ □ 透明              [取消][完成]  │ 26
└──────────────────────────────────┘
合计高度 ≈ 286px < 现有 350 常量 → 定位代码可以一行不改
```

取舍：省掉 H/S/V 数字输入与对比度徽章（精确输入的诉求让位于空间）；新增的 11 级明度阶（v 从 5% 到 100% 等比，参考 Radix 的 12 阶思路，E12）专门解决「从已有主题色微调深浅」这个主场景；色相轨仍是自绘（R3 必须修），只是行程 226px（1.59°/px），靠键盘 ±1° 与 Shift ±10° 补精度。

如果只能选一个：**选 A**。B 的命中率提升主要来自 R1/R2 的修复，而这两条在 A 里同样修；A 多出来的数字输入与对比度是「可学习、可复现」的部分，长期收益更高。B 的价值是「一周内能上、不碰定位」。

---

## 8. 零依赖实现要点

### 8.1 状态模型（最重要的 20 行）

```js
// 状态：{ key, h, s, v, mode: 'solid' | 'transparent', orig }
// hex 永远是派生值，不回写状态。
const hex = hsvToHex({ h: pick.h, s: pick.s, v: pick.v })

// 从外部 hex 回填时保留「无意义的维度」（放 runtime/custom-color.mjs，纯函数）
export function mergeHsv(prev, next) {
  const h = next.v === 0 || next.s === 0 ? prev.h : next.h
  const s = next.v === 0 ? prev.s : next.s
  return { h: h, s: s, v: next.v }
}
```

- `v===0`（黑）：h 与 s 都无意义 → 都保留；
- `s===0`（灰）：h 无意义 → 保留 h；
- 其余：全部采用新值。
这条替代了现状「每次 render 从 hex 反推」，同时消掉 R1 的回弹与 ±1° 抖动。

### 8.2 拖拽：Pointer Events + `setPointerCapture`

```js
function onDown(ev) {
  if (ev.button !== 0) return
  ev.currentTarget.setPointerCapture(ev.pointerId)
  dragId.current = ev.pointerId
  applyFromEvent(ev)
}
function onMove(ev) {
  if (dragId.current !== ev.pointerId) return
  schedule(ev)               // rAF 合并，一帧一次 setState
}
function onUp(ev) {
  if (dragId.current !== ev.pointerId) return
  dragId.current = null
  ev.currentTarget.releasePointerCapture(ev.pointerId)
}
```

配套内联样式：`touchAction: 'none'`、`userSelect: 'none'`、`WebkitUserDrag: 'none'`。React 的 `onPointerDown`/`onPointerMove`/`onPointerUp`/`onPointerCancel` 直接挂即可（现状已经在用 `onMouseDown`，换成 pointer 不改变组件形态）。

### 8.3 键盘与 ARIA（对齐 E2 / E9 / E11）

| 控件 | 键 | 行为 |
| --- | --- | --- |
| 色相轨 | ←/→/↑/↓ | ±1° |
| 色相轨 | Shift + 方向键 | ±10° |
| 色相轨 | PageUp / PageDown | ±15° |
| 色相轨 | Home / End | 0° / 360° |
| SV 面板 | 方向键 | s 或 v ±1 |
| SV 面板 | Shift + 方向键 | ±10 |
| 弹板 | Esc | 回滚并关闭 |
| 弹板 | Enter | 完成 |
| 弹板 | Tab / Shift+Tab | 板内循环 |

- 色相轨：`role="slider"` + `tabIndex=0` + `aria-valuemin/max/now/valuetext`。
- SV 面板：`role="group"` + `tabIndex=0` + `aria-label`（2D 没有标准 role，别硬编一个 `slider`）；每次改动用板内 `aria-live="polite"` 播报 hex。
- 焦点环：靠 `data-palette-interactive="input"`，已有样式会画 `--dsw-alias-brand-primary` 外环（`runtime/ui-fx.mjs:69-73`），满足 E11 的 3:1 要求。

### 8.4 数值输入

三个 `input` 用**文本**而非 `type="number"`：number 的滚轮会误改值、且不同 webview 的 spinner 样式不一致。自己处理：允许 0–9、Enter/blur 提交、越界钳制、非法回退到上一个合法值、↑↓ ±1、Shift+↑↓ ±10（`preventDefault` 掉滚动）。

### 8.5 吸管与「从预览取样」

```js
async function pickFromScreen() {
  if (typeof window === 'undefined' || !window.EyeDropper) return false
  try {
    const r = await new window.EyeDropper().open()
    return normalizeHexInput(String(r.sRGBHex || '').toUpperCase())
  } catch (err) { return false } // AbortError：用户按了 Esc
}
```

降级路径（无 `EyeDropper` 时，也能满足「吸预览色」）：进入取样模式后挂一个覆盖预览列的透明层（`position:'fixed'`，**`zIndex` 不要用 60**，否则会撞 `tests/custom-editor.test.mjs:580` 的计数），`pointermove` 里 `document.elementFromPoint(x, y)` 找到 `[data-slot]` 元素，读 `getComputedStyle(el).backgroundColor`，把 `rgb()/rgba()` 转 hex；`rgba(...,0)` 直接跳过（透明）。需要一个新纯函数 `rgbToHex('rgb(250, 178, 131)') → '#FAB283'`。

### 8.6 对比度

```js
const lin = (c) => (c /= 255) <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
const L = (hex) => 0.2126 * lin(r(hex)) + 0.7152 * lin(g(hex)) + 0.0722 * lin(b(hex))
const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
```

显示规则：`≥4.5` → `AA`；`≥3` → `AA 大字/图形`；否则 `低`。基准槽映射放纯函数 `contrastRefSlot(slotKey)`（见 §6.3），方便单测。**不做** Figma 式的「一键吸附到最近合规色」—— 那需要迭代求解且容易把用户想要的色相也改掉；这一版只做提示。

### 8.7 定位与翻转

- 把 `350` / `270` / `250` 换成 `POP_H = 378` / `POP_W = 320`（A）或 `POP_H = 286` / `POP_W = 250`（B），定位代码只引用常量（`runtime/custom-editor.mjs:321-341`）。
- 保留「没有坐标就不渲染」的不变式：`if (!pop || !popPos) return null`（`tests/custom-editor.test.mjs:805-809` 正盯着它）。
- 视口比 `POP_H + 16` 还矮时：`maxHeight: vh - 24` + 内部 `overflowY: 'auto'`，不要硬翻到上方导致跑出屏幕。
- 视口宽度不足时左对齐并钳到 8px；不要再用 `vw - 270` 这种魔数。

### 8.8 i18n key 清单（补在 `runtime/client.mjs:190-193` 附近）

| key | zh | en |
| --- | --- | --- |
| `edCancel` | 取消 | Cancel |
| `edDone` | 完成 | Done |
| `edHue` | 色相 | Hue |
| `edSat` | 饱和 | Saturation |
| `edVal` | 明度 | Brightness |
| `edHex` | 十六进制 | Hex |
| `edEyedropper` | 吸管取色 | Pick from screen |
| `edEyedropperOff` | 当前环境不支持吸管 | Eyedropper unavailable |
| `edContrast` | 对比度 | Contrast |
| `edContrastLow` | 对比不足 | Low contrast |
| `edInvalidHex` | 请输入 #RGB 或 #RRGGBB | Enter #RGB or #RRGGBB |
| `edAlphaDropped` | 已忽略透明度 | Alpha ignored |
| `edLockHue` | 锁定明暗，只调色相 | Lock brightness |
| `edRecent` | 最近使用 | Recent |
| `edShades` | 深浅 | Shades |
| `edSamplePreview` | 从预览取色 | Sample from preview |
| `edHueAria`（带参） | 色相 {v} 度 | Hue {v} degrees |
| `edSvHint` | 方向键微调，Shift 加速 | Arrow keys to adjust, Shift for larger steps |

组件侧沿用 `tr('key')`；带参句用现有 `trf` + `segJoin` 口径，英文词间补空格。

### 8.9 测试接缝（后续 pin 就靠这几条）

1. **纯函数直测**（`runtime/custom-color.mjs`，现有测试已经直接 import 它）：`mergeHsv`、`hueStops(s,v)`（返回 13 个 hex）、`relativeLuminance`、`contrastRatio`、`rgbToHex`、`contrastRefSlot`、`pickRecentColors(colors, currentKey)`（顺带把 R7 钉死）。
2. **可单独渲染的展示组件**：从 `runtime/custom-editor.mjs` 导出 `PalettePicker`，props `{ h, tr, lang, slotMeta, value, onChange }`。`runtime/custom-editor.mjs:4-5` 只 import `./custom-color.mjs` 与 `./ui-fx.mjs`（两者零依赖），所以测试可以**直接** `import { PalettePicker } from '../runtime/custom-editor.mjs'`，再用 `react-dom/server` 的 `renderToString`（和现有 `tests/custom-editor.test.mjs:211-262` 同一套办法），不必再绕 `package/lib/client.js` 构建产物 —— 弹板只在交互后出现，走构建产物那条路根本渲染不出来。
3. **源码文本 pin**：给每个部件打 `data-picker-part="sv|hue|hsv|recent|hex|eyedropper|contrast|transparent|footer"`，学 `'data-slot':` 的计数纪律（`tests/custom-editor.test.mjs:650-651`、`:717-720`），新增裸部件就打破计数、逼作者接线。
4. **既有门禁的连带影响**（改之前先看这几条）：
   - `tests/custom-editor.test.mjs:588` pin 了标题样式串 `"fontSize: '12px', margin: '0 0 8px'"`；
   - `:580` pin 了 `position: 'fixed', zIndex: 60` **恰好 2 处**；
   - `:299` 全局禁 `<circle>`（别用 SVG；手柄/刻度/吸管图标全部用 CSS 画）；
   - `:541-555` 行内 `cursor:pointer` 的可点控件必须挂 `data-palette-interactive`，色块走 `swatch`、按钮走 `button`；
   - `:805-809` 保留 `if (!pop || !popPos) return null` 且禁止 `popPos ||` 兜底。
5. **行为可测化**：把「点外面=保留、Esc=回滚」写成纯 reducer（`applyPick`/`cancelPick`），不用真 DOM 就能断言。

### 8.10 性能与动效

- 拖动用 rAF 合并（现状每个 `mousemove` 都 `setColor`，会带着 37 色表与微缩预览一起重渲染）。
- `distinctThemeColors(colors)` 只在 `colors` 变时算（`h.useMemo`，现有组件已经在用 `h.useMemo`）。
- 手柄位移**不要**加 CSS transition；`runtime/ui-fx.mjs:80-84` 的 reduced-motion 规则已经会把 `transform`/`box-shadow`/`filter` 全部降级，新控件只要挂 `data-palette-interactive` 就自动跟随。

---

## 9. 错误与边界处理

| 场景 | 触发 | 期望行为 | 文案 key |
| --- | --- | --- | --- |
| 8 个 bg 槽勾透明 | 用户勾选 | 写 `'transparent'`；SV/色相/hex 置灰为只读；显示棋盘格 | `edTransparent` |
| 29 个非 bg 槽 | reducer 兜底 | 不显示透明行；即便传入也回落 `effectiveSlotColor` | — |
| 勾透明后在 hex 框输入 | 混合状态 | 自动取消透明并提交 hex（修现状错位，见 §1） | — |
| 黑/灰导致 h 丢失 | 拖 V 到 0 或 S 到 0 | `mergeHsv` 保留 h/s；色相轨位置不动 | — |
| 非法 hex | `12` / `#GGG` / `#1234` | 红框 + 行内错误；**不提交**；保留草稿；Enter 再试 | `edInvalidHex` |
| 8 位 hex | `#FAB283FF` | 取前 6 位提交 + 提示忽略透明度 | `edAlphaDropped` |
| 3 位 / 缺 `#` | `fab` / `FAB283` | 归一化为 `#FFAABB` / `#FAB283` | — |
| 全角 `＃` / 空格 | 粘贴 | 归一化后再校验 | — |
| 数字越界 | H=400 / S=-3 | 钳到 0–360 / 0–100 | — |
| 数字非法 | 空 / `abc` | 回退上一个合法值，不提交 | — |
| 对比度过低 | < 3:1 | 徽章变警示色 + 显示真实比值；**不阻断提交** | `edContrastLow` |
| 吸管不可用 | 无 `window.EyeDropper` 或非 secure context | 按钮禁用 + `title` 说明；降级「从预览取色」 | `edEyedropperOff` |
| 吸管中断 | 用户按 Esc | 吞掉 `AbortError`，保持原色 | — |
| 吸到透明像素 | `rgba(...,0)` | 跳过，不把 `transparent` 写进非 bg 槽 | — |
| 视口太矮 | `vh < POP_H + 16` | 翻到上方；仍放不下则 `maxHeight` + 内部滚动 | — |
| 视口太窄 | `vw < POP_W + 16` | 左对齐 + 8px 钳制 | — |
| 贴预览列 | 窄窗口 | 按 `pv.left - POP_W - 8` 钳制（现状 `:334` 的 250 换成常量） | — |
| reduced-motion | 系统设置 | 无过渡、无位移（`runtime/ui-fx.mjs:81-82` 已覆盖） | — |
| Tab 出界 | 键盘导航 | 焦点陷阱，循环在弹板内 | — |
| 点弹板外面 | 鼠标 | **保留修改并关闭**（不再回滚） | — |
| Esc | 键盘 | 回滚到 `orig` | — |
| 切换色位 | 点别的色块 | 保留上一槽的修改（配合「点外面=保留」自然成立） | — |

---

## 10. 验收清单

**功能**

- [ ] 拖 SV 到纯黑后再拖回来，色相条位置与 SVG 底板底色**不变**（R1 回归）
- [ ] 色相同一位置下，把 V 从 100 拖到 0 再回 100，hex 与最初一致
- [ ] 调好颜色后点弹板外，37 色里的该槽**保持新值**；按 Esc 则回到打开前的值
- [ ] 色相轨可直接点击跳转；拖动时 thumb 跟手，无 ±1° 抖动
- [ ] H/S/V 数字框输入、↑↓ 步进、越界钳制、非法回退都正确
- [ ] hex 粘贴 `#abc` / `abc` / `＃AABBCC` / `#AABBCCDD` 四种都能得到预期值
- [ ] 8 个 bg 槽可勾透明；29 个非 bg 槽看不到透明行
- [ ] 「本主题用过的颜色」里能看到品牌色/语法色，不再被 8 个背景色占满
- [ ] 吸管可用时能取到屏幕色；不可用时按钮禁用且有说明

**结构 / 测试**

- [ ] 新纯函数在 `runtime/custom-color.mjs`，且被测试直接 import 覆盖
- [ ] 弹板结构可由 `PalettePicker` 单独 `renderToString` 出 HTML（不依赖交互）
- [ ] `data-picker-part` 计数与部件数一致；每个可点元素都有 `data-palette-interactive`
- [ ] 全仓无 `<circle>`；弹板内无 SVG
- [ ] `position: 'fixed', zIndex: 60` 仍恰好 2 处；`if (!pop || !popPos) return null` 仍在
- [ ] 定位只引用 `POP_W`/`POP_H`，无 250/270/350 魔数
- [ ] 标题样式串若改动，同步更新 `tests/custom-editor.test.mjs:588`

**无障碍 / 双语**

- [ ] 色相轨 `role="slider"` + 完整 aria 属性 + `aria-valuetext` 带度数
- [ ] 全部键盘路径可用（Tab / 方向键 / Home / End / PageUp / PageDown / Enter / Esc）
- [ ] 焦点环可见（3:1，E11）
- [ ] 中英文都无缺字、无中文残留（英文界面）
- [ ] reduced-motion 下无过渡

**视觉 / 尺寸**

- [ ] 320px 弹板在 1280×720 窗口里贴底时向上翻转，不跑出视口
- [ ] 高度 378（A）实测与常量误差 ≤ 8px
- [ ] 手柄在四角不被裁切
- [ ] 色相轨在深色主题下仍能看出 6 个色相区间

---

## 11. 未验证事项

1. **macOS 系统取色器**：Apple HIG 与支持文档均为 JS 渲染，三次抓取只拿到标题或 404（见 §12），本报告没有把它写进证据表。若要补：需要在真实 macOS 上截图取证，或找到可抓取的 Apple 归档 PDF。
2. **Photoshop 取色器**：Adobe 一手帮助页未取到，未写进证据表。
3. **Chrome DevTools 的尺寸/视觉细节**（面板宽高、Shades 区比例、对比度段的折叠形态）：只取到功能清单（E5），没有截图级证据。
4. **Tailwind 色阶、shadcn/ui、tweakcn 的主题编辑器**：站点把正文放在长导航之后，抓取被截断，未取证。
5. **原话里的「进度条」具体指哪个控件**：按截图描述与代码推断为色相条（`<input type="range">`），若实际指 SV 手柄，R1/R4 的措辞需要微调，但修复方向不变。
6. **DSH 真实窗口里的可用高度**：`POP_H = 378` 是纸面估算，需要在桌面端实测一次；若窗口高度 < 420，建议先上方案 B。
7. **`window.EyeDropper` 在 DSH webview 里是否可用**：取决于页面是否算 secure context，必须在真机里 `console.log(!!window.EyeDropper)` 验证；报告按「可能不可用」设计降级。

---

## 12. 研究方法注记

- 时间：2026-10-17。调研期间**没有**运行 `npm build` / `npm test`，没有改任何代码/测试/配置，也没有建分支或提交（`git status --porcelain` 全程为空）。
- 证据优先取一手页面原文；对 MDN / Figma / W3C / Radix 均直接抓取并逐条摘句，未把搜索摘要当证据。
- 抓取失败的站点与替代方案：`developer.chrome.com` 会按地理语言返回（拿到波兰语/泰语版）且正文在长导航之后被截断 → 改抓 GitHub 上的**文档源文件** `site/en/docs/devtools/css/color/index.md`，拿到完整英文原文；Apple 三处页面（HIG `color-wells`、归档 `AboutColorPanels.html`、`support.apple.com` 的 mac-help 指南）分别返回「只有标题」「404」「unsupported content type」，故 macOS 相关结论整体降级为未验证。
- 仓内事实全部来自实际读文件，行号以调研时的工作区为准：`runtime/custom-editor.mjs`、`runtime/custom-color.mjs`、`runtime/ui-fx.mjs`、`runtime/client.mjs:190-193`、`src/engine/map-dsh.mjs:193-243`、`tests/custom-editor.test.mjs`。
- 报告中的尺寸（296/136/378/286 等）是按现有内联样式口径推算的**实施建议值**，不是任何产品实测值；精度换算（1.22°/px、1.59°/px）按 `360 / 行程宽度` 直接计算。
