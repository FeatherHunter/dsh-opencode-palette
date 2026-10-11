# v2.0.28 — 更新系统跟到 0.13.0（面板字号参数化）

## 改了什么
- dsh-plugin-update ^0.12.0→^0.13.0（超范围，最小跟随）：上游 0.13.0 是纯加法 —— `themeTokens` 新增 5 个面板字号键（`panelFontSize` / `panelChapterFontSize` / `panelBannerTitleFontSize` / `panelLogFontSize` / `panelSmallFontSize`），沿「语义键 → `--dsh-update-panel-*` → 根内联」同口径，CSS 全量走旧值回退，不传即零回归。
- 本仓**不填**这 5 个键：本仓字号真源是用户排印档（`typography.size`，落在宿主正文），面板字号属宿主 chrome、包默认自成一套；要跟随得先拍板视觉改动。门禁新增断言把这条决定钉住（与 `entry*` 不写同一条）。
- 入口文案跟包原文更新：`有新版 X.Y.Z` → `有新版本 X.Y.Z`、`更新失败，点此查看` → `更新失败，请查看详情`（0.13.0 包内中文词典改动，门禁按包原文同步；idle / busy / restart 文案不变）。
- 声明与注释同步 `^0.13.0`：根 `package.json`、`scripts/build-client.mjs` 产物字面量与说明、`tests/update-panel.test.mjs` 断言、`runtime/client.mjs`、`src/engine/update-tokens.mjs` 头。
- 用户文档按事实校正：`README.md` 与 `docs/README.en.md` 里「按钮就地变成『更新至 vX.Y.Z』…点开即升级」改为包内真实文案与行为（「有新版本 vX.Y.Z」/「Update available vX.Y.Z」，点开弹窗再点安装）；npm 包内 README 由 `docs/README.en.md` 构建生成，随之更新。
- 版本 2.0.27→2.0.28（patch）

## 验证结果
- `node scripts/check-deps.mjs` 双绿：`dsh-plugin-update` 本地声明 = 已安装 = 产物声明 = 上游 latest = 0.13.0；`dsh-log 0.2.2` 同样一致。
- 入口件闭包 import 图与 0.12.0 逐文件比对无变化（entry / panel / config / redaction / service / changelog / queue / log-events / lang / bilingual），`INLINE_PACKAGES` 未动；`--dsh-update-*` 变量表 35→40（新增的正是那 5 个面板字号键），本地映射仍 24 个颜色键。
- `npm test` 178/178 全绿（含 37 主题 themeTokens 全过 0.13.0 校验、五态文案按包原文、事件清单形状与覆盖、宿主半真机式冒烟）。
- `npm view dsh-opencode-palette version` = 2.0.28，线上 `dist.shasum` = 本地 tgz sha1

## 哈希
- tgz sha1：e048c863f5eb1be388f031533e901140dfeac107
- tgz sha256：b8787b52a3b617fd91a157ba58feba66f9c0d7b6d204590fcca60cba5b3e4ced
