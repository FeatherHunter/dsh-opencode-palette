# 🎨 dsh-opencode-palette

**The complete opencode palette for DeepSeek Harness — 34 official themes, one click.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![opencode](https://img.shields.io/badge/themes-opencode%20v1.18.12-orange)](https://github.com/anomalyco/opencode)
[![tests](https://img.shields.io/badge/tests-18%2F18-green)]()

Make **DeepSeek Harness** look like **opencode** — `tokyonight`, `dracula`, `gruvbox`, `matrix`, `rose-pine`, `catppuccin ×3`, `solarized`, `synthwave84` … **all 34 official themes**, faithfully ported, switchable in one click from the settings panel.

![palette matrix](assets/palette-matrix.svg)

## Why you'll love it

- 🎯 **34 official opencode themes** — every color is *resolved* from opencode's official theme JSON (v1.18.12), not an eyeballed approximation. What opencode ships is what you get.
- ⚡ **One-click switching** — instantly re-skins the whole UI: backgrounds, surfaces, borders, buttons, status colors, markdown, and code syntax highlighting (shiki tokens).
- 💾 **Persisted** — your choice survives refresh and restart (per browser, `localStorage`).
- 🅰️ **Typing is independent from theming** — body style (monospace / regular), font size (11–18 px), and 5 code font presets are tuned separately from the color theme.
- 🔄 **`system` = back to default** — one click restores DSH's native look while keeping your typography.
- 🧱 **Zero runtime dependencies · MIT licensed · 18 engine tests** — a data-driven pipeline (theme JSON → color resolver → DSH adapter), single source of truth for the DSH mapping layer.

## Gallery — every theme, decomposed

![palette strips](assets/palette-strips.svg)

Each row shows the 7 core semantic colors — `background · text · primary · accent · error · warning · success` — resolved from the official opencode theme JSONs.

## Installation

Requires DSH (DeepSeek Harness) with the web client. Two steps, one time:

```bash
# 1. Install the package into your profile
npx --yes @deepseek-ai/dsh plugin --profile web add dsh-opencode-palette

# 2. Register it in the profile patch (no restart needed, hot-reloaded)
#    append to ~/.dsh/profiles/web/cordis.patch.yml:
#    - insert:
#        - id: opencode-palette
#          name: 'dsh-opencode-palette'
```

Refresh the browser page — done. The plugin auto-enables with the official `opencode` theme (deep black + orange/blue/violet).

## Usage

1. Open **Settings → Plugins → Opencode Palette**.
2. Pick a theme from the color-family grouped grid (searchable) — it applies instantly.
3. Tune typography above the grid: body style, font size, code font.
4. Toggle the whole skin on/off with the switch.

Power users can drive it from the console: `window.__opencodePalette` exposes `getState`, `setTheme(name)`, `toggle()`, `list()`, `previews()`.

## Migrating from dsh-opencode-tui-theme

Old users of `dsh-opencode-tui-theme`: remove its entry from `cordis.patch.yml`, run `dsh plugin --profile web remove dsh-opencode-tui-theme`, then install this package as above. Your previously selected theme is migrated automatically.

## Development

```bash
npm run sync    # fetch official theme JSONs from opencode (version-locked, checksummed)
npm test        # 18 engine tests: full resolution audit of all 34 themes, grouping, determinism
npm run build   # zero-dependency bundler -> package/ + dynamic client.js
npm run assets  # regenerate the SVG showcase images above
```

Architecture: see [DESIGN.md](DESIGN.md) — a data-driven three-stage pipeline, with `src/engine/map-dsh.mjs` as the single source of truth for the DSH mapping layer.

## Contributing

PRs welcome! Good starting points: new upstream themes (run `npm run sync`), mapping refinements, or copy polish. Keep the engine pure (no DOM) so tests stay green.

## License & credits

MIT © FeatherHunter.

Theme definitions are vendored from [opencode](https://github.com/anomalyco/opencode) (MIT) and its upstream theme projects — see [THIRD_PARTY_NOTICES](src/themes/THIRD_PARTY_NOTICES.md).

---

**中文**：📖 [README.zh-CN.md](docs/README.zh-CN.md)