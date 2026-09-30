# run-wizard-with-log.ps1 — 带日志跑发布向导（人看窗口，Agent 读日志）
#
# 为什么需要它：向导是给人看的交互流程，出错时错误只留在窗口里，Agent 拿不到原文，
# 只能靠人转述。这里用 Start-Transcript 把窗口内容同时落一份到 scripts/.publish-logs/。
#
# 为什么不用重定向：把 npm 的 stdout 重定向（`npm publish > log`）会让它判定为非交互终端
# 并抛 EOTP，整个发布流程失效。Start-Transcript 记的是控制台内容，npm 看到的仍是真终端。
#
# 用法（Agent 弹窗拉起，人在窗口里操作）：
#   Start-Process powershell.exe -ArgumentList '-NoExit','-ExecutionPolicy','Bypass','-File','<repo>\scripts\run-wizard-with-log.ps1'
param([string]$LogDir = (Join-Path $PSScriptRoot '.publish-logs'))

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
$log = Join-Path $LogDir ('wizard-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
Write-Host "本次日志：$log" -ForegroundColor DarkGray

Start-Transcript -Path $log -Append -ErrorAction SilentlyContinue | Out-Null
try {
  & (Join-Path $PSScriptRoot 'npm-release-wizard.ps1')
} finally {
  try { Stop-Transcript -ErrorAction SilentlyContinue | Out-Null } catch { }
}

Write-Host ''
Write-Host "流程结束。日志留在：$log" -ForegroundColor DarkGray
