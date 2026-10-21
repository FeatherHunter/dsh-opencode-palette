// validate.ts — 用仓库自己的引擎（resolve.ts / map-dsh.ts）复刻 docs/theme-audit/criteria.md 的判尺，
// 校验 EVA 候选 IP 主题的**两半**配色：深色「夜战」与浅色「晴空」。
// 读同目录 palette.json（colors → 深色半、colorsLight → 浅色半）；不写仓库任何文件。
//
// 与 scripts/audit-themes.ts 的 IP 路径同口径（该脚本只审计已登记的预置，候选要先过本脚本这一遍）：
//   pal         = ensureDiffContrast(normalizeThemeColors(seed.colors), isDark)   // 引擎同源
//   表面         = 8 个背景槽按真实叠放顺序做 alpha 合成（canvas：深色 #000000 / 浅色 #FFFFFF）
//   labelDimmed = flatten(withAlpha(textMuted, 0.8), bg)  // 宿主 80% 不透明态，gamma 编码 sRGB 合成
//   硬性 38 对 ≥4.5:1 + UI 15 对 ≥3:1 + IP 设计规范告警（判尺第 4 节）
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
import { COLOR_SLOTS, normalizeThemeColors } from 'file:///D:/dsh-plugin/dsh-opencode-palette/src/engine/map-dsh.ts'

const TEXT_T = 4.5
const UI_T = 3
const EXPECTED_HARD = 38
const EXPECTED_UI = 15

const HERE = dirname(fileURLToPath(import.meta.url))
const cand = JSON.parse(readFileSync(join(HERE, 'palette.json'), 'utf8'))

// ── 角色表（判尺第 2 节 / 第 4 节）────────────────────────────────────────
const SURFACES = ['background', 'backgroundPanel', 'backgroundElement', 'sidebarBg', 'bubbleBg', 'inputBg', 'codeBlockBg', 'codeHeaderBg'] as const
const MUTED_SURFACES = ['background', 'backgroundPanel', 'backgroundElement'] as const
const MD_SURFACES = ['background', 'backgroundPanel'] as const
const MD_ROLES = ['markdownHeading', 'markdownLink', 'markdownStrong', 'markdownEmph', 'markdownBlockQuote', 'markdownCode'] as const
const SYNTAX_ROLES = ['syntaxComment', 'syntaxKeyword', 'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString', 'syntaxOperator'] as const
const SYNTAX_CORE = ['syntaxKeyword', 'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString'] as const
const BRAND_ROLES = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const
// 设计规范只覆盖 25 个设计角色：除 8 个背景槽与 4 个 diff 背景槽外的全部颜色（与 audit-themes.ts 同源）
const DIFF_BG_ROLES = ['diffAddedBg', 'diffRemovedBg', 'diffAddedLineNumberBg', 'diffRemovedLineNumberBg']
const DESIGN_ROLES = COLOR_SLOTS.filter((s) => s.group !== 'bg' && DIFF_BG_ROLES.indexOf(s.key) < 0).map((s) => s.key)
const DESIGN_GROUP: Record<string, string> = {}
for (const s of COLOR_SLOTS) DESIGN_GROUP[s.key] = s.group

// ── 颜色工具（与 scripts/audit-themes.ts 同口径）──────────────────────────
function parseColor(input: unknown) {
  if (typeof input !== 'string') return null
  const t = input.trim()
  if (!t || t === 'transparent' || t === 'none') return null
  if (t[0] === '#') {
    let h = t.slice(1)
    if (h.length === 3 || h.length === 4) h = h.split('').map((x) => x + x).join('')
    if (h.length !== 6 && h.length !== 8) return null
    const n = parseInt(h, 16)
    if (!Number.isFinite(n)) return null
    if (h.length === 8) return { r: (n >>> 24) & 255, g: (n >>> 16) & 255, b: (n >>> 8) & 255, a: (n & 255) / 255 }
    return { r: (n >>> 16) & 255, g: (n >>> 8) & 255, b: n & 255, a: 1 }
  }
  const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(t)
  if (!m) return null
  const r = Number(m[1]), g = Number(m[2]), b = Number(m[3])
  const a = m[4] === undefined ? 1 : Number(m[4])
  if (![r, g, b, a].every((v) => Number.isFinite(v))) return null
  return { r, g, b, a: Math.max(0, Math.min(1, a)) }
}
function hex6(rgb: { r: number; g: number; b: number }) {
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}
// alpha 合成到不透明底色（gamma 编码 sRGB 通道加权，与引擎/浏览器一致）
function flatten(input: unknown, baseHex: string): string | null {
  const c = parseColor(input)
  if (!c) return null
  if (c.a >= 1) return hex6(c)
  const b = parseColor(baseHex)
  if (!b) return null
  return hex6({ r: c.r * c.a + b.r * (1 - c.a), g: c.g * c.a + b.g * (1 - c.a), b: c.b * c.a + b.b * (1 - c.a), a: 1 })
}
function srgbChannel(c: number) { const x = c / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4) }
function toLab(hex: string | null) {
  const c = parseColor(hex); if (!c) return null
  const r = srgbChannel(c.r), g = srgbChannel(c.g), b = srgbChannel(c.b)
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883
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
  if (d !== 0) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360 }
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  return { h, s, l }
}
const hueDist = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d }
const chroma = (hex: string | null) => { const c = parseColor(hex); return c ? Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) : 0 }

// ── 评估：某一半 ──────────────────────────────────────────────────────────
type Row = { code: string; fg: string; bg: string; ratio: number; t: number; ok: boolean }
type Warning = { code: string; message: string }
type HalfResult = {
  label: string
  id: string
  rows: Row[]
  hardFails: Row[]
  uiFails: Row[]
  hardCount: number
  uiCount: number
  warnings: Warning[]
  surfaces: Record<string, string>
  repaired: string[]
  brandHue: number
  brandCat: string
  coreMin: number
  corePair: string
  commentC: number
  operatorC: number
  minCoreC: number
  baseHue: number
  distinctSurfaces: number
}

function runHalf(label: string, id: string, seedColors: Record<string, string>, canvas: string, isDark: boolean): HalfResult {
  const authored = normalizeThemeColors(seedColors as any) as any
  const pal = ensureDiffContrast(authored, isDark) as any

  // 表面合成：background 落在画布；panel/element/sidebar/bubble/input/codeBlock 落在页面底；
  // codeHeaderBg 落在代码块底（代码卡片头带与代码块同卡）。
  const slot = (k: string) => (typeof pal[k] === 'string' && pal[k] !== 'transparent' ? pal[k] : undefined)
  const base = flatten(slot('background'), canvas) || canvas
  const surfaces: Record<string, string> = { background: base }
  for (const k of ['backgroundPanel', 'backgroundElement', 'sidebarBg', 'bubbleBg', 'inputBg'] as const)
    surfaces[k] = flatten(slot(k), base) || base
  const cb = flatten(slot('codeBlockBg'), base) || base
  surfaces.codeBlockBg = cb
  surfaces.codeHeaderBg = flatten(slot('codeHeaderBg'), cb) || cb

  const rows: Row[] = []
  function check(code: string, fgRaw: string | null | undefined, bg: string | null, t: number) {
    if (!fgRaw || !bg) return
    const fg = flatten(fgRaw, bg) as string
    const r = Math.round(contrastRatio(fg, bg) * 1000) / 1000
    rows.push({ code, fg, bg, ratio: r, t, ok: r >= t })
  }
  // 硬性 38 对
  for (const s of SURFACES) check(`text@${s}`, slot('text'), surfaces[s], TEXT_T)
  for (const s of MUTED_SURFACES) {
    check(`textMuted@${s}`, slot('textMuted'), surfaces[s], TEXT_T)
    // labelDimmed = 宿主对 textMuted 施加 0.8 透明度后的实际色（合成在 gamma 编码 sRGB 空间）
    check(`labelDimmed@${s}`, withAlpha(slot('textMuted') as string, 0.8), surfaces[s], TEXT_T)
  }
  for (const r of MD_ROLES) for (const s of MD_SURFACES) check(`${r}@${s}`, slot(r), surfaces[s], TEXT_T)
  for (const r of SYNTAX_ROLES) check(`${r}@codeBlockBg`, slot(r), surfaces.codeBlockBg, TEXT_T)
  check('diffAdded@diffAddedBg', slot('diffAdded'), flatten(slot('diffAddedBg'), base), TEXT_T)
  check('diffRemoved@diffRemovedBg', slot('diffRemoved'), flatten(slot('diffRemovedBg'), base), TEXT_T)
  check('text@diffAddedBg', slot('text'), flatten(slot('diffAddedBg'), base), TEXT_T)
  check('text@diffRemovedBg', slot('text'), flatten(slot('diffRemovedBg'), base), TEXT_T)
  check('contrastText(primary)@primary', contrastText(slot('primary')), flatten(slot('primary'), base), TEXT_T)
  // UI 15 对
  for (const s of MUTED_SURFACES) check(`borderActive@${s}`, slot('borderActive'), surfaces[s], UI_T)
  for (const r of BRAND_ROLES) for (const s of ['background', 'backgroundPanel'] as const) check(`${r}@${s}`, slot(r), surfaces[s], UI_T)

  const hardFails = rows.filter((r) => r.t === TEXT_T && !r.ok)
  const uiFails = rows.filter((r) => r.t === UI_T && !r.ok)
  const hardCount = rows.filter((r) => r.t === TEXT_T).length
  const uiCount = rows.filter((r) => r.t === UI_T).length

  // ── IP 设计规范（判尺第 4 节；用「作者色」而非 diff 修复后的色，与 audit-themes.ts 同源）──
  const warnings: Warning[] = []
  const aSlot = (k: string) => (typeof authored[k] === 'string' && authored[k] !== 'transparent' ? authored[k] : undefined)
  // 1) 角色碰撞（精确同值）：25 个设计角色
  const seen: Record<string, string[]> = {}
  for (const r of DESIGN_ROLES) { const v = aSlot(r); if (!v) continue; (seen[v.toLowerCase()] ||= []).push(r) }
  const collisionKeys = Object.keys(seen).sort().filter((k) => seen[k].length > 1)
  for (const k of collisionKeys) {
    const roles = seen[k]
    const cross = new Set(roles.map((r) => DESIGN_GROUP[r] || '')).size > 1
    warnings.push({ code: 'roleCollision', message: `${cross ? '跨组' : '同组'}角色取同值：${roles.join(' = ')}（${k}）` })
  }
  // 2) markdown 层级：6 个 markdown 角色内部同值
  const mdSeen: Record<string, string[]> = {}
  for (const r of MD_ROLES) { const v = aSlot(r); if (!v) continue; (mdSeen[v.toLowerCase()] ||= []).push(r) }
  for (const k of Object.keys(mdSeen).sort()) {
    if (mdSeen[k].length > 1) {
      // 角色顺序跟 DESIGN_ROLES（= COLOR_SLOTS 序）走，与 audit-themes.ts 的告警文案一致
      const ordered = DESIGN_ROLES.filter((r) => mdSeen[k].indexOf(r) >= 0)
      warnings.push({ code: 'markdownDuplicate', message: `markdown 角色同值，层级被抹平：${ordered.join(' = ')}` })
    }
  }
  // 3) 背景家族纯净：彩度 ≥ 8 的背景槽相对底色基色相偏差 > 60° 记孤岛
  const dBase = flatten(aSlot('background'), '#000000') || '#000000'
  const dSurfaces: Record<string, string> = { background: dBase }
  for (const k of ['backgroundPanel', 'backgroundElement', 'sidebarBg', 'bubbleBg', 'inputBg'] as const)
    dSurfaces[k] = flatten(aSlot(k), dBase) || dBase
  const dCb = flatten(aSlot('codeBlockBg'), dBase) || dBase
  dSurfaces.codeBlockBg = dCb
  dSurfaces.codeHeaderBg = flatten(aSlot('codeHeaderBg'), dCb) || dCb
  const chromatic: Array<{ role: string; hue: number }> = []
  for (const s of SURFACES) {
    if (chroma(dSurfaces[s]) < 8) continue
    const hsl = toHsl(dSurfaces[s])
    if (hsl) chromatic.push({ role: s, hue: hsl.h })
  }
  const bgHsl = toHsl(dSurfaces.background)
  const baseHue = bgHsl && chroma(dSurfaces.background) >= 8 ? bgHsl.h : (chromatic.length > 0 ? chromatic[0].hue : 0)
  const islands = chromatic.filter((c) => hueDist(c.hue, baseHue) > 60)
  if (islands.length > 0) {
    warnings.push({ code: 'bgPurity', message: '背景色相孤岛（>60°）：' + islands.map((c) => `${c.role}(${c.hue.toFixed(1)}°, Δ${hueDist(c.hue, baseHue).toFixed(1)}°)`).join(', ') })
  }
  // 4) 品牌第二色几何
  const pH = toHsl(aSlot('primary')), sH = toHsl(aSlot('secondary'))
  let brandHue = 0, brandCat = 'unknown'
  if (pH && sH) {
    brandHue = Math.round(hueDist(pH.h, sH.h) * 10) / 10
    brandCat = brandHue <= 45 ? 'analogous 近似' : (brandHue >= 95 && brandHue <= 145 ? 'triadic 三角' : (brandHue > 145 ? 'complementary 互补' : 'unclassified'))
    if (brandCat === 'unclassified') warnings.push({ code: 'brandGeometry', message: `primary 与 secondary 色相差 ${brandHue} 度，既非近似(<=45)也非三角(95-145)或互补(>145)` })
  }
  // 5) 语法核心区分度（ΔE76 ≥ 10）与 comment/operator 退后
  let coreMin = Infinity, corePair = ''
  for (let i = 0; i < SYNTAX_CORE.length; i++) for (let j = i + 1; j < SYNTAX_CORE.length; j++) {
    const d = deltaE76(aSlot(SYNTAX_CORE[i]) || null, aSlot(SYNTAX_CORE[j]) || null)
    if (d < coreMin) { coreMin = d; corePair = `${SYNTAX_CORE[i]}×${SYNTAX_CORE[j]}` }
  }
  if (coreMin < 10) warnings.push({ code: 'syntaxCoreMin', message: `语法核心五角色最小 ΔE76 = ${coreMin.toFixed(1)}（${corePair}）< 10` })
  const ctr = (hex: string | undefined) => { if (!hex) return 0; const e = flatten(hex, dSurfaces.codeBlockBg)!; return contrastRatio(e, dSurfaces.codeBlockBg) }
  const coreC = SYNTAX_CORE.map((r) => ctr(aSlot(r)))
  const commentC = ctr(aSlot('syntaxComment')), operatorC = ctr(aSlot('syntaxOperator'))
  const minCoreC = Math.min(...coreC)
  if (commentC > minCoreC) warnings.push({ code: 'syntaxRecede', message: `syntaxComment 对比度 ${commentC.toFixed(2)} 高于核心语法最低 ${minCoreC.toFixed(2)}，未退后` })
  if (operatorC > minCoreC) warnings.push({ code: 'syntaxRecede', message: `syntaxOperator 对比度 ${operatorC.toFixed(2)} 高于核心语法最低 ${minCoreC.toFixed(2)}，未退后` })

  // 引擎 diff 修复是否改动过作者色（诊断；audit-themes.ts 评的就是修复后的有效配色）
  const repaired: string[] = []
  for (const k of Object.keys(pal)) {
    const a = authored[k], b = pal[k]
    if (typeof a === 'string' && typeof b === 'string' && a.toUpperCase() !== b.toUpperCase()) repaired.push(`${k}: ${a.toUpperCase()} → ${b.toUpperCase()}`)
  }

  return {
    label, id, rows, hardFails, uiFails, hardCount, uiCount, warnings, surfaces, repaired,
    brandHue, brandCat, coreMin, corePair, commentC, operatorC, minCoreC, baseHue,
    distinctSurfaces: new Set(Object.keys(surfaces).map((k) => surfaces[k])).size,
  }
}

// ── 跑两半 ────────────────────────────────────────────────────────────────
const HALVES: HalfResult[] = [
  runHalf('深色半「夜战」', 'evangelion', cand.colors, '#000000', true),
  runHalf('浅色半「晴空」', 'evangelion-day', cand.colorsLight, '#FFFFFF', false),
]

let totalViolations = 0
let totalWarnings = 0
for (const h of HALVES) {
  const violations = h.hardFails.length + h.uiFails.length
  totalViolations += violations
  totalWarnings += h.warnings.length
  console.log(`━━ ${h.label}（${h.id}）━━`)
  console.log(`  表面（${h.distinctSurfaces} 种）：${SURFACES.map((s) => `${s}=${h.surfaces[s]}`).join('  ')}`)
  console.log(`  硬性对 ${h.hardCount} 条，违例 ${h.hardFails.length}`)
  for (const f of h.hardFails) console.log(`    ✗ ${f.code}  ${f.fg} / ${f.bg} = ${f.ratio} (需 ${f.t})`)
  console.log(`  UI 对 ${h.uiCount} 条，违例 ${h.uiFails.length}`)
  for (const f of h.uiFails) console.log(`    ✗ ${f.code}  ${f.fg} / ${f.bg} = ${f.ratio} (需 ${f.t})`)
  if (h.hardCount !== EXPECTED_HARD || h.uiCount !== EXPECTED_UI) {
    console.log(`    ✗ 判尺对数不对：硬性 ${h.hardCount}（应 ${EXPECTED_HARD}）· UI ${h.uiCount}（应 ${EXPECTED_UI}）——校验器自身有 bug`)
    totalViolations++
  }
  const worst = [...h.rows].sort((a, b) => a.ratio - b.ratio).slice(0, 6)
  console.log('  最紧 6 对：')
  for (const w of worst) console.log(`    ${w.code} = ${w.ratio} (阈值 ${w.t})`)
  console.log(`  设计规范告警：${h.warnings.length}`)
  for (const w of h.warnings) console.log(`    ! [${w.code}] ${w.message}`)
  console.log(`  背景基色相 ${h.baseHue.toFixed(1)}° · 品牌几何 ${h.brandHue}°（${h.brandCat}）`)
  console.log(`  语法核心最小 ΔE76 = ${h.coreMin.toFixed(1)}（${h.corePair}）· 退后 comment ${h.commentC.toFixed(2)} / operator ${h.operatorC.toFixed(2)} ≤ 核心最低 ${h.minCoreC.toFixed(2)}`)
  if (h.repaired.length > 0) {
    console.log('  引擎 diff 修复（有效配色与作者色的差异）：')
    for (const r of h.repaired) console.log(`    · ${r}`)
  } else {
    console.log('  引擎 diff 修复：无需改动（作者色本身已达标）')
  }
  console.log(`  判定：${violations === 0 ? (h.warnings.length === 0 ? 'PASS' : 'PASS（带设计告警）') : 'FAIL'}`)
  console.log('')
}

// 汇总
console.log('── 汇总 ──')
for (const h of HALVES) {
  console.log(`  ${h.label}（${h.id}）：硬性 ${h.hardCount - h.hardFails.length}/${h.hardCount} · UI ${h.uiCount - h.uiFails.length}/${h.uiCount} · 设计告警 ${h.warnings.length}`)
}
const verdict = totalViolations === 0 ? 'PASS' : 'FAIL'
console.log(`  硬性/UI 违例合计 ${totalViolations} · 设计告警合计 ${totalWarnings} → ${verdict}`)
console.log('')
console.log('── 全部颜色对比度 ──')
for (const h of HALVES) {
  console.log(`  【${h.label}】`)
  for (const r of h.rows) console.log(`    ${r.ok ? '✓' : '✗'} ${r.code.padEnd(36)} ${r.ratio.toFixed(2).padStart(6)}  (≥${r.t})`)
}

process.exitCode = totalViolations === 0 ? 0 : 1
console.log(`\n退出码：${totalViolations === 0 ? 0 : 1}`)
