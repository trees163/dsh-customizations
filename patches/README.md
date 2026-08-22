# patches — 官方包补丁

`node_modules/@deepseek-ai/*` 下是对官方 DeepSeek Harness 包（`@deepseek-ai/dsh` 0.1.0-rc.6）
编译产物的修改副本。**升级 `npm update -g @deepseek-ai/dsh` 后必须重打**；补丁按当前版本制作，
版本不同可能部分失效。

> 版权：原包为 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
> 的一部分，MIT 许可，Copyright (c) DeepSeek。本目录为修改副本，仅作补丁重放用途。

## 补丁清单（16 个包）

### 图片入站桥接（VS Code 布局配套，15 包）

图片附件不再被拒、落盘 `~/.dsh/attachments/`，图片块在对话中转为含本地路径的文本
（纯文本模型也能"看图"，再由 agent 调 vision_glance / 视觉 MCP 识图）：

- `dsh-client-ui-conversation` — 对话消息渲染：图片块 → 本地路径文本
- `dsh-client-ui-tool` — 工具卡渲染适配
- `dsh-command-compact` / `dsh-command-feedback` / `dsh-command-goal` — 命令层放行图片入站
- `dsh-host-apiproxy` — 附件上传/落盘通道
- `dsh-host-directory-picker-native` — 目录选择器适配
- `dsh-llm-deepseek` / `dsh-llm-pi-ai` — 多模态消息序列化（图片转文本描述）；**`dsh-llm-deepseek` 另含模型目录补丁：新增 `deepseek-v4-flash-vision-exp`（官方 2026-08-21 上线，设置里可选）**
- `dsh-permission-presets` / `dsh-plan-mode` / `dsh-session-log-export` — 权限/计划/导出适配
- `dsh-tool-fs` — 文件工具适配
- `dsh-web-app` / `dsh-web-frontend` — Web 壳与入口适配

### 预设选择语义修复（`dsh-client-ui-agent-preset`，2 处）

原生 bug：新建会话对话框的预设选择是"一次性 stage"，遇到已有活动会话时把 staged 丢弃
（按钮显示选了 X，实际会话用的是设置默认）。

- **补丁① `apply()`**：`session.agentPreset === staged`（已应用）才消费；`!session.blank`
  （活动会话）时保留 staged 给下一个空白会话 → 对话框选择决定"下一个新建会话"的预设；
- **补丁② `load()`**：`current = this.staged ?? 最近会话的预设 ?? fallback` 改为
  `this.staged ?? this.fallback` → 新会话默认完全跟随设置。

## 重打流程（升级后）

```powershell
# 1) 找到 dsh 全局包目录
$dshPkg = "D:\Node\npm-global\node_modules\@deepseek-ai\dsh\node_modules\@deepseek-ai"  # 按实际位置改
# 2) 覆盖补丁（install.ps1 会自动做这一步）
Copy-Item .\node_modules\@deepseek-ai\* $dshPkg -Recurse -Force
# 3) 重启 dsh web
```

## 验证

新建会话 → 拖一张图片进对话 → 附件落盘 `~/.dsh/attachments/` 且对话中出现本地路径文本；
设置页切换预设 → 新建空白会话 → 导出 session.jsonl 首行 `agentPreset` 与所选一致。
