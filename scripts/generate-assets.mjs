// scripts/generate-assets.mjs — 生成开源展示资产（真实主题色 SVG）
// 产出: assets/palette-matrix.svg（34 主题色板矩阵）· assets/palette-strips.svg（34 条语义色带）
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { themeNames, previewColors } from '../src/engine/index.mjs'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const OUT_DIR = join(ROOT, 'assets')
const names = themeNames()
const data = {}
for (const n of names) data[n] = previewColors(n)

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const hex = (v) => v || 'transparent'
const CHESS = '<pattern id="chess" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#161616"/><rect width="5" height="5" fill="#232323"/><rect x="5" y="5" width="5" height="5" fill="#232323"/></pattern>'

// ── 1) 色板矩阵 ──
const COLS = 6, CW = 208, CH = 118, GAP = 12, PAD = 18
const rows = Math.ceil(names.length / COLS)
const W = PAD * 2 + COLS * CW + (COLS - 1) * GAP
const H = PAD * 2 + rows * CH + (rows - 1) * GAP + 52
const cards = names.map((n, i) => {
  const c = data[n]
  const col = i % COLS, row = Math.floor(i / COLS)
  const x = PAD + col * (CW + GAP), y = PAD + row * (CH + GAP)
  const bg = c.background ? c.background : 'url(#chess)'
  const fg = c.text || '#c8c8d0'
  const border = c.primary || '#3a3a42'
  const sub = (cx, cy, color, r) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + hex(color) + '" stroke="rgba(0,0,0,0.35)" stroke-width="1"/>'
  return '<g>' +
    '<rect x="' + x + '" y="' + y + '" width="' + CW + '" height="' + CH + '" rx="10" fill="' + bg + '" stroke="' + border + '" stroke-opacity="0.55"/>' +
    '<text x="' + (x + 12) + '" y="' + (y + 26) + '" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="13" font-weight="600" fill="' + fg + '">' + esc(n) + '</text>' +
    sub(x + 12, y + CH - 18, c.primary, 7) +
    sub(x + 34, y + CH - 18, c.accent, 7) +
    '<text x="' + (x + 50) + '" y="' + (y + CH - 14) + '" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="10" fill="' + fg + '" opacity="0.75">' + esc(c.primary || 'transparent') + '</text>' +
    '</g>'
}).join('')

const matrix = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">',
  '<rect width="100%" height="100%" fill="#0d0d0d"/>',
  CHESS,
  '<text x="' + PAD + '" y="34" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="17" font-weight="700" fill="#f0f0f0">dsh-opencode-palette — 34 official opencode themes</text>',
  '<text x="' + PAD + '" y="54" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="12" fill="#8b8b95">faithful colors, one click · for DeepSeek Harness</text>',
  cards,
  '</svg>',
].join('\n')

// ── 2) 语义色带 ──
const STRIP_H = 30, NAME_W = 96, SEG_W = 78, ROW_GAP = 4, TOP = 66
const W2 = NAME_W + 7 * SEG_W + 40
const H2 = TOP + names.length * (STRIP_H + ROW_GAP) + 16
const segs = (y, c) => ['background', 'text', 'primary', 'accent', 'error', 'warning', 'success'].map((k, j) => {
  const v = c[k]
  const fill = v ? v : 'url(#chess)'
  return '<rect x="' + (NAME_W + 20 + j * SEG_W) + '" y="' + y + '" width="' + (SEG_W - 2) + '" height="' + STRIP_H + '" rx="3" fill="' + fill + '" stroke="rgba(255,255,255,0.06)"/>'
}).join('')
const strips = names.map((n, i) => {
  const c = data[n]
  const y = TOP + i * (STRIP_H + ROW_GAP)
  const fg = c.text || '#c8c8d0'
  return '<g>' +
    '<text x="10" y="' + (y + STRIP_H - 8) + '" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="11.5" fill="' + fg + '">' + esc(n) + '</text>' +
    segs(y, c) +
    '</g>'
}).join('')
const stripDoc = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="' + W2 + '" height="' + H2 + '" viewBox="0 0 ' + W2 + ' ' + H2 + '">',
  '<rect width="100%" height="100%" fill="#0d0d0d"/>',
  CHESS,
  '<text x="10" y="30" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="17" font-weight="700" fill="#f0f0f0">Every theme, decomposed</text>',
  '<text x="10" y="50" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="12" fill="#8b8b95">bg · text · primary · accent · error · warning · success — resolved from opencode v1.18.12</text>',
  strips,
  '</svg>',
].join('\n')

await mkdir(OUT_DIR, { recursive: true })
await writeFile(join(OUT_DIR, 'palette-matrix.svg'), matrix)
await writeFile(join(OUT_DIR, 'palette-strips.svg'), stripDoc)
console.log('[assets] palette-matrix.svg ' + matrix.length + ' B')
console.log('[assets] palette-strips.svg ' + stripDoc.length + ' B')
