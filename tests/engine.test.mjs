// engine.test.mjs — 引擎单测（node --test tests/，无需浏览器）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  themeNames, themeStats, previewColors, renderTheme, auditAll,
} from '../src/engine/index.mjs'
import { resolveColor, resolveThemeColors, collectErrors, ansiToHex, withAlpha, shade, contrastText } from '../src/engine/resolve.mjs'
import { getThemeJson, isSystem, SYSTEM_THEME } from '../src/engine/registry.mjs'
import { themeGroups, GROUP_ORDER, GROUP_COLORS, hueOf, groupOf, resolvePreview } from '../src/engine/grouping.mjs'
import { generateTheme, buildTokens, buildTypographyCss } from '../src/engine/generate.mjs'
import { BUNDLED_FONTS } from '../src/engine/font-face.mjs'
import { FONTS, SANS_STACK } from '../src/engine/map-dsh.mjs'

const TYPO = { mode: 'mono', size: 13, fontKey: 'JetBrains Mono' }

test('注册表: 38 个主题（37 静态 + system），字母序', () => {
  const names = themeNames()
  assert.equal(names.length, 38)
  assert.equal(themeStats().static, 37)
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

test('全量审计: 38 个主题 0 解析失败', () => {
  const report = auditAll()
  assert.equal(report.ok.length, 38)
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

test('opencode 徽标对比度: label-primary-inverted 与 label-primary 相反明度（dark/light）', () => {
  const j = getThemeJson('opencode')
  const dt = buildTokens(resolveThemeColors(j, 'dark'))
  assert.equal(dt['--dsw-alias-label-primary'].dark, '#EEEEEE')
  assert.equal(dt['--dsw-alias-label-primary-inverted'].dark, '#141414')
  const lt = buildTokens(resolveThemeColors(j, 'light'))
  assert.equal(lt['--dsw-alias-label-primary'].dark, '#1A1A1A')
  assert.equal(lt['--dsw-alias-label-primary-inverted'].dark, '#F4F4F5')
})

test('HARNESS 文字可读性不变式: 全部主题 dark/light 下 inverted ≠ label-primary', () => {
  for (const name of themeNames()) {
    if (isSystem(name)) continue
    const json = getThemeJson(name)
    for (const mode of ['dark', 'light']) {
      const t = buildTokens(resolveThemeColors(json, mode))
      const primary = t['--dsw-alias-label-primary'] && t['--dsw-alias-label-primary'].dark
      const inverted = t['--dsw-alias-label-primary-inverted'] && t['--dsw-alias-label-primary-inverted'].dark
      assert.ok(primary, name + '/' + mode + ' 缺 --dsw-alias-label-primary')
      assert.ok(inverted, name + '/' + mode + ' 缺 --dsw-alias-label-primary-inverted')
      assert.notEqual(inverted, primary, name + '/' + mode + ' 徽标文字与底色同色不可读: ' + inverted)
    }
  }
})

test('opencode 导航项派生色: hover/active 用 text 的 alpha 叠加（不再取 DSH 浅色默认）', () => {
  const j = getThemeJson('opencode')
  const dt = buildTokens(resolveThemeColors(j, 'dark'))
  assert.equal(dt['--dsw-specific-sidebar-nav-item-hover'].dark, 'rgba(238,238,238,0.08)')
  assert.equal(dt['--dsw-specific-sidebar-nav-item-active'].dark, 'rgba(238,238,238,0.14)')
  assert.equal(dt['--dsw-specific-sidebar-nav-item-active-accent'].dark, 'rgba(250,178,131,0.35)')
})

test('设置面板导航项悬停不变式: hover/active/accent 全部主题齐全且为 alpha 叠加', () => {
  for (const name of themeNames()) {
    if (isSystem(name)) continue
    const r = renderTheme(name, TYPO)
    for (const v of ['--dsw-specific-sidebar-nav-item-hover', '--dsw-specific-sidebar-nav-item-active', '--dsw-specific-sidebar-nav-item-active-accent']) {
      assert.ok(r.tokens[v] && /^rgba\(/.test(r.tokens[v].dark), name + ' 缺/异常 ' + v)
    }
  }
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

test('previewColors: 38 主题全部可预览（hex 或 null）', () => {
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

test('色系分组: 38 主题全覆盖且不重复，组序符合 GROUP_ORDER', () => {
  const groups = themeGroups()
  const seen = []
  for (const g of groups) {
    assert.ok(GROUP_ORDER.includes(g.name), '未知组名 ' + g.name)
    assert.ok(GROUP_COLORS[g.name], '组缺代表色 ' + g.name)
    for (const t of g.themes) seen.push(t.name)
  }
  assert.equal(seen.length, 38)
  assert.equal(new Set(seen).size, 38)
  const orderIdx = groups.map((g) => GROUP_ORDER.indexOf(g.name))
  assert.deepEqual(orderIdx, [...orderIdx].sort((a, b) => a - b))
})

test('色系分组: 特殊/透明主题归位，暖橙含 opencode', () => {
  const groups = themeGroups()
  const by = (g) => groups.find((x) => x.name === g).themes.map((t) => t.name)
  assert.ok(by('special').includes('system'))
  assert.ok(by('transparent').includes('lucent-orng'))
  assert.ok(by('warm').includes('opencode'))
  assert.ok(by('cool-blue').includes('tokyonight'))
})

test('hueOf 色相计算: 红≈0 绿≈120 蓝≈240，中性 → -2', () => {
  const r = hueOf('#FF0000')
  assert.ok(r < 35 || r > 330)
  assert.ok(hueOf('#00FF00') > 100 && hueOf('#00FF00') < 140)
  assert.ok(hueOf('#0000FF') > 220 && hueOf('#0000FF') < 260)
  assert.equal(hueOf('#888888'), -2)
  assert.equal(hueOf(null), -1)
})

test('groupOf: system → special，透明背景 → transparent', () => {
  assert.equal(groupOf('system', { background: '#000', primary: '#FFF' }), 'special')
  assert.equal(groupOf('lucent-orng', resolvePreview('lucent-orng')), 'transparent')
})
test('fonts: 3 OFL families inlined as @font-face', () => {
  assert.deepEqual(BUNDLED_FONTS, ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Inter', 'IBM Plex Mono'])
  const css = buildTypographyCss({ mode: 'mono', size: 13, fontKey: 'JetBrains Mono' })
  for (const f of BUNDLED_FONTS) {
    assert.ok(css.includes('@font-face{font-family:"' + f + '"'), 'missing @font-face ' + f)
  }
  assert.ok(css.includes('font-display:swap'), 'missing font-display')
  assert.ok(css.includes('data:font/woff2;base64,'), 'missing base64 woff2')
})

test('fonts: system theme also carries bundled fonts, no color tokens', () => {
  const r = renderTheme(SYSTEM_THEME, { mode: 'sans', size: 13, fontKey: 'Fira Code' })
  assert.equal(Object.keys(r.tokens).length, 0)
  assert.ok(r.css.includes('@font-face'), 'system lost bundled fonts')
})

test('tokens: elevation ladder (panel/element) follows opencode steps', () => {
  const r = renderTheme('opencode', TYPO)
  const t = (k) => r.tokens[k].dark
  assert.equal(t('--dsw-alias-bg-base'), '#0A0A0A')
  assert.equal(t('--dsw-alias-markdown-tag'), t('--dsw-alias-markdown-code-block'))
  assert.equal(t('--dsw-specific-bubble'), t('--dsw-alias-markdown-code-block'))
  assert.equal(t('--dsw-alias-markdown-citation'), t('--dsw-alias-markdown-code-block-banner'))
  assert.equal(t('--dsw-specific-tip'), t('--dsw-alias-toast-bg'))
  assert.notEqual(t('--dsw-alias-markdown-tag'), t('--dsw-alias-bg-base'))
})

test('tokens: R2/R3 recipes (invert/dimmed/ghost)', () => {
  const j = getThemeJson('opencode')
  const colors = resolveThemeColors(j, 'dark')
  const dt = buildTokens(colors)
  assert.equal(dt['--dsw-alias-brand-primary-invert'].dark, contrastText(colors.primary))
  assert.equal(dt['--dsw-alias-button-primary-dimmed'].dark, withAlpha(colors.primary, 0.2))
  assert.equal(dt['--dsw-alias-button-ghost-active-fill'].dark, withAlpha(colors.text, 0.1))
  assert.equal(dt['--dsw-alias-bg-skeleton'].dark, withAlpha(colors.text, 0.08))
  assert.equal(dt['--dsw-alias-state-error-secondary'].dark, shade(colors.error, 0.25))
  assert.equal(dt['--dsw-alias-state-success-tertiary'].dark, withAlpha(colors.success, 0.14))
  assert.equal(dt['--dsw-alias-state-warn-label'].dark, colors.warning)
  assert.equal(dt['--dsw-alias-state-business-primary'].dark, colors.primary)
  assert.equal(dt['--dsw-alias-border-l3'].dark, colors.borderActive)
})

test('tokens: new coverage present in all non-system themes', () => {
  const vars = ['--dsw-alias-border-l3', '--dsw-alias-border-l4', '--dsw-alias-brand-text', '--dsw-alias-button-contrast-fill', '--dsw-alias-bg-skeleton', '--dsw-alias-state-warn-label', '--dsw-alias-state-business-primary', '--dsw-alias-state-business-tertiary', '--dsw-alias-brand-primary-invert', '--dsw-alias-button-primary-dimmed', '--dsw-alias-button-ghost-active-fill']
  for (const name of themeNames()) {
    if (isSystem(name)) continue
    const r = renderTheme(name, TYPO)
    for (const v of vars) assert.ok(r.tokens[v], name + ' missing ' + v)
  }
})

test('fonts: dropdown order sinks proprietary fonts, Inter heads sans', () => {
  assert.deepEqual(Object.keys(FONTS), ['JetBrains Mono', 'Cascadia Code', 'Fira Code', 'IBM Plex Mono', 'SF Mono', 'Consolas'])
  assert.ok(SANS_STACK.indexOf("'Inter'") === 0, 'Inter not at sans head')
  for (const k of Object.keys(FONTS)) {
    const stack = FONTS[k]
    const selfPos = k === 'Consolas' ? stack.indexOf('Consolas') : stack.indexOf("'" + k + "'")
    assert.equal(selfPos, 0, k + ' self not head')
    if (k !== 'SF Mono') assert.ok(stack.indexOf('SF Mono') > stack.indexOf('Fira Code'), k + ' SF Mono not sunk')
    if (k !== 'Consolas') assert.ok(stack.indexOf('Consolas') > stack.indexOf('Cascadia Code'), k + ' Consolas not sunk')
  }
})
