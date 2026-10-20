# 超级马里奥主题 · 逐像素取色管线

从三张参考图重新推导 `src/custom-presets/mario.json`（浅色 1-1 白昼）与
`src/custom-presets/mario-night.json`（深色 1-2 夜行）各 37 个色位，并生成预览页。

**源图**（不入库，需本机存在）：`C:\Users\辰辰洋洋\Pictures\超级马里奥\`
`1.png` NES 标题画面 · `2.jpg` 3D 手办 · `3.jpg` 经典卡通

**判尺**：每个色位只允许三种来源，第四种直接判负——

1. **直采**：hex 与参考图某个像素完全一致（源像素台账 27 个，逐个标注出处与图中占比）
2. **阶梯**：采样色与白 / 黑的明度阶梯
3. **混色**：两个采样色的固定比例

再叠仓库自己的判尺（`docs/theme-audit/criteria.md`）：38 条硬性 4.5:1 + 15 条 UI 3:1 +
25 个设计角色两两不同值 + 8 个背景槽同色族（色相孤岛 ≤60°）+ 语法核心五角色 ΔE76 ≥ 10 +
comment / operator 必须退到核心最低对比之下 + 品牌几何落进类比 / 三角 / 互补之一。

## 跑法

```powershell
$py = 'C:\Users\辰辰洋洋\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe'
$node = 'C:\Users\辰辰洋洋\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
$env:DSH_NODE = $node

& $py .\extract.py       # 逐像素取样：主色 + 色相族普查 + 定点裁切 → extracted.json
& $py .\palette.py       # 源像素台账 + 混色配方 + 判尺自检 → palette.json
& $node .\validate.ts    # 用仓库引擎（resolve.ts / map-dsh.ts）独立复核 38 硬对 + 15 UI 对 + 设计规范
& $py .\write_preset.py  # 写两个 custom-presets JSON（单行 JSON / 字母序 / 无尾换行）
& $py .\gen_preview.py   # 生成 ../mario-theme-preview.html（自包含，内联三张参考图）
```

`extracted.json`（证据）与 `palette.json`（结论）都在库里，是上一次跑出来的快照；
换图后重跑 `extract.py` 起的四步即可重建。

## 复核

改完配色后按仓库流程走：

```powershell
node scripts/audit-themes.ts --check     # 退出码 0 才算过
npm test
```

`npm run audit:themes` 会重生成 `docs/theme-audit/baseline.json` / `baseline.md`（含马里奥两套的逐对实测）。

## 设计取舍

- **天蓝当「场」**：1.png 的天空 #5A96FF 占全图 51.4%，明暗两套的 8 个背景槽全部由它推出——
  浅色是它混白 84%~97% 的阶梯，深色是它压黑 84%~96% 的阶梯。背景家族必须同族（判尺硬规），
  所以奶油砖 #FFBEB5 不能当代码纸，改去做 markdownEmph 与深色边框的暖意。
- **NES 只有一支红族**：25 个设计角色又必须两两不同值，于是帽红拉出四级
  （primary #C7280E / link #B6260E / keyword #A8240D / error #94210D），砖橙拉出两级
  （diffRemoved #AB4108 / markdownEmph #903809）。
- **删除行用砖橙而不是报错红**：删掉的砖块本来就是碎的。
- **深色主色必须压深**：#FD4E4B 配白字只有 2.98:1，压到 #C32300 才过 4.5:1。

## 已知缺口

没有：三张图把马里奥世界该有的颜色都给了（天、砖、山丘、灌木、金币、帽红、背带蓝、鞋棕、肤色、纽扣金）。
唯一「想当然」的地方是深色那套的边框 #40302D——它由 1.png 的奶油砖压黑 75% 推出，
视觉上是夜里的砖缝，但素材里没有「夜里的砖」这张图，是按同一套阶梯逻辑外推的。
