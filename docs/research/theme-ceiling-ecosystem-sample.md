# DSH 主题 / 皮肤 / 背景 / 字体 / 图标插件：20 款抽样与 5 通道边界

> 范围：只查公开资料（README 为主，机制段精读），不安装、不本地运行任何被抽插件。
> 通道编号沿用基准文档 `theme-ceiling-benchmark-151.md` §1.3：
> **C1** token 层（`ctx.theme.register/overrideTokens`）、**C2** 样式表层（注入 `<style>`）、
> **C3** DOM 层（改/插 DOM、槽位）、**C4** 资源层（`data:` / `blob:` / 自建 HTTP 路由）、
> **C5** 字体层（`@font-face` + woff2）。
> 文中「推断」= 未读到源码、仅由 README 或旁证推得。

---

## §0 结论

1. **抽样 20 款（对应 21 个仓库，Aqua 的上游与修补分发包合并为一行），视觉机制 100% 落在 5 条通道内。** 没有一款需要「第 6 条注入通道」才能产生效果。5 条通道不是我们为了自证而划的框，而是生态里独立作者反复自然踩出来的实际形状。

2. **5 条通道每一条都有独立作者自述佐证，且与我们读宿主源码得到的结论一致。** C1/C2/C3：`lyingice/dsh-client-ui-mc-skin`「它改了什么」三行表逐行对上。C4：同款 README 明写「客户端插件没有静态资源路由——`dsh-client-modules` 只发 `/plugins/<包名>/client.js`（和它的 `.map`）」，与 `frontend-static/src/index.ts:88-99` 的结论互证。C5：`zhijun-dai/dsh-Fonts` 指向的 `--dsw-font-family` / `--ds-font-family-code` 就是宿主 `base.css` 的字体入口。

3. **通道外确实现象有 6 类，但全部是「交付 / 供给 / 工程」层，不是新的注入原语。** 其中只有「改已构建前端产物」（`d-dev0101/open-sea-skin` 的静态前端安装）不能由「一个不修改宿主源码的 JS 插件」实现；其余 5 类（浏览器扩展、宿主进程猴补丁、外部原生二进制、宿主 FS 扫描、Agent 工具面）都能由普通插件做到。详见 §2。

4. **两处要更正既有基准结论。** ① 「随包 CJK 字体体积不可接受」不成立于全部形态：`mc-skin` 实测随包 **16,162,252 字节 / 63,449 字形（覆盖整个 BMP 含中日韩）**，走 Host 路由按需下载 + ETag 复验，完全可用；不可接受的只是 **base64 内联**这一种（产物 30 KB→22 MB）。② 「生态里没人做音频」也不成立：`dsh-theme-mediascape` 已有背景音乐播放器与 Web Audio 实时合成的打字音效。

5. **「自建入口」是刚需，但「零注入」也是真的。** 官方「设置 → 通用 → 外观」渲染的是写死常量（`AppearanceRow.tsx` 的 `CUBES = [light, dark, system]`，从不读主题注册表），所以多主题插件都自带入口 → C3 跑不掉。同时 `renjie2026/dsh-theme-gallery` 证明：只要把 `--dsw-specific-sidebar-fill` 设成渐变，侧栏 + Windows 标题栏就一起铺满，**零注入**；C1 的表达力被我们自己低估了。

---

## §1 抽样清单与证据

| # | 仓库 | 一句话定位 | 生效机制（作者自述 / 显著证据） | 通道 | 证据 |
|---|---|---|---|---|---|
| 1 | `wsxwj123/dsh-plugins` · `packages/dsh-appearance-gallery` | 主题家族画廊 + 受控皮肤包导入 | 自定义主题「只注入 CSS 变量，不执行任何 JS」；自定义皮肤是三文件导入（`skin.json` / `client.js` / 可选 `a11y.css`），带高危能力黑名单、256 KB 上限、最多 8 个 → 皮肤包会执行用户 JS | C1 C2 C3 | README「自定义主题」「自定义皮肤」；`lib/client.js` 须自调 `window.__ModuleLoader__.load(...)` |
| 2 | `TQSY114514/dsh-ui-appearance` | 调色盘 + 三层背景 + 视频壁纸 | `ctx.theme.overrideTokens()` 覆写 `--dsw-alias-*`；三层图层（纯色画布 / 媒体层 / 防眩光遮罩）沉底 `position:fixed; z-index:-1`，对 `--dsw-alias-bg-base`「透明打孔」，且**绝不给 `#root` 赋 position/z-index**；视频经 IndexedDB Blob 直存（≤200 MB），不经 Base64 | C1 C2 C3 C4 | README「工作原理」表、「持久化与恢复」、「包结构」（`client/applier.ts`、`blob-db.ts`） |
| 3 | `d-dev0101/open-sea-skin` | WebGPU 实时海面 + 玻璃界面 | WebGPU/three.js/TSL 全屏 canvas（五组 Gerstner 波）；玻璃走 CSS。视觉原语仍在通道内，但另有 4 种交付方式（见 §2） | C3 C2 | README「安装指南」1–5；§静态前端安装原文「**此方式会修改前端文件**」 |
| 4 | `ruijiaang-lab/dsh-wallpaper-engine` | 接管本机 Wallpaper Engine 壁纸 | Host 半部读 Steam `libraryfolders.vdf` 定位安装、扫 `projects/*` 与 `steamapps/workshop/content/431960/*`，注册三条同源路由 `/wallpaper-engine/{inventory,media/<token>,preview/<token>}`（视频支持 Range）；Client 半部固定层垫在应用列之后 | C4 C3 | README「Host half」三条 + 「Client half」 |
| 5 | `elysia395/dsh-wallpaper-engine` | 用 WebGL 重实现 WE 的 Scene | 内置 **WebWallGL** 渲染 Scene/Web（粒子、puppet 骨骼、SceneScript、鼠标交互、音频反应）；视频 + ffmpeg 转码缓存；玻璃与字体也走 token | C3 C4 C5 C2 | README「能做什么」表；「支持哪些壁纸类型」表（Application 明确不支持） |
| 6 | `EIGHTfs/dsh-theme-mediascape` | 视频壁纸 + 配色 + BGM + 打字音效 | 自有路由 `/theme-mediascape-assets/*`：Range 206 + ETag、分片上传（`offset` 续传、409 偏移不匹配）、素材落 `$DSH_HOME/theme-mediascape/`；打字音效 **Web Audio 实时合成、零音频文件**；为绕过鉴权代理 302 掉 Range，包装 `process.stdout.write` 抓启动 token | C4 C3 C2 | README「九、HTTP API 一览」、「五、背景音乐」、「媒体加载与鉴权代理」 |
| 7 | `HarmlessFunny/dsh-background-by-model` | 按当前会话模型切壁纸 | 有序规则表按模型名匹配，每规则自带壁纸/主题色/布局/取景/透明度/模糊；分区透明度覆盖主背景、左右栏、卡片、输入框、设置面板、轨迹页；数据落 `~/.dsh/.dsh-background-by-model-data/`（`theme-config.json` + 每图一文件 + 节日图 CDN 缓存） | C1 C2 C3 C4 | README「Storage」文件表、「Features」分区段 |
| 8 | `AKS1st/dsh-cyber-particle` | 全屏粒子覆盖层 | 全屏 canvas 覆盖 + `pointer-events` 穿透，不改配色；**明写「服务端无任何行为……不注册任何 webServer 路由」**，因此可热切换不产生路由冲突；参数存 localStorage | C3 (+C2) | README 机制段 |
| 9 | `ash-qw/dsh-theme-prts` | 明日方舟风整套皮肤 | 三套外观预设 + 四档材质 + 城市剪影/粒子徽记/会话声纹/启动序列；`?prts-safe=1` 安全模式阻断全部视觉挂载；偏好写 DSH profile 原生配置（浏览器只留启动缓存）；徽记可由 Agent 工具生成（Node ≥ 20.9） | C1 C2 C3（推断）+ 通道外 Agent 工具面 | README「安全模式与恢复」「卸载」「开发」 |
| 10 | `webkubor/dsh-bloom-theme` | 10 套 OKLCH 莫兰迪配色 | **「零依赖，只注入 CSS 变量」**；顶栏一键切换；玻璃是半透 + `backdrop` 模糊（CSS） | C1 (+C3 顶栏按钮) | README「为什么用它」对照表 |
| 11 | `cherrchen/dsh-theme-studio` | 把主题工作室塞进「设置 → 通用」 | 在官方「外观」与「字号」之间注入「主题」行（槽位）；**悬停只临时套色不写盘，点击才由 Host 持久化**；`cordis.patch.yml` 把 Host 设置半部与 Client UI 挂进官方包管理器；声明 `platform:web` | C1 C2 C3（+Host 持久化） | README 开头、「预览不写盘」、「安装」 |
| 12 | `SenryLee/dsh-frosted-window` | 整窗磨砂 | 明写 **「`overrideTokens` only, never `setTheme('custom')`」**；图存 IndexedDB、旋钮存 localStorage，「Nothing is written to `$DSH_HOME/settings.yaml`，nothing is fetched from a URL」 | C1 C2 C4 | README 特性段与隐私段 |
| 13 | `du-u-uck/DSH-Transparent-UI-Plugin`（上游）+ `Aliww2468/dsh-client-ui-aqua-patched`（社区修复分发包） | 玻璃 Aqua | 上游：Mica/Compatibility 双模式，Mica 把布局改成浮动玻璃卡（**CSS 模拟，非 DWM**），另有流体背景/壁纸/亮度/粒子鲸/边缘渐隐。修复分发包的审计表：**「Inject one `<style>` element and a few decorative DOM nodes… plus one settings namespace named `aqua`. That is the entire effect.」**；壁纸存为 localStorage 里的 **data URL**；浏览器半边 `fetch`/XHR/WS/SSE/`sendBeacon` 零出现；无 install/postinstall/prepare，`lib/` 预构建 | C1 C2 C3 C4 | 上游 README「Two modes」特性行；分发包 README「Permissions, external services and compatibility」表 |
| 14 | `lyingice/dsh-client-ui-mc-skin` | Minecraft 像素皮肤 + 16 MB 字体 | 三行机制表：`overrideTokens(包名, tokens)` / `document.head` 插带 `data-plugin-css` 的 `<style>` / `slots.register({priority:-1}, 组件)` 到三个品牌槽位；字体走 Host 路由 + ETag | C1 C2 C3 C4 C5 | README「它改了什么」、「为什么字体走 Host 半边」、「选择器核对」 |
| 15 | `zhijun-dai/dsh-Fonts` | 字体选择器 + 跨插件字体 registry | 重写注入的 `<style id="dsh-fonts">`（`@font-face` + `:root` 上的 `--dsw-font-family` / `--ds-font-family-code`）；Host 半边 `ctx.webServer` 注册 `/plugins/dsh-fonts/fonts/*` 分发随包 woff2；`ctx.provide("fonts", registry)` 供他插件消费；选择存 localStorage | C5 C2 C4 | README 对应段（含 latin 子集 ~280 KB） |
| 16 | `Isilsolme/dsh-anthropic-fonts` | 让 DSH 用上 Anthropic 字体 | **不内置字体**（「npm 包不随包分发字体；安装插件后还需手动安装字体」）；客户端「只往 `document.head` 注入一个 `<style>`」，Host 半边为空；只改字体族 token，保留官方字号行高 | C5（+OS 字体供给，通道外） | README 安装段与「Host 半边为空」段 |
| 17 | `Vergil-long/dsh-custom-font` | WYSIWYG 排版面板 | 按设置生成一个 `<style>`，用 `!important` 打 `p/h1~h6/code/blockquote/a/table`；自有 `GET/POST /dsh-custom-font/settings` 读写 `~/.dsh/dsh-custom-font/settings.json`（类型白名单 + 临时文件原子改名） | C2 C5（+自有设置路由） | README「设置存在 `~/.dsh`」、「接口」段 |
| 18 | `yzke/dsh-icon-theme` | 121 个设置/侧栏图标替换 | 不依赖 icon 字段（0.1.x「expose stable IDs and labels, but not an icon field」），通用发现 `settings.section` / `sidebar.footer.action` 的**活体**贡献；改宿主 inline SVG + 自有 DOM 标记，卸载/热重载「Restores every host SVG」；自有同源端点只存 `overrides` | C3 C2 C4 | README 机制段、「fingerprints pinned to upstream revisions」告警 |
| 19 | `renjie2026/dsh-theme-gallery` | 一个插件 + N 套皮肤数据 | 皮肤 JSON 构建期内联（`lib/themes/` → `npm run embed-themes`）；**整屏铺满靠 token**：把 `--dsw-specific-sidebar-fill` 设成渐变即铺满侧栏 + `[data-windows-titlebar] .frame`；仅阅读态一条注入规则，锚在官方自己也在用的 `[data-windows-titlebar] .centerCol`；每肤 67 token | C1（+C2 一条 +C3 自建入口） | README「原理：整屏覆盖靠 token，不靠注入 CSS」、「为什么是「一个插件 + 数据」」 |
| 20 | `EphoReal/my-skin` | 5 套 preset + 壁纸取色 | 每套 preset 生成完整 `--dsw-alias-*` token 集；壁纸 ≤10 MB，客户端 K-means 取主色；噪点为 SVG `feTurbulence` 灰度层；全存 localStorage | C1 C2 C4（data:） | README 特性段 |

> 计数说明：`#13` 把上游仓库与社区修复分发包合并为一行（同一套视觉代码），故 21 个仓库 = 20 款。

---

## §2 通道外机制专项

**检索面**：21 份 README 全文 + 关键词扫描（`preload|ipcRenderer|nodeIntegration|contextBridge`、`serviceWorker`、`WebGPU|OffscreenCanvas|WebGL`、`DWM|registry|globalShortcut|Tray|nativeTheme|chrome.storage`、`dist/|前端文件|install.sh`、`浏览器扩展|extension|userscript`）。
`service worker`、Electron preload / IPC **零命中**；WebGPU/WebGL 命中 2 款（3 号 open-sea-skin、5 号 elysia 壁纸），但那是 **DOM 里的 canvas**，仍属 C3。

### 2.1 改宿主已构建前端产物 —— 唯一「JS 插件做不到」的一类

- 证据：`d-dev0101/open-sea-skin` §静态前端安装：「**此方式会修改前端文件**。先停止 Harness，[查看脚本](install.sh)」，安装命令 `curl -fsSL .../install.sh | bash`，并在「Harness 前端升级后，使用 `bash -s -- --update` 重新应用皮肤」；仓库带 `native-dist/README.md`（指定路径、备份与恢复）。第 5 种交付「原生源码接入」则是自建前后端（验证基线 `0.1.2-alpha.3`）。
- 判定：**通道外，且不能由「一个不修改宿主源码的 JS 插件」实现。** 它改的是 `dist` 产物，不是运行时注入；每次宿主升级都要重打补丁，这是它的结构性代价。
- 但我们据此得到一条有用的推论：**同一个视觉原语（C3 canvas + C2 玻璃）可以同时走插件的运行时注入，也可以走产物补丁。** 也就是说，通道外的不是「能力」，而是「交付方式」——这恰好说明 5 通道描述的是能力面，不是安装面。

### 2.2 浏览器扩展注入 —— 通道外交付，绕过插件系统

- 证据：同一仓库第 3 种交付，「加载已解压的扩展程序」，选择含 `manifest.json` 的目录；README 称扩展「只作用于经过验证的本地 DeepSeek Harness 页面」，视觉偏好走「Chrome/Edge 同步存储」。
- 判定：通道外（不是 DSH 插件），但**技术上是等价能力**：content script 就是往页面塞样式与 canvas。代价是脱离插件市场的分发与升级链，且拿不到 `ctx.theme` 等宿主服务。

### 2.3 宿主进程内猴补丁 —— JS 插件能做，但脆弱

- 证据：`dsh-theme-mediascape`「媒体加载与鉴权代理」段：插件在启动阶段**包装 `process.stdout.write`**，在 DSH 打印带 token 的访问地址那一刻抓取 token（只读分片、原样透传），再经 `GET /theme-mediascape-assets/media-token` 下发给前端；拿不到时回读 `dsh-proxy.log` 兜底。目的是让 `<video>` 的 Range 请求不被鉴权代理 302 掉。
- 判定：**通道外，但一个不改宿主源码的 JS 插件能做到**（Host 半部就在宿主进程里）。风险点明确：依赖宿主启动日志的格式与时机，属未公开契约。

### 2.4 外部原生二进制 —— ffmpeg

- 证据：`elysia395/dsh-wallpaper-engine`「帧率上限由 ffmpeg 转码生成缓存：先播放原片，完成后切换；优先使用可用的硬件编码器，失败回退原片或软件编码」，并提供 `DSH_WE_FFMPEG` / `DSH_WE_FFMPEG_URL` 指定或下载。
- 判定：通道外（供给链），JS 插件可做（下载/调用外部可执行文件），但引入了宿主之外的二进制依赖与信任面。

### 2.5 宿主 FS / 注册表 / 系统清单扫描

- 证据：`ruijiaang-lab` 读 Steam `libraryfolders.vdf` 并扫 `steamapps/workshop/content/431960/*`；`elysia395` 通过注册表定位 Steam、env `DSH_WE_STEAM_ROOT`；`dsh-background-by-model` 把素材落 `~/.dsh/.dsh-background-by-model-data/` 并从 CDN 拉节日图缓存到 `holiday-cache/<tag>/`。
- 判定：通道外（数据供给），JS 插件可做。注意它把「资源从哪来」和「怎么送进浏览器」分成了两件事：前者是宿主能力，后者仍是 C4。

### 2.6 Agent 工具面 —— 让模型生成皮肤素材

- 证据：`ash-qw/dsh-theme-prts` 注册 `prts_emblem_inspect` / `prts_emblem_preview` / `prts_emblem_apply`，参数含 `mode: lineart`、`lineSource: edges|ink`、`cleanup: 0..12`，可在会话里说「把这张图做成 PRTS 粒子徽记」；服务端图片处理需 Node ≥ 20.9。
- 判定：通道外，JS 插件可做。这是生态里第一次看到「主题插件同时是 Agent 工具提供方」——主题素材的生产被搬进了会话，而不是留给用户手搓。

### 2.7 边界情形（不算越界，但要说清）

- **OS 已装字体**（`dsh-anthropic-fonts`）：`@font-face` 一条不写，靠用户在本机装 `.ttf`。资源供给在通道外，浏览器侧仍是 C5。
- **桌面端专属能力**：`mc-skin` README 对比了官方 Electron（独占 `$DSH_HOME/profiles/desktop`，**不提供 `webServer`**）与第三方 Tauri（顶部菜单「是 Tauri 原生菜单，不在网页 DOM 里」）；`dsh-theme-gallery` 也记「桌面版不读 `$DSH_HOME/settings.yaml`」。**未发现任何一款主题插件走 preload / IPC / 原生菜单。**
- **音频层**（`mediascape` 的 BGM 与打字音效）：技术上 `<audio>` + `data:`/blob/路由 = C3+C4，但它不属于「主题/皮肤」本体，宜单列而不硬塞进 5 通道。

---

## §3 与 5 通道的对照结论

### 3.1 机制 → 通道 → 我们的覆盖

> 分类口径：**C1 只计经 `ctx.theme` API 的覆写**；插件在自己注入的 `<style>` 里写 CSS 变量算 C2（如 `dsh-Fonts`）。字体插件必然以 `<style>` 为载体，但归类记 C5，不重复记 C2。

| 机制 | 通道 | 抽样中出现的款（举例，非穷举） | 我们的覆盖情况 |
|---|---|---|---|
| `ctx.theme.overrideTokens()` 覆写 `--dsw-alias-*` / `--dsw-specific-*` | C1 | 1 2 7 9 10 11 12 13 14 19 20 | ✅ 主路径：`src/engine/map-dsh.ts:13` 注释即「token 层：theme.overrideTokens 注册的 `--dsw-alias-*` 变量」；`src/engine/generate.ts:10` 生成 `{light,dark}` 半边载荷，缺席即不写该半边 |
| 注入 `<style>`（自建元素 / `data-plugin-css`） | C2 | 1 3 9 12 13 14 17 18 20 | ⚠️ 仅作字体载体：`scripts/inline-fonts.ts:3` 「`@font-face` + data URI 让首选字体在任何机器上都可解析」；本仓**没有**布局/材质样式注入（推断：`src/engine/font-face.ts` 是纯 CSS 文本，只能经 `<style>` 生效） |
| 改/插 DOM、注册槽位（含改宿主 inline SVG） | C3 | 1 2 3 5 6 8 9 11 13 14 18 19 | ❌ 无。入口、材质层、装饰层全未做 |
| `data:` 内联 / `blob:` / IndexedDB / 自建 `webServer` 路由 | C4 | 2 4 5 6 7 12 13 14 15 18 20 | ⚠️ 只有 `data:` 内联（字体 base64 进 client.js）。无 blob、无 IndexedDB、无 Host 路由 → 大媒体与 CJK 字体走不通 |
| `@font-face` + woff2（随包 / 用户本机 / Host 路由） | C5 | 5 14 15 16 17 | ✅ 随包 `src/fonts/*.woff2` 共 15 个文件（Cascadia Code / Fira Code / IBM Plex Mono / Inter / JetBrains Mono × 400/500/700），latin 子集 base64 内联；`src/engine/font-avail.ts` + `local-fonts.ts` 做本机可用性探测 |

### 3.2 结论

- **我们实际覆盖 2.5 / 5**（C1 与 C5 满，C2 只作字体载体，C3 与 C4 缺）。这与生态的分布一致：**「配色 + 字体」是一个可独立成立的子集**，生态里最轻的一款（`bloom-theme`）只做 C1，并把「只注入 CSS 变量」当卖点。
- **缺口集中在两处，且都不在 token 层**：C3 决定「有没有入口与材质」，C4 决定「能不能放大资源」。壁纸/皮肤类插件之所以看起来能力强，一半来自 C4（路由 + Range + ETag + 分片上传），而不是来自任何隐藏 API。
- **C4 的五种形态已经很清楚**：(a) `data:` base64 内联（体积墙，30 KB→22 MB）；(b) IndexedDB → blob URL（`ui-appearance` 200 MB 视频、`frosted-window` 壁纸）；(c) Host `ctx.webServer` 路由 + ETag/Range（`mc-skin` 字体、`ruijiaang` 媒体、`mediascape` 全站素材）；(d) 远程 CDN 直连/经 Host 缓存（`background-by-model`）；(e) 自有路由兼作设置 API（`custom-font`、`icon-theme`）。**基准 §1.3 说「宿主没有静态目录」仍然成立**——但这些插件证明了「插件自己有路由」是标准出路。
- **C5 的三种形态**：随包内联（我们、`dsh-Fonts` 的 latin 子集）、Host 路由按需（`mc-skin` 的 16 MB 全 BMP）、用户本机安装（`anthropic-fonts`）。三者不是替代关系，是按体积分档。
- **一条给 C1 的新证据**：`--dsw-specific-sidebar-fill` 这类「specific」token 是官方各面自己的背景声明，把它设成渐变就能**零注入**铺满整屏（`theme-gallery` §原理）。我们的 token 面如果只覆盖 alias 而未覆盖 specific，会漏掉这类表达力。

---

## §4 证据缺口与不确定项

- **没读到源码的**：1 2 7 9 10 11 13 19 20 的机制判定主要来自 README 自述（2 号、7 号有「工作原理 / Storage」表，可信度较高；10 号只有一句「只注入 CSS 变量」）。上述「通道」列在源码层未逐一核对。
- **9 号 prts 的粒子实现方式未知**：README 未提 canvas/SVG/Web Worker，无法判断徽记粒子落在 C3 的哪一种（推断为 canvas 或 CSS 动画）。其「偏好写 profile 原生配置」的具体落盘路径也未读到。
- **19 号 theme-gallery 只精读了机制段**：72 KB README 中「67 token / 102 token 深色形态」的键名清单、皮肤 JSON schema、`embed-themes` 构建细节未逐一核对；「桌面版不读 `settings.yaml`」为作者排障自述，未在宿主源码验证。
- **4 号 ruijiaang 的 L200-215（媒体如何服务）与 macOS WaifuX 路径未读完**；5 号 elysia 的 `docs/HOW-IT-WORKS.md`（降级链、Scene 兼容性）未读，Scene 渲染细节只有 README 自述。
- **20 号 my-skin 的安装方式存疑**：要求「把 my-skin 文件夹放进 `deepseek-harness/` 根目录」再 `pnpm dsh plugin --profile web add -w ./my-skin`，暗示需要宿主源码树当 workspace；它是否因此改动宿主文件，**未验证**，故未计入 §2.1。
- **19 与 20 不在市场索引里**：`renjie2026/dsh-theme-gallery` 与 `EphoReal/my-skin-for-DeepSeek-Harness` 在 `awesome-dsh-plugin` 的 5786 个 yml 中均无条目（`grep` 零命中），URL 来自任务指定，README 已直连下载并核实存在；其余 18 款均有市场条目，URL 以 yml 的 `url:` 字段为准。
- **版本时效**：抽样池取自 `awesome-dsh-plugin` 的 2026-10-18 快照（`888fbe7`，5786 个 yml / 218 个 `category: theme`），各 README 版本号未逐一记录；DSH 客户端插件 API 在 `0.1.1-rc.2` 有过破坏性变更（`slots.inject` 移除、`settings.plugin.item` 由 list 改 keyed），生态跟进速度不一，结论有保鲜期。
- **一处方法学偏差**：抽的是「有 README、有机制自述」的项目，沉默的插件（尤其纯 CSS 小主题）不会进入本表，可能低估 C1 的占比、高估工程复杂度。

---

## §5 来源 URL 索引

抽样池与列表：
- https://github.com/caoyiwei850/awesome-dsh-plugin
- https://github.com/awesome-dsh-plugin/awesome-dsh-plugin （README.md / README.zh.md；结构化数据在 `data/plugins/*.yml`）
- https://github.com/imsai-sh/awesome-deepseek-harness-plugins
- 本地 fork 快照：`D:\dsh-plugin\awesome-dsh-plugin`（`888fbe7b326f0f3c7443d48f0075ef7007974324`）

被抽仓库（按 §1 序号）：
1. https://github.com/wsxwj123/dsh-plugins/tree/main/packages/dsh-appearance-gallery （monorepo 子目录，非独立仓库）
2. https://github.com/TQSY114514/dsh-ui-appearance
3. https://github.com/d-dev0101/open-sea-skin
4. https://github.com/ruijiaang-lab/dsh-wallpaper-engine
5. https://github.com/elysia395/dsh-wallpaper-engine
6. https://github.com/EIGHTfs/dsh-theme-mediascape
7. https://github.com/HarmlessFunny/dsh-background-by-model
8. https://github.com/AKS1st/dsh-cyber-particle
9. https://github.com/ash-qw/dsh-theme-prts
10. https://github.com/webkubor/dsh-bloom-theme
11. https://github.com/cherrchen/dsh-theme-studio
12. https://github.com/SenryLee/dsh-frosted-window
13. https://github.com/du-u-uck/DSH-Transparent-UI-Plugin （上游） · https://github.com/Aliww2468/dsh-client-ui-aqua-patched （修复分发包）
14. https://github.com/lyingice/dsh-client-ui-mc-skin
15. https://github.com/zhijun-dai/dsh-Fonts
16. https://github.com/Isilsolme/dsh-anthropic-fonts
17. https://github.com/Vergil-long/dsh-custom-font
18. https://github.com/yzke/dsh-icon-theme
19. https://github.com/renjie2026/dsh-theme-gallery
20. https://github.com/EphoReal/my-skin-for-DeepSeek-Harness

本仓参照：
- `docs/research/theme-ceiling-benchmark-151.md` §1.3（5 通道定义与宿主源码行号）
- `src/engine/map-dsh.ts:13`、`src/engine/generate.ts:10`、`scripts/inline-fonts.ts:3`
