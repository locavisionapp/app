import { NavLink, Outlet } from 'react-router-dom'
import { ScanLine, Car, LogOut, Building2, BarChart3 } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { cn } from '../lib/cn'

const COMPANY_NAV = [
  { to: '/app/scan', label: 'Scanner', icon: ScanLine },
  { to: '/app/fleet', label: 'Ma flotte', icon: Car },
]

const ADMIN_NAV = [
  { to: '/admin/companies', label: 'Entreprises', icon: Building2 },
  { to: '/admin/usage', label: 'Appels API', icon: BarChart3 },
]

export default function AppLayout() {
  const { profile, logout } = useAuth()
  const isAdmin = profile?.role === 'platform_admin'
  const nav = isAdmin ? ADMIN_NAV : COMPANY_NAV

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Navigation latérale (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex">
        <p className="mb-6 px-2 text-lg font-bold text-brand-700">LocaVision</p>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div className="border-t border-slate-200 pt-3">
          <p className="truncate px-2 text-xs text-slate-400">{profile?.companyName || 'Administration'}</p>
          <button onClick={logout} className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Navigation basse (mobile) */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white md:hidden">
        {nav.map((item) => (
          <NavItem key={item.to} {...item} mobile />
        ))}
        <button onClick={logout} className="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs text-slate-500">
          <LogOut size={20} />
          Sortir
        </button>
      </nav>
    </div>
  )
}

function NavItem({ to, label, icon: Icon, mobile }) {
  if (mobile) {
    return (
      <NavLink
        to={to}
        className={({ isActive }) =>
          cn('flex flex-1 flex-col items-center gap-1 py-2.5 text-xs', isActive ? 'text-brand-600' : 'text-slate-500')
        }
      >
        <Icon size={20} />
        {label}
      </NavLink>
    )
  }
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn('flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium', isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100')
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  )
}
