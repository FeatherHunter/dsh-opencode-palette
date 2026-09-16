// font-avail.mjs — 本机字体可用性判定（宽度对比法；document 以参数注入，可在 node 直接测）
//
// 为什么不用 document.fonts.check()：它对「没有声明 @font-face 的家族名」一律返回 true
// （实测连 __dsh_palette_absent_font__ 这种确定不存在的名字也是 true），只有「已声明但尚未
// 加载」才返回 false —— 拿它判「本机是否装了某字体」永远判不出缺失（全部显示「本地」）。
//
// 宽度对比法：同一段探针文本，分别用「候选家族」与一个确定不存在的家族量宽。候选家族缺字时
// 会和后者回退到同一个字体 → 同宽 = 本机未装；不同宽 = 本机确有该字体。
//
// 保守性：量不出来（SSR / 无 document / 无布局 / 抛异常）时一律返回「可用」，
// 宁可漏提示也不误判成缺失、不把可用字体灰掉。
export const FONT_PROBE_TEXT = 'mmmmwwwwMMMM'
export const FONT_PROBE_ABSENT = '__dsh_palette_absent_font__'
export const FONT_PROBE_SIZE = 64

// createFontAvailability(resolveDoc, bundledFonts) → isFontAvailable(family)
//   resolveDoc: () => document|undefined —— 惰性取宿主 document（SSR / 模块早于 DOM 就绪都安全）
//   bundledFonts: 随包内联 @font-face 的家族名列表（恒可用，不量宽）
export function createFontAvailability(resolveDoc, bundledFonts) {
  const cache = Object.create(null)

  function measure(family) {
    const doc = resolveDoc && resolveDoc()
    if (!doc || typeof doc.createElement !== 'function') return null
    const host = doc.body || doc.documentElement
    if (!host || typeof host.appendChild !== 'function') return null
    const span = doc.createElement('span')
    span.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;white-space:pre;font-size:' + FONT_PROBE_SIZE + 'px;font-weight:400;font-style:normal;letter-spacing:0;font-feature-settings:normal'
    // 家族名必须用配对的引号整体包住（引号写错 → 整条声明被浏览器静默丢弃 → 所有字体都量成回退宽度，
    // 于是全部被误判成「未装」）。两端统一用双引号，赋不上值就直接返回 null 交给调用方保守处理。
    span.style.fontFamily = '"' + family + '"'
    if (span.style.fontFamily === '') return null // 声明没生效（家族名含引号等）→ 交给调用方保守处理
    span.textContent = FONT_PROBE_TEXT
    host.appendChild(span)
    let w = null
    try {
      w = span.getBoundingClientRect ? span.getBoundingClientRect().width : null
    } finally {
      if (typeof host.removeChild === 'function') host.removeChild(span)
    }
    return typeof w === 'number' && w > 0 ? w : null
  }

  return function isFontAvailable(family) {
    try {
      if (bundledFonts && bundledFonts.indexOf(family) >= 0) return true
      if (family in cache) return cache[family]
      const absent = measure(FONT_PROBE_ABSENT)
      const actual = measure(family)
      // 量不出来 → 保守可用，且不写缓存（环境后续可能就绪）
      if (absent === null || actual === null) return true
      const ok = Math.abs(actual - absent) >= 0.01
      cache[family] = ok
      return ok
    } catch (e) { return true }
  }
}
