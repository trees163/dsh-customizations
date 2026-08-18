# dsh-customizations

> DeepSeek Harness（`dsh web`）个人定制全家桶：三模式 agent 预设、VS Code 布局与文件系统接口、
> 美化/舒适两层 UI 插件、Reasonix 技能与 MCP 桥接、官方包补丁。
> 这是社区项目，与 DeepSeek 官方无关；官方不接受外部 PR，本仓库按官方建议以
> `dsh-plugin` topic 发布供社区发现。

适用版本：`@deepseek-ai/dsh` **0.1.0-rc.6**（Node.js 24 / Windows，macOS/Linux 理论可用但未测）。
完整改造记录见 [`docs/DSH自定义改造全记录.md`](docs/DSH自定义改造全记录.md)。

---

## 功能总览

| 层 | 内容 | 位置 |
|---|---|---|
| ① 预设与路由 | 经典 / Pro 调整（锚定两阶段）/ Flash 闪光（persona 路由）三预设 | `presets/` |
| ② 官方包补丁 | 图片入站桥接（15 包）+ 预设选择语义修复（2 处） | `patches/` |
| ③ 布局插件 | VS Code 布局 + 宿主文件接口（~19 个 `/vscode-files/*` 端点） | `packages/dsh-client-vscode-layout` + `dsh-host-files` |
| ④ 美化/舒适插件 | 9 皮肤 + 壁纸 + 五区透明度；过渡动效 + 输入/统计融合 | `packages/dsh-client-ui-beauty` + `dsh-client-ui-comfort` |
| ⑤ 生态桥接 | 71 个技能 + 4 个 MCP（playwriter/codegraph/github/exa）→ DSH 工具 | `presets/*/plugins/` |

### 三模式预设（`presets/`）

| 预设 | 定位 | 机制 |
|---|---|---|
| `reasonix`（经典） | 标准基底，纯净可自定义 | standard 组成 + 桥接插件，pro/flash 通用 |
| `reasonix-anchored`（Pro 调整） | v4-pro + MAX 深度任务 | 首请求 Minimal persona + 双工具锚定，首个工具调用/回复后提升全量（机制参考 `xiaobright/dsh-anchored-standard`，叠加 Reasonix 桥） |
| `reasonix-flash`（Flash 闪光） | v4-flash + HIGH/MAX fix 类任务 | `model-router.mjs` 零依赖路由：flash 会话自动换 WEAK_FLASH persona，pro 不干预 |

实测数据（同任务对照）：Flash vs 经典 **用时 -46%、推理 -41%、输出 token -24%、let me 轨迹 -56%**；
Pro 锚定 A/B：we 轨迹 ×117/170、let me ×0、16/16 任务全过（we 触发率 ~25%，主因 Windows 环境 + 端到端口径，配置 100% 生效，不承诺 we 必现）。

### UI 插件

- **dsh-client-ui-beauty**：9 套外观（鲸吟·蓝幻/雾蓝·极简/素白·明亮/樱绯·粉/青岚·碧/琥珀·金/紫罗兰/翡翠·绿/原生），后 5 套色相旋转自动生成；Agnes 鲸鱼娘壁纸 + 自定义壁纸**按皮肤独立记忆**；五根分区透明度拉条（面板/对话/工作/文件/阅读，0–200，100=当前观感，各带重置）；设置页 slots 卡片。全部效果挂在 `<html data-dsh-beauty>`，右下角 ◆ 胶囊即时开关，关闭即原生。
- **dsh-client-ui-comfort**：phase/输入区过渡动效（opacity-only）、输入卡与统计行融合成一张卡、统计行悬停气泡修复、工具卡流式自动收起。挂在 `<html data-dsh-comfort>`，胶囊即时开关。

### 文件系统接口（`dsh-host-files`，`/vscode-files/*`）

list / read（docx/xlsx/pptx 自动转 HTML 预览）/ image / raw / doc / legacy（WPS COM）/ reveal（资源管理器定位）/ search / highlight（服务端 shiki）/ git / write / mkdir / mkfile / rename / delete（送回收站）/ persona（全局人设）/ skills / mcp——详见改造记录 §3.1.1。

### MCP 全清单

**DSH 侧（本仓库桥接，`mcp-bridge.mjs` 管理）**：

| 服务器 | 前缀 | 功能 | Key |
|---|---|---|---|
| playwriter | `pw_*` | 浏览器自动化（操控 Chrome） | 零 key |
| codegraph | `cg_*` | 代码图谱（符号上下文/调用链） | 零 key |
| github | `gh_*` | GitHub API（26 工具） | `GITHUB_PERSONAL_ACCESS_TOKEN`（运行时读 `DSH_REASONIX_CONFIG`） |
| exa | `exa_*` | 网页搜索/全文抓取 | `EXA_API_KEY`（可选） |

**Reasonix 侧（本地注册，不在本仓库）**：`config.toml` 的 `[[plugins]]` 段注册了 10 个本地 MCP
（exa / playwriter / github / filesystem / git / memory / sequential-thinking / fetch /
skillspector / ai-music）。其中 ai-music 为本地免费音乐生成（torch CPU 本地推理，8 工具），
依赖本地 Python 环境与模型缓存，无法随仓库分发；其余为官方 MCP 服务器（npm 包名注册）。
这些属于 Reasonix 宿主环境的本地配置，本仓库只桥接不复制。

### 桌面快捷方式启动（launcher）

`tools/launcher/` 提供 IDE 启动器：双击 **「启动 dsh IDE.vbs」** 无控制台闪窗启动
（自动探测 3080 端口 → 没跑则隐藏拉起 `dsh web` → 用 Edge `--app` 模式开独立窗口 1600×950）；
**「停止 dsh web.vbs」** 按端口精准结束服务。想放桌面：把 `tools/launcher/` 拷到
`~/.dsh/launcher/`，右键「启动 dsh IDE.vbs」→ 发送到 → 桌面快捷方式。

---

## 仓库结构

```
packages/                 4 个插件（lib + cordis.patch.yml 激活层）
  dsh-client-ui-beauty/   美化层（9 皮肤）
  dsh-client-ui-comfort/  舒适层
  dsh-client-vscode-layout/  VS Code 布局客户端（anoslide fork 二次开发）
  dsh-host-files/         宿主文件接口（anoslide fork 二次开发）
presets/                  三模式 agent 预设（自包含，复制即装）
patches/
  cordis.patch.yml        profiles 补丁层（插件激活入口）
  node_modules/@deepseek-ai/  16 个官方包补丁副本（见 patches/README.md 重打清单）
tools/                    文档转换（docx/xlsx/pptx→HTML、WPS COM）、拖拽注入脚本、launcher（桌面快捷方式启动）
docs/                     改造全记录（改了什么/怎么做的/参考了谁）
SKILLS.md                 71 个技能清单（来源/许可/API）
```

## 安装

### 方式一：一键脚本（Windows）

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

自动完成：插件 → `~/.dsh/profiles/node_modules/`、官方包补丁覆盖 → dsh 全局包、
`cordis.patch.yml` 合并 → `~/.dsh/profiles/web/`、预设复制 → `~/.dsh/.agent-presets/`、工具脚本 → `~/.dsh/`。

### 方式二：npm（推荐 UI 层）

```powershell
npm login                      # 一次性
dsh plugin --profile web add dsh-client-ui-comfort
dsh plugin --profile web add dsh-client-ui-beauty
dsh plugin --profile web add dsh-host-files
dsh plugin --profile web add dsh-client-vscode-layout
```

每个包自带 `cordis.patch.yml` 激活层（`dsh.bundle.patch`），安装即激活。
注意：方式二与方式一不要混用同一插件的两条 insert（insert id 需唯一）。

### 方式三：手动（预设）

```powershell
$target = Join-Path $env:USERPROFILE '.dsh\.agent-presets\reasonix-anchored'
Copy-Item -Recurse .\presets\reasonix-anchored $target
```

重启 dsh 后新建空白会话，选择对应预设。

### 环境变量（非默认路径时）

桥接插件全部支持环境变量覆盖（默认回退到用户主目录常见位置，通常无需设置）：

| 变量 | 作用 |
|---|---|
| `DSH_MEMORY_DIR` | 共享记忆目录（默认 `~/AppData/Roaming/reasonix/memory/global`） |
| `DSH_SKILLS_ROOT` | 技能根目录（默认 `~/.reasonix/skills`） |
| `DSH_GLANCE` | vision-tools glance CLI 路径（默认 `~/.reasonix/skills/vision-tools/tools/glance`） |
| `DSH_PYTHON` | Python 可执行（默认 `python`，docx 转换/vision 脚本用） |
| `DSH_CG_DIR` | codegraph 项目目录（默认 `~/Desktop/工作区`） |
| `DSH_PLAYWRITER_BIN` / `DSH_CODEGRAPH_NODE` / `DSH_CODEGRAPH_JS` | MCP 服务器可执行路径 |
| `DSH_REASONIX_CONFIG` | Reasonix 配置（github token 读取源，默认 `~/AppData/Roaming/reasonix/config.toml`） |
| `DSH_DOC_CONVERT` / `DSH_WPS_CONVERT` / `DSH_WIDGET_FILE` | 文档转换脚本与拖拽脚本路径（默认 `~/.dsh/`） |

docx 预览依赖：`pip install python-docx openpyxl`（pptx 需 `python-pptx`，见 tools/vscode-doc-convert.py）。

## 使用说明（装完怎么用）

1. **预设**：重启 dsh → 新建空白会话 → 会话设置里选预设——经典（reasonix）/ Pro 调整（reasonix-anchored）/ Flash 闪光（reasonix-flash）。Pro 适合深度任务（配 v4-pro + MAX），Flash 适合 fix/复杂任务（配 v4-flash + HIGH/MAX）。
2. **UI 皮肤**：界面右下角 **◆ 胶囊**打开皮肤菜单（9 套外观 + 自定义壁纸 + 五根透明度拉条），设置页「常规」底部有 Beauty 卡片（透明度/壁纸，每个皮肤独立记忆）；**另一个胶囊**开关舒适层（输入/统计融合、动效）。
3. **文件系统**：左栏文件树（右键：打开/资源管理器定位/复制路径/重命名/删除）、双击文件在中间查看器预览（代码高亮/docx 转换/图片）、工具栏 📂👁✏️➕🔍、文件树拖路径进输入框、设置→全局人设/Skill 管理/MCP 管理。
4. **桥接工具**：装完后 `bridge_status` 可查 playwriter/codegraph/github/exa 四实例状态；技能通过 skill 工具按需加载（SKILLS.md 全清单）；记忆工具 time_now/context7/memory_save/memory_search 直接可用。
5. **改代码后**：改客户端插件 bundle 必须 **Ctrl+Shift+R 强刷**（普通刷新命中浏览器缓存会"改了没生效"）。

## API 接口清单与配置（用户自备）

> 全部为可选接入：不配 key 时 UI/布局/预设照常工作，只有对应功能（读图/搜索/MCP）不可用。

| 组 | 变量 | 用途 | 申请地址 | 配置位置 |
|---|---|---|---|---|
| 核心 | `VISION_API_KEY` + `VISION_BASE_URL` + `VISION_MODEL` | 读图/OCR（当前：小米 MiMo `mimo-v2.5`；OpenAI 兼容接口，可换任意家） | 小米开放平台 MiMo API（或任意 OpenAI 兼容服务） | `%LOCALAPPDATA%\agent-vision-toolkit\env`（格式见下） |
| 核心 | `AGNES_API_KEY` | Agnes 文生图/视频（壁纸生成） | apihub.agnes-ai.com | 环境变量（`AGNES_API_TOKEN` / `APIHUB_AGNES_API_KEY` 任一亦可） |
| 桥接 | `GITHUB_PERSONAL_ACCESS_TOKEN` | github MCP（26 工具） | github.com/settings/tokens（classic 勾 repo 或 fine-grained 勾 Contents 读写） | `DSH_REASONIX_CONFIG` 指向的 toml（默认 `~/AppData/Roaming/reasonix/config.toml`） |
| 桥接 | `EXA_API_KEY` | exa 网页搜索 MCP（可选） | exa.ai | 环境变量 `EXA_API_KEY` |
| 可选 | `SUNO_API_KEY` / `UDIO_API_KEY` / `GOOGLE_API_KEY` | 音乐生成（Lyria/Suno/Udio） | suno.com / udio.com / aistudio.google.com | 环境变量 |
| 可选 | `{PROVIDER}_API_KEY`（OPENAI/GEMINI/QWEN/ZHIPU/MINIMAX 等） | ppt-master 生图/旁白 | 各厂商控制台 | 环境变量或 `~/.ppt-master/.env` |
| 可选 | `PEXELS_API_KEY` / `PIXABAY_API_KEY` | ppt-master 配图搜索 | pexels.com/api / pixabay.com/api | 环境变量 |

`%LOCALAPPDATA%\agent-vision-toolkit\env` 文件格式（MiMo 示例）：

```ini
VISION_API_KEY=sk-你的key
VISION_BASE_URL=https://api.xiaomimimo.com/v1
VISION_MODEL=mimo-v2.5
LANG=zh
```

> 注意：**本仓库不含任何真实 key**。github token 是运行时从用户自己的 `config.toml` 读取的（`mcp-bridge.mjs` 只读 `GITHUB_PERSONAL_ACCESS_TOKEN` 键）；其余全部走环境变量。

全部技能级 API 明细见 [SKILLS.md](SKILLS.md)。

## 参考与致谢

| 内容 | 来源 |
|---|---|
| VS Code 布局基础 | [anoslide/dsh-vscode-layout](https://github.com/anoslide/dsh-vscode-layout)（MIT，fork 二次开发） |
| 蓝幻 token 覆盖逻辑 | [zhu1090093659/dsh-web-ui](https://github.com/zhu1090093659/dsh-web-ui)（Apache-2.0，艺术指导 powerdog996/DreamSkin 社区） |
| 属性门控/插件形态 | [WYH66666666/DSH-Transparent-UI-Plugin](https://github.com/WYH66666666/DSH-Transparent-UI-Plugin)（Aqua） |
| 锚定两阶段机制 | [xiaobright/dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard) |
| Flash persona 路由 | [yjh051108/dsh-router-standard](https://github.com/yjh051108/dsh-router-standard) |
| vision-tools | [Anionex/agent-vision-toolkit](https://github.com/Anionex/agent-vision-toolkit) |
| 壁纸 | Agnes 图像 API 生成 |

原创度评估、踩坑记录、维护与回滚见 [docs/DSH自定义改造全记录.md](docs/DSH自定义改造全记录.md)。

## License

MIT（本仓库），第三方版权见 [NOTICE](NOTICE)。
`patches/` 下为官方包修改副本，重打清单与失效风险见 `patches/README.md`。

## 免责

DeepSeek Harness 处于早期开发预览阶段，允许破坏性变更。补丁按 0.1.0-rc.6 制作，
升级后可能失效（重打清单在 patches/README.md）。使用本仓库内容即视为接受与 shell
同等的信任级别，安装前请审阅代码。
