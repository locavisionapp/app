import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { RequireAuth } from './routes/RequireAuth'
import AppLayout from './routes/AppLayout'
import Landing from './routes/Landing'
import Login from './routes/Login'
import { FullscreenSpinner } from './components/ui/Spinner'

// Code-split the authenticated app views: a first-time visitor only needs
// the landing page + login bundle, not the camera/inspection/admin code.
const Scan = lazy(() => import('./routes/company/Scan'))
const Fleet = lazy(() => import('./routes/company/Fleet'))
const VehicleDetail = lazy(() => import('./routes/company/VehicleDetail'))
const Agencies = lazy(() => import('./routes/company/Agencies'))
const Companies = lazy(() => import('./routes/admin/Companies'))
const ApiUsage = lazy(() => import('./routes/admin/ApiUsage'))

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<FullscreenSpinner />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />

            <Route
              element={
                <RequireAuth role="company">
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route path="/app" element={<Navigate to="/app/scan" replace />} />
              <Route path="/app/scan" element={<Scan />} />
              <Route path="/app/fleet" element={<Fleet />} />
              <Route path="/app/vehicles/:id" element={<VehicleDetail />} />
              <Route path="/app/agencies" element={<Agencies />} />
            </Route>

            <Route
              element={
                <RequireAuth role="platform_admin">
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route path="/admin" element={<Navigate to="/admin/companies" replace />} />
              <Route path="/admin/companies" element={<Companies />} />
              <Route path="/admin/usage" element={<ApiUsage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
