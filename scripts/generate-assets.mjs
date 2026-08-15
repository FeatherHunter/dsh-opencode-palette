// scripts/generate-assets.mjs — 生成开源展示资产（真实主题色 SVG，中英双语）
// 产出 assets/: palette-matrix-{en,zh}.svg · palette-strips-{en,zh}.svg
//            setup-panel-{en,zh}.svg · theme-switch-{en,zh}.svg
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
const SANS = '-apple-system,Segoe UI,Microsoft YaHei,PingFang SC,sans-serif'
const MONO = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace'

// ── 双语文案表 ──
const L = {
  en: {
    matrixTitle: 'All 34 themes · official opencode colors',
    matrixSub: 'click any theme — the whole interface re-skins instantly',
    stripsTitle: 'Every theme, decomposed',
    stripsSub: 'bg · text · primary · accent · error · warning · success — the 7 colors that define each theme',
    panelName: 'Opencode Palette',
    enabled: 'Enabled',
    subtitle: '34 official opencode themes — click to switch',
    typography: 'Typography',
    mono: 'Monospace (terminal)',
    sans: 'Regular (UI)',
    fontSize: 'Font size 13px',
    codeFont: 'JetBrains Mono',
    themeSection: 'Themes · 34 · by color family',
    groupWarm: 'Warm', groupCool: 'Cool blue', groupTeal: 'Teal',
    groupsMore: '…34 themes total (warm / yellow-green / teal / cyan-blue / cool-blue / violet / transparent / special)',
    step1: '1 Open Settings', step2: '2 Open Plugins', step3: '3 Pick a theme — the UI re-skins instantly',
    switchTitle: 'Same interface, three themes',
    ask: 'Ask anything…',
    heroTitle: 'One interface. 34 looks.',
    heroSub: 'The complete opencode palette for DeepSeek Harness — every theme, one click away',
    heroMorePre: 'opencode · tokyonight · synthwave84 — ',
    heroMoreHi: '+31 more',
    heroMorePost: ' — all official, all one click',
  },
  zh: {
    matrixTitle: '34 款主题 · 全部官方配色',
    matrixSub: '点击任意一款，整个界面立即换上它的配色',
    stripsTitle: '每个主题，逐一拆解',
    stripsSub: '背景 · 文字 · 主色 · 强调 · 错误 · 警告 · 成功 —— 定义每个主题气质的 7 种颜色',
    panelName: 'OpenCode 调色板',
    enabled: '已启用',
    subtitle: '34 款 opencode 官方配色主题，点击即切换',
    typography: '字体字号',
    mono: '等宽（终端风）',
    sans: '常规（界面风）',
    fontSize: '字号 13px',
    codeFont: 'JetBrains Mono',
    themeSection: '选择主题 · 34 款 · 按色系分组',
    groupWarm: '暖橙', groupCool: '冷蓝', groupTeal: '青绿',
    groupsMore: '…共 34 款（暖橙 / 黄绿 / 青绿 / 青蓝 / 冷蓝 / 蓝紫 / 透明 / 特殊）',
    step1: '① 打开 设置', step2: '② 点开 插件', step3: '③ 在面板里选一个主题，界面立即换色',
    switchTitle: '同一界面，三种主题',
    ask: '问点什么…',
    heroTitle: '一个界面，34 种风格',
    heroSub: '把 opencode 的整套官方调色板搬进 DeepSeek Harness —— 每一款，一键切换',
    heroMorePre: 'opencode · tokyonight · synthwave84 —— ',
    heroMoreHi: '还有 31 款',
    heroMorePost: '，全部官方配色，全部一键切换',
  },
}

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

// ── palette-matrix ──（玻璃拟态墙：柔光斑背景 + 半透明卡片 + 主色顶条 + 语义色微条）
function matrixDoc(lang) {
  const T = L[lang]
  const COLS = 6, CW = 196, CH = 88, GAP = 12, PAD_X = 20, PAD_Y = 110
  const rows = Math.ceil(names.length / COLS)
  const W = PAD_X * 2 + COLS * CW + (COLS - 1) * GAP
  const H = PAD_Y + rows * CH + (rows - 1) * GAP + 20
  const blobs = ['#FAB283', '#9D7CD8', '#56B6C2', '#FF7EDB'].map((col, i) =>
    '<radialGradient id="blob' + i + '" cx="' + (18 + i * 22) + '%" cy="' + (12 + (i % 2) * 40) + '%" r="34%"><stop offset="0%" stop-color="' + col + '" stop-opacity="' + (0.10 - i * 0.015) + '"/><stop offset="100%" stop-color="' + col + '" stop-opacity="0"/></radialGradient>'
  ).join('')
  const cards = names.map((n, i) => {
    const c = data[n]
    const col = i % COLS, row = Math.floor(i / COLS)
    const x = PAD_X + col * (CW + GAP), y = PAD_Y + row * (CH + GAP)
    const strip = ['primary', 'accent', 'error', 'warning', 'success'].map((k, j) =>
      '<rect x="' + (x + 14 + j * 34) + '" y="' + (y + CH - 16) + '" width="30" height="4" rx="2" fill="' + hex(c[k]) + '"/>'
    ).join('')
    return '<g>' +
      '<rect x="' + x + '" y="' + y + '" width="' + CW + '" height="' + CH + '" rx="14" fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.09)"/>' +
      '<rect x="' + x + '" y="' + y + '" width="' + CW + '" height="3" rx="1.5" fill="' + hex(c.primary) + '"/>' +
      '<text x="' + (x + 14) + '" y="' + (y + 26) + '" font-family="' + MONO + '" font-size="12" font-weight="600" fill="#e2e2e8">' + esc(n) + '</text>' +
      strip +
      '</g>'
  }).join('')
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">',
    '<defs>' + blobs + '</defs>',
    '<rect width="100%" height="100%" fill="#0a0a0a"/>',
    '<rect width="100%" height="100%" fill="url(#blob0)"/><rect width="100%" height="100%" fill="url(#blob1)"/><rect width="100%" height="100%" fill="url(#blob2)"/><rect width="100%" height="100%" fill="url(#blob3)"/>',
    '<text x="' + PAD_X + '" y="52" font-family="' + SANS + '" font-size="24" font-weight="700" fill="#f0f0f0">' + esc(T.matrixTitle) + '</text>',
    '<text x="' + PAD_X + '" y="76" font-family="' + SANS + '" font-size="13" fill="#8b8b95">' + esc(T.matrixSub) + '</text>',
    cards,
    '</svg>',
  ].join('\n')
}
// ── palette-strips ──
function stripsDoc(lang) {
  const T = L[lang]
  const STRIP_H = 30, NAME_W = 96, SEG_W = 78, ROW_GAP = 4, TOP = 66
  const W2 = NAME_W + 7 * SEG_W + 40
  const H2 = TOP + names.length * (STRIP_H + ROW_GAP) + 16
  const segs = (y, c) => ['background', 'text', 'primary', 'accent', 'error', 'warning', 'success'].map((k, j) => {
    const v = c[k]
    return '<rect x="' + (NAME_W + 20 + j * SEG_W) + '" y="' + y + '" width="' + (SEG_W - 2) + '" height="' + STRIP_H + '" rx="3" fill="' + (v ? v : 'url(#chess)') + '" stroke="rgba(255,255,255,0.06)"/>'
  }).join('')
  const strips = names.map((n, i) => {
    const c = data[n]
    const y = TOP + i * (STRIP_H + ROW_GAP)
    return '<g>' +
      '<text x="10" y="' + (y + STRIP_H - 8) + '" font-family="' + MONO + '" font-size="11.5" fill="' + (c.text || '#c8c8d0') + '">' + esc(n) + '</text>' +
      segs(y, c) +
      '</g>'
  }).join('')
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + W2 + '" height="' + H2 + '" viewBox="0 0 ' + W2 + ' ' + H2 + '">',
    '<rect width="100%" height="100%" fill="#0d0d0d"/>',
    CHESS,
    '<text x="10" y="30" font-family="' + SANS + '" font-size="17" font-weight="700" fill="#f0f0f0">' + esc(T.stripsTitle) + '</text>',
    '<text x="10" y="50" font-family="' + SANS + '" font-size="12" fill="#8b8b95">' + esc(T.stripsSub) + '</text>',
    strips,
    '</svg>',
  ].join('\n')
}

// ── setup-panel ──
function setupDoc(lang) {
  const T = L[lang]
  // SPH=590：面板 20-580，步骤文字在面板内 545，底部留 10px
  const SPW = 1000, SPH = 590
  const badge = (x, y, n) => '<circle cx="' + x + '" cy="' + y + '" r="11" fill="#FAB283"/><text x="' + x + '" y="' + (y + 4.5) + '" text-anchor="middle" font-family="' + SANS + '" font-size="12" font-weight="700" fill="#140a1e">' + n + '</text>'
  const nav = (zh, en) => lang === 'zh' ? zh : en
  // 正文样式按钮宽度按语言自适应（等宽字体 11px 约 6.6px/字符）
  const monoW = lang === 'zh' ? 88 : 136
  const sansW = lang === 'zh' ? 88 : 92
  const btnX2 = 222 + monoW + 6
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + SPW + '" height="' + SPH + '" viewBox="0 0 ' + SPW + ' ' + SPH + '">',
    '<rect width="100%" height="100%" fill="#0d0d0d"/>',
    '<rect x="0" y="0" width="178" height="' + SPH + '" fill="#111111"/>',
    '<text x="20" y="40" font-family="' + SANS + '" font-size="15" font-weight="700" fill="#f0f0f0">DSH</text>',
    '<text x="20" y="92" font-family="' + SANS + '" font-size="13" fill="#8b8b95">' + nav('常规', 'General') + '</text>',
    '<text x="20" y="124" font-family="' + SANS + '" font-size="13" fill="#8b8b95">' + nav('模型', 'Models') + '</text>',
    '<rect x="0" y="140" width="4" height="30" fill="#FAB283"/>',
    '<text x="20" y="160" font-family="' + SANS + '" font-size="13" font-weight="600" fill="#f0f0f0">' + nav('插件', 'Plugins') + '</text>',
    '<text x="20" y="192" font-family="' + SANS + '" font-size="13" fill="#8b8b95">' + nav('外观', 'Appearance') + '</text>',
    '<text x="20" y="224" font-family="' + SANS + '" font-size="13" fill="#8b8b95">' + nav('语言 · 中文', 'Language · English') + '</text>',
    '<rect x="196" y="20" width="784" height="560" rx="14" fill="#101014" stroke="#27272a"/>',
    '<text x="222" y="56" font-family="' + SANS + '" font-size="15" font-weight="700" fill="#f0f0f0">🎨 ' + esc(T.panelName) + '</text>',
    '<text x="916" y="53" text-anchor="end" font-family="' + SANS + '" font-size="12" fill="#7fd88f">' + T.enabled + '</text>',
    '<rect x="924" y="42" width="36" height="20" rx="10" fill="rgba(250,178,131,0.4)"/><circle cx="949" cy="52" r="7" fill="#FAB283"/>',
    '<text x="222" y="82" font-family="' + SANS + '" font-size="12" fill="#8b8b95">' + esc(T.subtitle) + '</text>',
    '<text x="222" y="120" font-family="' + SANS + '" font-size="11" fill="#a1a1aa">' + T.typography + '</text>',
    // 正文样式：两个独立按钮（选中态高亮），文字各自在框内
    '<rect x="222" y="130" width="' + monoW + '" height="26" rx="6" fill="rgba(255,255,255,0.08)" stroke="#3a3a42"/>',
    '<rect x="226" y="134" width="' + (monoW - 8) + '" height="18" rx="4" fill="rgba(255,255,255,0.16)"/><text x="232" y="147" font-family="' + SANS + '" font-size="11" fill="#f0f0f0">' + T.mono + '</text>',
    '<rect x="' + btnX2 + '" y="130" width="' + sansW + '" height="26" rx="6" fill="#1c1c1e" stroke="#333338"/>',
    '<text x="' + (btnX2 + 8) + '" y="147" font-family="' + SANS + '" font-size="11" fill="#8b8b95">' + T.sans + '</text>',
    '<rect x="' + (btnX2 + sansW + 8) + '" y="130" width="120" height="26" rx="6" fill="#1c1c1e" stroke="#333338"/><text x="' + (btnX2 + sansW + 22) + '" y="147" font-family="' + SANS + '" font-size="11" fill="#f0f0f0">' + T.fontSize + ' ▾</text>',
    '<rect x="' + (btnX2 + sansW + 136) + '" y="130" width="180" height="26" rx="6" fill="#1c1c1e" stroke="#333338"/><text x="' + (btnX2 + sansW + 150) + '" y="147" font-family="' + MONO + '" font-size="11" fill="#f0f0f0">' + T.codeFont + ' ▾</text>',
    '<text x="222" y="192" font-family="' + SANS + '" font-size="11" fill="#a1a1aa">' + T.themeSection + '</text>',
    '<text x="222" y="224" font-family="' + SANS + '" font-size="12" fill="#c8c8d0">● ' + T.groupWarm + '</text>',
    chipSvg(292, 208, 'opencode', 108), chipSvg(408, 208, 'orng', 90), chipSvg(506, 208, 'vesper', 96),
    '<text x="222" y="268" font-family="' + SANS + '" font-size="12" fill="#c8c8d0">● ' + T.groupCool + '</text>',
    chipSvg(292, 252, 'tokyonight', 116), chipSvg(416, 252, 'dracula', 104), chipSvg(528, 252, 'catppuccin', 118), chipSvg(654, 252, 'nord', 86),
    '<text x="222" y="312" font-family="' + SANS + '" font-size="12" fill="#c8c8d0">● ' + T.groupTeal + '</text>',
    chipSvg(292, 296, 'matrix', 100), chipSvg(400, 296, 'gruvbox', 104), chipSvg(512, 296, 'osaka-jade', 112),
    '<text x="222" y="348" font-family="' + SANS + '" font-size="11" fill="#5c5c66">' + T.groupsMore + '</text>',
    badge(212, 155, '1'), badge(212, 40, '2'), badge(620, 178, '3'),
    // 步骤说明：置于面板内底部（左对齐，避免长文本越界）
    '<text x="222" y="545" font-family="' + SANS + '" font-size="13" fill="#8b8b95">' + T.step1 + ' → ' + T.step2 + ' → ' + T.step3 + '</text>',
    '</svg>',
  ].join('\n')
}

// ── theme-switch ──
function uiFrame(x, y, w, themeName, lang) {
  const T = L[lang]
  const c = data[themeName] || {}
  const bg = c.background || '#101014'
  const panel = c.background || '#16161a'
  const text = c.text || '#d4d4d4'
  const muted = c.textMuted || c.text || '#8b8b95'
  const primary = c.primary || '#FAB283'
  const keyword = c.syntaxKeyword || primary
  const border = c.border || '#2a2a30'
  return '<g>' +
    '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="250" rx="12" fill="' + bg + '" stroke="' + border + '"/>' +
    '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="34" rx="12" fill="' + panel + '"/>' +
    '<circle cx="' + (x + 22) + '" cy="' + (y + 17) + '" r="6" fill="' + primary + '"/>' +
    '<text x="' + (x + 38) + '" y="' + (y + 21) + '" font-family="' + SANS + '" font-size="11" fill="' + muted + '">DeepSeek Harness</text>' +
    '<rect x="' + (x + 14) + '" y="' + (y + 48) + '" width="' + (w * 0.72) + '" height="34" rx="8" fill="' + panel + '" stroke="' + border + '"/>' +
    '<rect x="' + (x + 22) + '" y="' + (y + 59) + '" width="' + (w * 0.45) + '" height="5" rx="2.5" fill="' + muted + '" opacity="0.7"/>' +
    '<rect x="' + (x + 22) + '" y="' + (y + 69) + '" width="' + (w * 0.3) + '" height="5" rx="2.5" fill="' + muted + '" opacity="0.5"/>' +
    '<rect x="' + (x + w - 14 - w * 0.5) + '" y="' + (y + 92) + '" width="' + (w * 0.5) + '" height="26" rx="8" fill="' + primary + '" opacity="0.85"/>' +
    '<rect x="' + (x + w - 14 - w * 0.38) + '" y="' + (y + 100) + '" width="' + (w * 0.26) + '" height="5" rx="2.5" fill="' + bg + '" opacity="0.8"/>' +
    '<rect x="' + (x + 14) + '" y="' + (y + 130) + '" width="' + (w - 28) + '" height="58" rx="8" fill="' + panel + '" stroke="' + border + '"/>' +
    '<text x="' + (x + 26) + '" y="' + (y + 152) + '" font-family="' + MONO + '" font-size="10.5" fill="' + keyword + '">const palette =</text>' +
    '<text x="' + (x + 26 + 108) + '" y="' + (y + 152) + '" font-family="' + MONO + '" font-size="10.5" fill="' + (c.syntaxString || '#7fd88f') + '">"tokyonight"</text>' +
    '<rect x="' + (x + 26) + '" y="' + (y + 160) + '" width="' + (w * 0.4) + '" height="5" rx="2.5" fill="' + muted + '" opacity="0.45"/>' +
    '<rect x="' + (x + 26) + '" y="' + (y + 172) + '" width="' + (w * 0.55) + '" height="5" rx="2.5" fill="' + muted + '" opacity="0.35"/>' +
    '<rect x="' + (x + 14) + '" y="' + (y + 202) + '" width="' + (w - 28) + '" height="28" rx="8" fill="' + panel + '" stroke="' + border + '"/>' +
    '<text x="' + (x + 26) + '" y="' + (y + 220) + '" font-family="' + SANS + '" font-size="10.5" fill="' + muted + '" opacity="0.8">' + T.ask + '</text>' +
    '<circle cx="' + (x + w - 26) + '" cy="' + (y + 216) + '" r="8" fill="' + primary + '"/>' +
    '<text x="' + (x + w / 2) + '" y="' + (y + 268) + '" text-anchor="middle" font-family="' + MONO + '" font-size="12" font-weight="600" fill="' + text + '">' + esc(themeName) + '</text>' +
    '<text x="' + (x + w / 2) + '" y="' + (y + 284) + '" text-anchor="middle" font-family="' + MONO + '" font-size="10" fill="' + muted + '">primary ' + (primary || '—') + '</text>' +
    '</g>'
}
function switchDoc(lang) {
  const T = L[lang]
  // TH=372：主题名 y=336、主色 y=354，320 会被裁剪；372 留足边距
  const TW = 1140, TH = 372
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + TW + '" height="' + TH + '" viewBox="0 0 ' + TW + ' ' + TH + '">',
    '<rect width="100%" height="100%" fill="#0d0d0d"/>',
    '<text x="18" y="30" font-family="' + SANS + '" font-size="15" font-weight="700" fill="#f0f0f0">' + esc(T.switchTitle) + '</text>',
    uiFrame(18, 52, 356, 'opencode', lang),
    uiFrame(392, 52, 356, 'tokyonight', lang),
    uiFrame(766, 52, 356, 'matrix', lang),
    '</svg>',
  ].join('\n')
}


// ── 5) Hero 首图（hero-{en,zh}.svg）：氛围光晕 + 3 个拟真界面并排 ──
function heroFrame(x, y, w, themeName) {
  const c = data[themeName] || {}
  const bg = c.background || '#101014'
  const panel = c.background || '#16161a'
  const text = c.text || '#d4d4d4'
  const muted = c.textMuted || c.text || '#8b8b95'
  const primary = c.primary || '#FAB283'
  const keyword = c.syntaxKeyword || primary
  const string = c.syntaxString || '#7fd88f'
  const number = c.syntaxNumber || keyword
  const border = c.border || '#2a2a30'
  const h = 300
  // 底部取色器式 swatch 行尺寸（色块 + 同色 HEX）
  const sw = 10, gapS = 5
  const hexTxt = primary || '—'
  const hexW = hexTxt.length * 6.6
  const rowW = sw + gapS + hexW
  const swX = x + w / 2 - rowW / 2
  const hexX = swX + sw + gapS
  const mono = 'font-family="' + MONO + '"'
  const sans = 'font-family="' + SANS + '"'
  const frameBody =
    // 界面卡片 + 投影
    '<defs><filter id="glow' + themeName + '" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000" flood-opacity="0.55"/></filter></defs>' +
    '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="16" fill="' + bg + '" stroke="' + border + '" filter="url(#glow' + themeName + ')"/>' +
    // 顶栏
    '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="40" rx="16" fill="' + panel + '"/>' +
    '<rect x="' + x + '" y="' + (y + 24) + '" width="' + w + '" height="16" fill="' + panel + '"/>' +
    '<circle cx="' + (x + 26) + '" cy="' + (y + 20) + '" r="7" fill="' + primary + '"/>' +
    '<text x="' + (x + 44) + '" y="' + (y + 25) + '" ' + sans + ' font-size="12.5" font-weight="600" fill="' + text + '">DeepSeek Harness</text>' +
    '<circle cx="' + (x + w - 24) + '" cy="' + (y + 20) + '" r="5" fill="' + muted + '" opacity="0.6"/>' +
    // assistant 消息（含代码块）
    '<rect x="' + (x + 16) + '" y="' + (y + 54) + '" width="' + (w * 0.78) + '" height="30" rx="9" fill="' + panel + '" stroke="' + border + '"/>' +
    '<circle cx="' + (x + 30) + '" cy="' + (y + 69) + '" r="6" fill="' + primary + '" opacity="0.8"/>' +
    '<rect x="' + (x + 44) + '" y="' + (y + 62) + '" width="' + (w * 0.4) + '" height="5" rx="2.5" fill="' + muted + '" opacity="0.7"/>' +
    '<rect x="' + (x + 44) + '" y="' + (y + 72) + '" width="' + (w * 0.28) + '" height="5" rx="2.5" fill="' + muted + '" opacity="0.45"/>' +
    // 代码块
    '<rect x="' + (x + 16) + '" y="' + (y + 92) + '" width="' + (w - 32) + '" height="92" rx="10" fill="' + bg + '" stroke="' + border + '"/>' +
    '<rect x="' + (x + 16) + '" y="' + (y + 92) + '" width="' + (w - 32) + '" height="24" rx="10" fill="' + panel + '"/>' +
    '<rect x="' + (x + 16) + '" y="' + (y + 106) + '" width="' + (w - 32) + '" height="10" fill="' + panel + '"/>' +
    '<circle cx="' + (x + 30) + '" cy="' + (y + 104) + '" r="3.5" fill="' + number + '" opacity="0.9"/>' +
    '<circle cx="' + (x + 42) + '" cy="' + (y + 104) + '" r="3.5" fill="' + muted + '" opacity="0.5"/>' +
    '<circle cx="' + (x + 54) + '" cy="' + (y + 104) + '" r="3.5" fill="' + muted + '" opacity="0.3"/>' +
    '<text x="' + (x + 24) + '" y="' + (y + 132) + '" ' + mono + ' font-size="11" fill="' + keyword + '">const theme</text>' +
    '<text x="' + (x + 24 + 92) + '" y="' + (y + 132) + '" ' + mono + ' font-size="11" fill="' + muted + '">=</text>' +
    '<text x="' + (x + 24 + 106) + '" y="' + (y + 132) + '" ' + mono + ' font-size="11" fill="' + string + '">"' + esc(themeName) + '"</text>' +
    '<text x="' + (x + 24) + '" y="' + (y + 150) + '" ' + mono + ' font-size="11" fill="' + muted + '" opacity="0.85">' + esc('syntax: { keyword, string, number }') + '</text>' +
    '<rect x="' + (x + 24) + '" y="' + (y + 162) + '" width="' + (w * 0.5) + '" height="5" rx="2.5" fill="' + muted + '" opacity="0.35"/>' +
    // 用户消息
    '<rect x="' + (x + w - 16 - w * 0.5) + '" y="' + (y + 194) + '" width="' + (w * 0.5) + '" height="28" rx="9" fill="' + primary + '" opacity="0.9"/>' +
    '<rect x="' + (x + w - 16 - w * 0.36) + '" y="' + (y + 203) + '" width="' + (w * 0.22) + '" height="5" rx="2.5" fill="' + bg + '" opacity="0.75"/>' +
    // 输入框
    '<rect x="' + (x + 16) + '" y="' + (y + 234) + '" width="' + (w - 32) + '" height="34" rx="10" fill="' + panel + '" stroke="' + border + '"/>' +
    '<circle cx="' + (x + 32) + '" cy="' + (y + 251) + '" r="4" fill="' + muted + '" opacity="0.5"/>' +
    '<rect x="' + (x + 44) + '" y="' + (y + 247) + '" width="' + (w * 0.45) + '" height="5" rx="2.5" fill="' + muted + '" opacity="0.45"/>' +
    '<circle cx="' + (x + w - 30) + '" cy="' + (y + 251) + '" r="9" fill="' + primary + '"/>' +
    '<path d="M ' + (x + w - 33) + ' ' + (y + 251) + ' l 4 -3 l 4 3 l -4 3 z" fill="' + bg + '" opacity="0.85"/>'
    // 底部：主题名 + 取色器式 swatch（色块 + 同色 HEX）
    return '<g>' + frameBody +
    '<text x="' + (x + w / 2) + '" y="' + (y + h + 34) + '" text-anchor="middle" ' + mono + ' font-size="14" font-weight="700" fill="' + text + '">' + esc(themeName) + '</text>' +
    '<rect x="' + swX + '" y="' + (y + h + 44) + '" width="' + sw + '" height="' + sw + '" rx="3" fill="' + primary + '" stroke="rgba(0,0,0,0.35)"/>' +
    '<text x="' + hexX + '" y="' + (y + h + 53) + '" ' + mono + ' font-size="11" fill="' + primary + '">' + esc(hexTxt) + '</text>' +
    '</g>'
}
function heroDoc(lang) {
  const T = L[lang]
  // HH=564：heroMore 基线 550 文字底约 556，底部仅留 8px 呼吸
  const HW = 1280, HH = 564
  const frameW = 372
  const gap = 26
  const total = 3 * frameW + 2 * gap
  const x0 = Math.round((HW - total) / 2)
  const y0 = 168
  // 氛围光晕（品牌橙/紫）
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + HW + '" height="' + HH + '" viewBox="0 0 ' + HW + ' ' + HH + '">',
    '<defs>',
    '<radialGradient id="haloOrange" cx="20%" cy="0%" r="60%"><stop offset="0%" stop-color="#FAB283" stop-opacity="0.16"/><stop offset="100%" stop-color="#FAB283" stop-opacity="0"/></radialGradient>',
    '<radialGradient id="haloViolet" cx="85%" cy="10%" r="55%"><stop offset="0%" stop-color="#9D7CD8" stop-opacity="0.14"/><stop offset="100%" stop-color="#9D7CD8" stop-opacity="0"/></radialGradient>',
    '<radialGradient id="haloTeal" cx="50%" cy="100%" r="65%"><stop offset="0%" stop-color="#56B6C2" stop-opacity="0.10"/><stop offset="100%" stop-color="#56B6C2" stop-opacity="0"/></radialGradient>',
    '<linearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#FAB283"/><stop offset="55%" stop-color="#9D7CD8"/><stop offset="100%" stop-color="#56B6C2"/></linearGradient>',
    '</defs>',
    '<rect width="100%" height="100%" fill="#0a0a0a"/>',
    '<rect width="100%" height="100%" fill="url(#haloOrange)"/>',
    '<rect width="100%" height="100%" fill="url(#haloViolet)"/>',
    '<rect width="100%" height="100%" fill="url(#haloTeal)"/>',
    // 小标签（品牌行，字距拉开，× 点缀橙色）
    '<text x="' + (HW / 2) + '" y="42" text-anchor="middle" font-family="' + SANS + '" font-size="11" letter-spacing="4" fill="#6d6d6d">DEEPSEEK HARNESS</text>',
    '<text x="' + (HW / 2 + 11) + '" y="42" text-anchor="middle" font-family="' + SANS + '" font-size="11" letter-spacing="2" fill="#FAB283">×</text>',
    '<text x="' + (HW / 2 + 60) + '" y="42" text-anchor="middle" font-family="' + SANS + '" font-size="11" letter-spacing="4" fill="#6d6d6d">OPENCODE</text>',
    // 主标语（渐变大字）
    '<text x="' + (HW / 2) + '" y="88" text-anchor="middle" font-family="' + SANS + '" font-size="42" font-weight="800" letter-spacing="1" fill="url(#titleGrad)">' + esc(T.heroTitle) + '</text>',
    // 副行（终端风：等宽 + 橙色 ▸ 引导）
    '<text x="' + (HW / 2) + '" y="124" text-anchor="middle" font-family="' + MONO + '" font-size="15" fill="#b0b0b8">',
    '<tspan fill="#FAB283">▸ </tspan>' + esc(T.heroSub) + '</text>',
    // 3 个拟真界面
    heroFrame(x0, y0, frameW, 'opencode'),
    heroFrame(x0 + frameW + gap, y0, frameW, 'tokyonight'),
    heroFrame(x0 + 2 * (frameW + gap), y0, frameW, 'synthwave84'),
    // 底部一行：终端风 + 数量高亮
    '<text x="' + (HW / 2) + '" y="' + (y0 + 300 + 82) + '" text-anchor="middle" font-family="' + MONO + '" font-size="13.5" fill="#8b8b95">',
    esc(T.heroMorePre) + '<tspan fill="#FAB283" font-weight="700">' + esc(T.heroMoreHi) + '</tspan>' + esc(T.heroMorePost) + '</text>',
    '</svg>',
  ].join('\n')
}

await mkdir(OUT_DIR, { recursive: true })
const files = {
  'palette-matrix-en.svg': matrixDoc('en'),
  'palette-matrix-zh.svg': matrixDoc('zh'),
  'palette-strips-en.svg': stripsDoc('en'),
  'palette-strips-zh.svg': stripsDoc('zh'),
  'setup-panel-en.svg': setupDoc('en'),
  'setup-panel-zh.svg': setupDoc('zh'),
  'theme-switch-en.svg': switchDoc('en'),
  'theme-switch-zh.svg': switchDoc('zh'),
  'hero-en.svg': heroDoc('en'),
  'hero-zh.svg': heroDoc('zh'),
}
for (const [name, content] of Object.entries(files)) {
  await writeFile(join(OUT_DIR, name), content)
  console.log('[assets] ' + name + ' ' + content.length + ' B')
}
