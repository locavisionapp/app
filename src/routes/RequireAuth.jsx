import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { FullscreenSpinner } from '../components/ui/Spinner'

export function RequireAuth({ role, children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullscreenSpinner />
  if (!user || !profile) return <Navigate to="/login" state={{ from: location }} replace />

  const isAdmin = profile.role === 'platform_admin'
  const allowed = role === 'platform_admin' ? isAdmin : role === 'company' ? !isAdmin : true

  if (!allowed) {
    return <Navigate to={isAdmin ? '/admin/companies' : '/app/scan'} replace />
  }
  return children
}
