# dsh-client-vscode-layout

VS Code 风格布局客户端（**需与 dsh-host-files 搭配**）：

- 左栏上下分屏：会话区 + 文件树（可拖分隔线，右键菜单：打开/资源管理器定位/复制路径/重命名/删除）
- 中间多标签只读查看器（代码高亮 / 图片 / docx 预览 / 编辑模式）
- 右侧对话/详情 Tab
- 文件树拖路径进输入框（rx-drop-widget.js）

fork 自 [anoslide/dsh-vscode-layout](https://github.com/anoslide/dsh-vscode-layout)
（MIT）并二次开发。

## 安装

`powershell
dsh plugin --profile web add dsh-host-files
dsh plugin --profile web add dsh-client-vscode-layout
`

MIT。