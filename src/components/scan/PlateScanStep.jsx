import { useRef, useState } from 'react'
import { ScanLine, Check, RotateCcw, Pencil, CloudOff } from 'lucide-react'
import { CameraView } from './CameraView'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { api } from '../../lib/api'
import { PLATE_PHOTO } from '../../lib/image'
import { useOnline } from '../../lib/useOnline'

/**
 * Scan step 1: photo of the plate -> vehicle identification (OCR + spec
 * sheet) via the API. The user then confirms the identified vehicle, or
 * corrects it by hand.
 */
export function PlateScanStep({ onIdentified }) {
  const camRef = useRef(null)
  const online = useOnline()
  const [captured, setCaptured] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  async function handleCapture() {
    const image = camRef.current?.capture(PLATE_PHOTO)
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
    const identified = result && !result.error
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

        {error && <div className="rounded-xl bg-status-badBg px-4 py-3 text-sm text-status-bad">{error}</div>}
        {result?.error && (
          <div className="rounded-xl bg-status-warnBg px-4 py-3 text-sm text-status-warn">
            Plaque non reconnue{result.licensePlate ? ` (lu : ${result.licensePlate})` : ''}. Reprenez la photo de plus près ou saisissez le véhicule à la main.
          </div>
        )}

        {identified && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Véhicule identifié</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{result.brand} {result.model}</p>
            <p className="text-sm text-slate-500">{result.licensePlate} · {result.year || '—'} · {result.fuel || '—'}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={retry} disabled={loading}>
            <RotateCcw size={18} /> Reprendre
          </Button>
          {identified && (
            <Button className="flex-1" onClick={() => onIdentified(result)}>
              <Check size={18} /> Confirmer
            </Button>
          )}
          {!loading && !identified && (
            <Button className="flex-1" onClick={() => onIdentified({ manual: true, prefill: { licensePlate: result?.licensePlate || '' } })}>
              Saisir manuellement
            </Button>
          )}
        </div>
        {identified && (
          <button
            type="button"
            onClick={() => onIdentified({ manual: true, prefill: result })}
            className="mx-auto flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-700"
          >
            <Pencil size={14} /> Corriger les informations
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!online && (
        <div className="flex items-start gap-2 rounded-xl bg-status-warnBg px-4 py-3 text-sm text-status-warn">
          <CloudOff size={18} className="mt-0.5 shrink-0" />
          <span>
            Hors ligne : l'identification de plaque a besoin du réseau. Pour un véhicule déjà enregistré, lancez l'inspection
            depuis sa fiche dans « Ma flotte » — elle sera envoyée au retour du réseau.
          </span>
        </div>
      )}
      <CameraView
        ref={camRef}
        overlay={
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-64 rounded-lg border-2 border-white/80" />
          </div>
        }
      />
      <p className="text-center text-sm text-slate-500">Cadrez la plaque d'immatriculation dans le rectangle</p>
      <Button size="lg" className="w-full" onClick={handleCapture} disabled={!online}>
        <ScanLine size={20} /> Scanner la plaque
      </Button>
      <button
        type="button"
        onClick={() => onIdentified({ manual: true, prefill: {} })}
        className="mx-auto flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-700"
      >
        <Pencil size={14} /> Saisir la plaque à la main
      </button>
    </div>
  )
}
