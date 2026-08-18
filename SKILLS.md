# 技能清单（71 个）

> 本仓库**不含技能本体**（方案 A：只发布桥接机制）。技能单一来源是 Reasonix 的
> `~/.reasonix/skills/`（或本仓库预设里 `skills-bridge.mjs` 指向的 `DSH_SKILLS_ROOT`），
> 由 `presets/*/plugins/skills-bridge.mjs` 注册进 DSH 的 `skill` 工具。
>
> **许可说明**：绝大多数技能本体没有附带 LICENSE 文件，来源标注基于内容特征与社区
> 生态推断，不能保证准确。安装使用前请自行确认其来源与许可。
>
> **API 说明**：只有少数技能需要外部 API key（见文末汇总表），其余为纯提示词/
> 本地脚本技能，零 key。

## 生成 / 创意类

| 技能 | 功能 | 来源 | API |
|---|---|---|---|
| `agnes-ai-generation` | Agnes AI 文本/图像/视频生成（图生图、视频轮询） | Agnes 官方 API 文档整理 | `AGNES_API_KEY`（或 `AGNES_API_TOKEN`/`APIHUB_AGNES_API_KEY`） |
| `brandkit` | 品牌图板生成（logo/配色/字型参考图） | 社区开源（dsh-web-ui 生态） | 无 |
| `imagegen-frontend-mobile` | 移动端界面参考图生成 | 社区开源（dsh-web-ui 生态） | 无 |
| `imagegen-frontend-web` | 网页界面参考图生成 | 社区开源（dsh-web-ui 生态） | 无 |
| `image-to-code-skill` | 参考图 → 前端代码流水线 | 社区开源（dsh-web-ui 生态） | 无 |
| `gpt-tasteskill` | Awwwards 级动效视觉变体（GSAP/bento） | 社区开源（dsh-web-ui 生态） | 无 |
| `lyriccraft` | 歌词创作（Suno 格式化） | Suno 社区生态 | 无（配 Suno 网页免费额度） |
| `music-generation` | 多 API 音乐生成（Lyria 器乐/Suno 歌曲/Udio） | Suno/Udio/Google 社区脚本 | `GOOGLE_API_KEY`、`SUNO_API_KEY`、`UDIO_API_KEY`（按需） |
| `songforge` | 歌曲全流程（创意→歌词→Suno 打包） | Suno 社区生态 | 无 |
| `sunomaster` | 歌词 → 优化 Suno prompt（metatags/风格） | Suno 社区生态 | 无 |
| `ip-drama-video-sop` | IP 小说改编短剧全流程（拆书→剧本→分镜→AI 视频） | 社区 SOP 整理 | 无（走网页产品 Hailuo/Suno/Udio） |

## 设计 / UI 类

| 技能 | 功能 | 来源 | API |
|---|---|---|---|
| `taste-skill` | 反 AI 味落地页/作品集默认风格（v2） | 社区开源（dsh-web-ui 生态） | 无 |
| `taste-skill-v1` | 原 v1 版，向后兼容 | 社区开源（dsh-web-ui 生态） | 无 |
| `minimalist-skill` | 极简 Notion/Linear 风格变体 | 社区开源 | 无 |
| `soft-skill` | 高端奢华风格变体 | 社区开源 | 无 |
| `brutalist-skill` | 工业粗野风格变体 | 社区开源 | 无 |
| `redesign-skill` | 全面视觉重设计 | 社区开源 | 无 |
| `baseline-ui` | 战术性 UI 打磨（快速） | 社区开源 | 无 |
| `improve-ui` | 系统性 UI 审计 + 实施计划 | 社区开源 | 无 |
| `create-design-md` | 从现有产品提取设计语言写 DESIGN.md | 社区开源 | 无 |
| `stitch-skill` | Google Stitch 集成（DESIGN.md 导出） | 社区开源 | 无 |

## 工程方法类

| 技能 | 功能 | 来源 | API |
|---|---|---|---|
| `tdd` | 测试驱动开发 | Superpowers 社区生态 | 无 |
| `test-driven-development` | 强约束 TDD（先看红、删码重写） | Superpowers 社区生态 | 无 |
| `implement` | 单任务实现（TDD 驱动） | Superpowers 社区生态 | 无 |
| `wayfinder` | 大型多会话任务规划 | Superpowers 社区生态 | 无 |
| `writing-plans` | 写实施计划 | Superpowers 社区生态 | 无 |
| `executing-plans` | 跨会话按检查点执行计划 | Superpowers 社区生态 | 无 |
| `subagent-driven-development` | 计划任务并行分发子代理 | Superpowers 社区生态 | 无 |
| `using-git-worktrees` | git worktree 隔离 | Superpowers 社区生态 | 无 |
| `resolving-merge-conflicts` | 冲突解决 | Superpowers 社区生态 | 无 |
| `finishing-a-development-branch` | 分支收尾决策 | Superpowers 社区生态 | 无 |
| `requesting-code-review` | 请求评审 | Superpowers 社区生态 | 无 |
| `receiving-code-review` | 响应评审反馈 | Superpowers 社区生态 | 无 |
| `code-review` | 双轴评审（标准+规格并行子代理） | Superpowers 社区生态 | 无 |
| `diagnosing-bugs` | 硬 bug 诊断循环 | Superpowers 社区生态 | 无 |
| `systematic-debugging` | 结构化根因分析 | Superpowers 社区生态 | 无 |
| `fixing-accessibility` | 可访问性修复 | Superpowers 社区生态 | 无 |
| `fixing-metadata` | SEO 元数据修复 | Superpowers 社区生态 | 无 |
| `fixing-motion-performance` | 动效性能修复 | Superpowers 社区生态 | 无 |
| `verification-before-completion` | 完成前强制验证 | Superpowers 社区生态 | 无 |
| `output-skill` | 输出完整性约束 | Superpowers 社区生态 | 无 |
| `karpathy-guidelines` | 减少 LLM 编码错误纪律清单 | Karpathy 社区整理 | 无 |
| `codebase-design` | 模块接口设计词汇 | Superpowers 社区生态 | 无 |
| `improve-codebase-architecture` | 架构深扫 + HTML 报告 | Superpowers 社区生态 | 无 |
| `domain-modeling` | 领域语言/词汇表/ADR | Superpowers 社区生态 | 无 |
| `dispatching-parallel-agents` | 2+ 独立任务并行分发 | Superpowers 社区生态 | 无 |
| `using-superpowers` | Superpowers 系统入口 | obra 的 superpowers（原为 Claude Code 编写） | 无 |
| `superpowers-implementer` | 实现子代理（内部） | obra 的 superpowers | 无 |
| `superpowers-spec-reviewer` | 规格评审子代理（内部） | obra 的 superpowers | 无 |
| `superpowers-code-quality-reviewer` | 质量评审子代理（内部） | obra 的 superpowers | 无 |
| `teach` | 多会话教学 | Superpowers 社区生态 | 无 |
| `handoff` | 会话交接文档 | Superpowers 社区生态 | 无 |

## 需求 / 文档类

| 技能 | 功能 | 来源 | API |
|---|---|---|---|
| `brainstorming` | 需求探索 | Superpowers 社区生态 | 无 |
| `grill-me` | 拷问式打磨（不产文档） | Superpowers 社区生态 | 无 |
| `grill-with-docs` | 拷问式打磨（产 ADR/词汇表） | Superpowers 社区生态 | 无 |
| `grilling` | 拷问原语（内部） | Superpowers 社区生态 | 无 |
| `to-spec` | 会话转规格并发布 issue | Superpowers 社区生态 | 无 |
| `to-tickets` | 规格拆工单 | Superpowers 社区生态 | 无 |
| `triage` | issue 三流分诊 | Superpowers 社区生态 | 无 |
| `writing-great-skills` | 技能写作规范 | Superpowers 社区生态 | 无 |
| `writing-skills` | 新技能编写 | Superpowers 社区生态 | 无 |
| `install-skill` | 从 GitHub 安装技能（带安全审查） | Superpowers 社区生态 | 无 |
| `prototype` | 一次性原型验证 | Superpowers 社区生态 | 无 |
| `ask-matt` | 技能路由 | Matt Pocock 工程技能套件 | 无 |
| `setup-matt-pocock-skills` | 工程技能套件初始化 | Matt Pocock 工程技能套件 | 无 |

## 数据处理类

| 技能 | 功能 | 来源 | API |
|---|---|---|---|
| `baoyu-url-to-markdown` | 网页 URL → Markdown（CDP 抓取+清洗） | 社区开源（宝玉系列工具） | 无 |
| `law-to-markdown` | 中国法律文本规范化 → Markdown | 社区开源 | 无 |
| `pdf-processing-pro` | PDF 表单/OCR/表格处理 | 社区开源 | 无（本地 tesseract） |
| `paper-analysis-assistant` | 论文流水线（下载→提取→词频→播客→HTML/PPT） | 社区开源 | 无（本地 pyttsx3） |
| `ppt-master` | 源文档 → SVG 页面 → PPTX | 社区开源 | 可选（见文末 API 表） |

## 工具类

| 技能 | 功能 | 来源 | API |
|---|---|---|---|
| `vision-tools` | 本地视觉 CLI：glance/ground/detect/trace/crop + 脚本 | [Anionex/agent-vision-toolkit](https://github.com/Anionex/agent-vision-toolkit)（MIT） | `VISION_API_KEY` + `VISION_BASE_URL` + `VISION_MODEL` |
| `memory-*`（动态） | 共享记忆规则（由 base-tools.mjs 从记忆目录注册） | 本仓库自研 | 无 |

---

## 技能所需 API 汇总

### 核心在用（日常）

| 变量 | 用途 | 配置位置 | 获取 |
|---|---|---|---|
| `VISION_API_KEY` + `VISION_BASE_URL` + `VISION_MODEL` | vision-tools 读图/OCR（当前配置：小米 MiMo，`https://api.xiaomimimo.com/v1`，`mimo-v2.5`） | `%LOCALAPPDATA%\agent-vision-toolkit\env` 或环境变量 | OpenAI 兼容接口，任意一家都行（DashScope/qwen-vl 等） |
| `AGNES_API_KEY`（或 `AGNES_API_TOKEN` / `APIHUB_AGNES_API_KEY`） | Agnes 文生图/视频（本仓库壁纸即用它生成） | 环境变量 | apihub.agnes-ai.com |

### 可选增强（不配 key 走默认路径）

| 变量 | 技能 | 说明 |
|---|---|---|
| `GOOGLE_API_KEY` / `SUNO_API_KEY` / `UDIO_API_KEY` | music-generation | Lyria 器乐 / Suno 歌曲 / Udio；不配则提示不可用 |
| `OPENAI_API_KEY` / `GEMINI_API_KEY` / `QWEN_API_KEY` / `ZHIPU_API_KEY` / `VOLCENGINE_API_KEY` / `MINIMAX_API_KEY` / `SILICONFLOW_API_KEY` 等（`{PROVIDER}_API_KEY` + `{PROVIDER}_MODEL` + `{PROVIDER}_BASE_URL`） | ppt-master 生图 | 任选一家后端（`IMAGE_BACKEND` 切换） |
| `ELEVENLABS_API_KEY` / `MINIMAX_API_KEY` / `QWEN_API_KEY` / `DASHSCOPE_API_KEY` / `COSYVOICE_API_KEY` | ppt-master 旁白 TTS | 默认 edge-tts 免 key；要高质量/复刻音色才配 |
| `PEXELS_API_KEY` / `PIXABAY_API_KEY` | ppt-master 配图搜索 | 默认 openverse/wikimedia 免 key；可选项 |

### 零 key

其余全部技能（设计/工程方法/需求/文档/数据处理类）均为提示词或本地脚本，不需要任何 API key。
