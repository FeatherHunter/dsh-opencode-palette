# 全量 TypeScript 迁移：仓库地图与边界（issue #108 / 地图 #104）

> 研究结论先说：**「迁移面」= 41 个手写 `.mjs` / 12,456 行**（生产 27 文件 7,436 行 + 测试 14 文件 5,020 行），
> 另有 **8 个构建产物**必须跟着生成器一起改（其中 `src/engine/font-face.mjs` 与 `package/lib/channel.mjs`
> 是两个「产物本身也是 .mjs」的特殊点），**37+4 个主题 JSON、21 个预设 JSON、15 个 woff2、6 个发布相关文件禁止转**。
> 对外契约（`package/package.json` 的 main/exports/dsh.client、`cordis.patch.yml`、随包精确钉版依赖）**必须逐字不变**，
> 但 **`package/lib/channel.mjs` 的文件名可以变**（不在 exports 白名单内，只是 `lib/index.js` 的内部相对 import）。

---

## 1. 问题

以**当前工作树**为准，测绘把本仓库全量迁到 TypeScript 所涉及的所有文件与边界：

1. **手写源码 vs 生成物**：`client.js`、`package/lib/client.js`、`package/lib/index.js`、`package/lib/event-list.json`、
   `src/engine/font-face.mjs`、`src/themes/*.json`、`src/custom-presets/*.json`、`package/package.json` 等逐项定性
   （谁生成 / 怎么生成 / 能否重生成 / 是否入库 / git 是否跟踪）。
2. **模块职责与依赖方向**：`src/engine`（纯函数）、`runtime/`（browser 半 + host.mjs Node 半）、`scripts/`、`tests/`、`package/`；
   谁 import 谁、方向是否单向、`runtime/client.mjs` 里 `./engine/*.mjs` 伪路径机制。
3. **迁移边界判定**：哪些 `.mjs` 必须转、哪些禁止转（生成物/数据/发布扫描件）、哪些需要特殊处理
   （生成器要跟着改输出、产物继续提交还是改生成、README/发布脚本是否受影响）。
4. **对外契约面**：`package/package.json`、`cordis.patch.yml`、随包依赖、发布产物形状；全量迁移后是否必须保持不变。

上游背景（地图 #104）已确认存在的工程现实，本报告逐条给出证据：**构建器是零依赖正则 mini-bundler**、
**产物入库**、**测试大量断言源码文本**、**仓库无任何 TypeScript 工具链**。

---

## 2. 方法与证据边界

### 2.1 读过的一手文件（全量或定位段）

| 文件 | 用途 |
|---|---|
| `scripts/build-client.mjs`（406 行，全文） | 构建器：模块清单、正则、宿主复制、产物写盘、`pkgJson` 字面量 |
| `scripts/inline-fonts.mjs`（50 行，全文） | `font-face.mjs` 生成器 |
| `scripts/sync-themes.mjs`（316 行，头 80 行 + 尾部 116 行） | 主题下载/基线/原子落盘/MANIFEST 写入 |
| `scripts/convert-desktop-themes.mjs`（114 行，全文） | 4 款桌面 2.0 主题 → TUI 形 JSON |
| `scripts/rebuild-event-list.mjs`（81 行，全文） | `runtime/event-list.json` 重建 |
| `scripts/check-deps.mjs`（134 行，全文） | 钉版门禁，读本地声明/已安装/产物声明/上游 latest |
| `scripts/generate-assets.mjs`（252 行，头 30 行） | 生成 `assets/theme-stories-*.svg`，**真实 import `../src/engine/*.mjs`** |
| `package.json` / `package/package.json` / `package-lock.json` | 脚本表、依赖、契约字段 |
| `package/cordis.patch.yml` | bundle 层装配 |
| `DESIGN.md` §2/§7（目录树、构建约束） | 设计意图与已知约束 |
| `src/engine/*.mjs`、`runtime/*.mjs` 的 import 段 | 依赖边（逐条 grep `^import`） |
| 三个 npm 发布脚本（`.ps1`） | 发布链是否依赖产物形状 |

### 2.2 跑过的命令（全部只读）

- `git status --short`、`git log --oneline -3`、`git ls-files`（按扩展名/目录）、`git check-ignore -v`（确认产物**未**被忽略）。
- `node -e` 逐文件 `split('\n').length-1` 数行（**含**空行）+ 字节数；PowerShell `Measure-Object -Line`（**不含**空行）。
- `Select-String` 全仓 grep：`.mjs` 在文档中的提及、测试对源码路径的引用、源码里行尾分号、跨目录 import。
- `node --version`（v24.19.0）、`Get-Command tsc`（不存在）、`node_modules` 目录清单（无 `typescript`、无 `@types/node`）、`tsconfig.json` 不存在。
- 仓库外临时探针（`%TEMP%` 下，跑完即删）：Node 24 直接执行含 `interface` 与
  `import data from './d.json' with { type: 'json' }` 的 `.ts` 文件 → 输出 `ts-strip-ok 3`（类型剥除 + import 属性均可）。
- 产物一致性核对：`runtime/host.mjs`（CRLF 归一后）与 `package/lib/index.js` **逐字节相同**；
  `runtime/channel.mjs` 与 `package/lib/channel.mjs` **逐字节相同**；`runtime/event-list.json` 与其副本**逐字节相同**；
  `docs/README.en.md` 去掉 showcase 块后与 `package/README.md` **等长（5,170 字符）**。

### 2.3 明确没做的事（硬约束）

- **没有**跑 `npm run build` / `npm test` / `npm install` / `npm pack`——工作树有 WIP（见 2.4），构建会重写 8 个入库产物。
- **没有**为了验证 tsc emit 形态而安装 typescript（`npm install` 被禁）；相关结论因此降级为「推断」（见 §7）。
- **没有**运行 `node scripts/convert-desktop-themes.mjs`（会写 `src/themes/*.json`）。
- 除本文件外**没有**在仓库内新建/修改/删除任何文件；未 `git add/commit/push`；未碰 `docs/research/` 下既有的 5 个未跟踪研究文件。

### 2.4 采样时的仓库状态（工作树，非 HEAD）

- HEAD：`dbcc93a` release 2.1.3（其前 `b9296ef` #107 收口、`bf78924` #102 文案、`c97538a` #97 …）。
- WIP（未提交）：`client.js`(+246/−4)、`package/lib/client.js`(+246/−4)、`scripts/convert-desktop-themes.mjs`(+11/−4)、
  `src/engine/generate.mjs`(+3/−3)、`src/engine/resolve.mjs`(+146)、`tests/engine.test.mjs`(+44/−10)。
  **本报告的行数是工作树口径**，与 HEAD 不同。
- **研究期间发生的并发改动**（不是本代理做的）：采样后工作树里 `src/themes/{amoled,oc-2,onedarkpro,shadesofpurple}.json`
  各 +24 行（新增 `diffAdded/diffRemoved/diffAddedBg/…` 6 个槽），与 `scripts/convert-desktop-themes.mjs` 的 WIP 改动
  （`convertOne` 里 `// issue 80: keep desktop diff seeds` 那段，`:79-85`）一致——即另一个进程编辑了转换器并**重跑了生成器**。
  这恰好实证了 §3.6「4 款桌面主题由转换器再生成」的链路是可跑通的。

### 2.5 计数口径差异（重要，避免与地图 #104 的数字打架）

任务书里的 `1,504 / 4,335 / 1,272 / 4,654`（合计 11,765）是 **PowerShell `Measure-Object -Line` 口径（不计空行）**；
本报告用 node 计 **含空行** 的行数：`1,585 / 4,504 / 1,353 / 5,020`（合计 12,462）。两者差值 697 行**全部是空行**，
文件数一致（引擎 14 + runtime 7 + scripts 7 + tests 14 = 42）。**同一批文件，只是计不计空行。**

---

## 3. 事实清单

### 3.1 生成物（构建/脚本写出，入库，禁止直接转）

| 路径 | 类型 | 行数 / 体积 | 生成来源 / 命令 | git 跟踪 | 迁移判定 | 证据 |
|---|---|---|---|---|---|---|
| `client.js` | 产物（动态版 bundle） | 22,626 行 / 1,452,768 B | `scripts/build-client.mjs` → `node scripts/build-client.mjs`（`npm run build` 第三步） | 跟踪 | **禁止转**，改由构建生成 | `build-client.mjs:397` `writeFile(join(ROOT,'client.js'), dynBundle)`；文件头第 1 行「构建产物，勿手改」 |
| `package/lib/client.js` | 产物（包版 bundle） | 22,640 行 / 1,453,349 B | 同上（同一引擎、另一种包法） | 跟踪 | **禁止转** | `build-client.mjs:388`；`:309` `window.__ModuleLoader__.load({` |
| `package/lib/index.js` | 产物（宿主半） | 437 行 / 23,275 B | `runtime/host.mjs` **原样复制**（CRLF→LF + 版本注入） | 跟踪 | **禁止转**；改由 host 源生成 | `build-client.mjs:389`；实测与 `runtime/host.mjs` 归一后逐字节相同 |
| `package/lib/channel.mjs` | 产物（**随包 ESM**） | 49 行 / 3,303 B | `copyFile(runtime/channel.mjs)` | 跟踪 | **禁止直接转**；见 §5 特殊处理 S2 | `build-client.mjs:393` `copyFile(join(RUNTIME_DIR,'channel.mjs'), …)`；实测逐字节相同 |
| `package/lib/event-list.json` | 产物（数据副本） | 293 行 / 5,370 B | `copyFile(runtime/event-list.json)` | 跟踪 | **禁止转** | `build-client.mjs:391` |
| `package/package.json` | 产物（+契约面） | 56 行 | `build-client.mjs` 内 `pkgJson` 字面量 `JSON.stringify` | 跟踪 | **禁止转**；生成器要跟着改 | `build-client.mjs:342` `const pkgJson = {`、`:394` 写盘 |
| `package/README.md` | 产物（文档副本） | 5,170 字符 | `docs/README.en.md` 去 showcase 块后写入 | 跟踪 | **禁止转** | `build-client.mjs:395-396`；`tests/readme-head-tail.test.mjs` 守同一变换 |
| `src/engine/font-face.mjs` | 产物（**源码目录里的 .mjs**） | 6 行 / **459,833 B**（data URI 撑大） | `scripts/inline-fonts.mjs` 从 `src/fonts/*.woff2`（15 个）生成 | 跟踪 | **禁止手改**；见 §5 特殊处理 S1 | `inline-fonts.mjs:46` `writeFile(join(ROOT,'src','engine','font-face.mjs'), out)`；文件第 38 行自带「生成文件，勿手改」 |

### 3.2 手写源码：`src/engine`（14 文件 1,585 行；13 手写 1,579 行 + 1 生成）

| 路径 | 类型 | 行数 | 职责（来自文件头/import 关系） | git 跟踪 | 迁移判定 | 证据 |
|---|---|---|---|---|---|---|
| `src/engine/resolve.mjs` | 手写 | 268 | 引用链 → RGBA/HEX、循环检测、`shade/withAlpha/contrastText` | 跟踪 | 转 | 被 `map-dsh`/`generate`/`grouping`/`index`/`update-tokens` import |
| `src/engine/map-dsh.mjs` | 手写 | 254 | ★ 唯一 DSH 知识：`TOKEN_MAP`/`DERIVED_TOKENS`/`SHIKI_MAP`/`CSS_RULES`/`COLOR_SLOTS`/`FONTS` | 跟踪 | 转 | `generate.mjs:3`、`local-fonts.mjs:12`、`index.mjs:5` |
| `src/engine/local-fonts.mjs` | 手写 | 212 | 本机字体探测 | 跟踪 | 转 | `client.mjs:9` |
| `src/engine/generate.mjs` | 手写 | 197 | 主题 → `{tokens, cssText}` | 跟踪 | 转 | `index.mjs:4`、`client.mjs:8` |
| `src/engine/grouping.mjs` | 手写 | 109 | 色系分组/组序 | 跟踪 | 转 | `index.mjs:6`、`generate-assets.mjs:13` |
| `src/engine/update-tokens.mjs` | 手写 | 108 | 更新面板 token | 跟踪 | 转 | `client.mjs:12` |
| `src/engine/registry.mjs` | 手写 | 98 | 37 个主题 JSON 逐条静态 import + system | 跟踪 | 转 | `registry.mjs:4-40` 共 37 条 `import … from '../themes/*.json' with { type:'json' }` |
| `src/engine/index.mjs` | 手写 | 85 | 门面（唯一 `export { … }` 再导出点） | 跟踪 | 转 | `index.mjs:43`；被 runtime/scripts/tests 引用 |
| `src/engine/ip-presets.mjs` | 手写 | 58 | 21 个自定义预设静态 import | 跟踪 | 转 | `ip-presets.mjs:6-26` 共 21 条 JSON import |
| `src/engine/font-avail.mjs` | 手写 | 57 | 字体可用性（document 注入） | 跟踪 | 转 | `client.mjs:7` |
| `src/engine/float-geometry.mjs` | 手写 | 50 | 菜单几何 | 跟踪 | 转 | `client.mjs:10`；`tests/float-geometry.test.mjs` |
| `src/engine/zh-names.mjs` | 手写 | 48 | 中英名表/搜索文本 | 跟踪 | 转 | `client.mjs:11`、`generate-assets.mjs:14` |
| `src/engine/font-names.mjs` | 手写 | 35 | 字体名引用 | 跟踪 | 转 | `generate.mjs:5`、`local-fonts.mjs:13` |
| `src/engine/font-face.mjs` | **生成** | 6 | `BUNDLED_FONTS` + `FONT_FACE_CSS` | 跟踪 | 禁止手改（见 S1） | §3.1 |

### 3.3 手写源码：`runtime/`（7 文件 4,504 行；浏览器半 5 + 常量 1 + 宿主半 1）

| 路径 | 类型 | 行数 | 职责 | git 跟踪 | 迁移判定 | 证据 |
|---|---|---|---|---|---|---|
| `runtime/client.mjs` | 手写（**仅 bundler 可消费**） | 1,971 / 112,545 B | 浏览器胶水：注入/热切换/持久化/设置面板 | 跟踪 | 转（特殊，见 S4） | `client.mjs:4-12` 用**伪路径** `./engine/*.mjs`；`:26` 版本占位符 `'__PALETTE_VERSION__'` |
| `runtime/custom-editor.mjs` | 手写 | 1,612 / 103,567 B | 自定义主题编辑器 UI | 跟踪 | 转 | `client.mjs:18`；`tests/custom-editor.test.mjs`（1,229 行，文本断言最多） |
| `runtime/host.mjs` | 手写（Node 半） | 437 / 23,712 B | 日志落盘 + 更新电话 + `/api/opencode-palette` 路由 | 跟踪 | 转（特殊，见 S2） | `host.mjs:21-28` node 内置 + `dsh-log/host` + `dsh-plugin-update` + `./channel.mjs`；`:75-79` 读自身 package.json 版本 |
| `runtime/custom-color.mjs` | 手写 | 271 | 颜色输入/HSV/归一 | 跟踪 | 转 | `client.mjs:16`；`:4-5` 只 import 同目录 |
| `runtime/ui-fx.mjs` | 手写 | 103 | UI 样式常量/注入 | 跟踪 | 转 | `client.mjs:19`、`custom-editor.mjs:5` |
| `runtime/custom-store.mjs` | 手写 | 61 | 自定义主题缓存/对账 | 跟踪 | 转 | `client.mjs:17` |
| `runtime/channel.mjs` | 手写（**双侧共用常量**） | 49 | `PLUGIN_ID`/`ENDPOINT`/`ROUTE_PATH`/`PHONE_*` | 跟踪 | 转（特殊，见 S2） | 零 import；`host.mjs:28`、`client.mjs:15` 都 import 它 |
| `runtime/event-list.json` | 生成（数据） | 293 | 事件清单（26 上游 + 5 自研） | 跟踪 | **禁止转** | `rebuild-event-list.mjs:69`；**需要旧文件作输入**，见 §7 |

### 3.4 手写源码：`scripts/`（7 个 `.mjs` 1,353 行，另有 3 个 `.ps1` 不属迁移面）

| 路径 | 类型 | 行数 | 是否构建链 / npm script | 迁移判定 | 证据 |
|---|---|---|---|---|---|
| `scripts/build-client.mjs` | 手写（构建器） | 406 / 27,272 B | `build` 第三步 | 转（**特殊，见 S3**） | `MODULE_ORDER` `:117-126`；正则 `:128-131`；`pkgJson` `:342`；写盘 `:385-397` |
| `scripts/sync-themes.mjs` | 手写（数据同步） | 316 / 16,064 B | `sync` / `sync:update` | 转 | `OPCODE_SHA` `:21`；MANIFEST/NOTICES `:14-15`、`:264-284` |
| `scripts/generate-assets.mjs` | 手写（资产生成） | 252 / 13,228 B | **无 npm script**（手工跑） | 转（特殊，见 S5） | `:12-14` 真实 import `../src/engine/{index,grouping,zh-names}.mjs` |
| `scripts/check-deps.mjs` | 手写（门禁） | 134 / 7,696 B | `build` 第一步 | 转 | `:68-79` 读根/产物声明；`:115-118` 比对不一致即拦 |
| `scripts/convert-desktop-themes.mjs` | 手写（转换器） | 114 / 5,671 B | **无 npm script** | 转 | `:94-107` 读 `src/themes/desktop-2.0/*.json` 写 `src/themes/*.json` |
| `scripts/rebuild-event-list.mjs` | 手写（重建器） | 81 / 6,101 B | **无 npm script** | 转 | `:26-27` 读 `node_modules/dsh-plugin-update/event-list.update.json` **和** 现有 `runtime/event-list.json` |
| `scripts/inline-fonts.mjs` | 手写（生成器） | 50 / 3,190 B | `fonts` + `build` 第二步 | 转（**特殊，见 S1**） | `:46` 写 `src/engine/font-face.mjs` |
| `scripts/*.ps1`（3 个） | 非 TS 面 | 134+32+175 | 发布向导 / 发布 token 通道 | **不转** | `tests/release-scripts.test.mjs` 只查 UTF-8 BOM |

### 3.5 手写源码：`tests/`（14 文件 5,020 行，262 个 `test()`）

| 路径 | 行数 | 对源码的引用（含文本断言） | 迁移判定 |
|---|---|---|---|
| `tests/custom-editor.test.mjs` | 1,229 | 22 处（`custom-editor.mjs` 源码文本断言为主） | 转（同批或次批） |
| `tests/engine.test.mjs` | 846 | 11 处（引擎导出 + 源码文本） | 转 |
| `tests/panel-render.test.mjs` | 760 | 6 处（读 `client.mjs` 文本） | 转 |
| `tests/update-panel.test.mjs` | 634 | 15 处（读 `host.mjs`/`client.mjs`/`package/lib/index.js`） | 转 |
| `tests/custom-themes-storage.test.mjs` | 272 | 7 处（import `host.mjs`、`channel.mjs`，读 `package/lib/*`） | 转 |
| `tests/readme-body.test.mjs` | 248 | 0 处（读 README/assets） | **可不转**（与迁移无关） |
| `tests/readme-head-tail.test.mjs` | 228 | 0 处 | **可不转** |
| `tests/log-switch.test.mjs` | 190 | 1 处（import `host.mjs`） | 转 |
| `tests/sync-verify.test.mjs` | 165 | 1 处（import `scripts/sync-themes.mjs`） | 转 |
| `tests/custom-theme.test.mjs` | 159 | 2 处 | 转 |
| `tests/group-boundary.test.mjs` | 107 | 3 处（含读 `map-dsh.mjs` 文本） | 转 |
| `tests/ip-presets.test.mjs` | 71 | 3 处（读 `package/lib/client.js` 文本） | 转 |
| `tests/release-scripts.test.mjs` | 61 | 1 处（读 `scripts/*.ps1`） | **可不转** |
| `tests/float-geometry.test.mjs` | 50 | 1 处 | 转 |

合计 **73 处**对 `../runtime|src|scripts/*.mjs` 的路径引用，覆盖 **20 个不同源文件**；其中相当一部分是
`readFileSync(...)` 后对**源码文本**做 `assert.match`（例：`custom-editor.test.mjs` 22 处、`update-panel.test.mjs` 15 处），
属于「测试直接校验实现文本」，改名/改后缀会成片失败。`npm test` 用**显式 14 文件清单**（根 `package.json` `scripts.test`），改名必须同步。

### 3.6 数据 / 资产（禁止转）

| 路径 | 数量 | 类型 | 生成来源 | git 跟踪 | 证据 |
|---|---|---|---|---|---|
| `src/themes/*.json` | 37（33 TUI + 4 桌面转换） | 数据（vendored） | 33 个：`sync-themes.mjs` 从 `ASSET_BASE`（pin `0dd6950`，tag v1.18.12）下载；4 个（`amoled/oc-2/onedarkpro/shadesofpurple`）：`convert-desktop-themes.mjs` 从 `src/themes/desktop-2.0/*.json` 转换（研究期间刚被重跑，各 +24 行） | 跟踪 | `sync-themes.mjs:21,24,27`；`convert-desktop-themes.mjs:16-18,106-107` |
| `src/themes/desktop-2.0/*.json` | 4 | 数据（上游原样） | **无脚本生成**（人工从 sst/opencode 2.0 分支取回） | 跟踪 | `MANIFEST.json` `adapted20.source` 自述；§7 证据缺口 |
| `src/themes/MANIFEST.json` | 1 | 生成的数据（指纹基线） | `sync-themes.mjs --update-baseline`（仅升级路径写） | 跟踪 | `sync-themes.mjs:14,164-179`；`MANIFEST.json` 含 `themes`(33) + `adapted20`(4) + `syncedAt` |
| `src/themes/THIRD_PARTY_NOTICES.md` | 1 | 生成+手工（首行 pin，尾部归属手写） | `sync-themes.mjs --update-baseline` 只换首行 | 跟踪 | `sync-themes.mjs:262-284` |
| `src/custom-presets/*.json` | 21 | 数据（`dsh-opencode-palette.custom-theme.v1`） | 用户/作者产出，**非脚本生成** | 跟踪 | `ip-presets.mjs:6-26` 逐条 import |
| `src/fonts/*.woff2` | 15 | 二进制资产（4 字族 × 3 字重） | 上游字体包（OFL） | 跟踪 | `inline-fonts.mjs`；`DESIGN.md:151` |
| `assets/*.svg` | — | 产物（展示资产） | `generate-assets.mjs` | 跟踪 | 与迁移无关 |

### 3.7 契约与发布面

| 路径 | 关键内容 | 迁移判定 | 证据 |
|---|---|---|---|
| `package/package.json` | `type: module`；`main: lib/index.js`；`exports: {".": "./lib/index.js", "./client": "./lib/client.js", "./cordis.patch.yml": …, "./package.json": …}`；`files: ["lib","cordis.patch.yml"]`；`dsh.client = {platform:"web", immediately:true, inject:["@deepseek-ai/dsh-client-ui-theme"]}`；`dsh.bundle.patch: "./cordis.patch.yml"`；`engines {node:">=22", dsh:">=0.2.0-rc.1"}`；**dependencies 精确钉版** `dsh-log 0.3.4` + `dsh-plugin-update 0.18.11` | **必须保持不变**（逐字） | 文件本身；生成器 `build-client.mjs:342-378` |
| `package/cordis.patch.yml` | `- insert: [{id: opencode-palette, name: 'dsh-opencode-palette', config: {}}]` | 必须不变 | 文件本身；`build-client.mjs:386` 每次构建从根复制 |
| `cordis.patch.yml`（根） | 同上（`package/` 的源） | 必须不变 | `package.json` `dsh.bundle.patch` |
| Bundle 形状 | `window.__ModuleLoader__.load({ id: "dsh-opencode-palette", factory(require){…} })`，保留 `require('react')` 外部引用，`exports.inject = ['theme','slots','locale','connection']` | 必须不变（宿主按此装载） | `package/lib/client.js:7-9`；`build-client.mjs:299,309` |
| 依赖门禁 | 构建前比对「本地声明 / 已安装 / 产物声明 / 上游 latest」，钉版落后即 exit 1 | 迁移不得绕开 | `scripts/check-deps.mjs:77-133` |
| 发布链 | `npm run build` → `npm test` → `package/` 内 `npm pack`/`publish`；`publish-token.ps1` 先跑 build+test 门禁 | 迁移后仍须可用（ps1 无 `.mjs` 假设） | `publish-token.ps1:12,113-114`；`AGENTS.md` 发布节 |

---

## 4. 依赖方向图（文字版）

```
                    ┌─────────────────────────── 数据层（JSON / woff2，禁止转）
                    │  src/themes/*.json(37+4)  src/themes/MANIFEST.json
                    │  src/custom-presets/*.json(21)  src/fonts/*.woff2(15)
                    ▼
  ┌──────────────────────────────── src/engine/*.mjs（13 手写 + font-face 生成）
  │   真实相对路径：engine → engine，engine → ../themes|../custom-presets/*.json (with {type:'json'})
  │   无 DOM、无 node 内置、无外部包；无一条指向 runtime/scripts 的边
  │
  ├──► runtime/*.mjs（6 浏览器侧 + 1 宿主侧）
  │      真实路径：client.mjs → ./channel.mjs ./custom-color.mjs ./custom-store.mjs
  │                 ./custom-editor.mjs ./ui-fx.mjs（均同目录）
  │      伪路径：client.mjs:4-12 → './engine/*.mjs'  ← runtime/ 下**不存在** engine/ 目录
  │      宿主侧：host.mjs → node:fs/os/path/url + dsh-log/host + dsh-plugin-update + ./channel.mjs
  │
  ├──► scripts/*.mjs
  │      generate-assets.mjs → ../src/engine/{index,grouping,zh-names}.mjs（真实路径，node 直接跑）
  │      sync-themes.mjs / convert-desktop-themes.mjs → 只读写 JSON，不 import 源码
  │      inline-fonts.mjs → 写 src/engine/font-face.mjs
  │      build-client.mjs → 读 src/engine + src/themes + runtime + node_modules/dsh-*，写 8 个产物
  │
  ├──► tests/*.mjs
  │      真实路径 import：engine/*、runtime/{custom-editor,custom-color,custom-store,ui-fx,host,channel}、scripts/sync-themes
  │      文本断言：readFileSync 后 grep runtime/client.mjs、map-dsh.mjs、host.mjs、package/lib/*
  │
  └──► package/lib/*（产物）      client.js ← 引擎+runtime+dsh-log/client+dsh-plugin-update/entry 内联
                                  index.js  ← runtime/host.mjs 原样；import './channel.mjs'
```

**方向结论**

- **单向**：`数据 → engine → runtime → 产物`，`scripts/tests → 一切源码`。**没有任何反向边**
  （grep `^import .* from '\.\./` 在 engine 只命中 JSON；runtime 无一条 import 到 scripts/tests）。
- **唯一的「假边」**是 `runtime/client.mjs:4-12` 的 `./engine/*.mjs`：相对 `runtime/` 并不存在。
  它只被 `build-client.mjs` 消费——正则 `JS_IMPORT_RE`（`:129`）取 `m[2]` 后 `split('/').pop()` 得**文件名主干**，
  再 `__mods['index']` 取模块（`:253-257`）；`MODULE_ORDER`（`:117-126`）里引擎与 runtime 的键**共处一个平坦命名空间**，
  因此 `engine/` 与 `runtime/` 下**同名文件会撞键**（当前无重名）。**`runtime/client.mjs` 不能被 node 直接 import**
  （解析即失败），它只在 bundle 里存在——任何迁移若想「用 node 跑一遍 client.mjs 验证」，都会先撞到这层。
- **`host.mjs` 是唯一被 node 真跑的双侧文件**：测试直接 `import('../runtime/host.mjs')`，发布时原样复制成 `package/lib/index.js`，
  由它 `import './channel.mjs'`——所以 `channel.mjs` 的**文件名和扩展名**是包内真实运行时依赖（但不在 `exports` 白名单里）。
- **`scripts/generate-assets.mjs` 是唯一用真实路径 import 引擎的构建侧脚本**（无 npm script、手工跑），
  引擎改后缀它会第一个断。

---

## 5. 迁移边界结论

### 5.1 迁 移 面（推荐口径）

| 集合 | 文件数 | 行数（含空行） | 说明 |
|---|---|---|---|
| **生产源码（必转）** | **27** | **7,436** | `src/engine` 13 手写（1,579）+ `runtime` 7（4,504）+ `scripts` 7（1,353） |
| **测试（同批或次批）** | **14** | **5,020** | 262 个 `test()`；73 处源码路径引用 |
| **合计** | **41** | **12,456** | 不含 `font-face.mjs`（生成物）、不含 `prototypes/` |

**生成物必须跟随重生成（8 个）**：`client.js`、`package/lib/client.js`、`package/lib/index.js`、`package/lib/channel.mjs`、
`package/lib/event-list.json`、`package/package.json`、`package/README.md`、`src/engine/font-face.mjs`。全部入库、全部跟踪，
`git check-ignore` 对它们返回空（未被忽略）——**迁移不改变「产物入库」这一现状，除非决策票明确改为发布时生成**。

**禁止转（清单）**：`client.js`、`package/lib/*`（4 个）、`src/themes/*.json`（37 + MANIFEST + NOTICES + desktop-2.0/4 = 43）、
`src/custom-presets/*.json`（21）、`runtime/event-list.json`、`src/fonts/*.woff2`（15）、`package/*.tgz`（已被 `*.tgz` 忽略）、
`scripts/*.ps1`（3 个，BOM 门禁）。**这些文件的字节就是契约**（指纹基线、bundle 形状、`files` 白名单扫描）。

**不在迁移面但需要一次决策**：`prototypes/` 3 个 `.mjs` / 813 行（`generate-combo-prototypes.mjs` 248、
`generate-group-boundary-68.mjs` 262、`generate-prototypes.mjs` 303）。它们不接任何 npm script、不被构建/测试 import，
是历史一次性生成器；转了只增加成本，不转则仓库里长期留 3 个 `.mjs` 孤岛。

### 5.2 特殊处理（S1–S6）

**S1 · `src/engine/font-face.mjs`（生成物，6 行 / 459,833 B）**
生成器 `scripts/inline-fonts.mjs:38-46` 写死输出文件名与 `export const BUNDLED_FONTS = …` / `export const FONT_FACE_CSS = …`。
处理方式必须二选一并同步生成器：① 改成输出 `font-face.ts` 并补类型（`readonly string[]` / `string`），
② 保留 `.mjs`（则 `src/engine` 永远有一个非 TS 文件，`tsc` 的 `include` 需排除且 bundler 清单要容忍混合后缀）。
**不能**只把现有 `font-face.mjs` 改名——它的内容来自 15 个 woff2，手改无法重生成，且指纹/体积会与 `inline-fonts.mjs` 输出分叉。

**S2 · `package/lib/channel.mjs`（随包 ESM）**
`build-client.mjs:393` 逐字节复制 `runtime/channel.mjs` 成 `package/lib/channel.mjs`；`package/lib/index.js:28`（即 `host.mjs:28`）
以 `'./channel.mjs'` import 它。若 `channel` 迁 TS：
- `.ts` 源 → `tsc` **只能 emit `.js`**（要 emit `.mjs` 源文件必须叫 `.mts`）；
- 于是要么把 host 的 import 改成 `'./channel.js'`（`exports` 未暴露该子路径，`files:["lib"]` 覆盖，**契约允许**），
  要么让 `channel` 源保持 `.mts` 以继续产出 `.mjs`（多一套后缀规则）。
- 另：`host.mjs` 会被**原样复制**成 `package/lib/index.js`（`build-client.mjs:389`）。一旦 host 需要编译，
  构建器必须从「复制源码」改为「复制编译产物」，且产物里不能再残留 `__PALETTE_VERSION__` 之外的 TS 痕迹/源映射引用。

**S3 · `scripts/build-client.mjs`（正则 bundler）——最大的技术约束**
- `JS_IMPORT_RE = /^import \{ ([^}]+) \} from '\.\/([A-Za-z0-9_\/-]+)\.mjs'$/`（`:129`）要求**行尾正好是 `.mjs'`**；
  `JSON_IMPORT_RE`（`:128`）要求行尾正好是 `with { type: 'json' }`；`EXPORT_RE`（`:131`）只认 `export function|const`。
  **`tsc` 默认会在每条 import/export 后加 `;`** → 全部失配。实测全仓 `src/engine`、`runtime`、`scripts`、`tests`
  **行尾分号数量为 0**（4 个目录合计），说明当前源码风格与正则强耦合。
- 另两个脆弱点：`MODULE_ORDER`（`:117-126`）与 `RUNTIME_MODULE_FILES`（`:32`）是**手写清单**，改名/增删文件必须同步；
  `JSON_IMPORT_RE` 用**basename** 在 `themes` 再 `custom-presets` 里查找（先 themes），同名文件会被静默遮蔽。
- 结论：走 `tsc` 路线时，必须同时改三处——正则（容忍 `;`/`.js`/`.ts`）、清单、以及「type-only import 必须被剥掉」
  （`import type` 行不会被任何正则匹配，会原样落进 bundle → 语法错误）。

**S4 · `runtime/client.mjs` 的伪路径**
它不是可执行模块，只是 bundle 输入。迁移时若把它改成 `.ts`，bundler 的 `JS_IMPORT_RE` 必须同时接受
`./engine/*.js`（TS 源里写的 specifier）与 `./engine/*.mjs`（旧写法），否则引擎模块会被当成「外部包」或原样保留。

**S5 · 非 npm-script 的构建侧脚本**
`generate-assets.mjs`（真实 import 引擎）、`convert-desktop-themes.mjs`、`rebuild-event-list.mjs` 都**不在** `npm run build` 链里
（`package.json` scripts 只有 sync/sync:update/fonts/deps:check/deps:sync/vendor:check/build/test）。
若引擎改 TS 而它们保持 `.mjs`，`generate-assets.mjs` 会断；若一起转，它们又失去了「随时 `node` 直跑」的便利
（Node 22 需 `--experimental-strip-types`，Node 23.6+/24 默认支持——本机 v24.19.0 实测可直跑 `.ts`，见 §2.2 探针）。
**建议把它们与 `npm run build` 明确分层**，别让「一次性生成器」绑死主构建。

**S6 · 数据 JSON 与 import 属性**
`registry.mjs`（37 条）与 `ip-presets.mjs`（21 条）用 `with { type: 'json' }` 静态 import。迁 TS 需要
`resolveJsonModule`，且**emit 必须保留** `with { type: 'json' }` 形态（bundler 靠它识别并内联）；若 `tsc` 把它降级/去掉，
58 条 JSON import 会全部失配。实测 Node 24 对 `.ts` 里的该语法原生支持，但这**不代表 tsc emit 也保留**（见 §7）。

### 5.3 README / 发布脚本是否受影响

- **README 不受影响**：`README.md` 与 `docs/README.en.md` 对 `.mjs` / `src/engine` 的提及数为 **0**；
  且 `tests/readme-{body,head-tail}.test.mjs` 守着 README 结构与「英文版去 showcase 后与 `package/README.md` 同源」的变换。
- **发布脚本不受影响**：3 个 `.ps1` 只依赖 `package/` 目录与 `npm run build`/`npm test` 的存在，不认任何 `.mjs`；
  `tests/release-scripts.test.mjs` 只校验 BOM。
- **文档会腐烂**：`DESIGN.md` 有 **26 处** `.mjs` 路径（§2 目录树逐行点名 9 个文件）、`docs/adr/0001`(8)、`docs/adr/0002`(4)、
  `docs/i18n-glossary.md`(10)、`package/release-notes-*`（每个 1–2 处）。这些**没有测试守**，改名后必须手工同步，
  否则下一个人按 DESIGN.md 找 `resolve.mjs` 会扑空。

---

## 6. 对决策票的输入

1. **迁移面应切成两批**：27 个生产源码（7,436 行）先转，14 个测试（5,020 行，262 个 case、73 处源码路径引用）后转；
   两批之间允许「测试继续读 `.mjs` 源码」的过渡期不存在——一旦源码改名，测试的 import 与 `readFileSync` 会同时断，
   所以**测试必须与对应模块同一次提交**，而不是「次批」。（证据等级：A，实测 73 处引用 + `package.json` 的 14 文件测试清单）
2. **构建器是迁移的真正瓶颈，不是源码语法**：`build-client.mjs` 的正则要求「行首 import + 无分号 + `.mjs` 结尾」，
   与 `tsc` 默认 emit 不兼容；要么把 bundler 换成容忍 `;`/`.js`/type-import 的实现，要么给编译产物加一道后处理。
   这决定「加 typescript 依赖」是否可行——当前构建链是**零网络、零 devDependency**（`DESIGN.md:125`）。（A，读正则 + 实测 0 行分号）
3. **`font-face.mjs` 与 `channel.mjs` 是两个必须先拍板的特例**：前者是「源码目录里的生成物」，后者是「包内被 import 的 `.mjs`」。
   两者都牵动生成器，不能靠批量 `git mv` 解决；`channel` 改 `.js` 是契约允许的（不在 `exports`），`font-face` 改 `.ts` 必须同步 `inline-fonts.mjs`。（A，`build-client.mjs:389,393`、`host.mjs:28`、`inline-fonts.mjs:46`）
4. **产物继续入库、继续提交是现状，且被 8 个写盘点锚定**；若改为「发布时生成」，等于同时改 `build-client.mjs` 写盘、
   `check-deps.mjs` 的「产物声明」校验、`readme-head-tail` 的 README 同源断言——**建议本次迁移不动这条**，只换源码语言。（A）
5. **对外契约必须冻结**：`main/exports/files/dsh.client/dsh.bundle.patch/engines/精确钉版依赖` 与 bundle 的
   `__ModuleLoader__.load({id,factory})` 形状逐字不变；允许变的只有 `lib/channel.*` 这个内部文件名。（A，`package/package.json` + `build-client.mjs:342-378,309`）
6. **`prototypes/` 建议排除在迁移面之外**（3 文件 813 行，无 npm script、无 import 边），与「全量」的字面冲突应在决策票里显式说明，
   否则验收时会被问「为什么还有 .mjs」。（B，静态关系实测；用途未从 issue 文本核实）

---

## 7. 证据缺口（没核实到的点）

1. **`tsc` 实际 emit 形态未验证**：仓库无 typescript、无 `tsconfig.json`、`node_modules` 里没有 `typescript`/`@types/node`；
   安装被禁。第 S3/S6 条关于「tsc 会加分号 / 会保留 import 属性」是**基于正则与源码风格的推断**（等级 B），
   决策前应在一个隔离目录里跑一次 `tsc --module nodenext --target es2022` 对 3 个代表性文件（`registry.mjs`、
   `index.mjs`、`client.mjs`）做 emit 对照。
2. **Node 22 的 TS 支持未验证**：只在本机 Node **v24.19.0** 上验证了类型剥除 + `with { type: 'json' }`；
   `engines.node >= 22`，而 22.x 需要 `--experimental-strip-types`，23.6+ 才默认。是否接受「测试/脚本用 node 直跑 `.ts`」
   取决于最低支持版本，这点没测。
3. **没有跑过 `npm run build` / `npm test`**：因此「当前入库产物与工作树源码一致」是**间接证据**
   （host/channel/event-list/README 四组逐字节相同 + bundle 头版本号 2.1.3），不是构建复现。
   WIP 下 `client.js` 与 `package/lib/client.js` 是否由**同一份**源码产出，只能从「两文件都 +246/−4」推断。
4. **`src/themes/desktop-2.0/*.json` 的来源无脚本可查**：`MANIFEST.json` 的 `adapted20` 自述为
   「sst/opencode 2.0 branch packages/ui/src/theme/themes/」，但仓库里没有下载/校验脚本，也没有 SHA 锁。
   迁移不影响它，但「4 款桌面主题能否可复现重建」在本报告里**无法回答**。
5. **`runtime/event-list.json` 不是纯生成物**：`rebuild-event-list.mjs:26-27` 同时读「上游 event-list.update.json」**和**
   「现有 runtime/event-list.json」，并用 5 个自研事件 + 3 个共享事件做三方对账；没有上游新版本时不重跑就会静默保留旧口径。
   它禁止转，但「谁在何时重跑」没有自动化（无 npm script）。ADR 0002 提到「门禁查不出、必须人眼对照」即指此类。
6. **发布产物形状未实测**：没有 `npm pack`，所以 tarball 内文件清单（`lib/{client.js,index.js,channel.mjs,event-list.json}` +
   `README.md` + `package.json` + `cordis.patch.yml`）来自 `files` 白名单与构建写盘推断（等级 B），未经 `tar -tf` 验证。
7. **「全量迁移」范围界定**：issue #108 正文与地图 #104 的验收标准未在本报告中逐条引用（研究只读了任务书给的边界问题），
   `prototypes/` 是否在验收范围内属**待确认**，不是笔误。
