/**
 * dsh-opencode-palette preuninstall — 自动从 DSH profile 移除注册（npm remove 即完成，无需手动编辑 patch）
 * 幂等：不存在注册块 → 直接返回；任何异常只警告，退出码恒 0。
 * 兼容：注释行格式不限（旧版/新版），只要 insert 块包含 id: opencode-palette 即命中。
 */
const fs = require('fs')
const path = require('path')

const PLUGIN_ID = 'opencode-palette'

function findPatchPath() {
  const home = process.env.DSH_HOME
    || (process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME)
  if (!home) return null
  // DSH_HOME 已设时它就是 .dsh 基目录；未设时以用户主目录 + .dsh 计算
  const base = process.env.DSH_HOME ? home : path.join(home, '.dsh')
  return path.join(base, 'profiles', 'web', 'cordis.patch.yml')
}

// insert 块（id 必须匹配，name 容错引号）
const BLOCK_RE = new RegExp(
  '\\n- insert:\\n' +
  '\\s*\\s*- id:\\s*' + PLUGIN_ID + '\\s*\\n' +
  "\\s*\\s*name:\\s*['\"]?dsh-opencode-palette['\"]?\\s*\\n",
  'm'
)

// 删除块 + 其上方紧邻的注释行/空行
function removeBlock(text) {
  const m = text.match(BLOCK_RE)
  if (!m) return text
  const end = m.index + m[0].length
  // 从块起点向前，吃掉紧邻的注释行（# 开头）与空行
  let head = text.slice(0, m.index)
  const lines = head.split('\\n')
  while (lines.length > 0) {
    const last = (lines[lines.length - 1] || '').trim()
    if (last === '' || last.startsWith('#')) lines.pop()
    else break
  }
  head = lines.join('\\n')
  return head + '\\n' + text.slice(end)
}

function main() {
  const patch = findPatchPath()
  if (!patch) return
  let text = ''
  try {
    text = fs.readFileSync(patch, 'utf8')
  } catch (e) {
    return // 文件不存在 → 无需清理
  }
  const next = removeBlock(text)
  if (next === text) {
    console.log('[dsh-opencode-palette] 未在 cordis.patch.yml 找到注册块，无需清理')
    return
  }
  try {
    fs.writeFileSync(patch, next, 'utf8')
    console.log('[dsh-opencode-palette] 已从 cordis.patch.yml 移除注册（卸载完成）')
  } catch (e) {
    console.warn('[dsh-opencode-palette] 移除注册失败：' + String((e && e.message) || e))
  }
}

try { main() } catch (e) {
  console.warn('[dsh-opencode-palette] preuninstall 异常（已忽略）：' + String((e && e.message) || e))
}