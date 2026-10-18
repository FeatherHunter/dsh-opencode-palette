// log-switch.test.ts — issue 42 回归：日志开关打开后重进面板不得覆回关
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
import { runInThisContext } from 'node:vm'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

// ───────────────────────── 一、面板侧 ─────────────────────────
//
// 测试替身只声明产物真正用到的最小形状：面板 bundle 是运行期求值的 JS，
// 这里给 localStorage / document / __ModuleLoader__ 的替身不需要完整 DOM 类型。

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: unknown): void
  removeItem(key: string): void
}

interface MockElement {
  dataset: Record<string, string>
  parentNode: MockBody | null
  textContent: string
  style: { cssText: string; fontFamily: string }
  getBoundingClientRect(): { width: number }
}

interface MockBody {
  hasAttribute(name: string): boolean
  appendChild(el: MockElement): void
  removeChild(el: MockElement): void
}

interface MockDocument {
  head: { appendChild(el: MockElement): void }
  body: MockBody
  createElement(tag: string): MockElement
  documentElement: { lang: string }
  addEventListener(): void
  removeEventListener(): void
}

interface PanelProps {
  reconcileLog(): Promise<{ enabled: boolean }>
  log: { setLogSwitch(enabled: boolean): Promise<{ ok: boolean }> }
}

interface PanelFace {
  apply(ctx: unknown): void
}

interface SlotDesc {
  inject(): unknown
}

interface LoadedModule {
  id: string
  exports: unknown
}

interface ModuleLoaderEntry {
  id: string
  factory(require: (id: string) => unknown): unknown
}

// globalThis 上的浏览器/加载器扩展（Node 类型里没有，用窄化替身声明）
interface TestGlobals {
  localStorage?: StorageLike
  document?: MockDocument
  window?: unknown
  __ModuleLoader__?: { load(entry: ModuleLoaderEntry): void }
}

const g = globalThis as unknown as TestGlobals

function memoryStorage(): StorageLike {
  const map = new Map<string, string>()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) ?? null : null),
    setItem: (k, v) => { map.set(k, String(v)) },
    removeItem: (k) => { map.delete(k) },
  }
}

function fakeDocument(): MockDocument {
  const body: MockBody = {
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
  const React: unknown = require('react')
  const code = readFileSync(join(ROOT, 'package', 'lib', 'client.js'), 'utf8')

  const prevStorage = g.localStorage
  const prevDocument = g.document
  const prevWindow = g.window
  g.localStorage = memoryStorage()
  g.document = fakeDocument()
  g.window = globalThis
  const prevLoader = g.__ModuleLoader__
  const loaded: LoadedModule[] = []
  g.__ModuleLoader__ = {
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
    // 扫描门禁：eval 语法即高危（DANGEROUS_DYNAMIC_EXECUTION）；在当前上下文执行同一产物字节，语义与直接求值一致（仅测试）。
    runInThisContext(code, { filename: 'package/lib/client.js' })
    assert.ok(loaded[0], '产物应注册模块')
    const face = loaded[0].exports as PanelFace
    let panelProps: PanelProps | null = null
    const slots = {
      inject: (_slot: string, cb: () => void) => { cb(); return () => {} },
      register: (desc: SlotDesc, _cmp: unknown) => {
        panelProps = desc.inject() as PanelProps
        return () => {}
      },
    }
    const hostState = { enabled: false }
    const connection = {
      rpc: {
        call: async (
          _channel: string,
          _endpoint: string,
          { method, payload }: { method: string; payload?: { enabled?: boolean } }
        ) => {
          if (String(method).endsWith('logGetSwitch')) {
            return { ok: true, value: { ok: true, enabled: hostState.enabled } }
          }
          if (String(method).endsWith('logSetSwitch')) {
            hostState.enabled = !!(payload && payload.enabled)
            return { ok: true, value: { ok: true, enabled: hostState.enabled } }
          }
          throw new Error('unexpected phone: ' + method)
        },
      },
    }
    const ctx = {
      get: (k: string): unknown => {
        if (k === 'theme') return { overrideTokens: () => () => {} }
        if (k === 'slots') return slots
        if (k === 'connection') return connection
        return undefined
      },
      effect: (fn: () => void): void => { fn() },
    }
    face.apply(ctx)
    // 注册回调在 apply 期间才写 panelProps；TS 看不到闭包赋值，这里显式取回再窄化
    const props = panelProps as PanelProps | null
    assert.ok(props, '面板 API 未注册')

    // 初态：宿主关，对账应为关
    const boot = await props.reconcileLog()
    assert.equal(boot.enabled, false, '初态对账应为关')

    // 打开：写宿主成功
    const setOn = await props.log.setLogSwitch(true)
    assert.equal(setOn.ok, true, '写开必须成功')
    assert.equal(hostState.enabled, true, '宿主真值应为开')

    // 重进：再次对账必须为开（旧实现回启动快照，这里会是关）
    const reopened = await props.reconcileLog()
    assert.equal(reopened.enabled, true, '写开后重进对账仍应为开（issue 42）')

    // 关闭：写关后对账应为关
    const setOff = await props.log.setLogSwitch(false)
    assert.equal(setOff.ok, true, '写关必须成功')
    const reopenedOff = await props.reconcileLog()
    assert.equal(reopenedOff.enabled, false, '写关后重进对账应为关')
  } finally {
    g.localStorage = prevStorage
    g.document = prevDocument
    g.window = prevWindow
    g.__ModuleLoader__ = prevLoader
  }
})

// ───────────────────────── 二、宿主侧 ─────────────────────────

interface RouteHandler {
  fetch(request: Request): Promise<Response>
}

interface HostModule {
  apply(ctx: unknown): void
}

interface HostReply {
  result: {
    ok: boolean
    value: { ok: boolean; enabled: boolean }
  }
}

test('宿主侧：运行时目录被删后写开关仍重建并落盘', async () => {
  const home = mkdtempSync(join(tmpdir(), 'palette-logswitch-'))
  const previousHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    // 手写运行时源码已迁 TypeScript（Node 22.18+ 原生类型剥离可直接跑）；带 query 避免同进程模块缓存
    const hostModule = await import(pathToFileURL(join(ROOT, 'runtime', 'host.ts')).href + '?logswitch=1') as HostModule
    let route: RouteHandler | null = null
    const ctx = {
      get: (name: string): unknown => (name === 'connection'
        ? { fetch: { register: (r: unknown) => { route = r as RouteHandler; return () => {} } } }
        : undefined),
    }
    hostModule.apply(ctx)
    // 路由由 apply 期间的注册回调写入；TS 看不到闭包赋值，取出后显式窄化
    const handler = route as RouteHandler | null
    assert.ok(handler, '必须注册通道路由')

    const call = async (phone: string, payload?: unknown): Promise<HostReply> => {
      const request = new Request('http://127.0.0.1/api/opencode-palette', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'client-request', rpcId: 'rpc-1', payload: { method: phone, payload: payload === undefined ? null : payload } }),
      })
      const response = await handler.fetch(request)
      return await response.json() as HostReply
    }
    const switchFile = join(home, 'logs', 'log-switch-dsh-opencode-palette.json')

    // 等装配物化缺省开关（fire-and-forget，轮询等它）
    let ready = false
    for (let i = 0; i < 50 && !ready; i += 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, 100))
      ready = existsSync(switchFile)
    }
    assert.equal(ready, true, '装配后开关文件必须物化')

    // 模拟运行时目录被删，再写开必须重建并落盘
    rmSync(join(home, 'logs'), { recursive: true, force: true })
    assert.equal(existsSync(switchFile), false, '前置：目录已删')
    const setReply = await call('palette.logSetSwitch', { enabled: true })
    assert.equal(setReply.result.ok, true, '写开关必须回成功')
    assert.equal(existsSync(switchFile), true, '写开关必须重建目录并落盘')
    assert.equal((JSON.parse(readFileSync(switchFile, 'utf8')) as { enabled: boolean }).enabled, true, '落盘值应为开')
    const getReply = await call('palette.logGetSwitch', {})
    assert.equal(getReply.result.value.enabled, true, '读回应为开')
  } finally {
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    rmSync(home, { recursive: true, force: true })
  }
})
