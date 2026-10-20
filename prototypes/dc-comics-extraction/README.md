# dc-comics-extraction — DC「夜·标·纸」逐像素取色管线

三张参考图：`C:\Users\辰辰洋洋\Pictures\DC\` 下的 `1.jpg`（群像海报：超人/蝙蝠侠/闪电侠/神奇女侠/钢仔/绿灯侠）/ `2.jpg`（DC 徽章圆盘）/ `3.jpg`（THE DC ENCYCLOPEDIA 百科封面）。

**判尺：每个色位只允许一种来源——直采。** hex 必须是三张图里的真实像素；「像不像」「好不好看」一律不作数。本套 **37 个色位落在 36 个不同色值上，全部是真实像素，0 想象**（#0A0F12 同时用在 `sidebarBg` 与 `diffAddedLineNumberBg`）。

**出处怎么算才诚实**：三张图都是连续渐变的绘画，某个 hex 的*精确*像素常常只有个位数（#07111D 全图 7 px、#717F8A 精确 1 px）——按精确命中判「想象色」会误杀真材质。本管线用 **tonal mass**（ΔE76 ≤ 6 邻域像素数）当材质真伪的判据：≥300 视作真实材质、60–300 视作渐变取样、<60 视作薄。当前台账：**mass ≥ 1000 的 30 个、300–1000 的 4 个、<300 的 2 个**（#8BB551 259 / #89BF81 134，都是角色用色的自然结果）。

除仓库判尺（`docs/theme-audit/criteria.md`）外，本管线另加两条针对 DC 这套素材的加固判据：

1. **引擎不改写判据**——`src/engine/resolve.ts:221` 的 `ensureDiffContrast` 只要发现 diffFg 对任一 diffBg < 4.5，就整组四色重写，作者色被覆盖。本管线把两个 diff 组的**作者值本身**算到 ≥4.5，故引擎 **no-op**（7.42/8.10、5.56/6.10）。
2. **焦点环双达标判据**——`borderActive` 既要对浅填充（primary ≥3:1，WCAG 2.2 SC 2.4.13）又要对深浮层（≥4.5）。同一族青做不到，焦点环必须浅（#D6F0FF：填充 4.33 / 浮层 10.51）。

## 跑法（Windows，仓库根目录）

```powershell
$py = "<bundled python>"
& $py prototypes/dc-comics-extraction/verify.py      # ① 37 色位台账 + 38 硬对 + 15 UI 对 + W1..W5 → palette.json
& $py prototypes/dc-comics-extraction/provenance.py  # ② 逐色位回原图取证 → provenance.json + provenance-sheet.png
& $py prototypes/dc-comics-extraction/apply.py       # ③ 落盘 src/custom-presets/dc-comics.json
```

依赖：Python 3.11+、Pillow、NumPy。①–② 只读参考图，③ 只写 `src/custom-presets/dc-comics.json`。
参考图目录可用环境变量 `DC_REF` 覆盖（默认即上面那条路径）。① 全量像素扫描较慢（三张图逐像素统计 + 37 个色位的邻域统计），约 1–3 分钟。

## 关键产物

- `palette.json` — 37 色位台账：hex / 出处描述 / 精确像素数 / tonal mass / 分图命中 / 相对亮度 Y / CIE L\* / 色相 / 彩度，外加 `fails` 与 `warns` 两张空表
- `provenance.json` — 每个色位在原图里的**最密邻域坐标**（文件 / x / y / 命中数）
- `provenance-sheet.png` — 37 格裁切拼版，用来**目视复核**「这块像素到底像什么」

## 复核

```powershell
node scripts/audit-themes.ts --check   # 硬性 38 对 4.5:1 + UI 15 对 3:1 + 设计规范
```

`verify.py` 的退出码即门禁：38 条硬对 + 15 条 UI 对 + W1..W5 全绿时硬违例 0、设计告警 0（当前 **HARD FAILS 0 / DESIGN WARNS 0**；仓库判尺的最紧一对是 `contrastText(primary)`@`primary` 4.65:1，UI 最紧一对是 `primary`@`backgroundPanel` 3.18:1）。

设计评审记录见 `prototypes/dc-comics-adversarial-review.md`；设计定版说明见 `docs/ip-presets-v3-notes.md` 的「v3.7 DC 逐像素取色重绘」段；可视化预览见 `prototypes/dc-comics-theme-preview.html`。
