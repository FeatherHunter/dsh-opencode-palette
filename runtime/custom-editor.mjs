// custom-editor.mjs — 37 色自定义主题编辑弹窗（#86）
// 交互与文案口径对齐 prototypes/custom-editor-83.prototype.html（唯一真相源）。
// React 组件（无 DOM 裸奔）：渲染期零 document/window 访问，副作用全进 effects/handlers。
import { normalizeHexInput, hexToHsv, hsvToHex, effectiveSlotColor, editorMiniLight, mergeHsv, parseHexInputLoose, hsvToRgb, rgbToHsv, rgbToHex, hsvToHsl, hslToHsv, hueStops, contrastRatio, contrastRefSlot, pickRecentColors } from './custom-color.mjs'
import { UI_INTERACTIVE_ATTR, TIER_BUTTON, TIER_CHIP, TIER_INPUT, TIER_SWATCH, TIER_SWITCH } from './ui-fx.mjs'

// 双向定位的额外高亮映射（原型 paintHl EXTRA_HL 口径：prototype.html:894-899）。
// 原型只给 border 系别名（.side/.md/.cinput 类选择器）；本实现用 rect 描边机制，
// 别名改写为真实 data-slot：border 系所有被 border 描边的节点 + borderActive 内圈节点。
const EXTRA_HL = {
  border: ['sidebarBg', 'backgroundPanel', 'bubbleBg', 'inputBg'],
  borderActive: ['inputBg'],
}

// 焦点圈类名（用户 m08636 第 4 条）：凡被 hl 命中的元素（node 节点与纯 span）都带此类，
// 供 badge 定位时按 DOM 顺序取第一个命中（原型 paintHl:903 的 `matches[0] || extras[0]` 口径）。
const HL_CLS = 'dspe-hl'

// 弹窗滚动条口径（原型 prototype.html:143-148）：左列表不滑动时看不见（悬停才现），右画布列直接隐藏。
// 走弹窗内 <style> 挂载（与 syslabel 同法，随弹窗卸载），不写进全局 ui-fx 样式表（那是面板级动效）。
const DLG_CSS = [
  '.dspe-dlg-left{scrollbar-width:thin;scrollbar-color:transparent transparent}',
  '.dspe-dlg-left:hover{scrollbar-color:var(--dsw-alias-scrollbar-hover-l1, #3A3A44) transparent}',
  '.dspe-dlg-left::-webkit-scrollbar{width:10px;height:10px}',
  '.dspe-dlg-left::-webkit-scrollbar-track{background:transparent}',
  '.dspe-dlg-left::-webkit-scrollbar-thumb{background:transparent;border:2px solid transparent;border-radius:8px}',
  '.dspe-dlg-left:hover::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-hover-l1, #3A3A44);background-clip:padding-box;border:2px solid transparent;border-radius:8px}',
  '.dspe-dlg-left::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-hover-l1, #4A4A55);background-clip:padding-box;border:2px solid transparent}',
  '.dspe-dlg-right{scrollbar-width:none}',
  '.dspe-dlg-right::-webkit-scrollbar{display:none;width:0 !important;height:0 !important}',
].join('')

// ── 弹窗 chrome 语义 token（用户 m09582 需求 2：编辑/新增弹窗整体跟随当前系统主题，预览区除外）──
// 宿主 DSH 与调色板主题都把 --dsw-alias-* 定义在 body 上（映射表唯一真相源：src/engine/map-dsh.mjs），
// 所以弹窗 chrome 直接吃 var() 就同时跟随「宿主深浅色」与「当前选中的调色板主题」，零 JS 传参。
// 末尾兜底值 = 改造前的深色字面量：宿主没定义该 token 时观感与今天完全一致。
// 不在此列（表达的是「被编辑主题」或「外观选项」本身，不随宿主走）：预览画布、右列画布底色、
// 顶栏预览胶囊（capFace/capFg/capPrimary）、外观 seg 的深浅双色、色位 swatch 自身描边与透明棋盘格。
const TK = {
  win: 'var(--dsw-alias-bg-layer-1, #141419)',
  panel: 'var(--dsw-alias-bg-layer-2, #1C1C21)',
  pop: 'var(--dsw-alias-bg-overlay, #1B1B21)',
  pop2: 'var(--dsw-alias-bg-overlay, #232329)',
  border: 'var(--dsw-alias-border-l1, #33333A)',
  borderStrong: 'var(--dsw-alias-border-l2, #3D3D47)',
  borderStrong2: 'var(--dsw-alias-border-l2, #4A4A55)',
  faint: 'var(--dsw-alias-border-l3, #55555F)',
  divider: 'var(--dsw-alias-border-l1, #26262C)',
  text: 'var(--dsw-alias-label-primary, #E7E7EA)',
  textStrong: 'var(--dsw-alias-label-primary, #EDEDF2)',
  text2: 'var(--dsw-alias-label-secondary, #A9A9B3)',
  text3: 'var(--dsw-alias-label-tertiary, #8B8B95)',
  accent: 'var(--dsw-alias-brand-primary, #FAB283)',
  accentFg: 'var(--dsw-alias-label-primary-foreground, #141414)',
  btnFill: 'var(--dsw-alias-button-primary-fill, #FAB283)',
  hover: 'var(--dsw-alias-interactive-bg-hover, #1A1A20)',
  danger: 'var(--dsw-alias-state-error-primary, #FF5252)',
  dangerText: 'var(--dsw-alias-state-error-primary, #FF6B6B)',
  dangerBorder: 'var(--dsw-alias-state-error-secondary, #C53B53)',
  dangerSoft: 'var(--dsw-alias-state-error-secondary, #F08A97)',
  dangerBg: 'var(--dsw-alias-interactive-bg-hover-danger, #2A1418)',
}

// 焦点圈样式（原型 .hl/.hl-edge 口径：prototype.html:175-178 + paintHl:893）。
// 纯函数接缝：凡被 hl 命中的色位一律描边呼吸（inline 元素同样吃内阴影，原型对 span 也是 .hl）。
// 用户 m08636 第 4 条要求「37 个色位命中时预览里每个受影响元素都被圈住」，
// 所以 node 容器与纯 span（t 文本、代码 token、textMuted 行）必须共用这一处判定。
export function slotRingStyle(hl, slot) {
  if (!hl) return null
  const targets = [hl].concat(EXTRA_HL[hl] || [])
  if (targets.indexOf(slot) < 0) return null
  const isEdge = (hl === 'border' || hl === 'borderActive') && slot === hl
  return {
    boxShadow: isEdge ? '0 0 0 2px ' + TK.accent : 'inset 0 0 0 2px ' + TK.accent,
    animation: 'dsh-pal-breathe 1.1s ease-in-out infinite',
  }
}

// 视野内边距（px）：行边缘到列表上下沿留一点余量，贴边也当没进视野（用户 m09226 的「出现在视野中」）。
const REVEAL_PAD = 8

// 名字区固定总宽（用户 m09433「输入框别因输入变宽」→ 用户 m09582 需求 1「胶囊仍可随名字变长、输入框可变短，总量不变」）。
// 原型 fitWidth 是「按输入文本量宽」（prototype.html:782 `textW(inp.value||placeholder)+24`、:788 `inp.style.width`），
// 本票按用户口径偏离：钉死「输入框 + 预览胶囊」这一区的总宽，区内自由分配。
// 区宽 = 输入框基准 200 + 间隙 8 + 胶囊基准 114（新建态「（未命名）」实测宽）→ 新建态输入框恰好仍是 200px
// （与 m09433 观感一致）；名字变长时胶囊先吃空间、输入框等比让位（下限 NAME_INPUT_MIN），
// 胶囊超过区宽上限后自身收窄打省略号 —— 顶行总量恒定，弹窗不再随名字变宽/变窄。
// 注意弹窗是 width:max-content：名字区必须 width/min/max 三向钉死才不参与 max-content 自量宽。
// 区内两件也不能把「内容宽」泄漏给外层 max-content（实测：只钉区宽时 dlg 宽仍随名字在 718~878 间跳）——
// 输入框 width:0 + flex-basis:0（百分比宽在自量宽里按 auto 算、会跟着 value 长度跑）、胶囊 max-width 封顶。
const NAME_INPUT_W = 200
const NAME_ZONE_W = 322
const NAME_INPUT_MIN = 90
// 胶囊自身上限 = 区宽 − 间隙 − 输入框下限（322 − 8 − 90 = 224）；超过就打省略号。
const NAME_CAP_MAX = NAME_ZONE_W - 8 - NAME_INPUT_MIN

// 预览 → 左列联动（用户 m09226：预览区鼠标悬浮某个内容时，左侧列表要滑到对应色位行、出现在视野中）。
// 只算「要不要滑」：行已完整落在左列可视区内就不动，避免鼠标扫过预览时列表空抖。
// 纯函数接缝：view/row 形如 getBoundingClientRect() 的结果（只用到 top / height）。
export function needsReveal(view, row, pad) {
  if (!view || !row) return false
  const p = typeof pad === 'number' ? pad : 0
  const bottom = view.top + (view.height || 0) - p
  return row.top < view.top + p || row.top + (row.height || 0) > bottom
}

// 取色器 Popover 盒子尺寸（#95 重构：内容宽 294 = 320 − 内边距 24 − 描边 2，故外框宽 320；
// 高度 388 = 内边距 24 + 标题 30 + SV 136 + 色相轨 22 + 数值行 34 + 主题色 44 + HEX 行 34 + 透明行 26 + footer 30 + 间隙）。
// 渲染侧 border-box + 本宽高、定位侧用本尺寸，两处同源（#94 口径不变：常量必须等于 getBoundingClientRect）。
const POP_W = 320
const POP_H = 388
// 锚定间距 / 边界留白 / 测量不可用时的兜底位（#94：纯函数、定位 effect 与测试共用同一来源）。
const POP_GAP = 8
const POP_MARGIN = 10
const POP_FALLBACK = { left: 40, top: 120 }

// 弹板首选方向（#93）：预览区控件贴锚点下方；左列色块入口贴入口右侧。
// 只在这两个常量里出现一次字面量，调用方一律引用常量（避免拼写错误静默降级成贴下方）。
const PLACE_BELOW = 'below'
const PLACE_RIGHT = 'right'

// 弹板锚定定位纯函数（#94）：anchor / bounds 形如 getBoundingClientRect() 的
// { left, top, right, bottom }；size = { width, height } 为外框尺寸；preferSide 为首选方向
// （放不下会翻转/夹紧，所以是「偏好」不是结果）：
//   PLACE_BELOW（预览区控件）：优先贴锚点下方（间距 POP_GAP），下方放不下翻上方；
//   PLACE_RIGHT（左列色块入口，#93）：优先贴入口右侧垂直居中，右侧放不下翻左侧；
//   两个方向都放不下时贴剩余空间更大的一侧并夹紧在 bounds 内（可能与锚点相交）；
//   四边各留 POP_MARGIN。缺输入（anchor/bounds/size 或尺寸非正）返回 null，
//   调用方给兜底位；SSR / 假宿主不抛。
export function popoverPosition(anchor, bounds, size, preferSide) {
  if (!anchor || !bounds || !size) return null
  const w = size.width
  const h = size.height
  if (!(w > 0) || !(h > 0)) return null
  // 坐标全部取整：非整数锚点/边界（flex 居中在奇数视口宽度下会出 .5）若直接四舍五入，
  // 「间距 8px」可能变成 8.5px；这里朝锚点方向 floor/ceil，保证贴边间距 ≤8px 且完整落在边界内。
  const minLeft = Math.ceil(bounds.left + POP_MARGIN)
  const maxLeft = Math.floor(bounds.right - POP_MARGIN - w)
  const minTop = Math.ceil(bounds.top + POP_MARGIN)
  const maxTop = Math.floor(bounds.bottom - POP_MARGIN - h)
  let left
  let top
  if (preferSide === PLACE_RIGHT) {
    // #93：左列入口 —— 贴入口右侧垂直居中；右侧放不下翻左侧；左右都放不下退到入口上方/下方
    // （水平对齐入口），尽量不遮住入口；实在放不下才按剩余空间大的一侧夹紧（可能与锚点相交）。
    const right = Math.floor(anchor.right) + POP_GAP
    const flipped = Math.ceil(anchor.left) - POP_GAP - w
    if (right <= maxLeft) left = right
    else if (flipped >= minLeft) left = flipped
    else {
      const above = Math.ceil(anchor.top) - POP_GAP - h
      const below = Math.floor(anchor.bottom) + POP_GAP
      left = Math.round(anchor.left)
      if (above >= minTop) top = above
      else if (below <= maxTop) top = below
      else {
        left = bounds.right - anchor.right >= anchor.left - bounds.left ? right : flipped
        top = Math.round(anchor.top + (anchor.bottom - anchor.top - h) / 2)
      }
    }
    if (typeof top !== 'number') top = Math.round(anchor.top + (anchor.bottom - anchor.top - h) / 2)
  } else {
    // #94：预览区控件 —— 水平对齐锚点左缘；贴锚点下方，下方放不下翻上方。
    left = Math.round(anchor.left)
    const below = Math.floor(anchor.bottom) + POP_GAP
    const above = Math.ceil(anchor.top) - POP_GAP - h
    if (below >= minTop && below <= maxTop) top = below
    else if (above >= minTop && above <= maxTop) top = above
    else {
      top = bounds.bottom - anchor.bottom >= anchor.top - bounds.top
        ? Math.max(below, minTop)
        : Math.min(above, maxTop)
    }
  }
  left = Math.max(minLeft, Math.min(left, maxLeft))
  if (top < minTop) top = minTop
  if (top > maxTop) top = maxTop
  return { left: left, top: top }
}

// 预置载入转换（#87 可测接缝）：选基底 = 37 色 + 外观 + 基底名一次填好（loadPreset 经此转换再 setState）。
export function presetToSeed(p) {
  const src = (p && p.colors) || {}
  return { colors: Object.assign({}, src), appearance: p ? p.appearance : undefined, basePreset: p ? p.name : undefined }
}

// ── #95 取色器（PalettePicker）：调研驱动的重构版调色盘 ──
// 设计定稿（票内 resolution）：320×388 精确控制版 —— 标题（色位名 + hex 可点复制）/
// SV 面板 / 自绘横向色相轨（13 个 30° 常驻淡刻度 + focus-visible）/ H·S·V↔RGB↔HSL 数值行
// （模型按钮循环切换）/ 主题色 10 个（按分组优先级，R7）/ HEX + 吸管 + WCAG 对比度一行 /
// 透明行（仅 8 个背景槽）/ 取消·完成。
// 状态模型（R1 根治）：{h,s,v} 才是状态，hex 只是投影 —— 拖到黑/灰不再把色相反推成红；
// hex / 吸管 / 主题色回填一律走 mergeHsv（保留无意义维度）。
// 交互语义（R2）：任何改动即 live commit（onApply）；点弹板外 = 保留并关闭、Esc/取消 = 回滚
// （回滚由父组件 closePop(true) 负责，本组件只发取消信号）。
const PICK_SV_H = 136
const PICK_HUE_H = 14
const PICK_RECENT_MAX = 10
export function PalettePicker(props) {
  const h = props.h
  const e = h.createElement
  const tr = props.tr
  const trf = props.trf
  const allow = !!props.allowTransparent
  const value = props.value || { hex: '#000000', transparent: false }
  const startHex = normalizeHexInput(value.hex) || '#000000'
  function clamp01(n) { return Math.min(1, Math.max(0, n)) }
  function wrapH(n) { const x = Number(n); return isFinite(x) ? ((x % 360) + 360) % 360 : 0 }
  function clampPct(n) { const x = Number(n); return isFinite(x) ? Math.min(100, Math.max(0, x)) : 0 }
  const startHsv = hexToHsv(startHex)
  const [pick, setPick] = h.useState(function () {
    return { h: startHsv.h, s: startHsv.s, v: startHsv.v, transparent: !!value.transparent }
  })
  const [hexText, setHexText] = h.useState(value.transparent ? '' : startHex)
  const [hexError, setHexError] = h.useState(false)
  const [notice, setNotice] = h.useState('')
  const [model, setModel] = h.useState('hsv')
  const drag = h.useRef(null)
  const svRef = h.useRef(null)
  const hueRef = h.useRef(null)
  const curHex = pick.transparent ? '' : rgbToHex(hsvToRgb(pick))
  const rgb = hsvToRgb(pick)
  const hsl = hsvToHsl(pick)
  const refHex = normalizeHexInput(props.contrastRefHex)
  const ratio = refHex && !pick.transparent ? contrastRatio(curHex, refHex) : null
  const pure = hsvToHex({ h: pick.h, s: 100, v: 100 })
  const svCss = 'linear-gradient(to top,#000,rgba(0,0,0,0)),linear-gradient(to right,#fff,' + pure + '),linear-gradient(to top,#000,' + pure + ')'
  const stops = hueStops(100, 100)
  const hueCss = 'linear-gradient(to right,' + stops.map(function (c, i) { return c + ' ' + (i * 100 / 12).toFixed(2) + '%' }).join(',') + ')'
  const eyeOk = (function () {
    try { return typeof window !== 'undefined' && typeof window.EyeDropper === 'function' } catch (err) { return false }
  })()

  // 直接推进 HSV（拖拽/数值/色相轨）：h 由状态保留，S/V 用本次输入（不做 mergeHsv —— 那是 hex 回填专用）。
  function push(hsvNext, transparent) {
    const next = {
      h: wrapH(hsvNext.h), s: clampPct(hsvNext.s), v: clampPct(hsvNext.v),
      transparent: !!transparent,
    }
    const hex = rgbToHex(hsvToRgb(next))
    setPick(next)
    setHexText(next.transparent ? '' : hex)
    setHexError(false)
    setNotice('')
    if (typeof props.onApply === 'function') props.onApply(hex, next.transparent)
  }
  // hex / 吸管 / 主题色回填：走 mergeHsv 保留黑/灰时无意义的 h、s（R1）。
  function pushHex(parsed, transparent) {
    const hsv = mergeHsv(pick, hexToHsv(parsed.hex))
    setPick({ h: hsv.h, s: hsv.s, v: hsv.v, transparent: !!transparent })
    setHexText(transparent ? '' : parsed.hex)
    setHexError(false)
    setNotice(parsed.alphaDropped ? 'edAlphaDropped' : '')
    if (typeof props.onApply === 'function') props.onApply(parsed.hex, !!transparent)
  }
  function svFrom(ev) {
    const el = svRef.current
    if (!el || typeof el.getBoundingClientRect !== 'function') return
    const r = el.getBoundingClientRect()
    push({ h: pick.h, s: clamp01((ev.clientX - r.left) / (r.width || 1)) * 100, v: (1 - clamp01((ev.clientY - r.top) / (r.height || 1))) * 100 }, false)
  }
  function svDown(ev) {
    try { ev.preventDefault(); if (ev.currentTarget && ev.currentTarget.setPointerCapture) ev.currentTarget.setPointerCapture(ev.pointerId); drag.current = 'sv' } catch (err) { drag.current = 'sv' }
    svFrom(ev)
  }
  function svMove(ev) { if (drag.current !== 'sv') return; try { ev.preventDefault() } catch (err) { /* 忽略 */ } svFrom(ev) }
  function svUp(ev) { if (drag.current !== 'sv') return; drag.current = null; try { if (ev.currentTarget && ev.currentTarget.releasePointerCapture) ev.currentTarget.releasePointerCapture(ev.pointerId) } catch (err) { /* 忽略 */ } }
  function svKey(ev) {
    const step = ev.shiftKey ? 10 : 1
    const k = ev.key
    let ds = 0
    let dv = 0
    if (k === 'ArrowLeft') ds = -step
    else if (k === 'ArrowRight') ds = step
    else if (k === 'ArrowUp') dv = step
    else if (k === 'ArrowDown') dv = -step
    else return
    try { ev.preventDefault() } catch (err) { /* 忽略 */ }
    push({ h: pick.h, s: pick.s + ds, v: pick.v + dv }, false)
  }
  function hueFrom(ev) {
    const el = hueRef.current
    if (!el || typeof el.getBoundingClientRect !== 'function') return
    const r = el.getBoundingClientRect()
    push({ h: clamp01((ev.clientX - r.left) / (r.width || 1)) * 360, s: pick.s, v: pick.v }, false)
  }
  function hueDown(ev) {
    try { ev.preventDefault(); if (ev.currentTarget && ev.currentTarget.setPointerCapture) ev.currentTarget.setPointerCapture(ev.pointerId); drag.current = 'hue' } catch (err) { drag.current = 'hue' }
    hueFrom(ev)
  }
  function hueMove(ev) { if (drag.current !== 'hue') return; try { ev.preventDefault() } catch (err) { /* 忽略 */ } hueFrom(ev) }
  function hueUp(ev) { if (drag.current !== 'hue') return; drag.current = null; try { if (ev.currentTarget && ev.currentTarget.releasePointerCapture) ev.currentTarget.releasePointerCapture(ev.pointerId) } catch (err) { /* 忽略 */ } }
  function hueKey(ev) {
    const k = ev.key
    const step = ev.shiftKey ? 10 : 1
    let dh = 0
    if (k === 'ArrowLeft' || k === 'ArrowDown') dh = -step
    else if (k === 'ArrowRight' || k === 'ArrowUp') dh = step
    else if (k === 'PageDown') dh = -15
    else if (k === 'PageUp') dh = 15
    else if (k === 'Home') dh = -pick.h
    else if (k === 'End') dh = 360 - pick.h
    else return
    try { ev.preventDefault() } catch (err) { /* 忽略 */ }
    push({ h: pick.h + dh, s: pick.s, v: pick.v }, false)
  }
  function toggleTransparent(on) {
    const hex = rgbToHex(hsvToRgb(pick))
    setPick({ h: pick.h, s: pick.s, v: pick.v, transparent: !!on })
    setHexText(on ? '' : hex)
    setHexError(false)
    setNotice('')
    if (typeof props.onApply === 'function') props.onApply(hex, !!on)
  }
  function onHexChange(ev) {
    const raw = ev.target.value
    setHexText(raw)
    const parsed = parseHexInputLoose(raw)
    if (!parsed) { setHexError(raw.trim().length > 0); setNotice(''); return }
    pushHex(parsed, false)
  }
  function onHexBlur() {
    if (!parseHexInputLoose(hexText)) { setHexText(pick.transparent ? '' : curHex); setHexError(false) }
  }
  function copyHex() {
    try {
      const txt = pick.transparent ? 'transparent' : curHex
      const nb = typeof navigator !== 'undefined' ? navigator : null
      if (nb && nb.clipboard && typeof nb.clipboard.writeText === 'function') {
        const p = nb.clipboard.writeText(txt)
        if (p && typeof p.catch === 'function') p.catch(function () { /* 忽略 */ })
      }
    } catch (err) { /* 忽略：剪贴板不可用静默 */ }
  }
  function pickScreen() {
    try {
      const w = typeof window !== 'undefined' ? window : null
      if (!w || typeof w.EyeDropper !== 'function') return
      const ed = new w.EyeDropper()
      Promise.resolve(ed.open()).then(function (res) {
        const parsed = parseHexInputLoose(res && res.sRGBHex)
        if (!parsed) return
        pushHex(parsed, false)
      }).catch(function () { /* 用户取消/权限拒绝：静默 */ })
    } catch (err) { /* 非安全上下文等：静默降级到下方主题色 */ }
  }
  function cycleModel() {
    setModel(model === 'hsv' ? 'rgb' : (model === 'rgb' ? 'hsl' : 'hsv'))
  }
  function cancel() { if (typeof props.onCancel === 'function') props.onCancel() }
  function done() { if (typeof props.onDone === 'function') props.onDone() }
  const modelLabel = model === 'rgb' ? 'RGB' : (model === 'hsl' ? 'HSL' : 'HSV')
  const numStyle = {
    width: '100%', height: '26px', boxSizing: 'border-box', background: TK.panel, color: TK.text,
    border: '1px solid ' + TK.border, borderRadius: '6px', padding: '0 6px 0 16px', fontSize: '11px',
    textAlign: 'right',
  }
  const fields = model === 'rgb'
    ? [
        { k: 'r', label: 'R', aria: 'R', val: rgb.r, max: 255, set: function (n) { const next = rgbToHsv({ r: n, g: rgb.g, b: rgb.b }); push({ h: next.h, s: next.s, v: next.v }, false) } },
        { k: 'g', label: 'G', aria: 'G', val: rgb.g, max: 255, set: function (n) { const next = rgbToHsv({ r: rgb.r, g: n, b: rgb.b }); push({ h: next.h, s: next.s, v: next.v }, false) } },
        { k: 'b', label: 'B', aria: 'B', val: rgb.b, max: 255, set: function (n) { const next = rgbToHsv({ r: rgb.r, g: rgb.g, b: n }); push({ h: next.h, s: next.s, v: next.v }, false) } },
      ]
    : (model === 'hsl'
        ? [
            { k: 'h', label: 'H', aria: tr('edHue'), val: hsl.h, max: 360, set: function (n) { const next = hslToHsv({ h: n, s: hsl.s, l: hsl.l }); push({ h: next.h, s: next.s, v: next.v }, false) } },
            { k: 's', label: 'S', aria: tr('edSat'), val: hsl.s, max: 100, set: function (n) { const next = hslToHsv({ h: hsl.h, s: n, l: hsl.l }); push({ h: next.h, s: next.s, v: next.v }, false) } },
            { k: 'l', label: 'L', aria: tr('edLightness'), val: hsl.l, max: 100, set: function (n) { const next = hslToHsv({ h: hsl.h, s: hsl.s, l: n }); push({ h: next.h, s: next.s, v: next.v }, false) } },
          ]
        : [
            { k: 'h', label: 'H', aria: tr('edHue'), val: pick.h, max: 360, set: function (n) { push({ h: n, s: pick.s, v: pick.v }, false) } },
            { k: 's', label: 'S', aria: tr('edSat'), val: pick.s, max: 100, set: function (n) { push({ h: pick.h, s: n, v: pick.v }, false) } },
            { k: 'v', label: 'V', aria: tr('edVal'), val: pick.v, max: 100, set: function (n) { push({ h: pick.h, s: pick.s, v: n }, false) } },
          ])
  const ticks = []
  for (let i = 0; i < 13; i++) {
    ticks.push(e('span', {
      key: 't' + i, 'aria-hidden': 'true',
      style: { position: 'absolute', left: (i * 100 / 12).toFixed(4) + '%', top: '1px', width: '1px', height: '4px', background: 'rgba(255,255,255,0.55)', pointerEvents: 'none' },
    }))
  }
  return e('div', {
    'data-picker-part': 'root',
    style: { display: 'flex', flexDirection: 'column', gap: '6px', height: '100%', boxSizing: 'border-box', color: TK.text },
  },
    e('style', null, '.dpe-picker-focus:focus-visible{outline:2px solid ' + TK.accent + ';outline-offset:2px}'),
    e('div', { 'data-picker-part': 'title', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' } },
      e('h4', { style: { fontSize: '12px', margin: '0 0 8px' } }, props.label || ''),
      e('button', {
        'data-picker-part': 'copy', type: 'button', title: tr('edCopy'), 'aria-label': tr('edCopy'),
        onClick: copyHex,
        [UI_INTERACTIVE_ATTR]: TIER_BUTTON,
        style: { border: 'none', background: 'transparent', color: TK.text2, fontSize: '11px', fontFamily: 'Consolas,monospace', padding: '0 2px', cursor: 'pointer' },
      }, pick.transparent ? tr('edTransparent') : curHex)
    ),
    e('div', {
      'data-picker-part': 'sv', ref: svRef, role: 'group', tabIndex: 0,
      'aria-label': tr('edSat') + ' / ' + tr('edVal'), title: tr('edSvHint'),
      'aria-disabled': pick.transparent ? 'true' : undefined,
      onPointerDown: svDown, onPointerMove: svMove, onPointerUp: svUp, onKeyDown: svKey,
      className: 'dpe-picker-focus',
      [UI_INTERACTIVE_ATTR]: TIER_INPUT,
      style: {
        position: 'relative', width: '100%', height: PICK_SV_H + 'px', boxSizing: 'border-box',
        borderRadius: '8px', background: svCss, border: '1px solid #00000088',
        cursor: pick.transparent ? 'default' : 'crosshair', touchAction: 'none',
        opacity: pick.transparent ? 0.45 : 1,
      },
    },
      e('div', {
        'data-picker-part': 'sv-handle',
        style: {
          position: 'absolute', width: '12px', height: '12px', borderRadius: '50%',
          border: '2px solid #fff', boxShadow: '0 0 0 1px #000', pointerEvents: 'none',
          left: pick.s.toFixed(1) + '%', top: (100 - pick.v).toFixed(1) + '%',
          transform: 'translate(-6px,-6px)',
        },
      })
    ),
    e('div', {
      'data-picker-part': 'hue', ref: hueRef, role: 'slider', tabIndex: 0,
      'aria-label': tr('edHue'), 'aria-valuemin': 0, 'aria-valuemax': 360,
      'aria-valuenow': Math.round(pick.h),
      'aria-valuetext': trf('edHueAria', { v: Math.round(pick.h) }),
      onPointerDown: hueDown, onPointerMove: hueMove, onPointerUp: hueUp, onKeyDown: hueKey,
      className: 'dpe-picker-focus',
      [UI_INTERACTIVE_ATTR]: TIER_INPUT,
      style: {
        position: 'relative', width: '100%', height: PICK_HUE_H + 'px', boxSizing: 'border-box',
        borderRadius: '7px', background: hueCss, border: '1px solid #00000066',
        cursor: pick.transparent ? 'default' : 'pointer', touchAction: 'none',
        opacity: pick.transparent ? 0.45 : 1,
      },
    },
      ticks,
      e('div', {
        style: {
          position: 'absolute', top: '50%', left: (pick.h / 360 * 100).toFixed(4) + '%',
          width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #fff',
          boxShadow: '0 0 0 1px #000', transform: 'translate(-8px,-50%)', pointerEvents: 'none',
        },
      })
    ),
    e('div', { 'data-picker-part': 'hsv', style: { display: 'flex', alignItems: 'center', gap: '6px' } },
      e('button', {
        'data-picker-part': 'model', type: 'button', title: tr('edColorModel'), 'aria-label': tr('edColorModel'),
        onClick: cycleModel,
        [UI_INTERACTIVE_ATTR]: TIER_CHIP,
        style: { height: '26px', width: '38px', boxSizing: 'border-box', border: '1px solid ' + TK.border, background: TK.panel, color: TK.text2, borderRadius: '6px', fontSize: '11px', cursor: 'pointer', padding: 0 },
      }, modelLabel),
      fields.map(function (f) {
        return e('span', { key: 'nf-' + f.k, style: { position: 'relative', flex: 1, minWidth: 0, height: '26px', display: 'block' } },
          e('span', {
            'aria-hidden': 'true',
            style: { position: 'absolute', left: '6px', top: 0, lineHeight: '26px', fontSize: '9px', color: TK.text3, pointerEvents: 'none' },
          }, f.label),
          e('input', {
            key: 'n-' + f.k, type: 'number', min: 0, max: f.max, step: 1, value: String(Math.round(f.val)),
            'aria-label': f.aria,
            onChange: function (ev) { const n = Number(ev.target.value); if (isFinite(n)) f.set(n) },
            [UI_INTERACTIVE_ATTR]: TIER_INPUT,
            style: Object.assign({}, numStyle),
          })
        )
      })
    ),
    e('div', { 'data-picker-part': 'recent', style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
      e('div', { style: { fontSize: '11px', color: TK.text3 } }, tr('edFreq')),
      e('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, (Array.isArray(props.recent) ? props.recent : []).slice(0, PICK_RECENT_MAX).map(function (c, i) {
        return e('button', {
          key: 'rc-' + i, type: 'button', title: c, 'data-picker-recent-swatch': c,
          onClick: function () { const parsed = parseHexInputLoose(c); if (parsed) pushHex(parsed, false) },
          [UI_INTERACTIVE_ATTR]: TIER_SWATCH,
          style: { width: '20px', height: '20px', boxSizing: 'border-box', borderRadius: '4px', background: c, border: '1px solid #00000077', padding: 0, cursor: 'pointer' },
        })
      }))
    ),
    e('div', { 'data-picker-part': 'hex', style: { display: 'flex', alignItems: 'center', gap: '6px' } },
      e('input', {
        'data-picker-part': 'hex-input', value: hexText, spellCheck: false, placeholder: '#RRGGBB',
        'aria-label': 'HEX', 'aria-invalid': hexError ? 'true' : 'false',
        onChange: onHexChange, onBlur: onHexBlur,
        [UI_INTERACTIVE_ATTR]: TIER_INPUT,
        style: { minWidth: 0, flex: 1, height: '26px', boxSizing: 'border-box', background: TK.panel, color: TK.text, border: '1px solid ' + (hexError ? TK.danger : TK.border), borderRadius: '6px', padding: '0 8px', fontSize: '12px' },
      }),
      e('button', {
        'data-picker-part': 'eyedropper', type: 'button', title: eyeOk ? tr('edEyedropper') : tr('edEyedropperOff'),
        'aria-label': tr('edEyedropper'), disabled: !eyeOk, onClick: pickScreen,
        [UI_INTERACTIVE_ATTR]: TIER_BUTTON,
        style: { width: '28px', height: '26px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid ' + TK.border, background: TK.panel, color: eyeOk ? TK.text : TK.text3, cursor: eyeOk ? 'pointer' : 'default', fontSize: '13px', padding: 0 },
      }, e('span', {
        'aria-hidden': 'true',
        style: { display: 'inline-block', width: '13px', height: '13px', position: 'relative', transform: 'rotate(45deg)' },
      },
        e('span', { key: 'eye-bulb', style: { position: 'absolute', left: '3px', top: 0, width: '7px', height: '6px', borderRadius: '2px 2px 0 0', background: 'currentColor' } }),
        e('span', { key: 'eye-stem', style: { position: 'absolute', left: '5px', top: '6px', width: '3px', height: '5px', background: 'currentColor' } }),
        e('span', { key: 'eye-tip', style: { position: 'absolute', left: '4px', top: '11px', width: 0, height: 0, borderLeft: '2px solid transparent', borderRight: '2px solid transparent', borderTop: '3px solid currentColor' } })
      )),
      e('span', {
        'data-picker-part': 'contrast', title: tr('edContrast'),
        style: { minWidth: '58px', flex: '0 0 auto', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '11px', color: ratio !== null && ratio < 4.5 ? TK.dangerSoft : TK.text2, fontFamily: 'Consolas,monospace' },
      }, ratio === null ? '—' : (ratio.toFixed(1) + ':1' + (ratio < 4.5 ? ' ' + tr('edContrastLow') : '')))
    ),
    e('div', { 'data-picker-part': 'transparent', style: { height: '20px', display: 'flex', alignItems: 'center', gap: '6px' } },
      allow ? e('label', {
        style: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: TK.text2, cursor: 'pointer' },
        [UI_INTERACTIVE_ATTR]: TIER_SWITCH,
      },
        e('input', { type: 'checkbox', checked: pick.transparent, onChange: function (ev) { toggleTransparent(!!ev.target.checked) } }),
        tr('edTransparent')) : null,
      notice ? e('span', { style: { fontSize: '11px', color: TK.dangerSoft } }, tr(notice)) : null,
      hexError ? e('span', { style: { fontSize: '11px', color: TK.dangerSoft } }, tr('edInvalidHex')) : null
    ),
    e('div', { 'data-picker-part': 'footer', style: { display: 'flex', gap: '6px', alignItems: 'center', marginTop: 'auto' } },
      e('button', {
        type: 'button', onClick: cancel, [UI_INTERACTIVE_ATTR]: TIER_BUTTON,
        style: { flex: 1, height: '30px', boxSizing: 'border-box', background: 'transparent', color: TK.text, border: '1px solid ' + TK.border, borderRadius: '7px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' },
      }, tr('edCancel')),
      e('button', {
        type: 'button', onClick: done, [UI_INTERACTIVE_ATTR]: TIER_BUTTON,
        style: { flex: 1, height: '30px', boxSizing: 'border-box', background: TK.btnFill, border: '1px solid ' + TK.btnFill, color: TK.accentFg, borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
      }, tr('edDone'))
    )
  )
}

// props: {
//   h: { createElement, useState, useEffect, useMemo, useRef }, tr, trf,
//   groups: [{ id, keys }], groupMeta: { id: { zh, en } },
//   slotMeta: { key: { zh, en, useZh, useEn, allow } },
//   editor: { mode: 'new'|'edit', seed: { id, name, appearance, colors, basePreset } },
//   customs: [{ id, name, appearance, colors, basePreset }],
//   presets: [{ name, appearance, colors }],
//   presetGroups: [{ title, names: [presetName] }],
//   isActive: bool,
//   onSave(payload): Promise, onDelete(id): Promise, onClose()
// }
export function CustomEditor(props) {
  const h = props.h
  const e = h.createElement
  const tr = props.tr
  const trf = props.trf
  const lang = props.lang === 'en' ? 'en' : 'zh'
  //  verdict 长句按语言连接：中文无缝拼接，英文词间补空格（I18N 串本身不带首尾空格，词表可逐行对账）。
  function segJoin(parts) {
    if (lang !== 'en') return parts
    const out = []
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) out.push(' ')
      out.push(parts[i])
    }
    return out
  }
  const seed = (props.editor && props.editor.seed) || {}
  const mode = (props.editor && props.editor.mode) === 'edit' ? 'edit' : 'new'

  const [name, setName] = h.useState(typeof seed.name === 'string' ? seed.name : '')
  const [appearance, setAppearance] = h.useState(
    seed.appearance === 'light' || seed.appearance === 'system' ? seed.appearance : 'dark'
  )
  const [colors, setColors] = h.useState(Object.assign({}, seed.colors || {}))
  const [basePreset, setBasePreset] = h.useState(typeof seed.basePreset === 'string' ? seed.basePreset : 'opencode')
  const [origId] = h.useState(typeof seed.id === 'string' ? seed.id : null)
  const [targetSel, setTargetSel] = h.useState(typeof seed.id === 'string' ? seed.id : null)
  const [showPresets, setShowPresets] = h.useState(false)
  const [presetQuery, setPresetQuery] = h.useState('')
  const [pop, setPop] = h.useState(null) // { key, hex, transparent, orig: { hex, transparent } }
  const [popPos, setPopPos] = h.useState(null)
  const [presetPos, setPresetPos] = h.useState(null)
  const [hl, setHl] = h.useState(null)
  const [hovered, setHovered] = h.useState(null)
  // 预览小标签的视口坐标（用户 m08636 第 1 条：标签层级要高于预览区、不被所在容器裁掉）。
  // 原型把 badge 挂到 document.body 并 position:fixed（prototype.html:906-919），
  // 这里等价地做成 fixed 覆盖层元素（fixed 不被祖先 overflow 裁剪），坐标由 effect 量第一个命中节点得出。
  const [badgeAt, setBadgeAt] = h.useState(null)
  // 左列小标签的长名夹紧量（原型 paintHl:929-930 的 row.clientWidth 夹紧；默认 0 = 紧贴标题右侧）
  const [rowShift, setRowShift] = h.useState(0)
  const [delConfirm, setDelConfirm] = h.useState(false)
  const [sysDark, setSysDark] = h.useState(function () {
    try {
      const w = typeof window !== 'undefined' ? window : null
      const mm = w && typeof w.matchMedia === 'function'
        ? w.matchMedia('(prefers-color-scheme: dark)')
        : null
      return mm ? !!mm.matches : true
    } catch (err) { return true }
  })
  const presetBtnRef = h.useRef(null)
  const dlgRef = h.useRef(null)
  const miniRef = h.useRef(null)
  const rowRef = h.useRef(null)
  const nameRef = h.useRef(null)
  const targetRef = h.useRef(null)
  const rrightRef = h.useRef(null)
  // 编辑态下拉「按选中项文字定宽」+ 左列 .nm 齐宽（原型 fitWidth 口径：prototype.html:750-799 的这两段仍在）。
  // 名字区与弹窗总宽已交回 CSS（定宽名字区 + width:max-content），见下方注释（用户 m09582 需求 1）。
  h.useEffect(function () {
    try {
      const dlg = dlgRef.current
      if (!dlg) return
      const doc = (typeof document !== 'undefined') ? document : null
      const win = (typeof window !== 'undefined') ? window : null
      if (!doc || !win || !doc.createElement || !doc.body || !win.getComputedStyle) return
      const textW = function (txt, cs) {
        const m = doc.createElement('span')
        m.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:' + cs.fontSize + ';font-family:' + cs.fontFamily + ';font-weight:' + cs.fontWeight
        m.textContent = txt
        doc.body.appendChild(m)
        const w = m.offsetWidth
        m.remove()
        return w
      }
      const sel = targetRef.current
      if (sel && sel.options && sel.options.length) {
        const selTxt = sel.options[sel.selectedIndex >= 0 ? sel.selectedIndex : 0].text
        const cs = win.getComputedStyle(sel)
        const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth)
        let sw = textW(selTxt, cs) + padX + 26
        sel.style.flex = 'none'; sel.style.minWidth = '0'; sel.style.maxWidth = 'none'
        sw = Math.max(80, Math.min(220, sw))
        sel.style.width = sw + 'px'
        let guard = 0
        while (guard++ < 5 && sel.scrollWidth > sel.clientWidth + 1 && sw < 240) { sw += 8; sel.style.width = sw + 'px' }
      }
      // 名字区自 m09582 起是定宽区（CSS flex 分配，见 NAME_ZONE_W），输入框宽度与弹窗总宽都不再量字设定：
      // 原型 fitWidth 的这两段（prototype.html:782-788 量字定输入框宽、:790-799 累加定 dlg 宽）已失效且有害 ——
      // 累加里含输入框的即时宽度，会把「名字越长弹窗越窄」带回来（实测 dlg 722~882 随名字跳、顶行溢出 106~230px）。
      // 现在弹窗宽交给 CSS width:max-content（名字区已定值，max-content 实测恒定），顶行不再溢出。
      const nms = dlg.querySelectorAll('.nm')
      if (nms && nms.length) {
        let mw = 0
        Array.prototype.forEach.call(nms, function (x) { mw = Math.max(mw, x.offsetWidth || 0) })
        if (mw > 0) Array.prototype.forEach.call(nms, function (x) { x.style.width = mw + 'px' })
      }
    } catch (err) { /* 量字失败保持 CSS 回落 */ }
  }, [name, targetSel, mode, basePreset, appearance, lang,
    (props.customs || []).length, (props.presets || []).length])
  const rowRefs = h.useRef({})
  const leftColRef = h.useRef(null)
  const svDrag = h.useRef(null)

  // 预览小标签定位 + 左列小标签夹紧（原型 paintHl 尾部 :903-934 口径）。
  // 预览标签：锚点 = 预览里第一个命中 hl 的元素（没有 data-slot 命中时取第一个焦点圈元素，等价 matches[0] || extras[0]）；
  // 挂 fixed 覆盖层，永不进预览容器，因此不会被 .mini{overflow:hidden} 或滚动列裁掉。
  // 宽度用等宽 10px 估算（原型量字后回落 90，同为估算；估算只影响左右贴合度，不影响可见性）。
  // 左列标签：原型按 row.clientWidth 夹紧（:929-930），这里同样把越界量算成左移像素，避免长色位名顶出列表被 overflow 裁掉。
  h.useEffect(function () {
    try {
      const win = typeof window !== 'undefined' ? window : null
      const mini = miniRef.current
      const dlg = dlgRef.current
      if (!hl) { setBadgeAt(null); setRowShift(0); return }
      if (win && mini && typeof mini.querySelector === 'function') {
        const direct = mini.querySelector('[data-slot="' + hl + '"]')
        const el = direct || mini.querySelector('.' + HL_CLS)
        if (el && typeof el.getBoundingClientRect === 'function') {
          const r = el.getBoundingClientRect()
          const bw = String(hl).length * 6.4 + 12
          const small = r.width < bw + 12
          let top = r.top - 9
          let left = small ? r.right + 6 : r.right - bw + 6
          if (top < 28) top = r.top + 4
          if (dlg && typeof dlg.getBoundingClientRect === 'function') {
            const dr = dlg.getBoundingClientRect()
            if (top < dr.top + 4) top = r.top + 4
          }
          if (left < 4) left = 4
          const vw = win.innerWidth || 0
          if (vw && left + bw > vw - 4) left = vw - bw - 4
          setBadgeAt({ top: Math.round(top), left: Math.round(left) })
        } else setBadgeAt(null)
      } else setBadgeAt(null)
      // 行标签夹紧：量到的是「已左移」后的位置，先加回 rowShift 还原，再按行边界重算（自洽，不累积漂移）
      let shift = 0
      const rowEl = dlg && typeof dlg.querySelector === 'function' ? dlg.querySelector('[data-row="' + hl + '"]') : null
      const keyEl = rowEl && rowEl.querySelector ? rowEl.querySelector('.dspe-keypop') : null
      if (rowEl && keyEl && typeof rowEl.getBoundingClientRect === 'function') {
        const rr = rowEl.getBoundingClientRect()
        const kr = keyEl.getBoundingClientRect()
        const unRight = kr.right + rowShift
        const unLeft = kr.left + rowShift
        if (unRight > rr.right - 4) shift = unRight - (rr.right - 4)
        if (unLeft - shift < rr.left + 4) shift = unLeft - (rr.left + 4)
        shift = Math.max(0, Math.round(shift))
      }
      setRowShift(shift)
    } catch (err) { setBadgeAt(null); setRowShift(0) }
  }, [hl, colors, appearance, sysDark]) // 不直接依赖 miniLight：它在组件体后段才声明，此处求值会踩 TDZ；appearance/sysDark 是它的全部输入，等价

  // 跟随系统：监听 OS 明暗翻转重绘预览（原型 matchMedia 口径）
  h.useEffect(function () {
    try {
      const w = typeof window !== 'undefined' ? window : null
      if (!w || typeof w.matchMedia !== 'function') return undefined
      const mq = w.matchMedia('(prefers-color-scheme: dark)')
      const fn = function (ev) { setSysDark(!!(ev && ev.matches)) }
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', fn)
      else if (typeof mq.addListener === 'function') mq.addListener(fn)
      return function () {
        if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', fn)
        else if (typeof mq.removeListener === 'function') mq.removeListener(fn)
      }
    } catch (err) { return undefined }
  }, [])

  // 点弹窗外关闭 Popover（#95 语义：调色板内部 live commit，点外面 = 保留颜色直接关闭；
  // 回滚只走 Esc/取消。预置弹窗仍是直接收起）
  h.useEffect(function () {
    if (!pop && !showPresets) return undefined
    const onDown = function (ev) {
      try {
        const t = ev.target
        const inPop = t && t.closest && (t.closest('#pop') || t.closest('#presetPop') || t.closest('#f-presetbtn'))
        if (inPop) return
        const root = dlgRef.current
        if (root && root.contains && !root.contains(t)) {
          if (pop) closePop(false)
          else setShowPresets(false)
          return
        }
        // 对话框内、弹窗外：#94 起预览区 [data-slot] 控件与 #93 起左列色块入口
        // [data-slot-row] 都是「调色盘入口」——点它们不算「点外面」：同入口再点保持弹板，
        // 换入口由 openPop 换锚重定位。#95 起调色板内部 live commit，点其余区域 = 保留颜色直接关闭
        //（R2：改完色去点下一个位置，不能把刚调的色静默回滚；回滚只走 Esc/取消）。
        const keepOpen = t && t.closest && (t.closest('[data-slot]') || t.closest('[data-slot-row]'))
        if (pop && !keepOpen) closePop(false)
        else if (!pop && showPresets) setShowPresets(false)
      } catch (err) { /* 忽略 */ }
    }
    try {
      const d = typeof document !== 'undefined' ? document : null
      if (!d || typeof d.addEventListener !== 'function') return undefined
      d.addEventListener('mousedown', onDown)
      return function () { d.removeEventListener('mousedown', onDown) }
    } catch (err) { return undefined }
  }, [pop ? pop.key : null, showPresets])

  // Esc = 取消并回滚（#95 R2 语义；点弹板外 = 保留关闭，两者分工见上）。
  h.useEffect(function () {
    if (!pop) return undefined
    const onKey = function (ev) {
      try {
        if (ev && (ev.key === 'Escape' || ev.key === 'Esc')) closePop(true)
      } catch (err) { /* 忽略 */ }
    }
    try {
      const d = typeof document !== 'undefined' ? document : null
      if (!d || typeof d.addEventListener !== 'function') return undefined
      d.addEventListener('keydown', onKey)
      return function () { d.removeEventListener('keydown', onKey) }
    } catch (err) { return undefined }
  }, [pop ? pop.key : null])

  // Popover 定位（#94 / #93）：两个入口都锚定被点元素——
  //  · 预览区控件：pop.preferSide=PLACE_BELOW，贴被点元素下方（规则见 popoverPosition）；
  //  · 左列色块入口：pop.preferSide=PLACE_RIGHT，贴该行色块右侧垂直居中；
  //    边界 = 视口 ∩ 弹窗；锚点已从 DOM 移除 → 安全收起，不回滚已调颜色；
  //    弹窗内滚动 / 窗口 resize 时重算。
  h.useEffect(function () {
    if (!pop) { setPopPos(null); return undefined }
    const w = typeof window !== 'undefined' ? window : null
    const d = typeof document !== 'undefined' ? document : null
    function place() {
      try {
        const vw = (w && w.innerWidth) || 1280
        const vh = (w && w.innerHeight) || 900
        // 两个入口（预览控件 / 左列色块）都携带锚点，见 openPop 调用点。
        // 锚点已从 DOM 移除：安全收起（票面「锚点失效」口径）
        if (pop.anchor.isConnected === false) { setPop(null); return }
        if (!w || typeof pop.anchor.getBoundingClientRect !== 'function') { setPopPos(POP_FALLBACK); return }
        const ar = pop.anchor.getBoundingClientRect()
        let bounds = { left: 0, top: 0, right: vw, bottom: vh }
        const dlg = dlgRef.current
        if (dlg && typeof dlg.getBoundingClientRect === 'function') {
          const dr = dlg.getBoundingClientRect()
          bounds = {
            left: Math.max(0, dr.left), top: Math.max(0, dr.top),
            right: Math.min(vw, dr.right), bottom: Math.min(vh, dr.bottom),
          }
        }
        const pos = popoverPosition(ar, bounds, { width: POP_W, height: POP_H }, pop.preferSide) || POP_FALLBACK
        setPopPos({ left: pos.left, top: pos.top })
      } catch (err) { setPopPos(POP_FALLBACK) }
    }
    place()
    if (!w || typeof w.addEventListener !== 'function') return undefined
    w.addEventListener('resize', place)
    if (d && typeof d.addEventListener === 'function') d.addEventListener('scroll', place, true)
    return function () {
      w.removeEventListener('resize', place)
      if (d && typeof d.removeEventListener === 'function') d.removeEventListener('scroll', place, true)
    }
  }, [pop ? pop.key : null, pop ? pop.anchor : null])

  // 预置弹窗定位（原型 openPresetPop 口径：fixed，宽 560，锚定选基底按钮）
  h.useEffect(function () {
    if (!showPresets) { setPresetPos(null); return }
    try {
      const w = typeof window !== 'undefined' ? window : null
      if (!w) { setPresetPos({ left: 10, top: 140 }); return }
      const W = 560
      const vw = w.innerWidth || 1280
      const vh = w.innerHeight || 900
      const btn = presetBtnRef.current
      const r = btn && typeof btn.getBoundingClientRect === 'function' ? btn.getBoundingClientRect() : null
      const left = Math.min(Math.max(10, vw - W - 20), Math.max(10, r ? r.left : vw / 2 - W / 2))
      const top = Math.min(Math.max(10, vh - 430), Math.max(10, r ? r.bottom + 6 : 140))
      setPresetPos({ left: Math.round(left), top: Math.round(top) })
    } catch (err) { setPresetPos({ left: 10, top: 140 }) }
  }, [showPresets])

  // 预览底盘跟编辑器外观走（原型 effAppearance/renderMini 口径），不是只跟 OS。
  const miniLight = editorMiniLight(appearance, sysDark)
  const eff = function (key) { return effectiveSlotColor(key, colors, miniLight) }

  function setColor(key, hex, transparent) {
    setColors(function (prev) {
      const next = Object.assign({}, prev)
      if (transparent) {
        // 仅 8 背景槽可设透明（其余回 FB，保持预览与宿主归一化一致）
        const allow = props.slotMeta && props.slotMeta[key] && props.slotMeta[key].allow
        next[key] = allow ? 'transparent' : effectiveSlotColor(key, prev, false)
      } else {
        next[key] = hex
      }
      return next
    })
  }

  function openPop(key, anchorEl, preferSide) {
    const raw = colors[key]
    const norm = normalizeHexInput(raw)
    const anchor = anchorEl || null
    // 首选方向（#93）：左列色块入口贴右侧；预览控件默认贴下方。
    const place = preferSide === PLACE_RIGHT ? PLACE_RIGHT : PLACE_BELOW
    // #94：同一入口再点一次 = 弹板保持原位、保留编辑中的颜色（不重放定位/不闪）；
    // 换锚点才清旧坐标 —— renderPop「没定位就不渲染」，避免旧位置闪一帧。
    if (pop && pop.key === key && pop.anchor === anchor && popPos) return
    setPopPos(null)
    setPop({
      key: key,
      hex: norm || effectiveSlotColor(key, colors, false),
      transparent: raw === 'transparent',
      orig: { hex: norm || effectiveSlotColor(key, colors, false), transparent: raw === 'transparent' },
      anchor: anchor,
      preferSide: place,
    })
    setShowPresets(false) // 原型 OPEN_POP 口径：开调色板时收起预置弹窗
    setHl(key)
  }

  function closePop(revert) {
    if (revert && pop) {
      const o = pop.orig
      setColor(pop.key, o.hex, o.transparent)
    }
    setPop(null)
  }

  // 左列定位（原型 scrollToRow 口径：prototype.html:936-938 = block center + behavior smooth）。
  function scrollToRow(key) {
    try {
      const row = rowRefs.current[key]
      if (row && typeof row.scrollIntoView === 'function') row.scrollIntoView({ block: 'center', behavior: 'smooth' })
    } catch (err) { /* 忽略 */ }
  }

  // 预览 → 左列联动（用户 m09226）：行已在视野里就不动，否则按原型口径滑到可见。
  function revealRow(key) {
    try {
      const row = rowRefs.current[key]
      if (!row) return
      const col = leftColRef.current
      if (col && typeof col.getBoundingClientRect === 'function' && typeof row.getBoundingClientRect === 'function') {
        if (!needsReveal(col.getBoundingClientRect(), row.getBoundingClientRect(), REVEAL_PAD)) return
      }
      scrollToRow(key)
    } catch (err) { /* 忽略 */ }
  }

  function clickSlot(key, anchorEl) {
    // #94：点预览控件 → 以被点元素为锚原地开弹板（不再把弹板夹到预览区左侧）；
    // 左列联动只在该行不可见时滚动露出（取消强制居中，见 revealRow）。
    if (props.slotMeta && props.slotMeta[key]) {
      revealRow(key)
      openPop(key, anchorEl)
    }
  }

  function loadPreset(p) {
    const seed = presetToSeed(p)
    setColors(seed.colors)
    setAppearance(seed.appearance)
    setBasePreset(seed.basePreset)
    setShowPresets(false)
    setPresetQuery('')
  }

  function switchTarget(id) {
    const found = (props.customs || []).filter(function (t) { return t.id === id })[0]
    if (!found) return
    setTargetSel(id)
    setName(found.name)
    setAppearance(found.appearance)
    setColors(Object.assign({}, found.colors))
    setBasePreset(found.basePreset || 'opencode')
    setDelConfirm(false)
  }

  const canSave = name.trim().length > 0

  function handleSave() {
    if (!canSave) return
    props.onSave({
      id: mode === 'edit' ? (targetSel || origId) : null,
      name: name.trim(),
      appearance: appearance,
      colors: colors,
      basePreset: basePreset,
    })
  }

  // ── 左列：37 色位行（原型 .gtitle/.crow 口径：名→sw→hex；组级可设透明旗）──
  const leftRows = []
  for (const g of props.groups || []) {
    const gm = (props.groupMeta && props.groupMeta[g.id]) || { zh: g.id, en: g.id }
    const hasTrans = g.keys.some(function (k) { return props.slotMeta && props.slotMeta[k] && props.slotMeta[k].allow })
    leftRows.push(e('div', {
      key: 'g-' + g.id,
      style: { fontSize: '12px', color: '#9D7CD8', margin: leftRows.length === 0 ? '0 0 6px' : '10px 0 6px' },
    }, lang === 'en' ? gm.en : gm.zh, hasTrans ? e('span', {
      style: { fontSize: '10px', color: 'var(--dsw-alias-state-success-primary, #7FD88F)', border: '1px solid var(--dsw-alias-state-success-secondary, #3D9A57)', borderRadius: '4px', padding: '0 6px', marginLeft: '6px', whiteSpace: 'nowrap' },
    }, tr('edTransparentFlag')) : null))
    for (const key of g.keys) {
      const meta = (props.slotMeta && props.slotMeta[key]) || { zh: key, en: key, useZh: '', useEn: '', allow: false }
      const raw = colors[key]
      const isTrans = raw === 'transparent'
      const shown = (isTrans ? eff(key) : (normalizeHexInput(raw) || eff(key))).toUpperCase()
      const label = lang === 'en' ? meta.en : meta.zh
      const use = lang === 'en' ? meta.useEn : meta.useZh
      const swStyle = isTrans
        ? { background: 'repeating-linear-gradient(45deg,#888 0 4px,#fff 4px 8px)' }
        : { background: shown }
      const isTarget = hl === key
      const isHovered = hovered === key && !isTarget
      leftRows.push(e('div', {
        key: 'row-' + key, 'data-row': key,
        ref: function (el) { rowRefs.current[key] = el },
        onMouseEnter: function () { setHl(key); setHovered(key) },
        onMouseLeave: function () { if (!pop || pop.key !== key) setHl(null); setHovered(null) },
        style: {
          display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: '6px', padding: '5px 4px',
          border: '1px solid ' + (isTarget ? TK.accent : (isHovered ? 'var(--dsw-alias-border-l2-darkmode-thin, #2A2A31)' : 'transparent')), borderRadius: '8px',
          background: isTarget ? 'var(--dsw-alias-interactive-bg-hover-accent, #1E1A14)' : (isHovered ? TK.hover : 'transparent'),
          cursor: 'default', position: 'relative',
        },
      },
        e('div', { className: 'nm', style: { flex: '0 1 auto', minWidth: 0 } },
          // 标题控件与小标签同一相对定位盒（用户 m08636 第 3 条：标签贴标题控件右侧）。
          // 原型是量字后 absolute 定位（paintHl:928 `b.offsetLeft + b.offsetWidth + 6`，按 row.clientWidth 夹紧）；
          // 这里用 inline-block 包裹 + left:100% 免量字等价实现，垂直居中于标题行。
          e('span', { style: { position: 'relative', display: 'inline-block', maxWidth: '100%' } },
            e('b', { style: { display: 'inline-block', maxWidth: '100%', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'top', cursor: 'default' } }, label),
            isTarget ? e('span', {
              className: 'dspe-keypop',
              style: {
                position: 'absolute', left: 'calc(100% + 6px)', top: '50%',
                transform: 'translate(' + (-rowShift) + 'px, -50%)',
                background: TK.accent, color: TK.accentFg, fontSize: '10px', fontFamily: 'Consolas,monospace',
                borderRadius: '4px', padding: '0 6px', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 4,
              },
            }, key) : null
          ),
          e('small', { style: { display: 'block', fontSize: '11px', color: 'var(--dsw-alias-label-tertiary, #A0A0A8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'default' } }, use)),
        e('button', {
          'data-slot-row': key,
          title: tr('edPickTitle'),
          onClick: function (ev) { openPop(key, ev.currentTarget, PLACE_RIGHT) },
          [UI_INTERACTIVE_ATTR]: TIER_SWATCH,
          style: Object.assign({
            width: '30px', height: '22px', borderRadius: '6px', cursor: 'pointer', flex: 'none', padding: 0,
            border: '1px solid #00000066',
          }, swStyle),
        }),
        e('span', { style: { fontFamily: 'Consolas,monospace', fontSize: '11px', color: 'var(--dsw-alias-label-secondary, #C8C8D0)', minWidth: 0, flex: 'none' } }, shown),
      ))
    }
  }

  // ── 取色器 Popover（#95）──
  // 内部交给 PalettePicker（可独立 SSR 的展示组件），外层只负责 fixed 定位、实时提交与关闭语义。
  function renderPop() {
    // 没定位就不渲染：定位是异步 effect，先按兜底位渲染会在屏幕左上角闪一帧再跳（用户 m10028）。
    if (!pop || !popPos) return null
    const meta = (props.slotMeta && props.slotMeta[pop.key]) || { zh: pop.key, en: pop.key, allow: false }
    // 主题色按分组优先级排序（R7：品牌/语法色不再被 8 个背景色挤掉），跳过当前槽自身（pickRecentColors 内处理）。
    const priority = []
    const groups = props.groups || []
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].id === 'bg') continue
      for (let j = 0; j < groups[i].keys.length; j++) priority.push(groups[i].keys[j])
    }
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].id !== 'bg') continue
      for (let j = 0; j < groups[i].keys.length; j++) priority.push(groups[i].keys[j])
    }
    const recent = pickRecentColors(colors, pop.key, priority, PICK_RECENT_MAX)
    // WCAG 对比度基准槽：文字对背景、背景槽对文字、其余对面板（与 map-dsh 语义一致）。
    const refHex = effectiveSlotColor(contrastRefSlot(pop.key), colors, false)
    return e('div', {
      key: 'pop', id: 'pop', 'data-key': pop.key,
      style: Object.assign({
        // #95：取色器盒外框（border-box + 显式宽高 = 定位常量同源，两者恒等）。
        position: 'fixed', zIndex: 60, boxSizing: 'border-box', width: POP_W + 'px', height: POP_H + 'px', background: TK.pop,
        border: '1px solid ' + TK.borderStrong, borderRadius: '10px', padding: '12px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
      }, popPos),
    },
      e(PalettePicker, {
        h: h, tr: tr, trf: trf, lang: lang,
        label: lang === 'en' ? meta.en : meta.zh,
        slotKey: pop.key,
        allowTransparent: !!meta.allow,
        value: { hex: pop.hex, transparent: pop.transparent },
        colors: colors,
        recent: recent,
        contrastRefHex: refHex,
        // 任何改动即 live commit（R2）：颜色已写进编辑中的主题，关闭时不再回滚。
        onApply: function (hex, transparent) {
          setColor(pop.key, hex, transparent)
          setPop(function (prev) { return prev ? Object.assign({}, prev, { hex: hex, transparent: transparent }) : prev })
        },
        onCancel: function () { closePop(true) },
        onDone: function () { closePop(false) },
      })
    )
  }

  // ── 预置主题 Popover ──
  function renderPresetPop() {
    // 同上：定位（异步 effect）没算出来之前不渲染，避免「左上角闪一帧再跳到选基底按钮下方」。
    if (!showPresets || !presetPos) return null
    const q = presetQuery.trim().toLowerCase()
    const match = function (n) {
      if (!q) return true
      const hay = (n + ' ' + presetLabelOf(n)).toLowerCase()
      return hay.indexOf(q) >= 0
    }
    const findPreset = presetByName
    const visGroups = (props.presetGroups || []).map(function (g) {
      return { g: g, names: (g.names || []).filter(match) }
    }).filter(function (x) { return x.names.length > 0 })
    return e('div', {
      key: 'presetpop', id: 'presetPop',
      style: Object.assign({
        position: 'fixed', zIndex: 60, width: '560px', maxWidth: '94vw',
        background: TK.pop, border: '1px solid ' + TK.borderStrong, borderRadius: '10px',
        padding: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
      }, presetPos),
    },
      e('input', {
        value: presetQuery, placeholder: tr('edPresetSearch'),
        onChange: function (ev) { setPresetQuery(ev.target.value) },
        [UI_INTERACTIVE_ATTR]: TIER_INPUT,
        style: { width: '100%', boxSizing: 'border-box', background: TK.panel, color: TK.text, border: '1px solid ' + TK.border, borderRadius: '6px', padding: '6px 10px', fontSize: '12px', marginBottom: '8px' },
      }),
      e('div', { style: { maxHeight: '280px', overflow: 'auto', background: TK.panel, border: '1px solid ' + TK.border, borderRadius: '8px', padding: '8px 10px' } },
        visGroups.map(function (x, gi) {
          const g = x.g
          const names = x.names
          const gcolor = g.color || TK.text3
          return e('div', { key: 'pg-' + g.title, style: { marginBottom: gi < visGroups.length - 1 ? '10px' : '0' } },
            e('div', { style: { display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: TK.text2, marginBottom: '6px' } },
              e('span', { style: { width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', background: gcolor } }),
              g.title,
              e('span', { style: { fontSize: '11px', color: TK.text2 } }, String((g.names || []).length))),
            e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } }, names.map(function (n) {
              const p = findPreset(n)
              const cc = (p && p.colors) || {}
              const transBg = cc.background === 'transparent'
              const bg = transBg ? '#FFFFFF' : (n === 'system' ? '#0A0A0A' : hexOr(cc.background, '#0A0A0A'))
              const fg = transBg ? '#1A1A1A' : hexOr(cc.text, '#E7E7EA')
              const dot = n === 'system' ? '#8B8B95' : hexOr(cc.primary, '#555')
              const psel = basePreset === n
              const label = presetLabelOf(n)
              return e('button', {
                key: 'pp-' + n,
                title: lang === 'en' ? 'Use "' + label + '" as base' : '以「' + label + '」为基底',
                onClick: function () { if (p) loadPreset(p) },
                [UI_INTERACTIVE_ATTR]: TIER_CHIP,
                style: {
                  display: 'inline-flex', alignItems: 'center', gap: '5px', background: bg, color: fg,
                  border: (psel ? '2px solid ' + TK.accent : '1px solid ' + dot), borderRadius: '6px',
                  padding: '3px 8px 3px 5px', margin: psel ? '-1px' : '0',
                  fontSize: '11px', fontFamily: 'Consolas,Menlo,monospace', cursor: 'pointer', whiteSpace: 'nowrap',
                  outline: psel ? '1px solid ' + TK.accent : undefined,
                },
              },
                e('span', { style: { width: '9px', height: '9px', borderRadius: '50%', display: 'inline-block', flex: 'none', background: dot } }),
                label,
                e('i', { style: { fontStyle: 'normal', fontWeight: 700, color: TK.accent, visibility: psel ? 'visible' : 'hidden' } }, ICON_CHECK))
            })))
        }))
    )
  }

  // 透明文本回退（原型 tx 口径：transparent 正文→灰，底盘透明另走 hexOrTrans）
  const txOf = function (v) {
    if (v === 'transparent') return miniLight ? '#6E6E78' : '#8B8B95'
    return normalizeHexInput(v) || v
  }
  // 高亮字（原型 pickText 口径：prototype.html:877-883，按亮度取深/浅字）
  const pickTextOn = function (hex) {
    const n = normalizeHexInput(hex)
    if (!n) return '#141414'
    const r = parseInt(n.slice(1, 3), 16), g = parseInt(n.slice(3, 5), 16), b = parseInt(n.slice(5, 7), 16)
    return ((0.299 * r + 0.587 * g + 0.114 * b) / 255) > 0.6 ? '#141414' : '#F4F4F5'
  }
  // md 底盘透明回退（原型 slotBg 口径：backgroundPanel 回退 #16161A，不是 #232329）
  const mdBg = colors.backgroundPanel === 'transparent' ? (miniLight ? '#F7F7F8' : '#16161A') : colors.backgroundPanel

  // ── 右侧：微缩 DSH 仿真画布（原型 renderMini 口径：side + main + bubble + md + code + diff + brow + cinput）──
  function renderMini() {
    // node 与纯 span 共用同一处描边判定（用户 m08636 第 4 条：37 个色位命中的每一个预览元素都要被圈住；
    // 此前只有 node 会圈，纯 span 命中被漏掉）
    const ringOf = function (slot) { return slotRingStyle(hl, slot) }
    const ringStyle = function (slot) { return ringOf(slot) || undefined }
    const ringCls = function (slot) { return ringOf(slot) ? HL_CLS : undefined }
    // 可点文本 span 的合并样式（#94：t() 与三处裸 span 共用；ring 覆盖 cursor 之外的描边键）。
    const clickableSpanStyle = function (slot, base) {
      return Object.assign({ cursor: 'pointer' }, base || {}, ringStyle(slot) || {})
    }
    // 预览里每个 data-slot 元素都自己吃 hover（原型 :743 口径：`#mini [data-slot]` 全绑），
    // 这样 hl 跟着「最内层命中元素」走（用户 m08636 第 4 条），并联动左列滚动（用户 m09226）。
    // #94：同时是弹板入口 —— 点击把被点 DOM 元素当锚点交给 clickSlot（37 色位元素全可点）。
    const bindSlot = function (slot) {
      return {
        onMouseEnter: function () { setHl(slot); revealRow(slot) },
        onMouseLeave: function () { if (!pop || pop.key !== slot) setHl(null) },
        onClick: function (ev) { try { ev.stopPropagation() } catch (err) { /* 忽略 */ } clickSlot(slot, ev.currentTarget) },
        [UI_INTERACTIVE_ATTR]: TIER_INPUT,
      }
    }
    const node = function (slot, style, children, extra) {
      const ring = ringOf(slot)
      const props2 = Object.assign({
        'data-slot': slot,
        className: ring ? HL_CLS : undefined,
        style: Object.assign({ cursor: 'pointer', position: 'relative' }, style, ring),
      }, bindSlot(slot), extra || {})
      // 小标签不再挂在节点内（用户 m08636 第 1 条：会被 .mini{overflow:hidden} 与滚动列裁掉）；
      // 改由弹窗根的 fixed 覆盖层统一渲染，锚点定位见 badgeAt effect。
      return e('div', props2, children)
    }
    // 原型文本 span 口径：data-slot 透出定位；#94 起文本也全部可点（点击原地开弹板），
    // 悬浮与焦点圈全绑（原型 :743 的 `#mini [data-slot]`）：悬浮联动左列、命中即圈。
    // 用户 m08636 第 4 条：像 text 这种被一整句话多处引用的色位，预览里每个组成部分都要被圈住。
    const t = function (slot, s, key) {
      return e('span', Object.assign({ key: key, 'data-slot': slot, className: ringCls(slot), style: clickableSpanStyle(slot) }, bindSlot(slot)), s)
    }
    const codeLines = [
      { t: '// comment ', s: 'syntaxComment' }, { t: 'const ', s: 'syntaxKeyword' },
      { t: 'run', s: 'syntaxFunction' }, { t: ' = ', s: 'syntaxOperator' },
      { t: 'Theme', s: 'syntaxType' }, { t: ' 37', s: 'syntaxNumber' },
      { t: ' ', s: null }, { t: '"ok"', s: 'syntaxString' }, { t: '\n', s: null },
      { t: 'return ', s: 'syntaxKeyword' }, { t: '"done"', s: 'syntaxString' },
      { t: ';', s: 'syntaxOperator' },
    ]
    const bgRaw = colors.background
    const bgRes = bgRaw === 'transparent' ? (miniLight ? '#FFFFFF' : '#101014') : (normalizeHexInput(bgRaw) || '#101014')
    const miniInv = pickTextOn(bgRes) === '#141414'
    return e('div', {
      ref: miniRef,
      style: {
        position: 'relative', borderRadius: '10px', overflow: 'hidden',
        border: '1px solid ' + (miniInv ? '#D8D8DE' : '#33333A'), background: 'transparent',
        display: 'grid', gridTemplateColumns: 'max-content minmax(0,1fr)', boxSizing: 'border-box', minHeight: '540px', minWidth: 0, textAlign: 'left',
      },
    },
      // 侧边栏（原型 .side/.sess 口径：标题与草稿行无 data-slot、无点击）
      node('sidebarBg', { background: eff('sidebarBg'), borderRight: '1px solid ' + eff('border'), padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }, [
        e('div', { key: 'sessT', style: { fontSize: '11px', color: txOf(colors.textMuted) } }, tr('miniSession')),
        node('backgroundPanel', { borderRadius: '6px', padding: '6px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', position: 'relative', border: '1px solid transparent', background: eff('backgroundPanel'), color: txOf(colors.text) }, [node('primary', { position: 'absolute', left: 0, top: '6px', bottom: '6px', width: '3px', borderRadius: '2px', background: eff('primary'), padding: 0 }, null, { key: 'sessBar' }), e('span', { key: 'sessCurTx' }, tr('miniCurrent'))], { key: 'sessCur' }),
        e('div', { key: 'sessD', style: { borderRadius: '6px', padding: '6px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid transparent', color: txOf(colors.textMuted) } }, tr('miniDraft')),
        e('div', { key: 'sessR', style: { borderRadius: '6px', padding: '6px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid transparent', color: txOf(colors.textMuted) } }, tr('miniReview')),
      ], { key: 'sessCol' }),
      // 主列（原型 .main 口径：无点击，只有 data-slot）
      node('background', {
        flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px',
        minWidth: 0, background: eff('background'),
      }, [
        node('bubbleBg', {
          alignSelf: 'flex-end', maxWidth: '85%', background: eff('bubbleBg'), wordBreak: 'keep-all',
          border: '1px solid ' + eff('border'), borderRadius: '10px', padding: '8px 12px',
          fontSize: '12px', color: txOf(colors.text),
        }, t('text', tr('miniBubble'), 'bubTx'), { key: 'bubble' }),
        node('markdownHeading', { fontSize: '14px', fontWeight: 700, color: eff('markdownHeading'), marginBottom: '4px' }, tr('miniVerdict'), { key: 'miniH' }),
        // 结论段（原型 .md 口径：一句话流程 + 行内 tip）
        node('backgroundPanel', { fontSize: '12px', color: txOf(colors.text), lineHeight: 1.6, background: mdBg, border: '1px solid ' + eff('border'), borderRadius: '8px', padding: '10px 12px' },
          segJoin([
            t('text', tr('miniPass1'), 'sgP1'),
            node('markdownStrong', { fontWeight: 700, color: eff('markdownStrong'), display: 'inline' }, tr('miniPassStrong'), { key: 'sgS' }),
            t('text', tr('miniPass2'), 'sgP2'),
            node('markdownEmph', { fontStyle: 'italic', color: eff('markdownEmph'), display: 'inline' }, tr('miniGap'), { key: 'sgE' }),
            t('text', tr('miniPass3'), 'sgP3'),
            node('markdownLink', { color: eff('markdownLink'), textDecoration: 'underline', display: 'inline' }, tr('miniSpec'), { key: 'sgL' }),
            t('text', tr('miniPass4'), 'sgP4'),
            node('markdownCode', {
              color: eff('markdownCode'), background: 'rgba(127,127,127,0.15)',
              borderRadius: '4px', padding: '0 4px', display: 'inline', fontFamily: 'Consolas,monospace',
            }, 'v2', { key: 'sgC' }),
            t('text', tr('miniNote'), 'sgN'),
          ]).concat([
            node('backgroundElement', {
              fontSize: '11px', color: txOf(colors.text), background: eff('backgroundElement'),
              borderRadius: '20px', padding: '2px 10px', marginTop: '6px', display: 'inline-block',
              title: tr('miniTip'),
            }, tr('miniTip'), { key: 'sgTip' }),
          ]),
        { key: 'mdVerdict' }),
        node('markdownBlockQuote', {
          borderLeft: '3px solid ' + eff('markdownBlockQuote'), color: txOf(colors.markdownBlockQuote),
          fontSize: '12px', paddingLeft: '8px', margin: '6px 0',
        }, tr('miniQuote'), { key: 'quote' }),
        node('border', { border: 0, borderTop: '1px solid ' + eff('border'), height: 0, margin: '8px 0' }, null, { key: 'mdHr' }),
        // 代码块（原型 .codecard/.codehead/.codepre 口径：语法示例行，无点击）
        node('border', { background: 'transparent', border: '1px solid ' + eff('border'), borderRadius: '8px', overflow: 'hidden' },
          e('div', { key: 'codeInner' },
            node('codeHeaderBg', {
              display: 'flex', justifyContent: 'space-between', background: eff('codeHeaderBg'),
              padding: '5px 10px', fontSize: '11px', color: txOf(colors.textMuted),
            }, [e('span', { key: 'f' }, tr('miniFile')), e('span', Object.assign({ key: 'l', 'data-slot': 'textMuted', className: ringCls('textMuted'), style: clickableSpanStyle('textMuted') }, bindSlot('textMuted')), 'js')], { key: 'codeHead' }),
            node('codeBlockBg', {
              background: eff('codeBlockBg'), padding: '8px 10px', fontFamily: 'Consolas,monospace',
              fontSize: '11px', overflow: 'auto', whiteSpace: 'pre', color: txOf(colors.text),
            }, codeLines.map(function (p, i) {
              return p.s ? e('span', Object.assign({ key: 'tk-' + i, 'data-slot': p.s, className: ringCls(p.s), style: clickableSpanStyle(p.s, { color: eff(p.s) }) }, bindSlot(p.s)), p.t) : p.t
            }), { key: 'codePre' })
          ), { key: 'codeBlock' }),
        // Diff 块（原型 .diffcard/.drow 口径：行号 12/13，无点击）
        node('border', { background: 'transparent', border: '1px solid ' + eff('border'), borderRadius: '8px', overflow: 'hidden', fontSize: '11px', fontFamily: 'Consolas,monospace' }, [
          node('diffAddedBg', { display: 'grid', gridTemplateColumns: '34px 1fr', background: eff('diffAddedBg') }, [
            node('diffAddedLineNumberBg', { background: eff('diffAddedLineNumberBg'), color: txOf(colors.textMuted), padding: '4px 6px', textAlign: 'right' }, '12', { key: 'aln' }),
            node('diffAddedBg', { padding: '4px 8px', color: eff('diffAdded') }, t('diffAdded', '+ background: #FFFFFF', 'adTx'), { key: 'adTxBox' }),
          ], { key: 'diffAdd' }),
          node('diffRemovedBg', { display: 'grid', gridTemplateColumns: '34px 1fr', background: eff('diffRemovedBg') }, [
            node('diffRemovedLineNumberBg', { background: eff('diffRemovedLineNumberBg'), color: txOf(colors.textMuted), padding: '4px 6px', textAlign: 'right' }, '13', { key: 'rln' }),
            node('diffRemovedBg', { padding: '4px 8px', color: eff('diffRemoved') }, t('diffRemoved', '- background: #101014', 'rmTx'), { key: 'rmTxBox' }),
          ], { key: 'diffRm' }),
        ], { key: 'diffBlock' }),
        // 按钮徽章行（原型 .badges/.pbtn/.pill + 圆点状态行口径，无点击）
        e('div', { key: 'brow', style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', minWidth: 0 } }, [
          node('primary', {
            background: eff('primary'), border: '1px solid ' + eff('primary'), color: pickTextOn(colors.primary),
            borderRadius: '7px', padding: '5px 16px', fontSize: '12px', fontWeight: 700, lineHeight: 1.2,
          }, tr('miniBtnPrimary'), { key: 'bPri' }),
          node('secondary', {
            background: hexOr(colors.secondary, '#888888') + '33', color: eff('secondary'),
            border: '1px solid ' + eff('secondary'), borderRadius: '20px', padding: '5px 14px',
            fontSize: '12px', fontWeight: 700, lineHeight: 1.2,
          }, tr('miniBtnSecondary'), { key: 'bSec' }),
          node('info', {
            background: eff('info'), border: '1px solid ' + eff('info'), color: pickTextOn(colors.info),
            borderRadius: '7px', padding: '5px 16px', fontSize: '12px', fontWeight: 700, lineHeight: 1.2,
          }, tr('miniBtnInfo'), { key: 'bInf' }),
        ]),
        e('div', { key: 'dotOk', style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' } }, [
          e('span', { key: 'dotOkD', style: { width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', background: eff('success'), flex: 'none' } }),
          node('success', { color: eff('success') }, tr('miniBadgeOk'), { key: 'bOk' }),
        ]),
        e('div', { key: 'dotWarn', style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' } }, [
          e('span', { key: 'dotWarnD', style: { width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', background: eff('warning'), flex: 'none' } }),
          node('warning', { color: eff('warning') }, tr('miniWarn'), { key: 'bWarn' }),
        ]),
        e('div', { key: 'dotErr', style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' } }, [
          e('span', { key: 'dotErrD', style: { width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', background: eff('error'), flex: 'none' } }),
          node('error', { color: eff('error') }, tr('miniErr'), { key: 'bErr' }),
        ]),
        // 输入框（原型 .cinput 口径：borderActive 环 + 下方说明行）。#94：环从 inputBg 内圈 boxShadow
        // 独立成可点节点，37 个色位在预览区各有自己的可点控件（点环开 borderActive，点内开 inputBg）。
        node('borderActive', {
          borderRadius: '9px', border: '2px solid ' + eff('borderActive') + '55', padding: '2px',
        }, [
          node('inputBg', {
            display: 'flex', alignItems: 'center', gap: '6px', background: eff('inputBg'),
            border: '1px solid ' + eff('border'), borderRadius: '7px', padding: '8px 10px',
            fontSize: '12px', color: txOf(colors.text),
          }, [t('text', tr('miniInputPh'), 'ph'), e('span', Object.assign({ key: 'hint', 'data-slot': 'textMuted', className: ringCls('textMuted'), style: clickableSpanStyle('textMuted', { color: txOf(colors.textMuted) }) }, bindSlot('textMuted')), tr('miniInputHint'))], { key: 'inputBox' }),
        ], { key: 'inputWrap' }),
        e('div', { key: 'capLine', style: { fontSize: '11px', color: txOf(colors.textMuted) } }, tr('miniCaption'))
      ], { key: 'mainCol' })
    )
  }

  const capName = name.trim() || tr('edUnnamed')
  const shownName = mode === 'edit' && targetSel
    ? (((props.customs || []).filter(function (t) { return t.id === targetSel })[0] || {}).name || capName)
    : capName

  const presetByName = function (n) {
    return (props.presets || []).filter(function (x) { return x.name === n })[0] || null
  }
  const hexOr = function (v, fb) { return normalizeHexInput(v) || fb }
  // 顶栏图标（原型 ICONS + SYSICON 口径：prototype.html:503/507-510/647，手绘 SVG，零 emoji）
  const ICON_CHECK = e('svg', { width: 11, height: 11, viewBox: '0 0 12 12', 'aria-hidden': 'true', style: { verticalAlign: '-2px' } },
    e('path', { d: 'M2 6.5 4.8 9 10 3.5', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }))
  const ICON_TRASH = e('svg', { width: 11, height: 11, viewBox: '0 0 12 12', 'aria-hidden': 'true', style: { verticalAlign: '-2px' } },
    e('path', { d: 'M2.3 3.3h7.4M4.6 3.3V2.4h2.8v.9M3.5 3.3l.5 6.3h4l.5-6.3M5.1 5.4v2.4M6.9 5.4v2.4', fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round' }))
  const ICON_MOON = e('svg', { width: 12, height: 12, viewBox: '0 0 12 12', 'aria-hidden': 'true', style: { verticalAlign: '-2px' } },
    e('path', { d: 'M9.6 7.3A4.1 4.1 0 0 1 4.7 2.4a4.1 4.1 0 1 0 4.9 4.9z', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinejoin: 'round' }))
  const ICON_SUN = e('svg', { width: 12, height: 12, viewBox: '0 0 12 12', 'aria-hidden': 'true', style: { verticalAlign: '-2px' } },
    e('path', { d: 'M4.3 6a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 0 0-3.4 0z M6 1.5v1.3M6 9.2v1.3M1.5 6h1.3M9.2 6h1.3M2.8 2.8l.9.9M8.4 8.4l.9.9M9.2 2.8l-.9.9M3.6 8.4l-.8.8', fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' }))
  const ICON_SYS = e('svg', { width: 13, height: 13, viewBox: '0 0 13 13', 'aria-hidden': 'true', style: { verticalAlign: '-2px' } },
    e('path', { d: 'M6.5 1.2 A5.3 5.3 0 0 0 6.5 11.8 Z', fill: '#F4F4F5' }),
    e('path', { d: 'M6.5 1.2 A5.3 5.3 0 0 1 6.5 11.8 Z', fill: '#0B0B0E' }),
    e('path', { d: 'M6.5 1.2 A5.3 5.3 0 0 0 6.5 11.8 Z M6.5 1.2 A5.3 5.3 0 0 1 6.5 11.8 Z', fill: 'none', stroke: '#8B8B95', strokeWidth: 1 }))
  // 顶栏徽标配色（原型 chipStyle/edtag/basechip 口径：用原值直显）
  const capBgT = colors.background === 'transparent'
  const capLightT = appearance === 'light' && capBgT
  const capFace = capLightT ? '#FFFFFF' : (capBgT ? '#FFFFFF' : hexOr(colors.background, '#FFFFFF'))
  const capFg = capLightT ? '#1A1A1A' : (capBgT ? '#1A1A1A' : hexOr(colors.text, '#000000'))
  const capPrimary = hexOr(colors.primary, '#FAB283')
  const editTgt = mode === 'edit' ? (((props.customs || []).filter(function (t) { return t.id === targetSel })[0]) || null) : null
  const editTgtColors = (editTgt && editTgt.colors) || {}
  const editTgtBgT = editTgtColors.background === 'transparent'
  const edtagFace = editTgtBgT ? '#FFFFFF' : (normalizeHexInput(editTgtColors.background) || '#1C1C21')
  const edtagFg = editTgtBgT ? '#1A1A1A' : (normalizeHexInput(editTgtColors.text) || '#C9C9D2')
  const edtagPrimary = normalizeHexInput(editTgtColors.primary) || '#FAB283'
  const baseFound = presetByName(basePreset)
  const baseFoundColors = (baseFound && baseFound.colors) || {}
  const baseFoundT = baseFoundColors.background === 'transparent'
  const bpFace = baseFoundT ? '#FFFFFF' : hexOr(baseFoundColors.background, '#0A0A0A')
  const bpFg = baseFoundT ? '#1A1A1A' : hexOr(baseFoundColors.text, '#E7E7EA')
  const bpPrimary = hexOr(baseFoundColors.primary, '#555')
  const bpDot = basePreset === 'system' ? '#8B8B95' : bpPrimary
  const presetLabelOf = function (n) {
    const p = presetByName(n)
    if (props.presetLabel) { try { return props.presetLabel(n, p) || n } catch (err) { /* 回落 */ } }
    return (p && p.title) || n
  }

  return e('div', {
    style: {
      position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.6)',
      // 居中口径（用户 m08383 亲定）：纯 center + 对话框 max-height 受可用区约束，任何引擎都居中且不裁切
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px', overflow: 'auto',
    },
    onClick: function () { props.onClose() },
  },
    // 原型 .seg-system 双色字口径（prototype.html:100-101，原样搬运；不支持的浏览器回落 #F0F0F0 纯色）
    e('style', { key: 'syslabel-css' }, '@supports ((-webkit-background-clip:text) or (background-clip:text)){.seg button.seg-system .syslabel{background:linear-gradient(to bottom right,#F4F4F5 0,#F4F4F5 50%,#0B0B0E 50%,#0B0B0E 100%);-webkit-background-clip:text;background-clip:text;color:transparent}}'),
    // 滚动条口径（原型 :143-148）：左列表悬停才现，右画布列隐藏（用户 m08636 第 2 条）
    e('style', { key: 'dlg-scrollcss' }, DLG_CSS),
    e('div', {
      ref: dlgRef,
      onClick: function (ev) { try { ev.stopPropagation() } catch (err) { /* 忽略 */ } },
      style: {
        // 高度由预览区唯一决定（用户 m08383：正好展示完全预览区）；-36px = backdrop 上下 padding，保证真居中
        width: 'max-content', maxWidth: '96vw', maxHeight: 'calc(100vh - 36px)', overflow: 'hidden',
        margin: 'auto', flex: 'none', background: TK.win, border: '1px solid ' + TK.border,
        borderRadius: '12px', display: 'flex', flexDirection: 'column', position: 'relative', color: TK.textStrong,
      },
    },
      // 顶栏（原型 .dlg-top > .row1：rleft + rright 单行；无 X 钮，关闭走取消/backdrop）
      e('div', { style: { padding: '10px 16px', borderBottom: '1px solid ' + TK.divider, display: 'flex', flexDirection: 'column', gap: '8px' } },
        // 原型 .row1 是 nowrap；这里改 wrap：窄视口下弹窗被 maxWidth:96vw 卡住、顶行内容更宽时会换行，
        // 而不是把外观三连顶到弹窗外面（编辑态顶行要约 1257px，1256 视口的 96vw 只有 1205 → 实测外溢 66px，
        // 改前名字越长越糟、最长名可外溢 573px）。用户口径优先于原型：宁可行落成两行，也不许控件被裁。
        e('div', { ref: rowRef, className: 'row1', style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', overflow: 'visible' } },
          e('span', { className: 'rleft', style: { display: 'flex', alignItems: 'center', gap: '8px', flex: 'none', minWidth: 0, flexWrap: 'nowrap', overflow: 'visible' } },
            e('span', {
              style: { fontSize: '16px', fontWeight: 700, color: TK.text, background: 'none', padding: 0, marginRight: '2px', whiteSpace: 'nowrap', flex: 'none' },
            }, mode === 'edit' ? tr('edModeEdit') : tr('edModeNew')),
            mode === 'edit' && editTgt ? e('span', {
              title: tr('edTagTitle'),
              style: {
                fontSize: '13px', fontWeight: 700, borderRadius: '6px', padding: '3px 10px 3px 8px',
                boxSizing: 'border-box',
                display: 'inline-flex', alignItems: 'center', gap: '6px', maxWidth: '170px',
                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: '0 1 auto', minWidth: 0, height: '32px',
                background: edtagFace, color: edtagFg, border: '1px solid ' + edtagPrimary,
              },
            },
              e('span', { style: { width: '9px', height: '9px', borderRadius: '50%', display: 'inline-block', flex: 'none', background: edtagPrimary } }),
              e('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: '0 1 auto' } },
                trf('edEditing', { name: shownName }))) : null,
            mode === 'edit' ? e('select', {
              ref: targetRef, id: 'f-target',
              value: targetSel || '',
              title: tr('edTargetTitle'),
              onChange: function (ev) { switchTarget(ev.target.value) },
              [UI_INTERACTIVE_ATTR]: TIER_INPUT,
              style: {
                background: TK.panel, border: '1px solid ' + TK.border , color: TK.text, borderRadius: '6px',
                padding: '6px 10px', fontSize: '12px', height: '32px', flex: '0 1 150px', minWidth: 0, maxWidth: '230px',
              },
            }, (props.customs || []).map(function (t) {
              return e('option', { key: 'tg-' + t.id, value: t.id }, t.name)
            })) : null,
            // 名字区（用户 m09582 需求 1）：定宽 NAME_ZONE_W，区内「输入框 + 预览胶囊」自由分配 ——
            // 胶囊随名字变长 → 输入框等比变短（下限 NAME_INPUT_MIN）；胶囊到顶后自己收窄打省略号。整行总量不变。
            e('span', { style: { display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto', width: NAME_ZONE_W + 'px', minWidth: NAME_ZONE_W + 'px', maxWidth: NAME_ZONE_W + 'px' } },
              e('span', { style: { position: 'relative', flex: '1 1 0px', minWidth: NAME_INPUT_MIN + 'px', display: 'flex' } },
                e('input', {
                  ref: nameRef, id: 'f-name',
                  value: name, placeholder: tr('edNamePh'),
                  title: name.trim() ? '' : tr('edNameEmpty'),
                  'aria-invalid': !name.trim() ? 'true' : undefined,
                  onChange: function (ev) { setName(ev.target.value) },
                  [UI_INTERACTIVE_ATTR]: TIER_INPUT,
                  style: Object.assign({
                    background: TK.panel, border: '1px solid ' + TK.border, color: TK.text, borderRadius: '6px',
                    boxSizing: 'border-box', padding: '6px 10px', fontSize: '12px', height: '32px',
                    // 区内自由伸缩：宽度给 0（百分比宽会被 max-content 当成 auto、按输入内容自量宽，进而把弹窗带宽），
                    // 实际宽度全部由 flex 在定宽区内分配 —— 胶囊越长输入框越短。
                    flex: '1 1 0px', width: '0px', minWidth: 0,
                  }, !name.trim() ? { borderColor: TK.danger, boxShadow: '0 0 0 1px ' + TK.danger } : null),
                }),
                !name.trim() ? e('span', {
                  style: {
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    fontSize: '11px', color: TK.dangerText, border: '1px solid ' + TK.danger, borderRadius: '4px',
                    padding: '0 6px', pointerEvents: 'none', background: TK.panel, whiteSpace: 'nowrap',
                  },
                }, tr('edNoName')) : null),
              e('span', {
                title: tr('edCapTitle'),
                style: {
                  display: 'inline-flex', alignItems: 'center', gap: '7px', borderRadius: '7px',
                  padding: '4px 10px 4px 6px', fontSize: '12px', fontFamily: '"JetBrains Mono",Consolas,monospace',
                  background: capFace, color: capFg, border: '2px solid ' + capPrimary, margin: '-1px',
                  cursor: 'default', flex: '0 1 auto', minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap',
                  // 封顶：胶囊的「内容宽」同样会漏进弹窗 max-content 自量宽，加上限后整窗宽度才真正恒定。
                  maxWidth: NAME_CAP_MAX + 'px',
                },
              },
                e('span', { style: { width: '9px', height: '9px', borderRadius: '50%', display: 'inline-block', flex: 'none', background: capPrimary } }),
                // 名字超长时胶囊内省略号收尾（区宽到顶后胶囊才被压缩，见上一行 flex）。
                e('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 } }, capName),
                e('i', { style: { color: capPrimary, fontStyle: 'normal', fontWeight: 700, flex: 'none' } }, ICON_CHECK))),
            capLightT ? e('span', { style: { fontSize: '11px', color: TK.text3, flex: 'none' } }, lang === 'en' ? '(transparent shows as white in light mode)' : '（浅色下透明处显示为白色）') : null,
            e('button', {
              ref: presetBtnRef, id: 'f-presetbtn',
              title: tr('edPresetTitle'),
              onClick: function () { setPop(null); setShowPresets(!showPresets) },
              [UI_INTERACTIVE_ATTR]: TIER_BUTTON,
              style: {
                background: TK.panel, border: '1px solid ' + TK.border , color: TK.text, borderRadius: '7px',
                padding: '6px 12px', fontSize: '12px', height: '32px', display: 'inline-flex', alignItems: 'center',
                cursor: 'pointer', flex: 'none', whiteSpace: 'nowrap',
              },
            }, tr('edPreset'), basePreset
              ? e('span', {
                style: {
                  display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: '5px',
                  padding: '1px 8px 1px 5px', fontSize: '11px', marginLeft: '6px', whiteSpace: 'nowrap',
                  background: bpFace, color: bpFg, border: '1px solid ' + bpPrimary,
                },
              },
                e('span', { style: { width: '9px', height: '9px', borderRadius: '50%', display: 'inline-block', flex: 'none', background: bpDot } }),
                presetLabelOf(basePreset))
              : e('span', {
                style: {
                  display: 'inline-flex', alignItems: 'center', borderRadius: '5px', padding: '1px 8px',
                  fontSize: '11px', marginLeft: '6px', whiteSpace: 'nowrap',
                  border: '1px dashed ' + TK.faint, color: TK.text3, background: 'transparent',
                },
              }, tr('edNoBase')))
          ),
          e('span', { ref: rrightRef, className: 'rright', style: { display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexWrap: 'nowrap', flex: 'none' } },
            e('span', { className: 'seg', style: { display: 'inline-flex', background: 'transparent', border: 0, padding: 0, gap: '6px', alignItems: 'center', flex: 'none' } },
              ['dark', 'light', 'system'].map(function (a) {
                const on = appearance === a
                const label = a === 'dark' ? tr('edDark') : (a === 'light' ? tr('edLight') : tr('edSystem'))
                const tip = a === 'dark' ? tr('edDarkTitle') : (a === 'light' ? tr('edLightTitle') : tr('edSystemTitle'))
                const segBase = a === 'dark'
                  ? { background: '#0B0B0E', borderColor: '#3A3A44', color: '#EDEDEF' }
                  : (a === 'light'
                    ? { background: 'rgba(244,244,245,.94)', borderColor: '#77777F', color: '#141417' }
                    : { background: 'linear-gradient(to bottom right,#0B0B0E 0,#0B0B0E 50%,#F4F4F5 50%,#F4F4F5 100%)', borderColor: '#55555F' })
                return e('button', {
                  key: 'ap-' + a, title: tip, className: 'seg-' + a + (on ? ' on' : ''),
                  onClick: function () { setAppearance(a) },
                  [UI_INTERACTIVE_ATTR]: TIER_BUTTON,
                  style: Object.assign({
                    border: '1px solid', fontSize: '12px', display: 'inline-flex', alignItems: 'center',
                    gap: '6px', cursor: 'pointer', height: '32px', padding: '0 14px', borderRadius: '7px',
                    fontWeight: on ? 700 : 400, whiteSpace: 'nowrap',
                  }, segBase, on ? { boxShadow: 'inset 0 0 0 2px ' + TK.accent } : null),
                }, a === 'dark' ? ICON_MOON : (a === 'light' ? ICON_SUN : ICON_SYS), ' ', a === 'system' ? e('span', {
                  className: 'syslabel',
                  style: { color: '#F0F0F0' },
                }, label) : label)
              })),
            mode === 'edit' ? e('span', { style: { position: 'relative', display: 'inline-flex' } },
              delConfirm ? e('span', {
                role: 'alertdialog', 'aria-label': tr('edDelete'),
                style: {
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 70,
                  width: 'max-content', maxWidth: 'min(300px,86vw)', background: TK.pop2,
                  border: '1px solid ' + TK.borderStrong2, borderRadius: '10px', padding: '10px 12px',
                  boxShadow: '0 12px 32px rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column', gap: '4px',
                },
              },
                e('b', { style: { fontSize: '12px', color: TK.text } }, trf('edDelConfirm', { name: shownName })),
                e('small', { style: { fontSize: '11px', color: TK.text2 } }, tr('edDelNote')),
                e('span', { style: { display: 'flex', gap: '8px', marginTop: '6px' } },
                  e('button', {
                    onClick: function () { props.onDelete(targetSel || origId) },
                    [UI_INTERACTIVE_ATTR]: TIER_BUTTON,
                    style: { background: TK.dangerBg, border: '1px solid ' + TK.dangerBorder , color: TK.dangerSoft, borderRadius: '7px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' },
                  }, tr('edDelYes')),
                  e('button', {
                    onClick: function () { setDelConfirm(false) },
                    [UI_INTERACTIVE_ATTR]: TIER_BUTTON,
                    style: { background: 'transparent', border: '1px solid ' + TK.border , color: TK.text, borderRadius: '7px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' },
                  }, tr('edDelNo'))))
                : e('button', {
                  onClick: function () { setDelConfirm(true) },
                  [UI_INTERACTIVE_ATTR]: TIER_BUTTON,
                  style: {
                    background: TK.dangerBg, border: '1px solid ' + TK.dangerBorder , color: TK.dangerSoft, borderRadius: '7px',
                    padding: '6px 12px', fontSize: '12px', height: '32px', display: 'inline-flex',
                    alignItems: 'center', gap: '6px', cursor: 'pointer', flex: 'none', whiteSpace: 'nowrap',
                  },
                }, ICON_TRASH, ' ', tr('edDelete'))) : null,
            e('button', {
              title: tr('edCancelTitle'), onClick: function () { props.onClose() },
              [UI_INTERACTIVE_ATTR]: TIER_BUTTON,
              style: {
                background: 'transparent', border: '1px solid ' + TK.border , color: TK.text, borderRadius: '7px',
                padding: '6px 12px', fontSize: '12px', height: '32px', display: 'inline-flex', alignItems: 'center',
                cursor: 'pointer', flex: 'none', whiteSpace: 'nowrap',
              },
            }, tr('edCancel')),
            e('button', {
              title: canSave ? tr('edSaveTitle') : tr('edSaveNeedName'),
              onClick: handleSave, disabled: !canSave,
              [UI_INTERACTIVE_ATTR]: TIER_BUTTON,
              style: {
                background: TK.btnFill, border: '1px solid ' + TK.btnFill , color: TK.accentFg, borderRadius: '7px',
                padding: '6px 12px', fontSize: '12px', fontWeight: 700, height: '32px', display: 'inline-flex',
                alignItems: 'center', cursor: canSave ? 'pointer' : 'not-allowed', flex: 'none',
                whiteSpace: 'nowrap', opacity: canSave ? 1 : 0.45,
              },
            }, tr('edSave'))
          )
        )
      ),
      renderPresetPop(),
      // 主体（原型 .dlg-body 口径：grid 左列表 + 右画布）。
      // 高度固定 = 预览区 540（border-box）+ 右列上下 padding 12×2 = 564：正好完整展示预览区，不再被 flex:1 拉满 95vh 留白（用户 m08383）。
      e('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0,auto) minmax(0,1fr)', gap: 0, minHeight: 0, height: '564px', flex: '0 1 auto', overflow: 'hidden' } },
        e('div', { ref: leftColRef, className: 'dspe-dlg-left', style: { overflowY: 'auto', overflowX: 'hidden', padding: '10px 4px', borderRight: '1px solid ' + TK.divider, minWidth: 0 } }, leftRows),
        e('div', {
          className: 'dspe-dlg-right',
          style: {
            overflow: 'auto', padding: '12px 14px', background: miniLight ? '#E2E2E6' : '#0D0D10', minWidth: 0,
          },
        },
          renderMini())
      ),
      renderPop(),
      // 预览小标签（用户 m08636 第 1 条：层级高于预览区、不被容器遮挡）。
      // 原型挂 document.body + position:fixed + zIndex 9999（prototype.html:906-919）；这里等价做成
      // 弹窗内的 fixed 覆盖层（fixed 不被祖先 overflow 裁剪），坐标来自 badgeAt effect 的实测。
      badgeAt && hl ? e('span', {
        key: 'slotbadge-pop',
        style: {
          position: 'fixed', zIndex: 9999, top: badgeAt.top + 'px', left: badgeAt.left + 'px',
          background: TK.accent, color: TK.accentFg, fontSize: '10px', fontFamily: 'Consolas,monospace',
          borderRadius: '4px', padding: '0 6px', pointerEvents: 'none', whiteSpace: 'nowrap',
        },
      }, hl) : null
    )
  )
}
