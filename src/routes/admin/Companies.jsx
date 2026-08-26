import { useEffect, useState } from 'react'
import { Plus, Copy, Check, ChevronDown, ChevronUp, RefreshCw, Trash2, Ban, PlayCircle, Save } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { FullscreenSpinner, Spinner } from '../../components/ui/Spinner'
import { api } from '../../lib/api'

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

function CompanyRow({ company, onChange }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [monthlyFee, setMonthlyFee] = useState(company.monthlyFee ?? 0)
  const [newKey, setNewKey] = useState(null)

  async function toggleStatus() {
    setBusy(true)
    try {
      const next = company.status === 'active' ? 'suspended' : 'active'
      onChange(await api.updateCompanyStatus(company.id, next))
    } finally {
      setBusy(false)
    }
  }

  async function saveFee() {
    setBusy(true)
    try {
      onChange(await api.updateCompanyPricing(company.id, Number(monthlyFee) || 0))
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
          <p className="text-sm text-slate-500">{company.contactEmail}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <p className="font-medium text-slate-700">{company.apiCallCount ?? 0} appels API</p>
            <p className={company.status === 'active' ? 'text-status-good' : 'text-status-bad'}>
              {company.status === 'active' ? 'Actif' : 'Suspendu'}
            </p>
          </div>
          {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-6">
            {[
              ['Véhicules', company.vehicleCount ?? 0],
              ['Agences', company.agencyCount ?? 0],
              ['Villes', company.cityCount ?? 0],
              ['Appels API', company.apiCallCount ?? 0],
              ['Coût API est.', `${company.estimatedApiCostEur ?? 0} €`],
              ['Tarif / mois', `${company.monthlyFee ?? 0} €`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-2">
                <p className="text-sm font-semibold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-end gap-2">
            <Field label="Tarif mensuel (EUR)" className="flex-1">
              <Input type="number" min="0" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} />
            </Field>
            <Button size="sm" onClick={saveFee} disabled={busy}>
              {busy ? <Spinner size={14} className="text-white" /> : <Save size={14} />}
            </Button>
          </div>

          {newKey && <CopyField label="Nouvelle clé API (affichée une seule fois)" value={newKey} />}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={regenerateKey} disabled={busy}>
              <RefreshCw size={14} /> Régénérer la clé API
            </Button>
            <Button size="sm" variant="secondary" onClick={toggleStatus} disabled={busy}>
              {company.status === 'active' ? <Ban size={14} /> : <PlayCircle size={14} />}
              {company.status === 'active' ? 'Suspendre' : 'Réactiver'}
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
  const [form, setForm] = useState({ name: '', contactEmail: '' })
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
      const res = await api.createCompany(form)
      setCreated(res)
      setForm({ name: '', contactEmail: '' })
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
          <CopyField label="Clé API (affichée une seule fois)" value={created.apiKey} />
          {created.passwordSetupLink ? (
            <CopyField label="Lien de création de mot de passe — à envoyer à l'entreprise" value={created.passwordSetupLink} />
          ) : (
            <p className="text-xs text-status-bad">
              Le lien de création de mot de passe n'a pas pu être généré. Réinitialisez le mot de passe depuis la console Firebase.
            </p>
          )}
        </Card>
      )}

      {showForm && (
        <Card as="form" onSubmit={handleCreate} className="space-y-4 p-4">
          <Field label="Nom de l'entreprise">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email de contact">
            <Input type="email" required value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          </Field>
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
