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
  Say '  E403/E409 版本重复 → 升 version；E401/ENEEDAUTH → 回 Stage 1 重登录。'
  exit 1
}
Ok "publish 命令成功（出现 + $Name@$Ver 即发布成功）。"

# ── Stage 4/4：验证 ────────────────────────────────────────────
Stage '验证（发布后必做）'
$rv = npm view $Name version --registry=$Registry --prefer-online 2>$null
if ($rv -and $rv.Trim() -eq $Ver) {
  Ok "远端已是 $Ver，发布成功。"
} else {
  Fail "远端版本为 '$rv'，与 $Ver 不符（可能镜像延迟或发布失败）。"
  Say "  包主页：https://www.npmjs.com/package/$Name"
  Say '  等 1 分钟重跑：npm view {0} version --registry={1} --prefer-online' -f $Name, $Registry
  exit 1
}

Clear-Host
Write-Host ''
Write-Host '  ✓ 发布完成' -ForegroundColor Green
Write-Host "  包主页：https://www.npmjs.com/package/$Name" -ForegroundColor DarkGray
Write-Host '  请把这个版本号告诉 AI，继续 GitHub Release（附件用 package/ 内 pack 的 tgz）。' -ForegroundColor Yellow
Write-Host ''

