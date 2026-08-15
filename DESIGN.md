# DESIGN — dsh-opencode-palette v2（多主题引擎）

> 目标：让 DSH Web 界面支持 **opencode TUI 的全部 34 个主题**（33 内置 + system），
> 可即时切换、可持久化、可扩展。本文是架构师视角的设计说明：分层、数据流、映射表、扩展点。

## 1. 一句话架构

**数据驱动三层管线：`主题数据(JSON) → 颜色解析(resolve) → DSH 适配(map+generate) → 注入(apply)`**。
主题是纯数据（vendored 自 opencode v1.18.12 官方 tag），代码不硬编码任何颜色；
DSH 侧知识（CSS 变量名）被收敛到唯一一张映射表 `map-dsh.mjs`。

## 2. 目录结构

```
dsh-opencode-palette/
├── package.json              # dev 工作区（scripts: sync / build / test）
├── DESIGN.md                 # 本文
├── README.md                 # 用户文档
├── scripts/
│   ├── sync-themes.mjs       # ① 数据层：从 opencode 官方 tag 同步主题 JSON（带校验+指纹）
│   └── build-client.mjs      # ④ 构建层：零依赖 mini-bundler → 产物
├── src/
│   ├── themes/               # ① vendored 主题数据（33 个 JSON + NOTICES）
│   └── engine/               # ② 纯逻辑引擎（ESM，可在 node 直接测试）
│       ├── resolve.mjs       #    颜色解析器：引用链 → RGBA/HEX
│       ├── map-dsh.mjs       #    ★ 单一真相源：opencode 色位 → DSH CSS 变量
│       ├── generate.mjs      #    主题 → { tokens, cssText }
│       ├── registry.mjs      #    注册表：33 JSON + system 生成
│       └── index.mjs         #    ThemeEngine 门面（无 DOM 依赖）
├── runtime/
│   └── client.mjs            # ③ 浏览器胶水：注入/热切换/持久化/设置面板
├── tests/
│   └── engine.test.mjs       # 引擎单测（node:test，无需浏览器）
├── package/                  # 产物：可分发 npm 包（build 生成）
│   ├── package.json
│   ├── README.md
│   └── lib/{index.js, client.js}
└── client.js                 # 动态版产物（build 生成，与包版同源）
```

## 3. 分层职责与数据流

```
[数据层] src/themes/*.json        opencode 官方主题定义（defs 引用表 + theme 色位表）
   │  sync-themes.mjs 负责获取/校验/指纹（版本锁 v1.18.12）
   ▼
[引擎层] resolve.mjs              把 defs/theme 引用链、{dark,light} 变体、ANSI 数字、
   │                             transparent/none 全部解析为确定 HEX/RGBA（带循环检测）
   ▼
[引擎层] registry.mjs             themes = 33 静态 + system 运行时生成；字母序；搜索
   ▼
[适配层] map-dsh.mjs              语义色位 → DSH CSS 变量（--dsw-alias-* / --shiki-token-*）
   ▼
[生成层] generate.mjs             主题 → { tokens: overrideTokens 对象, css: <style> 文本 }
   ▼
[运行时] runtime/client.mjs       theme.overrideTokens + <style> 注入；切换=整体重生成+原子替换；
                                  状态持久化 localStorage；设置面板
```

**为什么这样分层**：
- 数据与代码分离 → 加新主题只跑 `npm run sync`（opencode 上游新增主题 0 代码改动）；
- 引擎无 DOM 依赖 → `node --test` 全绿即保证 34 主题可解析可生成（CI 友好）；
- 适配层唯一 → DSH 升级改变量名时只改 `map-dsh.mjs` 一张表；
- 运行时无业务逻辑 → 切换 = 幂等重放，永远"当前主题完整渲染"（无增量状态）。

## 4. 映射表设计（map-dsh.mjs · 唯一需要理解 DSH 侧知识的地方）

opencode 主题约 50+ 语义色位；DSH 暴露 `--dsw-alias-*`（token 层）+ `--shiki-token-*`
（语法高亮层）+ 少量元素级规则。映射原则：

| opencode 色位 | → DSH 输出 |
|---|---|
| background | 全部背景面：bg-base/layer-1/2/3/overlay/module-platform/multi-select、menu/selector/tip/bubble/bubble-highlight、markdown-tag/placeholder/citation/code-segment-unselected、sidebar-fill |
| backgroundPanel | 输入框（input-major/login-input）、代码块底（markdown-code-block）、toast/tooltip 底 |
| backgroundElement | 代码块横幅（markdown-code-block-banner）、按钮浮起面、滚动条轨 |
| text | label-primary（+inverted/dimmed/foreground）、shiki-foreground、markdown 正文 |
| textMuted | label-secondary/tertiary/caption/dimmed、shiki-comment |
| primary | brand-primary、button-primary-fill、markdownHeading（标题色） |
| accent | markdownLink（链接色）、button-primary-hover 提亮 |
| error/warning/success/info | state-error/warn/success + button-info |
| border / borderActive / borderSubtle | border-l1/l2(+darkmode-thin) / scrollbar / border-inverted |
| syntaxComment | shiki-token-comment |
| syntaxKeyword | shiki-token-keyword |
| syntaxFunction | shiki-token-function |
| syntaxString | shiki-token-string + string-expression |
| syntaxNumber | shiki-token-constant |
| syntaxVariable | shiki-foreground（opencode 中 variable 常=正文色，见各主题 JSON） |
| syntaxType | shiki-token-parameter（类型≈参数槽，DSH 无独立 type 槽） |
| syntaxOperator / syntaxPunctuation | shiki-token-punctuation |
| markdownCode | 内联代码色 code:not(pre code) |
| markdownEmph/Strong | 元素规则 em/strong |

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

## 7. 构建（零依赖 mini-bundler）

约束：引擎代码使用受限 ESM 语法（单行 import、无 default/re-export、无动态导入），
build-client.mjs 用 ~120 行把 src/engine + src/themes + runtime 内联为一个
`window.__ModuleLoader__.load({ id, factory })` CJS bundle（保留 `require('react')`
外部引用）。同一份引擎同时产出「包版 lib/client.js」与「动态版 client.js」两个入口形状。
不引入 esbuild/rollup：环境无网络依赖、产物确定、无版本漂移。

## 8. 扩展点（怎么加东西）

| 需求 | 动作 |
|---|---|
| opencode 上游新增主题 | `npm run sync`（自动下载+校验+指纹，代码 0 改动） |
| DSH 改 CSS 变量名 | 只改 map-dsh.mjs 对应行 |
| 新增字体预设 | runtime 的 FONTS 常量 |
| 支持浅色变体（light） | generate 读 DSH 外观模式，resolve 输出 light 分支（已预留） |
| 面板加"对比度"等参数 | state 加字段 + generate 消费（管线不动） |

## 9. 决策记录（ADR 简表）

- D1 主题数据锁定 opencode **v1.18.12**（与用户本机 opencode-ai@1.18.12 一致），
  升级上游 = 改 sync 脚本常量 + 重跑。
- D2 默认强制 dark 值（light/dark 都取 dark 分支）：opencode TUI 是深色终端观感，
  与 v1.1.0 行为一致；浅色支持作为扩展点保留。
- D3 system 取「恢复原生」语义（见 §5），不做 ANSI 仿真（浏览器无终端调色板）。
- D4 主题数据含第三方主题（dracula/nord/...），随 opencode MIT 分发，NOTICES 落盘。
- D5 更新已装插件 = 替换 profiles/web/node_modules 实体目录文件 + 页面刷新
  （客户端 bundle 由 webserver 从安装位伺服），宿主侧 no-op 无需重启。