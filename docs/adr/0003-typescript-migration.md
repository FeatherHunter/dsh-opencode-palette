# 全仓 TypeScript 化：tsc 只做类型检查与 emit，零依赖内联器继续消费 `dist/`

Status: accepted

## Context

仓库原为手写 `.mjs`（引擎 / 运行时 / 脚本 / 测试共 41 个文件、约 12.5k 行），构建靠 `scripts/build-client.mjs`
这个零依赖 mini-bundler（逐行正则识别 import/export）。目标是把整个项目转为 TypeScript，主要动机是
**提高未来开发（尤其 AI 辅助开发）的质量**：让编译器成为可执行的接口规格，降低「猜 API、漏改引用、结构漂移」类缺陷。

迁移前的研究（四张研究票，产物在 `docs/research/ts-migration-*.md`）给出三条硬约束：

1. **瓶颈是正则 bundler，不是源码语法**：`JS_IMPORT_RE` 等只认单行单引号 `.mjs`，tsc 默认 emit（双引号、分号、`.js`）全失配；
2. **测试网大量读取源码/产物文本**（286 条），迁移期最大风险是「测试假绿」；
3. **宿主 API 完全没有类型**（`@deepseek-ai/*` 的 `.d.ts` 不随运行时安装），必须手写最小 ambient。

成本评估 6–10 人日。用户授权由实施者按第一性原理决策（地图 #104），随后分 P0–P4 五张任务票落地。

## Decision

- **D1 源码 TS，bundler 只消费 tsc 转译后的 JS（C-lite）**。保留零依赖文本内联器，不引入
  esbuild/rollup（`DESIGN.md` §7：无网络依赖、产物确定、无版本漂移）。tsc 负责类型检查 + emit。
- **D2 先做与 TS 解耦的构建链硬化（P0 #109）**：抽出 `scripts/lib/source-parser.ts`（逐行解析
  JSON import / JS import / 包 import / export / re-export / `import type`），支持单双引号、可选分号、
  `./` 与 `../` 说明符、`.mjs`/`.js` 扩展名；补齐 fixture 与真实源码等价性测试。
- **D3 手写最小 ambient `types/dsh.d.ts`**（11 接口 + 1 类型别名 + 2 个全局变量，约 36 成员），
  不 import `@deepseek-ai/*`；devDependencies 只钉 `typescript`、`@types/node`、`@types/react`。
- **D4 产物继续入库**：`package/`、根 `client.js` 随源码提交，沿用「构建产物与源码同提交」惯例；
  用 `npm run verify:artifacts`（重建 + `git diff --exit-code package/ client.js`）守假绿。
- **D5 按依赖组分批，模块与其测试同一次提交**：P0 构建链 → P1 工具链/类型 → P2 engine+scripts →
  P3 runtime/host + 测试全转 → P4 验收/文档/发布。
- **D6 `prototypes/` 排除**：设计原型（HTML + 少量 `.mjs`）是历史资产，不迁 TS，文档记录为唯一例外。
- **D7 验收用六条可判定标准**（`docs/research/ts-migration-test-harness-106.md` §6.3）：双 Node 版本全绿、
  `tsc --noEmit` 0 错、无读 `.mjs` 源码断言、build 后产物干净、断言有效性抽样、测试墙钟 ≤ 2× 基线。

## 实施关键点

- `tsconfig.json`：`strict`、`noEmit`、`module/moduleResolution: NodeNext`、`target: ES2022`、
  `lib: ES2022 + DOM`、`erasableSyntaxOnly`（Node 剥不掉的语法编译期拦）、`rewriteRelativeImportExtensions`、
  `verbatimModuleSyntax`、`resolveJsonModule`、`include` 覆盖 `src/ runtime/ scripts/ tests/ types/`；
  未关 `strict`，未用 `allowJs`/`checkJs`（P1 曾被评审要求给出理由：初版 `checkJs:false` 被否决，最终
  以「全仓 `.ts` + strict」实现，无 `// @ts-check` 试点残留）。
- `tsconfig.build.json`：`noEmit:false`、`outDir: dist/`、`rootDir: "."`、`declaration/sourceMap:false`、
  `files: ["types/dsh.d.ts"]`（ambient 必须进 emit 程序，夹具不进 `dist/`）；include 只有
  `src/engine/**/*.ts` 与 `runtime/**/*.ts`（scripts 不 emit，只由 base typecheck 检查）。
  `npm run emit` 先清空 `dist/` 再 tsc——否则删/改名模块会以陈旧文件复活并被内联器读到。
- `scripts/build-client.ts` 读 `dist/src/engine/*.js` 与 `dist/runtime/*.js`；宿主半与 channel 从
  「源码原样复制」改为「tsc 转译输出」（S2）；产物 `engines.node` 与产物依赖字面量同步更新。
- `types/dsh.d.ts` 对研究稿 `docs/research/ts-migration-typing-surface-105.md` §6.2 的**三处故意偏离**
  （该文件是设计草案，以实现为准）：`DshTokenModes` 两半可选（真实数据可只给一半）；
  `locale.register` 的 namespace 放宽为 `string`；补 `DshTimerService.timeout(handler, delay)`
  （依据 cordis-plugin-timer@1.1.7）。
- **Node 版本**：源码/测试直接用 Node 原生类型剥离运行，`engines.node` 由 `>=22` 抬到 `>=22.18.0`
  （默认剥离的下界），连带根 `package.json`、产物 `package.json`、构建器产物字面量、
  `tests/update-panel.test.ts` 等 5 处。
- **测试**：原有 14 个测试文件全转 `.ts`（另新增 `source-parser` 单测，现共 15 个），仍由 `node --test` 显式清单运行（不经 tsc、不需构建）；
  类型正确性由 `npm run typecheck` 独立把关。测试中的源码文本断言分两类：数据字面量与负断言（#106 的 B 类，
  如主题名表、I18N 文案、产物契约字符串）；少数是结构性「源码契约」块（`tests/custom-editor.test.ts`
  #93/#94/#95 一组，含 `POP_W` 声明、定位 effect 调用形状等，即 #106 的 A 类）——作为**已知债务**保留，
  不宣称已清零；C 类 23 条已在 #114 删除或升级为执行级断言。
- `custom-editor` 不引 `@types/react` 的 JSX 运行时（项目零 JSX，全部 `React.createElement`），
  按调用形状手写结构类型；`@types/react-dom` 未安装，`panel-render` 测试用本地最小接口。

## Verification（六条标准，发布前实测）

1. **双版本绿**：Node `24.19.0` 与 `22.18.0` 全量 273/273 pass（基线 266，C 类合并未减少用例）。
2. **类型门禁**：`npm run typecheck` exit 0；`tsc --listFilesOnly` 覆盖 src/runtime/scripts/tests/types。
3. **无读 `.mjs` 源码断言**：`grep` 审计 tests/ 无 `runtime/*.mjs`、`src/*.mjs` 读取断言；
   残留 `.mjs` 字符串只出现在「迁移前旧风格冻结 fixture」与注释说明。
4. **产物同步**：`npm run build` 后 `npm run verify:artifacts` 干净（重建与入库产物逐字节一致）。
5. **断言有效性抽样**：故意改 3 处被数据字面量断言 pin 的值（`THEME_EN` 条目、`THEME_ZH` 条目、
   I18N 中文），对应测试分别变红；改回即绿。（`POP_W` 值当时也试过会变红，但对应断言是 A 类
   「源码契约」块，不计入本标准的有效证据。）
6. **性能**：`npm test` 墙钟约 9 s，远低于 2× 基线（≤18.5 s）。

## Consequences

- 开发反馈链变长一步（类型错误需 `npm run typecheck`，构建前已强制），换来重构安全网与可执行的接口契约。
- 新增/修改模块时：改 `.ts` 源码 → `npm run typecheck` → `npm run build`（emit + 内联 + 产物）→ `npm test`。
- 本迁移不改变运行时行为、发布契约（`main`/`exports`/`files`/`dsh.client`/`engines` 除 node 下界外逐字不变）
  与面板功能；产物形状变化仅来自 tsc 转译文本与随包依赖升级。
- `CONTEXT.md` 维持不新建：`docs/agents/domain.md` 明确缺席时静默处理，且本仓领域语言已由
  `DESIGN.md` 与 `docs/i18n-glossary.md` 承担；ADR 目录记录决策。
- 与 ADR 0002 的关系：随包依赖仍精确钉版；0.18.11 → 0.18.24 的升级按 ADR 0002 的自举步骤执行
  （先改产物快照再构建），并作为本次发布的一部分。
- 后续：`prototypes/` 例外已在本 ADR 与 `DESIGN.md` 记录；现行文档（`DESIGN.md`/`AGENTS.md`/`docs/i18n-glossary.md`）的 `.mjs` 提法已在 P4 同步清理，历史 ADR 0001 与 `scripts/.publish-logs/` 按原文保留（ADR 0002 顶部已加迁移注记）。
