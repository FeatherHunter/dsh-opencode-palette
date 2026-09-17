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

排印独立于主题：作用到全部文字或仅代码、字号 11–18 px、代码字体带实时预览。字体列表 = 7 款常用预设 + **本机已装的字体**（点开下拉时按需读取，等宽置顶、可搜索，非等宽字体也能选）；读不到本机清单时只列预设并给一句提示，控件不会变空。`system` 一键回到 DSH 原生外观，排印设置保留。面板跟着 DSH 界面语言走（中文 / English），切换即时跟随。

</div>

<h2 align="center"><sub>EXTENSIONS</sub><br>在 opencode 主题之上，我们加了什么</h2>

<div align="center">

主题数据本身忠实上游（37 个主题 JSON + `system`，`npm run sync` 一键同步），扩展只加在**排印、适配、面板**三层，不改上游颜色。

| 扩展 | 说明 | 上游 opencode |
| --- | --- | --- |
| **排印维度** | 字体、字号 11–18 px、作用范围（全部文字 / 仅代码）是独立维度，与颜色正交，重启不丢 | 主题只定义颜色 |
| **本机字体进列表** | 点开「代码字体」下拉时读一次本机字体清单（浏览器 `queryLocalFonts`，会请求一次授权；桌面版不弹窗），去重后等宽置顶、可搜索。选中的族名安全引号包裹后排在回退栈首位，缺字仍落回随包 OFL 字体与中文回退。读不到清单（平台不支持 / 未授权 / 页面不可见）只列 7 款预设并提示，不出现空下拉 | 无 |
| **中英同字体字体档** | 内置 `Maple Mono NF CN` 预设：中英文同一款字体、中英宽度 2:1，代码块与表格里的中英混排不再错位。本机安装后即可选用，未装则灰显标注「本机未装」 | 无 |
| **宿主明暗双态** | 注入层同时覆盖 `body` 与 `body[data-ds-dark-theme]`，面板与芯片在浅色宿主下不留深色残留 | 面向终端，无 Web 明暗双态 |
| **`system`（默认）** | 一键回 DSH 原生外观：不覆盖任何颜色 token，只保留你的排印设置 | `system` = 跟随终端 16 色 |
| **面板体验** | 38 款按色系分组、搜索、实时预览；中英双语跟随 DSH 界面语言 | 只有主题文件 |

</div>

<h2 align="center"><sub>UPGRADE</sub><br>升级</h2>

```bash
dsh plugin --profile web update dsh-opencode-palette
# 需要钉回历史版本：
dsh plugin --profile web add dsh-opencode-palette@<版本>
```

不想敲命令就用面板：打开「设置 → opencode调色板」，标题行右侧有 **检查更新** 按钮。

- 点一下才联网（平时不会偷偷联网）；有新版本按钮会变成「更新至 vX.Y.Z」并弹出升级窗，里面能直接点 **立即升级**。
- 自动升级没成功时，窗里会给一条可复制的手工命令（等价于上面的 `dsh plugin ... add --save-exact`），复制到终端执行即可。
- **装完要重启 DSH 才生效**：新版已经写到磁盘，但正在跑的进程用的还是旧版。重启前面板顶部会一直挂着「新版 vX.Y.Z 已装好，重启 DSH 后生效」。

排障日志（想反馈问题时可带上）：

- 目录：`<DSH_HOME>/logs/dsh-opencode-palette/`（`DSH_HOME` 默认 `~/.dsh`），按天一个 `YYYY-MM-DD.log`。
- 错误与告警**一直**记；信息与调试默认不记，要把 `~/.dsh/logs/log-switch-dsh-opencode-palette.json` 里的 `enabled` 改成 `true` 才记。
- 日志只记枚举与散列（电话名、结果、失败散列），不记命令原文与真实路径。

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
