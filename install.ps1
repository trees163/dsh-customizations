# ============================================================
#  dsh-customizations 一键安装脚本（Windows）
#  用法：powershell -ExecutionPolicy Bypass -File .\install.ps1
#  自动完成：装插件 → 打官方包补丁 → 合并 cordis.patch.yml → 装预设 → 装工具脚本
# ============================================================
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host '===== dsh-customizations 安装器 ====='

# 0) 前置检查
$dshCmd = Get-Command dsh -ErrorAction SilentlyContinue
if (-not $dshCmd) {
    Write-Host ''
    Write-Host '未找到 dsh 命令，请先安装: npm i -g @deepseek-ai/dsh' -ForegroundColor Yellow
    Read-Host '按回车键关闭'
    exit 1
}

# 1) 定位全局 dsh 包目录
$globalRoot = Join-Path $env:APPDATA 'npm\node_modules'
$dshPkg = Join-Path $globalRoot '@deepseek-ai\dsh'
$dshPkgOfficial = Join-Path $dshPkg 'node_modules\@deepseek-ai'
if (-not (Test-Path $dshPkg)) {
    # 兜底：从 dsh 命令解析真实安装位置
    $cmdPath = (Get-Command dsh).Source
    $dshPkg = Split-Path (Split-Path $cmdPath -Parent) -Parent
    $dshPkgOfficial = Join-Path $dshPkg 'node_modules\@deepseek-ai'
    if (-not (Test-Path $dshPkgOfficial)) {
        Write-Host "未找到 dsh 官方包目录（尝试: $dshPkgOfficial）" -ForegroundColor Yellow
        Read-Host '按回车键关闭'
        exit 1
    }
}

# 2) 安装插件 -> ~/.dsh/profiles/node_modules/
$profilesNode = Join-Path $env:USERPROFILE '.dsh\profiles\node_modules'
New-Item -ItemType Directory -Path $profilesNode -Force | Out-Null
Get-ChildItem (Join-Path $here 'packages') -Directory | ForEach-Object {
    Copy-Item $_.FullName (Join-Path $profilesNode $_.Name) -Recurse -Force
}
Write-Host "[1/5] 插件已安装 -> $profilesNode"

# 3) 打官方包补丁
$patchSrc = Join-Path $here 'patches\node_modules\@deepseek-ai'
if (Test-Path $patchSrc) {
    Copy-Item (Join-Path $patchSrc '*') $dshPkgOfficial -Recurse -Force
    Write-Host "[2/5] 官方包补丁已应用 -> $dshPkgOfficial"
} else {
    Write-Host '[2/5] 未找到 patches 目录，跳过' -ForegroundColor Yellow
}

# 4) 合并 cordis.patch.yml（已存在则提示手动合并，避免冲掉已有配置）
$targetCfg = Join-Path $env:USERPROFILE '.dsh\profiles\web\cordis.patch.yml'
if (Test-Path $targetCfg) {
    Write-Host '[3/5] 检测到已有 cordis.patch.yml，未覆盖。' -ForegroundColor Yellow
    Write-Host '      请手动把 patches/cordis.patch.yml 里的 insert 段合并进去（vscode-host-files / ui-comfort / ui-beauty）。'
} else {
    New-Item -ItemType Directory -Path (Split-Path $targetCfg) -Force | Out-Null
    Copy-Item (Join-Path $here 'patches\cordis.patch.yml') $targetCfg -Force
    Write-Host "[3/5] 配置已写入 -> $targetCfg"
}

# 5) 安装预设 -> ~/.dsh/.agent-presets/
$presetRoot = Join-Path $env:USERPROFILE '.dsh\.agent-presets'
New-Item -ItemType Directory -Path $presetRoot -Force | Out-Null
Get-ChildItem (Join-Path $here 'presets') -Directory | ForEach-Object {
    $dst = Join-Path $presetRoot $_.Name
    if (Test-Path $dst) {
        Write-Host "[4/5] 预设已存在，跳过: $($_.Name)" -ForegroundColor Yellow
    } else {
        Copy-Item $_.FullName $dst -Recurse -Force
        Write-Host "[4/5] 预设已安装: $($_.Name)"
    }
}

# 6) 工具脚本 -> ~/.dsh/（含 launcher 桌面快捷方式启动）
Get-ChildItem (Join-Path $here 'tools') -File | ForEach-Object {
    Copy-Item $_.FullName (Join-Path $env:USERPROFILE '.dsh') -Force
}
$launcherSrc = Join-Path $here 'tools\launcher'
if (Test-Path $launcherSrc) {
    Copy-Item $launcherSrc (Join-Path $env:USERPROFILE '.dsh\launcher') -Recurse -Force
}
Write-Host '[5/5] 工具脚本已复制（vscode-doc-convert.py / vscode-wps-convert.ps1 / rx-drop-widget.js / launcher）'

Write-Host ''
Write-Host '===== 安装完成！启动方式 ====='
Write-Host '  1) 终端运行: dsh web'
Write-Host '  2) 浏览器打开 http://127.0.0.1:3080'
Write-Host ''
Write-Host '提示:'
Write-Host '  - docx/xlsx/pptx 预览需 Python: pip install python-docx openpyxl python-pptx'
Write-Host '  - 桥接插件的路径可用 DSH_* 环境变量覆盖（见 README）'
Write-Host '  - 补丁按 dsh 0.1.0-rc.6 制作，升级后需重打（见 patches/README.md）'
Write-Host ''
Read-Host '按回车键关闭此窗口'
