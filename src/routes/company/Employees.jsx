import { useEffect, useState } from 'react'
import { Plus, Trash2, KeyRound, Shield, User } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { FullscreenSpinner, Spinner } from '../../components/ui/Spinner'
import { useAuth } from '../../lib/AuthContext'
import { api } from '../../lib/api'

export default function Employees() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'company_admin'
  const [employees, setEmployees] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', role: 'employee' })
  const [creating, setCreating] = useState(false)
  const [revealed, setRevealed] = useState(null) // { username, password } shown once

  function refresh() {
    api.listEmployees().then(setEmployees).catch(() => setEmployees([]))
  }

  useEffect(refresh, [])

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    try {
      await api.createEmployee(form)
      setRevealed({ username: form.username, password: form.password })
      setForm({ username: '', password: '', role: 'employee' })
      setShowForm(false)
      refresh()
    } finally {
      setCreating(false)
    }
  }

  async function toggleRole(emp) {
    const role = emp.role === 'company_admin' ? 'employee' : 'company_admin'
    await api.updateEmployee(emp.uid, { role })
    refresh()
  }

  async function toggleActive(emp) {
    await api.updateEmployee(emp.uid, { active: !emp.active })
    refresh()
  }

  async function resetPassword(emp) {
    const { password } = await api.resetEmployeePassword(emp.uid)
    setRevealed({ username: emp.username, password })
  }

  async function remove(emp) {
    if (!window.confirm(`Supprimer l'accès de "${emp.username}" ?`)) return
    await api.deleteEmployee(emp.uid)
    refresh()
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
            <Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </Field>
          <Field label="Mot de passe (8 caractères min.)">
            <Input type="text" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Rôle">
            <select className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="employee">Employé</option>
              <option value="company_admin">Administrateur</option>
            </select>
          </Field>
          <Button type="submit" disabled={creating}>
            {creating ? <Spinner size={16} className="text-white" /> : "Créer l'accès"}
          </Button>
        </Card>
      )}

      <div className="space-y-2">
        {employees.map((emp) => (
          <Card key={emp.uid} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                {emp.role === 'company_admin' ? <Shield size={16} /> : <User size={16} />}
              </div>
              <div>
                <p className="font-medium text-slate-900">{emp.username}</p>
                <p className="text-xs text-slate-500">
                  {emp.role === 'company_admin' ? 'Administrateur' : 'Employé'} · {emp.active === false ? 'Désactivé' : 'Actif'}
                </p>
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-1">
                <button onClick={() => resetPassword(emp)} title="Réinitialiser le mot de passe" className="p-2 text-slate-400 hover:text-brand-700">
                  <KeyRound size={16} />
                </button>
                <button onClick={() => toggleRole(emp)} title="Changer le rôle" className="p-2 text-slate-400 hover:text-brand-700">
                  <Shield size={16} />
                </button>
                <button onClick={() => toggleActive(emp)} className="px-2 text-xs text-slate-500 hover:text-brand-700">
                  {emp.active === false ? 'Activer' : 'Désactiver'}
                </button>
                <button onClick={() => remove(emp)} className="p-2 text-slate-400 hover:text-status-bad">
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
