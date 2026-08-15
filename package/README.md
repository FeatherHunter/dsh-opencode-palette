# dsh-Opencode TUI 主题 v2 — 34 主题引擎

> 让 DSH（DeepSeek Harness）Web 界面支持 **opencode TUI 的全部 34 个主题**
> （33 内置 + system），一键切换、即时生效、持久化保存。

## 功能

| 维度 | 说明 |
|---|---|
| 主题 | **34 个**：aura / ayu / carbonfox / catppuccin×3 / cobalt2 / cursor / dracula / everforest / flexoki / github / gruvbox / kanagawa / lucent-orng / material / matrix / mercury / monokai / nightowl / nord / one-dark / opencode / orng / osaka-jade / palenight / rosepine / solarized / synthwave84 / system / tokyonight / vercel / vesper / zenburn |
| 数据源 | opencode v1.18.12 官方主题 JSON（npm run sync 可升级/校验） |
| 管线 | 主题 JSON → 颜色解析（引用链/ANSI/变体）→ DSH 适配注入（token + CSS + shiki） |
| 切换 | 设置 → 插件 →「Opencode 主题」面板：排印三控件置顶 + 色系分组标签网格 + 搜索，点击即切换（组合 1 布局） |
| system | 恢复 DSH 原生配色（只保留字体/字号/代码排印） |
| 字体 | 主题只管颜色；正文模式（全等宽/无衬线）、字号 12-14px、5 种代码字体独立调节 |
| 持久化 | localStorage 保存，刷新/重启后保持 |
| 自检 | 面板内 getComputedStyle 实测背景/字体/字号 |

## 开发

    npm run sync    # ① 从 opencode 官方 tag 同步主题数据（版本锁 v1.18.12）
    npm test        # ② 引擎单测（34 主题全量解析审计）
    npm run build   # ③ 零依赖打包 → package/ 产物 + 动态版 client.js

## 安装（正式版）

    1. 构建产物: npm run build
    2. 更新已装副本（安装位 = profiles/web/node_modules/dsh-opencode-palette）
       或首次安装: npx --yes @deepseek-ai/dsh plugin --profile web add dsh-opencode-palette
       并在 cordis.patch.yml 追加:
       - insert:
           - id: opencode-palette
             name: 'dsh-opencode-palette'
    3. 刷新浏览器页面

> ⛔ 不要手动复制到 ~/.dsh/profiles/node_modules/（回退软链区，会被重建覆盖）。
> 正确安装位 = profiles/web/node_modules，注册写 web/cordis.patch.yml。

## 架构

见 DESIGN.md：数据驱动三层管线（数据层/引擎层/适配层），
映射表 src/engine/map-dsh.mjs 是唯一需要理解 DSH 侧知识的地方；
加新主题 = npm run sync，改 DSH 变量名 = 只改映射表。

## 调试

控制台可用 window.__opencodePalette（getState / setTheme / toggle / list / previews）。

## 文件

- scripts/sync-themes.mjs — 数据同步（下载 + 校验 + SHA256 指纹 + NOTICES）
- src/engine/ — 纯逻辑引擎（resolve / map-dsh / generate / registry / index）
- runtime/client.mjs — 浏览器胶水（注入/切换/持久化/面板）
- scripts/build-client.mjs — 零依赖 mini-bundler
- package/ — 产物包（lib/index.js 宿主半 + lib/client.js 浏览器半）
- client.js — 动态版（cordis_define code.client 函数体，与包版同源）