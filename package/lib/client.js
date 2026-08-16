/**
 * dsh-opencode-palette v1.5.1 — 浏览器半（构建产物，勿手改）
 * 数据驱动管线：opencode v1.18.12 官方主题 JSON → 颜色解析 → DSH 适配注入
 * 源：src/engine/* + runtime/client.mjs（npm run build 重新生成）
 */
window.__ModuleLoader__.load({
  id: "dsh-opencode-palette",
  factory: function (require) {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" })
    var __mods = {};
(function () {
// resolve.mjs — 颜色解析器：把 opencode 主题 JSON 的颜色引用链解析为确定 HEX
// 支持：hex 字符串 / 'transparent'|'none' / defs 引用 / theme 自引用 / ANSI 数字 / {dark,light} 变体
// 循环引用抛错；单键解析失败由 resolveThemeColors 捕获为 { __error }，不影响其余色位

// ANSI 16 色（opencode ansiToRgba 同源）
const ANSI_16 = [
  '#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#C0C0C0',
  '#808080', '#FF0000', '#00FF00', '#FFFF00', '#0000FF', '#FF00FF', '#00FFFF', '#FFFFFF',
]

function ansiToHex(code) {
  if (!Number.isInteger(code) || code < 0 || code > 255) return '#FF00FF' // 非法值兜底（品红=显眼错误）
  if (code < 16) return ANSI_16[code]
  if (code < 232) {
    const index = code - 16
    const b = index % 6
    const g = Math.floor(index / 6) % 6
    const r = Math.floor(index / 36)
    const val = (x) => (x === 0 ? 0 : x * 40 + 55)
    return rgbToHex(val(r), val(g), val(b))
  }
  const gray = (code - 232) * 10 + 8
  return rgbToHex(gray, gray, gray)
}

function rgbToHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return ('#' + c(r) + c(g) + c(b)).toUpperCase()
}

function hexToRgb(hex) {
  let t = String(hex || '').trim()
  if (t[0] === '#') t = t.slice(1)
  if (t.length === 3) t = t.split('').map((x) => x + x).join('')
  if (t.length === 4) t = t.split('').map((x) => x + x).join('')
  const n = parseInt(t, 16)
  if (t.length === 8) return { r: (n >>> 24) & 255, g: (n >>> 16) & 255, b: (n >>> 8) & 255, a: n & 255 }
  return { r: (n >>> 16) & 255, g: (n >>> 8) & 255, b: n & 255, a: 255 }
}

// 提亮/压暗：f>0 向白混合，f<0 向黑混合
function shade(hex, f) {
  const { r, g, b } = hexToRgb(hex)
  const target = f >= 0 ? 255 : 0
  const k = Math.abs(f)
  return rgbToHex(r + (target - r) * k, g + (target - g) * k, b + (target - b) * k)
}

// 带透明度（输出 rgba()）
function withAlpha(hex, a) {
  const { r, g, b } = hexToRgb(hex)
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'
}

// 对比文字色：亮底→深字，暗底→浅字
function contrastText(hex) {
  const { r, g, b } = hexToRgb(hex)
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luma > 0.6 ? '#141414' : '#F4F4F5'
}

const HEX_RE = /^#([0-9a-fA-F]{3,8})$/

function resolveColor(ref, defs, theme, mode, chain) {
  const seen = chain || []
  if (typeof ref === 'number') return ansiToHex(ref)
  if (typeof ref === 'string') {
    const t = ref.trim()
    if (t === 'none' || t === 'transparent') return 'transparent'
    if (HEX_RE.test(t)) return t.toUpperCase()
    if (seen.includes(t)) {
      throw new Error('循环颜色引用: ' + seen.concat(t).join(' -> '))
    }
    const next = (defs && defs[t]) || (theme && theme[t])
    if (next === undefined) throw new Error('未知颜色引用 \"' + t + '\"（不在 defs 与 theme 中）')
    return resolveColor(next, defs, theme, mode, seen.concat(t))
  }
  if (typeof ref === 'object' && ref !== null) {
    const v = ref[mode] !== undefined ? ref[mode] : (ref.dark !== undefined ? ref.dark : ref.light)
    if (v === undefined) throw new Error('颜色变体缺少 dark/light: ' + JSON.stringify(ref))
    return resolveColor(v, defs, theme, mode, seen)
  }
  throw new Error('非法颜色值: ' + String(ref))
}

// 解析整个主题 → { 色位: hex|transparent|{__error} }
function resolveThemeColors(json, mode) {
  const m = mode || 'dark'
  const defs = (json && json.defs) || {}
  const theme = (json && json.theme) || {}
  const out = {}
  for (const key of Object.keys(theme)) {
    if (key === 'thinkingOpacity') continue
    try {
      out[key] = resolveColor(theme[key], defs, theme, m, [])
    } catch (e) {
      out[key] = { __error: e.message }
    }
  }
  // opencode 同款兜底：selectedListItemText 缺省=background；backgroundMenu 缺省=backgroundElement
  if (out.selectedListItemText === undefined) out.selectedListItemText = out.background
  if (out.backgroundMenu === undefined) out.backgroundMenu = out.backgroundElement
  return out
}

// 收集解析失败清单（供调用方告警/测试）
function collectErrors(colors) {
  const out = []
  for (const key of Object.keys(colors)) {
    const v = colors[key]
    if (v && typeof v === 'object' && v.__error) out.push(key + ': ' + v.__error)
  }
  return out
}
__mods["resolve"] = { ansiToHex, rgbToHex, hexToRgb, shade, withAlpha, contrastText, resolveColor, resolveThemeColors, collectErrors }
})();
(function () {
// map-dsh.mjs — ★ 单一真相源：opencode 主题语义色位 → DSH 界面 CSS 变量/元素规则
// DSH 升级改 CSS 变量名时，只需要改这一个文件。
// 值 = opencode 色位名；generate.mjs 负责取值与派生（提亮/透明/对比色）。

// ── 1. token 层：theme.overrideTokens 注册的 --dsw-alias-* 变量 ──
// 格式: [DSH 变量, 来源色位]（来源缺失/透明/解析失败 → 该 token 自动跳过，不污染）
const TOKEN_MAP = [
  // 背景面：全部收敛到主题 background
  ['--dsw-alias-bg-base', 'background'],
  ['--dsw-alias-bg-layer-1', 'background'],
  ['--dsw-alias-bg-layer-2', 'background'],
  ['--dsw-alias-bg-overlay', 'background'],
  ['--dsw-alias-bg-layer-3', 'background'],
  ['--dsw-alias-bg-module-platform', 'background'],
  ['--dsw-alias-bg-multi-select', 'background'],
  ['--dsw-specific-sidebar-fill', 'background'],
  ['--dsw-specific-menu', 'background'],
  ['--dsw-specific-selector', 'background'],
  ['--dsw-specific-tip', 'background'],
  ['--dsw-specific-bubble', 'background'],
  ['--dsw-specific-bubble-highlight', 'background'],
  ['--dsw-alias-markdown-tag', 'background'],
  ['--dsw-alias-markdown-placeholder', 'background'],
  ['--dsw-alias-markdown-citation', 'background'],
  ['--dsw-alias-markdown-code-segment-unselected', 'background'],
  ['--dsw-alias-markdown-code-segment-selected', 'backgroundElement'],
  // 浮起面：输入框/代码块底 = backgroundPanel；横幅/按钮面 = backgroundElement
  ['--dsw-specific-input-major', 'backgroundPanel'],
  ['--dsw-specific-login-input', 'backgroundPanel'],
  ['--dsw-alias-markdown-code-block', 'backgroundPanel'],
  ['--dsw-alias-markdown-code-block-banner', 'backgroundElement'],
  ['--dsw-alias-toast-bg', 'backgroundElement'],
  ['--dsw-alias-tooltip-bg', 'backgroundElement'],
  ['--dsw-alias-button-elevated-fill', 'backgroundPanel'],
  ['--dsw-alias-button-floating-fill', 'backgroundPanel'],
  ['--dsw-alias-button-ghost-active-fill', 'backgroundPanel'],
  ['--dsw-alias-button-primary-dimmed', 'backgroundPanel'],
  // 文字层级
  ['--dsw-alias-label-primary', 'text'],
  ['--dsw-alias-label-primary-inverted', 'text'],
  ['--dsw-alias-label-primary-dimmed', 'text'],
  ['--dsw-alias-brand-primary-invert', 'text'],
  ['--dsw-alias-label-secondary', 'textMuted'],
  ['--dsw-alias-label-tertiary', 'textMuted'],
  ['--dsw-alias-label-caption', 'textMuted'],
  // 品牌与状态
  ['--dsw-alias-brand-primary', 'primary'],
  ['--dsw-alias-button-primary-fill', 'primary'],
  ['--dsw-alias-button-info-fill', 'info'],
  ['--dsw-alias-state-error-primary', 'error'],
  ['--dsw-alias-state-warn-primary', 'warning'],
  ['--dsw-alias-state-success-primary', 'success'],
  // 边框
  ['--dsw-alias-border-l1', 'border'],
  ['--dsw-alias-border-l2', 'borderActive'],
  ['--dsw-alias-border-l2-darkmode-thin', 'borderActive'],
  ['--dsw-alias-button-ghost-active-border', 'borderActive'],
  // 内联代码无芯片（opencode TUI 风格，固定 transparent）
  ['--dsw-alias-markdown-inline-code', '__transparent__'],
]

// ── 2. 派生 token：值不是直接取自色位，而是按规则计算 ──
// 格式: [DSH 变量, 计算函数(colors) → 值]（colors = resolveThemeColors 输出）
const DERIVED_TOKENS = [
  ['--dsw-alias-button-primary-hover', (c) => shade(c.primary, 0.12)],
  ['--dsw-alias-button-info-hover', (c) => shade(c.info, 0.12)],
  ['--dsw-alias-label-primary-foreground', (c) => contrastText(c.primary)],
  ['--dsw-alias-label-dimmed', (c) => withAlpha(c.textMuted, 0.8)],
  ['--dsw-alias-button-tool-bar-fill', (c) => withAlpha(c.text, 0.1)],
  ['--dsw-alias-button-tool-bar-hover', (c) => withAlpha(c.text, 0.16)],
  ['--dsw-alias-button-tool-bar-fill-invisible', (c) => withAlpha(c.text, 0.04)],
  ['--dsw-alias-button-floating-hover', (c) => c.backgroundElement],
  ['--dsw-alias-button-ghost-active-hover', (c) => c.backgroundElement],
  ['--dsw-alias-interactive-bg-active', (c) => withAlpha(c.text, 0.14)],
  ['--dsw-alias-interactive-bg-hover', (c) => withAlpha(c.text, 0.08)],
  ['--dsw-alias-interactive-bg-hover-accent', (c) => withAlpha(c.primary, 0.2)],
  ['--dsw-alias-interactive-bg-hover-danger', (c) => withAlpha(c.error, 0.15)],
  ['--dsw-alias-interactive-bg-hover-solid', (c) => c.backgroundElement],
  ['--dsw-alias-border-inverted', (c) => withAlpha(c.text, 0.06)],
  ['--dsw-alias-border-inverted2', (c) => withAlpha(c.text, 0.08)],
  ['--dsw-alias-scrollbar-bg-l1', (c) => withAlpha(c.text, 0.08)],
  ['--dsw-alias-scrollbar-bg-l2', (c) => withAlpha(c.text, 0.08)],
  ['--dsw-alias-scrollbar-hover-l1', (c) => c.borderActive],
  ['--dsw-alias-scrollbar-hover-l2', (c) => c.borderActive],
]

// ── 3. shiki 语法高亮变量（DSH 只认 10 个，opencode 9 色位做角色合并）──
const SHIKI_MAP = [
  ['--shiki-foreground', 'text'],
  ['--shiki-token-comment', 'syntaxComment'],
  ['--shiki-token-keyword', 'syntaxKeyword'],
  ['--shiki-token-function', 'syntaxFunction'],
  ['--shiki-token-parameter', 'syntaxType'],      // 类型≈参数槽（DSH 无独立 type 槽）
  ['--shiki-token-constant', 'syntaxNumber'],
  ['--shiki-token-string', 'syntaxString'],
  ['--shiki-token-string-expression', 'syntaxString'],
  ['--shiki-token-punctuation', 'syntaxOperator'], // 操作符≈标点槽
  ['--shiki-token-link', 'markdownLink'],
]

// ── 4. 元素级规则：DSH 没有对应变量的部分，用选择器兜底 ──
// 格式: { selector, prop, from }（from 缺失/透明 → 规则跳过）
const CSS_RULES = [
  { selector: 'body h1,body h2,body h3,body h4,body h5,body h6', prop: 'color', from: 'markdownHeading' },
  { selector: 'a', prop: 'color', from: 'markdownLink' },
  { selector: 'code:not(pre code)', prop: 'color', from: 'markdownCode' },
  { selector: 'em', prop: 'color', from: 'markdownEmph' },
  { selector: 'strong', prop: 'color', from: 'markdownStrong' },
  { selector: 'blockquote', prop: 'color', from: 'markdownBlockQuote' },
  { selector: 'hr', prop: 'borderColor', from: 'markdownHorizontalRule' },
]

// ── 5. 字体预设（主题无关维度；等宽栈尾部保留 CJK 字体避免 Windows 中文回退 SimSun）──
const SANS_STACK = [
  '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", "'PingFang SC'",
  "'Hiragino Sans GB'", "'Microsoft YaHei'", "'Helvetica Neue'", 'Helvetica', 'Arial', 'sans-serif',
].join(', ')

const FONTS = {
  'JetBrains Mono': "'JetBrains Mono','SF Mono','Cascadia Code','Fira Code',Menlo,Consolas,'Liberation Mono','Courier New','PingFang SC','Microsoft YaHei'",
  'Cascadia Code': "'Cascadia Code','JetBrains Mono','SF Mono','Fira Code',Consolas,'Courier New','PingFang SC','Microsoft YaHei'",
  'Fira Code': "'Fira Code','JetBrains Mono','Cascadia Code',Consolas,'Courier New','PingFang SC','Microsoft YaHei'",
  'SF Mono': "'SF Mono','JetBrains Mono','Fira Code',Consolas,'Courier New','PingFang SC','Microsoft YaHei'",
  'Consolas': "Consolas,'JetBrains Mono','Cascadia Code','Courier New','PingFang SC','Microsoft YaHei'",
}
__mods["map-dsh"] = { TOKEN_MAP, DERIVED_TOKENS, SHIKI_MAP, CSS_RULES, SANS_STACK, FONTS }
})();
(function () {
// generate.mjs — 生成器：解析后的主题色位 + 排印参数 → DSH 注入物 { tokens, css }
// 不变式：输出完全由输入决定（确定性）；system 主题（colors=null）只输出排印，不碰颜色
const { TOKEN_MAP, DERIVED_TOKENS, SHIKI_MAP, CSS_RULES, FONTS, SANS_STACK } = __mods["map-dsh"]
const { withAlpha } = __mods["resolve"]

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
function buildTokens(colors) {
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
function buildTypographyCss(typography) {
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
function buildColorCss(colors, tokens) {
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
function generateTheme(colors, typography, themeName) {
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
__mods["generate"] = { buildTokens, buildTypographyCss, buildColorCss, generateTheme }
})();
(function () {
// registry.mjs — 主题注册表：33 个静态主题（vendored JSON）+ system 特殊主题
// 数据由 scripts/sync-themes.mjs 从 opencode v1.18.12 官方 tag 同步（见 MANIFEST.json 指纹）
const aura = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "darkBg": "#0f0f0f",
    "darkBgPanel": "#15141b",
    "darkBorder": "#2d2d2d",
    "darkFgMuted": "#6d6d6d",
    "darkFg": "#edecee",
    "purple": "#a277ff",
    "pink": "#f694ff",
    "blue": "#82e2ff",
    "red": "#ff6767",
    "orange": "#ffca85",
    "cyan": "#61ffca",
    "green": "#9dff65"
  },
  "theme": {
    "primary": "purple",
    "secondary": "pink",
    "accent": "purple",
    "error": "red",
    "warning": "orange",
    "success": "cyan",
    "info": "purple",
    "text": "darkFg",
    "textMuted": "darkFgMuted",
    "background": "darkBg",
    "backgroundPanel": "darkBgPanel",
    "backgroundElement": "darkBgPanel",
    "border": "darkBorder",
    "borderActive": "darkFgMuted",
    "borderSubtle": "darkBorder",
    "diffAdded": "cyan",
    "diffRemoved": "red",
    "diffContext": "darkFgMuted",
    "diffHunkHeader": "darkFgMuted",
    "diffHighlightAdded": "cyan",
    "diffHighlightRemoved": "red",
    "diffAddedBg": "#354933",
    "diffRemovedBg": "#3f191a",
    "diffContextBg": "darkBgPanel",
    "diffLineNumber": "#898989",
    "diffAddedLineNumberBg": "#162620",
    "diffRemovedLineNumberBg": "#26161a",
    "markdownText": "darkFg",
    "markdownHeading": "purple",
    "markdownLink": "pink",
    "markdownLinkText": "purple",
    "markdownCode": "cyan",
    "markdownBlockQuote": "darkFgMuted",
    "markdownEmph": "orange",
    "markdownStrong": "purple",
    "markdownHorizontalRule": "darkFgMuted",
    "markdownListItem": "purple",
    "markdownListEnumeration": "purple",
    "markdownImage": "pink",
    "markdownImageText": "purple",
    "markdownCodeBlock": "darkFg",
    "syntaxComment": "darkFgMuted",
    "syntaxKeyword": "pink",
    "syntaxFunction": "purple",
    "syntaxVariable": "purple",
    "syntaxString": "cyan",
    "syntaxNumber": "green",
    "syntaxType": "purple",
    "syntaxOperator": "pink",
    "syntaxPunctuation": "darkFg"
  }
}
const ayu = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "darkBg": "#0B0E14",
    "darkBgAlt": "#0D1017",
    "darkLine": "#11151C",
    "darkPanel": "#0F131A",
    "darkFg": "#BFBDB6",
    "darkFgMuted": "#565B66",
    "darkGutter": "#6C7380",
    "darkTag": "#39BAE6",
    "darkFunc": "#FFB454",
    "darkEntity": "#59C2FF",
    "darkString": "#AAD94C",
    "darkRegexp": "#95E6CB",
    "darkMarkup": "#F07178",
    "darkKeyword": "#FF8F40",
    "darkSpecial": "#E6B673",
    "darkComment": "#ACB6BF",
    "darkConstant": "#D2A6FF",
    "darkOperator": "#F29668",
    "darkAdded": "#7FD962",
    "darkRemoved": "#F26D78",
    "darkAccent": "#E6B450",
    "darkError": "#D95757",
    "darkIndentActive": "#6C7380"
  },
  "theme": {
    "primary": "darkEntity",
    "secondary": "darkConstant",
    "accent": "darkAccent",
    "error": "darkError",
    "warning": "darkSpecial",
    "success": "darkAdded",
    "info": "darkTag",
    "text": "darkFg",
    "textMuted": "darkFgMuted",
    "background": "darkBg",
    "backgroundPanel": "darkPanel",
    "backgroundElement": "darkBgAlt",
    "border": "darkGutter",
    "borderActive": "darkIndentActive",
    "borderSubtle": "darkLine",
    "diffAdded": "darkAdded",
    "diffRemoved": "darkRemoved",
    "diffContext": "darkComment",
    "diffHunkHeader": "darkComment",
    "diffHighlightAdded": "darkString",
    "diffHighlightRemoved": "darkMarkup",
    "diffAddedBg": "#20303b",
    "diffRemovedBg": "#37222c",
    "diffContextBg": "darkPanel",
    "diffLineNumber": "diffContext",
    "diffAddedLineNumberBg": "#1b2b34",
    "diffRemovedLineNumberBg": "#2d1f26",
    "markdownText": "darkFg",
    "markdownHeading": "darkConstant",
    "markdownLink": "darkEntity",
    "markdownLinkText": "darkTag",
    "markdownCode": "darkString",
    "markdownBlockQuote": "darkSpecial",
    "markdownEmph": "darkSpecial",
    "markdownStrong": "darkFunc",
    "markdownHorizontalRule": "darkFgMuted",
    "markdownListItem": "darkEntity",
    "markdownListEnumeration": "darkTag",
    "markdownImage": "darkEntity",
    "markdownImageText": "darkTag",
    "markdownCodeBlock": "darkFg",
    "syntaxComment": "darkComment",
    "syntaxKeyword": "darkKeyword",
    "syntaxFunction": "darkFunc",
    "syntaxVariable": "darkEntity",
    "syntaxString": "darkString",
    "syntaxNumber": "darkConstant",
    "syntaxType": "darkSpecial",
    "syntaxOperator": "darkOperator",
    "syntaxPunctuation": "darkFg"
  }
}
const carbonfox = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "bg0": "#0d0d0d",
    "bg1": "#161616",
    "bg1a": "#1a1a1a",
    "bg2": "#1e1e1e",
    "bg3": "#262626",
    "bg4": "#303030",
    "fg0": "#ffffff",
    "fg1": "#f2f4f8",
    "fg2": "#a9afbc",
    "fg3": "#7d848f",
    "lbg0": "#ffffff",
    "lbg1": "#f4f4f4",
    "lbg2": "#e8e8e8",
    "lbg3": "#dcdcdc",
    "lfg0": "#000000",
    "lfg1": "#161616",
    "lfg2": "#525252",
    "lfg3": "#6f6f6f",
    "red": "#ee5396",
    "green": "#25be6a",
    "yellow": "#08bdba",
    "blue": "#78a9ff",
    "magenta": "#be95ff",
    "cyan": "#33b1ff",
    "white": "#dfdfe0",
    "orange": "#3ddbd9",
    "pink": "#ff7eb6",
    "blueBright": "#8cb6ff",
    "cyanBright": "#52c7ff",
    "greenBright": "#46c880",
    "redLight": "#9f1853",
    "greenLight": "#198038",
    "yellowLight": "#007d79",
    "blueLight": "#0043ce",
    "magentaLight": "#6929c4",
    "cyanLight": "#0072c3",
    "warning": "#f1c21b",
    "diffGreen": "#50fa7b",
    "diffRed": "#ff6b6b",
    "diffGreenBg": "#0f2418",
    "diffRedBg": "#2a1216"
  },
  "theme": {
    "primary": {
      "dark": "cyan",
      "light": "blueLight"
    },
    "secondary": {
      "dark": "blue",
      "light": "blueLight"
    },
    "accent": {
      "dark": "pink",
      "light": "redLight"
    },
    "error": {
      "dark": "red",
      "light": "redLight"
    },
    "warning": {
      "dark": "warning",
      "light": "yellowLight"
    },
    "success": {
      "dark": "green",
      "light": "greenLight"
    },
    "info": {
      "dark": "blue",
      "light": "blueLight"
    },
    "text": {
      "dark": "fg1",
      "light": "lfg1"
    },
    "textMuted": {
      "dark": "fg3",
      "light": "lfg3"
    },
    "background": {
      "dark": "bg1",
      "light": "lbg0"
    },
    "backgroundPanel": {
      "dark": "bg1a",
      "light": "lbg1"
    },
    "backgroundElement": {
      "dark": "bg2",
      "light": "lbg1"
    },
    "border": {
      "dark": "bg4",
      "light": "lbg3"
    },
    "borderActive": {
      "dark": "cyan",
      "light": "blueLight"
    },
    "borderSubtle": {
      "dark": "bg3",
      "light": "lbg2"
    },
    "diffAdded": {
      "dark": "diffGreen",
      "light": "greenLight"
    },
    "diffRemoved": {
      "dark": "diffRed",
      "light": "redLight"
    },
    "diffContext": {
      "dark": "fg3",
      "light": "lfg3"
    },
    "diffHunkHeader": {
      "dark": "blue",
      "light": "blueLight"
    },
    "diffHighlightAdded": {
      "dark": "#7dffaa",
      "light": "greenLight"
    },
    "diffHighlightRemoved": {
      "dark": "#ff9999",
      "light": "redLight"
    },
    "diffAddedBg": {
      "dark": "diffGreenBg",
      "light": "#defbe6"
    },
    "diffRemovedBg": {
      "dark": "diffRedBg",
      "light": "#fff1f1"
    },
    "diffContextBg": {
      "dark": "bg1",
      "light": "lbg1"
    },
    "diffLineNumber": {
      "dark": "#808792",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "diffGreenBg",
      "light": "#defbe6"
    },
    "diffRemovedLineNumberBg": {
      "dark": "diffRedBg",
      "light": "#fff1f1"
    },
    "markdownText": {
      "dark": "fg1",
      "light": "lfg1"
    },
    "markdownHeading": {
      "dark": "blueBright",
      "light": "blueLight"
    },
    "markdownLink": {
      "dark": "blue",
      "light": "blueLight"
    },
    "markdownLinkText": {
      "dark": "cyan",
      "light": "cyanLight"
    },
    "markdownCode": {
      "dark": "green",
      "light": "greenLight"
    },
    "markdownBlockQuote": {
      "dark": "fg3",
      "light": "lfg3"
    },
    "markdownEmph": {
      "dark": "magenta",
      "light": "magentaLight"
    },
    "markdownStrong": {
      "dark": "fg0",
      "light": "lfg0"
    },
    "markdownHorizontalRule": {
      "dark": "bg4",
      "light": "lbg3"
    },
    "markdownListItem": {
      "dark": "cyan",
      "light": "cyanLight"
    },
    "markdownListEnumeration": {
      "dark": "cyan",
      "light": "cyanLight"
    },
    "markdownImage": {
      "dark": "blue",
      "light": "blueLight"
    },
    "markdownImageText": {
      "dark": "cyan",
      "light": "cyanLight"
    },
    "markdownCodeBlock": {
      "dark": "fg2",
      "light": "lfg2"
    },
    "syntaxComment": {
      "dark": "fg3",
      "light": "lfg3"
    },
    "syntaxKeyword": {
      "dark": "magenta",
      "light": "magentaLight"
    },
    "syntaxFunction": {
      "dark": "blueBright",
      "light": "blueLight"
    },
    "syntaxVariable": {
      "dark": "white",
      "light": "lfg1"
    },
    "syntaxString": {
      "dark": "green",
      "light": "greenLight"
    },
    "syntaxNumber": {
      "dark": "orange",
      "light": "yellowLight"
    },
    "syntaxType": {
      "dark": "yellow",
      "light": "yellowLight"
    },
    "syntaxOperator": {
      "dark": "fg2",
      "light": "lfg2"
    },
    "syntaxPunctuation": {
      "dark": "fg2",
      "light": "lfg1"
    }
  }
}
const catppuccin_frappe = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "frappeRosewater": "#f2d5cf",
    "frappeFlamingo": "#eebebe",
    "frappePink": "#f4b8e4",
    "frappeMauve": "#ca9ee6",
    "frappeRed": "#e78284",
    "frappeMaroon": "#ea999c",
    "frappePeach": "#ef9f76",
    "frappeYellow": "#e5c890",
    "frappeGreen": "#a6d189",
    "frappeTeal": "#81c8be",
    "frappeSky": "#99d1db",
    "frappeSapphire": "#85c1dc",
    "frappeBlue": "#8da4e2",
    "frappeLavender": "#babbf1",
    "frappeText": "#c6d0f5",
    "frappeSubtext1": "#b5bfe2",
    "frappeSubtext0": "#a5adce",
    "frappeOverlay2": "#949cb8",
    "frappeOverlay1": "#838ba7",
    "frappeOverlay0": "#737994",
    "frappeSurface2": "#626880",
    "frappeSurface1": "#51576d",
    "frappeSurface0": "#414559",
    "frappeBase": "#303446",
    "frappeMantle": "#292c3c",
    "frappeCrust": "#232634"
  },
  "theme": {
    "primary": {
      "dark": "frappeBlue",
      "light": "frappeBlue"
    },
    "secondary": {
      "dark": "frappeMauve",
      "light": "frappeMauve"
    },
    "accent": {
      "dark": "frappePink",
      "light": "frappePink"
    },
    "error": {
      "dark": "frappeRed",
      "light": "frappeRed"
    },
    "warning": {
      "dark": "frappeYellow",
      "light": "frappeYellow"
    },
    "success": {
      "dark": "frappeGreen",
      "light": "frappeGreen"
    },
    "info": {
      "dark": "frappeTeal",
      "light": "frappeTeal"
    },
    "text": {
      "dark": "frappeText",
      "light": "frappeText"
    },
    "textMuted": {
      "dark": "frappeOverlay2",
      "light": "frappeOverlay2"
    },
    "background": {
      "dark": "frappeBase",
      "light": "frappeBase"
    },
    "backgroundPanel": {
      "dark": "frappeMantle",
      "light": "frappeMantle"
    },
    "backgroundElement": {
      "dark": "frappeCrust",
      "light": "frappeCrust"
    },
    "border": {
      "dark": "frappeSurface0",
      "light": "frappeSurface0"
    },
    "borderActive": {
      "dark": "frappeSurface1",
      "light": "frappeSurface1"
    },
    "borderSubtle": {
      "dark": "frappeSurface2",
      "light": "frappeSurface2"
    },
    "diffAdded": {
      "dark": "frappeGreen",
      "light": "frappeGreen"
    },
    "diffRemoved": {
      "dark": "frappeRed",
      "light": "frappeRed"
    },
    "diffContext": {
      "dark": "frappeOverlay2",
      "light": "frappeOverlay2"
    },
    "diffHunkHeader": {
      "dark": "frappePeach",
      "light": "frappePeach"
    },
    "diffHighlightAdded": {
      "dark": "frappeGreen",
      "light": "frappeGreen"
    },
    "diffHighlightRemoved": {
      "dark": "frappeRed",
      "light": "frappeRed"
    },
    "diffAddedBg": {
      "dark": "#29342b",
      "light": "#29342b"
    },
    "diffRemovedBg": {
      "dark": "#3a2a31",
      "light": "#3a2a31"
    },
    "diffContextBg": {
      "dark": "frappeMantle",
      "light": "frappeMantle"
    },
    "diffLineNumber": "textMuted",
    "diffAddedLineNumberBg": {
      "dark": "#223025",
      "light": "#223025"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2f242b",
      "light": "#2f242b"
    },
    "markdownText": {
      "dark": "frappeText",
      "light": "frappeText"
    },
    "markdownHeading": {
      "dark": "frappeMauve",
      "light": "frappeMauve"
    },
    "markdownLink": {
      "dark": "frappeBlue",
      "light": "frappeBlue"
    },
    "markdownLinkText": {
      "dark": "frappeSky",
      "light": "frappeSky"
    },
    "markdownCode": {
      "dark": "frappeGreen",
      "light": "frappeGreen"
    },
    "markdownBlockQuote": {
      "dark": "frappeYellow",
      "light": "frappeYellow"
    },
    "markdownEmph": {
      "dark": "frappeYellow",
      "light": "frappeYellow"
    },
    "markdownStrong": {
      "dark": "frappePeach",
      "light": "frappePeach"
    },
    "markdownHorizontalRule": {
      "dark": "frappeSubtext0",
      "light": "frappeSubtext0"
    },
    "markdownListItem": {
      "dark": "frappeBlue",
      "light": "frappeBlue"
    },
    "markdownListEnumeration": {
      "dark": "frappeSky",
      "light": "frappeSky"
    },
    "markdownImage": {
      "dark": "frappeBlue",
      "light": "frappeBlue"
    },
    "markdownImageText": {
      "dark": "frappeSky",
      "light": "frappeSky"
    },
    "markdownCodeBlock": {
      "dark": "frappeText",
      "light": "frappeText"
    },
    "syntaxComment": {
      "dark": "frappeOverlay2",
      "light": "frappeOverlay2"
    },
    "syntaxKeyword": {
      "dark": "frappeMauve",
      "light": "frappeMauve"
    },
    "syntaxFunction": {
      "dark": "frappeBlue",
      "light": "frappeBlue"
    },
    "syntaxVariable": {
      "dark": "frappeRed",
      "light": "frappeRed"
    },
    "syntaxString": {
      "dark": "frappeGreen",
      "light": "frappeGreen"
    },
    "syntaxNumber": {
      "dark": "frappePeach",
      "light": "frappePeach"
    },
    "syntaxType": {
      "dark": "frappeYellow",
      "light": "frappeYellow"
    },
    "syntaxOperator": {
      "dark": "frappeSky",
      "light": "frappeSky"
    },
    "syntaxPunctuation": {
      "dark": "frappeText",
      "light": "frappeText"
    }
  }
}
const catppuccin_macchiato = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "macRosewater": "#f4dbd6",
    "macFlamingo": "#f0c6c6",
    "macPink": "#f5bde6",
    "macMauve": "#c6a0f6",
    "macRed": "#ed8796",
    "macMaroon": "#ee99a0",
    "macPeach": "#f5a97f",
    "macYellow": "#eed49f",
    "macGreen": "#a6da95",
    "macTeal": "#8bd5ca",
    "macSky": "#91d7e3",
    "macSapphire": "#7dc4e4",
    "macBlue": "#8aadf4",
    "macLavender": "#b7bdf8",
    "macText": "#cad3f5",
    "macSubtext1": "#b8c0e0",
    "macSubtext0": "#a5adcb",
    "macOverlay2": "#939ab7",
    "macOverlay1": "#8087a2",
    "macOverlay0": "#6e738d",
    "macSurface2": "#5b6078",
    "macSurface1": "#494d64",
    "macSurface0": "#363a4f",
    "macBase": "#24273a",
    "macMantle": "#1e2030",
    "macCrust": "#181926"
  },
  "theme": {
    "primary": {
      "dark": "macBlue",
      "light": "macBlue"
    },
    "secondary": {
      "dark": "macMauve",
      "light": "macMauve"
    },
    "accent": {
      "dark": "macPink",
      "light": "macPink"
    },
    "error": {
      "dark": "macRed",
      "light": "macRed"
    },
    "warning": {
      "dark": "macYellow",
      "light": "macYellow"
    },
    "success": {
      "dark": "macGreen",
      "light": "macGreen"
    },
    "info": {
      "dark": "macTeal",
      "light": "macTeal"
    },
    "text": {
      "dark": "macText",
      "light": "macText"
    },
    "textMuted": {
      "dark": "macOverlay2",
      "light": "macOverlay2"
    },
    "background": {
      "dark": "macBase",
      "light": "macBase"
    },
    "backgroundPanel": {
      "dark": "macMantle",
      "light": "macMantle"
    },
    "backgroundElement": {
      "dark": "macCrust",
      "light": "macCrust"
    },
    "border": {
      "dark": "macSurface0",
      "light": "macSurface0"
    },
    "borderActive": {
      "dark": "macSurface1",
      "light": "macSurface1"
    },
    "borderSubtle": {
      "dark": "macSurface2",
      "light": "macSurface2"
    },
    "diffAdded": {
      "dark": "macGreen",
      "light": "macGreen"
    },
    "diffRemoved": {
      "dark": "macRed",
      "light": "macRed"
    },
    "diffContext": {
      "dark": "macOverlay2",
      "light": "macOverlay2"
    },
    "diffHunkHeader": {
      "dark": "macPeach",
      "light": "macPeach"
    },
    "diffHighlightAdded": {
      "dark": "macGreen",
      "light": "macGreen"
    },
    "diffHighlightRemoved": {
      "dark": "macRed",
      "light": "macRed"
    },
    "diffAddedBg": {
      "dark": "#29342b",
      "light": "#29342b"
    },
    "diffRemovedBg": {
      "dark": "#3a2a31",
      "light": "#3a2a31"
    },
    "diffContextBg": {
      "dark": "macMantle",
      "light": "macMantle"
    },
    "diffLineNumber": "textMuted",
    "diffAddedLineNumberBg": {
      "dark": "#223025",
      "light": "#223025"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2f242b",
      "light": "#2f242b"
    },
    "markdownText": {
      "dark": "macText",
      "light": "macText"
    },
    "markdownHeading": {
      "dark": "macMauve",
      "light": "macMauve"
    },
    "markdownLink": {
      "dark": "macBlue",
      "light": "macBlue"
    },
    "markdownLinkText": {
      "dark": "macSky",
      "light": "macSky"
    },
    "markdownCode": {
      "dark": "macGreen",
      "light": "macGreen"
    },
    "markdownBlockQuote": {
      "dark": "macYellow",
      "light": "macYellow"
    },
    "markdownEmph": {
      "dark": "macYellow",
      "light": "macYellow"
    },
    "markdownStrong": {
      "dark": "macPeach",
      "light": "macPeach"
    },
    "markdownHorizontalRule": {
      "dark": "macSubtext0",
      "light": "macSubtext0"
    },
    "markdownListItem": {
      "dark": "macBlue",
      "light": "macBlue"
    },
    "markdownListEnumeration": {
      "dark": "macSky",
      "light": "macSky"
    },
    "markdownImage": {
      "dark": "macBlue",
      "light": "macBlue"
    },
    "markdownImageText": {
      "dark": "macSky",
      "light": "macSky"
    },
    "markdownCodeBlock": {
      "dark": "macText",
      "light": "macText"
    },
    "syntaxComment": {
      "dark": "macOverlay2",
      "light": "macOverlay2"
    },
    "syntaxKeyword": {
      "dark": "macMauve",
      "light": "macMauve"
    },
    "syntaxFunction": {
      "dark": "macBlue",
      "light": "macBlue"
    },
    "syntaxVariable": {
      "dark": "macRed",
      "light": "macRed"
    },
    "syntaxString": {
      "dark": "macGreen",
      "light": "macGreen"
    },
    "syntaxNumber": {
      "dark": "macPeach",
      "light": "macPeach"
    },
    "syntaxType": {
      "dark": "macYellow",
      "light": "macYellow"
    },
    "syntaxOperator": {
      "dark": "macSky",
      "light": "macSky"
    },
    "syntaxPunctuation": {
      "dark": "macText",
      "light": "macText"
    }
  }
}
const catppuccin = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "lightRosewater": "#dc8a78",
    "lightFlamingo": "#dd7878",
    "lightPink": "#ea76cb",
    "lightMauve": "#8839ef",
    "lightRed": "#d20f39",
    "lightMaroon": "#e64553",
    "lightPeach": "#fe640b",
    "lightYellow": "#df8e1d",
    "lightGreen": "#40a02b",
    "lightTeal": "#179299",
    "lightSky": "#04a5e5",
    "lightSapphire": "#209fb5",
    "lightBlue": "#1e66f5",
    "lightLavender": "#7287fd",
    "lightText": "#4c4f69",
    "lightSubtext1": "#5c5f77",
    "lightSubtext0": "#6c6f85",
    "lightOverlay2": "#7c7f93",
    "lightOverlay1": "#8c8fa1",
    "lightOverlay0": "#9ca0b0",
    "lightSurface2": "#acb0be",
    "lightSurface1": "#bcc0cc",
    "lightSurface0": "#ccd0da",
    "lightBase": "#eff1f5",
    "lightMantle": "#e6e9ef",
    "lightCrust": "#dce0e8",
    "darkRosewater": "#f5e0dc",
    "darkFlamingo": "#f2cdcd",
    "darkPink": "#f5c2e7",
    "darkMauve": "#cba6f7",
    "darkRed": "#f38ba8",
    "darkMaroon": "#eba0ac",
    "darkPeach": "#fab387",
    "darkYellow": "#f9e2af",
    "darkGreen": "#a6e3a1",
    "darkTeal": "#94e2d5",
    "darkSky": "#89dceb",
    "darkSapphire": "#74c7ec",
    "darkBlue": "#89b4fa",
    "darkLavender": "#b4befe",
    "darkText": "#cdd6f4",
    "darkSubtext1": "#bac2de",
    "darkSubtext0": "#a6adc8",
    "darkOverlay2": "#9399b2",
    "darkOverlay1": "#7f849c",
    "darkOverlay0": "#6c7086",
    "darkSurface2": "#585b70",
    "darkSurface1": "#45475a",
    "darkSurface0": "#313244",
    "darkBase": "#1e1e2e",
    "darkMantle": "#181825",
    "darkCrust": "#11111b"
  },
  "theme": {
    "primary": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "secondary": {
      "dark": "darkMauve",
      "light": "lightMauve"
    },
    "accent": {
      "dark": "darkPink",
      "light": "lightPink"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkTeal",
      "light": "lightTeal"
    },
    "text": {
      "dark": "darkText",
      "light": "lightText"
    },
    "textMuted": {
      "dark": "darkOverlay2",
      "light": "lightOverlay2"
    },
    "background": {
      "dark": "darkBase",
      "light": "lightBase"
    },
    "backgroundPanel": {
      "dark": "darkMantle",
      "light": "lightMantle"
    },
    "backgroundElement": {
      "dark": "darkCrust",
      "light": "lightCrust"
    },
    "border": {
      "dark": "darkSurface0",
      "light": "lightSurface0"
    },
    "borderActive": {
      "dark": "darkSurface1",
      "light": "lightSurface1"
    },
    "borderSubtle": {
      "dark": "darkSurface2",
      "light": "lightSurface2"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkOverlay2",
      "light": "lightOverlay2"
    },
    "diffHunkHeader": {
      "dark": "darkPeach",
      "light": "lightPeach"
    },
    "diffHighlightAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffHighlightRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffAddedBg": {
      "dark": "#24312b",
      "light": "#d6f0d9"
    },
    "diffRemovedBg": {
      "dark": "#3c2a32",
      "light": "#f6dfe2"
    },
    "diffContextBg": {
      "dark": "darkMantle",
      "light": "lightMantle"
    },
    "diffLineNumber": {
      "dark": "textMuted",
      "light": "#5b5d63"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1e2a25",
      "light": "#c9e3cb"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#32232a",
      "light": "#e9d3d6"
    },
    "markdownText": {
      "dark": "darkText",
      "light": "lightText"
    },
    "markdownHeading": {
      "dark": "darkMauve",
      "light": "lightMauve"
    },
    "markdownLink": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownLinkText": {
      "dark": "darkSky",
      "light": "lightSky"
    },
    "markdownCode": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkPeach",
      "light": "lightPeach"
    },
    "markdownHorizontalRule": {
      "dark": "darkSubtext0",
      "light": "lightSubtext0"
    },
    "markdownListItem": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownListEnumeration": {
      "dark": "darkSky",
      "light": "lightSky"
    },
    "markdownImage": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownImageText": {
      "dark": "darkSky",
      "light": "lightSky"
    },
    "markdownCodeBlock": {
      "dark": "darkText",
      "light": "lightText"
    },
    "syntaxComment": {
      "dark": "darkOverlay2",
      "light": "lightOverlay2"
    },
    "syntaxKeyword": {
      "dark": "darkMauve",
      "light": "lightMauve"
    },
    "syntaxFunction": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkPeach",
      "light": "lightPeach"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkSky",
      "light": "lightSky"
    },
    "syntaxPunctuation": {
      "dark": "darkText",
      "light": "lightText"
    }
  }
}
const cobalt2 = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "background": "#193549",
    "backgroundAlt": "#122738",
    "backgroundPanel": "#1f4662",
    "foreground": "#ffffff",
    "foregroundMuted": "#adb7c9",
    "yellow": "#ffc600",
    "yellowBright": "#ffe14c",
    "orange": "#ff9d00",
    "orangeBright": "#ffb454",
    "mint": "#2affdf",
    "mintBright": "#7efff5",
    "blue": "#0088ff",
    "blueBright": "#5cb7ff",
    "pink": "#ff628c",
    "pinkBright": "#ff86a5",
    "green": "#9eff80",
    "greenBright": "#b9ff9f",
    "purple": "#9a5feb",
    "purpleBright": "#b88cfd",
    "red": "#ff0088",
    "redBright": "#ff5fb3"
  },
  "theme": {
    "primary": {
      "dark": "blue",
      "light": "#0066cc"
    },
    "secondary": {
      "dark": "purple",
      "light": "#7c4dff"
    },
    "accent": {
      "dark": "mint",
      "light": "#00acc1"
    },
    "error": {
      "dark": "red",
      "light": "#e91e63"
    },
    "warning": {
      "dark": "yellow",
      "light": "#ff9800"
    },
    "success": {
      "dark": "green",
      "light": "#4caf50"
    },
    "info": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "text": {
      "dark": "foreground",
      "light": "#193549"
    },
    "textMuted": {
      "dark": "foregroundMuted",
      "light": "#5c6b7d"
    },
    "background": {
      "dark": "#193549",
      "light": "#ffffff"
    },
    "backgroundPanel": {
      "dark": "#122738",
      "light": "#f5f7fa"
    },
    "backgroundElement": {
      "dark": "#1f4662",
      "light": "#e8ecf1"
    },
    "border": {
      "dark": "#1f4662",
      "light": "#d3dae3"
    },
    "borderActive": {
      "dark": "blue",
      "light": "#0066cc"
    },
    "borderSubtle": {
      "dark": "#0e1e2e",
      "light": "#e8ecf1"
    },
    "diffAdded": {
      "dark": "green",
      "light": "#4caf50"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "#e91e63"
    },
    "diffContext": {
      "dark": "foregroundMuted",
      "light": "#5c6b7d"
    },
    "diffHunkHeader": {
      "dark": "mint",
      "light": "#00acc1"
    },
    "diffHighlightAdded": {
      "dark": "greenBright",
      "light": "#4caf50"
    },
    "diffHighlightRemoved": {
      "dark": "redBright",
      "light": "#e91e63"
    },
    "diffAddedBg": {
      "dark": "#1a3a2a",
      "light": "#e8f5e9"
    },
    "diffRemovedBg": {
      "dark": "#3a1a2a",
      "light": "#ffebee"
    },
    "diffContextBg": {
      "dark": "#122738",
      "light": "#f5f7fa"
    },
    "diffLineNumber": "textMuted",
    "diffAddedLineNumberBg": {
      "dark": "#1a3a2a",
      "light": "#e8f5e9"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3a1a2a",
      "light": "#ffebee"
    },
    "markdownText": {
      "dark": "foreground",
      "light": "#193549"
    },
    "markdownHeading": {
      "dark": "yellow",
      "light": "#ff9800"
    },
    "markdownLink": {
      "dark": "blue",
      "light": "#0066cc"
    },
    "markdownLinkText": {
      "dark": "mint",
      "light": "#00acc1"
    },
    "markdownCode": {
      "dark": "green",
      "light": "#4caf50"
    },
    "markdownBlockQuote": {
      "dark": "foregroundMuted",
      "light": "#5c6b7d"
    },
    "markdownEmph": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "markdownStrong": {
      "dark": "pink",
      "light": "#e91e63"
    },
    "markdownHorizontalRule": {
      "dark": "#2d5a7b",
      "light": "#d3dae3"
    },
    "markdownListItem": {
      "dark": "blue",
      "light": "#0066cc"
    },
    "markdownListEnumeration": {
      "dark": "mint",
      "light": "#00acc1"
    },
    "markdownImage": {
      "dark": "blue",
      "light": "#0066cc"
    },
    "markdownImageText": {
      "dark": "mint",
      "light": "#00acc1"
    },
    "markdownCodeBlock": {
      "dark": "foreground",
      "light": "#193549"
    },
    "syntaxComment": {
      "dark": "#0088ff",
      "light": "#5c6b7d"
    },
    "syntaxKeyword": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "syntaxFunction": {
      "dark": "yellow",
      "light": "#ff9800"
    },
    "syntaxVariable": {
      "dark": "foreground",
      "light": "#193549"
    },
    "syntaxString": {
      "dark": "green",
      "light": "#4caf50"
    },
    "syntaxNumber": {
      "dark": "pink",
      "light": "#e91e63"
    },
    "syntaxType": {
      "dark": "mint",
      "light": "#00acc1"
    },
    "syntaxOperator": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "syntaxPunctuation": {
      "dark": "foreground",
      "light": "#193549"
    }
  }
}
const cursor = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "darkBg": "#181818",
    "darkPanel": "#141414",
    "darkElement": "#262626",
    "darkFg": "#e4e4e4",
    "darkMuted": "#e4e4e45e",
    "darkBorder": "#e4e4e413",
    "darkBorderActive": "#e4e4e426",
    "darkCyan": "#88c0d0",
    "darkBlue": "#81a1c1",
    "darkGreen": "#3fa266",
    "darkGreenBright": "#70b489",
    "darkRed": "#e34671",
    "darkRedBright": "#fc6b83",
    "darkYellow": "#f1b467",
    "darkOrange": "#d2943e",
    "darkPink": "#E394DC",
    "darkPurple": "#AAA0FA",
    "darkTeal": "#82D2CE",
    "darkSyntaxYellow": "#F8C762",
    "darkSyntaxOrange": "#EFB080",
    "darkSyntaxGreen": "#A8CC7C",
    "darkSyntaxBlue": "#87C3FF",
    "lightBg": "#fcfcfc",
    "lightPanel": "#f3f3f3",
    "lightElement": "#ededed",
    "lightFg": "#141414",
    "lightMuted": "#141414ad",
    "lightBorder": "#14141413",
    "lightBorderActive": "#14141426",
    "lightTeal": "#6f9ba6",
    "lightBlue": "#3c7cab",
    "lightBlueDark": "#206595",
    "lightGreen": "#1f8a65",
    "lightGreenBright": "#55a583",
    "lightRed": "#cf2d56",
    "lightRedBright": "#e75e78",
    "lightOrange": "#db704b",
    "lightYellow": "#c08532",
    "lightPurple": "#9e94d5",
    "lightPurpleDark": "#6049b3",
    "lightPink": "#b8448b",
    "lightMagenta": "#b3003f"
  },
  "theme": {
    "primary": {
      "dark": "darkCyan",
      "light": "lightTeal"
    },
    "secondary": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "accent": {
      "dark": "darkCyan",
      "light": "lightTeal"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkYellow",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "text": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "textMuted": {
      "dark": "darkMuted",
      "light": "lightMuted"
    },
    "background": {
      "dark": "darkBg",
      "light": "lightBg"
    },
    "backgroundPanel": {
      "dark": "darkPanel",
      "light": "lightPanel"
    },
    "backgroundElement": {
      "dark": "darkElement",
      "light": "lightElement"
    },
    "border": {
      "dark": "darkBorder",
      "light": "lightBorder"
    },
    "borderActive": {
      "dark": "darkCyan",
      "light": "lightTeal"
    },
    "borderSubtle": {
      "dark": "#0f0f0f",
      "light": "#e0e0e0"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkMuted",
      "light": "lightMuted"
    },
    "diffHunkHeader": {
      "dark": "darkMuted",
      "light": "lightMuted"
    },
    "diffHighlightAdded": {
      "dark": "darkGreenBright",
      "light": "lightGreenBright"
    },
    "diffHighlightRemoved": {
      "dark": "darkRedBright",
      "light": "lightRedBright"
    },
    "diffAddedBg": {
      "dark": "#3fa26633",
      "light": "#1f8a651f"
    },
    "diffRemovedBg": {
      "dark": "#b8004933",
      "light": "#cf2d5614"
    },
    "diffContextBg": {
      "dark": "darkPanel",
      "light": "lightPanel"
    },
    "diffLineNumber": {
      "dark": "#eeeeee87",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "#3fa26633",
      "light": "#1f8a651f"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#b8004933",
      "light": "#cf2d5614"
    },
    "markdownText": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "markdownHeading": {
      "dark": "darkPurple",
      "light": "lightBlueDark"
    },
    "markdownLink": {
      "dark": "darkTeal",
      "light": "lightBlueDark"
    },
    "markdownLinkText": {
      "dark": "darkBlue",
      "light": "lightMuted"
    },
    "markdownCode": {
      "dark": "darkPink",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkMuted",
      "light": "lightMuted"
    },
    "markdownEmph": {
      "dark": "darkTeal",
      "light": "lightFg"
    },
    "markdownStrong": {
      "dark": "darkSyntaxYellow",
      "light": "lightFg"
    },
    "markdownHorizontalRule": {
      "dark": "darkMuted",
      "light": "lightMuted"
    },
    "markdownListItem": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightMuted"
    },
    "markdownImage": {
      "dark": "darkCyan",
      "light": "lightBlueDark"
    },
    "markdownImageText": {
      "dark": "darkBlue",
      "light": "lightMuted"
    },
    "markdownCodeBlock": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxComment": {
      "dark": "darkMuted",
      "light": "lightMuted"
    },
    "syntaxKeyword": {
      "dark": "darkTeal",
      "light": "lightMagenta"
    },
    "syntaxFunction": {
      "dark": "darkSyntaxOrange",
      "light": "lightOrange"
    },
    "syntaxVariable": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxString": {
      "dark": "darkPink",
      "light": "lightPurple"
    },
    "syntaxNumber": {
      "dark": "darkSyntaxYellow",
      "light": "lightPink"
    },
    "syntaxType": {
      "dark": "darkSyntaxOrange",
      "light": "lightBlueDark"
    },
    "syntaxOperator": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxPunctuation": {
      "dark": "darkFg",
      "light": "lightFg"
    }
  }
}
const dracula = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "background": "#282a36",
    "currentLine": "#44475a",
    "selection": "#44475a",
    "foreground": "#f8f8f2",
    "comment": "#6272a4",
    "cyan": "#8be9fd",
    "green": "#50fa7b",
    "orange": "#ffb86c",
    "pink": "#ff79c6",
    "purple": "#bd93f9",
    "red": "#ff5555",
    "yellow": "#f1fa8c"
  },
  "theme": {
    "primary": {
      "dark": "purple",
      "light": "purple"
    },
    "secondary": {
      "dark": "pink",
      "light": "pink"
    },
    "accent": {
      "dark": "cyan",
      "light": "cyan"
    },
    "error": {
      "dark": "red",
      "light": "red"
    },
    "warning": {
      "dark": "yellow",
      "light": "yellow"
    },
    "success": {
      "dark": "green",
      "light": "green"
    },
    "info": {
      "dark": "orange",
      "light": "orange"
    },
    "text": {
      "dark": "foreground",
      "light": "#282a36"
    },
    "textMuted": {
      "dark": "comment",
      "light": "#6272a4"
    },
    "background": {
      "dark": "#282a36",
      "light": "#f8f8f2"
    },
    "backgroundPanel": {
      "dark": "#21222c",
      "light": "#e8e8e2"
    },
    "backgroundElement": {
      "dark": "currentLine",
      "light": "#d8d8d2"
    },
    "border": {
      "dark": "currentLine",
      "light": "#c8c8c2"
    },
    "borderActive": {
      "dark": "purple",
      "light": "purple"
    },
    "borderSubtle": {
      "dark": "#191a21",
      "light": "#e0e0e0"
    },
    "diffAdded": {
      "dark": "green",
      "light": "green"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "red"
    },
    "diffContext": {
      "dark": "comment",
      "light": "#6272a4"
    },
    "diffHunkHeader": {
      "dark": "comment",
      "light": "#6272a4"
    },
    "diffHighlightAdded": {
      "dark": "green",
      "light": "green"
    },
    "diffHighlightRemoved": {
      "dark": "red",
      "light": "red"
    },
    "diffAddedBg": {
      "dark": "#1a3a1a",
      "light": "#e0ffe0"
    },
    "diffRemovedBg": {
      "dark": "#3a1a1a",
      "light": "#ffe0e0"
    },
    "diffContextBg": {
      "dark": "#21222c",
      "light": "#e8e8e2"
    },
    "diffLineNumber": {
      "dark": "#989aa4",
      "light": "#686865"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1a3a1a",
      "light": "#e0ffe0"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3a1a1a",
      "light": "#ffe0e0"
    },
    "markdownText": {
      "dark": "foreground",
      "light": "#282a36"
    },
    "markdownHeading": {
      "dark": "purple",
      "light": "purple"
    },
    "markdownLink": {
      "dark": "cyan",
      "light": "cyan"
    },
    "markdownLinkText": {
      "dark": "pink",
      "light": "pink"
    },
    "markdownCode": {
      "dark": "green",
      "light": "green"
    },
    "markdownBlockQuote": {
      "dark": "comment",
      "light": "#6272a4"
    },
    "markdownEmph": {
      "dark": "yellow",
      "light": "yellow"
    },
    "markdownStrong": {
      "dark": "orange",
      "light": "orange"
    },
    "markdownHorizontalRule": {
      "dark": "comment",
      "light": "#6272a4"
    },
    "markdownListItem": {
      "dark": "purple",
      "light": "purple"
    },
    "markdownListEnumeration": {
      "dark": "cyan",
      "light": "cyan"
    },
    "markdownImage": {
      "dark": "cyan",
      "light": "cyan"
    },
    "markdownImageText": {
      "dark": "pink",
      "light": "pink"
    },
    "markdownCodeBlock": {
      "dark": "foreground",
      "light": "#282a36"
    },
    "syntaxComment": {
      "dark": "comment",
      "light": "#6272a4"
    },
    "syntaxKeyword": {
      "dark": "pink",
      "light": "pink"
    },
    "syntaxFunction": {
      "dark": "green",
      "light": "green"
    },
    "syntaxVariable": {
      "dark": "foreground",
      "light": "#282a36"
    },
    "syntaxString": {
      "dark": "yellow",
      "light": "yellow"
    },
    "syntaxNumber": {
      "dark": "purple",
      "light": "purple"
    },
    "syntaxType": {
      "dark": "cyan",
      "light": "cyan"
    },
    "syntaxOperator": {
      "dark": "pink",
      "light": "pink"
    },
    "syntaxPunctuation": {
      "dark": "foreground",
      "light": "#282a36"
    }
  }
}
const everforest = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "darkStep1": "#2d353b",
    "darkStep2": "#333c43",
    "darkStep3": "#343f44",
    "darkStep4": "#3d484d",
    "darkStep5": "#475258",
    "darkStep6": "#7a8478",
    "darkStep7": "#859289",
    "darkStep8": "#9da9a0",
    "darkStep9": "#a7c080",
    "darkStep10": "#83c092",
    "darkStep11": "#7a8478",
    "darkStep12": "#d3c6aa",
    "darkRed": "#e67e80",
    "darkOrange": "#e69875",
    "darkGreen": "#a7c080",
    "darkCyan": "#83c092",
    "darkYellow": "#dbbc7f",
    "lightStep1": "#fdf6e3",
    "lightStep2": "#efebd4",
    "lightStep3": "#f4f0d9",
    "lightStep4": "#efebd4",
    "lightStep5": "#e6e2cc",
    "lightStep6": "#a6b0a0",
    "lightStep7": "#939f91",
    "lightStep8": "#829181",
    "lightStep9": "#8da101",
    "lightStep10": "#35a77c",
    "lightStep11": "#a6b0a0",
    "lightStep12": "#5c6a72",
    "lightRed": "#f85552",
    "lightOrange": "#f57d26",
    "lightGreen": "#8da101",
    "lightCyan": "#35a77c",
    "lightYellow": "#dfa000"
  },
  "theme": {
    "primary": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "secondary": {
      "dark": "#7fbbb3",
      "light": "#3a94c5"
    },
    "accent": {
      "dark": "#d699b6",
      "light": "#df69ba"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "text": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "textMuted": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "background": {
      "dark": "darkStep1",
      "light": "lightStep1"
    },
    "backgroundPanel": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "backgroundElement": {
      "dark": "darkStep3",
      "light": "lightStep3"
    },
    "border": {
      "dark": "darkStep7",
      "light": "lightStep7"
    },
    "borderActive": {
      "dark": "darkStep8",
      "light": "lightStep8"
    },
    "borderSubtle": {
      "dark": "darkStep6",
      "light": "lightStep6"
    },
    "diffAdded": {
      "dark": "#4fd6be",
      "light": "#1e725c"
    },
    "diffRemoved": {
      "dark": "#c53b53",
      "light": "#c53b53"
    },
    "diffContext": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHunkHeader": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHighlightAdded": {
      "dark": "#b8db87",
      "light": "#4db380"
    },
    "diffHighlightRemoved": {
      "dark": "#e26a75",
      "light": "#f52a65"
    },
    "diffAddedBg": {
      "dark": "#20303b",
      "light": "#d5e5d5"
    },
    "diffRemovedBg": {
      "dark": "#37222c",
      "light": "#f7d8db"
    },
    "diffContextBg": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "diffLineNumber": {
      "dark": "#a0a5a7",
      "light": "#5b5951"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1b2b34",
      "light": "#c5d5c5"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2d1f26",
      "light": "#e7c8cb"
    },
    "markdownText": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "markdownHeading": {
      "dark": "#d699b6",
      "light": "#df69ba"
    },
    "markdownLink": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "markdownListItem": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "syntaxComment": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "syntaxKeyword": {
      "dark": "#d699b6",
      "light": "#df69ba"
    },
    "syntaxFunction": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkStep12",
      "light": "lightStep12"
    }
  }
}
const flexoki = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "black": "#100F0F",
    "base950": "#1C1B1A",
    "base900": "#282726",
    "base850": "#343331",
    "base800": "#403E3C",
    "base700": "#575653",
    "base600": "#6F6E69",
    "base500": "#878580",
    "base300": "#B7B5AC",
    "base200": "#CECDC3",
    "base150": "#DAD8CE",
    "base100": "#E6E4D9",
    "base50": "#F2F0E5",
    "paper": "#FFFCF0",
    "red400": "#D14D41",
    "red600": "#AF3029",
    "orange400": "#DA702C",
    "orange600": "#BC5215",
    "yellow400": "#D0A215",
    "yellow600": "#AD8301",
    "green400": "#879A39",
    "green600": "#66800B",
    "cyan400": "#3AA99F",
    "cyan600": "#24837B",
    "blue400": "#4385BE",
    "blue600": "#205EA6",
    "purple400": "#8B7EC8",
    "purple600": "#5E409D",
    "magenta400": "#CE5D97",
    "magenta600": "#A02F6F"
  },
  "theme": {
    "primary": {
      "dark": "orange400",
      "light": "blue600"
    },
    "secondary": {
      "dark": "blue400",
      "light": "purple600"
    },
    "accent": {
      "dark": "purple400",
      "light": "orange600"
    },
    "error": {
      "dark": "red400",
      "light": "red600"
    },
    "warning": {
      "dark": "orange400",
      "light": "orange600"
    },
    "success": {
      "dark": "green400",
      "light": "green600"
    },
    "info": {
      "dark": "cyan400",
      "light": "cyan600"
    },
    "text": {
      "dark": "base200",
      "light": "black"
    },
    "textMuted": {
      "dark": "base600",
      "light": "base600"
    },
    "background": {
      "dark": "black",
      "light": "paper"
    },
    "backgroundPanel": {
      "dark": "base950",
      "light": "base50"
    },
    "backgroundElement": {
      "dark": "base900",
      "light": "base100"
    },
    "border": {
      "dark": "base700",
      "light": "base300"
    },
    "borderActive": {
      "dark": "base600",
      "light": "base500"
    },
    "borderSubtle": {
      "dark": "base800",
      "light": "base200"
    },
    "diffAdded": {
      "dark": "green400",
      "light": "green600"
    },
    "diffRemoved": {
      "dark": "red400",
      "light": "red600"
    },
    "diffContext": {
      "dark": "base600",
      "light": "base600"
    },
    "diffHunkHeader": {
      "dark": "blue400",
      "light": "blue600"
    },
    "diffHighlightAdded": {
      "dark": "green400",
      "light": "green600"
    },
    "diffHighlightRemoved": {
      "dark": "red400",
      "light": "red600"
    },
    "diffAddedBg": {
      "dark": "#1A2D1A",
      "light": "#D5E5D5"
    },
    "diffRemovedBg": {
      "dark": "#2D1A1A",
      "light": "#F7D8DB"
    },
    "diffContextBg": {
      "dark": "base950",
      "light": "base50"
    },
    "diffLineNumber": {
      "dark": "#888883",
      "light": "#5a5955"
    },
    "diffAddedLineNumberBg": {
      "dark": "#152515",
      "light": "#C5D5C5"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#251515",
      "light": "#E7C8CB"
    },
    "markdownText": {
      "dark": "base200",
      "light": "black"
    },
    "markdownHeading": {
      "dark": "purple400",
      "light": "purple600"
    },
    "markdownLink": {
      "dark": "blue400",
      "light": "blue600"
    },
    "markdownLinkText": {
      "dark": "cyan400",
      "light": "cyan600"
    },
    "markdownCode": {
      "dark": "cyan400",
      "light": "cyan600"
    },
    "markdownBlockQuote": {
      "dark": "yellow400",
      "light": "yellow600"
    },
    "markdownEmph": {
      "dark": "yellow400",
      "light": "yellow600"
    },
    "markdownStrong": {
      "dark": "orange400",
      "light": "orange600"
    },
    "markdownHorizontalRule": {
      "dark": "base600",
      "light": "base600"
    },
    "markdownListItem": {
      "dark": "orange400",
      "light": "orange600"
    },
    "markdownListEnumeration": {
      "dark": "cyan400",
      "light": "cyan600"
    },
    "markdownImage": {
      "dark": "magenta400",
      "light": "magenta600"
    },
    "markdownImageText": {
      "dark": "cyan400",
      "light": "cyan600"
    },
    "markdownCodeBlock": {
      "dark": "base200",
      "light": "black"
    },
    "syntaxComment": {
      "dark": "base600",
      "light": "base600"
    },
    "syntaxKeyword": {
      "dark": "green400",
      "light": "green600"
    },
    "syntaxFunction": {
      "dark": "orange400",
      "light": "orange600"
    },
    "syntaxVariable": {
      "dark": "blue400",
      "light": "blue600"
    },
    "syntaxString": {
      "dark": "cyan400",
      "light": "cyan600"
    },
    "syntaxNumber": {
      "dark": "purple400",
      "light": "purple600"
    },
    "syntaxType": {
      "dark": "yellow400",
      "light": "yellow600"
    },
    "syntaxOperator": {
      "dark": "base300",
      "light": "base600"
    },
    "syntaxPunctuation": {
      "dark": "base300",
      "light": "base600"
    }
  }
}
const github = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "darkBg": "#0d1117",
    "darkBgAlt": "#010409",
    "darkBgPanel": "#161b22",
    "darkFg": "#c9d1d9",
    "darkFgMuted": "#8b949e",
    "darkBlue": "#58a6ff",
    "darkGreen": "#3fb950",
    "darkRed": "#f85149",
    "darkOrange": "#d29922",
    "darkPurple": "#bc8cff",
    "darkPink": "#ff7b72",
    "darkYellow": "#e3b341",
    "darkCyan": "#39c5cf",
    "lightBg": "#ffffff",
    "lightBgAlt": "#f6f8fa",
    "lightBgPanel": "#f0f3f6",
    "lightFg": "#24292f",
    "lightFgMuted": "#57606a",
    "lightBlue": "#0969da",
    "lightGreen": "#1a7f37",
    "lightRed": "#cf222e",
    "lightOrange": "#bc4c00",
    "lightPurple": "#8250df",
    "lightPink": "#bf3989",
    "lightYellow": "#9a6700",
    "lightCyan": "#1b7c83"
  },
  "theme": {
    "primary": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "secondary": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "accent": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "text": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "textMuted": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "background": {
      "dark": "darkBg",
      "light": "lightBg"
    },
    "backgroundPanel": {
      "dark": "darkBgAlt",
      "light": "lightBgAlt"
    },
    "backgroundElement": {
      "dark": "darkBgPanel",
      "light": "lightBgPanel"
    },
    "border": {
      "dark": "#30363d",
      "light": "#d0d7de"
    },
    "borderActive": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "borderSubtle": {
      "dark": "#21262d",
      "light": "#d8dee4"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "diffHunkHeader": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "diffHighlightAdded": {
      "dark": "#3fb950",
      "light": "#1a7f37"
    },
    "diffHighlightRemoved": {
      "dark": "#f85149",
      "light": "#cf222e"
    },
    "diffAddedBg": {
      "dark": "#033a16",
      "light": "#dafbe1"
    },
    "diffRemovedBg": {
      "dark": "#67060c",
      "light": "#ffebe9"
    },
    "diffContextBg": {
      "dark": "darkBgAlt",
      "light": "lightBgAlt"
    },
    "diffLineNumber": {
      "dark": "#95999e",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "#033a16",
      "light": "#dafbe1"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#67060c",
      "light": "#ffebe9"
    },
    "markdownText": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "markdownHeading": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownLink": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkPink",
      "light": "lightPink"
    },
    "markdownBlockQuote": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "#30363d",
      "light": "#d0d7de"
    },
    "markdownListItem": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxComment": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "syntaxKeyword": {
      "dark": "darkPink",
      "light": "lightRed"
    },
    "syntaxFunction": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "syntaxVariable": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxString": {
      "dark": "darkCyan",
      "light": "lightBlue"
    },
    "syntaxNumber": {
      "dark": "darkBlue",
      "light": "lightCyan"
    },
    "syntaxType": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxOperator": {
      "dark": "darkPink",
      "light": "lightRed"
    },
    "syntaxPunctuation": {
      "dark": "darkFg",
      "light": "lightFg"
    }
  }
}
const gruvbox = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "darkBg0": "#282828",
    "darkBg1": "#3c3836",
    "darkBg2": "#504945",
    "darkBg3": "#665c54",
    "darkFg0": "#fbf1c7",
    "darkFg1": "#ebdbb2",
    "darkGray": "#928374",
    "darkRed": "#cc241d",
    "darkGreen": "#98971a",
    "darkYellow": "#d79921",
    "darkBlue": "#458588",
    "darkPurple": "#b16286",
    "darkAqua": "#689d6a",
    "darkOrange": "#d65d0e",
    "darkRedBright": "#fb4934",
    "darkGreenBright": "#b8bb26",
    "darkYellowBright": "#fabd2f",
    "darkBlueBright": "#83a598",
    "darkPurpleBright": "#d3869b",
    "darkAquaBright": "#8ec07c",
    "darkOrangeBright": "#fe8019",
    "lightBg0": "#fbf1c7",
    "lightBg1": "#ebdbb2",
    "lightBg2": "#d5c4a1",
    "lightBg3": "#bdae93",
    "lightFg0": "#282828",
    "lightFg1": "#3c3836",
    "lightGray": "#7c6f64",
    "lightRed": "#9d0006",
    "lightGreen": "#79740e",
    "lightYellow": "#b57614",
    "lightBlue": "#076678",
    "lightPurple": "#8f3f71",
    "lightAqua": "#427b58",
    "lightOrange": "#af3a03"
  },
  "theme": {
    "primary": {
      "dark": "darkBlueBright",
      "light": "lightBlue"
    },
    "secondary": {
      "dark": "darkPurpleBright",
      "light": "lightPurple"
    },
    "accent": {
      "dark": "darkAquaBright",
      "light": "lightAqua"
    },
    "error": {
      "dark": "darkRedBright",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkOrangeBright",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkYellowBright",
      "light": "lightYellow"
    },
    "text": {
      "dark": "darkFg1",
      "light": "lightFg1"
    },
    "textMuted": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "background": {
      "dark": "darkBg0",
      "light": "lightBg0"
    },
    "backgroundPanel": {
      "dark": "darkBg1",
      "light": "lightBg1"
    },
    "backgroundElement": {
      "dark": "darkBg2",
      "light": "lightBg2"
    },
    "border": {
      "dark": "darkBg3",
      "light": "lightBg3"
    },
    "borderActive": {
      "dark": "darkFg1",
      "light": "lightFg1"
    },
    "borderSubtle": {
      "dark": "darkBg2",
      "light": "lightBg2"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "diffHunkHeader": {
      "dark": "darkAqua",
      "light": "lightAqua"
    },
    "diffHighlightAdded": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "diffHighlightRemoved": {
      "dark": "darkRedBright",
      "light": "lightRed"
    },
    "diffAddedBg": {
      "dark": "#32302f",
      "light": "#dcd8a4"
    },
    "diffRemovedBg": {
      "dark": "#322929",
      "light": "#e2c7c3"
    },
    "diffContextBg": {
      "dark": "darkBg1",
      "light": "lightBg1"
    },
    "diffLineNumber": {
      "dark": "#a8a29e",
      "light": "#564f43"
    },
    "diffAddedLineNumberBg": {
      "dark": "#2a2827",
      "light": "#cec99e"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2a2222",
      "light": "#d3bdb9"
    },
    "markdownText": {
      "dark": "darkFg1",
      "light": "lightFg1"
    },
    "markdownHeading": {
      "dark": "darkBlueBright",
      "light": "lightBlue"
    },
    "markdownLink": {
      "dark": "darkAquaBright",
      "light": "lightAqua"
    },
    "markdownLinkText": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "markdownCode": {
      "dark": "darkYellowBright",
      "light": "lightYellow"
    },
    "markdownBlockQuote": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "markdownEmph": {
      "dark": "darkPurpleBright",
      "light": "lightPurple"
    },
    "markdownStrong": {
      "dark": "darkOrangeBright",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "markdownListItem": {
      "dark": "darkBlueBright",
      "light": "lightBlue"
    },
    "markdownListEnumeration": {
      "dark": "darkAquaBright",
      "light": "lightAqua"
    },
    "markdownImage": {
      "dark": "darkAquaBright",
      "light": "lightAqua"
    },
    "markdownImageText": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "markdownCodeBlock": {
      "dark": "darkFg1",
      "light": "lightFg1"
    },
    "syntaxComment": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "syntaxKeyword": {
      "dark": "darkRedBright",
      "light": "lightRed"
    },
    "syntaxFunction": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "syntaxVariable": {
      "dark": "darkBlueBright",
      "light": "lightBlue"
    },
    "syntaxString": {
      "dark": "darkYellowBright",
      "light": "lightYellow"
    },
    "syntaxNumber": {
      "dark": "darkPurpleBright",
      "light": "lightPurple"
    },
    "syntaxType": {
      "dark": "darkAquaBright",
      "light": "lightAqua"
    },
    "syntaxOperator": {
      "dark": "darkOrangeBright",
      "light": "lightOrange"
    },
    "syntaxPunctuation": {
      "dark": "darkFg1",
      "light": "lightFg1"
    }
  }
}
const kanagawa = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "sumiInk0": "#1F1F28",
    "sumiInk1": "#2A2A37",
    "sumiInk2": "#363646",
    "sumiInk3": "#54546D",
    "fujiWhite": "#DCD7BA",
    "oldWhite": "#C8C093",
    "fujiGray": "#727169",
    "oniViolet": "#957FB8",
    "crystalBlue": "#7E9CD8",
    "carpYellow": "#C38D9D",
    "sakuraPink": "#D27E99",
    "waveAqua": "#76946A",
    "roninYellow": "#D7A657",
    "dragonRed": "#E82424",
    "lotusGreen": "#98BB6C",
    "waveBlue": "#2D4F67",
    "lightBg": "#F2E9DE",
    "lightPaper": "#EAE4D7",
    "lightText": "#54433A",
    "lightGray": "#9E9389"
  },
  "theme": {
    "primary": {
      "dark": "crystalBlue",
      "light": "waveBlue"
    },
    "secondary": {
      "dark": "oniViolet",
      "light": "oniViolet"
    },
    "accent": {
      "dark": "sakuraPink",
      "light": "sakuraPink"
    },
    "error": {
      "dark": "dragonRed",
      "light": "dragonRed"
    },
    "warning": {
      "dark": "roninYellow",
      "light": "roninYellow"
    },
    "success": {
      "dark": "lotusGreen",
      "light": "lotusGreen"
    },
    "info": {
      "dark": "waveAqua",
      "light": "waveAqua"
    },
    "text": {
      "dark": "fujiWhite",
      "light": "lightText"
    },
    "textMuted": {
      "dark": "fujiGray",
      "light": "lightGray"
    },
    "background": {
      "dark": "sumiInk0",
      "light": "lightBg"
    },
    "backgroundPanel": {
      "dark": "sumiInk1",
      "light": "lightPaper"
    },
    "backgroundElement": {
      "dark": "sumiInk2",
      "light": "#E3DCD2"
    },
    "border": {
      "dark": "sumiInk3",
      "light": "#D4CBBF"
    },
    "borderActive": {
      "dark": "carpYellow",
      "light": "carpYellow"
    },
    "borderSubtle": {
      "dark": "sumiInk2",
      "light": "#DCD4C9"
    },
    "diffAdded": {
      "dark": "lotusGreen",
      "light": "lotusGreen"
    },
    "diffRemoved": {
      "dark": "dragonRed",
      "light": "dragonRed"
    },
    "diffContext": {
      "dark": "fujiGray",
      "light": "lightGray"
    },
    "diffHunkHeader": {
      "dark": "waveBlue",
      "light": "waveBlue"
    },
    "diffHighlightAdded": {
      "dark": "#A9D977",
      "light": "#89AF5B"
    },
    "diffHighlightRemoved": {
      "dark": "#F24A4A",
      "light": "#D61F1F"
    },
    "diffAddedBg": {
      "dark": "#252E25",
      "light": "#EAF3E4"
    },
    "diffRemovedBg": {
      "dark": "#362020",
      "light": "#FBE6E6"
    },
    "diffContextBg": {
      "dark": "sumiInk1",
      "light": "lightPaper"
    },
    "diffLineNumber": {
      "dark": "#9090a0",
      "light": "#65615c"
    },
    "diffAddedLineNumberBg": {
      "dark": "#202820",
      "light": "#DDE8D6"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2D1C1C",
      "light": "#F2DADA"
    },
    "markdownText": {
      "dark": "fujiWhite",
      "light": "lightText"
    },
    "markdownHeading": {
      "dark": "oniViolet",
      "light": "oniViolet"
    },
    "markdownLink": {
      "dark": "crystalBlue",
      "light": "waveBlue"
    },
    "markdownLinkText": {
      "dark": "waveAqua",
      "light": "waveAqua"
    },
    "markdownCode": {
      "dark": "lotusGreen",
      "light": "lotusGreen"
    },
    "markdownBlockQuote": {
      "dark": "fujiGray",
      "light": "lightGray"
    },
    "markdownEmph": {
      "dark": "carpYellow",
      "light": "carpYellow"
    },
    "markdownStrong": {
      "dark": "roninYellow",
      "light": "roninYellow"
    },
    "markdownHorizontalRule": {
      "dark": "fujiGray",
      "light": "lightGray"
    },
    "markdownListItem": {
      "dark": "crystalBlue",
      "light": "waveBlue"
    },
    "markdownListEnumeration": {
      "dark": "waveAqua",
      "light": "waveAqua"
    },
    "markdownImage": {
      "dark": "crystalBlue",
      "light": "waveBlue"
    },
    "markdownImageText": {
      "dark": "waveAqua",
      "light": "waveAqua"
    },
    "markdownCodeBlock": {
      "dark": "fujiWhite",
      "light": "lightText"
    },
    "syntaxComment": {
      "dark": "fujiGray",
      "light": "lightGray"
    },
    "syntaxKeyword": {
      "dark": "oniViolet",
      "light": "oniViolet"
    },
    "syntaxFunction": {
      "dark": "crystalBlue",
      "light": "waveBlue"
    },
    "syntaxVariable": {
      "dark": "fujiWhite",
      "light": "lightText"
    },
    "syntaxString": {
      "dark": "lotusGreen",
      "light": "lotusGreen"
    },
    "syntaxNumber": {
      "dark": "roninYellow",
      "light": "roninYellow"
    },
    "syntaxType": {
      "dark": "carpYellow",
      "light": "carpYellow"
    },
    "syntaxOperator": {
      "dark": "sakuraPink",
      "light": "sakuraPink"
    },
    "syntaxPunctuation": {
      "dark": "fujiWhite",
      "light": "lightText"
    }
  }
}
const lucent_orng = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "darkStep6": "#3c3c3c",
    "darkStep11": "#808080",
    "darkStep12": "#eeeeee",
    "darkSecondary": "#EE7948",
    "darkAccent": "#FFF7F1",
    "darkRed": "#e06c75",
    "darkOrange": "#EC5B2B",
    "darkBlue": "#6ba1e6",
    "darkCyan": "#56b6c2",
    "darkYellow": "#e5c07b",
    "darkPanelBg": "#2a1a1599",
    "lightStep6": "#d4d4d4",
    "lightStep11": "#8a8a8a",
    "lightStep12": "#1a1a1a",
    "lightSecondary": "#EE7948",
    "lightAccent": "#c94d24",
    "lightRed": "#d1383d",
    "lightOrange": "#EC5B2B",
    "lightBlue": "#0062d1",
    "lightCyan": "#318795",
    "lightYellow": "#b0851f",
    "lightPanelBg": "#fff5f099"
  },
  "theme": {
    "primary": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "secondary": {
      "dark": "darkSecondary",
      "light": "lightSecondary"
    },
    "accent": {
      "dark": "darkAccent",
      "light": "lightAccent"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "info": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "text": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "textMuted": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "selectedListItemText": {
      "dark": "#0a0a0a",
      "light": "#ffffff"
    },
    "background": {
      "dark": "transparent",
      "light": "transparent"
    },
    "backgroundPanel": {
      "dark": "transparent",
      "light": "transparent"
    },
    "backgroundElement": {
      "dark": "transparent",
      "light": "transparent"
    },
    "backgroundMenu": {
      "dark": "darkPanelBg",
      "light": "lightPanelBg"
    },
    "border": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "borderActive": {
      "dark": "darkSecondary",
      "light": "lightAccent"
    },
    "borderSubtle": {
      "dark": "darkStep6",
      "light": "lightStep6"
    },
    "diffAdded": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "diffRemoved": {
      "dark": "#c53b53",
      "light": "#c53b53"
    },
    "diffContext": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHunkHeader": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHighlightAdded": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "diffHighlightRemoved": {
      "dark": "#e26a75",
      "light": "#f52a65"
    },
    "diffAddedBg": {
      "dark": "transparent",
      "light": "transparent"
    },
    "diffRemovedBg": {
      "dark": "transparent",
      "light": "transparent"
    },
    "diffContextBg": {
      "dark": "transparent",
      "light": "transparent"
    },
    "diffLineNumber": "textMuted",
    "diffAddedLineNumberBg": {
      "dark": "transparent",
      "light": "transparent"
    },
    "diffRemovedLineNumberBg": {
      "dark": "transparent",
      "light": "transparent"
    },
    "markdownText": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "markdownHeading": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownLink": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownBlockQuote": {
      "dark": "darkAccent",
      "light": "lightYellow"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkSecondary",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "markdownListItem": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "syntaxComment": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "syntaxKeyword": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxFunction": {
      "dark": "darkSecondary",
      "light": "lightAccent"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "syntaxNumber": {
      "dark": "darkAccent",
      "light": "lightOrange"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkStep12",
      "light": "lightStep12"
    }
  }
}
const material = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "darkBg": "#263238",
    "darkBgAlt": "#1e272c",
    "darkBgPanel": "#37474f",
    "darkFg": "#eeffff",
    "darkFgMuted": "#546e7a",
    "darkRed": "#f07178",
    "darkPink": "#f78c6c",
    "darkOrange": "#ffcb6b",
    "darkYellow": "#ffcb6b",
    "darkGreen": "#c3e88d",
    "darkCyan": "#89ddff",
    "darkBlue": "#82aaff",
    "darkPurple": "#c792ea",
    "darkViolet": "#bb80b3",
    "lightBg": "#fafafa",
    "lightBgAlt": "#f5f5f5",
    "lightBgPanel": "#e7e7e8",
    "lightFg": "#263238",
    "lightFgMuted": "#90a4ae",
    "lightRed": "#e53935",
    "lightPink": "#ec407a",
    "lightOrange": "#f4511e",
    "lightYellow": "#ffb300",
    "lightGreen": "#91b859",
    "lightCyan": "#39adb5",
    "lightBlue": "#6182b8",
    "lightPurple": "#7c4dff",
    "lightViolet": "#945eb8"
  },
  "theme": {
    "primary": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "secondary": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "accent": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "text": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "textMuted": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "background": {
      "dark": "darkBg",
      "light": "lightBg"
    },
    "backgroundPanel": {
      "dark": "darkBgAlt",
      "light": "lightBgAlt"
    },
    "backgroundElement": {
      "dark": "darkBgPanel",
      "light": "lightBgPanel"
    },
    "border": {
      "dark": "#37474f",
      "light": "#e0e0e0"
    },
    "borderActive": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "borderSubtle": {
      "dark": "#1e272c",
      "light": "#eeeeee"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "diffHunkHeader": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "diffHighlightAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffHighlightRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffAddedBg": {
      "dark": "#2e3c2b",
      "light": "#e8f5e9"
    },
    "diffRemovedBg": {
      "dark": "#3c2b2b",
      "light": "#ffebee"
    },
    "diffContextBg": {
      "dark": "darkBgAlt",
      "light": "lightBgAlt"
    },
    "diffLineNumber": {
      "dark": "#9aa2a6",
      "light": "#6a6e70"
    },
    "diffAddedLineNumberBg": {
      "dark": "#2e3c2b",
      "light": "#e8f5e9"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3c2b2b",
      "light": "#ffebee"
    },
    "markdownText": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "markdownHeading": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownLink": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownLinkText": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "markdownCode": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "#37474f",
      "light": "#e0e0e0"
    },
    "markdownListItem": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImageText": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "markdownCodeBlock": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxComment": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "syntaxKeyword": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "syntaxFunction": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "syntaxVariable": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxString": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkFg",
      "light": "lightFg"
    }
  }
}
const matrix = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "matrixInk0": "#0a0e0a",
    "matrixInk1": "#0e130d",
    "matrixInk2": "#141c12",
    "matrixInk3": "#1e2a1b",
    "rainGreen": "#2eff6a",
    "rainGreenDim": "#1cc24b",
    "rainGreenHi": "#62ff94",
    "rainCyan": "#00efff",
    "rainTeal": "#24f6d9",
    "rainPurple": "#c770ff",
    "rainOrange": "#ffa83d",
    "alertRed": "#ff4b4b",
    "alertYellow": "#e6ff57",
    "alertBlue": "#30b3ff",
    "rainGray": "#8ca391",
    "lightBg": "#eef3ea",
    "lightPaper": "#e4ebe1",
    "lightInk1": "#dae1d7",
    "lightText": "#203022",
    "lightGray": "#748476"
  },
  "theme": {
    "primary": {
      "dark": "rainGreen",
      "light": "rainGreenDim"
    },
    "secondary": {
      "dark": "rainCyan",
      "light": "rainTeal"
    },
    "accent": {
      "dark": "rainPurple",
      "light": "rainPurple"
    },
    "error": {
      "dark": "alertRed",
      "light": "alertRed"
    },
    "warning": {
      "dark": "alertYellow",
      "light": "alertYellow"
    },
    "success": {
      "dark": "rainGreenHi",
      "light": "rainGreenDim"
    },
    "info": {
      "dark": "alertBlue",
      "light": "alertBlue"
    },
    "text": {
      "dark": "rainGreenHi",
      "light": "lightText"
    },
    "textMuted": {
      "dark": "rainGray",
      "light": "lightGray"
    },
    "background": {
      "dark": "matrixInk0",
      "light": "lightBg"
    },
    "backgroundPanel": {
      "dark": "matrixInk1",
      "light": "lightPaper"
    },
    "backgroundElement": {
      "dark": "matrixInk2",
      "light": "lightInk1"
    },
    "border": {
      "dark": "matrixInk3",
      "light": "lightGray"
    },
    "borderActive": {
      "dark": "rainGreen",
      "light": "rainGreenDim"
    },
    "borderSubtle": {
      "dark": "matrixInk2",
      "light": "lightInk1"
    },
    "diffAdded": {
      "dark": "rainGreenDim",
      "light": "rainGreenDim"
    },
    "diffRemoved": {
      "dark": "alertRed",
      "light": "alertRed"
    },
    "diffContext": {
      "dark": "rainGray",
      "light": "lightGray"
    },
    "diffHunkHeader": {
      "dark": "alertBlue",
      "light": "alertBlue"
    },
    "diffHighlightAdded": {
      "dark": "#77ffaf",
      "light": "#5dac7e"
    },
    "diffHighlightRemoved": {
      "dark": "#ff7171",
      "light": "#d53a3a"
    },
    "diffAddedBg": {
      "dark": "#132616",
      "light": "#e0efde"
    },
    "diffRemovedBg": {
      "dark": "#261212",
      "light": "#f9e5e5"
    },
    "diffContextBg": {
      "dark": "matrixInk1",
      "light": "lightPaper"
    },
    "diffLineNumber": {
      "dark": "textMuted",
      "light": "#556156"
    },
    "diffAddedLineNumberBg": {
      "dark": "#0f1b11",
      "light": "#d6e7d2"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#1b1414",
      "light": "#f2d2d2"
    },
    "markdownText": {
      "dark": "rainGreenHi",
      "light": "lightText"
    },
    "markdownHeading": {
      "dark": "rainCyan",
      "light": "rainTeal"
    },
    "markdownLink": {
      "dark": "alertBlue",
      "light": "alertBlue"
    },
    "markdownLinkText": {
      "dark": "rainTeal",
      "light": "rainTeal"
    },
    "markdownCode": {
      "dark": "rainGreenDim",
      "light": "rainGreenDim"
    },
    "markdownBlockQuote": {
      "dark": "rainGray",
      "light": "lightGray"
    },
    "markdownEmph": {
      "dark": "rainOrange",
      "light": "rainOrange"
    },
    "markdownStrong": {
      "dark": "alertYellow",
      "light": "alertYellow"
    },
    "markdownHorizontalRule": {
      "dark": "rainGray",
      "light": "lightGray"
    },
    "markdownListItem": {
      "dark": "alertBlue",
      "light": "alertBlue"
    },
    "markdownListEnumeration": {
      "dark": "rainTeal",
      "light": "rainTeal"
    },
    "markdownImage": {
      "dark": "alertBlue",
      "light": "alertBlue"
    },
    "markdownImageText": {
      "dark": "rainTeal",
      "light": "rainTeal"
    },
    "markdownCodeBlock": {
      "dark": "rainGreenHi",
      "light": "lightText"
    },
    "syntaxComment": {
      "dark": "rainGray",
      "light": "lightGray"
    },
    "syntaxKeyword": {
      "dark": "rainPurple",
      "light": "rainPurple"
    },
    "syntaxFunction": {
      "dark": "alertBlue",
      "light": "alertBlue"
    },
    "syntaxVariable": {
      "dark": "rainGreenHi",
      "light": "lightText"
    },
    "syntaxString": {
      "dark": "rainGreenDim",
      "light": "rainGreenDim"
    },
    "syntaxNumber": {
      "dark": "rainOrange",
      "light": "rainOrange"
    },
    "syntaxType": {
      "dark": "alertYellow",
      "light": "alertYellow"
    },
    "syntaxOperator": {
      "dark": "rainTeal",
      "light": "rainTeal"
    },
    "syntaxPunctuation": {
      "dark": "rainGreenHi",
      "light": "lightText"
    }
  }
}
const mercury = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "purple-800": "#3442a6",
    "purple-700": "#465bd1",
    "purple-600": "#5266eb",
    "purple-400": "#8da4f5",
    "purple-300": "#a7b6f8",
    "red-700": "#b0175f",
    "red-600": "#d03275",
    "red-400": "#fc92b4",
    "green-700": "#036e43",
    "green-600": "#188554",
    "green-400": "#77c599",
    "orange-700": "#a44200",
    "orange-600": "#c45000",
    "orange-400": "#fc9b6f",
    "blue-600": "#007f95",
    "blue-400": "#77becf",
    "neutral-1000": "#10101a",
    "neutral-950": "#171721",
    "neutral-900": "#1e1e2a",
    "neutral-800": "#272735",
    "neutral-700": "#363644",
    "neutral-600": "#535461",
    "neutral-500": "#70707d",
    "neutral-400": "#9d9da8",
    "neutral-300": "#c3c3cc",
    "neutral-200": "#dddde5",
    "neutral-100": "#f4f5f9",
    "neutral-050": "#fbfcfd",
    "neutral-000": "#ffffff",
    "neutral-150": "#ededf3",
    "border-light": "#7073931a",
    "border-light-subtle": "#7073930f",
    "border-dark": "#b4b7c81f",
    "border-dark-subtle": "#b4b7c814",
    "diff-added-light": "#1885541a",
    "diff-removed-light": "#d032751a",
    "diff-added-dark": "#77c59933",
    "diff-removed-dark": "#fc92b433"
  },
  "theme": {
    "primary": {
      "light": "purple-600",
      "dark": "purple-400"
    },
    "secondary": {
      "light": "purple-700",
      "dark": "purple-300"
    },
    "accent": {
      "light": "purple-400",
      "dark": "purple-400"
    },
    "error": {
      "light": "red-700",
      "dark": "red-400"
    },
    "warning": {
      "light": "orange-700",
      "dark": "orange-400"
    },
    "success": {
      "light": "green-700",
      "dark": "green-400"
    },
    "info": {
      "light": "blue-600",
      "dark": "blue-400"
    },
    "text": {
      "light": "neutral-700",
      "dark": "neutral-200"
    },
    "textMuted": {
      "light": "neutral-500",
      "dark": "neutral-400"
    },
    "background": {
      "light": "neutral-000",
      "dark": "neutral-950"
    },
    "backgroundPanel": {
      "light": "neutral-050",
      "dark": "neutral-1000"
    },
    "backgroundElement": {
      "light": "neutral-100",
      "dark": "neutral-800"
    },
    "border": {
      "light": "border-light",
      "dark": "border-dark"
    },
    "borderActive": {
      "light": "purple-600",
      "dark": "purple-400"
    },
    "borderSubtle": {
      "light": "border-light-subtle",
      "dark": "border-dark-subtle"
    },
    "diffAdded": {
      "light": "green-700",
      "dark": "green-400"
    },
    "diffRemoved": {
      "light": "red-700",
      "dark": "red-400"
    },
    "diffContext": {
      "light": "neutral-500",
      "dark": "neutral-400"
    },
    "diffHunkHeader": {
      "light": "neutral-500",
      "dark": "neutral-400"
    },
    "diffHighlightAdded": {
      "light": "green-700",
      "dark": "green-400"
    },
    "diffHighlightRemoved": {
      "light": "red-700",
      "dark": "red-400"
    },
    "diffAddedBg": {
      "light": "diff-added-light",
      "dark": "diff-added-dark"
    },
    "diffRemovedBg": {
      "light": "diff-removed-light",
      "dark": "diff-removed-dark"
    },
    "diffContextBg": {
      "light": "neutral-050",
      "dark": "neutral-900"
    },
    "diffLineNumber": {
      "light": "neutral-600",
      "dark": "neutral-300"
    },
    "diffAddedLineNumberBg": {
      "light": "diff-added-light",
      "dark": "diff-added-dark"
    },
    "diffRemovedLineNumberBg": {
      "light": "diff-removed-light",
      "dark": "diff-removed-dark"
    },
    "markdownText": {
      "light": "neutral-700",
      "dark": "neutral-200"
    },
    "markdownHeading": {
      "light": "neutral-900",
      "dark": "neutral-000"
    },
    "markdownLink": {
      "light": "purple-700",
      "dark": "purple-400"
    },
    "markdownLinkText": {
      "light": "purple-600",
      "dark": "purple-300"
    },
    "markdownCode": {
      "light": "green-700",
      "dark": "green-400"
    },
    "markdownBlockQuote": {
      "light": "neutral-500",
      "dark": "neutral-400"
    },
    "markdownEmph": {
      "light": "orange-700",
      "dark": "orange-400"
    },
    "markdownStrong": {
      "light": "neutral-900",
      "dark": "neutral-100"
    },
    "markdownHorizontalRule": {
      "light": "border-light",
      "dark": "border-dark"
    },
    "markdownListItem": {
      "light": "neutral-900",
      "dark": "neutral-000"
    },
    "markdownListEnumeration": {
      "light": "purple-600",
      "dark": "purple-400"
    },
    "markdownImage": {
      "light": "purple-700",
      "dark": "purple-400"
    },
    "markdownImageText": {
      "light": "purple-600",
      "dark": "purple-300"
    },
    "markdownCodeBlock": {
      "light": "neutral-700",
      "dark": "neutral-200"
    },
    "syntaxComment": {
      "light": "neutral-500",
      "dark": "neutral-400"
    },
    "syntaxKeyword": {
      "light": "purple-700",
      "dark": "purple-400"
    },
    "syntaxFunction": {
      "light": "purple-600",
      "dark": "purple-400"
    },
    "syntaxVariable": {
      "light": "blue-600",
      "dark": "blue-400"
    },
    "syntaxString": {
      "light": "green-700",
      "dark": "green-400"
    },
    "syntaxNumber": {
      "light": "orange-700",
      "dark": "orange-400"
    },
    "syntaxType": {
      "light": "blue-600",
      "dark": "blue-400"
    },
    "syntaxOperator": {
      "light": "purple-700",
      "dark": "purple-400"
    },
    "syntaxPunctuation": {
      "light": "neutral-700",
      "dark": "neutral-200"
    }
  }
}
const monokai = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "background": "#272822",
    "backgroundAlt": "#1e1f1c",
    "backgroundPanel": "#3e3d32",
    "foreground": "#f8f8f2",
    "comment": "#75715e",
    "red": "#f92672",
    "orange": "#fd971f",
    "lightOrange": "#e69f66",
    "yellow": "#e6db74",
    "green": "#a6e22e",
    "cyan": "#66d9ef",
    "blue": "#66d9ef",
    "purple": "#ae81ff",
    "pink": "#f92672"
  },
  "theme": {
    "primary": {
      "dark": "cyan",
      "light": "blue"
    },
    "secondary": {
      "dark": "purple",
      "light": "purple"
    },
    "accent": {
      "dark": "green",
      "light": "green"
    },
    "error": {
      "dark": "red",
      "light": "red"
    },
    "warning": {
      "dark": "yellow",
      "light": "orange"
    },
    "success": {
      "dark": "green",
      "light": "green"
    },
    "info": {
      "dark": "orange",
      "light": "orange"
    },
    "text": {
      "dark": "foreground",
      "light": "#272822"
    },
    "textMuted": {
      "dark": "comment",
      "light": "#75715e"
    },
    "background": {
      "dark": "#272822",
      "light": "#fafafa"
    },
    "backgroundPanel": {
      "dark": "#1e1f1c",
      "light": "#f0f0f0"
    },
    "backgroundElement": {
      "dark": "#3e3d32",
      "light": "#e0e0e0"
    },
    "border": {
      "dark": "#3e3d32",
      "light": "#d0d0d0"
    },
    "borderActive": {
      "dark": "cyan",
      "light": "blue"
    },
    "borderSubtle": {
      "dark": "#1e1f1c",
      "light": "#e8e8e8"
    },
    "diffAdded": {
      "dark": "green",
      "light": "green"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "red"
    },
    "diffContext": {
      "dark": "comment",
      "light": "#75715e"
    },
    "diffHunkHeader": {
      "dark": "comment",
      "light": "#75715e"
    },
    "diffHighlightAdded": {
      "dark": "green",
      "light": "green"
    },
    "diffHighlightRemoved": {
      "dark": "red",
      "light": "red"
    },
    "diffAddedBg": {
      "dark": "#1a3a1a",
      "light": "#e0ffe0"
    },
    "diffRemovedBg": {
      "dark": "#3a1a1a",
      "light": "#ffe0e0"
    },
    "diffContextBg": {
      "dark": "#1e1f1c",
      "light": "#f0f0f0"
    },
    "diffLineNumber": {
      "dark": "#9b9b95",
      "light": "#686868"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1a3a1a",
      "light": "#e0ffe0"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3a1a1a",
      "light": "#ffe0e0"
    },
    "markdownText": {
      "dark": "foreground",
      "light": "#272822"
    },
    "markdownHeading": {
      "dark": "pink",
      "light": "pink"
    },
    "markdownLink": {
      "dark": "cyan",
      "light": "blue"
    },
    "markdownLinkText": {
      "dark": "purple",
      "light": "purple"
    },
    "markdownCode": {
      "dark": "green",
      "light": "green"
    },
    "markdownBlockQuote": {
      "dark": "comment",
      "light": "#75715e"
    },
    "markdownEmph": {
      "dark": "yellow",
      "light": "orange"
    },
    "markdownStrong": {
      "dark": "orange",
      "light": "orange"
    },
    "markdownHorizontalRule": {
      "dark": "comment",
      "light": "#75715e"
    },
    "markdownListItem": {
      "dark": "cyan",
      "light": "blue"
    },
    "markdownListEnumeration": {
      "dark": "purple",
      "light": "purple"
    },
    "markdownImage": {
      "dark": "cyan",
      "light": "blue"
    },
    "markdownImageText": {
      "dark": "purple",
      "light": "purple"
    },
    "markdownCodeBlock": {
      "dark": "foreground",
      "light": "#272822"
    },
    "syntaxComment": {
      "dark": "comment",
      "light": "#75715e"
    },
    "syntaxKeyword": {
      "dark": "pink",
      "light": "pink"
    },
    "syntaxFunction": {
      "dark": "green",
      "light": "green"
    },
    "syntaxVariable": {
      "dark": "foreground",
      "light": "#272822"
    },
    "syntaxString": {
      "dark": "yellow",
      "light": "orange"
    },
    "syntaxNumber": {
      "dark": "purple",
      "light": "purple"
    },
    "syntaxType": {
      "dark": "cyan",
      "light": "blue"
    },
    "syntaxOperator": {
      "dark": "pink",
      "light": "pink"
    },
    "syntaxPunctuation": {
      "dark": "foreground",
      "light": "#272822"
    }
  }
}
const nightowl = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "nightOwlBg": "#011627",
    "nightOwlFg": "#d6deeb",
    "nightOwlBlue": "#82AAFF",
    "nightOwlCyan": "#7fdbca",
    "nightOwlGreen": "#c5e478",
    "nightOwlYellow": "#ecc48d",
    "nightOwlOrange": "#F78C6C",
    "nightOwlRed": "#EF5350",
    "nightOwlPink": "#ff5874",
    "nightOwlPurple": "#c792ea",
    "nightOwlMuted": "#5f7e97",
    "nightOwlGray": "#637777",
    "nightOwlLightGray": "#89a4bb",
    "nightOwlPanel": "#0b253a"
  },
  "theme": {
    "primary": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "secondary": {
      "dark": "nightOwlCyan",
      "light": "nightOwlCyan"
    },
    "accent": {
      "dark": "nightOwlPurple",
      "light": "nightOwlPurple"
    },
    "error": {
      "dark": "nightOwlRed",
      "light": "nightOwlRed"
    },
    "warning": {
      "dark": "nightOwlYellow",
      "light": "nightOwlYellow"
    },
    "success": {
      "dark": "nightOwlGreen",
      "light": "nightOwlGreen"
    },
    "info": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "text": {
      "dark": "nightOwlFg",
      "light": "nightOwlFg"
    },
    "textMuted": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "background": {
      "dark": "nightOwlBg",
      "light": "nightOwlBg"
    },
    "backgroundPanel": {
      "dark": "nightOwlPanel",
      "light": "nightOwlPanel"
    },
    "backgroundElement": {
      "dark": "nightOwlPanel",
      "light": "nightOwlPanel"
    },
    "border": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "borderActive": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "borderSubtle": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "diffAdded": {
      "dark": "nightOwlGreen",
      "light": "nightOwlGreen"
    },
    "diffRemoved": {
      "dark": "nightOwlRed",
      "light": "nightOwlRed"
    },
    "diffContext": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "diffHunkHeader": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "diffHighlightAdded": {
      "dark": "nightOwlGreen",
      "light": "nightOwlGreen"
    },
    "diffHighlightRemoved": {
      "dark": "nightOwlRed",
      "light": "nightOwlRed"
    },
    "diffAddedBg": {
      "dark": "#0a2e1a",
      "light": "#0a2e1a"
    },
    "diffRemovedBg": {
      "dark": "#2d1b1b",
      "light": "#2d1b1b"
    },
    "diffContextBg": {
      "dark": "nightOwlPanel",
      "light": "nightOwlPanel"
    },
    "diffLineNumber": {
      "dark": "#7791a6",
      "light": "#7791a6"
    },
    "diffAddedLineNumberBg": {
      "dark": "#0a2e1a",
      "light": "#0a2e1a"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2d1b1b",
      "light": "#2d1b1b"
    },
    "markdownText": {
      "dark": "nightOwlFg",
      "light": "nightOwlFg"
    },
    "markdownHeading": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "markdownLink": {
      "dark": "nightOwlCyan",
      "light": "nightOwlCyan"
    },
    "markdownLinkText": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "markdownCode": {
      "dark": "nightOwlGreen",
      "light": "nightOwlGreen"
    },
    "markdownBlockQuote": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "markdownEmph": {
      "dark": "nightOwlPurple",
      "light": "nightOwlPurple"
    },
    "markdownStrong": {
      "dark": "nightOwlYellow",
      "light": "nightOwlYellow"
    },
    "markdownHorizontalRule": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "markdownListItem": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "markdownListEnumeration": {
      "dark": "nightOwlCyan",
      "light": "nightOwlCyan"
    },
    "markdownImage": {
      "dark": "nightOwlCyan",
      "light": "nightOwlCyan"
    },
    "markdownImageText": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "markdownCodeBlock": {
      "dark": "nightOwlFg",
      "light": "nightOwlFg"
    },
    "syntaxComment": {
      "dark": "nightOwlGray",
      "light": "nightOwlGray"
    },
    "syntaxKeyword": {
      "dark": "nightOwlPurple",
      "light": "nightOwlPurple"
    },
    "syntaxFunction": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "syntaxVariable": {
      "dark": "nightOwlFg",
      "light": "nightOwlFg"
    },
    "syntaxString": {
      "dark": "nightOwlYellow",
      "light": "nightOwlYellow"
    },
    "syntaxNumber": {
      "dark": "nightOwlOrange",
      "light": "nightOwlOrange"
    },
    "syntaxType": {
      "dark": "nightOwlGreen",
      "light": "nightOwlGreen"
    },
    "syntaxOperator": {
      "dark": "nightOwlCyan",
      "light": "nightOwlCyan"
    },
    "syntaxPunctuation": {
      "dark": "nightOwlFg",
      "light": "nightOwlFg"
    }
  }
}
const nord = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "nord0": "#2E3440",
    "nord1": "#3B4252",
    "nord2": "#434C5E",
    "nord3": "#4C566A",
    "nord4": "#D8DEE9",
    "nord5": "#E5E9F0",
    "nord6": "#ECEFF4",
    "nord7": "#8FBCBB",
    "nord8": "#88C0D0",
    "nord9": "#81A1C1",
    "nord10": "#5E81AC",
    "nord11": "#BF616A",
    "nord12": "#D08770",
    "nord13": "#EBCB8B",
    "nord14": "#A3BE8C",
    "nord15": "#B48EAD"
  },
  "theme": {
    "primary": {
      "dark": "nord8",
      "light": "nord10"
    },
    "secondary": {
      "dark": "nord9",
      "light": "nord9"
    },
    "accent": {
      "dark": "nord7",
      "light": "nord7"
    },
    "error": {
      "dark": "nord11",
      "light": "nord11"
    },
    "warning": {
      "dark": "nord12",
      "light": "nord12"
    },
    "success": {
      "dark": "nord14",
      "light": "nord14"
    },
    "info": {
      "dark": "nord8",
      "light": "nord10"
    },
    "text": {
      "dark": "nord6",
      "light": "nord0"
    },
    "textMuted": {
      "dark": "#8B95A7",
      "light": "nord1"
    },
    "background": {
      "dark": "nord0",
      "light": "nord6"
    },
    "backgroundPanel": {
      "dark": "nord1",
      "light": "nord5"
    },
    "backgroundElement": {
      "dark": "nord2",
      "light": "nord4"
    },
    "border": {
      "dark": "nord2",
      "light": "nord3"
    },
    "borderActive": {
      "dark": "nord3",
      "light": "nord2"
    },
    "borderSubtle": {
      "dark": "nord2",
      "light": "nord3"
    },
    "diffAdded": {
      "dark": "nord14",
      "light": "nord14"
    },
    "diffRemoved": {
      "dark": "nord11",
      "light": "nord11"
    },
    "diffContext": {
      "dark": "#8B95A7",
      "light": "nord3"
    },
    "diffHunkHeader": {
      "dark": "#8B95A7",
      "light": "nord3"
    },
    "diffHighlightAdded": {
      "dark": "nord14",
      "light": "nord14"
    },
    "diffHighlightRemoved": {
      "dark": "nord11",
      "light": "nord11"
    },
    "diffAddedBg": {
      "dark": "#3B4252",
      "light": "#E5E9F0"
    },
    "diffRemovedBg": {
      "dark": "#3B4252",
      "light": "#E5E9F0"
    },
    "diffContextBg": {
      "dark": "nord1",
      "light": "nord5"
    },
    "diffLineNumber": {
      "dark": "#a9aeb6",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "#3B4252",
      "light": "#E5E9F0"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3B4252",
      "light": "#E5E9F0"
    },
    "markdownText": {
      "dark": "nord4",
      "light": "nord0"
    },
    "markdownHeading": {
      "dark": "nord8",
      "light": "nord10"
    },
    "markdownLink": {
      "dark": "nord9",
      "light": "nord9"
    },
    "markdownLinkText": {
      "dark": "nord7",
      "light": "nord7"
    },
    "markdownCode": {
      "dark": "nord14",
      "light": "nord14"
    },
    "markdownBlockQuote": {
      "dark": "#8B95A7",
      "light": "nord3"
    },
    "markdownEmph": {
      "dark": "nord12",
      "light": "nord12"
    },
    "markdownStrong": {
      "dark": "nord13",
      "light": "nord13"
    },
    "markdownHorizontalRule": {
      "dark": "#8B95A7",
      "light": "nord3"
    },
    "markdownListItem": {
      "dark": "nord8",
      "light": "nord10"
    },
    "markdownListEnumeration": {
      "dark": "nord7",
      "light": "nord7"
    },
    "markdownImage": {
      "dark": "nord9",
      "light": "nord9"
    },
    "markdownImageText": {
      "dark": "nord7",
      "light": "nord7"
    },
    "markdownCodeBlock": {
      "dark": "nord4",
      "light": "nord0"
    },
    "syntaxComment": {
      "dark": "#8B95A7",
      "light": "nord3"
    },
    "syntaxKeyword": {
      "dark": "nord9",
      "light": "nord9"
    },
    "syntaxFunction": {
      "dark": "nord8",
      "light": "nord8"
    },
    "syntaxVariable": {
      "dark": "nord7",
      "light": "nord7"
    },
    "syntaxString": {
      "dark": "nord14",
      "light": "nord14"
    },
    "syntaxNumber": {
      "dark": "nord15",
      "light": "nord15"
    },
    "syntaxType": {
      "dark": "nord7",
      "light": "nord7"
    },
    "syntaxOperator": {
      "dark": "nord9",
      "light": "nord9"
    },
    "syntaxPunctuation": {
      "dark": "nord4",
      "light": "nord0"
    }
  }
}
const one_dark = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "darkBg": "#282c34",
    "darkBgAlt": "#21252b",
    "darkBgPanel": "#353b45",
    "darkFg": "#abb2bf",
    "darkFgMuted": "#5c6370",
    "darkPurple": "#c678dd",
    "darkBlue": "#61afef",
    "darkRed": "#e06c75",
    "darkGreen": "#98c379",
    "darkYellow": "#e5c07b",
    "darkOrange": "#d19a66",
    "darkCyan": "#56b6c2",
    "lightBg": "#fafafa",
    "lightBgAlt": "#f0f0f1",
    "lightBgPanel": "#eaeaeb",
    "lightFg": "#383a42",
    "lightFgMuted": "#a0a1a7",
    "lightPurple": "#a626a4",
    "lightBlue": "#4078f2",
    "lightRed": "#e45649",
    "lightGreen": "#50a14f",
    "lightYellow": "#c18401",
    "lightOrange": "#986801",
    "lightCyan": "#0184bc"
  },
  "theme": {
    "primary": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "secondary": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "accent": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "text": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "textMuted": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "background": {
      "dark": "darkBg",
      "light": "lightBg"
    },
    "backgroundPanel": {
      "dark": "darkBgAlt",
      "light": "lightBgAlt"
    },
    "backgroundElement": {
      "dark": "darkBgPanel",
      "light": "lightBgPanel"
    },
    "border": {
      "dark": "#393f4a",
      "light": "#d1d1d2"
    },
    "borderActive": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "borderSubtle": {
      "dark": "#2c313a",
      "light": "#e0e0e1"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "diffHunkHeader": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "diffHighlightAdded": {
      "dark": "#aad482",
      "light": "#489447"
    },
    "diffHighlightRemoved": {
      "dark": "#e8828b",
      "light": "#d65145"
    },
    "diffAddedBg": {
      "dark": "#2c382b",
      "light": "#eafbe9"
    },
    "diffRemovedBg": {
      "dark": "#3a2d2f",
      "light": "#fce9e8"
    },
    "diffContextBg": {
      "dark": "darkBgAlt",
      "light": "lightBgAlt"
    },
    "diffLineNumber": {
      "dark": "#9398a2",
      "light": "#666666"
    },
    "diffAddedLineNumberBg": {
      "dark": "#283427",
      "light": "#e1f3df"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#36292b",
      "light": "#f5e2e1"
    },
    "markdownText": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "markdownHeading": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "markdownLink": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "markdownListItem": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxComment": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "syntaxKeyword": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "syntaxFunction": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkFg",
      "light": "lightFg"
    }
  }
}
const opencode = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "darkStep1": "#0a0a0a",
    "darkStep2": "#141414",
    "darkStep3": "#1e1e1e",
    "darkStep4": "#282828",
    "darkStep5": "#323232",
    "darkStep6": "#3c3c3c",
    "darkStep7": "#484848",
    "darkStep8": "#606060",
    "darkStep9": "#fab283",
    "darkStep10": "#ffc09f",
    "darkStep11": "#808080",
    "darkStep12": "#eeeeee",
    "darkSecondary": "#5c9cf5",
    "darkAccent": "#9d7cd8",
    "darkRed": "#e06c75",
    "darkOrange": "#f5a742",
    "darkGreen": "#7fd88f",
    "darkCyan": "#56b6c2",
    "darkYellow": "#e5c07b",
    "lightStep1": "#ffffff",
    "lightStep2": "#fafafa",
    "lightStep3": "#f5f5f5",
    "lightStep4": "#ebebeb",
    "lightStep5": "#e1e1e1",
    "lightStep6": "#d4d4d4",
    "lightStep7": "#b8b8b8",
    "lightStep8": "#a0a0a0",
    "lightStep9": "#3b7dd8",
    "lightStep10": "#2968c3",
    "lightStep11": "#8a8a8a",
    "lightStep12": "#1a1a1a",
    "lightSecondary": "#7b5bb6",
    "lightAccent": "#d68c27",
    "lightRed": "#d1383d",
    "lightOrange": "#d68c27",
    "lightGreen": "#3d9a57",
    "lightCyan": "#318795",
    "lightYellow": "#b0851f"
  },
  "theme": {
    "primary": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "secondary": {
      "dark": "darkSecondary",
      "light": "lightSecondary"
    },
    "accent": {
      "dark": "darkAccent",
      "light": "lightAccent"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "text": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "textMuted": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "background": {
      "dark": "darkStep1",
      "light": "lightStep1"
    },
    "backgroundPanel": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "backgroundElement": {
      "dark": "darkStep3",
      "light": "lightStep3"
    },
    "border": {
      "dark": "darkStep7",
      "light": "lightStep7"
    },
    "borderActive": {
      "dark": "darkStep8",
      "light": "lightStep8"
    },
    "borderSubtle": {
      "dark": "darkStep6",
      "light": "lightStep6"
    },
    "diffAdded": {
      "dark": "#4fd6be",
      "light": "#1e725c"
    },
    "diffRemoved": {
      "dark": "#c53b53",
      "light": "#c53b53"
    },
    "diffContext": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHunkHeader": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHighlightAdded": {
      "dark": "#b8db87",
      "light": "#4db380"
    },
    "diffHighlightRemoved": {
      "dark": "#e26a75",
      "light": "#f52a65"
    },
    "diffAddedBg": {
      "dark": "#20303b",
      "light": "#d5e5d5"
    },
    "diffRemovedBg": {
      "dark": "#37222c",
      "light": "#f7d8db"
    },
    "diffContextBg": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "diffLineNumber": {
      "dark": "#8f8f8f",
      "light": "#595959"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1b2b34",
      "light": "#c5d5c5"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2d1f26",
      "light": "#e7c8cb"
    },
    "markdownText": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "markdownHeading": {
      "dark": "darkAccent",
      "light": "lightAccent"
    },
    "markdownLink": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "markdownListItem": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "syntaxComment": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "syntaxKeyword": {
      "dark": "darkAccent",
      "light": "lightAccent"
    },
    "syntaxFunction": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkStep12",
      "light": "lightStep12"
    }
  }
}
const orng = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "darkStep1": "#0a0a0a",
    "darkStep2": "#141414",
    "darkStep3": "#1e1e1e",
    "darkStep4": "#282828",
    "darkStep5": "#323232",
    "darkStep6": "#3c3c3c",
    "darkStep7": "#484848",
    "darkStep8": "#606060",
    "darkStep9": "#EC5B2B",
    "darkStep10": "#EE7948",
    "darkStep11": "#808080",
    "darkStep12": "#eeeeee",
    "darkSecondary": "#EE7948",
    "darkAccent": "#FFF7F1",
    "darkRed": "#e06c75",
    "darkOrange": "#EC5B2B",
    "darkBlue": "#6ba1e6",
    "darkCyan": "#56b6c2",
    "darkYellow": "#e5c07b",
    "lightStep1": "#ffffff",
    "lightStep2": "#FFF7F1",
    "lightStep3": "#f5f0eb",
    "lightStep4": "#ebebeb",
    "lightStep5": "#e1e1e1",
    "lightStep6": "#d4d4d4",
    "lightStep7": "#b8b8b8",
    "lightStep8": "#a0a0a0",
    "lightStep9": "#EC5B2B",
    "lightStep10": "#c94d24",
    "lightStep11": "#8a8a8a",
    "lightStep12": "#1a1a1a",
    "lightSecondary": "#EE7948",
    "lightAccent": "#c94d24",
    "lightRed": "#d1383d",
    "lightOrange": "#EC5B2B",
    "lightBlue": "#0062d1",
    "lightCyan": "#318795",
    "lightYellow": "#b0851f"
  },
  "theme": {
    "primary": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "secondary": {
      "dark": "darkSecondary",
      "light": "lightSecondary"
    },
    "accent": {
      "dark": "darkAccent",
      "light": "lightAccent"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "info": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "text": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "textMuted": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "selectedListItemText": {
      "dark": "#0a0a0a",
      "light": "#ffffff"
    },
    "background": {
      "dark": "darkStep1",
      "light": "lightStep1"
    },
    "backgroundPanel": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "backgroundElement": {
      "dark": "darkStep3",
      "light": "lightStep3"
    },
    "border": {
      "dark": "#EC5B2B",
      "light": "#EC5B2B"
    },
    "borderActive": {
      "dark": "#EE7948",
      "light": "#c94d24"
    },
    "borderSubtle": {
      "dark": "darkStep6",
      "light": "lightStep6"
    },
    "diffAdded": {
      "dark": "#6ba1e6",
      "light": "#0062d1"
    },
    "diffRemoved": {
      "dark": "#c53b53",
      "light": "#c53b53"
    },
    "diffContext": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHunkHeader": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHighlightAdded": {
      "dark": "#6ba1e6",
      "light": "#0062d1"
    },
    "diffHighlightRemoved": {
      "dark": "#e26a75",
      "light": "#f52a65"
    },
    "diffAddedBg": {
      "dark": "#1a2a3d",
      "light": "#e0edfa"
    },
    "diffRemovedBg": {
      "dark": "#37222c",
      "light": "#f7d8db"
    },
    "diffContextBg": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "diffLineNumber": {
      "dark": "diffContext",
      "light": "#595755"
    },
    "diffAddedLineNumberBg": {
      "dark": "#162535",
      "light": "#d0e5f5"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2d1f26",
      "light": "#e7c8cb"
    },
    "markdownText": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "markdownHeading": {
      "dark": "#EC5B2B",
      "light": "#EC5B2B"
    },
    "markdownLink": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownBlockQuote": {
      "dark": "#FFF7F1",
      "light": "lightYellow"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "#EE7948",
      "light": "#EC5B2B"
    },
    "markdownHorizontalRule": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "markdownListItem": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "syntaxComment": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "syntaxKeyword": {
      "dark": "#EC5B2B",
      "light": "#EC5B2B"
    },
    "syntaxFunction": {
      "dark": "#EE7948",
      "light": "#c94d24"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "syntaxNumber": {
      "dark": "#FFF7F1",
      "light": "#EC5B2B"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkStep12",
      "light": "lightStep12"
    }
  }
}
const osaka_jade = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "darkBg0": "#111c18",
    "darkBg1": "#1a2520",
    "darkBg2": "#23372B",
    "darkBg3": "#3d4a44",
    "darkFg0": "#C1C497",
    "darkFg1": "#9aa88a",
    "darkGray": "#53685B",
    "darkRed": "#FF5345",
    "darkGreen": "#549e6a",
    "darkYellow": "#459451",
    "darkBlue": "#509475",
    "darkMagenta": "#D2689C",
    "darkCyan": "#2DD5B7",
    "darkWhite": "#F6F5DD",
    "darkRedBright": "#db9f9c",
    "darkGreenBright": "#63b07a",
    "darkYellowBright": "#E5C736",
    "darkBlueBright": "#ACD4CF",
    "darkMagentaBright": "#75bbb3",
    "darkCyanBright": "#8CD3CB",
    "lightBg0": "#F6F5DD",
    "lightBg1": "#E8E7CC",
    "lightBg2": "#D5D4B8",
    "lightBg3": "#A8A78C",
    "lightFg0": "#111c18",
    "lightFg1": "#1a2520",
    "lightGray": "#53685B",
    "lightRed": "#c7392d",
    "lightGreen": "#3d7a52",
    "lightYellow": "#b5a020",
    "lightBlue": "#3d7560",
    "lightMagenta": "#a8527a",
    "lightCyan": "#1faa90"
  },
  "theme": {
    "primary": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "secondary": {
      "dark": "darkMagenta",
      "light": "lightMagenta"
    },
    "accent": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkYellowBright",
      "light": "lightYellow"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "text": {
      "dark": "darkFg0",
      "light": "lightFg0"
    },
    "textMuted": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "background": {
      "dark": "darkBg0",
      "light": "lightBg0"
    },
    "backgroundPanel": {
      "dark": "darkBg1",
      "light": "lightBg1"
    },
    "backgroundElement": {
      "dark": "darkBg2",
      "light": "lightBg2"
    },
    "border": {
      "dark": "darkBg3",
      "light": "lightBg3"
    },
    "borderActive": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "borderSubtle": {
      "dark": "darkBg2",
      "light": "lightBg2"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "diffHunkHeader": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "diffHighlightAdded": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "diffHighlightRemoved": {
      "dark": "darkRedBright",
      "light": "lightRed"
    },
    "diffAddedBg": {
      "dark": "#15241c",
      "light": "#e0eee5"
    },
    "diffRemovedBg": {
      "dark": "#241515",
      "light": "#eee0e0"
    },
    "diffContextBg": {
      "dark": "darkBg1",
      "light": "lightBg1"
    },
    "diffLineNumber": {
      "dark": "#828b87",
      "light": "#5f5e4f"
    },
    "diffAddedLineNumberBg": {
      "dark": "#121f18",
      "light": "#d5e5da"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#1f1212",
      "light": "#e5d5d5"
    },
    "markdownText": {
      "dark": "darkFg0",
      "light": "lightFg0"
    },
    "markdownHeading": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownLink": {
      "dark": "darkCyanBright",
      "light": "lightCyan"
    },
    "markdownLinkText": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownCode": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "markdownEmph": {
      "dark": "darkMagenta",
      "light": "lightMagenta"
    },
    "markdownStrong": {
      "dark": "darkFg0",
      "light": "lightFg0"
    },
    "markdownHorizontalRule": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "markdownListItem": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownListEnumeration": {
      "dark": "darkCyanBright",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkCyanBright",
      "light": "lightCyan"
    },
    "markdownImageText": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownCodeBlock": {
      "dark": "darkFg0",
      "light": "lightFg0"
    },
    "syntaxComment": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "syntaxKeyword": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxFunction": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "syntaxVariable": {
      "dark": "darkFg0",
      "light": "lightFg0"
    },
    "syntaxString": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkMagenta",
      "light": "lightMagenta"
    },
    "syntaxType": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxOperator": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxPunctuation": {
      "dark": "darkFg0",
      "light": "lightFg0"
    }
  }
}
const palenight = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "background": "#292d3e",
    "backgroundAlt": "#1e2132",
    "backgroundPanel": "#32364a",
    "foreground": "#a6accd",
    "foregroundBright": "#bfc7d5",
    "comment": "#676e95",
    "red": "#f07178",
    "orange": "#f78c6c",
    "yellow": "#ffcb6b",
    "green": "#c3e88d",
    "cyan": "#89ddff",
    "blue": "#82aaff",
    "purple": "#c792ea",
    "magenta": "#ff5370",
    "pink": "#f07178"
  },
  "theme": {
    "primary": {
      "dark": "blue",
      "light": "#4976eb"
    },
    "secondary": {
      "dark": "purple",
      "light": "#a854f2"
    },
    "accent": {
      "dark": "cyan",
      "light": "#00acc1"
    },
    "error": {
      "dark": "red",
      "light": "#e53935"
    },
    "warning": {
      "dark": "yellow",
      "light": "#ffb300"
    },
    "success": {
      "dark": "green",
      "light": "#91b859"
    },
    "info": {
      "dark": "orange",
      "light": "#f4511e"
    },
    "text": {
      "dark": "foreground",
      "light": "#292d3e"
    },
    "textMuted": {
      "dark": "comment",
      "light": "#8796b0"
    },
    "background": {
      "dark": "#292d3e",
      "light": "#fafafa"
    },
    "backgroundPanel": {
      "dark": "#1e2132",
      "light": "#f5f5f5"
    },
    "backgroundElement": {
      "dark": "#32364a",
      "light": "#e7e7e8"
    },
    "border": {
      "dark": "#32364a",
      "light": "#e0e0e0"
    },
    "borderActive": {
      "dark": "blue",
      "light": "#4976eb"
    },
    "borderSubtle": {
      "dark": "#1e2132",
      "light": "#eeeeee"
    },
    "diffAdded": {
      "dark": "green",
      "light": "#91b859"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "#e53935"
    },
    "diffContext": {
      "dark": "comment",
      "light": "#8796b0"
    },
    "diffHunkHeader": {
      "dark": "cyan",
      "light": "#00acc1"
    },
    "diffHighlightAdded": {
      "dark": "green",
      "light": "#91b859"
    },
    "diffHighlightRemoved": {
      "dark": "red",
      "light": "#e53935"
    },
    "diffAddedBg": {
      "dark": "#2e3c2b",
      "light": "#e8f5e9"
    },
    "diffRemovedBg": {
      "dark": "#3c2b2b",
      "light": "#ffebee"
    },
    "diffContextBg": {
      "dark": "#1e2132",
      "light": "#f5f5f5"
    },
    "diffLineNumber": {
      "dark": "#a0a2af",
      "light": "#6a6e70"
    },
    "diffAddedLineNumberBg": {
      "dark": "#2e3c2b",
      "light": "#e8f5e9"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3c2b2b",
      "light": "#ffebee"
    },
    "markdownText": {
      "dark": "foreground",
      "light": "#292d3e"
    },
    "markdownHeading": {
      "dark": "purple",
      "light": "#a854f2"
    },
    "markdownLink": {
      "dark": "blue",
      "light": "#4976eb"
    },
    "markdownLinkText": {
      "dark": "cyan",
      "light": "#00acc1"
    },
    "markdownCode": {
      "dark": "green",
      "light": "#91b859"
    },
    "markdownBlockQuote": {
      "dark": "comment",
      "light": "#8796b0"
    },
    "markdownEmph": {
      "dark": "yellow",
      "light": "#ffb300"
    },
    "markdownStrong": {
      "dark": "orange",
      "light": "#f4511e"
    },
    "markdownHorizontalRule": {
      "dark": "comment",
      "light": "#8796b0"
    },
    "markdownListItem": {
      "dark": "blue",
      "light": "#4976eb"
    },
    "markdownListEnumeration": {
      "dark": "cyan",
      "light": "#00acc1"
    },
    "markdownImage": {
      "dark": "blue",
      "light": "#4976eb"
    },
    "markdownImageText": {
      "dark": "cyan",
      "light": "#00acc1"
    },
    "markdownCodeBlock": {
      "dark": "foreground",
      "light": "#292d3e"
    },
    "syntaxComment": {
      "dark": "comment",
      "light": "#8796b0"
    },
    "syntaxKeyword": {
      "dark": "purple",
      "light": "#a854f2"
    },
    "syntaxFunction": {
      "dark": "blue",
      "light": "#4976eb"
    },
    "syntaxVariable": {
      "dark": "foreground",
      "light": "#292d3e"
    },
    "syntaxString": {
      "dark": "green",
      "light": "#91b859"
    },
    "syntaxNumber": {
      "dark": "orange",
      "light": "#f4511e"
    },
    "syntaxType": {
      "dark": "yellow",
      "light": "#ffb300"
    },
    "syntaxOperator": {
      "dark": "cyan",
      "light": "#00acc1"
    },
    "syntaxPunctuation": {
      "dark": "foreground",
      "light": "#292d3e"
    }
  }
}
const rosepine = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "base": "#191724",
    "surface": "#1f1d2e",
    "overlay": "#26233a",
    "muted": "#6e6a86",
    "subtle": "#908caa",
    "text": "#e0def4",
    "love": "#eb6f92",
    "gold": "#f6c177",
    "rose": "#ebbcba",
    "pine": "#31748f",
    "foam": "#9ccfd8",
    "iris": "#c4a7e7",
    "highlightLow": "#21202e",
    "highlightMed": "#403d52",
    "highlightHigh": "#524f67",
    "moonBase": "#232136",
    "moonSurface": "#2a273f",
    "moonOverlay": "#393552",
    "moonMuted": "#6e6a86",
    "moonSubtle": "#908caa",
    "moonText": "#e0def4",
    "dawnBase": "#faf4ed",
    "dawnSurface": "#fffaf3",
    "dawnOverlay": "#f2e9e1",
    "dawnMuted": "#9893a5",
    "dawnSubtle": "#797593",
    "dawnText": "#575279"
  },
  "theme": {
    "primary": {
      "dark": "foam",
      "light": "pine"
    },
    "secondary": {
      "dark": "iris",
      "light": "#907aa9"
    },
    "accent": {
      "dark": "rose",
      "light": "#d7827e"
    },
    "error": {
      "dark": "love",
      "light": "#b4637a"
    },
    "warning": {
      "dark": "gold",
      "light": "#ea9d34"
    },
    "success": {
      "dark": "pine",
      "light": "#286983"
    },
    "info": {
      "dark": "foam",
      "light": "#56949f"
    },
    "text": {
      "dark": "#e0def4",
      "light": "#575279"
    },
    "textMuted": {
      "dark": "muted",
      "light": "dawnMuted"
    },
    "background": {
      "dark": "base",
      "light": "dawnBase"
    },
    "backgroundPanel": {
      "dark": "surface",
      "light": "dawnSurface"
    },
    "backgroundElement": {
      "dark": "overlay",
      "light": "dawnOverlay"
    },
    "border": {
      "dark": "highlightMed",
      "light": "#dfdad9"
    },
    "borderActive": {
      "dark": "foam",
      "light": "pine"
    },
    "borderSubtle": {
      "dark": "highlightLow",
      "light": "#f4ede8"
    },
    "diffAdded": {
      "dark": "pine",
      "light": "#286983"
    },
    "diffRemoved": {
      "dark": "love",
      "light": "#b4637a"
    },
    "diffContext": {
      "dark": "muted",
      "light": "dawnMuted"
    },
    "diffHunkHeader": {
      "dark": "iris",
      "light": "#907aa9"
    },
    "diffHighlightAdded": {
      "dark": "pine",
      "light": "#286983"
    },
    "diffHighlightRemoved": {
      "dark": "love",
      "light": "#b4637a"
    },
    "diffAddedBg": {
      "dark": "#1f2d3a",
      "light": "#e5f2f3"
    },
    "diffRemovedBg": {
      "dark": "#3a1f2d",
      "light": "#fce5e8"
    },
    "diffContextBg": {
      "dark": "surface",
      "light": "dawnSurface"
    },
    "diffLineNumber": {
      "dark": "#9491a6",
      "light": "#6c6875"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1f2d3a",
      "light": "#e5f2f3"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3a1f2d",
      "light": "#fce5e8"
    },
    "markdownText": {
      "dark": "#e0def4",
      "light": "#575279"
    },
    "markdownHeading": {
      "dark": "iris",
      "light": "#907aa9"
    },
    "markdownLink": {
      "dark": "foam",
      "light": "pine"
    },
    "markdownLinkText": {
      "dark": "rose",
      "light": "#d7827e"
    },
    "markdownCode": {
      "dark": "pine",
      "light": "#286983"
    },
    "markdownBlockQuote": {
      "dark": "muted",
      "light": "dawnMuted"
    },
    "markdownEmph": {
      "dark": "gold",
      "light": "#ea9d34"
    },
    "markdownStrong": {
      "dark": "love",
      "light": "#b4637a"
    },
    "markdownHorizontalRule": {
      "dark": "highlightMed",
      "light": "#dfdad9"
    },
    "markdownListItem": {
      "dark": "foam",
      "light": "pine"
    },
    "markdownListEnumeration": {
      "dark": "rose",
      "light": "#d7827e"
    },
    "markdownImage": {
      "dark": "foam",
      "light": "pine"
    },
    "markdownImageText": {
      "dark": "rose",
      "light": "#d7827e"
    },
    "markdownCodeBlock": {
      "dark": "#e0def4",
      "light": "#575279"
    },
    "syntaxComment": {
      "dark": "muted",
      "light": "dawnMuted"
    },
    "syntaxKeyword": {
      "dark": "pine",
      "light": "#286983"
    },
    "syntaxFunction": {
      "dark": "rose",
      "light": "#d7827e"
    },
    "syntaxVariable": {
      "dark": "#e0def4",
      "light": "#575279"
    },
    "syntaxString": {
      "dark": "gold",
      "light": "#ea9d34"
    },
    "syntaxNumber": {
      "dark": "iris",
      "light": "#907aa9"
    },
    "syntaxType": {
      "dark": "foam",
      "light": "#56949f"
    },
    "syntaxOperator": {
      "dark": "subtle",
      "light": "dawnSubtle"
    },
    "syntaxPunctuation": {
      "dark": "subtle",
      "light": "dawnSubtle"
    }
  }
}
const solarized = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "base03": "#002b36",
    "base02": "#073642",
    "base01": "#586e75",
    "base00": "#657b83",
    "base0": "#839496",
    "base1": "#93a1a1",
    "base2": "#eee8d5",
    "base3": "#fdf6e3",
    "yellow": "#b58900",
    "orange": "#cb4b16",
    "red": "#dc322f",
    "magenta": "#d33682",
    "violet": "#6c71c4",
    "blue": "#268bd2",
    "cyan": "#2aa198",
    "green": "#859900"
  },
  "theme": {
    "primary": {
      "dark": "blue",
      "light": "blue"
    },
    "secondary": {
      "dark": "violet",
      "light": "violet"
    },
    "accent": {
      "dark": "cyan",
      "light": "cyan"
    },
    "error": {
      "dark": "red",
      "light": "red"
    },
    "warning": {
      "dark": "yellow",
      "light": "yellow"
    },
    "success": {
      "dark": "green",
      "light": "green"
    },
    "info": {
      "dark": "orange",
      "light": "orange"
    },
    "text": {
      "dark": "base0",
      "light": "base00"
    },
    "textMuted": {
      "dark": "base01",
      "light": "base1"
    },
    "background": {
      "dark": "base03",
      "light": "base3"
    },
    "backgroundPanel": {
      "dark": "base02",
      "light": "base2"
    },
    "backgroundElement": {
      "dark": "#073642",
      "light": "#eee8d5"
    },
    "border": {
      "dark": "base02",
      "light": "base2"
    },
    "borderActive": {
      "dark": "base01",
      "light": "base1"
    },
    "borderSubtle": {
      "dark": "#073642",
      "light": "#eee8d5"
    },
    "diffAdded": {
      "dark": "green",
      "light": "green"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "red"
    },
    "diffContext": {
      "dark": "base01",
      "light": "base1"
    },
    "diffHunkHeader": {
      "dark": "base01",
      "light": "base1"
    },
    "diffHighlightAdded": {
      "dark": "green",
      "light": "green"
    },
    "diffHighlightRemoved": {
      "dark": "red",
      "light": "red"
    },
    "diffAddedBg": {
      "dark": "#073642",
      "light": "#eee8d5"
    },
    "diffRemovedBg": {
      "dark": "#073642",
      "light": "#eee8d5"
    },
    "diffContextBg": {
      "dark": "base02",
      "light": "base2"
    },
    "diffLineNumber": {
      "dark": "#8b9b9f",
      "light": "#5f6969"
    },
    "diffAddedLineNumberBg": {
      "dark": "#073642",
      "light": "#eee8d5"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#073642",
      "light": "#eee8d5"
    },
    "markdownText": {
      "dark": "base0",
      "light": "base00"
    },
    "markdownHeading": {
      "dark": "blue",
      "light": "blue"
    },
    "markdownLink": {
      "dark": "cyan",
      "light": "cyan"
    },
    "markdownLinkText": {
      "dark": "violet",
      "light": "violet"
    },
    "markdownCode": {
      "dark": "green",
      "light": "green"
    },
    "markdownBlockQuote": {
      "dark": "base01",
      "light": "base1"
    },
    "markdownEmph": {
      "dark": "yellow",
      "light": "yellow"
    },
    "markdownStrong": {
      "dark": "orange",
      "light": "orange"
    },
    "markdownHorizontalRule": {
      "dark": "base01",
      "light": "base1"
    },
    "markdownListItem": {
      "dark": "blue",
      "light": "blue"
    },
    "markdownListEnumeration": {
      "dark": "cyan",
      "light": "cyan"
    },
    "markdownImage": {
      "dark": "cyan",
      "light": "cyan"
    },
    "markdownImageText": {
      "dark": "violet",
      "light": "violet"
    },
    "markdownCodeBlock": {
      "dark": "base0",
      "light": "base00"
    },
    "syntaxComment": {
      "dark": "base01",
      "light": "base1"
    },
    "syntaxKeyword": {
      "dark": "green",
      "light": "green"
    },
    "syntaxFunction": {
      "dark": "blue",
      "light": "blue"
    },
    "syntaxVariable": {
      "dark": "cyan",
      "light": "cyan"
    },
    "syntaxString": {
      "dark": "cyan",
      "light": "cyan"
    },
    "syntaxNumber": {
      "dark": "magenta",
      "light": "magenta"
    },
    "syntaxType": {
      "dark": "yellow",
      "light": "yellow"
    },
    "syntaxOperator": {
      "dark": "green",
      "light": "green"
    },
    "syntaxPunctuation": {
      "dark": "base0",
      "light": "base00"
    }
  }
}
const synthwave84 = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "background": "#262335",
    "backgroundAlt": "#1e1a29",
    "backgroundPanel": "#2a2139",
    "foreground": "#ffffff",
    "foregroundMuted": "#848bbd",
    "pink": "#ff7edb",
    "pinkBright": "#ff92df",
    "cyan": "#36f9f6",
    "cyanBright": "#72f1f8",
    "yellow": "#fede5d",
    "yellowBright": "#fff95d",
    "orange": "#ff8b39",
    "orangeBright": "#ff9f43",
    "purple": "#b084eb",
    "purpleBright": "#c792ea",
    "red": "#fe4450",
    "redBright": "#ff5e5b",
    "green": "#72f1b8",
    "greenBright": "#97f1d8"
  },
  "theme": {
    "primary": {
      "dark": "cyan",
      "light": "#00bcd4"
    },
    "secondary": {
      "dark": "pink",
      "light": "#e91e63"
    },
    "accent": {
      "dark": "purple",
      "light": "#9c27b0"
    },
    "error": {
      "dark": "red",
      "light": "#f44336"
    },
    "warning": {
      "dark": "yellow",
      "light": "#ff9800"
    },
    "success": {
      "dark": "green",
      "light": "#4caf50"
    },
    "info": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "text": {
      "dark": "foreground",
      "light": "#262335"
    },
    "textMuted": {
      "dark": "foregroundMuted",
      "light": "#5c5c8a"
    },
    "background": {
      "dark": "#262335",
      "light": "#fafafa"
    },
    "backgroundPanel": {
      "dark": "#1e1a29",
      "light": "#f5f5f5"
    },
    "backgroundElement": {
      "dark": "#2a2139",
      "light": "#eeeeee"
    },
    "border": {
      "dark": "#495495",
      "light": "#e0e0e0"
    },
    "borderActive": {
      "dark": "cyan",
      "light": "#00bcd4"
    },
    "borderSubtle": {
      "dark": "#241b2f",
      "light": "#f0f0f0"
    },
    "diffAdded": {
      "dark": "green",
      "light": "#4caf50"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "#f44336"
    },
    "diffContext": {
      "dark": "foregroundMuted",
      "light": "#5c5c8a"
    },
    "diffHunkHeader": {
      "dark": "purple",
      "light": "#9c27b0"
    },
    "diffHighlightAdded": {
      "dark": "greenBright",
      "light": "#4caf50"
    },
    "diffHighlightRemoved": {
      "dark": "redBright",
      "light": "#f44336"
    },
    "diffAddedBg": {
      "dark": "#1a3a2a",
      "light": "#e8f5e9"
    },
    "diffRemovedBg": {
      "dark": "#3a1a2a",
      "light": "#ffebee"
    },
    "diffContextBg": {
      "dark": "#1e1a29",
      "light": "#f5f5f5"
    },
    "diffLineNumber": {
      "dark": "#959bc1",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1a3a2a",
      "light": "#e8f5e9"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3a1a2a",
      "light": "#ffebee"
    },
    "markdownText": {
      "dark": "foreground",
      "light": "#262335"
    },
    "markdownHeading": {
      "dark": "pink",
      "light": "#e91e63"
    },
    "markdownLink": {
      "dark": "cyan",
      "light": "#00bcd4"
    },
    "markdownLinkText": {
      "dark": "purple",
      "light": "#9c27b0"
    },
    "markdownCode": {
      "dark": "green",
      "light": "#4caf50"
    },
    "markdownBlockQuote": {
      "dark": "foregroundMuted",
      "light": "#5c5c8a"
    },
    "markdownEmph": {
      "dark": "yellow",
      "light": "#ff9800"
    },
    "markdownStrong": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "markdownHorizontalRule": {
      "dark": "#495495",
      "light": "#e0e0e0"
    },
    "markdownListItem": {
      "dark": "cyan",
      "light": "#00bcd4"
    },
    "markdownListEnumeration": {
      "dark": "purple",
      "light": "#9c27b0"
    },
    "markdownImage": {
      "dark": "cyan",
      "light": "#00bcd4"
    },
    "markdownImageText": {
      "dark": "purple",
      "light": "#9c27b0"
    },
    "markdownCodeBlock": {
      "dark": "foreground",
      "light": "#262335"
    },
    "syntaxComment": {
      "dark": "foregroundMuted",
      "light": "#5c5c8a"
    },
    "syntaxKeyword": {
      "dark": "pink",
      "light": "#e91e63"
    },
    "syntaxFunction": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "syntaxVariable": {
      "dark": "foreground",
      "light": "#262335"
    },
    "syntaxString": {
      "dark": "yellow",
      "light": "#ff9800"
    },
    "syntaxNumber": {
      "dark": "purple",
      "light": "#9c27b0"
    },
    "syntaxType": {
      "dark": "cyan",
      "light": "#00bcd4"
    },
    "syntaxOperator": {
      "dark": "pink",
      "light": "#e91e63"
    },
    "syntaxPunctuation": {
      "dark": "foreground",
      "light": "#262335"
    }
  }
}
const tokyonight = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "darkStep1": "#1a1b26",
    "darkStep2": "#1e2030",
    "darkStep3": "#222436",
    "darkStep4": "#292e42",
    "darkStep5": "#3b4261",
    "darkStep6": "#545c7e",
    "darkStep7": "#737aa2",
    "darkStep8": "#9099b2",
    "darkStep9": "#82aaff",
    "darkStep10": "#89b4fa",
    "darkStep11": "#828bb8",
    "darkStep12": "#c8d3f5",
    "darkRed": "#ff757f",
    "darkOrange": "#ff966c",
    "darkYellow": "#ffc777",
    "darkGreen": "#c3e88d",
    "darkCyan": "#86e1fc",
    "darkPurple": "#c099ff",
    "lightStep1": "#e1e2e7",
    "lightStep2": "#d5d6db",
    "lightStep3": "#c8c9ce",
    "lightStep4": "#b9bac1",
    "lightStep5": "#a8aecb",
    "lightStep6": "#9699a8",
    "lightStep7": "#737a8c",
    "lightStep8": "#5a607d",
    "lightStep9": "#2e7de9",
    "lightStep10": "#1a6ce7",
    "lightStep11": "#8990a3",
    "lightStep12": "#3760bf",
    "lightRed": "#f52a65",
    "lightOrange": "#b15c00",
    "lightYellow": "#8c6c3e",
    "lightGreen": "#587539",
    "lightCyan": "#007197",
    "lightPurple": "#9854f1"
  },
  "theme": {
    "primary": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "secondary": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "accent": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "text": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "textMuted": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "background": {
      "dark": "darkStep1",
      "light": "lightStep1"
    },
    "backgroundPanel": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "backgroundElement": {
      "dark": "darkStep3",
      "light": "lightStep3"
    },
    "border": {
      "dark": "darkStep7",
      "light": "lightStep7"
    },
    "borderActive": {
      "dark": "darkStep8",
      "light": "lightStep8"
    },
    "borderSubtle": {
      "dark": "darkStep6",
      "light": "lightStep6"
    },
    "diffAdded": {
      "dark": "#4fd6be",
      "light": "#1e725c"
    },
    "diffRemoved": {
      "dark": "#c53b53",
      "light": "#c53b53"
    },
    "diffContext": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHunkHeader": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHighlightAdded": {
      "dark": "#b8db87",
      "light": "#4db380"
    },
    "diffHighlightRemoved": {
      "dark": "#e26a75",
      "light": "#f52a65"
    },
    "diffAddedBg": {
      "dark": "#20303b",
      "light": "#d5e5d5"
    },
    "diffRemovedBg": {
      "dark": "#37222c",
      "light": "#f7d8db"
    },
    "diffContextBg": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "diffLineNumber": {
      "dark": "#8f909a",
      "light": "#59595b"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1b2b34",
      "light": "#c5d5c5"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2d1f26",
      "light": "#e7c8cb"
    },
    "markdownText": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "markdownHeading": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "markdownLink": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "markdownListItem": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "syntaxComment": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "syntaxKeyword": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "syntaxFunction": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkStep12",
      "light": "lightStep12"
    }
  }
}
const vercel = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "background100": "#0A0A0A",
    "background200": "#000000",
    "gray100": "#1A1A1A",
    "gray200": "#1F1F1F",
    "gray300": "#292929",
    "gray400": "#2E2E2E",
    "gray500": "#454545",
    "gray600": "#878787",
    "gray700": "#8F8F8F",
    "gray900": "#A1A1A1",
    "gray1000": "#EDEDED",
    "blue600": "#0099FF",
    "blue700": "#0070F3",
    "blue900": "#52A8FF",
    "blue1000": "#EBF8FF",
    "red700": "#E5484D",
    "red900": "#FF6166",
    "red1000": "#FDECED",
    "amber700": "#FFB224",
    "amber900": "#F2A700",
    "amber1000": "#FDF4DC",
    "green700": "#46A758",
    "green900": "#63C46D",
    "green1000": "#E6F9E9",
    "teal700": "#12A594",
    "teal900": "#0AC7AC",
    "purple700": "#8E4EC6",
    "purple900": "#BF7AF0",
    "pink700": "#E93D82",
    "pink900": "#F75590",
    "highlightPink": "#FF0080",
    "highlightPurple": "#F81CE5",
    "cyan": "#50E3C2",
    "lightBackground": "#FFFFFF",
    "lightGray100": "#FAFAFA",
    "lightGray200": "#EAEAEA",
    "lightGray600": "#666666",
    "lightGray1000": "#171717"
  },
  "theme": {
    "primary": {
      "dark": "blue700",
      "light": "blue700"
    },
    "secondary": {
      "dark": "blue900",
      "light": "#0062D1"
    },
    "accent": {
      "dark": "purple700",
      "light": "purple700"
    },
    "error": {
      "dark": "red700",
      "light": "#DC3545"
    },
    "warning": {
      "dark": "amber700",
      "light": "#FF9500"
    },
    "success": {
      "dark": "green700",
      "light": "#388E3C"
    },
    "info": {
      "dark": "blue900",
      "light": "blue700"
    },
    "text": {
      "dark": "gray1000",
      "light": "lightGray1000"
    },
    "textMuted": {
      "dark": "gray600",
      "light": "lightGray600"
    },
    "background": {
      "dark": "background200",
      "light": "lightBackground"
    },
    "backgroundPanel": {
      "dark": "gray100",
      "light": "lightGray100"
    },
    "backgroundElement": {
      "dark": "gray300",
      "light": "lightGray200"
    },
    "border": {
      "dark": "gray200",
      "light": "lightGray200"
    },
    "borderActive": {
      "dark": "gray500",
      "light": "#999999"
    },
    "borderSubtle": {
      "dark": "gray100",
      "light": "#EAEAEA"
    },
    "diffAdded": {
      "dark": "green900",
      "light": "green700"
    },
    "diffRemoved": {
      "dark": "red900",
      "light": "red700"
    },
    "diffContext": {
      "dark": "gray600",
      "light": "lightGray600"
    },
    "diffHunkHeader": {
      "dark": "gray600",
      "light": "lightGray600"
    },
    "diffHighlightAdded": {
      "dark": "green900",
      "light": "green700"
    },
    "diffHighlightRemoved": {
      "dark": "red900",
      "light": "red700"
    },
    "diffAddedBg": {
      "dark": "#0B1D0F",
      "light": "#E6F9E9"
    },
    "diffRemovedBg": {
      "dark": "#2A1314",
      "light": "#FDECED"
    },
    "diffContextBg": {
      "dark": "background200",
      "light": "lightBackground"
    },
    "diffLineNumber": {
      "dark": "#8a8a8a",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "#0F2613",
      "light": "#D6F5D6"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3C1618",
      "light": "#FFE5E5"
    },
    "markdownText": {
      "dark": "gray1000",
      "light": "lightGray1000"
    },
    "markdownHeading": {
      "dark": "purple900",
      "light": "purple700"
    },
    "markdownLink": {
      "dark": "blue900",
      "light": "blue700"
    },
    "markdownLinkText": {
      "dark": "teal900",
      "light": "teal700"
    },
    "markdownCode": {
      "dark": "green900",
      "light": "green700"
    },
    "markdownBlockQuote": {
      "dark": "gray600",
      "light": "lightGray600"
    },
    "markdownEmph": {
      "dark": "amber900",
      "light": "amber700"
    },
    "markdownStrong": {
      "dark": "pink900",
      "light": "pink700"
    },
    "markdownHorizontalRule": {
      "dark": "gray500",
      "light": "#999999"
    },
    "markdownListItem": {
      "dark": "gray1000",
      "light": "lightGray1000"
    },
    "markdownListEnumeration": {
      "dark": "blue900",
      "light": "blue700"
    },
    "markdownImage": {
      "dark": "teal900",
      "light": "teal700"
    },
    "markdownImageText": {
      "dark": "cyan",
      "light": "teal700"
    },
    "markdownCodeBlock": {
      "dark": "gray1000",
      "light": "lightGray1000"
    },
    "syntaxComment": {
      "dark": "gray600",
      "light": "#888888"
    },
    "syntaxKeyword": {
      "dark": "pink900",
      "light": "pink700"
    },
    "syntaxFunction": {
      "dark": "purple900",
      "light": "purple700"
    },
    "syntaxVariable": {
      "dark": "blue900",
      "light": "blue700"
    },
    "syntaxString": {
      "dark": "green900",
      "light": "green700"
    },
    "syntaxNumber": {
      "dark": "amber900",
      "light": "amber700"
    },
    "syntaxType": {
      "dark": "teal900",
      "light": "teal700"
    },
    "syntaxOperator": {
      "dark": "pink900",
      "light": "pink700"
    },
    "syntaxPunctuation": {
      "dark": "gray1000",
      "light": "lightGray1000"
    }
  }
}
const vesper = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "vesperBg": "#101010",
    "vesperFg": "#FFF",
    "vesperComment": "#8b8b8b",
    "vesperKeyword": "#A0A0A0",
    "vesperFunction": "#FFC799",
    "vesperString": "#99FFE4",
    "vesperNumber": "#FFC799",
    "vesperError": "#FF8080",
    "vesperWarning": "#FFC799",
    "vesperSuccess": "#99FFE4",
    "vesperMuted": "#A0A0A0"
  },
  "theme": {
    "primary": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "secondary": {
      "dark": "#99FFE4",
      "light": "#99FFE4"
    },
    "accent": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "error": {
      "dark": "vesperError",
      "light": "vesperError"
    },
    "warning": {
      "dark": "vesperWarning",
      "light": "vesperWarning"
    },
    "success": {
      "dark": "vesperSuccess",
      "light": "vesperSuccess"
    },
    "info": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "text": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "textMuted": {
      "dark": "vesperMuted",
      "light": "vesperMuted"
    },
    "background": {
      "dark": "vesperBg",
      "light": "#FFF"
    },
    "backgroundPanel": {
      "dark": "vesperBg",
      "light": "#F0F0F0"
    },
    "backgroundElement": {
      "dark": "vesperBg",
      "light": "#E0E0E0"
    },
    "border": {
      "dark": "#282828",
      "light": "#D0D0D0"
    },
    "borderActive": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "borderSubtle": {
      "dark": "#1C1C1C",
      "light": "#E8E8E8"
    },
    "diffAdded": {
      "dark": "vesperSuccess",
      "light": "vesperSuccess"
    },
    "diffRemoved": {
      "dark": "vesperError",
      "light": "vesperError"
    },
    "diffContext": {
      "dark": "vesperMuted",
      "light": "vesperMuted"
    },
    "diffHunkHeader": {
      "dark": "vesperMuted",
      "light": "vesperMuted"
    },
    "diffHighlightAdded": {
      "dark": "vesperSuccess",
      "light": "vesperSuccess"
    },
    "diffHighlightRemoved": {
      "dark": "vesperError",
      "light": "vesperError"
    },
    "diffAddedBg": {
      "dark": "#0d2818",
      "light": "#e8f5e8"
    },
    "diffRemovedBg": {
      "dark": "#281a1a",
      "light": "#f5e8e8"
    },
    "diffContextBg": {
      "dark": "vesperBg",
      "light": "#F8F8F8"
    },
    "diffLineNumber": {
      "dark": "textMuted",
      "light": "#6a6a6a"
    },
    "diffAddedLineNumberBg": {
      "dark": "#0d2818",
      "light": "#e8f5e8"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#281a1a",
      "light": "#f5e8e8"
    },
    "markdownText": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "markdownHeading": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "markdownLink": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "markdownLinkText": {
      "dark": "vesperMuted",
      "light": "vesperMuted"
    },
    "markdownCode": {
      "dark": "vesperMuted",
      "light": "vesperMuted"
    },
    "markdownBlockQuote": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "markdownEmph": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "markdownStrong": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "markdownHorizontalRule": {
      "dark": "#65737E",
      "light": "#65737E"
    },
    "markdownListItem": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "markdownListEnumeration": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "markdownImage": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "markdownImageText": {
      "dark": "vesperMuted",
      "light": "vesperMuted"
    },
    "markdownCodeBlock": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "syntaxComment": {
      "dark": "vesperComment",
      "light": "vesperComment"
    },
    "syntaxKeyword": {
      "dark": "vesperKeyword",
      "light": "vesperKeyword"
    },
    "syntaxFunction": {
      "dark": "vesperFunction",
      "light": "vesperFunction"
    },
    "syntaxVariable": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "syntaxString": {
      "dark": "vesperString",
      "light": "vesperString"
    },
    "syntaxNumber": {
      "dark": "vesperNumber",
      "light": "vesperNumber"
    },
    "syntaxType": {
      "dark": "vesperFunction",
      "light": "vesperFunction"
    },
    "syntaxOperator": {
      "dark": "vesperKeyword",
      "light": "vesperKeyword"
    },
    "syntaxPunctuation": {
      "dark": "vesperFg",
      "light": "vesperBg"
    }
  }
}
const zenburn = {
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "bg": "#3f3f3f",
    "bgAlt": "#4f4f4f",
    "bgPanel": "#5f5f5f",
    "fg": "#dcdccc",
    "fgMuted": "#9f9f9f",
    "red": "#cc9393",
    "redBright": "#dca3a3",
    "green": "#7f9f7f",
    "greenBright": "#8fb28f",
    "yellow": "#f0dfaf",
    "yellowDim": "#e0cf9f",
    "blue": "#8cd0d3",
    "blueDim": "#7cb8bb",
    "magenta": "#dc8cc3",
    "cyan": "#93e0e3",
    "orange": "#dfaf8f"
  },
  "theme": {
    "primary": {
      "dark": "blue",
      "light": "#5f7f8f"
    },
    "secondary": {
      "dark": "magenta",
      "light": "#8f5f8f"
    },
    "accent": {
      "dark": "cyan",
      "light": "#5f8f8f"
    },
    "error": {
      "dark": "red",
      "light": "#8f5f5f"
    },
    "warning": {
      "dark": "yellow",
      "light": "#8f8f5f"
    },
    "success": {
      "dark": "green",
      "light": "#5f8f5f"
    },
    "info": {
      "dark": "orange",
      "light": "#8f7f5f"
    },
    "text": {
      "dark": "fg",
      "light": "#3f3f3f"
    },
    "textMuted": {
      "dark": "fgMuted",
      "light": "#6f6f6f"
    },
    "background": {
      "dark": "bg",
      "light": "#ffffef"
    },
    "backgroundPanel": {
      "dark": "bgAlt",
      "light": "#f5f5e5"
    },
    "backgroundElement": {
      "dark": "bgPanel",
      "light": "#ebebdb"
    },
    "border": {
      "dark": "#5f5f5f",
      "light": "#d0d0c0"
    },
    "borderActive": {
      "dark": "blue",
      "light": "#5f7f8f"
    },
    "borderSubtle": {
      "dark": "#4f4f4f",
      "light": "#e0e0d0"
    },
    "diffAdded": {
      "dark": "green",
      "light": "#5f8f5f"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "#8f5f5f"
    },
    "diffContext": {
      "dark": "fgMuted",
      "light": "#6f6f6f"
    },
    "diffHunkHeader": {
      "dark": "cyan",
      "light": "#5f8f8f"
    },
    "diffHighlightAdded": {
      "dark": "greenBright",
      "light": "#5f8f5f"
    },
    "diffHighlightRemoved": {
      "dark": "redBright",
      "light": "#8f5f5f"
    },
    "diffAddedBg": {
      "dark": "#4f5f4f",
      "light": "#efffef"
    },
    "diffRemovedBg": {
      "dark": "#5f4f4f",
      "light": "#ffefef"
    },
    "diffContextBg": {
      "dark": "bgAlt",
      "light": "#f5f5e5"
    },
    "diffLineNumber": {
      "dark": "#d2d2d2",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "#4f5f4f",
      "light": "#efffef"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#5f4f4f",
      "light": "#ffefef"
    },
    "markdownText": {
      "dark": "fg",
      "light": "#3f3f3f"
    },
    "markdownHeading": {
      "dark": "yellow",
      "light": "#8f8f5f"
    },
    "markdownLink": {
      "dark": "blue",
      "light": "#5f7f8f"
    },
    "markdownLinkText": {
      "dark": "cyan",
      "light": "#5f8f8f"
    },
    "markdownCode": {
      "dark": "green",
      "light": "#5f8f5f"
    },
    "markdownBlockQuote": {
      "dark": "fgMuted",
      "light": "#6f6f6f"
    },
    "markdownEmph": {
      "dark": "yellowDim",
      "light": "#8f8f5f"
    },
    "markdownStrong": {
      "dark": "orange",
      "light": "#8f7f5f"
    },
    "markdownHorizontalRule": {
      "dark": "fgMuted",
      "light": "#6f6f6f"
    },
    "markdownListItem": {
      "dark": "blue",
      "light": "#5f7f8f"
    },
    "markdownListEnumeration": {
      "dark": "cyan",
      "light": "#5f8f8f"
    },
    "markdownImage": {
      "dark": "blue",
      "light": "#5f7f8f"
    },
    "markdownImageText": {
      "dark": "cyan",
      "light": "#5f8f8f"
    },
    "markdownCodeBlock": {
      "dark": "fg",
      "light": "#3f3f3f"
    },
    "syntaxComment": {
      "dark": "#7f9f7f",
      "light": "#5f7f5f"
    },
    "syntaxKeyword": {
      "dark": "yellow",
      "light": "#8f8f5f"
    },
    "syntaxFunction": {
      "dark": "blue",
      "light": "#5f7f8f"
    },
    "syntaxVariable": {
      "dark": "fg",
      "light": "#3f3f3f"
    },
    "syntaxString": {
      "dark": "red",
      "light": "#8f5f5f"
    },
    "syntaxNumber": {
      "dark": "greenBright",
      "light": "#5f8f5f"
    },
    "syntaxType": {
      "dark": "cyan",
      "light": "#5f8f8f"
    },
    "syntaxOperator": {
      "dark": "yellow",
      "light": "#8f8f5f"
    },
    "syntaxPunctuation": {
      "dark": "fg",
      "light": "#3f3f3f"
    }
  }
}

const SYSTEM_THEME = 'system'

const THEMES = {
  "aura": aura,
  "ayu": ayu,
  "carbonfox": carbonfox,
  "catppuccin-frappe": catppuccin_frappe,
  "catppuccin-macchiato": catppuccin_macchiato,
  "catppuccin": catppuccin,
  "cobalt2": cobalt2,
  "cursor": cursor,
  "dracula": dracula,
  "everforest": everforest,
  "flexoki": flexoki,
  "github": github,
  "gruvbox": gruvbox,
  "kanagawa": kanagawa,
  "lucent-orng": lucent_orng,
  "material": material,
  "matrix": matrix,
  "mercury": mercury,
  "monokai": monokai,
  "nightowl": nightowl,
  "nord": nord,
  "one-dark": one_dark,
  "opencode": opencode,
  "orng": orng,
  "osaka-jade": osaka_jade,
  "palenight": palenight,
  "rosepine": rosepine,
  "solarized": solarized,
  "synthwave84": synthwave84,
  "tokyonight": tokyonight,
  "vercel": vercel,
  "vesper": vesper,
  "zenburn": zenburn,
}

// 字母序完整清单（含 system，与 opencode 选择器一致）
function listThemes() {
  return Object.keys(THEMES).concat(SYSTEM_THEME).sort(function (a, b) { return a.localeCompare(b) })
}

function getThemeJson(name) {
  return THEMES[name] || null
}

function isSystem(name) {
  return name === SYSTEM_THEME
}

function countStatic() {
  return Object.keys(THEMES).length
}
__mods["registry"] = { SYSTEM_THEME, listThemes, getThemeJson, isSystem, countStatic }
})();
(function () {
// grouping.mjs — 色系分组：按主题主色色相将 34 个主题分到色系组
// 组合 1 布局依赖：组标题（色点+名称+数量）+ 组内 mini 芯片
// 纯逻辑、无 DOM，node 可直接测试
const { getThemeJson, isSystem, listThemes } = __mods["registry"]
const { resolveThemeColors, hexToRgb } = __mods["resolve"]

// 色系顺序与代表色（组标题色点/色带）
// 组 key 为语言中立 slug（显示名由运行时 i18n 翻译表提供）
const GROUP_ORDER = ['warm', 'yellow-green', 'teal', 'cyan-blue', 'cool-blue', 'violet', 'neutral', 'transparent', 'special']
const GROUP_COLORS = {
  warm: '#FAB283',
  'yellow-green': '#A7C080',
  teal: '#2DD5B7',
  'cyan-blue': '#88C0D0',
  'cool-blue': '#82AAFF',
  violet: '#C4A7E7',
  neutral: '#9E9E9E',
  transparent: '#8B8B95',
  special: '#8B8B95',
}

// 色相：hex → 0-360；中性（低饱和/无色）→ -2；无值 → -1
function hueOf(hex) {
  if (!hex) return -1
  const { r, g, b } = hexToRgb(hex)
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const d = max - min
  if (d === 0) return -2
  const rr = r / 255, gg = g / 255, bb = b / 255
  let h
  if (max === rr) h = ((gg - bb) / d) % 6
  else if (max === gg) h = (bb - rr) / d + 2
  else h = (rr - gg) / d + 4
  h *= 60
  if (h < 0) h += 360
  if (max === 0 ? 0 : d / max < 0.18) return -2
  return h
}

function groupOf(name, colors) {
  if (isSystem(name)) return 'special'
  if (colors.background === null) return 'transparent'
  const h = hueOf(colors.primary)
  if (h === -2) return 'neutral'
  if (h < 35) return 'warm'
  if (h < 90) return 'yellow-green'
  if (h < 160) return 'teal'
  if (h < 200) return 'cyan-blue'
  if (h < 230) return 'cool-blue'
  return 'violet'
}

// 解析单个主题的预览关键色（transparent → null）
function resolvePreview(name) {
  if (isSystem(name)) {
    return { background: null, text: null, primary: null, accent: null, error: null, warning: null, success: null }
  }
  const json = getThemeJson(name)
  if (!json) return null
  const c = resolveThemeColors(json, 'dark')
  const pick = (k) => {
    const v = c[k]
    if (v && typeof v === 'object' && v.__error) return null
    return v === 'transparent' ? null : v
  }
  return {
    background: pick('background'),
    text: pick('text'),
    primary: pick('primary'),
    accent: pick('accent'),
    error: pick('error'),
    warning: pick('warning'),
    success: pick('success'),
  }
}

// 完整分组结果：按 GROUP_ORDER 输出非空组，组内含每主题预览色
function themeGroups() {
  const buckets = {}
  for (const name of listThemes()) {
    const colors = resolvePreview(name)
    const g = groupOf(name, colors)
    ;(buckets[g] = buckets[g] || []).push({ name: name, colors: colors })
  }
  return GROUP_ORDER
    .filter((g) => buckets[g])
    .map((g) => ({ name: g, color: GROUP_COLORS[g], themes: buckets[g] }))
}

__mods["grouping"] = { GROUP_ORDER, GROUP_COLORS, hueOf, groupOf, resolvePreview, themeGroups }
})();
(function () {
// index.mjs — ThemeEngine 门面：注册表 + 解析 + 生成 的对外唯一入口
const { listThemes, getThemeJson, isSystem, SYSTEM_THEME, countStatic } = __mods["registry"]
const { resolveThemeColors, collectErrors } = __mods["resolve"]
const { generateTheme } = __mods["generate"]
const { themeGroups, GROUP_ORDER, GROUP_COLORS, resolvePreview } = __mods["grouping"]

const DARK = 'dark'

// 渲染一个主题 → { tokens, css, meta }
function renderTheme(name, typography) {
  if (isSystem(name)) {
    return generateTheme(null, typography || {}, SYSTEM_THEME)
  }
  const json = getThemeJson(name)
  if (!json) throw new Error('未知主题: ' + String(name))
  const colors = resolveThemeColors(json, DARK)
  const errors = collectErrors(colors)
  if (errors.length > 0) {
    console.warn('[dsh-opencode-palette] ' + name + ' 有 ' + errors.length + ' 个色位解析失败:', errors)
  }
  return generateTheme(colors, typography || {}, name)
}

// 解析主题的关键色（面板预览用）：透明 → null（实现收敛到 grouping.resolvePreview）
function previewColors(name) {
  return resolvePreview(name)
}

function themeNames() { return listThemes() }
function themeStats() { return { static: countStatic(), total: listThemes().length } }

// 完整自检（测试/诊断用）：解析全部主题，报告失败清单
function auditAll() {
  const report = { ok: [], broken: [] }
  for (const name of listThemes()) {
    if (isSystem(name)) { report.ok.push(name); continue }
    const json = getThemeJson(name)
    const colors = resolveThemeColors(json, DARK)
    const errors = collectErrors(colors)
    if (errors.length > 0) report.broken.push(name + ': ' + errors.join(' | '))
    else report.ok.push(name)
  }
  return report
}
__mods["index"] = { renderTheme, previewColors, themeNames, themeGroups, GROUP_ORDER, GROUP_COLORS, themeStats, auditAll }
})();
(function () {
// runtime/client.mjs — 浏览器运行时：注入/热切换/持久化/设置面板（组合 1 布局）
// 布局：标题行 → 排印调节（顶部）→ 主题选择（色系分组标签 + mini 芯片）→ 状态开关
// 依赖注入：theme（dsh-client-ui-theme）、slots（settings.plugins.tab / tool.view.cordis）
const { renderTheme, previewColors, themeNames, themeGroups } = __mods["index"]
const { FONTS, SANS_STACK } = __mods["map-dsh"]

const STORAGE_KEY = 'dsh.opencode-palette.v2'
// 兼容迁移：旧插件（dsh-opencode-tui-theme）的本地设置键，读到即迁移到新键
const LEGACY_STORAGE_KEY = 'dsh.opencode-tui-theme.v2'
const DEFAULT_STATE = { enabled: true, theme: 'opencode', mode: 'mono', size: 13, fontKey: 'JetBrains Mono' }

function getReact() {
  if (typeof require === 'function') { try { return require('react') } catch (e) { /* 动态版无 require */ } }
  if (typeof globalThis !== 'undefined' && globalThis.React) return globalThis.React
  return null
}

function loadState() {
  try {
    // 新键优先；旧插件（dsh-opencode-tui-theme）的键命中则一次性迁移
    let raw = globalThis.localStorage && localStorage.getItem(STORAGE_KEY)
    if (!raw && globalThis.localStorage) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (legacy) {
        raw = legacy
        try { localStorage.setItem(STORAGE_KEY, legacy) } catch (e) { /* 忽略 */ }
      }
    }
    if (raw) {
      const s = JSON.parse(raw)
      return { ...DEFAULT_STATE, ...s }
    }
  } catch (e) { /* 存储不可用则用默认 */ }
  return { ...DEFAULT_STATE }
}

function saveState(state) {
  try {
    if (globalThis.localStorage) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) { /* 忽略持久化失败 */ }
}
// ── i18n：面板文案双语表（跟随 DSH 界面语言，html[lang] 为信号源）──
const I18N = {
  panelName: { zh: 'OpenCode 调色板', en: 'Opencode Palette' },
  subtitle: { zh: '34 款 opencode 官方配色主题，点击即切换', en: '34 official opencode themes — click to switch' },
  enabled: { zh: '已启用', en: 'Enabled' },
  disabled: { zh: '已停用', en: 'Disabled' },
  disableTitle: { zh: '点击停用主题', en: 'Click to disable' },
  enableTitle: { zh: '点击启用主题', en: 'Click to enable' },
  typography: { zh: '字体字号', en: 'Typography' },
  bodyStyle: { zh: '正文样式', en: 'Body style' },
  mono: { zh: '等宽（终端风）', en: 'Monospace (terminal)' },
  sans: { zh: '常规（界面风）', en: 'Regular (UI)' },
  fontSize: { zh: '字号', en: 'Font size' },
  codeFont: { zh: '代码字体', en: 'Code font' },
  fontPreview: { zh: '等宽', en: 'mono' },
  themeSection: { zh: '选择主题', en: 'Themes' },
  themeCount: { zh: '34 款 · 按色系分组', en: '34 · by color family' },
  search: { zh: '搜索主题…', en: 'Search themes…' },
  noMatch: { zh: '未找到匹配的主题', en: 'No matching themes' },
  systemDefault: { zh: 'system（默认）', en: 'system (default)' },
  'group.warm': { zh: '暖橙', en: 'Warm' },
  'group.yellow-green': { zh: '黄绿', en: 'Yellow-green' },
  'group.teal': { zh: '青绿', en: 'Teal' },
  'group.cyan-blue': { zh: '青蓝', en: 'Cyan-blue' },
  'group.cool-blue': { zh: '冷蓝', en: 'Cool blue' },
  'group.violet': { zh: '蓝紫', en: 'Violet' },
  'group.neutral': { zh: '中性', en: 'Neutral' },
  'group.transparent': { zh: '透明', en: 'Transparent' },
  'group.special': { zh: '特殊', en: 'Special' },
}

// 语言检测：html[lang] 优先，回退浏览器语言
function getLang() {
  try {
    const l = (document.documentElement && document.documentElement.lang) || (navigator.language || 'en')
    return /^zh/i.test(l) ? 'zh' : 'en'
  } catch (e) { return 'en' }
}


// 生成注入物并注入：token 层 + <style> 层；幂等（先清后注入）
function createClient(slotTarget) {
  return function apply(ctx) {
    const theme = ctx.get('theme')
    const slots = ctx.get('slots')

    let state = loadState()
    let tokenDispose = null
    let styleTag = null

    // ── i18n 运行时：语言跟随 DSH（html[lang] 变化即通知面板重渲染）──
    let currentLang = getLang()
    const localeListeners = []
    function tr(key) { const e = I18N[key]; return e ? e[currentLang] : key }
    function notifyLocale() {
      const next = getLang()
      if (next === currentLang) return
      currentLang = next
      for (const fn of localeListeners) { try { fn() } catch (e) { /* 忽略 */ } }
    }
    let localeObserver = null
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined' && document.documentElement) {
      localeObserver = new MutationObserver(notifyLocale)
      localeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
    }

    function safeThemeName(name) {
      const names = themeNames()
      return names.indexOf(name) >= 0 ? name : DEFAULT_STATE.theme
    }

    function applyStyle() {
      if (!theme) return
      // 1) 先清理旧注入（幂等）
      if (tokenDispose) { try { tokenDispose() } catch (e) { /* 忽略 */ } tokenDispose = null }
      // 2) 完整重生成
      let render
      try {
        render = renderTheme(safeThemeName(state.theme), {
          mode: state.mode, size: state.size, fontKey: state.fontKey,
        })
      } catch (e) {
        console.error('[dsh-opencode-palette] 渲染失败，回退默认主题:', e)
        render = renderTheme(DEFAULT_STATE.theme, { mode: 'mono', size: 13, fontKey: 'JetBrains Mono' })
      }
      // 3) token 层（{light,dark} 同值 = 强制深色终端观感）
      tokenDispose = theme.overrideTokens('opencode-palette', render.tokens)
      // 4) <style> 层
      if (styleTag === null && typeof document !== 'undefined') {
        styleTag = document.createElement('style')
        styleTag.dataset.plugin = 'dsh-opencode-palette'
        document.head.appendChild(styleTag)
      }
      if (styleTag) styleTag.textContent = render.css
      return render.meta
    }

    function clearStyle() {
      if (tokenDispose) { try { tokenDispose() } catch (e) { /* 忽略 */ } tokenDispose = null }
      if (styleTag !== null && styleTag.parentNode) {
        styleTag.parentNode.removeChild(styleTag)
      }
      styleTag = null
    }

    // ── 面板 API（与 React 组件共享）──
    function getState() { return { ...state } }
    function setTheme(name) {
      state = { ...state, theme: safeThemeName(name) }
      saveState(state)
      if (state.enabled) applyStyle()
    }
    function setTypography(next) {
      state = { ...state, ...next }
      saveState(state)
      if (state.enabled) applyStyle()
    }
    function toggle() {
      state = { ...state, enabled: !state.enabled }
      saveState(state)
      if (state.enabled) applyStyle(); else clearStyle()
    }
    function refresh(nextMode, nextSize, nextFont) {
      setTypography({ mode: nextMode, size: nextSize, fontKey: nextFont })
    }

    // 启动：默认启用（与 v1.1.0 一致）
    if (state.enabled) applyStyle()

    // 调试钩子（控制台可用）
    if (typeof globalThis !== 'undefined') {
      globalThis.__opencodePalette = {
        getState: getState,
        setTheme: setTheme,
        toggle: toggle,
        list: themeNames,
        previews: function () { return themeNames().map(function (n) { return { name: n, colors: previewColors(n) } }) },
      }
    }

    // ── 设置面板（组合 1：排印置顶 + 色系分组标签 + mini 芯片）──
    let disposePanel = null
    if (slots !== undefined && typeof document !== 'undefined') {
      const Panel = function (props) {
        const react = getReact()
        const h = react.createElement
        const [query, setQuery] = react.useState('')
        const [fontOpen, setFontOpen] = react.useState(false)
        const [sizeOpen, setSizeOpen] = react.useState(false)
        const fontRef = react.useRef(null)
        const sizeRef = react.useRef(null)
        // UI 快照：所有引擎动作后 setUi(props.getState()) 重同步，避免受控控件显示值漂移
        const [ui, setUi] = react.useState(props.getState())
        const st = ui

        // 字体下拉：点击外部关闭
        react.useEffect(function () {
          if (!fontOpen && !sizeOpen) return
          function onDoc(e) {
            if (fontRef.current && !fontRef.current.contains(e.target)) setFontOpen(false)
            if (sizeRef.current && !sizeRef.current.contains(e.target)) setSizeOpen(false)
          }
          document.addEventListener('mousedown', onDoc)
          return function () { document.removeEventListener('mousedown', onDoc) }
        }, [fontOpen, sizeOpen])

        // 语言切换：DSH 界面语言变化时重渲染（文案跟随）
        react.useEffect(function () {
          return props.subscribeLocale(function () { setUi(props.getState()) })
        }, [])

        // 搜索过滤（命中组保留，空组隐藏）
        const q = query.trim().toLowerCase()
        const shown = q === ''
          ? props.groups()
          : props.groups()
              .map(function (g) { return { name: g.name, color: g.color, themes: g.themes.filter(function (t) { return t.name.indexOf(q) >= 0 }) } })
              .filter(function (g) { return g.themes.length > 0 })

        const muted = 'var(--dsw-alias-label-secondary)'
        const base = 'var(--dsw-alias-label-primary)'
        const fieldLabel = { fontSize: 11, color: muted }
        const secTitle = { fontSize: 11, color: muted, letterSpacing: '.08em', marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 8 }
        const countStyle = { color: 'var(--dsw-alias-label-dimmed)', fontSize: 11, letterSpacing: 0 }

        // 分段按钮控件
        const seg = function (value, options, onChange) {
          return h('div', { style: { display: 'inline-flex', background: 'var(--dsw-alias-bg-layer-2)', border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 6, padding: 2, gap: 2 } },
            options.map(function (opt) {
              const on = opt.value === value
              return h('button', {
                key: String(opt.value),
                onClick: function () { onChange(opt.value) },
                style: {
                  border: 0, borderRadius: 4, padding: '4px 10px', fontSize: 12, cursor: 'pointer',
                  background: on ? 'rgba(255,255,255,0.14)' : 'transparent',
                  color: on ? base : muted,
                  fontFamily: 'var(--dsw-font-family)',
                },
              }, opt.label)
            }))
        }
        // 通用下拉（字号 / 代码字体）：紧凑按钮 + 弹出菜单，对齐 setup-panel 样例
        const dd = function (open, setOpen, ref, labelNode, items) {
          return h('div', { ref: ref, style: { position: 'relative' } }, [
            h('button', {
              onClick: function () { setOpen(!open) },
              style: {
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--dsw-alias-bg-layer-2)', border: '1px solid var(--dsw-alias-border-l1)',
                borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer',
                color: base, fontFamily: 'var(--dsw-font-family)',
              },
            }, [labelNode, h('span', { style: { color: muted } }, '▾')]),
            open ? h('div', {
              style: {
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 20,
                background: 'var(--dsw-alias-bg-overlay)', border: '1px solid var(--dsw-alias-border-l1)',
                borderRadius: 8, minWidth: 200, padding: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              },
            }, items) : null,
          ])
        }
        const dot = function (color, size) {
          return h('span', { style: { width: size, height: size, borderRadius: '50%', background: color || '#555', display: 'inline-block', flex: 'none' } })
        }

        // 主题 mini 芯片（组合 1）
        const chip = function (t) {
          const isCur = t.name === st.theme
          const c = t.colors
          return h('button', {
            key: t.name,
            onClick: function () { props.setTheme(t.name); setUi(props.getState()) },
            style: {
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: c && c.background ? c.background : 'var(--dsw-alias-bg-layer-2)',
              color: c && c.text ? c.text : base,
              border: isCur ? '2px solid var(--dsw-alias-brand-primary)' : '1px solid ' + ((c && c.primary) || '#555'),
              borderRadius: 6, padding: '3px 8px 3px 5px',
              fontFamily: 'var(--ds-font-family-code)', fontSize: 11, cursor: 'pointer',
              outline: isCur ? '1px solid var(--dsw-alias-brand-primary)' : 'none',
            },
          }, [
            dot(c && c.primary, 9),
            t.name === 'system' ? tr('systemDefault') : t.name,
            isCur ? h('span', { style: { color: 'var(--dsw-alias-brand-primary)', fontWeight: 700 } }, '✓') : null,
          ])
        }



        return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 920 } }, [
          // 头行：标题 + 状态开关（一个状态一个控制）
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } }, [
            h('strong', null, '🎨 ' + tr('panelName')),
            h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 8 } }, [
              h('span', { style: { color: st.enabled ? 'var(--dsw-alias-state-success-primary)' : muted, fontSize: 12 } },
                st.enabled ? tr('enabled') : tr('disabled')),
              h('span', {
                onClick: function () { props.toggle(); setUi(props.getState()) },
                title: st.enabled ? tr('disableTitle') : tr('enableTitle'),
                style: {
                  position: 'relative', display: 'inline-block', width: 36, height: 20,
                  borderRadius: 11, cursor: 'pointer',
                  background: st.enabled ? 'rgba(250,178,131,0.4)' : '#333338',
                  transition: 'background .12s',
                },
              }, h('span', {
                style: {
                  position: 'absolute', top: 3, left: st.enabled ? 19 : 3,
                  width: 14, height: 14, borderRadius: '50%',
                  background: st.enabled ? '#FAB283' : '#8b8b95',
                  transition: 'left .12s',
                },
              })),
            ]),
          ]),
          h('div', { style: { fontSize: 12, color: muted } },
            tr('subtitle')),
          // ── 排印调节（置顶）──
          h('div', { style: secTitle }, [
            h('span', null, tr('typography')),
          ]),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } }, [
            seg(st.mode, [
              { value: 'mono', label: tr('mono') },
              { value: 'tui', label: tr('sans') },
            ], function (v) { props.refresh(v, st.size, st.fontKey); setUi(props.getState()) }),
            dd(sizeOpen, setSizeOpen, sizeRef,
              h('span', null, tr('fontSize') + ' ' + st.size + 'px'),
              [11, 12, 13, 14, 15, 16, 17, 18].map(function (s) {
                const on = s === st.size
                return h('div', {
                  key: String(s),
                  onClick: function () { props.refresh(st.mode, s, st.fontKey); setUi(props.getState()); setSizeOpen(false) },
                  style: {
                    padding: '6px 10px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
                    background: on ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: on ? base : muted,
                  },
                }, String(s) + 'px')
              })),
            dd(fontOpen, setFontOpen, fontRef,
              h('span', { style: { fontFamily: FONTS[st.fontKey] || FONTS['JetBrains Mono'] } }, st.fontKey),
              Object.keys(FONTS).map(function (k) {
                const on = k === st.fontKey
                return h('div', {
                  key: k,
                  onClick: function () {
                    props.refresh(st.mode, st.size, k)
                    setUi(props.getState())
                    setFontOpen(false)
                  },
                  style: {
                    padding: '6px 10px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
                    background: on ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: on ? base : muted,
                  },
                }, h('span', { style: { fontFamily: FONTS[k] } }, k + ' — Aa ' + tr('fontPreview')))
              })),
          ]),
          // ── 主题选择（色系分组标签 + mini 芯片）──
          h('div', { style: secTitle }, [
            h('span', null, tr('themeSection')),
            h('span', { style: countStyle }, tr('themeCount')),
          ]),
          h('input', {
            placeholder: tr('search'),
            value: query,
            onChange: function (e) { setQuery(e.target.value) },
            style: {
              width: '100%', maxWidth: 380,
              background: 'var(--dsw-alias-bg-layer-2)', border: '1px solid var(--dsw-alias-border-l1)',
              borderRadius: 6, padding: '7px 12px', fontSize: 13, outline: 'none',
              color: base, fontFamily: 'var(--dsw-font-family)',
            },
          }),
          shown.length === 0
            ? h('div', { style: { ...fieldLabel, padding: '8px 0' } }, tr('noMatch'))
            : shown.map(function (g) {
                return h('div', { key: g.name, style: { marginBottom: 10 } }, [
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--dsw-alias-label-tertiary)', marginBottom: 6 } }, [
                    dot(g.color, 8),
                    tr('group.' + g.name),
                    h('span', { style: countStyle }, String(g.themes.length)),
                  ]),
                  h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, g.themes.map(chip)),
                ])
              }),
        ])
      }
      disposePanel = slots.inject(slotTarget, function () {
        return slots.register({
          name: slotTarget,
          id: 'opencode-palette',
          order: 30,
          label: function () { return tr('panelName') },
          inject: function () {
            return {
              getState: getState,
              toggle: toggle,
              refresh: refresh,
              setTheme: setTheme,
              themeNames: themeNames,
              groups: function () { return themeGroups() },
              subscribeLocale: function (fn) {
                localeListeners.push(fn)
                return function () {
                  const i = localeListeners.indexOf(fn)
                  if (i >= 0) localeListeners.splice(i, 1)
                }
              },
              previews: function () { return themeNames().map(function (n) { return { name: n, colors: previewColors(n) } }) },
            }
          },
        }, Panel)
      })
    }

    // 卸载清理（cordis 语义：effect fn 立即执行，返回值才是清理器）
    ctx.effect(function () {
      return function () {
        try { clearStyle() } catch (e) { /* 忽略 */ }
        try { if (disposePanel) disposePanel() } catch (e) { /* 忽略 */ }
        try { if (globalThis.__opencodePalette) delete globalThis.__opencodePalette } catch (e) { /* 忽略 */ }
        try { if (localeObserver) localeObserver.disconnect() } catch (e) { /* 忽略 */ }
      }
    }, 'dsh-opencode-palette: styles')
  }
}

__mods["client"] = { createClient }
})();
    exports.inject = ["theme","slots"]
    exports.apply = __mods["client"].createClient("settings.plugins.tab")
    return module.exports
  },
})
