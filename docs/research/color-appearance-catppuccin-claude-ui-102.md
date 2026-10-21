# Issue 102 深挖：配色外观系 3 仓主题生效原理（代码级）

> 回答票：GitHub issue 102（父地图 98：13 款 DSH 主题/背景类插件深度调查的 4 个深挖子票之一）
> 版本日期：2026-10-18（Asia/Shanghai取证日）
> 本仓路径：`docs/research/color-appearance-catppuccin-claude-ui-102.md`
> 方法：只读源码 + 文档（一手来源：目标仓库 README / package.json / cordis.patch.yml / src 与 theme CSS / 构建脚本；GitHub 页面与 raw 文件经 web_fetch 取证）。不安装、不运行任何代码，未向工作区克隆。
> 缺失声明：取证中 GitHub REST API 触发 rate limit（403），3 仓 HEAD SHA 改由 commits 分支 atom 与先前 API 成功返回交叉确认；npm registry 元数据未取，版本以各仓 package.json 原文为准。见末尾"证据缺口/不确定项"。

## 取证基线

| 仓库 | 默认分支 | HEAD SHA（取证时） | package.json 版本/包名 | 取证日期 |
|---|---|---|---|---|
| NoNameLeGo/dsh-catppuccin-theme | main | `94af6d7`（2026-10-17，fix settings seam 0.2.1，v0.6.3） | `@nonamelego/dsh-catppuccin@0.6.3` | 2026-10-18 |
| Nwflower/dsh-claude-style | master | `d773a62`（2026-10-17） | `dsh-claude-style@0.16.2` | 2026-10-18 |
| TQSY114514/dsh-ui-appearance | main | `e64243a`（2026-10-16T15:47Z） | `dsh-ui-appearance@0.1.23` | 2026-10-18 |

三仓 cordis.patch.yml 接线 id：`dsh-catppuccin`（另含 tui-themes）、`ui-skin-claude-style`、`ui-appearance`。三仓宿主侧全部围绕宿主 `--dsw-*` token 体系做事，无自立 token 孤岛（命名证据见各节）。

---

## 仓一：NoNameLeGo/dsh-catppuccin-theme（Catppuccin 四风味 + 玻璃拟态）

### 1. 配色体系如何组织

- 调色板定义：`src/client/palettes.ts`（约 54KB，文件头注明 AUTO-GENERATED，生成器 `scripts/generate-palettes.mjs`，上游 Catppuccin 官方版本 pin `639ed015`）。关键符号：`CatppuccinFlavorId = latte | frappe | macchiato | mocha`；每风味导出如 `CATPPUCCIN_LATTE { themeId: 'catppuccin-latte', colorScheme: 'light', accent: '#1e66f5', tokens: {...} }`。
- token 命名：两层。底层 `--dsw-static-*` 直接给十六进制（如 `--dsw-static-blue-500: #1e66f5`）；语义层 `--dsw-alias-*` 用 `var()` 引用静态层并用 `color-mix()` 派生明暗步阶。明暗不由用户调，由风味自带：latte `colorScheme: 'light'`，其余三风味为 dark。
- 代码着色是独立正交表：`src/client/shiki-tokens.ts`（约 6.4KB），`SHIKI_TOKENS[flavor][style]` 给出 11 个 `--shiki-*` token，值为各风味字面 hex（如 latte 注释 `#7c7f93`），fg/bg 两项用 `var()` 回指语义层。
- 用户自定义覆盖：`src/state.ts` —— `CATPPUCCIN_THEME_IDS` + `CATPPUCCIN_ENTRY_ID = 'dsh-catppuccin'`（与 cordis.patch.yml 的接线契约）；`sanitizeOverrides()` 只保留 `--` 前缀的字符串值，鉴定"用户覆盖层"的合法输入形状。

### 2. CSS 变量/覆盖如何生效（注入链路）

链路（按调用顺序）：`src/client/index.ts` `registerThemeFor()`（L421–450）→ `tolerantRegistration(() => theme.register({ id: flavor.themeId, colorScheme: flavor.colorScheme, tokens: {...} } as ThemeTokens))`（L37 引入宿主 ThemeRuntime / ThemeTokens 类型）→ 宿主 ThemeRuntime 合并。

- 合并优先级写在展开顺序里（同文件 L421–450）：`{ ...flavor.tokens, ...shiki, ...menuSurfaceFor(hostHasMenuBlur), ...readOverrides() }`，即用户覆盖最后展开、必胜，其次菜单面补丁，再次 shiki，最底层是风味基座。为什么生效：宿主 theme.register 以后写入为准的对象合并语义 + 同一 token 后展开覆盖先展开。
- 主题切换守卫：`setTheme` 包裹 `restoreGuardSetTheme`（L609–618）+ `scheduleRestore` 微任务（L633–651，注释指向 issue #10 重入问题）→ `applyDesired`（L653–684）→ 存储同步（L687–709）；偏好重应用 `reapplyThemePrefs`（L512–518）。
- 宿主侧设置缝：`src/index.ts` 双缝兼容 —— 旧宿主（≤0.1.6）走 installSection，新宿主（≥0.1.7）走 Config.volatile；`inject = [webServer]`，并挂 `/catppuccin/check-update` 路由做更新检查。
- 玻璃层是第二条独立链路：GLASS_CSS_TEXT（由 scripts/gen-glass-css.mjs 从 glass.module.css 生成，懒挂载为独立 stylesheet）+ GlassLayer 在 <html> 写 data-dsh-glass / mica / compat 属性；调节旋钮为 `--dsh-glass-blur / frost / brightness / glow`（glass-layer.ts L~50–70）。glass.module.css（约 82KB）全部规则以 [data-dsh-glass] 为门，recipes 挂在 body 上（注释写明原因是可做 var() 替换），颜色全部 color-mix() 自 --dsw-alias-* 派生——所以玻璃外观跟随风味 token 自动换色。
- 作用域与 !important：主题 token 走宿主注册层（无 scoped 选择器、无 !important，靠注册合并赢）；玻璃 CSS 用属性门控 + 层叠，不依赖 !important（与后两仓"定点 !important"风格不同）。

### 3. 字号字体如何控制

无证据（阴性结论）：对 src/client/index.ts 全文（1024 行）关键字检索，唯一的样式探针是 --dsw-menu-backdrop-filter 探测（L305–326，判断宿主有无菜单模糊）；零 font-family / font-size / --dsw-font-* 定义与配置项；README 亦无字体/字号说明。结论：该插件不管字体字号，完全沿用宿主。

### 4. 背景能力边界

- 纯色：有——即风味基座的 --dsw-alias-bg-*（换风味即换底色），无独立"纯色选择器"。
- 图片 / 动态 / 视频：无证据。全仓无 background-image / video / object-fit 相关代码；玻璃层的"氛围底光 + 辉光"是半透明渐变罩，不是壁纸层。

---

## 仓二：Nwflower/dsh-claude-style（Claude Code Desktop 皮肤）

### 1. 配色体系如何组织

- 调色板定义：packages/client/src/theme/tokens.json（约 35KB）是唯一事实源——docs/STYLE.md（约 67KB）头注声明其配色表由此 JSON 生成。配色：ivory #FCFCFB / 侧栏 #FBFBF9 / 边框 #E8E6DC / slate #141413 / clay 主色 #D97757 / accent-deep #C6613F；第二品牌 deepseek 主色 #4D6BFE。
- token 命名：palette[] 复用宿主语义名（--dsw-alias-bg-base / layer-1..3 / overlay、border-l1..3、brand-primary（双品牌值）、button fills、interactive、label-primary/secondary/tertiary/caption、state-business、link、shadow-lv2、specific-input-major 等）+ 皮肤私有 --dsh-claude-*（hover-bg、inline-code、link、table-head、canvas、sidebar-canvas 等）；typeface[7] 另管字体（见第 3 节）。
- 变体/明暗：偏好合约 packages/client/src/prefs.ts —— PALETTE: claude | host（claude 全量皮肤色 / host 跟随宿主只留描线）、BRAND: claude | deepseek、MOTION: system | reduced | full；明暗跟随宿主 [data-ds-dark-theme]（各 CSS 以此切深色值）。接线：skin.json { id: 'claude-style', accent: '#d97757', bodyAttr: 'data-dsh-claude-style' }；constants.ts 定义 STYLE_ID / SURFACE_STYLE_ID / PALETTE_ATTR / TYPEFACE_ATTR / BRAND_ATTR / MOTION_ATTR / PAGE_ZOOM_ATTR / SETTINGS_ENTRY_FALLBACK = 'ui-skin-claude-style'。

### 2. CSS 变量/覆盖如何生效（注入链路）

链路：构建期 scripts/build.mjs（esbuild 打包 packages/client/src/entry.ts，external react/host；theme/*.css 按 rank 拼接 + tokens.json → token stylesheet + assets/fonts → lib/fonts）→ 运行期 entry.ts（约 18KB）adoptSkin() → core/stylesheet.ts mountStylesheet(STYLE_ID='dsh-claude-style-style', STYLESHEET + pluginCss)。

- 门禁脚本 scripts/css.mjs 强制五条（构建失败即拦）：每条选择器必须含 body[data-dsh-claude-style]（作用域）、token 门、:has 末复位、composer 门、motion/layer 检查。作用域结论：全皮肤为 body 属性 scoped，无 :root 全局污染；与其他主题/皮肤的互斥靠 entry.ts parkForeignSheets() + FEATURES 延迟块 + release/keep 实现。
- canvas 规则 theme/tokens.css：body[data-dsh-claude-style][data-dsh-claude-palette="claude"]:not([data-we-wallpaper]) 下侧栏/主列上色；html:has(...) 变体给 canvas #fcfcfb / #fafbff；hailline 用 0.5px 边框。theme/chrome.css（约 16.8KB）：三列底色 + 列间 0.5px 分割线 + 顶部 fade（四段 color-mix() ramp，注释说明不进 tokens.json 的原因是"每 palette 经 --dsw-alias-bg-base 自解析"）。
- !important 策略是"定点钉死"：markdown-code-block（tokens.json 注释 pinned by !important）、typography.css 表头 background: var(--dsh-claude-table-head) !important、table-scroll 布局组（width/margin/padding/border-collapse 一组 !important）。其余靠"属性选择器特异度"赢宿主，不撒网式 !important。
- 与壁纸插件的协作是"主动让位"（见第 4 节）。

### 3. 字号字体如何控制

- 定义位置：packages/client/src/theme/typography.css（约 12KB）顶部 7 组 @font-face：(1) JetBrains Mono variable（包内自带，路由 /dsh-claude-style/fonts/，L5–21）；(2) Anthropic Sans/Serif/Mono 三款 400（不在 npm 包内，需用户自行放入 $DSH_HOME/dsh-claude-style/fonts/，否则回退系统安装的同名/栈后续字体，L26–50）；(3) Claude Style Inter / Claude Style Noto Serif woff2（包内自带，SIL OFL 1.1，按 Anthropic 原脸裁剪覆盖、匹配 x-height/cap-height/小写宽度以不重排，L56–71）。
- 生效范围：body[data-dsh-claude-style] { font-family: var(--dsw-font-family); }（L73–74）；markdown 正文 :is([data-dsh-claude-part~="markdown"]) { font-family: var(--dsh-claude-font-prose); }（L100–101，中英混排中文 fallback 到 sans CJK）；h1–h4 显示衬线 --dsh-claude-font-serif（L84–85）；宿主给 markdown 元素写了 font: 简写，皮肤逐项重声明 font: var(--dsw-font-markdown-h1..h4); font-family: var(--dsh-claude-font-prose);（L114–117，注释写明"shorthand 重断 family，必须补回"）。
- 是否可配：TYPEFACE: claude | host（prefs.ts）——选 host（follow-host）即把 token 让给宿主/其他主题；字号无配置项，沿用宿主（表格 font-size: var(--dsh-content-font-size, 14px) L122；正文行高 calc(23px + var(--dsh-content-font-delta, 0px))）。

### 4. 背景能力边界

- 无自有壁纸；设计上主动让位给壁纸引擎：packages/client/src/theme/wallpaper.css（约 4KB）全文是让位逻辑——有 data-we-wallpaper（dsh-plugin-wallpaper-engine 标记）时皮肤不画 canvas/columns，只罩一层 body::after mask（z-index: -1，color-mix(canvas 86%/82%) 保证可读性）并把 shell 置透明。
- 纯色：有——即 canvas token（claude palette 下 #fcfcfb 系）。
- 图片 / 动态 / 视频：无证据（无 background-image/video/object-fit 代码；视频/动态完全不在本仓职责内，由壁纸引擎负责）。

---

## 仓三：TQSY114514/dsh-ui-appearance（自定义配色 + 壁纸/视频背景）

### 1. 配色体系如何组织

- 角色模型：src/appearance-settings.ts（约 13KB）—— APPEARANCE_SETTINGS_NAMESPACE = 'ui-appearance'；六角色 APPEARANCE_ROLES = accent / background / panel / input / text / border；可反转 INVERTIBLE = accent, background 且 DEFAULT_INVERT { accent: true }（accent 默认自动反转保证气泡可读）；每角色 ModeThemeSettings { light, dark } 双模式 + preset / invert，顶层另有 legacy 镜像字段。
- 预设：src/client/tokens.ts（约 44KB/910 行）尾部 —— LIGHT_PRESETS（L776 起：default / dawn / sky / mint / sakura / clay，六键全 hex）与 DARK_PRESETS（L841 起：default / midnight / ocean / forest / rose / monochrome），合并为 APPEARANCE_PRESETS（L906）。
- 推导函数 buildTokenOverrides(settings): ThemeTokenOverrides（L188）：每 token 发 { light, dark } 对（宿主要求）；accent → --dsw-alias-brand-primary / state-business-primary / button-info-fill，hover 用 mixHex(accent, LIGHT_BASE/DARK_BASE, 0.15/0.22) 派生；background → --dsw-alias-bg-base；panel → layer-1..3/overlay/module-platform/sidebar-fill/bubble/bubble-highlight/menu/fill-l1/l2/tip 一组（权重 0.04–0.14 的 mix）。emit(name, light, dark)（L190）是唯一出口。
- 可读性数学全在 src/client/color.ts（纯函数，无 DOM）：mixHex / withAlpha / contrastRatio / relativeLuminance / isDarkColor（dark 阈值 luminance < 0.18）；tokens.ts onInk()（LIGHT_INK #fafaf9 vs DARK_INK #0f1115 二选一，0.5 偏移偏向浅色墨）+ a11yLabelStep()（24 轮二分找满足 WCAG 对比度的最大 mix 权重）+ bubbleInk()。

### 2. CSS 变量/覆盖如何生效（注入链路）

链路：src/client/index.ts apply(ctx)（L106，inject = [slots, locale, theme]，L51）→ rAF 节流 scheduleApply / flushApply（L124–146，高频 slider 拖拽合帧）→ applier.apply(current)（L135/146/172）→ 双写：(1) ctx.theme.overrideTokens(OVERRIDE_SOURCE, tokens)（applier.ts L363–364，OVERRIDE_SOURCE = '@deepseek-ai/dsh-client-ui-appearance'）把 buildTokenOverrides 结果进宿主主题层，返回 removeOverrides 供 dispose 时精确撤回（L361–364/611）；(2) DOM 写 body 上 22 个 BODY_VARIABLES（--dsw-appearance-*，L20–43）供自有 stylesheet 消费。设置行挂 settings.general.item（L380），持久化 STORAGE_KEY = 'dsh-ui-appearance.settings' + sanitizeSettings + 跨 tab storage 事件。

- !important 定点使用：Windows 框 punch-out（html[data-dsw-has-bg] … _frame { background: transparent !important; }，Issue #31）、--dsw-menu-surface-fill: var(--dsw-specific-menu) !important（tokens.ts L579 注释 cyclic reference 说明）、solid 标签组、slider 拖拽期 transition-duration: 0s !important 保 60fps。token 主体靠 overrideTokens 层赢，不靠 !important。
- 作用域三板斧（全部属性门控、禁用即精确还原， applier 头注释）：(1) 气泡子树 scoped 重写 —— #root [class*="_bubble"], #root [class*="bubble" i] { --dsw-alias-state-business-primary/--dsw-alias-brand-primary: var(--dsw-alias-label-primary); }（L186–189，Issue #27：accent 气泡底 + accent refChip 字 1:1 对比度不可见）+ body[data-dsw-bubble-ink-light/dark] 门控的墨水切换（L199–222）；(2) data-dsw-has-bg（<html>，L371）触发 frame 透明规则；(3) data-video 切换图片/视频层（L97/110）。

### 3. 字号字体如何控制

无证据（阴性结论）：appearance-settings.ts（全部可配键见检索：preset/image/alpha/blur/scrim，无 font 项）、tokens.ts、applier.ts（BODY_VARIABLES 22 项无字体项）均无 font-family / font-size 定义与配置。该插件不管字体字号。

### 4. 背景能力边界（本票三仓中唯一真做背景的）

- 纯色：有——background 角色色进 --dsw-alias-bg-base（buildTokenOverrides bg 段）。
- 图片：有——backgroundImage: string 存 IndexedDB record key（legacy 兼容 inline data URL）（settings.ts L102–103）；image-store.ts 持久化；SHEET（applier.ts L79–97）#dsw-appearance-bg{ position: fixed; inset: -48px; z-index: -1 } 三层合成：base canvas（用户 background 色）+ ::before 图片层（cover / --dsw-appearance-bg-opacity / blur(--dsw-appearance-blur)，上限 BACKGROUND_BLUR_MAX = 30）+ ::after scrim 罩（--dsw-appearance-scrim，明暗两套渐变）。
- 视频/动态：有——backgroundVideo: string（L104–105）+ video-store.ts；<video muted loop playsInline autoplay>（L587–594，ensureVideo），object-fit: cover，同一透明度/模糊变量；data-video 有则 ::before 熄灭、video 显示（L97–110）；URL.createObjectURL(record)（L552）+ 编解码失败回退（onerror 撤层 L557–559，onloadeddata 上报 L565）。inset: -48px 给 blur 留边、防边缘透光；#root 刻意不动（长注释论证：动 #root 会把 fixed 菜单/toast trap 进 stacking context，盖住 z-1000 设置弹窗）。
- 不透明度/玻璃：surfaceAlpha / sidebarAlpha / modalAlpha / inputAlpha / codeAlpha / sidebarOpaque / glassBlur（上限 GLASS_BLUR_MAX = 20，EMPHASIS_ALPHA 0..0.45）；背景图层"暗色判定" imageDark 参与可读性。
- 边界：图片/视频来自用户上传（IndexedDB），无外部 URL 拉取证据；无播放控制 UI（只有存/清 key）；视频与图片共享一层（互斥，video 优先）。

---

## 横向小结（仅综合本票 3 仓）

| 维度 | catppuccin | claude-style | ui-appearance |
|---|---|---|---|
| 范式 | 整套风味注册（换整套 token） | 定制皮肤样式表（scoped CSS + token 表） | 用户自定义覆盖（角色色推导 + 覆盖层） |
| token 入口 | theme.register({id, colorScheme, tokens}) | 构建期 tokens.json→stylesheet + 运行期 mount | ctx.theme.overrideTokens(SOURCE, {light,dark}) + body 变量 |
| 明暗 | 风味自带（latte 光/其余暗） | 跟随宿主 data-ds-dark-theme | 每 token 自带 light/dark 对 |
| 可配粒度 | 风味 4 选 1 + 全 token 手工覆盖 | palette 2 选 + brand 2 选 + motion + typeface | 6 角色 x 双模式 + 11 预设 + 不透明度/模糊组 |
| !important | 不用（靠注册合并） | 定点（code block/表头/表格布局） | 定点（frame punch-out/菜单面/solid/drag 期） |
| 字体 | 不管 | 全管（自带 4 款 + 用户 3 款 + CJK 策略） | 不管 |
| 背景图/视频 | 无（仅玻璃氛围光） | 主动让位给壁纸引擎 | 自有 bg 层（图 + 视频 + scrim + punch-out） |

给 100 号综合对照表的事实输入（一句话版）：catppuccin = "换整套官方色 + 用户覆盖兜底"；claude-style = "scoped 皮肤 + 双品牌 + 字体全栈 + 壁纸让位"；ui-appearance = "角色色推导 + overrideTokens + 自有图文视频背景层"。三者 token 命名都贴宿主 --dsw-*，可共存但叠加语义由宿主层序决定（本票未深挖层序仲裁，留给 100 号）。

## 证据缺口/不确定项

1. npm registry 元数据未取（rate limit 期间未补）：三仓版本号以 raw package.json 原文为准，未与 registry latest 交叉。
2. claude-style tokens.json（35KB）未逐条全文核对，token 清单以 docs/STYLE.md 生成表 + 文件片段相互印证；若 100 号需要逐 token 表，需二次取证。
3. catppuccin glass-layer.ts 调节旋钮行号为约数（L~50–70，文件经截断打印定位），符号名（--dsh-glass-*、data-dsh-glass）已确认精确。
4. 三仓 dist / lib 构建丧物未读（exports 表以 package.json 为准）；行为结论全部来自源码与文档，无运行时验证（符合本票只读要求）。
5. "无字体/无背景"均为源码关键字检索阴性结论（检索词：font-family / font-size / --dsw-font / background-image / video / object-fit），若上游后续版本新增能力，本结论以取证 SHA 为准过期。

## 附录：复现命令/取证链接（取证日 2026-10-18，Asia/Shanghai）

```powershell
# 仅用 web 读取（no clone / no install / no run），以下任选其一复核
# Catppuccin
Invoke-WebRequest https://raw.githubusercontent.com/NoNameLeGo/dsh-catppuccin-theme/main/package.json
Invoke-WebRequest https://raw.githubusercontent.com/NoNameLeGo/dsh-catppuccin-theme/main/src/client/index.ts
Invoke-WebRequest https://raw.githubusercontent.com/NoNameLeGo/dsh-catppuccin-theme/main/src/client/palettes.ts
# Claude-style
Invoke-WebRequest https://raw.githubusercontent.com/Nwflower/dsh-claude-style/master/package.json
Invoke-WebRequest https://raw.githubusercontent.com/Nwflower/dsh-claude-style/master/packages/client/src/theme/tokens.json
Invoke-WebRequest https://raw.githubusercontent.com/Nwflower/dsh-claude-style/master/packages/client/src/theme/typography.css
# UI-appearance
Invoke-WebRequest https://raw.githubusercontent.com/TQSY114514/dsh-ui-appearance/main/package.json
Invoke-WebRequest https://raw.githubusercontent.com/TQSY114514/dsh-ui-appearance/main/src/client/tokens.ts
Invoke-WebRequest https://raw.githubusercontent.com/TQSY114514/dsh-ui-appearance/main/src/client/applier.ts
```

- commit 链接：github.com/NoNameLeGo/dsh-catppuccin-theme/commit/94af6d7、github.com/Nwflower/dsh-claude-style/commit/d773a62、github.com/TQSY114514/dsh-ui-appearance/commit/e64243a。
- 格式参照：本仓 docs/research/dsh-plugin-update-latest-api.md、docs/research/palette-picker-survey.md。
