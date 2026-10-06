// group-boundary.test.mjs — #68 色系边界冻结（青绿/青蓝/冷蓝）pin 测试
// 结论与理由见 src/engine/grouping.mjs 的「色系边界冻结」注释；本文件把「冻结」变成会红的门：
//   1) 阈值 pin：160/200/230 的 ±1° 探针各落一侧（改阈值就红）；
//   2) 归属 pin：边界两侧最近主题钉死在各自组（主题数据升级越界就红）；
//   3) 余量跳闸线：三条票内边界两侧最近主题 ≥2°（贴边即红，逼一次复审）；
//   4) 分区完整性：三组非空且在色相轴上连续；
//   5) 中文名体例 pin：青字头 ×2 ＋ 冷字头 ×1；
//   6) dark 基线 pin（issue 47）：明暗两套预览色不得改变分组成员。
// 只读引擎与源码，不需要构建（渲染侧的词典断言见 tests/panel-render.test.mjs）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { themeNames } from '../src/engine/index.mjs'
import { themeGroups, hueOf, groupOf, resolvePreview } from '../src/engine/grouping.mjs'

// HSV(h,100%,100%) → #rrggbb：给 hueOf 一个高饱和探针（低饱和会被判成中性 -2，探不到阈值）
function hsvHex(h) {
  const f = (n) => {
    const k = (n + h / 60) % 6
    return Math.round(255 * (1 - Math.max(0, Math.min(k, 4 - k, 1))))
  }
  return '#' + [f(5), f(3), f(1)].map((v) => v.toString(16).padStart(2, '0')).join('')
}
const probeGroup = (h) => groupOf('probe', { background: '#000000', primary: hsvHex(h) })

// 票内三条边界：下侧组/上侧组 ＋ 两侧最近主题（同 hue 并列时取注册表序第一个，实测表见 #68）
const BOUNDARIES = [
  { at: 160, lower: 'teal', upper: 'cyan-blue', below: 'gruvbox', above: 'osaka-jade' },
  { at: 200, lower: 'cyan-blue', upper: 'cool-blue', below: 'nord', above: 'ayu' },
  { at: 230, lower: 'cool-blue', upper: 'violet', below: 'mercury', above: 'aura' },
]
const MIN_MARGIN = 2 // 度：实测最小 2.0（Ayu 202.0 对边界 200）

function hueByName() {
  const m = {}
  for (const n of themeNames()) m[n] = hueOf(resolvePreview(n, 'dark').primary)
  return m
}
function membersOf(mode) {
  const m = {}
  for (const g of themeGroups(mode)) for (const t of g.themes) m[t.name] = g.name
  return m
}

test('边界阈值 pin（#68）：160/200/230 的 ±1° 探针各落一侧', () => {
  assert.equal(probeGroup(159), 'teal')
  assert.equal(probeGroup(161), 'cyan-blue')
  assert.equal(probeGroup(199), 'cyan-blue')
  assert.equal(probeGroup(201), 'cool-blue')
  assert.equal(probeGroup(229), 'cool-blue')
  assert.equal(probeGroup(231), 'violet')
})

test('边界两侧最近主题归属 pin（#68）：越界即红', () => {
  const mem = membersOf('dark')
  for (const b of BOUNDARIES) {
    assert.equal(mem[b.below], b.lower, b.below + ' 应留在 ' + b.lower + '（#68 冻结）')
    assert.equal(mem[b.above], b.upper, b.above + ' 应留在 ' + b.upper + '（#68 冻结）')
  }
})

test('边界余量跳闸线（#68）：三条票内边界两侧最近主题 ≥2°', () => {
  const hues = Object.values(hueByName()).filter((h) => h >= 0)
  for (const b of BOUNDARIES) {
    const below = Math.max(...hues.filter((h) => h < b.at))
    const above = Math.min(...hues.filter((h) => h >= b.at))
    assert.ok(b.at - below >= MIN_MARGIN, '边界 ' + b.at + ' 下侧余量只剩 ' + (b.at - below).toFixed(2) + '°：已到跳闸线，上游主题数据升级越界，复审后改 grouping 注释与测试')
    assert.ok(above - b.at >= MIN_MARGIN, '边界 ' + b.at + ' 上侧余量只剩 ' + (above - b.at).toFixed(2) + '°：已到跳闸线，同上')
  }
})

test('分区完整性（#68）：青绿/青蓝/冷蓝非空且在色相轴上连续', () => {
  const groups = themeGroups('dark')
  const by = (g) => groups.find((x) => x.name === g)
  const hue = hueByName()
  const hs = (g) => by(g).themes.map((t) => hue[t.name])
  for (const g of ['teal', 'cyan-blue', 'cool-blue']) {
    assert.ok(by(g) && by(g).themes.length >= 2, g + ' 组不应为空或孤例')
  }
  assert.ok(Math.max(...hs('teal')) < Math.min(...hs('cyan-blue')), '青绿与青蓝在色相轴上必须连续')
  assert.ok(Math.max(...hs('cyan-blue')) < Math.min(...hs('cool-blue')), '青蓝与冷蓝在色相轴上必须连续')
})

test('中文名体例 pin（#68）：青字头 ×2 ＋ 冷字头 ×1', () => {
  const src = readFileSync(new URL('../runtime/client.mjs', import.meta.url), 'utf8')
  const zhOf = (key) => {
    const line = src.split(String.fromCharCode(10)).find((l) => l.trim().startsWith("'" + key + "':"))
    assert.ok(line, 'runtime/client.mjs 缺中文名：' + key)
    const m = line.match(/zh: '([^']+)'/)
    assert.ok(m, 'runtime/client.mjs 的 ' + key + ' 缺 zh 字段')
    return m[1]
  }
  assert.equal(zhOf('group.teal'), '青绿')
  assert.equal(zhOf('group.cyan-blue'), '青蓝')
  assert.equal(zhOf('group.cool-blue'), '冷蓝')
  // 体例：青字头覆盖 [90,200) 两段，[200,230) 用冷字头区分纯蓝段（整组名＝两端温度锚＋中段邻接复合）
  assert.equal(zhOf('group.teal')[0], '青')
  assert.equal(zhOf('group.cyan-blue')[0], '青')
  assert.equal(zhOf('group.cool-blue')[0], '冷')
})

test('dark 基线 pin（issue 47）：明暗两套预览色不得改变分组成员', () => {
  const dark = membersOf('dark')
  const light = membersOf('light')
  assert.deepEqual(Object.keys(light).sort(), Object.keys(dark).sort())
  for (const n of Object.keys(dark)) assert.equal(light[n], dark[n], n + ' 的分组随宿主明暗漂移了（issue 47：分组键恒取 dark 基线）')
})
