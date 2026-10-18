# TS 化迁移面研究：测试与验证链（issue #106）

- 研究票：GitHub issue #106（wayfinder 地图 #104 的研究子票）
- 仓库：`D:\dsh-plugin\dsh-opencode-palette`，HEAD `dbcc93a`（2.1.3 发布提交）+ 未提交 WIP
- 环境：Windows / PowerShell，Node `v24.19.0`，npm test 基线 266 用例 / 9253 ms
- 调研日期：2026-10-18
- 结论先行：测试里 **286 条**断言直接读「源码文本 / 产物文本」。其中真正会被 TS 化打断的只有 **19 条**（锚定声明语法），**244 条**只需改读取路径，**23 条**应删除或合并。最大的风险不是断言报错，而是**假绿**（读的是已提交的旧产物，迁移后不重建也全绿）。

---

## 1. 问题

本仓准备把 `src/`、`runtime/`、`scripts/`、`tests/` 从 `.mjs` 整体迁到 TypeScript。测试套件是这次迁移唯一的安全网，但它自身大量依赖**文本**而不是行为：`fs.readFileSync('runtime/client.mjs')` 后 `assert.ok(src.includes("…"))`，或先 `npm run build` 再把 `package/lib/client.js` 当字符串检查。源码一改扩展名、一加类型注解，这些断言要么直接报 `ENOENT` / 断言失败，要么在**旧的已提交产物**上继续通过（假绿），失去安全网作用。

本票要回答五个问题：

1. `tests/` 14 个文件、266 个用例里，所有依赖源码/产物文本的断言逐条是什么？迁到 TS 后各自怎么失效？哪些必须改口径、哪些可保留、哪些应删除或合并？
2. 验证链事实：`npm test` 到底执行什么、各文件耗时、哪些测试前置依赖 `npm run build` 的产物、测试之间有没有共享状态、`npm test` 与裸 `node --test` 有何差异、`tests/release-scripts.test.mjs` 守的 BOM 门禁细节。
3. Node 类型剥离（type stripping）的版本边界与限制（以 Node 官方文档为一手来源）：`--experimental-strip-types` 从哪个版本开始、哪个版本默认开启、有什么限制；与本仓 `engines.node >= 22` 是否一致；测试若要直接跑 `.ts`，最低要 bump 到哪个版本或用哪个 flag；`tsc --noEmit` 该挂在 `npm run build` 前还是 `npm test` 前。
4. 发布门禁的连带影响：`scripts/*.ps1` 的 UTF-8 BOM 测试、`scripts/check-deps.mjs` 硬门禁、`package/` 产物形状断言、README 相关测试，哪些被 TS 化牵动、哪些不受影响。
5. 迁移后的测试策略选项（2–3 个）与风险，以及验证链层面「迁移完成」的可判定标准。

---

## 2. 方法与证据边界

### 2.1 只读约束下的做法

全程只读，除本文件外没有修改或新建仓库内任何文件；没有执行 `npm run build`、`npm install`、`npm pack`、`git add/commit/push`。实际执行过的命令：

| 类别 | 命令 | 用途 |
| --- | --- | --- |
| 状态 | `git status --short`、`node --version`、`git ls-files package`、`git ls-files tests` | 确认工作树、Node 版本、产物是否入库 |
| 全量测试 | `npm test` | 基线用例数与总耗时 |
| 单文件测试 | `node --test --test-reporter=tap tests/<file>.test.mjs` ×14 | 逐文件耗时、用例数、隔离性验证 |
| 文本断言扫描 | 临时 Node 脚本（`%TEMP%`，用后删除）逐行匹配 `assert.*` 首参为读取变量的 `.includes` / `.match` / `.indexOf` / `.startsWith` / `.endsWith`（含取反） | 得到 285 条命中及行号 |
| 行级取证 | `Get-Content` 按行号打印断言原文 | 逐条确认断言意图（本报告表格里的中文意图均取自断言自带的 message） |
| 引用面计数 | `Select-String -Path tests\*.mjs -Pattern '\.mjs'` 等 | 统计迁移必改的字面引用数 |
| Node 行为探针 | 在 `%TEMP%\tsprobe-*` 建临时 `.ts` 文件跑 `node` | 验证类型剥离、扩展名、`.tsx`、`--test` 发现规则；探针目录已删除，仓库无残留 |

写盘面逐文件自查了测试源码里的 `writeFileSync` / `mkdtempSync` / `cpSync` 目标：全部落在 `os.tmpdir()`，并在 `finally` 里 `rmSync`。因此跑单个测试文件不会写仓库（`tests/update-panel.test.mjs:268,290-294`、`tests/custom-themes-storage.test.mjs:78,85-89,174-182`、`tests/sync-verify.test.mjs:23,100`、`tests/log-switch.test.mjs:143,177,188` 是全部写盘点）。

### 2.2 断言扫描口径

命中条件：断言语句的第一个实参是「由 `readFileSync` / `read()` / `import` 得来的变量」，且对该变量做子串/正则/计数判断。这会把两类东西排除在外：对**渲染结果**（`html`、`seg`、`menu`、`item`、`scroller`）的断言，以及对**临时文件**（`raw`）的断言——它们不是仓库里的源码/产物文本，不算本次迁移面。

扫描得 285 条；剔除 11 条误报（`tests/engine.test.mjs:494-498` 的 `code` 是 `codeFontStack` 计算值而非文件文本，`tests/panel-render.test.mjs:431,432,486-489` 的 `seg` 是渲染出的 HTML 片段）；再补扫描漏计的 12 条（`tests/engine.test.mjs:291,293,294,296` 用 `assert.equal` / `deepEqual` 比较词表，`tests/group-boundary.test.mjs:93-99` 经 `zhOf()` helper 间接读 `runtime/client.mjs`）。**最终 286 条**，与逐文件表（§3.9）的合计一致。

### 2.3 证据边界

- **不能跑 `npm run build`**（会覆盖工作树里 WIP 的 `client.js`、`package/lib/client.js`）。因此「TS 源码经构建后产物长什么样」只能静态推断，无法实测；这直接影响 §6 的选项取舍。
- **`typescript` 未安装**（`devDependencies` 只有 `dsh-log` / `react` / `react-dom`），`tsc --noEmit` 的耗时、报错形态、`tsconfig` 具体配置均未实测。
- 本机只有 **Node v24.19.0**。22.18.0 的行为引自官方文档，未在 22.x 上执行。
- 行号基于当前**脏工作树**（`tests/engine.test.mjs` 等 10 个文件已改）。WIP 落地方式不同则行号可能漂移，语义不变。
- 单文件耗时是「单独起进程跑」的数字，含进程启动；它们**不能相加**得总耗时（原因见 §4.3）。

---

## 3. 源码/产物文本断言清单

### 3.1 分类判据

| 分类 | 判据 | 迁移动作 |
| --- | --- | --- |
| **A 必须改口径** | 断言子串包含**声明语法**：`const X = 1`、`function f(a, b)`、`from './x.mjs'`、`for (const k of …)`。TS 只要加一个类型注解、改一次说明符，子串就不再逐字命中 | 改成只 pin 数据字面量（如 `POP_W` 的**用途**与**值**分开断言），或改成执行级断言 |
| **B 可保留** | 断言的是字面量、调用点、对象属性、数据串、文档散文、`.ps1` 文本 | 只改读取路径（`.mjs` → `.ts`）；断言文本不动 |
| **C 应删除/合并** | 用「源码 grep」代替「执行验证」的代理断言：数 `data-slot` 出现次数、pin 某段代码片段、查档位名是否出现 | 升级为 SSR / DOM 执行级断言，或与同文件其它断言合并去重 |

两条贯穿全文的事实，决定了为什么 A 只有 19 条：

1. **读文本不需要类型剥离**。`fs.readFileSync('runtime/custom-editor.ts', 'utf8')` 只读字节，任何 Node 版本都能跑；只有 `import './x.ts'` 才触发 Node 的类型剥离。所以「测试断言读 `.ts`」本身不构成 Node 版本要求。
2. **当前构建是文本内联，不是压缩打包**。`scripts/build-client.mjs` 用正则把 `runtime/*.mjs` 按 `import`/`export` 行内联进 `package/lib/client.js`，不做压缩、不改名（`JS_IMPORT_RE` / `EXPORT_RE` 见 `scripts/build-client.mjs:129,131`）。只要构建改成「先剥类型产出 JS、再内联」，产物里的字面量、标识符、调用点基本不变——所以读产物的约 44 条断言大多可保留。

### 3.2 `tests/engine.test.mjs`（60 用例，4 条）

| 文件:行 | 断言意图 | 读取对象 | 迁移后失效方式 | 分类 |
| --- | --- | --- | --- | --- |
| engine.test.mjs:285→291 | 词表主题行应为 38 行（改表必须同步代码两表） | `docs/i18n-glossary.md` | 文档不迁 TS，路径不变 | B |
| engine.test.mjs:293 | `THEME_EN[key]` 与词表 en 列逐键相等（×38） | 同上 + `src/engine/*` | `THEME_EN` 改 `.ts` 后按**值**断言，不受类型影响 | B |
| engine.test.mjs:294 | `THEME_ZH[key]` 与词表中文终稿逐键相等（×38） | 同上 | 同上 | B |
| engine.test.mjs:296 | 词表主题键集 = `themeNames()` 注册表 | 同上 | 同上 | B |

注：扫描命中的 `engine.test.mjs:494-498` 是 `codeFontStack` 的计算值断言，**不是**文件文本，属误报。

### 3.3 `tests/custom-editor.test.mjs`（58 用例，130 条）

读取点：`package/lib/client.js`（:219，执行级加载，非文本断言）、`docs/i18n-glossary.md`（:389/:408）、`runtime/client.mjs`（:396/:409）、`runtime/custom-editor.mjs`（:569,:591,:613,:641,:686,:697,:722,:754,:774,:803,:833,:846,:987,:1192）、`src/engine/map-dsh.mjs`（:814）。其中 `cseg` / `oseg` 是同一份 `runtime/custom-editor.mjs` 文本的切片，仍属源码文本。

| 文件:行 | 断言意图 | 读取对象 | 迁移后失效方式 | 分类 |
| --- | --- | --- | --- | --- |
| :402,403 | 词表 38 行的中/英终稿逐条进代码 I18N（×38） | custom-editor | 字面量仍命中；只改路径 | B |
| :428 | I18N 键的 `{ zh: '…', en: '…' }` 对象字面量逐个在场 | custom-editor | 属性写法不因 TS 变；`as const` 也不破坏子串 | B |
| :429 | 词表 md 含反引号键名 | glossary.md | 无 | B |
| :432 | `edSvHint` 键在场 | custom-editor | 无 | B |
| :571 | 5 条「弹窗源码不得直连换肤」的 ban 词（×5） | custom-editor | 无 | B |
| :592 | `UI_INTERACTIVE_ATTR` 常量在场 | custom-editor | 标识符保留 | C（代理断言） |
| :594 | `TIER_CHIP` 常量在场 | custom-editor | 同上 | C |
| :596 | 三个档位名逐个在场（×3） | custom-editor | 有档位表执行级入口可替代 | C |
| :614 | 基底下拉 `maxWidth: '230px'`（编辑态才渲染，故走源码） | custom-editor | 字面量保留 | B |
| :615 | `position: 'fixed', zIndex: 60` 出现 2 次 | custom-editor | 计数型，执行级可验 | C |
| :618 | 预置弹窗视口坐标公式 `vw - W - 20` / `vh - 430` | custom-editor | 表达式文本；TS 不改 | B |
| :619 | `popoverPosition(ar, bounds, { width: POP_W, height: POP_H }, pop.preferSide)` 调用点 | custom-editor | 调用点不变 | B |
| :621,622 | 选中描边/对勾走 `TK.accent` 的表达式 | custom-editor | 无 | B |
| :623 | 行悬停底/边走宿主 token，兜底 `#1A1A20` / `#2A2A31` | custom-editor | 无 | B |
| :624,625 | 预置搜索含中文名；开调色板收起预置弹窗 | custom-editor | 无 | B |
| :626 | 标题 `fontSize: '12px', margin: '0 0 8px'` | custom-editor | 无 | B |
| :644 | 不再含 `safe center`（负断言） | custom-editor | 无 | B |
| :649 | 主体 `height: '564px', flex: '0 1 auto'` | custom-editor | 无 | B |
| :687 | `Object.assign({ key, 'data-slot', className, style }, bindSlot(slot))` 整句 | custom-editor | 若 TS 折行/加泛型会断（低风险） | B |
| :688 | `const clickableSpanStyle = function (slot, base)` | custom-editor | 形参加类型即断 | **A** |
| :689 | `clickableSpanStyle(` 引用计数 = 4 | custom-editor | 计数型 | C |
| :690 | 代码块 token span 吃圈 | custom-editor | 字面量 | B |
| :691 | `textMuted` 两处计数（×2） | custom-editor | 计数型 | C |
| :693 | `'data-slot':` 落点计数 = 5 | custom-editor | 计数型 | C |
| :698 | `position: 'fixed', zIndex: 9999` 覆盖层 | custom-editor | 无 | B |
| :699 | 节点内小标签 `top: '-9px', right: '-6px'` 已移除（负） | custom-editor | 无 | B |
| :700,701 | 锚点取「第一个命中元素」的两条 `querySelector` 串 | custom-editor | 无 | B |
| :703,704 | `const small = r.width < bw + 12`；`if (top < 28) top = r.top + 4` | custom-editor | 703 若显式标 `: boolean` 即断（保守记 B）；704 表达式 | B |
| :705,706 | `if (top < dr.top + 4) …`；`left + bw > vw - 4` 夹紧 | custom-editor | 无 | B |
| :723-726 | 标签挂点与夹紧位移的 4 条表达式 | custom-editor | 无 | B |
| :755 | `function revealRow(key)` + `revealRow(slot)` 调用 | custom-editor | 形参加类型即断 | **A** |
| :756 | `row.scrollIntoView({ block: 'center', behavior: 'smooth' })` | custom-editor | 无 | B |
| :757,758 | 负断言 `block: 'nearest'`；`ref: leftColRef, className: 'dspe-dlg-left'` | custom-editor | 无 | B |
| :761,762 | `bindSlot(` / `'data-slot':` 计数 = 5 | custom-editor | 计数型 | C |
| :775-778 | `const NAME_INPUT_W = 200`、`NAME_ZONE_W = 322`、`NAME_INPUT_MIN = 90`、`NAME_CAP_MAX = …` | custom-editor | 显式 `: number` 即断（即便不加，pin 声明本身脆弱） | **A** |
| :780-785 | 名字区 width/min/max、包裹盒 flex、胶囊封顶/省略号 5 条样式串 | custom-editor | 无 | B |
| :786,787 | 负断言旧「输入框钉死 200」与旧自动宽度写法 | custom-editor | 无 | B |
| :790,791 | 负断言 `inp.style.width =` / `dlg.style.width =`（不再 JS 量字） | custom-editor | 无 | B |
| :792,793 | `sel.style.width = sw + 'px'`；`mw = Math.max(mw, x.offsetWidth || 0)` | custom-editor | 无 | B |
| :810 | 空名校验走 `TK.danger` 的边框/阴影表达式 | custom-editor | 无 | B |
| :819,820 | 右画布底色随主题；顶栏预览胶囊表达式 | custom-editor | 无 | B |
| :821 | 外观 seg 深浅双色不随宿主变 | custom-editor | 无 | B |
| :834,835 | 顶栏 `flexWrap: 'wrap'`；弹窗 `maxWidth: '96vw'` | custom-editor | 无 | B |
| :847,848 | `if (!pop || !popPos) return null` / `if (!showPresets || !presetPos) return null` | custom-editor | 无 | B |
| :849,850 | 负断言 `popPos \|\|` / `presetPos \|\|` 计数 = 0 | custom-editor | 计数型 | C |
| :851,852 | 坐标依赖数组 `}, popPos)` / `}, presetPos)` | custom-editor | 无 | B |
| :854 | `const POP_FALLBACK = { left: 40, top: 120 }` | custom-editor | 加类型注解即断 | **A** |
| :855,856 | `setPopPos(POP_FALLBACK)` / `setPresetPos({ left: 10, top: 140 })` | custom-editor | 无 | B |
| :990 | `onClick: function (ev) { try { ev.stopPropagation() } … }` 整句 | custom-editor | 内联形参加类型即断 | **A** |
| :991,992 | `bindSlot(` / `'data-slot':` 计数 = 5 | custom-editor | 计数型 | C |
| :997,998 | 切片里 `revealRow(key)` / `openPop(key, anchorEl)` 调用 | custom-editor | 无 | B |
| :999 | 负断言切片里 `scrollToRow(` 已无 | custom-editor | 片段 pin，应并入执行级 | C |
| :1004 | `const anchor = anchorEl \|\| null` | custom-editor | 加类型即断 | **A** |
| :1005 | `const place = preferSide === PLACE_RIGHT ? PLACE_RIGHT : PLACE_BELOW` | custom-editor | 加类型即断 | **A** |
| :1006-1009 | `preferSide: place` / `anchor: anchor` / 守卫 / `setPopPos(null)` 片段 | custom-editor | 片段 pin，建议并入执行级 | C |
| :1011-1019 | 入口选择器、`data-sw` 负断言、外点关闭、resize/scroll 监听、锚点脱离守卫 | custom-editor | 字面量保留 | B |
| :1020,1022-1024 | 负断言 `rowRefs.current[pop.key]`、`vw - 270`、`- 250 - 8`、`- 350 - 10` | custom-editor | 无 | B |
| :1025 | `const PLACE_BELOW = 'below'` / `const PLACE_RIGHT = 'right'` | custom-editor | `as const` 不破坏子串 | B |
| :1026 | `onClick: function (ev) { openPop(key, ev.currentTarget, PLACE_RIGHT) }` | custom-editor | 内联形参加类型即断 | **A** |
| :1028,1029 | `const POP_W = 320`、`POP_H = 388`、`POP_GAP = 8`、`POP_MARGIN = 10`、`POP_FALLBACK = {…}` | custom-editor | 加类型即断 | **A** |
| :1030 | `boxSizing: 'border-box'` + `width: POP_W + 'px'` + `height: POP_H + 'px'` | custom-editor | 无 | B |
| :1193 | `export function PalettePicker` 可导出的 SSR 缝 | custom-editor | 前缀到函数名，加返回类型不断 | B |
| :1194 | 负断言 `type: 'range'` 已退役 | custom-editor | 无 | B |
| :1195,1196 | `setPointerCapture`；`touchAction: 'none'` | custom-editor | 无 | B |
| :1198 | 键盘映射键逐个在场（×N） | custom-editor | 无 | B |
| :1200,1201 | `role: 'slider'`；`aria-valuetext` | custom-editor | 无 | B |
| :1202 | `'data-picker-part':` 计数 ≥ 10 | custom-editor | 计数型 | C |
| :1203,1204 | `EyeDropper` 特性检测；指针捕获成对 | custom-editor | 无 | B |
| :1206 | `e(PalettePicker, {` 交给展示组件 | custom-editor | 无 | B |
| :1207,1208 | 主题色按分组优先级取；对比度槽映射 | custom-editor | 无 | B |
| :1209 | `onApply: function (hex, transparent, hsv)` + `setColor(...)` | custom-editor | 内联形参；若加类型即断 | **A** |
| :1211,1212 | `initialHsv`；`pickMem.current[pop.key]` | custom-editor | 无 | B |
| :1213 | `function commitRgb(` / `function commitHsl(` 前缀 | custom-editor | 子串止于 `(`，加类型不断 | B |
| :1214-1217 | ↑↓ 微调、Esc 回滚、外点关闭、`tr('edSvHint')` | custom-editor | 无 | B |
| :1219,1220 | 透明槽拖拽不改色；数值输入禁用 | custom-editor | 无 | B |
| :1221 | `setEyeOk(`；吸管探测进 `useEffect` | custom-editor | 无 | B |
| :1222 | `function commit(next, transparent, hex, noticeKey)` | custom-editor | 形参全列，加类型即断 | **A** |

> A 类小计 15 条（688、755、775-778、854、990、1004、1005、1026、1028、1029、1209、1222）。C 类小计 19 条。

### 3.4 `tests/panel-render.test.mjs`（45 用例，48 条）

读取点：`package/lib/client.js`（:82 执行级 `loadPanel`；:386/:395/:404/:495 文本）、`package.json`（:412）、`runtime/client.mjs`（:575/:588/:685/:701/:755）。

| 文件:行 | 断言意图 | 读取对象 | 迁移后失效方式 | 分类 |
| --- | --- | --- | --- | --- |
| :387-391 | 产物含 `Tokyo Night` / `Shades of Purple` / `THEME_EN[name]` / `themeSearchText` | package/lib/client.js | 产物字面量；只要内联不压缩、不改名就保留 | B |
| :397 | 产物含旧名别名（×N） | 同上 | 同上 | B |
| :399,400 | 产物含 `THEME_ZH_LEGACY`，且是 `const THEME_ZH_LEGACY = {` | 同上 | 源 `const X: Record<…> = {` 剥类型后仍是该句 → 保留 | B |
| :405-408 | 浅色悬停 token、浅色阴影、`isHostDark`、`data-ds-dark-theme` | 同上 | 字面量/标识符 | B |
| :496 | 产物含新增预设 `Maple Mono NF CN` | 同上 | 字面量 | B |
| :497,498 | 宽度对比检测在场；旧 `document.fonts.check('12px` 已移除（负） | 同上 | 负断言字符串带前缀，保留 | B |
| :576-580 | `secHeader(` 组件、旧「本机字体 · N」负断言、品牌色、两组标题 | 同上 | 调用点/字面量 | B |
| :589,590 | `setLogSwitch` 接口在场；负断言自写开关文件 | 同上 | 标识符 | B |
| :686-689 | 4 条 i18n 模板串（`{n} 款…` / `{n} official…`） | 同上 | 字面量 | B |
| :703,704 | 负断言 `zIndex: 20`；`zIndex: 1000` | 同上 | 无 | B |
| :707-715 | 悬浮菜单 fixed / max-content / 锚点 state / 视口上限 / 溢出裁切 / `computeMenuGeometry` / scroll+resize | 同上 | 调用点/字面量 | B |
| :717,718 | 纵滑容器 `overflowY: 'auto'` / `overflowX: 'hidden'` | `runtime/client.mjs` | 无 | B |
| :721-727 | 候选行 28px 高、居中、`minWidth: '0'`、省略号、title、行高、`flex: 'none'` | 同上 | 无 | B |
| :757 | `code.includes(tier)` —— 三个档位名逐个出现在 `runtime/client.mjs` | `runtime/client.mjs` | 有档位表执行级入口可替代 | C |
| :759 | 负断言 `[UI_INTERACTIVE_ATTR]: ''` 旧空值钩子 | 同上 | 片段 pin | C |

### 3.5 `tests/update-panel.test.mjs`（23 用例，26 条）

读取点（`read(rel)` → `join(ROOT, rel)`，:26）：`runtime/channel.mjs`、`runtime/host.mjs`、`runtime/client.mjs`、`package/lib/index.js`、`package/lib/client.js`、`client.js`、`package/package.json`；动态 import：`src/engine/update-tokens.mjs`（:497/:530）、`src/engine/registry.mjs`（:499）、`runtime/host.mjs`（:272）、`node_modules/dsh-plugin-update/dist/panel.js`（:498）。

| 文件:行 | 断言意图 | 读取对象 | 迁移后失效方式 | 分类 |
| --- | --- | --- | --- | --- |
| :190,191 | `export const CHANNEL = '/api'`、`export const ENDPOINT = 'opencode-palette'` 同源常量 | runtime/channel.mjs | 正则无尾锚，`as const` 不影响 | B |
| :192,193 | 宿主半/浏览器半必须 `from './channel.mjs'` | runtime/host.mjs / runtime/client.mjs | TS 化后说明符必为 `./channel.ts` → 断言失败 | **A** |
| :194 | 发出去的宿主半也要 `from './channel.mjs'` | package/lib/index.js | 同上（且**发布产物不能 import `.ts`**，见 §4.8） | **A** |
| :211,213 | 产物里不得出现写死的 `'palette.updateStatus'` / `'palette.logAppend'` 字面量（负） | client.js + package/lib/client.js | 字面量检查，随产物 | B |
| :215-222 | 产物含 `mountUpdateEntry` / `mountUpdatePanel` / `entryLabelFor` / `createClientLog` / `__mods["upd-entry"]`；不含旧控制器、`upd-client`、`update-panel` 模块（×10） | 同上 | 标识符保留 | B |
| :229 | 包版依赖精确钉版 `dsh-log` 0.3.4 + `dsh-plugin-update` 0.18.11 | package/package.json | 与 TS 无关 | B |
| :230 | `pkg.engines.node === '>=22'` | package/package.json | 若为类型剥离 bump engines → 必改 | B（**bump 时连带改**） |
| :231 | `pkg.files = ['lib', 'cordis.patch.yml']` | 同上 | 无 | B |
| :233 | `exports.inject = ["theme","slots","locale","connection"]` | package/lib/client.js | 产物形状；构建内联器需保持这句 | B |
| :241 | 7 个闭包模块 `__mods["…"]` 逐个内联（×7） | package/lib/client.js | 标识符保留 | B |
| :250,251 | 宿主半 `from 'dsh-plugin-update'`；负断言 `./vendor/` | runtime/host.mjs | import 说明符不变（真依赖） | B |
| :253 | 发出去的宿主半也 import 真依赖 | package/lib/index.js | 同上；但 index.js 是**原样复制**，见 §4.8 | B |
| :258 | `/for \(const phoneName of Object\.keys\(update\.handlers\)\) registry\.set\(phoneName/` | runtime/host.mjs | 循环变量加类型即断 | **A** |
| :260,261 | 负断言 `wrapUpdateCheck` / `probeRelease` | runtime/host.mjs | 无 | B |
| :591 | 入口去底规则串确实在 client 源码 | runtime/client.mjs | 字面量；但属片段 pin | C |
| :592 | 负断言裸改 dialog 按钮底色 | 同上 | 片段 pin | C |
| :600 | `buildUpdateTokens` 在场 | runtime/client.mjs | 无 | B |
| :601 | `themeTokens: currentUpdateTokens()` 调用点 | 同上 | 无 | B |
| :602 | `sizing: { fontSize: '12px', padding: '2px 10px', borderRadius: '6px', scale: 1 }` | 同上 | 对象字面量；若 TS 折行/加 `satisfies` 会断 | B |
| :603,604 | `openOn: 'always'`；`setThemeTokens` | 同上 | 无 | B |
| :606,607 | 产物含 `--dsh-update-text`；不含旧 `--dsh-upd-text` / `--dsh-upd-btn`（负） | package/lib/client.js | 字面量 | B |

### 3.6 `tests/readme-head-tail.test.mjs`（13 用例，32 条）与 `tests/readme-body.test.mjs`（14 用例，20 条）

读取：`README.md`、`docs/README.en.md`、`package/README.md`（:17-19 / :17-21）、`assets/theme-stories-{zh,en}.svg`（body :21）。全部是**散文 / SVG 文本**，与 TS 化正交；唯一牵连是 `package/README.md` 由 `scripts/build-client.mjs:395-397` 从 `docs/README.en.md` 再生（构建后内容必须与断言一致），以及 `assets/*.svg` 由 `scripts/generate-assets.mjs` 生成、不在 build 链上。

| 文件:行 | 断言意图 | 分类 |
| --- | --- | --- |
| readme-head-tail:74-76 | 头部胶囊 `[![label](`、图声明、链接目标逐个在场 | B |
| readme-head-tail:88,96,97,168,169,174,175 | 负断言：删除的旧卖点/「PR 虚位以待」/旧首句不得回潮 | B |
| readme-head-tail:98,99,104,105,107-110,115,117 | 中英卖点（含 38）、标题、`<sub>`、导航、求星句、友链 | B |
| readme-head-tail:125,126 | `[dsh-prompt]` / `[dsh-mattpocock-skills-deck]` 排在 im 之前 | B |
| readme-head-tail:181-184,186,187 | issue 入口、飞书码路径（中/英相对路径不同）、备注词、宽度 260 | B |
| readme-head-tail:194,195 | 包内副本不带 `showcase` 块 / 不引用 `showcase/` | B |
| readme-head-tail:202,203 | 中/英主体标记逐个在场（×N） | B |
| readme-body:28,29 | SVG 画布 `width="860"` / `height="1812"` | B |
| readme-body:55 | 故事 SVG 含中文名「玫瑰松林」 | B |
| readme-body:82,83,128,150-152,239,240 | 负断言：GUIDE 标题、旧标签句、「（默认）」、照抄/我们加的、浅色覆盖自称 | B |
| readme-body:85,88,89,123,125,162-165 | 主体标记、INSTALL 三步标题、38 入口句、EXTENSIONS 复稿、字体首条 | B |

### 3.7 `tests/release-scripts.test.mjs`（4 用例，10 条）

| 文件:行 | 断言意图 | 读取对象 | 迁移后失效方式 | 分类 |
| --- | --- | --- | --- | --- |
| :37-40 | 向导含 `npm publish` / `npm whoami` / `previously staged version` / `Authenticate your account at` | scripts/npm-release-wizard.ps1 | `.ps1` 不迁 TS（且必须带 BOM） | B |
| :47-49 | Stage 4 轮询：`Start-Sleep`、`202`、`先别重发` | 同上 | 无 | B |
| :55-57 | run-wizard 含 `Start-Transcript` / `Stop-Transcript` / 调到 `npm-release-wizard.ps1` | scripts/run-wizard-with-log.ps1 | 无 | B |
| :21-33（BOM 门禁）、:59-60（负断言：调用 npm 的代码行不得重定向） | 全部 `.ps1` 必须是「UTF-8 BOM 或纯 ASCII」；npm 输出不得被重定向 | scripts/*.ps1（Buffer 字节） | 与 TS 化无关；见 §4.6 | B |

### 3.8 其余文件

| 文件 | 断言 | 说明 | 分类 |
| --- | --- | --- | --- |
| custom-themes-storage.test.mjs:226,229 | `package/lib/channel.mjs` 含方法名；`package/lib/index.js` 含 `customThemesSave`（2 条） | 产物文本，标识符 | B |
| custom-themes-storage.test.mjs:245-247 | `runtime/client.mjs` 发 `customThemesSave`/`Delete`；`runtime/custom-store.mjs` 发 `customThemesList`（3 条） | 字面量；从 `channel.PHONE_METHODS` 取值 | B |
| custom-themes-storage.test.mjs:140,141 | 临时文件 `raw` 为 2 空格缩进、schema 打头、尾部换行（2 条） | 序列化输出，不是仓库文本 | 不计入 286（注） |
| ip-presets.test.mjs:69 | 产物含 21 个 IP 预设 id（×21，1 条语句） | `package/lib/client.js` 字面量 | B |
| group-boundary.test.mjs:85→93-99 | 经 `zhOf()` 从 `runtime/client.mjs` 按 `'key':` 行 + `/zh: '([^']+)'/` 取中文组名，断言 3 组名与首字（8 条） | 行解析依赖「`'key':` 行 + `zh: '…'`」，TS 对象字面量不变；但解析器脆弱 | B |
| sync-verify.test.mjs | 无文本断言（导入 `scripts/sync-themes.mjs` 的函数，断言常量与异常，9 用例） | 只需改 import 说明符 | — |
| log-switch.test.mjs:53 | 只读 `package/lib/client.js` 路径后走执行级；无文本断言（2 用例） | 产物存在即可 | — |
| custom-theme.test.mjs（7）、float-geometry.test.mjs（6） | 无文件读取，纯 import `src/engine/*.mjs` | 只需改 import 说明符 | — |

### 3.9 汇总

| 文件 | 用例 | 文本断言 | A | B | C |
| --- | ---: | ---: | ---: | ---: | ---: |
| engine.test.mjs | 60 | 4 | 0 | 4 | 0 |
| custom-editor.test.mjs | 58 | 130 | 15 | 96 | 19 |
| panel-render.test.mjs | 45 | 48 | 0 | 46 | 2 |
| update-panel.test.mjs | 23 | 26 | 4 | 20 | 2 |
| readme-head-tail.test.mjs | 13 | 32 | 0 | 32 | 0 |
| readme-body.test.mjs | 14 | 20 | 0 | 20 | 0 |
| release-scripts.test.mjs | 4 | 10 | 0 | 10 | 0 |
| custom-themes-storage.test.mjs | 14 | 7 | 0 | 7 | 0 |
| group-boundary.test.mjs | 6 | 8 | 0 | 8 | 0 |
| ip-presets.test.mjs | 5 | 1 | 0 | 1 | 0 |
| sync-verify / log-switch / custom-theme / float-geometry | 24 | 0 | 0 | 0 | 0 |
| **合计** | **266** | **286** | **19** | **244** | **23** |

另有 2 条（storage:140,141）断言写盘格式，属临时文件文本，不计入。

**迁移必改的机械面**（不在 286 条内，但同样会拦路）：`tests/` 里 **110 处** `.mjs` 字面引用（`import` 说明符 + `readFileSync` 路径），**91 处**读取调用。它们全部要改成 `.ts`（或保留读产物 `.js`），否则 `ERR_MODULE_NOT_FOUND` / `ENOENT` 直接红。

---

## 4. 验证链实测事实

### 4.1 `npm test` 实际执行什么

`package.json` 的 test 脚本是**显式清单**，不是 glob：

```
node --test tests/engine.test.mjs tests/float-geometry.test.mjs tests/panel-render.test.mjs \
  tests/update-panel.test.mjs tests/log-switch.test.mjs tests/release-scripts.test.mjs \
  tests/sync-verify.test.mjs tests/readme-head-tail.test.mjs tests/readme-body.test.mjs \
  tests/group-boundary.test.mjs tests/custom-themes-storage.test.mjs tests/custom-editor.test.mjs \
  tests/custom-theme.test.mjs tests/ip-presets.test.mjs
```

实测：**266 tests / 266 pass / 0 fail，exit 0，wall 9253 ms**。没有 coverage、没有 `--test-concurrency` 覆盖、没有 `--experimental-*` flag。

### 4.2 各文件耗时与依赖

单文件单独起进程跑（`node --test --test-reporter=tap`）的数字，仅用于相对比较：

| 文件 | 用例 | 单跑 ms | 读构建产物 | 写盘 |
| --- | ---: | ---: | --- | --- |
| update-panel | 23 | 8831 | 是（root `client.js`、`package/lib/client.js`、`package/lib/index.js`、`package/package.json`） | tmpdir（:268,290-294） |
| log-switch | 2 | 7218 | 是（`package/lib/client.js`，仅取路径/执行） | tmpdir（:143,177,188） |
| panel-render | 45 | 1661 | 是（`package/lib/client.js`、`package/package.json`） | 否 |
| custom-editor | 58 | 1333 | 是（`:219` 加载 `package/lib/client.js`） | 否 |
| custom-themes-storage | 14 | 1287 | 是（`package/lib/channel.mjs`、`package/lib/index.js`） | tmpdir（:78,85-89,174-182） |
| engine | 60 | 366 | 否（只 import `src/engine/*`） | 否 |
| sync-verify | 9 | 213 | 否（import `scripts/sync-themes.mjs`） | tmpdir（:23,100） |
| custom-theme | 7 | 201 | 否 | 否 |
| ip-presets | 5 | 166 | 是（`package/lib/client.js`） | 否 |
| group-boundary | 6 | 161 | 否（读 `runtime/client.mjs`） | 否 |
| readme-head-tail | 13 | 136 | 是（`package/README.md`，由 build 再生） | 否 |
| readme-body | 14 | 133 | 是（同上 + `assets/*.svg`） | 否 |
| float-geometry | 6 | 133 | 否 | 否 |
| release-scripts | 4 | 124 | 否（读 `scripts/*.ps1`） | 否 |

两个慢文件都是**固定等待**：`log-switch` 等日志包防抖落盘（7.2 s），`update-panel` 等更新包轮询/超时（8.8 s）。它们决定了并行后的关键路径。

### 4.3 并行与隔离

- 单跑耗时之和 21963 ms ≫ `npm test` 的 9253 ms，说明 `node --test` **按文件并行**（默认并发度随 CPU 核数），不是串行。
- 进程隔离实测：两个测试文件各自打印 `PID_A=23808` / `PID_B=16176`，A 写的 `globalThis.marker` 在 B 里读到 `undefined`。即**每个测试文件是独立子进程**，`globalThis` / 模块缓存不共享。
- 跨文件唯一可能的共享是磁盘与环境变量：所有写盘都在 `os.tmpdir()` 下自建目录并在 `finally` 清理，未发现跨文件约定路径（`log-switch` 的开关文件也是 tmpdir 内自建）。
- 结论：**没有测试间共享状态**。迁移时可以放心按文件并行，但要注意「两个文件同时读同一产物」不是竞争关系（只读）。

### 4.4 构建前置依赖与「假绿」

`package/` 下 18 个文件**全部进 git**（含 `package/lib/client.js`、根 `client.js`）。因此：

- 测试**不要求先跑 build**：产物在仓库里就有，`npm test` 在干净 clone 上直接绿。
- 反过来，**源码改了忘了 build，测试照样绿**——断言读的是已提交的旧字节。迁移期这是最大的假绿来源：源码迁 `.ts` 后，若构建没跟上，`package/lib/client.js` 仍是旧内容，产物断言（约 44 条）会继续通过。
- 唯一的保险：构建后 `git diff --exit-code package/ client.js` 必须干净（或 CI 里先 build 再跑测试，并断言产物文件与构建输出一致）。这一点应写进「迁移完成」判定（§6.3）。

### 4.5 `npm test` 与裸 `node --test` 的差异

| 维度 | `npm test` | `node --test`（无参） |
| --- | --- | --- |
| 文件来源 | `package.json` 里**显式列举** 14 个 | 按默认 glob 发现（`*.test.*` 等） |
| 新增测试文件 | **不会被执行**，静默跳过（这是清单式脚本的已知风险） | 自动发现 |
| `.ts` 测试 | 清单里写 `.ts` 才会跑（实测 `node --test x.test.ts` 可执行） | 默认 glob 会**自动发现并执行** `.test.ts`（v24.19.0 实测） |
| npm 开销 | 多一层 lifecycle（未单独计时，量级 <1 s） | 无 |
| 并行/隔离 | 与裸跑一致（内部都是 `node --test`） | 基准 |
| reporter | 默认 spec | 可 `--test-reporter=tap` 等 |

迁移影响：若测试改 `.ts`，`package.json` 的 14 个路径必须逐个改；漏一个 = 那个文件静默消失（用例数下降却不报错）。**建议在迁移完成的判定里加一条用例数核对**。

### 4.6 `tests/release-scripts.test.mjs` 守的 BOM 门禁

机制（:21-33）：`readdirSync('scripts')` 取所有 `.ps1`，读成 `Buffer`；判定「前 3 字节 = `EF BB BF`」**或**「全部字节 < 0x80（纯 ASCII 免 BOM）」。失败信息明确写了原因：

> 含非 ASCII 却没有 UTF-8 BOM：Windows PowerShell 5.1 会按 ANSI 解码…

即：弹窗里跑的是 Windows PowerShell 5.1，无 BOM 的中文 `.ps1` 会被按 ANSI/GBK 解码，脚本解析失败且报错乱码。另外 3 个用例守向导内容：关键串（`npm publish` / `npm whoami` / `previously staged version` / `Authenticate your account at`）、Stage 4 轮询（`Start-Sleep` / `202` / `先别重发`，且不得留未替换的 `{0}{1}` 占位）、`run-wizard-with-log.ps1`（去 BOM 后含 `Start-Transcript` / `Stop-Transcript` / 调到向导本体；调用 npm 的代码行不得重定向输出，:59-60 负断言）。

**TS 化不牵动它**：`.ps1` 不参与迁移；但注意「任何编辑器顺手改写 `.ps1` 可能丢 BOM」这条坑依旧存在，且这条测试是唯一自动发现手段。

### 4.7 发布链其余门禁

| 门禁 | 位置 | 与 TS 化的关系 |
| --- | --- | --- |
| 依赖硬门禁 | `scripts/check-deps.mjs`（build 第一步） | 只读根 `package.json`、`package/package.json`、`node_modules/<pkg>/package.json` + 联网 registry；不读源码文本，**不受影响**。但它需要网络，且是 build 第一道门，`npm test` 不含它 |
| 产物形状 | `scripts/build-client.mjs` 产出 `package/lib/{client.js,index.js,channel.mjs,event-list.json}`、`package/package.json`、`package/README.md`、根 `client.js` | **强牵连**：`package/lib/index.js` 是 `runtime/host.mjs` 的**原样复制**，`package/lib/channel.mjs` 是 `runtime/channel.mjs` 的**原样复制**。若 runtime 改 `.ts`，直接复制就会把类型注解发到用户机器上（老 Node 直接语法错）→ build 必须新增「runtime 转译」步骤 |
| README | `build-client.mjs:395-397` 从 `docs/README.en.md` 再生 `package/README.md` | 测试只读散文；只要 build 仍再生，不受影响 |
| 资产 | `scripts/generate-assets.mjs` 生成 `assets/theme-stories-{zh,en}.svg` | 不在 build 链、无 npm script；测试读已提交文件，不受影响 |
| 版本号 | `build-client.mjs:370` 写死 `engines: { node: '>=22' }`；`tests/update-panel.test.mjs:230` 断言它 | **牵连**：若为类型剥离 bump engines，必须同时改根 `package.json`、`build-client.mjs:370`、`:230`，否则 build 后测试必红（或更糟：包版声明与根声明不一致） |

### 4.8 为什么「产物不能 import `.ts`」是硬约束

Node 的类型剥离只在**自己能处理 `.ts` 的版本**上生效（§5）。发布出去的包若在 `package/lib/index.js` 里 `import './channel.ts'`：

- 用户若在 Node 22.17 或更早（`engines` 只要求 `>=22`）→ 直接 `ERR_UNKNOWN_FILE_EXTENSION` / 语法错；
- 即使 Node 够新，`node_modules` 里的 `.ts` 也会被拒绝（官方限制：不处理 `node_modules` 内的 TS）。

所以构建必须保证**产物里不出现 `.ts` 说明符**：要么发布侧保持 `.mjs`/`.js`，要么构建时把说明符重写回 `.mjs`/`.js`（`tsc` 的 `rewriteRelativeImportExtensions` 正是为此设计，见 §5.5）。这直接否决了「runtime 全改 `.ts` 后原样复制」的做法。

---

## 5. Node 类型剥离的版本与限制

### 5.1 版本边界（一手来源）

官方文档 <https://nodejs.org/api/typescript.html> 的 History 表（原文照录关键行）：

| 版本 | 变更 |
| --- | --- |
| v22.6.0 | 加入 type stripping（`--experimental-strip-types`） |
| v23.6.0 / v22.18.0 | **默认开启**（无需 flag） |
| v24.3.0 / v22.18.0 | 不再打印 experimental warning |
| v25.2.0 / v24.12.0 | 标记为 **Stable** |
| v22.7.0 / v26.0.0 | `--experimental-transform-types` 加入 / 移除（enum 等需转译的语法要用它） |

官方教程 <https://nodejs.org/en/learn/typescript/run-natively> 的表述：

> Node.js v22.18.0 or later … you can run TypeScript files … **without any flags**（前提：只用可擦除语法）
>
> … if you are using a version **older than v22.18.0**, use the `--experimental-strip-types` flag.
>
> Node.js does not type check your code … **Use `npx tsc --noEmit`**.

### 5.2 限制（官方 + 本机实测）

官方 API 页列出的限制，以及我在 v24.19.0 上逐一验证的结果：

| 限制 | 官方说明 | 本机实测（v24.19.0） |
| --- | --- | --- |
| 只支持可擦除语法 | enum、含运行时代码的 `namespace`、parameter properties、import aliases 报 `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` | `enum E { A }` → `SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode`，exit 1 |
| 同上 | 同上 | `constructor(private x: number)` → 同类 `SyntaxError`，exit 1 |
| 相对导入必须带扩展名 | 必须写 `'./file.ts'` | `import './m'` → `Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'D:\Temp\…\m' imported from …\n.ts` |
| 不支持 `.tsx` | 明确不支持 | 含 JSX 的 `.tsx` → `SyntaxError: Unexpected token '<'` |
| 忽略 `tsconfig.json` | `paths`、`baseUrl` 等不生效 | 未逐项验证（文档明确） |
| 不处理 `node_modules` 内的 `.ts` | 拒绝 | 未验证（文档明确） |
| 类型导入必须带 `type` 关键字 | `import type { X }` | 未单测（属语法约束，`verbatimModuleSyntax` 会强制） |
| 不做类型检查 | 类型错误不会报 | `tsc --noEmit` 需单独跑 |

另外 `node --help` 同时列出 `--experimental-strip-types, --no-strip-types` 与 `--experimental-transform-types`；`--experimental-strip-types` 在 v24.19.0 上仍是合法 flag（兼容保留）。注意 **`--experimental-transform-types` 将于 v26.0.0 移除**，长期方案不能用它。

### 5.3 与本仓 `engines.node >= 22` 的一致性

**不一致。** `>=22` 的下界是 22.0.0：

| Node 区间 | 直接 `node x.ts` / `import './x.ts'` |
| --- | --- |
| 22.0 – 22.5 | **完全不支持**（无类型剥离） |
| 22.6 – 22.17 | 需要 `--experimental-strip-types` |
| 22.18+ / 23.6+ / 24+ | 默认可用（24.3+ 无 warning；24.12+ Stable） |

所以「测试直接跑 `.ts`」至少要求 **`engines.node >= 22.18.0`**（无 flag、无 warning），或把 `engines` 抬到 `>=24.12.0` 换取 Stable 语义。若想保住 `>=22` 的既有承诺，只有一条路：**测试文件不 import `.ts`**（只 `fs` 读文本，或用 `.mjs` 测试跑产物）。

bump `engines` 的连带修改点（缺一必红）：

1. 根 `package.json` 的 `engines.node`；
2. `scripts/build-client.mjs:370` 写死的 `engines: { node: '>=22', … }`（产物清单）；
3. `tests/update-panel.test.mjs:230` 的 `assert.equal(pkg.engines.node, '>=22')`；
4. `package/package.json`（build 产物，随 build 重生）；
5. `docs/`、`README` 里出现的引擎要求（若有）。

### 5.4 什么时候真的需要类型剥离

这是本报告最容易被误判的一点：

| 测试形态 | 是否触发类型剥离 | 最低 Node |
| --- | --- | --- |
| `readFileSync('src/x.ts')` + 字符串断言 | **否**（只读字节） | 任意 |
| `import '../src/engine/foo.ts'` | 是 | 22.18+（或 22.6+ 加 flag） |
| `import '../src/engine/foo.mjs'`（产物/旧文件） | 否 | 任意 |
| `node --test tests/x.test.ts` | 是（测试文件本身也是 TS） | 22.18+ |

所以迁移策略可以「分而治之」：**契约/文本测试保持 `.mjs` 只读文本，零版本成本；行为测试改 `.ts` import 源码，才需要 bump engines**。

### 5.5 `tsc --noEmit` 的挂点

官方立场是「Node 不做类型检查，用 `npx tsc --noEmit`」（§5.1 引用）。落到本仓：

- **挂在 `npm run build` 最前**（放在现有 `check-deps.mjs` 之前：类型检查离线、失败快，依赖门禁要联网）：类型错误在写产物之前暴露，不会把 WIP 产物写坏，且发布流程本来就是 `npm run build` → `npm test`，这样 build 失败即止。
- 同时暴露一个独立的 `npm run typecheck`（= `tsc --noEmit`），便于本地/IDE/CI 单跑。
- **不要塞进 `npm test`**：测试链目前零 devDependency 参与（`node --test` 直接跑），塞 `tsc` 会把测试的启动时间、失败语义（类型错 vs 断言错）和环境依赖（需要 `typescript` 安装）都搅在一起；且 `npm test` 在干净环境应可只靠 Node 跑。
- 官方教程给的 `tsconfig` 基线（TS ≥ 5.8）：`noEmit`、`target: esnext`、`module: nodenext`、`rewriteRelativeImportExtensions`、`erasableSyntaxOnly`、`verbatimModuleSyntax`。其中 `erasableSyntaxOnly` 正好把「enum / parameter properties / namespace」这类 Node 剥不掉的语法在编译期拦下；`rewriteRelativeImportExtensions` 负责把 `.ts` 说明符重写成 `.js`——这恰好是 §4.8 要求的产物侧改写。

---

## 6. 迁移后测试策略选项与「完成」判定

### 6.1 三个选项

| | 做法 | 优点 | 风险 |
| --- | --- | --- | --- |
| **选项 1：测试保持 `.mjs`，只读文本/产物** | 测试仍用 `fs.readFileSync('src/x.ts')` 读文本；行为测试继续加载 `package/lib/client.js` | 测试链 Node 版本零要求（读文本不剥离）；改动面最小（110 处路径替换）；`npm test` 无需 flag | 测试自身永远没有类型检查（迁移期最容易错的地方反而无保护）；行为测试仍绕不开 import `.ts`（`engine`/`float-geometry`/`custom-theme`/`sync-verify`），要么这些文件留 `.mjs`，要么 bump；假绿风险最高 |
| **选项 2：测试全转 `.ts`，`node --test` 直接跑** | 14 个测试文件全改 `.ts`，`package.json` 清单改扩展名；源码、测试同语言 | 类型检查覆盖测试（`tsc --noEmit` 一条命令管到底）；import 源码无需额外配置；与「全项目 TS 化」目标一致 | `engines.node` 必须 ≥ 22.18.0（连带 §5.3 五处）；`tsconfig` 需为测试补 DOM 类型与 `@types/node`；清单式 `npm test` 漏改一个文件会静默少跑用例；测试文件里 `enum`/parameter properties 不能用（`erasableSyntaxOnly` 兜底） |
| **选项 3：混合** | 行为/产物测试保持 `.mjs`（加载产物、SSR 渲染）；契约/文本测试转 `.ts` 直读源码 | 把版本成本压到最低：只有读文本的测试变 `.ts`（不需要 bump）；产物测试不依赖剥类型 | 两套约定并存，新人容易写错；`tsc` 要不要覆盖 `.mjs` 测试需额外配置（`allowJs`/`checkJs`）；「哪些测试该用哪套」需要文档纪律 |

### 6.2 推荐：选项 2，但配三条铁律与一个前置条件

推荐**选项 2（测试全转 `.ts`）**，理由：

1. 本票的核心风险是「迁移过程中测试给出错误信号」。只有测试也被 `tsc` 检查，才能挡住「断言读错变量」「import 路径写错」「类型收窄改变断言分支」这类迁移期错误；选项 1/3 都留下了无类型检查的角落。
2. 全仓 `src/`、`runtime/`、`scripts/` 都要迁，测试单独留 `.mjs` 的收益只有「省一次 engines bump」，而 engines bump 本来就要做（`runtime` 改 `.ts` 后产物必须转译，见 §4.8，构建链已经要动）。
3. `node --test` 对 `.test.ts` 的自动发现已经实测可用，工具链没有缺口。

**前置条件（P0，必须先做，否则选项 2 直接红）**：`scripts/build-client.mjs` 的正则内联器只认 `from './x.mjs'`（`JS_IMPORT_RE`，:129）和 `^export (function|const)`（`EXPORT_RE`，:131）。源码改 `.ts` 后，这两个正则必须同步改，且 `package/lib/index.js` / `package/lib/channel.mjs` 不能再「原样复制」，要改成「剥类型后写出」。

**三条铁律**（写进 `CONTRIBUTING` 或测试文件头注释）：

1. **源码文本断言只 pin 数据字面量，不 pin 声明语法。** 要断 `POP_W = 320` 就断值（或断使用点），不要断 `const POP_W = 320`。A 类 19 条全部按此改写。
2. **产物形状断言只读构建产物（`package/lib/client.js` 等），不读源码。** 产物是发布契约，源码是实现细节；读源码的产物断言在迁移后必然假绿。
3. **「源码 grep 代替执行」的代理断言删除或合并**（C 类 23 条）：能 SSR 渲染就用渲染结果断言，能 DOM 就挂 DOM，不能就删——计数型断言（`data-slot` 出现 5 次）只会随重构空转。

### 6.3 「迁移完成」的可判定标准

以下 6 条全部满足才算验证链迁移完成（每条都可用命令复核）：

1. **双版本绿**：Node `22.18.0` 与 `24.x` 上 `npm test` 全绿，且用例数不低于基线 266；若合并 C 类导致用例数减少，需在 PR 里逐条列出「删了哪条、由哪条执行级断言替代」。
2. **类型门禁零错**：`npx tsc --noEmit` 退出码 0，`tsconfig` 的 `include` 覆盖 `src/`、`runtime/`、`scripts/`、`tests/`（脚本可用 `--listFiles` 抽查）。
3. **无「读 `.mjs` 源码」的断言**：`grep -rn "runtime/.*\.mjs\|src/.*\.mjs" tests/` 只剩产物路径（`package/lib/*.js`）；可加一条 meta-test 守「测试里出现的每个 `readFileSync` 目标都存在」。
4. **产物与源码同步**：`npm run build` 后 `git diff --exit-code package/ client.js` 干净（证明没有「源码改了产物没重建」的假绿）。
5. **断言有效性抽样**：故意改 3 处被 pin 的源码字面量（如某个 I18N 中文、`POP_W` 的值、`THEME_EN` 的一个条目），测试必须分别变红；改回即绿。
6. **性能不退化**：`npm test` 墙钟 ≤ 2 × 基线（≤ 18.5 s）。基线 9253 ms；关键路径是两个固定等待文件（§4.2），改 `.ts` 不应显著改变它们。

### 6.4 建议的迁移顺序

| 阶段 | 内容 | 依赖 |
| --- | --- | --- |
| P0 | 构建链改造：`JS_IMPORT_RE`/`EXPORT_RE` 支持 `.ts`；`host`/`channel` 从「复制」改为「转译输出」；产物说明符重写回 `.mjs`/`.js` | 无（先于一切，否则产物不可用） |
| P1 | `tsconfig.json`（官方基线 + `erasableSyntaxOnly` + `rewriteRelativeImportExtensions`）、`typescript` devDep、`npm run typecheck`、engines bump（五处，§5.3） | P0 |
| P2 | 测试文件 `.mjs` → `.ts` + 110 处路径/说明符改写 + `npm test` 清单改扩展名 | P1 |
| P3 | 19 条 A 类断言改口径；23 条 C 类删除/合并/升级为执行级 | P2 |
| P4 | 加 meta-test（读取目标存在性）、CI 里 build 后 `git diff --exit-code`、双版本矩阵 | P3 |

---

## 7. 证据缺口

1. **无法实测构建后形态**：`npm run build` 被明令禁止（会覆盖 WIP 产物），所以「TS 源码经改造后的内联器产出长什么样」是静态推断。§3.4/§3.5/§3.8 里约 44 条产物断言的「可保留」结论，前提是「构建 = 剥类型 + 文本内联，不压缩改名」；若迁移顺带引入 esbuild/rollup，这 44 条要重新评估。
2. **`tsc` 未实测**：`typescript` 不在 devDependencies，`tsc --noEmit` 的耗时、`tsconfig` 组合是否报错、测试文件的 DOM 类型来源（`lib.dom` vs `@types/node`）均未验证。
3. **Node 22.18 行为未实测**：只有 v24.19.0；22.18.0 的「默认开启」引自官方 History 表。若要在 `engines` 上写 `>=22.18.0`，建议在 CI 里真跑一次 22.18。
4. **构建正则改造未验证**：`JS_IMPORT_RE` 只匹配单行、双引号外的单引号、`import { … }` 具名导入；源码迁 TS 后若出现 `import type`、多行 import、默认导入，正则都要扩。这部分只是读了代码，没有跑改造后的构建。
5. **行号漂移**：基于脏树（10 个文件已改，含 `tests/engine.test.mjs`）。WIP 若以不同方式落地，行号会移动，语义与分类不变。
6. **C 类「应删除」的判断含主观成分**：哪些代理断言可以升级为执行级，取决于 SSR/`loadPanel` 的覆盖能力；我只按「是否已有同文件执行级入口」粗判，未逐条设计替代断言。
7. **`npm test` 与裸 `node --test` 的耗时差异未单独测量**（只测了总墙钟与单文件），npm lifecycle 开销量级 <1 s 是估计。
8. **未验证 `node --test` 在 22.18 上对 `.test.ts` 的默认发现规则**：v24.19.0 实测可发现；22.18 的 glob 行为可能不同（若不同，显式清单反而更稳）。
