import { useRef, useState } from 'react'
import { ScanLine, Check, RotateCcw } from 'lucide-react'
import { CameraView } from './CameraView'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { api } from '../../lib/api'

/**
 * Étape 1 du scan : photo de la plaque -> identification du véhicule
 * (OCR + fiche technique) via l'API. L'utilisateur confirme ensuite la fiche.
 */
export function PlateScanStep({ onIdentified }) {
  const camRef = useRef(null)
  const [captured, setCaptured] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  async function handleCapture() {
    const image = camRef.current?.capture()
    if (!image) return
    setCaptured(image)
    setLoading(true)
    setError(null)
    try {
      const data = await api.scanPlate(image)
      setResult(data)
    } catch (e) {
      setError(e.message || "Échec de l'identification de la plaque.")
    } finally {
      setLoading(false)
    }
  }

  function retry() {
    setCaptured(null)
    setResult(null)
    setError(null)
  }

  if (captured) {
    return (
      <div className="space-y-4">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-slate-900">
          <img src={captured} alt="Plaque capturée" className="h-full w-full object-cover" />
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-white">
              <Spinner size={28} className="text-white" />
              <p className="text-sm">Identification en cours…</p>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-status-badBg px-4 py-3 text-sm text-status-bad">{error}</div>
        )}

        {result && !result.error && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Véhicule identifié</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{result.brand} {result.model}</p>
            <p className="text-sm text-slate-500">{result.licensePlate} · {result.year || '—'} · {result.fuel || '—'}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={retry}>
            <RotateCcw size={18} /> Reprendre
          </Button>
          {result && !result.error && (
            <Button className="flex-1" onClick={() => onIdentified(result)}>
              <Check size={18} /> Confirmer
            </Button>
          )}
          {result?.error && (
            <Button className="flex-1" onClick={() => onIdentified({ manual: true })}>
              Saisir manuellement
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <CameraView
        ref={camRef}
        overlay={
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-64 rounded-lg border-2 border-white/80" />
          </div>
        }
      />
      <p className="text-center text-sm text-slate-500">Cadrez la plaque d'immatriculation dans le rectangle</p>
      <Button size="lg" className="w-full" onClick={handleCapture}>
        <ScanLine size={20} /> Scanner la plaque
      </Button>
    </div>
  )
}
