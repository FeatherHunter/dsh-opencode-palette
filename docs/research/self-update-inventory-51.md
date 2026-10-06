# 自研更新代码盘点与删/留/改清单（#51）

- 版本日期：2026-10-06（Asia/Shanghai）
- 对应票：[#51 盘点当前插件内全部自研更新代码与删除清单](https://github.com/FeatherHunter/dsh-opencode-palette/issues/51)，父地图 [#49](https://github.com/FeatherHunter/dsh-opencode-palette/issues/49)
- 工作树：`D:\\dsh-plugin\\dsh-opencode-palette`（`package.json: name=dsh-opencode-palette, version=2.0.16`，`dependencies.dsh-plugin-update=^0.3.0`，本机已装 `node_modules/dsh-plugin-update@0.3.1`）
- 方法：只认一手来源（工作树 `runtime/*`、`scripts/build-client.mjs`、`tests/update-panel.test.mjs`、`docs/adr/000*`原文；上游包 `node_modules/dsh-plugin-update/README.md` 与 `dist/*.js` 原文）。每个结论标注“文件 + 关键字符串”，行号为本次读取的实际行号。不引用二手转述。
- 决策依赖：本票只输出“是什么、删/留/改”，不拍板“最小集成留哪层薄胶水”（那是 #52 的事）；上游接口细节以 #50 为准，本文件只写 #51 能独立断言的部分，上游覆盖度存疑处明确标“待 #50 确认”，不猜。

## 0. 结论总表（删/留/改三栏）

| # | 位置 | 删 / 留 / 改 | 一句话 |
|---|---|---|---|
| 1 | `runtime/update-panel.mjs` 全文件（354 行） | **删** | 纯自研面板状态机（按钮五态、静默/手动检查、安装轮询、八种 blocked 映射），上游 `panel`+`entry` 已内置同能力（见 §5）。 |
| 2 | `runtime/host.mjs` 内更新三电话之外的自研探针/重试 | **删** | `PROBE_LIMITS`、`probeRelease`、`probeBrief`、`errorCodeOf`、`wrapUpdateCheck` 及其注册包装（约 200–297 行）是 2026-09-30 为诊断 `invalid-release` 兜底加的本地链路，上游已有 `diag` + 结构化失败证据，最小集成不再需要。 |
| 3 | `runtime/host.mjs` 内 `createHostUpdate` 接线本体 | **改（瘦身保留）** | `import { createHostUpdate } from 'dsh-plugin-update'`、`readerOverrides: { runningVersion }` 合并、`registry.set(update.handlers)`、`update.phoneNames.updateCheck` 读电话名这几行保留；删掉外层 `wrapUpdateCheck` 包装后直注册。是否继续传 `runningVersion`、是否传 `targetPackageDir` 由 #52 按 ADR 0002 拍板，本票只标“保留接线点”。 |
| 4 | `runtime/host.mjs` 内日志/通道/分发 | **留** | `createHostLog`、`prepareLogHome`、`createLogFileService`、`dispatch/routeFetch`、`ROUTE_PATH` 注册、`host.channel.fail` 全部与更新无关，动它即断主题面板与日志落盘。 |
| 5 | `runtime/client.mjs` 内更新控制器接线（253–258 行） | **删** | `createUpdateController({ call, phones: buildClientPhoneNames(PHONE_PREFIX), pollMs: CLIENT_POLL.defaultMs })` 整段由上游 `mountUpdateEntry`/`mountUpdatePanel` 接管。连带删 `import { buildClientPhoneNames, CLIENT_POLL } from 'dsh-plugin-update/client'` 与 `import { createUpdateController, buttonState, blockedReasonKey } from './update-panel.mjs'` 两行。 |
| 6 | `runtime/client.mjs` 内更新 I18N（约 135–169 行，35+ 词条） | **删** | `updateCheck/updateHasNew/…/updateManual*/blocked.*(8 种)+blocked.unknown/updateRestartHint` 全套文案上游 `dist/panel.js: BLOCKED_COPY` + `dist/entry.js: LABEL_*` 已内置中文一句话（见 §5），自研词条与 `tr/blockedReasonKey/updFailKey` 分支一并删。 |
| 7 | `runtime/client.mjs` 内按钮/弹窗/横幅/notice 渲染（约 896–1002、1102–1111 行） | **删** | 头行 `updateButton`（四态变色）、`restartBanner`（待重启常驻横幅）、`updateDialog`（460px 弹窗：标题/版本对照/失败行/blocked 行/手工命令+复制/立即升级+稍后）、`updState.notice` 兜底行，全部由上游 entry（按钮文案自变）+ panel（五章档案：检查与安装/更新日志/更新队列/错误信息/手工命令）替代。 |
| 8 | `runtime/client.mjs` 其余（主题/字体/面板/日志开关） | **留** | 主题管线、字体可用性、外观跟随、日志开关 `createClientLog/reconcileLogSwitch/setLogSwitch` 与 ISSUE/星标入口与更新无关。注意 `props.update.setNotice('logSwitchFail')` 这一处跨引用（约 1031 行）随更新删除需改写为本地 notice（见 §4）。 |
| 9 | `tests/update-panel.test.mjs` 全文件（793 行） | **改（拆分：删状态机/渲染，留改接线断言）** | 一、四节状态机桩测（约 1–470 行）与四节 SSR 渲染断言（约 649–768 行）随自研 UI 删除而删；二、三、五节中的通道单源、无字面量电话名、无 vendor、宿主冒烟 8 电话、事件清单形状检查保留并改写为对新薄胶水的断言。 |
| 10 | `scripts/build-client.mjs` 内联逻辑 | **改** | `INLINE_PACKAGES` 中 `dsh-plugin-update/client` 的 7 模块（`upd-config/commands/queue/batch/service/changelog/client`）与 `MODULE_ORDER` 中对应 7 项、`RUNTIME_MODULE_FILES.update-panel` 随删除改写；产物 `dependencies: { 'dsh-log': '0.2.1', 'dsh-plugin-update': '^0.3.0' }`（约 277 行）保留。改成内联 `entry/panel/http` 哪几个由 #50 定，本票只标“待替换点”。 |
| 11 | `runtime/channel.mjs` 全文件（27 行） | **留** | `CHANNEL='/api'`、`ENDPOINT='opencode-palette'`、`ROUTE_PATH`、`PLUGIN_ID/PHONE_PREFIX/TARGET_PACKAGE_NAME` 是两侧共用单真源，日志 5 条与更新 3 条共用前缀只是命名复用，不是更新代码。 |
| 12 | `runtime/event-list.json`（16 resident） | **改（ prune 2，留 14，待 #50 复核）** | `update.check.retry` + `update.check.probe` 是自研重试/探针的日志事件，随 §2 删除而删；其余 `host.call/host.call.fail`（通道）、`update.check.start/ok/fail`、`update.install.start/ok/fail/exec`、`log.*(4)`、`host.channel.fail` 保留。是否删 `update.install.exec` 等上游是否仍经 `logCtx.fire` 发出，待 #50 对 `dist/host.js` 事件名确认后定。 |
| 13 | `scripts/check-deps.mjs` | **留（不改）** | 随包依赖新鲜度门禁（范围覆盖 latest、范围内落后也拦、离线给 `?` 不拦），与自研更新代码无关，最小集成后继续负责 `^0.3.0` 跟进。 |

## 1. 研究问题与决策依赖

- #51 的 Question 原文：当前插件内哪些文件与逻辑属于自研更新代码（必须删），哪些属于通道与日志（必须留），以工作树为准，输出删/留/改三栏（见票正文）。
- 依赖 #50（上游接口）：删的前提是“上游已覆盖”。本文件 §5 用上游 README + dist 原文逐条证明覆盖，不依赖 #50 的结论；#50 未关闭前，§4 标出的三处（host 是否续传 `runningVersion`、build 内联 entry/panel/http 选哪几个、event 白名单最终口径）保持“待确认”，不代 #50 下结论。
- 被依赖 #52（最小集成形态）：本文件是 #52 的输入之一（另有 #50）。#52 拍板宿主留哪几个电话、客户端留哪个调用点、不造同义词；执行是 #54。本票不写调用示例，不写按钮文案（那是 #53）。
- 地图 #49 的默认假设（grilling 超时未答复）：删全部自研更新代码、只留通道与日志、按钮改为一点即弹窗。本文件按该假设输出；任一条假设被推翻时，§0 中标“删”的行需重评。

## 2. 逐文件证据（删的是什么、留的是什么）

### 2.1 `runtime/update-panel.mjs`（354 行）——删整文件

- 来源：文件头注释“三条口径（沿用更新包 README 与规格，#41 起进面板自动查一次）”；`readSnapshot`、`buttonState`（优先级 正在升级 > 待重启 > 有新版本 > 检查中 > 空闲）、`blockedReasonKey`（8 种码数组）、`createUpdateController`（state/check/checkSilently/readStatus/install/轮询）。
- 自研判定：电话名与轮询由调用方传参（“本文件不写字面量”），但状态机、静默/手动双检查、凭证复用（`hasNew && checkId` 直接开弹窗）、`notice` 兜底全是本仓手写，上游 `panel` 内核已消化同样职责（见 §5）。
- 牵连：唯一引用方是 `runtime/client.mjs:13` 的 import 与 `scripts/build-client.mjs: RUNTIME_MODULE_FILES['update-panel']` + `MODULE_ORDER: 'update-panel'`。三处随文件同删。

### 2.2 `runtime/host.mjs`（415 行）——删探针/重试，改接线，留日志通道

- 留（日志）：`import { createHostLog, registerHostLogPhones } from 'dsh-log/host'`、`prepareLogHome`（装配建目录+开关物化）、`createLogFileService`（注释写明不用 `ctx.get('fs')` 的原因）、`apply` 内 `registerHostLogPhones` + `logSetPhone` 包目录确保 + `logHomeReady`。
- 改（更新接线保留点）：`import { createHostUpdate } from 'dsh-plugin-update'`；`apply` 内 `createHostUpdate({ ctx, logCtx: { fire }, readerOverrides: Object.assign({ runningVersion }, extraOverrides) }, { pluginId, prefix, targetPackageName })`；`for (phoneName of Object.keys(update.handlers)) registry.set(...)`；`update.phoneNames.updateCheck` 读电话名（门禁断言 `tests/update-panel.test.mjs:517`）。
- 删（自研诊断链）：`PROBE_LIMITS = { maxBytes: 256*1024, integrityPattern }`（门禁比对更新包 `service.js` 同名常量）；`probeBrief/probeRelease`（按更新包同一链路重走：fetch→status→body→json→name→version→engines→tarball→integrity，返回 `{stage, httpStatus, bytes, reason, detail}`）；`errorCodeOf`；`wrapUpdateCheck`（失败→重试一次→仍失败跑探针记 `update.check.retry/probe`）；以及 `apply` 内对 `rawUpdateCheck` 的包装注册（约 353–365 行）。起因注释写明“2026-09-30 加：面板点检查更新静默无反应，日志只剩散列；更新包把 fetch→校验每步失败归成同一个 invalid-release”。
- 留（通道）：`dispatch/routeFetch`（`RPC_ID_PATTERN/ENDPOINT_PATTERN`、`ROUTE_PATH` 精确路由、`connection.fetch.register` + 重复注册让位）、`fail('register'/'dispatch')` 记 `host.channel.fail`。

### 2.3 `runtime/client.mjs`（1267 行）——删更新四块，留主题四块

- 删 A（import 2 行）：`import { buildClientPhoneNames, CLIENT_POLL } from 'dsh-plugin-update/client'`（12 行）、`import { createUpdateController, buttonState, blockedReasonKey } from './update-panel.mjs'`（13 行）。
- 删 B（控制器实例化，253–258 行）：`createUpdateController({ call: hostBridge..., phones: buildClientPhoneNames(PHONE_PREFIX), pollMs: CLIENT_POLL.defaultMs, log: clientLog.log })`。
- 删 C（I18N 约 135–169 行）：`updateCheck/updateHasNew/updateChecking/updateInstalling/updateToVersion/updateRestart/updateLatest/updateCheckFail/updateToastRestart/updateDialogTitle/updateVersions/updateRestartNote/updateStart/updateLater/updateFailInstall/updateFailChanged/updateFailRecovery/updateManualTitle/updateManualNote/updateCopy/updateCopied/updateCopyFail/updateUpToDateTitle` + `blocked.*` 8 种 + `blocked.unknown` + `updateRestartHint`。
- 删 D（渲染约 896–1002 + 1102–1111 行）：`useState(props.update...)` 订阅 + `autoCheckOnOpen/readStatus` 挂载效应 + `updFailKey/buttonLabel` + `updateButton`（红字边框条件） + `restartBanner`（`updateToastRestart`） + `updateDialog`（固定遮罩 460px：标题/版本对照/重启说明/失败行/blocked 行/手工命令+复制/立即升级+稍后） + `updState.notice` 兜底行。
- 留：主题管线（engine import + `applyStyle/clearStyle`）、字体/字号/外观跟随、日志开关（`createClientLog/reconcileLogSwitch/setLogSwitch`）、头行星标/ISSUE 入口、`PALETTE_VERSION` 占位替换。
- 改一处跨引用（约 1031 行）：`props.update.setNotice('logSwitchFail')` 在更新删除后无 `props.update`，需改写为本地 notice（#54 执行时处理，本票只标出）。

### 2.4 `tests/update-panel.test.mjs`（793 行）——拆分改

- 删：一、状态机桩测（打开静默读/无新版不开弹窗/有新版弹窗/凭证复用/八种码/安装轮询/安装失败/无凭证不装/宿主降级/#41 静默三则/按钮优先级/传输异常，约 1–470 行）；四、SSR 渲染四则（按钮中英/无宿主不渲染/有新版弹窗含手工命令/待重启横幅，约 649–768 行）。
- 留改：二、接线三则（通道单源 473–481 行；电话名派生+产物无字面量 483–495 行；产物声明双依赖+node>=22 497–505 行；无 vendor 507–518 行）改写为对新薄胶水的断言（entry/panel 存在性、无自研字面量、无 vendor）；三、宿主冒烟（522–647 行：8 电话装配、精确路由、日志落盘、开关物化、info 门控）去掉对自研探针/重试的断言（418–469 行三则重试探针测试删），保留日志+三电话冒烟；五、事件清单（772–793 行：计数+字段+ `emitted` 14 名 + 随包副本一致）按 §3 改 `emitted`（去 retry/probe）。
- 注意测试文件头注释“三块断言”与“读产物不读源码”口径在改写后仍然成立。

### 2.5 `scripts/build-client.mjs`（318 行）——改内联集合

- 改点 1：`INLINE_PACKAGES` 中 `spec: 'dsh-plugin-update/client'` 的 7 模块（`upd-config/commands/queue/batch/service/changelog/client`，约 60–75 行）在最小集成后不再是“客户端入口全部内联”，按 #50 改为 entry/panel 所需集合（上游 `exports` 有 `./panel`、`./entry`、`./http`、`./batch`、`./panel-batch`，见 `node_modules/dsh-plugin-update/package.json: exports`）。本票不断言具体选哪几个，只标出待替换范围。
- 改点 2：`MODULE_ORDER` 中 `upd-config … upd-client` 7 项与 `RUNTIME_MODULE_FILES['update-panel']`（约 27 行 + 90 行）随删改。
- 留：引擎 10 模块 + `channel/client` 打包管线、`JS_IMPORT_RE/PKG_IMPORT_RE` 转换器、“引用未声明依赖即抛”硬失败、产物 `package.json: dependencies { 'dsh-log': '0.2.1', 'dsh-plugin-update': '^0.3.0' }`（277 行）与双 bundle 写盘（包版/动态版）+ `channel.mjs/event-list.json` 随包复制。

### 2.6 `runtime/channel.mjs`（27 行）——留整文件

- `CHANNEL='/api'`、`ENDPOINT='opencode-palette'`、`ROUTE_PATH`、`PLUGIN_ID/PHONE_PREFIX/TARGET_PACKAGE_NAME`、`HOST_UNAVAILABLE` 全是两侧共用常量。门禁 `tests/update-panel.test.mjs:473–481` 断言宿主/浏览器/产物三处同引。更新电话名复用 `PHONE_PREFIX` 只是命名复用，不构成“更新代码”。

### 2.7 `runtime/event-list.json`（16 resident）与 `scripts/check-deps.mjs`（134 行）

- event-list：16 条中 `update.check.retry`（`{attempt, ok, reason, pluginId}`）与 `update.check.probe`（`{stage, httpStatus, bytes, reason, detail, pluginId}`）是自研包装的日志事件，随 §2.2 删除而删；其余 14 条保留（通道 2 + 更新检查/安装 7 + 日志 4 + 通道失败 1，详见 §3 表）。上游 `event-list.template.json` 为空对象（消费者自维护白名单），故“上游新增事件补白名单”仍按 ADR 0002 由人眼对照。
- check-deps：只管 `dsh-plugin-update`（运行时依赖，范围决定用户拿到哪版）与 `dsh-log` 的新鲜度（范围覆盖 latest、范围内落后也拦、离线 `?` 不拦），与自研代码无关，留且不改。

## 3. 事件清单取舍（16 → 14，待 #50 复核一处）

| 事件 | 留/删 | 理由 |
|---|---|---|
| `host.call` / `host.call.fail` | 留 | 通道调用日志，更新/日志共用，非更新专属。 |
| `update.check.start/ok/fail` | 留 | 面板检查节点；上游 host 经 `logCtx.fire` 发出（`runtime/host.mjs:348`），删白名单即变“未声明事件”。 |
| `update.install.start/ok/fail` | 留 | 同上，安装节点。 |
| `update.install.exec` | 留（待 #50 复核） | 安装执行器日志；若 0.3.x 已改名/移入批量电话，届时跟改。本票按“上游仍发出”保留。 |
| `update.check.retry/probe` | **删** | 自研 `wrapUpdateCheck/probeRelease` 的日志事件，随代码同删。 |
| `log.switch.set/forward.summary/switch.watchdog/export.fail` | 留 | 日志系统，与更新无关。 |
| `host.channel.fail` | 留 | 通道注册/分发失败，更新/日志共用。 |

## 4. 改栏的最小口径（给 #52/#54 的输入，不含决策）

1. host 接线瘦身后形状（示意，非最终 API）：保留 `createHostUpdate` + `registry.set(handlers)` + `phoneNames` 读名；删 `wrapUpdateCheck` 包装行；`readerOverrides` 只留 `{ runningVersion }`（ADR 0002），`targetPackageDir` 仅测试传。最终是否连 `runningVersion` 都不传，由 #52 按上游 README“升级本包”一节定。
2. client 改写点：删 §2.3 四块后，在头行原按钮位置挂上游 entry（一点即弹窗由 entry 的 `openOn` 策略保证，旧“有新版才弹窗/无新版回已是最新”两步走不再保留）；`logSwitchFail` 的 `props.update.setNotice` 改本地态。
3. build 改写点：`INLINE_PACKAGES` 的 upd 7 模块替换为 #50 指定的 entry/panel 最小集合；`MODULE_ORDER` 同步；产物 `dependencies` 不动。
4. tests 改写点：删状态机+渲染+重试探针三组；接线/冒烟/清单三组改写为新胶水断言；门禁“产物无电话名字面量”继续有效（新胶水仍从包派生）。

## 5. 上游覆盖证据（删的前提，一手来源）

- 本机上游版本：`node_modules/dsh-plugin-update/package.json: version=0.3.1`（根声明 `^0.3.0` 覆盖，`exports` 含 `.`/`./panel`/`./client`/`./batch`/`./panel-batch`/`./entry`/`./http`）。
- 三电话 + 回包契约：上游 `README.md §2 第二步`（`createHostUpdate({ ctx, logCtx }, { pluginId, prefix, targetPackageName })` 得 `notes.updateStatus/Check/Install`；电话名从 `update.phoneNames` 读）与“三个电话入参与回参”表（`snapshot/manual/receipt`，失败 `error/errorKind/diag`，面板按 14 码给中文文案）。
- 整组件替代自研状态机+弹窗+横幅：上游 `README.md §第 4 步`（`import { mountUpdatePanel } from 'dsh-plugin-update/panel'`，`mode: 'embedded'/'dialog'`，内部消化轮询/门控/中文一句话/`pending-restart` 横幅/手工命令展示与复制/排队/跳过/诊断复制；五章恒在：检查与安装/更新日志/更新队列/错误信息/手工命令；`panel.unmount()` 只停轮询）。对应删除 §2.1 + §2.3 D。
- 入口件替代自研按钮两步走：上游 `README.md §2.5`（`import { mountUpdateEntry } from 'dsh-plugin-update/entry'`，`variant: button/badge/inline`，`autoCheck: mount/never`（进页面静默查一次**只调 updateStatus，只读**），`openOn: has-update/always/manual`；文案自变：检查更新/有新版 X.Y.Z/正在安装…/待重启/更新失败点此查看；铁律：只做查+打开面板，任何路径不自动安装）。对应删除 §2.3 D 的“红字二次点击”逻辑；地图默认假设“有无新版都弹新包自带弹窗”即 `openOn: 'always'`，由 #53 定。
- 中文一句话覆盖八种码：上游 `dist/panel.js: BLOCKED_COPY` 含 `unknown-profile/source-install/invalid-installation/installation-changed/pending-restart/…`（本次读取前 30 行已见 5 种，余见该文件），对应删除 §2.3 C 的 `blocked.*` 词条与 `blockedReasonKey`。
- 按包名解析（删 vendor 的前提，已在 ADR 0002 落定）：上游 `README.md §1`（推荐依赖形态；`exports` 未导出 `.` 的包也能命中）+ 本仓 `docs/adr/0002` + 门禁 `tests/update-panel.test.mjs:507–518`（无 vendor 目录、宿主 import 真依赖）。本次研究不再重复论证，只引用。
- 待 #50 确认（本票不猜）：entry/panel 在 React 面板里的确切挂载方式（本仓面板是 React `h()` 渲染，上游 `mountUpdatePanel(el, …)` 要 DOM 节点，桥接形态待 #50 给最小示例）；`update.install.exec` 等事件名在 0.3.x 是否更名；build 内联 entry/panel/http 的最小模块集合。

## 5b. 上游版本漂移增补（后台并行研究员一次源复核，2026-10-06）

- 三元组：本地声明 `^0.3.0`（根 `package.json:26`）/ 本机已装 `0.3.1`（`node_modules/dsh-plugin-update/package.json:3`、`README.md:5`“当前版本 0.3.1”）/ 上游 latest **`0.5.2`**（`GET https://registry.npmjs.org/dsh-plugin-update/latest → 200`，`dist.tarball: …/dsh-plugin-update-0.5.2.tgz`，本次 lead 独立复核同值）。
- 判定：`^0.3.0` 在 0.x 下按 `check-deps.mjs: covers()` 语义锁次版本（`0.3.x`，`<0.4.0`），**盖不住 0.5.2**——门禁会判“超出 ^ 范围”。最小集成（#54）开工前必须先走 ADR 0002 超范围流程（改根 `package.json` + `scripts/build-client.mjs` 产物字面量 + `npm install && npm run build && npm test` + 发布），否则打出的 bundle 是旧面板、用户装的是新宿主（§0 表中 #10 的“待替换点”需按 0.5.x 重对）。
- 弹窗位置纠偏：`dist/client.js:58–99` 共 40 export（`buildClientPhoneNames/CLIENT_POLL/manualCommand` + 队列 12 + 批量 14 + changelog 7），`grep dialog/modal/popup` 零命中——**开箱弹窗不在 client 入口**，在 `dist/panel.js:844`（`div.dsh-upd-overlay[data-mode=dialog]`，`UpdatePanelMode='embedded'|'dialog'` 见 `panel.d.ts:4`，非法抛错见 `panel.js:926–927`）与 `dist/entry.js:215–221`（`mountUpdateEntry(...).open()` 调 `mountPanel(dialog)`）。§0 中“删 D（渲染）”的前提改为“由 entry+panel 接管”，client 入口只管派生取值，不断言其有弹窗。
- 宿主签名（一次源）：`createHostUpdate(deps{ctx,logCtx,pluginManager,readerOverrides}, config{pluginId*无斜杠, prefix缺省wf, targetPackageName, registryUrl, checkTimeoutMs=10000, confirmationTtlMs=600000, installTimeoutMs=900000, panelPollMs=1000/min250, releaseChannel})` → `{phoneNames, handlers}`（`dist/host.d.ts` + `dist/host.js:548–636`）；逃生口 `readerOverrides.targetPackageDir`（README §6.13），按包名自动解析（§6.12）。
- 码表（一次源）：blocked 8 + 电话 5 + internal＝14（`README §5.2` + `panel.d.ts failureCopy`）；快照六字段（§5.1）；手工命令（§5.3）。另：上游 README 实测只有 §1–§9（511 行），**无 §10**——仓内旧注释“第 5/8/10 节”中的“§10”在 0.3.1 已无落点，引用时以 §2 表 + §5.1/5.2/§8 为准。

## 6. 来源清单

- 工作树：`runtime/update-panel.mjs`（头注释三条口径、`PLUGIN_ID`、`readSnapshot/buttonState/blockedReasonKey/createUpdateController`）、`runtime/host.mjs`（头注释三件事、`DEFAULT_REGISTRY`、`PROBE_LIMITS/probeBrief/probeRelease/errorCodeOf/wrapUpdateCheck/apply`）、`runtime/client.mjs`（12–13 行 import、135–169 行 I18N、253–258 行控制器、896–1002 行按钮/横幅/弹窗、1031 行 `setNotice`、1102–1111 行 notice）、`runtime/channel.mjs`（27 行全）、`runtime/event-list.json`（16 resident）、`scripts/build-client.mjs`（`INLINE_PACKAGES/MODULE_ORDER/RUNTIME_MODULE_FILES`、277 行产物 dependencies）、`scripts/check-deps.mjs`（门禁三列）、`tests/update-panel.test.mjs`（793 行：一/二/三/四/五节）、`package.json`（version 2.0.16、`dsh-plugin-update ^0.3.0`）、`package/package.json`（产物 dependencies 双写）。
- 上游包：`node_modules/dsh-plugin-update/package.json`（0.3.1、exports 7 入口）、`README.md`（§1 安装、§2 三步接入、§第 4 步整组件、§2.5 入口件、§2.6 批量、三电话表）、`dist/client.js`（`buildClientPhoneNames/CLIENT_POLL`）、`dist/panel.js`（`BLOCKED_COPY/mountUpdatePanel`）、`dist/entry.js`（`mountUpdateEntry/LABEL_*/entryStateKind`）、`dist/host.js`（`createHostUpdate`）、`dist/config.js`（`DEFAULT_PANEL_POLL_MS/MIN_PANEL_POLL_MS=250`）、`CHANGELOG.md`（0.3.0 entry/panel、0.3.1 http）。
- 仓内决策：`docs/adr/0002-decoupled-dsh-plugin-update-0.2.0.md`（真依赖 + `runningVersion` + 门禁三层 + 人眼对照两处）、`docs/adr/0001-vendor-dsh-plugin-update.md`（历史，只留背景）、地图 #49 notes（领域/必读/澄清默认假设/协作建边/版本策略）。
- 既有研究格式：`docs/research/dsh-text-fontsize-inventory.md`（一手来源 + 文件+关键字符串 + 缺失声明口径，本文件沿用）。

## 7. 缺失声明与不猜清单（grilling 口径）

- 本次未向用户追问：#51 的问题是封闭盘点（以工作树为准、输出三栏），无“我猜用户想要”之处；地图 #49 的 grilling 已超时按默认假设推进，本票沿用不重问。
- 未断言：上游 entry 在 React 面板中的挂载细节、build 最小内联集合、`update.install.exec` 是否更名——三处标“待 #50”，#52 不得以前两票未关为由直接开工（#52 已被 50+51 双阻塞）。
- 工作树版本锚定 2.0.16 / 上游 0.3.1；若研究与执行之间任一升版，需重对 §5 事件名与 §2.5 内联集合。
