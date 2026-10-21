# 58 套主题配色整改报告（wayfinder map #115）

> 2026-10-19 · 范围：37 套预置 opencode 主题 + 21 套 IP 主题，共 58 份 JSON 直接整改 · 工作树改动未 commit
> 判尺权威：[criteria.md](criteria.md)；机器基线：[baseline.json](baseline.json) / [baseline.md](baseline.md)；预置逐套明细：[presets-changes.md](presets-changes.md)；IP 设计笔记：[ip-presets-notes.md](../ip-presets-notes.md)、[ip-presets-v3-notes.md](../ip-presets-v3-notes.md)。
> 用户决定（m00120 / m00124）：直接修改全部 JSON，其余决策从第一性原理做出；库洛米只是质量标杆（地板高、无 <4.0 对、无角色串戏、背景家族纯净），不是模板，各主题保留自己的设计理念。

## 1. 结论

58/58 套主题按 37-token 判尺全绿；整改前合计 **438 条**硬性/UI 违例（预置 301 + 29，IP 91 + 17）全部清零，并修掉两个只在生成层暴露的引擎缺陷。判尺模型为 **38 个硬性 4.5:1 对 + 15 个 UI 3:1 对 + 10 个信息项 + 8 个诊断项**（详见 criteria.md）。

| 指标 | 整改前 | 终态（本报告实测） |
|---|---:|---:|
| 预置 硬性 4.5:1 违例（37 套） | 301（35/37 套有违例） | **0** |
| 预置 UI 3:1 违例 | 29 | **0** |
| IP 硬性 4.5:1 违例（21 套） | 91（21/21 套有违例） | **0** |
| IP UI 3:1 违例 | 17 | **0** |
| 有硬性违例的主题数 | 56 / 58 | **0 / 58** |
| tooltip 标签色 <4.5 评估 | 8 条（最低 1.000） | **0**（预置最低 5.678 / IP 最低 9.259） |
| IP 设计规范告警 | 55（记档 22 / 待处理 33） | **21（记档 21 / 待处理 0）** |
| 硬性对评估覆盖 | 38 对中 diff 4 对曾被审计脚本恒 skip | **2234 / 2242 对**（仅 lucent-orng 委托画布的 diff 8 对按设计跳过） |
| 终态最低硬性比值 | — | 4.500（cursor labelDimmed@backgroundElement） |
| 终态最低 UI 比值 | — | 3.001（lucent-orng light secondary@background） |
| 终态最低 diff 前景比值 | — | 4.504（solarized diffAdded@diffAddedBg） |

审计脚本确定性：同一工作树连跑两次，baseline.json / baseline.md 的 SHA256 分别一致（json `E498F53E…B88EF`），无时间戳、顺序固定。

## 2. 判尺与评估口径（摘要）

- **硬性 4.5:1（38 对）**：text @ 8 个背景槽；textMuted / labelDimmed @ background、backgroundPanel、backgroundElement；markdown 6 角色 @ background、backgroundPanel；syntax 7 角色 @ codeBlockBg；diffAdded@diffAddedBg、diffRemoved@diffRemovedBg、text@diffAddedBg、text@diffRemovedBg；contrastText(primary)@primary。
- **UI 3:1（15 对）**：borderActive @ 3 个主表面；primary/secondary/info/success/warning/error @ background、backgroundPanel。
- **信息项（不设门槛，只记录）**：border @ 8 表面、diffBg @ background。**诊断项**：syntax 7 色 @ codeHeaderBg、tooltip 标签 @ backgroundElement、token 对账。
- **有效渲染层**：所有比值按实际渲染背景算，不是 JSON 原始值——alpha 先合成（labelDimmed = withAlpha(textMuted, 0.8)）、contrastText(primary) 由 primary 亮度自动选色、diff 前景经 `ensureDiffContrast` 修复后评估、5 个扩展槽由 `normalizeThemeColors` 派生、单套色主题两半各自按 isDark 修复。
- **委托画布**：lucent-orng 的透明表面按宿主 light（#FFFFFF）/ dark（#000000）画布各评估一次，两边都必须达标。
- **IP 设计规范**（预置不套用）：背景家族色相纯净、角色不串戏（同值不同岗需记档例外）、品牌第二色几何（类比 ≤45° / 三角 95–145° / 互补 >145°）、syntax 核心五色 ΔE≥10 且 comment/operator 退后可辨、markdown 层级不撞。

完整判尺、例外政策与复跑方式见 [criteria.md](criteria.md)。

## 3. 预置 37 套（T2 / #117）

33 套 TUI 主题里 31 套改了 JSON（matrix、vesper 初始即 0/0，未动）；4 套 desktop-2.0 主题由 `scripts/convert-desktop-themes.ts` 改造后重新生成。改法只动必须动的源角色（TUI JSON 没有 5 个扩展槽，只能调 background/panel/element 派生源），沿原色相向白/黑做 1/255 最小步长混色；主色相与背景家族不漂移，唯一动背景面的是 zenburn（压暗 panel/element 保住 #DCDCCC 低对比正文）。

| 主题 | 初始 hard/UI | 终态 | 关键改动（源角色 改前→改后） |
|---|---:|---:|---|
| aura | 10 / 0 | 0 / 0 | primary 族 #A277FF→#A77FFF；textMuted 族 #6D6D6D→#989898 |
| ayu | 6 / 0 | 0 / 0 | textMuted 族 #565B66→#94979E |
| carbonfox | 5 / 0 | 0 / 0 | primary 族 #33B1FF→#3CB5FF；textMuted 族 #7D848F→#9AA0A8 |
| catppuccin | 2 / 3 | 0 / 0 | textMuted 族 #9399B2→#9A9FB7；borderActive #45475A→#676978 |
| catppuccin-frappe | 3 / 3 | 0 / 0 | textMuted 族 #949CB8→#B0B6CA；borderActive #51576D→#787D8E |
| catppuccin-macchiato | 3 / 3 | 0 / 0 | textMuted 族 #939AB7→#A1A8C1；borderActive #494D64→#6D7082 |
| cobalt2 | 6 / 1 | 0 / 0 | primary/borderActive/link 族 #0088FF→#4DACFF；textMuted 族 #ADB7C9→#C3CAD7 |
| cursor | 6 / 0 | 0 / 0 | alpha 弱文字 #E4E4E45E→#A5A5A5（同源 5 角色一并） |
| dracula | 9 / 0 | 0 / 0 | textMuted 族 #6272A4→#CCD2E2 |
| everforest | 7 / 0 | 0 / 0 | text 族 #D3C6AA→#D9CEB5；textMuted 族 #7A8478→#BEC3BD |
| flexoki | 9 / 1 | 0 / 0 | primary/warning 族 #DA702C→#DF854A；secondary 族 #4385BE→#4788BF；textMuted 族 #6F6E69→#A8A8A5 |
| github | 3 / 0 | 0 / 0 | primary 族 #58A6FF→#59A6FF；textMuted 族 #8B949E→#949DA6 |
| gruvbox | 13 / 0 | 0 / 0 | text 族 #EBDBB2→#EDDFBA；textMuted 族 #928374→#DAD5CF；error/keyword #FB4934→#FC7B6B |
| kanagawa | 11 / 0 | 0 / 0 | textMuted 族 #727169→#BABAB6；secondary/heading/keyword #957FB8→#9D88BD |
| lucent-orng | 22 / 2 | 0 / 0 | 双画布：dark primary #EC5B2B→#F07B54、textMuted #808080→#929292；light primary #EC5B2B→#C04A23、textMuted #8A8A8A→#545454 |
| material | 9 / 0 | 0 / 0 | textMuted 族 #546E7A→#C5CED2（初始 labelDimmed 1.591，最差项） |
| matrix | 0 / 0 | 0 / 0 | 未改动（初始即达标） |
| mercury | 1 / 0 | 0 / 0 | textMuted 族 #9D9DA8→#A8A8B1 |
| monokai | 13 / 0 | 0 / 0 | textMuted 族 #75715E→#C2C1B8；heading/keyword/operator #F92672→#FA4989 |
| nightowl | 9 / 0 | 0 / 0 | textMuted 族 #5F7E97→#91A7B8；syntaxComment #637777→#7C8D8D |
| nord | 15 / 4 | 0 / 0 | textMuted #8B95A7→#D4D8DE；borderActive #4C566A→#9399A5（初始 1.17）；secondary 族 #81A1C1→#96B1CB |
| one-dark | 9 / 0 | 0 / 0 | text 族 #ABB2BF→#C6CAD3；textMuted 族 #5C6370→#BBBEC3 |
| opencode | 4 / 2 | 0 / 0 | textMuted 族 #808080→#9F9F9F；borderActive #606060→#696969 |
| orng | 5 / 0 | 0 / 0 | primary 族 #EC5B2B→#F07B54；textMuted/syntaxComment #808080→#9F9F9F |
| osaka-jade | 11 / 0 | 0 / 0 | textMuted 族 #53685B→#ABB6AF（初始 labelDimmed 1.82）；function/operator 微调 |
| palenight | 9 / 0 | 0 / 0 | text 族 #A6ACCD→#C1C6DC；textMuted 族 #676E95→#B5B9CB |
| rosepine | 12 / 0 | 0 / 0 | textMuted 族 #6E6A86→#A6A4B5；success/diffAdded/markdownCode/keyword #31748F→#568DA3 |
| solarized | 29 / 6 | 0 / 0 | text #839496→#B7C1C2；textMuted 族 #586E75→#A9B5B8；primary 族 #268BD2→#5FAADE；全谱最小步长（初始 text@panel 仅 4.111） |
| synthwave84 | 3 / 0 | 0 / 0 | textMuted 族 #848BBD→#9EA3CB |
| tokyonight | 3 / 0 | 0 / 0 | textMuted 族 #828BB8→#9CA3C6 |
| vercel | 5 / 3 | 0 / 0 | primary #0070F3→#006AE7；textMuted 族 #878787→#AAAAAA；borderActive #454545→#727272（初始 1.5–2.2） |
| vesper | 0 / 0 | 0 / 0 | 未改动（初始即达标） |
| zenburn | 14 / 1 | 0 / 0 | backgroundPanel #4F4F4F→#474747、element #5F5F5F→#4E4E4E（background #3F3F3F 不变）；text #DCDCCC→#E9E9DE；textMuted #9F9F9F→#DBDBDB |

**代表性比值（初始审计 → 终态实测）**

| 主题 | 对 | 初始 | 终态 |
|---|---|---:|---:|
| material | labelDimmed@backgroundElement | 1.591 | **4.515** |
| dracula | labelDimmed@backgroundElement | 1.704 | **4.526** |
| one-dark | labelDimmed@backgroundElement | 1.650 | **4.501** |
| osaka-jade | labelDimmed@backgroundElement | 1.820 | **4.503** |
| amoled | syntaxComment@codeBlockBg | 2.513 | **4.551** |
| carbonfox | contrastText(primary)@primary | 2.153 | **8.111** |
| nord | borderActive@background | 1.170 | **4.366** |
| solarized | text@backgroundPanel | 4.111 | **7.070** |
| vercel | borderActive@background | ~1.5 | **4.365** |
| opencode | borderActive@background | ~1.5 | **3.606** |

**4 套 desktop-2.0 的 secondary 补槽**（原缺槽回落通用蓝 #5C9CF5，与各主题色相不符）：

| 主题 | accent 来源 | dark secondary | light secondary |
|---|---|---|---|
| amoled | `accent` #FF4081 | **#FF4081** | **#F8007C** |
| oc-2 | `interactive` #034CFF | **#1257FF** | **#034CFF** |
| onedarkpro | `accent` #E06C75 | **#E06C75** | **#D85462** |
| shadesofpurple | `accent` #FF7AC6 | **#FF7AC6** | **#CA55A9** |

生成器重跑幂等（4 个产物 SHA256 前后一致），产物由 2716 B 变为 2792 B，`src/themes/MANIFEST.json` 的 `adapted20.themes` 已按当前产物重算 bytes/sha256（仅 8 个字段）。

**信息项保持未处理**（不参与通过判定，强行改会伤 identity）：border @ 表面 <3 共 224 处、diffBg @ background <3 共 72 处、syntax @ codeHeaderBg <4.5 共 41 处（37 套口径）。

## 4. IP 21 套（T3 / #118）

21/21 套 JSON 全部整改，共 **145 个颜色槽**变化。初始硬性 108（91 text-ish + 17 UI）→ 0；设计告警 55（记档 22 / 待处理 33）→ 21（记档 21 / 待处理 0）。

- **6 套浅色主题的结构性改动**：代码区从"深色舞台"改为同色系浅色纸面 + syntax 七色转深墨——浅底主题的正确反差来自深墨语法色，而不是深色卡。
  | 主题 | codeBlockBg / codeHeaderBg（终态） | text@codeBlockBg 终态 |
  |---|---|---:|
  | disney | #F3E6CE / #EBD9B8 | 12.090 |
  | doraemon | #CBE7F8 / #B8DBF2 | 11.427 |
  | hello-kitty | #FBE7ED / #F6D9E3 | 11.154 |
  | lego | #E3E5E9 / #D9DCE2 | 13.789 |
  | mario | #D3E8F9 / #C2DDF4 | 11.835 |
  | sailor-moon | #F1ECF3 / #E8E3EA | 12.798 |
  （整改前这 6 套的 text@codeBlockBg 最低约 1.0–1.25，是全库最差项；kuromi 浅色不属此列，其代码舞台原设计保持不动。）
- **15 套深色主题**主要是数值、并岗与几何修正，设计理念保留：kuromi secondary #7A56A4→#A84AB2（70.2° unclassified→43.6° 类比，并保住"库洛米级"标杆）、transformers 标题从 primary 拆出 #FF5C4D、cyberpunk borderActive/heading 拆成两级漆黄 #FFF24A/#FFF7A8、ultraman secondary #FFAD00、dc-comics primary/info/link 整组 #64A2FF、pokemon borderActive #FFE14D、doraemon/mario/hello-kitty borderActive 拆岗、sailor-moon primary #C42C6B 等。
- **豁免记录**：[exceptions.json](exceptions.json) 共 21 条（18 条 roleCollision、1 条 brandGeometry、2 条 markdownDuplicate，覆盖 10 套主题），每条带 code、主题与理由引用（docs/ip-presets-v3-notes.md）。原则：同值不同岗必须记档并说明为什么保留；新增碰撞不记档即视为待处理。
- **设计文档**：docs/ip-presets-notes.md 增补库洛米四段与 6 套浅色主题重写；docs/ip-presets-v3-notes.md 增 v3.1 节与逐套 21 条记录。

## 5. 派生层与引擎缺陷修复（T5 / #120）

两个缺陷只在"JSON → 实际渲染 token"的生成层暴露，改主题 JSON 治不了：

1. **自定义/单套色主题的 diff 修复方向错误**：`generate.ts` 的 `buildTokens` 在 del=false 时把 dark 半边的修复结果写进两半，浅色 IP 主题的 diff 背景被压成 #000000。修复：用"两半是否同一配色"识别单套色主题，light 半用 `ensureDiffContrast(pal, false)`（向白提亮）、dark 半用 `(pal, true)`（向黑压暗）；两套配色自持的预置保持两半同值不变式。
   - 效果：lightThemesUsingDarkRepair 7 → 0；浅色 IP diff 底回归同色系浅底（disney #EBF0E3、doraemon #E5F2F3/#F7F6F8、hello-kitty #F8E0E5、lego #ECF2EF）。
2. **宿主 tooltip 白字不可读**：宿主把 tooltip 标签硬编码为白（`--dsw-static-neutral-bluish-00`）且无 alias 可覆盖，浅色主题上只有 1.00–1.43:1。修复：引擎新增 `tooltipTextColor()`，按浮层底 backgroundElement 现算标签色（正文色优先，不足 4.5 退纯黑/白），legacy 与 delegated 两分支都发 `body [role="tooltip"]{color:…}` 元素规则；键帽底由浮层底派生可辨色（mixHex 16% 起步/4% 步进/上限 40%，对比 ≥1.5），不再与浮层底同值。
   - 效果：57 条 tooltip 评估全部 ≥4.5（最低 5.678，IP 最低 9.259；整改前最低 1.000）；键帽 57 token 最低 1.538（旧同值 1.000）。

改动文件：src/engine/generate.ts、src/engine/map-dsh.ts、src/engine/resolve.ts、runtime/host.ts + tests/engine.test.ts、tests/custom-theme.test.ts；审计脚本诊断段同步改语义；docs/theme-audit/criteria.md 5 处更新。

## 6. 验收阶段对审计模型的修正

验收时发现审计脚本一个口径漏洞：diff 的 4 个硬性对（diffAdded@diffAddedBg、diffRemoved@diffRemovedBg、text@diffAddedBg、text@diffRemovedBg）的底 `diffAddedBg/diffRemovedBg` 不是 8 个渲染表面之一，`resolveBg` 解析不到，导致这 4 对在每个配色上都被标成 `skip`——"38 硬对全评"的说法对 diff 组不成立。修正：`resolveBg` 把 diff 行底按页面底合成后解析（scripts/audit-themes.ts），其余判尺模型未动。
- 修正后：硬性对实际评估 2234 / 2242（2234 = 38 对 × 38 套配色 − lucent-orng 委托画布的 diff 8 对），diff 组最低 4.504（solarized）、全部通过；基线重新生成（baseline.json 338,572 B / baseline.md 8,775 B）。
- lucent-orng 的 diff 4 对与 2 个 diffBg 信息项、tooltip 诊断项因委托透明表面按设计跳过（宿主承载），在 baseline 中如实记为 skip。

## 7. 验证与复跑

| 命令 | 结果 |
|---|---|
| `node scripts/audit-themes.ts`（默认写 docs/theme-audit/） | exit 0；预置 0+0、IP 0+0；tooltip 诊断 0 条 <4.5；设计告警 21 记档 / 0 待处理 |
| `node scripts/audit-themes.ts --check` | exit 0（任何硬性/UI 违例或未记档设计告警都会 exit 1） |
| `node scripts/audit-themes.ts --out <dir>` | 定向输出，不污染 docs 基线；确定性已用连跑两次 SHA256 相同验证 |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0（typecheck → check-deps 0.18.38/0.3.4 全绿 → fonts → tsc emit → build-client） |
| `npm test` | **283 pass / 0 fail** |
| `npm run verify:artifacts` | 全部通过（字体一致、两次构建逐字节一致、八件非空/LF、package/lib 恰 4 文件、派生物未被跟踪、font-face 仍跟踪、.gitattributes eol=lf） |
| `npm run sync` | exit 0（33 套中 31 套声明漂移，需处理 0；verify 只报告不写盘） |

复跑顺序建议：`npm run audit:themes` → `npm run sync` → `npm run build` → `npm test` → `npm run verify:artifacts`。

## 8. 改动文件与边界

- **主题数据**：src/themes/ 35 份 JSON（31 套 TUI + 4 套 desktop 派生；matrix/vesper 未改）；src/custom-presets/ 21 份 JSON 全改。
- **生成/引擎**：scripts/convert-desktop-themes.ts（secondary 补槽 + 判尺修复）、src/engine/generate.ts、src/engine/map-dsh.ts、src/engine/resolve.ts、runtime/host.ts、runtime/client.ts（pin 注释）。
- **审计/同步**：scripts/audit-themes.ts（新增 + 验收修正）、scripts/sync-themes.ts、tests/sync-verify.test.ts、src/themes/MANIFEST.json（localCuration + adapted20 指纹）。
- **文档**：新增 docs/theme-audit/`criteria.md`、`baseline.json`、`baseline.md`、`exceptions.json`、`presets-changes.md`、`report.md`（本文件）；新增 docs/themes-sync-policy.md；更新 docs/ip-presets-notes.md、docs/ip-presets-v3-notes.md、AGENTS.md、DESIGN.md。
- **地图外维护**（不属主题整改）：dsh-plugin-update 0.18.25→0.18.32 与其 build-client 闭包（check-deps 硬门禁强制），已随 T1 一并修好并验证。
- **未 commit / 未 push**：docs/theme-audit/ 整个目录当前 untracked，提交时必须与 exceptions.json 一起入库，否则已记档的设计告警会重新变成"待处理"。

## 9. 已知限制与后续

- 审计是"JSON 静态 + 生成后派生层"的可复算模型，不是浏览器截图/真机目视；6 套浅色 IP 的代码舞台是结构性视觉改动，建议在真实界面过一眼（尤其 disney / hello-kitty / sailor-moon 的纸面色感）。
- alpha 与宿主画布相关（labelDimmed、透明委托表面）按当前宿主 token 假设评估；宿主升级改变画布/浮层底时需要重跑基线。
- lucent-orng 委托画布的 diff/tooltip 由宿主承载，审计按设计 skip；其余 57 套全量评估。
- 信息项（border、diffBg、syntax@codeHeaderBg）保持不动；如未来判尺升级为门槛，需另开 effort。
- Out of scope（与 map #115 一致）：CI 审计门禁、showcase 真机截图重出（#65）、第三方编辑器 UI 重构（#82/#91）、版本发布与 bump。

---

*本报告由 wayfinder map #115 收口生成；58 套主题的逐套依据分布在 presets-changes.md（预置）与 docs/ip-presets-v3-notes.md v3.1（IP），本文件负责总览、终态数字与验收证据。*
