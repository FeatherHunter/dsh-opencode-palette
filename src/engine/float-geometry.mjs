// float-geometry.mjs — 锚定浮层的几何计算：纯数字进、纯数字出，与 DOM 无关
//
// 为什么单独成模块：悬浮菜单（字体下拉）必须逃出宿主容器的 overflow 裁剪，
// 只能走 fixed + 视口坐标。坐标数学一旦散落在 runtime 的行内 style 里，
// 就只能靠字符串断言测试（测的是"写了什么"，不是"对不对"）；
// 收敛到这里后，node 单测可以直接断言几何行为（靠边 shift、上翻、极小视口）。
//
// 约定：
//   anchor     锚点矩形 { left, top, right, bottom, width }（打开瞬间同步量的 getBoundingClientRect）
//   viewport   视口 { width, height }（window.innerWidth/innerHeight）
//   menuWidth  菜单实测宽（挂载后量的；打开瞬间未知传 null，用下限估）
//   menuHeight 菜单实测高（同上；未知按 MENU_MAX_HEIGHT 估）
// 返回 { left, top, placement, minW }（placement: 'below' | 'above'；minW 为下限像素）；
// 锚点已出视野返回 null —— 调用方此时应关菜单（没有可锚的东西了）。

export const MENU_GAP = 4
export const MENU_MIN_WIDTH = 240
export const MENU_EDGE = 8
export const MENU_MAX_HEIGHT = 280
export const MENU_MAX_WIDTH_MARGIN = 48

export function computeMenuGeometry(anchor, viewport, menuWidth, menuHeight) {
  if (!anchor || !viewport) return null
  if (typeof anchor.bottom !== 'number' || typeof anchor.top !== 'number') return null
  if (typeof viewport.width !== 'number' || typeof viewport.height !== 'number') return null
  // 锚点整个在视野外：菜单无处可锚，诚实返回 null（关菜单，不乱放）
  if (anchor.bottom < 0 || anchor.top > viewport.height) return null
  // 下限 max(240, 锚点宽)：窄按钮不寒酸；注意 fixed 下不能写百分比（100% 会解成视口宽）
  const minW = Math.max(MENU_MIN_WIDTH, anchor.width || 0)
  const capW = Math.max(minW, viewport.width - MENU_MAX_WIDTH_MARGIN)
  const w = Math.max(minW, Math.min(menuWidth || 0, capW))
  // 水平：先锚点左对齐，再把右缘拉回视口内
  let left = anchor.left
  if (left + w > viewport.width - MENU_EDGE) left = viewport.width - MENU_EDGE - w
  if (left < MENU_EDGE) left = MENU_EDGE
  // 垂直：下面放得下放下面，否则上翻；上下都放不下跟放得下多的那边
  const h = Math.min(menuHeight || MENU_MAX_HEIGHT, MENU_MAX_HEIGHT)
  const below = viewport.height - anchor.bottom - MENU_GAP
  const above = anchor.top - MENU_GAP
  let top
  let placement
  if (below >= h || below >= above) { top = anchor.bottom + MENU_GAP; placement = 'below' }
  else { top = anchor.top - MENU_GAP - h; placement = 'above' }
  // 极小视口兜底：钳在边缘内（至少露 40px，不为不可见负责，只为不乱飞负责）
  const minTop = MENU_EDGE
  const maxTop = Math.max(minTop, viewport.height - MENU_EDGE - 40)
  if (top < minTop) top = minTop
  if (top > maxTop) top = maxTop
  return { left: left, top: top, placement: placement, minW: minW }
}
