// panel-render.test.mjs — 面板渲染回归测试
// 用 DSH app 的真实 React 把设置面板 renderToString，抓渲染期错误（如变量遮蔽/括号失衡）
// 前置：先 npm run build 产出 package/lib/client.js 再跑本测试
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInThisContext } from 'node:vm'
import { THEME_ZH, THEME_EN } from '../src/engine/zh-names.mjs'

// React 解析：优先本仓 devDependencies（自包含、不受宿主安装位变动影响），
// 回退旧版 DSH 的 app.asar.unpacked（DSH 2.0.x 起宿主侧已不再随包提供 react-dom，
// 硬编码该路径会让测试在换机/升级后直接崩，故解析失败时报明确修复指引）。
function loadReact() {
  const candidates = [
    createRequire(import.meta.url),
    createRequire('D:/0Tools/DSH Desktop/resources/app.asar.unpacked/node_modules/'),
  ]
  let missing = null
  for (const req of candidates) {
    try {
      return { React: req('react'), ReactDOMServer: req('react-dom/server') }
    } catch (e) { missing = e }
  }
  throw new Error('缺 react / react-dom（面板渲染测试前置）——先在本仓执行 `npm install` 装 devDependencies。原因：' + (missing && missing.message))
}

const { React, ReactDOMServer } = loadReact()

// 引流卡片固定指向的三个兄弟插件仓库（顺序即渲染顺序）
const AUTHOR_REPOS = ['dsh-mattpocock-skills-deck', 'dsh-prompt', 'dsh-im-companion']
// 出现次数统计（用于「不多不少、每行一次」断言）
function occurrences(hay, needle) {
  return hay.split(needle).length - 1
}

// 迷你 locale 服务 mock：对齐 @deepseek-ai/dsh-client-locale 的受用面
// （register / getLocale / subscribe），外加测试专用 setActive 触发语言切换
function makeLocale(initial) {
  const dicts = new Map()
  const listeners = new Set()
  let active = initial
  let revision = 0
  return {
    register(ns, localeDicts) {
      const locales = new Map()
      for (const loc of Object.keys(localeDicts)) locales.set(loc, localeDicts[loc])
      dicts.set(ns, locales)
      revision++
      for (const fn of listeners) fn()
      return () => {
        dicts.delete(ns)
        revision++
        for (const fn of listeners) fn()
      }
    },
    getLocale() {
      return { active, locales: [{ id: 'zh' }, { id: 'en' }], revision }
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    setActive(id) {
      if (id === active) return
      active = id
      revision++
      for (const fn of listeners) fn()
    },
    // 断言辅助：读注册进某命名空间的词典（zh/en 任选一侧）
    dictFor(ns, locale, key) {
      return dicts.get(ns)?.get(locale)?.[key]
    },
  }
}

// loadPanel(opts)：opts.lang = 回退用 document.documentElement.lang；
// opts.locale = locale 服务 mock（缺省走 DOM 回退路径）
function loadPanel(opts = {}) {
  const lang = opts.lang ?? 'en'
  const locale = opts.locale ?? null
  const code = readFileSync(new URL('../package/lib/client.js', import.meta.url), 'utf8')
  const loaded = []
  // 浏览器里 window === globalThis：把 window 指回 globalThis，别做一个「window.document 不存在」的假宿主
  // （等宽判定要经 window.document 建 canvas，假宿主会让它静默退化成「都非等宽」，测试就白测了）
  global.window = globalThis
  // 本机字体枚举（opts.queryLocalFonts 未给 → 模拟不支持该 API 的宿主：存在性判断要能兜住）
  if (opts.queryLocalFonts) globalThis.queryLocalFonts = opts.queryLocalFonts
  else delete globalThis.queryLocalFonts
  globalThis.__ModuleLoader__ = {
    load(entry) {
      loaded.push({
        id: entry.id,
        exports: entry.factory((id) => {
          if (id === 'react') return React
          throw new Error('unexpected require: ' + id)
        }),
      })
    },
  }
  // 本机已装字体（供宽度对比检测的 mock）：缺省只装 Consolas，对齐常见 Windows 环境
  const installedFonts = opts.installedFonts ?? ['Consolas']
  const bodyAttrs = {}
  if (opts.hostDark !== false) bodyAttrs['data-ds-dark-theme'] = ''
  const body = {
    // 宿主明暗 mock：hostDark=false → 浅色（无 data-ds-dark-theme）；缺省/true → 深色；
    // 属性可写（set/remove 同步进 store），供外观跟随断言
    hasAttribute: (k) => bodyAttrs[k] !== undefined,
    getAttribute: (k) => (bodyAttrs[k] !== undefined ? bodyAttrs[k] : null),
    setAttribute: (k, v) => { bodyAttrs[k] = String(v) },
    removeAttribute: (k) => { delete bodyAttrs[k] },
    appendChild: (el) => { el.parentNode = body },
    removeChild: (el) => { el.parentNode = null },
  }
  // canvas mock（等宽判定用）：族名含「真等宽」→ i 与 W 同宽；其余比例体（i 窄 W 宽）
  const canvas2d = {
    font: '',
    measureText(ch) {
      const mono = String(canvas2d.font).indexOf('\u771f\u7b49\u5bbd') >= 0
      return { width: mono ? 16 : (ch === 'W' ? 24 : 9) }
    },
  }
  global.document = {
    head: { appendChild: () => {} },
    body: body,
    // 量宽 mock：家族名在 installedFonts 内 → 宽度不同于「确定不存在」的家族 → 判定已装
    createElement: (tag) => {
      if (tag === 'canvas') return { getContext: (kind) => (kind === '2d' ? canvas2d : null) }
      const el = {
        dataset: {}, parentNode: null, textContent: '',
        style: { cssText: '', fontFamily: '' },
        getBoundingClientRect() {
          const fam = String(el.style.fontFamily || '').replace(/['"]/g, '')
          const unit = installedFonts.indexOf(fam) >= 0 ? 5.498 : 8.12
          return { width: unit * el.textContent.length }
        },
      }
      return el
    },
    // 文档根 mock：colorScheme 样式 + source 属性可写，供投影断言
    documentElement: {
      lang: lang,
      style: {
        colorScheme: '',
        removeProperty(k) { if (k === 'color-scheme') this.colorScheme = '' },
      },
      _attrs: {},
      hasAttribute(k) { return this._attrs[k] !== undefined },
      getAttribute(k) { return this._attrs[k] !== undefined ? this._attrs[k] : null },
      setAttribute(k, v) { this._attrs[k] = String(v) },
      removeAttribute(k) { delete this._attrs[k] },
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  global.__docEl = global.document.documentElement
  // 注：Node 22 的 navigator 只读；getLang 以 document.documentElement.lang 为主信号源
  // opts.savedTheme 预置存量主题（覆盖缺省 opencode），用于启动路径断言
  const savedState = opts.savedTheme
    ? { enabled: true, theme: opts.savedTheme, mode: 'mono', size: 13, fontKey: 'JetBrains Mono', followAppearance: true }
    : null
  global.localStorage = savedState
    ? { getItem: () => JSON.stringify(savedState), setItem: () => {} }
    : opts.disabled
    ? { getItem: () => JSON.stringify({ enabled: false, theme: 'opencode', mode: 'mono', size: 13, fontKey: 'JetBrains Mono' }), setItem: () => {} }
    : opts.fontKey
      ? { getItem: () => JSON.stringify({ enabled: true, theme: 'opencode', mode: 'mono', size: 13, fontKey: opts.fontKey }), setItem: () => {} }
      : undefined
  // 扫描门禁：eval 语法即高危（DANGEROUS_DYNAMIC_EXECUTION）；在当前上下文执行同一产物字节，语义与直接求值一致（仅测试）。
  runInThisContext(code, { filename: 'package/lib/client.js' })
  const p = loaded[0].exports
  let panelCmp = null
  let panelProps = null
  // 入口注册记录：每次 register（含语言切换触发的重注册）都留一份 desc，供入口 label 跟随断言
  const registrations = []
  const slots = {
    inject: (slot, cb) => { cb(); return () => {} },
    register: (desc, cmp) => { registrations.push(desc); panelCmp = cmp; panelProps = desc.inject(); return () => {} },
  }
  // theme mock：官方 setTheme 可用时记录调用并翻转 mock 偏好（模拟宿主）；
  // opts.noOfficialSetTheme 模拟旧宿主走投影降级；opts.throwingSetTheme 模拟 facade 语义不符抛错；
  // opts.stuckPref 让偏好恒为某值（模拟异步宿主未落地），触发 verify 失败走降级
  const themeCalls = []
  let mockPref = opts.stuckPref !== undefined ? opts.stuckPref : (opts.hostDark !== false ? 'dark' : 'light')
  const themeSvc = { overrideTokens: () => () => {}, getTheme: () => ({ preference: mockPref }) }
  if (opts.throwingSetTheme) themeSvc.setTheme = () => { throw new Error('facade mismatch') }
  else if (!opts.noOfficialSetTheme) themeSvc.setTheme = (id) => { themeCalls.push(id); if (opts.stuckPref === undefined) mockPref = id }
  const ctx = {
    get: (k) => {
      if (k === 'theme') return themeSvc
      if (k === 'slots') return slots
      if (k === 'locale' && locale) return locale
      return undefined
    },
    effect: (fn) => { fn() },
  }
  p.apply(ctx)
  assert.ok(panelCmp, '面板组件未注册')
  const html = ReactDOMServer.renderToString(React.createElement(panelCmp, panelProps))
  return { html, panelCmp, panelProps, locale, text: panelProps.text, collectFonts: panelProps.collectFonts, bodyAttrs, themeCalls, docEl: global.document.documentElement, registrations }
}

test('面板渲染（DOM 回退·英文）：不抛错，输出英文品牌标题与主题芯片', () => {
  const { html } = loadPanel({ lang: 'en' })
  assert.ok(html.includes('OpenCode Palette'), '缺英文品牌标题')
  // #67：英文界面显示官方名，不再 slug 裸奔（slug 只在两表都缺键时兜底）
  assert.ok(html.includes('Tokyo Night'), '英文芯片应用官方名（tokyonight）')
  assert.ok(html.includes('Shades of Purple'), '英文芯片应用官方名（多词官方名不得压成 slug）')
  assert.ok(html.includes('Rosé Pine'), '英文芯片应用官方名（重音拼写按官方形态）')
  assert.ok(!html.includes('tokyonight'), '英文界面不应再渲染内部 id（slug 裸奔）')
  assert.ok(!html.includes('shadesofpurple'), '英文界面不应再渲染内部 id（shadesofpurple）')
  assert.ok(html.includes('system (follow system)'), '缺 system 芯片')
  assert.ok(!html.includes('东京之夜'), 'DOM 回退英文界面不应出现中文主题名')
})

test('面板渲染（DOM 回退·中文）：输出 OpenCode调色板 与中文组名', () => {
  const { html } = loadPanel({ lang: 'zh-CN' })
  assert.ok(html.includes('OpenCode调色板'), '缺中文品牌标题（opencode 与调色板之间无空格）')
  assert.ok(html.includes('暖橙'), '缺中文色系组名')
  assert.ok(html.includes('system（跟随系统）'), '缺 system 中文标签')
  assert.ok(html.includes('东京之夜'), '缺 tokyonight 中文名')
  assert.ok(html.includes('黑客帝国'), '缺 matrix 中文名')
  assert.ok(html.includes('德古拉'), '缺 dracula 中文名')
  assert.ok(html.includes('玫瑰松林'), '缺 rosepine 中文名（键曾是 rose-pine，查不到就退回英文 id）')
})

test('面板渲染（locale 服务·英文）：整体英文，不出现中文', () => {
  const locale = makeLocale('en')
  const { html } = loadPanel({ locale })
  assert.ok(html.includes('OpenCode Palette'), '缺英文品牌标题')
  assert.ok(html.includes('Typography'), '缺「字体字号」英文段标')
  assert.ok(html.includes('Themes'), '缺「选择主题」英文段标')
  assert.ok(html.includes('Warm'), '缺暖橙组英译')
  assert.ok(html.includes('Enabled'), '缺已启用英译')
  assert.ok(!html.includes('暖橙'), '英文界面不应显示中文组名')
  assert.ok(!html.includes('东京之夜'), '英文界面不应显示中文主题名')
  assert.ok(!html.includes('已启用'), '英文界面不应显示中文状态')
})

test('面板渲染（locale 服务·中文）：输出中文', () => {
  const locale = makeLocale('zh')
  const { html } = loadPanel({ locale })
  assert.ok(html.includes('OpenCode调色板'), '缺中文品牌标题')
  assert.ok(html.includes('暖橙'), '缺中文色系组名')
  assert.ok(html.includes('东京之夜'), '缺 tokyonight 中文名')
})

test('locale 服务切换实时生效：切到英文后重渲染即全英文', () => {
  const locale = makeLocale('zh')
  const { html: zhHtml, panelCmp, panelProps } = loadPanel({ locale })
  assert.ok(zhHtml.includes('OpenCode调色板'), '初始中文标题缺失')
  assert.ok(zhHtml.includes('暖橙'), '初始中文组名缺失')
  locale.setActive('en') // 模拟 DSH 设置 → General → Language 切到 English
  const enHtml = ReactDOMServer.renderToString(React.createElement(panelCmp, panelProps))
  assert.ok(enHtml.includes('OpenCode Palette'), '切换后缺英文标题')
  assert.ok(enHtml.includes('Warm'), '切换后缺暖橙英译')
  assert.ok(enHtml.includes('Tokyo Night'), '切换后主题名应实时换成英文官方名（#67）')
  assert.ok(!enHtml.includes('OpenCode调色板'), '切换后不应残留中文标题')
  assert.ok(!enHtml.includes('暖橙'), '切换后不应残留中文组名')
  assert.ok(!enHtml.includes('东京之夜'), '切换后不应残留中文主题名')
})

test('头行 star/issue 入口 title 跟随语言（英文无中文残留）', () => {
  const locale = makeLocale('en')
  const { html } = loadPanel({ locale })
  assert.ok(html.includes('title="Star this project on GitHub"'), '缺 star 英文气泡')
  assert.ok(html.includes('title="Report bugs or request features in Issues"'), '缺 issue 英文气泡')
  assert.ok(!html.includes('夜空中最亮'), '英文界面不应出现中文求星气泡')
  assert.ok(!html.includes('都可以提ISSUE'), '英文界面不应出现中文 issue 气泡')
  assert.equal(locale.dictFor('opencode-palette', 'zh', 'starTitle'), '你的 ⭐是我夜空中最亮的星 🌹')
  assert.equal(locale.dictFor('opencode-palette', 'en', 'starTitle'), 'Star this project on GitHub')
  assert.equal(locale.dictFor('opencode-palette', 'zh', 'issueTitle'), '任何功能需求、故障、建议、意见都可以提ISSUE')
  assert.equal(locale.dictFor('opencode-palette', 'en', 'issueTitle'), 'Report bugs or request features in Issues')
})

test('star/issue title 跟随语言切换实时改', () => {
  const locale = makeLocale('zh')
  const { html: zhHtml, panelCmp, panelProps } = loadPanel({ locale })
  assert.ok(zhHtml.includes('夜空中最亮'), '初始中文求星气泡缺失')
  assert.ok(zhHtml.includes('都可以提ISSUE'), '初始中文 issue 气泡缺失')
  locale.setActive('en')
  const enHtml = ReactDOMServer.renderToString(React.createElement(panelCmp, panelProps))
  assert.ok(enHtml.includes('Star this project on GitHub'), '切换后缺 star 英文气泡')
  assert.ok(enHtml.includes('Report bugs or request features in Issues'), '切换后缺 issue 英文气泡')
  assert.ok(!enHtml.includes('夜空中最亮'), '切换后不应残留中文求星气泡')
  assert.ok(!enHtml.includes('都可以提ISSUE'), '切换后不应残留中文 issue 气泡')
})

test('入口 label 跟随语言切换：重注册后宿主读到新语言', () => {
  const locale = makeLocale('zh')
  const { registrations } = loadPanel({ locale })
  assert.equal(registrations.length, 2, '初始应注册两个入口（tab＋section）')
  assert.ok(registrations.every((d) => d.label() === 'OpenCode调色板'), '初始入口 label 应为中文')
  locale.setActive('en')
  assert.equal(registrations.length, 4, '语言切换后应重注册两个入口')
  assert.ok(registrations.slice(2).every((d) => d.label() === 'OpenCode Palette'), '重注册后入口 label 应为英文')
  locale.setActive('zh')
  assert.equal(registrations.length, 6, '切回中文后应再次重注册')
  assert.ok(registrations.slice(4).every((d) => d.label() === 'OpenCode调色板'), '切回后入口 label 应为中文')
})

test('引流卡片外链 title 冒号跟随语言（英文半角）', () => {
  const locale = makeLocale('en')
  const { html } = loadPanel({ locale })
  assert.ok(html.includes('Open in new window: dsh-prompt'), '英文冒号应为半角 ": "')
  assert.ok(!html.includes('Open in new window：'), '英文不应出现全角冒号')
})

test('面板双语表已注册进 locale 服务（opencode-palette 命名空间）', () => {
  const locale = makeLocale('en')
  loadPanel({ locale })
  assert.equal(locale.dictFor('opencode-palette', 'zh', 'panelName'), 'OpenCode调色板')
  assert.equal(locale.dictFor('opencode-palette', 'en', 'panelName'), 'OpenCode Palette')
  assert.equal(locale.dictFor('opencode-palette', 'zh', 'group.warm'), '暖橙')
  assert.equal(locale.dictFor('opencode-palette', 'en', 'group.warm'), 'Warm')
})
test('浅色宿主已停用：无深色硬编码残留，选中态走 DSH 语义 token', () => {
  const { html } = loadPanel({ lang: 'zh-CN', disabled: true, hostDark: false })
  assert.ok(html.includes('已停用'), '应渲染停用态')
  assert.ok(!html.includes('#333338'), '停用开关底色须浅色适配')
  assert.ok(!html.includes('#8b8b95'), '停用开关钮色须浅色适配')
  assert.ok(!html.includes('rgba(255,255,255,0.14)'), '分段选中须浅色适配')
  assert.ok(!html.includes('1px solid #555'), '芯片兜底边框须浅色适配')
  assert.ok(!html.includes('background:#555'), '圆点兜底色须浅色适配')
  assert.ok(html.includes('var(--dsw-alias-interactive-bg-active)'), '分段选中走语义 token')
  assert.ok(html.includes('background:#D4D4D8'), '停用开关底色浅色可见')
  assert.ok(html.includes('background:#FFFFFF'), '停用开关钮色浅色可见')
  assert.ok(html.includes('0 1px 3px rgba(0,0,0,0.25)'), '预览芯片浅色分离阴影')
  const translucent = chipSegment(html, '透光橙')
  assert.ok(translucent.includes('background:#FFFFFF'), '透光芯片恒浅底（浅色一眼可辨，不随宿主走）')
  assert.ok(translucent.includes('color:#1A1A1A'), '透光芯片恒深字，对比度正常')
  assert.ok(translucent.includes('title="透光主题'), '委托画布芯片应带透光提示')
  const opaque = chipSegment(html, 'opencode')
  assert.ok(!opaque.includes('title='), '自持画布芯片不应带透光提示')
})

// 取某主题芯片 button 片段（断言其行内样式用）。
// 只在 <button>…</button> 段内认 label：页面别处也有同名子串（星标链接 URL 里就有 opencode），
// 按 indexOf 取会静默测到别的按钮上。
function chipSegment(html, label) {
  const re = /<button[\s\S]*?<\/button>/g
  let m
  while ((m = re.exec(html))) {
    if (m[0].includes(label)) return m[0]
  }
  assert.ok(false, '缺芯片：' + label)
}

test('深色回退（未知宿主）：深色硬编码原样保留', () => {
  const { html } = loadPanel({ lang: 'zh-CN', disabled: true })
  assert.ok(html.includes('已停用'), '应渲染停用态')
  assert.ok(html.includes('#333338'), '停用开关底色保持深色')
  assert.ok(html.includes('#8b8b95'), '停用开关钮色保持深色')
  assert.ok(html.includes('rgba(255,255,255,0.14)'), '分段选中保持深色')
  assert.ok(html.includes('1px solid #555'), 'system 芯片兜底边框保持深色')
  assert.ok(!html.includes('0 1px 3px rgba(0,0,0,0.25)'), '深色不加分离阴影')
  const translucent = chipSegment(html, '透光橙')
  assert.ok(translucent.includes('background:#FFFFFF'), '深色宿主下透光芯片仍恒浅底')
  assert.ok(translucent.includes('color:#1A1A1A'), '深色宿主下透光芯片仍恒深字')
})

test('芯片名对账（#67 对抗）：中英两侧 38 款都走名表，内部 id 不作显示名', () => {
  const cases = [
    ['zh', loadPanel({ lang: 'zh-CN' }).html, THEME_ZH],
    ['en', loadPanel({ lang: 'en' }).html, THEME_EN],
  ]
  for (const [lang, rawHtml, table] of cases) {
    // React SSR 把文本里的撇号转义成 &#x27;（SynthWave '84），比对前还原
    const html = rawHtml.replace(/&#x27;/g, "'")
    const missing = Object.keys(table).filter((k) => k !== 'system' && !html.includes(table[k]))
    assert.deepEqual(missing, [], lang + ' 面板缺名表显示名：' + missing.join(', '))
    const leaked = Object.keys(table).filter((k) => k !== 'opencode' && html.includes('>' + k + '<'))
    assert.deepEqual(leaked, [], lang + ' 面板仍把内部 id 当显示名：' + leaked.join(', '))
  }
})

test('透光提示：深色英文界面下委托芯片带英文提示，自持芯片无', () => {
  const { html } = loadPanel({ lang: 'en', disabled: true })
  const translucent = chipSegment(html, 'Lucent Orange')
  assert.ok(translucent.includes('title="Translucent theme'), '委托画布芯片应带英文透光提示')
  const opaque = chipSegment(html, 'Tokyo Night')
  assert.ok(!opaque.includes('title='), '自持画布芯片不应带透光提示')
})

test('构建产物：英文官方名表与搜索索引都在产物里（#67）', () => {
  const code = readFileSync(new URL('../package/lib/client.js', import.meta.url), 'utf8')
  assert.ok(code.includes('Tokyo Night'), '产物缺 THEME_EN 官方名表（未重建？）')
  assert.ok(code.includes('Shades of Purple'), '产物缺多词官方名')
  assert.ok(code.includes('THEME_EN[name]'), '产物显示名未取英文官方名（slug 兜底路径缺失）')
  assert.ok(code.includes('function themeSearchText'), '产物缺三源搜索索引（id/中文名/英文官方名）')
  assert.ok(code.includes('themeSearchText(t.name)'), '产物搜索未走三源索引')
})

test('构建产物：旧中文名别名进搜索索引、未回退成显示名（#66）', () => {
  const code = readFileSync(new URL('../package/lib/client.js', import.meta.url), 'utf8')
  for (const old of ['日光浴', '复古凹槽', '鮎', '纸墨']) {
    assert.ok(code.includes(old), '产物缺旧名别名（未重建？）：' + old)
  }
  assert.ok(code.includes('THEME_ZH_LEGACY'), '产物搜索索引未接旧名别名表')
  assert.ok(code.includes('const THEME_ZH_LEGACY = {'), '别名表应随产物发出（不是只在源码里）')
})

test('构建产物：下拉与菜单浅色分支及宿主跟随逻辑存在', () => {
  const code = readFileSync(new URL('../package/lib/client.js', import.meta.url), 'utf8')
  assert.ok(code.includes('var(--dsw-alias-interactive-bg-hover)'), '下拉选中浅色分支缺失')
  assert.ok(code.includes('0 8px 24px rgba(0,0,0,0.18)'), '菜单浅色阴影缺失')
  assert.ok(code.includes('isHostDark'), '宿主明暗信号缺失')
  assert.ok(code.includes('data-ds-dark-theme'), '明暗跟随订阅缺失')
})

test("\u9762\u677f\u5e95\u90e8\u5c0f\u5b57\u663e\u793a\u5f53\u524d\u7248\u672c\u53f7", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
  const { html } = loadPanel({ lang: "zh-CN" })
  assert.ok(html.includes("v" + pkg.version), "\u7f3a\u7248\u672c\u53f7\u5c0f\u5b57 v" + pkg.version)
  assert.ok(html.includes("https://github.com/FeatherHunter/dsh-opencode-palette\""), "\u7f3a\u661f\u6807\u94fe\u63a5")
  assert.ok(html.includes("/issues\""), "\u7f3aISSUE\u94fe\u63a5")
  assert.ok(html.indexOf("\u591c\u7a7a\u4e2d\u6700\u4eae") >= 0, "\u7f3a\u661f\u6807hover")
  assert.ok(html.includes("ISSUE"), "\u7f3aISSUE hover")
})

test('星标 hover 文案尾部带 🌹', () => {
  const { html } = loadPanel({ lang: 'zh-CN' })
  assert.ok(html.includes('你的 ⭐是我夜空中最亮的星 🌹'), '星标 hover 缺尾部 🌹')
})

test('ISSUE 入口是消息气泡图标（不再是匿名信息图标）', () => {
  const { html } = loadPanel({ lang: 'zh-CN' })
  const i = html.indexOf('dsh-opencode-palette/issues')
  assert.ok(i >= 0, '缺 ISSUE 链接')
  const seg = html.slice(i, i + 900)
  assert.ok(seg.indexOf('M21 11.5a8.38') >= 0, 'ISSUE 图标未换成消息气泡路径')
  assert.ok(seg.indexOf('任何功能需求') >= 0, 'ISSUE hover 文案被改动')
  assert.ok(!html.includes('cx="12" cy="12" r="10"'), '旧 ⓘ 圆圈图标仍在')
  assert.ok(!html.includes('<circle'), '不该再有任何 circle 图标（ISSUE 图标与主题圆点都已改）')
})

test('底部引流卡片（中文）：标题 + 3 行兄弟插件 + 外链图标', () => {
  const { html } = loadPanel({ lang: 'zh-CN' })
  assert.ok(html.includes('作者其他插件'), '缺引流卡片标题')
  assert.ok(html.includes('装好即自带 25 个工程/效率技能，右侧面板直接调用'), '缺 skills-deck 文案')
  assert.ok(html.includes('保存常用 prompt 预设，一键注入开发任务'), '缺 prompt 定稿文案（#59：去行话删空话）')
  assert.ok(html.includes('dsh-im 的增强插件，在原插件基础上提供了超过你想象力的能力'), '缺 im-companion 文案')
  for (const repo of AUTHOR_REPOS) {
    const url = 'https://github.com/FeatherHunter/' + repo
    assert.equal(occurrences(html, url), 1, '引流链接应恰好出现一次：' + repo)
  }
  // 图标确实渲染了：宫格标题图标 + 3 个外链箭头；锚点属性齐备
  assert.equal(occurrences(html, 'polyline points="15 3 21 3 21 9"'), 3, '外链小图标应为 3 个')
  assert.equal(occurrences(html, 'rect x="3" y="3"'), 1, '缺卡片标题前的宫格图标')
  assert.equal(occurrences(html, 'target="_blank"'), occurrences(html, 'rel="noopener noreferrer"'), '外链锚点属性不成对')
})

test('底部引流卡片（英文）：整体英文，不出现中文引流文案', () => {
  const locale = makeLocale('en')
  const { html } = loadPanel({ locale })
  assert.ok(html.includes('More from the author'), '缺英文卡片标题')
  assert.ok(html.includes('25 engineering skills built in'), '缺 skills-deck 英文文案')
  assert.ok(html.includes('Save your prompt presets'), '缺 prompt 英文文案')
  assert.ok(html.includes("Supercharges dsh-im"), '缺 im-companion 英文文案')
  assert.ok(!html.includes('作者其他插件'), '英文界面不应出现中文卡片标题')
  assert.ok(!html.includes('装好即自带'), '英文界面不应出现中文引流文案')
  assert.ok(!html.includes('不再繁琐'), '英文界面不应出现中文引流文案')
  assert.equal(locale.dictFor('opencode-palette', 'zh', 'authorPlugins'), '作者其他插件')
  assert.equal(locale.dictFor('opencode-palette', 'en', 'authorPlugins'), 'More from the author')
})

test('底部引流卡片：跟随语言切换实时改文案', () => {
  const locale = makeLocale('zh')
  const { html: zhHtml, panelCmp, panelProps } = loadPanel({ locale })
  assert.ok(zhHtml.includes('作者其他插件'), '初始中文卡片标题缺失')
  locale.setActive('en')
  const enHtml = ReactDOMServer.renderToString(React.createElement(panelCmp, panelProps))
  assert.ok(enHtml.includes('More from the author'), '切换后缺英文卡片标题')
  assert.ok(!enHtml.includes('作者其他插件'), '切换后不应残留中文卡片标题')
})

test('底部引流卡片（浅色宿主）：只用语义 token，无深色硬编码残留', () => {
  const { html } = loadPanel({ lang: 'zh-CN', disabled: true, hostDark: false })
  const title = html.indexOf('作者其他插件')
  assert.ok(title >= 0, '缺引流卡片标题')
  // 卡片开标签在标题之前，按「最近的 border-radius:10px」回溯定位，末行取到卡片闭标签
  const style = html.lastIndexOf('border-radius:10px', title)
  assert.ok(style > 0, '未找到引流卡片开标签（卡片容器结构变了）')
  const start = html.lastIndexOf('<div', style)
  const seg = html.slice(start, html.indexOf('</div></div>', title))
  assert.ok(seg.includes('var(--dsw-alias-border-l1)'), '卡片描边未走语义 token')
  assert.ok(seg.includes('var(--dsw-alias-label-primary)'), '卡片插件名未走语义字色')
  assert.ok(seg.includes('var(--dsw-alias-label-secondary)'), '卡片描述未走语义字色')
  assert.ok(seg.includes('var(--dsw-alias-label-tertiary)'), '外链图标未走语义字色')
  assert.ok(!/#555/.test(seg), '卡片内不应出现深色硬编码兜底色')
  assert.ok(!/#[0-9a-fA-F]{6}/.test(seg), '卡片内不应有任何硬编码 hex 颜色')
})

test('构建产物：新增预设与宽度对比字体检测都在产物里', () => {
  const code = readFileSync(new URL('../package/lib/client.js', import.meta.url), 'utf8')
  assert.ok(code.includes('Maple Mono NF CN'), '产物缺新增预设 Maple Mono NF CN')
  assert.ok(code.includes('__dsh_palette_absent_font__'), '产物缺宽度对比检测（document.fonts.check 判不出未装）')
  assert.ok(!code.includes("document.fonts.check('12px"), '旧的 check() 判定应已移除（说明注释里提到该 API 不算）')
  // 下拉菜单默认折叠、不进 SSR 输出，故菜单项文案（本地 / 本机未装）由引擎单测覆盖判定逻辑
  const { html } = loadPanel({ lang: 'zh-CN' })
  assert.ok(!html.includes('(本机未装)'), '折叠态不应出现菜单项后缀')
})

// ── #11 本机字体枚举进下拉 ──

test('代码字体按钮：显示选中族名本身，并按该字体渲染（自定义值不再显示成 JetBrains Mono）', () => {
  // 缺省选中 JetBrains Mono：按钮标签就是它，且用它自己的栈预览
  // （React SSR 会把行内样式里的单引号转义成 &#x27;，断言按转义后的形态写）
  const d = loadPanel({ lang: 'zh-CN' })
  assert.ok(d.html.includes('font-family:&#x27;JetBrains Mono&#x27;,&#x27;Fira Code&#x27;'), '缺省按钮未用预设栈预览字体')
  // 历史/本机自定义族名：按钮显示的就是这个名字（不再被换成 JetBrains Mono），预览也换成该字体
  const { html } = loadPanel({ lang: 'zh-CN', fontKey: 'Hack Nerd Font' })
  assert.ok(html.includes('Hack Nerd Font'), '按钮未显示用户填写的族名（静默降级未修）')
  assert.ok(
    html.includes('font-family:&#x27;Hack Nerd Font&#x27;,&#x27;JetBrains Mono&#x27;,&#x27;Fira Code&#x27;'),
    '按钮未按用户字体预览（自定义族名应夹在默认栈最前）'
  )
  assert.ok(!html.includes('>JetBrains Mono<'), '自定义族名不应被显示成 JetBrains Mono')
})

test('本机字体枚举：读得到清单时，候选含去重后的本机字体（非预设也在），并给出计数提示', async () => {
  const fonts = [
    { family: 'Hack Nerd Font' }, { family: 'Hack Nerd Font', style: 'Bold' },
    { family: '思源等宽' }, { family: 'Arial' },
  ]
  const { panelProps } = loadPanel({ lang: 'zh-CN', queryLocalFonts: () => Promise.resolve(fonts) })
  const cache = await panelProps.collectFonts()
  assert.equal(cache.ok, true, '枚举应判成功')
  assert.equal(cache.count, 3, '同族多份记录应去重成 3 款')
  const keys = cache.candidates.map((k) => k.key)
  for (const f of ['Hack Nerd Font', '思源等宽', 'Arial']) assert.ok(keys.includes(f), '候选缺本机字体: ' + f)
  assert.equal(keys.indexOf('Hack Nerd Font'), keys.lastIndexOf('Hack Nerd Font'), '本机字体不得重复列出')
  // 预设仍全部在列表里（置顶分区）
  assert.deepEqual(cache.candidates.filter((k) => k.isPreset).map((k) => k.key), ['JetBrains Mono', 'Cascadia Code', 'Fira Code', 'IBM Plex Mono', 'Maple Mono NF CN', 'SF Mono', 'Consolas'])
  // 提示文案：中英各一份
  assert.equal(panelProps.text('fontLoadedCount', { n: 3 }), '已读取本机 3 款字体')
})

test('本机字体枚举：读不到清单时退回预设列表并给提示（不出现空下拉、不抛错）', async () => {
  // 场景一：宿主不支持该 API（Firefox / 非安全上下文）
  const unsupported = loadPanel({ lang: 'zh-CN' })
  const a = await unsupported.panelProps.collectFonts()
  assert.equal(a.ok, false, '无 API 应判失败')
  assert.equal(a.reason, 'unavailable', '原因应为不支持')
  assert.deepEqual(a.candidates.map((k) => k.key), ['JetBrains Mono', 'Cascadia Code', 'Fira Code', 'IBM Plex Mono', 'Maple Mono NF CN', 'SF Mono', 'Consolas'], '回退态必须是 6+1 预设列表')
  assert.ok(a.candidates.every((k) => k.isPreset && !k.isLocal), '回退态不含本机分区')
  assert.equal(unsupported.panelProps.text('fontScanUnsupported'), '当前环境不支持读取本机字体清单，先列出常用预设')

  // 场景二：拒绝授权（NotAllowedError）
  const denied = loadPanel({ lang: 'en', queryLocalFonts: () => { const e = new Error('no'); e.name = 'NotAllowedError'; throw e } })
  const b = await denied.panelProps.collectFonts()
  assert.equal(b.reason, 'denied', '拒授权应单独成一种原因')
  assert.equal(denied.panelProps.text('fontScanDenied'), 'Font access was denied — allow it in the browser address bar, then retry; showing the common presets')

  // 场景三：授权了但清单为空（含被自动拒绝返回空数组）
  const empty = loadPanel({ lang: 'en', queryLocalFonts: () => Promise.resolve([]) })
  const c = await empty.panelProps.collectFonts()
  assert.equal(c.reason, 'empty', '空清单应报「没读到」而不是「没有字体」')
  assert.equal(c.candidates.length, 7, '空清单也必须回退成预设列表')
  assert.equal(empty.panelProps.text('fontScanEmpty'), 'The font list came back empty — showing the common presets')
})

test('本机字体枚举：读到的字体会进「本机字体」分区，等宽置顶但比例项同样可选', async () => {
  const fonts = [{ family: '比例体' }, { family: '真等宽体' }]
  const { collectFonts } = loadPanel({ lang: 'zh-CN', queryLocalFonts: () => Promise.resolve(fonts) })
  const cache = await collectFonts()
  const locals = cache.candidates.filter((k) => !k.isPreset)
  // 等宽置顶（canvas 实测，不靠名字猜）；比例项不得被丢掉（本单要的是任意系统字体）
  assert.deepEqual(locals.map((k) => k.key), ['真等宽体', '比例体'], '等宽置顶且非等宽仍列出')
  assert.equal(locals[0].ok, true, '枚举到的字体恒判可用')
  assert.equal(locals[1].ok, true, '非等宽字体也判可用（可选用）')
})

test('字体分组标题：不用“·”拼接，文本走主题色 + 数量徽章 + 分割线', () => {
  const code = readFileSync(new URL('../runtime/client.mjs', import.meta.url), 'utf8')
  assert.ok(code.includes('secHeader('), '缺分组标题组件 secHeader')
  assert.ok(!code.includes("tr('fontLocals') + ' · '"), '旧“本机字体 · N”拼接仍在')
  assert.ok(code.includes('var(--dsw-alias-brand-primary)'), '分组标题未用主题色')
  assert.ok(code.includes("secHeader('sec-presets'"), '常用预设未走新分组标题')
  assert.ok(code.includes("secHeader('sec-locals'"), '本机字体未走新分组标题')
})

test('2.0.7 头行带日志开关（默认关）与落点提示', () => {
  const { html } = loadPanel({ lang: 'zh-CN' })
  assert.ok(html.includes('日志 关'), '缺日志开关（默认应为关）')
  assert.ok(html.includes('logs/dsh-opencode-palette'), '缺日志落点提示（hover 文案）')
  // 开关走 dsh-log 的 setLogSwitch，面板自己不写开关文件
  const code = readFileSync(new URL('../runtime/client.mjs', import.meta.url), 'utf8')
  assert.ok(code.includes('setLogSwitch'), '面板没有调日志包的开关接口')
  assert.ok(!code.includes('log-switch-dsh-opencode-palette.json'), '面板不得自己写开关文件（会成第二份真源）')
})

test('芯片预览锁深色基线（issue 48）：浅色宿主下仍展示深色（透光恒浅底除外）', () => {
  const { html } = loadPanel({ lang: 'zh-CN', hostDark: false })
  assert.ok(html.includes('#0A0A0A'), '浅色宿主下 opencode 芯片应展示深色底 #0A0A0A')
  assert.ok(!html.includes('#3B7DD8'), '浅色宿主下不应出现浅色变体主色 #3B7DD8')
  assert.ok(html.includes('#EEEEEE'), '不透明芯片文字应为深色基线 #EEEEEE')
  const translucentChip = chipSegment(html, '透光橙')
  assert.ok(translucentChip.includes('background:#FFFFFF'), '透光芯片恒浅底，与宿主深浅无关')
  assert.ok(translucentChip.includes('color:#1A1A1A'), '透光芯片恒深字')
  assert.ok(!html.includes('选中即切换 DSH 明暗'), '跟随开关已下线，不应再渲染开关文案')
  assert.ok(!html.includes('Match DSH appearance'), '跟随开关已下线，不应再渲染英文开关文案')
})

test('选中即切换宿主明暗（issue 48）：官方写入口三态', () => {
  const { panelProps, themeCalls, bodyAttrs } = loadPanel({ lang: 'zh-CN', hostDark: false })
  // 启动即按已存主题对齐一次（缺省 opencode 深色 → dark）
  assert.deepEqual(themeCalls, ['dark'], '启动应调官方 setTheme(dark)')
  panelProps.setTheme('lucent-orng')
  assert.deepEqual(themeCalls, ['dark', 'light'], '选透光橙应调 light')
  panelProps.setTheme('matrix')
  assert.deepEqual(themeCalls, ['dark', 'light', 'dark'], '选深色主题应调 dark')
  panelProps.setTheme('system')
  assert.deepEqual(themeCalls, ['dark', 'light', 'dark', 'system'], '选跟随系统应调 system（跟随 OS）')
  assert.equal('data-ds-dark-theme' in bodyAttrs, false, '官方路径下不动 body（等宿主快照应用）')
})

test('旧宿主降级（issue 48）：无官方 API 时走文档投影', () => {
  const { panelProps, themeCalls, bodyAttrs, docEl } = loadPanel({ lang: 'zh-CN', hostDark: false, noOfficialSetTheme: true })
  assert.deepEqual(themeCalls, [], '旧宿主无官方调用')
  assert.ok('data-ds-dark-theme' in bodyAttrs, '启动投影深色到 body')
  assert.equal(docEl.style.colorScheme, 'dark', '投影 root color-scheme')
  assert.equal(docEl.getAttribute('data-ds-theme-source'), 'dark', '投影 source 属性')
  panelProps.setTheme('lucent-orng')
  assert.equal('data-ds-dark-theme' in bodyAttrs, false, '透光投影浅色')
  assert.equal(docEl.style.colorScheme, 'light', '投影 light')
  panelProps.setTheme('system')
  assert.equal('data-ds-dark-theme' in bodyAttrs, false, 'system 释放回初始浅色')
  assert.equal(docEl.style.colorScheme, '', 'color-scheme 恢复空')
  assert.equal(docEl.getAttribute('data-ds-theme-source'), null, 'source 属性恢复移除')
})

test('官方抛错即降级（issue 48）：facade 不符不抛到面板', () => {
  const { panelProps, bodyAttrs, docEl } = loadPanel({ lang: 'zh-CN', hostDark: false, throwingSetTheme: true })
  panelProps.setTheme('matrix')
  assert.ok('data-ds-dark-theme' in bodyAttrs, '抛错后应走投影兜底')
  assert.equal(docEl.style.colorScheme, 'dark', '兜底投影应完整')
})

test('无跟随开关：恒跟随（选深色必写 dark）', () => {
  const { panelProps, themeCalls } = loadPanel({ lang: 'zh-CN', hostDark: false })
  assert.equal(typeof panelProps.setFollowAppearance, 'undefined', '跟随开关已下线，不应再暴露 setter')
  panelProps.setTheme('matrix')
  assert.deepEqual(themeCalls, ['dark', 'dark'], '无开关后选深色仍应写 dark（启动 dark + 选中 dark）')
})

test('用户中途改过则不恢复（issue 48）：只释放自己写的值', () => {
  const { panelProps, themeCalls } = loadPanel({ lang: 'zh-CN', hostDark: false, stuckPref: 'light' })
  panelProps.setTheme('matrix')
  assert.deepEqual(themeCalls, ['dark', 'dark'], '启动+选中各写一次，均未落地')
  panelProps.toggle()
  assert.deepEqual(themeCalls, ['dark', 'dark'], '快照未落地（用户/宿主仍为 light），停用时不盲目恢复')
})

test('启动跳过存量 system 主题（issue 48）：非手势不写偏好', () => {
  const { themeCalls } = loadPanel({ lang: 'zh-CN', hostDark: false, savedTheme: 'system' })
  assert.deepEqual(themeCalls, [], '存量 system 启动时不写（点击 system 仍写，见三态用例）')
})

test('system 芯片跟宿主走（浅白/深黑）', () => {
  const light = loadPanel({ lang: 'zh-CN', hostDark: false })
  const lightSeg = chipSegment(light.html, 'system')
  assert.ok(lightSeg.includes('background:#FFFFFF'), '浅色宿主下 system 芯片应白底')
  const dark = loadPanel({ lang: 'zh-CN', hostDark: true })
  const darkSeg = chipSegment(dark.html, 'system')
  assert.ok(darkSeg.includes('background:#0A0A0A'), '深色宿主下 system 芯片应深底')
})

test('system 已释放时点选不再写（#55：system→system no-op）', () => {
  const { panelProps, themeCalls } = loadPanel({ lang: 'zh-CN', hostDark: false, stuckPref: 'system' })
  const before = themeCalls.length
  panelProps.setTheme('system')
  assert.deepEqual(themeCalls.length, before, '宿主已为 system 时点选 system 不应再写，避免 compat 落成具体值')
})

test('2.0.7 英文界面：日志开关也走双语', () => {
  const locale = makeLocale('en')
  const { html } = loadPanel({ locale })
  assert.ok(html.includes('Log Off'), '缺英文日志开关')
  assert.ok(!html.includes('日志 关'), '英文界面不该出现中文开关文案')
})

test('面板计数走 trf 派生（#60）：themeCount/subtitle 模板含 {n}，渲染值取 themeNames().length', () => {
  // 模板在源码里：转抄 38 必漂（34→38 前车），派生是唯一正解（n 恒≥2，英文恒复数，见注释）
  const code = readFileSync(new URL('../runtime/client.mjs', import.meta.url), 'utf8')
  assert.ok(code.includes("'{n} 款 OpenCode 官方配色主题"), 'subtitle zh 模板缺 {n}')
  assert.ok(code.includes("'{n} official OpenCode themes"), 'subtitle en 模板缺 {n}')
  assert.ok(code.includes("'{n} 款 · 按色系分组'"), 'themeCount zh 模板缺 {n}')
  assert.ok(code.includes("'{n} themes · by color family'"), 'themeCount en 模板缺 {n}')
  // 当前注册表 38 下渲染值与冻结串逐字一致（长度冒烟基线：与旧静态等长）
  const zh = loadPanel({ lang: 'zh-CN' })
  assert.equal(zh.panelProps.text('themeCount', { n: 38 }), '38 款 · 按色系分组')
  assert.equal(zh.panelProps.text('subtitle', { n: 38 }), '38 款 OpenCode 官方配色主题，点击即切换')
  assert.ok(zh.html.includes('38 款 · 按色系分组'), '面板应渲染出 38 计数')
  const en = loadPanel({ locale: makeLocale('en') })
  assert.equal(en.panelProps.text('themeCount', { n: 38 }), '38 themes · by color family')
  assert.equal(en.panelProps.text('subtitle', { n: 38 }), '38 official OpenCode themes — click to switch')
})

test('字体下拉不被裁：悬浮层级 + 宽度约束 + 行省略', () => {
  const code = readFileSync(new URL('../runtime/client.mjs', import.meta.url), 'utf8')
  // 悬浮菜单统一最高层级（旧 zIndex 20 会被兄弟内容盖住）
  assert.ok(!code.includes('zIndex: 20'), '不应再有 zIndex: 20 的悬浮菜单')
  assert.ok(code.includes('zIndex: 1000'), '悬浮菜单应提至 1000')
  // 字体菜单块：宽度跟锚定按钮走（不再 max-content 撑爆面板），溢出裁掉
  const menu = code.slice(code.indexOf("key: 'font-menu'"), code.indexOf('[fontMenu()]'))
  assert.ok(menu.includes("width: '100%'"), '字体菜单宽度应跟按钮走')
  assert.ok(!menu.includes('max-content'), '字体菜单不得再用 max-content')
  assert.ok(menu.includes("overflow: 'hidden'"), '字体菜单溢出应裁掉')
  // 候选行：单行省略 + 全文 title（长族名截断后仍可悬停查看）+ 显式行高（宿主 UA 行高干扰直接压扁行的兜底）
  const item = code.slice(code.indexOf('const fontItem = function'), code.indexOf('const hint = fontHint()'))
  assert.ok(item.includes("textOverflow: 'ellipsis'"), '候选行应单行省略')
  assert.ok(item.includes('title: k.key + suffix'), '候选行 title 应为全文本')
  assert.ok(item.includes("lineHeight: '20px'"), '候选行应锁行高（防宿主行高压扁）')
})
