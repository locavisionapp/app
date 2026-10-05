import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { PlateScanStep } from '../../components/scan/PlateScanStep'
import { GuidedInspection } from '../../components/scan/GuidedInspection'
import { ScanResult } from '../../components/scan/ScanResult'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Field'
import { FullscreenSpinner, Spinner } from '../../components/ui/Spinner'
import { BackButton } from '../../components/ui/BackButton'
import { VEHICLE_CATEGORIES } from '../../config/vehicleCategories'
import { api } from '../../lib/api'

const STEPS = { PLATE: 'plate', MANUAL: 'manual', INSPECTION: 'inspection', RESULT: 'result' }
const EMPTY_MANUAL = { licensePlate: '', brand: '', model: '', category: 'citadine', agencyId: '' }

/**
 * Scan flow: plate -> (confirm / correct) -> guided inspection -> result.
 * `/app/scan?vehicle=<id>` skips identification and inspects a known
 * vehicle directly (from its fleet page — works offline too when the
 * vehicle is passed in navigation state).
 */
export default function Scan() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const presetVehicleId = searchParams.get('vehicle')

  const [step, setStep] = useState(presetVehicleId ? STEPS.INSPECTION : STEPS.PLATE)
  const [vehicle, setVehicle] = useState(presetVehicleId ? location.state?.vehicle || null : null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [result, setResult] = useState(null)
  const [prefill, setPrefill] = useState({})
  const [manual, setManual] = useState(EMPTY_MANUAL)
  const [agencies, setAgencies] = useState([])
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    api.listAgencies().then(setAgencies).catch(() => setAgencies([]))
  }, [])

  useEffect(() => {
    if (!presetVehicleId || vehicle?.id === presetVehicleId) return
    api
      .getVehicle(presetVehicleId)
      .then(setVehicle)
      .catch((e) => setLoadError(e.message))
  }, [presetVehicleId, vehicle?.id])

  async function createVehicleAndContinue(data) {
    setCreating(true)
    setCreateError(null)
    try {
      const v = await api.createVehicle(data)
      setVehicle(v)
      setStep(STEPS.INSPECTION)
    } catch (e) {
      setCreateError(e.message)
    } finally {
      setCreating(false)
    }
  }

  function handleIdentified(data) {
    if (data.manual) {
      const p = data.prefill || {}
      setPrefill(p)
      setManual({
        ...EMPTY_MANUAL,
        licensePlate: p.licensePlate || '',
        brand: p.brand || '',
        model: p.model || '',
        category: VEHICLE_CATEGORIES.some((c) => c.id === p.category) ? p.category : 'citadine',
      })
      setCreateError(null)
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
        {creating ? (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
            <Spinner size={28} />
            <p>Enregistrement du véhicule…</p>
          </div>
        ) : (
          <>
            {createError && <div className="rounded-xl bg-status-badBg px-4 py-3 text-sm text-status-bad">{createError}</div>}
            <PlateScanStep onIdentified={handleIdentified} />
          </>
        )}
      </div>
    )
  }

  if (step === STEPS.MANUAL) {
    const plateValid = manual.licensePlate.trim().length >= 2 && manual.licensePlate.length <= 20
    return (
      <div className="mx-auto max-w-md space-y-4 p-4">
        <BackButton label="Retour" onClick={() => setStep(STEPS.PLATE)} />
        <h1 className="text-xl font-bold text-slate-900">{prefill.brand ? 'Vérifier le véhicule' : 'Saisie manuelle'}</h1>
        <Card
          as="form"
          className="space-y-4 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            // Keep the spec sheet from the scan when the user only corrected a field.
            createVehicleAndContinue({ ...prefill, ...manual, licensePlate: manual.licensePlate.trim() })
          }}
        >
          <Field label="Plaque d'immatriculation">
            <Input
              required
              maxLength={20}
              autoCapitalize="characters"
              value={manual.licensePlate}
              onChange={(e) => setManual({ ...manual, licensePlate: e.target.value.toUpperCase() })}
              placeholder="AB-123-CD"
            />
          </Field>
          <Field label="Marque">
            <Input maxLength={60} value={manual.brand} onChange={(e) => setManual({ ...manual, brand: e.target.value })} />
          </Field>
          <Field label="Modèle">
            <Input maxLength={60} value={manual.model} onChange={(e) => setManual({ ...manual, model: e.target.value })} />
          </Field>
          <Field label="Type de véhicule">
            <Select value={manual.category} onChange={(e) => setManual({ ...manual, category: e.target.value })}>
              {VEHICLE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
          </Field>
          {agencies.length > 0 && (
            <Field label="Agence (optionnel)">
              <Select value={manual.agencyId} onChange={(e) => setManual({ ...manual, agencyId: e.target.value })}>
                <option value="">Aucune agence</option>
                {agencies.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.city})</option>
                ))}
              </Select>
            </Field>
          )}
          {createError && <div className="rounded-xl bg-status-badBg px-4 py-3 text-sm text-status-bad">{createError}</div>}
          <Button type="submit" className="w-full" disabled={creating || !plateValid}>
            {creating ? <Spinner size={18} className="text-white" /> : 'Continuer'}
          </Button>
        </Card>
      </div>
    )
  }

  if (step === STEPS.INSPECTION) {
    if (loadError) {
      return (
        <div className="mx-auto max-w-md space-y-4 p-4">
          <BackButton to="/app/fleet" label="Retour à la flotte" />
          <Card className="p-6 text-center text-sm text-status-bad">{loadError}</Card>
        </div>
      )
    }
    if (!vehicle) return <FullscreenSpinner label="Chargement du véhicule…" />
    return (
      <div className="mx-auto max-w-md space-y-4 p-4">
        <BackButton
          label="Annuler l'inspection"
          onClick={() => {
            if (window.confirm("Annuler l'inspection en cours ? Les photos déjà prises seront perdues.")) navigate('/app/fleet')
          }}
        />
        <h1 className="text-xl font-bold text-slate-900">{vehicle.brand} {vehicle.model} · {vehicle.licensePlate}</h1>
        <GuidedInspection
          vehicleId={vehicle.id}
          vehicleLabel={`${vehicle.brand} ${vehicle.model} · ${vehicle.licensePlate}`.trim()}
          categoryId={vehicle.category}
          onExit={() => navigate('/app/fleet')}
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
