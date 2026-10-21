// terminology.test.ts — 术语门禁：仓库里任何文档/源码都不许再出现「色板」「色味」「色位」
//
// 2026-10-21 用户定的四条：
//   1) IP 预置那一层是产品件，叫「主题胶囊 / theme capsule」（README EXTENSIONS 段已在用）；
//   2) 泛指「一套颜色」的场合一律叫「配色」；
//   3) 「色板」是自造词，从本仓清干净（原来散在 25 个 Markdown、源码注释、预览 HTML 里）；
//   4) 「色味」用户直说「这个词也看不懂」—— 同样不许进仓。
// 2026-10-21 用户追认第 5 条：
//   5) 「色位」也是自造词，用户直说「色位 这个词」看不懂 —— 全仓换成白话「颜色」
//      （README「37 个颜色逐个调」、源码注释「37 个颜色 → 色值」都按这个口径）。
//
// 品牌「OpenCode调色板」是产品名（面板标题 / 安装指引 / 图片 alt）。用户 2026-10-21 讲清了这两者的分别：
// 「调色板」是「调色-板」这一整套名词（标准复合词），被禁的「色板」是自造词 —— 两者不是一回事。
// 所以这里拦的是**独立出现**的「色板」((?<!调)色板)，不去碰品牌。
// 这条门禁的存在意义：清词是清一次的事，钉住才是长期的事 —— 下次谁写文档又顺手打了「色板」，这里就红。
//
// 扫描范围：仓库里所有文本文件（Markdown / 源码 / 预览 HTML / 配置），跳过依赖、构建产物、
// 本机教学/草稿/临时件（.gitignore 已排除的那批）。门禁文件自己要点名被禁的词（正则字面量里也有），
// 所以跳过自己 —— 这是唯一的口子，理由写在这里。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

// 不进这道门的目录：依赖、构建产物、本机教学/草稿/临时件（.gitignore 已排除的那批）
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'artifacts', 'coverage', 'teach', '.local', '__pycache__'])
const SELF = 'tests/terminology.test.ts'
const SKIP_ARTIFACTS = new Set(['client.js']) // 根 client.js 是构建产物（pretest 现产），由源码决定用词
const EXTS = new Set(['.md', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.html', '.css', '.yml', '.yaml', '.txt', '.ps1', '.svg'])

// 被禁的词 + 改写指引（allowPrefix：品牌「调色板」里的「调」+「色板」是标准复合词，豁免）
const BANNED: { word: string; hint: string; allowPrefix?: string }[] = [
  { word: '色板', allowPrefix: '调', hint: '泛指一套颜色请写「配色」；IP 预置那层请写「主题胶囊」' },
  { word: '色味', hint: '这不是词 —— 请写「配色」「色调」，或直接说「颜色」' },
  { word: '色位', hint: '请写「颜色」：一个主题里的 37 个可逐个改的颜色（如「37 个颜色逐个调」）' },
]

// 引号里点名被禁词是允许的（词表页要能写「色板」这条禁令本身）：
// 紧挨引号（开口或收口）就算「在点名」——「色位」「色位 这个词」两种写法都算数。
const QUOTE_OPEN = '「“"'
const QUOTE_CLOSE = '」”"'

function isSkipped(name: string): boolean {
  return SKIP_DIRS.has(name) || name.startsWith('.scratch') || name.startsWith('.tmp-')
}

function walk(dir: string, out: string[] = [], parent = ''): string[] {
  for (const name of readdirSync(dir)) {
    if (isSkipped(name)) continue
    if (name === 'lib' && parent === 'package') continue // package/lib 是构建产物
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out, name)
    else {
      const dot = name.lastIndexOf('.')
      if (dot > 0 && EXTS.has(name.slice(dot)) && !SKIP_ARTIFACTS.has(name)) out.push(p)
    }
  }
  return out
}

function rel(p: string): string {
  return relative(ROOT, p).replaceAll('\\', '/')
}

test('仓库里不许再出现独立「色板」「色味」「色位」（品牌「调色板」豁免）', () => {
  const files = walk(ROOT)
  assert.ok(files.length > 20, `应扫到不少文本文件（实为 ${files.length}），扫少了等于没门禁`)
  const hits: string[] = []
  for (const file of files) {
    if (rel(file) === SELF) continue
    const raw = readFileSync(file, 'utf8')
    for (const { word, hint, allowPrefix } of BANNED) {
      let idx = raw.indexOf(word)
      while (idx !== -1) {
        const before = idx > 0 ? raw[idx - 1] : ''
        const after = raw[idx + word.length] ?? ''
        const quoted = QUOTE_OPEN.includes(before) || QUOTE_CLOSE.includes(after)
        const brand = allowPrefix !== undefined && before === allowPrefix
        if (!quoted && !brand) {
          const line = raw.slice(0, idx).split('\n').length
          hits.push(`${rel(file)}:${line} 「${word}」→ ${hint}`)
        }
        idx = raw.indexOf(word, idx + word.length)
      }
    }
  }
  assert.deepEqual(hits, [], '以下文件仍出现被禁词：\n' + hits.join('\n'))
})

test('产品术语：IP 预置那层叫「主题胶囊 / theme capsule」，品牌名不许被误伤', () => {
  const ZH = readFileSync(join(ROOT, 'README.md'), 'utf8')
  const EN = readFileSync(join(ROOT, 'docs', 'README.en.md'), 'utf8')
  assert.ok(ZH.includes('IP 主题胶囊'), '中文首页应写「IP 主题胶囊」')
  assert.ok(EN.includes('IP theme capsule'), '英文首页应写「IP theme capsule」')
  assert.ok(ZH.includes('OpenCode调色板'), '品牌名「OpenCode调色板」应完好（清术语不许误伤品牌）')
  assert.ok(EN.includes('OpenCode Palette'), '英文品牌名「OpenCode Palette」应完好')
})

test('词表页要点名三个被禁词（门禁不许把规则本身写没了）', () => {
  const GLOSSARY = readFileSync(join(ROOT, 'docs', 'i18n-glossary.md'), 'utf8')
  assert.ok(GLOSSARY.includes('色板'), 'docs/i18n-glossary.md 应点名「色板」这条禁令')
  assert.ok(GLOSSARY.includes('色味'), 'docs/i18n-glossary.md 应点名「色味」这条禁令')
  assert.ok(GLOSSARY.includes('色位'), 'docs/i18n-glossary.md 应点名「色位」这条禁令')
})
