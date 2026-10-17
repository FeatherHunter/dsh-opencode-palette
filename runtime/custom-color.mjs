// custom-color.mjs — 自定义主题编辑器的纯颜色工具（#86）
// 零导入：打包前后同一语义，可被 tests/custom-editor.test.mjs 直接 import。
// 算法口径对齐 prototypes/custom-editor-83.prototype.html（唯一真相源），
// 唯一改动：hexToHsv 保留浮点精度（原型 Math.round 会丢精度导致往返漂移），显示层自行取整。

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

// HEX 手写输入归一化：#RGB/#RRGGBB（容忍首尾空白）→ 大写 #RRGGBB；其余 null
export function normalizeHexInput(s) {
  if (typeof s !== 'string') return null
  const t = s.trim()
  if (!HEX_RE.test(t)) return null
  let h = t.slice(1)
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  return '#' + h.toUpperCase()
}

function byteTo01(byte) { return byte / 255 }

// #RRGGBB → { h: 0-360, s: 0-100, v: 0-100 }（浮点，不取整，保证 hsvToHex 往返）
export function hexToHsv(hex) {
  const n = normalizeHexInput(hex) || '#000000'
  const r = byteTo01(parseInt(n.slice(1, 3), 16))
  const g = byteTo01(parseInt(n.slice(3, 5), 16))
  const b = byteTo01(parseInt(n.slice(5, 7), 16))
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6)
    else if (max === g) h = 60 * ((b - r) / d + 2)
    else h = 60 * ((r - g) / d + 4)
  }
  if (h < 0) h += 360
  const s = max === 0 ? 0 : (d / max) * 100
  return { h: h, s: s, v: max * 100 }
}

// { h, s, v } → #RRGGBB（仅最终字节取整）
export function hsvToHex(hsv) {
  return rgbToHex(hsvToRgb(hsv))
}

// 本主题用过的颜色：保序去重，跳过 transparent 与非法值（原型 freq 口径）
export function distinctThemeColors(colors) {
  const out = []
  const seen = new Set()
  const c = colors || {}
  for (const k of Object.keys(c)) {
    const norm = normalizeHexInput(c[k])
    if (!norm || seen.has(norm)) continue
    seen.add(norm)
    out.push(norm)
  }
  return out
}

// 客户端 id 推导（宿主 CUSTOM_ID_PATTERN /^[A-Za-z0-9_-]{1,64}$/ 的子集）：
// 小写 ASCII，连续分隔符收敛为单连字符；中文/纯符号/空 → null（调用方转编辑态提示起名）
export function clientSlug(name) {
  if (typeof name !== 'string') return null
  let s = name.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '-').replace(/^-+|-+$/g, '')
  if (!s) return null
  if (s.length > 64) s = s.slice(0, 64).replace(/-+$/g, '')
  if (!s) return null
  return s
}

// 透明槽的预览生效色（原型 hexOrTrans 口径：custom-editor-83.prototype.html:612-615，逐字对齐）
export const SLOT_FB = {
  background: '#101014',
  backgroundPanel: '#232329',
  backgroundElement: '#232329',
  sidebarBg: '#1A1A1E',
  bubbleBg: '#232329',
  inputBg: '#1C1C21',
  codeBlockBg: '#16161A',
  codeHeaderBg: '#232329',
}
const SLOT_FB_DEFAULT = '#141414'

// 浅色底盘翻转（原型 FB_DARK2LIGHT 口径：custom-editor-83.prototype.html:808，逐字对齐）
export const SLOT_DARK2LIGHT = {
  '#1A1A1E': '#F4F4F5',
  '#232329': '#FFFFFF',
  '#101014': '#FFFFFF',
  '#16161A': '#F7F7F8',
  '#1C1C21': '#FFFFFF',
}

// 预览生效色（原型 slotBg 口径：只有 transparent 才回退/翻转，非透明原值直出）
export function effectiveSlotColor(key, colors, miniLight) {
  const c = colors ? colors[key] : undefined
  const norm = normalizeHexInput(c)
  if (norm) return norm
  const fb = SLOT_FB[key] || SLOT_FB_DEFAULT
  if (miniLight) return SLOT_DARK2LIGHT[fb] || '#FFFFFF'
  return fb
}

// 编辑器预览底盘：跟编辑器外观走，不跟 OS（原型 effAppearance 口径：prototype.html:809-820）。
// appearance 恒 light → 浅；恒 dark → 深；system → 看 sysDark（OS 深色？深：浅）。
export function editorMiniLight(appearance, sysDark) {
  if (appearance === 'light') return true
  if (appearance === 'dark') return false
  return sysDark === false
}

// 搜索过滤：name/id 子串（大小写不敏感）；空串全回（+新增由调用方始终保留）
export function filterCustomThemes(list, query) {
  const arr = Array.isArray(list) ? list : []
  const q = String(query || '').trim().toLowerCase()
  if (!q) return arr.slice()
  return arr.filter(function (t) {
    const name = String((t && t.name) || '').toLowerCase()
    const id = String((t && t.id) || '').toLowerCase()
    return name.indexOf(q) >= 0 || id.indexOf(q) >= 0
  })
}

// ── #95 取色器重构：颜色模型纯函数（零依赖，TDD 接缝）──

function clampNum(x, lo, hi) {
  const n = Number(x)
  if (!isFinite(n)) return lo
  return Math.min(hi, Math.max(lo, n))
}

function clampByte(x) { return Math.round(clampNum(x, 0, 255)) }

// 从外部 hex 回填 HSV 时保留「无意义的维度」（R1）：V=0（黑）时 h 与 s 都无意义、S=0（灰）时 h 无意义。
// 这是「拖到黑/灰后色相回弹成红」的根治：色相由状态保留，不靠 hex 反推。
export function mergeHsv(prev, next) {
  const p = prev || {}
  const n = next || {}
  const v = clampNum(n.v, 0, 100)
  const s = v === 0 ? clampNum(p.s, 0, 100) : clampNum(n.s, 0, 100)
  const h = (v === 0 || s === 0) ? clampNum(p.h, 0, 360) : clampNum(n.h, 0, 360)
  return { h: h, s: s, v: v }
}

// 宽松 HEX 解析（#95 粘贴/吸管/输入共用）：容忍首尾空白、全角 ＃、缺 #、#RGB、#RGBA、#RRGGBBAA。
// 返回 { hex: '#RRGGBB', alphaDropped }；无法解析返回 null。
export function parseHexInputLoose(s) {
  if (typeof s !== 'string') return null
  const t0 = s.trim().replace(/＃/g, '#').replace(/#/g, '').replace(/\s+/g, '')
  if (!/^[0-9a-fA-F]+$/.test(t0)) return null
  let t = t0
  let alphaDropped = false
  if (t.length === 8) { t = t.slice(0, 6); alphaDropped = true }
  else if (t.length === 4) { t = t.slice(0, 3); alphaDropped = true }
  if (t.length === 3) t = t[0] + t[0] + t[1] + t[1] + t[2] + t[2]
  if (t.length !== 6) return null
  return { hex: '#' + t.toUpperCase(), alphaDropped: alphaDropped }
}

// { h, s, v } → { r, g, b }（0-255 整数）
export function hsvToRgb(hsv) {
  const h = ((Number(hsv && hsv.h) % 360) + 360) % 360
  const s = clampNum(hsv && hsv.s, 0, 100) / 100
  const v = clampNum(hsv && hsv.v, 0, 100) / 100
  const i = Math.floor(h / 60)
  const f = h / 60 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  let r = 0
  let g = 0
  let b = 0
  const m = ((i % 6) + 6) % 6
  if (m === 0) { r = v; g = t; b = p }
  else if (m === 1) { r = q; g = v; b = p }
  else if (m === 2) { r = p; g = v; b = t }
  else if (m === 3) { r = p; g = q; b = v }
  else if (m === 4) { r = t; g = p; b = v }
  else { r = v; g = p; b = q }
  return { r: clampByte(r * 255), g: clampByte(g * 255), b: clampByte(b * 255) }
}

// { r, g, b }（0-255）→ { h: 0-360 浮点, s: 0-100, v: 0-100 }
export function rgbToHsv(rgb) {
  const r = clampByte(rgb && rgb.r) / 255
  const g = clampByte(rgb && rgb.g) / 255
  const b = clampByte(rgb && rgb.b) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6)
    else if (max === g) h = 60 * ((b - r) / d + 2)
    else h = 60 * ((r - g) / d + 4)
  }
  if (h < 0) h += 360
  const s = max === 0 ? 0 : (d / max) * 100
  return { h: h, s: s, v: max * 100 }
}

// { r, g, b }（0-255）→ #RRGGBB
export function rgbToHex(rgb) {
  const to = (x) => clampByte(x).toString(16).padStart(2, '0').toUpperCase()
  return '#' + to(rgb && rgb.r) + to(rgb && rgb.g) + to(rgb && rgb.b)
}

// getComputedStyle 的 'rgb()/rgba()' → hex；透明（alpha=0）返回 null（吸管降级路径用）。
export function rgbStringToHex(s) {
  if (typeof s !== 'string') return null
  const m = s.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*(?:,\s*([0-9.]+)\s*)?\)$/i)
  if (!m) return null
  if (m[4] !== undefined && Number(m[4]) === 0) return null
  return rgbToHex({ r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) })
}

// { h, s, v } → { h, s, l }（s/l 为 0-100）
export function hsvToHsl(hsv) {
  const h = ((Number(hsv && hsv.h) % 360) + 360) % 360
  const s = clampNum(hsv && hsv.s, 0, 100) / 100
  const v = clampNum(hsv && hsv.v, 0, 100) / 100
  const l = v * (1 - s / 2)
  const sl = (l === 0 || l === 1) ? 0 : (v - l) / Math.min(l, 1 - l)
  return { h: h, s: sl * 100, l: l * 100 }
}

// { h, s, l }（s/l 为 0-100）→ { h, s, v }
export function hslToHsv(hsl) {
  const h = ((Number(hsl && hsl.h) % 360) + 360) % 360
  const s = clampNum(hsl && hsl.s, 0, 100) / 100
  const l = clampNum(hsl && hsl.l, 0, 100) / 100
  const v = l + s * Math.min(l, 1 - l)
  const sv = v === 0 ? 0 : 2 * (1 - l / v)
  return { h: h, s: sv * 100, v: v * 100 }
}

// 色相轨的 13 个 30° 停（0/30/…/360），用「当前 S/V」生成真实渐变（不是纯色相条，R4 缓解）。
export function hueStops(s, v) {
  const out = []
  for (let i = 0; i < 13; i++) out.push(hsvToHex({ h: i * 30, s: s, v: v }))
  return out
}

// WCAG 相对亮度与对比度（只提示、不自动改色）。
export function relativeLuminance(hex) {
  const n = normalizeHexInput(hex) || '#000000'
  const chan = function (c) {
    const x = c / 255
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  }
  const r = chan(parseInt(n.slice(1, 3), 16))
  const g = chan(parseInt(n.slice(3, 5), 16))
  const b = chan(parseInt(n.slice(5, 7), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(hexA, hexB) {
  const a = relativeLuminance(hexA)
  const b = relativeLuminance(hexB)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

// 对比度基准槽：文字对背景、背景槽反过来对文字、其余（品牌/语法/边框/改动/Markdown）对面板。
const BG_SLOTS = [
  'background', 'backgroundPanel', 'backgroundElement', 'sidebarBg',
  'bubbleBg', 'inputBg', 'codeBlockBg', 'codeHeaderBg',
]
export function contrastRefSlot(slotKey) {
  if (slotKey === 'text' || slotKey === 'textMuted') return 'background'
  if (BG_SLOTS.indexOf(slotKey) >= 0) return 'text'
  return 'backgroundPanel'
}

// 「本主题用过的颜色」：按分组优先级取前 max 个（R7：品牌/语法色不再被 8 个背景色挤掉），
// 跳过当前槽自身的现值；入参 priorityKeys 为按优先级排好的色位 key 列表。
export function pickRecentColors(colors, currentKey, priorityKeys, max) {
  const c = colors || {}
  const lim = max > 0 ? max : 10
  const out = []
  const seen = new Set()
  const consider = function (k) {
    if (k === currentKey) return
    const norm = normalizeHexInput(c[k])
    if (!norm || seen.has(norm)) return
    seen.add(norm)
    out.push(norm)
  }
  const order = Array.isArray(priorityKeys) ? priorityKeys : []
  for (let i = 0; i < order.length; i++) consider(order[i])
  const keys = Object.keys(c)
  for (let i = 0; i < keys.length; i++) consider(keys[i])
  return out.slice(0, lim)
}
