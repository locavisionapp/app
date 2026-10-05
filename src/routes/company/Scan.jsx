import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Pencil, Video, ListChecks, ChevronRight } from 'lucide-react'
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
import { useToast } from '../../components/ui/Toast'
import { formatPlateInput, isPlateComplete } from '../../lib/plate'

const MODE_KEY = 'locavision.captureMode'

function readMode() {
  try {
    return localStorage.getItem(MODE_KEY) === 'guided' ? 'guided' : 'quick'
  } catch {
    return 'quick'
  }
}

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
  const toast = useToast()
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
  const [manualStage, setManualStage] = useState('plate') // plate | confirm | details
  const [captureMode, setCaptureMode] = useState(null) // null = not chosen yet | 'quick' | 'guided'
  const lastMode = readMode()
  const [lookup, setLookup] = useState(null)
  const [lookingUp, setLookingUp] = useState(false)

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

  function fillManual(p) {
    setManual({
      ...EMPTY_MANUAL,
      licensePlate: formatPlateInput(p.licensePlate || ''),
      brand: p.brand || '',
      model: p.model || '',
      category: VEHICLE_CATEGORIES.some((c) => c.id === p.category) ? p.category : 'citadine',
    })
  }

  function openDetails(p) {
    setPrefill(p)
    fillManual(p)
    setManualStage('details')
  }

  // Typed plate -> registry lookup: brand/model/specs are filled in
  // automatically; the form only appears if the vehicle can't be found.
  async function lookupTypedPlate() {
    setLookingUp(true)
    setCreateError(null)
    try {
      const data = await api.lookupPlate(manual.licensePlate)
      if (data.existingVehicleId) {
        openExisting(data)
      } else if (data.error) {
        openDetails({ licensePlate: data.licensePlate || manual.licensePlate })
      } else {
        setLookup(data)
        setManualStage('confirm')
      }
    } catch (e) {
      setCreateError(e.message)
    } finally {
      setLookingUp(false)
    }
  }

  // A plate already in the fleet opens that vehicle's record (with its
  // history and a "new inspection" button) instead of creating anything.
  function openExisting(data) {
    toast.success(`${data.licensePlate} est déjà dans votre flotte.`)
    navigate(`/app/vehicles/${data.existingVehicleId}`)
  }

  function handleIdentified(data) {
    if (data.existingVehicleId) return openExisting(data)
    if (data.manual) {
      const p = data.prefill || {}
      setCreateError(null)
      setLookup(null)
      if (p.brand) {
        openDetails(p) // "Corriger les informations" after a photo scan
      } else {
        setPrefill({})
        fillManual(p)
        setManualStage('plate')
      }
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
    const plateReady = isPlateComplete(manual.licensePlate)
    const agencyField = agencies.length > 0 && (
      <Field label="Agence (optionnel)">
        <Select value={manual.agencyId} onChange={(e) => setManual({ ...manual, agencyId: e.target.value })}>
          <option value="">Aucune agence</option>
          {agencies.map((a) => (
            <option key={a.id} value={a.id}>{a.name} ({a.city})</option>
          ))}
        </Select>
      </Field>
    )
    const errorBox = createError && <div className="rounded-xl bg-status-badBg px-4 py-3 text-sm text-status-bad">{createError}</div>

    return (
      <div className="mx-auto max-w-md space-y-4 p-4">
        <BackButton
          label="Retour"
          onClick={() => (manualStage === 'plate' || prefill.brand ? setStep(STEPS.PLATE) : setManualStage('plate'))}
        />
        <h1 className="text-xl font-bold text-slate-900">{manualStage === 'details' && prefill.brand ? 'Vérifier le véhicule' : 'Saisie manuelle'}</h1>

        {manualStage === 'plate' && (
          <Card
            as="form"
            className="space-y-4 p-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (plateReady) lookupTypedPlate()
            }}
          >
            <Field label="Plaque d'immatriculation" hint="Tapez seulement les lettres et les chiffres, les tirets se placent tout seuls.">
              <Input
                required
                autoFocus
                maxLength={20}
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="font-mono text-lg tracking-wider"
                value={manual.licensePlate}
                onChange={(e) => setManual({ ...manual, licensePlate: formatPlateInput(e.target.value) })}
                placeholder="AB-123-CD"
              />
            </Field>
            {errorBox}
            <Button type="submit" className="w-full" disabled={!plateReady || lookingUp}>
              {lookingUp ? <Spinner size={18} className="text-white" /> : 'Rechercher le véhicule'}
            </Button>
          </Card>
        )}

        {manualStage === 'confirm' && lookup && (
          <Card className="space-y-4 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {lookup.existingVehicleId ? 'Déjà dans votre flotte' : 'Véhicule identifié'}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{lookup.brand} {lookup.model}</p>
              <p className="text-sm text-slate-500">
                <span className="font-mono">{lookup.licensePlate}</span> · {lookup.year || '—'} · {lookup.fuel || '—'}
              </p>
            </div>
            {!lookup.existingVehicleId && agencyField}
            {errorBox}
            <Button
              className="w-full"
              disabled={creating}
              onClick={() => createVehicleAndContinue({ ...lookup, agencyId: manual.agencyId || undefined })}
            >
              {creating ? <Spinner size={18} className="text-white" /> : lookup.existingVehicleId ? "Lancer l'inspection" : 'Confirmer'}
            </Button>
            {!lookup.existingVehicleId && (
              <button
                type="button"
                onClick={() => openDetails(lookup)}
                className="mx-auto flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-700"
              >
                <Pencil size={14} /> Corriger les informations
              </button>
            )}
          </Card>
        )}

        {manualStage === 'details' && (
          <Card
            as="form"
            className="space-y-4 p-4"
            onSubmit={(e) => {
              e.preventDefault()
              // Keep the registry/scan spec sheet when the user only corrected a field.
              createVehicleAndContinue({ ...prefill, ...manual })
            }}
          >
            {!prefill.brand && (
              <p className="rounded-xl bg-status-warnBg px-4 py-3 text-sm text-status-warn">
                Véhicule introuvable dans le registre : complétez les informations.
              </p>
            )}
            <Field label="Plaque d'immatriculation">
              <Input
                required
                maxLength={20}
                autoCapitalize="characters"
                className="font-mono tracking-wider"
                value={manual.licensePlate}
                onChange={(e) => setManual({ ...manual, licensePlate: formatPlateInput(e.target.value) })}
              />
            </Field>
            <Field label="Marque">
              <Input required maxLength={60} value={manual.brand} onChange={(e) => setManual({ ...manual, brand: e.target.value })} />
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
            {agencyField}
            {errorBox}
            <Button type="submit" className="w-full" disabled={creating || !isPlateComplete(manual.licensePlate)}>
              {creating ? <Spinner size={18} className="text-white" /> : 'Continuer'}
            </Button>
          </Card>
        )}
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
        {!captureMode ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              {vehicle.lastValidatedInspectionId
                ? 'Ce scan sera comparé au précédent : seuls les changements vous seront signalés.'
                : 'Premier scan de ce véhicule : il servira de référence pour les suivants.'}
            </p>
            {[
              { id: 'quick', icon: Video, title: 'Tour rapide', text: "Filmez en faisant le tour du véhicule (~1 min). L'app garde automatiquement les vues nettes." },
              { id: 'guided', icon: ListChecks, title: 'Photo par photo', text: 'Parcours guidé en étapes fixes, avec contrôle du cadrage de chaque photo.' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem(MODE_KEY, m.id)
                  } catch {
                    // preference only
                  }
                  setCaptureMode(m.id)
                }}
                className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-4 text-left transition-colors hover:border-brand-400 ${lastMode === m.id ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-200'}`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <m.icon size={20} />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-slate-900">{m.title}</span>
                  <span className="block text-sm text-slate-500">{m.text}</span>
                </span>
                <ChevronRight size={18} className="text-slate-400" />
              </button>
            ))}
          </div>
        ) : (
        <GuidedInspection
          mode={captureMode}
          vehicleId={vehicle.id}
          vehicleLabel={`${vehicle.brand} ${vehicle.model} · ${vehicle.licensePlate}`.trim()}
          categoryId={vehicle.category}
          onExit={() => navigate('/app/fleet')}
          onComplete={(r) => {
            setResult(r)
            setStep(STEPS.RESULT)
          }}
        />
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-bold text-slate-900">Résultat de l'inspection</h1>
      <ScanResult result={result} vehicle={vehicle} vehicleId={vehicle.id} />
    </div>
  )
}
