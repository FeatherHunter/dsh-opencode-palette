// index.mjs — ThemeEngine 门面：注册表 + 解析 + 生成 的对外唯一入口
import { listThemes, getThemeJson, isSystem, SYSTEM_THEME, countStatic } from './registry.mjs'
import { resolveThemeColors, collectErrors } from './resolve.mjs'
import { generateTheme } from './generate.mjs'
import { themeGroups, GROUP_ORDER, GROUP_COLORS, resolvePreview } from './grouping.mjs'

const DARK = 'dark'

// 渲染一个主题 → { tokens, css, meta }
export function renderTheme(name, typography) {
  if (isSystem(name)) {
    return generateTheme(null, typography || {}, SYSTEM_THEME)
  }
  const json = getThemeJson(name)
  if (!json) throw new Error('未知主题: ' + String(name))
  const colors = resolveThemeColors(json, DARK)
  const errors = collectErrors(colors)
  if (errors.length > 0) {
    console.warn('[dsh-opencode-palette] ' + name + ' 有 ' + errors.length + ' 个色位解析失败:', errors)
  }
  return generateTheme(colors, typography || {}, name)
}

// 解析主题的关键色（面板预览用）：透明 → null（实现收敛到 grouping.resolvePreview）
export function previewColors(name) {
  return resolvePreview(name)
}

export function themeNames() { return listThemes() }
export { themeGroups, GROUP_ORDER, GROUP_COLORS }
export function themeStats() { return { static: countStatic(), total: listThemes().length } }

// 完整自检（测试/诊断用）：解析全部主题，报告失败清单
export function auditAll() {
  const report = { ok: [], broken: [] }
  for (const name of listThemes()) {
    if (isSystem(name)) { report.ok.push(name); continue }
    const json = getThemeJson(name)
    const colors = resolveThemeColors(json, DARK)
    const errors = collectErrors(colors)
    if (errors.length > 0) report.broken.push(name + ': ' + errors.join(' | '))
    else report.ok.push(name)
  }
  return report
}