# publish-wizard.ps1 — dsh-opencode-palette npm 官方源发布向导（人类交互终端前台运行）
#
# 对应技能：D:\2Study\StudyNotes\SKILLS\npm-publish（SKILL.md §3→§4→§5）
# AI 已完成：§0 前置三查、§1 包就绪检查、§2 dry-run、构建、测试、pack、tag 推送。
# 人只做：Stage 3 里按一次回车 → 浏览器完成 2FA 审批 → 回终端再按一次回车。其他全自动。
#
# 用法（在你自己的 PowerShell 窗口里粘贴执行，不要重定向输出——重定向会触发 EOTP）：
#   powershell -ExecutionPolicy Bypass -File scripts/npm-release-wizard.ps1
#
# 硬规则（来自技能，无跳过通道）：发布走官方源；令牌绝不进聊天/仓库；每次发布都 2FA。

param(
  [string]$PackageDir = (Join-Path $PSScriptRoot '..\package'),
  [string]$Registry = 'https://registry.npmjs.org'
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$TOTAL = 4
$StageNo = 0
function Banner($title) {
  Clear-Host
  Write-Host ''
  Write-Host "  $title" -ForegroundColor Blue
  Write-Host "  共 $TOTAL 个阶段，你只需要在 Stage 3 按提示点一次浏览器授权" -ForegroundColor DarkGray
  Write-Host '  随时 Ctrl+C 退出重跑（已完成的阶段可重复执行，无副作用）。' -ForegroundColor DarkGray
  Read-Host '  准备好就按回车开始'
}
function Stage($title) {
  $script:StageNo++
  Clear-Host
  Write-Host ''
  Write-Host "▸ Stage $script:StageNo/$TOTAL · $title" -ForegroundColor Blue
}
function Say($t)  { Write-Host "  $t" }
function Ok($t)   { Write-Host "  ✓ $t" -ForegroundColor Green }
function Warn($t) { Write-Host "  ⚠ $t" -ForegroundColor Yellow }
function Fail($t) { Write-Host "  ✗ $t" -ForegroundColor Red }

$pkg = Get-Content (Join-Path $PackageDir 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$Name = $pkg.name
$Ver = $pkg.version

Banner "npm 发布向导：$Name@$Ver → $Registry"

# ── Stage 1/4：登录态检查（官方源）────────────────────────────
Stage '登录态检查（官方源）'
try {
  $u = npm whoami --registry=$Registry 2>$null
  if (-not $u) { throw 'empty' }
  Ok "已登录：$u"
} catch {
  Warn "官方源未登录 → 启动浏览器授权登录（npm 10+ 网页流，不在终端输密码）"
  Say '接下来 npm 会打印授权链接并（可能）自动弹浏览器，在网页上完成登录 + 2FA 即可。'
  npm login --auth-type=web --registry=$Registry
  $u = npm whoami --registry=$Registry
  if (-not $u) { Fail '仍未登录，中止。请重试本向导。'; exit 1 }
  Ok "已登录：$u"
}

# ── Stage 2/4：发布前复核（确认门）────────────────────────────
Stage '发布前复核'
Say '远端已发布版本（最后 3 个）：'
npm view $Name versions --registry=$Registry | Select-Object -Last 3
Say "本地待发版本：$Ver"
$remote = npm view $Name versions --registry=$Registry 2>$null | Out-String
if ($remote -match [regex]::Escape("'$Ver'")) {
  Fail "远端已存在 $Ver（重发会被 E403/E409 拒绝）。先升 version 再跑本向导，中止。"
  exit 1
}
Ok "远端无 $Ver，可发。"
Say '包内容（dry-run 实测 5 文件 387KB）：README.md / cordis.patch.yml / lib/client.js / lib/index.js / package.json'
Warn '发布即公开、72h 后不可删——确认无误再继续。'
Read-Host '  确认发布请直接回车，取消请 Ctrl+C'

# ── Stage 3/4：发布（2FA 网页审批）─────────────────────────────
Stage '发布（2FA 在浏览器审批）'
Say '执行 npm publish 后，npm 会打印授权链接：'
Say '  Authenticate your account at: https://www.npmjs.com/auth/cli/<id>'
Say '  按回车 → 浏览器打开授权页 → 完成 2FA 审批 → 回终端再按回车。'
Push-Location $PackageDir
npm publish --registry=$Registry
$pubCode = $LASTEXITCODE
Pop-Location
if ($pubCode -ne 0) {
  Fail "publish 退出码 $pubCode。先读报错码再动手："
  Say '  EOTP（无授权链接）→ 确认本窗口是交互终端、输出未被重定向；'
  Say '  E403 Two-factor…required → 走上方网页审批流，或 npm publish --otp=<6位码>；'
  Say '  E409 "previously staged version" → 这个版本早先已被受理（PUT 202），仍在处理中。'
  Say '       先等几分钟用 npm view 复查，别升版本号、也别急着重发；'
  Say '       确实要清掉再发：npm unpublish <name>@<version>（仍可用同一版本号）。'
  Say '  E403/E409 "previously published versions" → 该版本已正式发布过，这时才升 version；'
  Say '  E401/ENEEDAUTH → 回 Stage 1 重登录。'
  exit 1
}
Ok "publish 已受理（出现 + $Name@$Ver）。若 npm 提示 being processed，属正常：本账号的发布是异步的，几分钟后才会出现在 registry。"

# ── Stage 4/4：验证（异步发布，轮询等待）────────────────────────
Stage '验证（发布后必做）'
# 这里的发布是**异步**的：PUT 回 202 Accepted，npm 自己会打印
#   "Your package is being processed and may take a few minutes to become available."
# 所以「publish 命令成功」≠「立刻能查到」。查一次就判失败会误报（2026-09-30 真机：
# 刚发完查到的是上一版，脚本报「发布失败」，差点让人重发 —— 而重发会撞
# E409 "Cannot publish over previously staged version"，因为同一版本正在处理中）。
$waitSeconds = 240
$stepSeconds = 15
$deadline = (Get-Date).AddSeconds($waitSeconds)
$rv = ''
while ($true) {
  $rv = (npm view $Name version --registry=$Registry --prefer-online 2>$null | Out-String).Trim()
  if ($rv -eq $Ver) { break }
  if ((Get-Date) -ge $deadline) { break }
  Say "  远端还是 $rv —— npm 正在处理，$stepSeconds 秒后再查（最多等 $waitSeconds 秒）…"
  Start-Sleep -Seconds $stepSeconds
}
if ($rv -eq $Ver) {
  Ok "远端已是 $Ver，发布完成。"
} else {
  Warn "publish 已被受理，但远端元数据还没刷到 $Ver。这不是失败。"
  Say  '  npm 的发布是异步的：命令成功 ≠ 立刻可查，处理中会回 202 Accepted，通常几分钟内可见。'
  Say  '  先别重发 —— 重发会撞 E409 "previously staged version"（同一版本正在处理中）。'
  Say  '  手动复查（出现 ' + $Ver + ' 即完成）：'
  Say  ('    npm view ' + $Name + ' version --registry=' + $Registry + ' --prefer-online')
  Say  ('  包主页：https://www.npmjs.com/package/' + $Name)
  exit 0
}

Clear-Host
Write-Host ''
Write-Host '  ✓ 发布完成' -ForegroundColor Green
Write-Host "  包主页：https://www.npmjs.com/package/$Name" -ForegroundColor DarkGray
Write-Host '  请把这个版本号告诉 AI，继续 GitHub Release（附件用 package/ 内 pack 的 tgz）。' -ForegroundColor Yellow
Write-Host ''

