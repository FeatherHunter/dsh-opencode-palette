## Agent skills

### Issue tracker

Issues and specs live as GitHub issues, operated via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles map 1:1 to labels `needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### 开发规范（维护者指令，强制）

所有开发与问题推进按 [docs/agents/dev-standards.md](docs/agents/dev-standards.md)：JS 代码改动一律先重构为 TS；纯 TS 架构/数据结构/算法/设计模式/高级架构师思维；从第一性原理出发；每个里程碑做对抗式审查；目录与文件名自解释；不过度发散；充分封装解耦、组件可复用。

### 本机教学状态（不入库）

个人 teach workspace 整组收在 `teach/`（`MISSION.md` / `RESOURCES.md` / `NOTES.md` / `lessons/` / `reference/` / `learning-records/` / `assets/`），已被 `.gitignore` 覆盖：根目录只放项目门面，教学文件不要放回根目录；教学会话先读 `teach/NOTES.md`。

## 预置主题同步（本地定制）

`src/themes/*.json` 是**直接维护的本地定制**（不是上游原样 vendoring）：整改/调色改 JSON 本身，不要建 sidecar 覆盖。完整策略、命令表与升级流程见 [docs/themes-sync-policy.md](docs/themes-sync-policy.md)。

- `npm run sync`（默认 verify）**只报告不写盘**：检测本地漂移并列出文件 + 差异键 + 期望 vs 本地；已在 `src/themes/MANIFEST.json` 的 `localCuration.themes` 声明的差异算预期（退出码 0），未声明漂移/文件缺失/JSON 损坏退出码 1。**手工修改不会被静默回滚。**
- 覆盖本地必须显式：`npm run sync -- --write`（警告：丢弃本地定制并清除 localCuration）或 `npm run sync:update`（改 `OPCODE_SHA` 后升级基线，同样覆盖主题）。
- 有意修改主题后：`git diff` 复核 → `npm run sync -- --accept-local` 登记本地定制 → `npm test` 全绿。
- 上游 pin = `scripts/sync-themes.ts` 的 `OPCODE_SHA`（不可变 commit）。升级 = 改 SHA → `npm run sync:update` → 人工把本地定制合并回来 → `--accept-local` → `npm test`；同步器不会自动保留本地改动。
- 4 套 desktop-2.0 派生主题（amoled/oc-2/onedarkpro/shadesofpurple）由 `scripts/convert-desktop-themes.ts` 生成，不在 sync 校验范围（见 `MANIFEST.adapted20`）。

## Release

双通道一次跑完：npm 官方源 + GitHub Release。**本仓只负责发布，不负责安装**：Release 正文与 README 只写发布出去的东西（改了什么、验证结果、哈希），安装/升级指引归宿主与市场。

### 版本号

小步递增：常规发布默认 patch（+0.0.1，如 1.6.0 → 1.6.1）；确有新功能才 minor（+0.1.0）；大版本由作者拍板（如 2.0.0）。bump 前先与用户确认，确认后再构建与发布。

**bump 之后刷新 README 里的版本号**：两页 README 的 UPGRADE 段给用户看的是真实当前版本（不是 `<版本>` 占位符），那份版本号由 `package.json` 派生 —— bump 完跑 `npm run readme:version`（`scripts/sync-readme-version.ts`）把两页一起刷成新版本号。`npm run readme:version:check` 只查不写，过期 exit 1；`tests/readme-body.test.ts` 里也钉着「README 版本号 = package.json 版本」，所以忘了刷新会红。

### 流程

1. **构建与验证**：`npm run build`（类型检查 `typecheck` → 依赖门禁 `check-deps.ts` → 字体生成 → tsc emit `dist/` → 零依赖内联 `build-client.ts`，末两步即 `npm run build:artifacts`）→ `npm test` 全绿（Node `22.18.0` 与 `24.x` 各跑一遍；源码与测试均为 `.ts`，靠 Node 原生类型剥离直接跑；`pretest` 先跑 `build:artifacts` 现产 8 个产物，读产物的测试因此永远测当前源码）→ `npm run verify:artifacts` 干净（`node scripts/verify-artifacts.ts` 八项：字体一致（`npm run fonts` 前后各比一次 `src/engine/font-face.ts`，行尾归一化后比较）/ 两次构建逐字节一致 / 八件齐全非空 / 八件不含 CR 字节（LF 载荷）/ `package/lib` 恰 4 文件 / 八件未被 git 跟踪 / `font-face.ts` 仍被跟踪 / `.gitattributes` 钉住 `eol=lf`）→ 在 `package/` 里 `npm pack`，得到 `dsh-opencode-palette-<版本>.tgz`。
2. **npm 发布**：Agent 弹窗拉起向导，人只在浏览器里做 2FA：
   ```powershell
   Start-Process powershell.exe -ArgumentList '-NoExit','-ExecutionPolicy','Bypass','-File','<repo>\scripts\npm-release-wizard.ps1'
   ```
   向导 4 阶段一气推完（无按回车卡点，复核后 3 秒自动继续）：登录态 → 复核 → 发布 → 验证。人只在浏览器里完成 2FA，看到 `+ dsh-opencode-palette@<版本>` 即受理（本账号异步处理，验证阶段轮询）。令牌不进聊天、不进仓库；Agent 不碰令牌，发布动作由人在弹窗里完成。
   token 无人值守通道（有写权限 token 时优先走这条，不用人扫码）：`$env:NODE_AUTH_TOKEN` 只给变量名不贴全文 → `pwsh -NoProfile -File scripts\publish-token.ps1 -Probe`（先探针，PROBE-OK 再往下）→ `pwsh -NoProfile -File scripts\publish-token.ps1`（门禁→发 `package/`→一次采样；宣布前加 `-FullPost` 轮询到可见）。受理≠可见：`E409 previously-staged` 即已收下，等几分钟再查，不要重发也不要升版。
3. **对账**：`npm view dsh-opencode-palette version --registry=https://registry.npmjs.org --prefer-online` 等于本地版本，且线上 `dist.shasum` 等于本地 tgz 的 sha1。
4. **GitHub Release**：`gh release create v<版本> --title "v<版本> — <一句话>" --notes-file <正文> package/dsh-opencode-palette-<版本>.tgz`。
5. **市场条目同步**：`awesome-dsh-plugin` 里**只改** `data/plugins/FeatherHunter__dsh-opencode-palette.yml`（tarball 跟版本、描述跟事实），在 fork 上开分支提到上游。上游 contributing.md 的规矩：一个 PR 只交这一个文件，两份 README 由他们合并在 `main` 上重新生成 —— 不要手工改 README，也不要把本地重生成的 README 带进 PR（fork 的 main 往往落后上游上千个提交，带进去会删掉别人的条目）。自检用 `node scripts/check-submission.mjs --only-list <只列本条目文件名>`。

### 坑

- **随包依赖要主动查**：`dsh-plugin-update` 以**运行时依赖**随包发出，且是**精确钉版**（现为 `0.18.38`）——上游一发新版就得我们改声明重发，用户才拿得到（0.1.x 的 vendor 已删，见 [ADR 0002](docs/adr/0002-decoupled-dsh-plugin-update-0.2.0.md)，0001 仅留历史）。`npm run build` 先跑 `node scripts/check-deps.ts` 硬门禁，对照 registry 报「本地声明 / 已安装 / 产物声明 / 上游 latest」：钉版落后于 latest 就拦（否则 bundle 旧、宿主依赖新，两侧错位），离线只给 `?` 不拦。两个包都钉死，所以没有「范围内自动跟上」这回事：升级＝改两处声明（根 `package.json` + `scripts/build-client.ts` 产物字面量）再 `npm install && npm run build && npm test`（`npm run deps:sync` / `vendor:check` 只在将来改回区间声明时才有用）。升级步骤（含门禁自举那一步）、以及门禁查不出、必须人眼对照的本地契约（日志事件白名单）都写在 ADR 0002。

- **发布是异步的**：本账号的 `npm publish` 回 **`202 Accepted`**，npm 自己会打印 `Your package is being processed and may take a few minutes to become available.`。命令成功 ≠ 立刻可查——版本要几分钟后才出现在 registry。所以验证必须轮询（向导已改成最多等 240 秒），查一次读到旧版**不是失败**。
- `E409 Cannot publish over previously staged version`：同一版本早先已被受理（202），**仍在处理中**。等几分钟用 `npm view` 复查即可，**不必升版本号、也不要重发**；确实要清掉再发才用 `npm unpublish dsh-opencode-palette@<版本>`（清完仍可用同一版本号）。
- `E409 previously published versions`：该版本已正式发布过，这时才需要升版本号。
- **`scripts/*.ps1` 必须带 UTF-8 BOM**（纯 ASCII 可免）：弹窗跑的是 Windows PowerShell 5.1，它读无 BOM 的 `.ps1` 会按 ANSI/GBK 解码，中文被撕碎后整个脚本解析失败、报错还全是乱码。任何编辑器改写都可能顺手丢掉 BOM —— `tests/release-scripts.test.ts` 守着这条门禁，改完跑 `npm test` 即可发现。
- **构建产物不入库**（[ADR 0004](docs/adr/0004-build-artifacts-out-of-git.md)）：`package/` 里的 7 个派生物（`package.json` / `README.md` / `cordis.patch.yml` / `lib/` 下 4 个文件）与根 `client.js` 已移出 git；`package/release-notes-*.md` 与根 `cordis.patch.yml` 仍是手写源文件，继续入库。后果：新克隆 / 新机器首跑 `npm test` 由 `pretest` 先现产这 8 个产物（约 2 s）；`git pull` 到取消跟踪的那个提交会把这些文件从本地删掉，重跑 `npm run build`（或直接 `npm test`）即恢复；根 `client.js` 只是本地开发产物，不进 npm 包、也不是 Release 资产；改 `scripts/build-client.ts` 里的产物字面量后不必再提交产物文件。回滚 = `git add -f`。包内文本副本（`README.md`、`cordis.patch.yml`、`lib/event-list.json`）由构建器**统一成 LF 再写**（载荷 LF、与检出 EOL 解耦）：`.gitattributes` 只管新克隆，本机 `docs/README.en.md` 仍是历史 CRLF 检出时，不归一会让同一 commit 的包内 README 5315 B/CRLF vs 新克隆 5207 B/LF、tgz 615846 vs 615833（sha1 亦不同）；谁把它们改回随检出行尾，`verify:artifacts` 的「八件不含 CR」一项会红。

## Star History

两页 README 的 CONNECT 段下面挂着星标增长曲线，图是自己画的：GitHub API 拉「每颗星何时被点亮」→ 按 UTC 天聚合 → 纯函数画自包含 SVG。图形规格照 2026-10-21 的会话级交接（源仓 `dsh-mattpocock-skills-deck` 的 B3 方案，见 `D:\Temp\handoff-star-history-session-2026-10-21.md`）。

- **取数与出图**：`npm run star:history`（`scripts/update-star-history.ts`）—— 自己调 `gh api -H "Accept: application/vnd.github.star+json" "repos/FeatherHunter/dsh-opencode-palette/stargazers?per_page=100" --paginate --jq ".[].starred_at"`（那个 Accept 头不能省，默认返回里没有时间），写 `docs/star-history.json`（数据）与 `docs/star-history.svg`（图）。画图纯函数在 `scripts/star-history.ts`：`aggregateByDay` 按 UTC 日聚合、`buildSvg` 出图（手绘抖动来自 `fnv1a`+`mulberry32` 种子，同数据同字节）、`monotonePath` 做单调三次插值。**总量只能涨不能跌**：新数据的总数比盘上旧的小，就是这次拉到残缺数据（GitHub 分页/缓存），脚本直接抛错拒绝写盘。
- **图的样子（别改回去）**：**双 Y 轴** —— Total 读左轴、Daily 读右轴（共用一根尺子时每日新增会被压成贴底平线）；**两条曲线都平滑** —— Total 用 Catmull-Rom，Daily 用 Fritsch–Carlson 单调三次插值（圆滑但每段不越界，不造假峰）；**轴名横排染色兼作色键**（`Total Stars` 红 / `Daily New` 蓝），因此不画图例、也不许竖排文字；**两条曲线各标自己的最高点**（`data-peak="total"` / `data-peak="daily"`，描边用背景色做底衬）；右轴刻度配同色刻度短线（读的是右轴，不是最近那条横网格）。
- **配色**：每套主题里一个系列只有一个色值（曲线、轴线、轴名、刻度、峰值共用）。深色主题红 `#ff6b6b` / 蓝 `#38bdf8`；浅色主题整体压深到红 `#b93a34` / 蓝 `#1d4ed8`（13px 刻度小字也要过 WCAG AA）。旧亮色 `#d94f4f` / `#2f81f7` 不许回潮。
- **一张图顶两套配色**：SVG 里用 CSS 变量 + `@media (prefers-color-scheme: dark)`，不拆深浅两个文件 —— 拆了就得靠 `<picture>` 切换，而市场详情页渲染器整段丢弃原始 HTML，`<picture>`/`<img>` 在那边都不显示。`<style>` 里**只许写变量定义、不许写 `fill:`**（CSS 规则优先级高于元素上的 fill 属性，会把所有元素的 fill 悄悄盖掉）；默认字色写在根 `<svg>` 的 `fill` 属性上，由子元素继承。
- **图片走绝对 raw 直链**（`https://raw.githubusercontent.com/FeatherHunter/dsh-opencode-palette/main/docs/star-history.svg?v=YYYYMMDDHHMM`）：GitHub / npm 包内副本 / 市场详情页三处都能出图；`?v=` 是缓存戳，GitHub 图片代理按 URL 缓存，**图换了必须换戳**。戳到分钟（UTC）而不是只到日 —— 同一天里改图也得换 URL，否则图片代理会顶着同一个 URL 继续吐旧图。
- **每日自动更新**：`.github/workflows/star-history.yml`（cron UTC 02:17 + `workflow_dispatch`，带 `concurrency` 防重叠）拉数 → 重画 → 改两页 README 的 `?v=` 戳 → 有变化才提交。拉取失败**不吞掉**（`|| true` 会让残缺数据画成掉头的曲线）；push 前 `git fetch` + `git merge` 重试三次，冲突就当天跳过不报错（源仓那批每日任务连红 12 天，栽在裸 push 与 Node 20）。Node 用 22.18（本仓 `.ts` 靠原生类型剥离直跑，Node 20 跑不了）。
- **门禁**：`tests/star-history.test.ts` 钉住「同数据同字节」「盘上 SVG = 现画的 SVG（改了数据忘了重画就红）」「双 Y 轴与两列刻度各用系列色」「轴名横排、无图例、无 `rotate(`」「Daily 是 C 段平滑且不越界、拐点切线连续」「峰值标注来自数据」「`<style>` 里没有 `fill:`、根 svg 带正文色」「浅色旧亮色不许回潮」「两页 README 都在 CONNECT 之后引用图且带 `?v=` 戳、且不再有 STAR HISTORY 段标题」。


