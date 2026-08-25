import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ChevronRight, Search, X } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { FullscreenSpinner, Spinner } from '../../components/ui/Spinner'
import { VEHICLE_CATEGORIES, getCategoryLabel } from '../../config/vehicleCategories'
import { api } from '../../lib/api'

const EMPTY_FILTERS = { q: '', agencyId: '', city: '', category: '', status: '' }

export default function Fleet() {
  const [agencies, setAgencies] = useState([])
  const [vehicles, setVehicles] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  useEffect(() => {
    api.listAgencies().then(setAgencies).catch(() => setAgencies([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    const handle = setTimeout(() => {
      api.listVehicles(filters).then(setVehicles).catch(() => setVehicles([])).finally(() => setLoading(false))
    }, 250) // debounce free-text search
    return () => clearTimeout(handle)
  }, [filters])

  const cities = useMemo(() => [...new Set(agencies.map((a) => a.city).filter(Boolean))], [agencies])
  const hasActiveFilters = Object.values(filters).some(Boolean)

  if (vehicles === null) return <FullscreenSpinner label="Chargement de la flotte…" />

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Ma flotte</h1>
        <Button as={Link} to="/app/scan" size="sm">
          <Plus size={16} /> Scanner
        </Button>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input
            className="pl-9"
            placeholder="Plaque, marque, modèle…"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
            value={filters.agencyId}
            onChange={(e) => setFilters({ ...filters, agencyId: e.target.value })}
          >
            <option value="">Toutes les agences</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select
            className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          >
            <option value="">Toutes les villes</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="">Tous les types</option>
            {VEHICLE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <select
            className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Tous les états</option>
            <option value="green">Bon état</option>
            <option value="orange">À surveiller</option>
            <option value="red">Dégâts détectés</option>
          </select>
          {hasActiveFilters && (
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="flex h-10 items-center gap-1 rounded-xl px-3 text-sm text-slate-500 hover:bg-slate-100"
            >
              <X size={14} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : vehicles.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">
          {hasActiveFilters ? 'Aucun véhicule ne correspond à ces filtres.' : "Aucun véhicule pour l'instant. Lancez un scan pour ajouter le premier."}
        </Card>
      ) : (
        <div className="space-y-3">
          {vehicles.map((v) => (
            <Link key={v.id} to={`/app/vehicles/${v.id}`}>
              <Card className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-slate-900">{v.brand} {v.model}</p>
                  <p className="text-sm text-slate-500">
                    {v.licensePlate} · {getCategoryLabel(v.category)}
                    {v.city ? ` · ${v.city}` : ''}
                  </p>
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
