# 原神主题 · 逐像素取色管线

从五张参考图重新推导 `src/custom-presets/genshin.json`（原神 · 纸感明信片，light）与
`src/custom-presets/genshin-night.json`（原神 · 夜航，dark）两个 IP 预置的 37 个色位，并生成预览页。

**源图**（不入库，需本机存在）：`C:\Users\辰辰洋洋\Pictures\原神\`
`1.jpg` 官方主视觉（、旅行者双立绘与「原神」题字）· `2.jpg` 派蒙（winking chibi 贴纸）·
`3.jpg` 可莉（KLEE 角色卡）· `4.jpg` 温迪（蒙德PV 画）· `5.jpg` 旅行者（PLAYER 键视觉）

## 判尺

配色来源只允许两种，第四种直接判负——

1. **直采**：该 hex 在参考图里成片出现，直接取像素质心（35 个锚点，见 `anchors.json`）
2. **定比混色**：两个锚点的固定比例线性混合（比例越高越靠近第二个）

除此之外，**判尺的权威是仓库自带的 `scripts/audit-themes.ts`**（判尺文字见 `docs/theme-audit/criteria.md`）：

- 38 条硬性对比对（正文/内容类 4.5:1）
- 15 条 UI 对（3:1）
- **25 个设计角色两两不同值**（除 8 背景槽与 4 diff 背景槽外，任意两角色取同一 hex 即告警）
- 语法核心五角色（keyword/function/type/number/string）两两 ΔE76 ≥ 10
- `syntaxComment` / `syntaxOperator` 必须退到全部核心角色对比度之下
- 品牌几何：`primary` 与 `secondary` 色相差须落进类比(≤45°)/三角(95–145°)/互补(>145°)之一
- 背景色相孤岛：彩度 ≥8 的背景槽偏离底色相 >60° 即告警

最后一条「25 角色两两不同值」最狠：它逼每个岗位都有自己的一份色，连 markdown 六角色也不能重样。
上一版原神是通用藏青夜店配色（`#0c152e` 底 + 荧光青 primary），既不是原神也不是任何一张图。

## 跑法

```powershell
$py   = 'C:\Users\辰辰洋洋\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe'
$node = 'C:\Users\辰辰洋洋\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
$env:PYTHONIOENCODING = 'utf-8'

& $py   .\extract.py            # ① 35 锚点取样（k-means + 最密窗口定位 + 实证裁切）→ anchors.json
& $node --experimental-strip-types .\solver.ts light   # ② 约束求解（明）→ solved-light.json
& $node --experimental-strip-types .\solver.ts dark    # ② 约束求解（暗）→ solved-dark.json
& $py   .\write_presets.py      # ③ 写 src/custom-presets/genshin{,-night}.json
& $node .\make_preview_data.js  # ④ 从仓库审计基线取真实比值 → preview-data.json
& $py   .\build_preview.py      # ⑤ 组装 preview.html（并同步到 ../genshin-theme-preview.html）
& $node --experimental-strip-types .\validate.ts        # ⑥ 独立复核门禁（见下）
```

`extract.py` 的源图目录可用环境变量 `GENSHIN_SRC` 覆盖。`solver.ts` 用固定种子的 xorshift32，
同种子复跑**逐字节一致**——评审可以自己重跑核对，不依赖本机遗留物。

## 文件

| 文件 | 作用 |
| --- | --- |
| `extract.py` | 35 锚点取样：每图 14 簇 k-means 得像素质心 → 全图最密窗口定位 → 切 120×120 实证块并回测实测色 |
| `solver.ts` | 约束求解器。候选 = 两个锚点的混合，比例可搜；打分 = 违例数×1000 + 审美项（纸面梯子真梯子 / 侧栏独立平面 / 贴近种子设计 / 角色两两 ΔE≥5）；爬山 + 多起点重启 |
| `seed-palette.json` | 审美项的「种子设计」参照（初版纸感明信片），求解器据此避免漂离设计意图 |
| `write_presets.py` | 把求解产物写成两个 IP 预置 JSON（单行 / LF / 无尾换行 / 键序同形，与 `src/custom-presets/` 既有 21 套一致） |
| `make_preview_data.js` | 读 `docs/theme-audit/baseline.json`（仓库审计器产物）取**真实比值**，预览里展示的对比度不是自算的 |
| `preview.template.html` | 预览页模板（`/*__DATA__*/` 与 `/*__VARS_LIGHT__*/`/`/*__VARS_DARK__*/` 为注入点） |
| `build_preview.py` | 注入数据 + 由色位自动生成 CSS 变量 → `preview.html` |
| `validate.ts` | 独立复核门禁，见下 |

## validate.ts 复核什么

判尺的权威是仓库审计器，本文件不自造判尺，只做三件事：

1. 跑 `scripts/audit-themes.ts`，断言两套「硬对 0 违例 + UI 0 违例 + 设计告警无待处理」
2. 断言审计器的引擎对账 `engineDiagnostics.tokenParity` 在两套上 **0 失配**
   （JSON 值与引擎 `buildTokens` 实际产出逐 token 一致——预览与上线不会漂）
3. 断言落盘的 37 色与本管线求解产物**逐位一致**（防止手改 JSON 绕过管线）

## 两条胶囊的由来

自定义主题/IP 预置**一条只装一套色**：`renderCustomTheme` 把同一套 37 色同时灌进 dark/light 两半，
`appearance` 只决定宿主按哪种外观显示这一套色（不是「第二套色」）。因此「明暗一体」在胶囊层
只能靠**两条各带自己 appearance 的胶囊**实现——`genshin`（light）与 `genshin-night`（dark），
点哪条 `setIpTheme` 就把宿主外观拉到那种并显示对应色板。

内置主题（`src/themes/*.json`，opencode theme.json 格式）原生支持 `{dark, light}` 两套，
但那会动「内置 37+system=38 冻结」的口径，且与 IP 胶囊同区展示会撞名——故未走该路。

## 已知缺口（备案）

- **余量很薄**：最紧三处贴着门槛——`labelDimmed@backgroundElement` 4.52:1、
  `secondary@backgroundPanel` 3.01:1、语法核心最小 ΔE76 10.1（门槛 10）。
  改这 37 个色位**必须重跑 `npm run audit:themes`**，别只跑 `npm test`。
- 提示气泡文字色由宿主写死为白色、链接悬浮预览卡被写死、右键菜单保持毛玻璃白——
  这三点 37 个色位修不到。
- 引擎的 `ensureDiffContrast` 会在 diff 前景/底对比不足 4.5:1 时**自动改写**色值。
  本套 4 个 diff 对均已达标（≥4.5:1），故引擎原样保留，预览 == 上线。
