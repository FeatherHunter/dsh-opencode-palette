# 更新包（dsh-plugin-update）的 dist 随包 vendor，而不是运行时 import

Status: accepted

## Context

宿主半要用更新系统的三条电话（查状态 / 查新版 / 装更新），而更新包是已发布在 npm 的正式包，
按常理应当 `import { createHostUpdate } from 'dsh-plugin-update'`，把它写进 `dependencies`。

但更新包的读取器在**建读取器时**用 `containingPackage(fileURLToPath(import.meta.url), 目标包名)`
（`dist/reader.js`）从**它自己的文件位置**往上找目标包，拿它当「当前已装的包」：
`host.ts` 用它取 `runningVersion`（取不到直接抛 `unknown-profile`），`reader.ts` 用它算
`sameLoadedPackage`（为假时环境判定恒为 `installation-changed`，而 `installation-changed` 会让
`canInstall` 永远为假 → 一键升级根本不可用）。

以 npm 依赖形态安装时，更新包住在 `<profile>/node_modules/dsh-plugin-update`（本机为真实目录，
非符号链接），从它往上走永远找不到 `<profile>/node_modules/dsh-opencode-palette`：
`containingPackage` 返回 `null`。**换 `readerOverrides.runningVersion` 只能治一半**——
`sameLoadedPackage` 仍在 reader 内部自己算，`installation-changed` 照旧，一键升级仍不可用；
要治就得自己重写整套环境判定（几十行，且与包内实现漂移）。

## Decision

把更新包的 `dist/*.js` 在**构建期**从 npm 包复制进本包（`runtime/vendor/dsh-plugin-update/` 与
`package/lib/vendor/dsh-plugin-update/`，带来源标记行），宿主半用相对路径 `./vendor/dsh-plugin-update/host.js`
引用。这样 `import.meta.url` 落在**本包内**，`containingPackage` 一路向上正好命中本包，
`runningVersion` 与 `sameLoadedPackage` 两条判定同时成立。

同时保留两条护栏：

- 构建期复制自 npm 包（不是从源码仓手抄），副本与 npm 包逐字节一致由门禁断言
  （`tests/update-panel.test.mjs`，按来源标记行剥头部比对）。
- 更新包**不写进** `package/package.json` 的 `dependencies`：运行时没人 import 它，
  声明一份只会装一份用不到的东西，还会藏住「磁盘上是新包、跑的是 vendor 副本」这个事实。

## Consequences

- 升级更新包 = 重新 `npm install` + `npm run build`（副本随之更新，门禁保证没漏）。
- 发布产物带一份更新包 dist（约 90KB），换来的是「面板里的一键升级真的能用」。
- 日志包（dsh-log）**不需要**这么做：它没有任何自锚定，宿主半直接
  `import { createHostLog } from 'dsh-log/host'`，并作为唯一运行时依赖写进 `dependencies`。
- 同类插件（deck）早就是这么做的（`src/host/updatePkg/`），本 ADR 只是把它背后的原因写清楚，
  免得后来者把 vendor 当成冗余复制删掉。
