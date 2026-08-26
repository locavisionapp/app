import { useEffect, useState } from 'react'
import { KeyRound, Copy, Check, Webhook, FileText } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { FullscreenSpinner, Spinner } from '../../components/ui/Spinner'
import { useAuth } from '../../lib/AuthContext'
import { api } from '../../lib/api'

const STATUS_LABELS = {
  active: { label: 'Actif', className: 'text-status-good' },
  trial: { label: "Période d'essai", className: 'text-status-warn' },
  suspended: { label: 'Suspendu', className: 'text-status-bad' },
  expired: { label: 'Expiré', className: 'text-status-bad' },
}

export default function Account() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'company_admin'
  const [company, setCompany] = useState(null)
  const [quotes, setQuotes] = useState(null)
  const [newKey, setNewKey] = useState(null)
  const [copied, setCopied] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  function refresh() {
    api.getMyCompany().then((c) => {
      setCompany(c)
      setWebhookUrl(c.webhookUrl || '')
    })
    api.getMyQuotes().then(setQuotes).catch(() => setQuotes([]))
  }

  useEffect(refresh, [])

  async function regenerateKey() {
    if (!window.confirm("Régénérer la clé API ? L'ancienne cessera de fonctionner immédiatement.")) return
    setRegenerating(true)
    try {
      const { apiKey } = await api.regenerateMyApiKey()
      setNewKey(apiKey)
      refresh()
    } finally {
      setRegenerating(false)
    }
  }

  async function saveWebhook() {
    setSavingWebhook(true)
    try {
      await api.updateMyWebhook(webhookUrl)
      refresh()
    } finally {
      setSavingWebhook(false)
    }
  }

  if (!company) return <FullscreenSpinner />

  const status = STATUS_LABELS[company.status] || { label: company.status, className: 'text-slate-500' }
  const trialDaysLeft = company.trialEndsAt ? Math.max(0, Math.ceil((company.trialEndsAt - Date.now()) / 86400000)) : null

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-bold text-slate-900">Mon compte</h1>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-900">{company.name}</p>
          <span className={`text-sm font-medium ${status.className}`}>{status.label}</span>
        </div>
        {trialDaysLeft != null && company.status === 'trial' && (
          <p className="mt-1 text-sm text-slate-500">{trialDaysLeft} jour(s) d'essai restant(s)</p>
        )}
        {company.license && (
          <p className="mt-1 text-sm text-slate-500">
            Licence annuelle · {company.license.amount ? `${company.license.amount} € / an` : 'tarif à l\'usage'} · renouvellement le{' '}
            {new Date(company.license.endsAt).toLocaleDateString('fr-FR')}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <p className="text-lg font-bold text-slate-900">{company.apiCallCount ?? 0}</p>
          <p className="text-xs text-slate-500">Appels API (total)</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-lg font-bold text-slate-900">{company.estimatedApiCostEur ?? 0} €</p>
          <p className="text-xs text-slate-500">Coût API estimé</p>
        </Card>
      </div>

      <Card className="space-y-3 p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <KeyRound size={15} /> Clé API
        </p>
        <p className="text-xs text-slate-500">
          Pour des raisons de sécurité, la clé n'est affichée qu'au moment de sa création ou d'une régénération.
        </p>
        {newKey && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs">
            <code className="flex-1 overflow-x-auto">{newKey}</code>
            <button onClick={() => { navigator.clipboard.writeText(newKey); setCopied(true) }} className="shrink-0 text-slate-500 hover:text-slate-700">
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        )}
        {isAdmin && (
          <Button size="sm" variant="secondary" onClick={regenerateKey} disabled={regenerating}>
            {regenerating ? <Spinner size={14} /> : <KeyRound size={14} />} Régénérer la clé
          </Button>
        )}
      </Card>

      {isAdmin && (
        <Card className="space-y-3 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Webhook size={15} /> Synchronisation temps réel (webhook)
          </p>
          <p className="text-xs text-slate-500">
            LocaVision notifie cette URL (POST, signé HMAC-SHA256 dans l'en-tête X-LocaVision-Signature) à chaque
            véhicule créé/supprimé ou inspection terminée.
          </p>
          <div className="flex items-end gap-2">
            <Field label="URL du webhook (https://)" className="flex-1">
              <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://votre-crm.example.com/webhooks/locavision" />
            </Field>
            <Button size="sm" onClick={saveWebhook} disabled={savingWebhook}>
              {savingWebhook ? <Spinner size={14} className="text-white" /> : 'Enregistrer'}
            </Button>
          </div>
          {company.webhookSecret && (
            <p className="font-mono text-xs text-slate-400">Secret : {company.webhookSecret}</p>
          )}
        </Card>
      )}

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <FileText size={15} /> Facturation
        </p>
        {quotes === null ? (
          <Spinner />
        ) : quotes.length === 0 ? (
          <Card className="p-4 text-center text-sm text-slate-500">Aucun devis ou facture pour l'instant.</Card>
        ) : (
          <div className="space-y-2">
            {quotes.map((q) => (
              <Card key={q.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {q.pricingModel === 'flat' ? `${q.amount} € / an` : 'Tarif à l\'usage'}
                  </p>
                  <p className="text-xs text-slate-500">{new Date(q.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <span className={q.status === 'paid' ? 'text-sm font-medium text-status-good' : 'text-sm text-slate-500'}>
                  {q.status === 'paid' ? 'Payé' : q.status === 'draft' ? 'Devis' : q.status}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
