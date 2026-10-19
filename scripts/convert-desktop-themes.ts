// convert-desktop-themes.ts — opencode 2.0 桌面主题（desktop-theme.json）→ TUI 形 JSON
// 背景：2.0 新增 amoled / oc-2 / onedarkpro / shadesofpurple 四款只存在于
// packages/ui/src/theme/themes/（桌面 schema：light/dark palette + overrides），
// TUI 目录（本包同步源）没有它们。本脚本做一次诚实、显式、可重跑的格式转换：
//   - 直接取色：一一对应的官方色位（neutral/ink/primary/accent/success/warning/error/info/syntax-*）；
//   - 派生补齐：桌面缺省的层级色（panel/element/muted/border）用 mix() 在 neutral↔ink 轴上按固定比例取，
//     比例即文档（见 mix 注释），不逐主题手调；缺省 syntax 位按 one-dark 系惯例回退（串内有表）；
//   - 判尺修复（票 #117）：产物须过 37-token 审计硬性门槛（文字 4.5 / UI 3.0）。桌面源色板的弱文字、
//     注释、链接等前景在 TUI 判尺下不足 4.5，按对比度最小步长沿色相轴混白/黑（深色提亮、浅色压暗）；
//   - secondary 补槽：桌面 palette 无 secondary，从各自 accent 派生（缺槽时引擎会回退通用 #5C9CF5）；
//   - 输出 {defs:{}, theme:{dark,light 全hex}}，与 TUI 形一致，可被 resolve/测试管线直接消费。
// 用法: node scripts/convert-desktop-themes.ts（源：src/themes/desktop-2.0/*.json）
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SRC = join(ROOT, 'src', 'themes', 'desktop-2.0')
const OUT = join(ROOT, 'src', 'themes')
const NAMES = ['amoled', 'oc-2', 'onedarkpro', 'shadesofpurple']

// 与 sync-themes.ts 同一套必填门（缺失 = 上游结构变化，直接报错）
const REQUIRED_KEYS = ['background', 'text', 'textMuted', 'primary', 'secondary', 'accent', 'error', 'warning', 'success', 'info', 'border', 'borderActive', 'syntaxComment', 'syntaxKeyword', 'syntaxFunction', 'syntaxVariable', 'syntaxString', 'syntaxNumber', 'syntaxType', 'syntaxOperator']

// 桌面主题 schema：只列本脚本用到的色位（其余字段原样忽略）。
interface DesktopPalette {
  neutral: string
  ink: string
  primary: string
  accent?: string
  interactive?: string
  info: string
  error: string
  warning: string
  success: string
  diffAdd?: string
  diffDelete?: string
}

interface DesktopMode {
  palette: DesktopPalette
  overrides?: Record<string, string>
}

interface DesktopThemeDoc {
  light?: DesktopMode
  dark?: DesktopMode
}

/** 输出角色表：syntax 派生位可能缺省（undefined 由 main 统一报错）。 */
type ThemeRoles = Record<string, string | undefined>
type Rgb = [number, number, number]

function hx(h: string): Rgb {
  let t = String(h).trim()
  if (t[0] === '#') t = t.slice(1)
  if (t.length === 3) t = t.split('').map((x) => x + x).join('')
  const n = parseInt(t, 16)
  return [(n >>> 16) & 255, (n >>> 8) & 255, n & 255]
}
function toHex(r: number, g: number, b: number): string {
  const c = (v: number): string => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return ('#' + c(r) + c(g) + c(b)).toUpperCase()
}
// mix(a,b,k)：a→b 方向取 k 比例。层级语义：panel/element 是 neutral 向 ink 的固定台阶
// （0.07/0.14，深浅两方向自动正确：深色主题变亮、浅色主题变暗）；muted/border 同理。
function mix(a: string, b: string, k: number): string {
  const A = hx(a)
  const B = hx(b)
  return toHex(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k)
}

// ── 对比度修复（票 #117）──
// 门槛口径与 docs/theme-audit/criteria.md 一致：文字类 4.5:1（text/textMuted/labelDimmed/markdown/syntax），
// UI 类 3:1（borderActive/品牌 6 色）。labelDimmed 在引擎里 = withAlpha(textMuted, 0.8) 再叠到底面。
// 修复只动前景：沿原色相向白（深色主题）或向黑（浅色主题）做 1/255 最小步长混色，不改背景、不换色系。
function relLum(h: string): number {
  const f = (v: number): number => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const [r, g, b] = hx(h)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
function ratio(a: string, b: string): number {
  const la = relLum(a)
  const lb = relLum(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
/** 与 resolve.ts contrastText 同规则：luma > 0.6 用深字，否则浅字。 */
function contrastTextOn(hex: string): string {
  const [r, g, b] = hx(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#141414' : '#F4F4F5'
}
/** 前景按 alpha 合成到底面（对应 resolve.ts blendOntoBase）。 */
function blend(fg: string, bg: string, alpha: number): string {
  const F = hx(fg)
  const B = hx(bg)
  return toHex(F[0] * alpha + B[0] * (1 - alpha), F[1] * alpha + B[1] * (1 - alpha), F[2] * alpha + B[2] * (1 - alpha))
}
type Pred = (hex: string) => boolean
/** 最小 k 步（1/255）沿 hex→白/黑混色直到 pred 成立；先试 prefer，再试反向（primary 越过亮度分界时有用）。 */
function repair(hex: string, pred: Pred, prefer: 'lighten' | 'darken'): string {
  if (pred(hex)) return hex
  const target = prefer === 'lighten' ? '#FFFFFF' : '#000000'
  const other = prefer === 'lighten' ? '#000000' : '#FFFFFF'
  let best: string | null = null
  let bestK = 2
  for (const t of [target, other]) {
    for (let i = 1; i <= 255; i++) {
      const k = i / 255
      const c = mix(hex, t, k)
      if (pred(c)) {
        if (k < bestK) {
          bestK = k
          best = c
        }
        break
      }
    }
  }
  return best || hex
}

function convertOne(mode: DesktopMode, isDark = true): ThemeRoles {
  const p = mode.palette
  const o = mode.overrides || {}
  const accent = p.accent || p.interactive || p.info
  const prefer = isDark ? 'lighten' : 'darken'
  const bg = p.neutral
  const panel = o['surface-base'] || mix(p.neutral, p.ink, 0.07)
  const element = o['surface-raised-base'] || mix(p.neutral, p.ink, 0.14)
  const surfaces = [bg, panel, element]
  const codeBg = panel // normalizeThemeColors：codeBlockBg ← backgroundPanel
  const pass45 = (c: string, bases: string[]): boolean => bases.every((b) => ratio(c, b) >= 4.5)
  const pass3 = (c: string, bases: string[]): boolean => bases.every((b) => ratio(c, b) >= 3)
  const alias = (raw: string | undefined, pred: Pred): string | undefined => (raw === undefined ? undefined : repair(raw, pred, prefer))
  // 文字：text@8 背景面（sidebar/bubble/input/code 槽由 normalizeThemeColors 归并到 bg/panel/element）
  const text = repair(o['text-strong'] || p.ink, (c) => pass45(c, surfaces), prefer)
  // 弱化文字：textMuted@3 面 4.5，且 labelDimmed(=withAlpha(textMuted,0.8) 合成)@3 面 4.5
  const textMuted = repair(
    o['text-weak'] || mix(p.ink, p.neutral, 0.45),
    (c) => surfaces.every((s) => ratio(c, s) >= 4.5 && ratio(blend(c, s, 0.8), s) >= 4.5),
    prefer,
  )
  // 品牌 6 色 @background(+panel) 3:1；primary 另有 contrastText(primary)@primary 4.5
  const primary = repair(p.primary, (c) => pass3(c, [bg, panel]) && ratio(c, contrastTextOn(c)) >= 4.5, prefer)
  // secondary：桌面 palette 无此槽 → 从 accent 派生（accent 即桌面端的第二品牌色）
  const secondary = repair(accent, (c) => pass3(c, [bg, panel]), prefer)
  const info = repair(p.info, (c) => pass3(c, [bg, panel]), prefer)
  const success = repair(p.success, (c) => pass3(c, [bg, panel]), prefer)
  const warning = repair(p.warning, (c) => pass3(c, [bg, panel]), prefer)
  const error = repair(p.error, (c) => pass3(c, [bg, panel]), prefer)
  const border = o['border-weak-base'] || mix(p.ink, p.neutral, 0.16)
  const borderActive = repair(mix(p.ink, p.neutral, 0.32), (c) => pass3(c, surfaces), prefer)
  // 代码高亮 7 色 @codeBlockBg 4.5（缺省回退：string≈success 绿、number≈constant、type≈info、
  // operator≈muted、variable≈text、function≈primary）
  const syntaxComment = alias(o['syntax-comment'], (c) => pass45(c, [codeBg]))
  const syntaxKeyword = alias(o['syntax-keyword'], (c) => pass45(c, [codeBg]))
  const syntaxFunction = repair(primary, (c) => pass45(c, [codeBg]), prefer)
  const syntaxVariable = repair(text, (c) => pass45(c, [codeBg]), prefer)
  const syntaxString = repair(o['syntax-string'] || success, (c) => pass45(c, [codeBg]), prefer)
  const syntaxNumber = repair(o['syntax-constant'] || warning, (c) => pass45(c, [codeBg]), prefer)
  const syntaxType = repair(o['syntax-type'] || info, (c) => pass45(c, [codeBg]), prefer)
  const syntaxOperator = repair(textMuted, (c) => pass45(c, [codeBg]), prefer)
  // markdown 6 色 @background(+panel) 4.5
  const markdownLink = repair(accent, (c) => pass45(c, [bg, panel]), prefer)
  const markdownHeading = repair(text, (c) => pass45(c, [bg, panel]), prefer)
  const markdownCode = repair(primary, (c) => pass45(c, [bg, panel]), prefer)
  const markdownEmph = repair(text, (c) => pass45(c, [bg, panel]), prefer)
  const markdownStrong = repair(text, (c) => pass45(c, [bg, panel]), prefer)
  const markdownBlockQuote = repair(textMuted, (c) => pass45(c, [bg, panel]), prefer)
  return {
    background: bg,
    backgroundPanel: panel,
    backgroundElement: element,
    text: text,
    textMuted: textMuted,
    primary: primary,
    secondary: secondary,
    accent: accent,
    error: error,
    warning: warning,
    success: success,
    info: info,
    border: border,
    borderActive: borderActive,
    syntaxComment: syntaxComment,
    syntaxKeyword: syntaxKeyword,
    syntaxFunction: syntaxFunction,
    syntaxVariable: syntaxVariable,
    syntaxString: syntaxString,
    syntaxNumber: syntaxNumber,
    syntaxType: syntaxType,
    syntaxOperator: syntaxOperator,
    markdownLink: markdownLink,
    markdownHeading: markdownHeading,
    markdownCode: markdownCode,
    markdownEmph: markdownEmph,
    markdownStrong: markdownStrong,
    markdownBlockQuote: markdownBlockQuote,
    markdownHorizontalRule: border,
    // issue 80: keep desktop diff seeds (was dropped, caused silent fallback)
    diffAdded: p.success,
    diffRemoved: p.error,
    diffAddedBg: mix(p.neutral, p.diffAdd || p.success, isDark ? 0.22 : 0.14),
    diffRemovedBg: mix(p.neutral, p.diffDelete || p.error, isDark ? 0.22 : 0.14),
    diffAddedLineNumberBg: mix(p.neutral, p.diffAdd || p.success, isDark ? 0.22 : 0.14),
    diffRemovedLineNumberBg: mix(p.neutral, p.diffDelete || p.error, isDark ? 0.22 : 0.14),
  }
}

function fail(msg: string): never { console.error('[convert] 失败: ' + msg); process.exit(1) }

async function main(): Promise<void> {
  const report: Record<string, { bytes: number; sha256: string }> = {}
  for (const name of NAMES) {
    const src = JSON.parse(await readFile(join(SRC, name + '.json'), 'utf8')) as DesktopThemeDoc
    const { light, dark } = src
    if (!light || !dark) fail(name + ': 缺 light/dark')
    const theme: Record<string, { dark: string; light: string }> = {}
    for (const role of Object.keys(convertOne(dark, true))) {
      const d = convertOne(dark, true)[role]
      const l = convertOne(light, false)[role]
      if (d === undefined || l === undefined) fail(name + ': 角色缺失 ' + role)
      theme[role] = { dark: d.toUpperCase(), light: l.toUpperCase() }
    }
    for (const k of REQUIRED_KEYS) {
      if (!(k in theme)) fail(name + ': 缺必填色位 ' + k)
    }
    const out = JSON.stringify({ defs: {}, theme: theme }, null, 2) + '\n'
    await writeFile(join(OUT, name + '.json'), out)
    report[name] = { bytes: out.length, sha256: createHash('sha256').update(out).digest('hex') }
    console.log('[convert] ' + name + ' ok (' + out.length + 'B)')
  }
  console.log(JSON.stringify(report))
}

await main()
