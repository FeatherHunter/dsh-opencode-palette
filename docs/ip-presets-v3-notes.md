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

**胶囊形态**：`genshin`（原神，light）与 `genshin-night`（原神 · 夜航，dark）两条并列出现在自定义胶囊区，id / name / appearance 三者各自独立，点哪条就把宿主外观拉到那种并显示对应色板——因为自定义主题一条只有一套色（`renderCustomTheme` 把同一套 37 色灌进明暗两半，`appearance` 只决定按哪种外观显示），「明暗一体」在这套机制里只能靠两条各带 appearance 的胶囊实现。

**配套物**：`prototypes/genshin-theme-preview.html`（自包含，含 5 张参考图 + 35 块原图裁切实证 + 37 色位取值与落点 + 逐条派生配方 + 仓库审计器实算的对比度复核）；可复跑的取色与复核管线在 `prototypes/genshin-extraction/`（`extract.py` 锚点取样 / `solver.ts` 约束求解，固定种子逐字节可复现 / `write_presets.py` 落盘 / `validate.ts` 独立复核门禁），跑法见该目录 README。

## v3.6 超级马里奥逐像素取色重绘（2026-10-20，明暗两套）

**起因**：上一版马里奥是「印象配色」——晴空蓝底 + 帽红 + 水管绿，凭的是对 IP 的记忆而不是任何一张素材。1-1 的天、砖块、山丘、帽红到底各是多少，没有一处指得回像素。取三张参考图（`C:\Users\辰辰洋洋\Pictures\超级马里奥\` 下的 1.png NES 标题画面 / 2.jpg 3D 手办 / 3.jpg 经典卡通）逐像素取样后整版重绘，明暗各一套。

**源图实测**：1.png 是严格 NES 色板，全图 51.4% 是天空 #5A96FF、10.3% 是砖橙 #CE4D08、标题字面浅沙 #FFBEB5（横幅内 39.6%）、勾线 #000000、山丘绿 #00AA00、灌木绿 #84D310、金币黄 #8C7100、小马里奥红 #DE2800；2.jpg 提供受光层次（帽红受光 #FD4E4B、背带受光 #4284DA、背带暗部 #173D7D、眼睛蓝 #529DF0、胡子和瞳孔黑 #1D100A）；3.jpg 提供高饱和原色（帽红 #C7280E、背带蓝 #0C4BAA、纽扣金 #F3CD24、鞋棕 #7E370B）。27 个源像素建台账，每个色位只允许三种来源：直采 / 明度阶梯 / 定比混色。

**明色「1-1 白昼」（`mario`，light）**：底色是 1.png 的天空 #5A96FF 混白 94% 的 #F5F9FF——界面不是屏幕，是 1-1 抬头那片天。8 个背景槽收进同一支天蓝只拉明度：inputBg #FAFCFF → codeBlockBg #F8FAFF → background #F5F9FF → sidebarBg #F2F7FF → backgroundPanel #EFF5FF → codeHeaderBg #EDF3FF → backgroundElement #EAF2FF → bubbleBg #E5EFFF。代码区不用深色卡：浅底主题的正确反差来自深墨 syntax，不来自换舞台。正文墨是 2.jpg 的胡子黑 #1D100A（17.58:1），markdownStrong 用 1.png 的勾线纯黑 #000000。

**暗色「1-2 夜行」（`mario-night`，dark）**：同一支天蓝压黑成夜空。background #060A12（压黑 93%）→ codeBlockBg #04060A → codeHeaderBg #05080E → inputBg #080E17 → sidebarBg #090F1A → backgroundPanel #0B121F → bubbleBg #0C1421 → backgroundElement #0E1829。文字换成浅沙 #FFBEB5 提亮到 #FFE2DE——夜里那块奶油砖自己在发光。霓虹色原样上桌：眼睛蓝 #529DF0 当函数、纽扣金 #F3CD24 当类型、NES 橙 #FF9A39 当数字、灌木绿 #84D310 当成功。

**组合**：primary 帽红 #C7280E（3.jpg 直采）× secondary 背带蓝 #0C4BAA（3.jpg 直采），HSL 夹角 152.4° 落进互补区。dark 侧 primary 改 NES 小马里奥红 #DE2800 压黑 12% 的 #C32300——深底上的红按钮要反白，亮红 #FD4E4B 配白字只有 2.98:1 过不了门槛，压深后 5.37:1；secondary 换 2.jpg 背带受光 #4284DA。

**取色的取舍**：NES 只有一支红族，25 个设计角色又必须两两不同值，于是帽红一支拉出四级（primary #C7280E / link #B6260E / keyword #A8240D / error #94210D），砖橙拉出两级（diffRemoved #AB4108 / markdownEmph #903809）；背景家族必须同族（色相孤岛 ≤60°），奶油砖因此不能当代码纸，改去做 markdownEmph 与 dark 的暖边框。删除行用砖橙而不是报错红——删掉的砖块本来就是碎的。

**审计**：硬性 38 对 4.5:1 违例 0（明色最紧 info@backgroundPanel 4.59:1、syntaxComment@codeBlockBg 4.51:1、正文 text@background 17.58:1；暗色最紧 diffRemoved@diffRemovedBg 4.67:1、正文 text@background 16.21:1）；UI 15 对 3:1 违例 0（明色最紧 borderActive@backgroundElement 3.69:1，暗色最紧 primary@backgroundPanel 3.18:1）；设计告警 0（25 角色两两不同值 / 0 色相孤岛 / 0 markdown 同值 / 品牌几何落进互补区 / 语法核心最小 ΔE76 明色 13.2、暗色 37.3，门槛 10 / comment 与 operator 退到核心最低对比之下）。**余量提示**：最紧的几处（3.18 / 4.51 / ΔE 13.2）贴着门槛，改色时须重跑 `npm run audit:themes` 复核。

**胶囊形态**：`mario`（超级马里奥，light）与 `mario-night`（超级马里奥 · 夜行，dark）两条并列出现在自定义胶囊区，id / name / appearance 三者各自独立——自定义主题一条只有一套色，「明暗一体」在这套机制里只能靠两条各带 appearance 的胶囊实现（同原神的两条）。

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
