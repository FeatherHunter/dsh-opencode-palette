// ui-fx.mjs — 配置面板全局交互动效（#86 建立，#88 分级扩展；SSR 零污染架构）
// 零导入。只提供「面板专属样式表 + 钩子属性名 + 档位常量」：既有主题胶囊/分段按钮的
// SSR 内联 style 字符串一个字符都不碰（tests/panel-render.test.mjs 的
// chipSegment 子串断言全集必须继续通过），动效只挂到数据属性钩子上。
// #88 拍板：`!important` 只允许出现在 :hover / :active / :focus-visible 状态选择器内，
// 且颜色一律取主题变量，绝不写死深色；@media (prefers-reduced-motion: reduce) 全量降级。

// 钩子属性名（新元素按需标记，旧元素绝不加）
export const UI_INTERACTIVE_ATTR = 'data-palette-interactive'

// 面板专属样式表标记（注入的 <style> 标签属性）
export const UI_STYLE_ATTR = 'data-dsh-opencode-palette-ui'

// 档位常量：钩子属性的取值。空值/未登记取值 = 历史通用档（#86 的 3 处空值钩子）。
export const TIER_CHIP = 'chip'
export const TIER_BUTTON = 'button'
export const TIER_ROW = 'row'
export const TIER_SWATCH = 'swatch'
export const TIER_INPUT = 'input'
export const TIER_SWITCH = 'switch'

// 选择器骨架（构建期拼好，避免样式表里出现跨行拼接）
const ANY = '[' + UI_INTERACTIVE_ATTR + ']'
const CHIP = '[data-palette-interactive="' + TIER_CHIP + '"]'
const BUTTON = '[data-palette-interactive="' + TIER_BUTTON + '"]'
const ROW = '[data-palette-interactive="' + TIER_ROW + '"]'
const SWATCH = '[data-palette-interactive="' + TIER_SWATCH + '"]'
const INPUT = '[data-palette-interactive="' + TIER_INPUT + '"]'
const SWITCH = '[data-palette-interactive="' + TIER_SWITCH + '"]'

// 统一时限/曲线：#83 原型锁定的 cubic-bezier(0.22,1,0.36,1) 150–160ms。
// 只动 transform / box-shadow / border-color / background-color / color / filter（零布局抖动）。
const EASE = 'cubic-bezier(0.22,1,0.36,1)'
const BASE = ANY + '{transition:transform 0.16s ' + EASE + ',box-shadow 0.16s ' + EASE +
  ',border-color 0.16s ease,background-color 0.16s ease,color 0.16s ease,filter 0.16s ease;}'

// 历史通用档（#86 的 3 处空值钩子）：只认空值，向后兼容旧标记。
// #88 实测修正：裸 [data-palette-interactive] 的选择器特异度 (0,3,1) 高于各具名档 (0,2,0)，
// 由 <button> 承载的胶囊/按钮档会被它抢走 box-shadow（品牌色外环丢失）→ 必须限定空值。
const LEGACY_ANY = '[' + UI_INTERACTIVE_ATTR + '=""]'
const LEGACY = 'button' + LEGACY_ANY + ':hover:not(:disabled){transform:translateY(-1px);' +
  'box-shadow:0 2px 10px rgba(0,0,0,0.35);border-color:var(--dsw-alias-brand-primary) !important;}' +
  'button' + LEGACY_ANY + ':active:not(:disabled){transform:scale(0.98);}' +
  'button' + LEGACY_ANY + ':focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px;}'

// chip 档：主题胶囊上浮 + 周围边框提亮 + 品牌色外环（用户点名效果）
const CHIP_FX = CHIP + ':hover{transform:translateY(-1px);border-color:var(--dsw-alias-brand-primary) !important;' +
  'box-shadow:0 0 0 1px var(--dsw-alias-brand-primary),0 3px 10px rgba(0,0,0,0.35);}' +
  CHIP + ':active{transform:translateY(0) scale(0.98);}' +
  CHIP + ':focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;}'

// button 档：底色/亮度提亮 + 边框变亮 + 微抬升（filter 不覆盖内联底色，主题无关）
const BUTTON_FX = BUTTON + ':hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.08);' +
  'border-color:var(--dsw-alias-brand-primary) !important;box-shadow:0 2px 8px rgba(0,0,0,0.30);}' +
  BUTTON + ':active:not(:disabled){transform:scale(0.98);filter:brightness(0.97);}' +
  BUTTON + ':focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px;}'

// row 档：下拉/菜单/字体行背景高亮 + 右移 1px
const ROW_FX = ROW + ':hover{background-color:var(--dsw-alias-interactive-bg-hover) !important;transform:translateX(1px);}' +
  ROW + ':active{transform:translateX(1px) scale(0.995);}' +
  ROW + ':focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px;}'

// swatch 档：色块/快选色卡微放大 + 品牌色描边（不改色，避免误导选色）
const SWATCH_FX = SWATCH + ':hover{transform:scale(1.12);border-color:var(--dsw-alias-brand-primary) !important;' +
  'box-shadow:0 0 0 1px var(--dsw-alias-brand-primary);}' +
  SWATCH + ':active{transform:scale(1.02);}' +
  SWATCH + ':focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px;}'

// input 档：输入框/拾色面/预览部件悬停描边 + 聚焦光环（不位移，兼容面状元素）
const INPUT_FX = INPUT + ':hover{border-color:var(--dsw-alias-brand-primary) !important;' +
  'box-shadow:0 0 0 2px var(--dsw-alias-interactive-bg-hover-accent);}' +
  INPUT + ':focus-visible{outline:none;border-color:var(--dsw-alias-brand-primary) !important;' +
  'box-shadow:0 0 0 2px var(--dsw-alias-interactive-bg-hover-accent);}'

// switch 档：开关轨道悬停光环 + 按压回弹（滑块过渡由内联样式承担，不碰）
const SWITCH_FX = SWITCH + ':hover{box-shadow:0 0 0 2px var(--dsw-alias-interactive-bg-hover-accent);}' +
  SWITCH + ':active{transform:scale(0.95);}' +
  SWITCH + ':focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;}'

// reduced-motion 全量降级：无过渡、无位移、无外发光
const REDUCED = '@media (prefers-reduced-motion: reduce){' + ANY + '{transition:none;}' +
  ANY + ':hover,' + ANY + ':active{transform:none !important;box-shadow:none !important;filter:none !important;}}'

export const UI_FX_CSS = [BASE, LEGACY, CHIP_FX, BUTTON_FX, ROW_FX, SWATCH_FX, INPUT_FX, SWITCH_FX, REDUCED].join('')

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
