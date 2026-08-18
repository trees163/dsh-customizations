(function () {
  if (window.__rxDropWidget) return
  window.__rxDropWidget = true

  // 瘦身版：只负责"左侧文件树拖出的路径 → 插入输入框光标处"。
  // 图片文件拖入走 DSH 原生通道（vscode-layout 补丁已放行），此处不再拦截。
  var MIME = 'application/x-dsh-filepath'

  function fillInput(text) {
    var targets = Array.prototype.slice.call(document.querySelectorAll('textarea'))
    if (!targets.length) targets = Array.prototype.slice.call(document.querySelectorAll('[contenteditable="true"]'))
    for (var i = 0; i < targets.length; i++) {
      var el = targets[i]
      if (el.offsetParent === null && el.tagName !== 'BODY') continue
      var focused = document.activeElement === el
      if (el.tagName === 'TEXTAREA') {
        var setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
        var selStart = typeof el.selectionStart === 'number' ? el.selectionStart : 0
        var selEnd = typeof el.selectionEnd === 'number' ? el.selectionEnd : 0
        var next, caret
        if (focused && typeof el.selectionStart === 'number') {
          var val = el.value
          next = val.slice(0, selStart) + text + val.slice(selEnd)
          caret = selStart + text.length
        } else {
          var needSpace = el.value && !/[\s\n]$/.test(el.value)
          next = el.value + (needSpace ? ' ' : '') + text
          caret = next.length
        }
        setter.call(el, next)
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.focus()
        try { el.setSelectionRange(caret, caret) } catch (e) {}
        return true
      } else {
        var insertDone = false
        if (focused) {
          var sel = window.getSelection()
          if (sel && sel.rangeCount > 0) {
            var range = sel.getRangeAt(0)
            if (el.contains(range.commonAncestorContainer) || range.commonAncestorContainer === el) {
              range.deleteContents()
              var node = document.createTextNode(text)
              range.insertNode(node)
              range.setStartAfter(node)
              range.setEndAfter(node)
              sel.removeAllRanges()
              sel.addRange(range)
              insertDone = true
            }
          }
        }
        if (!insertDone) {
          var needSpace2 = el.textContent && !/[\s\n]$/.test(el.textContent)
          el.appendChild(document.createTextNode((needSpace2 ? ' ' : '') + text))
        }
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.focus()
        return true
      }
    }
    return false
  }

  function hasPathDrag(e) {
    return e.dataTransfer && e.dataTransfer.types && Array.prototype.indexOf.call(e.dataTransfer.types, MIME) >= 0
  }

  document.addEventListener('dragover', function (e) {
    if (hasPathDrag(e)) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, true)
  document.addEventListener('drop', function (e) {
    if (!hasPathDrag(e)) return
    e.preventDefault()
    e.stopPropagation()
    var p = e.dataTransfer.getData(MIME)
    if (p) {
      if (!fillInput(p)) {
        navigator.clipboard.writeText(p).catch(function () {})
      }
    }
  }, true)
})()
