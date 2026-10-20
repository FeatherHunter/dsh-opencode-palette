# dsh-wallpaper-engine 深度源码调研

> **调研对象**：[github.com/elysia395/dsh-wallpaper-engine](https://github.com/elysia395/dsh-wallpaper-engine)，npm 包 `dsh-plugin-wallpaper-engine`
> **版本快照**：`v1.3.3`，HEAD = `01fbb8b`（浅克隆 depth=50），本机 Windows / Node v24.19.0
> **调研方法**：主控独立核查（跑命令、读源码、跑构建、`npm pack --dry-run`）+ 11 路并发 subagent 分维度深挖 + 对抗性审计
> **证据约定**：本文所有 `<路径>:<行号>` 锚点**相对被调查仓库根目录**（`D:\dsh-plugin\dsh-wallpaper-engine`）。凡标「推断」者为判断而非事实。**源码与仓库文档冲突时以源码为准**，冲突点逐条列出。
> **本报告写在**：`dsh-opencode-palette/docs/research/`（本仓既有笔记目录）。

---

## 0. 一句话结论

`dsh-wallpaper-engine` 是一个**把 Wallpaper Engine 的壁纸生态搬进 DeepSeek Harness 聊天界面背后**的插件：它做 Host 侧扫描/取字节、Browser 侧铺 DOM 图层，两半之间**只有 43 条同源 HTTP 路由**这一个接口面。

它的技术气质可以用一句话概括：**"把'拿不到'变成'明确留空'"**。仓库里最大的一次重构（约 1 万行）是删掉 CPU 兜底出图，因为"能产出一张劣质图"比"没有画面"更危险；同一哲学贯穿缓存降级、条件求值 fail-open、失败记忆、索引签名对不上时宁可同步全扫也不回旧载荷。

它的技术债同样有迹可循：**构建期把 73 个模块平铺进同一个作用域**（依赖关系只存在于注释里），**文档与源码有四处不一致**（其中一处把构建守卫说反了），**遮挡功能只覆盖 Linux X11 一条路**，**产物 4.54MB 里 52.2% 是 base64 PNG**。

---

## 目录

| 章 | 标题 | 讲什么 |
|---|---|---|
| 0 | [一句话结论](#0-一句话结论) | |
| 1 | [它是什么：定位、能力边界与规模](#1-它是什么定位能力边界与规模) | 定位、非目标、99,309 行规模基线、依赖面 |
| 2 | [架构总览](#2-架构总览一个包两个半边一张路由表) | 两个半边、43 条路由契约、生命周期时间线、loopback 例外通道 |
| 3 | [发现链：从 Steam 到一份清单](#3-发现链从-steam-到一份清单) | Steam 探测 → 扫描 → 归属 → 清单 → 播放列表 → 上传 |
| 4 | [出画面](#4-出画面从-wallpaper-engine-内容到屏幕上的那一帧) | 五级来源链、渲染页、围栏、抓帧回填、失败记忆、取色 |
| 5 | [视频壁纸与媒体传输管线](#5-视频壁纸与媒体传输管线) | `<video>` 垫底、media-bridge/ffmpeg/Swift、自研 MP4 VFS、loopback 媒体源 |
| 6 | [遮挡判定与性能治理](#6-遮挡判定与性能治理) | X11/EWMH 原理、心跳看护、首帧预算、失败记忆、性能夹具 |
| 7 | [设置、持久化与预设](#7-设置持久化与预设) | 唯一 schema、两层存储、原子落盘、预设四段键集 |
| 8 | [客户端渲染分层与液态玻璃 UI](#8-客户端渲染分层与液态玻璃-ui-管线) | 三层浮序、`backdrop-filter` 配方、令牌接管、ADR-0008/0010 |
| 9 | [字体排版系统与国际化](#9-字体排版系统与国际化) | 三条落点通道、字体集两层、本机字体枚举、i18n 三闸、令牌契约 |
| 10 | [构建与验证体系](#10-构建与验证体系) | 手写零依赖内联器、三道构建守卫、57+6+6 守卫链、CI 三个反直觉决定 |
| 11 | [工程治理、宿主兼容与生态](#11-工程治理宿主兼容与生态) | `engines.dsh`、harness-compat、让路协议、文档体系、贡献者、开放 issue |
| 12 | [优点](#12-优点) | |
| 13 | [缺点与风险](#13-缺点与风险) | |
| 14 | [平台覆盖矩阵](#14-平台覆盖矩阵) | |
| 15 | [结论](#15-结论) | 值得抄的五件事 / 最该补的五个洞 / 适用性判断 / 复算命令 |

---

## 1. 它是什么：定位、能力边界与规模

### 1.1 一句话产品定义

在 DSH 的聊天界面**背后**铺一层壁纸（`position:fixed; z-index:-1`），并且提供一套完整的壁纸管理面板（选择器、轮换、属性、字体集、玻璃 UI、主题跟随）。

它**不是**壁纸引擎本身——它是 Wallpaper Engine 的**客户端 + 渲染宿主**：Wallpaper Engine 的创意工坊内容由用户自己安装，本插件负责发现、枚举、取字节、铺图层。

### 1.2 明确的非目标（README 与代码都守住了）

- ❌ **不向 agent 注册工具**：不暴露 model-visible tool。
- ❌ **不注入提示文本**：不给 LLM 加 prompt。
- ❌ **不增加模型 token 开销**。
- ❌ **不覆盖任何宿主自带配置**：`cordis.patch.yml` 只 `insert` 一行，从不 override。

但 README 同时自陈**不是完全离线**：会下载 ffmpeg / media-bridge 运行时、查询 GitHub Stars、开启在线歌词时会把歌名/歌手/专辑发给 LRCLIB。

### 1.3 规模基线（主控实测）

| 目录 | 行数 | 文件数 | 说明 |
|---|---:|---:|---|
| `test/` | 52,716 | 97 | **测试代码多于产品代码**（产品 = src+lib = 45,271 行，比例 1.16×） |
| `src/` | 29,389 | 73 | 浏览器半（唯一真源，不随包发布） |
| `lib/` | 15,882 | 58 | 宿主半（随包发布） |
| `scripts/` | 1,113 | 4 | 构建/发布脚本 |
| **合计** | **99,309** | **233** | |

`lib/` 细分：本体 8,565 · `lib/routes/` 4,568 · `lib/media/` 1,506 · `lib/occlusion/` 682 · `lib/webwallgl/` 342 · `lib/types/` 219。

最大单文件：`test/verify-scene-live.mjs` 6,854 行 · `src/client.js` 5,416 行 · `test/verify-client.mjs` 5,163 行 · `test/verify-glass-surfaces.mjs` 2,266 行 · `lib/settings-schema.js` 1,825 行 · `lib/index.js` 1,392 行 · `src/parallax-layer.js` 1,245 行。

`git ls-files` = 352 个文件；`git ls-files lib/client.js` = **空** ⇒ 构建产物已出库（ADR-0012 兑现）。

### 1.4 依赖面

**运行时依赖只有两个**：

| 包 | 作用 | 依赖形态（反直觉点） |
|---|---|---|
| `webwallgl@^3.0.0` | 实时渲染引擎（浏览器端） | **不是 import**。`lib/index.js:136` 用 `dirname(createRequire(import.meta.url).resolve('webwallgl'))` 定位包目录，`lib/routes/scene-serve.js:67` 把 `/scene-live/engine/<file>` 直出到该目录下的文件；未安装 ⇒ 404 `webwallgl-not-installed`（`:99-101`） |
| `x11@^4.3.1` | Linux X11 遮挡数据采集（EWMH） | **懒 import**（`lib/occlusion/x11.js:134-139`），使 hub 单测与 Windows/macOS 冒烟不必加载它 |

另有三个 DSH peer 包（`dsh-host-webserver` / `dsh-client-ui-slots` / `dsh-client-runtime`）——**代码里零 import**，全部靠服务注入（`ctx.webServer` / `ctx.slots` / 客户端模块表 id），且 `peerDependenciesMeta` 全为 `optional: true`（`package.json:118-128`）。

`overrides` 钉 `js-yaml 4.3.2`；devDeps 只有 eslint / typescript / @types/node。**零运行时框架依赖**（React 走 peerDep，由宿主客户端模块表提供）。

---

## 2. 架构总览：一个包，两个半边，一张路由表

### 2.1 切分维度不是"lib=服务端 / src=客户端"

`docs/CODE-STRUCTURE.md:32-44` 的口径是两个**正交**属性——**跑在哪个进程** × **是否随包发布**，四格落点：

| | 随包发布 | 不随包发布 |
|---|---|---|
| **浏览器进程** | `lib/client.js`（生成物，全仓唯一一个） | `src/**`（浏览器侧唯一真源） |
| **宿主进程** | `lib/index.js` + 其 import 的 `lib/**` + `lib/webwallgl/` + `lib/types/` | `test/` / `scripts/` / `docs/` |

**唯一的跨半边共享物**是 `lib/settings-schema.js`：它既被宿主 `lib/index.js` import，也是构建期 `INLINE_MODULES` 里唯一的 `lib/` 条目（`docs/CODE-STRUCTURE.md:220` 称之为"唯一共享内核"）。两端各自用它做**同一种 kind 消毒**（`lib/routes/settings.js:15`："唯一真源见 ../settings-schema.js"；`src/persistence.js:177`：`sanitizeSettings(hostSettings)`）。

### 2.2 装起来：两处声明，各管一半

**宿主行**——`package.json:86-88` 的 `dsh.bundle.patch → ./cordis.patch.yml`，全文只有 23 行，实质只插入一行：

```yaml
# cordis.patch.yml:19-23
    - insert:
        - id: wallpaper-engine
          name: 'dsh-plugin-wallpaper-engine'
          # webServer is a hard dependency (`inject = ['webServer']` in lib/index.js):
          # the Loader waits for the HTTP server to mount, so a headless/TUI profile
          # without one does not load this bundle at all.
```

插入行**没有任何 `config`**——与 `docs/DSH-UI-INTERFACES.md:106` 记录的宿主机制一致（patch 的 `insert` 行只是"插入插件条目"）。

**浏览器行**——`package.json:89-95`：

```json
"client": {
  "inject": ["@deepseek-ai/dsh-client-runtime"],
  "platform": "web",
  "immediately": true
}
```

配套 `exports["./client"]` 指向 `lib/client.js`（`package.json:34-37`）。

> ⚠️ `dsh.client.inject` 的语义在宿主文档里原文是 "**only order activation**" 且 "**They change without notice**"（`docs/DSH-UI-INTERFACES.md:107`）——**属不稳定接口**。本仓自己把它当"只用来排序，风险有限"。

**关键事实**：宿主**没有提供任何路由把 `lib/client.js` 发给浏览器**。43 条路由（`docs/ROUTE-INDEX.md:13`）里没有一条是 `/client`。浏览器半边由**客户端加载器**按包元数据取走，用 `window.__ModuleLoader__.load({ id, factory })` 消费（`docs/CODE-STRUCTURE.md:53,59`）。

### 2.3 启动：硬依赖换确定的启动序

```js
// lib/index.js:1091
export const inject = ['webServer'];
```

理由逐字写在 `lib/index.js:1083-1090`：

> "Hard-depend on `webServer` so the Loader waits for the HTTP server to mount before running this plugin. A `ctx.get()` at mount time is racy: rows mount concurrently and the webserver may not exist yet, which would **silently skip route registration and let the SPA fallback answer every request**. This bundle is web-only (its `dsh.client` declares platform "web"), so a hard injection is correct; it is simply not added to headless/TUI profiles."

`apply(ctx)` 的头几步（`lib/index.js:1093-1121`）：

1. **写版本戳**：`<pluginDataDir>/build-stamp.json`（`at` / `hostFile` / `hostMtime`），纯诊断用，失败不影响加载（`:1096-1106`）。
2. **防御性早退**：`if (!webServer || typeof webServer.register !== 'function') return () => {};`（`:1108-1111`）——与 `inject` 硬依赖重复，真到不了这里，真到了也只静默无路由。
3. **日志/提示通道**：`createLog(ctx.logger(PLUGIN_NAME))` + `createNotice(log, PLUGIN_NAME)`（后者是"每 kind 每会话至多一条"的提示 sink，`:1115-1121`）。
4. **媒体 token 表**：`mediaMap = new Map()`，token = 绝对路径的 base64url（`:1123-1131` 注释："route never exposes an arbitrary filesystem string"）。
5. **缓存清扫推迟 3 秒**：`startupSweepTimer = setTimeout(..., 3000)`（`:1160-1186`）——理由是同步遍历会阻塞插件树加载。
6. **注册 43 条路由**：全部经 `webServer.register({ kind: 'exact', path })`，句柄推进 `disposers`。

浏览器半：`src/client.js:5083` `const inject = ["slots"]`（只硬依赖 slots 一个服务）→ `:5222` `apply(ctx)` → `:5230-5455` 主 effect 订阅 5 个同步器（`syncLayers` / `applyEffects` / `syncFxLayer` / `syncParallaxLayer` / `syncAvatarLayer`）→ `:5534-5541` 注册设置页槽：

```js
ctx.slots.inject("settings.section", () => ctx.slots.register(
  { name: "settings.section", id: "wallpaper-engine", order: 500, label: () => weT("壁纸引擎") },
  () => React.createElement(WallpaperPickerSection)));
```

启动数据链（`src/client.js:5615`）：`loadPersisted().then(loadFontSet).then(loadInventory).then(loadGlassPresets).catch(...)`——终止 `.catch` 是必须的，否则选择器会永久停在"扫描 Wallpaper Engine…"。

### 2.4 生命周期时间线

| 时刻 | 宿主（Node） | 浏览器 |
|---|---|---|
| 装载 | 读 `dsh.bundle.patch` → 应用 `cordis.patch.yml` → 插入行 | 客户端加载器按 `dsh.client` 清单取 `exports["./client"]` |
| 挂载 | `inject=['webServer']` ⇒ 等 HTTP 服务就绪才 `apply(ctx)` | `apply(ctx)`，`inject=['slots']` ⇒ 等 slots 服务 |
| 启动 | 写 build-stamp → 建套件 → 3s 后清缓存 → 注册 43 条路由 | `loadPersisted` → `loadFontSet` → `loadInventory` → `loadGlassPresets` |
| 稳态 | 每次请求命中路由族；`disposers` 记账 | `emit()` ⇒ 5 个订阅器重算图层/玻璃/特效 |
| 卸载 | fiber disposer：disposers / ensuredDirs / transcodes / streams / mediaMap | `ctx.effect` cleanup：解绑 / 拆层 / 撤 style / `cancelPendingPersist` |

卸载是 fiber 的返回值（`lib/index.js:1464-1478`），**五类资源逐项回收**：

```js
return () => {
  for (const d of disposers) { try { d(); } catch { /* ignore */ } }
  ensuredDirs.clear();
  disposeTranscodes();
  for (const s of activeStreams) {
    if (!s.destroyed) { try { s.destroy(); } catch { /* ignore */ } }
  }
  activeStreams.clear();
  mediaMap.clear();
};
```

浏览器半的 cleanup 在 `src/client.js:5368-5455`：逐项解绑订阅、拆层、撤样式、`cancelPendingPersist()`。

### 2.5 跨半边契约：43 条同源 HTTP 路由

- **唯一接口**：`docs/CODE-STRUCTURE.md:101-102`——"两条路径的**唯一接口**是 HTTP 路由表。因此路由表是**生成物**"。
- **路由表是生成物**：`docs/ROUTE-INDEX.md:1-4`——生成器 `node test/tools/host-route-index.mjs --write`，核对 `node test/verify-route-index.mjs`，"守卫会在索引与代码不一致时失败 —— 索引因此不会烂掉"。
- **前缀**：`const BASE = '/wallpaper-engine'`（`lib/index.js:122`）。
- **客户端唯一网络出口**：`src/api-client.js:36` `const BASE = '/wallpaper-engine'`；`apiUrl()` 补前缀（`:38-47`）；`apiFetch()` 统一 `cache: "no-store"`、**不抛错**、返回 `{ok,status,data,error}`（`:60-82`）。文件头写着不变量"**业务代码零裸 `fetch(`**"（`:10`）。

按职责分五族（`docs/HOW-IT-WORKS.md:116-117`）：**素材** · **转码** · **实时渲染** · **出图与抓帧** · **设置与系统**。

> ⚠️ **文档↔源码不一致 ②**：实现侧 `lib/routes/` 实为 **21 个族文件**（`about-qr` / `avatar` / `cache-dir` / `diag` / `fontsets` / `github-stars` / `live-frame` / `mascot` / `media-bytes` / `media-derived` / `now-playing` / `occlusion` / `presets` / `props` / `scene-frame` / `scene-media` / `scene-serve` / `settings` / `system-fonts` / `upload` / `we-assets`），`docs/CODE-STRUCTURE.md:110` 的口径是"**一文件一族**"，`docs/ROUTE-INDEX.md:69-91` 也逐行列了 21 个模块。"五族"读起来像代码结构，实际是作者视角的功能分组——**同名异义**，读者容易误判粒度。

### 2.6 一条例外通道：独立 loopback 媒体源

`lib/media-origin.js` 自建 `127.0.0.1` 随机端口监听（`server.listen(0,'127.0.0.1')`，`:166-170`），只服务 `/scene-files/` + `/diag`（`:154-161`），端口经 `GET /wallpaper-engine/media-origin` 路由发现（`lib/routes/scene-serve.js:157`），随插件卸载 close（`:179`）。

**为什么必须绕开宿主路由**：DSH Desktop 给每条插件路由套了能力头栅栏（`x-dsh-desktop-renderer`，只注入给同源 frame 发出的请求），而**严格沙箱 iframe 是不透明源**，永远拿不到该头 ⇒ 网页壁纸入口会**一律 403**（表现：预览图正常、随后整块黑）。媒体源不经过该栅栏 ⇒ 第三方 HTML 连宿主 origin 都不沾边（`docs/HOW-IT-WORKS.md:77-99`）。

⇒ 跨半边协议 = **HTTP/JSON + 字节流 + `postMessage`**（`postMessage` 只用于渲染页与宿主注入的遮挡桥之间，`lib/webwallgl/occlusion-bridge.js:9-10`）。

### 2.7 `src/adapter.js`：把"宿主形态"变成一等能力矩阵

`src/adapter.js`（149 行）解决"这段代码跑在哪种宿主里"，三档：`browser` / `desktop-community` / `desktop-official`。事实来源（`:5-12`）：

- 能力头 `x-dsh-desktop-renderer` ⇒ 带栅栏的桌面端；
- UA 含 `Electron/` ⇒ 桌面壳（官方与社区都是 Electron，这一档分不了官民）；
- 两者皆无 ⇒ 原生浏览器。

**裁决优先级**：**手选 > 宿主上报 > 本地判定**（`:16`）。宿主按请求观测并闩锁（只增不减），经 `GET /settings` 的 `adapter` 字段上报（`:13-14`；宿主侧 `lib/media-origin.js:27-45`，两把闩锁 `adapterFenceSeen` / `adapterShellSeen`）。客户端落点 `setAdapterFromHost()`（`:45-49`，由 `src/persistence.js:167` 在 `loadPersisted` 里调用）。

能力矩阵（`:106-115`）是客户端四处行为的唯一依据：

```js
function adapterCaps() {
  const target = resolveAdapterTarget();
  const desktop = target !== 'browser';
  return {
    target, desktop,
    fence: Boolean(adapterHostReport && adapterHostReport.fence),
    blurPause: !desktop,
  };
}
```

`blurPause = !desktop` 的理由（`:102-104`）：桌面壳失焦时壁纸多半仍整块可见（壳透明/壁纸就是窗口底），暂停会定格**可见**画面；浏览器里失焦通常意味着窗口已被完全盖住。

还带一句可执行警示（`:131-143`）：手选 browser 但宿主观测到 fence ⇒ "网页壁纸会 403，请改回自动检测或桌面目标"。

---

## 3. 发现链：从 Steam 到一份清单

发现链在仓库里是**三层**：`lib/steam-discovery.js`（找到 "WE 装在哪"）→ `lib/wallpaper-scan.js`（把目录树变成条目）→ `lib/inventory.js`（把条目变成 `/inventory` 载荷）。

三层边界被文件头写死：**扫描根推导只有一个出处**（`scanRootsP`）、**安装根推导只有一个出处**（`locateWallpaperEngineP`）、**清单字段形状只有一处实现**（`assembleInventory`）——`lib/wallpaper-scan.js:21-26`、`lib/steam-discovery.js:9-21`、`lib/inventory.js:38-47`。

**发现是完全按需的**：全仓只有 `lib/index.js:1231-1247` 一条路由消费 `buildInventory()`，宿主启动时不扫；客户端在启动链里才第一次拉它（`src/client.js:5615`）。

### 3.1 定位 Wallpaper Engine：探测顺序

`steamProbeDirsP()` 组装探测列表，顺序被刻意固定（`lib/steam-discovery.js:125-141`）：

```js
const env = steamRootsFromEnv();
const reg = await steamPathFromRegistryP();
const wsl = await wslSteamRootsP();
return [...env, ...(reg ? [reg] : []), ...STEAM_PROBE_DIRS, ...wsl];
```

**env 排最前是有意的**，文件头逐字说明（`:117-124`）：

> "The env override comes FIRST on purpose: it is an explicit user (and self-check) instruction, and `locateWallpaperEngineP` returns the first candidate that matches — with the registry first, a deliberate override could never point away from an install Steam already knows about, and fixture-based self-checks would silently pick up the developer's real install."

`DSH_WE_STEAM_ROOT` 用 `[,;]` 分隔多个根（`:75-83`），逐个过 `wslPath`（WSL 下 `X:\rest` → `/mnt/x/rest`，`:163-168`）。`STEAM_PROBE_DIRS` 是硬编码的 Windows 清单（`:28-34`）：`C:\Program Files (x86)\Steam` / `C:\Program Files\Steam` / `D:\Steam` / `D:\SteamLibrary` / `E:\SteamLibrary`。

**逐平台**：

- **Windows**：Steam 根来自注册表 `reg.exe query 'HKCU\Software\Valve\Steam' /v SteamPath`（`:52-72`），**异步** `execFile`、5s 超时、`windowsHide: true`；注释点名理由 "`execFileSync would block the event loop`"（`:57`）。`reg.exe` 路径由 `resolveRegExeP()` 推（`:37-49`）。查不到 ⇒ 落到 5 个硬编码目录。
- **Linux / WSL**：两条腿——① 借 Windows 的注册表（在 `/mnt/<盘符>` 下找 `Windows/System32/reg.exe`，`:41-48`）；② 直接探 `/mnt/<盘符>` 下的四个 Steam 目录，但**要求存在 `steamapps/libraryfolders.vdf`** 才算候选（`:90-107`）。
- **macOS**：**代码里没有任何 macOS 分支**——`resolveRegExeP` 在非 win32、非 linux 时 `return null`（`:41`）；`wslSteamRootsP` 非 linux 时 `return []`（`:91`）。⇒ macOS 默认必然"未安装"，唯一出路是 `DSH_WE_STEAM_ROOT` 显式指定。**推断**：该覆盖在 macOS 上应当能生效（下游推导 `<root>/steamapps/common/wallpaper_engine` 与 `<root>/steamapps/workshop/content/431960` 是平台中立，`:230` 与 `lib/wallpaper-scan.js:126-129`），但仓库里**没有任何 macOS 夹具或测试**覆盖这条路径。

### 3.2 "已安装"的判据是标记文件，不是某个 exe

```js
// lib/steam-discovery.js:198-204
const WE_INSTALL_MARKERS = [
  'wallpaper32.exe',
  'wallpaper64.exe',
  join('distribution', 'wallpaper32.exe'),
  join('distribution', 'wallpaper64.exe'),
  join('distribution', 'version.json'),
];
```

理由（`:187-197`）：经典布局 exe 在顶层；当前版本 exe 下移到 `distribution\`，顶层只剩 `launcher.exe` / `installer.exe` / `ChromaAppInfo.xml`；`distribution/version.json` 是"永远随 exe 一起发"的稳定标记。命中任一 ⇒ 该目录是安装根，且**返回安装根本身**（`projects/` 与 `config.json` 所在层），不是 `distribution\`（`:206-216`）。

这是本仓被明确盯住过的回归：旧判据只探顶层 `wallpaper32.exe`，把已安装判成未安装 ⇒ portable 项目整批不扫、WE 播放列表读不到 ⇒ **轮换失效**（`test/verify-we-install-probe.mjs:3-11`）。

**版本字段其实从不读**：`distribution/version.json` 只被当作存在性标记使用，全仓没有读它内容的代码（`:203` 是唯一引用点）。真正带版本语义的是索引格式版本 `INDEX_VERSION = 2`（`lib/inventory.js:150`）与签名前缀 `'we-scan-v1\0'`（`lib/wallpaper-scan.js:146`）。

### 3.3 归属库：判据是"真正会被扫的那个目录"

库来源是 `libraryfolders.vdf`（`lib/steam-discovery.js:171-185`），判据是"这个 path 块里**出现过 appid**"：

```js
for (const line of text.split(/\r?\n/)) {
  const m = /^\s*"path"\s+"([^"]+)"\s*$/.exec(line);
  if (m) { current = m[1].replace(/\\\\/g, '\\'); continue; }
  if (current && line.includes(WE_APPID)) {
    const t = wslPath(current);
    if (t && !libs.includes(t)) libs.push(t);
  }
}
```

appid 由宿主注入（`lib/index.js:120`：`const WE_APPID = '431960';`），是模块里唯一认识 WE 的地方（`lib/steam-discovery.js:17-18`）。测试用合成 appid `777777` 反证"appid 不是硬编码"。

**默认库不在 vdf 的 "path" 列表里**，所以额外补一条（`:260`）：

```js
if (await pathExistsP(join(probe, 'steamapps', 'workshop', 'content', WE_APPID))) libs.push(probe);
```

注释（`:251-259`）说清两边的不对称：探"安装夹"会登记一个永远出不了壁纸的库（卸载残留），探"真正被扫的那个目录"才既不漏也不多。

### 3.4 扫描根与枚举

```js
// lib/wallpaper-scan.js:118-131
async function scanRootsP(installDir, libraryDirs) {
  const roots = [];
  if (installDir) {
    for (const sub of ['defaultprojects', 'myprojects']) {
      const p = join(installDir, 'projects', sub);
      if (await pathExistsP(p)) roots.push(p);
    }
  }
  for (const lib of libraryDirs) {
    const ws = join(lib, 'steamapps', 'workshop', 'content', WE_APPID);
    if (await pathExistsP(ws)) roots.push(ws);
  }
  return roots;
}
```

三类根：安装根下的 **portable 项目** + 每个归属库下的**创意工坊内容**。签名与枚举共用它（不变量 ①，`:21`），因为"签名少算一个根 ⇒ 那一根里新增的壁纸永远不进库"（`:114-117`）。

### 3.5 `project.json` 契约

`readProjectP`（`lib/wallpaper-scan.js:62-86`）是清单条目元数据的**唯一来源**：

```js
const o = JSON.parse(await readFile(pj, 'utf8'));
if (!o || typeof o !== 'object' || !o.file) return null;
let type = typeof o.type === 'string' ? o.type.toLowerCase() : inferType(o.file);
if (!KINDS.includes(type)) type = 'scene';
return {
  id: basename(dir),
  title: typeof o.title === 'string' ? o.title : basename(dir),
  type,
  file: o.file,
  preview: typeof o.preview === 'string' ? o.preview : null,
  contentrating: typeof o.contentrating === 'string' ? o.contentrating : null,
  schemeColor: schemeToCss(o.general && o.general.properties
    && o.general.properties.schemecolor && o.general.properties.schemecolor.value),
};
```

| 字段 | 用途 | 缺失/非法时 |
|---|---|---|
| `file` | 主文件（相对项目目录） | **缺 ⇒ 整条不成立**（返回 `null`） |
| `type` | 四类分类 | 非字符串 ⇒ 按 `file` 扩展名推断；不在白名单 ⇒ 落 `scene` |
| `title` | 显示名 | 回落目录名 |
| `preview` | 预览图 | `null` |
| `contentrating` | 内容分级（Everyone/PG13/Mature） | `null` |
| `general.properties.schemecolor.value` | 作者主题色 | `null` |

`schemecolor` 是 WE 的 0–1 浮点三元组，`schemeToCss` 换算成 CSS（`:54-60`）：`"0.847 0.725 0.713"` → `rgb(216, 185, 182)`。

### 3.6 四类壁纸的判定

白名单（`lib/wallpaper-scan.js:51`）：`const KINDS = ['scene', 'video', 'web', 'application'];`

判定链（`:68-69`）：① `type` 存在且是字符串 ⇒ 小写化后用，**不在白名单 ⇒ 落 `scene`**（"认不得就落 `scene`，不许把未知类型原样透传"）；② `type` 缺失 ⇒ 由主文件扩展名推断：

```js
// lib/wallpaper-scan.js:32-36
function inferType(file) {
  if (/\.(mp4|webm|mkv|avi|mov)$/i.test(file)) return 'video';
  if (/\.(html?|js)$/i.test(file)) return 'web';
  return 'scene';
}
```

| 类型 | 判定依据 | 清单里额外字段 |
|---|---|---|
| `video` | `type:"video"` 或扩展名 ∈ {mp4,webm,mkv,avi,mov} | 唯一会带 `media` URL 的静态类 |
| `web` | `type:"web"` 或扩展名 ∈ {html,htm,js} | `webLiveSrc` / `liveFrame` |
| `scene` | `type:"scene"`、未知类型、或推断落空 | `sceneLive` / `frameUrl` / `scenePkgBytes` |
| `application` | **只有** `type:"application"`（无扩展名推断途径） | — |

**`application` 的实际命运是个不一致点**：Steam 扫描**不过滤**它 ⇒ 它作为 `type:'application'` 进清单，但 `playable=false`（存在性探测只对 video/web 做，`lib/inventory.js:270`）、`propsUrl=null`（只给 scene/web，`:315-317`）；客户端类型档只有 `all|video|web|image|scene`（`src/picker-model.js:25`），`isPlayableType` 也不认它（`:94-102`）⇒ 它在"全部"档里是永远不可选的死条目。而**上传目录扫描则显式跳过 application**（`lib/index.js:790`）——同一种类型在两条入口上待遇不同。

### 3.7 场景容器解析：声明不可信

```js
// lib/wallpaper-scan.js:96-108
for (const candidate of [declared, 'scene.pkg', 'scene.json']) {
  if (!candidate) continue;
  if (await isFileP(resolve(dir, candidate))) return candidate;
}
let pkgs;
try {
  pkgs = (await readdir(dir)).filter((name) => name.toLowerCase().endsWith('.pkg'));
} catch {
  return null;
}
return pkgs.length === 1 ? pkgs[0] : null;
```

顺序：声明的 `file` → `scene.pkg` → `scene.json` → **恰好一个** `*.pkg`。理由（`:88-95`）：工坊条目常声明 `scene.json` 却只发 `scene.pkg`（松散项目反之）。"多个候选 = 没候选，不许猜"有负对照钉住（D7，`test/verify-wallpaper-scan.mjs:379`）。

### 3.8 扫描签名：判据是"根目录 mtime+size"

`scanSignatureP`（`lib/wallpaper-scan.js:144-165`）：sha1 覆盖 `('we-scan-v1\0') + installDir + libraryDirs.join('\0') + 每个根的 (path, mtimeMs:size)`。

- **故意不排序** `libraryDirs`（`:149-153`）：根顺序决定枚举顺序与"同名项目留先遇到者"的取舍，顺序变了结果就变 ⇒ 签名必须变。
- 根 stat 失败记 `'missing'`（`:161`）："它一恢复就会改签名并触发重扫"。
- **只 stat 根目录就够**（`:136-139`）：增删项目改的是根目录 mtime；改一个已存在项目里的 `project.json` 不改根 mtime ⇒ 那一类改动交给索引的 30s 定期复核窗口。
- 签名在扫描**之前**算（`:140-142`）：库里在扫描期间又变了，存下的签名偏旧 ⇒ 下次请求发现不匹配再扫一次，保守那侧。

### 3.9 枚举

`enumerateWallpapersAsync`（`lib/wallpaper-scan.js:167-202`）：每个根 `readdir`（失败则跳过该根）→ 逐项 `isDirectoryP` 过滤 → 按 `SCAN_CHUNK = 24`（`:112`）分块 `Promise.all` 跑 `readProjectP` → **按 id 去重、先遇到者胜** → 结果按 `title.localeCompare` 排序。每条还挂三个绝对路径：`fileAbs` / `previewAbs` / `dirAbs`（后者是探测记忆的失效键，`:190-196`）。

### 3.10 WE 播放列表

`readPlaylistsP`（`lib/wallpaper-scan.js:223-254`）读 `<installDir>/config.json`：`installDir` 为空 / 文件不存在 / JSON 坏 ⇒ 一律 `[]`。来源二选一：`profile.general.playlists`（数组且非空）否则 `profile.general.wallpaperconfig.selectedwallpapers[*].playlist`（`:212-221`）。`order` 只有 `'random'` 才保留，其余一律 `'sequence'`；`id` 是 `base64url(profileName\0index\0name)`。条目 → 壁纸 id 的解析（`playlistItemId`，`:256-268`）：精确路径匹配 → `431960/<id>` 段 → 末尾目录名兜底 ⇒ `null`（计入 `unresolvedCount`）。

### 3.11 清单数据结构

`assembleInventory` 返回（`lib/inventory.js:408-428`）：

| 字段 | 类型 | 含义 |
|---|---|---|
| `installDir` | `string \| null` | WE 安装根（没装 ⇒ `null`） |
| `uploadDir` | `string` | 自定义存储目录 |
| `cacheDir` | `string` | 当前生效的缓存根（env → `config.cacheDir` → 默认） |
| `weAssetsDir` / `weAssetsAvailable` | `string` / `boolean` | WE 官方素材目录 |
| `sceneMediaBase` | `string` | 场景渲染页的媒体源 origin（`''` = 回落应用源） |
| `total` | `number` | 条目总数（含上传） |
| `portableCount` | `number` | `playable` 的条数 |
| `wallpapers` | `WallpaperEntry[]` | 条目数组 |
| `playlists` | `PlaylistDescriptor[]` | 播放列表 |

条目字段（Steam 来源 `lib/inventory.js:289-319` 与上传来源 `:346-376` **共用** `sceneFieldsFor` / `webFieldsFor` 两个字段函数，`:38-39`）：

| 字段 | 类型 | 产出点 |
|---|---|---|
| `id` | `string` | `basename(dir)`（上传：`up-*` / `up-dir-*`） |
| `title` | `string` | `project.json.title` 回落 id |
| `type` | `'scene'\|'video'\|'web'\|'application'`（上传另有 `'image'`） | `project.json.type` / 推断 |
| `contentrating` | `string \| null` | `project.json.contentrating` |
| `playable` | `boolean` | 媒体文件存在（scene 走 `frameUrl`） |
| `media` / `mediaExt` | `string \| null` | `${BASE}/media/<token>` / 真实容器后缀 |
| `preview` | `string \| null` | `${BASE}/preview/<token>` |
| `frameUrl` | `string \| null` | `${BASE}/scene-frame/<token>`（仅 scene 有主文件时） |
| `schemeColor` | `string \| null` | 作者主题色 |
| `sceneLive` / `sceneLiveSrc` / `scenePkgBytes` | `boolean` / `string \| null` / `number` | `sceneFieldsFor`（`:93-124`） |
| `sceneVideo` | `string \| null` | **仅在探测账本确认为 true 时给**，否则 `null` + 投递后台探测 |
| `sceneAudio` | `string \| null` | 包内/同目录音频 |
| `hasCustomFrame` | `boolean` | 用户导入的替换画面 |
| `webLiveSrc` / `liveFrame` | `string \| null` | `webFieldsFor`（`:134-145`） |
| `propsUrl` | `string \| null` | 仅 scene/web：`${BASE}/props/<token>` |

**`sceneVideo` 是清单里唯一有语义负担的字段**（`lib/inventory.js:42-43`）："只有探测缓存确认内嵌 MP4 才给 URL；未知则 `null` + 投递后台探测，**绝不拿 `hasFrame` 冒充**"。探测账本在 `lib/scene-probe.js`，`sceneVideoProbeGet` 返回 `undefined` 表示"没探过"（`:130-136`），任何探测异常都记成"否"、绝不冒泡（`:155-182`）。客户端因此在首拉后补拉一次（`src/client.js:888-894`；本机实测 3/35 个场景、探测约 0.9s）。

### 3.12 三级缓存：整个发现链的性能核心

`lib/inventory.js:49-65` 的文件头把机制写全：

```js
 * ── 三级缓存（#158：大库冷扫 1.9 s / 重启即失 / 改一张也要全扫）───────────────
 *   ① **内存 TTL**（`INVENTORY_TTL_MS`）：同一 `apply` 内连续请求不重复任何 I/O。
 *   ② **扫描索引**（`cacheBaseDir()` 下的 JSON）：缓存"`enumerateWallpapersAsync` 的原始
 *           产出 + 逐条目探测结果"。签名（`scanSignatureP`）没变 ⇒ **零 fs 探测**直接重组载荷。
 *   ③ **stale-while-revalidate 只服务"签名没变、内容可能变了"**（索引老过
 *      `INVENTORY_REVALIDATE_MS`）：本次照旧应答、后台重扫，扫完替换。
 *   ⚠️ **签名对不上时绝不回旧载荷**
```

- ① 内存 TTL = 3000ms（`:148`），命中即**零 I/O**（`:482-484`）。
- ② 磁盘索引 = `<cacheBaseDir()>/inventory-index.json`，`INDEX_VERSION = 2`（`:150-151`）。**存的是"扫描原料"而不是"载荷"**（`:61-65`）：载荷里全是 `tokenFor()` 的产物，而 token 是绝对路径的 base64url、`mediaMap` 是进程内 Map ⇒ 直接回放旧载荷会让重启后每个 media/preview URL 都 404。回放时照常走 `assembleInventory` 重组。
- 索引损坏/版本不符 ⇒ 当"没有索引"，**不抛**（`loadIndex`，`:172-197`）。逐元素形状校验的动机很具体（`:181-186`）：`we: [null]` 会让 `assembleInventory` 抛 TypeError ⇒ 整条 `/inventory` 500，而且索引被 latch ⇒ **跨重启的永久 500**。
- 探测记忆按**项目目录 mtime** 逐条失效（`:260-267`）：只有"目录变了的那些条目"才真探，新增一张只多探一条。
- ③ 索引比 `INVENTORY_REVALIDATE_MS`（30s）老 ⇒ 本次照旧应答、后台重扫（`:500`）。
- **签名对不上 ⇒ 同步全扫**，绝不回旧载荷（`:503-505`）。理由记在文件头（`:55-59`）："那意味着**库本身**变了（换 Steam 根、增删项目目录），回旧载荷等于把上一个库的清单端给用户。实测踩过 —— `test/verify-we-install-probe.mjs` 的四个夹具共用一个 `DSH_WE_CACHE_DIR`，B6/B8 立刻红"。

### 3.13 上传存储：每次现扫，不进索引

`lib/inventory.js:323-324`：

```js
// ── 上传存储：每次请求都现扫（read-A storage，见 lib/index.js 的注释）──
// 它**不进索引**：目录小、变化自由，而且"上传了什么"必须立刻可见。
```

上传枚举在 `lib/index.js:760-828`，两种形态：`up-*` 单文件（mp4 → `video`，其它 → `image`）与含 `project.json` 的项目目录（id 前缀 `up-dir-`）。

### 3.14 属性面板：宿主半 `lib/we-props.js`

它是上游 webwallgl `host/we-props.ts` / Rust `we_props.rs` 的裁剪移植（文件头 `lib/we-props.js:1-30`）。读取路径同样是 `project.json`，但走**另一支**：`general.properties`（属性定义）+ `general.localization`（文案查表，`:77-88`）。

- 判定"真属性"：只有带字符串 `type` 的条目算，`tip` / `ui_*` 之类纯显示项被跳过（`rawProps`，`:121-128`）。
- 排序：`order` 浮点升序，并列按**码位**而不是 `localeCompare`（`:126`）。
- 类型白名单 `KNOWN_TYPES`：color/bool/slider/combo/text/textinput/file/directory/group/other；认不得落 `other`（`:147-148`）。
- `wireValue`（`:99-118`）：color 要字符串、bool 要布尔、slider 强转数字、combo **保留声明类型**。
- `editable === false` 的属性**整条丢弃**（`:145-146`）。文件头自陈这与 WE 不同：WE 仍会把该值发给壁纸，而这里壁纸拿到自己的默认值（`:19-28`），并且"仍会下发"这半边**没有断言**。
- 候选文件清单由 `lib/routes/props.js:63-69` 现读目录给出（目录 ≤60、文件 ≤400）。

`/props/<token>` 路由的降级纪律（`lib/routes/props.js:21-26`）：候选清单**尽力而为**——`project.json` 缺失或目录读不到都退回空列表，**绝不**因此让整条路由失败；未带 token / token 未知 ⇒ 400 / 404，不抛。

### 3.15 条件（谓词）求值器 `src/we-cond.js`

客户端半，纯计算、**无 eval**。文件头给了动机（`:4`）："真实壁纸里 **86% 的属性带 condition**，不求值就会把一堆无关项露出来"。

- 词法 → 递归下降 → 编译成闭包并**按表达式字符串缓存**（`weCondCache`，`:81-153`、`:158-167`）。
- 只允许寻址 `ident` 与 `ident.value`；`.text` 会抛 ⇒ 走 fail-open。
- **fail open**：

```js
// src/we-cond.js:156-174
function weEvalCondition(expr, values) {
  if (!expr || !String(expr).trim()) return true;
  let fn = weCondCache.get(expr);
  if (fn === undefined) {
    try {
      const node = weCondParse(weCondTokenize(String(expr)));
      fn = (v) => Boolean(node(v));
    } catch {
      fn = null; // 不支持的语法 → 恒显示
    }
    weCondCache.set(expr, fn);
  }
  if (!fn) return true;
  try {
    return fn(values);
  } catch {
    return true;
  }
}
```

理由（`:16`）："真实数据里存在用 JS 三元或赋值写 condition 的壁纸，误判隐藏远比分多显示一项糟糕"。

### 3.16 焦点守卫：两半协作

**先纠正一处提法**：仓库里没有 `src/we-focus-guard.js`。焦点守卫只有两半：`lib/we-focus-guard.js`（壁纸文档内的**围栏**）+ `src/focus-handback.js`（宿主文档内的**交还**）。

**围栏要解决什么**（`lib/we-focus-guard.js:4-24`）：某些网页壁纸在**捕获相 mousedown** 里调 `window.focus()` ⇒ 宿主窗口里**任何位置**点一下，DSH 的 composer / 下拉框就丢焦点。之所以能整条废掉，是因为"本插件从不把键盘送进壁纸帧"（web-shim 里 `keydown/keyup/keypress/KeyboardEvent` 零命中）。

**注入方式是源码文本**：

```js
// lib/we-focus-guard.js:57-59
export function weFocusGuardSource() {
  return '(' + weFocusGuardInstall.toString() + ')();';
}
```

所以函数体必须**自足**（不碰模块作用域任何名字）。注入点在 `lib/serve.js:485`，且与 shim **同门控**（`:483-484`：没有 shim 就没有注入通道，也就没有要拦的合成点击）。

**两腿**：

1. **帧级**：`w.focus` 无条件吞掉（`:76-89`），赋值失败再 `Object.defineProperty` 兜底。
2. **元素级**：只拦**无用户手势**的 `element.focus()`（`:106-117`）。报告里"每点一次就丢焦点 / 周期 0.9–3.6 s"是**定时器**特征——本机探针确认 `setInterval(() => input.focus(), 2000)` 这类元素级夺焦 **10/10 全穿透**（`:26-28`）。放行窗口 = 最近一次真实 pointer/mouse/touch/keydown 之后的 `gestureWindowMs`（默认 1000ms，`:68,100-105`）。

**绝不抛**（`:45-46`）：每个补丁动作各自 try/catch，失败只体现为 `__weFocusGuard.installed === false`；计数暴露在 `window.__weFocusGuard`（`:65-70`）。

**宿主侧交还**补围栏够不着的路径（`src/focus-handback.js:4-8`）：跨源 `top.focus()` / `parent.focus()`、`autofocus` 属性、`dialog.showModal()`、label 转发点击。交还判据**三条同时成立**（`:10-17`）：① 焦点从记住的宿主元素离开；② `document.activeElement` 是壁纸帧（`iframe.we-iframe`，`:35-39`）；③ 最近 `GESTURE_WINDOW_MS`（1000ms，与壁纸侧同值，`:55`）内没有真实手势。跳过的交还会在手势窗口结束时**补交一次**（`:84-88`），否则"打字期间被夺走的焦点就永久掉地"。另有 `STALE_MS = 120000` 与 `MIN_GAP_MS = 300` 两道保险（`:56-57,91-92`）。

**已知残留**（两边都写明）：跨源 WindowProxy 上的 `top.focus()` / `parent.focus()` **改写不了**（`lib/we-focus-guard.js:53-55`）——"真出现这类壁纸时，`__weFocusGuard.blocked` 不涨而症状仍在 —— 那就是这个残留"。

### 3.17 发现链的性能画像

| 手段 | 效果 | 锚点 |
|---|---|---|
| 内存 TTL 3s | 同一次 apply 内连续请求**零 I/O** | `lib/inventory.js:148,482-484` |
| 磁盘扫描索引 + 签名 | 签名命中 ⇒ **零 fs 探测**，只重组载荷 | `:491-493`；`test/verify-inventory-index.mjs:140-141`（`exists === 0` 且 `stat === 0`） |
| 探测记忆按项目目录 mtime 逐条失效 | 库里新增一张 ⇒ 只多探那一条 | `:260-267`；`test/verify-inventory-index.mjs:151-152` |
| 分块并发 | `SCAN_CHUNK = 24` / `PROBE_CHUNK = 24`，不阻塞事件循环 | `lib/wallpaper-scan.js:112`；`lib/inventory.js:157` |
| Steam 探测 60s TTL | reg.exe 查询与 /mnt 扫描不必每请求重做 | `lib/steam-discovery.js:113,126-129` |
| sceneVideo 后台探测 | 探测不阻塞清单，失败记"否"不冒泡 | `lib/scene-probe.js:155-182` |

一次全量扫描的 fs 操作量级（按代码推）：≈ O(N) 次 stat + O(N) 次 readFile + O(E) 次探测（N = 项目目录数），与 `lib/inventory.js:486` 的"一万多次 fs"一致（推断对应 N ≈ 2000–3000 的库；仓库未给确切 N）。**冷扫实测 1.9s**（`lib/inventory.js:49`）。

### 3.18 发现链的降级矩阵

| 场景 | 代码行为 | 对外表现 |
|---|---|---|
| **WE 没装** | `locateWallpaperEngineP()` 返回 `null`（`lib/steam-discovery.js:240`）；只剩工坊根；播放列表提前 `return []` | **不报错**：HTTP 200，`installDir: null`、`wallpapers: []`。客户端显示的是"没有可播放的壁纸"，**不是**"未检测到 Wallpaper Engine"（后者只在**请求失败**时出现，`src/client.js:824,838` + `src/quick-panel.js:635-638`） |
| **Steam 没装** | 探针全落空 | 同上，200 + 空清单。**失败结果被缓存 60s**（`lib/steam-discovery.js:111-112`） |
| **目录无权限** | `pathExistsP` 捕获异常 ⇒ `false`（`lib/index.js:242-244`）；`readdir` 失败 ⇒ 跳过该根；`readFile` 失败 ⇒ 条目 `null` | **静默降级**：不可读项目直接消失，不抛不记日志 |
| **`project.json` 损坏** | `catch { return null; }`（`lib/wallpaper-scan.js:85`） | 该项目被**整条丢弃**，无日志、无计数 |
| **缺 `file` 字段** | `if (!o \|\| typeof o !== 'object' \|\| !o.file) return null;`（`:67`） | 同样整条丢弃 |
| **WE 版本字段缺失** | 版本**从不读** | **无影响** |
| **扫描期抛错** | `rescanOnce` 的失败**抛给调用者**（`lib/inventory.js:460-462`："清单端点该报 500 就报 500，不要静默端旧数据"） | 路由 catch ⇒ 500 + `{error: message}`（`lib/index.js:1241-1245`） |

### 3.19 周边路由与扫描链彻底解耦

| 路由 | 依赖什么 |
|---|---|
| `GET/HEAD <BASE>/about-qr/<file>` | 随包的 `lib/about/`（白名单 `['qq-group.png','douyin-group.png','update-notice.jpg']`，`lib/routes/about-qr.js:36`）；路径围栏用 `relative()` 做包含性检查（`:44-60`） |
| `GET <BASE>/star-count` | `package.json` 的 repository URL 推出的 `owner/repo`（`lib/index.js:335-342`）+ GitHub API；10 分钟内存 + 磁盘双缓存，失败回 `{ok:false,count:null,error}` 或 stale 值 |
| `GET/HEAD/POST/DELETE <BASE>/avatar/<side>` | 插件数据目录下的 `user-*` / `ai-*` 文件；自带白名单与 8MB 体限 |
| `GET/HEAD/POST/DELETE <BASE>/mascot` | 插件数据目录下的 `mascot-*` 文件 |

真正**消费**扫描结果的是另一族：`/props/<token>` 按 token 反查 `mediaMap` 拿绝对路径，再**现读**该目录的 `project.json`（`lib/routes/props.js:53-59`）——它依赖的是"扫描时铸造的 token"，不是清单载荷。

---

## 4. 出画面：从 Wallpaper Engine 内容到屏幕上的那一帧

这一章是整个插件的**核心机制**。前面三章讲的是"怎么找到壁纸"，这一章讲"找到了之后，怎么把画面弄出来"——而这条链路是这个项目最值得学的地方，也是它最反直觉的地方。

### 4.1 第一条裁定：要么给真画面，要么诚实留空

先说结论，因为它决定了后面所有设计。

**CPU 兜底出图整条线已被删除**（约 1 万行，0.6–0.7.x 曾有三级兜底）。删除的理由写在源码与文档里，核心是：**"能成功产出劣质图"会把"这张壁纸没有可用画面"这个可判定的事实，退化成一个看起来正常的画面。**

于是现在的契约只有两条路：

- 要么给出**真实存在**的画面（实时渲染 / 作者内嵌 MP4 / 实时抓帧 / 用户导入的自定义画面）；
- 要么**明确留空**，并在状态行里给出**可判定的原因**。

这条裁定在代码里到处留下指纹：

- `lib/routes/scene-frame.js:72-78` 的文件内注释逐字写着出图来源的**唯一权威顺序**，并明确否定"替作者猜一张图"：

  > 这里**没有**「替作者猜一张图」的来源：拿不到上面两条就 404 —— 猜出来的糊图比诚实留空更糟。

- `src/live-layer-pointer.js:193-199` 的垫底图候选顺序同样遵守它：预览图**只作首帧前的占位**，而且是"**作者随包发布的那张**"，不是本插件合成的猜图。

- 空态时返回的 404 带**可判定原因**（`no-frame` / `no-custom-frame` / `unknown-token`），客户端据此区分"这一级不存在"与"网络失败"。

### 4.2 五级来源链（客户端侧）

播放形态的优先级写在 `src/media-prep.js:585-591` 的 `buildMedia`：

```js
//   壁纸播放形态优先级:
//   1. live — WebWallGL 实时 iframe（scene.pkg 走场景管线；web 壁纸走它的
//      web 挂载 + 宿主注入的 WE shim，严格沙箱隔离）。心跳判定失败后自动
//      降级，见 startLiveWatch/liveFail。
//   2. sceneVideo — 场景内嵌 MP4 (作者主分支, 硬件解码 <video>, poster=静态帧)
//   3. 静态帧 img (frameUrl) / 网页壁纸的裸 iframe 兼容路径
```

把它和宿主侧的帧服务合起来看，完整的五级链是：

| 级 | 来源 | 谁产生 | 落在哪 |
|---|---|---|---|
| ① | **实时渲染 iframe**（WebWallGL） | 浏览器端渲染场景包 | `/scene-live` 渲染页 |
| ② | **场景作者内嵌 MP4** | 作者随包发布 | `<video>` 硬件解码 |
| ③ | **实时抓帧** `<key>_gpu.png` | ①的首帧被客户端抓回来回填 | `scene-frame-cache` 槽位 |
| ④ | **自定义画面**（用户导入） | 用户 | `overrides/<id>.*` |
| ⑤ | **空态**（404 + 可判定原因） | — | 状态行 |

关键在于**③④是缓存而不是降级链**：①失败时系统会走 ②，而不是走 ③ 的旧抓帧——因为 ③ 是"上一次实时渲染时的画面"，拿它冒充当前画面与"猜图"是同一种罪。

宿主侧的对应实现在 `lib/routes/scene-frame.js`：

- `GET/HEAD <BASE>/scene-frame/<token>`（`:79-153`）：`variant === 4 ? null : sceneFrameSlot(abs)`（`:104`）——**档 4（用户 pin 的自定义封面）豁免抓帧**，而且豁免在"连槽位都不解析"这一层判定（否则为一次永远不会被读的产物白做一次 `statSync` + `ensureFrameCacheDir()`）。
- `HEAD` 是**纯磁盘探测**（`:110-134`），"绝不触发任何生成"：204 + `X-WE-GPU: 1`（已有抓帧，附 W/H/AR 几何头）· 204 + `0`（只有自定义画面）· 404 `no-frame`（空槽）。
- `GET` 是**展示**，按 cover 裁切（`:135-152`）：抓帧 → 自定义画面 → 404（自动档，诚实的"空"）/ **422**（`v=4`，"自定义画面已失效"，客户端要明示这件事）。

> 档位值域是 `{0 = 自动, 4 = 强制自定义画面}`，其余值一律 clamp 到 0。注释里写明理由：**档位号一经定义就不复用，因此不需要值域迁移**（`lib/routes/scene-frame.js:77-78`）。

### 4.3 渲染页：/scene-live 与它自己的适配层

实时渲染由一个**同源、非沙箱**的 iframe 承担，宿主路由是 `lib/routes/scene-serve.js:82-146`。

页面本身是 `lib/webwallgl/index.html`，它只做三件事：

1. **锁 viewport**（`content="width=device-width,initial-scale=1,..."`）——注释解释：移动端 WebView 默认按 980px 宽的桌面视口排版再整体缩放，锁定到设备宽度画布才等于真实屏幕；桌面宿主没有 viewport 概念，这标签对它无副作用。
2. **挂一个 `#wp` 容器**：`position: fixed; inset: 0; overflow: hidden`。
3. **按顺序加载两个脚本**：

```html
<script src="./engine/webwallgl.global.min.js"></script>
<script type="module" src="./renderer.js"></script>
```

注释写明为什么必须用**自包含的全局版**：

> 引擎用自包含的全局版（已内联 mediabunny）：ESM 版对 mediabunny 是裸导入，浏览器无法直接解析。经典脚本先于 module 脚本执行，renderer.js 运行时 window.WebWallGL 已就绪。

`lib/webwallgl/renderer.js:15` 因此是一句硬断言：

```js
if (!globalThis.WebWallGL) throw new Error("WebWallGL 引擎未加载（./engine/webwallgl.global.min.js）");
```

#### 4.3.1 适配层只做"宿主适配"

`lib/webwallgl/renderer.js:1-14` 的文件头把边界划得很清楚：

> 渲染核心是 npm 依赖 `webwallgl`：宿主的 `/scene-live/engine/` 路由从依赖目录直出 `webwallgl.global.min.js`……本页只做宿主适配这一层。

具体来说，`createScene` 的参数全部来自 URL 查询串（`:93-102`）：

```js
const inst = createScene(host, {
  fit: fitOf(params.get("fit")),
  fps: Number(params.get("sceneFps")) || 60,
  volume: params.get("muted") === "false" ? 1 : 0,
  renderDpr: Number(params.get("renderDpr")) || 0,
  videoTexScale: Number(params.get("vidscale")) || 0,
  ...(params.get("autoq") === "0" ? { autoQuality: false } : {}),
  ...(params.get("bake") === "0" ? { bake: false } : {}),
  onDiagnostic: reportDiag,
});
```

`fit` 有白名单（`:22-23`）：`new Set(["cover","contain","stretch"])`，不在表里的一律回落 `cover`——**不让任意字符串进引擎**。

滤镜同理（`:25-38`）：宿主只传 id，不传字符串：

```js
// 滤镜白名单：宿主只传 id，不让任意字符串进 style.filter（url() 可外链资源）。
const WALLPAPER_FILTERS = { none: "", blur: "blur(14px)", grayscale: "grayscale(1)", ... };
```

`applyFilter` 最终写的是 `host.style.filter = WALLPAPER_FILTERS[id] ?? ""`（`:187-189`）——因为 `url()` 可以外链资源，这是货真价实的注入面，所以用白名单而不是转义。

#### 4.3.2 控制面 `window.__wp` 与观测面 `window.__wpStats`

`renderer.js:191-309` 暴露两个全局对象。文件头的纪律是：

> 控制面 `window.__wp` 与观测面 `window.__wpStats`（src/live-layer.js、src/client.js 按名调用，**缺一个方法只表现为壁纸不响应、没有报错**）。

这个"缺方法不报错"的设计很关键：它是宿主与渲染页之间**唯一**的接口面，两侧独立演进，任何一侧新增/改名方法都不会炸出异常，只会让某个功能静默失灵。方法清单（`:195-309`）：

| 分类 | 方法 |
|---|---|
| 换图 | `setWallpaper(cfg)` / `loadSceneFile(file, project)` |
| 播放控制 | `pause()` / `resume()` / `release()` / `restore()` |
| 画质 | `setFit` / `setSceneFps` / `setRenderDpr` / `setQuality` / `getQuality` / `setVolume` |
| 交互 | `pushPointer(u,v,buttons,mods)` / `pointerLeave()` / `pushWheel(dx,dy,mode,mods)` |
| 媒体 | `setMedia(init)` / `setMediaControl(controls)` / `setAudioBridge(fn)` |
| 遮挡 | `setOcclusion(payload)` / `getOcclusion()` |
| 状态 | `getState()` / `getProperties()` / `updateWebProps(wire)` / `capture(maxWidth)` |

两处值得单独指出：

- `capture(maxWidth)`（`:264-281`）是**抓帧回填的技术底座**：它从 `inst.canvas` 取画布，超宽时先缩到一张离屏 canvas 再 `toDataURL("image/jpeg", 0.85)`。注释里有一条真实的失败模式：

  ```js
  } catch {
    // 画布被跨源内容污染时 toDataURL 会抛 SecurityError
    return null;
  }
  ```

- `getOcclusion()` **永远返回 `null`**（`:296-298`）——遮挡是单向的：父页推给渲染器，渲染器不回传。

#### 4.3.3 兜底页：失败要有可见落点

`renderer.js:120-145`：装配失败时先 `inst.release()`，再挂一个 `class="we-fallback"` 的 iframe 指向 `./default-wallpaper/index.html`：

```js
inst.on("error", (err) => {
  if (current.type === "web") webState.error = String(err?.message ?? err);
  reportDiag(`装配失败：${err?.message ?? err}`, "error");
  showFallback();
});
```

文件头把这条列为设计目标之一：「**装配失败时把兜底页 `default-wallpaper/index.html` 挂上，失败要有可见落点**」。注意兜底 iframe 也带 `sandbox="allow-scripts"`（`:135`）。

#### 4.3.4 网页壁纸的就绪信号不靠 rAF

`renderer.js:104-118` 是整个仓库里少见的"承认现实"的设计：

```js
// ── 网页壁纸就绪态（getState）：很多网页壁纸不靠 rAF 出帧，「iframe 已 load」才是就绪信号 ──
const webState = { loaded: false, error: null };
function watchWebFrame(frame) { ... frame.addEventListener("load", () => { webState.loaded = true; }); ... }
new MutationObserver(() => {
  for (const f of host.querySelectorAll("iframe:not(.we-fallback)")) watchWebFrame(frame);
}).observe(host, { childList: true, subtree: true });
```

场景壁纸靠 rAF 出帧，网页壁纸**很多根本不用 rAF**（纯 CSS 动画、纯 DOM）。若统一等"出帧"，这类壁纸会被判为"渲染不出来"。所以就绪判据按类型分叉（`:299-308`）：

```js
getState() {
  const isWeb = current.type === "web";
  return {
    type: current.type || null,
    iframeLoaded: isWeb ? webState.loaded : null,
    webError: isWeb ? webState.error : null,
    paused: inst.paused === true,
    webFps: isWeb ? Math.round(inst.stats.fps || 0) : null,
  };
}
```

### 4.4 引擎依赖：定位包目录，按文件直出

WebWallGL 引擎**不是 npm import**，而是被宿主当作静态资源直出。这是全仓库最反直觉的依赖形态之一（1.4 节已列过依赖表，这里补机制）：

- `lib/index.js:136` 用 `dirname(createRequire(import.meta.url).resolve('webwallgl'))` **定位包目录**（得到 `WEBWALLGL_PKG_DIR`）；
- `lib/routes/scene-serve.js:67` 定义前缀常量 `const ENGINE_PREFIX = 'engine/';`；
- 路由把 `/scene-live/engine/<file>` 映射到 `<WEBWALLGL_PKG_DIR>/<file>`（`:103-104`）。

未安装时**明确 404 且给出可判定原因**（`:98-102`）：

```js
if (isEngine && !WEBWALLGL_PKG_DIR) {
  log.warn('scene-live engine missing: npm dependency `webwallgl` is not installed');
  res.setHeader('Cache-Control', 'no-store');
  res.statusCode = 404; res.end('webwallgl-not-installed'); return;
}
```

**这正是开放 issue #218 的根因面**：`webwallgl` 在 `dependencies` 里，但 `WEBWALLGL_PKG_DIR` **在模块加载期求值**（生态维度实测：issue #218 "实时渲染只显示静态帧：lib/webwallgl/ 缺失 + 运行期依赖 webwallgl 未安装"）。

### 4.5 /scene-live 的目录围栏与缓存分型

`lib/routes/scene-serve.js:105-114` 的围栏：

```js
const abs = resolve(rootDir, isEngine ? rest.slice(ENGINE_PREFIX.length) : rest);
// Directory fence: nothing outside the page tree / the engine package is ever served.
if (abs === rootDir || !abs.startsWith(rootDir + sep)) {
  appendDiagLine('fence', { route: 'scene-live', rest: ..., referer: ..., dest: ... });
  log.warn(`scene-live fenced: rest="..." referer="..." ua-iframe=...`);
  res.setHeader('Cache-Control', 'no-store');
  res.statusCode = 403; res.end(`forbidden-scene-live[${rest}]`); return;
}
```

两个细节值得学：

1. **403 的响应体是自解释的**——`forbidden-scene-live[<path>]` 会**直接显示在壁纸层上**，用户截图即可定位，不必先看日志（`:107-108` 注释原文）。
2. **围栏拒绝按 `warn` 分级**，理由写在 `:110`：围栏拒绝 = 有请求被挡下 ⇒ 影响显示效果的非正常表现。

缓存头**分型**（`:115-117` 注释 + `:118-144` 实现）：

| 资源 | 缓存策略 | 理由 |
|---|---|---|
| `/scene-live/index.html` | `no-store` | 它会被**注入遮挡桥**，注入体必须随文档新鲜 |
| `/scene-live/default-wallpaper/index.html` | `no-store` | 同为文档型 |
| 渲染页脚本 / 引擎文件 | 可重验证（ETag/304） | 引擎文件名**不带哈希**，升级 `webwallgl` 后同名换内容，所以必须靠重验证而不是 URL 换名 |

#### 4.5.1 遮挡桥的注入与缓存破坏

`/scene-live/index.html` 的处理是"读盘 → 插标签 → 自设 text/html 出站"（`:120-140`）：

```js
const tag = `<script src="${BASE}/scene-live/occlusion-bridge.js?v=${occlusionBridgeVersion()}"></script>`;
const m = /<head[^>]*>/i.exec(html);
html = m ? html.slice(0, m.index + m[0].length) + tag + html.slice(m.index + m[0].length) : tag + html;
```

`occlusionBridgeVersion()`（`:55-65`）的取值是**桥文件内容的 sha256 前 12 位**：

```js
// 桥 script 的缓存破坏参数：**桥文件内容的 sha256 前 12 位**（不是插件版本）——
// 任何一次桥改动都换 URL，不必等可重验证缓存的往返。读不到文件回落 '0'
```

这是个小而漂亮的细节：缓存破坏参数跟着**内容**走而不是跟着**版本**走，改一行桥代码就换 URL，不需要等版本号推进。

`lib/webwallgl/occlusion-bridge.js` 本身只有 ~40 行，但把跨 frame 的安全边界写得很清楚（文件头逐字）：

- **只认 `e.source === window.parent` 且 `e.data.__weLive === 1`** 的消息——渲染页自身（iframe 内脚本 / SceneScript 沙箱）与其它窗口发的同名消息一概不认；
- `payload.occluders` 必须是数组（或 null），形状不对**静默丢弃**——"宁可维持现状也不把坏数据喂进渲染器的迟滞状态机"；
- `window.__weSetOcclusion` 未就绪时**静默丢弃**——"父页的 1Hz 心跳 ≤3s 内会再喂，渲染器 3s 过期规则保证旧数据不会粘住"；
- 监听器入口整体 try/catch，"桥的任何异常都不得影响渲染页"；
- 幂等：`if (window.__weOcclusionBridge) return;`（同一文档只装一份监听器）。

渲染页一侧的入口是 `renderer.js:311-319`：

```js
// 遮挡桥（lib/webwallgl/occlusion-bridge.js，由宿主注入 index.html）的唯一入口：
// payload = { occluders, epoch, gen }，null = 清除。桥在本模块之前装好，未就绪时它会静默丢拍。
window.__weSetOcclusion = (payload) => { try { inst.setOcclusion(payload ?? null); } catch { /* 遮挡推送失败不影响渲染 */ } };
```

### 4.6 载荷服务：/scene-files 与它的两层围栏

`/scene-files` 回答的是"壁纸自己的文件从哪出"。它有**两处挂载**（应用源 + 媒体源），共用**同一段处理逻辑** `handleSceneFiles(req, res, mount)`——`mount` 只影响请求记录（`lib/routes/scene-serve.js:26-28`）：

> 应用源逐请求全记（量小），媒体源只记文档型请求与错误（网页壁纸子资源太多，全量会冲掉诊断环）。

这与第 5 章的媒体源是同一套东西的另一半，这里先讲**围栏**。

#### 4.6.1 两层围栏，缺一不可

`lib/serve.js` 的围栏注释是全仓库最值得逐字引用的一段：

```
// 围栏**两层，缺一不可**：
//   a) **字面路径**必须落在 root 内（`resolve()` + `startsWith`）—— 挡 `..` 与绝对路径；
//   b) **解析后的真实路径**也必须落在 root 内 —— `resolve()` 不认识链接，而 `serveFile`
//      会跟随链接 ⇒ 只有 (a) 不足以把目标钉在壁纸目录里。
//      `lstatSync` 拒最终组件是链接；`realpathSync.native` 的包含性比对覆盖"中间目录是
//      链接"（**必须 native**：JS 版 realpathSync 在 Windows 上不解析 junction —— 实测
//      junction 内的文件它原样返回，native 才给出真实路径）。
```

实现（`lib/serve.js` `handleSceneFiles` 内）：

```js
const root = dirname(abs);
const target = resolve(root, subpath);
const fenceOut = (why) => { appendDiagLine('fence', {...}); log.warn(...); res.setHeader('Cache-Control','no-store'); res.statusCode = 403; res.end(`forbidden-scene-files[${subpath}]`); };
if (target === root || !target.startsWith(root + sep)) { fenceOut('path'); return; }
let linked = false, realTarget = '', unresolved = false;
try {
  linked = lstatSync(target).isSymbolicLink();
  realTarget = realpathSync.native(target);
} catch (e) {
  const code = e && e.code;
  if (code !== 'ENOENT' && code !== 'ENOTDIR') unresolved = true;
}
if (linked) { fenceOut('symlink'); return; }
if (unresolved) { fenceOut('unresolved'); return; }
let realRoot; try { realRoot = realpathSync.native(root); } catch { realRoot = ''; }
if (!realRoot) { fenceOut('unresolved-root'); return; }
if (realTarget && realTarget !== realRoot && !realTarget.startsWith(realRoot + sep)) { fenceOut('realpath'); return; }
```

三个设计决定值得单独点出：

1. **"压根不存在"不在围栏里判**——交给下游 `existsSync`/`serveFile` 出 404。注释的理由是免得把"文件不在"报成"越界"，那会把排查的人引向错误方向。
2. **fail-closed**：catch 里不放行。注释写明"若『catch 里一律放行』，一个解析异常就等于围栏整层失效"。`test/verify-scene-live` 的 junction 判据钉住这条。
3. **错误响应一律 `no-store`**：缓存住一个 404 会让"文件后来到位了"仍然显示旧错误。

#### 4.6.2 CORS 为什么是 `*`

`/scene-files` 的实际 GET 响应带 `Access-Control-Allow-Origin: *`，OPTIONS 预检直接放行（`Access-Control-Allow-Methods: GET, HEAD, OPTIONS`、`Allow-Headers: range, content-type`、`Max-Age: 600`）。

原因在 `lib/serve.js` 的注释里：

```
//         b) allow opaque-origin fetches via CORS — strict sandbox gives the
//            wallpaper an opaque origin, so its fetch()/XHR carries
//            `Origin: null` (img/script/css subresource loads are unaffected).
```

严格沙箱的 iframe 的 origin 是 **opaque（`null`）**，它的 `fetch()`/`XHR` 会被同源策略拦下。而 `img`/`script`/`css` 子资源加载**不受同源策略约束**——所以只有 XHR 类请求需要 CORS。

### 4.7 媒体源：第二个 loopback 端口

这是第 5 章要展开的机制，这里只给结论，因为它是理解"网页壁纸为什么能工作"的关键。

**网页壁纸走独立 loopback 媒体源**（`127.0.0.1` 随机端口），不经过宿主的应用源。原因是 DSH Desktop 给插件路由套了一层**能力头栅栏**（`x-dsh-desktop-renderer`，只注入同源 frame）：严格沙箱 iframe 是不透明源，**拿不到那个头**，于是网页壁纸一律 403。

症状非常有迷惑性：**预览图正常、随后整块黑**。

媒体源不经过栅栏 ⇒ 第三方 HTML 连宿主 origin 都不沾边。端口通过 `/wallpaper-engine/media-origin` 路由发现（`lib/routes/scene-serve.js:157-167`）：

```js
disposers.push(webServer.register({
  kind: 'prefix',
  path: `${BASE}/media-origin`,
  handler: (req, res) => {
    mediaOriginInfo().then((info) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(info));
    });
  },
}));
```

`mediaOriginInfo` 是**访问器**而不是值——因为 `mediaOrigin` 是 `lib/index.js` 作用域里的**可变量**（端口随机、可能重启后变），传值就是陈旧快照（`lib/routes/scene-serve.js:21-23`）。

实测 `scene.pkg` 可达 **336MB**——这个数字是后面理解首帧预算与载荷账本的必要前提。

### 4.8 网页壁纸：严格沙箱 + WE API shim

网页壁纸（作者在 Wallpaper Engine 里做的 HTML 壁纸）在本插件里被强制为：

```html
sandbox="allow-scripts"
```

严格沙箱 ⇒ iframe **拿不到 DSH 的 origin**，因此跨源控制与指针注入不能靠同源调用，必须走渲染页的 `postMessage`（第 5 章展开）。

由于沙箱下渲染页无法进入壁纸 iframe 注入 API，WE API shim 改为**随文档到达**——`/scene-files` 的 HTML 响应会被注入 shim（`lib/serve.js` 的 `readWebShim()`）与用户属性种子。这也是为什么入口 HTML 必须 `no-store`：

> 它带着注入的 shim + 用户属性种子，上游同步会换掉它携带的哈希引用（缓存住了就等于把旧种子喂给壁纸）。

### 4.9 抓帧回填：单主帧 + 面积升级制

当实时渲染首帧稳定后，客户端抓一帧渲染 canvas（`preserveDrawingBuffer: true`，父页面**同源直读**，无需渲染页配合）写回帧缓存（`lib/routes/scene-frame.js:155-165` 注释）。

这套机制的规则很硬：

**（1）单主帧 + 面积升级制**（`:26-32`）：

```
//   · **单主帧 + 面积升级制**：`{ key, dir, gpuPath }` —— 一张壁纸一份抓帧
//     `<key>_gpu.png`。历史上"存帧视比 ≠ 视口就清写"的单槽让多窗口互踢（乒乓）；
//     推演过的按形状精确缓存则躲不开 resize 场景的无界写盘（每个新形状落一份）。
//     现行规则把"写"收紧成**只升不降**
```

**（2）几何以盘上字节为准**（`:33-34`）：

> PUT 用 `pngDimsOfBuf`/`pngSizeOf` 读 IHDR（客户端不带任何形状声明，两侧对帧的理解由"PNG 真实尺寸"这一事实锚定）；解析不出 ⇒ 415。

即**客户端不许自称形状**，一切以 PNG 文件头为准。服务端还额外校验 PNG 魔数（`:229`：`looksLikePng(body)`），避免 9 字节假 PNG 永久占槽。

**（3）PUT 侧面积守卫堵死竞态的最后半步**（`:237-255`）：

```js
const incomingArea = dim.width * dim.height;
const prevDim = existsSync(target) ? pngSizeOf(target) : null;
if (prevDim && incomingArea < prevDim.width * prevDim.height * (1 - GPU_FRAME_AREA_TOL)) {
  return { code: 409, payload: { error: 'frame-smaller', have: {...}, got: {...} } };
}
await atomicWriteFileP(target, body);
return { code: 200, payload: { ok: true, bytes: body.length, ar: ..., upgraded: Boolean(prevDim) && incomingArea > prevDim.width * prevDim.height } };
```

"等面积放行"是刻意的——注释说明：那是「**重新截**」在换内容，不是降级。

**（4）写串行化 + 原子发布**（`:37-40`）：`GPU_WRITE_INFLIGHT` 按**槽位路径**登记在途写（同槽串行），释放时只删自己那一条（`if (get(key) === write) delete`，否则会把后到的写踢掉）；落盘一律走 `atomicWriteFileP`——"半写的 PNG 会被当成有效帧服务出去"。

**（5）清除通道是共享资源**（`:184-206`）：`DELETE` 或 `POST ?clear=1`（两者等价，因为"POST 是框架确定放行的方法，DELETE 实测前缀路由同样可达；两者都提供，避免依赖单一方法的可达性"）。清除 = 删主帧，**所有窗口共用这一份**，清掉后其他窗口在下一次回填点各自按自己的尺寸重抓。

清除失败必须报错（`:193-201`）：

```js
// unlink 一步走：删掉/本来就没有（ENOENT = 幂等成功）都继续；
// EACCES/EBUSY/EPERM 等 = **真的没删掉**，必须报错：否则客户端把「清除」当成功
// （面板行消失、提示已清除），而宿主照旧发 GPU 帧 —— 画面纹丝不动且没有任何反馈。
```

### 4.10 自定义画面：/custom-frame 的收口纪律

`lib/routes/scene-frame.js:267-370`。id 只接受 `^[A-Za-z0-9_-]{1,64}$`（`:276`）——路径分隔符与 `..` 进不来。写入走 `.tmp` + `rename`，"更换格式即清兄弟"（`:50`）：写 `id.<ext>` 之前先删同 id 的其它扩展名，否则旧文件会被优先命中。

最值得学的是**写流收口**（`:340-349`）：

```js
// 中途放弃（关弹窗 / 断网 / 离开页面）：不会走 req 'end' / 'error' / 超时，`failed` 也就
// 永远不会置位 ⇒ 只靠 `ws 'close'` 到不了 cleanupTmp：写流一直开着（未关闭的 fd，直到
// GC），磁盘上留下一个最多 30MB 的 `.tmp`。而 `customFramePath` / `listCustomFrameIds`
// 只认 `.png|.jpg|.webp` ⇒ 它是**看不见的垃圾**，只会累积。这里照 upload.js 的同一形态收口。
req.once('close', () => {
  if (completed || failed) return;
  failed = true;
  try { ws.destroy(); } catch { /* ignore */ }
  cleanupTmp();
});
```

同一段注释也解释了为什么 `completed` 之后不得再销毁写流（`:360-362`）：销毁了 `ws.end()` 的回调就不会执行，文件永远停在 `.tmp`。

### 4.11 网页壁纸的首帧缓存：/live-frame

`lib/routes/live-frame.js`。场景：网页壁纸 live 渲染起来后，客户端抓一帧（`__wp.capture`）POST 到这里存成 JPEG；之后每次加载/重启都在启动延迟里先显示这张图，而不是黑屏。

四条规则：

- **只接受 JPEG**：体首两字节必须是 `FF D8`，否则 415（`:20`）——"别把 PNG/WebP 塞进这个 `.jpg`"；
- **有上限 4MB**（`:21`），超限即 413；
- **新鲜度判据是 `缓存 mtime >= 入口 mtime`**（`:22`、`:56-58`）⇒ 壁纸更新后旧帧**自动作废**；
- 写盘走原子替换（`atomicWriteFileSync`），`done` 旗标保证任何一条失败腿都只应答一次（`:23`）。

没有缓存时客户端回落到壁纸的 schemecolor（`:39-40`）。

### 4.12 垫底图：候选表与"存在性闸门"

这是客户端侧最精细的一段代码，在 `src/live-layer-pointer.js:187-259` 的 `buildLivePoster`。

候选表只有两级（`:200-201`）：

```js
const candidates = (sel.type === "web" ? [sel.liveFrame, sel.previewUrl] : [sel.url, sel.previewUrl])
  .filter((s) => typeof s === "string" && s);
```

即：**实时抓帧 → 作者随包发布的工程预览图 → 主题色**（`:193`）。底色兜底是 `sel.schemeColor || "var(--dsw-alias-bg-layer-1, #101418)"`（`:192`）——"无抽帧图、无主题色时加载期也必须是『一层安静的颜色』，不能是纯黑或透明"。

**存在性闸门**是这段代码的精髓（`:214-219`）：

> **图恒盖色**：`background-image` 永远画在同一元素的 `background-color` 之上……只有两件事要定：**谁允许上屏**与**什么时候发请求**。
> 上屏规则（**存在性闸门**，与请求解耦）：第 r 级只允许在比它更权威的每一级都**已判失败**之后上屏 —— 高权威级在飞 / 已就绪，低权威级一律不许上屏（缓存实时帧存在时，作者预览图一次都不该成为屏上那张，哪怕它先解码完）；高权威级判失败 ⇒ 已就绪的低权威级此刻补上；全部判失败 ⇒ 停在主题色兜底。

代码实现（`:220-259`）：`loadedRank[]` 记"已就绪"，`failedRank[]` 记"已判失败"，`noneAbove(rank)` 判断"更高权威的级是否都已判失败"，`applyRank(rank)` 才真正上屏。

还有一个非常细的坑被注释点明了（`:208-213`）：

```js
// 第 1 级（实时帧）究竟是哪个候选：web 支没有 `liveFrame` 时**这一级不存在**（宿主发了这条
// 字段，客户端却没有它的写入点 ⇒ web 的候选表里实际只剩预览图）。那种情况下不能把
// `candidates[0]` 当成"实时帧已存在"记进来 —— 记下的会是缩略图，语义就假了。
const frameSrc = sel.type === "web" ? (sel.liveFrame || "") : (sel.url || "");
const frameRank = frameSrc && candidates[0] === frameSrc ? 0 : -1;
```

以及"作者预览图**不留**字节"的理由（`:244-246`）：留了命中分支就会把预览图当成"帧"直接上屏。

### 4.13 首帧预算：不是固定 15 秒，是按包大小现算

这一块在第 6 章（性能治理）会再展开机制，这里给结论：

- 预算 = 基准 + 按包大小放大（`LIVE_PAYLOAD_FLOOR_BPS = 8MB/s`）+ 封顶 `LIVE_FIRST_FRAME_MAX_MS = 90s`（`src/live-layer-watch.js:16-37`、`:57-62`）；
- 宿主侧有**载荷账本**（`lib/serve.js` 的 `payloadLedger`），客户端轮询 `GET /wallpaper-engine/scene-payload-progress?token=…`，字节还在涨就每拍重置计时 ⇒ **"正在下载"不再算"渲染不出来"**。

`/scene-payload-progress` 的必要性写在 `lib/routes/scene-serve.js:169-176`：

> 为什么需要这条：首帧**必须等整包到齐**（渲染页 2.0.2 在 `pkg body` 之前不发任何东西），而已知最坏形态是"传输被别的实例饿死"（同一份 336MB 包：媒体源上 0.6s，应用源上出现过 15–74s 甚至永不返回）—— 客户端只有墙钟，分辨不出"在下载"与"渲染不出来"，于是把前者写进共享失败记忆。**服务端是唯一知道字节在不在动的地方。**

`ok:false` 的语义也被写死（`:176`）："这个 token 一次传输都没见过 = **未知**（客户端据此回落墙钟预算）"——**不把"未知"伪装成"没在动"**。

### 4.14 失败记忆与自救

失败记忆是共享的（同一张壁纸在一个窗口失败，所有窗口都知道）。规则：

- **首帧超时** 或 **运行期持续无帧**（心跳每秒一拍，`LIVE_STALL_TICKS` 拍时自动 `resume` 自救一次，再两倍仍无帧才判 `stall`）⇒ 退出实时渲染；
- **重开开关清空记忆**。

这个设计与"要么真画面、要么诚实留空"是同一个哲学：失败是**可传播的事实**，不是每个窗口各自重试的私事。救一次（而不是直接判死）也符合同一哲学——**有正当理由的无帧不算失败**。

### 4.15 主题随壁纸的取色链

主题颜色跟着壁纸走，三条腿按优先级（`src/theme-follow.js`）：

1. **作者声明**：`project.json` 的 `general.properties.schemecolor.value`，宿主转成 `rgb()` 送 `schemeColor`；**恰好 `0 0 0` 视作没填**（黑色是最常见的"没填"默认值）。
2. **画面占比最大色**：缩到 `LIVE_FRAME_SAMPLE` 见方、4bit/通道量化取众数桶；**作者 preview 与真实渲染帧两条腿合议，不一致取深色**。
3. 都拿不到 ⇒ **保持当前主题不抖**。

判定用 WCAG 相对亮度，阈值 **0.40**。

取色时机也被排得很讲究（`src/media-prep.js:573-583` 的长注释）：

> 为什么必须落在 emit() 之后：写作入口在宿主侧是同步的一整轮 —— 重写全量别名令牌 + 翻 color-scheme / body 主题属性 + 一次强制样式读取……放在 emit() 之前，这一轮就正好落在"新壁纸的媒体节点还没被创建、请求还没发出"的空窗里，换壁纸的建层/起播/过渡全部排在它后面；**实测同一条切换路径上主题真的写入时 apply→建层的中位耗时是 25ms，未写入时是 3ms**。

用实测数字给一条排序规则背书，这是这个仓库文档风格的一个缩影。

### 4.16 抓帧几何校验与空帧门禁

两处都是"不要用不可靠的指标做决定"：

**几何校验**：宿主 `HEAD /scene-frame/<token>` 附 `X-WE-GPU-W/H/AR`（读 PNG IHDR，纯文件头），相对差 > 2% ⇒ 先过内容门禁再清槽再 PUT（`lib/routes/scene-frame.js:122-131` + `:247`）。

**空帧门禁**：**体积阈值不可靠**——headless 全黑 PNG 实测 960×540≈12KB、1080p≈44KB、4K≈165KB（主控实测）。所以抓帧前先降采样到 `LIVE_FRAME_SAMPLE` 见方看亮度分布，**近全黑 / 几乎无对比度判"还没渲染出画面"，放弃回填**。

这两条与 4.9 的"几何以盘上字节为准"是同一条原则的三个侧面：**不要相信客户端的自述，也不要相信体积这种间接指标，去看事实**。

### 4.17 诊断通道

渲染页的每条诊断都打到宿主（`lib/webwallgl/renderer.js:44-62`）：

```js
function reportDiag(msg, level) {
  const origin = diagOrigin();
  if (!origin) return;
  const lvl = level === "error" || level === "warn" ? level : "info";
  const text = `scene ${current.src || "?"}: ${String(msg ?? "").slice(0, 500)}`;
  try {
    new Image().src = `${origin}/diag?msg=${encodeURIComponent(text)}&lvl=${lvl}`;
  } catch { /* 诊断通道失败不影响渲染 */ }
}
```

三个细节：**用 `new Image().src` 而不是 `fetch`**（避开 CORS 与预检）；**级别只有三档**（其它一律 info）；**长度截断到 500 字符**。而且失败**不影响渲染**——诊断是旁路，不是承重路径。

`diagOrigin()` 从 `current.mediaBase` 推出 origin（`:44-50`），所以媒体源场景下诊断会打到**媒体源**的 `/diag`（`lib/routes/diag.js`）。

---

## 5. 视频壁纸与媒体传输管线

### 5.1 核心事实：帧根本不进 GUI 通道

**视频壁纸在浏览器侧就是一根 `<video>` DOM 元素**——不是 WebCodecs，也不是把帧搬进 IPC。

`buildVideoMedia(sel, fitClass)` 是视频档唯一的构建入口（`src/video-layer.js:212-278`），按优先级取一个可用的 video 元素：

```js
// src/video-layer.js:215-218
const prepared = consumePreparedMedia("VIDEO", sel.url);
// 预热元素（见 VIDEO_WARM_TTL_MS 那段）：领养它 ⇒ 建层那一刻解复用器已经在位。
const warmed = prepared ? null : consumeWarmVideo(sel.url);
const media = prepared || warmed || document.createElement("video");
```

**领养而不是重赋 `src`**——注释写明理由是"重赋即使同值也会触发 resource selection 重新加载 = 黑屏闪烁源"（`src/video-layer.js:213-214`）。

层节点挂到 `document.body`（`src/live-layer.js:287-297`），CSS 是：

```css
/* src/styles-base.js:97 */
.we-layer { position: fixed; inset: 0; z-index: -2; overflow: hidden; pointer-events: none; opacity: 1; ... }
```

```css
/* src/styles-base.js:111-131 */
.we-layer .we-media {
  width: 100%; height: 100%; object-fit: cover; display: block;
  opacity: var(--we-wallpaper-opacity, 1);
  filter: var(--we-media-filter, none);
  transform: var(--we-wallpaper-transform, none);
```

⇒ **宿主在这条链路上唯一的职责是"把字节端出去"**。解码、合成、绘制全在浏览器进程内。

**`preload="auto"` 是硬要求**（`src/video-layer.js:250-255`），注释解释了机制：

> "⚠️ 必须显式 `preload="auto"`：缺省（=metadata）+ 这几张源的 moov 在文件**尾部** ⇒ Chromium 取完 moov 就停，真正开始取帧要等 `play()` —— 而 play() 在**更晚的一趟** syncLayers 里才被调用（自动播放被策略拒绝时那一趟永远不会来）。"

**poster 只认插件自己抽的静态缩略图**（`/video-preview/…`），不认 WE 自带的 `preview.gif`——动图当 poster 会"先播预览、再停首帧、最后进正片"（`src/video-layer.js:234-246`）。

### 5.2 Edge 的那条例外腿：`<video>` → `<canvas>` 镜像

```js
// src/video-layer.js:260-271
if (IS_EDGE && sel.edgeCompat !== false) {
  // Edge: keep the decoder element out of sight (its floating 下载/投屏
  // toolbar attaches to any VISIBLE <video>), render via <canvas> instead
  media.setAttribute("disablepictureinpicture", "");
  media.setAttribute("disableremoteplayback", "");
  media.style.cssText = "position:absolute;left:-100000px;top:0;width:320px;height:180px;opacity:0.01;pointer-events:none;";
  const canvas = document.createElement("canvas");
  canvas.className = "we-media we-media--canvas" + fitClass;
  canvas.style.background = "#000";
  return [media, canvas];
}
```

`IS_EDGE` 判据是 UA（`src/client.js:1536`：`/Edg\//.test(navigator.userAgent)`），开关在设置里（`src/panel-tabs-advanced.js:34-37`）。

镜像循环（`src/client-media-frame.js:64-75`）**优先 `video.requestVideoFrameCallback`**，回退 `requestAnimationFrame`；暂停时停循环，靠一次性 `play` 监听恢复。落笔后打标记 `canvas.dataset.weDrawn="1"`（`:29-63`）——这是切层内容闸门判断"新层真的有画面了"的依据。

### 5.3 预热：宁可不播，也别开第二个 4K 解码器

`warmVideoUrl(url)`（`src/video-layer.js:84-106`）只做到 `HAVE_METADATA`：`el.preload="metadata"; el.muted=true; el.loop=true; el.autoplay=false; el.setAttribute("playsinline",""); el.src=u;`——**绝不 `play()`**。

触发时机是指针交互（`src/video-layer.js:126-144`）：卡片上 `pointerdown` 立即预热，`pointerover` 去抖 120ms（`VIDEO_WARM_HOVER_MS = 120`，`:62`）；预热元素 TTL 20s（`VIDEO_WARM_TTL_MS = 20000`，`:60`）。

配套地，准备链对视频**整段跳过**（`src/media-prep.js:113-122`）：准备链会另起一个 video 元素后台 load+play 预热 ⇒ 4K 双解码卡顿；且预热元素带 poster 进层观感是"GIF→静态图→正片"。

### 5.4 就绪判据与降级

- `videoContentReady(video)`（`src/video-layer.js:181-187`）：`hasPoster && video.__wePosterReady===true` ⇒ true；`Number(video.readyState) >= 2` ⇒ true。
- `probeVideoPoster(video,onReady,onFail)`（`:153-173`）用 `new Image()` 探海报是否真加载。
- **停滞守卫** `armVideoChannelReveal`（`:516-560`）：每 1200ms 复查就绪态；到 `VIDEO_STALL_GIVE_UP_MS = 15000`（`:47`）仍无画面 ⇒ 记 `liveLog("video-stall", …, "warn")`，**留旧壁纸在屏上**，不放行空层。
- 解码失败的人话提示（`src/client.js:1752-1760`）：`err.code === 4` ⇒ "浏览器无法解码这段视频（自上传建议改用 H.264 编码的 MP4）"，3 = 解码失败，2 = 读取失败。

### 5.5 系统媒体（频谱 / Now Playing）：第二条数据面

与 `<video>` 无关的另一条链路，客户端用 50ms / 1s 轮询两个 JSON 路由把数据喂给渲染页的 `wp.setAudioBridge` / `wp.setMedia`：

- `startMediaSync(frame)`（`src/client-media-frame.js:385-441`）：50ms 定时器拉 `/audio-spectrum`，bands 0-255 装成 `Float32Array`，通过 `wp.setAudioBridge(() => ({left: mediaSpectrum, right: mediaSpectrum}))` 交给渲染页——**零拷贝同引用**。
- 每 20 tick（1s）拉 `/now-playing`，去重 key = `[title,artist,playing?1:0,floor(position/5),lyrRev].join("\u0000")`，`pushMediaSnapshot(frame,m)`（`:231-254`）调 `wp.setMedia({hasMedia,title,artist,album,albumArtist,playing,state,position,duration,thumbnail,lyrics})`。
- **封面（artwork）有个真实障碍**：`fetchArtworkDataUrl(url)`（`:195-228`）必须 `apiFetch(url,{parse:false})`——默认路径会先 `json()` 吃掉 body 导致 `blob()` 抛 "Body is unusable"；随后 `createImageBitmap` → canvas 降采样到 `MEDIA_THUMB_MAX=512` → `toDataURL("image/jpeg",0.88)`。原因是**沙箱网页壁纸取不到宿主 `/now-playing/artwork`**（DSH Desktop 的能力头栅栏按 `frame.origin` 放行，不透明源 403），所以由主页面同源取回再降采样成 data URL。
- 反向控制面：`MEDIA_CONTROL_ACTIONS = ["play","pause","playPause","skipNext","skipPrevious"]`（`:288`）→ POST `/media-control` → `wp.setMediaControl(controls)`。数据面与控制面**分开装**（`setMedia(null)` 后控制面仍在位，`:362-384`）。

### 5.6 `lib/media/` 四件套：多进程，不是多线程

全仓**没有任何 `worker_threads`**。宿主 Node 进程 fork 出三类独立 OS 进程：Rust 写的 `media-bridge`（系统媒体）、`ffmpeg`（抽帧 / 缩略图）、macOS 上现编的 `we-audio-tap`（Swift/CoreAudio）。宿主与它们的全部交互都是 **stdin/stdout 管道**，没有 socket、没有 HTTP。

| 文件 | 行数 | 职责 | 进程边界 |
|---|---:|---|---|
| `lib/media/index.js` | 143 | **门面 + 选型**：决定用中间件还是内置实现，负责回落 | 无（宿主进程内） |
| `lib/media/provision.js` | 297 | **provision**：找到/下载中间件二进制 | 宿主进程内（下载用 `fetch`） |
| `lib/media/supervisor.js` | 679 | **看护子进程**：spawn、NDJSON 协议、重启、空闲停 | fork 出 `media-bridge` |
| `lib/media/legacy.js` | 466 | **内置回落实现**：mac/Linux/Win 各自的取数 | fork 出 `we-audio-tap` / `ffmpeg` |

**门面选型规则**（`lib/media/index.js:8-12`）：`DSH_WE_MEDIA_LEGACY=1` ⇒ 内置实现；产物解析成功 + spawn 成功 + 握手通过 ⇒ 中间件；任一步失败 ⇒ 内置实现，失败原因进 `status()`。回落是**一次性**的（`fallBackTo` 开头 `if (fallback) return;`，`:61-69`），并写诊断 `diag('media-fallback', …)`。

`control(action)`（`:125-128`）只有中间件能做，内置实现恒不支持：

```js
async control(action) {
  if (useBridge && sup && sup.ready()) return sup.control(action);
  return { ok: false, error: fallback ? 'control-unsupported' : 'media-backend-not-ready' };
},
```

**中间件是 Rust 预编译二进制，不是 npm 依赖**。解析链四级（`lib/media/provision.js:8-11`）：`DSH_WE_MEDIA_BRIDGE` 环境变量 → 插件目录旁 `bin/<asset>` → `<dataDir>/bin/media-bridge/<tag>/<asset>` 下载缓存 → GitHub Release 下载。

- `MEDIA_BRIDGE_TAG = 'v0.1.5'`（`:34`）
- 资产矩阵（`:37-51`）：darwin → `media-bridge-darwin-universal`；win32 x64/arm64 → `.exe`；linux x64 → `media-bridge-linux-x64-musl`（注释说明选 musl 是为了"无 glibc 下限"）
- 每产物一个固定 sha256（`:57-64`），下载时流式算哈希 + 魔数校验（PE `MZ` / ELF / Mach-O thin+fat，`:104-114`）+ 体积下限 `MIN_BYTES = 3MB`（`:78`）
- macOS 额外 `stripQuarantine(path)`（`:204-207`，`xattr -d com.apple.quarantine`）
- 产物落 `<dataDir>/bin/media-bridge/<tag>/`——**工具链，不随"缓存位置"走**

**stdio NDJSON 协议**（刻意不用中间件自带的 HTTP 面——它那个面的 CORS 是 `*`、**没有能力头栅栏**）：

```js
// lib/media/supervisor.js:127-134
export function bridgeServeArgs({ cacheDir = '', audio = true, online = false, mock = false, verbose = false } = {}) {
  const args = ['serve', '--cache-dir', String(cacheDir), '--poll-ms', '1000'];
  if (!audio) args.push('--no-audio');              // 音频关但元数据要：连授权都不会弹
  args.push(online ? '--online' : '--no-online');
  if (mock) args.push('--provider', 'mock');
  if (verbose) args.push('--verbose');
  return args;
}
```

实际执行的是 `media-bridge serve --cache-dir <cacheBaseDir>/media-bridge --poll-ms 1000 --no-audio --no-online`（后两个开关取决于设置）。

spawn 姿势按平台不同（`:341-363`）：**win32 先试 detached 再试 plain**，其它平台相反。注释解释了原因：DSH web 的受限 spawn 上下文里出现过"带管道直接 spawn 失败"，两种姿势都试，失败原因写进 diag。

握手序列（`:435-454`）：`hello`（校验 `protocol === 1`）→ `subscribe {events:['track','playback','artwork','lyrics','status'(+spectrum)], intervalMs:50}` → `now {interpolate:false}` → `status`。`now` 刻意要 `interpolate:false`——服务端外推一次、这里再外推一次 = 进度条跑得比歌快（`:447-449`）。

### 5.7 内置回落：三平台三套实现

**macOS 音频**用随包 Swift 工具 `lib/audio-tap.swift`。**Linux/Windows 音频**用 ffmpeg 抓 monitor 源：

```js
// lib/media/legacy.js:115-119（Linux）
args: ['-hide_banner', '-loglevel', 'error', '-f', 'pulse', '-i', monitor,
       '-f', 's16le', '-ac', '1', '-ar', '16000', '-'],
hint: '需要 ffmpeg 与 PulseAudio/PipeWire（monitor 源）',
```

```js
// lib/media/legacy.js:137-141（Windows）
args: ['-hide_banner', '-loglevel', 'error', '-f', 'dshow', '-i', `audio=${dev}`,
       '-f', 's16le', '-ac', '1', '-ar', '16000', '-'],
```

Linux 的 monitor 名先用 `pactl info` 解析 `Default Sink:` 再加 `.monitor`，失败回退别名 `@DEFAULT_MONITOR@`（`:109-114`）。Windows 的设备名用 `ffmpeg -list_devices true -f dshow -i dummy` 抓，正则匹配 `Stereo Mix|立体声混音|CABLE Output|VB-Audio`（`:124-129`）；找不到就返回 `args:null` + 提示"请在「声音设置 → 录制」启用「立体声混音」，或安装 VB-Cable"（`:131-136`）。

FFT 在宿主侧现算：`bandsFromPcm`（`:79-104`）自写迷你 radix-2，Hann 窗、64 段、dB 映射 `(db+70)/70`——注释说与 Swift 端一致。

**Now Playing**：macOS 走 `media-control get --no-artwork`，封面优先用媒体源的 `artworkData`(base64) + `artworkMimeType`，兜底才用 Spotify 的 AppleScript（`:388-398`）。Linux 走 `playerctl metadata --format '{{title}}\t{{artist}}\t{{album}}\t{{status}}\t{{mpris:artUrl}}'`（`:360-381`）。

**Windows 没有 Now Playing**：

```js
// lib/media/legacy.js:385
state.nowPlaying = { status: 'unavailable', hint: 'Windows 的媒体集成在二期提供' };
```

### 5.8 ffmpeg：供给链与命令行

**供给链四级**（`lib/transcode.js` `resolveFfmpeg`）：① `DSH_WE_FFMPEG` 环境变量 → ② 仓库内 vendored `../ffmpeg/ffmpeg(.exe)` → ③ 惰性下载到 `dirname(configPath())/ffmpeg/`（ffmpeg-static b6.0，带固定 sha256 表 `FFMPEG_STATIC_SHA256`，`:112-121`；资产矩阵 `:102-106`，覆盖 win32/linux/darwin 的 x64/ia32/arm/arm64）→ ④ 系统 PATH 上的裸名。下载源是 npmmirror 与 GitHub **并行竞速**（`:170-177`），5 分钟超时、20MB 体积下限、魔数校验。

**抽帧转码命令行（逐字）**：

```js
// lib/transcode.js:460-462
const base = ['-y', '-hide_banner', '-loglevel', 'error', '-i', abs,
  '-map', '0:v:0', '-an',
  '-vf', 'fps=' + String(fps), '-g', String(fps * 2)];
```

```js
// lib/transcode.js:467-472
const ENC_TUNE = {
  av1_nvenc: ['-preset', 'p1', '-b:v', String(bitrate), '-maxrate', String(bitrate), '-bufsize', String(bitrate * 2)],
  h264_nvenc: ['-preset', 'p1', '-b:v', String(bitrate), '-maxrate', String(bitrate), '-bufsize', String(bitrate * 2)],
  // 软件兜底：capped CRF（不叠 -b:v，避免与 crf 语义打架）。一次性缓存，慢一点可接受。
  libx264: ['-preset', 'veryfast', '-crf', '20'],
};
```

编码器顺序 `['av1_nvenc', 'h264_nvenc', 'libx264']`（`:485-499`），合起来一条典型命令是：

```
ffmpeg -y -hide_banner -loglevel error -i <abs> -map 0:v:0 -an -vf fps=30 -g 60 -t 12.5 \
       -preset veryfast -crf 20 -c:v libx264 -movflags +faststart -f mp4 <out.tmp<pid>>
```

注释给了两个非直觉点的理由（`:492-496`）：`-f mp4` **必需**（临时名 `.tmp<pid>` 无法按扩展名推断 muxer，ffmpeg 退 -22）；`-movflags +faststart` 把 moov 挪到头（"这几张源实测 moov 在**尾部**"）。

**质量参数必须按编码器给**：`--preset p1` 是 NVENC 专属，软件编码器会报 `x264 [error]: invalid preset 'p1'`；自动下载的 ffmpeg-static（johnvansickle）**不含 NVENC**，所以 `libx264` 那一档是唯一出路（`:463-466`）。

**进度不看 ffmpeg 的 `-progress`**（那在本平台是缓冲的、进程退出前不可见），而是按固定码率编码 ⇒ 输出文件大小 ∝ 时长，据此推 percent / ETA（`:447-459`）。码率按分辨率缩放：`Math.round(Math.min(20e6, Math.max(4e6, 20e6 * pixels / (3840 * 2160))))`（`:452`）。

**全局并发闸** `TRANSCODE_MAX_CONCURRENT = 2`（`:69`）；**排队不计入超时**，所有编码尝试共享一个 deadline（默认 15 分钟，`DSH_WE_TRANSCODE_TIMEOUT_MS` 可覆盖，`:62`、`:481-490`）。

`spawnFfmpeg`（`:330-438`）**不用管道**：stderr 重定向到临时文件 `ffmpeg-err-<pid>-<ts>.log`（内容进 502 detail），理由与 media-bridge 相同（受限 spawn 上下文）。

缓存键 `sha256(abs|round(mtimeMs)|fps).slice(0,20)`（`:515-519`），产物名 `tc_<key>.mp4`。客户端断开 ⇒ 取消转码（`registerTranscodeWaiter`，`:594-602`），全部 waiter 都 close 才真正 cancel。

### 5.9 自研 MP4 解析：不是为了"边下边播"，是为了"边播边合成"

**动机（真机取证在源码注释里，`lib/faststart.js:6-17`）**：

- Chromium 的媒体加载器对 `Range: bytes=0-` 会**顺流整读**；这几张源 moov 在**尾部** ⇒ 取元数据的耗时 ∝ 文件大小。
- 实测：`iris2` 764,688,296B / 1761ms、`lv_0` 501,752,315B / 1250ms、`kei` 155,604,213B / 357ms、`ahq` 101,749,329B / 324ms（≈430MB/s）；而**同一个** `iris2` 在 moov 已在前面那条路上只要 149–233ms。
- 旧版做法是生成**等大副本**（实测 5 张 = 1570MB），而真正缺的只是合计 0.49MB 的 moov。新版改为**服务期按段表合成**，磁盘成本 0。

⇒ 媒体是从本机磁盘读的，不存在"下载"；要解决的是"浏览器第一个 Range 请求就顺流整读 700MB"。

**`+faststart` 在字节层面只等于两件事**（`lib/mp4-vfs.js:12-17`）：① moov 盒整段挪到 mdat 之前；② moov 里每个 stco/co64 条目加 `len(moov)`。虚拟布局 `[ftyp][free][moov(补丁版)][mdat]`，mdat 内容/顺序/长度不变 ⇒ **总长不变**。

解析原语全是"按需 seek 读盒头"，不整读文件：`boxAt`(`:69-84`)、`listBoxes`(`:87-97`)、`childBox`(`:100-104`)、`listTopBoxes`(`:110-134`)、`chunkOffsetTables`(`:140-165`)、`patchMoov`(`:171-192`，先校验每条偏移落在 mdat 内再统一 +delta，越界就返回 `null`)。

**放弃条件（宁可发原片也不猜）**：`BAIL_MARKERS = ['moof','mvex','traf','tfhd','tfdt','trun','saio','senc','mfra','tfra']`（`:56-57`，分片/加密/索引族绝对偏移不止一处）、moov > `MP4_VFS_MAX_MOOV_BYTES = 8MB`、多 mdat、非 mp4/m4v/mov 扩展、顶层盒 > 64。

结果三态：`{kind:'virtual'}` / `{kind:'plain', reason:'moov-first'}` / `{kind:'none', reason}`。`kind:'none'` **不缓存**，以便重试（`:278-305`，LRU，上限 32 条 / 64MB）。

**定音钉子：同一次播放必须是同一份字节**。原片与虚拟布局的**媒体数据偏移不同**，中途换布局会让解复用器按旧偏移读新布局 ⇒ 花屏 / 解码失败。所以（`lib/faststart.js:136-158`）：

```js
function pinnedFaststartVariant(abs, token, logFn) {
  if (!abs) return null;
  const key = String(token || abs);
  const now = Date.now();
  const pin = MEDIA_CHOICE_PIN.get(key);
  if (pin && now - pin.at < MEDIA_PIN_TTL_MS) {
    pin.at = now;                             // 命中即续期：播放会话内绝不换字节布局
    // 钉住的若是原片（当时还没有布局）⇒ 继续原片，不许中途换成虚拟布局（偏移不同）。
    if (!pin.virtual) return null;
    const again = faststartVariant(abs, logFn);
    if (again) return again;
    pin.virtual = false;                      // 布局判不了了 ⇒ 钉成原片
    return null;
  }
  const pick = faststartVariant(abs, logFn);
  MEDIA_CHOICE_PIN.set(key, { virtual: Boolean(pick), at: now });
```

钉子 `MEDIA_CHOICE_PIN` 是**模块作用域**（非工厂）Map，`MEDIA_PIN_TTL_MS = 10 分钟`（`:63-64`），上限 200 条。消费点（`lib/routes/media-bytes.js:55-57`）：

```js
const pick = seg === 'media' ? pinnedFaststartVariant(abs, token, log) : null;
if (pick) { serveLayout(pick.layout, pick.abs, req, res, method === 'HEAD'); return; }
serveFile(abs, req, res, method === 'HEAD');
```

`/preview` **不参与**（预览图不是视频，没有 moov 可搬，`lib/routes/media-bytes.js:25`）。

**预热与旧副本回收**：`warmFaststartFavorites(wallpapers, logFn)`（`lib/faststart.js:166-188`）：轮换列表优先，最多 `WARM_MAX_SOURCES = 12` 张，**只解析 moov，不起 ffmpeg、不落盘**。目的写在注释里："目标是『第一次切就快』，而不是『用过一次才快』"。旧版落盘副本由 `sweepLegacyFaststartVariants()`（`:98-118`）回收，**要扫两个根**：当前 `cacheBaseDir()/faststart` 与旧版写死的 `legacyCacheBaseDir()/faststart`。

### 5.10 字节出口与缓存目录

**唯一字节出口**：`serveBytes(source, req, res, headOnly, opts)`（`lib/serve.js:268-345`），Range / HEAD / 条件 GET / 载荷记账共用这一份实现。注释写明理由（`:264-267`）：两份实现漂移一次就会让某一族悄悄缺 Range ⇒ `<video>` 拖不动进度的 bug。Range 三个分支 `bytes=A-B` / `A-` / `-S`，越界 416 + `Content-Range: bytes */size`。

缓存根由 `cacheBaseDir()` **现读**（`lib/index.js:316-327`）：`DSH_WE_CACHE_DIR` → `config.json` 的 `cacheDir` → `join(pluginDataDir(),'cache')`。**每次现读、不 memoize**，改了「缓存位置」不必重启宿主。

| 子目录 | 内容 |
|---|---|
| `transcodes` | `tc_<key>.mp4` 抽帧产物（每个 80–280MB） |
| `video-previews` | `pv_*.jpg` 缩略图 |
| `frames` | 场景帧 |
| `artwork` | Now Playing 封面 |
| `media-bridge` | 中间件运行时缓存（`--cache-dir`） |
| `<dataDir>/bin/media-bridge/<tag>/` | **工具链**，不随缓存位置走 |
| `<dataDir>/bin/we-audio-tap` | Swift 编译产物 |
| `dirname(configPath())/ffmpeg/` | 下载的 ffmpeg |

**清扫**（`lib/cache-prune.js:24-130`）四类：转码临时产物（用 `ownTmpRe = new RegExp('\\.tmp' + process.pid + '\\d*$')` **保护本进程在途的写**）、自定义画面 `.tmp`（超 10 分钟）、缩略图 LRU（`VIDEO_PREVIEW_CACHE_MAX = 512`）、转码目录按大小裁剪（`TRANSCODE_CACHE_MAX_BYTES = 4GB`、`CACHE_PRUNE_MIN_AGE_MS = 5 分钟`，最旧优先、保留最新一份）。

调用时机：`startupSweepTimer` 在插件加载后 **3 秒**跑（`lib/index.js:1160-1186`）——注释说明"两者都是同步遍历缓存目录，在 apply() 里直接跑会阻塞插件树加载、拖长整个 profile 的启动时间（实测）"。

### 5.11 上传：流式落盘 + 内容去重

`/upload`（`lib/routes/upload.js:68-213`）是**流式落盘**：`createWriteStream(tmpAbs)` + 边收边算 sha256 + 超 512MB 返 413 + 背压（`req.pause()` / `drain` 恢复，`:88-139`）。id 形状 `up-<base36 ts>-<rand>`（`:92`），完成后 `renameSync(tmpAbs,fileAbs)`（同目录同设备 ⇒ 原子），再 `await setUploadMeta(id,title,sha)`（`:180-185`，"响应即已持久化"）。**内容去重**：同 sha256 直接返回既有条目 + `duplicate:true` 并丢弃临时文件（`:147-179`）。`req 'close'` 中途断开必须销毁写流并清 `.tmp`（`:120-125`）。

`/remove` 只删 uploads 目录内 `up-…` 形状的 id（`resolveUploadFile` 复检规范化前缀 ⇒ 路径穿越不可能，`:218-269`）。

上传物与 WE 媒体**走完全相同的管道**（`docs/HOW-IT-WORKS.md:122`）：同样经 `/media`、同样吃 faststart 虚拟布局。

### 5.12 macOS CoreAudio Process Tap（`lib/audio-tap.swift`）

`lib/audio-tap.swift`（146 行）是一个**只读系统音频的 macOS 原生小工具**：用 CoreAudio 的 **Process Tap**（loopback，不经过麦克风、不弹录音授权 UI）抓本机正在播放的声音，做 FFT，输出 64 段频谱。

关键调用序列：

- `CATapDescription(stereoGlobalTapButExcludeProcesses: [])`（`:37`）→ `AudioHardwareCreateProcessTap`（`:43`）；失败 ⇒ stderr 吐 `tap-create-failed <code>` 并 `exit(2)`（`:44`）
- `AudioHardwareCreateAggregateDevice`（`:57`，失败 `exit(3)`）
- `AudioDeviceCreateIOProcIDWithBlock`（`:62`，IOProc 只写环形缓冲、不分配不加锁；失败 `exit(4)`）+ `AudioDeviceStart`（`:87`，失败 `exit(5)`）→ stderr 吐 `ready`（`:89`）
- 主线程 20fps Timer（`:139-140`）做 2048 点 vDSP 实 FFT（`vDSP_fft_zrip`，`:116`）+ Hann 窗；频带按 `pow(b/BANDS,2)` 切（`:121-135`）；dB 映射 `(db+70)/70` → 0..255（`:132-134`）——与宿主侧 `bandsFromPcm` 同一套映射
- `signal(SIGTERM/SIGINT) { exit(0) }`（`:143-144`）

**编译发生在运行期**（`lib/media/legacy.js:199-213`）：

```js
function ensureTapBinary() {
  const src = TAP_SWIFT;
  const bin = join(dataDir, 'bin', 'we-audio-tap');
  try {
    if (existsSync(bin) && statSync(bin).mtimeMs >= statSync(src).mtimeMs) return bin;
  } catch { /* 继续编译 */ }
  mkdirSync(dirname(bin), { recursive: true });
  const r = spawnSync('swiftc', ['-O', src, '-o', bin + '.tmp'], { timeout: 180000, windowsHide: true });
  if (r.error || r.status !== 0) {
    setAudio('unavailable', '未找到 Swift 编译器（Xcode Command Line Tools）—— 安装后重试；当前回落模拟频谱');
    return null;
  }
  try { renameSync(bin + '.tmp', bin); } catch { /* ignore */ }
  return bin;
}
```

缺 Swift 编译器 ⇒ 状态置 `unavailable` + 提示装 Xcode CLT，频谱回落"模拟"。

**调用**：`spawnTap(bin)`（`:215-246`）spawn 出来读 stdout，**每 64 字节切一帧**当频谱；stderr 里 `/tap-create-failed/` ⇒ 状态 `denied` + 提示"系统设置 → 隐私与安全性 → 音频录制"（macOS 14.2+ 权限弹窗），`/ready/` ⇒ `running`。`audioProc.on('error')` 必须挂（`:235-241`）：spawn 失败是**异步** 'error' 事件，没人监听时 Node 直接抛 Unhandled 'error' ⇒ **整个宿主半边进程崩死**。

### 5.13 资源占用的三档管控（纠正一个常见误解）

> **`lib/we-focus-guard.js` 与 `lib/media/supervisor.js` 全仓零交集。** 前者是注入到壁纸 HTML 里的浏览器端脚本（管"网页壁纸抢键盘焦点"），后者管"媒体子进程生死"。真正的资源管控在别处：

**A. 子进程（media-bridge）—— 空闲停 / 退避重启 / 硬杀**

```js
// lib/media/supervisor.js:510-521
function ensureIdleTimer() {
  if (idleTimer || !IDLE_STOP_MS) return;
  idleTimer = setInterval(() => {
    if (stopping || !child) return;
    if (Date.now() - lastUsedAt < IDLE_STOP_MS) return;
    log('媒体中间件空闲超时，退出（下次被访问时自动拉起）', 'info');
    diag('media-idle-stop', { idleMs: Date.now() - lastUsedAt });
    asleep = true;
    hardStop();
  }, Math.min(60 * 1000, Math.max(5000, Math.floor(IDLE_STOP_MS / 4))));
```

`IDLE_STOP_MS` 默认 15 分钟（`:66`，可由 `DSH_WE_MEDIA_IDLE_MS` 覆盖；**顶层常量 ⇒ import 之后设 env 无效**，注释 `:55-59` 与 `:36-38` 都点明了这条）。崩溃重启：窗口 5 分钟内超过 `MAX_RESTARTS = 3` 次 ⇒ 判 fatal ⇒ 回落内置实现（`:399-420`）。退避 `500 * 2^(n-1)`。

硬杀（`:524-538`）：

```js
try { p.stdin.end(); } catch { /* ignore */ }
// SIGTERM **立即**发（实测：host 退出仅 ~0.2s ⇒ 任何延迟发的 unref 定时器都
// 没机会触发，media-bridge 子进程会变孤儿一直活着，每次用过媒体就漏一个）。
if (p.pid !== undefined) { try { p.kill('SIGTERM'); } catch { /* 还没起来，交给下面的 SIGKILL 兜底 */ } }
const t2 = setTimeout(() => killWhenSpawned(p), KILL_GRACE_MS);
```

⇒ **不是"暂停"，是"杀掉"**：媒体子进程没有暂停态，只有"活着 / 空闲退出 / 重启"三档。

**B. 浏览器侧解码 —— 暂停，不是杀**

`isEffectivelyPlaying()`（`src/client.js:1741-1743`）= `selection.playing && !occlusionActive() && !occlusionRendererPaused()`；为假 ⇒ `applyVideoPlayback` 调 `pause()`（`src/client-audio-playback.js:155-157`）。`src/media-prep.js:678-687` 的注释说明：暂停 `<video>` 能让解码完全停摆（rVFC 停 → 解码引擎 → 0），而 web/iframe 壁纸无法从外部暂停，只能靠浏览器 hidden 节流。

**C. ffmpeg 转码 —— 取消 + 共享 deadline + 并发闸**：客户端断开即取消；共享 15 分钟 deadline；全局并发 2。

### 5.14 媒体链路的平台差异总表

| 维度 | macOS | Linux | Windows |
|---|---|---|---|
| 系统音频采集 | **Swift CoreAudio Process Tap**（运行期 `swiftc -O` 现编，macOS 14.2+；失败态 `denied`/`unavailable`） | ffmpeg `-f pulse -i <Default Sink>.monitor` | ffmpeg `-f dshow -i audio=<Stereo Mix/CABLE/VB-Audio>`，找不到 ⇒ 回落模拟频谱 |
| Now Playing | `media-control get [--no-artwork]` + `artworkData` base64；兜底 Spotify AppleScript | `playerctl metadata` + MPRIS artUrl | **不支持**：`hint:'Windows 的媒体集成在二期提供'` |
| 中间件产物 | `media-bridge-darwin-universal` | `media-bridge-linux-x64-musl`（**musl 静态，无 glibc 下限**）/ `linux-arm64` | `media-bridge-win32-{x64,arm64}.exe`，arm64 缺失时回退 x64 |
| ffmpeg 自动下载资产 | `darwin-{x64,arm64}` | `linux-{x64,ia32,arm,arm64}` | `win32-{x64,ia32}` |
| macOS 专属 | 下载后 `xattr -d com.apple.quarantine` | — | — |
| spawn 姿势顺序 | plain → detached | plain → detached | **detached → plain** |
| 首次执行安全检查 | 引导超时放宽到 `BOOT_CALL_TIMEOUT_MS = 25000` | — | CI runner 上可能更慢 ⇒ `DSH_WE_MEDIA_BOOT_MS` 旋钮 |
| 窗口化控制台 | — | — | `windowsHide: true` 全线（否则弹黑框） |

---

---

## 6. 遮挡判定与性能治理

### 6.1 先纠正三个常见误解

调研中最容易搞错的三件事（源码为准）：

| 直觉印象 | 实际是什么 | 证据 |
|---|---|---|
| `src/live-layer-gate.js` 是"实时渲染门" | **切层内容闸门 + 失败记忆的管线身份** | `src/live-layer-gate.js` 全文 |
| `src/live-layer-underlay.js` 是"渲染层" | **画布兜底色** `--we-wallpaper-underlay` + 可见性探测 | `src/live-layer-underlay.js` 全文 |
| `lib/we-focus-guard.js` 管"失焦行为" | **网页壁纸夺焦围栏**（防止网页壁纸把键盘焦点抢走） | `lib/we-focus-guard.js` |

真正的"失焦行为"在别处：`src/adapter.js:98-115` 有 `blurPause = !desktop` ⇒ **桌面壳（desktop shell）下 `pauseOnBlur` 强制失效**（桌面壳失焦不代表该停）；再加上 `src/client.js:1712-1718` 的判定，和 3 秒低频复核 `OCCLUSION_RECHECK_MS`（`src/client.js:1727`、`:5310-5325`）。

### 6.2 遮挡是**性能优化**，不是隐私功能

这是最值得强调的一点。宿主算出的"压在壁纸之上的窗口矩形"**只**喂给内嵌 WebWallGL 渲染器，用来分档降帧 / 全停 / ROI 剔除，动机是**省 GPU/CPU/电池**（`docs/wip/LINUX-OCCLUSION.md:12-21`）。

隐私是**边界**而不是动机：

```js
// src/live-layer-watch.js:460-463
// 只投给自家 scene 渲染页；第三方网页壁纸不投（把窗口几何投给它是泄漏也是噪声）。
```

窗口几何是敏感的——它等价于"用户此刻屏幕上有什么"。这个仓库的做法是：**只在自家渲染页内部使用，一次都不外泄**。这是正确的取舍，但文档里常被读成"遮挡 = 隐私保护"，其实不是。

### 6.3 只有 X11 一条路：Windows / macOS 完全缺席

唯一适配器是 `lib/occlusion/x11.js`。`isX11CandidateEnv`（`:47`）对非 linux 一律返回 false；全仓检索 `BrowserWindow|EnumWindows|CGWindowList|AppleScript` **零命中**；文档自划范围"仅 Linux 会话，Windows/macOS 另行立项"（`docs/wip/LINUX-OCCLUSION.md:5-10`）。

⇒ **在 Windows / macOS 上，`/occlusion` 恒返回 `backend:'none'`**，功能整条不存在。

**Linux 也不需要装 X11 库**：`x11@4.3.1` 是**纯 JS、零依赖、无安装脚本**（`package-lock.json:1515-1522`），仓库内没有任何 apt / libxcb 安装说明。硬前提只有两条：

1. 可达 X 服务器（`DISPLAY` 非空）
2. 有 EWMH 窗口管理器 —— 否则 `_readStacking()` 返回 null → 抛错降级

**Wayland 原生与 XWayland 都一律禁走**（`lib/occlusion/x11.js:46-52`）。理由写在注释里：Wayland 合成器不保证窗口几何的准确性，堆叠序残缺，宁可降级也不要给假数据。

### 6.4 X11 原理

- **堆叠序**：EWMH `_NET_CLIENT_LIST_STACKING`（根窗属性，自底向上的 XID 序列）
- **几何**：`GetGeometry` + `TranslateCoordinates`（`lib/occlusion/x11.js:1-34`、`:161-170`、`:213-233`）
- **只关心压在自己之上的窗**：从 `ownIndex+1` 切片（`:239-296`）——**底下的窗不影响壁纸可见性**
- **"自家窗口"判定**：`_NET_WM_PID` 命中 `{process.pid, process.ppid}`（`:257-259`）。插件跑在 utility 子进程里，所以要查 `ppid`——**只看 `pid` 会把自己误判成遮挡窗**。

### 6.5 抽象分层：hub 隔离平台细节

`lib/occlusion/index.js:5-8` 的设计值得单独讲：hub 把两件事隔开——

- **采集**：平台细节（X11 / 未来 Wayland / 未来 Windows）
- **快照语义**：epoch / gen / 降级 / 心跳

将来加 Wayland 适配器只需换一个 `createAdapter`，**客户端与协议都不用动**。这是这个仓库里少见的、真正干净的扩展点。

`POLL_TIMEOUT_MS = 3_000`（`lib/occlusion/index.js:34`）是看门狗：x11 断连会让在途应答永远不回来，必须靠超时兜底。

### 6.6 性能治理骨架：`src/live-layer-watch.js`（854 行）的 1 秒心跳

**首帧预算不是固定的 15 秒墙钟**，而是：

> 基准 + 按包大小放大（`LIVE_PAYLOAD_FLOOR_BPS = 8MB/s`）+ 封顶 `LIVE_FIRST_FRAME_MAX_MS = 90s`

（`src/live-layer-watch.js:16-37`、`:57-62`）

这个公式的含义是：**大包给更多时间，小包别让用户干等**。

核心哲学是**"无帧有正当理由就不算失败"**，三处豁免：暂停期、传输仍在动、遮挡 pause 镜像。

stall 处理：20 拍先 `resume` 自救一次，40 拍才判失败（`:445-457`）。

### 6.7 三个性能夹具都**没有**自动阈值

| 夹具 | 测什么 | 自动化 |
|---|---|---|
| `fx-perf-rig.mjs` | 真浏览器 rAF 间隔 p50/p95（读数基准 16.67ms，`:180`） | ❌ 手动 |
| `underlay-pixel-rig.mjs` | CDP 1×1 截图 + ffmpeg 量像素 | ❌ 手动 |
| `sidebar-props-scroll-rig.mjs` | 真 React 18 真滚 | ❌ 手动 |

三个都自述"手动工具，不进 `npm run verify` 链"。

**唯一自动阈值**是 `test/verify-scene-live.mjs:3751-3755` 的 ISSUE-190 棘轮：`stroke+fill ≤ 40`、`blur ≤ 24`。

⇒ 这是一个诚实的取舍：**性能不进 CI**，靠人工夹具 + 一个数字棘轮。好处是不用维护易抖的基准，坏处是回归可能被漏掉。

### 6.8 ISSUE-190：文档结论仍成立，但行号全过期

| 项 | 文档 | 实际 |
|---|---|---|
| `shadowBlur` 位置 | 335/351/378/390/409/453 | `src/fx-layer.js:426/458/487/499/521/606` |
| 方案 A"光晕贴图化" | 提议 | **未做**；改走"按年龄带合批 + 星火合并"（`src/fx-layer.js:108` `FX_TRAIL_BANDS_BY_LEVEL=[2,4,8]`、`:398`） |
| 方案 B 增量绘制 | 提议 | 未做 |
| 方案 E DPR 自适应 | 提议 | 未做 |
| 降级状态机 `fxPerfUpdate` | — | **已落地**（`:537`） |
| 迟滞 | — | **已落地**：慢 24ms / 连续 6 帧降级、快 / 连续 90 帧升级 |
| §6.4 "dependencies 均为空" | — | 已过期 |

### 6.9 文档漂移三处

1. `LINUX-OCCLUSION.md` 头部写"未落地"，而 §10 写"已落地（2026-10-12）"——同一文件内部自相矛盾。
2. §10.3 称"hub 18 项、client 12 项"，当前 `check(` 调用点实为 **14 / 5**。
3. 客户端**确实复制了**渲染器的 pause 阈值 `0.05`（`src/occlusion.js:160`），与文档"生产端不复制数值"（`:43`）矛盾。

### 6.10 端到端时延（推断）

hub 1Hz + 客户端 1Hz ⇒ 遮挡生效最坏 **~2 秒**。这与文档实测"1–2s 进入 pause"一致（`LINUX-OCCLUSION.md:238-239`）。

渲染器的四档阈值在 npm 依赖 `webwallgl@^3.0.0` **内部**（`lib/webwallgl/renderer.js:1-18`、`:313-319`）——本仓 node_modules 缺失，**无法逐行验证**。

### 6.11 未解清单

1. `webwallgl@3.x` 内部四档阈值原文（需装依赖核对）
2. 上游 webwallgl 同步后本仓锚点漂移问题
3. `0.05` 阈值复制机制无测试守护
4. Windows 原生遮挡的可接入性（EnumWindows 方案是否可行）
5. ISSUE-190 的实际性能数字需人工复测
6. Wayland 各条路线的排期
7. EWMH 窗口管理器缺失时的降级路径体验
8. 遮挡与 `blurPause`/`desktop` 壳交互的完整真值表

---

## 7. 设置、持久化与预设

### 7.1 唯一真源：`lib/settings-schema.js`（1,884 行）

它是这个插件的**单一事实来源**：

- `DEFAULTS`（146 键）
- `KINDS`（142 键，14 类 kind）+ 枚举表（`lib/settings-schema.js:988-1178`）
- `readOne(key, raw)`（`:1644-1691`）逐 kind 分派，**未知 kind 直接抛错**（`:1689`）
- `clampNum` 越界时**回默认值**，而不是夹到边界（`:1570-1572`）

那三条"**不修好它**"纪律是全仓最反直觉、也最值得学的一条：**非法值即作废，绝不修剪成另一个看起来合理的值**。

理由是自洽的：一个被用户写坏的配置项，如果被"智能地"改成另一个值，症状会漂移到别处，排查成本极高。作废则症状明确（该项回默认）。

`sanitizeFromSchema(raw, 'host' | 'client')`（`:1830-1844`）是**唯一消毒入口**，`side` 只影响两处差异：CLIENT_ONLY 键的取舍、非对象输入的处理。

### 7.2 两端派生 = 宿主 import + 客户端构建期内联

这正是 ADR-0002 描述的机制：宿主直接 `import` 该模块；客户端在构建期把它**内联**进扁平的客户端产物（`scripts/build-client.mjs:630-635`）——**marker 缺失即构建失败**。

好处是两端永远同版本；代价是 schema 改一次要**重启 DSH**（`lib/settings-schema.js:37-38` 明确写出这一点）。

### 7.3 持久化：宿主文件是真源，localStorage 只是缓存

> 宿主文件 `~/.dsh-wallpaper-engine/config.json` 是真源（`DSH_WE_DATA_DIR` 可挪走，`lib/index.js:289-295`）；**localStorage 只是"同步缓存 + 迁移源 + 回滚"**（`src/persistence.js:2`）。

写路径（客户端侧）：

- 200ms debounce（`src/persistence.js:114`）
- 失败留脏标记，pagehide 时 flush
- PUT 带 `keepalive`（`:100`）—— 关标签页时请求也能落地
- `persistWrites` 计数器做**竞态守卫**（`:154`、`:172`）——防止旧响应覆盖新状态

写路径（宿主侧，`lib/config-store.js`）：

| 机制 | 锚点 |
|---|---|
| 原子发布（tmp + fsync + rename） | `:46-61` |
| 唯一临时名 | `:67-71` |
| `enqueueConfigWrite` 串行化读改写 | `:105-111` |
| 读永不抛 | `:31-38` |

**但有个真实的静默失败**：落盘失败被 `config-store.js:89` 的 catch 吞掉，**路由仍然回 200**。客户端以为存成功了，宿主其实没存。用户在 UI 上看到的"设置已保存"可能不成立。

### 7.4 下发模型：没有推送，没有广播

这是一个关键发现。`lib/routes/settings.js` **只注册 exact 路径 + `GET`/`PUT` 两个方法**，**没有 SSE、没有 WebSocket、没有轮询**。全仓检索 `EventSource` / `WebSocket` / `BroadcastChannel` / `'storage'` 监听 ⇒ 零命中。

推论：

- 宿主**不向客户端推送**设置变更
- **不跨标签页广播**（两个标签页各持一份 localStorage 副本）
- PUT 送的是**整份** `serializeSettings`（**不是增量**）

⇒ **[推断] 多标签页并开会"后写覆盖先写"**，而宿主完全察觉不到。这是一个真实的数据竞争风险（`07-settings-presets.md` 未确认是否有其它守卫覆盖）。

### 7.5 预设：四段键集从 KINDS 派生

预设（`lib/glass-presets/`）的键集**不是手写的**，而是从 `KINDS` 派生：

| 段 | 键数 | 锚点 |
|---|---:|---|
| `PROFILE_PRESET_KEYS` | 117 | `lib/settings-schema.js:1192` |
| 资产段 | 11 | 同上 |
| 排除段 | 12 | 同上 |
| CLIENT_ONLY | 2 | 同上 |
| **合计** | **142** | = `KINDS` 全集，恒等式实测成立 |

双向对账守卫在 `test/verify-presets.mjs:128-162`。

**资产段四态**语义：

| 状态 | 含义 |
|---|---|
| 缺席 | 不动这一段（**不写键**，`lib/settings-schema.js:1356`） |
| `null` | 显式声明"没有" |
| 字符串 | 指向内置形态 |
| 对象 | 直接携带内容 |

两层存储：随包 `lib/glass-presets/`（只读）+ 用户层。**墓碑**机制：用户删掉一个出厂预设后要写墓碑，**墓碑必须先判，否则出厂预设会复活**（`lib/routes/presets.js:190`）。

七个端点，**无 PUT、无 activate**——预设应用是**有副作用的动作**且**无撤销**。

base64 只在宿主侧进出；客户端只传 embed 名单。

工厂实测：**7 套出厂预设**，`values` 恒 117 键，`assets` 恒 `{font, mascot}`（**无 avatar**）。体积：`lib/glass-presets/factory-author.json` 156KB / `purple-mood.json` 66KB。

### 7.6 props：只读路由，写入跟 settings 走

`GET /props/<token>` 是只读的；写入走 settings 的 `userProps` 一个键（`src/client.js:1585-1594`）。`userProps` 被预设**硬排除**（token 是本机路径摘要，不能被预设覆盖）。

### 7.7 设置维度的风险清单

1. **多标签页后写覆盖先写**（见 7.4）
2. **改 schema 必须重启 DSH**（`lib/settings-schema.js:37-38`）
3. **预设应用有副作用且无撤销**
4. **宿主落盘失败静默**（`config-store.js:89` catch 吞掉，路由仍回 200）
5. **ADR-0011 状态与实现不同步**（ADR 仍写 `Proposed`，`docs/adr/0011-*.md:4`，实现已落地）
6. `GLASS_PRESET_*` / `glass-presets` 路径是**历史包袱**（"玻璃"预设与"玻璃 UI"是两件事，命名撞车）
7. 字体角色 / 排版角色仍有**逐字副本**（没有从 schema 派生）

### 7.8 字体集：两层存储（顺手记一笔）

- 随包 `lib/fontsets/<id>.json`（只读）+ 用户层 `<pluginDataDir>/fontsets/<id>.json`，**同 id 用户层胜**
- 改随包那份 = 写时复制到用户层；删掉 = 恢复原样
- `config.json` 只留 `{ fontSetId, fontCustom }`

---

---

## 8. 客户端渲染分层与「液态玻璃」UI 管线

### 8.1 一句话结论：这套 UI 管线里**没有渲染引擎**

「液态玻璃」= **CSS `backdrop-filter` / `-webkit-backdrop-filter`**。既不是 SVG 滤镜，也不是 WebGL。

反证（`05-glass-ui.md` §2.1）：

- 全 `src/` grep `feGaussianBlur` / `<filter` ⇒ **零命中**
- WebGL 只出现两处，都与玻璃无关：`lib/webwallgl/renderer.js`（壁纸内容本身的场景实时渲染）、`src/client.js:5158-5217` `detectSoftwareRender()`（建一个 WebGL 上下文读 RENDERER/VENDOR，判断有没有硬件合成）
- 关键注释（`src/client.js:5191`）：「连 WebGL 上下文都拿不到 → 没有硬件合成，backdrop-filter 必定不生效」——这句本身就���玻璃的实现形态钉死在 CSS 上

整套管线是三层叠加：

| 层 | 何时发生 | 内容 |
|---|---|---|
| ① 构建期产物 | 构建时 | `src/styles*.js` 的 CSS 是**静态文本**，被 `scripts/build-client.mjs` 内联进 `lib/client.js` |
| ② 运行时变量 | 运行时 | `src/effects.js` / `src/glass.js` 把设置翻译成 body 上的 `--we-*` 自定义属性 + `data-we-*` 门控属性 |
| ③ 运行时 DOM 补丁 | 运行时 | `src/avatar-layer.js`（头像）、`src/glass-extra.js`（额外选择器）就地改宿主 DOM |

### 8.2 分层模型：哪些是"层"，哪些不是

| 文件 | 性质 | 建 DOM？ | 职责 |
|---|---|---|---|
| `src/layer-core.js` | **不是基类** | 否 | 视频/实时两条通道共用的过场、退休与媒体释放 |
| `src/live-layer.js` | 实时渲染管线 | 是（`.we-layer`） | live 渲染与控制、看护心跳、判失败、抓帧回填、指针转发 |
| `src/video-layer.js` | 视频通道 | 是（`.we-layer` 内） | 只管"有画面了吗" + 放行策略 |
| `src/fx-layer.js` | 画布层 | 是（`.we-fx`） | 点击/拖尾光效 canvas |
| `src/parallax-layer.js` | 基座模块 | **不建 DOM** | 每帧把位移写进各层的 CSS 独立属性 `translate` |
| `src/avatar-layer.js` | 装饰层 | **改宿主 DOM** | 给宿主已渲染的消息行补头像 |
| `src/theme-follow.js` | 非层 | 否 | 主题随壁纸 |
| `src/focus-handback.js` | 非层 | 否 | 宿主侧焦点交还 |

`src/layer-core.js:1-40` 文件头注写死一条约束：**本文件不得引用任何实时专属符号**。

`src/fx-layer.js` / `src/parallax-layer.js` 头注把这类模块称为「**基座模块**」，口径是：不吃 ctx、直接读扁平 store `selection`、**只读 selection，一个字节都不写**、**零顶层可执行语句**——因为内联后 prelude 早于 `src/client.js` 正文，顶层读 `selection` 必撞 TDZ。

### 8.3 叠放关系与一个源码内部矛盾

三个 body 级浮层的 DOM 常量（`src/client.js:42-44`）：`ACTIVE_ATTR = "data-we-wallpaper"`、`LAYER_ID = "dsh-wallpaper-engine-layer"`、`SCRIM_ID = "dsh-wallpaper-engine-scrim"`。

z-index 全部来自 CSS，不是 JS：

| 层 | z-index | 锚点 |
|---|---|---|
| `.we-layer`（壁纸） | **-2** | `src/styles-base.js:97` |
| `.we-scrim`（暗化层） | **-1** | `src/styles-base.js:206-216` |
| `.we-fx`（光效层） | **-1** | `src/styles-ext.js:400-407` |

壁纸层与 scrim 的注释逐字：「Scrim: sits ABOVE the wallpaper (z-index -1 > -2, so it never depends on …)」。

**光效层与暗化层同为 -1，靠文档序分上下**。`fxPlace()` 强制重排：

```js
// src/fx-layer.js:237-254
if (fxHost.compareDocumentPosition(scrim) & 2) return;
scrim.parentNode.insertBefore(fxHost, scrim.nextSibling);
```

⇒ 光效在暗化层**之上**。

> ⚠️ **源码内部矛盾**：`src/fx-layer.js:231-236` 头注写的顺序是「壁纸 → **本层** → 暗化层 → 界面」，与括注「光效必须压在暗化层之上」打架。以 `fxPlace()` 与 `src/styles-ext.js:394-395` 为准 = **光效在暗化层之上**，那句列举是写错了顺序。

### 8.4 过场期间谁压谁：两个反直觉约束

```js
// src/layer-core.js:84-95
function startLayerTransition(node, outgoing, tr) {
  openRotationAudioGate(node, outgoing);
  // 两者默认都是 z-index:-2，谁在上面靠 DOM 顺序（live 的 staging 容器是**提前**
  // 挂到 body 的，顺序不保证）—— 过场期间显式把旧层压到新层之下。
  try { outgoing.style.zIndex = "-3"; } catch { /* ignore */ }
  node.className = "we-layer we-layer--switch";
  // 只有需要旧层同时动起来的过场（推移 / 缩放）才给它挂 switch 类；其余过场旧层
  // 保持不透明静止垫着（玻璃 backdrop-filter 依赖这层不透明背景）。
  if (tr.id !== "fade") outgoing.className = "we-layer we-layer--switch we-layer--switch-out";
```

两个要点：

1. **同 z-index 不可靠**（staging 容器提前挂 body，顺序不保证）⇒ 过场期显式把旧层压到 `-3`。
2. **玻璃依赖旧层不透明** ⇒ `fade` 之外的过场，旧层必须垫着不透明，否则 backdrop 采样到透明底 ⇒ 玻璃"穿透"变淡。

**这是"壁纸层"与"玻璃层"之间的硬耦合**——不是 bug，是设计约束被写进了注释。

### 8.5 视差层为什么特殊

`src/parallax-layer.js:1-40` 头注 + 常量（`:117` `PARALLAX_DIRECTION = -1`、`:227` `PARALLAX_TRANSLATE = 'translate'`）：

- 位移写进各层自己的 **CSS 独立属性** `translate`，**不写自定义属性**——避免整棵子树重算样式
- 归零时**必须摘掉 `translate`**，否则该元素成为 `position:fixed` 后代的**包含块**（#89 坑）
- **左栏是例外**：改用 `position:relative` + `left/top`（相对定位不是 fixed 后代的包含块），代价是每帧多一次布局

### 8.6 头像层与焦点交还层

**头像层**（`src/avatar-layer.js:1-40`）：官方消息渲染器按 kind 注册（`conversation.chat.node` 的 `user`/`assistant-step`），**注册同名 key ＝ 替换官方渲染器** ⇒ 只用稳定选择器 `data-chat-flow-kind` + 观察者；只碰 user/steering/assistant-step；幂等（`data-we-avatar-row`）；无 DOM 环境连观察者都不建。

**焦点交还层**（`src/focus-handback.js`）：交还判据三条同时成立——① focusout 的 target 是记住的宿主元素 ② 落进壁纸帧（`activeElement` 是 `iframe.we-iframe`）③ 非用户手势引起（`GESTURE_WINDOW_MS` 内无 pointer/mouse/key/touch）。自证字段 `window.__weFocusHandback = { lastEl, lastAt, gestureAt, handbacks, skipped, lastHandBackAt, active }`。

### 8.7 玻璃的决定性 CSS

```css
/* src/styles-shell.js:142-155（逐字节选） */
body[data-we-glass-chat][data-we-glass-page] [data-composer-card],
body[data-we-glass-chat][data-we-glass-page]:not([data-we-thinking-native]) [class*="_bubble"]:not([role="tooltip"]),
body[data-we-glass-chat][data-we-glass-page] [data-question-key] [class*="_card"],
body[data-we-glass-chat][data-we-glass-page] [data-plan-review-key] [class*="_card"],
body[data-we-glass-chat][data-we-glass-page] [data-approval-key] [class*="_card"] {
  background-image: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05) 38%, rgba(255,255,255,0.02));
  -webkit-backdrop-filter: blur(var(--we-blur, 16px)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
  backdrop-filter: blur(var(--we-blur, 16px)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,var(--we-glass-highlight,0.32)),
    inset 0 -1px 0 rgba(255,255,255,0.08),
    inset 0 0 0 0.5px rgba(255,255,255,0.08),
    0 12px 40px rgba(0,0,0,var(--we-glass-shadow,0.12));
}
```

玻璃的四个成分逐字对应四个 CSS 机制：

| 成分 | 机制 | 变量 |
|---|---|---|
| 模糊 | `backdrop-filter: blur(...)` | `--we-blur`（px） |
| scrim（釉光/镜面） | `background-image: linear-gradient(180deg, 白→透明)` | 写死在配方里（0.16 / 0.05 / 0.02） |
| 边框 | `box-shadow: inset 0 1px 0 ...` / `inset 0 0 0 0.5px ...` | `--we-glass-highlight`（0.32） |
| 不透明度 | 底色 `color-mix` 里的 alpha（**不是 `opacity`**） | `--we-glass-alpha` |

配方意图写在 `src/styles-shell.js:20-47` 头注：「a top-weighted specular gradient (background-image) — the sheen is what makes the surface read as "wet glass", not a flat tint」；以及「**saturation is DECOUPLED from the blur radius**」。

### 8.8 透明不靠 `opacity`，靠**令牌接管**

```css
/* src/styles-shell.js:174-179 */
body[data-we-glass-page] {
  --dsw-specific-input-major: color-mix(in srgb,
    var(--we-chat-readability-base) calc(var(--we-chat-readability-floor) * 100%),
    rgba(var(--we-chat-surface-tint-rgb-light, 255, 255, 255), var(--we-glass-alpha, 0.15)) calc((1 - var(--we-chat-readability-floor)) * 100%));
```

**为什么改令牌而不是加类选择器**（`src/styles-shell.js:37-47` 逐字）：

> CSS-module class names are build hashes and change whenever the shell frontend is rebuilt, which silently kills the effect. backdrop-filter cannot be expressed as a token, so the blur itself still needs an element selector — `[data-composer-card]` is authored in the shell source and survives rebuilds.

⇒ **[推断] 这是整套玻璃管线最脆的一环**：玻璃的"透明"部分依赖宿主**令牌名**（稳定），"模糊"部分依赖宿主**源码作者写的属性名**（`[data-composer-card]` / `[data-question-key]` / `[data-plan-review-key]` / `[data-approval-key]`）或模块类名后缀约定（`[class*="_bubble"]`）。宿主重构后玻璃会**静默退化成"只有透明、没有模糊"**。文件自述：「if that ever stops matching the bubble stays translucent, just without the blur」。

### 8.9 模糊 / scrim / 边框 / 不透明度各怎么算

全部在 `src/effects.js` 的 `applyEffects(opts)`（`:347`）里算：

| 产物 | 公式 | 锚点 |
|---|---|---|
| `--we-blur` | `selection.blur + "px"` | `src/effects.js:363` |
| `--we-saturate` | `useLegacySaturateCoupling() ? String(1.15 + selection.blur*0.028) : String(GLASS_SATURATE)` | `:381-384`（`GLASS_SATURATE = 1.3`，`src/client.js:5134`） |
| `--we-glass-brightness` | 常量 `"1.04"` | `:381-384` |
| `--we-scrim-color` | `"rgba(0,0,0," + selection.scrim + ")"` | `:358` |
| `--we-glass-alpha` | `Math.max(0.10, 0.25 - (selection.glassAlpha / 100) * 0.15)` | `:489-490` |
| `--we-glass-fidelity` | `clamp(fidelity/100)` | `:503-505` |
| `--we-surface-tint-light/dark` | `weClampSurfaceColor(tint, theme, glassFidelity)` | `:514-515` |
| `--we-media-filter` | blur/brightness/contrast/saturate 拼串，空则 `none` | `:398` |
| `--we-wallpaper-opacity` | `(100 - wallpaperOpacity)/100` + `--we-wallpaper-fade-bg` | `:438-452` |

⚠️ **样式表回退值与运行时常数不一致**：`var(--we-saturate, 1.8)` 的回退是 **1.8**，而运行时常数 `GLASS_SATURATE` 是 **1.3**。`src/client.js:5126` 逐字：「的低端 1.3，且低于样式表自身 1.8 的回退默认值」。这意味着**在 `--we-saturate` 未被写出的一帧里，饱和度是 1.8**——一个可见的跳变。

**`--we-wallpaper-opacity` 那条的理由逐字**（`src/effects.js:438-452`）：**透明 backdrop 会让玻璃 backdrop-filter 静默失效**（Chromium 合成器不再有效模糊）——这是玻璃与壁纸透明度之间的硬耦合。

`weClampSurfaceColor(hex, theme, fidelity)`（`:278-322`）：地板权重 `F = theme==="dark" ? 0.59 : 0.45`；`aMin = F + 0.10*darkFactor*(1-F)`；对比度阈值 **4.6**；二分 12 次向黑/白；再按 fidelity 线性回退原色。

### 8.10 玻璃后端的三条契约

`src/glass.js:8-14` 文件头注逐字：

> ① **每档都算出值并写出**（`applyGlass` 里没有任何 `removeProperty`）——"不写"永远不等于"撤销"：CSS 的 `var(--x, 兜底)` 只在 `--x` **未定义**时取兜底，而写到 body 上的变量一直是"已定义"的。
> ② **门控属性恒挂**（`data-we-glass-page` / `-chat` / `-window` / `-floaters` **不可关**；`data-we-left-sidebar`、`data-we-titlebar-glass`、`data-we-sidebar-glass`），与"用谁的值"**正交**。
> ③ **读谁只在这里决定**：`glassValue(面, 参数, 自己的键, 全局的键)`；UI 只翻开关，不动接线。

```js
// src/glass.js:66-72
const glassModeOn = (surface) => {
  const rec = selection.glassMode;
  return !!(rec && typeof rec === 'object' && rec[surface] === 'custom');
};
/** 面 × 参数 → 取值：**模式是 custom** 读 profile，否则读全局。 */
const glassValue = (surface, param, profileValue, globalValue) =>
  (glassModeOn(surface) ? profileValue : globalValue);
```

**契约① 是整个仓库最值得学的一条工程纪律**：CSS 变量一旦被写过，"撤销"就不能靠"不写"来实现。必须**每档都算出值并写出**。这让"该撤没撤"在结构上无法发生。

`data-we-glass-page` **恒挂**（`src/glass.js:40-46` 逐字）：「它与 `data-we-wallpaper`（壁纸层在场、页面让开）**正交** —— 壁纸只是玻璃的背景来源之一，不是玻璃的前提 —— 否则不设壁纸时玻璃参数全是死旋钮（用户报障：「页面玻璃效果只有设置壁纸后才生效」）」。

### 8.11 逐面「釉层变量」与曲线

设置窗口面（`src/glass.js:98-104` 逐字）：

```js
const pct = Number(glassValue("settingsWindow", "transparency", selection.settingsWindowTransparency, selection.glassAlpha)) || 0;
s.setProperty("--we-settings-window-blur",
  glassValue("settingsWindow", "blur", selection.settingsWindowBlur, selection.blur) + "px");
s.setProperty("--we-settings-window-alpha", String(Math.max(0.10, 0.25 - pct / 100 * 0.15)));
```

透明度曲线 `0.25 → 0.10`（滑杆 0–100 越大越透），与全局 `--we-glass-alpha` **同形**。

`src/glass.js:78-86` 逐字说明了每个面**能做到什么 / 做不到什么**：

> ✅ 模糊 / 透明度 —— 判据对它们要么无锚定，要么是**子串判定**。
> ❌ 保真度与下限覆盖度 —— F2a 的面纱形要求声明**以** `var(--we-readability-base)` 开头，且 F1c 要求 `body{}` 里那条 floor 声明原样在 ⇒ 这一面的地板永远来自全局。
> ⚪ 饱和度 / 亮度 —— 它们**不是可配置参数**。

逐面清单：设置窗口 `:100-104`、对话栏 `:114-127`、思考触发条 `:135-140`、左侧栏 `:158-159` + `:200-203`、标题栏 `:213-214` + `:236-239`、better-sidebar `:258-287`、浮层 `:297-304`、内容面 `:312-318`。

**better-sidebar 那段值得单列**：`--we-sidebar-alpha` **不写**（死变量，无 CSS 消费者），真正接线的是 `--we-sidebar-sheen` = `String(Math.min(1, sidebarAlpha / 0.2236))`（12 处消费）与 `--we-sidebar-tint`（6 处消费）；侧栏**不分深浅主题**（有意取舍）。

### 8.12 唯一一条「关玻璃」路径：皮肤让路态

```js
// src/glass.js:31-39
// ── 「皮肤在台上」的让路态：整族门控摘掉、本函数一概不挂 ──
// 这里是唯一会整族摘门控的路径。
if (typeof skinYieldActive === "function" && skinYieldActive()) {
  for (const attr of ["data-we-glass-page", "data-we-glass-chat", "data-we-glass-window",
    "data-we-left-sidebar", "data-we-titlebar-glass", "data-we-sidebar-glass",
    "data-we-sidebar-fullclear", "data-we-glass-floaters"]) {
    document.body.removeAttribute(attr);
  }
  return;
}
```

`skinYieldActive()` / `enterSkinYield(reason)` 在 `src/client.js:421-441`：皮肤（另一个插件）上台 ⇒ 壁纸引擎退场（清层、关轮播、落盘记忆、`applyEffects()` 让玻璃门控整族摘除）。**这不是用户可用的开关**。

> **全仓 grep `glassEnabled|glassOff|noGlass` ⇒ 零命中。** 代码里**没有**"关玻璃"的用户开关。

### 8.13 额外补雾化选择器

`src/glass-extra.js`（85 行）：`EXTRA_GLASS_TAG_ID = "dsh-wallpaper-engine/extra-glass"`；`weExtraGlassCss(selection)` 是纯函数（清单 → CSS 文本，空清单 ⇒ 空串）；门 = `body[data-we-glass-page]:not([data-we-glass-fallback])`；规则体是 `content:""; position:absolute; inset:0; border-radius:inherit; z-index:-1; pointer-events:none;` + 同一套 `backdrop-filter`。选择器只走 `settings-schema` 的 `sanitizeExtraGlassSelectors` 消毒；内容没变就不碰 DOM。

### 8.14 玻璃的三个已知坑与兜底

1. **#89：`backdrop-filter` 会成为 `position:fixed` 后代的包含块**。`src/styles-shell.js:228-254` 把 `[data-composer-card]` 的模糊搬到 `::before` 伪元素，注释逐字：「A non-none backdrop-filter makes the element a containing block for its fixed descendants, so that button stops being viewport-anchored and drops ~522px below the card」。`src/styles-sidebar.js:38-94` 同理（侧栏只把 backdrop-filter 那一对声明搬到 `::before`）。
2. **软件渲染下 backdrop-filter 静默失效**。`src/styles-ext.js:17-30` 逐字：「@supports 只做语法检查，软件合成下 backdrop-filter 被静默忽略时它依然为真，所以近不透明回退必须靠运行时探测来挂载」⇒ `detectSoftwareRender()`（`src/client.js:5158-5217`）挂 `body[data-we-glass-fallback]`。
3. **壁纸层透明 ⇒ 玻璃静默失效**（`src/effects.js:438-452`）。

### 8.15 ADR-0008 / ADR-0010：两态与四态

**ADR-0008**（`docs/adr/0008-glass-config-two-state.md`，Status: **Amended by ADR-0010**）：

- **D1**：「**每个面两态。** "读全局"与"读自己"由**一个**键回答（`glassMode`: `'inherit' | 'custom'`）。"这一项有没有能力读自己的值"不再手抄成一张能力表；它由"注册表 `params` ↔ `glassValue` 调用点"的**逐参数对账**与"写出的变量必须有人读"两条判据共同保证。」
- **D2** 一把刻度（模糊 0–60px、透明度 0–100%），各面曲线只做「位置 → 观感」；删除 `norm`/`denorm`
- **D3** 门控两类 —— 恒挂 / 可切
- **D4** 简化配置 vs 高级配置；**预设方案 = 高级配置，只在设置页画**
- **D5** 每个被读的面都必须有开关（可达性判据）
- **D6** 迁移按参数性质分档

落地位置：两态的键 = `selection.glassMode`（`src/glass.js:67`），默认值由登记表生成（`lib/settings-schema.js:466`）；子面登记表 = `GLASS_CHILDREN`（`lib/settings-schema.js:256-340`）；键名派生 = `childGlassKey(id, param)`（`:349-354`，支持 `keyOverrides`）；D4 的"预设只在设置页" = `src/glass-panel.js:672-677` 的显式门；D5 的"没有开关的旋钮是死的" → `src/glass-panel.js:489-496` 的 `if (c.master && sel[c.master] !== true) continue;`。

**ADR-0008 的 Consequences 里有一条「放弃」**（逐字，`:145-147`）：

> **放弃：关闭某一面即"回原生纯色"。** 实测摘掉门控属性并不能如愿回到原生 —— 那些面上还有一批**不挂门控**的令牌改写（壁纸激活即生效），"关"得到的是半玻璃。要做到"关得像样"必须连令牌层一起回退，复杂度远超收益 ⇒ 整层退役，改为**恒吃玻璃**。

**ADR-0010**（`docs/adr/0010-glass-off-revisit-four-states.md`，68 行，Status: **Accepted**）修订了这一条：

> **修订 ADR-0008 的放弃结论。** 「关玻璃」从「不可行（令牌层回退复杂度远超收益）」改为「**前置条件已成立，缺的是产品级主开关与一批守卫改写，不是架构**」。

**四态**（ADR-0010 D2 逐字）：`full`（默认）/ `glass-only`（今天已支持的关壁纸）/ `wallpaper-only`（缺主开关，渲染层就绪）/ `off`（= 皮肤让路态，升格为用户与第三方可声明的状态）。**不做两个独立布尔**：布尔组合会与既有门控属性的正交语义打架，且会产生组合爆炸。

**四态落到代码了吗？—— 没有。** 全仓 grep `glass-only|wallpaper-only|coexistMode`：19 处命中**全部在 `docs/` 与 `test/` 的散文/断言里**，`src/` 与 `lib/` **零命中**。

现状表（`docs/COEXISTENCE.md:48-58`）：

| 态 | 玻璃 | 壁纸 | 状态 |
|---|---|---|---|
| `full` | 开 | 开 | ✅ 默认 |
| `glass-only` | 开 | 关 | ✅ 现在就支持 |
| `wallpaper-only` | 关 | 开 | ❌ 还缺主开关（渲染层已就绪，见 ADR-0010） |
| `off` | 关 | 关 | ⚙️ 内部已有待升格（= `skinYieldActive()` 让路态） |

⇒ **[推断] 用户看到的永远是"半玻璃"**——想全关做不到。而这与 ADR-0010 的判断（"前置条件已成立，缺的是主开关"）一致：**问题已经诊断清楚、修法已写好，只是还没实现**。

### 8.16 样式架构：CSS 是构建期产物，运行时只算变量

`src/styles.js` **全文只有 31 行**：

```js
const CSS = CSS_BASE + CSS_SHELL + CSS_SIDEBAR + CSS_CHROME + CSS_SETTINGS + CSS_PANEL + CSS_QUICK + CSS_EXT;
export { CSS };
```

头注逐字：「这是全仓最大的一块**纯数据**（3,682 行 CSS、**零分支**）…… 按视觉域切成 8 个域模块后，定位"某段规则从哪开始"不再需要在一大片 CSS 里翻找…… 拼装契约：各域模板按 INLINE_MODULES 顺序相加 ⇒ 拼出的 CSS 与原单模板**逐字节相同**（分割前 sha256 前缀 `3b6c41dc7dcab44bf5c57f4` · 262306 B）」。

⇒ **CSS 切分是可验证无损的**（有 sha256 + 字节数当基线）。

运行时只有一次注入（`src/client.js:5066-5080`）：建/复用 `<style data-plugin-css="dsh-wallpaper-engine/styles-v3">`，内容不同才重写；`CSS_GEN = Date.now() + ":" + Math.random().toString(36).slice(2)` 是代际标记（fiber cleanup 只移除自己那一代）。

⇒ **没有 CSS 预处理器、没有 PostCSS、没有构建期 CSS 产物文件**；`lib/client.js` 里是**内联的 CSS 文本**。

**可读性下限必须与 CSS 同文件**（`src/styles.js:13-16` 逐字）：因为它们是样式表模板里的**插值**；数值在 `src/styles-base.js:57-58`：`READABILITY_FLOOR = 0.45` / `READABILITY_FLOOR_DARK = 0.59`。

### 8.17 特效系统与 `ext` 扩展点

**`src/effects.js`（782 行）是特效系统的唯一落点**。`applyEffects(opts)`（`:347`）；`:356` `const live = Boolean(opts && opts.live);`（拖动期跳过重活）。调用链：

1. `:358-547` 写 `--we-*`（scrim / border / blur / saturate / media-filter / transform / object-fit / layer 位移 / wallpaper-opacity / accent 一族 / glass-alpha / glass-color / glass-fidelity / surface-tint）
2. `:552` `applyGlass(selection, s)` —— 玻璃管线**一行**接进特效管线
3. `:556` `syncExtraGlassCss(selection)`
4. `:562-570` 思考三挡门控（`data-we-thinking-native` / `data-we-thinking-glass`，互斥；skinYield 时都不挂）
5. `:593-599` 侧栏跟随全局：`--we-sidebar-blur: var(--we-blur)` —— 理由逐字是 **var() 惰性替换 ⇒ 引用而非拷贝**
6. `:608` `data-we-adapter`；`:614` `data-we-mica`（`detectMicaSupport`）；`:621` `data-we-glass-fallback`（`detectSoftwareRender`）
7. `:624-636` 字体：`fontCustom` → `snapshotHostFontDefaults()` + `applyComponentFonts()`；否则撤销
8. `:657-668` scrim 内联 + **强制回流**（`void document.body.offsetHeight`）

`clearEffects()`（`:671-778`）逐个撤销：18 个 `data-we-*` 属性 + 12 个按面釉层变量 + `clearUnderlayColor()` + `disposeExtraGlassCss()`。

**`ext` = 扩展页签的「扩展岛」**，三个模块：`src/ext-fx.js` / `src/ext-parallax.js` / `src/ext-avatar.js`。

形状 = 模块描述符 `{ id, title, desc?, render? }`；`extensionModules()`（`src/panel-tabs.js:244-246`）返回 `[AVATAR_EXTENSION_MODULE, FX_EXTENSION_MODULE, PARALLAX_EXTENSION_MODULE]`；渲染 `mod.render ? mod.render(ctx) : null`（`:275`），顺序即屏上顺序。

**硬约束**：

- 模块**不得自己写设置 / 发通知 / 持有状态**（无 `setSetting`、无 `emit(`、无 `selection`）；只从一个参数取外界
- 滑杆 min/max **不写死**，读 `lib/settings-schema.js`
- `title` / `desc` **必须是 getter**（`get title() { return weT("…"); }`）—— 写成字面量是「裸中文」判据违规，写成顶层 `title: weT("…")` 会撞 TDZ
- `extensionModules()` 必须是**惰性函数**——两个理由：① 内联后 prelude 求值期就要读兄弟模块的常量，模块顺序成了隐式契约 ② `test/verify-scene-live.mjs` 单独 import 本文件，顶层一引用别处的符号就当场 ReferenceError

### 8.18 设置面板 UI 的组织

**页签表**（`src/client.js:1833-1840` 逐字）：

```js
const PICKER_TABS = [
  { id: "library", get label() { return weT("壁纸库"); } },
  { id: "appearance", get label() { return weT("外观"); } },
  { id: "playback", get label() { return weT("播放"); } },
  { id: "system", get label() { return weT("系统"); } },
  { id: "extensions", get label() { return weT("扩展"); } },
  { id: "about", get label() { return weT("关于"); } },
];
```

`PICKER_TAB_LEGACY` 迁移表（`:1842-1845`）：`wallpaper→library`、`font→appearance`、`effects→playback`、`audio→playback`、`mascot→system`、`advanced→system`。折叠态**只存 localStorage**；读到 null 才用默认值（这样改默认值不会覆盖用户的选择，`:1855-1867`）。

**接缝契约**（`src/panel-tabs.js:1-45`）：

- 每个渲染器**只从一个参数取外界** `(ctx)`
- **多传无害、漏传当场 ReferenceError**（刻意选的失败方式：响亮且可定位）
- 四类越界由 `test/verify-client.mjs` 钉住：① 不得引用 `selection` ② 不得调 `emit(` ③ 不得改写 ctx 别名指向的东西 ④ 不得改写模块级状态；动作一律收口成 `client.js` 里的 `on*` 处理器

**玻璃面板是注册表驱动的**（`src/glass-panel.js:1-72`）：渲染源是 `GLASS_CHILDREN` + `childGlassKey()` ⇒ **这里不硬编码四项**。

| 子面 | params | 备注 |
|---|---|---|
| `settingsWindow` | `{transparency:100, blur:60}` | |
| `conversation` | `{color:0, fidelity:100}` | `keyOverrides: {fidelity:'chatGlassFidelity'}` |
| `thinkingTrigger` | `{transparency, blur}` | `master: 'thinkingGlass'` |
| `floaters` | `{transparency, blur}` | |
| `leftSidebar` | `{transparency, blur}` | `panelOff: true` |
| `titlebar` | `{transparency, blur}` | `panelOff: true` |

**侧栏快捷面板 = 设置页的同一批渲染器**（`src/quick-panel.js:1-32` 逐字）：两个宿主位置（官方右侧栏 tab / 低版本右滑抽屉）共用同一份内容；「外观」「播放」两页与设置页同名页签**共用同一批渲染器**，侧栏档由 `ctx.surface === "sidebar"` 少画设置页专属分组 ⇒ 两处永远是同一份控件、同一份状态。

**占位器机制**（`src/quick-panel.js:198-209`）：

```js
function sidebarCtxStub(name) {
  const boom = () => { throw new Error("[we-sidebar] ctx." + name + " 属于设置页，侧栏档不提供"); };
  return new Proxy(function () {}, { get: boom, apply: boom });
}
```

`QP_CTX_SETTINGS_ONLY` 名单目前含 `onGlassDarkSeparate`、`glassPresets` 等——注释逐字：「给那道门上牙」：哪天它在侧栏档被取用 = 渲染时当场抛错，而不是静默冒出深色行。

**虚拟滚动**常量 `QP_ROW_H=34` / `QP_ROW_GAP=2` / `QP_CARD_H=92` / `QP_CARD_GAP=8` / `QP_CARD_MIN=130` / `QP_VP_OVERSCAN=6` / `QP_VP_FIRST=30`；注释逐字：「行距常量与 styles.js 一一对应（**改样式必须同步改这里**，否则窗口算错位）」。

**侧栏接入宿主的方式**（`src/sidebar-right.js:1-28`）：能力门 `ctx.slots.inject("sidebar.right.pane.tab", cb)`——「该座位只有 harness ≥0.1.5 才会声明，回调跑没跑就是**天然的分支点**…… 不调版本号判定（座位存在性 = 功能存在性，少一个漂移源）」。两个服务都是**可选服务**，用 `ctx.get` 轮询拿（写进 `inject` 会在低版本宿主把插件 park 死）。

### 8.19 picker 是 MVVM 还是命令模式？

**两者都不是标准形态；是「纯模型 + 纯视图 + 命令式处理器」的三段式。**

- **模型层** `src/picker-model.js:1-49`：「纯函数 + 显式入参，不读 `selection`、不读模块级可变状态；**零 DOM / 零 emit / 零 setSetting / 零定时器 / 零 fetch** ⇒ 可脱离 DOM 与 React 单测」。API = `pickerModel(input)` → `{query, playableList, basePlayable, ratingCounts, typeCounts, editorList, hiddenList, normalPage, hiddenPageView, editorPageView}`
- **视图层** `src/picker-modal.js:1-40`：整棵 `we-picker__modal` 子树；`renderPickerModal(ctx)` 是**纯函数**（hooks 不能长在它身上）
- **命令**：改状态是**处理器**的职责（`hideWallpapers` / `restoreWallpapers` / `applySelection` / `setSetting` / `emit`），视图通过 ctx 里的回调名调用

> **[推断]** 整体更接近 **MVI / Elm 味的状态—渲染分离**，而不是 React 语境下的 MVVM（没有 ViewModel、没有双向绑定），也不是命令模式（命令模式是"命令对象 + 执行器"，这里是"回调 + 模块级函数"）。依据：`src/picker-model.js:45-48` 逐字写明「『✕ 关闭』卡由**视图**渲染…… 隐藏 / 恢复 / 落盘 / 页号改写是处理器的事，本层只读入参里的页号、不回写」。

**视图的类名是契约**（`src/picker-modal.js:5-7`）：「那些选择器**按层级与相邻关系**绑定这棵树……改一个类名或挪一层就**静默**失效」；验收核心是**标记等价**（class 序列逐字相同，三个 golden：普通视图 / 批量模式 / 隐藏页）。

### 8.20 玻璃维度的优点

1. **玻璃后端单点化**：`src/glass.js:1-19` 自述「**玻璃后端的唯一落点**…… 它的输入输出是封闭的 —— 只需要 `selection` 与 `document.body.style`」⇒ "写了什么"有单一归属。
2. **"不写 ≠ 撤销"的工程自觉**：契约① 强制每档都算出值并写出，"该撤没撤"在结构上无法发生。
3. **门控与取值正交**：契约②③ ⇒ UI 只翻 `glassMode`，接线不动；ADR-0008 D5 的"可达性"判据配上"登记表说什么才画什么"，杜绝死旋钮。
4. **CSS 文本可逐字节复现**：有 sha256 前缀 + 字节数作基线 ⇒ 8 域切分**可验证无损**。
5. **失败方式选得响亮**：「漏传 ctx ⇒ 当场 ReferenceError」而不是静默降级；侧栏档更进一步用 `sidebarCtxStub` 把"本该只在设置页的行"变成**取用即抛错**。
6. **合成器陷阱有实测与对策**：#89 不是靠"注意"避免，而是**把 blur 搬到 `::before` 伪元素**；软件渲染静默失效有**运行时探测**兜底，而不是靠 `@supports`（明确说 `@supports` 不够）。
7. **文档与实现的对账有工具**：`docs/TOKEN-CONTRACT.md` 生成物 + `test/verify-token-contract.mjs` 逐字节对账 + 白名单封闭判据。

### 8.21 玻璃维度的缺点与风险

1. **玻璃的"开/关"在用户侧不存在**。`src/glass-panel.js:1-72` 自述「**没有「要不要玻璃」的开关**」；唯一整族摘门控的路径是**皮肤让路态**，不是用户开关。
2. **四态是纸面设计**：`glass-only|wallpaper-only|coexistMode` 在 `src/` `lib/` **零命中**。
3. **玻璃的模糊依赖宿主的类名/属性名约定** ⇒ 宿主重构后静默退化成"只有透明、没有模糊"。
4. **backdrop-filter 的性能代价被显式记录**：`src/live-layer-watch.js:166` 注释「全页代价（例如液态玻璃的 backdrop-filter 每帧重采样壁纸）」；`src/client-media-frame.js:149` 注释「backdrop-filter 对 iframe 合成结果的采样」。
5. **零 import 全内联 ⇒ TDZ 是结构性风险**：代码用大量 `typeof` 守卫与惰性函数绕过，代价是可读性与"何时可用"的心智负担。
6. **同一份 UI 有两套渲染档，漂移风险靠守卫兜**：ADR-0008 的 D4 更是被修订过**三次**（2026-10-05 / 10-09 / 10-11），且 10-09 那次还制造过一次「用户找不到字体」的实际事故（`docs/adr/0008-glass-config-two-state.md:105-113`）。
7. **源码注释与代码不一致**（`src/fx-layer.js:231-236` 的层序列举）。
8. **死变量 / 未接线变量**：`--we-sidebar-alpha`（无 CSS 消费者）、`--we-glass-color`（`src/effects.js:499`，无 CSS 消费者但被 compat-harness 观察）⇒ "写了必须被读"这条判据在**部分变量**上打了豁免。
9. **UI 与样式的耦合靠人工同步**（行距常量 ↔ styles.js）。
10. **ADR-0008 与实现的折叠默认值不一致**：ADR 逐字说"两档都默认收起"，但实现里侧栏档两个折叠块默认收起（`src/quick-panel.js:671-672`），**设置页档的字体节默认展开**（`src/client.js:1863-1867` `if (v === null) return true;`）⇒ ADR 那一次修订的正文没有同步这条用户口径。

### 8.22 玻璃维度未解清单

1. 四态的第三批何时落地？（`docs/adr/0010-glass-off-revisit-four-states.md:42-47`）**现状：零代码**。
2. `wallpaper-only` 会不会与 `--dsw-alias-bg-base: transparent` 打架？`src/styles-base.js:222-225` 的 `body[data-we-wallpaper] { --dsw-alias-bg-base: transparent; }` 是恒挂于壁纸门控的 ⇒ 推断四态落地时这条要单独给口径。
3. 逐面"保真度 / 下限覆盖度"永远不可达（`src/glass.js:78-86`）——可读性契约（F1c / F2a）把声明钉在固定文本形状上的**结构性后果**。
4. `--we-glass-color` 无 CSS 消费者——已写未用的事实没变。
5. `src/focus-handback.js` 与 `lib/we-focus-guard.js` 的分工边界只有注释描述，没有 ADR。
6. `styles-*.js` 的 8 域切分是否有再切计划？

---

---

## 9. 字体排版系统与国际化

### 9.1 字体设置不是"一组 CSS 变量"，而是三条并行通道

`docs/FONT-SYSTEM.md:23-37` 把字体落点分成三路：

| 通道 | 实现 | 作用对象 | 落点方式 |
|---|---|---|---|
| ① **角色令牌** | `src/font/typography.js` · `src/font/color-roles.js` | DSH 的**角色**（正文/次要/弱化/标题/代码/表格…） | DSH `theme` 服务的 `overrideTokens`（body 内联，**免 `!important`**） |
| ② **官方组件钩子** | `src/font/components.js` | 组件自己声明的 `--dsl-*` | 钩子的**定义点作用域** |
| ③ **模块名白名单直接命中** | 同上，`COMPONENT_FONT_TARGETS` 的白名单项 | CSS-module 前缀可命中的组件 | `body [class*="_<模块名>_"]`（**等特异性**，不用 `!important`） |

再加一条**与 settings 平行的持久化通道**（字体集 fontset）。

### 9.2 字体键与普通设置键**物理分家**

```js
// lib/settings-schema.js:1704
const FONTSET_KEYS = ['themeColors', 'themeDarkSeparate', 'themeSize', 'themeWeight', 'themeFamily', 'globalFamily', 'componentFonts'];
```

这 7 个键**不在 settings 的持久化白名单里**。`lib/settings-schema.js:1839` 与 `:1852` 各有一句：

```js
if (FONTSET_KEYS.includes(key)) continue; // D1：字体值住字体集文件，不住 settings blob
```

`:1741-1748` 把这条纪律写成注释：「**settings 的持久化白名单 = KINDS − FONTSET_KEYS**」。

⇒ **排版/配色设置的值住在 `fontsets/<活动 id>.json`，不在 `config.json`**。`config.json` 只留"当前用哪个字体集"与非字体键。（`themeFollow` 不在 `FONTSET_KEYS` 里 ⇒ 它留在 settings 通道。）

**加键是加性的**（`:1701-1702` 逐字）：「老文件缺这个键 ⇒ 消毒时回落默认值（空），无需迁移；因此 `FONTSET_SCHEMA_VERSION` 不随加键升 —— 升版本会让**所有**已导出的 .json 变成"读不懂"」。

字体集与 settings **共用同一条消毒路径**（`sanitizeFontset` → 逐键走 `KINDS` 里的 `read*`，`:1734-1739`）⇒ 不会出现"settings 拦得住、字体集拦不住"的偏差。

### 9.3 值域：只存"键"，不存 CSS 栈

| 维度 | 键 | 值域 | 锚点 |
|---|---|---|---|
| 颜色角色 | `themeColors` | 每角色 `{light, dark}` 两个 `#rrggbb`，**缺一套整角色丢弃** | `lib/settings-schema.js:1441-1456` |
| 字号 | `themeSize` | 整数 8–48 | `:1494-1504`；`src/font/typography.js:58-59` |
| 字重 | `themeWeight` | 100–900 | `:1510-1520` |
| 角色字族 | `themeFamily` | 只留"族键"（内置族键或 `sys:<族名>`） | `:1527-1536`；`:82-88` |
| 全局字族 | `globalFamily` | 同上 | `:1116` |
| 组件字体 | `componentFonts` | 每组件 `{size 6–40, weight 100–900, family}` | `:1543-1568` |
| 组件 id | — | `["markdown","codeBlock","terminal","table"]` | `:1543` |

内置族键白名单（`lib/settings-schema.js:43`）：`['inherit','Microsoft YaHei','KaiTi','SimSun','SimHei','STXingkai','monospace']`。

本机字体族键是 `sys:<族名>`（`:55` `SYSTEM_FONT_KEY_PREFIX = 'sys:'`），**带前缀但名字不合规一律作废，不"修好它"**（`:82-88`，理由是"把 `sys:a;b` 修成 `sys:ab` 会变成另一个字体"）。

栈在客户端现拼（`src/client.js:114-120`）：

```js
function fontFamilyStack(v) {
  const key = typeof v === 'string' ? v.trim() : '';
  if (!key || key === 'inherit') return 'inherit';
  const base = FONT_FAMILY_STACKS[key] || (isSystemFontKey(key) ? systemFontStack(key) : (FONT_FAMILY_BY_STACK[key] || ''));
  if (!base || base === 'inherit') return 'inherit';
  return base + FONT_STACK_TAIL;   // ', var(--we-host-font-family, <fallback>)'
}
```

`--we-host-font-family` 是宿主原字族的**运行时快照**（`src/font/apply.js:179-200`，在写任何字族之前取）⇒ DSH 调整字族链时本插件不会漏改。

### 9.4 一个自己写明的"诱饵"：粒度令牌是死路

`src/font/typography.js:6-9` 逐字：

```
组件 module.css 的 font: 全是简写（font: var(--dsw-font-<角色>) 共 **21 处**）；细粒度里**只有** -font-family 有 1 处
消费者（user-text.module.css），-font-size / -font-weight / -font-style **零消费者**
⇒ 只改 --dsw-font-<角色>-font-size **必然无效**（那条路是诱饵）。
```

⇒ 真正生效的是 **shorthand 令牌**（`--dsw-font-<role>`），粒度令牌是配套。

而且 shorthand 是**字面量、不由细粒度令牌组合** ⇒ 本模块**照抄 DSH 的角色表达式**。`:40-42` 的不变量：四个令牌必须**全部存在**才接管该角色，否则整条字体失效。

**12 个排版角色**（`:72-87`）：`markdown-h1/h2/h3/h4`、`markdown-base`、`markdown-small`、`markdown-code`、`markdown-code-block`、`markdown-table`、`markdown-table-head`、`xs-13`、`xxs-12`。

**行高不在这张表里**（`:69-70` 逐字）：「一律沿用 DSH 令牌 `--dsw-font-<角色>-line-height`」。

### 9.5 组件钩子通道：作用域 = 钩子的定义点

`COMPONENT_FONT_TARGETS`（`src/font/components.js:60-82`）：

```js
const COMPONENT_FONT_TARGETS = [
  { id: 'markdown', ... prefix: 'markdown',
    source: '@deepseek-ai/dsh-client-ui-primitives/lib/markdown/MarkdownText.module.css',
    route: 'tokens' },
  { id: 'codeBlock', ... prefix: 'block',
    source: '@deepseek-ai/dsh-client-ui-primitives/lib/markdown/CodeBlock.module.css',
    route: 'hooks', dslHooks: ['--dsl-code-block-content-font', '--dsl-code-block-banner-font'] },
  { id: 'terminal', ... prefix: 'block',
    source: '@deepseek-ai/dsh-client-ui-primitives/lib/TerminalBlock.module.css',
    route: 'hooks', dslHooks: ['--dsl-terminal-font'] },
```

作用域解析（`:146-158`）：

```js
function componentScopeSelector(id, hookScopes) {
  const t = targetById(id);
  if (!t) return null;
  if (t.dslHooks) {
    const scopes = hookScopes && typeof hookScopes === 'object' ? hookScopes : null;
    for (const hook of t.dslHooks) {
      if (scopes && scopes[hook] && HOOK_SCOPE_RE.test(scopes[hook])) return scopes[hook];
    }
    return null; // hooks 组件没有可用的定义点 ⇒ 没有精确作用域（宁可空，也不退回泛命中）
  }
  if (!PREFIX_RE.test(t.prefix)) return null;
  return 'body [class*="_' + t.prefix + '_"]';
}
```

`HOOK_SCOPE_RE = /^\.[A-Za-z0-9_-]+$/`（`:90`）—— 作用域只许单类选择器；定义点由 `scanHookScopes(doc, hooks)`（`:113-139`）扫样式表得到，**扫不到就整条不生成**（降级不误伤）。

模块名通道（`:201-230`）只允许三个属性（`:50` `['font-size','font-weight','font-family']`），且 `if (!decls.length) continue; // 全空 ⇒ 回官方，不生成`。

### 9.6 终端特例：一份字体键要投两个终端

`src/font/apply.js:145-155`：

```js
const stack = selection && selection.fontCustom === true && key ? fontFamilyStackConcrete(key) : '';
if (stack && stack !== 'inherit') document.body.style.setProperty("--dsh-ssh-terminal-font", stack);
```

`fontFamilyStackConcrete`（`src/client.js:137-145`）把 `var(--we-host-font-family, …)` **摊平**成具体字体列表，因为 xterm 只吃字符串、不认 `var()`。

理由与"时机是承重的"写在 `docs/adr/0009-system-fonts-from-the-os.md:84-95`：

> - **DSH 对话里的终端块**：官方 `--dsl-terminal-font` 钩子（值可以是 `var()` 链）。
> - **侧栏 / SSH 的终端面板**（`@linxin666/dsh-ssh` 的 **xterm**）：xterm 的字体只从构造参数/选项来，**普通 CSS 规则改不动它**。
>   ⚠️ 这一份必须是**摊平的具体字体列表**（不能含 `var()`）—— 它会被当字符串交给 `fontFamily`。
>   ⚠️ 而且**时机是承重的**：那个插件只在**构造终端的那一刻**读它

### 9.7 排版层与颜色层必须用不同的 source

```js
// src/font/typography.js:48
const THEME_TYPE_SOURCE = 'wallpaper-engine-typography';
// src/font/color-roles.js:28
const THEME_LAYER_SOURCE = 'wallpaper-engine';
```

`src/font/color-roles.js:146-204` 逐字：

```
// 再注册即替换：旧 disposer 已失效，直接丢弃引用（调用它反而是 no-op 语义陷阱）
dispose = theme.overrideTokens(source, payload);
// 宿主基线必须在**任何**令牌写入之前取（否则退出契约快照到我们自己的颜色）
```

⇒ 同 source 再注册 = **整层替换**，所以排版层与颜色层必须用不同 source，否则排版层会顶掉颜色层。空载荷 ⇒ 撤层（`:170-178` `return { ok:false, reason:'empty' }`）。

### 9.8 字体集：两层存储 + 活动 id

| 层 | 目录 | 性质 |
|---|---|---|
| 随包层 | `lib/fontsets/<id>.json` | **只读**，供"开箱就有几个能用的预设"与分享 |
| 用户层 | `<pluginDataDir>/fontsets/<id>.json` | 导入、覆盖、一次性迁移的产物 |

文件名只由 `join(dir, id + '.json')` 拼（`lib/routes/fontsets.js:76-77`），id 走白名单 `isFontSetId`（`lib/settings-schema.js:1722-1726`，`/^[A-Za-z0-9_-]{1,64}$/`，保留 `import`/`export` 两段）。

随包只带一份预设 `lib/fontsets/compact.json`（全文 22 行）。

**路由是前缀路由**（`lib/routes/fontsets.js:245-247` `kind:'prefix'`），由此得到：

- `GET <BASE>/fontsets`（列表 + 当前活动 id + 迁移状态）
- `GET/PUT/DELETE <BASE>/fontsets/<id>`
- `POST <BASE>/fontsets/import`（`$schema` 不符即 400）
- `POST <BASE>/fontsets/<id>/activate`

**权威校验在宿主**（`:288-290` `body.$schema !== FONTSET_SCHEMA_TAG` ⇒ 400），客户端只做预检。

**客户端通道**（`src/fontset-store.js`）：缓存键 `FONTSET_CACHE_KEY = "we-fontset-active"`（localStorage）；落盘 `PUT /fontsets/<活动 id>` 带 `keepalive:true`；`fontSetDirty = !res.ok` 记录"还没被宿主确认"；防抖 200ms；改值唯一入口 `setFontValues(patch)`。

**回滚防线**（`:243-311`、`:277-297`）：宿主值 ≠ 本地缓存值且缓存带 dirty ⇒ 采纳缓存并立即补推（"本窗口最后所见者胜"）。

**预设字体走独立落位槽** `PRESET_FONTSET_ID = "preset-font"`（`:194`），绝不写用户活动集。

`src/fontset-editor.js` 是**纯渲染 + 意图回调**（无网络调用）："使用中"= 值仍一致；被改过显示「（已改）」；发布物（`origin === 'builtin'`）与活动集不出删除按钮；被改过的那份，删除语义是"恢复原样"，删除走**两下确认**而不用原生模态。

### 9.9 本机字体清单：宿主问操作系统

**ADR-0009 D1**：清单由宿主枚举并缓存，浏览器侧只是读者。

**D1′：名字要两种写法都给**（macOS 上因此有第二条权威腿）—— `system_profiler` 报的是**本地化**族名（中文系统上 `PingFang SC` 报成 `苹方-简`）⇒ macOS 上并行跑两条权威腿（`system_profiler` 出本地化名 + CoreText 出规范名），族名**取并集**。两条腿并行 ⇒ 慢的那条决定耗时。

**D2**：族名一律当"值"传，不当"栈"传；存族键 `sys:<族名>`，CSS 栈在解析侧现拼。

**D3/D4**：权威做不到时按文件名推并标 `approximate`；扫描只在第一次真用到时发生、双层缓存、过期先回旧值。

三平台权威来源（`lib/routes/system-fonts.js:112-135`）：

| 平台 | 命令 | 口径 |
|---|---|---|
| Windows | `powershell.exe -NoProfile -NonInteractive -Command 'Add-Type -AssemblyName System.Drawing; (New-Object System.Drawing.Text.InstalledFontCollection).Families \| ForEach-Object { $_.Name }'` | .NET `InstalledFontCollection`，一行一族名 |
| macOS | `/usr/sbin/system_profiler SPFontsDataType -json -detailLevel mini` **+** `osascript -l JavaScript`（CoreText） | 本地名 ∪ 规范名 |
| Linux/BSD | `fc-list --format=%{family}\n` | fontconfig 口径，一行可含逗号分隔的多个别名 |

macOS CoreText 脚本（`:101-109` 逐字）：

```js
const CORETEXT_LIST_ARGS = [
  '-l', 'JavaScript', '-e',
  'ObjC.import("CoreText");'
  + 'const arr=$.CTFontManagerCopyAvailableFontFamilyNames();'
  + 'const n=$.CFArrayGetCount(arr);'
  + 'const out=[];'
  + 'for(let i=0;i<n;i++)out.push(ObjC.unwrap(ObjC.castRefToObject($.CFArrayGetValueAtIndex(arr,i))));'
  + 'out.join("\\n");',
];
```

**降级路径**：Windows 注册表（`reg.exe query HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts`，`:141-151`，标 `approximate`，值名是"字体名"不是族名，可能带 Bold/Italic）→ 扫字体目录按文件名推（`:236-251`，同样标 `approximate`）。

**仓库里没有原生桥接**：全文只 import 了 `node:child_process` 的 `spawn`，没有 `.node` / addon / FFI。三个平台的清单全部来自 `spawn` 外部进程。

**三级降级收口**（`:370-408`）：权威（`approximate:false`）→ 非权威（`approximate:true`）→ 文件名（`approximate:true`）。清单清洗（`:278-293`）：去空白 → 丢 `.` 开头私有族 → 丢过不了 `systemFontKeyOf` 的 → 小写去重 → ≤2000 → `localeCompare` 排序。

**子进程三条硬约束**（`:296-340`）：

1. 超时即 kill，且**先判 pid**（`:321-326`）—— 注释理由是"cmd 不存在时 spawn 失败 ⇒ `pid === undefined`，此时 `kill()` 会同步挂死事件循环"。
2. **按字节收、最后一次性解码**（`:337`）—— 注释记实测（`:307-310`）：「逐块 `chunk.toString('utf8')` 再拼，会在一个多字节字符跨块时插进 U+FFFD —— 实测 `系统字体` 变成 `系统\uFFFD\uFFFD\uFFFD体`」。
3. 输出上限 16MB，超限判失败（不喂半份 JSON 给解析器）。

**缓存与路由语义**（`:410-494`）：内存 + 落盘双层，TTL **一周**（`SYSTEM_FONTS_TTL_MS = 7*24*60*60*1000`），另有**口径版本号** `SYSTEM_FONTS_CACHE_VERSION = 2`（"改动枚举口径时必须 +1"）；并发请求合并成一次扫描（`inflight`）；`?refresh=1` 强制重扫；新鲜直接回；**过期但有旧值 ⇒ 先回旧值并标 `stale:true`，后台重扫**。

**永不 5xx**（`:484-492`）：`ok: got.fonts.length > 0` + `error: got.fonts ? undefined : (got.error || 'no-fonts')`，对应文件头不变量（`:35`）：「**绝不把失败甩成 5xx**：任何失败都回 200 + `ok:false` + 原因」。

**客户端侧**（`src/system-fonts.js`）：缓存键 `"we-system-fonts"`，客户端 TTL 10 分钟；失败**不清空**已有清单（`:92` 注释：「失败**不清空**已有清单（"上次拿到的那份"比空下拉有用）」）。

**浏览器侧的额外一筛**（只能在客户端做）：`probeUsableFamilies(doc, list)`（`:149-191`）用 `"<name>", monospace` 与 `"<name>", serif` 量**同一段拉丁文字** `FONT_PROBE_TEXT = 'Hamburgefonstiv 0123456789'`，宽度相同才算浏览器能匹配；**量不到就原样返回**（刻意退化，不因"测不出来"丢掉用户的字体名）。

### 9.10 caret（光标）：任务前提需要更正

**`src/system-fonts.js`（209 行）里没有任何 caret 相关代码**，grep 零命中。光标颜色落在 `src/effects.js`。

`src/effects.js:52-60` 注释逐字：

```
// ── 输入光标颜色注入（#83）──
// <style id="we-caret-patch"> 把 body 上的 --we-caret-color 应用到所有文本
// 输入位（textarea / input / contenteditable）。caret-color 可继承，覆盖到
// contenteditable 的子节点无需逐个枚举；!important 压过宿主可能存在的显式
// caret-color 声明。只在用户选了颜色时注入 —— 未设置时连规则都不进 DOM，
// 光标保持 dsh 原生表现（auto 会随主题自动调整，是最不碍事的默认）。
```

注入的规则（`:61-79`）：

```
body textarea,
body input,
body [contenteditable="true"],
body [contenteditable="plaintext-only"],
body [contenteditable=""] {
  caret-color: var(--we-caret-color) !important;
}
```

数据流：`selection.caretColor`（`kind:'hex'`，默认 `""`）→ body 上的 `--we-caret-color` → 注入的 `<style>`。

**已知副作用**（`docs/CHANGELOG.md:49`）：宿主那条 `caret-color: var(--dsw-alias-state-business-primary)` 与页签**共用令牌** ⇒ 把「全局配色/页签」选得偏暗会连带压暗光标。

另有一处同名噪音：`.we-picker__section-caret` 是**折叠三角**的类名，与输入光标无关。

### 9.11 i18n：键 = 中文原文

**不是语义键**。`src/i18n.js` 文件头说明：键直接用**中文原文**（msgid），`src/i18n-copy*.js` 里存"中文 → 英文"表；理由是"700+ 条文案散布在 24 个模块"，用原文当键**不可能指错**，缺译的表现是**中文原样露出**。

**组装点**（`src/i18n-copy.js:26-34`）：

```js
const WE_I18N_EN = {
  ...WE_I18N_EN_CORE, ...WE_I18N_EN_FONT, ...WE_I18N_EN_LIVE,
  ...WE_I18N_EN_PANEL, ...WE_I18N_EN_PICKER, ...WE_I18N_EN_EXT, ...WE_I18N_EN_GLASS,
};
```

7 个域模块（字节）：`core` 7.6KB、`ext` 22.9KB、`font` 4.9KB、`glass` 24.9KB、`live` 2.7KB、`panel` 36.6KB、`picker` 8.3KB；加组装点 `src/i18n-copy.js` 6.9KB ⇒ **合计约 112KB**。另有第二张表 `WE_I18N_HOST_EN`（`:39-71`，宿主侧文案）。

域模块是**纯数据**，头注释逐字：「只读不写：纯数据，不得有可执行语句」（内联进同一工厂作用域，顶层读会撞 TDZ）。

**语言判定三级**（`src/i18n.js:94-99` 逐字）：

```js
const override = weLangOverride();
if (override !== null) return override;
if (weLocaleService !== null) return weLocaleActive;
return WE_I18N_DEFAULT_LOCALE;
```

① `?we-lang=<id>` 覆盖（只收 BCP 47 短 id `/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/`）→ ② 宿主**官方 locale 服务**（`ctx.get('locale')` / `service.getSnapshot().active`）→ ③ 都没有 ⇒ **`"zh"`**。

**不读 `navigator.language`**（`src/i18n.js` 全文无 `navigator`）。⇒ 英文界面必须由宿主 locale 服务或 `?we-lang=en` 触发。

**查表顺序**：`WE_I18N_EN[full] → WE_I18N_HOST_EN[full] → WE_I18N_EN[source] → WE_I18N_HOST_EN[source] → 原文`。

**歧义消解**：同一个中文原文在不同上下文可能对应不同英文 ⇒ `WE_I18N_CTX_SEP = "\u0000"` 拼成 `context + NUL + 原文` 作全键。插值只认 `{name}` 占位符。

**与宿主 locale 服务对接**（`:208-257`）：250ms 短轮询找 `ctx.get('locale')`；注册两张词表（zh 字典是**身份表**——键映射回原文）；订阅 revision 做重渲染；卸载时退订 + 注销词表 + 退回默认语言并广播。组件侧用 `useWeLocale()`（`:267-278`）：优先 `useSyncExternalStore`，退回 `useState + useEffect`。

### 9.12 三道闸保证"不漏译"

**① `test/tools/i18n-scan.mjs`（扫描器，393 行）**——**自建词法扫描器**：

- CJK 判定（`:42`）：`/[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]/`
- 逐字符维护括号栈，对字符串/模板字面量出命中；每条命中带 `{index,line,column,value,kind,hasInterp,concatAdjacent,frames,innermost,wrapped,diagnostic,quote}`
- **"已翻译"判据**（`:92`）：最内层调用帧在 `translateCallees`（默认 `['weT']`）里，**且**不是带 `${}` 的模板
- **"这是日志不是文案"判据**（`:93`）：`DIAGNOSTIC_CALLEES` 含 `liveLog`/`weLog`/`log`/`warn`/`error`/`debug`/`info`/`trace`/`console`/`weDiag`/`diag`/`reportDiag`/`reportClientDiag`/`Error`
- CLI 默认扫 `src/`；`selftest` 子命令含 **17 条正负用例** ⇒ **扫描器自己也带自测**

**② `test/verify-i18n.mjs`（守卫，625 行，六组判据）**：

1. **界面零裸中文**：登记 8 个 `src/styles-*.js` 纯数据块（`DATA_BLOCKS`），只放行三条精确值豁免
2. **词表双向对账**：零漏译 + 零孤儿键；**跨域重复键也判红**；组装点不许藏字面量键；展开顺序必须 == 族顺序
3. **值纪律**：非空、值里不得出现中文、`{}` 占位符集合必须与键相等
4. **宿主表对账**：`WE_I18N_HOST_EN` 的键必须能在 `lib/**` 找到同一条字面量
5. **运行期行为**：vm 沙箱**真跑**词表族 + `src/i18n.js`——zh 出原文、`?we-lang=en` 走词表、未知键原样返回、插值、接入 locale 服务后跟随切换、卸载退回默认
6. **跟随契约**：`const inject = ["slots"]` 不 park、`ctx.get("locale")` 存在、五个顶层组件都用 `useWeLocale()`、nav 用 `weT("壁纸引擎")` 而非冻结常量

**③ `test/verify-component-fonts.mjs`（组件字体守卫，422 行）**——八组判据：选择器形态唯一模板（`:61` `/^body \[class\*="_[A-Za-z][A-Za-z0-9]*_"\] \{$/`）、白名单前缀 + 只写三个属性、启动自探测降级、空配置不生成规则、源码不变量（零 `!important`、零 `:has()`、不写哈希类名、不碰 katex/`@font-face`）、每个组件必须登记 `.module.css` 出处、三个 `--dsl-*` 钩子及其定义点作用域、设置键与模块一致（`COMPONENT_FONT_TARGETS.map(t=>t.id)` 必须 == `schema.COMPONENT_FONT_KEYS`）、落地点已抽成 `src/font/apply.js`，并有覆盖面地板 `EXECUTED_FLOOR = 75`。

### 9.13 design token 契约（`docs/TOKEN-CONTRACT.md`）

**契约口径**：只计样式族 8 个域模板里**属性位**的 `--dsw-*` 声明（`var(--dsw-…)` 是读不是写）。门控三类：链上有 `[data-we-glass-*]` = 玻璃桶；只有 `[data-we-wallpaper]` = 壁纸桶；两者都不挂 = 无门控。

`docs/TOKEN-CONTRACT.md:12-13` 逐字：

```
共 **173** 条声明 / **59** 个不同令牌。门控归属：
玻璃 **142** 条 · 壁纸 **12** 条 · 无门控 **19** 条。
```

无门控白名单**只有两处**：`body[data-we-thinking-native] …`（思考块自带开关）与 `.we-layer`（插件自有元素）。

**守卫 `test/verify-token-contract.mjs`（277 行）六组判据**：

```
① docs/TOKEN-CONTRACT.md 与现算契约**逐字节一致**（增删令牌忘了重算 ⇒ 红）；
② 覆盖面地板（声明 >100、令牌 >30 —— 解析器静默返回空表时 ① 变成空对空）；
③ **无门控白名单封闭** … 新增任何一条无门控改写 ⇒ 红
④ --dsw-alias-bg-base 必须**全部**挂壁纸门控 …
⑤ 解析口径的负对照（注释掩蔽 / var() 读不计 / 跨行声明 / 归桶正确性）——
   每条判据都配一个"能失败"的探针，防止判据本身空转。
⑥ **门控计数自洽**：产物里每个 `标签(N)` 的 N 必须 > 0、N 之和 = 该令牌条数、组数 = 归并出的桶数。
```

⚠️ **一个被审计逮到的历史 bug**（`docs/wip/ISSUE-AUDIT-148PLUS.md:738`）：`const cnt = (set, b) => [...set].filter((x) => x === b).length;` 曾把**声明对象**和**桶名字符串**比 ⇒ 每格恒 0，而"逐字节比对"把这个 0 **永久冻绿**。

⇒ **字节级契约保证"不漂移"，但不保证"不荒谬"**，需要额外的自洽判据兜。这条教训很值得记住。

另有一张**独立锚点表**（`:91-131`，6 条），注释逐字：「⚠️ 这张表是**人工独立来源**的 oracle，不是跑工具抄结果（抄结果 = 退回 A1）」。

### 9.14 颜色角色模型与 `theme-follow` 的分工

**开放的 5 个颜色角色**（对应 6 个令牌），`src/font/color-roles.js:31-40` 逐字：

```js
 * 开放的 5 个角色（对应 6 个令牌）。label-error **不开放**（错误色有语义）。
  { id: 'primary',   get label() { return weT('正文'); }, tokens: ['--dsw-alias-label-primary'] },
  { id: 'secondary', ... ['--dsw-alias-label-secondary'] },
  { id: 'tertiary',  ... ['--dsw-alias-label-tertiary'] },
  { id: 'caption',   ... ['--dsw-alias-label-caption'] },
  { id: 'dimmed',    ... ['--dsw-alias-label-dimmed', '--dsw-alias-label-primary-dimmed'] },
```

（`dimmed` 一个角色对应两个令牌；`label-error` **不开放**——错误色有语义。）

- 值域 `isThemeHex`（`:42-46`）只接受 `#rrggbb`
- **令牌清单的权威来源是样式表**（`scanThemeTokens`，`:62-84`）—— 注释逐字：「权威来源是样式表：`getTheme().active.tokens` 为空、`exportInspectTokens()` 只有 14 条（F0 实测），都不能当清单。」⇒ 宿主新加的 `--dsw-*` 只有被样式表用到了才会进清单
- **light/dark 必须成对**（`:92-108`）：「两套必须都有：缺一在另一套配色下会不可读」
- 服务竞态：`pollThemeService`（`:116-140`）以 250ms 间隔、6000ms 超时等 `theme` 服务（注释记竞态实测：启动后 7ms 时 `get` 为 null、325ms 才有）

**与 `theme-follow` 的分工**（`src/font/color-roles.js:129-130` 逐字）：

> 与 theme-follow 的分工不变（沿用 #159① 的边界）：theme-follow 决定**用哪一套主题**（写 theme 服务），这里只负责**主题已经变了之后跟上**，不回写主题、也不审批主题。

| | `src/theme-follow.js` | `src/font/color-roles.js` |
|---|---|---|
| 决定什么 | 宿主**明/暗**（`setTheme('dark'\|'light')`） | 这一套明暗下的**文字色** |
| 写到哪 | 宿主 `theme` 服务 | 同一服务的令牌层（source = `wallpaper-engine`） |
| 触发源 | 壁纸 `project.json` 的 `schemecolor.value`（恰好 `0 0 0` 视作没填）→ 画面占比最大色（64×64 缩放 + 4bit/通道量化取众数桶；两条腿 = 作者 preview 图 + 真实渲染帧，不一致时**取深色**）→ 什么都不做 | 用户在面板里选的颜色角色 |
| 开关 | `themeFollow`（默认关） | `themeColors` 非空 |
| 降级 | 服务缺席 ⇒ 什么都不做（**不声明 `inject: ["theme"]`**，否则缺服务会 park） | 令牌不存在 ⇒ 跳过该角色 |

`src/theme-follow.js:54`/`:56`：`THEME_FOLLOW_LIGHT_ABOVE = 0.40`、`THEME_FOLLOW_SAMPLE_PX = 64`。

**耦合点**：`color-roles` 写的每个令牌值都是 `{light, dark}` **两套**，由宿主 `theme` 服务按当前明暗挑一套 ⇒ **theme-follow 改明暗 ⇒ 角色色自动切到另一套**。二者不是"各写各的"，而是"一个决定用哪套、一个决定每套里是什么色"。

### 9.15 字体与 i18n 维度的优点

1. **"值只存键、栈在解析侧现拼"** ⇒ DSH 调整字族链时本插件不会漏改。
2. **降级链的每一级都诚实标注**（权威 → 注册表 approximate → 文件名 approximate），面板据此显示"按文件名推测"；「宁可说清是推测，也不让一个猜出来的名字看着像真的」。
3. **子进程三条硬约束齐全**（超时即 kill 且先判 pid、输出上限、按字节收最后一次性解码——逐块 toString 的 U+FFFD 污染是实测踩过的坑）。
4. **失败语义统一为"回 200 + ok:false + 原因"** ⇒ 前端能说人话，而不是让用户对着 404 发呆。
5. **作用域宁缺毋滥**：hooks 通道找不到定义点就返回 `null`，不退回泛命中。
6. **"样式表是权威来源"这一口径被贯彻到两处**（取令牌清单、取钩子作用域）——两处都实测过 `getTheme().active.tokens` / `exportInspectTokens()` 不可用。
7. **字体值与 settings 物理分家** ⇒ 一个字体集就是一个可导出/可分享的 `.json`。
8. **i18n 的守卫自带反例**：扫描器 17 条 selftest、契约守卫 6 条人工独立锚点 ⇒ 避免"判据自己证明自己"。
9. **同一套 kind 消毒器同时服务 settings 与 fontset**。

### 9.16 字体与 i18n 维度的缺点与风险

1. **字体粒度令牌基本是死路** ⇒ 外部工具（或未来的面板）若只写 `--dsw-font-<role>-font-size` 会**完全无效**。同理 39 个组件 CSS 里 `font-weight` 写死 **71 处** ⇒ 组件级字重只能靠"直接命中"通道逐组件写。
2. **"设过字号就不再跟随 DSH 缩放"是已知副作用**（`:166-167` 逐字：「设过的角色不再随 DSH「通用 → 字号」缩放；未设的照旧跟随」）⇒ 同一屏内"有的角色跟宿主缩放、有的不跟"。
3. **本机字体枚举依赖外部程序** ⇒ 工具被裁或被安全软件拦 ⇒ 直接落到 approximate 路径。macOS 冷扫描实测秒级到十秒级。
4. **同一字体在清单里可能有两条**（`PingFang SC` 与 `苹方-简` 各占一行）——刻意为之（原生 `<select>` 首字母跳转按选项文本匹配），但对用户是"重复项"。
5. **清单里可能有浏览器根本用不了的族名** ⇒ 修法是**在客户端量文字宽度**——这条路是启发式（monospace vs serif 对比），量不到时**刻意退化**为不过滤。
6. **终端字体那条投递路径无守卫可兜**（ADR `:97-99`）：「它没有守卫能兜（判据只能断言"我们写了这条规则"，断言不了"那个插件还在读它"）：`dsh-ssh` 改钩子名 / 改读取位置，这条会**静默失效**」。
7. **光标颜色与页签共用宿主令牌** ⇒ 选得偏暗会连带压暗光标。
8. **默认语言恒为 zh，且不看 `navigator.language`** ⇒ 宿主不提供 locale 服务时 `weT` 走本地等价实现，而本地实现只有在当前语言被判定为英文时才查英文表 ⇒ **英文界面拿不到**。
9. **i18n 键是中文原文 ⇒ 改文案等于改键** ⇒ 任何一次中文文案微调都会让旧词条变孤儿键，守卫立刻报红 ⇒ 文案不能随手改。
10. **token 契约的"字节级"性质会冻结错误的数字**（见 9.13）。
11. **样式表与令牌层争夺同一批 `--dsw-alias-label-*`**（`src/styles-base.js:461-466` vs `src/font/color-roles.js:34-40`）⇒ 优先级取决于宿主 `overrideTokens` 的落点（**未能确认**）。
12. **`src/fontset-store.js` 的"最后所见者胜"回滚** ⇒ 多窗口同时改同一个字体集时，另一个窗口的修改可能被覆盖。

### 9.17 该维度未解清单

1. 宿主 `theme.overrideTokens(source, payload)` 的确切落点未确认（本仓无宿主源码）。
2. `--dsw-font-<role>-line-height` 的来源未确认（插件只读不写）。
3. 面板上"行高/字距"确实不存在（schema 无对应键，`src/` 里 `letter-spacing` 只出现 1 次且与字体设置无关）；但宿主 UI 自身是否有行高设置未查。
4. **i18n 英文覆盖率未量化**（只读了守卫的判据结构，没有逐条统计覆盖率数字；守卫本身会在 `npm test` 时给出结论）。
5. `docs/FONT-SYSTEM.md` 表格第 ② 行（官方组件钩子）本轮未逐字取到，以 `src/font/components.js:60-82` 的 `route:'hooks'` / `dslHooks` 为准。
6. `test/verify-i18n.mjs` 与 `test/verify-component-fonts.mjs` 的具体行号本轮未逐行记录。

---

## 10. 构建与验证体系

### 10.0 一句话

**构建不是打包器，是一只"手写的、零依赖的、确定性的内联器"；验证不是测试框架，是 57 步硬 + 6 步软 + 6 步冒烟的守卫链，而且 CI 故意不装依赖。** 两者共同的取向是：**把"会漂的东西"变成"会红的东西"，并且尽量不依赖外部世界。**

### 10.1 构建：`scripts/build-client.mjs` 是一台手写内联机

它的头注释自称（逐字）："a deterministic, dependency-free stand-in for `tsdown bundle`"——即**确定性、零依赖的 tsdown 替代品**。产物形态是硬编码的：

```
window.__ModuleLoader__.load({
  id: "<package-name>",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    <inlined modules, in INLINE_MODULES order>
    <src/client.js body, indent-normalized>
    return module.exports;
  }
});
```

**为什么必须内联**（注释逐字）："the browser half cannot `import` a sibling local file — the bundle has no local-module resolver (only the loader's `require` for external packages). So any code split out of `src/client.js` for readability (see INLINE_MODULES) is inlined here as a **prelude** in the same factory scope. The extracted files stay the single source; `src/client.js` just uses their names."

**为什么敢拆**（注释逐字）："Shape mismatches are a **hard build failure**, never a silent empty prelude — that is what keeps the split honest."——**形状不匹配必须硬失败，绝不允许静默产出空 prelude**，这是让"拆分"保持诚实的关键约束。

`INLINE_MODULES`（`scripts/build-client.mjs:46`）是一张带 `why` 说明的表，每个模块还带 `markers`：**"结构变了就报错"的锚点**——缺任何一个都构建失败。

### 10.2 三道构建期守卫

| 守卫 | 位置 | 断言内容 |
|---|---|---|
| **marker 锚点** | `:46-51` | 每个内联模块的 `markers`（如 `src/about-assets.js` 的 4 个常量字面量）必须逐字命中，缺一个即构建失败 |
| **`injectRopeArt()`** | `:691-745` | 占位符形态、声明名与占位符名一致、锚点**恰好命中一次**、PNG magic `89504e470d0a1a0a`、声明条数与占位符条数相等、注入后**无残留占位符** |
| **`assertNoShadowedScopeDecls()`** | `:765-787` | 同一作用域内**不得有两个同名顶层声明** |

第三条值得逐字看它的错误文案（`:781-783`）：

> "平铺后同一作用域里有同名顶层声明（后声明静默胜出 ⇒ 前者是死代码；反过来删掉后者会让前者无声复活，行为改变而语法层无感）"

实现方式是扫 `DECL_RE`（`:539`）匹配 `const|let|var|function|class` 声明，并**只取最小缩进层级**（顶层）来判定。**这条守卫是为一个真实缺陷写的**：`src/client.js` 里 `onStartEditCacheDir` 被声明两次，脚本语义下后者静默胜出 ⇒ 前者是死代码；删掉后者会让前者**静默复活**，而当时守卫链全绿。

**这正是"70+ 模块平铺进一个作用域"的真实代价**，也是 `docs/CODE-STRUCTURE.md:238` 把这条守卫说反（说成"vm.Script 语法检查兜住"）的地方——`vm.Script` 只报语法错，重名声明在脚本语义下根本不报错。

还有一处细节值得单独说：`stripHeader()`（`:792` 起）不只剥掉源文件开头"这不是产物 / 去改 src"的横幅，它还**返回 `codeStart`**，让所有报错判据都能指回**原文件**的行号。注释逐字："报'正文第 3 行'对读日志的人毫无用处。"

### 10.3 实测产物（Windows / Node v24.19.0，`node scripts/build-client.mjs`）

**构建脚本零运行时依赖，没有 `node_modules` 也能构建成功。**

| 项 | 实测值 |
|---|---|
| 产物 | `lib/client.js` = **4,542,261 B（4.54 MB）**，32,071 行 |
| prelude（73 个源模块平铺进同一 factory 作用域） | **1,834,433 B** |
| 正文（`src/client.js`） | **2,707,828 B** |
| 10 条 `ROPE_IMG_*` base64 PNG 行 | **2,370,175 B = 52.2%**（源 `assets/rope/*.png` 10 张合计 1,777,245 B） |
| gzip（Optimal） | **2,517,081 B（55.4%）** |
| brotli | ≈ 2,285,259 B |

PNG 已是压缩格式，gzip 几乎压不动——**这就是产物体积的主要来源，也是它降不下去的原因**（第 13 章 §13.3.2）。

### 10.4 产物与源码的边界（ADR-0012）

- `git ls-files lib/client.js` = **空** ⇒ 产物不入库（ADR-0012 兑现）。
- 三条构建路径各自构建：开发者手跑 `npm run build` / CI 的 `verify-client-sync` / `npm pack` 的 `prepack`。
- 守卫 `test/verify-client-sync.mjs` 是 verify 链的**第一步** ⇒ **产物永远等于源码**。
- 代价：commit SHA 全变、clone 变慢、`github:` 直装不支持。

### 10.5 `prepack` 而不是 `prepare`（issue #141）—— 一个非常具体的工程决策

`scripts/prepare.mjs` 的头注释把这个坑写得一字不漏（逐字）：

> 挂 `prepack` 而不是 `prepare` 是 issue #141 的直接修法：`prepare` 会在**安装期**跑（git 直装 / 解包当根项目 `pnpm install`），而 pnpm 11 对 git 依赖的构建脚本有 allowBuilds 安全闸 —— 插件市场默认走 `git+https://…` 直装，于是每个用户都被 `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED` 拒装。改成 `prepack` 后：发布仍是"先构建再打包"，而**安装期一个脚本都不跑** —— 装出来的包直接用随包发布的 `lib/client.js`（它由 CI 的 build 幂等与 client-sync 守卫看着，见 `test/verify-package-publish.mjs` ⑦）。

它自己判定"有没有源"：

```js
const hasSource = existsSync(resolve(root, 'src', 'client.js')) &&
  existsSync(resolve(root, 'scripts', 'build-client.mjs'));
// 有 → spawn build-client.mjs；无 → console.error('prepare: no client source present (published package) — skipped build')
```

这与 `files` 白名单**不包含 `src/`** 是一套设计：发布包里没有源码，只有现成的 `lib/client.js`。

### 10.6 npm 包实测（`npm pack --dry-run --json`）

- `dsh-plugin-wallpaper-engine@1.3.3`，**81 个文件 / 6,279,749 B（5.99 MB）unpacked**。
- 包内最大文件：`lib/client.js` **4,542,261（占包 72.3%）** · `icon.png` 185,266 · `lib/glass-presets/factory-author.json` 156,003 · `lib/settings-schema.js` 130,205 · `lib/about/qq-group.png` 99,790 · `lib/about/update-notice.jpg` 89,198 · `lib/about/douyin-group.png` 83,520 · `lib/index.js` 81,597 · `lib/glass-presets/purple-mood.json` 66,503。
- `assets/rope/`、`assets/mascot/`（合计 **5.27 MB** PNG）**不在包里** ⇒ 立绘只在**构建期**注入进 JS，不作为独立资源分发。
- `files` 白名单 **42 条**；`exports` 暴露 `.` / `./client` / `./cordis.patch.yml` / `./package.json`；`main` = `lib/index.js`。
- 运行时依赖只有两个：`webwallgl@^3.0.0`、`x11@^4.3.1`；`overrides` 钉 `js-yaml 4.3.2`；devDeps 只有 eslint / typescript / @types/node；React 走 peerDep ⇒ **零运行时框架依赖**。

### 10.7 守卫链：三档

`test/run-guards.mjs` 是唯一的守卫入口（实测计数）：

| 档位 | 命令 | 步数 | 内容 |
|---|---|---|---|
| 硬档 | `npm run verify` | **57 步** | `test/verify-*.mjs` 全家：`verify-client-sync`（第一位）→ `verify-client` → `verify-scene-live`（6,854 行）→ `verify-glass-surfaces` → `verify-presets` → `verify-token-contract` → `verify-route-index` → `verify-system-fonts` → `verify-i18n` → … |
| 软档 | `npm run verify:docs` | **6 步** | `verify-module-layout` / `verify-reachability` / `verify-retired-lines` / `verify-dead-declarations` / `verify-guard-map` / `verify-guard-chain` |
| 冒烟 | `npm run smoke` | **6 步** | `rotation-smoke` / `rotation-live-smoke` / `rotation-prepared-leak-smoke` / `live-frame-backfill-smoke` / `live-frame-async-identity-smoke` / `fontset-load-smoke` |
| 组合 | `npm run verify:all` | — | build → verify → verify:docs → smoke |

**软档那 6 步恰好就是"死代码与可达性"这一组** ⇒ 死声明 / 不可达 / 退役行这三类检查**永远不会让流水线变红**（第 13 章 §13.5 要点的缺点）。

为什么把三档收进一个 runner 而不是留在 `package.json` 的 `&&` 链里（`test/run-guards.mjs:7`、`:91` 注释逐字）："`verify` 与 `smoke` 里有依赖前一步副作用的守卫（如 `verify-client-sync` 重建产物后……）"——**守卫之间有顺序依赖**，用 `&&` 表达不出来。

`test/verify-media-bridge.mjs` 是唯一一个带 `['--allow-skip']` + `'soft'` + 第四参数的步骤 ⇒ 允许在没装媒体二进制的机器上跳过。

### 10.8 CI 的三个反直觉决定

- **故意不跑 `npm ci`**：守卫链只用 Node 内置模块，`test/verify-package-files.mjs` P5 钉住 ⇒ 守卫不依赖供应链状态，也不受"装不上"影响。
- **双平台 + `fail-fast: false`**：矩阵 `[windows-latest, ubuntu-latest]`。理由写在 workflow 注释里：只有 POSIX 的 `chmod` 能阻止 `unlink`；目录链接在 win32 是 **junction**、在 POSIX 是 **dir 符号链接**；`verify-media-bridge` 有 win32 专用断言；**"只跑一个平台 ⇒ 另一半零覆盖"**。
- `npm ci --omit=peer --ignore-scripts` ⇒ 任何依赖安装脚本的原生构建**都不被验证**；`verify:docs` 步 `continue-on-error: true` ⇒ 文档类守卫不拦合并。

**没有 macOS。** 这一点在第 13 章 §13.1.2 与第 14 章都要再算一次账。

### 10.9 这套体系自己的代价

- **手工内联器 = 手工实现的模块系统**：所有模块平铺进同一个 factory 作用域 ⇒ ① 重名即静默覆盖（所以才需要 `assertNoShadowedScopeDecls`）；② **依赖关系只存在于文件头注释里**（ADR-0003 的代价）；③ **不能按需加载**，整包一次性求值；④ **注释随包发给用户**；⑤ 产物即契约。
- **客户端侧没有死代码检测**：`test/verify-dead-declarations.mjs:6-12` 明确说 `src/**` 不适用（"按『本文件只出现一次』判会得到 **44 处假阳性**"）⇒ 5,416 行的 `src/client.js` 没有任何退役/死代码检查，且这条守卫还属于 soft 组。
- **零依赖既是优点也是风险**：好处是 `node scripts/build-client.mjs` 在任何机器上都能跑、CI 不用装东西；坏处是**没有第三方工具帮忙抓 bug**，模块解析、作用域判定、注入完整性全靠自研守卫。
- **236 KB CSS 在工厂顶层同步注入**（`src/client.js:5101-5115`）⇒ 首屏阻塞项；且 `data-we-glass-page` 这类"无条件挂载"的锚点意味着**没开壁纸也要付这份钱**。

---

## 11. 工程治理、宿主兼容与生态

这一章讲"这个项目怎么被维护、怎么和宿主演进、怎么和别的插件相处"。它的重要性在于：**这个插件 72.3% 的包体积是一个 4.54MB 的构建产物，而这个产物的正确性依赖 12 条 ADR、43 条路由的机器索引、173 条令牌的字节级契约、以及一个需要手动派发才运行的宿主兼容流水线。**

### 11.1 与宿主的契约面：机读的那份只有一处

`package.json` 的四类声明（`package.json:6-9`、`:111-128`、`:129-132`、`:88-95`）：

| 声明 | 内容 | 谁在读 |
|---|---|---|
| `engines.dsh` | `>=0.1.5-rc.1` | **插件市场与 DSH 自己的插件管理 UI**（直接从已发布的 manifest 读，社区目录不参与） |
| `engines.node` | `>=18` | 同上 |
| `peerDependencies` | 三个 `@deepseek-ai/dsh-*`（均 `>=0.1.5-rc.1`）+ `react ^18.2.0` | 包管理器 / 宿主 |
| `peerDependenciesMeta` | 三个 dsh peer **全部 `optional: true`** | 包管理器 |
| `dependencies` | `webwallgl ^3.0.0`、`x11 ^4.3.1` | — |
| `dsh.client` | `{ platform:"web", immediately:true, inject:["@deepseek-ai/dsh-client-runtime"] }` | 宿主加载器 |

`CONTRIBUTING.md:199` 把 `engines.dsh` 的地位说得很死：

> **`engines.dsh` 是宿主要求的机读副本。** 插件市场（以及 DSH 自己的插件管理 UI）是**从已发布的 manifest 直接读它**的——目录那边不参与——然后显示在插件卡片上，并用它与运行中的宿主比对、标记不匹配。所以它必须与三份 README 及 `docs/UPGRADING.md` 里的散文**同口径**：改一处就要改全部。`dsh-better-sidebar` **无法**在这里表达（它不是 `@deepseek-ai/*` peer），只能留在那段散文里。

`docs/CODE-STRUCTURE.md:522` 是同口径的表格版。

**这里有一条极重要的二分**（生态维度归纳）：

- 与**官方侧**的耦合走 `peerDependencies` + `engines.dsh` ⇒ **机读，宿主会读**；
- 与**第三方侧**（`dsh-better-sidebar` / `dsh-skins` / `@linxin666/dsh-ssh` / `@dsh-external/dsh-webui`）的耦合**没有任何机器可读的契约**，全部存在于散文与 CSS 选择器里。

而与 `dsh-web-app` 的关系走的是 **cordis patch**，既不是 peer 也不是 engines——`cordis.patch.yml` 只含 `insert:` 行（`id: wallpaper-engine`），注释写明原因：

> A patch replaces the targeted row's whole `config`, so only additive `insert` rows appear here

⇒ **「与 dsh-web-app 的兼容」在声明面上完全没有表达**，只靠"patch 行不冲突"这一事实性约定。

一个 semver 陷阱被显式记录（`docs/CHANGELOG.md:1845`）：

> `0.1.5-rc.1 < 0.1.5`，写 `>=0.1.5` 会把实测过的 rc 线排除，故沿用 1.1.0 实证写法

### 11.2 harness-compat：把"宿主兼容"变成可验证的基线

这是全仓库最值得学的机制之一，而且它的设计动机是被真实事故逼出来的。

**问题**：宿主升级后，插件可能静默失灵（玻璃靠宿主类名，宿主重构就静默退化）。但"宿主升级"是一个外部事件，插件的 CI 不会自动跑。

**解法**：`.github/workflows/harness-compat.yml` —— 一条**只按需运行**的流水线：

```yaml
# harness 适配基线：**只按需运行** —— 触发面只有 workflow_dispatch（不挂 schedule / push），
# 派发一轮「指定版本或 latest 的 harness × 被派发 ref 的 commit」的适配测试；**全绿才入基线**
# （.github/harness-baseline.json 由本工作流自动提交），失败即红、基线保持上一个全绿对。
```

流程（`:60-120`）：

1. 解析目标 harness 版本——`npm view @deepseek-ai/dsh dist-tags.latest`；**npm 查询失败即红**："探测通道坏了就该报错，不许静默用旧版本"；
2. 手动指定版本 ⇒ 强制重跑（基线判定不参与）；
3. 装完断言装到的就是目标版本（防 latest 漂移）：
   ```bash
   INSTALLED="$(node -e '...')"
   if [ "$INSTALLED" != "$TARGET" ]; then echo "installed=$INSTALLED target=$TARGET"; exit 1; fi
   ```
4. 四段适配测试 + 全套守卫：`npm run build` → `node test/compat-harness-surfaces.mjs`（UI 面清单棘轮 + sidebar 源码活判据）→ `node test/compat-harness-live.mjs`（link 通道）→ `node test/compat-harness-live.mjs --channel tarball --fresh`（tarball 通道）→ `node test/compat-harness-pages.mjs`（无头浏览器 CDP 逐页 DOM/样式断言）→ `npm run verify:all`；
5. 全绿后才 `record` 写基线。

#### 11.2.1 为什么必须有 tarball 通道

注释（`:103-106`）把原因写得很清楚：

> P4-17：同上，但**装 `npm pack` 的产物**（而不是软链工作区）。软链不参与依赖解析，因此 `peerDependencies` 能否在**安装闭包**里解析这一条，只有这条通道看得见 —— 一次用户回执实测过它的代价（`Packages: +1` → `generation peer validation failed: @deepseek-ai/dsh-client-runtime does not resolve from the installation closure`）。

这解释了为什么三个 peer 全部 `optional: true`——**optional 化解决的是安装闭包里 peer 不可解析的问题**。

#### 11.2.2 基线判定不能用 commit sha

`scripts/harness-compat-baseline.mjs:20-28` 的注释记录了一个真实的自噬循环：

> ⚠️ **"插件有没有变"不能用 commit sha 判**（这条是修出来的）：`record` 会把基线提交进 `main`，于是插件 HEAD 自己前进一格 ⇒ 下一轮 `check` 必然判"未覆盖" ⇒ 又跑一整轮完整适配（5–9 分钟）并再写一条基线，而新的基线又推进 HEAD …… 每小时如此。实测形态：连续三条 `ci(baseline)` 提交，每条记的都是**它自己的父提交**；上游仓库同样如此。
> ⇒ 判定改用 **插件内容身份 `plugin.revision`**：`git ls-tree -r <sha>` 里**除基线文件之外**的 (模式, blob 哈希, 路径) 清单的 sha256 前 16 位。只动基线文件 ⇒ 身份不变 ⇒ `should_run=false`（秒过）；真文件变了才重跑。

实现（`:98-105`）：

```js
function pluginRevision(root, sha) {
  const raw = runCapture(root, 'git', ['ls-tree', '-r', sha]);
  if (raw === null) return null;
  const lines = raw.split('\n').map((s) => s.replace(/\r$/, '')).filter(Boolean)
    .filter((l) => !l.endsWith('\t' + BASELINE_REL));
  if (!lines.length) return null;
  return createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 16);
}
```

`decide()`（`:125-145`）的判定顺序值得抄：**force → 基线文件不存在 → status≠pass → harness 版本变了 → 内容身份相同（秒过）→ commit 不同（重跑）→ 否则秒过**。而且退化方向是安全的：

> 基线里没有 `revision`（更早写的基线）或取不到 git 时，**退回按 sha 比较** —— 那是"判有变化、多跑一轮"的安全方向，绝不会漏测。

`record` 按内容身份**幂等**（`:160-168`），避免时间戳造成空转提交。

#### 11.2.3 这条流水线的软肋

**当前基线文件（16 行）里没有 `plugin.revision` 字段**，记的是 harness `0.1.7-rc.2` × 插件 `1.0.1`（2026-09-29）—— 而当前插件是 1.3.3。

由于工作流**只在 `workflow_dispatch` 时跑**，这套适配验证**在日常 push/PR 上并不发生**。

⇒ **声明面（engines/peers）随时在线，验证面（harness-compat）只在人工派发时在线。这是本仓库"宿主兼容"最脆弱的一环。**

（这与 `docs/wip/COEXISTENCE-AUDIT.md:8-12` 里那句"数字与行号以复算为准……本文数字不作准"是同一种文化：**文档里的数字不可信，生成物才可信**。）

### 11.3 共存：与皮肤中心、侧栏插件、其它 UI 插件

`docs/COEXISTENCE.md`（65 行，中文）与 `docs/en/COEXISTENCE.md`（82 行，英文）是同源双份，互相声明"改一处请同步另一处"。

**现状四句话**（`docs/COEXISTENCE.md:10-22`）逐字关键两句：

> 2. **关玻璃、留壁纸：还没有总开关** —— 玻璃是「每面各关各的」（侧栏 / 思考块 / 左侧栏各有总开关）；
>
> 3. **皮肤中心接管时会自动让路** —— 检测到皮肤中心的公开标记（`html[data-dsh-skin]`）时，本插件自动清壁纸、整族摘掉玻璃门控、停轮换；对方持续离场后自动恢复。**这是目前唯一的跨插件协商通道，方向是单向的（我们让路，别人无法让我们让路）。**

冲突矩阵把症状映射到 5 类机制（`:26-32`）：**令牌层接管 / 包含块劫持 / 让路协议 / 配置面随插件组合变形 / 跨插件投递接缝**。

**共存四态**（`:48-58`）：

| 模式 | 玻璃釉层 | 页面透出壁纸 | 今天 |
|---|---|---|---|
| `full` 玻璃 + 壁纸 | 开 | 开 | ✅ 默认 |
| `glass-only` 只留玻璃 | 开 | 关 | ✅ 现在就支持（关掉壁纸即可） |
| `wallpaper-only` 只留壁纸 | 关 | 开 | ❌ 还缺主开关（渲染层已就绪，见 ADR-0010） |
| `off` 都关（让路态） | 关 | 关 | ⚙️ 内部已有（皮肤中心让路路径），待升格为可声明状态 |

> 与第 8 章的玻璃分析一致：`glass-only|wallpaper-only|coexistMode` 这三个标识在 `src/` + `lib/` 里**零命中** ⇒ **四态目前只是纸面**。ADR-0010 修订了 ADR-0008 里"放弃关闭某一面即回原生纯色"的结论，理由是"前置条件已成立，缺的是产品级主开关与一批守卫改写，不是架构"——但**主开关至今没落地**。

### 11.4 让路协议：带宽 1 bit，代价不小

源码实现是**纯属性驱动**的：不写对方任何状态，只读对方的公开标记（`src/client.js:392-398`）：

> 信号只有一条腿，只读、绝不写对方任何状态：`html[data-dsh-skin]` = 对方"皮肤在台上 / 皮肤要求上台"的公开标记……早先为补"应用"这条腿做的轻轮询（`GET /api/skin-center/v2/active`）已随该契约落地整体删除 —— 纯事件、无网络。

实现是**幂等 + 滞回 + 落盘记忆**三件事的组合。滞回常量逐字（`src/client.js:412-414`）：

```js
const SKIN_YIELD_EXIT_GRACE_MS = 2600; // 复位宽限：对方 refresh 会先把标记摘掉再补回，瞬时摘不算退场
const SKIN_YIELD_ENTER_GRACE_MS = 450; // 退场宽限：对方的**启动上妆**是瞬时翻转（随后被它自己的 refresh 自纠），
                                       // 真实动作会持续 ≥1.5s（它的让路宽限）⇒ 只认"过一拍还在"的出现
```

`enterSkinYield`（`:426-441`）做四件事：记落盘记忆（`skinYieldRestoreId` / `skinYieldRestoreRotation`）→ 按停轮播 → `applySelection("")` 清层 → `applyEffects()` 摘玻璃门控。

其中「**为什么必须连轮播一起按停**」是跨插件场景下最容易被忽略的自伤（`:410-411`）：

> ⚠️ 轮播会把"空 id"当信号自动补位（`rotationEnabled && !id` ⇒ 取候选第一张），所以退场必须连轮播一起按停，否则刚清掉的壁纸会被自己补回来。

启动期还有「认领 / 启动复位」两腿（`:572-589`），走盘上两枚无界面键。

> **【推断】** 让路协议的**带宽只有 1 bit**（属性在不在），但工程代价不小（两个滞回窗口 + 两枚持久化键 + 诊断行 + 三条判别腿）。它能成立的前提是对方"只读 `body[data-we-wallpaper]`"这一条**对向契约**也稳定——而这条契约在本仓库里**没有守卫**。

### 11.5 第三方的私有实现细节：作用域化与硬编码并存

适配第三方插件直接钉在对方的**私有属性 + 私有类名**上（`src/styles-sidebar.js:320-321`）：

```css
body[data-we-sidebar-glass] [data-dsh-better-sidebar] [class*="_boundaryError"],
body[data-we-sidebar-glass] [data-dsh-better-sidebar] [class*="_panel"] {
```

这 10 个私有类名后缀**在 DSH 里根本不存在**，只能随该第三方插件漂移——`docs/DSH-UI-INTERFACES.md:80` 专门维护了这份"第三方私有类名台账"。

这就是 `docs/wip/COEXISTENCE-AUDIT.md` 里的 **M2 机制**：第三方私有实现细节硬编码。对策表里对应的是 **S5 第三方面契约集中化**（`src/third-party/*.js`）——**未落地**。

### 11.6 令牌层接管：看不见的耦合

`docs/wip/COEXISTENCE-AUDIT.md:29` 逐字：

> 我们把宿主的设计令牌 `--dsw-alias-*` 整层改写成玻璃配方（35 个别名 token）。而 DSH 官方给插件作者的规范就是"用 `--dsw-alias-*` 上色"。**⇒ 任何按规范写的第三方 UI 插件，都会自动继承我们的玻璃**

`docs/COEXISTENCE.md:19-22` 把它写成了面向用户的四条之一：

> 4. **按宿主规范上色的第三方插件会「继承」我们的玻璃** —— DSH 给插件作者的规范是「用 `--dsw-alias-*` 设计令牌上色」，而这些令牌在玻璃生效时被改写成玻璃配方 ⇒ 任何按规范写的插件都会自动带上玻璃质感，**我们关不掉它、对方作者也不知道**。

> **【推断】** 这是整套插件的**结构性风险源**：它把"插件按官方规范上色"这条宿主推荐路径变成了"自动继承玻璃"的通道，而第三方作者对此毫不知情。仓库的处置是"用守卫把暴露面钉死"而不是"让第三方能 opt-out"——**止损靠自律不靠协商**。

这正是第 9 章那条"无门控白名单只两处"的来源：`docs/TOKEN-CONTRACT.md:17-18` 的封闭白名单 + `test/verify-token-contract.mjs` 的"白名单封闭"判据，是这个风险面的**唯一防线**。

### 11.7 文档体系：目录的寿命规则

三份 README 的分工：

| 文件 | 体量 | 定位 |
|---|---:|---|
| `README.md` | 23.8KB / 300 行 | 中文门面：快速开始 / 目录 / 能做什么 / 安装 / 使用 / 配置与数据 / 兼容与限制 / 开发与贡献 |
| `README.en.md` | 55.8KB / 374 行 | 英文，同结构但**更厚**，多出 `How it works`、`Adapter target`、`Power saving`、`Live rendering`、`Mascot`、`dsh-better-sidebar compatibility` 等小节 |
| `README.beginner.md` | 31.9KB / 357 行 | 中英并列，面向小白 |

门面与变更记录的分工写在 `docs/CHANGELOG.md:5-6`：

> 本文件承接原先堆在 README 首页的**版本公告与功能清单**。门面只保留与版本无关的亮点；带版本号、issue 号、性能数字的内容一律记在这里。

**目录的寿命规则**写在 `docs/README.md:22-32`，是这份文档体系最值钱的一段：

| 类别 | 放哪 | 判据 |
|---|---|---|
| **常青** —— 用户文档 / 规范 / 参考 | `docs/` 根 | 描述**当前**行为或长期约定 |
| **历史** —— 已退役 / 已完成 | `docs/archive/` | 只作为记录存在，**不反映现行实现**；顶部必须有状态横幅 |

`docs/wip/` 的门槛尤其值得学：

> **`docs/wip/` 的门槛**（2026-10 曾整体清空一次 —— 清空的是**当时的文件**，目录本身保留）：它只放**还没做成事实的东西**；完成即移入 `docs/archive/wip/`，并且**不许出现"唯一的进度真源"这类台账** —— 需要看守的东西一律写成守卫（见 [`adr/0007`](./adr/0007-machine-checks-target-code-not-prose.md)），**账本自己会漂、且漂了不会变红。**

> 过程记录**先把结论写进它该住的地方**（机制 → 实现文件的头注释；判据 → `test/`；取舍 → `adr/`），写不进去的才留在 `wip/`。

`docs/README.md:165-170` 明确写着：

> 现状 / 进度：**没有活账本**（2026-10 瘦身：重构账本整体归档）—— 需要看守的东西一律是守卫

### 11.8 "wip 文档 171KB ⇒ 项目长期重构中"是个误读

四份巨型 archive 文档的状态横幅（**这是本维度最重要的反直觉事实**）：

| 文件 | 体量 | 横幅逐字 |
|---|---:|---|
| `docs/archive/wip/GLASS-CONFIG-REFACTOR.md` | **171.6KB** | 「**状态：已落地并归档（2026-10-03）** —— 本方案的 R0–R4 与全部收口**均已完成**」 |
| `docs/archive/wip/OPEN-ITEMS.md` | 70.3KB | 「**状态：历史记录（不反映现行实现）。** 这是那一轮重构的账本，**主动部分已结项**」 |
| `docs/archive/wip/PLAN.md` | 51.4KB | 「**状态：历史记录（不反映现行实现）—— 四节全部到达结论（2026-10-04）。** …… **零待办项** …… 判定为『**有意不做**』的三处（`⊘` 标记）都写了理由，**不是欠账**」 |
| `docs/archive/wip/SIDEBAR-TABS-DESIGN.md` | 33.7KB | 「**状态：历史记录（不反映现行实现）。** …… 该功能已随 **v1.1.0 → v1.2.0** 发布」 |

⇒ 正确读法是：这些是**已完成方案的高保真设计史**，被整体归档而不是删掉。**项目的反漂移机制不是"维护进度账本"，而是"账本一律不写，要看守的东西写成守卫"。**

现存的 5 份活文档（各有状态横幅）：`SLIDER-CONSOLIDATION.md`「进行中（未落地）」· `LINUX-OCCLUSION.md`「进行中（未落地）」（范围仅 Linux X11/Wayland）· `ISSUE-190-FX-PERF-DESIGN.md`「第一期已实施」· `ISSUE-AUDIT-148PLUS.md`「草案（未跟踪，未落库）」· `COEXISTENCE-AUDIT.md`（进行中，S1–S8）。

> **【推断】** 真正仍在重构的是**玻璃/壁纸解耦（S1/S3）与共存自诊断（S4）**，而不是整个项目。

### 11.9 守卫链与 CI：双平台的理由

`CONTRIBUTING.md` 的三条铁律：

1. **先重建再验证**：`test/verify-client-sync.mjs` 重建 + 逐字节比对 + 还原文件；
2. **绝不手改产物**：`lib/client.js` 是 `src/client.js` 正文 + `INLINE_MODULES` 内联进同一 factory 作用域的构建产物，**不入库**（v1.4 起），改 `src/**` 必须先 `npm run build`；
3. **产物即契约**：`src/styles.js` 禁止在注释里写反引号（实测 `verify-host-paint-scope` 报「裸反引号 489」）。

verify 分**硬档 / 软档**：`npm run verify` 与 `npm run verify:docs`（`test/warn-only.mjs` 降级为警告，打印 `[warn-only] 软档守卫原退出码 = N`）。

**CI 故意不跑 `npm ci`**——整条守卫链只用 node: 内置模块与相对路径，由 `test/verify-package-files.mjs` P5 钉住。

**双平台 CI 的理由写在 workflow 里**（`.github/workflows/verify.yml:25-35`）：

```yaml
# ── 为什么要**两条腿**（P4-18）────────────────────────────────────────────
# 守卫里有**平台条件分支**，而两半各在不同的平台上才有牙：
#   · `verify-scene` 的 unlink 失败用例：**只有 POSIX 的 chmod 能阻止 unlink**
#   · `verify-scene-live` 的目录链接用 junction（win32）或 dir（POSIX）建。
#   · `verify-media-bridge` 有一处 win32 专用断言。
# 只跑一个平台 ⇒ 另一半**零覆盖**
```

矩阵是 `[windows-latest, ubuntu-latest]`，`fail-fast: false`（一个平台红了不掐掉另一个）。

`verify.yml` 的触发面比 `harness-compat` 宽得多：`on: push / pull_request / workflow_dispatch` ⇒ **日常 CI 覆盖双平台，但 harness 适配不覆盖**。

### 11.10 分诊与认领体系

标签体系（`docs/TRIAGE.md:8-17`）= 3 个状态标签 + 5 个 area 标签：

| 标签 | 谁打 |
|---|---|
| `status:needs-triage` | 模板自动（新 issue 初始状态） |
| `status:accepted` | 维护者（**认领从这里开始**） |
| `status:declined` | 维护者（写一句原因） |
| `area:client` / `area:host` / `area:glass-ui` / `area:webwallgl` / `area:ci-docs` | 任何人 |

`/assign` 机器人**不用 GitHub 原生 assign 控件**（原生控件只对有 push 权限的人开放，社区贡献者点不到），改用 `issue_comment` + `actions/github-script@v7`（`.github/workflows/issue-claim.yml`）。门禁：`/assign` 仅在 labels 含 `status:accepted` 时放行。

已知限制（`docs/TRIAGE.md:33-34`）：

> 注意工作流只认**默认分支（main）**上的版本；改动它需要先合入 main 再测。

issue 入口关掉了空白项（`blank_issues_enabled: false`），只留三条 contact link 指向 `TROUBLESHOOTING.md` / `TRIAGE.md` / `README#联系方式`。

`.github/CODEOWNERS`（10 行）**只服务自动请求评审，且不阻塞合并**（main 的 Ruleset 要求 0 个强制审批）。

### 11.11 贡献者结构：这是一个两层架构

上游一手数据（2026-10-20 取数）：

| 指标 | 值 |
|---|---|
| stars / watchers | **1699 / 1699** |
| forks | **66** |
| open issues + PRs | **41** |
| 建仓时间 | 2026-08-16（**两个月前**） |
| 最后提交 | 2026-10-20（取数当天） |
| language / license | JavaScript / MIT |
| 贡献者 | **24 人**，前五名：YV3507 **324** · oneincase **235** · elysia395 **178** · yuxilao 24 · levodoubt 10 |

`v1.3.2` Release 正文有一段**诚实声明**：

> 本版的媒体链路（含 WebWallGL 渲染内核）不在本次改动范围内，其上游归贡献者 oneincase

> **【推断】** 前三名占提交总量的**过半**；其中 `oneincase` 是 WebWallGL 渲染内核作者 ⇒ 本插件是**两层架构**：本仓（宿主集成 + 玻璃 UI）+ 外部引擎仓（WebWallGL）。这是一个**没有 manifest 级声明的外部依赖**：`webwallgl ^3.0.0` 走 npm `dependencies`，但引擎的**上游源码仓**与本仓不同步演进——这正是 issue #218（实时渲染只显示静态帧）的根源面。

npm 一侧（`registry.npmjs.org/dsh-plugin-wallpaper-engine`）：

| 项 | 值 |
|---|---|
| latest | **1.3.3**（2026-10-15） |
| maintainers | **仅 1 人** `chensyovo` |
| 1.3.3 dist | `fileCount 81`、`unpackedSize 6,279,749`、`gitHead 01fbb8b8...`（与主控 `npm pack --dry-run` 实测一致） |
| 下载量 | last-week（10-12..18）= **19,419**；last-month（09-19..10-18）= **59,182** |

发布节奏：**两个月 30 个版本**（`0.1.0` 08-16 → `0.7.5` 09-21 → `1.0.1` 09-25 → `1.3.3` 10-15），其中 09-25 之后 3 周内连发 6 个 1.x 版本。

GitHub Release 的角色主要是**传播素材**：`media-v1` 展示图资产下载 17.6 万次，而插件包本身只有数百次 ⇒ **插件分发实际走 npm**。

赞助路线是**微信赞赏码 + 社群二维码**（没有 `.github/FUNDING.yml`）。

### 11.12 开放 issue 面：真实缺陷的四族

把 41 条开放项按机制归族（每条都有 issue 号可核）：

**① 玻璃与宿主/第三方 UI 耦合（最大一族）**

- `#235` 标题栏液态玻璃开关整块失效：**宿主 CSS-module 哈希漂移 `pI_x6G` → `BynINW`**（守卫因棘轮盲区恒绿）；
- `#236` 标题栏玻璃+左栏玻璃同开盖住收起按钮 · `#237` 右侧栏 1px 描边 · `#239` 深色主题令牌压成单一标量 · `#242` 浮层被玻璃化后透字 · `#249` 皮肤让路摘掉 `data-we-glass-floaters` 后 `.we-repo-panel` / `.we-update-notice` 丢掉全部定位规则 · `#258` 左侧栏玻璃"透明度"只有 8.25 个百分点行程 · `#224` 液态玻璃未覆盖第三方插件对话框；
- 修复侧 PR `#243`「标题栏玻璃改用运行时锚点」⇒ 方向是**从"硬编哈希类名"转向"运行时锚点"**。

> #235 正好印证了第 8 章那条"最脆一环"：玻璃的模糊依赖宿主源码作者写的属性名/类名后缀，宿主重构后静默退化成"只有透明、没有模糊"，而**棘轮守卫看不见这种漂移**。

**② 包含块 / fixed 锚定**

- `#257` 输入框粘底**再次**失效（`::before` 的 backdrop-filter / 视差 transform 重新锚定）；历史 `#89`（已修）、`#131`（宿主 Windows 标题栏 fixed 按钮掉整栏高度）。

**③ 宿主生命周期与运行期依赖装载**

- `#241` **壁纸插件导致 DSH 桌面端自动更新失败：Host 无法优雅退出**（定位 `lib/media-origin.js:179` `server.close()` 未断连接）—— 这是**插件影响宿主生命周期**的实例，后果是"桌面端更新失败"；
- `#218` 实时渲染只显示静态帧（见 4.4）；
- `#158` 装插件后桌面端启动变慢，且**必须等插件加载完才能新建会话**：`immediately` 客户端包进启动关键路径 + 大库 inventory 全量扫描。

**④ 大库 / 缓存性能**

- `#240` 壁纸库预览卡死：自定义图片壁纸**没有缩略图管线**，卡片直接加载 8K 原图（43MP × 24 张/页）；
- `#208` GPU 抓帧缓存文件名逼近 `NAME_MAX`（PR `#246` 改短哈希）；`#158` 大库 inventory 全量扫描。

**⑤ 其它**

- **`#252`（外部测评）`project.json` 的 `file` / `preview` 不做目录包含校验 ⇒ 第三方壁纸可让 `/preview`、`/media`、`/scene-files` 返回本机任意文件**——这是开放 issue 里**唯一一条安全类**；
- `#250` 软件渲染环境（Hyper-V / 远程显示）下场景壁纸被大幅降采样 · `#248` 大型 dsh-context 页面下 Scene 60fps + 液态玻璃导致 DSH 卡约 10s · `#230` 自动轮转时间不可调 · `#238`（提案）按变更范围分层 CI · `#219` 预设只能存 1 套 · `#253` 设置面板布局。

> **【推断】** #252 属于"第三方壁纸 = 不可信输入"的边界问题：插件把壁纸目录暴露成 HTTP 路由，而 `project.json` 里的路径**没有做目录包含校验**。这一条与 4.6 的两层围栏形成对照——**宿主自己生成的路径被围栏守着，作者提供的路径却没有**。

---

## 12. 优点

### 12.0 一句话

**这个项目最值得学的地方不是它的功能，而是它对"不确定"的处理方式。** 整个代码库反复在做同一件事：遇到拿不准的情况，**不猜、不装、不美化**，而是把它变成一个可判定的状态（要么给真东西，要么明说没有），并把这个状态用守卫钉住。其余的优点大多是从这条原则派生出来的。

### 12.1 切分：两个半边之间只有一个面

- 插件分**宿主半边**（Node，`lib/`）与**浏览器半边**（`src/`），两端靠 **43 条同源 HTTP 路由**通信，**没有第二套共享状态**（`docs/ROUTE-INDEX.md:13`；`src/api-client.js:36` `BASE='/wallpaper-engine'`）。
- 唯一被两端共享的内核是 `lib/settings-schema.js`——而它**被构建期内联进客户端**（`scripts/build-client.mjs:630-635` marker 缺失即构建失败）⇒ schema 不可能"两端不一致"。
- 宿主半边是**文件真源**（`~/.dsh-wallpaper-engine/config.json`），客户端只是同步缓存 + 迁移源 + 回滚（`src/persistence.js:2`）。写路径单一：debounce 200ms → PUT → 宿主原子落盘 → 串行队列。
- 卸载有统一 disposer 模式（`lib/index.js:1464-1478`；客户端 `src/client.js:5230-5455`），宿主侧那段甚至逐条 `try/catch`（`lib/index.js:1465`）。
- 43 条路由不是手写的清单，而是**机器生成 + 守卫对账**（`test/tools/host-route-index.mjs --write` ⇄ `test/verify-route-index.mjs`）⇒ 路由面不会悄悄漂。

### 12.2 "诚实"作为一条工程纪律

这是贯穿全仓最一致的设计原则，几乎每章都能找到它的实例：

| 场景 | 做法 | 锚点 |
|---|---|---|
| 墙纸没有可用画面 | **删掉整条 CPU 兜底出图线**（约 1 万行），宁可 404 也不给糊图 | `lib/routes/scene-frame.js:72-78` |
| 路径围栏判定异常 | **fail-closed**：catch 里不放行，否则一次解析异常 = 整层围栏失效 | `lib/serve.js:438-458` |
| 设置值非法 | **作废**，不修剪成另一个值（`clampNum` 越界回默认而非夹边界） | `lib/settings-schema.js:1570-1572`、`:1689` |
| 未知 kind | 直接抛错，不猜 | `lib/settings-schema.js:1689` |
| 平台不支持 | 明确报 `unsupported platform <p>/<arch>` | `lib/transcode.js:231-234` |
| 遮挡不可用 | 恒定 `backend:'none'`，不返回猜的窗口矩形 | `lib/occlusion/index.js:207` |
| 字体清单拿不准 | 明确标 `approximate` | `lib/routes/system-fonts.js:141-151` |
| 载荷账本读不到 | 回 `ok:false` = **未知**，不伪装成"没在动" | `lib/routes/scene-serve.js:169-176` |
| 破坏性操作 | **不用原生对话框**（`window.confirm` 在 `src/` 里一处都没有，棘轮按 0 钉住） | `test/verify-fontset.mjs` |
| Wayland | **宁可完全禁用**也不给残缺数据 | `lib/occlusion/x11.js:46-52` |

这条纪律的副产品是：**很多"看起来像 bug"的行为其实是契约**。比如 `v=4` 时返回 422 而不是 404，是因为档位号一旦定义就不复用（`lib/routes/scene-frame.js:77-78`）。

### 12.3 守卫链：把"会漂的东西"变成"会红的东西"

这是本项目最有方法论价值的设计。

- **产物即契约**：`lib/client.js` 由构建期从 `src/*.js` 平铺内联而成，**不进 git**（ADR-0012，`git ls-files lib/client.js` 为空），但 CI/开发者/prepack 三条路径各自重建并比对 ⇒ 产物永远等于源码。
- **构建期守卫直接抓真实缺陷**：`scripts/build-client.mjs:765` `assertNoShadowedScopeDecls()` 禁止同作用域重名顶层声明。这条守卫是为一个**真实 bug** 写的——`src/client.js` 里 `onStartEditCacheDir` 重复声明，在脚本语义下后者静默胜出，删掉后者会让前者**静默复活**而守卫全绿。文档（`docs/CODE-STRUCTURE.md:238`）还把这条守卫说反了（说成"vm.Script 语法检查兜住"），这是全仓 70 个模块平铺进一个作用域的真实代价。
- **自动生成的机器可读文档**：路由索引、令牌契约（`docs/TOKEN-CONTRACT.md`：173 条声明 / 59 令牌）、守卫地图（`docs/GUARD-MAP.md`），全部由脚本生成并被守卫回查 ⇒ 人写的表格不会漂。
- **守卫分层**：57 步硬（`npm run verify`，红了就拦）+ 6 步软（`npm run verify:docs`，红了只提示）。
- **守卫链只用 Node 内置模块**，CI **故意不跑 `npm ci`**（`test/verify-package-files.mjs` P5 钉住）⇒ 守卫不依赖供应链状态。
- **双平台 CI 且关掉 fail-fast**（`windows-latest` + `ubuntu-latest`，`fail-fast: false`），理由写得很清楚："只跑一个平台 ⇒ 另一半**零覆盖**"。
- **ADR 的判据不是"记了什么"，而是"实现重写后是否依然成立"**；被推翻时**不改写正文**，只把 `Status` 改成 `Superseded by ADR-NNNN`（`docs/adr/README.md`）——这是很少见的、正确的 ADR 维护方式。

### 12.4 测试体量与形态

- `test/` **52,716 行 / 97 文件**，`src/` 29,389 行 / 73 文件，`lib/` 15,882 行 / 58 文件 ⇒ **测试代码比产品代码多**（45,271 行）。
- 断言不是"跑通就行"，而是**把契约钉成数字**：例如 `test/verify-scene-live.mjs:3751-3755` 的 #190 棘轮（`stroke+fill ≤ 40`、`blur ≤ 24`）、`test/verify-presets.mjs:128-162` 的预设键集双向对账、`test/verify-token-contract.mjs` 的令牌逐字节一致 + 负对照探针 + 门控计数自洽。
- 危险动作有专门的守卫：`src/**` 里 `window.confirm` 必须为 **0**；`lib/` 里破坏性操作必须走两下确认。

### 12.5 媒体管线的工程含量

这一块是"看起来简单、实际很难"的部分：

- **自研 MP4 虚拟文件系统**（`lib/mp4-vfs.js`）不是为了"边下边播"，而是为了**边播边合成**：`+faststart` 的字节效果只等于"moov 整段前置 + stco/co64 加 len(moov)"（`lib/mp4-vfs.js:12-17`），于是服务期按段表合成、**磁盘成本 0**（对比旧方案实测 5 张壁纸 = 1570MB，`lib/faststart.js:6-17`）。
- **下载物全部钉哈希**：ffmpeg 与 media-bridge 每个平台产物都钉 sha256，下载走 `.part` 临时文件 + 魔数校验 + 改名；自定义版本必须同时给 `DSH_WE_MEDIA_BRIDGE_SHA256`，否则拒收（`lib/media/provision.js:262`）。
- **能力头栅栏的对抗意识**：DSH Desktop 只给同源 frame 注入 `x-dsh-desktop-renderer`，严格沙箱 iframe 拿不到 ⇒ 网页壁纸一律 403（症状"预览图正常、随后整块黑"）。插件的应对是**再开一个 loopback 媒体源**（`127.0.0.1` 随机端口）绕开栅栏——不是绕过安全，而是绕过"能力传递"这一层。
- **载荷账本**：客户端轮询 `GET /scene-payload-progress?token=…`，字节还在涨就每拍重置计时 ⇒ "正在下载"不再被误判成"渲染不出来"。
- **空帧门禁**：体积阈值不可靠（headless 全黑 PNG：960×540≈12KB、1080p≈44KB、4K≈165KB）⇒ 改成降采样看亮度分布。
- **多进程而非多线程**：全仓无 `worker_threads`。media-bridge（Rust）、ffmpeg、macOS Swift tap 全部走 stdin/stdout 管道，无 socket、无 HTTP。

### 12.6 克制的工程取舍

- **不装 X11 原生库**：`x11@4.3.1` 是纯 JS、零依赖、无安装脚本，仓内没有任何 apt/libxcb 说明。
- **不用原生 `window.confirm`**：破坏性操作一律走自己的两下确认 UI。
- **不引入测试框架**：`devDependencies` 只有 eslint / typescript / @types/node，守卫全部是 Node 原生脚本 ⇒ 零供应链负担，代价是第 13 章要讲的"巨型断言脚本"形态。
- **不为省事而给假数据**：Wayland 禁用遮挡、`backend:'none'` 明确返回、抓帧失败就留空。

### 12.7 文档体系

- 三份 README 分工（门面 / 英文 / 小白中英并列），`docs/` 下按用途分层：`HOW-IT-WORKS`（行为）、`CODE-STRUCTURE`（结构 + 治理表）、`DEV-GUIDE`（操作）、`TROUBLESHOOTING`、`UPGRADING`，以及自动生成的 `ROUTE-INDEX` / `TOKEN-CONTRACT` / `GUARD-MAP`。
- **目录寿命规则**明确（`docs/README.md:22-32`）：常青进 `docs/` 根，历史进 `docs/archive/`（顶部必须有状态横幅），未决进 `docs/wip/`。
- **`docs/wip/` 的门槛写得极好**（逐字）："不许出现『唯一的进度真源』这类台账 —— 需要看守的东西一律写成守卫（见 adr/0007），账本自己会漂、且漂了不会变红"。
- CHANGELOG **498KB**（另有英文版 570KB），两个月 30 个版本，**改了什么 + 验证结果 + 哈希**都记在里面。

---

## 13. 缺点与风险

### 13.0 一句话

**优点几乎全部来自"边界内的工程"，缺点几乎全部来自"边界外的现实"**：宿主 Web 服务器的模型、宿主的类名与属性名、宿主的第三方插件生态、多平台与多架构的现实、以及"文档与实现都是人写的"这一事实。**这个项目把 90% 的精力花在可自己控制的那 10% 上，并且做得极好；但剩下那 10% 恰恰是用户会踩到的地方。**

### 13.1 高危

#### 13.1.1 写状态端点没有 CSRF / Origin / Content-Type 闸，且能建任意绝对目录

**事实**：`POST /wallpaper-engine/upload-dir` 会 **`mkdirSync(dir, {recursive:true})`** 并把该目录设为上传落点：

```js
// lib/routes/upload.js:314-335（摘）
const dir = normalizeUserDir(dirRaw);
if (!dir) { res.statusCode = 400; … return; }
try { mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }
…
setUploadDir(dir, migrate).then(…)
```

`normalizeUserDir`（`lib/index.js:858-869`）只做「绝对路径 + 无控制字符 + 展开 `~`」，**没有根目录白名单**；`setUploadDir`（`lib/index.js:887-922`）还会把已有上传迁过去。`POST /wallpaper-engine/we-assets-dir` 同形（`lib/routes/we-assets.js:113-163`）。

**事实**：全仓 `lib/` **没有**任何 `Origin` / `Referer` / CSRF token 校验；对 `lib/` grep `Origin|referer|csrf|CSRF` 的 90 处命中**全部是注释或 `postMessage` 的 `targetOrigin` 语义**。`lib/http-body.js:57-87` 的 `bodyReader` 只做「累计字节上限 + 一次解码」，**不看 `Content-Type`**。

**推断（成立条件依赖宿主）**：宿主 Web 服务器在 loopback 但**端口随机**（`lib/config-store.js:97`："the loopback port is random (`--port 0`) and changes on every DSH Desktop restart"），所以纯远程 CSRF 可行性中等偏低；但 (a) 任何**本机进程**扫一下 `127.0.0.1` 就能拿到端口，(b) 端口一旦泄露，攻击者可用 `mode:'no-cors'` + `Content-Type: text/plain`（**简单请求，免预检**）发 POST，体是 JSON 而 `JSON.parse` 照收（`lib/routes/upload.js:309-313`）⇒ **在受害者机器上创建任意目录并把上传落点改走**。**未确认**：宿主是否有本插件之外的 Origin 闸（宿主源码不在本仓）。

**结论**：这不是"能直接读你的文件"，但它是**不受 CSRF 防护的远程可触发的写状态端点**。最低成本的补救是三件事：写状态端点校验 `Origin`（同源白名单）/ 要求 `Content-Type: application/json`（把简单请求挡在预检后面）/ 给上传目录加白名单。

#### 13.1.2 测试盲区是**结构性**的

**事实**：
- 唯一的浏览器 E2E 打在**自造的 mini host** 上——`test/e2e-web-media-origin.mjs` 自己复刻宿主契约（`:72-75` `webServer: { register(route){...} }`），**缺浏览器即 SKIP**（`:12-14`："不属于 npm run verify —— 它需要本机有 Chromium 系浏览器"；`:622-629`："仅表示『显式跳过』，不是『页面断言通过』"）⇒ **从来没有一个测试把真宿主 + 真浏览器 + 插件全链路跑通**。
- 真宿主兼容测试是**派发制**（`.github/workflows/harness-compat.yml` 只有 `workflow_dispatch`），而仓库自己承认"**三条判据自 bb06fc2 起一直红且看不出原因**（harness-compat 是派发制，没人重跑就没人发现）"（`docs/CHANGELOG.md:1864`；`docs/archive/audits/TEST-ANTIPATTERN-AUDIT.md:38`）。
- CI **无 macOS**（`.github/workflows/verify.yml:39` `os: [windows-latest, ubuntu-latest]`）且 `npm ci --omit=peer --ignore-scripts`（`:56`）⇒ macOS 专属路径（`swiftc` 编译 audio-tap、`system_profiler`/`osascript` 字体枚举、darwin media-bridge）**在 CI 中一次都没跑过**；`--ignore-scripts` 意味着任何依赖安装脚本的原生构建也不被验证。
- 主客户端行为测的是**手写假 DOM**：`test/verify-client.mjs`（396KB / 5,270 行）自带 `makeEl`/`classList`/`activeElement` 仿真，在 `node:vm` 里跑 bundle ⇒ **真浏览器里的事件顺序、焦点、CSS 合成、`backdrop-filter` 行为都测不到**——而玻璃 UI 恰恰最依赖真实渲染。

### 13.2 中高

#### 13.2.1 围栏强度在同一仓内有**三档**

| 位置 | 围栏 | 锚点 |
|---|---|---|
| `/scene-files` | **三层**（`resolve+startsWith` → `lstat` 拒符号链接 → `realpathSync.native` 包含性），fail-closed | `lib/serve.js:438-458` |
| `/we-assets` | **一层**（只有 `resolve + startsWith`，无 realpath / 符号链接检查） | `lib/routes/we-assets.js:100-102` |
| `dirSceneAccess` | **junction 盲**（仓库 CHANGELOG 自己标注为"残留"） | `docs/CHANGELOG.md:1744` |

素材根目录（用户自选的任意绝对目录）下存在指向根外的符号链接或 Windows junction ⇒ `/we-assets` 的单层围栏被绕过，可读根外文件。**同一个仓里已经把正确写法写出来了（`realpathSync.native`），却没有统一收口。**

#### 13.2.2 磁盘与内存无界

- **转码产物没有体积上限**（`lib/transcode.js:440-508` 只有 `-t <duration>` 与码率 4–20Mbps，没有输出体积上限），而 4GB 缓存上限**只在启动后 3 秒查一次**（`lib/index.js:1160-1186` + `lib/cache-prune.js:97-122`）⇒ 一次会话内连续转码长视频（1h @20Mbps ≈ 9GB，**推断**）可把磁盘写满，**上限要等下次重启才生效**。`TRANSCODE_MAX_CONCURRENT = 2`（`lib/transcode.js:69`）限制并发，不限制总量。
- **`mediaMap` 只在 dispose 时 `clear()`**（`lib/index.js:1126-1131`、`:1477`）⇒ 会话内无上限增长。
- **媒体 token 就是绝对路径的 base64url**（`lib/index.js:1123-1131`）⇒ **可逆**。注释的前提是"客户端本来就能从 inventory 拿到这些路径"，但 inventory 给的是**壁纸名/相对路径**，token 却能一行 `atob()` 还原出 `C:\Users\<用户名>\…`。token 出现在 `/media`、`/preview`、`/live-frame`、`/scene-video`、`/scene-audio`、`/props` 等多个路由 ⇒ 诊断日志/截图/扩展读页面数据都可能带出**含用户名的本机绝对路径**。

#### 13.2.3 自建 loopback 媒体源：无鉴权 + `Access-Control-Allow-Origin: *`

`lib/media-origin.js:166-173` 在 `127.0.0.1` 随机端口起第二个 HTTP 面；`lib/serve.js:459` 对它吐出的文件设 `Access-Control-Allow-Origin: *`；`lib/media-origin.js:140-162` 的处理器**只按路径前缀分发，无任何 token/会话校验**。端口由 `GET /wallpaper-engine/media-origin` 公开 ⇒ **任何本机进程可以绕过宿主 Web 服务器可能有的任何访问控制**，直接枚举场景载荷目录。

**推断**：这是 ADR-0005 有意新增的第二端口，代价就是"多一个无鉴权的本机 HTTP 面"。**这个面还没有出现在路由索引里**（ADR-0005 自己承认，`docs/adr/0005-media-loopback-origin.md:72-73`："它**不在**插件路由表里 —— 因此不会出现在路由索引里，读索引的人容易漏掉它"）。

#### 13.2.4 根级 `/diag` 抢宿主命名空间 + 任意页面可写宿主诊断日志

`lib/routes/diag.js:142-143` 同时注册 `/diag` 与 `${BASE}/diag`（`docs/ROUTE-INDEX.md:40-41` 两条都列成 `/diag`）。`handleDiag` 接受任意 method、把 `?msg=` 直接写进宿主诊断 JSONL（`lib/host-diag.js:39-64`，8MB 轮转）⇒ **任意页面可往宿主日志里注入伪造条目**（日志污染 / 误导排障）；若宿主或别的插件也注册了 `/diag` ⇒ 同名路由冲突（**未确认**宿主 `webServer.register` 对重复 exact 路径的处理）。

### 13.3 中

#### 13.3.1 ADR 的 `Status` 字段**双向不可信**

| ADR | Status | 代码实况 |
|---|---|---|
| `docs/adr/0011-preset-full-snapshot.md:4` | **Proposed** | **D1–D7 全部已实现**（`lib/settings-schema.js:389`、`:427`、`:1192-1193`；`lib/routes/presets.js:462`、`:525`、`:635`；`src/preset-store.js:130-135`、`:275-285`） |
| `docs/adr/0010-glass-off-revisit-four-states.md:4` | **Accepted** | **D2 的"一个模式键、四种共存态"在代码里不存在**：全仓 `*.js` grep `glass-only\|wallpaper-only\|coexistMode` → **0 命中** |

后果是**两头都被误导**：一件**已做完**的决策标着 Proposed（可能被人"改回去"），一件**没做**的决策标着 Accepted（会被当成既有能力）。而本仓自己写下的元规则是 "**Trade-offs only**: a decision that had alternatives, where someone paid a price"（`docs/en/README.md:118`）——`Status` 字段把这条规则架空了。

**更值得注意的真空**：**12 篇 ADR 没有一篇覆盖"下载并执行外部二进制（media-bridge）"这条供应链边界**，而 ADR-0001 的 D4 明说"不替用户跑外部程序"。插件实际执行 ffmpeg（`lib/transcode.js:330-438`）与**下载后执行的** media-bridge（`lib/media/provision.js:127-155`）——**这恰恰是本插件风险最高的一处**（自动下载 + 哈希校验 + 执行）。ADR 体系在这里是空的。

#### 13.3.2 性能：产物在审计之后翻了倍，而审计结论停在旧值

- **实测**：`lib/client.js` = **4,542,261 B**，其中 10 条 `ROPE_IMG_*` base64 PNG 行合计 **2,370,175 B = 52.2%**（原始 PNG 1,777,245 B）；gzip（Optimal）后 **2,517,081 B = 55.4%**。base64 化的 PNG 基本压不动。
- **仓库自己已经 CONFIRMED 过这个问题**：`docs/wip/ISSUE-AUDIT-148PLUS.md:187`："#158 客户端包重 + 冷扫 1.9 s —— CONFIRMED（性能类，无功能错，等级 A + B）"。
- **但那份审计记的是旧值**：同文件 `:197` 写 "`lib/client.js` = **2,332,806 B**；`gzip -9` = **1,013,133 B（43.4%）**" ⇒ **体积近翻倍，而审计的结论与数字都停留在旧值**。这是"审计文档本身成为技术债"的典型样本。
- **内联 CSS 同步注入**：236KB / 3,213 行 / 476 个 rule block 在工厂顶层同步注入（`src/client.js:5101-5115`），是首屏阻塞项；且 `data-we-glass-page` 这类"无条件挂载"的锚点意味着**没有壁纸也要付这份钱**。
- **inventory 冷扫**：TTL 3 秒（`lib/inventory.js:148`）命中即整批返回，文档实测"每次 TTL 过期约 5000–7800 次 fs 探针"，且是**同步 fs 调用、跑在同一个事件循环里** ⇒ 素材目录几千文件时周期性卡顿。
- **gzip 用的是 level 1**（`lib/json-response.js:69-92`）：对 JSON 文本 level 1 与 level 9 通常差 5–15%，1MB 级 payload 值得复测。

#### 13.3.3 `config-store` 的同步原子写用**固定** `.tmp` 名

```js
// lib/config-store.js:46-71（摘）
function atomicWriteFileSync(filePath, data) {
  const tmp = filePath + '.tmp';          // ← 固定名
  …
}
// 临时名带 pid + 进程内序号：同一目标文件的并发写入者不共用同一个
// `<file>.tmp`（共用时两路并发 PUT 会互相 rename/覆盖对方半截内容）。
let atomicTmpSeq = 0;
function atomicTmpPath(filePath) { … filePath + '.tmp' + process.pid + … }
```

**同一文件里，异步版自己写下了这个危害的说明，同步版却没用它。** `writeConfig`（`:85-89`）走的正是同步版。`enqueueConfigWrite`（`:105-111`）只在**单进程内**串行 ⇒ 两个进程共用一个数据目录时（宿主 + 独立 CLI、或两个实例指向同一 `DSH_WE_DATA_DIR`）会互相吃掉对方半截内容；`writeConfig` 还是**导出**的（`:128`），任何绕过队列的直接调用都会撞同一个 `.tmp`。

#### 13.3.4 启动清扫只保护本进程 pid ⇒ 会删掉另一个实例在途的转码产物

```js
// lib/cache-prune.js:37-45（摘）
const ownTmpRe = new RegExp('\\.tmp' + process.pid + '\\d*$');
…
try { unlinkSync(join(dir, name)); } catch { /* ignore */ }
```

保护正则**只含本进程 pid** ⇒ 另一实例正在写的 `.tmp<对方pid><seq>` 会被本实例删掉，对方转码在最后 rename 前失败。注释说 "Runs once before any route is served, so nothing of the current process is ever touched"——**只覆盖当前进程**，跨进程不成立。

#### 13.3.5 三条平台的音频链路，失败时是**静默回落**而不是明确报错

- macOS：`lib/media/legacy.js:199-213` 首次使用时 `swiftc -O` 编译 `lib/audio-tap.swift`（超时 180s），失败文案"未找到 Swift 编译器（Xcode Command Line Tools）—— 安装后重试；当前回落模拟频谱"；
- Linux：`lib/media/legacy.js:107-119` 走 ffmpeg pulse monitor，需要 ffmpeg + PulseAudio/PipeWire 的 monitor 源；
- Windows：`lib/media/legacy.js:121-141` 走 ffmpeg dshow 立体声混音 / VB-Cable。

**问题不在于降级本身，而在于降级后 UI 上没有显著区分** ⇒ 用户看到"音频可视化在动"，但那与真实音频无关。**这恰好违反了本项目自己在其它地方坚持的"诚实"原则**——是全仓少见的、与其余部分风格不一致的一处。

#### 13.3.6 遮挡依赖的 `x11` 在"物化安装"下**静默失效**

`docs/wip/LINUX-OCCLUSION.md:247-251` 逐字记录了这件事：

> "**插件运行时依赖解析**：物化拷贝不带 node_modules，`import('x11')` 在实例内解析不到 ⇒ hub 按设计降级 `backend:none`（不崩）。开发机以 `npm install --no-save x11` 装进 app"

现在 `x11` 已是正式依赖（`package.json`），但**若安装形态仍不带 node_modules，每台 Linux 机器的遮挡都会静默变成 `backend:none`**，用户侧只有 `logOnce` 的一次性日志（`lib/occlusion/index.js:207`），**UI 上没有任何"遮挡不可用"的提示**。

**推断**：`x11` 本身是纯 JS 协议客户端（无原生编译），所以"装不上"不是风险，**"没被装上"才是**。

#### 13.3.7 无任何安全响应头

对 `lib/` grep `Content-Security-Policy|X-Content-Type-Options|nosniff` → **0 命中**；`Access-Control-Allow-Origin` 只有 `lib/serve.js:394`、`:459` 两处。`lib/serve.js:460-486` 会把注入的 shim / seed / focus-guard 写进宿主页面，`/scene-files` 与 `/scene-live` 会**原样吐出场景 HTML** ⇒ 一旦任何一处注入点被绕过，没有第二道防线。

#### 13.3.8 `DSH_WE_*` 环境变量可把四个写盘根劫持到任意路径

`lib/asset-paths.js:31`（`DSH_WE_UPLOAD_DIR`，**不做归一化**）、`:51-52`（`DSH_WE_ASSETS_DIR`，走 `normalize()`，两者口径不一致）、`lib/index.js:290`（`DSH_WE_DATA_DIR`）、`:317`（`DSH_WE_CACHE_DIR`）。注释写明设计用途是**测试隔离**（`lib/index.js:278-280`："自检脚本会 PUT 设置，绝不能写用户真实的那份 config.json"）⇒ **"测试便利"换来了生产面暴露**。

### 13.4 结构性 / 产品级

- **没有玻璃总开关**。全仓 grep `glassEnabled|glassOff|noGlass` → **0 命中**。用户看到的永远是"半玻璃"，没有"关掉玻璃、只留壁纸"的选项。四态共存（`full|glass-only|wallpaper-only|off`）在 ADR-0010 里写明，但**模式键在代码里不存在** ⇒ 纸面设计。
- **依赖宿主私有类名与属性名**。玻璃的"模糊"要靠 `[data-composer-card]` / `[data-question-key]` / `[class*="_bubble"]` 之类宿主源码级约定；宿主重构后**静默退化成"只有透明、没有模糊"**。第三方插件的 10 个私有类名后缀也被硬编码（`src/styles-sidebar.js:320-321`），台账在 `docs/DSH-UI-INTERFACES.md:80`。
- **没有能力声明面**。插件层没有任何"我支持什么"的机器可读清单（没有 `capabilities.json`），平台支持面只能从源码分支读出来 ⇒ 插件市场**无法在装之前告诉用户"你这台机器拿不到省电遮挡"**。
- **多标签页会后写覆盖先写**。`lib/routes/settings.js` 只注册 exact 路径 + `GET/PUT`，**无 SSE / WebSocket / 轮询 / BroadcastChannel**（全仓 0 命中）⇒ PUT 送整份 serializeSettings，且宿主无法察觉冲突。
- **宿主落盘失败静默**：`lib/config-store.js:89` catch 吞掉错误，路由仍回 200 ⇒ 用户以为存了，其实没存。
- **改 settings schema 必须重启 DSH**（`lib/settings-schema.js:37-38`）。
- **两个 DSH peer 包在代码里零 import**，靠服务注入（`ctx.webServer` / `ctx.slots` / `@deepseek-ai/dsh-client-runtime`）⇒ 契约靠约定，缺一个不报错，只是"功能不出现"。

### 13.5 低

- **崩溃残留物不在清扫范围**：上传中途断线的 `.tmp`（最大 512MB/个）与 `<数据目录>/config.json.tmp` **永久滞留**——`lib/routes/upload.js:117-119` 自己写明了"启动清扫只看 transcode/ffmpeg/preview 目录，**不扫 uploads**"。
- **`ffmpeg-err-*.log` 只在启动时清**（`lib/cache-prune.js:44`），长会话内每次 spawn 失败都留一个。
- **403 回显子路径**（`lib/serve.js:436` `forbidden-scene-files[${subpath}]`）：属信息回显（不含绝对路径），风险低，但与"无 CSP"叠加时依赖响应类型不被嗅探。
- **上传 MIME 只信请求头、不嗅探内容**（`lib/routes/upload.js:76-87`）：`Content-Type: image/png` + 任意字节 ⇒ 落盘为 `.png` 并以 `image/png` 回吐。不构成直接 XSS（浏览器 `<img>` 不解码），但**该文件成为本机上的任意字节托管点**。
- **没有死代码 / 可达性检测**：`test/verify-dead-declarations.mjs:6-12` 明确说 `src/**` 不适用（内联进同一作用域，按"本文件只出现一次"判会得到 **44 处假阳性**），而该守卫属于 **soft** 组（`test/run-guards.mjs:156-163`）⇒ **即使检出问题也不会让 CI 变红**。`src/client.js` 单文件 5,416 行 / 328KB。
- **`test/run-guards.mjs:94` 的头注释仍写"旧链 43 条"，与实际 57 步不符**——守卫自己的文档漂移。

### 13.6 一张总风险矩阵

| 维度 | 严重度 | 本质 |
|---|---|---|
| CSRF / 任意目录创建 | 高 | 边界外：宿主 HTTP 模型 + 无 Origin 校验 |
| 测试盲区（无真端到端、无 macOS CI、compat 派发制） | 高 | 边界外：需要真宿主 + 真浏览器 + 多平台 runner |
| 围栏三档不齐 | 中高 | 边界内但**没统一收口**（正确写法就在同仓） |
| 磁盘 / 内存无界、token 可逆泄露路径 | 中高 | 边界外：会话时长与素材规模不可控 |
| loopback 媒体源无鉴权 | 中高 | 边界外：本机进程模型 |
| ADR 状态双向不可信；无 ADR 覆盖"执行下载的二进制" | 中 | 边界内：流程缺陷 |
| 产物 4.54MB（52.2% base64）+ 同步注入 236KB CSS | 中 | 边界内：设计取舍已定，但**审计数值已过期** |
| 音频链路静默回落模拟频谱 | 中 | 边界内：与项目自身的"诚实"原则不一致 |
| `x11` 物化安装下静默失效、UI 无提示 | 中 | 边界外：安装形态 |
| 遮挡只在 Linux X11；无 Now Playing on Windows | 中 | 边界外：平台现实 |
| 玻璃无总开关 / 四态纸面 / 依赖宿主私有类名 | 中 | 边界外：宿主 UI 契约 |
| 文档漂移（4 处不一致 + 行号过期 + 审计数值过期） | 中低 | 边界内：人工维护的必然 |
| 无 CSP / nosniff / 安全响应头 | 中低 | 边界内：可补 |
| uploads / ffmpeg-err 残留不清理、mediaMap 无上限 | 低 | 边界内：可补 |

---

## 14. 平台覆盖矩阵

### 14.0 一句话

**壁纸本身三平台通吃，但没有任何一项高级能力是三平台齐备的。** 真正的三平台共同点只有"把一层画面铺在 DSH 聊天界面后面"这一件事；省电遮挡、系统音频元数据、本机字体枚举、媒体桥二进制，四条能力线各走各的平台路径，而且**每一平台至少缺一块**。

### 14.1 总矩阵

| 能力 | Windows | macOS | Linux | 锚点 |
|---|---|---|---|---|
| 宿主半边（Node 插件） | ✅ | ✅ | ✅ | `package.json:6-9` `engines.node >=18` |
| 浏览器半边（Web GUI 壁纸层） | ✅ | ✅ | ✅ | 渲染发生在 DSH 的 iframe 里，与宿主平台无关 |
| 场景实时渲染（WebWallGL） | ✅ 需装 `webwallgl` 包 | ✅ 同左 | ✅ 同左 | `lib/routes/scene-serve.js:98-102`（未装 → 404 `webwallgl-not-installed`） |
| 网页壁纸（HTML + 严格沙箱） | ✅ | ✅ | ✅ | `src/live-layer.js` + `lib/media-origin.js:166-170` |
| 视频壁纸转码 | ✅ `ffmpeg-win32-x64` / `-ia32` | ✅ `ffmpeg-darwin-x64` / `-arm64` | ✅ `ffmpeg-linux-{x64,ia32,arm,arm64}` | `lib/transcode.js:103-105` |
| 媒体桥（媒体元数据） | ✅ x64 原生；**ARM64 回落 x64** | ✅ `darwin-universal` | ✅ x64 走 musl 静态；arm64 需 glibc ≥ 2.34 | `lib/media/provision.js:38-52`、`:68-74` |
| 系统音频采集 | dshow 立体声混音，**无 Now Playing** | CoreAudio Process Tap（Swift 现编） | ffmpeg pulse monitor | `lib/media/legacy.js:385`、`:206` |
| **遮挡省电** | ❌ `backend:'none'` | ❌ `backend:'none'` | ✅ **仅 X11**（Wayland 一律禁） | `lib/occlusion/x11.js:21-24`、`lib/occlusion/index.js:207` |
| 本机字体枚举 | PowerShell .NET `InstalledFontCollection`（有 approximate 降级） | `system_profiler` + CoreText 两腿并集（秒级~十秒级） | `fc-list` | `lib/routes/system-fonts.js:101-133` |
| Steam 库发现 | 注册表路径 | 常见目录 | 常见目录 + WSL `/mnt` | `lib/steam-discovery.js:38`、`:118-121` |
| CI 覆盖 | ✅ `windows-latest` | ❌ **不在矩阵** | ✅ `ubuntu-latest` | `.github/workflows/verify.yml` |

### 14.2 三平台共同的部分为什么这么干净

因为**产物里没有平台相关的东西**。`lib/client.js` 是 4.54MB 的单文件（含 2.37MB base64 PNG = 52.2%），全是与平台无关的 DOM/CSS/JS；所有平台相关的二进制都是**运行期下载**：

- ffmpeg：`lib/transcode.js:167-175` 双镜像下载（`registry.npmmirror.com/-/binary/ffmpeg-static/` + GitHub `eugeneware/ffmpeg-static` releases），注释说明 npmmirror 对国内用户更快（实测 70MB 二进制约 2 分钟），且两镜像 **byte-for-byte 交叉校验**；
- media-bridge：`lib/media/provision.js:11` 四级来源（本地 → 缓存 → GitHub Release → npm dist），每个附件钉 sha256。

结果是：npm 包 81 个文件、6.28MB，**里面没有一个平台专属二进制**；平台差异全部在"下载哪一份、sha256 是多少"这层用表表达：

```js
// lib/transcode.js:103-105
win32: { x64: 'ffmpeg-win32-x64', ia32: 'ffmpeg-win32-ia32' },
linux: { x64: 'ffmpeg-linux-x64', ia32: 'ffmpeg-linux-ia32', arm: 'ffmpeg-linux-arm', arm64: 'ffmpeg-linux-arm64' },
darwin: { x64: 'ffmpeg-darwin-x64', arm64: 'ffmpeg-darwin-arm64' },
```

`lib/media/provision.js:38-52` 同构一张表，Linux x64 特意选 **musl 静态版**（`:47-48` 注释："不依赖 glibc 版本，装不上 glibc 依赖的发行版也能用"），而 arm64 只有 gnu 版（需 glibc ≥ 2.34，`:15`）。

### 14.3 「不可用」的三种表达方式——都选择诚实

这个项目在平台差异上的一致之处，是**从不把"没有"伪装成"有"**：

1. **明确报不支持**：`lib/transcode.js:231-234` 在表里查不到当前 `platform/arch` 时返回 `'unsupported platform ' + process.platform + '/' + process.arch`，而不是退回某个"大概是它的"二进制。
2. **回落但写进代码注释**：`lib/media/provision.js:60` 逐字："media-bridge-win32-arm64.exe：v0.1.5 仍未提供（CI 里是可选产物）→ Windows ARM64 走 x64 回落"，并在 `:68-74` 用回落表表达（`'media-bridge-win32-arm64.exe': ['media-bridge-win32-x64.exe']`），理由是 Windows 自带 x64 模拟。
3. **遮挡恒定声明为 none**：非 X11 环境下 `backend:'none'`（`lib/occlusion/index.js:207`），而不是返回一组猜测的窗口矩形。

同一套哲学也贯穿"能力有但结果不精确"的场景：本机字体降级路径被显式标成 `approximate`（`lib/routes/system-fonts.js:141-151`、`:236-251`），系统字体接口永不 5xx 而是回 `200 + ok:false + 原因`（`:484-492`）。

### 14.4 三个平台各自的额外负担

**Windows**
- ARM64 走 x64 回落（模拟层），性能与兼容性打折；
- 无 Now Playing（`lib/media/legacy.js:385`）；
- 遮挡完全缺席 ⇒ 大页面上省电能力为 0；
- 字体降级到注册表 + 扫字体目录，是"按文件名推"的推测级；
- 但 CI 覆盖最好——同时它也是**断言最特殊**的平台：目录链接在 win32 是 junction、在 POSIX 是 dir 符号链接，所以围栏必须用 `realpathSync.native`（JS 版在 Windows 上不解析 junction，见 4.6）。

**macOS**
- 系统音频要**运行期编译 Swift**：`lib/audio-tap.swift` 随包发布，运行期 `swiftc -O` 编到 `<dataDir>/bin/we-audio-tap`（`lib/media/legacy.js:206`）⇒ 需要 Xcode 命令行工具；这是三平台里唯一"要编译"的路径；
- 字体枚举两条腿（`system_profiler` + CoreText），冷启动**秒级~十秒级**⇒ 被迫做双层缓存 + 过期先回旧值 + 启动期不扫（见 9.12）；
- 媒体桥是 `darwin-universal` 一个产物覆盖两种架构（省事）。

**Linux**
- 遮挡只在 X11 下可用，且 **Wayland 原生与 XWayland 一律禁走**（`lib/occlusion/x11.js:46-52`：窗口域对 Wayland 合成器不透明，堆叠序残缺，宁可降级也不要假数据）⇒ 主流发行版默认 Wayland ⇒ 这项能力实际覆盖面比"支持 Linux"听起来小得多；
- 好消息是**不需要装任何 X11 库**：`x11@4.3.1` 是纯 JS、零依赖、无安装脚本（`package-lock.json:1515-1522`），仓内也没有任何 apt/libxcb 安装说明；
- media-bridge x64 走 musl 静态（Alpine/老发行版可用），arm64 要 glibc ≥ 2.34。

### 14.5 矩阵怎么读：三层保障

1. **能力探测 → 显式声明不可用**（`backend:'none'` / `unsupported platform` / 回落表）；
2. **有但不准 → 明确标注**（`approximate`、`stale:true`、`ok:false` 而不是 5xx）；
3. **差异写进代码而不是写进配置**——**没有能力清单文件**（没有 `capabilities.json` 之类），平台支持面只能从源码分支里读出来。插件市场因此**无法在装之前告诉用户"你这台机器拿不到省电遮挡"**。

### 14.6 这张矩阵暴露的三个缺口

- **macOS 不在 CI 矩阵**（`.github/workflows/verify.yml` 只有 `windows-latest` + `ubuntu-latest`）⇒ macOS 专属路径（Swift 编译、`system_profiler`、CoreText、darwin-universal）**没有任何自动验证**，只能靠人工在 mac 上跑；双平台理由本身写得很清楚——"只跑一个平台 ⇒ 另一半**零覆盖**"——但这句话没有推到第三个平台。
- **没有一个平台是"全能力"**：Windows 缺 Now Playing + 遮挡，macOS 缺遮挡 + CI，Linux 缺 Wayland 遮挡 + CI 里没有 Wayland。
- **平台能力不可声明**：插件层没有任何机制表达"我支持什么"，兼容性全部靠源码分支和文档表格；这也让第 11 章说的"官方侧有 `engines.dsh` 机读契约、第三方侧一个都没有"这条断层在这里再复现了一次。

---

## 15. 结论

### 15.1 一段话

`dsh-wallpaper-engine` 是一个**把 DSH 聊天界面变成画布**的宿主插件：它让 Wallpaper Engine 的场景（实时 WebGL 渲染 / 视频 / 作者包 / 用户导入）变成 DSH 网页半边里的一层底图，同时把宿主的"液态玻璃"做成一套可被壁纸反推着取色的设计系统。**它真正出色的地方不是功能，而是纪律**：全仓反复在做同一件事——遇到拿不准的情况，不猜、不装、不美化，而是把它变成一个可判定的状态（要么给真东西，要么明说没有），并用守卫把这个状态钉住。**它真正的短板也几乎全在边界外**：宿主 HTTP 模型、宿主私有类名、多平台现实、"文档和实现都是人写的"。

### 15.2 它到底是什么

三个定义，分别对应三种读者：

- **对普通用户**：一个"把 DSH 变成桌面"的壁纸插件 —— 装 Wallpaper Engine 的场景（或视频、自定义画面）当 DSH 的背景层，顺便把界面改成半透明玻璃；外加吉祥物立绘、音频可视化、主题随壁纸取色。
- **对插件作者**：一份**反教程**级别的工程样本 —— 99,309 行、233 个文件里，测试代码（52,716 行）比产品代码（45,271 行）还多；12 篇 ADR、43 条机器生成的路由索引、173 条字节级令牌契约、57 步硬守卫；以及一个**手写的零依赖内联器**当构建系统。
- **对架构读者**：一次**跨半边插件**的完整解剖 —— 宿主半边（Node，`lib/`）与浏览器半边（`src/`）之间只有一个面（43 条同源 HTTP 路由），唯一共享的内核（settings schema）被内联进两端以保证一致。

### 15.3 最值得抄的五件事

1. **把"不确定"变成状态，而不是变成猜测。** 删掉整条 CPU 兜底出图线（约 1 万行）换"要么给真画面、要么明确留空"；围栏判定异常时 fail-closed；设置值非法时作废而不是修剪；遮挡拿不到就恒定返回 `backend:'none'`；载荷账本读不到就回 `ok:false`（**未知**）而不是伪装成"没在动"。**这是全仓最一致的一条原则。**
2. **把"会漂的东西"变成"会红的东西"。** 路由索引、令牌契约、守卫地图全部机器生成 + 守卫回查；产物即契约且不入库（ADR-0012）；`assertNoShadowedScopeDecls()` 直接抓真实缺陷；`stripHeader()` 让报错指回原文件行号。
3. **写状态端点也要有围栏，而且围栏要分层。** `/scene-files` 的三层围栏（字面路径 → 符号链接 → `realpathSync.native` 真实路径）是一个可以直接抄的模板——**正确写法就在同一个仓里，可惜没统一收口**（第 13 章 §13.2.1）。
4. **克制。** 不用原生 `window.confirm`（棘轮按 0 钉住）、不用 `worker_threads`、不装 X11 原生库、不引入测试框架、**Wayland 宁可完全禁用也不给残缺数据**、**不替用户猜一张糊图**。
5. **在文档里写"为什么"，并把决策的状态显式化。** ADR 的判据是"实现重写后是否依然成立"，被推翻时**不改写正文**、只改 `Status`；`docs/README.md` 明确禁止"唯一的进度真源"这类台账——**需要看守的东西一律写成守卫，因为账本自己会漂、且漂了不会变红**。

### 15.4 最该补的五个洞（按性价比排序）

1. **写状态端点加 Origin 闸 + `Content-Type: application/json` 要求 + 目录白名单**（`POST /upload-dir`、`POST /we-assets-dir`）。当前可被"简单请求免预检"打到，代价是能在受害者机器上建任意目录并改上传落点。**改动量小，收益最大。**
2. **围栏统一收口**：把 `/scene-files` 的三层实现抽成一个共享函数，套到 `/we-assets` 与 `lib/scene-manifest.js` 的 `dirSceneAccess` 上。**正确写法已在同仓，缺的是统一。**
3. **给 macOS 加 CI 腿**（`macos-latest`）。`swiftc` 编译 audio-tap、`system_profiler` 字体枚举、darwin media-bridge 三条路径**目前一次都没在 CI 里跑过**，而双平台 rationale 本身就写着"只跑一个平台 ⇒ 另一半零覆盖"——这句话应该推到第三个平台。
4. **给玻璃一个真开关**，把 ADR-0010 的四态从纸面变成代码（`glass-only|wallpaper-only|coexistMode` 在全仓 `.js` 里 0 命中），并同步修正 ADR-0011 的 `Status`（已实现却写 `Proposed`）。**同时补一篇覆盖"下载并执行外部二进制（media-bridge）"的 ADR**——这是 12 篇 ADR 里的唯一真空，也是风险最高的一条边界。
5. **产物瘦身**：52.2% 的体积是 10 张 base64 PNG。把它们改成**按需拉取**（走已有的 `/we-assets` 或独立静态资源）能直接砍掉约 2.4MB，gzip 后约 1.4MB。这是第 13 章里唯一一条"既减体积又不动架构"的改进。

### 15.5 适用性判断

**适合**：
- 想要 DSH 有"桌面感"的用户（尤其用 Wallpaper Engine 生态场景的）；
- 想研究**跨半边插件**怎么写的作者（宿主半边/浏览器半边的切分、唯一接口面、schema 内联这三条极有价值）；
- 想研究**"诚实降级"工程范式**的团队。

**不适合 / 需要谨慎**：
- **Wayland 用户**（遮挡省电能力直接没有）；**Windows ARM64**（media-bridge 回落 x64）；**Windows 用户**（无 Now Playing）；**macOS 用户**（音频可视化需装 Xcode CLT，且失败时静默回落模拟频谱）；
- 机器上素材目录很大（inventory 每 3 秒全量 fs 探针 ⇒ 周期性卡顿）或经常转码长视频（4GB 缓存上限只在启动时查一次）；
- 多标签页同时开 DSH 并改设置（后写覆盖先写，无推送、无广播）。

### 15.6 一句话评价

**边界内是工程师的作品，边界外是运气。** 它把自己能控制的那部分做到了罕见的高水准——**而且是用可复核的方式做到的**（99,309 行代码、43 条机器索引、173 条字节契约、57 步硬守卫、12 篇带状态机的 ADR），但它对"宿主会怎么变""用户机器上是什么系统""别人写的文档会不会一直对"的假设过于乐观。**如果只能记一条，就是：值得读它的 ADR 与守卫，不值得照抄它的宿主耦合。**

### 15.7 本次调查的方法与可复核性

- **一手来源**：全部结论来自被调查仓 `D:\dsh-plugin\dsh-wallpaper-engine`（v1.3.3，HEAD `01fbb8b`）的源码与仓内文档，以及对 npm registry / GitHub 的直接查询；引用一律带 `<路径>:<行号>` 锚点与逐字引用。
- **并行分维度调查**：11 个维度由后台 agent 并发完成（架构 / 发现链 / WebWallGL / 视频媒体 / 玻璃 UI / 遮挡性能 / 设置预设 / 构建验证 / 字体 i18n / 生态治理 / 对抗性审计），主控另做**独立核查**（亲手跑命令测产物体积、base64 占比、gzip、npm 包清单、CI 矩阵、平台分支表）。
- **交叉核对**：凡是子 agent 与主控实测不一致的（例如 base64 占比 52.2% vs 早先记的 56.6%、gzip 2,517,081 B、路由 43 条 vs 42 处注册调用点），**一律以源码实测为准**并在正文标注。
- **未解项**：见各章末尾与第 13 章 §13.6；特别是宿主 `webServer.register` 的重复路径处理、宿主是否有本插件之外的 Origin 闸、macOS 专属路径的真实行为。
- **分维度原始报告**保留在 `.scratch/we-research/`（`01-architecture.md` … `11-adversarial.md` + `LEAD-NOTES.md` 主控核查笔记），未纳入版本控制。

### 15.8 复算命令（不依赖行号）

```powershell
# 产物体积与 base64 占比
$f='D:\dsh-plugin\dsh-wallpaper-engine\lib\client.js'
$raw=[System.IO.File]::ReadAllBytes($f); $raw.Length          # 4542261
$txt=[System.IO.File]::ReadAllText($f)
($txt -split "`n" | ? { $_ -match 'ROPE_IMG_\w+ = "data:image/png;base64' } |
  % { [System.Text.Encoding]::UTF8.GetByteCount($_) } | Measure-Object -Sum).Sum   # 2370175 (52.2%)

# gzip
$ms=New-Object System.IO.MemoryStream
$gz=New-Object System.IO.Compression.GZipStream($ms,[System.IO.Compression.CompressionLevel]::Optimal)
$gz.Write($raw,0,$raw.Length); $gz.Dispose(); $ms.ToArray().Length              # 2517081

# 构建（不需要 node_modules）
cd D:\dsh-plugin\dsh-wallpaper-engine; node scripts/build-client.mjs

# npm 包清单（会触发 prepack 构建）
npm pack --dry-run --json

# 守卫链
npm run verify          # 57 步硬档
npm run verify:docs     # 6 步软档

# 安全面自检（期望 0 命中）
Select-String -Path 'D:\dsh-plugin\dsh-wallpaper-engine\lib\**\*.js' `
  -Pattern 'Content-Security-Policy|X-Content-Type-Options|csrf|CSRF|req\.headers\.origin'

# 围栏强度三档（对照第 13 章 §13.2.1）
Select-String -Path 'D:\dsh-plugin\dsh-wallpaper-engine\lib\serve.js' -Pattern 'realpathSync'
Select-String -Path 'D:\dsh-plugin\dsh-wallpaper-engine\lib\routes\we-assets.js' -Pattern 'startsWith\(root'
```

---
