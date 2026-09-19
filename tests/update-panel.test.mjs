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
  assert.equal(await panel.install(), false)
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

test('渲染：有新版 → 按钮变「更新至 v1.8.0」并弹出升级弹窗（含手工命令与复制）', async () => {
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
  assert.ok(html.includes('更新至 v1.8.0'), '按钮应显示目标版本')
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
  const emitted = ['host.call', 'host.call.fail', 'update.install.exec', 'log.forward.summary', 'log.switch.watchdog', 'log.export.fail', 'host.channel.fail']
  for (const name of emitted) {
    assert.ok(manifest.events[name], '事件清单缺 ' + name)
  }
  // 清单与随包副本一致（发出去的清单就是这份）
  assert.deepEqual(JSON.parse(read('package/lib/event-list.json')), JSON.parse(read('runtime/event-list.json')))
})
