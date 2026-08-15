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
const COLS = 6, CW = 208, CH = 118, GAP = 12
// 标题区与卡片区分层：padY 预留标题高度，避免标题文字从卡片缝隙露出
const PAD_X = 18, PAD_Y = 76
const rows = Math.ceil(names.length / COLS)
const W = PAD_X * 2 + COLS * CW + (COLS - 1) * GAP
const H = PAD_Y + rows * CH + (rows - 1) * GAP + 18
const cards = names.map((n, i) => {
  const c = data[n]
  const col = i % COLS, row = Math.floor(i / COLS)
  const x = PAD_X + col * (CW + GAP), y = PAD_Y + row * (CH + GAP)
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
  '<text x="' + PAD_X + '" y="34" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="17" font-weight="700" fill="#f0f0f0">dsh-opencode-palette — 34 official opencode themes</text>',
  '<text x="' + PAD_X + '" y="54" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="12" fill="#8b8b95">faithful colors, one click · for DeepSeek Harness</text>',
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


// ── 3) 设置流程引导图（setup-panel.svg）：设置 → 插件 → 面板，真实配色 ──
const F = (s, size, weight, fill) => 'font-family="' + s + '" font-size="' + size + '" font-weight="' + weight + '" fill="' + fill + '"'
const SANS = '-apple-system,Segoe UI,Microsoft YaHei,PingFang SC,sans-serif'
const MONO = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace'
const BADGE = (x, y, n) => '<circle cx="' + x + '" cy="' + y + '" r="11" fill="#FAB283"/><text x="' + x + '" y="' + (y + 4.5) + '" text-anchor="middle" font-family="' + SANS + '" font-size="12" font-weight="700" fill="#140a1e">' + n + '</text>'

function chipSvg(x, y, name, w) {
  const c = data[name] || {}
  const bg = c.background || '#1c1c1e'
  const fg = c.text || '#c8c8d0'
  const bd = c.primary || '#555'
  return '<g>' +
    '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="26" rx="6" fill="' + bg + '" stroke="' + bd + '" stroke-opacity="0.7"/>' +
    (c.primary ? '<circle cx="' + (x + 12) + '" cy="' + (y + 13) + '" r="4.5" fill="' + c.primary + '"/>' : '') +
    '<text x="' + (x + 22) + '" y="' + (y + 17) + '" font-family="' + MONO + '" font-size="12" fill="' + fg + '">' + esc(name) + '</text>' +
    '</g>'
}

const SPW = 1000, SPH = 620
const setupDoc = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="' + SPW + '" height="' + SPH + '" viewBox="0 0 ' + SPW + ' ' + SPH + '">',
  '<rect width="100%" height="100%" fill="#0d0d0d"/>',
  // 左侧导航
  '<rect x="0" y="0" width="178" height="' + SPH + '" fill="#111111"/>',
  '<text x="20" y="40" font-family="' + SANS + '" font-size="15" font-weight="700" fill="#f0f0f0">DSH</text>',
  '<text x="20" y="92" font-family="' + SANS + '" font-size="13" fill="#8b8b95">常规</text>',
  '<text x="20" y="124" font-family="' + SANS + '" font-size="13" fill="#8b8b95">模型</text>',
  '<rect x="0" y="140" width="4" height="30" fill="#FAB283"/>',
  '<text x="20" y="160" font-family="' + SANS + '" font-size="13" font-weight="600" fill="#f0f0f0">插件</text>',
  '<text x="20" y="192" font-family="' + SANS + '" font-size="13" fill="#8b8b95">外观</text>',
  '<text x="20" y="224" font-family="' + SANS + '" font-size="13" fill="#8b8b95">语言 · 中文</text>',
  // 右侧：面板
  '<rect x="196" y="20" width="784" height="560" rx="14" fill="#101014" stroke="#27272a"/>',
  // 面板头
  '<text x="222" y="56" font-family="' + SANS + '" font-size="15" font-weight="700" fill="#f0f0f0">🎨 OpenCode 调色板</text>',
  '<text x="896" y="53" font-family="' + SANS + '" font-size="12" fill="#7fd88f">已启用</text>',
  '<rect x="924" y="42" width="36" height="20" rx="10" fill="rgba(250,178,131,0.4)"/><circle cx="949" cy="52" r="7" fill="#FAB283"/>',
  '<text x="222" y="82" font-family="' + SANS + '" font-size="12" fill="#8b8b95">34 款 opencode 官方配色主题，点击即切换</text>',
  // 排印行
  '<text x="222" y="120" font-family="' + SANS + '" font-size="11" fill="#a1a1aa">字体字号</text>',
  '<rect x="222" y="130" width="150" height="26" rx="6" fill="#1c1c1e" stroke="#333338"/>',
  '<rect x="226" y="134" width="72" height="18" rx="4" fill="rgba(255,255,255,0.14)"/><text x="234" y="147" font-family="' + SANS + '" font-size="11" fill="#f0f0f0">等宽（终端风）</text>',
  '<text x="308" y="147" font-family="' + SANS + '" font-size="11" fill="#8b8b95">常规（界面风）</text>',
  '<rect x="386" y="130" width="120" height="26" rx="6" fill="#1c1c1e" stroke="#333338"/><text x="400" y="147" font-family="' + SANS + '" font-size="11" fill="#f0f0f0">字号 13px ▾</text>',
  '<rect x="520" y="130" width="180" height="26" rx="6" fill="#1c1c1e" stroke="#333338"/><text x="534" y="147" font-family="' + MONO + '" font-size="11" fill="#f0f0f0">JetBrains Mono ▾</text>',
  // 主题区
  '<text x="222" y="192" font-family="' + SANS + '" font-size="11" fill="#a1a1aa">选择主题 · 34 款 · 按色系分组</text>',
  '<text x="222" y="224" font-family="' + SANS + '" font-size="12" fill="#c8c8d0">● 暖橙</text>',
  chipSvg(292, 208, 'opencode', 108), chipSvg(408, 208, 'orng', 90), chipSvg(506, 208, 'vesper', 96),
  '<text x="222" y="268" font-family="' + SANS + '" font-size="12" fill="#c8c8d0">● 冷蓝</text>',
  chipSvg(292, 252, 'tokyonight', 116), chipSvg(416, 252, 'dracula', 104), chipSvg(528, 252, 'catppuccin', 118), chipSvg(654, 252, 'nord', 86),
  '<text x="222" y="312" font-family="' + SANS + '" font-size="12" fill="#c8c8d0">● 青绿</text>',
  chipSvg(292, 296, 'matrix', 100), chipSvg(400, 296, 'gruvbox', 104), chipSvg(512, 296, 'osaka-jade', 112),
  '<text x="222" y="348" font-family="' + SANS + '" font-size="11" fill="#5c5c66">…共 34 款（暖橙 / 黄绿 / 青绿 / 青蓝 / 冷蓝 / 蓝紫 / 透明 / 特殊）</text>',
  // 步骤徽标与引导
  BADGE(196 + 16, 155, '1'), BADGE(196 + 16, 40, '2'), BADGE(620, 192 - 14, '3'),
  '<text x="70" y="600" text-anchor="middle" font-family="' + SANS + '" font-size="13" fill="#8b8b95">① 打开 设置 → ② 点开 插件 → ③ 在面板里选一个主题，界面立即换色</text>',
  '</svg>',
].join('\n')

// ── 4) 切换效果演示图（theme-switch.svg）：同一界面 × 3 主题 ──
function uiFrame(x, y, w, themeName) {
  const c = data[themeName] || {}
  const bg = c.background || '#101014'
  const panel = c.background || '#16161a'
  const text = c.text || '#d4d4d4'
  const muted = c.textMuted || c.text || '#8b8b95'
  const primary = c.primary || '#FAB283'
  const keyword = c.syntaxKeyword || primary
  const str = c.syntaxString || '#7fd88f'
  const err = c.error || '#e06c75'
  const border = c.border || '#2a2a30'
  const mono = 'font-family="' + MONO + '"'
  const sans = 'font-family="' + SANS + '"'
  return '<g>' +
    '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="250" rx="12" fill="' + bg + '" stroke="' + border + '"/>' +
    // 标题栏
    '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="34" rx="12" fill="' + panel + '"/>' +
    '<circle cx="' + (x + 22) + '" cy="' + (y + 17) + '" r="6" fill="' + primary + '"/>' +
    '<text x="' + (x + 38) + '" y="' + (y + 21) + '" ' + sans + ' font-size="11" fill="' + muted + '">DeepSeek Harness</text>' +
    // 消息
    '<rect x="' + (x + 14) + '" y="' + (y + 48) + '" width="' + (w * 0.72) + '" height="34" rx="8" fill="' + panel + '" stroke="' + border + '"/>' +
    '<rect x="' + (x + 22) + '" y="' + (y + 59) + '" width="' + (w * 0.45) + '" height="5" rx="2.5" fill="' + muted + '" opacity="0.7"/>' +
    '<rect x="' + (x + 22) + '" y="' + (y + 69) + '" width="' + (w * 0.3) + '" height="5" rx="2.5" fill="' + muted + '" opacity="0.5"/>' +
    '<rect x="' + (x + w - 14 - w * 0.5) + '" y="' + (y + 92) + '" width="' + (w * 0.5) + '" height="26" rx="8" fill="' + primary + '" opacity="0.85"/>' +
    '<rect x="' + (x + w - 14 - w * 0.38) + '" y="' + (y + 100) + '" width="' + (w * 0.26) + '" height="5" rx="2.5" fill="' + bg + '" opacity="0.8"/>' +
    // 代码块
    '<rect x="' + (x + 14) + '" y="' + (y + 130) + '" width="' + (w - 28) + '" height="58" rx="8" fill="' + panel + '" stroke="' + border + '"/>' +
    '<text x="' + (x + 26) + '" y="' + (y + 152) + '" ' + mono + ' font-size="10.5" fill="' + keyword + '">const palette =</text>' +
    '<text x="' + (x + 26 + 108) + '" y="' + (y + 152) + '" ' + mono + ' font-size="10.5" fill="' + str + '">"tokyonight"</text>' +
    '<rect x="' + (x + 26) + '" y="' + (y + 160) + '" width="' + (w * 0.4) + '" height="5" rx="2.5" fill="' + muted + '" opacity="0.45"/>' +
    '<rect x="' + (x + 26) + '" y="' + (y + 172) + '" width="' + (w * 0.55) + '" height="5" rx="2.5" fill="' + muted + '" opacity="0.35"/>' +
    // 输入框
    '<rect x="' + (x + 14) + '" y="' + (y + 202) + '" width="' + (w - 28) + '" height="28" rx="8" fill="' + panel + '" stroke="' + border + '"/>' +
    '<text x="' + (x + 26) + '" y="' + (y + 220) + '" ' + sans + ' font-size="10.5" fill="' + muted + '" opacity="0.8">Ask anything…</text>' +
    '<circle cx="' + (x + w - 26) + '" cy="' + (y + 216) + '" r="8" fill="' + primary + '"/>' +
    // 主题名 + 主色
    '<text x="' + (x + w / 2) + '" y="' + (y + 268) + '" text-anchor="middle" ' + mono + ' font-size="12" font-weight="600" fill="' + text + '">' + esc(themeName) + '</text>' +
    '<text x="' + (x + w / 2) + '" y="' + (y + 284) + '" text-anchor="middle" ' + mono + ' font-size="10" fill="' + muted + '">primary ' + (primary || '—') + '</text>' +
    '</g>'
}

const TW = 1140, TH = 320
const themeSwitch = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="' + TW + '" height="' + TH + '" viewBox="0 0 ' + TW + ' ' + TH + '">',
  '<rect width="100%" height="100%" fill="#0d0d0d"/>',
  '<text x="18" y="30" font-family="' + SANS + '" font-size="15" font-weight="700" fill="#f0f0f0">Same interface, three themes</text>',
  uiFrame(18, 52, 356, 'opencode'),
  uiFrame(392, 52, 356, 'tokyonight'),
  uiFrame(766, 52, 356, 'matrix'),
  '</svg>',
].join('\n')

await writeFile(join(OUT_DIR, 'setup-panel.svg'), setupDoc)
await writeFile(join(OUT_DIR, 'theme-switch.svg'), themeSwitch)
console.log('[assets] setup-panel.svg ' + setupDoc.length + ' B')
console.log('[assets] theme-switch.svg ' + themeSwitch.length + ' B')
