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
   向导 4 阶段：登录态 → 复核 → 发布 → 验证。授权后**回终端再按一次回车**，看到 `+ dsh-opencode-palette@<版本>` 才算完。令牌不进聊天、不进仓库；Agent 不碰令牌，发布动作由人在弹窗里完成。
3. **对账**：`npm view dsh-opencode-palette version --registry=https://registry.npmjs.org --prefer-online` 等于本地版本，且线上 `dist.shasum` 等于本地 tgz 的 sha1。
4. **GitHub Release**：`gh release create v<版本> --title "v<版本> — <一句话>" --notes-file <正文> package/dsh-opencode-palette-<版本>.tgz`。
5. **市场条目同步**：`awesome-dsh-plugin` 里**只改** `data/plugins/FeatherHunter__dsh-opencode-palette.yml`（tarball 跟版本、描述跟事实），在 fork 上开分支提到上游。上游 contributing.md 的规矩：一个 PR 只交这一个文件，两份 README 由他们合并在 `main` 上重新生成 —— 不要手工改 README，也不要把本地重生成的 README 带进 PR（fork 的 main 往往落后上游上千个提交，带进去会删掉别人的条目）。自检用 `node scripts/check-submission.mjs --only-list <只列本条目文件名>`。

### 坑

- **发布是异步的**：本账号的 `npm publish` 回 **`202 Accepted`**，npm 自己会打印 `Your package is being processed and may take a few minutes to become available.`。命令成功 ≠ 立刻可查——版本要几分钟后才出现在 registry。所以验证必须轮询（向导已改成最多等 240 秒），查一次读到旧版**不是失败**。
- `E409 Cannot publish over previously staged version`：同一版本早先已被受理（202），**仍在处理中**。等几分钟用 `npm view` 复查即可，**不必升版本号、也不要重发**；确实要清掉再发才用 `npm unpublish dsh-opencode-palette@<版本>`（清完仍可用同一版本号）。
- `E409 previously published versions`：该版本已正式发布过，这时才需要升版本号。
- **`scripts/*.ps1` 必须带 UTF-8 BOM**（纯 ASCII 可免）：弹窗跑的是 Windows PowerShell 5.1，它读无 BOM 的 `.ps1` 会按 ANSI/GBK 解码，中文被撕碎后整个脚本解析失败、报错还全是乱码。任何编辑器改写都可能顺手丢掉 BOM —— `tests/release-scripts.test.mjs` 守着这条门禁，改完跑 `npm test` 即可发现。
