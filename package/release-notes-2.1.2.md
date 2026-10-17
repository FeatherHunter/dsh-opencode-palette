# v2.1.2 — 随包依赖跟上 dsh-plugin-update 0.18.11

## 改了什么
- **随包依赖升级**：`dsh-plugin-update` 精确钉版 0.18.7 → **0.18.11**（`dsh-log` 保持 0.3.4）。上游 `0.18.8`～`0.18.11` 四段从未单独发到 npm（registry 从 `0.18.7` 直达 `0.18.11`，GitHub Release 同样只有 `v0.18.11`），随 `0.18.11` 一次带走：`0.18.8` 已装包更新不再被 HMR `already-installed` 打死（按宿主出路如实移除再装，#167）；`0.18.9` 对抗式审查六层失效面、scoped 包 tarball 地址修正（取 basename）、registry 地址归一、全量包文档 4MB 墙、管理器失败退出码透传、stable 通道遇预发布 latest 容忍（已装不在通道时报 `channel-mismatch` 不再整次失败）、12 个宿主拒绝码中文下一步（#178/#183）；`0.18.10` 任务状态落盘（写任务同时写 `state.json`，崩溃后可恢复）与前版本保真（`job.previousVersion`，#179/#186）；`0.18.11` 批量失败横幅两枚批量复制按钮（复制诊断/复制手工命令，#176）与安装锁自愈（判据只看时间+可解析性，陈旧阈值=`installTimeoutMs`，锁写入原子化，坏锁不再堵死读取，#181）。
- **客户端入口闭包仍为 17 件、零结构改**：17 个内联模块中 14 件逐字节相同，仅 `registry-fetch` / `service` / `bilingual` 有内容变化（scoped 修正与通道容忍、安装时记前版本、2 个新 toast 文案键），且 import 边一条未变；`INLINE_PACKAGES` 与 `MODULE_ORDER` 未动（构建期「引用未声明即抛」全程无报错）；`dist/codes.js` 无差异、blocked 码表无新增；上游包 11 个子路径导出键相同。
- **人眼契约对照零改动**：两版 `event-list.update.json` 逐字节相同，本仓 `runtime/event-list.json` 白名单不缺，无需补。
- 版本 2.1.1 → 2.1.2（patch：依赖跟随，无新功能）

## 验证结果
- `node scripts/check-deps.mjs`（构建前置硬门禁）四列全跟平：dsh-plugin-update 0.18.11 / 0.18.11 / 0.18.11 / 0.18.11；dsh-log 0.3.4 / 0.3.4 / 0.3.4 / 0.3.4。
- `npm run build` 绿（`package/lib/client.js` 1444146 B、`client.js` 动态版 1443565 B、`package/lib/index.js` 23275 B）；`npm test` **265/265 全绿**（0 fail / 0 cancelled / 0 skipped）。
- `npm pack`（在 package/ 内）7 files：README.md、cordis.patch.yml、lib/channel.mjs、lib/client.js、lib/event-list.json、lib/index.js、package.json；包内 version=2.1.2、dependencies 双写 0.18.11、`PALETTE_VERSION = '2.1.2'`；新键 `batch.toast.copy-all-diag-ok` 已进包版 bundle。
- 线上：`npm view dsh-opencode-palette version` = **2.1.2**、`dist-tags.latest` = **2.1.2**，`dist.shasum` = `ef7691590a80ba86a5bb5e172ee3f2116c7df1a2`（与本地 tgz sha1 逐字符相同；受理后约 2 分半可见）。

## 哈希
- tgz sha1：ef7691590a80ba86a5bb5e172ee3f2116c7df1a2
- tgz sha256：42a0c51104391446dc953968ef9e610cec2888653acee0fa6ae35cb447848b09
