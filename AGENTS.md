## Agent skills

### Issue tracker

Issues and specs live as GitHub issues, operated via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles map 1:1 to labels `needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Release

双通道一次跑完：npm 官方源 + GitHub Release。**本仓只负责发布，不负责安装**：Release 正文与 README 只写发布出去的东西（改了什么、验证结果、哈希），安装/升级指引归宿主与市场。

### 版本号

小步递增：常规发布默认 patch（+0.0.1，如 1.6.0 → 1.6.1）；确有新功能才 minor（+0.1.0）；大版本由作者拍板（如 2.0.0）。bump 前先与用户确认，确认后再构建与发布。

### 流程

1. **构建三连**：`npm run build` → `npm test` 全绿 → 在 `package/` 里 `npm pack`，得到 `dsh-opencode-palette-<版本>.tgz`。
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

- **随包依赖要主动查**：`dsh-plugin-update@^0.7.0` 以**运行时依赖**随包发出（0.1.x 的 vendor 已删，见 [ADR 0002](docs/adr/0002-decoupled-dsh-plugin-update-0.2.0.md)，0001 仅留历史）。`npm run build` 先跑 `node scripts/check-deps.mjs` 硬门禁，对照 registry 报「本地声明 / 已安装 / 产物声明 / 上游 latest」：范围内落后也拦（否则 bundle 旧、宿主依赖新，两侧错位），离线只给 `?` 不拦。范围内跟上用 `npm run deps:sync`（`vendor:check` 是同一命令的别名）。超出范围的升级步骤、以及两处门禁查不出、必须人眼对照的本地契约（日志事件白名单、blocked 原因码）都写在 ADR 0002。

- **发布是异步的**：本账号的 `npm publish` 回 **`202 Accepted`**，npm 自己会打印 `Your package is being processed and may take a few minutes to become available.`。命令成功 ≠ 立刻可查——版本要几分钟后才出现在 registry。所以验证必须轮询（向导已改成最多等 240 秒），查一次读到旧版**不是失败**。
- `E409 Cannot publish over previously staged version`：同一版本早先已被受理（202），**仍在处理中**。等几分钟用 `npm view` 复查即可，**不必升版本号、也不要重发**；确实要清掉再发才用 `npm unpublish dsh-opencode-palette@<版本>`（清完仍可用同一版本号）。
- `E409 previously published versions`：该版本已正式发布过，这时才需要升版本号。
- **`scripts/*.ps1` 必须带 UTF-8 BOM**（纯 ASCII 可免）：弹窗跑的是 Windows PowerShell 5.1，它读无 BOM 的 `.ps1` 会按 ANSI/GBK 解码，中文被撕碎后整个脚本解析失败、报错还全是乱码。任何编辑器改写都可能顺手丢掉 BOM —— `tests/release-scripts.test.mjs` 守着这条门禁，改完跑 `npm test` 即可发现。
