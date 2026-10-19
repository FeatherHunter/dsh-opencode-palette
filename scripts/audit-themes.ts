// scripts/audit-themes.ts — 58 套主题（37 预置 + 21 IP）对比度与设计规范基线审计（票 #116 / map #115）
//
// 只读脚本：读取 src/themes/*.json 与 src/custom-presets/*.json（经引擎同一解析管线），
// 计算「有效渲染层」颜色，按 map #115 的判尺评估硬性对比度、信息项与 IP 设计规范，
// 产出 docs/theme-audit/baseline.json（机器）与 docs/theme-audit/baseline.md（人读）。
// 不修改任何主题 JSON / 引擎源码；不联网；输出确定性（无时间戳、固定排序）。
//
// 有效层口径（与引擎同源，逐位复刻 buildTokens 的输入处理，再用 token 对账兜底）：
//   raw  = resolveThemeColors(json, mode)                     // 解析引用链
//   pal  = ensureDiffContrast(normalizeThemeColors(raw), isDark) // 补 5 扩展槽 + diff 修复
//   - 自持画布预置主题（36）：两套色板但非委托画布；引擎按 issue 45 把 dark pal 写进两半 -> 评估一次
//   - 委托画布主题（lucent-orng）：light pal + 白画布 / dark pal + 黑画布 -> 评估两次
//   - IP / 自定义单套色主题：#120 修复后 buildTokens(norm, norm, false) 两半各自按 isDark 修复
//     （light 半 = light pal，dark 半 = dark pal）；按主题 appearance 取宿主实际生效的那半评估
// 表面 = 8 个背景槽按真实叠放顺序做 alpha 合成（codeHeaderBg 落在 codeBlockBg 上，其余落在画布/底上）。
//
// 用法：node scripts/audit-themes.ts [--check] [--out <dir>]
//   --check 时若存在硬性违例则退出码 1（默认 0，供以后接入 CI 验收，见票 #116 范围外）。
//   --out <dir> 把 baseline.json / baseline.md 写到指定目录（默认 docs/theme-audit；供 T2/T3 并行整改时各写各的，避免互相覆盖）。
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  blendOntoBase,
  contrastRatio,
  contrastText,
  ensureDiffContrast,
  isDelegatedSurface,
  readableTextOn,
  resolveThemeColors,
  rgbToHex,
  withAlpha,
} from '../src/engine/resolve.ts'
import {
  COLOR_SLOTS,
  DERIVED_TOKENS,
  SHIKI_MAP,
  TOKEN_MAP,
  normalizeThemeColors,
} from '../src/engine/map-dsh.ts'
import { generateTheme, renderCustomTheme, type TokenMap } from '../src/engine/generate.ts'
import { getThemeJson, isSystem, listThemes } from '../src/engine/registry.ts'
import { listIpPresets } from '../src/engine/ip-presets.ts'
import type { ResolvedColorMap } from '../src/engine/resolve.ts'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
// --out 只影响审计产物落点；exceptions.json 始终读仓库内固定位置（它是判尺的一部分，不是产物）。
const outIndex = process.argv.indexOf('--out')
const outArg = outIndex >= 0 ? process.argv[outIndex + 1] : undefined
const OUT_DIR = outArg ? (isAbsolute(outArg) ? outArg : join(ROOT, outArg)) : join(ROOT, 'docs', 'theme-audit')
const BASELINE_JSON = join(OUT_DIR, 'baseline.json')
const BASELINE_MD = join(OUT_DIR, 'baseline.md')
const EXCEPTIONS_JSON = join(ROOT, 'docs', 'theme-audit', 'exceptions.json')

// 判尺（map #115 Notes；docs/theme-audit/criteria.md 是唯一权威文字版，这里只放常量）
const TEXT_THRESHOLD = 4.5
const UI_THRESHOLD = 3
const INFO_THRESHOLD = 3
const SYNTAX_HEADER_THRESHOLD = 4.5

const HOST_CANVAS = { light: '#FFFFFF', dark: '#000000' } as const
// 宿主内置默认 token（dsh-client-ui-theme）：tooltip-bg 浅色 #2C2C2E / 深色 #43454A
// （neutral-bluish-850 / 750），标签色硬编码 #FFF（--dsw-static-neutral-bluish-00）。
// 委托画布主题（浮层底透明）不发 tooltip 规则、交还宿主默认：按此记录其真实观感。
const HOST_TOOLTIP = { label: '#FFFFFF', bg: { light: '#2C2C2E', dark: '#43454A' } } as const

// 8 个背景槽（表面评估顺序固定）
const SURFACES = [
  'background',
  'backgroundPanel',
  'backgroundElement',
  'sidebarBg',
  'bubbleBg',
  'inputBg',
  'codeBlockBg',
  'codeHeaderBg',
] as const
const MUTED_SURFACES = ['background', 'backgroundPanel', 'backgroundElement'] as const
const MD_SURFACES = ['background', 'backgroundPanel'] as const
const MARKDOWN_ROLES = [
  'markdownHeading',
  'markdownLink',
  'markdownStrong',
  'markdownEmph',
  'markdownBlockQuote',
  'markdownCode',
] as const
const SYNTAX_ROLES = [
  'syntaxComment',
  'syntaxKeyword',
  'syntaxFunction',
  'syntaxType',
  'syntaxNumber',
  'syntaxString',
  'syntaxOperator',
] as const
const SYNTAX_CORE = ['syntaxKeyword', 'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString'] as const
const BRAND_ROLES = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const
const BORDER_ACTIVE_SURFACES = ['background', 'backgroundPanel', 'backgroundElement'] as const
const BRAND_SURFACES = ['background', 'backgroundPanel'] as const

type PairClass = 'hard' | 'ui' | 'info' | 'diagnostic'
type PairGroup = 'text' | 'muted' | 'dimmed' | 'markdown' | 'syntax' | 'diff' | 'onPrimary' | 'borderActive' | 'brand' | 'border' | 'diffBg' | 'syntaxHeader' | 'host'

interface PairDef {
  code: string
  fgRole: string
  bgRole: string
  threshold: number
  cls: PairClass
  group: PairGroup
  note: string
}

function def(code: string, fgRole: string, bgRole: string, threshold: number, cls: PairClass, group: PairGroup, note: string): PairDef {
  return { code: code, fgRole: fgRole, bgRole: bgRole, threshold: threshold, cls: cls, group: group, note: note }
}

const PAIR_DEFS: PairDef[] = []
// 硬性 4.5:1 —— 正文 text 落在 8 个背景槽上
for (const s of SURFACES) PAIR_DEFS.push(def('text@' + s, 'text', s, TEXT_THRESHOLD, 'hard', 'text', '正文 text 落在每个背景槽上'))
// 硬性 4.5:1 —— 次级文本与 80% dimmed（宿主 label-dimmed 约等于 textMuted@0.8），只对三层主表面
for (const s of MUTED_SURFACES) PAIR_DEFS.push(def('textMuted@' + s, 'textMuted', s, TEXT_THRESHOLD, 'hard', 'muted', '次级文本 textMuted 落在主表面'))
for (const s of MUTED_SURFACES) PAIR_DEFS.push(def('labelDimmed@' + s, 'labelDimmed', s, TEXT_THRESHOLD, 'hard', 'dimmed', 'label-dimmed = withAlpha(textMuted,0.8) 合成后的实际色'))
// 硬性 4.5:1 —— markdown 6 角色 x (background, backgroundPanel)
for (const r of MARKDOWN_ROLES) for (const s of MD_SURFACES) PAIR_DEFS.push(def(r + '@' + s, r, s, TEXT_THRESHOLD, 'hard', 'markdown', 'markdown 角色落在主表面'))
// 硬性 4.5:1 —— 语法 7 角色落在代码块底
for (const r of SYNTAX_ROLES) PAIR_DEFS.push(def(r + '@codeBlockBg', r, 'codeBlockBg', TEXT_THRESHOLD, 'hard', 'syntax', '代码着色角色落在代码块底'))
// 硬性 4.5:1 —— diff 前景 / 正文落在 diff 底（diff 修复后的有效值）
PAIR_DEFS.push(def('diffAdded@diffAddedBg', 'diffAdded', 'diffAddedBg', TEXT_THRESHOLD, 'hard', 'diff', '新增行前景落在新增行底'))
PAIR_DEFS.push(def('diffRemoved@diffRemovedBg', 'diffRemoved', 'diffRemovedBg', TEXT_THRESHOLD, 'hard', 'diff', '删除行前景落在删除行底'))
PAIR_DEFS.push(def('text@diffAddedBg', 'text', 'diffAddedBg', TEXT_THRESHOLD, 'hard', 'diff', '新增行底上的正文'))
PAIR_DEFS.push(def('text@diffRemovedBg', 'text', 'diffRemovedBg', TEXT_THRESHOLD, 'hard', 'diff', '删除行底上的正文'))
// 硬性 4.5:1 —— contrastText(primary) 落在 primary 填充上
PAIR_DEFS.push(def('contrastText(primary)@primary', 'contrastText(primary)', 'primary', TEXT_THRESHOLD, 'hard', 'onPrimary', '主按钮前景（label-primary-foreground）落在 primary 填充'))
// 硬性 3:1 —— UI / 交互态
for (const s of BORDER_ACTIVE_SURFACES) PAIR_DEFS.push(def('borderActive@' + s, 'borderActive', s, UI_THRESHOLD, 'ui', 'borderActive', '聚焦/选中边框落在主表面'))
for (const r of BRAND_ROLES) for (const s of BRAND_SURFACES) PAIR_DEFS.push(def(r + '@' + s, r, s, UI_THRESHOLD, 'ui', 'brand', '品牌/交互色作为 UI 前景落在主表面'))
// 信息项（无阈值判定，只报告离阈值多近）
for (const s of SURFACES) PAIR_DEFS.push(def('border@' + s, 'border', s, INFO_THRESHOLD, 'info', 'border', 'DSH 装饰性边框（深色默认 16% 白），信息项'))
PAIR_DEFS.push(def('diffAddedBg@background', 'diffAddedBg', 'background', INFO_THRESHOLD, 'info', 'diffBg', '新增行弱化底与页面底关系，信息项'))
PAIR_DEFS.push(def('diffRemovedBg@background', 'diffRemovedBg', 'background', INFO_THRESHOLD, 'info', 'diffBg', '删除行弱化底与页面底关系，信息项'))
for (const r of SYNTAX_ROLES) PAIR_DEFS.push(def(r + '@codeHeaderBg', r, 'codeHeaderBg', SYNTAX_HEADER_THRESHOLD, 'diagnostic', 'syntaxHeader', '代码头底上的语法色（诊断项，非 map 硬性对）'))
// tooltip 标签色（#120）：宿主 CSS 硬编码白字（--dsw-static-neutral-bluish-00），不可由 alias 覆盖；
// 引擎改为按浮层底（backgroundElement）现算文字色并用 [role="tooltip"] 元素规则覆盖（正文色优先，
// 不足 4.5 退纯黑/白）。诊断项按引擎实际映射色评估，不再拿硬编码白算。
PAIR_DEFS.push(def('tooltipText@backgroundElement', 'tooltipText', 'backgroundElement', TEXT_THRESHOLD, 'diagnostic', 'host', '引擎映射的 tooltip 标签色落在浮层底上（#120 修复后语义）'))

interface Rgb { r: number; g: number; b: number; a: number }

function parseColor(input: unknown): Rgb | null {
  if (typeof input !== 'string') return null
  const t = input.trim()
  if (t === '' || t === 'transparent' || t === 'none') return null
  if (t[0] === '#') {
    let h = t.slice(1)
    if (h.length === 3 || h.length === 4) {
      h = h.split('').map(function (x: string): string { return x + x }).join('')
    }
    if (h.length !== 6 && h.length !== 8) return null
    const n = parseInt(h, 16)
    if (!Number.isFinite(n)) return null
    if (h.length === 8) return { r: (n >>> 24) & 255, g: (n >>> 16) & 255, b: (n >>> 8) & 255, a: (n & 255) / 255 }
    return { r: (n >>> 16) & 255, g: (n >>> 8) & 255, b: n & 255, a: 1 }
  }
  const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(t)
  if (!m) return null
  const r = Number(m[1])
  const g = Number(m[2])
  const b = Number(m[3])
  const a = m[4] === undefined ? 1 : Number(m[4])
  if (![r, g, b, a].every(function (v: number): boolean { return Number.isFinite(v) })) return null
  return { r: r, g: g, b: b, a: Math.max(0, Math.min(1, a)) }
}

function hex6(rgb: Rgb): string {
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

// 把可能带 alpha 的颜色合成到底色（底色必须是已合成的不透明 hex）
function flatten(input: unknown, baseHex: string): string | null {
  const c = parseColor(input)
  if (!c) return null
  if (c.a >= 1) return hex6(c)
  const b = parseColor(baseHex)
  if (!b) return null
  return hex6({
    r: c.r * c.a + b.r * (1 - c.a),
    g: c.g * c.a + b.g * (1 - c.a),
    b: c.b * c.a + b.b * (1 - c.a),
    a: 1,
  })
}

function slotValue(pal: ResolvedColorMap, key: string): string | undefined {
  const v = pal[key]
  return typeof v === 'string' && v !== 'transparent' ? v : undefined
}

interface Surfaces {
  hexes: Record<string, string>
  unresolved: string[]
}

// 表面合成：background 落在画布；panel/element/sidebar/bubble/input/codeBlock 落在页面底；
// codeHeaderBg 落在代码块底（代码卡片头带与代码块同卡）。
function buildSurfaces(pal: ResolvedColorMap, canvas: string): Surfaces {
  const hexes: Record<string, string> = {}
  const unresolved: string[] = []
  const base = flatten(slotValue(pal, 'background'), canvas) || canvas
  hexes.background = base
  const panel = flatten(slotValue(pal, 'backgroundPanel'), base)
  if (panel === null) { unresolved.push('backgroundPanel'); hexes.backgroundPanel = base } else hexes.backgroundPanel = panel
  const element = flatten(slotValue(pal, 'backgroundElement'), base)
  if (element === null) { unresolved.push('backgroundElement'); hexes.backgroundElement = base } else hexes.backgroundElement = element
  for (const key of ['sidebarBg', 'bubbleBg', 'inputBg']) {
    const v = flatten(slotValue(pal, key), base)
    if (v === null) { unresolved.push(key); hexes[key] = base } else hexes[key] = v
  }
  const codeBlock = flatten(slotValue(pal, 'codeBlockBg'), base)
  if (codeBlock === null) { unresolved.push('codeBlockBg'); hexes.codeBlockBg = base } else hexes.codeBlockBg = codeBlock
  const codeHeader = flatten(slotValue(pal, 'codeHeaderBg'), hexes.codeBlockBg)
  if (codeHeader === null) { unresolved.push('codeHeaderBg'); hexes.codeHeaderBg = hexes.codeBlockBg } else hexes.codeHeaderBg = codeHeader
  return { hexes: hexes, unresolved: unresolved }
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000

interface PairResult {
  code: string
  group: PairGroup
  cls: PairClass
  fg: string | null
  bg: string | null
  ratio: number | null
  threshold: number
  verdict: 'pass' | 'fail' | 'info' | 'skip'
  below: boolean
  note: string
}

// #120：tooltip 标签色不与 surfaces 同源，必须逐位复刻 generate.ts tooltipTextColor —— 直接用引擎
// buildTokens 的 tooltip-bg / bg-base / label-primary token，把浮层底按页面底合成后复算；
// 引擎不发规则（浮层底透明/缺席，委托画布交还宿主默认深底白字）时返回 null = 该评估跳过。
function tooltipPairFromTokens(tokens: TokenMap | undefined, mode: 'light' | 'dark'): { fg: string; bg: string } | null {
  if (!tokens) return null
  const bgRaw = tokens['--dsw-alias-tooltip-bg'] && tokens['--dsw-alias-tooltip-bg'][mode]
  if (!bgRaw || bgRaw === 'transparent') return null
  let bgEff = bgRaw
  const page = tokens['--dsw-alias-bg-base'] && tokens['--dsw-alias-bg-base'][mode]
  if (page && page !== 'transparent') {
    try { bgEff = blendOntoBase(bgRaw, page) } catch (e) { bgEff = bgRaw }
  }
  const text = tokens['--dsw-alias-label-primary'] && tokens['--dsw-alias-label-primary'][mode]
  if (text && text !== 'transparent') {
    try {
      const flat = blendOntoBase(text, bgEff)
      if (contrastRatio(flat, bgEff) >= TEXT_THRESHOLD) return { fg: flat, bg: bgEff }
    } catch (e) { /* 退兜底 */ }
  }
  return { fg: readableTextOn(bgEff), bg: bgEff }
}

function resolveFg(d: PairDef, pal: ResolvedColorMap, bg: string): string | null {
  if (d.fgRole === 'labelDimmed') {
    const muted = slotValue(pal, 'textMuted')
    if (!muted) return null
    return flatten(withAlpha(muted, 0.8), bg)
  }
  if (d.fgRole === 'contrastText(primary)') {
    const primary = slotValue(pal, 'primary')
    if (!primary) return null
    return flatten(contrastText(primary), bg)
  }
  const raw = slotValue(pal, d.fgRole)
  if (!raw) return null
  return flatten(raw, bg)
}

function resolveBg(d: PairDef, pal: ResolvedColorMap, surfaces: Record<string, string>): string | null {
  if (d.bgRole === 'primary') {
    const primary = slotValue(pal, 'primary')
    if (!primary) return null
    return flatten(primary, surfaces.background)
  }
  // diff 行底不是 8 个渲染表面之一，但同样合成在页面底上：diff 前景/正文对的底必须解析出来，
  // 否则这 4 个硬性对会永远 skip（38 硬对里少评 4 对，验收结论不可成立）。
  if (d.bgRole === 'diffAddedBg' || d.bgRole === 'diffRemovedBg') {
    const raw = slotValue(pal, d.bgRole)
    if (!raw) return null
    return flatten(raw, surfaces.background)
  }
  return surfaces[d.bgRole] || null
}

function evaluatePair(d: PairDef, pal: ResolvedColorMap, surfaces: Record<string, string>, tokens: TokenMap | undefined, mode: 'light' | 'dark'): PairResult {
  // tooltip 诊断项走 token 复刻（见 tooltipPairFromTokens），不参与 surfaces 计算
  if (d.fgRole === 'tooltipText') {
    const pair = tooltipPairFromTokens(tokens, mode)
    if (pair === null) return { code: d.code, group: d.group, cls: d.cls, fg: null, bg: null, ratio: null, threshold: d.threshold, verdict: 'skip', below: false, note: d.note }
    let tooltipRatio = 0
    try { tooltipRatio = contrastRatio(pair.fg, pair.bg) } catch (e) { tooltipRatio = 0 }
    return { code: d.code, group: d.group, cls: d.cls, fg: pair.fg, bg: pair.bg, ratio: round3(tooltipRatio), threshold: d.threshold, verdict: 'info', below: tooltipRatio < d.threshold, note: d.note }
  }
  const bg = resolveBg(d, pal, surfaces)
  const fg = bg === null ? null : resolveFg(d, pal, bg)
  if (fg === null || bg === null) {
    return { code: d.code, group: d.group, cls: d.cls, fg: fg, bg: bg, ratio: null, threshold: d.threshold, verdict: 'skip', below: false, note: d.note }
  }
  let ratio = 0
  try { ratio = contrastRatio(fg, bg) } catch (e) { ratio = 0 }
  const below = ratio < d.threshold
  let verdict: PairResult['verdict'] = 'info'
  if (d.cls === 'hard' || d.cls === 'ui') verdict = below ? 'fail' : 'pass'
  return { code: d.code, group: d.group, cls: d.cls, fg: fg, bg: bg, ratio: round3(ratio), threshold: d.threshold, verdict: verdict, below: below, note: d.note }
}

interface EvaluationCounts {
  hardFails: number
  hardTotal: number
  uiFails: number
  uiTotal: number
  byGroup: Record<string, number>
  info: {
    borderBelow3: number
    diffBgBelow3: number
    syntaxHeaderBelow45: number
    tooltipBelow45: boolean
  }
}

interface Evaluation {
  label: string
  hostMode: 'light' | 'dark'
  canvas: string
  surfaces: Record<string, string>
  distinctSurfaces: number
  counts: EvaluationCounts
  worst: Array<{ code: string; ratio: number | null; threshold: number }>
  pairs: PairResult[]
}

function evaluate(pal: ResolvedColorMap, hostMode: 'light' | 'dark', canvas: string, label: string, tokens: TokenMap | undefined): Evaluation {
  const built = buildSurfaces(pal, canvas)
  const pairs = PAIR_DEFS.map(function (d: PairDef): PairResult { return evaluatePair(d, pal, built.hexes, tokens, hostMode) })
  const byGroup: Record<string, number> = {}
  let hardFails = 0
  let hardTotal = 0
  let uiFails = 0
  let uiTotal = 0
  let borderBelow3 = 0
  let diffBgBelow3 = 0
  let syntaxHeaderBelow45 = 0
  let tooltipBelow45 = false
  for (const p of pairs) {
    if (p.cls === 'hard') { hardTotal++; if (p.verdict === 'fail') { hardFails++; byGroup[p.group] = (byGroup[p.group] || 0) + 1 } }
    if (p.cls === 'ui') { uiTotal++; if (p.verdict === 'fail') uiFails++ }
    if (p.cls === 'info') {
      if (p.group === 'border' && p.below) borderBelow3++
      if (p.group === 'diffBg' && p.below) diffBgBelow3++
    }
    if (p.cls === 'diagnostic') {
      if (p.group === 'syntaxHeader' && p.below) syntaxHeaderBelow45++
      if (p.group === 'host') tooltipBelow45 = p.below
    }
  }
  const worst = pairs
    .filter(function (p: PairResult): boolean { return p.cls === 'hard' && p.verdict === 'fail' && p.ratio !== null })
    .sort(function (a: PairResult, b: PairResult): number { return (a.ratio || 0) - (b.ratio || 0) || a.code.localeCompare(b.code) })
    .slice(0, 5)
    .map(function (p: PairResult): { code: string; ratio: number | null; threshold: number } { return { code: p.code, ratio: p.ratio, threshold: p.threshold } })
  return {
    label: label,
    hostMode: hostMode,
    canvas: canvas,
    surfaces: built.hexes,
    distinctSurfaces: new Set(Object.keys(built.hexes).map(function (k: string): string { return built.hexes[k] })).size,
    counts: {
      hardFails: hardFails,
      hardTotal: hardTotal,
      uiFails: uiFails,
      uiTotal: uiTotal,
      byGroup: byGroup,
      info: {
        borderBelow3: borderBelow3,
        diffBgBelow3: diffBgBelow3,
        syntaxHeaderBelow45: syntaxHeaderBelow45,
        tooltipBelow45: tooltipBelow45,
      },
    },
    worst: worst,
    pairs: pairs,
  }
}

// token 对账：把「我们复刻的有效色板」与引擎 generateTheme/renderCustomTheme 的实际 token 对比
function sameColor(a: string | undefined, b: string | undefined): boolean {
  if (a === undefined || b === undefined) return a === b
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

interface TokenMismatch { token: string; half: 'light' | 'dark'; expected: string | null; actual: string | null }
interface TokenParity { checked: number; mismatches: TokenMismatch[] }

// twoHalves=true 对应引擎「两半分离」路径（委托画布 + 单套色自定义/IP 主题）：light 半取 lightPal、
// dark 半取 darkPal；false 对应自持画布预置主题的 issue 45 legacy 语义（两半都写 darkPal 的值）。
function expectedTokens(darkPal: ResolvedColorMap, lightPal: ResolvedColorMap, twoHalves: boolean): Record<string, { light?: string; dark?: string }> {
  const out: Record<string, { light?: string; dark?: string }> = {}
  const put = function (name: string, lv: string | undefined, dv: string | undefined): void {
    if (!twoHalves) {
      if (dv === undefined) return
      out[name] = { light: dv, dark: dv }
      return
    }
    const entry: { light?: string; dark?: string } = {}
    if (lv !== undefined) entry.light = lv
    if (dv !== undefined) entry.dark = dv
    if (entry.light !== undefined || entry.dark !== undefined) out[name] = entry
  }
  for (const entry of TOKEN_MAP) {
    const name = entry[0]
    const from = entry[1]
    if (from === '__transparent__') { out[name] = { light: 'transparent', dark: 'transparent' }; continue }
    put(name, slotValue(lightPal, from), slotValue(darkPal, from))
  }
  for (const entry of DERIVED_TOKENS) {
    const name = entry[0]
    const fn = entry[1]
    if (typeof name !== 'string' || typeof fn !== 'function') continue
    let lv: string | undefined
    let dv: string | undefined
    try { const v = fn(lightPal); lv = v === 'transparent' ? undefined : v } catch (e) { lv = undefined }
    try { const v = fn(darkPal); dv = v === 'transparent' ? undefined : v } catch (e) { dv = undefined }
    put(name, lv, dv)
  }
  for (const entry of SHIKI_MAP) put(entry[0], slotValue(lightPal, entry[1]), slotValue(darkPal, entry[1]))
  return out
}

function checkTokenParity(actual: Record<string, { light?: string; dark?: string }>, expected: Record<string, { light?: string; dark?: string }>): TokenParity {
  let checked = 0
  const mismatches: TokenMismatch[] = []
  const names = Object.keys(actual).concat(Object.keys(expected).filter(function (n: string): boolean { return !(n in actual) })).sort()
  for (const name of names) {
    const a = actual[name]
    const ex = expected[name]
    for (const half of ['light', 'dark'] as const) {
      checked++
      const av = a ? a[half] : undefined
      const ev = ex ? ex[half] : undefined
      if (!sameColor(av, ev)) {
        if (mismatches.length < 20) mismatches.push({ token: name, half: half, expected: ev === undefined ? null : ev, actual: av === undefined ? null : av })
      }
    }
  }
  return { checked: checked, mismatches: mismatches }
}

// 自定义主题（IP）的单套色渲染：#120 缺陷 A 修复后 buildTokens(norm, norm, false) 两半各自按 isDark
// 修复——light 半 = ensureDiffContrast(norm, false)（向白提亮），dark 半 = ensureDiffContrast(norm, true)
// （向黑压暗）。审计按主题 appearance 选宿主实际生效的那半评估，并用「两半分离」期望 token 对账。
interface CustomRepairChoice { palette: ResolvedColorMap; isDark: boolean; parity: TokenParity }

function selectCustomRepair(norm: ResolvedColorMap, actualTokens: Record<string, { light?: string; dark?: string }>, appearance: 'light' | 'dark'): CustomRepairChoice {
  const darkPal = ensureDiffContrast(norm, true)
  const lightPal = ensureDiffContrast(norm, false)
  const isDark = appearance !== 'light'
  const parity = checkTokenParity(actualTokens, expectedTokens(darkPal, lightPal, true))
  return { palette: isDark ? darkPal : lightPal, isDark: isDark, parity: parity }
}

// 设计规范（仅 IP 层；预置不套用）
interface DesignCollision { roles: string[]; crossGroup: boolean; documented: boolean }
interface DesignBrand { primarySecondaryHueDiff: number; category: string; documented: boolean }
interface DesignSyntax {
  coreMinDeltaE: number
  coreMinPair: string
  commentNearestCoreDeltaE: number
  operatorNearestCoreDeltaE: number
  commentOutranks: number
  operatorOutranks: number
}
interface DesignRecord {
  surfaces: Record<string, string>
  distinctSurfaces: number
  darkStraddle: boolean
  hueIslands: Array<{ role: string; hue: number; deltaToBase: number }>
  collisions: DesignCollision[]
  markdownDuplicates: string[][]
  brand: DesignBrand
  syntax: DesignSyntax
}
interface DesignWarning {
  code: string
  theme: string
  message: string
  documented: boolean
  detail: unknown
}

const DESIGN_ROLES: string[] = []
for (const slot of COLOR_SLOTS) {
  if (slot.group === 'bg') continue
  if (slot.key === 'diffAddedBg' || slot.key === 'diffRemovedBg' || slot.key === 'diffAddedLineNumberBg' || slot.key === 'diffRemovedLineNumberBg') continue
  DESIGN_ROLES.push(slot.key)
}
const DESIGN_GROUP: Record<string, string> = {}
for (const slot of COLOR_SLOTS) DESIGN_GROUP[slot.key] = slot.group

interface Lab { L: number; a: number; b: number }

function srgbChannel(v: number): number {
  const s = v / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function toLab(hex: string | null): Lab | null {
  const c = parseColor(hex)
  if (!c) return null
  const r = srgbChannel(c.r)
  const g = srgbChannel(c.g)
  const b = srgbChannel(c.b)
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883
  const f = function (t: number): number { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116 }
  const fx = f(x)
  const fy = f(y)
  const fz = f(z)
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) }
}

function deltaE76(hexA: string | null, hexB: string | null): number {
  const a = toLab(hexA)
  const b = toLab(hexB)
  if (!a || !b) return 0
  const dL = a.L - b.L
  const da = a.a - b.a
  const db = a.b - b.b
  return Math.sqrt(dL * dL + da * da + db * db)
}

interface Hsl { h: number; s: number; l: number }

function toHsl(hex: string | null): Hsl | null {
  const c = parseColor(hex)
  if (!c) return null
  const r = c.r / 255
  const g = c.g / 255
  const b = c.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  return { h: h, s: s, l: l }
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

function chromaOf(hex: string | null): number {
  const c = parseColor(hex)
  if (!c) return 0
  return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)
}

interface Exceptions {
  themes: Record<string, {
    notes?: string
    allowedCollisions?: string[][]
    allowedMarkdownDuplicates?: string[][]
    allowedBrandGeometry?: string[]
    allowedSyntaxRecede?: string[]
    allowedBackgroundIslands?: boolean
  }>
}

function collisionKey(roles: string[]): string {
  return roles.slice().sort().join('|')
}

function matchException(exceptions: Exceptions, theme: string, field: 'allowedCollisions' | 'allowedMarkdownDuplicates', roles: string[]): boolean {
  const entry = exceptions.themes[theme]
  if (!entry) return false
  const list = entry[field]
  if (!list) return false
  const key = collisionKey(roles)
  return list.some(function (pair: string[]): boolean { return collisionKey(pair) === key })
}

function buildDesignRecord(seedColors: Record<string, string>, theme: string, exceptions: Exceptions, warnings: DesignWarning[]): DesignRecord {
  const authored = normalizeThemeColors(seedColors as ResolvedColorMap)
  const surfaces = buildSurfaces(authored, '#000000').hexes
  const distinct = new Set(Object.keys(surfaces).map(function (k: string): string { return surfaces[k] })).size
  // 背景家族纯净：彩度 >= 8（0-255 通道差）的表面按色相聚类，离底色的基色相 > 60 度记孤岛
  const chromatic: Array<{ role: string; hue: number }> = []
  for (const role of SURFACES) {
    const hex = surfaces[role]
    if (chromaOf(hex) >= 8) {
      const hsl = toHsl(hex)
      if (hsl) chromatic.push({ role: role, hue: hsl.h })
    }
  }
  const bgHsl = toHsl(surfaces.background)
  const baseHue = bgHsl && chromaOf(surfaces.background) >= 8 ? bgHsl.h : (chromatic.length > 0 ? chromatic[0].hue : 0)
  const hueIslands: Array<{ role: string; hue: number; deltaToBase: number }> = []
  for (const c of chromatic) {
    const delta = hueDistance(c.hue, baseHue)
    if (delta > 60) hueIslands.push({ role: c.role, hue: Math.round(c.hue * 10) / 10, deltaToBase: Math.round(delta * 10) / 10 })
  }
  const entry = exceptions.themes[theme] || {}
  const islandsDocumented = entry.allowedBackgroundIslands === true
  if (hueIslands.length > 0) {
    warnings.push({ code: 'bgPurity', theme: theme, documented: islandsDocumented, message: '背景家族出现色相孤岛（>60 度）', detail: hueIslands })
  }
  // 明暗 straddle（浅色主题里混入极暗表面）只记录，不判违规
  const lums = Object.keys(surfaces).map(function (k: string): number { return contrastRatio(surfaces[k], '#000000') })
  const minLum = Math.min.apply(null, lums)
  const maxLum = Math.max.apply(null, lums)
  const darkStraddle = minLum < 2 && maxLum > 10
  // 角色碰撞（精确同值）
  const collisions: DesignCollision[] = []
  const seen: Record<string, string[]> = {}
  for (const role of DESIGN_ROLES) {
    const v = slotValue(authored, role)
    if (!v) continue
    const key = v.toLowerCase()
    if (!seen[key]) seen[key] = []
    seen[key].push(role)
  }
  for (const key of Object.keys(seen).sort()) {
    const roles = seen[key]
    if (roles.length < 2) continue
    const groups = new Set(roles.map(function (r: string): string { return DESIGN_GROUP[r] || '' }))
    const cross = groups.size > 1
    const documented = matchException(exceptions, theme, 'allowedCollisions', roles)
    collisions.push({ roles: roles, crossGroup: cross, documented: documented })
    warnings.push({
      code: 'roleCollision',
      theme: theme,
      documented: documented,
      message: (cross ? '跨组' : '同组') + '角色取同值：' + roles.join(' = ') + '（' + key + '）',
      detail: roles,
    })
  }
  const markdownDuplicates: string[][] = []
  for (const c of collisions) {
    const onlyMd = c.roles.every(function (r: string): boolean { return DESIGN_GROUP[r] === 'md' })
    if (onlyMd) {
      markdownDuplicates.push(c.roles)
      const documented = matchException(exceptions, theme, 'allowedMarkdownDuplicates', c.roles)
      warnings.push({ code: 'markdownDuplicate', theme: theme, documented: documented, message: 'markdown 角色同值，层级被抹平：' + c.roles.join(' = '), detail: c.roles })
    }
  }
  // 品牌第二色几何
  const primaryHex = slotValue(authored, 'primary')
  const secondaryHex = slotValue(authored, 'secondary')
  const primaryHsl = primaryHex ? toHsl(primaryHex) : null
  const secondaryHsl = secondaryHex ? toHsl(secondaryHex) : null
  let hueDiff = 0
  let brandCategory = 'unknown'
  if (primaryHsl && secondaryHsl) {
    hueDiff = Math.round(hueDistance(primaryHsl.h, secondaryHsl.h) * 10) / 10
    if (hueDiff <= 45) brandCategory = 'analogous'
    else if (hueDiff >= 95 && hueDiff <= 145) brandCategory = 'triadic'
    else if (hueDiff > 145) brandCategory = 'complementary'
    else brandCategory = 'unclassified'
  }
  const allowedBrand = entry.allowedBrandGeometry || []
  const brandDocumented = allowedBrand.indexOf(brandCategory) >= 0 || allowedBrand.indexOf('unclassified') >= 0
  if (brandCategory === 'unclassified') {
    warnings.push({ code: 'brandGeometry', theme: theme, documented: brandDocumented, message: 'primary 与 secondary 色相差 ' + hueDiff + ' 度，既非近似(<=45)也非三角(95-145)或互补(>145)', detail: { primarySecondaryHueDiff: hueDiff } })
  }
  // 语法核心区分度 + comment/operator 退后
  const syntaxPairs: Array<{ roles: string[]; deltaE: number }> = []
  for (let i = 0; i < SYNTAX_CORE.length; i++) {
    for (let j = i + 1; j < SYNTAX_CORE.length; j++) {
      syntaxPairs.push({ roles: [SYNTAX_CORE[i], SYNTAX_CORE[j]], deltaE: deltaE76(slotValue(authored, SYNTAX_CORE[i]) || null, slotValue(authored, SYNTAX_CORE[j]) || null) })
    }
  }
  const minPair = syntaxPairs.slice().sort(function (a: { roles: string[]; deltaE: number }, b: { roles: string[]; deltaE: number }): number { return a.deltaE - b.deltaE || a.roles.join().localeCompare(b.roles.join()) })[0]
  const coreMin = minPair ? Math.round(minPair.deltaE * 10) / 10 : 0
  const commentHex = slotValue(authored, 'syntaxComment')
  const operatorHex = slotValue(authored, 'syntaxOperator')
  const nearestCore = function (hex: string | undefined): number {
    if (!hex) return 0
    let min = Infinity
    for (const role of SYNTAX_CORE) min = Math.min(min, deltaE76(hex, slotValue(authored, role) || null))
    return Math.round(min * 10) / 10
  }
  const codeBg = surfaces.codeBlockBg
  const contrastOnCode = function (hex: string | undefined): number {
    if (!hex) return 0
    const eff = flatten(hex, codeBg)
    if (!eff) return 0
    return contrastRatio(eff, codeBg)
  }
  const coreContrasts = SYNTAX_CORE.map(function (r: string): number { return contrastOnCode(slotValue(authored, r)) })
  const commentContrast = contrastOnCode(commentHex)
  const operatorContrast = contrastOnCode(operatorHex)
  const commentOutranks = coreContrasts.filter(function (c: number): boolean { return c < commentContrast }).length
  const operatorOutranks = coreContrasts.filter(function (c: number): boolean { return c < operatorContrast }).length
  const allowedRecede = entry.allowedSyntaxRecede || []
  if (coreMin < 10) {
    warnings.push({ code: 'syntaxCoreMin', theme: theme, documented: false, message: '语法核心五角色最小 ΔE=' + coreMin + ' < 10（相邻角色难辨）', detail: minPair })
  }
  if (commentOutranks > 0) {
    warnings.push({ code: 'syntaxRecede', theme: theme, documented: allowedRecede.indexOf('syntaxComment') >= 0, message: 'syntaxComment 亮度超过 ' + commentOutranks + ' 个核心语法角色，未退后', detail: { outranks: commentOutranks } })
  }
  if (operatorOutranks > 0) {
    warnings.push({ code: 'syntaxRecede', theme: theme, documented: allowedRecede.indexOf('syntaxOperator') >= 0, message: 'syntaxOperator 亮度超过 ' + operatorOutranks + ' 个核心语法角色，未退后', detail: { outranks: operatorOutranks } })
  }
  return {
    surfaces: surfaces,
    distinctSurfaces: distinct,
    darkStraddle: darkStraddle,
    hueIslands: hueIslands,
    collisions: collisions,
    markdownDuplicates: markdownDuplicates,
    brand: { primarySecondaryHueDiff: hueDiff, category: brandCategory, documented: brandDocumented },
    syntax: {
      coreMinDeltaE: coreMin,
      coreMinPair: minPair ? minPair.roles.join(' ↔ ') : '',
      commentNearestCoreDeltaE: nearestCore(commentHex),
      operatorNearestCoreDeltaE: nearestCore(operatorHex),
      commentOutranks: commentOutranks,
      operatorOutranks: operatorOutranks,
    },
  }
}

// ── 主题收集 ──
interface PaletteEval {
  mode: 'light' | 'dark'
  canvas: string
  label: string
  palette: ResolvedColorMap
}

interface ThemeRecord {
  id: string
  kind: 'preset' | 'ip'
  title?: string
  appearance: 'dark' | 'light' | 'system'
  delegated: boolean
  hostModesCovered: string[]
  tokenParity: TokenParity
  diffRepair?: 'light' | 'dark'
  design?: DesignRecord
  evaluations: Evaluation[]
}

interface AuditSummary {
  themes: number
  palettes: number
  hardFails: number
  hardTotal: number
  uiFails: number
  uiTotal: number
  byGroup: Record<string, number>
  themesWithHardFails: number
  themesWithBorderBelow3: number
  themesWithUiFails: number
  info: { borderBelow3: number; diffBgBelow3: number; syntaxHeaderBelow45: number; tooltipBelow45: number }
}

interface DesignSummary {
  themesChecked: number
  warningsTotal: number
  documented: number
  open: number
  byCode: Record<string, number>
  coreSyntaxMinBelow10: number
  commentOrOperatorRecedeOpen: number
  markdownDuplicateThemes: number
  brandUnclassifiedThemes: number
  hueIslandThemes: number
}

async function main(): Promise<void> {
  const exceptions = await loadExceptions()
  const designWarnings: DesignWarning[] = []
  const themes: ThemeRecord[] = []
  const presetNames = listThemes().filter(function (n: string): boolean { return !isSystem(n) })

  for (const id of presetNames) {
    const json = getThemeJson(id)
    if (!json) throw new Error('注册表缺少主题 JSON: ' + id)
    const rawDark = resolveThemeColors(json, 'dark')
    const rawLight = resolveThemeColors(json, 'light')
    const darkPal = ensureDiffContrast(normalizeThemeColors(rawDark), true)
    const lightPal = ensureDiffContrast(normalizeThemeColors(rawLight), false)
    const delegated = isDelegatedSurface(rawDark, rawLight)
    const appearance: 'dark' | 'light' = delegated ? 'light' : 'dark'
    const palettes: PaletteEval[] = delegated
      ? [
          { mode: 'light', canvas: HOST_CANVAS.light, label: 'light', palette: lightPal },
          { mode: 'dark', canvas: HOST_CANVAS.dark, label: 'dark', palette: darkPal },
        ]
      : [{ mode: appearance, canvas: HOST_CANVAS[appearance], label: 'fixed', palette: darkPal }]
    const generated = generateTheme({ dark: rawDark, light: rawLight }, {}, id)
    const evaluations = palettes.map(function (p: PaletteEval): Evaluation { return evaluate(p.palette, p.mode, p.canvas, p.label, generated.tokens) })
    const tokenParity = checkTokenParity(generated.tokens as Record<string, { light?: string; dark?: string }>, expectedTokens(darkPal, lightPal, delegated))
    themes.push({
      id: id,
      kind: 'preset',
      appearance: appearance,
      delegated: delegated,
      hostModesCovered: ['light', 'dark'],
      tokenParity: tokenParity,
      evaluations: evaluations,
    })
  }

  for (const seed of listIpPresets()) {
    const norm = normalizeThemeColors(seed.colors as ResolvedColorMap)
    const appearance: 'dark' | 'light' = seed.appearance === 'light' ? 'light' : 'dark'
    const rendered = renderCustomTheme({ id: seed.name, name: seed.title, appearance: seed.appearance, colors: seed.colors }, {})
    const repairChoice = selectCustomRepair(norm, rendered.tokens as Record<string, { light?: string; dark?: string }>, appearance)
    const pal = repairChoice.palette
    const evaluation = evaluate(pal, appearance, HOST_CANVAS[appearance], 'fixed', rendered.tokens)
    const tokenParity = repairChoice.parity
    const design = buildDesignRecord(seed.colors, seed.name, exceptions, designWarnings)
    themes.push({
      id: seed.name,
      kind: 'ip',
      title: seed.title,
      appearance: appearance,
      delegated: false,
      hostModesCovered: ['light', 'dark'],
      tokenParity: tokenParity,
      diffRepair: repairChoice.isDark ? 'dark' : 'light',
      design: design,
      evaluations: [evaluation],
    })
  }

  // ── 汇总 ──
  const presetRecords = themes.filter(function (t: ThemeRecord): boolean { return t.kind === 'preset' })
  const ipRecords = themes.filter(function (t: ThemeRecord): boolean { return t.kind === 'ip' })
  const summarize = function (records: ThemeRecord[]): AuditSummary {
    const summary: AuditSummary = {
      themes: records.length,
      palettes: 0,
      hardFails: 0,
      hardTotal: 0,
      uiFails: 0,
      uiTotal: 0,
      byGroup: {},
      themesWithHardFails: 0,
      themesWithBorderBelow3: 0,
      themesWithUiFails: 0,
      info: { borderBelow3: 0, diffBgBelow3: 0, syntaxHeaderBelow45: 0, tooltipBelow45: 0 },
    }
    for (const t of records) {
      let themeHasHard = false
      let themeHasBorder = false
      let themeHasUi = false
      for (const ev of t.evaluations) {
        summary.palettes++
        summary.hardFails += ev.counts.hardFails
        summary.hardTotal += ev.counts.hardTotal
        summary.uiFails += ev.counts.uiFails
        summary.uiTotal += ev.counts.uiTotal
        if (ev.counts.hardFails > 0) themeHasHard = true
        if (ev.counts.uiFails > 0) themeHasUi = true
        if (ev.counts.info.borderBelow3 > 0) themeHasBorder = true
        for (const g of Object.keys(ev.counts.byGroup)) summary.byGroup[g] = (summary.byGroup[g] || 0) + ev.counts.byGroup[g]
        summary.info.borderBelow3 += ev.counts.info.borderBelow3
        summary.info.diffBgBelow3 += ev.counts.info.diffBgBelow3
        summary.info.syntaxHeaderBelow45 += ev.counts.info.syntaxHeaderBelow45
        if (ev.counts.info.tooltipBelow45) summary.info.tooltipBelow45++
      }
      if (themeHasHard) summary.themesWithHardFails++
      if (themeHasBorder) summary.themesWithBorderBelow3++
      if (themeHasUi) summary.themesWithUiFails++
    }
    return summary
  }
  const presetSummary = summarize(presetRecords)
  const ipSummary = summarize(ipRecords)

  const documentedWarnings = designWarnings.filter(function (w: DesignWarning): boolean { return w.documented })
  const openWarnings = designWarnings.filter(function (w: DesignWarning): boolean { return !w.documented })
  const designByCode: Record<string, number> = {}
  for (const w of designWarnings) designByCode[w.code] = (designByCode[w.code] || 0) + 1
  const designSummary: DesignSummary = {
    themesChecked: ipRecords.length,
    warningsTotal: designWarnings.length,
    documented: documentedWarnings.length,
    open: openWarnings.length,
    byCode: designByCode,
    coreSyntaxMinBelow10: ipRecords.filter(function (t: ThemeRecord): boolean { return t.design !== undefined && t.design.syntax.coreMinDeltaE < 10 }).length,
    commentOrOperatorRecedeOpen: openWarnings.filter(function (w: DesignWarning): boolean { return w.code === 'syntaxRecede' }).length,
    markdownDuplicateThemes: ipRecords.filter(function (t: ThemeRecord): boolean { return t.design !== undefined && t.design.markdownDuplicates.length > 0 }).length,
    brandUnclassifiedThemes: ipRecords.filter(function (t: ThemeRecord): boolean { return t.design !== undefined && t.design.brand.category === 'unclassified' }).length,
    hueIslandThemes: ipRecords.filter(function (t: ThemeRecord): boolean { return t.design !== undefined && t.design.hueIslands.length > 0 }).length,
  }

  // token 对账问题与 tooltip 标签色诊断（机器可读的引擎层问题清单；tooltip 文字色已由引擎映射）
  const tokenMismatches: Array<{ theme: string; checked: number; mismatches: TokenMismatch[] }> = []
  const tooltipDiagnostics: Array<{ theme: string; evaluation: string; bg: string; ratio: number }> = []
  for (const t of themes) {
    if (t.tokenParity.mismatches.length > 0) tokenMismatches.push({ theme: t.id, checked: t.tokenParity.checked, mismatches: t.tokenParity.mismatches })
    for (const ev of t.evaluations) {
      const host = ev.pairs.filter(function (p: PairResult): boolean { return p.group === 'host' })[0]
      if (host && host.ratio !== null) tooltipDiagnostics.push({ theme: t.id, evaluation: ev.label, bg: host.bg || '', ratio: host.ratio })
    }
  }
  // 自定义主题 diff 修复方向（#120 修复后按 appearance 记录：浅色 IP 应为 light、深色为 dark）
  const customRepair = ipRecords.map(function (t: ThemeRecord): { theme: string; appearance: string; diffRepair: string } {
    return { theme: t.id, appearance: t.appearance, diffRepair: t.diffRepair || 'dark' }
  })
  const lightCustomUsingDarkRepair = customRepair.filter(function (d: { theme: string; appearance: string; diffRepair: string }): boolean {
    return d.appearance === 'light' && d.diffRepair === 'dark'
  }).map(function (d: { theme: string }): string { return d.theme })

  const root = {
    $comment: 'dsh-opencode-palette 主题审计基线（票 #116 / wayfinder map #115）。由 scripts/audit-themes.ts 确定性生成，请勿手改；重跑 npm run audit:themes。',
    schema: 1,
    scope: {
      presets: presetRecords.length,
      ipThemes: ipRecords.length,
      themes: themes.length,
      palettes: presetSummary.palettes + ipSummary.palettes,
    },
    criteria: {
      text: TEXT_THRESHOLD,
      ui: UI_THRESHOLD,
      info: 'no-threshold',
      syntaxHeaderDiagnostic: SYNTAX_HEADER_THRESHOLD,
      pairFields: ['code', 'fg', 'bg', 'ratio', 'threshold', 'verdict'],
      pairs: PAIR_DEFS.map(function (d: PairDef): Record<string, unknown> {
        return { code: d.code, class: d.cls, group: d.group, threshold: d.threshold, note: d.note }
      }),
    },
    presetSummary: presetSummary,
    ipSummary: ipSummary,
    designSummary: designSummary,
    engineDiagnostics: {
      tokenParity: { themesWithMismatch: tokenMismatches.length, details: tokenMismatches },
      // #120 修复后语义：引擎按浮层底映射的 tooltip 标签色对比度（不再是宿主硬编码白）
      tooltipText: tooltipDiagnostics,
      // 委托画布主题（tooltip 底透明、不发规则）交还宿主默认深底白字的实际对比度
      hostDefaultTooltip: {
        themes: presetRecords.filter(function (t: ThemeRecord): boolean { return t.delegated }).map(function (t: ThemeRecord): string { return t.id }),
        values: (['light', 'dark'] as const).map(function (mode: 'light' | 'dark'): { hostMode: string; bg: string; label: string; ratio: number } {
          return { hostMode: mode, bg: HOST_TOOLTIP.bg[mode], label: HOST_TOOLTIP.label, ratio: round3(contrastRatio(HOST_TOOLTIP.label, HOST_TOOLTIP.bg[mode])) }
        }),
      },
      customDiffRepair: { lightThemesUsingDarkRepair: lightCustomUsingDarkRepair, all: customRepair },
    },
    themes: themes.map(function (t: ThemeRecord): Record<string, unknown> {
      const base: Record<string, unknown> = {
        id: t.id,
        kind: t.kind,
        appearance: t.appearance,
        delegated: t.delegated,
        hostModesCovered: t.hostModesCovered,
        tokenParity: { checked: t.tokenParity.checked, mismatches: t.tokenParity.mismatches },
        evaluations: t.evaluations.map(function (ev: Evaluation): Record<string, unknown> {
          return {
            label: ev.label,
            hostMode: ev.hostMode,
            canvas: ev.canvas,
            surfaces: ev.surfaces,
            distinctSurfaces: ev.distinctSurfaces,
            counts: ev.counts,
            worst: ev.worst,
            pairs: ev.pairs.map(function (p: PairResult): Array<string | number | null> {
              return [p.code, p.fg, p.bg, p.ratio, p.threshold, p.verdict]
            }),
          }
        }),
      }
      if (t.title !== undefined) base.title = t.title
      if (t.diffRepair !== undefined) base.diffRepair = t.diffRepair
      if (t.design !== undefined) base.design = t.design
      return base
    }),
    designWarnings: designWarnings,
  }

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(BASELINE_JSON, JSON.stringify(root) + '\n', 'utf8')
  await writeFile(BASELINE_MD, renderMarkdown(root, themes, designWarnings, presetSummary, ipSummary, designSummary), 'utf8')

  const totalHard = presetSummary.hardFails + ipSummary.hardFails
  console.log('[audit-themes] 主题 ' + root.scope.themes + '（预置 ' + presetRecords.length + ' + IP ' + ipRecords.length + '），评估色板 ' + root.scope.palettes + ' 个')
  console.log('[audit-themes] 硬性 4.5/3.0 违例：预置 ' + presetSummary.hardFails + ' text-ish + ' + presetSummary.uiFails + ' UI；IP ' + ipSummary.hardFails + ' + ' + ipSummary.uiFails + '；合计 ' + totalHard)
  console.log('[audit-themes] 信息项：border<3 表面 ' + (presetSummary.info.borderBelow3 + ipSummary.info.borderBelow3) + '，tooltip 文字<4.5 评估 ' + (presetSummary.info.tooltipBelow45 + ipSummary.info.tooltipBelow45))
  console.log('[audit-themes] 设计规范（IP）：' + designSummary.warningsTotal + ' 条告警（记档 ' + designSummary.documented + ' / 待处理 ' + designSummary.open + '）')
  console.log('[audit-themes] 输出：' + BASELINE_JSON + ' + ' + BASELINE_MD)
  if (process.argv.indexOf('--check') >= 0 && totalHard > 0) {
    console.error('[audit-themes] --check：存在 ' + totalHard + ' 条硬性违例')
    process.exitCode = 1
  }
}

async function loadExceptions(): Promise<Exceptions> {
  try {
    const text = await readFile(EXCEPTIONS_JSON, 'utf8')
    const parsed = JSON.parse(text) as Exceptions
    if (!parsed || typeof parsed !== 'object' || typeof parsed.themes !== 'object') return { themes: {} }
    return parsed
  } catch (e) {
    return { themes: {} }
  }
}

function fmtRatio(r: number | null): string {
  return r === null ? '—' : r.toFixed(2)
}

function mdTable(records: ThemeRecord[]): string[] {
  const lines: string[] = []
  lines.push('| 主题 | kind | 硬性违例 | UI 违例 | border<3 | 表面数 | 最差硬性对 |')
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | --- |')
  for (const t of records) {
    const ev = t.evaluations[0]
    const worst = ev.worst.length > 0 ? ev.worst[0].code + ' ' + fmtRatio(ev.worst[0].ratio) : '—'
    lines.push('| ' + t.id + ' | ' + t.kind + ' | ' + ev.counts.hardFails + ' | ' + ev.counts.uiFails + ' | ' + ev.counts.info.borderBelow3 + ' | ' + ev.distinctSurfaces + ' | ' + worst + ' |')
  }
  return lines
}

function renderMarkdown(root: Record<string, unknown>, themes: ThemeRecord[], designWarnings: DesignWarning[], presetSummary: AuditSummary, ipSummary: AuditSummary, designSummary: DesignSummary): string {
  const lines: string[] = []
  const scope = root.scope as { presets: number; ipThemes: number; palettes: number }
  lines.push('# 主题审计基线（58 套）')
  lines.push('')
  lines.push('> 由 scripts/audit-themes.ts 确定性生成（无时间戳、固定排序），请勿手改；重跑 npm run audit:themes。判尺文字版见 [criteria.md](criteria.md)，设计例外见 [exceptions.json](exceptions.json)。')
  lines.push('')
  lines.push('范围：预置 ' + scope.presets + ' 套 + IP ' + scope.ipThemes + ' 套；评估色板 ' + scope.palettes + ' 个（lucent-orng 委托画布按 light/dark 各评估一次；自持画布预置按 dark 有效色板、IP 按 appearance 修复后的有效色板各评估一次）。')
  lines.push('')
  lines.push('## 汇总')
  lines.push('')
  lines.push('| 层 | 主题 | 硬性 4.5:1 违例 | UI 3:1 违例 | 有硬性违例主题 | border<3 表面累计 | tooltip 文字<4.5 评估 |')
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |')
  lines.push(summaryRow('预置', presetSummary))
  lines.push(summaryRow('IP', ipSummary))
  lines.push('')
  lines.push('硬性分组（预置 / IP）：')
  lines.push('')
  lines.push('| 组 | 预置 | IP |')
  lines.push('| --- | ---: | ---: |')
  const groups = Object.keys(presetSummary.byGroup).concat(Object.keys(ipSummary.byGroup).filter(function (g: string): boolean { return !(g in presetSummary.byGroup) })).sort()
  for (const g of groups) lines.push('| ' + g + ' | ' + (presetSummary.byGroup[g] || 0) + ' | ' + (ipSummary.byGroup[g] || 0) + ' |')
  lines.push('')
  lines.push('## 预置主题（37）')
  lines.push('')
  lines.push(...mdTable(themes.filter(function (t: ThemeRecord): boolean { return t.kind === 'preset' })))
  lines.push('')
  lines.push('## IP 主题（21）')
  lines.push('')
  lines.push(...mdTable(themes.filter(function (t: ThemeRecord): boolean { return t.kind === 'ip' })))
  lines.push('')
  const delegated = themes.filter(function (t: ThemeRecord): boolean { return t.delegated })
  lines.push('## 委托画布')
  lines.push('')
  if (delegated.length === 0) lines.push('（本基线无委托画布主题）')
  for (const t of delegated) {
    const light = t.evaluations.filter(function (e: Evaluation): boolean { return e.label === 'light' })[0]
    const dark = t.evaluations.filter(function (e: Evaluation): boolean { return e.label === 'dark' })[0]
    lines.push('- ' + t.id + '：light 画布 #FFFFFF 硬性 ' + (light ? light.counts.hardFails : '?') + ' / dark 画布 #000000 硬性 ' + (dark ? dark.counts.hardFails : '?') + '（同主题名两半各自按宿主底评估）')
  }
  lines.push('')
  lines.push('## 引擎 / 宿主诊断')
  lines.push('')
  const tokenParity = (root.engineDiagnostics as { tokenParity: { themesWithMismatch: number } }).tokenParity
  lines.push('- token 对账（有效色板复刻 vs 引擎 buildTokens 输出）：' + (tokenParity.themesWithMismatch === 0 ? '全部一致（0 主题失配）' : tokenParity.themesWithMismatch + ' 个主题失配，见 baseline.json'))
  const tooltips = (root.engineDiagnostics as { tooltipText: Array<{ theme: string; evaluation: string; bg: string; ratio: number }> }).tooltipText
  const badTooltips = tooltips.filter(function (t): boolean { return t.ratio < TEXT_THRESHOLD })
  if (badTooltips.length === 0) {
    lines.push('- tooltip 标签色（#120 后由引擎按浮层底 backgroundElement 映射，宿主硬编码白字已被 [role="tooltip"] 规则覆盖）：全部 >=4.5（本基线无风险项；透明画布委托宿主的主题不参与）')
  } else {
    const sorted = badTooltips.slice().sort(function (a, b): number { return a.ratio - b.ratio })
    lines.push('- tooltip 标签色（引擎映射）落在 backgroundElement 上：' + badTooltips.length + ' 个评估 <4.5，最低 ' + sorted[0].ratio.toFixed(2) + '（' + sorted.slice(0, 6).map(function (t): string { return t.theme + '/' + t.evaluation }).join('、') + '）')
  }
  const hostDefault = (root.engineDiagnostics as { hostDefaultTooltip?: { themes: string[]; values: Array<{ hostMode: string; bg: string; label: string; ratio: number }> } }).hostDefaultTooltip
  if (hostDefault && hostDefault.themes.length > 0) {
    lines.push('- 委托宿主默认 tooltip（' + hostDefault.themes.join('、') + '）：引擎不发标签规则（浮层底透明），由宿主内置深底 + 硬编码白字承载 —— ' + hostDefault.values.map(function (v): string { return v.hostMode + ' 画布 ' + v.bg + ' / 白字 ' + v.ratio.toFixed(2) }).join('，') + '，均 >=4.5。')
  }
  lines.push('')
  lines.push('## IP 设计规范（预置不套用）')
  lines.push('')
  lines.push('| 检查 | 结果 |')
  lines.push('| --- | --- |')
  lines.push('| 背景家族色相孤岛 | ' + designSummary.hueIslandThemes + ' 个主题有孤岛 |')
  lines.push('| 明暗 straddle（仅记录） | ' + themes.filter(function (t: ThemeRecord): boolean { return t.design !== undefined && t.design.darkStraddle }).length + ' 个主题 |')
  lines.push('| 角色碰撞 / markdown 同值 | ' + designSummary.warningsTotal + ' 条告警：记档 ' + designSummary.documented + ' / 待处理 ' + designSummary.open + ' |')
  lines.push('| markdown 层级同值主题 | ' + designSummary.markdownDuplicateThemes + ' 个 |')
  lines.push('| 语法核心 ΔE<10 | ' + designSummary.coreSyntaxMinBelow10 + ' 个主题 |')
  lines.push('| comment/operator 未退后（待处理） | ' + designSummary.commentOrOperatorRecedeOpen + ' 条 |')
  lines.push('| 品牌第二色几何未归类 | ' + designSummary.brandUnclassifiedThemes + ' 个主题 |')
  lines.push('')
  if (designWarnings.length > 0) {
    lines.push('逐条告警（✓=已记档为例外，见 exceptions.json）：')
    lines.push('')
    lines.push('| 主题 | code | 状态 | 说明 |')
    lines.push('| --- | --- | --- | --- |')
    for (const w of designWarnings) {
      lines.push('| ' + w.theme + ' | ' + w.code + ' | ' + (w.documented ? '✓ 记档' : '待处理') + ' | ' + w.message.replace(/\|/g, '\\|') + ' |')
    }
    lines.push('')
  }
  lines.push('## 与历史 scratch 审计的方向性对账')
  lines.push('')
  lines.push('| 指标 | 本基线 | scratch 审计（D:\\Temp\\wayfinder-facts-*） |')
  lines.push('| --- | ---: | ---: |')
  lines.push('| 预置 text-ish 硬性违例（post-repair） | ' + presetSummary.hardFails + ' | 311（42 对口径）；本基线 38 对口径 |')
  lines.push('| 预置 border→表面 <3 主题数 | ' + presetSummary.themesWithBorderBelow3 + ' | 28（正文字面 border→background） |')
  lines.push('| IP 硬性违例（38 对口径） | ' + ipSummary.hardFails + ' | 150（42 对口径） |')
  lines.push('| IP 浅色代码底最低 text→codeBlockBg | ' + ipCodeStageMin(themes) + ' | ~1.01（sailor-moon） |')
  lines.push('')
  lines.push('口径差异：本基线按 map #115 判尺取 38 对硬性对（text×8、muted/dimmed×3、md6×2、syntax7×codeBlockBg、diff4、onPrimary），scratch 为 42 对（额外把 textMuted→diffBg、syntax→codeHeaderBg 等算作硬性）。差值即这些被本基线降级为信息项/诊断项的对。')
  lines.push('')
  lines.push('## 引擎层修复记录（#120 / T5）')
  lines.push('')
  const customRepair = (root.engineDiagnostics as { customDiffRepair: { lightThemesUsingDarkRepair: string[] } }).customDiffRepair
  if (customRepair.lightThemesUsingDarkRepair.length > 0) {
    lines.push('- ⚠️ renderCustomTheme / buildTokens 仍有 ' + customRepair.lightThemesUsingDarkRepair.length + ' 个浅色 IP（' + customRepair.lightThemesUsingDarkRepair.join('、') + '）按 dark 方向修复，与 #120 修复后的引擎行为不一致，请检查。')
  } else {
    lines.push('- 自定义 / IP 主题 diff 修复方向与外观一致（#120：单套色主题两半各自按 isDark 修复——light 半向白提亮、dark 半向黑压暗；浅色 IP 的 diff 底不再被压成 #000000，diffRepair 全部记为 light）。')
  }
  lines.push('- 宿主 tooltip 标签色硬编码 --dsw-static-neutral-bluish-00（白）、不由 alias 覆盖：引擎改为用 [role="tooltip"] 元素规则按浮层底现算文字色（正文色优先，不足 4.5 退纯黑/白），键帽底由浮层底派生可辨色（不再与浮层底同值）；本基线的 tooltip 诊断项按映射后的实际色评估。')
  lines.push('')
  return lines.join('\n')
}

function summaryRow(label: string, s: AuditSummary): string {
  return '| ' + label + ' | ' + s.themes + ' | ' + s.hardFails + ' | ' + s.uiFails + ' | ' + s.themesWithHardFails + ' | ' + s.info.borderBelow3 + ' | ' + s.info.tooltipBelow45 + ' |'
}

function ipCodeStageMin(themes: ThemeRecord[]): string {
  let min: number | null = null
  let minTheme = ''
  for (const t of themes) {
    if (t.kind !== 'ip' || t.appearance !== 'light') continue
    const ev = t.evaluations[0]
    const pair = ev.pairs.filter(function (p: PairResult): boolean { return p.code === 'text@codeBlockBg' })[0]
    if (pair && pair.ratio !== null && (min === null || pair.ratio < min)) { min = pair.ratio; minTheme = t.id }
  }
  if (min === null) return '—'
  return min.toFixed(2) + '（' + minTheme + '）'
}

main().catch(function (e: unknown): void {
  const msg = e instanceof Error ? (e.stack || e.message) : String(e)
  console.error('[audit-themes] 失败：' + msg)
  process.exitCode = 1
})
