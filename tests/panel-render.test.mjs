// panel-render.test.mjs — 面板渲染回归测试
// 用 DSH app 的真实 React 把设置面板 renderToString，抓渲染期错误（如变量遮蔽/括号失衡）
// 前置：先 npm run build 产出 package/lib/client.js 再跑本测试
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const requireDsh = createRequire('D:/0Tools/DSHDesktop/DSH Desktop/resources/app/node_modules/')
const React = requireDsh('react')
const ReactDOMServer = requireDsh('react-dom/server')

function loadPanel(lang) {
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
  // 注：Node 22 的 navigator 只读；getLang 以 document.documentElement.lang 为主信号源
  global.localStorage = undefined
  eval(code)
  const p = loaded[0].exports
  let panelCmp = null
  let panelProps = null
  const slots = {
    inject: (slot, cb) => { cb(); return () => {} },
    register: (desc, cmp) => { panelCmp = cmp; panelProps = desc.inject(); return () => {} },
  }
  const ctx = {
    get: (k) => k === 'theme'
      ? { overrideTokens: () => () => {} }
      : (k === 'slots' ? slots : undefined),
    effect: (fn) => { fn() },
  }
  p.apply(ctx)
  assert.ok(panelCmp, '面板组件未注册')
  const html = ReactDOMServer.renderToString(React.createElement(panelCmp, panelProps))
  return html
}

test('面板渲染（英文界面）：不抛错，输出品牌标题与主题芯片', () => {
  const html = loadPanel('en')
  assert.ok(html.includes('Opencode Palette'), '缺英文品牌标题')
  assert.ok(html.includes('tokyonight'), '缺主题芯片')
  assert.ok(html.includes('system'), '缺 system 芯片')
})

test('面板渲染（中文界面）：输出 OpenCode 调色板与中文组名', () => {
  const html = loadPanel('zh-CN')
  assert.ok(html.includes('opencode调色板'), '缺中文品牌标题（opencode 与调色板之间无空格）')
  assert.ok(html.includes('暖橙'), '缺中文色系组名')
  assert.ok(html.includes('system（默认）'), '缺 system 中文标签')
  assert.ok(html.includes('东京之夜'), '缺 tokyonight 中文名')
  assert.ok(html.includes('黑客帝国'), '缺 matrix 中文名')
  assert.ok(html.includes('德古拉'), '缺 dracula 中文名')
})

test('面板渲染（英文界面）：主题芯片显示英文原名，不出现中文名', () => {
  const html = loadPanel('en')
  assert.ok(html.includes('tokyonight'), '缺 tokyonight 芯片')
  assert.ok(!html.includes('东京之夜'), '英文界面不应显示中文主题名')
})
