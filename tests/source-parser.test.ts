// tests/source-parser.test.ts — P0 构建链硬化：逐行解析器（scripts/lib/source-parser.ts）
//
// 守三件事：
//   1) 迁移前 .mjs 样本行经 parseLine 与改造前内联正则**逐字段一致**（旧风格冻结 fixture，见 LEGACY）；
//      真实源码已全 .ts，其 emit 形态由下一条「投影后 UNHANDLED=0 + 五类语句都出现」+ build/verify:artifacts
//      + panel-render 产物用例共同兜底。
//   2) 同时认识 tsc 默认 emit 风格（双引号、行尾分号、`.js` 后缀）、`import type`（C-lite 前置），
//      以及 `../` 真实相对说明符（P3 起 runtime 以 `../src/engine/x.ts` 引引擎，emit 后成 `.js`）。
//   3) engine 与 runtime 的 .ts 源码按 emit 规则投影后，没有未识别的顶格 import/export。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseLine } from '../scripts/lib/source-parser.ts'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

// bundler 处理的全部源码：src/engine/*.ts（MODULE_ORDER 里的 14 个）+ runtime 的 6 个模块（P3 起也是 .ts）。
// runtime/host.ts 不参与逐行解析（走 S2 转译输出到 package/lib/index.js），故意不列。
const ENGINE_MODULES = ['resolve', 'map-dsh', 'font-face', 'font-avail', 'font-names', 'local-fonts', 'generate', 'zh-names', 'registry', 'ip-presets', 'grouping', 'index', 'update-tokens', 'float-geometry']
const RUNTIME_MODULES = ['client.ts', 'channel.ts', 'custom-color.ts', 'custom-store.ts', 'custom-editor.ts', 'ui-fx.ts']
const SOURCE_FILES = ENGINE_MODULES.map((name) => join(ROOT, 'src', 'engine', name + '.ts')).concat(RUNTIME_MODULES.map((name) => join(ROOT, 'runtime', name)))

function readNormalized(file: string): string {
  return readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
}

// 引擎源码已迁成 .ts：tsc（rewriteRelativeImportExtensions）会把相对说明符的 '.ts' 改写成 '.js'，
// bundler 实际吃到的是 emit 形态。UNHANDLED 检查按同一条规则投影，才对得上真实输入。
// 注意：这只是手写投影、不读 dist；真实 dist 输入的最终防线是 build 后的 verify:artifacts 与
// panel-render 的产物加载用例（#106 §3.4：单测不假装是产物门禁）。
// runtime 仍是 .mjs，没有 .ts 说明符，改写对它是空操作。
function emitLine(line: string): string {
  return line.replace(/(['"])((?:\.{1,2}\/)[^'"]+)\.ts\1/g, '$1$2.js$1')
}

// 纯类型声明（export interface / export type / export declare）在 emit 里整行消失（tsc 只擦除、不输出），
// 不参与「未识别顶格语句」判定。
const ERASED_DECL_RE = /^export\s+(?:type|interface|declare)\b/

// 改造前 build-client.mjs 用的正则（前 5 条原样保留，作为 .mjs 等价性基准；改这 5 条会让等价测试失真，别动）。
// 第 6 条 type-import：P0 抽取解析器时就存在（bundler 里对应分支只丢弃、不输出），
// 只是源码里直到 P2 给引擎补类型注解才开始出现 `import type`，所以 P2 才补进基准。
interface LegacyEntry {
  type: string
  re: RegExp
}

const LEGACY: LegacyEntry[] = [
  { type: 'json-import', re: /^import (\w+) from '([^']+\.json)' with \{ type: 'json' \}$/ },
  { type: 'js-import', re: /^import \{ ([^}]+) \} from '\.\/([A-Za-z0-9_\/-]+)\.mjs'$/ },
  { type: 'pkg-import', re: /^import \{ ([^}]+) \} from '([a-z0-9-]+\/[a-z0-9-]+)'$/ },
  { type: 'export', re: /^export (function|const) (\w+)/ },
  { type: 're-export', re: /^export \{ ([^}]+) \}$/ },
  { type: 'type-import', re: /^import\s+type\s/ },
]

interface LegacyMatch {
  type: string
  match: RegExpMatchArray
}

function legacyParse(line: string): LegacyMatch | null {
  for (const entry of LEGACY) {
    const m = line.match(entry.re)
    if (m) return { type: entry.type, match: m }
  }
  return null
}

test('现行手写风格：单引号 + 无分号 + .mjs', () => {
  assert.deepEqual(parseLine("import { a, b } from './x.mjs'"), { type: 'js-import', names: 'a, b', specifier: 'x' })
  assert.deepEqual(parseLine("import { FONTS } from './engine/map-dsh.mjs'"), { type: 'js-import', names: 'FONTS', specifier: 'engine/map-dsh' })
  assert.deepEqual(parseLine("import themes from './opencode.json' with { type: 'json' }"), { type: 'json-import', localName: 'themes', specifier: './opencode.json' })
  assert.deepEqual(parseLine("import { createClient } from 'dsh-log/client'"), { type: 'pkg-import', names: 'createClient', specifier: 'dsh-log/client' })
  assert.deepEqual(parseLine('export function foo(a) {'), { type: 'export', kind: 'function', name: 'foo', strippedLine: 'function foo(a) {' })
  assert.deepEqual(parseLine('export const BAR = 1'), { type: 'export', kind: 'const', name: 'BAR', strippedLine: 'const BAR = 1' })
  assert.deepEqual(parseLine('export { a, b }'), { type: 're-export', names: ['a', 'b'] })
})

test('tsc 默认 emit 风格：双引号 + 行尾分号 + .js（C-lite 前置）', () => {
  assert.deepEqual(parseLine('import { a, b } from "./dep.js";'), { type: 'js-import', names: 'a, b', specifier: 'dep' })
  assert.deepEqual(parseLine('import themes from "./opencode.json" with { type: "json" };'), { type: 'json-import', localName: 'themes', specifier: './opencode.json' })
  assert.deepEqual(parseLine('import { createClient } from "dsh-log/client";'), { type: 'pkg-import', names: 'createClient', specifier: 'dsh-log/client' })
  assert.deepEqual(parseLine('export const BAR = 1;'), { type: 'export', kind: 'const', name: 'BAR', strippedLine: 'const BAR = 1;' })
  assert.deepEqual(parseLine('export function foo() {};'), { type: 'export', kind: 'function', name: 'foo', strippedLine: 'function foo() {};' })
  assert.deepEqual(parseLine('export { a, b };'), { type: 're-export', names: ['a', 'b'] })
  // 迁移后只可能是 .js；.mjs 仍要认（现有运行时/引擎互引就是 .mjs）
  assert.deepEqual(parseLine("import { x } from './dep.mjs';"), { type: 'js-import', names: 'x', specifier: 'dep' })
})

test('真实相对说明符 `../`：emit 形态可识别，specifier 保留前缀、由 bundler 取最后一段', () => {
  // runtime/client.ts 的引擎导入：源码写 '../src/engine/index.ts'，emit 后成 '../src/engine/index.js'
  assert.deepEqual(parseLine('import { renderTheme } from "../src/engine/index.js";'), { type: 'js-import', names: 'renderTheme', specifier: '../src/engine/index' })
  // 单引号/无分号风格同样要认（手写与 emit 两种风格都可能出现）
  assert.deepEqual(parseLine("import { a, b } from '../src/engine/resolve.js'"), { type: 'js-import', names: 'a, b', specifier: '../src/engine/resolve' })
  // 多级回溯
  assert.deepEqual(parseLine('import { c } from "../../lib/x.js";'), { type: 'js-import', names: 'c', specifier: '../../lib/x' })
  // 仍不误认裸包名（'dsh-log/client' 走 pkg-import）与 .ts 源码行（源码 .ts 不进 bundle，emit 后才吃 .js）
  assert.deepEqual(parseLine('import { createClient } from "dsh-log/client";'), { type: 'pkg-import', names: 'createClient', specifier: 'dsh-log/client' })
  assert.equal(parseLine("import { a } from '../src/engine/index.ts'"), null)
})

test('import type 单独识别（不能进运行时 bundle）', () => {
  assert.deepEqual(parseLine("import type { X } from './y.js';"), { type: 'type-import' })
  assert.deepEqual(parseLine('import type Foo from "./y.js";'), { type: 'type-import' })
})

test('非语句行不误伤', () => {
  for (const line of ['', 'const x = 1', '// export const x = 1', '  return {', 'if (a) { b() }', 'export default function () {}', 'importx from "./y.js"']) {
    assert.equal(parseLine(line), null, JSON.stringify(line))
  }
})

test('迁移前 .mjs 旧风格样本行：parseLine 与改造前内联正则逐字段一致', () => {
  // 样本取自迁移前 runtime/client.mjs 与 src/engine/*.mjs 的真实行形态（旧风格冻结 fixture）。
  const samples = [
    "import { createClient } from 'dsh-log/client'",
    "import { FONTS } from './engine/map-dsh.mjs'",
    "import { renderTheme, previewColors } from './engine/index.mjs'",
    "import themes from './opencode.json' with { type: 'json' }",
    'export function foo(a) {',
    'export const BAR = 1',
    'export { a, b }',
  ]
  for (const line of samples) {
    const legacy = legacyParse(line)
    assert.ok(legacy !== null, '旧风格样本行必须被旧正则识别：' + line)
    const parsed = parseLine(line)
    assert.ok(parsed !== null, '改造前识别的行现在丢了：' + line)
    assert.equal(parsed.type, legacy.type, line)
    const m = legacy.match
    if (parsed.type === 'json-import') {
      assert.equal(parsed.localName, m[1], line)
      assert.equal(parsed.specifier, m[2], line)
    } else if (parsed.type === 'js-import') {
      assert.equal(parsed.names, m[1], line)
      assert.equal(parsed.specifier, m[2], line)
    } else if (parsed.type === 'pkg-import') {
      assert.equal(parsed.names, m[1], line)
      assert.equal(parsed.specifier, m[2], line)
    } else if (parsed.type === 'export') {
      assert.equal(parsed.name, m[2], line)
      assert.equal(parsed.strippedLine, line.replace(/^export /, ''), line)
    } else if (parsed.type === 're-export') {
      assert.deepEqual(parsed.names, m[1].split(',').map((s) => s.trim()).filter(Boolean), line)
    }
  }
})

test('真实源码（engine+runtime .ts）按 emit 投影后没有未识别顶格语句，且五类语句都出现', () => {
  const counts: Record<string, number> = {}
  const unhandled: string[] = []
  for (const file of SOURCE_FILES) {
    const lines = readNormalized(file).split('\n')
    for (let i = 0; i < lines.length; i += 1) {
      const line = emitLine(lines[i])
      if (ERASED_DECL_RE.test(line)) continue
      if (!/^(import|export)\b/.test(line)) continue
      const parsed = parseLine(line)
      const at = file + ':' + (i + 1) + '：' + line.slice(0, 100)
      if (parsed === null) {
        unhandled.push(at)
        continue
      }
      counts[parsed.type] = (counts[parsed.type] || 0) + 1
    }
  }
  assert.deepEqual(unhandled, [])
  // 五类语句在真实源码里都必须出现过（防止测试只在 fixture 上空转）
  for (const type of ['json-import', 'js-import', 'pkg-import', 'export', 're-export']) {
    assert.ok((counts[type] || 0) > 0, '真实源码里没有出现 ' + type)
  }
})
