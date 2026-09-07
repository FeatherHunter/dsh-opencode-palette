// panel-render.test.mjs — 面板渲染回归测试
// 用 DSH app 的真实 React 把设置面板 renderToString，抓渲染期错误（如变量遮蔽/括号失衡）
// 前置：先 npm run build 产出 package/lib/client.js 再跑本测试
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const requireDsh = createRequire('D:/0Tools/DSH Desktop/resources/app.asar.unpacked/node_modules/')
const React = requireDsh('react')
const ReactDOMServer = requireDsh('react-dom/server')

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
  global.window = {
    __ModuleLoader__: {
      load(entry) {
        loaded.push({
          id: entry.id,
          exports: entry.factory((id) => {
            if (id === 'react') return React
            throw new Error('unexpected require: ' + id)
          }),
        })
      },
    },
  }
  global.document = {
    head: { appendChild: () => {} },
    createElement: () => ({ dataset: {}, parentNode: null, textContent: '' }),
    documentElement: { lang: lang },
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  // 宿主明暗 mock：hostDark=false → 浅色（无 data-ds-dark-theme）；缺省无 body → 回退深色
  if (opts.hostDark === true) global.document.body = { hasAttribute: () => true }
  if (opts.hostDark === false) global.document.body = { hasAttribute: () => false }
  // 注：Node 22 的 navigator 只读；getLang 以 document.documentElement.lang 为主信号源
  global.localStorage = opts.disabled
    ? { getItem: () => JSON.stringify({ enabled: false, theme: 'opencode', mode: 'mono', size: 13, fontKey: 'JetBrains Mono' }), setItem: () => {} }
    : undefined
  eval(code)
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
      if (k === 'locale' && locale) return locale
      return undefined
    },
    effect: (fn) => { fn() },
  }
  p.apply(ctx)
  assert.ok(panelCmp, '面板组件未注册')
  const html = ReactDOMServer.renderToString(React.createElement(panelCmp, panelProps))
  return { html, panelCmp, panelProps, locale }
}

test('面板渲染（DOM 回退·英文）：不抛错，输出英文品牌标题与主题芯片', () => {
  const { html } = loadPanel({ lang: 'en' })
  assert.ok(html.includes('Opencode Palette'), '缺英文品牌标题')
  assert.ok(html.includes('tokyonight'), '缺主题芯片')
  assert.ok(html.includes('system'), '缺 system 芯片')
  assert.ok(!html.includes('东京之夜'), 'DOM 回退英文界面不应出现中文主题名')
})

test('面板渲染（DOM 回退·中文）：输出 opencode调色板 与中文组名', () => {
  const { html } = loadPanel({ lang: 'zh-CN' })
  assert.ok(html.includes('opencode调色板'), '缺中文品牌标题（opencode 与调色板之间无空格）')
  assert.ok(html.includes('暖橙'), '缺中文色系组名')
  assert.ok(html.includes('system（默认）'), '缺 system 中文标签')
  assert.ok(html.includes('东京之夜'), '缺 tokyonight 中文名')
  assert.ok(html.includes('黑客帝国'), '缺 matrix 中文名')
  assert.ok(html.includes('德古拉'), '缺 dracula 中文名')
})

test('面板渲染（locale 服务·英文）：整体英文，不出现中文', () => {
  const locale = makeLocale('en')
  const { html } = loadPanel({ locale })
  assert.ok(html.includes('Opencode Palette'), '缺英文品牌标题')
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
  assert.ok(html.includes('opencode调色板'), '缺中文品牌标题')
  assert.ok(html.includes('暖橙'), '缺中文色系组名')
  assert.ok(html.includes('东京之夜'), '缺 tokyonight 中文名')
})

test('locale 服务切换实时生效：切到英文后重渲染即全英文', () => {
  const locale = makeLocale('zh')
  const { html: zhHtml, panelCmp, panelProps } = loadPanel({ locale })
  assert.ok(zhHtml.includes('opencode调色板'), '初始中文标题缺失')
  assert.ok(zhHtml.includes('暖橙'), '初始中文组名缺失')
  locale.setActive('en') // 模拟 DSH 设置 → General → Language 切到 English
  const enHtml = ReactDOMServer.renderToString(React.createElement(panelCmp, panelProps))
  assert.ok(enHtml.includes('Opencode Palette'), '切换后缺英文标题')
  assert.ok(enHtml.includes('Warm'), '切换后缺暖橙英译')
  assert.ok(!enHtml.includes('opencode调色板'), '切换后不应残留中文标题')
  assert.ok(!enHtml.includes('暖橙'), '切换后不应残留中文组名')
})

test('面板双语表已注册进 locale 服务（opencode-palette 命名空间）', () => {
  const locale = makeLocale('en')
  loadPanel({ locale })
  assert.equal(locale.dictFor('opencode-palette', 'zh', 'panelName'), 'opencode调色板')
  assert.equal(locale.dictFor('opencode-palette', 'en', 'panelName'), 'Opencode Palette')
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
  assert.ok(translucent.includes('color:var(--dsw-alias-label-primary)'), '透明底芯片浅色下用主文字色（不洗白）')
})

// 取某主题芯片 button 片段（断言其行内样式用）
function chipSegment(html, label) {
  const i = html.indexOf(label)
  assert.ok(i >= 0, '缺芯片：' + label)
  return html.slice(html.lastIndexOf('<button', i), html.indexOf('</button>', i))
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
  assert.ok(!translucent.includes('color:var(--dsw-alias-label-primary)'), '透明底芯片深色保持主题字色')
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
