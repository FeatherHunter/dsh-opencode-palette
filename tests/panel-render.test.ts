// panel-render.test.ts — 面板渲染回归测试
// 用 DSH app 的真实 React 把设置面板 renderToString，抓渲染期错误（如变量遮蔽/括号失衡）
// 前置：产物由 `npm test` 的 pretest 自动重建（package/lib/client.js，约 2 s）；
// 若绕过 pretest 直接跑 `node --test`，先 `npm run build:artifacts`。
// 产物不入库（ADR 0004），所以这里读到的永远是当前源码构建出来的字节。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInThisContext } from 'node:vm'
import type { FunctionComponent, ReactElement } from 'react'
import { THEME_ZH, THEME_EN } from '../src/engine/zh-names.ts'

type ReactModule = typeof import('react')

// react-dom 没有随包 @types（本仓只装了 @types/react），这里只声明本测试用到的受用面。
interface ReactDOMServerLike {
  renderToString(element: ReactElement): string
}

// React 解析：优先本仓 devDependencies（自包含、不受宿主安装位变动影响），
// 回退旧版 DSH 的 app.asar.unpacked（DSH 2.0.x 起宿主侧已不再随包提供 react-dom，
// 硬编码该路径会让测试在换机/升级后直接崩，故解析失败时报明确修复指引）。
function loadReact(): { React: ReactModule; ReactDOMServer: ReactDOMServerLike } {
  const candidates = [
    createRequire(import.meta.url),
    createRequire('D:/0Tools/DSH Desktop/resources/app.asar.unpacked/node_modules/'),
  ]
  let missing: unknown = null
  for (const req of candidates) {
    try {
      return {
        React: req('react') as ReactModule,
        ReactDOMServer: req('react-dom/server') as ReactDOMServerLike,
      }
    } catch (e) { missing = e }
  }
  throw new Error('缺 react / react-dom（面板渲染测试前置）——先在本仓执行 `npm install` 装 devDependencies。原因：' + (missing instanceof Error ? missing.message : String(missing)))
}

const { React, ReactDOMServer } = loadReact()

// 引流卡片固定指向的兄弟插件仓库（顺序即渲染顺序）：
// base 包推荐卡按 manifest 的 order 排序，并以 selfId='palette' 过滤掉本插件自己 → deck → prompt → im → ilife。
const AUTHOR_REPOS = ['dsh-mattpocock-skills-deck', 'dsh-prompt', 'dsh-im-companion', 'ilife']
// 出现次数统计（用于「不多不少、每行一次」断言）
function occurrences(hay: string, needle: string): number {
  return hay.split(needle).length - 1
}

// ── 被测产物 / DOM / locale 的最小类型面（bundle 是运行期求值的 JS，边界处显式断言）──

interface LocalFontFamily {
  family: string
  style?: string
}

interface FontCandidate {
  key: string
  isPreset: boolean
  isLocal: boolean
  ok: boolean
}

interface FontScanCache {
  ok: boolean
  reason?: string
  count?: number
  candidates: FontCandidate[]
}

interface PanelProps {
  text(key: string, params?: Record<string, number>): string
  collectFonts(): Promise<FontScanCache>
  setTheme(theme: string): void
  toggle(): void
  setFollowAppearance?: (enabled: boolean) => void
}

type PanelComponent = FunctionComponent<PanelProps>

interface ClientExports {
  apply(ctx: unknown): void
}

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

interface MockElement {
  dataset: Record<string, string>
  parentNode: MockBody | null
  textContent: string
  style: { cssText: string; fontFamily: string }
  getBoundingClientRect(): { width: number }
}

interface MockBody {
  hasAttribute(name: string): boolean
  getAttribute(name: string): string | null
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
  appendChild(el: MockElement): void
  removeChild(el: MockElement): void
}

interface MockContext2D {
  font: string
  measureText(ch: string): { width: number }
}

interface MockCanvas {
  getContext(kind: string): MockContext2D | null
}

interface MockDocumentElement {
  lang: string
  style: {
    colorScheme: string
    removeProperty(property: string): void
  }
  _attrs: Record<string, string>
  hasAttribute(name: string): boolean
  getAttribute(name: string): string | null
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
}

interface MockDocument {
  head: { appendChild(el: MockElement): void }
  body: MockBody
  createElement(tag: string): MockElement | MockCanvas
  // base 包 ensureBaseStyles 先查 style#dsh-base-ui-style 是否存在（假 DOM 恒无 → 每次注入一份）
  getElementById(id: string): MockElement | null
  documentElement: MockDocumentElement
  addEventListener(): void
  removeEventListener(): void
}

interface ModuleLoaderEntry {
  id: string
  factory(require: (id: string) => unknown): unknown
}

// globalThis 上的浏览器/加载器扩展（Node 类型里没有，用窄化替身声明）
interface TestGlobals {
  window?: unknown
  queryLocalFonts?: () => Promise<LocalFontFamily[]>
  __ModuleLoader__?: { load(entry: ModuleLoaderEntry): void }
  document?: MockDocument
  __docEl?: MockDocumentElement
  localStorage?: StorageLike
}

const g = globalThis as unknown as TestGlobals

type LocaleDict = Record<string, string>
type LocaleDicts = Record<string, LocaleDict>

interface LocaleService {
  register(ns: string, localeDicts: LocaleDicts): () => void
  getLocale(): { active: string; locales: { id: string }[]; revision: number }
  subscribe(fn: () => void): () => boolean
  setActive(id: string): void
  dictFor(ns: string, locale: string, key: string): string | undefined
}

// 迷你 locale 服务 mock：对齐 @deepseek-ai/dsh-client-locale 的受用面
// （register / getLocale / subscribe），外加测试专用 setActive 触发语言切换
function makeLocale(initial: string): LocaleService {
  const dicts = new Map<string, Map<string, LocaleDict>>()
  const listeners = new Set<() => void>()
  let active = initial
  let revision = 0
  return {
    register(ns, localeDicts) {
      const locales = new Map<string, LocaleDict>()
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

interface SlotRegistration {
  label(): string
  inject(): PanelProps
}

interface SlotApi {
  inject(slot: string, cb: () => void): () => void
  register(desc: SlotRegistration, cmp: unknown): () => void
}

interface ThemeService {
  overrideTokens(): () => void
  getTheme(): { preference: string }
  setTheme?(id: string): void
}

interface SavedState {
  enabled: boolean
  theme: string
  mode: string
  size: number
  fontKey: string
  followAppearance: boolean
}

interface LoadPanelOptions {
  lang?: string
  locale?: LocaleService | null
  queryLocalFonts?: () => Promise<LocalFontFamily[]>
  installedFonts?: string[]
  hostDark?: boolean
  disabled?: boolean
  fontKey?: string
  savedTheme?: string
  noOfficialSetTheme?: boolean
  throwingSetTheme?: boolean
  stuckPref?: string
}

interface LoadPanelResult {
  html: string
  panelCmp: PanelComponent
  panelProps: PanelProps
  locale: LocaleService | null
  text: PanelProps['text']
  collectFonts: PanelProps['collectFonts']
  bodyAttrs: Record<string, string>
  themeCalls: string[]
  docEl: MockDocumentElement
  registrations: SlotRegistration[]
}

// loadPanel(opts)：opts.lang = 回退用 document.documentElement.lang；
// opts.locale = locale 服务 mock（缺省走 DOM 回退路径）
function loadPanel(opts: LoadPanelOptions = {}): LoadPanelResult {
  const lang = opts.lang ?? 'en'
  const locale = opts.locale ?? null
  const code = readFileSync(new URL('../package/lib/client.js', import.meta.url), 'utf8')
  const loaded: { id: string; exports: unknown }[] = []
  // 浏览器里 window === globalThis：把 window 指回 globalThis，别做一个「window.document 不存在」的假宿主
  // （等宽判定要经 window.document 建 canvas，假宿主会让它静默退化成「都非等宽」，测试就白测了）
  g.window = globalThis
  // 本机字体枚举（opts.queryLocalFonts 未给 → 模拟不支持该 API 的宿主：存在性判断要能兜住）
  if (opts.queryLocalFonts) g.queryLocalFonts = opts.queryLocalFonts
  else delete g.queryLocalFonts
  g.__ModuleLoader__ = {
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
  const bodyAttrs: Record<string, string> = {}
  if (opts.hostDark !== false) bodyAttrs['data-ds-dark-theme'] = ''
  const body: MockBody = {
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
  const canvas2d: MockContext2D = {
    font: '',
    measureText(ch) {
      const mono = String(canvas2d.font).indexOf('\u771f\u7b49\u5bbd') >= 0
      return { width: mono ? 16 : (ch === 'W' ? 24 : 9) }
    },
  }
  // 文档根 mock：colorScheme 样式 + source 属性可写，供投影断言
  const documentElement: MockDocumentElement = {
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
  }
  g.document = {
    head: { appendChild: () => {} },
    body: body,
    // 量宽 mock：家族名在 installedFonts 内 → 宽度不同于「确定不存在」的家族 → 判定已装
    createElement: (tag) => {
      if (tag === 'canvas') return { getContext: (kind) => (kind === '2d' ? canvas2d : null) }
      const el: MockElement = {
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
    documentElement: documentElement,
    // base 包 ensureBaseStyles 的判重入口：假 DOM 不缓存 <style>，恒返回 null 即可
    getElementById: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  g.__docEl = documentElement
  // 注：Node 22 的 navigator 只读；getLang 以 document.documentElement.lang 为主信号源
  // opts.savedTheme 预置存量主题（覆盖缺省 opencode），用于启动路径断言
  const savedState: SavedState | null = opts.savedTheme
    ? { enabled: true, theme: opts.savedTheme, mode: 'mono', size: 13, fontKey: 'JetBrains Mono', followAppearance: true }
    : null
  g.localStorage = savedState
    ? { getItem: () => JSON.stringify(savedState) ?? null, setItem: () => {} }
    : opts.disabled
    ? { getItem: () => JSON.stringify({ enabled: false, theme: 'opencode', mode: 'mono', size: 13, fontKey: 'JetBrains Mono' }) ?? null, setItem: () => {} }
    : opts.fontKey
      ? { getItem: () => JSON.stringify({ enabled: true, theme: 'opencode', mode: 'mono', size: 13, fontKey: opts.fontKey }) ?? null, setItem: () => {} }
      : undefined
  // 扫描门禁：eval 语法即高危（DANGEROUS_DYNAMIC_EXECUTION）；在当前上下文执行同一产物字节，语义与直接求值一致（仅测试）。
  runInThisContext(code, { filename: 'package/lib/client.js' })
  const first = loaded[0]
  assert.ok(first, '产物应注册模块')
  const p = first.exports as ClientExports
  let panelCmp: PanelComponent | null = null
  let panelProps: PanelProps | null = null
  // 入口注册记录：每次 register（含语言切换触发的重注册）都留一份 desc，供入口 label 跟随断言
  const registrations: SlotRegistration[] = []
  const slots: SlotApi = {
    inject: (_slot, cb) => { cb(); return () => {} },
    register: (desc, cmp) => {
      registrations.push(desc)
      panelCmp = cmp as PanelComponent
      panelProps = desc.inject()
      return () => {}
    },
  }
  // theme mock：官方 setTheme 可用时记录调用并翻转 mock 偏好（模拟宿主）；
  // opts.noOfficialSetTheme 模拟旧宿主走投影降级；opts.throwingSetTheme 模拟 facade 语义不符抛错；
  // opts.stuckPref 让偏好恒为某值（模拟异步宿主未落地），触发 verify 失败走降级
  const themeCalls: string[] = []
  let mockPref = opts.stuckPref !== undefined ? opts.stuckPref : (opts.hostDark !== false ? 'dark' : 'light')
  const themeSvc: ThemeService = { overrideTokens: () => () => {}, getTheme: () => ({ preference: mockPref }) }
  if (opts.throwingSetTheme) themeSvc.setTheme = () => { throw new Error('facade mismatch') }
  else if (!opts.noOfficialSetTheme) themeSvc.setTheme = (id) => { themeCalls.push(id); if (opts.stuckPref === undefined) mockPref = id }
  const ctx = {
    get: (k: string): unknown => {
      if (k === 'theme') return themeSvc
      if (k === 'slots') return slots
      if (k === 'locale' && locale) return locale
      return undefined
    },
    effect: (fn: () => void): void => { fn() },
  }
  p.apply(ctx)
  // 注册回调在 apply 期间才写 panelCmp / panelProps；TS 看不到闭包赋值，这里显式取回再窄化
  const cmp = panelCmp as PanelComponent | null
  assert.ok(cmp, '面板组件未注册')
  const props = panelProps as PanelProps | null
  assert.ok(props, '面板属性未注册')
  const html = ReactDOMServer.renderToString(React.createElement(cmp, props))
  return { html, panelCmp: cmp, panelProps: props, locale, text: props.text, collectFonts: props.collectFonts, bodyAttrs, themeCalls, docEl: documentElement, registrations }
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

test('头行三件套（base 0.1.2 ActionCluster）：彩色 16px 图标 + 可访问名跟随语言', () => {
  const locale = makeLocale('en')
  const { html } = loadPanel({ locale })
  assert.ok(html.includes('dsh-base-cluster'), '头行应是 base 包 ActionCluster')
  assert.ok(html.includes('role="group"'), '三件套应是 aria group')
  assert.ok(html.includes('aria-label="Quick actions"'), '缺三件套组名（英文）')
  assert.equal(occurrences(html, 'data-cluster-item="'), 3, 'ActionCluster 应渲染三枚动作按钮')
  assert.equal(occurrences(html, 'class="dsh-base-cluster__btn dsh-base-cluster__btn--'), 3, '三枚按钮应有专属 class')
  for (const id of ['contact', 'star', 'issue']) {
    assert.ok(html.includes('dsh-base-cluster__svg--' + id), '缺 ' + id + ' 彩色图标')
  }
  assert.ok(html.includes('linearGradient'), '彩色图标应带渐变（linearGradient 不在场）')
  assert.ok(html.includes('radialGradient'), '星标光晕应带径向渐变（radialGradient 不在场）')
  assert.ok(!html.includes('dsh-base-actions--group'), '旧 ActionGroup 窄胶囊不应在场')
  assert.ok(!html.includes('dsh-base-icon-action'), '旧线框图标控件不应在场')
  assert.ok(html.includes('aria-label="Contact us"'), '缺联系按钮英文可访问名')
  assert.ok(html.includes('aria-label="Star this project"'), '缺 Star 英文可访问名')
  assert.ok(html.includes('aria-label="Open an issue"'), '缺 Issue 英文可访问名')
  assert.ok(!html.includes('联系我们'), '英文界面不应出现中文可访问名')
  assert.ok(!html.includes('提交 Issue'), '英文界面不应出现中文 Issue 可访问名')
  // 悬停文案由 base 包 HoverTip 在 hover 时挂 document.body，不进 SSR；面板双语表也随之删掉两键
  assert.equal(locale.dictFor('opencode-palette', 'zh', 'starTitle'), undefined, '面板双语表不应再有 starTitle')
  assert.equal(locale.dictFor('opencode-palette', 'en', 'issueTitle'), undefined, '面板双语表不应再有 issueTitle')
})

test('头行三件套可访问名跟随语言切换实时改', () => {
  const locale = makeLocale('zh')
  const { html: zhHtml, panelCmp, panelProps } = loadPanel({ locale })
  assert.ok(zhHtml.includes('aria-label="快捷操作"'), '初始中文缺三件套组名')
  assert.ok(zhHtml.includes('aria-label="联系我们"'), '初始中文缺联系可访问名')
  assert.ok(zhHtml.includes('aria-label="Star 这个项目"'), '初始中文缺 Star 可访问名')
  assert.ok(zhHtml.includes('aria-label="提交 Issue"'), '初始中文缺 Issue 可访问名')
  locale.setActive('en')
  const enHtml = ReactDOMServer.renderToString(React.createElement(panelCmp, panelProps))
  assert.ok(enHtml.includes('aria-label="Quick actions"'), '切换后缺三件套英文组名')
  assert.ok(enHtml.includes('aria-label="Contact us"'), '切换后缺联系英文可访问名')
  assert.ok(enHtml.includes('aria-label="Star this project"'), '切换后缺 Star 英文可访问名')
  assert.ok(enHtml.includes('aria-label="Open an issue"'), '切换后缺 Issue 英文可访问名')
  assert.ok(!enHtml.includes('联系我们'), '切换后不应残留中文可访问名')
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

test('引流卡片标题跟随语言（英文 base 包文案，无全角冒号）', () => {
  const locale = makeLocale('en')
  const { html } = loadPanel({ locale })
  assert.ok(html.includes('dsh-base-plugins__title-text'), '引流卡片应由 base 包推荐卡渲染')
  assert.ok(html.includes('More plugins by the author'), '英文卡片标题应为 base 包文案')
  assert.ok(!html.includes('作者的其他插件'), '英文界面不应出现中文卡片标题')
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
function chipSegment(html: string, label: string): string {
  const re = /<button[\s\S]*?<\/button>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    if (m[0].includes(label)) return m[0]
  }
  assert.fail('缺芯片：' + label)
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
  const cases: [string, string, Record<string, string>][] = [
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

// 产物是 tsc emit 形态（双引号、分号、类型已剥离）：下面只匹配标识符与字符串字面量内容，
// 这些不随 emit 变形；不要加依赖单引号或无分号的模式。
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

test('面板底部小字显示当前版本号', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
  const { html } = loadPanel({ lang: 'zh-CN' })
  assert.ok(html.includes('v' + pkg.version), '缺版本号小字 v' + pkg.version)
  assert.ok(html.includes('https://github.com/FeatherHunter/dsh-opencode-palette"'), '缺 Star 链接')
  assert.ok(html.includes('https://github.com/FeatherHunter/dsh-opencode-palette/issues"'), '缺 Issue 链接')
  assert.ok(html.includes('aria-label="Star 这个项目"'), '缺 Star 可访问名（悬停文案由 base 包 HoverTip 提供）')
})

test('星标是 base 包金色渐变星图标（悬停文案随 HoverTip，不进 SSR）', () => {
  const { html } = loadPanel({ lang: 'zh-CN' })
  assert.ok(html.includes('dsh-base-cluster__svg--star'), '缺 base 包彩色星图标')
  assert.ok(html.includes('M12 2.7l2.72 5.49 6.06.89-4.39 4.27 1.04 6.04L12 16.55l-5.43 2.84 1.04-6.04L3.22 9.08l6.06-.89z'), '星标图标未换成 base 包彩色星')
  assert.ok(html.includes('aria-label="Star 这个项目"'), '缺 Star 可访问名')
  assert.ok(!html.includes('你的 ⭐是我夜空中最亮的星'), '悬停文案不应再进 SSR / 面板词表')
})

test('ISSUE 入口是 base 包珊瑚粉气泡图标（不再是手绘线框感叹号）', () => {
  const { html } = loadPanel({ lang: 'zh-CN' })
  assert.ok(html.includes('https://github.com/FeatherHunter/dsh-opencode-palette/issues"'), '缺 ISSUE 列表页链接')
  assert.ok(html.includes('dsh-base-cluster__svg--issue'), 'ISSUE 图标未换成 base 包彩色气泡')
  assert.ok(html.includes('aria-label="提交 Issue"'), 'ISSUE 可访问名被改动')
  assert.ok(html.includes('#f43f5e'), '缺珊瑚粉渐变端点')
  assert.ok(!html.includes('M21 11.5a8.38'), '旧手绘消息气泡图标仍在')
  assert.ok(!html.includes('cx="12" cy="12" r="10"'), '旧 ⓘ 圆圈图标仍在')
})

test('底部引流卡片（中文）：base 包推荐卡标题 + 4 行兄弟插件 + 外链图标', () => {
  const { html } = loadPanel({ lang: 'zh-CN' })
  assert.ok(html.includes('dsh-base-plugins'), '缺 base 包推荐卡容器')
  assert.ok(html.includes('作者的其他插件'), '缺引流卡片标题（base 包文案）')
  assert.ok(html.includes('近 30 万 star 的 mattpocock/skills 整套预置好（27 个技能），装好即用。'), '缺 skills-deck 文案')
  assert.ok(html.includes('经常反复重复的模板化提示词，存成自定义模板，选中后直接注入，不再需要耗费精力。'), '缺 prompt 文案')
  assert.ok(html.includes('给 dsh-im 加了「助理」和「家」的概念。'), '缺 im-companion 文案')
  assert.ok(html.includes('⚠️建设中⚠️爱生活：居家生活套件，记账、运动、饮食、体重、食谱、物品管理、作息规划、备忘录等。'), '缺 ilife 文案')
  for (const repo of AUTHOR_REPOS) {
    const url = 'https://github.com/FeatherHunter/' + repo
    assert.equal(occurrences(html, url), 1, '引流链接应恰好出现一次：' + repo)
  }
  // base 包行结构：每行一个宫格图标 + 一个外链箭头；锚点属性齐备
  assert.equal(occurrences(html, 'class="dsh-base-plugins__item"'), 4, 'base 推荐卡应为 4 行')
  assert.equal(occurrences(html, 'dsh-base-plugins__row'), 4, '每行一条外链')
  assert.equal(occurrences(html, 'dsh-base-plugins__ext'), 4, '每行一个外链小图标')
  assert.equal(occurrences(html, 'dsh-base-plugins__title-icon'), 1, '缺卡片标题前的宫格图标')
  // 页头 base ActionCluster 的 Star/Issue 也是外链（rel 顺序是 noreferrer noopener），这里只对账卡片内的外链锚点。
  const card = html.slice(html.indexOf('dsh-base-plugins'))
  assert.ok(card.includes('dsh-base-plugins__item'), '应能切出 base 包推荐卡')
  assert.equal(occurrences(card, 'target="_blank"'), occurrences(card, 'rel="noopener noreferrer"'), '卡片外链锚点属性不成对')
})

test('底部引流卡片（英文）：整体英文，不出现中文引流文案', () => {
  const locale = makeLocale('en')
  const { html } = loadPanel({ locale })
  assert.ok(html.includes('More plugins by the author'), '缺英文卡片标题（base 包文案）')
  assert.ok(html.includes('The whole mattpocock/skills set (nearly 300k stars) preinstalled — 27 skills, ready as soon as it is installed.'), '缺 skills-deck 英文文案')
  assert.ok(html.includes('The boilerplate prompts you keep retyping, saved as custom templates and injected on selection — no more wasted effort.'), '缺 prompt 英文文案')
  assert.ok(html.includes('Adds the ideas of an “assistant” and a “home” to dsh-im.'), '缺 im-companion 英文文案')
  assert.ok(html.includes('⚠️Work in progress⚠️ iLife, the home-life suite: bookkeeping, exercise, diet, weight, recipes, item management, schedule planning, memos and more.'), '缺 ilife 英文文案')
  assert.ok(!html.includes('作者的其他插件'), '英文界面不应出现中文卡片标题')
  assert.ok(!html.includes('装好即用'), '英文界面不应出现中文引流文案')
  // 标题/行文案归 base 包，不再进面板双语表（旧词条已随手写卡片删除）
  assert.equal(locale.dictFor('opencode-palette', 'zh', 'authorPlugins'), undefined, '面板双语表不应再有 authorPlugins 词条')
  assert.equal(locale.dictFor('opencode-palette', 'en', 'authorPlugins'), undefined, '面板双语表不应再有 authorPlugins 词条')
})

test('底部引流卡片：跟随语言切换实时改文案', () => {
  const locale = makeLocale('zh')
  const { html: zhHtml, panelCmp, panelProps } = loadPanel({ locale })
  assert.ok(zhHtml.includes('作者的其他插件'), '初始中文卡片标题缺失')
  assert.ok(zhHtml.includes('装好即用。'), '初始中文卡片描述缺失')
  locale.setActive('en')
  const enHtml = ReactDOMServer.renderToString(React.createElement(panelCmp, panelProps))
  assert.ok(enHtml.includes('More plugins by the author'), '切换后缺英文卡片标题')
  assert.ok(enHtml.includes('ready as soon as it is installed.'), '切换后缺英文卡片描述')
  assert.ok(!enHtml.includes('作者的其他插件'), '切换后不应残留中文卡片标题')
})

test('底部引流卡片（浅色宿主）：样式走 base 包语义 token，无深色硬编码残留', () => {
  const { html } = loadPanel({ lang: 'zh-CN', disabled: true, hostDark: false })
  const title = html.indexOf('作者的其他插件')
  assert.ok(title >= 0, '缺引流卡片标题')
  const cardStart = html.lastIndexOf('dsh-base-plugins', html.indexOf('dsh-base-plugins'))
  assert.ok(cardStart >= 0, '缺 base 包推荐卡容器')
  const seg = html.slice(cardStart, title + 80)
  assert.ok(seg.includes('dsh-base-plugins__list'), '卡片行清单缺失')
  assert.ok(!/#555/.test(seg), '卡片内不应出现深色硬编码兜底色')
  assert.ok(!/#[0-9a-fA-F]{6}/.test(seg), '卡片内不应有任何硬编码 hex 颜色')
  // 卡片皮肤（描边/字色/图标色）全在 base 包内联样式里，走 DSH 语义 token
  const code = readFileSync(new URL('../package/lib/client.js', import.meta.url), 'utf8')
  assert.ok(code.includes('.dsh-base-plugins{'), 'base 包推荐卡样式未内联进产物')
  assert.ok(code.includes('var(--dsw-alias-border-l1'), 'base 包推荐卡描边未走语义 token')
  assert.ok(code.includes('dsh-base-plugins__desc'), 'base 包推荐卡描述样式未内联进产物')
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
  const fonts: LocalFontFamily[] = [
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
  const fonts: LocalFontFamily[] = [{ family: '比例体' }, { family: '真等宽体' }]
  const { collectFonts } = loadPanel({ lang: 'zh-CN', queryLocalFonts: () => Promise.resolve(fonts) })
  const cache = await collectFonts()
  const locals = cache.candidates.filter((k) => !k.isPreset)
  // 等宽置顶（canvas 实测，不靠名字猜）；比例项不得被丢掉（本单要的是任意系统字体）
  assert.deepEqual(locals.map((k) => k.key), ['真等宽体', '比例体'], '等宽置顶且非等宽仍列出')
  assert.equal(locals[0].ok, true, '枚举到的字体恒判可用')
  assert.equal(locals[1].ok, true, '非等宽字体也判可用（可选用）')
})

test('字体分组标题：不用“·”拼接，文本走主题色 + 数量徽章 + 分割线', () => {
  const code = readFileSync(new URL('../runtime/client.ts', import.meta.url), 'utf8')
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
  const code = readFileSync(new URL('../runtime/client.ts', import.meta.url), 'utf8')
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
  const code = readFileSync(new URL('../runtime/client.ts', import.meta.url), 'utf8')
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
  const code = readFileSync(new URL('../runtime/client.ts', import.meta.url), 'utf8')
  // 悬浮菜单统一最高层级（旧 zIndex 20 会被兄弟内容盖住）
  assert.ok(!code.includes('zIndex: 20'), '不应再有 zIndex: 20 的悬浮菜单')
  assert.ok(code.includes('zIndex: 1000'), '悬浮菜单应提至 1000')
  // 字体菜单块（锚定浮层）：fixed 逃宿主裁剪，坐标/下限走锚点 state
  const menu = code.slice(code.indexOf("key: 'font-menu'"), code.indexOf('[fontMenu()]'))
  assert.ok(menu.includes("position: 'fixed'"), '悬浮菜单应 fixed 定位（逃出宿主裁剪）')
  assert.ok(!menu.includes("'absolute'"), '悬浮菜单不得再用 absolute（逃不出裁剪）')
  assert.ok(menu.includes("width: 'max-content'"), '字体菜单宽度应随内容撑开')
  assert.ok(menu.includes('fontAnchor'), '菜单坐标/下限应走悬浮锚点 state')
  assert.ok(menu.includes("maxWidth: 'calc(100vw - 48px)'"), '字体菜单上限视口宽度')
  assert.ok(menu.includes("overflow: 'hidden'"), '字体菜单溢出应裁掉')
  assert.ok(code.includes('computeMenuGeometry'), '锚点坐标应走 engine 纯函数（可单测）')
  assert.ok(code.includes("window.addEventListener('scroll'"), '滚动时应重定位锚点')
  assert.ok(code.includes("window.addEventListener('resize'"), '缩放时应重定位锚点')
  const scroller = code.slice(code.indexOf('maxHeight: 280'), code.indexOf('maxHeight: 280') + 200)
  assert.ok(scroller.includes("overflowY: 'auto'"), '纵滑容器应可上下滚动')
  assert.ok(scroller.includes("overflowX: 'hidden'"), '纵滑容器不得左右滑动')
  // 候选行：固定高度 flex 行（行高不再依赖 line box，宿主行高干扰压不扁）+ 单行省略 + 全文 title
  const item = code.slice(code.indexOf('const fontItem = function'), code.indexOf('const hint = fontHint()'))
  assert.ok(item.includes("height: '28px'"), '候选行应固定高度（不依赖 line box）')
  assert.ok(item.includes("alignItems: 'center'"), '候选行应垂直居中')
  assert.ok(item.includes("minWidth: '0'"), 'flex 子项须 min-width:0，否则省略失效')
  assert.ok(item.includes("textOverflow: 'ellipsis'"), '候选行应单行省略')
  assert.ok(item.includes('title: k.key + suffix'), '候选行 title 应为全文本')
  assert.ok(item.includes("lineHeight: '20px'"), '候选行应锁行高（防宿主行高压扁）')
  assert.ok(item.includes("flex: 'none'"), '候选行不得被 flex 容器压缩（#69：92 项时被压扁聚集）')
  const sec = code.slice(code.indexOf('const secHeader = function'), code.indexOf('const menuItem = function'))
  assert.ok(sec.includes("flex: 'none'"), '分组头不得被 flex 容器压缩（#69 同因）')
})

// ── #88：主面板全部可交互控件的动效钩子覆盖（SSR 侧）──
// 判据：行内 cursor:pointer 的可点控件必须挂 data-palette-interactive，一个不漏；
// 主题胶囊走 chip 档（悬浮 + 周围边框变亮，用户点名效果）；可见档位用渲染结果断言；
// row/input 档只在展开的下拉/菜单里渲染，本测试没有展开执行入口，不再用源码 grep 假装覆盖（#114）。
function panelInteractiveTags(html: string): string[] {
  return (html.match(/<[a-zA-Z][^>]*>/g) ?? []).filter((t) => t.includes('cursor:pointer'))
}

test('#88 主面板：可点控件全挂动效钩子，一个不漏', () => {
  const { html } = loadPanel({ lang: 'zh-CN' })
  const hits = panelInteractiveTags(html)
  assert.ok(hits.length >= 20, '可点控件样本太少，断言已失效：' + hits.length)
  const missing = hits.filter((t) => !t.includes('data-palette-interactive'))
  assert.equal(missing.length, 0, '未挂动效钩子的可点控件：' + missing.slice(0, 4).join(' | '))
})

test('#88 主面板：主题胶囊走 chip 档，可见档位齐备，无空值钩子', () => {
  const { html } = loadPanel({ lang: 'zh-CN' })
  assert.ok(chipSegment(html, 'opencode').includes('data-palette-interactive="chip"'), '内置主题胶囊必须走 chip 档')
  assert.ok(chipSegment(html, '透光橙').includes('data-palette-interactive="chip"'), '透光胶囊同样走 chip 档')
  for (const tier of ['chip', 'button', 'switch']) {
    assert.ok(html.includes('data-palette-interactive="' + tier + '"'), '缺可见档位：' + tier)
  }
  // #114：原「runtime/client.ts 源码里出现过 TIER_CHIP/TIER_BUTTON/TIER_ROW/TIER_INPUT/TIER_SWITCH」
  // 代理断言删除——可见档位已用渲染结果断言（上）；row/input 档只在展开的下拉/菜单里渲染，
  // 本测试没有展开执行入口，无自动替代（手工 scratch 不入库）。空值钩子旧形态改为直接检查渲染结果。
  assert.equal(html.includes('data-palette-interactive=""'), false, '已渲染控件不得再用空值钩子')
})
