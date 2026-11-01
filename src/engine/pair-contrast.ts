// pair-contrast.ts — 宿主真实「文字色压在背景色上」配对的对比度兜底
//
// 为什么需要这一层：插件只往宿主注入颜色 token，但宿主 CSS 里有大量「同一规则内
// 同时设 background 与 color」的配对（按钮、药丸、层级卡片、错误提示…）。只要主题给的
// 两种颜色离得太近，那处文字就读不出来——2026-10 的截图事故（inline diff 行底）就是
// 这一类的最坏形态。diffWash（map-dsh.ts）负责行底那种「水洗」语义，本层负责其余所有
// 已知配对：不发明新颜色，只在不达标时把其中一侧沿黑/白推离到刚过阈值的最小一步。
//
// 数据来源（可复现）：宿主 app.asar 的 CSS 里扫所有
//   background(-color):var(--dsw-alias-X) 与 color:var(--dsw-alias-Y) 同时出现的规则体
// 去重后得到下面这张表。宿主升级后若新增配对，按同样口径重扫并补表即可；测试会遍历全表。
import { blendOntoBase, contrastRatio, hexToRgb, mixHex, rgbToHex } from './resolve.ts'

export interface HostTextPair {
  /** 文字色 token（规则里的 color） */
  readonly fg: string
  /** 背景色 token（规则里的 background） */
  readonly bg: string
}

/** WCAG AA 正文阈值；小字（11–13px）宿主里普遍存在，因此不降到 3:1（那是大字/图标口径） */
export const PAIR_CONTRAST_MIN = 4.5

/** 推离档位：1% 一档，小步优先保住主题原色的观感 */
const PUSH_STEPS: readonly number[] = Array.from({ length: 100 }, (_, i) => (i + 1) / 100)

/** 兜底迭代轮数：这是防震荡的**上限**，不是收敛保证；真没收敛会落在 unresolved 里由测试暴露 */
const MAX_ROUNDS = 4

// 只认合法长度：#rgb/#rgba/#rrggbb/#rrggbbaa（5/7 位是坏值，不能当颜色）
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
// 只认逗号语法的 rgb()/rgba()；颜色 4 / 空格斜杠语法解析不了 → 该配对进 skipped（如实报告，不猜）
const RGBA_COLOR = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/

export const HOST_TEXT_PAIRS: readonly HostTextPair[] = [
  { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-interactive-bg-hover' },
  { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-bg-layer-1' },
  { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-interactive-bg-hover' },
  { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-bg-base' },
  { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-markdown-code-block' },
  { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-bg-module-platform' },
  { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-bg-layer-3' },
  { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-bg-layer-2' },
  { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-bg-base' },
  { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-bg-layer-1' },
  { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-bg-module-platform' },
  { fg: '--dsw-alias-bg-layer-3', bg: '--dsw-alias-label-primary' },
  { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-markdown-code-block' },
  { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-interactive-bg-hover-solid' },
  { fg: '--dsw-alias-label-primary-foreground', bg: '--dsw-alias-button-primary-fill' },
  { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-bg-layer-2' },
  { fg: '--dsw-alias-state-error-primary', bg: '--dsw-alias-interactive-bg-hover-danger' },
  { fg: '--dsw-alias-label-primary-inverted', bg: '--dsw-alias-button-contrast-fill' },
  { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-state-warn-tertiary' },
  { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-button-ghost-active-fill' },
  { fg: '--dsw-alias-state-warn-label', bg: '--dsw-alias-state-warn-tertiary' },
  { fg: '--dsw-alias-state-business-primary', bg: '--dsw-alias-interactive-bg-hover' },
  { fg: '--dsw-alias-state-warn-primary', bg: '--dsw-alias-state-warn-tertiary' },
  { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-button-floating-fill' },
  { fg: '--dsw-alias-label-tertiary', bg: '--dsw-alias-interactive-bg-hover' },
  { fg: '--dsw-alias-state-business-primary', bg: '--dsw-alias-state-business-tertiary' },
  { fg: '--dsw-alias-label-tertiary', bg: '--dsw-alias-bg-skeleton' },
  { fg: '--dsw-alias-label-tertiary', bg: '--dsw-alias-bg-module-platform' },
  { fg: '--dsw-alias-label-tertiary', bg: '--dsw-alias-bg-layer-2' },
  { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-button-elevated-fill' },
  { fg: '--dsw-alias-toast-label', bg: '--dsw-alias-toast-bg' },
  { fg: '--dsw-alias-label-tertiary', bg: '--dsw-alias-fill-tsp-secondary' },
  { fg: '--dsw-alias-bg-layer-3', bg: '--dsw-alias-state-error-primary' },
  { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-interactive-bg-hover-solid' },
  { fg: '--dsw-alias-label-tertiary', bg: '--dsw-alias-markdown-code-block' },
  { fg: '--dsw-alias-label-primary-bluish', bg: '--dsw-alias-state-business-tertiary' },
  { fg: '--dsw-alias-label-tertiary', bg: '--dsw-alias-button-ghost-active-fill' },
  { fg: '--dsw-alias-label-caption', bg: '--dsw-alias-interactive-bg-hover' },
  { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-fill-l1' },
  { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-fill-l2' },
  { fg: '--dsw-alias-state-warn-label', bg: '--dsw-alias-bg-module-platform' },
  { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-bg-layer-3' },
  { fg: '--dsw-alias-state-error-primary', bg: '--dsw-alias-bg-base' },
  { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-bg-l2' },
  { fg: '--dsw-alias-label-primary-inverted', bg: '--dsw-alias-label-primary' },
  { fg: '--dsw-alias-label-caption', bg: '--dsw-alias-markdown-code-block-banner' },
  { fg: '--dsw-alias-label-tertiary', bg: '--dsw-alias-bg-layer-1' },
  { fg: '--dsw-alias-label-caption', bg: '--dsw-alias-bg-module-platform' },
  { fg: '--dsw-alias-label-caption', bg: '--dsw-alias-bg-layer-2' },
  { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-bg-overlay' },
  { fg: '--dsw-alias-state-success-primary', bg: '--dsw-alias-state-success-tertiary' },
  { fg: '--dsw-alias-label-secondary', bg: '--dsw-alias-bg-layer-4' },
  // inline diff 行（编辑/写入工具）：行底由 map-dsh 的 diffWash 派生（还要求对代码块底成带），
  // 这里只作为配对断言与二道保险——diffWash 已保证达标，本层通常不会动它们。
  { fg: '--dsw-alias-state-error-primary', bg: '--dsw-alias-code-diff-deleted' },
  { fg: '--dsw-alias-state-success-primary', bg: '--dsw-alias-code-diff-added' },
  { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-markdown-code-block-banner' },
  { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-markdown-tag' },
  { fg: '--dsw-alias-label-primary-inverted', bg: '--dsw-alias-brand-primary' },
]

// 谁算「文字色 token」：只有这些槽在宿主里专用于压在别人身上；其余（bg-*、fill-*、
// interactive-bg-*、button-*-fill、markdown-*、state-*-tertiary、brand-*）都是「面」，
// 面与面相遇（如药丸里文字色取面 token）时不该动面，留给上层判断。
const TEXT_TOKEN = [
  /^--dsw-alias-label-/,
  /^--dsw-alias-toast-label$/,
  /^--dsw-alias-state-.*-(primary|label)$/,
]

function isTextToken(name: string): boolean {
  return TEXT_TOKEN.some((re) => re.test(name))
}

// 全局文字锚（正文/次要/弱化/说明）：它们被宿主到处当文字色用，绝不作为「面」被推离——
// 为一个角落里的反白徽标去挪全局正文色，会让整个界面一起变样。作为文字侧仍然可以修（那是可读性本身）。
const LABEL_ANCHOR = /^--dsw-alias-label-(primary|secondary|tertiary|caption)(-bluish|-foreground|-inverted)?$/

/**
 * 决定这条配对修哪一侧：
 * - 文字色 vs 面 → 修文字色（面是布局骨架，动它会牵一片）；
 * - 面当文字压文字色当底（如错误药丸用 bg-layer-3 当字色）→ 修那个「当底的状态色」；
 * - 要以全局文字锚当底面被推离、或面 vs 面（两侧都是骨架 token）→ 不动，交测试暴露问题
 *   而不是悄悄改骨架。
 */
export function preferredRepairSide(fg: string, bg: string): 'fg' | 'bg' | null {
  const fgText = isTextToken(fg)
  const bgText = isTextToken(bg)
  if (fgText && !bgText) return 'fg'
  if (bgText && !fgText) return LABEL_ANCHOR.test(bg) ? null : 'bg'
  if (fgText && bgText) return 'fg'
  return null
}

type TokenValues = Record<string, string | undefined>

export type { TokenValues }

interface Constraint {
  /** 另一侧 token 名 */
  readonly other: string
}

interface ParsedColor {
  /** 不透明 6 位 hex */
  readonly hex: string
  /** 0–1；1 = 不透明 */
  readonly alpha: number
}

/** 解析 #rgb/#rrggbb/#rrggbbaa 与 rgb()/rgba()；transparent、空值、非颜色一律 null */
function parseColor(raw: string | undefined): ParsedColor | null {
  if (!raw) return null
  const v = raw.trim()
  if (v === 'transparent' || v === 'none') return null
  if (HEX_COLOR.test(v)) {
    const { r, g, b, a } = hexToRgb(v)
    return { hex: rgbToHex(r, g, b), alpha: a / 255 }
  }
  const m = RGBA_COLOR.exec(v)
  if (m) {
    return {
      hex: rgbToHex(Number(m[1]), Number(m[2]), Number(m[3])),
      alpha: m[4] === undefined ? 1 : Number(m[4]),
    }
  }
  return null
}

function parsed(values: TokenValues, name: string): ParsedColor | null {
  return parseColor(values[name])
}

/** 半透明值按这一半的页面底压平成不透明色再比较（浮层底、diff 底常用 alpha） */
function solid(c: ParsedColor, page: string): string {
  if (c.alpha >= 1) return c.hex
  return blendOntoBase(c.hex + Math.round(c.alpha * 255).toString(16).padStart(2, '0'), page)
}

/** 本 token 能不能当修复目标：只有不透明色才能被推离，rgba/transparent 属于设计意图（半透明浮层），不碰 */
function repairable(values: TokenValues, name: string): boolean {
  const c = parsed(values, name)
  return c !== null && c.alpha >= 1
}

function contrastOf(a: ParsedColor, b: ParsedColor, page: string): number {
  return contrastRatio(solid(a, page), solid(b, page))
}

interface ConstraintTable {
  /** 可修 token → 它需要压住的另一侧 */
  readonly cons: Map<string, Constraint[]>
  /** 判不了的配对（两侧都不可动：半透明浮层、缺槽、坏值）→ 如实报告，不悄悄放过 */
  readonly unjudgeable: string[]
}

function constraintsFor(pairs: readonly HostTextPair[], values: TokenValues): ConstraintTable {
  const cons = new Map<string, Constraint[]>()
  const unjudgeable: string[] = []
  for (const pair of pairs) {
    const side = preferredRepairSide(pair.fg, pair.bg)
    if (!side) continue
    const self = side === 'fg' ? pair.fg : pair.bg
    const other = side === 'fg' ? pair.bg : pair.fg
    // 首选一侧不可动（半透明/缺席/不存在）时退另一侧；两侧都不可动就记进 unjudgeable
    let target = self
    let partner = other
    if (!repairable(values, target) || !parsed(values, partner)) {
      target = other
      partner = self
    }
    if (!repairable(values, target) || !parsed(values, partner)) {
      unjudgeable.push(pair.fg + ' on ' + pair.bg)
      continue
    }
    const item: Constraint = { other: partner }
    const list = cons.get(target)
    if (list) list.push(item)
    else cons.set(target, [item])
  }
  return { cons, unjudgeable }
}

/** 候选值在全部约束上的最小对比度（无约束 → Infinity） */
function minContrast(value: ParsedColor, list: readonly Constraint[], snapshot: TokenValues, page: string): number {
  let worst = Infinity
  for (const c of list) {
    const other = parsed(snapshot, c.other)
    if (!other) continue
    worst = Math.min(worst, contrastOf(value, other, page))
  }
  return worst
}

/**
 * 沿黑/白推离，取「满足全部约束的最小一步」（每步 1%，先小后大，两侧同一步时取更充裕的那侧）。
 * `taken` 是本次已经写出的其它 token 值：跳过撞值的那一档，免得「正文色 / 次要色」在弱对比
 * 主题里被推成同一个灰（层级塌掉）。找不到这样一步 → 说明这些约束物理上不可同时满足（例：同一个
 * 「反白字」要同时压住浅色填充和深色主色），此时**保持原值**：把设计色挪到中间灰只会让每一处都
 * 变糊，宁可停在主题作者的选择上，由 infeasible 名单如实暴露出来。
 */
function pushOnce(current: ParsedColor, list: readonly Constraint[], snapshot: TokenValues, page: string, min: number, avoid?: (value: string) => boolean): { value: string; slack: number } | null {
  for (const step of PUSH_STEPS) {
    let stepBest: { value: string; slack: number } | null = null
    for (const end of ['#000000', '#FFFFFF']) {
      const candidate = mixHex(current.hex, end, step)
      if (candidate.toUpperCase() === current.hex.toUpperCase()) continue
      if (avoid && avoid(candidate.toUpperCase())) continue
      const flatCandidate: ParsedColor = { hex: candidate, alpha: 1 }
      const slack = minContrast(flatCandidate, list, snapshot, page)
      if (slack >= min) {
        if (!stepBest || slack > stepBest.slack) stepBest = { value: candidate, slack }
      }
    }
    if (stepBest) return stepBest
  }
  return null
}

function pushUntilSatisfied(current: ParsedColor, list: readonly Constraint[], snapshot: TokenValues, page: string, min: number, avoid: (value: string) => boolean): { value: string; infeasible: boolean } {
  // 先找不撞值的解；只有全部档位都撞（极端主题）才退回允许撞值，最后才判定不可行
  const free = pushOnce(current, list, snapshot, page, min, avoid)
  if (free) return { value: free.value, infeasible: false }
  const any = pushOnce(current, list, snapshot, page, min)
  if (any) return { value: any.value, infeasible: false }
  return { value: current.hex, infeasible: true }
}

/**
 * 诊断用：按这一半的 token 表算某条配对的对比度。判不了（缺槽 / 半透明且没有页面底）→ null。
 * 测试与后续排查都用它，避免再抄一份颜色解析。
 */
export function pairContrastRatio(values: TokenValues, pair: HostTextPair): number | null {
  const fg = parsed(values, pair.fg)
  const bg = parsed(values, pair.bg)
  if (!fg || !bg) return null
  const pageColor = parsed(values, '--dsw-alias-bg-base')
  if (fg.alpha >= 1 && bg.alpha >= 1) return contrastOf(fg, bg, '#000000')
  if (!pageColor || pageColor.alpha < 1) return null
  return contrastOf(fg, bg, pageColor.hex)
}

export interface PairRepairResult {
  /** 是否真的做出了判定（false = 页面底缺失/半透明，整段跳过，下面三项都为已知的「未判」） */
  judged: boolean
  /** 被移动过的 token（值发生变化的） */
  changed: string[]
  /** 约束物理冲突、只能尽力而为的 token */
  infeasible: string[]
  /** 修完后仍低于阈值的配对（"fg on bg"）；物理冲突的那些会留在这里 */
  unresolved: string[]
  /** 判不了的配对（"fg on bg"）：某一侧是解析不了的颜色或缺失 → 既不修也不claim达标 */
  skipped: string[]
}

/**
 * 就地把一半 token 表里「文字压在背景上读不出来」的配对修到达标。
 * 只动配对里指定的那一侧，不增删 token，不改已达标的值 → 对绝大多数主题是纯恒等变换。
 */
export function repairPairContrast(values: TokenValues, pairs: readonly HostTextPair[] = HOST_TEXT_PAIRS, min = PAIR_CONTRAST_MIN): PairRepairResult {
  const pageColor = parsed(values, '--dsw-alias-bg-base')
  // 页面底不可用或本身半透明（委托画布 / 作者没给底色）= 判不出真实观感，整段跳过：宁可不改，
  // 也不拿一个假的底色去算对比度（旧版这么做会把正文色推到中间灰）。
  if (!pageColor || pageColor.alpha < 1) return { judged: false, changed: [], infeasible: [], unresolved: [], skipped: [] }
  const page = pageColor.hex
  const { cons, unjudgeable } = constraintsFor(pairs, values)
  const changed: string[] = []
  const infeasible: string[] = []
  /** 起点快照：判断两个 token 是否「同一个源的孪生」（label-primary 与 label-primary-dimmed 都取 text） */
  const originals: TokenValues = { ...values }
  /** 本次已写出的值 → 拿走它的 token：推离时避开别人的值，保住层级（正文色 / 次要色不会塌成同一个灰） */
  const assigned = new Map<string, string>()
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const snapshot: TokenValues = { ...values }
    let touched = false
    for (const name of [...cons.keys()].sort()) {
      const current = parsed(snapshot, name)
      if (!current || current.alpha < 1) continue
      const list = cons.get(name)
      if (!list || minContrast(current, list, snapshot, page) >= min) continue
      // 撞值回避只对「起点色不同」的 token 生效：同源孪生本来就该同值，不该被之一拆开
      const avoid = (value: string): boolean => {
        const owner = assigned.get(value)
        if (owner === undefined || owner === name) return false
        return (originals[owner] || '').toUpperCase() !== (originals[name] || '').toUpperCase()
      }
      const next = pushUntilSatisfied(current, list, snapshot, page, min, avoid)
      if (next.infeasible && !infeasible.includes(name)) infeasible.push(name)
      if (next.value.toUpperCase() === current.hex.toUpperCase()) continue
      values[name] = next.value
      assigned.set(next.value.toUpperCase(), name)
      if (!changed.includes(name)) changed.push(name)
      touched = true
    }
    if (!touched) break
  }
  const unresolved: string[] = []
  const skipped: string[] = [...unjudgeable]
  for (const pair of pairs) {
    const fg = parsed(values, pair.fg)
    const bg = parsed(values, pair.bg)
    const id = pair.fg + ' on ' + pair.bg
    if (!fg || !bg) {
      if (!skipped.includes(id)) skipped.push(id)
      continue
    }
    if (contrastOf(fg, bg, page) < min) unresolved.push(id)
  }
  return { judged: true, changed, infeasible, unresolved, skipped }
}
