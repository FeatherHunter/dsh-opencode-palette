# v2.1.4 — 全仓 TypeScript 化（行为不变）+ 随包更新依赖 0.18.24

## 改了什么
- **全仓 TypeScript 化（#109–#114，ADR 0003）**：41 个手写文件 / 12,456 行 `.mjs` → `.ts`；`tsc --noEmit` 进构建门禁、`tsc -p tsconfig.build.json` emit 到 `dist/`，零依赖 mini-bundler 改吃转译产物（C-lite，不引入 esbuild/rollup）；宿主半与 channel 从「原样复制」改为「tsc 转译输出」（S2）；原有 14 个测试文件全部转 `.ts`（另新增 `source-parser` 单测，现共 15 个），由 Node 原生类型剥离直跑。手写最小 ambient `types/dsh.d.ts`（≈36 成员）补齐宿主 API 类型面。
- **`engines.node` `>=22` → `>=22.18.0`**：`.ts` 脚本与测试由 Node 原生类型剥离直接运行的下界（#106 §5.3）。
- **随包依赖 `dsh-plugin-update` 0.18.11 → 0.18.24**：上游一次性带出 0.18.12–0.18.24 的安装身份识别（update / first-install / up-to-date）、`registered` 在册格、`engines.dsh` 检查、CLI 超时独立结局、`approvedBuilds`、稳定通道遇 prerelease latest 回退、URL userinfo 脱敏等；`dsh-log` 0.3.4 不变。
- 文档同步：`DESIGN.md` 按 TS 两段式构建重写、`AGENTS.md` 构建与验证流程更新（typecheck / emit / `verify:artifacts` / 双 Node 全绿）、`docs/i18n-glossary.md` 路径更新、新增 `docs/adr/0003-typescript-migration.md`；`CONTEXT.md` 维持不新建（理由见 ADR）。
- 行为与产物契约不变：主题渲染、面板 UI、自定义主题编辑器功能与 2.1.3 一致；`package/lib/*` 形态不变（`channel.mjs` → `channel.js` 随 S2 转译），对外 `main`/`exports`/`files`/`dsh.client` 逐字不变。
- 版本 2.1.3 → 2.1.4（patch）

## 验证结果
- `node scripts/check-deps.ts`（构建前置硬门禁）四列全跟平：dsh-plugin-update 0.18.24 / 0.18.24 / 0.18.24 / 0.18.24；dsh-log 0.3.4 / 0.3.4 / 0.3.4 / 0.3.4。
- `npm run build` 绿（typecheck → check-deps → inline-fonts → emit 清 `dist/` → build-client 读 `dist/`）：`package/lib/client.js` 1518076 B、`client.js` 动态版 1517465 B、`package/lib/index.js` 25748 B。
- 双 Node 版本全绿：Node 24.19 `npm test` **273/273**（duration 9129 ms）；Node 22.18.0 `node --test tests/*.test.ts` **273/273**（9025.7 ms）。
- `npm run typecheck` exit 0；`tsc --listFilesOnly` 325 文件（自有 src/runtime/scripts/tests/types 104）。
- `npm run verify:artifacts`（重建产物后 `git diff --exit-code package/ client.js`）exit 0：入库产物与构建输出逐字节一致，无假绿。
- 迁移六条验收（#106 §6.3）逐条取证于 #113；构建产物在 Node 22.18 与 24 下 SHA256 逐字节一致。
- `npm pack`（在 package/ 内）7 files：README.md、cordis.patch.yml、lib/channel.js、lib/client.js、lib/event-list.json、lib/index.js、package.json；包内 version=2.1.4、dependencies（0.3.4 / 0.18.24）、`PALETTE_VERSION = '2.1.4'`；tgz 615846 B。

## 哈希
- tgz sha1：49870bedd95da09fb4a994ccf7d42f05fd1fe1c0
- tgz sha256：0b145f10f0ddf6a1062a610a225e684cc7740173dca73ce80b90c641e166cf0b
