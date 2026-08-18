# dsh-client-ui-beauty

Beauty layer for the DSH Web UI — 美化层：

- **9 套外观**：鲸吟·蓝幻 / 雾蓝·极简 / 素白·明亮 / 樱绯·粉 / 青岚·碧 / 琥珀·金 / 紫罗兰 / 翡翠·绿 / 原生界面（后 5 套为色相旋转自动生成）
- **背景系统**：内置鲸鱼娘壁纸 + 自定义壁纸（设置页选图，按皮肤独立记忆）
- **五根分区透明度拉条**（0–200，100=当前观感，各带重置）：面板 / 对话区 / 工作区 / 文件区 / 阅读区
- **设置页卡片**：官方 slots 机制注册（settings.general.item，order 11）

所有效果挂在 <html data-dsh-beauty>；右下角 **◆ 胶囊** 即时开关，关闭即原生 UI。
token 覆盖逻辑移植自 [dsh-web-ui](https://github.com/zhu1090093659/dsh-web-ui)
blue-fantasy 皮肤（Apache-2.0），交互框架自研。

## 安装

`powershell
dsh plugin --profile web add dsh-client-ui-beauty
`

MIT。壁纸由 Agnes 图像 API 生成。