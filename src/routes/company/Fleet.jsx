import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ChevronRight } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { FullscreenSpinner } from '../../components/ui/Spinner'
import { getCategoryLabel } from '../../config/vehicleCategories'
import { api } from '../../lib/api'

export default function Fleet() {
  const [vehicles, setVehicles] = useState(null)

  useEffect(() => {
    api.listVehicles().then(setVehicles).catch(() => setVehicles([]))
  }, [])

  if (!vehicles) return <FullscreenSpinner label="Chargement de la flotte…" />

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Ma flotte</h1>
        <Button as={Link} to="/app/scan" size="sm">
          <Plus size={16} /> Scanner
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">
          Aucun véhicule pour l'instant. Lancez un scan pour ajouter le premier.
        </Card>
      ) : (
        <div className="space-y-3">
          {vehicles.map((v) => (
            <Link key={v.id} to={`/app/vehicles/${v.id}`}>
              <Card className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-slate-900">{v.brand} {v.model}</p>
                  <p className="text-sm text-slate-500">{v.licensePlate} · {getCategoryLabel(v.category)}</p>
                  {v.pricing?.dailyRate != null && (
                    <p className="mt-1 text-sm font-medium text-brand-700">{v.pricing.dailyRate} {v.pricing.currency || 'EUR'} / jour</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {v.lastStatus && <StatusBadge status={v.lastStatus} />}
                  <ChevronRight className="text-slate-400" size={18} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
