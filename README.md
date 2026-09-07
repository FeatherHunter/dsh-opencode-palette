<h1 align="center">🎨 dsh-opencode-palette</h1>

<div align="center">

**🌐 [中文](README.md) · [English](docs/README.en.md)**

**为长时间编程而生 —— 38 款护眼配色一键换上，眼睛舒服，码字开心。**

*Built for long coding sessions — 38 eye-friendly themes, one click.*

你的 ⭐是我夜空中最亮的星。

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/dsh-opencode-palette)](https://www.npmjs.com/package/dsh-opencode-palette)
[![themes](https://img.shields.io/badge/themes-38%20opencode-orange)](https://github.com/anomalyco/opencode)
[![tests](https://img.shields.io/badge/tests-38%2F38-green)]()

</div>

<!-- showcase:start -->
<h2 align="center"><sub>SHOWCASE</sub><br>真实效果</h2>

<div align="center">

每天盯屏幕十几个小时，眼睛难免发涩——换套温柔的配色，让眼睛歇一会儿。opencode 的 38 套经典配色深受开发者喜爱，一键给整个 DSH 换上，深色护眼、浅色通透，白天黑夜各取所需。

**👇 装完重启，主界面就是这个样子（opencode 主题）。**

<img src="showcase/overview-opencode-zh.png" width="640" alt="OpenCode 调色板 — 主界面概览（opencode 主题，38 款同款）" style="border:1px solid #30363d;border-radius:6px">

**👇 设置面板：38 款按色系分组，搜一下即切。**

<img src="showcase/opencode调色板设置页面-zh.png" width="640" alt="OpenCode 调色板 — 设置面板（opencode 主题，38 款同款）" style="border:1px solid #30363d;border-radius:6px">

**👇 白天党放心：浅色主题同样完整覆盖。**

<img src="showcase/overview-github-light-zh.png" width="640" alt="OpenCode 调色板 — 浅色主题概览（GitHub 亮色，38 款同款）" style="border:1px solid #30363d;border-radius:6px">

</div>

<!-- showcase:end -->

<h2 align="center"><sub>INSTALL</sub><br>一条命令完成安装</h2>

<div align="center">

需要 **DSH CLI**。**零配置**：装完重启 DSH（或刷新浏览器页面）即生效，默认启用官方 `opencode` 主题。

</div>

```bash
# ① 还没装 DSH CLI 先装（已装跳过）
npm install -g @deepseek-ai/dsh

# ② 把插件装进你的 profile
dsh plugin --profile web add dsh-opencode-palette
```

<h2 align="center"><sub>GUIDE</sub><br>30 秒上手</h2>

1. 打开 **设置 → 插件 → OpenCode 调色板**（英文界面为 **Settings → Plugins → Opencode Palette**）。
2. 点任意主题色块，界面立即换色，多试几款找到最养眼的那套。

<h2 align="center"><sub>THEMES</sub><br>功能详解</h2>

<div align="center">

每个主题名字背后都有一段来历，38 款在设置面板里按色系分组、一搜即切。每款最核心的 7 种颜色 —— `背景 · 文字 · 主色 · 强调 · 错误 · 警告 · 成功` —— 定义在 `src/themes/`。

</div>

![theme stories](assets/theme-stories-zh.svg)

<div align="center">

排印独立于主题：作用到全部文字或仅代码、字号 11–18 px、6 种代码字体带实时预览。`system` 一键回到 DSH 原生外观，排印设置保留。面板跟着 DSH 界面语言走（中文 / English），切换即时跟随。

</div>

<h2 align="center"><sub>UPGRADE</sub><br>升级</h2>

```bash
dsh plugin --profile web update dsh-opencode-palette
# 需要钉回历史版本：
dsh plugin --profile web add dsh-opencode-palette@<版本>
```

<div align="center">

<details>
<summary>从 1.4.x 及更早版本升级</summary>

旧版本通过 postinstall 在 `~/.dsh/profiles/web/cordis.patch.yml` 里写过注册块。升级前请删除其中的 `opencode-palette` 注册块（bundle 装配后残留会导致重复注册），再执行上面的 `update`。

</details>

</div>

<h2 align="center"><sub>MORE</sub><br>作者的其他作品</h2>

<div align="center">

喜欢这个插件的话，这些可能你也用得上：

**[dsh-prompt](https://github.com/FeatherHunter/dsh-prompt)** —— 写 Prompt 卡壳的时候，里面有 24 条深度模板，点一下直接进输入框

**[dsh-mattpocock-skills-deck](https://github.com/FeatherHunter/dsh-mattpocock-skills-deck)** —— 想让 AI 不只是会聊天？25 个工程技能装好即用，一条安装 Prompt 的事

</div>

<h2 align="center"><sub>CONNECT</sub><br>反馈与联系</h2>

<div align="center">

遇到问题或有改进建议，欢迎直接 [提交 Issue](https://github.com/FeatherHunter/dsh-opencode-palette/issues)；也欢迎扫码添加作者飞书，备注 `dsh-opencode-palette`，一起交流。

<img src="assets/feishu-qr.png" alt="作者飞书二维码" width="260" />

</div>
