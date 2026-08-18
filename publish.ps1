# ============================================================
#  publish.ps1 — 把 packages/ 下 4 个插件发布到 npm（无 scope 发行名）
#  用法：
#    powershell -ExecutionPolicy Bypass -File .\publish.ps1          # 发布全部 4 个包
#    powershell -ExecutionPolicy Bypass -File .\publish.ps1 -DryRun  # 只检查（npm publish --dry-run）
#    powershell -ExecutionPolicy Bypass -File .\publish.ps1 -Only dsh-client-ui-beauty  # 发布单个
#  前置：npm login（一次性）
# ============================================================
param(
    [switch]$DryRun,
    [string]$Only
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$packages = @('dsh-client-ui-comfort', 'dsh-client-ui-beauty', 'dsh-client-vscode-layout', 'dsh-host-files')
if ($Only) { $packages = @($Only) }

foreach ($pkg in $packages) {
    $dir = Join-Path $root "packages\$pkg"
    if (-not (Test-Path $dir)) { Write-Host "skip (missing): $pkg" -ForegroundColor Yellow; continue }
    Write-Host "===== $pkg =====" -ForegroundColor Cyan
    Push-Location $dir
    try {
        if ($DryRun) {
            npm publish --dry-run
        } else {
            npm publish
            if ($LASTEXITCODE -ne 0) { throw "npm publish failed: $pkg" }
        }
    } finally {
        Pop-Location
    }
}

Write-Host ''
if ($DryRun) {
    Write-Host 'DryRun 完成（未实际上传）。'
} else {
    Write-Host '发布完成。用户安装：' -ForegroundColor Green
    Write-Host '  dsh plugin --profile web add dsh-client-ui-comfort' -ForegroundColor Cyan
    Write-Host '  dsh plugin --profile web add dsh-client-ui-beauty' -ForegroundColor Cyan
    Write-Host '  dsh plugin --profile web add dsh-host-files' -ForegroundColor Cyan
    Write-Host '  dsh plugin --profile web add dsh-client-vscode-layout' -ForegroundColor Cyan
}
