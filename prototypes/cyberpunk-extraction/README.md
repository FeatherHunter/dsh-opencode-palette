# cyberpunk-extraction — 赛博朋克 2077「黄噪与黑皮」逐像素取色管线

五张参考图：`C:\Users\辰辰洋洋\Pictures\赛博朋克2077\` 下的 `1.jpg` V 持枪 / `2.jpg` 霓虹粉墙 / `3.jpg` V 全幅黄场 / `4.jpg` Phantom Liberty 热红场 / `5.jpg` V 与 Johnny。环境变量 `CYBERPUNK_IMAGES` 可覆盖目录。

**判尺：每个色位只允许一种来源，三选一，没有第四种——**

- **直采**（28 槽）：色值 = 图里的**一个真实像素**（不是「接近」，是完全同值）
- **阶梯**（6 槽）：某个真实像素的**同色相明度阶**（色相/饱和不变）
- **混色**（3 槽）：两个**真实像素**的配比

台账 `anchors.json` 的 40 张来源裁切逐像素核验：**40/40 框内含完全同值像素**；28 个直采槽的锚点 = 自身色值；9 个阶梯/混色槽的父色全部字面。**0 想象。**

## 跑法（Windows，仓库根目录）

```powershell
$py = "<bundled python>"
& $py prototypes/cyberpunk-extraction/extract.py   # ① 色彩普查  → clusters.json
& $py prototypes/cyberpunk-extraction/design.py    # ② 配色 + 判尺 + 语料约束搜索 → palette.json
& $py prototypes/cyberpunk-extraction/pick.py      # ③ 字面像素台账（锚定 palette.json）→ anchors.json
& $py prototypes/cyberpunk-extraction/redteam.py   # ④ 对抗式自查
& $py prototypes/cyberpunk-extraction/preview.py   # ⑤ 生成 prototypes/cyberpunk-theme-preview.html
& $py prototypes/cyberpunk-extraction/apply.py     # ⑥ 落盘 src/custom-presets/cyberpunk-2077.json
```

依赖：Python 3.11+、Pillow、numpy、scikit-learn（仓库自带运行时已含）。①–⑤ 只读参考图，⑥ 只写 `src/custom-presets/cyberpunk-2077.json`。

## 关键产物

- `palette.json` — 37 色位终值 + 规则 + 父色 + 出处 + 判尺复算结果
- `anchors.json` — 每个色位的字面像素台账（坐标、裁切 base64、框内命中数）
- `palette.json` 是 ② 的产物，也是 ③ 的锚定对象——所以「搜出来的色」与「贴出来的像素」永远是同一个值
- `clusters.json` — 五图色彩普查（14 个色相族的簇心与占比）

## ③ 里的「语料约束搜索」

某几个色位不是「先定好再凑」，而是**反过来由语料决定**：

- `syntaxType` / `syntaxOperator`：在图内 16 万种颜色里搜出**既字面存在、又落在判尺允许的对比度带内、又与其余角色 ΔE76 ≥ 10** 的那一个；
- `markdownEmph`：搜出**比正文亮、且与每个 markdown 角色都拉开**的暖色像素（初稿的肤色 `#C59459` 只有 6.92:1，低于次要文字 8.84:1，是「强调」角色比说明文字还安静的层级倒置，复核后换掉）。

## 复核

```powershell
node scripts/audit-themes.ts --check   # 硬性 38 对 4.5:1 + UI 15 对 3:1 + 设计规范
```

当前状态：`cyberpunk-2077` 硬性 0 / UI 0 / 设计告警 0 待处理 / tokenParity 0 失配。

设计评审与对抗式审查记录见 `prototypes/cyberpunk-adversarial-review.md`。
