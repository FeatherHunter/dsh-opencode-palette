# one-piece-extraction — 海贼王「正午·海风」逐像素取色管线

三张参考图：`C:\Users\辰辰洋洋\Pictures\海贼王\` 下的 `images.jpg`（草帽路飞）/ `2.jpg`（ONE PIECE 标志）/ `3.jpg`（草帽团全员）。

**判尺：每个颜色只允许一种来源——定比混色。** 23 个锚点全部是图上真实像素（矩形区域 + 色相窗口筛像素后取中位/饱和极值/明度极值），
37 个颜色无一例外，全部是锚点的固定比例线性混合，0 想象。比例与出处逐条记在 `palette.json` 的 `provenance` 里。

## 跑法（Windows，仓库根目录）

```powershell
$py = "<bundled python>"
& $py prototypes/one-piece-extraction/extract.py      # ① 簇普查 → clusters.json
& $py prototypes/one-piece-extraction/pick.py         # ② 锚点取色 → anchors.json
& $py prototypes/one-piece-extraction/design.py       # ③ 配方求解 + 判尺复核 → palette.json
& $py prototypes/one-piece-extraction/redteam.py      # ④ 对抗式自查
& $py prototypes/one-piece-extraction/preview.py      # ⑤ 生成 prototypes/one-piece-theme-preview.html
& $py prototypes/one-piece-extraction/apply.py        # ⑥ 落盘 src/custom-presets/one-piece.json
```

依赖：Python 3.11+、Pillow、numpy（仓库自带运行时已含）。①–③ 只读参考图，⑥ 只写 `src/custom-presets/one-piece.json`。

## 关键产物

- `palette.json` — 37 个颜色终值 + 锚点表 + 每个颜色的配方与出处 + 53 条对比度实测
- `anchors.json` / `clusters.json` — 锚点像素台账 / 全图色彩普查

## 复核

```powershell
node scripts/audit-themes.ts --check   # 硬性 38 对 4.5:1 + UI 15 对 3:1 + 设计规范
```

设计评审记录见 `prototypes/one-piece-adversarial-review.md`。
