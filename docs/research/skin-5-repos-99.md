# 整包皮肤系 5 仓实现原理深挖（#99）

> 研究问题：深挖整包皮肤系 5 个仓库的主题生效原理（代码级，只读源码不运行）：dream-skin / open-sea-skin / bloom-theme / prts / mineradio。需回答：颜色/字体/字号 token 如何定义与覆盖、主题为什么能生效（变量/注入/优先级）、各区域背景如何设置、是否有音乐/视频能力。每个结论给出文件路径+关键行。
> 来源票：[#99](https://github.com/FeatherHunter/dsh-opencode-palette/issues/99)（父地图 [#98](https://github.com/FeatherHunter/dsh-opencode-palette/issues/98)），阻塞 [#100](https://github.com/FeatherHunter/dsh-opencode-palette/issues/100) 横向综合。
> 方法：只读源码+文档，不安装运行；一手来源为各仓库 GitHub 原文（raw / blob）与包内 manifest；凡检索为零命中的否定结论均注明检索范围。5 路并行子调研（background subagents）+ lead 用 gh/本地 clone 复核。
> 决策依赖：本篇只调查不设计（地图 98 Out of scope：我们自己 JSON theme 包的设计与实现另议）；输出喂给 #100 横向综合对照表。Standing preferences（2026-10-18 用户已确认）：分篇深挖+综合对比；代码级生效链路（文件路径+关键行+为什么生效）；音乐/视频需含自动播放与格式细节。
> Grilling 检查：本票问题、口径、产物位置在 issue 正文 + 地图 98 Notes 中已显式给定（只读不运行、文件+行、只调查不设计、docs/research 惯例），无“我猜”分支，未向用户追加提问。

## 结论先行（横向 5 仓）

| 仓库 | 生效路线 | token 规模 | 字体/字号 | 区域背景 | 音乐/视频 |
|---|---|---|---|---|---|
| [dsh-dream-skin](https://github.com/RevolutionLA/dsh-dream-skin) v10.16.0 | 官方双轨：`ctx.theme.register`（8 皮肤标量）+ 合并后单次 `ctx.theme.overrideTokens("dsh-dream-skin:appearance")`（DIY 层 {light,dark} 对）；自注入 \<style> 只做液态玻璃材质不管颜色 | 57 枚/皮肤（alias + specific + menu，见 §1） | 无字体/字号 token；字号仅设置面板行内 `fontSize:"13px"` | token 改色 + fixed \<div> 壁纸层（`backgroundImage` 静态图/URL/渐变）+ 每皮肤 glow 弥散光；无视频 | 无（accept:"image/*"，全仓 music/bgmp/mp3/mp4/webm/audio/video/autoplay 零命中） |
| [open-sea-skin](https://github.com/d-dev0101/open-sea-skin) | 双路径按分发二选一：源码集成走 `ctx.theme.overrideTokens` 玻璃层；npm 发布包走自注入 \<style id="__open-sea-skin-glass__">（!important）+ 同源 iframe | 9 个背景系 alias/specific（bg-base/layer-1..3/module-platform/multi-select/overlay/sidebar-fill/selector） | 无字体/字号/正文色 token；Geist @font-face 只用于 ocean iframe/自家面板 | 透明化 + 半透明 token + iframe 内实时 WebGPU 海洋 canvas（Three.js TSL，5 Gerstner 波+FBM+Bloom）；无 background-image、无静态/视频图 | 无（树中无音视频资源；README 原话 "rather than a looping wallpaper video"） |
| [dsh-bloom-theme](https://github.com/webkubor/dsh-bloom-theme) v0.17.6 | 自注入 \<style data-plugin-css> + CSS 变量覆盖；`overrideTokens`/`ctx.theme` 全仓零命中 | 10 套 OKLCH 色板 → alias + specific + 自有 --bloom-*（mist 为完整骨架，其余 9 变体只覆主色+背景调） | 无宿主字族 token（font-family 仅自家切换器 2 处：诗句衬线+版本号等宽）；宿主字号仅 tabs clamp 与侧栏 12px 硬写 | token 改色 + CSS gradient 氛围 + backdrop-filter 玻璃；src 内 url( 零命中；壁纸层 v0.5.0 已移除 | 无（mp3/mp4/webm/ogg/audio/video/autoplay 全零命中） |
| [dsh-theme-prts](https://github.com/ash-qw/dsh-theme-prts) @1.4.2 | 自注入 \<style> + html[data-dsh-prts] 作用域 + !important；`overrideTokens` 20 文件零命中；读宿主 theme/change 仅同步日夜不写回 | 自有 --prts-* 族（canvas/panel/ink/line/品牌/玻璃四档/气泡/头像环）+ 极少数 --dsw-alias-* 转接；light 整组覆盖 | --prts-body/display/mono 三字族（Noto Sans SC / Arial Narrow / Roboto Mono 系）；无全局字号 token（自家面板 .875/.75rem + 8/9/11/12px 固定） | token 改色 + gradient + 内联 SVG data-URI + JS 生成 SVG/canvas（城市剪影/粒子徽记/ambient/particle 层）；无外部背景图/视频 | 无（mp3/mp4/webm/audio/video/AudioContext/new Audio 全零命中） |
| [dsh-theme-mineradio](https://github.com/dhicoc/dsh-theme-mineradio) | 官方叠层为主 + 自注入为辅：`ctx.theme.overrideTokens` 写 body 内联 + runtime role census（data-md-role + !important）+ 手工玻璃配方（html 内联 --dsh-aqua-*） | alias 全套半透明化（bg/border/label/brand/交互/markdown/滚动条）+ specific（sidebar-fill=transparent 等）+ shadow；mica/compat 双基表 | 唯一 `--dsw-font-family`（Inter base64 自托管 + Noto Sans SC fallback）；无字号 token | token 半透明化透出底部；底部自建 fixed 层二选一：fluid shader canvas 或用户壁纸 \<img>/\<video>；无内置图片/视频资源 | 视频有（用户自选，默认关，loop+muted 兜底自动播放，mp4/webm/ogg/mov/m4v/mkv）；音乐播放无（仅麦克风视觉脉动 + 电台调台隐喻） |

共同点：5 家都不用纯 JSON theme；都不用 webserver/index-inject 做主题注入；颜色都经 alias/specific 语义 token 或同名 CSS 变量覆盖生效；背景动态感分别走 CSS gradient / canvas WebGL / 程序化粒子，只有 mineradio 接用户视频文件。音乐播放 5 家全无。

## 1. dream-skin（RevolutionLA/dsh-dream-skin）

包：[package.json](https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/package.json)（v10.16.0，main lib/index.js，dsh.client.inject 含 dsh-client-ui-theme，bundle.patch ./cordis.patch.yml）；[cordis.patch.yml](https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/cordis.patch.yml)（insert id dream-skin）。

### 1.1 token 定义与覆盖

- 57 枚/皮肤：`--dsw-alias-bg-base/layer-1/2/3/module-platform/overlay/skeleton`、`--dsw-menu-surface-fill`、`--dsw-alias-menu-group-header-fill`、label 三级、brand（primary/soft/text）、button（primary-fill/hover/dimmed/elevated）、border-l1~l4（含 border-l2-darkmode-thin）、interactive（hover/active/hover-danger）、focus-ring、button-tool-bar、bg-mask-drop、file-diff 6 件、state（business/success/warn/error）、markdown 三件、scrollbar 4 件、`--dsw-specific-sidebar-fill/nav-item-active/hover/input-major/tip/selector/bubble/bubble-highlight`。定义在 [lib/client.js](https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/HEAD/lib/client.js) L423–L935 SKINS（abyss L424 / aurora L497 / nebula L570 / ember L643 / midnight L716 / ivory L789 / mist L862 / rose L935），例 abyss `--dsw-alias-bg-base:"#111317"` L428、overlay L433、sidebar-fill L477、input-major L480。源头 [scripts/skin-system.cjs](https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/HEAD/scripts/skin-system.cjs) L523 起 OKLCH 解算，经 [scripts/apply-skin-system.cjs](https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/HEAD/scripts/apply-skin-system.cjs) 烘焙（GENERATED L394–L419）。
- glow（每皮肤弥散光，如 L486 radial+linear 串）：非 token，建议壁纸/默认背景；与 tokens+defaults 称三件套；主题包不含 glow（[docs/themes-spec.md](https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/themes-spec.md) 载荷边界节）。
- defaults（wallpaperOpacity/Blur、sidebar/composer/modalOpacity、material、autodim，如 abyss L488–L496）：域表见 [scripts/lib/skin-defaults.cjs](https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/HEAD/scripts/lib/skin-defaults.cjs)，只写用户未动键。
- Accent 叠加 ACCENT_TOKENS（L6073，brand-primary/state-business/button-primary-fill/dimmed，L6098–L6108 {light,dark} 成对）；弹窗 POPUP_TOKENS（L4226，bg-overlay/specific-menu/bg-layer-2，92% 可读下限）；壁纸 wash（L6618 shadeTokens2，bg-base/sidebar-fill/--dsh-dream-skin-composer-base/modal-base）。三者先合并再一次 `overrideTokens("dsh-dream-skin:appearance")`（L2360 source，L2386–L2397 提交）。
- 主题包白名单见 [docs/themes-spec.md](https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/themes-spec.md) + [sample-theme-pack.json](https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/HEAD/docs/examples/sample-theme-pack.json)（必填 bg-base/layer-1、label-primary/secondary、brand-primary、border-l1/l2）。
- 字体/字号：57 token 零命中 font/size/family；仅设置 UI fontSize:"13px"（L4531/L4579/L4625/L4655/L5114）。

### 1.2 为什么生效

1. loader 进树（package.json + patch）→ browser `window.__ModuleLoader__.load({id:"dsh-dream-skin"})`（lib/client.js L~40）。
2. apply(ctx)（L7610）→ 注册 8 皮肤 `ctx.theme.register(skinDefinition)`（L7631–L7637）→ 宿主 ThemeRuntime 收标量 tokens（落点宿主 ui-layout ThemePresenter 写 body 行内，bundle L394–L396 注释）。
3. setSkin → `ctx.theme.setTheme(id)` + syncSkin 听 theme/change（_applyingWallpaper 守卫防 overrideTokens 重入死循环 L6490，CHANGELOG 有实机背书）。
4. DIY 三叠加合并单次 overrideTokens（L2386–L2397）。
5. 材质 \<style>（MATERIAL_CSS_SOURCE L2412/L2584，@supports(backdrop-filter) + 哈希类，host 换 hash 则 no-op）。
6. 微调变量直写 documentElement.style.setProperty（composer-fill L2246、modal-fill L4187 等）。
7. host 半边 lib/index.js（L45 STATE_FILENAME、L69 API_PREFIX /dream-skin/api）只做 $DSH_HOME/dream-skin.json 持久化（localStorage 跨 origin 失效补偿），与注入无关。

### 1.3 区域背景

全局 canvas/对话区：bg-base 标量 + wash toRgba 叠加；气泡 tip/selector 另有 specific。侧栏：sidebar-fill + nav-item-active/hover，可联动 wash。输入框：input-major + 自注入玻璃 + --dsh-dream-skin-composer-fill。弹窗：POPUP_TOKENS + modal-fill。壁纸层：动态 \<div> fixed inset:0 z-index:-1 prepend（L6504–L6505），backgroundImage=url/gradient（L6513，wallpaperBackgroundCss L6449），cover/contain + blur 0–60px + bleed 垫底。kind 仅 image|url|gradient（L5441）；安全阀 http(s)/data:image（L1808/L6449–L6465）；建议背景即每皮肤 glow。wallpapers/ 仅 3 张 .jpg 且 package.json files 未含、README 明说不打进包不直读；寻址=选图→压缩 data URL→localStorage（L149）/历史5条/URL/渐变/必应每日+定时刷新（WALLPAPER_REFRESH L~6353）。

### 1.4 音乐/视频

无。lib/client.js 全文 430708 字符正则 music|bgm|mp3|mp4|webm|ogg|wav|autoplay|<video|<audio|createElement(audio/video/source/iframe) 零命中；选择器 accept:"image/*"（L4922）；wallpaperEl 为 \<div>（L6504）。README 仅在对比竞品行提到视频以证本仓不做。

## 2. open-sea-skin（d-dev0101/open-sea-skin）

### 2.1 token 定义与覆盖

原生（源码集成）：[harness-plugin/src/client/index.ts](https://raw.githubusercontent.com/d-dev0101/open-sea-skin/HEAD/harness-plugin/src/client/index.ts) L39 glassTokens，L44–L52 九枚：bg-base（light glass/100, dark max(0.4,light-0.12)，默认 glass:72 见 settings-contract）、bg-layer-1/2/3、bg-module-platform/multi-select（+0.02）、bg-overlay（+0.10/+0.14，见 [architecture.md](https://raw.githubusercontent.com/d-dev0101/open-sea-skin/HEAD/docs/architecture.md)）、specific-sidebar-fill/selector。发布包：[shared/skin-core.js](https://raw.githubusercontent.com/d-dev0101/open-sea-skin/HEAD/shared/skin-core.js) L92 glassCss 同名九枚 !important 模板，mountOcean L310–L330 建 \<style id="__open-sea-skin-glass__">，updateGlass L249–L251 同步。字体/字号/正文色：两路径均无 --dsw-alias-font*/--dsw-*-text/font-size；Geist @font-face（[shared/styles.css](https://raw.githubusercontent.com/d-dev0101/open-sea-skin/HEAD/shared/styles.css) L1–L22）只用于 iframe/官网。判定：package.json main plugin/index.js、dsh.client.inject:[] 空、[cordis.patch.yml](https://raw.githubusercontent.com/d-dev0101/open-sea-skin/HEAD/cordis.patch.yml) 仅 insert id open-sea-skin、[plugin/index.js](https://raw.githubusercontent.com/d-dev0101/open-sea-skin/HEAD/plugin/index.js) L11 inject=['webServer']；非 JSON theme，无 webserver/index-inject，无 body.style.setProperty。

### 2.2 为什么生效

A 原生（harness-plugin/，未进 npm 主包）：[src/index.ts:84](https://raw.githubusercontent.com/d-dev0101/open-sea-skin/HEAD/harness-plugin/src/index.ts) apply→settings.register + webServer.register prefix /open-sea-skin（L27 ROUTE，L30 ASSET_ROOT ../assets/）；client [index.ts:57](https://raw.githubusercontent.com/d-dev0101/open-sea-skin/HEAD/harness-plugin/src/client/index.ts) inject=[slots,locale,theme,…]→apply L65→L71 applyTokens（enabled:glass 时 overrideTokens，L94 effect 可逆卸载）→L98 slots.inject shell.background（[OpenSeaBackground.tsx](https://raw.githubusercontent.com/d-dev0101/open-sea-skin/HEAD/harness-plugin/src/client/OpenSeaBackground.tsx) 拼 /open-sea-skin/skin.html?…，[module.css](https://raw.githubusercontent.com/d-dev0101/open-sea-skin/HEAD/harness-plugin/src/client/OpenSeaBackground.module.css) absolute inset:0 pointer-events:none）→postMessage 联动 ocean.js。
B 发布包（npm open-sea-skin 主包 plugin/+native-dist/+shared/）：[plugin/index.js:69-79](https://raw.githubusercontent.com/d-dev0101/open-sea-skin/HEAD/plugin/index.js) 仅静态路由；[plugin/client.js](https://raw.githubusercontent.com/d-dev0101/open-sea-skin/HEAD/plugin/client.js)（shared/skin-core.js 生成物）controller.start()；skin-core L310–L330 建 iframe（fixed inset:0 z-index:0 pointer-events:none transparent）+ glass \<style>。优先级：body{background:transparent !important} 先掏底再半透明盖回（architecture.md："Glass is applied through Harness semantic tokens, not nested opacity"）。

### 2.3 区域背景

全局：掏底 + 九 token + iframe 置底（src /open-sea-skin/skin.html，发布 [native-dist/skin.html](https://raw.githubusercontent.com/d-dev0101/open-sea-skin/HEAD/native-dist/skin.html)，assetUrl/chrome.runtime.getURL 相对寻址）。动态源为 [shared/ocean.js](https://raw.githubusercontent.com/d-dev0101/open-sea-skin/HEAD/shared/ocean.js) WebGPU Three.js TSL 实时海洋（非图片/视频），skin.html 内联 transparent + canvas 淡入。侧栏：sidebar-fill + Desktop 强制 transparent（core L128）+ 旧 hash 回退（L170–L172）。对话区/三列：同组 layer 复用 + #root overlay 透明化（L136–L158）；输入框无独立 token（证据缺口）。overlay：bg-overlay 最高 alpha + settings modal 保底 .97（L161–L167）。ocean 自身 vignette/panel 见 shared/styles.css（vendor fonts 相对寻址；截图仅 docs/ 不参渲染）。

### 2.4 音乐/视频

无。220 项树中除 docs/screenshots/*.gif 录屏外无 mp3/mp4/webm/ogg/wav；ocean.js/plugin/client.js/extension/content.js 中 audio/video/mp3/mp4/webm/music/autoplay/<audio/<video 零命中（ogg/wav 系 toggle/wavelength 误报）；[README.en.md](https://raw.githubusercontent.com/d-dev0101/open-sea-skin/HEAD/README.en.md) 仅 "rather than a looping wallpaper video" 否定视频。动态=常驻 WebGPU canvas（12 分钟 daylight cycle + reduced-motion 降帧），默认开的是海洋不是媒体。

## 3. bloom-theme（webkubor/dsh-bloom-theme）

包：[package.json](https://raw.githubusercontent.com/webkubor/dsh-bloom-theme/HEAD/package.json)（v0.17.6，dsh.client.inject:[] 空，immediately:true）；[cordis.patch.yml](https://raw.githubusercontent.com/webkubor/dsh-bloom-theme/HEAD/cordis.patch.yml)（insert id bloom-theme）。

### 3.1 token 定义与覆盖

大脑 [src/tokens.ts](https://raw.githubusercontent.com/webkubor/dsh-bloom-theme/HEAD/src/tokens.ts) buildBloomCSS()：PALETTE（[src/palette.ts](https://raw.githubusercontent.com/webkubor/dsh-bloom-theme/HEAD/src/palette.ts)，VARIANTS 10，accentL/D 可读轨 + morandi 气质轨，WCAG AA 全达标表）→ bloomTokens（--bloom-morandi/accent/motion/shadow/hairline/glow/code-bg/glass-blur/cursor-x/y，顺带 state-business-primary、label-deep-diving(-shimmer)）→ sharedDswTokens/borderStack/labelStack（toast/bg-mask-photo 等，防漂移）→ mistLight/mistDark 完整骨架（bg-base/layer-1..3/overlay、specific bubble/highlight/input-major/menu/selector/sidebar-fill）→ variantBlock（其余 9 变体主色+背景调，选择器 body[data-bloom-variant]×body[data-ds-dark-theme]）。字体：tokens 内无 --dsw-font* token；`font-family` 全仓仅 4 命中且全是自家切换器作用域（[switcher.ts L209](https://raw.githubusercontent.com/webkubor/dsh-bloom-theme/HEAD/src/css/switcher.ts) 诗句列 Songti 衬线、[switcher.ts L360](https://raw.githubusercontent.com/webkubor/dsh-bloom-theme/HEAD/src/css/switcher.ts) 版本号等宽，不写宿主字族——宿主结论“不改字族”成立，原“0 命中”引注以本次 clone 穷举为准修正）；宿主侧字号硬写仅 tabs clamp(13px,0.9vw,14px) 与侧栏 12px + weight 500/600（切换器自家 10–14px 另计）。机制：[src/dom.ts](https://raw.githubusercontent.com/webkubor/dsh-bloom-theme/HEAD/src/dom.ts) injectCSS（style[data-plugin-css] 幂等进 head）；client.ts 三表注入 bloom/components/glass。

### 3.2 为什么生效

node 半侧 [src/index.ts](https://raw.githubusercontent.com/webkubor/dsh-bloom-theme/HEAD/src/index.ts) 只注册只读 /api/bloom/dsh-version（注释：真正逻辑全在浏览器半侧）。browser [src/client.ts](https://raw.githubusercontent.com/webkubor/dsh-bloom-theme/HEAD/src/client.ts) IIFE：readVariant（localStorage dsh-bloom-variant，回落 mist）→ 三表 inject → body.dataset.bloomVariant → initAppearanceSync（[appearance.ts](https://raw.githubusercontent.com/webkubor/dsh-bloom-theme/HEAD/src/appearance.ts)，body[data-ds-dark-theme] + matchMedia 监听）→ injectSwitcher/watchSwitcher/watchThinkTags/checkUpdate/watchCursorGlow（唯一 setProperty 写 --bloom-cursor-x/y）。落点：body[data-bloom-variant]{--bloom-ambience…; background-image:var(--bloom-ambience); background-color:var(--dsw-alias-bg-base)!important} + body::before fixed z-index:-1（[component.ts](https://raw.githubusercontent.com/webkubor/dsh-bloom-theme/HEAD/src/css/component.ts)）；author 规则 + 属性选择器提权覆盖宿主蓝灰。

### 3.3 区域背景

全局/对话区：--bloom-ambience radial 串 + ::before；aurora 另有丝带层（[glass.ts](https://raw.githubusercontent.com/webkubor/dsh-bloom-theme/HEAD/src/css/glass.ts)，linear+transform 漂移+blur，opacity 0.2，reduced-motion 关动画）。侧栏：sidebar-fill/active/hover + hairline 分界 + 选中圆角（v0.10.x 已删蓝条）；玻璃走 ::before（backdrop-filter 会劫持 fixed 后代 overlay 定位）。气泡：bubble/highlight + 半透 + blur（只接管面级容器，color-mix 跟变体）。输入区：composerSeat::before 重画 ambience + mask 淡入（特异度 (0,3,1) 压宿主 (0,3,0)），card 透明 + 半透 ::before；禁 backdrop-filter/transform/isolation（子树有 fixed overlay）。overlay/dock：overlay/layer/module-platform + dock preview 半透明 blur；设置 overlay fixed inset:0。壁纸/图片/视频：已移除（dom.ts 明示 v0.5.0 移除壁纸/玻璃开关/主题包，玻璃默认常开；glass.ts 头注背景即氛围渐变；url( 全仓零命中；assets 探针全 404）。

### 3.4 音乐/视频

无。src（client/switcher/dom/appearance/css/palette）+ lib/client.js 头 100k 中 mp3/mp4/webm/ogg/wav/audio/video/<audio/<video/autoplay/Audio(/Video 全零命中；README 卖点仅玻璃+莫兰迪+微动效（aurora 丝带、thinking 呼吸、cursor 光斑 pointermove+rAF）。

## 4. prts（ash-qw/dsh-theme-prts）

包：[package.json](https://raw.githubusercontent.com/ash-qw/dsh-theme-prts/HEAD/package.json)（@ash-qw/dsh-theme-prts@1.4.2，engines.dsh 0.2.0-rc.2，dsh.client immediately:true，bundle.patch）；[cordis.patch.yml](https://raw.githubusercontent.com/ash-qw/dsh-theme-prts/HEAD/cordis.patch.yml)（insert id theme-prts）。

### 4.1 token 定义与覆盖

全在 [src/styles/prts.css](https://raw.githubusercontent.com/ash-qw/dsh-theme-prts/HEAD/src/styles/prts.css)：--prts-canvas/elevated/rail/panel/raised/muted（L2–L8 暗基准）、ink/muted/dim/line/strong（L9–L13）、yellow/cyan/red/green（L14–L18，selection/焦点/流线源）、body/display/mono（L34–L36 Noto Sans SC/Arial Narrow/Roboto Mono 系；落点 L158/L204；宿主字体处 font:inherit L171–L176）、glass 四档 + active-glass(-filter)/dense（L40–L46，分支 L89–L107）、chat-user/assistant/backdrop(-edge)/avatar-ring-image（L47–L52 暗 / L80–L85 亮，头像环为内联 SVG data-URI）、light 整组（L61–L87，root.dataset.prtsScheme 切换）、唯一 alias 转接（L19 primary-inverted，L145–L152 body{--dsw-alias-bg-base:var(--prts-canvas)…}，同文件 CSS 作用域覆盖非 API）、session-flow-back/core/front（[preferences.js](https://raw.githubusercontent.com/ash-qw/dsh-theme-prts/HEAD/src/client/preferences.js) 调色板 triad/rhodes/amber/alert，[theme-controller-v2.js](https://raw.githubusercontent.com/ash-qw/dsh-theme-prts/HEAD/src/client/theme-controller-v2.js) L735 setProperty，唯一动态 token）、字号仅自家面板（[theme-settings-workbench.css](https://raw.githubusercontent.com/ash-qw/dsh-theme-prts/HEAD/src/styles/theme-settings-workbench.css) .875/.75rem + 8/9/11/12px）。机制：自注入 \<style>（controller L132–L140 ensureStyle，dataset.plugin）+ html[data-dsh-prts] 作用域 + !important；偏好走 dataset（L726–L736）；overrideTokens 20 文件零命中。

### 4.2 为什么生效

服务端 [src/index.js](https://raw.githubusercontent.com/ash-qw/dsh-theme-prts/HEAD/src/index.js)（inject tools/attachments/connection/webServer）只注册徽记/头像工具与 API，不管主题。构建 [scripts/build.mjs](https://raw.githubusercontent.com/ash-qw/dsh-theme-prts/HEAD/scripts/build.mjs) 合成 PRTS_CSS + data-URI 资产 → [lib/client.js](https://github.com/ash-qw/dsh-theme-prts)（~1MB，__ModuleLoader__.load）。客户端 [src/client/index.js](https://raw.githubusercontent.com/ash-qw/dsh-theme-prts/HEAD/src/client/index.js) inject=[slots,theme]→applyPrtsPlugin 取 themeService、订 theme/change 只读日夜→ensureStyle 注 style→apply 写 root dataset + setProperty→applyVisualState/theme.apply，dispose 摘除。优先级：html[data-dsh-prts] 起手 + !important（输入框 L1512、气泡 L1243/L1266）；默认 enabled:false，?prts-safe=1 安全模式；声明不改第三方弹窗（[README](https://raw.githubusercontent.com/ash-qw/dsh-theme-prts/HEAD/README.md)）。

### 4.3 区域背景

全局：background:var(--prts-canvas)（L145–L156，暗 #080a0c/亮 #eef1f3）。侧栏 rail：var(--prts-rail)（L216–L228）+ facility-face/脊线/向量为 JS 注入 SVG（[facility-vector.js](https://raw.githubusercontent.com/ash-qw/dsh-theme-prts/HEAD/src/client/facility-vector.js)，配色 [facility-vector.css](https://raw.githubusercontent.com/ash-qw/dsh-theme-prts/HEAD/src/styles/facility-vector.css)）。对话区：ambient 双 linear-gradient（L1391–L1406）+ particle 透明 canvas（L1439–L1452，[particle-field-adapter.js](https://raw.githubusercontent.com/ash-qw/dsh-theme-prts/HEAD/src/client/particle-field-adapter.js)）；气泡纯色 token；texture 开关降透明（L1422–L1437）。输入框：[data-composer-card]{background:var(--prts-active-glass)!important; backdrop-filter; border-bottom:3px solid yellow}（L1506–L1525），textarea 透明，逻辑 [composer-glass-adapter.js](https://raw.githubusercontent.com/ash-qw/dsh-theme-prts/HEAD/src/client/composer-glass-adapter.js)。浮层：floating-glass popover/dialog + shadow（L1575–L1590），设置面板 color-mix。城市剪影/纹理：JS 生成 SVG（SILHOUETTE_PATHS far/near + grid/scanline pattern；过渡 HUD 网格 data-URI L578/L587），动态为粒子重组/滚动 + reveal 动画，无视频。徽记/头像：5 阵营 PNG + SVG 构建转 data-URI/base64 + RLE（[build.mjs](https://raw.githubusercontent.com/ash-qw/dsh-theme-prts/HEAD/scripts/build.mjs)，存 $DSH_HOME/plugins/dsh-theme-prts/emblems）；光标：[cursor.css](https://raw.githubusercontent.com/ash-qw/dsh-theme-prts/HEAD/src/styles/cursor.css) data-URI PNG（源 crowninggg/prts-cursor）。

### 4.4 音乐/视频

无。20 客户端文件搜 mp3|mp4|webm|wav|ogg|m4a|<audio|<video|AudioContext|new Audio(|HTMLAudio|HTMLVideo 零真命中；[jsDelivr @1.4.2 清单](https://data.jsdelivr.com/v1/packages/npm/@ash-qw/dsh-theme-prts@1.4.2) 无音视频扩展名；[CHANGELOG](https://raw.githubusercontent.com/ash-qw/dsh-theme-prts/HEAD/CHANGELOG.md) music/audio/video/mp3/mp4/webm/bgm/sound 零命中。README “声纹/波形”系 session-lifeline SVG 动画 + session-flow 颜色，“启动序列”系 DOM/CSS 动画。

## 5. mineradio（dhicoc/dsh-theme-mineradio）

入口：[cordis.patch.yml](https://raw.githubusercontent.com/dhicoc/dsh-theme-mineradio/HEAD/cordis.patch.yml)（insert id ui-mineradio）；宿主 [lib/index.js](https://raw.githubusercontent.com/dhicoc/dsh-theme-mineradio/HEAD/lib/index.js)（[src/index.ts](https://raw.githubusercontent.com/dhicoc/dsh-theme-mineradio/HEAD/src/index.ts) 产物）空 apply；浏览器 [src/client/index.ts](https://raw.githubusercontent.com/dhicoc/dsh-theme-mineradio/HEAD/src/client/index.ts) inject=[theme,slots,locale]→apply→MineradioLayer mount→applyTokens+applySettings（+ settings.plugins.tab / general.item order 11）。

### 5.1 token 定义与覆盖

唯一字体 `--dsw-font-family`（[theme-layer.ts](https://raw.githubusercontent.com/dhicoc/dsh-theme-mineradio/HEAD/src/client/theme-layer.ts) L48 FONT_STACK，L98 both()；Inter base64 自托管 [fonts.module.css](https://raw.githubusercontent.com/dhicoc/dsh-theme-mineradio/HEAD/src/client/fonts.module.css)，CJK 系统 fallback；全文件仅一处 dsw-font，无 font-size）。表面组 L70–L71（42 背景）/L106–L117（bg-base/layer-1/2/3/overlay/module-platform/multi-select/skeleton/mask/drop 半透明化）；border L120–L126（香槟金）；label 7 枚 L129–L137 + 第二层 inkOverrides（L239/L266/L1566–L1580，textStyle 四档只重写 label）；brand/交互/markdown/滚动条 L139–L193（CHAMPAGNE #f4d28a / 深金 #9a6f2c L53–L54、薄荷、玫瑰）；specific L199–L211（sidebar-fill=transparent 等）；shadow L223–L229；MINERADIO（L101）vs COMPAT（L298）双基表（L1556 applyTokens 二选一）。自注入 knob --dsh-aqua-*（L1318–L1348 写 html 内联 + [mineradio.module.css](https://raw.githubusercontent.com/dhicoc/dsh-theme-mineradio/HEAD/src/client/mineradio.module.css) L20–L67 :root 声明）。判定：[README How coverage works (3.0)](https://github.com/dhicoc/dsh-theme-mineradio/blob/HEAD/README.md) 三段（overrideTokens 写 body 内联 + role census data-md-role+!important + carve-outs 豁免）；[build-client.mjs](https://raw.githubusercontent.com/dhicoc/dsh-theme-mineradio/HEAD/build-tools/build-client.mjs) 每 module.css 一份注入；无 webserver/index-inject，无 JSON theme。

### 5.2 为什么生效

mount（L1581–L1595）：html[data-dsh-aqua]→ensureAmbientScene/ensurePageFades→applySettings→applyTokens→mountFluid/seamStamper/spotlight/roleCensus/stationDial。applyTokens（L1556–L1564）：ctx.theme.overrideTokens('dsh-theme-mineradio',{...base,...inkOverrides()})（body 内联最高，无 !important 需求；::before 继承亦生效；setEnabled(false) L1751 释放+摘属性）。applySettings（L1311–L1350）：html 内联 --dsh-aqua-blur/frost/wallpaper-blur/video-blur/dim/brightness/bloom-h/spot-color + data-dsh-float/compat/spotlight 开关。优先级：token 层（body 内联）> census 层（[role-layer.module.css](https://raw.githubusercontent.com/dhicoc/dsh-theme-mineradio/HEAD/src/client/role-layer.module.css)，2.x 类名 (0,2,0) 落败故 3.0 census+!important）> 手工玻璃层（mineradio.module.css，按 data-dsh-float/composer-card/sidebarCol）。activeScheme L837–L839 读 body[data-ds-dark-theme]；theme/change 双 store 重渲染。

### 5.3 区域背景

全局地基：bg-base 等半透明透底 + census ground/structure transparent !important（README 自测 97% 背景归 token）。底部二选一 fixed 层：[critters.ts L89–L107](https://raw.githubusercontent.com/dhicoc/dsh-theme-mineradio/HEAD/src/client/critters.ts) ambient(div)+fluid canvas + wallpaper-layer(img/video loop playsinline)，CSS L244–L340 fixed inset:0 z-index:-1，dataset.background 翻 fluid/wallpaper（L1361–L1363）；用户自供无内置（input image/* + video/mp4,webm,ogg,quicktime + FSA video/* .mp4/.webm/.ogg/.mov/.m4v/.mkv，[AppearanceRow L171–200/380–394](https://raw.githubusercontent.com/dhicoc/dsh-theme-mineradio/HEAD/src/client/MineradioAppearanceRow.tsx)；大视频 IDB dsh-aqua-media 标记 idb:/fsa:，[wallpaper-store.ts](https://raw.githubusercontent.com/dhicoc/dsh-theme-mineradio/HEAD/src/client/wallpaper-store.ts)，小视频 data: URL）。侧栏/对话/输入/overlay：sidebar-fill transparent + nav active/hover + bubble/markdown + input-major + menu/tip/toast/tooltip + role pane/overlay + 手工玻璃（css L662–L760/L922–L1017/L114/L151/L164–L180/L1087–L1165；伪元素浮层落 ::before；background-image 刻意不动）。装饰全程序化（fluid-shader/star-river/whale/mesh/spotlight/dispersion；fluidHue+station+autoTint；reduced-motion 停；perf 三档）。

### 5.4 音乐/视频

视频有、音乐无。播放 [theme-layer.ts L1396–L1467](https://raw.githubusercontent.com/dhicoc/dsh-theme-mineradio/HEAD/src/client/theme-layer.ts)：isVideo=data:video//idb:/fsa:（L1370）→IDB objectURL（L1399–L1412）/FSA 重读（L1416–L1434）/小视频 data:（L1440–L1442）；非壁纸 pause+清 src（L1445–L1447）。自动播放 L1460–L1467 loop=true + play().catch→muted 重试（注释 autoplay with muted fallback；直连 \<video> 以便 backdrop-filter 采样）。格式见 §5.3；默认 background:'fluid'、wallpaper:''（L480–L481）即视频默认关；videoBlur 6px、videoBrightness 45（L499–L500）罩层 alpha 保文字（L1342）。audio-reactivity（[audio-reactivity.ts](https://raw.githubusercontent.com/dhicoc/dsh-theme-mineradio/HEAD/src/client/audio-reactivity.ts)，getUserMedia→Analyser→三包络，默认 audioReact:false L489）为麦克风视觉脉动，无 \<audio>/mp3/播放列表。station-dial（[station-dial.ts](https://raw.githubusercontent.com/dhicoc/dsh-theme-mineradio/HEAD/src/client/station-dial.ts)，[radio.md](https://raw.githubusercontent.com/dhicoc/dsh-theme-mineradio/HEAD/docs/radio.md)）为 workspace→hue 隐喻（TUNE_MS 2200ms、FM 044），不发声。

## 6. 未验证事项（明确写出，不猜）

1. DSH 宿主 design-platform token 语义与 ThemePresenter 落点（body 内联 + data-ds-dark-theme + 字号/字族变量）引自本仓 #96 §2–§3 与各插件注释，未在本轮拉取宿主仓逐行核对；各仓“覆盖/未覆盖”指本仓可见范围。
2. 全仓穷举受限：取数时段 GitHub API 匿名配额 403，改用 raw 单文件 + gh（已登录）文件清单 + 本地 shallow clone（dream/prts）补齐；“零内置 mp3/mp4”“无 overrideTokens”等否定结论均已注明检索范围（文件/字符数/误报排除），行号以 HEAD 当日 raw 为准（CHANGELOG 迭代快，拼入 #100 时建议保留文件链+token 名、行号作约读）。
3. 输入框/新组件选择器存在版本漂移面：bloom/open-sea/prts/mineradio 均有“宿主改版致 hash/结构失效则 no-op/回落默认”的注释与兜底；仅读源码未做 DOM 实测，#100 引用时应标“源码级，未实测”。
4. open-sea npm 主包 vs harness-plugin 源码两条链路勿混用（后者未发布，前者默认走自注入+iframe）；dream 主题包 glow/defaults 不跟包（schema v1 边界）；mineradio 视频“含音频轨取决于用户文件，策略下静音”。

## 7. 来源清单（一手）

- 5 仓库首页与包 manifests、patch、lib/client（HEAD/main raw）见各节内链；dream 本地 clone 复核（.scratch/skin99，未进包）；prts [jsDelivr 1.4.2 清单](https://data.jsdelivr.com/v1/packages/npm/@ash-qw/dsh-theme-prts@1.4.2)。
- DSH 机制背景：本仓 [#96](https://github.com/FeatherHunter/dsh-opencode-palette/issues/96) §2（ctx.theme/overrideTokens/validateOverrides/ThemePresenter）与 [#98](https://github.com/FeatherHunter/dsh-opencode-palette/issues/98) Notes/Standing preferences。
- 子调研 markdown 片段（5 份，约 12k 字符/份）已合入上文，不另存。
- 对抗复核 clone（depth 1，2026-10-18）：bloom / open-sea-skin / mineradio（.scratch/skin99b，已清理）；dream / prts 首轮已 clone 穷举（.scratch/skin99，已清理）。

## 8. 对抗审查（第一性原理·证据链重审，2026-10-18）

> 口径：只审本篇（#99），逐条把核心结论打回一手源码行，裁决三档——【实证】原文行可点名 /【推断】源码+常识但缺宿主侧闭环 /【缺席】零命中否定（注明检索域）。推翻项当场改正文（bloom 字体条），其余成立项补强引用。

### 8.1 裁决表

| # | 被审结论 | 裁决 | 对抗过程与一手行 |
|---|---|---|---|
| A1 | bloom“自注入、不走 overrideTokens” | 【实证】成立 | clone 穷举 src 内 `overrideTokens|ctx.theme` 零命中；node 半侧仅只读版本号端点（src/index.ts）；三表经 dom.ts injectCSS 进 `style[data-plugin-css]`。与原子报告一致，无需改。 |
| A2 | bloom“无 font-family、不改字族” | 【实证】成立、引注推翻 | clone 穷举 `font-family` 实为 4 命中（lib/client.js:2806/:2957 即 switcher.ts:209/:360 的构建产物），作用域全是自家切换器（诗句列 `.dsh-bloom-option__en` Songti 衬线 + 版本号 `.dsh-bloom-dsh-ver` 等宽，注释明示“只在这一列用宋体”“正文保持无衬线”）。宿主字族结论成立，但原子报告“0 命中”失实——正文 §3.1 与横向表已按本条修正。另 `src` 内 `url(` 零命中补测通过，渐变背景结论不变。 |
| A3 | bloom“无音视频” | 【缺席】成立（域内） | src 全域 `mp3\|mp4\|webm\|ogg\|wav\|audio\|video\|<audio\|<video\|autoplay` 零命中（本轮 clone 实测）；lib 头 100k 同零。否定仅及检索域，行文已注“域内”。 |
| A4 | open-sea“双路径二选一” | 【实证】成立 | `ctx.theme.overrideTokens` 亲测在 [harness-plugin/src/client/index.ts:77](https://raw.githubusercontent.com/d-dev0101/open-sea-skin/HEAD/harness-plugin/src/client/index.ts)（`disposeTokens = next.enabled ? overrideTokens(PACKAGE_NAME, glassTokens(next.glass)) : undefined`），九 token 表 glassTokens L39–L53 逐行点名；发布包自注入 `__open-sea-skin-glass__`（skin-core L310–L330）与 architecture.md 双轨自述互锁。 |
| A5 | open-sea“无音视频、无背景图” | 【缺席】成立（域内，误报已排除） | 25 命中逐条核对全系误报：`wavelength`（ocean.js:70 波长变量）、`depthTexture`（three.webgpu.js:394)、`wave-diagram`（website 官网样式）；`url(` 仅字体 woff2 与官网 jpg（website/site.css:253，不进插件渲染）。宿主字体 114 命中全系 Geist（iframe/官网）与自家面板 `-apple-system`，无 `--dsw-font*` 写操作——“不改宿主字体”为有证据的缺席。 |
| A6 | mineradio“override 主 + census 辅” | 【实证】成立 | theme-layer.ts:1559 `this.ctx.theme.overrideTokens(` 亲测；L98 `'--dsw-font-family': both(FONT_STACK)` 亲测（含 L97 注释）；README §50 双轨自述与 build-client.mjs 注入互锁。bundle 单行（lib/client.js:137，minified）致 grep 虚增——凡引 bundle 行均以 src 为准，行文已注。 |
| A7 | mineradio“视频有、音乐播放无” | 【实证】成立、措辞补强 | `<video data-dsh-aqua-wallpaper-video loop playsinline>`（critters.ts:107）、拾取器视频格式表（AppearanceRow.tsx:181）、loop+muted 兜底（theme-layer L1460–L1467）三链完整。`AudioContext` 仅出现在 audio-reactivity.ts（mic→Analyser→粒子包络，默认关）与 CHANGELOG“随音乐律动”——第一性原理区分：**播放能力（解码/出声）零证据，响应能力（随环境声视觉脉动）有证据**。正文“音乐播放无（仅麦克风视觉脉动）”措辞已精确，不断言“无音乐相关能力”。 |
| A8 | dream“register+单次 override、57 token、无音视频” | 【实证/缺席】成立 | 首轮本地 clone 全仓 `mp3\|mp4\|webm\|ogg\|wav\|<audio\|<video\|autoplay` 零命中；SKINS 八段 L423–L935 + COMBINED_OVERRIDE_SOURCE L2360/L2386–L2397 + themes-spec 白名单互锁。clone 已清理，复测记录备查。 |
| A9 | prts“自注入、无 override、无音视频” | 【实证/缺席】成立 | 首轮 clone：`overrideTokens` 20 文件零命中；`theme.register` 同零；`setTheme` 仅读宿主日夜（controller-v2 L681–L711）；音视频模式串零真命中 + jsDelivr 清单无媒体扩展名。clone 已清理。 |
| A10 | “5 家无音乐播放”共性 | 【推断】成立、边界收窄 | 5 家“播放”皆零证据；但 mineradio 麦克风律动在有环境音乐时构成弱音乐响应——共性行“音乐播放 5 家全无”指播放能力，不含响应面，特此收窄，防 #100 误读为“与声音完全无关”。 |

### 8.2 方法论自检

- “零命中否定”有效，但仅及检索域：本轮把每条否定都重跑到本地 clone 全文（含 vendor/官网/CHANGELOG），误报逐条点名（wavelength、depthTexture、toggle），不再是“raw 头 100k”弱证据。bundle 单行（mineradio lib/client.js:137、prts 1MB 产物）不计数，行号一律以 src 为准。
- “宿主落点”（body 内联、ThemePresenter）仍是【推断】：引自 #96 与各插件注释，未拉宿主仓闭环——#100 引用须标“插件侧实证+宿主侧转述”，不得写成“宿主源码已核”。
- 未做 DOM 实测：选择器漂移（hash 类、slot 名）只在源码级成立，#100 表格建议加“源码级”列注。
