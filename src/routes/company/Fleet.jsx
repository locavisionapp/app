import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ChevronRight, Search, X, RotateCcw } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { VEHICLE_CATEGORIES, getCategoryLabel } from '../../config/vehicleCategories'
import { api } from '../../lib/api'

const EMPTY_FILTERS = { q: '', agencyId: '', city: '', category: '', status: '' }
const PAGE_SIZE = 50

export default function Fleet() {
  const toast = useToast()
  const [agencies, setAgencies] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    api.listAgencies().then(setAgencies).catch(() => setAgencies([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const handle = setTimeout(() => {
      api
        .listVehicles({ ...filters, limit: PAGE_SIZE })
        .then(({ items, nextCursor }) => {
          if (cancelled) return // a newer filter change superseded this request
          setVehicles(items)
          setNextCursor(nextCursor)
        })
        .catch((e) => !cancelled && setError(e.message))
        .finally(() => !cancelled && setLoading(false))
    }, filters.q ? 300 : 0) // debounce free-text search only
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [filters, reloadKey])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const { items, nextCursor: cursor } = await api.listVehicles({ ...filters, limit: PAGE_SIZE, cursor: nextCursor })
      setVehicles((list) => [...list, ...items.filter((v) => !list.some((x) => x.id === v.id))])
      setNextCursor(cursor)
    } catch (e) {
      toast.error(e)
    } finally {
      setLoadingMore(false)
    }
  }

  const cities = useMemo(() => [...new Set(agencies.map((a) => a.city).filter(Boolean))].sort(), [agencies])
  const hasActiveFilters = Object.values(filters).some(Boolean)

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
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input
            type="search"
            className="pl-9"
            placeholder="Plaque, marque, modèle, VIN…"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {agencies.length > 0 && (
            <Select className="h-10 sm:w-auto" value={filters.agencyId} onChange={(e) => setFilters({ ...filters, agencyId: e.target.value })} aria-label="Agence">
              <option value="">Toutes les agences</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          )}
          {cities.length > 1 && (
            <Select className="h-10 sm:w-auto" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} aria-label="Ville">
              <option value="">Toutes les villes</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          )}
          <Select className="h-10 sm:w-auto" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} aria-label="Type">
            <option value="">Tous les types</option>
            {VEHICLE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </Select>
          <Select className="h-10 sm:w-auto" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} aria-label="État">
            <option value="">Tous les états</option>
            <option value="green">Bon état</option>
            <option value="orange">À surveiller</option>
            <option value="red">Dégâts détectés</option>
          </Select>
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
      ) : error ? (
        <Card className="space-y-3 p-8 text-center text-sm">
          <p className="text-status-bad">{error}</p>
          <Button size="sm" variant="secondary" onClick={() => setReloadKey((k) => k + 1)}>
            <RotateCcw size={14} /> Réessayer
          </Button>
        </Card>
      ) : vehicles.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">
          {hasActiveFilters ? 'Aucun véhicule ne correspond à ces filtres.' : "Aucun véhicule pour l'instant. Lancez un scan pour ajouter le premier."}
        </Card>
      ) : (
        <div className="space-y-3">
          {vehicles.map((v) => (
            <Link key={v.id} to={`/app/vehicles/${v.id}`} className="block">
              <Card className="flex items-center justify-between gap-3 p-4 transition-colors hover:border-brand-300">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{v.brand} {v.model}</p>
                  <p className="truncate text-sm text-slate-500">
                    <span className="font-mono">{v.licensePlate}</span> · {getCategoryLabel(v.category)}
                    {v.city ? ` · ${v.city}` : ''}
                    {v.mileage != null ? ` · ${v.mileage.toLocaleString('fr-FR')} km` : ''}
                  </p>
                  {v.pricing?.dailyRate > 0 && (
                    <p className="mt-1 text-sm font-medium text-brand-700">{v.pricing.dailyRate} {v.pricing.currency || 'EUR'} / jour</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {v.lastStatus ? <StatusBadge status={v.lastStatus} /> : <span className="text-xs text-slate-400">Jamais inspecté</span>}
                  <ChevronRight className="text-slate-400" size={18} />
                </div>
              </Card>
            </Link>
          ))}
          {nextCursor && (
            <Button variant="secondary" className="w-full" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? <Spinner size={16} /> : 'Charger plus de véhicules'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
