# v2.1.10 — README 重排成表格卡片、Star History 曲线图、三个自造词清零

## 改了什么
- **README 三段改成结构化表格**：EXTENSIONS 段从图标卡片改成纯 markdown 三行表格（核心支持三条：IP 主题胶囊 / 打造专属胶囊 / 字体与字号），showcase 段首加标语，UPGRADE 段给实时版本号与双 profile 命令，MORE 段兄弟插件文案再精简；两页（中/英）同步改。
- **加 Star History 展示**：新增 `scripts/star-history.ts`（画曲线图）+ `scripts/update-star-history.ts`（取数刷新）+ `tests/star-history.test.ts`（门禁），README 里嵌双 Y 轴曲线图（峰值标注、压深配色）。
- **清掉三个自造词**（用户 2026-10-21 定的口径）：「色板」→「配色」、IP 预置那层定名「主题胶囊 / theme capsule」、「色位」→「颜色」。全仓 99 个文件同步（README、源码注释、测试断言文案、prototypes 预览页与报告）；品牌「OpenCode调色板」不受影响（「调色板」是标准复合词，与自造的「色板」不是一回事）。
- **新增术语门禁** `tests/terminology.test.ts`：三个被禁词全仓扫（Markdown / 源码 / 预览 HTML / 配置，跳过依赖与构建产物），引号里点名放行，词表页必须点名这三条规则；`docs/i18n-glossary.md` 同步登记术语与禁用词。
- **版本号不再手抄**：`scripts/sync-readme-version.ts` 从 `package.json` 派生两页 README 里的版本号（`npm run readme:version` / `:check`）。
- 版本 2.1.9 → 2.1.10（patch）。随包依赖 `dsh-plugin-update` 仍钉 0.18.38、`dsh-log` 0.3.4（与 2.1.9 相同）。

## 验证结果
- `npm run build` exit 0：`package/lib/client.js` 1605619 B、`client.js`（动态版）1605008 B、`package/lib/index.js` 25748 B；依赖门禁 `dsh-plugin-update` 0.18.38 / `dsh-log` 0.3.4 均与上游 latest 一致 ✓。
- `npm test` **305 pass / 0 fail**：Node 24.19.0 与 Node 22.18.0 各跑一遍。
- `npm run verify:artifacts` 八项全过（字体一致 / 两次构建逐字节一致 / 八件齐全非空 / 八件不含 CR / `package/lib` 恰 4 文件 / 八件未被 git 跟踪 / `font-face.ts` 仍被跟踪 / `.gitattributes` 钉 `eol=lf`）。
- `npm pack`（在 `package/` 内）7 files；包内 version=2.1.10；tgz **639545 B**。
- 线上：`npm view dsh-opencode-palette version` = **2.1.10**、`dist-tags.latest` = **2.1.10**，`dist.shasum` = `95c546bbba6688cba2162a860a47d9bb22407345`（与本地 tgz sha1 逐字符相同）；可见时间 2026-10-21 18:29:17（+08:00，npm 受理后约 1 分钟可见）。
- GitHub Release：`v2.1.10` 附件 `dsh-opencode-palette-2.1.10.tgz`（639545 B，sha256 `811d822eea2dfe7086fc82b895b7bf88f4e3349f149fcab3de6be7ff973239d0`）。

## 哈希
- tgz sha1：95c546bbba6688cba2162a860a47d9bb22407345
- tgz sha256：811d822eea2dfe7086fc82b895b7bf88f4e3349f149fcab3de6be7ff973239d0
- npm integrity：sha512-+vw4AFRFb56JzlrXOrEydk3tSGqEUj1p/EP7uUWVVY6Dfnfdz6Ztyz76eIq9McOzm8xzJOz4EHQcH0BnI8jEYQ==
