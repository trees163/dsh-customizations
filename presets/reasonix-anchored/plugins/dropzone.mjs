/**
 * reasonix-dropzone（瘦身版，anchored 变体）— 只负责把"文件树拖路径进输入框"
 * 的小脚本注入 DSH 页面（tapIndex + 脚本路由）。
 * 图片拖入已改走 DSH 原生通道（vscode-layout 补丁放行 → ~/.dsh/attachments/），
 * 原拖图按钮/上传接口已移除；临时目录 tmp-images 及其文件保留在磁盘，仅停用功能。
 * 只消费宿主 webServer 服务，不发布任何服务。
 *
 * 与「Reasonix 桥接」预设的差异（2026-08-15）：
 * webServer 的 /rx/drop-widget.js 是进程级全局路由。两个桥接预设同进程共存时
 * （本预设与 reasonix 各挂一个会话），后挂载者重复注册会抛
 * `duplicate exact route "/rx/drop-widget.js"` 导致整个预设挂载失败。
 * 本副本对重复注册做守卫：路由已存在则跳过（页面脚本由先注册者提供；
 * tapIndex 的重复注入检查同样生效，页面只会注入一份 script）。
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const WIDGET_FILE = process.env.DSH_WIDGET_FILE || join(homedir(), '.dsh', 'rx-drop-widget.js')

export const name = 'reasonix-dropzone'

export const inject = ['webServer']

export function apply(ctx) {
  const webServer = ctx.webServer

  let widgetJs = ''
  try {
    widgetJs = readFileSync(WIDGET_FILE, 'utf8')
  } catch {
    // 脚本文件缺失则只注入占位注释，不破坏页面
    widgetJs = '/* rx-drop-widget.js not found */'
  }

  let disposeWidgetJs = null
  try {
    disposeWidgetJs = webServer.register({
      kind: 'exact',
      path: '/rx/drop-widget.js',
      handler(_req, res) {
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' })
        res.end(widgetJs)
      },
    })
  } catch (err) {
    // 路由已由同进程的另一个预设注册（reasonix 桥接）——跳过，不视为失败
    console.warn('[reasonix-anchored dropzone] route /rx/drop-widget.js already served, skip register: ' + (err && err.message))
  }

  const disposeTap = webServer.tapIndex((page) => {
    if (page.indexOf('/rx/drop-widget.js') >= 0) return page
    if (page.indexOf('</head>') >= 0) return page.replace('</head>', '<script src="/rx/drop-widget.js" defer></script></head>')
    return page + '<script src="/rx/drop-widget.js" defer></script>'
  })

  return () => { if (disposeWidgetJs) disposeWidgetJs(); disposeTap() }
}
