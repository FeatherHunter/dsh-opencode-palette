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

**👇 另一款主题的观感。**

<img src="showcase/overview-github-light-zh.png" width="640" alt="OpenCode 调色板 — 主界面概览（GitHub 主题）" style="border:1px solid #30363d;border-radius:6px">

</div>

<!-- showcase:end -->

<h2 align="center"><sub>INSTALL</sub><br>三步上手</h2>

```bash
# ① 还没装 DSH CLI 先装（已装跳过）
npm install -g @deepseek-ai/dsh

# ② 把插件装进你的 profile
dsh plugin --profile web add dsh-opencode-palette
```

**① 安装好本插件。** 需要有 DSH CLI（上面前两行，已经装了跳到第二段命令）。跑完重启 DSH —— 重启后插件才被加载，这时它还不会改变任何颜色。

**② 打开「opencode调色板」。** 设置 → 插件 → opencode调色板

**③ 挑选喜爱的主题。**

<h2 align="center"><sub>THEMES</sub><br>主题</h2>

38 个入口按色系分组，一搜即切。下图每一格都是一种配色。

![theme stories](assets/theme-stories-zh.svg)

<h2 align="center"><sub>EXTENSIONS</sub><br>opencode 主题之外提供的功能</h2>

**丰富的字体。** 排印是独立维度：作用到全部文字或仅代码、字号 11–18 px、代码字体随你挑，与颜色互不干扰，重启不丢。

**面板好找。** 38 个入口按色系分组、搜索即切，并跟随 DSH 的界面语言（中文 / English）。

<h2 align="center"><sub>UPGRADE</sub><br>升级</h2>

```bash
dsh plugin --profile web update dsh-opencode-palette
# 需要钉回历史版本：
dsh plugin --profile web add dsh-opencode-palette@<版本>
```

不想敲命令就点面板：「设置 → 插件 → opencode调色板」，标题行右侧的 **检查更新** 点一下才联网；有新版本按钮就地变成「更新至 vX.Y.Z」，点开即升级。重启 DSH 后生效——重启前面板顶部一直挂着横幅提醒。

<h2 align="center"><sub>MORE</sub><br>作者的其他作品</h2>

<div align="center">

喜欢这个插件的话，这些可能你也用得上：

**[dsh-prompt](https://github.com/FeatherHunter/dsh-prompt)** —— 写 Prompt 卡壳的时候，里面有 24 条深度模板，点一下直接进输入框

**[dsh-mattpocock-skills-deck](https://github.com/FeatherHunter/dsh-mattpocock-skills-deck)** —— 想让 AI 不只是会聊天？25 个工程技能装好即用，一条安装 Prompt 的事

**[dsh-im-companion](https://github.com/FeatherHunter/dsh-im-companion)** —— 增强dsh-im插件和DSH工作区的能力，给你更优质的用户体验。

</div>

<h2 align="center"><sub>THANKS</sub><br>感谢贡献者</h2>

<div align="left">

提交一个 Issue，就记一个 🌹 —— 下面这些需求都已经做出来了。

[@the-beating-light-of-the-nail](https://github.com/the-beating-light-of-the-nail) — #3 收录进 DSH Meme Hub 换皮肤专区，附取色考据 🌹

[@xiSage](https://github.com/xiSage) — #11 要任意系统字体，点开即列本机字体 🌹

[@Number444](https://github.com/Number444) — #12 要 Maple Mono NF CN 中英同宽 🌹

[@anupamme](https://github.com/anupamme) — #32 指出主题下载缺一道校验 🌹

</div>

<h2 align="center"><sub>CONNECT</sub><br>反馈与联系</h2>

<div align="center">

遇到问题或有改进建议，欢迎直接 [提交 Issue](https://github.com/FeatherHunter/dsh-opencode-palette/issues)；也欢迎扫码添加作者飞书，备注 `dsh-opencode-palette`，一起交流。

<img src="assets/feishu-qr.png" alt="作者飞书二维码" width="260" />

</div>
