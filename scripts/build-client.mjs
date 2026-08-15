// build-client.mjs — 零依赖 mini-bundler：src/engine + runtime → 浏览器 bundle
// 产出:
//   package/lib/client.js   包版（window.__ModuleLoader__.load CJS bundle）
//   client.js               动态版（cordis_define code.client 函数体）
//   package/lib/index.js    宿主半（no-op 元数据）
//   package/package.json    产物包声明（版本取自根 package.json）
//   package/README.md       用户文档副本
//
// 引擎源码约束（DESIGN.md §7）：单行 import、无 default export、无 re-export、无动态导入
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const ENGINE_DIR = join(ROOT, 'src', 'engine')
const THEMES_DIR = join(ROOT, 'src', 'themes')
const RUNTIME_FILE = join(ROOT, 'runtime', 'client.mjs')
const PKG_DIR = join(ROOT, 'package')

// 模块执行顺序 = 依赖顺序（模块顶层不得调用其他模块导出，见 DESIGN.md）
const MODULE_ORDER = ['resolve', 'map-dsh', 'generate', 'registry', 'grouping', 'index', 'client']

const JSON_IMPORT_RE = /^import (\w+) from '([^']+\.json)' with \{ type: 'json' \}$/
const JS_IMPORT_RE = /^import \{ ([^}]+) \} from '\.\/([A-Za-z0-9_\/-]+)\.mjs'$/
const EXPORT_RE = /^export (function|const) (\w+)/

const q = (s) => JSON.stringify(s)

async function loadModule(key) {
  const file = key === 'client' ? RUNTIME_FILE : join(ENGINE_DIR, key + '.mjs')
  const text = await readFile(file, 'utf8')
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

async function bundleModules() {
  const parts = []
  for (const key of MODULE_ORDER) {
    parts.push(await loadModule(key))
  }
  return parts.join('\n')
}

async function packageVersion() {
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'))
  return pkg.version
}

async function main() {
  const version = await packageVersion()
  const modules = await bundleModules()
  const ID = 'dsh-opencode-palette'
  const qClient = q('client')
  const qSettings = q('settings.plugins.tab')
  const qTool = q('tool.view.cordis')

  // ── 1) 包版 bundle ──
  const pkgBundle = [
    '/**',
    ' * dsh-opencode-palette v' + version + ' — 浏览器半（构建产物，勿手改）',
    ' * 数据驱动管线：opencode v1.18.12 官方主题 JSON → 颜色解析 → DSH 适配注入',
    ' * 源：src/engine/* + runtime/client.mjs（npm run build 重新生成）',
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
    '    exports.inject = ' + q(['theme', 'slots']),
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

  // ── 3) 宿主半（no-op：主题全部在浏览器侧）──
  const host = [
    '/**',
    ' * dsh-opencode-palette v' + version + ' — 宿主半（no-op）',
    ' *',
    ' * 主题的全部工作在浏览器端（./client.js）完成：',
    ' *   - 34 个 opencode 主题（33 内置 JSON + system）经数据驱动管线解析',
    ' *   - theme.overrideTokens 覆盖注册 token + <style> 层 CSS 变量/元素规则',
    ' * 宿主半只保证 loader 条目可解析、可挂载。',
    ' */',
    'export const name = ' + q(ID),
    '',
    'export function apply() {',
    '  // no-op：客户端半负责一切',
    '}',
    '',
  ].join('\n')

  // ── 4) 产物包元数据 ──
  const pkgJson = {
    name: ID,
    version: version,
    description: 'DSH Web 多主题引擎：完整支持 opencode TUI 全部 34 个主题（33 内置 + system）。数据驱动管线：主题 JSON → 颜色解析 → DSH 适配注入；设置面板即时切换、持久化。',
    type: 'module',
    main: 'lib/index.js',
    exports: {
      '.': './lib/index.js',
      './client': './lib/client.js',
      './package.json': './package.json',
    },
    files: ['lib'],
    keywords: ['dsh', 'deepseek-harness', 'plugin', 'theme', 'opencode', 'tui', 'dark', 'multi-theme'],
    dsh: {
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
  await writeFile(join(PKG_DIR, 'lib', 'client.js'), pkgBundle)
  await writeFile(join(PKG_DIR, 'lib', 'index.js'), host)
  await writeFile(join(PKG_DIR, 'package.json'), JSON.stringify(pkgJson, null, 2) + '\n')
  // npm 包 README 用英文版（GitHub 首页 README.md 为中文版）
  const readme = await readFile(join(ROOT, 'docs', 'README.en.md'), 'utf8').catch(() => '(README 缺失)')
  await writeFile(join(PKG_DIR, 'README.md'), readme)
  await writeFile(join(ROOT, 'client.js'), dynBundle)

  console.log('[build] 完成 v' + version + ':')
  console.log('  package/lib/client.js ' + Buffer.byteLength(pkgBundle) + ' B')
  console.log('  client.js (动态版)     ' + Buffer.byteLength(dynBundle) + ' B')
  console.log('  package/lib/index.js   ' + Buffer.byteLength(host) + ' B')
}

main().catch(function (e) { console.error(e); process.exit(1) })
