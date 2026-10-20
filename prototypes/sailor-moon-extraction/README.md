# 美少女战士 · 月光星纱 —— 取色与复核管线

三张参考图（`C:\Users\辰辰洋洋\Pictures\美少女战士\` 下的 `2.jpg` / `3.jpg` / `images (1).jpg`），
37 个色位，**每一个 hex 都指得回原图里的一块像素**。三种合法来源，没有第四种：

| 规则 | 含义 | 本套用量 |
| --- | --- | ---: |
| ① 直采 | hex 与参考图里的某个像素**完全一致**（脚本逐个回原图复核命中数） | 8 |
| ② 阶梯 | 采样色在 OKLCH 空间沿明度轴取台阶（C/h 保持，色域外收敛彩度） | 10 |
| ③ 混色 | 两个采样色在 sRGB 空间按固定比例混合（比例写在卡片上） | 19 |

## 跑法

```powershell
$py = 'C:\Users\辰辰洋洋\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe'

# 1) 区域取色：列出 18 个直采源的「区域众数 + 命中像素数 + OKLCH」
python sources.py

# 2) 算 37 色位：按台账算出每个 hex，并打印直采凭证
python build_palette.py          # → palette.json / ledger.json

# 3) 写进仓库预置（单行、键字典序、hex 小写，与其余 21 套同形）
python write_preset.py           # → src/custom-presets/sailor-moon.json

# 4) 生成预览（自包含：3 张参考图 + 18 块原图裁切 + 37 色位台账 + 实时对比度复核）
python make_preview.py           # → prototypes/sailor-moon-theme-preview.html

# 5) 人眼核对 18 个取色框（拼一张联系表到系统临时目录）
python verify_sources.py

# 6) 判尺（仓库口径：38 硬对 4.5:1 + 15 UI 对 3:1 + 6 项 IP 设计规范）
npm run audit:themes -- --check
```

## 文件

- `sources.py` —— 区域取色（mode / darkest / saturated 三种取法）与逐像素命中统计
- `build_palette.py` —— 台账 DSL（`D()` 直采 / `STEP()` 阶梯 / `MIX()` 混色）与全部色相、对比度自检
- `write_preset.py` —— 写 `src/custom-presets/sailor-moon.json`
- `make_preview.py` —— 生成自包含预览页
- `verify_sources.py` —— 18 个取色框的上下文联系表（人眼复核用）
- `palette.json` / `ledger.json` —— 产物：色板与逐色位台账

## 关键结果

- 8 个背景槽是**一条混色阶梯**（白羽 #FFFFFF × 翅膀粉 #FEB7D7，12%→64%），天然同族、0 色相孤岛；代码卡是同族浅纸（42%），不另起中性灰。
- 品牌主色 #C51E56（2.jpg 深红蝴蝶结）与品牌第二色 #133284（海报藏青短裙）HSL 夹角 116.3°，落进三角关系。
- 语法五核心压在同一条明度 L=0.44 上，两两 ΔE76 最小 41.9；注释 5.08、运算符 5.77 退到核心最低 6.32 之下。
- 判尺：38 硬对 + 15 UI 对 **0 违例**，6 项 IP 设计规范 **0 告警**（0 角色同值 / 0 色相孤岛 / 0 markdown 同值 / 三角几何 / ΔE ≥ 10 / 退后成立）。

## 已知限制

- 提示气泡文字色由宿主 DSH 写死为白色，只把背景换成主题浮层色；浅色主题下对比不足，37 个色位修不到这一点。
- 三张参考图里没有饱和的绿色像素：success 只能取海报青绿飘带 #006D72（低彩度绿），字符串色再压一档到 #375D39 补上「绿」的语义。
