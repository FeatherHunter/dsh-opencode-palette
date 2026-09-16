// panel-render.test.mjs — 面板渲染回归测试
// 用 DSH app 的真实 React 把设置面板 renderToString，抓渲染期错误（如变量遮蔽/括号失衡）
// 前置：先 npm run build 产出 package/lib/client.js 再跑本测试
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

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
  assert.ok(html.includes('常用 prompt 预置或者自定义保存，开发只需要一键注入，不再繁琐'), '缺 prompt 文案')
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
