# 星球大战主题 · 逐像素取色管线

从三张参考图重新推导 `src/custom-presets/star-wars.json` 的 37 个色位，并生成预览页。

**源图**（不入库，需本机存在）：`C:\Users\辰辰洋洋\Pictures\星球大战\`
`1.jpg` 天行者崛起（The Force Awakens, 2015）· `2.jpg` 天行者的崛起（The Rise of Skywalker, 2019）· `3.jpg` 最后的绝地武士（The Last Jedi, 2017）

**判尺**：每个色位只允许三种来源，第四种直接判负——

1. **直采**：hex 与参考图某个像素完全一致（`primary` #FCE39F 字标辉光、`secondary` #30B4EC 蓝剑剑心、`success` #6EC3AE 绿剑辉光、`markdownEmph` #D17380 落日玫瑰、`syntaxKeyword` #CBA8EC 星云紫等 19 个色位）
2. **阶梯**：采样色的明度 / 彩度台阶（8 个背景槽是 #091031 的明度阶梯，`error` 是 #AA1921 的 L52 阶）
3. **混色**：两个采样色的固定比例（`textMuted` = 长春花蓝 × 星尘白 12%，`syntaxType` = 锈橙 × 星尘白 25%）

## 跑法

```powershell
$py = 'C:\Users\辰辰洋洋\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe'
$node = 'C:\Users\辰辰洋洋\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'

& $py .\extract.py       # 全图 k-means 主色 + 高饱和/亮部/暗部分组 → extracted.json
& $py .\census.py        # 按色相扇区做材质普查（含绿色专项）→ 控制台
& $py .\build_palette.py # 37 色位推导 + 判尺自检 → palette.json / report.txt
& $py .\gen.py           # 生成 ../star-wars-theme-preview.html
& $node .\validate.ts    # 用仓库引擎复算 38 硬对 + 15 UI 对 + IP 设计规范
& $py .\write_preset.py  # 写 src/custom-presets/star-wars.json（单行 JSON / 字母序 / 无尾换行）
```

`palette.json` 是**结论**（37 色位终值 + 每个色位的锚点与推导方式），
`gen.py` / `write_preset.py` / `validate.ts` 都读它；
预览页的「取色溯源」段把海报缩略图与**原图实拍裁切**（取色现场）内联进去。

## 复核

```powershell
node scripts/audit-themes.ts --check     # star-wars 硬对/UI 对 0 违例
npm test
```

## 设计要点

- **深空靛单家族**：8 个背景槽是 #091031 的明度阶梯（色相基准 229.6°，偏差 ≤10°，0 个色相孤岛）；
  后两槽（浮层 / 气泡）换成 2.jpg 海军蓝 #273554 的台阶，作为更冷的"实体物"层。
- **两把刃的互补对撞**：招牌金 #FCE39F（字标）× 光剑蓝 #30B4EC（剑心）= 154.0° 互补。
  金做主按钮（引擎按亮度选 #141414 作字，14.59:1），蓝走链接与交互。
- **三把刃各司其职**：红刃 = 危险（error / 删除行）、绿刃 = 正向（success / 新增行）、紫水晶 = 关键字。
  玫瑰只留给 markdown 强调，删除行用更沉的余晖红（ΔE76 45.7，不串戏）。
- **退后梯队**：comment 4.92 / operator 4.58，低于五个核心语法色的最低 8.09；
  核心两两 ΔE76 最小 25.4（门槛 10）。

## 已知缺口

三张海报的绿相像素合计约 1.1%（且几乎都是过曝的薄荷色），所以 `success` / `diffAdded` /
`syntaxString` 只能共用"全息薄荷"一族的三个明度台阶——这是素材客观边界，没有"想象一个绿"。
