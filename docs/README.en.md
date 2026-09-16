<h1 align="center">🎨 dsh-opencode-palette</h1>

<div align="center">

**🌐 [中文](../README.md) · [English](README.en.md)**

**Built for long coding sessions — 38 eye-friendly themes, one click. Easier on the eyes, nicer to code in.**

*为长时间编程而生 —— 38 款护眼配色一键换上，眼睛舒服，码字开心。*

Your ⭐ is the brightest star in my night sky.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../LICENSE)
[![npm](https://img.shields.io/npm/v/dsh-opencode-palette)](https://www.npmjs.com/package/dsh-opencode-palette)
[![themes](https://img.shields.io/badge/themes-38%20opencode-orange)](https://github.com/anomalyco/opencode)
[![tests](https://img.shields.io/badge/tests-38%2F38-green)]()

</div>

<!-- showcase:start -->
<h2 align="center"><sub>SHOWCASE</sub><br>Real Look</h2>

<div align="center">

Staring at a screen ten-plus hours a day, tired eyes are inevitable — a gentler palette lets them rest. opencode's 38 classic themes are loved by developers everywhere: one click dresses your whole DSH, dark themes for the night, light themes for the day.

**👇 This is what it looks like after install (opencode theme).**

<img src="../showcase/opencode调色板opencode风格主页面-en.png" width="640" alt="Opencode Palette — overview (opencode theme, 34 themes)" style="border:1px solid #30363d;border-radius:6px">

**👇 Settings: 38 themes grouped by color family, search and switch.**

<img src="../showcase/settings-opencode-en.png" width="640" alt="Opencode Palette — settings (opencode theme, 34 themes)" style="border:1px solid #30363d;border-radius:6px">

**👇 More than one skin: star themes like tokyonight included.**

<img src="../showcase/overview-tokyonight-en.png" width="640" alt="Opencode Palette — overview (tokyonight theme, 34 themes)" style="border:1px solid #30363d;border-radius:6px">

</div>

<!-- showcase:end -->

<h2 align="center"><sub>INSTALL</sub><br>Install in one command</h2>

<div align="center">

Requires the **DSH CLI**. **Zero configuration** — restart DSH (or refresh the browser page) and it just works, with the official `opencode` theme on by default.

</div>

```bash
# 1. install the DSH CLI first (skip if you have it)
npm install -g @deepseek-ai/dsh

# 2. add the plugin to your profile
dsh plugin --profile web add dsh-opencode-palette
```

<h2 align="center"><sub>GUIDE</sub><br>Get started in 30 seconds</h2>

1. Open **Settings → Plugins → Opencode Palette** (in Chinese: **设置 → 插件 → OpenCode 调色板**).
2. Click any theme chip — the interface re-skins instantly. Try a few and find the kindest one for your eyes.

<h2 align="center"><sub>THEMES</sub><br>Features</h2>

<div align="center">

Every theme name has a story behind it, and all 38 live in the settings panel grouped by color family — search and switch. Each theme's 7 core colors — `background · text · primary · accent · error · warning · success` — are defined in `src/themes/`.

</div>

![theme stories](../assets/theme-stories-en.svg)

<div align="center">

Typography stays independent from the theme: applied to all text or code only, 11–18 px, 7 code fonts with live preview. `system` takes you back to DSH's native look in one click while keeping your typography. The panel follows your DSH interface language (中文 / English) instantly.

</div>

<h2 align="center"><sub>EXTENSIONS</sub><br>What we add on top of the opencode themes</h2>

<div align="center">

The theme data itself stays faithful to upstream (37 theme JSONs + `system`, synced by `npm run sync`). Everything we add lives in three layers — **typography, adaptation, panel** — and never rewrites upstream colors.

| Extension | What it does | Upstream opencode |
| --- | --- | --- |
| **Typography as its own dimension** | Font, size 11–18 px and scope (all text / code only) are independent of color and persist across restarts | Themes define colors only |
| **A CJK-native font option** | Adds `Maple Mono NF CN`: English and Chinese from one typeface at a 2:1 width ratio, so mixed-language code blocks and tables stop drifting. Pick it once the font is installed locally; a missing font is greyed out and marked `missing` | None |
| **Light & dark host** | The injected layer covers both `body` and `body[data-ds-dark-theme]`; the panel leaves no dark leftovers on a light host | Built for terminals — no web light/dark duality |
| **`system` (default)** | One click back to DSH's native look: overrides no color tokens and keeps your typography | `system` = follow the terminal's 16 colors |
| **Panel experience** | 38 themes grouped by color family, searchable, live preview; bilingual, following your DSH interface language | Theme files only |

</div>

<h2 align="center"><sub>UPGRADE</sub><br>Upgrade</h2>

```bash
dsh plugin --profile web update dsh-opencode-palette
# pin to an older version:
dsh plugin --profile web add dsh-opencode-palette@<version>
```

Prefer a button? Open Settings → Opencode Palette: there is a **Check for updates** button at the right of the title row.

- It only goes online when you click it — never in the background. When a newer version exists, the button turns into “Update to vX.Y.Z” and opens an upgrade dialog with an **Update now** action.
- If the automatic install cannot go through, the dialog hands you a copy-paste command (same as the `dsh plugin ... add --save-exact` above).
- **Restart DSH for the new version to take effect**: the new files are already on disk, but the running process keeps the old ones. Until you restart, the panel shows a persistent “vX.Y.Z installed — restart DSH to apply” banner.

Diagnostic logs (attach them when filing an issue):

- Directory: `<DSH_HOME>/logs/dsh-opencode-palette/` (`DSH_HOME` defaults to `~/.dsh`), one `YYYY-MM-DD.log` per day.
- Errors and warnings are always written; info and debug are off until you set `enabled` to `true` in `~/.dsh/logs/log-switch-dsh-opencode-palette.json`.
- Lines carry enums and hashes only (phone names, outcomes, failure hashes) — never command text or real paths.

<div align="center">

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

</div>

<h2 align="center"><sub>CONNECT</sub><br>Feedback & Contact</h2>

<div align="center">

Found a bug or have an idea? Please [open an issue](https://github.com/FeatherHunter/dsh-opencode-palette/issues). You can also scan the QR code to add the author on Feishu (mention `dsh-opencode-palette`).

<img src="../assets/feishu-qr.png" alt="Author's Feishu QR code" width="260" />

</div>
