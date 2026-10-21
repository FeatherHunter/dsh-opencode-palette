# v2.1.0 — 主题也能自己调：37 色编辑器 + 自定义主题区

## 改了什么
- **引擎层 37 色管线（#84）**：配色从 32 色扩到 37 色（补齐 5 个 DSH 独立界面扩展槽；已显式的保持不动，纯函数不改入参）；预置主题 37 色提取（system 按 hostMode 取对应配色、透光主题如 lucent-orng 取 light 配色、其余 36 款取 dark 配色）；自定义主题单套色同时注入 dark/light 两半，transparent 槽自动跳过、透出宿主底；更新条同样按单套 37 色直驱。
- **宿主半自定义主题落盘（#85）**：`<DSH_HOME>/opencode-palette/custom-themes/<id>.json`，单主题单文件、2 空格缩进；新增 customThemesList / customThemesSave / customThemesDelete 三个 RPC 与目录绝对路径查询。
- **面板自定义区与 37 色编辑器（#86）**：外层自定义区胶囊（复制路径 / 新增 / 编辑）+ 37 色编辑弹窗 + 微缩 DSH 仿真预览画布，点预览里的元素即定位到左侧对应色位行（双向），悬浮/按压/聚焦动效齐备；新增 161 条双语词条。
- **20 个 IP 预置作第二来源**：内置 38（registry，不动）之外，编辑器「选基底」与外层自定义区胶囊直列 20 个 IP 预置，一键存盘即换。
- **交互动效（#88）**：主面板与 37 色编辑弹窗（含 Popover）全部可交互控件补齐悬停 / 按压 / 聚焦动效。
- **编辑器像素对齐**：弹窗按 prototype-83 逐像素重写并复审（弹窗高度即预览区、32px 行控件、主题名区定宽、弹窗 chrome 跟随宿主主题），补回归测试。
- **修复（#89）**：自定义主题存盘 / 删除全死 —— 宿主注册的电话名漏了 `palette.` 前缀，浏览器半发的带前缀名落到 unknown phone；两侧前缀统一，未知电话落日志。
- **依赖跟随**：`dsh-plugin-update` 0.18.1 → **0.18.6**、`dsh-log` **0.3.4**，check-deps 四列（本地声明 / 已安装 / 产物声明 / 上游 latest）全跟平。
- **门禁与单测（#87）**：新增 tests/custom-themes-storage、tests/custom-editor、tests/custom-theme、tests/ip-presets 四个测试文件；`npm test` 从 179 → **246** 全绿。
- **用户文档**：README 中英 EXTENSIONS 段补「自定义主题」一条；致谢区按 GitHub 一手贡献数据复核重排（8 人）。
- 版本 2.0.28→2.1.0（minor：新功能）

## 验证结果
- `node scripts/check-deps.mjs`（构建前置硬门禁）四列全跟平：dsh-plugin-update 0.18.6 / 0.18.6 / 0.18.6 / 0.18.6；dsh-log 0.3.4 / 0.3.4 / 0.3.4 / 0.3.4。
- `npm run build` 绿；`npm test` **246/246 全绿**（14 个测试文件，0 fail / 0 cancelled / 0 skipped）。
- `npm pack`（在 package/ 内）7 files：README.md、cordis.patch.yml、lib/channel.mjs、lib/client.js、lib/event-list.json、lib/index.js、package.json；包内 version=2.1.0、dependencies 双写、`PALETTE_VERSION = '2.1.0'`。
- 线上：`npm view dsh-opencode-palette version` = **2.1.0**、`dist-tags.latest` = **2.1.0**，`dist.shasum` = `c8c5142f70ab1b0b6c50a029842e2783b4692f76`（与本地 tgz sha1 逐字符相同）。

## 哈希
- tgz sha1：c8c5142f70ab1b0b6c50a029842e2783b4692f76
- tgz sha256：afe1cb44a61cd942d49117e58b5afcc94a4947f6d5296787d26016abb45725d9
