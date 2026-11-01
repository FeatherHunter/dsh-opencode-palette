# v2.1.12 — 行内 diff 可读性修复，更新包升 0.18.39

## 改了什么

- **行内 diff 文字看不清的修复（#73，PR #157，作者 @anci3ntr0ck）**：核对宿主 CSS 后确认 `--dsw-alias-code-diff-added/deleted` 是**行底**，上面的文字用 `state-success/error-primary`；旧映射把主题的 diff 前景色直接配进了行底，Frappé / Nord / Solarized / Zenburn / Rose Pine 等主题上实测 1.00:1，整条 diff 变成实心色块，写/编辑处的增删行文字不可读。修法：
  - `code-diff-*` 不再直配 `diffAdded/diffRemoved`，改以 `file-diff-*-bg` 为种子、按状态文字色在构建期派生行底：与文字对比度 ≥ 4.5，与代码块底的 cue ≥ 1.12（地板 1.08），先修状态色再派生行底。
  - 新增宿主 **57 条「文字 / 面」配对表**，构建期为每个主题、每个外观半边做最小推离（沿黑白 1% 一档）；几何无解保持作者原值（`label-primary-inverted on brand-primary` 共 14 组半边，vercel + 6 个 IP 预设）。
  - 代价：部分主题的 `state-*` / `label-*` 会被轻微推离（46/63 palette 至少一个 token；中位 5.9%、最大 38% 档位），行为与证据记录在 `docs/adr/0005-inline-diff-and-pair-contrast.md`，修复前后截图在 `docs/assets/issue-73/`。
- **随包依赖 `dsh-plugin-update` 0.18.38 → 0.18.39**：上游 #245 修复「失败账本不因目标版事后装好而结案」——更新失败后用户手工装好同版并重启，面板仍常驻「更新失败（install-failed）」红字/手工命令且「已知晓」不消失。0.18.39 新增 `shared/failure-settled`（第三态判定），内联闭包 37 → 38 件；`dsh-log` 维持 `0.3.4`（上游更新包仍声明 `^0.3.4`，升 0.4.1 会多一份嵌套副本、破坏 #75 单拷贝口径，等上游放宽范围后再一起升）。
- **文档**：合入 ADR 0005（行内 diff 与宿主配对对比度）；ADR/PR 描述中的数字与名单偏差（「1–5%」实际最大 38%、D4 实际为 vercel + 6 个 IP 预设、桌面主题旧描述）已转 #158 跟进修正。
- **README**：两页版本号随发版刷新；星标曲线数据照常每日更新。

## 验证结果

- `npm run typecheck` exit 0。
- `node scripts/check-deps.ts --warn-only`（发布工作流的读数模式）：`dsh-plugin-update 0.18.39` 四列全 ✓；`dsh-log 0.3.4` 落后 latest 0.4.1（已知取舍，原因见上）。
- `npm run build:artifacts` exit 0；`npm test` 324 通过 / 0 失败（含 `tests/pair-contrast.test.ts` 全主题 6,344 次配对断言、`tests/engine.test.ts` 行内 diff 行底断言）。
- `npm run verify:artifacts` 八项全过（字体一致 / 两次构建逐字节一致 / 八件齐全非空 / 八件不含 CR / `package/lib` 恰 4 文件 / 八件未被 git 跟踪 / `font-face.ts` 仍被跟踪 / `.gitattributes` 钉 `eol=lf`）。
- 发布工作流在 GitHub Actions（Node 22.18）上重跑同一套门禁并产出 npm 包与 GitHub Release。

## 哈希

- 发布后回填：npm 可见版本 / `dist.shasum` / 附件 sha256 / 镜像可见性。
