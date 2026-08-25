import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { RequireAuth } from './routes/RequireAuth'
import AppLayout from './routes/AppLayout'
import Landing from './routes/Landing'
import Login from './routes/Login'
import Scan from './routes/company/Scan'
import Fleet from './routes/company/Fleet'
import VehicleDetail from './routes/company/VehicleDetail'
import Companies from './routes/admin/Companies'
import ApiUsage from './routes/admin/ApiUsage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  )
}
