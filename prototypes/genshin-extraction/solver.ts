// solver.ts — 用仓库真实引擎函数（resolve.ts）+ 审计器判尺，爬山求解一套零违例 37 色。
// 每个候选都是两个真源锚点的定比混合，保证色相/彩度血脉可溯源。
import { ensureDiffContrast, contrastRatio, contrastText, withAlpha } from '../../src/engine/resolve.ts'
import { readFileSync, writeFileSync } from 'node:fs'

// ── 真源锚点（35 个，实测自 5 张参考图）────────────────────────────
const A: Record<string, string> = {
  sand: '#D5BF9D', sandLite: '#E6D0AD', paper: '#F3E3C6', gold: '#DAB078', gold2: '#C9A77B',
  warmBrown: '#8D7661', umber: '#6C5045', ink: '#432E27', sky1: '#A0B9CA', indigo: '#312D53',
  plum: '#2E1E29', starBlue: '#7B85BE', taupe: '#876D67', cream2: '#F5E4CE', scarlet: '#B83E25',
  scarletD: '#972B17', blush: '#F4DACB', rose: '#E6C3B2', cocoa: '#471F13', orange: '#E49C75',
  teal: '#528374', tealDark: '#3E4541', skyPale: '#CCEDEB', inkCool: '#2D2C28', stone: '#A89C82',
  cream: '#E6DCC2', olive: '#66644D', sky2: '#B0CCDF', mistBlue: '#8DAEC4', deepIndigo: '#2A3C6C',
  warmWhite: '#EEDCBE', char: '#382726', chestnut: '#513A36', ochre: '#74564B', white: '#F6F5F4',
}

function h2r(h: string): [number, number, number] {
  const s = h.replace('#', '')
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]
}
function r2h(r: [number, number, number]): string {
  return '#' + r.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).toUpperCase().padStart(2, '0')).join('')
}
function mix(a: string, b: string, t: number): string {
  const x = h2r(a), y = h2r(b)
  return r2h([x[0] * (1 - t) + y[0] * t, x[1] * (1 - t) + y[1] * t, x[2] * (1 - t) + y[2] * t])
}

// ── 暗色变体：候选锚点对换成「夜墨」家族（底=墨，文字=奶，字色=冷亮）────────────
const DARK_CAND: Record<string, Pair[]> = {
  background:        [['char', 'plum'], ['inkCool', 'char'], ['plum', 'char'], ['ink', 'char']],
  backgroundPanel:   [['char', 'tealDark'], ['char', 'plum'], ['inkCool', 'char'], ['chestnut', 'char']],
  backgroundElement: [['inkCool', 'stone'], ['tealDark', 'char'], ['inkCool', 'chestnut'], ['char', 'stone']],
  sidebarBg:         [['plum', 'char'], ['ink', 'char'], ['char', 'plum'], ['inkCool', 'ink']],
  bubbleBg:          [['tealDark', 'char'], ['char', 'tealDark'], ['chestnut', 'char'], ['teal', 'char']],
  inputBg:           [['char', 'plum'], ['inkCool', 'char'], ['char', 'chestnut']],
  codeBlockBg:       [['inkCool', 'char'], ['char', 'plum'], ['ink', 'inkCool'], ['char', 'tealDark']],
  codeHeaderBg:      [['char', 'tealDark'], ['inkCool', 'char'], ['chestnut', 'char'], ['char', 'stone']],
  text:              [['warmWhite', 'cream'], ['white', 'warmWhite'], ['cream2', 'white'], ['cream', 'white']],
  textMuted:         [['stone', 'cream'], ['taupe', 'stone'], ['cream', 'stone'], ['warmBrown', 'cream']],
  primary:           [['teal', 'skyPale'], ['skyPale', 'teal'], ['teal', 'cream'], ['skyPale', 'cream']],
  secondary:         [['gold', 'white'], ['gold2', 'gold'], ['gold', 'cream'], ['gold2', 'cream']],
  info:              [['mistBlue', 'skyPale'], ['sky2', 'mistBlue'], ['skyPale', 'mistBlue'], ['starBlue', 'skyPale']],
  success:           [['teal', 'skyPale'], ['teal', 'cream'], ['olive', 'teal'], ['teal', 'white']],
  warning:           [['orange', 'gold'], ['gold', 'white'], ['gold2', 'gold'], ['gold', 'cream']],
  error:             [['scarlet', 'white'], ['scarlet', 'cream'], ['scarletD', 'scarlet'], ['orange', 'scarlet']],
  border:            [['stone', 'char'], ['stone', 'chestnut'], ['taupe', 'char'], ['warmBrown', 'char']],
  borderActive:      [['gold', 'white'], ['gold2', 'cream'], ['gold', 'cream'], ['gold2', 'white']],
  diffAdded:         [['teal', 'skyPale'], ['teal', 'cream'], ['olive', 'teal'], ['teal', 'white']],
  diffRemoved:       [['scarlet', 'white'], ['scarletD', 'scarlet'], ['scarlet', 'cream'], ['orange', 'scarlet']],
  markdownHeading:   [['sky2', 'skyPale'], ['mistBlue', 'sky2'], ['skyPale', 'white'], ['mistBlue', 'skyPale']],
  markdownLink:      [['mistBlue', 'skyPale'], ['sky2', 'mistBlue'], ['starBlue', 'skyPale'], ['skyPale', 'mistBlue']],
  markdownCode:      [['gold2', 'ochre'], ['warmBrown', 'gold2'], ['ochre', 'chestnut'], ['stone', 'warmBrown']],
  markdownEmph:      [['teal', 'skyPale'], ['olive', 'teal'], ['teal', 'cream'], ['tealDark', 'teal']],
  markdownStrong:    [['cream', 'warmWhite'], ['white', 'cream'], ['cream2', 'cream'], ['white', 'warmWhite']],
  markdownBlockQuote:[['stone', 'cream'], ['taupe', 'cream'], ['warmBrown', 'stone'], ['cream', 'stone']],
  syntaxComment:     [['stone', 'tealDark'], ['taupe', 'stone'], ['stone', 'chestnut'], ['stone', 'char']],
  syntaxKeyword:     [['sky2', 'skyPale'], ['mistBlue', 'sky2'], ['starBlue', 'skyPale'], ['skyPale', 'white']],
  syntaxFunction:    [['teal', 'skyPale'], ['teal', 'cream'], ['olive', 'teal'], ['tealDark', 'teal']],
  syntaxType:        [['starBlue', 'skyPale'], ['skyPale', 'mistBlue'], ['indigo', 'skyPale'], ['mistBlue', 'skyPale']],
  syntaxNumber:      [['gold', 'white'], ['gold2', 'cream'], ['gold', 'cream'], ['gold2', 'white']],
  syntaxString:      [['starBlue', 'skyPale'], ['indigo', 'starBlue'], ['mistBlue', 'skyPale'], ['starBlue', 'cream']],
  syntaxOperator:    [['stone', 'tealDark'], ['stone', 'char'], ['taupe', 'tealDark'], ['stone', 'umber']],
}
const DARK_DIFFBG: Record<string, Pair[]> = {
  diffAddedBg:           [['inkCool', 'teal'], ['inkCool', 'olive'], ['char', 'tealDark']],
  diffAddedLineNumberBg: [['inkCool', 'tealDark'], ['char', 'tealDark'], ['inkCool', 'char']],
  diffRemovedBg:         [['inkCool', 'scarletD'], ['char', 'scarletD'], ['inkCool', 'cocoa']],
  diffRemovedLineNumberBg:[['char', 'scarletD'], ['inkCool', 'cocoa'], ['char', 'cocoa']],
}
// ── 角色候选：每个角色给若干 (锚点A, 锚点B) 对，比例 t 由求解器搜 ──
type Pair = [string, string]
const CAND: Record<string, Pair[]> = {
  background:        [['paper', 'white'], ['warmWhite', 'white'], ['paper', 'cream']],
  backgroundPanel:   [['sandLite', 'paper'], ['cream', 'paper'], ['paper', 'warmWhite']],
  backgroundElement: [['sand', 'sandLite'], ['sandLite', 'paper'], ['stone', 'sandLite']],
  sidebarBg:         [['sand', 'sandLite'], ['sand', 'paper'], ['stone', 'sand']],
  bubbleBg:          [['blush', 'white'], ['rose', 'white'], ['blush', 'paper']],
  inputBg:           [['white', 'paper'], ['cream', 'white'], ['white', 'cream2']],
  codeBlockBg:       [['warmWhite', 'white'], ['paper', 'warmWhite'], ['cream', 'warmWhite']],
  codeHeaderBg:      [['sandLite', 'sand'], ['sandLite', 'paper'], ['stone', 'sandLite']],
  text:              [['ink', 'char'], ['ink', 'chestnut'], ['char', 'cocoa']],
  textMuted:         [['warmBrown', 'chestnut'], ['umber', 'chestnut'], ['taupe', 'chestnut'], ['ochre', 'umber']],
  primary:           [['deepIndigo', 'ink'], ['indigo', 'deepIndigo'], ['deepIndigo', 'char'], ['plum', 'deepIndigo']],
  secondary:         [['gold', 'umber'], ['gold2', 'ink'], ['gold', 'ink'], ['gold2', 'ochre']],
  info:              [['mistBlue', 'deepIndigo'], ['sky2', 'deepIndigo'], ['starBlue', 'indigo'], ['mistBlue', 'indigo']],
  success:           [['teal', 'char'], ['teal', 'ink'], ['olive', 'teal'], ['teal', 'chestnut']],
  warning:           [['gold', 'ink'], ['gold', 'umber'], ['orange', 'ink'], ['gold2', 'ink']],
  error:             [['scarlet', 'cocoa'], ['scarletD', 'cocoa'], ['scarlet', 'char'], ['scarletD', 'cocoa']],
  border:            [['sandLite', 'paper'], ['sandLite', 'warmWhite'], ['stone', 'paper']],
  borderActive:      [['gold', 'umber'], ['gold', 'warmBrown'], ['ochre', 'ink'], ['gold2', 'umber']],
  diffAdded:         [['teal', 'char'], ['teal', 'ink'], ['teal', 'chestnut'], ['olive', 'teal']],
  diffRemoved:       [['scarlet', 'cocoa'], ['scarletD', 'cocoa'], ['scarlet', 'ink'], ['scarletD', 'char']],
  markdownHeading:   [['deepIndigo', 'indigo'], ['deepIndigo', 'plum'], ['indigo', 'char'], ['deepIndigo', 'char']],
  markdownLink:      [['mistBlue', 'deepIndigo'], ['sky2', 'deepIndigo'], ['starBlue', 'indigo'], ['mistBlue', 'char']],
  markdownCode:      [['ochre', 'chestnut'], ['umber', 'chestnut'], ['cocoa', 'umber'], ['ochre', 'ink']],
  markdownEmph:      [['teal', 'char'], ['teal', 'ink'], ['olive', 'teal'], ['teal', 'chestnut']],
  markdownStrong:    [['ink', 'cocoa'], ['char', 'cocoa'], ['ink', 'umber'], ['char', 'ink']],
  markdownBlockQuote: [['umber', 'chestnut'], ['taupe', 'chestnut'], ['ochre', 'umber'], ['warmBrown', 'chestnut']],
  syntaxComment:     [['stone', 'chestnut'], ['warmBrown', 'umber'], ['stone', 'umber'], ['taupe', 'umber']],
  syntaxKeyword:     [['deepIndigo', 'indigo'], ['indigo', 'plum'], ['deepIndigo', 'char'], ['indigo', 'char']],
  syntaxFunction:    [['teal', 'char'], ['teal', 'ink'], ['teal', 'chestnut'], ['olive', 'teal']],
  syntaxType:        [['sky2', 'deepIndigo'], ['mistBlue', 'deepIndigo'], ['starBlue', 'indigo'], ['skyPale', 'indigo']],
  syntaxNumber:      [['gold', 'ink'], ['orange', 'cocoa'], ['gold', 'cocoa'], ['gold2', 'ink']],
  syntaxString:      [['starBlue', 'indigo'], ['indigo', 'plum'], ['starBlue', 'plum'], ['skyPale', 'indigo']],
  syntaxOperator:    [['olive', 'inkCool'], ['stone', 'umber'], ['olive', 'ink'], ['stone', 'chestnut']],
}
// diff 底 4 槽（可重复，不算设计角色）
const DIFFBG: Record<string, Pair[]> = {
  diffAddedBg:           [['paper', 'teal'], ['paper', 'olive'], ['warmWhite', 'teal']],
  diffAddedLineNumberBg: [['paper', 'teal'], ['paper', 'olive'], ['paper', 'tealDark']],
  diffRemovedBg:         [['paper', 'scarlet'], ['paper', 'scarletD'], ['warmWhite', 'scarlet']],
  diffRemovedLineNumberBg: [['paper', 'scarlet'], ['paper', 'cocoa'], ['paper', 'scarletD']],
}
const ROLES = Object.keys(CAND)
const ALL = [...ROLES, ...Object.keys(DIFFBG)]
const DESIGN_ROLES = ROLES.filter(r => r !== 'diffAddedBg' && r !== 'diffRemovedBg' && r !== 'diffAddedLineNumberBg' && r !== 'diffRemovedLineNumberBg')
const BG_ROLES = ['background', 'backgroundPanel', 'backgroundElement', 'sidebarBg', 'bubbleBg', 'inputBg', 'codeBlockBg', 'codeHeaderBg']
const MD_ROLES = ['markdownHeading', 'markdownLink', 'markdownCode', 'markdownEmph', 'markdownStrong', 'markdownBlockQuote']
const SYNTAX_ROLES = ['syntaxComment', 'syntaxKeyword', 'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString', 'syntaxOperator']
const CORE = ['syntaxKeyword', 'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString']
const BRAND = ['primary', 'secondary', 'info', 'success', 'warning', 'error']

// ── 审计器同款：8-bit sRGB alpha 合成 ──
function flatten(input: string, base: string): string {
  if (!input.startsWith('#')) return input
  const c = h2r(input), b = h2r(base)
  return r2h([c[0] * 1 + b[0] * 0, c[1], c[2]])
}
function flattenAlpha(rgba: string, base: string): string {
  const m = /rgba?\(([^)]+)\)/.exec(rgba)!
  const p = m[1].split(',').map(Number)
  const b = h2r(base)
  return r2h([p[0] * p[3] + b[0] * (1 - p[3]), p[1] * p[3] + b[1] * (1 - p[3]), p[2] * p[3] + b[2] * (1 - p[3])])
}
function buildSurfaces(pal: Record<string, string>, canvas: string) {
  const s: Record<string, string> = {}
  s.background = pal.background
  for (const k of ['backgroundPanel', 'backgroundElement', 'sidebarBg', 'bubbleBg', 'inputBg', 'codeBlockBg']) s[k] = pal[k]
  s.codeHeaderBg = pal.codeHeaderBg
  return s
}
function lab(hex: string) {
  const c = h2r(hex).map(v => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) })
  const [r, g, b] = c
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = f(x), fy = f(y), fz = f(z)
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) }
}
function dE(a: string, b: string) {
  const x = lab(a), y = lab(b)
  return Math.sqrt((x.L - y.L) ** 2 + (x.a - y.a) ** 2 + (x.b - y.b) ** 2)
}
function hueOf(hex: string) {
  const [r, g, b] = h2r(hex).map(v => v / 255)
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d !== 0) {
    if (mx === r) h = ((g - b) / d) % 6
    else if (mx === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60; if (h < 0) h += 360
  }
  return h
}
function hueDist(a: string, b: string) {
  const d = Math.abs(hueOf(a) - hueOf(b)) % 360
  return d > 180 ? 360 - d : d
}
function chromaOf(hex: string) {
  const [r, g, b] = h2r(hex)
  return Math.max(r, g, b) - Math.min(r, g, b)
}

// ── 违例打分 ──
function score(palRaw: Record<string, string>, appearance: 'light' | 'dark') {
  // 单套色主题：引擎按 appearance 取生效半（另一半也各自修复，审计只评生效半）
  const half = ensureDiffContrast({ ...palRaw } as any, appearance === 'dark') as Record<string, string>
  const pal = { ...palRaw }
  for (const k of Object.keys(DIFFBG)) pal[k] = half[k]
  for (const k of ['diffAdded', 'diffRemoved']) pal[k] = half[k]
  const S = buildSurfaces(pal, appearance === 'light' ? '#FFFFFF' : '#000000')
  let v = 0
  const bad: string[] = []
  const add = (n: number, msg: string) => { v += n; bad.push(msg) }
  // 硬性 38 对
  for (const s of BG_ROLES) { const r = contrastRatio(pal.text, S[s]); if (r < 4.5) add(10, `text@${s} ${r.toFixed(2)}`) }
  for (const s of ['background', 'backgroundPanel', 'backgroundElement']) {
    const r = contrastRatio(pal.textMuted, S[s]); if (r < 4.5) add(10, `textMuted@${s} ${r.toFixed(2)}`)
    const dim = flattenAlpha(withAlpha(pal.textMuted, 0.8) as any, S[s])
    const r2v = contrastRatio(dim, S[s]); if (r2v < 4.5) add(10, `labelDimmed@${s} ${r2v.toFixed(2)}`)
  }
  for (const m of MD_ROLES) for (const s of ['background', 'backgroundPanel']) {
    const r = contrastRatio(pal[m], S[s]); if (r < 4.5) add(10, `${m}@${s} ${r.toFixed(2)}`)
  }
  for (const m of SYNTAX_ROLES) { const r = contrastRatio(pal[m], S.codeBlockBg); if (r < 4.5) add(10, `${m}@codeBlockBg ${r.toFixed(2)}`) }
  for (const [f, b] of [['diffAdded', 'diffAddedBg'], ['diffRemoved', 'diffRemovedBg'], ['text', 'diffAddedBg'], ['text', 'diffRemovedBg']]) {
    const r = contrastRatio(pal[f], pal[b]); if (r < 4.5) add(10, `${f}@${b} ${r.toFixed(2)}`)
  }
  const ct = contrastText(pal.primary)
  const rOn = contrastRatio(ct, pal.primary); if (rOn < 4.5) add(10, `contrastText(primary)@primary ${rOn.toFixed(2)} (${ct})`)
  // UI 15 对
  for (const s of ['background', 'backgroundPanel', 'backgroundElement']) {
    const r = contrastRatio(pal.borderActive, S[s]); if (r < 3) add(8, `borderActive@${s} ${r.toFixed(2)}`)
  }
  for (const b of BRAND) for (const s of ['background', 'backgroundPanel']) {
    const r = contrastRatio(pal[b], S[s]); if (r < 3) add(8, `${b}@${s} ${r.toFixed(2)}`)
  }
  // 设计：25 角色两两不同值
  const seen = new Map<string, string>()
  for (const r of DESIGN_ROLES) {
    const k = pal[r].toUpperCase()
    if (seen.has(k)) add(6, `collision ${seen.get(k)}=${r} ${k}`)
    else seen.set(k, r)
  }
  // 语法核心 ΔE76 ≥ 10
  for (let i = 0; i < CORE.length; i++) for (let j = i + 1; j < CORE.length; j++) {
    const d = dE(pal[CORE[i]], pal[CORE[j]]); if (d < 10) add(6, `ΔE ${CORE[i]}/${CORE[j]} ${d.toFixed(1)}`)
  }
  // 语法退后：comment/operator 对比度须低于全部 5 个核心角色
  const coreRatios = CORE.map(c => contrastRatio(pal[c], S.codeBlockBg))
  const minCore = Math.min(...coreRatios)
  for (const c of ['syntaxComment', 'syntaxOperator']) {
    const r = contrastRatio(pal[c], S.codeBlockBg)
    if (r >= minCore) add(6, `recede ${c} ${r.toFixed(2)} ≥ minCore ${minCore.toFixed(2)}`)
  }
  // 品牌几何：≤45 类比 / 95–145 三角 / >145 互补，其余告警
  const hd = hueDist(pal.primary, pal.secondary)
  if (hd > 45 && hd < 95) add(4, `brandGeometry ${hd.toFixed(1)}°`)
  // 背景色相孤岛：彩度 ≥8 的背景槽，色相偏离基准 >60°
  const baseHue = hueOf(pal.background)
  for (const s of BG_ROLES) {
    if (chromaOf(S[s]) >= 8) {
      const d = hueDist(S[s], pal.background) === 0 ? 0 : Math.min(Math.abs(hueOf(S[s]) - baseHue) % 360, 360 - Math.abs(hueOf(S[s]) - baseHue) % 360)
      if (d > 60) add(4, `hueIsland ${s} ${d.toFixed(0)}°`)
    }
  }
  return { v, bad, pal }
}

// ── 审美目标（零违例后的次级排序）：纸面梯子必须是真梯子，且尽量贴近原设计 ──
const ORIG = JSON.parse(readFileSync(new URL('./seed-palette.json', import.meta.url), 'utf8')) as any
const ORIGMAP: Record<string, string> = { light: ORIG.light, dark: ORIG.dark }

function lum(hex: string) {
  const c = h2r(hex).map(v => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
function aesthetic(pal: Record<string, string>, mode: 'light' | 'dark') {
  const o = ORIGMAP[mode]
  let a = 0
  // ① 背景真梯子：background → panel → element 逐级下沉（更深 = L 更低）
  if (lum(pal.backgroundPanel) > lum(pal.background) - 0.004) a += 60
  if (lum(pal.backgroundElement) > lum(pal.backgroundPanel) - 0.004) a += 60
  if (lum(pal.codeHeaderBg) > lum(pal.codeBlockBg) - 0.004) a += 40
  if (lum(pal.codeBlockBg) > lum(pal.background) - 0.004) a += 30
  // ② 侧栏要是一块独立平面（与页面底拉开）
  if (Math.abs(lum(pal.sidebarBg) - lum(pal.background)) < 0.022) a += 45
  // ③ 气泡要有自己的色相温度（偏粉，不是纯纸）
  if (Math.abs(lum(pal.bubbleBg) - lum(pal.background)) < 0.012) a += 25
  // ③b 设计角色两两不能「看起来一样」（ΔE76 < 5 视为同色）
  for (let i = 0; i < DESIGN_ROLES.length; i++) for (let j = i + 1; j < DESIGN_ROLES.length; j++) {
    const d = dE(pal[DESIGN_ROLES[i]], pal[DESIGN_ROLES[j]])
    if (d < 5) a += 14 * (5 - d)
  }  // ④ 尽量贴近原设计（ΔE76 距离）
  for (const r of ALL) if (o[r]) a += Math.min(1, dE(pal[r], o[r]) / 45) * (BG_ROLES.includes(r) ? 22 : 3)
  // ⑤ 背景要保持暖纸（彩度不能塌成灰白），代码头带必须与浮层同族相邻
  if (chromaOf(pal.background) < 14) a += 60
  if (lum(pal.background) > 0.87) a += 60
  if (Math.abs(lum(pal.codeHeaderBg) - lum(pal.backgroundElement)) > 0.09) a += 50
  return a
}

// ── 状态：role -> [A, B, t] ──
type Sel = [string, string, number]
let state: Record<string, Sel> = {}
let ACT_CAND: any = CAND, ACT_DIFFBG: any = DIFFBG
function useMode(m: string) { if (m === 'dark') { ACT_CAND = DARK_CAND; ACT_DIFFBG = DARK_DIFFBG } else { ACT_CAND = CAND; ACT_DIFFBG = DIFFBG } }
function seedState() {
  for (const r of ALL) {
    const cands = (ACT_CAND as any)[r] || (ACT_DIFFBG as any)[r]
    state[r] = [cands[0][0], cands[0][1], 0.4]
  }
}
function build(state: Record<string, Sel>) {
  const pal: Record<string, string> = {}
  for (const r of ALL) { const s = state[r]; pal[r] = mix(A[s[0]], A[s[1]], s[2]) }
  return pal
}
// 确定性 PRNG（xorshift32）：同种子复跑逐字节一致，便于评审复核
let _seed = 0x9E3779B9
function rnd(): number {
  _seed ^= _seed << 13; _seed >>>= 0
  _seed ^= _seed >> 17
  _seed ^= _seed << 5; _seed >>>= 0
  return _seed / 0x100000000
}
function rand(a: number, b: number) { return a + rnd() * (b - a) }
function ri(n: number) { return Math.floor(rnd() * n) }

function solve(appearance: 'light' | 'dark', iters = 260000) {
  useMode(appearance)
  _seed = appearance === 'light' ? 0x1F2E3D4C : 0x5A6B7C8D
  let best: any = null
  for (let restart = 0; restart < 10; restart++) {
    seedState()
    for (const r of ALL) {
      const cands = (ACT_CAND as any)[r] || (ACT_DIFFBG as any)[r]
      const c = cands[ri(cands.length)]
      state[r] = [c[0], c[1], rand(0.05, 0.85)]
    }
    const pal0 = build(state)
    const sc0 = score(pal0, appearance)
    let curV = sc0.v * 1000 + aesthetic(pal0, appearance)
    for (let i = 0; i < iters; i++) {
      const r = ALL[ri(ALL.length)]
      const old = state[r]
      const cands = (ACT_CAND as any)[r] || (ACT_DIFFBG as any)[r]
      const c = cands[ri(cands.length)]
      state[r] = [c[0], c[1], rand(0.02, 0.95)]
      const pal = build(state)
      const sc = score(pal, appearance)
      const nV = sc.v * 1000 + aesthetic(pal, appearance)
      if (nV <= curV) curV = nV
      else state[r] = old
    }
    const pal = build(state)
    const sc = score(pal, appearance)
    const total = sc.v * 1000 + aesthetic(pal, appearance)
    if (!best || total < best.total) best = { total, v: sc.v, state: JSON.parse(JSON.stringify(state)), bad: sc.bad, pal }
    if (best.v === 0) break
  }
  return best
}

const mode = (process.argv[2] || 'light') as 'light' | 'dark'
const b = solve(mode)
console.log('=== ' + mode + '  score=' + b.v + ' ===')
if (b.bad.length) console.log('violations:', b.bad.slice(0, 25).join(' | '))
const out: any = { mode, score: b.v, total: b.total, colors: {}, recipes: {} }
for (const r of ALL) {
  const s = b.state[r]
  out.colors[r] = b.pal[r]
  out.recipes[r] = `${s[0]} ${A[s[0]]} ⨯${s[2].toFixed(3)} ${s[1]} ${A[s[1]]}`
}
writeFileSync(new URL('./solved-' + mode + '.json', import.meta.url), JSON.stringify(out, null, 1))
console.log(JSON.stringify(out, null, 1))
