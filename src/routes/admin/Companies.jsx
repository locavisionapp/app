import { useEffect, useState } from 'react'
import { Plus, Copy, Check } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { FullscreenSpinner, Spinner } from '../../components/ui/Spinner'
import { api } from '../../lib/api'

export default function Companies() {
  const [companies, setCompanies] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', contactEmail: '' })
  const [creating, setCreating] = useState(false)
  const [newApiKey, setNewApiKey] = useState(null)
  const [copied, setCopied] = useState(false)

  function refresh() {
    api.listCompanies().then(setCompanies).catch(() => setCompanies([]))
  }

  useEffect(refresh, [])

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await api.createCompany(form)
      setNewApiKey(res.apiKey)
      setForm({ name: '', contactEmail: '' })
      setShowForm(false)
      refresh()
    } finally {
      setCreating(false)
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

      {newApiKey && (
        <Card className="space-y-2 border-status-good bg-status-goodBg p-4">
          <p className="text-sm font-semibold text-status-good">Compte créé. Clé API (affichée une seule fois) :</p>
          <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 font-mono text-sm">
            <code className="flex-1 overflow-x-auto">{newApiKey}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newApiKey)
                setCopied(true)
              }}
              className="shrink-0 text-slate-500 hover:text-slate-700"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
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
          <Card key={c.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-semibold text-slate-900">{c.name}</p>
              <p className="text-sm text-slate-500">{c.contactEmail}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium text-slate-700">{c.apiCallCount ?? 0} appels API</p>
              <p className="text-slate-400">{c.status === 'active' ? 'Actif' : 'Suspendu'}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
