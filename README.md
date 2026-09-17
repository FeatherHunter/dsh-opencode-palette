<h1 align="center">🎨 dsh-opencode-palette</h1>

<div align="center">

**🌐 [中文](README.md) · [English](docs/README.en.md)**

**为长时间编程而生 —— 38 款护眼配色一键换上，眼睛舒服，码字开心。**

*Built for long coding sessions — 38 eye-friendly themes, one click.*

你的 ⭐ 是我夜空中最亮的星。

[![版本](https://img.shields.io/npm/v/dsh-opencode-palette?label=%E7%89%88%E6%9C%AC)](https://www.npmjs.com/package/dsh-opencode-palette)
[![下载量](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.npmjs.org%2Fdownloads%2Fpoint%2Flast-month%2Fdsh-opencode-palette&query=%24.downloads&label=%E4%B8%8B%E8%BD%BD%E9%87%8F&suffix=%2F%E6%9C%88&color=brightgreen)](https://www.npmjs.com/package/dsh-opencode-palette)
[![最近更新](https://img.shields.io/github/last-commit/FeatherHunter/dsh-opencode-palette?label=%E6%9C%80%E8%BF%91%E6%9B%B4%E6%96%B0&color=FE7D37)](https://github.com/FeatherHunter/dsh-opencode-palette/commits/main)
[![主题包](https://img.shields.io/badge/%E4%B8%BB%E9%A2%98%E5%8C%85-opencode%C2%B738-9D7CD8)](https://github.com/anomalyco/opencode)
[![期待你参与](https://img.shields.io/badge/%E6%9C%9F%E5%BE%85%E4%BD%A0%E5%8F%82%E4%B8%8E-brightgreen.svg)](https://github.com/FeatherHunter/dsh-opencode-palette/issues)

</div>

<!-- showcase:start -->
<h2 align="center"><sub>SHOWCASE</sub><br>真实效果</h2>

<div align="center">

每天盯屏幕十几个小时，眼睛难免发涩——换套温柔的配色，让眼睛歇一会儿。

opencode 的 37 套经典配色深受开发者喜爱，另有一个不碰颜色的原生外观：一键给整个 DSH 换上，深色护眼、浅色通透，白天黑夜各取所需。

**👇 装完重启后，主界面就是这个样子（opencode 主题）。**

<img src="showcase/overview-opencode-zh.png" width="640" alt="OpenCode 调色板 — 主界面概览（opencode 主题）" style="border:1px solid #30363d;border-radius:6px">

**👇 设置面板：38 款按色系分组，搜一下即切。**

<img src="showcase/opencode调色板设置页面-zh.png" width="640" alt="OpenCode 调色板 — 设置面板（按色系分组）" style="border:1px solid #30363d;border-radius:6px">

**👇 白天党放心：浅色主题同样完整覆盖。**

<img src="showcase/overview-tokyonight-zh.png" width="640" alt="OpenCode 调色板 — 浅色主题概览" style="border:1px solid #30363d;border-radius:6px">

</div>

<!-- showcase:end -->

<h2 align="center"><sub>INSTALL</sub><br>三步上手</h2>

```bash
# ① 还没装 DSH CLI 先装（已装跳过）
npm install -g @deepseek-ai/dsh

# ② 把插件装进你的 profile
dsh plugin --profile web add dsh-opencode-palette
```

**① 装。** 需要 DSH CLI，执行上面两行命令；装完重启 DSH（或刷新浏览器页面）即生效，**零配置**，默认启用官方 `opencode` 主题。

**② 打开面板。** 进入 **设置 → 插件 → OpenCode 调色板**。

**③ 点一个主题。** 点任意色块即时换色，多试几款找到最养眼的那套。

<h2 align="center"><sub>THEMES</sub><br>主题一览</h2>

<div align="center">

38 个入口在设置面板里按色系分组、一搜即切：其中 37 款忠实上游，另有一个只留排印的原生外观。每个名字背后都有一段来历，下图一次看全。

</div>

![theme stories](assets/theme-stories-zh.svg)

<h2 align="center"><sub>EXTENSIONS</sub><br>在 opencode 主题之上，我们加了什么</h2>

<div align="center">

主题颜色照抄上游的 37 款，我们加的功夫落在三件事上：**字顺眼、随时反悔、面板好找。**

- **字顺眼。** 排印是一个独立维度：作用到全部文字或仅代码、字号 11–18 px、代码字体随你挑，与颜色互不干扰，重启不丢。
- **随时反悔。** 原生外观一键回到 DSH 原生：不碰任何颜色，只留你的排印设置。
- **面板好找。** 38 个入口按色系分组、搜索即切，并跟随 DSH 的界面语言（中文 / English）。

</div>

<h2 align="center"><sub>UPGRADE</sub><br>升级</h2>

```bash
dsh plugin --profile web update dsh-opencode-palette
# 需要钉回历史版本：
dsh plugin --profile web add dsh-opencode-palette@<版本>
```

不想敲命令就用面板：打开「设置 → OpenCode 调色板」，标题行右侧有 **检查更新** 按钮。它点一下才联网；有新版本时就地变成「更新至 vX.Y.Z」，点开可直接升级，走不通还会给一条可复制的手工命令。装完记得重启 DSH——重启前面板顶部会一直挂着提醒横幅。

反馈问题时请附上日志：

<div align="center">

<details>
<summary>日志在哪、记了什么</summary>

- 目录：`<DSH_HOME>/logs/dsh-opencode-palette/`（`DSH_HOME` 默认 `~/.dsh`），按天一个 `YYYY-MM-DD.log`。
- 错误与告警**一直**记；信息与调试默认不记，要把 `~/.dsh/logs/log-switch-dsh-opencode-palette.json` 里的 `enabled` 改成 `true` 才记。
- 日志只记枚举与散列（电话名、结果、失败散列），不记命令原文与真实路径。

</details>

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

**[dsh-im-companion](https://github.com/FeatherHunter/dsh-im-companion)** —— 增强dsh-im插件和DSH工作区的能力，给你更优质的用户体验。

</div>

<h2 align="center"><sub>THANKS</sub><br>感谢贡献者</h2>

<div align="left">

感谢每一位提交 Issue、参与讨论的朋友，是你们让这个插件一点点变好。

[@the-beating-light-of-the-nail](https://github.com/the-beating-light-of-the-nail) — #3 收录进 DSH Meme Hub 换皮肤专区，附取色考据

[@xiSage](https://github.com/xiSage) — #11 要任意系统字体（已落地：点开即列本机字体）

[@Number444](https://github.com/Number444) — #12 要 Maple Mono NF CN 中英同宽（已落地）

PR 虚位以待：修 Bug、加主题、改顺文案都欢迎，下一个被点名的就是你。

</div>

<h2 align="center"><sub>CONNECT</sub><br>反馈与联系</h2>

<div align="center">

遇到问题或有改进建议，欢迎直接 [提交 Issue](https://github.com/FeatherHunter/dsh-opencode-palette/issues)；也欢迎扫码添加作者飞书，备注 `dsh-opencode-palette`，一起交流。

<img src="assets/feishu-qr.png" alt="作者飞书二维码" width="260" />

</div>
