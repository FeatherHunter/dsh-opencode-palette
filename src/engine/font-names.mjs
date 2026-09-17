// font-names.mjs — 任意字体族名的净化与 CSS 安全包裹
//
// 为什么单独成模块：族名会经字符串拼接落进注入宿主页面的 <style>（generate.mjs 的
// buildTypographyCss）。族名一旦含 `{` `}` `;` `<` 就能提前闭合规则或标签，把用户可控的
// 值变成 CSS/HTML 注入。所以「净化」是引擎层的硬约束，不是面板层的输入提示。

// 族名长度上限：真实字体家族名最长也就数十字符（含 Nerd Font 后缀与 CJK 名），
// 给足余量的同时挡住把整段文本塞进 CSS 的用法
export const FONT_NAME_MAX = 128

// CSS 字符串字面量无法安全承载的字符（会在注入的 <style> 里取得语法意义）：
//   {} 结构   ; 声明分隔   <> 逃出标签   \ 转义   " ' 引号终结（' 单独其实安全，一并挡掉更省心）
//   ` 模板拼接   换行 / 制表   控制字符
const UNSAFE_FONT_NAME_RE = /[{}<>;\\"'\r\n\t\f\v`\u0000-\u001f\u007f]/

// sanitizeFontName(name) → 合法族名 | null
//   非法（非字符串 / 空 / 超长 / 含保留字符）一律返回 null，由调用方落到默认回退栈。
//   刻意不做「剥离字符后继续用」的修复：修复会把一个用户没要的名字当成他的选择，比拒绝更糟。
export function sanitizeFontName(name) {
  if (typeof name !== 'string') return null
  const trimmed = name.trim()
  if (trimmed === '' || trimmed.length > FONT_NAME_MAX) return null
  if (UNSAFE_FONT_NAME_RE.test(trimmed)) return null
  return trimmed
}

// quoteFontFamily(name) → "'Family Name'" | null
//   用配对单引号整体包住族名；名字里若带单引号，改用双引号。
//   两侧都带引号才是浏览器认得的「家族名」写法，裸写会被拆成多个家族名。
//   拒绝（净化不通过）时返回 null —— 绝不返回未加引号的原始输入。
export function quoteFontFamily(name) {
  const safe = sanitizeFontName(name)
  if (safe === null) return null
  return safe.indexOf("'") >= 0 ? '"' + safe + '"' : "'" + safe + "'"
}
