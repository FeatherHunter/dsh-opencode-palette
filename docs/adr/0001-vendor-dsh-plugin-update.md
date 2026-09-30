# 更新包（dsh-plugin-update）的 dist 随包 vendor，而不是运行时 import

Status: superseded（被 0002 推翻；0.2.0 起解耦为真依赖，本文件只保留历史原因）

> 0.2.0 起更新包改为**按包名解析**目标包，依赖形态直接可用，vendor 已全部删除。
> 当前做法见 `0002-decoupled-dsh-plugin-update-0.2.0.md`。

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

## 如何升级（上游发新版时）

先看有没有新版：

```bash
npm run vendor:check
```

它对着 registry 报出「我们 pin 的 / 包内实际的 / 上游 latest」三列，有落后就打印升级步骤。真要升时按这个顺序走：

1. 改 `package.json` 里 `devDependencies` 的版本号（`dsh-log` 见下一节，它另有写死处）。
2. `npm install`：把新 dist 取进 `node_modules/dsh-plugin-update/`。
3. `npm run build`：`scripts/build-client.mjs` 重新复制 dist 到 `runtime/vendor/` 与 `package/lib/vendor/`
   （写入新的 `// vendor-source: <包>@<版本> dist/<文件>` 标记），并把客户端入口重新内联进 bundle。
4. `npm test`：门禁断言副本与 npm 包逐字节一致、来源标记行格式正确、事件清单齐全。
5. **对照上游补两处本地契约**——门禁查不出来，只能人看：
   - **日志事件**：上游若新增事件名，补进 `runtime/event-list.json` 白名单。
     （`tests/update-panel.test.mjs` 里那份 `emitted` 清单也是手写的，不会自动发现上游新增。）
   - **装不了的原因码**：上游若新增 `blockedReason`，补进 `runtime/update-panel.mjs` 的
     `blockedReasonKey()` 与 `runtime/client.mjs` 的 `blocked.<code>` 双语词条；
     不补会静默退化成「当前装不了：重开 DSH 再查一次」。
6. bump 本插件版本，走正常发布流程（发布工具链见 `AGENTS.md`）。

**构建会替你硬失败的地方**：`scripts/build-client.mjs` 的 `VENDOR_PACKAGES` 声明了更新包客户端入口的
模块划分与相对 import 映射。上游若改了模块文件名或依赖关系，构建会抛「引用了未声明的依赖」——
这是设计好的报错，不是静默降级。

### dsh-log 不一样：它是运行时依赖，版本号写死在三处

`dsh-log` 不 vendor（它没有自锚定问题），以 `dependencies` 形态随包发出，用户装包时从 npm 取。
所以升它要同时改三处，漏一处就会「装的是一版、声明的是另一版」：

- `package.json` 的 `devDependencies`（构建期内联客户端入口用）
- `scripts/build-client.mjs` 里产物 `dependencies` 的字面量
- `tests/update-panel.test.mjs` 里那条 `deepEqual(pkg.dependencies, …)` 断言
