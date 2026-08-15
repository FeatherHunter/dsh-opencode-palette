// engine.test.mjs — 引擎单测（node --test tests/，无需浏览器）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  themeNames, themeStats, previewColors, renderTheme, auditAll,
} from '../src/engine/index.mjs'
import { resolveColor, resolveThemeColors, collectErrors, ansiToHex } from '../src/engine/resolve.mjs'
import { getThemeJson, isSystem, SYSTEM_THEME } from '../src/engine/registry.mjs'
import { themeGroups, GROUP_ORDER, GROUP_COLORS, hueOf, groupOf, resolvePreview } from '../src/engine/grouping.mjs'
import { generateTheme, buildTokens } from '../src/engine/generate.mjs'

const TYPO = { mode: 'mono', size: 13, fontKey: 'JetBrains Mono' }

test('注册表: 34 个主题（33 静态 + system），字母序', () => {
  const names = themeNames()
  assert.equal(names.length, 34)
  assert.equal(themeStats().static, 33)
  const sorted = [...names].sort((a, b) => a.localeCompare(b))
  assert.deepEqual(names, sorted)
  assert.ok(names.includes(SYSTEM_THEME))
  assert.ok(names.includes('opencode'))
  assert.ok(names.includes('matrix'))
  assert.ok(isSystem(SYSTEM_THEME))
  assert.ok(getThemeJson('opencode') !== null)
  assert.equal(getThemeJson('不存在的主题'), null)
})

test('resolve: hex / 引用链 / ANSI / transparent / 变体', () => {
  const defs = { base: '#123456', named: 'base', duo: { dark: '#111111', light: '#EEEEEE' } }
  const theme = { self: 'named', num: 1, none: 'none', hex: '#ABC', bad: '#GGG' }
  assert.equal(resolveColor('#aabbcc', defs, theme, 'dark'), '#AABBCC')
  assert.equal(resolveColor('named', defs, theme, 'dark'), '#123456')
  assert.equal(resolveColor('self', defs, theme, 'dark'), '#123456') // theme 自引用
  assert.equal(resolveColor('duo', defs, theme, 'dark'), '#111111')
  assert.equal(resolveColor('duo', defs, theme, 'light'), '#EEEEEE')
  assert.equal(resolveColor('none', defs, theme, 'dark'), 'transparent')
  assert.equal(resolveColor(1, defs, theme, 'dark'), '#800000') // ANSI 红
  assert.equal(ansiToHex(15), '#FFFFFF')
  assert.throws(() => resolveColor('bad', defs, theme, 'dark'), /未知颜色引用/)
})

test('resolve: 循环引用检测', () => {
  const defs = { a: 'b', b: 'a' }
  assert.throws(() => resolveColor('a', defs, {}, 'dark'), /循环/)
})

test('全量审计: 34 个主题 0 解析失败', () => {
  const report = auditAll()
  assert.equal(report.ok.length, 34)
  assert.deepEqual(report.broken, [])
})

test('每个主题都能渲染出 tokens 与 css', () => {
  for (const name of themeNames()) {
    const r = renderTheme(name, TYPO)
    assert.ok(r.css.length > 100, name + ' css 过短')
    if (!isSystem(name)) {
      // 阈值 25：透明背景主题（lucent-orng）会跳过背景类 token，属预期行为
      assert.ok(Object.keys(r.tokens).length >= 25, name + ' tokens 过少: ' + Object.keys(r.tokens).length)
    } else {
      assert.equal(Object.keys(r.tokens).length, 0, 'system 不覆盖颜色 token')
      assert.ok(!r.css.includes('--dsw-alias-bg-base'), 'system 不注入颜色变量')
    }
  }
})

test('opencode 官方主题: 关键色与官方 JSON 一致', () => {
  const r = renderTheme('opencode', TYPO)
  assert.equal(r.tokens['--dsw-alias-bg-base'].dark, '#0A0A0A')
  assert.equal(r.tokens['--dsw-alias-brand-primary'].dark, '#FAB283')
  assert.equal(r.tokens['--shiki-token-keyword'].dark, '#9D7CD8')
  assert.equal(r.tokens['--shiki-token-function'].dark, '#FAB283')
  const p = previewColors('opencode')
  assert.equal(p.background, '#0A0A0A')
  assert.equal(p.primary, '#FAB283')
})

test('代表性主题色值: dracula / matrix / gruvbox', () => {
  assert.equal(renderTheme('dracula', TYPO).tokens['--dsw-alias-bg-base'].dark, '#282A36')
  assert.equal(renderTheme('matrix', TYPO).tokens['--dsw-alias-bg-base'].dark, '#0A0E0A')
  assert.equal(renderTheme('matrix', TYPO).tokens['--dsw-alias-label-primary'].dark, '#62FF94')
  assert.equal(renderTheme('gruvbox', TYPO).tokens['--dsw-alias-bg-base'].dark, '#282828')
})

test('system 主题: 只排印不碰颜色', () => {
  const r = renderTheme(SYSTEM_THEME, TYPO)
  assert.equal(Object.keys(r.tokens).length, 0)
  assert.ok(r.css.includes('--dsw-font-family'))
  assert.ok(!r.css.includes('--shiki-token-'))
})

test('确定性: 同一输入两次渲染完全一致', () => {
  const a = renderTheme('tokyonight', TYPO)
  const b = renderTheme('tokyonight', TYPO)
  assert.equal(a.css, b.css)
  assert.deepEqual(a.tokens, b.tokens)
})

test('previewColors: 34 主题全部可预览（hex 或 null）', () => {
  for (const name of themeNames()) {
    const p = previewColors(name)
    assert.ok(p, name + ' 预览缺失')
    for (const k of ['background', 'primary', 'accent']) {
      const v = p[k]
      assert.ok(v === null || /^#[0-9A-F]{6,8}$/.test(v), name + ' ' + k + ' 非法: ' + v)
    }
  }
})

test('透明主题 lucent-orng: 背景透明不写 token，文字仍生效', () => {
  const r = renderTheme('lucent-orng', TYPO)
  assert.equal(r.tokens['--dsw-alias-bg-base'], undefined) // transparent → 跳过（保留 DSH 默认）
  assert.equal(r.tokens['--dsw-alias-label-primary'].dark, '#EEEEEE')
})

test('shiki 语法色映射完整性（10 个变量全覆盖）', () => {
  const SHIKI_VARS = [
    '--shiki-foreground', '--shiki-token-comment', '--shiki-token-keyword',
    '--shiki-token-function', '--shiki-token-parameter', '--shiki-token-constant',
    '--shiki-token-string', '--shiki-token-string-expression',
    '--shiki-token-punctuation', '--shiki-token-link',
  ]
  for (const name of themeNames()) {
    if (isSystem(name)) continue
    const r = renderTheme(name, TYPO)
    for (const v of SHIKI_VARS) {
      assert.ok(r.tokens[v], name + ' 缺 ' + v)
    }
  }
})

test('generate: buildTokens 对缺失色位容错（不抛异常）', () => {
  const colors = { background: '#000000', text: '#FFFFFF' }
  const tokens = buildTokens(colors)
  assert.ok(tokens['--dsw-alias-bg-base'])
  assert.equal(tokens['--dsw-alias-state-error-primary'], undefined) // 缺失 → 跳过
})

test('generateTheme(null) = system 语义', () => {
  const r = generateTheme(null, TYPO, SYSTEM_THEME)
  assert.equal(r.meta.theme, SYSTEM_THEME)
  assert.deepEqual(r.tokens, {})
})

test('色系分组: 34 主题全覆盖且不重复，组序符合 GROUP_ORDER', () => {
  const groups = themeGroups()
  const seen = []
  for (const g of groups) {
    assert.ok(GROUP_ORDER.includes(g.name), '未知组名 ' + g.name)
    assert.ok(GROUP_COLORS[g.name], '组缺代表色 ' + g.name)
    for (const t of g.themes) seen.push(t.name)
  }
  assert.equal(seen.length, 34)
  assert.equal(new Set(seen).size, 34)
  const orderIdx = groups.map((g) => GROUP_ORDER.indexOf(g.name))
  assert.deepEqual(orderIdx, [...orderIdx].sort((a, b) => a - b))
})

test('色系分组: 特殊/透明主题归位，暖橙含 opencode', () => {
  const groups = themeGroups()
  const by = (g) => groups.find((x) => x.name === g).themes.map((t) => t.name)
  assert.ok(by('特殊').includes('system'))
  assert.ok(by('透明').includes('lucent-orng'))
  assert.ok(by('暖橙').includes('opencode'))
  assert.ok(by('冷蓝').includes('tokyonight'))
})

test('hueOf 色相计算: 红≈0 绿≈120 蓝≈240，中性 → -2', () => {
  const r = hueOf('#FF0000')
  assert.ok(r < 35 || r > 330)
  assert.ok(hueOf('#00FF00') > 100 && hueOf('#00FF00') < 140)
  assert.ok(hueOf('#0000FF') > 220 && hueOf('#0000FF') < 260)
  assert.equal(hueOf('#888888'), -2)
  assert.equal(hueOf(null), -1)
})

test('groupOf: system → 特殊，透明背景 → 透明', () => {
  assert.equal(groupOf('system', { background: '#000', primary: '#FFF' }), '特殊')
  assert.equal(groupOf('lucent-orng', resolvePreview('lucent-orng')), '透明')
})
