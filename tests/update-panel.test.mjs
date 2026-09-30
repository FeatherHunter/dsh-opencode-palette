/**
 * tests/update-panel.test.mjs — 检查更新 + 日志骨架的接线门禁
 *
 * 三块断言，缺一块都算没接好：
 *   一、面板状态机（桩宿主）：打开静默读、点检查才联网、有新版才弹窗、八种装不了原因、安装中轮询、待重启；
 *   二、接线一致性：通道常量单一真源、电话名从更新包派生（产物里不出现写死的电话名字面量）、轮询间隔来自包；
 *   三、宿主半真机式冒烟：假 connection 装配 runtime/host.mjs → 路由注册对 → 电话分派能落到更新包与日志包，
 *      且日志真的落到 <DSH_HOME>/logs 下；vendor 副本与 npm 包逐字节一致；事件清单过三个检查器。
 *
 * 读产物、不读源码断言：这几条都是「发出去的东西对不对」。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

const { createUpdateController, readSnapshot, buttonState, blockedReasonKey } = await import(
  pathToFileURL(join(ROOT, 'runtime', 'update-panel.mjs')).href
)
const { buildClientPhoneNames, CLIENT_POLL } = await import(
  pathToFileURL(join(ROOT, 'node_modules', 'dsh-plugin-update', 'dist', 'client.js')).href
)

const PHONES = buildClientPhoneNames('palette')

/** 造一个宿主回包（形状照更新包 README 第 5 / 8 / 10 节）。 */
function reply(snapshot, extra) {
  return Object.assign({ ok: true, snapshot: snapshot, manual: null, receipt: extra && extra.receipt ? extra.receipt : null }, extra || {})
}
const snapshotOf = (over) => Object.assign({
  runningVersion: '1.7.2',
  installedVersion: '1.7.2',
  latestVersion: '1.7.1',
  canInstall: false,
  blockedReason: null,
  job: null,
}, over || {})

/** 桩宿主：按电话名回预设结果，并记录调用顺序。 */
function stubHost(answers) {
  const calls = []
  return {
    calls,
    call: async (phone, args) => {
      calls.push({ phone, args })
      const answer = answers[phone]
      if (typeof answer === 'function') return answer(args)
      if (answer === undefined) throw new Error('unexpected phone: ' + phone)
      return answer
    },
  }
}

// ───────────────────────── 一、面板状态机 ─────────────────────────

test('状态机：打开面板只静默读一次本地状态，不联网', async () => {
  const host = stubHost({ [PHONES.updateStatus]: reply(snapshotOf()) })
  const panel = createUpdateController({ call: host.call, phones: PHONES, pollMs: 1000 })
  await panel.readStatus()
  assert.equal(host.calls.length, 1)
  assert.equal(host.calls[0].phone, PHONES.updateStatus, '只该调查状态这条电话')
  assert.equal(panel.getState().checking, false)
  assert.equal(panel.getState().dialogOpen, false)
})

test('状态机：无新版时不开弹窗、按钮回 idle', async () => {
  const host = stubHost({
    [PHONES.updateStatus]: reply(snapshotOf()),
    [PHONES.updateCheck]: reply(snapshotOf({ latestVersion: '1.7.2' }), { receipt: null }),
  })
  const panel = createUpdateController({ call: host.call, phones: PHONES, pollMs: 1000 })
  const outcome = await panel.check()
  assert.equal(outcome, 'latest')
  assert.equal(panel.getState().dialogOpen, false, '无新版不该弹窗')
  assert.equal(buttonState(panel.getState()), 'idle')
})

test('状态机：有新版才弹窗，且按钮进入 hasNew', async () => {
  const host = stubHost({
    [PHONES.updateCheck]: reply(
      snapshotOf({ latestVersion: '1.8.0', canInstall: true }),
      { receipt: { checkId: 'chk-1' } }
    ),
  })
  const panel = createUpdateController({ call: host.call, phones: PHONES, pollMs: 1000 })
  const outcome = await panel.check()
  assert.equal(outcome, 'new')
  const state = panel.getState()
  assert.equal(state.dialogOpen, true)
  assert.equal(state.checkId, 'chk-1')
  assert.equal(state.latest, '1.8.0')
  assert.equal(buttonState(state), 'hasNew')
})

test('状态机：已查到有新版时再点按钮不重复联网，直接开弹窗', async () => {
  const host = stubHost({
    [PHONES.updateCheck]: reply(snapshotOf({ latestVersion: '1.8.0', canInstall: true }), { receipt: { checkId: 'chk-2' } }),
  })
  const panel = createUpdateController({ call: host.call, phones: PHONES, pollMs: 1000 })
  await panel.check()
  panel.closeDialog()
  await panel.check()
  assert.equal(host.calls.length, 1, '第二次点击应复用已有凭证，不再联网')
  assert.equal(panel.getState().dialogOpen, true)
})

test('状态机：八种装不了原因逐个映射到人话词条，且都不给安装按钮', async () => {
  const codes = [
    'unknown-profile', 'source-install', 'invalid-installation', 'installation-changed',
    'pending-restart', 'registry-conflict', 'incompatible-node', 'recovery-required',
  ]
  for (const code of codes) {
    assert.equal(blockedReasonKey(code), 'blocked.' + code)
    const host = stubHost({ [PHONES.updateStatus]: reply(snapshotOf({ blockedReason: code })) })
    const panel = createUpdateController({ call: host.call, phones: PHONES, pollMs: 1000 })
    await panel.readStatus()
    const state = panel.getState()
    assert.equal(state.blocked, code)
    assert.equal(state.canInstall, false, code + ' 时不允许安装')
    assert.equal(state.pending, code === 'pending-restart')
    assert.equal(buttonState(state), code === 'pending-restart' ? 'pending' : 'idle')
  }
})

test('状态机：安装中按轮询间隔刷新，装成功关弹窗', async () => {
  let installs = 0
  const timers = []
  const host = stubHost({
    [PHONES.updateStatus]: () => {
      installs += 1
      // 第一次查：任务正在装；之后的查：装好了，磁盘是新版
      return reply(installs === 1
        ? snapshotOf({ latestVersion: '1.8.0', canInstall: true, job: { state: 'installing', message: null } })
        : snapshotOf({ latestVersion: '1.8.0', installedVersion: '1.8.0', runningVersion: '1.7.2', blockedReason: 'pending-restart', job: { state: 'restart-required', message: null } }))
    },
    [PHONES.updateCheck]: reply(snapshotOf({ latestVersion: '1.8.0', canInstall: true }), { receipt: { checkId: 'chk-3' } }),
    [PHONES.updateInstall]: reply(snapshotOf({ latestVersion: '1.8.0', installedVersion: '1.8.0', blockedReason: 'pending-restart', job: { state: 'restart-required', message: null } })),
  })
  const panel = createUpdateController({
    call: host.call,
    phones: PHONES,
    pollMs: 250,
    setTimer: (fn, ms) => { timers.push(ms); return { id: timers.length } },
    clearTimer: () => {},
  })
  await panel.readStatus() // 任务安装中 → 该起轮询
  assert.deepEqual(timers, [250], '安装中应起一次轮询，间隔取自配置')
  await panel.check()
  const ok = await panel.install()
  assert.equal(ok, true)
  assert.equal(panel.getState().dialogOpen, false, '装成功要关弹窗')
  assert.equal(panel.getState().pending, true, '装上但没重启 → 待重启')
  assert.equal(buttonState(panel.getState()), 'pending')
})

test('状态机：安装失败给失败态、不吞异常', async () => {
  const host = stubHost({
    [PHONES.updateStatus]: reply(snapshotOf({ latestVersion: '1.8.0', canInstall: true })),
    [PHONES.updateCheck]: reply(snapshotOf({ latestVersion: '1.8.0', canInstall: true }), { receipt: { checkId: 'chk-fail' } }),
    [PHONES.updateInstall]: { ok: false, error: 'install-failed', errorKind: 'install-failed' },
  })
  const panel = createUpdateController({ call: host.call, phones: PHONES, pollMs: 1000 })
  await panel.check()
  const ok = await panel.install()
  assert.equal(ok, false)
  assert.equal(panel.getState().failure, 'install-failed')
})

test('状态机：没有检查凭证时不提交安装（先查再装）', async () => {
  const host = stubHost({ [PHONES.updateStatus]: reply(snapshotOf({ latestVersion: '1.8.0', canInstall: true })) })
  const panel = createUpdateController({ call: host.call, phones: PHONES, pollMs: 1000 })
  await panel.readStatus()
  assert.equal(await panel.install(), false)
  assert.equal(host.calls.filter((c) => c.phone === PHONES.updateInstall).length, 0, '没凭证不该打安装电话')
})

test('状态机：宿主不可用时整块降级，调用不抛错', async () => {
  const panel = createUpdateController({ call: null, phones: PHONES, pollMs: 1000 })
  assert.equal(panel.getState().available, false)
  assert.equal(await panel.readStatus(), null)
  assert.equal(await panel.check(), 'failed')
  assert.equal(await panel.checkSilently(), 'failed')
  assert.equal(await panel.autoCheckOnOpen(), null)
  assert.equal(await panel.install(), false)
})

test('状态机（#41）：静默检查有新版只变按钮、不自动弹窗', async () => {
  const host = stubHost({
    [PHONES.updateCheck]: reply(
      snapshotOf({ latestVersion: '1.8.0', canInstall: true }),
      { receipt: { checkId: 'chk-silent' } }
    ),
  })
  const panel = createUpdateController({ call: host.call, phones: PHONES, pollMs: 1000 })
  const outcome = await panel.checkSilently()
  assert.equal(outcome, 'new')
  const state = panel.getState()
  assert.equal(state.dialogOpen, false, '静默检查不得自动弹窗')
  assert.equal(state.hasNew, true)
  assert.equal(buttonState(state), 'hasNew')
})

test('状态机（#41）：静默检查失败静默、无新版不弹窗', async () => {
  const failHost = stubHost({ [PHONES.updateCheck]: { ok: false, error: 'net-fail' } })
  const failPanel = createUpdateController({ call: failHost.call, phones: PHONES, pollMs: 1000 })
  assert.equal(await failPanel.checkSilently(), 'failed')
  assert.equal(failPanel.getState().dialogOpen, false)
  assert.equal(buttonState(failPanel.getState()), 'idle')

  const latestHost = stubHost({
    [PHONES.updateStatus]: reply(snapshotOf()),
    [PHONES.updateCheck]: reply(snapshotOf({ latestVersion: '1.7.2' })),
  })
  const panel2 = createUpdateController({ call: latestHost.call, phones: PHONES, pollMs: 1000 })
  const outcome2 = await panel2.autoCheckOnOpen()
  assert.equal(outcome2, 'latest')
  assert.equal(panel2.getState().dialogOpen, false)
})

test('状态机（#41）：autoCheckOnOpen 先本地读再联网，待重启时跳过联网', async () => {
  const host = stubHost({
    [PHONES.updateStatus]: reply(snapshotOf({ latestVersion: '1.8.0', installedVersion: '1.8.0', runningVersion: '1.7.2', blockedReason: 'pending-restart' })),
    [PHONES.updateCheck]: reply(snapshotOf({ latestVersion: '1.8.0', canInstall: true }), { receipt: { checkId: 'chk-nope' } }),
  })
  const panel = createUpdateController({ call: host.call, phones: PHONES, pollMs: 1000 })
  const outcome = await panel.autoCheckOnOpen()
  assert.equal(outcome, null, '待重启时应跳过联网')
  assert.equal(host.calls.filter((c) => c.phone === PHONES.updateCheck).length, 0, '待重启不得调联网电话')
  assert.equal(panel.getState().pending, true)
  assert.equal(buttonState(panel.getState()), 'pending')
})

test('纯函数（#41）：按钮优先级 正在升级 > 待重启 > 有新版本 > 检查中 > 空闲', () => {
  assert.equal(buttonState({ installing: true, pending: true, hasNew: true, checking: true }), 'installing')
  assert.equal(buttonState({ installing: false, pending: true, hasNew: true, checking: true }), 'pending')
  assert.equal(buttonState({ installing: false, pending: false, hasNew: true, checking: true }), 'hasNew')
  assert.equal(buttonState({ installing: false, pending: false, hasNew: false, checking: true }), 'checking')
  assert.equal(buttonState({ installing: false, pending: false, hasNew: false, checking: false }), 'idle')
})

test('状态机：传输异常只记失败散列，不改状态机可用性', async () => {
  const records = []
  const panel = createUpdateController({
    call: async () => { throw new Error('socket closed') },
    phones: PHONES,
    pollMs: 1000,
    log: (level, event, fields) => records.push({ level, event, fields }),
  })
  const outcome = await panel.check()
  assert.equal(outcome, 'failed')
  assert.equal(panel.getState().checking, false)
  const failLine = records.filter((r) => r.event === 'host.call.fail')
  assert.equal(failLine.length, 1)
  assert.match(failLine[0].fields.errorHash, /^[0-9a-f]{8}$/, '失败只记 8 位散列')
  assert.equal(failLine[0].fields.pluginId, 'dsh-opencode-palette')
})

test('纯函数：readSnapshot 只认宿主当场算出的 pending-restart', () => {
  assert.equal(readSnapshot(reply(snapshotOf({ blockedReason: 'pending-restart' }))).pending, true)
  assert.equal(readSnapshot(reply(snapshotOf({ installedVersion: '1.8.0', runningVersion: '1.7.2' }))).pending, false,
    '不自己比较版本号：原因码没写 pending-restart 就不算待重启')
  assert.equal(readSnapshot(null).canInstall, false)
})

// ───────────────────────── 一·补 2.0.7：可见结果与关键节点日志 ─────────────────────────

test('2.0.7 可见结果：手动查更新失败时给出弹窗外的可见提示（不再是点了没反应）', async () => {
  const records = []
  // 更新包的失败形状：error 是字符串码，不是对象
  const host = stubHost({ [PHONES.updateCheck]: { ok: false, error: 'invalid-release', errorKind: 'invalid-release' } })
  const panel = createUpdateController({
    call: host.call, phones: PHONES, pollMs: 1000,
    log: (level, event, fields) => records.push({ level, event, fields }),
  })
  assert.equal(await panel.check(), 'failed')
  assert.equal(panel.getState().dialogOpen, false, '失败不弹窗')
  assert.deepEqual(panel.getState().notice, { key: 'updateCheckFail', kind: 'error' }, '失败必须留下可见提示')
  const fail = records.filter((r) => r.event === 'update.check.fail')
  assert.equal(fail.length, 1)
  assert.equal(fail[0].fields.code, 'invalid-release', '码要原样记，别记成 unknown')
  assert.equal(fail[0].fields.trigger, 'manual')
  assert.equal(fail[0].fields.errorHash, '5792c4da', '散列与真机日志同源（djb2 前 8 位）')
  const ok = records.filter((r) => r.event === 'update.check.ok')
  assert.equal(ok.length, 0, '失败不该记成功节点')
})

test('2.0.7 可见结果：自动检查失败保持静默（不打扰），但仍记关键节点', async () => {
  const records = []
  const host = stubHost({
    [PHONES.updateStatus]: reply(snapshotOf()),
    [PHONES.updateCheck]: { ok: false, error: 'check-failed', errorKind: 'check-failed' },
  })
  const panel = createUpdateController({
    call: host.call, phones: PHONES, pollMs: 1000,
    log: (level, event, fields) => records.push({ level, event, fields }),
  })
  await panel.readStatus()
  assert.equal(await panel.checkSilently(), 'failed')
  assert.equal(panel.getState().notice, null, '自动检查失败静默：不弹窗、不留提示')
  const fail = records.filter((r) => r.event === 'update.check.fail')
  assert.equal(fail.length, 1)
  assert.equal(fail[0].fields.trigger, 'auto')
  assert.equal(fail[0].fields.code, 'check-failed')
})

test('2.0.7 可见结果：升级失败留提示，成功但没进待重启也留提示', async () => {
  const records = []
  const failed = createUpdateController({
    call: stubHost({ [PHONES.updateInstall]: { ok: false, error: 'install-failed', errorKind: 'install-failed' } }).call,
    phones: PHONES, pollMs: 1000,
    log: (level, event, fields) => records.push({ level, event, fields }),
  })
  failed.openDialog()
  // 没有凭证时 install 直接返回 false，不该记节点
  assert.equal(await failed.install(), false)
  assert.equal(records.filter((r) => r.event === 'update.install.start').length, 0, '没凭证不该走到安装')

  const host = stubHost({
    [PHONES.updateCheck]: reply(snapshotOf({ latestVersion: '1.8.0', canInstall: true }), { receipt: { checkId: 'ck-1' } }),
    [PHONES.updateStatus]: reply(snapshotOf({ latestVersion: '1.8.0', installedVersion: '1.8.0' })),
    [PHONES.updateInstall]: { ok: false, error: 'install-failed', errorKind: 'install-failed' },
  })
  const panel = createUpdateController({
    call: host.call, phones: PHONES, pollMs: 1000,
    log: (level, event, fields) => records.push({ level, event, fields }),
  })
  await panel.check()
  assert.equal(await panel.install(), false)
  assert.deepEqual(panel.getState().notice, { key: 'updateFailInstall', kind: 'error' })
  assert.equal(records.filter((r) => r.event === 'update.install.start').length, 1)
  const installFail = records.filter((r) => r.event === 'update.install.fail')
  assert.equal(installFail.length, 1)
  assert.equal(installFail[0].fields.code, 'install-failed')
})

test('2.0.7 可见结果：升级成功但没进待重启时，用兜底提示替掉「没动静」', async () => {
  const records = []
  const host = stubHost({
    [PHONES.updateCheck]: reply(snapshotOf({ latestVersion: '1.8.0', canInstall: true }), { receipt: { checkId: 'ck-1' } }),
    // 装完仍是旧版在跑、且宿主没判 pending-restart（异常路径）：面板必须自己说句话
    [PHONES.updateInstall]: reply(snapshotOf({ latestVersion: '1.8.0', installedVersion: '1.8.0', blockedReason: null })),
  })
  const panel = createUpdateController({
    call: host.call, phones: PHONES, pollMs: 1000,
    log: (level, event, fields) => records.push({ level, event, fields }),
  })
  await panel.check()
  assert.equal(await panel.install(), true)
  assert.deepEqual(panel.getState().notice, { key: 'updateRestartHint', kind: 'warn' })
  const ok = records.filter((r) => r.event === 'update.install.ok')
  assert.equal(ok.length, 1)
  assert.equal(ok[0].fields.pending, false)
})

test('2.0.7 接线：探针阈值与更新包 service.js 的同名常量逐字一致（防两处走偏）', async () => {
  const hostModule = await import(pathToFileURL(join(ROOT, 'runtime', 'host.mjs')).href)
  const vendored = read('runtime/vendor/dsh-plugin-update/service.js')
  assert.ok(vendored.includes('const MAX_METADATA_BYTES = 256 * 1024;'), '更新包的体积上限变了：探针要跟着改')
  assert.ok(vendored.includes('const INTEGRITY_PATTERN = "^sha512-[A-Za-z0-9+/]{86}==$";'), '更新包的完整性正则变了：探针要跟着改')
  assert.equal(hostModule.PROBE_LIMITS.maxBytes, 256 * 1024)
  assert.equal(hostModule.PROBE_LIMITS.integrityPattern, '^sha512-[A-Za-z0-9+/]{86}==$')
})

test('2.0.7 探针：把 invalid-release 的真实原因还原成可读事实', async () => {
  const hostModule = await import(pathToFileURL(join(ROOT, 'runtime', 'host.mjs')).href)
  const manifest = {
    name: 'dsh-opencode-palette',
    version: '2.0.7',
    engines: { dsh: '>=0.2.0-rc.1' },
    dist: {
      tarball: 'https://registry.npmjs.org/dsh-opencode-palette/-/dsh-opencode-palette-2.0.7.tgz',
      integrity: 'sha512-' + 'A'.repeat(86) + '==',
    },
  }
  const fakeFetch = (body, init) => async () => ({
    ok: true, status: 200,
    headers: { get: () => null },
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    ...(init || {}),
  })

  const good = await hostModule.probeRelease(fakeFetch(manifest), {})
  assert.equal(good.reason, 'valid', '合规清单应判 valid')
  assert.equal(good.stage, 'ok')
  assert.ok(good.bytes > 0)

  const truncated = await hostModule.probeRelease(fakeFetch('{"name":"dsh-opencode-palette","vers'), {})
  assert.equal(truncated.reason, 'json-parse', '被截断的响应要认出来（这正是 invalid-release 的兜底来源）')
  assert.equal(truncated.stage, 'json')

  const mirrored = await hostModule.probeRelease(fakeFetch(Object.assign({}, manifest, {
    dist: { tarball: 'https://registry.npmmirror.com/dsh-opencode-palette/-/dsh-opencode-palette-2.0.7.tgz', integrity: manifest.dist.integrity },
  })), {})
  assert.equal(mirrored.reason, 'tarball-origin', '换了源的 tarball 要认出是源不符')
  assert.equal(mirrored.detail, 'https://registry.npmmirror.com')

  const noIntegrity = await hostModule.probeRelease(fakeFetch(Object.assign({}, manifest, {
    dist: { tarball: manifest.dist.tarball },
  })), {})
  assert.equal(noIntegrity.reason, 'integrity-missing')

  const dead = await hostModule.probeRelease(async () => { throw new Error('getaddrinfo ENOTFOUND registry.npmjs.org') }, {})
  assert.equal(dead.reason, 'fetch-threw', '取不到网络也要给一句人话')
  assert.match(dead.detail, /ENOTFOUND/)

  const notOk = await hostModule.probeRelease(fakeFetch(manifest, { ok: false, status: 503 }), {})
  assert.equal(notOk.reason, 'not-ok')
  assert.equal(notOk.httpStatus, 503)
})

test('2.0.7 重试：查更新失败自动重试一次，第二次成功就不再打扰用户', async () => {
  const hostModule = await import(pathToFileURL(join(ROOT, 'runtime', 'host.mjs')).href)
  const records = []
  let tries = 0
  const handler = async () => {
    tries += 1
    if (tries === 1) return { ok: false, error: 'invalid-release', errorKind: 'invalid-release' }
    return { ok: true, snapshot: { runningVersion: '2.0.6', canInstall: true, latestVersion: '2.0.7' } }
  }
  const wrapped = hostModule.wrapUpdateCheck(handler, {
    log: (level, event, fields) => records.push({ level, event, fields }),
    pluginId: 'dsh-opencode-palette',
  })
  const out = await wrapped({})
  assert.equal(tries, 2, '必须重试一次')
  assert.equal(out.ok, true, '第二次成功就回成功，用户不该看到失败')
  const retry = records.filter((r) => r.event === 'update.check.retry')
  assert.equal(retry.length, 2)
  assert.deepEqual(retry.map((r) => r.fields.ok), [false, true])
  assert.equal(retry[0].fields.reason, 'invalid-release', '码要原样带出，别写成 unknown')
  assert.equal(records.filter((r) => r.event === 'update.check.probe').length, 0, '救回来了就不必跑探针')
})

test('2.0.7 重试：两次都失败才跑探针，并把现象落成日志', async () => {
  const hostModule = await import(pathToFileURL(join(ROOT, 'runtime', 'host.mjs')).href)
  const records = []
  const wrapped = hostModule.wrapUpdateCheck(async () => ({ ok: false, error: 'invalid-release', errorKind: 'invalid-release' }), {
    log: (level, event, fields) => records.push({ level, event, fields }),
    probe: async () => ({ stage: 'json', httpStatus: 200, bytes: 40, reason: 'json-parse', detail: '{"name":"dsh-open' }),
    pluginId: 'dsh-opencode-palette',
  })
  const out = await wrapped({})
  assert.equal(out.ok, false, '两次都失败照原样回失败')
  const probe = records.filter((r) => r.event === 'update.check.probe')
  assert.equal(probe.length, 1)
  assert.equal(probe[0].fields.reason, 'json-parse')
  assert.equal(probe[0].fields.httpStatus, 200)
  assert.equal(probe[0].fields.stage, 'json')
})

test('2.0.7 重试：第一次就成功时不重试、不跑探针', async () => {
  const hostModule = await import(pathToFileURL(join(ROOT, 'runtime', 'host.mjs')).href)
  const records = []
  let tries = 0
  const wrapped = hostModule.wrapUpdateCheck(async () => { tries += 1; return { ok: true, snapshot: {} } }, {
    log: (level, event, fields) => records.push({ level, event, fields }),
    probe: async () => { throw new Error('不该跑探针') },
  })
  await wrapped({})
  assert.equal(tries, 1)
  assert.equal(records.length, 0, '顺利路径一条多余日志都不该记')
})

// ───────────────────────── 二、接线一致性 ─────────────────────────

test('接线：通道常量来自单一真源，两侧都引它', () => {
  const channel = read('runtime/channel.mjs')
  assert.match(channel, /export const CHANNEL = '\/api'/)
  assert.match(channel, /export const ENDPOINT = 'opencode-palette'/)
  assert.match(read('runtime/host.mjs'), /from '\.\/channel\.mjs'/, '宿主半必须引同一份常量')
  assert.match(read('runtime/client.mjs'), /from '\.\/channel\.mjs'/, '浏览器半必须引同一份常量')
  assert.match(read('package/lib/index.js'), /from '\.\/channel\.mjs'/, '发出去的宿主半也要引到它')
  assert.ok(existsSync(join(ROOT, 'package', 'lib', 'channel.mjs')), '随包发出 channel.mjs')
})

test('接线：电话名与轮询间隔从更新包派生，产物里不写死', () => {
  assert.deepEqual(Object.keys(PHONES).sort(), ['updateCheck', 'updateInstall', 'updateStatus'])
  assert.equal(PHONES.updateStatus, 'palette.updateStatus')
  assert.equal(CLIENT_POLL.defaultMs, 1000)
  assert.ok(CLIENT_POLL.defaultMs >= CLIENT_POLL.minMs)
  for (const rel of ['client.js', 'package/lib/client.js']) {
    const bundle = read(rel)
    assert.ok(bundle.indexOf("'palette.updateStatus'") < 0 && bundle.indexOf('"palette.updateStatus"') < 0,
      rel + ' 里不该出现写死的电话名字面量（应从包的客户端入口派生）')
    assert.ok(bundle.indexOf('buildClientPhoneNames') >= 0, rel + ' 里应有更新包的客户端入口')
    assert.ok(bundle.indexOf('createClientLog') >= 0, rel + ' 里应有日志包的客户端入口')
  }
})

test('接线：包版产物声明 connection 注入与 dsh-log 运行时依赖', () => {
  const pkg = JSON.parse(read('package/package.json'))
  assert.deepEqual(pkg.dependencies, { 'dsh-log': '0.2.1' })
  assert.deepEqual(pkg.files, ['lib', 'cordis.patch.yml'])
  const bundle = read('package/lib/client.js')
  assert.match(bundle, /exports\.inject = \["theme","slots","locale","connection"\]/, '包版要注入 connection')
})

test('接线：宿主半 vendor 副本与 npm 包逐字节一致（除头部注释）', () => {
  const distDir = join(ROOT, 'node_modules', 'dsh-plugin-update', 'dist')
  const names = readdirSync(distDir).filter((n) => n.endsWith('.js')).sort()
  assert.ok(names.length > 0)
  for (const targetDir of [join(ROOT, 'runtime', 'vendor', 'dsh-plugin-update'), join(ROOT, 'package', 'lib', 'vendor', 'dsh-plugin-update')]) {
    for (const name of names) {
      const original = readFileSync(join(distDir, name), 'utf8')
      const lines = readFileSync(join(targetDir, name), 'utf8').split('\n')
      // 来源标记行之后必须与 npm 包一字不差（头部行数改了也不会让这条门禁失效）
      const markerAt = lines.findIndex((line) => line.startsWith('// vendor-source: '))
      assert.ok(markerAt >= 0, name + ' 缺来源标记行（重新 npm run build）')
      assert.match(lines[markerAt], /^\/\/ vendor-source: dsh-plugin-update@\d+\.\d+\.\d+ dist\/.+\.js$/)
      assert.equal(lines.slice(markerAt + 1).join('\n'), original, name + ' 的 vendor 副本与 npm 包不一致（重新 npm run build）')
    }
  }
})

// ───────────────────────── 三、宿主半冒烟 ─────────────────────────

test('宿主半：装配出 8 条电话、注册精确路由、跑通日志落盘与更新查状态', async () => {
  const home = mkdtempSync(join(tmpdir(), 'palette-host-'))
  const previousHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    const hostModule = await import(pathToFileURL(join(ROOT, 'runtime', 'host.mjs')).href)
    assert.equal(hostModule.name, 'dsh-opencode-palette')
    assert.deepEqual(hostModule.inject, ['connection'])
    assert.equal(hostModule.runningVersion, JSON.parse(read('package.json')).version,
      '运行版本取自启动时加载的那份 package.json')

    let route = null
    const ctx = {
      get: (name) => (name === 'connection'
        ? { fetch: { register: (r) => { route = r; return () => {} } } }
        : undefined),
    }
    hostModule.apply(ctx)
    assert.ok(route, '必须注册通道路由')
    assert.equal(route.path, '/api/opencode-palette')
    assert.deepEqual(route.methods, ['POST'])

    const call = async (phone, payload) => {
      const request = new Request('http://127.0.0.1/api/opencode-palette', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'client-request', rpcId: 'rpc-1', payload: { method: phone, payload: payload === undefined ? null : payload } }),
      })
      const response = await route.fetch(request)
      return response.json()
    }

    // 日志电话：warn 级别恒落盘，不用等开关
    const logReply = await call('palette.logBatch', { entries: [{ ts: Date.now(), level: 'warn', event: 'host.call.fail', fields: { method: 'palette.updateCheck', kind: 'gate', errorHash: 'deadbeef' } }] })
    assert.equal(logReply.type, 'server-response')
    assert.equal(logReply.result.ok, true)

    // 更新电话：查状态回六字段快照，运行版本就是本包版本（证明 runningVersion 覆盖生效、没抛 unknown-profile）
    const statusReply = await call('palette.updateStatus', {})
    assert.equal(statusReply.result.ok, true, '查状态必须回成功（unknown-profile 会在这里暴露）')
    const snapshot = statusReply.result.value.snapshot
    assert.equal(snapshot.runningVersion, hostModule.runningVersion)
    assert.equal(typeof snapshot.canInstall, 'boolean')
    assert.ok('blockedReason' in snapshot)
    assert.equal(statusReply.result.value.manual === null || typeof statusReply.result.value.manual === 'string', true)

    // 未知电话：明确报错，不静默
    const unknown = await call('palette.nope', {})
    assert.equal(unknown.result.ok, false)

    // 日志真的落盘（宿主是唯一落盘者；约 1 秒防抖）
    const logDir = join(home, 'logs', 'dsh-opencode-palette')
    let written = false
    for (let i = 0; i < 30 && !written; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      written = existsSync(logDir) && readdirSync(logDir).some((n) => n.endsWith('.log') && readFileSync(join(logDir, n), 'utf8').indexOf('host.call.fail') >= 0)
    }
    assert.equal(written, true, '日志必须落到 <DSH_HOME>/logs/dsh-opencode-palette/ 下的当天文件里')

    // 开关文件必须在装配时就落盘（2026-09-19 修）：否则 dsh-log 的 loadSwitch() 把
    // 「文件不存在」当读取失败，首次运行的每次读开关都记一条 log.persist.fail/readBack 误报
    // ——真机两天日志里除它之外什么都没有，等于日志系统没真正跑起来。
    const switchFile = join(home, 'logs', 'log-switch-dsh-opencode-palette.json')
    assert.equal(existsSync(switchFile), true, '装配后开关文件必须已落盘（缺省值物化）')
    assert.deepEqual(JSON.parse(readFileSync(switchFile, 'utf8')), { enabled: false, sampleRate: 1 },
      '缺省态应为 { enabled: false, sampleRate: 1 }')

    // 读开关不得再产生 readBack 误报
    const switchRead = await call('palette.logGetSwitch', {})
    assert.equal(switchRead.result.ok, true, '读开关必须回成功')
    await call('palette.logBatch', { entries: [{ ts: Date.now(), level: 'warn', event: 'host.channel.fail', fields: { stage: 's', path: '/api/opencode-palette', reason: 'r' } }] })
    const logText = () => readdirSync(logDir)
      .filter((n) => n.endsWith('.log'))
      .map((n) => readFileSync(join(logDir, n), 'utf8'))
      .join('\n')
    let logNow = ''
    for (let i = 0; i < 30 && logNow.indexOf('host.channel.fail') < 0; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      logNow = logText()
    }
    assert.equal(logNow.includes('log.persist.fail'), false,
      '开关文件已物化后，不得再出现 log.persist.fail（readBack 误报）')

    // 开关往返：写进去能读回来，且文件里是真的
    const setReply = await call('palette.logSetSwitch', { enabled: true, sampleRate: 0.5 })
    assert.equal(setReply.result.ok, true, '设置开关必须回成功')
    const state = setReply.result.value.switch || setReply.result.value
    assert.equal(state.enabled, true, '设置后读回的开关应为 true')
    assert.equal(JSON.parse(readFileSync(switchFile, 'utf8')).enabled, true, '开关必须落到磁盘文件里')

    // 2.0.7：开关打开后，info 级的关键节点才落盘 —— 面板那个小开关就是为它存在的
    // （warn/error 不受开关控制，这也是 2.0.7 之前真机上只剩失败散列的原因）
    await call('palette.logSetSwitch', { enabled: true, sampleRate: 1 })
    await call('palette.logBatch', {
      entries: [{
        ts: Date.now(), level: 'info', event: 'update.check.ok',
        fields: { trigger: 'manual', hasNew: true, latest: '2.0.7', latencyMs: 12, pluginId: 'dsh-opencode-palette' },
      }],
    })
    let infoWritten = false
    for (let i = 0; i < 30 && !infoWritten; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      infoWritten = logText().indexOf('update.check.ok') >= 0
    }
    assert.equal(infoWritten, true, '开关打开后 info 级关键节点必须落盘')
  } finally {
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    rmSync(home, { recursive: true, force: true })
  }
})

// ───────────────────────── 四、面板渲染（真 React，SSR） ─────────────────────────
// 与 tests/panel-render.test.mjs 同款做法：eval 包版产物 → 用真 React renderToString 抓 DOM。
// 这里只断言「检查更新」这一块（按钮四态 / 升级弹窗 / 待重启横幅 / 宿主不可用时整块消失）。

const { React, ReactDOMServer } = await (async () => {
  const require = (await import('node:module')).createRequire(import.meta.url)
  try {
    return { React: require('react'), ReactDOMServer: require('react-dom/server') }
  } catch (e) {
    throw new Error('缺 react / react-dom（面板渲染断言前置）——先在仓库根 npm install')
  }
})()

/** 渲染面板：connection 传 null 表示宿主不可用。 */
function renderPanel(opts = {}) {
  const code = read('package/lib/client.js')
  const loaded = []
  global.window = {
    __ModuleLoader__: {
      load(entry) {
        loaded.push({ id: entry.id, exports: entry.factory((id) => { if (id === 'react') return React; throw new Error('unexpected require: ' + id) }) })
      },
    },
  }
  global.document = {
    head: { appendChild: () => {} },
    body: { hasAttribute: () => true, appendChild: (el) => { el.parentNode = global.document.body }, removeChild: () => {} },
    createElement: () => ({ dataset: {}, parentNode: null, textContent: '', style: { cssText: '', fontFamily: '' }, getBoundingClientRect: () => ({ width: 8 }) }),
    documentElement: { lang: opts.lang || 'zh' },
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  global.localStorage = undefined
  eval(code)
  const exportsFace = loaded[0].exports
  let panelCmp = null
  let panelProps = null
  const slots = {
    inject: (slot, cb) => { cb(); return () => {} },
    register: (desc, cmp) => { panelCmp = cmp; panelProps = desc.inject(); return () => {} },
  }
  const ctx = {
    get: (k) => {
      if (k === 'theme') return { overrideTokens: () => () => {} }
      if (k === 'slots') return slots
      if (k === 'connection') return opts.connection || undefined
      return undefined
    },
    effect: (fn) => { fn() },
  }
  exportsFace.apply(ctx)
  assert.ok(panelCmp, '面板组件未注册')
  const render = () => ReactDOMServer.renderToString(React.createElement(panelCmp, panelProps))
  return { render, controller: panelProps.update, html: render() }
}

/** 假 connection：rpc.call 按电话名回预设结果。 */
function fakeConnection(answers) {
  return {
    rpc: {
      call: async (channel, endpoint, message) => {
        assert.equal(channel, '/api')
        assert.equal(endpoint, 'opencode-palette')
        const answer = answers[message.method]
        if (answer === undefined) return { ok: false, error: { message: 'unknown phone: ' + message.method } }
        return { ok: true, value: answer }
      },
    },
  }
}

test('渲染：宿主可用时头行出现「检查更新」按钮（中英各一份文案）', () => {
  const zh = renderPanel({ connection: fakeConnection({ [PHONES.updateStatus]: reply(snapshotOf()) }) })
  assert.ok(zh.html.includes('检查更新'), '中文界面缺检查更新按钮')
  assert.ok(zh.controller.getState().available, '宿主可用时控制器应可用')

  const en = renderPanel({ lang: 'en', connection: fakeConnection({ [PHONES.updateStatus]: reply(snapshotOf()) }) })
  assert.ok(en.html.includes('Check for updates'), '英文界面缺 Check for updates')
})

test('渲染：宿主不可用时不渲染按钮（主题面板本身照常）', () => {
  const { html, controller } = renderPanel({ connection: null })
  assert.equal(controller.getState().available, false)
  assert.ok(!html.includes('检查更新'), '无宿主时不该出现按钮')
  assert.ok(html.includes('opencode调色板'), '主题面板本身不受影响')
})

test('渲染：有新版 → 按钮变红字「有新版本」并弹出升级弹窗（含手工命令与复制）', async () => {
  const panel = renderPanel({
    connection: fakeConnection({
      [PHONES.updateCheck]: reply(snapshotOf({ latestVersion: '1.8.0', canInstall: true }), {
        receipt: { checkId: 'chk-ui' },
        manual: 'dsh plugin --profile web add --save-exact dsh-opencode-palette@1.8.0 --registry=https://registry.npmjs.org/',
      }),
    }),
  })
  await panel.controller.check()
  const html = panel.render()
  assert.ok(html.includes('有新版本'), '按钮应变为红字“有新版本”')
  assert.ok(html.includes('发现新版本 v1.8.0'), '缺弹窗标题')
  assert.ok(html.includes('当前版本 v1.7.2 → 最新版本 v1.8.0'), '缺版本对照')
  assert.ok(html.includes('立即升级') && html.includes('稍后'), '缺动作按钮')
  assert.ok(html.includes('dsh plugin --profile web add --save-exact'), '缺手工兜底命令')
  assert.ok(html.includes('复制'), '缺复制按钮')
})

test('渲染：待重启 → 常驻横幅显眼出现，且不再给安装按钮', async () => {
  const panel = renderPanel({
    connection: fakeConnection({
      [PHONES.updateStatus]: reply(snapshotOf({ latestVersion: '1.8.0', installedVersion: '1.8.0', runningVersion: '1.7.2', blockedReason: 'pending-restart' })),
    }),
  })
  await panel.controller.readStatus()
  const html = panel.render()
  assert.ok(html.includes('新版 v1.8.0 已装好，重启 DSH 后生效'), '缺待重启横幅')
  assert.ok(html.includes('待重启'), '按钮应进入待重启态')
  assert.ok(!html.includes('立即升级'), '待重启期间不给安装按钮')
})


// ───────────────────────── 五、事件清单 ─────────────────────────

test('事件清单：形状与计数过检查器，且覆盖运行期真会发出的每个事件', async () => {
  const { parseEventListManifest, checkEventCounts, checkEventFields } = await import('dsh-log/host')
  const manifest = parseEventListManifest(JSON.parse(read('runtime/event-list.json')))
  assert.equal(manifest.pluginId, 'dsh-opencode-palette')
  assert.equal(checkEventCounts(manifest).ok, true, '三类自报计数必须与实际条数逐项一致')
  for (const [name, entry] of Object.entries(manifest.events)) {
    const check = checkEventFields(manifest, name, entry.fields)
    assert.equal(check.ok, true, name + ' 的字段白名单检查不过：' + JSON.stringify(check))
  }
  // 运行期会发的事件名（宿主侧来自更新包与日志包，浏览器侧来自面板）
  const emitted = [
    'host.call', 'host.call.fail', 'update.install.exec', 'log.forward.summary', 'log.switch.watchdog', 'log.export.fail', 'host.channel.fail',
    // 2.0.7：更新链路的关键节点（失败级别恒落盘，info 靠面板的日志开关）
    'update.check.start', 'update.check.ok', 'update.check.fail', 'update.check.retry', 'update.check.probe',
    'update.install.start', 'update.install.ok', 'update.install.fail', 'log.switch.set',
  ]
  for (const name of emitted) {
    assert.ok(manifest.events[name], '事件清单缺 ' + name)
  }
  // 清单与随包副本一致（发出去的清单就是这份）
  assert.deepEqual(JSON.parse(read('package/lib/event-list.json')), JSON.parse(read('runtime/event-list.json')))
})
