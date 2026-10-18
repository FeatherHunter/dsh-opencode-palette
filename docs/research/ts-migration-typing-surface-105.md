# 全项目 TypeScript 化：类型化面调研（issue #105 / wayfinder 地图 #104）

> 采样时间：2026-10-18
> 仓库：`D:\dsh-plugin\dsh-opencode-palette`（版本 2.1.3，`type: module`，Node v24.19.0）
> 宿主采样：本机 DSH `0.2.1-rc.2`（`D:\DeepseekHarness\resources\app.asar` 内 `dsh/package.json` 实测）
> 只读约束：除本文件外未修改仓库内任何文件；未执行 `npm install`、未改 `node_modules`、未跑 build/test、未 git add/commit/push。

## 1. 问题

全项目 TypeScript 化之前，必须先回答「类型化面到底有多大、有多少能靠现成 `.d.ts` 兜住、有多少只能手写」：

1. 枚举全仓无类型面并计数定位（文件:行）：DSH 插件 API（`ctx.get('connection')`、`ctx.get('timer')`、`ctx.theme/slots/locale`、`host.call(...)` 及其它 `host.` 调用）、动态版里自由变量 `host`、`window.__ModuleLoader__`、`window`/`document` 动态属性、`React.createElement`（全仓零 JSX）。
2. 核实随包依赖自带类型：`node_modules/dsh-log` 与 `node_modules/dsh-plugin-update` 的 `exports/types` 与 `.d.ts` 实际覆盖，`runtime/client.mjs`、`runtime/host.mjs` 从这两个包导入的符号是否全部有类型。
3. 外部一手来源：是否存在 DSH 官方/上游的插件 API 类型包或声明（npm `@deepseek-ai/*`、文档站点、GitHub 仓库、本机安装体），结论落在「能直接复用 / 只能手写 / 有部分可参照」。
4. 若需手写 ambient `dsh.d.ts`：给出最小面清单（接口名 + 方法签名 + 只读/可变字段）、放置位置建议、以及 DSH 0.2.x rc 升级时的核对清单与维护风险。

## 2. 方法与证据边界

### 2.1 方法

- **代码计数**：`Select-String` 在 `runtime/`、`src/`、`scripts/`、`tests/` 上按模式计数并保留行号；**排除** `node_modules/`、`.scratch/`（DSH 源码参考副本）、构建产物 `client.js` 与 `package/lib/*`。注释命中会在正文注明，不计入真实调用点。
- **随包依赖**：直接读 `node_modules/<pkg>/package.json` 的 `exports` / `types`，再读对应 `dist/*.d.ts` 的方法签名，逐一对照本仓 import 与调用形状。
- **官方类型**：`npm view` 与 registry 元数据确认版本/`types` 字段；把 tarball 拉到 `D:\Temp\npm-tarballs2\` 解包，只读 `lib/types/**/*.d.ts`（不安装、不进仓库）。
- **本机 DSH 安装体**：用 `node` 只读解析 `app.asar` 头（16 字节头 + pickle 偏移），提取 `dsh/package.json` 与 314 个 `@deepseek-ai/*` 包的 `package.json`；`app.asar.unpacked` 单独统计 `.d.ts`。
- **文档一手来源**：GitHub raw（`deepseek-ai/deepseek-harness`）、npm 包 README、官方文档站点；社区仓库只作交叉验证。

### 2.2 证据边界（硬约束）

- **没有安装 TypeScript / `@types/*`，没有跑 `tsc`**。下文所有「能否通过类型检查」都是从签名与调用形状做的静态推断，不是实测结果。
- **本机安装体不含 `.d.ts`**：`asar` 里 `@deepseek-ai` 包 0 个 `.d.ts`，因此「本机有类型可抄」这条路已被证伪；本机证据只能到「`package.json` 声明了 `types`，但文件被裁掉」。
- **官方类型包的类型闭包未实测可解析**：`ui-theme` 的 `.d.ts` import 了未在依赖中声明的 `@deepseek-ai/dsh-client-ui-settings/client`、`@deepseek-ai/dsh-host-webserver` 等（见 §5.1），未安装验证。
- **动态版 `host` 无类型、无公开源码**：只有 `dsh-cordis-client-runner` README 的文字约定，没有可引用的 `.d.ts`。
- **计数为 grep 静态计数**：动态属性访问（`window[x]`、`obj?.theme`、字符串拼服务名）未穷尽；构建产物不计入。
- 仓库行数口径与 sibling 报告一致（`docs/research/ts-migration-repo-map-108.md`：`runtime/` 7 文件 4,504 行、`src/engine` 14 文件 1,585 行）；本报告只对 `runtime/client.mjs`（1,971 行）与 `runtime/host.mjs`（437 行）逐点定位。

### 2.3 采样时的仓库状态

`git status --short` 有既存改动（`client.js`、`package/lib/client.js`、`scripts/convert-desktop-themes.mjs`、`src/engine/generate.mjs`、`src/engine/resolve.mjs`、5 个 `src/themes/*.json`、`tests/engine.test.mjs`，以及未跟踪的 `docs/research/*.md`），**均非本次调研产生**。仓库内无 `tsconfig*.json`、无 `.ts/.tsx`（除 `.scratch/` 参考副本）、`node_modules` 下无 `@types/`、无 `typescript`。

## 3. 无类型面清单

### 3.1 计数总表（仅手写源码）

| 面无类型面 | 次数 | 位置（文件:行） |
| --- | ---: | --- |
| `ctx.get(...)` 真实调用 | 6 | `runtime/client.mjs:50,393,394,583`；`runtime/host.mjs:331,424`（另有 2 处仅注释：`client.mjs:36`、`host.mjs:300`） |
| `theme.*` 服务调用 | 4 | `runtime/client.mjs:655`（`overrideTokens`）、`:691`（`getTheme`）、`:710`、`:783`（`setTheme`） |
| `slots.*` 服务调用 | 4 | `runtime/client.mjs:1929,1940`（`inject`）、`:1930,1941`（`register`） |
| `locale.*` 服务调用 | 4 | `runtime/client.mjs:587,591`（`getLocale`）、`:616`（`subscribe`）、`:623`（`register`） |
| `ctx.effect(...)` | 1 | `runtime/client.mjs:1957` |
| 动态版自由变量 `host` | 2 行（1 个分支） | `runtime/client.mjs:57-58`（`typeof host` → `host.call(phone, args)`） |
| `React.createElement`（含 `h(...)`） | 13 | `runtime/client.mjs:658,888,1370,1371,1590`；`runtime/custom-editor.mjs:200,207,552,564,627,629`；`runtime/ui-fx.mjs:94,95` |
| `React` 引用（`useState`/`useRef`/全局） | 37 | `runtime/client.mjs` 36 处、`runtime/custom-editor.mjs:243` 1 处；全局兜底 `client.mjs:30` |
| `document.*` | 23 | `runtime/client.mjs` 21 处（如 `:337,372-373,617-619,657-660,719-737,950-951,1022-1026`）；`runtime/custom-editor.mjs:597,629` |
| `window.*` | 6 | `runtime/client.mjs:912,980,981,983,984`；`runtime/custom-editor.mjs:243`（`window.EyeDropper`） |
| `globalThis.*` | 11 | `runtime/client.mjs:30,67,68,86,405,487,489,873,874,936,1962` |
| `process.*` | 4 | `runtime/host.mjs:272,325,333,334` |
| `require('react')` | 1 | `runtime/client.mjs:29` |
| `window.__ModuleLoader__` | 源码 0 / 产物 1 | 仅 `package/lib/client.js:7`（构建 banner）；根 `client.js`（动态版）无 |
| `require` / `import` 之外的裸全局 | 0 | 动态版 `host` 之外无其它注入名 |

### 3.2 明细表

| 文件:行 | 用法 | 所属 API | 是否可由依赖类型覆盖 | 需要手写声明？ |
| --- | --- | --- | --- | --- |
| `runtime/client.mjs:50` | `ctx.get('connection')`，随后 `connection.rpc.call(...)` | cordis `Context.get` + connection client | **部分**：`@deepseek-ai/cordis@4.0.5` 的 `ReflectService.get()` 返回 `any`（`reflect.d.ts:14-16`），类型不来自 `get`；connection 的 **client 侧** `Context.connection` 增强在 0.2.1 类型里未找到（`client/index.d.ts` 只增强 `Events`），只有 host 侧 `rpc-host.d.ts:7-11` 有 | 是（或引官方包 + 本地断言） |
| `runtime/client.mjs:393` | `ctx.get('theme')` | ui-theme | 可：`dsh-client-ui-theme@0.2.1-rc.2` 的 `lib/types/client/index.d.ts` 增强 `Context.theme: ThemeRuntime`；**本机未随装**，需从 npm 取 | 否（引包）/ 是（不引包） |
| `runtime/client.mjs:394` | `ctx.get('slots')` | ui-renderer（`SlotRegistry`） | 可：`dsh-client-ui-renderer@0.2.1-rc.2` 的 `lib/types/client/index.d.ts` 增强 `Context.slots`；类型闭包含 `react` | 否 / 是 |
| `runtime/client.mjs:583` | `ctx.get('locale') \|\| ctx.locale \|\| null` | locale | 可：`dsh-client-locale@0.2.1-rc.2` `client/index.d.ts:58` 增强 `Context.locale: LocaleRuntime`；但 `register(ns, dicts)` 的 2 参重载要求 `ns extends keyof LocaleNamespaceMap`（`:199`），需额外声明命名空间 | 部分（引包还要合并 `LocaleNamespaceMap`） |
| `runtime/client.mjs:655` | `theme.overrideTokens('opencode-palette', render.tokens)` | ui-theme | 可：`ThemeRuntime.overrideTokens(source: string, tokens: ThemeTokenOverrides): () => void` | 否 / 是 |
| `runtime/client.mjs:691` | `theme.getTheme()`，只读 `snap.preference` / `snap.active.preference`（`:693`） | ui-theme | 可：`getTheme(): ThemeSnapshot` | 否 / 是 |
| `runtime/client.mjs:710,783` | `theme.setTheme(pref)` | ui-theme | 可：`setTheme(id: string): void` | 否 / 是 |
| `runtime/client.mjs:1929-1936` | `slots.inject(slotTarget, () => slots.register({name,id,order,label,inject}, Panel))` | slots | **部分**：`SlotCore['register']` 是重载 + `SlotMap` 声明合并，`inject` 需是 `(...args: InjectParams) => I` 的工厂；我们传的是 `paletteApi` 函数（`client.mjs:1880`），形状对得上，但 `SlotMap` 未声明时键无类型 | 是（最小宽签名即可） |
| `runtime/client.mjs:1940-1947` | 同上，`settings.section` 入口 | slots | 同上 | 是 |
| `runtime/client.mjs:616` | `localeSvc.subscribe(notifyLocale)` | locale | 可：`subscribe(fn: () => void): () => void`（`:144`） | 否 / 是 |
| `runtime/client.mjs:623` | `localeSvc.register(LOCALE_NS, toLocaleDicts(I18N))` | locale | **部分**：2 参 typed 重载要求先声明 `LocaleNamespaceMap` 的键；否则只能落到 3 参重载（参数个数不符） | 是（或引包 + 命名空间增强） |
| `runtime/client.mjs:587,591` | `localeSvc.getLocale().active` | locale | 可：`getLocale(): LocaleSnapshot`，`active: LocaleId`（`:49-57,123`） | 否 / 是 |
| `runtime/host.mjs:331` | `timer: ctx.get('timer')` | cordis-plugin-timer | 可：`@deepseek-ai/cordis-plugin-timer@1.1.7` 增强 `Context.timer` 且 `TimerService.setTimeout(cb, delay): () => void` | 否 / 是 |
| `runtime/host.mjs:424` | `ctx.get('connection')` → `connection.fetch.register({path, methods:['POST'], requestBody:'buffered', fetch: routeFetch})`（`:430`） | connection host | 可：`rpc-host.d.ts:7-11` 增强 `Context.connection: HostConnectionHandle`；`HostConnectionFetch.register(route: ConnectionFetchRoute): () => Promise<void>` | 否 / 是 |
| `runtime/client.mjs:1957` | `ctx.effect(fn, 'dsh-opencode-palette: styles')`，返回清理器 | cordis fiber | 可：`fiber.d.ts:157` `effect(execute: () => SyncEffect, label?: string): Disposable<Promise<void>>` | 否 / 是 |
| `runtime/client.mjs:57-58` | `typeof host !== 'undefined'` → `host.call(phone, args)` | **动态版 runner 闭包** | **不能**：官方只在 README 里文字约定（`React`、`console`、`styles`、`host` 四个注入名，`host.call(method,args)` 到达自己的 host 半），无 `.d.ts` | **是（必须）** |
| `runtime/client.mjs:28-30` | `require('react')` / `globalThis.React` 兜底 | React 18 宿主全局 | **不能**：`node_modules/react@18.3.1` 无 `types` 字段，仓库也无 `@types/react` | 是（最小 3 行）或加 `@types/react@18` |
| `runtime/client.mjs:658-660,719-737` | `document.createElement('style')`、`document.head.appendChild`、`dataset.plugin`、`body.setAttribute` | DOM | 可：`tsconfig` 的 `lib: ["DOM"]` | 否（需 lib） |
| `runtime/client.mjs:617-619` | `MutationObserver` 观察 `document.documentElement` 的 `lang` | DOM | 可：lib DOM | 否 |
| `runtime/client.mjs:912,980-984` | `window.innerWidth/innerHeight`、`window.addEventListener('scroll'\|'resize')` | DOM | 可：lib DOM | 否 |
| `runtime/custom-editor.mjs:243` | `typeof window.EyeDropper === 'function'` | DOM（实验 API） | **看 TS 版本**：`EyeDropper` 是否在 `lib.dom.d.ts` 随 TS 版本而定，缺失时需 1 行 `declare` | 可能 |
| `runtime/custom-editor.mjs:597,627-629` | `doc.body`、`doc.createElement('span')`、`win.getComputedStyle` | DOM | 可：lib DOM | 否 |
| `runtime/ui-fx.mjs:94-95` | `d.createElement('style')` | DOM | 可：lib DOM | 否 |
| `runtime/host.mjs:407-411` | `new Response(...)`、`Request.json()`、`Response.json(...)` | fetch 全局（Node 18+ / undici） | 可：`@types/node` 或 lib DOM | 否（`@types/node`） |
| `runtime/host.mjs:272,325,333-334` | `process.pid`、`process.env`、`process.platform`、`process.cwd()` | Node | 可：`@types/node` | 否 |
| `runtime/client.mjs:67-68,405` | `globalThis.localStorage`、`storage: localStorage \|\| null` | DOM（Storage） | 可：lib DOM | 否 |
| `runtime/client.mjs:873-874` | `globalThis.__opencodePalette = {...}` | **本仓自定义全局** | 不能（无官方面） | 是（1 个 `declare global` 字段） |

### 3.3 结论

- 无类型面**高度集中**：DSH 服务面只有 6 个 `ctx.get` 调用点、14 个服务成员调用、1 个 `ctx.effect`；动态版 `host` 只有 1 个分支。
- 引擎层（`src/engine/*.mjs`）不依赖任何 DSH 服务，是纯函数，可独立类型化，不构成「插件 API 类型化」的阻塞。
- 真正**只能手写**的只有三类：动态版 `host`、React 最小面（或 `@types/react`）、本仓自定义全局（`__opencodePalette`）。其余要么由 `lib DOM`/`@types/node` 覆盖，要么由官方 `@deepseek-ai/*@0.2.1-rc.2` 覆盖（代价见 §5）。

## 4. 依赖包 `.d.ts` 覆盖核查（逐子路径）

### 4.1 `dsh-log@0.3.4`（devDependency，客户端与宿主半均用）

`package.json` 的 `exports` 四个子路径**全部带 `types`**：

| 子路径 | types 入口 | 本仓 import（文件:行） | 覆盖结论 |
| --- | --- | --- | --- |
| `.` | `./dist/index.d.ts` | 未使用 | 有类型 |
| `./host` | `./dist/host.d.ts` | `runtime/host.mjs:24`：`createHostLog`、`registerHostLogPhones` | 完整 |
| `./client` | `./dist/client.d.ts` | `runtime/client.mjs:21`：`createClientLog` | 完整 |
| `./node` | `./dist/node.d.ts` | 未使用 | 有类型 |

关键签名（`dist/*.d.ts` 实读）：

```ts
// host.d.ts
interface HostLog { store: LogStore; phoneNames: PhoneNameMap }
function createHostLog(deps: LogStoreDeps, configInput: HostLogConfigInput): HostLog
interface PhoneRegistry {
  has: (name: string) => boolean
  set: (name: string, handler: (args: never) => Promise<unknown>) => void
}
function registerHostLogPhones(registry: PhoneRegistry, hostLog: HostLog): PhoneNameMap

// client/types.d.ts
interface ClientHost { call: (name: string, args?: unknown) => Promise<unknown> }
interface ClientTimer { timeout: (fn: () => void, ms: number) => unknown }
interface ClientLog { log: ClientLogFn; flush: () => { ok: boolean };
  reconcileLogSwitch: () => Promise<ClientSwitchResult>;
  setLogSwitch: (enabled: boolean) => Promise<ClientSetSwitchResult>;
  logSwitch: ClientDebugSwitch /* { enabled: boolean; rev: number } */ }
```

- 本仓 `runtime/client.mjs:401-407` 传 `{ host: hostBridge, timer: { timeout }, storage }` → `ClientLogDeps` 有 `host?/timer?/storage?`，**逐字段对上，import 后无需断言**。
- `runtime/host.mjs:328-337` 传 `{ fs, timer: ctx.get('timer'), getCacheDir, getPlatform, DEFAULT_CWD }` 与 `{ pluginId, prefix, logDirName, switchFileName, eventList }` → `LogStoreDeps` / `HostLogConfigInput` **逐字段对上**（`store.d.ts`、`config/resolve.d.ts`）。
- `registerHostLogPhones(new Map(), hostLog)`：`Map<string, handler>` 结构上满足 `PhoneRegistry`（`set` 返回 `Map` 可赋给 `void` 返回位）。
- 结论：**dsh-log 四个子路径 100% 有类型，本仓用到的两个子路径调用形状完全匹配，无需 `as` 断言**。

### 4.2 `dsh-plugin-update@0.18.11`（运行时依赖，精确钉版）

`exports` 11 个子路径**全部带 `types`**：`.`→`host.d.ts`、`./panel`、`./client`、`./batch`→`host-batch.d.ts`、`./panel-batch`、`./entry`→`entry.d.ts`、`./entry-batch`、`./install-button`、`./http`、`./log`→`log/index.d.ts`、`./package.json`。

| 子路径 | 本仓 import（文件:行） | 覆盖结论 |
| --- | --- | --- |
| `.` | `runtime/host.mjs:25`：`createHostUpdate` | 完整 |
| `./entry` | `runtime/client.mjs:22`：`mountUpdateEntry` | 完整 |
| 其余 9 个 | 未直接 import（由 `entry`/`host` 内部依赖，构建期内联） | 有类型 |

关键签名（`dist/*.d.ts` 实读）：

```ts
// host.d.ts
declare function createHostUpdate(
  deps: { ctx?: unknown; logCtx?: LogSink | null; logEventList?: unknown;
          desktopPnpm?: unknown; pluginManager?: unknown;
          readerOverrides?: ReaderOverrides } | undefined,
  configInput: UpdateConfigInput,
): HostUpdate
interface HostUpdate {
  phoneNames: PhoneNames
  handlers: Record<string, (args: Record<string, unknown>) => Promise<Record<string, unknown>>>
}

// entry.d.ts
declare function mountUpdateEntry(container: UpdatePanelContainer, options: UpdateEntryOptions): UpdateEntryController
interface UpdateEntryOptions {
  pluginId: string; prefix: string
  call: (name: string, args: Record<string, unknown>) => Promise<unknown>
  variant?: 'button' | 'badge' | 'inline'; theme?: UpdatePanelTheme
  autoCheck?: 'mount' | 'never'; openOn?: 'has-update' | 'always' | 'manual' | 'direct'
  sizing?: EntrySizing; themeTokens?: UpdateThemeTokens; locale?: LocaleOption
  changelogMarkdown?: string | null /* 等 */
}
interface UpdateEntryController { refresh(): Promise<void>; open(): void; close(): void;
  label(): string; setTheme(theme): void; setThemeTokens(tokens | undefined): void; unmount(): void }
```

- `runtime/client.mjs:461-473` 调用 `mountUpdateEntry(updMountRef.current, {...})`：`update` 的 `call` 返回 `Promise<unknown>`，与我们的 `hostBridge.call` 一致；`sizing`/`themeTokens`/`locale` 字段名逐字对上，**无需断言**。
- `runtime/host.mjs:361-364` 调用 `createHostUpdate({ ctx, logCtx: { fire }, readerOverrides }, { pluginId, prefix, targetPackageName })`：`ctx?: unknown` 不要求 cordis 类型；`ReaderOverrides` 含 `runningVersion`（我们传的 `extraOverrides`）——**对上**。
- 两个**类型边界注意点**（不是缺口，是写法要求）：
  1. `mountUpdateEntry` 的 `container` 类型要求 `innerHTML: string`（非可选，`panel.d.ts`）；React ref 的 `.current` 可能为 `null`，TS 下需先窄化再传。
  2. 该包的类型刻意**结构化**（`addEventListener`/`removeEventListener` 可选、`innerHTML` 必填），所以**不强制引入 DOM lib**；但本仓浏览器半本来就要 DOM lib。

### 4.3 小结

随包的两个依赖**没有任何类型缺口**，问题全部在 DSH 自身服务面与 React/DOM 全局上。这一点把类型化工作量从「大」压到「小」：`dsh-log` 与 `dsh-plugin-update` 不需要写一份本地 shim，只需要 `npm i -D typescript @types/node` 即可让这两个 import 直接有类型。

## 5. 外部类型来源调查结果

### 5.1 官方 npm 类型包（**存在，且与宿主同版本**）

`@deepseek-ai/*` 客户端包在 registry 上是公开的，`package.json` 带 `types`，tarball 里实际包含 `lib/types/**/*.d.ts`。与 DSH `0.2.1-rc.2` 对应的版本实测如下（`npm view` + tarball 解包）：

| 包 | 版本 | types 入口 | 关键声明（实读） | 能/不能/部分 |
| --- | --- | --- | --- | --- |
| `@deepseek-ai/cordis` | 4.0.5 | `lib/types/index.d.ts` | `ReflectService.get(): any`（`reflect.d.ts:14-16`）、`fiber.effect()`（`fiber.d.ts:157,159`）、`Context`/`Service`/`Events` | **能**（但类型闭包引 `@deepseek-ai/cosmokit`、`@standard-schema/spec`） |
| `@deepseek-ai/dsh-client-ui-theme` | 0.2.1-rc.2 | `lib/types/index.d.ts`、`./client` | `class ThemeRuntime { getTheme(); setTheme(id); overrideTokens(source, tokens): () => void }`，增强 `Context.theme`、`Events['theme/change']` | **能**（tarball 内 `lib/types/client/index.d.ts` 实读）；类型闭包 import `dsh-client-ui-settings/client`、`dsh-host-webserver`、`schemastery`、`dsh-client-store`、`ui-slots`（**未在 dependencies 中声明**） |
| `@deepseek-ai/dsh-client-locale` | 0.2.1-rc.2 | 同上 | `getLocale(): LocaleSnapshot`（`:123`）、`subscribe`（`:144`）、`register`（`:199` typed / `:209` 3 参）、`bind`（`:226`） | **能**（2 参 register 需合并 `LocaleNamespaceMap`） |
| `@deepseek-ai/dsh-client-ui-slots` | 0.2.1-rc.2 | `lib/types/index.d.ts` | `SlotCore`（`register` 重载、`inject`、`entries`、`spec`…），`SlotMap`/`LocaleNamespaceMap` 声明合并点 | **能**，但类型闭包 `import type { ReactNode } from 'react'` → 需要 `@types/react` |
| `@deepseek-ai/dsh-client-ui-renderer` | 0.2.1-rc.2 | `lib/types/index.d.ts`、`./client` | `class SlotRegistry extends Service`：`inject(key, () => SlotInjectionEffect)`、`register: SlotCore['register']`、增强 `Context.slots` | **能**（类型闭包同样引 `react`） |
| `@deepseek-ai/dsh-client-connection` | 0.2.1-rc.2 | `lib/types/index.d.ts`、`./client` | `ConnectionFetchRoute{path,methods,requestBody,fetch}`、`HostConnectionFetch.register`、`ClientConnectionRpc.call(channel, endpoint, payload, signal?)`（`rpc.d.ts:254`）、`ConnectionRpcResult`（`:19-25`）、host 侧 `Context.connection` 增强（`rpc-host.d.ts:7-11`） | **能**（类型闭包引 `node:http`、`zod`、`dsh-brand`、`dsh-credentials`、`dsh-typert-protocol`） |
| `@deepseek-ai/dsh-client-ui-settings` / `dsh-client-store` / `dsh-host-webserver` 等 | 0.2.1-rc.2 | 有 types | 被上面的 d.ts 间接引用 | **部分**（要凑齐闭包） |
| `@deepseek-ai/cordis-plugin-timer` | 1.1.7 | `lib/types/index.d.ts` | 增强 `Context.timer`；`TimerService.setTimeout(cb, delay): () => void` 等 | **能** |
| 动态版 `host` | — | 无 | 只在 `dsh-cordis-client-runner` README 里文字约定 | **不能**（只能手写） |

**重要版本事实**：这些包的 dist-tag 很怪——`@deepseek-ai/dsh-client-ui-theme` 的 `latest` 仍是 `0.0.1-rc.1`，`next` 才是 `0.2.1-rc.2`；`dsh-client-ui-slots` 的 `latest` 是 `0.0.1-rc.1`。**必须用精确版本或 `next`**，`npm i` 默认会装到旧一代 API（`ThemeService`，没有 `overrideTokens`；`dsh-client-runtime` 依赖在 0.2.x 已不存在）。这是「能复用」的前提条件，也是最容易踩的坑。

### 5.2 本机 DSH 安装体（**不能直接取类型**）

- 宿主版本：`D:\DeepseekHarness\resources\app.asar` 内 `dsh/package.json` 实测 `0.2.1-rc.2`；`cordis` 4.0.5、`cordis-plugin-timer` 1.1.7、`dsh-client-ui-theme/renderer/locale/connection/ui-settings` 均为 `0.2.1-rc.2`。
- `app.asar` 里 `dsh/node_modules/@deepseek-ai/` 共 **314 个 package.json**，每个都声明了 `types`（如 theme 的 `"types":"lib/types/index.d.ts"`，`exports` 也带 `types`），但**归档内 `.d.ts` 总数为 0**（`@deepseek-ai` 包内 0；全归档的 `.d.*ts` 仅来自 `zod`/`@standard-schema/spec`）。即 **发布方构建时把 `lib/types` 裁掉了**，`package.json` 的声明成了悬空指针。
- `app.asar.unpacked` 只有原生模块（`@deepseek-ai/libreoffice-kit*`、`@img`、`node-pty`、`koffi`、`sherpa-onnx` 等），`.d.ts` 计数 0。
- 结论：**本机安装体不能作为类型来源**（不能抄、不能 `import type`），只能作为「版本号对齐」的证据。

### 5.3 DSH GitHub 仓库与文档站点（**部分可参照**）

- 仓库公开：`https://github.com/deepseek-ai/deepseek-harness`（`ui-theme/package.json` 的 `repository` 字段也指向它；GitHub API 对 `docs/subsystems` 返回 200）。
- 包 README 是权威用法文档：`https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/packages/client/ui-theme/README.zh.md` 明确写「插件通过 `ctx.theme` 注册别名 token 覆盖」「`ctx.theme.overrideTokens` 返回值」；`docs/subsystems/client-modules.zh.md`、`docs/subsystems/extensions.zh.md` 等构成插件文档面。
- 仓库里是 **TS 源码**（`packages/client/ui-theme/src/...`），类型是构建产物；`raw.githubusercontent.com/.../packages/client/ui-theme/package.json` 可读到 `types` 字段。所以「类型源码可参照」成立，但要**自己构建或手抄**，仓库不直接提供 `.d.ts` 文件。
- 文档站点 `https://deepseek-harness.github.io/deepseek-harness/` HTTP 200，但返回的是 SPA 空壳（正文只有站点标题），文档正文实际在仓库 markdown 里 → **部分可参照**（导航可用，正文要回 GitHub）。
- 社区仓库 `https://github.com/oil-oil/build-deepseek-harness-plugin`（第三方）有 `references/client-slots-and-theme.md`，交叉验证了 `ctx.slots.inject` / `ctx.slots.register` / `ctx.theme.overrideTokens` / `ctx.effect` 的用法，并链接回官方 README、Slot Catalog 源码。**只作二手参照，不作为类型依据**。
- 动态版 `host` 的一手文档在 `dsh-cordis-client-runner` README（本机安装体与 npm tarball 都有）：浏览器半拿到固定名字 `React`、`console`、`styles`、`host`，`host.call(method, args)` 到达自己的 host 半，**无 JSX / 无 TS / 无 import**。这解释了为什么这块天生没有类型。

### 5.4 结论（一句话）

**存在官方类型（`@deepseek-ai/*@0.2.1-rc.2` 发布包带完整 `lib/types`），可直接复用；但本机安装体不随装、类型闭包有多处未声明依赖、dist-tag 会装到旧一代，且动态版 `host` 完全没有类型——所以「能复用」的性价比要按项目规模算，小插件更划算的是手写一份最小 ambient（§6），只把官方 d.ts 当签名依据。**

## 6. 最小 ambient 声明清单

### 6.1 方案选择

| 方案 | 做法 | 代价 | 适用 |
| --- | --- | --- | --- |
| A. 引官方类型 | devDeps 加 `@deepseek-ai/cordis@4.0.5`、`dsh-client-ui-theme@0.2.1-rc.2`、`dsh-client-ui-slots@0.2.1-rc.2`、`dsh-client-locale@0.2.1-rc.2`、`cordis-plugin-timer@1.1.7`、`dsh-client-connection@0.2.1-rc.2`、`@types/react@18`、`@types/node`、`typescript` | 类型闭包还要 `ui-settings`/`client-store`/`host-webserver`/`dsh-brand`/`dsh-credentials`/`dsh-typert-protocol`/`schemastery`/`cosmokit` 等同版本包；dist-tag 需精确钉；theme 的 d.ts 用 `.ts/.tsx` 后缀 specifier，要 `moduleResolution: Bundler` | 团队要跟官方逐字对齐、且能接受类型依赖膨胀 |
| B. 手写最小面（推荐） | 只写本插件实际消费的 11 个接口 + 1 个全局变量，**不 import 任何 `@deepseek-ai/*`**；devDeps 只加 `typescript` + `@types/node` | 需在 DSH 升级时手工核对签名 | 2 个运行时文件、~36 个成员的小插件 |
| C. 折中 | 只引 `@deepseek-ai/cordis@4.0.5`（类型闭包最小：`cosmokit` + `@standard-schema/spec`），拿 `Context`/`effect`/`get`；theme/slots/locale/timer/connection 仍手写 | 仍要维护 6 个服务的签名 | 想少写 `ctx` 那层 |

**推荐 B**。原因：本仓是「零依赖 mini-bundler + 单文件浏览器半」的插件，类型需求集中在 36 个成员；引 A 会为了 6 个 `ctx.get` 拖进十几个 rc 包，且这些包的类型闭包本身有未声明依赖（§5.1），失败点比手写更多。

### 6.2 声明文件（`types/dsh.d.ts`）

```ts
// types/dsh.d.ts —— DSH 0.2.1-rc.2 插件受用面（最小面）
// 依据：@deepseek-ai/*@0.2.1-rc.2 的 lib/types/**/*.d.ts 与 cordis@4.0.5
//      + 本仓 runtime/client.mjs、runtime/host.mjs 的实际调用形状。
// 注意：本文件是全局脚本，不得出现顶层 import/export。

/** cordis Context 中本插件实际使用的面；`get` 用字面量重载，服务名拼错会报错 */
interface DshContext {
  get(name: 'theme'): DshThemeService | undefined
  get(name: 'slots'): DshSlotsService | undefined
  get(name: 'locale'): DshLocaleService | null | undefined
  get(name: 'timer'): DshTimerService | undefined
  get(name: 'connection'): DshConnectionService | null | undefined
  get(name: string): unknown
  /** cordis fiber.effect：执行体立即运行，返回值是清理器 */
  effect(execute: () => () => void, label?: string): unknown
  /** 动态版没有 ctx 时，某些路径只读 ctx.locale */
  readonly locale?: DshLocaleService | null
}

interface DshThemeService {
  getTheme(): DshThemeSnapshot
  setTheme(id: string): void
  /** 返回撤销覆盖的函数；官方 0.2.1 签名：overrideTokens(source, tokens): () => void */
  overrideTokens(source: string, tokens: Record<string, DshTokenModes>): () => void
}

interface DshThemeSnapshot {
  readonly preference?: string
  readonly active?: {
    readonly preference?: string
    readonly colorScheme?: 'light' | 'dark'
  }
  readonly revision?: number
}

/**
 * 官方 ThemeTokenModes 两半必填；本仓 delegated 画布会只给一半
 * （src/engine/generate.mjs:39-41），故这里放宽为可选——这是有意的分歧点。
 */
interface DshTokenModes {
  readonly light?: string
  readonly dark?: string
}

interface DshSlotsService {
  inject(key: string, factory: () => (() => void) | Iterable<() => void>): () => void
  register(options: DshSlotRegistration, component: unknown): () => void
}

interface DshSlotRegistration {
  name: string
  id?: string
  order?: number
  label?: string | (() => string)
  inject?: (...args: unknown[]) => unknown
}

interface DshLocaleService {
  getLocale(): { readonly active: string }
  register(namespace: string, dicts: Record<string, Record<string, string>>): () => void
  subscribe(listener: () => void): () => void
}

interface DshTimerService {
  setTimeout(handler: () => void, delay: number): () => void
}

interface DshConnectionService {
  readonly fetch: { register(route: DshFetchRoute): () => void }
  readonly rpc: {
    call(
      channel: string,
      endpoint: string,
      payload: unknown,
      signal?: AbortSignal,
    ): Promise<DshRpcResult>
  }
}

interface DshFetchRoute {
  path: string
  methods: readonly ('GET' | 'HEAD' | 'POST')[]
  requestBody: 'buffered' | 'streaming'
  fetch(request: Request): Promise<Response>
}

type DshRpcResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }

/** 动态版（cordis_define）runner 注入的自由变量 host；无官方 .d.ts */
interface DshHostBridge {
  call(phone: string, args: unknown): Promise<unknown>
}

declare var host: DshHostBridge | undefined

/** 本仓自定义全局（runtime/client.mjs:873-874） */
declare var __opencodePalette: Record<string, unknown> | undefined
```

### 6.3 字段依据

| 成员 | 依据 |
| --- | --- |
| `DshContext.get` 的 5 个字面量重载 | 调用点：`client.mjs:50,393,394,583`、`host.mjs:331,424`；服务名与官方一致 |
| `DshContext.effect` | 调用点 `client.mjs:1957`；语义来自 `cordis@4.0.5` `fiber.d.ts:157` `effect(execute, label?): Disposable<Promise<void>>` |
| `DshContext.locale?` | `client.mjs:583` 的 `ctx.locale` 兜底 |
| `getTheme/setTheme/overrideTokens` | 调用点 `client.mjs:655,691,710,783`；签名逐字取自 `dsh-client-ui-theme@0.2.1-rc.2` `lib/types/client/index.d.ts` |
| `DshThemeSnapshot.preference/active` | `client.mjs:693` 只读这两个字段（`snap.preference !== undefined ? ... : snap.active.preference`） |
| `DshTokenModes` 可选 | **故意偏离官方**：官方两半必填，但 `src/engine/generate.mjs:39-41` 在 delegated 画布下只写 `{dark}` 或 `{light}`；若引官方类型，这里会先报错 |
| `inject/register` | 调用点 `client.mjs:1929-1936,1940-1947`；`inject` 是「返回注册/清理器的工厂」这一形状取自官方 `SlotRegistry.inject` |
| `register` 的 `name/id/order/label/inject` | 调用点同上的对象字面量；`label` 支持函数（`client.mjs:1934` `function () { return tr('panelName') }`） |
| `getLocale().active` | `client.mjs:587,591`；官方 `LocaleSnapshot.active: LocaleId` |
| `locale.register(ns, dicts)` | `client.mjs:623`；官方 2 参 typed 重载，这里放宽 `ns: string` 以避免声明 `LocaleNamespaceMap` |
| `timer.setTimeout` | `host.mjs:331` 把 `ctx.get('timer')` 传给 dsh-log 的 `LogTimer`；官方 `cordis-plugin-timer@1.1.7` 有 `setTimeout(cb,delay): () => void` |
| `connection.fetch.register` | `host.mjs:430`：`{path: ROUTE_PATH, methods: ['POST'], requestBody: 'buffered', fetch: routeFetch}`；逐字段对照 `connection` `rpc.d.ts` 的 `ConnectionFetchRoute` |
| `connection.rpc.call` | `client.mjs:41`：`rpc.call(CHANNEL, ENDPOINT, { method, payload })`；返回 `res.ok`/`res.value` 对应 `ConnectionRpcResult`（`rpc.d.ts:19-25`） |
| `host.call` | `client.mjs:58`；README（`dsh-cordis-client-runner`）文字约定 |
| `__opencodePalette` | `client.mjs:873-874` 写入、`:1962` 删除 |

### 6.4 放置位置与 tsconfig

- 文件：`types/dsh.d.ts`（新建目录）。**不要用 `typeRoots`**：`typeRoots` 只影响 `node_modules/@types` 风格的包目录解析，单个全局声明文件靠 `include` 纳入即可。
- `tsconfig.json`（阶段 1，仅类型检查、不改运行时）：

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["node"],
    "allowJs": true,
    "checkJs": false,          // 先不铺开：逐文件加 `// @ts-check`
    "noEmit": true,
    "strict": false,           // 迁移期先关，避免一次性 200+ 错误
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": [
    "types/**/*.d.ts",
    "runtime/**/*.mjs",
    "src/**/*.mjs",
    "scripts/**/*.mjs",
    "tests/**/*.mjs"
  ]
}
```

- 使用方式：在 `runtime/host.mjs` 的 `apply` 上加 `// @ts-check`，把 `ctx` 标注为 `DshContext`（JSDoc `@param {DshContext} ctx`），`ctx.get('connection')` 就会得到 `DshConnectionService`，`connection.fetch.register` 的字段会被检查；`client.mjs` 同理，`ctx.get('theme')` 得到 `DshThemeService`。
- 阶段 2（改名 `.ts`）时：`checkJs` 改 `true`、`strict` 逐步打开；`build-client.mjs` 是自研 mini-bundler（`scripts/build-client.mjs:128-130` 用正则解析 import，`:339` 原样读 `host.mjs`），**它不理解 TS 语法**，所以改名前必须先给 `readSource` 加类型剥离（`typescript.transpileModule`）或改走 `tsc` 产物，否则构建直接坏。

## 7. 维护风险与升级核对清单

### 7.1 风险

1. **pre-1.0 API 漂移**：DSH 仍是 `0.2.x-rc`，`ThemeRuntime`/`SlotRegistry`/`LocaleRuntime` 的方法在 0.0.1 → 0.2.1 之间已经换过一代（`ThemeService` → `ThemeRuntime`，`overrideTokens` 是后加的）；手写声明一旦落后，`ctx.get` 的 `any` 会让漂移**静默通过**编译。
2. **dist-tag 陷阱**：`latest` 指向 `0.0.1-rc.1`，`next` 才指向 `0.2.1-rc.2`；任何 `npm i @deepseek-ai/...` 的默认行为都会装到旧一代。
3. **本机安装体无类型**：asar 裁掉 `lib/types`，所以不能在本地 `import type`，也没有「宿主自带」的兜底。
4. **类型闭包含未声明依赖**：`ui-theme` 的 `.d.ts` 引 `ui-settings/client`、`dsh-host-webserver`，`locale` 引 `package-manifest`，`connection` 引 `dsh-brand`/`credentials`/`typert-protocol`——这些都不在各自 `dependencies` 里；方案 A 会连锁要求装一串 rc 包。
5. **`.ts/.tsx` 后缀 specifier**：官方 d.ts 内部 `from './locales.ts'`、`from './AppearanceRow.tsx'`，需要 `moduleResolution: "Bundler"`（或 `node16` + 相关开关），与 Node 原生 ESM 解析不同。
6. **`react` 无类型**：`react@18.3.1` 不带 types，仓库也没有 `@types/react`；官方 `ui-slots`/`ui-renderer` 的 d.ts 却 `import type { ReactNode } from 'react'`——引它们就必然要补 `@types/react`。
7. **官方 token 类型比运行时严**：官方 `ThemeTokenOverrides` 要求 `{light,dark}` 两半，本仓 delegated 画布只给一半（`generate.mjs:39-41`）。若照抄官方类型，先要决定「改代码补两半」还是「声明放宽」。
8. **动态版天生无类型**：`host` 是 runner 闭包的参数名，不在任何 `.d.ts` 里；只能靠 README + 手写 `declare var host`，且它与 `@deepseek-ai/dsh-cordis-client-runner` 类型里的 `DynamicCordisClosureEnv.invoke` 命名不同（一个是 `host.call`，一个是 `invoke`），不要混。
9. **构建链约束**：mini-bundler 零依赖、按正则解析 import；TS 化必须同步改 `scripts/build-client.mjs`，且 `engines.node >= 22` 意味着不能假设 Node 原生 type stripping（Node 22 需 flag，Node 24 才默认）。
10. **手写声明的腐化**：没有 CI 对照官方 d.ts，签名会随 DSH 升级悄悄过期；需要把「核对官方 d.ts」写进发布 checklist（见 7.2）。

### 7.2 DSH 0.2.x rc 升级核对清单

1. **确认宿主版本**：读 `D:\DeepseekHarness\resources\app.asar` 内 `dsh/package.json` 的 `version`（或等价的安装体路径），记录到声明文件头注释。
2. **拉同版本官方声明**：`npm view @deepseek-ai/dsh-client-ui-theme@<host版> version`；再 `npm pack` 解包确认 `lib/types/**` 存在（不要只看 `types` 字段，asar 已经证明字段会悬空）。
3. **逐服务 diff 签名**（本仓用到的 36 个成员）：
   - `ThemeRuntime.getTheme/setTheme/overrideTokens`
   - `SlotRegistry.inject` / `SlotCore.register`
   - `LocaleRuntime.getLocale/register/subscribe`
   - `TimerService.setTimeout`
   - `HostConnectionHandle.fetch.register` / `ClientConnectionRpc.call`
   - `Context.get` / `Context.effect`（cordis 主版本，peer 是 `~4.0.5`）
4. **核对服务键名**：`'theme'/'slots'/'locale'/'timer'/'connection'` 是否仍是这些字面量；`ctx.get` 返回 `any`，键名改名不会有编译错误，只能靠人眼。
5. **核对动态版闭包文档**：重读 `dsh-cordis-client-runner` README 的「固定名字」段落，确认仍是 `React`、`console`、`styles`、`host`，且 `host.call(method,args)` 语义未变。
6. **核对 dist-tag**：`npm view <pkg> dist-tags`，确认要用的版本不是只挂在 `next` 上；写进 devDeps 时用精确版本。
7. **核对随包依赖**：`npm run deps:check` 硬门禁（`dsh-plugin-update` 钉 `0.18.11`、`dsh-log` `0.3.4`）必须仍绿；升级这两个包后重读 `dist/*.d.ts`，确认 `createHostLog`/`createHostUpdate`/`mountUpdateEntry` 签名未变。
8. **`npm run typecheck` + `npm test` + 实机加载**：类型检查通过不等于运行时通过；至少验证「设置页两个入口注册、主题切换、locale 切换、宿主半路由、更新入口」五条路径。
9. **记录偏差**：把「我们故意放宽的签名」（`DshTokenModes` 可选、`locale.register` 放宽 `ns: string`）列进声明文件头注释，升级时逐条复核是否还需要放宽。
10. **决定是否切换方案**：若某次升级后手写声明连续两次对不上，或团队要接第二个 DSH 插件，再评估切到方案 A（引官方 types）。

## 8. 证据缺口

1. **未实测类型检查**：没有 `typescript`、没有 `tsc`，全部「能/不能覆盖」是签名比对结论；官方类型能否与我们的 `.mjs` 在 `checkJs` 下共存（尤其 `ctx.get` 重载、`Iterable` 清理器、`Request/Response` 双 lib 冲突）未验证。
2. **官方类型闭包未实测可解析**：`ui-theme`→`ui-settings/client`、`dsh-host-webserver` 等未声明依赖是否都能以 `0.2.1-rc.2` 装上、是否互相兼容，未安装验证。
3. **本机安装体与发布 d.ts 的一致性只有版本号证据**：asar 内代码与 npm tarball 的 `lib/types` 是否逐字对应，未做 diff（无法 diff，因为本机没有 d.ts）。
4. **动态版 `host` 的精确运行时形状**：只有 README 文字，没有 runner 源码/类型；`host.call` 的返回结构（是否 `{ok,value}` 还是裸值）依赖 `client.mjs:41-42` 的本地处理，未在真实动态包里验证。
5. **`EyeDropper` 是否在目标 TS 版本的 lib.dom 中**：取决于将来装的 `typescript` 版本，未验证；若缺失需 1 行 `declare`。
6. **计数口径**：grep 静态计数不含动态属性访问、模板拼接的服务名、注释里的示例；`document.*`/`window.*` 的 21/5 处按当前工作树计数，与 `docs/research/ts-migration-repo-map-108.md` 的总行数口径可能有 ±1 的漂移。
7. **未核对 `cordis@4.0.5` 的 `Context` 完整成员**（如 `inject`/`provide`/`on`）：本插件没用到，但若迁移中改用 `ctx.on('theme/change')` 或 `ctx.inject`，需要补声明面。
