/**
 * reasonix-base-tools — 原生工具：time_now / context7 / memory_save /
 * memory_search / vision_glance，并把 Reasonix 全局记忆规则注册为本预设技能。
 * 零依赖（不 import 任何 dsh 包，工具定义手写为注册表接受的 JSON Schema 形状）。
 * 只消费宿主服务（web/fs/subprocess/skills/tools），不发布任何服务。
 */
import { spawn } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

// 可配置路径：环境变量优先，未设置时回退到用户主目录下的常见位置。
// 本机如需覆盖（例如 Python 装在非 PATH 目录），设置对应环境变量即可。
const MEM_DIR = process.env.DSH_MEMORY_DIR || join(homedir(), 'AppData', 'Roaming', 'reasonix', 'memory', 'global')
const GLANCE = process.env.DSH_GLANCE || join(homedir(), '.reasonix', 'skills', 'vision-tools', 'tools', 'glance')
const PYTHON = process.env.DSH_PYTHON || 'python'

function memoryParse(text) {
  const m = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/.exec(text)
  if (!m) return null
  const fm = m[1]
  const get = (key) => { const r = new RegExp('^' + key + ':\\s*(.*)$', 'm').exec(fm); return r ? r[1].trim() : '' }
  return { name: get('name') || get('title'), title: get('title'), description: get('description'), body: m[2].trim() }
}

function kebab(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
}

function textBlock(text) {
  return [{ type: 'text', text }]
}

// 手写 defineTool 等价物：DSL → JSON Schema，输出 schema 用 {}（接受任意 JSON 对象）
function makeTool({ name, description, params, render, execute, timeoutMs }) {
  const properties = {}
  const required = []
  for (const [key, spec] of Object.entries(params)) {
    if (spec.type === 'json') {
      properties[key] = spec.description !== undefined ? { description: spec.description } : {}
    } else {
      const t = spec.type === 'integer' ? 'integer' : spec.type === 'number' ? 'number' : spec.type === 'boolean' ? 'boolean' : 'string'
      properties[key] = {
        type: t,
        ...(spec.description !== undefined ? { description: spec.description } : {}),
        ...(spec.default !== undefined ? { default: spec.default } : {}),
      }
    }
    if (spec.required) required.push(key)
  }
  const parameters = { type: 'object', properties }
  if (required.length) parameters.required = required
  return {
    name,
    description,
    parameters,
    output: { schema: {}, render },
    ...(timeoutMs ? { timeoutMs } : {}),
    execute,
  }
}

export const name = 'reasonix-base-tools'

export const inject = ['web', 'fs', 'subprocess', 'skills', 'tools', 'timer']

export function apply(ctx) {
  const web = ctx.web
  const fs = ctx.fs
  const skills = ctx.skills

  ctx.tools.register(makeTool({
    name: 'time_now',
    description: '获取当前日期时间（可指定 IANA 时区），返回 ISO 字符串、Unix 时间戳（毫秒/秒）、时区与星期。',
    params: {
      tz: { type: 'string', description: '可选 IANA 时区名，如 Asia/Shanghai、America/New_York；缺省为本地时区' },
    },
    render(_args, value) {
      return textBlock('now=' + value.iso + '\nepochMs=' + value.epochMs + '\nepochS=' + value.epochS + '\ntimezone=' + value.timezone + '\nweekday=' + value.weekday)
    },
    async execute(args) {
      const now = new Date()
      const tz = args && args.tz ? args.tz : undefined
      let iso
      const timezone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz) {
        try {
          iso = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now)
        } catch {
          throw new Error('无效时区: ' + tz)
        }
      } else {
        iso = now.toISOString()
      }
      const weekday = tz ? new Intl.DateTimeFormat('zh-CN', { timeZone: tz, weekday: 'long' }).format(now) : new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(now)
      return { iso, epochMs: now.getTime(), epochS: Math.floor(now.getTime() / 1000), timezone, weekday }
    },
  }))

  ctx.tools.register(makeTool({
    name: 'context7',
    description: '查询 Context7 官方库文档（实时、带版本）。query 为要查的内容；可选 libraryId 精确到某库（如 /websites/react），topic 过滤主题。',
    params: {
      query: { type: 'string', description: '要查询的内容，如 "how to create a react component"', required: true },
      libraryId: { type: 'string', description: '可选，库 ID（如 /websites/react、/websites/python）。不带则全局搜索' },
      topic: { type: 'string', description: '可选，主题过滤' },
      tokens: { type: 'integer', description: '返回的最大 token 数，默认 4000', default: 4000 },
    },
    render(_args, value) { return textBlock(value.text) },
    async execute(args) {
      const q = encodeURIComponent(args.query)
      let url = 'https://context7.com/api/v1/search?query=' + q + '&type=all&tokens=' + (args.tokens || 4000)
      if (args.libraryId) url += '&libraryId=' + encodeURIComponent(args.libraryId)
      if (args.topic) url += '&topic=' + encodeURIComponent(args.topic)
      const res = await web.fetch({ url })
      if (res.statusCode !== 200) throw new Error('context7 HTTP ' + res.statusCode)
      const body = res.body && res.body.content ? res.body.content : ''
      let parsed
      try { parsed = JSON.parse(body) } catch { throw new Error('context7 响应不是 JSON: ' + body.slice(0, 300)) }
      const results = (parsed && parsed.results) || []
      const lines = []
      for (const r of results) {
        lines.push('## ' + (r.libraryName || r.libraryId || '') + (r.version ? ' (' + r.version + ')' : ''))
        const snips = r.snippets || []
        for (const s of snips.slice(0, 10)) {
          if (s && s.text) lines.push('- ' + String(s.text).replace(/\s+/g, ' ').slice(0, 600))
        }
      }
      return { text: lines.join('\n') || '(无结果)' }
    },
  }))

  async function readMemText(path) {
    const t = await fs.resolve(path)
    return await fs.readText(t)
  }

  async function listMemoryFiles() {
    const root = await fs.resolve(MEM_DIR)
    const entries = await fs.listDir(root)
    return entries.filter((e) => e.type === 'file' && e.name.toLowerCase().endsWith('.md')).map((e) => e.name)
  }

  function slugify(title) {
    const s = String(title || '').trim().replace(/[\\/:*?"<>|\s]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    return (s || 'note') + '.md'
  }

  ctx.tools.register(makeTool({
    name: 'memory_save',
    description: '把一条重要信息/规则/偏好写入共享记忆（与 Reasonix 共用 ' + MEM_DIR + ' 目录），并把索引追加进 MEMORY.md。只追加、绝不删除。',
    params: {
      title: { type: 'string', description: '记忆标题，如 "用户偏好：输出用中文"', required: true },
      content: { type: 'string', description: '记忆正文（Markdown）', required: true },
    },
    render(_args, value) { return textBlock('已保存: ' + value.file) },
    async execute(args) {
      const file = slugify(args.title)
      const filePath = join(MEM_DIR, file)
      const t = await fs.resolve(filePath)
      await fs.writeText(t, '# ' + args.title + '\n\n' + args.content + '\n')
      const indexPath = join(MEM_DIR, 'MEMORY.md')
      const indexT = await fs.resolve(indexPath)
      let index = ''
      try { index = await fs.readText(indexT) } catch { index = '' }
      const line = '- [' + args.title + '](' + file + ') — ' + String(args.content).replace(/\s+/g, ' ').slice(0, 60)
      if (index.indexOf(file) < 0) {
        index = index.replace(/\s*$/, '') + (index ? '\n' : '') + line + '\n'
        await fs.writeText(indexT, index)
      }
      return { file: filePath, indexed: true }
    },
  }))

  ctx.tools.register(makeTool({
    name: 'memory_search',
    description: '在共享记忆目录（与 Reasonix 共用 ' + MEM_DIR + '）中按关键词搜索记忆文件，返回命中片段。',
    params: {
      query: { type: 'string', description: '搜索关键词', required: true },
    },
    render(_args, value) {
      if (!value.hits || !value.hits.length) return textBlock('(记忆中没有匹配项)')
      const lines = []
      for (const h of value.hits) lines.push('### ' + h.file + '\n' + h.snippet)
      return textBlock(lines.join('\n\n'))
    },
    async execute(args) {
      const q = String(args.query).toLowerCase()
      const files = await listMemoryFiles()
      const hits = []
      for (const name of files) {
        let text = ''
        try { text = await readMemText(join(MEM_DIR, name)) } catch { continue }
        const idx = text.toLowerCase().indexOf(q)
        if (idx < 0) continue
        const snippet = text.slice(Math.max(0, idx - 120), idx + 400)
        hits.push({ file: name, snippet })
        if (hits.length >= 15) break
      }
      return { hits }
    },
  }))

  async function runProcess(argv, timeoutMs) {
    return await new Promise((resolve, reject) => {
      const child = spawn(argv[0], argv.slice(1), {
        cwd: homedir(),
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
        windowsHide: true,
      })
      let out = ''
      let err = ''
      let settled = false
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true
          child.kill()
          reject(new Error('vision_glance 超时（' + Math.round(timeoutMs / 1000) + 's）。图片可能太大，请先压缩到长边 1024 再试。stderr: ' + err.slice(0, 500)))
        }
      }, timeoutMs)
      child.stdout.on('data', (c) => { out += c.toString('utf8') })
      child.stderr.on('data', (c) => { err += c.toString('utf8') })
      child.on('error', (e) => {
        if (!settled) { settled = true; clearTimeout(timer); reject(e) }
      })
      child.on('close', (code) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (code !== 0) reject(new Error('vision_glance 失败 exit=' + code + '\n' + err.slice(0, 1000)))
        else resolve(out.trim() || '(空输出)')
      })
    })
  }

  ctx.tools.register(makeTool({
    name: 'vision_glance',
    description: '用你的 vision-tools（Anionex glance，MiMo 视觉模型，配置已就绪）读图/OCR/回答图片问题。大图（>2MB）建议先用 PIL 压缩到长边 1024。',
    params: {
      image_path: { type: 'string', description: '图片绝对路径（Windows 形式，如 C:\\Users\\<用户名>\\a.png）', required: true },
      question: { type: 'string', description: '关于图片的问题，如 "这张图里有什么"', required: true },
    },
    render(_args, value) { return textBlock(value.text) },
    timeoutMs: 300000,
    async execute(args) {
      const info = await stat(args.image_path).catch(() => null)
      if (!info || !info.isFile()) throw new Error('图片不存在: ' + args.image_path)
      const text = await runProcess([PYTHON, GLANCE, args.image_path, '-q', args.question], 290000)
      return { text }
    },
  }))

  // 记忆规则 → 技能
  void (async () => {
    try {
      const root = await fs.resolve(MEM_DIR)
      const entries = await fs.listDir(root)
      for (const e of entries) {
        try {
          if (e.type !== 'file' || !e.name.toLowerCase().endsWith('.md')) continue
          if (e.name.toLowerCase().indexOf('archive') >= 0) continue
          let text = ''
          try { text = await fs.readText(e.target) } catch { continue }
          const parsed = memoryParse(text)
          const base = e.name.replace(/\.md$/i, '')
          const fromFm = parsed && parsed.name ? kebab(parsed.name) : ''
          const skillName = 'memory-' + (fromFm || kebab(base === 'MEMORY' ? 'index' : base))
          const desc = (parsed && (parsed.description || parsed.title)) || ('共享记忆: ' + e.name)
          skills.register({
            name: skillName,
            description: '[用户记忆] ' + String(desc).slice(0, 120),
            source: 'custom',
            resourceBase: { kind: 'directory', path: MEM_DIR },
            content: (parsed && parsed.body) || text,
          })
        } catch {
          // 单个文件失败不影响其余
        }
      }
    } catch {
      // 记忆目录不存在时静默
    }
  })()
}
