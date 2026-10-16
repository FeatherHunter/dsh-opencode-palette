// ui-fx.mjs — 配置面板全局悬浮交互动效（#86，SSR 零污染架构）
// 零导入。只提供「面板专属样式表 + 钩子属性名」：既有主题胶囊/分段按钮的
// SSR 内联 style 字符串一个字符都不碰（tests/panel-render.test.mjs 的
// chipSegment 子串断言全集必须继续通过），动效只挂到新元素的数据属性钩子上。

// 钩子属性名（新元素按需标记，旧元素绝不加）
export const UI_INTERACTIVE_ATTR = 'data-palette-interactive'

// 面板专属样式表标记（注入的 <style> 标签属性）
export const UI_STYLE_ATTR = 'data-dsh-opencode-palette-ui'

export const UI_FX_CSS = [
  'button[' + UI_INTERACTIVE_ATTR + ']:hover{transform:translateY(-1px);box-shadow:0 2px 10px rgba(0,0,0,0.35);border-color:var(--dsw-alias-brand-primary);}',
  'button[' + UI_INTERACTIVE_ATTR + ']:active{transform:scale(0.98);}',
  'button[' + UI_INTERACTIVE_ATTR + ']:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px;}',
  '[' + UI_INTERACTIVE_ATTR + ']{transition:transform 0.16s ease,box-shadow 0.16s ease,border-color 0.16s ease,background-color 0.16s ease;}',
  '@media (prefers-reduced-motion: reduce){[' + UI_INTERACTIVE_ATTR + ']{transition:none;}button[' + UI_INTERACTIVE_ATTR + ']:hover{transform:none;box-shadow:none;}button[' + UI_INTERACTIVE_ATTR + ']:active{transform:none;}}',
].join('')

let uiFxInjected = false

// 注入面板专属 <style data-dsh-opencode-palette-ui>（幂等；假宿主/无 head 静默 false）
export function injectUiFx(doc) {
  try {
    if (uiFxInjected) return false
    const d = doc || (typeof document !== 'undefined' ? document : null)
    if (!d || !d.head || typeof d.head.appendChild !== 'function') return false
    if (typeof d.createElement !== 'function') return false
    const el = d.createElement('style')
    if (!el) return false
    el.textContent = UI_FX_CSS
    if (el.setAttribute) el.setAttribute(UI_STYLE_ATTR, '')
    d.head.appendChild(el)
    uiFxInjected = true
    return true
  } catch (e) { return false }
}
