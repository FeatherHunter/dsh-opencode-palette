# IP 预置主题配色思路（对抗式重审版，21 套）

> v3.1 可读性整改（2026-10-19）：21 套全部按 docs/theme-audit/criteria.md 机器判尺整改到位（硬对/UI 对 0 违例、设计告警 21 条全记档 / 0 待处理，--check 退出码 0）。设计意图、品牌色与气质保持原案；6 套浅色主题的代码区由深色舞台改为同色系浅色纸面舞台（syntax 七色转深墨），其余主题主要是 primary/borderActive/标题/弱文字等 token 的对比度与并岗几何微调——正文里少数未及更新的 hex 以 src/custom-presets/*.json 终值为准。

## 宝可梦（dark）

①基调：夜晚常磐森林深墨绿 background #0E1B13（原通用藏青判负）。8 背景槽同绿相家族阶梯：sidebarBg #070D0A、codeBlockBg #070E0B 最深 → background #0E1B13 → backgroundPanel #122418、codeHeaderBg #12271B → inputBg #14261B → bubbleBg #182F21 → backgroundElement #1E3A28 最亮。
②组合：primary 皮卡丘电气黄 #FFCB05 × secondary 宝可梦 LOGO 蓝 #3D7DD8，蓝黄近互补对撞（黄+蓝+精灵球红三角色）；borderActive 用黄高亮变体，border 退为草叶脉络绿灰 #223A2B。
③借物：info 杰尼龟水枪蓝 #38BDF8、success 妙蛙草藤鞭黄绿 #7AC74C、warning 小火龙尾焰橙 #FF9F1C、error 精灵球正红兼喷火龙红 #EE3E36、diffAdded 妙蛙花光合青绿、diffRemoved 喷射火焰红。syntax：keyword 喷射火焰、string 光合草叶、function 十万伏特、type 水炮、number 尾焰、operator 耿鬼暗影紫、comment 枯叶市图鉴灰绿。
④技巧：codeBlockBg 比 background 深两档成"对战舞台"，header 是舞台沿；markdownEmph 胖丁妖精粉 #F9A8D4 是全主题唯一粉色逃逸口；text 纸白带草叶暖调 #EFF6EC、textMuted 鼠尾草灰绿，弱文字用背景家族褪色版。 v3.1：primary 保持皮卡丘黄 #FFCB05，borderActive 与 markdownHeading 拆成两级浅黄 #FFE14D/#FFD96B（焦点环与标题各有亮度台阶）；textMuted·引用整体提亮为 #B1BFB3，comment 提为 #757C89，六组有意并岗保留。

## 漫威（dark）

①基调：漫威漫画墨黑底 background #140C0E，带微暖红调（深夜曼哈顿+共生体暗面），告别通用藏青。8 槽红黑暖灰家族阶梯，codeBlockBg #0C0708 最深，backgroundElement #2D1C21 最亮，border 暖化 #38242C 收进家族。
②组合：primary 漫威红 #ED1D24 × secondary 美队盾牌振金蓝 #2E8FFF，漫画经典红蓝互补对冲（蜘蛛侠战衣）；borderActive 标志红高亮变体 #FF2E35；红主政、蓝管科技、标题金 #FFD166 管招牌。 v3.1：primary·borderActive 收拢压到 #D51A20（白字反白 4.6:1，红仍是那抹红）；operator 提亮为 #757E8B，退后但仍可读。
③借物：info 钢铁侠胸口反应堆蓝、success 绿巨人伽马绿、warning 雷神闪电+战甲金、error 屠杀共生体红、diffAdded 浩克绿亮变体、diffRemoved 屠杀红亮变体。syntax：comment 号角日报旧报纸灰、keyword 绯红女巫混沌魔法红、function 反应堆蓝、type 战甲金、number 奇异博士魔法品红、string 浩克绿、operator 振金盾银。
④技巧：codeBlockBg 压到 #0C0708 成振金密室，header 上浮成盖板；markdownLink 与 syntaxFunction 同色（可点击的反应堆元件）；全套文字带纸墨暖调（暖白/暖灰/旧纸灰），不让冷灰蓝字破坏红黑宇宙。

## DC（dark）

①基调：哥谭市午夜沥青黑，低饱和紫灰家族阶梯：codeBlockBg #07070B 最深 → background #0B0B11 → sidebarBg → panel → inputBg → bubbleBg → element → codeHeaderBg #20202E 收顶，如从街面到楼顶探照灯的光梯。
②组合：primary DC 子弹标志超人蓝 #3D8BFF × secondary 超人 S 盾描边蝙蝠椭圆金 #FFCF40，蓝金互补撞色（漫画封面经典对撞）；borderActive 蝙蝠信号灯金 #FFD23F，像探照灯弹出来。 v3.1：primary·info·link 整组提亮为 #64A2FF（深字反白约 7:1，超人蓝更亮）；comment 提为 #787889。
③借物：info 孤独堡垒水晶蓝、success 绿灯戒能量绿、warning 逆闪神速力电光黄、error 达克赛德欧米茄射线红、diffAdded 氪石辉光+矿洞暗绿底、diffRemoved 欧米茄红+天启星暗红底。syntax：comment 哥谭雾灰、keyword 超人披风红、string 氪石绿、function 闪电侠神速金、type 海王亚特兰蒂斯海青、number 三叉戟古铜橙、operator 小丑毒气紫兼扎坦娜魔法紫。
④技巧：codeBlockBg 比 background 深两档挖出蝙蝠洞舞台；markdownHeading 与 function 共用蝙蝠金（标题函数名都像招牌发光），markdownCode 独占氪石绿 #9DFF6E 跳脱；text 偏冷对话气泡白、textMuted 石像鬼灰，深底对比拉满不刺眼。

## 星球大战（dark）

①基调：外太空黑 background #080A12，8 槽收进 225~232 色相死星钢铁黑家族阶梯：codeBlockBg #03040A 虚空最深 → … → backgroundElement #263154 浮层最亮，死星舱壁纵深。
②组合：primary 星战 Logo 爬字黄 #FFE81F × secondary 绝地蓝光剑 #4CC2FF，蓝黄互补对撞；borderActive 光剑辉光，选中态像点亮光剑。
③借物：info R2-D2 全息投影蓝、success 尤达绿/卢克绿光剑、warning 塔图因双日落橙、error 维达红光剑、diffAdded 绿剑刃光+深绿底、diffRemoved 西斯红剑光+暗红底。syntax：keyword 维达红、function 绝地蓝、type C-3PO 金、number 塔图因橙、string 尤达绿、operator 温杜紫剑、comment 死星灰；标题招牌黄、链接蓝剑、行内码霍洛克隆金。
④技巧：codeBlockBg #03040A 独立放映厅舞台，header 提亮冒充影院顶灯框；syntaxOperator 独占温杜紫剑，全套唯一紫色一眼定位；markdownHeading 与 primary 同取招牌黄（标题即 Logo），syntaxType 退用暗一档 C-3PO 金避正撞。

## 哈利波特（dark）

①基调：霍格沃茨深夜烛光暖褐石墙 background #1A120B，告别藏青与暗紫。8 槽暖棕家族阶梯：codeBlockBg #100A06 最深 → … → codeHeaderBg #3E3220 最亮收顶，城堡回廊纵深。
②组合：primary 霍格沃茨金 #E8B64C × secondary 格兰芬多猩红 #B52A3C，格兰芬多围巾式暖色类比 CP（非互补）；borderActive 标志金高亮变体 #F0C75E，石墙托金框发光感。 v3.1：secondary 压深为 #BA3E40（与 primary 夹角 41.7° 坐实类比 CP、UI 3.2:1）；markdownHeading 从 primary 金拆出提亮为 #FFD478（深底 5.9:1 的标题金）。
③借物：info 守护神荧光银蓝、success 魁地奇草坪兼斯莱特林祖母绿、warning 金色飞贼闪光黄 #FFC93C、error 匈牙利树蜂龙息红、diffAdded 曼德拉草嫩绿、diffRemoved 龙息余烬。syntax：keyword 咒语紫、function 飞贼金、type 守护神蓝、number 黄油啤酒铜橙、string 禁林绿、operator 格兰芬多猩红、comment 城墙幽灵灰。
④技巧：codeHeaderBg 故意做家族最亮，烛光盖板压住深舞台（大礼堂悬烛）；warning 比 primary 更亮一档（飞贼常亮 vs 闪光）；text 羊皮纸暖白、textMuted 烛灰褐、markdownStrong 录取通知书亮白，三档暖白各司其职。

## 迪士尼（light）

①基调：灰姑娘城堡白天象牙石墙+大街晨光，暖 champagne 色相（约 40°）阶梯：inputBg 最亮 → panel → bubble → background #FFF7E8 → sidebarBg → element → border 收底。代码舞台独立：白日暖纸 codeBlockBg #F3E6CE + header #EBD9B8（同色系浅卡舞台，syntax 七色转深墨在白纸上显影；浅底主题不再靠深卡压反差）。
②组合：primary 米奇红/米妮蝴蝶结红 #D81E2C × secondary 南瓜马车金 #D9990B（暖组类比），borderActive 城堡穹顶蓝/史迪奇蓝 #1E90D6（冷暖互补）。红主政标题、金点缀、蓝管交互。 v3.1：borderActive 压深为 #1577B8（解除与 info 同值并达 UI 3:1）；secondary 南瓜金压深为 #A86F00（达 3:1，与 primary 夹角 44.2° 归类比）。
③借物：info 城堡穹顶蓝、success 小叮当裙摆丛林绿、warning 南瓜马车烟花金、error 红皇后胡克船长红、diffAdded 小鹿斑比森林绿、diffRemoved 刀疤反派深红。syntax 落日光纸面：keyword #973644 深莓、function #295E73 深海冰蓝、string #32603A 深林绿、type #67551F 暗金、number #84492F 深珊瑚、operator #5E5A6C 暖灰紫、comment #645F85 马车灰紫（七色一律压成暖纸可读的深墨）。
④技巧：operator 从撞色的浅蓝改为暖灰紫（深墨版），蓝紫分家；代码区由午夜靛紫改为暖纸舞台——浅底主题的正确反差来自深墨 syntax 而不是深色卡；六个浅底槽从最亮到最暗首尾相接，深浅字对比仍达标。v3.1 把 textMuted 压深为 #484034，弱文字在象牙底全部 ≥4.5。

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

## 塞尔达传说（dark）

①基调：海拉鲁午夜森林，8 槽全收绿相家族（原 header/ codeBlock 蓝色孤岛违反阶梯，已改）：codeBlockBg #070F0B 渊底最深 → sidebarBg → background #0D1B14 → panel/inputBg 中段 → element/bubbleBg 上浮 → header 舞台顶条收尾。
②组合：primary 林克紧身衣耐力圈绿 #3FD669 × secondary 三角神力金 #FFD34D（林克胸前同框，类比邻近）；borderActive 三角金高亮（绿底金对焦环=神庙 glow，比绿对绿易辨）；大师剑蓝退居 info/链接，绿金蓝三角色。
③借物：info 希卡石板娜薇妖精蓝、success 呀哈哈叶绿、warning 三角金黄色卢比、error 心之容器红、diffAdded 绿卢比+深绿底、diffRemoved 加侬瘴气粉红+暗红底。syntax：keyword 大师剑蓝、string 克洛格浅绿、function 三角金、type 佐纳乌青绿、number 炸弹爆裂橙、comment 迷雾森林雾绿、operator 海利亚钢。
④技巧：codeBlockBg 比 background 压两档做渊底舞台，header 提亮勒出舞台沿；borderActive 用三角金不用主绿；secondary 让位三角金后，用链接+info 双槽保留大师剑蓝（保住盾剑记忆不抢主次）。

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

## 美少女战士（light）

①基调：月光樱粉，background #FFF3F7 全场底，粉色相同一家族六级阶梯：bubbleBg 最白浮起 → inputBg 凹陷 → panel 承托 → sidebarBg 裙摆粉加深 → element 最深；代码区改月光灰紫纸面 codeBlockBg #F1ECF3 + header #E8E3EA（近中性的浅卡，syntax 转深墨）。
②组合：primary 水手丝带桃粉 #E9347F（原 #F268A8 加深保浅底对比）× secondary 水手制服海军蓝 #2B4FAA，粉蓝经典配对（非对冲）；borderActive 同色呼应，border 丝带浅粉过渡。 v3.1：primary 压深为 #C42C6B（反白 4.6:1），borderActive 同源深阶梯。
③借物：info 水手水星蓝、success 水手木星裙绿、warning 金色月牙幻之银水晶预警金、error 水手火星火焰红、diff 沿用木星绿/火星深红。syntax 改月光纸面深墨：keyword #974268 深丝带粉、function #2F657E 深水星蓝、type #705B2D 暗金、string #356846 深木星绿、number #98470E 深金星橙、operator #67647E 蔷薇灰紫、comment #646272 星尘灰。
④技巧：bubbleBg 与 inputBg 一浮一沉（气泡更白、输入更深，不靠边框分层）；代码卡由午夜变身紫改为月光灰紫纸面（浅底主题的代码区改为近中性浅卡，syntax 转深墨），operator 银水晶蔷薇紫退后；v3.1 弱文字 textMuted 压深为 #41414B、comment/operator 重建退后层级，浅底全部达标。

## 库洛米（light，第 21 套）

①基调：浅紫香芋牛奶 background #F4ECFA（21 套里最新的浅色甜酷担当），6 个浅背景槽同紫相阶梯；代码区用近白纸卡 codeBlockBg #FBF7FD + header #EEE2F5（浅色主题用浅 code 卡的质量标杆结构，不靠深卡）。

②组合：primary 蝴蝶结莓红 #BD3064 × secondary 暗紫 #A84AB2（同紫相深浅类比，夹角 43.6°），borderActive 中紫 #8D6AAE 收拢焦点；text 深墨紫 #241A2C 压全场。

③借物：syntax 七色全为深墨——comment #736379 灰紫、keyword #AD386B 莓红、function #6E49A8 紫、type #4A5AA8 靛蓝、number #96521A 焦糖、string #2C6F5D 松绿、operator #7C5F90 藕紫；error #A81B38 与 diffRemoved #A31638 拆成两个近红（删除行不冒充报错）。

④技巧：浅色代码卡是库洛米的质量标杆结构（浅底主题不靠深卡，正文与 syntax 一律深墨）；v3.1 把 secondary 提为 #A84AB2 修品牌紫几何（原 70.2° unclassified → 现 43.6° 类比）、error/diffRemoved 拆分、弱文字 textMuted 压深为 #45384D。
