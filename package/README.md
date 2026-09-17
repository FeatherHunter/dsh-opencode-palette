<h1 align="center">🎨 dsh-opencode-palette</h1>

<div align="center">

**🌐 [中文](../README.md) · [English](README.en.md)**

**Built for long coding sessions — 38 eye-friendly themes, one click.**

*为长时间编程而生 —— 38 款护眼配色一键换上，眼睛舒服，码字开心。*

Your ⭐ is the brightest star in my night sky.

[![npm](https://img.shields.io/npm/v/dsh-opencode-palette?label=npm)](https://www.npmjs.com/package/dsh-opencode-palette)
[![downloads](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.npmjs.org%2Fdownloads%2Fpoint%2Flast-month%2Fdsh-opencode-palette&query=%24.downloads&label=downloads&suffix=%2Fmo&color=brightgreen)](https://www.npmjs.com/package/dsh-opencode-palette)
[![last-commit](https://img.shields.io/github/last-commit/FeatherHunter/dsh-opencode-palette?label=last-commit&color=FE7D37)](https://github.com/FeatherHunter/dsh-opencode-palette/commits/main)
[![themes](https://img.shields.io/badge/themes-opencode%C2%B738-9D7CD8)](https://github.com/anomalyco/opencode)
[![PRs welcome](https://img.shields.io/badge/PRs%20welcome-brightgreen.svg)](https://github.com/FeatherHunter/dsh-opencode-palette/issues)

</div>


<h2 align="center"><sub>INSTALL</sub><br>Get started in three steps</h2>

```bash
# 1. install the DSH CLI first (skip if you have it)
npm install -g @deepseek-ai/dsh

# 2. add the plugin to your profile
dsh plugin --profile web add dsh-opencode-palette
```

**① Install.** Requires the DSH CLI — run the two commands above, then restart DSH (or refresh the browser page) and it just works, **zero configuration**, with the official `opencode` theme on by default.

**② Open the panel.** Go to **Settings → Plugins → Opencode Palette**.

**③ Pick a theme.** Click any chip to re-skin instantly — try a few and find the kindest one.

<h2 align="center"><sub>THEMES</sub><br>Themes</h2>

<div align="center">

38 entries live in the settings panel, grouped by color family and switchable with a search: 37 stay faithful to upstream, plus one native look that keeps only your typography. Every name has a story behind it — the picture below shows them all at once.

</div>

![theme stories](../assets/theme-stories-en.svg)

<h2 align="center"><sub>EXTENSIONS</sub><br>What we add on top of the opencode themes</h2>

<div align="center">

Colors stay faithful to the 37 upstream themes; all our work goes into three things: **type that reads well, an easy way back, a panel you can find.**

- **Type that reads well.** Typography is its own dimension: apply it to all text or code only, 11–18 px, your pick of code font — orthogonal to color, kept across restarts.
- **An easy way back.** The native look restores DSH in one click: it overrides no colors, it only keeps your typography setup.
- **A panel you can find.** 38 entries grouped by color family, searchable, and following your DSH interface language (中文 / English).

</div>

<h2 align="center"><sub>UPGRADE</sub><br>Upgrade</h2>

```bash
dsh plugin --profile web update dsh-opencode-palette
# pin to an older version:
dsh plugin --profile web add dsh-opencode-palette@<version>
```

Prefer a button? Open Settings → Opencode Palette: there is a **Check for updates** button at the right of the title row. It only goes online when you click it; when a newer version exists it turns into “Update to vX.Y.Z” right there — one click upgrades, and if that cannot go through it hands you a copy-paste command instead. Then restart DSH to apply: until you do, a reminder banner stays at the top of the panel.

Attach the logs when filing an issue:

<div align="center">

<details>
<summary>Where the logs are, what they hold</summary>

- Directory: `<DSH_HOME>/logs/dsh-opencode-palette/` (`DSH_HOME` defaults to `~/.dsh`), one `YYYY-MM-DD.log` per day.
- Errors and warnings are **always** written; info and debug are off until you set `enabled` to `true` in `~/.dsh/logs/log-switch-dsh-opencode-palette.json`.
- Lines carry enums and hashes only (phone names, outcomes, failure hashes) — never command text or real paths.

</details>

<details>
<summary>Upgrading from 1.4.x or earlier</summary>

Old versions wrote a registration block into `~/.dsh/profiles/web/cordis.patch.yml` via postinstall. Delete the `opencode-palette` block from that file first (a leftover would duplicate the bundle registration), then run `update` above.

</details>

</div>

<h2 align="center"><sub>MORE</sub><br>More from the author</h2>

<div align="center">

If you like this plugin, you might also like:

**[dsh-prompt](https://github.com/FeatherHunter/dsh-prompt)** — When you get stuck writing a prompt, it has 24 deep templates — one click, straight into your input box

**[dsh-mattpocock-skills-deck](https://github.com/FeatherHunter/dsh-mattpocock-skills-deck)** — Want your AI to do more than chat? 25 engineering skills, installed with a single prompt

**[dsh-im-companion](https://github.com/FeatherHunter/dsh-im-companion)** — Supercharge the dsh-im plugin and DSH workspaces for a better experience.

</div>

<h2 align="center"><sub>THANKS</sub><br>Contributors</h2>

<div align="left">

Thanks to everyone who filed issues and joined discussions — you make this plugin better bit by bit.

[@the-beating-light-of-the-nail](https://github.com/the-beating-light-of-the-nail) — #3 listed this plugin in DSH Meme Hub with palette notes

[@xiSage](https://github.com/xiSage) — #11 asked for any system font (shipped)

[@Number444](https://github.com/Number444) — #12 asked for Maple Mono NF CN 2:1 CJK (shipped)

PRs wanted: fix, theme, or words — open a PR and you'll be named next.

</div>

<h2 align="center"><sub>CONNECT</sub><br>Feedback & Contact</h2>

<div align="center">

Found a bug or have an idea? Please [open an issue](https://github.com/FeatherHunter/dsh-opencode-palette/issues). You can also scan the QR code to add the author on Feishu (mention `dsh-opencode-palette`).

<img src="../assets/feishu-qr.png" alt="Author's Feishu QR code" width="260" />

</div>
