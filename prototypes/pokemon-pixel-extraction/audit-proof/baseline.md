# 主题审计基线（58 套）

> 由 scripts/audit-themes.ts 确定性生成（无时间戳、固定排序），请勿手改；重跑 npm run audit:themes。判尺文字版见 [criteria.md](criteria.md)，设计例外见 [exceptions.json](exceptions.json)。

范围：预置 37 套 + IP 24 套；评估配色 62 套（lucent-orng 委托画布按 light/dark 各评估一次；自持画布预置按 dark 有效配色、IP 按 appearance 修复后的有效配色各评估一次）。

## 汇总

| 层 | 主题 | 硬性 4.5:1 违例 | UI 3:1 违例 | 有硬性违例主题 | border<3 表面累计 | tooltip 文字<4.5 评估 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 预置 | 37 | 0 | 0 | 0 | 224 | 0 |
| IP | 24 | 0 | 0 | 0 | 187 | 0 |

硬性分组（预置 / IP）：

| 组 | 预置 | IP |
| --- | ---: | ---: |

## 预置主题（37）

| 主题 | kind | 硬性违例 | UI 违例 | border<3 | 表面数 | 最差硬性对 |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| amoled | preset | 0 | 0 | 0 | 3 | — |
| aura | preset | 0 | 0 | 8 | 2 | — |
| ayu | preset | 0 | 0 | 0 | 3 | — |
| carbonfox | preset | 0 | 0 | 8 | 3 | — |
| catppuccin | preset | 0 | 0 | 8 | 3 | — |
| catppuccin-frappe | preset | 0 | 0 | 8 | 3 | — |
| catppuccin-macchiato | preset | 0 | 0 | 8 | 3 | — |
| cobalt2 | preset | 0 | 0 | 8 | 3 | — |
| cursor | preset | 0 | 0 | 8 | 3 | — |
| dracula | preset | 0 | 0 | 8 | 3 | — |
| everforest | preset | 0 | 0 | 0 | 3 | — |
| flexoki | preset | 0 | 0 | 8 | 3 | — |
| github | preset | 0 | 0 | 8 | 3 | — |
| gruvbox | preset | 0 | 0 | 8 | 3 | — |
| kanagawa | preset | 0 | 0 | 8 | 3 | — |
| lucent-orng | preset | 0 | 0 | 0 | 1 | — |
| material | preset | 0 | 0 | 8 | 3 | — |
| matrix | preset | 0 | 0 | 8 | 3 | — |
| mercury | preset | 0 | 0 | 8 | 3 | — |
| monokai | preset | 0 | 0 | 8 | 3 | — |
| nightowl | preset | 0 | 0 | 0 | 2 | — |
| nord | preset | 0 | 0 | 8 | 3 | — |
| oc-2 | preset | 0 | 0 | 8 | 3 | — |
| one-dark | preset | 0 | 0 | 8 | 3 | — |
| onedarkpro | preset | 0 | 0 | 0 | 3 | — |
| opencode | preset | 0 | 0 | 8 | 3 | — |
| orng | preset | 0 | 0 | 0 | 3 | — |
| osaka-jade | preset | 0 | 0 | 8 | 3 | — |
| palenight | preset | 0 | 0 | 8 | 3 | — |
| rosepine | preset | 0 | 0 | 8 | 3 | — |
| shadesofpurple | preset | 0 | 0 | 0 | 3 | — |
| solarized | preset | 0 | 0 | 8 | 2 | — |
| synthwave84 | preset | 0 | 0 | 8 | 3 | — |
| tokyonight | preset | 0 | 0 | 0 | 3 | — |
| vercel | preset | 0 | 0 | 8 | 3 | — |
| vesper | preset | 0 | 0 | 8 | 1 | — |
| zenburn | preset | 0 | 0 | 8 | 3 | — |

## IP 主题（21）

| 主题 | kind | 硬性违例 | UI 违例 | border<3 | 表面数 | 最差硬性对 |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| cyberpunk-2077 | ip | 0 | 0 | 8 | 8 | — |
| dc-comics | ip | 0 | 0 | 8 | 8 | — |
| disney | ip | 0 | 0 | 8 | 8 | — |
| doraemon | ip | 0 | 0 | 8 | 8 | — |
| dragon-ball | ip | 0 | 0 | 4 | 8 | — |
| evangelion | ip | 0 | 0 | 8 | 8 | — |
| genshin | ip | 0 | 0 | 8 | 8 | — |
| genshin-night | ip | 0 | 0 | 7 | 8 | — |
| harry-potter | ip | 0 | 0 | 8 | 8 | — |
| hello-kitty | ip | 0 | 0 | 8 | 6 | — |
| kuromi | ip | 0 | 0 | 8 | 8 | — |
| lego | ip | 0 | 0 | 8 | 8 | — |
| mario | ip | 0 | 0 | 8 | 8 | — |
| mario-night | ip | 0 | 0 | 8 | 8 | — |
| marvel | ip | 0 | 0 | 8 | 8 | — |
| naruto | ip | 0 | 0 | 8 | 8 | — |
| naruto-night | ip | 0 | 0 | 8 | 8 | — |
| one-piece | ip | 0 | 0 | 8 | 8 | — |
| pokemon | ip | 0 | 0 | 8 | 5 | — |
| sailor-moon | ip | 0 | 0 | 8 | 8 | — |
| star-wars | ip | 0 | 0 | 8 | 8 | — |
| transformers | ip | 0 | 0 | 8 | 8 | — |
| ultraman | ip | 0 | 0 | 8 | 8 | — |
| zelda | ip | 0 | 0 | 8 | 8 | — |

## 委托画布

- lucent-orng：light 画布 #FFFFFF 硬性 0 / dark 画布 #000000 硬性 0（同主题名两半各自按宿主底评估）

## 引擎 / 宿主诊断

- token 对账（有效配色复刻 vs 引擎 buildTokens 输出）：全部一致（0 主题失配）
- tooltip 标签色（#120 后由引擎按浮层底 backgroundElement 映射，宿主硬编码白字已被 [role="tooltip"] 规则覆盖）：全部 >=4.5（本基线无风险项；透明画布委托宿主的主题不参与）
- 委托宿主默认 tooltip（lucent-orng）：引擎不发标签规则（浮层底透明），由宿主内置深底 + 硬编码白字承载 —— light 画布 #2C2C2E / 白字 13.94，dark 画布 #43454A / 白字 9.59，均 >=4.5。

## IP 设计规范（预置不套用）

| 检查 | 结果 |
| --- | --- |
| 背景家族色相孤岛 | 0 个主题有孤岛 |
| 明暗 straddle（仅记录） | 0 个主题 |
| 角色碰撞 / markdown 同值 | 11 条告警：记档 11 / 待处理 0 |
| markdown 层级同值主题 | 2 个 |
| 语法核心 ΔE<10 | 0 个主题 |
| comment/operator 未退后（待处理） | 0 条 |
| 品牌第二色几何未归类 | 1 个主题 |

逐条告警（✓=已记档为例外，见 exceptions.json）：

| 主题 | code | 状态 | 说明 |
| --- | --- | --- | --- |
| cyberpunk-2077 | roleCollision | ✓ 记档 | 跨组角色取同值：error = diffRemoved（#ff1932） |
| cyberpunk-2077 | brandGeometry | ✓ 记档 | primary 与 secondary 色相差 83.4 度，既非近似(<=45)也非三角(95-145)或互补(>145) |
| dc-comics | roleCollision | ✓ 记档 | 跨组角色取同值：primary = info = markdownLink（#64a2ff） |
| dc-comics | roleCollision | ✓ 记档 | 跨组角色取同值：secondary = borderActive = syntaxFunction（#ffcf40） |
| dc-comics | roleCollision | ✓ 记档 | 同组角色取同值：markdownHeading = markdownStrong（#ffffff） |
| dc-comics | markdownDuplicate | ✓ 记档 | markdown 角色同值，层级被抹平：markdownHeading = markdownStrong |
| doraemon | roleCollision | ✓ 记档 | 同组角色取同值：markdownHeading = markdownEmph = markdownStrong（#0b2e4a） |
| doraemon | markdownDuplicate | ✓ 记档 | markdown 角色同值，层级被抹平：markdownHeading = markdownEmph = markdownStrong |
| hello-kitty | roleCollision | ✓ 记档 | 跨组角色取同值：primary = borderActive（#c8152d） |
| transformers | roleCollision | ✓ 记档 | 同组角色取同值：secondary = info（#38a1ff） |
| transformers | roleCollision | ✓ 记档 | 跨组角色取同值：borderActive = markdownLink（#4db2ff） |

## 与历史 scratch 审计的方向性对账

| 指标 | 本基线 | scratch 审计（D:\Temp\wayfinder-facts-*） |
| --- | ---: | ---: |
| 预置 text-ish 硬性违例（post-repair） | 0 | 311（42 对口径）；本基线 38 对口径 |
| 预置 border→表面 <3 主题数 | 28 | 28（正文字面 border→background） |
| IP 硬性违例（38 对口径） | 0 | 150（42 对口径） |
| IP 浅色代码底最低 text→codeBlockBg | 10.43（one-piece） | ~1.01（sailor-moon） |

口径差异：本基线按 map #115 判尺取 38 对硬性对（text×8、muted/dimmed×3、md6×2、syntax7×codeBlockBg、diff4、onPrimary），scratch 为 42 对（额外把 textMuted→diffBg、syntax→codeHeaderBg 等算作硬性）。差值即这些被本基线降级为信息项/诊断项的对。

## 引擎层修复记录（#120 / T5）

- 自定义 / IP 主题 diff 修复方向与外观一致（#120：单套色主题两半各自按 isDark 修复——light 半向白提亮、dark 半向黑压暗；浅色 IP 的 diff 底不再被压成 #000000，diffRepair 全部记为 light）。
- 宿主 tooltip 标签色硬编码 --dsw-static-neutral-bluish-00（白）、不由 alias 覆盖：引擎改为用 [role="tooltip"] 元素规则按浮层底现算文字色（正文色优先，不足 4.5 退纯黑/白），键帽底由浮层底派生可辨色（不再与浮层底同值）；本基线的 tooltip 诊断项按映射后的实际色评估。
