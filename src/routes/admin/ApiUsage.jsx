import { useEffect, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { FullscreenSpinner } from '../../components/ui/Spinner'
import { UsageChart } from '../../components/admin/UsageChart'
import { api } from '../../lib/api'

export default function ApiUsage() {
  const [usage, setUsage] = useState(null)

  useEffect(() => {
    api.getUsage('30d').then(setUsage).catch(() => setUsage({ total: 0, daily: [], byCompany: [] }))
  }, [])

  if (!usage) return <FullscreenSpinner />

  const totalAnnualFees = usage.byCompany.reduce((sum, c) => sum + (c.annualFee || 0), 0)
  const totalEstimatedCost = usage.byCompany.reduce((sum, c) => sum + (c.estimatedCost || 0), 0)

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4">
      <h1 className="text-xl font-bold text-slate-900">Appels API</h1>

      <Card className="p-5">
        <p className="text-sm text-slate-500">Total sur 30 jours</p>
        <p className="text-3xl font-bold text-slate-900">{usage.total.toLocaleString('fr-FR')}</p>
        <div className="mt-4">
          <UsageChart data={usage.daily} />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-lg font-bold text-slate-900">{totalAnnualFees.toLocaleString('fr-FR')} €</p>
          <p className="text-xs text-slate-500">Licences annuelles actives</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-lg font-bold text-slate-900">{totalEstimatedCost.toLocaleString('fr-FR')} €</p>
          <p className="text-xs text-slate-500">Coût API estimé (30j)</p>
        </Card>
        <Card className="p-4 text-center">
          <p className={`text-lg font-bold ${totalAnnualFees - totalEstimatedCost >= 0 ? 'text-status-good' : 'text-status-bad'}`}>
            {(totalAnnualFees - totalEstimatedCost).toLocaleString('fr-FR')} €
          </p>
          <p className="text-xs text-slate-500">Marge estimée</p>
        </Card>
      </div>
      <p className="text-xs text-slate-400">
        Coût API estimé à {usage.costPerCallEur ?? 0} € / appel (constante configurable, pas une facture réelle). Les
        licences annuelles correspondent aux devis marqués "payé" (virement reçu), pas à un paiement en ligne.
      </p>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Par entreprise</p>
        <div className="space-y-2">
          {usage.byCompany.map((c) => (
            <Card key={c.companyId} className="flex items-center justify-between p-4">
              <p className="font-medium text-slate-900">{c.name}</p>
              <div className="text-right text-sm">
                <p className="font-semibold text-slate-700">{c.count.toLocaleString('fr-FR')} appels</p>
                <p className="text-xs text-slate-400">
                  {c.estimatedCost ?? 0} € coût · {c.annualFee ?? 0} € / an
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
