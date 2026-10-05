import { useEffect, useRef, useState } from 'react'
import { Circle, Square, Info } from 'lucide-react'
import { CameraView } from './CameraView'
import { Button } from '../ui/Button'
import { TOUR_PHOTO, thumbDistance } from '../../lib/image'

const PROBE_EVERY_MS = 250 // sharpness/motion check of the live feed
const KEEP_EVERY_MS = 1500 // at most one kept view per window: the sharpest of it
const MIN_SHARPNESS = 12 // below = motion blur / out of focus / dark: never kept
const MIN_MOTION = 4 // mean pixel change vs last kept view: below = phone didn't move
export const MAX_TOUR_FRAMES = 45
const MIN_TOUR_FRAMES = 8

/**
 * Quick walk-around capture: the inspector films while walking around the
 * vehicle; every ~1.5s the sharpest frame of that window is kept, unless the
 * phone hasn't moved since the last kept one (no duplicates) or every frame
 * was blurry. ~25-40 overlapping views in about a minute, analyzed entirely
 * on the phone (no AI call, no cost) before anything is uploaded.
 */
export function WalkaroundCapture({ onFrame, onDone, initialCount = 0 }) {
  const camRef = useRef(null)
  const [recording, setRecording] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [elapsed, setElapsed] = useState(0)
  const [hint, setHint] = useState(null)
  const countRef = useRef(initialCount)
  const stateRef = useRef({ best: null, lastThumb: null, stillStreak: 0, blurStreak: 0 })
  // Latest callbacks without restarting the capture timers on each render.
  const callbacks = useRef({ onFrame, onDone })
  callbacks.current = { onFrame, onDone }

  useEffect(() => {
    if (!recording) return
    const startedAt = Date.now()
    const state = stateRef.current
    state.best = null

    const probeTimer = setInterval(() => {
      const probe = camRef.current?.probe()
      if (!probe || probe.sharpness < MIN_SHARPNESS) return
      if (!state.best || probe.sharpness > state.best.sharpness) {
        const image = camRef.current.capture(TOUR_PHOTO)
        if (image) state.best = { image, sharpness: probe.sharpness, thumb: probe.thumb }
      }
    }, PROBE_EVERY_MS)

    const keepTimer = setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAt) / 1000))
      const best = state.best
      state.best = null
      if (!best) {
        state.blurStreak += 1
        if (state.blurStreak >= 2) setHint('Image floue ou trop sombre : ralentissez et stabilisez le téléphone.')
        return
      }
      state.blurStreak = 0
      if (thumbDistance(best.thumb, state.lastThumb) < MIN_MOTION) {
        state.stillStreak += 1
        if (state.stillStreak >= 3) setHint('Avancez autour du véhicule, pas à pas.')
        return
      }
      state.stillStreak = 0
      state.lastThumb = best.thumb
      setHint(null)
      countRef.current += 1
      setCount(countRef.current)
      callbacks.current.onFrame(best.image)
      if (countRef.current >= MAX_TOUR_FRAMES) {
        setRecording(false)
        callbacks.current.onDone()
      }
    }, KEEP_EVERY_MS)

    return () => {
      clearInterval(probeTimer)
      clearInterval(keepTimer)
    }
  }, [recording])

  function stop() {
    setRecording(false)
    if (countRef.current < MIN_TOUR_FRAMES) {
      setHint(`Seulement ${countRef.current} vue(s) : continuez le tour pour couvrir tout le véhicule (${MIN_TOUR_FRAMES} minimum).`)
      return
    }
    onDone()
  }

  const minutes = Math.floor(elapsed / 60)
  const seconds = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="space-y-4">
      <CameraView
        ref={camRef}
        overlay={
          <>
            {recording && (
              <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                {minutes}:{seconds} · {count} vue(s)
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <p className="text-center text-sm font-medium text-white">
                {recording
                  ? 'Faites le tour complet du véhicule, lentement, à environ 1,5 m, en cadrant toute la hauteur.'
                  : 'Placez-vous face à l’avant du véhicule, à environ 1,5 m.'}
              </p>
            </div>
          </>
        }
      />

      {hint && (
        <div className="flex items-start gap-2 rounded-xl bg-status-warnBg px-4 py-3 text-sm text-status-warn">
          <Info size={18} className="mt-0.5 shrink-0" />
          <span>{hint}</span>
        </div>
      )}

      {recording ? (
        <Button size="lg" variant="danger" className="w-full" onClick={stop}>
          <Square size={18} /> Terminer le tour ({count} vues)
        </Button>
      ) : (
        <Button size="lg" className="w-full" onClick={() => { setHint(null); setRecording(true) }}>
          <Circle size={18} /> {count > 0 ? 'Reprendre le tour' : 'Démarrer le tour'}
        </Button>
      )}
      {!recording && count >= MIN_TOUR_FRAMES && (
        <button type="button" onClick={onDone} className="mx-auto block text-sm text-slate-500 hover:text-brand-700">
          Passer à la vérification ({count} vues)
        </button>
      )}
    </div>
  )
}
