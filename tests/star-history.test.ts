// star-history.test.ts — 星标曲线的门禁（数据 / 画图 / 两页 README 的引用）
//
// 2026-10-21 用户要求：给本仓加一个 Star History 展示，放在 CONNECT 区域下面。
// 这条门禁盯三件事：
//   1. 聚合与画图是纯函数、同数据同字节 —— 每日 Action 才能在数据没变时不提交噪声；
//   2. 盘上的 SVG 与盘上的 JSON 必须是同一份数据画的（改了数据忘了重画就红）；
//   3. 两页 README 都在 CONNECT 之后引用这张图，且带 ?v= 缓存戳（图片代理按 URL 缓存）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { aggregateByDay, buildSvg, type StarDay } from '../scripts/star-history.ts'

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

test('buildSvg：一张图顶两套配色（CSS 变量 + prefers-color-scheme），不拆深浅两个文件', () => {
  const svg = buildSvg([{ date: '2026-08-15', total: 1, daily: 1 }])
  assert.ok(svg.includes('prefers-color-scheme: dark'), 'SVG 内应带深色模式媒体查询')
  assert.ok(svg.includes('--bg:#fffdf7') && svg.includes('--bg:#0b0e14'), '深浅两套底色都该在 CSS 变量里')
  assert.equal(/star-history-(dark|light)[.]svg/.test(svg), false, '不再拆成深浅两个文件')
})

test('buildSvg：图里有坐标轴、图例与总数标注', () => {
  const svg = buildSvg(DATA)
  assert.ok(svg.includes('viewBox="0 0 840 480"'), '应有固定 viewBox')
  assert.equal((svg.match(/>Star History</g) || []).length, 1, '标题只出现一次')
  assert.ok(svg.includes('Total Stars') && svg.includes('Daily New'), '图例两项都在')
  assert.ok(svg.includes('stroke-dasharray="6 4"'), '每日新增应是虚线')
  const last = DATA[DATA.length - 1]
  assert.ok(svg.includes(`${last.total} stars · ${last.date}`), '右下角应写明当前总数与日期')
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
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN]] as const) {
    const connect = doc.indexOf('<sub>CONNECT</sub>')
    const at = doc.indexOf(CHART_URL)
    assert.ok(connect > -1, `${name} 应有 CONNECT 段`)
    assert.ok(at > connect, `${name} 的星标图应落在 CONNECT 段之后`)
    assert.ok(doc.includes('<sub>STAR HISTORY</sub>'), `${name} 应有 STAR HISTORY 段`)
    assert.ok(/star-history\.svg\?v=[0-9]{8}/.test(doc), `${name} 的星标图 URL 应带 ?v= 缓存戳`)
  }
})
