/**
 * dsh-opencode-palette postinstall — 自动注册到 DSH profile（npm 标准安装即完成，无需手动编辑 patch）
 *
 * 行为：
 *   1. 定位 $DSH_HOME/profiles/web/cordis.patch.yml（DSH_HOME 未设 → ~/.dsh/profiles/web/…）
 *   2. 文件不存在 → 跳过（非 DSH 环境不打扰）
 *   3. 已含注册行 → 跳过（幂等，重装/升级不叠加）
 *   4. 否则文件末尾追加注册块（- insert: id opencode-palette / name dsh-opencode-palette）
 * 容错：任何异常只警告，绝不令 npm install 失败（退出码恒 0）。
 */
const fs = require('fs')
const path = require('path')

const PLUGIN_ID = 'opencode-palette'
const PLUGIN_NAME = 'dsh-opencode-palette'

function findPatchPath() {
  const home = process.env.DSH_HOME
    || (process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME)
  if (!home) return null
  // DSH_HOME 已设时它就是 .dsh 基目录；未设时以用户主目录 + .dsh 计算
  const base = process.env.DSH_HOME ? home : path.join(home, '.dsh')
  return path.join(base, 'profiles', 'web', 'cordis.patch.yml')
}

const REGISTER_BLOCK =
  '\n# dsh-opencode-palette（npm 安装 · 自动注册）\n' +
  '- insert:\n' +
  '    - id: ' + PLUGIN_ID + '\n' +
  "      name: '" + PLUGIN_NAME + "'\n"

function main() {
  const patch = findPatchPath()
  if (!patch) {
    console.log('[dsh-opencode-palette] 未找到 DSH_HOME，跳过自动注册（非 DSH 环境）')
    return
  }
  let existed = true
  let text = ''
  try {
    text = fs.readFileSync(patch, 'utf8')
  } catch (e) {
    existed = false
  }
  if (existed && new RegExp("id\\s*:\\s*['\"]?" + PLUGIN_ID + "['\"]?").test(text)) {
    console.log('[dsh-opencode-palette] 已在 cordis.patch.yml 注册，跳过')
    return
  }
  try {
    fs.mkdirSync(path.dirname(patch), { recursive: true })
    fs.appendFileSync(patch, REGISTER_BLOCK, 'utf8')
    console.log('[dsh-opencode-palette] 已自动注册到 ' + patch + '（刷新浏览器页面即生效）')
  } catch (e) {
    console.warn('[dsh-opencode-palette] 自动注册失败（不影响本包安装）：' + String((e && e.message) || e))
  }
}

try { main() } catch (e) {
  console.warn('[dsh-opencode-palette] postinstall 异常（已忽略）：' + String((e && e.message) || e))
}