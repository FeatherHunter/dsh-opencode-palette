# IP 预置主题 v3 终审修订摘要（20 套全返工，定版 0）

终审判尺：背景家族纯洁 / 岗位串戏（同值不同岗一票否决）/ 关系几何（互补·类比·三角色必居其一）/ 对比度 4.5:1 / 遮名唯一性 / syntax 区分度（comment·operator 退后）。v2 的 20 套全在这六条下查出问题，故定版 0、优化 20。

## 宝可梦（revise，5 条）

拆蓝拥堵（secondary 提亮水蓝兼 syntaxType，info·link 合并信息青）、拆黄垄断（function 改妖精粉，code 改钢灰）、红绿橙三组由近失改精确统一（error·keyword·diffRemoved 同火红，success·string·diffAdded 同草绿，number·warning 同火橙）、退后层级（comment 化石灰最暗，operator 熄火超能力紫，blockquote 并入 muted）。

## 漫威（revise，7 条）

borderActive 并入 primary（红即品牌/焦点）；error 推向爆裂橙红；keyword 搬出红色改格温粉；info 推向宇宙科技青；link 改宇宙靛终结与 function 同值；string 改浩克柠檬黄绿；code 改铁人铜橙；comment 洗掉蓝 tint；operator 压成深岩灰（原全场最亮属事故）；number 改宇宙紫。

## DC（revise，6 条）

13 槽改动。borderActive·function 并入 secondary 英雄金；heading 搬出改白并入 strong；link·info 并入 primary 可操作蓝；type 改绿灯青；keyword 改小丑紫（正红唯一留给 error）；number 改朱红；operator 压灰退后；diffAdded 改翡翠薄荷与 string 解绑；code 改哈莉粉；blockquote 压暗与 muted 解绑；emph 提亮真正强调。

## 星球大战（revise，9 条）

11 槽改动。info 移全息青绿；keyword 移品红；function 漂白淡天蓝（一鲜一淡对 secondary）；number 搬出橙黄改淡紫；string 同绿提亮（一深一浅对 success）；operator 压成退后灰蓝；heading 漂白奶油金（一明一暗对 primary）；code 提亮；blockquote 转暖石灰对立 muted。link 故意保留与 secondary 同蓝（可交互同一岗）。

## 哈利波特（revise，6 条，兰尼斯特测试失败）

function 改斯莱特林湖水青（格兰芬多对斯莱特林 duality 关键一笔）；code 改迷情剂蔷薇粉；link 提亮冰蓝（可点击专属明度签名）·info 压深钢蓝（link/type 明度阶梯）；warning 拉满饱和（警示橙 vs 品牌金）；secondary 压深酒红·error 提亮朱砂（一暗一亮拆品牌与告警）；operator 退出红色改冷灰；number 压深铜橙；string 改复方汤剂黄绿；emph 提亮苍白丁香。

## 迪士尼（revise，6 条，含对比度死刑 2 条）

codeBlock·header 由 navy 孤岛改为暖调深浓缩咖啡（与奶油同色相，L95%→L10% 下沉保留）；error·heading·code 改深莓/酒红/李子栗（三红解散，error 对比提到约 7:1）；warning 改深青铜·success 改深绿（对比提到约 5.5:1）；comment 压暗彻底退后·operator 提亮银薰衣草（退后分级）；type 改苍白柠檬黄·number 改珊瑚橙。

## 迪士尼 v4（重绘：五张参考图逐像素取色）

全部 37 槽改为「5 张图实测像素 + 定比混合」产出，不再凭品牌印象配色：夜幕藏蓝（1.jpg 夜空 / 4.jpg 海报）做正文墨 #071A49，晨空冷蓝（5.jpg 月白 × 2.jpg 云影蓝）做场域 #DEEAF1，樱花粉（3.jpg）做唯一心跳 primary #903B5C，黛青瓦（3.jpg 屋顶原色）做 secondary #3E7389（判尺记 139.1° 三角，但实测与场色只差 4.5°，屏上只是「蓝 + 玫」两个声音，文档不再拿三角当身份主张）。代码区由暖纸改冷纸 codeBlockBg #F4F4F9（浅底主题的正确反差来自深墨 syntax 而非深色卡），syntax 七色转冷纸可读的深墨，comment/operator 对比 4.84/5.16 退后于全部核心角色；heading 独立为深梅紫 #301C4A、emph 独立为兰紫 #7C537F、type 移到深兰紫 #503661，三者互不撞色。**borderActive 改烛金 #876B31**（5.jpg 金饰 #A98539 × 树皮棕）：金色在 4/5 张参考图里都有，是第一版整族缺席的色相；改金后与 secondary 的 ΔE76 由 6.6 拉开到 55.6，描边/焦点不再与空闲态圆点同色。**info 压深为 #1C63A6**：宿主把发送按钮标签写死 #fff，浅一档的 #257CC1 在常态 4.44:1 / 悬停 3.62:1 双双不过 AA——这是 37 槽判尺结构性照不到的一处。success 提为真绿 #457245（与 diffAdded 的 ΔE76 由 2.8 拉开到 15.5）。背景阶梯按实测 L* 目标反解比例，跨 11.9 L*、每步 ≥1.4 L*（最早一版 5.6 L*，为 21 套 IP 里最平），border 提到 #9AB4C1（1.45:1，原 1.06:1 近乎隐形）。概念名由「晨曦城堡」改为「蓝调城堡」：五张图里没有一张是黎明。判尺：38 硬对 + 15 UI 对全绿，IP 设计规范零告警（色相孤岛 0 / 角色碰撞 0 / 语法核心 ΔE76 23.5）。暖色场方案已试算否决：暖源 L* 重复，最近表面 1.001:1、阶梯塌陷。

## 马里奥（revise，9 条）

success 加深管道阴影绿；blockquote 改水下关深青；code 改桃花公主品红紫；heading 改砖块橙红；muted 加深；keyword 偏玫瑰品红；number 加深火焰橙；operator 改雾灰蓝退后；type 推向真蓝（与 link 深浅分工跨台隔离）。

## 乐高（revise，几何不明 + 7 串戏）

error 改莓果紫红（diff 联动改莓粉底）；warning 改施工安全橙（对比约 3.5→约 4.8）；info 改石油青（把蓝独留给 link；红×青约 187° 互补骨架，secondary 黄做点缀，几何成立）；heading 改结构深灰；code 改紫砖；keyword 改浅兰花紫；number 改柠檬砖；operator 改暖石灰（comment 保留冷灰，一暖一冷两灰退后）。

## 龙珠（revise，9 条）

info 改胶囊科技青；keyword 改魔法紫（消除与 info 同值）；link 改链接亮蓝（与 secondary 浓淡两档同一交互家族）；borderActive 并入 primary；string 改淡代码橙；function·warning 统一超赛金同一 token；number 改胶囊粉；type 改仙豆黄绿；blockquote 改灰绿退后；operator·comment 双双退后暖灰；emph 改纸白归入墨水家族。

## 火影忍者（revise，9 条）

info 改医疗青瓷；function 改术式宝蓝；link 提亮冰蓝；keyword 改幻术品红；number 改仙术翡翠；heading 改轮回眼紫；strong 改纯白；borderActive 提亮浅橙光环；emph 改月白艾绿；blockquote 改深苔；string 改九尾查克拉黄绿；comment 改暖灰·operator 改冷灰蓝；code 提亮卷轴浅金。残留三处最小妥协在 notes 备案（secondary/link 同天蓝明度分档，primary/borderActive 同橙明度分档，strong/text 明度差 7 档以字重为主 cues）。

## Hello Kitty（revise，11 条，含对比度死刑 2 条）

18 槽改动。heading 改酒红 plum；borderActive 收编品牌红；keyword 加深；error 改深绯红；info 改青色（对比约 3.3→约 4.6）；link 改深链接蓝；code 改品红 plum；emph 加深（对比约 3.6→约 4.9）；strong 加深；blockquote 调粉调亮；muted 加深（约 3.7→约 6.0）；success 加深；warning 加深；diffAdded 加深；number 改橙红；operator 压成退后档；inputBg 加深腾台阶；bubbleBg 提脸蛋白。

## 哆啦A梦（revise，9 条）

info 改紫罗兰（任意门秘宝）；link 加深深海交互蓝（与 primary 同一可交互蓝明暗分档）；warning 压深焦糖棕；success 压深；error 压暗一档（对比约 4.1→约 5.2）；heading·emph 并入 strong 墨色强调岗；number 改薰衣草紫；operator 改深灰蓝退后档；comment 保持可读档（comment/operator 两档退后梯队）。

## 奥特曼（revise，7 条，IP 唯一性失败）

keyword 改尊皇电光紫；error 改玫红；function 改银河火花绿；heading 改特摄海报橙；link 改宝蓝；borderActive 改能量紫蓝焦点环；warning 改深橙；blockquote 解除与 muted 同值；operator 压灰退后；comment 再压暗。

## 变形金刚（revise，9 条）

info 并入 secondary（火种蓝同一故事）；heading 并入 primary；code 改苍钢蓝；keyword 改蔷薇粉；function 改霸天虎紫（IP 唯一性支点）；number 改荧光黄绿；string 改苍薄荷（三档明度隔离）；operator 压入退后组；success 改深绿。审慎保留 error/primary 同源红（行业惯例锁定）与 link/borderActive 同值（可交互同一事）。

## 海贼王（revise，10 条，几何不明 + 唯一性失败）

secondary 改橘红（与 primary 金夹角收至约 29° 坐实暖阳类比）；borderActive·heading 改浅草帽金/浅金（同源亮度分离）；blockquote 改深灰蓝；info 改深宝蓝；warning 改深橘；error 改玫红；link 改海水青（点题大海）；code 改淡紫；emph·strong 归入纸张叙事；comment 提亮保可读；function 改浅柠檬黄；number 改蜜桃橙；string 改柠檬绿；operator 改灰蔷薇退后。

## 原神（revise，11 条，星穹味指控）

secondary 改绮丽品红（与 primary 风青、warning 愿望金构成约 109/121/130° 三角色，gacha 品红紫为原神专属）；keyword 改樱粉；type 改青柠（草元素）；number 改摩拉橙；string 微调纯绿；link 并入交互蓝；code 改灰青玉；blockquote 提亮；comment 提亮（对比约 4.8）；operator 改暖灰；diffAdded 改浅翡。残留三处在 notes 备案。

## 塞尔达传说（revise，11 条）

primary 改佐纳乌青绿（与王室金夹角约 111° 归入三角色，三角力量三女神叙事）；function 改浅王室金光；borderActive 改古金描边；keyword 改希卡紫；link 改妖精之泉浅蓝；warning 改血月橙红；code 改羊皮纸卷轴金；comment 改深苔；operator 改石剑灰蓝；heading 改苍白林光。

## 新世纪福音战士（revise，11 条）

secondary 改 EVA 紫（与 primary 荧光绿近 180° 互补，初号机紫 vs 同步绿独家签名）；success 改祖母绿；diffAdded 改亮绿；diffRemoved 改浅粉；heading 改浅 lime；link 改鸢尾蓝；code 改薄荷白；warning 改柠檬黄；borderActive 改苍青；keyword 改使徒核心品红；function 改青绿；number 改鲑鱼橙；string 改柔金；operator 压中灰紫（comment/operator/muted 退后三档）。

## 赛博朋克 2077（revise，14 条，EVA 联想指控，双源交叉确认一致）

secondary 改霓虹品红（黄-品红分裂互补，远离正红）；error·diffRemoved 统一正红；comment 提亮保对比；keyword 改浅粉；function 改冰蓝；type 改奶黄；number 改浅琥珀；string 改亮黄绿；operator 改中性灰；link 改钴蓝；code 改粉紫；emph 改淡灰紫蓝。

## 美少女战士（revise，6 条）

secondary 改藏青制服蓝（RYB 三角色：蝴蝶结粉+制服藏青+月光金；Kitty 无制服藏青体系，库洛米黑紫与浅粉底不兼容，IP 唯一成立）；info·success·warning·error 全压深达 4.5:1；muted 加深与 blockquote 解耦；borderActive 改 primary 同源深阶梯；code 改变身紫；strong 与 text 解耦；operator 改哑灰退后；number 改 vivid 橙与 type 柔金拉开。

## v3.1 可读性整改（21 套，硬性/UI 0 违例、设计告警 0 待处理，2026-10-19）

起因：v3 定版后机器审计（docs/theme-audit/criteria.md：38 硬对 4.5:1 + 15 UI 对 3:1 + IP 设计规范）仍全 21 套失守——91 条 text-ish 硬违规 + 17 条 UI 违规，设计告警 55 条（22 documented / 33 open）。本轮不改设计理念与角色故事，只做「同人设下的可读性返修」：动值、明度与并岗关系，不动色相叙事。

- 唯一结构性改动：6 套浅色主题（迪士尼/马里奥/乐高/Hello Kitty/哆啦A梦/美少女战士）代码区由深色舞台改为同色系浅色纸面舞台（codeBlockBg/codeHeaderBg 见 notes 与 src/custom-presets），syntax 七色转深墨。text/弱文字全局唯一、必须同时适配浅底，深 code 卡必然让正文判负（对比 1.0~1.6:1）；库洛米的浅色纸卡是既有先例。
- 反白修正（contrastText 按 luma 自动取 #141414/#F4F4F5）：漫威/DC/龙珠/Hello Kitty/奥特曼/变形金刚/美少女战士 的 primary（及同值并岗组）按最小 ΔE 压暗或提亮到反白 4.6:1，identity 色相不动；DC primary·info·link 整组提亮为 #64A2FF。
- 撞色解耦：pokemon primary/borderActive/markdownHeading 三连拆成 #FFCB05/#FFE14D/#FFD96B；cyberpunk borderActive/heading 拆成 #FFF24A/#FFF7A8；disney info=borderActive、doraemon/genshin/mario/lego primary=borderActive、lego text=strong 各自拆开；kuromi error/diffRemoved 拆成 #A81B38/#A31638；dragon-ball warning/heading/syntaxFunction 三连解耦。
- 几何修形：disney secondary 压深为 #A86F00（与 primary 夹角 44.2° 类比）、harry-potter secondary #BA3E40（41.7° 类比）、ultraman secondary #FFAD00（42.5° 类比）、kuromi secondary #A84AB2（43.6° 类比）；cyberpunk 黄-品红分裂互补（94.2°）经 documented 保留。
- 退后/区分度：全部主题的 syntax 五核心在 codeBlockBg 上重建 ≥4.5 且两两 ΔE76 ≥10；comment/operator 统一弱于正文（浅色主题转深墨后重排退后档）。
- 并岗记档重排：transformers 原「heading 并入 primary」取消（标题独立为 #FF5C4D，深底 5.9:1），docs/theme-audit/exceptions.json 同步删除该组；其余 documented 并岗全部保留，合计 21 条 documented / 0 open。
- 结果：node scripts/audit-themes.ts --out D:\Temp\audit-t3 --check 退出码 0；IP 硬性 0 + 0 UI；预置主题本轮前已由 T2 清零，全库硬性违例合计 0。

逐套改动（设计意图见 docs/ip-presets-notes.md）：

- 宝可梦：borderActive/heading 三连拆成 #FFE14D/#FFD96B、弱文字提亮；六组并岗保留。
- 漫威：primary·borderActive 收拢 #D51A20（反白 4.6:1），operator 提亮。
- DC：primary·info·link 整组提亮 #64A2FF，comment 提亮。
- 星球大战：弱文字/comment 提亮，退后层级重建。
- 哈利波特：secondary #BA3E40（41.7° 类比）、heading 拆出 #FFD478、弱文字微提。
- 迪士尼：代码区改暖纸 #F3E6CE/#EBD9B8 + 深墨 syntax；borderActive #1577B8、secondary #A86F00（44.2°）。（v4 已整体重绘，见上「迪士尼 v4」：冷纸 #F4F4F9、primary #903B5C、secondary #3E7389、烛金描边 #876B31）
- 马里奥：代码区改日光蓝 #D3E8F9/#C2DDF4 + 深墨 syntax；borderActive #C41E1A 解耦，heading/弱文字微调。
- 乐高：代码区改浅灰底盘 #E3E5E9/#D9DCE2 + 深墨 syntax；borderActive #A80D0F 解耦、strong #141416 拆出、secondary 压深达 UI。
- 龙珠：primary·borderActive 提亮 #FF810D（反白 4.6:1、几何 179.4° 互补），comment 提亮、warning/heading/function 解耦。
- 火影忍者：弱文字提亮，引用与 function/keyword 微调。
- Hello Kitty：代码区改草莓纸 #FBE7ED/#F6D9E3 + 深墨 syntax；primary·borderActive 压深 #DB0011（反白 4.6:1）、secondary 压深达 UI。
- 哆啦A梦：代码区改晴空纸 #CBE7F8/#B8DBF2 + 深墨 syntax；primary #0072A8、borderActive #005A88（解耦+UI），secondary 压深。
- 奥特曼：primary #CF292E、secondary #FFAD00（42.5°），弱文字/comment 提亮。
- 变形金刚：heading 拆出 #FF5C4D（原并入 primary 取消），primary #CF2E25（反白 4.6:1），弱文字/operator 提亮。
- 海贼王：弱文字/引用提亮，keyword 微调。
- 原神：borderActive #34D399 与 primary 解耦，弱文字提亮。
- 塞尔达传说：弱文字/comment 提亮，keyword 微调。
- 新世纪福音战士：弱文字微提。
- 赛博朋克 2077：borderActive/heading 拆 #FFF24A/#FFF7A8，弱文字提亮（与引用解耦），error=diffRemoved 并岗保留。
- 美少女战士：代码区改月光灰紫纸 #F1ECF3/#E8E3EA + 深墨 syntax；primary 压深 #C42C6B（反白 4.6:1）、comment/operator 重建退后。
- 库洛米（第 21 套，质量标杆）：secondary 提为 #A84AB2（43.6° 类比）、error/diffRemoved 拆分、弱文字提亮；浅色纸卡结构保持。

## v3.2 哈利波特逐像素取色重绘（2026-10-20，1 套）

起因：哈利波特是 21 套 IP 主题里唯一「没有参考图」的一套——上一版的暖褐石墙 + 霍格沃茨金 #E8B64C 是照着 IP 印象补出来的，与任何具体素材都对不上。既然是这个 IP，就得有一张能指得回像素的底片。取四张参考图（`C:\Users\辰辰洋洋\Pictures\哈利波特\` 下的 4.jpg 海报 / images.jpg 冰窟 / 2.jpg 肖像 / 3.jpg 商品图）逐像素取样后整版重绘。

**判尺（比 v3 更严）**：每个色位只允许三种来源，第四种直接判负——

1. **直采**：hex 与参考图某个像素完全一致。15 个色位走这条路，由脚本回原图逐个复核「该色确实存在」：#CAA654 在 3.jpg 领带里找到 13 个精确像素，#0B223B 在 4.jpg 夜空找到 4272 个，#91BEAE 在 4.jpg 邓布利多银须上找到 4 个。
2. **阶梯**：采样色的明度 / 彩度台阶，公式写在台账卡片上（如 8 个背景槽共用 H211° 一支色相，明度 L6.1%→L23.7%）。
3. **混色**：两个采样色的固定比例（如代码行底 #233E50 = 夜空蓝 82% × 月色青 18%）。

**结果**：场域从暖褐石墙换成**禁林月夜**——4.jpg 夜空的深蓝 #0B223B 做锚点，8 个背景槽收进同一支色相（H211°，基准 211.3°）只拉明度，0 个色相孤岛；codeBlockBg #050F1A 做全场最深舞台、codeHeaderBg #1B3F5E 反跳家族最亮压住它。primary 领带金 #CAA654 × secondary 车身猩红 #C56F72（4.jpg 霍格沃茨特快）= 43.8° 类比，落回 v3 认可的暖对暖几何；borderActive 用同材质高光档 #FCDB8C（焦点环比品牌亮一档）。语义色各领一桩实物：冰窟冷光 #3DD3FF 做 info、火光暖橙 #D4A681 做 warning、龙息朱砂 #E05A55 做 error（承自车身红：同明度 L61%、彩度 40%→71%、色相 +4.3° 的提纯步进）。语法七色两两 ΔE76 最小 13.8，comment/operator 对比度 4.87/4.83 退到核心语法最低 6.29 之下。

**审计**：硬性 38 对 4.5:1 违例 0（最紧 labelDimmed@backgroundElement 4.67:1，正文 text@background 13.84:1）；UI 15 对 3:1 违例 0（最紧 error@backgroundPanel 4.00:1）；设计告警 0（0 角色同值 / 0 色相孤岛 / 0 markdown 同值 / 品牌几何落在类比区 / 语法核心 ΔE ≥ 10 / comment·operator 退后成立）；`node scripts/audit-themes.ts --check` 退出码 0；token 对账 212 项 0 失配。id / name / appearance 全部不变，仍以同名 `harry-potter`（哈利波特）进自定义主题胶囊。

**已知缺口（备案）**：四张图绿相像素合计不足 0.1%，绿色素材客观缺位，所以 success #91BEAE 与 diffAdded #A9CCC0 只能共用月色青一族的两个明度台阶——这是全套唯一被素材逼出来的地方，不做「想象一个绿」。

**配套物**：`prototypes/harry-potter-theme-preview.html`（自包含，含 4 张参考图 + 22 块原图裁切 + 37 色位取色台账 + 实时对比度复核）；取色与复核管线在 `prototypes/harry-potter-extraction/`（extract / census / sample / provenance / validate / gen / write_preset + README 跑法），换图或改配色可整套重跑并复算审计。

## v3.2 美少女战士逐像素取色重绘（2026-10-20，1 套）

起因：旧版美少女战士是「月光樱粉 + 制服藏青」的印象配色，37 个色位里没有一个能在参考图里指出像素——`#C42C6B` 在三张图里一个像素都找不到，代码底那种灰紫 `#F1ECF3` 同样查无此色。取三张参考图（`C:\Users\辰辰洋洋\Pictures\美少女战士\` 下的 2.jpg 双画面 / 3.jpg Super SM 近景 / images (1).jpg 海报）逐像素取样后整版重绘。

**判尺（与 v3.2 哈利波特同一把尺）**：每个色位只允许三种来源，第四种直接判负——① **直采**（hex 与参考图某个像素完全一致，脚本回原图复核命中数）：#C51E56 在 2.jpg 深红蝴蝶结找到 67 处、#041541 在 3.jpg 夜空暗部找到 813 处、#AA171F 在海报红日找到 272 处；② **阶梯**（采样色沿 OKLCH 明度轴取台阶，公式写在卡片上）；③ **混色**（两个采样色按固定比例在 sRGB 空间混合）。本套 8 直采 / 10 阶梯 / 19 混色。

**结果**：场域从「樱粉各取一色」换成**樱纸一条混色阶梯**——3.jpg 白羽 #FFFFFF × 翅膀粉 #FEB7D7 按 12%→64% 排下 8 个背景槽，同族同相、0 色相孤岛，代码卡也改回同族浅纸（42%）而不是另起一块中性灰。品牌主色取 2.jpg 深红蝴蝶结 #C51E56，第二色取海报藏青短裙 #133284，HSL 夹角 116.3° 落进三角关系（粉 × 蓝 × 月金三角色，Hello Kitty 与库洛米都没有这套制服藏青）；正文与结构都是 3.jpg 夜空的深蓝 #041541，语义色各领一桩实物：星云蓝 #1659A7 做 info、海报青绿飘带 #006D72 做 success、暖金长发压深到 L0.50 的 #845A00 做 warning、海报红日 #AA171F 做 error。语法七色先定 5 个核心色相（玫红 / 群青 / 海青 / 赤铜 / 海绿）再统一压到明度 L=0.44，两两 ΔE76 最小 41.9；注释 #516384（5.08）与运算符 #625477（5.77）退到核心语法最低 6.32 之下，形成三级退后梯队。

**审计**：硬性 38 对 4.5:1 违例 0（最紧 labelDimmed@backgroundElement 4.70:1，正文 text@background 15.82:1）；UI 15 对 3:1 违例 0（最紧 success@backgroundPanel 4.70:1）；设计告警 0（0 角色同值 / 0 色相孤岛 / 0 markdown 同值 / 品牌几何落进三角区 / 语法核心 ΔE ≥ 10 / comment·operator 退后成立）；`node scripts/audit-themes.ts --check` 退出码 0。id / name / appearance 全部不变，仍以同名 `sailor-moon`（美少女战士）进自定义主题胶囊。

**已知缺口（备案）**：三张图没有饱和的绿色像素（绿相全是低彩度的浅绿前发 #7DA67E 与薄荷 #83B4B8），success 只能取海报青绿 #006D72、字符串色再压一档到 #375D39 补上「绿」的语义——这是全套唯一被素材逼出来的地方，不做「想象一个绿」。另：提示气泡文字色由宿主写死为白色，浅色主题下对比不足，37 个色位修不到这一点。

**配套物**：`prototypes/sailor-moon-theme-preview.html`（自包含，含 3 张参考图 + 18 块原图裁切 + 37 色位取色台账 + 实时对比度复核）；取色与复核管线在 `prototypes/sailor-moon-extraction/`（sources / build_palette / write_preset / make_preview / verify_sources + README 跑法），换图或改配色可整套重跑并复算审计。

## v3.5 宝可梦逐像素取色重绘（2026-10-20，1 套）

起因：旧版宝可梦是「常磐森林深墨绿 + 通用藏青」的印象配色，37 个色位里没有一个能在参考图里指出像素——`#0E1B13` 的背景绿、`#7AC74C` 的 success 绿、`#3D7DD8` 的 secondary 蓝，四张图里一个像素都找不到；v3 终审还为了合规记了 6 组有意并岗（error·keyword·diffRemoved 同火红等）。既然是这个 IP，就得有一张能指得回像素的底片。取四张参考图（`C:\Users\辰辰洋洋\Pictures\宝可梦\` 下的 01-pikachu-official-pokedex-art.png 官方图鉴立绘 / 2.jpg wikiHow 平涂 / 3.jpg 30 周年 / 4.jpg 合志插画）逐像素取样后整版重绘。

**判尺（迄今最严）**：每个色位只允许一种来源——**直采**，hex 与参考图某个像素完全一致。37 个色位全部走这条路，**0 阶梯 / 0 混色 / 0 想象**。脚本回四张原图逐位复核命中像素数并记进台账（`prototypes/pokemon-extraction/proof.json`），命中为 0 即判负。

**结果**：场域从「印象深墨绿」换成**图鉴卡的暗场**——01 号官方图鉴立绘是四张图里唯一有黑白结构的：卡面页底 `#1C1C22`、画框纯黑 `#000000`、页脚栏 `#0C0C10`。8 个背景槽收进同一条冷调明度阶梯（基准色相 240.0°，0 个色相孤岛）：codeBlockBg `#000000`（74,560 px 全场最深，做对战舞台）→ sidebarBg `#060606` → inputBg `#0C0C10` → background `#1C1C22`（58,800 px）→ bubbleBg `#28282D` → backgroundPanel `#37373B` → backgroundElement `#40404A` → codeHeaderBg `#48484D`。冷场暖字是这一版的骨架：所有暖意由徽章金与御三家承担，正文是卡面自己的白字 `#EEEEF4`（2,157 px）、弱文字是合志插画里的淡灰蓝 `#D3D3D8`。

- **黄只做「牌」，不做「底」**：primary 取 01 号图鉴卡的编号徽章黄 `#FFCB05`（3,046 px）。它是填充色不是文字色——引擎按 `contrastText(primary)` 派生前景 `#141414`，实测 12.10:1；徽章黄放在暗底上当文字只有 1.4:1，绝不做正文。
- **语义色来自御三家**：success = 妙蛙种子绿 `#7AA85D`、warning = 小火龙橙 `#FB8603`、error = 精灵球红 `#F93D32`、info = 杰尼龟蓝 `#289BCA`（均取自 4.jpg 合志插画，同一张图一次交齐四位主角）、secondary = 2.jpg 的 wikiHow 蓝底 `#799DFE`（88,538 px，全素材像素最多的一支）。
- **互补几何**：primary 金 H47.5° × secondary 蓝 H223.8° = **176.2° 互补**（分类器三档之一，合规，无需记档）。
- **反差来自深墨 syntax，不是深色卡**：代码舞台是全场最深的纯黑，七个语法色取自图里的原生墨——keyword 皮卡丘嘴部藕粉 `#C790A3`、function 2.jpg 蓝底暗面 `#6E9BBC`、type 合志青灰 `#658F8B`、number 皮卡丘中金 `#DFBF6F`、string 合志浅青绿 `#80CAAF`，注释 `#85858A`、运算符 `#7A7A7F` 退到核心语法最低对比之下。
- **v3 的 6 组并岗全部拆开**：25 个设计角色无一取同值（0 角色碰撞），markdown 六角色 0 同值，exceptions.json 里 pokemon 的记档条目随之删除。

**审计**：硬性 38 对 4.5:1 违例 0（最紧 labelDimmed@backgroundElement 5.08:1，正文 text@background 14.67:1）；UI 15 对 3:1 违例 0（最紧 error@backgroundPanel 3.24:1）；设计告警 0（0 角色同值 / 0 色相孤岛 / 0 markdown 同值 / 品牌几何落进互补区 / 语法核心最小 ΔE76 = 22.0，门槛 10 / comment 5.72 与 operator 4.92 退到核心最低 5.86 之下）；`node scripts/audit-themes.ts` 报 pokemon 硬对 0 + UI 0；`prototypes/pokemon-extraction/validate.ts` 用仓库引擎（resolve.ts / map-dsh.ts）独立复算同样全绿。id / name / appearance 全部不变，仍以同名 `pokemon`（宝可梦，dark）进自定义主题胶囊。

**已知缺口（备案）**：三支色在素材里只以抗锯齿细边存在——diffRemoved `#FE4C1C` 只有 16 px（2.jpg 脸颊的红边）、markdownBlockQuote `#BDBDC3` 18 px、syntaxKeyword `#C790A3` 18 px。它们确实存在于原图，但密度极低；这是"直采到底"的代价，备案而不伪装成"大面积取色"。另：提示气泡文字色由宿主写死为白色、链接悬浮预览卡被写死 `#2C2C2E`（暗色主题下恰好不违和，但那是巧合不是修复）、右键菜单保持毛玻璃白（插件故意不接管 `--dsw-specific-menu`）——37 个色位修不到这三点。

**配套物**：`prototypes/pokemon-theme-preview.html`（自包含，含 4 张参考图 + 37 色位实时像素取证 + 取色台账 + 对比度复核）；取色与复核管线在 `prototypes/pokemon-extraction/`（extract 全图像素直方图 / census 明度阶梯普查 / build_palette 取色自检 / validate 引擎复算 / write_preset + README 跑法），换图或改配色可整套重跑并复算审计。

## v3.4 原神逐像素取色重绘（2026-10-20，明暗两套）

起因：原神是 21 套 IP 主题里唯一「一套 37 色、却与任何具体素材都对不上」的一套——上一版是通用藏青夜店配色（`#0c152e` 底 + 荧光青 primary），既不是原神，也不是任何一张图。取五张参考图（`C:\Users\辰辰洋洋\Pictures\原神\` 下的 1.jpg 官方主视觉 / 2.jpg 派蒙 / 3.jpg 可莉 / 4.jpg 温迪 / 5.jpg 旅行者）逐像素取样，只允许两种来源：**直采**（该 hex 在参考图里成片出现，直接取像素质心）与 **定比混色**（两个锚点的固定比例线性混合）。台账与原图裁切见 `prototypes/genshin-theme-preview.html`。

**判尺**：38 条硬对（正文/内容 4.5:1）+ 15 条 UI 对（3:1）+ 25 个设计角色两两不同值 + 语法核心五角色 ΔE76 ≥ 10 + comment·operator 必须退到核心最低对比之下 + 品牌几何落进类比/三角/互补之一。第四条「25 角色两两不同值」是最狠的一条：它逼着每个岗位都有自己的一份色，连 markdown 六角色也不能重样。

**明色「纸感明信片」（`genshin`，light）**：底色是官方海报的米金纸 `#F3E3C6` 掺旅行者白纸场 `#F6F5F4`，落点 `#F4E9D4`——界面不是屏幕，是一张泛黄的旅行明信片。8 个背景槽收进同一支暖砂色相只拉明度：codeBlockBg `#F3ECE0` → background `#F4E9D4` → bubbleBg `#F5E2D7` → backgroundPanel `#E9DEC3` → backgroundElement `#EEDCBC` → codeHeaderBg `#E5CFAC`，sidebarBg `#D7C19E` 单独作一块平面（2.jpg 派蒙的深蓝领口色被调成砂）。正文不用纯黑：取 1.jpg 深褐墨 `#432E27` 掺 5.jpg 焦褐 `#382726`，落 `#402C27`（10.86:1）——比纯黑有温度，深到还能当按钮面。

**暗色「夜航明信片」（`genshin-night`，dark）**：同一批锚点换家族用。底色 `#432E27` 是深褐墨掺墨紫，8 槽收进墨棕家族（inputBg `#2E2B28` → codeBlockBg `#2F1F29` → backgroundPanel `#352427` → background `#432E27` → backgroundElement `#3B3533` → codeHeaderBg `#473733`，sidebarBg `#392D27`），文字换成奶白 `#F5E5D0`。

**组合**：primary 深靛 `#2A3B6B`（5.jpg 披风内衬 + 2.jpg 派蒙星饰）配 `#F4F4F5` 字 9.87:1；secondary 古金 `#9A7855`（1.jpg 烫金掺赭褐）作闲置态；success 青绿 `#49655A`（4.jpg 温迪）；info 雾蓝 `#4E658C`（5.jpg 雾蓝掺深靛）；warning 赭金 `#7F6247`（1.jpg 烫金压深 60%，4.67:1）；error 猩红 `#92331F`（3.jpg 可莉亮红掺深褐）。

**审计**：硬性 38 对 4.5:1 违例 0（明色最紧 labelDimmed@backgroundElement 4.50:1、正文 text@background 10.86:1；暗色最紧 markdownEmph@background 4.51:1、正文 text@background 10.25:1）；UI 15 对 3:1 违例 0（明色最紧 secondary@backgroundPanel 3.02:1，暗色最紧 success@background 3.84:1）；设计告警 0（25 角色两两不同值 / 0 色相孤岛 / 0 markdown 同值 / 品牌几何落进互补区 / 语法核心最小 ΔE76 明色 10.1、暗色 10.2，门槛 10 / comment 与 operator 退到核心最低对比之下）。**余量提示**：最紧的三处（4.50 / 3.02 / ΔE 10.1）贴着门槛，改色时须重跑 `npm run audit:themes` 复核。`node scripts/audit-themes.ts` 报 genshin 与 genshin-night 硬对 0 + UI 0 + 待处理告警 0。

**胶囊形态**：`genshin`（原神，light）与 `genshin-night`（原神·夜航，dark）两条并列出现在自定义胶囊区，id / name / appearance 三者各自独立，点哪条就把宿主外观拉到那种并显示对应色板——因为自定义主题一条只有一套色（`renderCustomTheme` 把同一套 37 色灌进明暗两半，`appearance` 只决定按哪种外观显示），「明暗一体」在这套机制里只能靠两条各带 appearance 的胶囊实现。

**配套物**：`prototypes/genshin-theme-preview.html`（自包含，含 5 张参考图 + 35 块原图裁切实证 + 37 色位取值与落点 + 逐条派生配方 + 仓库审计器实算的对比度复核）；可复跑的取色与复核管线在 `prototypes/genshin-extraction/`（`extract.py` 锚点取样 / `solver.ts` 约束求解，固定种子逐字节可复现 / `write_presets.py` 落盘 / `validate.ts` 独立复核门禁），跑法见该目录 README。

## v3.6 超级马里奥逐像素取色重绘（2026-10-20，明暗两套）

**起因**：上一版马里奥是「印象配色」——晴空蓝底 + 帽红 + 水管绿，凭的是对 IP 的记忆而不是任何一张素材。1-1 的天、砖块、山丘、帽红到底各是多少，没有一处指得回像素。取三张参考图（`C:\Users\辰辰洋洋\Pictures\超级马里奥\` 下的 1.png NES 标题画面 / 2.jpg 3D 手办 / 3.jpg 经典卡通）逐像素取样后整版重绘，明暗各一套。

**源图实测**：1.png 是严格 NES 色板，全图 51.4% 是天空 #5A96FF、10.3% 是砖橙 #CE4D08、标题字面浅沙 #FFBEB5（横幅内 39.6%）、勾线 #000000、山丘绿 #00AA00、灌木绿 #84D310、金币黄 #8C7100、小马里奥红 #DE2800；2.jpg 提供受光层次（帽红受光 #FD4E4B、背带受光 #4284DA、背带暗部 #173D7D、眼睛蓝 #529DF0、胡子和瞳孔黑 #1D100A）；3.jpg 提供高饱和原色（帽红 #C7280E、背带蓝 #0C4BAA、纽扣金 #F3CD24、鞋棕 #7E370B）。27 个源像素建台账，每个色位只允许三种来源：直采 / 明度阶梯 / 定比混色。

**明色「1-1 白昼」（`mario`，light）**：底色是 1.png 的天空 #5A96FF 混白 94% 的 #F5F9FF——界面不是屏幕，是 1-1 抬头那片天。8 个背景槽收进同一支天蓝只拉明度：inputBg #FAFCFF → codeBlockBg #F8FAFF → background #F5F9FF → sidebarBg #F2F7FF → backgroundPanel #EFF5FF → codeHeaderBg #EDF3FF → backgroundElement #EAF2FF → bubbleBg #E5EFFF。代码区不用深色卡：浅底主题的正确反差来自深墨 syntax，不来自换舞台。正文墨是 2.jpg 的胡子黑 #1D100A（17.58:1），markdownStrong 用 1.png 的勾线纯黑 #000000。

**暗色「1-2 夜行」（`mario-night`，dark）**：同一支天蓝压黑成夜空。background #060A12（压黑 93%）→ codeBlockBg #04060A → codeHeaderBg #05080E → inputBg #080E17 → sidebarBg #090F1A → backgroundPanel #0B121F → bubbleBg #0C1421 → backgroundElement #0E1829。文字换成浅沙 #FFBEB5 提亮到 #FFE2DE——夜里那块奶油砖自己在发光。霓虹色原样上桌：眼睛蓝 #529DF0 当函数、纽扣金 #F3CD24 当类型、NES 橙 #FF9A39 当数字、灌木绿 #84D310 当成功。

**组合**：primary 帽红 #C7280E（3.jpg 直采）× secondary 背带蓝 #0C4BAA（3.jpg 直采），HSL 夹角 152.4° 落进互补区。dark 侧 primary 改 NES 小马里奥红 #DE2800 压黑 12% 的 #C32300——深底上的红按钮要反白，亮红 #FD4E4B 配白字只有 2.98:1 过不了门槛，压深后 5.37:1；secondary 换 2.jpg 背带受光 #4284DA。

**取色的取舍**：NES 只有一支红族，25 个设计角色又必须两两不同值，于是帽红一支拉出四级（primary #C7280E / link #B6260E / keyword #A8240D / error #94210D），砖橙拉出两级（diffRemoved #AB4108 / markdownEmph #903809）；背景家族必须同族（色相孤岛 ≤60°），奶油砖因此不能当代码纸，改去做 markdownEmph 与 dark 的暖边框。删除行用砖橙而不是报错红——删掉的砖块本来就是碎的。

**审计**：硬性 38 对 4.5:1 违例 0（明色最紧 info@backgroundPanel 4.59:1、syntaxComment@codeBlockBg 4.51:1、正文 text@background 17.58:1；暗色最紧 diffRemoved@diffRemovedBg 4.67:1、正文 text@background 16.21:1）；UI 15 对 3:1 违例 0（明色最紧 borderActive@backgroundElement 3.69:1，暗色最紧 primary@backgroundPanel 3.18:1）；设计告警 0（25 角色两两不同值 / 0 色相孤岛 / 0 markdown 同值 / 品牌几何落进互补区 / 语法核心最小 ΔE76 明色 13.2、暗色 37.3，门槛 10 / comment 与 operator 退到核心最低对比之下）。**余量提示**：最紧的几处（3.18 / 4.51 / ΔE 13.2）贴着门槛，改色时须重跑 `npm run audit:themes` 复核。

**胶囊形态**：`mario`（超级马里奥，light）与 `mario-night`（超级马里奥·夜行，dark）两条并列出现在自定义胶囊区，id / name / appearance 三者各自独立——自定义主题一条只有一套色，「明暗一体」在这套机制里只能靠两条各带 appearance 的胶囊实现（同原神的两条）。

**配套物**：`prototypes/mario-extraction/`（`palette.py` 逐像素取色 + 判尺自检 / `validate.ts` 用仓库引擎独立复核 / `write_preset.py` 落盘两个 JSON，跑法见该目录 README）；预览页 `prototypes/mario-theme-preview.html`（自包含，含 3 张参考图 + 37 色位取值与派生配方 + 对比度实算复核）。

## v3.6 海贼王逐像素取色重绘（2026-10-20，1 套）

起因：上一版海贼王是「深海夜航」印象配色——`#0A1D38` 的深海底、`#FFCC33` 的草帽黄、`#FF4A00` 的橙红，37 个色位里几乎没有一个能在参考图里指出像素：草帽受光面的真实像素是 `#FDDBC0`、草帽阴影是 `#866D54`，`#FFCC33` 不是图上任何一处草帽的颜色；底色 `#0A1D38` 也只是「印象里的深海」。既然是海贼王，就得有能指回像素的底片。取三张参考图（`C:\Users\辰辰洋洋\Pictures\海贼王\` 下的 `images.jpg` 草帽路飞 / `2.jpg` ONE PIECE 标志 / `3.jpg` 草帽团全员）逐像素取样后整版重绘。

**判尺**：每个色位只允许一种来源——**定比混色**（两个及以上锚点的固定比例线性混合，比例写进台账）。锚点取自像素区域（矩形 + 色相窗口筛像素后取中位 / 饱和极值 / 明度极值），23 个锚点全部有像素出处，37 个色位无一例外，**0 想象**。

**结果：明暗反转，dark → light。** 三张参考图全是正午高调画面（晴空、积云、沙滩），浅底才是它们的真实亮度。场域从「深海夜航」换成**正午·海风**：8 个背景槽收进同一条晴空蓝色相（H200–206，跨度 5.7°，0 色相孤岛），只拉开度——inputBg `#F2F6F9` 云白天 → bubbleBg `#E6F3FC` → background `#E3F3FB` 云边淡蓝 → backgroundPanel `#CEEBFA` → sidebarBg `#C3E6FA` → codeBlockBg `#B4DFF9` 日光浅海纸面 → backgroundElement `#9FD6F9` → codeHeaderBg `#95D2F9`。越往里越深，像从天空一路潜进海里。

- **草帽金让位给背心红**：亮草帽金 `#E5C016` 在浅底只有 1.56:1，过不了 UI 3:1；审计器要求 6 个品牌/语义色对页面底 ≥3:1，故 primary 改由路飞背心红 `#C32635` 承担（引擎按 `contrastText(primary)` 配 `#F4F4F5` 反白，实测 5.24:1），麦秆金按图里「草帽阴影」压深成黄铜 `#91774D` 做副色与焦点环——**是黄铜，不是亮金**。这是浅底主题下草帽金的物理上限。
- **组合**：primary 红 H354.3° × secondary 麦金 H37.1° = **42.8° 类比**（草帽红缎带 + 麦秆，海贼旗配色），落进类比区，无需记档。边界与焦点环：`border` `#C1E5FA` 海图浅水色、`borderActive` `#866830` 麦秆暗档。
- **语义色来自海贼王实物**：info 潟湖海流蓝 `#1B638A`、success 索隆三刀绿 `#3B674E`、warning 娜美蜜柑橙 `#934D20`、error 赤犬岩浆红 `#930B19`；diffAdded 索隆绿·暗一档 `#315847` 配麦色沙纸底 `#EDF0B3`（3.jpg 沙滩米），diffRemoved 沉船锈红 `#51192D` 配浅珊瑚底 `#E6E1EB`。
- **反差来自深墨 syntax，不是深色卡**：代码舞台是日光浅海纸面，七个语法色取自图里的原生墨——keyword 赤犬岩浆红 `#A41523`、function 深麦秆金 `#6C5733`、type 深天蓝 `#164589`、number 娜美橙·再深一档 `#553323`、string 可可亚草叶绿 `#284A41`，comment 海图雾灰 `#3C617F`、operator 船锚钢灰（暖）`#6A5B4C`。
- **四级文字阶梯**：加重 `#171D2E` < 正文 `#0F284B` < 弱文字 `#15355E` < 引用 `#2B5E90`（越靠前越重）。旧稿曾把「加重」做成比正文更亮的暖黑（层级倒置），本版改正。

**审计**：硬性 38 对 4.5:1 违例 0（最紧 syntaxOperator / syntaxComment 4.63:1，正文 text@background 14.31:1）；UI 15 对 3:1 违例 0（最紧 borderActive@backgroundElement 3.33:1、secondary@backgroundPanel 3.41:1）；设计告警 0（25 个设计角色两两不同值 / 0 色相孤岛 / 0 markdown 同值 / 品牌几何落进类比区 / 语法核心最小 ΔE76 = 18.2，门槛 10 / comment 与 operator 4.63 退到核心最低 4.88 之下）；`node scripts/audit-themes.ts --check` 报 one-piece 硬对 0 + UI 0 + 待处理 0。id / name 不变，仍以同名 `one-piece`（海贼王，**light**）进自定义主题胶囊。

**已知缺口（备案）**：① 亮草帽金在浅底主题里当不了色位，只能以 8–14% 配比混进黄铜家族，界面上真正穿纯金的只有草帽图标（插画，不受色位阈值约束）；② 焦点环 `borderActive` 在引擎里用得最广（border-l2/l3/l4 + ghost-active-border + scrollbar-hover），但 @ 最深浮层只有 3.33:1，是全套余量最薄的一处——换「航线深蓝 `#144DA5`」可到 5.13:1，代价是草帽金在界面里彻底消失；③ 25 个设计角色靠 23 个锚点，`p_navy` 一个锚点服务 12 个角色、`navy_shadow` 服务 8 个，溯源表看着「图里来」，真实色相身份只有 8–9 种，要再拉开需要火焰 / 恶魔果实那类饱和色，三张参考图里没有；④ 提示气泡文字色由宿主写死为白色、链接悬浮预览卡写死 `#2C2C2E`、右键菜单保持毛玻璃白——37 个色位修不到这三点。

**配套物**：`prototypes/one-piece-theme-preview.html`（自包含，含 37 色位取色台账 + 逐条派生配方 + 对比度报告 + 引擎 token 落点核对）；对抗式审查记录 `prototypes/one-piece-adversarial-review.md`；可复跑的取色与复核管线在 `prototypes/one-piece-extraction/`（`extract.py` 簇普查 / `pick.py` 锚点取色 / `design.py` 配方求解 + 判尺复核 / `redteam.py` 对抗式自查 / `preview.py` 生成预览 / `apply.py` 落盘 + README 跑法），换图或改配色可整套重跑并复算审计，落盘结果与管线输出逐字节一致。

## v3.6 赛博朋克 2077 逐像素取色重绘（2026-10-20，1 套）

起因：上一版赛博朋克 2077 是「印象里的赛博朋克」配色——`#fcee0a` 的招牌黄、`#ede7f2` 的冷白正文、`#00f0ff` 的霓虹青、`#a6ff00` 的酸性绿，37 个色位里几乎没几个能在参考图里指出像素：`#00f0ff` 不是五张海报上任何一处领口青（真实领口青是 `#4A96B8`），`#a6ff00` 也不是图里的绿（绿簇最饱和的一档是 `#CDED66`），而 `#fcee0a` 与图上的黄场主色 `#FBF405` 也差着一档。既然是 2077，就得能指回像素。取五张参考图（`C:\Users\辰辰洋洋\Pictures\赛博朋克2077\` 下的 `1.jpg` V 持枪 / `2.jpg` 霓虹粉墙 / `3.jpg` V 全幅黄场 / `4.jpg` Phantom Liberty 热红场 / `5.jpg` V 与 Johnny）逐像素取样后整版重绘。

**判尺**：每个色位只允许一种来源，三选一，**没有第四种**——**直采**（色值 = 图里的一个真实像素，28 槽）、**阶梯**（某个真实像素的同色相明度阶，6 槽）、**混色**（两个真实像素的配比，3 槽）。台账 40 张来源裁切逐像素核验，框内命中的都是**完全同值**像素而非「接近」（40/40）。

**结果：dark 保持，一条暖黑明度梯。** 8 个背景槽收进同一条暖黑带（色相 −15°…+28°，绕 0° 展开跨度 43°，离审计的 60° 孤岛阈值尚有余量），只拉开度：codeBlockBg `#0E0A0B` 最深 → codeHeaderBg `#100B08` → background `#151112` → sidebarBg `#1C1616` → backgroundPanel `#231B19` → inputBg `#261F1B` → bubbleBg `#2A231D` → backgroundElement `#2C2829` 最浅，像从皮衣的阴影一路走到反光的金属面。

- **黄场是全场唯一的高声位**：primary `#FBF405`（图 2 顶缘黄场，字面像素在 752,206 px 全库里出现 268 次，所属黄场主族 408,882 px）只出现在主按钮、焦点环、选中条、标题、关键字五处；borderActive `#FFF847` 取黄场最亮一档（全库 916 次），markdownHeading `#E8DF04` 取饱和深黄，syntaxKeyword `#C3B50C` 取橄榄深黄——同一色相族四级明度，不另开新色。secondary 霓虹品红 `#D51666`（图 4 热场边缘）与主色夹角 **83.4°**，仍是 v3 记档过的「黄-品红分裂互补」，沿用 `unclassified` 例外。
- **墨色阶梯**（均对页面底 `#151112`）：标题 `#E8DF04` 13.37 > 粗体 `#E6D7BA` 13.20 > 行内码 `#B7D072` 10.96 > 链接 `#84CFEF` 10.84 > 斜体 `#E1BF9A` 10.81 > 正文 `#C2BFB0` 10.15 > 次要 `#A7B4BC` 8.83 > 引用 `#89929E` 5.95。强调链（标题 > 粗体 > 斜体 > 正文 > 次要 > 引用）单调不回头。正文取图 3 黄场边上一档灰白，次要取图 5 同一处那行冷调字幕灰，引用取图 2 的蓝灰 `#6B717F` × 图 5 的冷亮灰 `#A7B4BC` 各半——「机器的字」是冷的，「人的话」是暖的。
- **斜体这一格是对抗式复核改的**：初稿把斜体定成图 2 的肤色 `#C59459`，只有 6.92:1，**低于次要文字的 8.84:1**——一个叫「强调」的角色比说明文字还安静。复核后在语料里改取图 1 人物**脸上被光照亮的那一档** `#E1BF9A`（字面像素），10.81:1，高于正文，阶梯由此单调。
- **运算符退到最冷的角**：syntaxComment `#847C6A`（图 5 皮料暖灰 `#78705D` × 图 3 金属暖灰 `#8F8876` 各半）4.75:1，syntaxOperator `#7876A5`（图 5 夜景冷紫，字面像素）4.62:1——两者 ΔE76 37.7，与 type `#7A9E92`（39.4 / 19.9）、引用 `#89929E`（20.0 / 23.0）全部 ≥19.9。中间试过把 operator 混成中性灰，与注释的 ΔE 只剩 6.1，已否决。syntaxType 最后取 `#7A9E92` 而非最初的 `#778F99`：后者与引用 `#89929E` 只差 ΔE76 5.98——引用里的类型名会撞色，加了「可共存角色两两 ΔE76 ≥ 10」硬判据后重搜，改取图 3 里那档青玉色。
- **语义色来自海报实物**：info 领口科技青 `#4A96B8`（图 1）、success 绿光反光 `#CDED66`（图 5）、warning 皮革高光琥珀 `#E7A257`（图 5）、error 热红场 `#E0162C`（图 4）提亮到 V=1.0 的 `#FF1932`（与 diffRemoved 并岗，v3 已记档）；diff 行底是同色相的暗阶（`#E0162C` → V=0.14 的 `#240407`、V=0.21 的 `#36050B`；added 侧 `#91A657` → `#14170C` / `#1D2111`），引擎 `ensureDiffContrast` 零改写。

**审计**：硬性 38 对 4.5:1 违例 0（最紧 syntaxOperator@codeBlockBg 4.62:1、syntaxComment 4.75:1，正文 text@background 10.15:1）；UI 15 对 3:1 违例 0（最紧 secondary@backgroundPanel 3.33:1、error@backgroundPanel 4.38:1）；设计告警 0 待处理（25 个设计角色只有 error·diffRemoved 并岗一处重复值、0 色相孤岛、0 markdown 同值、语法核心五最小 ΔE76 = 31.6、comment/operator 退后 0 越位、可共存角色两两 ΔE76 ≥ 10 全部满足）；引擎 tokenParity 0 失配。id / name 不变，仍以同名 `cyberpunk-2077`（**dark**）进自定义主题胶囊。

**已知缺口（备案）**：① `secondary` 在整个宿主只有 **1 个消费者**——`--dsw-alias-state-idle-primary` 的 8px 空闲圆点，所以霓虹品红在真实界面里几乎看不见，这套实际是**单声位**主题，粉墙只活在几何里；② `border`（border-l1）同样只有 3 个消费者（行内代码边框、菜单描边、折叠代码体），主代码卡与表格边框都不是它，这个色位在界面里几乎不可见；③ 证据不均：字面像素在全库 752,206 px 中出现 ≥50 次的只有 5 槽（borderActive 916 / primary 268 / sidebarBg 147 / backgroundPanel 114 / background 50），其余 23 槽是 1–49 次的薄样本——**色族**仍然很厚（黄场 408,882 px、黑皮阴影 127,685 px、皮革暖棕 75,979 px、红场 37,653 px、琥珀 22,151 px），但几个语义色的具体 hex 是薄样本；④ `syntaxType` `#7A9E92`、`syntaxOperator` `#7876A5`、`syntaxKeyword` `#C3B50C` 等全库仅 1 px，是为同时满足判尺与分离度而在语料里做约束搜索得到的解。

**配套物**：`prototypes/cyberpunk-theme-preview.html`（自包含，含 37 色位取色台账 + 40 张逐像素来源裁切 + 53 对对比度实时复核 + 对抗式审查记录）；管线在 `prototypes/cyberpunk-extraction/`（`cp_core.py` 共享判尺与语料 / `extract.py` 色彩普查 → `clusters.json` / `design.py` 配色 + 判尺 + 语料约束搜索 → `palette.json` / `pick.py` 字面像素台账 → `anchors.json` / `redteam.py` 对抗式自查 / `preview.py` 生成预览 / `apply.py` 落盘 `src/custom-presets/cyberpunk-2077.json`），跑法见该目录 README。

## v3.6 哆啦A梦逐像素取色重绘（2026-10-20，1 套）

起因：上一版哆啦A梦是「印象配色」——晴空纸 #CBE7F8 的代码区、primary #0072A8、info 改紫罗兰（自称「任意门秘宝」）、number 改薰衣草紫。37 个色位里几乎没几个能在参考图里指出像素：紫罗兰与薰衣草紫在六张图里一个像素都没有，primary #0072A8 也不是 1.png 身上那支身体青蓝（真实像素是 #189BC8），铃铛黄则完全不在任何色位上。既然是哆啦A梦，就得能指回像素。取六张参考图（`C:\Users\辰辰洋洋\Pictures\哆啦A梦\` 下的 1.png 全身立绘 / 2.jpg 漫画封面 / 3.png 黄场字标 / 4.jpg 暗场海报 / 5.jpg 近景特写 / 6.jpg 合影）逐像素取样后整版重绘。

**判尺**：每个色位只允许三种来源，第四种直接判负——**直采**（hex 与图内某个像素完全一致；PNG 精确匹配、JPEG ±3 容差，命中数记进台账，命中为 0 即判负）、**阶梯**（同色相明度阶）、**定比混色**（两个锚点按固定比例线性混合，比例写进台账）。18 个源色、**2 槽直采 + 35 槽定比混色，0 想象**。

**结果：场域从「印象晴空纸」换成图里那条晴空混色阶梯。** 1.png 的漫画纸白 #FFFFFF（39,280 px）× 5.jpg 身上那支柔蓝 #7FD2FE（16,393 px）拉出 8 个背景槽，同族同相（色相 H200–202°，0 色相孤岛）：inputBg #FBFDFF（L* 99.2）→ background #EFF9FF（97.4）→ bubbleBg #E4F6FF（95.8）→ sidebarBg #DBF2FF（94.2）→ backgroundPanel #D0EFFF（92.7）→ codeBlockBg #C5EBFF（91.0）→ codeHeaderBg #B9E7FE（89.2）→ backgroundElement #AEE2FE（87.3），每步 ≥1.5 L*（判尺要求 ≥1.4）。代码区不用深色卡：浅底主题的正确反差来自深墨 syntax，不来自换舞台。

- **主色是身上的蓝，副色是铃铛黄**：primary #135F7B（1.png 身体蓝 #189BC8 压深 42%）配 secondary #9E7F09（1.png 铃铛黄 #FFCB05 压深 40%），HSL 夹角 **148.6° 落进互补区**。初稿挑的是 3.png 的字标深蓝 #0168B5 做主色——那是商标字，不是角色；换成身上那支蓝之后品牌身份才立得住。
- **语义色各领一桩实物**：info #2D61A1（6.jpg 字标靛蓝 #316AB1 压深 10%）、success #496352（3.png 蓝字标压在黄场上叠出的那点绿 #6F997A 压深 38%）、warning #733D18（4.jpg 舌头橙 #F07A22 压深 55%）、error #6F1319（4.jpg 嘴内红 #ED1B24 压深 56%）；diffAdded #36473D / diffRemoved #7D141A 与两张 diff 底 #E8EFEA / #FDE4E5 各取同族一档。
- **反差来自深墨 syntax**：七个语法色取图里的原生墨压深——keyword #821823（1.png 鼻尖红 #E22233 压深 45%）、function #204069（6.jpg 字标靛蓝压深 45%）、type #175B7B（4.jpg 暗场亮蓝 #21A3DD 压深 48%）、number #5A3B34（5.jpg 铜锣烧棕 #AF6E5A 压深 52%）、string #3E5345（同绿压深 50%），comment #626262（4.jpg 暗场中灰 #515151 掺白 10%，4.85:1）与 operator #4B5B62（中灰 × 暗场亮蓝 88/12，5.62:1）退到核心五色最低 5.93（syntaxType@codeBlockBg）之下。
- **v3 终审的并岗全部拆开**：25 个设计角色无一取同值（0 角色碰撞），markdown 六角色 0 同值；`docs/theme-audit/exceptions.json` 里 doraemon 的记档条目随之删成仅记档。

**审计**：硬性 38 对 4.5:1 违例 0（最紧 markdownBlockQuote@backgroundPanel 4.78:1，正文 text@background 16.79:1）；UI 15 对 3:1 违例 0（最紧 secondary@backgroundPanel 3.18:1、borderActive@backgroundElement 4.90:1）；设计告警 0（0 角色同值 / 0 色相孤岛 / 0 markdown 同值 / 品牌几何落进互补区 / 语法核心最小 ΔE76 = 15.5，门槛 10 / comment·operator 退后成立）；`node scripts/audit-themes.ts --check` 报 doraemon 硬对 0 + UI 0 + 待处理 0，token 对账 212 项 0 失配。id / name / appearance 全部不变，仍以同名 `doraemon`（哆啦A梦，light）进自定义主题胶囊。

**已知缺口（备案）**：① 六张图里没有一处设计过的绿——唯一的绿是 3.png 蓝字标压在黄场上叠出来的 39 个像素 #6F997A，success 与 diffAdded 两个岗位都从这 39 px 里派生，这是全套唯一被素材逼出来的地方，不做「想象一个绿」；② 宿主把四个状态色渲染成 8px 圆点，而素材里没有第二支绿、第二支橙，所以四态靠**明度阶梯**（secondary L*54.5 / success 39.5 / warning 31.9 / error 23.4）而不是色相分开：常视最小 ΔE76 23.0，绿色觉模拟下 10.7（红绿色盲）/ 20.5（红色盲），仍过 10 的门槛但余量薄；③ `secondary` 在整个宿主只有 **1 个消费者**——`--dsw-alias-state-idle-primary` 的 8px 空闲圆点，铃铛黄在真实界面里几乎看不见；④ `border`（border-l1）同样只有 3 个消费者，且 8 个表面上都 <3:1（审计信息项 borderBelow3: 8）——描边不是文字，这是 37 槽判尺结构性照不到的一处；⑤ 宿主还有三个未被映射的 token 会漏 DeepSeek 蓝（`--dsw-alias-brand-primary-new-colorprimary-new-color` / `--dsw-alias-label-deep-diving` / `--dsw-alias-switch-thumb`），37 个色位管不到。

**配套物**：`prototypes/doraemon-theme-preview.html`（自包含，含 18 块原图裁切 + 37 色位取色台账 + 场域明度阶梯 + 对比度实算复核 + 对抗式审查纪要）；对抗式审查记录 `prototypes/doraemon-adversarial-review.md`；可复跑的取色与复核管线在 `prototypes/doraemon-extraction/`（`census.py` 全图像素普查 / `derive.py` 取色 + 判尺复算 / `preview.py` 生成预览 / `apply.py` 落盘 `src/custom-presets/doraemon.json`），跑法见该目录 README。

## v3.7 DC 逐像素取色重绘（2026-10-20，1 套）

起因：上一版 DC 是「印象配色」——primary #64a2ff、secondary #ffcf40、background #0b0b11 这类通用值，37 个色位里没几个能在参考图上指出像素。用户的硬要求是**所有颜色必须从提供的图中产生而来，不能自己想象**，于是取三张参考图（`C:\Users\辰辰洋洋\Pictures\DC\` 下的 `1.jpg` 群像海报 / `2.jpg` DC 徽章圆盘 / `3.jpg` THE DC ENCYCLOPEDIA 百科封面）逐像素取样后整版重绘。

**判尺**：每个色位只允许一种来源——**直采**（hex 必须是三张图里的真实像素）。但三张图都是连续渐变的绘画，某个 hex 的*精确*像素常常只有个位数（#07111D 全图 7 px、#717F8A 精确 1 px），按精确命中判「想象色」会误杀真材质，故材质真伪改用 **tonal mass**（ΔE76 ≤ 6 邻域像素数）判定：≥300 视作真实材质、60–300 视作渐变取样、<60 视作薄。本套 **37 个色位落在 36 个不同色值上（#0A0F12 用在两处），全部是真实像素，0 想象**；mass ≥ 1000 的 30 个、300–1000 的 4 个、<300 的 2 个（#8BB551 259 / #89BF81 134，都是角色用色的自然结果）。另加两条针对本素材的加固判据：**引擎不改写判据**（`resolve.ts:221` 的 `ensureDiffContrast` 只要 diffFg 对任一 diffBg < 4.5 就整组四色重写，作者色被覆盖，故两个 diff 组的作者值本身必须 ≥4.5）与**焦点环双达标判据**（`borderActive` 对浅填充 ≥3:1 且对深浮层 ≥4.5，同族青做不到，焦点环必须浅）。

**结果：场域从「通用深色」换成图里那条夜蓝阶梯。** 8 个背景槽收在一条色相 H202–226（跨度 23.2°，0 色相孤岛），只拉开 L\*：codeBlockBg #000515（1.5）→ sidebarBg #0A0F12（4.1）→ background #0C1326（6.2）→ backgroundPanel #09203F（12.3）→ codeHeaderBg #122543（14.7）→ inputBg #192D52（18.8）→ backgroundElement #263356（21.8）→ bubbleBg #0F437D（28.4，2.jpg 徽章圆盘深蓝），每步 +2.1 … +6.6 L\*，无重复行、无层级倒挂。

- **主色是徽章圆盘，副色是女侠金冠**：primary #0373B3（2.jpg 徽章本体，精确 885 px / mass 54,861，反白 4.65:1）配 secondary #E4BA56（3.jpg 神奇女侠金冠），HSL 夹角 **159.6° 落进互补区**。主色没取更暗的邻档（#0272B2 / #025C9A）——它们 UI 3:1 会掉到线下。
- **语义色各领一桩实物**：info #91C1CF（1.jpg 速度力水蓝）、success #64AB65（1.jpg 绿灯侠战衣绿）、warning #C2A595（3.jpg 封面天空陶土）、error #BE4B48（3.jpg 红披风暗面）；diffAdded #8BB551（3.jpg 封面绿灯侠黄绿）、diffRemoved #D37B6D（1.jpg 火焰旁披风暖红），两个 diff 底用 3.jpg 封面暖影 #221A17 / #18100D，新增组 #131B0E / #0A0F12 取封面暗部绿黑。
- **反差来自旧纸与钢青**：正文 text #FEFAD4（3.jpg 百科封面旧纸）、次级 textMuted #BDC0C5（1.jpg 蓝雾天光）、边界 border #7C7D7F（1.jpg 钢仔装甲银灰）、焦点环 borderActive #D6F0FF（2.jpg 徽章白星冷光）——焦点环对主按钮填充 4.33:1、对浮层 10.51:1（WCAG 2.2 SC 2.4.13 要 ≥3）。
- **语法七色各有出处且退后成立**：keyword #BDA3B0（3.jpg 封面暗肤玫瑰灰）、function #008AC9（2.jpg 徽章圆盘上缘）、type #BEDCDE（1.jpg 钢仔银青高光）、number #E6B189（3.jpg 封面里那本旧漫画的纸）、string #89BF81（1.jpg 绿灯侠战衣浅绿），comment #717F8A（1.jpg 钢仔钢灰）4.94 / operator #7D7875（1.jpg 装甲与硝烟暖灰）4.66 都低于核心五色下限 5.31（syntaxType@codeBlockBg），核心最小 ΔE76 = 26.66（门槛 10）。
- **v3 终审的并岗全部拆开**：25 个设计角色无一取同值（0 角色碰撞），markdown 六角色 0 同值；`docs/theme-audit/exceptions.json` 里 dc-comics 的记档条目随之删成仅记档。

**审计**：硬性 38 对 4.5:1 违例 0（最紧 contrastText(primary)@primary 4.65:1、markdownLink@backgroundPanel 4.66:1、syntaxOperator@codeBlockBg 4.66:1）；UI 15 对 3:1 违例 0（最紧 primary@backgroundPanel 3.18:1）；设计告警 0（0 角色同值 / 0 色相孤岛 / 0 markdown 同值 / 品牌几何落进互补区 / 核心语法最小 ΔE76 26.66 / comment·operator 退后成立）；`node scripts/audit-themes.ts --check` 报 dc-comics 硬对 0 + UI 0，token 对账 212 项 0 失配，distinctSurfaces 8。id / name / appearance 全部不变，仍以同名 `dc-comics`（DC，dark）进自定义主题胶囊。

**已知缺口（备案）**：① 徽章上**只有一条饱和青**（#008AC9 / #0392CE / #038FCC 彼此 ΔE 1.45–4.0），而 function 需要 Y ≥ 0.1822、link 需要 Y ≥ 0.2406，窗口里只有一个解，于是 markdownLink #0392CE 与 syntaxFunction #008AC9 的 ΔE 只剩 **3.97**——这是**材料上限不是设计失误**，要拉开得换素材；② 三张图里**没有饱和紫**，只有低彩度暗玫瑰 #BDA3B0（彩度 26），syntaxKeyword 只能取它，四态语义色因此靠明度而非色相分开；③ 焦点环 #D6F0FF 是全主题最亮的一档（Y 0.838），对浮层余量足（10.51）但界面里会「跳」，若想更沉可用 #B8D8ED（对填充 3.55，落进 3:1 但余量薄）——取舍是审美；④ 审计信息项：border 对 8 个表面有 1 个 <3:1（bubbleBg 2.40）、两个 diff 底 <3:1、3 个语法色在代码头带上 <4.5，这三项判尺只记信息不判罚；⑤ 本套的温度是**素材的温度**（三张图两张浅调、一张深调），读起来是「夜里的 DC」，与仓库 notes 原写的「DC 经典蓝红金」不是同一个调子。

**配套物**：`prototypes/dc-comics-theme-preview.html`（自包含，含三张参考图 + 37 色位取色台账 + 应用窗口 mockup + 53 对对比度实算复核 + v1→v2 对抗式审查表 + 材料边界声明 + 37 格出处证据拼版）；对抗式审查记录 `prototypes/dc-comics-adversarial-review.md`；可复跑的取色与复核管线在 `prototypes/dc-comics-extraction/`（`verify.py` 37 色位台账 + 38 硬对 + 15 UI 对 + W1..W5 复算 → `palette.json` / `provenance.py` 逐色位回原图取证 → `provenance.json` + `provenance-sheet.png` / `apply.py` 落盘 `src/custom-presets/dc-comics.json`），跑法见该目录 README。

## v3.6 宝可梦对抗式审查后二次重绘（2026-10-20，1 套）

起因：v3.5 交付后做了一轮**四路对抗式审查**——四名审查者互相独立、各自取证，分别攻击「暗场这个根本决定」「直采判尺的真实性」「这套盘子在资深设计师眼里成不成立」「把已经写下的结论逐条推翻」。审查原文合并存 `prototypes/pokemon-adversarial-review.md`。本节只写**改了什么、为什么改、哪些提案被否、哪条原理由被证伪**。

**先说被证伪的那条原理由。** v3.5 写的是「审计的 `primary@background ≥ 3:1` 决定亮黄不能当主色，所以只能做暗场」。范式评审用仓库引擎造出一套完整 37 色位、实跑判尺 **38 硬对 0 违例 / 15 UI 对 0 违例** 的浅色候选（`D:\Temp\pokemon-theme\adv3\palette.light.json`，17 直采 / 20 混色），并指出仓库 12 套浅色预置里 9 套正是把饱和黄压在浅代码卡上（naruto `#FFAFBE`、one-piece `#95D2F9`、hello-kitty `#F4B4D0`）——**3:1 只规定「哪个槽位能放亮黄」，不规定「场」**；用审计规则倒推「必须暗场」是越权推理。暗场仍然更强，但靠的是三条与审计无关的理由：① **素材的场本来就是暗的**——01 号图鉴立绘不是「白卡纸 + 黑画框」，而是**暗卡 + 30 px 白衬边**（卡面 `#1C1C22` 58,800 px 21.60% / 画框墨 `#000000` 74,363 px 27.32% / 页脚 `#0C0C10` 27,378 px 10.06%，白只占 14.05% 且集中在衬边）；② 用户「颜色必须来自图、不能想象」这条硬规则**只有暗场能以最严格形式兑现**——浅场要过 4.5:1 正文与 3:1 品牌位只能靠混色，判尺从 37 直采 / 0 混色掉到 17 直采 / 20 混色；③ **暗场的明度跑道是浅场的两倍**（8 个表面槽 L\* 跨度 0 → 30.8，浅场候选只有 84.0 → 100.0）。代价一并记下：浅场候选本身不劣（判尺余量更宽、语法核心 ΔE76 21.9 与现方案 22.0 持平、0 角色碰撞 / 0 色相孤岛 / 0 markdown 同值），但它拿不回「主色就是徽章黄」——浅场 `primary` 只能是 `#84633C`（107 px 的暗面金），主按钮读起来是「古铜」而不是「皮卡丘黄」。

**证伪评审查出的事实错误（全部已修）**

- 3.jpg「30」周年海报**对色板贡献原本为 0**，而 v3.5 的「四张图拿走了什么」卡与 SPEC.md 却把 `#F93D32` / `#0C0406` / `#111312` / `#FFCB05` 归给它——这四色在 3.jpg 里都是 0 px（`#F93D32` 属 4.jpg、`#0C0406` 属 01、`#111312` 属 4.jpg、`#FFCB05` 属 01）。根因是**手写的出处表**。
- 37 槽里有**一处精确重复**：`sidebarBg` 与 `diffRemovedLineNumberBg` 同为 `#060606`。审计不报，因为角色碰撞检查只覆盖 25 个设计角色（排除 bg 组与 4 个 diff\*Bg）。
- 出处表另有 5 处归属错：`#D3D3D8`、`#BDBDC3` 声明 04 实为 01；`#6E9BBC` 声明 02 实为 04；`#85858A`、`#7A7A7F` 声明「01/04」实为 01。
- SPEC.md §4.3 的 8 个对比度数字是旧草稿值（`text@sidebarBg` 17.86 实为 17.53；`labelDimmed` 三组把单一色当逐表面合成色算，等等）。
- `docs/theme-audit/exceptions.json` 里 pokemon 的旧记档条目**当时还在**，文档却写「已删除」。

**落地的 6 处改动**（每一支仍是四张图里的真实像素，0 阶梯 / 0 混色 / 0 想象）

| 角色 | v3.5 | v3.6 | 理由 |
|---|---|---|---|
| `borderActive` | `#F4D77C` 皮卡丘受光面（01，4,673 px） | **`#FEED79`** 周年海报奶油金（3.jpg，1,516 px） | 3.jpg 原本零贡献；奶油金比品牌黄亮一档，焦点环比按钮更醒目 |
| `diffRemovedLineNumberBg` | `#060606`（与 `sidebarBg` 同值） | **`#141000`** 画框暖黑（01，80 px） | 消除 37 槽唯一的同值重复；其上 `diffRemoved` `#FE4C1C` = 5.68:1，引擎 `ensureDiffContrast` 不改写 |
| `markdownHeading` | `#FAE721` wikiHow 平涂黄 | **`#E3C371`** 皮卡丘中金（01，3,755 px） | 两个大黄同屏互相对比 1.20:1，违反本主题自己的第①条律；改后与 primary 的 ΔE00 由 9.70 升到 10.50 |
| `syntaxNumber` | `#DFBF6F` | **`#C5A863`**（01，698 px） | 与 `borderActive` 的 ΔE76 9.46 是全矩阵最差的一对，且二者必然同屏（代码块获焦 + 块里有数字 token） |
| `codeBlockBg` | `#000000` 纯黑舞台 | **`#0C0C10`**（01 卡面暗场，27,378 px） | 纯黑代码台是「挖了个洞」（Y=0 对页底 0.0119）；`inputBg` 顺势让位 `#000000` 画框墨（74,363 px） |
| `codeHeaderBg` / `border` | `#48484D` / `#58585A` | **`#58585A`**（4.jpg，993 px）/ **`#40404A`**（01 卡边细线，513 px） | 描边比它框的面还亮是层级倒置；改后 `border` L\* 27.44 比 `codeHeaderBg` 37.47 暗 10.03 |

8 个表面槽重排成单调阶梯：inputBg `#000000`（L\* 0.00）→ sidebarBg `#060606`（1.65）→ codeBlockBg `#0C0C10`（3.42）→ background `#1C1C22`（10.50）→ bubbleBg `#28282D`（16.30）→ backgroundPanel `#37373B`（23.20）→ backgroundElement `#48484D`（30.76）→ codeHeaderBg `#58585A`（37.47），相邻 ΔL\* 1.65 / 1.77 / 7.09 / 5.79 / 6.91 / 7.55 / 6.71。

**被否掉的提案（记名备案，防后人重提）**

- 审美 R1「`textMuted` `#D3D3D8` → `#A49E9E`」：`#A49E9E` 虽是 4.jpg 里 807 px 的真平面，但宿主把 `labelDimmed` 定义为 `withAlpha(textMuted, 0.8)` 且对三个主表面卡 4.5，`labelDimmed@backgroundElement` 会掉到 3.13:1（硬性违规）；仓库其它主题的 muted 值本就是按门禁反推的——`textMuted` 的「muted 程度」被宿主判尺锁死。
- 审美 R2 原案（`backgroundElement` 抬到 `#58585A`）：`labelDimmed@backgroundElement` 掉到 3.68:1，硬门禁不通过。
- 审美 R6「`markdownEmph` `#F9B584` → `#F8D69B`」：该色在四张图里 **0 命中**；素材里 CR ≥ 11 的暖色全落在金族（H 41–55），与 `markdownCode` / `markdownHeading` 撞色。素材没有更亮的杏色，强调只能由斜体形态与 `markdownStrong` 承担。
- 出处评审的 ALT（12 直采 / 11 阶梯 / 14 混色）：审计违例 1→0、语法核心 21.96→32.38，但会把 v3.5 主动收严的「0 阶梯 0 混色」退回仓库通用口径；精确覆盖 41%→24%，而感知覆盖 67%→64% 几乎不动——收益不在用户要的那条线上。

**审计**：硬性 38 对 4.5:1 违例 0（最紧 `labelDimmed@backgroundElement` **4.552:1**，正文 `text@background` 14.67:1、`text@sidebarBg` 17.53:1）；UI 15 对 3:1 违例 0（最紧 `error@backgroundPanel` 3.24:1）；设计告警 0（25 个设计角色 0 同值、0 色相孤岛、基准色相 240.0°、0 markdown 同值、品牌几何 primary 47.5° × secondary 223.8° = **176.2° 互补**、语法核心最小 ΔE76 22.0 门槛 10、comment 5.32 与 operator 4.57 退到核心最低 5.44 之下）；**引擎改写：无**（`ensureDiffContrast` 不会悄悄改写作者色值）。`node scripts/audit-themes.ts --check` 报 pokemon 硬对 0 + UI 0 + 待处理 0，退出码 0；`npm test` 283 / 283 通过；`prototypes/pokemon-extraction/validate.ts` 用仓库引擎（`resolve.ts` / `map-dsh.ts`）独立复算同样全绿。四图精确命中 331,427 / 830,418 px = 39.9%（01 210,119 / 2.jpg 88,570 / 3.jpg 2,568 / 4.jpg 30,170），37 槽落在 **37 个不同色值**上、0 同值重复。id / name / appearance 全部不变，仍以同名 `pokemon`（宝可梦，dark）进自定义主题胶囊。

**已知缺口（备案）**：① `labelDimmed@backgroundElement` 4.552:1 是全套最紧的硬对，距 4.5 只剩 0.05——若再把 `backgroundElement` 抬亮一档就得重算；② 三支色在素材里只以抗锯齿细边存在——`diffRemoved` `#FE4C1C` 16 px、`markdownBlockQuote` `#BDBDC3` 18 px、`syntaxKeyword` `#C790A3` 18 px；③ 提示气泡文字色由宿主写死为白色、链接悬浮预览卡被写死 `#2C2C2E`、右键菜单保持毛玻璃白（插件故意不接管 `--dsw-specific-menu`）——37 个色位修不到这三点；④ 审美评审指出「直采到底」的代价：37 槽里 10 槽锚在 <60 px，6 个色位 100% 来自 01 图那条 19 px 高的图注小字带——这是素材上限不是取色失误，备案而不伪装成大面积取色。

**配套物**：`prototypes/pokemon-theme-preview.html`（自包含，含 4 张参考图 + 37 色位实时像素取证 + 逐图命中自动生成的取色台账与「四图贡献」卡 + 应用窗口 mockup + 53 对对比度实算复核）；对抗式审查记录 `prototypes/pokemon-adversarial-review.md`；取色与复核管线在 `prototypes/pokemon-extraction/`（extract 全图像素直方图 / census 明度阶梯普查 / build_palette 取色自检 / validate 引擎复算 / write_preset + README 跑法），换图或改配色可整套重跑并复算审计。范式评审做的那套**浅场对照候选**（`palette.light.json` + `validate_light.ts` + 并排渲染 `side-by-side.png`）留档在 `prototypes/pokemon-extraction/light-variant/`，可重跑对照，但**不进预置**——它拿不回「主色就是徽章黄」。

## v3.8 变形金刚逐像素取证重绘（2026-10-20，1 套）

起因：用户的硬要求是**所有颜色必须从提供的图中产生而来，不能自己想象**——五张参考图（`C:\Users\辰辰洋洋\Pictures\变形金刚\` 下的 `1.jpg` 大黄蜂白棚定妆 / `2.jpg` 擎天柱雾都 / `3.jpg` 擎天柱持剑山林 / `4.jpg` 电影海报三角色 / `5.jpg`《变形金刚 One》海报）。上一版是按印象配的（`primary #E63329`、`secondary #38A1FF`、`success #3FB950` 等），其中 `success #3FB950` 在五图里**根本不存在任何像素**——鲜绿是想象出来的。这轮把「不想象」变成可复算的证明链再落库。

**判尺（四条，全部机器可复算）**：

- **直采**——hex 必须是五图里的真实像素。**光「等于某个像素」是弱证明**：JPEG 噪点会制造海量一次性像素，`#E86751`（擎天柱胸窗红）全图精确命中只有 1 px，是噪点不是材质。故真伪改用**邻域人口**判定：ΔRGB 之和 ≤ 6 的邻域内像素数 ≥ 24 px 才算「图上一块看得见的实色」。本套 25 个设计岗位里有 5 个在旧口径下是孤点（syntaxKeyword 1 px / diffAdded 2 px / markdownCode 3 px / markdownLink 3 px / markdownEmph 4 px），新口径下全部推倒重选。
- **阶梯**——背景 8 槽是**同一色相族内的明度阶，且每一阶本身也是真实像素**。这一条是本轮最硬的自我推翻：初版的阶基色 `#08112C` 精确命中 0 px（最近邻 `#08122B` 才有 22 px），等于整条阶梯是算出来的，违反 house「直采＝与参考图某像素完全一致」的口径，于是全部换成 5.jpg 夜空里真实存在的像素。
- **混色**——4 个 diff 底色是两个采样色的固定比例（引擎 `map-dsh.ts:249` 只给 8 个背景槽 `allowTransparent: true`，diff 底色必须是 6 位不透明 hex）。
- **退后梯队**——仓库判尺要求 comment / operator 的对比度低于语法核心五色最低值；求解器把这条当硬约束求解，不靠事后调参。

**结果：场域从「通用深色」换成图里那条夜空阶梯。** 8 槽收在 H222.9° 基准（跨度 ≤ 8.6°，0 色相孤岛），每一阶都能在 5.jpg 里指到像素：codeBlockBg #020B1C（邻域 2,764 px）→ sidebarBg #021128（1,046）→ background #08122B（777）→ backgroundPanel #04133A（308）→ inputBg #022447（312）→ codeHeaderBg #0A2250（360）→ backgroundElement #0D2354（329）；气泡槽 bubbleBg #241340 取 5.jpg 星云洋红（148），是全界面唯一的异族（离基准 39°，仍在 60° 线内）。

- **主色是徽章红，副色是能量电蓝**：primary #D70A2B（2.jpg，邻域 33 px）× secondary #3366A8（5.jpg，114 px），HSL 夹角 **136.5° 落进三角区**——汽车人红 / 霸天虎蓝 / 大黄蜂黄三张脸都在图里，不必凑互补。
- **焦点环让给大黄蜂车漆黄**：borderActive #F4C803（1.jpg，邻域 606 px），对 bg / panel / element 分别是 11.58 / 11.31 / 9.46:1——界面里最醒目的一个点是车灯，不是按钮。
- **语义色各领一桩实物**：info #0A6999 塞伯坦全息青（26）、success #A7ABAA 山林苔色（387）、warning #B07400 车漆阴影琥珀（112）、error #FF5B02 肩炮熔炉橙（93）；diffAdded #8F8C7D 战场草坡（587）、diffRemoved #BC9D80 战损锈铜（552），两个 diff 底是混色（#8F8C7D×12% + #08122B×88% = #182135；#BC9D80×12% + #08122B×88% = #1E2335）。
- **语法七色各有出处且退后成立**：keyword #FF0044 胸窗辉光红、function #E1AA00 车漆深金、type #F68C8E Arcee 玫瑰粉、number #D9B9A0 引擎盖暖砂、string #8E979C 没上漆的钢灰蓝，comment #767C72 战场烟灰 4.59 / operator #727A85 远景雾蓝 4.53 均低于核心五色下限 5.00，核心最小 ΔE76 = **27.6**（门槛 10）。
- **v3 终审的两处并岗全部拆开**：secondary #3366A8 与 info #0A6999 分属两个物、borderActive #F4C803 让给车漆黄、markdownLink #0B8FBF 归能量电弧；25 个设计角色 0 同值，markdown 六角色 0 同值。`docs/theme-audit/exceptions.json` 里 transformers 的记档随之删成仅记档。

**审计**：硬性 38 对 4.5:1 违例 0（最紧 syntaxOperator@codeBlockBg 4.53、syntaxComment 4.59、markdownBlockQuote@backgroundPanel 4.63、contrastText(primary)@primary 4.82）；UI 15 对 3:1 违例 0（最紧 info@backgroundPanel 3.01、info@background 3.09、secondary@backgroundPanel 3.11）；设计告警 0（0 角色同值 / 0 色相孤岛 / 0 markdown 同值 / 品牌几何 136.5° 三角 / 核心最小 ΔE76 27.6 / comment·operator 退后成立）；`node scripts/audit-themes.ts` 报 transformers 硬对 0 + UI 0，token 对账 212 项 0 失配，distinctSurfaces 8。`prototypes/transformers-extraction/validate.ts` 用仓库引擎（`resolve.ts` / `map-dsh.ts`）独立复算同样全绿，退出码 0。id / name / appearance 全部不变，仍以同名 `transformers`（变形金刚，dark）进自定义主题胶囊。

**已知缺口（备案）**：① **素材里没有鲜绿**——五图 H120–180、S ≥ 0.30 的像素为 0，只有 3.jpg 苔色与 4.jpg 草坡两处低彩度绿，所以 success 只能是 #A7ABAA（苔灰）、diffAdded 是 #8F8C7D（草坡橄榄），两级明度分开承担「完成」与「新增」，不另造更漂亮的绿；② 明度上限被素材锁死——markdownStrong 取 1.jpg 白棚里的纯白 #FFFFFF（邻域 130,346 px），text 只能退到钢白 #CFE2E8，两者 ΔE76 仅 13.4；③ 邻域人口最薄的几支色（info 26 / syntaxKeyword 32 / primary 33 / markdownCode 52 / syntaxType 48）说明素材在这些色相上本来就是渐变边，不是实色；④ 会同时同屏的相邻岗位最小 ΔE76 11.6（syntaxString × syntaxOperator），是 49 对相邻关系里最紧的一对，比仓库判尺（只查语法核心 ΔE ≥ 10）严，但比审计信息项提示的四对灰阶（textMuted × success 8.2 等）高——素材只有约 10 个高支撑色相家族，25 个岗位靠同族明度台阶拉开，这是材料上限不是取色失误；⑤ 提示气泡文字色由宿主写死为白色、链接悬浮预览卡被写死、右键菜单保持毛玻璃白（插件故意不接管 `--dsw-specific-menu`）——37 个色位修不到这三点。

**配套物**：`prototypes/transformers-theme-preview.html`（自包含，含 5 张参考图 + 20 块「取色现场」实拍裁切 + 37 行取色溯源表（配方 / 取色锚点含坐标与邻域人口 / 设计意图）+ 37 格色卡 + 53 对对比度实算复核 + 应用窗口 mockup + 材料边界声明）；对抗式审查记录 `prototypes/transformers-extraction/adversarial.py`（首轮推翻了「22/25 直采是聚类中位色」「success 是想象出来的」「markdownCode 与 text ΔE 4.8」三条）；可复跑的取色与复核管线在 `prototypes/transformers-extraction/`（`model.py` 全图像素账本 + 邻域人口全表 / `solve.py` 模拟退火求解 / `finalize.py` 取证与配方生成 / `build_palette.py` 配方复算 + 判尺自检 / `validate.ts` 引擎复算 / `write_preset.py` 落库 + README 跑法），换图或改配色可整套重跑并复算审计。

## v3.9 奥特曼逐像素取证重绘（2026-10-20，1 套）

起因：用户的硬要求是**所有颜色必须从提供的图中产生而来，不能自己想象**——两张参考图（`C:\Users\辰辰洋洋\Pictures\奥特曼\` 下的 `2.jpg` 奥特战士站在森林里 / `images.jpg`「奥特曼图鉴」海报）。上一版是按印象配的（`primary #CF292E` / `secondary #FFAD00` / `borderActive #8EA2FF`），其中 `secondary #FFAD00` 在两张图里**一个像素都没有**。

**判尺（三条）**：

- **直采**——色值必须等于参考图某张图的某个像素。26 个直采色位全部带坐标与 5×5 邻域极差（43–255）；`prototypes/ultraman-extraction/build_palette.py` 按坐标**重读像素**再与出货值逐位比对。
- **阶梯**——8 个表面槽是画布 `#000600`（2.jpg (12,224)，44 px）染海报标题靛 `#2D2C8A`（images.jpg (256,25)，11 px）的明度阶，每档 α 由目标 L\* 反解，步长 ΔL\* 1.41–1.91（house 要求 ≥1.4）。
- **混色**——4 个 diff 底是直采的 `diffAdded` / `diffRemoved` 按 α=0.13 / 0.20 染在画布上。

**结果：品牌重切成奥特曼的两个声部——红冠 + 金眼。** primary 战甲受光正红 `#D52518`（2.jpg (199,249) 胸腹甲片）× secondary 角色立绘金瞳的边缘高光 `#EFCB5D`（images.jpg (317,214)），色相差 **41.1° 类比**（红金同族）；焦点环让给战甲肩后的天空 `#87C3F5`（2.jpg (145,118)）——界面里最醒目的一个点是天空，不是按钮；warning 取金色头冠的暗面 `#BD8E36`（images.jpg (139,457)，与 secondary 同一束金的暗面），error 取战甲受光朱红 `#F05F4E`（2.jpg (266,216)）。四支暖色排成「淡金→古金→朱红→正红」的亮度阶梯。场域从通用深空靛换成海报里最黑的那格 `#000600` 染出来的 7 档阶。

**关键取舍与被自己推翻的地方**：

- **画布不是「深空蓝」而是海报里的黑**：#000600 在 2.jpg 有 44 个真实像素；旧的 #0A0E22 在两张图里都没有。
- **`secondary` 换位**：旧稿的 #FFAD00 是 0 像素的想象值；金瞳高光 #EFCB5D 与金冠暗面 #BD8E36 才是图里的两半。
- **`borderActive` 换族**：旧的 #8EA2FF（长春花蓝）虽是真实像素，但它是旧稿配的；v3 取的战甲灰 #6D7E88 与 `syntaxComment` 的 ΔE76 只有 2.9，是全 house 24 套里唯一的离群值（house 最小 11.7，无一套 <10），v4 改取天空 #87C3F5 后 ΔE76 = 35.2。
- **色盲四态**：宿主只消费 `secondary` 的地方是 8px 空闲圆点，四态（空闲/完成/告警/告急）必须互相分得开。旧稿 deutan/protan 最小 ΔE76 只有 7.0（house 中位 9.8）；v4 把金瞳换成更亮的 #EFCB5D 之后到 **normal 23.5 / deutan 18.6 / protan 14.5**，进入 house 前四分位（最好 18.3）。

**审计**：house 硬性 38 对 4.5:1 违例 **0**（最紧 `contrastText(primary)@primary` 4.65）、UI 15 对 3:1 违例 **0**（最紧 `primary@backgroundPanel` 3.39）；设计告警 0（角色同值碰撞 0、markdown 同值 0、品牌几何 41.1° 类比、语法核心最小 ΔE76 40.0、comment 4.72 / operator 4.75 退到核心最低 5.02 之下）。仓库自身判尺 `scripts/audit-themes.ts` 实跑 baseline 里 ultraman 行 = `| ultraman | ip | 0 | 0 | 8 | 8 | — |`。引擎 `ensureDiffContrast` 对本套 37 槽 **no-op**——台账值＝出货值。

**已知缺口（备案）**：① **JPEG 参考图里没有平坦像素**——26 个直采色全部是边缘过渡色（5×5 极差 43–255），找过「极差 ≤70 的平坦天蓝」候选 0 个。所以「等于原图某像素」保证的是**没有一个标志性颜色是想象出来的**，不是「取到了大块实色」，这条限制在 surface 梯子上是美德（每步 ΔL\* ≥ 1.41 过 house 门），在语义色上是化妆；② 每个直采色在原 JPEG 里通常只出现 1 次，像素级取色对解码器敏感（±1），台账同时给出每个取样点的邻域极差供判断；③ **primary 同时是宿主的文字色角色**（`--dsw-alias-state-business-primary` 在 app.asar 里作 `color:` 用了约 15 处，12–14px），在 12% / 20% 自染底与页面底上只有 3.55–4.00:1——数学上与「按钮配白字 ≥4.5」互斥（需 L≥0.19 且 L≤0.16），house 24 套里 6 套暗色红主题同病（3.36–3.85:1），本套比它们好，记为已知限制而非缺陷。

**配套物**：`prototypes/ultraman-theme-preview.html`（自包含，含 2 张参考图缩略图 + 26 张逐像素证据缩略图 + 37 行取色台账 + 「色位 → DSH 落点」表 + house 判尺原样 53 对实算复核 + 色觉可分性三卡 + 应用窗口 mockup）；取色与自检管线 `prototypes/ultraman-extraction/`（`build_palette.py` / `palette.json` / `provenance.json` / `checks.json` / `report.txt` / `README.md`）。
