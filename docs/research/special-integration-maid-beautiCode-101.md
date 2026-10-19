# 特殊集成系实现原理：maid-atelier / beautiCode-harness 集成（#101）

> 父票：[#98](https://github.com/FeatherHunter/dsh-opencode-palette/issues/98) 13 款 DSH 主题/背景类插件实现原理深度调查；本票是 4 个深挖子票之一（整包皮肤系 #99、配色外观系 #102、动态壁纸系 #103、综合对照表 #100 被本票等 4 票阻塞）。
> 方法：只读源码不运行；分支均为 main（2026-10-18 读取）；一手来源为 GitHub 仓库文件与 raw 内容，结论均带文件路径与关键行；不设计新方案。
> 目标读者：要做 #100 横向对照表、以及未来 JSON theme 包事实输入的人。

## 结论先行（给 #100 的对照输入）

| 维度 | maid-atelier（Small-tailqwq/dsh-deep-whale 子目录） | beautiCode-harness 集成（starsstreaming/beautiCode 子目录） |
| --- | --- | --- |
| 一句话形态 | DSH 双半式客户端 UI 皮肤插件包（node 半挂资源路由＋browser 半 `apply()` 写 DOM/CSS），附 `skin.json` 供皮肤中心互斥切换 | DSH Cordis 桥接插件包（`beauticode-dsh`/`beauticode-bridge`，`inject: [webServer]`），向每个 DSH 页面注入背景桥接脚本 |
| 背景能力 | 静态图片-only：亮/暗两套宫殿图＋双女仆独立层，无视频/音频（入口完整读＋样式前 100KB/2539 行＋产物 bundle 前 100KB 零命中；`runtime/manifest.json` 31 项全 png/webp；方法边界见 §5） | 图片＋视频：`jpg/jpeg/png/webp/avif`（18MB 以内）＋`mp4/mov`（800MB 以内），声音＝视频轨 `muted` 开关，无独立音频 |
| 分区/场景 | 单一 maid/atelier 场景；按亮暗 × 着陆/对话 × 模型 × 开关/时段 × 设备五维切换同一套图（见 1.1 节） | 无分区/场景概念；单全局状态 `current` 经 SSE 广播全部页面（见 2.1 节） |
| 挂载位置 | 对话列 `[class*=centerCol]` 内部首子（随聊天区同步收缩） | 页面级 body 全局固定层 `#beauticode-bg-stage{position:fixed;inset:0;z-index:0}` |
| 资源寻址 | 随包分发，指纹化 `skin-assets/maid-atelier/<sha64>.webp`，同源路由，immutable 缓存一年 | 本地绝对路径引用＋回环媒体服务（`http://127.0.0.1:<port>/…?t=<token>`，Range 支持），不复制用户文件 |
| 主题切换信号 | 读宿主 `body[data-ds-dark-theme]`（MutationObserver 跟随） | 自有 `tone`＋`data-bc-resolved-tone`；`resolvedTone()=dshAppearance()` 三级回退宿主 `data-ds-dark-theme`→`colorScheme`→OS（`client.js:403-413`），双 Observer 跟随（`:434-450`） |
| 按模型切换 | 有：Pro 留左女仆 / Flash 留右女仆（＋眼镜变体），读作曲栏模型按钮 | 无（模型无关；只有已保存主题名） |
| 宿主约定的接口 | `package.json:dsh.bundle.patch`＋`cordis.patch.yml`（insert `ui-skin-maid-atelier`）＋`skin.json`（`bodyAttr/wiring`）＋皮肤管理器 v2 协议 | `package.json:dsh.bundle.patch`＋`cordis.patch.yml`（insert `beauticode-bridge` inject webServer）＋`name/inject/apply`＋`webserver/index-inject` hook＋对话面 tools/commands |
| 卸载/还原 | Cordis effect disposer 还原全部 CSS/DOM 写入 | 安装器备份 `*.beauticode-backup-<ts>`；页面开关恢复宿主样式（README 级断言；浏览器侧 1866 行完整读未见 teardown，见 §5） |

## 0. 研究问题与决策依赖

本票 Question 要求：深挖 2 个仓库的实现原理（代码级，只读源码不运行），回答分区/场景化背景如何实现、集成形态与宿主约定的接口、资源目录结构，每个结论给出文件路径＋关键行。
源仓库：https://github.com/Small-tailqwq/dsh-deep-whale/tree/main/maid-atelier ；https://github.com/starsstreaming/beautiCode/tree/main/integrations/deepseek-harness 。
决策依赖（来自 #98 map 正文）：13 仓库深挖完成后做 #100 横向综合对照表（列口径：token/区域/背景类型/资源路径/生效版本），为未来 JSON theme 包提供事实输入；本次只调查不设计；产物只链不贴。
澄清说明：Question 无歧义（目标、路径、分支、三个必答维度均明确），无需要猜测之处，故未触发 grilling。

---

## 1. maid-atelier（dsh-deep-whale / maid-atelier）

> 皮肤自述（README 首段）：深海女仆工坊——两位鲸鱼娘女仆、深海蓝蕾丝与 Q 版侧栏；纯展示层客户端插件，`apply()` 设 `data-dsh-maid-atelier` 作用域。来源：https://raw.githubusercontent.com/Small-tailqwq/dsh-deep-whale/main/maid-atelier/README.md

### 1.1 分区/场景化背景如何实现

不是多房间/多场景路由，而是单一场景＋五维切换＋多挂载层。背景分区＝挂在不同 DSH 区域的静态图层；场景切换＝同一套图按条件换装/换构图。

五维切换：

1. 亮/暗主题：`src/client/index.ts:686-698` `syncBackdrop()` 读 `body` 是否有 `data-ds-dark-theme` 二选一（`MAID_ATELIER_PALACE_DARK` / `MAID_ATELIER_PALACE_LIGHT`），写入 body 的 `--maid-palace-art`；`src/client/index.ts:1058-1059,1119` MutationObserver 监听该属性触发热切换。暗色另有滤镜（`maid-atelier.module.css:286-288`）。
2. 着陆/对话构图：`src/client/index.ts:283-288` `ensureChatAreaStage()` 把舞台 prepend 进对话列；CSS 按 `[data-phase]` 与 `[data-maid-chat-active]` 收放角色高度（着陆大构图 vs 对话小构图）。
3. 模型（Pro/Flash）：`src/client/customization.ts:67-76` `modelFamily()` 读作曲栏模型按钮判 family，经投影写 `html[data-dsh-whale-model]`；CSS 规则（`module.css:376-388`）pro 时右/vision 层退出、flash 时左层退出；`flashGlasses` 切眼镜变体（`module.css:415-427`）。
4. 总开关/时段（SFW）：`customization.ts:182-203` `exposeSkinCustomization({skinId:maid-atelier, settings:[artwork, sfwMode(visibility-schedule), ...]})`；`art=hidden` 全藏（`module.css:370-374`），按本机时间段隐藏大幅立绘。
5. 设备/拥挤自适应：`src/client/character-fit.ts:27-31,69-70`（`CROWDED_GAP_PX=32`/`RESTORE_GAP_PX=96`，ResizeObserver 量左右角色盒间距写 `body[data-maid-figures-crowded]`）；窄列时按模型规则退场一位（`module.css:390-410` 注释：no state leaves the stage empty）；软渲染走 `data-maid-low-power` 去滤镜；700px 以下改淡入淡出（`module.css:429-445`）。

生效链路表：

| 资源 | 代码位置 | 挂载目标 | 为什么生效 |
| --- | --- | --- | --- |
| 宫殿亮 `52e7dce…webp` / 暗 `ae6917…webp` | `src/client/background-art.generated.ts`（`MAID_ATELIER_PALACE_LIGHT/DARK`，经 `asset-url.ts:skinAssetUrl()` 拼 `skin-assets/maid-atelier/<hash>`）→ `index.ts:686-698` | body 的 `--maid-palace-art` → `module.css:230` 背景声明 | 变量本身就是背景值；Observer 跟随宿主亮暗属性 |
| 左女仆 `2818e535…` / 右 `7c5a5493…` / 眼镜 `98cf9484…` | 同上 ＋ `vision-art.generated.ts` → `index.ts:247-288` `createCharacterStage()`＋`ensureChatAreaStage()` | `div[data-skin-chrome=character-stage]`＋三 `img[data-maid-character]`，prepend 进 `[class*=centerCol]`（选择器见 `index.ts:63-64`），z-index 0 | 挂在聊天列内部，工作台挤压聊天区时同步收缩；CSS 按高度定位 |
| 侧栏/输入框/工作区/顶底饰件 | `art.ts`、`composer-art.generated.ts`、`workspace-art.generated.ts`、`chrome-art.generated.ts` → `index.ts:655-684` | body CSS 变量 → 各区域伪元素/边框 | 20 个变量在 `BACKDROP_PROPERTIES`（`index.ts:224-245`）统一登记，disposer 按表还原（`index.ts:596-598`） |
| 启动失败页立绘 | `boot-error.ts`（`BOOT_SELECTOR=[data-dsh-boot]`，匹配内核 `Failed to load plugins` 标题） | `[data-maid-boot-error]` 属性 → `boot-error.module.css` | 只装饰不替换诊断信息；无失败标题时保留原生页 |
| favicon/manifest/title | `page-icons.ts`、`index.ts:628-643,1143-1146`（`SKIN_TITLE`，`SKIN_SYSTEM_CHROME_COLOR=#0b193f`） | head/dataset | disposer 恢复原值（`index.ts:610-613`） |

格式与加载：node 半与 `shared/skin-assets.ts` 双重锁死扩展名 `png|webp`、哈希文件名、仅图片 Content-Type、一年 immutable＋ETag＋304、仅 GET/HEAD；客户端所见全是 `<img>`（入口完整读＋类型清单无媒体文件；大文件尾部未读，边界见 §5）。详见仓根 `docs/asset-delivery.md`（https://raw.githubusercontent.com/Small-tailqwq/dsh-deep-whale/main/docs/asset-delivery.md）。

### 1.2 集成形态与宿主约定的接口

形态一句话：DSH 双半式客户端 UI 皮肤插件包（npm `@smalltailqwq/dsh-client-ui-skin-maid-atelier`；node 半供资源路由，browser 半执行 `apply(ctx)`；另附皮肤元数据供管理器互斥切换）。

| 接口 | 位置 | 约定内容 |
| --- | --- | --- |
| 包入口 | `maid-atelier/package.json`（name/main/exports） | `.`→`lib/index.js`（node 半），`./client`→`lib/client.js`（browser 半）；files 白名单含 lib/patch/skin.json/preview/runtime/locale |
| 补丁声明 | `package.json:dsh.bundle.patch` → `maid-atelier/cordis.patch.yml`（`insert: [{id: ui-skin-maid-atelier}]`） | bundle 安装时插入 web 插件名单 |
| 客户端声明 | `package.json:dsh.client{inject:[], platform:web}` | web 端注入形态 |
| 对等依赖 | `peerDependencies: @deepseek-ai/cordis, @deepseek-ai/dsh` | 宿主运行时由 profile 提供 |
| node 半入口 | `maid-atelier/src/index.ts:apply(ctx)` | 调 `installSkinAssets(ctx,maid-atelier,<assets/runtime URL>,files)` 注册 `skin-assets/maid-atelier/*` 路由 |
| browser 半入口 | `src/client/index.ts:516 apply(ctx)` | 置 `body[data-dsh-maid-atelier]`（:644）、写变量、建舞台/饰件、装 Observer；`:563-614` disposer 还原一切 |
| 皮肤声明 | `maid-atelier/skin.json` | `id=maid-atelier`、`bodyAttr=data-dsh-maid-atelier`、`wiring={id:ui-skin-maid-atelier}`、preview、`dshCompatibility=0.2.0rc2` |
| 构建指纹 | `maid-atelier/skin.build.json` | schema/fingerprint/sourceCommit，升级需与 lib＋runtime 同步 |
| 设置协议 | `customization.ts → ../../../skin-manager/src/protocol.ts` | 以 `skinId=maid-atelier` 注册 artwork/sfwMode/font/workspaceFont/modelExit/mobileModelExit/flashGlasses/mobileNav/composerMode/composerBottomOnly/workspaceRowHeight，投影为 html 属性 |
| 发现与加载 | README 安装段 | `dsh plugin --profile web add` 对应包名（＋manager 包），重启后皮肤管理中选择，热重载切换；卸载即还原 |

### 1.3 资源目录结构

`maid-atelier/`（16 项）：`README.md`；`package.json`；`skin.json`/`skin.build.json`；`cordis.patch.yml`；`src/index.ts`（node 半）；`src/client/`（27 模块：`index.ts` 总装、`maid-atelier.module.css` 全部样式、6 个 `*-art.generated.ts` 资源常量、customization/character-fit/boot-error/page-icons/composer-*/mobile-*/table-card/titlebar-brand 等分区模块）；`assets/`（23 项：宫殿 day/night、左右/眼镜女仆、输入框/侧栏/工作区饰件、`icons/`、`boot-error/` 生成源、`runtime/` 31 个指纹产物＋`manifest.json`——唯一被服务的目录）；`lib/` 构建产物；`build/`（`tsdown.client.ts`、`web-platform.ts:PLATFORM_MODULES`）；`locale/{zh,en}.json`；`preview/{light,dark}.webp`；`tests/` 12 个 spec（含 `skin-manager-contract.spec.ts` 反向契约）；`LICENSE/LICENSE-ARTWORK/NOTICE`（MIT＋CC BY-NC-SA 4.0＋三级署名链）。

---

## 2. beautiCode-harness 集成（beautiCode / integrations/deepseek-harness）

> 包自述（package.json）：`Cordis plugin: image/video backgrounds for DeepSeek Harness Web and Desktop.` 来源：https://raw.githubusercontent.com/starsstreaming/beautiCode/main/integrations/deepseek-harness/package.json

### 2.1 分区/场景化背景如何实现

无分区/场景概念；职责是全局页面壁纸桥接。单全局状态 `current`（`index.mjs:/__beauticode/apply`）经 SSE 广播全部页面；无 partitionId/sceneId 字段。背景种类：图片 `jpg/jpeg/png/webp/avif`（18MB 以内）＋视频 `mp4/mov`（800MB 以内）；声音＝视频轨 `muted` 开关（默认 `desiredModes={fish:false,muted:true,tone:auto}`，`client.js:13`），先按期望播放、失败回退 muted；氛围层 `atmosphere.js`（`#beauticode-gallery-bg`＋水波 canvas，`presets.mjs:ATMOSPHERE_PRESETS={internal,infernal}`）；可读性垫片 `readability.js`（压成实色底，非代码美化）；fish 摸鱼、tone、dim/blur、全屏均为页面级开关。

生效链路表：

| 环节 | 哪段代码 | 把哪份资源挂到哪里 |
| --- | --- | --- |
| Host 注入脚本 | `browser-injection.mjs:createBrowserInjection().contribute(table)` → 5 条 `{kind:script-src, placement:body}`（:45，表见 :4-8）＋桌面 key（:43） | 经宿主 `webserver/index-inject` hook（`index.mjs:231`）向每个 DSH 页面注入 transport/atmosphere/client/console/gallery |
| Host 服务路由 | `index.mjs:202 apply(ctx)` 内 `ctx.webServer.register({kind:exact})` 约 10 条以上 | `/__beauticode/{transport.js,atmosphere.js,client.js,console.js,gallery.js,events,apply,mode,status,ack,version}`、主题图片、`/__beauticode/ui/*` |
| 浏览器传输 | `transport.js`（EventSource 或 fetch-SSE；Desktop 附 key） | 页面 clientId 订阅 `GET /__beauticode/events`；Host 广播 `{type:apply/mode}` |
| 浏览器渲染 | `client.js:154ff` `#beauticode-bg-stage`＋`[data-bc-role=current|candidate]` 槽位，`img/video{object-fit:cover}`；状态经 documentElement.dataset 驱动 | poster-first 两阶段提交：先图片 poster，60s 内首帧升级（`VIDEO_SETTLE_TIMEOUT_MS=60000`，`client.js:29,1695`） |
| Node 落盘/引擎 | `ui-host.mjs`（Windows 强制 local 引用）＋`host-apply.mjs:resolveApplyBackend()`（tray 优先，否则 in-process） | 本地绝对路径；回环媒体 URL（Range 支持） |
| 对话面触发（可选） | `agent.mjs:555 registerBeauticodeTools`（8 工具：apply_image/video/theme_list/theme_use/clear/status/set_fish/set_muted，:561-678）＋ `:711` commands（`bg/bg-theme/bg-clear`） | 同一后端通道（`callDshControl/resolveApplyBackend`） |

自动播放/格式细节：`video{autoplay,loop,playsInline,preload:auto,muted}`（`client.js:1627ff,376-380`）；startAt seek（差值 0.25s 以上才跳）；超时 `CLIENT_APPLY_DEADLINE_MS=8000`（Host 10s 校验内，`client.js:14-17` 注释）、图片 `3000ms×2`、冷启动黑帧预热；安全：回环白名单＋64 hex token（`TOKEN_PATTERN`，`index.mjs:17`）＋同源/Desktop-key 双验＋`MAX_BODY_BYTES=64KB`。

### 2.2 集成形态与宿主约定的接口

形态一句话：以 Cordis 插件包形态集成到 deepseek-harness，通过 `dsh.bundle.patch` 声明的 `cordis.patch.yml` 插入点被宿主发现与加载，不启动宿主。

| 接口 | 位置/符号 | 约定内容 |
| --- | --- | --- |
| 包 manifest | `package.json`（`name=beauticode-dsh@1.0.28`，`main=./index.mjs`，`bin`，`dsh.bundle.patch`） | 宿主按包名发现，按 patch 文件接线 |
| 补丁声明 | `cordis.patch.yml`（insert `beauticode-bridge` inject webServer） | 插入 ID＋注入 webServer（安装器生成 `file://` 变体） |
| 插件入口 | `index.mjs:12-14,202`（`name/inject/bridgeProtocol=4/apply(ctx,config)`） | Cordis 约定三件套 |
| 页面注入钩子 | `index.mjs:231 ctx.on(webserver/index-inject)`＋effect cleanup | 宿主装配页面时回调 |
| 服务注册 | `index.mjs:236-398 ctx.webServer.register({kind:exact,…})` | 静态/事件/控制路由全在 `apply()` 闭包内 |
| 对话扩展 | `agent.mjs:762 registerAgentSurfaces`（失败吞掉保活页面桥） | tools 8＋commands 3，见上表 |
| 配置/目录 | `control-client.mjs:defaultBeauticodeDataRoot()`，`skin-center.json` 固定中心 URL | 宿主与托盘同数据根；皮肤中心来源固定 |
| 发现与加载 | `bin/beauticode-dsh → cli.js:runCli()` 或 `dsh plugin --profile add`；Desktop 端口 19387 | README：不启动 DSH、不需要 fork、不需要托盘 |

### 2.3 资源目录结构

`integrations/deepseek-harness/`（22 项）：`package.json`＋`cordis.patch.yml`（发现接线）；`index.mjs`（唯一宿主入口，669 行）；`browser-injection.mjs`（63 行，挂载决策表）；`transport.js`；`client.js`（1866 行，渲染主体）；`atmosphere.js`；`readability.js`；`console.js`（设置→背景页）；`gallery.js`＋`gallery-host.mjs`（皮肤中心前后端）；`ui-host.mjs`；`host-apply.mjs`；`control-client.mjs`；`agent.mjs`（790 行）；`presets.mjs`；`cli.js`＋`bin/beauticode-dsh`；`skin-center.json`、`screenshots.json`、`README.zh-CN.md`、`test/`。

---

## 3. 给 #100 的横向对照要点（只综合不设计）

- 挂载哲学相反：maid 缩进对话列内部（跟随布局），beautiCode 铺满视口全局（无视布局）。JSON theme 若要统一背景区域口径，必须区分列内背景与页面背景两种锚点。
- 资源哲学相反：maid 随包指纹分发（不可换图，只能开关），beautiCode 引用用户本地文件（任意换图，依赖回环服务）。资源路径列需区分 bundle 相对路径 vs 绝对回环路径。
- 切换信号不同：maid 跟随宿主已有属性（零配置），beautiCode 自建模式状态机（需 ack 回执）。生效版本列需标注各自验证版本（maid `dshCompatibility=0.2.0rc2`；beautiCode `bridgeProtocol=4`）。
- 音乐能力：两者均无独立音频；beautiCode 的声音只是视频 muted（#98 map 要求的音乐/自动播放细节在此系的答案就是无独立音乐）。

## 4. 来源清单

maid-atelier（一手）：repo 树 https://github.com/Small-tailqwq/dsh-deep-whale/tree/main/maid-atelier ；API https://api.github.com/repos/Small-tailqwq/dsh-deep-whale/contents/maid-atelier ；raw 文件：README.md、package.json、skin.json、skin.build.json、cordis.patch.yml、src/index.ts、src/client/index.ts、maid-atelier.module.css、art.ts、asset-url.ts、background-art.generated.ts、boot-error.ts、customization.ts、character-fit.ts、assets/runtime/manifest.json；仓根 docs/asset-delivery.md（https://raw.githubusercontent.com/Small-tailqwq/dsh-deep-whale/main/docs/asset-delivery.md）。
beautiCode（一手）：repo 树 https://github.com/starsstreaming/beautiCode/tree/main/integrations/deepseek-harness ；API https://api.github.com/repos/starsstreaming/beautiCode/contents/integrations/deepseek-harness ；raw 文件：package.json、cordis.patch.yml、README.zh-CN.md、index.mjs、browser-injection.mjs、transport.js、client.js、atmosphere.js、readability.js、console.js、gallery.js、gallery-host.mjs、ui-host.mjs、host-apply.mjs、control-client.mjs、agent.mjs、presets.mjs、skin-center.json、cli.js、bin/beauticode-dsh。

## 5. 证据缺口

- beautiCode：`vendor/adapter-dsh` 与 `themes/internal-beyond` 在 GitHub 树中不可见（疑似构建产物），只证实引用关系；`bridge-manifest.json` 缺失（回退 `{protocol:4, revision:source}`，`index.mjs:21-34`）；宿主侧 `webserver/index-inject` 完整契约只见插件侧调用形状。
- beautiCode（新增，代码级确定缺口）：浏览器侧 `client.js` 1866 行完整读无 `beforeunload/unload/dispose`、无哨兵复位（`__beauticodeBridgeLoaded` 只防重复注入）；`#beauticode-bg-stage` 常驻 body，无卸载删除路径的代码证据。卸载行为仅 README 级描述——给 #100 的“卸载行为”列：maid 可验证还原 vs bc 未见代码。
- maid-atelier：宿主侧装载只见皮肤侧声明，宿主实现不在子目录内；`assets/icons/` 在复核时遇 GitHub API rate-limit 未能列出（`package.json:files` 白名单与 README 旁证其为 ICO/运行时 PNG，不影响背景机制结论）。否定性结论（无视频/音频）的方法边界：抓取单文件截断于 100KB，`module.css`（约 254KB）与 `lib/client.js`（305KB）只读了前部；结论靠三重收敛支撑——① `src/client` 27 文件类型清单完整（全 `.ts/.css`）、`runtime/manifest.json` 完整（31 项全 png/webp）；② 已读部分（入口完整＋样式 2539 行＋产物前部）零媒体 `url()`、零远端 `http` url、零 `@font-face`/`data:` URL；③ 文档互证（README 不依赖远端 URL＋asset-delivery allowlist）。残余风险低。
- 通用：#98 map 要求的列口径最终收敛留给 #100。