# IP 预置主题配色思路（对抗式重审版，21 套）

> v3.1 可读性整改（2026-10-19）：21 套全部按 docs/theme-audit/criteria.md 机器判尺整改到位（硬对/UI 对 0 违例、设计告警 21 条全记档 / 0 待处理，--check 退出码 0）。设计意图、品牌色与气质保持原案；6 套浅色主题的代码区由深色舞台改为同色系浅色纸面舞台（syntax 七色转深墨），其余主题主要是 primary/borderActive/标题/弱文字等 token 的对比度与并岗几何微调——正文里少数未及更新的 hex 以 src/custom-presets/*.json 终值为准。

> v3.2 逐像素取色（2026-10-20）：**哈利波特整版重绘**——所有颜色改由四张参考图逐像素取样，只允许「直采 / 明度阶梯 / 两色定比混色」三种来源，id / name / appearance 不变（仍是同名 `harry-potter` 胶囊）。取色台账与原图裁切见 `prototypes/harry-potter-theme-preview.html`；详见 docs/ip-presets-v3-notes.md 末节。其余 20 套不受影响。

> v3.3 逐像素取色（2026-10-20）：**星球大战整版重绘**——37 槽全部改由三张星战海报（天行者崛起 / 天行者的崛起 / 最后的绝地武士）逐像素取样，只允许「直采 / 明度阶 / 彩度阶 / 定比混色」四种来源，id / name / appearance 不变（仍是同名 `star-wars` 胶囊，dark）。取色台账与原图裁切见 `prototypes/star-wars-theme-preview.html`；取色管线见 `prototypes/star-wars-extraction/`。硬对 38 / UI 15 全绿，设计告警 0 条；v3.4 起按「两刃对分」重排配比（红刃 51.9% / 蓝刃 48.1%），底色换成两刃交点的近黑紫。其余 20 套不受影响。

> v3.5 逐像素取色（2026-10-20）：**宝可梦整版重绘**——37 槽全部改由四张参考图（官方图鉴立绘 / wikiHow 平涂 / 30 周年 / 合志插画）逐像素直采，只允许「与原图某像素完全一致」一种来源，0 阶梯 0 混色 0 想象；id / name / appearance 不变（仍是同名 `pokemon` 胶囊，dark）。取色台账与原图裁切见 `prototypes/pokemon-theme-preview.html`；管线见 `prototypes/pokemon-extraction/`。硬对 38 / UI 15 全绿，设计告警 0 条（v3 记档的 6 组并岗已全部拆开，exceptions.json 的 pokemon 条目随之删除）。其余 20 套不受影响。

> v3.4 逐像素取色（2026-10-20）：**原神整版重绘 · 明暗两套**——五张参考图（官方主视觉 / 派蒙 / 可莉 / 温迪 / 旅行者）逐像素取样，只允许「直采 / 两色定比混色」两种来源。胶囊从一条变两条：`genshin`（原神，light，纸感明信片）与 `genshin-night`（原神 · 夜航，dark，夜航明信片）——自定义胶囊一条只装一套色（`renderCustomTheme` 把同一套 37 色灌进明暗两半，`appearance` 只决定宿主按哪种外观显示），所以「明暗一体」只能靠两条胶囊各自带自己的 appearance 实现。硬对 38 / UI 15 全绿，设计告警 0 条。其余 20 套不受影响。

## 宝可梦（dark）

①基调：**图鉴卡的暗场**。四张图里只有 01 号官方图鉴立绘有黑白结构，所以场域全部收进它的冷调明度阶梯（基准色相 240.0°，0 个色相孤岛）：codeBlockBg #000000 最深（对战舞台）→ sidebarBg #060606 → inputBg #0C0C10 → background #1C1C22 → bubbleBg #28282D → backgroundPanel #37373B → backgroundElement #40404A → codeHeaderBg #48484D。**冷场暖字**：底是卡面的冷调蓝黑，暖意全交给徽章金与御三家。旧版的常磐森林深墨绿 #0E1B13 整族作废（那张图里一个像素都没有）。
②组合：primary 图鉴卡编号徽章黄 #FFCB05 × secondary 2.jpg wikiHow 蓝底 #799DFE = 176.2° 互补。**黄只做「牌」不做「底」**——它是填充色，引擎按 contrastText 派生前景 #141414（12.10:1）；徽章黄在暗底上当文字只有 1.4:1，绝不做正文。borderActive 用皮卡丘受光面 #F4D77C（焦点环比品牌亮一档），border 退为精灵球带灰 #58585A。
③借物：4.jpg 合志插画一次交齐御三家——success 妙蛙种子绿 #7AA85D、warning 小火龙橙 #FB8603、error 精灵球红 #F93D32、info 杰尼龟蓝 #289BCA。diffAdded 合志浅青绿 #7FC9AE、diffRemoved 2.jpg 脸颊红 #FE4C1C。syntax：keyword 皮卡丘嘴部藕粉 #C790A3、function wikiHow 蓝底暗面 #6E9BBC、type 合志青灰 #658F8B、number 皮卡丘中金 #DFBF6F、string 合志浅青绿 #80CAAF、comment #85858A / operator #7A7A7F 退后。
④技巧：text 取 01 号图鉴卡页脚自己的白字 #EEEEF4、textMuted 取合志插画的淡灰蓝 #D3D3D8，弱文字用其褪色版（labelDimmed = withAlpha(textMuted, 0.8)）。markdown：heading wikiHow 平涂黄 #FAE721、link 合志天空蓝 #95C7F8、code 合志奶黄 #FDE7B5、emph 合志暖杏 #F9B584、strong 卡纸白 #FFFFFF、blockquote 合志淡灰蓝阶 #BDBDC3。v3.5：37 槽全部改由四张参考图**逐像素直采**（0 阶梯 0 混色），硬对 38 / UI 15 全绿，设计告警 0（v3 记档的 6 组并岗全部拆开）。

## 漫威（dark）

①基调：整版重绘为**逐像素取色**，判尺从「直采/阶梯/混色」三分改成**四级**（对抗式审查结论：原先「37/37 直采」是错标——按图里真实体量，只有 9 条是字面像素）。**A1 实涂 9 条**＝图上真被平涂过的色（#1C1C22 版面底占全部像素 38.1%、#0C0C10 深墨条 9.9%、#FFFFFF 65,255 px、#F11E22 标志红 60,287 px、#000000 蜘蛛侠纯墨线 20,078 px、#FFCB05 页脚黄 8,917 px、#EEEEF4 正文白 6,499 px、#40404A 版式发丝线 1,540 px、#A0A2AC 次级灰 509 px）；**A2 边阶 11 条**＝能被证明是两个平涂色的渲染器抗锯齿混合（误差 ≤0.54/255），例如 textMuted #BDBDC3 ＝ #1C1C22 + #EEEEF4 @76.7%、syntaxComment #7A7A7F ＝ #0C0C10 + #EEEEF4 @48.7%；**B 簇采 15 条**＝中位切分簇心，图里没有这个字面值，代表一片 ΔE76≤10 的实际区域（primary 战甲红 21,526 px、secondary 熔金 1,798 px、warning 火焰橙 3,780 px、syntaxString 盔甲高光 2,529 px）；**C 阶梯 2 条**＝以画面唯一那抹有彩绿 #006752（22 px）为源、只改 L* 走到目标明度（success L*68 → #62B59C、diffAdded L*56 → #40947D），色相不漂。没有一色来自图外臆造（管线见 prototypes/marvel-extraction/）。
②表面：8 槽只靠明度分层，全部落在 227°–240° 一条轴、彩度 ≤10，0 个色相孤岛。codeBlockBg #000000（L*0.00，蜘蛛侠纯墨线）→ background #0C0C10（3.42）→ sidebarBg #121216（5.59）→ inputBg #18181C（8.41）→ bubbleBg #1C1C22（10.50）→ backgroundPanel #252529（14.83）→ backgroundElement #2D2D32（18.65）→ codeHeaderBg #333337（21.38）；台阶 3.42/2.17/2.82/2.10/4.32/3.82/2.74。**4.32 那一级是被数学逼出来的**：primary 配白字要 4.5:1（Y ≤ 0.1604），同时 primary @backgroundPanel 要 3:1，两条联立推出 backgroundPanel 的 Y 必须 ≤ 0.0191（L* ≤ 14.83）——卡片面不能更亮，否则深红 primary 够不到 3:1；而源图在 10.50 与 14.83 之间没有墨，台阶只能在这里留一个空洞。
③组合：primary 战甲红 #D32B28 × secondary 熔金 #EAC38D（铁人盔甲本体是金不是红），色相差 33.8°＝**类比**（暖对暖），比旧版红蓝 145.9° 互补更近海报质感。**焦点环与主按钮主动拆开**：标志红 #F11E22 做 borderActive（焦点环要最醒目），战甲红 #D32B28 做 primary（标志红反白只有 3.83:1，撑不起按钮；战甲红 4.61:1）。v3 记档的「primary = borderActive」并岗因此解除，岗位串戏降到 0 处（见 docs/theme-audit/exceptions.json 的 marvel 条）。
④借物：info 夜空钢蓝 #81B0DE（蜘蛛侠夜空，915 px）、success #62B59C、warning 火焰橙 #DB7930（3,780 px）、error 标志浅红 #F77B7E、diffAdded #40947D、diffRemoved 标志浅红 #F56568。markdown：heading 窗光暖金 #F7E4AB、link 奶油窗光 #D4C794、code 沙金 #C8AB7C、emph 标志浅粉 #F9A7A9、strong 标志纯白 #FFFFFF、blockquote 水泥米灰 #B4B29F。
⑤技巧：正文用幻灯片自己的正文白 #EEEEF4，次级文字 #BDBDC3（版面底与正文白 76.7% 的抗锯齿台阶，labelDimmed 合成后仍 4.89:1）。语法五核心 keyword #F44A4D（标志红被白光冲开 80.5%）、function #E4A05A（战甲金与火焰橙之间的暖铜）、type #FFCB05（页脚黄）、number #A0A2AC（次级冷灰）、string #F0E5D8（盔甲高光洗白），两两 ΔE76 最小 28.0（门槛 10）；退后两档 comment #7A7A7F（对比度 4.92）、operator #9D7A72（5.46）被夹在 4.5 下限与「≤所有核心色对比度」之间的极窄亮度带，画面该带只有冷灰与暖灰两种，于是冷灰给注释、暖褐给运算符，ΔE 17.2——整套盘子里最省的一次分离。硬对 38 / UI 15 全绿，设计告警 0。

## DC（dark）

①基调：哥谭市午夜沥青黑，低饱和紫灰家族阶梯：codeBlockBg #07070B 最深 → background #0B0B11 → sidebarBg → panel → inputBg → bubbleBg → element → codeHeaderBg #20202E 收顶，如从街面到楼顶探照灯的光梯。
②组合：primary DC 子弹标志超人蓝 #3D8BFF × secondary 超人 S 盾描边蝙蝠椭圆金 #FFCF40，蓝金互补撞色（漫画封面经典对撞）；borderActive 蝙蝠信号灯金 #FFD23F，像探照灯弹出来。 v3.1：primary·info·link 整组提亮为 #64A2FF（深字反白约 7:1，超人蓝更亮）；comment 提为 #787889。
③借物：info 孤独堡垒水晶蓝、success 绿灯戒能量绿、warning 逆闪神速力电光黄、error 达克赛德欧米茄射线红、diffAdded 氪石辉光+矿洞暗绿底、diffRemoved 欧米茄红+天启星暗红底。syntax：comment 哥谭雾灰、keyword 超人披风红、string 氪石绿、function 闪电侠神速金、type 海王亚特兰蒂斯海青、number 三叉戟古铜橙、operator 小丑毒气紫兼扎坦娜魔法紫。
④技巧：codeBlockBg 比 background 深两档挖出蝙蝠洞舞台；markdownHeading 与 function 共用蝙蝠金（标题函数名都像招牌发光），markdownCode 独占氪石绿 #9DFF6E 跳脱；text 偏冷对话气泡白、textMuted 石像鬼灰，深底对比拉满不刺眼。

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

## 火影忍者（dark）

①基调：木叶隐村夜林，background #141A10 暖墨橄榄绿（原冷青绿改掉）。8 槽 80~100° 黄绿家族阶梯：codeBlockBg #090C07 最深 → sidebarBg → background → panel → inputBg → element → bubbleBg → header 最亮。
②组合：primary 鸣人战衣橘 #FF7F1F（原通用红改掉）× secondary 螺旋丸查克拉蓝 #2FB0F5，橙蓝互补对冲（鸣人佐助对立共生）；borderActive 鸣人橘高亮变体，border 竹林暗线。
③借物：info 查克拉蓝、success 木叶新芽绿、warning 九尾查克拉金、error 写轮眼血红、diffAdded 木叶嫩芽+深绿底、diffRemoved 晓红云浅红+暗红底。syntax：keyword 写轮眼红、function 螺旋丸蓝、type 白眼薰衣草紫、number 九尾金、string 木叶绿、operator 苦无冷钢银、comment 旧卷轴棕灰。
④技巧：codeBlockBg 压两档成近黑舞台（卷轴结界浮出）；text 卷轴米白 #F5F1E3（暖纸贴林地质感），textMuted 竹雾灰；markdown 标题鸣人橘做招牌、链接查克拉蓝做指引、行内码九尾金做封印高光（排版即剧情）。

## Hello Kitty（light）

①基调：草莓牛奶粉白卧室，340° 粉红家族阶梯：background #FFF5F7 → 气泡 → 面板 → 输入 → 侧边 → 元素逐级加深；代码区改草莓纸面 codeBlockBg #FBE7ED + header #F6D9E3（浅底浅卡，syntax 转深墨）。
②组合：primary 蝴蝶结正红 #E60012 × secondary 婴儿粉 #FF8FB2，同色相深浅类比；borderActive 蝴蝶结桃粉高亮变体；text 可可棕 #3D2B33 压全场。 v3.1：primary·borderActive 收拢同值压到 #DB0011（反白 4.6:1，documented 并岗保留）；secondary 压深为 #BF6B86 达浅底 3:1。
③借物：info 背带裤牛仔蓝、success 大苹果叶子绿、warning 鼻子鹅黄压深的焦糖布丁黄、error 蝴蝶结红加深、diffAdded 苹果薄荷糖绿、diffRemoved 草莓果酱红。syntax 改草莓纸面深墨：keyword #A6325D 深桃粉、function #705B2D 暗鹅黄、type #396172 深牛仔蓝、string #436651 深薄荷绿、number #904829 深蜜桃橙、operator #79596A 暖灰、comment #746069 可可灰。
④技巧：bubbleBg/inputBg 去纯白化（带粉絮气泡白、奶粉输入底），一浮一沉不用边框也分层；代码卡由深可可改草莓纸面、syntax 转深墨（浅底主题不靠深卡）；number 只动一点色相就与 function 分家，comment 压成可读灰；v3.1 弱文字 textMuted 压深为 #523C46、引用 #925D76 微调，粉底全部达标。

## 哆啦A梦（light）

①基调：蓝天白云晴空白昼，约 200° 天空蓝家族阶梯：sidebarBg 最深下沉 → element → background #D9EFFB 蓝天基底 → inputBg → panel → bubbleBg 白蓝逐档提亮；代码区改晴空纸面 codeBlockBg #CBE7F8 + header #B8DBF2（浅底浅卡，syntax 转深墨）。
②组合：primary 身体蓝 #00A0E9 × secondary 脖颈铃铛金黄 #F7B500，蓝黄互补撞色；border 浅蓝灰，borderActive 身体蓝高亮。 v3.1：primary 压深为 #0072A8（浅底 UI 3:1 与反白 4.6:1 双达标）；borderActive 拆出为 #005A88（解并岗）；secondary 压深为 #A17600。
③借物：info 身体蓝加深、success 竹蜻蜓竹叶绿、warning 铃铛黄压暗保可读、error 红鼻子红、diffAdded 竹叶深绿系、diffRemoved 红鼻子红系。syntax 改晴空纸面深墨：keyword #8C4550 深门粉、function #1D6378 深海身体蓝、type #6D581A 暗金、string #2B6648 深竹绿、number #675084 深薰衣草紫、operator #50667E 云影深灰、comment #4C6272 云影灰蓝。
④技巧：代码区由深蓝卡片改为晴空纸面（浅底主题的代码区同色系浅卡，syntax 转深墨），markdownCode #8C4A1F 铜锣烧焦糖棕满屏蓝里一点棕最哆啦A梦；warning 比 secondary 压暗两档（同取铃铛，亮处点缀暗处告警）；v3.1 弱文字 textMuted 压深为 #2F4250、引用 #4E6A7D，浅底全部达标。

## 奥特曼（dark）

①基调：光之国之外的宇宙深空夜战，background #0A0E22 带紫调深空靛黑（原通用藏青改掉）。8 槽同靛紫家族阶梯：codeBlockBg #050816 最深 → … → codeHeaderBg #232F66 封顶（深空→夜战城市→指挥室灯光）。
②组合：primary 银色身躯红条纹奥特红 #E62E33 × secondary 双眼炽黄目光 #FFC627，红金类比英雄组合；info 胸前计时器冰蓝构成三角色对冲（红战斗、金目光、蓝科技）；borderActive 目光高亮金。 v3.1：primary 压为 #CF292E（反白 4.6:1）、secondary 目光金调为 #FFAD00（与主红夹角 42.5° 归红金类比）。
③借物：info 计时器蓝灯、success 银河水晶盖亚大地绿、warning 计时器闪烁告警橙黄、error 计时器红灯告急、diffAdded 水晶绿、diffRemoved 杰顿火球红。syntax：keyword 斯派修姆红斩、function 必杀起手目光金、type 计时器冰蓝、number 杰顿火球橙、string 等离子生命光绿、operator M78 星云紫、comment 怪兽潜伏夜雾灰。
④技巧：codeBlockBg 比 background 深两档成深空舞台，header 反跳家族最亮做顶灯（一暗一亮锁代码区）；markdownHeading 弃对比度差的奥特红改用目光金当招牌，markdownLink 计时器蓝（黄眼+蓝灯=脸部组合）；borderActive 与 warning 拉开一档明度（炽白闪光 vs 橙黄预警，避免描边告警撞衫）。

## 变形金刚（dark）

①基调：赛博坦钢铁夜，8 槽 H212 钢铁青灰家族阶梯：codeBlockBg #080B10 地核停机场黑最深 → background → sidebarBg → panel → inputBg → header → bubbleBg → element 悬浮层收尾。
②组合：primary 汽车人徽章红 #E63329 × secondary 能量晶体蓝 #38A1FF，红蓝高对比互补（汽车人 vs 霸天虎）；border 钢铁接缝灰收敛，borderActive secondary 高亮辉光变体（充能亮起）。
③借物：info 能量晶体蓝、success 救护车医疗绿+能量晶绿、warning 大黄蜂车漆黄、error 威震天融合炮火火种灼烧红、diffAdded 能量晶体生长绿、diffRemoved 霸天虎锈蚀战损红。syntax：keyword 擎天柱火焰号令红、function 大黄蜂行动黄、string 能量晶体绿、type 声波显示屏塞伯坦青、number 领导模块火种金、comment 战场烟灰、operator 赛博坦钢铁银。
④技巧：codeBlockBg 压两档下沉舞台，header 上浮成盖板；markdownCode 独占火种金 #FFD166（满屏红蓝中跳出，与 number 同家族呼应但更亮）；warning 与 syntaxFunction 共用大黄蜂黄（一静一动同一灵魂），borderActive 比 secondary 提亮一档做辉光不另起色相。 v3.1：原「heading 并入 primary」取消——markdownHeading 独立为 #FF5C4D（深底 5.9:1 标题朱橙），primary 压到 #CF2E25 保反白 4.6:1；info=secondary、borderActive=markdownLink 两处有意并岗保留。

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

## 新世纪福音战士（dark）

①基调：NERV 暗紫黑 background #0D0A1C（原偏藏青中性黑改掉）。8 槽 255 色相紫家族阶梯：codeBlockBg #070512 AT 力场深渊最深 → background → sidebarBg → panel → inputBg → element → header → bubbleBg 指挥部走廊纵深。
②组合：primary 初号机装甲荧光绿 #84FF00 × secondary 拘束器橙/明日香橙发 #FF7A1A，互补撞色；+暗紫背景构成紫绿橙三角色铁三角（初号机机身配色）；borderActive primary 高亮变体（同步率拉满辉光描边）。
③借物：info 绫波丽发色零号机蓝、success 初号机同步达标绿、warning NERV 警报灯金黄、error 使徒血液红/电源耗尽红、diffAdded AT 力场绿、diffRemoved 使徒肉体粉红。syntax：comment MAGI 残影灰紫、keyword 初号机装甲紫、function 绫波蓝、type 拘束器橙、number S2 机关核心红粉、string AT 力场绿、operator 人类补完白光。
④技巧：codeBlockBg 比 background 深两档沉成深渊，header 跳亮成顶灯盖；operator 不用纯灰白而用补完白光 #EFE6FF（六个高饱和 syntax 色间唯一消色分隔符，符号定位快一倍）；markdownCode 不用绿用警报橙 #FFB020，与绿标题撞色，行内代码长文一眼弹出。

## 赛博朋克 2077（dark）

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
