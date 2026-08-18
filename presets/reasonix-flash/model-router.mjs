/**
 * reasonix-model-router — 模型感知路由（Flash 闪光模式专用插件）。
 *
 * 会话模型为 flash 系时，把 system prompt 的 sections 替换为社区实测的
 * WEAK_FLASH persona（neutral + classify + recall/anti-runaway 锚），工具
 * 目录全量直出——flash 没有 pro 的首轮工具 schema 过拟合（阈值式模型），
 * 不需要两阶段引导。pro 等其它模型：完全不干预，走预设自身的 persona。
 *
 * 机制借鉴 yjh051108/dsh-router-standard（router-core.mjs / router-bootstrap.mjs）：
 *  - modelId 读 agent.options?.model，isFlash = /flash/i
 *  - sections 只保留 plan section + router-persona（plan 边界不失忆）
 *  - contexts 默认保留（策略快照对模型有预知价值；社区选择清空，可用
 *    config.keepContexts=false 切换）
 *  - {{cwd}} 模板在渲染阶段解析（与标准 persona 同机制），补齐社区原样
 *    缺少的工作目录认知
 *
 * 零外部依赖，只消费宿主 systemPrompt 服务，不发布任何服务。
 */

export const name = 'reasonix-model-router'

export const inject = ['systemPrompt']

const WEAK_FLASH = [
  'You are a helpful assistant.',
  'Before acting, decide the task type (build or fix) and adopt the matching style: build → hands-on production; fix → inspect-and-plan.',
  'Before acting, briefly review what you have already done in this session and continue from where you left off; do not repeat completed steps. Do not run environment checks (echo, whoami, uname, node --version, date) or exhaustive grep/glob scans.',
  'Think deeply first, then produce.',
  'Your working directory is {{cwd}}.',
].join('\n')

function isFlashModel(modelId) {
  return typeof modelId === 'string' && /flash/i.test(modelId)
}

export function apply(ctx, config = {}) {
  const keepContexts = config.keepContexts !== false

  ctx.on('system-prompt/assemble', async (_assembly, context, next) => {
    const assembled = await next()
    const agent = context.agent
    if (agent === undefined) return assembled
    const modelId = agent.options?.model
    if (!isFlashModel(modelId)) return assembled

    const planSection = (assembled.sections || []).find((s) => /plan/i.test(s.name))
    const sections = planSection
      ? [planSection, { name: 'router-persona', text: WEAK_FLASH, order: 0 }]
      : [{ name: 'router-persona', text: WEAK_FLASH, order: 0 }]

    return {
      ...assembled,
      sections,
      ...(keepContexts ? {} : { contexts: [] }),
    }
  })
}
