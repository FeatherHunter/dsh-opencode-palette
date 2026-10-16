// custom-editor.test.mjs — issue 86 回归：自定义主题纯函数缝（颜色/存储/动效）
// 直接 import runtime 源码（这三个模块零导入，打包前后同一语义），先红后绿的 TDD 缝。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import {
  normalizeHexInput,
  hexToHsv,
  hsvToHex,
  distinctThemeColors,
  clientSlug,
  effectiveSlotColor,
  editorMiniLight,
  filterCustomThemes,
  SLOT_FB,
  SLOT_DARK2LIGHT,
} from '../runtime/custom-color.mjs'
import {
  CUSTOM_CACHE_KEY,
  loadCustomCache,
  saveCustomCache,
  reconcileCustomThemes,
} from '../runtime/custom-store.mjs'
import { UI_FX_CSS, UI_STYLE_ATTR, injectUiFx } from '../runtime/ui-fx.mjs'

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

// ── 本主题用色（去重保序，跳过 transparent/非法）──
test('distinctThemeColors：保序去重，跳过 transparent 与非法值', () => {
  const got = distinctThemeColors({ a: '#FF0000', b: 'transparent', c: '#ff0000', d: '#00FF00', e: 'oops' })
  assert.deepEqual(got, ['#FF0000', '#00FF00'])
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

test('自定义区渲染（中文）：标题计数 + 复制路径 + 新增/编辑常驻，弹窗默认关闭', () => {
  const { html } = loadCustomPanel()
  assert.ok(html.includes('自定义主题 0'), '标题应为 自定义主题 0')
  assert.ok(html.includes('复制配置路径'), '复制路径按钮')
  assert.ok(html.includes('+ 新增'), '+ 新增胶囊')
  assert.ok(html.includes('✎ 编辑'), '✎ 编辑胶囊')
  assert.equal(editBtnDisabled(html), true, '空态 ✎ 编辑置灰禁用（原型 :606）')
  assert.equal(html.includes('保存主题'), false, '弹窗默认关闭')
  assert.equal(html.includes('<circle'), false, '全局禁 <circle>')
})

test('自定义区渲染（英文）：Custom themes + Copy config path，无中文残留', () => {
  const { html } = loadCustomPanel({ lang: 'en' })
  assert.ok(html.includes('Custom themes 0'), '英文标题')
  assert.ok(html.includes('Copy config path'), '英文复制按钮')
  assert.ok(html.includes('New'), '英文新增')
  assert.ok(html.includes('Edit'), '英文编辑')
  assert.equal(html.includes('自定义'), false, '英文界面无中文残留')
  assert.equal(html.includes('复制配置路径'), false, '英文界面无中文残留')
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

test('种子 customs：胶囊渲染 + 命名空间隔离 + 38 主题计数不动', () => {
  const { html } = loadCustomPanel({
    storage: seedStorage({ themes: [SEED_THEME], dirPath: 'D:\\dsh\\custom-themes' }),
  })
  assert.ok(html.includes('自定义主题 1'), '计数派生自真值')
  assert.ok(html.includes('极光测试'), '自定义胶囊渲染主题名')
  assert.equal(html.includes('custom:aurora-test'), false, '内部激活键不泄漏到展示层')
  assert.ok(html.includes('38 款 · 按色系分组'), '内置 9 组/38 主题门禁不动')
  assert.equal(editBtnDisabled(html), false, '有主题时 ✎ 编辑可用')
})

test('自定义区渲染顺序：位于特殊分组下方（分组本身由 group-boundary 钉死）', () => {
  const { html } = loadCustomPanel({
    storage: seedStorage({ themes: [SEED_THEME], dirPath: 'D:\\dsh\\custom-themes' }),
  })
  const special = html.indexOf('特殊')
  const custom = html.indexOf('自定义主题 1')
  assert.ok(special >= 0 && custom >= 0, '特殊与自定义标题都应渲染')
  assert.ok(special < custom, '自定义区位于特殊分组下方')
})

test('词表对账（#86）：glossary 新增 161 行 == 代码 I18N，中英逐行命中源码', () => {
  const md = readFileSync(new URL('../docs/i18n-glossary.md', import.meta.url), 'utf8').replace(/\r/g, '')
  const rows = []
  for (const line of md.split('\n')) {
    const m = line.match(/^\|\s*`([^`]+)`\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*#86[^|]*\|$/)
    if (m) rows.push({ key: m[1], zh: m[2].trim(), en: m[3].trim() })
  }
  assert.equal(rows.length, 161, '词表 #86 行应为 161 行（改 I18N 必须同步词表）')
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
import { CustomEditor, presetToSeed } from '../runtime/custom-editor.mjs'
import { COLOR_SLOTS as ENGINE_SLOTS, extractPresetPalette as enginePreset } from '../src/engine/index.mjs'

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

function renderEditorPure(appearance, colors) {
  const saved = {}
  for (const k of ['document', 'window', 'localStorage', 'matchMedia']) {
    if (k in globalThis) { saved[k] = globalThis[k]; delete globalThis[k] }
  }
  try {
    const el = _React.createElement(CustomEditor, editorProps(appearance, colors))
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
  // 36 槽直绑 data-slot；borderActive 无独立节点（与原型 .cinput 一致），经 inputBg 别名高亮
  for (const s of ENGINE_SLOTS) {
    if (s.key === 'borderActive') continue
    assert.ok(html.includes('data-slot="' + s.key + '"'), '槽位落位：' + s.key)
  }
  assert.ok(html.includes('data-slot="inputBg"'), 'borderActive 别名节点在场')
  assert.ok(html.includes('inset 0 0 0 2px'), '输入框内圈 borderActive 高亮环（原型 :871）')
  assert.ok(html.includes('T:edSave'), '保存按钮在场（弹窗默认全量渲染）')
  assert.ok(html.includes('T:miniTip'), '原型署名条在场')
})

test('弹窗直渲染：外观翻底盘跟编辑器走（c1 集成）', () => {
  const pal = enginePreset('opencode')
  const darkHtml = renderEditorPure('dark', pal.colors)
  assert.ok(darkHtml.includes('#1E1E24'), '深色外观深底盘')
  const lightHtml = renderEditorPure('light', pal.colors)
  assert.ok(lightHtml.includes('#F4F4F5'), '浅色外观翻浅底盘（不跟 OS）')
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
