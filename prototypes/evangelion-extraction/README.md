# 新世纪福音战士主题 · 逐像素取色管线

从三张参考图重新推导 EVA 的 37 个色位，做成**同一 IP 的明暗两册**：
`src/custom-presets/evangelion.json`（深色「夜战」）与 `src/custom-presets/evangelion-day.json`（浅色「晴空」）。

**源图**（不入库，需本机存在）：`C:\Users\辰辰洋洋\Pictures\新世纪福音战士\`

对抗式审查记录（被自己稿推翻的缺陷、修法与复验）：`../evangelion-adversarial-review.md`

> 本页所有数字都能在 `palette.json` / `report.txt` / `validate.ts` 的输出里对上；凡属**复算**得到的结论会单独标注。

---

## 1. 取样方法：直采 = 平涂区域的代表色

第一版把「直采」定义成**离原图最近的那个像素**，对抗式审查推翻了它：44 个锚点里 **17 个整图只有 1 个同色像素**，
`forest` / `mauve` / `plum` 落在高方差边缘，多条裁切缩略图落在**文字描边**上，颜色名与实际像素对不上。

现在的直采 = **一块平涂区域的代表色**，四条规则同时成立（`build_palette.py`）：

1. **平涂**：取样点 3×3 邻域方差 ≤ 260（`flatness` 记在锚点里，全 0 = 真平涂）；
2. **成片**：同色像素（ΔRGB ≤ 3）在该色相带内 ≥ 20（`support` 记在锚点里）；
3. **不跑偏**：与目标色的色相差 ≤ 30°；
4. **不塌陷**：同色相家族的锚点之间取值互不相同（`FAMILY` 列表）。

支撑像素用 3D 空间哈希（grid 3×3×3，O(27n)）统计，替代了 O(n²) 全图扫描：采样从 20 分钟降到 13 秒。
`_pick_flat` 限制候选数，`DECL_FILE` 指定取样图，保证同输入同输出（连跑两次 SHA256 相同）。

**只有两种来源，配方随值记录**（`slots[*].recipe.kind`）：

| 来源 | 含义 | 深色半 | 浅色半 | 合计（37 色位 × 2 半 = 74 值） |
| --- | --- | --- | --- | --- |
| **直采** | hex 就是参考图里一块平涂区域的代表色 | 13 | 12 | **25** |
| **定比混色** | 两个采样色的固定比例，配方与出处逐条可查 | 24 | 25 | **49** |

> **不许凭空造色**：任何色位都必须指回上面两种之一；指不回去就是「想象出来的颜色」，直接判负。
> 这条从第四轮起不再靠自觉——每个出货色都要过**混色闸**（§3.3 a），机器说了算。

## 2. 44 个锚点

每个锚点记三件事：**取样色**（原图里取到的像素）、**目标色**（设计意图上它该是什么）、**支持度**。

| 字段 | 含义 |
| --- | --- |
| `hex` | 取样色：在指定图上、锚点附近找到的平涂代表色 |
| `target` | **目标色**：设计意图（原来叫 `declared`，第四轮改名，理由见下） |
| `targetIsPixel` | 目标色本身是不是原图像素（`true` / `false`） |
| `support` | 该取样色在三张原图里的同色像素数 |
| `flatness` | 取样点 3×3 邻域方差（0 = 真平涂） |

> **为什么改名**：`declared` 这个名字暗示「我们取到了它」，但 44 个锚点里 **42 个出货 hex ≠ target**，
> 且 **39 个 target 本身不是原图像素** —— 只有 5 个是：装甲深蓝 `#222946`、海报纸白 `#FFFFFF`、
> 冷纸白 `#F8FAF9`、紫灰 `#4A4379`、蓝灰 `#55667A`。所以 target 只能叫**目标**，不能当**取样证据**。
> （复算：三张原图全部 239,897 个唯一像素做最近邻 ΔE76，39 个非像素 target 到最近真实像素的偏差中位约 0.5、最大约 2.2 —— 够近，但确实不是同一个像素。）

| hex（取样色） | target（目标色） | target 是原图像素 | 标签 | 取样文件 | support | flatness |
| --- | --- | --- | --- | --- | --- | --- |
| `#181824` | `#0A091A` | 否 | 海报黑底 | 3.jpg | 968 | 0 |
| `#111B3E` | `#141A41` | 否 | 夜蓝 | 2.jpg | 1278 | 0 |
| `#22223E` | `#222946` | 是 | 装甲深蓝 | 3.jpg | 1258 | 0 |
| `#382A5F` | `#34304D` | 否 | 装甲暗紫 | 3.jpg | 543 | 0 |
| `#1F1D32` | `#15142A` | 否 | 海报暗紫 | 3.jpg | 1086 | 0 |
| `#151419` | `#171726` | 否 | 画幅黑 | 3.jpg | 640 | 0 |
| `#473D94` | `#463C99` | 否 | 机体主紫 | 2.jpg | 235 | 0 |
| `#443F8F` | `#4A3A9E` | 否 | 机体紫受光面 | 2.jpg | 188 | 1 |
| `#BB96F5` | `#BA99F5` | 否 | 机体高光淡紫 | 3.jpg | 144 | 0 |
| `#BD9CF5` | `#BA97F8` | 否 | 机体高光紫 | 3.jpg | 54 | 1 |
| `#7DA0D8` | `#7FA8E4` | 否 | 天空蓝 | 3.jpg | 1818 | 0 |
| `#C2DEF4` | `#ADCEEC` | 否 | 浅云蓝 | 3.jpg | 504 | 0 |
| `#A1CCF6` | `#A3D9F4` | 否 | 高光青 | 3.jpg | 4889 | 0 |
| `#EFF2F7` | `#EBF2FB` | 否 | 云白 | 3.jpg | 1875 | 0 |
| `#FEFEFE` | `#FFFFFF` | 是 | 海报纸白 | 2.jpg | 16449 | 0 |
| `#F8FAF9` | `#F8FAF9` | 是 | 冷纸白 ⚠ | 2.jpg | **0** | 0 |
| `#AFC755` | `#A4CA3C` | 否 | 同步绿 | 2.jpg | 6 | 9 |
| `#DBFD68` | `#D9FF5D` | 否 | 荧绿高光 | 3.jpg | 330 | 0 |
| `#73904D` | `#709E35` | 否 | 深绿 | 2.jpg | 22 | 13 |
| `#77AE5A` | `#86C467` | 否 | 浅绿受光面 | 3.jpg | 20 | 7 |
| `#2B4429` | `#2B4429` | 否 | 林绿 ⚠ | 2.jpg | **0** | 0 |
| `#FAAB00` | `#FCAA00` | 否 | 标题金 | 1.jpg | 52 | 0 |
| `#E69402` | `#ED9107` | 否 | 装甲橙 | 1.jpg | 27 | 4 |
| `#EDA200` | `#F69604` | 否 | 亮橙高光 | 1.jpg | 25 | 4 |
| `#BA7528` | `#CD8A25` | 否 | 赭金 | 2.jpg | 6 | 19 |
| `#7E4E3A` | `#906244` | 否 | 机体棕 | 3.jpg | 32 | 5 |
| `#DC4C2A` | `#E23423` | 否 | 明日香装甲红 | 1.jpg | 318 | 0 |
| `#D8402B` | `#E74A22` | 否 | 装甲红受光面 | 1.jpg | 217 | 0 |
| `#A53C36` | `#A02639` | 否 | 深红 | 1.jpg | 113 | 1 |
| `#534A4B` | `#634858` | 否 | 暗紫棕 | 3.jpg | 43 | 31 |
| `#BFB7C2` | `#BC9DBE` | 否 | 樱紫灰 | 3.jpg | 83 | 10 |
| `#D7A2B2` | `#CE95AB` | 否 | 樱粉 | 3.jpg | 627 | 0 |
| `#7A91BA` | `#7A96B1` | 否 | 钢青 | 1.jpg | 178 | 0 |
| `#453D88` | `#344D94` | 否 | 靛蓝 | 1.jpg | 80 | 15 |
| `#0044A0` | `#044196` | 否 | 标题蓝 | 1.jpg | 12 | 8 |
| `#4A5164` | `#4A4379` | 是 | 紫灰 | 3.jpg | 1423 | 0 |
| `#9A97A8` | `#86869B` | 否 | 雾紫灰 | 1.jpg | 123 | 0 |
| `#74757A` | `#70767F` | 否 | 云影灰 | 3.jpg | 4245 | 0 |
| `#7F97B9` | `#979BA9` | 否 | 灰蓝 | 1.jpg | 117 | 0 |
| `#C5B3B1` | `#B0A3A3` | 否 | 暖灰 | 1.jpg | 77 | 0 |
| `#47586C` | `#55667A` | 是 | 蓝灰 | 1.jpg | 136 | 0 |
| `#E8E8F2` | `#D5DAE3` | 否 | 霾 | 3.jpg | 504 | 0 |
| `#87AFE3` | `#A2B6E1` | 否 | 淡蓝 | 3.jpg | 2089 | 0 |
| `#6C7270` | `#6D7B7B` | 否 | 青灰 | 3.jpg | 93 | 5 |

⚠ **两个锚点是声明值，不是取样值**：`冷纸白 #F8FAF9` 与 `林绿 #2B4429` 在三张图里找不到成片平涂面
（林绿几乎全被 JPEG 振铃打碎，冷纸白只有零星像素）。它们被保留为声明值，并在预览页锚点卡上
**如实标注**「三张图里没有成片平涂面 · 保留声明值」——不伪装成取样结果。
两者还有一处可查的差别：冷纸白的目标色 `#F8FAF9` **确实是原图像素**（只是没有成片平涂面），
林绿的目标色 `#2B4429` 在三张图里**连一个像素都不是**（`targetIsPixel = false`）。

## 3. 判尺

### 3.1 仓库判尺（`validate.ts`，用仓库引擎复算两半）

仓库硬性判尺同 `docs/theme-audit/criteria.md`：**38 条正文对 ≥4.5:1 + 15 条 UI 对 ≥3:1**，
外加 IP 设计规范 6 项（角色同值碰撞 / markdown 同值 / 背景色相孤岛 / 品牌几何 / 语法核心 ΔE76 ≥ 10 / comment·operator 退后）。

`validate.ts` 与仓库审计脚本同口径（`normalizeThemeColors` → `ensureDiffContrast` → 8 表面 alpha 合成 →
`labelDimmed = flatten(withAlpha(textMuted, 0.8), bg)`），并且逐条对齐过 `scripts/audit-themes.ts` 的输出。

当前复算结果：

| | 深色半「夜战」 | 浅色半「晴空」 |
| --- | --- | --- |
| 硬性对 | **38/38** | **38/38** |
| UI 对 | **15/15** | **15/15** |
| 设计规范告警 | **0** | **0** |
| 引擎 diff 修复 | **无需改动** | **无需改动** |
| 背景基色相 | 226.7° | 217.5° |
| 品牌几何（primary × secondary） | 4.8°（analogous 近似） | 3.1°（analogous 近似） |
| 语法核心最小 ΔE76 | **16.3**（syntaxKeyword × syntaxType） | **14.9**（syntaxFunction × syntaxType） |
| 退后 | comment 4.78 / operator 5.04 ≤ 核心最低 7.16 | comment 5.33 / operator 5.60 ≤ 核心最低 5.89 |

### 3.2 配色自带判据（`build_palette.py` 的 `evaluate()`）

配色自己再判一遍，两半各 365 行台账、共 **730 行**（`palette.json` 的 `checks`）：

| 类别 | 条数（每半） | 阈值 | 作用 |
| --- | --- | --- | --- |
| `hard` | 46 | ≥4.5:1 | 正文/次级/markdown/语法/diff/按钮文字等硬性对比度 |
| `ui` | 15 | ≥3:1 | 品牌色与激活边框在底色上的可辨度 |
| `diag` | 5 | — | 诊断级，不判负 |
| `mix` | 37 | ΔE76 ≤ 2.0 | **混色闸**（§3.3 a） |
| `surface` | 28 | ΔE76 ≥ 2.0 | **表面分离**（§3.3 b） |
| `cvd` | 82 | ≥5 / ≥8 | **色觉分离**（§3.3 c） |
| `cvdA` | 85 | — | 去色盲诊断行，不设硬阈值 |
| `hier` | 2 | ΔL\* ≥ 6 | 层级台阶（§3.3 c） |
| `recede` | 1 | — | 退后记账（§3.3 c） |
| `matrix` | 64 | 诊断 4.5:1 | 文字类角色 × 8 表面扩展矩阵 |

另外加了 4 类真机判据——这四类是审计器测不到、但真机里真实存在的失败：

| 判据 | 复现方式 |
| --- | --- |
| `markdownCode@inlineChip` | 行内码芯片底 = `mix(backgroundPanel, #7F7F7F, 0.15)`（原型就是这么叠的） |
| `secondary@secondaryPill` | 次按钮药丸底 = `mix(background, secondary, 0.20)` |
| `contrastText(<brand>)@<brand>` | 引擎 `contrastText`（BT.601 luma > 0.6 → `#141414`，否则 `#F4F4F5`）反查文字色；**只有 primary / info 是填充按钮底**（§3.5） |
| `textMuted@diff*LineNumberBg` | 行号槽里放的是次级文字，不是正文 |

`borderActive@focusRing33`（焦点环 = `borderActive` 叠 33% alpha）只记诊断：33% alpha 下任何色到不了 3:1
（白@33% 压暗底上限 2.66:1），属原型渲染属性，不是配色缺陷。

### 3.3 第四轮新增的四类机器约束

第四轮之前，判尺只能判「对比度够不够」和「颜色差得开不开」，判不了「这个色是不是编出来的」。
于是补了四类判据，每一类都有明确的失败理由：

**a) 混色闸 —— 每个出货色必须落在原图真实像素附近（ΔE76 ≤ 2.0，否则构建失败）**

理由是「不许造色」这条原则本身靠自觉守不住：定比混色**本身就能造色**。把 44 个锚点两两配对、每对再取
3 种比例（0.3 / 0.5 / 0.7），一共 2,838 个混色，里面有一批 ΔE76 明显超过 5；最极端的一例是
`violetLit 70% + redHot 30% = #C47CB8`（复算 ΔE76 ≈ 16），原图里没有任何相近像素。
所以「不许造色」必须由机器闸保证。

当前：**74 个出货色全部过闸**，离 2.0 都有余量；最远的一条是浅色半 `syntaxNumber` = **1.38**
（深色半最远是 `diffRemoved` = 1.14、`syntaxNumber` = 1.06）。

**b) 表面分离 —— 8 个背景表面槽两两 ΔE76 ≥ 2.0**

理由：对比度判尺只管「文字看不看得清」，管不了「两个面板是不是撞成同一块」。
此前浅色半 28 对表面里有 27 对 ΔE < 10（塌成一张纸），深色半 `bubbleBg` / `inputBg` 只差 0.90 —— 肉眼分不出哪块是哪块。

当前：两半 28 对全部过闸，最紧的一对是深色半 `background × inputBg` = **4.73**、浅色半
`background × backgroundElement` = **4.23**，离阈值 2.0 仍有 2 以上余量。

**c) 色觉分离 —— 按同屏共现分组，分三级**

分组是 `PROSE` / `CODE` / `STATUS` / `DIFF`（不是全局两两比：不会同屏出现的颜色没必要互相区分）。
分级：

| 级别 | 范围 | 要求 | 当前最紧 |
| --- | --- | --- | --- |
| `pure` | 语法色之间、`diffAdded × diffRemoved`、STATUS 内除 primary×secondary | 常态 ΔE76 ≥ 8 **且** protan/deutan/tritan 模拟 ΔE ≥ 8 | 深色半 `primary × info` = 9.11（35 对/半）；浅色半 `syntaxFunction × syntaxOperator` = 8.91 |
| `decor` | 还有别的通道（字号/粗细/斜体/芯片底）的配对 | 模拟 ΔE ≥ 5 | 深色半 `text × syntaxType` = 7.22（47 对/半）；浅色半 `markdownEmph × markdownBlockQuote` = 7.56 |
| `hier` | 层级步进（正文 × 次级） | ΔL\* ≥ 6 | 正文 × 次级：深色半 ΔL\* = 8.03、浅色半 9.30 |
| `recede` | `syntaxComment × syntaxOperator` | **只记账，不判可分** | ΔE76 深 11.01 / 浅 20.71 |

为什么 `recede` 不判可分：两者都是低显著度记号，仓库判尺 `docs/theme-audit/criteria.md` 第 71 行只要求
「comment 与 operator 在 codeBlockBg 上**退后**（对比度不得高于任一核心语法角色）」，**不要求二者互相可分**。
把它判成硬违例是自己加码，加码就要自证有据 —— 没有。

一个实现细节：`hier` 级目前只命中「正文 × 次级」这一对（每半两行：PROSE 组与 DIFF 组各出一行）。
「正文 × 加粗」这一对在实现里落到了 `decor` 级（模拟 ΔE 深 13.56 / 浅 10.11，阈值 5 通过），
所以「加粗比正文更重」这条层级语义目前没有硬判据，只是碰巧过线。

为什么**去色盲（achroma）只作诊断行、不设硬阈值**：要求每一对在完全去色下 ΔE ≥ 8，等价于要求每个角色
都有 ΔL\* ≥ 8 的明度阶梯；37 色的 UI 做不到。真到那一步就是废掉整套配色。当前 85 对/半的 achroma 诊断行里
最差的确实是 0（深色半 `markdownCode × syntaxString`、浅色半 `markdownHeading × markdownLink`）——记下来，不判负。

**d) 余量账本 —— 每条硬性检查都要写清「距阈值还差多少」**

只记「过了」是不够的：过线 0.05 的条目和过线 5 的条目，风险完全不同。余量 = 实测值 − 阈值。

当前余量最薄的条目：

| 半 | 条目 | 实测 | 阈值 | 余量 |
| --- | --- | --- | --- | --- |
| 深色半 | `syntaxComment@codeBlockBg` | 4.78 | 4.5 | **0.28** |
| 深色半 | `syntaxOperator@codeBlockBg` | 5.04 | 4.5 | **0.54** |
| 深色半 | `labelDimmed@backgroundElement` | 5.53 | 4.5 | 1.03 |
| 浅色半 | `syntaxComment@codeBlockBg` | 5.33 | 4.5 | **0.83** |
| 浅色半 | `syntaxOperator@codeBlockBg` | 5.60 | 4.5 | 1.10 |
| 浅色半 | `markdownCode@inlineChip` | 5.71 | 4.5 | 1.21 |

余量 < 0.6 的条目只有深色半那两条（< 1.0 的也是这两条）；浅色半最薄的一条余量 0.83。

### 3.4 语义色相带 + 色度下限（告警级，不是硬失败）

判尺只管「可辨性」，**色族**是「设计意图」：状态色得是红/琥珀/绿，链接得是蓝，注释得是中性灰。
所以 `HUE_BAND` + `CHROMA_MIN` 越界只记**设计告警**，不算硬失败：

- `HUE_BAND`：error 330–30、warning 20–75、success 60–170、diffRemoved 330–30、diffAdded 60–170、
  primary 240–300、info 185–235、secondary 250–320、markdownLink 185–235、markdownHeading 30–70、
  markdownEmph 60–180、markdownCode 300–360、markdownBlockQuote 185–260、syntaxComment 180–260、
  syntaxOperator 180–300、syntaxKeyword 240–320、syntaxFunction 185–235、syntaxType 320–360、
  syntaxString 60–170、syntaxNumber 20–75。
- `CHROMA_MIN`：error/warning/success/diffRemoved/diffAdded 25；primary/info/markdownLink/markdownHeading 20；
  secondary/markdownCode 12；markdownEmph 15；syntaxKeyword/syntaxFunction/syntaxString/syntaxNumber 15；syntaxType 12。

两条边界规则：

- **色度 < 6 视为无彩色 → 不判色相**。无彩色没有可靠色相，拿它去卡色相带只会误判（第四轮真踩过）。
- **运算符色相带放宽到 (180,300)（含蓝紫）**：蓝紫运算符是通行做法（Dracula / One Dark 都是），
  而「中性灰运算符」在窄亮度窗里无法同时满足 ΔE ≥ 8 与模拟 CVD ΔE ≥ 8 —— 放宽的是判尺，不是放水。

### 3.5 状态色不作填充按钮底

引擎 `contrastText` 的前提是「拿品牌色当按钮底再反查文字色」。但真机原型
`prototypes/custom-editor-83.prototype.html` 第 865 / 867 行里**只有 primary 与 info 是填充按钮底**；
error / warning 在第 869 / 870 行只做**文字 + 圆点**。所以 `FILLED_BUTTON_ROLES = ['primary', 'info']`，
secondary / success / warning / error 的 `contrastText` 检查**降为诊断**。

代价是台账里有两条诊断没过（深色半 `contrastText(warning)` = 3.51、`contrastText(error)` = 2.65）——
按 F17 的结论，这两条本来就是陷阱信号：**纯红/纯琥珀做填充底必然掉到 3:1 附近**，引擎靠 `contrastText`
反查的 `#F4F4F5` 白字压不住。浅色半同样两条都过（6.08 / 12.7）。

### 3.6 扩展诊断（4 条）

「文字类角色 × 8 表面」共 128 对扩展矩阵里有 **4 对低于 4.5:1**，全在**浅色半**、且都发生在
**markdown 角色压到浅色代码头带上**（诊断级，非共屏场景）：

| 配对 | 实测 |
| --- | --- |
| `markdownCode@inputBg` | 4.38 |
| `markdownCode@codeHeaderBg` | 3.75 |
| `markdownEmph@codeHeaderBg` | 3.88 |
| `markdownBlockQuote@codeHeaderBg` | 4.36 |

### 3.7 当前判尺结果

- `build_palette.py` 重建：**硬性违例 0 · 设计告警 0 · 扩展诊断 4**。
- `validate.ts` 复算两半：深色半「夜战」硬性 **38/38**、UI **15/15**、设计告警 **0**；
  浅色半「晴空」同；两半各自「**引擎 diff 修复：无需改动**」。

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

`palette.json` 是**结论**（37 色位 × 明暗两半终值 + 每个色位的锚点与推导方式 + 44 个锚点的取色现场裁切
+ 730 行判据台账），`extracted.json` 是**素材普查结论**，`gen.py` / `write_preset.py` / `validate.ts` 都读 `palette.json`。

## 5. 复核

```powershell
node scripts/audit-themes.ts --check     # 落地后：EVA 两册硬对/UI 对 0 违例
npm test
```

**真机复核**（把两套配色灌进 `prototypes/custom-editor-83.prototype.html`，headless Chrome 取真实合成底色）：
深浅各 **42 个文本节点，低于 4.5:1 的 0 个**。实测值：

| 位置 | 深色半 | 浅色半 |
| --- | --- | --- |
| 正文 on 页面底 | 12.83 | 15.66 |
| 行内码芯片 | 6.16 | 5.71 |
| 次按钮药丸 | 6.00 | 6.95 |
| 主按钮（`contrastText(primary)`） | 7.71（`#141414` on `#BB96F5`） | 8.09（`#F4F4F5` on `#473D94`） |
| 信息按钮（`contrastText(info)`） | 6.92（`#141414` on `#7DA0D8`） | 14.39（`#F4F4F5` on `#0F2242`） |
| 错误色 on 页面底 | 6.29（`#E3796A` on `#151419`） | 12.44 |
| 警告色 on 页面底 | 4.75 | 5.96 |

**预览页**：`../evangelion-theme-preview.html`（当前 405127 bytes · 37 slots · 128 matrix rows · 44 anchors）。
第四轮新增：顶部 hero 色片改成**随模式切换**（hex 与标签都随深/浅两半切换）——之前半屏时英雄色片永远显示
深色半的 hex。浅色半的标签是「深林绿 · 同步绿压暗」「机体紫 · 暗调」「暗红墨 · 装甲红压暗」
「夜空蓝 · 云影压暗」「铜金 · 装甲橙压暗」。
第四轮末另修三处预览页自身缺陷：锚点卡改读 `a.target`（原先两个声明值锚点渲染成 `undefined`）；
「未过」计数按**三级口径**拆开（判尺未过 0 / 诊断级未达标 6 / 记账 172，总条目 730），
`info` 行改用中性「记账」徽章；工具输出块的写死文案（234 条 / 18 对 / 0 未过）改成按台账现算。

## 6. 设计要点：夜战 / 晴空

- **深色半是「夜战」，浅色半是「晴空」**。不是把深色反相，而是同一 IP 的两个场景：
  夜战取海报夜景（黑底 `#151419` + 机体高光 + 标题金），晴空取白昼（云白 `#EFF2F7` / 纸白 `#FEFEFE`），
  两半各自从原图取各自的像素，**两半各 37 个色位互不同值**（同色位深浅不同 hex，逐位核对过）。
- **色族各领一角**（深色半 → 浅色半，括号里是配方来源与配比）：
  - 紫族 = 品牌：`primary` 机体高光淡紫 `#BB96F5`（直采）→ 机体主紫 `#473D94`（直采）；
    `secondary` 樱紫灰×机体高光淡紫 75/25 `#BEAFCF` → 紫灰×装甲暗紫 30/70 `#3D3660`；
    `markdownCode` 樱粉×灰蓝 85/15 `#CAA0B3` → 樱粉×暗紫棕 15/85 `#67575A`；
    `syntaxType` 樱粉×云白 70/30 `#DEBAC7` → 樱粉×画幅黑 30/70 `#4F3F47`。
  - 蓝族 = 交互与链接：`info` 天空蓝 `#7DA0D8`（直采）→ 标题蓝×画幅黑 30/70 `#0F2242`；
    `syntaxFunction` 浅云蓝 `#C2DEF4`（直采）→ 海报暗紫×蓝灰 15/85 `#414F63`；
    `markdownLink` 高光青 `#A1CCF6`（直采）→ 标题蓝 `#0044A0`（直采）；
    `borderActive` 钢青 `#7A91BA`（直采）→ 装甲暗紫 `#382A5F`（直采）。
  - 金橙族 = 数值与标题：`warning` 装甲橙×海报黑底 75/25 `#B2750A` → 海报黑底×亮橙高光 55/45 `#785614`；
    `syntaxNumber` 标题金×云白 90/10 `#F9B219` → 标题金×夜蓝 34/66 `#604C29`；
    `markdownHeading` 标题金 `#FAAB00`（直采）→ 亮橙高光×海报暗紫 30/70 `#5D4523`。
  - 红族 = 危险与删除：`error` 海报纸白×装甲红受光面 30/70 `#E3796A` → 深红×海报黑底 30/70 `#422329`；
    `diffRemoved` 装甲红受光面×樱粉 25/75 `#D78A90` → 装甲红受光面×夜蓝 30/70 `#4D2638`。
  - 绿族 = 成功与新增：`success` 荧绿高光 `#DBFD68`（直采）→ 林绿×荧绿高光 95/5 `#344D2C`；
    `diffAdded` 同步绿 `#AFC755`（直采）→ 林绿 `#2B4429`（直采）；
    `syntaxString` 浅绿受光面×云白 85/15 `#89B872` → 林绿×夜蓝 75/25 `#243A2E`。
- **同族不同岗，靠明度台阶分开，不靠换色相**。绿族在深色半是四级明度台阶：
  深绿 `#73904D`（锚点）< 浅绿受光面 `#77AE5A`（字符串来源）< 同步绿 `#AFC755`（新增行）< 荧绿高光 `#DBFD68`（成功态）；
  斜体 `#97AD50`（荧绿高光 × 海报黑底 65/35）刻意压到比新增行 `#AFC755` 更暗一档，只借一点绿意，不抢标题。
  diff 族内部再分两级底色（行底染色 12%、行号槽染色 6%），行号槽比行底更沉，两者前景对比都过 4.5，**引擎不会改写**。
- **六品牌色必须落在 BT.601 luma 0.6 的同一侧**。引擎的 `contrastText` 会用品牌色当按钮底再反查文字色，
  luma 0.4–0.6 是陷阱区（第一版浅色 info `#5F7FC0` luma 0.489 → 白字只有 3.62）。
  第四轮起只有 primary / info 真的当填充底（§3.5），其余四个角色的 `contrastText` 只作诊断。
- **配方演进（第四轮）**——语法七色是本轮改得最多的地方：

  | 色位 | 配方 | 结果 |
  | --- | --- | --- |
  | 深色 `syntaxKeyword` | `M(indigo, cloud, 0.65)` = 靛蓝 35% + 云白 65% | `#B4B3D0` |
  | 深色 `syntaxNumber` | `M(gold, cloud, 0.1)` = 标题金 90% + 云白 10% | `#F9B219` |
  | 深色 `syntaxString` | `M(green2, cloud, 0.15)` = 浅绿受光面 85% + 云白 15% | `#89B872` |
  | 深色 `syntaxComment` | `M(gray, mist, 0.6)` = 云影灰 40% + 雾紫灰 60% | `#8B8996` |
  | 深色 `syntaxOperator` | `M(grayBlue, gray, 0.2)` = 灰蓝 80% + 云影灰 20% | `#7D90AC` |
  | 浅色 `syntaxComment` | `M(gray, blue, 0.6)` = 云影灰 40% + 标题蓝 60% | `#2E5891` |
  | 浅色 `syntaxOperator` | `M(violet, steel, 0.15)` = 机体主紫 85% + 钢青 15% | `#4F4A9A` |

  改的动机是**退后**：深色半原本的语法色太抢眼，注释/运算符压不下去。掺入云白/浅云之后，
  五个核心语法色彼此拉开，注释与运算符落在它们下面。
- **退后（recede）**：深色半 comment 4.78 / operator 5.04 ≤ 核心最低 7.16；浅色半 comment 5.33 /
  operator 5.60 ≤ 核心最低 5.89。**浅色半的退后空间天生窄**：曾尝试整体加深浅色半 5 个核心语法色，
  想把核心最低对比度从 5.89 抬到 8 来拉开退后空间，结果核心角色立刻挤成同一片深色、
  一批模拟 CVD ΔE 掉到 6 上下，硬违例当場冒出来 → **全部回滚**。
  结论：浅色半的注释 5.33 / 运算符 5.60 ≤ 核心最低 5.89 就是可行解，不必追求更大的余量。

## 7. 已知缺口

- **浅色半是第二套主题，不是深色半的取反**。两半各自从原图取像素（`colors` / `colorsLight` 互不相交），
  同一个语义角色在两半可以落在不同色族（例：`markdownEmph` 深色半 `#97AD50`，浅色半 `#525D38`）。
  想要「一套配色两套明暗」的话，这套不满足。
- **两个锚点是声明值**（冷纸白 / 林绿），见 §2 的 ⚠。林绿的目标色连原图像素都不是（`targetIsPixel = false`）。
- **44 个锚点里 39 个的目标色不是原图像素**。`target` 只能当「设计意图」读，不能当「取样证据」读；
  真正的取样证据是 `hex` + `support` + `flatness`。
- **浅色半有 4 条扩展矩阵诊断**（§3.6）：markdown 角色压在浅色代码头带上时低于 4.5:1。诊断级、非共屏场景，
  但确实没有全绿。
- **深色半两条余量最薄的硬性条目**：`syntaxComment@codeBlockBg` 余量 0.28、`syntaxOperator@codeBlockBg` 余量 0.54（§3.3 d）。
  再动深色半的语法色很容易把它们推下 4.5:1。
- **焦点环到不了 3:1**：真机里焦点环 = `borderActive` 叠 33% alpha，任何配色都过不了（白@33% 压暗底上限 2.66:1）。要改得动原型。
- **红色 diff 的可见度有客观上限**：图里最纯的红 `#DC4C2A`（BT.601 L ≈ .2026）在任何染色行底上都到不了 4.5:1；
  旧预置那种「一眼就跳出来」的 `#ff7a93` 是编出来的。本稿只保证 4.5:1 可读 + 行号槽 ΔE 分离。
- **状态色的 `contrastText` 只剩诊断**（§3.5）：深色半 `contrastText(warning)` = 3.51、`contrastText(error)` = 2.65
  两条没过。真机里 error / warning 不是填充底，所以不影响实际渲染；但如果哪天引擎把它们当填充底用，这两条会立刻变硬失败。
- **预览页的三处自身缺陷已修**（第四轮末）：锚点卡读 `target` 而非 `declared`（原先渲染 `undefined`）、
  「未过」计数不再把 172 条 `info` 记账行算成失败、写死文案改为按台账现算。见 §5 的说明。
- **`src/custom-presets/evangelion.json` 已存在且已发布**（霓虹版绿/紫预设）。本管线的 `write_preset.py` 是
  **原地替换**它：id 仍是 `evangelion`、name 仍是「新世纪福音战士」，只换配色。落地时要在 PR 里写明「重绘 EVA 预设配色」。
- **落地还要改仓库另外两处**（脚本只打印清单，不代改）：
  `src/engine/ip-presets.ts` 加 import + `IP_PRESETS_RAW` 条目（保持字母序），
  `tests/ip-presets.test.ts` 的 `EXPECTED_IDS`、`countIpPresets()` 与深/浅色计数断言。
  改完必须重跑 `npm run build:artifacts`（`client.js` 内联的 IP id 清单要含新 id），再 `node scripts/audit-themes.ts --check` 与 `npm test`。
- `census.py` / `extract.py` 需要本机存在那三张参考图；换图重跑会整体改变锚点吸附结果。
- **色相占比有口径依赖**：`census.py` 的主口径 B（通道极差 ≤25 记中性、绿感优先、HLS 色相带）实测
  合计红 14.12% / 绿 2.48% / 蓝紫 35.09% / 琥珀 8.08% / 中性 37.61%，预览页文案引用的就是这一组数
  （红 14.1% / 绿 2.5%）；换成宽/严口径会有 ±1 个百分点的浮动，`census.py` 打印了敏感性表。
