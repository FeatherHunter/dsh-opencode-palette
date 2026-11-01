// map-dsh.ts — ★ 单一真相源：opencode 主题语义颜色 → DSH 界面 CSS 变量/元素规则
// DSH 升级改 CSS 变量名时，只需要改这一个文件。
// 值 = opencode 颜色名；generate.ts 负责取值与派生（提亮/透明/对比色）。

import { shade, withAlpha, contrastText, mixHex, readableTextOn, contrastRatio, blendOntoBase, type ResolvedColorMap } from './resolve.ts'

// 派生 token 的 helpers 来自 resolve.ts（shade/withAlpha/contrastText）

// 派生 token 的取槽助手：解析失败的颜色在历史行为里会流入 helper 被宽容处理（不抛错、由
// buildTokens 的 try/catch 兜底或原样输出），这里保持同一运行时语义，仅把类型收窄成 string。
const slot = (c: ResolvedColorMap, key: string): string => c[key] as string

// ── 1. token 层：theme.overrideTokens 注册的 --dsw-alias-* 变量 ──
// 格式: [DSH 变量, 来源颜色]（来源缺失/透明/解析失败 → 该 token 自动跳过，不污染）
// 高度梯子（第一性原理：opencode background/backgroundPanel/backgroundElement 本就是
// 深色 step1<step2<step3 台阶，与 DSH base<panel<element 浮起方向一致）：
//   step1 页面底 ← DSH 950 级（base/sidebar/unselected）；
//   step2 浮起面（中层）← DSH 850 级（tag/placeholder/bubble/multi-select 芯片）；
//   step3 浮层 ← DSH 750~800 级（citation/banner/toast/tooltip/tip/selector）。
export const TOKEN_MAP: ReadonlyArray<readonly [string, string]> = [
  // 页面底：step1（DSH 深色 900~950 级：base/sidebar/unselected）
  ['--dsw-alias-bg-base', 'background'],
  ['--dsw-alias-bg-layer-1', 'background'],
  ['--dsw-alias-bg-layer-2', 'background'],
  ['--dsw-alias-bg-overlay', 'background'],
  ['--dsw-alias-bg-layer-3', 'background'],
  ['--dsw-specific-sidebar-fill', 'sidebarBg'],
  // F3 退出：--dsw-specific-menu 不透明底杀毛玻璃（DSH 0.1.7 起半透明材料 + web-styling 禁止覆盖菜单材料）
  // 老版影响为菜单回默认、可读，不算功能回归；菜单材料/滤镜变量永不输出。
  ['--dsw-alias-markdown-code-segment-unselected', 'background'],
  ['--dsw-alias-markdown-code-segment-selected', 'backgroundElement'],
  // 浮起面（中层芯片）：step2（DSH 深色 850 级：tag/placeholder/bubble/multi-select）
  ['--dsw-alias-markdown-tag', 'backgroundPanel'],
  ['--dsw-alias-markdown-placeholder', 'backgroundPanel'],
  ['--dsw-specific-bubble', 'bubbleBg'],
  ['--dsw-alias-bg-multi-select', 'backgroundPanel'],
  // 浮层：step3（DSH 深色 750~800 级：citation/banner/toast/tooltip/tip/selector）
  ['--dsw-alias-markdown-citation', 'backgroundElement'],
  ['--dsw-alias-bg-module-platform', 'backgroundElement'],
  ['--dsw-specific-selector', 'backgroundElement'],
  ['--dsw-specific-tip', 'backgroundElement'],
  ['--dsw-specific-bubble-highlight', 'backgroundElement'],
  // 输入框/代码块底 = backgroundPanel；横幅/按钮面 = backgroundElement
  ['--dsw-specific-input-major', 'inputBg'],
  ['--dsw-specific-login-input', 'inputBg'],
  ['--dsw-alias-markdown-code-block', 'codeBlockBg'],
  ['--dsw-alias-markdown-code-block-banner', 'codeHeaderBg'],
  // F2 新头部（DSH 0.1.7 CodeCard.header 只读此变量，不读 banner token；老横幅路径保留，老版继续命中）
  ['--dsl-code-block-background', 'codeHeaderBg'],
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
  // F1 链接（上游 .markdown a 只读此变量；老 bluish/shiki-link/裸 a 规则全部保留，加法兼容）
  ['--dsw-alias-link', 'markdownLink'],
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
  // F5 新增缺口（DSH 0.1.7 rc.1/rc.2 design-platform diff 全量直配；缺槽/透明靠 usable() 跳过，不污染）
  // file-diff-* 的「底/行号槽」是背景槽、marker 是前景槽，直配即可（对比度由 ensureDiffContrast 兜底）；
  // state-idle 取中性次级（缺槽即跳过）；菜单/toast 取中性直配；
  // code-diff-added/deleted 不是前景而是**水洗底**，不能直配 diffAdded/diffRemoved，由 generate.ts
  // 在末段按最终状态色调 deriveDiffWash 派生；tooltip 键帽底不能与浮层底同值，同样走派生（#120）。
  ['--dsw-alias-file-diff-added-bg', 'diffAddedBg'],
  ['--dsw-alias-file-diff-added-gutter', 'diffAddedLineNumberBg'],
  ['--dsw-alias-file-diff-added-marker', 'diffAdded'],
  ['--dsw-alias-file-diff-deleted-bg', 'diffRemovedBg'],
  ['--dsw-alias-file-diff-deleted-gutter', 'diffRemovedLineNumberBg'],
  ['--dsw-alias-file-diff-deleted-marker', 'diffRemoved'],
  ['--dsw-alias-state-idle-primary', 'secondary'],
  ['--dsw-alias-menu-icon', 'textMuted'],
  ['--dsw-alias-toast-label', 'text'],
  // 内联代码无芯片（opencode TUI 风格，固定 transparent）
  ['--dsw-alias-markdown-inline-code', '__transparent__'],
]

// #120 缺陷 B：宿主键帽底默认 color-mix(tooltip-bg, white 18%)，浮层底换成主题浅色 surface 后
// 键帽与浮层几乎同色。派生取「浮层底 → 其在底上的可读文字色」混合，并保证与浮层底至少
// KEYCAP_MIN_CONTRAST 的可辨差异（16% 起步，不足则按 4% 步进加浓，上限 40%）。
const KEYCAP_MIN_CONTRAST = 1.5
const KEYCAP_MIX_START = 0.16
const KEYCAP_MIX_STEP = 0.04
const KEYCAP_MIX_MAX = 0.4

function keycapColor(bg: string): string {
  const target = readableTextOn(bg)
  let mix = KEYCAP_MIX_START
  let color = mixHex(bg, target, mix)
  while (contrastRatio(color, bg) < KEYCAP_MIN_CONTRAST && mix < KEYCAP_MIX_MAX) {
    mix += KEYCAP_MIX_STEP
    color = mixHex(bg, target, mix)
  }
  return color
}

// 行内 diff 的加/删行（宿主 `_add_17vb8_48` / `_del_17vb8_38`）：
//   ._add { color: var(--dsw-alias-state-success-primary); background: var(--dsw-alias-code-diff-added) }
//   ._del { color: var(--dsw-alias-state-error-primary);   background: var(--dsw-alias-code-diff-deleted) }
// 这两个 token 是**行底色**，配对文字是 state-success/error-primary（宿主默认值本身也只是
// 绿/红 500 级 a08·a12 的水洗）。旧实现按名字把 diffAdded/diffRemoved 当「前景」直配进来 →
// 行底变成不透明高饱和色；在 diffAdded ≈ success 的主题（catppuccin 全家）里文字与底同一个色，
// 行内 diff 整行看不见（写入/编辑展示的截图事故）。
// 派生时机：buildTokens **末段**（配对对比度修复之后）由 generate.ts 调 deriveDiffWash——行内
// 文字色若被推离过，行底必须跟着重算，所以不能放进 DERIVED_TOKENS（那里只拿得到颜色键）。
// 派生规则（第一性原理：底要服务固定的文字色 T，同时得看得出是一条色带）：
//   1) 种子 = 主题自己的 diff 底（diffAddedBg/diffRemovedBg，进 buildTokens 前已过 ensureDiffContrast）；
//   2) T 在种子上达标、且种子与卡片底可辨 → 直接用（保住主题原本的 diff 色调，不发明新颜色）；
//   3) 达标但与卡片底同色（主题自己的 diff 底就等于代码底，色带消失）→ 退回宿主语义：
//      状态色在卡片底上的水洗，取仍能让 T 达标的最高浓度（宿主默认就是 a08·a12 水洗）；
//   4) 仍不成带（文字色对卡片底没余量）→ 把种子沿端点推（先远离 T：T 偏亮往黑、T 偏暗往白），
//      取第一档「既达标又成带」；先推远离端是为了保住主题 diff 色的色相；
//   5) 画布本身贴住两端、推到极限都成不了带 → 可读优先（退回水洗/首个达标值）；
//   6) 种子缺槽/透明（委托画布）→ 交还宿主默认。
const DIFF_WASH_MIN_CONTRAST = 4.5
// 行底与卡片底的倍率：1.12 = 目标强度（宿主默认水洗的量级），1.08 = 硬地板（低于此色带就看不见）。
// 画布本身贴住黑/白时（深色画布 + 深色 diff 底）地板也可能到不了（contrast(画布,最远端点) 就是天花板），
// 这时按「可读优先 + 可达范围内最大可辨度」返回，测试用 min(地板, 天花板) 作判据。
const DIFF_WASH_MIN_CUE = 1.12
const DIFF_WASH_FLOOR_CUE = 1.08
// 水洗浓度档位（从低到高）：上限 0.4，再高行底就贴住文字色，回到旧缺陷的「字底同色」
const DIFF_WASH_TINT_STEPS: readonly number[] = [0.04, 0.08, 0.12, 0.16, 0.2, 0.24, 0.28, 0.32, 0.36, 0.4]
// 推离档位（1% → 100%，1% 一档）：小步优先保住主题 diff 色的色相，细档让「刚可辨」落在最小偏离处
const DIFF_WASH_PUSH_STEPS: readonly number[] = Array.from({ length: 100 }, (_, i) => (i + 1) / 100)
const ALPHA_HEX = /^#[0-9a-fA-F]{8}$/
const HEX_ANY = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

// 取一个不透明色：8 位 hex 先按 onto 压平（onto 缺失视为不可用）；缺槽/透明/非颜色 → null
function flatToken(raw: string | null | undefined, onto?: string | null): string | null {
  if (!raw || raw === 'transparent' || !HEX_ANY.test(raw)) return null
  if (ALPHA_HEX.test(raw)) return onto ? blendOntoBase(raw, onto) : null
  return raw
}

// 入参都是**已落地的 token 值**（不是颜色键）：这样可以在 buildTokens 末段按最终值派生——
// pair-contrast 可能已经把状态色（行内文字色）推离过，行底必须跟着重算，否则两边各自为政。
// fg = state-success/error-primary、seed = file-diff-*-bg、page = bg-base、card = markdown-code-block。
export function deriveDiffWash(fgToken: string | null | undefined, seedToken: string | null | undefined, pageToken: string | null | undefined, cardToken: string | null | undefined): string {
  // 画布：行内 diff 落在代码块卡片上（宿主 `_block_1u3n2_1` 的 background = markdown-code-block），
  // 卡片留空退回页面底；两者都不可用 = 委托画布，这块底本该由宿主决定。
  const page = flatToken(pageToken)
  const card = flatToken(cardToken, page)
  const canvas = card || page
  if (!canvas) return 'transparent'
  const seed = flatToken(seedToken, canvas) || canvas
  const fg = flatToken(fgToken, seed)
  if (!fg) return 'transparent'
  const readable = (bg: string): boolean => contrastRatio(fg, bg) >= DIFF_WASH_MIN_CONTRAST
  const cue = (bg: string): number => contrastRatio(bg, canvas)
  if (readable(seed) && cue(seed) >= DIFF_WASH_MIN_CUE) return seed
  // 候选按「偏离种子由小到大」排：水洗（= 宿主语义：状态色按浓度叠在卡片底上）排在推离之前
  const candidates: string[] = []
  const tint = readable(seed) ? tintOnto(fg, canvas, readable) : null
  if (tint) candidates.push(tint)
  // 远离文字色的方向：文字偏亮则把底推向黑，文字偏暗则推向白。越远离越可读。
  const away = contrastRatio('#000000', fg) >= contrastRatio('#FFFFFF', fg) ? '#000000' : '#FFFFFF'
  const toward = away === '#000000' ? '#FFFFFF' : '#000000'
  for (const step of DIFF_WASH_PUSH_STEPS) {
    for (const end of [away, toward]) {
      const cand = mixHex(seed, end, step)
      if (readable(cand)) candidates.push(cand)
    }
  }
  // 取第一个够可辨的候选（偏离最小）；都不够 → 退守地板；地板也到不了（画布贴住黑白）→ 取可达
  // 范围内最可辨的那个。三级顺序保证「正常主题落在最小偏离处」，极端画布才拿最大值。
  let best: string | null = null
  for (const cand of candidates) {
    if (cue(cand) >= DIFF_WASH_MIN_CUE) return cand
    if (best === null || cue(cand) > cue(best)) best = cand
  }
  for (const cand of candidates) {
    if (cue(cand) >= DIFF_WASH_FLOOR_CUE) return cand
  }
  return best || seed
}

// 状态色在画布上的水洗色：返回仍满足 readable 的最高浓度档，全档都不达标 → null
function tintOnto(fg: string, canvas: string, readable: (bg: string) => boolean): string | null {
  for (let i = DIFF_WASH_TINT_STEPS.length - 1; i >= 0; i--) {
    const tinted = mixHex(canvas, fg, DIFF_WASH_TINT_STEPS[i])
    if (readable(tinted)) return tinted
  }
  return null
}

// ── 2. 派生 token：值不是直接取自颜色，而是按规则计算 ──
// 格式: [DSH 变量, 计算函数(colors) → 值]（colors = resolveThemeColors 输出）
export const DERIVED_TOKENS: ReadonlyArray<readonly [string, (c: ResolvedColorMap) => string]> = [
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
  // 行内 diff 行底（--dsw-alias-code-diff-added/deleted）不在这里：它依赖「最终落地的状态色」，
  // 必须在 buildTokens 末段、配对对比度修复之后再派生 → generate.ts 调 deriveDiffWash。
  ['--dsw-alias-label-dimmed', (c) => withAlpha(c.textMuted, 0.8)],
  ['--dsw-alias-button-tool-bar-fill', (c) => withAlpha(c.text, 0.1)],
  ['--dsw-alias-button-tool-bar-hover', (c) => withAlpha(c.text, 0.16)],
  ['--dsw-alias-button-tool-bar-fill-invisible', (c) => withAlpha(c.text, 0.04)],
  ['--dsw-alias-button-floating-hover', (c) => slot(c, 'backgroundElement')],
  ['--dsw-alias-button-ghost-active-hover', (c) => slot(c, 'backgroundElement')],
  ['--dsw-alias-interactive-bg-active', (c) => withAlpha(c.text, 0.14)],
  ['--dsw-alias-interactive-bg-hover', (c) => withAlpha(c.text, 0.08)],
  ['--dsw-alias-interactive-bg-hover-accent', (c) => withAlpha(c.primary, 0.2)],
  ['--dsw-alias-interactive-bg-hover-danger', (c) => withAlpha(c.error, 0.15)],
  ['--dsw-alias-interactive-bg-hover-solid', (c) => slot(c, 'backgroundElement')],
  // issue 70：宿主用 inverted 做真实边框（dsh-prompt 实证无 fallback 直引）；text-alpha 无色相，与彩色 border 并置即橙灰混杂，故跟边框走（inverted=border，inverted2=borderActive，与 l1/l2 对齐）
  ['--dsw-alias-border-inverted', (c) => slot(c, 'border')],
  ['--dsw-alias-border-inverted2', (c) => slot(c, 'borderActive')],
  ['--dsw-alias-scrollbar-bg-l1', (c) => withAlpha(c.text, 0.08)],
  ['--dsw-alias-scrollbar-bg-l2', (c) => withAlpha(c.text, 0.08)],
  ['--dsw-alias-scrollbar-hover-l1', (c) => slot(c, 'borderActive')],
  ['--dsw-alias-scrollbar-hover-l2', (c) => slot(c, 'borderActive')],
  // 侧边栏/设置面板导航项悬停与选中：DSH 默认随明暗模式取浅/深两套值，
  // 调色板未覆盖时在浅色系统（无 data-ds-dark-theme）下会白字撞浅底
  ['--dsw-specific-sidebar-nav-item-hover', (c) => withAlpha(c.text, 0.08)],
  ['--dsw-specific-sidebar-nav-item-active', (c) => withAlpha(c.text, 0.14)],
  ['--dsw-specific-sidebar-nav-item-active-accent', (c) => withAlpha(c.primary, 0.35)],
  // #120 缺陷 B：键帽底 = 浮层底 → 可读文字色混合（keycapColor 保证可辨识）；
  // 背景透明（委托画布）→ transparent 跳过，交还宿主默认配色。
  ['--dsw-alias-tooltip-key-bg', (c) => {
    const bg = c.backgroundElement
    if (typeof bg !== 'string' || bg === 'transparent') return 'transparent'
    return keycapColor(bg)
  }],
]

// ── 3. shiki 语法高亮变量（DSH 只认 10 个，opencode 的 9 个颜色做角色合并）──
export const SHIKI_MAP: ReadonlyArray<readonly [string, string]> = [
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
export const CSS_RULES: ReadonlyArray<{ selector: string; prop: string; from: string }> = [
  { selector: 'body h1,body h2,body h3,body h4,body h5,body h6', prop: 'color', from: 'markdownHeading' },
  { selector: 'a', prop: 'color', from: 'markdownLink' },
  // F1 链接：与上游 MarkdownText.module.css 选择器镜像（.markdown a 0,1,1 碾压裸 a 0,0,1；老 a 规则保留，老版继续命中）
  { selector: '.markdown a, .markdown .fileLink', prop: 'color', from: 'markdownLink' },
  { selector: 'code:not(pre code)', prop: 'color', from: 'markdownCode' },
  { selector: 'em', prop: 'color', from: 'markdownEmph' },
  { selector: 'strong', prop: 'color', from: 'markdownStrong' },
  { selector: 'blockquote', prop: 'color', from: 'markdownBlockQuote' },
  // issue 70：hr 跟边框走（桌面转换器惯例 markdownHorizontalRule=border；orng 数据里 hr 灰而 border 橙即混杂源）
  { selector: 'hr', prop: 'borderColor', from: 'border' },
]

// ── 4b. tooltip 标签色选择器（#120）──
// DSH 宿主 tooltip 气泡的标签色硬编码为 --dsw-static-neutral-bluish-00（白），没有 alias 变量可覆盖；
// 全站 role="tooltip" 只此一处（气泡 span，内嵌 kbd 键帽），故用元素规则覆盖。
// 特异性：`body [role="tooltip"]` = (0,1,1) > 宿主 `._bubble_xxx` = (0,1,0)，且本插件 <style> 后注入 → 双重胜出。
// 文字色由 generate.ts 按 tooltip-bg 现算（正文色优先，不足 4.5 退纯黑/白）。
export const TOOLTIP_TEXT_SELECTOR = '[role="tooltip"]'

// ── 5. 字体预设（主题无关维度；等宽栈尾部保留 CJK 字体避免 Windows 中文回退 SimSun）──
// 回退栈按可用性排序：自选 > 随包 OFL > OFL 但不随包（Maple Mono NF CN：中英同字体）>
// 私有本地检测（SF Mono/Consolas 沉底）> 系统 > CJK；
// SANS 栈顶为 Inter（opencode 桌面端 UI 字体，OFL 随包），失败即回退宿主原生栈。
// Maple Mono NF CN 为 OFL-1.1，中英文同一字体（中英宽度 2:1，混排对齐），但全量 CJK
// 体积是 latin 子集的数十倍（单文件 ~18MB，切片 webfont 每字重 ~5MB），内联随包会把发布包
// 从 0.4MB 级推到 15MB 级 —— 故与 SF Mono/Consolas 同策：只做本机检测，不随包内联。
export const SANS_STACK: string = [
  "'Inter'", '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", "'PingFang SC'",
  "'Hiragino Sans GB'", "'Microsoft YaHei'", "'Helvetica Neue'", 'Helvetica', 'Arial', 'sans-serif',
].join(', ')

export const FONTS: Record<string, string> = {
  'JetBrains Mono': "'JetBrains Mono','Fira Code','Cascadia Code','IBM Plex Mono','SF Mono',Consolas,Menlo,'Liberation Mono','Courier New','PingFang SC','Microsoft YaHei'",
  'Cascadia Code': "'Cascadia Code','JetBrains Mono','Fira Code','IBM Plex Mono','SF Mono',Consolas,'Courier New','PingFang SC','Microsoft YaHei'",
  'Fira Code': "'Fira Code','JetBrains Mono','Cascadia Code','IBM Plex Mono','SF Mono',Consolas,'Courier New','PingFang SC','Microsoft YaHei'",
  'IBM Plex Mono': "'IBM Plex Mono','JetBrains Mono','Fira Code','Cascadia Code','SF Mono',Consolas,'Courier New','PingFang SC','Microsoft YaHei'",
  'Maple Mono NF CN': "'Maple Mono NF CN','JetBrains Mono','Fira Code','Cascadia Code','IBM Plex Mono','SF Mono',Consolas,'Courier New','PingFang SC','Microsoft YaHei'",
  'SF Mono': "'SF Mono','JetBrains Mono','Fira Code','Cascadia Code','IBM Plex Mono',Consolas,'Courier New','PingFang SC','Microsoft YaHei'",
  'Consolas': "Consolas,'JetBrains Mono','Fira Code','Cascadia Code','IBM Plex Mono','SF Mono','Courier New','PingFang SC','Microsoft YaHei'",
}

// ── 6. 自定义主题 37 个颜色元数据（#84 建，#92 定稿组名；key 口径与 prototypes/custom-editor-83.prototype.html 的 GROUPS/ALL_KEYS_37/BG_KEYS 一致）──
// 7 大分组 = 背景与表面 8 + 文字 2 + 品牌与状态 6 + 边框 2 + 改动对比 6 + Markdown 6 + 代码高亮 7 = 37
// allowTransparent 仅 8 个背景槽为 true（其余 29 槽设 transparent 会被编辑器 reducer 拦截）；fallback 为 5 个扩展槽的默认继承源；previewSlot 为微缩画布 data-slot（恒等于 key）。
export const COLOR_SLOT_GROUPS: ReadonlyArray<{ id: string; keys: readonly string[] }> = [
  { id: 'bg', keys: ['background', 'backgroundPanel', 'backgroundElement', 'sidebarBg', 'bubbleBg', 'inputBg', 'codeBlockBg', 'codeHeaderBg'] },
  { id: 'text', keys: ['text', 'textMuted'] },
  { id: 'brand', keys: ['primary', 'secondary', 'info', 'success', 'warning', 'error'] },
  { id: 'border', keys: ['border', 'borderActive'] },
  { id: 'diff', keys: ['diffAdded', 'diffRemoved', 'diffAddedBg', 'diffRemovedBg', 'diffAddedLineNumberBg', 'diffRemovedLineNumberBg'] },
  { id: 'md', keys: ['markdownHeading', 'markdownLink', 'markdownCode', 'markdownEmph', 'markdownStrong', 'markdownBlockQuote'] },
  { id: 'syn', keys: ['syntaxComment', 'syntaxKeyword', 'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString', 'syntaxOperator'] },
]
export const COLOR_SLOTS: ReadonlyArray<{
  key: string
  group: string
  allowTransparent: boolean
  fallback: string | null
  previewSlot: string
}> = [
  { key: 'background', group: 'bg', allowTransparent: true, fallback: null, previewSlot: 'background' },
  { key: 'backgroundPanel', group: 'bg', allowTransparent: true, fallback: null, previewSlot: 'backgroundPanel' },
  { key: 'backgroundElement', group: 'bg', allowTransparent: true, fallback: null, previewSlot: 'backgroundElement' },
  { key: 'sidebarBg', group: 'bg', allowTransparent: true, fallback: 'background', previewSlot: 'sidebarBg' },
  { key: 'bubbleBg', group: 'bg', allowTransparent: true, fallback: 'backgroundPanel', previewSlot: 'bubbleBg' },
  { key: 'inputBg', group: 'bg', allowTransparent: true, fallback: 'backgroundPanel', previewSlot: 'inputBg' },
  { key: 'codeBlockBg', group: 'bg', allowTransparent: true, fallback: 'backgroundPanel', previewSlot: 'codeBlockBg' },
  { key: 'codeHeaderBg', group: 'bg', allowTransparent: true, fallback: 'backgroundElement', previewSlot: 'codeHeaderBg' },
  { key: 'text', group: 'text', allowTransparent: false, fallback: null, previewSlot: 'text' },
  { key: 'textMuted', group: 'text', allowTransparent: false, fallback: null, previewSlot: 'textMuted' },
  { key: 'primary', group: 'brand', allowTransparent: false, fallback: null, previewSlot: 'primary' },
  { key: 'secondary', group: 'brand', allowTransparent: false, fallback: null, previewSlot: 'secondary' },
  { key: 'info', group: 'brand', allowTransparent: false, fallback: null, previewSlot: 'info' },
  { key: 'success', group: 'brand', allowTransparent: false, fallback: null, previewSlot: 'success' },
  { key: 'warning', group: 'brand', allowTransparent: false, fallback: null, previewSlot: 'warning' },
  { key: 'error', group: 'brand', allowTransparent: false, fallback: null, previewSlot: 'error' },
  { key: 'border', group: 'border', allowTransparent: false, fallback: null, previewSlot: 'border' },
  { key: 'borderActive', group: 'border', allowTransparent: false, fallback: null, previewSlot: 'borderActive' },
  { key: 'diffAdded', group: 'diff', allowTransparent: false, fallback: null, previewSlot: 'diffAdded' },
  { key: 'diffRemoved', group: 'diff', allowTransparent: false, fallback: null, previewSlot: 'diffRemoved' },
  { key: 'diffAddedBg', group: 'diff', allowTransparent: false, fallback: null, previewSlot: 'diffAddedBg' },
  { key: 'diffRemovedBg', group: 'diff', allowTransparent: false, fallback: null, previewSlot: 'diffRemovedBg' },
  { key: 'diffAddedLineNumberBg', group: 'diff', allowTransparent: false, fallback: null, previewSlot: 'diffAddedLineNumberBg' },
  { key: 'diffRemovedLineNumberBg', group: 'diff', allowTransparent: false, fallback: null, previewSlot: 'diffRemovedLineNumberBg' },
  { key: 'markdownHeading', group: 'md', allowTransparent: false, fallback: null, previewSlot: 'markdownHeading' },
  { key: 'markdownLink', group: 'md', allowTransparent: false, fallback: null, previewSlot: 'markdownLink' },
  { key: 'markdownCode', group: 'md', allowTransparent: false, fallback: null, previewSlot: 'markdownCode' },
  { key: 'markdownEmph', group: 'md', allowTransparent: false, fallback: null, previewSlot: 'markdownEmph' },
  { key: 'markdownStrong', group: 'md', allowTransparent: false, fallback: null, previewSlot: 'markdownStrong' },
  { key: 'markdownBlockQuote', group: 'md', allowTransparent: false, fallback: null, previewSlot: 'markdownBlockQuote' },
  { key: 'syntaxComment', group: 'syn', allowTransparent: false, fallback: null, previewSlot: 'syntaxComment' },
  { key: 'syntaxKeyword', group: 'syn', allowTransparent: false, fallback: null, previewSlot: 'syntaxKeyword' },
  { key: 'syntaxFunction', group: 'syn', allowTransparent: false, fallback: null, previewSlot: 'syntaxFunction' },
  { key: 'syntaxType', group: 'syn', allowTransparent: false, fallback: null, previewSlot: 'syntaxType' },
  { key: 'syntaxNumber', group: 'syn', allowTransparent: false, fallback: null, previewSlot: 'syntaxNumber' },
  { key: 'syntaxString', group: 'syn', allowTransparent: false, fallback: null, previewSlot: 'syntaxString' },
  { key: 'syntaxOperator', group: 'syn', allowTransparent: false, fallback: null, previewSlot: 'syntaxOperator' },
]
// 32 色内置配色 → 37 色完整配色：仅补齐未显式指定的 5 个扩展槽（已显式的保持不动，纯函数不改入参）。
// 回退链：sidebarBg←background；bubbleBg/inputBg/codeBlockBg←backgroundPanel；codeHeaderBg←backgroundElement。
export function normalizeThemeColors(colors: ResolvedColorMap | null | undefined): ResolvedColorMap {
  const c: ResolvedColorMap = Object.assign({}, colors || {})
  if (c.sidebarBg === undefined || c.sidebarBg === null) c.sidebarBg = c.background
  if (c.bubbleBg === undefined || c.bubbleBg === null) c.bubbleBg = c.backgroundPanel
  if (c.inputBg === undefined || c.inputBg === null) c.inputBg = c.backgroundPanel
  if (c.codeBlockBg === undefined || c.codeBlockBg === null) c.codeBlockBg = c.backgroundPanel
  if (c.codeHeaderBg === undefined || c.codeHeaderBg === null) c.codeHeaderBg = c.backgroundElement
  return c
}
