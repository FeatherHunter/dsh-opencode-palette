# v2.1.9 — IP 预置展示名统一：去掉空格，火影双册归位

## 改了什么
- **25 套 IP 预置的展示名全部去掉空格**（「·」两侧也不留）。共 7 条改名：`赛博朋克 2077`→`赛博朋克2077`、`Hello Kitty`→`HelloKitty`、`新世纪福音战士 · 晴空`→`新世纪福音战士·晴空`、`原神 · 夜航`→`原神·夜航`、`超级马里奥 · 夜行`→`超级马里奥·夜行`、`火影忍者 · 晒过的和纸`→`火影忍者`、`火影忍者 · 夜之暗`→`火影忍者·暗部`。id / appearance / 37 色全部不动，只改中文展示名与 `updatedAt`。
- **火影双册命名归位**：此前是 25 套里唯一「明暗两册都带后缀」的一组；现与其余三组同构（原神 ＋ 原神·夜航、超级马里奥 ＋ 超级马里奥·夜行、新世纪福音战士 ＋ 新世纪福音战士·晴空）——明册用裸名「火影忍者」，暗册用「火影忍者·暗部」（暗部为火影原生词，两字后缀与夜航/夜行/晴空对齐）。
- **测试加守卫**：`tests/ip-presets.test.ts` 新增「展示名不含空白」断言（`/\s/` 判据），以后新增预置带空格即红；同时钉死火影两册的 title。
- **文档跟新**（不随 npm 包发出）：`docs/ip-presets-notes.md` 新增「v3.11 命名口径（2026-10-21）」段并跟平 5 个「## 名」小节头；`docs/ip-presets-v3-notes.md` 跟平两条「胶囊形态」；`docs/theme-audit/baseline.json` 重跑 `npm run audit:themes` 重新生成（语义 diff 恰好 7 处 title，其余全同）。
- 版本 2.1.8 → 2.1.9（patch）。

## 验证结果
- `npm run build` exit 0：`package/lib/client.js` 1605598 B、`client.js`（动态版）1604987 B、`package/lib/index.js` 25748 B；依赖门禁 `dsh-plugin-update` 0.18.38 / `dsh-log` 0.3.4 均与上游 latest 一致 ✓。
- `npm test` **285 pass / 0 fail**：Node 24.19.0 与 Node 22.18.0 各跑一遍。
- `npm run verify:artifacts` 八项全过（字体一致 / 两次构建逐字节一致 / 八件齐全非空 / 八件不含 CR / `package/lib` 恰 4 文件 / 八件未被 git 跟踪 / `font-face.ts` 仍被跟踪 / `.gitattributes` 钉 `eol=lf`）。
- `npm pack`（在 `package/` 内）7 files；包内 version=2.1.9；tgz **639534 B**。
- 线上：`npm view dsh-opencode-palette version` = **2.1.9**、`dist-tags.latest` = **2.1.9**，`dist.shasum` = `dcba31d8ba296b09b8437925ae54efe594869469`（与本地 tgz sha1 逐字符相同）、`dist.integrity` 与本地 tgz 逐字符相同；可见时间 2026-10-21 09:39:53（npm 受理后约 77 秒可见）。
- GitHub Release：`v2.1.9` 附件 `dsh-opencode-palette-2.1.9.tgz`（639534 B，sha256 `fa0a87075f1fafcef7a0ae6444bfa0ba82a4bdc82d16d3a30ae2ea1b4034977a`）。

## 哈希
- tgz sha1：dcba31d8ba296b09b8437925ae54efe594869469
- tgz sha256：fa0a87075f1fafcef7a0ae6444bfa0ba82a4bdc82d16d3a30ae2ea1b4034977a
- npm integrity：sha512-Rn/w2SESPX6+LjeYFjDtsiKb16VbC5vnknmUpSNZ+iYJeQn4UEv2VL/q4jAjr3zu6l3Zbi4M3weQ2tu1+OEVjg==
