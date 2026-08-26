import { useEffect, useState } from 'react'
import { Plus, Copy, Check, ChevronDown, ChevronUp, RefreshCw, Trash2, Ban, PlayCircle, FileText, CircleDollarSign } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { FullscreenSpinner, Spinner } from '../../components/ui/Spinner'
import { api } from '../../lib/api'

const ALL_MODULES = [
  { id: 'scan', label: 'Scan & inspection IA' },
  { id: 'fleet', label: 'Gestion de flotte' },
  { id: 'agencies', label: 'Agences multi-villes' },
  { id: 'api', label: 'Accès API (clé)' },
]

const STATUS_LABELS = { active: 'Actif', trial: "Essai", suspended: 'Suspendu', expired: 'Expiré' }
const STATUS_COLORS = { active: 'text-status-good', trial: 'text-status-warn', suspended: 'text-status-bad', expired: 'text-status-bad' }

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false)
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-1 flex items-center gap-2 rounded-lg bg-white px-3 py-2 font-mono text-xs">
        <code className="flex-1 overflow-x-auto whitespace-nowrap">{value}</code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="shrink-0 text-slate-500 hover:text-slate-700"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  )
}

function QuotesPanel({ companyId }) {
  const [quotes, setQuotes] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ pricingModel: 'flat', amount: 0, maxAgencies: '', maxVehicles: '', maxScansPerMonth: '', notes: '' })
  const [busy, setBusy] = useState(false)

  function refresh() {
    api.listCompanyQuotes(companyId).then(setQuotes).catch(() => setQuotes([]))
  }
  useEffect(refresh, [companyId])

  async function createQuote(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await api.createCompanyQuote(companyId, {
        pricingModel: form.pricingModel,
        amount: Number(form.amount) || 0,
        limits: {
          maxAgencies: form.maxAgencies ? Number(form.maxAgencies) : null,
          maxVehicles: form.maxVehicles ? Number(form.maxVehicles) : null,
          maxScansPerMonth: form.maxScansPerMonth ? Number(form.maxScansPerMonth) : null,
        },
        notes: form.notes,
      })
      setShowForm(false)
      refresh()
    } finally {
      setBusy(false)
    }
  }

  async function markPaid(quoteId) {
    const paymentReference = window.prompt('Référence du virement reçu (optionnel) :') || ''
    setBusy(true)
    try {
      await api.markQuotePaid(companyId, quoteId, { paymentReference })
      refresh()
    } finally {
      setBusy(false)
    }
  }

  if (quotes === null) return <Spinner size={16} />

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <FileText size={13} /> Devis & factures
        </p>
        <button onClick={() => setShowForm(!showForm)} className="text-xs font-medium text-brand-700 hover:underline">
          + Nouveau devis
        </button>
      </div>

      {showForm && (
        <form onSubmit={createQuote} className="space-y-2 rounded-xl border border-slate-200 p-3">
          <div className="flex gap-2">
            <select
              className="h-9 flex-1 rounded-lg border border-slate-300 px-2 text-sm"
              value={form.pricingModel}
              onChange={(e) => setForm({ ...form, pricingModel: e.target.value })}
            >
              <option value="flat">Forfait annuel</option>
              <option value="usage">À l'usage (dégressif, à négocier)</option>
            </select>
            {form.pricingModel === 'flat' && (
              <Input type="number" min="0" placeholder="Montant € / an" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-32" />
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input type="number" min="0" placeholder="Max agences" value={form.maxAgencies} onChange={(e) => setForm({ ...form, maxAgencies: e.target.value })} />
            <Input type="number" min="0" placeholder="Max véhicules" value={form.maxVehicles} onChange={(e) => setForm({ ...form, maxVehicles: e.target.value })} />
            <Input type="number" min="0" placeholder="Max scans/mois" value={form.maxScansPerMonth} onChange={(e) => setForm({ ...form, maxScansPerMonth: e.target.value })} />
          </div>
          <Input placeholder="Notes (optionnel)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button size="sm" type="submit" disabled={busy}>{busy ? <Spinner size={14} className="text-white" /> : 'Créer le devis'}</Button>
        </form>
      )}

      {quotes.length === 0 ? (
        <p className="text-xs text-slate-400">Aucun devis pour l'instant.</p>
      ) : (
        quotes.map((q) => (
          <div key={q.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm">
            <div>
              <p className="font-medium text-slate-900">
                {q.pricingModel === 'flat' ? `${q.amount} € / an` : "Tarif à l'usage"}
              </p>
              <p className="text-xs text-slate-500">
                {q.limits?.maxVehicles ? `${q.limits.maxVehicles} véh. max · ` : ''}
                {q.limits?.maxAgencies ? `${q.limits.maxAgencies} agences max · ` : ''}
                {q.limits?.maxScansPerMonth ? `${q.limits.maxScansPerMonth} scans/mois max` : ''}
              </p>
            </div>
            {q.status === 'paid' ? (
              <span className="text-xs font-medium text-status-good">Payé le {new Date(q.paidAt).toLocaleDateString('fr-FR')}</span>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => markPaid(q.id)} disabled={busy}>
                <CircleDollarSign size={14} /> Marquer payé
              </Button>
            )}
          </div>
        ))
      )}
    </div>
  )
}

function CompanyRow({ company, onChange }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [modules, setModules] = useState(company.enabledModules || ['scan', 'fleet', 'agencies', 'api'])
  const [newKey, setNewKey] = useState(null)

  async function toggleStatus() {
    setBusy(true)
    try {
      const next = company.status === 'suspended' ? 'active' : 'suspended'
      onChange(await api.updateCompanyStatus(company.id, next))
    } finally {
      setBusy(false)
    }
  }

  function toggleModule(id) {
    const next = modules.includes(id) ? modules.filter((m) => m !== id) : [...modules, id]
    setModules(next)
  }

  async function saveModules() {
    setBusy(true)
    try {
      onChange(await api.updateCompanyModules(company.id, modules))
    } finally {
      setBusy(false)
    }
  }

  async function regenerateKey() {
    if (!window.confirm("Régénérer la clé API ? L'ancienne clé cessera de fonctionner immédiatement.")) return
    setBusy(true)
    try {
      const { apiKey } = await api.regenerateCompanyApiKey(company.id)
      setNewKey(apiKey)
    } finally {
      setBusy(false)
    }
  }

  async function deleteCompany() {
    if (!window.confirm(`Supprimer définitivement "${company.name}" ? Toute sa flotte, ses agences et son historique seront effacés. Action irréversible.`)) return
    setBusy(true)
    try {
      await api.deleteCompany(company.id)
      onChange(null, company.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-4">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen(!open)}>
        <div>
          <p className="font-semibold text-slate-900">{company.name}</p>
          <p className="text-sm text-slate-500">{company.slug} · {company.contactEmail}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <p className="font-medium text-slate-700">{company.apiCallCount ?? 0} appels API</p>
            <p className={STATUS_COLORS[company.status] || 'text-slate-400'}>{STATUS_LABELS[company.status] || company.status}</p>
          </div>
          {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-5">
            {[
              ['Véhicules', company.vehicleCount ?? 0],
              ['Agences', company.agencyCount ?? 0],
              ['Villes', company.cityCount ?? 0],
              ['Appels API', company.apiCallCount ?? 0],
              ['Coût API est.', `${company.estimatedApiCostEur ?? 0} €`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-2">
                <p className="text-sm font-semibold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {company.license && (
            <p className="text-xs text-slate-500">
              Licence active : {company.license.amount ? `${company.license.amount} € / an` : "tarif à l'usage"} · jusqu'au{' '}
              {new Date(company.license.endsAt).toLocaleDateString('fr-FR')}
            </p>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Modules activés</p>
            <div className="flex flex-wrap gap-3">
              {ALL_MODULES.map((m) => (
                <label key={m.id} className="flex items-center gap-1.5 text-sm text-slate-700">
                  <input type="checkbox" checked={modules.includes(m.id)} onChange={() => toggleModule(m.id)} />
                  {m.label}
                </label>
              ))}
            </div>
            <Button size="sm" className="mt-2" onClick={saveModules} disabled={busy}>Enregistrer les modules</Button>
          </div>

          <QuotesPanel companyId={company.id} />

          {newKey && <CopyField label="Nouvelle clé API (affichée une seule fois)" value={newKey} />}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={regenerateKey} disabled={busy}>
              <RefreshCw size={14} /> Régénérer la clé API
            </Button>
            <Button size="sm" variant="secondary" onClick={toggleStatus} disabled={busy}>
              {company.status !== 'suspended' ? <Ban size={14} /> : <PlayCircle size={14} />}
              {company.status !== 'suspended' ? 'Suspendre' : 'Réactiver'}
            </Button>
            <Button size="sm" variant="danger" onClick={deleteCompany} disabled={busy}>
              <Trash2 size={14} /> Supprimer
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

export default function Companies() {
  const [companies, setCompanies] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', contactEmail: '', slug: '', initialUsername: 'admin', trialDays: '' })
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(null)

  function refresh() {
    api.listCompanies().then(setCompanies).catch(() => setCompanies([]))
  }

  useEffect(refresh, [])

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await api.createCompany({ ...form, trialDays: form.trialDays ? Number(form.trialDays) : undefined })
      setCreated(res)
      setForm({ name: '', contactEmail: '', slug: '', initialUsername: 'admin', trialDays: '' })
      setShowForm(false)
      refresh()
    } finally {
      setCreating(false)
    }
  }

  function handleRowChange(updated, deletedId) {
    if (deletedId) {
      setCompanies((cs) => cs.filter((c) => c.id !== deletedId))
    } else {
      setCompanies((cs) => cs.map((c) => (c.id === updated.id ? updated : c)))
    }
  }

  if (!companies) return <FullscreenSpinner />

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Entreprises</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Nouveau compte
        </Button>
      </div>

      {created && (
        <Card className="space-y-3 border-status-good bg-status-goodBg p-4">
          <p className="text-sm font-semibold text-status-good">Compte "{created.name}" créé.</p>
          <CopyField label="Identifiant entreprise" value={created.slug} />
          <CopyField label="Nom d'utilisateur" value={created.username} />
          <CopyField label="Mot de passe initial (affiché une seule fois)" value={created.initialPassword} />
          <CopyField label="Clé API (affichée une seule fois)" value={created.apiKey} />
        </Card>
      )}

      {showForm && (
        <Card as="form" onSubmit={handleCreate} className="space-y-4 p-4">
          <Field label="Nom de l'entreprise">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Identifiant de connexion (optionnel, généré depuis le nom sinon)">
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="ex : acme-location" />
          </Field>
          <Field label="Email de contact">
            <Input type="email" required value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom d'utilisateur admin">
              <Input value={form.initialUsername} onChange={(e) => setForm({ ...form, initialUsername: e.target.value })} />
            </Field>
            <Field label="Jours d'essai (0 = licence immédiate)">
              <Input type="number" min="0" value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: e.target.value })} placeholder="0" />
            </Field>
          </div>
          <Button type="submit" disabled={creating}>
            {creating ? <Spinner size={16} className="text-white" /> : 'Créer le compte'}
          </Button>
        </Card>
      )}

      <div className="space-y-2">
        {companies.map((c) => (
          <CompanyRow key={c.id} company={c} onChange={handleRowChange} />
        ))}
      </div>
    </div>
  )
}
