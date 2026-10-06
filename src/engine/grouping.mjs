// grouping.mjs — 色系分组：按主题主色色相将 34 个主题分到色系组
// 组合 1 布局依赖：组标题（色点+名称+数量）+ 组内 mini 芯片
// 纯逻辑、无 DOM，node 可直接测试
import { getThemeJson, isSystem, listThemes } from './registry.mjs'
import { resolveThemeColors, hexToRgb } from './resolve.mjs'

// 色系顺序与代表色（组标题色点/色带）
// 组 key 为语言中立 slug（显示名由运行时 i18n 翻译表提供）
export const GROUP_ORDER = ['warm', 'yellow-green', 'teal', 'cyan-blue', 'cool-blue', 'violet', 'neutral', 'transparent', 'special']
export const GROUP_COLORS = {
  warm: '#FAB283',
  'yellow-green': '#A7C080',
  teal: '#2DD5B7',
  'cyan-blue': '#88C0D0',
  'cool-blue': '#82AAFF',
  violet: '#C4A7E7',
  neutral: '#9E9E9E',
  transparent: '#8B8B95',
  special: '#8B8B95',
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

// ── 色系边界冻结（#68，2026-10-06 并排实测后拍板）──
// 阈值 160 / 200 / 230 取「色族分界」的惯例整数，不按当前 38 主题样本拟合：
//   warm <35 ｜ 黄绿 35–90 ｜ 青绿 90–160 ｜ 青蓝 160–200 ｜ 冷蓝 200–230 ｜ 蓝紫 ≥230
// 契约是「分区」，数字只是实现：若改成按样本取的中点（163.2/197.7/242.9），上游一加主题它就
// 既非惯例、也非最优，成为历史化石。主题数据钉在不可变 commit（sync-themes 的 OPCODE_SHA ＋
// MANIFEST 指纹），越界只可能发生在人为 --update-baseline 升级时——所以薄余量是跳闸线，不是风险。
// 实测余量（dark 基线主色，最近主题距边界；tests/group-boundary.test.mjs 守 ≥2°）：
//   160：Gruvbox 157.1（下 2.9）／大阪翡翠 169.3（上 9.3）
//   200：Cursor·北极 193.3（下 6.7）／Ayu 202.0（上 2.0）
//   230：水星 226.7（下 3.3）／光环 259.0（上 29.0）　（区间内任意阈值分组不变；±5° 最多翻 3 个主题）
// 160 两侧的观感差主要来自饱和度（Gruvbox 灰青 vs 大阪翡翠 鲜亮），色相序仍是唯一判据：分组只做
// 导航、不做色彩描述，故不引入第二维（色度）判据——引入即产生无法全序化的并列桶。
// 中文名体例（同步冻结）：青字头覆盖 [90,200)（青绿／青蓝 共享字头、尾字分色向），[200,230) 用冷字头
// （冷蓝）区分纯蓝段。整组名体系 = 两端温度锚（暖橙／冷蓝）＋中段邻接复合（黄绿／青绿／青蓝／蓝紫），
// 本就不是平行前缀；英文侧按英语习惯（Teal／Violet 为单词色名）而非与中文同构，同样冻结。
// 分组键恒取 dark 基线（issue 47）：浅色宿主的芯片预览色可落在别组（7 个主题），既有裁决、不是漂移。
export function groupOf(name, colors) {
  if (isSystem(name)) return 'special'
  if (colors.background === null) return 'transparent'
  const h = hueOf(colors.primary)
  if (h === -2) return 'neutral'
  if (h < 35) return 'warm'
  if (h < 90) return 'yellow-green'
  if (h < 160) return 'teal'
  if (h < 200) return 'cyan-blue'
  if (h < 230) return 'cool-blue'
  return 'violet'
}

// 解析单个主题的预览关键色（transparent → null）
// mode 缺省 dark（调用方兼容）；面板按宿主外观传入 light/dark（issue 45）
export function resolvePreview(name, mode) {
  if (isSystem(name)) {
    return { background: null, text: null, primary: null, accent: null, error: null, warning: null, success: null }
  }
  const json = getThemeJson(name)
  if (!json) return null
  const c = resolveThemeColors(json, mode || 'dark')
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
// mode 缺省 dark（调用方兼容）；mode 只决定芯片预览色，分组键恒用 dark 基线（issue 47：菜单不得随宿主明暗漂移）
export function themeGroups(mode) {
  const m = mode || 'dark'
  const buckets = {}
  for (const name of listThemes()) {
    const colors = resolvePreview(name, m)
    const groupKey = m === 'dark' ? colors : resolvePreview(name, 'dark')
    const g = groupOf(name, groupKey)
    ;(buckets[g] = buckets[g] || []).push({ name: name, colors: colors })
  }
  return GROUP_ORDER
    .filter((g) => buckets[g])
    .map((g) => ({ name: g, color: GROUP_COLORS[g], themes: buckets[g] }))
}
