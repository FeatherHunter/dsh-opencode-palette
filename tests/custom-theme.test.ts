// custom-theme.test.ts — #87§1：37 色引擎管线单测（#84 API 落码时只有 stash 级验证，此处逐项钉死）
//   - COLOR_SLOTS 精确 37（32 标准 + 5 DSH 独立槽位），分组 8/2/6/2/6/6/7，透明 8 槽全在 bg
//   - normalizeThemeColors 回填链 + 纯函数 + 显式值不动
//   - 基线恒等：38 内置主题 5 扩展变量 == 文档继承源（透明时双双缺席）
//   - extractPresetPalette：opencode/dark、lucent-orng/light+transparent、system/system、未知抛错
//   - renderCustomTheme：custom: 前缀、appearance 归一、双槽注入、transparent 跳过
//   - customPreviewColors：三外观 + translucent 胶囊口径
//   - buildUpdateTokensFromColors：system 无色回 undefined，其余直驱
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  themeNames, renderTheme, extractPresetPalette, renderCustomTheme, customPreviewColors, listIpPresets,
  COLOR_SLOT_GROUPS, COLOR_SLOTS, normalizeThemeColors, GROUP_ORDER,
} from '../src/engine/index.ts'
import { contrastRatio } from '../src/engine/resolve.ts'
import { buildUpdateTokensFromColors } from '../src/engine/update-tokens.ts'

// css 声明抽值：body,body[...]--var:value;…（变量唯一，首命中即准）
function cssVar(css: string, name: string): string | null {
  const m = css.match(new RegExp(name.replace(/-/g, '\\-') + ':([^;]+);'))
  return m ? m[1] : null
}

// extractPresetPalette().colors 是 ResolvedColorMap（值里理论上可含 ColorError 对象）。
// 预置配色全部是纯色串，测试按纯色表收窄，好直接喂给 renderCustomTheme / customPreviewColors。
function paletteColors(name: string): Record<string, string> {
  return extractPresetPalette(name).colors as Record<string, string>
}

test('COLOR_SLOTS 精确 37：32 标准 + 5 扩展，分组/透明/回填元数据齐', () => {
  assert.equal(COLOR_SLOTS.length, 37)
  assert.equal(themeNames().length, 38, '内置 38 款（37 静态 + system）')
  assert.equal(GROUP_ORDER.length, 9, '9 大色系分组不动')
  const keys = COLOR_SLOTS.map((s) => s.key)
  assert.equal(new Set(keys).size, 37, '槽位键唯一')
  for (const s of COLOR_SLOTS) assert.equal(s.previewSlot, s.key, s.key + ' previewSlot 恒等于 key')
  assert.deepEqual(COLOR_SLOT_GROUPS.map((g) => g.keys.length), [8, 2, 6, 2, 6, 6, 7])
  assert.equal(COLOR_SLOT_GROUPS.reduce((n, g) => n + g.keys.length, 0), 37)
  const trans = COLOR_SLOTS.filter((s) => s.allowTransparent).map((s) => s.key).sort()
  assert.deepEqual(trans, ['background', 'backgroundElement', 'backgroundPanel', 'bubbleBg', 'codeBlockBg', 'codeHeaderBg', 'inputBg', 'sidebarBg'])
  const fallbacks: Record<string, string> = {}
  for (const s of COLOR_SLOTS) if (s.fallback) fallbacks[s.key] = s.fallback
  assert.deepEqual(fallbacks, {
    sidebarBg: 'background',
    bubbleBg: 'backgroundPanel',
    inputBg: 'backgroundPanel',
    codeBlockBg: 'backgroundPanel',
    codeHeaderBg: 'backgroundElement',
  })
})

test('normalizeThemeColors：回填链 + 显式不动 + 纯函数 + 透明传递', () => {
  const src = { background: '#111111', backgroundPanel: '#222222', backgroundElement: '#333333' }
  const out = normalizeThemeColors(src)
  assert.equal(out.sidebarBg, '#111111')
  assert.equal(out.bubbleBg, '#222222')
  assert.equal(out.inputBg, '#222222')
  assert.equal(out.codeBlockBg, '#222222')
  assert.equal(out.codeHeaderBg, '#333333')
  assert.equal('sidebarBg' in src, false, '不改入参')
  const keep = normalizeThemeColors({ background: '#111111', sidebarBg: '#999999' })
  assert.equal(keep.sidebarBg, '#999999', '显式值保持不动')
  const filled = normalizeThemeColors({ background: 'transparent' })
  assert.equal(filled.sidebarBg, 'transparent', '透明沿回填链传递')
})

test('基线恒等：38 内置主题 5 扩展变量 == 文档继承源（透明时双双缺席）', () => {
  assert.equal(themeNames().length, 38)
  const pairs = [
    ['--dsw-specific-sidebar-fill', '--dsw-alias-bg-base'],
    ['--dsw-specific-bubble', '--dsw-alias-markdown-tag'],
    ['--dsw-specific-input-major', '--dsw-alias-markdown-tag'],
    ['--dsw-alias-markdown-code-block', '--dsw-alias-markdown-tag'],
    ['--dsw-alias-markdown-code-block-banner', '--dsw-specific-tip'],
    ['--dsl-code-block-background', '--dsw-specific-tip'],
  ]
  for (const name of themeNames()) {
    const css = renderTheme(name).css
    for (const [ext, from] of pairs) {
      const a = cssVar(css, ext)
      const b = cssVar(css, from)
      assert.equal(
        (a === null && b === null) || (a !== null && a === b), true,
        name + ' ' + ext + '=' + a + ' 应等于 ' + from + '=' + b,
      )
    }
  }
})

test('extractPresetPalette：opencode/dark、lucent-orng/light+8 透明、system/system', () => {
  const opencodePal = extractPresetPalette('opencode')
  assert.equal(opencodePal.appearance, 'dark')
  assert.equal(Object.keys(opencodePal.colors).length, 37)
  for (const k of Object.keys(opencodePal.colors)) assert.equal(typeof opencodePal.colors[k], 'string', '槽位 ' + k)
  const lucentPal = extractPresetPalette('lucent-orng')
  assert.equal(lucentPal.appearance, 'light')
  for (const k of ['background', 'backgroundPanel', 'backgroundElement', 'sidebarBg', 'bubbleBg', 'inputBg', 'codeBlockBg', 'codeHeaderBg']) {
    assert.equal(lucentPal.colors[k], 'transparent', '透光主题背景类 8 槽全透明：' + k)
  }
  assert.equal(Object.keys(lucentPal.colors).length, 37)
  const systemPal = extractPresetPalette('system')
  assert.equal(systemPal.appearance, 'system')
  assert.equal(Object.keys(systemPal.colors).length, 37)
  assert.throws(() => extractPresetPalette('不存在的主题'), /未知主题/)
})

test('renderCustomTheme：custom: 前缀 + appearance 归一 + 6 变量精确覆盖 + 双槽 token + transparent 跳过', () => {
  const base = paletteColors('opencode')
  const colors = Object.assign({}, base, {
    sidebarBg: '#112233',
    bubbleBg: '#223344',
    inputBg: '#334455',
    codeBlockBg: '#445566',
    codeHeaderBg: '#556677',
    background: 'transparent',
  })
  const r = renderCustomTheme({ id: 'mine', name: 'Mine', appearance: 'dark', colors }, {})
  assert.equal(r.meta.theme, 'custom:mine')
  assert.equal(r.meta.appearance, 'dark')
  assert.equal(cssVar(r.css, '--dsw-specific-sidebar-fill'), '#112233', '扩展槽精确覆盖')
  assert.equal(cssVar(r.css, '--dsw-specific-bubble'), '#223344')
  assert.equal(cssVar(r.css, '--dsw-specific-input-major'), '#334455')
  assert.equal(cssVar(r.css, '--dsw-alias-markdown-code-block'), '#445566')
  assert.equal(cssVar(r.css, '--dsw-alias-markdown-code-block-banner'), '#556677')
  assert.equal(cssVar(r.css, '--dsl-code-block-background'), '#556677')
  assert.deepEqual(r.tokens['--dsw-specific-sidebar-fill'], { light: '#112233', dark: '#112233' }, '单套色双槽 token')
  assert.equal(cssVar(r.css, '--dsw-alias-bg-base'), null, 'transparent 背景跳过不输出')
  assert.ok(r.css.includes('body,body[data-ds-dark-theme]{'), '单套色双槽统一注入')
  const prefixed = renderCustomTheme({ id: 'custom:mine', appearance: 'weird', colors: base }, {})
  assert.equal(prefixed.meta.theme, 'custom:mine', '已有前缀不叠加')
  assert.equal(prefixed.meta.appearance, 'dark', '非法 appearance 回 dark')
  const sys = renderCustomTheme({ id: 's', appearance: 'system', colors: base }, {})
  assert.equal(sys.meta.appearance, 'system')
})

test('customPreviewColors：三外观 + light+transparent 胶囊口径 + 四色直通', () => {
  const base = paletteColors('opencode')
  const dark = customPreviewColors({ appearance: 'dark', colors: base })
  assert.equal(dark.translucent, false)
  assert.equal(dark.primary, base.primary)
  assert.equal(dark.background, base.background)
  assert.equal(dark.text, base.text)
  assert.equal(dark.border, base.border)
  const light = customPreviewColors({
    appearance: 'light',
    colors: Object.assign({}, base, { background: 'transparent' }),
  })
  assert.equal(light.translucent, true, 'light+transparent 标记 translucent')
  assert.equal(light.appearance, 'light')
  const lightSolid = customPreviewColors({ appearance: 'light', colors: base })
  assert.equal(lightSolid.translucent, false)
  const sys = customPreviewColors({ appearance: 'system', colors: base })
  assert.equal(sys.appearance, 'system')
  const weird = customPreviewColors({ appearance: 'nope', colors: base })
  assert.equal(weird.appearance, 'dark')
})

// #120 缺陷 A 回归：自定义浅色主题的 diff 兜底必须走 light repair（向白提亮）。
// 旧引擎 del=false 把 dark repair 写进 { light, dark } 两半，浅色 IP 的 diff 底被压成 #000000。
test('renderCustomTheme：浅色主题 diff 兜底走 light 方向（#120 缺陷 A）', () => {
  // 1) 合成一套「diff 对不达标」的浅色配色：旧实现 light 半会被写成深色修复值
  const synthetic = {
    background: '#FFFFFF',
    text: '#1A1A1A',
    diffAdded: '#66AA77',
    diffAddedBg: '#E8F5E9',
    diffAddedLineNumberBg: '#E8F5E9',
    diffRemoved: '#CC7788',
    diffRemovedBg: '#FDECEA',
    diffRemovedLineNumberBg: '#FDECEA',
  }
  const r = renderCustomTheme({ id: 'light-diff', appearance: 'light', colors: synthetic }, {})
  const pairs = [
    ['--dsw-alias-code-diff-added', ['--dsw-alias-file-diff-added-bg', '--dsw-alias-file-diff-added-gutter']],
    ['--dsw-alias-code-diff-deleted', ['--dsw-alias-file-diff-deleted-bg', '--dsw-alias-file-diff-deleted-gutter']],
  ] as const
  for (const [fgKey, bgKeys] of pairs) {
    const fg = r.tokens[fgKey]
    assert.ok(fg, fgKey + ' 不应缺槽')
    const fgL = fg.light
    const fgD = fg.dark
    assert.ok(fgL && fgD, fgKey + ' 两半都应有值')
    for (const bgKey of bgKeys) {
      const bg = r.tokens[bgKey]
      assert.ok(bg, bgKey + ' 不应缺槽')
      const bgL = bg.light
      const bgD = bg.dark
      assert.ok(bgL && bgD, bgKey + ' 两半都应有值')
      assert.ok(contrastRatio(fgL, bgL) >= 4.5, 'light 半 diff 对未达 4.5: ' + bgKey)
      assert.ok(contrastRatio(fgD, bgD) >= 4.5, 'dark 半 diff 对未达 4.5: ' + bgKey)
      assert.notEqual(bgL.toUpperCase(), '#000000', 'light 半 diff 底不得被深色修复压成 #000000')
      assert.notEqual(bgL.toUpperCase(), bgD.toUpperCase(), '两半修复方向应不同（浅色不应复用深色修复值）')
    }
  }
  // 2) 全量浅色 IP：light 半的 diff 底必须是亮色（回归审计里被记为 #000000 的浅色 IP）
  const lightIps = listIpPresets().filter((p) => p.appearance === 'light')
  assert.ok(lightIps.length >= 4, '应至少覆盖 4 套浅色 IP')
  for (const seed of lightIps) {
    const ip = renderCustomTheme({ id: seed.name, name: seed.title, appearance: 'light', colors: seed.colors }, {})
    for (const bgKey of ['--dsw-alias-file-diff-added-bg', '--dsw-alias-file-diff-deleted-bg']) {
      const bg = ip.tokens[bgKey]
      assert.ok(bg, seed.name + ' ' + bgKey + ' 不应缺槽')
      const bgL = bg.light
      assert.ok(bgL, seed.name + ' ' + bgKey + ' 缺 light 半')
      assert.notEqual(bgL.toUpperCase(), '#000000', seed.name + ' light 半 diff 底不得为 #000000')
    }
  }
})

test('buildUpdateTokensFromColors：system 无色，其余单套直驱', () => {
  const base = paletteColors('opencode')
  assert.equal(buildUpdateTokensFromColors(base, 'system'), undefined)
  const dark = buildUpdateTokensFromColors(base, 'dark')
  assert.ok(dark && typeof dark === 'object', 'dark 回 token 表')
  const light = buildUpdateTokensFromColors(base, 'light')
  assert.ok(light && typeof light === 'object', 'light 回 token 表')
  assert.equal(buildUpdateTokensFromColors({}, 'dark'), undefined, '缺 text/primary 即 undefined')
})
