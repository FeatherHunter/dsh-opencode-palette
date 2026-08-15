/**
 * dsh-opencode-palette v1.4.0 — 宿主半（no-op）
 *
 * 主题的全部工作在浏览器端（./client.js）完成：
 *   - 34 个 opencode 主题（33 内置 JSON + system）经数据驱动管线解析
 *   - theme.overrideTokens 覆盖注册 token + <style> 层 CSS 变量/元素规则
 * 宿主半只保证 loader 条目可解析、可挂载。
 */
export const name = "dsh-opencode-palette"

export function apply() {
  // no-op：客户端半负责一切
}
