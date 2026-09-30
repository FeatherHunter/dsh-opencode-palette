/**
 * release-scripts.test.mjs — 发布脚本门禁
 *
 * 为什么需要这道门禁（2026-09-30 真机踩过）：
 * scripts/*.ps1 由 Windows PowerShell 5.1 执行（DSH 弹窗用的是
 * C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe）。5.1 读**无 BOM** 的 .ps1
 * 时按 ANSI(GBK) 解码，脚本里的中文随即被撕成不成对的引号 —— 整个脚本解析失败，
 * 报错还全是乱码，看上去像脚本本身写坏了。
 * 而这些文件原本带 UTF-8 BOM；任何编辑器/工具改写一次就可能顺手丢掉它，肉眼完全看不出来。
 * 所以这里机械地守着：含非 ASCII 就必须带 BOM。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIR = join(ROOT, 'scripts')

test('发布脚本：含非 ASCII 的 .ps1 必须带 UTF-8 BOM（PS 5.1 的硬要求）', () => {
  const files = readdirSync(DIR).filter((n) => n.endsWith('.ps1'))
  assert.ok(files.length >= 2, 'scripts/ 下应有发布脚本')
  for (const name of files) {
    const buf = readFileSync(join(DIR, name))
    const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf
    const asciiOnly = buf.every((b) => b < 0x80)
    assert.ok(
      hasBom || asciiOnly,
      name + ' 含非 ASCII 却没有 UTF-8 BOM：Windows PowerShell 5.1 会按 ANSI 解码，中文被撕碎后整个脚本解析失败'
    )
  }
})

test('发布脚本：向导的关键步骤与提示仍在（防误删/误改）', () => {
  const wizard = readFileSync(join(DIR, 'npm-release-wizard.ps1'), 'utf8')
  assert.ok(wizard.includes('npm publish'), '缺发布动作')
  assert.ok(wizard.includes('npm whoami'), '缺登录态检查')
  assert.ok(wizard.includes('previously staged version'), '缺 E409「已受理/处理中」的指引')
  assert.ok(wizard.includes('Authenticate your account at'), '缺 2FA 授权提示')
})

test('发布脚本：Stage 4 按异步发布轮询，不查一次就判失败', () => {
  const wizard = readFileSync(join(DIR, 'npm-release-wizard.ps1'), 'utf8')
  // npm 对这次发布回的是 202 Accepted（"being processed"），版本要几分钟后才可见。
  // 查一次就报「发布失败」会把人逼去重发，而重发必然撞 E409（同一版本正在处理中）。
  assert.ok(wizard.includes('Start-Sleep'), 'Stage 4 必须轮询等待，不能查一次就下结论')
  assert.ok(wizard.includes('202'), '缺异步发布（202 Accepted）的说明')
  assert.ok(wizard.includes('先别重发'), '缺「别重发」的明确劝阻')
  assert.ok(!/\{0\}|\{1\}/.test(wizard), '有没被替换的 -f 占位符（曾把帮助命令原样打给用户）')
})

test('发布脚本：带日志向导用转录、不重定向 npm 输出（重定向会触发 EOTP）', () => {
  const text = readFileSync(join(DIR, 'run-wizard-with-log.ps1'), 'utf8').replace(/^\ufeff/, '')
  assert.ok(text.includes('Start-Transcript'), '缺控制台转录')
  assert.ok(text.includes('Stop-Transcript'), '转录没关会一直写')
  assert.ok(text.includes('npm-release-wizard.ps1'), '没有调到向导本体')
  // 只看代码行：文件头的说明性注释里会举反例（`npm publish > log`），那是讲解不是实现
  const code = text.split(/\r?\n/).filter((line) => !/^\s*#/.test(line)).join('\n')
  assert.ok(!/npm\s+\w+[^\r\n]*[>|]/.test(code), '转录脚本不得重定向 npm 输出（会让 npm 判定非交互终端并抛 EOTP）')
})
