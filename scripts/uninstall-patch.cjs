/**
 * dsh-opencode-palette preuninstall — 自动从 DSH profile 移除注册（npm remove 即完成，无需手动编辑 patch）
 * 幂等：不存在注册块 → 直接返回；任何异常只警告，退出码恒 0。
 */
const fs = require('fs')
const path = require('path')

const PLUGIN_ID = 'opencode-palette'

function findPatchPath() {
  const home = process.env.DSH_HOME
    || (process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME)
  if (!home) return null
  return path.join(home, '.dsh', 'profiles', 'web', 'cordis.patch.yml')
}

// 匹配注册块：可选注释行 + insert 块（容错 name 引号/缩进变化）
const BLOCK_RE = new RegExp(
  '(?:^|\\n)\\s*# dsh-opencode-palette[^\\n]*\\n' +
  '\\s*- insert:\\n' +
  '\\s*\\s*- id:\\s*' + PLUGIN_ID + '\\s*\\n' +
  "\\s*\\s*name:\\s*['\"]?dsh-opencode-palette['\"]?\\s*\\n",
  'g'
)

function main() {
  const patch = findPatchPath()
  if (!patch) return
  let text = ''
  try {
    text = fs.readFileSync(patch, 'utf8')
  } catch (e) {
    return // 文件不存在 → 无需清理
  }
  const next = text.replace(BLOCK_RE, '\n')
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