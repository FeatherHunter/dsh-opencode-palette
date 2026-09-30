// check-vendor-updates.mjs — 随包依赖有没有上游新版（只读、联网；不参与 npm test）
//
// 为什么需要它：dsh-plugin-update 的 dist 是**构建期复制进本包**的（见 docs/adr/0001），
// 上游发新版我们不会自动拿到 —— 不主动查就永远停在旧版，而且没有任何东西会提醒你。
// 本脚本只报告事实与下一步，不改任何文件。
//
// 用法: npm run vendor:check   （或 node scripts/check-vendor-updates.mjs）
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const REGISTRY = 'https://registry.npmjs.org/'

function readJson(rel) {
  try { return JSON.parse(readFileSync(join(ROOT, rel), 'utf8')) } catch (e) { return null }
}

/** 从 vendor 副本的来源标记行读出「实际 vendor 进去的是哪一版」。 */
function vendoredVersion(dir) {
  let names = []
  try { names = readdirSync(join(ROOT, dir)) } catch (e) { return null }
  for (const name of names) {
    if (!name.endsWith('.js')) continue
    const hit = readFileSync(join(ROOT, dir, name), 'utf8').match(/^\/\/ vendor-source: (\S+)@(\S+) dist\//m)
    if (hit) return { pkg: hit[1], version: hit[2] }
  }
  return null
}

async function latestOf(name) {
  try {
    const res = await fetch(REGISTRY + encodeURIComponent(name) + '/latest', { headers: { accept: 'application/json' } })
    if (!res.ok) return null
    const value = await res.json()
    return typeof value.version === 'string' ? value.version : null
  } catch (e) {
    return null
  }
}

const root = readJson('package.json') || {}
const devDeps = root.devDependencies || {}
const published = readJson('package/package.json') || {}
const vendored = vendoredVersion('runtime/vendor/dsh-plugin-update')

// 两个随包依赖的形态不同，别混为一谈：
//   ① dsh-plugin-update：dist 复制进本包（两处），客户端入口内联进 bundle —— 上游更新必须我们重建重发
//   ② dsh-log：宿主半的**运行时依赖**（用户装包时从 npm 取），客户端入口同样内联进 bundle
const rows = [
  {
    name: 'dsh-plugin-update',
    pin: devDeps['dsh-plugin-update'] || '(未声明)',
    inside: vendored && vendored.pkg === 'dsh-plugin-update' ? vendored.version : '(读不到来源标记)',
    note: 'dist 随包 vendor（ADR 0001）+ 客户端入口内联',
  },
  {
    name: 'dsh-log',
    pin: devDeps['dsh-log'] || '(未声明)',
    inside: (published.dependencies && published.dependencies['dsh-log']) || '(未声明)',
    note: '宿主半运行时依赖（不 vendor）+ 客户端入口内联',
  },
]

console.log('')
console.log('  包名'.padEnd(24) + '我们 pin'.padEnd(14) + '包内实际'.padEnd(14) + '上游 latest'.padEnd(14) + '结论')
console.log('  ' + '-'.repeat(76))
let behind = 0
for (const row of rows) {
  const latest = await latestOf(row.name)
  let verdict
  if (latest === null) verdict = '? 取不到 registry（离线？）'
  else if (latest === row.pin) verdict = '✓ 最新'
  else { verdict = '↑ 落后于上游 ' + latest; behind += 1 }
  console.log('  ' + row.name.padEnd(22) + String(row.pin).padEnd(14) + String(row.inside).padEnd(14) + String(latest === null ? '?' : latest).padEnd(14) + verdict)
  console.log('  ' + ' '.repeat(22) + '用途：' + row.note)
}
console.log('')

if (behind === 0) {
  console.log('  结论：随包依赖都在最新版，无需动作。')
  process.exit(0)
}

console.log('  结论：有 ' + behind + ' 个包落后。升级步骤见 docs/adr/0001-vendor-dsh-plugin-update.md「如何升级」：')
console.log('    1) 改 package.json 里对应的 devDependencies 版本号（dsh-log 还有两处写死，见 ADR）')
console.log('    2) npm install')
console.log('    3) npm run build     # 重新复制 dist（写新的来源标记）+ 重新内联客户端入口')
console.log('    4) npm test          # 门禁：副本与 npm 包逐字节一致、事件清单齐全')
console.log('    5) 对照上游新增的日志事件与 blocked 原因码，补 runtime/event-list.json 与 runtime/update-panel.mjs')
console.log('    6) bump 本插件版本，走发布流程')
process.exit(1)
