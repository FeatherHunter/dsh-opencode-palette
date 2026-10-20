// make_preview_data.js — 从仓库真实审计基线 + 求解结果，产出 preview 用的数据文件
// 仓库 package.json 是 "type": "module"，故本文件用 ESM。
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '..', '..')
const T = HERE

const base = JSON.parse(readFileSync(REPO + '/docs/theme-audit/baseline.json', 'utf8'))
const light = JSON.parse(readFileSync(T + '/solved-light.json', 'utf8'))
const dark = JSON.parse(readFileSync(T + '/solved-dark.json', 'utf8'))

function evOf(id) {
  const t = base.themes.find(x => x.id === id)
  return t.evaluations[0]
}
function rows(id) {
  const ev = evOf(id)
  return ev.pairs.map(p => ({
    label: p[0], fg: p[1], bg: p[2], ratio: p[3], need: p[4], verdict: p[5],
    cls: (p[0].startsWith('border@') || p[0] === 'diffAddedBg@background' || p[0] === 'diffRemovedBg@background' || (p[0].startsWith('syntax') && p[0].endsWith('@codeHeaderBg')) || p[0].startsWith('tooltipText')) ? 'info' : (p[4] >= 4.5 ? 'hard' : 'ui'),
  }))
}
const out = {
  light: light.colors, dark: dark.colors,
  recipes: { light: light.recipes, dark: dark.recipes },
  auditLight: rows('genshin'),
  auditDark: rows('genshin-night'),
  designWarnings: base.designWarnings.filter(w => w.theme.startsWith('genshin')).length,
  hardLight: evOf('genshin').counts, hardDark: evOf('genshin-night').counts,
}
writeFileSync(T + '/preview-data.json', JSON.stringify(out, null, 1))
const key = (id, c) => { const p = evOf(id).pairs.find(p => p[0] === c); return p ? p[3] : null }
console.log('LIGHT  text@bg', key('genshin', 'text@background'), ' onPrimary', key('genshin', 'contrastText(primary)@primary'),
  ' dimmed@bg', key('genshin', 'labelDimmed@background'), ' mdLink@panel', key('genshin', 'markdownLink@backgroundPanel'))
console.log('DARK   text@bg', key('genshin-night', 'text@background'), ' onPrimary', key('genshin-night', 'contrastText(primary)@primary'),
  ' dimmed@bg', key('genshin-night', 'labelDimmed@background'), ' mdLink@panel', key('genshin-night', 'markdownLink@backgroundPanel'))
console.log('design warnings for genshin*:', out.designWarnings)
console.log('counts', JSON.stringify(out.hardLight), JSON.stringify(out.hardDark))
