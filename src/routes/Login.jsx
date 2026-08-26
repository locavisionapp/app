import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ScanLine, ShieldCheck } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { Spinner } from '../components/ui/Spinner'
import { BackButton } from '../components/ui/BackButton'
import { synthesizeEmail } from '../lib/companyAuth'

export default function Login() {
  const { user, profile, login, error } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState('company') // company | admin
  const [slug, setSlug] = useState('')
  const [username, setUsername] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user && profile) {
    const to = profile.role === 'platform_admin' ? '/admin/companies' : '/app/scan'
    return <Navigate to={location.state?.from?.pathname || to} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    const email = mode === 'company' ? synthesizeEmail(slug, username) : adminEmail
    await login(email, password)
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600 p-4">
      <div className="w-full max-w-sm">
        <BackButton to="/" label="Retour à l'accueil" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white" />
        <Card className="w-full p-6 shadow-xl">
          <div className="mb-6 flex items-center gap-2 text-brand-700">
            <ScanLine size={24} />
            <span className="text-lg font-bold">LocaVision</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'company' ? (
              <>
                <Field label="Identifiant entreprise">
                  <Input required value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ex : acme-location" autoComplete="organization" />
                </Field>
                <Field label="Nom d'utilisateur">
                  <Input required value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
                </Field>
              </>
            ) : (
              <Field label="Email">
                <Input type="email" required value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} autoComplete="username" />
              </Field>
            )}
            <Field label="Mot de passe">
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </Field>
            {error && <p className="text-sm text-status-bad">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? <Spinner size={18} className="text-white" /> : 'Se connecter'}
            </Button>
          </form>

          <button
            onClick={() => setMode(mode === 'company' ? 'admin' : 'company')}
            className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600"
          >
            <ShieldCheck size={13} />
            {mode === 'company' ? 'Connexion administration LocaVision' : "Connexion entreprise"}
          </button>

          <p className="mt-4 text-center text-xs text-slate-400">
            Pas encore de compte entreprise ? Contactez l'équipe LocaVision pour l'ouverture de votre accès.
          </p>
        </Card>
      </div>
    </div>
  )
}
