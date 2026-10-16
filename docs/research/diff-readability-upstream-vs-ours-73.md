# #73 diff 可读性归因：上游主题色设计 vs 我方调色板实现

> 研究问题：GitHub issue #73 — 大部分主题下 DSH 的 diff 行不可读（nord 删除行变成实心色条、opencode 系看不清），而 OC 2 正常。到底是 opencode 上游主题色设计的问题，还是我们调色板实现的问题？
> 一手来源均取自上游 rev `0dd6950d1b06958fbcdcadf0ad56258257ab7fdb`（= 本仓 `src/themes/MANIFEST.json` 标注的 vendoring 基线，TUI 形 JSON 与该 rev 字节一致，见证据表 R0）。

## 结论先行

**上游锅六成、我方锅四成。**

一句话理由：nord / solarized 的低对比 diff 色对（前景压背景对比度 2.5 左右）是**上游 TUI 主题数据原文如此**、且上游 TUI 自己也是 **fg-on-bg 整行渲染**（`diff.plus` / `diff.minus` 作用域），病根在上游；但我们的 `map-dsh.mjs` 把这对坏值**无兜底直配**到 DSH token（`usable()` 只跳缺失/透明，不查对比度），且桌面主题转换器把上游仅有的 diff 种子（`diffAdd` / `diffDelete`）也丢了——这两处是我方的份。OC 2 "正常"是误打误撞：桌面 schema 本来就没有 diff 背景槽位，缺槽→跳过→回落宿主默认，反而躲开了坏数据。

## 分槽位证据表

| # | Claim | 来源 |
|---|-------|------|
| R0 | 本仓 `src/themes/*.json` 与上游 TUI 主题资产**字节一致**（以 nord 验证：本地 / 上游 / MANIFEST 三方 sha256 均为 `2a407451…561284`）。因此本地主题里的坏值 = 上游原文，不是我们改的。 | [上游 nord.json（TUI 资产）](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/tui/src/theme/assets/nord.json)；本地 `src/themes/nord.json` + `src/themes/MANIFEST.json`（"来自 triage 实测"：vendored 自 opencode v1.18.12） |
| R1 | 上游 nord TUI 数据里 `diffAddedBg` / `diffRemovedBg` 的 dark 值**就是同一个 `#3B4252`**（= `nord1` = `backgroundPanel`）；`diffRemoved` 前景是 `nord11`（`#BF616A`）。solarized 同理：两个 Bg dark 都是 `#073642`（= `base02` = `backgroundPanel`），前景 `red` `#dc322f`。 | [上游 nord.json](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/tui/src/theme/assets/nord.json)；[上游 solarized.json](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/tui/src/theme/assets/solarized.json) |
| R2 | 上游 TUI **也是 fg-on-bg 整行渲染**，不是"只做 +/- 标记色"。`getSyntaxRules()` 里：`diff.plus → { foreground: diffAdded, background: diffAddedBg }`，`diff.minus → { foreground: diffRemoved, background: diffRemovedBg }`，`diff.delta → { context/contextBg }`。即上游把"前景字压在背景上用"，和 DSH 宿主行为同构——这对低对比值在上游 TUI 里同样踩雷，上游没有任何对比度校验（`resolveTheme()` 只做引用解析）。 | [上游 `packages/tui/src/theme/index.ts`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/tui/src/theme/index.ts)（`getSyntaxRules` 的 `diff.plus` / `diff.minus` / `diff.delta` 三节；`resolveTheme` 无对比度逻辑） |
| R3 | 上游官方文档把这对低对比值**当范例直接贴出**（nord example：`diffAddedBg` / `diffRemovedBg` dark 均为 `#3B4252`），无任何"前景/背景需保证对比度"的语义说明。theme.json 文档只讲格式（hex/ANSI/引用/明暗变体/`none`），不定义 diff 槽位语义。 | [官方主题文档](https://opencode.ai/docs/themes/)（Custom themes → Example 节） |
| R4 | 上游**自己知道正确做法**，只是没用在手写主题上：`generateSystem()`（terminal 自适应 `system` 主题）用 `tint(bg, green/red, 0.22 dark / 0.14 light)` 派生 `diffAddedBg` / `diffRemovedBg`，背景由构造保证是"底色染一点红/绿"，从不手写死值。手写主题（nord 等）没走这条路。 | [同上 `index.ts` 的 `generateSystem`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/tui/src/theme/index.ts) |
| R5 | 我方映射是**无兜底直配**：`map-dsh.mjs:79-86` 把 8 个 diff 槽位直配到 `--dsw-alias-code-diff-added/deleted`、`--dsw-alias-file-diff-added/deleted-bg/gutter/marker`；`generate.mjs:12-18` 的 `usable()` 只跳过缺失/`transparent`/解析失败，**不检查前景–背景对比度**，坏值原样注入。 | 本地 `src/engine/map-dsh.mjs:79-86`、`src/engine/generate.mjs:12-18` |
| R6 | 实测对比度（深色、alpha 混合到底色后）：nord 删除对 **2.46**、opencode 系删除对 **2.89**、zenburn 新增对 **2.33**——均远低于 4.5 可读线。zenburn 尤可作证"非个案"：它的 `diffAdded` dark `green`（`#7f9f7f`）压 `diffAddedBg` `#4f5f4f`，Bg 之间都不相同、照样糊。 | "来自 triage 实测"；本地 `src/themes/zenburn.json` 的 diff 段可复算 |
| R7 | 桌面 2.0 侧：**上游本来就没有 diff 背景角色**。官方 [`desktop-theme.schema.json`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/ui/src/theme/desktop-theme.schema.json) 的 palette 只有可选的 `diffAdd` / `diffDelete` **前景种子**（缺省分别回退到柔化 success / error），无任何 `*Bg` 槽位。上游桌面 nord 文件可作证：palette 里 `diffAdd` / `diffDelete` 与 `neutral/ink/...` 并列，无背景项。 | [上游 schema](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/ui/src/theme/desktop-theme.schema.json)（`ThemePaletteColors.diffAdd/diffDelete`）；[上游桌面 nord.json](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/ui/src/theme/themes/nord.json) |
| R8 | 桌面端"正常"的机制：上游 [`resolve.ts`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/ui/src/theme/resolve.ts) 从 `diffAdd` / `diffDelete` 种子各派生一条 12 档 scale，**背景取浅档**（`surface-diff-add/delete-base = diffAdd/Delete[2]`，weak 取 `[3/1]`），**文字取深档**（`text-diff-add-base = diffAdd[10]`，delete 取 `[9]/[11]`）——前景背景永不在同一档，对比度由构造保证。这就是 OC 2 系渲染正常的真正原因。 | [上游 `packages/ui/src/theme/resolve.ts`](https://github.com/anomalyco/opencode/blob/0dd6950d1b06958fbcdcadf0ad56258257ab7fdb/packages/ui/src/theme/resolve.ts)（`diffAdd/diffDelete` scale 派生、`surface-diff-*` 与 `text-diff-*` 取档） |
| R9 | 我们的转换器是"**诚实转换但漏了前景种子**"：`convertOne()` 输出 28 个键（本地 `src/themes/oc-2.json` 实测键表），无任何 diff 键——连上游 desktop palette 里**有**的 `diffAdd`（oc-2 dark `#c8ffc4`）/ `diffDelete`（`#fc533a`）都没取。输出缺槽→`usable()` 跳过→DSH 回落宿主默认→"正常"。所以 OC 2 正常≠我们转得好，是没转、靠默认。 | 本地 `scripts/convert-desktop-themes.mjs:42-80`（`convertOne` 无 diff 行）、`src/themes/desktop-2.0/oc-2.json`（输入含 `diffAdd`/`diffDelete`）、`src/themes/oc-2.json`（输出 28 键、无 diff，"来自 triage 实测"亦确认） |

## 未验证事项（明确写出，不猜）

1. **DSH 宿主 design-platform diff token 语义 closed-source，无法验证。**"宿主把 diff 行文本以前景 token 压在背景 token 上渲染"仍是假设（"来自 triage 实测"的现象与之吻合：坏色对一注入即糊、宿主默认即正常），建议 #73 实施者在宿主侧实证后再落定。
2. **上游 TUI 交互式文件 diff 组件的完整渲染路径未逐一审计。**已验证 `getSyntaxRules` 的 `diff.plus` / `diff.minus` 是 fg-on-bg（R2），足以定性"上游同构"；但 TUI 内 file-diff widget 是否另有文字色回退（如用 `text` 而非 `diffRemoved` 做行文本），未逐文件审计，不影响本结论的数量级。
3. **上游桌面组件是否真实消费 `surface-diff-*` / `text-diff-*` 未逐一审计。**已验证 token 派生层按档位分离（R8），且与"OC 2 正常"现象一致；组件层引用审计留给后续（如需，可 grep 上游 `surface-diff-add-base` 消费处）。
4. **`amoled.json` 在上游同 rev 的 `packages/ui/src/theme/themes/`  listing 中缺席**（其余 35 个文件都在），而本仓 `src/themes/desktop-2.0/amoled.json` 存在。其来源（2.0 分支后加？命名差异？）本次未追溯；不影响 diff 结论（转换器对四个桌面主题一视同仁地丢 diff），记一笔供同步脚本复查。

## 给 #73 实施的建议：兜底为主 + 补转换器为辅（组合）

- **主：保对比度兜底（必做）。**在 `generate.mjs`（或 `resolve.mjs` 旁新增 `ensureDiffContrast`）对 4 对 fg/bg（added/deleted × 行文本 bg、gutter bg；marker 只做前景、无 bg 配对故豁免）做 WCAG 对比度检查，阈值取 4.5：低于阈值时**重算背景**而非换前景——学上游 `generateSystem` 的做法，`bg = tint(base, fgSeed, α)`（dark α≈0.22 / light α≈0.14，上游已验证的常数），`base` 取该主题 `background`。理由：病根是"Bg 与底色无亲缘关系的手写死值"（nord Bg = panel 色），tint 重构亲缘性后对比度由构造保证，且只动坏主题、好主题（opencode `#20303b`/`#37222c` 这种自带 tint 痕迹的值）原样通过。
- **辅：补转换器（顺手做）。**`convertOne()` 增加 `diffAdded ← palette.diffAdd`、`diffRemoved ← palette.diffDelete`（缺省按 schema 回退：softened success / error，可直接复用 `mix()` 在 success/error 轴上取），并用同一 `mix()`/`tint` 从 `neutral` 派生 `diffAddedBg` / `diffRemovedBg` / `*LineNumberBg`。理由：R9 证明输入有种子、输出全丢；补上后 OC 2 系主题获得真实 diff 色（当前是宿主默认、名不副实），且派生 Bg 天然走兜底逻辑，与主方案同一代码路径。
- **不选：改映射语义。**（如把 `*-bg` 改配 marker、或把行文本改配 `text`）——理由：那是偏离上游 TUI 语义的特案补丁，nord 在上游 TUI 里同样糊，改语义治标不治本；且 DSH 宿主语义未验证（未验证事项 1），此时重排语义是赌博。等宿主 token 文档明确后再议。

---

*研究方法注记：`web_search` 无可用 API key，全程改用 `web_fetch` 直取一手来源（上游 GitHub blob/raw + 官方文档站），结论每条可点链验证；本地断言均可在本仓复算（`src/themes/*.json`、`src/engine/*`、`scripts/convert-desktop-themes.mjs`）。*

## 上游 V2 现状（增量，2026-10-15）

> 基线：`sst/opencode` 经 API 实证已归属 `anomalyco/opencode`（请求 `repos/sst/opencode` 返回 `full_name: anomalyco/opencode`，默认分支 `dev`）；本节一律以最新 tag **v2.0.29** 的 blob 为准。上一轮 rev `0dd6950`（v1.18.12 基线）的章节原样保留，不动。

### 现状结论

1. **V2 没修手写坏值。** `nord.json` 的 `diffAddedBg` / `diffRemovedBg` dark 仍同为 `#3B4252`（light 同为 `#E5E9F0`）；`solarized.json` dark 仍同为 `#073642`。且 V1 手写 JSON 被原样保留——V2 的 `v1.ts` 仍直接 `import nord/solarized/zenburn…` 进 `DEFAULT_THEMES` 做兼容。
2. **TUI diff 槽位还在（改名）。** schema 已搬到新包 `packages/theme/src/tui/schema.ts`，文档格式改为 `base/light/dark` + tokens；`DiffDefinition` 仍有 `text/background/highlight/lineNumber` 四组（即 `diff.text.added`、`diff.background.added` 等），槽位语义未删。
3. **TUI 渲染未变，仍是 fg-on-bg 整行。** `getSyntaxRules` 已搬到 `packages/theme/src/tui/syntax.ts` 的 `generateSyntax`：`diff.plus → { foreground: diff.text.added, background: diff.background.added }`，`minus/delta` 同理；新旧两套 resolve（`packages/theme/src/tui/resolve.ts`、`packages/tui/src/theme/resolve.ts`）均为纯引用展开，**无对比度校验**。
4. **tint 常数原样保留。** `packages/tui/src/theme/system.ts` 的 `generateSystem` 仍是 `diffAlpha = dark 0.22 / light 0.14` + `tint(bg, green/red)` 派生 `diffAddedBg/diffRemovedBg`——上一轮建议"抄上游 tint 常数"在 V2 依然有效。
5. **桌面 schema 无新增 diff 角色。** `desktop-theme.schema.json` 的 palette 仍只有可选 `diffAdd`/`diffDelete` 前景种子、无任何 `*Bg` 槽位；V2 唯一新增是通用逃生舱 `v2Overrides`（任意 v2 变量直写，非 diff 专属）。`v2/mapping.ts` 语义层无 diff token，`v2/resolve.ts` 保留 `diffAdd ?? shift(success…)` / `diffDelete ?? error` 回退；桌面 `nord.json` 仍带 `diffAdd`/`diffDelete` 种子。

### 链接证据（v2.0.29）

- [TUI nord.json（坏值未修）](https://github.com/anomalyco/opencode/blob/v2.0.29/packages/tui/src/theme/assets/nord.json) / [TUI solarized.json（同上）](https://github.com/anomalyco/opencode/blob/v2.0.29/packages/tui/src/theme/assets/solarized.json) / [v1.ts（V1 资产原样保留）](https://github.com/anomalyco/opencode/blob/v2.0.29/packages/tui/src/theme/v1.ts)
- [V2 TUI schema（DiffDefinition）](https://github.com/anomalyco/opencode/blob/v2.0.29/packages/theme/src/tui/schema.ts) / [V2 syntax.ts（diff.plus fg-on-bg）](https://github.com/anomalyco/opencode/blob/v2.0.29/packages/theme/src/tui/syntax.ts) / [V2 theme resolve.ts（无对比度校验）](https://github.com/anomalyco/opencode/blob/v2.0.29/packages/theme/src/tui/resolve.ts) / [system.ts（tint 0.22/0.14）](https://github.com/anomalyco/opencode/blob/v2.0.29/packages/tui/src/theme/system.ts)
- [桌面 schema（仅 v2Overrides 新增）](https://github.com/anomalyco/opencode/blob/v2.0.29/packages/ui/src/theme/desktop-theme.schema.json) / [桌面 nord.json（种子仍在）](https://github.com/anomalyco/opencode/blob/v2.0.29/packages/ui/src/theme/themes/nord.json) / [v2 mapping.ts（无 diff token）](https://github.com/anomalyco/opencode/blob/v2.0.29/packages/ui/src/theme/v2/mapping.ts) / [v2 resolve.ts（种子回退）](https://github.com/anomalyco/opencode/blob/v2.0.29/packages/ui/src/theme/v2/resolve.ts)

### 路线建议：本票兜底先行，V2 同步另开新票

- **"同步上游 V2 数据"在 #73 内不可行。**两条硬理由：(a) V2 数据没修坏值，同步回来 nord 照样糊，解决不了 #73；(b) V2 是格式迁移而非数据更新——DESIGN D1 锁 v1.18.12、D2 强制 dark 取值、`sync-themes.mjs` 指纹、`map-dsh.mjs` 槽位名（`diffAddedBg`→`diff.background.added`）、桌面转换器（palette→v2 primitives+mapping 两套 token）全要动，等于一次 V2 迁移，超出 #73 修可读性的 scope。
- **维持上一轮组合建议：主兜底 + 辅补转换器。**主：引擎侧对比度兜底，阈值 4.5，坏背景用 `tint(base, fgSeed, α)` 重算，α 抄上游 V2 仍在用的 `0.22 dark / 0.14 light`；辅：`convertOne()` 取 `diffAdd`/`diffDelete` 种子并派生 Bg（V2 桌面种子与回退机制都在，输入侧无变化）。
- **V2 同步开新票**（改 D1/D2 + sync 指纹 + 双 token 管线），与 #73 解耦。
