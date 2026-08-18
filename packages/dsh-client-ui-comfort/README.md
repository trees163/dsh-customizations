# dsh-client-ui-comfort

Comfort layer for the DSH Web UI — 舒适层（常开）：

- phase/输入区过渡动效（opacity-only，不打断 fixed 后代）
- 输入卡与统计行融合成一张卡
- 统计行悬停气泡修复（pointer-events:none）
- 工具卡流式自动收起（MutationObserver，复用官方 disclosure 点击）

所有效果挂在 <html data-dsh-comfort>；彻底停用 = 删掉 profile 补丁层里
ui-comfort 的 insert 并重启 dsh web。

## 安装

`powershell
dsh plugin --profile web add dsh-client-ui-comfort
`

零依赖（inject: []）。MIT。