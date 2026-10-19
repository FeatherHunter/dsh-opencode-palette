# v2.1.5 — 58 套主题判尺全绿 + 同步不再回滚 + 生成层 diff/tooltip 修复 + 随包依赖 0.18.32

## 改了什么
- **58 套主题全量审计并直接整改（#115–#121）**：新增 `scripts/audit-themes.ts`（`npm run audit:themes`；37-token 判尺：38 条硬性 4.5:1 / 15 条 UI 3:1 / 10 条信息项 / 8 项诊断；`--check` 门禁模式，只读不写主题 JSON）与 `docs/theme-audit/`（criteria / baseline / exceptions / presets-changes / report）。
  - 37 套预置（33 TUI + 4 desktop-2.0）：301 硬性 + 29 UI 违例 → **0 + 0**；35 份 JSON 直接改，4 套 desktop 由生成器重生成；matrix / vesper 无需改动。
  - 21 套 IP：108 违例 → **0 + 0**；145 个颜色槽调整，6 套浅色主题的代码舞台由深色卡改为同色系浅纸 + 深墨 syntax；21 条设计告警记档（背景族 / 角色并岗 / 品牌几何），0 条待处理。
  - 库洛米作为质量标杆保留，其余主题按各自设计理念整改，不套用同一模板。
- **同步策略：本地定制不再被静默回滚**：`npm run sync` 默认只报告不写盘（主题名 / 差异键 / 期望 vs 本地，`--verbose` 看全量）；只有 `--write` / `npm run sync:update` 才覆盖并清除 `MANIFEST.localCuration`；新增 `--accept-local` 离线登记。`src/themes/MANIFEST.json` 增加 `localCuration`（33 套 `preserve-local`），`docs/themes-sync-policy.md` 记录口径，AGENTS.md 补「预置主题同步（本地定制）」一节。
- **生成层缺陷修复**：
  - 自定义 / 单套色主题的 diff 修复方向：识别 `lightColors === darkColors` 后两半区各自按明暗修复，浅色主题 diff 底不再被压成 `#000000`（4 套 / 5 对）。
  - tooltip 可读性：标签色从硬编码白改为按浮层底现算，并向 `body [role="tooltip"]` 发元素规则（正文色优先，不足 4.5 退纯黑 / 白）；键帽底从同值改为派生 `keycapColor`（对比 ≥ 1.5）。修复前 8 条 < 4.5（最低 1.000）→ 57 条评估全部 ≥ 4.5（最低 5.678；IP 最低 9.259）。
- **desktop-2.0 生成器**：补齐 `secondary` 槽（`accent = palette.accent || interactive || info`，不足 3:1 时向 background / panel 修复）；`MANIFEST.adapted20` 指纹重算（2716 → 2792 B）。
- **随包依赖 `dsh-plugin-update` 0.18.25 → 0.18.32**：`scripts/build-client.ts` 的 `INLINE_PACKAGES` / `MODULE_ORDER` 补上新增闭包 `upd-log-panel-client`（`dist/log/panel-client.js`，依赖 `./client-queue.js`、`../hash.js`），`tests/update-panel.test.ts` 的 pin / 闭包断言同步。
- 版本 2.1.4 → 2.1.5（patch）

## 验证结果
- `node scripts/audit-themes.ts --check` exit 0：37 套预置 0 + 0、21 套 IP 0 + 0；tooltip 文字 < 4.5 评估 0 条；信息项 border < 3 表面 392（按设计不设门槛）；设计告警 21 记档 / 0 待处理；baseline 用最终树重生成后两次运行 SHA256 一致。
- 隔离工作树（干净检出 `6451c45` + 版本号）双 Node 全绿：Node 24.19 `npm test` **283/283**；Node 22.18 `node --test tests/*.test.ts` **283/283**。
- `npm run build` 绿（typecheck → check-deps → inline-fonts → emit → build-client）：`package/lib/client.js` 1592415 B、`client.js` 动态版 1591804 B、`package/lib/index.js` 25748 B。
- `npm run verify:artifacts` 八项全过：两次构建逐字节一致（sha256 相同）/ 八件齐全非空 / 八件不含 CR 字节（LF 载荷）/ `package/lib` 恰 4 文件 / 八件未被 git 跟踪 / `src/engine/font-face.ts` 仍被跟踪 / `.gitattributes` 钉 `eol=lf` / 字体一致。
- `npm run sync` exit 0（31 套声明漂移、需处理 0，不写盘）。
- `npm pack`（在 package/ 内）7 files：README.md、cordis.patch.yml、lib/channel.js、lib/client.js、lib/event-list.json、lib/index.js、package.json；包内 version=2.1.5、dependencies dsh-plugin-update 0.18.32；tgz 635720 B；隔离工作树重建 sha1 与主树 pack 逐字符相同。
- 线上：`npm view dsh-opencode-palette version` = **2.1.5**、`dist-tags.latest` = **2.1.5**，`dist.shasum` = `a45d62728e0e28a0c19839a7360cde2d544f67f8`（与本地 tgz sha1 逐字符相同）。

## 哈希
- tgz sha1：a45d62728e0e28a0c19839a7360cde2d544f67f8
- tgz sha256：ad0be1c499c9527247596c71a86475f7eb64e07dd345f1875654569f7d78ca66
