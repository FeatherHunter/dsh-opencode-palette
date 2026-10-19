# 动态壁纸系实现原理：一手源码研究（回答 #103）

- 版本日期：2026-10-18（Asia/Shanghai）
- 目标票：FeatherHunter/dsh-opencode-palette#103；父 map #98（为未来 JSON theme 包提供事实输入，本次只调查不设计）
- 方法：只读一手来源（GitHub 仓库源码、README、package.json、manifest/client 入口），只读不安装不运行。下文每个结论标注“文件 + 关键符号/行”，行号以 pin commit 时刻为准；不引二手博客。
- Standing preferences：分篇深挖 + 综合对比；代码级生效链路（文件路径 + 关键行 + 为什么生效）；音乐/视频含自动播放与格式细节。

## 目录

- [0. 结论总表](#0-结论总表)
- [1. dsh-wallpaper-engine（Scene/Web 实时渲染 + 视频直放）](#1-dsh-wallpaper-engine)
- [2. dsh-any-background（图片 / 视频 / 生成式同层）](#2-dsh-any-background)
- [3. dsh-background-by-model（按模型规则换静态图）](#3-dsh-background-by-model)
- [4. 三仓横向对照](#4-三仓横向对照)
- [5. 不确定项 / 证据缺口](#5-不确定项--证据缺口)
- [6. 对抗审查记录（2026-10-18 v2）](#6-对抗审查记录2026-10-18-v2)
- [附录：复现命令（含 fetch 过的 URL）](#附录复现命令)

## 0. 结论总表

| # | 维度 | wallpaper-engine | any-background | background-by-model | 来源列 |
|---|---|---|---|---|---|
| T1 | 插件形态/入口 | npm 包 dsh-plugin-wallpaper-engine@1.3.3；exports ./client 经 scripts/build-client.mjs 由 src/client.js 内联生成 lib/client.js；dsh.client inject runtime、immediately:true；host 行 wallpaper-engine（inject webServer，无 headless 挂载） | npm 包 dsh-any-background@0.3.8；exports ./client 为 tsdown 打包 src/client/index.tsx；dsh.client inject 五件套 immediately:true；host inject connection+webServer | npm 包 dsh-background-by-model@0.8.2；client 入口与 any 同构（另有 ./invariant）；dsh.client 同五件套；RPC 通道 /dsh-background-by-model | engine package.json:exports/dsh；any package.json:exports/dsh；model package.json:dsh + src/client/rpc.ts:6-8 |
| T2 | 壁纸层 DOM/层级 | div#dsh-wallpaper-engine-layer.we-layer（fixed，z-index -2）+ div.we-scrim（z-index -1）；body.appendChild；body[data-we-wallpaper] 让页面透明露出底层 | 单层 div（fixed/inset-0/z-index -1/pointer-events none/overflow hidden）；body.prepend；图片走 backgroundImage，视频走子 video，生成背景走子 canvas | 容器 div[data-dab-wp]（同 any 的 fixed/-1/prepend）内含双层 div[data-dab-wp-layer]（absolute/inset-0/opacity 0）；切换时前后层 zIndex 1/0 cross-fade | engine src/styles-base.js:97,209 + src/live-layer.js:288-296；any src/client/wallpaper.ts:2850-2855；model src/client/wallpaper.ts:1283-1303,1501-1502 |
| T3 | 静态图寻址 | 同源路由 GET /wallpaper-engine/media/加 token（token=文件绝对路径 base64url，进程内 mediaMap 回查磁盘；Range 支持）；预览 preview/加 token；上传存 ~/.dsh-wallpaper-engine/uploads | 同源 serve URL /dsh-any-background/wallpaper；RPC read 只回 URL 不回 bytes；上传 POST raw bytes；setWpImageUrl 做 rev 生效 | 无 HTTP 图片路由用于绘制：modelbg-加 slot 的 raw bytes 经 RPC 以 dataURL 读写，客户端 displayImageOf 转 blob: object URL 缓存绘制 | engine lib/inventory.js:295,301 + lib/routes/media-bytes.js:30-55；any src/client/rpc.ts:6-10（6 VIDEO_SERVE_URL；8 WALLPAPER_SERVE_URL）+ rpc.ts:69-71（both travel as serve URLs—never bytes）+ src/client/state.ts:93；model src/index.ts:9-10,38,433-462（433-438 sniff魔数；442-462 readSlotAsDataURL函数体）+ src/client/state.ts:61-87 |
| T4 | 视频寻址/格式 | 同上 media/加 token；容器后缀由宿主 mediaExt 下发（客户端不猜扩展名）；场景内嵌 MP4 另有 scene-video/；缩略图 video-preview/（ffmpeg 抽帧 JPEG）；pinnedFaststartVariant + moov 前置；serveFile Range/HEAD/条件 GET | 同源 /dsh-any-background/video；按 MIME 命名槽文件（mp4/webm/ogv/mov/mkv）；2GB 上传上限；导出 dsh-any-theme.json 内嵌 dataURL | 不支持视频（v0.3.0 breaking 移除，见 README 与 CHANGELOG） | engine lib/inventory.js:296-300 + lib/routes/media-bytes.js:30-57（serveFile Range/HEAD/条件GET）+ lib/mp4-vfs.js + src/video-layer.js（pinnedFaststartVariant+moov前置/抽帧；README L90/L220仅作支持性旁证）；any src/index.ts:57-65,41 + README L70；model README.md:14 |
| T5 | 按模型切换 | 无。picker-model.js 只是选择器过滤（类型/分级/分页）；theme-follow.js 是壁纸到主题（反方向，默认关）；切换维度是用户轮播列表 rotationGroups | 无。切换维度是 backgroundType（image/video/mesh/shader/pattern）+ 手动 profile（activeProfile，另有定时 schedule）+ 轮播池（reload/daily/weekly，服务端 copy 进 wallpaper 槽） | 有：有序规则 matchRule（大小写不敏感子串首命中，空 match 不命中，无命中回退首条 usable）；监听会话 durable modelSelection（faceOf）+ modelDirectories + host 默认；模型切换可触发所属规则 advanceOnSwitch 步进 | engine src/picker-model.js:94-140 + src/theme-follow.js 头注；any src/client/index.tsx:385 + src/index.ts:133-138,830-842；model src/client/modelbg.ts:64-78,116-310（64-78 matchRule；148-180 resolveMainSessionId；192发起watchModel；229 faceOf('modelSelection')；275 modelDirectories；200-310三跳+host默认兜底）+ src/client/index.tsx:334-348,469 |
| T6 | 自动播放 | video autoplay=true, loop=true, preload=auto, playsinline；applyVideoPlayback 按 isEffectivelyPlaying 调 play()/pause()；WE 动图 preview 不作 poster（防先播预览）；场景/网页 live 走 WebWallGL iframe（sandbox=allow-scripts）+ muted query | video muted/loop/autoplay/playsInline/preload auto；挂载后 play().catch；属性比对防重复换源（比 getAttribute(src) 而非解析后 URL） | 无视频故无自动播放；切换动画是双层 opacity/transform cross-fade（transitionPlan，prefers-reduced-motion 一票否决，首绘硬切） | engine src/video-layer.js:248-259（纯video主路径：autoplay/loop/preload auto/playsinline/playbackRate）+ src/media-prep.js:630-638（sceneVideo分支）+ src/client-audio-playback.js:155-163；any src/client/wallpaper.ts:3050-3069；model src/client/transition.ts:102-125（transitionPlan；98-101为reducedMotion注释）+ src/client/wallpaper.ts:1411-1413 |
| T7 | 性能 | 预热只到元数据（preload=metadata、绝不 play，TTL 20s）；失败记忆/首帧预算/stall 自救/隐藏实例不拉载荷；Edge 用 canvas 镜像；过场音频门；帧率上限抽帧转码；scene.pkg ETag/304 + loopback 媒体源 | 同 URL 跳过重设（防闪白）；滑块拖拽降质（DRAG_MAX_SIDE=720 JPEG）；解码 LRU 缓存（6）；生成背景低分辨率 canvas + rAF 启停；配置写 debounce 250ms；video 快照复用做取色 | 被盖层立即释放解码 bytes（clearLayer）；fade 纯合成器动画（will-change）；rotation timer 隐藏页停；图片异步解码 + intrinsic 缓存；object URL 延迟 2s 回收防 fade 中 blank | engine src/video-layer.js 常量 + docs/HOW-IT-WORKS.md；any src/client/wallpaper.ts:2989-2993,2891-2923 + src/client/utils/image.ts:49-65；model src/client/wallpaper.ts:1315-1326,1514-1523 |

## 1. dsh-wallpaper-engine

仓库：https://github.com/elysia395/dsh-wallpaper-engine ，pin commit 01fbb8b8e66fd7e405e9c878d18dbd456187f111（HEAD）。包名 dsh-plugin-wallpaper-engine@1.3.3（来源：package.json: name/version）。

### 1.1 静态 / 动态 / 视频背景如何加载

三条通道（来源：src/media-prep.js:585-684 buildMedia + docs/HOW-IT-WORKS.md 出图顺序）：

1. 实时渲染（scene/web，默认）—— liveRenderEnabled（src/live-layer.js）为真时建 iframe.we-live-iframe，src 为 /wallpaper-engine/scene-live/index.html（liveRenderUrl 拼 type/fit/sceneFps/muted/src/mediaBase）。渲染器是 npm 依赖 webwallgl@^3.0.0 + 本仓 lib/webwallgl/ 适配页（index.html/renderer.js）。网页壁纸强制 sandbox=allow-scripts（严格沙箱，第三方 HTML 拿不到 DSH origin）。
2. 视频 —— isSceneVideo 分支建 video 元素（见 1.4）；纯 video 类型壁纸同路。
3. 静态帧 —— img.we-media（作者预览图 / 实时抓帧 _gpu.png / 自定义画面 / 主题色兜底，buildLivePoster 垫底）。

DOM 注入点与层级（为什么生效）：

- 层定义 src/styles-base.js:97：.we-layer 为 fixed 铺满、z-index -2（行 80-97 注释）；.we-scrim 在 L209-210 为 z-index -1，永远压在壁纸层之上、界面之下。关键：不依赖数值竞争——过场时显式把旧层压到 zIndex=-3（src/layer-core.js startLayerTransition 内 outgoing.style.zIndex），两者仍在 scrim 之下。
- 建层 src/live-layer.js:263-296 syncLayers：getElementById(LAYER_ID) 命中即复用 → 否则 createElement(div)，node.id = LAYER_ID（即 dsh-wallpaper-engine-layer，src/client.js 顶层 const），className=we-layer，appendChild(buildMedia 产物)，document.body.appendChild(node)。另有 staging 领养路径（pendingStagedLayerNode，iframe 全程不移动，L266-271）。
- 露出链路：body[data-we-wallpaper]（ACTIVE_ATTR，src/client.js）→ styles-base.js:222 起页面基色/侧栏填充置透明，壁纸层才可见。玻璃配方与壁纸无关（data-we-glass-page 恒挂）。

client/manifest 入口：package.json: exports（. → lib/index.js，./client → lib/client.js）+ dsh.client（inject @deepseek-ai/dsh-client-runtime，platform web，immediately true）；src/client.js 文件头声明 CANONICAL source，scripts/build-client.mjs 内联生成 lib/client.js。host 行：cordis.patch.yml:19-23（id: wallpaper-engine，inject webServer 硬依赖，无 webserver 的 headless/TUI 不加载）。

### 1.2 图片 / 视频 / 资源寻址

- 同目录约定（无）→ token 约定：清单由宿主扫描 Steam（libraryfolders.vdf → workshop/content/431960 + projects/）生成；客户端拿到的全是同源相对 URL，磁盘绝对路径永不过网。lib/inventory.js:295 media、L301 preview、L120 sceneVideo（仅探测确认内嵌 MP4 才给，否则 null“诚实化”）、L316 props、L318 liveFrame。tokenFor = 绝对路径 base64url（L61-64 注释：重启回放旧载荷会 404，故索引只存扫描原料、每次重组）。
- 容器格式：mediaExt 由宿主下发（L296-300 注释“客户端按 URL 猜容器恒判不可解”）；视频缩略图走 GET /video-preview/（ffmpeg 抽帧 JPEG）。
- Range/缓存：lib/routes/media-bytes.js:30-55 经 serveFile 直出（Range/HEAD/条件 GET，video seek 依赖它）；scene.pkg（实测最大 336MB）带 ETag/304；场景载荷走独立 loopback 媒体源 GET /wallpaper-engine/media-origin（桌面壳能力头栅栏下 iframe 会 403，故另起端口；远程页面回落自身 origin）。
- 自定义上传：~/.dsh-wallpaper-engine/uploads（设置可改盘符），走同一套 /media 管道。

### 1.3 按模型切换

不支持（证据缺口，非遗漏）：src/picker-model.js:94-140 的 model 指选择器数据模型（pickerModel(input)：类型/分级过滤 + 分页切片），与对话模型无关；src/theme-follow.js 是壁纸→主题方向（开时按壁纸亮度写深/浅，默认关），与模型→壁纸相反。切换维度只有：手动选择（applySelection，src/media-prep.js:44“唯一的选中项落地入口”）+ 用户轮播列表 rotationGroups（src/client-rotation.js：后台/隐藏时推迟 deferRotationWhileHidden，可见恢复补做）。

### 1.4 自动播放与性能

- 自动播放：纯video主路径 src/video-layer.js:248-259（autoplay L248、loop L249、preload auto L255、playsinline L257、playbackRate L259）；sceneVideo分支 src/media-prep.js:630-638（autoplay L635、loop L636、playsinline L637，该窗口无preload/playbackRate，不要拿它证主路径）。preload=auto 是刻意选择（注释：缺省 metadata + moov 在文件尾会导致 Chromium 取完 moov 就停，play 要等更晚一趟 syncLayers）。
- 音频：默认 0 音量等价 muted；src/client-audio-playback.js:155-163 按 isEffectivelyPlaying() 调 video.play()/pause()；过场有音频门（layer-core.js openRotationAudioGate：新层静音到旧层退场才放音）。
- poster 语义：probeVideoPoster（video-layer.js）——属性存在不等于已加载，只有 Image onload 才算有画面；视频档不用 WE 动图 preview.gif 作 poster（会先播预览再停，改用插件自抽静态缩略图，buildVideoMedia 注释）。
- 预热：warmVideoUrl 只到 preload=metadata、绝不 play()（单槽位 + 20s TTL + 悬停 120ms 防抖），点击领养（consumeWarmVideo）。
- 节流/降级：首帧预算动态（liveFirstFrameBudget 按包大小）、失败记忆（timeout/stall 落盘，传输未完成只记会话）、stall 心跳自救、隐藏实例摘 src 中止载荷、Edge 可见 video 藏 + canvas 镜像（buildVideoMedia IS_EDGE 分支）、帧率上限抽帧转码（capNeedsTranscode）。遮挡/失焦暂停见 README L178。

## 2. dsh-any-background

仓库：https://github.com/Tkingxiao/dsh-any-background ，pin commit bf36b0938ea7eab2d76faa5ca727c870ace39deb。包名 dsh-any-background@0.3.8。

### 2.1 静态 / 动态 / 视频背景如何加载

单容器三内容（来源：src/client/wallpaper.ts: applyWp L3099-3165 总入口）：

- image：容器 backgroundImage=url + 按 BgMode 写 backgroundSize/Position（applyImageWp L2982-3041；同 URL 跳过重设防闪白 L2989-2993）。
- video：子 video 元素（见 2.4；applyVideoWp L3046-3090）。
- mesh/shader/pattern：bg-generators.ts 工厂（mesh 径向渐变 / shader WebGL / pattern 六预设）返回 canvas+stop/pause/resume/snapshot，wpEl.appendChild(canvas)，首帧后 snapshot 作取色/预览（setBackgroundType L2055-2078；applyGeneratedBg L2103-2130；bg-generators.ts:18-47 newRaf）。

DOM 注入点与层级：ensureWpContainer L2850-2855 —— div，cssText 为 position:fixed/inset:0/z-index:-1/pointer-events:none/overflow:hidden，document.body.prepend(wpEl)。注意是 prepend（与 engine 的 appendChild 不同，但同为 body 级 -1 层；界面不透明度/模糊全走 CSS 变量覆盖而非层叠竞争）。卸载 teardownWp L3167-3179 摘除整层并清 token。

client/manifest 入口：package.json: exports（. → lib/index.js，./client → lib/client.js，tsdown 打包）+ dsh.client.inject（store/locale/connection/theme/settings，immediately:true，L123-133）；dev 叠加 cordis.yml（insert id dsh-any-background），发布用 cordis.patch.yml。host：src/index.ts:23 inject = [connection,webServer]；客户端经 initRpc + RPC_CHANNEL=/dsh-any-background（rpc.ts:6）通信。

### 2.2 图片 / 视频 / 资源寻址

- serve URL（相对）：WALLPAPER_SERVE_URL=/dsh-any-background/wallpaper、VIDEO_SERVE_URL=/dsh-any-background/video（rpc.ts:6-10：6 VIDEO_SERVE_URL，8 WALLPAPER_SERVE_URL）。RPC read 回 config + wallpaper URL + video URL（rpc.ts:69-71注释 both travel as serve URLs—never bytes），bytes 只在 upload（raw POST）与主题导出（dataURL 内嵌 dsh-any-theme.json）时走。
- 同目录约定：服务端数据盘 dsh home 下 .dsh-any-background-data/（index.ts；README L173：config JSON + wallpaper + rotation 池 + video + font；原子写 temp+rename）。视频槽按 MIME 命名（wallpaper.mp4/webm/ogv/mov/mkv，L57-65；VIDEO_CANDIDATES）。
- 缓存破坏：state.ts:97-112 setWpVideoUrl —— serve URL 稳定，换内容靠 ?r=rev query（blob:/data: 除外）；图片侧 setWpImageUrl 经 bumpImageRev（L93）同理。换源比对用 getAttribute(src)（相对值）而非解析后绝对 URL，否则每次重播（applyVideoWp L3064-3069 注释）。
- 网络 URL：粘贴 http(s) 由服务端下载进槽（setWallpaperFromUrl/setVideoFromUrl；25MB/20s 上限，index.ts:47-48），之后一切走 serve URL。

### 2.3 按模型切换

不支持按模型。切换维度（index.tsx 全是 applyWp() 调用点，boot 在 loadPersisted().then…applyWp L398-406）：一是 backgroundType 切换（setBackgroundType L2055；image 切回时恢复 retained 上传并清动态 verdict）；二是手动 profile（activeProfile；want === cfg.activeProfile 即 return，L385；另有 day/night schedule 定时切）；三是轮播池 rotation（enabled/mode shuffle-order/interval reload-daily-weekly/current/items≤30/lastRotate，index.ts:132-138,435-516）——服务端把选中文件 copy 进 wallpaper 槽（handleRotationSet L830-842），其余管道零改动。

### 2.4 自动播放与性能

- 自动播放：applyVideoWp L3050-3063 —— muted/loop/autoplay/playsInline（属性+property 双写）/preload=auto；先 append 后设 src（注释：detached video 首帧延迟），void videoEl.play().catch(()=>undefined)（自动播放被拒静默，靠后继 syncLayers 补播）。placement 映射 object-fit（fit+iw → 绝对定位盒 + object-fit:fill 等比；否则 stretch→fill / fill,tile→cover / 余→contain，L3071-3084）。
- 视频帧复用：captureVideoSnapshot（utils/video.ts:31-62：muted + preload auto + playsInline，seek 后抓帧）供预览/取色/位置编辑器/verdict（README L67,70）。
- 性能：watchWallpaperDragQuality L2927（滑块拖拽换 720px JPEG，松手恢复，浏览器缓存命中）；loadImage 解码 LRU（IMG_CACHE_MAX=6，utils/image.ts:49-65）；生成背景低分辨率 canvas（bg-generators.ts:3-5 注释 fraction of CSS size）+ rAF 启停（pauseGeneratedBg/resumeGeneratedBg，index.tsx L486-496 visibility 处理）；配置写 SAVE_DEBOUNCE_MS=250 + pagehide flush（rpc.ts:74-94）。

## 3. dsh-background-by-model

仓库：https://github.com/HarmlessFunny/dsh-background-by-model ，pin commit 893d1b7e3204d826de692f536e7dac97029d8d64。包名 dsh-background-by-model@0.8.2。纯静态图插件：README L14 v0.3.0 breaking 移除了 video wallpapers, generated backgrounds and the single global theme color。

### 3.1 静态背景如何加载（无视频通道）

applyWp L1565-1607 是规则切换唯一入口 → rWp() 取当前图 → applyImageWp L1470-1524 双层 cross-fade：

- 容器/层级：ensureWpContainer L1290-1302 —— div[data-dab-wp]（position:fixed/inset:0/z-index:-1/pointer-events:none/overflow:hidden）+ body.prepend；内两层 div[data-dab-wp-layer]（createLayer L1283-1288：absolute/inset-0/opacity 0）。切换把目标层 zIndex=1、旧层 0（L1501-1502），按 transitionPlan 写 transition 后 rAF 起播，fadeTimer = durationMs + 160 落 finishFade（L1523）；连切走 settleFade/cancelFade（L1441-1467），A→B→A 同图复用已在画层（L1473-1479）。
- 为什么生效：filter（brightness+blur 合成，wpFilter L1542-1549）写在每层而非容器（注释 L1554-1556：写父级则 opacity fade 每帧重跑全屏 filter）；容器只写 opacity（规则级 wallpaperOpacity，applyWpEffects L1551-1561）。
- 首绘/降级：canAnimateFrom（无旧图或 opacity 约 0 → 硬切，L1411-1414）+ prefers-reduced-motion 一票否决（L1417-1420）；无图规则 → dropWpContainer 拆层（L1306-1313），token 保留。

client/manifest 入口：与 any 同构（package.json dsh.client.inject 五件套 + immediately:true）；另有 ./invariant export。host：src/index.ts:959-962 经 ctx.inject([connection,webServer], …register(kind:prefix, path: RPC_CHANNEL…))——注释明说同步 apply 内注册会因 webServer 不可解析失败，故走 inject 回调。

### 3.2 资源寻址（slot → dataURL → blob URL）

- 磁盘：modelbg-加 slot 的 raw bytes 无扩展名、一图一文件（index.ts:9-10,38；MIME 按魔数嗅探 L433 起；legacy wallpaper.* 一次性迁移 L220）。
- 传输：RPC 读写 dataURL（state.ts:56 imageOf 存 dataURL；index.ts:433-462：433-438 sniff魔数，442-462 readSlotAsDataURL函数体）。
- 绘制：displayImageOf L61-70 把 dataURL 转 URL.createObjectURL(Blob) 缓存；替换旧 URL 延迟 2s 回收（L40-49 注释：fade 中回收会 blank）；无 createObjectURL 时回退直接用 dataURL。
- 同目录/相对：客户端无相对路径概念——地址即 blob: object URL（内存）+ config 内 dataURL（持久）；预设图走 jsDelivr 镜像引用（index.ts:64-146，immutable + purge 说明）。

### 3.3 按模型切换（本系唯一实现）

链路 watchModel → matchRule → setActive → applyActive → applyWp：

- 匹配 src/client/modelbg.ts:64-78 matchRule：有序规则从上到下、大小写不敏感子串首命中；空 match 永不命中；无命中回退首个 usable（ruleCanPaint：带图或自有主题色，schema.ts）；label 取 provider+id+display 名（modelLabelOf L88-100）。
- 监听 watchModel L192-310三跳：一是当前会话 durable modelSelection（L229 ctx.sessions.binding(id).session.projections.faceOf('modelSelection')，composer 与 /model 弹窗同源）；二是 modelDirectories 补 provider 分组目录（L275 directoryFor）；三是 caller 传 host 默认模型兜底（200-310）。会话 id 解析兼容两代（resolveMainSessionId L148-180）。会话 id 解析兼容两代（resolveMainSessionId L148-180：老 list.current → 新 uiSession.current 行表；注释明说旧读法在 0.1.7 取不到会钉死 rule 1）。
- 落地 src/client/index.tsx:334-348 applyActive(advance)：模型切换传 advance=true → 若规则 rotate.advanceOnSwitch 则步进一步骤 → scheduleRotation() → applyWp()。规则内多图轮播：setInterval(rotateTick, intervalMs)（L429，ROTATE 5s–24h，schema.ts:103-104；order/shuffle，shuffle 永不重复当前）；隐藏页停转（visibilitychange L440）；setActive 跨规则重置 rotIndex=0（state.ts:109-115）。

### 3.4 自动播放与性能（无视频；动画即过渡）

- 无 video 元素（wallpaper.ts 全文件零 video 命中；见本节头 README 引文）。动态仅指 cross-fade + 调色板 fade（palette-fade.ts：token 插值过渡）。
- 过渡全局唯一（transition.ts:60-125 resolveFadeMs/transitionPlan）：effect none 即硬切；duration 全局；transform+opacity 双属性；will-change 当帧提升，纯合成器动画熬过主题重注册（L1514-1516 注释）。
- 解码成本：被盖层 clearLayer 立即清 bytes（L1315-1326 注释不让第二张全分辨率图留在解码器里）；imageNatSize intrinsic 缓存；center 模式先 contain 占位后精确尺寸。

## 4. 三仓横向对照

| 问题 | wallpaper-engine | any-background | background-by-model | 给 JSON theme 包的事实输入 |
|---|---|---|---|---|
| 层叠锚点 | body 子层 fixed/-2 + scrim -1；页面透明化（data-we-wallpaper） | body 首个子层 fixed/-1；界面靠 token 透明度让位 | body 首个子层 fixed/-1 + 内双层 absolute；界面靠 token 让位 | theme 包只需描述背景源 + 不透明度/模糊，三仓挂载位一致（body 级 fixed -1/-2，pointer-events:none） |
| 内容元素 | video / img / iframe（canvas 镜像）/ live-poster div | background-image / video / canvas | background-image（双层） | JSON 只需 image/video/generated 三类源；engine 的 iframe-live 是 WE 专有，不进通用包 |
| 寻址 | 同源 token URL（服务端文件） | 同源 serve URL（服务端文件） | blob object URL（内存 dataURL 缓存） | 通用包用相对 slot 路径/URL 字符串 + 可选 dataURL 内嵌（any 的 dsh-any-theme.json 导出、model 的 dsh-background-by-model-theme.json 导出已是先例） |
| 模型跟随 | 无 | 无 | 有（规则老档：match 子串 + fallback rule 1） | 跟随语义抄 model：有序规则、首命中、fallback、advanceOnSwitch |
| 视频 | 有（直放+转码+帧率上限） | 有（muted loop 直放） | 无（v0.3.0 移除） | 视频字段可选；自动播放约定抄 any/engine：muted+loop+autoplay+playsinline+preload auto，play() 拒诺静默 |
| 轮播 | rotationGroups（用户列表+间隔+过场） | rotation 池（服务端 copy 进槽，reload/daily/weekly） | rule 内 rotation（interval+order/shuffle+advanceOnSwitch） | 三种轮播语义不同：engine/any 是换文件，model 是规则内换图 + 模型切换步进——包格式需区分 global-rotation vs per-rule-rotation |
| 主题联动方向 | 壁纸→主题（theme-follow，可选） | 壁纸→主题（取色/verdict，自动） | 规则→主题（per-image color，无色跟系统） | 包内颜色归属：model 的 per-image color 最细；any 的单 color 最粗 |

## 5. 不确定项 / 证据缺口

1. engine 过场新层挂载确切行：syncLayers 后半（pendingReveal/rotationFade 提交段）超出本次抓取窗口——只确认旧层让出 LAYER_ID（live-layer.js:406-425）与 startLayerTransition（layer-core.js），未逐行核对新层 append 时机。降级为文档+行为描述：README L149“准备后切换：下一张准备完成后再交接”。
2. any 生成背景 canvas 的 CSS 定位：已关闭——bg-generators.ts:51 有 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover'（对抗核查补证），与 appendChild(canvas)（wallpaper.ts:2110）+低分辨率渲染互相印证；原“未逐行确认”作废。
3. model 图片 RPC 往返形态：确认 dataURL（state.ts:56-70）与 readSlotAsDataURL（index.ts:433-462，见§3.2），但 handleRpcMethod read 分支的图片字段名未抓取——不影响 slot→dataURL→blob URL 结论。
4. 行号漂移：行号以 pin commit 为准（见附录），后续提交可能漂移；复现命令固定了 tree sha。
5. 音乐/音频：三仓均无独立BGM通道（结论成立，但表述收紧）。engine 有两层音频面：一是壁纸自带音轨（场景包 BGM/音效 + 网页音频反应，随音量/壁纸音轨设置，HOW-IT-WORKS 场景段）与 live iframe muted query，二是README“音乐联动”行（系统输出回环频谱 + Now Playing 歌曲信息/封面 + 按需在线歌词）——后者是系统音频可视化/信息展示，不是 theme 包可复用的 BGM 播放通道；any/model 全程静音（muted=true 写死，any wallpaper.ts:3052；model 无音频面）。未来 theme 包如需 BGM，需另行设计（无现成事实输入）。

## 6. 对抗审查记录（2026-10-18 v2）

- 公理：DSH 双半结构（host Node / client 浏览器，唯一接口是同源 HTTP 路由+RPC）+ 浏览器约束（body级fixed层须配页面透明才可见；视频自动播放须muted/inline，play()拒诺须catch）。
- 标准：T1-T7+§5 全行核（pin+文件+行+生效链缺一即fail；行号漂移亦记）。
- 核查：只读 verifier（subagent a6fe4571）实测三pin raw 200且包名/版本吻合；T2全绿；T3-T6语义无造假、无文件缺失、无越界行号（any wallpaper.ts全长3257行，已绕过fetch 100k截断用Node直取验证）。
- 修正（保持pin，只改引证）：A engine T6补引video-layer.js:248-259；B model T5 116-200扩至116-310；C model T3 433-442扩至433-462；D any T3 rpc 8-10改为6-10+69-71；E engine T4补media-bytes/mp4-vfs/video-layer强引证；F transition 98-125收紧至102-125；§5.2凭bg-generators.ts:51关闭；§5.5音乐表述收紧（engine系统回环频谱/Now Playing是信息展示面，非BGM通道）。
- 结论：主结论（T2挂载/T3寻址/T5仅model跟随/T6自动播放约定/无独立音乐通道）成立，可作#100输入；剩余缺口（§5.1 engine新层append时机、§5.3 RPC字段名、§5.4行号漂移）已标注，不拦下游。

## 附录：复现命令

pin：engine 01fbb8b8e66fd7e405e9c878d18dbd456187f111；any bf36b0938ea7eab2d76faa5ca727c870ace39deb；model 893d1b7e3204d826de692f536e7dac97029d8d64。以下 URL 均为本次实际 fetch（raw 固定 commit；api 取 tree）：

- 文件清单（三仓）：https://api.github.com/repos/elysia395/dsh-wallpaper-engine/git/trees/HEAD?recursive=1 ；https://api.github.com/repos/Tkingxiao/dsh-any-background/git/trees/HEAD?recursive=1 ；https://api.github.com/repos/HarmlessFunny/dsh-background-by-model/git/trees/HEAD?recursive=1
- engine 基地址 https://raw.githubusercontent.com/elysia395/dsh-wallpaper-engine/01fbb8b8e66fd7e405e9c878d18dbd456187f111/ 下：package.json、cordis.patch.yml、src/client.js、src/we-base.js、src/layer-core.js、src/live-layer.js、src/media-prep.js、src/video-layer.js、src/styles.js、src/styles-base.js、src/client-rotation.js、src/client-media-frame.js、src/client-audio-playback.js、src/persistence.js、src/picker-model.js、src/theme-follow.js、docs/HOW-IT-WORKS.md、README.md、lib/index.js、lib/inventory.js、lib/routes/media-bytes.js
- any 基地址 https://raw.githubusercontent.com/Tkingxiao/dsh-any-background/bf36b0938ea7eab2d76faa5ca727c870ace39deb/ 下：package.json、cordis.yml、cordis.patch.yml、README.md、src/index.ts、src/client/index.tsx、src/client/runtime.ts、src/client/state.ts、src/client/rpc.ts、src/client/types.ts、src/client/wallpaper.ts、src/client/utils/bg-generators.ts、src/client/utils/video.ts、src/client/utils/image.ts
- model 基地址 https://raw.githubusercontent.com/HarmlessFunny/dsh-background-by-model/893d1b7e3204d826de692f536e7dac97029d8d64/ 下：package.json、cordis.yml、cordis.patch.yml、README.md、CHANGELOG.md、src/index.ts、src/schema.ts、src/client/index.tsx、src/client/state.ts、src/client/rpc.ts、src/client/types.ts、src/client/wallpaper.ts、src/client/modelbg.ts、src/client/rotation.ts、src/client/transition.ts、src/client/repaint.ts、src/client/palette-fade.ts

> 范围外引用（仅作形态对照，非证据）：本仓 docs/research/dsh-plugin-update-latest-api.md（文档格式模板）。
