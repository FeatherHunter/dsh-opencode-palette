# v2.1.4 — 全仓 TypeScript 化（行为不变）+ 构建产物出库 + 随包更新依赖 0.18.25

## 改了什么
- **全仓 TypeScript 化（#109–#114，ADR 0003）**：41 个手写文件 / 12,456 行 `.mjs` → `.ts`；`tsc --noEmit` 进构建门禁、`tsc -p tsconfig.build.json` emit 到 `dist/`，零依赖 mini-bundler 改吃转译产物（C-lite，不引入 esbuild/rollup）；宿主半与 channel 从「原样复制」改为「tsc 转译输出」（S2）；原有 14 个测试文件全部转 `.ts`（另新增 `source-parser` 单测，现共 15 个），由 Node 原生类型剥离直跑。手写最小 ambient `types/dsh.d.ts`（≈36 成员）补齐宿主 API 类型面。
- **`engines.node` `>=22` → `>=22.18.0`**：`.ts` 脚本与测试由 Node 原生类型剥离直接运行的下界（#106 §5.3）。
- **构建产物移出 git（ADR 0004）**：根 `client.js` 与 `package/` 的 7 个派生物（`package.json` / `README.md` / `cordis.patch.yml` / `lib/` 下 4 件）取消跟踪，`npm test` 由 `pretest` 现产 8 件（约 2 s）；`verify:artifacts` 由「git diff 比对」改判八项（两次构建逐字节一致 / 八件齐全非空 / 八件不含 CR 字节 / `package/lib` 恰 4 文件 / 八件未被 git 跟踪 / `font-face.ts` 仍被跟踪 / `.gitattributes` 钉 `eol=lf` / 字体一致）。包内文本副本（`README.md`、`cordis.patch.yml`、`lib/event-list.json`）由构建器统一成 LF 再写，载荷与检出 EOL 解耦：本机历史 CRLF 工作区与新克隆现在打出一模一样的 tgz 字节。
- **随包依赖 `dsh-plugin-update` 0.18.11 → 0.18.25**：0.18.12–0.18.24 一次性带出安装身份识别（update / first-install / up-to-date）、`registered` 在册格、`engines.dsh` 检查、CLI 超时独立结局、`approvedBuilds`、稳定通道遇 prerelease latest 回退、URL userinfo 脱敏等；0.18.25 再带出失败后救援四态（`last-resort` / `salvageable` / `dead-end` / `unknown`，新增 `last-resort` 纯派生模块）、手工命令「沿用旧值」的 fail-closed（`manualSource` 的 `frame` / `carried-over` / `null`，失败回包后补读一次当帧读数）、宿主内 profile 身份解析链（`ctx.profileContext` → Desktop `desktopProfiles.current` → 显式 env）、手工命令为空按五类原因分因（新增 `manual-absent` 纯函数）、复制成功改为按钮外气泡 + 按钮 hover/active/focus-visible/forced-colors 补齐。`dsh-log` 0.3.4 不变。
- **内联闭包跟进**：浏览器 bundle 的入口件闭包随上游新增 `last-resort`（→ `codes`）与 `manual-absent`（→ `bilingual` / `commands` / `lang`）三个零 Node 依赖模块，`scripts/build-client.ts` 的 `INLINE_PACKAGES` 与 `MODULE_ORDER` 两处声明同步；`tests/update-panel.test.ts` 的新闭包在场断言补上这三个键，上游下次再增件时构建按「引用未声明即抛」拦截。
- **仓库门面整理**：根目录散落文档归位（`ip-presets-notes.md`、`ip-presets-v3-notes.md` → `docs/`）、`teach/` 本机教学状态整组内收（不入库）、移除误入库的本机 gh 状态；两版 README 的社群二维码文案与图片更新为「DSH 插件交流群」。
- 行为与产物契约不变：主题渲染、面板 UI、自定义主题编辑器功能与 2.1.3 一致；对外 `main`/`exports`/`files`/`dsh.client` 逐字不变。
- 版本 2.1.3 → 2.1.4（patch）

## 验证结果
- `node scripts/check-deps.ts`（构建前置硬门禁）四列全跟平：dsh-plugin-update 0.18.25 / 0.18.25 / 0.18.25 / 0.18.25；dsh-log 0.3.4 / 0.3.4 / 0.3.4 / 0.3.4。
- `npm run build` 绿（typecheck → check-deps → inline-fonts → emit 清 `dist/` → build-client 读 `dist/`）：`package/lib/client.js` 1544876 B、`client.js` 动态版 1544265 B、`package/lib/index.js` 25748 B。
- 双 Node 版本全绿：Node 24.19 `npm test` **273/273**（duration 9003.7 ms）；Node 22.18.0 `node --test tests/*.test.ts` **273/273**（9077.8 ms）。
- `npm run verify:artifacts` 八项全过：两次构建逐字节一致（sha256 相同）/ 八件齐全非空 / 八件不含 CR 字节（LF 载荷）/ `package/lib` 恰 4 文件 / 八件派生物均未被 git 跟踪 / `src/engine/font-face.ts` 仍被跟踪 / `.gitattributes` 钉 `eol=lf` / 字体一致。
- 人眼契约对照（门禁查不出的本地契约）：0.18.24 与 0.18.25 两版 `event-list.update.json` 逐字节相同（sha256 `299aa613…`，26 事件），本仓 `runtime/event-list.json` 白名单不缺，无需补。
- `npm pack`（在 package/ 内）7 files：README.md、cordis.patch.yml、lib/channel.js、lib/client.js、lib/event-list.json、lib/index.js、package.json；包内 version=2.1.4、dependencies（0.3.4 / 0.18.25）、`PALETTE_VERSION = '2.1.4'`；tgz 622428 B。
- 线上：`npm view dsh-opencode-palette version` = **2.1.4**、`dist-tags.latest` = **2.1.4**，`dist.shasum` = `6f03d6c4ac7f6bdacfeb469dd00645aa5fa7d68f`（与本地 tgz sha1 逐字符相同）。

## 哈希
- tgz sha1：6f03d6c4ac7f6bdacfeb469dd00645aa5fa7d68f
- tgz sha256：f5cd049f769e72a96adda4b8342e48cef302b0bf3e31b44569639baaf9ef7d4e
