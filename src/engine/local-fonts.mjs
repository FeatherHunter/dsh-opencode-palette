// local-fonts.mjs — 本机字体清单：取（queryLocalFonts）→ 去重 → 等宽判定 → 候选分级
//
// document / window 与等宽测量句柄都以参数注入，保持引擎层可在 node 里直接跑（与 font-avail.mjs 同策）。
//
// 浏览器侧的三道门（实测于真实宿主，见 issue #11 证据表）：
//   1) 必须真实用户手势：click → await 别的东西 → queryLocalFonts 会丢手势（SecurityError）；
//   2) 必须已授权 local-fonts：拒绝抛 NotAllowedError；
//   3) 页面必须可见：窗口不可见抛 SecurityError。
// 另有「被自动拒绝时不抛错、直接返回空数组」这种宿主行为，故空数组不能一律说成「本机没字体」，
// 要用 Permissions API 的状态区分（reason 取值见下）。

import { FONTS } from './map-dsh.mjs'
import { quoteFontFamily } from './font-names.mjs'

// 等宽判定探针：必须含「窄 + 宽」两类字符 —— 比例字体里 i 与 W 宽度差得很远，
// 等宽字体里两者逐像素同宽；只用单一种窄字符（如 iiiii）判不出任何东西。
export const MONO_PROBE_TEXT = 'iiiiWWWW'
export const MONO_PROBE_SIZE = 32
// 等宽测量的数量上限：清单通常 200–400 条，超出部分不再量（省掉每条一次布局），
// 只是排在「等宽优先」后面，仍可正常选用
export const MONO_MEASURE_LIMIT = 400

// 不可枚举/取不到清单的原因（面板按它给不同人话提示）
export const FONT_ENUM_UNAVAILABLE = 'unavailable' // 宿主平台没有这个 API（Firefox / Safari / 非安全上下文）
export const FONT_ENUM_DENIED = 'denied'           // 用户或宿主拒绝了授权（NotAllowedError / 权限态 denied）
export const FONT_ENUM_BLOCKED = 'blocked'         // 手势 / 页面可见性等 SecurityError
export const FONT_ENUM_EMPTY = 'empty'             // 授了权也调得通，但没拿到任何字体（含被自动拒绝返回空数组）
export const FONT_ENUM_FAILED = 'failed'           // 其它异常（兜底，绝不把异常抛给面板）

function reasonOfError(err) {
  const name = err && err.name
  if (name === 'NotAllowedError') return FONT_ENUM_DENIED
  if (name === 'SecurityError') return FONT_ENUM_BLOCKED
  return FONT_ENUM_FAILED
}

// queryLocalFonts 的权限态（'granted' / 'denied' / 'prompt'），拿不到就解析成 null
function permissionState(nav) {
  try {
    const perms = nav && nav.permissions
    if (!perms || typeof perms.query !== 'function') return Promise.resolve(null)
    const p = perms.query({ name: 'local-fonts' })
    if (!p || typeof p.then !== 'function') return Promise.resolve(null)
    return p.then(function (st) { return (st && st.state) || null }, function () { return null })
  } catch (e) { return Promise.resolve(null) }
}

// collectLocalFonts(scope, opts) → { ok, fonts, reason }
//   scope: { queryLocalFonts?, navigator?, document? }（浏览器里直接传 window）
//   opts.measureMono(families): (families) => { family: true }（默认见 measureMonospaceFonts）
//   opts.onCalled(): 枚举调用**同步发起后立刻**回调（无参）。用来验证「调用确实落在用户手势的
//     同步段里」——一旦有人把调用挪到 await 之后，手势就丢了，这个信号会先于失败出现（见 #11 三道门）。
//   调用必须在真实用户手势里**同步发起**（本函数同步发起调用，返回 promise）。
//   不抛异常：所有失败都收敛成 reason，面板据此决定提示文案。
export function collectLocalFonts(scope, opts) {
  const settings = opts || {}
  const win = scope || {}
  const query = win.queryLocalFonts
  if (typeof query !== 'function') {
    return Promise.resolve({ ok: false, fonts: [], reason: FONT_ENUM_UNAVAILABLE })
  }
  let raw
  try {
    // 同步发起：调用发生在手势事件处理器的同步段里，await 之后就不算手势了
    raw = query.call(win)
    if (typeof settings.onCalled === 'function') settings.onCalled()
  } catch (err) {
    if (typeof settings.onCalled === 'function') settings.onCalled(err)
    return Promise.resolve({ ok: false, fonts: [], reason: reasonOfError(err) })
  }
  return Promise.resolve(raw).then(function (list) {
    const families = dedupeFamilies(list)
    if (families.length === 0) {
      // 空清单有两种来源：本机真没字体 / 宿主静默拒绝。用权限态区分，别一口咬定「没字体」。
      return permissionState(win.navigator).then(function (state) {
        return { ok: false, fonts: [], reason: state === 'denied' ? FONT_ENUM_DENIED : FONT_ENUM_EMPTY }
      })
    }
    return families
  }, function (err) {
    return { ok: false, fonts: [], reason: reasonOfError(err) }
  }).then(function (value) {
    // 成功路径拿到的是裸数组，失败路径是结果对象（在上一段收敛）
    if (!Array.isArray(value)) return value
    const measure = settings.measureMono || function (list) { return measureMonospaceFonts(win.document, list) }
    let mono = {}
    // 只量前 MONO_MEASURE_LIMIT 款：清单通常 200–400 条，超出部分不量（省掉每条一次布局），
    // 只是排在「等宽优先」后面，仍可正常选用
    try { mono = measure(value.slice(0, MONO_MEASURE_LIMIT)) || {} } catch (e) { mono = {} }
    // 等宽置顶（不按名字猜，靠实测宽度），组内按字母序；非等宽同样列出可选
    const fonts = value.slice().sort(function (a, b) {
      const d = (mono[a] ? 0 : 1) - (mono[b] ? 0 : 1)
      return d !== 0 ? d : a.localeCompare(b)
    })
    return { ok: true, fonts: fonts, mono: mono, reason: null }
  })
}

// 按 family 去重（一个族通常返回多份 style/bold/italic 记录，下拉只列族名一次）
export function dedupeFamilies(list) {
  const out = []
  const seen = Object.create(null)
  if (!list) return out
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    // FontData 的族名字段是 family；个别环境可能只给 fullName，兜底取它
    const name = item && typeof item === 'object'
      ? (typeof item.family === 'string' && item.family !== '' ? item.family
        : (typeof item.fullName === 'string' ? item.fullName : null))
      : null
    if (typeof name !== 'string') continue
    const key = name.trim()
    if (key === '' || seen[key]) continue
    seen[key] = true
    out.push(key)
  }
  return out
}

// measureMonospaceFonts(doc, families) → { family: true }
//   canvas 实测量宽：探针文本里所有窄字符同宽 = 等宽。长度少于 2 的家族名不量（画布量不出有意义的差别）。
//   量不了（无 document / 无 canvas / 抛异常）就返回空表 —— 面板按「未判为等宽」处理，绝不误标。
export function measureMonospaceFonts(doc, families) {
  const result = Object.create(null)
  const list = families || []
  if (!doc || typeof doc.createElement !== 'function') return result
  let ctx = null
  try {
    const canvas = doc.createElement('canvas')
    ctx = canvas && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null
  } catch (e) { ctx = null }
  if (!ctx || typeof ctx.measureText !== 'function') return result
  for (let i = 0; i < list.length; i++) {
    const family = list[i]
    if (typeof family !== 'string' || family.length < 2) continue
    let widths = null
    try {
      ctx.font = MONO_PROBE_SIZE + 'px ' + quoteFontFamily(family)
      widths = []
      for (let c = 0; c < MONO_PROBE_TEXT.length; c++) {
        widths.push(ctx.measureText(MONO_PROBE_TEXT.charAt(c)).width)
      }
    } catch (e) { continue }
    if (!widths || widths.length < MONO_PROBE_TEXT.length) continue
    let mono = true
    for (let w = 1; w < widths.length; w++) {
      if (Math.abs(widths[w] - widths[0]) >= 0.01) { mono = false; break }
    }
    if (mono) result[family] = true
  }
  return result
}

// buildFontCandidates(localFamilies, isFontAvailable, monoMap, presetOrder, bundledFonts) → 候选清单
//   一条候选：{ key, isPreset, isLocal, bundled, ok, installed, mono, stack }
//     isPreset  在预设表里（置顶「常用预设」分区）
//     isLocal   在本机枚举结果里（本地分区的成员资格以枚举为准）
//     bundled   随包内联 @font-face，恒可用（面板据此不标「未装」）
//     ok        可用（本地枚举或宽度对比法判定；bundled 恒真）
//     installed ok && !bundled —— 即「确实在本机装过」，可直接写「已装」；bundled 的恒可用但不必说「本机装了」
//     mono      等宽（canvas 实测；没量到就是 false）
//     stack     该项自己的回退栈（预设查表；自定义族名 = null，由 codeFontStack 合成）
//   排序：预设按传入顺序在前，本机字体按传入顺序（已被 collectLocalFonts 排成「等宽置顶 + 字母序」）在后。
export function buildFontCandidates(localFamilies, isFontAvailable, monoMap, presetOrder, bundledFonts) {
  const available = typeof isFontAvailable === 'function' ? isFontAvailable : function () { return true }
  const bundled = bundledFonts || []
  const mono = monoMap || {}
  const locals = []
  const localSeen = Object.create(null)
  for (const name of (localFamilies || [])) {
    if (typeof name !== 'string') continue
    const key = name.trim()
    if (key === '' || localSeen[key]) continue
    localSeen[key] = true
    locals.push(key)
  }
  const presets = (presetOrder && presetOrder.length ? presetOrder : Object.keys(FONTS))
  const out = []
  const taken = Object.create(null)
  for (const key of presets) {
    if (taken[key]) continue
    taken[key] = true
    const isBundled = bundled.indexOf(key) >= 0
    // 随包字体恒可用；其余预设靠宽度对比法探；本机字体不需要探（枚举到即存在，见下）
    const ok = isBundled ? true : available(key)
    out.push({
      key: key,
      isPreset: true,
      isLocal: locals.indexOf(key) >= 0,
      bundled: isBundled,
      ok: ok,
      installed: ok && !isBundled,
      mono: !!mono[key],
      stack: FONTS[key],
    })
  }
  for (const key of locals) {
    if (taken[key]) continue
    taken[key] = true
    out.push({
      key: key,
      isPreset: false,
      isLocal: true,
      bundled: false,
      ok: true,
      installed: true,
      mono: !!mono[key],
      stack: null,
    })
  }
  return out
}
