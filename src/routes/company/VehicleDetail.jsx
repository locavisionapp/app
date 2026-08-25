import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ScanLine, Save } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { BackButton } from '../../components/ui/BackButton'
import { FullscreenSpinner, Spinner } from '../../components/ui/Spinner'
import { getCategoryLabel } from '../../config/vehicleCategories'
import { api } from '../../lib/api'

export default function VehicleDetail() {
  const { id } = useParams()
  const [vehicle, setVehicle] = useState(null)
  const [inspections, setInspections] = useState(null)
  const [dailyRate, setDailyRate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getVehicle(id).then((v) => {
      setVehicle(v)
      setDailyRate(v.pricing?.dailyRate ?? '')
    })
    api.listInspections(id).then(setInspections).catch(() => setInspections([]))
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

  if (!vehicle) return <FullscreenSpinner />

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4">
      <BackButton to="/app/fleet" label="Retour à la flotte" />
      <div>
        <h1 className="text-xl font-bold text-slate-900">{vehicle.brand} {vehicle.model}</h1>
        <p className="text-sm text-slate-500">{vehicle.licensePlate} · {getCategoryLabel(vehicle.category)} · {vehicle.year || '—'}</p>
      </div>

      <Button as={Link} to="/app/scan" className="w-full">
        <ScanLine size={18} /> Lancer une nouvelle inspection
      </Button>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold text-slate-700">Tarif de location</p>
        <div className="flex items-end gap-3">
          <Field label="Prix / jour (EUR)" className="flex-1">
            <Input type="number" min="0" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
          </Field>
          <Button onClick={savePricing} disabled={saving}>
            {saving ? <Spinner size={16} className="text-white" /> : <Save size={16} />} Enregistrer
          </Button>
        </div>
      </Card>

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
