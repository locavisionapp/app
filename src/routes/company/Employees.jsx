import { useEffect, useState } from 'react'
import { Plus, Trash2, KeyRound, Shield, User } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input, PasswordInput } from '../../components/ui/Field'
import { FullscreenSpinner, Spinner } from '../../components/ui/Spinner'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { api } from '../../lib/api'

export default function Employees() {
  const { profile } = useAuth()
  const toast = useToast()
  const isAdmin = profile?.role === 'company_admin'
  const [employees, setEmployees] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username: '', password: '' })
  const [creating, setCreating] = useState(false)
  const [revealed, setRevealed] = useState(null) // { username, password } shown once

  function refresh() {
    api.listEmployees().then(setEmployees).catch((e) => {
      setEmployees([])
      toast.error(e)
    })
  }

  useEffect(refresh, [])

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    try {
      await api.createEmployee(form)
      setRevealed({ username: form.username, password: form.password })
      setForm({ username: '', password: '' })
      setShowForm(false)
      refresh()
    } catch (e) {
      toast.error(e)
    } finally {
      setCreating(false)
    }
  }

  // Wraps a row action: refresh on success, toast on failure.
  async function act(fn, successMessage) {
    try {
      await fn()
      if (successMessage) toast.success(successMessage)
      refresh()
    } catch (e) {
      toast.error(e)
    }
  }

  async function toggleActive(emp) {
    const active = emp.active === false
    await act(() => api.updateEmployee(emp.uid, { active }), active ? 'Accès réactivé.' : 'Accès désactivé.')
  }

  async function resetPassword(emp) {
    if (!window.confirm(`Générer un nouveau mot de passe pour "${emp.username}" ? L'ancien ne fonctionnera plus.`)) return
    try {
      const { password } = await api.resetEmployeePassword(emp.uid)
      setRevealed({ username: emp.username, password })
    } catch (e) {
      toast.error(e)
    }
  }

  async function remove(emp) {
    if (!window.confirm(`Supprimer l'accès de "${emp.username}" ?`)) return
    await act(() => api.deleteEmployee(emp.uid), 'Accès supprimé.')
  }

  if (!employees) return <FullscreenSpinner />

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Employés</h1>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Nouvel accès
          </Button>
        )}
      </div>

      {revealed && (
        <Card className="space-y-1 border-status-good bg-status-goodBg p-4 text-sm">
          <p className="font-semibold text-status-good">Identifiants (affichés une seule fois) :</p>
          <p>Utilisateur : <span className="font-mono">{revealed.username}</span></p>
          <p>Mot de passe : <span className="font-mono">{revealed.password}</span></p>
        </Card>
      )}

      {showForm && (
        <Card as="form" onSubmit={handleCreate} className="space-y-4 p-4">
          <Field label="Nom d'utilisateur">
            <Input
              required
              pattern="[a-zA-Z0-9._\-]{3,30}"
              title="3 à 30 caractères : lettres, chiffres, point, tiret, tiret bas"
              autoCapitalize="none"
              autoCorrect="off"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
            />
          </Field>
          <Field label="Mot de passe (8 caractères min.)">
            <PasswordInput required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <p className="text-xs text-slate-500">L'accès est créé avec le rôle Employé (scan, inspections, flotte). Le compte administrateur est unique.</p>
          <Button type="submit" disabled={creating}>
            {creating ? <Spinner size={16} className="text-white" /> : "Créer l'accès"}
          </Button>
        </Card>
      )}

      <div className="space-y-2">
        {[...employees].sort((a, b) => (a.role === 'company_admin' ? -1 : b.role === 'company_admin' ? 1 : 0)).map((emp) => (
          <Card key={emp.uid} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                {emp.role === 'company_admin' ? <Shield size={16} /> : <User size={16} />}
              </div>
              <div>
                <p className="font-medium text-slate-900">{emp.username}</p>
                <p className="text-xs text-slate-500">
                  {emp.role === 'company_admin' ? 'Administrateur · compte principal' : `Employé · ${emp.active === false ? 'Désactivé' : 'Actif'}`}
                </p>
              </div>
            </div>
            {isAdmin && emp.role !== 'company_admin' && (
              <div className="flex items-center gap-1">
                <button onClick={() => resetPassword(emp)} title="Réinitialiser le mot de passe" className="p-2 text-slate-400 hover:text-brand-700">
                  <KeyRound size={16} />
                </button>
                <button onClick={() => toggleActive(emp)} className="px-2 text-xs text-slate-500 hover:text-brand-700">
                  {emp.active === false ? 'Activer' : 'Désactiver'}
                </button>
                <button onClick={() => remove(emp)} className="p-2 text-slate-400 hover:text-status-bad" aria-label={`Supprimer ${emp.username}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
