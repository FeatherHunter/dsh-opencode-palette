// custom-editor.test.mjs — issue 86 回归：自定义主题纯函数缝（颜色/存储/动效）
// 直接 import runtime 源码（这三个模块零导入，打包前后同一语义），先红后绿的 TDD 缝。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import {
  normalizeHexInput,
  hexToHsv,
  hsvToHex,
  clientSlug,
  effectiveSlotColor,
  editorMiniLight,
  filterCustomThemes,
  mergeHsv,
  parseHexInputLoose,
  hsvToRgb,
  rgbToHsv,
  rgbToHex,
  hsvToHsl,
  hslToHsv,
  hueStops,
  relativeLuminance,
  contrastRatio,
  contrastRefSlot,
  BG_SLOTS,
  pickRecentColors,
  SLOT_FB,
  SLOT_DARK2LIGHT,
} from '../runtime/custom-color.mjs'
import {
  CUSTOM_CACHE_KEY,
  loadCustomCache,
  saveCustomCache,
  reconcileCustomThemes,
} from '../runtime/custom-store.mjs'
import { UI_FX_CSS, UI_STYLE_ATTR, injectUiFx, TIER_CHIP, TIER_BUTTON, TIER_ROW, TIER_SWATCH, TIER_INPUT, TIER_SWITCH } from '../runtime/ui-fx.mjs'

function memoryStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)) },
    removeItem: (k) => { map.delete(k) },
  }
}

// ── HEX 输入归一化 ──
test('normalizeHexInput：#RGB/#RRGGBB 收敛大写 #RRGGBB，其余 null', () => {
  assert.equal(normalizeHexInput('#fab283'), '#FAB283')
  assert.equal(normalizeHexInput('#FAB283'), '#FAB283')
  assert.equal(normalizeHexInput('#abc'), '#AABBCC')
  assert.equal(normalizeHexInput('  #123456  '), '#123456')
  assert.equal(normalizeHexInput('transparent'), null)
  assert.equal(normalizeHexInput('#12'), null)
  assert.equal(normalizeHexInput('#gggggg'), null)
  assert.equal(normalizeHexInput(null), null)
})

// ── HSV 往返 ──
test('hexToHsv/hsvToHex：往返一致，主色相正确', () => {
  for (const hex of ['#FF0000', '#00FF00', '#0000FF', '#FAB283', '#0A0A0A', '#FFFFFF']) {
    assert.equal(hsvToHex(hexToHsv(hex)), hex)
  }
  assert.equal(hexToHsv('#FF0000').h, 0)
  assert.equal(hexToHsv('#00FF00').h, 120)
  assert.equal(hexToHsv('#0000FF').h, 240)
  assert.deepEqual(hexToHsv('#FFFFFF'), { h: 0, s: 0, v: 100 })
})


// ── 客户端 slug（宿主 CUSTOM_ID_PATTERN 的子集）──
test('clientSlug：ASCII 小写连字符，中文/空返回 null', () => {
  assert.equal(clientSlug('My Theme 01'), 'my-theme-01')
  assert.equal(clientSlug('  a__b  '), 'a__b')
  assert.equal(clientSlug('中文名'), null)
  assert.equal(clientSlug('---'), null)
  assert.equal(clientSlug('x'.repeat(100)), 'x'.repeat(64))
})

// ── 预览生效色（原型 hexOrTrans/FB_DARK2LIGHT 口径，逐字对齐）──
test('effectiveSlotColor：transparent 走 FB，miniLight 翻 DARK2LIGHT', () => {
  assert.equal(SLOT_FB.background, '#101014', 'FB 底色跟原型 #101014')
  assert.equal(SLOT_FB.sidebarBg, '#1A1A1E', 'FB 侧边栏跟原型 #1A1A1E')
  assert.equal(effectiveSlotColor('background', { background: 'transparent' }, false), '#101014')
  assert.equal(effectiveSlotColor('background', { background: 'transparent' }, true), '#FFFFFF')
  assert.equal(effectiveSlotColor('sidebarBg', { sidebarBg: 'transparent' }, true), '#F4F4F5')
  assert.equal(effectiveSlotColor('primary', { primary: '#FAB283' }, false), '#FAB283')
  // 非背景槽透明 → 原型兜底 #141414；真色不受 miniLight 翻转
  assert.equal(effectiveSlotColor('text', { text: 'transparent' }, false), '#141414')
  assert.equal(effectiveSlotColor('text', { text: '#ECEDE9' }, true), '#ECEDE9')
  // 非透明槽位原值直出：浅色外观也不翻转（原型 slotBg：只有 transparent 才回退/翻转）
  assert.equal(effectiveSlotColor('sidebarBg', { sidebarBg: '#1A1A1E' }, true), '#1A1A1E')
  assert.equal(effectiveSlotColor('backgroundPanel', { backgroundPanel: '#232329' }, true), '#232329')
  assert.equal(SLOT_DARK2LIGHT['#232329'], '#FFFFFF', 'DARK2LIGHT 跟原型')
})

// ── 预览底盘跟编辑器外观（原型 effAppearance 口径）──
test('editorMiniLight：light 恒浅、dark 恒深、system 跟 OS', () => {
  assert.equal(editorMiniLight('light', true), true)
  assert.equal(editorMiniLight('light', false), true)
  assert.equal(editorMiniLight('dark', false), false)
  assert.equal(editorMiniLight('dark', true), false)
  assert.equal(editorMiniLight('system', false), true)
  assert.equal(editorMiniLight('system', true), false)
})

// ── 搜索过滤（name/id 子串，大小写不敏感；空串全回）──
test('filterCustomThemes：按 name/id 子串过滤，+新增由调用方保留', () => {
  const list = [
    { id: 'aurora', name: '极光' },
    { id: 'gruvbox-soft', name: 'Gruvbox 柔' },
  ]
  assert.deepEqual(filterCustomThemes(list, ''), list)
  assert.deepEqual(filterCustomThemes(list, 'aur').map((t) => t.id), ['aurora'])
  assert.deepEqual(filterCustomThemes(list, '柔').map((t) => t.id), ['gruvbox-soft'])
  assert.deepEqual(filterCustomThemes(list, 'GRUV').map((t) => t.id), ['gruvbox-soft'])
  assert.deepEqual(filterCustomThemes(list, '不存在'), [])
})

// ── 本地缓存（localStorage 兜底）──
test('loadCustomCache/saveCustomCache：往返一致，坏数据/无存储回空', () => {
  const st = memoryStorage()
  assert.deepEqual(loadCustomCache(st), { themes: [], dirPath: '' })
  const data = { themes: [{ id: 'a', name: 'A' }], dirPath: 'D:\\x' }
  assert.equal(saveCustomCache(st, data), true)
  assert.deepEqual(loadCustomCache(st), data)
  assert.equal(st.getItem(CUSTOM_CACHE_KEY) !== null, true)
  st.setItem(CUSTOM_CACHE_KEY, '{broken')
  assert.deepEqual(loadCustomCache(st), { themes: [], dirPath: '' })
  assert.deepEqual(loadCustomCache(null), { themes: [], dirPath: '' })
  assert.equal(saveCustomCache(null, data), false)
})

// ── 对账（RPC 成功用宿主值并写缓存；抛错/无桥静默回缓存）──
test('reconcileCustomThemes：成功写缓存，失败回缓存，绝不抛', async () => {
  const st = memoryStorage()
  const server = { themes: [{ id: 's', name: 'S' }], dirPath: 'D:\\srv' }
  const bridge = { call: async (phone) => {
    assert.equal(phone, 'palette.customThemesList')
    return { ok: true, dirPath: server.dirPath, themes: server.themes }
  } }
  const hit = await reconcileCustomThemes(bridge, st)
  assert.deepEqual(hit, { themes: server.themes, dirPath: server.dirPath, source: 'rpc' })
  assert.deepEqual(loadCustomCache(st), { themes: server.themes, dirPath: server.dirPath })
  const badBridge = { call: async () => { throw new Error('unexpected phone') } }
  const miss = await reconcileCustomThemes(badBridge, st)
  assert.deepEqual(miss, { themes: server.themes, dirPath: server.dirPath, source: 'cache' })
  const none = await reconcileCustomThemes(null, memoryStorage())
  assert.deepEqual(none, { themes: [], dirPath: '', source: 'cache' })
})

// ── 悬浮动效样式表（SSR 零污染：只增选择器，不碰既有内联 style）──
test('UI_FX_CSS：挂 data-palette-interactive 钩子，含动效与 reduced-motion，无深色硬编码', () => {
  assert.match(UI_FX_CSS, /data-palette-interactive/)
  assert.match(UI_FX_CSS, /translateY\(-1px\)/)
  assert.match(UI_FX_CSS, /scale\(0\.98\)/)
  assert.match(UI_FX_CSS, /prefers-reduced-motion/)
  assert.equal(UI_STYLE_ATTR, 'data-dsh-opencode-palette-ui')
  for (const banned of ['#333338', '#8b8b95', '#555', 'rgba(255,255,255,0.14)']) {
    assert.equal(UI_FX_CSS.includes(banned), false, '动效样式表不得含停用态门禁模式：' + banned)
  }
})

// ── #88：分级档位契约（样式表侧）──
// 六档齐备；!important 只能出现在状态伪类上（#88 Q4 拍板）；reduced-motion 全量降级；
// 颜色只走主题变量，样式表内不得出现写死的十六进制色。
test('#88 UI_FX_CSS：六档齐备 + !important 只在状态伪类 + reduced-motion 全量降级', () => {
  for (const tier of [TIER_CHIP, TIER_BUTTON, TIER_ROW, TIER_SWATCH, TIER_INPUT, TIER_SWITCH]) {
    assert.ok(UI_FX_CSS.includes('[data-palette-interactive="' + tier + '"]'), '缺档位选择器：' + tier)
  }
  // 逐条最内层规则核对（正则只吃无嵌套括号的规则体，@media 内层规则同样命中）：含 !important 的
  // 规则，其每个选择器分段都必须落在 :hover/:active/:focus-visible 上。
  let checkedRules = 0
  for (const m of UI_FX_CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim()
    if (!m[2].includes('!important')) continue
    checkedRules++
    const parts = selector.split(',').map((s) => s.trim()).filter(Boolean)
    assert.ok(parts.length > 0, '取不到 !important 规则的选择器：' + selector)
    for (const part of parts) {
      assert.ok(/:(hover|active|focus-visible)/.test(part), '!important 越出状态伪类：' + part)
    }
  }
  assert.ok(checkedRules >= 6, '!important 规则样本太少，断言已失效：' + checkedRules)
  // reduced-motion 降级块必须在场且关掉过渡/位移/外发光
  const at = UI_FX_CSS.indexOf('@media (prefers-reduced-motion: reduce)')
  assert.ok(at >= 0, '缺 reduced-motion 降级块')
  const reduced = UI_FX_CSS.slice(at)
  for (const off of ['transition:none', 'transform:none', 'box-shadow:none']) {
    assert.ok(reduced.includes(off), 'reduced-motion 缺降级：' + off)
  }
  assert.equal(/#[0-9A-Fa-f]{3,8}/.test(UI_FX_CSS), false, '动效样式表不得写死十六进制色（颜色只走主题变量）')
  // 层叠禁区（#88 实测修正）：历史档的裸属性选择器特异度 (0,3,1) 高于各具名档 (0,2,0)，
  // 会把 <button> 上胶囊/按钮档的 box-shadow（品牌色外环）覆盖掉 → 历史档必须限定空值。
  assert.ok(UI_FX_CSS.includes('button[data-palette-interactive=""]:hover:not(:disabled)'), '历史档应只认空值钩子')
  assert.equal(/button\[data-palette-interactive\]:/.test(UI_FX_CSS), false, '历史档不得裸挂属性选择器（会抢走具名档的 box-shadow）')
})

test('injectUiFx：幂等注入，假宿主（无 head/querySelector）不抛', () => {
  let appended = 0
  const fakeDoc = { head: { appendChild: () => { appended++ } }, createElement: () => ({ textContent: '' }) }
  assert.equal(injectUiFx(fakeDoc), true)
  assert.equal(injectUiFx(fakeDoc), false)
  assert.equal(appended, 1)
  assert.equal(injectUiFx(null), false)
  assert.equal(injectUiFx({}), false)
})

// ── #86 验收集成（走构建产物 package/lib/client.js，与 panel-render 同构）──
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInThisContext } from 'node:vm'

const _require = createRequire(import.meta.url)
const _React = _require('react')
const _ReactDOMServer = _require('react-dom/server')

function loadCustomPanel(opts = {}) {
  const code = readFileSync(new URL('../package/lib/client.js', import.meta.url), 'utf8')
  const loaded = []
  global.window = globalThis
  delete globalThis.queryLocalFonts
  globalThis.__ModuleLoader__ = {
    load(entry) {
      loaded.push({
        id: entry.id,
        exports: entry.factory((id) => {
          if (id === 'react') return _React
          throw new Error('unexpected require: ' + id)
        }),
      })
    },
  }
  const bodyAttrs = {}
  if (opts.hostDark !== false) bodyAttrs['data-ds-dark-theme'] = ''
  global.document = {
    head: { appendChild: () => {} },
    body: {
      hasAttribute: (k) => bodyAttrs[k] !== undefined,
      appendChild: () => {},
      removeChild: () => {},
    },
    createElement: () => ({ dataset: {}, parentNode: null, textContent: '', style: {} }),
    documentElement: { lang: opts.lang || 'zh-CN' },
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  global.localStorage = opts.storage
  runInThisContext(code, { filename: 'package/lib/client.js' })
  const p = loaded[0].exports
  let panelCmp = null
  let panelProps = null
  const slots = {
    inject: (slot, cb) => { cb(); return () => {} },
    register: (desc, cmp) => { panelCmp = cmp; panelProps = desc.inject(); return () => {} },
  }
  const ctx = {
    get: (k) => {
      if (k === 'theme') return { overrideTokens: () => () => {} }
      if (k === 'slots') return slots
      return undefined // 无 connection（hostBridge null）→ 自定义 RPC 全走静默降级
    },
    effect: (fn) => { fn() },
  }
  p.apply(ctx)
  assert.ok(panelCmp, '面板组件未注册')
  const html = _ReactDOMServer.renderToString(_React.createElement(panelCmp, panelProps))
  return { html, panelProps }
}

// ✎ 编辑按钮是否带 disabled 属性（空态置灰，原型 :606）
function editBtnDisabled(html) {
  const at = html.indexOf('✎ 编辑')
  assert.ok(at >= 0, '✎ 编辑按钮应渲染')
  const open = html.lastIndexOf('<button', at)
  assert.ok(open >= 0, '应找到按钮起始标签')
  return html.slice(open, at).includes('disabled')
}
function seedStorage(customs) {  const map = new Map()
  map.set('dsh.opencode-palette.customThemes', JSON.stringify(customs))
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)) },
    removeItem: (k) => { map.delete(k) },
  }
}

const SEED_THEME = {
  id: 'aurora-test',
  name: '极光测试',
  appearance: 'dark',
  basePreset: 'opencode',
  colors: { primary: '#FAB283', background: '#0A0A0A', text: '#ECEDE9', border: '#55555E' },
}

test('预置 IP 组 + 空自定义区（中文）：IP 与内置同区，自定义区只数用户存盘主题', () => {
  const { html } = loadCustomPanel()
  assert.ok(html.includes('自定义主题 0'), '空态自定义区计数 0（预置 IP 不混进自定义区）')
  assert.ok(html.includes('IP 预置'), 'IP 预置组渲染')
  assert.ok(html.includes('宝可梦'), 'IP 预置胶囊中文名')
  assert.ok(html.includes('复制配置路径'), '复制路径按钮')
  assert.ok(html.includes('+ 新增'), '+ 新增胶囊')
  assert.ok(html.includes('✎ 编辑'), '✎ 编辑胶囊')
  assert.equal(editBtnDisabled(html), true, '空态 ✎ 编辑置灰禁用（原型 :606）')
  assert.equal(html.includes('保存主题'), false, '弹窗默认关闭')
  assert.equal(html.includes('<circle'), false, '全局禁 <circle>')
})

test('预置 IP 组位置（用户口径 m08573）：内置组之后、自定义区之前，且不进自定义区计数', () => {
  const { html } = loadCustomPanel()
  const lastBuiltin = html.lastIndexOf('38 款 · 按色系分组')
  const ip = html.indexOf('IP 预置')
  const custom = html.indexOf('自定义主题 0')
  assert.ok(lastBuiltin >= 0 && ip >= 0 && custom >= 0, '三段都应渲染')
  assert.ok(lastBuiltin < ip, 'IP 预置组在内置主题区之后')
  assert.ok(ip < custom, 'IP 预置组在自定义区之前')
  // IP 胶囊激活键走 ip: 前缀，与用户存盘的 custom: 前缀并列不冒充
  assert.equal(html.includes('custom:pokemon'), false, '预置 IP 不得以 custom: 键出现在展示层')
})

test('预置 IP 组渲染（英文）：IP presets + ascii id，无中文残留', () => {
  const { html } = loadCustomPanel({ lang: 'en' })
  assert.ok(html.includes('Custom themes 0'), '英文自定义区计数 0')
  assert.ok(html.includes('IP presets'), '英文 IP 预置组标题')
  assert.ok(html.includes('sailor-moon'), '英文界面 IP 预置显示 ascii id')
  assert.ok(html.includes('Copy config path'), '英文复制按钮')
  assert.ok(html.includes('New'), '英文新增')
  assert.ok(html.includes('Edit'), '英文编辑')
  assert.equal(html.includes('自定义'), false, '英文界面无中文残留')
  assert.equal(html.includes('复制配置路径'), false, '英文界面无中文残留')
  assert.equal(html.includes('宝可梦'), false, '英文界面 IP 预置不用中文名')
})

test('点击预置 IP 胶囊：setIpTheme 直接生效且不写盘（无宿主也不抛）', () => {
  const { panelProps } = loadCustomPanel()
  assert.equal(panelProps.setIpTheme('pokemon'), true, 'bundle 内 id 生效')
  assert.equal(panelProps.getState().theme, 'ip:pokemon', '预置激活键 ip:<id>，不落盘')
  assert.equal(panelProps.setIpTheme('nope-not-there'), false, '未收录 id 返回 false、不换主题')
  assert.equal(panelProps.getState().theme, 'ip:pokemon', '无效 id 不改动当前主题')
})

test('预置 IP 组恒 21 项：与用户存盘主题互不影响（无去重、无存盘）', () => {
  const { html } = loadCustomPanel({
    storage: seedStorage({ themes: [{ id: 'pokemon', name: '宝可梦自存版', appearance: 'dark', colors: SEED_THEME.colors }], dirPath: '' }),
  })
  assert.ok(html.includes('IP 预置'), 'IP 预置组与存盘主题并存')
  assert.ok(html.includes('宝可梦自存版'), '存盘主题按自己的名字列在自定义区')
  // IP 组按 id 独立渲染：同名存盘不会把预置项顶掉（宝可梦 出现 >= 2 次：预置胶囊 + 存盘名）
  assert.ok(html.split('宝可梦').length - 1 >= 2, 'IP 预置项不因同名存盘而消失')
  assert.ok(html.includes('自定义主题 1'), '自定义区只数用户存盘的 1 套')
})

test('浅色停用宿主：自定义区无深色硬编码（门禁 5 模式）', () => {
  const disabled = {
    getItem: () => JSON.stringify({ enabled: false, theme: 'opencode', mode: 'mono', size: 13, fontKey: 'JetBrains Mono' }),
    setItem: () => {},
  }
  const { html } = loadCustomPanel({ hostDark: false, storage: disabled, lang: 'en' })
  for (const banned of ['#333338', '#8b8b95', 'rgba(255,255,255,0.14)', '1px solid #555', 'background:#555']) {
    assert.equal(html.includes(banned), false, '停用态门禁：' + banned)
  }
})

test('存盘 customs：胶囊渲染 + 命名空间隔离 + 38 主题计数不动', () => {
  const { html } = loadCustomPanel({
    storage: seedStorage({ themes: [SEED_THEME], dirPath: 'D:\\dsh\\custom-themes' }),
  })
  assert.ok(html.includes('自定义主题 1'), '计数只数用户存盘（IP 预置不计数）')
  assert.ok(html.includes('极光测试'), '自定义胶囊渲染主题名')
  assert.equal(html.includes('custom:aurora-test'), false, '内部激活键不泄漏到展示层')
  assert.ok(html.includes('38 款 · 按色系分组'), '内置 9 组/38 主题门禁不动')
  assert.ok(html.includes('IP 预置'), 'IP 预置组与存盘主题并存渲染')
  assert.equal(editBtnDisabled(html), false, '有主题时 ✎ 编辑可用')
})

test('自定义区渲染顺序：特殊分组下方，且位于 IP 预置组之后（用户口径 m08573）', () => {
  const { html } = loadCustomPanel({
    storage: seedStorage({ themes: [SEED_THEME], dirPath: 'D:\\dsh\\custom-themes' }),
  })
  const special = html.indexOf('特殊')
  const ip = html.indexOf('IP 预置')
  const custom = html.indexOf('自定义主题 1')
  assert.ok(special >= 0 && ip >= 0 && custom >= 0, '特殊/IP 预置/自定义标题都应渲染')
  assert.ok(special < ip, 'IP 预置组位于特殊分组下方')
  assert.ok(ip < custom, '自定义区位于 IP 预置组下方')
})

test('词表对账（#86/#95）：glossary 自定义编辑器行 == 代码 I18N，中英逐行命中源码', () => {
  const md = readFileSync(new URL('../docs/i18n-glossary.md', import.meta.url), 'utf8').replace(/\r/g, '')
  const rows = []
  for (const line of md.split('\n')) {
    const m = line.match(/^\|\s*`([^`]+)`\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*#(?:86|95)[^|]*\|$/)
    if (m) rows.push({ key: m[1], zh: m[2].trim(), en: m[3].trim() })
  }
  assert.equal(rows.length, 176, '词表 #86/#95 行应为 176 行（改 I18N 必须同步词表）')
  const src = readFileSync(new URL('../runtime/client.mjs', import.meta.url), 'utf8').replace(/\r/g, '')
  const seen = new Set()
  for (const row of rows) {
    assert.equal(seen.has(row.key), false, '词表键重复：' + row.key)
    seen.add(row.key)
    assert.ok(row.zh.length > 0 && row.en.length > 0, '中英非空：' + row.key)
    assert.ok(src.includes("zh: '" + row.zh + "'"), '中文终稿未进代码 I18N：' + row.key)
    assert.ok(src.includes("en: '" + row.en + "'"), '英文未进代码 I18N：' + row.key)
  }
})

test('#95：取色器 15 条新文案 —— 双语同在 I18N 与词表（新增行同样 #95 定稿）', () => {
  const md = readFileSync(new URL('../docs/i18n-glossary.md', import.meta.url), 'utf8').replace(/\r/g, '')
  const src = readFileSync(new URL('../runtime/client.mjs', import.meta.url), 'utf8').replace(/\r/g, '')
  const keys = [
    ['edHue', '色相', 'Hue'],
    ['edSat', '饱和度', 'Saturation'],
    ['edVal', '明度', 'Brightness'],
    ['edLightness', '亮度', 'Lightness'],
    ['edDone', '完成', 'Done'],
    ['edEyedropper', '吸管取色', 'Pick from screen'],
    ['edContrast', '对比度', 'Contrast'],
    ['edContrastLow', '对比不足', 'Low contrast'],
    ['edInvalidHex', '请输入 #RGB 或 #RRGGBB', 'Enter #RGB or #RRGGBB'],
    ['edAlphaDropped', '已忽略透明度', 'Alpha ignored'],
    ['edCopy', '复制色值', 'Copy value'],
    ['edColorModel', '色彩模型（点击切换）', 'Color model (click to switch)'],
    ['edEyedropperOff', '当前环境不支持吸管，可用下方主题色', 'Eyedropper unavailable; use theme colors below'],
    ['edHueAria', '色相 {v} 度', 'Hue {v} degrees'],
    ['edSvHint', '方向键微调，Shift 加速', 'Arrow keys to adjust, Shift for larger steps'],
  ]
  for (const [key, zh, en] of keys) {
    assert.ok(src.includes(key + ": { zh: '" + zh + "', en: '" + en + "' }"), 'I18N 缺键/中英不匹配：' + key)
    assert.ok(md.includes('`' + key + '`'), '词表缺行：' + key)
  }

  assert.ok(src.includes('edSvHint'), 'SV 键盘提示键在场')
})

test('panelProps 自定义 API：无宿主静默降级 + 槽位/预置读取', async () => {
  const { panelProps } = loadCustomPanel()
  const rec = await panelProps.reconcileCustomThemes()
  assert.equal(rec.source, 'cache', '无桥回缓存')
  assert.deepEqual(rec.themes, [], '空缓存')
  const save = await panelProps.saveCustomTheme({ name: 'x', appearance: 'dark', colors: {}, basePreset: 'opencode' })
  assert.equal(save.ok, false, '无宿主保存失败但不抛')
  const del = await panelProps.deleteCustomTheme('x')
  assert.equal(del.ok, false, '无宿主删除失败但不抛')
  panelProps.setCustomTheme('missing-id') // 缓存未命中 → 对账后仍无 → 静默忽略，不抛
  const groups = panelProps.slotGroups()
  assert.equal(groups.length, 7, '7 大分组')
  assert.equal(groups.reduce((n, g) => n + g.keys.length, 0), 37, '37 色位')
  const preset = panelProps.presetPalette('opencode', 'dark')
  assert.equal(preset.appearance, 'dark', 'opencode 默认外观')
  assert.equal(Object.keys(preset.colors).length, 37, '预置提取 37 色')
  for (const k of Object.keys(preset.colors)) assert.equal(typeof preset.colors[k], 'string', '槽位 ' + k + ' 为字符串')
  const pv = panelProps.customPreview({ colors: SEED_THEME.colors, appearance: 'dark' })
  assert.equal(pv.primary, '#FAB283', '胶囊预览色口径')
})

test('点击应用命中缓存：setCustomTheme 切换 state.theme 且不抛', () => {
  const { panelProps } = loadCustomPanel({
    storage: seedStorage({ themes: [SEED_THEME], dirPath: 'D:\\dsh\\custom-themes' }),
  })
  panelProps.setCustomTheme('aurora-test')
  assert.equal(panelProps.getState().theme, 'custom:aurora-test', '激活键 custom:<id> 隔离写入')
})

// ── 弹窗直渲染（源码级 CustomEditor + 桩 hooks + 真 reactSSR）──
// 覆盖票面“弹窗内改色只动预览”可测侧：渲染期零 document/window 访问（删全局仍不抛），
// 37 槽全绑 data-slot，外观翻底盘走 editorMiniLight（c1 集成）。
import { CustomEditor, PalettePicker, presetToSeed, slotRingStyle, needsReveal, popoverPosition } from '../runtime/custom-editor.mjs'
import { COLOR_SLOTS as ENGINE_SLOTS, extractPresetPalette as enginePreset } from '../src/engine/index.ts'

function mockHooks() {
  return {
    createElement: _React.createElement,
    useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
    useEffect: () => {},
    useRef: (v) => ({ current: v }),
  }
}

function editorProps(appearance, colors) {
  const slotMeta = {}
  for (const s of ENGINE_SLOTS) {
    slotMeta[s.key] = { zh: s.key, en: s.key, useZh: s.key, useEn: s.key, allow: s.allowTransparent }
  }
  const groupMeta = {}
  const groups = [
    { id: 'bg', keys: ENGINE_SLOTS.filter((s) => s.group === 'bg').map((s) => s.key) },
    { id: 'text', keys: ['text', 'textMuted'] },
    { id: 'brand', keys: ['primary', 'secondary', 'info', 'success', 'warning', 'error'] },
    { id: 'border', keys: ['border', 'borderActive'] },
    { id: 'diff', keys: ['diffAdded', 'diffRemoved', 'diffAddedBg', 'diffRemovedBg', 'diffAddedLineNumberBg', 'diffRemovedLineNumberBg'] },
    { id: 'md', keys: ['markdownHeading', 'markdownLink', 'markdownCode', 'markdownEmph', 'markdownStrong', 'markdownBlockQuote'] },
    { id: 'syn', keys: ['syntaxComment', 'syntaxKeyword', 'syntaxFunction', 'syntaxType', 'syntaxNumber', 'syntaxString', 'syntaxOperator'] },
  ]
  for (const g of groups) groupMeta[g.id] = { zh: g.id, en: g.id }
  return {
    h: mockHooks(),
    tr: (k) => 'T:' + k,
    trf: (k, o) => 'T:' + k + JSON.stringify(o || {}),
    lang: 'zh',
    groups,
    groupMeta,
    slotMeta,
    editor: { mode: 'new', seed: { id: null, name: '直渲检查', appearance, colors, basePreset: 'opencode' } },
    customs: [],
    presets: [{ name: 'opencode', appearance: 'dark', colors }],
    presetGroups: [{ title: 't', names: ['opencode'] }],
    isActive: false,
    onSave: () => Promise.resolve({ ok: true }),
    onDelete: () => Promise.resolve({ ok: true }),
    onClose: () => {},
  }
}

function renderEditorPure(appearance, colors, mode = 'new', tweak = null) {
  const saved = {}
  for (const k of ['document', 'window', 'localStorage', 'matchMedia']) {
    if (k in globalThis) { saved[k] = globalThis[k]; delete globalThis[k] }
  }
  try {
    const props = editorProps(appearance, colors)
    props.editor = { mode, seed: { id: mode === 'edit' ? 'seed-id' : null, name: '直渲检查', appearance, colors, basePreset: 'opencode' } }
    if (tweak) tweak(props)
    const el = _React.createElement(CustomEditor, props)
    return _ReactDOMServer.renderToString(el)
  } finally {
    for (const k of Object.keys(saved)) globalThis[k] = saved[k]
  }
}

test('弹窗直渲染：无 DOM 全局不抛 + 槽位落位 + 主色落位', () => {
  const pal = enginePreset('opencode')
  const html = renderEditorPure('dark', pal.colors)
  assert.ok(html.includes('直渲检查'), '编辑中主题名渲染')
  assert.ok(html.includes(pal.colors.primary), '主色绑定到画布/行内样式')
  // 37 槽全部直绑 data-slot（#94：borderActive 从 inputBg 内圈 boxShadow 独立成包裹节点，
  // 预览区 37 个色位各有自己的可点控件 —— 点环开 borderActive，点内开 inputBg）
  for (const s of ENGINE_SLOTS) {
    assert.ok(html.includes('data-slot="' + s.key + '"'), '槽位落位：' + s.key)
  }
  assert.equal(ENGINE_SLOTS.length, 37, '37 色位全落位')
  assert.ok(html.includes('data-slot="inputBg"'), '输入框本体内层节点在场')
  assert.ok(/border:2px solid #[0-9A-Fa-f]{6}55/.test(html), 'borderActive 独立描边环（可点，原型 .cinput :871 的半透明环）')
  assert.ok(html.includes('data-slot="backgroundElement"'), '行内 tip backgroundElement 节点在场（原型 :844）')
  assert.ok(html.includes('T:miniCaption'), '输入框下方说明行在场（原型 :873）')
  assert.ok(html.includes('background-clip:text'), '跟随系统标签渐变字（原型 :101）')
  assert.ok(html.includes('T:edSave'), '保存按钮在场（弹窗默认全量渲染）')
  assert.ok(html.includes('T:miniTip'), '原型署名条在场')
})

test('弹窗直渲染：外观翻底盘跟编辑器走（c1 集成）', () => {
  const pal = enginePreset('opencode')
  const darkHtml = renderEditorPure('dark', pal.colors)
  assert.ok(darkHtml.includes('#0D0D10'), '深色外观深底盘（原型 .dlg-right）')
  const lightHtml = renderEditorPure('light', pal.colors)
  assert.ok(lightHtml.includes('#E2E2E6'), '浅色外观翻浅底盘（不跟 OS，原型 host-light）')
})

test('预置载入同步：选基底 37 色 + 外观一次填好（loadPreset 接缝）', () => {
  const pal = enginePreset('lucent-orng')
  const seed = presetToSeed(pal)
  assert.equal(Object.keys(seed.colors).length, 37, '37 色一次填好')
  assert.equal(seed.appearance, 'light', '外观跟基底走')
  assert.equal(seed.basePreset, 'lucent-orng', '基底名记住')
  assert.equal(seed.colors.background, 'transparent', '透明跟基底走')
  assert.notEqual(seed.colors, pal.colors, '复制不引用原对象（弹窗内改色不污染基底）')
})

test('弹窗不直连换肤：源码无换肤调用（改色只动预览，不碰弹窗外主题）', () => {
  const src = readFileSync(join(import.meta.dirname, '..', 'runtime', 'custom-editor.mjs'), 'utf8')
  for (const ban of ['renderTheme', 'applyStyle', 'overrideTokens', 'buildUpdateTokens', 'setThemeTokens']) {
    assert.equal(src.includes(ban), false, '弹窗源码不应直连换肤：' + ban)
  }
})

// ── #88：弹窗内全部可交互控件的动效钩子覆盖 ──
// 判据：行内 cursor:pointer 的可点控件必须挂 data-palette-interactive；37 色块走 swatch 档；
// 拾色面/输入框（Popover 展开才渲染）在源码里必须用 input 档，不允许档位空转。
function modalInteractiveTags(html) {
  return (html.match(/<[a-zA-Z][^>]*>/g) || []).filter((t) => t.includes('cursor:pointer'))
}

test('#88 弹窗：可点控件全挂动效钩子，37 色块走 swatch 档', () => {  const pal = enginePreset('opencode')
  const html = renderEditorPure('dark', pal.colors)
  const hits = modalInteractiveTags(html)
  assert.ok(hits.length >= 37, '弹窗可点控件样本太少，断言失效：' + hits.length)
  const missing = hits.filter((t) => !t.includes('data-palette-interactive'))
  assert.equal(missing.length, 0, '弹窗未挂动效钩子的可点控件：' + missing.slice(0, 4).join(' | '))
  const swatches = (html.match(/data-palette-interactive="swatch"/g) || []).length
  assert.ok(swatches >= 37, '37 色块必须走 swatch 档，实测：' + swatches)
  assert.ok((html.match(/data-palette-interactive="button"/g) || []).length >= 3, '外观分段/关闭/保存等按钮走 button 档')
  const src = readFileSync(join(import.meta.dirname, '..', 'runtime', 'custom-editor.mjs'), 'utf8')
  assert.ok(src.includes('UI_INTERACTIVE_ATTR'), '弹窗源码必须消费钩子属性')
  // 预置载入胶囊只在载入 Popover 展开时渲染，SSR 渲不到 → 档位用源码级断言守（不空转）
  assert.ok(src.includes('TIER_CHIP'), '预置载入胶囊应走 chip 档')
  for (const tier of ['TIER_SWATCH', 'TIER_BUTTON', 'TIER_INPUT']) {
    assert.ok(src.includes(tier), '弹窗源码缺档位使用：' + tier)
  }
})

// ── 原型像素口径审计（custom-editor-83.prototype.html 逐字对齐）──
// SSR 能渲到的走渲染断言；弹窗内部态（调色板/预置展开）走源码字面量断言。
test('原型口径：顶栏/rleft/输入/徽标/syslabel 与弹窗定位字面量', () => {
  const pal = enginePreset('opencode')
  const html = renderEditorPure('dark', pal.colors)
  assert.ok(html.includes('class="rleft"'), '顶栏左组带 rleft 类（原型 :622）')
  // 原型 .txt :88 是 min-width:170 的自动宽（fitWidth 还会按输入文本量宽）；
  // 用户 m09433「固定宽」→ 用户 m09582「胶囊可长、输入框可短、总量不变」：改为名字区整体定宽（详见 m09582-1 用例）。
  assert.ok(html.includes('min-width:322px') && html.includes('max-width:322px'), '名字区定宽 322（用户 m09582，取代原型 :88 自动宽）')
  assert.ok(html.includes('border:2px solid '), '顶部胶囊 2px 选中边（原型 chipStyle sel :518）')
  assert.ok(html.includes('margin:-1px'), '顶部胶囊 2px 边距补偿（原型 .chip.sel :55）')
  assert.ok(html.includes('@supports') && html.includes('.syslabel'), '跟随系统双色字走原生 @supports（原型 :101）')
  assert.ok(html.includes('color:#F0F0F0'), 'syslabel 回落纯色（原型 :100）')
  const src = readFileSync(join(import.meta.dirname, '..', 'runtime', 'custom-editor.mjs'), 'utf8')
  assert.ok(src.includes("maxWidth: '230px'"), '基底下拉 max-width 230（原型 :94，编辑态才渲染故走源码断言）')
  assert.equal((src.match(/position: 'fixed', zIndex: 60/g) || []).length, 2, '调色板+预置弹窗均为 fixed（原型 .pop :185）')
  // #94 起调色板改为「锚定被点元素」的 popoverPosition 纯函数（下方优先/翻转/夹紧），
  // 旧的「视口右夹 + 预览区左夹」公式退役；预置弹窗仍是原型视口坐标公式（原型 :1061-1062），照旧 pin。
  assert.ok(src.includes('vw - W - 20') && src.includes('vh - 430'), '预置弹窗视口坐标公式（原型 :1061-1062）')
  assert.ok(src.includes('popoverPosition(ar, bounds, { width: POP_W, height: POP_H }, pop.preferSide)'), '#94/#93 调色板定位走锚点纯函数（按入口类型选纵向/侧向规则）')
  // m09582 需求 2 之后这些字面量改走宿主 token，兜底值仍是原型色（见末条 m09582-2 用例）。
  assert.ok(src.includes("outline: psel ? '1px solid ' + TK.accent : undefined"), '选中基底描边走强调色 token（原型 realChipStyle :537）')
  assert.ok(src.includes('color: TK.accent, visibility: psel ?'), '基底对勾恒强调色（原型 realChipInner :542）')
  assert.ok(src.includes("hover: 'var(--dsw-alias-interactive-bg-hover, #1A1A20)'") && src.includes("'var(--dsw-alias-border-l2-darkmode-thin, #2A2A31)'"), '行悬停底/边走宿主 token，兜底 = 原型 .crow:hover :129 的 #1A1A20/#2A2A31')
  assert.ok(src.includes('presetLabelOf(n)).toLowerCase()'), '预置搜索含中文名（原型 hay :1100）')
  assert.ok(src.includes('setShowPresets(false) // 原型 OPEN_POP'), '开调色板收起预置弹窗（原型 :427）')
  assert.ok(src.includes("fontSize: '12px', margin: '0 0 8px'"), '调色板标题无加粗（原型 .pop h4 :186）')
  const hexInAt = src.indexOf('spellCheck: false')
  assert.ok(hexInAt > 0 && !src.slice(hexInAt, hexInAt + 400).includes('Consolas'), 'hex 输入框非等宽字体（原型 .txt 口径 :991）')
  // #95：常用色块改为「主题色按分组优先级 10 个」，带 hex title（悬停可见具体值）与指针手势。
  const rcAt = src.indexOf("key: 'rc-' + i")
  assert.ok(rcAt > 0 && src.slice(rcAt, rcAt + 420).includes('data-picker-recent-swatch'), '常用色块走主题色 + data-picker-recent-swatch 标记')
  assert.ok(src.slice(rcAt, rcAt + 420).includes("cursor: 'pointer'"), '常用色块保留指针手势（可点）')
})

// ── 弹窗尺寸口径（用户 m08383 亲定，覆盖原型：高度正好等于预览区、整屏居中、一行控件同高）──
// 实测口径（Chrome 无头测量）：预览区 border-box 外高 540；右列上下 padding 12×2 → 主体 564；
// 顶栏一行 32（原型全局 *{box-sizing:border-box} :10，行内样式必须补 border-box，否则 input/徽标按内容盒涨到 46/40）。
test('弹窗尺寸：高度=预览区 564、纯 center 居中、一行控件同高 32', () => {
  const pal = enginePreset('opencode')
  const html = renderEditorPure('dark', pal.colors)
  const src = readFileSync(join(import.meta.dirname, '..', 'runtime', 'custom-editor.mjs'), 'utf8')
  // 居中：改纯 center（safe center 在不支持的引擎里整条声明失效，会退化成拉伸/左上）
  assert.ok(/align-items:center;justify-content:center;padding:18px/.test(html), 'backdrop 用纯 center 居中（用户 m08383）')
  assert.ok(!src.includes('safe center'), '不再依赖 safe center（用户 m08383）')
  assert.ok(html.includes('max-height:calc(100vh - 36px)'), '上限=可用区（100vh - backdrop 上下 padding），居中且小屏不裁切')
  // 高度口径：预览区按 border-box 算外高 540，主体固定 564 = 540 + 12×2，不再被 flex:1 拉到 95vh 留白
  assert.ok(html.includes('box-sizing:border-box;min-height:540px'), '预览区 border-box + 540（原型全局 reset :10 / .mini :150）')
  assert.ok(html.includes('height:564px'), '主体高度 564，正好展示完全预览区')
  assert.ok(src.includes("height: '564px', flex: '0 1 auto'"), '主体不再 flex:1 拉满，只在屏幕过矮时收缩')
  // 一行控件同高 32：名称输入（新建态实测过 46）
  const nameTag = (html.match(/<input[^>]*id="f-name"[^>]*>/) || [''])[0]
  assert.ok(nameTag.includes('box-sizing:border-box'), '名称输入 border-box（否则 32+12 padding+2 边框=46）')
  assert.ok(nameTag.includes('height:32px'), '名称输入高 32，与同行按钮/胶囊同高')
  // 编辑态：edtag 徽标同口径（否则 32+3+3 padding+2 边框=40，把编辑顶栏撑到 61）
  // editTgt 需要 customs 里存在同 id 的已存主题，否则徽标不渲染（组件 :802）
  const editHtml = renderEditorPure('dark', pal.colors, 'edit', (p) => {
    p.customs = [{ id: 'seed-id', name: '我的主题', appearance: 'dark', colors: pal.colors }]
  })
  const edtag = (editHtml.match(/<span[^>]*title="T:edTagTitle"[^>]*>/) || [''])[0]
  assert.ok(edtag.includes('box-sizing:border-box') && edtag.includes('height:32px'), '编辑态 edtag 也是 32（border-box）')
})

// ── 用户 m08636 四条（编辑新增页面实测反馈）──
// 真 DOM 实测数据（Chrome 无头 + React 真 hooks，见 .scratch-ed-dom.mjs）：
//   左列 scrollH=2010 clientH=564 scrollbarColor=rgba(0,0,0,0)（不滑动不可见）；
//   行标签 gap=6（标题右边缘 +6）、vcenterDelta=2、不压色块；预览标签 fixed z=9999 且在视口内。
test('m08636-4：37 个色位命中时，预览里每个受影响元素都吃焦点圈（纯函数缝）', () => {
  for (const s of ENGINE_SLOTS) {
    const ring = slotRingStyle(s.key, s.key)
    assert.ok(ring && !ring.boxShadow.includes('undefined'), '色位自身必须被圈：' + s.key)
  }
  assert.equal(ENGINE_SLOTS.length, 37, '37 色位')
  assert.ok(slotRingStyle('text', 'text').boxShadow.startsWith('inset'), '普通色位内圈（原型 .hl）')
  assert.ok(slotRingStyle('border', 'border').boxShadow.startsWith('0 0 0 2px'), 'border 外圈（原型 .hl-edge）')
  assert.ok(slotRingStyle('borderActive', 'borderActive').boxShadow.startsWith('0 0 0 2px'), 'borderActive 外圈')
  // EXTRA_HL 别名：border 系命中时同圈（原型 paintHl:896-900 的 .side/.md/.cinput 口径）
  for (const alias of ['sidebarBg', 'backgroundPanel', 'bubbleBg', 'inputBg']) {
    assert.ok(slotRingStyle('border', alias), 'border 别名同圈：' + alias)
  }
  assert.ok(slotRingStyle('borderActive', 'inputBg'), 'borderActive 别名同圈：inputBg')
  assert.equal(slotRingStyle(null, 'text'), null, '无悬浮不圈')
  assert.equal(slotRingStyle('text', 'markdownLink'), null, '无关色位不圈')
})

test('m08636-4：非 node 载体（文本 span / 代码 token / textMuted 行）也走同一圈判定', () => {
  const src = readFileSync(join(import.meta.dirname, '..', 'runtime', 'custom-editor.mjs'), 'utf8')
  assert.ok(src.includes("Object.assign({ key: key, 'data-slot': slot, className: ringCls(slot), style: clickableSpanStyle(slot) }, bindSlot(slot))"), 't() 文本 span 吃圈 + 吃悬浮 + 可点开弹板（一句话的每个组成部分）')
  assert.ok(src.includes('const clickableSpanStyle = function (slot, base)'), '可点文本 span 的合并样式收口到一处（#94 code-review）')
  assert.equal((src.match(/clickableSpanStyle\(/g) || []).length, 4, 't() + 3 处裸 span = 4 处引用（定义行不计）')
  assert.ok(src.includes("'data-slot': p.s, className: ringCls(p.s)"), '代码块 token span 吃圈')
  assert.equal((src.match(/'data-slot': 'textMuted', className: ringCls\('textMuted'\)/g) || []).length, 2, 'textMuted 两处（代码头 js + 输入说明）都吃圈')
  // 结构门禁：data-slot 落点共 5 处，每处都必须接圈（新增裸 data-slot 会打破计数，逼作者接线）
  assert.equal((src.match(/'data-slot':/g) || []).length, 5, 'data-slot 落点数变化必须同步接圈')
})

test('m08636-1：预览小标签改挂 fixed 覆盖层，层级高于预览区且不被容器裁', () => {
  const src = readFileSync(join(import.meta.dirname, '..', 'runtime', 'custom-editor.mjs'), 'utf8')
  assert.ok(src.includes("position: 'fixed', zIndex: 9999"), 'fixed 覆盖层 + zIndex 9999（原型 badge 挂 body :908 口径）')
  assert.equal(src.includes("top: '-9px', right: '-6px'"), false, '节点内小标签已移除（原会被 .mini{overflow:hidden} 裁掉）')
  assert.ok(src.includes("mini.querySelector('[data-slot=\"' + hl + '\"]')"), '锚点 = 预览里第一个命中元素（原型 matches[0] :903）')
  assert.ok(src.includes("mini.querySelector('.' + HL_CLS)"), '无直命中取第一个焦点圈元素（原型 extras[0] :903）')
  // 原型坐标公式（prototype.html:911-917）
  assert.ok(src.includes('const small = r.width < bw + 12'), '小元素改挂右侧（原型 :911）')
  assert.ok(src.includes('if (top < 28) top = r.top + 4'), '贴顶改挂下方（原型 :913）')
  assert.ok(src.includes('if (top < dr.top + 4) top = r.top + 4'), '不钻到弹窗顶栏里（原型 :915）')
  assert.ok(src.includes('left + bw > vw - 4) left = vw - bw - 4'), '视口右边界夹紧（原型 :917）')
})

test('m08636-2：左列滚动条不滑动时不可见，右画布列隐藏滚动条（原型 :143-148）', () => {
  const pal = enginePreset('opencode')
  const html = renderEditorPure('dark', pal.colors)
  assert.ok(html.includes('class="dspe-dlg-left"') && html.includes('class="dspe-dlg-right"'), '左右列挂滚动条钩子类')
  assert.ok(html.includes('.dspe-dlg-left{scrollbar-width:thin;scrollbar-color:transparent transparent}'), '左列默认透明（看不见）')
  assert.ok(html.includes('.dspe-dlg-left:hover{scrollbar-color:var(--dsw-alias-scrollbar-hover-l1, #3A3A44) transparent}'), '悬停才现形（走宿主滚动条 token，兜底 #3A3A44）')
  assert.ok(html.includes('.dspe-dlg-left::-webkit-scrollbar-thumb{background:transparent'), 'webkit 默认透明')
  assert.ok(html.includes('.dspe-dlg-left:hover::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-hover-l1, #3A3A44)'), 'webkit 悬停现形')
  assert.ok(html.includes('.dspe-dlg-right{scrollbar-width:none}'), '右列隐藏滚动条（原型 :147）')
  assert.ok(html.includes('.dspe-dlg-right::-webkit-scrollbar{display:none'), '右列 webkit 隐藏（原型 :148）')
})

test('m08636-3：左列悬浮小标签贴标题控件右侧（不再压行角）', () => {
  const src = readFileSync(join(import.meta.dirname, '..', 'runtime', 'custom-editor.mjs'), 'utf8')
  assert.ok(src.includes("left: 'calc(100% + 6px)'"), '标签挂标题右边缘 +6（原型 paintHl:928）')
  assert.ok(src.includes("transform: 'translate(' + (-rowShift) + 'px, -50%)'"), '垂直居中 + 长名夹紧位移（原型 :929-931）')
  assert.ok(src.includes("shift = unRight - (rr.right - 4)"), '夹紧：右边缘不越行右边界 4px（原型 :929）')
  assert.ok(src.includes("if (unLeft - shift < rr.left + 4)"), '夹紧：最少贴行左 4px（原型 :930）')
  const rowAt = src.indexOf("'data-row': key,")
  assert.ok(rowAt > 0, '找得到左列行渲染')
  const seg = src.slice(rowAt, rowAt + 2600)
  const wrapAt = seg.indexOf("position: 'relative', display: 'inline-block', maxWidth: '100%'")
  const bAt = seg.indexOf("e('b', {")
  const badgeAt = seg.indexOf("calc(100% + 6px)")
  const swatchAt = seg.indexOf("'data-slot-row': key")
  assert.ok(wrapAt > 0 && bAt > wrapAt && badgeAt > bAt && swatchAt > badgeAt, 'DOM 归属：标题包裹盒 > <b> 标题 > 小标签 > 色块')
})

// ── 用户 m09226：预览区鼠标悬浮某个内容 → 左列滑到对应色位行「出现视野中」──
// 真 DOM 实测（Chrome 无头 + React 真 hooks，.scratch-ed-dom.mjs 的 reveal 场景）：
//   悬浮视野外色位 → 调 scrollIntoView({block:'center',behavior:'smooth'})，行进入左列可视区且左列 scrollTop 变化；
//   悬浮已在视野内的色位 → needsReveal=false，不再调用（鼠标扫过预览时列表不空抖）。
test('m09226：预览悬浮联动左列滚动（needsReveal 纯函数 + 原型 center/smooth 口径）', () => {
  const view = { top: 100, height: 564 }    // 左列可视区
  const inside = { top: 200, height: 64 }   // 完全在视野内
  const above = { top: 60, height: 64 }     // 被上沿裁掉
  const below = { top: 640, height: 64 }    // 被下沿裁掉
  const flushTop = { top: 108, height: 64 } // 正好贴内边距下沿
  assert.equal(needsReveal(view, inside, 8), false, '已在视野内不动')
  assert.equal(needsReveal(view, above, 8), true, '上沿外要滑')
  assert.equal(needsReveal(view, below, 8), true, '下沿外要滑')
  assert.equal(needsReveal(view, flushTop, 8), false, '贴边（留 REVEAL_PAD 余量）也算进视野')
  assert.equal(needsReveal(view, { top: 660, height: 64 }, 8), true, '下沿只压一点也要滑')
  assert.equal(needsReveal(null, inside, 8), false, '无测量不动（假宿主/SSR 不抛）')
  assert.equal(needsReveal(view, {}, 8), false, '行未挂载不动')
  const src = readFileSync(join(import.meta.dirname, '..', 'runtime', 'custom-editor.mjs'), 'utf8')
  assert.ok(src.includes('function revealRow(key)') && src.includes('revealRow(slot)'), '预览悬浮入口接 revealRow')
  assert.ok(src.includes("row.scrollIntoView({ block: 'center', behavior: 'smooth' })"), '滑动口径 = 原型 scrollToRow :938（居中 + 平滑）')
  assert.equal(src.includes("block: 'nearest'"), false, '旧 nearest 口径已收敛到原型')
  assert.ok(src.includes("ref: leftColRef, className: 'dspe-dlg-left'"), '左列挂 ref（量视野用）')
  // 结构门禁：预览里 5 处 data-slot 全走 bindSlot（原型 :743 `#mini [data-slot]` 全绑）。
  // 悬浮因此跟着「最内层命中元素」走 —— 联动的才是用户真正悬停的那个色位。
  assert.equal((src.match(/bindSlot\(/g) || []).length, 5, 'data-slot 落点数变化必须同步接悬浮')
  assert.equal((src.match(/'data-slot':/g) || []).length, 5, 'data-slot 落点仍是 5 处')
})

// ── 用户 m09433（输入框固定宽）→ 用户 m09582 需求 1（胶囊可随名字变长、输入框可变短，总量不变）──
// 真 DOM 实测（.scratch-ed-dom.mjs namewidth 场景，Chrome 无头 + React 真 hooks）：
//   改前：输入框随内容跳（初始 170 / 20 字 243 / 2 字 170 / 清空 184，行 882→1125，弹窗跟着变宽）；
//   m09433：钉死 200（5 个状态恒 200，1280 视口不溢出；试过 240，1000 视口会加出 18px 溢出）；
//   m09582：名字区总量钉死 322 = 输入框基准 200 + 间隙 8 + 胶囊基准 114（新建态「（未命名）」实测宽），
//   胶囊随名字变长 → 输入框等比让位（下限 90），胶囊封顶 224 后自己收窄打省略号：顶行总量与弹窗宽度不再随名字变化。
//   关键坑（真 DOM 抓到）：弹窗 width:max-content 会把「内容宽」算进整窗宽度 —— 只钉区宽不够，
//   输入框 width:100%（百分比在自量宽里按 auto）与胶囊的无上限内容宽都会把 dlg 宽带着跑（实测 718~878 跳动）。
test('m09582-1：名字区定宽 322 —— 胶囊随名字变长、输入框变短，总量不变', () => {
  const src = readFileSync(join(import.meta.dirname, '..', 'runtime', 'custom-editor.mjs'), 'utf8')
  assert.ok(src.includes('const NAME_INPUT_W = 200'), '输入框基准宽 200（保留 m09433 的观感）')
  assert.ok(src.includes('const NAME_ZONE_W = 322'), '名字区总宽 = 200 + 8 + 114（输入框基准 + 间隙 + 新建态胶囊实测宽）')
  assert.ok(src.includes('const NAME_INPUT_MIN = 90'), '输入框可缩下限 90')
  assert.ok(src.includes('const NAME_CAP_MAX = NAME_ZONE_W - 8 - NAME_INPUT_MIN'), '胶囊上限 224 = 区宽 − 间隙 − 输入框下限')
  // 区宽三向钉死：弹窗是 width:max-content，只给 flex-basis 挡不住按内容自量宽。
  assert.ok(src.includes("width: NAME_ZONE_W + 'px', minWidth: NAME_ZONE_W + 'px', maxWidth: NAME_ZONE_W + 'px'"), '名字区 width/min/max 全钉死')
  assert.ok(src.includes("flex: '1 1 0px', minWidth: NAME_INPUT_MIN + 'px', display: 'flex'"), '输入框包裹盒可长可缩且留下限')
  assert.ok(src.includes("flex: '1 1 0px', width: '0px', minWidth: 0"), '输入框在区内按剩余空间取值（width:0 断掉内容宽泄漏）')
  assert.ok(src.includes('maxWidth: NAME_CAP_MAX'), '胶囊 max-width 封顶（断掉胶囊内容宽泄漏）')
  assert.ok(src.includes("cursor: 'default', flex: '0 1 auto', minWidth: 0, overflow: 'hidden'"), '胶囊可被压缩（到顶才省略）')
  assert.ok(src.includes("overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 } }, capName"), '胶囊名字超长打省略号')
  assert.equal(src.includes("flex: '0 0 auto', width: NAME_INPUT_W + 'px'"), false, 'm09433 的「输入框自己钉死 200」写法已被名字区取代')
  assert.equal(src.includes("flex: 1, minWidth: '170px', width: '100%'"), false, '旧的自动宽度写法已移除')
  // 宽度只能由 CSS 决定：原型 fitWidth 的「量字设输入框宽」与「累加定 dlg 宽」两段会把名字带进弹窗总宽
  // （真 DOM 实测：留着它们时 dlg 随名字在 722~884 间跳、顶行溢出 106~230px）。
  assert.equal(src.includes('inp.style.width ='), false, '输入框宽度不再由 JS 量字设定（交给定宽区 flex 分配）')
  assert.equal(src.includes('dlg.style.width ='), false, '弹窗宽度不再由 JS 量字累加设定（交给 CSS max-content）')
  assert.ok(src.includes("sel.style.width = sw + 'px'"), '编辑态目标下拉仍按选中项文字定宽（fitWidth 保留段）')
  assert.ok(src.includes('mw = Math.max(mw, x.offsetWidth || 0)'), '左列 .nm 齐宽仍在（fitWidth 保留段）')
})

// ── 用户 m09582 需求 2：编辑/新增弹窗 chrome 跟随当前系统主题（预览区除外）──
// 宿主 DSH 与调色板主题都把 --dsw-alias-* 定义在 body 上（映射表唯一真相源 src/engine/map-dsh.ts），
// 所以 chrome 吃 var() 即同时跟随「宿主深浅色」与「当前选中的调色板主题」，零 JS 传参；
// 兜底值 = 改造前的深色字面量（SSR/无宿主时观感与之前完全一致）。
test('m09582-2：弹窗 chrome 走宿主语义 token（预览区仍显被编辑主题色）', () => {
  const pal = enginePreset('opencode')
  const html = renderEditorPure('dark', pal.colors)
  const src = readFileSync(join(import.meta.dirname, '..', 'runtime', 'custom-editor.mjs'), 'utf8')
  assert.ok(html.includes('background:var(--dsw-alias-bg-layer-1, #141419)'), '弹窗底走 bg-layer-1')
  assert.ok(html.includes('background:var(--dsw-alias-bg-layer-2, #1C1C21)'), '输入框/按钮底走 bg-layer-2')
  assert.ok(html.includes('color:var(--dsw-alias-label-primary, #E7E7EA)'), '正文色走 label-primary')
  assert.ok(html.includes('border:1px solid var(--dsw-alias-border-l1, #33333A)'), '描边走 border-l1')
  assert.ok(html.includes('box-shadow:inset 0 0 0 2px var(--dsw-alias-brand-primary, #FAB283)'), '选中环走 brand-primary')
  assert.ok(html.includes('background:var(--dsw-alias-button-primary-fill, #FAB283)'), '主按钮走 button-primary-fill')
  assert.ok(src.includes("borderColor: TK.danger, boxShadow: '0 0 0 1px ' + TK.danger"), '空名校验走 state-error-primary（仅空名态渲染，走源码断言）')
  // 用到的 token 必须都在引擎映射表里：拼错拿不到宿主值会静默回落深色，等于悄悄退回旧观感。
  const used = Array.from(new Set((html + src).match(/--dsw-alias-[a-z0-9-]+/g) || []))
  assert.ok(used.length >= 14, '弹窗 token 覆盖面（实测 ' + used.length + ' 个）')
  const map = readFileSync(join(import.meta.dirname, '..', 'src', 'engine', 'map-dsh.ts'), 'utf8')
  const known = new Set(map.match(/--dsw-alias-[a-z0-9-]+/g) || [])
  const unknown = used.filter((t) => !known.has(t))
  assert.equal(unknown.join(','), '', '所有 token 都在 map-dsh.mjs 映射表内')
  // 预览区除外：画布底色/顶栏预览胶囊/外观 seg 仍由「被编辑主题」与「外观选项」决定。
  assert.ok(src.includes("background: miniLight ? '#E2E2E6' : '#0D0D10'"), '右画布底色仍随被编辑主题外观')
  assert.ok(src.includes("background: capFace, color: capFg, border: '2px solid ' + capPrimary"), '顶栏预览胶囊仍显被编辑主题色')
  assert.ok(src.includes("background: '#0B0B0E', borderColor: '#3A3A44', color: '#EDEDEF'"), '外观 seg 深浅双色不随宿主变')
  // 结构门禁（本轮实测踩过）：token 拼串时若把「, color: 」并进了 border 值，整条声明失效、颜色回落 UA 黑。
  const glued = html.match(/, (color|background|border|padding|font-size|border-radius|height|width)\s*:/g) || []
  assert.equal(glued.join(','), '', 'token 拼串不许把属性名并进值里（实测踩过：border 值里混进 , color: → 声明整条失效）')
})

// ── 用户 m09582 追加：窄视口顶栏换行回退（用户口径：不许控件被弹窗裁掉）──
// 真 DOM 实测（1256 视口，编辑态顶行要约 1257px，而弹窗被 maxWidth:96vw 卡在 1205.76）：
//   改前（原型 nowrap 口径）：外观三连/保存钮被 dialog 的 overflow:hidden 裁掉 52px
//     （rrightRight 1284 > dlgRight 1232；名字越长约糟，最长名可溢出 573px）；
//   改后（按需换行）：顶栏落成两行，rowOverflow 0、rrightRight 1215 < dlgRight 1232，无裁剪。
test('m09582-3：窄视口顶栏按需换行 —— 控件不被弹窗裁掉（用户口径优先于原型 nowrap）', () => {
  const src = readFileSync(join(import.meta.dirname, '..', 'runtime', 'custom-editor.mjs'), 'utf8')
  assert.ok(src.includes("className: 'row1', style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap'"), '顶栏按需换行（原型 .row1 是 nowrap）')
  assert.ok(src.includes("maxWidth: '96vw'"), '弹窗仍留 96vw 视口上限：回退手段是换行，不是放宽上限')
})

// ── 用户 m10028：Popover 先在屏幕左上角闪一帧再跳到目标位 ──
// 机制：坐标由异步 effect 算出，而渲染侧写的是 `popPos || 兜底位` —— 首帧画的就是兜底位（屏幕左上角），
// effect 跑完才跳到位。真 DOM 取证（.scratch-ed-dom.mjs 的 popflash 场景；MutationObserver 回调是微任务，
// DOM 已提交而绘制未发生，取到的 rect 就是用户看到的第一帧）：
//   改前 预置弹窗 insert=(16,86) → raf1=(16,86)（绘制时刻仍在左上角）→ t30=(540,112)；
//        调色板     insert=(40,120) → t50=(189,203)；
//   改后 预置弹窗 raf1=null（首帧还没渲染）→ insert=t30=(540,112)；调色板 insert=t50=final=(189,203)。
test('m10028：Popover 定位未算出前不渲染（首帧即最终位，不再左上角闪一下）', () => {
  const src = readFileSync(join(import.meta.dirname, '..', 'runtime', 'custom-editor.mjs'), 'utf8')
  assert.ok(src.includes('if (!pop || !popPos) return null'), '调色板：没定位就不渲染')
  assert.ok(src.includes('if (!showPresets || !presetPos) return null'), '预置弹窗：没定位就不渲染')
  assert.equal((src.match(/popPos \|\|/g) || []).length, 0, '不许再用 popPos || 兜底位画首帧')
  assert.equal((src.match(/presetPos \|\|/g) || []).length, 0, '不许再用 presetPos || 兜底位画首帧')
  assert.ok(src.includes('}, popPos)'), '调色板坐标只来自定位状态')
  assert.ok(src.includes('}, presetPos)'), '预置弹窗坐标只来自定位状态')
  // 兜底位仍要留给「量不到锚点」的失败路径：否则弹窗永远不出现，比闪一下更糟。
  assert.ok(src.includes('const POP_FALLBACK = { left: 40, top: 120 }'), '调色板兜底位提成常量（#94 code-review：三处重复收口）')
  assert.ok(src.includes('setPopPos(POP_FALLBACK)'), '调色板量不到锚点时给兜底位')
  assert.ok(src.includes('setPresetPos({ left: 10, top: 140 })'), '预置弹窗量不到锚点时给兜底位')
})

// ── 票 #94：预览区控件原地打开调色盘（锚定被点元素 + 左列高亮不强制滚动）──
// 弹板定位纯函数：默认贴锚点下方（间距 POP_GAP）→ 下方空间不足翻上方 → 水平对齐锚点左缘并夹进
// 「视口 ∩ 弹窗」边界（四边各留 POP_MARGIN）→ 两侧都放不下时贴空间更大的一侧夹紧。
// 验收口径（票面）：弹板完整落在视口内；与被点元素 rect 相交或间距 ≤8px（四角场景同样成立）。
// 尺寸 = #95 取色器盒实测外框 320×388（内容 294 = 320 − padding 24 − border 2；高度构成见 runtime 注释）；
// 渲染侧 border-box + 显式宽高，所以常量与 getBoundingClientRect 恒等。
const POP_SIZE = { width: 320, height: 388 }
// 左列入口色块外框（runtime 的单源是 swatch 样式 30×22；这里只作锚点 rect 的测试夹具）。
const SWATCH = { width: 30, height: 22 }

function anchorRect(left, top, width, height) {
  return { left, top, right: left + width, bottom: top + height, width, height }
}

function popRectGap(anchor, pos) {
  const xGap = Math.max(0, Math.max(anchor.left - (pos.left + POP_SIZE.width), pos.left - anchor.right))
  const yGap = Math.max(0, Math.max(anchor.top - (pos.top + POP_SIZE.height), pos.top - anchor.bottom))
  return Math.max(xGap, yGap)
}

function assertInside(pos, bounds, margin, label) {
  assert.ok(pos.left >= bounds.left + margin, label + '：左边不越界')
  assert.ok(pos.top >= bounds.top + margin, label + '：上边不越界')
  assert.ok(pos.left + POP_SIZE.width <= bounds.right - margin, label + '：右边不越界')
  assert.ok(pos.top + POP_SIZE.height <= bounds.bottom - margin, label + '：下边不越界')
}

test('#94：popoverPosition —— 下方优先、底部翻转、水平夹紧（视口 1280×900）', () => {
  const viewport = { left: 0, top: 0, right: 1280, bottom: 900 }
  const mid = popoverPosition(anchorRect(400, 200, 60, 20), viewport, POP_SIZE)
  assert.equal(mid.left, 400, '水平对齐锚点左缘')
  assert.equal(mid.top, 228, '下方间距 = POP_GAP 8')
  assert.equal('placement' in mid, false, '不把测试用 placement 字段带进坐标（#94 code-review）')
  const bottom = popoverPosition(anchorRect(400, 800, 60, 20), viewport, POP_SIZE)
  assert.equal(bottom.top, 404, '底部空间不足翻上方 = 锚点顶 − 8 − 弹板高 388')
  const leftEdge = popoverPosition(anchorRect(0, 300, 80, 20), viewport, POP_SIZE)
  assert.equal(leftEdge.left, 10, '左缘夹到视口内边距 10')
  const rightEdge = popoverPosition(anchorRect(1200, 300, 80, 20), viewport, POP_SIZE)
  assert.equal(rightEdge.left, 950, '右缘夹紧（1280 − 10 − 320）')
  assert.equal(popoverPosition(null, viewport, POP_SIZE), null, '无锚点返回 null（调用方给兜底位）')
  assert.equal(popoverPosition(anchorRect(10, 10, 40, 20), null, POP_SIZE), null, '无边界返回 null')
  assert.equal(popoverPosition(anchorRect(10, 10, 0, 0), viewport, { width: 0, height: 0 }), null, '无尺寸返回 null')
})

test('#94：popoverPosition —— 锚点在视口四角时弹板完整落在视口内且贴近被点元素', () => {
  const viewport = { left: 0, top: 0, right: 1280, bottom: 900 }
  const corners = [
    anchorRect(8, 8, 60, 20),        // 左上
    anchorRect(1212, 8, 60, 20),     // 右上
    anchorRect(8, 872, 60, 20),      // 左下
    anchorRect(1212, 872, 60, 20),   // 右下
  ]
  for (const a of corners) {
    const pos = popoverPosition(a, viewport, POP_SIZE)
    assert.ok(pos, '四角都要有结果')
    assertInside(pos, viewport, 10, '四角 ' + JSON.stringify(a))
    assert.ok(popRectGap(a, pos) <= 8, '与被点元素间距 ≤8px：' + JSON.stringify({ a, pos }))
  }
  // 视口比弹板矮：两边都放不下时按边界夹紧（不越界；#94 review：不把 placement 当坐标带出去）。
  const shortVp = { left: 0, top: 0, right: 1280, bottom: 500 }
  const clamped = popoverPosition(anchorRect(600, 240, 40, 20), shortVp, POP_SIZE)
  assert.ok(clamped, '矮视口仍给结果')
  assert.equal(clamped.top, 102, '两侧都放不下 → 夹在视口下边界内（500 − 10 − 388）')
  assertInside(clamped, shortVp, 10, '矮视口')
})

test('#94：popoverPosition —— 以「视口 ∩ 弹窗」为边界，弹板不越出编辑弹窗', () => {
  const dialog = { left: 300, top: 100, right: 900, bottom: 700 }
  const pos = popoverPosition(anchorRect(830, 300, 50, 20), dialog, POP_SIZE)
  assert.ok(pos, '弹窗内锚点有结果')
  assertInside(pos, dialog, 10, '弹窗边界')
  assert.equal(pos.left, 570, '右缘按弹窗右边界夹紧（900 − 10 − 320）')
  const leftSide = popoverPosition(anchorRect(310, 300, 40, 20), dialog, POP_SIZE)
  assert.equal(leftSide.left, 310, '左缘在弹窗内时仍对齐锚点（不被视口公式推走）')
})

// ── 票 #93：左列色块入口原地打开调色盘（复用 #94 锚点引擎，侧向优先）──
// 规则：优先贴入口色块右侧（POP_GAP 8）、垂直居中；右侧空间不足翻左侧；最终夹进「视口 ∩ 弹窗」。
// 验收口径（票面）：弹板与入口色块 rect 相交或间距 ≤8px、完整落在视口内、不压住入口色块。
test('#93：popoverPosition —— 左列入口贴色块右侧垂直居中，放不下翻左侧', () => {
  const viewport = { left: 0, top: 0, right: 1280, bottom: 900 }
  const mid = popoverPosition(anchorRect(200, 300, SWATCH.width, SWATCH.height), viewport, POP_SIZE, 'right')
  assert.equal(mid.left, 238, '贴色块右侧 = 锚点右 + 8')
  assert.equal(mid.top, 117, '垂直居中 = 锚点中心 − 弹板高/2（300 + (22 − 388)/2）')
  assert.equal(popRectGap(anchorRect(200, 300, SWATCH.width, SWATCH.height), mid), 8, '与入口色块间距 ≤8px')
  const flip = popoverPosition(anchorRect(1200, 300, SWATCH.width, SWATCH.height), viewport, POP_SIZE, 'right')
  assert.equal(flip.left, 872, '右侧放不下翻左侧 = 锚点左 − 8 − 320')
  assert.ok(flip.left + POP_SIZE.width <= 1200, '翻左后不压住入口色块')
  const firstRow = popoverPosition(anchorRect(200, 0, SWATCH.width, SWATCH.height), viewport, POP_SIZE, 'right')
  assert.equal(firstRow.top, 10, '首行垂直居中夹到上边距 10')
  const lastRow = popoverPosition(anchorRect(200, 878, SWATCH.width, SWATCH.height), viewport, POP_SIZE, 'right')
  assert.equal(lastRow.top, 502, '末行夹到下边界（900 − 10 − 388）')
})

test('#93：popoverPosition —— 窄弹窗（960px）内翻左/夹紧且完整落在边界内', () => {
  const narrow = { left: 40, top: 60, right: 1000, bottom: 760 } // 960 宽弹窗
  const a = anchorRect(800, 300, SWATCH.width, SWATCH.height)
  const pos = popoverPosition(a, narrow, POP_SIZE, 'right')
  assert.ok(pos, '窄弹窗有结果')
  assertInside(pos, narrow, 10, '窄弹窗')
  assert.ok(pos.left + POP_SIZE.width <= a.left, '右侧放不下 → 翻到入口左侧（不压住色块）')
  assert.ok(popRectGap(a, pos) <= 8, '与入口间距 ≤8px（翻左）')
  // 色块左右两侧都放不下 320px：退到入口上方/下方（这里上下空间只够下方），不遮住入口。
  const tight = { left: 40, top: 60, right: 620, bottom: 760 }
  const b = anchorRect(300, 300, SWATCH.width, SWATCH.height)
  const p2 = popoverPosition(b, tight, POP_SIZE, 'right')
  assert.ok(p2, '两侧都不足时仍有结果')
  assertInside(p2, tight, 10, '两侧不足仍不越界')
  assert.equal(p2.top, 330, '左右都放不下 → 退到入口下方（底边 + 8）')
  assert.ok(p2.top >= b.bottom + 8, '下方兜底不遮住入口')
  assert.equal(popRectGap(b, p2), 8, '退到下方后与入口间距 ≤8px')
  // 上下都有空间时优先退到上方（更常见的「向上翻」）；锚点在下半区。
  const b2 = anchorRect(300, 600, SWATCH.width, SWATCH.height)
  const p3 = popoverPosition(b2, tight, POP_SIZE, 'right')
  assert.equal(p3.top, 204, '左右都放不下 → 退到入口上方（顶边 − 8 − 388）')
  assert.equal(p3.top + POP_SIZE.height, 592, '上方兜底不遮住入口（弹板底 592 < 入口顶 600）')
})

test('#93：popoverPosition —— 非整数锚点/边界下坐标取整且间距仍 ≤8px', () => {
  const viewport = { left: 0, top: 0, right: 1280, bottom: 900 }
  const frac = popoverPosition(anchorRect(200.5, 300.5, SWATCH.width, SWATCH.height), viewport, POP_SIZE, 'right')
  assert.equal(frac.left, 238, '贴右侧：floor(锚点右) + 8，间距 7.5px ≤ 8')
  assert.equal(frac.top, 118, '垂直居中取整')
  assert.ok(Number.isInteger(frac.left) && Number.isInteger(frac.top), '坐标恒为整数（不会出现 8.5px 间距）')
  assert.ok(popRectGap(anchorRect(200.5, 300.5, SWATCH.width, SWATCH.height), frac) <= 8, '间距 ≤8px')
})

test('#94：37 个 data-slot 全部可点且以被点元素为锚；左列仅不可见才滚动（源码结构）', () => {
  const src = readFileSync(join(import.meta.dirname, '..', 'runtime', 'custom-editor.mjs'), 'utf8')
  // 1) 所有 data-slot 载体（node 块 / t 文本 span / 代码 token / textMuted ×2）统一从 bindSlot 拿点击，
  //    并把被点 DOM 元素透传给 clickSlot（锚点来源）。
  assert.ok(src.includes('onClick: function (ev) { try { ev.stopPropagation() } catch (err) { /* 忽略 */ } clickSlot(slot, ev.currentTarget) }'), '被点元素传给 clickSlot')
  assert.equal((src.match(/bindSlot\(/g) || []).length, 5, '5 处 data-slot 载体统一走 bindSlot')
  assert.equal((src.match(/'data-slot':/g) || []).length, 5, 'data-slot 落点数不变')
  // 2) clickSlot：左列改为 revealRow（已在视野就不动），不再强制 scrollToRow 居中。
  const ci = src.indexOf('function clickSlot(key, anchorEl)')
  assert.ok(ci > 0, 'clickSlot 接收 anchorEl')
  const cseg = src.slice(ci, ci + 420)
  assert.ok(cseg.includes('revealRow(key)'), '左列改用 revealRow（已在视野就不动）')
  assert.ok(cseg.includes('openPop(key, anchorEl)'), '被点元素透传给 openPop')
  assert.equal(cseg.includes('scrollToRow('), false, '不再强制 scrollToRow 居中')
  // 3) openPop 记录锚点/首选方向并清旧坐标（防旧位闪帧）。
  const oi = src.indexOf('function openPop(key, anchorEl, preferSide)')
  assert.ok(oi > 0, 'openPop 接收 anchorEl 与首选方向')
  const oseg = src.slice(oi, oi + 1100)
  assert.ok(oseg.includes('const anchor = anchorEl || null'), '锚点归一成 anchor')
  assert.ok(oseg.includes('const place = preferSide === PLACE_RIGHT ? PLACE_RIGHT : PLACE_BELOW'), '#93 首选方向归一（默认贴下方）')
  assert.ok(oseg.includes('preferSide: place'), 'pop 状态记录首选方向')
  assert.ok(oseg.includes('anchor: anchor'), 'pop 状态记住被点元素')
  assert.ok(oseg.includes('if (pop && pop.key === key && pop.anchor === anchor && popPos) return'), '同一入口再点保持弹板（不重置坐标、保留编辑中颜色）')
  assert.ok(oseg.includes('setPopPos(null)'), '换锚点开新弹板先清旧坐标')
  // 3b) 点预览控件 / 左列色块（同为调色盘入口）都不算「点弹窗外」：否则同入口重开会先被 mousedown revert 一次。
  assert.ok(src.includes("t.closest('[data-slot]') || t.closest('[data-slot-row]')"), '两类调色盘入口点击都不当作弹窗外关闭')
  assert.equal(src.includes("data-sw="), false, '去掉失效的 data-sw 选择器（无元素渲染该属性）')
  assert.ok(src.includes('if (pop && !keepOpen) closePop(false)'), '#95 起点弹板外 = 保留颜色直接关闭（回滚只走 Esc/取消）')
  // 4) 定位 effect：锚点 rect → popoverPosition，边界 = 视口 ∩ 弹窗；resize/滚动重算；锚点脱离 DOM 安全收起。
  assert.ok(src.includes('popoverPosition(ar, bounds, { width: POP_W, height: POP_H }, pop.preferSide)'), '锚点 rect 走纯函数定位（按入口类型选纵向/侧向规则）')
  assert.ok(src.includes('Math.max(0, dr.left)') && src.includes('Math.min(vw, dr.right)'), '边界 = 视口 ∩ 弹窗')
  assert.ok(src.includes("w.addEventListener('resize', place)"), '窗口 resize 重算位置')
  assert.ok(src.includes("d.addEventListener('scroll', place, true)"), '弹窗内滚动重算位置（捕获阶段）')
  assert.ok(src.includes('if (pop.anchor.isConnected === false) { setPop(null); return }'), '锚点脱离 DOM 安全收起（不回滚已调颜色，也不改挂到左列）')
  assert.equal(src.includes('rowRefs.current[pop.key]'), false, '定位 effect 不再回退左列行：每个入口自己就是锚点')
  // 5) #93：左列色块入口也走同一锚点引擎 —— 旧「夹到预览区左侧」公式全部退役。
  assert.equal(src.includes('vw - 270'), false, '旧左列定位公式（vw − 270）已移除')
  assert.equal(src.includes('- 250 - 8'), false, '旧「夹到预览区左侧」（−250−8）已移除')
  assert.equal(src.includes('- 350 - 10'), false, '旧纵向夹紧（−350−10）已移除')
  assert.ok(src.includes('const PLACE_BELOW = \'below\'') && src.includes('const PLACE_RIGHT = \'right\''), '首选方向字面量单源（避免拼写错误静默降级）')
  assert.ok(src.includes('onClick: function (ev) { openPop(key, ev.currentTarget, PLACE_RIGHT) }'), '左列色块入口把自身元素作为锚点（侧向定位）')
  // 6) 尺寸/间距常量单源，渲染侧 border-box + 显式宽高 = 实测外框（#95 取色器盒 320×388）。
  assert.ok(src.includes('const POP_W = 320') && src.includes('const POP_H = 388'), '弹板尺寸常量 = 取色器盒外框')
  assert.ok(src.includes('const POP_GAP = 8') && src.includes('const POP_MARGIN = 10') && src.includes('const POP_FALLBACK = { left: 40, top: 120 }'), '间距/留白/兜底常量单源')
  assert.ok(src.includes("boxSizing: 'border-box'") && src.includes("width: POP_W + 'px'") && src.includes("height: POP_H + 'px'"), '渲染宽高走常量（border-box 外框与定位常量恒等）')
})

// ── #95 取色器重构：颜色模型纯函数（TDD 缝，期望值来自 WCAG/HSx 定义与手算）──
test('#95：mergeHsv —— 灰/黑时保留无意义的色相与饱和度（R1 回归）', () => {
  const prev = { h: 210, s: 72, v: 98 }
  assert.deepEqual(mergeHsv(prev, { h: 0, s: 0, v: 0 }), { h: 210, s: 72, v: 0 }, 'V=0 保留 h 与 s')
  assert.deepEqual(mergeHsv(prev, { h: 0, s: 0, v: 60 }), { h: 210, s: 0, v: 60 }, 'S=0 保留 h')
  assert.deepEqual(mergeHsv(prev, { h: 30, s: 50, v: 80 }), { h: 30, s: 50, v: 80 }, '有意义的维度全部采用新值')
})

test('#95：parseHexInputLoose —— 缺 #/全角 #/3 位/8 位（忽略 alpha）', () => {
  assert.deepEqual(parseHexInputLoose('#abc'), { hex: '#AABBCC', alphaDropped: false })
  assert.deepEqual(parseHexInputLoose('fab283'), { hex: '#FAB283', alphaDropped: false })
  assert.deepEqual(parseHexInputLoose('＃FAB283'), { hex: '#FAB283', alphaDropped: false })
  assert.deepEqual(parseHexInputLoose(' #FAB283FF '), { hex: '#FAB283', alphaDropped: true }, '8 位取前 6 位并标记忽略透明度')
  assert.deepEqual(parseHexInputLoose('#abcd'), { hex: '#AABBCC', alphaDropped: true })
  assert.equal(parseHexInputLoose('xyz'), null)
  assert.equal(parseHexInputLoose('#12345'), null)
  assert.equal(parseHexInputLoose(''), null)
})

test('#95：RGB/HSV/HSL 互转与 hex 投影', () => {
  assert.deepEqual(hsvToRgb({ h: 0, s: 100, v: 100 }), { r: 255, g: 0, b: 0 })
  assert.deepEqual(hsvToRgb({ h: 120, s: 100, v: 100 }), { r: 0, g: 255, b: 0 })
  assert.deepEqual(hsvToRgb({ h: 210, s: 72, v: 98 }), { r: 70, g: 160, b: 250 })
  assert.deepEqual(rgbToHsv({ r: 255, g: 0, b: 0 }), { h: 0, s: 100, v: 100 })
  assert.deepEqual(rgbToHsv({ r: 0, g: 255, b: 0 }), { h: 120, s: 100, v: 100 })
  assert.deepEqual(rgbToHsv({ r: 0, g: 0, b: 255 }), { h: 240, s: 100, v: 100 })
  assert.equal(rgbToHsv({ r: 255, g: 255, b: 255 }).v, 100)
  assert.equal(rgbToHsv({ r: 255, g: 255, b: 255 }).s, 0)
  assert.ok(Math.abs(rgbToHsv({ r: 128, g: 128, b: 128 }).v - 50.196) < 0.01, '灰 128 → V 50.2')
  assert.deepEqual(hsvToHsl({ h: 0, s: 100, v: 100 }), { h: 0, s: 100, l: 50 })
  assert.deepEqual(hsvToHsl({ h: 0, s: 0, v: 50 }), { h: 0, s: 0, l: 50 })
  const back = hslToHsv(hsvToHsl({ h: 210, s: 72, v: 98 }))
  assert.ok(Math.abs(back.h - 210) < 1e-9 && Math.abs(back.s - 72) < 1e-9 && Math.abs(back.v - 98) < 1e-9, 'HSL 往返不漂移')
  assert.equal(rgbToHex({ r: 250, g: 178, b: 131 }), '#FAB283')
  assert.equal(rgbToHex({ r: 0, g: 0, b: 0 }), '#000000')
})

test('#95：hueStops —— 13 个 30° 停、用当前 S/V 生成（非纯色相）', () => {
  const stops = hueStops(100, 100)
  assert.equal(stops.length, 13)
  assert.equal(stops[0], '#FF0000')
  assert.equal(stops[2], '#FFFF00', '60° 黄')
  assert.equal(stops[4], '#00FF00', '120° 绿')
  assert.equal(stops[6], '#00FFFF', '180° 青')
  assert.equal(stops[12], '#FF0000', '360° 回到红')
  assert.equal(hueStops(0, 50)[0], hsvToHex({ h: 0, s: 0, v: 50 }), 'S=0 时整条轨为灰阶（真实 S/V）')
})

test('#95：WCAG 对比度 —— 亮度/比值与基准槽映射', () => {
  assert.equal(relativeLuminance('#000000'), 0)
  assert.ok(Math.abs(relativeLuminance('#FFFFFF') - 1) < 1e-9)
  assert.ok(Math.abs(relativeLuminance('#767676') - 0.1812) < 0.002, '灰 118 亮度 ≈0.181')
  assert.ok(Math.abs(contrastRatio('#000000', '#FFFFFF') - 21) < 0.01, '黑白 21:1')
  assert.ok(Math.abs(contrastRatio('#767676', '#FFFFFF') - 4.54) < 0.02, '#767676 对白 ≈4.54:1（AA 边界）')
  assert.equal(contrastRatio('#FAB283', '#FAB283'), 1)
  assert.equal(contrastRefSlot('text'), 'background', '文字对背景')
  assert.equal(contrastRefSlot('textMuted'), 'background')
  assert.equal(contrastRefSlot('background'), 'text', '背景槽反过来对文字')
  assert.equal(contrastRefSlot('codeHeaderBg'), 'text')
  assert.equal(contrastRefSlot('primary'), 'backgroundPanel', '品牌/语法/边框对面板')
  assert.equal(contrastRefSlot('markdownHeading'), 'backgroundPanel')
  assert.equal(contrastRefSlot('notAKey'), 'backgroundPanel')
})

test('#95：pickRecentColors —— 按分组优先级取 10 个、跳过当前槽（R7 回归）', () => {
  const colors = {
    background: '#101014',
    backgroundPanel: '#232329',
    primary: '#FAB283',
    syntaxString: '#CE9178',
    text: '#E7E7EA',
    border: '#33333A',
  }
  const priority = ['text', 'border', 'primary', 'syntaxString', 'background', 'backgroundPanel']
  assert.deepEqual(pickRecentColors(colors, 'primary', priority, 4), ['#E7E7EA', '#33333A', '#CE9178', '#101014'], '跳过当前槽现值，按优先级排序')
  assert.deepEqual(pickRecentColors(colors, null, priority, 10).slice(0, 3), ['#E7E7EA', '#33333A', '#FAB283'], '品牌/语法色不会再被 8 个背景色挤掉')
  assert.equal(pickRecentColors(colors, null, [], 2).length, 2, '无优先级时按对象键顺序兜底')
  assert.deepEqual(pickRecentColors({ a: '#111111', b: '#111111' }, null, ['a', 'b'], 10), ['#111111'], '去重')
  assert.deepEqual(pickRecentColors({ a: 'transparent', b: '#222222' }, null, ['a', 'b'], 10), ['#222222'], '跳过 transparent')
})

// ── #95 取色器展示组件（可独立 renderToString 的结构缝）──
function pickerProps(over) {
  const base = {
    h: mockHooks(),
    tr: (k) => 'T:' + k,
    trf: (k, o) => 'T:' + k + JSON.stringify(o || {}),
    label: '主色',
    allowTransparent: false,
    value: { hex: '#FAB283', transparent: false },
    recent: ['#0A0A0A', '#ECEDE9', '#55555E'],
    contrastRefHex: '#000000',
    onApply: () => {},
    onCancel: () => {},
    onDone: () => {},
  }
  return Object.assign(base, over || {})
}

function renderPicker(over) {
  const saved = {}
  for (const k of ['document', 'window', 'localStorage', 'matchMedia']) {
    if (k in globalThis) { saved[k] = globalThis[k]; delete globalThis[k] }
  }
  try {
    return _ReactDOMServer.renderToString(_React.createElement(PalettePicker, pickerProps(over)))
  } finally {
    for (const k of Object.keys(saved)) globalThis[k] = saved[k]
  }
}

test('#95：PalettePicker —— 结构部件齐全且可独立 SSR（无需交互）', () => {
  const html = renderPicker()
  for (const part of ['title', 'sv', 'hue', 'hsv', 'recent', 'hex', 'eyedropper', 'contrast', 'transparent', 'footer']) {
    assert.ok(html.includes('data-picker-part="' + part + '"'), '缺部件：' + part)
  }
  assert.ok(html.includes('主色'), '标题渲染色位名')
  assert.ok(html.includes('#FAB283'), '标题显示当前 hex')
  assert.ok(html.includes('role="slider"'), '色相轨 role=slider')
  assert.ok(html.includes('aria-valuemin="0"') && html.includes('aria-valuemax="360"'), '色相轨 aria 范围')
  assert.ok(html.includes('aria-valuenow="24"'), '色相轨 aria-valuenow = 当前色相取整')
  assert.ok(html.includes('T:edHueAria'), '色相 aria-valuetext 带度数（trf）')
  assert.ok(html.includes('aria-label="T:edHue"') && html.includes('aria-label="T:edSat"') && html.includes('aria-label="T:edVal"'), 'H/S/V 三个数字输入')
  assert.equal((html.match(/data-picker-part="model"/g) || []).length, 1, '色彩模型切换按钮')
  assert.ok(html.includes('T:edCancel') && html.includes('T:edDone'), '取消/完成按钮')
  assert.ok(html.includes('T:edEyedropper'), '吸管按钮在场')
  assert.ok(html.includes('disabled'), 'SSR（无 window）时吸管禁用')
  assert.equal(html.includes('<circle'), false, '禁 <circle>')
  const hits = modalInteractiveTags(html)
  assert.ok(hits.length >= 8, '可点控件样本充足：' + hits.length)
  assert.equal(hits.filter((t) => !t.includes('data-palette-interactive')).length, 0, '可点控件全挂动效钩子')
})

test('#95：PalettePicker —— 透明槽/对比度/最近色/初始值', () => {
  const plain = renderPicker({ slotKey: 'primary' })
  assert.equal(plain.includes('type="checkbox"'), false, '非背景槽不显示透明行')
  assert.ok(plain.includes('data-picker-part="transparent"'), '透明行占位保留（弹板高度恒定）')
  const bg = renderPicker({ allowTransparent: true, value: { hex: 'transparent', transparent: true } })
  assert.ok(bg.includes('type="checkbox"'), '8 个背景槽才有透明勾选')
  const dark = renderPicker({ value: { hex: '#000000', transparent: false }, contrastRefHex: '#FFFFFF' })
  assert.ok(dark.includes('21.0:1'), '对比徽章：黑白 21:1')
  assert.ok(dark.includes('T:edContrast'), '对比徽章 aria/title 走 i18n')
  const few = renderPicker({ value: { hex: '#000000', transparent: false }, contrastRefHex: '#111111' })
  assert.ok(few.includes('T:edContrastLow') || few.includes('低'), '低对比提示')
  assert.ok(renderPicker().includes('#ECEDE9'), '最近色渲染')
  assert.equal((renderPicker().match(/data-picker-recent-swatch/g) || []).length, 3, '最近色 3 个（按传入优先级）')
})

test('#95：PalettePicker —— 重开同一槽位保留上次 H/S/V（initialHsv 优先于 hex 反推，R1 残留）', () => {
  const plain = renderPicker({ value: { hex: '#000000', transparent: false } })
  assert.ok(plain.includes('aria-valuenow="0"'), '无记忆时黑/灰按 hex 反推色相为 0（旧行为）')
  const kept = renderPicker({ value: { hex: '#000000', transparent: false }, initialHsv: { h: 24, s: 100, v: 0 } })
  assert.ok(kept.includes('aria-valuenow="24"'), '重开时回填记忆色相 24（不因 hex=#000000 丢成 0）')
  assert.equal(kept.includes('aria-valuenow="0"'), false, '记忆生效时不再回落到 0°')
  const bad = renderPicker({ value: { hex: '#000000', transparent: false }, initialHsv: { h: NaN, s: 0, v: 0 } })
  assert.ok(bad.includes('aria-valuenow="0"'), '非法记忆值被忽略，退回 hex 反推')
})

test('#95：PalettePicker —— 源码契约（模型切换/指针/键盘/无原生 range/禁 circle）', () => {
  const src = readFileSync(join(import.meta.dirname, '..', 'runtime', 'custom-editor.mjs'), 'utf8')
  assert.ok(src.includes('export function PalettePicker'), 'PalettePicker 必须是可 import 的导出（SSR 测试缝）')
  assert.equal(src.includes("type: 'range'"), false, '原生 input range 退役（自绘色相轨）')
  assert.ok(src.includes('setPointerCapture'), '拖拽用 Pointer Events + setPointerCapture')
  assert.ok(src.includes("touchAction: 'none'"), '拖拽面禁触摸滚动')
  for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']) {
    assert.ok(src.includes("'" + k + "'"), '键盘映射缺：' + k)
  }
  assert.ok(src.includes("role: 'slider'"), '色相轨 role=slider')
  assert.ok(src.includes('aria-valuetext'), 'aria-valuetext 带度数')
  assert.equal((src.match(/'data-picker-part':/g) || []).length >= 10, true, '部件标记计数纪律')
  assert.equal(src.includes('EyeDropper'), true, '吸管走特性检测')
  assert.ok(src.includes('setPointerCapture') && src.includes('releasePointerCapture'), '指针捕获成对出现')
  // renderPop 接线：内部组件化 + live commit + 保留关闭/回滚分工（R2）。
  assert.ok(src.includes('e(PalettePicker, {'), 'renderPop 内部交给 PalettePicker 展示组件')
  assert.ok(src.includes('pickRecentColors(colors, pop.key, priority, PICK_RECENT_MAX)'), '主题色按分组优先级取（R7）')
  assert.ok(src.includes('effectiveSlotColor(contrastRefSlot(pop.key), colors, false)'), '对比度基准槽映射到真实主题色')
  assert.ok(src.includes('onApply: function (hex, transparent, hsv)') && src.includes('setColor(pop.key, hex, transparent)'), '任何改动即 live commit 写回编辑中主题')
  // Spec 复核：#95 残留——重开同一槽位保色相、RGB/HSL 灰输入不丢色相、数字框 Shift 步进。
  assert.ok(src.includes('initialHsv'), '父组件按槽位记忆 H/S/V，重开时回填')
  assert.ok(src.includes('pickMem.current[pop.key]'), '记忆读写都按色位 key（openPop 关闭后仍保留）')
  assert.ok(src.includes('function commitRgb(') && src.includes('function commitHsl('), 'RGB/HSL 数值输入走 mergeHsv（灰/黑保留色相）')
  assert.ok(src.includes("ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown'") && src.includes('ev.shiftKey ? 10 : 1'), '数字输入 ↑↓ 微调 + Shift ×10')
  assert.ok(src.includes("d.addEventListener('keydown', onKey)") && src.includes("ev.key === 'Escape'"), 'Esc = 取消并回滚')
  assert.ok(src.includes("if (pop && !keepOpen) closePop(false)"), '点弹板外 = 保留并关闭（R2）')
  assert.ok(src.includes("tr('edSvHint')"), 'SV 键盘提示使用新文案键')
  // #95 review：透明槽只读、EyeDropper 探测进 effect、live commit 单一提交路径。
  assert.ok(src.includes('if (pick.transparent) return'), '透明槽下 SV/色相拖拽与键盘不改色（与 aria-disabled 一致）')
  assert.ok(src.includes('disabled: pick.transparent ? true : undefined'), '透明槽下数值输入禁用')
  assert.ok(src.includes('setEyeOk(') && src.includes('h.useEffect(function ()'), '吸管能力探测进 effect（渲染期不碰 window）')
  assert.ok(src.includes('function commit(next, transparent, hex, noticeKey)'), 'live commit 单一提交路径（去重）')
})

// ── #95：对比度基准背景槽跨文件对账（防 BG_SLOTS 与引擎单一真相源漂移）──
test('#95：BG_SLOTS 与引擎 COLOR_SLOTS.allowTransparent 一致', () => {
  const fromEngine = ENGINE_SLOTS.filter((s) => s.allowTransparent).map((s) => s.key).sort()
  assert.deepEqual(BG_SLOTS.slice().sort(), fromEngine)
})
