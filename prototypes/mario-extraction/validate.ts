// validate.ts — 用仓库自己的引擎（resolve.ts / map-dsh.ts）复刻 docs/theme-audit/criteria.md 的判尺，
// 校验马里奥 IP 主题的浅色与深色两套 37 色位：38 条硬性 4.5:1 + 15 条 UI 3:1 + IP 设计规范告警。
// 读同目录 palette.json；不写仓库任何文件。
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  contrastRatio,
  contrastText,
  ensureDiffContrast,
  withAlpha,
  rgbToHex,
} from 'file:///D:/dsh-plugin/dsh-opencode-palette/src/engine/resolve.ts'
import { normalizeThemeColors } from 'file:///D:/dsh-plugin/dsh-opencode-palette/src/engine/map-dsh.ts'

const TEXT_T = 4.5
const UI_T = 3

const HERE = dirname(fileURLToPath(import.meta.url))
const PAL = JSON.parse(readFileSync(join(HERE, 'palette.json'), 'utf8'))

const SURFACES = ['background', 'backgroundPanel', 'backgroundElement', 'sidebarBg', 'bubbleBg', 'inputBg', 'codeBlockBg', 'codeHeaderBg'] as const
const MUTED_SURFACES = ['background', 'backgroundPanel', 'backgroundElement'] as const
const MD_ROLES = ['markdownHeading', 'markdownLink', 'markdownStrong', 'markdownEmph', 'markdownBlockQuote', 'markdownCode'] as const
const SYNTAX_ROLES = ['syntaxComment', 'syntaxKeyword', 'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString', 'syntaxOperator'] as const
const SYNTAX_CORE = ['syntaxKeyword', 'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString'] as const
const BRAND_ROLES = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const
const DESIGN_ROLES = ['text', 'textMuted', ...BRAND_ROLES, 'border', 'borderActive', 'diffAdded', 'diffRemoved', ...MD_ROLES, ...SYNTAX_ROLES]

function parseColor(input: unknown) {
  if (typeof input !== 'string') return null
  const t = input.trim()
  if (!t || t === 'transparent' || t === 'none') return null
  if (t[0] === '#') {
    let h = t.slice(1)
    if (h.length === 3 || h.length === 4) h = h.split('').map((c: string) => c + c).join('')
    if (h.length !== 6 && h.length !== 8) return null
    const n = parseInt(h, 16)
    if (!Number.isFinite(n)) return null
    if (h.length === 8) return { r: (n >>> 24) & 255, g: (n >>> 16) & 255, b: (n >>> 8) & 255, a: (n >>> 7) & 255 }
    return { r: (n >>> 16) & 255, g: (n >>> 8) & 255, b: n & 255, a: 255 }
  }
  // rgba(...) / rgb(...)：与 scripts/audit-themes.ts 同口径
  const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(t)
  if (!m) return null
  const r = Number(m[1]), g = Number(m[2]), b = Number(m[3])
  const a = m[4] === undefined ? 1 : Number(m[4])
  if (![r, g, b, a].every((v: number) => Number.isFinite(v))) return null
  return { r: r, g: g, b: b, a: Math.max(0, Math.min(1, a)) }
}
function hex6(rgb: { r: number; g: number; b: number }) { return rgbToHex(rgb.r, rgb.g, rgb.b) }
function flatten(input: unknown, baseHex: string): string | null {
  const c = parseColor(input)
  if (!c) return null
  const b = parseColor(baseHex)
  if (!b) return null
  const al = c.a <= 1 ? c.a : c.a / 255
  return hex6({ r: c.r * al + b.r * (1 - al), g: c.g * al + b.g * (1 - al), b: c.b * al + b.b * (1 - al) })
}

function toLab(hex: string | null) {
  const c = parseColor(hex); if (!c) return null
  const srgb = (v: number) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4) }
  const r = srgb(c.r), g = srgb(c.g), b = srgb(c.b)
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
  const y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
  const z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = f(x), fy = f(y), fz = f(z)
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) }
}
function deltaE76(a: string | null, b: string | null) {
  const A = toLab(a), B = toLab(b); if (!A || !B) return 0
  return Math.sqrt((A.L - B.L) ** 2 + (A.a - B.a) ** 2 + (A.b - B.b) ** 2)
}
function toHsl(hex: string | null) {
  const c = parseColor(hex); if (!c) return null
  const r = c.r / 255, g = c.g / 255, b = c.b / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn
  let h = 0
  if (d !== 0) {
    if (mx === r) h = ((g - b) / d) % 6
    else if (mx === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60; if (h < 0) h += 360
  }
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  return { h, s, l }
}
const hueDist = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d }
const chroma = (hex: string | null) => { const c = parseColor(hex); return c ? Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) : 0 }

let totalFails = 0

for (const appearance of ['light', 'dark'] as const) {
  const isDark = appearance === 'dark'
  const canvas = isDark ? '#000000' : '#FFFFFF'
  const authored = normalizeThemeColors(PAL[appearance].colors as any)
  const pal = ensureDiffContrast(authored as any, isDark) as any
  const slot = (k: string) => (typeof pal[k] === 'string' && pal[k] !== 'transparent' ? pal[k] : undefined)

  const base = flatten(slot('background'), canvas) || canvas
  const surfaces: Record<string, string> = { background: base }
  for (const k of ['backgroundPanel', 'backgroundElement', 'sidebarBg', 'bubbleBg', 'inputBg'] as const)
    surfaces[k] = flatten(slot(k), base) || base
  const cb = flatten(slot('codeBlockBg'), base) || base
  surfaces.codeBlockBg = cb
  surfaces.codeHeaderBg = flatten(slot('codeHeaderBg'), cb) || cb

  const rows: Array<{ code: string; fg: string; bg: string; ratio: number; t: number; ok: boolean }> = []
  const check = (code: string, fgRaw: string | null | undefined, bg: string | null, t: number) => {
    if (!fgRaw || !bg) return
    const fg = flatten(fgRaw, bg) as string
    const r = Math.round(contrastRatio(fg, bg) * 1000) / 1000
    rows.push({ code, fg, bg, ratio: r, t, ok: r >= t })
  }
  for (const s of SURFACES) check(`text@${s}`, slot('text'), surfaces[s], TEXT_T)
  for (const s of MUTED_SURFACES) {
    check(`textMuted@${s}`, slot('textMuted'), surfaces[s], TEXT_T)
    check(`labelDimmed@${s}`, withAlpha(slot('textMuted') as string, 0.8), surfaces[s], TEXT_T)
  }
  for (const r of MD_ROLES) for (const s of ['background', 'backgroundPanel'] as const) check(`${r}@${s}`, slot(r), surfaces[s], TEXT_T)
  for (const r of SYNTAX_ROLES) check(`${r}@codeBlockBg`, slot(r), surfaces.codeBlockBg, TEXT_T)
  check('diffAdded@diffAddedBg', slot('diffAdded'), flatten(slot('diffAddedBg'), base), TEXT_T)
  check('diffRemoved@diffRemovedBg', slot('diffRemoved'), flatten(slot('diffRemovedBg'), base), TEXT_T)
  check('text@diffAddedBg', slot('text'), flatten(slot('diffAddedBg'), base), TEXT_T)
  check('text@diffRemovedBg', slot('text'), flatten(slot('diffRemovedBg'), base), TEXT_T)
  check('contrastText(primary)@primary', contrastText(slot('primary')), flatten(slot('primary'), base), TEXT_T)
  for (const s of MUTED_SURFACES) check(`borderActive@${s}`, slot('borderActive'), surfaces[s], UI_T)
  for (const r of BRAND_ROLES) for (const s of ['background', 'backgroundPanel'] as const) check(`${r}@${s}`, slot(r), surfaces[s], UI_T)

  const hardFails = rows.filter((r) => r.t === TEXT_T && !r.ok)
  const uiFails = rows.filter((r) => r.t === UI_T && !r.ok)

  console.log(`\n══ ${appearance} ══`)
  console.log(`  硬性对 ${rows.filter((r) => r.t === TEXT_T).length} 条，违例 ${hardFails.length}`)
  for (const f of hardFails) console.log(`    ✗ ${f.code}  ${f.fg} / ${f.bg} = ${f.ratio} (需 ${f.t})`)
  console.log(`  UI 对 ${rows.filter((r) => r.t === UI_T).length} 条，违例 ${uiFails.length}`)
  for (const f of uiFails) console.log(`    ✗ ${f.code}  ${f.fg} / ${f.bg} = ${f.ratio} (需 ${f.t})`)

  // IP 设计规范
  const seen: Record<string, string[]> = {}
  for (const r of DESIGN_ROLES) { const v = slot(r); if (!v) continue; (seen[v.toLowerCase()] ||= []).push(r) }
  const collisions = Object.values(seen).filter((v) => v.length > 1)
  console.log(`  角色同值碰撞：${collisions.length ? collisions.map((c) => c.join('=')).join(' | ') : '无'}`)

  const bgHsl = toHsl(surfaces.background)!
  const islands: string[] = []
  for (const s of SURFACES) {
    if (chroma(surfaces[s]) < 8) continue
    const hsl = toHsl(surfaces[s])!
    const d = hueDist(hsl.h, bgHsl.h)
    if (d > 60) islands.push(`${s}(${hsl.h.toFixed(1)}°, Δ${d.toFixed(1)}°)`)
  }
  console.log(`  背景色相孤岛(>60°)：${islands.length ? islands.join(', ') : '无'}  基准色相 ${bgHsl.h.toFixed(1)}°`)

  const pH = toHsl(slot('primary'))!, sH = toHsl(slot('secondary'))!
  const hd = Math.round(hueDist(pH.h, sH.h) * 10) / 10
  const cat = hd <= 45 ? 'analogous 近似' : hd >= 95 && hd <= 145 ? 'triadic 三角' : hd > 145 ? 'complementary 互补' : 'unclassified'
  console.log(`  品牌几何：primary ${pH.h.toFixed(1)}° × secondary ${sH.h.toFixed(1)}° = ${hd}° → ${cat}`)

  let coreMin = Infinity, corePair = ''
  for (let i = 0; i < SYNTAX_CORE.length; i++) for (let j = i + 1; j < SYNTAX_CORE.length; j++) {
    const d = deltaE76(slot(SYNTAX_CORE[i])!, slot(SYNTAX_CORE[j])!)
    if (d < coreMin) { coreMin = d; corePair = `${SYNTAX_CORE[i]}×${SYNTAX_CORE[j]}` }
  }
  console.log(`  语法核心最小 ΔE76 = ${coreMin.toFixed(1)} (${corePair})  门槛 10 → ${coreMin >= 10 ? 'PASS' : 'FAIL'}`)

  const ctr = (hex: string | undefined) => { if (!hex) return 0; const e = flatten(hex, surfaces.codeBlockBg)!; return contrastRatio(e, surfaces.codeBlockBg) }
  const coreC = SYNTAX_CORE.map((r) => ctr(slot(r)))
  const comC = ctr(slot('syntaxComment')), opC = ctr(slot('syntaxOperator'))
  const minCore = Math.min(...coreC)
  console.log(`  退后检查：comment ${comC.toFixed(2)} / operator ${opC.toFixed(2)} vs 核心最低 ${minCore.toFixed(2)} → ${comC <= minCore && opC <= minCore ? 'PASS' : 'FAIL'}`)

  const mdSeen: Record<string, string[]> = {}
  for (const r of MD_ROLES) { const v = slot(r)!; (mdSeen[v.toLowerCase()] ||= []).push(r) }
  const mdDup = Object.values(mdSeen).filter((v) => v.length > 1)
  console.log(`  markdown 同值：${mdDup.length ? mdDup.map((c) => c.join('=')).join(', ') : '无'}`)

  const fails = hardFails.length + uiFails.length + collisions.length + islands.length +
    (cat === 'unclassified' ? 1 : 0) + (coreMin < 10 ? 1 : 0) +
    (comC > minCore || opC > minCore ? 1 : 0) + mdDup.length
  totalFails += fails
  console.log(`  本外观告警合计：${fails}`)
}

console.log(`\n总告警：${totalFails}`)
process.exitCode = totalFails === 0 ? 0 : 1
