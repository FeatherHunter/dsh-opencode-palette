// 「宿主现实」核验：house 判尺没覆盖、但 doraemon 对抗式审查点名的真实宿主契约
import { readFileSync } from 'node:fs'
import { contrastRatio, mixHex, relativeLuminance } from './src/engine/resolve.ts'

const P = JSON.parse(readFileSync('D:/Temp/v2_palette.json', 'utf8'))

// rgba(...) 叠在 base 上 → 不透明 hex（复刻浏览器合成）
function flatten(rgba, base) {
  const m = String(rgba).match(/rgba?\((\d+),(\d+),(\d+),([\d.]+)\)/)
  if (!m) return String(rgba).toUpperCase()
  const [, r, g, b, a] = m.map(Number)
  const B = [1, 3, 5].map((i) => parseInt(base.slice(i, i + 2), 16))
  const F = [r, g, b]
  const out = F.map((v, i) => Math.round(v * a + B[i] * (1 - a)))
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
}
const A = (hex, a, base) => flatten(`rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`, base)

const bg = P.background
const rows = []
const add = (name, fg, b, need, note) => {
  const r = contrastRatio(fg, b)
  rows.push({ name, fg, b, r, need, ok: r >= need, note })
}

// ① doraemon：warning / success 同色 14% 底配同色 13px 字
add('warning @ warn-tertiary(warning@14% over bg)', P.warning, A(P.warning, 0.14, bg), 4.5, '13px 状态条文字')
add('success @ success-tertiary(success@14% over bg)', P.success, A(P.success, 0.14, bg), 4.5, '13px 状态条文字')
// ② doraemon：error 是 117 条规则的 12px 文字色
for (const s of ['background', 'backgroundPanel', 'backgroundElement', 'codeBlockBg', 'bubbleBg']) {
  add(`error @ ${s}（12px 文字色）`, P.error, P[s], 4.5, '宿主 117 条规则作 color: 用')
}
// ③ doraemon：info 是实心填充 + 宿主写死 #fff；另当 11px badge 文字色
add('info fill + 宿主写死 #fff', '#FFFFFF', P.info, 4.5, '.RlGAzG_primary{background:info;color:#fff}')
for (const s of ['background', 'backgroundPanel', 'backgroundElement']) {
  add(`info @ ${s}（11px badge 文字色）`, P.info, P[s], 4.5, '.mAtvLq_badge 11px')
}
// ④ secondary：全宿主唯一消费者是 8px 空闲圆点（非文字，3:1）
for (const s of ['background', 'backgroundPanel', 'backgroundElement']) {
  add(`secondary @ ${s}（8px 圆点）`, P.secondary, P[s], 3.0, 'state-idle-primary 唯一消费者')
}
// ⑤ primary：brand-text 4 处、0 处作 color: → 只当底色；宿主 focus-ring 走 primary 2px
add('primary @ background（focus ring 2px）', P.primary, bg, 3.0, '--dsw-focus-ring-color = primary 2px')
for (const s of ['background', 'backgroundPanel', 'backgroundElement']) {
  add(`primary @ ${s}（brand-text 实体）`, P.primary, P[s], 3.0, 'brand-text / button-primary-fill')
}
// ⑥ warning/error 的 hover 弱底
add('error @ interactive-bg-hover-danger(error@15% over bg)', P.error, A(P.error, 0.15, bg), 4.5, '危险 hover 底上的文字')
// ⑦ labelDimmed（textMuted@80%）在主表面
for (const s of ['background', 'backgroundPanel', 'backgroundElement']) {
  add(`labelDimmed @ ${s}`, A(P.textMuted, 0.8, P[s]), P[s], 4.5, 'withAlpha(textMuted,0.8)')
}

let fail = 0
for (const r of rows) {
  if (!r.ok) fail++
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.r.toFixed(2).padStart(6)}  (>=${r.need})  ${r.name}   [${r.fg} on ${r.b}]${r.note ? '  // ' + r.note : ''}`)
}
console.log(`\n共 ${rows.length} 对，违例 ${fail}`)
