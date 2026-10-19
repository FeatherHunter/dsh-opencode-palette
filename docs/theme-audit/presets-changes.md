# 预置主题整改记录（T2 / #117）

> 记录 37 套预置 opencode 主题（33 套 TUI + 4 套 desktop-2.0 派生）从初始审计基线整改到 37-token 判尺硬违规 = 0 的逐套改动、取值与依据。判尺权威见 [criteria.md](criteria.md)；机器可读基线由 `node scripts/audit-themes.ts --out <dir>` 生成。

## 1. 总览

| 指标 | 整改前 | 整改后 |
|---|---|---|
| 硬性 4.5:1 违例（37-token 预置侧） | 301 | **0** |
| UI 3:1 违例（预置侧） | 29 | **0** |
| 有硬性违例的主题数 | 35 / 37 | **0 / 37** |
| matrix / vesper | 0 / 0 | 0 / 0（未改动） |
| IP 21 套（IP 2.0 主题，不属本票） | 91 + 17 | 0 + 0（由 T3 #118 完成整改，本票未涉及） |

- **lucent-orng** 是 delegated（透明底）画布主题：light 半边叠 `#FFFFFF` 白画布、dark 半边叠 `#000000` 黑画布各评估一次，**两边都要达标**（整改后各 0/0）。
- **4 套 desktop-2.0 派生主题**（amoled / oc-2 / onedarkpro / shadesofpurple）由 `scripts/convert-desktop-themes.ts` 生成：不在 33 套 TUI 手改范围内，本轮改生成器后重跑产物，见第 4 节。
- 其余 33 套 TUI 主题的 JSON 为 source of truth（直接维护本地定制），本轮直接改 JSON，不建 sidecar。
- 审计命令：`node scripts/audit-themes.ts --out <dir> --check`。**本票收尾复跑：预置 hard 0 / UI 0（37/37），IP 由 T3 整改后也已 0+0，--check exit 0。**

## 2. 为什么改的是这些源角色

硬性 38 对 = text@8 个背景槽、textMuted/labelDimmed@3、markdown 6 角色@background/panel、syntax 7 角色@codeBlockBg、diff 4 对、contrastText(primary)@primary；UI 15 对 = borderActive@3 个表面 + 6 个品牌语义色@background/panel。改法受引擎派生规则约束：

1. **labelDimmed** = `withAlpha(textMuted, 0.8)` 合成——弱文字类必须提亮 **textMuted 源色**，直到 0.8 alpha 合成后仍 ≥ 3:1。这是本轮最大宗违例，故多数主题只改 textMuted 一族。
2. **contrastText(primary)** 由 primary 亮度自动选 `#141414`（luma > 0.6）或 `#F4F4F5`——primary 亮度落在"双失败区间"时，要么提亮跨过 0.6 让深字达标，要么压暗配白字达标。
3. **diffAddedBg / diffRemovedBg** 由 `ensureDiffContrast` 自动修复——本票不直接写 diff 背景；diff 前景不达标时调 diff 前景角色。
4. **5 个扩展槽**（sidebarBg / bubbleBg / inputBg / codeBlockBg / codeHeaderBg）由 `normalizeThemeColors` 从 background / backgroundPanel / backgroundElement 派生（TUI JSON schema 不支持直接写这些键）——要动槽位只能动源背景角色。
5. **非委托画布的 light 半边不参与渲染与审计**（引擎把 dark 值写进两半），只有 lucent-orng 两半都要评。
6. **identity 策略**：只动必须动的角色，沿原色相向白/黑做**最小步长混色**（1/255 步进；暗底沿 `mix→#FFFFFF` 提亮，白画布/浅色沿 `mix→#000000` 压暗）；共享 def 的同源角色组整体调整；主色/背景色相不变。唯一动背景面的是 **zenburn**（为保住 #DCDCCC 低对比正文，压暗 panel/element，`background` #3F3F3F 不变）。

## 3. 逐主题明细（33 套 TUI）

> "修改"列为 dark 半边的**语义角色**，同源别名已合并（如 "textMuted 族" 含 diffContext / markdownBlockQuote / syntaxComment 等共享同一 def 的角色）；`(none) → #…` 表示新增缺失槽。初始列为 `硬性4.5 / UI3:1` 违例数。灯色主题若改到 dark/light 共用 def，light 半边数值同步变化（不参与渲染/审计，无需单独评估）。

| 主题 | 初始 | 修改（源角色：改前 → 改后） | 依据 |
|---|---|---|---|
| aura | 10 / 0 | primary 族（primary/accent/info/markdownHeading/LinkText/Strong/ListItem/Enumeration/ImageText/syntaxFunction/Variable/Type）`#A277FF→#A77FFF`；textMuted 族（含 borderActive/diffContext/markdownBlockQuote/HorizontalRule/syntaxComment）`#6D6D6D→#989898` | onPrimary（primary luma 跨 0.6，contrastText 改选深字）+ 品牌 3:1；labelDimmed@3 与 borderActive 3:1 同源 |
| ayu | 6 / 0 | textMuted 族（含 markdownHorizontalRule）`#565B66→#94979E` | labelDimmed（muted×0.8）@backgroundElement/backgroundPanel 3:1 |
| carbonfox | 5 / 0 | primary 族（含 borderActive/markdownLinkText/ListItem/Enumeration/ImageText）`#33B1FF→#3CB5FF`；textMuted 族 `#7D848F→#9AA0A8` | onPrimary：提亮跨 luma 0.6，让 contrastText 选 `#141414` 过 4.5；labelDimmed@3 |
| catppuccin | 2 / 3 | textMuted 族（含 diffContext/diffLineNumber/syntaxComment）`#9399B2→#9A9FB7`；borderActive `#45475A→#676978` | labelDimmed@3 最小步长；borderActive@3 个背景面 3:1 |
| catppuccin-frappe | 3 / 3 | textMuted 族 `#949CB8→#B0B6CA`；borderActive `#51576D→#787D8E` | 同上 |
| catppuccin-macchiato | 3 / 3 | textMuted 族 `#939AB7→#A1A8C1`；borderActive `#494D64→#6D7082` | 同上 |
| cobalt2 | 6 / 1 | primary/borderActive/markdownLink 族 `#0088FF→#4DACFF`；textMuted 族 `#ADB7C9→#C3CAD7`；markdownStrong/syntaxNumber `#FF628C→#FF638C`；syntaxComment `#0088FF→#088CFF` | onPrimary + 品牌 3:1 + link 4.5（同源）；labelDimmed@3；strong/number@codeBlockBg 与 comment 4.5 微调 |
| cursor | 6 / 0 | alpha 弱文字 `#E4E4E45E→#A5A5A5`（同源 diffContext/diffHunkHeader/markdownBlockQuote/HorizontalRule/syntaxComment 一并） | 唯一 audited 角色带 alpha：先按底合成（≈#6C6C6C）再提亮，保证合成后 3:1 / 4.5 |
| dracula | 9 / 0 | textMuted 族 `#6272A4→#CCD2E2` | labelDimmed（muted×0.8）@3 面 3:1，主因 |
| everforest | 7 / 0 | text 族（text/markdownText/markdownCodeBlock/syntaxPunctuation）`#D3C6AA→#D9CEB5`；textMuted 族 `#7A8478→#BEC3BD` | text@8 面 4.5 最小提亮；labelDimmed@3 |
| flexoki | 9 / 1 | primary/warning/markdownStrong/ListItem/syntaxFunction `#DA702C→#DF854A`；secondary/diffHunkHeader/markdownLink/syntaxVariable `#4385BE→#4788BF`；textMuted 族 `#6F6E69→#A8A8A5` | onPrimary + 品牌 3:1；labelDimmed@3（dark/light 半边同源 def） |
| github | 3 / 0 | primary 族（含 borderActive/diffHunkHeader/markdownHeading/Link/ListItem/Image/syntaxNumber）`#58A6FF→#59A6FF`；textMuted 族 `#8B949E→#949DA6` | onPrimary 4.5 微调（最小步长）；labelDimmed@3 |
| gruvbox | 13 / 0 | text 族 `#EBDBB2→#EDDFBA`；textMuted 族 `#928374→#DAD5CF`；error/diffHighlightRemoved/syntaxKeyword `#FB4934→#FC7B6B`；primary/syntaxVariable `#83A598→#88A99C`；secondary/markdownEmph/syntaxNumber `#D3869B→#D58DA1` | text@8 面 4.5；labelDimmed 主因；error/keyword@codeBlockBg 4.5；品牌/语法 4.5–3:1 |
| kanagawa | 11 / 0 | textMuted 族 `#727169→#BABAB6`；secondary/markdownHeading/syntaxKeyword `#957FB8→#9D88BD` | labelDimmed@3；品牌 3:1 + heading/keyword 4.5 |
| lucent-orng | 22 / 2 | dark 画布：primary 族（primary/warning/border/markdownHeading/Link/ListItem/Image/syntaxKeyword）`#EC5B2B→#F07B54`、textMuted 族 `#808080→#929292`；light 画布：primary 族 `#EC5B2B→#C04A23`、secondary `#EE7948→#E67546`、info 族 `#318795→#2F818F`、textMuted 族 `#8A8A8A→#545454`、markdownBlockQuote/Emph/syntaxType `#B0851F→#95711A` | delegated 双画布：黑底提亮前景、白底压暗前景；diff 背景 transparent 由审计 skip |
| material | 9 / 0 | textMuted 族 `#546E7A→#C5CED2` | labelDimmed（muted×0.8）@backgroundElement/backgroundPanel 3:1（初始 1.59，最差项） |
| matrix | 0 / 0 | 未改动（初始即达标） | — |
| mercury | 1 / 0 | textMuted 族 `#9D9DA8→#A8A8B1` | labelDimmed@3 最小步长 |
| monokai | 13 / 0 | textMuted 族 `#75715E→#C2C1B8`；markdownHeading/syntaxKeyword/syntaxOperator `#F92672→#FA4989` | labelDimmed 主因；heading/keyword 4.5；light 半边同源 def 同步 |
| nightowl | 9 / 0 | textMuted 族（含 border/borderSubtle/diffContext/markdownBlockQuote/HorizontalRule）`#5F7E97→#91A7B8`；syntaxComment `#637777→#7C8D8D` | labelDimmed/border@3；comment@codeBlockBg 4.5 |
| nord | 15 / 4 | textMuted `#8B95A7→#D4D8DE`；borderActive `#4C566A→#9399A5`；secondary 族 `#81A1C1→#96B1CB`；error 族 `#BF616A→#C7757C`；warning 族 `#D08770→#DAA08D`；markdownBlockQuote/syntaxComment `#8B95A7→#A6AEBB`；syntaxNumber `#B48EAD→#C3A5BD` | labelDimmed 主因；borderActive 3:1（初始 1.17）；品牌 3:1；弱文字独立源 4.5；number 4.5 |
| one-dark | 9 / 0 | text 族 `#ABB2BF→#C6CAD3`；textMuted 族 `#5C6370→#BBBEC3` | text@8 面 4.5 与层级余量（contrast(text) ≥ muted+1、ΔE≥4）；labelDimmed@3 |
| opencode | 4 / 2 | textMuted 族（含 markdownHorizontalRule/syntaxComment）`#808080→#9F9F9F`；borderActive `#606060→#696969` | labelDimmed@3；borderActive 3:1 |
| orng | 5 / 0 | primary 族（primary/markdownLink/ListItem/Image）`#EC5B2B→#F07B54`；textMuted/syntaxComment `#808080→#9F9F9F` | onPrimary + 品牌 3:1；labelDimmed/comment 4.5 |
| osaka-jade | 11 / 0 | textMuted 族 `#53685B→#ABB6AF`；syntaxFunction `#509475→#539677`；syntaxOperator `#459451→#4D9959` | labelDimmed（初始 1.82）@3；function/operator@codeBlockBg 4.5 微调 |
| palenight | 9 / 0 | text 族 `#A6ACCD→#C1C6DC`；textMuted 族 `#676E95→#B5B9CB` | text@8 面 4.5 + 层级余量；labelDimmed@3 |
| rosepine | 12 / 0 | textMuted 族 `#6E6A86→#A6A4B5`；success/diffAdded/diffHighlightAdded/markdownCode/syntaxKeyword `#31748F→#568DA3` | labelDimmed@3；diff 前景 4.5 + code/keyword 4.5（light 半边 primary/borderActive 同源 def 同步） |
| solarized | 29 / 6 | text `#839496→#B7C1C2`；textMuted 族 `#586E75→#A9B5B8`；primary 族 `#268BD2→#5FAADE`；secondary `#6C71C4→#6D72C4`；accent/link/string 族 `#2AA198→#39A89F`；error `#DC322F→#DE3E3B`；warning `#B58900→#BB9315`；success/keyword/operator 族 `#859900→#8FA114`；info/strong `#CB4B16→#DA815B`；syntaxNumber `#D33682→#E174A9` | 低对比固有（初始连 text@panel 仅 4.111）：按 8 背景槽 4.5 + 品牌 3:1 + 语法/markdown 4.5 全谱最小步长提亮 |
| synthwave84 | 3 / 0 | textMuted 族 `#848BBD→#9EA3CB` | labelDimmed@3 |
| tokyonight | 3 / 0 | textMuted 族（含 markdownHorizontalRule/syntaxComment）`#828BB8→#9CA3C6` | labelDimmed@3 |
| vercel | 5 / 3 | primary `#0070F3→#006AE7`；textMuted 族 `#878787→#AAAAAA`；borderActive/markdownHorizontalRule `#454545→#727272` | onPrimary（压暗配白字过 4.5）；labelDimmed@3；borderActive 3:1（初始 1.5–2.2） |
| vesper | 0 / 0 | 未改动（初始即达标） | — |
| zenburn | 14 / 1 | backgroundPanel `#4F4F4F→#474747`、backgroundElement `#5F5F5F→#4E4E4E`（background #3F3F3F 不变）；text 族 `#DCDCCC→#E9E9DE`；textMuted 族 `#9F9F9F→#DBDBDB`；error/string `#CC9393→#D7AAAA`；success/comment/markdownCode `#7F9F7F→#A4BBA4`；number `#8FB28F→#9EBD9E` | 唯一改背景面的主题：弱文字需要在更暗的面达 3:1，压暗 panel/element 并配合前景提亮（扩展槽随源面派生）；text/error/success/number 4.5 |

## 4. 4 套 desktop-2.0：生成器改造与 secondary 派生

这 4 套主题由 `scripts/convert-desktop-themes.ts` 从 `src/themes/desktop-2.0/*.json` 生成（产物为 `src/themes/{amoled,oc-2,onedarkpro,shadesofpurple}.json`）。原生成器从 desktop-2.0 源派生 24 个直连角色、缺 `secondary` 槽 → 引擎回退通用 `#5C9CF5`（与各主题色相不符，且品牌色 3:1 不可控）。本轮改造：

1. `REQUIRED_KEYS` 增加 `secondary`，缺槽即 fail（防止回退通用色）。
2. 新增确定性判尺修复 `repair()`：对 text / textMuted（含 labelDimmed = withAlpha(muted, 0.8) 合成）/ primary（含 contrastText(primary)）/ secondary / info / success / warning / error / borderActive / syntax 7 色 / markdown 6 色逐对 ensure；深色沿 `mix→#FFFFFF` 提亮、浅色沿 `mix→#000000` 压暗，1/255 最小步长；保留原有 panel/element/muted/border/borderActive 派生比例，只对派生结果做判尺修复。
3. **secondary 派生**：`secondary = repair(accent, background/backgroundPanel 3:1)`，其中 `accent = palette.accent || palette.interactive || palette.info`；按各主题 accent 色相派生出可表达的 secondary，不再依赖引擎回退。

| 主题 | accent 来源 | dark secondary | light secondary |
|---|---|---|---|
| amoled | `accent` #FF4081 | **#FF4081**（原色即过 3:1） | **#F8007C**（白底压暗） |
| oc-2 | 无 `accent`，回退 `interactive` #034CFF | **#1257FF**（提亮过 3:1） | **#034CFF**（原色即过） |
| onedarkpro | `accent` #E06C75 | **#E06C75** | **#D85462**（白底压暗） |
| shadesofpurple | `accent` #FF7AC6 | **#FF7AC6** | **#CA55A9**（白底压暗） |

- 生成器重跑幂等（连续两次输出逐字节一致），4 套产物均 2792 B（生成前 2716 B）；`MANIFEST.adapted20.themes` 的 `bytes`/`sha256` 已按当前产物重算登记。
- 扩展槽仍由 `normalizeThemeColors` 从 background/panel/element 派生，未改引擎（`src/engine/**` 不在本票写域）。
- 产物刷新命令：`node scripts/convert-desktop-themes.ts`（读 desktop-2.0 源、写 4 套 JSON；**不要手改产物**）。

## 5. 信息项（判尺不计门槛，未处理；预置 37 套口径）

以下按 [criteria.md](criteria.md) 属"信息项"，不参与通过判定，本轮未为此改色以免影响 identity：

- `border` @ 8 个背景槽 < 3:1：224 处。
- `diffAddedBg` / `diffRemovedBg` @ background < 3:1：72 处（diff 背景由 `ensureDiffContrast` 自动修复，不计门槛）。
- syntax 7 色 @ `codeHeaderBg` < 4.5:1：41 处。
- 白色 `#FFFFFF` tooltip 标签 @ backgroundElement：0 处；宿主 tooltip 白字缺陷归 #120。

## 6. 验证与复跑

- 审计：`node scripts/audit-themes.ts --out <dir> --check` → 预置侧 hard = **0**、UI = **0**（37/37 套；lucent-orng 双画布各 0），`--check` exit 0（IP 亦 0+0，见总览）。
- `npm run typecheck`：exit 0。
- `npm test`：283 pass / 0 fail（其中 3 处与颜色硬耦合的夹具由 engine-fix 在其写域 `runtime/host.ts`、`tests/engine.test.ts` 同步）。
- `npm run sync`（verify，只读）：exit 0——33 套中 31 套本地漂移均已在 `MANIFEST.localCuration.themes` 声明（matrix、vesper 无差异）；未执行 `--write` / `sync:update`。
- 逐主题可复算：HEAD 版主题 JSON 备份 D:\Temp\t2\head\*.json、对比脚本 D:\Temp\t2\diffroles.mjs → D:\Temp\t2\role-changes.json；整改求解器 D:\Temp\t2\solve.mjs（日志 `solve-v5.log`）。

## 7. 改动文件

- 35 套主题 JSON：33 套 TUI 中 31 套有差异（matrix、vesper 未改）+ 4 套 desktop 派生（由生成器重生成）。
- `scripts/convert-desktop-themes.ts`（secondary 补槽 + 确定性判尺修复）。
- `src/themes/MANIFEST.json`：仅 `adapted20.themes` 中 4 套的 `bytes`（2716→2792）与 `sha256` 共 8 个字段。
- 本文件 `docs/theme-audit/presets-changes.md`。

未改：`src/engine/**`、`src/custom-presets/**`、`tests/**`、`runtime/**`、其他 scripts；未 commit / push。
