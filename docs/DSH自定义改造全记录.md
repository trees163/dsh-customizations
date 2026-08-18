# DSH 自定义改造全记录 —— 相比原生 DeepSeek Harness，我们做了什么、怎么做的

> 适用版本：`@deepseek-ai/dsh` **0.1.0-rc.6**（npm 全局安装于 `D:\Node\npm-global`）
> 记录时间：2026-08-16 · 覆盖从 2026-08-14 至今的全部改造
> 本文档回答三个问题：**改了什么 / 怎么做到的 / 参考了谁、多少原创**

---

## 成就极简总结

**预设与路由（本改造的核心）**
- 三预设落地：**经典模式**（reasonix）/ **Pro 调整模式**（reasonix-anchored，锚定）/ **Flash 闪光模式**（reasonix-flash，路由）
- 锚定技术（极简两阶段）：A/B 实测 we×117/170、let me×0、16/16 全过；we 轨迹触发率 ~25%（判定主因是 **Windows 系统环境** + 端到端口径，见 1.2）
- Flash 路由（零依赖 model-router）：同任务 fix 类对照 **用时 -46%、推理 -41%、输出 token -24%、let me 轨迹 -56%**
- 修复官方预设选择 bug（两处补丁）：对话框选择真的生效 + 新会话默认完全跟随设置

**插件与 UI**
- VS Code 布局魔改：左栏上下分屏、文件树右键菜单、拖拽注入、图片页内预览、docx/xlsx/pptx/doc 页内转换预览、代码高亮、git 状态、编辑模式
- 宿主文件系统接口套件（约 19 个 `/vscode-files/*` 端点）：读/写/搜索/高亮/转换/资源管理器定位/全局人设/Skill 管理/MCP 管理
- 美化层：**9 套皮肤**（后 5 套色相旋转自动生成）、Agnes 鲸鱼娘壁纸 + 自定义壁纸**按皮肤独立记忆**、五区透明度拉条（面板/对话/工作/文件/阅读）、设置页官方 slots 卡片
- 舒适层：输入卡-统计融合、过渡动效、工具卡流式自动收起、统计行悬停气泡修复

**生态桥接**
- 68 个技能 + 4 个 MCP 服务器（playwriter 浏览器 / codegraph 代码图谱 / github / exa 网页搜索）桥接进 DSH
- 记忆系统、vision-tools 本地视觉、文档转换链（Python + WPS COM 双轨）

**工程保障**
- 全量备份体系（backup-all.ps1 → 华为盘 425MB）、升级重打补丁清单、junction 结构、插件随时可停用

---

## 0. 总览：原生 DSH 是什么，我们叠加了什么

原生 DeepSeek Harness（`dsh web`）是一个三栏式 AI 工作台：左侧会话/文件、中间编辑区、右侧对话面板，带插件系统（cordis 生态）、预设系统（agent-presets）、工具系统（skill / MCP）。

我们的改造分为 **五层**，全部**不修改官方源码的架构**（除少数必须打的官方包补丁外），以"插件 + 预设 + 补丁"形式叠加：

| 层 | 内容 | 形态 |
|---|---|---|
| ① 预设与路由 | reasonix / reasonix-anchored / reasonix-flash 三预设 + 锚定/路由技术 | `~/.dsh/.agent-presets/` 独立副本 |
| ② 官方包补丁 | 图片桥接、预设选择语义修复（2 处） | 直接改 `node_modules` 编译产物（可重打） |
| ③ 自研插件 | `@anoslide/dsh-host-files` + `dsh-client-vscode-layout`（VS Code 布局魔改） | junction 进 profile node_modules |
| ④ 美化/舒适插件 | `@deepseek-ai/dsh-client-ui-beauty`（9 皮肤）+ `dsh-client-ui-comfort`（动效/融合） | 同上，属性门控、可随时停用 |
| ⑤ MCP 桥接 | playwriter / codegraph / github / exa → DSH 工具 | `mcp-bridge.mjs`（三预设各一份） |

---

## 1. 预设与路由（重点：锚定 anchored）

### 1.1 三预设架构（`~/.dsh/.agent-presets/`）

| 预设目录 | 显示名 | 内容 |
|---|---|---|
| `reasonix` | 经典模式 | standard 基底 + 4 桥接插件 + 2 个 cordis 技能；纯净可自定义人设；pro/flash 通用 |
| `reasonix-anchored` | Pro 调整模式 | **极简锚定两阶段**（A/B 验证的 v4-pro 最优路径）；专配 v4-pro + MAX |
| `reasonix-flash` | Flash 闪光模式 | 经典 + `model-router.mjs`：flash 会话自动换 WEAK_FLASH persona；pro 不干预；建议 v4-flash + HIGH/MAX |

每个预设 = 独立副本（非符号链接），`agent.cordis.yml` 尾部挂 5–6 行自研插件；**技能单一来源** `~/.reasonix/skills/`（三预设共享），**MCP 桥是三份独立副本需手动同步**。

### 1.2 锚定技术（reasonix-anchored，Pro 侧）

**参考来源**：`xiaobright/dsh-anchored-standard`（**861★**，社区论调"pro 用 anchored"）。机制：
- 首请求只给 **Minimal persona + 双工具**（bash / str_replace_editor），`complete:true`；
- **首个工具调用/回复后提升全量工具**（两阶段 = 锚定）；
- 我们在此基础上**叠加 Reasonix 桥**（技能/MCP），形成 `tool-bootstrap.mjs`。

**实证**（A/B，8-15）：we×117/170、let me×0、16/16 全过；8-16 复测：**we 轨迹触发率 ~25%**。

**关于 25% 与社区 ~81% 的差距，我们的判断**：
1. **主因是系统环境**：我们是 **Windows**，社区实测数据多来自 Linux/macOS——模型的轨迹行为在 Windows 下（路径语义、工具生态、shell 差异）与社区环境有系统性偏差；
2. 其次是**口径不同**：社区的 ~81%（issue #11）是"**同一请求**复现率"，我们是"**端到端新会话 + 新任务**"的首次轨迹触发率；
3. v4-pro 本身有时序波动；任务越长、越偏英文提示词，we 倾向越强（论坛 80893 变体，未实测）。

**结论**：锚定配置 **100% 生效**（每次都是 minimal persona + 双工具 + v4-pro/max）；we 轨迹是**概率性加分项**，任务完成质量与 we 无关（8 次全部正常完成）——不承诺 we 一定出现。

### 1.3 Flash 路由（reasonix-flash）

**参考来源**：`yjh051108/dsh-router-standard`（routing-suite 三件套之一）+ 社区 WEAK_FLASH persona。我们的 `model-router.mjs` 是**零依赖精简版**：
- `modelId = agent.options?.model`，`/flash/i` 判断；
- `assemble` 事件里把 sections 替换为 `[planSection?, router-persona]`，保留 plan-mode section（plan 不失忆），contexts 默认保留；
- 只 inject systemPrompt，不碰其他。

**实证**（8-16 同任务 fix 类对照，v4-flash/Max/Full access）：闪光模式 vs 经典：总用时 **-46%**、推理字符 **-41%**、输出 token **-24%**、let me 轨迹 **-56%** → fix/复杂任务用 Flash 闪光，pro 深度任务用 Pro 调整，build 简单任务两者皆可。

### 1.4 关键情报（社区机制研究，记录于记忆）

- 晋升后 system prompt 突变（46→6620 字符）本身是扰动源；
- **persona 是主导触发器**（一句话换词翻转轨迹）；
- 行为路径承诺（锚定后扩目录最多扰动一个推理块、不翻转模式——印证我们的 A/B）；
- v4-flash 推理等级 DEFAULT=let me 失败，**HIGH/MAX 才可用**；
- 作者勘误：撤回"双吸引子/god-ghost"理论，承认是"原生深度路径 + 后压未收敛极简路径的断层"被当路由层用。

---

## 2. 官方包补丁（升级会冲掉，需重打）

官方包位于 `D:\Node\npm-global\node_modules\@deepseek-ai\dsh\node_modules\@deepseek-ai\`。我们直接修改了编译产物（client 运行时模块，浏览器从 host 加载，**改完重启即生效、无需重建 web**）。**升级 `npm update -g @deepseek-ai/dsh` 后必须重打**；原版备份在 `C:\Users\92905\.dsh\backup\official-pkgs-20260815\`。

### 2.1 图片桥接（VS Code 布局配套）
- **放行图片入站**：图片附件不再被拒，落盘 `~/.dsh/attachments/`；
- 图片块在对话里**转成含本地路径的文本**给 DeepSeek（纯文本模型也能"看图"）→ agent 调 `vision_glance` / 视觉 MCP 识图。
- 涉及约 **15 个官方包**的补丁覆盖（`README` 维护章节有重放流程）。

### 2.2 预设选择语义修复（`dsh-client-ui-agent-preset/lib/client.js`，两处补丁）
原生 bug：新建会话对话框的预设选择是"一次性 stage"，遇到**已有活动会话**时把 staged 丢弃 → **按钮显示选了 X，实际会话用的是设置默认**（多次实测：按钮显示"经典模式"、导出 session.jsonl 的 agentPreset 却是 reasonix-flash）。
- **补丁① `apply()`**：`session.agentPreset === staged`（已应用）才消费；`!session.blank`（活动会话）时保留 staged 给下一个空白会话 → **对话框选择决定"下一个新建会话"的预设**；
- **补丁② `load()`**：原 `current = this.staged ?? 最近会话的预设 ?? fallback` 改成 `this.staged ?? this.fallback` → **新会话默认完全跟随设置**，不再被"最近选中会话"拦截（此前 92905 工作区因有经典会话导致设置时灵时不灵）。
- 验证流程：`Session log 导出 zip → node ~/.dsh/flash-test/extract.mjs → probe.mjs` 看首行 `agentPreset`。

### 2.3 环境修整
- 全局 **pnpm 11.21**（`dsh plugin` 命令依赖）；
- profile 目录加 `.npmrc`（npmmirror 镜像）+ `pnpm-workspace.yaml`（`nodeLinker: hoisted`、`allowBuilds: sharp: true`）。

---

## 3. 自研插件

### 3.1 `@anoslide/dsh-host-files` + `dsh-client-vscode-layout`（VS Code 布局魔改）

**参考来源**：社区仓库 `anoslide/dsh-vscode-layout`（本地副本 `C:\Users\92905\.dsh\vscode-layout-repo\dsh-vscode-layout-master\`）——**在此基础上做了大量二次开发**，以下均是我们新增/修改的：

#### 3.1.1 宿主文件系统接口（`/vscode-files/*`，约 19 个端点，自研/魔改）

| 端点 | 作用 |
|---|---|
| `GET /list?path=` | 列目录 → `{ ok, path, dirs, files }`（文件树数据源） |
| `GET /read?path=` | **文件读取** → `{ ok, kind, content, size }`；kind 区分 text/binary 等；单文件读取上限 2MB（超出截断并标注）；对 docx/xlsx/pptx 自动走转换预览 |
| `GET /image?path=` | **图片页内预览**：字节流直出（点图在中间查看区内嵌显示，不弹外部窗口） |
| `GET /raw?path=` | 原始字节流（pdf 预览 iframe 用，浏览器原生渲染） |
| `GET /doc?path=` | docx/xlsx/pptx → `vscode-doc-convert.py`（python-docx/openpyxl/python-pptx）→ HTML 页内预览 |
| `GET /legacy?path=` | 老版 doc/xls/ppt → `vscode-wps-convert.ps1`（**WPS COM**：KWPS/KET/KWPP.Application SaveAs HTML；实测 .doc 无乱码） |
| `GET /open?path=` | 外部打开（系统默认程序；图片场景改为页内显示后此接口保留但无 UI 调用） |
| `GET /reveal?path=` | **在资源管理器中打开并定位**：文件用 `explorer /select` 选中，目录直接打开 |
| `GET /search?path=&q=` | 文件搜索：深度 8、条目上限 2 万、结果上限 200；跳过 `.git/node_modules/__pycache__/dist/.next/.dsh` 等目录 |
| `GET /highlight?path=&theme=` | **服务端 shiki 语法高亮**（dark/light 主题跟随界面，默认 github-dark）→ 代码阅读区 |
| `GET /git?path=` | git 仓库状态 → `{ ok, statuses }`（或 notRepo），文件树上显示变更标记 |
| `POST /write` | **写入文件**（`{ path, content }` → `{ ok, size }`；上限 10MB）——编辑模式保存 |
| `POST /mkdir` / `POST /mkfile` | 新建目录 / 新建文件（工具栏 ➕） |
| `POST /rename` | 重命名（`{ path, newName }`） |
| `POST /delete` | **删除（送回收站，可恢复）** |
| `GET/POST /persona` | **全局人设**：读写 `~/.dsh/global-persona.md`，注入所有会话的 systemPrompt（设置→全局人设 编辑器） |
| `GET /skills`、`POST /skills/toggle`、`POST /skills/delete` | **Skill 管理**：列表 / 启用停用 / 删除（设置页卡片） |
| `GET /mcp`、`POST /mcp/toggle`、`POST /mcp/delete`、`POST /mcp/add` | **MCP 管理**：列表 / 启停 / 删除 / 新增（设置页卡片） |

#### 3.1.2 文件树与查看器交互（客户端魔改）

| 功能 | 做法 |
|---|---|
| **左栏上下分屏** | 上半会话区 60%（3:2）+ 下半文件树 40%，可拖动分隔线（视觉 1px 灰线 + 实际 8px 透明命中区，悬停变亮；`vk-left-split-v2`） |
| **文件树右键菜单** | 打开/展开、**在资源管理器中打开**（`/vscode-files/reveal`）、复制路径、重命名、删除（送回收站）；点击外部/Esc 关闭 |
| **文件树拖拽入输入框** | `rx-drop-widget.js` 捕获 `application/x-dsh-filepath`，光标处插入路径 |
| **工具栏** | 📂查看 / 👁预览 / ✏️编辑 / ➕新建 / 🔍搜索文件 |
| **编辑模式** | 页内 textarea（`.vk_editorInput`）编辑 + 保存（写回 `/vscode-files/write`），带行号栏（`.vk_gutter`） |
| **二进制双层处理** | OPEN_EXT（zip/rar/7z/iso…）外部打开；BLOCK_EXT（exe/dll/msi/apk/媒体/字体/模型…）只提示不打开 |
| **doc 预览白底黑字** | iframe `#ffffff` + 转换器深色文字（用户要求像真 Word） |
| **⚙ 设置固定在侧栏最底端** | `.vk_leftTop [class*=footArea]{position:absolute;bottom:0}` + `.vk_colLeft{position:relative}` + `.vk_leftBottom{padding-bottom:48px}` |
| **文档阅读/编辑区透明化** | 行号栏/编辑框/编辑工具栏/`shiki` 代码高亮（github-light 内联白底）/docx iframe 内联白底 → 全部 `transparent`（见 3.3 美化层的"强制全白"修复） |

### 3.2 `@deepseek-ai/dsh-client-ui-comfort`（舒适层，常开）

**原创为主，机制借鉴 Aqua**。纯客户端插件（`__ModuleLoader__` 工厂形），所有效果挂在 `<html data-dsh-comfort>` 属性上，零依赖：

- **过渡动效**：phase 切换/输入区/消息行淡入+上浮（opacity-only，避免 transform 打断 fixed 后代——Aqua 的经验）；
- **输入卡与统计行融合**成一张卡（`:has()` 检测统计 dock + 复用官方 token）；
- **统计行悬停气泡修复**：stock 在悬停时弹截断提示气泡盖住数据 → `pointer-events:none`；
- **工具卡流式自动收起**：MutationObserver 监测新 live 卡出现时自动收起上一张（复用 stock 的 `[data-disclosure-row]` 点击）。

### 3.3 `@deepseek-ai/dsh-client-ui-beauty`（美化层，9 皮肤 + 壁纸 + 分区透明度）

**覆盖逻辑移植自蓝幻皮肤，交互框架原创**（详见第 5 节参考来源）：

- **9 套外观**：鲸吟·蓝幻 / 雾蓝·极简 / 素白·明亮 / 樱绯·粉 / 青岚·碧 / 琥珀·金 / 紫罗兰 / 翡翠·绿 / 原生界面；
  - 后 5 套是**色相旋转生成**（对全套 `--dsw-*` token 做 HSL 旋转，饱和度 <0.06 的灰/白/黑不转，保证文字和遮罩可读）；
- **背景系统**：鲸鱼娘壁纸（**Agnes 图像 API 生成**）+ 自定义壁纸（设置页选图，canvas 压缩 1920px JPEG 存 localStorage，**按皮肤独立记忆**）；
- **五根分区透明度拉条**（0–200，100=当前观感，各带重置按钮）：面板 / 对话区 / 工作区 / 文件区 / 阅读区——用 background-image 渐变纱罩（盖背景不盖内容、明暗各一套）+ `color-mix` 表面稀释实现 boost；
- **设置页卡片**：通过官方 slots 机制（`settings.general.item` 插槽 order 11）注册，React 组件用 `props.children` 形式（平台 jsx 运行时只认这种，位置参数会被丢弃——踩坑记录）；
- **踩坑记录**（都是实测）：平台插件清单只读 → 开关只能自己做；`[role=tooltip]` 文字硬编码白色、只读 bg token → 浅色模式白字白底看不清，改为深靛蓝底白字；shiki/docx iframe 内联白底 → `!important` 覆盖；`[data-phase]` 不能裸用（composer 输入框也有 phase="plain"）。

---

## 4. Skill / MCP 桥接（Reasonix 生态 ↔ DSH）

桥接由三个自研插件完成（三预设各一份，需手动同步）：

- **`skills-bridge.mjs`**：`~/.reasonix/skills/` 全部技能注册进 DSH `skill` 工具（4 个无 SKILL.md 的目录用合成说明）；
- **`base-tools.mjs`**：基础工具 `time_now` / `context7` / `memory_save` / `memory_search` / `vision_glance` + 记忆规则注册为技能；
- **`mcp-bridge.mjs`**：四个 MCP 服务器 → DSH 工具 + `bridge_status` 诊断工具。

### 4.1 Skills 清单（68 个，`~/.reasonix/skills/` 单一来源，三预设共享）

**生成/创意类**
| 技能 | 主要功能 |
|---|---|
| `agnes-ai-generation` | Agnes AI API：文本/图像/视频生成（含图生图、视频轮询检索） |
| `brandkit` | 品牌图板生成（logo/配色/字型参考图，只出图不出代码） |
| `imagegen-frontend-mobile` / `imagegen-frontend-web` | 移动端 / 网页界面参考图生成 |
| `image-to-code-skill` | 参考图 → 前端代码流水线 |
| `gpt-tasteskill` | Awwwards 级动效视觉变体（GSAP/bento） |
| `lyriccraft` / `music-generation` / `songforge` / `sunomaster` | 音乐生成工具链（Suno 等，skill + MCP 位置速查有记录） |
| `ip-drama-video-sop` | IP 小说改编短剧全流程（拆书→剧本→分镜→AI 短视频），每步需用户确认 |

**设计/UI 类**
| 技能 | 主要功能 |
|---|---|
| `taste-skill` / `taste-skill-v1` | 反 AI 味落地页/作品集默认风格（v1 为向后兼容旧版） |
| `minimalist-skill` / `soft-skill` / `brutalist-skill` / `redesign-skill` | 极简 / 奢华 / 粗野 / 全面重设计四种视觉变体 |
| `baseline-ui` / `improve-ui` | 战术性 UI 打磨 / 系统性 UI 审计+计划 |
| `create-design-md` | 从现有产品提取设计语言写 DESIGN.md |
| `stitch-skill` | Google Stitch 集成（DESIGN.md 导出兼容） |

**工程方法类**
| 技能 | 主要功能 |
|---|---|
| `tdd` / `test-driven-development` | 测试驱动开发（后者为强约束版：先看红、删码重写） |
| `implement` / `wayfinder` | 单任务实现（TDD 驱动）/ 大型多会话任务规划 |
| `writing-plans` / `executing-plans` | 写实施计划 / 跨会话按检查点执行计划 |
| `subagent-driven-development` | 计划任务并行分发给子代理 |
| `using-git-worktrees` / `resolving-merge-conflicts` / `finishing-a-development-branch` | git worktree 隔离 / 冲突解决 / 分支收尾决策 |
| `requesting-code-review` / `receiving-code-review` / `code-review` | 请求评审 / 响应评审 / 双轴（标准+规格）评审 |
| `diagnosing-bugs` / `systematic-debugging` | 硬 bug 诊断循环 / 结构化根因分析 |
| `fixing-accessibility` / `fixing-metadata` / `fixing-motion-performance` | 可访问性 / SEO 元数据 / 动效性能修复 |
| `verification-before-completion` / `full-output-enforcement`（output-skill） | 完成前强制验证 / 输出完整性约束 |
| `karpathy-guidelines` | 减少 LLM 编码常见错误的纪律清单 |
| `codebase-design` / `improve-codebase-architecture` / `domain-modeling` | 模块接口设计 / 架构深扫 / 领域语言 |
| `dispatching-parallel-agents` | 2+ 独立任务并行分发 |
| `using-superpowers` + `superpowers-*`（3 个） | Superpowers 系统（规格评审/实现/质量评审子代理） |
| `teach` / `handoff` | 多会话教学 / 会话交接文档 |

**需求/文档类**
| 技能 | 主要功能 |
|---|---|
| `brainstorming` / `grill-me` / `grill-with-docs` / `grilling` | 需求探索 / 拷问式打磨（可选产出 ADR/词汇表） |
| `to-spec` / `to-tickets` / `triage` | 会话转规格 / 规格拆工单 / issue 三流分诊 |
| `writing-great-skills` / `writing-skills` / `install-skill` | 技能写作规范 / 新技能 / 从 GitHub 安装技能 |
| `prototype` | 一次性原型验证设计问题 |
| `ask-matt` | 技能路由（不知道用哪个技能时） |
| `setup-matt-pocock-skills` | 工程技能套件初始化（issue tracker/分诊标签） |

**数据处理类**
| 技能 | 主要功能 |
|---|---|
| `baoyu-url-to-markdown` | 网页 URL → Markdown（CDP 抓取 + 清洗） |
| `law-to-markdown` | 中国法律文本规范化 → Markdown（Python） |
| `pdf-processing-pro` | PDF 高级处理：表单/OCR/表格（FORMS/OCR/TABLES 指南） |
| `paper-analysis-assistant` | 论文流水线：下载→提取→词频→播客→HTML/PPT |
| `ppt-master` | 源文档 → SVG 页面 → PPTX（多角色协作） |

**工具类**
| 技能 | 主要功能 |
|---|---|
| `vision-tools` | 本地视觉 CLI：glance（描述/OCR）/ ground（定位）/ detect / trace（SVG）/ crop + html_shot |
| 记忆技能（memory-*） | 由 base-tools 从共享记忆目录注册（第一准则、备份红线、读图默认 vision-tools、playwriter 规则、DSH 系列记录等） |

### 4.2 MCP 服务器清单（mcp-bridge.mjs）

| 服务器 | 工具前缀 | 主要功能 | 依赖/启动方式 |
|---|---|---|---|
| **playwriter** | `pw_execute` / `pw_reset` | **浏览器自动化**：操控用户 Chrome（导航/点击/截图/表单/DOM 提取），扩展模式为主、headless 按需 | `D:\Node\npm-global\node_modules\playwriter\bin.js`；Chrome for Testing 152.0.7977.42（`~/.playwriter/browsers/`，升级走 npmmirror 镜像） |
| **codegraph** | `cg_codegraph_context` / `explore` / `node` / `search` / `trace` | **代码图谱**：符号级上下文、调用链追踪、任务上下文检索 | 独立 node v0.9.7（`~/.playwriter/../reasonix/codegraph/`）；`--liftoff-only` + `CODEGRAPH_NO_DAEMON=1`；语法引擎预热 90–300s |
| **github** | `gh_*`（26 工具） | **GitHub API**：仓库/issue/PR/评审/代码搜索/文件读写分支 | token 运行时从 Reasonix `config.toml` 读取 |
| **exa** | `exa_web_search_exa` / `exa_web_fetch_exa` | **网页搜索与全文抓取**（干净 Markdown） | HTTP MCP：`https://mcp.exa.ai/mcp`；key 优先 `EXA_API_KEY` 环境变量，回退注册表 HKCU\Environment |

另：`bridge_status` 工具（mcp-bridge 自带）用于诊断四实例的 phase/工具数/错误尾巴；错误日志 `C:\Users\92905\reasonix-to-dsh\bridge-errors.json`。

**关键技术坑**（记忆固化）：MCP spawn env 是清洗过的必须显式补 TEMP/PATH 等；Windows 路径带空格不走 `cmd /c npx`；DSH 技能名必须小写 kebab-case；诊断用 `bridge_status`。

---

## 5. 参考来源与原创度评估

### 5.1 参考/移植了什么（诚实标注）

| 内容 | 来源 | 我们的做法 |
|---|---|---|
| VS Code 布局基础 | `anoslide/dsh-vscode-layout`（社区仓库，本地副本留存） | 布局框架来自该仓库；**host 文件系统接口套件（`/vscode-files/*` 约 19 端点：list/read/image/raw/doc/legacy/reveal/search/highlight/git/write/mkdir/mkfile/rename/delete/persona/skills/mcp）与左栏分屏、右键菜单、拖拽、文档转换链、管理界面均为自研** |
| 玻璃/半透明覆盖逻辑 | `zhu1090093659/dsh-web-ui` 的 **blue-fantasy 皮肤**（Apache-2.0；艺术指导 **powerdog996 / DreamSkin 社区**） | **token 重映射逻辑照搬并适配**（选择器改 `html[data-dsh-beauty]`、浅色遮罩修正为中性、面板透明度可调），壁纸换成 Agnes 自生成的鲸鱼娘 |
| 可停用/属性门控/边角模糊等机制 | `WYH66666666/DSH-Transparent-UI-Plugin`（Aqua） | 借鉴其 **`data-*` 属性门控 + 效果即插即拔** 的插件形态与部分 CSS 配方（hover 光环、圆角语言、边缘渐隐思路）；**未采用**其粒子鲸鱼/流体背景 |
| 锚定两阶段 | `xiaobright/dsh-anchored-standard`（861★） | 机制照搬 + 桥接叠加 |
| Flash 路由 persona | `yjh051108/dsh-router-standard`（routing-suite 三件套）；社区 WEAK_FLASH persona | 机制借鉴，`model-router.mjs` 自行实现（零依赖） |
| warmup-replay 省钱方案 | `Symbol1Rudolf`（社区实测） | 记录待用，未实现 |
| 视觉模型壁纸 | **Agnes AI 图像 API**（`agnes-image` 模型） | 按蓝幻画风 prompt 生成 1280×718 鲸鱼娘壁纸，base64 内嵌插件 |
| 社区论调/issue | DSH 社区 issue #11（we 触发率）、论坛帖 80893（英文提示词变体） | 引用结论，未照搬实现 |

### 5.2 完全原创的部分

1. **beauty 插件整体框架**：9 皮肤切换器（胶囊菜单 + localStorage 按皮肤独立存储）、色相旋转生成管线（build 脚本 + 运行时渐变旋转）、五区透明度纱罩体系（对话/工作/文件/阅读/面板）、设置页 slots 卡片、重置按钮——除"token 重映射"和"属性门控"两个手法外均自研；
2. **comfort 插件**：输入卡-统计融合、统计行悬停修复、工具卡流式自动收起——自研（融合用了官方 seam，手法参考 Aqua 的过渡原则）；
3. **宿主文件系统接口套件**（list/read/image/raw/doc/legacy/reveal/search/highlight/git/write/mkdir/mkfile/rename/delete 约 16 端点）、**文件读取体系**（文本/二进制识别、2MB 截断、类型分派到转换链）、**资源管理器定位**（reveal + explorer /select）、**全局人设**（persona 读写注入 systemPrompt）、**Skill/MCP 管理接口**（toggle/delete/add + 设置卡片）——自研；
4. **model-router.mjs / tool-bootstrap.mjs / mcp-bridge.mjs / skills-bridge.mjs / base-tools.mjs / dropzone.mjs**——全部自研（机制有参考）；
5. **预设选择语义补丁**（apply/load 两处）——自研，修复的是官方 bug；
6. **整套 A/B 测试方法论与数据**（we 25%、flash -46% 对照、16/16 过测）——原创实证。

**原创度总评**：约 **60% 自研 / 40% 借鉴移植**；借鉴部分集中在"视觉手法"（蓝幻 token 映射、Aqua 门控、锚定/路由机制），工程实现（构建管线、存储、事件、DOM seam 侦察、补丁）均为原创。所有第三方引用均已保留 LICENSE 与署名（Apache-2.0 合规）。

---

## 6. 维护与回滚

- **全量备份**：`~/.dsh/backup/backup-all.ps1` → `D:\HuaweiMoveData\Users\92905\Backups\dsh-full-<日期>\`（含 harness 全量 + node-pty conpty 修复 + 自研包 + 预设 + 数据；README-BACKUP.md 记录清单/恢复/更新流程）；
- **升级重打清单**（`npm update -g @deepseek-ai/dsh` 之后）：① 15 个官方包补丁覆盖；② agent-preset 两处补丁；③ junction 重建（beauty/comfort → `~/.dsh/plugins/`）；④ 自研包同步（`~/.dsh/vscode-layout-repo/plugins/` 与安装版哈希一致）；
- **结构事实**：`profiles\node_modules\@deepseek-ai` 下 197 个包全是 junction，真实文件在 `D:\Node\npm-global\node_modules\@deepseek-ai\dsh\node_modules\@deepseek-ai\`；
- **插件停用**：beauty/comfort 在设置→插件可卸；改 bundle 后必须 **Ctrl+Shift+R 强刷**（普通刷新会命中浏览器缓存旧包，曾造成"改了没生效"的假象）。

---

## 7. 路径速查表

| 内容 | 路径 |
|---|---|
| 美化层源码 | `C:\Users\92905\.dsh\plugins\dsh-beauty-ui\`（client.skeleton.js 模板 + build.js 组装） |
| 舒适层源码 | `C:\Users\92905\.dsh\plugins\dsh-comfort-ui\` |
| VS Code 布局插件 | `C:\Users\92905\.dsh\vscode-layout-repo\dsh-vscode-layout-master\`；安装版 `profiles\node_modules\@anoslide\` |
| 预设 | `C:\Users\92905\.dsh\.agent-presets\{reasonix,reasonix-anchored,reasonix-flash}\` |
| 技能单一来源 | `C:\Users\92905\.reasonix\skills\` |
| 文档转换脚本 | `C:\Users\92905\.dsh\vscode-doc-convert.py` / `vscode-wps-convert.ps1` |
| 拖拽注入 | `C:\Users\92905\.dsh\rx-drop-widget.js` |
| 测试工具 | `C:\Users\92905\.dsh\flash-test\`（metrics/extract/probe/usage） |
| 官方包备份 | `C:\Users\92905\.dsh\backup\official-pkgs-20260815\` |
| 全量备份 | `D:\HuaweiMoveData\Users\92905\Backups\dsh-full-<日期>\` |
| 启动 | `C:\Users\92905\.dsh\dsh-start.bat` |
