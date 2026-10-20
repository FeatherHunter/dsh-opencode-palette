# v2.1.7 — 25 套 IP 预置基底（21 套整版重绘 + 4 套明暗双册），随包依赖 0.18.37

## 改了什么
- **IP 预置基底 21 → 25 套**：新增四条胶囊，补上原神 / 超级马里奥 / 火影忍者 / 新世纪福音战士的「另一半」——
  - `新世纪福音战士 · 晴空`（light）
  - `原神 · 夜航`（dark）
  - `超级马里奥 · 夜行`（dark）
  - `火影忍者 · 夜之暗`（dark）

  双册机制不变：一条自定义胶囊只带一套色，`appearance` 决定宿主按明 / 暗哪半显示——所以「明暗一体」= 两条胶囊各自带自己的 appearance，`name` / `id` 各自独立。
- **21 套已发布 IP 主题全部整版重绘**（v3.2–v3.10，均以参考图为唯一样本）：
  - 判尺：37 色位每槽只允许四类来源——**直采**（hex 取自原图像素）/ **明度阶梯** / **彩度阶梯** / **定比混色**；每槽记录 hex、原图坐标、命中像素数。取色台账见 `docs/ip-presets-v3-notes.md`，原图裁切与可交互预览见 `prototypes/<ip>-theme-preview.html`，取色与自检管线见 `prototypes/<ip>-extraction/`。
  - 多套经过四路对抗式审查（范式 / 出处 / 审美 / 证伪）：宝可梦 v3.6 据此修掉 5 处实质问题（周年海报对色板零贡献却写在台账里、两槽同值、两个大黄同屏、`syntaxNumber` 与 `borderActive` 的 ΔE76 9.46 为全矩阵最差、纯黑代码台），并证伪了「3:1 规则决定必须暗场」这条原理由；DC / 星战 / 火影 / 海贼 / 塞尔达 / 美少女战士等同批复审判尺。
  - 代表性重排：星球大战改「两刃对分」（红刃 51.9% / 蓝刃 48.1%，底色取两刃交点的近黑紫）；新世纪福音战士改**平涂采样 + 混色闸**（出货色到三张原图全部像素的最小 ΔE76 ≤ 2.0 才允许构建），原地替换已发布的霓虹绿紫版；宝可梦 37 槽全部直采，四图精确命中 331,427 / 830,418 px = 39.9%；奥特曼取「红冠 + 金眼」两声部。
  - 主题审计判尺随重绘全覆盖：**62 套（预置 37 + IP 25）/ 63 色板**，硬性 4.5 / 3.0 对比度违例 **0**；IP 设计告警 3 条全部记档、0 待处理。
- **随包依赖 `dsh-plugin-update` 0.18.33 → 0.18.37**（精确钉版，根 `package.json` 与 `scripts/build-client.ts` 两处声明同改）：客户端内联闭包 36 → 37 件，新增 `dist/shared/version.js`。
- 版本 2.1.6 → 2.1.7（patch）。
- 仓库内（不随 npm 包发出）：README 中英双页 IP 预置计数 23 → 25；新增 palette V3 能力集设计稿（`palette/` 九模块 + 跨模块检查脚本）与宿主契约 / 主题天花板 / 可改面 / wallpaper-engine 调研（`docs/research/`）；根目录三个探针脚本归位 `prototypes/tools/`。

## 验证结果
- `npm run build` exit 0：`package/lib/client.js` 1605527 B、`client.js`（动态版）1604916 B、`package/lib/index.js` 25748 B。
- `npm run deps:check` exit 0：`dsh-plugin-update` 本地声明 / 已安装 / 产物声明 / 上游 latest 四处均 **0.18.37** ✓；`dsh-log` 0.3.4 ✓。
- `npm test` **283 pass / 0 fail**：Node 24.19.0 与 Node 22.18.0 各跑一遍。
- `npm run verify:artifacts` 八项全过（字体一致 / 两次构建逐字节一致 / 八件齐全非空 / 八件不含 CR / `package/lib` 恰 4 文件 / 八件未被 git 跟踪 / `font-face.ts` 仍被跟踪 / `.gitattributes` 钉 `eol=lf`）。
- `npm run audit:themes` exit 0：62 套主题（预置 37 + IP 25）、63 色板；硬性违例 **0 + 0**；信息项 `border<3` 表面 412（按设计不设门槛）；设计告警 3 条记档 / 0 待处理。
- `npm run sync` exit 0（33 套中 31 套声明漂移、需处理 0，不写盘）。
- `npm pack`（在 `package/` 内）7 files：README.md、cordis.patch.yml、lib/channel.js、lib/client.js、lib/event-list.json、lib/index.js、package.json；包内 version=2.1.7、dependencies dsh-plugin-update 0.18.37；tgz **639639 B**。
- 隔离工作树（发布提交的干净检出 + `npm ci`）重建：`npm run build` + `npm pack` 产出的 tgz 与主树 pack **sha1 逐字符相同**（`f2498e0…`，639639 B）——发布载荷字节级可复现。
- 线上：`npm view dsh-opencode-palette version` = **2.1.7**、`dist-tags.latest` = **2.1.7**，`dist.shasum` = `f2498e0daf7c98237647c1003ba0215dc181cea7`（与本地 tgz sha1 逐字符相同），`dist.integrity` 亦与本地 tgz 逐字符相同；**可见时间 2026-10-20 23:28:20 (+08:00)**（registry `time.2.1.7` = 2026-10-20T15:28:20.449Z；23:28:34 轮询确认可见）。

## 哈希
- tgz sha1：f2498e0daf7c98237647c1003ba0215dc181cea7
- tgz sha256：865f1f00dc75163106f548e9ab21e4588ae9c6896d07350c51c9edf6d66dfac6
- npm integrity：sha512-XDaeuaZMo6LjRaTNKma25UaLZ2mbTUwiN0WDqQCypFHYShs4iwznPYJIR1KboECopQtePbI8OCTJffXZEyJamQ==
