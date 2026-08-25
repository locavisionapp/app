import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, ChevronRight, AlertCircle } from 'lucide-react'
import { CameraView } from './CameraView'
import { Button } from '../ui/Button'
import { Stepper } from '../ui/Stepper'
import { Spinner } from '../ui/Spinner'
import { getCategorySteps } from '../../config/vehicleCategories'
import { api } from '../../lib/api'

/**
 * Parcours guidé : capture une photo par étape (adaptée au type de véhicule),
 * avec validation IA immédiate du cadrage, puis envoie le lot complet pour
 * l'analyse globale des dégâts.
 */
export function GuidedInspection({ vehicleId, categoryId, onComplete }) {
  const steps = getCategorySteps(categoryId)
  const camRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [captures, setCaptures] = useState([])
  const [checking, setChecking] = useState(false)
  const [hint, setHint] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const step = steps[index]
  const done = index >= steps.length

  async function handleCapture() {
    const image = camRef.current?.capture()
    if (!image) return
    setChecking(true)
    setHint(null)
    setError(null)
    try {
      const check = await api.validateCaptureStep(vehicleId, { pointName: step.label, image })
      if (check.valid === false) {
        setHint(check.instruction || check.reason || 'Reprenez la photo.')
        setChecking(false)
        return
      }
    } catch (e) {
      // La validation en direct est un confort : si elle échoue, on n'empêche pas de continuer.
    }
    setChecking(false)
    const next = [...captures, { stepId: step.id, label: step.label, image }]
    setCaptures(next)
    if (index + 1 >= steps.length) {
      submit(next)
    } else {
      setIndex(index + 1)
    }
  }

  async function submit(finalCaptures) {
    setSubmitting(true)
    setError(null)
    try {
      const result = await api.submitInspection(vehicleId, { photos: finalCaptures })
      onComplete(result)
    } catch (e) {
      setError(e.message || "L'analyse IA a échoué. Réessayez.")
      setSubmitting(false)
    }
  }

  if (submitting) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
        <Spinner size={32} />
        <p>Analyse IA de l'ensemble des photos…</p>
      </div>
    )
  }

  if (done) return null

  return (
    <div className="space-y-4">
      <Stepper steps={steps} currentIndex={index} />
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Étape {index + 1} / {steps.length}</span>
        <span className="font-medium text-slate-700">{step.label}</span>
      </div>

      <CameraView
        ref={camRef}
        overlay={
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <p className="text-center text-sm font-medium text-white">{step.instruction}</p>
          </div>
        }
      />

      <AnimatePresence>
        {hint && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2 rounded-xl bg-status-warnBg px-4 py-3 text-sm text-status-warn"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{hint}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <div className="rounded-xl bg-status-badBg px-4 py-3 text-sm text-status-bad">{error}</div>}

      <Button size="lg" className="w-full" onClick={handleCapture} disabled={checking}>
        {checking ? <Spinner size={18} className="text-white" /> : <Camera size={20} />}
        {index + 1 >= steps.length ? "Terminer l'inspection" : 'Photo suivante'}
        {!checking && <ChevronRight size={18} />}
      </Button>
    </div>
  )
}
