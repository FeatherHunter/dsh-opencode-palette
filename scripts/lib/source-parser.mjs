// @ts-check
// source-parser.mjs — 构建器逐行源码解析（P0 从 scripts/build-client.mjs 抽出，便于单测）。
//
// 只负责识别「这一行属于哪种 bundler 语句」，不生成代码：
//   - json-import   import data from './themes.json' with { type: 'json' }
//   - js-import     import { a, b } from './x.mjs'
//   - pkg-import    import { a, b } from 'dsh-log/client'（构建期内联的 npm 包入口）
//   - export        export function foo / export const BAR
//   - re-export     export { a, b }
//   - type-import   import type { T } from './x.js'（纯类型，不能进 bundle）
//
// 兼容两种文本风格：
//   现行手写风格：单引号、无行尾分号、`.mjs` 后缀
//   tsc 默认 emit：双引号、行尾分号、`.js` 后缀（C-lite：bundler 消费 tsc 转译产物）
// 仍然只匹配**单行**语句：构建器按行处理，tsc 不会把 import/export 声明拆成多行。
// 未识别的行原样返回 null，由调用方决定保留/报错。

// 组语义：1=本地名 2=引号 3=说明符（含 ./，与旧实现一致） 4=type 值的引号
const JSON_IMPORT_RE = /^import\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+from\s+(['"])([^'"]+\.json)\2\s+with\s*\{\s*type\s*:\s*(['"])json\4\s*\}\s*;?$/
// 组语义：1=解构名列表 2=引号 3=说明符（`./` 之后、扩展名之前，与旧实现一致）
const JS_IMPORT_RE = /^import\s*\{\s*([^}]+?)\s*\}\s*from\s*(['"])\.\/([A-Za-z0-9_/-]+)\.m?js\2\s*;?$/
// 组语义同 JS import：1=解构名列表 2=引号 3=包说明符
const PKG_IMPORT_RE = /^import\s*\{\s*([^}]+?)\s*\}\s*from\s*(['"])([a-z0-9-]+\/[a-z0-9-]+)\2\s*;?$/
const TYPE_IMPORT_RE = /^import\s+type\s/
const EXPORT_RE = /^export\s+(?:async\s+)?(function|const)\s+([A-Za-z_$][A-Za-z0-9_$]*)/
const RE_EXPORT_RE = /^export\s*\{\s*([^}]+?)\s*\}\s*;?$/

/**
 * 解析一行源码。
 * @param {string} line 单行（调用方已把 CRLF 归一为 LF）
 * @returns {null | { type: 'json-import', localName: string, specifier: string }
 *   | { type: 'js-import', names: string, specifier: string }
 *   | { type: 'pkg-import', names: string, specifier: string }
 *   | { type: 'export', kind: 'function'|'const', name: string, strippedLine: string }
 *   | { type: 're-export', names: string[] }
 *   | { type: 'type-import' }}
 */
export function parseLine(line) {
  let m = line.match(JSON_IMPORT_RE)
  if (m) return { type: 'json-import', localName: m[1], specifier: m[3] }
  // `import type { X } from './x.js'` 与 JS/PKG import 同形，必须先判掉
  if (TYPE_IMPORT_RE.test(line)) return { type: 'type-import' }
  m = line.match(JS_IMPORT_RE)
  if (m) return { type: 'js-import', names: m[1], specifier: m[3] }
  m = line.match(PKG_IMPORT_RE)
  if (m) return { type: 'pkg-import', names: m[1], specifier: m[3] }
  m = line.match(EXPORT_RE)
  if (m) return { type: 'export', kind: /** @type {'function'|'const'} */ (m[1]), name: m[2], strippedLine: line.replace(/^export\s+/, '') }
  m = line.match(RE_EXPORT_RE)
  if (m) {
    const names = m[1].split(',').map((s) => s.trim()).filter(Boolean)
    return { type: 're-export', names: names }
  }
  return null
}
