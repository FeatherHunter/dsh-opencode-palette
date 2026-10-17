// convert-desktop-themes.ts — opencode 2.0 桌面主题（desktop-theme.json）→ TUI 形 JSON
// 背景：2.0 新增 amoled / oc-2 / onedarkpro / shadesofpurple 四款只存在于
// packages/ui/src/theme/themes/（桌面 schema：light/dark palette + overrides），
// TUI 目录（本包同步源）没有它们。本脚本做一次诚实、显式、可重跑的格式转换：
//   - 直接取色：一一对应的官方色位（neutral/ink/primary/accent/success/warning/error/info/syntax-*）；
//   - 派生补齐：桌面缺省的层级色（panel/element/muted/border）用 mix() 在 neutral↔ink 轴上按固定比例取，
//     比例即文档（见 mix 注释），不逐主题手调；缺省 syntax 位按 one-dark 系惯例回退（串内有表）；
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
const REQUIRED_KEYS = ['background', 'text', 'textMuted', 'primary', 'accent', 'error', 'warning', 'success', 'info', 'border', 'borderActive', 'syntaxComment', 'syntaxKeyword', 'syntaxFunction', 'syntaxVariable', 'syntaxString', 'syntaxNumber', 'syntaxType', 'syntaxOperator']

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

function convertOne(mode: DesktopMode, isDark = true): ThemeRoles {
  const p = mode.palette
  const o = mode.overrides || {}
  const accent = p.accent || p.interactive || p.info
  const text = o['text-strong'] || p.ink
  const textMuted = o['text-weak'] || mix(p.ink, p.neutral, 0.45)
  const border = o['border-weak-base'] || mix(p.ink, p.neutral, 0.16)
  // 缺省 syntax 回退（one-dark 系惯例）：string≈success 绿、number≈constant、type≈info、operator≈muted、variable≈text、function≈primary
  return {
    background: p.neutral,
    backgroundPanel: o['surface-base'] || mix(p.neutral, p.ink, 0.07),
    backgroundElement: o['surface-raised-base'] || mix(p.neutral, p.ink, 0.14),
    text: text,
    textMuted: textMuted,
    primary: p.primary,
    accent: accent,
    error: p.error,
    warning: p.warning,
    success: p.success,
    info: p.info,
    border: border,
    borderActive: mix(p.ink, p.neutral, 0.32),
    syntaxComment: o['syntax-comment'],
    syntaxKeyword: o['syntax-keyword'],
    syntaxFunction: p.primary,
    syntaxVariable: text,
    syntaxString: o['syntax-string'] || p.success,
    syntaxNumber: o['syntax-constant'] || p.warning,
    syntaxType: o['syntax-type'] || p.info,
    syntaxOperator: textMuted,
    markdownLink: accent,
    markdownHeading: text,
    markdownCode: p.primary,
    markdownEmph: text,
    markdownStrong: text,
    markdownBlockQuote: textMuted,
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
