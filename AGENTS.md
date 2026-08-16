## Agent skills

### Issue tracker

Issues and specs live as GitHub issues, operated via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles map 1:1 to labels `needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Release versioning

- 版本号**小步递增**：常规发布默认 patch（+0.0.1，如 1.6.0 → 1.6.1）；确有新功能才 minor（+0.1.0）；不跳大版本。
- bump 版本号前先与用户确认，确认后再构建与发布。
- 发布双通道：npm 官方源（发布窗口 + 2FA）+ GitHub Release（gh，附件须为 `package/` 内 pack 的 tgz）。
