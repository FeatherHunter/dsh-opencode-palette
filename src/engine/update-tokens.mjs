// update-tokens.mjs — opencode 主题 → dsh-plugin-update@0.7.0 themeTokens（弹窗换肤一等口径）
// 只填颜色 22 键；字体/阴影/圆角/入口尺寸沿用包默认与 sizing 参数（主题无对应槽位，不伪造；
// 按钮尺寸走 mountUpdateEntry 的 sizing 正式参数，与 themeTokens 的 entry* 同组变量二选一，只留 sizing）。
// 颜色只出 hex（包内 isThemeColorValue 只收 #rgb/#rrggbb/#rrggbbaa 或英文单词；rgba 会挂载即抛）。
// 状态底色用 shade() 在 hex 内调出深浅 tint，不用 withAlpha（rgba 过不了颜色校验）。
// 外观与 syncAppearanceForTheme 同口径：透光主题（画布委托）走 light，否则走 dark；system 无色直接 undefined（零回归）。
import { getThemeJson, isSystem } from './registry.mjs'
import { resolveThemeColors, shade, isDelegatedSurface } from './resolve.mjs'
function hexOf(v) {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(t)) return t.toUpperCase()
  return undefined
}
function tinted(base, darkMode) {
  if (!base) return undefined
  try {
    return hexOf(shade(base, darkMode ? -0.72 : 0.82))
  } catch (e) {
    return undefined
  }
}
function deepened(base) {
  if (!base) return undefined
  try {
    return hexOf(shade(base, -0.18))
  } catch (e) {
    return undefined
  }
}
export function buildUpdateTokens(name) {
  if (isSystem(name)) return undefined
  const json = getThemeJson(name)
  if (!json) return undefined
  const dark = resolveThemeColors(json, 'dark')
  const light = resolveThemeColors(json, 'light')
  let translucent = false
  try {
    translucent = isDelegatedSurface(dark, light)
  } catch (e) {
    translucent = false
  }
  const colors = translucent ? light : dark
  const darkMode = !translucent
  const text = hexOf(colors.text)
  const primary = hexOf(colors.primary)
  if (!text || !primary) return undefined
  const textMuted = hexOf(colors.textMuted) || text
  const bgPanel = hexOf(colors.backgroundPanel)
  const bgBase = hexOf(colors.background)
  const bgElem = hexOf(colors.backgroundElement)
  const bg = bgPanel || bgBase || bgElem
  if (!bg) return undefined
  let bgSoft = undefined
  if (bgBase && bgBase !== bg) bgSoft = bgBase
  else if (bgElem && bgElem !== bg) bgSoft = bgElem
  else bgSoft = bg
  const border = hexOf(colors.border) || textMuted
  const borderStrong = hexOf(colors.borderActive) || border
  const buttonBg = bgElem || bg
  const success = hexOf(colors.success) || primary
  const warning = hexOf(colors.warning) || primary
  const error = hexOf(colors.error) || primary
  const info = hexOf(colors.info) || primary
  const tokens = {}
  tokens.text = text
  tokens.textMuted = textMuted
  tokens.bg = bg
  tokens.bgSoft = bgSoft
  tokens.border = border
  tokens.borderStrong = borderStrong
  tokens.buttonBg = buttonBg
  tokens.primary = primary
  const deep = deepened(primary)
  if (deep) tokens.primaryDeep = deep
  tokens.focus = primary
  tokens.okBorder = success
  tokens.okText = success
  const okBg = tinted(success, darkMode)
  if (okBg) tokens.okBg = okBg
  tokens.warnBorder = warning
  tokens.warnText = warning
  const warnBg = tinted(warning, darkMode)
  if (warnBg) tokens.warnBg = warnBg
  tokens.badBorder = error
  tokens.badText = error
  const badBg = tinted(error, darkMode)
  if (badBg) tokens.badBg = badBg
  tokens.busyBorder = info
  tokens.busyText = info
  const busyBg = tinted(info, darkMode)
  if (busyBg) tokens.busyBg = busyBg
  return tokens
}
