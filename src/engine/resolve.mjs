// resolve.mjs — 颜色解析器：把 opencode 主题 JSON 的颜色引用链解析为确定 HEX
// 支持：hex 字符串 / 'transparent'|'none' / defs 引用 / theme 自引用 / ANSI 数字 / {dark,light} 变体
// 循环引用抛错；单键解析失败由 resolveThemeColors 捕获为 { __error }，不影响其余色位

// ANSI 16 色（opencode ansiToRgba 同源）
const ANSI_16 = [
  '#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#C0C0C0',
  '#808080', '#FF0000', '#00FF00', '#FFFF00', '#0000FF', '#FF00FF', '#00FFFF', '#FFFFFF',
]

export function ansiToHex(code) {
  if (!Number.isInteger(code) || code < 0 || code > 255) return '#FF00FF' // 非法值兜底（品红=显眼错误）
  if (code < 16) return ANSI_16[code]
  if (code < 232) {
    const index = code - 16
    const b = index % 6
    const g = Math.floor(index / 6) % 6
    const r = Math.floor(index / 36)
    const val = (x) => (x === 0 ? 0 : x * 40 + 55)
    return rgbToHex(val(r), val(g), val(b))
  }
  const gray = (code - 232) * 10 + 8
  return rgbToHex(gray, gray, gray)
}

export function rgbToHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return ('#' + c(r) + c(g) + c(b)).toUpperCase()
}

export function hexToRgb(hex) {
  let t = String(hex || '').trim()
  if (t[0] === '#') t = t.slice(1)
  if (t.length === 3) t = t.split('').map((x) => x + x).join('')
  if (t.length === 4) t = t.split('').map((x) => x + x).join('')
  const n = parseInt(t, 16)
  if (t.length === 8) return { r: (n >>> 24) & 255, g: (n >>> 16) & 255, b: (n >>> 8) & 255, a: n & 255 }
  return { r: (n >>> 16) & 255, g: (n >>> 8) & 255, b: n & 255, a: 255 }
}

// 提亮/压暗：f>0 向白混合，f<0 向黑混合
export function shade(hex, f) {
  const { r, g, b } = hexToRgb(hex)
  const target = f >= 0 ? 255 : 0
  const k = Math.abs(f)
  return rgbToHex(r + (target - r) * k, g + (target - g) * k, b + (target - b) * k)
}

// 带透明度（输出 rgba()）
export function withAlpha(hex, a) {
  const { r, g, b } = hexToRgb(hex)
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'
}

// 对比文字色：亮底→深字，暗底→浅字
export function contrastText(hex) {
  const { r, g, b } = hexToRgb(hex)
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luma > 0.6 ? '#141414' : '#F4F4F5'
}

const HEX_RE = /^#([0-9a-fA-F]{3,8})$/

export function resolveColor(ref, defs, theme, mode, chain) {
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
export function resolveThemeColors(json, mode) {
  const m = mode || 'dark'
  const defs = (json && json.defs) || {}
  const theme = (json && json.theme) || {}
  const out = {}
  for (const key of Object.keys(theme)) {
    if (key === 'thinkingOpacity') continue
    try {
      out[key] = resolveColor(theme[key], defs, theme, m, [])
    } catch (e) {
      out[key] = { __error: e.message }
    }
  }
  // opencode 同款兜底：selectedListItemText 缺省=background；backgroundMenu 缺省=backgroundElement
  if (out.selectedListItemText === undefined) out.selectedListItemText = out.background
  if (out.backgroundMenu === undefined) out.backgroundMenu = out.backgroundElement
  return out
}

// 收集解析失败清单（供调用方告警/测试）
export function collectErrors(colors) {
  const out = []
  for (const key of Object.keys(colors)) {
    const v = colors[key]
    if (v && typeof v === 'object' && v.__error) out.push(key + ': ' + v.__error)
  }
  return out
}