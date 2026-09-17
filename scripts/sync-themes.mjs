// 数据层同步脚本：从 opencode 官方不可变 commit 拉取全部主题 JSON → src/themes/
// 用法:
//   node scripts/sync-themes.mjs                  # 默认：下载→对照检入基线预校验→原子落盘（只读基线，不改基线）
//   node scripts/sync-themes.mjs --update-baseline # 显式升级：改 OPCODE_SHA 后跑，更新主题 + 基线（需随代码 review）
// 版本锁见 OPCODE_SHA（commit SHA，不跟随 tag 移动；升级 = 改这里 + --update-baseline + npm test）。
// 职责: 下载 + 结构校验 + 基线预校验 + 原子落盘 + SHA256 指纹基线 + 第三方归属说明
import { createHash } from 'node:crypto'
import { mkdir, writeFile, readFile, rename, rm, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const THEMES_DIR = join(ROOT, 'src', 'themes')
const MANIFEST_PATH = join(THEMES_DIR, 'MANIFEST.json')
const NOTICES_PATH = join(THEMES_DIR, 'THIRD_PARTY_NOTICES.md')

// ⚠️ 版本锁：anomalyco/opencode 的不可变 commit SHA（对应 tag v1.18.12 的解析结果，
// 取值时用 `gh api repos/anomalyco/opencode/git/ref/tags/v1.18.12` 核对）。
// ASSET_BASE 指向不可变内容：tag 在上游被移动不会影响同步结果。
// 升级上游的唯一方式 = 改这里 + 跑 --update-baseline + 检查测试。
export const OPCODE_SHA = '0dd6950d1b06958fbcdcadf0ad56258257ab7fdb'
// 仅展示/基线注释用，不参与 URL（升级时同步更新注释，保持人类可读）。
export const OPCODE_TAG_ANNOTATION = 'v1.18.12'
export const ASSET_BASE = `https://raw.githubusercontent.com/anomalyco/opencode/${OPCODE_SHA}/packages/tui/src/theme/assets/`

// 33 个内置主题（opencode packages/tui/src/theme/assets/ 目录的完整清单）
export const THEME_NAMES = ["aura","ayu","carbonfox","catppuccin-frappe","catppuccin-macchiato","catppuccin","cobalt2","cursor","dracula","everforest","flexoki","github","gruvbox","kanagawa","lucent-orng","material","matrix","mercury","monokai","nightowl","nord","one-dark","opencode","orng","osaka-jade","palenight","rosepine","solarized","synthwave84","tokyonight","vercel","vesper","zenburn"]

// 每个主题必须提供的语义色位（缺失 = 上游结构变化或内容被篡改，同步直接报错）
export const REQUIRED_KEYS = ["background","text","textMuted","primary","accent","error","warning","success","info","border","borderActive","syntaxComment","syntaxKeyword","syntaxFunction","syntaxVariable","syntaxString","syntaxNumber","syntaxType","syntaxOperator"]

// 第三方主题归属（仅 --update-baseline 时写入 NOTICES，随包分发）
export function noticesText() {
  return [
    `opencode 主题资产源自 opencode (MIT) 仓库 packages/tui/src/theme/assets/，commit ${OPCODE_SHA}（对应 tag ${OPCODE_TAG_ANNOTATION}，不跟随 tag 移动）。`,
    "各主题原创归属：",
    "  - aura: Aura Theme (VSCode)",
    "  - ayu: ayu-theme (dempfi)",
    "  - carbonfox: nightfox 系列 (edeneast)",
    "  - catppuccin / catppuccin-frappe / catppuccin-macchiato: Catppuccin 社区 (MIT)",
    "  - cobalt2: Wes Bos Cobalt2",
    "  - cursor: Cursor IDE",
    "  - dracula: Dracula (MIT)",
    "  - everforest: sainnhe/everforest (MIT)",
    "  - flexoki: Steph Ango / kepano (MIT)",
    "  - github: GitHub 官方配色",
    "  - gruvbox: morhetz/gruvbox (MIT)",
    "  - kanagawa: rebelot/kanagawa.nvim (MIT)",
    "  - lucent-orng / orng / mercury / osaka-jade / vesper / matrix / synthwave84 / tokyonight / one-dark / palenight / material / monokai / nightowl / nord / rosepine / solarized / vercel / zenburn: 社区/编辑器主题，随 opencode MIT 分发"
  ].join('\n')
}

export function sha256Hex(s) {
  return createHash('sha256').update(s).digest('hex')
}

export function prettyOf(data) {
  return JSON.stringify(data, null, 2) + '\n'
}

// 结构校验：defs 与 theme 均为对象；theme 含全部必填色位。
// 抛错（不直接 exit），由调用方分类为“疑似篡改”并拒绝写入。
export function validateStructure(name, data) {
  if (typeof data !== 'object' || data === null) throw new Error(name + ': 非对象')
  if (typeof data.defs !== 'object' || data.defs === null) throw new Error(name + ': 缺 defs')
  if (typeof data.theme !== 'object' || data.theme === null) throw new Error(name + ': 缺 theme')
  for (const key of REQUIRED_KEYS) {
    if (!(key in data.theme)) throw new Error(name + ': 缺必填色位 ' + key)
  }
  return true
}

function syncError(kind, message) {
  const e = new Error(message)
  e.kind = kind
  return e
}

function tamperMessage(name, reason, scriptSha) {
  return `[sync] 疑似篡改：${name} ${reason}。已拒绝写入，现有主题文件未动。` +
    `排查：检查网络/TLS 与上游 commit ${scriptSha} 是否被改写；` +
    `确认是上游合法变更（而非投毒）后，再按“基线过期”流程显式更新` +
    `（改 OPCODE_SHA 常量 + node scripts/sync-themes.mjs --update-baseline + npm test）。` +
    `切勿直接 --update-baseline 跳过核查。`
}

function expiredMessage(scriptSha, baselineRev, count) {
  return `[sync] 基线过期：脚本引用的上游 SHA（${scriptSha}）与检入基线（${baselineRev}）不一致，` +
    `${count} 个主题与旧基线不一致属预期。动作：人工 review 上游 diff，确认合法后跑 ` +
    `\`node scripts/sync-themes.mjs --update-baseline\` 更新基线，再跑 \`npm test\`。`
}

// 读检入基线：缺失/损坏/缺条目一律抛 no-baseline（不做“无历史即放行”，首次同步同样受约束）。
async function loadBaseline(manifestPath, read = readFile) {
  let raw
  try {
    raw = await read(manifestPath, 'utf8')
  } catch {
    throw syncError('no-baseline',
      `[sync] 无可信基线：${manifestPath} 缺失或不可读。首次同步同样受校验约束，不做“无历史即放行”。` +
      `动作：确认 OPCODE_SHA 无误后，用 \`node scripts/sync-themes.mjs --update-baseline\` 显式建立基线（随代码 review 入仓），再重跑校验。`)
  }
  let manifest
  try {
    manifest = JSON.parse(raw)
  } catch (e) {
    throw syncError('no-baseline', `[sync] 无可信基线：${manifestPath} 不是合法 JSON（${e.message}）。已拒绝写入，现有主题文件未动。`)
  }
  if (typeof manifest !== 'object' || manifest === null || typeof manifest.themes !== 'object' || manifest.themes === null) {
    throw syncError('no-baseline', `[sync] 无可信基线：${manifestPath} 缺 themes 指纹表。已拒绝写入，现有主题文件未动。`)
  }
  return manifest
}

// 核心同步：全部可注入（测试用 fixture 演练，不碰网络与真实目录）。
// - fetchText(name): 返回上游原始文本（默认走 ASSET_BASE + fetch）。
// - updateBaseline=false：对照基线预校验；任何不一致/结构失败都抛错且不写任何文件。
// - updateBaseline=true：显式升级路径；仍做结构校验（坏内容不进基线），通过后原子落盘 + 更新基线。
export async function syncThemes({
  themesDir = THEMES_DIR,
  manifestPath,
  noticesPath,
  themeNames = THEME_NAMES,
  scriptSha = OPCODE_SHA,
  tagAnnotation = OPCODE_TAG_ANNOTATION,
  updateBaseline = false,
  fetchText = defaultFetchText,
  read = readFile,
  write = writeFile,
  renameFile = rename,
  remove = rm,
  listDir = readdir,
  mkdirs = mkdir,
} = {}) {
  manifestPath = manifestPath || join(themesDir, 'MANIFEST.json')
  noticesPath = noticesPath || join(themesDir, 'THIRD_PARTY_NOTICES.md')
  const baseline = updateBaseline ? await loadBaselineLenient(manifestPath, read) : await loadBaseline(manifestPath, read)
  const baselineRev = (baseline && typeof baseline.rev === 'string') ? baseline.rev : null

  // 阶段一：全部下载到内存 + 结构校验（不碰磁盘现有文件）。
  const staged = []
  for (const name of themeNames) {
    let text
    try {
      text = await fetchText(name)
    } catch (e) {
      throw syncError('tamper-suspect', tamperMessage(name, '下载失败（' + (e && e.message ? e.message : e) + '）', scriptSha))
    }
    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      throw syncError('tamper-suspect', tamperMessage(name, 'JSON 解析失败（' + e.message + '）', scriptSha))
    }
    try {
      validateStructure(name, data)
    } catch (e) {
      throw syncError('tamper-suspect', tamperMessage(name, '结构校验失败（' + e.message + '）', scriptSha))
    }
    const pretty = prettyOf(data)
    staged.push({ name, pretty, sha256: sha256Hex(pretty), bytes: pretty.length })
  }

  if (updateBaseline) {
    // 显式升级：原子落盘 + 更新基线（保留 adapted20 等非同步段）。
    await mkdirs(themesDir, { recursive: true })
    await writeStaged(themesDir, staged, { write, renameFile, remove, read, onlyIfChanged: false })
    const next = {
      source: (baseline && baseline.source) || 'anomalyco/opencode',
      rev: scriptSha,
      tag: tagAnnotation + '（注释用，不参与拉取；拉取以 rev 为准）',
      syncedAt: new Date().toISOString(),
      themes: {},
    }
    for (const s of staged) next.themes[s.name] = { bytes: s.bytes, sha256: s.sha256 }
    if (baseline && typeof baseline.adapted20 !== 'undefined') next.adapted20 = baseline.adapted20
    // 保留基线里其他未知段（前向兼容），同步段以外的原样带走。
    if (baseline) {
      for (const k of Object.keys(baseline)) {
        if (!(k in next)) next[k] = baseline[k]
      }
      // adapted20 已显式保留；themes/source/rev/tag/syncedAt 以新值为准。
      next.source = next.source
    }
    const tmpManifest = join(themesDir, 'MANIFEST.json.tmp-' + process.pid)
    await write(tmpManifest, JSON.stringify(next, null, 2) + '\n')
    await renameFile(tmpManifest, manifestPath)
    // NOTICES 只更新首行（来源 pin），其余手工维护段（字体/2.0 主题说明）原样保留。
    await updateNoticesFirstLine(noticesPath, { read, write, renameFile, remove, themesDir })
    return { updated: true, count: staged.length, rev: scriptSha }
  }

  // 阶段二（校验模式）：对照基线预校验；缺条目 = 无可信对照，不放行。
  const mismatched = []
  for (const s of staged) {
    const entry = baseline.themes[s.name]
    if (!entry || typeof entry.sha256 !== 'string') {
      throw syncError('no-baseline',
        `[sync] 无可信基线：基线缺 ${s.name} 条目。首次同步同样受校验约束，不做“无历史即放行”。` +
        `动作：确认 OPCODE_SHA 无误后，用 \`node scripts/sync-themes.mjs --update-baseline\` 显式建立基线（随代码 review 入仓），再重跑校验。`)
    }
    if (entry.sha256 !== s.sha256) mismatched.push(s.name)
  }
  if (mismatched.length > 0) {
    if (baselineRev && baselineRev !== scriptSha) {
      throw syncError('baseline-expired', expiredMessage(scriptSha, baselineRev, mismatched.length) + `首个不一致：${mismatched[0]}（共 ${mismatched.length} 个）。`)
    }
    const legacyHint = baselineRev ? '' : '（基线为旧格式、无 rev 字段：先核对 OPCODE_SHA 是否对应基线 tag，确认是格式迁移而非投毒后，再用 --update-baseline 显式迁移。）'
    const first = mismatched[0]
    throw syncError('tamper-suspect',
      tamperMessage(first, `内容与检入基线不一致（基线 ${baseline.themes[first].sha256.slice(0, 12)}… vs 下载 ${staged.find((s) => s.name === first).sha256.slice(0, 12)}…；共 ${mismatched.length} 个：${mismatched.join('、')}）${legacyHint}`, scriptSha))
  }

  // 全部通过：原子落盘（内容与基线一致；仅当本地缺失/不一致时才写，保证中断后重跑可恢复且平时无抖动）。
  await mkdirs(themesDir, { recursive: true })
  await writeStaged(themesDir, staged, { write, renameFile, remove, read, onlyIfChanged: true })
  // 校验模式不碰 MANIFEST.json 与 NOTICES（基线只读，避免 syncedAt 抖动）。
  void listDir
  return { updated: false, count: staged.length, rev: baselineRev || scriptSha }
}

// --update-baseline 在基线缺失/损坏时仍要能显式建立：宽容读（坏了就从空起，但坏内容不影响下载校验）。
async function loadBaselineLenient(manifestPath, read) {
  try {
    const raw = await read(manifestPath, 'utf8')
    const m = JSON.parse(raw)
    if (typeof m === 'object' && m !== null) return m
    return null
  } catch {
    return null
  }
}

// 原子落盘：逐文件 tmp + rename（同目录 rename 原子），失败时清理 tmp 残留，不留半成品。
// onlyIfChanged=true 时内容一致则跳写（减少 mtime 抖动；本地缺失/被改则恢复）。
async function writeStaged(themesDir, staged, { write, renameFile, remove, read, onlyIfChanged }) {
  const tmps = []
  try {
    for (const s of staged) {
      const final = join(themesDir, s.name + '.json')
      if (onlyIfChanged) {
        try {
          const cur = await read(final, 'utf8')
          if (cur === s.pretty) continue
        } catch {
          // 本地缺失 → 需要写入（恢复）。
        }
      }
      const tmp = final + '.tmp-' + process.pid
      tmps.push(tmp)
      await write(tmp, s.pretty)
      await renameFile(tmp, final)
    }
  } catch (e) {
    for (const t of tmps) {
      try { await remove(t, { force: true }) } catch { /* 清理尽力而为 */ }
    }
    throw syncError('io-failed', `[sync] 落盘失败：${e && e.message ? e.message : e}。已清理临时文件，现有完好文件未被破坏，重跑可恢复。`)
  }
}

// NOTICES 首行是同步来源 pin（commit SHA），其余行是手工维护的归属说明。
// 更新时只换首行、保留尾部（含尾换行状态）；文件缺失时才写完整模板。经 tmp + rename 原子落盘。
async function updateNoticesFirstLine(noticesPath, { read, write, renameFile, remove, themesDir }) {
  const firstLine = noticesText().split('\n')[0]
  let out
  try {
    const cur = await read(noticesPath, 'utf8')
    const lines = cur.split('\n')
    lines[0] = firstLine
    out = lines.join('\n') // split/join 往返，尾换行状态原样保留
    if (out === cur) return // 首行已是最新，无抖动
  } catch {
    out = noticesText() // 文件缺失 → 写完整模板
  }
  const tmp = join(themesDir, 'THIRD_PARTY_NOTICES.md.tmp-' + process.pid)
  try {
    await write(tmp, out)
    await renameFile(tmp, noticesPath)
  } catch (e) {
    try { await remove(tmp, { force: true }) } catch { /* 清理尽力而为 */ }
    throw syncError('io-failed', `[sync] 落盘失败：${e && e.message ? e.message : e}。已清理临时文件，重跑可恢复。`)
  }
}

async function defaultFetchText(name) {
  const url = ASSET_BASE + name + '.json'
  const res = await fetch(url)
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url)
  return await res.text()
}

async function main() {
  const updateBaseline = process.argv.includes('--update-baseline')
  try {
    const r = await syncThemes({ updateBaseline })
    if (updateBaseline) {
      console.log('[sync] 完成（基线已更新）: ' + r.count + ' 个主题 → src/themes/ (' + OPCODE_SHA.slice(0, 12) + '… 对应 tag ' + OPCODE_TAG_ANNOTATION + ')')
      console.log('[sync] 下一步：git diff 检查基线变更 + npm test 全绿后再提交（基线随代码 review）。')
    } else {
      console.log('[sync] 完成（已校验）: ' + r.count + ' 个主题与检入基线一致 → src/themes/ (' + OPCODE_SHA.slice(0, 12) + '…)')
    }
  } catch (e) {
    console.error(e && e.message ? e.message : e)
    process.exit(1)
  }
}

const invokedAsScript = (() => {
  try {
    return process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url
  } catch {
    return false
  }
})()
if (invokedAsScript) await main()
