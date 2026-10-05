import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ScanLine, Save, Gauge, Trash2, AlertTriangle, Sparkles, ChevronDown, RotateCcw, Wrench, ClipboardCheck } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Field'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { BackButton } from '../../components/ui/BackButton'
import { FullscreenSpinner, Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../lib/AuthContext'
import { getCategoryLabel } from '../../config/vehicleCategories'
import { SPEC_GROUPS } from '../../config/vehicleSpecs'
import { api } from '../../lib/api'
import { DamageReview, DamagePhoto } from '../../components/scan/DamageReview'
import { InspectionReport } from '../../components/scan/InspectionReport'

const DATE_FORMAT = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }

export default function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'company_admin'
  const [vehicle, setVehicle] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [agencies, setAgencies] = useState([])
  const [inspections, setInspections] = useState(null)
  const [inspectionsCursor, setInspectionsCursor] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [dailyRate, setDailyRate] = useState('')
  const [mileage, setMileage] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingMileage, setSavingMileage] = useState(false)
  const [savingAgency, setSavingAgency] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setLoadError(null)
    api
      .getVehicle(id)
      .then((v) => {
        setVehicle(v)
        setDailyRate(v.pricing?.dailyRate ?? '')
        setMileage(v.mileage ?? '')
      })
      .catch((e) => setLoadError(e.message))
    api
      .listInspections(id)
      .then(({ items, nextCursor }) => {
        setInspections(items)
        setInspectionsCursor(nextCursor)
      })
      .catch(() => setInspections([]))
    api.listAgencies().then(setAgencies).catch(() => setAgencies([]))
  }, [id, reloadKey])

  async function run(setBusy, action, successMessage) {
    setBusy(true)
    try {
      const updated = await action()
      if (updated) setVehicle(updated)
      if (successMessage) toast.success(successMessage)
    } catch (e) {
      toast.error(e)
    } finally {
      setBusy(false)
    }
  }

  function savePricing() {
    const rate = Number(dailyRate)
    if (!Number.isFinite(rate) || rate < 0) return toast.error('Tarif invalide.')
    run(setSaving, () => api.updateVehiclePricing(id, { dailyRate: rate, currency: 'EUR' }), 'Tarif enregistré.')
  }

  function saveMileage() {
    const km = Number(mileage)
    if (mileage === '' || !Number.isFinite(km) || km < 0) return toast.error('Kilométrage invalide.')
    run(setSavingMileage, () => api.updateVehicleMileage(id, km), 'Kilométrage enregistré.')
  }

  function saveAgency(agencyId) {
    run(setSavingAgency, () => api.updateVehicleAgency(id, agencyId || null), 'Agence mise à jour.')
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer ${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate}) ? Son historique d'inspections et ses photos seront aussi effacés. Action irréversible.`)) return
    setDeleting(true)
    try {
      await api.deleteVehicle(id)
      toast.success('Véhicule supprimé.')
      navigate('/app/fleet')
    } catch (e) {
      toast.error(e)
      setDeleting(false)
    }
  }

  async function loadMoreInspections() {
    setLoadingMore(true)
    try {
      const { items, nextCursor } = await api.listInspections(id, { cursor: inspectionsCursor })
      setInspections((list) => [...list, ...items])
      setInspectionsCursor(nextCursor)
    } catch (e) {
      toast.error(e)
    } finally {
      setLoadingMore(false)
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <BackButton to="/app/fleet" label="Retour à la flotte" />
        <Card className="space-y-3 p-8 text-center text-sm">
          <p className="text-status-bad">{loadError}</p>
          <Button size="sm" variant="secondary" onClick={() => setReloadKey((k) => k + 1)}>
            <RotateCcw size={14} /> Réessayer
          </Button>
        </Card>
      </div>
    )
  }
  if (!vehicle) return <FullscreenSpinner />

  const groups = SPEC_GROUPS.map((g) => ({ ...g, fields: g.fields.filter((f) => vehicle[f.key] != null && vehicle[f.key] !== '') })).filter(
    (g) => g.fields.length > 0
  )
  const openDamages = (vehicle.knownDamages || []).filter((d) => d.status === 'open')
  const pendingReviews = (inspections || []).filter((i) => i.review?.status === 'pending')

  async function markRepaired(damage) {
    if (!window.confirm(`Marquer comme réparé : ${damage.location} — ${damage.description} ?`)) return
    try {
      setVehicle(await api.updateDamageStatus(id, damage.id, 'repaired'))
      toast.success('Défaut marqué comme réparé.')
    } catch (e) {
      toast.error(e)
    }
  }

  function onInspectionReviewed(updated) {
    setInspections((list) => list.map((i) => (i.id === updated.id ? updated : i)))
    api.getVehicle(id).then(setVehicle).catch(() => {})
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4">
      <div className="flex items-start justify-between gap-2">
        <BackButton to="/app/fleet" label="Retour à la flotte" />
        {isAdmin && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-status-bad disabled:opacity-50"
          >
            {deleting ? <Spinner size={14} /> : <Trash2 size={14} />} Supprimer
          </button>
        )}
      </div>
      <div>
        <h1 className="text-xl font-bold text-slate-900">{vehicle.brand} {vehicle.model}</h1>
        <p className="text-sm text-slate-500">
          <span className="font-mono">{vehicle.licensePlate}</span> · {getCategoryLabel(vehicle.category)} · {vehicle.year || '—'}
          {vehicle.vin ? ` · VIN ${vehicle.vin}` : ''}
        </p>
      </div>

      {pendingReviews.length > 0 && (
        <Card className="flex items-center gap-3 border-status-warn bg-status-warnBg p-4 text-sm text-status-warn">
          <ClipboardCheck size={18} className="shrink-0" />
          <span className="flex-1">{pendingReviews.length} inspection(s) à valider : confirmez les nouveaux défauts dans l'historique ci-dessous.</span>
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <AlertTriangle size={15} /> Défauts connus ({openDamages.length})
          </p>
          {vehicle.lastValidatedInspectionAt && (
            <span className="text-xs text-slate-400">Référence : scan du {new Date(vehicle.lastValidatedInspectionAt).toLocaleDateString('fr-FR')}</span>
          )}
        </div>
        {openDamages.length === 0 ? (
          <p className="text-sm text-slate-500">
            {vehicle.lastValidatedInspectionId ? 'Aucun défaut connu sur ce véhicule.' : "Pas encore de scan de référence : le premier scan validé servira de base de comparaison."}
          </p>
        ) : (
          <div className="space-y-2">
            {openDamages.map((d) => (
              <div key={d.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                <DamagePhoto url={d.photoUrl} box={d.box} className="w-24 shrink-0" label={`${d.location} — ${d.description}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{d.location}</p>
                  <p className="text-sm text-slate-500">{d.description}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {d.type} · gravité {d.severity}/5 · relevé le {new Date(d.firstSeenAt).toLocaleDateString('fr-FR')}
                    {d.worsenedAt ? ` · aggravé le ${new Date(d.worsenedAt).toLocaleDateString('fr-FR')}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => markRepaired(d)}
                  className="flex h-9 shrink-0 items-center gap-1 self-start rounded-lg px-2 text-xs text-slate-500 hover:bg-slate-100 hover:text-status-good"
                  title="Marquer comme réparé"
                >
                  <Wrench size={14} /> Réparé
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Button as={Link} to={`/app/scan?vehicle=${vehicle.id}`} state={{ vehicle }} className="w-full">
        <ScanLine size={18} /> Lancer une nouvelle inspection
      </Button>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="space-y-3 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Gauge size={15} /> Kilométrage
          </p>
          <div className="flex items-end gap-2">
            <Field label="km" className="flex-1">
              <Input type="number" min="0" inputMode="numeric" value={mileage} onChange={(e) => setMileage(e.target.value)} />
            </Field>
            <Button size="sm" className="h-11" onClick={saveMileage} disabled={savingMileage} aria-label="Enregistrer le kilométrage">
              {savingMileage ? <Spinner size={14} className="text-white" /> : <Save size={14} />}
            </Button>
          </div>
        </Card>

        <Card className="space-y-3 p-4">
          <p className="text-sm font-semibold text-slate-700">Tarif / jour</p>
          <div className="flex items-end gap-2">
            <Field label="EUR" className="flex-1">
              <Input type="number" min="0" step="0.01" inputMode="decimal" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
            </Field>
            <Button size="sm" className="h-11" onClick={savePricing} disabled={saving} aria-label="Enregistrer le tarif">
              {saving ? <Spinner size={14} className="text-white" /> : <Save size={14} />}
            </Button>
          </div>
        </Card>
      </div>

      {agencies.length > 0 && (
        <Card className="space-y-3 p-4">
          <p className="text-sm font-semibold text-slate-700">Agence</p>
          <div className="flex items-center gap-3">
            <Select className="flex-1" value={vehicle.agencyId || ''} disabled={savingAgency} onChange={(e) => saveAgency(e.target.value)}>
              <option value="">Aucune agence</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.city})</option>
              ))}
            </Select>
            {savingAgency && <Spinner size={16} />}
          </div>
        </Card>
      )}

      {groups.length > 0 && (
        <Card className="divide-y divide-slate-100 p-4">
          <div className="flex items-center justify-between pb-3">
            <p className="text-sm font-semibold text-slate-700">Fiche technique</p>
            {vehicle.specsSource === 'estimated' && (
              <span className="flex items-center gap-1 text-xs text-slate-400" title="Valeurs estimées par IA à partir du modèle (non certifiées) — les champs confirmés par la carte grise ne sont jamais remplacés.">
                <Sparkles size={12} /> Estimé par IA
              </span>
            )}
          </div>
          {groups.map((g) => (
            <div key={g.title} className="py-3 first:pt-0 last:pb-0">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">{g.title}</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                {g.fields.map((f) => (
                  <div key={f.key}>
                    <dt className="text-xs text-slate-400">{f.label}</dt>
                    <dd className="text-sm font-medium text-slate-900">
                      {vehicle[f.key]}{f.unit ? ` ${f.unit}` : ''}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </Card>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Historique des inspections</p>
        {inspections === null ? (
          <Spinner />
        ) : inspections.length === 0 ? (
          <Card className="p-4 text-center text-sm text-slate-500">Aucune inspection enregistrée.</Card>
        ) : (
          <div className="space-y-2">
            {inspections.map((insp) => (
              <InspectionCard key={insp.id} inspection={insp} vehicle={vehicle} vehicleId={id} knownDamages={vehicle.knownDamages || []} onReviewed={onInspectionReviewed} />
            ))}
            {inspectionsCursor && (
              <Button variant="secondary" className="w-full" onClick={loadMoreInspections} disabled={loadingMore}>
                {loadingMore ? <Spinner size={16} /> : 'Inspections plus anciennes'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InspectionCard({ inspection: insp, vehicle, vehicleId, knownDamages, onReviewed }) {
  const pending = insp.review?.status === 'pending'
  const [open, setOpen] = useState(pending)
  const photos = (insp.photos || []).filter(Boolean)
  return (
    <Card className={pending ? 'overflow-hidden border-status-warn' : 'overflow-hidden'}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 p-4 text-left" aria-expanded={open}>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">
            {new Date(insp.createdAt).toLocaleDateString('fr-FR', DATE_FORMAT)}
            {insp.mode === 'baseline' && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">Référence</span>}
            {pending && <span className="ml-2 rounded-full bg-status-warnBg px-2 py-0.5 text-[11px] font-medium text-status-warn">À valider</span>}
          </p>
          <p className="text-sm text-slate-500">
            {insp.mode === 'comparison'
              ? `${insp.newDamageCount || 0} nouveau(x) défaut(s)`
              : `${insp.damages?.length || 0} point(s) relevé(s)`}
            {insp.healthScore != null ? ` · score ${insp.healthScore}/10` : ''}
            {insp.mileage != null ? ` · ${insp.mileage.toLocaleString('fr-FR')} km` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={insp.status} />
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 p-4">
          {insp.summary && <p className="text-sm text-slate-600">{insp.summary}</p>}
          <DamageReview vehicleId={vehicleId} inspection={insp} knownDamages={knownDamages} onUpdated={onReviewed} />
          {insp.mode && <InspectionReport vehicleId={vehicleId} vehicle={vehicle} inspection={insp} onUpdated={onReviewed} />}
          {photos.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm text-slate-500 hover:text-brand-700">Toutes les photos ({photos.length})</summary>
              <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                {photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg bg-slate-100">
                    <img src={url} alt={`Photo ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </Card>
  )
}
