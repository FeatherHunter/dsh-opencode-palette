# 13 仓库横向综合对照表（#100，只综合不设计）

> 目标票：[#100](https://github.com/FeatherHunter/dsh-opencode-palette/issues/100)（父地图 [#98](https://github.com/FeatherHunter/dsh-opencode-palette/issues/98)）。
> 版本日期：2026-10-18（Asia/Shanghai）。
> 方法：只复用本仓既有 4 篇深挖，不新查一手源码（4 篇已覆盖全部 13 仓、代码级文件+行证据；新查适用条件未触发——不适用原因：既有笔记已回答本次问题，无缺口需要新查）。产物只链不贴：结论行链深挖与上游一手行，不粘贴全文。
> 范围：只综合、不设计新方案（地图 98 Out of scope：我们自己 JSON theme 包的设计与实现另议）。下文"给未来 JSON 包的事实输入"只列观察到的必须覆盖的事实面，不提任何 schema/字段设计。

## 复用既有一览（路径 + 一句话结论，不粘贴全文）

| # | 路径 | 一句话结论 |
|---|---|---|
| 99 | `docs/research/skin-5-repos-99.md`（168 行，含 §8 对抗裁决 A1–A10） | 5 整包皮肤：颜色全经 alias/specific 语义 token 或同名 CSS 覆盖生效；动态感走 gradient/canvas/程序化粒子，只有 mineradio 接用户视频文件；5 家音乐播放全无（mineradio 麦克风律动仅响应面）。 |
| 102 | `docs/research/color-appearance-catppuccin-claude-ui-102.md`（153 行，pins `94af6d7`/`d773a62`/`e64243a`） | 3 配色外观：catppuccin 整套风味注册、claude-style scoped 皮肤+字体全栈+壁纸让位、ui-appearance 角色色推导+自有图文视频背景层；三者命名都贴宿主 `--dsw-*`。 |
| 103 | `docs/research/wallpaper-dynamic-background-103.md`（175 行，pins engine `01fbb8b8`/any `bf36b0938`/model `893d1b7e`，v2 对抗已收敛） | 3 动态壁纸：挂载位一致（body 级 fixed -1/-2 + 页面透明化）；寻址三分（同源 token URL / 同源 serve URL / blob object URL）；仅 model 跟随模型；自动播放约定 muted+loop+autoplay+playsinline；三仓均无独立 BGM 通道。 |
| 101 | `docs/research/special-integration-maid-beautiCode-101.md`（140 行，6 项修复已合入） | 2 特殊集成：maid 缩进对话列内部静态图-only（随包指纹分发），beautiCode 铺满视口图文视频（引用用户本地文件+回环服务）；两者均无独立音频；卸载证据 maid 可验证还原 vs bc 未见代码。 |

## 列口径收敛（先收敛再填表，#100 Question 要求）

| 列 | 定义（本表内含义） | 取值封闭集 |
|---|---|---|
| 生效范式 | 颜色/样式以何种机制赢得层叠 | `register`（宿主注册合并） / `overrideTokens`（宿主覆盖层） / `self-inject`（自注入 \<style> + 选择器/!important） / `bridge`（页面注入桥接脚本） / 组合（主+辅注明） |
| token/字体字号 | 管哪些 token；字体/字号是否接管宿主 | token 面只记命名族（alias/specific/私有族/shiki/角色推导），字体记接管与否+来源（自带/用户自放/CJK 回退），字号记接管与否 |
| 区域背景锚点与类型 | 背景挂在哪、盖住什么、属哪类内容 | 锚点：`page-fixed`（body 级 fixed -1/-2） / `column-inner`（列内跟随布局） / `iframe-live`；类型：`none`/`pure`/`gradient`/`image`/`video`/`canvas`/`svg-procedural` |
| 静态图寻址 | 图片 bytes 如何到像素 | `bundle-relative`（随包指纹相对路径） / `serve-url`（同源路由 URL/token） / `blob-url`（内存 objectURL + dataURL 持久） / `local-abs-loopback`（绝对路径+回环媒体服务） / `none` |
| 视频与自动播放 | 视频有无、格式、自动播放写法 | 有/无 + 格式表 + 自动播放属性组（原文照录，不归纳为"都一样"） |
| 音乐/音频 | 有无可出声的播放通道 | 只认"播放能力（解码/出声）"；响应/可视化/信息展示另行注明，不计入播放 |
| 切换信号 | 背景/主题因何而换 | 宿主亮暗属性 / 模型选择 / 定时轮播 / 手动 profile / 自有 tone 状态机 / 用户换文件 |
| 版本 pin | 本表事实有效的版本锚 | 各仓取证 SHA/版本号（行号以 pin 时刻为准，后续漂移以文件+符号为准） |

## 表 A：生效范式 × token × 字体字号 × 区域背景

| 仓库 | 生效范式 | token/变量（命名族） | 字体/字号 | 区域背景锚点与类型 |
|---|---|---|---|---|
| [dsh-dream-skin](https://github.com/RevolutionLA/dsh-dream-skin) | `register`（8 皮肤标量）+ 单次 `overrideTokens("dsh-dream-skin:appearance")`（DIY 三叠加合并）+ 自注入材质 \<style>（只管液态玻璃不管色） | 57 枚/皮肤（alias bg/label/brand/button/border/interactive/file-diff/state/markdown/scrollbar + specific sidebar/nav/input/tip/selector/bubble；Accent/POPUP/wash 三叠加；主题包白名单 bg-base/layer-1/label/brand/border） | 不管（57 token 零命中 font/size；仅设置面板行内 `fontSize:"13px"`） | token 改色 + `page-fixed` 壁纸 \<div>（fixed inset:0 z-index:-1，`backgroundImage` url/gradient，cover/contain + blur 0–60px + bleed 垫底，kind 仅 image/url/gradient）+ 每皮肤 glow 弥散光；无视频 |
| [open-sea-skin](https://github.com/d-dev0101/open-sea-skin) | 双路径二选一：源码集成 `overrideTokens` 玻璃层 / npm 发布包自注入 `__open-sea-skin-glass__`（!important）+ 同源 iframe | 9 背景系（bg-base/layer-1..3/module-platform/multi-select/overlay/sidebar-fill/selector；bg-base light glass/72、dark 回落算法见深挖 §2.1） | 不管（Geist @font-face 只用于 ocean iframe/自家面板） | 掏底 transparent + 半透明 token + `iframe-live` 实时 WebGPU 海洋 canvas（Three.js TSL，12 分钟 daylight cycle）；无 background-image、无静态/视频图 |
| [dsh-bloom-theme](https://github.com/webkubor/dsh-bloom-theme) | `self-inject`（`style[data-plugin-css]` 三表注入 + body[data-bloom-variant]×body[data-ds-dark-theme] 选择器提权；`overrideTokens` 全仓零命中） | 10 套 OKLCH 色板 → alias + specific + 自有 `--bloom-*`；mist 完整骨架其余 9 变体只覆主色+背景调 | 不改宿主字族（font-family 仅自家切换器 2 处：诗句衬线+版本号等宽）；宿主字号仅 tabs clamp + 侧栏 12px 硬写 | token + CSS gradient 氛围 + backdrop-filter 玻璃（::before，劫持 fixed 后代 overlay）；`url(` 全仓零命中；壁纸层 v0.5.0 已移除 |
| [dsh-theme-prts](https://github.com/ash-qw/dsh-theme-prts) | `self-inject`（`html[data-dsh-prts]` 作用域 + !important；读宿主 theme/change 仅同步日夜不写回；`overrideTokens` 20 文件零命中） | 自有 `--prts-*` 族（canvas/elevated/rail/panel/ink/line/品牌/玻璃四档/气泡/头像环/light 整组/session-flow 三色）+ 极少数 `--dsw-alias-*` 转接 | `--prts-body/display/mono` 三字族（Noto Sans SC / Arial Narrow / Roboto Mono 系）；无全局字号 token（自家面板 .875/.75rem + 8/9/11/12px） | token + gradient + 内联 SVG data-URI + JS 生成 SVG/canvas（城市剪影/粒子徽记/ambient/particle 层）；无外部背景图/视频 |
| [dsh-theme-mineradio](https://github.com/dhicoc/dsh-theme-mineradio) | `overrideTokens` 写 body 内联为主 + role census（data-md-role + !important）+ 手工玻璃配方（html 内联 `--dsh-aqua-*`） | alias 全套半透明化 + specific（sidebar-fill=transparent 等）+ shadow；mica/compat 双基表；唯一 `--dsw-font-family`（Inter base64 自托管 + Noto Sans CJK 回退） | 只管字族不管字号（全文件仅一处 dsw-font，无 font-size） | token 半透明化透底 + 底部二选一 `page-fixed` fixed 层：fluid shader canvas 或用户壁纸 \<img>/\<video>；无内置图片/视频资源；装饰全程序化（fluid-shader/star-river/whale/mesh/spotlight） |
| [dsh-catppuccin-theme](https://github.com/NoNameLeGo/dsh-catppuccin-theme) | `register`（每风味 `theme.register({id,colorScheme,tokens})`；用户覆盖最后展开必胜；玻璃是第二条独立链路） | `--dsw-static-*` hex 底层 + `--dsw-alias-*` var()/color-mix() 语义层；`--shiki-*` 11 枚独立正交表；明暗风味自带（latte 光/其余暗） | 不管（1024 行入口零 font 定义；README 无字体说明） | 纯色（风味基座 `--dsw-alias-bg-*`，无独立纯色选择器）；图片/动态/视频无证据；玻璃"氛围底光+辉光"为半透明渐变罩非壁纸层 |
| [dsh-claude-style](https://github.com/Nwflower/dsh-claude-style) | `self-inject`（构建期 tokens.json→stylesheet + 运行期 mount，`body[data-dsh-claude-style]` 作用域 + 定点 !important；互斥靠 parkForeignSheets） | palette 复用宿主语义名 + 私有 `--dsh-claude-*`；变体 PALETTE claude/host × BRAND claude/deepseek；明暗跟随宿主 `[data-ds-dark-theme]` | 全管（JetBrains Mono 包内自带 + Anthropic 三款需用户自放 `$DSH_HOME/.../fonts/` + Claude Style Inter/Noto Serif 包内 OFL + 中文 fallback 到 sans CJK；TYPEFACE claude/host 可让回宿主；字号沿用宿主） | 无自有壁纸，主动让位壁纸引擎（有 `data-we-wallpaper` 时只罩 `body::after` mask z-index:-1 + shell 透明）；纯色 canvas token |
| [dsh-ui-appearance](https://github.com/TQSY114514/dsh-ui-appearance) | `overrideTokens`（`{light,dark}` 对，dispose 精确撤回）+ DOM 写 body 22 个 `--dsw-appearance-*` 变量（rAF 节流；定点 !important 四处） | 6 角色（accent/background/panel/input/text/border）×双模式 + 11 预设；`buildTokenOverrides` 唯一出口；accent 默认反转保气泡可读；可读性数学（mixHex/contrast/luminance/WCAG 二分） | 不管（三文件关键字检索零 font 定义） | 自有 `#dsw-appearance-bg`（fixed inset:-48px z-index:-1）三层合成：base canvas 用户色 + ::before 图片层（cover/opacity/blur≤30）+ ::after scrim 罩；`#root` 刻意不动（防 fixed 菜单 trap 进 stacking context） |
| [dsh-wallpaper-engine](https://github.com/elysia395/dsh-wallpaper-engine) | `bridge` 变体：body 级壁纸层 + 页面透明化（`body[data-we-wallpaper]`），玻璃配方与壁纸无关 | 不定义颜色 token（壁纸→主题方向 theme-follow 可选，默认关） | 不管 | `page-fixed` div `#dsh-wallpaper-engine-layer`（fixed z-index:-2）+ scrim（z-index:-1，恒压界面下）；内容：实时渲染 iframe（webwallgl）/ video / img 静态帧 / live-poster；body.appendChild（过场旧层压 zIndex=-3） |
| [dsh-any-background](https://github.com/Tkingxiao/dsh-any-background) | 壁纸容器 + 界面 token 透明度让位（卸载 teardown 摘整层清 token） | 复用界面 token 做不透明度/模糊（无自立颜色体系） | 不管 | 单层 `page-fixed` div（fixed/inset-0/z-index:-1/pointer-events:none，body.prepend）：image 走 backgroundImage / video 走子 video / mesh-shader-pattern 走子 canvas（低分辨率 + rAF 启停） |
| [dsh-background-by-model](https://github.com/HarmlessFunny/dsh-background-by-model) | 壁纸容器 + 规则→主题（per-image color，无色跟系统；palette-fade token 插值过渡） | 无自立颜色体系（规则自带色） | 不管 | 容器 `page-fixed` + 内双层 cross-fade（absolute/inset-0/opacity，目标层 zIndex=1，纯合成器动画 will-change；reduced-motion 一票否决；首绘硬切） |
| [maid-atelier](https://github.com/Small-tailqwq/dsh-deep-whale/tree/main/maid-atelier) | `self-inject`（`body[data-dsh-maid-atelier]` 作用域；node 半只供资源路由；disposer 按表还原；皮肤管理器 v2 协议互斥） | 20 个 body CSS 变量（`BACKDROP_PROPERTIES` 登记，宫殿/角色/侧栏/输入框/工作区/顶底饰件） | 字体可配（font/workspaceFont 经皮肤协议投影为 html 属性；背景机制外） | `column-inner`：对话列 `[class*=centerCol]` 内部首子舞台（随聊天区同步收缩）+ body 变量驱动各区域伪元素/边框；静态图片-only |
| [beautiCode-harness](https://github.com/starsstreaming/beautiCode/tree/main/integrations/deepseek-harness) | `bridge`（`webserver/index-inject` hook 向每页注入 5 body 脚本；单全局 `current` 经 SSE 广播；8 tools + 3 commands 走同一后端） | 不定义颜色 token（自有 tone + `data-bc-resolved-tone`，三级回退宿主；可读性垫片压实色底） | 不管 | `page-fixed` 全局固定层 `#beauticode-bg-stage`（position:fixed inset:0 z-index:0，无视布局）；poster-first 两阶段（先图片 poster，60s 内首帧升级）；氛围层水波 canvas + gallery |

## 表 B：资源寻址 × 视频自动播放 × 音乐 × 切换信号 × 版本 pin

| 仓库 | 静态图寻址 | 视频寻址与自动播放 | 音乐/音频（播放能力） | 切换信号 | 版本 pin |
|---|---|---|---|---|---|
| dream-skin | 选图→压缩 data URL→localStorage（历史 5 条）/URL/渐变/必应每日+定时刷新；`wallpapers/` 3×.jpg 不打进包不直读；安全阀 http(s)/data:image | 无（`accept:"image/*"`；全仓 music/bgmp3/mp4/webm/audio/video/autoplay 零命中；壁纸 \<div> 非 video） | 无 | 手动选肤 + DIY 叠加 + 壁纸轮播 rotationGroups（后台/隐藏推迟） | v10.16.8（SKINS L423–L935，8 皮肤） |
| open-sea-skin | 无图片寻址（ocean 为实时 TSL 非文件；`url(` 仅字体 woff2 与官网 jpg，不进渲染） | 无（220 项树除 docs 录屏 gif 外无音视频；ocean 常驻 canvas，默认开的是海洋非媒体；README 否定 looping video） | 无 | 手动开关 + daylight cycle（12 分钟）+ reduced-motion 降帧 | npm 主包 vs harness-plugin 源码双链路（后者未发布；本表以后者 glassTokens L39–L53 与前者 skin-core L92/L310–L330 为准） |
| bloom-theme | 无（`url(` 全仓零命中；assets 探针全 404；氛围即渐变） | 无（src + lib 头 100k 全零命中） | 无（卖点仅玻璃+莫兰蒂+微动效） | 手动 variant 10 选 + 明暗跟随 body[data-ds-dark-theme] + matchMedia | v0.17.6（VARIANTS 10，WCAG AA 全达标表） |
| prts | 内联 SVG data-URI + JS 生成 SVG/canvas；徽记 5 阵营 PNG→构建转 data-URI/base64/RLE（`$DSH_HOME/plugins/dsh-theme-prts/emblems`）；光标 data-URI PNG | 无（20 客户端文件音视频串零真命中 + jsDelivr 1.4.2 清单无媒体扩展名） | 无（"声纹/波形/启动序列"系 SVG/CSS 动画隐喻） | 偏好 dataset（scheme/palette/triad）+ 宿主日夜只读同步 | @1.4.2（engines.dsh 0.2.0-rc.2） |
| mineradio | 用户自供（input image/* + FSA；无内置资源） | 用户视频：input video/mp4,webm,ogg,quicktime + FSA .mp4/.webm/.ogg/.mov/.m4v/.mkv；大视频 IDB `dsh-aqua-media` 标记 idb:/fsa: + 小视频 data: URL；播放 `loop=true` + `play().catch→muted` 兜底自动播放（默认 background:'fluid' 即视频默认关；videoBlur 6px/videoBrightness 45 罩保文字；backdrop-filter 直接采样 video） | 播放无（`audio-reactivity` 为麦克风→Analyser→粒子包络视觉脉动，默认关；station-dial 为 workspace→hue 隐喻 2200ms/044，不发声） | 手动（fluid/wallpaper 二选一）+ activeScheme 读宿主亮暗 + theme/change 双 store | mineradio 双基表 MINERADIO vs COMPAT（applyTokens L1556 二选一） |
| catppuccin | 无（无 background-image/video/object-fit 代码） | 无 | 无 | 手动风味 4 选 + 用户覆盖层 + 明暗风味自带 | `@nonamelego/dsh-catppuccin@0.6.3`，HEAD `94af6d7`（2026-10-17） |
| claude-style | 无（无 background-image/video/object-fit；视频职责归壁纸引擎） | 无 | 无 | 手动（palette/brand/motion/typeface）+ 明暗跟随宿主 + 壁纸让位（mask 86%/82% 保可读） | `dsh-claude-style@0.16.2`，HEAD `d773a62`（2026-10-17） |
| ui-appearance | 用户上传 IndexedDB record key（legacy 兼容 inline data URL；`image-store.ts` 持久化；无外部 URL 拉取证据） | 用户视频 IndexedDB（`video-store.ts`）：`\<video muted loop playsInline autoplay>`（ensureVideo L587–594），object-fit:cover，共享透明度/模糊变量，data-video 有则图片层熄灭（video 优先）；`URL.createObjectURL(record)` + onerror 撤层 + onloadeddata 上报；无播放控制 UI（存/清 key 而已） | 无（全程静音；muted 写死） | 手动角色色/预设/不透明度/模糊 + data-video 图片视频互斥 + data-dsw-has-bg frame 透明 | `dsh-ui-appearance@0.1.23`，HEAD `e64243a`（2026-10-16） |
| wallpaper-engine | 同源 token URL（`GET /wallpaper-engine/media/<token>`，token=绝对路径 base64url，进程内 mediaMap 回查磁盘；Range/HEAD/条件 GET；scene.pkg ETag/304 + loopback media-origin；预览 preview/ + 上传 `~/.dsh-wallpaper-engine/uploads`） | 同管道 media token（容器后缀宿主 mediaExt 下发；场景内嵌 MP4 另有 scene-video/；缩略 video-preview/ ffmpeg 抽帧 JPEG；pinnedFastStart + moov 前置；纯 video 主路径 `autoplay/loop/preload:auto/playsinline` + `isEffectivelyPlaying` 调 play()/pause() + 过场音频门 + 预热 metadata-only TTL 20s；WE 动图 preview 不作 poster） | 无独立 BGM 通道（壁纸自带音轨随音量/壁纸音轨设置 + live iframe muted query；README"音乐联动"系系统输出回环频谱 + Now Playing 信息/封面/按需歌词，属信息展示面） | 手动选择 + 用户轮播 rotationGroups；按模型不支持（picker-model 系选择器过滤；theme-follow 系壁纸→主题反方向） | `dsh-plugin-wallpaper-engine@1.3.3`，pin `01fbb8b8` |
| any-background | 同源 serve URL（`/dsh-any-background/wallpaper` + `?r=rev` 缓存破坏；RPC read 只回 URL 不回 bytes；raw bytes 仅 upload POST 与主题导出 dataURL 内嵌 `dsh-any-theme.json`；服务端盘 `.dsh-any-background-data/`；网络 URL 下载进槽 25MB/20s） | 同源 `/dsh-any-background/video`（槽按 MIME 命名 mp4/webm/ogv/mov/mkv，2GB 上限；`muted/loop/autoplay/playsInline/preload:auto` 双写 + 先 append 后设 src + `play().catch` 静默 + `getAttribute(src)` 比对防重播；placement 映射 object-fit；video 帧复用抓帧供预览/取色） | 无（muted=true 写死；全程静音） | backgroundType（image/video/mesh/shader/pattern）+ 手动 profile（activeProfile + day/night schedule）+ 轮播池（服务端 copy 进槽，reload/daily/weekly）；按模型不支持 | `dsh-any-background@0.3.8`，pin `bf36b0938` |
| background-by-model | slot raw bytes（无扩展名一图一文件；MIME 魔数嗅探；legacy 一次性迁移）→ RPC dataURL（`readSlotAsDataURL`）→ 绘制 `displayImageOf` 转 blob: object URL 缓存（替换旧 URL 延迟 2s 回收防 fade 中 blank；无 createObjectURL 回退直用 dataURL）；预设图 jsDelivr 镜像引用 | 无视频（v0.3.0 breaking 移除 video wallpapers；wallpaper.ts 全文件零 video 命中；动态仅 cross-fade + palette-fade token 插值） | 无 | 按模型：有序规则 `matchRule`（大小写不敏感子串首命中；空 match 永不命中；无命中回落首个 usable；provider+id+display 名）× watchModel 三跳（durable modelSelection faceOf + modelDirectories + host 默认兜底；会话 id 兼容两代）+ advanceOnSwitch 步进 + 规则内 rotation（interval 5s–24h/shuffle/隐藏页停转/跨规则 rotIndex=0） | `dsh-background-by-model@0.8.2`，pin `893d1b7e` |
| maid-atelier | 随包分发（`skin-assets/maid-atelier/<sha64>.webp` 指纹化，node 半 `installSkinAssets` 注册路由；immutable 一年 + ETag/304 + 仅 GET/HEAD；客户端所见全 \<img>；`runtime/manifest.json` 31 项全 png/webp） | 无（入口完整读 + 样式 2539 行 + 产物前 100KB 零命中 + 类型清单全 .ts/.css + 文档互证） | 无 | 五维：宿主亮暗 MutationObserver + 着陆/对话 data-phase + 模型 Pro/Flash（作曲栏按钮→html[data-dsh-whale-model]）+ SFW 总开关/时段 + 设备拥挤/低功耗/700px 自适应 | `dshCompatibility=0.2.0rc2`（skin.build.json 指纹/源码提交同步） |
| beautiCode-harness | 本地绝对路径引用（不复制用户文件；Windows 强制 local 引用；回环媒体 URL `http://127.0.0.1:<port>/…?t=<token>` Range 支持；64 hex token + 同源/Desktop-key 双验） | 图片 jpg/jpeg/png/webp/avif ≤18MB + 视频 mp4/mov ≤800MB；`video{autoplay,loop,playsInline,preload:auto,muted}` + 先期望播放失败回退 muted；poster-first 两阶段（60s 首帧升级 `VIDEO_SETTLE_TIMEOUT_MS`；图片 3000ms×2；冷启动黑帧预热；startAt seek 差值 0.25s；`CLIENT_APPLY_DEADLINE_MS=8000`） | 播放无（声音=视频轨 muted 开关，默认 muted:true） | 自有 tone 状态机 + `data-bc-resolved-tone`（三级回退宿主 data-ds-dark-theme→colorScheme→OS，双 Observer）+ SSE 全页广播；模型无关 | `beauticode-dsh@1.0.28`，`bridgeProtocol=4` |

## 跨仓事实（只收敛分歧，不设计）

1. 生效三条路（13 仓全覆盖）：宿主注册/覆盖（dream register、catppuccin register、open-sea 原生 overrideTokens、mineradio overrideTokens 主、ui-appearance overrideTokens + body 变量）/ 自注入 CSS（bloom、prts、open-sea 发布包、claude-style scoped、maid、mineradio 辅层）/ 桥接与容器（engine/any/model/beautiCode 的 body 级固定层 + 页面透明化）。同一效果可由任一路达成，叠加语义由宿主层序决定（#102 留给本表的层序仲裁缺口依然存在：三仓命名都贴 `--dsw-*`，叠加时谁赢取决于宿主注册顺序，本轮未深挖仲裁，标缺口不猜）。
2. 背景挂载两哲学：`page-fixed`（engine -2+scrim -1 / any -1 / model -1+内双层 / ui-appearance -1 三层 / beautiCode z-0 / mineradio fluid/wallpaper 二选一）vs `column-inner`（maid 对话列内部，唯一跟随布局收缩）。JSON 若要统一区域口径，必须区分这两类锚点（#101 输入，原样收敛）。
3. 资源寻址四制：bundle 指纹相对（maid）、同源 serve/token URL（engine/any）、blob objectURL + dataURL/IndexedDB 持久（model/ui-appearance/dream localStorage 历史）、本地绝对路径 + 回环服务（beautiCode）。通用包需同时容纳相对与绝对两类路径（#101 输入，原样收敛）；`?r=rev`/ETag/Range/immutable 一年等缓存语义各仓自立，无统一契约。
4. 视频自动播放五件套（有视频的 5 仓逐字对照）：engine `autoplay/loop/preload:auto/playsinline + isEffectivelyPlaying`、any `muted/loop/autoplay/playsInline/preload:auto + play().catch`、model 无视频、mineradio `loop + play().catch→muted`、ui-appearance `muted/loop/playsInline/autoplay`、beautiCode `autoplay/loop/playsInline/preload:auto/muted(+期望回退)`。交集是 muted+loop+autoplay+playsinline，但 preload/catch/回退/占位策略各异，不宜归纳为同一实现。
5. 音乐结论（13/13）：无一家提供独立 BGM 播放通道。engine 的系统回环频谱/Now Playing、mineradio 的麦克风律动、prts 的"声纹"SVG 均为响应/展示面，非播放能力；any/model/beautiCode 全程 muted 或无音频面。未来包如需 BGM，无现成事实输入（#103 §5.5 原话收敛）。
6. 按模型切换（13 仓仅 1 家真做）：background-by-model（有序子串首命中 + fallback rule 1 + advanceOnSwitch + 规则内 rotation）。dream 的 picker-model 系选择器过滤、engine 的 theme-follow 系壁纸→主题反方向、maid 的 Pro/Flash 系作曲栏按钮读数，均非"会话模型→壁纸规则"语义，不可混为一谈。
7. 字体/字号（13 仓仅 2 家接管字族、0 家接管全局字号）：claude-style 全栈（自带+用户自放+CJK 回退+host 让回）、mineradio 仅 `--dsw-font-family`、prts 自有三字族（不写宿主）；其余 10 家沿用宿主。字号 13 家全部沿用宿主（仅硬写局部：dream 设置面板 13px、bloom tabs clamp/侧栏 12px、prts 自家面板组、claude 表格回退 14px）。
8. 卸载/还原（证据强度分级）：可验证还原（dream 持久化补偿、mineradio removeOverrides + 摘属性、ui-appearance dispose 精确撤回、maid disposer 按表还原、any teardown 摘层）vs README 级断言（beautiCode 1866 行无 teardown 代码证据）vs 版本兜底（bloom/prts/open-sea 的 hash/结构漂移 no-op 回落）。

## 给未来 JSON theme 包的事实输入（只列需覆盖面，不设计字段）

- 颜色：alias 全套 + specific（sidebar/input/menu/bubble/tip/selector/overlay）+ shadow；私有族（bloom/prts/claude/mineradio/aqua/glass/appearance）；shiki 代码色正交表；light/dark 对（风味自带 vs 每 token 自带 vs 跟随宿主）；用户覆盖层（白名单/消毒/最后展开必胜）；可读性数学（mixHex/contrast/luminance/WCAG 二分/反转/罩层 alpha）。
- 字体：字族栈 + 自带 base64/woff2 vs 用户自放目录 vs 系统回退（含 CJK/等宽/衬线分组 + x-height 匹配不断行）；让回宿主开关（TYPEFACE host）；字号本轮无全局接管事实（仅局部硬写点）。
- 区域：全局/侧栏/对话列/输入框/overlay 菜单/气泡/代码块/表格/顶栏，每区透明度 + 模糊（blur 上限各仓自立：ui-appearance 背景 30/glass 20、mineradio videoBlur 6 等）+ scrim/罩层 + hairline 分割 + stacking 约束（#root 不动、::before 劫持 fixed 后代、popover 自带 shadow）。
- 背景内容：none/pure/gradient/image/video/canvas（WebGPU/Three TSL/低分辨率 rAF）/SVG 程序化（剪影/粒子/纹理）/iframe-live（webwallgl + sandbox）；per-image color（model）vs 单 color（any）vs 无色（其余）；global-rotation vs per-rule-rotation（含 advanceOnSwitch）必须区分。
- 资源：相对指纹路径（immutable/ETag）/ 同源 serve-token URL（Range/HEAD/rev）/ blob objectURL（2s 延迟回收）/ dataURL 内嵌（主题导出先例：`dsh-any-theme.json`、`dsh-background-by-model-theme.json`）/ 本地绝对路径 + 回环 token 服务（Range/鉴权）；上传 caps（18MB 图/800MB 视频/2GB 槽/25MB 拉取）与失败回退（onerror 撤层/回落默认/诚实 null）。
- 播放：muted/loop/autoplay/playsinline/preload + `play().catch` 静默 + muted 重试兜底 + 首帧预算/stall 自救/warmup metadata-only/60s 首帧升级/8s 应用 deadline；音频轨取决于用户文件且策略下静音（mineradio 注释原话）。
- 信号：宿主亮暗属性（MutationObserver/双 store）/ 会话模型 faceOf 三跳 / 定时（schedule/rotation interval/shuffle）/ 手动 profile-variant-palette-brand-tone / 自有 tone 三级回退 + SSE 广播 + ack 回执。
- 版本与证据：每机制标注来源仓库 + pin（SHA/版本号）+ 文件+符号；行号作约读（CHANGELOG 迭代快）；"零命中否定"仅及检索域（检索式见各深挖 §5/§8）；源码级未实测 DOM（选择器漂移面标注）。

## 证据缺口（不拦本票关闭，转交未来包自查）

1. 宿主侧仲裁：`--dsw-*` 叠加层序、ThemePresenter body 内联落点、design-platform token 语义，仍是插件侧转述（#99 §6.1），未拉宿主仓闭环。
2. 行号漂移：行号以各深挖 pin 时刻 raw 为准；复用时以文件+符号为准，行号作约读。
3. engine 新层 append 时机、model RPC read 图片字段名两处未逐行核对（#103 §5 降级为文档+行为描述），不影响本表挂载/寻址结论。
4. 三仓 dist/lib 构建产物未读；行为结论全部来自源码与文档，无运行时验证（符合只读要求）。
5. "无字体/无背景/无音乐"均为源码关键字检索阴性结论（检索词与误报排除见各深挖），以上游取证 SHA 为准过期。
