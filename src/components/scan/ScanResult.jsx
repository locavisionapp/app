import { Link } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { Card } from '../ui/Card'
import { StatusBadge, statusMeta } from '../ui/StatusBadge'
import { Button } from '../ui/Button'

const ICONS = { green: CheckCircle2, orange: AlertTriangle, red: XCircle }

export function ScanResult({ result, vehicleId }) {
  const status = result.status || 'orange'
  const Icon = ICONS[status] || AlertTriangle
  const meta = statusMeta(status)

  return (
    <div className="space-y-5">
      <Card className={`p-6 text-center ${meta.bg}`}>
        <Icon className={`mx-auto mb-2 ${meta.text}`} size={40} />
        <p className={`text-xl font-bold ${meta.text}`}>{result.status_label || meta.label}</p>
        <p className="mt-1 text-sm text-slate-600">{result.summary}</p>
        {typeof result.health_score === 'number' && (
          <p className="mt-3 text-sm font-medium text-slate-500">Score de santé : {result.health_score}/10</p>
        )}
      </Card>

      {result.damages?.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Points relevés</p>
          {result.damages.map((d, i) => (
            <Card key={i} className="flex items-start justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-slate-900">{d.location}</p>
                <p className="text-sm text-slate-500">{d.description}</p>
              </div>
              <StatusBadge status={d.severity >= 4 ? 'red' : d.severity >= 2 ? 'orange' : 'green'} label={d.type} />
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-4 text-center text-sm text-slate-500">Aucun dégât détecté sur cette inspection.</Card>
      )}

      <div className="flex gap-3">
        <Button as={Link} to={`/app/vehicles/${vehicleId}`} variant="secondary" className="flex-1">
          Voir l'historique
        </Button>
        <Button as={Link} to="/app/scan" className="flex-1">
          Nouveau scan
        </Button>
      </div>
    </div>
  )
}
