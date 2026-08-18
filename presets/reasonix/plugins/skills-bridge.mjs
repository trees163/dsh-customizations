/**
 * reasonix-skills-bridge — 把 ~/.reasonix/skills 下全部 Reasonix
 * 技能注册为本预设层的 DSH 技能（含资源目录基准，SKILL.md 里的相对路径原样可用）。
 * 只消费宿主 `skills` 服务，不发布任何服务。
 */
import { readFile, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

// 技能根目录：环境变量优先，未设置时回退 ~/.reasonix/skills
const SKILLS_ROOT = process.env.DSH_SKILLS_ROOT || join(homedir(), '.reasonix', 'skills')

// 4 个没有 SKILL.md 的工具型目录：合成最小技能说明，保证不丢失
const SYNTHETIC = {
  'baoyu-url-to-markdown': {
    description: '把网页 URL 转换为 Markdown：CDP 抓取动态页面 + HTML→MD 清洗（脚本目录 scripts/，入口 main.ts）。',
    content: '# baoyu-url-to-markdown\n\n把网页 URL 转成干净的 Markdown 文件。\n\n- 脚本目录: `scripts/`（TypeScript；main.ts 是入口，cdp.ts 负责 CDP 抓取，html-to-markdown.ts 负责转换）\n- 用法: 先用 read 工具读 `scripts/main.ts` 确认入口与参数，再用 pwsh/node 运行；输出格式参考本目录 `test_output.md`。',
  },
  'law-to-markdown': {
    description: '中国法律文本转 Markdown：规范化 + 结构校验（Python 脚本）。',
    content: '# law-to-markdown\n\n中国法律法规文本 → Markdown。\n\n- 脚本目录: `scripts/`（law_to_markdown.py 主转换，cn_law_normalizer.py 规范化，stage3_checker.py 质量校验）\n- 用法: 用 pwsh 调 `python scripts/law_to_markdown.py`，先读脚本确认参数。',
  },
  'pdf-processing-pro': {
    description: 'PDF 高级处理：表单分析、OCR、表格提取（指南 FORMS.md/OCR.md/TABLES.md + Python 脚本）。',
    content: '# pdf-processing-pro\n\nPDF 专业处理（表单 / OCR / 表格）。\n\n- 指南: 本目录 `FORMS.md`（表单）、`OCR.md`（OCR）、`TABLES.md`（表格）\n- 脚本: `scripts/analyze_form.py` 等，用 `python` 运行\n- 用法: 先 read 对应指南确定任务类型，再按指南执行脚本。',
  },
  'paper-analysis-assistant': {
    description: '论文分析流水线：下载 PDF、提取文本/参考文献、词频分析、播客对话、语音合成、HTML/PPT 生成（Python）。',
    content: '# paper-analysis-assistant\n\n论文分析工具链（scripts/ 下均为 Python，用 `python` 运行）：\n\n- download_pdf.py 下载论文 PDF\n- extract_text.py 提取正文\n- extract_references.py 提取参考文献\n- analyze_word_frequency.py 词频分析（references/stopwords.txt 停用词表）\n- dialogue_to_podcast.py 生成播客对话稿\n- text_to_speech.py 语音合成\n- generate_html.py / generate_ppt.py 生成 HTML/PPT\n\n用法: 先 read 对应脚本确认参数与依赖，再逐步执行。',
  },
}

function parseFrontmatter(text) {
  const m = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/.exec(text)
  if (!m) return null
  const fm = m[1]
  const body = m[2].trim()
  const nameM = /^name:\s*['"]?([a-zA-Z0-9-]+)['"]?\s*$/m.exec(fm)
  const descM = /^description:\s*(.*)$/m.exec(fm)
  let description = ''
  if (descM) {
    description = descM[1].trim()
    const start = fm.indexOf(descM[0]) + descM[0].length
    const rest = fm.slice(start)
    const cont = rest.split(/\r?\n/).filter((l) => /^\s{2,}\S/.test(l)).map((l) => l.trim()).join(' ')
    if (cont) description += ' ' + cont
  }
  return { name: nameM ? nameM[1] : null, description, body }
}

export const name = 'reasonix-skills-bridge'

export const inject = ['skills']

export function apply(ctx) {
  const skills = ctx.skills
  const provider = {
    name: 'reasonix-skills',
    async list() {
      const out = []
      try {
        const entries = await readdir(SKILLS_ROOT, { withFileTypes: true })
        for (const entry of entries) {
          if (!entry.isDirectory()) continue
          const dir = join(SKILLS_ROOT, entry.name)
          const synth = SYNTHETIC[entry.name]
          if (synth) {
            out.push({
              name: entry.name,
              description: synth.description,
              source: 'custom',
              rank: 700,
              locator: { kind: 'synth', dir },
              invocation: { modelInvocable: true, userInvocable: true },
              provider: 'reasonix-skills',
            })
            continue
          }
          const skillPath = join(dir, 'SKILL.md')
          let text
          try { text = await readFile(skillPath, 'utf8') } catch { continue }
          const parsed = parseFrontmatter(text)
          if (!parsed || !parsed.name) continue
          out.push({
            name: parsed.name,
            description: parsed.description || '',
            source: 'custom',
            rank: 700,
            locator: { kind: 'file', path: skillPath },
            path: skillPath,
            invocation: { modelInvocable: true, userInvocable: true },
            provider: 'reasonix-skills',
          })
        }
      } catch {
        // 技能目录不存在时静默降级
      }
      return out
    },
    async get(candidate) {
      const loc = candidate.locator || {}
      if (loc.kind === 'synth') {
        const base = (loc.dir || '').split(/[\\/]/).pop()
        const synth = SYNTHETIC[base]
        if (!synth) return undefined
        return {
          name: candidate.name,
          description: candidate.description,
          source: 'custom',
          provider: 'reasonix-skills',
          resourceBase: { kind: 'directory', path: loc.dir },
          invocation: { modelInvocable: true, userInvocable: true },
          content: synth.content,
        }
      }
      if (loc.kind !== 'file' || !loc.path) return undefined
      let text
      try { text = await readFile(loc.path, 'utf8') } catch { return undefined }
      const parsed = parseFrontmatter(text)
      if (!parsed) return undefined
      const dir = loc.path.slice(0, loc.path.lastIndexOf('\\'))
      return {
        name: candidate.name,
        description: candidate.description,
        source: 'custom',
        provider: 'reasonix-skills',
        resourceBase: { kind: 'directory', path: dir },
        invocation: { modelInvocable: true, userInvocable: true },
        content: parsed.body,
      }
    },
  }
  return skills.registerProvider(() => provider)
}
