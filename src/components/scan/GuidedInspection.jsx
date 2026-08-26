import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, ChevronRight, AlertTriangle, Gauge, Check } from 'lucide-react'
import { CameraView } from './CameraView'
import { Button } from '../ui/Button'
import { Stepper } from '../ui/Stepper'
import { Spinner } from '../ui/Spinner'
import { Field, Input } from '../ui/Field'
import { getCategorySteps } from '../../config/vehicleCategories'
import { api } from '../../lib/api'

/**
 * Guided walkthrough: captures one photo per step (adapted to the vehicle
 * type). Capture advances immediately — framing feedback runs in the
 * background so the flow never blocks waiting on an AI call — then asks for
 * the current mileage before submitting the batch for damage analysis.
 */
export function GuidedInspection({ vehicleId, categoryId, onComplete }) {
  const steps = getCategorySteps(categoryId)
  const camRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [captures, setCaptures] = useState([])
  const [warning, setWarning] = useState(null)
  const [phase, setPhase] = useState('capture') // capture | mileage | submitting
  const [mileage, setMileage] = useState('')
  const [error, setError] = useState(null)

  const step = steps[index]

  function handleCapture() {
    const image = camRef.current?.capture()
    if (!image) return
    setError(null)

    // Fire-and-forget: never block moving on to the next photo. If the shot
    // turns out to be poorly framed, we just surface a quick, dismissable
    // heads-up instead of making the user wait for an AI round-trip.
    api
      .validateCaptureStep(vehicleId, { pointName: step.label, image })
      .then((check) => {
        if (check.valid === false) {
          setWarning(`${step.label} : ${check.instruction || check.reason || 'photo peut-être ratée, vous pourrez la reprendre plus tard.'}`)
          setTimeout(() => setWarning(null), 4000)
        }
      })
      .catch(() => {})

    const next = [...captures, { stepId: step.id, label: step.label, image }]
    setCaptures(next)
    if (index + 1 >= steps.length) {
      setPhase('mileage')
    } else {
      setIndex(index + 1)
    }
  }

  async function handleSubmit() {
    setPhase('submitting')
    setError(null)
    try {
      const [result] = await Promise.all([
        api.submitInspection(vehicleId, { photos: captures }),
        mileage ? api.updateVehicleMileage(vehicleId, Number(mileage)).catch(() => {}) : Promise.resolve(),
      ])
      onComplete(result)
    } catch (e) {
      setError(e.message || "L'analyse IA a échoué. Réessayez.")
      setPhase('mileage')
    }
  }

  if (phase === 'submitting') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
        <Spinner size={32} />
        <p>Analyse IA de l'ensemble des photos…</p>
      </div>
    )
  }

  if (phase === 'mileage') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 rounded-xl bg-status-goodBg px-4 py-3 text-sm font-medium text-status-good">
          <Check size={18} /> {captures.length} photos capturées
        </div>
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Gauge size={16} /> Kilométrage actuel
          </p>
          <Field label="km (optionnel)">
            <Input type="number" min="0" inputMode="numeric" autoFocus value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="Ex : 45320" />
          </Field>
        </div>
        {error && <div className="rounded-xl bg-status-badBg px-4 py-3 text-sm text-status-bad">{error}</div>}
        <Button size="lg" className="w-full" onClick={handleSubmit}>
          Lancer l'analyse IA <ChevronRight size={18} />
        </Button>
      </div>
    )
  }

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
        {index + 1 >= steps.length ? 'Dernière photo' : 'Photo suivante'}
        <ChevronRight size={18} />
      </Button>
    </div>
  )
}
