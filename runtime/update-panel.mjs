/**
 * runtime/update-panel.mjs — 面板「检查更新」的状态机（纯逻辑：不碰 React、不碰 DOM、不碰全局宿主）
 *
 * 三条口径（沿用更新包 README 与规格，#41 起进面板自动查一次）：
 *   1. 「待重启」只认宿主当场算出的原因码 pending-restart，不自己比较版本号；
 *   2. 打开面板自动联网检查一次（静默：只变按钮，不自动弹窗）；失败/无新版静默保持原样；
 *      用户亲手点「检查更新」/红色「有新版本」时才允许弹窗；
 *   3. 有新版只变按钮（红字“有新版本”），点按钮才开弹窗；无新版只回一句「已是最新」，不弹窗、不打扰。
 *
 * 电话名与轮询间隔由调用方从更新包的客户端入口派生后传进来（本文件不写字面量）。
 */

/** 与 runtime/channel.mjs 的 PLUGIN_ID 同值：本文件是纯逻辑模块，不引运行时模块，故就地声明一次。 */
const PLUGIN_ID = 'dsh-opencode-palette'

/** 宿主回包 → 面板要的几个事实（纯函数，便于离线核对）。 */
export function readSnapshot(res) {
  const snap = res && res.snapshot ? res.snapshot : null
  const job = snap && snap.job ? snap.job : null
  const text = function (value) { return typeof value === 'string' ? value : '' }
  return {
    job: job,
    jobState: job && job.state ? String(job.state) : null,
    jobMessage: job && job.message ? String(job.message) : null,
    blocked: snap && snap.blockedReason ? String(snap.blockedReason) : null,
    pending: !!(snap && snap.blockedReason === 'pending-restart'),
    running: snap ? text(snap.runningVersion) : '',
    installed: snap ? text(snap.installedVersion) : '',
    latest: snap && text(snap.latestVersion) ? text(snap.latestVersion) : null,
    canInstall: !!(snap && snap.canInstall === true && text(snap.latestVersion)),
    hasManual: !!(res && Object.prototype.hasOwnProperty.call(res, 'manual')),
    manual: res ? res.manual : null,
    checkId: res && res.receipt && res.receipt.checkId ? String(res.receipt.checkId) : null,
  }
}

/** 按钮状态：UI 据此选词条，不在渲染里堆条件。
 * 优先级（#41 用户拍板）：正在升级 > 待重启 > 有新版本 > 检查中 > 空闲。 */
export function buttonState(state) {
  if (state.installing) return 'installing'
  if (state.pending) return 'pending'
  if (state.hasNew) return 'hasNew'
  if (state.checking) return 'checking'
  return 'idle'
}

/** 装不了的原因码 → 一句话人话的 i18n 键（更新包 README 第 8 节八种）。 */
export function blockedReasonKey(code) {
  const known = [
    'unknown-profile',
    'source-install',
    'invalid-installation',
    'installation-changed',
    'pending-restart',
    'registry-conflict',
    'incompatible-node',
    'recovery-required',
  ]
  return known.indexOf(String(code)) >= 0 ? 'blocked.' + code : 'blocked.unknown'
}

/**
 * 建更新控制器。
 * @param {object} deps
 * @param {((phone: string, args: object) => Promise<object>)|null} deps.call 宿主桥（不可用时整块降级）
 * @param {{updateStatus: string, updateCheck: string, updateInstall: string}} deps.phones 电话名（从更新包派生）
 * @param {number} deps.pollMs 安装中轮询间隔（从更新包派生）
 * @param {(level: string, event: string, fields: object) => void} [deps.log] 记一行日志
 * @param {(fn: () => void, ms: number) => unknown} [deps.setTimer] / @param {(id: unknown) => void} [deps.clearTimer]
 */
export function createUpdateController(deps) {
  const input = deps || {}
  const call = typeof input.call === 'function' ? input.call : null
  const phones = input.phones || null
  const pollMs = typeof input.pollMs === 'number' && input.pollMs > 0 ? input.pollMs : 1000
  const log = typeof input.log === 'function' ? input.log : function () {}
  const setTimer = typeof input.setTimer === 'function' ? input.setTimer : setTimeout
  const clearTimer = typeof input.clearTimer === 'function' ? input.clearTimer : clearTimeout

  let state = {
    available: !!(call && phones && phones.updateStatus),
    checking: false,
    installing: false,
    dialogOpen: false,
    running: '',
    installed: '',
    latest: null,
    hasNew: false,
    canInstall: false,
    blocked: null,
    manual: null,
    checkId: null,
    jobState: null,
    jobMessage: null,
    pending: false,
    failure: null,
    // 弹窗外的可见结果（{key, kind} 或 null）：失败与「装好了但没进待重启」都走这里，
    // 否则用户点一下没动静，看不出是成功、失败还是没反应（2026-09-30 真机反馈）。
    notice: null,
  }
  let pollTimer = null
  const listeners = []

  function emit() {
    for (let i = 0; i < listeners.length; i = i + 1) {
      try { listeners[i]() } catch (e) { /* 订阅者自己的错不影响状态机 */ }
    }
  }
  function patch(next) {
    state = Object.assign({}, state, next)
    emit()
  }
  function record(level, event, fields, latencyMs) {
    try { log(level, event, fields) } catch (e) { /* 忽略 */ }
  }
  /** 回包里的错误码（宿主半判词，如 invalid-release / check-failed）；取不到就退成 unknown。
   *  更新包的失败形状是 {ok:false, error:'<code>', errorKind}——error 是字符串，不是对象。 */
  function codeOf(res) {
    const error = res && res.error !== undefined && res.error !== null ? res.error : null
    if (typeof error === 'string') return error.slice(0, 40)
    const code = error && (error.code || error.message) ? String(error.code || error.message) : 'unknown'
    return code.slice(0, 40)
  }
  function stopPolling() {
    if (pollTimer !== null) {
      try { clearTimer(pollTimer) } catch (e) { /* 忽略 */ }
      pollTimer = null
    }
  }
  function startPolling() {
    stopPolling()
    pollTimer = setTimer(function () {
      pollTimer = null
      void readStatus()
    }, pollMs)
  }

  /** 把一次宿主回包并进状态（不弹窗、不提示，纯收状态）。 */
  function absorb(res) {
    const facts = readSnapshot(res)
    patch({
      running: facts.running || state.running,
      installed: facts.installed || state.installed,
      latest: facts.latest,
      hasNew: facts.canInstall,
      canInstall: facts.canInstall,
      blocked: facts.blocked,
      pending: facts.pending,
      jobState: facts.jobState,
      jobMessage: facts.jobMessage,
      checkId: facts.checkId || state.checkId,
      manual: facts.hasManual ? facts.manual : state.manual,
    })
    if (facts.jobState === 'installing' || facts.jobState === 'verifying') startPolling()
    else stopPolling()
    return facts
  }

  function transportFail(phone, kind, error) {
    record('warn', 'host.call.fail', {
      method: phone,
      kind: kind,
      errorHash: hash8(String((error && error.message) || error || kind)),
      pluginId: PLUGIN_ID,
    })
  }

  async function invoke(phone, args) {
    const startedAt = Date.now()
    const res = await call(phone, args)
    if (res && res.ok === true) {
      record('info', 'host.call', {
        method: phone,
        latencyMs: Date.now() - startedAt,
        ok: true,
        kind: String((args && args.kind) || phone),
        pluginId: PLUGIN_ID,
      })
    } else {
      transportFail(phone, 'not-ok', (res && res.error) || 'not-ok')
    }
    return res
  }

  /** 打开面板时的静默读（本地、不联网）。 */
  async function readStatus() {
    if (!state.available || state.checking || state.installing) return null
    try {
      const res = await invoke(phones.updateStatus, {})
      if (res && res.ok === true) { absorb(res); return res }
      return null
    } catch (e) {
      transportFail(phones.updateStatus, 'throw', e)
      return null
    }
  }

  /** 用户亲手点的检查（联网一次）。回 'new' | 'latest' | 'failed'。 */
  async function check() {
    if (!state.available) return 'failed'
    if (state.checking || state.installing) return 'busy'
    // 已查到有新版且凭证还在：直接开弹窗，不重复联网
    if (state.hasNew && state.checkId) { patch({ dialogOpen: true, failure: null, notice: null }); return 'new' }
    patch({ checking: true, failure: null, notice: null })
    record('info', 'update.check.start', { trigger: 'manual', pluginId: PLUGIN_ID })
    const startedAt = Date.now()
    try {
      const res = await invoke(phones.updateCheck, {})
      patch({ checking: false })
      if (!res || res.ok !== true) {
        const code = codeOf(res)
        record('warn', 'update.check.fail', { trigger: 'manual', code: code, errorHash: hash8(code), pluginId: PLUGIN_ID })
        patch({ notice: { key: 'updateCheckFail', kind: 'error' } })
        return 'failed'
      }
      const facts = absorb(res)
      record('info', 'update.check.ok', {
        trigger: 'manual', hasNew: facts.canInstall, latest: facts.latest || '',
        latencyMs: Date.now() - startedAt, pluginId: PLUGIN_ID,
      })
      if (facts.canInstall) { patch({ dialogOpen: true }); return 'new' }
      if (facts.pending) return 'latest'
      return 'latest'
    } catch (e) {
      patch({ checking: false })
      transportFail(phones.updateCheck, 'throw', e)
      record('warn', 'update.check.fail', {
        trigger: 'manual', code: 'transport', errorHash: hash8(String((e && e.message) || e)), pluginId: PLUGIN_ID,
      })
      patch({ notice: { key: 'updateCheckFail', kind: 'error' } })
      return 'failed'
    }
  }

  /** 进面板时的静默检查（联网一次，但只变按钮、不自动弹窗）。
   * 回 'new' | 'latest' | 'failed' | 'busy'。失败静默：不弹窗、不置 failure 文案。 */
  async function checkSilently() {
    if (!state.available) return 'failed'
    if (state.checking || state.installing) return 'busy'
    // 磁盘已有新版（待重启）无需再联网；已有新版凭证也无需重复联网
    if (state.pending) return 'latest'
    if (state.hasNew && state.checkId) return 'new'
    patch({ checking: true, failure: null })
    record('info', 'update.check.start', { trigger: 'auto', pluginId: PLUGIN_ID })
    const startedAt = Date.now()
    try {
      const res = await invoke(phones.updateCheck, {})
      patch({ checking: false })
      if (!res || res.ok !== true) {
        const code = codeOf(res)
        record('warn', 'update.check.fail', { trigger: 'auto', code: code, errorHash: hash8(code), pluginId: PLUGIN_ID })
        return 'failed'
      }
      const facts = absorb(res)
      record('info', 'update.check.ok', {
        trigger: 'auto', hasNew: facts.canInstall, latest: facts.latest || '',
        latencyMs: Date.now() - startedAt, pluginId: PLUGIN_ID,
      })
      if (facts.canInstall) return 'new'
      return 'latest'
    } catch (e) {
      patch({ checking: false })
      transportFail(phones.updateCheck, 'throw', e)
      record('warn', 'update.check.fail', {
        trigger: 'auto', code: 'transport', errorHash: hash8(String((e && e.message) || e)), pluginId: PLUGIN_ID,
      })
      return 'failed'
    }
  }

  /** 打开面板时调用：先本地读一次，再静默联网查一次（#41）。
   * 待重启/安装中/检查中时跳过联网，避免打扰。 */
  async function autoCheckOnOpen() {
    await readStatus()
    if (!state.available) return null
    if (state.pending || state.installing || state.checking) return null
    if (state.hasNew && state.checkId) return 'new'
    return checkSilently()
  }

  /** 弹窗里的「立即升级」。 */
  async function install() {
    if (!state.available || state.installing) return false
    if (!state.checkId) return false
    patch({ installing: true, failure: null, notice: null })
    record('info', 'update.install.start', { latest: String(state.latest || ''), pluginId: PLUGIN_ID })
    const requestId = 'req-' + String(Date.now()) + '-' + String(Math.floor(Math.random() * 100000))
    try {
      const res = await invoke(phones.updateInstall, { checkId: state.checkId, requestId: requestId })
      patch({ installing: false })
      if (res && res.ok === true) {
        const facts = absorb(res)
        patch({ dialogOpen: false })
        record('info', 'update.install.ok', {
          latest: String((facts && facts.latest) || state.latest || ''),
          pending: !!(facts && facts.pending),
          pluginId: PLUGIN_ID,
        })
        // 待重启由常驻横幅承接；万一没进待重启，至少留一句「重启后生效」，别让用户对着没动静的按钮猜
        if (!(facts && facts.pending)) patch({ notice: { key: 'updateRestartHint', kind: 'warn' } })
        return true
      }
      const facts = readSnapshot(res)
      const code = codeOf(res)
      patch({ blocked: facts.blocked || state.blocked, failure: 'install-failed' })
      record('warn', 'update.install.fail', { code: code, errorHash: hash8(code), pluginId: PLUGIN_ID })
      patch({ notice: { key: facts.blocked ? blockedReasonKey(facts.blocked) : 'updateFailInstall', kind: 'error' } })
      await readStatus()
      return false
    } catch (e) {
      patch({ installing: false, failure: 'install-failed' })
      transportFail(phones.updateInstall, 'throw', e)
      record('warn', 'update.install.fail', {
        code: 'transport', errorHash: hash8(String((e && e.message) || e)), pluginId: PLUGIN_ID,
      })
      patch({ notice: { key: 'updateFailInstall', kind: 'error' } })
      try { await readStatus() } catch (e2) { /* 忽略 */ }
      return false
    }
  }

  return {
    getState: function () { return Object.assign({}, state) },
    subscribe: function (fn) {
      listeners.push(fn)
      return function () {
        const i = listeners.indexOf(fn)
        if (i >= 0) listeners.splice(i, 1)
      }
    },
    readStatus: readStatus,
    check: check,
    checkSilently: checkSilently,
    autoCheckOnOpen: autoCheckOnOpen,
    install: install,
    openDialog: function () { patch({ dialogOpen: true }) },
    closeDialog: function () { patch({ dialogOpen: false, failure: null }) },
    /** 面板其它部件（如日志开关）也能借这行可见提示，别让它们的失败静默掉。 */
    setNotice: function (key, kind) { patch({ notice: key ? { key: key, kind: kind || 'error' } : null }) },
    dispose: function () { stopPolling(); listeners.length = 0 },
  }
}

/** 与日志包同款的 8 位散列（失败只记散列，不记原文）。 */
export function hash8(value) {
  try {
    const text = String(value || '')
    let h = 5381
    for (let i = 0; i < text.length; i = i + 1) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0
    return ('0000000' + h.toString(16)).slice(-8)
  } catch (e) {
    return '00000000'
  }
}
