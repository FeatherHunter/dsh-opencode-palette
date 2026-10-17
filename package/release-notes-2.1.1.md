# v2.1.1 — 随包依赖跟上 dsh-plugin-update 0.18.7

## 改了什么
- **随包依赖升级**：`dsh-plugin-update` 精确钉版 0.18.6 → **0.18.7**（`dsh-log` 保持 0.3.4）。上游 0.18.7 的内容：批量面接上合规版降级（#156 场景三）、异步安装失败不再靠插件标识猜真凶（宿主新增 `failedJobDiagOf`，带失败任务的快照在成功回包上补一份可选 `diag`）、凭证与决议时序修复。
- **客户端入口闭包 13 → 17 件**：0.18.7 把 `service` 拆出 `version-judgment` / `check-conclusion` / `registry-fetch`，把 `panel` 的文案拆出 `panel-copy`；`INLINE_PACKAGES` 与 `MODULE_ORDER` 按真实 import 补声明并重排（四个新件零 Node 依赖，可安全内联）。构建期「引用未声明即抛」按设计先报了错，据此补齐。
- **人眼契约对照零改动**：日志事件白名单 `event-list.update.json` 两版逐字节相同（26 事件，本仓 31 条不缺）；`dist/codes.js` sha256 相同、blocked 码表无新增；在用的 10 个子路径导出零删除零改名（`.` 129→130、`./panel` 61→63、`./panel-batch` 15→20，均为增量）。
- **文档校正**：AGENTS.md 的依赖号（`^0.12.0` → 精确钉版 0.18.7）；ADR 0002 的人眼契约改为「只剩日志事件白名单一处」（blocked 码与文案自研面板删除后全 import 包自身），并补记超出范围升级时 `check-deps` 的自举步骤。
- 版本 2.1.0 → 2.1.1（patch：依赖跟随，无新功能）

## 验证结果
- `node scripts/check-deps.mjs`（构建前置硬门禁）四列全跟平：dsh-plugin-update 0.18.7 / 0.18.7 / 0.18.7 / 0.18.7；dsh-log 0.3.4 / 0.3.4 / 0.3.4 / 0.3.4。
- `npm run build` 绿；`npm test` **246/246 全绿**（14 个测试文件，0 fail / 0 cancelled / 0 skipped）。
- `npm pack`（在 package/ 内）7 files：README.md、cordis.patch.yml、lib/channel.mjs、lib/client.js、lib/event-list.json、lib/index.js、package.json；包内 version=2.1.1、dependencies 双写 0.18.7、`PALETTE_VERSION = '2.1.1'`。
- 线上：`npm view dsh-opencode-palette version` = **2.1.1**、`dist-tags.latest` = **2.1.1**，`dist.shasum` = `00c00c36d279f61079c0b625d7aa72e69429f5f5`（与本地 tgz sha1 逐字符相同；受理后 100 秒可见）。

## 哈希
- tgz sha1：00c00c36d279f61079c0b625d7aa72e69429f5f5
- tgz sha256：0af177b71342b1a76c59d1ae484d0c7e985ac77521e7419f96dccae07d9fe16d
