// float-geometry.test.mjs — 锚定浮层几何单测（纯函数，无 DOM，不依赖宿主）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeMenuGeometry, MENU_MIN_WIDTH, MENU_EDGE } from '../src/engine/float-geometry.mjs'

const VP = { width: 1280, height: 800 }

test('常规：锚点左对齐、下方展开', () => {
  const r = computeMenuGeometry({ left: 100, top: 200, right: 260, bottom: 230, width: 160 }, VP, null, null)
  assert.equal(r.placement, 'below')
  assert.equal(r.left, 100)
  assert.equal(r.top, 234)
})

test('下限宽度：max(240, 锚点宽)，fixed 下禁用百分比', () => {
  // 窄按钮：下限 240 保底
  const narrow = computeMenuGeometry({ left: 500, top: 100, right: 600, bottom: 130, width: 100 }, { width: 300, height: 800 }, null, null)
  assert.ok(narrow.left + MENU_MIN_WIDTH <= 300 - MENU_EDGE + 1 || narrow.left === MENU_EDGE)
  assert.equal(narrow.minW, 240)
  // 宽按钮：下限跟锚点走（100 不寒酸）
  const wide = computeMenuGeometry({ left: 100, top: 100, right: 500, bottom: 130, width: 400 }, VP, null, null)
  assert.equal(wide.left, 100)
  assert.equal(wide.minW, 400)
})

test('右缘溢出：左移拉回视口内', () => {
  const r = computeMenuGeometry({ left: 1100, top: 100, right: 1200, bottom: 130, width: 100 }, VP, 400, 200)
  assert.ok(r.left + 400 <= VP.width - MENU_EDGE + 1, '右缘不得出视口：left=' + r.left)
  assert.ok(r.left >= MENU_EDGE, '左缘不得出视口')
})

test('下方没地儿：向上翻转', () => {
  const r = computeMenuGeometry({ left: 100, top: 700, right: 260, bottom: 730, width: 160 }, VP, null, 200)
  assert.equal(r.placement, 'above')
  assert.ok(r.top + 200 <= 700, '上翻后菜单底不得压住锚点')
  assert.ok(r.top >= MENU_EDGE, '上翻后不得出上沿')
})

test('锚点已出视野：返回 null（调用方关菜单）', () => {
  assert.equal(computeMenuGeometry({ left: 100, top: -50, right: 200, bottom: -10, width: 100 }, VP, null, null), null)
  assert.equal(computeMenuGeometry({ left: 100, top: 810, right: 200, bottom: 840, width: 100 }, VP, null, null), null)
  assert.equal(computeMenuGeometry(null, VP, null, null), null)
})

test('极小视口：钳在边缘内，不乱飞', () => {
  const r = computeMenuGeometry({ left: 10, top: 10, right: 100, bottom: 40, width: 90 }, { width: 200, height: 120 }, null, null)
  assert.ok(r.left >= MENU_EDGE - 1, '左缘钳住')
  assert.ok(r.top >= MENU_EDGE - 1, '上缘钳住')
  assert.ok(r.top <= 120, '下缘钳住')
})
