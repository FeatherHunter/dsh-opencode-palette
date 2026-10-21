// index.ts — ThemeEngine 门面：注册表 + 解析 + 生成 的对外唯一入口
import { listThemes, getThemeJson, isSystem, SYSTEM_THEME, countStatic } from './registry.ts'
import { resolveThemeColors, collectErrors, isDelegatedSurface, type ResolvedColorMap } from './resolve.ts'
import { generateTheme, renderCustomTheme, customPreviewColors } from './generate.ts'
import { COLOR_SLOT_GROUPS, COLOR_SLOTS, normalizeThemeColors } from './map-dsh.ts'
import { themeGroups, GROUP_ORDER, GROUP_COLORS, resolvePreview, type PreviewColors } from './grouping.ts'
import { listIpPresets, getIpPreset, countIpPresets, IP_PRESET_IDS } from './ip-presets.ts'

const DARK = 'dark'

// 排印参数形状归 generate 侧定义，门面只做透明转发（不在此重复一份字面量约束；generate 定型后自动跟随）
type ThemeTypography = Parameters<typeof generateTheme>[1]

// 渲染一个主题 → { tokens, css, meta }
// issue 45：两套外观 palettes 同时解析；画布归属由 generate 按槽位判定
export function renderTheme(name: string, typography?: ThemeTypography) {
  if (isSystem(name)) {
    return generateTheme(null, typography || {} as ThemeTypography, SYSTEM_THEME)
  }
  const json = getThemeJson(name)
  if (!json) throw new Error('未知主题: ' + String(name))
  const dark = resolveThemeColors(json, DARK)
  const light = resolveThemeColors(json, 'light')
  const errors = collectErrors(dark).concat(collectErrors(light))
  if (errors.length > 0) {
    console.warn('[dsh-opencode-palette] ' + name + ' 有 ' + errors.length + ' 个色位解析失败:', errors)
  }
  return generateTheme({ dark, light }, typography || {} as ThemeTypography, name)
}

// 解析主题的关键色（面板预览用）：透明 → null（实现收敛到 grouping.resolvePreview）
// mode 缺省 dark（调用方兼容）；面板按宿主外观传入 light/dark
export function previewColors(name: string, mode?: string): PreviewColors | null {
  return resolvePreview(name, mode || 'dark')
}

// 画布归属（issue 45）：主题是否把主要背景委托给宿主（面板提示与测试用）
export function delegatesBackground(name: string): boolean {
  if (isSystem(name)) return false
  const json = getThemeJson(name)
  if (!json) return false
  return isDelegatedSurface(resolveThemeColors(json, DARK), resolveThemeColors(json, 'light'))
}

export function themeNames(): string[] { return listThemes() }
export { themeGroups, GROUP_ORDER, GROUP_COLORS, COLOR_SLOT_GROUPS, COLOR_SLOTS, normalizeThemeColors, renderCustomTheme, customPreviewColors, listIpPresets, getIpPreset, countIpPresets, IP_PRESET_IDS }
export function themeStats(): { static: number; total: number } { return { static: countStatic(), total: listThemes().length } }

// 37 色槽位取值：字符串直接采用；缺失或 __error 用同明暗 opencode 配色回退（5 个扩展槽位 resolve 不产出，走 normalize 回填）
function pick37(src: ResolvedColorMap | null | undefined, fallback: ResolvedColorMap | null | undefined) {
  const out: Record<string, string> = {}
  for (const slot of COLOR_SLOTS) {
    const v = src ? src[slot.key] : undefined
    if (typeof v === 'string') { out[slot.key] = v; continue }
    const f = fallback ? fallback[slot.key] : undefined
    if (typeof f === 'string') out[slot.key] = f
  }
  return normalizeThemeColors(out)
}
// 预置主题 37 色提取（#84）：system→system（按 hostMode 取 opencode 对应配色）；透光主题（如 lucent-orng）→light 取 light 配色；其余 36 款→dark 取 dark 配色
export function extractPresetPalette(name: string, hostMode?: string) {
  const mode = hostMode === 'light' ? 'light' : 'dark'
  if (isSystem(name)) {
    const oc = getThemeJson('opencode')
    const base = resolveThemeColors(oc, mode)
    return { name: 'system', appearance: 'system', colors: pick37(base, base) }
  }
  const json = getThemeJson(name)
  if (!json) throw new Error('未知主题: ' + String(name))
  const appearance = delegatesBackground(name) ? 'light' : 'dark'
  const src = appearance === 'light' ? resolveThemeColors(json, 'light') : resolveThemeColors(json, 'dark')
  const ocResolved = resolveThemeColors(getThemeJson('opencode'), appearance)
  return { name: name, appearance: appearance, colors: pick37(src, ocResolved) }
}

// 完整自检（测试/诊断用）：解析全部主题，报告失败清单
export function auditAll(): { ok: string[]; broken: string[] } {
  const report: { ok: string[]; broken: string[] } = { ok: [], broken: [] }
  for (const name of listThemes()) {
    if (isSystem(name)) { report.ok.push(name); continue }
    const json = getThemeJson(name)
    const errors = collectErrors(resolveThemeColors(json, DARK))
      .concat(collectErrors(resolveThemeColors(json, 'light')))
    if (errors.length > 0) report.broken.push(name + ': ' + errors.join(' | '))
    else report.ok.push(name)
  }
  return report
}
