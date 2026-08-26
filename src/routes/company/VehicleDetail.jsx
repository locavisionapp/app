import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ScanLine, Save, Gauge } from 'lucide-react'
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
  const [vehicle, setVehicle] = useState(null)
  const [agencies, setAgencies] = useState([])
  const [inspections, setInspections] = useState(null)
  const [dailyRate, setDailyRate] = useState('')
  const [mileage, setMileage] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingMileage, setSavingMileage] = useState(false)
  const [savingAgency, setSavingAgency] = useState(false)

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

  if (!vehicle) return <FullscreenSpinner />

  const groups = SPEC_GROUPS.map((g) => ({ ...g, fields: g.fields.filter((f) => vehicle[f.key] != null && vehicle[f.key] !== '') })).filter(
    (g) => g.fields.length > 0
  )

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4">
      <BackButton to="/app/fleet" label="Retour à la flotte" />
      <div>
        <h1 className="text-xl font-bold text-slate-900">{vehicle.brand} {vehicle.model}</h1>
        <p className="text-sm text-slate-500">
          {vehicle.licensePlate} · {getCategoryLabel(vehicle.category)} · {vehicle.year || '—'}
          {vehicle.vin ? ` · VIN ${vehicle.vin}` : ''}
        </p>
      </div>

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
          <p className="pb-3 text-sm font-semibold text-slate-700">Fiche technique</p>
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
