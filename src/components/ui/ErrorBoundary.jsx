import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

const RELOAD_FLAG = 'locavision.chunkReloadAt'

// After a deploy, a tab (or the PWA's cached shell) still running the
// previous version asks for JS chunks that no longer exist. That's not a
// real bug: one reload picks up the new version.
export function isStaleChunkError(error) {
  const msg = String(error?.message || error || '')
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Unable to preload CSS|text\/html.*MIME type/i.test(msg)
}

/** Reloads once per minute at most, so a genuinely broken deploy can't loop forever. */
export function reloadForNewVersion() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0)
    if (Date.now() - last < 60000) return false
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()))
  } catch {
    // storage unavailable: still reload once
  }
  window.location.reload()
  return true
}

/**
 * Last-resort catch for render errors: never leave the user on a blank page.
 * Stale-version errors reload silently; anything else shows a recovery screen.
 */
export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    if (isStaleChunkError(error) && reloadForNewVersion()) return
    console.error('[app] render error', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto text-status-warn" size={32} />
          <p className="font-semibold text-slate-900">Un problème d'affichage est survenu</p>
          <p className="text-sm text-slate-500">Rechargez la page. Vos inspections en attente sont conservées sur l'appareil.</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <RotateCcw size={16} /> Recharger
          </button>
        </div>
      </div>
    )
  }
}
