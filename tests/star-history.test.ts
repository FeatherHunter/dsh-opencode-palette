// star-history.test.ts — 星标曲线的门禁（数据 / 画图 / 两页 README 的引用）
//
// 2026-10-21 用户要求：给本仓加一个 Star History 展示，放在 CONNECT 区域下面；
// 同日又按交接文档（D:\Temp\handoff-star-history-session-2026-10-21.md，源仓 B3 方案）
// 把图改成那个形式：双 Y 轴、两条曲线都平滑、轴名横排染色兼作色键（不画图例）、
// 两条曲线各标峰值、浅色主题整体压深。
//
// 这条门禁钉住那份文档 §5 列的契约（逐条对应下面的用例名）：
//   1. 聚合是纯函数（空输入、UTC 日界、坏时间戳跳过）
//   2. 画图是纯函数，同数据同字节（每日 Action 才能在数据没变时不提交噪声）
//   3. 盘上的 SVG 与盘上的 JSON 必须是同一份数据画的（改了数据忘了重画就红）
//   4. 双 Y 轴：两轴各有 data-axis，两列刻度各带 data-axis 且用各自系列色
//   5. 轴名横排、不竖排（SVG 里不许出现 rotate(），轴名兼作色键 → 不许有图例
//   6. Daily 路径是 C 段平滑、不越界、拐点切线连续（不造假峰、不出尖角）
//   7. 峰值标注必须来自数据（data-peak 属性 + 数值等于真实最大值）
//   8. 默认字色落在根 <svg> 的 fill 上，<style> 里不许写 fill:（会盖掉元素的 fill）
//   9. 浅色主题用压深后的红/蓝，旧亮色不许回潮
//  10. 两页 README 都在 CONNECT 之后引用这张图，且带 ?v= 缓存戳（图片代理按 URL 缓存）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { aggregateByDay, buildSvg, monotonePath, type StarDay } from '../scripts/star-history.ts'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const ZH = readFileSync(join(ROOT, 'README.md'), 'utf8')
const EN = readFileSync(join(ROOT, 'docs', 'README.en.md'), 'utf8')
const DATA = JSON.parse(readFileSync(join(ROOT, 'docs', 'star-history.json'), 'utf8')) as StarDay[]
const SVG = readFileSync(join(ROOT, 'docs', 'star-history.svg'), 'utf8')
const CHART_URL = 'https://raw.githubusercontent.com/FeatherHunter/dsh-opencode-palette/main/docs/star-history.svg'

test('aggregateByDay：空输入返回空数组', () => {
  assert.deepEqual(aggregateByDay([]), [])
})

test('aggregateByDay：同一天的多颗星算成一天，total 是 daily 的累积和', () => {
  const got = aggregateByDay(['2026-08-15T01:00:00Z', '2026-08-15T23:59:59Z', '2026-08-16T00:00:01Z'])
  assert.deepEqual(got, [
    { date: '2026-08-15', total: 2, daily: 2 },
    { date: '2026-08-16', total: 3, daily: 1 },
  ])
})

test('aggregateByDay：坏时间戳被跳过，日期按 UTC 日界切', () => {
  const got = aggregateByDay(['not-a-date', '', '2026-08-15T23:30:00Z'])
  assert.deepEqual(got, [{ date: '2026-08-15', total: 1, daily: 1 }])
})

test('buildSvg：同数据两次调用字节一致（手绘抖动来自种子，不是随机数）', () => {
  const data: StarDay[] = [
    { date: '2026-08-15', total: 1, daily: 1 },
    { date: '2026-08-16', total: 3, daily: 2 },
  ]
  assert.equal(buildSvg(data), buildSvg(data))
})

test('buildSvg：图里有坐标轴、日期刻度、页脚说明与固定画幅', () => {
  const svg = buildSvg(DATA)
  assert.ok(svg.includes('viewBox="0 0 840 480"'), '应有固定 viewBox')
  assert.equal((svg.match(/>Star History</g) || []).length, 1, '标题只出现一次')
  assert.ok(svg.includes('stroke-dasharray="6 4"'), '每日新增应是虚线')
  const last = DATA[DATA.length - 1]
  assert.ok(svg.includes(`${last.total} stars · ${last.date}`), '右下角应写明当前总数与日期')
  assert.ok(svg.includes('>Date<'), '横轴应有轴名')
  assert.ok(/\d\d\/\d\d/.test(svg), '横轴应有 MM/DD 刻度')
})

test('buildSvg：双 Y 轴 —— 两轴各有 data-axis，两列刻度各用自己系列色', () => {
  const svg = buildSvg(DATA)
  assert.ok(svg.includes('data-axis="total"'), '左轴（Total）应有 data-axis 标记')
  assert.ok(svg.includes('data-axis="daily"'), '右轴（Daily）应有 data-axis 标记')
  assert.ok(
    svg.includes('text-anchor="end" font-size="13" fill="var(--total)" data-axis="total"'),
    '左列刻度数字必须用 Total 系列色',
  )
  assert.ok(
    svg.includes('text-anchor="start" font-size="13" fill="var(--daily)" data-axis="daily"'),
    '右列刻度数字必须用 Daily 系列色',
  )
  // 右轴刻度配一小段同色刻度线：读的是右轴，不是最近的横网格
  assert.ok(/stroke="var\(--daily\)" stroke-width="1\.4"/.test(svg), '右轴刻度应有同色刻度短线')
})

test('buildSvg：轴名横排染色兼作色键 —— 不竖排、不画图例', () => {
  const svg = buildSvg(DATA)
  assert.ok(svg.includes('>Total Stars<'), '左轴应有横排轴名 Total Stars')
  assert.ok(svg.includes('>Daily New<'), '右轴应有横排轴名 Daily New')
  assert.ok(svg.includes('fill="var(--total)">Total Stars<'), '轴名要用自己系列的颜色')
  assert.ok(svg.includes('fill="var(--daily)">Daily New<'), '轴名要用自己系列的颜色')
  assert.equal(svg.includes('rotate('), false, '轴名不许竖排：竖排要歪头读')
  // 图例被轴名取代了：图里只该有背景那一个 rect
  assert.equal((svg.match(/<rect/g) || []).length, 1, '不该有图例框（轴名兼作色键）')
  assert.equal(/legend/i.test(svg), false, '不该再有图例')
})

test('buildSvg：峰值标注来自数据（两条曲线各标自己最高点）', () => {
  const svg = buildSvg(DATA)
  assert.ok(svg.includes('data-peak="total"'), 'Total 曲线必须标出最高点')
  assert.ok(svg.includes('data-peak="daily"'), 'Daily 曲线必须标出最高点')
  const maxTotal = Math.max(...DATA.map((d) => d.total))
  const maxDaily = Math.max(...DATA.map((d) => d.daily))
  const totalPeak = (svg.match(/data-peak="total">(\d+)<\/text>/) || [])[1] || ''
  const dailyPeak = (svg.match(/data-peak="daily">(\d+)<\/text>/) || [])[1] || ''
  assert.equal(totalPeak, String(maxTotal), 'Total 峰值标注必须是数据里的最大总量')
  assert.equal(dailyPeak, String(maxDaily), 'Daily 峰值标注必须是数据里的单日最高')
  // 底衬用背景色画一圈，压在网格/曲线上也读得清
  assert.ok(svg.includes('stroke="var(--bg)" stroke-width="3" paint-order="stroke"'), '峰值标注要有背景色底衬')
})

test('buildSvg：Daily 曲线是平滑的 C 段路径，不越界、拐点不尖', () => {
  const svg = buildSvg(DATA)
  const dailyPath = (svg.match(/d="([^"]+)" fill="none" stroke="var\(--daily\)"/) || [])[1] || ''
  assert.ok(dailyPath.includes('C'), 'Daily 曲线必须是 C 段平滑路径，不是折线')
  assert.ok(!dailyPath.includes(' L '), 'Daily 曲线不许退回尖角折线')
  // 单调三次插值的硬性质：每段的控制点不许越出该段两端的取值范围（否则是插值出来的假峰）
  const zig: number[][] = [
    [0, 100],
    [40, 60],
    [80, 100],
    [120, 20],
    [160, 80],
  ]
  const segs: number[][] = monotonePath(zig)
    .split('C')
    .slice(1)
    .map((s) => s.trim().split(/[\s,]+/).map(Number))
  assert.equal(segs.length, zig.length - 1, '每两个点之间一段三次曲线')
  segs.forEach((nums, i) => {
    const lo = Math.min(zig[i][1], zig[i + 1][1])
    const hi = Math.max(zig[i][1], zig[i + 1][1])
    for (let k = 1; k < nums.length; k += 2) {
      assert.ok(
        nums[k] >= lo - 1e-6 && nums[k] <= hi + 1e-6,
        `第 ${i + 1} 段的控制点越出了两端取值范围，会造出假峰`,
      )
    }
  })
  // 相邻两段在拐点处切线一致，否则拐点就是一个尖角
  for (let i = 0; i < segs.length - 1; i++) {
    const a = segs[i]
    const b = segs[i + 1]
    const slopeIn = (a[5] - a[3]) / (a[4] - a[2])
    const slopeOut = (b[1] - a[5]) / (b[0] - a[4])
    assert.ok(Math.abs(slopeIn - slopeOut) < 0.1, `第 ${i + 1} 个拐点是尖角`)
  }
})

test('buildSvg：默认字色落在根 <svg> 的 fill 上，<style> 里不许写 fill:', () => {
  const svg = buildSvg(DATA)
  const styleBlock = (svg.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || ''
  assert.equal(styleBlock.includes('fill:'), false, '默认字色不许写进 <style>：CSS 规则会盖掉所有元素自己的 fill')
  assert.ok(/<svg[^>]*fill="var\(--text\)"/.test(svg), '根 svg 必须带主题正文色（由子元素继承）')
})

test('buildSvg：浅色主题用压深后的红蓝，旧亮色不许回潮', () => {
  const svg = buildSvg(DATA)
  assert.ok(svg.includes('--total:#b93a34') && svg.includes('--daily:#1d4ed8'), '浅色主题应使用压深后的红/蓝')
  assert.equal(svg.includes('#d94f4f') || svg.includes('#2f81f7'), false, '浅色主题的旧亮色不许回潮')
  assert.ok(svg.includes('--total:#ff6b6b') && svg.includes('--daily:#38bdf8'), '深色主题应使用亮色红/蓝')
  assert.ok(svg.includes('prefers-color-scheme: dark'), '深色配色应在媒体查询里（一张图顶两套配色）')
})

test('盘上的产物必须与盘上的数据一致（改了 JSON 忘了重画就红）', () => {
  assert.equal(SVG, buildSvg(DATA), 'docs/star-history.svg 应是 docs/star-history.json 现画出来的')
})

test('docs/star-history.json：日期升序，total 是 daily 的累积和', () => {
  assert.ok(DATA.length > 0, '本仓至少有一颗星')
  const dates = DATA.map((d) => d.date)
  assert.deepEqual(dates, [...dates].sort(), '日期应升序')
  let running = 0
  for (const d of DATA) {
    running += d.daily
    assert.equal(d.total, running, `${d.date} 的 total 应等于 daily 的累积和`)
  }
})

test('两页 README 都在 CONNECT 之后引用星标图，且带 ?v= 缓存戳', () => {
  for (const [name, doc] of [
    ['中文页', ZH],
    ['英文页', EN],
  ] as const) {
    const connect = doc.indexOf('<sub>CONNECT</sub>')
    const at = doc.indexOf(CHART_URL)
    assert.ok(connect > -1, `${name} 应有 CONNECT 段`)
    assert.ok(at > connect, `${name} 的星标图应落在 CONNECT 段之后`)
    assert.ok(/star-history\.svg\?v=[0-9]{8,12}/.test(doc), `${name} 的星标图 URL 应带 ?v= 缓存戳`)
    // 2026-10-21 用户判标题多余：图表自己就写着 Star History，段标题去掉
    assert.equal(doc.includes('<sub>STAR HISTORY</sub>'), false, `${name} 不该再有 STAR HISTORY 段标题`)
  }
})
