# 🎨 dsh-opencode-palette

**🌐 [中文](README.md) · [English](docs/README.en.md)**

**把 opencode 的经典配色带进 DeepSeek Harness —— 34 款主题，眼睛舒服，码字开心。**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/dsh-opencode-palette)](https://www.npmjs.com/package/dsh-opencode-palette)
[![opencode](https://img.shields.io/badge/themes-opencode%20v1.18.12-orange)](https://github.com/anomalyco/opencode)
[![tests](https://img.shields.io/badge/tests-20%2F20-green)]()

![hero](assets/hero-zh.svg)
## 一条命令完成安装

需要 **DSH CLI**（DeepSeek Harness 命令行工具）。如果还没有，先安装：

```bash
npm install -g @deepseek-ai/dsh
```

然后把插件装进你的 profile：

```bash
dsh plugin --profile web add dsh-opencode-palette
```

安装即完成，**零配置**：本插件采用 DSH 官方 bundle 机制——包内自带 `cordis.patch.yml`（声明 `dsh.bundle.patch`），`dsh plugin add` 装完后自动把插件加入 profile 的 `dsh.profile.bundles` 层栈，DSH 启动时直接装配；`dsh plugin remove` 卸载时自动移除。全程无需手动编辑任何文件，也不依赖 pnpm 构建脚本（无 postinstall，pnpm v10 不会拦截）。重启 DSH（或刷新浏览器页面）即生效，插件默认启用官方 `opencode` 主题（深黑底 + 橙 / 蓝 / 紫）。

## 升级

`dsh plugin` 子命令透传 pnpm verb，所以升级就是 `update` + 自动对齐 manifest：

```bash
dsh plugin --profile web update dsh-opencode-palette
```

等价方案（幂等重装，pnpm 会升到 latest 匹配版本）：

```bash
dsh plugin --profile web add dsh-opencode-palette
```

升级后无需手动编辑任何配置——`dsh.profile.bundles` 在每次成功的 plugin 子命令后都会自动和已装状态对齐，bundle 层的 `cordis.patch.yml` 自动接入。重启 DSH（或刷新浏览器页面）即生效。需要钉回历史版本：`dsh plugin --profile web add dsh-opencode-palette@<版本>`。

> **从 1.4.x 及更早版本升级**：旧版本通过 postinstall 在 `~/.dsh/profiles/web/cordis.patch.yml` 里写过注册块。升级前请删除其中的 `opencode-palette` 注册块（bundle 装配后残留会导致重复注册），再执行上面的 `update` 或 `add`。

## 它是什么

DeepSeek Harness 默认只有一套外观。装上它之后，你可以让整个界面穿上 **opencode 的 34 套官方配色**中的任意一套 —— `tokyonight`、`dracula`、`gruvbox`、`matrix`、`rose-pine`、`catppuccin ×3`、`solarized`、`synthwave84` ……

- 每个颜色都来自 opencode 官方主题 JSON（v1.18.12）——opencode 出厂什么样，这里就是什么样。
- 点一下，整个界面跟着换：背景、按钮、边框、状态色、markdown、代码高亮全部同步。
- 选过的主题会被记住，重启不丢。
- 面板跟着 DSH 界面语言走（中文 / English）。

## 30 秒上手

**设置 → 插件 → OpenCode 调色板**（英文界面为 **Settings → Plugins → Opencode Palette**）：

![setup panel](assets/setup-panel-zh.svg)

点任意主题色块，界面立即换色：

![theme switch](assets/theme-switch-zh.svg)

## 功能详解

### 主题与它们的名字

每个名字背后都有一段来历：

![theme stories](assets/theme-stories-zh.svg)

### 34 款官方主题，忠实还原

每个主题都能一眼看到它最核心的 7 种颜色 —— `背景 · 文字 · 主色 · 强调 · 错误 · 警告 · 成功`：

![palette strips](assets/palette-strips-zh.svg)

34 款一览：

![palette matrix](assets/palette-matrix-zh.svg)

### 排印独立于主题

- 正文样式：等宽（终端风）或常规（界面风）——想要 opencode 的终端观感，还是经典界面观感。
- 字号：11–18 px。
- 代码字体：5 种预设，带实时预览（JetBrains Mono、Cascadia Code、Fira Code、SF Mono、Consolas）。

### `system` —— 一键回到默认

随时恢复 DSH 原生外观，同时保留你的排印设置。

### 按浏览器持久化

主题与排印选择保存在本地，刷新、重启都不丢。

### 面板自动双语

面板跟随 DSH 界面语言 —— 在 DSH 里切换语言，面板即时跟随。

## 作者的其他作品

喜欢这个插件的话，这些可能你也用得上：

- [**dsh-prompt**](https://github.com/FeatherHunter/dsh-prompt) —— 写 Prompt 卡壳的时候，里面有 24 条深度模板，点一下直接进输入框。
- [**dsh-mattpocock-skills-deck**](https://github.com/FeatherHunter/dsh-mattpocock-skills-deck) —— 想让 AI 不只是会聊天？25 个工程技能装好即用，一条安装 Prompt 的事。

## 开发

```bash
npm run sync    # 从 opencode 拉取官方主题 JSON（版本锁定 + 校验和）
npm test        # 20 项测试：34 主题全量审计 + 面板渲染（中/英）
npm run build   # 零依赖打包 → package/ + 动态版 client.js
npm run assets  # 重新生成本 README 中的 SVG 图
```

架构见 [DESIGN.md](DESIGN.md)：数据驱动三层管线，`src/engine/map-dsh.mjs` 是 DSH 映射层唯一真相源。

## 参与贡献

合适的切入点：上游新主题（跑 `npm run sync`）、映射层调优、文案打磨、更多语言翻译。保持引擎纯净（无 DOM），测试全绿即可。

## 许可与归属

MIT © FeatherHunter。主题定义来自 [opencode](https://github.com/anomalyco/opencode)（MIT）及其上游主题项目 —— 见 [THIRD_PARTY_NOTICES](src/themes/THIRD_PARTY_NOTICES.md)。