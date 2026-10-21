# v2.1.6 — 随包依赖 dsh-plugin-update 0.18.33（客户端内联闭包按上游新布局重推）

## 改了什么
- **随包依赖 `dsh-plugin-update` 0.18.32 → 0.18.33**（精确钉版，两处声明同改：根 `package.json` + `scripts/build-client.ts` 产物字面量）。
  - 上游 0.18.33 = **发布线并入 master 后的第一个合体版**：含 0.18.26～0.18.32 的修复线（#215～#232）+ 一次内部目录拆分重构（上游 `src/` 拆成 `src/core|panel|host|shared`）。
  - **公开面零变**：11 个导出子路径（`.` / `./log` / `./panel` / `./client` / `./batch` / `./panel-batch` / `./entry` / `./entry-batch` / `./install-button` / `./http` / `./package.json`）、导出名、事件契约、日志行字段、诊断键一字未动；**运行时行为与 0.18.32 相同**。
  - 内含修复：缺席目标不再被旧失败任务拦 / 批量面板显示缺陷 / 批次日志对齐 / 僵尸排队占位导致全局 update-busy / 批量续跑假成功 / 在装按钮单转圈 / 忙时队列行文案 等。
- **客户端内联清单按上游新布局重推**（`scripts/build-client.ts` 的 `INLINE_PACKAGES` / `MODULE_ORDER`）：上游 dist 的扁平路径大多搬进 `dist/core|shared|panel|host`，旧 23 件闭包重推为 **36 件**。
  - `dist/entry.js` / `dist/panel.js` 变**再导出壳**，实现搬进 `dist/panel/entry.js` 与 `dist/panel/{theme,skip-store,view-model,render,archive-theme,failure-latch,mount,client}.js`。
  - `dist/bilingual.js` → `dist/core/i18n/{text,dictionary,styles}.js`；`dist/changelog.js` → `dist/core/changelog/{parse,render-model}.js`；`dist/service.js` → `dist/core/service.js`；`dist/version-judgment.js` → `dist/core/judgment.js`；`dist/check-conclusion.js` → `dist/core/conclusion.js`；`dist/install-fail.js` → `dist/core/failure.js`；`dist/registry-fetch.js` → `dist/core/fetch.js`；`dist/install-cause.js` → `dist/core/cause.js`；`dist/queue.js` → `dist/core/queue/model.js`；`dist/config.js` / `dist/codes.js` / `dist/lang.js` / `dist/commands.js` / `dist/log-events.js` / `dist/last-resort.js` / `dist/manual-absent.js` / `dist/redaction.js` / `dist/hash.js` / `dist/panel-copy.js` → `dist/shared/*`；新增 `dist/core/batch/model.js`。
  - 每个模块的 `deps` 按包内 import **原字面量**逐条声明（构建器逐字校验，缺一项即「vendor 模块引用了未声明的依赖」）。
  - **零 Node 依赖**已核实：闭包内 0 个非相对说明符，无 `node:` 内建 / `require` / 动态 `import` / `export default` / `export *`；只用 `globalThis.TextEncoder` / `globalThis.AbortSignal` / `globalThis.document`。
- **事件清单按上游 0.18.33 重建**（`scripts/rebuild-event-list.ts` + `runtime/event-list.json`）：上游目录 0.18.32 → 0.18.33 逐字节相同，但本仓清单此前落后于上游（31 事件 / counts 23·7·1）→ 重建后 **34 事件 / counts 27·6·1**（上游 29 事件逐条对齐 + 本仓独有 5 事件）。
  - 口径一：共享事件 `host.call.fail` **以上游为准**（上游加了稳定码字段 `error`；本仓发射的字段是它的子集，按上游放宽不会让本仓字段变未知）。
  - 口径二：`update.install.fail` 上游已加回且确有发射点（上游 `dist/core/service.js`），从「真删」名单移出、按上游全收。
  - 同步点：`runtime/host.ts` 注释（31 项 → 34 项）、`tests/update-panel.test.ts` 的 counts pin（23·7·1 → 27·6·1）与 emitted 子集（补 `update.install.fail` / `update.batch.run.start` / `update.install.retry`）。
- 版本 2.1.5 → 2.1.6（patch）。

## 验证结果
- `npm run build:artifacts` exit 0：`package/lib/client.js` 1599839 B、`client.js`（动态版）1599228 B、`package/lib/index.js` 25748 B。
- `npm run deps:check` exit 0：`dsh-plugin-update` 本地声明 / 已安装 / 产物声明 / 上游 latest **四处均 0.18.33** ✓；`dsh-log` 0.3.4 ✓。
- `npm test` **283 pass / 0 fail**（Node 24.19.0）。
- `npm run verify:artifacts` 八项全过（字体一致 / 两次构建逐字节一致 / 八件齐全非空 / 八件不含 CR / `package/lib` 恰 4 文件 / 八件未被 git 跟踪 / `font-face.ts` 仍被跟踪 / `.gitattributes` 钉 `eol=lf`）。
- `npm run audit:themes` exit 0：**58 套主题**（预置 37 + IP 21）、59 套配色；硬性 4.5/3.0 违例 **0 + 0**；tooltip 文字 < 4.5 评估 0 条；信息项 border<3 表面 392（按设计不设门槛）；设计告警 21 条记档 / 0 待处理。
- `npm run sync` exit 0（33 套中 31 套声明漂移、需处理 0，不写盘）。
- `npm pack`（在 package/ 内）7 files：README.md、cordis.patch.yml、lib/channel.js、lib/client.js、lib/event-list.json、lib/index.js、package.json；包内 version=2.1.6、dependencies dsh-plugin-update 0.18.33；tgz 637164 B。
- 隔离工作树（本次发布提交的干净检出 + `npm install`）重建：`npm run build` + `npm pack` 产出的 tgz 与主树 pack **sha1 逐字符相同**（`e5a452e…`，637164 B）——发布载荷字节级可复现。
- 线上：`npm view dsh-opencode-palette version` = **2.1.6**、`dist-tags.latest` = **2.1.6**，`dist.shasum` = `e5a452e3530c6809097db952c5761b152917c0b9`（与本地 tgz sha1 逐字符相同）；**可见时间 2026-10-20 01:24:04 (+08:00)**（registry time.1.6.6 = 2026-10-19T17:24:04.040Z；轮询于 01:24:35 确认可见）。

## 哈希
- tgz sha1：e5a452e3530c6809097db952c5761b152917c0b9
- tgz sha256：c3052a4048ddf91b2b85f02a1cb658f2e5d916db616e5e416a0279c865cfcfeb
- npm integrity：sha512-5+3FGUqXtU8rfGzCURwj/ymv8c3YTgCF6ulvm28hcHUlCx91IcWXf1L6EWoFZgvE2hoVtlKI+s5ZdOrzwwKsvQ==
