# 更新包 0.2.0 解耦：以运行时依赖接入，每次打包用最新

Status: accepted

## Context

0001 为绕开 0.1.x 的自锚定缺陷（`containingPackage(import.meta.url)` 从更新包自己的文件位置
往上找目标包，依赖形态下永远找不到），把更新包 `dist/*.js` 在构建期 vendor 进本包。
代价：上游发新版我们不会自动拿到，也没有任何提醒；磁盘上是新包、跑的是 vendor 副本，
声明与实际两张皮。

上游 0.2.0 改为**按包名解析**目标包（清单直解 → 入口反查 → `node_modules` 步行 →
自锚定兜底，见更新包 README §2「升级本包」与 §6.12），`exports` 没导出 `.` 的包也能命中。
依赖形态下 `unknown-profile` 与假 `installation-changed` 同时消失，一键升级可用。
上游推荐形态即「把本包装成你自己插件的依赖」（README §1），vendor 仍可用但不再需要。

当前上游 latest 为 `0.2.0`（`node >=22`，零运行时依赖），本机 `node_modules` 已是该版。

## Decision

- 宿主半以普通依赖接入：`import { createHostUpdate } from 'dsh-plugin-update'`，
  写进根 `package.json` 与产物 `package/package.json` 的 `dependencies`（`^0.2.0`）。
  用户装我们插件时由 npm 按范围取最新匹配的 0.2.x —— 装到的自动是最新。
- vendor 目录全部删除（`runtime/vendor/`、`package/lib/vendor/`）；构建不再复制整份 dist。
- 只有**客户端入口**仍在构建期从 `node_modules` 内联进浏览器 bundle
  （`dist/config.js` + `dist/commands.js` + `dist/client.js`，浏览器没有 node_modules）。
  电话名与轮询间隔运行时从包函数派生，面板不写死字面量（门禁断言）。
- 宿主侧只传 `readerOverrides.runningVersion`（启动时读自己 `package.json` 的快照，
  为判出 `pending-restart`）；不传 `environmentKind` / `profileDir` / `profileName`，
  安装出口与使用范围全由更新包自动探测（README 说这两处一传就挡住自动探测，升级要改代码）。
- 电话名从 `update.phoneNames` 读，不自己拼（与包内同一份真源）。

## 每次打包用最新的保证

三层，缺一不可：

1. **范围**：`^0.2.0` 让 0.2.x 补丁自动跟上；上游发 0.3.0/1.x 必须我们改范围重发。
2. **构建前硬门禁**：`npm run build` 先跑 `node scripts/check-deps.mjs`（无 `--warn-only`）。
   它对照 registry 报「本地声明 / 已安装 / 产物声明 / 上游 latest」：
   范围盖不住 latest 拦；范围内已安装落后于 latest 也拦（否则打出的 bundle 是旧面板、
   用户装的是新宿主，两侧错位）；取不到 registry 时只给 `?` 不拦（离线不挡路）。
3. **一键跟上**：`npm run deps:sync`（`npm update dsh-plugin-update dsh-log` 走官方源
   + 重跑门禁），`vendor:check` 保留为同一命令的别名（老文档链接不断）。

`npm test` 保持纯本地不断言网络（门禁已在构建前拦过）；产物一致性
（`dependencies` 双写、电话名无字面量、无 vendor 目录、探针阈值）由
`tests/update-panel.test.mjs` 门禁断言。

## Consequences

- 升级更新包（范围内）= `npm run deps:sync && npm run build && npm test`，
  再走正常 bump + 发布（用户侧靠新版本拿到新范围）。
- 超出范围（0.3.0+）= 改两处声明（根 `package.json` + `scripts/build-client.mjs`
  产物字面量）+ `npm install && npm run build && npm test` + 发布。
- 两处本地契约仍需人眼对照（门禁查不出）：上游新增日志事件 → 补
  `runtime/event-list.json` 白名单；新增 `blockedReason` → 补
  `runtime/update-panel.mjs` 的 `blockedReasonKey()` 与 `runtime/client.mjs` 双语词条。
- 上游若改客户端入口的模块文件/依赖关系，构建会抛「引用了未声明的依赖」——
  设计好的报错，不是静默降级，按报错补 `INLINE_PACKAGES` 声明。
