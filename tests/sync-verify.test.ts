// tests/sync-verify.test.ts — #119 同步策略回归：pin SHA + 基线预校验 + verify 只报告不写盘 + 本地定制声明 + 显式覆盖
// 全本地 fixture，无网络。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, readdir, rm, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  OPCODE_SHA, ASSET_BASE, REQUIRED_KEYS, validateStructure, prettyOf, sha256Hex, syncThemes,
  acceptLocalCuration, parseArgs, formatDriftReport, exitCodeForDrift, curatedThemeNames,
  valuesEqual, diffValues,
} from '../scripts/sync-themes.ts'

type ThemeData = { defs: Record<string, unknown>; theme: Record<string, string> }

function themeData(color = '#112233'): ThemeData {
  const theme: Record<string, string> = {}
  for (const k of REQUIRED_KEYS) theme[k] = color
  return { defs: {}, theme }
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

function entryFor(data: ThemeData): { pretty: string; entry: { bytes: number; sha256: string } } {
  const pretty = prettyOf(data)
  return { pretty, entry: { bytes: pretty.length, sha256: sha256Hex(pretty) } }
}

interface SetupDirOptions {
  names: string[]
  contents: Record<string, ThemeData>
  baselineRev: string
  manifestExtra?: Record<string, unknown>
}

async function setupDir({ names, contents, baselineRev, manifestExtra }: SetupDirOptions): Promise<{ dir: string; manifestPath: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'sync-verify-'))
  const manifestPath = join(dir, 'MANIFEST.json')
  const themes: Record<string, { bytes: number; sha256: string }> = {}
  for (const n of names) {
    const { pretty, entry } = entryFor(contents[n])
    themes[n] = entry
    await writeFile(join(dir, n + '.json'), pretty)
  }
  const manifest = { source: 'anomalyco/opencode', rev: baselineRev, tag: 'test', syncedAt: '2026-01-01T00:00:00.000Z', themes, ...manifestExtra }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  return { dir, manifestPath }
}

async function listTmp(dir: string): Promise<string[]> {
  const files = await readdir(dir)
  return files.filter((f) => f.includes('.tmp-'))
}

// 写盘间谍：verify 路径下任何 write/rename/remove/mkdir 调用都记录并抛错（= 证明没有写盘）。
function throwingSpies(record: string[]): {
  write: (p: string, data: string) => Promise<unknown>
  renameFile: (from: string, to: string) => Promise<unknown>
  remove: (p: string, opts: { force: true }) => Promise<unknown>
  mkdirs: (p: string, opts: { recursive: true }) => Promise<unknown>
} {
  const fail = (label: string) => async (first: string): Promise<unknown> => {
    record.push(label + ':' + first)
    throw new Error('unexpected write: ' + label)
  }
  return {
    write: fail('write'),
    renameFile: fail('rename'),
    remove: fail('remove'),
    mkdirs: fail('mkdirs'),
  }
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
  const fetchText = async (n: string): Promise<string> => prettyOf(n === 't2' ? bad : good)
  await assert.rejects(
    () => syncThemes({ themesDir: dir, manifestPath, themeNames: ['t1', 't2'], scriptSha: 'aaaabbbbccccddddeeeeffff0000111122223333', fetchText }),
    (e: { kind?: string; message?: string }) => e.kind === 'tamper-suspect' && /疑似篡改/.test(String(e.message)) && /已拒绝写入/.test(String(e.message)),
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
  const fetchText = async (): Promise<string> => prettyOf(newD)
  await assert.rejects(
    () => syncThemes({ themesDir: dir, manifestPath, themeNames: ['t1'], scriptSha: 'new-rev-00000000000000000000000000000002', tagAnnotation: 'vX', fetchText }),
    (e: { kind?: string; message?: string }) => e.kind === 'baseline-expired' && /基线过期/.test(String(e.message)) && /--update-baseline/.test(String(e.message)),
  )
  assert.equal(await readFile(join(dir, 't1.json'), 'utf8'), before, '过期基线下不得写文件')
  await rm(dir, { recursive: true, force: true })
})

test('合法升级（改 SHA + --update-baseline）一次跑通：保留 adapted20、清除 localCuration、返回 discardedCuration', async () => {
  const oldD = themeData('#112233')
  const newD = themeData('#445566')
  const adapted20 = { source: 'x', method: 'y', sources: 'z', themes: { amoled: { bytes: 1, sha256: 'abc' } } }
  const { dir, manifestPath } = await setupDir({
    names: ['t1'], contents: { t1: oldD }, baselineRev: 'old-rev-00000000000000000000000000000001',
    manifestExtra: { adapted20, localCuration: { policy: 'preserve-local', themes: { t1: true } } },
  })
  const fetchText = async (): Promise<string> => prettyOf(newD)
  const r = await syncThemes({
    themesDir: dir, manifestPath, themeNames: ['t1'],
    scriptSha: 'new-rev-00000000000000000000000000000002', tagAnnotation: 'vX',
    updateBaseline: true, fetchText,
  })
  assert.equal(r.updated, true)
  assert.deepEqual(r.discardedCuration, ['t1'], '覆盖须报告被清除的本地定制声明')
  assert.equal(await readFile(join(dir, 't1.json'), 'utf8'), prettyOf(newD), '升级后文件应为新内容')
  const next = JSON.parse(await readFile(manifestPath, 'utf8'))
  assert.equal(next.rev, 'new-rev-00000000000000000000000000000002')
  assert.equal(next.themes.t1.sha256, sha256Hex(prettyOf(newD)))
  assert.deepEqual(next.adapted20, adapted20, 'adapted20 非同步段须原样保留')
  assert.equal(next.localCuration, undefined, '升级覆盖后旧本地定制声明必须清除')
  await rm(dir, { recursive: true, force: true })
})

test('无基线/缺条目不放行（无“无历史即放行”），显式 flag 才能建基线', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sync-verify-'))
  const manifestPath = join(dir, 'MANIFEST.json')
  const fetchText = async (): Promise<string> => prettyOf(themeData())
  await assert.rejects(
    () => syncThemes({ themesDir: dir, manifestPath, themeNames: ['t1'], fetchText }),
    (e: { kind?: string }) => e.kind === 'no-baseline',
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
  const fetchText = async (): Promise<string> => JSON.stringify(broken)
  for (const updateBaseline of [false, true]) {
    await assert.rejects(
      () => syncThemes({ themesDir: dir, manifestPath, themeNames: ['t1'], scriptSha: 'a'.repeat(40), updateBaseline, fetchText }),
      (e: { kind?: string; message?: string }) => e.kind === 'tamper-suspect' && /结构校验失败/.test(String(e.message)),
    )
  }
  assert.equal(await readFile(join(dir, 't1.json'), 'utf8'), prettyOf(good), '坏内容不得覆盖好文件')
  await rm(dir, { recursive: true, force: true })
})

test('#119 核心：verify 检测并报告本地漂移，但绝不写盘、绝不回滚手工修改', async () => {
  const upstream = themeData('#112233')
  const curatedLocal = clone(upstream)
  curatedLocal.theme.text = '#FF0000' // 模拟人工调整文字色（真实 #119 场景）
  const { dir, manifestPath } = await setupDir({ names: ['t1'], contents: { t1: upstream }, baselineRev: 'b'.repeat(40) })
  const localPath = join(dir, 't1.json')
  await writeFile(localPath, prettyOf(curatedLocal))
  const localBefore = await readFile(localPath, 'utf8')
  const manifestBefore = await readFile(manifestPath, 'utf8')
  const record: string[] = []
  const fetchText = async (): Promise<string> => prettyOf(upstream)
  const r = await syncThemes({
    themesDir: dir, manifestPath, themeNames: ['t1'], scriptSha: 'b'.repeat(40), fetchText,
    ...throwingSpies(record),
  })
  assert.deepEqual(record, [], 'verify 不得调用任何写盘原语')
  assert.equal(r.updated, false)
  assert.equal(r.drift.length, 1)
  const d = r.drift[0]
  assert.equal(d.name, 't1')
  assert.equal(d.kind, 'drift')
  assert.equal(d.curated, false, '未声明 localCuration 的漂移须标记为未声明')
  const change = d.changes.find((c) => c.path === 'theme.text')
  assert.ok(change, '须定位到 theme.text 差异键')
  assert.equal(change.expected, '#112233', '报告须含上游期望值')
  assert.equal(change.local, '#FF0000', '报告须含本地现值')
  assert.equal(exitCodeForDrift(r.drift), 1, '未声明漂移须退出非零')
  assert.equal(await readFile(localPath, 'utf8'), localBefore, '本地文件必须原样保留')
  assert.equal(await readFile(manifestPath, 'utf8'), manifestBefore, 'MANIFEST 不得被碰')
  assert.deepEqual(await listTmp(dir), [], '不得残留 tmp 半成品')
  const report = formatDriftReport(r.drift).join('\n')
  assert.ok(report.includes('本地漂移（未声明）'), '报告须说明漂移状态')
  assert.ok(report.includes('theme.text'), '报告须列出差异键')
  assert.ok(report.includes('上游=#112233') && report.includes('本地=#FF0000'), '未声明漂移须打印期望 vs 本地')
  await rm(dir, { recursive: true, force: true })
})

test('#119 核心：MANIFEST.localCuration 声明过的漂移 = 预期内（退出码 0），紧凑报告不刷值、--verbose 才展开', async () => {
  const upstream = themeData('#112233')
  const local = clone(upstream)
  local.theme.background = '#000000'
  const { dir, manifestPath } = await setupDir({
    names: ['t1'], contents: { t1: upstream }, baselineRev: 'c'.repeat(40),
    manifestExtra: { localCuration: { policy: 'preserve-local', note: 'test', themes: { t1: true } } },
  })
  await writeFile(join(dir, 't1.json'), prettyOf(local))
  const fetchText = async (): Promise<string> => prettyOf(upstream)
  const r = await syncThemes({ themesDir: dir, manifestPath, themeNames: ['t1'], scriptSha: 'c'.repeat(40), fetchText })
  assert.equal(r.drift.length, 1)
  assert.equal(r.drift[0].curated, true, '声明过的主题须标记 curated')
  assert.equal(exitCodeForDrift(r.drift), 0, '已声明定制漂移属预期，退出码 0')
  const compact = formatDriftReport(r.drift).join('\n')
  assert.ok(compact.includes('本地定制漂移（已声明，预期内）'))
  assert.ok(!compact.includes('上游='), '紧凑模式不逐项打印值，避免一次刷几十屏')
  assert.ok(compact.includes('theme.background'), '紧凑模式仍列出差异键')
  const verbose = formatDriftReport(r.drift, { verbose: true }).join('\n')
  assert.ok(verbose.includes('上游=#112233') && verbose.includes('本地=#000000'), '--verbose 才展开期望 vs 本地')
  // 全部漂移已声明 -> 空漂移同样 0
  assert.equal(exitCodeForDrift([]), 0)
  await rm(dir, { recursive: true, force: true })
})

test('verify 对缺失文件只报告不恢复；--write 显式覆盖才恢复并清除声明', async () => {
  const good = themeData()
  const { dir, manifestPath } = await setupDir({
    names: ['t1', 't2'], contents: { t1: good, t2: good }, baselineRev: 'd'.repeat(40),
    manifestExtra: { localCuration: { themes: { t2: true } } },
  })
  await rm(join(dir, 't2.json'), { force: true })
  const manifestBefore = await readFile(manifestPath, 'utf8')
  const fetchText = async (): Promise<string> => prettyOf(good)
  const record: string[] = []
  const r = await syncThemes({
    themesDir: dir, manifestPath, themeNames: ['t1', 't2'], scriptSha: 'd'.repeat(40), fetchText,
    ...throwingSpies(record),
  })
  assert.deepEqual(record, [])
  assert.equal(r.drift.length, 1)
  assert.equal(r.drift[0].name, 't2')
  assert.equal(r.drift[0].kind, 'missing')
  assert.equal(r.drift[0].curated, true, '声明过但文件缺失仍须人工处理（curated 仅表示声明过）')
  assert.equal(exitCodeForDrift(r.drift), 1, '文件缺失必须退出非零（缺失不是预期内的“漂移”）')
  await assert.rejects(() => readFile(join(dir, 't2.json'), 'utf8'), 'verify 不得恢复缺失文件')
  assert.equal(await readFile(manifestPath, 'utf8'), manifestBefore, 'verify 不得改基线')
  const report = formatDriftReport(r.drift).join('\n')
  assert.ok(report.includes('本地文件缺失') && report.includes('--write'), '报告须给出恢复动作')
  // 显式覆盖（--write）才恢复
  const w = await syncThemes({ themesDir: dir, manifestPath, themeNames: ['t1', 't2'], scriptSha: 'd'.repeat(40), fetchText, overwrite: true })
  assert.equal(w.updated, true)
  assert.deepEqual(w.written, ['t2'], '仅缺失文件实际写入（t1 已一致跳写）')
  assert.deepEqual(w.discardedCuration, ['t2'], '覆盖须报告被丢弃的声明')
  assert.equal(await readFile(join(dir, 't2.json'), 'utf8'), prettyOf(good), '--write 后缺失文件恢复')
  const next = JSON.parse(await readFile(manifestPath, 'utf8'))
  assert.equal(next.localCuration, undefined, '--write 后 localCuration 声明清除')
  const r2 = await syncThemes({ themesDir: dir, manifestPath, themeNames: ['t1', 't2'], scriptSha: 'd'.repeat(40), fetchText })
  assert.deepEqual(r2.drift, [], '恢复后 verify 干净')
  assert.equal(exitCodeForDrift(r2.drift), 0)
  await rm(dir, { recursive: true, force: true })
})

test('--write 同样先过基线预校验：上游可疑时拒绝覆盖，本地文件不动', async () => {
  const good = themeData('#112233')
  const bad = themeData('#FF0000')
  const { dir, manifestPath } = await setupDir({ names: ['t1'], contents: { t1: good }, baselineRev: 'e'.repeat(40) })
  const before = await readFile(join(dir, 't1.json'), 'utf8')
  const fetchText = async (): Promise<string> => prettyOf(bad)
  await assert.rejects(
    () => syncThemes({ themesDir: dir, manifestPath, themeNames: ['t1'], scriptSha: 'e'.repeat(40), fetchText, overwrite: true }),
    (e: { kind?: string }) => e.kind === 'tamper-suspect',
  )
  assert.equal(await readFile(join(dir, 't1.json'), 'utf8'), before, '可疑上游不得覆盖本地')
  await rm(dir, { recursive: true, force: true })
})

test('参数互斥：--update-baseline 与 --write 不能同时使用', async () => {
  await assert.rejects(
    () => syncThemes({ updateBaseline: true, overwrite: true }),
    /互斥/,
  )
})

test('acceptLocalCuration：登记漂移、清除已一致声明、跳过损坏项，且不碰主题 JSON/其它基线段', async () => {
  const upstream = themeData('#112233')
  const curated = clone(upstream)
  curated.theme.primary = '#ABCDEF'
  const adapted20 = { themes: { amoled: { bytes: 1, sha256: 'abc' } } }
  const { dir, manifestPath } = await setupDir({
    names: ['t1', 't2', 't3'], contents: { t1: upstream, t2: upstream, t3: upstream }, baselineRev: 'f'.repeat(40),
    manifestExtra: { adapted20, localCuration: { policy: 'preserve-local', themes: { t2: true } } },
  })
  await writeFile(join(dir, 't1.json'), prettyOf(curated))
  await rm(join(dir, 't3.json'), { force: true })
  const filesBefore = new Map<string, string>()
  for (const n of ['t1', 't2']) filesBefore.set(n, await readFile(join(dir, n + '.json'), 'utf8'))
  const manifestBefore = JSON.parse(await readFile(manifestPath, 'utf8'))
  const r = await acceptLocalCuration({ themesDir: dir, manifestPath, themeNames: ['t1', 't2', 't3'] })
  assert.deepEqual(r.accepted, ['t1'])
  assert.deepEqual(r.unmarked, ['t2'])
  assert.equal(r.broken.length, 1)
  assert.match(r.broken[0], /t3.*文件缺失/)
  for (const [n, before] of filesBefore) {
    assert.equal(await readFile(join(dir, n + '.json'), 'utf8'), before, '--accept-local 不得改主题 JSON: ' + n)
  }
  const next = JSON.parse(await readFile(manifestPath, 'utf8'))
  assert.equal(next.localCuration.themes.t1, true, '漂移主题须登记为本地定制')
  assert.equal(next.localCuration.themes.t2, undefined, '已一致主题的旧声明须清除')
  assert.equal(next.localCuration.policy, 'preserve-local')
  assert.equal(typeof next.localCuration.note, 'string')
  assert.deepEqual(next.adapted20, adapted20, 'adapted20 须原样保留')
  assert.deepEqual(next.themes, manifestBefore.themes, '指纹表不得被 accept-local 改动')
  // 登记后 verify 对该漂移视为预期
  const fetchText = async (): Promise<string> => prettyOf(upstream)
  const v = await syncThemes({ themesDir: dir, manifestPath, themeNames: ['t1'], scriptSha: 'f'.repeat(40), fetchText })
  assert.equal(v.drift[0].curated, true)
  assert.equal(exitCodeForDrift(v.drift), 0)
  // 结构损坏的本地文件不得被登记
  const brokenLocal = { defs: {}, theme: { background: '#000' } }
  await writeFile(join(dir, 't1.json'), JSON.stringify(brokenLocal))
  const r2 = await acceptLocalCuration({ themesDir: dir, manifestPath, themeNames: ['t1'] })
  assert.equal(r2.accepted.length, 0)
  assert.match(r2.broken[0], /结构校验失败/)
  await rm(dir, { recursive: true, force: true })
})

test('acceptLocalCuration 无基线时拒绝（不做“无历史即登记”）', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sync-verify-'))
  await assert.rejects(
    () => acceptLocalCuration({ themesDir: dir, manifestPath: join(dir, 'MANIFEST.json'), themeNames: ['t1'] }),
    (e: { kind?: string }) => e.kind === 'no-baseline',
  )
  await rm(dir, { recursive: true, force: true })
})

test('parseArgs：默认 verify、各显式模式、--verbose；未知参数与模式冲突报错', () => {
  assert.deepEqual(parseArgs([]), { mode: 'verify', verbose: false })
  assert.deepEqual(parseArgs(['--verbose']), { mode: 'verify', verbose: true })
  assert.deepEqual(parseArgs(['--write']), { mode: 'write', verbose: false })
  assert.deepEqual(parseArgs(['--update-baseline']), { mode: 'update-baseline', verbose: false })
  assert.deepEqual(parseArgs(['--accept-local']), { mode: 'accept-local', verbose: false })
  assert.deepEqual(parseArgs(['--verbose', '--write']), { mode: 'write', verbose: true })
  assert.throws(() => parseArgs(['--bogus']), /未知参数/)
  assert.throws(() => parseArgs(['--write', '--update-baseline']), /互斥/)
})

test('报告与工具函数：valuesEqual/diffValues/curatedThemeNames/formatDriftReport 边界', () => {
  assert.equal(valuesEqual({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 }), true, '键序不算差异')
  assert.equal(valuesEqual({ a: 1 }, { a: 2 }), false)
  const out: { path: string; expected: unknown; local: unknown }[] = []
  diffValues({ theme: { text: '#111', background: '#000' } }, { theme: { text: '#222' } }, '', out)
  const paths = out.map((c) => c.path).sort()
  assert.deepEqual(paths, ['theme.background', 'theme.text'])
  const bg = out.find((c) => c.path === 'theme.background')
  assert.ok(bg && typeof bg.local === 'undefined', '缺失一侧为 undefined（报告时显示 (缺失)）')
  assert.deepEqual(curatedThemeNames({ themes: {}, localCuration: { themes: { a: true, b: { localCurated: true }, c: false } } }), ['a', 'b'])
  assert.deepEqual(curatedThemeNames(null), [])
  const missing = formatDriftReport([{ name: 'x', kind: 'unparseable', curated: false, changes: [], detail: 'boom' }]).join('\n')
  assert.ok(missing.includes('本地 JSON 解析失败') && missing.includes('boom'))
  assert.ok(formatDriftReport([{ name: 'x', kind: 'missing', curated: false, changes: [] }]).join('\n').includes('(缺失)') === false)
})

test('NOTICES 更新只换首行，手工维护段原样保留', async () => {
  const good = themeData()
  const { dir, manifestPath } = await setupDir({ names: ['t1'], contents: { t1: good }, baselineRev: 'c'.repeat(40) })
  const tail = '手工段第一行\n\n手工段第二行（字体/2.0 说明）'
  await writeFile(join(dir, 'THIRD_PARTY_NOTICES.md'), '旧首行（tag 版）\n' + tail)
  const fetchText = async (): Promise<string> => prettyOf(good)
  await syncThemes({ themesDir: dir, manifestPath, themeNames: ['t1'], scriptSha: 'c'.repeat(40), updateBaseline: true, fetchText })
  const out = await readFile(join(dir, 'THIRD_PARTY_NOTICES.md'), 'utf8')
  assert.ok(out.startsWith('opencode 主题资产源自 opencode (MIT) 仓库 packages/tui/src/theme/assets/，commit '), '首行应为新 pin')
  assert.ok(out.includes('不跟随 tag 移动'), '首行应注明不跟随 tag')
  assert.ok(out.endsWith(tail), '手工尾部须原样保留')
  await rm(dir, { recursive: true, force: true })
})

test('validateStructure 与旧脚本同门：缺 defs/theme/色位即错', () => {
  assert.throws(() => validateStructure('x', null), /非对象/)
  assert.throws(() => validateStructure('x', { theme: {} }), /缺 defs/)
  assert.throws(() => validateStructure('x', { defs: {}, theme: { background: '#000' } }), /缺必填色位/)
  assert.equal(validateStructure('x', themeData()), true)
})

void mkdir
