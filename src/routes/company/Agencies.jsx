import { useEffect, useState } from 'react'
import { Plus, MapPin, Trash2 } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { FullscreenSpinner, Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../lib/AuthContext'
import { api } from '../../lib/api'

export default function Agencies() {
  const toast = useToast()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'company_admin'
  const [agencies, setAgencies] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', city: '', address: '' })
  const [saving, setSaving] = useState(false)

  function refresh() {
    api.listAgencies().then(setAgencies).catch((e) => {
      setAgencies([])
      toast.error(e)
    })
  }

  useEffect(refresh, [])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.createAgency(form)
      setForm({ name: '', city: '', address: '' })
      setShowForm(false)
      toast.success('Agence créée.')
      refresh()
    } catch (e) {
      toast.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer cette agence ? Les véhicules qui lui sont rattachés resteront dans la flotte, sans agence.')) return
    try {
      await api.deleteAgency(id)
      toast.success('Agence supprimée.')
      refresh()
    } catch (e) {
      toast.error(e)
    }
  }

  if (!agencies) return <FullscreenSpinner />

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Agences</h1>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Nouvelle agence
          </Button>
        )}
      </div>

      {showForm && (
        <Card as="form" onSubmit={handleCreate} className="space-y-4 p-4">
          <Field label="Nom de l'agence">
            <Input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex : Paris Centre" />
          </Field>
          <Field label="Ville">
            <Input required maxLength={120} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="Adresse (optionnel)">
            <Input maxLength={240} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Button type="submit" disabled={saving}>
            {saving ? <Spinner size={16} className="text-white" /> : "Créer l'agence"}
          </Button>
        </Card>
      )}

      {agencies.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">
          Aucune agence pour l'instant. Créez-en une pour organiser votre flotte par ville.
        </Card>
      ) : (
        <div className="space-y-2">
          {agencies.map((a) => (
            <Card key={a.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{a.name}</p>
                  <p className="text-sm text-slate-500">{a.city}{a.address ? ` · ${a.address}` : ''}</p>
                </div>
              </div>
              {isAdmin && (
                <button onClick={() => handleDelete(a.id)} className="p-2 text-slate-400 hover:text-status-bad" aria-label={`Supprimer ${a.name}`}>
                  <Trash2 size={18} />
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
