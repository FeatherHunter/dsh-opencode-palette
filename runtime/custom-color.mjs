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
  const h = ((Number(hsv && hsv.h) % 360) + 360) % 360
  const s = Math.min(100, Math.max(0, Number(hsv && hsv.s) || 0)) / 100
  const v = Math.min(100, Math.max(0, Number(hsv && hsv.v) || 0)) / 100
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
  const to = (x) => Math.round(x * 255).toString(16).padStart(2, '0').toUpperCase()
  return '#' + to(r) + to(g) + to(b)
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
