# 外部插件能力面：DeepSeek Harness 源码调研（v0.2.1-rc.2）

| 项 | 值 |
|---|---|
| 调研对象 | `https://github.com/deepseek-ai/deepseek-harness` @ `687f282`（`v0.2.1-rc.2`） |
| 本地源码根 | `D:\Temp\dsh-src`（sparse checkout，只读；本文所有 `path:line` 均相对此根） |
| 插件仓 | `D:\dsh-plugin\dsh-opencode-palette`（本文只读，不改代码；仓内路径相对该仓根） |
| 目的 | 为 V3 主题插件升级确定「第三方 npm 插件运行时到底能做什么」——即最大能力集，及其稳定性边界 |
| 方法 | 读官方文档（`docs/`）、包 README、类型定义与测试；用本插件现有实现做交叉验证 |
| 结论强度 | 每个能力标注 T1–T4，并区分证据来源：**文档** / **源码** / **测试** / **实测推断** |

> 一句话结论：**外部插件是宿主进程内的全权 Node 代码，没有沙箱、没有网络/文件白名单、没有版本以外的准入闸门**；它同时可以通过 `dsh.client` 往浏览器塞一份预构建 bundle，拿到 React 与槽位系统。但**私有协议层（`ctx.remote` 新命名空间、自定义前端路由、自定义页面）是关闭的**——那部分要么走通用 Fetch 通道自建端点，要么落在官方槽位里。

---

## 0. 一页结论（先看这张表）

| 能力 | 层 | 分级 | 结论 |
|---|---|---|---|
| 装一个 npm 包并进插件树 | 宿主 | **T1** | `dsh.bundle.patch` + `dsh plugin add`，官方教程 `docs/user/develop/basic/publish.md` |
| 读 `$DSH_HOME` / 任意路径、写文件、扫目录 | 宿主 | **T2**（`ctx.fs` 是 T1 但只有文本写） | `ctx.fs` 无 `mkdir`/`unlink`/`rename`/二进制写；直接用 `node:fs` 可以，且不受 fs 沙箱约束 |
| 起子进程（git / pnpm） | 宿主 | **T2** | `node:child_process` 直接可用；`ctx.subprocess` 是抽象 seam，取决于部署是否组合了 provider |
| 拉远端 JSON（排行） | 宿主 | **T2** | 无 `ctx.http` 服务；Node 22 全局 `fetch` 可用 |
| 注册一条宿主 HTTP 端点 | 宿主 | **T1**（`ctx.webServer`）/ **T2**（`connection.fetch`） | 两者都能注册；但 `ctx.webServer` 不在 `/api` 鉴权栅栏内，媒体/数据应走 `/api` 侧 |
| 给浏览器供本地图片/视频 | 宿主+客户端 | **T1**（`/api/file`） | 内建 `GET\|HEAD /api/file?path=<绝对路径>`，任意路径、mime-types、20 MiB 上限、**无 Range** |
| 周期任务 | 宿主 | **T1**（Cordis timer） | `ctx.setInterval` 等；没有插件级 cron seam（`schedule` 是给 Session 的提醒系统） |
| 命令面板命令 | 宿主 | **T1** | `ctx.commands` |
| 设置页里的自定义 section | 客户端 | **T1** | `settings.section` 槽位 |
| 浮动面板 / 全屏 overlay | 客户端 | **T1** | `shell.overlay`（list, root）专为此设计 |
| 自定义前端路由 / 新页面 | 客户端 | **T4** | 无 router、无 route 注册点 |
| 新 RPC 命名空间（`ctx.remote.xxx`） | 客户端 | **T4** | 生成式，只能由 dsh 仓构建期 typert 生成器产出 |
| 注册第三方主题（token 级） | 客户端 | **T1** | `ctx.theme`（`packages/client/ui-theme/README.md:42`） |
| 注入任意 CSS（玻璃/背景层/字体） | 客户端 | **T2** | 工厂里插 `<style>`，模块系统会认领并在卸载时清理；**选择器命中的是私有 DOM 结构**，那层是 T3 |
| 新语言包 | 客户端 | **T1** | `ctx.locale.addLanguage` + `register(ns, locale, dict)` |

---

## 1. 分级口径

| 级 | 定义 | 判断标准 | 失效时的表现 |
|---|---|---|---|
| **T1** | 官方文档化的 API | 出现在 `docs/` 或包 README 的 "Use this package" 里，并被至少一个内置包使用 | 文档级破坏，通常有迁移说明；跨大版本才会变 |
| **T2** | 普通 Node/Web 能力，或核心包 README 有契约但无插件作者文档 | 能跑，但不承诺兼容；靠实现细节或通用运行时 | 小版本可能悄悄改；需要回归测试兜底 |
| **T3** | 需要 hack | DOM 结构、私有 CSS 类名、未导出的内部模块、monkeypatch | 随前端改版随机坏；必须有降级 |
| **T4** | 封死 | 没有扩展点，或生成式/编译期决定 | 不可用 |

**判据补充**：本仓对「外部插件」没有专门文档页（`docs/user/develop/` 只有 config / tool / publish / dynamic-cordis）；客户端插件的正式说明散在 `packages/client/*/README.md` 与 `docs/cookbook/*.md`。因此「T1」在实践中要读成「**被内置包当契约用、并且写进了公开文档**」，而不是「有面向第三方的稳定承诺」。

---

## 2. 发现、安装、加载

### 2.1 两种包：bundle 与 profile

| 概念 | 是什么 | 出处 |
|---|---|---|
| **bundle** | 一个 npm 包，manifest 里声明 `dsh.bundle`，回答「我贡献什么」——一个 patch 文件，用来插入/覆盖插件条目 | `docs/user/develop/basic/publish.md:13` |
| **profile** | `$DSH_HOME/profiles/<name>` 下的一个目录，manifest 声明 `dsh.profile`，回答「这个组合由哪些 bundle、按什么顺序组成」 | `docs/user/develop/basic/publish.md:14`、`packages/boot/app-boot/README.md:50` |

本插件走的就是 bundle 路线（`package/package.json` 的 `dsh.bundle.patch: ./cordis.patch.yml`，patch 内容是一条 `insert` 行 `id: opencode-palette`）。这也是官方教程推荐的分发形态：**装一个包 = 给 profile 加一层 patch**，不需要用户手改任何配置文件。

### 2.2 加载顺序（patch 层）

`packages/boot/app-boot/README.md:61`：

```
bundle 各层的 cordis.patch.yml
  → profile 自己的 cordis.patch.yml
    → $DSH_HOME/cordis.patch.yml（家的层级，优先级最高）
      → --patch 覆盖层
```

同一条目在后面的层里「整段 config 替换」（不是深合并），所以后层必须把要保留的字段重述一遍。对本插件的含义：**用户在设置页里改出来的状态若写进 `$DSH_HOME/cordis.patch.yml`，就压过包内默认配置**——这正是官方设置持久化的落点。

### 2.3 安装路径

- CLI：`dsh plugin --profile <name> add <pkg|./dir|tarball>`（`docs/user/develop/basic/publish.md:5`）。
- Web UI：侧边栏 **Plugins** 页可安装/启用/停用/重试（`packages/boot/plugin-manager/README.md:31`）。
- 包管理器：由 launcher 提供（application-owned profile 自带一份，优先于 `pnpmCommand`），plugin-manager 只是调用者（`packages/boot/plugin-manager/README.md:10`）。
- 安装是**写文件 + 装依赖**的动作，不是「注册表登记」；没有中心化 white-list。

### 2.4 兼容性闸门（唯一的准入检查）

`packages/boot/app-boot/README.md:52`：导入插件前，DSH 拿插件声明的 DSH 要求比对运行时版本；**声明了 `engines.dsh` 就只由它决定**，否则回退到 `@deepseek-ai/dsh-*` 的 `peerDependencies`。

- 被拒的行会在 launcher 自己那份组合里被拒绝（不写 patch / 不改依赖清单），见 `:54`。
- 精确版本豁免写在 profile 自己的 `compatibility.json`（形如 `package@version`），不在 `package.json` 里（`:56`）。

本插件声明 `"dsh": ">=0.2.0-rc.1"`（`package/package.json`），符合上述规则。**除此之外没有代码审查、没有签名、没有权限清单。**

### 2.5 信任模型（关键结论）

| 问题 | 答案 | 证据 |
|---|---|---|
| 第三方插件是完整 Node 代码吗？ | **是**。被 Cordis loader `import()` 进宿主进程，与宿主同权限 | `packages/boot/plugin-manager/README.md:14,31`；`docs/architecture.md` 的插件树模型 |
| 有沙箱吗？ | **没有**。`engines.dsh` 只是版本闸门，不是恶意代码防线 | `packages/boot/app-boot/README.md:52` 只谈版本；fs/shell 沙箱作用于 **agent 的**工具调用，不作用于插件自身代码（`docs/subsystems/filesystem.md:5`、`docs/subsystems/sandbox.md`） |
| 有网络白名单吗？ | 没有。插件可直接 `fetch` / `net` / `child_process` | 源码中无网络策略服务（`ctx.http` 不存在，见 §4） |
| 装的时候有审批吗？ | 有「安装」这个动作的权限要求（会以 danger-full-access / 审批呈现），装完之后代码就是全权 | `packages/boot/plugin-manager/README.md:14` 的 install/remove 语义 |
| 市场内容可信吗？ | 市场是第三方内容，DSH 只校验文件格式，不校验标题/作者/来源声明 | `docs/user/guide/plugin-market.md:34` |

**给 V3 的直接结论**：安全边界只能靠「用户信任这个包」，不能靠宿主。插件若要做 `git clone`、改写用户主题目录、拉远端 JSON，务必自己写清楚、给出可关闭开关，并在 UI 上显式提示。

---

## 3. 客户端插件（`dsh.client`）

### 3.1 声明式契约

`docs/subsystems/client-modules.md:94`：包在 `package.json` 里声明 `dsh.client`，并在 `exports["./client"]` 导出**已构建**的 bundle，就进入浏览器模块表。

| 字段 | 含义 | 出处 |
|---|---|---|
| `dsh.client.platform` | 恒为 `'web'`（唯一平台） | `packages/client/AGENTS.md:66`、`client-modules.md:94` |
| `dsh.client.inject` | 包行依赖边：这些包行的工厂必须先到位，本行才 materialize；Cordis 也用同一条边排 entry 顺序 | `client-modules.md:17` |
| `dsh.client.immediately` | stage-one 预取（只有基础设施类插件该用） | `client-modules.md:17` |
| `dsh.client.external` | 额外的**非基线**模块请求（精确 specifier），由具名包行供应 | `packages/client/AGENTS.md:40` 附近、`client-modules.md:17` |
| `exports["./client"]` | 缺了就在扫描期直接抛错（不是静默跳过） | `client-modules.md:94` |

本插件：`{"platform":"web","immediately":true,"inject":["@deepseek-ai/dsh-client-ui-theme"]}`，`exports["./client"] = ./lib/client.js`。

### 3.2 构建与模块共享

**平台模块表**（`packages/client/web/src/platform.ts:9-20`，冻结表，插件 bundle 的 external 只能解析到这些 + 自己声明的 `external`）：

```
react, react/jsx-runtime, react-dom, react-dom/client, @deepseek-ai/cordis, zod,
@tanstack/react-virtual, @deepseek-ai/dsh-client-store,
@deepseek-ai/dsh-client-ui-slots, @deepseek-ai/dsh-client-ui-primitives,
@deepseek-ai/dsh-client-ui-dockkit
```

三条硬约束：

1. **必须是预构建产物**：宿主只服务构建好的 `lib/client.js`；`pnpm run build` 没产出的包会在激活期直接失败（`packages/client/modules/README.md` "Build requirements"）。
2. **必须是 lazy-CJS 工厂格式**：一个脚本注册包名与 `factory(require)`，模块体副作用（含 CSS 注入）在 materialize 时才跑（`docs/cookbook/adding-a-settings-card.md:60`）。这个格式的官方 tsdown 预设（`packages/client/tsdown.client.ts`）**不随 npm 发布**，所以 dsh 仓以外的包得自己复刻构建链（本插件用 `scripts/build-client.ts` 自建，已验证可行）。
3. **React 必须用宿主那一份**：hooks 与 React context 才能跨包工作。自带一份 React 会立刻炸（同一棵树里两个 dispatcher）。

`packages/client/AGENTS.md:40` 还写了一条**仓库策略**：feature 插件不得运行时 import 另一个 feature 插件的值。这是 dsh 仓自己的规矩，机制上拦不住外部包，但它是「怎么组合才不脆」的官方指引——跨插件协作走 `ctx.<service>`，不要 import 别人的导出。

### 3.3 客户端 `ctx` 暴露什么

客户端插件就是普通 Cordis 插件：`export const inject = [...]` + `export function apply(ctx)`（本插件 `package/lib/client.js` 末尾即 `exports.inject = ["theme","slots","locale","connection"]`）。`ctx` 上可注入的服务（`packages/client/README.md` 包表 + 各包 README）：

| ctx key | 能力 | 分级 |
|---|---|---|
| `ctx.slots` | 注册/注入 UI 槽位、声明子槽位、`registerFactory` | **T1** |
| `ctx.theme` | 主题/字号/字体：`setTheme(id)`、`register(definition)`、`overrideTokens`、`setFontSize`、`setFontFamily` | **T1** |
| `ctx.locale` | `register(ns, {zh,en})`、`bind(ns)`、`addLanguage({id,label,fallback})`、`resolveText` | **T1** |
| `ctx.connection` | 浏览器↔宿主传输：`rpc.call(...)`、generation、`browserPeer` 事实 | **T1**（"generic RPC" 写在 `packages/client/connection/README.md:12`） |
| `ctx.configForms` | 绑定宿主 Config schema 的设置表单（含 `whileServed`） | **T1**（`docs/cookbook/adding-a-settings-card.md`） |
| `ctx.shortcuts` | 键盘命令注册 | T1 |
| `ctx.modules` / `ctx.clientModules` | 模块系统自身（内核用） | 不建议外部使用 |
| `ctx.uiWorkspace` | 工作区/session 导航（fork/connect/archive/pickDirectory…） | T1，但与主题无关 |
| `ctx.resources` / `ctx.sidebarRight*` / `ctx.documentPreviews` / `ctx.feedbackUi` | 各自 feature 的扩展面 | T1（按需） |
| `ctx.get('x')` / `ctx.setInterval` / `ctx.effect` / `ctx.on` | Cordis 通用能力（含 `timer`） | T1 |

**没有的东西**（重要）：没有 `ctx.router`、没有 `ctx.routes`、没有 `ctx.modal`/`ctx.dialog` 服务、没有 `ctx.http`、没有 `ctx.fs`（浏览器侧没有文件系统）。

### 3.4 UI 挂载点：槽位

注册 API 是两参数式（`packages/client/ui-agent-preset/src/client/index.ts:266`）：

```js
ctx.slots.inject('settings.section', () => ctx.slots.register({
  name: 'settings.section',
  id: 'my-section',
  order: 20,
  label: () => ctx.locale.bind('my.ns')('nav'),
  locale: 'my.ns',
  inject: sectionInjected,
}, MySectionComponent))
```

规则（`packages/client/ui-slots/README.md`）：

- 四种 kind：`single`（独占）、`list`（有序追加）、`keyed`（按 key 派发）、`chain`（自荐接管）。
- **注册即声明**：注册某个槽位的 entry 是唯一被允许渲染该 key 的 entry；往未声明的槽位注册、重复声明子槽位、chain 缺 `select`，**在加载期抛错**。
- 每个组件收到五份框架 props：runtime / child-render / factory-render / store / business（`inject` 推导）。
- 卸载时该 entry 声明的子槽位、贡献、store 挂载一起回收（一条生命周期轴）。

对本插件有用的内置槽位（均 `scope: 'root'`）：

| 槽位 | kind | 用途 | 出处 |
|---|---|---|---|
| `settings.section` | list | 设置页左侧新增一整节（**这就是「完整设置区」的正门**） | `packages/client/ui-agent-preset/src/client/index.ts:266` |
| `settings.general.item` | list | 通用设置里的一行 | `packages/client/locale/src/client/index.ts:615` |
| `settings.plugins.tab` | — | Plugins 页里的 tab（本插件已在用） | `package/lib/client.js:24955` 注释 |
| `shell.overlay` | list | **帧级浮动层**：「a badge, a toast stack or a status pill all belong here… the additive seat for a frame-wide surface of your own」，层本身点击穿透，条目自行 opt-in 指针事件 | `packages/client/ui-layout/src/client/index.ts:105` |
| `shell.bottom` | single | 三栏下方通栏 | 同上 `:94` |
| `main` | keyed | 中央面板，按 sidebar entry id 派发；除保留 key `conversation` 外**不绑定 Session** | 同上 `:73` |
| `sidebar` / `rightbar` | single | 整列替换（会连带干掉该列声明的子槽位） | 同上 `:68,87` |

**因此**：主题管理器想要「独立一页」→ 用 `settings.section`（设置内整节）或 `shell.overlay`（浮动面板）。想要真正的新路由 → **T4**，只能靠 `shell.overlay` 里自绘全屏层伪装。

### 3.5 CSS 注入与所有权

- 模块系统在 factory 执行前后做 `<style>` 快照：factory 期间新出现的**无标记 `<style>`** 会被认领并打上 `data-plugin=<id>`，卸载时按 id 清理（`packages/client/modules/src/client/system.ts:66-82`）。→ **在插件自己的 factory 里插 `<style>` 是被支持的正常行为**（T2，接近 T1）。
- 样式值的正门是 token：`--dsw-*` 静态尺度 + `--dsw-alias-*` 语义别名，由 `ui-theme` 拥有；feature 组件**只准用 alias token，不准写字面色值**（`docs/web-styling.md:9,18`）。
- 第三方主题的唯一官方入口：`ctx.theme` 注册一个 theme id + alias-token 覆盖层，覆盖层折进 active snapshot（`packages/client/ui-theme/README.md:42`）。
- **风险点**：想给「玻璃/背景层」写 `backdrop-filter`、给侧边栏写选择器，就必须命中宿主内部的 class/结构 —— 那部分没有任何契约，属于 **T3**。本插件现在大量用 `data-*` 属性 + 结构选择器（`package/lib/client.js:21084` 起的 ui-fx 注入），是「能用但会随改版坏」的典型。

### 3.6 i18n

官方明确支持外部插件自带语言（`packages/client/locale/README.md`，示例即用 `export const inject = ['locale']`）：

```js
ctx.effect(() => ctx.locale.addLanguage({ id: 'ja', label: '日本語', fallback: 'en' }), 'my: lang')
ctx.effect(() => ctx.locale.register('common', 'ja', { cancel: 'キャンセル' }), 'my: dict')
```

- 外部 id 必须是 ASCII BCP 47 风格；`fallback` 必须已注册且链最终落到 `en`；未知目标/重复/环在注册期报错。
- 两种字典形态：typed 对象式要求 `zh`+`en` 齐全；分语言式（`register(ns, locale, dict)`）供语言包按命名空间注册。
- 查找链：活动语言 fallback 链 → 同名 `common` → 最后显示 key 本身。
- 语言选择持久化在宿主 `locale.preference`（写 `$DSH_HOME/cordis.patch.yml`）。

**分级 T1**。注意 typed 形态需要 `declare module` 合入 `LocaleNamespaceMap`——外部包做类型合并要自己 declare（运行时不受影响）。

### 3.7 客户端怎么调宿主（三条通道，别的不行）

| 通道 | 形态 | 分级 | 依据 |
|---|---|---|---|
| **① 已生成的 Remote 命名空间** | `ctx.remote.<ns>.<method>(...)`，如 `ctx.remote.settings`、`ctx.remote.workspace` | **T1** | `docs/api-gateway.md:80-82` |
| **② 自己的精确 Fetch 路由** | 宿主 `connection.fetch.register({path, methods, requestBody, fetch})` + 浏览器 `fetch('/api/<你的路径>')` 或 `ctx.connection.rpc.call('/api', '<endpoint>', payload)` | **T2**（核心包 README 有契约，无插件作者文档） | `packages/client/connection/README.md:12`、`src/client/rpc.ts:37`、`tests/fetch-routes.host.spec.ts:36-45` |
| **③ 内建 `/api/file`** | 返回绝对路径给前端，`<img src="/api/file?path=...">` | **T1** | `packages/api/session-controller/README.md:87` |

**T4 的两件事**：

- **新增 `ctx.remote.<新ns>`**：不可能。Remote 方法靠 Host `ts.Program` 上的 typert 生成器在**构建期**产出 descriptor/codec/声明合并，客户端只挂载 `api-remotes` 里被选中的那些业务包的 `/remote` 子路径（`docs/api-gateway.md:80`），"the Host methods visible to any Client assembly are limited to the Remote methods selected at generation time"（`:82`）。
- **自定义前端路由**：没有 router 抽象，页面由 `ui-layout` 的三栏 + keyed `main` 组成。

通道 ② 的细节（来自 `packages/client/connection/tests/fetch-routes.host.spec.ts:70-98`）：

- `path` **必须以 `/api` 开头**（`/outside` 直接抛）。
- `methods` 非空、不可重复（重复 `GET` 抛），`HEAD` 与 `GET` 不能同时声明（同一路径只能一个 owner 语义）。
- `requestBody: 'buffered'` 表示请求体整块进内存（`/api` 桥默认上限 300 MiB，`packages/client/connection/src/http-bridge.ts` `DEFAULT_MAX_REQUEST_BODY_BYTES`）。
- **非 owner peer 一律 403**，直到该路由自己声明访问规则（`packages/api/remote-access/README.md:83`）——所以远程访问场景要单独想清楚。
- 这条通道**不过 API Gateway**，即不享受 typert 的入参校验；校验得自己写。

本插件现在正是通道 ②：`connection.fetch.register({ path: ROUTE_PATH, methods: ['POST'], requestBody: 'buffered', fetch: routeFetch })`（`runtime/host.ts:448`，且有 `typeof register === 'function'` 的降级判断），客户端 `connection.rpc.call('/api', 'opencode-palette', {method, payload})`（`runtime/host.ts:11-12` 注释）。**这个选择是对的**，属于 T2 里最稳的一条。

### 3.8 热更新

| 事 | 行为 | 出处 |
|---|---|---|
| 启用/停用插件 | 开着的页面跟着 Host 模块图走，无需刷新；停用会等异步副作用结束再驱逐模块与样式 | `packages/client/modules/README.md` "Live plugin composition" |
| **代码**替换 | 需要 bundle watcher（`pnpm run dev:web` 或等价 watch 进程）；生产组合只挂了图传输，没有 watcher | `packages/client/hmr/README.md` "Starting the reload chain" |
| 变更检测 | 按 entry 的 `mtimeMs`/`ctimeMs`/size 算 `rev`，**不 hash 内容**；重启后同产物保持同一 rev | `docs/subsystems/client-modules.md:88` |
| 轮询 | `pollIntervalMs` 默认 500 ms | `packages/client/hmr/README.md` 配置表 |
| 版本闸门 | 页面只接受**自己启动时那个 Host release** 的图；Host 换 release 后页面不应用，只发 `releaseChange`，要刷新 | `packages/client/modules/README.md` "Host release changes" |

含义：**改 CSS/JS 后用户端不会自动拿到**，除非用户重装/重启宿主并刷新页面。想「换主题即时生效」只能靠运行时注册（`ctx.theme.setTheme` + token 层），不能靠替换 bundle。

---

## 4. 宿主侧能力清单（主题管理器视角）

| 需求 | 官方 API | 出处 | 沙箱/限制 | 分级 |
|---|---|---|---|---|
| 读文件/列目录 | `ctx.fs`: `resolve/stat/lstat/readText/streamText/readBytes/listDir/processPath/fileUrl/contains` | `docs/subsystems/filesystem.md:278,431` | 目标是不透明 `FsTarget`；`readBytes` 有 `maxBytes` 硬上限；部署可能是 `fs-sandbox`（`FS_SANDBOX_DENIED`，`:270`） | T1 |
| 写文件 | `ctx.fs.writeText/editText`（**只有文本**，带版本守卫） | `filesystem.md:445` | 无 `mkdir`/`unlink`/`rename`/二进制写 | T1（仅文本） |
| 建目录/删文件/移动/写图片 | `node:fs/promises` | 本插件 `runtime/host.ts:309-318` 自建适配层（注释：`ctx.fs` 没 mkdir/unlink，且部署的是沙箱实现） | **插件代码不受 fs 沙箱约束**，直接干 | **T2** |
| 起子进程（git） | `ctx.subprocess`（`resolveExecutable/terminalEnvironment/spawn/spawnTerminal`） | `docs/subsystems/subprocess.md:5,267` | 抽象 seam，取决部署是否组合了 provider；SSH provider 会换执行世界 | T1（seam）/ **T2**（`node:child_process` 更直接） |
| 跑 shell 命令 | `ctx.shell` | `docs/subsystems/shell.md` | 有 sandbox 模式概念（`:138`） | T1 |
| 周期任务 | `ctx.setInterval/ctx.setTimeout`（Cordis `timer`） | `docs/cordis-api/inherited.md:19` | 随插件生命周期 dispose | T1 |
| 后台长任务 | `ctx.jobs`（抽象 `JobRegistry`，producer 侧） | `docs/subsystems/jobs.md:443` | job 归属 Session，会出现在会话 UI | T1（但不适合静默 housekeeping） |
| 人类命令 | `ctx.commands.register(...)` | `docs/subsystems/commands.md:133` | 立刻执行，不走模型 | T1 |
| 设置读写 | `ctx.settings`（`SettingsForms`：`describe/update/replace/mutate`，带 revision 冲突） | `docs/subsystems/settings.md:27` | **表单 namespace = profile entry id**（`:9`） | T1 |
| 持久化 | `ctx.storage` + 声明 domain | `docs/subsystems/storage.md`、`docs/capability-seams.md:661` | 要声明 domain，有 schema/backup 策略 | T1 |
| HTTP 端点 | `ctx.webServer.register({ kind, path, handler })`，`kind` 取 `exact` 或 `prefix` | `packages/host/webserver/README.md`；seam 行 `docs/capability-seams.md:705` | 同 (kind,path) 重复直接抛；`registerFallback` 只允许一个 owner（已被 frontend-static 占）；**不在 `/api` 鉴权栅栏内** | T1（但见下） |
| 鉴权端点 | `connection.fetch.register(...)` | 见 §3.7 | 必须 `/api` 前缀；owner-only 默认 | T2 |
| 媒体预览 | 内建 `GET\|HEAD /api/file?path=` | `packages/api/session-controller/README.md:87` | 20 MiB、无 Range、无目录/类型限制、`private, no-store` + `nosniff` + sandbox CSP | T1 |
| 拉远端 | 全局 `fetch`（Node 22） | 源码无 `ctx.http`/`ctx.fetch` 服务（全仓 grep 无命中） | 无策略、无缓存、无代理感知（代理靠进程 env，见 `docs/user/guide/network-proxy.md`） | **T2** |
| 定时提醒 | `ctx.schedule`？ | 只有 Session 级 reminder 系统（`docs/subsystems/schedule.md`），不是插件 cron | 不适合 | — |

**`ctx.webServer` vs `connection.fetch` 的选择**（这条很关键，容易踩）：

- `ctx.webServer` 是**裸 HTTP**，路径随便起，但请求不经过 `/api` 的 trust/peer 检查（`packages/client/connection/README.md:47` 说的是 `/api` 的 trust 前置检查）。给浏览器读本地图片/视频这种「按路径就返回文件」的端点，裸路由等于**同源任意文件读取**，不安全也不好审计。
- `connection.fetch` 在 `/api` 墙内，天然带 cookie/peer，且有「非 owner 403」默认。数据类、媒体类都应走这条或直接复用 `/api/file`。

---

## 5. 五条能力的正式判定（a–e）

### (a) 扫描目录（带 JSON + 图片/视频资源）

**结论：T2 可用。**

- 目录结构、主题 JSON、封面图/预览视频都在磁盘上，用 `node:fs/promises` 扫 + 读即可；插件进程全权，`$DSH_HOME/opencode-palette/` 与用户目录都能碰。
- 想走官方面：`ctx.fs.listDir/stat/readText/readBytes` 可以读，但**没有 mkdir/unlink/rename，且只有文本写**；`readBytes` 还带必须的 `maxBytes`（`docs/subsystems/filesystem.md:5,278`）。所以「扫 + 生成缩略图 + 落盘」这套必然要 `node:fs`。
- 风险：无。这是最稳的一条（Node 稳定性 > dsh 稳定性）。
- 建议：把「读」尽量走 `ctx.fs`（能享受 observation/沙箱策略一致性），「写/建/删」走 `node:fs`，并在错误信息里区分二者。

### (b) 在浏览器里预览本地媒体

**结论：T1（`/api/file`）为主，自建路由为备。**

- **首选**：宿主已内建 `GET|HEAD /api/file?path=<绝对路径>`（`packages/api/session-controller/README.md:87`）。前端直接 `<img src="/api/file?path=...">` 或 `<video src=...>`。
  - 限制：**20 MiB 上限**（超出 413）、**忽略 Range**（视频不能拖进度/流式）、`mime-types` 定 Content-Type、`private, no-store`、`nosniff`、sandbox CSP。**没有目录包含检查**——任意绝对路径都能读，这既是能力也是安全隐患（插件应自行限制在自己的资产目录内）。
  - 它依赖 `connection`+`fs`+`attachments` 三者被组合；shipped web profile 有。
  - 生成期：`attachments.imageLimits.maxImageBytes` 通常 20 MiB。
- **备选**：自己注册 exact fetch 路由，`requestBody: 'buffered'`，返回完整字节。好处是能做 Range/缩略图/缓存头；代价是 T2 + 必须 `/api` 前缀 + owner-only。
- **不要**用 `ctx.webServer` 裸路由供文件（见 §4）。
- 视频体验的现实答案：要么限制在 20 MiB 内的短片，要么自建路由实现 Range（T2，工作量可控）。

### (c) 拉取远端排行 JSON

**结论：T2 可用。**

- 宿主侧没有 `ctx.http`；Node 22 全局 `fetch` 是唯一现实入口。插件代码全权，不会被拦。
- 无缓存、无重试、无代理感知的官方设施 → 这些要自己写（超时、UA、ETag、失败降级）。
- 合规/运维注意：`docs/user/guide/network-proxy.md` 说明代理靠进程环境变量；插件应尊重 `HTTPS_PROXY` 等，否则企业环境下会被静默挂死。
- 安全：远端 JSON 是外部不可信数据，**解析后必须校验 schema**（宿主不会替你校验）。
- 分级理由：能跑、无契约。属于「Node 能力」而非 dsh 能力，所以稳定性反而高。

### (d) `git clone`（提 PR 流程）

**结论：T2 可用（`node:child_process`），T1 仅在 `ctx.subprocess` 被组合时。**

- 插件进程全权，`spawn('git', [...])` 直接可用；没有审批门（审批是给模型工具调用/安装动作的，不是给运行中的插件代码的）。
- 若走 `ctx.subprocess`：它是抽象 seam（`docs/subsystems/subprocess.md:267`），`spawn(spec)` 需要 `resolveExecutable` 等；部署若用 `subprocess-ssh`，执行世界会变成远端——对 git 场景反而是坑。
- 现实约束全在 OS 层：git 是否在 PATH、Windows 的路径/引号、私有仓凭据（credential helper）、clone 体积与超时、网络代理。
- **必须自己做的**：`--depth 1`、超时、kill 树、临时目录、失败回滚、用户显式确认（这是唯一的安全边界）。
- 分级：T2。dsh 不会拦你，也不会帮你。

### (e) 玻璃/背景层 + 字体排印 CSS

**结论：拆成三层看。**

| 子能力 | 分级 | 做法 | 稳定性 |
|---|---|---|---|
| 换 token（配色/字体族/字号） | **T1** | `ctx.theme.setTheme(id)`、`ctx.theme.setFontFamily(role, value)`、`ctx.theme.setFontSize(role, px)`、`ctx.theme.register({id, tokens})` | 稳；语义别名层是官方契约 |
| 注入任意 CSS（`backdrop-filter`、渐变、伪元素背景、字体 @font-face） | **T2** | 在 client factory 里创建 `<style>`；模块系统会认领/打标/卸载清理（`modules/src/client/system.ts:66-82`） | 较稳；注入机制本身被设计支持，但「注入什么」没人管 |
| 命中宿主内部结构（`.sidebar-x`、`[data-slot=...]`、改写别人的层叠） | **T3** | 结构选择器 + `!important` + 属性钩子 | 脆；随前端改版坏，必须做「选择器失效即降级」 |

- 背景图链路：`<style>` 里 `background-image: url("/api/file?path=<绝对路径>")` 可用（同源、带 cookie）。**图片体积注意 20 MiB 上限**；想要 `image-set`/多分辨率/随主题切换，得自己拼 URL。
- 字体：本插件已自带 woff2 并用 `@font-face`（`src/fonts/*`、`src/engine/font-face.ts`）——这是 T2 的正确姿势；官方只提供「字体族名字 + 字号」接口，不提供字体文件分发。
- 玻璃层的物理限制：`backdrop-filter` 在 Chromium 上对 `position: fixed` + 大面积的合成代价高；主题插件最好把它做成可选档位（本插件 `ui-fx` 已是这个结构）。

---

## 6. 可以依赖 vs 会坏

### 可以依赖（T1，跨小版本基本不动）

| 契约 | 出处 |
|---|---|
| `dsh.bundle.patch` / `dsh.profile.bundles` / patch 分层顺序 | `docs/user/develop/basic/publish.md:13,14,29`；`app-boot/README.md:61` |
| `engines.dsh` 作为唯一版本闸门 | `app-boot/README.md:52` |
| `dsh.client` 的四个字段 + `exports["./client"]` | `client-modules.md:94`、`client/AGENTS.md:66` |
| 平台模块表里的 React/Cordis/zod/槽位/store（**名字会变，但"共享同一份 React"这个语义不会**） | `packages/client/web/src/platform.ts:9-20` |
| `ctx.slots.register/inject` 的两参形态与「注册即声明」 | `packages/client/ui-slots/README.md` |
| `settings.section` / `settings.general.item` / `shell.overlay` 这些槽位名 | `ui-agent-preset/src/client/index.ts:266`、`ui-layout/src/client/index.ts:105` |
| `ctx.theme` 的注册与 set 系列 | `packages/client/ui-theme/README.md:42` |
| `ctx.locale.addLanguage/register` | `packages/client/locale/README.md:53` |
| `/api/file?path=` | `packages/api/session-controller/README.md:87` |
| `ctx.commands` / `ctx.settings` / `ctx.jobs` / `ctx.subprocess` / `ctx.fs` 的抽象签名 | `docs/subsystems/*.md` |
| 插件是进程内全权 Node 代码（**这条不会变，只会更明确**） | `plugin-manager/README.md:14,31` |

### 会坏（T2/T3，必须有兜底）

| 风险点 | 为什么 | 兜底建议 |
|---|---|---|
| 内部 DOM 结构与 class 名 | 无契约；`ui-layout`/`ui-sidebar` 随便改 | 特性探测：目标选择器命中数 0 → 关闭该特效，不要抛错 |
| `connection.fetch.register` 的细节（`requestBody`、method 组合、403 规则） | 核心包契约，非插件 API | 注册失败时降级到「只读只写文件、前端不预览」 |
| `/api/file` 的 20 MiB / 无 Range | 内建常量，可能随 attachments 限制变 | 客户端先 `HEAD` 拿 `Content-Length`，超限走占位图 |
| `dsh.client.immediately`/`inject` 语义微调 | stage-one 预取策略属实现细节 | 不依赖时序；`apply` 内自行等待服务 |
| bundle 格式（lazy-CJS 工厂） | 官方预设未发布，外部包各自复刻 | 构建产物纳入 CI 快照（本插件已有 `verify:artifacts`） |
| Host release 变化后页面拒载 | 页面只跑 boot release 的模块（`client-modules/README.md`） | 升级提示 + 刷新引导 |
| React 版本/API | 平台表跟随宿主 | 只用稳定 hooks；不碰 `react-dom` 内部 |
| `ctx.remote.<ns>` 的可用性 | 只能挂 `api-remotes` 选中的命名空间 | 用 `ctx.get('remote')` 探测，别硬依赖 |
| 插件配置 schema | `Config` 变动会改设置页表单 | 配置带版本号 + 迁移 |

---

## 7. 需要运行时验证的未知项

源码读到这里仍不能定论的，必须在真机上打点验证：

1. **`ctx.fs` 在桌面/CLI 两套 profile 里分别是 `fs-local` 还是 `fs-sandbox`**，以及 `fs-sandbox` 对 `$DSH_HOME` 的写策略。这决定「能不能用官方 fs 写主题文件」。
2. **`/api/file` 在 desktop 壳（非 Web）里是否同样挂载**——它依赖 `connection`+`fs`+`attachments` 三者同时组合；desktop-host 可能不同。
3. **`connection.fetch` 路由在「非 loopback 访问」（局域网/远程）下的 403 行为**，以及是否需要显式 access rule（`remote-access/README.md:83` 只说了默认拒绝，没说声明方式）。
4. **`shell.overlay` 的实际层叠与 pointer-events**：文档说层点击穿透、条目 opt-in，但焦点陷阱/Esc 归属要实测（宿主有共享 modal primitive 处理 top-layer Esc）。
5. **HMR 在生产包里是否真的挂载**（`client/hmr/README.md` 说 shipped composition 挂了传输，但代码替换要 watcher）——决定「装完插件用户要不要重启」。
6. **`ctx.theme.register` 的 `tokens` 允许键集**：README 说 alias-token 覆盖，但是否只接受 `--dsw-alias-*`、非法键是忽略还是抛错，需实测。
7. **`ctx.locale` 的 typed 形态对未做 `declare module` 的外部包**是否运行时宽容（应该是，但分语言形态更稳）。
8. **`ctx.subprocess` / `ctx.shell` 在 shipped web profile 里是否存在**（不存在就只能 `child_process`）。
9. **升级后 `engines.dsh` 的拒绝是否会让整行静默消失**（`app-boot/README.md:54` 说在 launcher 副本里拒绝，UI 上如何呈现要实测）。
10. **`ctx.slots.register` 在 `settings.section` 上重复 id 的行为**（覆盖还是抛错）。

---

## 8. 对 V3 的落地建议（按能力面收敛）

1. **主题数据**：`ctx.theme.register()` 注册 token 层（T1），保留现在的 CSS 注入做「token 表达不了的东西」（T2），把「命中内部结构」的部分集中到一个可开关的 `fx` 模块并在失效时静默降级（T3 隔离）。
2. **管理器 UI**：`settings.section` 放完整管理界面（T1）；轻量浮层（当前主题名、快速切换）放 `shell.overlay`（T1）。不要试图做路由。
3. **封面/预览**：优先 `/api/file?path=`（T1），大文件/视频另开 exact fetch 路由（T2）并实现 Range。
4. **远端排行**：宿主 `fetch` + 严格 schema 校验 + 超时/代理/降级（T2）。
5. **提交主题 PR**：`child_process` 跑 git（T2），必须显式用户确认 + 超时 + 临时目录 + 失败回滚；不要把凭据写进日志。
6. **持久化**：继续用 `$DSH_HOME/opencode-palette/*.json`（T2，但完全自控）比塞进 `ctx.settings`（T1，但受 Config schema 与 entry id 约束）更灵活；如果要做「设置页里可改」，再叠一层 `Config` + `ctx.configForms`。

---

## 附录：引用索引（相对 `D:\Temp\dsh-src`）

| 主题 | 路径 |
|---|---|
| 插件打包/安装教程 | `docs/user/develop/basic/publish.md:5,13,14,29` |
| profile 组合与 patch 层 | `packages/boot/app-boot/README.md:50-61` |
| 插件管理（安装/启停） | `packages/boot/plugin-manager/README.md:10,14,31` |
| 客户端模块契约 | `docs/subsystems/client-modules.md:17,35,71,88,94`；`packages/client/modules/README.md` |
| `dsh.client` 语义与共享模块 | `packages/client/AGENTS.md:40,66,67`；`packages/client/web/src/platform.ts:9-20` |
| 客户端插件构建格式 | `docs/cookbook/adding-a-settings-card.md:60` |
| 槽位系统 | `packages/client/ui-slots/README.md`；`packages/client/ui-layout/src/client/index.ts:52-160`；`packages/client/ui-agent-preset/src/client/index.ts:266` |
| 样式与 token | `docs/web-styling.md:5,9,18`；`packages/client/ui-theme/README.md:12,28,42` |
| 本地化 | `packages/client/locale/README.md`（addLanguage 示例 `:53`） |
| 连接层（RPC/Fetch 路由/信任） | `packages/client/connection/README.md:12,34,47,51`；`src/client/rpc.ts:37`；`tests/fetch-routes.host.spec.ts:36-111` |
| Remote 生成边界 | `docs/api-gateway.md:7-82`；`docs/subsystems/web-client.md:32` |
| 媒体路由 | `packages/api/session-controller/README.md:87` |
| 文件系统 seam | `docs/subsystems/filesystem.md:5,270,278,431,445` |
| 子进程 / shell | `docs/subsystems/subprocess.md:5,267`；`docs/subsystems/shell.md:138` |
| 定时器 | `docs/cordis-api/inherited.md:19` |
| jobs / commands / settings / storage | `docs/subsystems/jobs.md:443`；`docs/subsystems/commands.md:133`；`docs/subsystems/settings.md:9,27`；`docs/subsystems/storage.md` |
| 能力 seam 总表 | `docs/capability-seams.md:621,652,661,675,685,701,705` |
| 信任/市场 | `docs/user/guide/plugin-market.md:34` |
| HMR | `packages/client/hmr/README.md`；`packages/client/modules/src/client/system.ts:66-82` |
