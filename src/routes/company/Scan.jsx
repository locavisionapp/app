import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlateScanStep } from '../../components/scan/PlateScanStep'
import { GuidedInspection } from '../../components/scan/GuidedInspection'
import { ScanResult } from '../../components/scan/ScanResult'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { Spinner } from '../../components/ui/Spinner'
import { BackButton } from '../../components/ui/BackButton'
import { VEHICLE_CATEGORIES } from '../../config/vehicleCategories'
import { api } from '../../lib/api'

const STEPS = { PLATE: 'plate', MANUAL: 'manual', INSPECTION: 'inspection', RESULT: 'result' }

export default function Scan() {
  const navigate = useNavigate()
  const [step, setStep] = useState(STEPS.PLATE)
  const [vehicle, setVehicle] = useState(null)
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState(null)
  const [manual, setManual] = useState({ licensePlate: '', brand: '', model: '', category: 'citadine', agencyId: '' })
  const [agencies, setAgencies] = useState([])

  useEffect(() => {
    api.listAgencies().then(setAgencies).catch(() => setAgencies([]))
  }, [])

  async function createVehicleAndContinue(data) {
    setCreating(true)
    try {
      const v = await api.createVehicle(data)
      setVehicle(v)
      setStep(STEPS.INSPECTION)
    } finally {
      setCreating(false)
    }
  }

  function handleIdentified(data) {
    if (data.manual) {
      setStep(STEPS.MANUAL)
      return
    }
    createVehicleAndContinue(data)
  }

  if (step === STEPS.PLATE) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-4">
        <BackButton to="/app/fleet" label="Retour à la flotte" />
        <h1 className="text-xl font-bold text-slate-900">Scanner un véhicule</h1>
        <PlateScanStep onIdentified={handleIdentified} />
      </div>
    )
  }

  if (step === STEPS.MANUAL) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-4">
        <BackButton label="Retour" onClick={() => setStep(STEPS.PLATE)} />
        <h1 className="text-xl font-bold text-slate-900">Saisie manuelle</h1>
        <Card className="space-y-4 p-4">
          <Field label="Plaque d'immatriculation">
            <Input value={manual.licensePlate} onChange={(e) => setManual({ ...manual, licensePlate: e.target.value.toUpperCase() })} placeholder="AB-123-CD" />
          </Field>
          <Field label="Marque">
            <Input value={manual.brand} onChange={(e) => setManual({ ...manual, brand: e.target.value })} />
          </Field>
          <Field label="Modèle">
            <Input value={manual.model} onChange={(e) => setManual({ ...manual, model: e.target.value })} />
          </Field>
          <Field label="Type de véhicule">
            <select
              className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
              value={manual.category}
              onChange={(e) => setManual({ ...manual, category: e.target.value })}
            >
              {VEHICLE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </Field>
          {agencies.length > 0 && (
            <Field label="Agence (optionnel)">
              <select
                className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                value={manual.agencyId}
                onChange={(e) => setManual({ ...manual, agencyId: e.target.value })}
              >
                <option value="">Aucune agence</option>
                {agencies.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.city})</option>
                ))}
              </select>
            </Field>
          )}
          <Button className="w-full" disabled={creating || !manual.licensePlate} onClick={() => createVehicleAndContinue(manual)}>
            {creating ? <Spinner size={18} className="text-white" /> : 'Continuer'}
          </Button>
        </Card>
      </div>
    )
  }

  if (step === STEPS.INSPECTION) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-4">
        <BackButton
          label="Annuler le scan"
          onClick={() => {
            if (window.confirm('Annuler le scan en cours ? Les photos déjà prises seront perdues.')) navigate('/app/fleet')
          }}
        />
        <h1 className="text-xl font-bold text-slate-900">{vehicle.brand} {vehicle.model} · {vehicle.licensePlate}</h1>
        <GuidedInspection
          vehicleId={vehicle.id}
          categoryId={vehicle.category}
          onComplete={(r) => {
            setResult(r)
            setStep(STEPS.RESULT)
          }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-bold text-slate-900">Résultat de l'inspection</h1>
      <ScanResult result={result} vehicleId={vehicle.id} />
    </div>
  )
}
