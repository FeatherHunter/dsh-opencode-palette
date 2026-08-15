// prototypes/generate-combo-prototypes.mjs — A+B 组合体 × 3 版本（真实主题色）
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { themeNames, previewColors } from '../src/engine/index.mjs'
import { isSystem } from '../src/engine/registry.mjs'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const OUT = join(ROOT, 'prototypes', 'panel-prototypes-combo.html')

const names = themeNames()
const data = {}
for (const n of names) {
  const c = previewColors(n)
  data[n] = { bg: c.background, text: c.text, primary: c.primary, accent: c.accent }
}

// ── 色系细分（主色色相，蓝色家族拆成 青蓝/冷蓝/蓝紫）──
function hueOf(hex) {
  if (!hex) return -1
  const t = hex.replace('#', '')
  const r = parseInt(t.slice(0, 2), 16) / 255
  const g = parseInt(t.slice(2, 4), 16) / 255
  const b = parseInt(t.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return -2
  let h
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h *= 60
  if (h < 0) h += 360
  if (max === 0 ? 0 : d / max < 0.18) return -2
  return h
}
function groupOf(n) {
  if (isSystem(n)) return '特殊'
  if (data[n].bg === null) return '透明'
  const h = hueOf(data[n].primary)
  if (h === -2) return '中性'
  if (h < 35) return '暖橙'
  if (h < 90) return '黄绿'
  if (h < 160) return '青绿'
  if (h < 200) return '青蓝'
  if (h < 230) return '冷蓝'
  return '蓝紫'
}
const GROUP_ORDER = ['暖橙', '黄绿', '青绿', '青蓝', '冷蓝', '蓝紫', '中性', '透明', '特殊']
const GROUP_COLOR = {
  暖橙: '#FAB283', 黄绿: '#A7C080', 青绿: '#2DD5B7', 青蓝: '#88C0D0',
  冷蓝: '#82AAFF', 蓝紫: '#C4A7E7', 中性: '#9e9e9e', 透明: '#8b8b95', 特殊: '#8b8b95',
}
const groups = {}
for (const n of names) { const g = groupOf(n); (groups[g] = groups[g] || []).push(n) }
const orderedGroups = GROUP_ORDER.filter((g) => groups[g])

// ── 工具 ──
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const cssBg = (hex) => hex ? hex : 'repeating-conic-gradient(#3a3a3a 0% 25%, #222 0% 50%) 0 0/8px 8px'
const cssText = (hex) => hex || '#8b8b95'

function chipDot(n, cls) {
  const d = data[n]
  const sel = n === 'opencode' ? ' sel' : ''
  return '<button class="chip ' + cls + sel + '" style="' +
    'background:' + cssBg(d.bg) + ';color:' + cssText(d.text) + ';border-color:' + (d.primary || '#555') + '">' +
    (d.primary ? '<i class="dot" style="background:' + d.primary + '"></i>' : '') +
    '<span>' + esc(n) + '</span>' + (sel ? '<em class="tick">✓</em>' : '') + '</button>'
}
function chipSwatch(n) {
  const d = data[n]
  const sel = n === 'opencode' ? ' sel' : ''
  return '<button class="swatch' + sel + '" style="' +
    'background:' + cssBg(d.bg) + ';color:' + cssText(d.text) + '">' +
    '<i class="sq" style="background:' + (d.primary || '#555') + '"></i>' +
    '<span>' + esc(n) + '</span>' + (sel ? '<em class="tick">✓</em>' : '') + '</button>'
}

function groupLabel(g, v) {
  return '<div class="g-head' + (v === 3 ? ' flow' : '') + '">' +
    '<i class="g-dot" style="background:' + GROUP_COLOR[g] + '"></i>' + esc(g) +
    ' <span class="count">' + groups[g].length + '</span></div>'
}

function panelHead() {
  return '<div class="panel-head"><strong>🖥 Opencode TUI 主题 v2</strong>' +
    '<span class="status on">● 已启用</span></div>'
}
function controlsBlock() {
  return '<div class="sec"><div class="sec-title">排印调节 <span class="hint">与主题正交 · 字体非主题属性</span></div>' +
    '<div class="controls">' +
    '<div class="ctl"><span class="ctl-label">正文模式</span><div class="seg">' +
    '<button class="seg-btn on">全等宽（终端）</button><button class="seg-btn">无衬线（忠实）</button></div></div>' +
    '<div class="ctl"><span class="ctl-label">字号</span><div class="seg">' +
    '<button class="seg-btn">11</button><button class="seg-btn">12</button><button class="seg-btn on">13</button>' +
    '<button class="seg-btn">14</button><button class="seg-btn">15</button><button class="seg-btn">16</button>' +
    '<button class="seg-btn">17</button><button class="seg-btn">18</button></div></div>' +
    '<div class="ctl"><span class="ctl-label">代码字体</span>' +
    '<div class="fdrop"><div class="fdrop-head"><span style="font-family:JetBrains Mono,Consolas,monospace">JetBrains Mono</span><b>▾</b></div>' +
    '<div class="fdrop-menu">' +
    '<div class="fdrop-item on" style="font-family:JetBrains Mono,Consolas,monospace">JetBrains Mono — Aa 等宽</div>' +
    '<div class="fdrop-item" style="font-family:Cascadia Code,Consolas,monospace">Cascadia Code — Aa 等宽</div>' +
    '<div class="fdrop-item" style="font-family:Fira Code,Consolas,monospace">Fira Code — Aa 等宽</div>' +
    '<div class="fdrop-item" style="font-family:SF Mono,Menlo,monospace">SF Mono — Aa 等宽</div>' +
    '<div class="fdrop-item" style="font-family:Consolas,monospace">Consolas — Aa 等宽</div>' +
    '</div></div></div>' +
    '<div class="ctl"><span class="ctl-label">状态</span><label class="switch"><input type="checkbox" checked><i></i><span>启用风格</span></label></div>' +
    '</div></div>'
}

const combo1 = [
  '<div class="panel">', panelHead(),
  controlsBlock(),
  '<div class="sec"><div class="sec-title">主题选择 <span class="count">34 · 色系分组</span></div>',
  '<input class="search" placeholder="搜索主题…">',
  orderedGroups.map((g) => {
    return '<div class="group">' + groupLabel(g, 1) +
      '<div class="grid tight">' + groups[g].map((n) => chipDot(n, 'mini')).join('') + '</div></div>'
  }).join(''),
  '</div>',
  '</div>',
].join('')

const combo2 = [
  '<div class="panel">', panelHead(),
  controlsBlock(),
  '<div class="sec"><div class="sec-title">主题选择 <span class="count">34 · 色系卡片</span></div>',
  '<input class="search" placeholder="搜索主题…">',
  orderedGroups.map((g) => {
    return '<div class="card-group" style="border-top-color:' + GROUP_COLOR[g] + '">' +
      '<div class="cg-head"><i class="g-dot" style="background:' + GROUP_COLOR[g] + '"></i>' + esc(g) +
      ' <span class="count">' + groups[g].length + ' 款</span></div>' +
      '<div class="grid">' + groups[g].map((n) => chipDot(n, '')).join('') + '</div></div>'
  }).join(''),
  '</div>',
  '</div>',
].join('')

const combo3 = [
  '<div class="panel">', panelHead(),
  controlsBlock(),
  '<div class="sec"><div class="sec-title">主题选择 <span class="count">34 · 色相流</span></div>',
  '<input class="search" placeholder="搜索主题…">',
  '<div class="flow">',
  orderedGroups.map((g) => groupLabel(g, 3) + groups[g].map((n) => chipSwatch(n)).join('')).join(''),
  '</div>',
  '</div>',
  '</div>',
].join('')

const css = [
  '*{box-sizing:border-box;margin:0;padding:0}',
  'body{background:#0a0a0a;color:#e4e4e4;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;padding:28px;line-height:1.6}',
  'h1{font-size:20px;color:#f0f0f0;margin-bottom:6px}',
  '.sub{color:#8b8b95;font-size:13px;margin-bottom:24px;max-width:1180px}',
  '.sub b{color:#FAB283;font-weight:600}',
  '.protos{display:flex;flex-direction:column;gap:36px;max-width:1180px}',
  '.proto h2{font-size:15px;margin-bottom:4px;display:flex;align-items:center;gap:8px}',
  '.proto .badge{font-size:11px;background:#1c1c1e;border:1px solid #333338;border-radius:4px;padding:1px 8px;color:#FAB283}',
  '.proto .notes{color:#8b8b95;font-size:12px;margin-bottom:12px;max-width:1100px}',
  '.panel{background:#101014;border:1px solid #27272a;border-radius:12px;padding:16px 18px;max-width:1100px}',
  '.panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}',
  '.panel-head strong{font-size:14px}',
  '.status{font-size:12px}',
  '.status.on{color:#7fd88f}',
  '.sec{margin-bottom:16px}',
  '.sec:last-child{margin-bottom:0}',
  '.sec-title{font-size:11px;color:#a1a1aa;letter-spacing:.08em;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:baseline;gap:8px}',
  '.sec-title .count{color:#5c5c66;font-size:11px}',
  '.sec-title .hint{color:#5c5c66;text-transform:none;letter-spacing:0}',
  '.search{width:100%;max-width:380px;background:#1c1c1e;border:1px solid #333338;color:#e4e4e4;border-radius:6px;padding:7px 12px;font-size:13px;margin-bottom:12px;outline:none}',
  '.search::placeholder{color:#6d6d6d}',
  '.group{margin-bottom:12px}',
  '.group:last-child{margin-bottom:0}',
  '.g-head{display:flex;align-items:center;gap:7px;font-size:12px;color:#c8c8d0;margin-bottom:6px}',
  '.g-head.flow{display:inline-flex;margin:0 2px 0 10px;color:#9D7CD8;font-size:11px;align-self:center}',
  '.g-dot{width:8px;height:8px;border-radius:50%;display:inline-block}',
  '.count{color:#5c5c66;font-size:11px}',
  '.grid{display:flex;flex-wrap:wrap;gap:8px}',
  '.grid.tight{gap:6px}',
  '.chip{display:inline-flex;align-items:center;gap:6px;border-radius:7px;border:1px solid #555;padding:4px 10px 4px 6px;font-size:12px;font-family:"JetBrains Mono",Consolas,monospace;cursor:pointer;transition:transform .06s ease}',
  '.chip:hover{transform:translateY(-1px)}',
  '.chip .dot{width:9px;height:9px;border-radius:50%;display:inline-block;flex:none}',
  '.chip.mini{padding:3px 8px 3px 5px;font-size:11px;gap:5px}',
  '.chip .tick{font-style:normal;color:#FAB283;font-weight:700}',
  '.chip.sel{outline:2px solid #FAB283;outline-offset:1px}',
  '.card-group{background:#16161a;border:1px solid #232329;border-top:3px solid;border-radius:10px;padding:10px 12px 12px;margin-bottom:12px}',
  '.card-group:last-child{margin-bottom:0}',
  '.cg-head{display:flex;align-items:center;gap:7px;font-size:13px;color:#e4e4e4;margin-bottom:9px}',
  '.flow{display:flex;flex-wrap:wrap;align-items:center;gap:6px}',
  '.swatch{display:inline-flex;align-items:center;gap:5px;border:1px solid transparent;border-radius:6px;padding:3px 7px 3px 3px;font-size:11px;font-family:"JetBrains Mono",Consolas,monospace;cursor:pointer;transition:border-color .06s}',
  '.swatch .sq{width:11px;height:11px;border-radius:3px;display:inline-block;flex:none}',
  '.swatch:hover{border-color:#3a3a42}',
  '.swatch.sel{border-color:#FAB283;outline:1px solid #FAB28388}',
  '.swatch .tick{font-style:normal;color:#FAB283;font-weight:700}',
  '.controls{display:flex;align-items:flex-end;gap:22px;flex-wrap:wrap}',
  '.ctl{display:flex;flex-direction:column;gap:6px}',
  '.ctl-label{font-size:11px;color:#a1a1aa}',
  '.seg{display:inline-flex;background:#1c1c1e;border:1px solid #333338;border-radius:7px;padding:2px;gap:2px}',
  '.seg-btn{border:0;background:transparent;color:#a1a1aa;border-radius:5px;padding:4px 10px;font-size:12px;cursor:pointer}',
  '.seg-btn.on{background:#2a2a30;color:#f0f0f0}',
  '.fdrop{position:relative}',
  '.fdrop-head{display:flex;align-items:center;gap:8px;background:#1c1c1e;border:1px solid #333338;border-radius:7px;padding:6px 12px;font-size:12px;cursor:pointer;min-width:190px;justify-content:space-between}',
  '.fdrop-head b{color:#8b8b95;font-weight:400}',
  '.fdrop-menu{position:absolute;top:calc(100% + 4px);left:0;background:#16161a;border:1px solid #333338;border-radius:8px;min-width:220px;padding:4px;z-index:5;box-shadow:0 8px 24px #0008}',
  '.fdrop-item{padding:6px 10px;font-size:12px;border-radius:5px;cursor:pointer;color:#c8c8d0}',
  '.fdrop-item:hover,.fdrop-item.on{background:#232329;color:#fff}',
  '.switch{display:inline-flex;align-items:center;gap:8px;font-size:12px;color:#c8c8d0;cursor:pointer}',
  '.switch input{display:none}',
  '.switch i{width:34px;height:18px;border-radius:10px;background:#333338;position:relative;display:inline-block;transition:background .12s}',
  '.switch i::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#8b8b95;transition:all .12s}',
  '.switch input:checked + i{background:#FAB28366}',
  '.switch input:checked + i::after{left:18px;background:#FAB283}',
].join('\n')

const html = [
  '<!doctype html>',
  '<html lang="zh-CN">',
  '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
  '<title>Opencode TUI 主题 · A+B 组合体 × 3 版本（真实主题色）</title>',
  '<style>' + css + '</style></head>',
  '<body>',
  '<h1>A+B 组合体 — 3 个版本（色系分组 × 网格铺满）</h1>',
  '<div class="sub">共同点：<b>排印三控件（正文模式 / 字号 / 代码字体）置于主题选择上方</b> — 先设界面、后选主题；',
  '<b>色系分组</b>（暖橙/黄绿/青绿/青蓝/冷蓝/蓝紫 + 透明/特殊）+ <b>组内网格铺满</b>；所有选项全展开、无折叠、无内部滚动；字号 8 档（11–18）。',
  '三版差异只在<b>分组形态与芯片样式</b>；选中主题 = opencode（橙框）。</div>',
  '<div class="protos">',
  '<section class="proto"><h2><span class="badge">组合 1</span> 标签分组 — 最紧凑</h2>',
  '<div class="notes">组标题 = 色点 + 名称 + 数量，仅一行小字；芯片 mini（主色圆点 + 名称）。纵向最省空间、信息密度最高。</div>',
  combo1, '</section>',
  '<section class="proto"><h2><span class="badge">组合 2</span> 色卡分组 — 分区感最强</h2>',
  '<div class="notes">每个色系 = 一张卡片：顶部 3px 该色系代表色带 + 标题，卡片内有较大芯片（真实主题背景/文字/主色）。',
  '组与组之间视觉边界最清晰，最不杂乱。</div>',
  combo2, '</section>',
  '<section class="proto"><h2><span class="badge">组合 3</span> 色相流 — 调色板式</h2>',
  '<div class="notes">无卡片无分段：按色相（彩虹序）连续铺排，组边界 = 流内小标签；芯片 = 主色方块 + 名称、无边框。',
  '最像专业取色器，横向最紧凑。</div>',
  combo3, '</section>',
  '</div>',
  '<div class="sub" style="margin-top:28px">说明：交互为静态展示；选定后按此实现面板（引擎/持久化/修复均就绪）。</div>',
  '</body></html>',
].join('\n')

await mkdir(dirname(OUT), { recursive: true })
await writeFile(OUT, html)
console.log('组合原型页已生成: ' + OUT + ' (' + html.length + ' B)')
console.log('分组:', JSON.stringify(groups))
