// map-dsh.mjs — ★ 单一真相源：opencode 主题语义色位 → DSH 界面 CSS 变量/元素规则
// DSH 升级改 CSS 变量名时，只需要改这一个文件。
// 值 = opencode 色位名；generate.mjs 负责取值与派生（提亮/透明/对比色）。

// ── 1. token 层：theme.overrideTokens 注册的 --dsw-alias-* 变量 ──
// 格式: [DSH 变量, 来源色位]（来源缺失/透明/解析失败 → 该 token 自动跳过，不污染）
export const TOKEN_MAP = [
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
export const DERIVED_TOKENS = [
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
export const SHIKI_MAP = [
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
export const CSS_RULES = [
  { selector: 'body h1,body h2,body h3,body h4,body h5,body h6', prop: 'color', from: 'markdownHeading' },
  { selector: 'a', prop: 'color', from: 'markdownLink' },
  { selector: 'code:not(pre code)', prop: 'color', from: 'markdownCode' },
  { selector: 'em', prop: 'color', from: 'markdownEmph' },
  { selector: 'strong', prop: 'color', from: 'markdownStrong' },
  { selector: 'blockquote', prop: 'color', from: 'markdownBlockQuote' },
  { selector: 'hr', prop: 'borderColor', from: 'markdownHorizontalRule' },
]

// ── 5. 字体预设（主题无关维度；等宽栈尾部保留 CJK 字体避免 Windows 中文回退 SimSun）──
export const SANS_STACK = [
  '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", "'PingFang SC'",
  "'Hiragino Sans GB'", "'Microsoft YaHei'", "'Helvetica Neue'", 'Helvetica', 'Arial', 'sans-serif',
].join(', ')

export const FONTS = {
  'JetBrains Mono': "'JetBrains Mono','SF Mono','Cascadia Code','Fira Code',Menlo,Consolas,'Liberation Mono','Courier New','PingFang SC','Microsoft YaHei'",
  'Cascadia Code': "'Cascadia Code','JetBrains Mono','SF Mono','Fira Code',Consolas,'Courier New','PingFang SC','Microsoft YaHei'",
  'Fira Code': "'Fira Code','JetBrains Mono','Cascadia Code',Consolas,'Courier New','PingFang SC','Microsoft YaHei'",
  'SF Mono': "'SF Mono','JetBrains Mono','Fira Code',Consolas,'Courier New','PingFang SC','Microsoft YaHei'",
  'Consolas': "Consolas,'JetBrains Mono','Cascadia Code','Courier New','PingFang SC','Microsoft YaHei'",
}