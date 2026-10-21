# 变形金刚主题 · 逐像素取色管线

从五张参考图重新推导 `src/custom-presets/transformers.json` 的 37 个颜色，并生成评审预览页。

**源图**（不入库，需本机存在）：`C:\Users\辰辰洋洋\Pictures\变形金刚\`
`1.jpg` 大黄蜂白棚定妆 · `2.jpg` 擎天柱雾都 · `3.jpg` 擎天柱持剑山林 · `4.jpg` 电影海报三角色 · `5.jpg`《变形金刚 One》海报

**判尺**：每个颜色只允许三种来源，第四种直接判负——

1. **直采**：hex 与参考图某个像素簇中位色完全一致（`primary` #CD0924 擎天柱胸甲红、`borderActive` #FBC701 大黄蜂车漆黄、`markdownHeading` #EFD34C 海报日轮、`success` #5EBA90 翠绿 等 25 个颜色）；
2. **混色**：两个采样色的固定比例（`background` = 夜空 #08112C × 50% + 钢影 #0A0A0A × 50%、`secondary` = 电光蓝 #138FE7 × 60% + 晶体蓝 #134A9D × 40%）；
3. **叠透**：采样色按 alpha 叠在底色上（4 个 diff 背景槽）。

配方由 `build_palette.py` **逐条复算**：四舍五入后必须与终值逐位相同，否则判负（当前 0 条失败）。

## 跑法

```powershell
$py   = 'C:\Users\辰辰洋洋\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe'
$node = 'C:\Users\辰辰洋洋\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'

& $py   .\extract.py       # 五张图 median-cut + k-means + 15° 色相扇区普查 → extracted.json（含「取色现场」坐标）
& $py   .\solve.py         # 模拟退火求解 25 个设计岗位（在角色色相窗 + 硬对比度约束内最大化相邻岗位 ΔE76）→ _stage1.json
& $py   .\finalize.py      # 取证：直采的邻域人口 / 明度阶的阶证据 / 取色现场坐标 → sources.py（配方表，单一事实源）
& $py   .\build_palette.py # 37 个颜色推导 + 配方复算 + 判尺自检 → palette.json / report.txt
& $py   .\gen.py           # 生成 ../transformers-theme-preview.html
& $node .\validate.ts      # 用仓库引擎复算 38 硬对 + 15 UI 对 + IP 设计规范
& $py   .\write_preset.py  # 写 src/custom-presets/transformers.json（单行 JSON / 字母序 / 无尾换行）
```

`solve.py` 依赖 `model.py` 的候选窗口与硬约束，`finalize.py` 依赖 `model.py` 的邻域人口全表与 `sources.py` 的配方表——**改图或改配色时按上面的顺序整套重跑**，不要只跑后半段（`build_palette.py` 会逐位复算配方，与终值对不上直接判负）。

`palette.json` 是**结论**（37 个颜色终值 + 每个颜色的锚点、配方与设计意图），`gen.py` / `validate.ts` / `write_preset.py` 都读它；
预览页的「取色溯源」段把五张原图与**原图实拍裁切**（取色现场）内联进去。

## 复核

```powershell
node scripts/audit-themes.ts --check    # transformers 硬对 0 / UI 对 0 / 设计告警 0
npm test
```

## 设计要点

- **黄是光，红是心，蓝是夜台**：五张图里最具决定性的一帧是《变形金刚 One》海报——擎天柱的红挡在一轮巨大的黄太阳前。
  红只做品牌与危险的前排（primary / error / syntaxKeyword），黄只做焦点、标题与车漆（borderActive / markdownHeading / syntaxFunction），中间大片留给钢蓝夜。
- **深空靛单家族**：8 个背景槽是 `5.jpg` 夜幕簇（#040308 → #242B58）的明度阶梯，色相基准 223.3°，偏差 ≤10°；
  气泡槽刻意离开蓝家族取星云紫 #231033（Δ47°，仍在 60° 孤岛线内）——全界面唯一一处「不按套路」的表面。
- **品牌几何**：primary 351.7° × secondary 208.4° = **143.4° 三角**；黄作为第三角的光，不进几何，只进岗位。
- **黄分三级**：深漆金 #CB9410（函数）/ 车漆黄 #FBC701（焦点）/ 日轮淡金 #EFD34C（标题），三个岗位三级明度，互不撞衫。
- **删除行不用红**：用战损锈铜 #A28342（被击穿的旧装甲），新增行用草坡橄榄 #90947B（战场上重新长出的草）——两个 diff 前景色不与 error / success 抢岗位。
- **退后梯队**：comment 4.86 / operator 5.10，低于五个核心语法色的最低 5.70；核心两两 ΔE76 最小 24.8（门槛 10）。

## 已知边界

- 五张图里没有一处纯正的信号绿（海报上的绿只有苔白与远景草坡两处），所以 `success` 取翠绿 #5EBA90、`diffAdded` 取草坡橄榄 #90947B，
  两级明度分开承担「完成」与「新增」，没有"想象一个更漂亮的绿"。
- `5.jpg` 是竖版海报、其余四张是横版/方版，预览页的海报缩略图按固定高度 `object-fit:cover` 裁切，避免卡片高度参差。
