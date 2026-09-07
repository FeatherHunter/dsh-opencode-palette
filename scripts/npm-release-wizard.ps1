# npm-release-wizard.ps1 — dsh-opencode-palette v1.7.0 发布向导（人类终端前台运行）
# AI 已完成：构建、测试 38/38、打包预览（5 文件 387KB）、提交推送。
# 人类只做：浏览器里点一次授权（登录 + 发布各一次）。其他全部自动。
$ErrorActionPreference = 'Stop'
$REG = 'https://registry.npmjs.org'
$PKGDIR = Join-Path $PSScriptRoot '..\package'

function Stage($n, $t) { Write-Host ''; Write-Host "=== [$n] $t ===" -ForegroundColor Cyan }

Stage 1 '登录态检查（官方源）'
try { $u = npm whoami --registry=$REG 2>$null; Write-Host "已登录：$u" -ForegroundColor Green }
catch {
  Write-Host '未登录官方源 → 打开浏览器授权（npm 10+ 网页流，不在终端输密码）' -ForegroundColor Yellow
  npm login --auth-type=web --registry=$REG
  $u = npm whoami --registry=$REG
  Write-Host "已登录：$u" -ForegroundColor Green
}

Stage 2 '发布前复核'
npm view dsh-opencode-palette versions --registry=$REG | Select-Object -Last 3
$pv = (Get-Content (Join-Path $PKGDIR 'package.json') -Raw | ConvertFrom-Json).version
Write-Host "即将发布版本：$pv（若已在上列中，说明重发，须先改版本）" -ForegroundColor Yellow
Read-Host '确认发布请直接回车，取消请 Ctrl+C'

Stage 3 '发布（2FA 在浏览器审批）'
Push-Location $PKGDIR
npm publish --registry=$REG
Pop-Location

Stage 4 '验证'
npm view dsh-opencode-palette@$pv version --registry=$REG
Write-Host '发布成功。把上面的版本号截图或报给 AI，继续 GitHub Release。' -ForegroundColor Green
