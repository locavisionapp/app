import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, ChevronRight, AlertTriangle, Gauge, Check, CloudOff, RotateCcw, Undo2, CloudUpload } from 'lucide-react'
import { CameraView } from './CameraView'
import { Button } from '../ui/Button'
import { Stepper } from '../ui/Stepper'
import { Spinner } from '../ui/Spinner'
import { Field, Input } from '../ui/Field'
import { getCategorySteps } from '../../config/vehicleCategories'
import { newInspectionId, uploadStepPhoto, submit, retry, discard, subscribe } from '../../lib/inspectionQueue'
import { useToast } from '../ui/Toast'

const MAX_MILEAGE = 2_000_000

/**
 * Guided walkthrough: one photo per step (adapted to the vehicle type).
 * Each photo is uploaded in the background as soon as it's taken (with an
 * AI framing check on the same upload), so capture never waits on the
 * network. A review screen lets the inspector retake any shot, then the
 * inspection goes through the offline-safe queue (see lib/inspectionQueue):
 * with no network it is kept on the device and sent automatically later.
 */
export function GuidedInspection({ vehicleId, vehicleLabel, categoryId, onComplete, onExit }) {
  const toast = useToast()
  const steps = getCategorySteps(categoryId)
  const camRef = useRef(null)
  const inspectionId = useRef(newInspectionId()).current
  const versionRef = useRef(0)
  const photosRef = useRef({}) // stepId -> { image, v }
  const uploadedRef = useRef({}) // stepId -> v confirmed stored server-side

  const [index, setIndex] = useState(0)
  const [retakeStepId, setRetakeStepId] = useState(null)
  const [photos, setPhotos] = useState({})
  const [checks, setChecks] = useState({}) // stepId -> { valid, instruction }
  const [uploaded, setUploaded] = useState({})
  const [warning, setWarning] = useState(null)
  const [phase, setPhase] = useState('capture') // capture | review | sending | queued | failed
  const [mileage, setMileage] = useState('')
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)

  const capturedCount = Object.keys(photos).length
  const currentStep = retakeStepId ? steps.find((s) => s.id === retakeStepId) : steps[index]

  // Warn before closing the tab with photos that haven't been handed to the queue yet.
  useEffect(() => {
    if (capturedCount === 0 || (phase !== 'capture' && phase !== 'review')) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [capturedCount, phase])

  // A queued inspection may be delivered by the background sync while this
  // screen is still open: show its result.
  useEffect(() => {
    if (phase !== 'queued') return
    return subscribe((event) => {
      if (event.type === 'delivered' && event.id === inspectionId) onComplete(event.result)
    })
  }, [phase, inspectionId, onComplete])

  function handleCapture() {
    const step = currentStep
    const image = camRef.current?.capture()
    if (!image) {
      toast.error("La caméra n'est pas encore prête.")
      return
    }
    const v = ++versionRef.current
    photosRef.current = { ...photosRef.current, [step.id]: { image, v } }
    setPhotos(photosRef.current)
    setChecks((c) => ({ ...c, [step.id]: undefined }))

    // Background upload + framing check: never blocks moving on to the next
    // photo. A failure here is fine — the queue re-uploads at submit time.
    uploadStepPhoto({ vehicleId, inspectionId, stepId: step.id, image, validate: true, pointName: step.label })
      .then((res) => {
        if (photosRef.current[step.id]?.v !== v) return // retaken since
        uploadedRef.current = { ...uploadedRef.current, [step.id]: v }
        setUploaded(uploadedRef.current)
        if (res?.valid === false) {
          setChecks((c) => ({ ...c, [step.id]: { valid: false, instruction: res.instruction || res.reason } }))
          setWarning(`${step.label} : ${res.instruction || res.reason || 'photo peut-être ratée.'} Vous pourrez la reprendre avant l'envoi.`)
          setTimeout(() => setWarning(null), 5000)
        }
      })
      .catch(() => {})

    if (retakeStepId) {
      setRetakeStepId(null)
      setPhase('review')
    } else if (index + 1 >= steps.length) {
      setPhase('review')
    } else {
      setIndex(index + 1)
    }
  }

  function retake(stepId) {
    setRetakeStepId(stepId)
    setPhase('capture')
  }

  function goBackOneStep() {
    if (index > 0) setIndex(index - 1)
  }

  async function handleSubmit() {
    const km = mileage === '' ? null : Number(mileage)
    if (km != null && (!Number.isFinite(km) || km < 0 || km > MAX_MILEAGE)) {
      setError('Kilométrage invalide.')
      return
    }
    setError(null)
    setPhase('sending')
    setProgress({ phase: 'upload', done: 0, total: steps.length })
    const record = {
      id: inspectionId,
      vehicleId,
      vehicleLabel,
      steps: steps.map((s) => ({ stepId: s.id, label: s.label })),
      photos: photosRef.current,
      uploaded: { ...uploadedRef.current },
      mileage: km,
    }
    try {
      const result = await submit(record, setProgress)
      onComplete(result)
    } catch (e) {
      if (e.isRetryable === false) {
        setError(e.message)
        setPhase('failed')
      } else {
        setError(e.message)
        setPhase('queued')
      }
    }
  }

  async function retryNow() {
    setPhase('sending')
    setProgress(null)
    try {
      const result = await retry(inspectionId)
      if (result) onComplete(result)
    } catch (e) {
      setError(e.message)
      setPhase(e.isRetryable === false ? 'failed' : 'queued')
    }
  }

  async function abandon() {
    if (!window.confirm('Abandonner cette inspection ? Les photos seront supprimées de cet appareil.')) return
    await discard(inspectionId).catch(() => {})
    onExit()
  }

  if (phase === 'sending') {
    const uploading = progress?.phase === 'upload'
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-slate-500">
        <Spinner size={32} />
        {uploading ? (
          <p>Envoi des photos… {progress.done}/{progress.total}</p>
        ) : (
          <>
            <p>Analyse IA de l'ensemble des photos…</p>
            <p className="text-xs text-slate-400">Cela peut prendre jusqu'à une minute.</p>
          </>
        )}
      </div>
    )
  }

  if (phase === 'queued') {
    return (
      <div className="space-y-4">
        <div className="space-y-2 rounded-2xl border border-status-warn bg-status-warnBg p-5 text-center">
          <CloudOff className="mx-auto text-status-warn" size={32} />
          <p className="font-semibold text-slate-900">Inspection enregistrée sur cet appareil</p>
          <p className="text-sm text-slate-600">
            Elle n'a pas pu être envoyée ({error || 'réseau indisponible'}). Rien n'est perdu : elle sera envoyée et analysée
            automatiquement dès le retour du réseau. Vous pouvez continuer à travailler.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onExit}>
            Retour à la flotte
          </Button>
          <Button className="flex-1" onClick={retryNow}>
            <RotateCcw size={18} /> Réessayer
          </Button>
        </div>
      </div>
    )
  }

  if (phase === 'failed') {
    return (
      <div className="space-y-4">
        <div className="space-y-2 rounded-2xl border border-status-bad bg-status-badBg p-5 text-center">
          <AlertTriangle className="mx-auto text-status-bad" size={32} />
          <p className="font-semibold text-slate-900">L'inspection a été refusée</p>
          <p className="text-sm text-slate-600">{error}</p>
          <p className="text-xs text-slate-500">Les photos restent sur cet appareil tant que vous ne l'abandonnez pas.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={abandon}>
            Abandonner
          </Button>
          <Button className="flex-1" onClick={retryNow}>
            <RotateCcw size={18} /> Réessayer
          </Button>
        </div>
      </div>
    )
  }

  if (phase === 'review') {
    const flagged = steps.filter((s) => checks[s.id]?.valid === false)
    const pendingUploads = steps.filter((s) => uploaded[s.id] !== photos[s.id]?.v).length
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 rounded-xl bg-status-goodBg px-4 py-3 text-sm font-medium text-status-good">
          <Check size={18} /> {capturedCount} photos capturées
        </div>

        {flagged.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl bg-status-warnBg px-4 py-3 text-sm text-status-warn">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>
              {flagged.length} photo(s) peut-être mal cadrée(s). Touchez une photo pour la reprendre — ou envoyez quand même.
            </span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {steps.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => retake(s.id)}
              className="group relative aspect-square overflow-hidden rounded-xl bg-slate-200 text-left"
              aria-label={`Reprendre la photo ${s.label}`}
            >
              {photos[s.id] && <img src={photos[s.id].image} alt={s.label} className="h-full w-full object-cover" />}
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-[11px] font-medium text-white">
                {s.label}
              </span>
              {checks[s.id]?.valid === false && (
                <span className="absolute right-1 top-1 rounded-full bg-status-warn p-1 text-white">
                  <AlertTriangle size={12} />
                </span>
              )}
              <span className="absolute inset-0 hidden items-center justify-center bg-black/40 text-white group-hover:flex">
                <RotateCcw size={20} />
              </span>
            </button>
          ))}
        </div>

        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <CloudUpload size={14} />
          {pendingUploads === 0 ? 'Toutes les photos sont déjà envoyées.' : `${pendingUploads} photo(s) seront envoyées à la validation.`}
        </p>

        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Gauge size={16} /> Kilométrage actuel
          </p>
          <Field label="km (optionnel)">
            <Input type="number" min="0" max={MAX_MILEAGE} inputMode="numeric" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="Ex : 45320" />
          </Field>
        </div>
        {error && <div className="rounded-xl bg-status-badBg px-4 py-3 text-sm text-status-bad">{error}</div>}
        <Button size="lg" className="w-full" onClick={handleSubmit}>
          Lancer l'analyse IA <ChevronRight size={18} />
        </Button>
      </div>
    )
  }

  const stepPosition = retakeStepId ? steps.findIndex((s) => s.id === retakeStepId) : index
  return (
    <div className="space-y-4">
      <Stepper steps={steps} currentIndex={stepPosition} />
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{retakeStepId ? 'Nouvelle prise' : `Étape ${index + 1} / ${steps.length}`}</span>
        <span className="font-medium text-slate-700">{currentStep.label}</span>
      </div>

      <CameraView
        ref={camRef}
        overlay={
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <p className="text-center text-sm font-medium text-white">{currentStep.instruction}</p>
          </div>
        }
      />

      <AnimatePresence>
        {warning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2 rounded-xl bg-status-warnBg px-4 py-3 text-sm text-status-warn"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{warning}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Button size="lg" className="w-full" onClick={handleCapture}>
        <Camera size={20} />
        {retakeStepId ? 'Remplacer la photo' : index + 1 >= steps.length ? 'Dernière photo' : 'Photo suivante'}
        <ChevronRight size={18} />
      </Button>

      {retakeStepId ? (
        <button type="button" onClick={() => { setRetakeStepId(null); setPhase('review') }} className="mx-auto flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-700">
          <Undo2 size={14} /> Garder la photo actuelle
        </button>
      ) : (
        index > 0 && (
          <button type="button" onClick={goBackOneStep} className="mx-auto flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-700">
            <Undo2 size={14} /> Reprendre la photo précédente
          </button>
        )
      )}
    </div>
  )
}
