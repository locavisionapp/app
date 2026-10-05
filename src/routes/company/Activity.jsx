import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { FullscreenSpinner, Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../lib/AuthContext'
import { api } from '../../lib/api'

// Human-readable label for an API write, from its method + path.
const ACTIONS = [
  [/^POST \/v1\/vehicles$/, 'Véhicule ajouté'],
  [/^DELETE \/v1\/vehicles\/[^/]+$/, 'Véhicule supprimé'],
  [/^PUT \/v1\/vehicles\/[^/]+\/pricing$/, 'Tarif modifié'],
  [/^PUT \/v1\/vehicles\/[^/]+\/mileage$/, 'Kilométrage modifié'],
  [/^PUT \/v1\/vehicles\/[^/]+\/agency$/, 'Agence du véhicule modifiée'],
  [/^POST \/v1\/vehicles\/[^/]+\/inspections$/, 'Inspection réalisée'],
  [/^POST \/v1\/vehicles\/[^/]+\/inspections\/[^/]+\/review$/, 'Défauts validés'],
  [/^POST \/v1\/vehicles\/[^/]+\/inspections\/[^/]+\/signatures$/, 'État des lieux signé'],
  [/^POST \/v1\/vehicles\/[^/]+\/inspections\/[^/]+\/report\/send$/, 'Rapport envoyé par email'],
  [/^PUT \/v1\/vehicles\/[^/]+\/damages\/[^/]+$/, 'Défaut marqué réparé / modifié'],
  [/^POST \/v1\/agencies$/, 'Agence créée'],
  [/^PUT \/v1\/agencies\/[^/]+$/, 'Agence modifiée'],
  [/^DELETE \/v1\/agencies\/[^/]+$/, 'Agence supprimée'],
  [/^POST \/v1\/employees$/, 'Accès employé créé'],
  [/^PUT \/v1\/employees\/[^/]+$/, 'Accès employé modifié'],
  [/^POST \/v1\/employees\/[^/]+\/reset-password$/, 'Mot de passe employé réinitialisé'],
  [/^DELETE \/v1\/employees\/[^/]+$/, 'Accès employé supprimé'],
  [/^POST \/v1\/company\/regenerate-key$/, 'Clé API régénérée'],
  [/^PUT \/v1\/company\/webhook$/, 'Webhook modifié'],
]

function describe(entry) {
  const key = `${entry.method} ${entry.path}`
  return ACTIONS.find(([re]) => re.test(key))?.[1] || key
}

/** Company activity log: who did what, when (admin only). */
export default function Activity() {
  const { profile } = useAuth()
  const toast = useToast()
  const [entries, setEntries] = useState(null)
  const [cursor, setCursor] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    if (profile?.role !== 'company_admin') return
    api
      .getAuditLog({ limit: 50 })
      .then(({ items, nextCursor }) => {
        setEntries(items)
        setCursor(nextCursor)
      })
      .catch((e) => {
        setEntries([])
        toast.error(e)
      })
  }, [profile?.role, toast])

  if (profile && profile.role !== 'company_admin') return <Navigate to="/app/scan" replace />
  if (!entries) return <FullscreenSpinner />

  async function loadMore() {
    setLoadingMore(true)
    try {
      const { items, nextCursor } = await api.getAuditLog({ limit: 50, cursor })
      setEntries((list) => [...list, ...items])
      setCursor(nextCursor)
    } catch (e) {
      toast.error(e)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Journal d'activité</h1>
        <p className="text-sm text-slate-500">Toutes les modifications faites par votre équipe et votre clé API (conservées un an).</p>
      </div>
      {entries.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">Aucune activité enregistrée pour l'instant.</Card>
      ) : (
        <Card className="divide-y divide-slate-100">
          {entries.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{describe(e)}</p>
                <p className="truncate text-xs text-slate-400">{e.user}</p>
              </div>
              <p className="shrink-0 text-xs text-slate-500">
                {new Date(e.at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </Card>
      )}
      {cursor && (
        <Button variant="secondary" className="w-full" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? <Spinner size={16} /> : 'Plus ancien'}
        </Button>
      )}
    </div>
  )
}
