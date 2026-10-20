# v2.1.8 — README 图片区重排成两栏平分网格（十张真机截图），随包依赖 0.18.38

## 改了什么
- **README 图片区重排**：中英两页的 showcase 从「竖排三张」改成**两栏平分网格**——每对图一张 markdown 表格，表头给每列起名，一行两张，一共十张真机截图：
  - 主界面（opencode 主题） / 设置面板（38 款按色系分组）
  - 自定义编辑器（37 个色位）
  - 七款 IP 预置色板：原神、库洛米、哆啦A梦、龙珠（浅色四张），哈利波特、赛博朋克2077、德古拉（深色三张）
- **布局技术定案：用纯 markdown 两栏表格，不碰 HTML `<table width="50%">`**。市场详情页的渲染器（`awesome-dsh-plugin/scripts/build-site.mjs` 的 `renderReadme()`，`renderer.html = () => ''`）整段丢弃原始 HTML——HTML 表格在那里一张图都不显示；纯 markdown 表格两边都活着。实测两边都是精确 50/50：GitHub 内容宽 860 → 每格 430、市场容器 992 → 每格 496，图各自缩进自己那一半，无横向滚动。
- **新增资产**：`assets/` 下十张真机截图入仓并被 README 直接引用（opencode / 设置页面 / 自定义编辑器 + 七款 IP 预置）；旧的 `showcase/` 六张图继续留着——市场条目的 `screenshots.json` 与英文页仍引用它们。
- **浅色 / 深色标注从「一刀切禁令」改成「实测门禁」**：旧门禁是 showcase 段一律不许出现「浅色」（那时三张图实测全是深色，禁令成立）。新图里确有浅色截图，一刀切就变成了说谎；现在测试里**真解码 PNG** 量平均亮度（Rec.709 加权）：标浅色的必须真的亮（>120），标深色的必须真的暗（<120）。实测原神 220.8 / 龙珠 225.2 / 库洛米 230.4 / 哆啦A梦 234.5，对 哈利波特 33.6 / 赛博朋克2077 25.2 / 德古拉 46.7 / opencode 19.6 —— 阈值两侧空档很大。
- **随包依赖 `dsh-plugin-update` 0.18.37 → 0.18.38**（精确钉版，根 `package.json` 与 `scripts/build-client.ts` 两处声明同改）：上游 #243 自动续跑可见化、#244「已装好待重启」行对账，客户端内联闭包仍 37 件（无模块增删）。这一笔自 v2.1.7 之后进仓，此前没随任何 release 发出。
- 版本 2.1.7 → 2.1.8（patch）。
- 仓库内（不随 npm 包发出）：中英两页 README 图片区；`tests/readme-body.test.ts` 的 showcase 门禁（网格结构 + 亮度实测 + assets/ 与 README 一一对应，白生成的 PNG 不许躺着）。

## 验证结果
- `npm run build` exit 0：`package/lib/client.js` 1605625 B、`client.js`（动态版）1605014 B、`package/lib/index.js` 25748 B；依赖门禁四处均 0.18.38 ✓。
- `npm test` **285 pass / 0 fail**：Node 24.19.0 与 Node 22.18.0 各跑一遍。
- `npm run verify:artifacts` 八项全过（字体一致 / 两次构建逐字节一致 / 八件齐全非空 / 八件不含 CR / `package/lib` 恰 4 文件 / 八件未被 git 跟踪 / `font-face.ts` 仍被跟踪 / `.gitattributes` 钉 `eol=lf`）。
- `npm pack`（在 `package/` 内）7 files：README.md、cordis.patch.yml、lib/channel.js、lib/client.js、lib/event-list.json、lib/index.js、package.json；包内 version=2.1.8、dependencies dsh-plugin-update 0.18.38；tgz **639641 B**。
- 线上：`npm view dsh-opencode-palette version` = **2.1.8**、`dist-tags.latest` = **2.1.8**，`dist.shasum` = `b0e83850b6373a3d4cd7611408cf7e6656192d2b`（与本地 tgz sha1 逐字符相同），`dist.integrity` 亦与本地 tgz 逐字符相同；**可见时间 2026-10-21 02:00:46 (+08:00)**（registry `time.2.1.8` = 2026-10-20T18:00:46.310Z）。发布走 `scripts/npm-release-wizard.ps1` 弹窗，人在浏览器完成 2FA 授权。
- GitHub Release：`v2.1.8` 附件 `dsh-opencode-palette-2.1.8.tgz`（639641 B，sha256 `5aca772a6ee8e6397f273319512a1f686a193523b6b489a93a276a986a1142ac`）。

## 哈希
- tgz sha1：b0e83850b6373a3d4cd7611408cf7e6656192d2b
- tgz sha256：5aca772a6ee8e6397f273319512a1f686a193523b6b489a93a276a986a1142ac
- npm integrity：sha512-/T+MeCDhXm8YR4C7rdbRVtLF34wtelGRfyyVWFfBIghv+iIViQI/xIBr37UU/0B0uMfWCpVOnFBnO+iLo5RV8Q==
