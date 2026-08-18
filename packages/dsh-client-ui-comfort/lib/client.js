/**
 * Comfort layer for the DSH Web UI — browser half.
 *
 * Bundle format: __ModuleLoader__ factory-form CJS (see dsh-client-modules).
 * The factory returns { name, inject, apply }; the vendored cordis Loader
 * treats it as the plugin face and calls apply(ctx) with the client context.
 *
 * Ownership model (mirrors the Aqua theme-layer plugin):
 *  - always-on since 2026-08-16 (the user kept only the beauty pill): every
 *    visual change is gated on <html data-dsh-comfort>, set unconditionally;
 *  - disabling is done by removing the ui-comfort insert from
 *    cordis.patch.yml and restarting dsh web;
 *  - ctx.on('dispose') cleanup removes the style tag and the observers when
 *    the plugin itself is disabled in the Loader.
 */
window.__ModuleLoader__.load({
  id: 'dsh-client-ui-comfort',
  factory: () => {
    const exports = {}
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const name = 'dsh-client-ui-comfort'
    const inject = []
    const STORE_KEY = 'dsh.comfort.v1.enabled'
    const PLUGIN_ID = 'dsh-client-ui-comfort'

    /**
     * The whole comfort stylesheet. Rules are gated on html[data-dsh-comfort]
     * EXCEPT the pill styles (the pill must stay visible in the off state so
     * the user can turn comfort back on). Selectors use only stable seams:
     * data-* attributes, slot names and stock token variables — no hashed
     * CSS-module classes except the composerSeat/userRow word fragments that
     * survive recompiles (same policy as the stock theme-layer plugins).
     */
    const CSS = `
/* ---------- A. Gentle phase & composer transitions ---------- */
/* Opacity-only on the phase roots: a running transform would re-anchor
   position:fixed descendants (menus/modals) mid-flight. The rise effect
   lives on rows/cards only. */
@media (prefers-reduced-motion: no-preference) {
  html[data-dsh-comfort] [data-phase='hero'],
  html[data-dsh-comfort] [data-phase='active'] {
    animation: dsh-comfort-phase-in 0.3s var(--ds-ease-in-out, ease);
  }
  html[data-dsh-comfort] [class*='composerSeat'] {
    animation: dsh-comfort-fade-in 0.32s var(--ds-ease-in-out, ease);
  }
  html[data-dsh-comfort] [class*='userRow'],
  html[data-dsh-comfort] [data-tool] {
    animation: dsh-comfort-rise 0.28s var(--ds-ease-in-out, ease) both;
  }
}
@keyframes dsh-comfort-phase-in { from { opacity: 0; } }
@keyframes dsh-comfort-fade-in { from { opacity: 0; } }
@keyframes dsh-comfort-rise { from { opacity: 0; transform: translateY(6px); } }

/* ---------- B. Fused composer card + stats band ---------- */
/* The stats dock ([data-slot="conversation.composer.dock"]) and the composer
   card are siblings under the composer bar. When the dock has content, the
   card opens its bottom edge into the band: square bottom corners, no bottom
   border, shadow hands off — card + stats read as ONE pill instead of two
   stacked strips. The band reuses the card's own tokens
   (--dsh-composer-card-max-width / --dsw-specific-input-major / lv2 shadow),
   so light and dark themes both fuse correctly. */
html[data-dsh-comfort] [data-slot='conversation.composer.bar']:has([data-slot='conversation.composer.dock'] > *) [data-composer-card] {
  border-radius: 22px 22px 0 0;
  border-bottom: none;
  box-shadow: none;
}
html[data-dsh-comfort] [data-slot='conversation.composer.dock'] > * {
  box-sizing: border-box;
  max-width: var(--dsh-composer-card-max-width);
  padding: 6px calc(var(--dsh-composer-side-clearance) + 16px) 8px;
  border: 1px solid var(--dsw-alias-border-l2-darkmode-thin);
  border-top: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.08));
  border-radius: 0 0 22px 22px;
  background: var(--dsw-specific-input-major);
  box-shadow: var(--dsw-shadow-lv2);
  /* The stock row shows a hover tooltip bubble (truncation fallback) that
     overlays the band and covers the stats text — no hover, no bubble. */
  pointer-events: none;
}

/* ---------- Pill (kill switch) — NOT gated, must survive the off state ---------- */
[data-dsh-comfort-pill] {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 60;
  display: flex;
  gap: 6px;
}
[data-dsh-comfort-pill] button {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-l2-darkmode-thin, rgba(0, 0, 0, 0.1));
  background: color-mix(in srgb, var(--dsw-specific-input-major, #fff) 82%, transparent);
  color: var(--dsw-alias-label-tertiary, #666);
  box-shadow: var(--dsw-shadow-lv2, 0 1px 3px rgba(0, 0, 0, 0.08));
  backdrop-filter: blur(6px);
  opacity: 0.55;
  transition: opacity 0.15s var(--ds-ease-in-out, ease);
}
[data-dsh-comfort-pill]:hover button,
[data-dsh-comfort-pill] button:focus-visible {
  opacity: 1;
}
[data-dsh-comfort-pill] [data-dsh-comfort-toggle] {
  color: var(--dsw-static-neutral-400, #999);
}
[data-dsh-comfort-pill][data-on='true'] [data-dsh-comfort-toggle] {
  color: var(--dsw-static-blue-500, rgb(59, 130, 246));
}
`

    function readEnabled() {
      try {
        const raw = window.localStorage.getItem(STORE_KEY)
        return raw === null ? true : raw !== '0'
      } catch {
        return true
      }
    }

    function writeEnabled(on) {
      try {
        window.localStorage.setItem(STORE_KEY, on ? '1' : '0')
      } catch {
        /* storage unavailable — in-memory state still works for the session */
      }
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
        el.setAttribute('data-plugin-css', PLUGIN_ID + '/comfort.css')
        el.textContent = CSS
        document.head.appendChild(el)
      }
      return el
    }

    /** A tool card is "live" while it has no terminal data-state (ok/error). */
    function isLive(card) {
      if (!card.hasAttribute('data-state')) return true
      const state = card.getAttribute('data-state')
      return state !== 'ok' && state !== 'error'
    }

    /** Collapse a tool card through its own disclosure row (stock behavior). */
    function collapseCard(card) {
      const row = card.querySelector('[data-disclosure-row="true"]')
      if (row && row.getAttribute('aria-expanded') === 'true') {
        try {
          row.click()
        } catch {
          /* never let folding break the feed */
        }
      }
    }

    function apply(ctx) {
      if (window.__dshComfortApplied) return
      window.__dshComfortApplied = true

      let disposed = false
      let style = null
      let observer = null
      let lastLive = null
      let sweepTimer = 0

      const setEnabled = (on) => {
        if (on) {
          document.documentElement.setAttribute('data-dsh-comfort', '')
        } else {
          document.documentElement.removeAttribute('data-dsh-comfort')
        }
        writeEnabled(on)
      }

      /**
       * Streaming noise control: when a NEW live card appears, collapse the
       * previous live one, so the feed shows at most one expanded tool card
       * at a time instead of a growing wall of in-flight blocks. Finished
       * cards are left to the stock disclosure (which already collapses them).
       */
      const reconcile = () => {
        const live = Array.from(document.querySelectorAll('[data-tool]')).filter(isLive)
        const newest = live.length > 0 ? live[live.length - 1] : null
        if (newest && newest !== lastLive) {
          const prev = lastLive
          lastLive = newest
          if (prev && prev.isConnected && !live.includes(prev)) collapseCard(prev)
        }
        if (!newest) lastLive = null
      }

      const scheduleReconcile = () => {
        if (sweepTimer) return
        sweepTimer = window.setTimeout(() => {
          sweepTimer = 0
          if (!disposed) reconcile()
        }, 120)
      }

      const cleanup = () => {
        if (disposed) return
        disposed = true
        document.documentElement.removeAttribute('data-dsh-comfort')
        if (observer) {
          observer.disconnect()
          observer = null
        }
        if (style && style.isConnected) style.remove()
        window.__dshComfortApplied = false
      }

      const init = () => {
        if (disposed || !document.body) return

        style = ensureStyle()

        // Always-on since 2026-08-16: the user kept only the beauty pill, so
        // the comfort layer has no in-UI switch. Normalize any stale stored
        // '0' from the pill era; disabling is done by removing the
        // ui-comfort insert from cordis.patch.yml and restarting.
        writeEnabled(true)
        setEnabled(true)

        // Streaming-noise observer (debounced; body-level, React-safe).
        observer = new MutationObserver(scheduleReconcile)
        observer.observe(document.body, { childList: true, subtree: true })
        reconcile()
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
