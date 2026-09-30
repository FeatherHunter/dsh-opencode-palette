/**
 * runtime/host.mjs — dsh-opencode-palette 宿主半（构建产物为 package/lib/index.js）
 *
 * 三件事：
 *   1. 日志落盘：dsh-log 的宿主引擎，落 <DSH_HOME>/logs/dsh-opencode-palette/YYYY-MM-DD.log；
 *   2. 更新三电话：dsh-plugin-update 的 createHostUpdate（查状态 / 查新版 / 装更新）；
 *   3. 面板通道：自注册精确 HTTP 路由 /api/opencode-palette，把电话分发给浏览器半。
 *
 * 通道为什么不用 harness.handle / host.call：那套是 cordis_define 动态包专属的沙箱方言，
 * 已安装插件的宿主半拿不到 harness、浏览器半拿不到 host（证据见地图 #14 的 #16 票结论）。
 * 走 DSH 公开的 /api 载体：宿主 connection.fetch.register 注册精确路由，客户端
 * connection.rpc.call('/api', 'opencode-palette', { method, payload })——与 deck、im-companion 同构。
 *
 * 更新包为什么走 ./vendor/ 相对路径而不是 import 'dsh-plugin-update'：
 * 更新包的读取器用 containingPackage(import.meta.url, 目标包名) 从【自己的文件位置】往上找目标包。
 * 以 npm 依赖形态安装时它住在 <profile>/node_modules/dsh-plugin-update，往上永远找不到
 * dsh-opencode-palette，于是：运行版本读不到（host 入口直接抛 unknown-profile），且环境判定里的
 * sameLoadedPackage 恒为假 → blockedReason 恒为 installation-changed → 一键升级永远不可用。
 * 把它的 dist 原样放进本包 lib/vendor/ 下，import.meta.url 就落在本包内，两条判定都成立。
 * vendor 副本由构建从 npm 包复制（见 scripts/build-client.mjs），门禁断言与 npm 包逐字节一致。
 */
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHostLog, registerHostLogPhones } from 'dsh-log/host'
import { createHostUpdate } from './vendor/dsh-plugin-update/host.js'
import { buildPhoneNames, DEFAULT_REGISTRY } from './vendor/dsh-plugin-update/config.js'
import { PLUGIN_ID, PHONE_PREFIX, ROUTE_PATH, TARGET_PACKAGE_NAME } from './channel.mjs'

export const name = PLUGIN_ID
// 通道要 connection；subprocess / desktopProfiles / desktopPnpm 由更新包自己按需取（它内部注入），
// 不写进顶层 inject：普通 DSH 没有 desktop* 服务，写进顶层会让插件在普通宿主里装配失败。
export const inject = ['connection']

// 落点：<DSH_HOME>/logs/dsh-opencode-palette/YYYY-MM-DD.log，开关 <DSH_HOME>/logs/log-switch-dsh-opencode-palette.json
// （与同机 dsh-prompt 的既成落点同构；DSH 不提供 cache 目录 API，缓存根只有 <DSH_HOME>）
const LOG_DIR_NAME = PLUGIN_ID
const SWITCH_FILE_NAME = 'log-switch-' + PLUGIN_ID + '.json'
const RPC_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/
const ENDPOINT_PATTERN = /^[A-Za-z0-9_$.-]+$/

/**
 * 装配时先把日志目录建好、把开关文件用缺省值物化（2026-09-19 修，真机噪声两则）。
 *
 * 现象：两天日志里除 `log.persist.fail / readBack / read-fail` 之外什么都没有 —— 等于日志系统
 * 没真正跑起来，还会带偏排障。
 *
 * 根因（本地插桩实测，非推断）：
 *   1. `dsh-log` 的 `persistSwitch()` 只调 `writeText`，**不会建父目录**；而写日志那条路
 *      （`writeBatch`）自己会先 `mkdir`。所以"没写过日志之前" `<DSH_HOME>/logs` 并不存在。
 *   2. `loadSwitch()` 把「开关文件不存在」和「读坏了」归成同一条错误路径：`readText` 在目录
 *      不存在时抛 ENOENT → 落 catch → 记一条 `readBack / read-fail` warn。
 *   3. 于是**每次启动读开关都记一条误报**，且首次 `setSwitch()` 也会失败 —— 更糟的是
 *      `persistSwitch()` 把异常吞掉（调用方拿到"成功"，磁盘上什么都没有）。
 *
 * 修法：装配时 `mkdir` 日志目录（recursive），再让 store 用**自己的 API**把缺省开关写下去。
 * 不自己拼路径写 JSON：开关文件的落点与形状归 store 管，自己写会变成第二份真源。
 */
async function prepareLogHome(store, cacheDir) {
  if (!cacheDir) return
  await mkdir(join(cacheDir), { recursive: true })
  const file = join(cacheDir, store.config.switchFileName)
  if (existsSync(file)) return
  const defaults = store.getSwitchState()
  await store.setSwitch(defaults.enabled, defaults.sampleRate)
}

const PACKAGE_DIR = dirname(dirname(fileURLToPath(import.meta.url)))

/** 本进程正在跑的版本：启动那一刻读自己的 package.json（= 加载进内存的那份代码的版本）。
 *  不能用「每次调用现读磁盘」的写法：装完新版后磁盘版本会变，进程里跑的却还是旧的，
 *  现读会让 pending-restart 永远判不出来（更新包据此决定是否提示「待重启」）。 */
export const runningVersion = readRunningVersion()
function readRunningVersion() {
  try {
    const manifest = JSON.parse(readFileSync(join(PACKAGE_DIR, 'package.json'), 'utf8'))
    return typeof manifest.version === 'string' ? manifest.version : '0.0.0'
  } catch {
    return '0.0.0'
  }
}

/** 事件清单：随包落 lib/event-list.json（构建从 runtime/event-list.json 复制）。读不到就用 null（日志照记，只是没有白名单元数据）。 */
export function readEventList() {
  try {
    return JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'event-list.json'), 'utf8'))
  } catch {
    return null
  }
}

/** DSH 家目录：$DSH_HOME（去空白后非空）否则 ~/.dsh，与 @deepseek-ai/dsh-home-paths 同一规则
 *  （更新包的 defaultHomeDir 也是同一条；tests/update-integration.test.mjs 里有两边一致的断言）。 */
export function dshHomeDir(env, osHome) {
  const raw = env && typeof env.DSH_HOME === 'string' && env.DSH_HOME.trim() ? env.DSH_HOME : join(osHome, '.dsh')
  return raw === '~' ? osHome : raw.replace(/^~[\\/]/, osHome + '/')
}

/** 给日志包的文件服务（INTEGRATION.md 步骤 2 的形状表）：六个方法全走 node:fs/promises。
 *  为什么不直接传 ctx.get('fs')：DSH 的 fs 服务没有 mkdir / unlink，且部署的是沙箱实现
 *  （workspace-write 只允许写 workspace 内），写用户家目录会被 FS_SANDBOX_DENIED 拒掉。 */
export function createLogFileService(readTextImpl, writeTextImpl, mkdirImpl, unlinkImpl, listDirImpl) {
  return {
    resolve: function (pathStr) { return String(pathStr) },
    readText: function (target) { return readTextImpl(String(target), 'utf8') },
    writeText: function (target, text) { return writeTextImpl(String(target), String(text), 'utf8') },
    mkdir: function (dir) { return mkdirImpl(String(dir), { recursive: true }) },
    unlink: function (target) { return unlinkImpl(String(target)) },
    listDir: function (dirTarget) { return listDirImpl(String(dirTarget)) },
  }
}

// ── 查更新的自检探针与重试（2026-09-30 加；起因：面板点「检查更新」静默无反应，日志只剩一个散列）──
// 更新包把 fetch→校验链路里每一步失败都归成同一个 invalid-release（service.js 的兜底 catch），
// 线上因此只剩 8 位散列，分不清是「响应被截断」还是「tarball 指向了别的源」。
// 探针按同一条链路再走一遍，但一步一记、绝不抛错：把现象写进日志，而不是只给判词。
// 重试一次：截断、抖动这类瞬时故障本会自愈，用户不该为它再看一次失败。
/** 探针阈值：必须与更新包 service.js 里的同名常量一致（tests/update-panel.test.mjs 有门禁比对）。 */
export const PROBE_LIMITS = {
  maxBytes: 256 * 1024,
  integrityPattern: '^sha512-[A-Za-z0-9+/]{86}==$',
}

/** 取一小段文本进日志：够定位就行，别把整份响应写进去。 */
function probeBrief(value, limit) {
  const text = value === null || value === undefined ? '' : String(value)
  return text.length > limit ? text.slice(0, limit) : text
}

/**
 * 按更新包的同一条链路重走一遍发布清单，把观察到的现象原样回给调用方（不抛错）。
 * @returns {Promise<{stage: string, httpStatus: number|null, bytes: number, reason: string, detail: string}>}
 */
export async function probeRelease(fetchImpl, options) {
  const opts = options || {}
  const targetName = String(opts.targetPackageName || TARGET_PACKAGE_NAME)
  const registry = String(opts.registryUrl || DEFAULT_REGISTRY)
  const timeoutMs = typeof opts.timeoutMs === 'number' && opts.timeoutMs > 0 ? opts.timeoutMs : 10000
  const limits = opts.limits || PROBE_LIMITS
  const facts = { stage: 'fetch', httpStatus: null, bytes: 0, reason: 'fetch-threw', detail: '' }

  let response = null
  try {
    const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(timeoutMs)
      : undefined
    response = await fetchImpl(`${registry}${encodeURIComponent(targetName)}/latest`, {
      headers: { accept: 'application/json' },
      redirect: 'error',
      signal: signal,
    })
  } catch (e) {
    facts.detail = probeBrief((e && e.message) || e, 120)
    return facts
  }

  facts.stage = 'status'
  facts.httpStatus = response && typeof response.status === 'number' ? response.status : null
  if (!response || response.ok !== true) {
    facts.reason = 'not-ok'
    return facts
  }

  facts.stage = 'body'
  let text = ''
  try {
    text = await response.text()
  } catch (e) {
    facts.reason = 'body-threw'
    facts.detail = probeBrief((e && e.message) || e, 120)
    return facts
  }
  facts.bytes = Buffer.byteLength(text, 'utf8')
  if (facts.bytes > limits.maxBytes) {
    facts.reason = 'body-too-large'
    return facts
  }

  facts.stage = 'json'
  let value = null
  try {
    value = JSON.parse(text)
  } catch (e) {
    facts.reason = 'json-parse'
    facts.detail = probeBrief(text.slice(0, 60), 60)
    return facts
  }

  facts.stage = 'name'
  if (value.name !== targetName) {
    facts.reason = 'name-mismatch'
    facts.detail = probeBrief(value.name, 60)
    return facts
  }

  facts.stage = 'version'
  if (!(typeof value.version === 'string' && /^\d+\.\d+\.\d+$/.test(value.version))) {
    facts.reason = 'version-invalid'
    facts.detail = probeBrief(value.version, 40)
    return facts
  }

  facts.stage = 'engines'
  if (value.engines && value.engines.node !== undefined && typeof value.engines.node !== 'string') {
    facts.reason = 'engines-node-type'
    return facts
  }

  facts.stage = 'tarball'
  let tarball = null
  try {
    tarball = new URL(String(value.dist && value.dist.tarball))
  } catch (e) {
    facts.reason = 'tarball-url'
    facts.detail = probeBrief(value.dist && value.dist.tarball, 80)
    return facts
  }
  const wantPath = `/${targetName}/-/${targetName}-${value.version}.tgz`
  if (tarball.origin !== new URL(registry).origin) {
    facts.reason = 'tarball-origin'
    facts.detail = probeBrief(tarball.origin, 80)
    return facts
  }
  if (tarball.pathname !== wantPath) {
    facts.reason = 'tarball-path'
    facts.detail = probeBrief(tarball.pathname, 80)
    return facts
  }

  facts.stage = 'integrity'
  const integrity = value.dist && value.dist.integrity
  if (typeof integrity !== 'string') {
    facts.reason = 'integrity-missing'
    return facts
  }
  if (!new RegExp(limits.integrityPattern).test(integrity)) {
    facts.reason = 'integrity-shape'
    facts.detail = probeBrief(integrity, 40)
    return facts
  }

  facts.stage = 'ok'
  facts.reason = 'valid'
  return facts
}

/** 从更新包的回包形状里取错误码（没有就退成 unknown）。
 *  更新包的失败形状是 {ok:false, error:'<code>', errorKind}——error 是字符串，不是对象。 */
function errorCodeOf(res) {
  const error = res && res.error !== undefined && res.error !== null ? res.error : null
  if (typeof error === 'string') return error.slice(0, 40)
  const code = error && (error.code || error.message) ? String(error.code || error.message) : 'unknown'
  return code.slice(0, 40)
}

/**
 * 给「查更新」这条电话包一层：失败 → 重试一次 → 仍失败则跑探针并落日志。
 * 只包这一条：查状态与装更新各自有明确的失败语义，重试它们只会拖长用户的等待。
 */
export function wrapUpdateCheck(handler, deps) {
  const input = deps || {}
  const log = typeof input.log === 'function' ? input.log : function () {}
  const probe = typeof input.probe === 'function' ? input.probe : null
  const pluginId = input.pluginId || PLUGIN_ID
  return async function (args) {
    const first = await handler(args)
    if (first && first.ok === true) return first
    const reason = errorCodeOf(first)
    log('warn', 'update.check.retry', { attempt: 1, ok: false, reason: reason, pluginId: pluginId })
    let second = null
    try {
      second = await handler(args)
    } catch (e) {
      second = null
    }
    const recovered = !!(second && second.ok === true)
    log('warn', 'update.check.retry', { attempt: 2, ok: recovered, reason: reason, pluginId: pluginId })
    if (recovered) return second
    if (probe !== null) {
      try {
        const facts = await probe()
        log('warn', 'update.check.probe', {
          stage: facts.stage,
          httpStatus: facts.httpStatus,
          bytes: facts.bytes,
          reason: facts.reason,
          detail: facts.detail,
          pluginId: pluginId,
        })
      } catch (e) { /* 探针自己失败不该改变回给面板的结果 */ }
    }
    return second || first
  }
}

/** 宿主半装配入口：建日志库 → 建更新电话 → 合成电话表 → 注册通道。 */
export function apply(ctx) {
  const homeDir = dshHomeDir(process.env, homedir())
  const eventList = readEventList()

  const hostLog = createHostLog(
    {
      fs: createLogFileService(readFile, writeFile, mkdir, unlink, readdir),
      timer: ctx.get('timer'),
      getCacheDir: function () { return join(homeDir, 'logs') },
      getPlatform: function () { return { os: process.platform, path: { join: join }, fs: null } },
      DEFAULT_CWD: process.cwd(),
    },
    { pluginId: PLUGIN_ID, prefix: PHONE_PREFIX, logDirName: LOG_DIR_NAME, switchFileName: SWITCH_FILE_NAME, eventList: eventList }
  )

  const registry = new Map()
  registerHostLogPhones(registry, hostLog)

  // 日志目录 + 开关文件在装配时就备好：不做的话，首次运行读开关会记一条 readBack 误报，
  // 且首次 setSwitch 会因父目录不存在而静默失败（详见 prepareLogHome 注释）
  const logCacheDir = join(homeDir, 'logs')
  const logHomeReady = prepareLogHome(hostLog.store, logCacheDir)
  if (logHomeReady && typeof logHomeReady.catch === 'function') {
    logHomeReady.catch(function () { /* 备目录失败不阻断装配：store 自己会记 persistSwitch/write-fail */ })
  }

  const update = createHostUpdate(
    { ctx: ctx, logCtx: { fire: function (level, event, fields) { return hostLog.store.log(level, event, fields) } }, readerOverrides: { runningVersion: runningVersion } },
    { pluginId: PLUGIN_ID, prefix: PHONE_PREFIX, targetPackageName: TARGET_PACKAGE_NAME }
  )
  for (const phoneName of Object.keys(update.handlers)) registry.set(phoneName, update.handlers[phoneName])

  // 查更新外面再包一层：失败重试一次，仍失败就跑探针把真实原因落日志。
  // 电话名从更新包派生（本文件不写字面量），装更新与查状态两条保持原样。
  const updateCheckPhone = buildPhoneNames(PHONE_PREFIX).updateCheck
  const rawUpdateCheck = registry.get(updateCheckPhone)
  if (typeof rawUpdateCheck === 'function') {
    registry.set(updateCheckPhone, wrapUpdateCheck(rawUpdateCheck, {
      log: function (level, event, fields) {
        try { hostLog.store.log(level, event, fields) } catch (e) { /* 忽略 */ }
      },
      probe: function () { return probeRelease(globalThis.fetch, { targetPackageName: TARGET_PACKAGE_NAME }) },
      pluginId: PLUGIN_ID,
    }))
  }

  const fail = function (stage, reason) {
    try { hostLog.store.log('error', 'host.channel.fail', { stage: stage, path: ROUTE_PATH, reason: String(reason).slice(0, 120) }) } catch (e) { /* 忽略 */ }
  }

  const dispatch = async function (phoneName, args) {
    const handler = registry.get(phoneName)
    if (typeof handler !== 'function') {
      return { ok: false, error: { code: 'internal', message: 'unknown phone: ' + phoneName, details: {} } }
    }
    try {
      return { ok: true, value: await handler(args === null || args === undefined ? {} : args) }
    } catch (e) {
      fail('dispatch', String((e && e.message) || e))
      return { ok: false, error: { code: 'internal', message: String((e && e.message) || e), details: {} } }
    }
  }

  const routeFetch = async function (request) {
    if (!request || request.method !== 'POST') return new Response('method not allowed', { status: 405 })
    let body = null
    try { body = await request.json() } catch (e) { return new Response('body is not JSON', { status: 400 }) }
    const rpcId = typeof (body && body.rpcId) === 'string' && RPC_ID_PATTERN.test(body.rpcId) ? body.rpcId : 'invalid-request'
    const reply = function (result) { return Response.json({ type: 'server-response', rpcId: rpcId, result: result }) }
    const reject = function (why) { return reply({ ok: false, error: { code: 'gateway/bad-request', message: why, details: {} } }) }
    if (!body || body.type !== 'client-request') return reject('invalid client-request message')
    const call = body.payload
    if (call === null || typeof call !== 'object') return reject('missing call payload')
    const phoneName = call.method
    if (typeof phoneName !== 'string' || !ENDPOINT_PATTERN.test(phoneName)) return reject('invalid phone name')
    const pathname = String((request.url && request.url.split('?')[0]) || '')
    if (!pathname.endsWith(ROUTE_PATH)) return reject('request path is not on route ' + ROUTE_PATH)
    return reply(await dispatch(phoneName, call.payload))
  }

  try {
    const connection = ctx.get('connection')
    const fetchRegistry = connection === undefined || connection === null ? undefined : connection.fetch
    if (fetchRegistry === undefined || typeof fetchRegistry.register !== 'function') {
      fail('register', 'connection.fetch.register-missing')
      return
    }
    fetchRegistry.register({ path: ROUTE_PATH, methods: ['POST'], requestBody: 'buffered', fetch: routeFetch })
  } catch (e) {
    const message = String((e && e.message) || e)
    // 重复注册（live patch reload / 回滚重放）算让位：那个实例继续服务即可，不当故障。
    if (message.indexOf('already registered') >= 0 || message.indexOf('duplicate') >= 0) return
    fail('register', message)
  }
}
