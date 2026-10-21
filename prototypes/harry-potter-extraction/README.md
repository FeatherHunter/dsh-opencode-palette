# 哈利波特主题 · 逐像素取色管线

从四张参考图重新推导 `src/custom-presets/harry-potter.json` 的 37 个颜色，并生成预览页。

**源图**（不入库，需本机存在）：`C:\Users\辰辰洋洋\Pictures\哈利波特\`
`4.jpg` 海报 · `images.jpg` 冰窟 · `2.jpg` 肖像 · `3.jpg` 商品图

**判尺**：每个颜色只允许三种来源，第四种直接判负——

1. **直采**：hex 与参考图某个像素完全一致（15 个颜色，脚本回原图逐个复核「该色确实存在」）
2. **阶梯**：采样色的明度 / 彩度台阶
3. **混色**：两个采样色的固定比例

## 跑法

```powershell
$py = 'C:\Users\辰辰洋洋\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe'
$node = 'C:\Users\辰辰洋洋\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'

& $py .\extract.py       # 全图 k-means 主色 + 16x16 网格 → extracted.json
& $py .\census.py        # 按色相族做材质普查（gold/crimson/ice-cyan/…）→ census.json
& $py .\sample.py        # 逐个标志元素取 modal/vivid/mean → elements.json
& $py .\provenance.py    # 定位每色像素簇、裁原图、base64 内联 → provenance.json
& $py .\gen.py           # 生成 ../harry-potter-theme-preview.html
& $node .\validate.ts    # 用仓库引擎复算 38 硬对 + 15 UI 对 + IP 设计规范
& $py .\write_preset.py  # 写 src/custom-presets/harry-potter.json（单行 JSON / 字母序 / 无尾换行）
```

`palette.json` 是**结论**（37 个颜色终值），`gen.py` / `write_preset.py` / `validate.ts` 都读它；
`provenance.json` 是**证据**（每颜色的原图裁切与像素坐标），`gen.py` 把它内联进预览页。
两个 `write_preset.py` / `gen.py` 的输出是**确定性**的：同一份输入必然产出同一份
`src/custom-presets/harry-potter.json` 与同一份预览页（已用 sha256 对过）。

已入库的中间产物（`extracted.json` / `census.json` / `elements.json` / `provenance.json`）
是上一次跑出来的**快照**，仅供离线查阅与免源图重建预览页；重跑 `extract.py` 起的
四步即可重新生成。**源图不在仓库里**，换图必须先放到上面的源图目录。

## 复核

改完配色后按仓库流程走：

```powershell
node scripts/audit-themes.ts --check     # 退出码 0 才算过
npm test
```

## 已知缺口

四张参考图的绿相像素合计不足 0.1%——绿色素材客观缺位，所以 `success` #91BEAE
与 `diffAdded` #A9CCC0 只能共用「月色青」一族的两个明度台阶。这是全套唯一被素材
逼出来的地方，没有「想象一个绿」。
