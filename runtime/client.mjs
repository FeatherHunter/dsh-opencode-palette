// runtime/client.mjs — 浏览器运行时：注入/热切换/持久化/设置面板（组合 1 布局）
// 布局：标题行 → 排印调节（顶部）→ 主题选择（色系分组标签 + mini 芯片）→ 状态开关
// 依赖注入：theme（dsh-client-ui-theme）、slots（settings.plugins.tab / tool.view.cordis）
import { renderTheme, previewColors, themeNames, themeGroups } from './engine/index.mjs'
import { FONTS, SANS_STACK } from './engine/map-dsh.mjs'

const STORAGE_KEY = 'dsh.opencode-palette.v2'
// 兼容迁移：旧插件（dsh-opencode-tui-theme）的本地设置键，读到即迁移到新键
const LEGACY_STORAGE_KEY = 'dsh.opencode-tui-theme.v2'
const DEFAULT_STATE = { enabled: true, theme: 'opencode', mode: 'mono', size: 13, fontKey: 'JetBrains Mono' }

function getReact() {
  if (typeof require === 'function') { try { return require('react') } catch (e) { /* 动态版无 require */ } }
  if (typeof globalThis !== 'undefined' && globalThis.React) return globalThis.React
  return null
}

function loadState() {
  try {
    // 新键优先；旧插件（dsh-opencode-tui-theme）的键命中则一次性迁移
    let raw = globalThis.localStorage && localStorage.getItem(STORAGE_KEY)
    if (!raw && globalThis.localStorage) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (legacy) {
        raw = legacy
        try { localStorage.setItem(STORAGE_KEY, legacy) } catch (e) { /* 忽略 */ }
      }
    }
    if (raw) {
      const s = JSON.parse(raw)
      return { ...DEFAULT_STATE, ...s }
    }
  } catch (e) { /* 存储不可用则用默认 */ }
  return { ...DEFAULT_STATE }
}

function saveState(state) {
  try {
    if (globalThis.localStorage) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) { /* 忽略持久化失败 */ }
}
// ── i18n：面板文案双语表（跟随 DSH 界面语言，html[lang] 为信号源）──
const I18N = {
  panelName: { zh: 'OpenCode 调色板', en: 'Opencode Palette' },
  subtitle: { zh: '34 款 opencode 官方配色主题，点击即切换', en: '34 official opencode themes — click to switch' },
  enabled: { zh: '已启用', en: 'Enabled' },
  disabled: { zh: '已停用', en: 'Disabled' },
  disableTitle: { zh: '点击停用主题', en: 'Click to disable' },
  enableTitle: { zh: '点击启用主题', en: 'Click to enable' },
  typography: { zh: '字体字号', en: 'Typography' },
  bodyStyle: { zh: '正文样式', en: 'Body style' },
  mono: { zh: '等宽（终端风）', en: 'Monospace (terminal)' },
  sans: { zh: '常规（界面风）', en: 'Regular (UI)' },
  fontSize: { zh: '字号', en: 'Font size' },
  codeFont: { zh: '代码字体', en: 'Code font' },
  fontPreview: { zh: '等宽', en: 'mono' },
  themeSection: { zh: '选择主题', en: 'Themes' },
  themeCount: { zh: '34 款 · 按色系分组', en: '34 · by color family' },
  search: { zh: '搜索主题…', en: 'Search themes…' },
  noMatch: { zh: '未找到匹配的主题', en: 'No matching themes' },
  systemDefault: { zh: 'system（默认）', en: 'system (default)' },
  'group.warm': { zh: '暖橙', en: 'Warm' },
  'group.yellow-green': { zh: '黄绿', en: 'Yellow-green' },
  'group.teal': { zh: '青绿', en: 'Teal' },
  'group.cyan-blue': { zh: '青蓝', en: 'Cyan-blue' },
  'group.cool-blue': { zh: '冷蓝', en: 'Cool blue' },
  'group.violet': { zh: '蓝紫', en: 'Violet' },
  'group.neutral': { zh: '中性', en: 'Neutral' },
  'group.transparent': { zh: '透明', en: 'Transparent' },
  'group.special': { zh: '特殊', en: 'Special' },
}

// 语言检测：html[lang] 优先，回退浏览器语言
function getLang() {
  try {
    const l = (document.documentElement && document.documentElement.lang) || (navigator.language || 'en')
    return /^zh/i.test(l) ? 'zh' : 'en'
  } catch (e) { return 'en' }
}


// 生成注入物并注入：token 层 + <style> 层；幂等（先清后注入）
export function createClient(slotTarget) {
  return function apply(ctx) {
    const theme = ctx.get('theme')
    const slots = ctx.get('slots')

    let state = loadState()
    let tokenDispose = null
    let styleTag = null

    // ── i18n 运行时：语言跟随 DSH（html[lang] 变化即通知面板重渲染）──
    let currentLang = getLang()
    const localeListeners = []
    function tr(key) { const e = I18N[key]; return e ? e[currentLang] : key }
    function notifyLocale() {
      const next = getLang()
      if (next === currentLang) return
      currentLang = next
      for (const fn of localeListeners) { try { fn() } catch (e) { /* 忽略 */ } }
    }
    let localeObserver = null
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined' && document.documentElement) {
      localeObserver = new MutationObserver(notifyLocale)
      localeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
    }

    function safeThemeName(name) {
      const names = themeNames()
      return names.indexOf(name) >= 0 ? name : DEFAULT_STATE.theme
    }

    function applyStyle() {
      if (!theme) return
      // 1) 先清理旧注入（幂等）
      if (tokenDispose) { try { tokenDispose() } catch (e) { /* 忽略 */ } tokenDispose = null }
      // 2) 完整重生成
      let render
      try {
        render = renderTheme(safeThemeName(state.theme), {
          mode: state.mode, size: state.size, fontKey: state.fontKey,
        })
      } catch (e) {
        console.error('[dsh-opencode-palette] 渲染失败，回退默认主题:', e)
        render = renderTheme(DEFAULT_STATE.theme, { mode: 'mono', size: 13, fontKey: 'JetBrains Mono' })
      }
      // 3) token 层（{light,dark} 同值 = 强制深色终端观感）
      tokenDispose = theme.overrideTokens('opencode-palette', render.tokens)
      // 4) <style> 层
      if (styleTag === null && typeof document !== 'undefined') {
        styleTag = document.createElement('style')
        styleTag.dataset.plugin = 'dsh-opencode-palette'
        document.head.appendChild(styleTag)
      }
      if (styleTag) styleTag.textContent = render.css
      return render.meta
    }

    function clearStyle() {
      if (tokenDispose) { try { tokenDispose() } catch (e) { /* 忽略 */ } tokenDispose = null }
      if (styleTag !== null && styleTag.parentNode) {
        styleTag.parentNode.removeChild(styleTag)
      }
      styleTag = null
    }

    // ── 面板 API（与 React 组件共享）──
    function getState() { return { ...state } }
    function setTheme(name) {
      state = { ...state, theme: safeThemeName(name) }
      saveState(state)
      if (state.enabled) applyStyle()
    }
    function setTypography(next) {
      state = { ...state, ...next }
      saveState(state)
      if (state.enabled) applyStyle()
    }
    function toggle() {
      state = { ...state, enabled: !state.enabled }
      saveState(state)
      if (state.enabled) applyStyle(); else clearStyle()
    }
    function refresh(nextMode, nextSize, nextFont) {
      setTypography({ mode: nextMode, size: nextSize, fontKey: nextFont })
    }

    // 启动：默认启用（与 v1.1.0 一致）
    if (state.enabled) applyStyle()

    // 调试钩子（控制台可用）
    if (typeof globalThis !== 'undefined') {
      globalThis.__opencodePalette = {
        getState: getState,
        setTheme: setTheme,
        toggle: toggle,
        list: themeNames,
        previews: function () { return themeNames().map(function (n) { return { name: n, colors: previewColors(n) } }) },
      }
    }

    // ── 设置面板（组合 1：排印置顶 + 色系分组标签 + mini 芯片）──
    let disposePanel = null
    if (slots !== undefined && typeof document !== 'undefined') {
      const Panel = function (props) {
        const react = getReact()
        const h = react.createElement
        const [query, setQuery] = react.useState('')
        const [fontOpen, setFontOpen] = react.useState(false)
        const [sizeOpen, setSizeOpen] = react.useState(false)
        const fontRef = react.useRef(null)
        const sizeRef = react.useRef(null)
        // UI 快照：所有引擎动作后 setUi(props.getState()) 重同步，避免受控控件显示值漂移
        const [ui, setUi] = react.useState(props.getState())
        const st = ui

        // 字体下拉：点击外部关闭
        react.useEffect(function () {
          if (!fontOpen && !sizeOpen) return
          function onDoc(e) {
            if (fontRef.current && !fontRef.current.contains(e.target)) setFontOpen(false)
            if (sizeRef.current && !sizeRef.current.contains(e.target)) setSizeOpen(false)
          }
          document.addEventListener('mousedown', onDoc)
          return function () { document.removeEventListener('mousedown', onDoc) }
        }, [fontOpen, sizeOpen])

        // 语言切换：DSH 界面语言变化时重渲染（文案跟随）
        react.useEffect(function () {
          return props.subscribeLocale(function () { setUi(props.getState()) })
        }, [])

        // 搜索过滤（命中组保留，空组隐藏）
        const q = query.trim().toLowerCase()
        const shown = q === ''
          ? props.groups()
          : props.groups()
              .map(function (g) { return { name: g.name, color: g.color, themes: g.themes.filter(function (t) { return t.name.indexOf(q) >= 0 }) } })
              .filter(function (g) { return g.themes.length > 0 })

        const muted = 'var(--dsw-alias-label-secondary)'
        const base = 'var(--dsw-alias-label-primary)'
        const fieldLabel = { fontSize: 11, color: muted }
        const secTitle = { fontSize: 11, color: muted, letterSpacing: '.08em', marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 8 }
        const countStyle = { color: 'var(--dsw-alias-label-dimmed)', fontSize: 11, letterSpacing: 0 }

        // 分段按钮控件
        const seg = function (value, options, onChange) {
          return h('div', { style: { display: 'inline-flex', background: 'var(--dsw-alias-bg-layer-2)', border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 6, padding: 2, gap: 2 } },
            options.map(function (opt) {
              const on = opt.value === value
              return h('button', {
                key: String(opt.value),
                onClick: function () { onChange(opt.value) },
                style: {
                  border: 0, borderRadius: 4, padding: '4px 10px', fontSize: 12, cursor: 'pointer',
                  background: on ? 'rgba(255,255,255,0.14)' : 'transparent',
                  color: on ? base : muted,
                  fontFamily: 'var(--dsw-font-family)',
                },
              }, opt.label)
            }))
        }
        // 通用下拉（字号 / 代码字体）：紧凑按钮 + 弹出菜单，对齐 setup-panel 样例
        const dd = function (open, setOpen, ref, labelNode, items) {
          return h('div', { ref: ref, style: { position: 'relative' } }, [
            h('button', {
              onClick: function () { setOpen(!open) },
              style: {
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--dsw-alias-bg-layer-2)', border: '1px solid var(--dsw-alias-border-l1)',
                borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer',
                color: base, fontFamily: 'var(--dsw-font-family)',
              },
            }, [labelNode, h('span', { style: { color: muted } }, '▾')]),
            open ? h('div', {
              style: {
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 20,
                background: 'var(--dsw-alias-bg-overlay)', border: '1px solid var(--dsw-alias-border-l1)',
                borderRadius: 8, minWidth: 200, padding: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              },
            }, items) : null,
          ])
        }
        const dot = function (color, size) {
          return h('span', { style: { width: size, height: size, borderRadius: '50%', background: color || '#555', display: 'inline-block', flex: 'none' } })
        }

        // 主题 mini 芯片（组合 1）
        const chip = function (t) {
          const isCur = t.name === st.theme
          const c = t.colors
          return h('button', {
            key: t.name,
            onClick: function () { props.setTheme(t.name); setUi(props.getState()) },
            style: {
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: c && c.background ? c.background : 'var(--dsw-alias-bg-layer-2)',
              color: c && c.text ? c.text : base,
              border: isCur ? '2px solid var(--dsw-alias-brand-primary)' : '1px solid ' + ((c && c.primary) || '#555'),
              borderRadius: 6, padding: '3px 8px 3px 5px',
              fontFamily: 'var(--ds-font-family-code)', fontSize: 11, cursor: 'pointer',
              outline: isCur ? '1px solid var(--dsw-alias-brand-primary)' : 'none',
            },
          }, [
            dot(c && c.primary, 9),
            t.name === 'system' ? tr('systemDefault') : t.name,
            isCur ? h('span', { style: { color: 'var(--dsw-alias-brand-primary)', fontWeight: 700 } }, '✓') : null,
          ])
        }



        return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 920 } }, [
          // 头行：标题 + 状态开关（一个状态一个控制）
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } }, [
            h('strong', null, '🎨 ' + tr('panelName')),
            h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 8 } }, [
              h('span', { style: { color: st.enabled ? 'var(--dsw-alias-state-success-primary)' : muted, fontSize: 12 } },
                st.enabled ? tr('enabled') : tr('disabled')),
              h('span', {
                onClick: function () { props.toggle(); setUi(props.getState()) },
                title: st.enabled ? tr('disableTitle') : tr('enableTitle'),
                style: {
                  position: 'relative', display: 'inline-block', width: 36, height: 20,
                  borderRadius: 11, cursor: 'pointer',
                  background: st.enabled ? 'rgba(250,178,131,0.4)' : '#333338',
                  transition: 'background .12s',
                },
              }, h('span', {
                style: {
                  position: 'absolute', top: 3, left: st.enabled ? 19 : 3,
                  width: 14, height: 14, borderRadius: '50%',
                  background: st.enabled ? '#FAB283' : '#8b8b95',
                  transition: 'left .12s',
                },
              })),
            ]),
          ]),
          h('div', { style: { fontSize: 12, color: muted } },
            tr('subtitle')),
          // ── 排印调节（置顶）──
          h('div', { style: secTitle }, [
            h('span', null, tr('typography')),
          ]),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } }, [
            seg(st.mode, [
              { value: 'mono', label: tr('mono') },
              { value: 'tui', label: tr('sans') },
            ], function (v) { props.refresh(v, st.size, st.fontKey); setUi(props.getState()) }),
            dd(sizeOpen, setSizeOpen, sizeRef,
              h('span', null, tr('fontSize') + ' ' + st.size + 'px'),
              [11, 12, 13, 14, 15, 16, 17, 18].map(function (s) {
                const on = s === st.size
                return h('div', {
                  key: String(s),
                  onClick: function () { props.refresh(st.mode, s, st.fontKey); setUi(props.getState()); setSizeOpen(false) },
                  style: {
                    padding: '6px 10px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
                    background: on ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: on ? base : muted,
                  },
                }, String(s) + 'px')
              })),
            dd(fontOpen, setFontOpen, fontRef,
              h('span', { style: { fontFamily: FONTS[st.fontKey] || FONTS['JetBrains Mono'] } }, st.fontKey),
              Object.keys(FONTS).map(function (k) {
                const on = k === st.fontKey
                return h('div', {
                  key: k,
                  onClick: function () {
                    props.refresh(st.mode, st.size, k)
                    setUi(props.getState())
                    setFontOpen(false)
                  },
                  style: {
                    padding: '6px 10px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
                    background: on ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: on ? base : muted,
                  },
                }, h('span', { style: { fontFamily: FONTS[k] } }, k + ' — Aa ' + tr('fontPreview')))
              })),
          ]),
          // ── 主题选择（色系分组标签 + mini 芯片）──
          h('div', { style: secTitle }, [
            h('span', null, tr('themeSection')),
            h('span', { style: countStyle }, tr('themeCount')),
          ]),
          h('input', {
            placeholder: tr('search'),
            value: query,
            onChange: function (e) { setQuery(e.target.value) },
            style: {
              width: '100%', maxWidth: 380,
              background: 'var(--dsw-alias-bg-layer-2)', border: '1px solid var(--dsw-alias-border-l1)',
              borderRadius: 6, padding: '7px 12px', fontSize: 13, outline: 'none',
              color: base, fontFamily: 'var(--dsw-font-family)',
            },
          }),
          shown.length === 0
            ? h('div', { style: { ...fieldLabel, padding: '8px 0' } }, tr('noMatch'))
            : shown.map(function (g) {
                return h('div', { key: g.name, style: { marginBottom: 10 } }, [
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--dsw-alias-label-tertiary)', marginBottom: 6 } }, [
                    dot(g.color, 8),
                    tr('group.' + g.name),
                    h('span', { style: countStyle }, String(g.themes.length)),
                  ]),
                  h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, g.themes.map(chip)),
                ])
              }),
        ])
      }
      disposePanel = slots.inject(slotTarget, function () {
        return slots.register({
          name: slotTarget,
          id: 'opencode-palette',
          order: 30,
          label: function () { return tr('panelName') },
          inject: function () {
            return {
              getState: getState,
              toggle: toggle,
              refresh: refresh,
              setTheme: setTheme,
              themeNames: themeNames,
              groups: function () { return themeGroups() },
              subscribeLocale: function (fn) {
                localeListeners.push(fn)
                return function () {
                  const i = localeListeners.indexOf(fn)
                  if (i >= 0) localeListeners.splice(i, 1)
                }
              },
              previews: function () { return themeNames().map(function (n) { return { name: n, colors: previewColors(n) } }) },
            }
          },
        }, Panel)
      })
    }

    // 卸载清理（cordis 语义：effect fn 立即执行，返回值才是清理器）
    ctx.effect(function () {
      return function () {
        try { clearStyle() } catch (e) { /* 忽略 */ }
        try { if (disposePanel) disposePanel() } catch (e) { /* 忽略 */ }
        try { if (globalThis.__opencodePalette) delete globalThis.__opencodePalette } catch (e) { /* 忽略 */ }
        try { if (localeObserver) localeObserver.disconnect() } catch (e) { /* 忽略 */ }
      }
    }, 'dsh-opencode-palette: styles')
  }
}
