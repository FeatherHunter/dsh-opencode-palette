// grouping.mjs — 色系分组：按主题主色色相将 34 个主题分到色系组
// 组合 1 布局依赖：组标题（色点+名称+数量）+ 组内 mini 芯片
// 纯逻辑、无 DOM，node 可直接测试
import { getThemeJson, isSystem, listThemes } from './registry.mjs'
import { resolveThemeColors, hexToRgb } from './resolve.mjs'

// 色系顺序与代表色（组标题色点/色带）
export const GROUP_ORDER = ['暖橙', '黄绿', '青绿', '青蓝', '冷蓝', '蓝紫', '中性', '透明', '特殊']
export const GROUP_COLORS = {
  暖橙: '#FAB283',
  黄绿: '#A7C080',
  青绿: '#2DD5B7',
  青蓝: '#88C0D0',
  冷蓝: '#82AAFF',
  蓝紫: '#C4A7E7',
  中性: '#9E9E9E',
  透明: '#8B8B95',
  特殊: '#8B8B95',
}

// 色相：hex → 0-360；中性（低饱和/无色）→ -2；无值 → -1
export function hueOf(hex) {
  if (!hex) return -1
  const { r, g, b } = hexToRgb(hex)
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const d = max - min
  if (d === 0) return -2
  const rr = r / 255, gg = g / 255, bb = b / 255
  let h
  if (max === rr) h = ((gg - bb) / d) % 6
  else if (max === gg) h = (bb - rr) / d + 2
  else h = (rr - gg) / d + 4
  h *= 60
  if (h < 0) h += 360
  if (max === 0 ? 0 : d / max < 0.18) return -2
  return h
}

export function groupOf(name, colors) {
  if (isSystem(name)) return '特殊'
  if (colors.background === null) return '透明'
  const h = hueOf(colors.primary)
  if (h === -2) return '中性'
  if (h < 35) return '暖橙'
  if (h < 90) return '黄绿'
  if (h < 160) return '青绿'
  if (h < 200) return '青蓝'
  if (h < 230) return '冷蓝'
  return '蓝紫'
}

// 解析单个主题的预览关键色（transparent → null）
export function resolvePreview(name) {
  if (isSystem(name)) {
    return { background: null, text: null, primary: null, accent: null, error: null, warning: null, success: null }
  }
  const json = getThemeJson(name)
  if (!json) return null
  const c = resolveThemeColors(json, 'dark')
  const pick = (k) => {
    const v = c[k]
    if (v && typeof v === 'object' && v.__error) return null
    return v === 'transparent' ? null : v
  }
  return {
    background: pick('background'),
    text: pick('text'),
    primary: pick('primary'),
    accent: pick('accent'),
    error: pick('error'),
    warning: pick('warning'),
    success: pick('success'),
  }
}

// 完整分组结果：按 GROUP_ORDER 输出非空组，组内含每主题预览色
export function themeGroups() {
  const buckets = {}
  for (const name of listThemes()) {
    const colors = resolvePreview(name)
    const g = groupOf(name, colors)
    ;(buckets[g] = buckets[g] || []).push({ name: name, colors: colors })
  }
  return GROUP_ORDER
    .filter((g) => buckets[g])
    .map((g) => ({ name: g, color: GROUP_COLORS[g], themes: buckets[g] }))
}
