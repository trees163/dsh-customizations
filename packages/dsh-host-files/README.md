# dsh-host-files

宿主文件系统接口（服务端插件），约 19 个 /vscode-files/* 端点：

list / read / image / raw / doc（docx/xlsx/pptx→HTML 预览）/ legacy（WPS COM）/
open / reveal / search / highlight（服务端 shiki）/ git / write / mkdir / mkfile /
rename / delete（送回收站）/ persona（全局人设）/ skills / mcp（管理接口）

fork 自 [anoslide/dsh-vscode-layout](https://github.com/anoslide/dsh-vscode-layout)
（MIT）并二次开发。

## 环境变量（非默认路径时）

| 变量 | 默认 |
|---|---|
| DSH_PYTHON | ~/python/python.exe（找不到用 python） |
| DSH_DOC_CONVERT | ~/.dsh/vscode-doc-convert.py |
| DSH_WPS_CONVERT | ~/.dsh/vscode-wps-convert.ps1 |

docx 预览依赖：pip install python-docx openpyxl python-pptx（脚本见仓库 tools/）。

## 安装

`powershell
dsh plugin --profile web add dsh-host-files
`

MIT。