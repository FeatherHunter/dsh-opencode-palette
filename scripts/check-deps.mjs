// check-deps.mjs — 随包依赖的新鲜度检查（只读、联网）
//
// 为什么需要它：更新系统（dsh-plugin-update）与日志（dsh-log）都以**运行时依赖**形态随包发出，
// 用户装我们插件时由 npm 按声明的范围取最新匹配版本。所以「用户拿到的是不是最新的更新系统」
// 取决于三件事：
//   ① 范围要够宽（`^0.2.0` 让 0.2.x 的补丁自动跟上；上游发 0.3.0 就必须我们改范围）
//   ② 本机装的要是最新 —— 浏览器 bundle 的客户端入口是从 node_modules 内联的，
//      本机旧、上游新时，打出的包是旧面板、用户装的是新宿主，两侧版本错位
//   ③ 我们得知道上游发了什么 —— 没有任何东西会自动提醒，这条命令就是那个提醒
//
// 用法：
//   node scripts/check-deps.mjs              # 硬门禁：有需要动作的项 exit 1（构建与发布流程用）
//   node scripts/check-deps.mjs --warn-only  # 只警告不失败（离线/镜像延迟不该挡住构建时用）
// 离线容忍：取不到 registry 时只给 `?` 不记 behind，exit 0 —— 没信号不拦路，有信号才拦。
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const REGISTRY = 'https://registry.npmjs.org/'
const WARN_ONLY = process.argv.includes('--warn-only')

function readJson(rel) {
  try { return JSON.parse(readFileSync(join(ROOT, rel), 'utf8')) } catch (e) { return null }
}

/** 取 x.y.z 三元组；带预发布后缀的一律当「不满足」处理（我们只声明稳定版范围）。 */
function triple(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v || '').trim())
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}
function cmp(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] < b[i]) return -1
    if (a[i] > b[i]) return 1
  }
  return 0
}
/** 声明的范围是否覆盖 latest：支持 ^x.y.z / ~x.y.z / 精确 x.y.z。 */
function covers(spec, latest) {
  const want = triple(latest)
  if (!want) return { ok: false, why: '上游 latest 不是稳定三段版本号' }
  const body = String(spec || '').trim()
  const m = /^([\^~]?)(\d+\.\d+\.\d+)$/.exec(body)
  if (!m) return { ok: false, why: '本地声明不是 ^x.y.z / ~x.y.z / x.y.z 形式' }
  const base = triple(m[2])
  const c = cmp(want, base)
  if (c < 0) return { ok: false, why: '上游 latest 比我们声明的还旧（镜像回退？）' }
  if (m[1] === '') return { ok: c === 0, why: c === 0 ? '' : '精确钉版：上游有新版，需要手动升' }
  if (m[1] === '~') return { ok: want[0] === base[0] && want[1] === base[1], why: '上游进了新的次版本，超出 ~ 范围' }
  // ^x.y.z：0.x 时锁次版本（0.2.0 → <0.3.0），≥1 时锁主版本
  const sameMajor = want[0] === base[0]
  const inRange = base[0] === 0 ? (sameMajor && want[1] === base[1]) : sameMajor
  return { ok: inRange, why: inRange ? '' : '上游进了新的次版本/主版本，超出 ^ 范围' }
}

async function latestOf(name) {
  try {
    const res = await fetch(REGISTRY + encodeURIComponent(name) + '/latest', { headers: { accept: 'application/json' } })
    if (!res.ok) return { version: null, why: 'registry 返回 HTTP ' + res.status }
    const value = await res.json()
    return { version: typeof value.version === 'string' ? value.version : null, why: 'latest 里没有版本号' }
  } catch (e) {
    return { version: null, why: '取不到 registry（离线？）：' + String((e && e.message) || e).slice(0, 60) }
  }
}

const root = readJson('package.json') || {}
const published = readJson('package/package.json') || {}
const deps = root.dependencies || {}
const devDeps = root.devDependencies || {}
const pubDeps = published.dependencies || {}

// 两类的判定方式不同，别混：
//   dsh-plugin-update：随包发出去的**运行时依赖**，范围决定用户拿到哪一版 → 必须宽到能自动跟上补丁
//   dsh-log：同为运行时依赖（构建期还要内联它的客户端入口）
const rows = [
  { name: 'dsh-plugin-update', spec: deps['dsh-plugin-update'] || devDeps['dsh-plugin-update'], published: pubDeps['dsh-plugin-update'] },
  { name: 'dsh-log', spec: devDeps['dsh-log'] || deps['dsh-log'], published: pubDeps['dsh-log'] },
]

function installedVersion(name) {
  const manifest = readJson('node_modules/' + name + '/package.json')
  return manifest && typeof manifest.version === 'string' ? manifest.version : null
}

console.log('')
console.log('  包名'.padEnd(24) + '本地声明'.padEnd(14) + '已安装'.padEnd(12) + '产物声明'.padEnd(14) + '上游 latest'.padEnd(14) + '结论')
console.log('  ' + '-'.repeat(92))
let behind = 0
for (const row of rows) {
  const latest = await latestOf(row.name)
  const installed = installedVersion(row.name)
  let verdict
  if (!row.spec) { verdict = '✗ 本地没声明'; behind += 1 } else if (latest.version === null) {
    // 离线/registry 不可达：没信号不拦路。但本机根本没装是本地事实，与网络无关，仍要拦。
    if (!installed) { verdict = '✗ 本机没装（' + latest.why + '）；先 npm install'; behind += 1 }
    else verdict = '? ' + latest.why + '（已安装 ' + installed + '，照旧构建）'
  } else {
    const check = covers(row.spec, latest.version)
    if (!check.ok) { verdict = '↑ ' + check.why + '（latest ' + latest.version + '）'; behind += 1 }
    else if (!installed) { verdict = '✗ 本机没装 ' + latest.version + '；先 npm install'; behind += 1 }
    else {
      const want = triple(latest.version)
      const have = triple(installed)
      if (!have) { verdict = '✗ 已安装版本不是稳定三段号（' + installed + '）；重装一次'; behind += 1 }
      else {
        const c = cmp(have, want)
        if (c === 0) verdict = '✓ 已是最新 ' + latest.version + '（声明范围内，用户自动拿到）'
        else if (c > 0) verdict = '? 已安装 ' + installed + ' 比上游 latest ' + latest.version + ' 还新（镜像回退？照旧构建）'
        else { verdict = '↑ 已安装 ' + installed + ' 落后于 latest ' + latest.version + '（范围内可跟上）；跑 npm run deps:sync 后重建'; behind += 1 }
      }
    }
    // 产物声明是构建写出来的快照：与本地声明不一致说明改了声明没重建 —— 同样记一笔，但不重复计数。
    if (check.ok && row.published && row.spec && row.published !== row.spec) {
      verdict += '；另：产物声明（' + row.published + '）与本地（' + row.spec + '）不一致，重跑 npm run build'
      behind += 1
    }
  }
  console.log('  ' + row.name.padEnd(22) + String(row.spec || '-').padEnd(14) + String(installed || '-').padEnd(12) + String(row.published || '-').padEnd(14) + String(latest.version || '?').padEnd(14) + verdict)
}
console.log('')

if (behind === 0) {
  console.log('  结论：随包依赖的声明范围都覆盖上游最新版，且本机已装最新 —— 打出的包与用户拿到的都是它。')
  process.exit(0)
}

console.log('  结论：有 ' + behind + ' 项需要动作 —— 否则打出的包或用户拿到的不是最新。')
console.log('    范围内落后：npm run deps:sync && npm run build && npm test')
console.log('    超出范围：改根 package.json 与 scripts/build-client.mjs 里产物 dependencies 的声明，')
console.log('      再 npm install && npm run build && npm test')
console.log('    最后 bump 本插件版本并发布（用户侧靠新版本拿到新范围）')
process.exit(WARN_ONLY ? 0 : 1)
