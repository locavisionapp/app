import { useEffect, useState } from 'react'
import { KeyRound, Copy, Check, Webhook, FileText } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { FullscreenSpinner, Spinner } from '../../components/ui/Spinner'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { api, saveBlob } from '../../lib/api'

const eur = (n) => `${Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

const STATUS_LABELS = {
  active: { label: 'Actif', className: 'text-status-good' },
  trial: { label: "Période d'essai", className: 'text-status-warn' },
  suspended: { label: 'Suspendu', className: 'text-status-bad' },
  expired: { label: 'Expiré', className: 'text-status-bad' },
}

export default function Account() {
  const { profile } = useAuth()
  const toast = useToast()
  const isAdmin = profile?.role === 'company_admin'
  const [loadError, setLoadError] = useState(null)
  const [company, setCompany] = useState(null)
  const [quotes, setQuotes] = useState(null)
  const [newKey, setNewKey] = useState(null)
  const [copied, setCopied] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [downloading, setDownloading] = useState(null)

  async function downloadQuote(q) {
    setDownloading(q.id)
    try {
      saveBlob(await api.getMyQuotePdf(q.id), `${q.status === 'paid' && q.invoiceNumber ? q.invoiceNumber : q.number || 'devis'}.pdf`)
    } catch (e) {
      toast.error(e)
    } finally {
      setDownloading(null)
    }
  }

  function refresh() {
    setLoadError(null)
    api
      .getMyCompany()
      .then((c) => {
        setCompany(c)
        setWebhookUrl(c.webhookUrl || '')
      })
      .catch((e) => setLoadError(e.message))
    api.getMyQuotes().then(setQuotes).catch(() => setQuotes([]))
  }

  useEffect(refresh, [])

  async function regenerateKey() {
    if (!window.confirm("Régénérer la clé API ? L'ancienne cessera de fonctionner immédiatement.")) return
    setRegenerating(true)
    try {
      const { apiKey } = await api.regenerateMyApiKey()
      setNewKey(apiKey)
      setCopied(false)
      refresh()
    } catch (e) {
      toast.error(e)
    } finally {
      setRegenerating(false)
    }
  }

  async function saveWebhook() {
    setSavingWebhook(true)
    try {
      await api.updateMyWebhook(webhookUrl.trim())
      toast.success(webhookUrl.trim() ? 'Webhook enregistré.' : 'Webhook désactivé.')
      refresh()
    } catch (e) {
      toast.error(e)
    } finally {
      setSavingWebhook(false)
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <Card className="space-y-3 p-8 text-center text-sm">
          <p className="text-status-bad">{loadError}</p>
          <Button size="sm" variant="secondary" onClick={refresh}>Réessayer</Button>
        </Card>
      </div>
    )
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
            Licence annuelle · {company.license.amount ? `${eur(company.license.amount)} HT / an` : 'tarif à l\'usage'} · renouvellement le{' '}
            {new Date(company.license.endsAt).toLocaleDateString('fr-FR')}
          </p>
        )}
      </Card>

      <Card className="p-4 text-center">
        <p className="text-lg font-bold text-slate-900">{(company.apiCallCount ?? 0).toLocaleString('fr-FR')}</p>
        <p className="text-xs text-slate-500">Appels API (total)</p>
      </Card>

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
            <button
              onClick={() =>
                navigator.clipboard
                  .writeText(newKey)
                  .then(() => setCopied(true))
                  .catch(() => toast.error('Copie impossible : sélectionnez la clé et copiez-la manuellement.'))
              }
              className="shrink-0 text-slate-500 hover:text-slate-700"
              aria-label="Copier la clé"
            >
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
              <Input type="url" inputMode="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://votre-crm.example.com/webhooks/locavision" />
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
            {quotes.map((q) => {
              const isInvoice = q.status === 'paid' && q.invoiceNumber
              const expired = q.status === 'draft' && q.validUntil && q.validUntil < Date.now()
              return (
                <Card key={q.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {isInvoice ? `Facture ${q.invoiceNumber}` : `Devis ${q.number || ''}`} · {eur(q.totalTTC ?? q.amount)} TTC / an
                    </p>
                    <p className="text-xs text-slate-500">
                      {isInvoice
                        ? `Payée le ${new Date(q.paidAt).toLocaleDateString('fr-FR')}`
                        : expired
                          ? `Expiré le ${new Date(q.validUntil).toLocaleDateString('fr-FR')} — contactez LocaVision`
                          : `Émis le ${new Date(q.createdAt).toLocaleDateString('fr-FR')}${q.validUntil ? ` · valable jusqu'au ${new Date(q.validUntil).toLocaleDateString('fr-FR')}` : ''}`}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => downloadQuote(q)} disabled={downloading === q.id}>
                    {downloading === q.id ? <Spinner size={14} /> : <FileText size={14} />} PDF
                  </Button>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
