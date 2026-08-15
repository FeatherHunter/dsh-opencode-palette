
// prototypes/generate-prototypes.mjs — 用真实主题数据生成配置面板原型页
// 用法: node prototypes/generate-prototypes.mjs → prototypes/panel-prototypes.html
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { themeNames, previewColors } from '../src/engine/index.mjs'
import { isSystem } from '../src/engine/registry.mjs'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const OUT = join(ROOT, 'prototypes', 'panel-prototypes.html')

// ── 真实数据 ──
const names = themeNames()
const data = {}
for (const n of names) {
  const c = previewColors(n)
  data[n] = {
    bg: c.background || null,
    text: c.text || null,
    primary: c.primary || null,
    accent: c.accent || null,
    error: c.error || null,
    warning: c.warning || null,
    success: c.success || null,
    system: isSystem(n),
  }
}

// ── 色系分类（按主色色相，数据驱动）──
function hueOf(hex) {
  if (!hex) return -1
  const t = hex.replace('#', '')
  const r = parseInt(t.slice(0, 2), 16) / 255
  const g = parseInt(t.slice(2, 4), 16) / 255
  const b = parseInt(t.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return -2 // 中性
  let h
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h *= 60
  if (h < 0) h += 360
  // 低饱和 → 中性
  const sat = max === 0 ? 0 : d / max
  if (sat < 0.18) return -2
  return h
}
function groupOf(n) {
  if (data[n].system) return '特殊'
  if (data[n].bg === null) return '透明'
  const h = hueOf(data[n].primary)
  if (h === -2) return '中性'
  if (h < 35) return '暖橙'
  if (h < 90) return '黄绿'
  if (h < 170) return '青绿'
  if (h < 250) return '冷蓝'
  return '紫粉'
}
const GROUP_ORDER = ['暖橙', '黄绿', '青绿', '冷蓝', '紫粉', '中性', '透明', '特殊']
const groups = {}
for (const n of names) {
  const g = groupOf(n)
  ;(groups[g] = groups[g] || []).push(n)
}

// ── 工具 ──
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const cssBg = (hex) => hex ? hex : 'repeating-conic-gradient(#3a3a3a 0% 25%, #222 0% 50%) 0 0/8px 8px'
const cssText = (hex) => hex || '#8b8b95'
const cssBorder = (hex) => hex || '#555'

function chip(n, size) {
  const d = data[n]
  const sel = n === 'opencode' ? ' sel' : ''
  return '<button class="chip' + sel + '" style="' +
    'background:' + cssBg(d.bg) + ';color:' + cssText(d.text) + ';border-color:' + cssBorder(d.primary) + '">' +
    (d.primary ? '<i class="dot" style="background:' + d.primary + '"></i>' : '') +
    '<span>' + esc(n) + '</span>' +
    (sel ? '<em class="tick">✓</em>' : '') +
    '</button>'
}

function chipMini(n) {
  const d = data[n]
  const sel = n === 'opencode' ? ' sel' : ''
  return '<button class="chip mini' + sel + '" style="' +
    'background:' + cssBg(d.bg) + ';color:' + cssText(d.text) + ';border-color:' + cssBorder(d.primary) + '">' +
    '<span>' + esc(n) + '</span></button>'
}

function row(n) {
  const d = data[n]
  const sel = n === 'opencode' ? ' sel' : ''
  return '<button class="row' + sel + '" style="color:' + cssText(d.text) + '">' +
    '<span class="bar" style="background:' + (d.bg || '#222') + '">' +
    '<i style="background:' + (d.primary || '#444') + ';width:34%"></i>' +
    '<i style="background:' + (d.accent || '#444') + ';width:20%"></i>' +
    '</span>' +
    '<span class="rname">' + esc(n) + '</span>' +
    (sel ? '<em class="tick">✓</em>' : '') +
    '</button>'
}

// ── 公共控件（4 个原型一致，用于对比）──
const controls = [
  '<div class="controls">',
  '<div class="ctl"><span class="ctl-label">正文模式</span><div class="seg">',
  '<button class="seg-btn on">全等宽（终端）</button><button class="seg-btn">无衬线（忠实）</button>',
  '</div></div>',
  '<div class="ctl"><span class="ctl-label">字号</span><div class="seg">',
  '<button class="seg-btn">11</button><button class="seg-btn">12</button><button class="seg-btn on">13</button><button class="seg-btn">14</button><button class="seg-btn">15</button><button class="seg-btn">16</button><button class="seg-btn">17</button><button class="seg-btn">18</button>',
  '</div></div>',
  '<div class="ctl"><span class="ctl-label">代码字体</span>',
  '<div class="fdrop">',
  '<div class="fdrop-head"><span style="font-family:JetBrains Mono,Consolas,monospace">JetBrains Mono</span><b>▾</b></div>',
  '<div class="fdrop-menu">',
  '<div class="fdrop-item on" style="font-family:JetBrains Mono,Consolas,monospace">JetBrains Mono — Aa 等宽</div>',
  '<div class="fdrop-item" style="font-family:Cascadia Code,Consolas,monospace">Cascadia Code — Aa 等宽</div>',
  '<div class="fdrop-item" style="font-family:Fira Code,Consolas,monospace">Fira Code — Aa 等宽</div>',
  '<div class="fdrop-item" style="font-family:SF Mono,Menlo,monospace">SF Mono — Aa 等宽</div>',
  '<div class="fdrop-item" style="font-family:Consolas,monospace">Consolas — Aa 等宽</div>',
  '</div></div></div>',
  '<div class="ctl"><span class="ctl-label">状态</span><label class="switch"><input type="checkbox" checked><i></i><span>启用风格</span></label></div>',
  '</div>',
].join('')

const panelHead = [
  '<div class="panel-head">',
  '<strong>🖥 Opencode TUI 主题 v2</strong>',
  '<span class="status on">● 已启用</span>',
  '</div>',
].join('')

// ── 4 个原型 ──
const protoA = [
  '<div class="panel">', panelHead,
  '<div class="sec"><div class="sec-title">主题选择 <span class="count">34</span></div>',
  '<input class="search" placeholder="搜索主题…（system = 恢复 DSH 原生配色）">',
  '<div class="grid">', names.map((n) => chip(n, 0)).join(''), '</div></div>',
  '<div class="sec"><div class="sec-title">排印调节 <span class="hint">与主题正交 · 字体非主题属性</span></div>', controls, '</div>',
  '</div>',
].join('')

const protoB = [
  '<div class="panel">', panelHead,
  '<div class="sec"><div class="sec-title">主题选择 <span class="count">34 · 按色系分组</span></div>',
  '<input class="search" placeholder="搜索主题…">',
  GROUP_ORDER.filter((g) => groups[g]).map((g) => {
    return '<div class="group"><div class="group-title">' + g + ' <span class="count">' + groups[g].length + '</span></div>' +
      '<div class="grid tight">' + groups[g].map((n) => chipMini(n)).join('') + '</div></div>'
  }).join(''),
  '</div>',
  '<div class="sec"><div class="sec-title">排印调节</div>', controls, '</div>',
  '</div>',
].join('')

const protoC = [
  '<div class="panel">', panelHead,
  '<div class="sec"><div class="sec-title">主题选择 <span class="count">34</span></div>',
  '<input class="search" placeholder="搜索主题…">',
  '<div class="list">', names.map((n) => row(n)).join(''), '</div></div>',
  '<div class="sec"><div class="sec-title">排印调节</div>', controls, '</div>',
  '</div>',
].join('')

const sel = data['opencode']
const detail = [
  '<div class="detail-card" style="background:' + cssBg(sel.bg) + ';color:' + cssText(sel.text) + ';border-color:' + cssBorder(sel.primary) + '">',
  '<div class="d-name">opencode <em class="tag">当前</em></div>',
  '<div class="d-hex"><i style="background:' + sel.primary + '"></i>primary ' + (sel.primary || '—') + '</div>',
  '<div class="d-hex"><i style="background:' + sel.accent + '"></i>accent ' + (sel.accent || '—') + '</div>',
  '<div class="d-hex"><i style="background:' + sel.error + '"></i>error ' + (sel.error || '—') + '</div>',
  '<div class="d-hex"><i style="background:' + sel.success + '"></i>success ' + (sel.success || '—') + '</div>',
  '<div class="d-hex"><i style="background:' + sel.warning + '"></i>warning ' + (sel.warning || '—') + '</div>',
  '</div>',
].join('')

const protoD = [
  '<div class="panel">', panelHead,
  '<div class="cols">',
  '<div class="col-left"><div class="sec-title">主题选择 <span class="count">34</span></div>',
  '<input class="search" placeholder="搜索主题…">',
  '<div class="grid tight two">', names.map((n) => chipMini(n)).join(''), '</div></div>',
  '<div class="col-right">',
  '<div class="sec-title">当前主题</div>', detail,
  '<div class="sec-title">排印调节</div>', controls,
  '</div></div>',
  '</div>',
].join('')

// ── 页面组装 ──
const css = [
  '*{box-sizing:border-box;margin:0;padding:0}',
  'body{background:#0a0a0a;color:#e4e4e4;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;padding:28px;line-height:1.6}',
  'h1{font-size:20px;color:#f0f0f0;margin-bottom:6px}',
  '.sub{color:#8b8b95;font-size:13px;margin-bottom:24px;max-width:1100px}',
  '.sub b{color:#FAB283;font-weight:600}',
  '.protos{display:flex;flex-direction:column;gap:36px;max-width:1180px}',
  '.proto h2{font-size:15px;margin-bottom:4px;display:flex;align-items:center;gap:8px}',
  '.proto .badge{font-size:11px;background:#1c1c1e;border:1px solid #333338;border-radius:4px;padding:1px 8px;color:#FAB283}',
  '.proto .notes{color:#8b8b95;font-size:12px;margin-bottom:12px;max-width:1100px}',
  '.proto .notes code{color:#7fd88f}',
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
  // chips
  '.grid{display:flex;flex-wrap:wrap;gap:8px}',
  '.grid.tight{gap:6px}',
  '.grid.two{max-width:100%}',
  '.chip{display:inline-flex;align-items:center;gap:7px;border-radius:7px;border:1px solid #555;padding:4px 10px 4px 6px;font-size:12px;font-family:"JetBrains Mono",Consolas,monospace;cursor:pointer;transition:transform .06s ease,box-shadow .06s ease}',
  '.chip:hover{transform:translateY(-1px)}',
  '.chip .dot{width:9px;height:9px;border-radius:50%;display:inline-block;flex:none}',
  '.chip.sel{outline:2px solid #FAB283;outline-offset:1px}',
  '.chip .tick{font-style:normal;color:#FAB283;font-weight:700}',
  '.chip.mini{padding:3px 8px;font-size:11px;gap:0}',
  // groups
  '.group{margin-bottom:10px}',
  '.group-title{font-size:12px;color:#9D7CD8;margin-bottom:6px}',
  // list rows
  '.list{display:flex;flex-direction:column;gap:4px}',
  '.row{display:flex;align-items:center;gap:10px;background:transparent;border:1px solid transparent;border-radius:7px;padding:3px 10px 3px 6px;font-size:12px;font-family:"JetBrains Mono",Consolas,monospace;cursor:pointer;width:100%;text-align:left}',
  '.row:hover{background:#16161a;border-color:#2a2a30}',
  '.row.sel{border-color:#FAB28355;background:#16161a}',
  '.row .bar{display:inline-flex;width:64px;height:14px;border-radius:3px;overflow:hidden;flex:none;border:1px solid #00000033}',
  '.row .bar i{display:block;height:100%}',
  '.row .rname{flex:1}',
  '.row .tick{font-style:normal;color:#FAB283;font-weight:700}',
  // controls
  '.controls{display:flex;align-items:flex-end;gap:22px;flex-wrap:wrap}',
  '.ctl{display:flex;flex-direction:column;gap:6px}',
  '.ctl-label{font-size:11px;color:#a1a1aa}',
  '.seg{display:inline-flex;background:#1c1c1e;border:1px solid #333338;border-radius:7px;padding:2px;gap:2px}',
  '.seg-btn{border:0;background:transparent;color:#a1a1aa;border-radius:5px;padding:4px 12px;font-size:12px;cursor:pointer}',
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
  '.evidence{margin-top:12px;font-family:Consolas,monospace;font-size:11px;color:#5c5c66}',
  // D
  '.cols{display:grid;grid-template-columns:1.25fr .95fr;gap:20px;align-items:start}',
  '.col-right{display:flex;flex-direction:column;gap:14px}',
  '.detail-card{border:1px solid;border-radius:10px;padding:12px 14px}',
  '.d-name{font-size:13px;font-family:"JetBrains Mono",Consolas,monospace;margin-bottom:8px}',
  '.d-name .tag{font-style:normal;font-size:10px;color:#0a0a0a;background:#FAB283;border-radius:3px;padding:0 6px;margin-left:6px}',
  '.d-hex{display:flex;align-items:center;gap:7px;font-size:11px;font-family:Consolas,monospace;opacity:.9;margin-top:4px}',
  '.d-hex i{width:12px;height:12px;border-radius:3px;display:inline-block;border:1px solid #00000044}',
  '@media(max-width:900px){.cols{grid-template-columns:1fr}}',
].join('\n')

const html = [
  '<!doctype html>',
  '<html lang="zh-CN">',
  '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
  '<title>Opencode TUI 主题 · 配置面板原型（真实主题色）</title>',
  '<style>' + css + '</style></head>',
  '<body>',
  '<h1>Opencode TUI 主题 — 配置面板原型</h1>',
  '<div class="sub">4 个候选布局，全部用 <b>真实主题色</b> 渲染（引擎解析自 opencode v1.18.12）。',
  '共同点：<b>所有选项全部展开</b> — 无折叠区、无内部滚动条（页面自然流动）；每个可选控件都做了专门设计（分段按钮 / 字体预览下拉 / 开关）。',
  '选中的主题 = <code>opencode</code>（橙框标记）。</div>',
  '<div class="protos">',
  '<section class="proto"><h2><span class="badge">原型 A</span> 网格铺满 — 一屏全览</h2>',
  '<div class="notes">34 个主题芯片直接铺满面板宽度（自动换行，<b>不设高度上限</b>）；芯片自带主题背景/文字/主色，选中 = 橙色外环 + ✓。',
  '排印控件用分段按钮与字体预览下拉。适合「扫一眼全局、随手点」。</div>', protoA, '</section>',
  '<section class="proto"><h2><span class="badge">原型 B</span> 按色系分组 — 设计系统式</h2>',
  '<div class="notes">34 个主题按<b>主色色相自动分组</b>（暖橙 / 黄绿 / 青绿 / 冷蓝 / 紫粉 / 中性 / 透明 / 特殊），组标题小标签 + 紧凑芯片。',
  '适合「知道自己想要什么颜色气质」的定向选择；组间留白让面板呼吸感更强。</div>', protoB, '</section>',
  '<section class="proto"><h2><span class="badge">原型 C</span> 列表行 — 名称优先</h2>',
  '<div class="notes">每个主题一行：左 = 主题配色条（背景 → 主色 → 强调色的实况比例条），右 = 名称。',
  '34 行纵向铺开（页面自然滚动，行内无滚动容器）。适合「认名字选主题」、名称可读性最高的方案。</div>', protoC, '</section>',
  '<section class="proto"><h2><span class="badge">原型 D</span> 双栏工作台 — 选择 + 详情同屏</h2>',
  '<div class="notes">左栏 = 紧凑主题网格（选中即预览）；右栏 = <b>当前主题详情卡</b>（真实背景底 + 5 个语义色 HEX 芯片）+ 排印控件 + 开关。',
  '信息密度最高、最「仪表盘」的方案；窄窗口自动降为单栏。</div>', protoD, '</section>',
  '</div>',
  '<div class="sub" style="margin-top:28px">说明：原型中的交互控件为静态展示；选定方案后，将以此替换现有设置面板（当前为「搜索 + 132px 高滚动芯片区 + 原生下拉」）。</div>',
  '</body></html>',
].join('\n')

await mkdir(dirname(OUT), { recursive: true })
await writeFile(OUT, html)
console.log('原型页已生成: ' + OUT + ' (' + html.length + ' B)')
console.log('分组结果:', JSON.stringify(groups))
