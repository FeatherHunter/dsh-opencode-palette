# Hello Kitty 主题 · 逐像素取色管线

从 6 张参考图重新推导 `src/custom-presets/hello-kitty.json` 的 37 个颜色，并生成预览页。

**源图**（不入库，需本机存在）：`C:\Users\辰辰洋洋\Pictures\HelloKitty\`
`01-hello-kitty-classic-red-bow-art.png` 经典海报（白猫 / 粉墙 / 红蝴蝶结 / 奶黄小熊）·
`2.png` 1974 官方形（红苹果**带绿叶** / 蓝背带裤 / 奶瓶）· `3.jpg` 背带裤造型（深蓝背带裤 / 黄色围兜）·
`4.jpg` 绒布玩偶（影棚粉墙 / 深玫红蝴蝶结）· `5.jpg` 手绘线稿（粉蝴蝶结 / 奶油色小熊）· `6.jpg` 彩纸碎片（天空青 / 星星蓝 / 柠檬黄）

**判尺**：每个颜色只允许两种来源，第三种直接判负——

1. **直采**：hex 与参考图某个像素完全一致（`primary` #C8152D 蝴蝶结最深处、`secondary` #0E52A5 背带裤深蓝、
   `success` 的源色 #14AE67 苹果叶、`text` #231815 暖墨勾线、`markdownStrong` #000000 纯黑描边等 **20 个颜色**）
2. **混色**：**两枚直采色**按固定比例混合，公式随值公开（`success` = #231815 暖墨 45% 压 #14AE67 苹果叶、
   `warning` = #231815 暖墨 50% 压 #FFCB05 鼻子黄、`syntaxType` = #0E52A5 背带裤蓝 70% 压 #231815 暖墨等 **17 个颜色**）

不允许第三种来源：没有"想象一个绿"。全库唯一的绿是图 2 苹果叶那 131 个像素
（`#14AE67`，纸白上仅 2.92:1），所以成功色、新增色、字符串色是它的三个明度台阶。

## 跑法

```powershell
$py = 'C:\Users\辰辰洋洋\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe'
$node = 'C:\Users\辰辰洋洋\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'

& $py .\extract.py        # 6 图逐像素直方图 → corpus.json（97,120 个精确色）
& $py .\design.py         # 37 个颜色推导 + 判据自检 → palette.json / report.txt
& $py .\build_preview.py  # 生成 ../hello-kitty-theme-preview.html（参考图 base64 内联，自包含）
& $py .\write_preset.py   # 写 src/custom-presets/hello-kitty.json（单行 JSON / 字母序 / 无尾换行）
& $node .\validate.ts     # 用仓库引擎复算 38 硬对 + 15 UI 对
```

`corpus.json` 是**素材事实**（每个精确色出现在哪些图、多少像素、占比），
`palette.json` 是**结论**（37 个颜色终值 + 每个颜色的锚点与推导方式 + 判据自检结果），
`audit_sim.py` 是判尺的本地复刻（与 `scripts/audit-themes.ts` 同口径，用于设计期快速迭代），
`design.py` / `build_preview.py` / `write_preset.py` / `validate.ts` 都读前两者。

## 复核

```powershell
node scripts/audit-themes.ts --check     # 全仓 59 套：硬对 0 / UI 0 违例
npm test                                  # 283 passed
```

## 设计要点：草莓牛奶

- **让角色本人当配色方案**，不另造「主题色」：白脸→纸面、粉墙→侧栏、蝴蝶结→主色、
  背带裤→链接、苹果叶→成功、鼻子→警告、小熊棕→行内代码。
- **底色必须是白脸**：画布取 Kitty 的白（全局 29.68% 的像素），粉只出现在侧栏（#EEA9BC 玫瑰粉墙）、
  面板（#FBE6EF 淡粉纱）与气泡（#EE86A7 主视觉粉）——内容区要安静，粉是墙不是底。
- **一个心跳**：全场只让 #C8152D 一个高饱和色反复出现（主按钮 / 焦点环 / 标题 / 关键字），
  且取蝴蝶结的**最深处**而不是最亮的 #E9464D——后者纸白上只有 3.92:1，撑不起按钮白字。
- **三级台阶靠明度不靠边框**：纸白 → 淡粉纱 → 浮层粉（1.19:1 / 1.44:1），发丝细线只给 1.71:1。
- **语义不合并**：仓库判尺把「两个角色取同一 hex」记为角色碰撞（语义被抹平），所以除仓库 v3
  已记档的 `primary = borderActive`（红即品牌即焦点）外，其余角色一律各用各的色：
  标题 / 关键字 / 删除 / 错误是四个不同深度的红，37 槽位用了 32 种色。

## 已知缺口

- **原图没有达标绿与达标黄**：唯一绿 #14AE67 只有 2.92:1、唯一亮黄 #FFCB05 只有 1.51:1，
  直接用在小字上不合格。方案不回避，按公开公式压深到 6.59:1 与 4.55:1。
- **图 1 / 图 2 底部是黑色字幕条**（海报排版，不是角色画面），预览页的缩略图已裁掉；
  取色仍按原图全量统计，字幕条里的黑色与纯白都在色库中。
- **提示气泡（tooltip）标签色由 DSH 宿主写死为白色**，浅色主题下对比只有 1.07:1 —— 37 个颜色修不到这一点。
