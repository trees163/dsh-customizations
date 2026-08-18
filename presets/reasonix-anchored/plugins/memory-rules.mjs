/**
 * reasonix-memory-rules — 把 Reasonix 全局记忆规则注入系统提示（每轮自动可见）。
 * 技能目录是"按需加载"，这里是"永远在上下文里"，互为双保险。
 * 只消费宿主 systemPrompt 服务，不发布任何服务。
 * 注意：按用户意见已停用（未挂载到 agent.cordis.yml），文件保留。
 * 另注：在 reasonix-anchored 中即便挂载，persona complete:true 也会丢弃
 * systemPrompt section —— 记忆规则改由技能目录（第二轮起）与 memory-* 技能承担。
 */
import { readdir, readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

const MEM_DIR = process.env.DSH_MEMORY_DIR || join(homedir(), "AppData", "Roaming", "reasonix", "memory", "global")

export const name = "reasonix-memory-rules"

export const inject = ["systemPrompt"]

export function apply(ctx) {
  const disposers = []
  ctx.effect(() => () => { for (const d of disposers) d() })

  void (async () => {
    try {
      const entries = await readdir(MEM_DIR)
      for (const f of entries) {
        try {
          if (!f.toLowerCase().endsWith(".md")) continue
          if (f.toLowerCase().includes("archive")) continue
          if (f.toLowerCase() === "memory.md") continue
          const text = await readFile(join(MEM_DIR, f), "utf8")
          const body = text.replace(/^---[\s\S]*?---\s*/, "").trim()
          if (body.length === 0) continue
          const name = "memory:" + f.replace(/\.md$/i, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-")
          disposers.push(ctx.systemPrompt.section({
            name,
            order: -95,
            text: () => "【用户记忆规则（必须遵守）】\n" + body,
          }))
        } catch {
          // 单个文件失败不影响其余
        }
      }
    } catch {
      // 记忆目录不存在时静默
    }
  })()
}
