// 数据层同步脚本：从 opencode 官方不可变 commit 拉取主题 JSON -> src/themes/
// 用法:
//   node scripts/sync-themes.ts                    # verify（默认）：只校验、只报告本地漂移，绝不写主题 JSON
//   node scripts/sync-themes.ts --write            # 显式覆盖：用上游内容恢复本地文件（丢弃本地定制，清除 localCuration 声明）
//   node scripts/sync-themes.ts --update-baseline  # 显式升级：改 OPCODE_SHA 后跑，覆盖全部主题 + 重建基线（需随代码 review）
//   node scripts/sync-themes.ts --accept-local     # 人工 review 后登记本地定制（不联网；只写 MANIFEST.localCuration）
//   node scripts/sync-themes.ts --verbose          # verify 时连已声明定制的差异值也逐条打印
//
// 本地定制策略（#119）：预置主题已直接整改，不再等于上游内容。因此：
//   - verify 只报告漂移，不写任何主题 JSON —— 手工修改不会被下一次 sync 静默回滚。
//   - 漂移若已在 src/themes/MANIFEST.json 的 localCuration.themes 中声明 -> 预期内，退出码 0；
//     未声明漂移 / 文件缺失 / JSON 损坏 -> 退出码 1（先 git diff 复核，再决定 --accept-local 或 --write）。
//   - 覆盖本地内容必须显式：--write 或 --update-baseline；二者都会警告并清除本地定制声明。
// 版本锁见 OPCODE_SHA（commit SHA，不跟随 tag 移动；升级 = 改这里 + --update-baseline + npm test）。
// 职责: 下载 + 结构校验 + 基线预校验 + 漂移报告 + 显式落盘 + SHA256 指纹基线 + 第三方归属说明
import { createHash } from 'node:crypto'
import { mkdir, writeFile, readFile, rename, rm, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const THEMES_DIR = join(ROOT, 'src', 'themes')
const MANIFEST_PATH = join(THEMES_DIR, 'MANIFEST.json')
const NOTICES_PATH = join(THEMES_DIR, 'THIRD_PARTY_NOTICES.md')

// 版本锁：anomalyco/opencode 的不可变 commit SHA（对应 tag v1.18.12 的解析结果）。
// ASSET_BASE 指向不可变内容：tag 在上游被移动不会影响同步结果。
// 升级上游的唯一方式 = 改这里 + 跑 --update-baseline + 检查测试。
export const OPCODE_SHA = '0dd6950d1b06958fbcdcadf0ad56258257ab7fdb'
// 仅展示/基线注释用，不参与 URL（升级时同步更新注释，保持人类可读）。
export const OPCODE_TAG_ANNOTATION = 'v1.18.12'
export const ASSET_BASE = 'https://raw.githubusercontent.com/anomalyco/opencode/' + OPCODE_SHA + '/packages/tui/src/theme/assets/'

// 33 个内置主题（opencode packages/tui/src/theme/assets/ 目录的完整清单）
export const THEME_NAMES = ["aura","ayu","carbonfox","catppuccin-frappe","catppuccin-macchiato","catppuccin","cobalt2","cursor","dracula","everforest","flexoki","github","gruvbox","kanagawa","lucent-orng","material","matrix","mercury","monokai","nightowl","nord","one-dark","opencode","orng","osaka-jade","palenight","rosepine","solarized","synthwave84","tokyonight","vercel","vesper","zenburn"]

// 每个主题必须提供的语义颜色（缺失 = 上游结构变化或内容被篡改，同步直接报错）
export const REQUIRED_KEYS = ["background","text","textMuted","primary","accent","error","warning","success","info","border","borderActive","syntaxComment","syntaxKeyword","syntaxFunction","syntaxVariable","syntaxString","syntaxNumber","syntaxType","syntaxOperator"]

// 同步错误分类（no-baseline/tamper-suspect/baseline-expired/io-failed），调用方按 kind 分流。
export type SyncErrorKind = 'no-baseline' | 'tamper-suspect' | 'baseline-expired' | 'io-failed'

export interface SyncError extends Error {
  kind: SyncErrorKind
}

interface BaselineThemeEntry {
  bytes: number
  sha256: string
}

// 本地定制声明：MANIFEST.localCuration.themes[name] = true（或 { localCurated: true, note? }）。
// 声明 = “该文件与上游的差异是有意保留的本地定制”，verify 据此把漂移标为预期内（退出码 0）。
interface LocalCurationSection {
  policy?: string
  note?: string
  themes?: Record<string, unknown>
  [key: string]: unknown
}

interface BaselineManifest {
  source?: string
  rev?: string
  tag?: string
  syncedAt?: string
  themes: Record<string, BaselineThemeEntry>
  adapted20?: unknown
  localCuration?: LocalCurationSection
  // 基线里允许其他未知段（前向兼容），同步段以外的原样带走。
  [key: string]: unknown
}

interface StagedTheme {
  name: string
  data: unknown
  pretty: string
  sha256: string
  bytes: number
}

// 单处漂移：path 形如 theme.text / defs.darkBg；一侧缺失时对应值为 undefined（报告为“(缺失)”）。
export interface TokenChange {
  path: string
  expected: unknown
  local: unknown
}

export type DriftKind = 'drift' | 'missing' | 'unparseable'

// 一个主题的本地漂移。curated = MANIFEST.localCuration 已声明（预期内）。
export interface ThemeDrift {
  name: string
  kind: DriftKind
  curated: boolean
  changes: TokenChange[]
  detail?: string
}

type ReadText = (path: string, encoding: 'utf8') => Promise<string>
type WriteText = (path: string, data: string) => Promise<unknown>
type RenameFile = (from: string, to: string) => Promise<unknown>
type RemoveFile = (path: string, opts: { force: true }) => Promise<unknown>
type ListDir = (path: string) => Promise<unknown>
type Mkdirs = (path: string, opts: { recursive: true }) => Promise<unknown>

interface StagedIo {
  write: WriteText
  renameFile: RenameFile
  remove: RemoveFile
  read: ReadText
}

interface WriteStagedOptions extends StagedIo {
  onlyIfChanged: boolean
}

interface NoticesIo extends StagedIo {
  themesDir: string
}

export interface SyncThemesOptions {
  themesDir?: string
  manifestPath?: string
  noticesPath?: string
  themeNames?: readonly string[]
  scriptSha?: string
  tagAnnotation?: string
  updateBaseline?: boolean
  // 显式覆盖模式（CLI --write）：校验通过后用上游内容覆盖本地文件，并清除 localCuration 声明。
  // 默认为 false —— 不允许隐式覆盖本地定制。
  overwrite?: boolean
  fetchText?: (name: string) => Promise<string>
  read?: ReadText
  write?: WriteText
  renameFile?: RenameFile
  remove?: RemoveFile
  listDir?: ListDir
  mkdirs?: Mkdirs
}

export interface SyncResult {
  updated: boolean
  count: number
  rev: string
  // 仅 verify 模式填充：本地漂移清单（不写盘）。
  drift: ThemeDrift[]
  // 显式写入模式（--write / --update-baseline）实际写下的主题名。
  written: string[]
  // 因覆盖而被清除的本地定制声明（主题名）。
  discardedCuration: string[]
}

export interface AcceptLocalOptions {
  themesDir?: string
  manifestPath?: string
  themeNames?: readonly string[]
  read?: ReadText
  write?: WriteText
  renameFile?: RenameFile
  remove?: RemoveFile
}

export interface AcceptLocalResult {
  // 本次登记为本地定制的主题。
  accepted: string[]
  // 本次清除声明（已与上游一致）的主题。
  unmarked: string[]
  // 无法登记的主题及原因（文件缺失 / JSON 损坏 / 结构失败 / 基线缺条目）。
  broken: string[]
}

export type SyncMode = 'verify' | 'write' | 'update-baseline' | 'accept-local'

export interface SyncCliOptions {
  mode: SyncMode
  verbose: boolean
}

// 拼接长文案，避免模板字符串（本文件曾因嵌套插值写坏，统一用 join('')）。
function msg(...parts: string[]): string {
  return parts.join('')
}

// 第三方主题归属（仅 --update-baseline 时写入 NOTICES，随包分发）
export function noticesText(): string {
  return [
    msg('opencode 主题资产源自 opencode (MIT) 仓库 packages/tui/src/theme/assets/，commit ', OPCODE_SHA, '（对应 tag ', OPCODE_TAG_ANNOTATION, '，不跟随 tag 移动）。'),
    '各主题原创归属：',
    '  - aura: Aura Theme (VSCode)',
    '  - ayu: ayu-theme (dempfi)',
    '  - carbonfox: nightfox 系列 (edeneast)',
    '  - catppuccin / catppuccin-frappe / catppuccin-macchiato: Catppuccin 社区 (MIT)',
    '  - cobalt2: Wes Bos Cobalt2',
    '  - cursor: Cursor IDE',
    '  - dracula: Dracula (MIT)',
    '  - everforest: sainnhe/everforest (MIT)',
    '  - flexoki: Steph Ango / kepano (MIT)',
    '  - github: GitHub 官方配色',
    '  - gruvbox: morhetz/gruvbox (MIT)',
    '  - kanagawa: rebelot/kanagawa.nvim (MIT)',
    '  - lucent-orng / orng / mercury / osaka-jade / vesper / matrix / synthwave84 / tokyonight / one-dark / palenight / material / monokai / nightowl / nord / rosepine / solarized / vercel / zenburn: 社区/编辑器主题，随 opencode MIT 分发',
  ].join('\n')
}

export function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

export function prettyOf(data: unknown): string {
  return JSON.stringify(data, null, 2) + '\n'
}

// 结构校验：defs 与 theme 均为对象；theme 含全部必填颜色。
// 抛错（不直接 exit），由调用方分类为“疑似篡改”并拒绝写入。
export function validateStructure(name: string, data: unknown): true {
  if (typeof data !== 'object' || data === null) throw new Error(name + ': 非对象')
  const doc = data as { defs?: unknown; theme?: unknown }
  if (typeof doc.defs !== 'object' || doc.defs === null) throw new Error(name + ': 缺 defs')
  if (typeof doc.theme !== 'object' || doc.theme === null) throw new Error(name + ': 缺 theme')
  const theme = doc.theme as Record<string, unknown>
  for (const key of REQUIRED_KEYS) {
    if (!(key in theme)) throw new Error(name + ': 缺必填颜色 ' + key)
  }
  return true
}

function syncError(kind: SyncErrorKind, message: string): SyncError {
  const e = new Error(message) as SyncError
  e.kind = kind
  return e
}

// 保留原有兜底口径：e && e.message ? e.message : e（非 Error 值走字符串拼接）。
function failureText(e: unknown): string {
  const err = e as { message?: unknown } | null | undefined
  return err && err.message ? String(err.message) : String(e)
}

function tamperMessage(name: string, reason: string, scriptSha: string): string {
  return msg('[sync] 疑似篡改：', name, ' ', reason, '。已拒绝写入，现有主题文件未动。',
    '排查：检查网络/TLS 与上游 commit ', scriptSha, ' 是否被改写；',
    '确认是上游合法变更（而非投毒）后，再按“基线过期”流程显式更新',
    '（改 OPCODE_SHA 常量 + node scripts/sync-themes.ts --update-baseline + npm test）。',
    '切勿直接跳过核查。')
}

function expiredMessage(scriptSha: string, baselineRev: string, count: number): string {
  return msg('[sync] 基线过期：脚本引用的上游 SHA（', scriptSha, '）与检入基线（', baselineRev, '）不一致，',
    String(count), ' 个主题与旧基线不一致属预期。动作：人工 review 上游 diff，确认合法后跑 ',
    'node scripts/sync-themes.ts --update-baseline 更新基线（会覆盖本地定制），再跑 npm test。')
}

// 读检入基线：缺失/损坏/缺条目一律抛 no-baseline（不做“无历史即放行”，首次同步同样受约束）。
async function loadBaseline(manifestPath: string, read: ReadText = defaultReadText): Promise<BaselineManifest> {
  let raw: string
  try {
    raw = await read(manifestPath, 'utf8')
  } catch {
    throw syncError('no-baseline',
      msg('[sync] 无可信基线：', manifestPath, ' 缺失或不可读。首次同步同样受校验约束，不做“无历史即放行”。',
        '动作：确认 OPCODE_SHA 无误后，用 node scripts/sync-themes.ts --update-baseline 显式建立基线（随代码 review 入仓），再重跑校验。'))
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    throw syncError('no-baseline', msg('[sync] 无可信基线：', manifestPath, ' 不是合法 JSON（', (e as Error).message, '）。已拒绝写入，现有主题文件未动。'))
  }
  const manifest = parsed as BaselineManifest | null
  if (typeof manifest !== 'object' || manifest === null || typeof manifest.themes !== 'object' || manifest.themes === null) {
    throw syncError('no-baseline', msg('[sync] 无可信基线：', manifestPath, ' 缺 themes 指纹表。已拒绝写入，现有主题文件未动。'))
  }
  return manifest
}

// --update-baseline 在基线缺失/损坏时仍要能显式建立：宽容读（坏了就从空起，坏内容不影响下载校验）。
async function loadBaselineLenient(manifestPath: string, read: ReadText): Promise<BaselineManifest | null> {
  try {
    const raw = await read(manifestPath, 'utf8')
    const m: unknown = JSON.parse(raw)
    if (typeof m === 'object' && m !== null) return m as BaselineManifest
    return null
  } catch {
    return null
  }
}

async function defaultReadText(path: string, _encoding: 'utf8'): Promise<string> {
  return await readFile(path, 'utf8')
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// 语义深比较：JSON 键序、空白格式不算差异（只有实际值变化才算漂移）。
export function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((v, i) => valuesEqual(v, b[i]))
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ak = Object.keys(a)
    const bk = Object.keys(b)
    if (ak.length !== bk.length) return false
    for (const k of ak) {
      if (!(k in b)) return false
      if (!valuesEqual(a[k], b[k])) return false
    }
    return true
  }
  return false
}

// 逐键收集差异：path 用点号连接（theme.text / defs.darkBg），数组整体算一处差异。
export function diffValues(expected: unknown, local: unknown, path: string, out: TokenChange[]): void {
  if (valuesEqual(expected, local)) return
  if (isPlainObject(expected) && isPlainObject(local)) {
    const keys = Array.from(new Set([...Object.keys(expected), ...Object.keys(local)])).sort()
    for (const k of keys) {
      diffValues(expected[k], local[k], path ? path + '.' + k : k, out)
    }
    return
  }
  out.push({ path: path || '(root)', expected, local })
}

// MANIFEST.localCuration.themes 的声明集合。兼容 name: true 与 name: { localCurated: true } 两种写法。
export function curatedThemeNames(manifest: BaselineManifest | null | undefined): string[] {
  const section = manifest && manifest.localCuration
  if (!isPlainObject(section)) return []
  const themes = section.themes
  if (!isPlainObject(themes)) return []
  const out: string[] = []
  for (const [name, value] of Object.entries(themes)) {
    if (value === true) { out.push(name); continue }
    if (isPlainObject(value) && value.localCurated === true) out.push(name)
  }
  return out
}

// verify 退出码：0 = 无漂移，或全部漂移已声明为本地定制；1 = 有未声明漂移 / 文件缺失 / JSON 损坏。
export function exitCodeForDrift(drift: readonly ThemeDrift[]): 0 | 1 {
  return drift.some((d) => d.kind !== 'drift' || !d.curated) ? 1 : 0
}

function formatDriftValue(v: unknown): string {
  if (typeof v === 'undefined') return '(缺失)'
  if (typeof v === 'string') return v
  return JSON.stringify(v)
}

const DRIFT_KEY_PREVIEW = 16

// 人类可读的漂移报告。已声明的本地定制默认只列差异键（避免一次刷几十屏），加 verbose 才打印 期望 vs 本地。
export function formatDriftReport(drift: readonly ThemeDrift[], options: { verbose?: boolean } = {}): string[] {
  const lines: string[] = []
  for (const d of drift) {
    const status = d.kind === 'missing'
      ? '本地文件缺失'
      : d.kind === 'unparseable'
        ? '本地 JSON 解析失败'
        : d.curated
          ? '本地定制漂移（已声明，预期内）'
          : '本地漂移（未声明）'
    lines.push('[sync] ' + status + ': ' + d.name)
    if (d.kind === 'unparseable' && d.detail) lines.push('  ' + d.detail)
    if (d.kind === 'missing') {
      lines.push('  动作：npm run sync -- --write 可从上游恢复该文件（显式覆盖，会丢弃本地定制）。')
      continue
    }
    if (options.verbose || !d.curated) {
      for (const c of d.changes) {
        lines.push('  ' + c.path + ': 上游=' + formatDriftValue(c.expected) + ' 本地=' + formatDriftValue(c.local))
      }
    } else {
      const preview = d.changes.slice(0, DRIFT_KEY_PREVIEW).map((c) => c.path)
      if (d.changes.length > DRIFT_KEY_PREVIEW) preview.push('...(+' + (d.changes.length - DRIFT_KEY_PREVIEW) + ')')
      lines.push('  差异键（' + d.changes.length + ' 处）: ' + preview.join(', '))
    }
  }
  return lines
}

// 本地漂移检测（只读）：逐主题比较“上游内容”与“本地文件”，返回结构化差异，绝不写盘。
async function collectDrift(
  themesDir: string,
  staged: readonly StagedTheme[],
  baseline: BaselineManifest,
  read: ReadText,
): Promise<ThemeDrift[]> {
  const curated = new Set(curatedThemeNames(baseline))
  const drift: ThemeDrift[] = []
  for (const s of staged) {
    const file = join(themesDir, s.name + '.json')
    let raw: string
    try {
      raw = await read(file, 'utf8')
    } catch {
      drift.push({ name: s.name, kind: 'missing', curated: curated.has(s.name), changes: [] })
      continue
    }
    let local: unknown
    try {
      local = JSON.parse(raw)
    } catch (e) {
      drift.push({ name: s.name, kind: 'unparseable', curated: curated.has(s.name), changes: [], detail: failureText(e) })
      continue
    }
    const changes: TokenChange[] = []
    diffValues(s.data, local, '', changes)
    if (changes.length > 0) drift.push({ name: s.name, kind: 'drift', curated: curated.has(s.name), changes })
  }
  return drift
}

// 上游内容 vs 检入基线：任何不一致/缺条目都抛错（tamper-suspect / baseline-expired / no-baseline），不写任何文件。
function assertUpstreamMatchesBaseline(checked: BaselineManifest, staged: readonly StagedTheme[], scriptSha: string): void {
  const mismatched: string[] = []
  for (const s of staged) {
    const entry = checked.themes[s.name]
    if (!entry || typeof entry.sha256 !== 'string') {
      throw syncError('no-baseline',
        msg('[sync] 无可信基线：基线缺 ', s.name, ' 条目。首次同步同样受校验约束，不做“无历史即放行”。',
          '动作：确认 OPCODE_SHA 无误后，用 node scripts/sync-themes.ts --update-baseline 显式建立基线（随代码 review 入仓），再重跑校验。'))
    }
    if (entry.sha256 !== s.sha256) mismatched.push(s.name)
  }
  if (mismatched.length === 0) return
  const baselineRev = (typeof checked.rev === 'string') ? checked.rev : null
  if (baselineRev && baselineRev !== scriptSha) {
    throw syncError('baseline-expired', expiredMessage(scriptSha, baselineRev, mismatched.length) + '首个不一致：' + mismatched[0] + '（共 ' + mismatched.length + ' 个）。')
  }
  const legacyHint = baselineRev ? '' : '（基线为旧格式、无 rev 字段：先核对 OPCODE_SHA 是否对应基线 tag，确认是格式迁移而非投毒后，再用 --update-baseline 显式迁移。）'
  const first = mismatched[0]
  const firstStaged = staged.find((s) => s.name === first)
  const got = firstStaged ? firstStaged.sha256 : '(missing)'
  const base = checked.themes[first]
  throw syncError('tamper-suspect',
    tamperMessage(first, msg('内容与检入基线不一致（基线 ', base.sha256.slice(0, 12), '... vs 下载 ', got.slice(0, 12), '...；共 ', String(mismatched.length), ' 个：', mismatched.join('、'), '）', legacyHint), scriptSha))
}

// 核心同步：全部可注入（测试用 fixture 演练，不碰网络与真实目录）。
// - fetchText(name): 返回上游原始文本（默认走 ASSET_BASE + fetch）。
// - 默认 verify：对照基线校验上游 + 报告本地漂移，绝不写盘。
// - overwrite=true（--write）：校验通过后显式用上游内容覆盖本地，并清除 localCuration 声明。
// - updateBaseline=true：显式升级路径；仍做结构校验（坏内容不进基线），通过后原子落盘 + 重建基线。
export async function syncThemes({
  themesDir = THEMES_DIR,
  manifestPath,
  noticesPath,
  themeNames = THEME_NAMES,
  scriptSha = OPCODE_SHA,
  tagAnnotation = OPCODE_TAG_ANNOTATION,
  updateBaseline = false,
  overwrite = false,
  fetchText = defaultFetchText,
  read = defaultReadText,
  write = writeFile as WriteText,
  renameFile = rename,
  remove = rm,
  listDir = readdir,
  mkdirs = mkdir,
}: SyncThemesOptions = {}): Promise<SyncResult> {
  if (updateBaseline && overwrite) {
    throw new Error('[sync] --update-baseline 与 --write 互斥：升级请用 --update-baseline，恢复上游内容请用 --write。')
  }
  manifestPath = manifestPath || join(themesDir, 'MANIFEST.json')
  noticesPath = noticesPath || join(themesDir, 'THIRD_PARTY_NOTICES.md')
  const baseline = updateBaseline ? await loadBaselineLenient(manifestPath, read) : await loadBaseline(manifestPath, read)

  // 阶段一：全部下载到内存 + 结构校验（不碰磁盘现有文件）。
  const staged: StagedTheme[] = []
  for (const name of themeNames) {
    let text: string
    try {
      text = await fetchText(name)
    } catch (e) {
      throw syncError('tamper-suspect', tamperMessage(name, '下载失败（' + failureText(e) + '）', scriptSha))
    }
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch (e) {
      throw syncError('tamper-suspect', tamperMessage(name, 'JSON 解析失败（' + (e as Error).message + '）', scriptSha))
    }
    try {
      validateStructure(name, data)
    } catch (e) {
      throw syncError('tamper-suspect', tamperMessage(name, '结构校验失败（' + (e as Error).message + '）', scriptSha))
    }
    const pretty = prettyOf(data)
    staged.push({ name, data, pretty, sha256: sha256Hex(pretty), bytes: pretty.length })
  }

  if (updateBaseline) {
    // 显式升级：原子落盘 + 重建基线（保留 adapted20 等非同步段；丢弃描述旧本地定制的 localCuration）。
    await mkdirs(themesDir, { recursive: true })
    const written = await writeStaged(themesDir, staged, { write, renameFile, remove, read, onlyIfChanged: false })
    const discardedCuration = curatedThemeNames(baseline)
    const next: BaselineManifest = {
      source: (baseline && baseline.source) || 'anomalyco/opencode',
      rev: scriptSha,
      tag: tagAnnotation + '（注释用，不参与拉取；拉取以 rev 为准）',
      syncedAt: new Date().toISOString(),
      themes: {},
    }
    for (const s of staged) next.themes[s.name] = { bytes: s.bytes, sha256: s.sha256 }
    if (baseline && typeof baseline.adapted20 !== 'undefined') next.adapted20 = baseline.adapted20
    // 保留基线里其他未知段（前向兼容）；localCuration 例外：覆盖后主题文件 = 上游内容，旧声明已失效，必须清除。
    if (baseline) {
      for (const k of Object.keys(baseline)) {
        if (k === 'localCuration') continue
        if (!(k in next)) next[k] = baseline[k]
      }
    }
    await writeManifestAtomic(manifestPath, next, { write, renameFile, remove })
    // NOTICES 只更新首行（来源 pin），其余手工维护段（字体/2.0 主题说明）原样保留。
    await updateNoticesFirstLine(noticesPath, { read, write, renameFile, remove, themesDir })
    return { updated: true, count: staged.length, rev: scriptSha, drift: [], written, discardedCuration }
  }

  // 校验模式下 loadBaseline 保证非 null（失败已抛错），这里显式收窄类型。
  const checked = baseline as BaselineManifest
  // 阶段二：对照基线预校验上游内容；失败即抛错，不写任何文件。
  assertUpstreamMatchesBaseline(checked, staged, scriptSha)

  if (overwrite) {
    // 显式覆盖（--write）：校验已通过，才允许用上游内容恢复本地文件；这是唯一会丢弃本地定制的同步路径。
    await mkdirs(themesDir, { recursive: true })
    const discardedCuration = curatedThemeNames(checked)
    const written = await writeStaged(themesDir, staged, { write, renameFile, remove, read, onlyIfChanged: true })
    if (typeof checked.localCuration !== 'undefined') {
      const next: BaselineManifest = { ...checked }
      delete next.localCuration
      await writeManifestAtomic(manifestPath, next, { write, renameFile, remove })
    }
    return { updated: written.length > 0, count: staged.length, rev: checked.rev || scriptSha, drift: [], written, discardedCuration }
  }

  // 阶段三（默认 verify）：只读检测本地漂移并返回；不写主题 JSON、不碰 MANIFEST/NOTICES。
  const drift = await collectDrift(themesDir, staged, checked, read)
  void listDir
  return { updated: false, count: staged.length, rev: checked.rev || scriptSha, drift, written: [], discardedCuration: [] }
}

const LOCAL_CURATION_NOTE = '预置主题已本地直接整改（37 槽判尺），不再等于 opencode 上游内容；verify 只报告不写盘，覆盖必须显式（--write / sync:update）。'

// --accept-local：人工 review 后把“本地与上游不同”的主题登记为本地定制（只写 MANIFEST，不联网、不改主题 JSON）。
export async function acceptLocalCuration({
  themesDir = THEMES_DIR,
  manifestPath,
  themeNames = THEME_NAMES,
  read = defaultReadText,
  write = writeFile as WriteText,
  renameFile = rename,
  remove = rm,
}: AcceptLocalOptions = {}): Promise<AcceptLocalResult> {
  manifestPath = manifestPath || join(themesDir, 'MANIFEST.json')
  const manifest = await loadBaseline(manifestPath, read)
  const existingThemes = isPlainObject(manifest.localCuration) && isPlainObject(manifest.localCuration.themes)
    ? { ...manifest.localCuration.themes }
    : {}
  const currentThemes: Record<string, unknown> = existingThemes
  const accepted: string[] = []
  const unmarked: string[] = []
  const broken: string[] = []
  for (const name of themeNames) {
    const entry = manifest.themes[name]
    if (!entry || typeof entry.sha256 !== 'string') { broken.push(name + '（基线缺条目）'); continue }
    let raw: string
    try {
      raw = await read(join(themesDir, name + '.json'), 'utf8')
    } catch {
      broken.push(name + '（文件缺失）')
      continue
    }
    let data: unknown
    try {
      data = JSON.parse(raw)
    } catch {
      broken.push(name + '（JSON 解析失败）')
      continue
    }
    try {
      validateStructure(name, data)
    } catch {
      broken.push(name + '（结构校验失败）')
      continue
    }
    if (sha256Hex(prettyOf(data)) !== entry.sha256) {
      currentThemes[name] = true
      accepted.push(name)
    } else if (name in currentThemes) {
      delete currentThemes[name]
      unmarked.push(name)
    }
  }
  const currentSection = isPlainObject(manifest.localCuration) ? manifest.localCuration : {}
  const next: BaselineManifest = {
    ...manifest,
    localCuration: {
      ...currentSection,
      policy: (typeof currentSection.policy === 'string' && currentSection.policy) || 'preserve-local',
      note: (typeof currentSection.note === 'string' && currentSection.note) || LOCAL_CURATION_NOTE,
      themes: currentThemes,
    },
  }
  await writeManifestAtomic(manifestPath, next, { write, renameFile, remove })
  return { accepted, unmarked, broken }
}

// 原子写 MANIFEST.json：tmp + rename，失败清理 tmp 残留。
async function writeManifestAtomic(
  manifestPath: string,
  manifest: unknown,
  { write, renameFile, remove }: { write: WriteText; renameFile: RenameFile; remove: RemoveFile },
): Promise<void> {
  const tmp = manifestPath + '.tmp-' + process.pid
  try {
    await write(tmp, JSON.stringify(manifest, null, 2) + '\n')
    await renameFile(tmp, manifestPath)
  } catch (e) {
    try { await remove(tmp, { force: true }) } catch { /* 清理尽力而为 */ }
    throw syncError('io-failed', msg('[sync] 基线落盘失败：', failureText(e), '。已清理临时文件，原 MANIFEST.json 未被破坏。'))
  }
}

// 原子落盘：逐文件 tmp + rename（同目录 rename 原子），失败时清理 tmp 残留，不留半成品。
// onlyIfChanged=true 时内容一致则跳写（减少 mtime 抖动；本地缺失/被改则恢复）。
async function writeStaged(themesDir: string, staged: readonly StagedTheme[], { write, renameFile, remove, read, onlyIfChanged }: WriteStagedOptions): Promise<string[]> {
  const tmps: string[] = []
  const written: string[] = []
  try {
    for (const s of staged) {
      const final = join(themesDir, s.name + '.json')
      if (onlyIfChanged) {
        try {
          const cur = await read(final, 'utf8')
          if (cur === s.pretty) continue
        } catch {
          // 本地缺失 -> 需要写入（恢复）。
        }
      }
      const tmp = final + '.tmp-' + process.pid
      tmps.push(tmp)
      await write(tmp, s.pretty)
      await renameFile(tmp, final)
      written.push(s.name)
    }
    return written
  } catch (e) {
    for (const t of tmps) {
      try { await remove(t, { force: true }) } catch { /* 清理尽力而为 */ }
    }
    throw syncError('io-failed', msg('[sync] 落盘失败：', failureText(e), '。已清理临时文件，现有完好文件未被破坏，重跑可恢复。'))
  }
}

// NOTICES 首行是同步来源 pin（commit SHA），其余行是手工维护的归属说明。
// 更新时只换首行、保留尾部（含尾换行状态）；文件缺失时才写完整模板。经 tmp + rename 原子落盘。
async function updateNoticesFirstLine(noticesPath: string, { read, write, renameFile, remove, themesDir }: NoticesIo): Promise<void> {
  const firstLine = noticesText().split('\n')[0]
  let out: string
  try {
    const cur = await read(noticesPath, 'utf8')
    const lines = cur.split('\n')
    lines[0] = firstLine
    out = lines.join('\n') // split/join 往返，尾换行状态原样保留
    if (out === cur) return // 首行已是最新，无抖动
  } catch {
    out = noticesText() // 文件缺失 -> 写完整模板
  }
  const tmp = join(themesDir, 'THIRD_PARTY_NOTICES.md.tmp-' + process.pid)
  try {
    await write(tmp, out)
    await renameFile(tmp, noticesPath)
  } catch (e) {
    try { await remove(tmp, { force: true }) } catch { /* 清理尽力而为 */ }
    throw syncError('io-failed', msg('[sync] 落盘失败：', failureText(e), '。重跑可恢复。'))
  }
}

async function defaultFetchText(name: string): Promise<string> {
  const url = ASSET_BASE + name + '.json'
  const res = await fetch(url)
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url)
  return await res.text()
}

const SYNC_USAGE = [
  '用法: node scripts/sync-themes.ts [--verbose]',
  '      node scripts/sync-themes.ts --write            # 显式用上游内容覆盖本地（丢弃本地定制）',
  '      node scripts/sync-themes.ts --update-baseline  # 显式升级上游 pin（覆盖主题 + 重建基线）',
  '      node scripts/sync-themes.ts --accept-local     # 人工 review 后登记本地定制（只写 MANIFEST）',
].join('\n')

// CLI 参数解析：模式互斥；未知参数直接报错（避免手误静默降级成 verify）。
export function parseArgs(argv: readonly string[]): SyncCliOptions {
  const modes: SyncMode[] = []
  let verbose = false
  for (const arg of argv) {
    if (arg === '--verbose') { verbose = true; continue }
    if (arg === '--write') { modes.push('write'); continue }
    if (arg === '--update-baseline') { modes.push('update-baseline'); continue }
    if (arg === '--accept-local') { modes.push('accept-local'); continue }
    throw new Error('[sync] 未知参数：' + arg + '。\n' + SYNC_USAGE)
  }
  if (modes.length > 1) throw new Error('[sync] 参数互斥：' + modes.join(' 与 ') + ' 不能同时使用。\n' + SYNC_USAGE)
  const mode: SyncMode = modes.length === 1 ? modes[0] : 'verify'
  return { mode, verbose }
}

async function main(): Promise<void> {
  let cli: SyncCliOptions
  try {
    cli = parseArgs(process.argv.slice(2))
  } catch (e) {
    console.error(failureText(e))
    process.exitCode = 2
    return
  }
  try {
    if (cli.mode === 'accept-local') {
      const r = await acceptLocalCuration({})
      if (r.accepted.length > 0) console.log('[sync] 已登记本地定制：' + r.accepted.length + ' 个主题 -> src/themes/MANIFEST.json（localCuration）')
      if (r.unmarked.length > 0) console.log('[sync] 已清除不再漂移的声明：' + r.unmarked.length + ' 个主题（' + r.unmarked.join('、') + '）')
      if (r.broken.length > 0) {
        console.error('[sync] 跳过（文件缺失/损坏，未登记）：' + r.broken.join('、'))
        console.error('[sync] 修复：npm run sync -- --write 可从上游恢复这些主题，或先修好 JSON 后重跑 --accept-local。')
        process.exitCode = 1
        return
      }
      console.log('[sync] 完成：本地定制标记已更新（未改动任何主题 JSON）。')
      return
    }
    if (cli.mode === 'update-baseline') {
      const r = await syncThemes({ updateBaseline: true })
      console.log('[sync] 完成（基线已更新）: ' + r.count + ' 个主题 -> src/themes/ (' + OPCODE_SHA.slice(0, 12) + '... 对应 tag ' + OPCODE_TAG_ANNOTATION + ')')
      if (r.discardedCuration.length > 0) {
        console.log('[sync] 已清除 ' + r.discardedCuration.length + ' 个本地定制声明（覆盖后主题文件 = 上游内容）：' + r.discardedCuration.join('、') + '。')
        console.log('[sync]    若仍要保留本地定制：人工合并 diff 后跑 npm run sync -- --accept-local 重新登记。')
      }
      console.log('[sync] 下一步：git diff 检查基线变更 + npm test 全绿后再提交（基线随代码 review）。')
      return
    }
    if (cli.mode === 'write') {
      console.log('[sync] 警告：--write 用上游内容覆盖本地主题文件，会丢弃本地定制并清除 MANIFEST.localCuration 声明。')
      const r = await syncThemes({ overwrite: true })
      console.log('[sync] 完成（显式覆盖）: 写回 ' + r.written.length + ' 个文件 -> src/themes/ (' + OPCODE_SHA.slice(0, 12) + '...)')
      if (r.discardedCuration.length > 0) console.log('[sync] 已清除 ' + r.discardedCuration.length + ' 个本地定制声明：' + r.discardedCuration.join('、') + '。')
      return
    }
    const r = await syncThemes({})
    for (const line of formatDriftReport(r.drift, { verbose: cli.verbose })) console.log(line)
    if (r.drift.length === 0) {
      console.log('[sync] 校验通过：' + r.count + ' 个主题与上游一致，无本地漂移（未写盘）。')
      return
    }
    const fatal = r.drift.filter((d) => d.kind !== 'drift' || !d.curated)
    const declared = r.drift.length - fatal.length
    console.log('[sync] 校验完成：' + r.count + ' 个主题，本地差异 ' + r.drift.length + ' 个（已声明定制 ' + declared + '，需处理 ' + fatal.length + '）；未写盘。')
    if (exitCodeForDrift(r.drift) === 0) {
      console.log('[sync] 上述差异均已在 MANIFEST.localCuration 声明为本地定制（预期内）；上游更新需人工合并。')
      return
    }
    console.error('[sync] 发现未声明的本地漂移或损坏：' + fatal.length + ' 个主题（未写盘）。')
    console.error('  有意修改：先 git diff 复核，再跑 npm run sync -- --accept-local 登记本地定制。')
    console.error('  放弃修改：跑 npm run sync -- --write 显式用上游内容覆盖（会丢弃本地定制）。')
    console.error('  加 --verbose 可打印已声明漂移的逐项 期望 vs 本地。')
    process.exitCode = 1
  } catch (e) {
    console.error(failureText(e))
    process.exitCode = 1
  }
}

const invokedAsScript = ((): boolean => {
  try {
    return Boolean(process.argv[1]) && pathToFileURL(process.argv[1]).href === import.meta.url
  } catch {
    return false
  }
})()
if (invokedAsScript) await main()
