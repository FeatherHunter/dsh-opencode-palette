# 宝可梦主题 · 逐像素取色管线

从四张参考图重新推导 `src/custom-presets/pokemon.json` 的 37 个颜色，并生成预览页。

**源图**（不入库，需本机存在）：`C:\Users\辰辰洋洋\Pictures\宝可梦\`
`01-pikachu-official-pokedex-art.png` 官方图鉴立绘 · `2.jpg` wikiHow 平涂 · `3.jpg` 30 周年 · `4.jpg` 合志插画

**判尺（迄今最严）**：每个颜色只允许一种来源——

1. **直采**：hex 与参考图某个像素**完全一致**。本套 37 个颜色全部走这条路，
   由脚本回四张原图逐位复核命中像素数并记进 `proof.json`，命中为 0 即判负。
   0 阶梯 / 0 混色 / 0 想象——比哈利波特（15 直采 / 8 阶梯 / 19 混色）与
   美少女战士（8 直采 / 10 阶梯 / 19 混色）都严一档。

## 跑法

```powershell
$py = 'C:\Users\辰辰洋洋\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe'
$node = 'C:\Users\辰辰洋洋\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'

& $py .\extract.py        # 四图全量精确像素直方图 → histogram.json（唯一取色供应单）
& $py .\census.py         # 按色相族做明度阶梯普查 → ladders.json（找可用台阶用）
& $py .\build_palette.py  # 37 个颜色终值 + 取色自检（像素存在性 + 判尺）→ palette.json
& $node .\validate.ts     # 用仓库引擎（resolve.ts / map-dsh.ts）复算 38 硬对 + 15 UI 对 + IP 设计规范
& $py .\write_preset.py   # 写 src/custom-presets/pokemon.json（单行 JSON / 字母序 / 无尾换行）
```

`palette.json` 是**结论**（37 个颜色终值 + 每个颜色的中文出处说明）；
`build_palette.py` / `validate.ts` / `write_preset.py` 都读它；
预览页的「像素取证」段用 canvas 实时扫原图，把当前颜色命中的像素高亮出来。

## 复核

```powershell
node scripts/audit-themes.ts        # pokemon 硬对 0 + UI 0
node prototypes/pokemon-extraction/validate.ts
npm test
```

## 设计要点

- **图鉴卡的暗场**：四张图里只有 01 号官方图鉴立绘有黑白结构，场域全部收进它的冷调明度阶梯
  （基准色相 240.0°，0 个色相孤岛）：codeBlockBg `#000000`（最深，做对战舞台）→ sidebarBg `#060606`
  → inputBg `#0C0C10` → background `#1C1C22` → bubbleBg `#28282D` → backgroundPanel `#37373B`
  → backgroundElement `#40404A` → codeHeaderBg `#48484D`。
- **冷场暖字**：底是卡面的冷调蓝黑；暖意只由徽章金与御三家承担。
- **黄只做「牌」不做「底」**：primary = 图鉴卡编号徽章黄 `#FFCB05`，只作填充色——
  引擎按 `contrastText(primary)` 派生前景 `#141414`（12.10:1）。徽章黄在暗底上当文字只有 1.4:1。
- **互补几何**：primary 金 H47.5° × secondary 蓝（2.jpg wikiHow 蓝底）H223.8° = 176.2° 互补。
- **语义色来自御三家**（4.jpg 一图交齐）：success 妙蛙种子绿 `#7AA85D`、warning 小火龙橙 `#FB8603`、
  error 精灵球红 `#F93D32`、info 杰尼龟蓝 `#289BCA`。
- **反差来自深墨 syntax，不是深色卡**：代码舞台是全场最深的纯黑，七个语法色取自图里的原生墨；
  comment 5.72 / operator 4.92 退到核心语法最低 5.86 之下。
- **v3 的 6 组并岗全部拆开**：25 个设计角色无一取同值，`docs/theme-audit/exceptions.json`
  里的 pokemon 记档条目随之删除。

## 已知缺口

- 三支色在素材里只以抗锯齿细边存在——diffRemoved `#FE4C1C` 只有 16 px（2.jpg 脸颊红边）、
  markdownBlockQuote `#BDBDC3` 18 px、syntaxKeyword `#C790A3` 18 px。它们确实存在于原图，
  但密度极低；这是「直采到底」的代价，备案而不伪装成大面积取色。
- 提示气泡文字色由宿主写死为白色；链接悬浮预览卡被写死 `#2C2C2E`（暗色主题下恰好不违和，
  但那是巧合不是修复）；右键菜单保持毛玻璃白（插件故意不接管 `--dsw-specific-menu`）。
  这三点 37 个颜色修不到。
