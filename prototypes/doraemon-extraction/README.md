# doraemon-extraction — 哆啦A梦「晴空·铃与线」逐像素取色管线

六张参考图：`C:\Users\辰辰洋洋\Pictures\哆啦A梦\` 下的 `1.png`（全身立绘）/ `2.jpg`（漫画封面）/ `3.png`（黄场字标）/ `4.jpg`（暗场海报）/ `5.jpg`（近景特写）/ `6.jpg`（合影）。

**判尺：每个色位只允许三种来源，第四种直接判负——① 直采**（hex 与参考图某个像素完全一致；PNG 精确匹配、JPEG ±3 容差，脚本回原图逐像素复核命中数，命中为 0 即判负）、**② 阶梯**（同一色相的明度台阶，比例写进台账）、**③ 定比混色**（两个锚点按固定比例线性混合，比例写进台账）。本套 **18 个源色、2 槽直采 + 35 槽定比混色，0 想象**；每个源色还必须**至少喂一个色位**，只登记不落位的锚点一律裁掉。

除仓库判尺（`docs/theme-audit/criteria.md`）外，本管线另加 **47 条对抗式加固判据**：品牌/语义色按 11–13px 正文口径在 8 个表面各算一遍、语义色在自己染的 12%/14% 底上算一遍、宿主写死 `#fff` 的填充位算一遍，以及宿主 8px 状态圆点四态在 normal / deutan / protan 三种视觉下的 ΔE76 可分性。

## 跑法（Windows，仓库根目录）

```powershell
$py = "<bundled python>"
& $py prototypes/doraemon-extraction/census.py     # ① 六图逐像素色簇普查 → census.json
& $py prototypes/doraemon-extraction/derive.py     # ② 配方求解 + 判尺复算 → palette.json（退出码 0 = 全绿）
& $py prototypes/doraemon-extraction/preview.py    # ③ 生成 prototypes/doraemon-theme-preview.html
& $py prototypes/doraemon-extraction/apply.py      # ④ 落盘 src/custom-presets/doraemon.json
```

依赖：Python 3.11+、Pillow（仓库自带运行时已含）。①–③ 只读参考图，④ 只写 `src/custom-presets/doraemon.json`。
参考图目录可用环境变量 `DORAEMON_REF` 覆盖（默认即上面那条路径）。

## 关键产物

- `palette.json` — 37 色位终值 + 18 条源色台账（出处 / 命中像素数 / 容差）+ 每个色位的配方（锚点 + 比例）+ 全部对比度实测
- `census.json` — 六张图的色簇普查（命中像素数 / 包围盒 / 色相 / 彩度 / CIE L\*），用来区分「成片地面色」与「抗锯齿薄样本」

## 复核

```powershell
node scripts/audit-themes.ts --check   # 硬性 38 对 4.5:1 + UI 15 对 3:1 + 设计规范
```

`derive.py` 跑完的退出码即门禁：40 条硬对 + 15 条 UI 对 + 47 条加固判据全绿、设计告警 0 条时退出码为 0。（管线自算的 40 条硬对 = 仓库判尺 38 条 + 两条 diff 底上的正文对，比仓库判尺更严；仓库判尺的最紧一对是 markdownBlockQuote@backgroundPanel 4.78:1，UI 最紧一对是 secondary@backgroundPanel 3.18:1。）

设计评审记录见 `prototypes/doraemon-adversarial-review.md`；设计定版说明见 `docs/ip-presets-v3-notes.md` 的「v3.6 哆啦A梦逐像素取色重绘」段。
