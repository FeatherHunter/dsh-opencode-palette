// engine.test.mjs — 引擎单测（node --test tests/，无需浏览器）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  themeNames, themeStats, previewColors, renderTheme, auditAll,
} from '../src/engine/index.mjs'
import { resolveColor, resolveThemeColors, collectErrors, ansiToHex, withAlpha, shade, contrastText } from '../src/engine/resolve.mjs'
import { getThemeJson, isSystem, SYSTEM_THEME } from '../src/engine/registry.mjs'
import { themeGroups, GROUP_ORDER, GROUP_COLORS, hueOf, groupOf, resolvePreview } from '../src/engine/grouping.mjs'
import { generateTheme, buildTokens, buildTypographyCss, codeFontStack } from '../src/engine/generate.mjs'
import { BUNDLED_FONTS } from '../src/engine/font-face.mjs'
import { FONTS, SANS_STACK } from '../src/engine/map-dsh.mjs'
import { createFontAvailability, FONT_PROBE_ABSENT } from '../src/engine/font-avail.mjs'
import { sanitizeFontName, quoteFontFamily, FONT_NAME_MAX } from '../src/engine/font-names.mjs'
import {
  collectLocalFonts, dedupeFamilies, measureMonospaceFonts, buildFontCandidates, MONO_PROBE_TEXT,
  FONT_ENUM_UNAVAILABLE, FONT_ENUM_DENIED, FONT_ENUM_BLOCKED, FONT_ENUM_EMPTY, FONT_ENUM_FAILED,
} from '../src/engine/local-fonts.mjs'

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
  assert.deepEqual(Object.keys(FONTS), ['JetBrains Mono', 'Cascadia Code', 'Fira Code', 'IBM Plex Mono', 'Maple Mono NF CN', 'SF Mono', 'Consolas'])
  assert.ok(SANS_STACK.indexOf("'Inter'") === 0, 'Inter not at sans head')
  for (const k of Object.keys(FONTS)) {
    const stack = FONTS[k]
    const selfPos = k === 'Consolas' ? stack.indexOf('Consolas') : stack.indexOf("'" + k + "'")
    assert.equal(selfPos, 0, k + ' self not head')
    if (k !== 'SF Mono') assert.ok(stack.indexOf('SF Mono') > stack.indexOf('Fira Code'), k + ' SF Mono not sunk')
    if (k !== 'Consolas') assert.ok(stack.indexOf('Consolas') > stack.indexOf('Cascadia Code'), k + ' Consolas not sunk')
  }
})

test('fonts: Maple Mono NF CN 不随包（CJK 体积），但预设与回退栈齐备', () => {
  const k = 'Maple Mono NF CN'
  assert.ok(FONTS[k], '缺 ' + k + ' 预设')
  assert.ok(BUNDLED_FONTS.indexOf(k) < 0, k + ' 不应随包内联（全量 CJK 体积不可行），只能本机检测')
  const stack = FONTS[k]
  assert.equal(stack.indexOf("'" + k + "'"), 0, '家族名未置栈首')
  assert.ok(stack.endsWith("'PingFang SC','Microsoft YaHei'"), 'CJK 收尾被破坏（缺字会掉到 SimSun）')
  // 未注册的 fontKey 会静默回落 JetBrains Mono 栈，故必须能解析到自身预设
  const css = buildTypographyCss({ mode: 'mono', size: 13, fontKey: k })
  assert.ok(css.includes('--ds-font-family-code:' + stack), k + ' 未被排版管线解析（会静默回退）')
})

// 假 host document：家族名在 installed 内 → 量宽不同于「确定不存在」的家族（= 本机已装）
// 同时模拟浏览器行为：fontFamily 不是「配对引号包住的家族名」就当声明被丢弃（等于回退字体），
// 这样引号写错这类会让所有字体都判成未装的 bug 会被测出来。
function fakeDoc(installed) {
  const body = { appendChild: (el) => { el.parentNode = body }, removeChild: (el) => { el.parentNode = null } }
  return {
    body,
    createElement: () => {
      // 模拟浏览器：家族名不是「配对双引号整体包住」的合法值时，整条 font-family 声明被丢弃（读回 ''）
      const style = {
        cssText: '',
        _ff: '',
        get fontFamily() { return this._ff },
        set fontFamily(v) { this._ff = /^"[^"]+"$/.test(String(v)) ? String(v) : '' },
      }
      const el = {
        style, textContent: '', parentNode: null,
        getBoundingClientRect() {
          const m = /^"([^"]+)"$/.exec(style.fontFamily)
          const unit = m && installed.indexOf(m[1]) >= 0 ? 5.498 : 8.12
          return { width: unit * el.textContent.length }
        },
      }
      return el
    },
  }
}

test('字体可用性：宽度对比法判本机字体（随包恒可用 / 未装判缺失）', () => {
  const avail = createFontAvailability(() => fakeDoc(['Consolas']), BUNDLED_FONTS)
  assert.equal(avail('JetBrains Mono'), true, '随包字体应恒可用（不量宽）')
  assert.equal(avail('Consolas'), true, '本机已装应判可用')
  assert.equal(avail('Maple Mono NF CN'), false, '本机未装应判缺失')
  assert.equal(avail('SF Mono'), false, '本机未装应判缺失')
  assert.equal(avail('Consolas'), true, '重复调用应命中缓存且结论一致')
  assert.ok(FONT_PROBE_ABSENT.indexOf('dsh_palette') >= 0, '缺失基准家族名应带命名空间前缀，避免撞真实字体')
})

test('字体可用性：环境不支持量宽时保守判可用（绝不误灰可用字体）', () => {
  const noDoc = createFontAvailability(() => undefined, BUNDLED_FONTS)
  assert.equal(noDoc('Maple Mono NF CN'), true, '无 document 时不得误判缺失')
  assert.equal(noDoc('Consolas'), true, '无 document 时不得误判缺失')
  const noLayout = createFontAvailability(() => ({ body: {}, createElement: () => ({ style: {}, textContent: '' }) }), BUNDLED_FONTS)
  assert.equal(noLayout('Consolas'), true, '量不出宽度时不得误判缺失')
  const broken = createFontAvailability(() => ({ body: { appendChild: () => {} }, createElement: () => { throw new Error('boom') } }), BUNDLED_FONTS)
  assert.equal(broken('Consolas'), true, '量宽抛异常时不得误判缺失')
  // 家族名带双引号 → CSS 声明会被丢弃；此时必须保守判可用，而不是把本机已装的字体判成未装
  const badName = createFontAvailability(() => fakeDoc(['Consolas']), BUNDLED_FONTS)
  assert.equal(badName('Cons"olas'), true, '声明被丢弃时应保守判可用')
})

// ── #11 任意系统字体：族名净化 / 安全包裹 / 回退栈合成 ──

const cssVar = (css, name) => {
  const m = new RegExp('--' + name + ':([^;]*)').exec(css)
  return m ? m[1] : null
}

test('字体族名净化：放行真实字体名，拒绝能逃出注入 <style> 的输入', () => {
  assert.equal(sanitizeFontName('  Maple Mono NF CN  '), 'Maple Mono NF CN', '两端空白应剥掉')
  assert.equal(sanitizeFontName('Sarasa Mono SC'), 'Sarasa Mono SC')
  assert.equal(sanitizeFontName('思源黑体'), '思源黑体', 'CJK 族名应放行')
  assert.equal(sanitizeFontName('Hack Nerd Font'), 'Hack Nerd Font')
  for (const bad of ['a{color:red}', 'a}body{', 'x;body{color:red}', 'x<y', 'a\\b', 'a\n b', '']) {
    assert.equal(sanitizeFontName(bad), null, '应拒绝: ' + JSON.stringify(bad))
  }
  assert.equal(sanitizeFontName(null), null, '非字符串应拒绝')
  assert.equal(sanitizeFontName(42), null, '非字符串应拒绝')
  assert.equal(sanitizeFontName('x'.repeat(FONT_NAME_MAX)).length, FONT_NAME_MAX, '上限之内应放行')
  assert.equal(sanitizeFontName('x'.repeat(FONT_NAME_MAX + 1)), null, '超长应拒绝')
})

test('字体族名安全包裹：恒配对引号，拒绝时返回 null（绝不裸拼）', () => {
  assert.equal(quoteFontFamily('Hack Nerd Font'), "'Hack Nerd Font'")
  assert.equal(quoteFontFamily('Sarasa Mono SC'), "'Sarasa Mono SC'")
  assert.equal(quoteFontFamily('思源等宽'), "'思源等宽'")
  // 引号本身在 CSS 字符串里是终结符，直接判非法（族名里真带引号的字体可忽略）
  assert.equal(quoteFontFamily("O'Brien"), null, '含引号应拒绝而不是换引号硬塞')
  assert.equal(quoteFontFamily('X}body{color:red}'), null, '非法名不得返回未加引号的原文')
  assert.equal(quoteFontFamily('a;b'), null)
})

test('自定义字体进代码字体栈首位：其后仍是随包 OFL 字体与 CJK 回退（#11 最小复现）', () => {
  const css = buildTypographyCss({ mode: 'mono', size: 13, fontKey: 'Hack Nerd Font' })
  const code = cssVar(css, 'ds-font-family-code')
  assert.equal(code.indexOf("'Hack Nerd Font'"), 0, '用户字体未置栈首（仍被静默降级）')
  assert.ok(code.endsWith("'PingFang SC','Microsoft YaHei'"), 'CJK 回退被破坏（缺字会掉到 SimSun）')
  assert.ok(code.includes("'JetBrains Mono'"), '随包 OFL 字体应从第二位起保留')
  assert.ok(code.includes("'Fira Code'") && code.includes("'Cascadia Code'"), '随包 OFL 字体应保留')
  assert.ok(code.includes('Consolas') && code.includes("'SF Mono'"), '系统字体层应保留')
  // 正文语义（已拍板 Q2）：mode=mono 时同栈；mode=tui 时正文固定 SANS_STACK，不受自定义字体影响
  assert.equal(cssVar(css, 'dsw-font-family'), code, 'mode=mono 正文与代码同栈')
  const tui = buildTypographyCss({ mode: 'tui', size: 13, fontKey: 'Hack Nerd Font' })
  assert.equal(cssVar(tui, 'dsw-font-family'), SANS_STACK, 'mode=tui 正文必须固定 SANS_STACK')
  assert.equal(cssVar(tui, 'ds-font-family-code').indexOf("'Hack Nerd Font'"), 0, 'mode=tui 下自定义字体仍作用于代码')
})

test('非法族名不逃逸注入的 <style>：一律落回默认预设栈，且原文不进 CSS', () => {
  for (const bad of ['X}body{color:red}', 'X;body{color:red}', 'X<style>', 'a{}', 'x<y']) {
    const css = buildTypographyCss({ mode: 'mono', size: 13, fontKey: bad })
    assert.equal(cssVar(css, 'ds-font-family-code'), FONTS['JetBrains Mono'], '非法名应落回默认栈: ' + bad)
    assert.ok(css.indexOf(bad) < 0, '非法原文不得出现在 CSS 里: ' + bad)
    assert.equal(codeFontStack(bad), FONTS['JetBrains Mono'], 'codeFontStack 也应拒绝')
  }
  // 未注册但合法的旧值（老预设 / 历史自定义值）走默认栈，不再静默丢成两套不同值
  assert.equal(cssVar(buildTypographyCss({ mode: 'mono', size: 13, fontKey: '' }), 'ds-font-family-code'), FONTS['JetBrains Mono'], '空值应落默认栈')
})

test('字体族名去重：一族一份，按 family 归并（style/bold/italic 记录折叠）', () => {
  const list = [
    { family: 'JetBrains Mono', style: 'Regular', fullName: 'JetBrains Mono Regular' },
    { family: 'JetBrains Mono', style: 'Bold', fullName: 'JetBrains Mono Bold' },
    { family: 'Hack Nerd Font', style: 'Italic' },
    { family: 'Maple Mono NF CN' },
    { family: '  Hack Nerd Font  ' }, // 归一后与前面同族
    { family: '' }, null, 42, { fullName: 'No Family Field' },
  ]
  assert.deepEqual(dedupeFamilies(list), ['JetBrains Mono', 'Hack Nerd Font', 'Maple Mono NF CN', 'No Family Field'])
  assert.deepEqual(dedupeFamilies(null), [], '空清单不抛错')
})

test('本机字体枚举：成功去重 + 等宽置顶 + 字母序（非等宽仍列出）', async () => {
  const fonts = [
    { family: 'Sarasa Mono SC' }, { family: 'Sarasa Mono SC', style: 'Bold' },
    { family: 'Arial' }, { family: 'JetBrains Mono' }, { family: 'Hack Nerd Font' }, { family: 'Zed Mono' },
  ]
  const res = await collectLocalFonts({ queryLocalFonts: () => Promise.resolve(fonts) }, { measureMono: () => ({ 'Sarasa Mono SC': true, 'JetBrains Mono': true, 'Hack Nerd Font': true, 'Zed Mono': true }) })
  assert.equal(res.ok, true, '应判成功')
  // 等宽置顶（Hack Nerd Font / JetBrains Mono / Sarasa Mono SC / Zed Mono），非等宽的 Arial 沉底
  assert.deepEqual(res.fonts, ['Hack Nerd Font', 'JetBrains Mono', 'Sarasa Mono SC', 'Zed Mono', 'Arial'])
  assert.equal(res.fonts.indexOf('Sarasa Mono SC'), res.fonts.lastIndexOf('Sarasa Mono SC'), '同族不得重复列出')
  assert.equal(res.mono.Arial, undefined, '非等宽不进等宽表')
})

test('本机字体枚举：失败各有其因，绝不抛异常（无 API / 拒授权 / 手势或可见性 / 空清单）', async () => {
  const noApi = await collectLocalFonts({})
  assert.deepEqual([noApi.ok, noApi.reason, noApi.fonts], [false, FONT_ENUM_UNAVAILABLE, []], '无 queryLocalFonts 应判不可用')

  const denied = await collectLocalFonts({ queryLocalFonts: () => { const e = new Error('denied'); e.name = 'NotAllowedError'; throw e } })
  assert.equal(denied.reason, FONT_ENUM_DENIED, '拒绝授权应判 denied')

  const blocked = await collectLocalFonts({ queryLocalFonts: () => { const e = new Error('gesture'); e.name = 'SecurityError'; throw e } })
  assert.equal(blocked.reason, FONT_ENUM_BLOCKED, '缺手势/页面不可见应判 blocked')

  const rejected = await collectLocalFonts({ queryLocalFonts: () => Promise.reject(Object.assign(new Error('x'), { name: 'NotAllowedError' })) })
  assert.equal(rejected.reason, FONT_ENUM_DENIED, 'async reject 同样要收敛成 reason')

  // 空数组而不抛错：权限态 denied → 说「没授权」；否则才说「没读到清单」
  const emptyDenied = await collectLocalFonts({ queryLocalFonts: () => Promise.resolve([]), navigator: { permissions: { query: () => Promise.resolve({ state: 'denied' }) } } })
  assert.equal(emptyDenied.reason, FONT_ENUM_DENIED, '空清单 + 权限 denied 应判没授权')
  const emptyPlain = await collectLocalFonts({ queryLocalFonts: () => Promise.resolve([]), navigator: { permissions: { query: () => Promise.resolve({ state: 'prompt' }) } } })
  assert.equal(emptyPlain.reason, FONT_ENUM_EMPTY, '空清单 + 未拒绝应判空清单')

  // Permissions API 本身抛错 / 不存在 → 不能连累主路径
  const permBroken = await collectLocalFonts({ queryLocalFonts: () => Promise.resolve([]), navigator: { permissions: { query: () => { throw new Error('unsupported') } } } })
  assert.equal(permBroken.reason, FONT_ENUM_EMPTY, '权限查询抛错应退到 empty')
  const generic = await collectLocalFonts({ queryLocalFonts: () => { throw new Error('boom') } })
  assert.equal(generic.reason, FONT_ENUM_FAILED, '其它异常应兜底成 failed')
})

test('等宽判定：canvas 实测宽度（不靠字体名猜），量不了就不标', () => {
  // 模拟 canvas：只有「真等宽体」逐字同宽；比例体 i 窄 W 宽。
  // 判定只看实测宽度，与字体名里有没有 Mono 无关。
  let family = ''
  const ctx = {
    set font(v) { family = String(v) },
    get font() { return family },
    measureText(ch) { return { width: family.indexOf('真等宽体') >= 0 ? 16 : (ch === 'W' ? 24 : 9) } },
  }
  const doc = { createElement: () => ({ getContext: () => ctx }) }
  const mono = measureMonospaceFonts(doc, ['真等宽体', '比例体', 'Mono Sans 比例体'])
  assert.equal(mono['真等宽体'], true, '窄字符同宽应判等宽')
  assert.equal(mono['比例体'], undefined, '异宽不得进等宽表')
  // 名字带 Mono 但实测是比例体：按实测判，不靠名字猜
  assert.equal(mono['Mono Sans 比例体'], undefined, '名字带 Mono 不得被当成等宽')
  assert.equal(Object.keys(measureMonospaceFonts(null, ['X Mono'])).length, 0, '无 document 应返回空表（不误标）')
  assert.equal(Object.keys(measureMonospaceFonts({ createElement: () => { throw new Error('boom') } }, ['X Mono'])).length, 0, '抛异常应返回空表')
})

test('等宽判定：探针字符必须含异宽对，否则判定没有区分度', () => {
  // 窄字符（i）与宽字符（W）在比例字体里必然异宽 —— 探针缺了其中一类就量不出等宽与否
  assert.ok(MONO_PROBE_TEXT.indexOf('i') >= 0, '探针缺窄字符')
  assert.ok(MONO_PROBE_TEXT.indexOf('W') >= 0, '探针缺宽字符')
})

test('候选分级：预设恒在（置顶 + 兜底），本机字体在后并按枚举顺序（等宽置顶）', () => {
  const avail = (k) => k === 'Consolas' // 只装 Consolas 的机器
  const cands = buildFontCandidates(['Hack Nerd Font', 'Maple Mono NF CN'], avail, { 'Hack Nerd Font': true }, Object.keys(FONTS), BUNDLED_FONTS)
  const presets = cands.filter((c) => c.isPreset)
  assert.deepEqual(presets.map((c) => c.key), Object.keys(FONTS), '预设分区应保持既有顺序且一个不少')
  assert.equal(cands[0].key, 'JetBrains Mono', '预设置顶')
  assert.equal(cands[0].bundled, true, '随包 OFL 字体应标 bundled（恒可用）')
  assert.equal(cands[0].ok, true, '随包字体恒判可用')
  assert.equal(cands[0].installed, false, '随包字体不得标「本机装了」（它与本机装没装无关）')
  assert.equal(presets.filter((c) => c.key === 'Consolas')[0].ok, true, '本机已装的预设应判可用')
  assert.equal(presets.filter((c) => c.key === 'Consolas')[0].installed, true, '本机已装的预设应标 installed')
  assert.equal(presets.filter((c) => c.key === 'SF Mono')[0].ok, false, '本机未装的预设应判缺失（灰显但可选）')
  assert.equal(presets.filter((c) => c.key === 'SF Mono')[0].installed, false, '未装的不得标 installed')
  assert.equal(presets.filter((c) => c.key === 'SF Mono')[0].bundled, false, '非随包预设不得标 bundled')
  const locals = cands.filter((c) => !c.isPreset)
  assert.deepEqual(locals.map((c) => c.key), ['Hack Nerd Font'], '已在预设表里的族名不重复进本机分区')
  assert.equal(locals[0].ok, true, '枚举到的本机字体恒判可用（不必再量宽）')
  assert.equal(locals[0].installed, true, '枚举到的本机字体就是「本机装了」')
  assert.equal(locals[0].stack, null, '自定义族名无预设栈，由 codeFontStack 合成')
  assert.equal(presets.filter((c) => c.key === 'Maple Mono NF CN')[0].isLocal, true, '预设里本机也装的应标 isLocal')
  // 枚举不可用（读不到清单）时候选仍是完整预设列表 —— 绝不出现空下拉
  const fallback = buildFontCandidates([], avail, null)
  assert.deepEqual(fallback.map((c) => c.key), Object.keys(FONTS), '读不到清单时应退成预设列表')
  assert.ok(fallback.every((c) => c.isPreset), '回退态不含本机分区')
})
