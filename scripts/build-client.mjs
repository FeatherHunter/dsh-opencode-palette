// build-client.mjs — 零依赖 mini-bundler：npm 包客户端入口内联 + src/engine + runtime → 浏览器 bundle 与宿主半
// 产出:
//   package/lib/client.js             包版（window.__ModuleLoader__.load CJS bundle）
//   client.js                         动态版（cordis_define code.client 函数体）
//   package/lib/index.js              宿主半（runtime/host.mjs 原样 + 版本已注入）
//   package/lib/event-list.json       事件清单（runtime/event-list.json 副本）
//   package/lib/channel.mjs           两侧共用常量（runtime/channel.mjs 副本）
//   package/package.json              产物包声明（版本取自根 package.json）
//   package/README.md                 用户文档副本
//
// 依赖形态（2026-09-30 起）：
//   dsh-plugin-update —— **运行时依赖**，随包发出、用户装包时从 npm 取（`^0.10.0`）。
//     0.1.x 曾把它的 dist 复制进本包（vendor）来绕开自锚定缺陷；0.2.0 起改为按包名解析，不再需要。
//     只有它的**入口件闭包**（entry→panel→config/redaction/service/changelog/queue/log-events/lang/bilingual）仍在构建期被内联进浏览器 bundle —— 浏览器里没有 node_modules。
//   dsh-log —— 同为运行时依赖；客户端入口同样构建期内联。
//
// 引擎源码约束（DESIGN.md §7）：单行 import、无 default export、无 re-export、无动态导入；
// npm 包走各自的转换器（polyglot 形态：多行 import / export 列表带 as 别名）。
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const ENGINE_DIR = join(ROOT, 'src', 'engine')
const THEMES_DIR = join(ROOT, 'src', 'themes')
const RUNTIME_DIR = join(ROOT, 'runtime')
const PKG_DIR = join(ROOT, 'package')

// 运行时模块（runtime/*.mjs：面板主体 client 与两侧共用常量 channel；自研更新状态机已删）
const RUNTIME_MODULE_FILES = { client: 'client.mjs', channel: 'channel.mjs' }

// 构建期**内联**进浏览器 bundle 的 npm 包客户端入口（浏览器没有 node_modules，只能打进产物）。
// 注意这与「宿主半的依赖」是两回事：宿主半那侧是真依赖，运行时从 node_modules 解析。
// deps 是该包内部相对说明符 → 本 bundle 模块键的映射
const INLINE_PACKAGES = [
  {
    spec: 'dsh-log/client',
    pkg: 'dsh-log',
    key: 'log-client',
    modules: [
      { key: 'log-config', file: 'dist/config.js', deps: {} },
      { key: 'log-client', file: 'dist/client.js', deps: { './config.js': 'log-config' } },
    ],
  },
  // 更新系统只内联入口件闭包（entry → panel → config/redaction/service/changelog/queue/log-events/bilingual/lang）：
  // 浏览器 bundle 只要 mountUpdateEntry 这一条调用点；commands/batch/client（电话名派生/轮询常量）
  // 是旧自研控制器的输入，已随其删除而不再内联。deps 必须与包 dist 的实际 import 逐字对应，
  // 上游再加文件时构建按“引用未声明即抛”报错，按报错补声明即可。
  // 0.5.5 起新增：panel → log-events（日志事件名单源），entry → bilingual（双语底座）。
  // 0.7.0 起新增：panel → bilingual + lang（面板单语渲染消费字典与语言信号，与入口件同口径）。
  {
    spec: 'dsh-plugin-update/entry',
    pkg: 'dsh-plugin-update',
    key: 'upd-entry',
    modules: [
      { key: 'upd-config', file: 'dist/config.js', deps: {} },
      { key: 'upd-redaction', file: 'dist/redaction.js', deps: {} },
      { key: 'upd-service', file: 'dist/service.js', deps: {} },
      { key: 'upd-changelog', file: 'dist/changelog.js', deps: { './service.js': 'upd-service', './bilingual.js': 'upd-bilingual', './lang.js': 'upd-lang' } },
      { key: 'upd-queue', file: 'dist/queue.js', deps: {} },
      { key: 'upd-log-events', file: 'dist/log-events.js', deps: {} },
      { key: 'upd-lang', file: 'dist/lang.js', deps: {} },
      { key: 'upd-bilingual', file: 'dist/bilingual.js', deps: { './lang.js': 'upd-lang' } },
      { key: 'upd-panel', file: 'dist/panel.js', deps: { './config.js': 'upd-config', './redaction.js': 'upd-redaction', './service.js': 'upd-service', './changelog.js': 'upd-changelog', './queue.js': 'upd-queue', './log-events.js': 'upd-log-events', './bilingual.js': 'upd-bilingual', './lang.js': 'upd-lang' } },
      { key: 'upd-entry', file: 'dist/entry.js', deps: { './config.js': 'upd-config', './panel.js': 'upd-panel', './bilingual.js': 'upd-bilingual', './lang.js': 'upd-lang' } },
    ],
  },
]

/** 按模块键找内联规格（键 → { pkg, 模块声明 }）。 */
function inlineModuleFor(key) {
  for (const vendor of INLINE_PACKAGES) {
    for (const spec of vendor.modules) {
      if (spec.key === key) return { pkg: vendor.pkg, spec: spec }
    }
  }
  return null
}

// 模块执行顺序 = 依赖顺序（模块顶层不得调用其他模块导出，见 DESIGN.md）
const MODULE_ORDER = [
  'upd-config', 'upd-redaction', 'upd-service', 'upd-lang', 'upd-bilingual', 'upd-changelog', 'upd-queue', 'upd-log-events', 'upd-panel', 'upd-entry',
  'log-config', 'log-client',
  'resolve', 'map-dsh', 'font-face', 'font-avail', 'font-names', 'local-fonts', 'generate', 'zh-names', 'registry', 'grouping', 'index', 'update-tokens', 'float-geometry',
  'channel', 'client',
]

const JSON_IMPORT_RE = /^import (\w+) from '([^']+\.json)' with \{ type: 'json' \}$/
const JS_IMPORT_RE = /^import \{ ([^}]+) \} from '\.\/([A-Za-z0-9_\/-]+)\.mjs'$/
const PKG_IMPORT_RE = /^import \{ ([^}]+) \} from '([a-z0-9-]+\/[a-z0-9-]+)'$/
const EXPORT_RE = /^export (function|const) (\w+)/
// npm 包 dist 的 ESM 形态：多行 import/export 列表，且带 as 别名
const PKG_ESM_IMPORT_RE = /^[ \t]*import\s*\{([\s\S]*?)\}\s*from\s*["']([^"']+)["'];?/gm
const PKG_ESM_EXPORT_RE = /^[ \t]*export\s*\{([\s\S]*?)\};?/gm

const q = (s) => JSON.stringify(s)

/** 解析 vendor 的名字表（支持 `a as b`）。统一成 { local, exported }：
 *  import 侧 `源名 as 绑定名`、export 侧 `本地名 as 导出名` 的写法同形。 */
function vendorNamePairs(body) {
  return body
    .split(',')
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((part) => {
      const hit = part.match(/^([A-Za-z0-9_$]+) as ([A-Za-z0-9_$]+)$/)
      return hit ? { local: hit[1], exported: hit[2] } : { local: part, exported: part }
    })
}

/** npm 包 vendor 模块 → 本 bundle 的 __mods 形态。 */
function transformPackageModule(text, spec) {
  let out = text
  out = out.replace(PKG_ESM_IMPORT_RE, function (all, names, from) {
    const depKey = spec.deps[from]
    if (!depKey) throw new Error('[build] vendor 模块引用了未声明的依赖：' + spec.file + ' -> ' + from)
    // 解构：源名作键、绑定名作值（`{ a: b }`）
    const binding = vendorNamePairs(names).map((p) => (p.local === p.exported ? p.local : p.local + ': ' + p.exported)).join(', ')
    return 'const { ' + binding + ' } = __mods[' + q(depKey) + '];'
  })
  out = out.replace(PKG_ESM_EXPORT_RE, function (all, names) {
    // 对象字面量：导出名作键、本地名作值（`{ 导出名: 本地名 }`）
    const binding = vendorNamePairs(names).map((p) => (p.local === p.exported ? p.local : p.exported + ': ' + p.local)).join(', ')
    return '__mods[' + q(spec.key) + '] = { ' + binding + ' };'
  })
  return '(function () {\n' + out + '\n})();'
}

/** 定位已安装的 npm 包目录。故意不走 require.resolve：dsh-log 的 exports 没有 "." 入口、
 *  dsh-plugin-update 没暴露 "./dist/*"，走 exports 解析到不了要的 dist 文件；构建期只要目录。 */
function installedPackageDir(name) {
  const dir = join(ROOT, 'node_modules', name)
  const manifestPath = join(dir, 'package.json')
  if (!existsSync(manifestPath)) throw new Error('[build] 未安装依赖：' + name + '（先在仓库根 npm install）')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (manifest.name !== name) throw new Error('[build] node_modules 下的包名对不上：' + dir)
  return dir
}

async function bundleModules() {
  const parts = []
  for (const key of MODULE_ORDER) {
    parts.push(await loadModule(key))
  }
  return parts.join('\n')
}

/** 读源码并统一换行：仓库 .gitattributes 是 `* text=auto`，Windows 上的新克隆检出为 CRLF，
 *  而下面的单行正则按 LF 写死（`$` 匹配不到行尾的 \r）。统一在读取处归一，产物与平台无关。 */
async function readSource(file) {
  return (await readFile(file, 'utf8')).replace(/\r\n/g, '\n')
}

async function loadModule(key) {
  const inline = inlineModuleFor(key)
  if (inline) {
    const text = await readSource(join(installedPackageDir(inline.pkg), inline.spec.file))
    return transformPackageModule(text, inline.spec)
  }
  const runtimeFile = RUNTIME_MODULE_FILES[key]
  const file = runtimeFile ? join(RUNTIME_DIR, runtimeFile) : join(ENGINE_DIR, key + '.mjs')
  const text = await readSource(file)
  const lines = text.split('\n')
  const body = []
  const exported = []
  for (const line of lines) {
    let m = line.match(JSON_IMPORT_RE)
    if (m) {
      // JSON 数据内联（主题数据进 bundle，不落额外文件）
      const jsonText = await readFile(join(THEMES_DIR, m[2].split('/').pop()), 'utf8')
      body.push('const ' + m[1] + ' = ' + jsonText.trim())
      continue
    }
    m = line.match(JS_IMPORT_RE)
    if (m) {
      body.push('const { ' + m[1].replace(/\s+/g, ' ') + ' } = __mods[' + q(m[2].split('/').pop()) + ']')
      continue
    }
    m = line.match(PKG_IMPORT_RE)
    if (m) {
      const inline = INLINE_PACKAGES.filter((v) => v.spec === m[2])[0]
      if (!inline) throw new Error('[build] 未登记的包引用：' + m[2] + '（模块 ' + key + '）')
      body.push('const { ' + m[1].replace(/\s+/g, ' ') + ' } = __mods[' + q(inline.key) + ']')
      continue
    }
    m = line.match(EXPORT_RE)
    if (m) {
      exported.push(m[2])
      body.push(line.replace(/^export /, ''))
      continue
    }
    // export { a, b } 重导出：名称并入本模块导出，行本身不输出
    m = line.match(/^export \{ ([^}]+) \}$/)
    if (m) {
      for (const nm of m[1].split(',').map((s) => s.trim()).filter(Boolean)) exported.push(nm)
      continue
    }
    body.push(line)
  }
  if (exported.length > 0) {
    body.push('__mods[' + q(key) + '] = { ' + exported.join(', ') + ' }')
  }
  return '(function () {\n' + body.join('\n') + '\n})();'
}

async function packageVersion() {
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'))
  return pkg.version
}

async function main() {
  const version = await packageVersion()
  // 面板版本号：源码占位统一替换为当前版本（包版/动态版一致）
  const modules = (await bundleModules()).split('__PALETTE_VERSION__').join(version)
  const ID = 'dsh-opencode-palette'
  const qClient = q('client')
  const qSettings = q('settings.plugins.tab')
  const qTool = q('tool.view.cordis')
  // inject 增 connection：宿主半的电话要从浏览器半经 connection.rpc 调过去
  const clientInject = ['theme', 'slots', 'locale', 'connection']

  // ── 1) 包版 bundle ──
  const pkgBundle = [
    '/**',
    ' * dsh-opencode-palette v' + version + ' — 浏览器半（构建产物，勿手改）',
    ' * 数据驱动管线：opencode v1.18.12 官方主题 JSON → 颜色解析 → DSH 适配注入',
    ' * 面板「检查更新」：dsh-plugin-update 客户端入口经构建期内联（宿主半走真依赖）',
    ' * 源：src/engine/* + runtime/*.mjs + npm 包 dsh-log / dsh-plugin-update 的客户端入口',
    ' */',
    'window.__ModuleLoader__.load({',
    '  id: ' + q(ID) + ',',
    '  factory: function (require) {',
    '    var module = { exports: {} }',
    '    var exports = module.exports',
    '    Object.defineProperty(exports, Symbol.toStringTag, { value: ' + q('Module') + ' })',
    // ASI 陷阱修复（2026-08-15）：var __mods = {} 必须带分号，
    // 否则下一行模块 IIFE "(function () {" 会被解析成对 {} 的函数调用 →
    // TypeError: {} is not a function（dsh-opencode-palette v1.2.0 加载失败的根因）
    '    var __mods = {};',
    modules,
    '    exports.inject = ' + q(clientInject),
    '    exports.apply = __mods[' + qClient + '].createClient(' + qSettings + ')',
    '    return module.exports',
    '  },',
    '})',
  ].join('\n') + '\n'

  // ── 2) 动态版（cordis_define code.client 函数体）──
  const dynBundle = [
    '// dsh-opencode-palette v' + version + ' — 动态版（构建产物，勿手改）',
    '// 用法：cordis_define(code.client = 本文件内容) → cordis_run',
    // ASI 陷阱修复（2026-08-15）：var __mods = {} 必须带分号（同包版）
    'var __mods = {};',
    modules,
    'return { apply: __mods[' + qClient + '].createClient(' + qTool + ') }',
  ].join('\n') + '\n'

  // ── 3) 宿主半（runtime/host.mjs 原样复制；版本已在源码里读自己的 package.json，无需注入）──
  // 换行同样归一：产物字节与平台无关
  const host = (await readFile(join(RUNTIME_DIR, 'host.mjs'), 'utf8')).replace(/\r\n/g, '\n')

  // ── 4) 产物包元数据 ──
  const pkgJson = {
    name: ID,
    version: version,
    description: '让 DeepSeek Harness 穿上 38 款经典皮肤——东京的霓虹夜色、德古拉的暗红月光、复古工坊的暖黄灯火、黑客帝国的数字雨、玫瑰松林间的风……一键换肤，即点即换，重启不丢。38 legendary skins for DeepSeek Harness — tokyonight\'s neon dusk, dracula\'s crimson moon, gruvbox\'s retro glow, the matrix\'s digital rain, rose-pine\'s rosewood calm… one click, instant, persisted.',
    type: 'module',
    main: 'lib/index.js',
    exports: {
      '.': './lib/index.js',
      './client': './lib/client.js',
      './cordis.patch.yml': './cordis.patch.yml',
      './package.json': './package.json',
    },
    files: ['lib', 'cordis.patch.yml'],
    keywords: ['dsh', 'deepseek-harness', 'plugin', 'theme', 'opencode', 'tui', 'dark', 'multi-theme'],
    // 站端 npm 自动关联要求：repository 指回 GitHub 仓库（缺了市场就认不出这是 npm 包）
    repository: { type: 'git', url: 'git+https://github.com/FeatherHunter/dsh-opencode-palette.git' },
    homepage: 'https://github.com/FeatherHunter/dsh-opencode-palette',
    bugs: { url: 'https://github.com/FeatherHunter/dsh-opencode-palette/issues' },
    // 宿主半运行时依赖：日志（dsh-log）与更新系统（dsh-plugin-update），用户装本插件时由 npm 按范围取。
    // 更新系统用 `^0.10.0`：0.10.x 的补丁用户自动跟上；上游发 0.11.0/1.x 就必须我们改范围重发（check-deps 负责提醒）。
    // 0.6.0 breaking：--dsh-upd-* 更名为 --dsh-update-*，d5-paper 主题删除；0.7.0 新增 themeTokens（弹窗换肤一等口径）。
    // 只有浏览器 bundle 的客户端入口是构建期从 node_modules 内联的（浏览器没有 node_modules）——
    // 新鲜度由构建前的 `node scripts/check-deps.mjs` 硬门禁保证（本机落后就拦，离线则放行）。
    dependencies: { 'dsh-log': '0.2.2', 'dsh-plugin-update': '^0.10.0' },
    // 宿主要求：市场的兼容徽章读 manifest 的 engines.dsh（缺了就显示「未声明宿主要求」）。
    // 下界 = DSH 0.2.0-rc.1（0.2 线现行版）；npm 不解析 engines.dsh，所以没有 peerDependencies 那类 ERESOLVE 风险；
    // 市场侧用 includePrerelease 判定，故 0.2.x 的预发布版（含 0.2.0-rc.1）都在范围内。
    // node >=22：更新包 0.7.x 的 engines 要求（它按包名解析目标包，用到较新的 node:module 行为）
    engines: { node: '>=22', dsh: '>=0.2.0-rc.1' },
    dsh: {
      bundle: { patch: './cordis.patch.yml' },
      client: {
        platform: 'web',
        immediately: true,
        inject: ['@deepseek-ai/dsh-client-ui-theme'],
      },
    },
    license: 'MIT',
  }

  // ── 写产物（先清理旧残留）──
  await rm(join(PKG_DIR, 'node_modules'), { recursive: true, force: true })
  await rm(join(PKG_DIR, 'package-lock.json'), { force: true })
  await mkdir(join(PKG_DIR, 'lib'), { recursive: true })
  await copyFile(join(ROOT, 'cordis.patch.yml'), join(PKG_DIR, 'cordis.patch.yml'))
  await writeFile(join(PKG_DIR, 'lib', 'client.js'), pkgBundle)
  await writeFile(join(PKG_DIR, 'lib', 'index.js'), host)
  await copyFile(join(RUNTIME_DIR, 'event-list.json'), join(PKG_DIR, 'lib', 'event-list.json'))
  // 宿主半与浏览器半共用的接线常量：宿主半按相对路径 import 它，随包一起发
  await copyFile(join(RUNTIME_DIR, 'channel.mjs'), join(PKG_DIR, 'lib', 'channel.mjs'))
  await writeFile(join(PKG_DIR, 'package.json'), JSON.stringify(pkgJson, null, 2) + '\n')
  // npm 包 README 用英文版（GitHub 首页 README.md 为中文版）；showcase 真实截图块不进包
  //（npm 保持 SVG 轻量，且 showcase 不在 package.json files 白名单，带图会渲染破裂）
  const readmeFull = await readFile(join(ROOT, 'docs', 'README.en.md'), 'utf8').catch(() => '(README 缺失)')
  const readme = readmeFull.replace(/<!-- showcase:start -->[\s\S]*?<!-- showcase:end -->\r?\n?/, '')
  await writeFile(join(PKG_DIR, 'README.md'), readme)
  await writeFile(join(ROOT, 'client.js'), dynBundle)

  console.log('[build] 完成 v' + version + ':')
  console.log('  package/lib/client.js ' + Buffer.byteLength(pkgBundle) + ' B')
  console.log('  client.js (动态版)     ' + Buffer.byteLength(dynBundle) + ' B')
  console.log('  package/lib/index.js   ' + Buffer.byteLength(host) + ' B')
}

main().catch(function (e) { console.error(e); process.exit(1) })
