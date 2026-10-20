// validate.ts — 用仓库自己的引擎复算 hello-kitty 预置的 38 硬对 + 15 UI 对 + IP 设计规范。
// 口径与 docs/theme-audit/criteria.md 一致；与 scripts/audit-themes.ts 同源（引擎层）。
//
// 跑法：node prototypes/hello-kitty-extraction/validate.ts
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { contrastRatio, ensureDiffContrast, relativeLuminance, withAlpha, blendOntoBase } from '../../src/engine/resolve.ts'
import { COLOR_SLOTS } from '../../src/engine/map-dsh.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const PRESET = join(HERE, '..', '..', 'src', 'custom-presets', 'hello-kitty.json')
const PALETTE = join(HERE, 'palette.json')

const preset = JSON.parse(readFileSync(PRESET, 'utf8')) as { colors: Record<string, string> }
const pal = JSON.parse(readFileSync(PALETTE, 'utf8')) as { colors: Record<string, string> }
const seed = preset.colors

// 槽位齐全性（仓库 ip-presets.test.ts 同样要求 37 槽全 hex）
const HEX = /^#[0-9a-fA-F]{6}$/
const missing = COLOR_SLOTS.filter((s) => !seed[s.key] || !HEX.test(seed[s.key]))
if (missing.length) {
  console.error('缺槽或非 hex：' + missing.map((m) => m.key).join(', '))
  process.exit(1)
}
if (Object.keys(seed).length !== 37) {
  console.error('槽位数不是 37：' + Object.keys(seed).length)
  process.exit(1)
}

// 有效色板：与引擎同源（补 5 扩展槽 + 浅色 diff 修复）
const norm: Record<string, string> = Object.assign({}, seed)
if (!norm.sidebarBg) norm.sidebarBg = norm.background
for (const k of ['bubbleBg', 'inputBg', 'codeBlockBg']) if (!norm[k]) norm[k] = norm.backgroundPanel
if (!norm.codeHeaderBg) norm.codeHeaderBg = norm.backgroundElement
const eff = ensureDiffContrast(norm as never, false)

const SURFACES = ['background', 'backgroundPanel', 'backgroundElement', 'sidebarBg', 'bubbleBg', 'inputBg', 'codeBlockBg', 'codeHeaderBg'] as const
const MUTED = ['background', 'backgroundPanel', 'backgroundElement'] as const
const MD = ['markdownHeading', 'markdownLink', 'markdownStrong', 'markdownEmph', 'markdownBlockQuote', 'markdownCode'] as const
const SYNTAX = ['syntaxComment', 'syntaxKeyword', 'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString', 'syntaxOperator'] as const
const BRAND = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const

// 表面合成：background→画布白；其余→background；codeHeaderBg→codeBlockBg
const surf: Record<string, string> = {}
surf.background = blendOntoBase(eff.background, '#FFFFFF')
surf.backgroundPanel = blendOntoBase(eff.backgroundPanel, surf.background)
surf.backgroundElement = blendOntoBase(eff.backgroundElement, surf.background)
for (const k of ['sidebarBg', 'bubbleBg', 'inputBg'] as const) surf[k] = blendOntoBase(eff[k], surf.background)
surf.codeBlockBg = blendOntoBase(eff.codeBlockBg, surf.background)
surf.codeHeaderBg = blendOntoBase(eff.codeHeaderBg, surf.codeBlockBg)

let hardFails = 0
let uiFails = 0
let hardTotal = 0
let uiTotal = 0
const rows: string[] = []

function check(code: string, fg: string, bg: string, need: number, cls: 'hard' | 'ui') {
  const r = contrastRatio(fg, bg)
  const ok = r >= need
  if (cls === 'hard') { hardTotal++; if (!ok) hardFails++ } else { uiTotal++; if (!ok) uiFails++ }
  rows.push('  ' + (ok ? 'OK  ' : 'FAIL') + '  ' + code.padEnd(36) + r.toFixed(2) + ' : 1   (需 ' + need + ')')
}

for (const s of SURFACES) check('text@' + s, seed.text, surf[s], 4.5, 'hard')
for (const s of MUTED) {
  check('textMuted@' + s, seed.textMuted, surf[s], 4.5, 'hard')
  check('labelDimmed@' + s, blendOntoBase(withAlpha(seed.textMuted, 0.8), surf[s]), surf[s], 4.5, 'hard')
}
for (const r of MD) for (const s of ['background', 'backgroundPanel'] as const) check(r + '@' + s, seed[r], surf[s], 4.5, 'hard')
for (const r of SYNTAX) check(r + '@codeBlockBg', seed[r], surf.codeBlockBg, 4.5, 'hard')
for (const [fg, bg] of [['diffAdded', 'diffAddedBg'], ['diffRemoved', 'diffRemovedBg']] as const) {
  const b = blendOntoBase(eff[bg], surf.background)
  check(fg + '@' + bg, eff[fg], b, 4.5, 'hard')
  check('text@' + bg, seed.text, b, 4.5, 'hard')
}
const primaryFill = blendOntoBase(eff.primary, surf.background)
const luma = (0.299 * parseInt(eff.primary.slice(1, 3), 16) + 0.587 * parseInt(eff.primary.slice(3, 5), 16) + 0.114 * parseInt(eff.primary.slice(5, 7), 16)) / 255
check('contrastText(primary)@primary', luma > 0.6 ? '#141414' : '#F4F4F5', primaryFill, 4.5, 'hard')

for (const s of ['background', 'backgroundPanel', 'backgroundElement'] as const) check('borderActive@' + s, seed.borderActive, surf[s], 3, 'ui')
for (const r of BRAND) for (const s of ['background', 'backgroundPanel'] as const) check(r + '@' + s, seed[r], surf[s], 3, 'ui')

// 引擎 diff 修复是否改动 authored 值（改动 = 设计与渲染脱节）
const repaired = Object.keys(eff).filter((k) => seed[k] !== undefined && seed[k] !== eff[k])
if (repaired.length) {
  console.log('  注意：引擎 diff 修复改动了 ' + repaired.map((k) => k + ' ' + seed[k] + '→' + eff[k]).join('，'))
}

console.log('hello-kitty 37 槽 · 引擎复算')
console.log('  硬性 4.5:1：' + (hardTotal - hardFails) + '/' + hardTotal + ' 通过，违例 ' + hardFails)
console.log('  UI 3.0:1  ：' + (uiTotal - uiFails) + '/' + uiTotal + ' 通过，违例 ' + uiFails)
if (process.argv.indexOf('-v') >= 0) rows.forEach((r) => console.log(r))
if (hardFails || uiFails) {
  rows.filter((r) => r.indexOf('FAIL') >= 0).forEach((r) => console.log(r))
  process.exit(1)
}
console.log('  通过')
