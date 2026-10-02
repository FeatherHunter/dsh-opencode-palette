# dsh-opencode-palette token 全自动发布（Windows，无人值守）。
#
# 与旧 scripts\npm-release-wizard.ps1 共存：旧走前台终端＋浏览器 2FA；
# 本走环境变量 token，全程无需人点，Agent 可直接驱动。
# 注意：本仓对外发布的是 package/ 产物目录（dsh-opencode-palette@2.0.10，
# 根 package.json 为 private 开发壳）；构建门禁在仓根跑，发布只进 package/。
#
# 跑法（pwsh 7）：
#     $env:NODE_AUTH_TOKEN='npm_...'  # Automation 或 Granular 写权限（须含 dsh-opencode-palette）；Classic Publish 账号级亦可
#     pwsh -NoProfile -File scripts\publish-token.ps1 -Probe     # 写权限探针（约 5 秒，无副作用）
#     pwsh -NoProfile -File scripts\publish-token.ps1 -DryRun   # 只读：读表＋验 token
#     pwsh -NoProfile -File scripts\publish-token.ps1           # 全流程：门禁(build+test)→发布→一次采样
#     pwsh -NoProfile -File scripts\publish-token.ps1 -FullPost # 宣布前：长轮询直到 registry 可见
# 参数：
#     -RepoRoot 缺省＝本脚本上一级；-PackageDir 缺省＝<RepoRoot>\package（真正发布的目录）
#     -Registry 缺省 https://registry.npmjs.org/；-TokenEnv 缺省 NODE_AUTH_TOKEN（为空再试 NPM_TOKEN）
#     -LogPath 缺省 <RepoRoot>\.tmp-publish-token.log；-SkipGate 跳过构建与测试门禁
#
# 快协议（受理≠可见，两者解耦）：publish exit 0（+包名@版本回执）或 E409 previously-staged
# 即证明 registry 收下，此时记 DONE（附 STAGED-待可见），不再盲等；可见性只一次采样，
# 长轮询仅 -FullPost 跑。发布侧到 registry 全绿即交付：安装一律用户侧做（市场升级/软件内升级/自装）。
# 退出码：0=DONE（全部受理；个别 STAGED-待可见会在行里点名）·1=失败（看 FAIL 行）·2=用法错误（缺 token/无探针靶）。
# TOKEN-PROTOCOL v3（2026-10-02）：探针→发布→快分辨→一次采样。改动本协议时五仓同步，行首标记对齐。
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$PackageDir = '',
  [string]$Registry = 'https://registry.npmjs.org/',
  [string]$TokenEnv = 'NODE_AUTH_TOKEN',
  [string]$LogPath = '',
  [switch]$DryRun,
  [switch]$Probe,
  [switch]$FullPost,
  [switch]$SkipGate
)
$ErrorActionPreference = 'Continue'
if ($PackageDir -eq '') { $PackageDir = Join-Path $RepoRoot 'package' }
if ($LogPath -eq '') { $LogPath = Join-Path $RepoRoot '.tmp-publish-token.log' }

function Log([string]$line) {
  $text = '[' + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') + '] ' + $line
  Write-Host $text
  Add-Content -Path $LogPath -Value $text -Encoding utf8
}
function Mask([string]$s) {
  if ($null -eq $s) { return '' }
  return ($s -replace 'npm_[A-Za-z0-9_-]{6,}', 'npm_***')
}

# ── 阶段 0：取 token（只记变量名，不记值） ────────────────────────────────
$token = [Environment]::GetEnvironmentVariable($TokenEnv)
$tokenFrom = $TokenEnv
if ([string]::IsNullOrWhiteSpace($token) -and $TokenEnv -ne 'NPM_TOKEN') {
  $token = [Environment]::GetEnvironmentVariable('NPM_TOKEN')
  if (-not [string]::IsNullOrWhiteSpace($token)) { $tokenFrom = 'NPM_TOKEN' }
}
if ([string]::IsNullOrWhiteSpace($token) -and $TokenEnv -ne 'NODE_AUTH_TOKEN') {
  $token = $env:NODE_AUTH_TOKEN
  if (-not [string]::IsNullOrWhiteSpace($token)) { $tokenFrom = 'NODE_AUTH_TOKEN' }
}
if ([string]::IsNullOrWhiteSpace($token)) {
  Log ('FAIL 缺 token：环境变量 ' + $TokenEnv + ' 为空（也试过 NPM_TOKEN/NODE_AUTH_TOKEN）。')
  exit 2
}
Log ('TOKEN env=' + $tokenFrom + '（值不打屏）')
# 本进程内统一用 NODE_AUTH_TOKEN 做 ${} 代入：先存下原值，finally 原样恢复。
# （-TokenEnv 指向谁就用谁；杜绝“日志写用 A、实际代入用 B”的双 token 错位。）
$hadNodeToken = [Environment]::GetEnvironmentVariable('NODE_AUTH_TOKEN')
$env:NODE_AUTH_TOKEN = $token
$regHost = ($Registry -replace '^https?://', '') -replace '/$', ''
$tempNpmrc = Join-Path ([System.IO.Path]::GetTempPath()) ('pub-token-' + $PID + '.npmrc')
Set-Content -Path $tempNpmrc -Value ("registry=" + $Registry + "`n//" + $regHost + "/:_authToken=`${NODE_AUTH_TOKEN}`n") -Encoding utf8 -NoNewline
$npmBase = @('--userconfig=' + $tempNpmrc)

function Get-PackageInfo {
  $j = [System.IO.File]::ReadAllText((Join-Path $PackageDir 'package.json')) | ConvertFrom-Json
  if ($j.private -eq $true) { Log ('FAIL ' + [string]$j.name + ' 标了 private:true，npm 拒绝发布；本脚本只发公开包。'); exit 1 }
  return [pscustomobject]@{ name = [string]$j.name; version = [string]$j.version; dir = $PackageDir }
}
function Test-Visible([string]$name, [string]$version) {
  npm @npmBase view ($name + '@' + $version) version --registry=$Registry 2>$null | Out-Null
  return ($LASTEXITCODE -eq 0)
}

try {
  # ── 阶段 1：读表 ──────────────────────────────────────────────────────
  $p = Get-PackageInfo
  Log ('STAGE 1/2 读表 ' + $p.name + '@' + $p.version + '（目录 package/）')
  $todo = -not (Test-Visible $p.name $p.version)
  if (-not $todo) { Log ('SKIP ' + $p.name + '@' + $p.version + ' 云端已有') }
  else { Log ('TODO ' + $p.name + '@' + $p.version + ' 云端没有') }

  # ── 阶段 2：验 token ──────────────────────────────────────────────────
  $who = npm @npmBase whoami --registry=$Registry 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) { Log ('FAIL token 校验没过：' + (Mask $who).Trim()); exit 1 }
  Log ('TOKEN-OK whoami=' + (Mask $who).Trim())

  if ($Probe) {
    if ($todo) { Log 'PROBE-SKIP 本地版本云端还没有（无可重发的已有版本）：先发一版，或等首发后复核。'; exit 2 }
    Log ('PROBE 重发 ' + $p.name + '@' + $p.version + '（云端已有，期望 E409；无副作用）')
    Push-Location $p.dir
    $pout = npm @npmBase publish --access public --registry=$Registry 2>&1 | Out-String
    Pop-Location
    $psafe = (Mask $pout).Trim()
    if ($psafe -match 'cannot publish over|previously published|previously staged|E409|409 Conflict') { Log 'PROBE-OK 写权限成立（registry 拒收已存在版本＝写链路通）'; exit 0 }
    if ($psafe -match 'E403|E401|EOTP|one-time pass|2FA|two-factor') { Log 'PROBE-FAIL 无写权限或被 2FA 卡住'; exit 1 }
    Log 'PROBE-FAIL 未知结果（见上屏尾部）'; exit 1
  }
  if (-not $todo) { Log 'DONE 本次没有要发的包'; exit 0 }
  if ($DryRun) { Log 'DRYRUN 只验到这里，不构建不发布'; exit 0 }

  # ── 门禁：构建＋测试（仓根跑，产物进 package/；可 -SkipGate 跳过） ──────
  if (-not $SkipGate) {
    Log 'GATE 构建：npm run build（仓根）'
    Push-Location $RepoRoot; $b = cmd /c 'npm run build 2>&1' | Out-String; $bc = $LASTEXITCODE; Pop-Location
    if ($bc -ne 0) { Log ('GATE-FAIL 构建红 exit=' + $bc); exit 1 }
    Log 'GATE 构建绿'
    Log 'GATE 测试：npm test（仓根）'
    Push-Location $RepoRoot; $t = cmd /c 'npm test 2>&1' | Out-String; $tc = $LASTEXITCODE; Pop-Location
    if ($tc -ne 0) { $tt = (Mask $t).Trim(); if ($tt.Length -gt 600) { $tt = $tt.Substring($tt.Length - 600) }; Log ('GATE-FAIL 测试红 exit=' + $tc + ' 尾部=' + $tt); exit 1 }
    Log 'GATE 测试绿'
  } else { Log 'GATE 跳过（-SkipGate）' }

  # ── 发布（只进 package/） ─────────────────────────────────────────────
  Log ('PKG-BEGIN ' + $p.name + '@' + $p.version)
  Push-Location $p.dir
  $out = npm @npmBase publish --access public --registry=$Registry 2>&1 | Out-String
  $code = $LASTEXITCODE
  Pop-Location
  $safe = (Mask $out).Trim()
  $accepted = $false; $stagedNote = ''
  if ($code -eq 0) {
    $plus = (($safe -split '\r?\n') | Where-Object { $_ -match '^\+\s' } | Select-Object -First 3) -join '; '
    if ($plus -ne '') { Log ('PKG-OK ' + $p.name + '@' + $p.version + ' ' + $plus) } else { Log ('PKG-OK ' + $p.name + '@' + $p.version) }
    $accepted = $true
  } elseif ($safe -match 'previously staged version|E409|409 Conflict') {
    Log ('PKG-SKIP-staged ' + $p.name + '@' + $p.version + '（E409，视为已受理）'); $accepted = $true; $stagedNote = 'staged'
  } elseif (Test-Visible $p.name $p.version) {
    Log ('PKG-SKIP-staged ' + $p.name + '@' + $p.version + '（registry 已有该版本）'); $accepted = $true
  } else {
    if ($safe -match 'EOTP|one-time pass|2FA|two-factor') { Log 'PKG-FAIL 疑似被 2FA 卡住：换 Automation 或 Granular 写权限 token 再跑。' }
    else { $tail = $safe; if ($tail.Length -gt 800) { $tail = $tail.Substring($tail.Length - 800) }; Log ('PKG-FAIL exit=' + $code + ' 尾部=' + $tail) }
    exit 1
  }
  if (Test-Visible $p.name $p.version) { Log ('VERIFIED ' + $p.name + '@' + $p.version + '（即时可见）') }
  else {
    Push-Location $p.dir
    $rout = npm @npmBase publish --access public --registry=$Registry 2>&1 | Out-String
    Pop-Location
    if ((Mask $rout) -match 'previously staged version|E409|409 Conflict') { Log ('STAGED ' + $p.name + '@' + $p.version + '（已受理、待可见）'); $stagedNote = 'staged' }
    else { Log ('UNCONFIRMED ' + $p.name + '@' + $p.version + '（已受理 exit 0 但即时不可见；由复核确认）') }
  }

  # ── 复核：一次采样（缺省）／长轮询（-FullPost，宣布前用） ───────────────
  if ($FullPost) {
    Log 'POST 长轮询（最多约 10min，直到可见）'
    $tries = 20
    for ($i = 1; $i -le $tries; $i++) {
      if (Test-Visible $p.name $p.version) { Log ('POST-OK ' + $p.name + '@' + $p.version + ' 可见'); break }
      if ($i -eq $tries) { Log 'POST-FAIL 轮询未见（多为复制延迟）：稍后 npm view 复查，不重发'; exit 1 }
      Log ('WAIT ' + $i + '/' + $tries + ' 暂不可见，30s 后重试')
      Start-Sleep -Seconds 30
    }
  } else {
    if (Test-Visible $p.name $p.version) { Log ('POST 可见 1/1') }
    elseif ($stagedNote -eq 'staged' -or $accepted) { Log 'POST STAGED-PENDING 0/1（已受理、待可见；稍后 npm view 复查，宣布前必须可见）' }
  }
  Log ('DONE 已发 ' + $p.name + '@' + $p.version)
  Write-Host '发布侧到此结束（registry 全绿即交付）：安装一律用户侧做（市场升级/软件内升级/自装）。'
} finally {
  try { if (Test-Path $tempNpmrc) { Remove-Item $tempNpmrc -Force -ErrorAction SilentlyContinue } } catch { }
  try {
    if ($null -eq $hadNodeToken) { Remove-Item Env:\NODE_AUTH_TOKEN -ErrorAction SilentlyContinue }
    else { $env:NODE_AUTH_TOKEN = $hadNodeToken }
  } catch { }
}
