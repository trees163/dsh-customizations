/**
 * Beauty layer for the DSH Web UI — browser half.
 *
 * Multi-skin (hue-rotated palettes) + custom wallpaper + per-region backdrop
 * veils (chat / workspace / reader) + settings card + pill skin picker.
 *
 * Per-skin settings (2026-08-16): every skin keeps its OWN panel-opacity,
 * region-veil values and wallpaper, stored under
 * `dsh.beauty.v1.skin.<id>.<field>`. Switching skins saves the outgoing
 * skin's values and loads the incoming skin's. Legacy global keys
 * (`dsh.beauty.v1.panelAlpha`, `*.chatVisible`, etc.) migrate once into the
 * current skin's store on first load.
 *
 * Bundle format: __ModuleLoader__ factory-form CJS (see dsh-client-modules).
 * Coverage logic ported from the dsh-web-ui "Blue Fantasy" skin
 * (zhu1090093659/dsh-web-ui, Apache-2.0; art direction powerdog996, DreamSkin).
 */
window.__ModuleLoader__.load({
  id: '@deepseek-ai/dsh-client-ui-beauty',
  factory: (require) => {
    const exports = {}
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const name = 'dsh-client-ui-beauty'
    const STORE_KEY = 'dsh.beauty.v1.enabled'
    const SKIN_KEY = 'dsh.beauty.v1.skin'
    /* Legacy global keys (migrated into per-skin storage). */
    const ALPHA_KEY = 'dsh.beauty.v1.panelAlpha'
    const CHAT_KEY = 'dsh.beauty.v1.chatVisible'
    const WORK_KEY = 'dsh.beauty.v1.workVisible'
    const READER_KEY = 'dsh.beauty.v1.readerVisible'
    const WALL_KEY = 'dsh.beauty.v1.wallpaper'
    const PLUGIN_ID = '@deepseek-ai/dsh-client-ui-beauty'

    const CSS = '__BEAUTY_CSS__'
    const ART_URI = 'data:image/jpeg;base64,__BEAUTY_ART__'

    /* Settings-card dependencies — resolved defensively. */
    let defineStore = null
    let jsx = null
    let jsxs = null
    try {
      defineStore = require('@deepseek-ai/dsh-client-runtime/client').defineStore
    } catch {
      /* runtime module unavailable — pill-only mode */
    }
    try {
      const jsxRuntime = require('react/jsx-runtime')
      jsx = jsxRuntime.jsx
      jsxs = jsxRuntime.jsxs
    } catch {
      /* react unavailable — pill-only mode */
    }

    const inject = defineStore && jsx ? ['slots', 'locale'] : []

    /* Skins: whale/paper ride the whale art (or the custom wallpaper); the
       hue skins use gradient backdrops rotated to their palette hue at
       runtime (same deltas as the build-time token palettes). */
    const SKINS = [
      { id: 'whale', label: '鲸吟 · 蓝幻', art: true },
      { id: 'mist', label: '雾蓝 · 极简', delta: 0 },
      { id: 'paper', label: '素白 · 明亮', art: true, paper: true },
      { id: 'sakura', label: '樱绯 · 粉', delta: 112 },
      { id: 'teal', label: '青岚 · 碧', delta: -52 },
      { id: 'amber', label: '琥珀 · 金', delta: 176 },
      { id: 'violet', label: '紫罗兰', delta: 46 },
      { id: 'emerald', label: '翡翠 · 绿', delta: -80 },
      { id: 'native', label: '原生界面', native: true },
    ]

    /* Light scrim: a thin ice veil over the art. */
    const SCRIM_LIGHT = 'linear-gradient(rgba(246, 248, 253, 0.08) 0%, rgba(240, 243, 251, 0.14) 55%, rgba(235, 239, 249, 0.2) 100%)'
    /* Dark scrim: a deep indigo veil under the night palette. */
    const SCRIM_DARK = 'linear-gradient(rgba(10, 14, 28, 0.35) 0%, rgba(13, 18, 34, 0.45) 60%, rgba(16, 22, 42, 0.5) 100%)'
    /* Paper skin: a heavy white veil over the art for the brightest light. */
    const PAPER_LIGHT = 'linear-gradient(rgba(250, 252, 255, 0.78) 0%, rgba(248, 250, 254, 0.82) 55%, rgba(243, 246, 252, 0.86) 100%)'
    /* Base gradients for the hue skins (hue-rotated at runtime). */
    const MIST_LIGHT = 'linear-gradient(180deg, #eaf0fd 0%, #f5f8fe 45%, #dce5f8 100%)'
    const MIST_DARK = 'linear-gradient(180deg, #151b31 0%, #0f1526 50%, #1b2442 100%)'

    const BACKDROP_PROPERTIES = [
      'background-image',
      'background-position',
      'background-size',
      'background-attachment',
      'background-repeat',
    ]

    /* Per-skin fields. */
    const FIELDS = ['panelAlpha', 'chatVisible', 'workVisible', 'fileVisible', 'readerVisible', 'wallpaper']
    const LEGACY_FIELDS = {
      panelAlpha: ALPHA_KEY,
      chatVisible: CHAT_KEY,
      workVisible: WORK_KEY,
      /* The file area used to ride the work slider — inherit the same legacy
         value once. */
      fileVisible: WORK_KEY,
      readerVisible: READER_KEY,
      wallpaper: WALL_KEY,
    }

    /** Hue-rotate one #rrggbb color (saturated colors only; grays stay). */
    function hueShiftColor(hex, delta) {
      const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
      if (!m) return hex
      const r = parseInt(m[1].slice(0, 2), 16) / 255
      const g = parseInt(m[1].slice(2, 4), 16) / 255
      const b = parseInt(m[1].slice(4, 6), 16) / 255
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const l = (max + min) / 2
      let h = 0
      let s = 0
      if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
        else if (max === g) h = (b - r) / d + 2
        else h = (r - g) / d + 4
        h *= 60
      }
      if (s < 0.06) return hex
      h = (h + delta + 360) % 360
      const c = (1 - Math.abs(2 * l - 1)) * s
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
      const m2 = l - c / 2
      let r2 = 0
      let g2 = 0
      let b2 = 0
      if (h < 60) { r2 = c; g2 = x } else if (h < 120) { r2 = x; g2 = c } else if (h < 180) { g2 = c; b2 = x } else if (h < 240) { g2 = x; b2 = c } else if (h < 300) { r2 = x; b2 = c } else { r2 = c; b2 = x }
      const toHex = (v) => Math.round((v + m2) * 255).toString(16).padStart(2, '0')
      return '#' + toHex(r2) + toHex(g2) + toHex(b2)
    }

    function hueShiftGradient(gradient, delta) {
      return gradient.replace(/#[0-9a-fA-F]{6}/g, (hex) => hueShiftColor(hex, delta))
    }

    function readStore(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key)
        return raw === null ? fallback : raw
      } catch {
        return fallback
      }
    }

    function writeStore(key, value) {
      try {
        if (value === null || value === '') window.localStorage.removeItem(key)
        else window.localStorage.setItem(key, value)
      } catch {
        /* storage unavailable */
      }
    }

    function readSkin() {
      const s = readStore(SKIN_KEY, 'whale')
      return SKINS.some((k) => k.id === s) ? s : 'whale'
    }

    function ensureStyle() {
      let el = null
      for (const s of document.querySelectorAll('style')) {
        if (s.getAttribute('data-plugin') === PLUGIN_ID) {
          el = s
          break
        }
      }
      if (!el) {
        el = document.createElement('style')
        el.setAttribute('data-plugin', PLUGIN_ID)
        el.setAttribute('data-plugin-css', PLUGIN_ID + '/beauty.css')
        el.textContent = CSS
        document.head.appendChild(el)
      }
      return el
    }

    function apply(ctx) {
      if (window.__dshBeautyApplied) return
      window.__dshBeautyApplied = true

      let disposed = false
      let style = null
      let pill = null
      let menu = null
      let observer = null
      let skin = readSkin()

      /* Per-skin working state (loaded/saved on skin switches). */
      let panelAlpha = 100
      let chatVisible = 100
      let workVisible = 100
      let fileVisible = 100
      let readerVisible = 100
      let wallpaper = ''

      const previous = new Map()
      for (const prop of BACKDROP_PROPERTIES) previous.set(prop, document.body.style.getPropertyValue(prop))

      const isDark = () => document.body.dataset.dsDarkTheme !== undefined
      const skinOf = (id) => SKINS.find((k) => k.id === id) || SKINS[0]

      /* ---------- Per-skin persistence ---------- */

      const skinStorageKey = (s, field) => 'dsh.beauty.v1.skin.' + s + '.' + field

      const loadSkinState = (s) => {
        const out = {}
        for (const field of FIELDS) {
          const k = skinStorageKey(s, field)
          let v = readStore(k, null)
          if (v === null) {
            /* One-time migration from the legacy global keys; consumed so
               other skins don't inherit them. */
            v = readStore(LEGACY_FIELDS[field], null)
            if (v !== null) {
              writeStore(k, v)
              writeStore(LEGACY_FIELDS[field], null)
            }
          }
          out[field] = v
        }
        return out
      }

      const saveSkinState = (s) => {
        const values = { panelAlpha, chatVisible, workVisible, fileVisible, readerVisible, wallpaper }
        for (const field of FIELDS) writeStore(skinStorageKey(s, field), String(values[field]))
      }

      const toNum = (v, dflt, max) => {
        const n = Number(v)
        return Number.isFinite(n) && n >= 0 && n <= max ? n : dflt
      }
      const toWall = (v) => (typeof v === 'string' && v.startsWith('data:') ? v : '')

      const alphaFor = (v) => Math.max(0, Math.min(100, Math.round((96 * (200 - v)) / 100)))

      /* ---------- Painting ---------- */

      const artSource = () => (wallpaper ? wallpaper : ART_URI)

      const backdropFor = (s) => {
        const entry = skinOf(s)
        if (entry.native) return ''
        if (wallpaper) {
          // Custom wallpaper: thin scrim always — the paper skin's heavy
          // white veil is only for the default whale art, it would bury a
          // user-chosen backdrop.
          const scrim = isDark() ? SCRIM_DARK : SCRIM_LIGHT
          return (
            'linear-gradient(rgba(16, 22, 42, var(--dsw-skin-scrim, 0)) 0%, rgba(16, 22, 42, var(--dsw-skin-scrim, 0)) 100%), ' +
            scrim +
            ', url("' + wallpaper + '")'
          )
        }
        if (entry.art) {
          const scrim = isDark() ? SCRIM_DARK : entry.paper ? PAPER_LIGHT : SCRIM_LIGHT
          return (
            'linear-gradient(rgba(16, 22, 42, var(--dsw-skin-scrim, 0)) 0%, rgba(16, 22, 42, var(--dsw-skin-scrim, 0)) 100%), ' +
            scrim +
            ', url("' + ART_URI + '")'
          )
        }
        return hueShiftGradient(isDark() ? MIST_DARK : MIST_LIGHT, entry.delta || 0)
      }

      const paintBackdrop = () => {
        if (disposed) return
        const img = backdropFor(skin)
        if (!img) {
          restoreBackdrop()
          return
        }
        document.body.style.setProperty('background-image', img)
        document.body.style.setProperty('background-position', 'center')
        document.body.style.setProperty('background-size', 'cover')
        document.body.style.setProperty('background-attachment', 'fixed')
        document.body.style.setProperty('background-repeat', 'no-repeat')
      }

      const restoreBackdrop = () => {
        for (const [prop, value] of previous) document.body.style.setProperty(prop, value)
      }

      const paintVeils = () => {
        if (disposed) return
        const frac = (v) => ({ veil: Math.max(0, 100 - v) / 100, boost: Math.max(0, v - 100) / 100 })
        const c = frac(chatVisible)
        const w = frac(workVisible)
        const f = frac(fileVisible)
        const r = frac(readerVisible)
        const doc = document.documentElement.style
        doc.setProperty('--dsh-beauty-region-chat', String(c.veil))
        doc.setProperty('--dsh-beauty-region-chat-boost', String(c.boost))
        doc.setProperty('--dsh-beauty-region-work', String(w.veil))
        doc.setProperty('--dsh-beauty-region-work-boost', String(w.boost))
        doc.setProperty('--dsh-beauty-region-file', String(f.veil))
        doc.setProperty('--dsh-beauty-region-file-boost', String(f.boost))
        doc.setProperty('--dsh-beauty-region-reader', String(r.veil))
        doc.setProperty('--dsh-beauty-region-reader-boost', String(r.boost))
      }

      const applyPaintState = () => {
        if (disposed) return
        document.documentElement.style.setProperty('--dsh-beauty-panel-alpha', alphaFor(panelAlpha) + '%')
        paintVeils()
      }

      const syncPill = () => {
        if (!pill) return
        pill.setAttribute('data-on', skin === 'native' ? 'false' : 'true')
        if (menu) {
          for (const btn of menu.querySelectorAll('button[data-skin]')) {
            btn.setAttribute('data-active', btn.getAttribute('data-skin') === skin ? 'true' : 'false')
          }
        }
      }

      const setSkin = (s) => {
        if (!SKINS.some((k) => k.id === s)) s = 'whale'
        // Persist the outgoing skin's values ONLY when actually switching —
        // the first call (init) must load before saving, or the default
        // working state would clobber the skin's stored/migrated values.
        if (skin !== s) saveSkinState(skin)
        skin = s
        const next = loadSkinState(s)
        panelAlpha = toNum(next.panelAlpha, 100, 200)
        chatVisible = toNum(next.chatVisible, 100, 200)
        workVisible = toNum(next.workVisible, 100, 200)
        fileVisible = toNum(next.fileVisible, 100, 200)
        readerVisible = toNum(next.readerVisible, 100, 200)
        wallpaper = toWall(next.wallpaper)

        if (s === 'native') {
          document.documentElement.removeAttribute('data-dsh-beauty-skin')
          document.documentElement.removeAttribute('data-dsh-beauty')
        } else {
          document.documentElement.setAttribute('data-dsh-beauty', '')
          document.documentElement.setAttribute('data-dsh-beauty-skin', s)
        }
        paintBackdrop()
        applyPaintState()
        syncPill()
        writeStore(SKIN_KEY, s)
        writeStore(STORE_KEY, s === 'native' ? '0' : '1')
        syncStore()
      }

      const setPanelAlpha = (n) => {
        panelAlpha = Math.max(0, Math.min(200, Math.round(n)))
        applyPaintState()
        writeStore(skinStorageKey(skin, 'panelAlpha'), String(panelAlpha))
        syncStore()
      }

      const setChatVisible = (n) => {
        chatVisible = Math.max(0, Math.min(200, Math.round(n)))
        applyPaintState()
        writeStore(skinStorageKey(skin, 'chatVisible'), String(chatVisible))
        syncStore()
      }

      const setWorkVisible = (n) => {
        workVisible = Math.max(0, Math.min(200, Math.round(n)))
        applyPaintState()
        writeStore(skinStorageKey(skin, 'workVisible'), String(workVisible))
        syncStore()
      }

      const setFileVisible = (n) => {
        fileVisible = Math.max(0, Math.min(200, Math.round(n)))
        applyPaintState()
        writeStore(skinStorageKey(skin, 'fileVisible'), String(fileVisible))
        syncStore()
      }

      const setReaderVisible = (n) => {
        readerVisible = Math.max(0, Math.min(200, Math.round(n)))
        applyPaintState()
        writeStore(skinStorageKey(skin, 'readerVisible'), String(readerVisible))
        syncStore()
      }

      const setWallpaper = (url) => {
        wallpaper = url || ''
        writeStore(skinStorageKey(skin, 'wallpaper'), wallpaper)
        paintBackdrop()
        syncStore()
      }

      const closeMenu = () => {
        if (menu && menu.isConnected) menu.remove()
        menu = null
      }

      const openMenu = () => {
        if (menu) {
          closeMenu()
          return
        }
        menu = document.createElement('div')
        menu.setAttribute('data-dsh-beauty-menu', '')
        for (const k of SKINS) {
          const btn = document.createElement('button')
          btn.type = 'button'
          btn.setAttribute('data-skin', k.id)
          btn.setAttribute('data-active', k.id === skin ? 'true' : 'false')
          const label = document.createElement('span')
          label.textContent = k.label
          const mark = document.createElement('span')
          mark.textContent = k.id === skin ? '\u2713' : ''
          btn.appendChild(label)
          btn.appendChild(mark)
          btn.addEventListener('click', () => {
            setSkin(k.id)
            closeMenu()
          })
          menu.appendChild(btn)
        }
        document.body.appendChild(menu)
        const onDoc = (e) => {
          if (menu && !menu.contains(e.target) && e.target !== pill) closeMenu()
        }
        const onKey = (e) => {
          if (e.key === 'Escape') closeMenu()
        }
        document.addEventListener('mousedown', onDoc)
        document.addEventListener('keydown', onKey)
        menu.addEventListener('remove', () => {
          document.removeEventListener('mousedown', onDoc)
          document.removeEventListener('keydown', onKey)
        })
      }

      /* ---------- Settings card ---------- */

      const NS = 'settings.beauty'
      const dictionaries = {
        zh: {
          'beauty.alpha': '面板透明度',
          'beauty.alphaHint': '100 为当前观感；调小面板更实，调大面板更透（浅色/深色通用）',
          'beauty.wallpaper': '背景图片',
          'beauty.wallpaperHint': '自定义背景（覆盖鲸吟/素白的鲸鱼娘壁纸，渐变皮肤也会使用）；每个皮肤独立记忆',
          'beauty.chooseWallpaper': '选择图片',
          'beauty.clearWallpaper': '清除',
          'beauty.chat': '对话区背景透明度',
          'beauty.work': '工作区背景透明度',
          'beauty.file': '文件区背景透明度',
          'beauty.reader': '阅读区背景透明度',
          'beauty.readerHint': '100 为当前观感；调小背景被遮得更实，调大背景更透。阅读区指读取图片/docx/txt 的内容区',
          'beauty.reset': '重置',
        },
        en: {
          'beauty.alpha': 'Panel opacity',
          'beauty.alphaHint': '100 is the current look; lower = more solid panel, higher = more transparent (light/dark)',
          'beauty.wallpaper': 'Backdrop image',
          'beauty.wallpaperHint': 'Custom backdrop (overrides the whale art; used by gradient skins too). Remembered per skin',
          'beauty.chooseWallpaper': 'Choose image',
          'beauty.clearWallpaper': 'Clear',
          'beauty.chat': 'Chat backdrop opacity',
          'beauty.work': 'Workspace backdrop opacity',
          'beauty.file': 'File area backdrop opacity',
          'beauty.reader': 'Reader backdrop opacity',
          'beauty.readerHint': '100 is the current look; lower veils the backdrop, higher reveals it. Reader = the image/docx/txt pane',
          'beauty.reset': 'Reset',
        },
      }

      let bound = null
      let revision = 0
      const syncStore = () => {
        if (!bound) return
        try {
          bound.sync({ panelAlpha, chatVisible, workVisible, fileVisible, readerVisible, wallpaper: !!wallpaper }, revision)
          revision += 1
        } catch {
          /* slot store gone — ignore */
        }
      }

      const registerSettingsCard = () => {
        if (!defineStore || !jsx || typeof ctx !== 'object' || ctx === null) return
        if (typeof ctx.slots?.inject !== 'function' || typeof ctx.slots.register !== 'function') return

        const store = defineStore({
          init: () => ({
            panelAlpha,
            chatVisible,
            workVisible,
            fileVisible,
            readerVisible,
            wallpaper: !!wallpaper,
            revision: -1,
          }),
          actions: {
            sync: (d, next, rev) => {
              if (rev <= d.revision) return
              d.panelAlpha = next.panelAlpha
              d.chatVisible = next.chatVisible
              d.workVisible = next.workVisible
              d.fileVisible = next.fileVisible
              d.readerVisible = next.readerVisible
              d.wallpaper = next.wallpaper
              d.revision = rev
            },
          },
        })

        const j = jsxs || jsx

        function Knob(props) {
          const { label, value, onChange, t } = props
          return j('div', {
            className: 'dsh-beauty-knob',
            children: [
              j('div', {
                className: 'dsh-beauty-knob-head',
                children: [
                  j('span', { className: 'dsh-beauty-alpha-label', children: label }),
                  j('div', {
                    className: 'dsh-beauty-knob-right',
                    children: [
                      j('span', { className: 'dsh-beauty-alpha-value', children: value + '%' }),
                      value !== 100
                        ? j('button', {
                            type: 'button',
                            className: 'dsh-beauty-reset-button',
                            onClick: () => onChange(100),
                            children: t('beauty.reset'),
                          })
                        : null,
                    ],
                  }),
                ],
              }),
              j('input', {
                type: 'range',
                min: 0,
                max: 200,
                step: 1,
                value: value,
                'aria-label': label,
                onChange: (e) => onChange(Number(e.target.value)),
              }),
            ],
          })
        }

        function BeautyRow(props) {
          const { t, setPanelAlpha: wAlpha, setChatVisible: wChat, setWorkVisible: wWork, setFileVisible: wFile, setReaderVisible: wReader, setWallpaper: wWall, useStore } = props
          const panelAlphaV = useStore((s) => s.panelAlpha)
          const chatVisibleV = useStore((s) => s.chatVisible)
          const workVisibleV = useStore((s) => s.workVisible)
          const fileVisibleV = useStore((s) => s.fileVisible)
          const readerVisibleV = useStore((s) => s.readerVisible)
          const hasWallpaper = useStore((s) => s.wallpaper)

          const pickWallpaper = () => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.addEventListener('change', () => {
              const file = input.files && input.files[0]
              if (!file) return
              const reader = new FileReader()
              reader.addEventListener('load', () => {
                const url = String(reader.result || '')
                const img = new Image()
                img.addEventListener('load', () => {
                  try {
                    const maxDim = 1920
                    const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
                    const canvas = document.createElement('canvas')
                    canvas.width = Math.max(1, Math.round(img.width * scale))
                    canvas.height = Math.max(1, Math.round(img.height * scale))
                    const c2d = canvas.getContext('2d')
                    if (!c2d) {
                      wWall(url)
                      return
                    }
                    c2d.drawImage(img, 0, 0, canvas.width, canvas.height)
                    wWall(canvas.toDataURL('image/jpeg', 0.82))
                  } catch {
                    wWall(url)
                  }
                })
                img.addEventListener('error', () => {
                  wWall(url)
                })
                img.src = url
              })
              reader.readAsDataURL(file)
              input.value = ''
            })
            input.click()
          }

          return j('div', {
            className: 'dsh-beauty-alpha-row',
            children: [
              j(Knob, { label: t('beauty.alpha'), value: panelAlphaV, onChange: wAlpha, t }),
              j('div', { className: 'dsh-beauty-alpha-hint', children: t('beauty.alphaHint') }),
              j('div', {
                className: 'dsh-beauty-wallpaper-row',
                children: [
                  j('span', { className: 'dsh-beauty-alpha-label', children: t('beauty.wallpaper') }),
                  j('div', {
                    className: 'dsh-beauty-wallpaper-actions',
                    children: [
                      j('button', { type: 'button', className: 'dsh-beauty-pick-button', onClick: pickWallpaper, children: t('beauty.chooseWallpaper') }),
                      hasWallpaper
                        ? j('button', { type: 'button', className: 'dsh-beauty-clear-button', onClick: () => wWall(''), children: t('beauty.clearWallpaper') })
                        : null,
                    ],
                  }),
                ],
              }),
              j('div', { className: 'dsh-beauty-alpha-hint', children: t('beauty.wallpaperHint') }),
              j(Knob, { label: t('beauty.chat'), value: chatVisibleV, onChange: wChat, t }),
              j(Knob, { label: t('beauty.work'), value: workVisibleV, onChange: wWork, t }),
              j(Knob, { label: t('beauty.file'), value: fileVisibleV, onChange: wFile, t }),
              j(Knob, { label: t('beauty.reader'), value: readerVisibleV, onChange: wReader, t }),
              j('div', { className: 'dsh-beauty-alpha-hint', children: t('beauty.readerHint') }),
            ],
          })
        }

        try {
          if (typeof ctx.locale?.register === 'function') {
            ctx.locale.register(NS, dictionaries)
          }
        } catch {
          /* locale unavailable — labels render as raw keys */
        }

        try {
          ctx.slots.inject('settings.general.item', () =>
            ctx.slots.register(
              {
                name: 'settings.general.item',
                id: 'beauty',
                order: 11,
                store,
                locale: NS,
                inject: (actions) => {
                  bound = actions
                  syncStore()
                  return {
                    setPanelAlpha,
                    setChatVisible,
                    setWorkVisible,
                    setFileVisible,
                    setReaderVisible,
                    setWallpaper,
                  }
                },
              },
              BeautyRow,
            ),
          )
        } catch {
          /* slot registration failed — pill-only mode */
        }
      }

      const cleanup = () => {
        if (disposed) return
        disposed = true
        document.documentElement.removeAttribute('data-dsh-beauty')
        document.documentElement.removeAttribute('data-dsh-beauty-skin')
        document.documentElement.style.removeProperty('--dsh-beauty-panel-alpha')
        document.documentElement.style.removeProperty('--dsh-beauty-region-chat')
        document.documentElement.style.removeProperty('--dsh-beauty-region-chat-boost')
        document.documentElement.style.removeProperty('--dsh-beauty-region-work')
        document.documentElement.style.removeProperty('--dsh-beauty-region-work-boost')
        document.documentElement.style.removeProperty('--dsh-beauty-region-reader')
        document.documentElement.style.removeProperty('--dsh-beauty-region-reader-boost')
        restoreBackdrop()
        if (observer) {
          observer.disconnect()
          observer = null
        }
        if (style && style.isConnected) style.remove()
        if (menu && menu.isConnected) menu.remove()
        if (pill && pill.isConnected) pill.remove()
        window.__dshBeautyApplied = false
      }

      const init = () => {
        if (disposed || !document.body) return

        style = ensureStyle()
        setSkin(readSkin())
        registerSettingsCard()

        // Pill: opens the skin picker.
        pill = document.createElement('button')
        pill.type = 'button'
        pill.textContent = '\u25C6'
        pill.setAttribute('data-dsh-beauty-toggle', '')
        pill.setAttribute('aria-label', '外观选择')
        pill.title = '外观选择：鲸吟 / 雾蓝 / 素白 / 樱绯 / 青岚 / 琥珀 / 紫罗兰 / 翡翠 / 原生'
        pill.addEventListener('click', openMenu)
        const pillWrap = document.createElement('div')
        pillWrap.setAttribute('data-dsh-beauty-pill', '')
        pillWrap.appendChild(pill)
        document.body.appendChild(pillWrap)
        syncPill()

        // Theme flip → rebuild the backdrop (scrim swap), same as the skin.
        observer = new MutationObserver(() => {
          if (!disposed && skin !== 'native') paintBackdrop()
        })
        observer.observe(document.body, {
          attributes: true,
          attributeFilter: ['data-ds-dark-theme'],
        })
      }

      if (typeof ctx === 'object' && ctx !== null && typeof ctx.on === 'function') {
        try {
          ctx.on('dispose', cleanup)
        } catch {
          /* dispose hook unavailable — the layer is attribute-gated anyway */
        }
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true })
      } else {
        init()
      }
    }

    exports.name = name
    exports.inject = inject
    exports.apply = apply
    return exports
  },
})
