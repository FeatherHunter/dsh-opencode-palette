// Star History 纯函数：按 UTC 日聚合 + 手绘风 SVG 生成。
//
// 移植自 dsh-mattpocock-skills-deck（scripts/star-history.mts + scripts/generate-star-history-svg.mts），
// 三处改动都是本仓的硬约束逼出来的：
//   1. 一张 SVG 顶两套配色（CSS 变量 + prefers-color-scheme 媒体查询），不再拆 dark/light 两张 ——
//      本仓 README 用**纯 markdown 图片**内嵌：市场详情页的渲染器整段丢弃原始 HTML，<picture> 会整块消失。
//      SVG 内部的媒体查询在 <img> 里照样生效（浏览器按系统配色偏好解析），深浅自动跟手。
//   2. 文件名统一 .ts（本仓 Node ≥ 22.18 原生类型剥离直跑，不用 .mts）。
//   3. 抖动种子只吃数据不吃主题名 —— 只有一张图了。
//
// 不变量：buildSvg 是纯函数，同输入必产出同字节（每日 Action 在数据不变时不产生噪声提交）。
// 手绘感来自确定性种子抖动（fnv1a + mulberry32），不是 Math.random。

export interface StarDay {
  date: string
  total: number
  daily: number
}

// 输入：starredAtList（ISO 8601 时间戳数组）→ 输出：按 UTC 日聚合的 [{date,total,daily}]
export function aggregateByDay(starredAtList: string[]): StarDay[] {
  if (!Array.isArray(starredAtList) || starredAtList.length === 0) return []
  const dayCounts = new Map<string, number>()
  for (const iso of starredAtList) {
    if (typeof iso !== 'string' || !iso) continue
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) continue
    const key = d.toISOString().slice(0, 10) // YYYY-MM-DD（UTC 日界）
    dayCounts.set(key, (dayCounts.get(key) || 0) + 1)
  }
  const sortedDays = Array.from(dayCounts.keys()).sort()
  let running = 0
  return sortedDays.map((date) => {
    const daily = dayCounts.get(date) ?? 0
    running += daily
    return { date, total: running, daily }
  })
}

const FONT = '"Comic Sans MS","Comic Sans","Chalkboard SE","Marker Felt","Segoe Print",cursive'
const W = 840
const H = 480
const PAD_L = 64
const PAD_R = 36
const PAD_T = 64
const PAD_B = 58

// 深浅两套配色写进 CSS 变量：浅色是默认值，深色在 prefers-color-scheme: dark 下覆盖。
// 颜色取自源仓那套手绘配色（浅色米白底 / 深色近黑底），不再另造。
const THEME_CSS = [
  ':root{--bg:#fffdf7;--text:#24292f;--muted:#57606a;--grid:#e8ebf0;--axis:#24292f;--total:#d94f4f;--daily:#2f81f7}',
  '@media (prefers-color-scheme: dark){:root{--bg:#0b0e14;--text:#e6edf3;--muted:#9aa3b2;--grid:#232b3a;--axis:#cdd9e5;--total:#ff6b6b;--daily:#38bdf8}}',
  `text{font-family:${FONT};fill:var(--text)}`,
  '.bg{fill:var(--bg)}',
  '.grid{stroke:var(--grid)}',
  '.axis{stroke:var(--axis)}',
  '.total{stroke:var(--total)}',
  '.daily{stroke:var(--daily)}',
  '.muted{fill:var(--muted)}',
  '.legend{fill:var(--bg);stroke:var(--text)}',
].join('\n  ')

function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function niceStep(rough: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(1, rough))))
  for (const m of [1, 2, 5, 10]) if (m * pow >= rough) return m * pow
  return 10 * pow
}

// Catmull-Rom 转贝塞尔，让曲线圆滑接近手绘描线
function smoothPath(pts: number[][]): string {
  if (pts.length === 1) return `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}

export function buildSvg(data: StarDay[]): string {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('buildSvg: 没有数据可画（先跑 update-star-history 拉星标时间）')
  }
  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B
  // 抖动种子只吃数据：同数据必同字节
  const rng = mulberry32(fnv1a(JSON.stringify(data)))
  const j = (amp: number): number => (rng() - 0.5) * 2 * amp

  const totals = data.map((d) => d.total)
  const maxTotal = Math.max(1, ...totals)
  const yStep = niceStep(maxTotal / 4)
  const yMax = Math.max(yStep, Math.ceil((maxTotal * 1.06) / yStep) * yStep)

  // 横轴按真实时间线性放：没有新星的日子照样占时间跨度
  const times = data.map((d) => Date.parse(d.date + 'T00:00:00Z'))
  const minX = Math.min(...times)
  const maxX = Math.max(...times)
  const X = (i: number): number =>
    data.length === 1 ? PAD_L + plotW / 2 : PAD_L + ((times[i] - minX) / (maxX - minX)) * plotW
  const Y = (v: number): number => PAD_T + plotH - (v / yMax) * plotH

  const yTicks: number[] = []
  for (let v = 0; v <= yMax; v += yStep) yTicks.push(v)
  const want = Math.min(5, data.length)
  const xTicks: Array<{ i: number; label: string }> = [
    ...new Set(Array.from({ length: want }, (_, k) => Math.round((k * (data.length - 1)) / (want - 1 || 1)))),
  ].map((i) => ({ i, label: data[i].date.slice(5).replace('-', '/') }))

  const totalPts = data.map((d, i) => [X(i) + j(1.1), Y(d.total) + j(1.1)])
  const dailyPts = data.map((d, i) => [X(i) + j(1.1), Y(d.daily) + j(1.1)])

  const axisY = PAD_T + plotH
  const sketchy = (x1: number, y1: number, x2: number, y2: number): string => {
    let d = `M ${x1} ${y1}`
    const segs = 8
    for (let s = 1; s <= segs; s++) {
      const f = s / segs
      d += ` L ${(x1 + (x2 - x1) * f + j(1.2)).toFixed(1)} ${(y1 + (y2 - y1) * f + j(1.2)).toFixed(1)}`
    }
    return d
  }

  const gridLines = yTicks
    .slice(1)
    .map(
      (v) =>
        `<line class="grid" x1="${PAD_L}" y1="${Y(v).toFixed(1)}" x2="${W - PAD_R}" y2="${Y(v).toFixed(1)}" stroke-width="1" opacity="0.7"/>`,
    )
    .join('\n  ')
  const yLabels = yTicks
    .map((v) => `<text class="muted" x="${PAD_L - 10}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" font-size="13">${v}</text>`)
    .join('\n  ')
  const xLabels = xTicks
    .map((tk) => `<text class="muted" x="${X(tk.i).toFixed(1)}" y="${axisY + 24}" text-anchor="middle" font-size="13">${tk.label}</text>`)
    .join('\n  ')

  const legend = `
  <rect class="legend" x="${PAD_L + 14}" y="${PAD_T + 8}" width="152" height="52" rx="7" stroke-width="1.4" opacity="0.92"/>
  <line class="total" x1="${PAD_L + 26}" y1="${PAD_T + 24}" x2="${PAD_L + 52}" y2="${PAD_T + 24}" stroke-width="3" stroke-linecap="round"/>
  <text x="${PAD_L + 60}" y="${PAD_T + 28}" font-size="13">Total Stars</text>
  <line class="daily" x1="${PAD_L + 26}" y1="${PAD_T + 44}" x2="${PAD_L + 52}" y2="${PAD_T + 44}" stroke-width="2" stroke-dasharray="6 4" stroke-linecap="round"/>
  <text x="${PAD_L + 60}" y="${PAD_T + 48}" font-size="13">Daily New</text>`

  const midY = (PAD_T + axisY) / 2
  const last = data[data.length - 1]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>
  ${THEME_CSS}
  </style>
  <rect class="bg" width="100%" height="100%"/>
  <text x="${W / 2}" y="34" text-anchor="middle" font-size="21">Star History</text>
  ${gridLines}
  <path class="axis" d="${sketchy(PAD_L, axisY, W - PAD_R, axisY)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path class="axis" d="${sketchy(PAD_L, PAD_T, PAD_L, axisY)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  ${yLabels}
  ${xLabels}
  <text class="muted" x="18" y="${midY}" font-size="12" transform="rotate(-90 18 ${midY})" text-anchor="middle">Stars</text>
  <text class="muted" x="${W / 2}" y="${H - 12}" font-size="12" text-anchor="middle">Date</text>
  <path class="daily" d="${smoothPath(dailyPts)}" fill="none" stroke-width="1.8" stroke-dasharray="6 4" stroke-linecap="round" opacity="0.9"/>
  <path class="total" d="${smoothPath(totalPts)}" fill="none" stroke-width="3" stroke-linecap="round"/>
${legend}
  <text class="muted" x="${W - PAD_R}" y="${axisY + 44}" text-anchor="end" font-size="12">${last.total} stars · ${last.date}</text>
</svg>`
}
