/**
 * reasonix-mcp-bridge — 通用 MCP 桥（原生版，零 dsh 依赖）：
 *  - playwriter（pw_*，浏览器操控，扩展模式；就绪后自动建 headless 会话）
 *  - codegraph（cg_*，代码图谱，直连 --liftoff-only + CODEGRAPH_NO_DAEMON=1）
 *  - github（gh_*，token 运行时从 Reasonix config.toml 读取）
 *  - exa（exa_*，HTTP MCP，key 优先 process.env.EXA_API_KEY，回退注册表）
 * 只消费宿主服务（subprocess/fs/tools/timer），不发布任何服务。
 */
import { spawn, execFile } from 'node:child_process'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

// 可配置路径：环境变量优先，未设置时回退到用户主目录下的常见位置。
// 本机路径特殊（如 npm 全局根不在默认位置）时设置对应环境变量即可。
const CG_DIR = process.env.DSH_CG_DIR || join(homedir(), 'Desktop', '工作区')
const NODE = process.env.DSH_NODE || 'node'
const PLAYWRITER_BIN = process.env.DSH_PLAYWRITER_BIN || join(homedir(), 'AppData', 'Roaming', 'npm', 'node_modules', 'playwriter', 'bin.js')
const CODEGRAPH_NODE = process.env.DSH_CODEGRAPH_NODE || 'node'
const CODEGRAPH_JS = process.env.DSH_CODEGRAPH_JS || join(homedir(), 'AppData', 'Roaming', 'npm', 'node_modules', 'codegraph', 'lib', 'dist', 'bin', 'codegraph.js')
const ERR_FILE = process.env.DSH_ERR_FILE || join(homedir(), 'reasonix-to-dsh', 'bridge-errors.json')
const REASONIX_CONFIG = process.env.DSH_REASONIX_CONFIG || join(homedir(), 'AppData', 'Roaming', 'reasonix', 'config.toml')
const NPM_NPX_ROOT = process.env.DSH_NPX_ROOT || join(homedir(), 'AppData', 'Local', 'npm-cache', '_npx')
const EXA_ENDPOINT = 'https://mcp.exa.ai/mcp'

function textBlock(text) {
  return [{ type: 'text', text }]
}

// 手写 defineTool 等价物：MCP inputSchema → JSON Schema 参数，输出 schema {}（接受任意 JSON）
function makeMcpTool({ name, description, remote, params, render, execute, timeoutMs }) {
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
    timeoutMs,
    execute,
  }
}

function makeSimpleTool({ name, description, render, execute }) {
  return {
    name,
    description,
    parameters: { type: 'object', properties: {} },
    output: { schema: {}, render },
    execute,
  }
}

export const name = 'reasonix-mcp-bridge'

export const inject = ['subprocess', 'fs', 'tools', 'timer']

export function apply(ctx) {
  const subprocess = ctx.subprocess
  const fs = ctx.fs
  const disposers = []
  const instances = []
  ctx.effect(() => () => { for (const d of disposers) d() })

  async function writeErrFile() {
    try {
      await fs.writeText(await fs.resolve(ERR_FILE), JSON.stringify(instances, null, 2))
    } catch {
      // 诊断文件写失败不影响运行
    }
  }

  // ---------- stdio 实例 ----------
  async function startStdioInstance(inst) {
    const rec = { id: inst.id, phase: 'spawning', error: '', stderrTail: '', toolCount: 0, failures: [], toolNames: [], at: new Date().toISOString() }
    instances.push(rec)
    let child
    try {
      child = spawn(inst.argv[0], inst.argv.slice(1), {
        cwd: inst.cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...(inst.env || {}) },
        windowsHide: true,
      })
    } catch (err) {
      rec.phase = 'failed'
      rec.error = 'spawn: ' + err.message
      await writeErrFile()
      throw err
    }
    let buffer = ''
    let stderrTail = ''
    const pending = new Map()
    let nextId = 1
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString('utf8')
      let idx
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).replace(/\r$/, '').trim()
        buffer = buffer.slice(idx + 1)
        if (!line) continue
        let msg
        try { msg = JSON.parse(line) } catch { continue }
        if (msg && msg.id !== undefined && msg.id !== null && pending.has(msg.id)) {
          const p = pending.get(msg.id)
          pending.delete(msg.id)
          if (msg.error) p.reject(new Error(inst.id + ' MCP 错误: ' + JSON.stringify(msg.error)))
          else p.resolve(msg.result)
        }
      }
    })
    child.stderr.on('data', (c) => {
      stderrTail = (stderrTail + c.toString('utf8')).slice(-8000)
    })
    child.on('close', () => {
      for (const p of pending.values()) p.reject(new Error(inst.id + ' 服务器进程已退出'))
      pending.clear()
      if (rec.phase !== 'ready') { rec.phase = 'failed'; if (!rec.error) rec.error = '服务器进程提前退出' }
    })
    const request = (method, params, timeoutMs) => {
      return new Promise((resolve, reject) => {
        const id = nextId++
        const timer = setTimeout(() => {
          pending.delete(id)
          reject(new Error(inst.id + ' 请求超时: ' + method))
        }, timeoutMs)
        pending.set(id, {
          resolve: (v) => { clearTimeout(timer); resolve(v) },
          reject: (e) => { clearTimeout(timer); reject(e) },
        })
        try {
          child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
        } catch (err) {
          clearTimeout(timer)
          pending.delete(id)
          reject(err)
        }
      })
    }
    const notify = (method, params) => {
      try { child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n') } catch {}
    }
    const rootUri = 'file:///' + inst.cwd.replace(/\\/g, '/')
    try {
      rec.phase = 'initialize'
      await request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'dsh-mcp-' + inst.id, version: '1.0.0' }, rootUri }, inst.initTimeoutMs)
      notify('notifications/initialized', {})
      rec.phase = 'list-tools'
      const listed = await request('tools/list', {}, inst.initTimeoutMs)
      return { request, tools: (listed && listed.tools) || [], rec, dispose: () => { try { child.kill() } catch {} } }
    } catch (err) {
      rec.phase = 'failed'
      rec.error = String(err && err.message)
      rec.stderrTail = stderrTail
      await writeErrFile()
      try { child.kill() } catch {}
      throw err
    }
  }

  // ---------- exa HTTP 实例（原生 fetch） ----------
  async function getExaKey() {
    if (process.env.EXA_API_KEY) return process.env.EXA_API_KEY
    return await new Promise((resolve) => {
      execFile('C:\\Windows\\System32\\reg.exe', ['query', 'HKCU\\Environment', '/v', 'EXA_API_KEY'], { windowsHide: true }, (err, stdout) => {
        if (err) { resolve(undefined); return }
        const m = /EXA_API_KEY\s+REG_SZ\s+([A-Za-z0-9_-]+)/.exec(stdout || '')
        resolve(m ? m[1] : undefined)
      })
    })
  }

  async function startExaInstance() {
    const rec = { id: 'exa', phase: 'starting', error: '', stderrTail: '', toolCount: 0, failures: [], toolNames: [], at: new Date().toISOString() }
    instances.push(rec)
    const key = await getExaKey()
    if (!key) {
      rec.phase = 'skipped'
      rec.error = '未找到 EXA_API_KEY（process.env 与 HKCU\\Environment 均无）'
      return undefined
    }
    let sessionId = null
    let nextId = 1
    const request = async (method, params, timeoutMs) => {
      const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'x-api-key': key }
      if (sessionId) headers['Mcp-Session-Id'] = sessionId
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const resp = await fetch(EXA_ENDPOINT, {
          method: 'POST',
          headers,
          body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
          signal: controller.signal,
        })
        const sid = resp.headers.get('mcp-session-id') || resp.headers.get('Mcp-Session-Id')
        if (sid) sessionId = sid
        const ctype = resp.headers.get('content-type') || ''
        const text = await resp.text()
        if (!resp.ok) throw new Error('exa HTTP ' + resp.status + ': ' + text.slice(0, 300))
        if (ctype.includes('text/event-stream')) {
          for (const line of text.split(/\r?\n/)) {
            if (line.startsWith('data:')) {
              const payload = line.slice(5).trim()
              if (payload && payload !== '[DONE]') {
                const msg = JSON.parse(payload)
                if (msg.error) throw new Error('exa MCP 错误: ' + JSON.stringify(msg.error))
                return msg.result
              }
            }
          }
          throw new Error('exa SSE 响应为空')
        }
        const msg = JSON.parse(text)
        if (msg.error) throw new Error('exa MCP 错误: ' + JSON.stringify(msg.error))
        return msg.result
      } finally {
        clearTimeout(timer)
      }
    }
    rec.phase = 'initialize'
    await request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'dsh-mcp-exa', version: '1.0.0' } }, 60000)
    rec.phase = 'list-tools'
    const listed = await request('tools/list', {}, 60000)
    return { request, tools: (listed && listed.tools) || [], rec, dispose: () => {} }
  }

  // ---------- 工具注册（三个实例共用） ----------
  function buildRemoteTool(inst, server, remote, registeredNames) {
    if (registeredNames.has(remote.name)) return null
    const toolName = inst.prefix + '_' + String(remote.name || '').replace(/[^a-zA-Z0-9_]/g, '_')
    const inputSchema = remote.inputSchema || {}
    const properties = inputSchema.properties || {}
    const required = Array.isArray(inputSchema.required) ? inputSchema.required : []
    const params = {}
    for (const key of Object.keys(properties)) {
      const sch = properties[key] || {}
      const t = sch.type === 'string' ? 'string' : sch.type === 'number' ? 'number' : sch.type === 'integer' ? 'integer' : sch.type === 'boolean' ? 'boolean' : 'json'
      params[key] = {
        type: t,
        description: typeof sch.description === 'string' ? sch.description : '',
        ...(required.indexOf(key) >= 0 ? { required: true } : {}),
      }
    }
    try {
      const tool = makeMcpTool({
        name: toolName,
        description: '[' + inst.id + ' MCP] ' + (remote.description || remote.name || ''),
        params,
        render(_args, value) {
          const parts = []
          const content = (value && value.content) || []
          for (const item of content) {
            if (item && item.type === 'text') parts.push(item.text)
            else if (item && item.type === 'image') parts.push('[图片 ' + (item.mimeType || '') + '，base64 内容已省略]')
            else if (item && item.type === 'resource') parts.push('[资源: ' + JSON.stringify(item.resource || {}) + ']')
            else if (item !== null && item !== undefined) parts.push(JSON.stringify(item))
          }
          if (!parts.length) parts.push(JSON.stringify(value))
          return textBlock(parts.join('\n'))
        },
        execute: async function execute(args) {
          const res = await server.request('tools/call', { name: remote.name, arguments: args || {} }, inst.timeoutMs)
          if (res && res.isError) {
            const msgs = []
            for (const item of (res.content || [])) {
              if (item && item.type === 'text') msgs.push(item.text)
            }
            throw new Error(inst.id + ' 工具 ' + remote.name + ' 返回错误: ' + (msgs.join('\n') || JSON.stringify(res)))
          }
          return res
        },
        timeoutMs: inst.timeoutMs,
      })
      const disposer = ctx.tools.register(tool)
      registeredNames.add(remote.name)
      server.rec.toolNames.push(remote.name)
      return disposer
    } catch (err) {
      server.rec.failures.push({ tool: toolName, error: String(err && err.message) })
      return null
    }
  }

  function registerRemoteTools(inst, server) {
    const local = []
    const registeredNames = new Set()
    for (const remote of server.tools) {
      const d = buildRemoteTool(inst, server, remote, registeredNames)
      if (d) local.push(d)
    }
    server.rec.phase = 'ready'
    server.rec.toolCount = local.length
    disposers.push(() => {
      for (const d of local) d()
      server.dispose()
    })
    void writeErrFile()

    for (const delay of (inst.resyncDelays || [])) {
      const timer = setTimeout(async () => {
        try {
          const listed = await server.request('tools/list', {}, inst.initTimeoutMs)
          const fresh = (listed && listed.tools) || []
          const added = []
          for (const remote of fresh) {
            const d = buildRemoteTool(inst, server, remote, registeredNames)
            if (d) { local.push(d); added.push(remote.name) }
          }
          if (added.length) {
            server.rec.toolCount = local.length
            void writeErrFile()
          }
        } catch {
          // 重同步失败不致命
        }
      }, delay)
      disposers.push(() => clearTimeout(timer))
    }
  }

  // ---------- 实例配置 ----------
  const INSTANCES = [
    {
      id: 'playwriter',
      prefix: 'pw',
      argv: [NODE, PLAYWRITER_BIN],
      cwd: homedir(),
      timeoutMs: 180000,
      initTimeoutMs: 90000,
      resyncDelays: [],
    },
    {
      id: 'codegraph',
      prefix: 'cg',
      argv: [CODEGRAPH_NODE, '--liftoff-only', CODEGRAPH_JS, 'serve', '--mcp', '--no-watch'],
      cwd: CG_DIR,
      env: { CODEGRAPH_NO_DAEMON: '1' },
      timeoutMs: 180000,
      initTimeoutMs: 300000,
      resyncDelays: [60000, 120000, 240000],
    },
  ]

  async function maybeAddGithub() {
    let token
    try {
      const text = await readFile(REASONIX_CONFIG, 'utf8')
      const m = /GITHUB_PERSONAL_ACCESS_TOKEN\s*=\s*"([^"]+)"/.exec(text)
      token = m && m[1] ? m[1] : undefined
    } catch {}
    if (!token) {
      instances.push({ id: 'github', phase: 'skipped', error: '未找到 GitHub token', toolCount: 0, at: new Date().toISOString() })
      return undefined
    }
    let serverPath
    try {
      const npxRoot = NPM_NPX_ROOT
      const entries = await readdir(npxRoot, { withFileTypes: true })
      for (const e of entries) {
        if (!e.isDirectory()) continue
        const cand = join(npxRoot, e.name, 'node_modules', '@modelcontextprotocol', 'server-github', 'dist', 'index.js')
        try {
          const s = await stat(cand)
          if (s.isFile()) { serverPath = cand; break }
        } catch { /* 下一个候选 */ }
      }
    } catch {}
    if (!serverPath) {
      instances.push({ id: 'github', phase: 'skipped', error: '未找到 npx 缓存的 github server（可运行 npx -y @modelcontextprotocol/server-github 预热）', toolCount: 0, at: new Date().toISOString() })
      return undefined
    }
    return {
      id: 'github',
      prefix: 'gh',
      argv: [NODE, serverPath],
      cwd: homedir(),
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: token },
      timeoutMs: 120000,
      initTimeoutMs: 90000,
      resyncDelays: [],
    }
  }

  // ---------- bridge_status 诊断工具 ----------
  ctx.tools.register(makeSimpleTool({
    name: 'bridge_status',
    description: '查看 mcp-bridge 各 MCP 实例（playwriter/codegraph/github/exa）的初始化状态与错误信息，用于诊断。',
    render(_args, value) {
      const lines = []
      for (const r of value.instances) {
        lines.push(r.id + ': phase=' + r.phase + ' tools=' + r.toolCount + (r.error ? ' error=' + r.error : ''))
      }
      return textBlock(lines.join('\n') || '(无实例)')
    },
    async execute() {
      return { instances: instances.map((r) => ({ id: r.id, phase: r.phase, toolCount: r.toolCount, error: String(r.error || '') })) }
    },
  }))

  // ---------- 启动 ----------
  for (const inst of INSTANCES) {
    startStdioInstance(inst).then((server) => {
      registerRemoteTools(inst, server)
      if (inst.id === 'playwriter') {
        // 扩展模式就绪后，自动补建 headless 会话（relay 启动需要几秒，重试两次）
        for (const delay of [15000, 30000]) {
          const t = setTimeout(() => {
            execFile(NODE, [PLAYWRITER_BIN, 'session', 'new', '--browser', 'headless'], { windowsHide: true }, (err, stdout) => {
              if (!err) console.log('[mcp-bridge] headless 会话: ' + String(stdout).trim().split('\n')[0])
            })
          }, delay)
          disposers.push(() => clearTimeout(t))
        }
      }
    }).catch(() => { /* 错误已记录到实例 rec */ })
  }
  void maybeAddGithub().then((inst) => {
    if (!inst) return
    return startStdioInstance(inst).then((server) => registerRemoteTools(inst, server)).catch(() => {})
  })
  void startExaInstance().then((server) => {
    if (!server) return
    registerRemoteTools({ id: 'exa', prefix: 'exa', timeoutMs: 120000, initTimeoutMs: 60000, resyncDelays: [] }, server)
  }).catch((err) => {
    const rec = instances.find((r) => r.id === 'exa')
    if (rec && rec.phase !== 'ready') { rec.phase = 'failed'; rec.error = String(err && err.message) }
    void writeErrFile()
  })
}
