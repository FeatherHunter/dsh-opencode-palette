// 数据层同步脚本：从 opencode 官方 tag 拉取全部主题 JSON → src/themes/
// 用法: node scripts/sync-themes.mjs   （版本锁见 OPCODE_TAG）
// 职责: 下载 + 结构校验 + 必填色位校验 + SHA256 指纹清单 + 第三方归属说明
import { createHash } from 'node:crypto'
import { mkdir, writeFile, readdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const THEMES_DIR = join(ROOT, 'src', 'themes')

// ⚠️ 版本锁：与用户本机 opencode-ai@1.18.12 一致。升级 = 改这里 + 重跑 + 检查测试。
const OPCODE_TAG = 'v1.18.12'
const ASSET_BASE = `https://raw.githubusercontent.com/anomalyco/opencode/${OPCODE_TAG}/packages/tui/src/theme/assets/`

// 33 个内置主题（opencode packages/tui/src/theme/assets/ 目录的完整清单）
const THEME_NAMES = ["aura","ayu","carbonfox","catppuccin-frappe","catppuccin-macchiato","catppuccin","cobalt2","cursor","dracula","everforest","flexoki","github","gruvbox","kanagawa","lucent-orng","material","matrix","mercury","monokai","nightowl","nord","one-dark","opencode","orng","osaka-jade","palenight","rosepine","solarized","synthwave84","tokyonight","vercel","vesper","zenburn"]

// 每个主题必须提供的语义色位（缺失 = 上游结构变化，同步直接报错）
const REQUIRED_KEYS = ["background","text","textMuted","primary","accent","error","warning","success","info","border","borderActive","syntaxComment","syntaxKeyword","syntaxFunction","syntaxVariable","syntaxString","syntaxNumber","syntaxType","syntaxOperator"]

// 第三方主题归属（同步时写入 NOTICES，随包分发）
const NOTICES = [
  "opencode 主题资产源自 opencode (MIT) 仓库 packages/tui/src/theme/assets/，tag v1.18.12。",
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
]

function fail(msg) { console.error('[sync] 失败: ' + msg); process.exit(1) }

// 结构校验：defs 与 theme 均为对象；theme 含全部必填色位
function validate(name, data) {
  if (typeof data !== 'object' || data === null) fail(name + ': 非对象')
  if (typeof data.defs !== 'object' || data.defs === null) fail(name + ': 缺 defs')
  if (typeof data.theme !== 'object' || data.theme === null) fail(name + ': 缺 theme')
  for (const key of REQUIRED_KEYS) {
    if (!(key in data.theme)) fail(name + ': 缺必填色位 ' + key)
  }
  return true
}

async function fetchTheme(name) {
  const url = ASSET_BASE + name + '.json'
  const res = await fetch(url)
  if (!res.ok) fail(name + ': HTTP ' + res.status + ' ' + url)
  return await res.text()
}

async function main() {
  await mkdir(THEMES_DIR, { recursive: true })
  // 清空旧数据（防残留）
  for (const f of await readdir(THEMES_DIR)) {
    if (f.endsWith('.json')) await rm(join(THEMES_DIR, f), { force: true })
  }
  const manifest = { source: 'anomalyco/opencode', tag: OPCODE_TAG, syncedAt: new Date().toISOString(), themes: {} }
  for (const name of THEME_NAMES) {
    const text = await fetchTheme(name)
    let data
    try { data = JSON.parse(text) } catch (e) { fail(name + ': JSON 解析失败 ' + e.message) }
    validate(name, data)
    const pretty = JSON.stringify(data, null, 2) + '\n'
    await writeFile(join(THEMES_DIR, name + '.json'), pretty)
    manifest.themes[name] = {
      bytes: pretty.length,
      sha256: createHash('sha256').update(pretty).digest('hex'),
    }
    console.log('  ✓ ' + name)
  }
  await writeFile(join(THEMES_DIR, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n')
  await writeFile(join(THEMES_DIR, 'THIRD_PARTY_NOTICES.md'), NOTICES.join('\n'))
  console.log('[sync] 完成: ' + THEME_NAMES.length + ' 个主题 → src/themes/ (' + OPCODE_TAG + ')')
}

main().catch((e) => { console.error(e); process.exit(1) })