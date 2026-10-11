# v2.0.27 — 更新系统跟到 0.12.0

## 改了什么
- dsh-plugin-update ^0.10.0→^0.12.0（超范围，最小跟随）：本地接线零行为改动（入口件 `mountUpdateEntry` + `themeTokens` 换肤 + `sizing` 全沿用），只跟声明、门禁与注释；两个次版本的改动随包带走：
  - 0.11.0：新增 `channel-mismatch` 阻塞原因（失败码 14→15，中英双语文案齐）；修掉「预发布已装版被误报 `unknown-profile`」；手工命令无安全可选项时回空，不再猜版本
  - 0.12.0：更新日志支持中文分类（新增/修复/变更/弃用预告/移除/安全）；档案卷面板按原型收紧（版本 mono + 日期灰小字、横幅副行出框、宿主全局样式隔离）
- 门禁同步：blocked 码契约断言补 `channel-mismatch`（八种→九种）；版本字面量与注释同步到 `^0.12.0`（根 `package.json`、`scripts/build-client.mjs` 产物声明、`tests/update-panel.test.mjs`）
- 文档按事实校正：`AGENTS.md` 与 `DESIGN.md` 里随包依赖的版本示例由过期的 `^0.7.0` 改为当前 `^0.12.0`
- 版本 2.0.26→2.0.27（patch）

## 验证结果
- `node scripts/check-deps.mjs` 双绿：`dsh-plugin-update ^0.12.0`（本地声明/已安装/产物声明/上游 latest 四处一致）、`dsh-log 0.2.2` 同样一致
- 入口件闭包依赖图与 0.10.0 逐文件比对无变化（entry / panel / config / redaction / service / changelog / queue / log-events / lang / bilingual 的 import 行全同），`INLINE_PACKAGES` 无需改动；`themeTokens` 键表仍 35 键，无新增键
- `npm test` 178/178 全绿（含 37 主题换肤校验、事件清单形状与覆盖、宿主半真机式冒烟）
- `npm view dsh-opencode-palette version` = 2.0.27，线上 `dist.shasum` = 本地 tgz sha1

## 哈希
- tgz sha1：ca3f88a09a261e78b545992e820aab7a42e3a62a
- tgz sha256：62d559cc372b99792887d97dd75bad33a0ff276ff26b9115ea03389ee5046f02
