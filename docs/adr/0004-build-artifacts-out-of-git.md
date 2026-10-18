# 构建派生物移出 git：入库只留生成源，发布载荷现产

Status: accepted

> 注（2026-10-18）：本 ADR **取代 [ADR 0003](0003-typescript-migration.md) 的 D4**（「产物继续入库」）。
> ADR 0003 的 D1/D2/D3/D5/D6/D7、实施关键点与 Verification 数字均不变（那些数字是迁移当时的历史记录）。

## Context

ADR 0003 的 D4 让 `package/` 与根 `client.js` 随源码提交，沿用「构建产物与源码同提交」惯例，
用 `npm run verify:artifacts`（重建 + `git diff --exit-code package/ client.js`）守假绿。
当时（全仓 TypeScript 化）这条惯例换来的是「干净检出无需构建即可跑测试」的便利；本次盘点后判定代价超过收益。

**入库的 8 个派生物**（数字为实测字节数，逐字照抄）：

| 路径 | 字节 | 说明 |
|---|---|---|
| `client.js` | 1,517,465 B | 动态版（本地开发产物） |
| `package/lib/client.js` | 1,518,076 B | 包版客户端 bundle |
| `package/lib/index.js` | 25,748 B | 宿主半（tsc 转译） |
| `package/lib/channel.js` | 3,259 B | 通道常量（tsc 转译） |
| `package/lib/event-list.json` | 5,370 B | 日志事件白名单（随包） |
| `package/package.json` | 1,591 B | 产物 manifest |
| `package/README.md` | 5,315 B | 英文版包 README |
| `package/cordis.patch.yml` | 317 B | 与根 `cordis.patch.yml` 逐字节相同 |

全部由 `scripts/build-client.ts:423-441` 生成（先清 `package/` 残留再写；每轮构建都重写这 8 个文件）。

**三条实测代价**：

1. **体积**：`.git` 116.4 MB（2534 个全松散对象，无 pack）；其中 267 个产物 blob 唯一版本共
   223,241,239 B 未压缩、约 102 MB 压缩 ≈ **`.git` 的 88%**。
2. **历史 churn**：211 commits 中 `client.js` 改过 **117 次**、`package/**` 改过 **144 次**；
   每个 release 提交多约 **1.5 MB** 生成文本 diff（评审与 diff 阅读全被淹没）。
3. **假绿只能靠人工门禁**：6 个测试文件读盘上的产物字节（`update-panel` / `panel-render` /
   `custom-editor` / `log-switch` / `ip-presets` / `custom-themes-storage`）。源码改了却忘了重建时，
   测试照样拿盘上那份旧产物跑出绿；唯一能挡住的是旧 `verify:artifacts` 的 `git diff --exit-code`
   —— 一条「记得先跑」的人工门禁，而它的比对基准恰是 git 里的产物本身：比的是「与上次提交一致」，
   不是「与当前源码一致」。

**消费者判定**（逐一排查：有没有任何消费者需要「构建前」从 git 读产物字节？没有）：

- npm 安装走 registry：tgz 由 `package/` 内 `npm pack` 产出，`files` 白名单只有 `lib` 与
  `cordis.patch.yml`，根 `client.js` **不在包内**；
- 市场条目 `FeatherHunter__dsh-opencode-palette.yml` 指向 Release 资产 tarball（当前 v2.0.8），
  不是 git 树；
- 发布门禁 `scripts/publish-token.ps1:113-118` 只跑 `build` + `test`，不读 git 里的产物；
- 只剩测试需要「盘上有字节」，而现产这份字节的代价实测 **2.0 s**
  （`npm run emit` 1.8 s + `node scripts/build-client.ts` 0.1 s）；两次构建产物逐字节相同，
  且与入库版本一致（构建后 `git status` 对这些路径为空）。

结论：产物入库的唯一实际功能是「给测试发一份缓存」。缓存可以 `pretest` 现产，不必进 git。

## Decision

- **D1 8 个派生物不入库**。上表 8 条路径全部移出跟踪；`.gitignore` 增 5 条规则：
  `/client.js`、`/package/package.json`、`/package/README.md`、`/package/lib/`、
  `/package/cordis.patch.yml`。`package/release-notes-*.md` 是手写发布正文，继续入库；
  根 `cordis.patch.yml` 是源文件（产物那份是它的逐字节复制），继续入库。
  根 `client.js` 只是本地开发产物：不进 git、不进 npm 包、也不作为 Release 资产。
- **D2 `build:artifacts` 独立成目标，`pretest` 调它**。`package.json` 新增
  `"build:artifacts": "npm run emit && node scripts/build-client.ts"`；`build` 尾部改调它（构建链其余不变）；
  新增 `"pretest": "npm run build:artifacts"`。于是 6 个读产物的测试**永远测当前源码**，
  干净检出不需要任何入库字节。
- **D3 `verify:artifacts` 换新语义**：`"verify:artifacts": "node scripts/verify-artifacts.ts"`，
  六条断言：
  1. **可重复**：连跑两次 `build:artifacts`，8 个产物逐字节一致（构建确定性）；
  2. **完整性**：8 个产物存在且非空；
  3. **集合精确**：`package/lib/` 目录集合与期望**精确相等** —— 陈旧文件（如历史 `lib/channel.mjs`）
     会随 `files` 白名单一起 pack 进包，而 git 不再兜底，必须显式断言集合；
  4. **生成源同步**：`src/engine/font-face.ts` 在 `npm run fonts` **前后各比一次**「工作区内容 vs
     `HEAD` blob」（两侧行尾归一成 LF）——手改生成文件（前比即红）与输入漂移（后比即红）都拦得住，
     而新克隆的 CRLF 工作区不会假红（`git status --porcelain` 会因 stat cache 未刷新给出 phantom ` M`：
     blob 完全相同也报改动，实测在干净 worktree 复现 3/3）；
  5. **入库纪律**（回归保险）：8 个产物都**不得**被 git 跟踪（防再被 `git add -f` 加回来），
     同时 `src/engine/font-face.ts` 仍被跟踪；
  6. **换行属性**（回归保险）：`.gitattributes` 必须钉住 `eol=lf`（见 D6）。
- **D4 判据区分「分发载荷」与「生成源」**：会被源码 import、被编译器覆盖的生成文件仍入库，
  只被判为「复制 / pack 出去的载荷」的才移出。`src/engine/font-face.ts`（459,831 B）是**生成源**：
  被 `tests/engine.test.ts:13` 直接 import、被 `typecheck` 覆盖，仍入库，用「重新生成后无 diff」守
  （这条门禁本次才补上，此前只靠人工记得跑 `npm run fonts`）。
  一句话判据：**会不会被源码 import / 编译？会 → 生成源，入库 + 无 diff 校验；不会 → 载荷，不入库。**
- **D5 不重写历史**：tag 与 SHA 已公开、Release 资产与校验和挂在上面，重写会让既有一切失配。
  只做一次性 `git gc`：实测 `.git` **116.4 MB → 8.6 MB**（size-pack 8.37 MiB），已足够；
  历史 commit 里的旧产物字节仍可 `git show <tag>:package/lib/client.js` 取回。
- **D6 工作区钉成 LF**：`.gitattributes` 由 `* text=auto` 改为 `* text=auto eol=lf`。
  理由是 D1 的直接后果：产物不再从 git 检出、而是**本机现产**，工作区行尾于是成了构建输入的一部分 ——
  实测在 CRLF 工作区里构建，8 件产物各多出其 CRLF 字节数（`client.js` +7921 B、`event-list.json` +293 B、
  `cordis.patch.yml` +7 B），`npm pack` 出的 tgz 也随之不同（616448 vs 615846 B，sha1 亦不同）。
  索引里本就没有 CRLF 文件（`git ls-files --eol` 全 `i/lf`），改属性对已跟踪内容零影响。

## Consequences

- 新克隆 / 新机器首跑 `npm test` 由 `pretest` 现产（约 2 s），不再依赖仓库里有产物；
- **构建字节与机器无关**：`.gitattributes` 钉 `eol=lf`（D6），新克隆一律 LF 工作区，8 件产物与
  `npm pack` 出的 tgz 因此逐字节一致（改前实测：CRLF 工作区构建的 `client.js` 多 7921 B，
  tgz 616448 vs 615846 B、sha1 也不同）。这是 D1 的必要配套——产物从「检出得到」变成「本机构建」后，
  构建确定性不能再假设工作区行尾；门禁里那条 `eol=lf` 断言就是防它被改回去。
- 构建不再弄脏工作区（此前每轮 `npm run build` 都会改 8 个跟踪文件）；
- release 提交不再带约 1.5 MB 生成 diff，`.git` 与 diff 回到可读量级；
- 发布链**零改动**：`scripts/publish-token.ps1:113-118` 门禁只跑 `build` + `test`，不读 git 里的产物，
  `npm pack` 照旧在 `package/` 里现产现打；同一 tgz 既发 npm registry 也作 GitHub Release 资产；
- 回滚很简单：`git add -f`（把产物加回跟踪）即可，不必改回脚本；
- 与 [ADR 0003](0003-typescript-migration.md) 的关系：supersede 其 D4；D1/D2/D3/D5/D6/D7 不变，
  该 ADR 的 Verification 数字保留为迁移当时的历史记录。

> 一句话原则：**分发载荷不入库；生成源入库 + 重新生成后 diff 干净的校验。**
