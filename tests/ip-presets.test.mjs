// ip-presets.test.mjs — IP 预置主题第二来源（src/custom-presets/20 套）接线测试
// 双来源：内置 38（37+system，冻结不动）+ IP 21（只进自定义编辑器「选基底」，不进 themeNames）。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listIpPresets, getIpPreset, countIpPresets, IP_PRESET_IDS } from '../src/engine/ip-presets.mjs'
import { themeNames, themeStats } from '../src/engine/index.mjs'
import { COLOR_SLOTS } from '../src/engine/map-dsh.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const HEX_RE = /^#[0-9a-fA-F]{6}$/
const EXPECTED_IDS = [
  'cyberpunk-2077', 'dc-comics', 'disney', 'doraemon', 'dragon-ball', 'evangelion',
  'genshin', 'harry-potter', 'hello-kitty', 'kuromi', 'lego', 'mario', 'marvel', 'naruto',
  'one-piece', 'pokemon', 'sailor-moon', 'star-wars', 'transformers',
  'ultraman', 'zelda',
]

test('IP 预置 21 套，id 清单稳定（字母序）', function () {
  assert.equal(countIpPresets(), 21)
  assert.deepEqual(IP_PRESET_IDS.slice().sort(), EXPECTED_IDS)
  assert.deepEqual(
    listIpPresets().map(function (p) { return p.name }),
    EXPECTED_IDS
  )
})

test('每套 37 槽齐、值全是 hex、名非空、外观合法', function () {
  let dark = 0
  let light = 0
  for (const p of listIpPresets()) {
    assert.ok(p.name && typeof p.name === 'string', p.name + ' 有名')
    assert.ok(p.title && typeof p.title === 'string', p.name + ' 有中文展示名')
    assert.ok(p.appearance === 'dark' || p.appearance === 'light', p.name + ' 外观合法')
    if (p.appearance === 'dark') dark++
    else light++
    assert.equal(Object.keys(p.colors).length, 37, p.name + ' 37 槽')
    for (const slot of COLOR_SLOTS) {
      const v = p.colors[slot.key]
      assert.ok(HEX_RE.test(v), p.name + '.' + slot.key + '=' + v + ' 是 hex')
    }
  }
  assert.equal(dark, 14, '深色 14')
  assert.equal(light, 7, '浅色 7（含库洛米）')
})

test('getIpPreset 按 id 取，miss 回 null', function () {
  assert.equal(getIpPreset('sailor-moon').appearance, 'light')
  assert.equal(getIpPreset('sailor-moon').title, '美少女战士')
  assert.equal(getIpPreset('pokemon').appearance, 'dark')
  assert.equal(getIpPreset('pokemon').title, '宝可梦')
  assert.equal(getIpPreset('nope'), null)
  assert.equal(getIpPreset('system'), null)
})

test('内置清单冻结：IP 不进 themeNames（38 款口径不动）', function () {
  assert.equal(themeNames().length, 38)
  assert.deepEqual(themeStats(), { static: 37, total: 38 })
  for (const id of EXPECTED_IDS) {
    assert.ok(themeNames().indexOf(id) < 0, id + ' 不进内置清单')
  }
})

test('产物同步：构建后的 client.js 内含 21 个 IP id', function () {
  const bundle = readFileSync(join(ROOT, 'package', 'lib', 'client.js'), 'utf8')
  for (const id of EXPECTED_IDS) {
    assert.ok(bundle.includes(id), 'bundle 含 ' + id)
  }
})
