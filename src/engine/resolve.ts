// resolve.ts — 颜色解析器：把 opencode 主题 JSON 的颜色引用链解析为确定 HEX
// 支持：hex 字符串 / 'transparent'|'none' / defs 引用 / theme 自引用 / ANSI 数字 / {dark,light} 变体
// 循环引用抛错；单键解析失败由 resolveThemeColors 捕获为 { __error }，不影响其余色位

/** 单键解析失败的占位值（不参与最终 token） */
export interface ColorError {
  __error: string
}

/** {dark,light} 变体引用；允许未知外观键（历史行为，按 mode 取值） */
export interface ColorVariants {
  dark?: ColorValue
  light?: ColorValue
  [mode: string]: ColorValue | undefined
}

/** 颜色引用：字面色串 / ANSI 数字 / 变体对象 */
export type ColorValue = string | number | ColorVariants

/** 主题 JSON 里的 defs / theme 映射 */
export type ColorRefs = Record<string, ColorValue>

/** 解析后的色位表：正常为 HEX/transparent 字符串，失败为 ColorError */
export type ResolvedColorMap = Record<string, string | ColorError | undefined>

/** opencode 主题 JSON 的最小形状 */
export interface ThemeSource {
  defs?: ColorRefs
  theme?: ColorRefs
}

// ANSI 16 色（opencode ansiToRgba 同源）
const ANSI_16 = [
  '#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#C0C0C0',
  '#808080', '#FF0000', '#00FF00', '#FFFF00', '#0000FF', '#FF00FF', '#00FFFF', '#FFFFFF',
]

export function ansiToHex(code: number): string {
  if (!Number.isInteger(code) || code < 0 || code > 255) return '#FF00FF' // 非法值兜底（品红=显眼错误）
  if (code < 16) return ANSI_16[code]
  if (code < 232) {
    const index = code - 16
    const b = index % 6
    const g = Math.floor(index / 6) % 6
    const r = Math.floor(index / 36)
    const val = (x: number) => (x === 0 ? 0 : x * 40 + 55)
    return rgbToHex(val(r), val(g), val(b))
  }
  const gray = (code - 232) * 10 + 8
  return rgbToHex(gray, gray, gray)
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return ('#' + c(r) + c(g) + c(b)).toUpperCase()
}

/** 解析任意入参为 RGB；非 HEX 输入会得到 NaN 通道（历史宽容语义，调用方自行判断） */
export function hexToRgb(hex: unknown): { r: number; g: number; b: number; a: number } {
  let t = String(hex || '').trim()
  if (t[0] === '#') t = t.slice(1)
  if (t.length === 3) t = t.split('').map((x: string) => x + x).join('')
  if (t.length === 4) t = t.split('').map((x: string) => x + x).join('')
  const n = parseInt(t, 16)
  if (t.length === 8) return { r: (n >>> 24) & 255, g: (n >>> 16) & 255, b: (n >>> 8) & 255, a: n & 255 }
  return { r: (n >>> 16) & 255, g: (n >>> 8) & 255, b: n & 255, a: 255 }
}

// 提亮/压暗：f>0 向白混合，f<0 向黑混合
export function shade(hex: unknown, f: number): string {
  const { r, g, b } = hexToRgb(hex)
  const target = f >= 0 ? 255 : 0
  const k = Math.abs(f)
  return rgbToHex(r + (target - r) * k, g + (target - g) * k, b + (target - b) * k)
}

// 带透明度（输出 rgba()）
export function withAlpha(hex: unknown, a: number): string {
  const { r, g, b } = hexToRgb(hex)
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'
}

// 对比文字色：亮底→深字，暗底→浅字
export function contrastText(hex: unknown): string {
  const { r, g, b } = hexToRgb(hex)
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luma > 0.6 ? '#141414' : '#F4F4F5'
}

const HEX_RE = /^#([0-9a-fA-F]{3,8})$/

export function resolveColor(ref: ColorValue, defs: ColorRefs, theme: ColorRefs, mode: string, chain?: string[]): string {
  const seen = chain || []
  if (typeof ref === 'number') return ansiToHex(ref)
  if (typeof ref === 'string') {
    const t = ref.trim()
    if (t === 'none' || t === 'transparent') return 'transparent'
    if (HEX_RE.test(t)) return t.toUpperCase()
    if (seen.includes(t)) {
      throw new Error('循环颜色引用: ' + seen.concat(t).join(' -> '))
    }
    const next = (defs && defs[t]) || (theme && theme[t])
    if (next === undefined) throw new Error('未知颜色引用 \"' + t + '\"（不在 defs 与 theme 中）')
    return resolveColor(next, defs, theme, mode, seen.concat(t))
  }
  if (typeof ref === 'object' && ref !== null) {
    const v = ref[mode] !== undefined ? ref[mode] : (ref.dark !== undefined ? ref.dark : ref.light)
    if (v === undefined) throw new Error('颜色变体缺少 dark/light: ' + JSON.stringify(ref))
    return resolveColor(v, defs, theme, mode, seen)
  }
  throw new Error('非法颜色值: ' + String(ref))
}

// 解析整个主题 → { 色位: hex|transparent|{__error} }
export function resolveThemeColors(json: unknown, mode?: string): ResolvedColorMap {
  const m = mode || 'dark'
  const src: ThemeSource = json && typeof json === 'object' ? json as ThemeSource : {}
  const defs = src.defs || {}
  const theme = src.theme || {}
  const out: ResolvedColorMap = {}
  for (const key of Object.keys(theme)) {
    if (key === 'thinkingOpacity') continue
    try {
      out[key] = resolveColor(theme[key], defs, theme, m, [])
    } catch (e) {
      out[key] = { __error: e instanceof Error ? e.message : String(e) }
    }
  }
  // opencode 同款兜底：selectedListItemText 缺省=background；backgroundMenu 缺省=backgroundElement
  if (out.selectedListItemText === undefined) out.selectedListItemText = out.background
  if (out.backgroundMenu === undefined) out.backgroundMenu = out.backgroundElement
  return out
}

// 收集解析失败清单（供调用方告警/测试）
export function collectErrors(colors: ResolvedColorMap | null | undefined): string[] {
  const out: string[] = []
  for (const key of Object.keys(colors || {})) {
    const v = (colors as ResolvedColorMap)[key]
    if (v && typeof v === 'object' && v.__error) out.push(key + ': ' + v.__error)
  }
  return out
}

// 画布归属（issue 45）：主要背景槽位在两套外观下均为 transparent → 主题不拥有画布，
// 底色归宿主；其上的文字不得再假设深色底。按槽位判定，不按主题名硬编码。
const SURFACE_SLOTS = ['background', 'backgroundPanel', 'backgroundElement']
export function isDelegatedSurface(darkColors?: ResolvedColorMap | null, lightColors?: ResolvedColorMap | null): boolean {
  const d = darkColors || {}
  const l = lightColors || {}
  return SURFACE_SLOTS.every((k) => d[k] === 'transparent' && l[k] === 'transparent')
}

// ── diff 可读性兜底（issue 80）：WCAG 对比度 + tint 派生 ──
// 上游手写 diff 背景与底色无亲缘关系（nord Bg = panel 色），且 TUI/桌面均无校验，
// V2 v2.0.29 同样没修。引擎在 token 落子前把不达标的背景重算为“底色染一点红/绿”，
// 必要时提亮/压暗前景，保证深浅两外观下 4 对 fg/bg 达标，且增删背景不原样同值。
// 只动派生输出，不改上游主题数据 JSON；缺失/透明/解析失败原样跳过（lucent 系行为不变）。
export const DIFF_CONTRAST_THRESHOLD = 4.5
export const DIFF_TINT_DARK = 0.22
export const DIFF_TINT_LIGHT = 0.14

export function mixHex(a: unknown, b: unknown, k: number): string {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  return rgbToHex(A.r + (B.r - A.r) * k, A.g + (B.g - A.g) * k, A.b + (B.b - A.b) * k)
}

function channelLuminance(v: number): number {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(hex: unknown): number {
  const { r, g, b } = hexToRgb(hex)
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
}

export function contrastRatio(a: unknown, b: unknown): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const hi = Math.max(l1, l2)
  const lo = Math.min(l1, l2)
  return (hi + 0.05) / (lo + 0.05)
}

// 8 位 hex（含 alpha）按底色混合为不透明；不透明原样大写返回
export function blendOntoBase(fgHex: unknown, baseHex: unknown): string {
  const t = String(fgHex || '').trim()
  if (/^#[0-9a-fA-F]{8}$/.test(t)) {
    const alpha = parseInt(t.slice(7, 9), 16) / 255
    const F = hexToRgb('#' + t.slice(1, 7))
    const B = hexToRgb(baseHex)
    return rgbToHex(
      F.r * alpha + B.r * (1 - alpha),
      F.g * alpha + B.g * (1 - alpha),
      F.b * alpha + B.b * (1 - alpha),
    )
  }
  return String(fgHex).toUpperCase()
}

function isSkipped(v: unknown): boolean {
  if (v === undefined || v === null || v === 'transparent') return true
  return typeof v === 'object' && Boolean((v as ColorError).__error)
}

// 单外观 diff 兜底：输入单套解析色（含 background），返回补丁后的浅拷贝
// isDark=true 用 dark 常数（tint 0.22，向黑压暗找达标）；false 用 light 常数（tint 0.14，向白提亮）
export function ensureDiffContrast(colors: ResolvedColorMap | null | undefined, isDark = true, threshold = DIFF_CONTRAST_THRESHOLD): ResolvedColorMap {
  const src: ResolvedColorMap = colors || {}
  const base = src.background
  // WIP 原文此处只判 isSkipped；保留同一运行时语义（base 非字符串的路径不进 engine 输入面）
  if (isSkipped(base)) return Object.assign({}, src)
  const alpha = isDark ? DIFF_TINT_DARK : DIFF_TINT_LIGHT
  const bgTarget = isDark ? '#000000' : '#FFFFFF'
  const fgTarget = isDark ? '#FFFFFF' : '#000000'
  const out: ResolvedColorMap = Object.assign({}, src)
  const groups: Array<{ fg: string; bgs: string[] }> = [
    { fg: 'diffAdded', bgs: ['diffAddedBg', 'diffAddedLineNumberBg'] },
    { fg: 'diffRemoved', bgs: ['diffRemovedBg', 'diffRemovedLineNumberBg'] },
  ]
  for (const g of groups) {
    const fg0 = src[g.fg]
    if (isSkipped(fg0) || typeof fg0 !== 'string') continue
    // 先看两个 Bg 是否都已达标：都达标则不动（保住好主题原值）
    let needFix = false
    for (const bk of g.bgs) {
      const bv = src[bk]
      if (isSkipped(bv) || typeof bv !== 'string') continue
      let eff = bv
      try { eff = blendOntoBase(bv, base) } catch (e) { continue }
      try {
        if (contrastRatio(fg0, eff) < threshold) needFix = true
      } catch (e) { needFix = true }
    }
    if (!needFix) continue
    // 最小改动搜索：fg 提亮步进最小，背景压暗步进最小，首个双 Bg 达标即停
    let fixed: { fgC: string; bgCands: Array<string | null>; j: number } | null = null
    const jSteps = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
    const kSteps = [0, 0.2, 0.4, 0.6, 0.8, 1.0]
    for (const j of jSteps) {
      const fgC = j === 0 ? (fg0 as string) : mixHex(fg0, fgTarget, j)
      const tintedC = mixHex(base, fgC, alpha)
      const bgCands: Array<string | null> = []
      let ok = true
      for (const bk of g.bgs) {
        const bv = src[bk]
        if (isSkipped(bv) || typeof bv !== 'string') { bgCands.push(null); continue }
        let found: string | null = null
        for (const k of kSteps) {
          const cand = mixHex(tintedC, bgTarget, k)
          try {
            if (contrastRatio(fgC, cand) >= threshold) { found = cand; break }
          } catch (e) { continue }
        }
        if (found === null) { ok = false; break }
        bgCands.push(found)
      }
      if (ok) { fixed = { fgC, bgCands, j }; break }
    }
    const fix = fixed
    if (!fix) continue
    if (fix.j > 0) out[g.fg] = fix.fgC
    g.bgs.forEach((bk, i) => {
      const c = fix.bgCands[i]
      if (c !== null) out[bk] = c
    })
  }
  // 增删背景不可同值透出：若修完仍相等（上游同值输入），把删除侧再压一档（仍保达标）
  const ab = out.diffAddedBg
  const db = out.diffRemovedBg
  if (typeof ab === 'string' && typeof db === 'string' && ab.toUpperCase() === db.toUpperCase()) {
    const delFg = out.diffRemoved
    if (typeof delFg === 'string' && !isSkipped(delFg)) {
      const tinted = mixHex(base, delFg, alpha)
      for (const k of [0.4, 0.6, 0.8, 1.0]) {
        const cand = mixHex(tinted, bgTarget, k)
        if (cand.toUpperCase() === ab.toUpperCase()) continue
        try {
          if (contrastRatio(delFg, cand) >= threshold) { out.diffRemovedBg = cand; break }
        } catch (e) { continue }
      }
    }
  }
  const ag = out.diffAddedLineNumberBg
  const dg = out.diffRemovedLineNumberBg
  if (typeof ag === 'string' && typeof dg === 'string' && ag.toUpperCase() === dg.toUpperCase()) {
    const delFg = out.diffRemoved
    if (typeof delFg === 'string' && !isSkipped(delFg)) {
      const tinted = mixHex(base, delFg, alpha)
      for (const k of [0.4, 0.6, 0.8, 1.0]) {
        const cand = mixHex(tinted, bgTarget, k)
        if (cand.toUpperCase() === ag.toUpperCase()) continue
        try {
          if (contrastRatio(delFg, cand) >= threshold) { out.diffRemovedLineNumberBg = cand; break }
        } catch (e) { continue }
      }
    }
  }
  return out
}
