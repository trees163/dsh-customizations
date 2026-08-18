# vscode-wps-convert.ps1 — 老版 doc/xls/ppt → HTML（经 WPS COM），供 dsh-host-files 调用
param([string]$Path)
$ErrorActionPreference = 'Stop'
$ext = [System.IO.Path]::GetExtension($Path).ToLower()
$base = Join-Path $env:TEMP ("wpsconv-" + [guid]::NewGuid().ToString("N"))
$html = $null

try {
    switch ($ext) {
        '.doc' {
            $app = New-Object -ComObject KWPS.Application
            try {
                $app.Visible = $false
                $doc = $app.Documents.Open($Path, $false, $true)
                $out = $base + ".htm"
                $doc.SaveAs2($out, 8)   # wdFormatHTML
                $doc.Close($false)
                $html = [System.IO.File]::ReadAllText($out, [System.Text.Encoding]::Default)
            } finally { try { $app.Quit() } catch {} }
        }
        '.xls' {
            $app = New-Object -ComObject KET.Application
            try {
                $app.Visible = $false
                $wb = $app.Workbooks.Open($Path, $null, $true)
                $out = $base + ".htm"
                $wb.SaveAs($out, 44)    # xlHtml
                $wb.Close($false)
                $html = [System.IO.File]::ReadAllText($out, [System.Text.Encoding]::Default)
            } finally { try { $app.Quit() } catch {} }
        }
        '.ppt' {
            $app = New-Object -ComObject KWPP.Application
            try {
                $pres = $app.Presentations.Open($Path, $true, $false, $false)
                $out = $base + ".htm"
                $pres.SaveAs($out, 12)  # ppSaveAsHTML
                $pres.Close()
                $html = [System.IO.File]::ReadAllText($out, [System.Text.Encoding]::Default)
            } finally { try { $app.Quit() } catch {} }
        }
        default {
            $html = '<div style="color:#f97583">不支持的格式: ' + $ext + '</div>'
        }
    }
} catch {
    $html = '<div style="color:#f97583">转换失败: ' + ($_.Exception.Message) + '</div>'
} finally {
    Get-ChildItem ($base + '*') -ErrorAction SilentlyContinue | ForEach-Object {
        try { [System.IO.File]::Delete($_.FullName) } catch {}
    }
}

if ($html -and $html -notmatch 'charset\s*=\s*utf-8') {
    $html = $html -replace '(?i)(<meta[^>]*charset\s*=\s*["'']?)[^"'']+', '${1}utf-8'
}
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Output $html
