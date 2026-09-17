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
  const body = {
    // 宿主明暗 mock：hostDark=false → 浅色（无 data-ds-dark-theme）；缺省/true → 深色
    hasAttribute: () => opts.hostDark !== false,
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
    documentElement: { lang: lang },
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  // 注：Node 22 的 navigator 只读；getLang 以 document.documentElement.lang 为主信号源
  global.localStorage = opts.disabled
    ? { getItem: () => JSON.stringify({ enabled: false, theme: 'opencode', mode: 'mono', size: 13, fontKey: 'JetBrains Mono' }), setItem: () => {} }
    : opts.fontKey
      ? { getItem: () => JSON.stringify({ enabled: true, theme: 'opencode', mode: 'mono', size: 13, fontKey: opts.fontKey }), setItem: () => {} }
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
  return { html, panelCmp, panelProps, locale, text: panelProps.text, collectFonts: panelProps.collectFonts }
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
  assert.equal(denied.panelProps.text('fontScanDenied'), 'Font access was denied — allow it in the browser, then retry; showing the common presets')

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
