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

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Par entreprise</p>
        <div className="space-y-2">
          {usage.byCompany.map((c) => (
            <Card key={c.companyId} className="flex items-center justify-between p-4">
              <p className="font-medium text-slate-900">{c.name}</p>
              <p className="text-sm font-semibold text-slate-700">{c.count.toLocaleString('fr-FR')} appels</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
