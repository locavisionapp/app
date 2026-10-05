import { useState } from 'react'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { KeyRound, Eye, EyeOff } from 'lucide-react'
import { auth } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { Spinner } from '../components/ui/Spinner'
import { useToast } from '../components/ui/Toast'

const MIN_LENGTH = 10

function passwordError(e) {
  switch (e?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/invalid-login-credentials':
      return 'Mot de passe actuel incorrect.'
    case 'auth/weak-password':
      return 'Mot de passe trop faible.'
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Patientez quelques minutes.'
    case 'auth/network-request-failed':
      return 'Pas de connexion internet.'
    default:
      return 'Impossible de changer le mot de passe. Réessayez.'
  }
}

/** Self-service password change for any signed-in account (re-authenticates first, as Firebase requires). */
export default function Security() {
  const { profile } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const tooShort = form.next.length > 0 && form.next.length < MIN_LENGTH
  const mismatch = form.confirm.length > 0 && form.next !== form.confirm
  const sameAsOld = form.next.length > 0 && form.next === form.current
  const canSubmit = form.current && form.next.length >= MIN_LENGTH && form.next === form.confirm && !sameAsOld

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      const user = auth.currentUser
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, form.current))
      await updatePassword(user, form.next)
      setForm({ current: '', next: '', confirm: '' })
      toast.success('Mot de passe modifié.')
    } catch (err) {
      setError(passwordError(err))
    } finally {
      setSaving(false)
    }
  }

  const type = show ? 'text' : 'password'
  const isCompanyUser = profile?.role !== 'platform_admin'

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-bold text-slate-900">Sécurité</h1>
      <Card as="form" onSubmit={handleSubmit} className="space-y-4 p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <KeyRound size={15} /> Changer mon mot de passe
        </p>
        {/* Lets password managers associate the new password with the right account. */}
        <input type="text" name="username" autoComplete="username" value={auth.currentUser?.email || ''} readOnly hidden />
        <Field label="Mot de passe actuel">
          <Input type={type} required autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
        </Field>
        <Field label={`Nouveau mot de passe (${MIN_LENGTH} caractères min.)`} hint={tooShort ? 'Trop court.' : sameAsOld ? "Identique à l'actuel." : null}>
          <Input type={type} required minLength={MIN_LENGTH} autoComplete="new-password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
        </Field>
        <Field label="Confirmer le nouveau mot de passe" hint={mismatch ? 'Les deux mots de passe ne correspondent pas.' : null}>
          <Input type={type} required autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </Field>
        <button type="button" onClick={() => setShow(!show)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-700">
          {show ? <EyeOff size={14} /> : <Eye size={14} />} {show ? 'Masquer' : 'Afficher'} les mots de passe
        </button>
        {error && <div className="rounded-xl bg-status-badBg px-4 py-3 text-sm text-status-bad">{error}</div>}
        <Button type="submit" className="w-full" disabled={!canSubmit || saving}>
          {saving ? <Spinner size={16} className="text-white" /> : 'Enregistrer le nouveau mot de passe'}
        </Button>
      </Card>
      {isCompanyUser && (
        <p className="text-xs text-slate-500">
          Mot de passe oublié ? Un administrateur de votre entreprise peut le réinitialiser depuis l'onglet Employés.
        </p>
      )}
    </div>
  )
}
