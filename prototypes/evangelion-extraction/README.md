# 新世纪福音战士主题 · 逐像素取色管线

从三张参考图重新推导 EVA 的 37 个色位，做成**同一 IP 的明暗两册**：
`src/custom-presets/evangelion.json`（深色「夜战」）与 `src/custom-presets/evangelion-day.json`（浅色「晴空」）。

**源图**（不入库，需本机存在）：`C:\Users\辰辰洋洋\Pictures\新世纪福音战士\`

对抗式审查记录（被自己稿推翻的十处、修法与复验）：`../evangelion-adversarial-review.md`

---

## 1. 取样方法：直采 = 平涂区域的代表色

第一版把「直采」定义成**离原图最近的那个像素**，对抗式审查推翻了它：44 个锚点里 **17 个整图只有 1 个同色像素**，
`forest` / `mauve` / `plum` 落在高方差边缘，多条裁切缩略图落在**文字描边**上，颜色名与实际像素对不上。

现在的直采 = **一块平涂区域的代表色**，四条规则同时成立（`build_palette.py`）：

1. **平涂**：取样点 3×3 邻域方差 ≤ 260（`flatness` 记在锚点里，全 0 = 真平涂）；
2. **成片**：同色像素（ΔRGB ≤ 3）在该色相带内 ≥ 20（`support` 记在锚点里）；
3. **不跑偏**：与声明色的色相差 ≤ 30°；
4. **不塌陷**：同色相家族的锚点之间取值互不相同（`FAMILY` 列表）。

支撑像素用 3D 空间哈希（grid 3×3×3，O(27n)）统计，替代了 O(n²) 全图扫描：采样从 20 分钟降到 13 秒。
`_pick_flat` 限制候选数，`DECL_FILE` 指定取样图，保证同输入同输出（连跑两次 SHA256 相同）。

**只有两种来源，配方随值记录**：

| 来源 | 含义 | 数量（37 色位 × 2 半 = 74 值） |
| --- | --- | --- |
| **直采** | hex 就是参考图里一块平涂区域的代表色 | 29 |
| **定比混色** | 两个采样色的固定比例，配方与出处逐条可查 | 45 |

> **不许凭空造色**：任何色位都必须指回上面两种之一；指不回去就是「想象出来的颜色」，直接判负。

## 2. 44 个锚点

`support` = 该色在原图里的同色像素数；`flatness` = 取样点 3×3 邻域方差（0 = 真平涂）。

| hex | 标签 | 取样文件 | support | flatness |
| --- | --- | --- | --- | --- |
| `#181824` | 海报黑底 | 3.jpg | 968 | 0 |
| `#111B3E` | 夜蓝 | 2.jpg | 1278 | 0 |
| `#22223E` | 装甲深蓝 | 3.jpg | 1258 | 0 |
| `#382A5F` | 装甲暗紫 | 3.jpg | 543 | 0 |
| `#1F1D32` | 海报暗紫 | 3.jpg | 1086 | 0 |
| `#151419` | 画幅黑 | 3.jpg | 640 | 0 |
| `#473D94` | 机体主紫 | 2.jpg | 235 | 0 |
| `#443F8F` | 机体紫受光面 | 2.jpg | 188 | 1 |
| `#BB96F5` | 机体高光淡紫 | 3.jpg | 144 | 0 |
| `#BD9CF5` | 机体高光紫 | 3.jpg | 54 | 1 |
| `#7DA0D8` | 天空蓝 | 3.jpg | 1818 | 0 |
| `#C2DEF4` | 浅云蓝 | 3.jpg | 504 | 0 |
| `#A1CCF6` | 高光青 | 3.jpg | 4889 | 0 |
| `#EFF2F7` | 云白 | 3.jpg | 1875 | 0 |
| `#FEFEFE` | 海报纸白 | 2.jpg | 16449 | 0 |
| `#F8FAF9` | 冷纸白 ⚠ | 2.jpg | **0** | 0 |
| `#AFC755` | 同步绿 | 2.jpg | 6 | 9 |
| `#DBFD68` | 荧绿高光 | 3.jpg | 330 | 0 |
| `#73904D` | 深绿 | 2.jpg | 22 | 13 |
| `#77AE5A` | 浅绿受光面 | 3.jpg | 20 | 7 |
| `#2B4429` | 林绿 ⚠ | 2.jpg | **0** | 0 |
| `#FAAB00` | 标题金 | 1.jpg | 52 | 0 |
| `#E69402` | 装甲橙 | 1.jpg | 27 | 4 |
| `#EDA200` | 亮橙高光 | 1.jpg | 25 | 4 |
| `#BA7528` | 赭金 | 2.jpg | 6 | 19 |
| `#7E4E3A` | 机体棕 | 3.jpg | 32 | 5 |
| `#DC4C2A` | 明日香装甲红 | 1.jpg | 318 | 0 |
| `#D8402B` | 装甲红受光面 | 1.jpg | 217 | 0 |
| `#A53C36` | 深红 | 1.jpg | 113 | 1 |
| `#534A4B` | 暗紫棕 | 3.jpg | 43 | 31 |
| `#BFB7C2` | 樱紫灰 | 3.jpg | 83 | 10 |
| `#D7A2B2` | 樱粉 | 3.jpg | 627 | 0 |
| `#7A91BA` | 钢青 | 1.jpg | 178 | 0 |
| `#453D88` | 靛蓝 | 1.jpg | 80 | 15 |
| `#0044A0` | 标题蓝 | 1.jpg | 12 | 8 |
| `#4A5164` | 紫灰 | 3.jpg | 1423 | 0 |
| `#9A97A8` | 雾紫灰 | 1.jpg | 123 | 0 |
| `#74757A` | 云影灰 | 3.jpg | 4245 | 0 |
| `#7F97B9` | 灰蓝 | 1.jpg | 117 | 0 |
| `#C5B3B1` | 暖灰 | 1.jpg | 77 | 0 |
| `#47586C` | 蓝灰 | 3.jpg | 136 | 0 |
| `#E8E8F2` | 霾 | 3.jpg | 504 | 0 |
| `#87AFE3` | 淡蓝 | 3.jpg | 2089 | 0 |
| `#6C7270` | 青灰 | 3.jpg | 93 | 5 |

⚠ **两个锚点是声明值，不是取样值**：`冷纸白 #F8FAF9` 与 `林绿 #2B4429` 在三张图里找不到成片平涂面
（林绿几乎全被 JPEG 振铃打碎，冷纸白只有零星像素）。它们被保留为声明值，并在预览页锚点卡上
**如实标注**「三张图里没有成片平涂面 · 保留声明值」——不伪装成取样结果。

## 3. 判尺

仓库硬性判尺同 `docs/theme-audit/criteria.md`：**38 条正文对 ≥4.5:1 + 15 条 UI 对 ≥3:1**，
外加 IP 设计规范 6 项（角色同值碰撞 / markdown 同值 / 背景色相孤岛 / 品牌几何 / 语法核心 ΔE76 ≥ 10 / comment·operator 退后）。

**另外加了 4 类真机判据**（`build_palette.py` 的 `evaluate()`）——这四类是审计器测不到、但真机里真实存在的失败：

| 判据 | 复现方式 |
| --- | --- |
| `markdownCode@inlineChip` | 行内码芯片底 = `mix(backgroundPanel, #7F7F7F, 0.15)`（原型就是这么叠的） |
| `secondary@secondaryPill` | 次按钮药丸底 = `mix(background, secondary, 0.20)` |
| `contrastText(<brand>)@<brand>` | 六个品牌色会被引擎当填充色用，按引擎 `contrastText`（BT.601 luma > 0.6 → `#141414`，否则 `#F4F4F5`）反查文字色 |
| `textMuted@diff*LineNumberBg` | 行号槽里放的是次级文字，不是正文 |

`borderActive@focusRing33`（焦点环 = `borderActive` 叠 33% alpha）只记诊断：33% alpha 下任何色到不了 3:1
（白@33% 压暗底上限 2.66:1），属原型渲染属性，不是色板缺陷。

## 4. 跑法

```powershell
$py = 'C:\Users\辰辰洋洋\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe'
$node = 'C:\Users\辰辰洋洋\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'

& $py .\extract.py       # 三图 k-means 主色 + 高饱和/亮部/暗部分组 → extracted.json
& $py .\census.py        # 按色相扇区做材质普查 → 控制台
& $py .\build_palette.py # 44 锚点重取 + 37 色位 × 明暗两半推导 + 判据自检 → palette.json / report.txt
& $py .\gen.py           # 生成 ../evangelion-theme-preview.html
& $node .\validate.ts    # 用仓库引擎复算两半的 38 硬对 + 15 UI 对 + IP 设计规范
& $py .\write_preset.py  # 写 src/custom-presets/evangelion.json + evangelion-day.json（单行 JSON / 字母序 / 无 BOM / 无尾换行）
& $node scripts/audit-themes.ts --check   # 落地后的仓库级门禁
```

`write_preset.py` 接受一个输出目录参数，**干跑**（不碰仓库）：

```powershell
& $py .\write_preset.py D:\Temp\eva-preset-dryrun
```

`palette.json` 是**结论**（37 色位 × 明暗两半终值 + 每个色位的锚点与推导方式 + 44 个锚点的取色现场裁切），
`extracted.json` 是**素材普查结论**，`gen.py` / `write_preset.py` / `validate.ts` 都读 `palette.json`。

## 5. 复核

```powershell
node scripts/audit-themes.ts --check     # 落地后：EVA 两册硬对/UI 对 0 违例
npm test
```

`validate.ts` 与仓库审计脚本同口径（`normalizeThemeColors` → `ensureDiffContrast` → 8 表面 alpha 合成 →
`labelDimmed = flatten(withAlpha(textMuted, 0.8), bg)`），并且逐条对齐过 `scripts/audit-themes.ts` 的输出。

**真机复核**（把两套色板灌进 `prototypes/custom-editor-83.prototype.html`，headless Chrome 取真实合成底色）：
深浅各 42 个文本节点，**低于 4.5:1 的 0 个**（第一版有三处硬失败：行内码芯片 4.46 / 浅色药丸 3.18 / 浅色信息按钮 3.62）。

## 6. 设计要点：夜战 / 晴空

- **深色半是「夜战」，浅色半是「晴空」**。不是把深色反相，而是同一 IP 的两个场景：
  夜战取海报夜景（黑底 `#181824` + 机体高光 + 标题金），晴空取白昼（云白 `#EFF2F7` / 纸白 `#FEFEFE`），
  两半各自从原图取各自的像素，**两半各 37 个色位互不同值**。
- **色族各领一角**（深色半 → 浅色半）：
  - 紫族 = 品牌：`primary` 机体高光淡紫 `#BB96F5` → 机体主紫 `#473D94`；`markdownCode` `#B98EA1` → `#635696`；`syntaxType` 樱粉 `#D7A2B2` → `#3F3C47`。
  - 蓝族 = 交互与链接：`info` 天空蓝 `#7DA0D8` → `#526B91`；`syntaxFunction` 浅云蓝 `#C2DEF4` → `#403A81`；`markdownLink` 高光青 `#A1CCF6` → 标题蓝 `#0044A0`；`borderActive` 钢青 `#7A91BA` → `#6A7FA7`。
  - 金橙族 = 数值与标题：`warning` 标题金 70% + 赭金 30% = `#E79B0C` → `#734F31`；`syntaxNumber` 赭金 65% + 标题金 35% = `#D0881A` → `#5D3F3B`；`markdownHeading` 标题金 `#FAAB00` → `#323073`。
  - 红族 = 危险与删除：`error` 装甲红受光面 65% + 云白 35% = `#E07E72` → 深红 `#A53C36`；`diffRemoved` `#DD6758` → `#803438`；`secondary` 樱粉 68% + 装甲红 32% = `#D98686` → `#4E526C`。
  - 绿族 = 成功与新增：`success` 荧绿高光 `#DBFD68` → `#4A5F47`；`diffAdded` 同步绿 `#AFC755` → 林绿 `#2B4429`；`syntaxString` 浅绿受光面 `#77AE5A` → `#243A2E`。
- **同族不同岗，靠明度台阶分开，不靠换色相**。绿族在深色半是四级明度台阶：
  深绿 `#73904D`（运算符，退后）< 浅绿受光面 `#77AE5A`（字符串）< 同步绿 `#AFC755`（新增行）< 荧绿高光 `#DBFD68`（成功态）；
  斜体 `#97AD50` 刻意离开绿族（荧绿 × 海报黑），落在成功态与新增行之间，不再比标题还抢眼。
  diff 族内部再分两级底色（行底染色 12%、行号槽染色 6%），行号槽比行底更沉，两者前景对比都过 4.5，**引擎不会改写**。
- **六品牌色必须落在 BT.601 luma 0.6 的同一侧**。引擎的 `contrastText` 会用品牌色当按钮底再反查文字色，
  luma 0.4–0.6 是陷阱区（第一版浅色 info `#5F7FC0` luma 0.489 → 白字只有 3.62）。
- **对比度结果**（`validate.ts` 实测，判尺 38 硬对 + 15 UI 对全绿）：
  - 深色半「夜战」：正文 13.92:1、主按钮反白 7.71:1、报错色 on 页面底 6.19:1；最紧三条 `borderActive@backgroundElement` 4.65（UI）、`diffRemoved@diffRemovedBg` 4.65、`labelDimmed@backgroundElement` 4.90；语法核心最小 ΔE76 **16.6**（syntaxKeyword×syntaxType）；comment 5.60 / operator 5.08 ≤ 核心最低 6.30（退后成立）；品牌几何 96.6°（三角色）；背景基色相 240.0°。
  - 浅色半「晴空」：正文 14.97:1、主按钮反白 8.09:1、报错色 on 页面底 5.67:1；最紧 `borderActive@background` 3.59（UI）；语法核心最小 ΔE76 **11.0**（syntaxKeyword×syntaxFunction）；comment 6.91 / operator 5.59 ≤ 核心最低 7.45；品牌几何 14.9°（类比）；背景基色相 217.5°。

## 7. 已知缺口

- **浅色半是第二套主题，不是深色半的取反**。两半各自从原图取像素（`colors` / `colorsLight` 互不相交），
  同一个语义角色在两半可以落在不同色族（例：`markdownEmph` 深色半 `#97AD50`，浅色半 `#06367E`）。
  想要「一套配色两套明暗」的话，这套不满足。
- **两个锚点是声明值**（冷纸白 / 林绿），见 §2 的 ⚠。
- **焦点环到不了 3:1**：真机里焦点环 = `borderActive` 叠 33% alpha，任何色板都过不了（白@33% 压暗底上限 2.66:1）。要改得动原型。
- **红色 diff 的可见度有客观上限**：图里最纯的红 `#DC4C2A`（BT.601 L ≈ .2026）在任何染色行底上都到不了 4.5:1；
  旧预置那种「一眼就跳出来」的 `#ff7a93` 是编出来的。本稿只保证 4.5:1 可读 + 行号槽 ΔE 分离。
- **`src/custom-presets/evangelion.json` 已存在且已发布**（霓虹版绿/紫预设）。本管线的 `write_preset.py` 是
  **原地替换**它：id 仍是 `evangelion`、name 仍是「新世纪福音战士」，只换色板。落地时要在 PR 里写明「重绘 EVA 预设配色」。
- **落地还要改仓库另外两处**（脚本只打印清单，不代改）：
  `src/engine/ip-presets.ts` 加 import + `IP_PRESETS_RAW` 条目（保持字母序），
  `tests/ip-presets.test.ts` 的 `EXPECTED_IDS`、`countIpPresets()` 与深/浅色计数断言。
  改完必须重跑 `npm run build:artifacts`（`client.js` 内联的 IP id 清单要含新 id），再 `node scripts/audit-themes.ts --check` 与 `npm test`。
- `census.py` / `extract.py` 需要本机存在那三张参考图；换图重跑会整体改变锚点吸附结果。
- **色相占比有口径依赖**：`census.py` 的主口径 B（通道极差 ≤25 记中性、绿感优先、HLS 色相带）实测
  合计红 14.12% / 绿 2.48% / 蓝紫 35.09% / 琥珀 8.08% / 中性 37.61%，预览页文案引用的就是这一组数
  （红 14.1% / 绿 2.5%）；换成宽/严口径会有 ±1 个百分点的浮动，`census.py` 打印了敏感性表。
