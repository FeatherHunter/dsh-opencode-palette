# 主题审计判尺（37-token / 61 套）

> 本文件是 [map #115](https://github.com/FeatherHunter/dsh-opencode-palette/issues/115) 判尺的**唯一文字权威**；`scripts/audit-themes.ts` 注释只放常量，基线见同目录 `baseline.md` / `baseline.json`。判尺改动必须同时改本文件与脚本，并重跑基线。

## 1. 审计对象与口径

- 对象：`src/themes/*.json` 的 **37 套预置主题**（33 套 TUI + 4 套 desktop-2.0）与 `src/custom-presets/*.json` 的 **24 套 IP 主题**，共 61 套。
- 评估色板：**62 个**。自持画布**预置主题**（36 套）虽有两套色板但非委托画布：引擎按 issue #45 把 dark 有效色板写进 light/dark 两半，按一套色板评一次；委托画布主题（`lucent-orng`）light 色板叠白底、dark 色板叠黑底，各评一次；**IP / 自定义单套色主题**（24 套）在 #120 修复后两半各自修复（light 半用 `ensureDiffContrast(..., false)`、dark 半用 `ensureDiffContrast(..., true)`），按主题 `appearance` 取宿主实际生效的那半评一次。
- 有效渲染层（与引擎同源）：
  1. `resolveThemeColors(json, mode)` 解析引用链得到原始槽位；
  2. `normalizeThemeColors(raw)` 补齐缺省槽：`sidebarBg ← background`、`bubbleBg / inputBg / codeBlockBg ← backgroundPanel`、`codeHeaderBg ← backgroundElement`；
  3. `ensureDiffContrast(pal, isDark)` 做 diff 前景修复（issue #73/#80 的修复后有效值才是真正渲染值）；单套色自定义/IP 主题在 #120 后两半各自按方向修复（见上一条），审计按 `appearance` 选生效半；
  4. `tokenParity` 对账：把上述有效色板与 `generateTheme` / `renderCustomTheme` 实际 `buildTokens` 输出逐 token 比较，**0 失配**才算口径可信（见 `baseline.json.engineDiagnostics.tokenParity`）。
- 表面（surface）与 alpha 合成：真实渲染里背景槽可能带 alpha，必须按叠放顺序合成到不透明底色后再算对比度，而不是直接拿 JSON 值当颜色：
  - `background` 合成到宿主画布（浅色主题 `#FFFFFF`、深色主题 `#000000`）；
  - `backgroundPanel / backgroundElement / sidebarBg / bubbleBg / inputBg / codeBlockBg` 合成到 `background`；
  - `codeHeaderBg` 合成到 `codeBlockBg`（代码卡片头带与代码块同一卡片）。
  - `label-dimmed`：宿主对 `textMuted` 施加 0.8 透明度，故按 `withAlpha(textMuted, 0.8)` 合成到目标表面后的实际色评估；
  - 主按钮前景：`contrastText(primary)`（`resolve.ts`：luma > 0.6 → `#141414`，否则 `#F4F4F5`）合成到 `primary` 填充上；
  - tooltip 标签色：宿主 CSS 硬编码白字（`--dsw-static-neutral-bluish-00`，不可由 alias 覆盖）；#120 后引擎用 `body [role="tooltip"]` 元素规则按浮层底 `backgroundElement` 现算文字色（正文色优先，不足 4.5 退纯黑/白），审计按该映射色评估，仅作诊断项；键帽底由浮层底派生可辨色（`--dsw-alias-tooltip-key-bg`，不再与浮层底同值）。
- 对比度：WCAG 2.x 相对亮度比，四舍五入前比较；**恰好等于阈值算通过**。alpha 槽位一律先合成再比较（`contrastRatio` 本身不处理 alpha）。
- 37 token 分组：背景 8（`background`、`backgroundPanel`、`backgroundElement`、`sidebarBg`、`bubbleBg`、`inputBg`、`codeBlockBg`、`codeHeaderBg`）＋正文 2（`text`、`textMuted`）＋品牌/语义 6（`primary`、`secondary`、`info`、`success`、`warning`、`error`）＋边框 2（`border`、`borderActive`）＋diff 6（`diffAdded`、`diffRemoved`、`diffAddedBg`、`diffRemovedBg`、`diffAddedLineNumberBg`、`diffRemovedLineNumberBg`）＋markdown 6（`markdownHeading`、`markdownLink`、`markdownCode`、`markdownEmph`、`markdownStrong`、`markdownBlockQuote`）＋syntax 7（`syntaxComment`、`syntaxKeyword`、`syntaxFunction`、`syntaxType`、`syntaxNumber`、`syntaxString`、`syntaxOperator`）。

## 2. 硬性判据（必须全绿）

### 2.1 正文/内容类 ≥ 4.5:1（38 对）

| 组 | 对（前景 @ 背景） | 对数 |
| --- | --- | ---: |
| text | `text` @ 全部 8 个背景槽 | 8 |
| muted | `textMuted` @ `background`、`backgroundPanel`、`backgroundElement` | 3 |
| dimmed | `labelDimmed`(=textMuted@0.8) @ 同上三层主表面 | 3 |
| markdown | 6 个 markdown 角色 @ `background`、`backgroundPanel` | 12 |
| syntax | 7 个 syntax 角色 @ `codeBlockBg` | 7 |
| diff | `diffAdded@diffAddedBg`、`diffRemoved@diffRemovedBg`、`text@diffAddedBg`、`text@diffRemovedBg`（修复后有效值） | 4 |
| onPrimary | `contrastText(primary)@primary` | 1 |

理由：正文与内容类文本必须达到 WCAG AA 正常文本对比度；`labelDimmed` 是宿主列表/标签的真实 80% 不透明态，必须单独算（历史缺陷集中在这里）；diff 行底上的正文同样要可读；主按钮前景由引擎按 primary 亮度自动选择，必须验证填充与前景的实际组合。

### 2.2 UI/交互类 ≥ 3:1（15 对）

| 组 | 对 | 对数 |
| --- | --- | ---: |
| borderActive | `borderActive` @ `background`、`backgroundPanel`、`backgroundElement` | 3 |
| brand | 6 个品牌/语义色分别 @ `background`、`backgroundPanel`（作为 UI 前景/状态色） | 12 |

理由：焦点/选中边框与非文本 UI 组件达到 WCAG AA 非文本对比度；品牌色在页面主表面上的可辨识度。

### 2.3 判罚与出口

- 任一硬性对 `ratio < threshold` 记 1 条违例；`--check` 时只要有硬性违例（4.5 或 3:1）退出码 1，否则 0。
- 基线当前（2026-10-19 整改前）：**硬性 392 条**（预置 301 正文 + 29 UI；IP 91 + 17）。整改后的验收标准是 **0 条**（见票 #117/#118/#121）。

## 3. 信息项（不计分、不设整改门槛）

这些对当前记录数值、供策展参考，**不参与 `--check`**，也不作为单票验收门槛：

- `border` @ 8 个背景槽（装饰性边框，DSH 深色默认 16% 白；改色空间小）；
- `diffAddedBg@background`、`diffRemovedBg@background`（弱化行底与页面底的关系，属于审美项）；
- 语法色 @ `codeHeaderBg`（代码头带通常放文件名/按钮，不铺语法色；诊断用）；
- tooltip 标签色 @ `backgroundElement`（宿主白字不可覆盖，审计按引擎 `[role="tooltip"]` 映射后的实际文字色记录；#120 后 58 套应全部 ≥4.5）。

## 4. IP 主题设计规范（仅 IP，预置不套用）

硬性对比度对 IP 同样适用；以下设计规范只对 24 套 IP 主题产出 **warning**（不直接计入硬性条数），用于避免“对得上对比度但设计上失真”：

1. **背景家族纯净**：彩度（RGB 通道差）≥ 8 的背景槽按色相聚类；相对底色的基色相偏差 **> 60°** 记「色相孤岛」。孤岛要么修正，要么在 `exceptions.json` 用 `allowedBackgroundIslands: true` 记档并说明理由。
2. **角色碰撞（精确同值）**：除 8 个背景槽与 4 个 diff 背景槽外的 25 个设计角色，任意两角色取同一 hex 即告警（`crossGroup` 标记是否跨组）。碰撞是「角色语义被抹平」的信号；**默认必须修**。只有 v3 终审 `docs/ip-presets-v3-notes.md` 明确写下、且已登记进 `exceptions.json.allowedCollisions` 的才可保留（按角色集合匹配，与顺序无关）。
3. **markdown 层级**：6 个 markdown 角色内部同值另记 `markdownDuplicate`（标题/强调/引用层级被抹平）；同样只有 v3 笔记明文记录的才允许（`allowedMarkdownDuplicates`）。
4. **品牌第二色几何**：`primary` 与 `secondary` 色相差 ≤45° 记近似、95–145° 记三角、>145° 记互补；落不进三类的记 `brandGeometry` 告警，需要在 `exceptions.json.allowedBrandGeometry` 里给出归类与理由。
5. **语法区分度与层次**：5 个核心语法角色（keyword/function/type/number/string）两两 ΔE76 必须 ≥ 10，否则记 `syntaxCoreMin`；`syntaxComment` 与 `syntaxOperator` 必须在 `codeBlockBg` 上**退后**（对比度不得高于任一核心语法角色），否则记 `syntaxRecede`。只有 v3 笔记明确写下的退后取舍可登记 `allowedSyntaxRecede`。
6. **明暗 straddle** 只记录（浅色主题里出现极暗表面），不作为违规。

## 5. 例外（exceptions.json）政策

- 文件：`docs/theme-audit/exceptions.json`，结构 `{ themes: { <主题名>: { notes?, allowedCollisions?, allowedMarkdownDuplicates?, allowedBrandGeometry?, allowedSyntaxRecede?, allowedBackgroundIslands? } } }`。
- 每条例外必须带 `notes`，写明依据（引用 `docs/ip-presets-v3-notes.md` 的具体行或设计理由）；**新设计不得为了过审随手加例外**——例外只用于承载 v3 已拍板的历史设计决定。
- 例外只对第 4 节的设计 warning 生效，**不能豁免第 2 节硬性对比度**。
- 未记档的告警在 `baseline.md` 标「待处理」，计入 `designSummary.open`；已记档的标「✓ 记档」。整改时新增的碰撞/孤岛应直接改色解决，而不是补例外。

## 6. 基线与复跑

- 命令：`npm run audit:themes`（= `node scripts/audit-themes.ts`）；加 `--check` 时有硬性违例退出 1。
- 产物：
  - `docs/theme-audit/baseline.json`：机器可读，含每套主题每个评估画布的 surfaces、counts、worst、逐对 `[code, fg, bg, ratio, threshold, verdict]`，以及设计记录与告警明细；
  - `docs/theme-audit/baseline.md`：人读汇总表与逐条设计告警。
- 产物由脚本确定性生成（无时间戳、固定排序），**禁止手改**；改主题 JSON 或判尺后重跑并 review diff。
- 整改工作流：改 JSON → `npm run audit:themes` → 看 `git diff -- docs/theme-audit/baseline.*` → 目标：硬性 0、UI 0、设计告警待处理 0 或经评审记档 → `npm test`。T6 用 `--check` 做最终门禁。
- 本基线与 D:\Temp wayfinder-facts-* 临时审计做过方向性对账（见 baseline.md 末节）；差异来自 pair 口径（38 对 vs 42 对）与 surface 口径，不是数据冲突。

## 7. 已知局限

- 审计是「JSON 静态 + 引擎生成层」的静态计算，不渲染截图；字体、字重、字号、透明叠加的浏览器实现差异不在覆盖范围。
- alpha 槽位按线性 sRGB 合成（与引擎/浏览器一致），但未覆盖宿主 CSS 的额外滤镜或渐变。
- `labelDimmed` 的 0.8 是对宿主 `label-dimmed` 类的近似（宿主实现可能按主题微调）；tooltip 文字色按引擎映射规则计算（与 `generate.ts` 的 `tooltipTextColor` 同源）。
- 委托画布只覆盖白/黑两种宿主底；其他宿主底色（如壁纸）不在本轮范围。
- 预置主题的暗色主题只评估深色画布（自持画布主题同一套色板写两半）；浅色宿主下的实际观感不在覆盖范围。
