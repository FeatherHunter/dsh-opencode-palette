// tests/source-parser.test.mjs — P0 构建链硬化：逐行解析器（scripts/lib/source-parser.mjs）
//
// 守两件事：
//   1) 现行源码的解析结果与改造前内联在 build-client.mjs 里的正则**逐字段一致**（build 行为零变化）；
//   2) 同时认识 tsc 默认 emit 风格（双引号、行尾分号、`.js` 后缀）和 `import type`（C-lite 前置）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseLine } from '../scripts/lib/source-parser.mjs'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

// bundler 处理的全部源码：src/engine/*.mjs（MODULE_ORDER 里的 14 个）+ runtime 的 6 个模块。
// runtime/host.mjs 不参与逐行解析（原样复制进 package/lib/index.js），故意不列。
const ENGINE_MODULES = ['resolve', 'map-dsh', 'font-face', 'font-avail', 'font-names', 'local-fonts', 'generate', 'zh-names', 'registry', 'ip-presets', 'grouping', 'index', 'update-tokens', 'float-geometry']
const RUNTIME_MODULES = ['client.mjs', 'channel.mjs', 'custom-color.mjs', 'custom-store.mjs', 'custom-editor.mjs', 'ui-fx.mjs']
const SOURCE_FILES = ENGINE_MODULES.map((name) => join(ROOT, 'src', 'engine', name + '.mjs')).concat(RUNTIME_MODULES.map((name) => join(ROOT, 'runtime', name)))

function readNormalized(file) {
  return readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
}

// 改造前 build-client.mjs 里的 5 条正则（原样保留，作为等价性基准；改构建逻辑时不要动这组基准）
const LEGACY = [
  { type: 'json-import', re: /^import (\w+) from '([^']+\.json)' with \{ type: 'json' \}$/ },
  { type: 'js-import', re: /^import \{ ([^}]+) \} from '\.\/([A-Za-z0-9_\/-]+)\.mjs'$/ },
  { type: 'pkg-import', re: /^import \{ ([^}]+) \} from '([a-z0-9-]+\/[a-z0-9-]+)'$/ },
  { type: 'export', re: /^export (function|const) (\w+)/ },
  { type: 're-export', re: /^export \{ ([^}]+) \}$/ },
]

function legacyParse(line) {
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

test('import type 单独识别（不能进运行时 bundle）', () => {
  assert.deepEqual(parseLine("import type { X } from './y.js';"), { type: 'type-import' })
  assert.deepEqual(parseLine('import type Foo from "./y.js";'), { type: 'type-import' })
})

test('非语句行不误伤', () => {
  for (const line of ['', 'const x = 1', '// export const x = 1', '  return {', 'if (a) { b() }', 'export default function () {}', 'importx from "./y.js"']) {
    assert.equal(parseLine(line), null, JSON.stringify(line))
  }
})

test('现行源码逐行解析结果与改造前内联正则逐字段一致', () => {
  const counts = {}
  for (const file of SOURCE_FILES) {
    const lines = readNormalized(file).split('\n')
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]
      const legacy = legacyParse(line)
      const parsed = parseLine(line)
      const at = file + ':' + (i + 1)
      if (legacy === null) {
        assert.equal(parsed, null, '改造前不识别的行现在被识别了：' + at + '：' + line.slice(0, 100))
        continue
      }
      assert.ok(parsed !== null, '改造前识别的行现在丢了：' + at + '：' + line.slice(0, 100))
      assert.equal(parsed.type, legacy.type, at)
      counts[parsed.type] = (counts[parsed.type] || 0) + 1
      const m = legacy.match
      if (parsed.type === 'json-import') {
        assert.equal(parsed.localName, m[1], at)
        assert.equal(parsed.specifier, m[2], at)
      } else if (parsed.type === 'js-import') {
        assert.equal(parsed.names, m[1], at)
        assert.equal(parsed.specifier, m[2], at)
      } else if (parsed.type === 'pkg-import') {
        assert.equal(parsed.names, m[1], at)
        assert.equal(parsed.specifier, m[2], at)
      } else if (parsed.type === 'export') {
        assert.equal(parsed.name, m[2], at)
        assert.equal(parsed.strippedLine, line.replace(/^export /, ''), at)
      } else if (parsed.type === 're-export') {
        assert.deepEqual(parsed.names, m[1].split(',').map((s) => s.trim()).filter(Boolean), at)
      }
    }
  }
  // 五类语句在真实源码里都必须出现过（防止测试只在 fixture 上空转）
  for (const type of ['json-import', 'js-import', 'pkg-import', 'export', 're-export']) {
    assert.ok((counts[type] || 0) > 0, '真实源码里没有出现 ' + type)
  }
})

test('全部源码里没有未识别的顶格 import/export 行（UNHANDLED = 0）', () => {
  const unhandled = []
  for (const file of SOURCE_FILES) {
    const lines = readNormalized(file).split('\n')
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]
      if (/^(import|export)\b/.test(line) && parseLine(line) === null) unhandled.push(file + ':' + (i + 1) + '：' + line.slice(0, 100))
    }
  }
  assert.deepEqual(unhandled, [])
})
