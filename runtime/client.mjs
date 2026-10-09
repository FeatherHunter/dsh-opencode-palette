// runtime/client.mjs — 浏览器运行时：注入/热切换/持久化/设置面板（组合 1 布局）
// 布局：标题行 → 排印调节（顶部）→ 主题选择（色系分组标签 + mini 芯片）→ 状态开关
// 依赖注入：theme（dsh-client-ui-theme）、slots（settings.plugins.tab / tool.view.cordis）
import { renderTheme, previewColors, themeNames, themeGroups, delegatesBackground } from './engine/index.mjs'
import { FONTS } from './engine/map-dsh.mjs'
import { BUNDLED_FONTS } from './engine/font-face.mjs'
import { createFontAvailability } from './engine/font-avail.mjs'
import { codeFontStack } from './engine/generate.mjs'
import { buildFontCandidates, collectLocalFonts } from './engine/local-fonts.mjs'
import { computeMenuGeometry } from './engine/float-geometry.mjs'
import { THEME_ZH, THEME_EN, themeSearchText } from './engine/zh-names.mjs'
import { buildUpdateTokens } from './engine/update-tokens.mjs'
import { createClientLog } from 'dsh-log/client'
import { mountUpdateEntry } from 'dsh-plugin-update/entry'
import { CHANNEL, ENDPOINT, PLUGIN_ID, PHONE_PREFIX } from './channel.mjs'

const STORAGE_KEY = 'dsh.opencode-palette.v2'
// 兼容迁移：旧插件（dsh-opencode-tui-theme）的本地设置键，读到即迁移到新键
const LEGACY_STORAGE_KEY = 'dsh.opencode-tui-theme.v2'
const DEFAULT_STATE = { enabled: true, theme: 'opencode', mode: 'mono', size: 13, fontKey: 'JetBrains Mono', followAppearance: true }
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
      // 跟随开关已下线：恒跟随，存量 false 迁移为 true，不给用户选择
      return { ...DEFAULT_STATE, ...s, followAppearance: true }
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
  panelName: { zh: 'OpenCode调色板', en: 'OpenCode Palette' },
  // 计数为派生数据：{n} 取 themeNames().length（37 静态＋system，恒≥2，英文恒复数），转抄 38 必漂（34→38 前车）。
  subtitle: { zh: '{n} 款 OpenCode 官方配色主题，点击即切换', en: '{n} official OpenCode themes — click to switch' },
  enabled: { zh: '已启用', en: 'Enabled' },
  disabled: { zh: '已停用', en: 'Disabled' },
  disableTitle: { zh: '点击停用主题', en: 'Click to disable the theme' },
  enableTitle: { zh: '点击启用主题', en: 'Click to enable the theme' },
  // 头行 star／issue 图标的悬浮气泡：此前硬编码中文未进词典，英文界面漏网（2026-10-06 补）
  starTitle: { zh: '你的 ⭐是我夜空中最亮的星 🌹', en: 'Star this project on GitHub' },
  issueTitle: { zh: '任何功能需求、故障、建议、意见都可以提ISSUE', en: 'Report bugs or request features in Issues' },
  typography: { zh: '字体字号', en: 'Typography' },
  bodyStyle: { zh: '正文样式', en: 'Body style' },
  mono: { zh: '全部文字', en: 'All text' },
  sans: { zh: '仅代码', en: 'Code only' },
  fontSize: { zh: '字号', en: 'Font size' },
  codeFont: { zh: '代码字体', en: 'Code font' },
  fontNotInstalled: { zh: '本机未装', en: 'Not installed on this machine' },
  fontLocal: { zh: '本地', en: 'Local' },
  fontMono: { zh: '等宽', en: 'Mono' },
  fontPresets: { zh: '常用预设', en: 'Common presets' },
  fontLocals: { zh: '本机字体', en: 'Installed on this machine' },
  fontSearch: { zh: '搜索本机字体…', en: 'Search installed fonts…' },
  fontNoMatch: { zh: '没有匹配的字体', en: 'No matching fonts' },
  fontCounting: { zh: '正在读取本机字体…', en: 'Reading installed fonts…' },
  fontLoadedCount: { zh: '已读取本机 {n} 款字体', en: '{n} fonts found on this machine' },
  fontScanFail: { zh: '未能读取本机字体清单，先列出常用预设', en: 'Could not read the font list — showing the common presets' },
  fontScanDenied: { zh: '本机字体访问被拒绝，浏览器地址栏授权后再试；先列出常用预设', en: 'Font access was denied — allow it in the browser address bar, then retry; showing the common presets' },
  fontScanUnsupported: { zh: '当前环境不支持读取本机字体清单，先列出常用预设', en: 'This environment cannot list installed fonts — showing the common presets' },
  fontScanEmpty: { zh: '本机字体清单为空，先列出常用预设', en: 'The font list came back empty — showing the common presets' },
  fontRetry: { zh: '重试', en: 'Retry' },
  themeSection: { zh: '主题', en: 'Themes' },
  themeCount: { zh: '{n} 款 · 按色系分组', en: '{n} themes · by color family' },
  search: { zh: '搜索主题…', en: 'Search themes…' },
  noMatch: { zh: '未找到匹配的主题', en: 'No matching themes' },
  systemDefault: { zh: 'system（跟随系统）', en: 'system (follow system)' },
  translucentNote: { zh: '透光主题：背景沿用你的 DSH 外观', en: 'Translucent theme: background follows your DSH appearance' },
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
  'authorPlugin.prompt': { zh: '保存常用 prompt 预设，一键注入开发任务', en: 'Save your prompt presets, inject them into a dev task with one click' },
  'authorPlugin.imCompanion': { zh: 'dsh-im 的增强插件，在原插件基础上提供了超过你想象力的能力', en: "Supercharges dsh-im with more than you'd expect" },
  // ── 日志开关（面板头行的小开关；开的是 dsh-log 的落盘开关，排障用）──
  logSwitch: { zh: '日志', en: 'Log' },
  logOn: { zh: '开', en: 'On' },
  logOff: { zh: '关', en: 'Off' },
  logSwitchHint: { zh: '打开后把关键节点写入 <DSH_HOME>/logs/dsh-opencode-palette/；warn/error 恒记，不受此开关控制', en: 'Write key nodes to <DSH_HOME>/logs/dsh-opencode-palette/ (for troubleshooting; warn/error lines are always kept)' },
  logSwitchFail: { zh: '日志开关没能写入宿主，请重开面板再试', en: 'The host did not accept the log switch — reopen the panel and retry' },
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
    // ── 宿主桥 + 日志骨架 + 更新入口件（宿主不可用时更新块不挂载，不影响主题面板）──
    const hostBridge = createHostBridge(ctx)
    const clientLog = createClientLog(
      {
        host: hostBridge,
        timer: { timeout: function (fn, ms) { return setTimeout(fn, ms) } },
        storage: (globalThis.localStorage ? globalThis.localStorage : null),
      },
      { pluginId: PLUGIN_ID, prefix: PHONE_PREFIX }
    )
    // ── 检查更新：dsh-plugin-update@0.10.0 入口件 + 弹窗换肤（主题一致）。头行原按钮位置挂载 variant button，
    // 面板由入口件内部按需以 dialog 挂起；轮询/安装态/文案全交包。themeTokens 把当前 opencode 主题色位映射进
    // 包内 --dsh-update-* 变量（按钮 + dialog 同步生效，入口件打开的 dialog 自动透传）；换主题经 setThemeTokens 即时换肤。
    // 语言跟随（更新包 locale 选项）：把本面板的语言信号（官方 locale 服务优先，html[lang] 回退）
    // 以 { getActive, subscribe } 适配器交给入口件——按钮文案与它打开的 dialog 面板都按同一语言单语渲染，
    // 切换即时重绘；入口件只挂载一次，不随语言重挂（unmount 时停订，不泄漏）。宿主不可用时不挂载，主题面板照常。
    // 按钮尺寸走正式参数 sizing（取代旧容器 zoom 临时方案，上游 #69 已落地）：12px/2px 10px/6px/scale 1，
    // 容器再加 nowrap 防止“检查更新”折成两行；不碰包内类名。
    // 入口按钮去底（头行是宿主地盘）：只覆盖入口作用域的 buttonBg 为透明——dialog 根 .dsh-upd
    // 不在 .dsh-upd-entry 内故不受影响；按钮自身指定值胜过祖先 inline tokens 的继承值。上游改名则静默回退到主题色块。
    const UPDATE_ENTRY_TRANSPARENT_BG = '.dsh-upd-entry .dsh-upd-entry-btn{--dsh-update-button-bg:transparent}'
    const mountedUpdateEntries = []
    function currentUpdateTokens() {
      try {
        return buildUpdateTokens(state.theme)
      } catch (e) {
        return undefined
      }
    }
    function refreshUpdateTheme() {
      const tokens = currentUpdateTokens()
      for (const entry of mountedUpdateEntries) {
        try {
          if (entry && typeof entry.setThemeTokens === 'function') entry.setThemeTokens(tokens)
        } catch (err) { /* 忽略 */ }
      }
    }
    function updateLocaleSource() {
      return {
        getActive: function () { return currentLocale() },
        subscribe: function (cb) {
          localeListeners.push(cb)
          return function () {
            const i = localeListeners.indexOf(cb)
            if (i >= 0) localeListeners.splice(i, 1)
          }
        },
      }
    }
    function mountUpdateButton(container) {
      if (!hostBridge || !container || typeof container.innerHTML !== 'string') return null
      try {
        const entry = mountUpdateEntry(container, {
          pluginId: PLUGIN_ID,
          prefix: PHONE_PREFIX,
          call: function (phone, args) { return hostBridge.call(phone, args) },
          variant: 'button',
          theme: 'default',
          openOn: 'always',
          themeTokens: currentUpdateTokens(),
          sizing: { fontSize: '12px', padding: '2px 10px', borderRadius: '6px', scale: 1 },
          autoCheck: 'mount',
          changelogMarkdown: null,
          locale: updateLocaleSource(),
        })
        mountedUpdateEntries.push(entry)
        return entry
      } catch (err) { return null }
    }
    function unmountUpdateButtons() {
      while (mountedUpdateEntries.length > 0) {
        try { mountedUpdateEntries.pop().unmount() } catch (err) { /* 忽略 */ }
      }
    }
    // 启动时向宿主对账调试开关（以宿主为准）；宿主不可用时静默，不抛错。
    // 首帧渲染可先用这一次对账的本地快照，但面板每次挂载的校正必须 fresh 查询——
    // 复用启动快照会在写成功后把新值覆回旧值（issue 42：打开后重进被关闭）。
    let logSwitchReady = null
    try { logSwitchReady = clientLog.reconcileLogSwitch() } catch (e) { /* 忽略 */ }
    try { clientLog.log('info', 'host.call', { method: 'boot', latencyMs: 0, ok: true, kind: 'boot', pluginId: PLUGIN_ID }) } catch (e) { /* 忽略 */ }

    // ── i18n 运行时：语言跟随 DSH（官方 locale 服务为信号源，html[lang] 仅作回退）──
    const localeSvc = ctx.get('locale') || ctx.locale || null
    const LOCALE_NS = 'opencode-palette'
    let dictDispose = null
    let localeUnsub = null
    let currentLang = localeSvc ? localeSvc.getLocale().active : getLang()
    const localeListeners = []
    // 入口重注册钩：语言切换时让宿主重读入口 label（注册函数在面板段定义，此处只留钩位）
    let reregisterEntries = null
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
      for (const fn of localeListeners.slice()) { try { fn() } catch (e) { /* 忽略 */ } }
      // 入口 label 跟随：宿主只在注册时读一次 label，语言切换后需重注册才刷新入口；
      // 面板内容已由上面的订阅重渲染，不受影响。宿主不支持重注册则保持旧入口。
      try { if (reregisterEntries) reregisterEntries() } catch (e) { /* 忽略 */ }
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
      // 3) token 层（issue 45：自持画布两半同值=深色观感；委托画布按外观取作者值）
      tokenDispose = theme.overrideTokens('opencode-palette', render.tokens)
      // 4) <style> 层
      if (styleTag === null && typeof document !== 'undefined') {
        styleTag = document.createElement('style')
        styleTag.dataset.plugin = 'dsh-opencode-palette'
        document.head.appendChild(styleTag)
      }
      if (styleTag) styleTag.textContent = render.css + UPDATE_ENTRY_TRANSPARENT_BG
      return render.meta
    }

    function clearStyle() {
      if (tokenDispose) { try { tokenDispose() } catch (e) { /* 忽略 */ } tokenDispose = null }
      if (styleTag !== null && styleTag.parentNode) {
        styleTag.parentNode.removeChild(styleTag)
      }
      styleTag = null
    }

    // ── 外观跟随（issue 48）：正门是 ctx.theme.setTheme（与设置页同一条写入口，
    // 经 ui-theme 设置作用域持久化并广播快照，宿主全量应用，设置页显示一致）。
    // 无该 API 的旧宿主才降级走文档投影（与宿主 apply 快照同构：root color-scheme +
    // 根 source 属性 + body 深色标记），会话级记住投影前原始值以便恢复。
    // 只在选中/启停/开关事件上动作一次，不持续对抗宿主：用户在设置页改外观即最后写入者胜出。
    const DARK_ATTR = 'data-ds-dark-theme'
    const SOURCE_ATTR = 'data-ds-theme-source'
    let appearanceManaged = false
    let appearanceBefore = null
    let appearanceProjected = null
    let appearanceFallbackLogged = false
    let lastOfficialPref = null
    let officialBeforePref = null
    let officialBeforeRecorded = false
    function readHostPreference() {
      try {
        if (!theme || typeof theme.getTheme !== 'function') return undefined
        const snap = theme.getTheme()
        if (!snap) return undefined
        const p = snap.preference !== undefined ? snap.preference : (snap.active && snap.active.preference)
        return p === undefined ? undefined : p
      } catch (e) { return undefined }
    }
    function verifyHostPreference(pref) {
      const cur = readHostPreference()
      if (cur === undefined) return true
      return cur === pref
    }
    function restoreOfficialOnStop() {
      if (lastOfficialPref === null || lastOfficialPref === undefined) return
      const target = lastOfficialPref
      lastOfficialPref = null
      const cur = readHostPreference()
      if (cur === undefined || cur !== target) return
      const back = officialBeforePref
      if (back === undefined || back === null || back === target) return
      try { if (theme && typeof theme.setTheme === 'function') theme.setTheme(back) } catch (e) { /* 忽略 */ }
    }
    function logAppearanceFallback() {
      if (appearanceFallbackLogged) return
      appearanceFallbackLogged = true
      try { clientLog.log('info', 'host.call', { method: 'appearance-fallback', latencyMs: 0, ok: true, kind: 'fallback', pluginId: PLUGIN_ID }) } catch (e) { /* 忽略 */ }
    }
    function snapshotDocument() {
      try {
        const de = typeof document !== 'undefined' ? document.documentElement : null
        const body = typeof document !== 'undefined' ? document.body : null
        return {
          bodyDark: body && typeof body.hasAttribute === 'function' ? body.hasAttribute(DARK_ATTR) : null,
          scheme: de && de.style ? (de.style.colorScheme || '') : null,
          source: de && typeof de.getAttribute === 'function' ? de.getAttribute(SOURCE_ATTR) : null,
        }
      } catch (e) { return null }
    }
    function projectAppearance(dark) {
      try {
        if (typeof document === 'undefined' || !document.body || !document.documentElement) return
        if (!appearanceManaged) { appearanceManaged = true; appearanceBefore = snapshotDocument() }
        const scheme = dark ? 'dark' : 'light'
        const de = document.documentElement
        try { if (de.style) de.style.colorScheme = scheme } catch (e) { /* 忽略 */ }
        try { if (typeof de.setAttribute === 'function') de.setAttribute(SOURCE_ATTR, scheme) } catch (e) { /* 忽略 */ }
        try {
          if (dark) document.body.setAttribute(DARK_ATTR, '')
          else document.body.removeAttribute(DARK_ATTR)
        } catch (e) { /* 忽略 */ }
        appearanceProjected = { bodyDark: dark, scheme: scheme, source: scheme }
      } catch (e) { /* 宿主 DOM 不可写则静默跳过 */ }
    }
    function releaseAppearance() {
      try {
        if (!appearanceManaged) return
        appearanceManaged = false
        const prev = appearanceBefore
        const projected = appearanceProjected
        appearanceBefore = null
        appearanceProjected = null
        if (!prev || typeof document === 'undefined' || !document.body || !document.documentElement) return
        const de = document.documentElement
        // 只释放我们自己写的值：中途被宿主/用户改过的信号一律不动（陈旧快照不覆盖新写入）
        const cur = snapshotDocument() || {}
        const ours = function (key) { return projected && cur[key] === projected[key] }
        try {
          if (!de.style || !ours('scheme')) { /* 不是我们写的则不动 */ }
          else if (prev.scheme) de.style.colorScheme = prev.scheme
          else if (typeof de.style.removeProperty === 'function') de.style.removeProperty('color-scheme')
          else de.style.colorScheme = ''
        } catch (e) { /* 忽略 */ }
        try {
          if (typeof de.setAttribute !== 'function' || !ours('source')) { /* 跳过 */ }
          else if (prev.source === null || prev.source === undefined) { if (typeof de.removeAttribute === 'function') de.removeAttribute(SOURCE_ATTR) }
          else de.setAttribute(SOURCE_ATTR, prev.source)
        } catch (e) { /* 忽略 */ }
        try {
          if (prev.bodyDark === null || prev.bodyDark === undefined || !ours('bodyDark')) { /* 未知或被改过则不动 */ }
          else if (prev.bodyDark) document.body.setAttribute(DARK_ATTR, '')
          else document.body.removeAttribute(DARK_ATTR)
        } catch (e) { /* 忽略 */ }
      } catch (e) { /* 忽略 */ }
    }
    function syncAppearanceForTheme(name) {
      // 无跟随开关：只要启用就恒跟随（深色→dark、透光→light、system→system释放）
      if (!state.enabled) return
      // system 已是释放态时不写：宿主已为 system 即无主张，重写反而可能在 compat 宿主上落成具体值（#55）
      if (name === 'system' && readHostPreference() === 'system') { releaseAppearance(); return }
      let pref
      if (name === 'system') pref = 'system'
      else {
        let translucent = false
        try { translucent = delegatesBackground(name) } catch (e) { translucent = false }
        pref = translucent ? 'light' : 'dark'
      }
      let official = false
      try {
        if (theme && typeof theme.setTheme === 'function') {
          if (!officialBeforeRecorded) { officialBeforeRecorded = true; officialBeforePref = readHostPreference() }
          theme.setTheme(pref)
          official = verifyHostPreference(pref)
        }
      } catch (e) { official = false }
      if (official) { appearanceManaged = false; appearanceBefore = null; appearanceProjected = null; lastOfficialPref = pref; return }
      logAppearanceFallback()
      if (pref === 'system') { releaseAppearance(); return }
      projectAppearance(pref === 'dark')
    }
    // ── 面板 API（与 React 组件共享）──
    function getState() { return { ...state } }
    function setTheme(name) {
      state = { ...state, theme: safeThemeName(name) }
      saveState(state)
      if (state.enabled) applyStyle()
      syncAppearanceForTheme(state.theme)
      refreshUpdateTheme()
    }
    function setTypography(next) {
      state = { ...state, ...next }
      saveState(state)
      if (state.enabled) applyStyle()
    }
    function toggle() {
      state = { ...state, enabled: !state.enabled }
      saveState(state)
      if (state.enabled) { applyStyle(); syncAppearanceForTheme(state.theme); refreshUpdateTheme() } else { clearStyle(); restoreOfficialOnStop(); releaseAppearance() }
    }
    function refresh(nextMode, nextSize, nextFont) {
      setTypography({ mode: nextMode, size: nextSize, fontKey: nextFont })
    }

    // 启动：默认启用（与 v1.1.0 一致）。外观跟随在启动时对齐一次，但存量 system 主题跳过：
    // 启动是非手势路径，system 即无主张，不写偏好；点击 system 仍走官方写入口（显式手势）。
    if (state.enabled) { applyStyle(); if (state.theme !== 'system') syncAppearanceForTheme(state.theme) }

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
        const fontBtnRef = react.useRef(null)
        const fontMenuRef = react.useRef(null)
        // 悬浮锚点：fixed 菜单的视口坐标。fixed 逃的是祖先 overflow 裁剪
        // （z-index 再高也逃不出去）；null = 菜单关闭
        const [fontAnchor, setFontAnchor] = react.useState(null)
        // 量一次锚点并定位：true = 已定位，false = 锚点不可见（调用方关菜单，不乱放）
        const placeFontMenu = function (menuW, menuH) {
          try {
            if (typeof window === 'undefined' || !fontBtnRef.current || typeof fontBtnRef.current.getBoundingClientRect !== 'function') return false
            const r = fontBtnRef.current.getBoundingClientRect()
            const g = computeMenuGeometry(
              { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width },
              { width: window.innerWidth, height: window.innerHeight },
              menuW === undefined ? null : menuW,
              menuH === undefined ? null : menuH
            )
            if (!g) return false
            setFontAnchor(g)
            return true
          } catch (e) { return false }
        }
        const openFontMenu = function () {
          setFontQuery('')
          if (fontOpen) { setFontOpen(false); setFontAnchor(null); return }
          if (!placeFontMenu(null, null)) { setFontOpen(false); setFontAnchor(null); return }
          setFontOpen(true)
        }
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

        // 悬浮锚点跟随：挂载后用实测菜单尺寸校正一次；页面滚动/窗口缩放时重定位
        // （只有关闭是诚实的 fallback：锚点已出视野时关菜单，绝不乱放）
        react.useEffect(function () {
          if (!fontOpen) return
          if (typeof window === 'undefined') return
          function menuSize() {
            try {
              if (fontMenuRef.current && typeof fontMenuRef.current.getBoundingClientRect === 'function') {
                const m = fontMenuRef.current.getBoundingClientRect()
                return { w: m.width, h: m.height }
              }
            } catch (e) { /* 量不到就用估计值 */ }
            return { w: null, h: null }
          }
          function reposition() {
            const s = menuSize()
            if (!placeFontMenu(s.w, s.h)) { setFontOpen(false); setFontAnchor(null) }
          }
          reposition()
          function onScroll(e) {
            try {
              if (fontMenuRef.current && e && e.target && fontMenuRef.current.contains(e.target)) return
            } catch (err) { /* 含不住就当外部滚动 */ }
            reposition()
          }
          function onResize() { reposition() }
          window.addEventListener('scroll', onScroll, true)
          window.addEventListener('resize', onResize)
          return function () {
            window.removeEventListener('scroll', onScroll, true)
            window.removeEventListener('resize', onResize)
          }
        }, [fontOpen])

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

        // 搜索过滤（命中组保留，空组隐藏；issue 48：芯片是主题的投影不是宿主的镜像，
        // 分组与预览色恒走深色基线，与宿主明暗无关；面板铬（阴影/描边回退）仍跟随宿主）
        const q = query.trim().toLowerCase()
        const shown = q === ''
          ? props.groups('dark')
          : props.groups('dark')
              .map(function (g) { return { name: g.name, color: g.color, themes: g.themes.filter(function (t) { return themeSearchText(t.name).toLowerCase().indexOf(q) >= 0 }) } })
              .filter(function (g) { return g.themes.length > 0 })

        const muted = 'var(--dsw-alias-label-secondary)'
        const base = 'var(--dsw-alias-label-primary)'
        // 主题显示名：中文界面用中文名、英文界面用官方名（system 走 i18n 文案）；
        // 两表都缺键才退回内部 id（slug 兜底，键集由单源对账 pin 住）
        const themeLabel = function (name) {
          if (name === 'system') return name
          return currentLang === 'zh' ? (THEME_ZH[name] || name) : (THEME_EN[name] || name)
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
        // 透光芯片恒浅底（浅色主题一眼可辨，不随宿主深浅走）；system 芯片跟宿主走（浅宿主白底、深宿主深底）
        const chipDarkSurface = '#0A0A0A'
        const chipLightSurface = '#FFFFFF'
        const chipLightText = '#1A1A1A'
        // issue 48：预览色恒为深色基线，直接取主题文字色；
        // 缺失（system）才回退主文字色。旧逻辑回退到的主文字色恰是引擎覆盖的值，等于没修。
        const chipText = function (colors) {
          if (colors && colors.text) return colors.text
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
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 1000,
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
            title: k.key + suffix,
            style: {
              display: 'flex', alignItems: 'center', height: '28px', padding: '0 10px',
              fontSize: 12, lineHeight: '20px', borderRadius: 5, cursor: 'pointer',
              background: on ? ddItemOnBg : 'transparent',
              color: on ? base : muted,
              opacity: k.ok ? 1 : 0.45,
              overflow: 'hidden', whiteSpace: 'nowrap',
              flex: 'none',
            },
          }, h('span', { style: { flex: '1 1 auto', minWidth: '0', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '20px', fontFamily: k.stack || codeFontStack(k.key) } }, k.key + suffix))
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
        // 分组标题：非点击的分区线（替代旧“本机字体 · 90”文本分隔）。
        // 文本用主题色 var(--dsw-alias-brand-primary)（随当前 opencode 主题走 primary），
        // 数量做成描边徽章 + 中间细分割线，不再用“·”拼接字符串。
        const secHeader = function (key, label, count) {
          const badge = (count === null || count === undefined) ? null : h('span', {
            key: 'n',
            style: {
              fontSize: 11, lineHeight: '16px', padding: '0 7px', borderRadius: 999,
              border: '1px solid var(--dsw-alias-brand-primary)',
              color: 'var(--dsw-alias-brand-primary)', background: 'transparent', flex: 'none',
            },
          }, String(count))
          return h('div', {
            key: key,
            style: {
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 10px 4px', cursor: 'default', userSelect: 'none',
              flex: 'none',
            },
          }, [
            h('span', {
              key: 't',
              style: {
                fontSize: 11, fontWeight: 600, letterSpacing: '.08em', whiteSpace: 'nowrap',
                color: 'var(--dsw-alias-brand-primary)',
              },
            }, label),
            h('span', { key: 'l', style: { flex: '1 1 auto', height: 1, background: 'var(--dsw-alias-border-l1)', borderRadius: 1 } }),
            badge,
          ])
        }
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
            rows.push(secHeader('sec-presets', tr('fontPresets'), presets.length))
            for (const k of presets) rows.push(fontItem(k))
          }
          if (locals.length > 0) {
            rows.push(secHeader('sec-locals', tr('fontLocals'), all.length))
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
            h('div', { style: { maxHeight: 280, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 1 } }, rows),
          ])
        }
        const fontPicker = function () {
          return h('div', { ref: fontRef, style: { position: 'relative' } }, [
            h('button', {
              ref: fontBtnRef,
              // 手势必须在同步段里：queryLocalFonts 只能由真实用户激活触发，异步等待之后就丢了
              // 顺带同步量按钮矩形定悬浮锚点（同一次 click，布局已稳定）
              onClick: function () { openFontMenu() },
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
              ref: fontMenuRef,
              style: {
                position: 'fixed', left: fontAnchor ? fontAnchor.left : 0, top: fontAnchor ? fontAnchor.top : 0, zIndex: 1000,
                background: 'var(--dsw-alias-bg-overlay)', border: '1px solid var(--dsw-alias-border-l1)',
                borderRadius: 8, width: 'max-content', minWidth: fontAnchor ? fontAnchor.minW : 240, maxWidth: 'calc(100vw - 48px)',
                boxSizing: 'border-box', overflow: 'hidden', padding: 4, boxShadow: menuShadow,
              },
            }, [fontMenu()]) : null,
          ])
        }

        // 主题 mini 芯片（组合 1）；委托画布主题带透光提示（按判定派生，不硬编码主题名）
        // 透光恒浅底深字（浅色一眼可辨）；system 跟宿主（浅白/深黑），选中 system 的外观效果等同停用（只留排印，颜色与外观接管全释放）
        const chip = function (t) {
          const isCur = t.name === st.theme
          const c = t.colors
          const translucent = t.name !== 'system' && delegatesBackground(t.name)
          const isSystem = t.name === 'system'
          const chipBg = translucent ? chipLightSurface : (isSystem ? (hostDark ? chipDarkSurface : chipLightSurface) : (c && c.background ? c.background : chipDarkSurface))
          const chipFg = translucent ? chipLightText : chipText(c)
          return h('button', {
            key: t.name,
            onClick: function () { props.setTheme(t.name); setUi(props.getState()) },
            title: translucent ? tr('translucentNote') : undefined,
            style: {
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: chipBg,
              color: chipFg,
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
              title: tr('authorPluginOpen') + (currentLang === 'zh' ? '：' : ': ') + p.repo,
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

        // ── 检查更新：新包入口件挂载位（头行右侧原位；宿主不可用时不渲染）──
        // 单按钮：openOn 'always'，点即查完开弹窗（无新版在弹窗内看“已是最新”，头行永不挂第二块）。
        const updMountRef = react.useRef ? react.useRef(null) : { current: null }
        const [logNotice, setLogNotice] = react.useState(false)
        react.useEffect(function () {
          const el = updMountRef.current
          if (!el) return undefined
          const entry = mountUpdateButton(el)
          return function () {
            try {
              const i = mountedUpdateEntries.indexOf(entry)
              if (i >= 0) mountedUpdateEntries.splice(i, 1)
            } catch (e) { /* 忽略 */ }
            try { entry && entry.unmount() } catch (e) { /* 忽略 */ }
          }
        }, [])
        // 新包入口件挂载容器：头行右侧原位；宿主不可用时 mountUpdateButton 回 null，不渲染。
        // data-update-entry 是产物级断言锚点（tests/update-panel.test.mjs），不是样式钩子。
        const updateButton = hostBridge
          ? h('span', { key: 'upd', ref: updMountRef, 'data-update-entry': 'button', style: { display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' } })
          : null


        // 升级弹窗与待重启横幅由入口件内部按需以 dialog 挂起（包内 mountUpdatePanel），面板不再自建。

        // ── 日志开关（排障用的小开关）──
        // 状态以宿主为准；首帧先按本地缓存渲染，对账回来再校正。开关本体归 dsh-log 管，
        // 这里只调它的 setLogSwitch，不自己写开关文件（否则会成第二份真源）。
        const [logOn, setLogOn] = react.useState(!!(clientLog && clientLog.logSwitch && clientLog.logSwitch.enabled))
        react.useEffect(function () {
          let alive = true
          Promise.resolve(props.reconcileLog()).then(function (res) {
            if (!alive || !res) return
            if (typeof res.enabled === 'boolean') setLogOn(res.enabled)
          }, function () { /* 读不到就维持本地缓存值 */ })
          return function () { alive = false }
        }, [])
        const flipLog = function () {
          const next = !logOn
          setLogOn(next)
          Promise.resolve(props.log.setLogSwitch(next)).then(function (res) {
            const ok = !!(res && res.ok)
            if (res && typeof res.enabled === 'boolean') setLogOn(res.enabled)
            else if (!ok) setLogOn(!next)
            try {
              props.log.log('info', 'log.switch.set', {
                enabled: ok ? !!next : logOn,
                ok: ok,
                reason: ok ? 'ok' : String((res && res.error) || 'unknown').slice(0, 40),
                pluginId: PLUGIN_ID,
              })
            } catch (e) { /* 忽略 */ }
            if (!ok) setLogNotice(true)
          }, function () { setLogOn(!next) })
        }

        return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 920 } }, [
          // 头行：标题 + 状态开关（一个状态一个控制）
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } }, [
            h('strong', null, '🎨 ' + tr('panelName')),
            h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 8 } }, [
              h('span', {
                key: 'log',
                onClick: flipLog,
                title: tr('logSwitchHint'),
                style: {
                  fontSize: 11, cursor: 'pointer', userSelect: 'none',
                  color: logOn ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-label-tertiary)',
                },
              }, tr('logSwitch') + ' ' + (logOn ? tr('logOn') : tr('logOff'))),
              h('span', { style: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' } }, 'v' + PALETTE_VERSION),
              updateButton,
              h('a', {
                href: 'https://github.com/FeatherHunter/dsh-opencode-palette',
                target: '_blank', rel: 'noopener noreferrer',
                title: tr('starTitle'),
                style: { display: 'inline-flex', cursor: 'pointer', lineHeight: 1, textDecoration: 'none' },
              }, h('svg', {
                width: 15, height: 15, viewBox: '0 0 24 24',
                style: { display: 'block' },
              }, h('path', {
                d: 'M12 2.5l2.92 6.14 6.58.6-4.93 4.4 1.42 6.46L12 16.77l-5.99 3.33 1.42-6.46-4.93-4.4 6.58-.6L12 2.5z',
                fill: '#FFC53D', stroke: '#B45309', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round',
              }))),
              // ISSUE 入口：彩色消息气泡（信息图标认不出「提需求」，气泡才读得出是反馈；浅底深底都可见的定值配色）
              h('a', {
                href: 'https://github.com/FeatherHunter/dsh-opencode-palette/issues',
                target: '_blank', rel: 'noopener noreferrer',
                title: tr('issueTitle'),
                style: { display: 'inline-flex', cursor: 'pointer' },
              }, h('svg', {
                width: 14, height: 14, viewBox: '0 0 24 24',
                style: { display: 'block' },
              }, h('path', {
                d: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
                fill: '#7DD3FC', stroke: '#0369A1', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
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
            trf('subtitle', { n: themeNames().length })),
          // 日志开关写失败时的本地提示（更新控制器已删，不再经由它中转）。
          logNotice
            ? h('div', {
                style: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' },
              }, tr('logSwitchFail'))
            : null,
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
              [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map(function (s) {
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
            h('span', { style: countStyle }, trf('themeCount', { n: themeNames().length })),
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
          // 日志器交给面板；更新入口件由面板头行按需挂载（宿主不可用时不渲染更新块）。
          log: clientLog,
          // 日志开关的初始状态：每次挂载都向宿主 fresh 对账，以宿主为准；
          // 启动快照只作首帧兜底（宿主不可用时 dsh-log 回本地缓存，不抛错）。
          // 不得复用启动时的旧 promise——写成功后它仍是旧值，重进会覆回（issue 42）。
          reconcileLog: function () {
            try { return clientLog.reconcileLogSwitch() } catch (e) { return Promise.resolve(null) }
          },
          // 本机字体清单：面板打开下拉时调（要用户手势），未打开下拉不读；失败恒回退预设
          collectFonts: collectFontCandidates,
          // 面板文案（测试/调试用，走同一份双语表）
          text: function (key, vars) { return vars ? trf(key, vars) : tr(key) },
          groups: function (mode) { return themeGroups(mode || 'dark') },
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
      // 设置页左侧导航直达入口（保留「设置 → 插件」内的原入口）
      // settings.section = 设置页左侧 section 列表（general=0 / models=10 / plugins=15 / agent-presets=20）
      let disposeSection = null
      // 入口 label 跟随语言：宿主只在注册时读一次 label（中文启动后切英文，入口仍中文），
      // 故语言变化时 dispose 旧注册再重注一次，让宿主重读新语言 label。幂等，失败静默。
      function registerEntries() {
        try { if (disposePanel) disposePanel() } catch (e) { /* 忽略 */ }
        try { if (disposeSection) disposeSection() } catch (e) { /* 忽略 */ }
        disposePanel = slots.inject(slotTarget, function () {
          return slots.register({
            name: slotTarget,
            id: 'opencode-palette',
            order: 30,
            label: function () { return tr('panelName') },
            inject: paletteApi,
          }, Panel)
        })
        disposeSection = null
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
      registerEntries()
      reregisterEntries = function () { registerEntries() }
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
        try { unmountUpdateButtons() } catch (e) { /* 忽略 */ }
        try { clientLog.flush() } catch (e) { /* 忽略 */ }
      }
    }, 'dsh-opencode-palette: styles')
  }
}
