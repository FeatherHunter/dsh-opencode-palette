/**
 * runtime/update-panel.mjs — 面板「检查更新」的状态机（纯逻辑：不碰 React、不碰 DOM、不碰全局宿主）
 *
 * 三条口径（沿用更新包 README 与规格）：
 *   1. 「待重启」只认宿主当场算出的原因码 pending-restart，不自己比较版本号；
 *   2. 打开面板只静默读一次本地状态（只读、不联网）；联网只在用户亲手点「检查更新」时发生一次；
 *   3. 有新版才开弹窗；无新版只回一句「已是最新」，不弹窗、不打扰。
 *
 * 电话名与轮询间隔由调用方从更新包的客户端入口派生后传进来（本文件不写字面量）。
 */

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

/** 按钮状态：UI 据此选词条，不在渲染里堆条件。 */
export function buttonState(state) {
  if (state.installing) return 'installing'
  if (state.checking) return 'checking'
  if (state.pending) return 'pending'
  if (state.hasNew) return 'hasNew'
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
      pluginId: 'dsh-opencode-palette',
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
        pluginId: 'dsh-opencode-palette',
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
    if (state.hasNew && state.checkId) { patch({ dialogOpen: true, failure: null }); return 'new' }
    patch({ checking: true, failure: null })
    try {
      const res = await invoke(phones.updateCheck, {})
      patch({ checking: false })
      if (!res || res.ok !== true) { return 'failed' }
      const facts = absorb(res)
      if (facts.canInstall) { patch({ dialogOpen: true }); return 'new' }
      if (facts.pending) return 'latest'
      return 'latest'
    } catch (e) {
      patch({ checking: false })
      transportFail(phones.updateCheck, 'throw', e)
      return 'failed'
    }
  }

  /** 弹窗里的「立即升级」。 */
  async function install() {
    if (!state.available || state.installing) return false
    if (!state.checkId) return false
    patch({ installing: true, failure: null })
    const requestId = 'req-' + String(Date.now()) + '-' + String(Math.floor(Math.random() * 100000))
    try {
      const res = await invoke(phones.updateInstall, { checkId: state.checkId, requestId: requestId })
      patch({ installing: false })
      if (res && res.ok === true) {
        absorb(res)
        patch({ dialogOpen: false })
        return true
      }
      const facts = readSnapshot(res)
      patch({ blocked: facts.blocked || state.blocked, failure: 'install-failed' })
      await readStatus()
      return false
    } catch (e) {
      patch({ installing: false, failure: 'install-failed' })
      transportFail(phones.updateInstall, 'throw', e)
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
    install: install,
    openDialog: function () { patch({ dialogOpen: true }) },
    closeDialog: function () { patch({ dialogOpen: false, failure: null }) },
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
