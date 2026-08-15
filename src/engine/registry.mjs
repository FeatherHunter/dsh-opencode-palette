// registry.mjs — 主题注册表：33 个静态主题（vendored JSON）+ system 特殊主题
// 数据由 scripts/sync-themes.mjs 从 opencode v1.18.12 官方 tag 同步（见 MANIFEST.json 指纹）
import aura from '../themes/aura.json' with { type: 'json' }
import ayu from '../themes/ayu.json' with { type: 'json' }
import carbonfox from '../themes/carbonfox.json' with { type: 'json' }
import catppuccin_frappe from '../themes/catppuccin-frappe.json' with { type: 'json' }
import catppuccin_macchiato from '../themes/catppuccin-macchiato.json' with { type: 'json' }
import catppuccin from '../themes/catppuccin.json' with { type: 'json' }
import cobalt2 from '../themes/cobalt2.json' with { type: 'json' }
import cursor from '../themes/cursor.json' with { type: 'json' }
import dracula from '../themes/dracula.json' with { type: 'json' }
import everforest from '../themes/everforest.json' with { type: 'json' }
import flexoki from '../themes/flexoki.json' with { type: 'json' }
import github from '../themes/github.json' with { type: 'json' }
import gruvbox from '../themes/gruvbox.json' with { type: 'json' }
import kanagawa from '../themes/kanagawa.json' with { type: 'json' }
import lucent_orng from '../themes/lucent-orng.json' with { type: 'json' }
import material from '../themes/material.json' with { type: 'json' }
import matrix from '../themes/matrix.json' with { type: 'json' }
import mercury from '../themes/mercury.json' with { type: 'json' }
import monokai from '../themes/monokai.json' with { type: 'json' }
import nightowl from '../themes/nightowl.json' with { type: 'json' }
import nord from '../themes/nord.json' with { type: 'json' }
import one_dark from '../themes/one-dark.json' with { type: 'json' }
import opencode from '../themes/opencode.json' with { type: 'json' }
import orng from '../themes/orng.json' with { type: 'json' }
import osaka_jade from '../themes/osaka-jade.json' with { type: 'json' }
import palenight from '../themes/palenight.json' with { type: 'json' }
import rosepine from '../themes/rosepine.json' with { type: 'json' }
import solarized from '../themes/solarized.json' with { type: 'json' }
import synthwave84 from '../themes/synthwave84.json' with { type: 'json' }
import tokyonight from '../themes/tokyonight.json' with { type: 'json' }
import vercel from '../themes/vercel.json' with { type: 'json' }
import vesper from '../themes/vesper.json' with { type: 'json' }
import zenburn from '../themes/zenburn.json' with { type: 'json' }

export const SYSTEM_THEME = 'system'

const THEMES = {
  "aura": aura,
  "ayu": ayu,
  "carbonfox": carbonfox,
  "catppuccin-frappe": catppuccin_frappe,
  "catppuccin-macchiato": catppuccin_macchiato,
  "catppuccin": catppuccin,
  "cobalt2": cobalt2,
  "cursor": cursor,
  "dracula": dracula,
  "everforest": everforest,
  "flexoki": flexoki,
  "github": github,
  "gruvbox": gruvbox,
  "kanagawa": kanagawa,
  "lucent-orng": lucent_orng,
  "material": material,
  "matrix": matrix,
  "mercury": mercury,
  "monokai": monokai,
  "nightowl": nightowl,
  "nord": nord,
  "one-dark": one_dark,
  "opencode": opencode,
  "orng": orng,
  "osaka-jade": osaka_jade,
  "palenight": palenight,
  "rosepine": rosepine,
  "solarized": solarized,
  "synthwave84": synthwave84,
  "tokyonight": tokyonight,
  "vercel": vercel,
  "vesper": vesper,
  "zenburn": zenburn,
}

// 字母序完整清单（含 system，与 opencode 选择器一致）
export function listThemes() {
  return Object.keys(THEMES).concat(SYSTEM_THEME).sort(function (a, b) { return a.localeCompare(b) })
}

export function getThemeJson(name) {
  return THEMES[name] || null
}

export function isSystem(name) {
  return name === SYSTEM_THEME
}

export function countStatic() {
  return Object.keys(THEMES).length
}