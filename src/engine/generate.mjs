// generate.mjs — 生成器：解析后的主题色位 + 排印参数 → DSH 注入物 { tokens, css }
// 不变式：输出完全由输入决定（确定性）；system 主题（colors=null）只输出排印，不碰颜色
import { TOKEN_MAP, DERIVED_TOKENS, SHIKI_MAP, CSS_RULES, FONTS, SANS_STACK } from './map-dsh.mjs'
import { withAlpha } from './resolve.mjs'

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
export function buildTokens(colors) {
  const tokens = {}
  const put = (name, value) => {
    if (value !== null && value !== undefined) tokens[name] = { light: value, dark: value }
  }
  for (const [dshVar, from] of TOKEN_MAP) {
    if (from === '__transparent__') { put(dshVar, TRANSPARENT); continue }
    put(dshVar, usable(colors, from))
  }
  for (const [dshVar, fn] of DERIVED_TOKENS) {
    try {
      const v = fn(colors)
      if (v !== null && v !== undefined && v !== TRANSPARENT) put(dshVar, v)
    } catch (e) { /* 派生失败跳过（如缺色位） */ }
  }
  for (const [dshVar, from] of SHIKI_MAP) {
    put(dshVar, usable(colors, from))
  }
  return tokens
}

// 排印 CSS（与主题无关，system 模式也输出）
export function buildTypographyCss(typography) {
  const size = (typography && typography.size) || 13
  const mode = (typography && typography.mode) || 'mono'
  const fontKey = (typography && typography.fontKey) || 'JetBrains Mono'
  const bodyFont = mode === 'mono' ? (FONTS[fontKey] || FONTS['JetBrains Mono']) : SANS_STACK
  const codeFont = FONTS[fontKey] || FONTS['JetBrains Mono']
  const lh = size + 9
  const small = size - 1
  return [
    'body,body[data-ds-dark-theme]{',
    '--dsw-font-family:' + bodyFont + ';',
    '--ds-font-family-code:' + codeFont + ';',
    '--dsw-font-markdown-base:' + size + 'px/' + lh + 'px var(--dsw-font-family);',
    '--dsw-font-markdown-base-font-size:' + size + 'px;',
    '--dsw-font-markdown-base-line-height:' + lh + 'px;',
    '--dsw-font-markdown-h1:700 16px/24px var(--dsw-font-family);',
    '--dsw-font-markdown-h1-font-size:16px;',
    '--dsw-font-markdown-h1-line-height:24px;',
    '--dsw-font-markdown-h2:700 15px/22px var(--dsw-font-family);',
    '--dsw-font-markdown-h2-font-size:15px;',
    '--dsw-font-markdown-h2-line-height:22px;',
    '--dsw-font-markdown-h3:600 14px/21px var(--dsw-font-family);',
    '--dsw-font-markdown-h3-font-size:14px;',
    '--dsw-font-markdown-h3-line-height:21px;',
    '--dsw-font-markdown-small:' + small + 'px/' + (small + 8) + 'px var(--dsw-font-family);',
    '--dsw-font-markdown-small-font-size:' + small + 'px;',
    '--dsw-font-markdown-small-line-height:' + (small + 8) + 'px;',
    '}',
    'body{font-size:' + size + 'px;}',
  ].join('')
}

// 颜色 CSS（仅主题模式；system 不调用）
export function buildColorCss(colors, tokens) {
  const decls = []
  for (const name of Object.keys(tokens)) {
    const v = tokens[name] && tokens[name].dark
    if (v && v !== TRANSPARENT) decls.push(name + ':' + v + ';')
  }
  const rules = []
  for (const rule of CSS_RULES) {
    const v = usable(colors, rule.from)
    if (v === null) continue
    rules.push(rule.selector + '{' + rule.prop + ':' + v + ';}')
  }
  // 内联代码无芯片背景（固定规则，opencode TUI 同款）
  rules.push('code:not(pre code){background:transparent;}')
  return 'body,body[data-ds-dark-theme]{' + decls.join('') + '}' + rules.join('')
}

// 总入口：themeName='system' → colors=null
export function generateTheme(colors, typography, themeName) {
  const css = [buildTypographyCss(typography)]
  let tokens = {}
  if (colors) {
    tokens = buildTokens(colors)
    css.push(buildColorCss(colors, tokens))
  }
  return {
    tokens: tokens,
    css: css.join(''),
    meta: { theme: themeName || (colors ? 'theme' : 'system'), typography: typography || {} },
  }
}