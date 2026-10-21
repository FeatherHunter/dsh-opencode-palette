# IP 预置主题配色思路（对抗式重审版，25 套）

> v3.1 可读性整改（2026-10-19）：21 套全部按 docs/theme-audit/criteria.md 机器判尺整改到位（硬对/UI 对 0 违例、设计告警 21 条全记档 / 0 待处理，--check 退出码 0）。设计意图、品牌色与气质保持原案；6 套浅色主题的代码区由深色舞台改为同色系浅色纸面舞台（syntax 七色转深墨），其余主题主要是 primary/borderActive/标题/弱文字等 token 的对比度与并岗几何微调——正文里少数未及更新的 hex 以 src/custom-presets/*.json 终值为准。

> v3.2 逐像素取色（2026-10-20）：**哈利波特整版重绘**——所有颜色改由四张参考图逐像素取样，只允许「直采 / 明度阶梯 / 两色定比混色」三种来源，id / name / appearance 不变（仍是同名 `harry-potter` 胶囊）。取色台账与原图裁切见 `prototypes/harry-potter-theme-preview.html`；详见 docs/ip-presets-v3-notes.md 末节。其余 20 套不受影响。

> v3.3 逐像素取色（2026-10-20）：**星球大战整版重绘**——37 槽全部改由三张星战海报（天行者崛起 / 天行者的崛起 / 最后的绝地武士）逐像素取样，只允许「直采 / 明度阶 / 彩度阶 / 定比混色」四种来源，id / name / appearance 不变（仍是同名 `star-wars` 胶囊，dark）。取色台账与原图裁切见 `prototypes/star-wars-theme-preview.html`；取色管线见 `prototypes/star-wars-extraction/`。硬对 38 / UI 15 全绿，设计告警 0 条；v3.4 起按「两刃对分」重排配比（红刃 51.9% / 蓝刃 48.1%），底色换成两刃交点的近黑紫。其余 20 套不受影响。

> v3.5 逐像素取色（2026-10-20）：**宝可梦整版重绘**——37 槽全部改由四张参考图（官方图鉴立绘 / wikiHow 平涂 / 30 周年 / 合志插画）逐像素直采，只允许「与原图某像素完全一致」一种来源，0 阶梯 0 混色 0 想象；id / name / appearance 不变（仍是同名 `pokemon` 胶囊，dark）。取色台账与原图裁切见 `prototypes/pokemon-theme-preview.html`；管线见 `prototypes/pokemon-extraction/`。硬对 38 / UI 15 全绿，设计告警 0 条（v3 记档的 6 组并岗已全部拆开，exceptions.json 的 pokemon 条目随之删除）。其余 20 套不受影响。

> v3.6 逐像素取色 + 对抗式审查（2026-10-20）：**宝可梦二次重绘**——v3.5 交付后做了一轮四路对抗式审查（范式 / 出处 / 审美 / 证伪，原文见 `prototypes/pokemon-adversarial-review.md`），据此修掉 5 处实质问题：3.jpg 周年海报原本对色板近乎零贡献（文档却声称它供给了红与金）→ `borderActive` 改取 3.jpg 奶油金 `#FEED79`；`diffRemovedLineNumberBg` 与 `sidebarBg` 完全同值 `#060606` → 拆成 `#141000`；两个大黄同屏（`markdownHeading` `#FAE721` 与 primary `#FFCB05` 互相对比 1.20:1）→ heading 改 `#E3C371`；`syntaxNumber` 与 `borderActive` 的 ΔE76 9.46 是全矩阵最差的一对 → number 改 `#C5A863`；纯黑代码台 → `codeBlockBg` 改 `#0C0C10`，并把描边 `border` 收到 `#40404A`（首次比它框的面暗，层级倒置修正）。37 槽仍是 37 个不同值、全部直采、0 阶梯 0 混色 0 想象；硬对 38 / UI 15 全绿，设计告警 0。审查同时**证伪了「3:1 规则决定必须暗场」这条原理由**（3:1 只规定哪个槽位能放亮黄、不规定场；暗场成立靠的是素材的场本来就是暗的、「0 混色」判尺只有暗场守得住、暗场明度跑道是浅场的两倍）。其余 20 套不受影响。

> v3.4 逐像素取色（2026-10-20）：**原神整版重绘 · 明暗两套**——五张参考图（官方主视觉 / 派蒙 / 可莉 / 温迪 / 旅行者）逐像素取样，只允许「直采 / 两色定比混色」两种来源。胶囊从一条变两条：`genshin`（原神，light，纸感明信片）与 `genshin-night`（原神·夜航，dark，夜航明信片）——自定义胶囊一条只装一套色（`renderCustomTheme` 把同一套 37 色灌进明暗两半，`appearance` 只决定宿主按哪种外观显示），所以「明暗一体」只能靠两条胶囊各自带自己的 appearance 实现。硬对 38 / UI 15 全绿，设计告警 0 条。其余 20 套不受影响。

> v3.9 逐像素取证重绘（2026-10-20）：**奥特曼整版重绘**——37 槽全部改由两张参考图（`C:\Users\辰辰洋洋\Pictures\奥特曼\` 下的 `2.jpg` 奥特战士立绘 / `images.jpg`「奥特曼图鉴」海报）逐像素取证，只允许「直采 / 明度阶梯 / 定比混色」三种来源，id / name / appearance 不变（仍是同名 `ultraman` 胶囊，dark）。品牌重切成奥特曼的两个声部——**红冠 + 金眼**（primary 战甲受光正红 `#D52518` × secondary 金瞳边缘高光 `#EFCB5D`，色相差 41.1° 类比）；画布换成海报里最黑的那格 `#000600`，场域收进海报标题靛 `#2D2C8A` 染出来的 7 档明度阶。取色台账与原图裁切见 `prototypes/ultraman-theme-preview.html`；取色与自检管线见 `prototypes/ultraman-extraction/`。house 判尺 53/53 全过（硬性 38 + UI 15），宿主现实 49 对 0 硬违例，设计告警 0 条，引擎 `ensureDiffContrast` 对本套 37 槽 **no-op**（台账值＝出货值）。其余 23 套不受影响。

> v3.10 逐像素平涂取色 + 对抗式审查（2026-10-20）：**新世纪福音战士整版重绘，并新增浅色册**。三张参考图（1.jpg 明日香装甲红与标题金 / 2.jpg Eva-01 机体紫与同步绿 / 3.jpg 天空云白与角色涂装）当唯一样本，37 槽每槽只允许两种来源——**直采**（平涂区域代表色：同色像素成片存在、3×3 邻域方差 0）与**定比混色**（两个采样色的固定比例，比例随值记账）。**第一条就推翻了上一版的做法**：上一版把「直采」定义成「离锚点最近的那个像素」，实测 44 个锚点里有 17 个整图只有 1 个同色像素（落在 JPEG 振铃与标题描边上），标签与像素对不上；本版把直采改成「成片平涂面的代表色」。另加一道**混色闸**：每个出货色到三张原图全部像素的最小 ΔE76 必须 ≤ 2.0，否则构建失败——因为定比混色本身「能造色」（44 锚点两两 × 3 配比 = 2,838 个混色里有 19 个 ΔE > 5，最大 15.85）。硬对 38 / UI 15 全绿、设计告警 0、引擎 `ensureDiffContrast` no-op；真实 widget 原型 42 个文本节点 0 个低于 4.5:1。落地形态：`evangelion`（dark，**原地替换**已发布的霓虹绿紫版）+ `evangelion-day`（light，新增）两条胶囊。取色管线见 `prototypes/evangelion-extraction/`，预览页见 `prototypes/evangelion-theme-preview.html`，对抗式审查原文见 `prototypes/evangelion-adversarial-review.md`。其余 24 套不受影响。

> v3.11 命名口径（2026-10-21）：展示名一律不加空格（「·」两侧也不加）；同一 IP 的明暗双册统一成「一册裸名 + 一册『·二字后缀』」。据此改名 7 条：`赛博朋克 2077`→`赛博朋克2077`、`Hello Kitty`→`HelloKitty`、`新世纪福音战士 · 晴空`→`新世纪福音战士·晴空`、`原神 · 夜航`→`原神·夜航`、`超级马里奥 · 夜行`→`超级马里奥·夜行`、`火影忍者 · 晒过的和纸`→`火影忍者`（明册回归裸名）、`火影忍者 · 夜之暗`→`火影忍者·暗部`（暗册取「暗部」：字数对齐夜航/夜行/晴空，又是原生 IP 词）。id / appearance / 37 色全部不动。

## 宝可梦（dark）

> v3.6 二次重绘（2026-10-20，逐像素直采 + 对抗式审查）：四路审查（范式 / 出处 / 审美 / 证伪）后修掉 5 处实质问题——3.jpg 周年海报对色板贡献近乎为零却写着它供给了红与金（→ `borderActive` 改取 3.jpg 奶油金）、`diffRemovedLineNumberBg` 与 `sidebarBg` 完全同值（→ 拆成 `#141000`）、两个大黄同屏违反自己的第①条律（→ `markdownHeading` 改 `#E3C371`）、`syntaxNumber` 与 `borderActive` 的 ΔE76 9.46 是全矩阵最差对（→ `#C5A863`）、纯黑代码台是洞不是面（→ `codeBlockBg` 改 `#0C0C10`）。同时**证伪了原理由**「3:1 决定必须暗场」：3:1 只规定哪个槽位能放亮黄、不规定场。审查原文见 `prototypes/pokemon-adversarial-review.md`，详情见 docs/ip-presets-v3-notes.md 末节。

①基调：**图鉴卡的暗场**。四张图里只有 01 号官方图鉴立绘有黑白结构，所以场域全部收进它的冷调明度阶梯（基准色相 240.0°，0 个色相孤岛）：inputBg #000000 画框墨（74,363 px）→ sidebarBg #060606（700 px）→ codeBlockBg #0C0C10 卡面暗场（27,378 px）→ background #1C1C22 卡面页底（58,800 px）→ bubbleBg #28282D（31 px）→ backgroundPanel #37373B（47 px）→ backgroundElement #48484D（37 px）→ codeHeaderBg #58585A（993 px，4.jpg）。**冷场暖字**：底是卡面的冷调蓝黑，暖意全交给徽章金与御三家。旧版的常磐森林深墨绿 #0E1B13 整族作废（那张图里一个像素都没有）。
②组合：primary 图鉴卡编号徽章黄 #FFCB05（01 编号徽章 3,012 px）× secondary 2.jpg wikiHow 蓝底 #799DFE（88,538 px）= 176.2° 互补。**黄只做「牌」不做「底」**——它是填充色，引擎按 contrastText 派生前景 #141414（12.10:1）；徽章黄在暗底上当文字只有 1.4:1，绝不做正文。焦点环 borderActive 改取 3.jpg 周年海报奶油金 #FEED79（1,516 px，比品牌黄亮一档）；描边 border 收成 01 卡边细线 #40404A（L* 27.44，比它框的 codeHeaderBg 暗 3.32，层级不再倒置）。
③借物：4.jpg 合志插画一次交齐御三家——success 妙蛙种子绿 #7AA85D、warning 小火龙橙 #FB8603、error 精灵球红 #F93D32、info 杰尼龟蓝 #289BCA。diffAdded 合志浅青绿 #7FC9AE、diffAddedBg 深青 #0A2828、diffAddedLineNumberBg 精灵球黑面 #191917（1,613 px）；diffRemoved 2.jpg 脸颊红 #FE4C1C、diffRemovedBg #0C0406、diffRemovedLineNumberBg 画框暖黑 #141000（v3.5 的 #060606 与 sidebarBg 完全同值，v3.6 拆开，37 槽因此 0 重复）。syntax：keyword 皮卡丘嘴部藕粉 #C790A3、function 合志蓝面 #6E9BBC、type 合志青灰 #658F8B、number 皮卡丘中金 #C5A863（与 borderActive 的 ΔE76 由 9.46 拉到 92.16）、string 合志浅青绿 #80CAAF、comment #85858A / operator #7A7A7F 退后。
④技巧：text 取 01 号图鉴卡页脚自己的白字 #EEEEF4（2,157 px）、textMuted 取 01 图注小字的淡灰蓝 #D3D3D8（41 px），弱文字用其褪色版（labelDimmed = withAlpha(textMuted, 0.8)）。markdown：heading 皮卡丘中金 #E3C371（3,755 px）、link 合志天空蓝 #95C7F8、code 合志奶黄 #FDE7B5、emph 合志暖杏 #F9B584、strong 卡纸白 #FFFFFF、blockquote #BDBDC3。v3.6：37 槽仍全部由四张参考图**逐像素直采**（0 阶梯 0 混色 0 想象），四图精确命中 331,427 / 830,418 px = 39.9%（01 210,119 / 2.jpg 88,570 / 3.jpg 2,568 / 4.jpg 30,170），硬对 38 / UI 15 全绿，设计告警 0（v3 记档的 6 组并岗全部拆开，exceptions.json 的 pokemon 条目已删）。

## 漫威（dark）

①基调：整版重绘为**逐像素取色**，判尺从「直采/阶梯/混色」三分改成**四级**（对抗式审查结论：原先「37/37 直采」是错标——按图里真实体量，只有 9 条是字面像素）。**A1 实涂 9 条**＝图上真被平涂过的色（#1C1C22 版面底占全部像素 38.1%、#0C0C10 深墨条 9.9%、#FFFFFF 65,255 px、#F11E22 标志红 60,287 px、#000000 蜘蛛侠纯墨线 20,078 px、#FFCB05 页脚黄 8,917 px、#EEEEF4 正文白 6,499 px、#40404A 版式发丝线 1,540 px、#A0A2AC 次级灰 509 px）；**A2 边阶 11 条**＝能被证明是两个平涂色的渲染器抗锯齿混合（误差 ≤0.54/255），例如 textMuted #BDBDC3 ＝ #1C1C22 + #EEEEF4 @76.7%、syntaxComment #7A7A7F ＝ #0C0C10 + #EEEEF4 @48.7%；**B 簇采 15 条**＝中位切分簇心，图里没有这个字面值，代表一片 ΔE76≤10 的实际区域（primary 战甲红 21,526 px、secondary 熔金 1,798 px、warning 火焰橙 3,780 px、syntaxString 盔甲高光 2,529 px）；**C 阶梯 2 条**＝以画面唯一那抹有彩绿 #006752（22 px）为源、只改 L* 走到目标明度（success L*68 → #62B59C、diffAdded L*56 → #40947D），色相不漂。没有一色来自图外臆造（管线见 prototypes/marvel-extraction/）。
②表面：8 槽只靠明度分层，全部落在 227°–240° 一条轴、彩度 ≤10，0 个色相孤岛。codeBlockBg #000000（L*0.00，蜘蛛侠纯墨线）→ background #0C0C10（3.42）→ sidebarBg #121216（5.59）→ inputBg #18181C（8.41）→ bubbleBg #1C1C22（10.50）→ backgroundPanel #252529（14.83）→ backgroundElement #2D2D32（18.65）→ codeHeaderBg #333337（21.38）；台阶 3.42/2.17/2.82/2.10/4.32/3.82/2.74。**4.32 那一级是被数学逼出来的**：primary 配白字要 4.5:1（Y ≤ 0.1604），同时 primary @backgroundPanel 要 3:1，两条联立推出 backgroundPanel 的 Y 必须 ≤ 0.0191（L* ≤ 14.83）——卡片面不能更亮，否则深红 primary 够不到 3:1；而源图在 10.50 与 14.83 之间没有墨，台阶只能在这里留一个空洞。
③组合：primary 战甲红 #D32B28 × secondary 熔金 #EAC38D（铁人盔甲本体是金不是红），色相差 33.8°＝**类比**（暖对暖），比旧版红蓝 145.9° 互补更近海报质感。**焦点环与主按钮主动拆开**：标志红 #F11E22 做 borderActive（焦点环要最醒目），战甲红 #D32B28 做 primary（标志红反白只有 3.83:1，撑不起按钮；战甲红 4.61:1）。v3 记档的「primary = borderActive」并岗因此解除，岗位串戏降到 0 处（见 docs/theme-audit/exceptions.json 的 marvel 条）。
④借物：info 夜空钢蓝 #81B0DE（蜘蛛侠夜空，915 px）、success #62B59C、warning 火焰橙 #DB7930（3,780 px）、error 标志浅红 #F77B7E、diffAdded #40947D、diffRemoved 标志浅红 #F56568。markdown：heading 窗光暖金 #F7E4AB、link 奶油窗光 #D4C794、code 沙金 #C8AB7C、emph 标志浅粉 #F9A7A9、strong 标志纯白 #FFFFFF、blockquote 水泥米灰 #B4B29F。
⑤技巧：正文用幻灯片自己的正文白 #EEEEF4，次级文字 #BDBDC3（版面底与正文白 76.7% 的抗锯齿台阶，labelDimmed 合成后仍 4.89:1）。语法五核心 keyword #F44A4D（标志红被白光冲开 80.5%）、function #E4A05A（战甲金与火焰橙之间的暖铜）、type #FFCB05（页脚黄）、number #A0A2AC（次级冷灰）、string #F0E5D8（盔甲高光洗白），两两 ΔE76 最小 28.0（门槛 10）；退后两档 comment #7A7A7F（对比度 4.92）、operator #9D7A72（5.46）被夹在 4.5 下限与「≤所有核心色对比度」之间的极窄亮度带，画面该带只有冷灰与暖灰两种，于是冷灰给注释、暖褐给运算符，ΔE 17.2——整套盘子里最省的一次分离。硬对 38 / UI 15 全绿，设计告警 0。

## DC（dark）

> v3.7 整版重绘（2026-10-20，逐像素取色 + 对抗式审查）：三张参考图当唯一样本——1.jpg 群像海报 / 2.jpg DC 徽章圆盘 / 3.jpg THE DC ENCYCLOPEDIA 百科封面。**判尺只允许一种来源：直采**（37 个色位落在 36 个不同色值上，全部是图里的真实像素，0 想象）；材质真伪改用 **tonal mass**（ΔE76 ≤ 6 邻域像素数）判定——三张图都是连续渐变，某个 hex 的精确像素常常只有个位数，按精确命中判「想象色」会误杀真材质。台账见 `prototypes/dc-comics-extraction/palette.json`，逐色位原图裁切见 `prototypes/dc-comics-theme-preview.html` 的「出处证据」段，对抗式审查记录见 `prototypes/dc-comics-adversarial-review.md`。

①基调：夜蓝场，不再是「哥谭市午夜沥青黑」。8 个场域槽收在一条色相 H202–226（跨度 23.2°，0 色相孤岛），只拉开 L\*：codeBlockBg #000515（披风深处黑蓝，L\* 1.5）→ sidebarBg #0A0F12（人物之间死黑，4.1）→ background #0C1326（海报底部蓝黑，6.2）→ backgroundPanel #09203F（披风受光深蓝，12.3）→ codeHeaderBg #122543（超人披肩深蓝，14.7）→ inputBg #192D52（战衣受影的蓝，18.8）→ backgroundElement #263356（钢仔装甲的蓝，21.8）→ bubbleBg #0F437D（徽章圆盘深蓝，28.4），每步 +2.1 … +6.6 L\*，无重复行、无层级倒挂。
②组合：primary DC 徽章圆盘本体蓝 #0373B3（2.jpg 主体像素 48,154 px）配 secondary 神奇女侠金冠 #E4BA56，H201.8° × H42.3° = **159.6° 互补**。主色取徽章本体那一档而不是更暗的邻档（#0272B2 / #025C9A）——更暗的两档在面板上会掉出 UI 3:1；反白 4.65:1（引擎走白字分支）。
③借物：正文 text #FEFAD4（百科封面旧纸）、次级 textMuted #BDC0C5（蓝雾天光）、边界 border #7C7D7F（钢仔装甲银灰）、焦点环 borderActive #D6F0FF（徽章白星冷光；对主按钮填充 4.33:1、对浮层 10.51:1）。语义色：info #91C1CF（速度力水蓝）、success #64AB65（绿灯侠战衣绿）、warning #C2A595（封面天空陶土）、error #BE4B48（红披风暗面）、diffAdded #8BB551（封面绿灯侠黄绿）、diffRemoved #D37B6D（火焰旁披风暖红），两个 diff 底用封面暖影 #221A17 / #18100D。syntax：keyword #BDA3B0（封面暗肤玫瑰灰——图里没有饱和紫）、function #008AC9（徽章圆盘上缘）、type #BEDCDE（钢仔银青高光）、number #E6B189（封面里那本旧漫画的纸）、string #89BF81（绿灯侠战衣浅绿），退后两档 comment #717F8A（钢仔钢灰 4.94）/ operator #7D7875（装甲与硝烟暖灰 4.66）都低于核心五色下限 5.31，核心最小 ΔE76 = 26.66。
④技巧：焦点环与主色**分工不重叠**（深主色 + 浅焦点环）——同族青做焦点环时它对浅填充只有 1.29:1，等于没画；边界取中性银灰而不是饱和蓝，免得和品牌蓝抢戏（v1 的 #1D365F 在浮层上只有 1.03:1，0.5px 结构线等于没画）；弱化文字的余量不靠提亮品牌色挣，靠**压暗浮层**换（labelDimmed@浮层 4.58 → 4.97）。v3 终审记档的三处并岗（primary·info·link、secondary·borderActive·function、heading·strong）全部拆开，25 个设计角色 0 同值、markdown 六角色 0 同值。

## 星球大战（dark）

> v3.3 整版重绘（2026-10-20，逐像素取色）：三张海报当唯一样本，37 槽每槽只允许四种来源——**直采**（hex 与海报某个像素完全一致）、**明度阶**（锚点 H/S 不变，只改 L）、**彩度阶**（锚点色相不变，只改 S/L）、**定比混色**（两个锚点的固定比例线性混合）。台账见 `prototypes/star-wars-extraction/palette.json`，原图裁切见 `prototypes/star-wars-theme-preview.html` 的「取色溯源」段。

> v3.4 配比重排（2026-10-20，回应「颜色比例要接近、星球大战是半红半蓝」）：整版按**两刃对分**重排——底色从「深空靛」换成「近黑的紫（两刃交点）」，主色从招牌金换成**红刃**，金降级为纯排版位。配比用 `prototypes/star-wars-extraction/ratio.py` 客观核算（权重＝该色位在 `map-dsh.ts` 里驱动的 DSH 变量数，填充类 ×2）：**红刃 51.9% / 蓝刃 48.1%，差值 3.8%**。判据仍全绿。

①基调：**两刃的交点** background #0F0814——红刃 356.6° 与蓝刃 197.9° 的中点是紫 275.8°，所以底色取 2.jpg 天行者的崛起的紫黑 #160C1C 作根，8 槽走「明度阶 + 彩度阶」双台阶（S 45%→20% 随 L 3.5%→20% 递减，抬亮时不会跑成紫罗兰）：codeBlockBg #0A050D 最深（L3.5%）→ background #0F0814（L5.5%）→ sidebarBg #150C1A（L7.5%）→ codeHeaderBg #1A1020（L9.5%）→ backgroundPanel #211627（L12%）→ inputBg #271C2E（L14.5%）→ backgroundElement #2E2235（L17%）→ bubbleBg #36293D 最亮（L20%）；border #41304B 收在同一族。基准色相 275.0°，偏差 ≤4°，0 个色相孤岛。**底色不偏任何一边，两色才都立得住**——这是 v3.3 用靛蓝底时的教训：饱和的靛把整张界面推向蓝，红刃看着像"只做危险提示"。

②组合：primary **红刃** #CD1E28（3.jpg 最后的绝地武士红剑 #AA1921 的 L46 阶）× secondary **蓝刃** #30B4EC（2.jpg 天行者的崛起中央斜剑的剑心，**直采**）。356.6° × 197.9° = **158.7° 互补**。红刃拿下着色面积最大的一块（主按钮 / 品牌字 / 激活导航 / 业务态），蓝刃拿下整套冷色岗位（次级色 / 提示按钮 / 链接 / 焦点环 / 次级文字 / 引用 / 函数名 / 关键字）——按引擎真实落点，红刃权重 28、蓝刃 28。primary 反白走引擎口径的 #F4F4F5（5.01:1），不是手挑的黑字。

③借物：info 蓝紫剑晕 #97A5FE、success 绿光剑辉 #6EC3AE、warning 琥珀暖光 #E28950（1.jpg 剑与人物之间的那点热核）、**error 亮刃 #EB3D48**（3.jpg #B4131D 的 L58 阶，比品牌深刃亮一档）、diffAdded 绿剑亮部 #7DD2B5、diffRemoved 红剑余晖 #D65166。markdown：heading **字标香槟金 #FCE39F**（**直采**）、link 天蓝 #78C1E9、code 奶油白 #FAEAD3、emph **落日玫瑰** #D17380（2.jpg 塔图因地平线的落日，**直采**）、strong 星尘白 #F5FAFB、blockquote 长春花蓝暗一档 #7986C4。syntax：keyword 星云紫 #CBA8EC、function 冰蓝 #A5E0FF、type 锈橙提亮 #D09A90、number 鎏金 #D09A06、string Luke 绿剑冷调 #8ADCD0、operator 与 comment 同取 2.jpg 灰紫 #716882 的退后梯队（4.52 / 4.86，低于五个核心色的最低 7.98）。

④技巧：**金退位**——金色在海报里是 logo，是字不是色块，所以 v3.3 让它当主按钮是错的；v3.4 把它压回标题 + 数字两席，主按钮让给红刃，绿剑素材全场只占 1.1% 也只作注脚。**error 用亮刃配深刃品牌**（#EB3D48 / #CD1E28）：同族不同值不同岗，亮红永远比品牌红刺眼，两色不同值故不触发角色碰撞。**textMuted 自动求档**：长春花蓝 #8793CA 与星尘白混色后取"最暗且三层主表面（含 labelDimmed@0.8）全达标"的 #9DA7D2。判据：硬性 38 对 + UI 15 对 **0 违例**；语法核心两两 ΔE76 最小 25.4（门槛 10）；25 个设计角色 **0 处同值碰撞**；markdown 六角色 0 同值；配比红 51.9% / 蓝 48.1%。

## 哈利波特（dark）

①基调：**禁林月夜** background #0B223B——取自 4.jpg 海报夜空的深蓝，不是通用藏青。8 槽全部收进同一支色相（H211°，基准 211.3°），只拉明度不换色相：codeBlockBg #050F1A 最深（L6.1%，代码舞台）→ sidebarBg #071523（L8.2%）→ background #0B223B（L13.7%，锚点）→ inputBg #0D2740（L15.1%）→ backgroundPanel #102A45（L16.7%）→ bubbleBg #133250（L19.4%）→ backgroundElement #16374F（L19.8%）→ codeHeaderBg #1B3F5E 最亮（L23.7%，舞台顶灯）。0 个色相孤岛。

②组合：primary 霍格沃茨金 #CAA654（3.jpg 格兰芬多领带的金条纹）× secondary 车身猩红 #C56F72（4.jpg 霍格沃茨特快被灯照亮的车身）。金 41.7° × 红 357.9° = 43.8° 落在类比区间（暖对暖，格兰芬多围巾式配色），borderActive 用同一材质的高光档 #FCDB8C——焦点环比品牌亮一档，像被烛光点亮的金框。

③借物：info 冰窟冷光 #3DD3FF（images.jpg 冰窟最亮的青蓝）、success 月色青 #91BEAE（4.jpg 邓布利多银须与月光）、warning 火光暖橙 #D4A681（2.jpg 壁炉打在皮肤上的暖调）、error 龙息朱砂 #E05A55（承自车身红，同明度 L61%、彩度 40%→71%、色相 +4.3° 的提纯步进）。diffAdded #A9CCC0 / diffRemoved #D9A1A3 各是月色青与车身红向白提亮的浅档，行底则用「夜空蓝 × 对应语义色」固定比例混色（82% / 34% 两档）。syntax：keyword 暮色丁香 #AC93AA（images.jpg 人像阴影）、function 雾蓝天光 #2E9FD0（4.jpg 片名后方）、type 冰窟冷光与月色青的 50/50 混色 #79C7D2、number 木墙铜镜 #BB8964（2.jpg）、string 冰面青提亮 15% #599CB6、operator 银白与夜空蓝 46/54 混色 #73818E、comment 银白压黑 46% #80807E（城墙石灰）。

④技巧：**整套配色只允许三种来源**——直采（hex 与参考图某像素完全一致）、阶梯（采样色的明度/彩度台阶）、混色（两个采样色的固定比例），没有第四种；每个色位在 prototypes/harry-potter-theme-preview.html 的「取色台账」里都标着出处公式与原图裁切，15 个直采色位由脚本回原图逐个复核「该色确实存在」（#CAA654 在 3.jpg 领带里找到 13 个精确像素，#0B223B 在 4.jpg 夜空找到 4272 个）。上一版的暖褐石墙与 #E8B64C 在四张参考图里一个像素都找不到，故整版退役。codeBlockBg 做全场最深舞台、codeHeaderBg 反跳家族最亮压住它（大礼堂悬烛）；七色语法两两 ΔE76 最小 13.8（function × string），comment/operator 对比度 4.87/4.83 一律退到核心语法最低 6.29 之下。**已知缺口**：四张图绿相像素不足 0.1%，success 与 diffAdded 只能共用月色青一族的两个明度台阶——这是全套唯一被素材逼出来的地方。

　v3.2：全 37 槽按「逐像素取色」重绘，id / name / appearance 均未变（同名 harry-potter，仍进自定义主题胶囊）。硬性 38 对 4.5:1 违例 0（最紧 labelDimmed@backgroundElement 4.67:1，正文 text@background 13.84:1）、UI 15 对 3:1 违例 0（最紧 error@backgroundPanel 4.00:1）、设计告警 0（0 角色同值 / 0 色相孤岛 / 0 markdown 同值）、审计器 --check 退出码 0、token 对账 0 失配。

## 迪士尼（light，v4 重绘：五图取色 + 对抗式复审三轮）

①基调：蓝调城堡（Castle Blue Hour）——夜幕藏蓝做墨、晨空冷蓝做场、樱花粉做唯一心跳、**城堡烛金做结构**。8 背景槽收进同一条冷蓝家族（H199°–213°），只靠明度分层：codeBlockBg #F4F4F9 最浅纸面 → bubbleBg #EEF2F7 → inputBg #E5EDF4 → background #DEEAF1 → sidebarBg #D6E6EF → backgroundPanel #CDE2EC → codeHeaderBg #D0DBE3 → backgroundElement #C9D6DE 收底；整条阶梯跨 11.9 L*、每步 ≥1.4 L*，比例是按实测 L* 目标反解出来的，不是随手拍的（上限是月白自身的 96.6，再亮就得凭空造色）。气泡是**近乎无彩的冷白** #EEF2F7（彩度 8）——大面积用无彩、小面积用彩。border #9AB4C1 对最深表面 1.45:1（最早一版 1.06:1，近乎隐形）。
②组合：primary 樱华深玫 #903B5C（樱花粉3 × 深梅紫 55%）× secondary 黛青瓦 #3E7389（3.jpg 城堡屋顶原色，未作任何改动），判尺记 139.1° 三角；但**诚实的说法是**：黛青瓦 H197.6° 与场色 H202.1° 只差 4.5°，它是天空同族的屋顶，不是场的对面——三角是纸面几何，屏上只有「蓝 + 玫」两个声音。**borderActive 改烛金 #876B31**（5.jpg 金饰 #A98539 × 树皮棕 30%）——金色在 4/5 张参考图里都有（1.jpg 亮城堡 #FFD27E、3.jpg 塔尖 #F8CA6C、5.jpg「10」#EBCD1D），却是第一版唯一整族缺席的色相；改金之后它与 secondary 的 ΔE76 从 6.6 拉开到 55.6，「空闲态圆点」与「描边/焦点」不再同色。
③借物：info 烟花蓝压深 #1C63A6、success 童话真绿 #457245（原来 S22.7 的苔藓绿，与 diffAdded 同色 ΔE76 2.8；现 ΔE 15.5）、warning 城堡暖光 #AF543D、error 米妮红 #B12C34（2.jpg 公主裙原色系，唯一原样保留的语义色）、diffAdded 深林绿 #355132、diffRemoved 深莓 #872F3A。syntax 落冷纸面：keyword #6E2645 深樱、function #2C597B 深海青、string #316057 深林绿、type #503661 深兰紫、number #874B36 深陶土、operator #756361 暖石灰、comment #676890 冷灰紫（comment/operator 对比 4.84/5.16 一律退到核心语法最低 6.20 之下）。
④技巧：**代码区由暖纸改冷纸**——浅底主题的正确反差来自深墨 syntax 而不是深色卡。**暖色场是试算后否决的**：广场米白/墙奶白两个暖源 L* 几乎相同，实测搭出来最近的两个表面 1.001:1、border 只剩 1.015:1、8 级阶梯塌成两级，而冷色族有 51 L* 的可用明度跑道（暖色族只有 32 L*）。**概念名从「晨曦城堡」改成「蓝调城堡」**：五张图里没有一张是黎明，场色那条蓝取自 2.jpg 的正午天与 1.jpg 的午夜天；名字要跟决定走。**判尺看不见的三处也手算到底**：宿主把发送按钮标签写死 #fff、按钮悬停态复用同一前景色、tooltip 浮层文字由引擎现算——info #1C63A6 在常态 6.20:1 / 悬停 4.79:1 双双达标，主按钮悬停 4.89:1，浮层文字 11.22:1。全 37 槽由 5 张参考图的实测像素按定比混合算出，零凭想象：38 条硬对 + 15 条 UI 对全绿，IP 设计规范零告警（色相孤岛 0 / 角色碰撞 0 / 语法核心 ΔE76 23.5），全库审计 0 违例。

## 超级马里奥（light + dark，v3.6 逐像素取色重绘）

①基调（light「1-1 白昼」）：天蓝当「场」。8 个背景槽全部收进 1.png 的天空像素 #5A96FF 一支，只拉明度不换色相——inputBg #FAFCFF（混白 97%）→ codeBlockBg #F8FAFF（96%）→ background #F5F9FF（94%）→ sidebarBg #F2F7FF（92%）→ backgroundPanel #EFF5FF（90%）→ codeHeaderBg #EDF3FF（89%）→ backgroundElement #EAF2FF（88%）→ bubbleBg #E5EFFF（84%）。代码区不用深色卡：浅底主题的正确反差来自深墨 syntax，不来自换舞台。
②基调（dark「1-2 夜行」）：同一支天蓝压黑成夜空。background #060A12（压黑 93%）→ codeBlockBg #04060A（96%）→ codeHeaderBg #05080E（94%）→ inputBg #080E17（91%）→ sidebarBg #090F1A（90%）→ backgroundPanel #0B121F（88%）→ bubbleBg #0C1421（87%）→ backgroundElement #0E1829（84%）。正文换成浅沙 #FFBEB5 提亮到 #FFE2DE——夜里那块奶油砖自己在发光。
③组合：primary 帽红 #C7280E（3.jpg 直采）× secondary 背带蓝 #0C4BAA（3.jpg 直采），HSL 夹角 152.4° 落进互补区；dark 侧 primary 改 NES 小马里奥红 #DE2800 压黑 12% 的 #C32300（深底上红按钮要反白 5.98:1，亮红过不了门槛），secondary 换 2.jpg 背带受光 #4284DA。info 天蓝压深（light #486EB6 / dark #3F69B2），success 山丘绿（light #0D6305 压深 46% / dark 灌木绿 #84D310 直采），warning 金币黄（light #6F5803 压深 26% / dark 纽扣金 #F3CD24 压黑 25% 的 #B69A1B），error 砖红（light #94210D / dark 亮橙红 #F7470E）。
④借物（syntax 七色）：light 全部深墨——keyword 帽红压深 18% #A8240D、function 背带受光压深 40% #335687、type 灌木绿压深 50% #50720D、number NES 橙压深 50% #8E5522、string 鞋棕 #7E370B 直采、comment 胡子墨混白 41% #7A726E、operator 胡子墨混白 38% #736B67。dark 换成原色霓虹——keyword #F34525、function 眼睛蓝 #529DF0、type 纽扣金 #F3CD24、number NES 橙 #FF9A39、string 灌木绿提白 35% #AFE264、comment #A37A74、operator #99726D。
⑤技巧：25 个设计角色两两不同值这条判尺最狠——NES 只有一支红族，帽红因此拉出四级（primary #C7280E / link #B6260E / keyword #A8240D / error #94210D），砖橙拉出两级（diffRemoved #AB4108 / markdownEmph #903809）；背景家族必须同族，所以奶油砖不能当代码纸，改去做 markdownEmph 与 dark 的暖边框。删除行用砖橙而不是报错红：删掉的砖块本来就是碎的。审计：38 硬对 + 15 UI 对 + 25 角色零碰撞 + 语法核心 ΔE76 light 13.2 / dark 37.3 + 背景色相孤岛 0 + 品牌几何互补 + comment·operator 退后，两套全绿、0 待处理告警。

## 乐高（light）

①基调：浅灰底盘，中性冷灰阶梯：background #EDEEF0 → sidebarBg → element 凹槽 → panel 凸起 → inputBg 近白 → bubbleBg 最亮；codeBlockBg #E3E5E9 + header #D9DCE2 改为浅灰展示底盘舞台（近中性的浅卡，彩砖在日光下显色）。原三处纯白拆成三级白，浅底也有凸凹。
②组合：primary 乐高红 #D01012 × secondary 积木黄加深 #D9A000（Logo 式红黄搭档），info 蓝砖 #0055BF 构成经典三原色三角色；borderActive 标志红点亮；border 灰缝不抢戏。 v3.1：borderActive 拆为 #A80D0F（解 primary 并岗、达 UI 3:1）；secondary 压深为 #AE8000 达浅底 3:1。
③借物：info 蓝积木、success/diffAdded 绿积木、warning 黄积木压暗保可读、error/diffRemoved 红积木暗红；diff 底沿用浅绿/浅红。syntax 改浅灰底盘深墨：keyword #7F4389 紫红砖、function #6D581A 暗金、type #2C5C90 深蓝砖、string #356239 深绿砖、number #4D5F1E 深橄榄砖、operator #625E56 暖深灰、comment #5C6065 冷深灰（一暖一冷两灰退后）。排版：标题红、链接蓝、行内码暗红、强调 #141416 近黑、灰阶退后。
④技巧：secondary 弃通用蓝改砖黄加深，红黄成 Logo 搭档；浅色主题的代码卡改浅灰展示底盘，syntax 七色转深墨——彩砖平时散落、舞台聚光不再靠黑砖托底；v3.1 把 text=strong 拆开（strong #141416）、textMuted 压深为 #383A3D，浅底弱文字全部达标。

## 龙珠（light，v3.7 逐像素取色重绘：4 图全量取样 + 大面积低彩度）

①基调：**海报橘底 + 奶油纸卡**。37 槽全部从 4 张参考图（1.jpg 群像海报 / 2.jpg 悟空立绘 / 3.jpg 七颗龙珠 / 4.jpg DBZ KAKAROT）的真实像素里取，一个色都没编：先建 227,171 条像素银行（4 图全量去重），再按「色相家族 + 明度目标 + 判尺硬约束」逐槽检索，色相不对或对比度不过就出局。8 个场域槽全部压到**低彩度暖纸**——background #FAF1EA（S6.4，悟空肤色奶油）→ backgroundPanel #F5E2D1（S14.7）→ backgroundElement #F0ECE3（S5.4）→ codeBlockBg #F7DEC0（S22.3）→ codeHeaderBg #F0C59B → sidebarBg #EDC89B（S34.6，唯一的沙色暖块）→ bubbleBg #FFFFFF / inputBg #FDFDFD。
②组合：primary 龟仙流道服橙 #BD3C03 × secondary 道服藏青 #194E70（2.jpg 内衣蓝原色系）。**primary 是 2.jpg 里出现 3802 次的那一个像素**（#F49A1F），浅底上必须压深到 #BD3C03 才拉得开反白文字（5.01:1）；focus 环 borderActive 拆成藏青 #103347——浅底上深蓝过 3:1，而深橘在暖纸上只有 2.2:1。border 悟空肤色描边棕 #A38040，对 8 个表面里有 4 个不足 3:1（安静描边，符合浅底主题惯例）。
③借物：info 胶囊科技青 #266670、success 神龙那美克星绿 #367036、warning 龙珠金压深 #7A4C00、error 如意棒赤 #6B1C21。语法七色按 IP 语义重分且色相不变、转深墨：keyword 魔贯光杀炮紫 #42365C、function 龙珠金 #664C19、type 仙豆黄绿 #335C22、number 胶囊粉 #61435F、string 球体橙 #612B05、operator 悟空肤色暖灰 #756148、comment 修行烟尘灰 #70615C（后两色 4.54/4.55 退到核心语法最低 6.00 之下）。
④技巧：**大面积低彩度、小面积高彩度**——这是这次改版的全部理由。上一版把 21% 的屏幕面积铺成 S87 的饱和橘 #FCB120，一眼是龙珠但长时间盯着刺眼；现在饱和橘只留在真正需要提示的小面积（主按钮、侧栏、代码卡顶带、行内码、diff），画布交给 S5–15 的暖纸。**浅底上弱文字必须更深**：textMuted #573E2A（土棕）在暖纸上的 80% 透明合成仍有 4.74:1，浅色主题的 labelDimmed 才是真正的坑。53 对判尺全绿（正文最低 10.76:1、语法最低 6.00:1、主按钮反白 5.01:1），全库审计 0 违例、IP 设计规范 0 待处理；4 个 diff 底色是「真实像素 × 真实暗底」的合成值（图里本就没有暗绿/暗红），其余 33 槽是原图 1:1 像素。

## 火影忍者（light）

①基调：**晒过的和纸**。三张参考图（2.jpg 剧场版海报 466×659 / 3.jpg 第七班合影 555×553 / images.jpg 单行本卷一封面 364×549）里没有一块大面积的「漫画纸」—— 唯一真纸页是封面 #FFFFFF，其余奶油色都是皮肤与光影。所以亮册 8 个表面槽是**按封面金黄云纹的色相（H 95）派生的暖纸阶梯**，不是直采像素：inputBg #FDFBF7（L\*98.7 C\*2.1）→ background #F7F5EF（96.5/3.1）→ backgroundPanel #F0EDE8（93.8/2.8）→ codeBlockBg #EBE6D6（91.3/8.5）→ bubbleBg #FFDBDD（90.4/13.3，樱花粉）→ backgroundElement #E0D9C7（86.8/9.7）→ codeHeaderBg #D0C5A7（79.7/16.5）→ sidebarBg #C4C0B4（77.7/6.6）。浅底主题的「暖纸同族」是有意的规矩：7 个 chrome 表面同属 GOLD 锚点 ±20°，bubbleBg 是唯一的樱粉例外。
②组合：primary 鸣人战衣橘 #A0542D（L\*44.2 C\*45.8 H52）× secondary 佐助藏青 #364364（28.7/21.5/H282），HSL 夹角 157.3° 落进**互补**。**故意不做高彩度橘**：参考图的战衣橘是照片固有色（C\*48），而龙珠/马里奥/乐高的 primary 是合成高彩度（C\*74–85）—— 保持低彩度正是本主题读作「照片里的鸣人战衣」而不是「通用橙」的原因；与龙珠 primary 的感知距离 ΔE2000 8.1 / ΔE76 28.7，拉开靠的是彩度不是色相。borderActive 藏青 #1C578C，border 冷灰 #C1C2C7。
③借物：text 勾线墨 #2B2D39、textMuted 面罩蓝灰 #3B3F4F、info 天空查克拉蓝 #407AA8、success 乌鸦暗部松绿 #477C68、warning 金发暗阶 #6C6A25、error 樱红衣 #AB475A；markdownHeading 藏青 #203E74、markdownLink 封面蓝天 #0869A8、markdownCode 战衣深橘 #7C3D18、markdownEmph 樱肤 #975A60、markdownStrong 纯墨 #171923、markdownBlockQuote 背心橄榄 #666B5F。syntax 五核心：keyword 深橘 #823B29、function 藏青 #48609A、type 钢蓝 #44668D、number 橄榄金 #5A5A03、string 松绿 #335A4A（两两 ΔE76 最小 12.9）；comment #5A6A54 与 operator #66676D 退到核心之下。
④技巧：**大面积低彩、小面积高彩**。渲染实测（playwright 逐像素统计）：bubbleBg 占屏 10.7%、响度 14.2；primary 只占 1.05%、响度 4.8 —— 这套盘子的第一眼不跳橙色，要看第二眼，这是「参考图里本就没有大面积橙色」的素材事实的直接后果。浅底上弱文字才是真正的坑：textMuted 的 80% 合成（labelDimmed）在 backgroundElement 上仍有 4.59:1。四支 diff 色显式给足：diffAdded #134C3A / diffAddedBg #CFDFD8（7.16:1）、diffRemoved #7D263A / diffRemovedBg #E2CDCE（6.27:1），引擎 ensureDiffContrast 对本册 6 支 diff 色 0 改写。

## 火影忍者·暗部（dark）

①基调：**夜之暗**。暗册不做「藏青一路到底」—— 仓内已有 8+ 个藏青暗主题。8 个表面槽按 L\* 拉开且各自微微偏一点：background #0A0E18（L\*4.0 C\*6.4）→ codeBlockBg #121319（6.0/4.3）→ sidebarBg #181920（8.9/5.2）→ inputBg #1C1C2B（10.9/11.0）→ backgroundPanel #1E2334（14.0/12.2）→ backgroundElement #232C3D（17.9/12.1）→ codeHeaderBg #27324F（21.1/19.8）→ bubbleBg #3A3746（23.9/10.1）。**bubbleBg 原本给的是樱红 #43292B，判尺报出「色相孤岛」告警**（8 个背景槽里彩度 ≥8 的必须落在基色 ±60°，樱红 H 15.9 与基色 H 279 差 97°）—— 改成同一藏青家族里偏紫的 #3A3746 后告警清零，代价是暗册失去了唯一一抹樱色，改由 error #D76979 与 markdownEmph #EDAAAF 承担。
②组合：primary 战衣橘 #EF9568（L\*70.1 C\*48.0 H52）× secondary 藏青 #5C6D91（46.0/21.9/H277.8），夹角 159.2° 互补。**暗册是「先亮后暖」**：primary 是全册最亮的高彩色，从近黑的底上天然跳出来；与龙珠 primary 的感知距离 ΔE2000 24.8。borderActive 亮蓝 #7CA3D6、border 冷灰 #38393F。
③借物：text 卷白 #E7E8EC、textMuted 银发 #B1B3BC、info 夜空钢蓝 #7C8CA7、success 背心灰绿 #83A294、warning 金发亮阶 #E2C377、error 樱红衣提亮 #D76979；markdownHeading 金发 #F0DC94、markdownLink 查克拉天蓝 #97B8E9、markdownCode 樱肤 #E5A88C、markdownEmph 樱粉 #EDAAAF、markdownStrong 纯白 #FBFCFF、markdownBlockQuote 银灰 #9A9BA2。syntax 五核心：keyword 桃红 #F39984、function 亮蓝 #8E9ED8、type 钢蓝 #6F8DBC、number 柠檬金 #C9C474、string 薄荷松绿 #B2D3C6（两两 ΔE76 最小 10.7）。
④技巧：**代码卡是近黑的洞**（codeBlockBg #121319 比 background 深两档），配 codeHeaderBg #27324F 的顶沿，块码像从夜里挖出来的一块。暗册四支 diff 色：diffAdded #ADE3CD / diffAddedBg #1D2D26（10.06:1）、diffRemoved #EB929E / diffRemovedBg #352023（6.61:1）；**diffRemovedLineNumberBg 原给 #523D3E 时对比只有 4.36:1，运行时引擎 ensureDiffContrast 会改写它、并把两个 diff 底压成同一个值** —— 提前压深到 #4D393A（4.66:1）后引擎 0 改写。这是「判尺全绿 ≠ 出货即最终值」的实例：判尺只查作者值，运行时兜底是另一套算法。

## HelloKitty（light）

①基调：草莓牛奶粉白卧室，340° 粉红家族阶梯：background #FFF5F7 → 气泡 → 面板 → 输入 → 侧边 → 元素逐级加深；代码区改草莓纸面 codeBlockBg #FBE7ED + header #F6D9E3（浅底浅卡，syntax 转深墨）。
②组合：primary 蝴蝶结正红 #E60012 × secondary 婴儿粉 #FF8FB2，同色相深浅类比；borderActive 蝴蝶结桃粉高亮变体；text 可可棕 #3D2B33 压全场。 v3.1：primary·borderActive 收拢同值压到 #DB0011（反白 4.6:1，documented 并岗保留）；secondary 压深为 #BF6B86 达浅底 3:1。
③借物：info 背带裤牛仔蓝、success 大苹果叶子绿、warning 鼻子鹅黄压深的焦糖布丁黄、error 蝴蝶结红加深、diffAdded 苹果薄荷糖绿、diffRemoved 草莓果酱红。syntax 改草莓纸面深墨：keyword #A6325D 深桃粉、function #705B2D 暗鹅黄、type #396172 深牛仔蓝、string #436651 深薄荷绿、number #904829 深蜜桃橙、operator #79596A 暖灰、comment #746069 可可灰。
④技巧：bubbleBg/inputBg 去纯白化（带粉絮气泡白、奶粉输入底），一浮一沉不用边框也分层；代码卡由深可可改草莓纸面、syntax 转深墨（浅底主题不靠深卡）；number 只动一点色相就与 function 分家，comment 压成可读灰；v3.1 弱文字 textMuted 压深为 #523C46、引用 #925D76 微调，粉底全部达标。

## 哆啦A梦（light）

①基调：蓝天白云晴空白昼，约 200° 天空蓝家族阶梯：sidebarBg 最深下沉 → element → background #D9EFFB 蓝天基底 → inputBg → panel → bubbleBg 白蓝逐档提亮；代码区改晴空纸面 codeBlockBg #CBE7F8 + header #B8DBF2（浅底浅卡，syntax 转深墨）。
②组合：primary 身体蓝 #00A0E9 × secondary 脖颈铃铛金黄 #F7B500，蓝黄互补撞色；border 浅蓝灰，borderActive 身体蓝高亮。 v3.1：primary 压深为 #0072A8（浅底 UI 3:1 与反白 4.6:1 双达标）；borderActive 拆出为 #005A88（解并岗）；secondary 压深为 #A17600。
③借物：info 身体蓝加深、success 竹蜻蜓竹叶绿、warning 铃铛黄压暗保可读、error 红鼻子红、diffAdded 竹叶深绿系、diffRemoved 红鼻子红系。syntax 改晴空纸面深墨：keyword #8C4550 深门粉、function #1D6378 深海身体蓝、type #6D581A 暗金、string #2B6648 深竹绿、number #675084 深薰衣草紫、operator #50667E 云影深灰、comment #4C6272 云影灰蓝。
④技巧：代码区由深蓝卡片改为晴空纸面（浅底主题的代码区同色系浅卡，syntax 转深墨），markdownCode #8C4A1F 铜锣烧焦糖棕满屏蓝里一点棕最哆啦A梦；warning 比 secondary 压暗两档（同取铃铛，亮处点缀暗处告警）；v3.1 弱文字 textMuted 压深为 #2F4250、引用 #4E6A7D，浅底全部达标。

## 奥特曼（dark，v3.9 逐像素取证重绘）

①基调：**两张图里的同一个奥特曼**。2.jpg 是奥特战士站在森林里（蓝天在上），images.jpg 是「奥特曼图鉴」海报（白圆角面板 + ~40 个立绘网格 + 靛蓝→紫→亮蓝的相框渐变 + 深蓝大标题）。场域不取通用深空靛，而是取海报画框里最黑的那一格当画布——`#000600`（2.jpg (12,224)，44 px）——再把海报标题笔画的那支靛 `#2D2C8A`（images.jpg (256,25)，11 px）按目标 L\* 反解出 7 档 α 染上去：codeBlockBg `#060B11`（α=0.1268, L\*2.88）→ sidebarBg `#0A0F1F`（0.2237, 4.56）→ inputBg `#0E112A`（0.3026, 5.97）→ bubbleBg `#111433`（0.3667, 7.75）→ backgroundPanel `#14163C`（0.4342, 9.39）→ backgroundElement `#161945`（0.4964, 11.24）→ codeHeaderBg `#191C4E`（0.5658, 13.15）。步长 ΔL\* 1.41–1.91（house 判尺要求 ≥1.4），两支染色源本身也都是直采像素。
②组合：**红冠 + 金眼**——奥特曼的两个声部。primary 战甲受光正红 `#D52518`（2.jpg (199,249) 胸腹甲片）× secondary 角色立绘金瞳的边缘高光 `#EFCB5D`（images.jpg (317,214)），色相差 **41.1° 类比**（红金同族，比 v3.1 的 42.5° 略近一档）。焦点环不跟品牌色抢同一支：borderActive 取战甲肩后的天空 `#87C3F5`（2.jpg (145,118)）——界面里最醒目的一个点是天空，不是按钮。info 战甲之外的天空 `#2AA1B7`（2.jpg (380,241)），success 胸前绿色计时器的核心 `#2F9877`（images.jpg (211,237)），warning 金色头冠的暗面 `#BD8E36`（images.jpg (139,457)，与 secondary 同一束金的暗面），error 战甲受光朱红 `#F05F4E`（2.jpg (266,216)，比 primary 更浅更偏橙的受光面）。四支暖色按亮度排成一条「淡金→古金→朱红→正红」的阶梯。
③借物：diffAdded 森林树冠的翠绿 `#3C9B6F`（2.jpg (39,209)）、diffRemoved 角色立绘的玫瑰红 `#C9667B`（images.jpg (154,340)）；4 个 diff 底是这两个直采色按 α=0.13 / 0.20 染在画布上（`#08190E` / `#1A1210` / `#0C2416` / `#281919`）。markdown：heading 冰蓝装甲高光 `#C0ECFF`、link 天海交界的青 `#51AEB5`、code 山坡赭金 `#D0B26C`、emph 海报下缘淡紫 `#B6A8CB`、strong 战甲近白高光 `#F8FBE6`、blockquote 银白甲片 `#91B2B7`。syntax：keyword 战甲受光红 `#D95638`、function 海报相框能量蓝 `#3A80FA`、type 天顶淡蓝 `#8CCDE9`、number 金瞳核心 `#F4C738`（与 secondary 同源相邻 1 px，ΔE76 14.2）、string 计时器外缘 `#67CDA6`、operator 海报下缘紫灰 `#8774A2`、comment 战甲暗部紫灰 `#747D86`。text 取战甲银白高光 `#DEEFF6`（2.jpg (206,27)），textMuted 取银灰暗面 `#AFB9BB`（148,111）。
④技巧：codeBlockBg 只比画布高一档（`#060B11` vs `#000600`）——舞台是近乎黑的深空，代码靠 syntax 七色自己发亮，不靠底色对比；header 反跳到家族最亮当顶灯（一暗一亮锁住代码区）。brandGeometry 走 41.1° 类比而不是硬凑互补：红与金在图里本来就是同一张脸的两半。warning 与 secondary 同束不同面（暗面 #BD8E36 vs 高光 #EFCB5D），「提示」和「品牌」因此不会撞衫。primary 同时是宿主的文字色角色（`--dsw-alias-state-business-primary`），12px 芯片上只有 3.77–4.00:1——记为已知限制，house 24 套里 6 套暗色红主题同病（3.36–3.85:1），本套比它们好。
⑤已知边界：① **26 个直采色全是边缘像素**（5×5 邻域极差 43–255）——JPEG 参考图里根本没有平坦色（找过，候选 0 个），所以「等于原图某像素」保证的是**没有一个标志性颜色是想象出来的**，不是「取到了一大片实色」；② 每个直采色在原 JPEG 里通常只出现 1 次，换解码器或重存可能带来 ±1 偏移；③ 11 个混合槽按构造不是原图像素，是可复算配方（α 精确到 4 位小数）；④ primary 的 12px 文字缺口（3.55–4.00:1）。
⑥判据：house 硬性 38 对 **0 违例**（最紧 contrastText(primary)@primary 4.65）、UI 15 对 **0 违例**（最紧 primary@backgroundPanel 3.39）；宿主现实 49 对 **0 硬违例**（最紧 info 实心填充+#fff 3.05、primary@codeHeaderBg 3.12——焦点环真会落在代码卡顶栏上）；角色同值碰撞 0、markdown 同值 0、品牌几何 41.1° 类比、语法核心最小 ΔE76 40.0、comment 4.72 / operator 4.75 退到核心最低 5.02 之下；**色盲四态** normal 23.5 / deutan 18.6 / protan 14.5 ΔE76（house 24 套中位 9.8、最好 18.3、doraemon 样板 4.5、旧 ultraman 7.3）；borderActive ↔ syntaxComment ΔE76 35.2（house 24 套最小 11.7，无一套 <10）。引擎 `ensureDiffContrast` 对本套 37 槽 **no-op**——台账里的值就是出货值。

## 变形金刚（dark，v5 逐像素取证重绘）

①基调：赛博坦午夜天台。8 槽不是算出来的阶梯，而是 **5.jpg 夜空里真实像素排成的明度阶**——codeBlockBg #020B1C 地核停机坪 → sidebarBg #021128 侧舱走道 → background #08122B 主场 → backgroundPanel #04133A 舱室面板 → inputBg #022447 输入甲板 → codeHeaderBg #0A2250 代码盖板 → backgroundElement #0D2354 悬浮钢层；气泡槽 bubbleBg #241340 取 5.jpg 星云洋红，是全界面唯一的色相孤族（相对基准 222.9° 偏 39°，仍在 60° 线内）。
②组合：primary 汽车人徽章红 #D70A2B × secondary 能量电蓝 #3366A8，350.3° / 213.8° 夹角 **136.5° → 三角**（汽车人红 / 霸天虎蓝 / 大黄蜂黄三张脸都在图里）；borderActive 单独占大黄蜂车漆黄 #F4C803 —— 界面最醒目的一个点是车灯，不是按钮。
③借物：info 塞伯坦全息青 #0A6999、success 山林苔色 #A7ABAA、warning 车漆阴影琥珀 #B07400、error 肩炮熔炉橙 #FF5B02、diffAdded 战场草坡 #8F8C7D、diffRemoved 战损锈铜 #BC9D80。syntax：keyword 胸窗辉光红 #FF0044、function 车漆深金 #E1AA00、type Arcee 玫瑰粉 #F68C8E、number 引擎盖暖砂 #D9B9A0、string 没上漆的钢灰蓝 #8E979C、comment 战场烟灰 #767C72、operator 远景雾蓝 #727A85。
④技巧：**这版的硬约束是「所有颜色必须从参考图产生」**，因此每个色位都带一份机器可复算的配方证明（prototypes/transformers-extraction/sources.py）：直采＝hex 与某张图的某像素完全一致，且 49×49 邻域内至少 24 个同伴像素（在图上是一块看得见的实色，不是 JPEG 噪点里撞上的孤像素）；阶梯＝同一色相族内的明度阶且每一阶本身也是真实像素；混色＝两个采样色按固定比例相乘。四个 diff 底色是混色（引擎要求 6 位不透明）：diffAddedBg #182135 = #8F8C7D×12% + #08122B×88%，diffRemovedBg #1E2335 = #BC9D80×12% + #08122B×88%。
⑤已知边界：五张图里 **没有一处纯正的信号绿**（海报上的绿只有 3.jpg 苔色与 4.jpg 远景草坡），所以 success 只能是山林苔色 #A7ABAA、diffAdded 是草坡橄榄 #8F8C7D——两级明度分开承担「完成」与「新增」，不另造一个更漂亮的绿；同理 markdownStrong 取 1.jpg 白棚里的纯白 #FFFFFF，text 只能退到钢白 #CFE2E8（两者 ΔE76 仅 13.4，明度上限被素材锁死）。
⑥判据：硬性 38 对 0 违例（最紧 syntaxOperator@codeBlockBg 4.53）、UI 15 对 0 违例（最紧 info@backgroundPanel 3.01）、角色同值碰撞 0、背景色相孤岛 0、语法核心最小 ΔE76 27.6、comment 4.59 / operator 4.53 均退到核心最低 5.00 之下、会同时同屏的相邻岗位最小 ΔE76 11.6。 v3.1 旧版（info=secondary、borderActive=markdownLink 两处并岗、heading 并入 primary）在本版全部拆开，exceptions.json 里的 transformers 记档同步删除。


## 海贼王（light，v4 逐像素取色重绘）

①基调：正午·海风——把晴空当纸、深海当墨。三张参考图（images.jpg 草帽路飞 / 2.jpg ONE PIECE 标志 / 3.jpg 草帽团全员）全是白天高调画面，故整版转浅。8 槽收进同一条晴空蓝色相（H200–206，跨度 5.7°，零色相孤岛），只拉开度：inputBg #F2F6F9 云白天 → bubbleBg #E6F3FC → background #E3F3FB 云边淡蓝（主场）→ backgroundPanel #CEEBFA → sidebarBg #C3E6FA → codeBlockBg #B4DFF9 日光浅海纸面（代码舞台）→ backgroundElement #9FD6F9 浮层 → codeHeaderBg #95D2F9 舞台顶栏压边。越往里越深，像从天空一路潜进海里。
②组合：primary 路飞背心红 #C32635 × secondary 深麦秆金 #91774D，42.8° 类比（草帽红缎带 + 麦秆，海贼旗配色）；borderActive 麦秆暗档 #866830。亮草帽金 #E5C016 在浅底只有 1.56:1，过不了 UI 3:1，故品牌位让给背心红（引擎按 contrastText 配 #F4F4F5 反白，5.24:1），麦秆金按图里「草帽阴影」压深成黄铜件——是黄铜，不是亮黄。
③借物：info 潟湖海流蓝 #1B638A、success 索隆三刀绿 #3B674E、warning 娜美蜜柑橙 #934D20、error 赤犬岩浆红 #930B19；diffAdded 索隆绿·暗一档 #315847 配麦色沙纸底 #EDF0B3（3.jpg 沙滩米）、diffRemoved 沉船锈红 #51192D 配浅珊瑚底 #E6E1EB。syntax：keyword 赤犬岩浆红 #A41523、function 深麦秆金 #6C5733、type 深天蓝 #164589、number 娜美橙·再深一档 #553323、string 可可亚草叶绿 #284A41、comment 海图雾灰 #3C617F、operator 船锚钢灰（暖） #6A5B4C。
④技巧：代码舞台是日光浅海纸面，反差来自深墨七色而非黑卡（浅底主题的唯一正解）；正文取标志字内阴影海军蓝 #0F284B（14.31:1），四级阶梯按「加重 #171D2E < 正文 #0F284B < 弱文字 #15355E < 引用 #2B5E90」排列，越靠前越重。语法注释与运算符（4.63:1）退到核心最低对比 4.88 之下；核心五色 ΔE76 最小 18.2。v4 相对 v3：明暗反转（dark → light）、主色由草帽黄改背心红、focus 环留黄铜族、25 个设计角色两两不同值。

## 原神（dark）

①基调：提瓦特星夜，深靛青紫 background #0C152E（区别通用藏青与深海蓝）。8 槽 222° 家族阶梯：codeBlockBg #060C1D 最深 → background → sidebarBg → panel → inputBg → element → bubbleBg → header #243C6B 最亮封顶。
②组合：primary 原石星芒青 #5EEAD4 × secondary 雷元素紫 #A78BFA，星夜天空类比冷色组合；borderActive 原石青高亮；摩拉金 #FFD97A/#E8B64C 第三角加入（青×紫×金星空关系）。 v3.1：borderActive 从 primary 原石青拆出为 #34D399（同色系深一档，焦点环仍在青绿家族）；textMuted 提为 #AAAFD0。
③借物：info 占星术水蓝、success 须弥草元素绿、warning 摩拉岩元素金、error 火元素爆炎红、diffAdded 草绿、diffRemoved 浅火红。syntax：keyword 无想之雷紫、function 水元素流光、type 原石星芒青、number 摩拉金、string 草甸嫩绿、comment 黯淡星尘灰紫、operator 星空连接线银蓝。
④技巧：codeBlockBg 比 background 压深两档+header 最亮封顶（星夜中更深的舞台卡片）；标题传说祈愿金、链接水元素蓝、行内码原石青浅变体（各有代表物）；text 压星夜底对比拉满，muted 灰紫正是星尘雾色。

## 塞尔达传说（light）

①基调：高原因地正午，8 槽全收「阳光下的空气」家族（暖奶油→淡鼠尾草），只按亮度下潜、零描边分割：background #FAF8EF 天光最亮 → sidebarBg #F5F2E9 → codeBlockBg #F7F4EB 纸面舞台 → backgroundPanel #EEEEE0 → codeHeaderBg #E1E8D5 → backgroundElement #DFE7D3 最深；bubbleBg #FDFCF3 / inputBg #FEFEF5 浮到顶。整条阶梯 L* 97.5→90.6，彩度全部收在 h45–84，0 个色相孤岛。
②组合：primary 忘忧花花心暗部 #204A5D × secondary 林克发色金 #827717，144.9° 三角（天蓝对日金）；info 远山蓝灰 #617488、success 草原绿 #466E12、warning HUD 血量橙 #77370C、error 同族陶土红 #9E5D4B。青蓝一族留给「可交互 + 结构」层（primary / borderActive #267593 / 标题 #28444A / 链接 #225B73），靠亮度与用途分开，不靠换色相。
③借物：正文墨取图1/图3 草地背光处的森林阴影 #1E371D（纯黑会让 BOTW 变冷，也和「草丛遮住的地方不是黑，是另一种绿」这句题眼冲突）；secondary 取图3 角色发丝 #DAB314；warning/error 取图3 左上 HUD 血量的橙红 #EB6D30 及其暗部；success 取图3 体力环绿 #3B610C；borderActive 取图4 花心青 #12C1ED；backgroundElement/codeHeaderBg 取图3 草坡最浅处 #DCF7AA。syntax：keyword 深草绿 #163817、function 林克发金 #484915、type 远山蓝灰 #455A68、number 血量橙红 #56271A、string 古代石碑青绿 #235D56、comment 草丛雾绿 #5D6E60、operator 冷岩灰 #556966。
④技巧：主色取花瓣暗部而不是花心亮色——亮青 #12C1ED 在浅底上只有 2.00:1，压不住按钮白字，contrastText(primary)@primary 达不到 4.5；代码区改同族浅色纸面（shiki 前景 = 文字色，深卡会让无高亮代码不可读）；error 只能是陶土红，因为全组最红的一批像素只是 HUD 血量的暗部，没有纯红可用。
⑤v3 修订（对抗式审查后五处）：backgroundElement 改用实测淡草原像素 #DCF7AA——彩度 14→77 把草原第一次放进界面，**且相对亮度几乎不变，对比度预算零成本**（labelDimmed 余量从 4.78:1 放宽到 5.05:1）；codeHeaderBg 同步压深到 #D4ECAB；markdownHeading 从远堡雾紫灰 #605E63 改成那层古蓝 #28444A（正文之外终于有了音色，ΔE vs 正文 22.6、vs 主色 9.0 不撞品牌；实测：材料里没有任何「有色且比正文更深」的锚点，更深的标题物理上不存在）；syntaxOperator 从暖棕 #6D5B52 退成冷岩灰 #556966，把暖色系整族让给 warning/error；syntaxKeyword 让位深草绿 #163817，**语法核心最小 ΔE76 顺势从 12.8 提到 18.8**。关键教训：宿主的 0.8-dim 规则把「表面深度」和「弱文字层级」焊死在一起（元素面降到 L* 82，textMuted 就得压到 L* 24.5）——所以草原只能从**彩度**进场，不能从明度进场。

## 新世纪福音战士（dark，v3.10 平涂取色重绘 · 明暗两册）

> v3.10 逐像素平涂取色 + 对抗式审查（2026-10-20）：整版重绘 + 新增浅色册「晴空」。本套是全 house 里第一条把「直采」定义成**平涂区域代表色**（同色像素成片 + 3×3 邻域方差 0）的预置——上一版按「离锚点最近的像素」取样，44 锚点里 17 个整图只有 1 个同色像素，标签与像素对不上（审查记录见 `prototypes/evangelion-adversarial-review.md`，17+ 处自己稿被推翻）。

①基调：夜战黑紫。8 槽收进「海报黑 → 夜蓝 → 紫」三段（基准色相 226.7°，品牌几何 4.8° analogous）：最暗是海报黑 background #151419 与输入底 inputBg #141520；主体是夜蓝 backgroundPanel #111B3E 与冷灰石板 codeBlockBg #1F1D32；紫调一族给 sidebarBg #282242 / bubbleBg #212558 / backgroundElement #1E2B50；顶灯是 codeHeaderBg #2B334F。描边只留 border #382A5F 一档，靠亮度差分层不靠线框。

②组合：primary 机体高光淡紫 #BB96F5 × secondary 灰紫 #BEAFCF——同一紫相家族的两级，brand 几何落在 4.8° 类比而不是硬凑互补（EVA 的紫本来就是一件事的两面）。info 天空蓝 #7DA0D8，success 同步绿 #DBFD68（酸绿；绿只占三张图 2.5% 面积，稀有色才配当主角），warning 装甲橙 #B2750A，error 装甲红受光面 #E3796A。三种性格色各占一条色相族，互不越界。

③借物：正文 #D5D8DE、弱文字 #A8A8B6、标题海报金 #FAAB00、链接天蓝 #A1CCF6、行内码粉紫 #CAA0B3、斜体酸绿压暗 #97AD50、引用钢蓝 #BAC6DC；diff 新增 #AFC755 / 删除 #D78A90（行底与行号槽各按 12% / 6% 染色，引擎无需修复）。syntax 七色：keyword #B4B3D0、function #C2DEF4、type #DEBAC7、number #F9B219、string #89B872、comment #8B8996（退后）、operator #7D90AC（退后）。核心语法最小 ΔE76 16.3。

④技巧与代价：**错误色不能是图里的纯红**——图中最纯的红 #DC4C2A 在浮层底上只有 3.37:1，改取「装甲红受光面 #D8402B × 云白 35%」得 #E3796A（页底 6.29:1）；**饱和红过不了引擎 pickText 的陷阱区**（luma601 落在 0.4–0.6 会挑到白字，而饱和红的 luma601 最高只有 0.299），所以错误色只作文字与圆点、不作填充按钮底（真机原型里填充按钮底只有 primary / info）；**焦点环 33% alpha 到不了 3:1**（白 @33% 压暗底上限 2.66:1，任何色板都救不了）——这是渲染属性，不是色板缺陷；**注释与运算符不要求互相可分**（都是低显著度记号，仓库判尺只要求它们退后到核心语法之下）。

## 新世纪福音战士·晴空（light，新增）

①基调：白天的天空。浅色半不是深色半反过来——底来自 3.jpg 的云层 #EFF2F7，文字用 2.jpg 的夜蓝 #181824（所以白天那套是天空，不是纸）。8 槽一条冷调亮度梯（基准色相 217.5°）：background #EFF2F7 → sidebarBg #CCD5E5 → bubbleBg #DDD3F6（紫调气泡）→ backgroundPanel #FEFEFE（纯白卡片）→ backgroundElement #E8E8F2 → inputBg #CAD0D8（中性钢灰）→ codeBlockBg #C9E1F4（浅蓝代码纸）→ codeHeaderBg #A9C3E0（更亮的顶灯带）。

②组合：primary 深机体紫 #473D94（引擎配白字 8.09:1）、secondary 深灰紫 #3D3660、info 夜空蓝 #0F2242（pickText 给白字 14.39:1——浅色信息色必须离开 luma 0.4–0.6 陷阱区）、success 深林绿 #344D2C、warning 铜金 #785614、error 暗红墨 #422329。品牌几何 3.1° analogous。

③借物：标题深墨棕 #5D4523、链接深蓝 #0044A0、行内码紫墨 #67575A、斜体橄榄 #525D38、引用钢蓝 #4A5164；diff 新增 #2B4429 / 删除 #4D2638（行底浅绿灰 #E5EBDD / 浅粉灰 #EDDEDE）。syntax 七色：keyword #564A77、function #414F63、type #4F3F47、number #604C29、string #243A2E、comment #2E5891（退后）、operator #4F4A9A（退后）。核心语法最小 ΔE76 14.9。

④技巧与代价：**白底上 4.5:1 ⇒ 状态色只能用墨色**（L* ≤ 50），所以浅色半的 error / warning / success 都是深墨而不是鲜色——红绿状态色在红色盲下仍会互相靠拢，这是「白底 + 4.5:1」的客观结果，不粉饰；**浅色半的「退后」空间天生窄**：注释 5.33 / 运算符 5.60 已经贴着核心最低 5.89——曾尝试整体加深 5 个核心语法色来拉开空间，立刻换来 7 条硬违例（核心角色挤成同一片深色），已全部回滚。

## 赛博朋克2077（dark）

①基调：夜之城午夜沥青暖李子黑 background #141017（原通用藏青蓝黑改掉，带品红霾味）。8 槽同李子灰家族阶梯：codeBlockBg #0A070D 坑底最深 → background → sidebarBg → panel → inputBg → bubbleBg → element → header #2E2344 霓虹雾沿最亮。
②组合：primary 2077 Logo 漆黄 #FCEE0A × secondary 丽兹酒吧霓虹粉 #FF2A6D，高明度互补对冲；borderActive 漆黄高亮。info 网络黑客冰蓝 #00F0FF 加入，黄粉青霓虹三角色（标题黄、链接青、描边黄闭环）。 v3.1：borderActive/heading 从 primary 漆黄拆成两级 #FFF24A/#FFF7A8；textMuted 提为 #B3A8BE（与引用解耦）；error=diffRemoved 并岗保留。
③借物：info 网监冰墙全息青、success/diffAdded 街头酸性霓虹石灰绿+V 义眼绿光、warning NCPD 路障琥珀灯+强尼银手琥珀镜片、error 荒坂红临界警报、diffRemoved 螳螂刀霓虹粉。syntax：keyword 螳螂刀粉、function 黑客冰蓝、type 赛博漆黄、string 毒霓虹绿、number 琥珀灯、operator 超梦紫铬、comment 褪色广告牌薰衣草灰。
④技巧：codeBlockBg 坑底+header 沿口（夜店卡座包边式下沉舞台）；diffRemoved 从通用报错红换成霓虹粉+粉洗底（删除行像被霓虹灯管划掉）；textMuted 不用中性灰用霓虹雾薰衣草灰 #9A8BA8（与 background 同家族，次要文字像雾里远灯）。

## 美少女战士（light，v4 逐像素取色重做）

①基调：月光星纱——纸是「白羽 × 樱粉」一条混色阶梯（12%→64%），8 个背景槽同族、零色相孤岛：bubbleBg #FFF6FA 最白浮起 → inputBg #FFE9F3 凹陷 → background #FFEEF5 → border #FFE2EF → codeBlockBg #FFE1EE → codeHeaderBg #FEDAEA → sidebarBg #FFDEED → backgroundPanel #FED7E9 → backgroundElement #FED1E5 最深；代码卡不再另起一块中性灰纸，改成同族浅纸（樱粉 42%）。
②组合：primary 2.jpg 深红蝴蝶结 #C51E56 × secondary 海报藏青短裙 #133284，HSL 夹角 116.3° 落进三角关系（粉 × 蓝 × 月金三角色，Hello Kitty 与库洛米都没有这套制服藏青）；borderActive 玫红深阶 #8B1B50，border 樱纸浅描边。
③借物：text 3.jpg 夜空暗部 #041541（正文与结构都是夜空墨）、info 2.jpg 星云蓝 #1659A7、success 海报青绿飘带 #006D72、warning 2.jpg 暖金长发沿明度轴压到 L0.50 的月牙金 #845A00、error 海报红日 #AA171F；syntax 五核心压在同一条明度 L=0.44 上：keyword #9B003E 深玫、function #1830D8 群青、type #025A7B 海青、number #6F4A00 赤铜、string #375D39 海绿，两两 ΔE76 最小 41.9。
④技巧：37 个色位只允许三种来源——直采 8 个（逐像素回原图复核命中数）、阶梯 10 个（采样色沿 OKLCH 明度轴取阶）、混色 19 个（两采样色按固定比例在 sRGB 空间混合）；注释 #516384 与运算符 #625477 各自退到核心语法色之下，形成三级退后梯队；旧版的 #C42C6B 在三张参考图里一个像素都找不到，本版全部重取。审计：38 硬对 + 15 UI 对 + 6 项 IP 设计规范 0 违例 0 告警。

## 库洛米（light，第 21 套）

①基调：浅紫香芋牛奶 background #F4ECFA（21 套里最新的浅色甜酷担当），6 个浅背景槽同紫相阶梯；代码区用近白纸卡 codeBlockBg #FBF7FD + header #EEE2F5（浅色主题用浅 code 卡的质量标杆结构，不靠深卡）。

②组合：primary 蝴蝶结莓红 #BD3064 × secondary 暗紫 #A84AB2（同紫相深浅类比，夹角 43.6°），borderActive 中紫 #8D6AAE 收拢焦点；text 深墨紫 #241A2C 压全场。

③借物：syntax 七色全为深墨——comment #736379 灰紫、keyword #AD386B 莓红、function #6E49A8 紫、type #4A5AA8 靛蓝、number #96521A 焦糖、string #2C6F5D 松绿、operator #7C5F90 藕紫；error #A81B38 与 diffRemoved #A31638 拆成两个近红（删除行不冒充报错）。

④技巧：浅色代码卡是库洛米的质量标杆结构（浅底主题不靠深卡，正文与 syntax 一律深墨）；v3.1 把 secondary 提为 #A84AB2 修品牌紫几何（原 70.2° unclassified → 现 43.6° 类比）、error/diffRemoved 拆分、弱文字 textMuted 压深为 #45384D。
