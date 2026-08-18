/**
 * reasonix-dropzone（瘦身版）— 只负责把"文件树拖路径进输入框"的小脚本
 * 注入 DSH 页面（tapIndex + 脚本路由）。
 * 图片拖入已改走 DSH 原生通道（vscode-layout 补丁放行 → ~/.dsh/attachments/），
 * 原拖图按钮/上传接口已移除；临时目录 tmp-images 及其文件保留在磁盘，仅停用功能。
 * 只消费宿主 webServer 服务，不发布任何服务。
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
    // 路由已由同进程的另一个预设注册（reasonix-anchored 等）——跳过，不视为失败
    console.warn('[reasonix dropzone] route /rx/drop-widget.js already served, skip register: ' + (err && err.message))
  }

  const disposeTap = webServer.tapIndex((page) => {
    if (page.indexOf('/rx/drop-widget.js') >= 0) return page
    if (page.indexOf('</head>') >= 0) return page.replace('</head>', '<script src="/rx/drop-widget.js" defer></script></head>')
    return page + '<script src="/rx/drop-widget.js" defer></script>'
  })

  return () => { if (disposeWidgetJs) disposeWidgetJs(); disposeTap() }
}
