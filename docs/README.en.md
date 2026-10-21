<h1 align="center">🎨 dsh-opencode-palette</h1>

<div align="center">

**🌐 [中文](../README.md) · [English](README.en.md)**

**38 themes for DSH, one click.**

*38 款配色，一键给 DSH 换装。*

Your ⭐ is the brightest star in my night sky.

[![npm](https://img.shields.io/npm/v/dsh-opencode-palette?label=npm)](https://www.npmjs.com/package/dsh-opencode-palette)
[![downloads](https://img.shields.io/npm/dt/dsh-opencode-palette?label=downloads&color=red)](https://www.npmjs.com/package/dsh-opencode-palette)
[![last-commit](https://img.shields.io/github/last-commit/FeatherHunter/dsh-opencode-palette?label=last-commit&color=FE7D37)](https://github.com/FeatherHunter/dsh-opencode-palette/commits/main)
[![themes](https://img.shields.io/badge/themes-OpenCode%C2%B738-9D7CD8)](https://github.com/anomalyco/opencode)
[![Issues welcome](https://img.shields.io/badge/Issues%20welcome-brightgreen.svg)](https://github.com/FeatherHunter/dsh-opencode-palette/issues)

</div>

<!-- showcase:start -->
<h2 align="center"><sub>SHOWCASE</sub><br>Real Look</h2>

<div align="center">

---

This plugin exists to make your DSH experience better 💗

| Main screen (opencode theme) | Settings panel (38 themes by color family) |
|---|---|
| ![OpenCode Palette — overview (opencode theme)](../showcase/opencode调色板opencode风格主页面-en.png) | ![OpenCode Palette — settings panel (grouped by color family)](../showcase/settings-opencode-en.png) |

| Custom editor (37 slots) | IP theme capsule: 原神 Genshin (light) |
|---|---|
| ![OpenCode Palette — custom editor (37 slots)](../assets/自定义编辑器.png) | ![OpenCode Palette — IP theme capsule: 原神 Genshin](../assets/原神.png) |

| IP theme capsule: 库洛米 Kuromi (light) | IP theme capsule: 哆啦A梦 Doraemon (light) |
|---|---|
| ![OpenCode Palette — IP theme capsule: 库洛米 Kuromi](../assets/库洛米.png) | ![OpenCode Palette — IP theme capsule: 哆啦A梦 Doraemon](../assets/哆啦A梦.png) |

| IP theme capsule: 哈利波特 Harry Potter (dark) | IP theme capsule: 赛博朋克2077 Cyberpunk 2077 (dark) |
|---|---|
| ![OpenCode Palette — IP theme capsule: 哈利波特 Harry Potter](../assets/哈利波特.png) | ![OpenCode Palette — IP theme capsule: 赛博朋克2077 Cyberpunk 2077](../assets/赛博朋克2077.png) |

| Classic theme: 德古拉 Dracula (dark) | IP theme capsule: 龙珠 Dragon Ball (light) |
|---|---|
| ![OpenCode Palette — classic theme: 德古拉 Dracula](../assets/德古拉.png) | ![OpenCode Palette — IP theme capsule: 龙珠 Dragon Ball](../assets/龙珠.png) |

</div>

<!-- showcase:end -->

<h2 align="center"><sub>INSTALL</sub><br>Get started in three steps</h2>

```bash
# 1. install the DSH CLI first (skip if you have it)
npm install -g @deepseek-ai/dsh

# 2. add the plugin to your profile
dsh plugin --profile web add dsh-opencode-palette

# 3. restart DSH once it's installed (or refresh the browser page)
```

**① Install the plugin.**

**② Open “OpenCode Palette”.** Settings → Plugins → OpenCode Palette

**③ Pick a theme you like.**

<h2 align="center"><sub>EXTENSIONS</sub><br>What the OpenCode themes come with</h2>

| Feature | Details |
|---|---|
| **IP theme capsules** | 25 preinstalled: 原神 Genshin, 库洛米 Kuromi, 哆啦A梦 Doraemon, 哈利波特 Harry Potter, 赛博朋克2077 Cyberpunk 2077, 宝可梦 Pokémon, 龙珠 Dragon Ball… ready out of the box — pick one you like and use it as the base for your colors. |
| **Build your own capsule** | 37 slots, one at a time, with a miniature DSH preview on the right — click an element in the preview and the matching row on the left scrolls to the middle and opens the color picker; hover a slot on the left and that element lights up in the preview. Saved capsules land in `<DSH_HOME>/opencode-palette/custom-themes/`. |
| **Fonts and size** | Fonts sit apart from color: Mono (terminal look) turns the whole interface monospaced, Regular (interface look) applies monospace to code blocks only; size 11–24 px, and the code font can be picked from the fonts installed on this machine. |

<h2 align="center"><sub>UPGRADE</sub><br>Upgrade</h2>

```bash
# upgrade to the latest (currently 2.1.9): one command per profile — web and desktop
dsh plugin --profile web update dsh-opencode-palette
dsh plugin --profile desktop update dsh-opencode-palette
# pin a specific version (swap the version number for the one you want):
dsh plugin --profile web add dsh-opencode-palette@2.1.9
dsh plugin --profile desktop add dsh-opencode-palette@2.1.9
```

Settings → Plugins → OpenCode Palette → **Check for updates**

<h2 align="center"><sub>MORE</sub><br>More from the author</h2>

<div align="center">

If you like this plugin, these might be useful too:

**[dsh-prompt](https://github.com/FeatherHunter/dsh-prompt)** — The boilerplate prompts you repeat over and over, saved as custom templates and injected in one click — no more effort spent.

**[dsh-mattpocock-skills-deck](https://github.com/FeatherHunter/dsh-mattpocock-skills-deck)** — The whole mattpocock/skills set (nearly 300k stars) preinstalled — 27 skills, ready as soon as it's installed.

**[dsh-im-companion](https://github.com/FeatherHunter/dsh-im-companion)** — Adds the ideas of an “assistant” and a “home” to dsh-im.

</div>

<h2 align="center"><sub>THANKS</sub><br>Contributors</h2>

<div align="left">

[@oopsdoes](https://github.com/oopsdoes) — #46 proposed light-mode following for opaque themes (the half #45 deferred) 🌹; #55 caught follow-system persisting as dark 🌹

[@gitwch1](https://github.com/gitwch1) — #73 found no repro on a fresh install, suggesting a missed DSH restart or a second theme plugin double-overriding 🌹

[@anci3ntr0ck](https://github.com/anci3ntr0ck) — #73 reported diff rows unreadable across most themes: tints sitting on the text, Nord a solid block 🌹

[@SRKBob](https://github.com/SRKBob) — #43 found the whites too harsh and asked for a softer palette 🌹

[@anupamme](https://github.com/anupamme) — #32 flagged a missing check on theme downloads 🌹

[@Number444](https://github.com/Number444) — #12 asked for Maple Mono NF CN 2:1 CJK 🌹

[@xiSage](https://github.com/xiSage) — #11 asked for any system font; the panel now lists your local fonts 🌹

[@the-beating-light-of-the-nail](https://github.com/the-beating-light-of-the-nail) — #3 listed this plugin in DSH Meme Hub with palette notes 🌹

</div>

<h2 align="center"><sub>CONNECT</sub><br>Feedback & Contact</h2>

<div align="center">

👏Welcome [PRs](https://github.com/FeatherHunter/dsh-opencode-palette/pulls) and [issues](https://github.com/FeatherHunter/dsh-opencode-palette/issues). A single spark can start a prairie fire 🔥. Any suggestion, opinion, idea or rant — come join the group and talk.

<img src="../assets/feishu-qr.png" alt="DSH plugin community group QR code" width="260" />

</div>

<div align="center">

![Star history chart: total stars on the left axis, daily new stars on the right axis](https://raw.githubusercontent.com/FeatherHunter/dsh-opencode-palette/main/docs/star-history.svg?v=202610210816)

</div>
