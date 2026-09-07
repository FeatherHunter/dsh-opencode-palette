// map-dsh.mjs — ★ 单一真相源：opencode 主题语义色位 → DSH 界面 CSS 变量/元素规则
// DSH 升级改 CSS 变量名时，只需要改这一个文件。
// 值 = opencode 色位名；generate.mjs 负责取值与派生（提亮/透明/对比色）。

import { shade, withAlpha, contrastText } from './resolve.mjs'

// 派生 token 的 helpers 来自 resolve.mjs（shade/withAlpha/contrastText）

// ── 1. token 层：theme.overrideTokens 注册的 --dsw-alias-* 变量 ──
// 格式: [DSH 变量, 来源色位]（来源缺失/透明/解析失败 → 该 token 自动跳过，不污染）
// 高度梯子（第一性原理：opencode background/backgroundPanel/backgroundElement 本就是
// 深色 step1<step2<step3 台阶，与 DSH base<panel<element 浮起方向一致）：
//   step1 页面底 ← DSH 950 级（base/sidebar/unselected）；
//   step2 中层 ← DSH 850 级（tag/placeholder/bubble/multi-select 芯片）；
//   step3 浮起 ← DSH 750~800 级（citation/banner/toast/tooltip/tip/selector）。
export const TOKEN_MAP = [
  // 页面底：step1（DSH 深色 900~950 级：base/sidebar/unselected）
  ['--dsw-alias-bg-base', 'background'],
  ['--dsw-alias-bg-layer-1', 'background'],
  ['--dsw-alias-bg-layer-2', 'background'],
  ['--dsw-alias-bg-overlay', 'background'],
  ['--dsw-alias-bg-layer-3', 'background'],
  ['--dsw-specific-sidebar-fill', 'background'],
  ['--dsw-specific-menu', 'background'],
  ['--dsw-alias-markdown-code-segment-unselected', 'background'],
  ['--dsw-alias-markdown-code-segment-selected', 'backgroundElement'],
  // 中层芯片：step2（DSH 深色 850 级：tag/placeholder/bubble/multi-select）
  ['--dsw-alias-markdown-tag', 'backgroundPanel'],
  ['--dsw-alias-markdown-placeholder', 'backgroundPanel'],
  ['--dsw-specific-bubble', 'backgroundPanel'],
  ['--dsw-alias-bg-multi-select', 'backgroundPanel'],
  // 浮起面：step3（DSH 深色 750~800 级：citation/banner/toast/tooltip/tip/selector）
  ['--dsw-alias-markdown-citation', 'backgroundElement'],
  ['--dsw-alias-bg-module-platform', 'backgroundElement'],
  ['--dsw-specific-selector', 'backgroundElement'],
  ['--dsw-specific-tip', 'backgroundElement'],
  ['--dsw-specific-bubble-highlight', 'backgroundElement'],
  // 输入框/代码块底 = backgroundPanel；横幅/按钮面 = backgroundElement
  ['--dsw-specific-input-major', 'backgroundPanel'],
  ['--dsw-specific-login-input', 'backgroundPanel'],
  ['--dsw-alias-markdown-code-block', 'backgroundPanel'],
  ['--dsw-alias-markdown-code-block-banner', 'backgroundElement'],
  ['--dsw-alias-toast-bg', 'backgroundElement'],
  ['--dsw-alias-tooltip-bg', 'backgroundElement'],
  ['--dsw-alias-button-elevated-fill', 'backgroundPanel'],
  ['--dsw-alias-button-floating-fill', 'backgroundPanel'],
  // 文字层级
  ['--dsw-alias-label-primary', 'text'],
  ['--dsw-alias-label-primary-dimmed', 'text'],
  ['--dsw-alias-label-secondary', 'textMuted'],
  ['--dsw-alias-label-tertiary', 'textMuted'],
  ['--dsw-alias-label-caption', 'textMuted'],
  ['--dsw-alias-label-primary-bluish', 'markdownLink'],
  // 品牌与状态（含旧报告 R2/R3 修复后迁入派生的 invert/dimmed/ghost，见 §2）
  ['--dsw-alias-brand-primary', 'primary'],
  ['--dsw-alias-brand-text', 'primary'],
  ['--dsw-alias-button-primary-fill', 'primary'],
  ['--dsw-alias-button-info-fill', 'info'],
  ['--dsw-alias-button-contrast-fill', 'text'],
  ['--dsw-alias-state-error-primary', 'error'],
  ['--dsw-alias-state-warn-primary', 'warning'],
  ['--dsw-alias-state-warn-label', 'warning'],
  ['--dsw-alias-state-success-primary', 'success'],
  ['--dsw-alias-state-business-primary', 'primary'],
  // 边框（DSH 深色 l3/l4 = 白 16%/20% 强边框 → 主题 borderActive）
  ['--dsw-alias-border-l1', 'border'],
  ['--dsw-alias-border-l2', 'borderActive'],
  ['--dsw-alias-border-l2-darkmode-thin', 'borderActive'],
  ['--dsw-alias-border-l3', 'borderActive'],
  ['--dsw-alias-border-l4', 'borderActive'],
  ['--dsw-alias-button-ghost-active-border', 'borderActive'],
  // 内联代码无芯片（opencode TUI 风格，固定 transparent）
  ['--dsw-alias-markdown-inline-code', '__transparent__'],
]

// ── 2. 派生 token：值不是直接取自色位，而是按规则计算 ──
// 格式: [DSH 变量, 计算函数(colors) → 值]（colors = resolveThemeColors 输出）
export const DERIVED_TOKENS = [
  ['--dsw-alias-button-primary-hover', (c) => shade(c.primary, 0.12)],
  ['--dsw-alias-button-info-hover', (c) => shade(c.info, 0.12)],
  ['--dsw-alias-label-primary-inverted', (c) => contrastText(c.text)],
  ['--dsw-alias-label-primary-foreground', (c) => contrastText(c.primary)],
  // R3 修复：brand 底上的字 = 主色的反色（旧值裸 text 在主色偏深时不可读）
  ['--dsw-alias-brand-primary-invert', (c) => contrastText(c.primary)],
  // R2 修复：dimmed/ghost 是主色/文字的弱填充，不是中性输入框底
  ['--dsw-alias-button-primary-dimmed', (c) => withAlpha(c.primary, 0.2)],
  ['--dsw-alias-button-ghost-active-fill', (c) => withAlpha(c.text, 0.1)],
  // 骨架屏：DSH 深色 #ffffff14（白 8%）→ 文字 8% 透明
  ['--dsw-alias-bg-skeleton', (c) => withAlpha(c.text, 0.08)],
  // 状态 secondary = 主色提亮（DSH 深色 red/green/amber-400，即更亮的同色）
  ['--dsw-alias-state-error-secondary', (c) => shade(c.error, 0.25)],
  ['--dsw-alias-state-success-secondary', (c) => shade(c.success, 0.25)],
  ['--dsw-alias-state-warn-secondary', (c) => shade(c.warning, 0.25)],
  // 状态 tertiary = 同色弱底（DSH 深色 green/amber-900 暗饱和底 ≈ 主题色 14% 透明）
  ['--dsw-alias-state-success-tertiary', (c) => withAlpha(c.success, 0.14)],
  ['--dsw-alias-state-warn-tertiary', (c) => withAlpha(c.warning, 0.14)],
  ['--dsw-alias-state-business-tertiary', (c) => withAlpha(c.primary, 0.12)],
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
  // 侧边栏/设置面板导航项悬停与选中：DSH 默认随明暗模式取浅/深两套值，
  // 调色板未覆盖时在浅色系统（无 data-ds-dark-theme）下会白字撞浅底
  ['--dsw-specific-sidebar-nav-item-hover', (c) => withAlpha(c.text, 0.08)],
  ['--dsw-specific-sidebar-nav-item-active', (c) => withAlpha(c.text, 0.14)],
  ['--dsw-specific-sidebar-nav-item-active-accent', (c) => withAlpha(c.primary, 0.35)],
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
// 回退栈按可用性排序：自选 > 随包 OFL > 私有本地检测（SF Mono/Consolas 沉底）> 系统 > CJK；
// SANS 栈顶为 Inter（opencode 桌面端 UI 字体，OFL 随包），失败即回退宿主原生栈。
export const SANS_STACK = [
  "'Inter'", '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", "'PingFang SC'",
  "'Hiragino Sans GB'", "'Microsoft YaHei'", "'Helvetica Neue'", 'Helvetica', 'Arial', 'sans-serif',
].join(', ')

export const FONTS = {
  'JetBrains Mono': "'JetBrains Mono','Fira Code','Cascadia Code','IBM Plex Mono','SF Mono',Consolas,Menlo,'Liberation Mono','Courier New','PingFang SC','Microsoft YaHei'",
  'Cascadia Code': "'Cascadia Code','JetBrains Mono','Fira Code','IBM Plex Mono','SF Mono',Consolas,'Courier New','PingFang SC','Microsoft YaHei'",
  'Fira Code': "'Fira Code','JetBrains Mono','Cascadia Code','IBM Plex Mono','SF Mono',Consolas,'Courier New','PingFang SC','Microsoft YaHei'",
  'IBM Plex Mono': "'IBM Plex Mono','JetBrains Mono','Fira Code','Cascadia Code','SF Mono',Consolas,'Courier New','PingFang SC','Microsoft YaHei'",
  'SF Mono': "'SF Mono','JetBrains Mono','Fira Code','Cascadia Code','IBM Plex Mono',Consolas,'Courier New','PingFang SC','Microsoft YaHei'",
  'Consolas': "Consolas,'JetBrains Mono','Fira Code','Cascadia Code','IBM Plex Mono','SF Mono','Courier New','PingFang SC','Microsoft YaHei'",
}