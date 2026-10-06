// generate-group-boundary-68.mjs — #68 青绿/青蓝/冷蓝 并排冻结实测（抛弃式原型，双击即开）
// 数据源：src/engine/*（真实引擎）＋ package/lib/client.js 真实渲染的面板节选（非手抄）
// 产出：prototypes/group-boundary-68.html ＋ stdout 一份机读分析（阈值余量/敏感性）
// 用法：node prototypes/generate-group-boundary-68.mjs（先 npm run build 保证产物是当前源码）
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInThisContext } from 'node:vm'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { listThemes } from '../src/engine/registry.mjs'
import { resolvePreview, groupOf, hueOf, GROUP_COLORS } from '../src/engine/grouping.mjs'
import { THEME_ZH } from '../src/engine/zh-names.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)

// ── 0) 拍板结果：用户拍板后改这里再重跑（初态＝待拍板）──
const VERDICT = {
  status: '已冻结（2026-10-06 并排实测后拍板）',
  thresholds: '160 / 200 / 230 原样冻结（不按样本取中点）',
  naming: '青绿 / 青蓝 / 冷蓝 原样冻结（青字头 ×2 ＋ 冷字头 ×1）',
  note: '结论已落码：src/engine/grouping.mjs 冻结注释 ＋ tests/group-boundary.test.mjs 六条 pin（阈值/归属/余量/连续性/体例/dark 基线）。',
}
const REASONS = [
  '契约是「分区」，数字只是实现：按样本取中点（163.2/197.7/242.9）会让常量随上游加主题变成既非惯例也非最优的化石；160/200/230 是色族分界的惯例整数，可解释、可预测。',
  '主题数据钉在不可变 commit（OPCODE_SHA ＋ MANIFEST 指纹），越界只发生在人为 --update-baseline 升级时——薄余量是跳闸线而不是风险；pin 测试把跳闸变成会红的门。',
  '判据保持一维（色相）：引入第二维（色度）会产生无法全序化的并列桶；160 两侧的观感差是饱和度（Gruvbox 灰青 vs 大阪翡翠 鲜亮），不是色相错——分组只做导航、不做色彩描述。',
  '命名体系＝两端温度锚（暖橙/冷蓝）＋中段邻接复合（黄绿/青绿/青蓝/蓝紫），冷蓝不是「不一致」而是另一子范式；英文按英语习惯（Teal/Violet 为单词色名），不与中文同构。',
  '分组键恒取 dark 基线（issue 47）：浅色宿主下 7 个主题的芯片预览色落在别组，是既有裁决、不是漂移（见 G 节）。',
]

// ── 1) 引擎实测数据（分组恒用 dark 基线，issue 47）──
const rows = listThemes().map(function (name) {
  const c = resolvePreview(name, 'dark')
  return { name: name, zh: THEME_ZH[name] || name, primary: c.primary, bg: c.background, hue: hueOf(c.primary), group: groupOf(name, c) }
})
const hueRows = rows.filter(function (r) { return typeof r.hue === 'number' && r.hue >= 0 })
const groupRows = function (g) { return hueRows.filter(function (r) { return r.group === g }).sort(function (a, b) { return a.hue - b.hue }) }
const THREE = ['teal', 'cyan-blue', 'cool-blue']
// 分组恒用 dark 基线（issue 47），芯片预览色按宿主明暗 —— 列出因此「明暗分组不一致」的主题（既有裁决，非本票范围）
const modeDrift = rows.map(function (r) {
  const lc = resolvePreview(r.name, 'light')
  return { zh: r.zh, dark: r.group, darkHue: r.hue, light: groupOf(r.name, lc), lightHue: hueOf(lc.primary) }
}).filter(function (r) { return r.dark !== r.light })
const ZH_GROUP = { warm: '暖橙', 'yellow-green': '黄绿', teal: '青绿', 'cyan-blue': '青蓝', 'cool-blue': '冷蓝', violet: '蓝紫' }
const EN_GROUP = { teal: 'Teal', 'cyan-blue': 'Cyan-blue', 'cool-blue': 'Cool blue' }

// 边界：票内三条（160/200/230）＋票外上下文两条（35/90），后者只作背景、不改口径
const BOUNDARIES = [
  { at: 35, lower: 'warm', upper: 'yellow-green', inScope: false },
  { at: 90, lower: 'yellow-green', upper: 'teal', inScope: false },
  { at: 160, lower: 'teal', upper: 'cyan-blue', inScope: true },
  { at: 200, lower: 'cyan-blue', upper: 'cool-blue', inScope: true },
  { at: 230, lower: 'cool-blue', upper: 'violet', inScope: true },
]
const analysis = BOUNDARIES.map(function (b) {
  const below = hueRows.filter(function (r) { return r.hue < b.at })
  const above = hueRows.filter(function (r) { return r.hue >= b.at })
  const lo = below.reduce(function (a, r) { return !a || r.hue > a.hue ? r : a }, null)
  const hi = above.reduce(function (a, r) { return !a || r.hue < a.hue ? r : a }, null)
  const tie = function (r) { return r ? hueRows.filter(function (q) { return Math.abs(q.hue - r.hue) < 0.05 }).map(function (q) { return q.zh }) : [] }
  const flips = function (t) { return hueRows.filter(function (r) { return (r.hue < b.at) !== (r.hue < t) }).map(function (r) { return r.name }) }
  const gap = hi && lo ? hi.hue - lo.hue : null
  const mid = hi && lo ? (hi.hue + lo.hue) / 2 : null
  return {
    at: b.at, lower: b.lower, upper: b.upper, inScope: b.inScope,
    belowName: lo ? lo.name : null, belowZh: lo ? lo.zh : null, belowHue: lo ? lo.hue : null, belowDelta: lo ? b.at - lo.hue : null, belowTies: tie(lo),
    aboveName: hi ? hi.name : null, aboveZh: hi ? hi.zh : null, aboveHue: hi ? hi.hue : null, aboveDelta: hi ? hi.hue - b.at : null, aboveTies: tie(hi),
    gap: gap, mid: mid,
    flipMinus10: flips(b.at - 10).length, flipPlus10: flips(b.at + 10).length,
    flipMinus5: flips(b.at - 5).length, flipPlus5: flips(b.at + 5).length,
    flipMid: flips(mid).length,
  }
})

// ── 2) 真实面板渲染：拿 package/lib/client.js 的产物渲染，不手抄芯片 ──
function renderRealPanel(lang) {
  const req = createRequire(import.meta.url)
  const React = req('react')
  const ReactDOMServer = req('react-dom/server')
  const code = readFileSync(join(ROOT, 'package', 'lib', 'client.js'), 'utf8')
  const loaded = []
  global.window = globalThis
  globalThis.__ModuleLoader__ = {
    load: function (entry) {
      loaded.push({ id: entry.id, exports: entry.factory(function (id) {
        if (id === 'react') return React
        throw new Error('unexpected require: ' + id)
      }) })
    },
  }
  const body = {
    hasAttribute: function () { return true }, getAttribute: function () { return '' },
    setAttribute: function () {}, removeAttribute: function () {},
    appendChild: function () {}, removeChild: function () {},
  }
  global.document = {
    head: { appendChild: function () {} }, body: body,
    createElement: function (tag) {
      if (tag === 'canvas') return { getContext: function (k) { return k === '2d' ? { font: '', measureText: function () { return { width: 9 } } } : null } }
      return { dataset: {}, parentNode: null, textContent: '', style: { cssText: '', fontFamily: '' }, getBoundingClientRect: function () { return { width: 0 } } }
    },
    documentElement: { lang: lang, style: { colorScheme: '', removeProperty: function () {} }, _a: {}, hasAttribute: function (k) { return this._a[k] !== undefined }, getAttribute: function (k) { return this._a[k] !== undefined ? this._a[k] : null }, setAttribute: function (k, v) { this._a[k] = String(v) }, removeAttribute: function (k) { delete this._a[k] } },
    addEventListener: function () {}, removeEventListener: function () {},
  }
  runInThisContext(code, { filename: 'package/lib/client.js' })
  const p = loaded[0].exports
  let panelCmp = null, panelProps = null
  const slots = { inject: function (slot, cb) { cb(); return function () {} }, register: function (desc, cmp) { panelCmp = cmp; panelProps = desc.inject(); return function () {} } }
  const themeSvc = { overrideTokens: function () { return function () {} }, getTheme: function () { return { preference: 'dark' } }, setTheme: function () {} }
  const ctx = { get: function (k) { if (k === 'theme') return themeSvc; if (k === 'slots') return slots; return undefined }, effect: function (fn) { fn() } }
  p.apply(ctx)
  return ReactDOMServer.renderToString(React.createElement(panelCmp, panelProps))
}

const GROUP_MARK = '<div style="margin-bottom:10px">'
function groupBlock(html, label) {
  const parts = html.split(GROUP_MARK)
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].indexOf(label) >= 0 && parts[i].indexOf('<button') >= 0) return GROUP_MARK + parts[i]
  }
  return '<div class="miss">未取到组块：' + label + '</div>'
}
function chipOf(html, label) {
  const i = html.indexOf(label)
  if (i < 0) return '<span class="miss">缺芯片 ' + label + '</span>'
  return html.slice(html.lastIndexOf('<button', i), html.indexOf('</button>', i) + 9)
}

const zhHtml = renderRealPanel('zh-CN')
const enHtml = renderRealPanel('en')

// ── 3) 生成 HTML ──
const H = []
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function chipCell(r, side, at) {
  return '<div class="cell">' + chipOf(zhHtml, r.zh) + '<div class="meta">hue <b>' + r.hue.toFixed(1) + '</b> · ' + side + ' Δ<b>' + Math.abs(r.hue - at).toFixed(1) + '</b>°</div></div>'
}
const nearNames = {}
for (const b of analysis) { if (b.belowName) nearNames[b.belowName] = 1; if (b.aboveName) nearNames[b.aboveName] = 1 }

H.push('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">')
H.push('<title>#68 青绿/青蓝/冷蓝 并排冻结实测</title><style>')
H.push('*{box-sizing:border-box}body{margin:0;padding:22px 26px 40px;background:#101014;color:#E8E8EE;font-family:-apple-system,Segoe UI,Microsoft YaHei,PingFang SC,sans-serif;font-size:13px}')
H.push('h1{font-size:19px;margin:0 0 4px}h2{font-size:15px;margin:26px 0 10px;padding-bottom:6px;border-bottom:1px solid #2A2A32}')
H.push('.sub{color:#8B8B95;font-size:12px;margin-bottom:14px}')
H.push('.verdict{background:#17171C;border:1px solid #2A2A32;border-left:3px solid #FAB283;border-radius:8px;padding:12px 14px;margin-bottom:8px}')
H.push('.verdict b{color:#FAB283}.kv{color:#A0A0AA;font-size:12px;margin-top:4px}')
H.push('.host{background:#17171C;border:1px solid #2A2A32;border-radius:10px;padding:14px 16px 6px;margin-bottom:12px}')
H.push('.host .hostTag{color:#8B8B95;font-size:11px;letter-spacing:.04em;margin-bottom:10px}')
H.push('.side{display:flex;gap:18px;align-items:flex-start}.side>div{flex:1 1 0;min-width:0}')
H.push('.grp{border:1px solid #26262E;border-radius:8px;padding:10px 12px;background:#131318}')
H.push('.cells{display:flex;flex-wrap:wrap;gap:10px}.cell{display:flex;flex-direction:column;gap:4px;align-items:flex-start}')
H.push('.meta{color:#8B8B95;font-size:11px}.meta b{color:#E8E8EE}')
H.push('.miss{color:#FF6B6B;font-size:12px}')
H.push('table{border-collapse:collapse;font-size:12px}th,td{border:1px solid #2A2A32;padding:5px 9px;text-align:left}th{background:#17171C;color:#A0A0AA;font-weight:600}')
H.push('td.num{font-variant-numeric:tabular-nums;text-align:right}.out{color:#6B6B75}')
H.push('.bcard{border:1px solid #2A2A32;border-radius:10px;padding:12px 14px;margin-bottom:10px;background:#17171C}')
H.push('.bcard .bt{font-size:13px;margin-bottom:10px}.bcard .bt b{color:#88C0D0;font-size:15px}')
H.push('.axis{position:relative;width:1000px;height:162px;margin:8px 0 6px;background:#131318;border:1px solid #26262E;border-radius:8px;overflow:hidden}')
H.push('.axis .lane{position:absolute;left:0;right:0;height:40px;border-bottom:1px dashed #22222A}')
H.push('.dot{position:absolute;width:9px;height:9px;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 0 0 1px rgba(255,255,255,.25)}')
H.push('.dotlbl{position:absolute;font-size:10px;color:#E8E8EE;transform:translateX(-50%);white-space:nowrap;background:#101014;padding:0 2px}')
H.push('.glbl{position:absolute;font-size:11px;font-weight:700;transform:translateX(-50%);white-space:nowrap}')
H.push('.vline{position:absolute;top:0;bottom:0;width:1px;background:#FAB283}.vline.out{background:#4A4A55}')
H.push('.vlab{position:absolute;top:2px;font-size:11px;color:#FAB283;transform:translateX(-50%);font-weight:700}.vlab.out{color:#6B6B75}')
H.push('.tick{position:absolute;bottom:0;font-size:10px;color:#6B6B75;transform:translateX(-50%)}')
H.push('.band{display:flex;height:26px;border-radius:6px;overflow:hidden;margin:6px 0 4px;font-size:11px;line-height:26px;text-align:center;color:#101014;font-weight:700}')
H.push('.legend{color:#8B8B95;font-size:11px;margin-top:6px;line-height:1.6}')
H.push('</style></head><body>')

H.push('<h1>#68 青绿 / 青蓝 / 冷蓝 并排冻结实测</h1>')
H.push('<div class="sub">数据源：src/engine（真实引擎，dark 基线）＋ package/lib/client.js 真实渲染的面板节选。生成：prototypes/generate-group-boundary-68.mjs</div>')
H.push('<div class="verdict"><b>拍板状态：' + esc(VERDICT.status) + '</b><div class="kv">阈值：' + esc(VERDICT.thresholds) + '　｜　中文名：' + esc(VERDICT.naming) + '</div><div class="kv">' + esc(VERDICT.note) + '</div></div>')

H.push('<div class="verdict" style="border-left-color:#7FD88F"><b>拍板理由（第一性，对抗式复核过）</b>')
for (const r of REASONS) H.push('<div class="kv">· ' + esc(r) + '</div>')
H.push('</div>')
H.push('<h2>A · 真实面板并排（产物渲染，非手抄）</h2>')
H.push('<div class="sub">三组芯片取自 package/lib/client.js 的真实渲染：芯片底＝主题背景色、圆点/边框＝primary、字号 11。真实面板里三组上下堆叠，这里并排以便横向比对。</div>')
for (const pair of [['zh', ZH_GROUP, zhHtml], ['en', EN_GROUP, enHtml]]) {
  H.push('<div class="host"><div class="hostTag">界面语言：' + (pair[0] === 'zh' ? '中文' : 'English（英文侧主题名取产物英文名表）') + '</div><div class="side">')
  for (const g of THREE) H.push('<div class="grp">' + groupBlock(pair[2], pair[1][g]) + '</div>')
  H.push('</div></div>')
}

H.push('<h2>B · 三条票内边界的相邻芯片与余量</h2>')
for (const b of analysis.filter(function (x) { return x.inScope })) {
  const lo = hueRows.filter(function (r) { return r.name === b.belowName })[0]
  const hi = hueRows.filter(function (r) { return r.name === b.aboveName })[0]
  H.push('<div class="bcard"><div class="bt">边界 <b>' + b.at + '</b>　' + esc(ZH_GROUP[b.lower]) + ' ｜ ' + esc(ZH_GROUP[b.upper]) + '　<span class="legend">间隙 ' + b.gap.toFixed(1) + '° · 中点 ' + b.mid.toFixed(1) + ' · 区间内任意阈值分组不变</span></div><div class="cells">')
  H.push(chipCell(lo, '下', b.at))
  H.push(chipCell(hi, '上', b.at))
  H.push('</div><div class="legend">±5° 翻转 ' + (b.flipMinus5 + b.flipPlus5) + ' 个主题　±10° 翻转 ' + (b.flipMinus10 + b.flipPlus10) + ' 个主题　移到中点翻转 ' + b.flipMid + ' 个　同 hue 并列：' + (b.belowTies.length + b.aboveTies.length > 2 ? esc(b.belowTies.join('/') + ' · ' + b.aboveTies.join('/')) : '无') + '</div></div>')
}

H.push('<h2>C · 色相轴：38 主题落点与阈值</h2>')
H.push('<div class="sub">横轴 80°–280°（5px/度）；灰线＝票外上下文边界（35/90），橙线＝票内三条。只标注边界相邻主题，其余为色点（悬停可见名字）。</div>')
H.push('<div class="axis">')
H.push('<div class="lane" style="top:0"></div><div class="lane" style="top:40px"></div><div class="lane" style="top:80px"></div><div class="lane" style="top:120px"></div>')
let coolIdx = 0
const placedLabels = []
for (const r of hueRows) {
  const x = (r.hue - 80) * 5
  let y = 26
  if (r.hue >= 200 && r.hue < 230) { y = 66 + (coolIdx % 3) * 34; coolIdx++ }
  H.push('<div class="dot" title="' + esc(r.zh) + ' ' + r.hue.toFixed(1) + '°" style="left:' + x.toFixed(1) + 'px;top:' + y + 'px;background:' + r.primary + '"></div>')
  if (nearNames[r.name]) {
    // 同 hue 并列（如 Cursor/北极 都在 193.3）会重叠：同一横坐标附近换一条竖直档位
    let dy = 11
    for (const tryDy of [11, 24, 37]) { if (!placedLabels.some(function (p) { return Math.abs(p.x - x) < 56 && p.dy === tryDy })) { dy = tryDy; break } }
    placedLabels.push({ x: x, dy: dy })
    H.push('<div class="dotlbl" style="left:' + x.toFixed(1) + 'px;top:' + (y + dy) + 'px">' + esc(r.zh) + '</div>')
  }
}
for (const g of THREE) {
  const l = groupRows(g)
  const cx = ((l[0].hue + l[l.length - 1].hue) / 2 - 80) * 5
  H.push('<div class="glbl" style="left:' + cx.toFixed(1) + 'px;top:4px;color:' + GROUP_COLORS[g] + '">' + esc(ZH_GROUP[g]) + '</div>')
}
for (const b of BOUNDARIES) {
  const x = (b.at - 80) * 5
  H.push('<div class="vline' + (b.inScope ? '' : ' out') + '" style="left:' + x.toFixed(1) + 'px"></div>')
  H.push('<div class="vlab' + (b.inScope ? '' : ' out') + '" style="left:' + x.toFixed(1) + 'px">' + b.at + '</div>')
}
for (let t = 80; t <= 280; t += 20) H.push('<div class="tick" style="left:' + ((t - 80) * 5) + 'px">' + t + '°</div>')
H.push('</div>')

H.push('<h2>D · 六条边界余量表（含票外两条作背景）</h2>')
H.push('<table><tr><th>边界</th><th>票内</th><th>下侧最近</th><th>hue</th><th>Δ下</th><th>上侧最近</th><th>hue</th><th>Δ上</th><th>间隙</th><th>中点</th><th>±5° 翻转</th><th>±10° 翻转</th></tr>')
for (const b of analysis) {
  H.push('<tr' + (b.inScope ? '' : ' class="out"') + '><td>' + b.at + '</td><td>' + (b.inScope ? '是' : '—') + '</td><td>' + esc(b.belowTies.join(' / ')) + '</td><td class="num">' + b.belowHue.toFixed(1) + '</td><td class="num">' + b.belowDelta.toFixed(1) + '</td><td>' + esc(b.aboveTies.join(' / ')) + '</td><td class="num">' + b.aboveHue.toFixed(1) + '</td><td class="num">' + b.aboveDelta.toFixed(1) + '</td><td class="num">' + b.gap.toFixed(1) + '</td><td class="num">' + b.mid.toFixed(1) + '</td><td class="num">' + (b.flipMinus5 + b.flipPlus5) + '</td><td class="num">' + (b.flipMinus10 + b.flipPlus10) + '</td></tr>')
}
H.push('</table>')

H.push('<h2>E · 中文名体例：青字头与冷字头的分工</h2>')
H.push('<div class="band"><div style="flex:70;background:#2DD5B7">青绿 [90,160)</div><div style="flex:40;background:#88C0D0">青蓝 [160,200)</div><div style="flex:30;background:#82AAFF">冷蓝 [200,230)</div></div>')
H.push('<div class="legend">「青」字头覆盖 [90,200)：绿青 → 蓝青，两组共享字头、以尾字 绿/蓝 分色向；「冷」字头覆盖 [200,230)：纯蓝段的低温色，与青段以字头区分。英文 Teal / Cyan-blue / Cool blue 同构（后两段共享 blue）。</div>')

H.push('<h2>F · 各组实测名单（dark 基线）</h2>')
for (const g of THREE) {
  const list = groupRows(g)
  H.push('<div class="bcard"><div class="bt"><span style="color:' + GROUP_COLORS[g] + '">●</span> ' + esc(ZH_GROUP[g]) + ' / ' + esc(EN_GROUP[g]) + '　<span class="legend">' + list.length + ' 个 · hue ' + list[0].hue.toFixed(1) + '–' + list[list.length - 1].hue.toFixed(1) + '</span></div><div class="cells">')
  for (const r of list) H.push('<div class="cell">' + chipOf(zhHtml, r.zh) + '<div class="meta">' + r.hue.toFixed(1) + '°</div></div>')
  H.push('</div></div>')
}

H.push('<h2>G · 明暗基线（对抗式补充）</h2>')
H.push('<div class="legend">分组键恒取 dark 基线（issue 47：菜单不得随宿主明暗漂移），而芯片预览色按宿主明暗取——因此下列 ' + modeDrift.length + ' 个主题在浅色宿主下的芯片颜色会落在别的色系里，分组位置不变。这是既有裁决，不是本票要改的东西，记在此处以免「并排」时误判。</div>')
H.push('<table><tr><th>主题</th><th>dark 归属</th><th>dark hue</th><th>light 归属</th><th>light hue</th></tr>')
for (const r of modeDrift) H.push('<tr><td>' + esc(r.zh) + '</td><td>' + esc(ZH_GROUP[r.dark] || r.dark) + '</td><td class="num">' + r.darkHue.toFixed(1) + '</td><td>' + esc(ZH_GROUP[r.light] || r.light) + '</td><td class="num">' + r.lightHue.toFixed(1) + '</td></tr>')
H.push('</table>')
H.push('</body></html>')
writeFileSync(join(HERE, 'group-boundary-68.html'), H.join('\n'))

// ── 4) 机读分析（供 issue 记录）──
console.log(JSON.stringify({
  thresholds: [160, 200, 230],
  boundaries: analysis,
  groups: THREE.map(function (g) { const l = groupRows(g); return { key: g, zh: ZH_GROUP[g], count: l.length, min: l[0].hue, max: l[l.length - 1].hue, themes: l.map(function (r) { return r.name + '@' + r.hue.toFixed(1) }) } }),
}, null, 1))
console.log('[gen] prototypes/group-boundary-68.html 已写出')
