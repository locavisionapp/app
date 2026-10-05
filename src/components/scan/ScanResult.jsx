import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { Card } from '../ui/Card'
import { statusMeta } from '../ui/StatusBadge'
import { Button } from '../ui/Button'
import { DamageReview } from './DamageReview'
import { api } from '../../lib/api'

const ICONS = { green: CheckCircle2, orange: AlertTriangle, red: XCircle }

export function ScanResult({ result: initial, vehicleId }) {
  const [result, setResult] = useState(initial)
  const [knownDamages, setKnownDamages] = useState([])
  const status = result.status || 'orange'
  const Icon = ICONS[status] || AlertTriangle
  const meta = statusMeta(status)
  const pending = result.review?.status === 'pending'

  // Known defects, to name the ones the AI didn't find again.
  useEffect(() => {
    if (!result.missingKnownIds?.length) return
    api.getVehicle(vehicleId).then((v) => setKnownDamages(v.knownDamages || [])).catch(() => {})
  }, [vehicleId, result.missingKnownIds])

  return (
    <div className="space-y-5">
      <Card className={`p-6 text-center ${meta.bg}`}>
        <Icon className={`mx-auto mb-2 ${meta.text}`} size={40} />
        <p className={`text-xl font-bold ${meta.text}`}>
          {result.mode === 'comparison'
            ? result.newDamageCount
              ? `${result.newDamageCount} changement(s) depuis le dernier scan`
              : 'Aucun changement'
            : result.status_label || meta.label}
        </p>
        {result.summary && <p className="mt-1 text-sm text-slate-600">{result.summary}</p>}
        {typeof result.health_score === 'number' && (
          <p className="mt-3 text-sm font-medium text-slate-500">Score de santé : {result.health_score}/10</p>
        )}
      </Card>

      <DamageReview vehicleId={vehicleId} inspection={result} knownDamages={knownDamages} onUpdated={setResult} />

      {!pending && (
        <div className="flex gap-3">
          <Button as={Link} to={`/app/vehicles/${vehicleId}`} variant="secondary" className="flex-1">
            Voir la fiche
          </Button>
          <Button as={Link} to="/app/scan" className="flex-1">
            Nouveau scan
          </Button>
        </div>
      )}
      {pending && (
        <p className="text-center text-xs text-slate-400">
          Vous pouvez aussi valider plus tard depuis la fiche du véhicule.{' '}
          <Link to={`/app/vehicles/${vehicleId}`} className="text-brand-700 underline">Voir la fiche</Link>
        </p>
      )}
    </div>
  )
}
