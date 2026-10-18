# DESIGN — dsh-opencode-palette v2（多主题引擎）

> 目标：让 DSH Web 界面支持 **opencode 的全部 38 个主题**（37 内置：33 TUI + 4 桌面 2.0 转换 + system），
> 可即时切换、可持久化、可扩展。本文是架构师视角的设计说明：分层、数据流、映射表、扩展点。
> 源码为全 TypeScript（迁移决策与验收见 [ADR 0003](docs/adr/0003-typescript-migration.md)）。

## 1. 一句话架构

**数据驱动三层管线：`主题数据(JSON) → 颜色解析(resolve) → DSH 适配(map+generate) → 注入(apply)`**。
主题是纯数据（vendored 自 opencode v1.18.12 官方 tag），代码不硬编码任何颜色；
DSH 侧知识（CSS 变量名）被收敛到唯一一张映射表 `map-dsh.ts`。

## 2. 目录结构

```
dsh-opencode-palette/
├── package.json              # dev 工作区（scripts: typecheck / build / test / verify:artifacts）
├── tsconfig.json             # 类型检查配置（noEmit，覆盖 src/ runtime/ scripts/ tests/ types/）
├── tsconfig.build.json       # emit 配置：src/engine + runtime → dist/（bundler 只消费它）
├── types/dsh.d.ts            # 手写最小 ambient：宿主 ctx / slots / locale / timer 面
├── DESIGN.md                 # 本文
├── README.md                 # 用户文档
├── scripts/                  # 构建/同步脚本（TypeScript，Node 原生类型剥离直接跑）
│   ├── sync-themes.ts        # ① 数据层：从 opencode 官方 tag 同步主题 JSON（带校验+指纹）
│   ├── inline-fonts.ts       #    生成器：把 src/fonts/*.woff2 写成 src/engine/font-face.ts
│   ├── check-deps.ts         #    随包依赖新鲜度硬门禁（构建前置）
│   ├── lib/source-parser.ts  #    逐行 import/export 解析器（bundler 的输入层）
│   └── build-client.ts       # ④ 构建层：零依赖 mini-bundler → 产物
├── src/
│   ├── themes/               # ① vendored 主题数据（37 个 JSON + NOTICES + MANIFEST）
│   ├── custom-presets/       # ① IP 预置数据（21 个 JSON）
│   └── engine/               # ② 纯逻辑引擎（TypeScript，无 DOM 依赖，可 node 直测）
│       ├── resolve.ts        #    颜色解析器：引用链 → RGBA/HEX
│       ├── font-face.ts      #    生成文件：随包 OFL 字体 @font-face（inline-fonts.ts 生成，勿手改）
│       ├── font-avail.ts     #    本机字体可用性判定：宽度对比法（document 注入，可 node 直测）
│       ├── map-dsh.ts        #    ★ 单一真相源：opencode 色位 → DSH CSS 变量
│       ├── generate.ts       #    主题 → { tokens, cssText }
│       ├── registry.ts       #    注册表：37 静态 + system 生成
│       └── index.ts          #    ThemeEngine 门面（无 DOM 依赖）
├── runtime/                  # ③ 运行时（TypeScript；浏览器半 + 宿主半）
│   ├── client.ts             #    浏览器胶水：注入/热切换/持久化/设置面板
│   ├── custom-editor.ts      #    自定义主题编辑器（React.createElement，无 JSX）
│   ├── host.ts               #    宿主半：日志落盘 + 更新电话 + 通道路由
│   ├── channel.ts            #    宿主↔浏览器共享的通道常量
│   ├── custom-color.ts       #    自定义色工具
│   ├── custom-store.ts       #    自定义主题存储
│   └── ui-fx.ts              #    面板视觉工具
├── tests/                    # 测试（TypeScript，`node --test`，无需编译）
├── prototypes/               # 设计原型（历史资产，唯一不迁 TypeScript 的例外，见 ADR 0003）
├── dist/                     # tsc emit 中间产物（每轮重建，gitignore，不入库、不进包）
├── package/                  # 产物：可分发 npm 包（build 生成，不入库；release-notes-*.md 手写入库）
│   ├── package.json
│   ├── README.md
│   └── lib/{index.js, client.js, channel.js, event-list.json}
└── client.js                 # 动态版，本地开发产物（与包版同源），不入库、不进 npm 包
```

## 3. 分层职责与数据流

```
[数据层] src/themes/*.json        opencode 官方主题定义（defs 引用表 + theme 色位表）
   │  sync-themes.ts 负责获取/校验/指纹（版本锁 v1.18.12）
   ▼
[引擎层] resolve.ts               把 defs/theme 引用链、{dark,light} 变体、ANSI 数字、
   │                             transparent/none 全部解析为确定 HEX/RGBA（带循环检测）
   ▼
[引擎层] registry.ts              themes = 37 静态 + system 运行时生成；字母序；搜索
   ▼
[适配层] map-dsh.ts               语义色位 → DSH CSS 变量（--dsw-alias-* / --shiki-token-*）
   ▼
[生成层] generate.ts              主题 → { tokens: overrideTokens 对象, css: <style> 文本 }
   ▼
[运行时] runtime/client.ts        theme.overrideTokens + <style> 注入；切换=整体重生成+原子替换；
                                  状态持久化 localStorage；设置面板
```

**为什么这样分层**：
- 数据与代码分离 → 加新主题只跑 `npm run sync`（opencode 上游新增主题 0 代码改动）；
- 引擎无 DOM 依赖 → `node --test` 全绿即保证 38 主题可解析可生成（CI 友好）；
- 适配层唯一 → DSH 升级改变量名时只改 `map-dsh.ts` 一张表；
- 运行时无业务逻辑 → 切换 = 幂等重放，永远"当前主题完整渲染"（无增量状态）。

## 4. 映射表设计（map-dsh.ts · 唯一需要理解 DSH 侧知识的地方）

opencode 主题约 50+ 语义色位；DSH 暴露 `--dsw-alias-*`（token 层）+ `--shiki-token-*`
（语法高亮层）+ 少量元素级规则。映射原则：

| opencode 色位 | → DSH 输出 |
|---|---|
| background | 页面底与各层底：bg-base/layer-1/2/3/overlay、markdown-code-segment-unselected |
| backgroundPanel | 浮起面：markdown-tag/placeholder、bg-multi-select、button-elevated-fill/button-floating-fill |
| backgroundElement | 浮层：markdown-citation（思考引用块竖线）、bg-module-platform、selector/tip/bubble-highlight、toast-bg/tooltip-bg |
| sidebarBg / bubbleBg / inputBg / codeBlockBg / codeHeaderBg | DSH 专属槽（#84 起 37 色位见 `src/engine/map-dsh.ts` COLOR_SLOTS）：sidebar-fill / bubble / input-major+login-input / markdown-code-block / code-block-banner+dsl-code-block-background |
| text | label-primary（+inverted/dimmed/foreground）、shiki-foreground、markdown 正文 |
| textMuted | label-secondary/tertiary/caption/dimmed、shiki-comment |
| primary | brand-primary、button-primary-fill、markdownHeading（标题色） |
| accent | markdownLink（链接色）、button-primary-hover 提亮 |
| error/warning/success/info | state-error/warn/success + button-info |
| border / borderActive / borderSubtle | border-l1/l2(+darkmode-thin) / scrollbar / border-inverted |
| syntaxComment | shiki-token-comment |
| syntaxKeyword | shiki-token-keyword |
| syntaxFunction | shiki-token-function（函数名、类型名、属性名） |
| syntaxString | shiki-token-string + string-expression |
| syntaxNumber | shiki-token-constant |
| syntaxVariable | shiki-foreground（opencode 中 variable 常=正文色，见各主题 JSON） |
| syntaxType | shiki-token-parameter（参数名；DSH 无独立 type 槽，类型名走 token-function） |
| syntaxOperator / syntaxPunctuation | shiki-token-punctuation |
| markdownCode | 内联代码色 code:not(pre code) |
| markdownEmph/Strong | 元素规则 em/strong |

> 上表为架构概览；逐条映射以 `src/engine/map-dsh.ts` 的 TOKEN_MAP / DERIVED_TOKENS / SHIKI_MAP / CSS_RULES 为准（本表部分行早于 #53/#84 的增补，若与代码表冲突以代码表为单源）。
>
> DSH 只认 10 个 shiki token 变量，opencode 有 9 个语法色位 + 若干 markdown 色位，
> 故语法色做「角色相近合并」，合并规则集中在上表并文档化（可逐条调整）。

## 5. system 主题语义（DSH 侧无终端，取「跟随宿主」含义）

opencode 的 system = 跟随终端 16 色。DSH Web 没有终端 → system 定义为
**「恢复 DSH 原生外观」**：不覆盖任何颜色 token、CSS 只注入字体/字号/代码排印。
切换 system = 一键还原产品默认配色（字体维度仍受控），符合用户直觉。

## 6. 运行时状态模型

```
state = { enabled: bool, theme: string, mode: 'mono'|'tui', size: 12|13|14, fontKey: string }
持久化: localStorage['dsh.opencode-palette.v2']（JSON）
不变式:
  - apply() 幂等：先清理旧注入，再完整注入当前 state → 无残留/无叠加
  - 主题维度与字体维度正交：主题只管颜色，字体/字号/等宽模式独立调节
  - 默认 state = { enabled: true, theme: 'opencode', mode: 'mono', size: 13, fontKey: 'JetBrains Mono' }
    （与 v1.1.0 观感一致，主题色忠实官方 opencode）
```

## 7. 构建（TypeScript 两段式：tsc + 零依赖 mini-bundler）

约束：源码全 TypeScript，但**打包器只消费 tsc 转译后的 JS**（C-lite）；不引入 esbuild/rollup：
环境无网络依赖、产物确定、无版本漂移。构建分五步（`npm run build` 依次串起五步）：

1. **类型检查**：`npm run typecheck`（`tsc -p tsconfig.json`，`strict` + `noEmit`）覆盖
   `src/`、`runtime/`、`scripts/`、`tests/`、`types/`。构建前先过类型门禁，`strict`/tsc 不允许的写法直接拦。
2. **依赖门禁**：`node scripts/check-deps.ts` 对照 registry 检查随包依赖是否最新（钉版落后就拦，离线放行）。
3. **字体内联**：`node scripts/inline-fonts.ts` 把 `src/fonts/*.woff2` 重写为
   `src/engine/font-face.ts`（生成文件，勿手改；15 个 face 的 base64 内联）。
4. **emit**：`npm run emit`（先清空 `dist/`，再 `tsc -p tsconfig.build.json`）把
   `src/engine/*.ts` 与 `runtime/*.ts` 转译到 `dist/`（NodeNext / ES2022，声明与 sourceMap 不产出）。
   每轮清空是必须的：否则删掉/改名的模块会以陈旧文件形式在 `dist/` 里复活，内联器会读到幽灵模块。
5. **内联**：`scripts/build-client.ts` 借 `scripts/lib/source-parser.ts` 逐行识别 import/export，
   把 `dist/src/engine/*.js` + `dist/runtime/*.js` + `src/themes/*.json` + `src/custom-presets/*.json`
   内联为一个 `window.__ModuleLoader__.load({ id, factory })` CJS bundle（保留 `require('react')`
   外部引用）。同一份引擎同时产出「包版 lib/client.js」与「动态版 client.js」两个入口形状。

为什么两段式而不是让 bundler 直接读 TS：内联器保持零依赖、可读、确定性（文本级替换），
类型剥离与模块说明符改写交给 tsc 一处完成；bundler 只面对统一形态的普通 JS 与 JSON。
`dist/` 不入库、不发布。`package/` 里的 7 个派生物与根 `client.js`（共 8 个）同样不入库（[ADR 0004](docs/adr/0004-build-artifacts-out-of-git.md)）：
分发载荷只有一个去向——在 `package/` 里 `npm pack` 出 tgz 发 npm registry，同一 tgz 作 GitHub Release 资产；
根 `client.js` 只是本地开发产物，不进包也不发 Release。`package/package.json` 的 `files` 白名单只有 `lib` 与 `cordis.patch.yml`。

同一个构建器还产出宿主半与 npm 包声明（v1.8.0 起 vendor，0.2.0 起解耦为真依赖）：

- **宿主半**：`runtime/host.ts` 跟随同一轮 emit 成 `dist/runtime/host.js`，由构建器转写为
  `package/lib/index.js`（S2：用 tsc 转译输出替代早年的「源码原样复制」，另带 `channel.js`、
  `event-list.json` 两个随包文件）。宿主半是真插件：接日志落盘与更新三电话，并把电话经精确路由
  `/api/opencode-palette` 分发给浏览器半。宿主侧依赖由 `package/package.json` 的 `dependencies` 声明，
  两个都是**精确钉版**（`dsh-log@0.3.4` + `dsh-plugin-update@0.18.24`）——上游一发新版就得改声明重发，
  用户才拿得到。
- **npm 包客户端入口内联**：`dsh-log/client` 与 `dsh-plugin-update/entry`（入口件闭包）在构建期从 npm 包读入、
  转成 bundle 模块内联（转换器支持多行 `import`/`export` 与 `as` 别名）。所以面板里的电话名与轮询间隔
  是**运行时从包的函数算出来的**，不是抄进源码的常量。
- **更新包不再 vendor**：0.1.x 时 `runtime/vendor/` 与 `package/lib/vendor/` 由构建从 npm 包复制
  （自锚定缺陷的绕法）；0.2.0 起更新包按包名解析目标包，依赖形态直接可用，vendor 已全部删除。
  前因后果见 `docs/adr/0001-vendor-dsh-plugin-update.md`（已 superseded）与 `0002-*.md`。
  构建前 `node scripts/check-deps.ts` 硬门禁保证本机装的是上游最新（钉版落后就拦，离线放行），
  打出的 bundle 与用户装到的宿主依赖是同一版。
- **换行归一**：仓库 `* text=auto eol=lf`（2026-10-18 起钉住，[ADR 0004](docs/adr/0004-build-artifacts-out-of-git.md) D6），
  工作区一律 LF —— 派生物现产后（见下条），CRLF 工作区会让构建出的 8 件产物各多出其 CRLF 字节数
  （实测 `client.js` +7921 B），`npm pack` 的 tgz 哈希随机器而变。构建器在读取处仍统一成 LF 兜底，
  否则依赖「行首 import」的正则会全部失配（新克隆上构建静默产出 broken bundle）。
- **测试与产物门禁**：`npm test` 用 `node --test` 直接跑 `.ts` 测试（Node ≥ 22.18.0 原生类型剥离，
  不经 tsc、不依赖构建）；`pretest` 先跑 `npm run build:artifacts` 现产 8 个产物（实测约 2.0 s），
  所以 6 个读产物的测试永远测当前源码，不依赖任何入库字节；类型正确性由 `npm run typecheck` 独立把关。
  `npm run verify:artifacts`（`node scripts/verify-artifacts.ts`）五条：① 生成源同步——`npm run fonts`
  **前后各比一次** `src/engine/font-face.ts` 与入库版本（两侧行尾归一成 LF，手改与输入漂移都拦得住，
  新克隆的 CRLF 工作区也不假红）；② 连跑两次 `build:artifacts` 产物逐字节一致；③ 8 个产物存在且非空；
  ④ `package/lib/` 目录集合精确（陈旧文件会随 `files` 白名单进包，git 已不兜底）；⑤ 8 个产物都未被
  git 跟踪（回归保险），而 `font-face.ts` 仍被跟踪；另加一条 `.gitattributes` 必须钉住 `eol=lf`
  （构建字节与机器无关的前提）。产物去向与回滚见 [ADR 0004](docs/adr/0004-build-artifacts-out-of-git.md)。

## 8. 扩展点（怎么加东西）

| 需求 | 动作 |
|---|---|
| opencode 上游新增主题 | `npm run sync`（自动下载+校验+指纹，代码 0 改动） |
| DSH 改 CSS 变量名 | 只改 map-dsh.ts 对应行 |
| 字体版本更新 | 换 src/fonts/*.woff2 后 `npm run fonts` 重生成（OFL 可再分发限定；SF Mono/Consolas 私有，只检测不内置） |
| 新增字体预设 | runtime/client.ts 的 FONTS 常量 |
| 支持浅色变体（light） | generate 读 DSH 外观模式，resolve 输出 light 分支（已预留） |
| 面板加"对比度"等参数 | state 加字段 + generate 消费（管线不动） |

## 9. 决策记录（ADR 简表）

- D1 主题数据锁定 opencode **v1.18.12**（与用户本机 opencode-ai@1.18.12 一致），
  升级上游 = 改 sync 脚本常量 + 重跑。
- D2 默认强制 dark 值（light/dark 都取 dark 分支）：opencode TUI 是深色终端观感，
  与 v1.1.0 行为一致；浅色支持作为扩展点保留。
- D3 system 取「恢复原生」语义（见 §5），不做 ANSI 仿真（浏览器无终端调色板）。
- D4 主题数据含第三方主题（dracula/nord/...），随 opencode MIT 分发，NOTICES 落盘。
- D5（v1.8.0 改写）更新已装插件 = 替换 `profiles/<范围>/node_modules` 里的包文件 + **重启 DSH**。
  旧表述「页面刷新即可、宿主侧 no-op 无需重启」在 v1.7.x 之前成立（那时宿主半是空的）；现在宿主半
  真干活（日志落盘 + 更新电话 + 通道路由），而 DSH 不热重载 `node_modules` 里已装插件的宿主半
  （`hmr` 行 disabled、启动器只 watch profile patch、HMR 默认忽略 `node_modules`），所以：
  客户端半换成新版后由 `dsh-client-hmr` 自动热换（改 `dsh.client` 声明字段除外），
  宿主半必须重启进程才生效——这正是更新包 `pending-restart` 的语义，也是面板「待重启」提示的由来。
- D6（2026-10-18）**全仓 TypeScript 化**：源码/测试/脚本全 `.ts`，tsc 只做类型检查与 emit，
  零依赖 mini-bundler 继续消费 `dist/`；`engines.node >= 22.18.0`（Node 原生类型剥离下界）；
  `prototypes/` 为唯一例外（历史 HTML/mjs 原型不迁，见 ADR 0003）。
- D7（2026-10-18）**派生物不入库**：`package/` 里的 7 个派生物与根 `client.js`（共 8 个）移出 git，由
  `build:artifacts` / `pretest` 现产（约 2.0 s）；`verify:artifacts` 改判「可重复 + 集合精确 +
  生成源无 diff + 产物不被跟踪」；分发载荷只走 `npm pack` 出的 tgz（npm registry + Release 资产）。
  见 [ADR 0004](docs/adr/0004-build-artifacts-out-of-git.md)（supersede ADR 0003 的 D4）。
