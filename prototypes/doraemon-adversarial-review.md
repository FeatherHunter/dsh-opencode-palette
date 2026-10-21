# 哆啦A梦主题 · 对抗式设计复核记录

> 原则：**不为结论找证据，要为结论找反例。** 本记录逐条列出评审中真正抓到的缺陷、判定依据与修复动作；
> 「结论为真」的部分也要写出「当时有多大可能是假」。
> 复核对象是 `prototypes/doraemon-extraction/` 的管线产物（`palette.json` / `census.json`），
> 复核器是 `derive.py`（可重跑，把 40 条硬对 / 15 条 UI 对 / 47 条对抗加固判据 / 6 类设计告警一次算完）。

## 一、被推翻过的设计断言

| # | 初稿断言 | 反例 | 判定 | 动作 |
|---|---|---|---|---|
| 1 | 「品牌/状态色按 3:1 判就够了」 | 宿主把 `state-error-primary` 当 **12px 文字色**用在 117 条 CSS 规则里；v1 的 `error #E22233` 在 8 个表面里 **7 个**不过 4.5:1 | 假 | 5 个品牌/语义色改按正文口径在 8 个表面各算一遍（共 40 对），违例 0 |
| 2 | 「语义色在自己染的底上也够看」 | 宿主 `.j_8BDW_strip` 用 `state-warn-tertiary`（同色 14% 底）当背景、同色当 13px 字 → 实测 4.07:1 | 假 | warning / error / success 各补「自染底」判据，全过 |
| 3 | 「宿主写死白字的填充位不用管」 | `button-info-fill` 与 error 填充配的是宿主**硬编码**的 `#fff` | 假 | 三个填充位补「#fff 对比」判据 |
| 4 | 「success 压深就够了」 | v1 `#384D3D` 不是绿：彩度只有 13.8，与 `textMuted` 互相对比仅 1.047:1，绿色觉下退成中性灰 | 假 | 改用 3.png 蓝黄叠出的真绿 `#6F997A` 压暗 38% = `#496352`（色相 141°） |
| 5 | 「四个状态色靠色相分开就行」 | v1 橙点与红点 ΔE00 2.73；按实测定色觉模型模拟，deutan 下 ΔE76 仅 **0.5** —— 同一枚圆点 | 假 | 素材里没有第二支绿/第二支橙，四态改用**明度阶梯** 54.5 / 39.5 / 31.9 / 23.4 L*，deutan 下 ΔE76 = 10.7 |
| 6 | 「气泡用粉色更像 Doraemon」 | v1 气泡 `#FDE2EB` 色相 340°，偏离基色相 141.5°（> 60° 判色相孤岛），且与 diff 删除带 ΔE00 只有 5.03 | 假 | 气泡并回晴空纸一族，8 个背景槽 0 孤岛 |
| 7 | 「5 组角色同值是省事」 | `primary=borderActive=markdownHeading` 等，ΔE00 = 0，角色语义被抹平 | 假 | 25 个设计角色两两不同值，0 碰撞；`exceptions.json` 里 doraemon 的并岗记档随之删除 |
| 8 | 「场域阶梯已经有了」 | v1 `backgroundPanel` 与 `codeBlockBg` 明度只差 0.19 L*，`background↔sidebarBg` ΔE00 1.69 | 假 | 按实测 L* 目标**反解**混色比例，每步 ≥1.5 L*（判尺要求 ≥1.4） |
| 9 | 「代码头横栏会自己显出来」 | v1 `codeHeaderBg` 与 `codeBlockBg` 只差 1.052:1，横栏在界面上看不见 | 假 | 阶梯重排后拉开 1.8 L*，横栏可见 |
| 10 | 「注释/运算符已经退后了」 | v1 comment 5.62:1 盖过核心语法最低 5.31，operator 10.48:1 盖过**全部**核心 —— 退后梯队不成立 | 假 | comment 4.85 / operator 5.62 压到核心最低 5.93（syntaxType）之下，形成三级退后 |
| 11 | 「粗体只要比正文深一点」 | v1 `markdownStrong #0C0C10` vs `text #1A1617` ΔE00 只有 3.82，粗体不产生视觉信号 | 假 | strong 用 1.png 的纯墨黑 `#0C0C10`，与正文勾线墨拉开 |
| 12 | 「提亮/压暗到 #FFFFFF / #000000 没问题」 | 这两个锚点**不在素材里** —— 等于「想象色」 | 假 | 压暗锚全部换成图内像素（1.png 纯墨黑 `#0C0C10`），锚点逐个登记并回原图复核命中数 |
| 13 | 「secondary 改中性灰以保色盲可分」 | 仓库判尺要求 primary/secondary 几何落进类比/三角/互补，中性灰会触发 `brandGeometry` 告警 | 误报（建议本身错） | 撤销；改用明度阶梯解决可分性 |
| 14 | 「primary 也该按 11px 正文算」 | `app.asar` 实测 `--dsw-alias-brand-text` 全文仅 4 次出现、**0 次**作为 `color:` 使用 —— primary 不是文字色 | 误报（建议本身错） | 撤销；primary 只按 UI 3:1 与反白判据算 |
| 15 | 「台账里的源色都该留下」 | 初稿登记的 22 个源色里有 5 个只被登记、没被任何颜色用到（`#F1F4F9` / `#9D9C9C` / `#2193D2` / `#DC4556` / `#FCCA5B`） | 假 | 裁到 **18 个源色**，逐个断言「至少喂一个颜色」，未用锚点全部移出台账 |
| 16 | 「primary 用字标深蓝最有品牌感」 | 3.png 的 `#0168B5` 是**商标字**，不是这只角色的脸；1.png 身上那支身体青蓝 `#189BC8` 才是 | 假 | primary 改 `#189BC8` 压深 42% = `#135F7B`；H196° 与铃黄 H48° 仍成 148.6° 互补 |
| 17 | 「链接用玫瑰红最醒目」 | 初稿 `markdownLink` 与 `error` / `diffRemoved` 同属红族，把错误色的语义抢走 | 假 | 改用与 primary 同族的交互蓝深档 `#063F6B`（仓库 v3.1 先例：link 与 primary 走同一支交互蓝的明暗分档） |
| 18 | 「强调色用铃铛黄最贴 IP」 | 初稿 `markdownEmph` 与 `secondary` 同源，等于把副色抄了一遍 | 假 | 改用 6.jpg 字标粉点 `#F36E9D` 压深 48% = `#843F59`；铃黄只留给 secondary |

## 二、对宿主 CSS 的还原度复核

对照 `D:\DeepseekHarness\resources\app.asar`（182 MB，原始 asar 文件）扫描 CSS 实际用法：

| 事实 | 消费方 |
|---|---|
| `primary` → `--dsw-alias-brand-text` | 全宿主 4 次出现、**0 次**作为 `color:` 使用 → primary 不是文字色 |
| `error` → `--dsw-alias-state-error-primary` | 117 条 CSS 规则当 `color:` 用，字号 **12px**（例 `.KZf9OG_error{color:var(--dsw-alias-state-error-primary);font-size:12px}`） |
| `warning` → `--dsw-alias-state-warn-primary` / `-label` | `.j_8BDW_strip{background:var(--dsw-alias-state-warn-tertiary);color:var(--dsw-alias-state-warn-primary);font-size:13px}` —— 同色 14% 底配同色 13px 字 |
| `success` → `--dsw-alias-state-success-primary` | 同族同构（`state-success-tertiary` = 同色 14% 底） |
| `secondary` → `--dsw-alias-state-idle-primary` | 全宿主 **1 个**消费者：8px 空闲圆点（同一元素按 `data-state` 在 idle/done/warning/error 间切色） |
| `info` → `--dsw-alias-button-info-fill` | `.RlGAzG_primary{background:var(--dsw-alias-button-info-fill);color:#fff}` —— 白字是**宿主写死**的；`.mAtvLq_badge` 另拿它当 11px 文字色 |
| `border` → `border-l1` | **3 个**消费者：行内代码边框 / 菜单描边 / 折叠代码体 |
| `borderActive` → `border-l2/l3/l4` | 描边与焦点家族（宿主另有一条 `--dsw-focus-ring-color` 走 primary 2px，仅键盘焦点） |
| 提示气泡文字色 | 引擎按 `backgroundElement` **实算**（`src/engine/generate.ts` L185–233），不是写死白色 —— 「气泡字是白字」这条旧备案已过时 |
| 未被映射的 token | `--dsw-alias-brand-primary-new-colorprimary-new-color` / `--dsw-alias-label-deep-diving` / `--dsw-alias-switch-thumb` 仍会漏 DeepSeek 蓝，37 个颜色管不到 |

## 三、管线自身的坑（已修）

- **色觉模拟器多除了 100**：`enc()` 里逆矩阵已经返回 0..1 的线性值，再除 100 会把数据压扁，deutan/protan 的 ΔE 全是假数。修掉之后「四态同色」这个问题才第一次暴露出来——在此之前初稿是「通过」的。
- **明度阶梯的步长必须先排序**：按 -L\* 排好序再反过来做差才得到真实步长 1.5 L\*；不排序直接做差会算出 8.2 这个假数（预览页三处「每步」文案因此互相打架）。
- **CSS 类名撞车**：预览页里的 `.warn` 同时是「告警条」和「8px 状态圆点」，结果「已暂停」标签渲染成一坨棕色。改成 `div.warn` 限定作用域才正常。
- **`%` 格式化撞上 CSS 字面量**：模板里有 `100%` / `50%`，`%`-format 直接抛错。改用 `@@name@@` 占位符 + `.replace()` 逐个替换。
- **锚点必须登记，不登记就等于「想象色」**：`border` 用的 `#CAE1F0` 最初没进台账；脚本按「所有源色都必须至少喂一个颜色」断言后补登记，并把 5 个没人用的锚点裁掉。
- **PowerShell 的 `-replace` 在 CRLF 文件上会静默失配**：整段补丁看着执行了，grep 却发现旧值还在。路径改写一律走 Python 的 `.replace()`，并逐条打印 MISS 计数。

## 四、复核器（`derive.py`，可重跑）

```
① 源色逐像素回验：18/18 全部在原图命中（PNG 精确 / JPEG ±3）
   场域 8 槽：纸白×柔蓝 一条混色阶梯，L* 99.2 → 87.3，每步 ≥1.5
② §2.1 正文/内容类 40 对 ≥ 4.5:1      违例 0（最紧 4.777 = markdownBlockQuote@backgroundPanel）
③ §2.2 UI/交互类 15 对 ≥ 3:1          违例 0（最紧 3.181 = secondary@backgroundPanel）
④ §4 IP 设计规范                      告警 0
   色相孤岛 0 / 角色碰撞 0 / markdown 同值 0 / 品牌几何 = 互补 148.6°
   语法核心五角色最小 ΔE76 = 15.5（门槛 10）/ comment 4.85 · operator 5.62 退到核心最低 5.93 之下
④b 宿主 8px 状态圆点四态可分性        normal ΔE76 23.0 · deutan 10.7 · protan 20.5
⑤ 结论：硬性 40 + UI 15 + 加固 47 对，违例 0
```

## 五、仍然存在的缺口（不掩盖）

1. **六张图里没有一处设计过的绿**。唯一的绿是 3.png 蓝字标压在黄场上叠出来的 **39 个像素** `#6F997A`，`success` 与 `diffAdded` 两个岗位都从这 39 px 派生——这是全套唯一被素材逼出来的地方，不做「想象一个绿」。
2. **四态圆点靠明度阶梯而不是色相分开**。素材里没有第二支绿、第二支橙，所以可分性只能来自 L\*（54.5 / 39.5 / 31.9 / 23.4）。常视最小 ΔE76 23.0，绿色觉模拟下 10.7——过门槛但余量薄。
3. **`secondary` 在真实宿主里几乎不可见**：全宿主 1 个消费者（8px 空闲圆点），铃铛黄只活在几何里。
4. **`border` 只有 3 个消费者，且 8 个表面上都 < 3:1**（审计信息项 `borderBelow3: 8`）——描边不是文字，这是 37 槽判尺结构性照不到的一处。
5. **宿主三个未映射 token 仍会漏 DeepSeek 蓝**（见第二节末行），37 个颜色修不到。
