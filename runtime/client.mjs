// runtime/client.mjs — 浏览器运行时：注入/热切换/持久化/设置面板（组合 1 布局）
// 布局：标题行 → 排印调节（顶部）→ 主题选择（色系分组标签 + mini 芯片）→ 状态开关
// 依赖注入：theme（dsh-client-ui-theme）、slots（settings.plugins.tab / tool.view.cordis）
import { renderTheme, previewColors, themeNames, themeGroups } from './engine/index.mjs'
import { FONTS } from './engine/map-dsh.mjs'
import { BUNDLED_FONTS } from './engine/font-face.mjs'
import { createFontAvailability } from './engine/font-avail.mjs'
import { codeFontStack } from './engine/generate.mjs'
import { buildFontCandidates, collectLocalFonts } from './engine/local-fonts.mjs'
import { THEME_ZH } from './engine/zh-names.mjs'
import { createClientLog } from 'dsh-log/client'
import { buildClientPhoneNames, CLIENT_POLL } from 'dsh-plugin-update/client'
import { createUpdateController, buttonState, blockedReasonKey } from './update-panel.mjs'
import { CHANNEL, ENDPOINT, PLUGIN_ID, PHONE_PREFIX } from './channel.mjs'

const STORAGE_KEY = 'dsh.opencode-palette.v2'
// 兼容迁移：旧插件（dsh-opencode-tui-theme）的本地设置键，读到即迁移到新键
const LEGACY_STORAGE_KEY = 'dsh.opencode-tui-theme.v2'
const DEFAULT_STATE = { enabled: true, theme: 'opencode', mode: 'mono', size: 13, fontKey: 'JetBrains Mono' }
// 构建时由 scripts/build-client.mjs 替换为 package.json 版本（面板底部署小字）
const PALETTE_VERSION = '__PALETTE_VERSION__'

function getReact() {
  if (typeof require === 'function') { try { return require('react') } catch (e) { /* 动态版无 require */ } }
  if (typeof globalThis !== 'undefined' && globalThis.React) return globalThis.React
  return null
}

// ── 宿主桥：浏览器半调宿主半的电话 ──
// 两条方言都要接：
//   1) 包版（本插件装成 npm 包）：ctx.get('connection').rpc.call('/api', 'opencode-palette', { method, payload })
//      走宿主 connection.fetch.register 注册的精确路由；两个常量来自 runtime/channel.mjs（两侧同一份）。
//   2) 动态版（cordis_define）：runner 给闭包注入自由变量 host，直接 host.call(电话名, 入参)。
// 都没有时返回 null，整块更新功能降级隐藏（不影响主题面板本身）。
function rpcCall(rpc, phone, args) {
  return Promise.resolve(rpc.call(CHANNEL, ENDPOINT, { method: phone, payload: args })).then(function (res) {
    if (res && res.ok) return res.value
    const why = res && res.error && res.error.message ? res.error.message : 'rpc failed: ' + phone
    throw new Error(why)
  })
}

function createHostBridge(ctx) {
  try {
    const connection = ctx && typeof ctx.get === 'function' ? ctx.get('connection') : null
    const rpc = connection && connection.rpc ? connection.rpc : null
    if (rpc && typeof rpc.call === 'function') {
      return { call: function (phone, args) { return rpcCall(rpc, phone, args) } }
    }
  } catch (e) { /* 落到下一条方言 */ }
  try {
    if (typeof host !== 'undefined' && host && typeof host.call === 'function') {
      return { call: function (phone, args) { return host.call(phone, args) } }
    }
  } catch (e) { /* 无宿主 */ }
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
// ── i18n：面板文案双语表（跟随 DSH 界面语言，官方 locale 服务为信号源）──
const I18N = {
  panelName: { zh: 'opencode调色板', en: 'Opencode Palette' },
  subtitle: { zh: '38 款 opencode 官方配色主题，点击即切换', en: '38 official opencode themes — click to switch' },
  enabled: { zh: '已启用', en: 'Enabled' },
  disabled: { zh: '已停用', en: 'Disabled' },
  disableTitle: { zh: '点击停用主题', en: 'Click to disable' },
  enableTitle: { zh: '点击启用主题', en: 'Click to enable' },
  typography: { zh: '字体字号', en: 'Typography' },
  bodyStyle: { zh: '正文样式', en: 'Body style' },
  mono: { zh: '全部文字', en: 'All text' },
  sans: { zh: '仅代码', en: 'Code only' },
  fontSize: { zh: '字号', en: 'Font size' },
  codeFont: { zh: '代码字体', en: 'Code font' },
  fontNotInstalled: { zh: '本机未装', en: 'missing' },
  fontLocal: { zh: '本地', en: 'local' },
  fontMono: { zh: '等宽', en: 'mono' },
  fontPresets: { zh: '常用预设', en: 'Common presets' },
  fontLocals: { zh: '本机字体', en: 'Installed on this machine' },
  fontSearch: { zh: '搜索本机字体…', en: 'Search installed fonts…' },
  fontNoMatch: { zh: '没有匹配的字体', en: 'No matching fonts' },
  fontCounting: { zh: '正在读取本机字体…', en: 'Reading installed fonts…' },
  fontLoadedCount: { zh: '已读取本机 {n} 款字体', en: '{n} fonts found on this machine' },
  fontScanFail: { zh: '未能读取本机字体清单，先列出常用预设', en: 'Could not read the font list — showing the common presets' },
  fontScanDenied: { zh: '本机字体访问被拒绝，浏览器地址栏授权后再试；先列出常用预设', en: 'Font access was denied — allow it in the browser, then retry; showing the common presets' },
  fontScanUnsupported: { zh: '当前环境不支持读取本机字体清单，先列出常用预设', en: 'This environment cannot list installed fonts — showing the common presets' },
  fontScanEmpty: { zh: '没读到本机字体清单，先列出常用预设', en: 'The font list came back empty — showing the common presets' },
  fontRetry: { zh: '重试', en: 'Retry' },
  themeSection: { zh: '选择主题', en: 'Themes' },
  themeCount: { zh: '38 款 · 按色系分组', en: '38 · by color family' },
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
  // 底部「作者其他插件」引流卡片（兄弟插件导流位，对齐 MattSkillsDeck 同款卡片）
  authorPlugins: { zh: '作者其他插件', en: 'More from the author' },
  authorPluginOpen: { zh: '在新窗口打开', en: 'Open in new window' },
  'authorPlugin.skillsDeck': { zh: '装好即自带 25 个工程/效率技能，右侧面板直接调用', en: '25 engineering skills built in — call them from the side panel' },
  'authorPlugin.prompt': { zh: '常用 prompt 预置或者自定义保存，开发只需要一键注入，不再繁琐', en: 'Save your prompt presets, inject them into a dev task with one click' },
  'authorPlugin.imCompanion': { zh: 'dsh-im 的增强插件，在原插件基础上提供了超过你想象力的能力', en: "Supercharges dsh-im with more than you'd expect" },
  // ── 检查更新（面板头行按钮 + 升级弹窗 + 待重启横幅）──
  updateCheck: { zh: '检查更新', en: 'Check for updates' },
  updateChecking: { zh: '检查中…', en: 'Checking…' },
  updateInstalling: { zh: '正在升级…', en: 'Updating…' },
  updateToVersion: { zh: '更新至 v{v}', en: 'Update to v{v}' },
  updateRestart: { zh: '待重启', en: 'Restart needed' },
  updateLatest: { zh: '已是最新版本（v{v}）', en: "You're on the latest version (v{v})" },
  updateCheckFail: { zh: '检查更新失败，请稍后再试', en: 'Could not check for updates — try again later' },
  updateToastRestart: { zh: '新版 v{v} 已装好，重启 DSH 后生效', en: 'v{v} installed — restart DSH to apply' },
  updateDialogTitle: { zh: '发现新版本 v{v}', en: 'New version v{v}' },
  updateVersions: { zh: '当前版本 v{running} → 最新版本 v{latest}', en: 'Current v{running} → latest v{latest}' },
  updateRestartNote: { zh: '装好后要重启 DSH 才会生效（正在运行的还是旧版）。', en: 'Restart DSH after installing — the running process keeps the old version until then.' },
  updateStart: { zh: '立即升级', en: 'Update now' },
  updateLater: { zh: '稍后', en: 'Later' },
  updateFailInstall: { zh: '升级失败，已保持当前版本', en: 'Update failed — the current version was kept' },
  updateFailChanged: { zh: '安装位置在升级过程中变了，重开 DSH 再试一次', en: 'The install location changed mid-update — reopen DSH and retry' },
  updateFailRecovery: { zh: '上次安装被打断，重新点一次「立即升级」', en: 'The last install was interrupted — press “Update now” again' },
  updateManualTitle: { zh: '自动升级没成功，可复制这条命令手动执行', en: 'Auto-update did not go through — copy this command and run it yourself' },
  updateManualNote: { zh: '在终端里执行（需要 pnpm 在 PATH 里）。', en: 'Run it in a terminal (pnpm must be on your PATH).' },
  updateCopy: { zh: '复制', en: 'Copy' },
  updateCopied: { zh: '已复制', en: 'Copied' },
  updateCopyFail: { zh: '复制失败，请手动选中复制', en: 'Copy failed — select the command manually' },
  updateUpToDateTitle: { zh: '已是最新版本', en: 'Up to date' },
  // 装不了的原因（更新包 README 第 8 节八种，文案照「用户该做什么」那一列）
  'blocked.unknown-profile': { zh: '使用范围认不出：检查范围名是否含特殊字符、目录是否还在', en: 'Unknown profile — check the profile name and that the directory still exists' },
  'blocked.source-install': { zh: '当前是按源码装的，想走更新先按版本号重装一次', en: 'Installed from source — reinstall by version first' },
  'blocked.invalid-installation': { zh: '已装的包不完整，先重装当前版本', en: 'The installed package is incomplete — reinstall the current version' },
  'blocked.installation-changed': { zh: '安装位置在使用中途变了，重开 DSH 再查一次', en: 'The install location changed — reopen DSH and check again' },
  'blocked.pending-restart': { zh: '新版已装到磁盘，重启 DSH 后生效', en: 'The new version is on disk — restart DSH to apply' },
  'blocked.registry-conflict': { zh: '清单里那行写的不是版本号，改成版本号再试', en: 'The profile manifest does not pin a version — pin one and retry' },
  'blocked.incompatible-node': { zh: '新版要求的 Node 更高，先升级 Node', en: 'The new version needs a newer Node — upgrade it first' },
  'blocked.recovery-required': { zh: '上次安装被打断，重新点一次安装', en: 'The last install was interrupted — retry the install' },
  'blocked.unknown': { zh: '当前装不了：重开 DSH 再查一次', en: 'Cannot update right now — reopen DSH and try again' },
}

// 语言检测（回退）：html[lang] 优先，回退浏览器语言
function getLang() {
  try {
    const l = (document.documentElement && document.documentElement.lang) || (navigator.language || 'en')
    return /^zh/i.test(l) ? 'zh' : 'en'
  } catch (e) { return 'en' }
}

// 字体可用性：随包字体（OFL 内联 @font-face）恒可用；本机字体（SF Mono / Consolas /
// Maple Mono NF CN 等）缺失即灰显提示（仍可选中，回退栈保证不断字）。
// 判定实现（宽度对比法）与理由见 engine/font-avail.mjs。
const isFontAvailable = createFontAvailability(
  () => (typeof document === 'undefined' ? undefined : document),
  BUNDLED_FONTS
)

// ── 本机字体清单（枚举 → 去重 → 等宽置顶 → 候选分级）──
// 缓存：一次会话只读一次本机清单（同一次枚举的结论对面板多次开合都成立）；
// 面板侧只在「读不到」时给「重试」入口，重试才强制重读。
let localFontsCache = null
function collectFontCandidates() {
  const scope = typeof window === 'undefined' ? null : window
  return collectLocalFonts(scope).then(function (res) {
    const candidates = buildFontCandidates(res.ok ? res.fonts : [], isFontAvailable, res.mono, Object.keys(FONTS), BUNDLED_FONTS)
    localFontsCache = {
      candidates: candidates,
      count: res.ok ? res.fonts.length : 0,
      reason: res.reason || null,
      ok: !!res.ok,
    }
    return localFontsCache
  })
}

// 宿主明暗信号：DSH 深色为 body[data-ds-dark-theme]，缺席即浅色（与 engine/generate.mjs 的 CSS 约定一致）
// 未知环境（SSR/旧宿主/mock 缺 body）回退 true = 保持现有深色视觉，绝不误伤深色主题
function isHostDark() {
  try {
    if (typeof document === 'undefined' || !document.body || typeof document.body.hasAttribute !== 'function') return true
    return document.body.hasAttribute('data-ds-dark-theme')
  } catch (e) { return true }
}

// 把 key → {zh,en} 表转成 locale 服务注册形态 {zh: {...}, en: {...}}
function toLocaleDicts(i18n) {
  const zh = {}
  const en = {}
  for (const key in i18n) {
    const pair = i18n[key]
    zh[key] = pair.zh
    en[key] = pair.en
  }
  return { zh, en }
}


// 生成注入物并注入：token 层 + <style> 层；幂等（先清后注入）
export function createClient(slotTarget) {
  return function apply(ctx) {
    const theme = ctx.get('theme')
    const slots = ctx.get('slots')

    let state = loadState()
    let tokenDispose = null
    let styleTag = null
    // ── 宿主桥 + 日志骨架 + 更新控制器（宿主不可用时整块降级，不影响主题面板）──
    const hostBridge = createHostBridge(ctx)
    const clientLog = createClientLog(
      {
        host: hostBridge,
        timer: { timeout: function (fn, ms) { return setTimeout(fn, ms) } },
        storage: (globalThis.localStorage ? globalThis.localStorage : null),
      },
      { pluginId: PLUGIN_ID, prefix: PHONE_PREFIX }
    )
    const update = createUpdateController({
      call: hostBridge ? function (phone, args) { return hostBridge.call(phone, args) } : null,
      phones: buildClientPhoneNames(PHONE_PREFIX),
      pollMs: CLIENT_POLL.defaultMs,
      log: function (level, event, fields) { try { clientLog.log(level, event, fields) } catch (e) { /* 忽略 */ } },
    })
    // 启动时向宿主对账调试开关（以宿主为准）；宿主不可用时静默，不抛错
    try { clientLog.reconcileLogSwitch() } catch (e) { /* 忽略 */ }
    try { clientLog.log('info', 'host.call', { method: 'boot', latencyMs: 0, ok: true, kind: 'boot', pluginId: PLUGIN_ID }) } catch (e) { /* 忽略 */ }

    // ── i18n 运行时：语言跟随 DSH（官方 locale 服务为信号源，html[lang] 仅作回退）──
    const localeSvc = ctx.get('locale') || ctx.locale || null
    const LOCALE_NS = 'opencode-palette'
    let dictDispose = null
    let localeUnsub = null
    let currentLang = localeSvc ? localeSvc.getLocale().active : getLang()
    const localeListeners = []
    function currentLocale() { return localeSvc ? localeSvc.getLocale().active : getLang() }
    function tr(key) {
      const entry = I18N[key]
      return entry ? (entry[currentLang] !== undefined ? entry[currentLang] : key) : key
    }
    // 带占位符的文案：trf('updateToVersion', { v: '1.8.0' })
    function trf(key, vars) {
      let text = tr(key)
      for (const name in vars) {
        if (Object.prototype.hasOwnProperty.call(vars, name)) text = text.split('{' + name + '}').join(String(vars[name]))
      }
      return text
    }
    function notifyLocale() {
      const next = currentLocale()
      if (next === currentLang) return
      currentLang = next
      for (const fn of localeListeners) { try { fn() } catch (e) { /* 忽略 */ } }
    }
    // 监听语言变化：官方 locale 服务优先；无该服务的环境（如旧版 DSH/测试沙箱）回退监听 html[lang]
    let localeObserver = null
    if (localeSvc && typeof localeSvc.subscribe === 'function') {
      localeUnsub = localeSvc.subscribe(notifyLocale)
    } else if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined' && document.documentElement) {
      localeObserver = new MutationObserver(notifyLocale)
      localeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
    }
    // 把面板双语表注册进 locale 服务：标题/文案随 DSH 语言实时切换（disposer 交给清理器）
    if (localeSvc && typeof localeSvc.register === 'function') {
      try { dictDispose = localeSvc.register(LOCALE_NS, toLocaleDicts(I18N)) } catch (e) { /* 忽略 */ }
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
        // 字体下拉：本机清单（枚举缓存）+ 搜索词 + 进行中标志
        const [fontList, setFontList] = react.useState(localFontsCache)
        const [fontQuery, setFontQuery] = react.useState('')
        const [fontBusy, setFontBusy] = react.useState(false)
        // 一次会话只自动读一次本机清单；「重试」显式复位后才允许再读
        const fontTriedRef = react.useRef(localFontsCache !== null)
        const [sizeOpen, setSizeOpen] = react.useState(false)
        const fontRef = react.useRef(null)
        const sizeRef = react.useRef(null)
        // UI 快照：所有引擎动作后 setUi(props.getState()) 重同步，避免受控控件显示值漂移
        const [ui, setUi] = react.useState(props.getState())
        const st = ui
        // 宿主明暗跟随：浅色下硬编码深色值须换 DSH 语义 token；开着面板切换系统主题时重渲染
        const [hostDark, setHostDark] = react.useState(isHostDark)

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

        // 本机字体清单：**只有用户真的点开下拉才读**（queryLocalFonts 要用户手势 + 可能弹授权），
        // 打开面板时不读。读不到也不影响控件：候选恒含预设兜底。
        react.useEffect(function () {
          if (!fontOpen) return
          if (fontList !== null || fontBusy || fontTriedRef.current) return
          fontTriedRef.current = true
          setFontBusy(true)
          collectFontCandidates().then(function (res) {
            setFontList(res)
            setFontBusy(false)
          }, function () {
            setFontList({ candidates: buildFontCandidates([], isFontAvailable, null, Object.keys(FONTS), BUNDLED_FONTS), count: 0, reason: 'failed', ok: false })
            setFontBusy(false)
          })
        }, [fontOpen, fontList, fontBusy])

        // 语言切换：DSH 界面语言变化时重渲染（文案跟随）
        react.useEffect(function () {
          return props.subscribeLocale(function () { setUi(props.getState()) })
        }, [])

        // 明暗切换：body[data-ds-dark-theme] 增删时重渲染（浅色适配跟随）
        react.useEffect(function () {
          if (typeof MutationObserver === 'undefined' || typeof document === 'undefined' || !document.body) return
          let obs = null
          try {
            obs = new MutationObserver(function () { setHostDark(isHostDark()) })
            obs.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
          } catch (e) { obs = null }
          return function () { try { if (obs) obs.disconnect() } catch (e) { /* 忽略 */ } }
        }, [])

        // 搜索过滤（命中组保留，空组隐藏）
        const q = query.trim().toLowerCase()
        const shown = q === ''
          ? props.groups()
          : props.groups()
              .map(function (g) { return { name: g.name, color: g.color, themes: g.themes.filter(function (t) { return (t.name + ' ' + (THEME_ZH[t.name] || '')).toLowerCase().indexOf(q) >= 0 }) } })
              .filter(function (g) { return g.themes.length > 0 })

        const muted = 'var(--dsw-alias-label-secondary)'
        const base = 'var(--dsw-alias-label-primary)'
        // 主题显示名：中文界面用中文名（system 走 i18n 文案）
        const themeLabel = function (name) {
          return currentLang === 'zh' && name !== 'system' ? (THEME_ZH[name] || name) : name
        }
        const fieldLabel = { fontSize: 11, color: muted }
        const secTitle = { fontSize: 11, color: muted, letterSpacing: '.08em', marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 8 }
        const countStyle = { color: 'var(--dsw-alias-label-dimmed)', fontSize: 11, letterSpacing: 0 }
        // 浅色适配（Q1/Q2 结论）：深色分支保持原值字节一致，浅色分支走 DSH 语义 token；
        // token 随生效主题解析（停用走宿主浅色默认，启用走主题派生），两态各自正确
        const segOnBg = hostDark ? 'rgba(255,255,255,0.14)' : 'var(--dsw-alias-interactive-bg-active)'
        const ddItemOnBg = hostDark ? 'rgba(255,255,255,0.1)' : 'var(--dsw-alias-interactive-bg-hover)'
        const menuShadow = hostDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.18)'
        // 开关停用态浅色用定值中性灰：面 token 在浅色下与底色撞车会隐身（复检教训），定值灰在任何浅底上可见
        const switchOffTrack = hostDark ? '#333338' : '#D4D4D8'
        const switchOffKnob = hostDark ? '#8b8b95' : '#FFFFFF'
        const dotFallback = hostDark ? '#555' : 'var(--dsw-alias-label-tertiary)'
        const chipBorderFallback = hostDark ? '#555' : 'var(--dsw-alias-border-l1)'
        // Q1：预览芯片保留原主题底色，浅色下加分离阴影保证与浅色底区分
        const chipShadow = hostDark ? undefined : '0 1px 3px rgba(0,0,0,0.25)'
        // 透明底芯片背景回退到浅色面，沿用主题浅色字会被洗白（如透光橙），浅色下改用主文字色
        const chipText = function (colors) {
          if (colors && colors.text && (hostDark || colors.background)) return colors.text
          return base
        }

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
                  background: on ? segOnBg : 'transparent',
                  color: on ? base : muted,
                  fontFamily: 'var(--dsw-font-family)',
                },
              }, opt.label)
            }))
        }
        // 通用下拉（字号）：紧凑按钮 + 弹出菜单，对齐 setup-panel 样例
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
                borderRadius: 8, minWidth: 200, width: 'max-content', maxWidth: 'calc(100vw - 48px)', padding: 4, boxShadow: menuShadow,
              },
            }, items) : null,
          ])
        }
        const dot = function (color, size) {
          return h('span', { style: { width: size, height: size, borderRadius: '50%', background: color || dotFallback, display: 'inline-block', flex: 'none' } })
        }

        // ── 代码字体下拉：常用预设（置顶）+ 本机字体（等宽置顶，可搜索）──
        // 候选缺省只有预设：本机清单读不到时控件照常可用（绝不出现空下拉）。
        const fallbackCandidates = buildFontCandidates([], isFontAvailable, null, Object.keys(FONTS), BUNDLED_FONTS)
        const candidates = fontList && fontList.candidates ? fontList.candidates : fallbackCandidates

        // 读不到清单的原因 → 人话提示（区分「没授权」与「没读到」，别都说成没字体）
        const fontHint = function () {
          if (fontBusy) return { text: tr('fontCounting'), retry: false }
          if (!fontList) return null
          if (fontList.ok) return { text: trf('fontLoadedCount', { n: fontList.count }), retry: false }
          const key = fontList.reason === 'denied' ? 'fontScanDenied'
            : fontList.reason === 'unavailable' ? 'fontScanUnsupported'
              : fontList.reason === 'empty' ? 'fontScanEmpty' : 'fontScanFail'
          return { text: tr(key), retry: true }
        }
        const retryFonts = function () {
          fontTriedRef.current = false
          localFontsCache = null
          setFontList(null)
        }
        // 候选行：族名按自己的字体渲染（预览即所得）；未装灰显标注，确实装在本机的标「已装」/「等宽」
        const fontItem = function (k) {
          const on = k.key === st.fontKey
          const suffix = k.ok && k.installed ? '(' + (k.mono ? tr('fontMono') : tr('fontLocal')) + ')' : (k.ok ? '' : '(' + tr('fontNotInstalled') + ')')
          return h('div', {
            key: k.key,
            onClick: function () {
              props.refresh(st.mode, st.size, k.key)
              setUi(props.getState())
              setFontOpen(false)
            },
            title: k.ok ? (k.installed ? tr('fontLocal') : '') : tr('fontNotInstalled'),
            style: {
              padding: '6px 10px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
              background: on ? ddItemOnBg : 'transparent',
              color: on ? base : muted,
              opacity: k.ok ? 1 : 0.45,
            },
          }, h('span', { style: { fontFamily: k.stack || codeFontStack(k.key), whiteSpace: 'nowrap' } }, k.key + suffix))
        }
        const hint = fontHint()
        const hintNode = hint
          ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 7px', fontSize: 11, color: muted, borderBottom: '1px solid var(--dsw-alias-border-l1)' } }, [
            h('span', { style: { flex: '1 1 auto' } }, hint.text),
            hint.retry ? h('span', {
              onClick: function () { retryFonts() },
              style: { cursor: 'pointer', color: 'var(--dsw-alias-brand-primary)', flex: 'none' },
            }, tr('fontRetry')) : null,
          ])
          : null
        const menuItem = function (key, label, onClick) {
          return h('div', {
            key: key,
            onClick: onClick,
            style: { padding: '6px 10px', fontSize: 12, borderRadius: 5, cursor: 'pointer', color: base },
          }, label)
        }
        const fontMenu = function () {
          const q = fontQuery.trim().toLowerCase()
          const match = function (k) { return q === '' || k.key.toLowerCase().indexOf(q) >= 0 }
          const presets = candidates.filter(function (k) { return k.isPreset && match(k) })
          // 枚举到的本机字体已按「等宽置顶 + 字母序」排好，这里只做过滤与截断（大清单别一次铺满 DOM）
          const all = candidates.filter(function (k) { return !k.isPreset && match(k) })
          const locals = all.slice(0, 400)
          const rows = []
          if (presets.length > 0) {
            rows.push(menuItem('sec-presets', tr('fontPresets'), function () {}))
            for (const k of presets) rows.push(fontItem(k))
          }
          if (locals.length > 0) {
            rows.push(menuItem('sec-locals', tr('fontLocals') + ' · ' + all.length, function () {}))
            for (const k of locals) rows.push(fontItem(k))
          }
          if (rows.length === 0) rows.push(menuItem('no-match', tr('fontNoMatch'), function () {}))
          return h('div', null, [
            h('input', {
              value: fontQuery,
              onChange: function (e) { setFontQuery(e.target.value) },
              onClick: function (e) { if (e && typeof e.stopPropagation === 'function') e.stopPropagation() },
              placeholder: tr('fontSearch'),
              style: {
                width: '100%', boxSizing: 'border-box', background: 'var(--dsw-alias-bg-layer-2)',
                border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 6, padding: '6px 10px',
                fontSize: 12, outline: 'none', color: base, fontFamily: 'var(--dsw-font-family)', marginBottom: 4,
              },
            }),
            hintNode,
            h('div', { style: { maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 } }, rows),
          ])
        }
        const fontPicker = function () {
          return h('div', { ref: fontRef, style: { position: 'relative' } }, [
            h('button', {
              // 手势必须在同步段里：queryLocalFonts 只能由真实用户激活触发，异步等待之后就丢了
              onClick: function () { setFontOpen(!fontOpen); setFontQuery('') },
              style: {
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--dsw-alias-bg-layer-2)', border: '1px solid var(--dsw-alias-border-l1)',
                borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer',
                color: base, fontFamily: 'var(--dsw-font-family)',
              },
            }, [
              h('span', { style: { fontFamily: codeFontStack(st.fontKey) } }, st.fontKey),
              h('span', { style: { color: muted } }, '▾'),
            ]),
            fontOpen ? h('div', {
              key: 'font-menu',
              style: {
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 20,
                background: 'var(--dsw-alias-bg-overlay)', border: '1px solid var(--dsw-alias-border-l1)',
                borderRadius: 8, minWidth: 240, width: 'max-content', maxWidth: 'calc(100vw - 48px)', padding: 4, boxShadow: menuShadow,
              },
            }, [fontMenu()]) : null,
          ])
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
              color: chipText(c),
              border: isCur ? '2px solid var(--dsw-alias-brand-primary)' : '1px solid ' + ((c && c.primary) || chipBorderFallback),
              borderRadius: 6, padding: '3px 8px 3px 5px', boxShadow: chipShadow,
              fontFamily: 'var(--ds-font-family-code)', fontSize: 11, cursor: 'pointer',
              outline: isCur ? '1px solid var(--dsw-alias-brand-primary)' : 'none',
            },
          }, [
            dot(c && c.primary, 9),
            t.name === 'system' ? tr('systemDefault') : themeLabel(t.name),
            isCur ? h('span', { style: { color: 'var(--dsw-alias-brand-primary)', fontWeight: 700 } }, '✓') : null,
          ])
        }



        // ── 作者其他插件（底部引流位）──
        // 只列兄弟插件、不自我推荐（本面板自己的星标链接就在标题行）；
        // 静态外链列表，不做「已安装」检测（面板侧无稳定安装信号）。
        const authorPlugins = [
          { repo: 'dsh-mattpocock-skills-deck', descKey: 'authorPlugin.skillsDeck' },
          { repo: 'dsh-prompt', descKey: 'authorPlugin.prompt' },
          { repo: 'dsh-im-companion', descKey: 'authorPlugin.imCompanion' },
        ]
        // 外链小图标（方框 + 右上斜箭头，与 MattSkills 同款语义）
        const extLinkIcon = function () {
          return h('svg', {
            width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none',
            stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
            style: { display: 'block' },
          }, [
            h('path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }),
            h('polyline', { points: '15 3 21 3 21 9' }),
            h('line', { x1: 10, y1: 14, x2: 21, y2: 3 }),
          ])
        }
        // 四宫格小图标（卡片标题前）
        const gridIcon = function () {
          return h('svg', {
            width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none',
            stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
            style: { display: 'block' },
          }, [
            h('rect', { key: 'tl', x: 3, y: 3, width: 7, height: 7, rx: 1 }),
            h('rect', { key: 'tr', x: 14, y: 3, width: 7, height: 7, rx: 1 }),
            h('rect', { key: 'bl', x: 3, y: 14, width: 7, height: 7, rx: 1 }),
            h('rect', { key: 'br', x: 14, y: 14, width: 7, height: 7, rx: 1 }),
          ])
        }
        // 底部引流卡片：3 行兄弟插件，整行可点（锚点），新窗口打开
        const authorCard = h('div', {
          style: {
            marginTop: 4,
            border: '1px solid var(--dsw-alias-border-l1)',
            borderRadius: 10, padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 4,
          },
        }, [
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 7, color: base, fontSize: 13, fontWeight: 600, marginBottom: 6 } }, [
            h('span', { key: 'ico', style: { color: muted, display: 'inline-flex' } }, gridIcon()),
            tr('authorPlugins'),
          ]),
          ...authorPlugins.map(function (p) {
            return h('a', {
              key: p.repo,
              href: 'https://github.com/FeatherHunter/' + p.repo,
              target: '_blank', rel: 'noopener noreferrer',
              title: tr('authorPluginOpen') + '：' + p.repo,
              style: {
                display: 'flex', alignItems: 'baseline', gap: 10,
                padding: '4px 6px', margin: '0 -6px', borderRadius: 6,
                textDecoration: 'none', cursor: 'pointer',
                background: 'transparent',
              },
            }, [
              h('span', { key: 'name', style: { fontFamily: 'var(--ds-font-family-code)', fontSize: 12, fontWeight: 700, color: base, whiteSpace: 'nowrap' } }, p.repo),
              h('span', { key: 'desc', style: { fontSize: 12, color: muted, flex: 1 } }, tr(p.descKey)),
              h('span', { key: 'ext', style: { color: 'var(--dsw-alias-label-tertiary)', display: 'inline-flex', flex: 'none' } }, extLinkIcon()),
            ])
          }),
        ])

        // ── 检查更新：订阅控制器（宿主不可用时整块不渲染）──
        const [upd, setUpd] = react.useState(props.update ? props.update.getState() : null)
        const [copied, setCopied] = react.useState(false)
        react.useEffect(function () {
          if (!props.update) return undefined
          setUpd(props.update.getState())
          const unsub = props.update.subscribe(function () { setUpd(props.update.getState()) })
          // 打开面板静默读一次本地状态：只读、不联网（联网只在用户点按钮时发生）
          props.update.readStatus()
          return unsub
        }, [])
        const updState = upd
        const updFailKey = function (s) {
          const message = String((s && s.jobMessage) || '')
          if (message === 'installation-changed') return 'updateFailChanged'
          if (message === 'recovery-required') return 'updateFailRecovery'
          return 'updateFailInstall'
        }
        const updLabel = function (s) {
          const which = buttonState(s)
          if (which === 'installing') return tr('updateInstalling')
          if (which === 'checking') return tr('updateChecking')
          if (which === 'pending') return tr('updateRestart')
          if (which === 'hasNew') return trf('updateToVersion', { v: s.latest })
          return tr('updateCheck')
        }
        const copyManual = function () {
          try {
            if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(String(updState.manual))
            setCopied(true)
          } catch (e) { /* 复制不可用 */ }
        }
        const updateButton = (updState && updState.available)
          ? h('button', {
              key: 'upd',
              onClick: function () { props.update.check() },
              disabled: !!(updState.checking || updState.installing),
              title: tr('updateCheck'),
              style: {
                border: '1px solid ' + (updState.hasNew ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l1)'),
                borderRadius: 6, padding: '3px 9px', fontSize: 11, cursor: 'pointer',
                background: updState.hasNew ? segOnBg : 'transparent',
                color: updState.hasNew ? 'var(--dsw-alias-brand-primary)' : muted,
                fontFamily: 'var(--dsw-font-family)', whiteSpace: 'nowrap',
              },
            }, updLabel(updState))
          : null
        const restartBanner = (updState && updState.pending)
          ? h('div', {
              key: 'restart',
              style: {
                display: 'flex', alignItems: 'center', gap: 8,
                border: '1px solid var(--dsw-alias-state-warn-primary)',
                background: 'var(--dsw-alias-bg-layer-2)',
                borderRadius: 8, padding: '8px 12px', fontSize: 12,
                color: 'var(--dsw-alias-state-warn-primary)',
              },
            }, trf('updateToastRestart', { v: updState.installed || '' }))
          : null
        const updateDialog = (updState && updState.available && updState.dialogOpen)
          ? h('div', {
              key: 'updDlg',
              onClick: function (e) { if (e.target === e.currentTarget) props.update.closeDialog() },
              style: { position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
            }, h('div', {
              style: {
                width: 460, maxWidth: 'calc(100vw - 32px)', boxSizing: 'border-box',
                background: 'var(--dsw-alias-bg-overlay)', border: '1px solid var(--dsw-alias-border-l1)',
                borderRadius: 12, padding: 18, boxShadow: menuShadow,
                display: 'flex', flexDirection: 'column', gap: 10,
              },
            }, [
              h('div', { key: 'ttl', style: { fontSize: 14, fontWeight: 600, color: base } }, trf('updateDialogTitle', { v: updState.latest || '' })),
              h('div', { key: 'ver', style: { fontSize: 12, color: muted } }, trf('updateVersions', { running: updState.running || PALETTE_VERSION, latest: updState.latest || '' })),
              h('div', { key: 'note', style: { fontSize: 12, color: muted } }, tr('updateRestartNote')),
              updState.failure ? h('div', { key: 'fail', style: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' } }, tr(updFailKey(updState))) : null,
              (updState.blocked && !updState.canInstall) ? h('div', { key: 'blocked', style: { fontSize: 12, color: muted } }, tr(blockedReasonKey(updState.blocked))) : null,
              updState.manual ? h('div', { key: 'manual', style: { display: 'flex', flexDirection: 'column', gap: 6 } }, [
                h('div', { key: 'mh', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12, color: base } }, [
                  h('span', { key: 't' }, tr('updateManualTitle')),
                  h('button', {
                    key: 'c',
                    onClick: copyManual,
                    style: { border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer', background: 'transparent', color: muted, fontFamily: 'var(--dsw-font-family)' },
                  }, tr(copied ? 'updateCopied' : 'updateCopy')),
                ]),
                h('pre', { key: 'p', style: { margin: 0, padding: '8px 10px', background: 'var(--dsw-alias-bg-layer-2)', border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 6, fontSize: 11, overflowX: 'auto', color: base, fontFamily: 'var(--ds-font-family-code)' } }, String(updState.manual)),
                h('div', { key: 'mn', style: { fontSize: 11, color: muted } }, tr('updateManualNote')),
              ]) : null,
              h('div', { key: 'acts', style: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 2 } }, [
                updState.canInstall && updState.checkId
                  ? h('button', {
                      key: 'go',
                      onClick: function () { props.update.install() },
                      disabled: !!updState.installing,
                      style: { border: '1px solid var(--dsw-alias-brand-primary)', borderRadius: 6, padding: '5px 14px', fontSize: 12, cursor: 'pointer', background: segOnBg, color: 'var(--dsw-alias-brand-primary)', fontFamily: 'var(--dsw-font-family)' },
                    }, tr('updateStart'))
                  : null,
                h('button', {
                  key: 'later',
                  onClick: function () { props.update.closeDialog() },
                  style: { border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 6, padding: '5px 14px', fontSize: 12, cursor: 'pointer', background: 'transparent', color: muted, fontFamily: 'var(--dsw-font-family)' },
                }, tr('updateLater')),
              ]),
            ]))
          : null

        return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 920 } }, [
          restartBanner,
          // 头行：标题 + 状态开关（一个状态一个控制）
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } }, [
            h('strong', null, '🎨 ' + tr('panelName')),
            h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 8 } }, [
              h('span', { style: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' } }, 'v' + PALETTE_VERSION),
              updateButton,
              h('a', {
                href: 'https://github.com/FeatherHunter/dsh-opencode-palette',
                target: '_blank', rel: 'noopener noreferrer',
                title: '你的 ⭐是我夜空中最亮的星 🌹',
                style: { color: muted, display: 'inline-flex', cursor: 'pointer', fontSize: 15, lineHeight: 1, textDecoration: 'none' },
              }, '🌟'),
              // ISSUE 入口：消息气泡形态（信息图标认不出「提需求」，气泡才读得出是反馈）
              h('a', {
                href: 'https://github.com/FeatherHunter/dsh-opencode-palette/issues',
                target: '_blank', rel: 'noopener noreferrer',
                title: '任何功能需求、故障、建议、意见都可以提ISSUE',
                style: { color: muted, display: 'inline-flex', cursor: 'pointer' },
              }, h('svg', {
                width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none',
                stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
                style: { display: 'block' },
              }, h('path', {
                d: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
              }))),
              h('span', { style: { color: st.enabled ? 'var(--dsw-alias-state-success-primary)' : muted, fontSize: 12 } },
                st.enabled ? tr('enabled') : tr('disabled')),
              h('span', {
                onClick: function () { props.toggle(); setUi(props.getState()) },
                title: st.enabled ? tr('disableTitle') : tr('enableTitle'),
                style: {
                  position: 'relative', display: 'inline-block', width: 36, height: 20,
                  borderRadius: 11, cursor: 'pointer',
                  background: st.enabled ? 'rgba(250,178,131,0.4)' : switchOffTrack,
                  transition: 'background .12s',
                },
              }, h('span', {
                style: {
                  position: 'absolute', top: 3, left: st.enabled ? 19 : 3,
                  width: 14, height: 14, borderRadius: '50%',
                  background: st.enabled ? '#FAB283' : switchOffKnob,
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
                    background: on ? ddItemOnBg : 'transparent',
                    color: on ? base : muted,
                  },
                }, String(s) + 'px')
              })),
            fontPicker(),
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
          // ── 底部：作者其他插件（引流位）──
          authorCard,
          updateDialog,
        ])
      }
      // 面板 API（settings.plugins.tab 与 settings.section 两个入口共享同一份 state）
      const paletteApi = function () {
        return {
          getState: getState,
          toggle: toggle,
          refresh: refresh,
          setTheme: setTheme,
          themeNames: themeNames,
          // 检查更新：控制器 + 日志器交给面板（宿主不可用时 update.available 为假，按钮不渲染）
          update: update,
          log: clientLog,
          // 本机字体清单：面板打开下拉时调（要用户手势），未打开下拉不读；失败恒回退预设
          collectFonts: collectFontCandidates,
          // 面板文案（测试/调试用，走同一份双语表）
          text: function (key, vars) { return vars ? trf(key, vars) : tr(key) },
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
      }
      disposePanel = slots.inject(slotTarget, function () {
        return slots.register({
          name: slotTarget,
          id: 'opencode-palette',
          order: 30,
          label: function () { return tr('panelName') },
          inject: paletteApi,
        }, Panel)
      })
      // 设置页左侧导航直达入口（保留「设置 → 插件」内的原入口）
      // settings.section = 设置页左侧 section 列表（general=0 / models=10 / plugins=15 / agent-presets=20）
      let disposeSection = null
      if (slotTarget === 'settings.plugins.tab') {
        disposeSection = slots.inject('settings.section', function () {
          return slots.register({
            name: 'settings.section',
            id: 'opencode-palette',
            order: 16,
            label: function () { return tr('panelName') },
            inject: paletteApi,
          }, Panel)
        })
      }
      disposeSection = disposeSection || null
    }

    // 卸载清理（cordis 语义：effect fn 立即执行，返回值才是清理器）
    ctx.effect(function () {
      return function () {
        try { clearStyle() } catch (e) { /* 忽略 */ }
        try { if (disposePanel) disposePanel() } catch (e) { /* 忽略 */ }
        try { if (disposeSection) disposeSection() } catch (e) { /* 忽略 */ }
        try { if (globalThis.__opencodePalette) delete globalThis.__opencodePalette } catch (e) { /* 忽略 */ }
        try { if (dictDispose) dictDispose() } catch (e) { /* 忽略 */ }
        try { if (localeUnsub) localeUnsub() } catch (e) { /* 忽略 */ }
        try { if (localeObserver) localeObserver.disconnect() } catch (e) { /* 忽略 */ }
        try { update.dispose() } catch (e) { /* 忽略 */ }
        try { clientLog.flush() } catch (e) { /* 忽略 */ }
      }
    }, 'dsh-opencode-palette: styles')
  }
}
