import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { RequireAuth } from './routes/RequireAuth'
import AppLayout from './routes/AppLayout'
import Landing from './routes/Landing'
import Login from './routes/Login'
import Legal from './routes/legal/Legal'
import { FullscreenSpinner } from './components/ui/Spinner'
import { ToastProvider } from './components/ui/Toast'

// Code-split the authenticated app views: a first-time visitor only needs
// the landing page + login bundle, not the camera/inspection/admin code.
const Scan = lazy(() => import('./routes/company/Scan'))
const Fleet = lazy(() => import('./routes/company/Fleet'))
const VehicleDetail = lazy(() => import('./routes/company/VehicleDetail'))
const Agencies = lazy(() => import('./routes/company/Agencies'))
const Employees = lazy(() => import('./routes/company/Employees'))
const Account = lazy(() => import('./routes/company/Account'))
const Docs = lazy(() => import('./routes/company/Docs'))
const Companies = lazy(() => import('./routes/admin/Companies'))
const ApiUsage = lazy(() => import('./routes/admin/ApiUsage'))
const Security = lazy(() => import('./routes/Security'))
const Activity = lazy(() => import('./routes/company/Activity'))
const Pricing = lazy(() => import('./routes/admin/Pricing'))
const BillingSettings = lazy(() => import('./routes/admin/BillingSettings'))

// Remount the scan flow on every navigation to /app/scan, so "Nouveau scan"
// from the result screen (same URL) starts over instead of doing nothing.
function ScanRoute() {
  const location = useLocation()
  return <Scan key={location.key} />
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<FullscreenSpinner />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/legal/:doc" element={<Legal />} />

              <Route
                element={
                  <RequireAuth role="company">
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route path="/app" element={<Navigate to="/app/scan" replace />} />
                <Route path="/app/scan" element={<ScanRoute />} />
                <Route path="/app/fleet" element={<Fleet />} />
                <Route path="/app/vehicles/:id" element={<VehicleDetail />} />
                <Route path="/app/agencies" element={<Agencies />} />
                <Route path="/app/employees" element={<Employees />} />
                <Route path="/app/account" element={<Account />} />
                <Route path="/app/docs" element={<Docs />} />
                <Route path="/app/security" element={<Security />} />
                <Route path="/app/activity" element={<Activity />} />
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
                <Route path="/admin/pricing" element={<Pricing />} />
                <Route path="/admin/settings" element={<BillingSettings />} />
                <Route path="/admin/security" element={<Security />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
