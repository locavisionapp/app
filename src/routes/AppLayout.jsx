import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ScanLine, Car, LogOut, Building2, BarChart3, MapPin, Users, UserCog, BookOpen, MoreHorizontal, X } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { cn } from '../lib/cn'

const ADMIN_NAV = [
  { to: '/admin/companies', label: 'Entreprises', icon: Building2 },
  { to: '/admin/usage', label: 'Appels API', icon: BarChart3 },
]

function companyNav(enabledModules) {
  const modules = enabledModules || ['scan', 'fleet', 'agencies', 'api']
  return [
    { to: '/app/scan', label: 'Scanner', icon: ScanLine, primary: true, hidden: !modules.includes('scan') },
    { to: '/app/fleet', label: 'Ma flotte', icon: Car, primary: true, hidden: !modules.includes('fleet') },
    { to: '/app/agencies', label: 'Agences', icon: MapPin, hidden: !modules.includes('agencies') },
    { to: '/app/employees', label: 'Employés', icon: Users },
    { to: '/app/account', label: 'Mon compte', icon: UserCog },
    { to: '/app/docs', label: 'Documentation', icon: BookOpen },
  ].filter((item) => !item.hidden)
}

export default function AppLayout() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = profile?.role === 'platform_admin'
  const nav = isAdmin ? ADMIN_NAV : companyNav(profile?.enabledModules)
  const primaryMobileNav = isAdmin ? nav : nav.filter((i) => i.primary)
  const secondaryNav = isAdmin ? [] : nav.filter((i) => !i.primary)
  const [showMore, setShowMore] = useState(false)

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop side navigation */}
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

      {/* Mobile bottom navigation */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white md:hidden">
        {primaryMobileNav.map((item) => (
          <NavItem key={item.to} {...item} mobile />
        ))}
        {secondaryNav.length > 0 && (
          <button onClick={() => setShowMore(true)} className="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs text-slate-500">
            <MoreHorizontal size={20} />
            Plus
          </button>
        )}
        <button onClick={logout} className="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs text-slate-500">
          <LogOut size={20} />
          Sortir
        </button>
      </nav>

      {showMore && (
        <div className="fixed inset-0 z-20 flex items-end bg-black/40 md:hidden" onClick={() => setShowMore(false)}>
          <div className="safe-bottom w-full rounded-t-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold text-slate-900">Plus</p>
              <button onClick={() => setShowMore(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            <div className="space-y-1">
              {secondaryNav.map((item) => (
                <button
                  key={item.to}
                  onClick={() => { setShowMore(false); navigate(item.to) }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <item.icon size={18} /> {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
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
