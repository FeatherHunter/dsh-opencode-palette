# IP 预置主题配色思路（对抗式重审版，21 套）

> v3.1 可读性整改（2026-10-19）：21 套全部按 docs/theme-audit/criteria.md 机器判尺整改到位（硬对/UI 对 0 违例、设计告警 21 条全记档 / 0 待处理，--check 退出码 0）。设计意图、品牌色与气质保持原案；6 套浅色主题的代码区由深色舞台改为同色系浅色纸面舞台（syntax 七色转深墨），其余主题主要是 primary/borderActive/标题/弱文字等 token 的对比度与并岗几何微调——正文里少数未及更新的 hex 以 src/custom-presets/*.json 终值为准。

> v3.2 逐像素取色（2026-10-20）：**哈利波特整版重绘**——所有颜色改由四张参考图逐像素取样，只允许「直采 / 明度阶梯 / 两色定比混色」三种来源，id / name / appearance 不变（仍是同名 `harry-potter` 胶囊）。取色台账与原图裁切见 `prototypes/harry-potter-theme-preview.html`；详见 docs/ip-presets-v3-notes.md 末节。其余 20 套不受影响。

> v3.3 逐像素取色（2026-10-20）：**星球大战整版重绘**——37 槽全部改由三张星战海报（天行者崛起 / 天行者的崛起 / 最后的绝地武士）逐像素取样，只允许「直采 / 明度阶 / 彩度阶 / 定比混色」四种来源，id / name / appearance 不变（仍是同名 `star-wars` 胶囊，dark）。取色台账与原图裁切见 `prototypes/star-wars-theme-preview.html`；取色管线见 `prototypes/star-wars-extraction/`。硬对 38 / UI 15 全绿，设计告警 0 条；v3.4 起按「两刃对分」重排配比（红刃 51.9% / 蓝刃 48.1%），底色换成两刃交点的近黑紫。其余 20 套不受影响。

> v3.5 逐像素取色（2026-10-20）：**宝可梦整版重绘**——37 槽全部改由四张参考图（官方图鉴立绘 / wikiHow 平涂 / 30 周年 / 合志插画）逐像素直采，只允许「与原图某像素完全一致」一种来源，0 阶梯 0 混色 0 想象；id / name / appearance 不变（仍是同名 `pokemon` 胶囊，dark）。取色台账与原图裁切见 `prototypes/pokemon-theme-preview.html`；管线见 `prototypes/pokemon-extraction/`。硬对 38 / UI 15 全绿，设计告警 0 条（v3 记档的 6 组并岗已全部拆开，exceptions.json 的 pokemon 条目随之删除）。其余 20 套不受影响。

## 宝可梦（dark）

①基调：**图鉴卡的暗场**。四张图里只有 01 号官方图鉴立绘有黑白结构，所以场域全部收进它的冷调明度阶梯（基准色相 240.0°，0 个色相孤岛）：codeBlockBg #000000 最深（对战舞台）→ sidebarBg #060606 → inputBg #0C0C10 → background #1C1C22 → bubbleBg #28282D → backgroundPanel #37373B → backgroundElement #40404A → codeHeaderBg #48484D。**冷场暖字**：底是卡面的冷调蓝黑，暖意全交给徽章金与御三家。旧版的常磐森林深墨绿 #0E1B13 整族作废（那张图里一个像素都没有）。
②组合：primary 图鉴卡编号徽章黄 #FFCB05 × secondary 2.jpg wikiHow 蓝底 #799DFE = 176.2° 互补。**黄只做「牌」不做「底」**——它是填充色，引擎按 contrastText 派生前景 #141414（12.10:1）；徽章黄在暗底上当文字只有 1.4:1，绝不做正文。borderActive 用皮卡丘受光面 #F4D77C（焦点环比品牌亮一档），border 退为精灵球带灰 #58585A。
③借物：4.jpg 合志插画一次交齐御三家——success 妙蛙种子绿 #7AA85D、warning 小火龙橙 #FB8603、error 精灵球红 #F93D32、info 杰尼龟蓝 #289BCA。diffAdded 合志浅青绿 #7FC9AE、diffRemoved 2.jpg 脸颊红 #FE4C1C。syntax：keyword 皮卡丘嘴部藕粉 #C790A3、function wikiHow 蓝底暗面 #6E9BBC、type 合志青灰 #658F8B、number 皮卡丘中金 #DFBF6F、string 合志浅青绿 #80CAAF、comment #85858A / operator #7A7A7F 退后。
④技巧：text 取 01 号图鉴卡页脚自己的白字 #EEEEF4、textMuted 取合志插画的淡灰蓝 #D3D3D8，弱文字用其褪色版（labelDimmed = withAlpha(textMuted, 0.8)）。markdown：heading wikiHow 平涂黄 #FAE721、link 合志天空蓝 #95C7F8、code 合志奶黄 #FDE7B5、emph 合志暖杏 #F9B584、strong 卡纸白 #FFFFFF、blockquote 合志淡灰蓝阶 #BDBDC3。v3.5：37 槽全部改由四张参考图**逐像素直采**（0 阶梯 0 混色），硬对 38 / UI 15 全绿，设计告警 0（v3 记档的 6 组并岗全部拆开）。

## 漫威（dark）

①基调：漫威漫画「墨夜」底 background #0C0E15——取自蜘蛛侠漫画主视觉的夜城海军墨（#06182E），不是通用藏青，是带一点紫的近黑。8 槽收进同一条色相族（227°–236°，彩度 6–15），只靠明度分层：codeBlockBg #08090E 最深（L*2.5，最纯的墨）→ background #0C0E15 → sidebarBg #101219 → inputBg #141520 → codeHeaderBg #161722 → bubbleBg #1A1B25 → backgroundPanel #1E1F2A → backgroundElement #212230 最亮（L*13.7）。0 个色相孤岛，border #2B2B39 收进同一族。
②组合：primary 印刷红 #D81A21 × secondary 熔金 #D9A23C。红金 41.2° 类比（暖对暖）——参考图里铁人的盔甲本体是金不是红，所以第二品牌选金、撤掉旧版的通用蓝。标志红 #E62429 太亮撑不起反白（4.10:1），压到 #D81A21 才够 4.67:1，色相 358° 一帧未让。borderActive 与 primary 同值（红即品牌即焦点，沿用 v3.1 记档）。
③借物：info 弧反应堆青 #35B5D8、success 浩克翠绿 #3FCF87、warning 熔炉橙 #FF7A1F、error 爆裂朱橙 #FF5A47、diffAdded 浩克绿亮变体 #6FD79A、diffRemoved 战火珊瑚 #FF9A8C。markdown：heading 标题浅金 #FFD98A、link 振金蓝 #6BA5FF、code 铁人铜橙 #E8834A、emph 格温粉 #F472B6、strong 聚光白 #FFFBF2、blockquote 旧纸暖灰 #A89C8A。
④技巧：正文不用纯白，用漫画纸的暖象牙 #EDE8DE——冷底配暖字，纯白刺眼；textMuted 反其道取冷灰 #ADAAB0（chrome 退后、内容前进），弱文字 labelDimmed 在三个表面上仍 ≥4.92。syntax：keyword 宇宙紫 #B79BFF、function 弧光浅青 #7FD8FF、type 熔金 #F0C14E、number 铁人铜橙 #FF9E6B、string 浩克黄绿 #BCE06A、operator 暖岩灰 #8A8178、comment 冷岩灰 #7A8290；七色两两 ΔE76 最小 33.9（门槛 10），comment/operator 对比度 5.14/5.20 低于全部核心角色（最低 8.66），构成两级退后梯队。界面层只留红/金/青三个色相，七色相全放给代码区。 v3.2：全 37 槽按上述重排，硬对/UI 对 0 违例，审计器 --check 退出码 0。

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

## 迪士尼（light，v4 重绘：五图取色）

①基调：晨曦城堡——夜幕藏蓝做墨、晨空冷蓝做场、樱花粉做唯一心跳。8 背景槽收进同一条冷蓝家族（206°–216°），只靠明度分层：codeBlockBg #F5F5F9 最浅纸面 → inputBg #F0F3F7 → bubbleBg #F4F0F5 → background #E8EFF5 → sidebarBg #E0EBF2 → backgroundPanel #DBE8F0 → codeHeaderBg #DCE3EA → backgroundElement #D0DBE3 收底；整条阶梯跨 9.8 L*（按实测 L* 目标反解混合比例，不是随手拍比例）。气泡只留樱花粉 4% 的暖意 bubbleBg #F4F0F5（彩度 4 < 8，判尺不算色相孤岛）——大面积用无彩、小面积用彩，粉色因此更贵。border 提到 #B7C9D3（对最深表面 1.21:1，21 套 IP 里属中游；早期版本 1.06:1 近乎隐形）。
②组合：primary 樱华深玫 #903B5C（樱花粉3 × 深梅紫 55%）× secondary 黛青瓦 #3E7389（3.jpg 城堡屋顶原色，未作任何改动），两色相距 139.1° 归三角关系；borderActive 深黛青 #356682 收拢焦点。正文墨是夜空深蓝 × 米奇墨黑 25% 混出的 #071A49——迪士尼的黑从来带蓝，不是纯黑。
③借物：info 烟花蓝 #257CC1（4.jpg 乐园夜空）、success 童话林绿 #3A5C3A、warning 鎏金压深 #7E5E41（3.jpg 金带 × 树皮棕）、error 米妮红 #B12C34（2.jpg 公主裙原色）、diffAdded 林绿 #3C623E、diffRemoved 深莓 #872F3A。syntax 落冷纸面：keyword #6E2645 深樱、function #2C597B 深海青、string #316057 深林绿、type #714F7C 暗兰紫、number #874B36 深陶土、operator #756361 暖石灰、comment #676890 冷灰紫（七色一律压成冷纸可读的深墨；comment/operator 对比 4.88/5.20 均低于全部核心角色，构成退后梯队）。
④技巧：代码区由暖纸改冷纸——浅底主题的正确反差来自深墨 syntax 而不是深色卡；markdownHeading 独立为深梅紫 #301C4A、markdownEmph 独立为兰紫 #805581（海报紫 × 樱花粉），两者都不与 primary 并岗，25 个设计角色的两两 ΔE76 全部 ≥ 5、品牌与强调拉开 ΔE 25；**暖色场是试算后否决的**——广场米白/墙奶白两个暖源 L* 几乎相同，实测搭出来最近的两个表面 1.001:1、border 只剩 1.015:1、8 级阶梯塌成两级，而冷色族有 51 L* 的可用明度跑道（暖色族只有 32 L*）；全 37 槽由 5 张参考图的实测像素按定比混合算出，零凭想象：38 条硬对 + 15 条 UI 对全绿，IP 设计规范零告警（色相孤岛 0 / 角色碰撞 0 / 语法核心 ΔE76 24.2）。

## 超级马里奥（light）

①基调："1-1 晴空蓝"，8 槽全收蓝色相：background #E2F1FD 晴空底 → panel/bubble/input 近白 → element/sidebar 逐阶加深；codeBlockBg #D3E8F9 + header #C2DDF4 改为日光天空浅蓝舞台（浅底代码区，syntax 转深墨）。border 天空描边蓝。原通用暖白/slate 灰全改掉。
②组合：primary 马里奥帽红 #E52521 × secondary 水管路易吉绿 #2F9E44，红绿互补撞色（马里奥兄弟组合）；borderActive 帽红高亮。红主导、绿支撑、金币黄点缀三角。 v3.1：borderActive 从 primary 拆出为 #C41E1A（解并岗、达 UI 3:1）；primary 压到 #D5221F 保反白 4.6:1。
③借物：info 冰之花晴空蓝、success 1UP 蘑菇水管绿、warning 问号砖块金币琥珀金（加深保浅底可读）、error 熔岩库巴红、diffAdded 水管绿系、diffRemoved 熔岩红系。syntax 改日光舞台深墨：keyword #A82C41 深玫瑰、function #705B1B 暗金、string #336648 深林绿、type #365D8E 深天蓝、number #9F3C08 深火焰橙、operator #59626E 云影深灰、comment #58647B 石块灰蓝。
④技巧：sidebarBg 敢压最深（侧栏如远山沉下去）；codeBlockBg 从地下关黑夜改为白日天空浅舞台（浅底主题的代码区也要干净纸面），warning 用深琥珀、markdownStrong 用板栗深棕压住砖块敦实感；v3.1 弱文字 textMuted 提为 #294258、markdownHeading 微调为 #BC3F0C，浅底全部达标。

## 乐高（light）

①基调：浅灰底盘，中性冷灰阶梯：background #EDEEF0 → sidebarBg → element 凹槽 → panel 凸起 → inputBg 近白 → bubbleBg 最亮；codeBlockBg #E3E5E9 + header #D9DCE2 改为浅灰展示底盘舞台（近中性的浅卡，彩砖在日光下显色）。原三处纯白拆成三级白，浅底也有凸凹。
②组合：primary 乐高红 #D01012 × secondary 积木黄加深 #D9A000（Logo 式红黄搭档），info 蓝砖 #0055BF 构成经典三原色三角色；borderActive 标志红点亮；border 灰缝不抢戏。 v3.1：borderActive 拆为 #A80D0F（解 primary 并岗、达 UI 3:1）；secondary 压深为 #AE8000 达浅底 3:1。
③借物：info 蓝积木、success/diffAdded 绿积木、warning 黄积木压暗保可读、error/diffRemoved 红积木暗红；diff 底沿用浅绿/浅红。syntax 改浅灰底盘深墨：keyword #7F4389 紫红砖、function #6D581A 暗金、type #2C5C90 深蓝砖、string #356239 深绿砖、number #4D5F1E 深橄榄砖、operator #625E56 暖深灰、comment #5C6065 冷深灰（一暖一冷两灰退后）。排版：标题红、链接蓝、行内码暗红、强调 #141416 近黑、灰阶退后。
④技巧：secondary 弃通用蓝改砖黄加深，红黄成 Logo 搭档；浅色主题的代码卡改浅灰展示底盘，syntax 七色转深墨——彩砖平时散落、舞台聚光不再靠黑砖托底；v3.1 把 text=strong 拆开（strong #141416）、textMuted 压深为 #383A3D，浅底弱文字全部达标。

## 龙珠（dark）

①基调：武道荒野大地暖黑 background #1A130A（原通用藏青改掉）。8 槽橙棕色相只拉明度：sidebarBg #100C06 最沉 → … → element；codeBlockBg #0C0904 精神时光屋舞台黑最深，header 舞台顶栏。
②组合：primary 龟仙流道服橙 #FF7A00 × secondary 龟派气功蓝 #2E9DFF，蓝橙互补；border 暖棕描边，borderActive 龙珠高光金橙 #FFB020（primary 高亮变体，选中态像龙珠被点亮）。
③借物：info 龟派气功波、success 神龙那美克星绿、warning 超赛金发、error 弗利萨红缎带红、diffAdded 仙豆嫩绿、diffRemoved 巨猿红眼。syntax：comment 修行烟尘灰、keyword 气功蓝、function 超赛浅金、type 比克绿、number 探测器红、string 四星珠橙金、operator 魔贯光杀炮紫。
④技巧：codeBlockBg 比 background 更深（时光屋黑洞）；v3.1 为反白对比把红橙对整体提亮，borderActive 与 primary 收拢同值 #FF810D（documented 并岗，焦点环=道服橙），与龟派蓝几何 179.4° 互补不变；textMuted 由冷灰改暖灰 #B5A898，摆脱海军蓝残留。

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

## 海贼王（dark）

①基调：深海夜航，8 槽 H212 深海蓝家族阶梯：codeBlockBg #060C18 海沟黑最深 → background #0A1D38 深海夜 → 船舱/舞台顶/甲板/输入/气泡 → element 悬停亮顶。
②组合：primary 草帽黄 #FFCC33（第一眼标志，比通用红更唯一）× secondary 路飞背心红 #E30613；borderActive 草帽黄高亮。黄与深海蓝互补撞色（CTA 跳出），红黄是海贼旗配色类比邻近（草帽红缎带+麦秆+深海三角色）。
③借物：info 甚平海流蓝、success 索隆发绿、warning 空岛黄金乡宝藏金、error 赤犬岩浆果实红、diffAdded 索隆斩击浅绿+深藻底、diffRemoved 小丑巴基红鼻粉+深船舱红底。syntax：comment 海图迷雾灰、keyword 大妈魂魂果实紫、function 草帽金焰、type 弗兰奇可乐动力青、number 娜美蜜柑橙、string 可可亚西草叶绿、operator 女帝甜甜粉。
④技巧：codeBlockBg 压两档成深海沟舞台，header 夹中间做压边；primary 与 markdownHeading 同用草帽黄（标题即招牌），markdownLink 另用记录指针蓝（黄蓝不抢戏）；text 帆布米白 #F5EBD2（暖帆压冷海底，不刺眼），textMuted 与引用同用海雾灰统一退场色。

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
