// validate.ts — 原神两套 IP 预置的独立复核门禁。
//
// 判尺的**唯一权威**是仓库自带的 scripts/audit-themes.ts（判尺文字见 docs/theme-audit/criteria.md），
// 本文件不自造判尺，只做三件事：
//   ① 跑仓库审计器，断言 genshin / genshin-night 两套「硬对 0 违例 + UI 0 违例 + 待处理设计告警 0」；
//   ② 断言审计器的引擎对账（engineDiagnostics.tokenParity）在这两套上 0 失配——
//      即 JSON 值与引擎 buildTokens 实际产出逐 token 一致，预览与上线不会漂；
//   ③ 断言落盘的 37 色与本管线求解产物逐位一致（防止手改 JSON 绕过管线）。
//
// 跑法：node --experimental-strip-types validate.ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '..', '..')
const PRESETS = ['genshin', 'genshin-night']

let failures = 0
function ok(label: string, cond: boolean, detail = ''): void {
  if (!cond) failures++
  console.log((cond ? '  OK  ' : '  FAIL') + ' ' + label + (detail ? '  ' + detail : ''))
}

// ── ① 跑仓库审计器 ───────────────────────────────────────────────
console.log('[1] 跑仓库审计器 scripts/audit-themes.ts …')
execFileSync(process.execPath, [join(REPO, 'scripts', 'audit-themes.ts')], { cwd: REPO, stdio: 'ignore' })
const base = JSON.parse(readFileSync(join(REPO, 'docs', 'theme-audit', 'baseline.json'), 'utf8'))

for (const id of PRESETS) {
  const t = base.themes.find((x: any) => x.id === id)
  ok(id + ' 在审计基线里', !!t)
  if (!t) continue
  const ev = t.evaluations[0]
  const c = ev.counts
  ok(id + ' 硬性对比 0 违例', c.hardFails === 0, c.hardFails + '/' + c.hardTotal)
  ok(id + ' UI 对比 0 违例', c.uiFails === 0, c.uiFails + '/' + c.uiTotal)
  const par = t.tokenParity || {}
  ok(id + ' 引擎对账 0 失配', (par.mismatches || []).length === 0,
    'checked ' + par.checked + ' token')
  const open = base.designWarnings.filter((w: any) => w.theme === id && !w.documented)
  ok(id + ' 设计告警无「待处理」', open.length === 0,
    open.length ? open.map((w: any) => w.code).join(',') : '0 条')
  const rows = ev.pairs.filter((p: any[]) => p[4] >= 3 && p[0] !== 'border@background')
  const judged = ev.pairs.filter((p: any[]) =>
    !(p[0].startsWith('border@') || p[0] === 'diffAddedBg@background'
      || p[0] === 'diffRemovedBg@background'
      || (p[0].startsWith('syntax') && p[0].endsWith('@codeHeaderBg'))
      || p[0].startsWith('tooltipText')))
  const fail = judged.filter((p: any[]) => p[5] === 'fail')
  ok(id + ' 判定对 ' + judged.length + ' 条全过', fail.length === 0,
    fail.length ? fail.map((p: any[]) => p[0]).join(',') : '0 违例')
  void rows
}

// ── ③ 落盘 JSON 与求解产物一致 ───────────────────────────────────
console.log('[3] 落盘 JSON 与求解产物逐位比对 …')
for (const [id, mode] of [['genshin', 'light'], ['genshin-night', 'dark']] as const) {
  const disk = JSON.parse(readFileSync(join(REPO, 'src', 'custom-presets', id + '.json'), 'utf8'))
  const solved = JSON.parse(readFileSync(join(HERE, 'solved-' + mode + '.json'), 'utf8'))
  const keys = Object.keys(solved.colors)
  let diff = 0
  for (const k of keys) if (disk.colors[k] !== solved.colors[k]) diff++
  ok(id + ' 37 色与求解产物一致', diff === 0 && keys.length === 37,
    diff ? diff + ' 处不一致' : keys.length + ' 色一致')
  ok(id + ' appearance = ' + mode, disk.appearance === mode, disk.appearance)
  ok(id + ' 37 槽无缺', Object.keys(disk.colors).length === 37, String(Object.keys(disk.colors).length))
}

console.log(failures === 0 ? '\n复核通过：0 项失败' : '\n复核失败：' + failures + ' 项')
process.exit(failures === 0 ? 0 : 1)
