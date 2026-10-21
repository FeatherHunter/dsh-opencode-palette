// terminology.test.ts — 术语门禁：仓库里任何 Markdown 都不许再出现「色板」
//
// 2026-10-21 用户定：
//   1) IP 预置那一层是产品件，叫「主题胶囊 / theme capsule」（README EXTENSIONS 段已在用）；
//   2) 泛指「一套颜色」的场合一律叫「配色」；
//   3) 「色板」一词从本仓 Markdown 里清干净。
//
// 品牌「OpenCode调色板」是产品名（面板标题 / 安装指引 / 图片 alt）。用户 2026-10-21 讲清了这两者的分别：
// 「调色板」是「调色-板」这一整套名词（标准复合词），被禁的「色板」是自造词 —— 两者不是一回事。
// 所以这里拦的是**独立出现**的「色板」((?<!调)色板)，不去碰品牌。
// 这条门禁的存在意义：清词是清一次的事，钉住才是长期的事 —— 下次谁写文档又顺手打了「色板」，这里就红。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

// 不进这道门的目录：依赖、构建产物、本机教学/草稿/临时件（.gitignore 已排除的那批）
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'teach', 'artifacts', 'coverage', '.local', '__pycache__'])

function isSkipped(name: string): boolean {
  return SKIP_DIRS.has(name) || name.startsWith('.scratch') || name.startsWith('.tmp-')
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (isSkipped(name)) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (name.endsWith('.md')) out.push(p)
  }
  return out
}

test('任何 Markdown 都不许出现独立「色板」（品牌「调色板」豁免）', () => {
  const files = walk(ROOT)
  assert.ok(files.length > 20, `应扫到不少 Markdown（实为 ${files.length}），扫少了等于没门禁`)
  const hits: string[] = []
  for (const file of files) {
    const raw = readFileSync(file, 'utf8')
    // 引用被禁词本身是允许的（词表页要能点名「色板」这条禁令），但必须用引号括起来：
    // 「色板」/“色板”/"色板" 三种引号形式都算「在点名」，点名之外一律不许出现。
    const text = raw.replace(/[「“"]色板[」”"]/g, '（点名）')
    for (const m of text.matchAll(/(?<!调)色板/g)) {
      const line = text.slice(0, m.index).split('\n').length
      hits.push(`${relative(ROOT, file).replaceAll('\\', '/')}:${line}`)
    }
  }
  assert.deepEqual(hits, [], '以下 Markdown 仍出现「色板」（泛指一套颜色请写「配色」；IP 预置那层请写「主题胶囊」）：\n' + hits.join('\n'))
})

test('产品术语：IP 预置那层叫「主题胶囊 / theme capsule」，品牌名不许被误伤', () => {
  const ZH = readFileSync(join(ROOT, 'README.md'), 'utf8')
  const EN = readFileSync(join(ROOT, 'docs', 'README.en.md'), 'utf8')
  assert.ok(ZH.includes('IP 主题胶囊'), '中文首页应写「IP 主题胶囊」')
  assert.ok(EN.includes('IP theme capsule'), '英文首页应写「IP theme capsule」')
  assert.ok(ZH.includes('OpenCode调色板'), '品牌名「OpenCode调色板」应完好（清术语不许误伤品牌）')
  assert.ok(EN.includes('OpenCode Palette'), '英文品牌名「OpenCode Palette」应完好')
})
