# publish-dsh-opencode-palette.ps1 — 本仓库专用的 npm 发布窗口包装
#
# 设计：
#   1. 复用全局 npm-publish 技能的 publish-window.ps1（处理登录检测 / 2FA 网页审批流）
#   2. 把仓库自己的 package/ 目录硬编码，省去 schtasks /tr 的参数转义麻烦
#   3. Start-Transcript 记录发布日志（不重定向 npm stdout —— 重定向会触发 EOTP）
#   4. 用法：schtasks /create /tn DSHPublishPalette /tr "<powershell.exe> -File <本脚本>" /sc once /st 23:59 /it /f
#           schtasks /run /tn DSHPublishPalette
#           schtasks /delete /tn DSHPublishPalette /f
#
# 注：本脚本路径需避免中文（schtasks /tr 对非 ASCII 路径敏感）。
$Host.UI.RawUI.WindowTitle = 'DSH npm 发布窗口（dsh-opencode-palette）'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$script = 'C:\Users\辰辰洋洋\.dsh\skills\npm-publish\scripts\publish-window.ps1'
$pkgDir = Join-Path $PSScriptRoot '..\package' | Resolve-Path
$logDir = Join-Path $PSScriptRoot '.publish-logs'
$logFile = Join-Path $logDir ('publish-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')

if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

if (-not (Test-Path $script)) { Write-Error "publish-window.ps1 not found: $script"; exit 2 }
if (-not (Test-Path $pkgDir)) { Write-Error "package dir not found: $pkgDir"; exit 2 }

Start-Transcript -Path $logFile -Append -ErrorAction SilentlyContinue | Out-Null
try {
  & $script -PackageDir $pkgDir.Path
  $ec = $LASTEXITCODE
} finally {
  try { Stop-Transcript -ErrorAction SilentlyContinue | Out-Null } catch {}
}
exit $ec