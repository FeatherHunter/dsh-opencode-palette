// log-switch.test.mjs — issue 42 回归：日志开关打开后重进面板不得覆回关
//
// 两条行为门禁（读源码不断言，只走真实接线）：
//   一、面板侧：写开后再对账必须为开（旧实现复用启动快照，重进必覆回关）
//   二、宿主侧：运行时日志目录被删后，写开关必须重建目录并落盘（旧实现静默吞错）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

// ───────────────────────── 一、面板侧 ─────────────────────────

function memoryStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)) },
    removeItem: (k) => { map.delete(k) },
  }
}

function fakeDocument() {
  const body = {
    hasAttribute: () => true,
    appendChild: (el) => { el.parentNode = body },
    removeChild: (el) => { el.parentNode = null },
  }
  return {
    head: { appendChild: () => {} },
    body,
    createElement: () => ({
      dataset: {}, parentNode: null, textContent: '',
      style: { cssText: '', fontFamily: '' },
      getBoundingClientRect: () => ({ width: 8 }),
    }),
    documentElement: { lang: 'zh-CN' },
    addEventListener: () => {},
    removeEventListener: () => {},
  }
}

test('面板侧：写开后重进对账仍为开，写关后仍为关（issue 42）', async () => {
  // 面板源码的 engine 引用由构建期改写，直接 import 跑不起来；
  // 这里走构建产物（发出去的东西），与 panel-render 测试同构。
  const { createRequire } = await import('node:module')
  const require = createRequire(import.meta.url)
  const React = require('react')
  const code = readFileSync(join(ROOT, 'package', 'lib', 'client.js'), 'utf8')

  const prevStorage = globalThis.localStorage
  const prevDocument = globalThis.document
  const prevWindow = globalThis.window
  globalThis.localStorage = memoryStorage()
  globalThis.document = fakeDocument()
  globalThis.window = globalThis
  const prevLoader = globalThis.__ModuleLoader__
  const loaded = []
  globalThis.__ModuleLoader__ = {
    load(entry) {
      loaded.push({
        id: entry.id,
        exports: entry.factory((id) => {
          if (id === 'react') return React
          throw new Error('unexpected require: ' + id)
        }),
      })
    },
  }
  try {
    eval(code)
    const face = loaded[0].exports
    let panelProps = null
    const slots = {
      inject: (slot, cb) => { cb(); return () => {} },
      register: (desc, cmp) => { panelProps = desc.inject(); return () => {} },
    }
    const hostState = { enabled: false }
    const connection = {
      rpc: {
        call: async (channel, endpoint, { method, payload }) => {
          if (String(method).endsWith('logGetSwitch')) {
            return { ok: true, value: { ok: true, enabled: hostState.enabled, sampleRate: 1 } }
          }
          if (String(method).endsWith('logSetSwitch')) {
            hostState.enabled = !!(payload && payload.enabled)
            return { ok: true, value: { ok: true, enabled: hostState.enabled, sampleRate: 1 } }
          }
          throw new Error('unexpected phone: ' + method)
        },
      },
    }
    const ctx = {
      get: (k) => {
        if (k === 'theme') return { overrideTokens: () => () => {} }
        if (k === 'slots') return slots
        if (k === 'connection') return connection
        return undefined
      },
      effect: (fn) => { fn() },
    }
    face.apply(ctx)
    assert.ok(panelProps, '面板 API 未注册')

    // 初态：宿主关，对账应为关
    const boot = await panelProps.reconcileLog()
    assert.equal(boot.enabled, false, '初态对账应为关')

    // 打开：写宿主成功
    const setOn = await panelProps.log.setLogSwitch(true)
    assert.equal(setOn.ok, true, '写开必须成功')
    assert.equal(hostState.enabled, true, '宿主真值应为开')

    // 重进：再次对账必须为开（旧实现回启动快照，这里会是关）
    const reopened = await panelProps.reconcileLog()
    assert.equal(reopened.enabled, true, '写开后重进对账仍应为开（issue 42）')

    // 关闭：写关后对账应为关
    const setOff = await panelProps.log.setLogSwitch(false)
    assert.equal(setOff.ok, true, '写关必须成功')
    const reopenedOff = await panelProps.reconcileLog()
    assert.equal(reopenedOff.enabled, false, '写关后重进对账应为关')
  } finally {
    if (prevStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = prevStorage
    if (prevDocument === undefined) delete globalThis.document
    else globalThis.document = prevDocument
    if (prevWindow === undefined) delete globalThis.window
    else globalThis.window = prevWindow
    if (prevLoader === undefined) delete globalThis.__ModuleLoader__
    else globalThis.__ModuleLoader__ = prevLoader
  }
})

// ───────────────────────── 二、宿主侧 ─────────────────────────

test('宿主侧：运行时目录被删后写开关仍重建并落盘', async () => {
  const home = mkdtempSync(join(tmpdir(), 'palette-logswitch-'))
  const previousHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    const hostModule = await import(pathToFileURL(join(ROOT, 'runtime', 'host.mjs')).href + '?logswitch=1')
    let route = null
    const ctx = {
      get: (name) => (name === 'connection'
        ? { fetch: { register: (r) => { route = r; return () => {} } } }
        : undefined),
    }
    hostModule.apply(ctx)
    assert.ok(route, '必须注册通道路由')

    const call = async (phone, payload) => {
      const request = new Request('http://127.0.0.1/api/opencode-palette', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'client-request', rpcId: 'rpc-1', payload: { method: phone, payload: payload === undefined ? null : payload } }),
      })
      const response = await route.fetch(request)
      return response.json()
    }
    const switchFile = join(home, 'logs', 'log-switch-dsh-opencode-palette.json')

    // 等装配物化缺省开关（fire-and-forget，轮询等它）
    let ready = false
    for (let i = 0; i < 50 && !ready; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      ready = existsSync(switchFile)
    }
    assert.equal(ready, true, '装配后开关文件必须物化')

    // 模拟运行时目录被删，再写开必须重建并落盘
    rmSync(join(home, 'logs'), { recursive: true, force: true })
    assert.equal(existsSync(switchFile), false, '前置：目录已删')
    const setReply = await call('palette.logSetSwitch', { enabled: true })
    assert.equal(setReply.result.ok, true, '写开关必须回成功')
    assert.equal(existsSync(switchFile), true, '写开关必须重建目录并落盘')
    assert.equal(JSON.parse(readFileSync(switchFile, 'utf8')).enabled, true, '落盘值应为开')
    const getReply = await call('palette.logGetSwitch', {})
    assert.equal(getReply.result.value.enabled, true, '读回应为开')
  } finally {
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    rmSync(home, { recursive: true, force: true })
  }
})
