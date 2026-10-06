# dsh-plugin-update 最新包最小集成接口（一手来源研究，回答 #50）

- 版本日期：2026-10-06（Asia/Shanghai）
- 本仓：`D:\dsh-plugin\dsh-opencode-palette`（`package.json: name=dsh-opencode-palette, version=2.0.16`，`dependencies: dsh-plugin-update ^0.3.0`）
- 包版本：本地已安装 `0.3.1`（`node_modules/dsh-plugin-update/package.json: version`）；npm 官方源 latest `0.5.2`（2026-10-05 发布，见 §1）
- 方法：只认一手来源（包内 `README.md` / `CHANGELOG.md` / `package.json` exports 表 / `dist/*.js` + `dist/*.d.ts` / registry 元数据 / 本仓 `runtime/*.mjs` 仅作差量对照）。下文每个结论标注“文件 + 关键符号/字符串”，不编行号，不引二手博客。
- 缺失声明：`^0.3.0` 覆盖不到 latest（见 §1）；§6 标注哪些结论超出 `^0.3.0` 范围。

## 目录

- [0. 结论总表（最小集成清单）](#0-结论总表最小集成清单)
- [1. 包版本事实](#1-包版本事实)
- [2. 宿主最小集成](#2-宿主最小集成)
- [3. 客户端最小集成](#3-客户端最小集成)
- [4. 自带弹窗按钮（一点即弹窗）](#4-自带弹窗按钮一点即弹窗)
- [5. 本仓八种 blocked 原因码与待重启横幅：覆盖对照](#5-本仓八种-blocked-原因码与待重启横幅覆盖对照)
- [6. 版本差量：0.2.0→0.3.x，以及 latest 0.5.2 前瞻（超范围）](#6-版本差量02033x以及-latest-052-前瞻超范围)
- [7. 不确定项 / 待澄清问题](#7-不确定项--待澄清问题)
- [附录：复现命令](#附录复现命令)

## 0. 结论总表（最小集成清单）

| # | 侧 | 最小接口 | 来源 |
|---|---|---|---|
| H1 | 宿主 | `import { createHostUpdate } from 'dsh-plugin-update'`（exports `"."` → `dist/host.js`） | 包 `package.json: exports`；`dist/host.d.ts: createHostUpdate` |
| H2 | 宿主 | 第二参只传 `{ pluginId, prefix, targetPackageName }`（`pluginId` 必填；其余走默认）；第一参 `{ ctx, logCtx }`；`readerOverrides` 只在自动解析对不上时传 `targetPackageDir` | 包 `README.md` §2 第 2 步；`dist/config.d.ts: UpdateConfigInput`；`dist/host.d.ts: ReaderOverrides` |
| H3 | 宿主 | 不传 `readerOverrides.environmentKind / profileDir / profileName`（传了即挡住自动探测，升级要改代码）；`runningVersion` 可传（本仓现状） | 包 `README.md` §“升级本包”两处例外；`dist/host.js: getSharedReader`（`overrides.environmentKind ?? detectEnvironmentKind(…)`；`if (overrides.profileDir)` 直用跳过反推） |
| H4 | 宿主 | 电话名从 `update.phoneNames` 读（`prefix + '.' + 动作名`，三电话 `updateStatus / updateCheck / updateInstall`），不自己拼字符串 | 包 `README.md` §2；`dist/config.js: buildPhoneNames / PHONE_ACTIONS` |
| C1 | 客户端 | 不存在 `dsh-plugin-update/config` / `dsh-plugin-update/commands` 子路径导入（exports 表无此两项）；浏览器侧走“构建期打包 `dist/client.js` 一次” | 包 `package.json: exports`（仅 `.` `./panel` `./client` `./batch` `./panel-batch` `./entry` `./http` `./package.json`）；`README.md` §8“客户端入口（`dist/client.js`，构建期打包用）” |
| C2 | 客户端 | 电话名与轮询间隔从包函数派生：`buildClientPhoneNames(prefix)`（= `buildPhoneNames(prefix)` 同一套）＋ `CLIENT_POLL.defaultMs/minMs`（1000/250）；构建命令 `derive-client-values.mjs --prefix … --out …`（`--prefix` 必填须与宿主一致，`--out` 必填无默认值） | `dist/client.js: buildClientPhoneNames / CLIENT_POLL`；`derive-client-values.mjs: --prefix/--out/dry-run` 用法注释 |
| C3 | 客户端 | 轮询下限 250ms（低于抛错不静默取整）：`assertPollInterval` / `resolveUpdateConfig` 内 `panelPollMs < MIN_PANEL_POLL_MS` 抛错 | `dist/client.js: assertPollInterval`；`dist/config.js: MIN_PANEL_POLL_MS` |
| E1 | 客户端 | “一点即弹窗按钮” = `mountUpdateEntry`（`dsh-plugin-update/entry`，`dist/entry.js`），默认 `variant 'button' + autoCheck 'mount' + openOn 'has-update'`；点击先调一次 `updateCheck`，有新版才开 dialog（包内 `mountUpdatePanel` 的 `mode 'dialog'`），无新版原地 `已是最新 <running>` 不弹窗 | `dist/entry.d.ts: UpdateEntryOptions / EntryVariant / EntryAutoCheck / EntryOpenOn`；`dist/entry.js: activate / entryLabelFor / entryStateKind` |
| E2 | 客户端 | 按钮文案唯一出处 `entryLabelFor`：`检查更新` / `有新版 X.Y.Z` / `正在安装…` / `待重启` / `更新失败，点此查看`；状态优先级：活任务 installing/verifying ＞ 待重启 ＞ 失败 ＞ 有新版 ＞ 空闲 | `dist/entry.js: LABEL_IDLE / LABEL_FAILED / LABEL_BUSY / LABEL_RESTART / entryStateKind` |
| P1 | 面板 | 整组件 = `mountUpdatePanel`（`dsh-plugin-update/panel`），`mode 'embedded'` 默认内嵌、`'dialog'` 切弹窗，同一内核；14 码中文（8 阻塞 `BLOCKED_COPY` ＋ 5 电话 `PHONE_FAILURE_COPY` ＋ `internal`，未来码 `UNKNOWN_FAILURE_COPY` 兜底并带原码） | `dist/panel.js: BLOCKED_COPY / PHONE_FAILURE_COPY / UNKNOWN_FAILURE_COPY / failureCopy / isKnownFailureCode`；`dist/panel.d.ts: UpdatePanelOptions / UpdatePanelController` |
| P2 | 面板 | 待重启横幅三条硬要求：显眼单独展示、文案含新版号＋重启生效、期间不给安装按钮（`canInstall` 已为假）；“重启宿主”入口默认只提示手动重启，可传 `onRestartRequested` 接入 | 包 `README.md` §5.4；`dist/panel.d.ts: onRestartRequested` |

最小宿主接线示例（本仓取值：`runtime/channel.mjs: PLUGIN_ID / PHONE_PREFIX / TARGET_PACKAGE_NAME`)：

```js
import { createHostUpdate } from 'dsh-plugin-update'

const update = createHostUpdate(
  { ctx, logCtx },
  {
    pluginId: 'dsh-opencode-palette',
    prefix: 'palette',
    targetPackageName: 'dsh-opencode-palette',
  }
)
// 电话名从 update.phoneNames 读，不要自己拼字符串。
for (const [name, handler] of Object.entries(update.handlers)) {
  registry.set(name, handler)
}
// 得到：palette.updateStatus / palette.updateCheck / palette.updateInstall
```

最小客户端接线示例（派生优先；直接引用包入口亦可）：

```sh
# 构建期生成常量（--prefix 必须与宿主侧一致；--out 故意无默认值）
node node_modules/dsh-plugin-update/derive-client-values.mjs --prefix palette --out scripts/generated/updateClient.derived.js
```

```js
// 生成的常量直接用，不写字面量
import { UPD_STATUS, UPD_CHECK, UPD_INSTALL, UPD_POLL } from './updateClient.derived.js'
host.call(UPD_STATUS, {})
host.call(UPD_CHECK, {})
host.call(UPD_INSTALL, { checkId, requestId })
setInterval(readStatus, UPD_POLL)
```

最小“一点即弹窗”挂载示例：

```js
import { mountUpdateEntry } from 'dsh-plugin-update/entry'

const entry = mountUpdateEntry(document.getElementById('upd-entry'), {
  pluginId: 'dsh-opencode-palette',
  prefix: 'palette',          // 与宿主侧一致；电话名从它算出
  call: (name, args) => host.call(name, args),
})
// 离开时 entry.unmount()。铁律：入口件只做“查 + 打开面板”，任何路径都不自动安装。
```

## 1. 包版本事实

- 本地已安装版本：`0.3.1`。来源：`node_modules/dsh-plugin-update/package.json: version`（包内 `README.md` 首节亦声明当前版本 `0.3.1`)。
- npm 官方源 latest：`0.5.2`。来源：registry `https://registry.npmjs.org/dsh-plugin-update` 的 `dist-tags.latest`（本次用 `web_fetch` 整包元数据＋ `pwsh Invoke-RestMethod` 复核 `dist-tags`，均为 `0.5.2`）。
- 发布时间线（registry `time` 字段，`pwsh` 实测）：`0.3.0` 2026-10-04、`0.3.1` 2026-10-05、`0.4.0` 2026-10-05、`0.5.0` 2026-10-05、`0.5.1` 2026-10-05、`0.5.2` 2026-10-05。版本全集共 10 个：`0.1.0 / 0.1.1 / 0.1.2 / 0.2.0 / 0.3.0 / 0.3.1 / 0.4.0 / 0.5.0 / 0.5.1 / 0.5.2`。
- `^0.3.0` 覆盖关系：按 semver 覆盖 `>=0.3.0 <0.4.0`，即仅 `0.3.0 / 0.3.1`。本地 `0.3.1` 已是该范围内最新（0.3.x 无更新）；但 latest `0.5.2` 在范围外，本仓声明按现状拿不到 latest。连带影响：ADR 0002 的构建前硬门禁（`scripts/check-deps.mjs` “范围盖不住 latest 拦”）在联网构建时会拦，需由 #52 决定升范围（见 §6 前瞻）。
- 本仓声明位置：根 `package.json: "dsh-plugin-update": "^0.3.0"`（另有 `scripts/deps:sync` 走官方源 `npm update`＋重跑门禁）。

## 2. 宿主最小集成

### 2.1 `createHostUpdate` 完整签名

来源：`dist/host.d.ts: createHostUpdate / ReaderOverrides / HostUpdate`。

```ts
createHostUpdate(
  deps: { ctx?; logCtx?; desktopPnpm?; pluginManager?; readerOverrides?: ReaderOverrides } | undefined,
  configInput: UpdateConfigInput,
): HostUpdate  // { phoneNames: Record<PhoneAction, string>; handlers: Record<string, handler> }
```

- `deps` 整体可为 `undefined`，五个键全可选。`ctx` 用于探测宿主种类与取 `pluginManager/desktopPnpm`；`logCtx.fire(level, event, fields)` 为空则不记（类型 `LogCtx = {...} | null`）。
- `configInput`（来源 `dist/config.d.ts: UpdateConfigInput`)：仅 `pluginId` 必填（非空、不含 `/` `\`，否则抛错，见 `dist/config.js: assertPluginId`)；其余全可选且有默认：`prefix` 默认 `'wf'`（`dist/config.js: DEFAULT_PREFIX`，新插件务必传自己的）、`targetPackageName` 默认 `'dsh-mattpocock-skills-deck'`（历史遗留默认，本仓传自己包名）、`registryUrl` 默认官方源、`checkTimeoutMs` 10000、`confirmationTtlMs` 600000、`installTimeoutMs` 900000、`panelPollMs` 1000（不得小于 250，见 `dist/config.js: MIN_PANEL_POLL_MS`)、`releaseChannel` 默认 `'stable'`（显式 `'prerelease'` 才收预发布精确版）。
- 三个电话的入参与回参（来源 `README.md` §2 “三个电话的入参与回参”）：`….updateStatus({})` → `{ ok:true, snapshot, manual, receipt:null }`；`….updateCheck({})` → `{ ok:true, snapshot, manual, receipt }`（`receipt={checkId,checkedAt,expiresAt}`)；`….updateInstall({checkId,requestId})` → `{ ok:true, snapshot, manual, receipt:null }`；失败一律 `{ ok:false, error, errorKind, diag? }`（分支只认 `errorKind`，`diag` 可选、恒 ≤1KB，旧面板忽略）。

### 2.2 `readerOverrides` 每个字段是否必传

结论：全部可选（`dist/host.d.ts: ReaderOverrides` 全为可选键）。与最小集成相关的关键字段行为（来源 `dist/host.js: getSharedReader`)：

| 字段 | 传了会怎样 | 来源 |
|---|---|---|
| `runningVersion` | 优先采用；不传则从按包名解析到的目标包 manifest 读（须通过通道校验），读不到抛 `unknown-profile` | `dist/host.js: getSharedReader`（`overrides.runningVersion ?? (loaded && …)`；无版本 `throw unknownProfile()`） |
| `targetPackageDir` | 优先于按包名自动解析（hoisted、多副本、开发态链接的逃生口）；README 原话“平时不用管，只有自动解析对不上时才用” | `README.md` §2；`dist/host.js: explicitTargetDir` |
| `environmentKind` | 跳过自动探测（`overrides.environmentKind ?? detectEnvironmentKind(…)`），直接决定安装路由选择；README 升级节列为“两处例外必须动代码”之一（传了就挡住自动探测） | `README.md` §“升级本包”；`dist/host.js: getSharedReader` |
| `profileDir` | `if (overrides.profileDir)` 直接采用，跳过“按目标包位置反推使用范围目录”；该值进单例键、落盘与队列目录；与真实使用范围不符会导致状态/安装落错位置（同为升级节例外） | `dist/host.js: getSharedReader`（`profileDirInput` 分支）；`README.md` §“升级本包” |
| `profileName` | 参与单例键与 `detectEnvironmentKind`（`pluginManager.installBundle` 存在且名大小写不敏感等于 `desktop` 才判 `desktop-manager`)；面板“装到哪个范围”展示经 `includeEnv` 另取，不从此直读 | `dist/host.js: detectEnvironmentKind / cliRefusesProfile / getSharedReader` |
| 其余（`env/osHome/homeDir/fetchImpl/now/randomId/nodeVersion`、超时与通道覆盖、队列/锁/任务假件、`runInstall/subprocess/desktopPnpm/desktopProfiles/pluginManager/runtimeExecutable/cliEntry`) | 测试与特殊宿主注入点；不传走默认（真时钟、真磁盘、自动探测）。`pluginManager` 显式传入即覆盖“从 `ctx` 现取” | `dist/host.d.ts: ReaderOverrides` 全表 |

### 2.3 `update.phoneNames` 派生方式

- 电话名 = 前缀 + 点 + 动作名（来源 `dist/config.js: buildPhoneNames`：`updateStatus: prefix + ".updateStatus"` 等三行；动作全集 `dist/config.js: PHONE_ACTIONS = ["updateStatus","updateCheck","updateInstall"]`)。
- 宿主侧返回值 `update.phoneNames` 即该映射（来源 `dist/host.d.ts: HostUpdate`)；客户端有同一套拼法 `buildClientPhoneNames(prefix)`（来源 `dist/client.js`)，README 要求两侧前缀一致，否则调不通（来源 `README.md` §2 第 3 步 `--prefix` 必填说明）。

## 3. 客户端最小集成

### 3.1 config / commands / client 三个入口各自导出什么

注意：以下“入口”指 `dist/` 下的模块文件；包 `exports` 表**未导出** `./config` 与 `./commands` 子路径（见 §3.2）。

- `dist/config.js`（来源 `dist/config.d.ts`)：常量 `DEFAULT_PREFIX='wf'`、`PHONE_ACTIONS`、`DEFAULT_TARGET_PACKAGE`、`DEFAULT_REGISTRY`、落盘文件名（`STATE_FILE/LOCK_FILE/BACKUP_FILE/SKIPPED_FILE`)、超时与轮询默认（`DEFAULT_CHECK_TIMEOUT_MS / DEFAULT_CONFIRMATION_TTL_MS / DEFAULT_INSTALL_TIMEOUT_MS / DEFAULT_PANEL_POLL_MS=1000 / RECHECK_WINDOW_MS=2000 / MIN_PANEL_POLL_MS=250`)；函数 `assertPluginId / assertPrefix / resolveUpdateConfig / buildPhoneNames / buildPhoneName`。
- `dist/commands.js`（来源 `dist/commands.d.ts`)：`INSTALL_TIMEOUT_MS`、`installRecipe({profileName, version, environmentKind, targetPackageName?, registryUrl?, timeoutMs?, releaseChannel?})`（三路由配方，宿主种类非法/包名不合规格回 `null`)、`manualCommand({profileName, latestVersion, installedVersion, runningVersion, jobTargetVersion, blockedReason, sourceInstall, …})`（源码安装/`unknown-profile` 回 `null`)。
- `dist/client.js`（来源 `dist/client.d.ts`＋文件头 import 实测）：转出口 `buildPhoneName / buildPhoneNames`（自 config）、`manualCommand`（自 commands）、队列函数（`visibleQueueFor / queuePositionOf / isHeadOfQueue / …`，自 queue）、批量函数（`createBatchSession / batchProgress / …`，自 batch）、更新日志函数（`parseChangelog / renderChangelogHTML / changelogForUpdate / …`，自 changelog）；自有 `CLIENT_POLL = { defaultMs: 1000, minMs: 250 }`、`buildClientPhoneNames(prefix)`（直调 `buildPhoneNames`)、`assertPollInterval`（<250 抛错）。

### 3.2 浏览器 bundle 应如何引用

- 以包 `package.json: exports` 表为准（0.3.1 实测）：子路径仅 `.`、`./panel`、`./client`、`./batch`、`./panel-batch`、`./entry`、`./http`、`./package.json`。`./config`、`./commands` 不在表中，`import … from 'dsh-plugin-update/config'` 在严格 exports 解析下不可用——面板里不要写这类字面量子路径。
- README 口径（§3 与 §8）：“面板里不要写死电话名与轮询间隔。构建时用包内工具生成一个小文件”，即跑 `derive-client-values.mjs --prefix <与宿主一致> --out <文件>`（`--dry-run` 只打印不写；工具用 esbuild 打包客户端入口一次，找不到 esbuild 打印安装提示；来源：该脚本头注释与参数解析）。生成 `UPD_STATUS / UPD_CHECK / UPD_INSTALL / UPD_POLL / UPD_POLL_MIN` 五个常量，面板只引用它们。
- 本仓现状对照（仅差量）：`scripts/build-client.mjs: INLINE_PACKAGES` 内联了 7 个模块（`upd-config / upd-commands / upd-queue / upd-batch / upd-service / upd-changelog / upd-client`），因为 0.3.x 的 `dist/client.js` 已依赖 `config/commands/queue/batch/changelog`（文件头 import 实测）。ADR 0002 写的“内联 `dist/config.js + dist/commands.js + dist/client.js`”是 0.2.0 结论（0.2.0 的 `dist/client.js` 经 0.2.0 tarball 实测仅 import config 与 commands），已过时——#52 若沿用自研面板，内联清单须按 0.3.x 依赖关系补齐（本仓构建脚本已补齐）。

### 3.3 电话名与轮询间隔是否仍从包函数派生

是。电话名：`buildClientPhoneNames(prefix)`（client）与宿主侧 `buildPhoneNames(prefix)` 同一套（来源 `dist/client.js` 转出口）；轮询：`CLIENT_POLL.defaultMs=1000 / minMs=250`（来源同上），面板 `pollMs` 默认 1000、<250 抛错（来源 `dist/panel.d.ts: UpdatePanelOptions.pollMs`、`dist/entry.js` 入口件同口径校验）。

## 4. 自带弹窗按钮（一点即弹窗）

### 4.1 哪一个导出即按钮

`mountUpdateEntry`，文件 `dist/entry.js`，子路径 `dsh-plugin-update/entry`（来源 `dist/entry.d.ts: mountUpdateEntry`；包 `package.json: exports["./entry"]`)。另有同名 HTTP 版 `mountUpdateEntryHttp`（`dsh-plugin-update/http`，无 `host.call` 环境用，来源 `dist/http.d.ts`)——本仓有宿主桥，按 README 口径用不到 HTTP 版（推测，见 §7）。

### 4.2 触发条件（点击后流程）

来源：`dist/entry.js: activate / refresh / checkNow / open / openDialog / mountPanel`；选项来源 `dist/entry.d.ts: UpdateEntryOptions`。

- 默认 `variant 'button' + autoCheck 'mount' + openOn 'has-update'`。挂载时若 `autoCheck 'mount'` 则静默调一次 `updateStatus`（只读，来源 `refresh`)，不开弹窗。
- 点击后 `activate()`：先调一次 `updateCheck`（联网一次，来源 `checkNow`)；然后按形态与策略分流：
  - `variant 'badge'` 或 `openOn 'manual'` → 交给接入方 `onActivate({hasUpdate, latestVersion})`（不传回调则直接开 dialog）；
  - `openOn 'always'` → 总是开 dialog；
  - 默认 `openOn 'has-update'` → 有新版（`latestVersion` 非空且 ≠ `runningVersion`，来源 `hasUpdateOf`)或尚无快照或有错 → 开 dialog；否则原地显示 `已是最新 <runningVersion>`（来源 `note = '已是最新 ' + runningVersion`)，不弹窗。
- dialog 即 `mountUpdatePanel(panelHost, { …, mode: 'dialog' })`（来源 `mountPanel/openDialog`)；关闭走面板 `close-view` 动作 → 拆 dialog、还原按钮、重查一次（来源 `close`)。铁律（来源 `README.md` §2.5）：“检查是只读、安装是写入，两者不许合并”，入口件任何路径都不自动安装。

### 4.3 有新版 / 无新版 / 检查失败各展示什么

文案唯一出处 `dist/entry.js: entryLabelFor`（README §2.5 同表）：

| 情形 | 档（来源 `entryStateKind` 优先级：活任务 ＞ 待重启 ＞ 失败 ＞ 有新版 ＞ 空闲） | 按钮展示 | 点击后 |
|---|---|---|---|
| 有新版 | `update` | `有新版 X.Y.Z` | 开 dialog 面板 |
| 正在装（job installing/verifying） | `busy` | `正在安装…` | 同上（开 dialog 看进度） |
| 待重启（`blockedReason pending-restart` 或 job `restart-required`) | `restart` | `待重启` | 开 dialog（面板内待重启横幅＋重启指引） |
| 检查失败（`updateStatus/Check` 回 `ok:false` 取 `failureCodeOf`，或抛异常记 `check-failed`) | `failed` | `更新失败，点此查看` | 开 dialog（面板内失败文案＋复制诊断） |
| 无新版 | `idle` | `检查更新` | 原地 `已是最新 <running>`，不弹窗 |
| 未覆盖（`label` 显式传入） | — | 调用方文案 | 同上流程 |

## 5. 本仓八种 blocked 原因码与待重启横幅：覆盖对照

包侧中文唯一出处：`dist/panel.js: BLOCKED_COPY`（8 阻塞）＋ `PHONE_FAILURE_COPY`（5 电话码）＋ `internal`；统一查询 `failureCopy(code)`（8 阻塞行复用 `BLOCKED_COPY` 原文），14 码判定 `isKnownFailureCode`，未来码 `UNKNOWN_FAILURE_COPY`（带原码）。本仓侧：`runtime/update-panel.mjs: blockedReasonKey()`（8 码＋`blocked.unknown` 兜底）＋ `runtime/client.mjs` 双语词条（8 码＋`blocked.unknown`）＋待重启横幅（`runtime/client.mjs: restartBanner / updateRestart / updateToastRestart / updateRestartNote / updateRestartHint`)。

| 码 | 包文案（标题／行动） | 本仓文案 | 覆盖结论 |
|---|---|---|---|
| `unknown-profile` | 使用范围或插件位置认不出／重开宿主再查一次…不给手工命令 | 使用范围认不出：检查范围名是否含特殊字符… | 包覆盖；措辞不同，差量待 #53 决策 |
| `source-install` | 当前是从源码装的…／不给手工命令… | 当前是按源码装的，想走更新先按版本号重装一次 | 同上 |
| `invalid-installation` | 已装的包不完整…／重装当前版本… | 已装的包不完整，先重装当前版本 | 同上 |
| `installation-changed` | 安装位置在使用中途变了…／重开宿主… | 安装位置在使用中途变了，重开 DSH 再查一次 | 同上 |
| `pending-restart` | 新版已装到磁盘…／重启宿主…正常终态不是失败 | 新版已装到磁盘，重启 DSH 后生效 | 同上（横幅见下） |
| `registry-conflict` | 本地声明的版本与磁盘实际版本互相矛盾／改清单… | 清单里那行写的不是版本号，改成版本号再试 | 同上 |
| `incompatible-node` | 新版要求的 Node 对不上／先升级 Node 到 22+ | 新版要求的 Node 更高，先升级 Node | 同上 |
| `recovery-required` | 上次安装被打断…／重装一次…按第 6 节排错 | 上次安装被打断，重新点一次安装 | 同上 |
| `check-failed` | 查新版没成功…／过一会儿再查… | （无；落 `blocked.unknown`“当前装不了…”） | 包独有，差量待 #53 决策 |
| `invalid-release` | 拿到的发布信息不合法… | （同上） | 同上 |
| `check-expired` | 凭证过期…重新查一次… | （同上） | 同上 |
| `update-busy` | 同一使用范围正在装另一个… | （同上） | 同上 |
| `install-failed` | 装不上（详见诊断摘要）… | （同上） | 同上 |
| `internal` | 出了点问题…先重试… | （同上） | 同上 |

待重启横幅对照：包要求三条（显眼单独展示、新版号＋重启生效文案、期间不给安装按钮；来源 `README.md` §5.4）＋“重启宿主”入口默认只提示手动重启、可传 `onRestartRequested`（来源 `dist/panel.d.ts`)；本仓已有待重启横幅＋“新版 v{v} 已装好，重启 DSH 后生效”等词条（来源 `runtime/client.mjs`）。两者“有横幅”对齐，形态文案（包 dialog 内横幅＋复制诊断＋手工命令入口 vs 本仓自研横幅＋弹窗）差量待 #53 决策。

行为口径对照（仅差量，不当上游事实）：本仓 `runtime/update-panel.mjs` 头注释三条口径（待重启只认 `pending-restart`；打开面板自动联网查一次但静默不弹窗；有新版只变按钮、点按钮才弹窗）与包入口件 `openOn 'has-update'` 默认行为同构，差异在实现归属（本仓自研控制器＋自研弹窗 vs 包 `mountUpdateEntry + mountUpdatePanel(dialog)`)——用哪套由 #53 定。

## 6. 版本差量：0.2.0→0.3.x，以及 latest 0.5.2 前瞻（超范围）

### 6.1 0.2.0 → 0.3.x（`^0.3.0` 范围内，本地 0.3.1 已含）

来源：registry 各版本 `exports` 元数据（`pwsh Invoke-RestMethod` 实测）、两版 tarball 解包对照、包内 `CHANGELOG.md`。

- exports 新增项：0.2.0 仅 `.` ＋ `./package.json`（registry 元数据实测）；0.3.0 起 6 子路径（`./panel ./client ./batch ./panel-batch ./entry`＋带 types 的 `.`，registry 元数据实测）；0.3.1 再加 `./http`（本地 `package.json: exports` 实测）。0.2.0 的 `dist/` 仅 9 文件（无 panel/entry/batch/http/panel-batch，0.2.0 tarball 解包实测）；`createHostUpdate(deps, configInput)` 双参形状自 0.2.0 未变（0.2.0 `dist/host.js: function createHostUpdate(deps = {}, configInput)`)，0.3.1 允许 `deps` 为 `undefined`（来源 `dist/host.d.ts`)。
- 签名与行为变化：`createHostUpdate` 双参形状不变，`ReaderOverrides` 可选覆盖项增多（以 0.3.1 `dist/host.d.ts` 全表为准）；新增批量电话（`createMultiHostUpdate`，`dsh-plugin-update/batch` 五电话，来源 `README.md` §2.6）与入口件三形态（来源 §2.5）；快照六字段、电话入参回参、安装配方五键形状冻结不变（来源 `README.md` §9）。
- 客户端入口依赖关系变化：0.2.0 的 `dist/client.js` 仅 import config 与 commands（0.2.0 tarball 实测）；0.3.1 的 `dist/client.js` 另 import queue、batch、changelog（本地文件头实测，经 changelog 间接带 service）。后果：ADR 0002“内联三文件”已过时，构建内联须含 queue/batch/service/changelog（本仓 `scripts/build-client.mjs: INLINE_PACKAGES` 已含 7 模块）。

### 6.2 latest 0.5.2 相对本地 0.3.1 的前瞻差量（超出 `^0.3.0`，不升级范围不可用）

来源：0.5.2 tarball（TEMP 解包）`CHANGELOG.md` ＋ `dist/config.js / entry.d.ts / panel.d.ts` 关键符号；exports 表与 0.3.1 相同项数（0.4.0/0.5.0 registry 元数据实测：7 子路径＋package.json，与本地一致）。

- 0.4.0：宿主新增第 4 个电话 `updateChangelog`（`dist/config.js: CHANGELOG_PHONE_ACTION`；`buildPhoneNames` 多一项 `updateChangelog`)，面板 `autoChangelog` 默认自动展示（`dist/panel.d.ts`)——这直接影响 #52“宿主留哪几个电话”（跟进即 4 电话＋tarball 取文链路；不跟则 0.4.0+ 面板缺日志走中性提示，来源 CHANGELOG “缺日志永不挡安装”）。
- 0.5.0：主题首选名 `archive`（`d5-paper` 变旧别名渲染一致，来源 `dist/panel.d.ts: UpdatePanelTheme`)；弹窗关闭落地 `onCloseRequested`（来源同上；修“点关闭没反应”）；轮询同输出不碰 DOM（hover/focus 修复）。
- 0.5.1：入口件 `openOn: 'direct'`（点开即弹窗不预查，来源 `dist/entry.d.ts: EntryOpenOn`)——#53 “一点即弹窗形态”若想要“点开即弹”，须此版本以上。
- 0.5.2：更新日志 Security 必显/截断计数/yanked 横幅/`validateChangelog`（纯 CI 用，运行时不调）。
- 推测（明确标记）：0.5.x 是否改 `createHostUpdate` 签名／快照形状未逐项 diff，以上仅 CHANGELOG＋符号级核对；跟进 latest 须另做一次 0.3.1→0.5.2 全 diff（#52/#54 输入）。

## 7. 不确定项 / 待澄清问题

1. 存疑（需真机）：三条安装路由（`desktop-service / desktop-manager / cli-process`，来源 `README.md` §4＋`dist/commands.d.ts: installRecipe`)在本机 DSH 宿主走哪条、官方源不可达时是否如文档“诚实失败”，均未真机验证。
2. 存疑（需联网升级验证）：`derive-client-values.mjs` 未实际执行（生成输出、esbuild 缺失提示路径均未跑）；0.5.2 的 `updateChangelog` 电话回包形状未实调。
3. 存疑（README 与 dist 口径）：README §8 客户端入口示例出现 `buildClientPhoneNames / CLIENT_POLL / manualCommand` 三符号，dist 实际另转出 queue/batch/changelog 全套（来源 `dist/client.d.ts`)——文档示例不全但不矛盾；凡 dist 有而 README 未细写的一律以 dist 为准。
4. 待澄清（下游 #52/#53 决策，不属上游事实）：跟进 latest 是否升范围到 `^0.5.2`（上游 README §升级本包原话“依赖版本提到 `^0.5.2`”；门禁“范围盖不住 latest 拦”要求）；宿主留 3 电话还是 4 电话（含 `updateChangelog`)；客户端保留自研面板还是切包整组件／入口件；8 码中文措辞采用包原文还是保留本仓双语词条；6 个电话码文案是否引入。
5. 时区声明：registry `time` 字段日期按日给出（0.3.1 与 0.5.2 同为 2026-10-05），小时级时刻不作为结论引用。

## 附录：复现命令

```powershell
# 1. 本地已安装版本与 exports 表
node -e "const p=require('./node_modules/dsh-plugin-update/package.json');console.log(p.version);console.log(Object.keys(p.exports))"
# 2. 本地 README / CHANGELOG / 关键 dist
#    node_modules/dsh-plugin-update/README.md（§1 版本、§2 接线、§2.5 入口件、§2.6 批量、§5 用户所见、§8 还导出什么）
#    node_modules/dsh-plugin-update/CHANGELOG.md（0.3.0 / 0.3.1 节）
#    node_modules/dsh-plugin-update/dist/host.d.ts（createHostUpdate / ReaderOverrides）
#    node_modules/dsh-plugin-update/dist/config.js（buildPhoneNames / PHONE_ACTIONS / MIN_PANEL_POLL_MS）
#    node_modules/dsh-plugin-update/dist/client.js（文件头 import＝客户端依赖关系；CLIENT_POLL）
#    node_modules/dsh-plugin-update/dist/panel.js（BLOCKED_COPY / PHONE_FAILURE_COPY 开头约120行）
#    node_modules/dsh-plugin-update/dist/entry.js（activate / entryLabelFor / entryStateKind）
#    node_modules/dsh-plugin-update/dist/entry.d.ts（UpdateEntryOptions 三个自由度默认值）
#    node_modules/dsh-plugin-update/derive-client-values.mjs（头注释用法）
# 3. registry latest 与版本全集（只读查询）
(Invoke-RestMethod -Uri 'https://registry.npmjs.org/dsh-plugin-update' -TimeoutSec 30).'dist-tags'
(Invoke-RestMethod -Uri 'https://registry.npmjs.org/dsh-plugin-update' -TimeoutSec 30).time
# 4. 跨版本 exports 对照（只读查询）
$d = Invoke-RestMethod -Uri 'https://registry.npmjs.org/dsh-plugin-update' -TimeoutSec 30
$d.versions.'0.2.0'.exports; $d.versions.'0.3.0'.exports
# 5. 本仓对照（仅差量）
#    docs/adr/0002-decoupled-dsh-plugin-update-0.2.0.md / runtime/host.mjs / runtime/client.mjs
#    runtime/update-panel.mjs / scripts/build-client.mjs（INLINE_PACKAGES） / tests/update-panel.test.mjs
```
