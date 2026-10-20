// scan_precedent.ts — 读仓库全部 60 套主题，查「浅底 + 亮 primary」是否有先例。
// 只读：只 import 仓库引擎，不写任何仓库文件。
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { resolveThemeColors, contrastRatio } from 'file:///D:/dsh-plugin/dsh-opencode-palette/src/engine/resolve.ts'

const REPO = 'D:/dsh-plugin/dsh-opencode-palette'

function luma(hex: string): number {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

interface Row { id: string; kind: string; app: string; primary: string; background: string; ratio: number; luma: number }
const rows: Row[] = []

for (const f of readdirSync(join(REPO, 'src/themes')).filter(x => x.endsWith('.json'))) {
  const json = JSON.parse(readFileSync(join(REPO, 'src/themes', f), 'utf8'))
  const res = resolveThemeColors(json, 'dark')
  const p = res.primary, bg = res.background
  if (typeof p !== 'string' || typeof bg !== 'string' || !p.startsWith('#') || !bg.startsWith('#')) continue
  rows.push({ id: f.replace(/\.json$/, ''), kind: 'preset', app: 'dark*', primary: p, background: bg, ratio: Math.round(contrastRatio(p, bg) * 100) / 100, luma: Math.round(luma(p) * 1000) / 1000 })
}
for (const f of readdirSync(join(REPO, 'src/custom-presets')).filter(x => x.endsWith('.json'))) {
  const json = JSON.parse(readFileSync(join(REPO, 'src/custom-presets', f), 'utf8'))
  const c = json.colors
  const p = c.primary, bg = c.background
  if (typeof p !== 'string' || typeof bg !== 'string') continue
  rows.push({ id: f.replace(/\.json$/, ''), kind: 'ip', app: json.appearance, primary: p, background: bg, ratio: Math.round(contrastRatio(p, bg) * 100) / 100, luma: Math.round(luma(p) * 1000) / 1000 })
}

const light = rows.filter(r => r.app === 'light')
console.log('=== 浅色主题 ' + light.length + ' 套，按 primary@background 对比度降序 ===')
for (const r of light.slice().sort((a, b) => b.ratio - a.ratio)) {
  console.log(`  ${r.id.padEnd(22)} primary=${r.primary.padEnd(9)} bg=${r.background.padEnd(9)} ratio=${String(r.ratio).padStart(6)}  luma=${r.luma}`)
}
console.log()
console.log('=== 浅色主题中 primary 最亮者（亮色 primary 是否有先例）===')
for (const r of light.slice().sort((a, b) => b.luma - a.luma).slice(0, 8)) {
  console.log(`  ${r.id.padEnd(22)} primary=${r.primary.padEnd(9)} luma=${r.luma}  ratio@bg=${r.ratio}`)
}
console.log()
console.log('=== #FFCB05 落在各浅色主题自己的 background 上 ===')
for (const r of light) {
  console.log(`  ${r.id.padEnd(22)} #FFCB05 @ ${r.background.padEnd(9)} = ${Math.round(contrastRatio('#FFCB05', r.background) * 100) / 100}`)
}
console.log()
const worstLight = light.slice().sort((a, b) => a.ratio - b.ratio)[0]
console.log(`浅色主题里 primary@background 最低的一对：${worstLight.id} ${worstLight.primary} @ ${worstLight.background} = ${worstLight.ratio}（门槛 3）`)
console.log('全部 60 套里 primary@background 最低：', rows.slice().sort((a, b) => a.ratio - b.ratio).slice(0, 3).map(r => `${r.id}=${r.ratio}`).join(' '))
