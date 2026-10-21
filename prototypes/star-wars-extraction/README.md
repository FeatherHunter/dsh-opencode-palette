# 星球大战主题 · 逐像素取色管线

从三张参考图重新推导 `src/custom-presets/star-wars.json` 的 37 个颜色，并生成预览页。

**源图**（不入库，需本机存在）：`C:\Users\辰辰洋洋\Pictures\星球大战\`
`1.jpg` 天行者崛起（The Force Awakens, 2015）· `2.jpg` 天行者的崛起（The Rise of Skywalker, 2019）· `3.jpg` 最后的绝地武士（The Last Jedi, 2017）

**判尺**：每个颜色只允许四种来源，第五种直接判负——

1. **直采**：hex 与参考图某个像素完全一致（`secondary` #30B4EC 蓝剑剑心、`success` #6EC3AE 绿剑辉光、`markdownEmph` #D17380 落日玫瑰、`markdownHeading` #FCE39F 字标辉光、`syntaxKeyword` #CBA8EC 星云紫等 19 个颜色）
2. **明度阶**：采样色的明度台阶（8 个背景槽是 #160C1C 的明度阶，`primary` 是 #AA1921 的 L46 阶）
3. **彩度阶**：锚点色相不变、只改彩度与明度（8 个背景槽同时走 S 45%→20% 的彩度台阶，抬亮时不跑成紫罗兰）
4. **混色**：两个采样色的固定比例（`textMuted` = 长春花蓝 × 星尘白 14%，`syntaxType` = 锈橙 × 星尘白 25%）

## 跑法

```powershell
$py = 'C:\Users\辰辰洋洋\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe'
$node = 'C:\Users\辰辰洋洋\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'

& $py .\extract.py       # 全图 k-means 主色 + 高饱和/亮部/暗部分组 → extracted.json
& $py .\census.py        # 按色相扇区做材质普查（含绿色专项）→ 控制台
& $py .\build_palette.py # 37 个颜色推导 + 判据自检 → palette.json / report.txt
& $py .\ratio.py         # 配比审计：按 map-dsh.ts 的 DSH 变量数算红蓝权重 → ratio.json
& $py .\gen.py           # 生成 ../star-wars-theme-preview.html
& $node .\validate.ts    # 用仓库引擎复算 38 硬对 + 15 UI 对 + IP 设计规范
& $py .\write_preset.py  # 写 src/custom-presets/star-wars.json（单行 JSON / 字母序 / 无尾换行）
```

`palette.json` 是**结论**（37 个颜色终值 + 每个颜色的锚点与推导方式），
`ratio.json` 是**配比结论**（红刃 51.9% / 蓝刃 48.1%），
`gen.py` / `write_preset.py` / `validate.ts` 都读前者；
预览页的「取色溯源」段把海报缩略图与**原图实拍裁切**（取色现场）内联进去，
「配比审计」段把红蓝两边的岗位与权重摆出来。

## 复核

```powershell
node scripts/audit-themes.ts --check     # star-wars 硬对/UI 对 0 违例
npm test
```

## 设计要点：两刃对分

- **两把光剑是海报唯一的两个主角**，界面必须红蓝等重。按引擎里的真实着色面积排：
  红刃拿下最大的一块（主按钮 / 品牌字 / 激活导航 / 业务态 / 危险态 / 删除行 / 强调），
  蓝刃拿下整套冷色岗位（次级色 / 提示按钮 / 链接 / 焦点环 / 次级文字 / 引用 / 函数名 / 关键字）。
  配比用 `ratio.py` 客观核算（权重＝该颜色在 `map-dsh.ts` 里驱动的 DSH 变量数，填充类 ×2）：
  **红刃 28 / 蓝刃 28 → 51.9% : 48.1%**。
- **底色必须是两刃的交点**：红刃 356.6° 与蓝刃 197.9° 的中点是紫 275.8°，
  所以八个背景槽是近黑的紫（基准 275.0°，偏差 ≤4°）。底色一旦偏向某一边，那一边就会"吞掉"另一边的存在感——
  v3.3 用饱和靛蓝底时，红刃看着就像只做危险提示。
- **金退位**：金色在海报里是 logo，是字不是色块，所以它只出现在标题与数字两席，主按钮让给红刃。
  绿剑素材全场只占 1.1%，也只作注脚。
- **error 用亮刃配深刃品牌**（#EB3D48 / #CD1E28）：同族不同值不同岗，亮红永远比品牌红刺眼。
- **退后梯队**：comment 4.86 / operator 4.52，低于五个核心语法色的最低 7.98；核心两两 ΔE76 最小 25.4（门槛 10）。

## 已知缺口

三张海报的绿相像素合计约 1.1%（且几乎都是过曝的薄荷色），所以 `success` / `diffAdded` /
`syntaxString` 只能共用"全息薄荷"一族的三个明度台阶——这是素材客观边界，没有"想象一个绿"。
