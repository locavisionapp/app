import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ScanLine, Save, Gauge, Trash2, AlertTriangle, Sparkles } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { BackButton } from '../../components/ui/BackButton'
import { FullscreenSpinner, Spinner } from '../../components/ui/Spinner'
import { getCategoryLabel } from '../../config/vehicleCategories'
import { SPEC_GROUPS } from '../../config/vehicleSpecs'
import { api } from '../../lib/api'

export default function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [vehicle, setVehicle] = useState(null)
  const [agencies, setAgencies] = useState([])
  const [inspections, setInspections] = useState(null)
  const [dailyRate, setDailyRate] = useState('')
  const [mileage, setMileage] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingMileage, setSavingMileage] = useState(false)
  const [savingAgency, setSavingAgency] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.getVehicle(id).then((v) => {
      setVehicle(v)
      setDailyRate(v.pricing?.dailyRate ?? '')
      setMileage(v.mileage ?? '')
    })
    api.listInspections(id).then(setInspections).catch(() => setInspections([]))
    api.listAgencies().then(setAgencies).catch(() => setAgencies([]))
  }, [id])

  async function savePricing() {
    setSaving(true)
    try {
      const pricing = { dailyRate: Number(dailyRate) || 0, currency: 'EUR' }
      const updated = await api.updateVehiclePricing(id, pricing)
      setVehicle(updated)
    } finally {
      setSaving(false)
    }
  }

  async function saveMileage() {
    setSavingMileage(true)
    try {
      const updated = await api.updateVehicleMileage(id, Number(mileage) || 0)
      setVehicle(updated)
    } finally {
      setSavingMileage(false)
    }
  }

  async function saveAgency(agencyId) {
    setSavingAgency(true)
    try {
      const updated = await api.updateVehicleAgency(id, agencyId || null)
      setVehicle(updated)
    } finally {
      setSavingAgency(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer ${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate}) ? Son historique d'inspections sera aussi effacé. Action irréversible.`)) return
    setDeleting(true)
    try {
      await api.deleteVehicle(id)
      navigate('/app/fleet')
    } finally {
      setDeleting(false)
    }
  }

  if (!vehicle) return <FullscreenSpinner />

  const groups = SPEC_GROUPS.map((g) => ({ ...g, fields: g.fields.filter((f) => vehicle[f.key] != null && vehicle[f.key] !== '') })).filter(
    (g) => g.fields.length > 0
  )
  const latestInspection = inspections?.[0]
  const currentIssues = latestInspection?.status !== 'green' ? latestInspection?.damages || [] : []

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4">
      <div className="flex items-start justify-between gap-2">
        <BackButton to="/app/fleet" label="Retour à la flotte" />
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-status-bad disabled:opacity-50"
        >
          {deleting ? <Spinner size={14} /> : <Trash2 size={14} />} Supprimer
        </button>
      </div>
      <div>
        <h1 className="text-xl font-bold text-slate-900">{vehicle.brand} {vehicle.model}</h1>
        <p className="text-sm text-slate-500">
          {vehicle.licensePlate} · {getCategoryLabel(vehicle.category)} · {vehicle.year || '—'}
          {vehicle.vin ? ` · VIN ${vehicle.vin}` : ''}
        </p>
      </div>

      {currentIssues.length > 0 && (
        <Card className={`space-y-2 p-4 ${latestInspection.status === 'red' ? 'border-status-bad bg-status-badBg' : 'border-status-warn bg-status-warnBg'}`}>
          <p className={`flex items-center gap-1.5 text-sm font-semibold ${latestInspection.status === 'red' ? 'text-status-bad' : 'text-status-warn'}`}>
            <AlertTriangle size={16} /> Problèmes actuels ({currentIssues.length})
          </p>
          <ul className="space-y-1 text-sm text-slate-700">
            {currentIssues.map((d, i) => (
              <li key={i}>
                <span className="font-medium">{d.location}</span> — {d.description}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">Relevés lors de la dernière inspection. Se mettent à jour au prochain scan.</p>
        </Card>
      )}

      <Button as={Link} to="/app/scan" className="w-full">
        <ScanLine size={18} /> Lancer une nouvelle inspection
      </Button>

      <div className="grid grid-cols-2 gap-3">
        <Card className="space-y-3 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Gauge size={15} /> Kilométrage
          </p>
          <div className="flex items-end gap-2">
            <Field label="km" className="flex-1">
              <Input type="number" min="0" value={mileage} onChange={(e) => setMileage(e.target.value)} />
            </Field>
            <Button size="sm" onClick={saveMileage} disabled={savingMileage}>
              {savingMileage ? <Spinner size={14} className="text-white" /> : <Save size={14} />}
            </Button>
          </div>
        </Card>

        <Card className="space-y-3 p-4">
          <p className="text-sm font-semibold text-slate-700">Tarif / jour</p>
          <div className="flex items-end gap-2">
            <Field label="EUR" className="flex-1">
              <Input type="number" min="0" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
            </Field>
            <Button size="sm" onClick={savePricing} disabled={saving}>
              {saving ? <Spinner size={14} className="text-white" /> : <Save size={14} />}
            </Button>
          </div>
        </Card>
      </div>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold text-slate-700">Agence</p>
        <div className="flex items-center gap-3">
          <select
            className="h-11 flex-1 rounded-xl border border-slate-300 px-3 text-sm"
            value={vehicle.agencyId || ''}
            disabled={savingAgency}
            onChange={(e) => saveAgency(e.target.value)}
          >
            <option value="">Aucune agence</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.city})</option>
            ))}
          </select>
          {savingAgency && <Spinner size={16} />}
        </div>
      </Card>

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
              <Card key={insp.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(insp.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm text-slate-500">{insp.damages?.length || 0} point(s) relevé(s) · score {insp.healthScore ?? '—'}/10</p>
                </div>
                <StatusBadge status={insp.status} />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
