/**
 * tests/update-panel.test.mjs — 检查更新（新包入口件）+ 日志骨架的接线门禁
 *
 * 最小集成后只测外部行为（产物与电话行为），不测实现细节：
 *   一、入口件行为（桩宿主＋替身容器）：文案唯一出处 entryLabelFor 五态、状态优先级、
 *      14 码中文映射与未来码兜底、挂载默认（button 进面静默查、无新版不弹窗由包内保证）；
 *   二、接线一致性：通道常量单一真源、产物里不写死电话名、入口件闭包内联、无 vendor、
 *      产物声明双写一致、宿主有几个电话注册几个；
 *   三、宿主半真机式冒烟：假 connection 装配 runtime/host.mjs → 路由注册对 → 电话分派能落到
 *      更新包与日志包，且日志真的落到 <DSH_HOME>/logs 下；更新包走真依赖；事件清单过检查器。
 *   四、面板渲染（真 React，SSR）：宿主可用时头行原位出现入口件挂载位、无自研残留；
 *      宿主不可用时更新块消失、主题面板照常。
 *   五、事件清单：形状与计数过检查器，且覆盖运行期真会发出的每个事件。
 *
 * 读产物、不读源码断言（除“有几个注册几个”一条接线门禁外）：这几条都是「发出去的东西对不对」。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync, mkdirSync, cpSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { runInThisContext } from 'node:vm'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

// 新包入口件与面板：文案与状态档的唯一出处（测试与接入方都读它，不各写一份）。
const { mountUpdateEntry, entryLabelFor, entryStateKind } = await import(
  pathToFileURL(join(ROOT, 'node_modules', 'dsh-plugin-update', 'dist', 'entry.js')).href
)
const { failureCopy, isKnownFailureCode } = await import(
  pathToFileURL(join(ROOT, 'node_modules', 'dsh-plugin-update', 'dist', 'panel.js')).href
)
const { buildPhoneNames } = await import(
  pathToFileURL(join(ROOT, 'node_modules', 'dsh-plugin-update', 'dist', 'config.js')).href
)
// 电话名派生（两侧共用同一套拼法；浏览器 bundle 内由入口件现算，不写字面量）。
const { buildClientPhoneNames } = await import(
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

/** 替身容器：只有 innerHTML（包内全走可选链，无 addEventListener 也可挂载与静默查）。 */
function stubContainer() {
  return { innerHTML: '' }
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

// ───────────────────────── 一、入口件行为 ─────────────────────────

test('入口件：状态优先级 活任务 > 待重启 > 失败 > 有新版 > 空闲', () => {
  const base = snapshotOf({ latestVersion: '1.8.0', canInstall: true })
  assert.equal(entryStateKind({ snapshot: Object.assign({}, base, { job: { state: 'installing' } }), error: 'check-failed' }), 'busy')
  assert.equal(entryStateKind({ snapshot: Object.assign({}, base, { blockedReason: 'pending-restart' }), error: null }), 'restart')
  assert.equal(entryStateKind({ snapshot: null, error: 'check-failed' }), 'failed')
  assert.equal(entryStateKind({ snapshot: base, error: null }), 'update')
  assert.equal(entryStateKind({ snapshot: snapshotOf({ latestVersion: '1.7.2' }), error: null }), 'idle')
  assert.equal(entryStateKind({ snapshot: snapshotOf({ job: { state: 'verifying' } }), error: null }), 'busy')
  assert.equal(entryStateKind({ snapshot: snapshotOf({ job: { state: 'restart-required' } }), error: null }), 'restart')
  assert.equal(entryStateKind({ snapshot: snapshotOf({ job: { state: 'failed' } }), error: null }), 'failed')
})

test('入口件：五态文案唯一出处（中文照包原文）', () => {
  assert.equal(entryLabelFor({ snapshot: snapshotOf({ latestVersion: '1.7.2' }), error: null }), '检查更新')
  assert.equal(entryLabelFor({ snapshot: snapshotOf({ latestVersion: '1.8.0', canInstall: true }), error: null }), '有新版 1.8.0')
  assert.equal(entryLabelFor({ snapshot: snapshotOf({ job: { state: 'installing' } }), error: null }), '正在安装…')
  assert.equal(entryLabelFor({ snapshot: snapshotOf({ blockedReason: 'pending-restart' }), error: null }), '待重启')
  assert.equal(entryLabelFor({ snapshot: null, error: 'check-failed' }), '更新失败，点此查看')
})

test('入口件：八种 blocked 都有中文 title＋action（用户该做什么）', () => {
  const codes = [
    'unknown-profile', 'source-install', 'invalid-installation', 'installation-changed',
    'pending-restart', 'registry-conflict', 'incompatible-node', 'recovery-required',
  ]
  for (const code of codes) {
    assert.equal(isKnownFailureCode(code), true, code + ' 应为已知码')
    const copy = failureCopy(code)
    assert.ok(copy && typeof copy.zh === 'string' && copy.zh.length > 0, code + ' 缺中文标题')
    const act = copy.act || copy.action
    assert.ok(typeof act === 'string' && act.length > 0, code + ' 缺行动指引')
  }
})

test('入口件：电话失败码与 internal 全中文，未来码兜底并带原码', () => {
  for (const code of ['check-failed', 'invalid-release', 'check-expired', 'update-busy', 'install-failed', 'internal']) {
    assert.equal(isKnownFailureCode(code), true, code + ' 应为已知码')
    assert.ok(failureCopy(code).zh.length > 0, code + ' 缺中文')
  }
  assert.equal(isKnownFailureCode('SOME-FUTURE-CODE'), false, '未来码不应被当成已知码')
  const fallback = failureCopy('SOME-FUTURE-CODE')
  assert.ok(fallback.zh.length > 0, '未来码要有兜底中文')
  assert.ok((fallback.act || '').includes('SOME-FUTURE-CODE') || JSON.stringify(fallback).includes('码'), '兜底应带上原码或提示带码')
})

test('入口件：挂载默认进面静默查一次（只读 status），按钮文案随状态走（0.8.0 upToDateDisplay 默认按钮即版本）', async () => {
  const host = stubHost({ [buildPhoneNames('palette').updateStatus]: reply(snapshotOf({ latestVersion: '1.7.2' })) })
  const container = stubContainer()
  const entry = mountUpdateEntry(container, { pluginId: 'dsh-opencode-palette', prefix: 'palette', call: host.call })
  await tick()
  assert.ok(host.calls.some((c) => c.phone === buildPhoneNames('palette').updateStatus), '挂载默认 autoCheck mount：应静默查一次状态')
  await entry.refresh()
  assert.equal(entry.label(), '已是最新 1.7.2')
  assert.ok(container.innerHTML.includes('已是最新 1.7.2'), '按钮应渲染当前文案（0.8.0 默认按钮即版本，仍是单按钮）')
  assert.ok(container.innerHTML.includes('dsh-upd-entry'), '应渲染入口件骨架')
  entry.unmount()
})

test('入口件：有新版时按钮文案带版本号，待重启与失败各有其态', async () => {
  const phones = buildPhoneNames('palette')
  for (const [snapshot, label] of [
    [snapshotOf({ latestVersion: '1.8.0', canInstall: true }), '有新版 1.8.0'],
    [snapshotOf({ blockedReason: 'pending-restart' }), '待重启'],
    [snapshotOf({ job: { state: 'installing' } }), '正在安装…'],
  ]) {
    const host = stubHost({ [phones.updateStatus]: reply(snapshot) })
    const container = stubContainer()
    const entry = mountUpdateEntry(container, { pluginId: 'dsh-opencode-palette', prefix: 'palette', call: host.call })
    await entry.refresh()
    assert.equal(entry.label(), label)
    assert.ok(container.innerHTML.includes(label))
    entry.unmount()
  }
  const failHost = stubHost({ [phones.updateStatus]: { ok: false, error: 'check-failed', errorKind: 'check-failed' } })
  const failBox = stubContainer()
  const failEntry = mountUpdateEntry(failBox, { pluginId: 'dsh-opencode-palette', prefix: 'palette', call: failHost.call })
  await failEntry.refresh()
  assert.equal(failEntry.label(), '更新失败，点此查看')
  assert.ok(failBox.innerHTML.includes('更新失败，点此查看'))
  failEntry.unmount()
})

test('入口件：语言跟随 locale 适配器（0.5.8 单语渲染），切换即时重绘、无需重挂', async () => {
  const phones = buildPhoneNames('palette')
  const host = stubHost({ [phones.updateStatus]: reply(snapshotOf({ latestVersion: '1.7.2' })) })
  const container = stubContainer()
  // 与 runtime/client.mjs 的 updateLocaleSource 同形：{ getActive, subscribe }，语言翻转即通知。
  let lang = 'zh'
  let notify = null
  const entry = mountUpdateEntry(container, {
    pluginId: 'dsh-opencode-palette', prefix: 'palette', call: host.call,
    locale: { getActive: () => lang, subscribe: (cb) => { notify = cb; return () => { notify = null } } },
  })
  await entry.refresh()
  assert.ok(container.innerHTML.includes('检查更新'), '中文下按钮为中文单语')
  assert.ok(!container.innerHTML.includes('Check for updates'), '中文下不应混入英文（单语渲染）')
  lang = 'en'
  notify()
  await tick()
  assert.ok(container.innerHTML.includes('Check for updates'), '切英文后按钮即时重绘为英文，无需重挂')
  assert.ok(!container.innerHTML.includes('检查更新'), '英文下不应混入中文（单语渲染）')
  entry.unmount()
  assert.equal(notify, null, 'unmount 后应停订，不泄漏订阅')
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

test('接线：电话名从更新包派生，产物里不写死', () => {
  // 0.5.x 起第 4 个电话 updateChangelog 由包派生、宿主全量注册自动纳入（#52：有几个注册几个，不手数）。
  assert.deepEqual(Object.keys(PHONES).sort(), ['updateChangelog', 'updateCheck', 'updateInstall', 'updateStatus'])
  assert.equal(PHONES.updateStatus, 'palette.updateStatus')
  assert.equal(PHONES.updateChangelog, 'palette.updateChangelog')
  for (const rel of ['client.js', 'package/lib/client.js']) {
    const bundle = read(rel)
    assert.ok(bundle.indexOf("'palette.updateStatus'") < 0 && bundle.indexOf('"palette.updateStatus"') < 0,
      rel + ' 里不该出现写死的电话名字面量（电话名由入口件从前缀现算）')
    assert.ok(bundle.indexOf('mountUpdateEntry') >= 0, rel + ' 里应有更新包的入口件')
    assert.ok(bundle.indexOf('mountUpdatePanel') >= 0, rel + ' 里应有更新包的面板内核')
    assert.ok(bundle.indexOf('entryLabelFor') >= 0, rel + ' 里应有入口件文案函数（唯一出处）')
    assert.ok(bundle.indexOf('createClientLog') >= 0, rel + ' 里应有日志包的客户端入口')
    assert.ok(bundle.indexOf('createUpdateController') < 0, rel + ' 里不应再有自研更新控制器')
    assert.ok(bundle.indexOf('__mods["upd-entry"]') >= 0, rel + ' 里应内联入口件闭包')
    assert.ok(bundle.indexOf('__mods["upd-client"]') < 0, rel + ' 里不应再内联旧自研闭包（commands/batch/client）')
    assert.ok(bundle.indexOf('__mods["update-panel"]') < 0, rel + ' 里不应再有自研状态机模块')
  }
})

test('接线：包版产物声明两个运行时依赖与 node >=22', () => {
  const pkg = JSON.parse(read('package/package.json'))
  // 更新包与日志包都以依赖形态随包发出：用户装插件时由 npm 按范围取最新匹配版本
  assert.deepEqual(pkg.dependencies, { 'dsh-log': '0.2.1', 'dsh-plugin-update': '^0.8.0' })
  assert.equal(pkg.engines.node, '>=22', '更新包 0.7.x 要求 node >=22')
  assert.deepEqual(pkg.files, ['lib', 'cordis.patch.yml'])
  const bundle = read('package/lib/client.js')
  assert.match(bundle, /exports\.inject = \["theme","slots","locale","connection"\]/, '包版要注入 connection')
})

test('接线：宿主半不再 vendor 更新包 —— 走真依赖，产物里没有 vendor 目录', () => {
  // 0.1.x 时代被迫把更新包 dist 复制进本包（自锚定缺陷）；0.2.0 起按包名解析，依赖形态直接可用。
  assert.ok(!existsSync(join(ROOT, 'runtime', 'vendor')), 'runtime/vendor 应已删除')
  assert.ok(!existsSync(join(ROOT, 'package', 'lib', 'vendor')), 'package/lib/vendor 应已删除')
  const host = read('runtime/host.mjs')
  assert.match(host, /from 'dsh-plugin-update'/, '宿主半应 import 真依赖')
  assert.ok(host.indexOf('./vendor/') < 0, '宿主半不该再有 vendor 相对路径')
  const built = read('package/lib/index.js')
  assert.match(built, /from 'dsh-plugin-update'/, '发出去的宿主半也要 import 真依赖（用户侧从 node_modules 解析）')
})

test('接线：宿主有几个电话注册几个，不手数（新电话自动纳入）', () => {
  // 薄胶水：for (handlers) 全注册；电话名只从包返回值读，不手写字面量。
  assert.match(read('runtime/host.mjs'), /for \(const phoneName of Object\.keys\(update\.handlers\)\) registry\.set\(phoneName/,
    '宿主必须全量注册包返回的电话处理器')
  assert.ok(read('runtime/host.mjs').indexOf('wrapUpdateCheck') < 0, '不得再包探针/重试包装')
  assert.ok(read('runtime/host.mjs').indexOf('probeRelease') < 0, '自研探针应已删除')
  assert.ok(!existsSync(join(ROOT, 'runtime', 'update-panel.mjs')), '自研状态机文件应已删除')
})

// ───────────────────────── 三、宿主半冒烟 ─────────────────────────

test('宿主半：装配出电话、注册精确路由、跑通日志落盘与更新查状态', async () => {
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
    // 假使用范围：开发态 checkout 下更新包按包名找不到本包（README §6.13 的情形），
    // 按「<范围>/node_modules/<目标包名>」摆一份装好的包并把 targetPackageDir 指过去，
    // 使用范围目录由更新包自己反推。摆的是 package/ 产物（自带 main/client/patch 入口，
    // 版本与 runningVersion 一致，不进 pending-restart）。
    const profileDir = join(home, 'fakeprofile')
    const fakePkgDir = join(profileDir, 'node_modules', 'dsh-opencode-palette')
    mkdirSync(join(fakePkgDir, 'lib'), { recursive: true })
    cpSync(join(ROOT, 'package', 'lib'), join(fakePkgDir, 'lib'), { recursive: true })
    cpSync(join(ROOT, 'package', 'package.json'), join(fakePkgDir, 'package.json'))
    cpSync(join(ROOT, 'package', 'cordis.patch.yml'), join(fakePkgDir, 'cordis.patch.yml'))
    writeFileSync(join(profileDir, 'package.json'), JSON.stringify({
      name: 'fake-profile',
      version: '0.0.0',
      dependencies: { 'dsh-opencode-palette': '^0.2.0' },
    }))
    hostModule.apply(ctx, { readerOverrides: { targetPackageDir: fakePkgDir } })
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

    // 更新电话：查状态回快照，运行版本就是本包版本（证明 runningVersion 覆盖生效、没抛 unknown-profile）
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
// 与 tests/panel-render.test.mjs 同款做法：在当前上下文执行包版产物 → 用真 React renderToString 抓 DOM。
// 入口件挂载位只断言「有没有容器」（effect 在 SSR 下不跑，包按钮由浏览器里挂载后的 effect 接管）。

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
  // 扫描门禁：eval 语法即高危（DANGEROUS_DYNAMIC_EXECUTION）；在当前上下文执行同一产物字节，语义与直接求值一致（仅测试）。
  runInThisContext(code, { filename: 'package/lib/client.js' })
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
  return { render, html: render() }
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

test('渲染：宿主可用时头行原位出现入口件挂载位，且无自研残留', () => {
  const { html } = renderPanel({ connection: fakeConnection({ [PHONES.updateStatus]: reply(snapshotOf()) }) })
  assert.ok(html.includes('data-update-entry'), '头行原位缺入口件挂载位')
  assert.ok(html.includes('white-space:nowrap') || html.includes('whiteSpace'), '入口件容器应锁不换行（0.7.0 sizing 前置修复：检查更新不再折行）')
  assert.ok(!html.includes('zoom:1'), '旧 zoom 临时方案应已删除（0.7.0 走正式 sizing 参数）')
  assert.ok(!html.includes('有新版本'), '不应再有自研红字按钮')
  assert.ok(!html.includes('立即升级'), '不应再有自研弹窗动作按钮')
  assert.ok(!html.includes('发现新版本'), '不应再有自研弹窗标题')
  assert.ok(html.includes('OpenCode调色板'), '主题面板本身不受影响')
})

test('渲染：宿主不可用时不渲染更新块（主题面板本身照常）', () => {
  const { html } = renderPanel({ connection: null })
  assert.ok(!html.includes('data-update-entry'), '无宿主时不该出现更新挂载位')
  assert.ok(!html.includes('检查更新'), '无宿主时不该出现更新文案')
  assert.ok(html.includes('OpenCode调色板'), '主题面板本身不受影响')
})

test('渲染：中英文主题面板文案不受更新最小集成影响', () => {
  const zh = renderPanel({ connection: fakeConnection({ [PHONES.updateStatus]: reply(snapshotOf()) }) })
  assert.ok(zh.html.includes('主题'), '中文主题文案应照常（#59 定稿：区标题已收敛为“主题”）')
  assert.ok(!zh.html.includes('选择主题'), '旧区标题“选择主题”不应再出现（#59 一致命中已改）')
  const en = renderPanel({ lang: 'en', connection: fakeConnection({ [PHONES.updateStatus]: reply(snapshotOf()) }) })
  assert.ok(en.html.includes('Themes'), '英文主题文案应照常')
})


// ───────────────────────── 四点五、换肤：主题一致（0.7.0 themeTokens） ─────────────────────────

test('换肤：37 主题的 themeTokens 全过 0.7.0 校验，system/透光回 undefined', async () => {
  const { buildUpdateTokens } = await import(pathToFileURL(join(ROOT, 'src', 'engine', 'update-tokens.mjs')).href)
  const { themeTokensStyleFor } = await import(pathToFileURL(join(ROOT, 'node_modules', 'dsh-plugin-update', 'dist', 'panel.js')).href)
  const { listThemes } = await import(pathToFileURL(join(ROOT, 'src', 'engine', 'registry.mjs')).href)
  const names = listThemes()
  assert.ok(names.includes('tokyonight') && names.includes('system'), '主题表应含 tokyonight 与 system')
  let themed = 0
  for (const name of names) {
    const tokens = buildUpdateTokens(name)
    if (name === 'system') {
      assert.equal(tokens, undefined, 'system 无色应回 undefined（零回归，用包默认）')
      continue
    }
    if (!tokens) continue
    themed++
    const css = themeTokensStyleFor(tokens)
    assert.ok(css.includes('--dsh-update-text:'), name + ' 的 token 应含 text')
    assert.ok(css.includes('--dsh-update-bg:'), name + ' 的 token 应含 bg')
    assert.ok(css.includes('--dsh-update-primary:'), name + ' 的 token 应含 primary')
  }
  assert.ok(themed >= 36, '至少 36 个主题应产出 token（实得 ' + themed + '）')
  const tk = buildUpdateTokens('tokyonight')
  assert.equal(tk.text, '#C8D3F5')
  assert.equal(tk.primary, '#82AAFF')
  assert.ok(!('entryFontSize' in tk) && !('entryPadding' in tk) && !('entryBorderRadius' in tk) && !('entryScale' in tk),
    '按钮尺寸只走 sizing 参数，themeTokens 不再写 entry*（双信源已删）')
})

test('换肤：真挂载入口件随 setThemeTokens 即时换肤（执行级，非源码 grep）', async () => {
  const { buildUpdateTokens } = await import(pathToFileURL(join(ROOT, 'src', 'engine', 'update-tokens.mjs')).href)
  const { mountUpdateEntry } = await import(pathToFileURL(join(ROOT, 'node_modules', 'dsh-plugin-update', 'dist', 'entry.js')).href)
  const tk = buildUpdateTokens('tokyonight')
  const dracula = buildUpdateTokens('dracula')
  assert.ok(tk && dracula && tk.text !== dracula.text, '前置：两主题 text 应不同，否则换肤无从验证')
  const container = { innerHTML: '' }
  const entry = mountUpdateEntry(container, {
    pluginId: 'dsh-opencode-palette',
    prefix: 'palette',
    call: async () => { throw new Error('换肤测试不应调宿主（autoCheck never）') },
    variant: 'button',
    theme: 'default',
    themeTokens: tk,
    sizing: { fontSize: '12px', padding: '2px 10px', borderRadius: '6px', scale: 1 },
    autoCheck: 'never',
    openOn: 'has-update',
  })
  try {
    assert.ok(container.innerHTML.includes('--dsh-update-text:' + tk.text), '挂载后容器应含 tokyonight 的 text 变量')
    entry.setThemeTokens(dracula)
    assert.ok(container.innerHTML.includes('--dsh-update-text:' + dracula.text), 'setThemeTokens 后容器应换成 dracula 的 text 变量')
    entry.setThemeTokens(undefined)
    assert.ok(!container.innerHTML.includes('--dsh-update-text:' + dracula.text), '传 undefined 应清掉覆盖')
  } finally {
    entry.unmount()
  }
})

test('单按钮：openOn always 下头行永远只有一个控件，弹窗按需开（防双块回归）', async () => {
  const { mountUpdateEntry } = await import(
    pathToFileURL(join(ROOT, 'node_modules', 'dsh-plugin-update', 'dist', 'entry.js')).href
  )
  const host = stubHost({
    [PHONES.updateStatus]: reply(snapshotOf()),
    [PHONES.updateCheck]: reply(snapshotOf()),
  })
  const container = stubContainer()
  const entry = mountUpdateEntry(container, {
    pluginId: 'dsh-opencode-palette',
    prefix: 'palette',
    call: host.call,
    variant: 'button',
    theme: 'default',
    autoCheck: 'never',
    openOn: 'always',
  })
  try {
    const buttons = container.innerHTML.match(/<button/g) || []
    assert.equal(buttons.length, 1, '头行应只有一个按钮控件（has-update 的原地小字第二块不应出现）')
    assert.ok(!container.innerHTML.includes('data-dsh-upd-note'), 'always 模式下不应渲染原地小字元素（类名串在 <style> 里恒在，以元素属性为准）')
    entry.open()
    await tick(); await tick(); await tick()
    assert.ok(container.innerHTML.includes('dsh-upd-overlay'), 'open 后应出现 dialog 弹窗（无新版在弹窗内看“已是最新”）')
  } finally {
    entry.unmount()
  }
})

test('换肤：入口去底只作用入口作用域，dialog 不受影响', () => {
  const client = read('runtime/client.mjs')
  const rule = '.dsh-upd-entry .dsh-upd-entry-btn{--dsh-update-button-bg:transparent}'
  assert.ok(client.includes(rule), '入口去底规则应存在（作用域限定 .dsh-upd-entry）')
  assert.ok(!client.includes('.dsh-upd button{--dsh-update-button-bg'), '不得裸改 dialog 按钮底色')
  for (const rel of ['client.js', 'package/lib/client.js']) {
    assert.ok(read(rel).includes(rule), rel + ' 产物应带上入口去底规则')
  }
})

test('换肤：入口件接线传 themeTokens + sizing，换主题经 setThemeTokens 同步', () => {
  const client = read('runtime/client.mjs')
  assert.match(client, /buildUpdateTokens/, '客户端应从主题派生 token')
  assert.match(client, /themeTokens: currentUpdateTokens\(\)/, '挂载时应传入当前主题的 token')
  assert.match(client, /sizing: \{ fontSize: '12px', padding: '2px 10px', borderRadius: '6px', scale: 1 \}/, '按钮尺寸走 0.7.0 正式 sizing 参数')
  assert.match(client, /openOn: 'always'/, '单按钮：点即开弹窗，无新版不挂第二块（has-update 的原地小字已弃用）')
  assert.match(client, /setThemeTokens/, '换主题应经 setThemeTokens 即时换肤（含 dialog 透传）')
  const bundle = read('package/lib/client.js')
  assert.ok(bundle.indexOf('--dsh-update-text') >= 0, '产物应含 0.7.0 新变量名（0.6.0 已更名，旧 --dsh-upd-* 不应再出现）')
  assert.ok(bundle.indexOf('--dsh-upd-text') < 0 && bundle.indexOf('--dsh-upd-btn') < 0, '产物不应再有旧 --dsh-upd-* 变量')
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
  // 运行期会发的事件名（宿主侧来自日志包；更新包 0.5.x 经 logCtx 不再自发事件；
  // 自研重试/探针事件已随代码同删，其余更新/日志事件名保留为白名单口径）。
  const emitted = [
    'host.call', 'host.call.fail', 'update.install.exec', 'log.forward.summary', 'log.switch.watchdog', 'log.export.fail', 'host.channel.fail',
    'update.check.start', 'update.check.ok', 'update.check.fail',
    'update.install.start', 'update.install.ok', 'update.install.fail', 'log.switch.set',
  ]
  for (const name of emitted) {
    assert.ok(manifest.events[name], '事件清单缺 ' + name)
  }
  // 清单与随包副本一致（发出去的清单就是这份）
  assert.deepEqual(JSON.parse(read('package/lib/event-list.json')), JSON.parse(read('runtime/event-list.json')))
})
