// generate.mjs — 生成器：解析后的主题色位 + 排印参数 → DSH 注入物 { tokens, css }
// 不变式：输出完全由输入决定（确定性）；system 主题（colors=null）只输出排印，不碰颜色
import { TOKEN_MAP, DERIVED_TOKENS, SHIKI_MAP, CSS_RULES, FONTS, SANS_STACK } from './map-dsh.mjs'
import { FONT_FACE_CSS } from './font-face.mjs'
import { quoteFontFamily } from './font-names.mjs'
import { withAlpha, isDelegatedSurface } from './resolve.mjs'

const TRANSPARENT = 'transparent'

function isError(v) { return v && typeof v === 'object' && v.__error }

function usable(colors, from) {
  const v = colors[from]
  if (v === undefined || v === null) return null
  if (v === TRANSPARENT) return null
  if (isError(v)) return null
  return v
}

// token 层：overrideTokens 需要的 { light, dark } 对象
// issue 45：自持画布维持深色同值（零回归）；委托画布按外观取作者值，
// 缺半边不跨外观回填（宁可缺席走宿主默认，也不伪造对侧值）。
// 单参调用保持 legacy 语义（同一套色值写两半），存量调用方兼容。
export function buildTokens(darkColors, lightColors, delegated) {
  const light = (lightColors === undefined) ? darkColors : lightColors
  const del = (lightColors === undefined) ? false : !!delegated
  const tokens = {}
  const put2 = (name, lv, dv) => {
    const lok = lv !== null && lv !== undefined
    const dok = dv !== null && dv !== undefined
    if (!lok && !dok) return
    if (!del) {
      if (dok) tokens[name] = { light: dv, dark: dv }
      return
    }
    if (lok && dok) tokens[name] = { light: lv, dark: dv }
    else if (dok) tokens[name] = { dark: dv }
    else tokens[name] = { light: lv }
  }
  for (const [dshVar, from] of TOKEN_MAP) {
    if (from === '__transparent__') { put2(dshVar, TRANSPARENT, TRANSPARENT); continue }
    put2(dshVar, usable(light, from), usable(darkColors, from))
  }
  for (const [dshVar, fn] of DERIVED_TOKENS) {
    let lv
    try { lv = fn(light) } catch (e) { lv = undefined }
    let dv
    try { dv = fn(darkColors) } catch (e) { dv = undefined }
    if (lv === TRANSPARENT) lv = null
    if (dv === TRANSPARENT) dv = null
    put2(dshVar, lv, dv)
  }
  for (const [dshVar, from] of SHIKI_MAP) {
    put2(dshVar, usable(light, from), usable(darkColors, from))
  }
  return tokens
}

// 代码字体栈：fontKey 是预设名 → 查预设表；是任意族名（本机字体现选）→ 把该族名安全包裹后
// 夹在默认预设栈最前（用户字体 → 随包 OFL 字体 → 系统 → CJK），缺字不断行；
// 名字非法（含 {} ; < 等能逃出注入 <style> 的字符）→ 一律落到默认栈，绝不把原始输入拼进 CSS。
export function codeFontStack(fontKey) {
  if (FONTS[fontKey]) return FONTS[fontKey]
  const quoted = quoteFontFamily(fontKey)
  return quoted ? quoted + ',' + FONTS['JetBrains Mono'] : FONTS['JetBrains Mono']
}

// 排印 CSS（与主题无关，system 模式也输出）
export function buildTypographyCss(typography) {
  const size = (typography && typography.size) || 13
  const mode = (typography && typography.mode) || 'mono'
  const fontKey = (typography && typography.fontKey) || 'JetBrains Mono'
  const codeFont = codeFontStack(fontKey)
  const bodyFont = mode === 'mono' ? codeFont : SANS_STACK
  const lh = size + 9
  const small = size - 1
  // 标题阶梯跟随 size（size=13 时恰好还原旧固定值 16/15/14，避免默认视觉漂移）：
  // H1 = size+3 / lh+2，H2 = size+2 / lh，H3 = size+1 / lh-1
  const h1 = size + 3
  const h1lh = lh + 2
  const h2 = size + 2
  const h2lh = lh
  const h3 = size + 1
  const h3lh = lh - 1
  return [FONT_FACE_CSS,
    'body,body[data-ds-dark-theme]{',
    '--dsw-font-family:' + bodyFont + ';',
    '--ds-font-family-code:' + codeFont + ';',
    // F4 新卡片字号（DSH 0.1.7 CodeCard .card/.body 只读此变量；size=13 默认恰好还原上游 11px/19px，跟随 11–24 档）
    '--dsw-font-markdown-code-block:' + (size - 2) + 'px/' + (size + 6) + 'px var(--ds-font-family-code);',
    '--dsw-font-markdown-base:' + size + 'px/' + lh + 'px var(--dsw-font-family);',
    '--dsw-font-markdown-base-font-size:' + size + 'px;',
    '--dsw-font-markdown-base-line-height:' + lh + 'px;',
    '--dsw-font-markdown-h1:700 ' + h1 + 'px/' + h1lh + 'px var(--dsw-font-family);',
    '--dsw-font-markdown-h1-font-size:' + h1 + 'px;',
    '--dsw-font-markdown-h1-line-height:' + h1lh + 'px;',
    '--dsw-font-markdown-h2:700 ' + h2 + 'px/' + h2lh + 'px var(--dsw-font-family);',
    '--dsw-font-markdown-h2-font-size:' + h2 + 'px;',
    '--dsw-font-markdown-h2-line-height:' + h2lh + 'px;',
    '--dsw-font-markdown-h3:600 ' + h3 + 'px/' + h3lh + 'px var(--dsw-font-family);',
    '--dsw-font-markdown-h3-font-size:' + h3 + 'px;',
    '--dsw-font-markdown-h3-line-height:' + h3lh + 'px;',
    '--dsw-font-markdown-small:' + small + 'px/' + (small + 8) + 'px var(--dsw-font-family);',
    '--dsw-font-markdown-small-font-size:' + small + 'px;',
    '--dsw-font-markdown-small-line-height:' + (small + 8) + 'px;',
    '}',
    'body{font-size:' + size + 'px;}',
  ].join('')
}

// 颜色 CSS（仅主题模式；system 不调用）
// issue 45：自持画布走 legacy 联合选择器（字节一致）；委托画布按外观分区发射，
// 浅色走宿主默认作用域，深色走宿主深色作用域。
export function buildColorCss(darkColors, lightColors, tokens, delegated) {
  if (!delegated) {
    const decls = []
    for (const name of Object.keys(tokens)) {
      const v = tokens[name] && tokens[name].dark
      if (v && v !== TRANSPARENT) decls.push(name + ':' + v + ';')
    }
    const rules = []
    for (const rule of CSS_RULES) {
      const v = usable(darkColors, rule.from)
      if (v === null) continue
      rules.push(rule.selector + '{' + rule.prop + ':' + v + ';}')
    }
    // 内联代码无芯片背景（固定规则，opencode TUI 同款）
    rules.push('code:not(pre code){background:transparent;}')
    return 'body,body[data-ds-dark-theme]{' + decls.join('') + '}' + rules.join('')
  }
  const declsFor = (mode) => {
    const out = []
    for (const name of Object.keys(tokens)) {
      const v = tokens[name] && tokens[name][mode]
      if (v && v !== TRANSPARENT) out.push(name + ':' + v + ';')
    }
    return out.join('')
  }
  const scopeSel = (sel, prefix) => (/^body\b/.test(sel) ? sel.replace(/^body\b/, prefix) : prefix + ' ' + sel)
  const rulesFor = (colors, prefix) => {
    const out = []
    for (const rule of CSS_RULES) {
      const v = usable(colors, rule.from)
      if (v === null) continue
      out.push(scopeSel(rule.selector, prefix) + '{' + rule.prop + ':' + v + ';}')
    }
    return out.join('')
  }
  return 'body{' + declsFor('light') + '}' +
    'body[data-ds-dark-theme]{' + declsFor('dark') + '}' +
    rulesFor(lightColors, 'body') +
    rulesFor(darkColors, 'body[data-ds-dark-theme]') +
    'code:not(pre code){background:transparent;}'
}

// 总入口：themeName='system' → modes=null
export function generateTheme(modes, typography, themeName) {
  const css = [buildTypographyCss(typography)]
  let tokens = {}
  if (modes) {
    const delegated = isDelegatedSurface(modes.dark, modes.light)
    tokens = buildTokens(modes.dark, modes.light, delegated)
    css.push(buildColorCss(modes.dark, modes.light, tokens, delegated))
  }
  return {
    tokens: tokens,
    css: css.join(''),
    meta: { theme: themeName || (modes ? 'theme' : 'system'), typography: typography || {} },
  }
}