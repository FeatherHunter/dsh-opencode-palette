# 🎨 dsh-opencode-palette

**🌐 [中文](../README.md) · [English](README.en.md)**

**The complete opencode palette for DeepSeek Harness — 34 official themes, one click.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../LICENSE)
[![opencode](https://img.shields.io/badge/themes-opencode%20v1.18.12-orange)](https://github.com/anomalyco/opencode)
[![tests](https://img.shields.io/badge/tests-20%2F20-green)]()

![hero](../assets/hero-en.svg)

## Install in one command

Requires the **DSH CLI** (DeepSeek Harness command-line tool). If you don't have it yet:

```bash
npm install -g @deepseek-ai/dsh
```

Then install the plugin into your profile:

```bash
dsh plugin --profile web add dsh-opencode-palette
```

That's it — **zero configuration**: this plugin uses DSH's official bundle mechanism — it ships its own `cordis.patch.yml` (declared via `dsh.bundle.patch`), so `dsh plugin add` automatically joins the package into the profile's `dsh.profile.bundles` layer stack, where the DSH loader assembles it at startup; `dsh plugin remove` removes it automatically. No manual file editing, and no pnpm build scripts (no postinstall, so pnpm v10 never blocks it). Restart DSH (or refresh the browser page) and the plugin is on, using the official `opencode` theme (deep black with orange / blue / violet).

> **Upgrading from 1.4.x or earlier**: old versions wrote a registration block into `~/.dsh/profiles/web/cordis.patch.yml` via postinstall. Before upgrading, delete the `opencode-palette` block from that file (a leftover would duplicate the bundle registration), then re-run `dsh plugin --profile web add dsh-opencode-palette`.

## What it does

DeepSeek Harness ships with one look. This plugin lets you dress the whole interface in any of the **34 official opencode themes** — `tokyonight`, `dracula`, `gruvbox`, `matrix`, `rose-pine`, `catppuccin ×3`, `solarized`, `synthwave84` …

- Every color comes from opencode's official theme JSON (v1.18.12) — what opencode ships is what you get.
- One click re-skins everything: backgrounds, buttons, borders, status colors, markdown, and code syntax highlighting.
- Your choice is remembered across restarts.
- The panel speaks your language — it follows the DSH interface language (中文 / English).

## Get started in 30 seconds

**Settings → Plugins → Opencode Palette** (in Chinese: **设置 → 插件 → OpenCode 调色板**):

![setup panel](../assets/setup-panel-en.svg)

Click any theme chip — the interface re-skins instantly:

![theme switch](../assets/theme-switch-en.svg)

## Features

### 34 themes and the stories behind their names

Every name has a story:

![theme stories](../assets/theme-stories-en.svg)

### 34 official themes, faithfully ported

Each theme shows its 7 core colors at a glance — `background · text · primary · accent · error · warning · success`:

![palette strips](../assets/palette-strips-en.svg)

All 34 at a glance:

![palette matrix](../assets/palette-matrix-en.svg)

### Typography, independent from the theme

- Body style: monospace (terminal) or regular (UI) — the opencode terminal look or a classic interface look.
- Font size: 11–18 px.
- Code font: 5 presets with live preview (JetBrains Mono, Cascadia Code, Fira Code, SF Mono, Consolas).

### `system` — back to default in one click

Restores DSH's native appearance whenever you want, while keeping your typography settings.

### Persisted per browser

Your theme and typography choices are stored locally and survive refresh and restart.

### Bilingual panel

The panel follows your DSH interface language automatically — switch the language in DSH and the panel follows instantly.

## Development

```bash
npm run sync    # fetch official theme JSONs from opencode (version-locked, checksummed)
npm test        # 20 tests: engine audit of all 34 themes + panel render (zh/en)
npm run build   # zero-dependency bundler -> package/ + dynamic client.js
npm run assets  # regenerate the SVG images in this README
```

Architecture: see [DESIGN.md](../DESIGN.md) — a data-driven three-stage pipeline, with `src/engine/map-dsh.mjs` as the single source of truth for the DSH mapping layer.

## Contributing

Good starting points: new upstream themes (run `npm run sync`), mapping refinements, copy polish, or more locale translations. Keep the engine pure (no DOM) so the tests stay green.

## License & credits

MIT © FeatherHunter. Theme definitions are vendored from [opencode](https://github.com/anomalyco/opencode) (MIT) and its upstream theme projects — see [THIRD_PARTY_NOTICES](../src/themes/THIRD_PARTY_NOTICES.md).