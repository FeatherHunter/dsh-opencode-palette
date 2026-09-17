// sync-verify.test.mjs — #33 加固回归：pin SHA + 基线预校验 + 先验后写（全本地 fixture，无网络）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  OPCODE_SHA, ASSET_BASE, REQUIRED_KEYS, validateStructure, prettyOf, sha256Hex, syncThemes,
} from '../scripts/sync-themes.mjs'

function themeData(color = '#112233') {
  const theme = {}
  for (const k of REQUIRED_KEYS) theme[k] = color
  return { defs: {}, theme }
}

function entryFor(data) {
  const pretty = prettyOf(data)
  return { pretty, entry: { bytes: pretty.length, sha256: sha256Hex(pretty) } }
}

async function setupDir({ names, contents, baselineRev, manifestExtra } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'sync-verify-'))
  const manifestPath = join(dir, 'MANIFEST.json')
  const themes = {}
  for (const n of names) {
    const { pretty, entry } = entryFor(contents[n])
    themes[n] = entry
    await writeFile(join(dir, n + '.json'), pretty)
  }
  const manifest = { source: 'anomalyco/opencode', rev: baselineRev, tag: 'test', syncedAt: '2026-01-01T00:00:00.000Z', themes, ...manifestExtra }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  return { dir, manifestPath }
}

async function listTmp(dir) {
  const files = await readdir(dir)
  return files.filter((f) => f.includes('.tmp-'))
}

test('上游引用 pin 到 commit SHA（URL 不可变，不跟随 tag）', () => {
  assert.match(OPCODE_SHA, /^[0-9a-f]{40}$/, 'OPCODE_SHA 须为 40 位 commit SHA')
  assert.ok(ASSET_BASE.includes('/' + OPCODE_SHA + '/'), 'ASSET_BASE 须包含 SHA')
  assert.doesNotMatch(ASSET_BASE, /\/v\d+\.\d+\.\d+\//, 'ASSET_BASE 不得含可变 tag 段')
})

test('被篡改内容拒绝写入，既有文件完好且无半成品', async () => {
  const good = themeData('#112233')
  const bad = themeData('#FF0000')
  const { dir, manifestPath } = await setupDir({ names: ['t1', 't2'], contents: { t1: good, t2: good }, baselineRev: 'aaaabbbbccccddddeeeeffff0000111122223333' })
  const before = await readFile(join(dir, 't2.json'), 'utf8')
  const fetchText = async (n) => prettyOf(n === 't2' ? bad : good)
  await assert.rejects(
    () => syncThemes({ themesDir: dir, manifestPath, themeNames: ['t1', 't2'], scriptSha: 'aaaabbbbccccddddeeeeffff0000111122223333', fetchText }),
    (e) => e.kind === 'tamper-suspect' && /疑似篡改/.test(e.message) && /已拒绝写入/.test(e.message),
  )
  assert.equal(await readFile(join(dir, 't2.json'), 'utf8'), before, '既有好文件不得被破坏')
  assert.deepEqual(await listTmp(dir), [], '不得残留 tmp 半成品')
  await rm(dir, { recursive: true, force: true })
})

test('SHA 已改但基线未改 → 报基线过期并指引 --update-baseline，不写文件', async () => {
  const oldD = themeData('#112233')
  const newD = themeData('#445566')
  const { dir, manifestPath } = await setupDir({ names: ['t1'], contents: { t1: oldD }, baselineRev: 'old-rev-00000000000000000000000000000001' })
  const before = await readFile(join(dir, 't1.json'), 'utf8')
  const fetchText = async () => prettyOf(newD)
  await assert.rejects(
    () => syncThemes({ themesDir: dir, manifestPath, themeNames: ['t1'], scriptSha: 'new-rev-00000000000000000000000000000002', tagAnnotation: 'vX', fetchText }),
    (e) => e.kind === 'baseline-expired' && /基线过期/.test(e.message) && /--update-baseline/.test(e.message),
  )
  assert.equal(await readFile(join(dir, 't1.json'), 'utf8'), before, '过期基线下不得写文件')
  await rm(dir, { recursive: true, force: true })
})

test('合法升级（改 SHA + --update-baseline）一次跑通并保留 adapted20', async () => {
  const oldD = themeData('#112233')
  const newD = themeData('#445566')
  const adapted20 = { source: 'x', method: 'y', sources: 'z', themes: { amoled: { bytes: 1, sha256: 'abc' } } }
  const { dir, manifestPath } = await setupDir({
    names: ['t1'], contents: { t1: oldD }, baselineRev: 'old-rev-00000000000000000000000000000001',
    manifestExtra: { adapted20 },
  })
  const fetchText = async () => prettyOf(newD)
  const r = await syncThemes({
    themesDir: dir, manifestPath, themeNames: ['t1'],
    scriptSha: 'new-rev-00000000000000000000000000000002', tagAnnotation: 'vX',
    updateBaseline: true, fetchText,
  })
  assert.equal(r.updated, true)
  assert.equal(await readFile(join(dir, 't1.json'), 'utf8'), prettyOf(newD), '升级后文件应为新内容')
  const next = JSON.parse(await readFile(manifestPath, 'utf8'))
  assert.equal(next.rev, 'new-rev-00000000000000000000000000000002')
  assert.equal(next.themes.t1.sha256, sha256Hex(prettyOf(newD)))
  assert.deepEqual(next.adapted20, adapted20, 'adapted20 非同步段须原样保留')
  await rm(dir, { recursive: true, force: true })
})

test('无基线/缺条目不放行（无“无历史即放行”），显式 flag 才能建基线', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sync-verify-'))
  const manifestPath = join(dir, 'MANIFEST.json')
  const fetchText = async () => prettyOf(themeData())
  await assert.rejects(
    () => syncThemes({ themesDir: dir, manifestPath, themeNames: ['t1'], fetchText }),
    (e) => e.kind === 'no-baseline',
  )
  const r = await syncThemes({ themesDir: dir, manifestPath, themeNames: ['t1'], scriptSha: 's'.repeat(40), updateBaseline: true, fetchText })
  assert.equal(r.updated, true)
  assert.equal((await readdir(dir)).filter((f) => f.endsWith('.json') && !f.startsWith('MANIFEST')).length, 1)
  await rm(dir, { recursive: true, force: true })
})

test('结构破坏（缺必填色位）即使 --update-baseline 也不进基线', async () => {
  const good = themeData()
  const { dir, manifestPath } = await setupDir({ names: ['t1'], contents: { t1: good }, baselineRev: 'a'.repeat(40) })
  const broken = { defs: {}, theme: { background: '#000' } }
  const fetchText = async () => JSON.stringify(broken)
  for (const updateBaseline of [false, true]) {
    await assert.rejects(
      () => syncThemes({ themesDir: dir, manifestPath, themeNames: ['t1'], scriptSha: 'a'.repeat(40), updateBaseline, fetchText }),
      (e) => e.kind === 'tamper-suspect' && /结构校验失败/.test(e.message),
    )
  }
  assert.equal(await readFile(join(dir, 't1.json'), 'utf8'), prettyOf(good), '坏内容不得覆盖好文件')
  await rm(dir, { recursive: true, force: true })
})

test('校验通过即恢复缺失文件且不碰基线；失败后重跑可恢复', async () => {
  const good = themeData()
  const { dir, manifestPath } = await setupDir({ names: ['t1', 't2'], contents: { t1: good, t2: good }, baselineRev: 'b'.repeat(40) })
  const manifestBefore = await readFile(manifestPath, 'utf8')
  await rm(join(dir, 't2.json'), { force: true })
  const fetchText = async () => prettyOf(good)
  const r = await syncThemes({ themesDir: dir, manifestPath, themeNames: ['t1', 't2'], scriptSha: 'b'.repeat(40), fetchText })
  assert.equal(r.updated, false)
  assert.equal(await readFile(join(dir, 't2.json'), 'utf8'), prettyOf(good), '缺失文件应被恢复')
  assert.equal(await readFile(manifestPath, 'utf8'), manifestBefore, '校验模式不得改基线（含 syncedAt）')
  // 中途失败 → 重跑恢复
  const badFetch = async (n) => prettyOf(n === 't1' ? themeData('#FF0000') : good)
  await assert.rejects(() => syncThemes({ themesDir: dir, manifestPath, themeNames: ['t1', 't2'], scriptSha: 'b'.repeat(40), fetchText: badFetch }))
  assert.deepEqual(await listTmp(dir), [], '失败后无半成品')
  const r2 = await syncThemes({ themesDir: dir, manifestPath, themeNames: ['t1', 't2'], scriptSha: 'b'.repeat(40), fetchText })
  assert.equal(r2.count, 2)
  await rm(dir, { recursive: true, force: true })
})

test('NOTICES 更新只换首行，手工维护段原样保留', async () => {
  const good = themeData()
  const { dir, manifestPath } = await setupDir({ names: ['t1'], contents: { t1: good }, baselineRev: 'c'.repeat(40) })
  const tail = '手工段第一行\n\n手工段第二行（字体/2.0 说明）'
  await writeFile(join(dir, 'THIRD_PARTY_NOTICES.md'), '旧首行（tag 版）\n' + tail)
  const fetchText = async () => prettyOf(good)
  await syncThemes({ themesDir: dir, manifestPath, themeNames: ['t1'], scriptSha: 'c'.repeat(40), updateBaseline: true, fetchText })
  const out = await readFile(join(dir, 'THIRD_PARTY_NOTICES.md'), 'utf8')
  assert.ok(out.startsWith('opencode 主题资产源自 opencode (MIT) 仓库 packages/tui/src/theme/assets/，commit '), '首行应为新 pin')
  assert.ok(out.includes('不跟随 tag 移动'), '首行应注明不跟随 tag')
  assert.ok(out.endsWith(tail), '手工尾部须原样保留')
  await rm(dir, { recursive: true, force: true })
})

test('validateStructure 与旧脚本同门：缺 defs/theme/色位即错', () => {  assert.throws(() => validateStructure('x', null), /非对象/)
  assert.throws(() => validateStructure('x', { theme: {} }), /缺 defs/)
  assert.throws(() => validateStructure('x', { defs: {}, theme: { background: '#000' } }), /缺必填色位/)
  assert.equal(validateStructure('x', themeData()), true)
})
