import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  BarChart3,
  Calendar,
  Car,
  Users,
  Briefcase,
  UserCircle,
  Settings,
  Menu,
  X,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  MapPin,
  Activity,
  MessageSquare,
  FileText,
  Target,
  AlertCircle
} from 'lucide-react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  getUser,
  getAgenciesByCompany,
  getAgency,
  getAdvancedStats
} from './services/firestore';
import LandingPage from './pages/LandingPage';
import AuthForm from './components/AuthForm';
import Dashboard from './pages/Dashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import CommercialDashboard from './pages/CommercialDashboard';
import CompanyDashboard from './pages/CompanyDashboard';
import Vehicles from './pages/Vehicles';
import Clients from './pages/Clients';
import Rentals from './pages/Rentals';
import Maintenance from './pages/Maintenance';
import Analytics from './pages/Analytics';
import Employees from './pages/Employees';
import Agencies from './pages/Agencies';
import SettingsPage from './pages/Settings';
import AgencySetup from './components/AgencySetup';
import InspectionWizard from './components/InspectionWizard';
import SyncManager from './components/SyncManager';
import Commercials from './pages/Commercials';
import Companies from './pages/Companies';
import Objectives from './pages/Objectives';
import Messages from './pages/Messages';
import Documents from './pages/Documents';
import Alerts from './pages/Alerts';
import Logs from './pages/Logs';

const App = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [agency, setAgency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showAgencySetup, setShowAgencySetup] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentAgency, setCurrentAgency] = useState(null);
  const [agenciesList, setAgenciesList] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return JSON.parse(saved);
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pageData, setPageData] = useState(null);

  // Role-based allowed pages
  const getAllowedPages = (role) => {
    const isSuperAdmin = ['SuperAdmin', 'super_admin', 'Administrateur'].includes(role);
    const isCommercial = ['Commercial', 'commercial'].includes(role);
    const isCompanyAdmin = ['Entreprise', 'entreprise', 'company_admin', 'company_agent'].includes(role);
    
    if (isSuperAdmin) return ['dashboard', 'stats', 'commercials', 'logs', 'settings'];
    if (isCommercial) return ['dashboard', 'objectives', 'companies', 'messages', 'settings'];
    if (isCompanyAdmin) return ['dashboard', 'stats', 'rentals', 'vehicles', 'inspection', 'clients', 'maintenance', 'settings', 'agencies', 'employees', 'documents', 'alerts'];
    return ['dashboard'];
  };

  // Role-based default page
  const getDefaultPage = (role) => {
    const isSuperAdmin = ['SuperAdmin', 'super_admin', 'Administrateur'].includes(role);
    const isCommercial = ['Commercial', 'commercial'].includes(role);
    if (isSuperAdmin || isCommercial) return 'dashboard';
    return 'dashboard';
  };

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userProfile = await getUser(user.uid);
        setProfile(userProfile);
        
        // Validate current page is allowed, switch to default if not
        const allowedPages = getAllowedPages(userProfile?.role);
        if (!allowedPages.includes(currentPage)) {
          setCurrentPage(getDefaultPage(userProfile?.role));
        }
        
        if (userProfile?.agencyId) {
          const agencyData = await getAgency(userProfile.agencyId);
          setAgency(agencyData);
        }
        let agencies = [];
        if (userProfile?.companyId) {
          agencies = await getAgenciesByCompany(userProfile.companyId);
          setAgenciesList(agencies);
          if (agencies.length > 0 && !currentAgency) {
            setCurrentAgency(agencies[0].id);
          }
        }
        if (
          userProfile &&
          !userProfile.hasAgency &&
          !userProfile.agencyId &&
          agencies.length === 0 && // Only show setup if NO agencies exist yet for the company
          (['company_admin', 'company_agent'].includes(userProfile.role))
        ) {
          setShowAgencySetup(true);
        }
      } else {
        setProfile(null);
        setAgency(null);
        setAgenciesList([]);
        setCurrentAgency(null);
        setShowAgencySetup(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);
  
  // Also update allowed pages when profile changes (just in case)
  useEffect(() => {
    if (profile) {
      const allowedPages = getAllowedPages(profile.role);
      if (!allowedPages.includes(currentPage)) {
        setCurrentPage(getDefaultPage(profile.role));
      }
    }
  }, [profile, currentPage]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleAgencySetupComplete = async () => {
    if (user) {
      const userProfile = await getUser(user.uid);
      setProfile(userProfile);
      if (userProfile?.agencyId) {
        const agencyData = await getAgency(userProfile.agencyId);
        setAgency(agencyData);
      }
      setShowAgencySetup(false);
    }
  };

  const getNavigation = () => {
    const baseNav = [
      { name: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
      { name: 'Statistiques', icon: BarChart3, id: 'stats' },
      { name: 'Locations', icon: Calendar, id: 'rentals' },
      { name: 'Véhicules', icon: Car, id: 'vehicles' },
      { name: 'Inspection', icon: Activity, id: 'inspection' },
      { name: 'Clients', icon: Users, id: 'clients' },
      { name: 'Maintenance', icon: AlertCircle, id: 'maintenance' },
      { name: 'Paramètres', icon: Settings, id: 'settings' }
    ];

    // Handle both new and legacy role values
    const isSuperAdmin = ['SuperAdmin', 'super_admin', 'Administrateur'].includes(profile?.role);
    const isCommercial = ['Commercial', 'commercial'].includes(profile?.role);
    const isCompanyAdmin = ['Entreprise', 'entreprise', 'company_admin', 'company_agent'].includes(profile?.role);

    if (isSuperAdmin) {
      return [
        { name: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
        { name: 'Statistiques', icon: BarChart3, id: 'stats' },
        { name: 'Commerciaux', icon: UserCircle, id: 'commercials' },
        { name: 'Logs', icon: FileText, id: 'logs' },
        { name: 'Paramètres', icon: Settings, id: 'settings' }
      ];
    }

    if (isCommercial) {
      return [
        { name: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
        { name: 'Objectifs', icon: Target, id: 'objectives' },
        { name: 'Entreprises', icon: Briefcase, id: 'companies' },
        { name: 'Messages', icon: MessageSquare, id: 'messages' },
        { name: 'Paramètres', icon: Settings, id: 'settings' }
      ];
    }

    if (isCompanyAdmin) {
      return [
        ...baseNav,
        { name: 'Agences', icon: MapPin, id: 'agencies' },
        { name: 'Employés', icon: UserCircle, id: 'employees' },
        { name: 'Alertes', icon: AlertCircle, id: 'alerts' }
      ];
    }

    return baseNav;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user && !showAuth) {
    return <LandingPage onStart={() => setShowAuth(true)} />;
  }

  if (!user && showAuth) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-900 via-gray-900 to-black flex flex-col items-center justify-center p-4">
        <div className="absolute top-8 left-8 z-20">
          <button
            onClick={() => setShowAuth(false)}
            className="px-6 py-3 bg-white/5 backdrop-blur-xl border border-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
          >
            ← Retour à l'accueil
          </button>
        </div>
        <AuthForm onSuccess={async () => {
          const u = auth.currentUser;
          if (u) {
            const p = await getUser(u.uid);
            setProfile(p);
          }
        }} />
      </div>
    );
  }

  if (showAgencySetup && user) {
    return <AgencySetup user={user} onComplete={handleAgencySetupComplete} />;
  }

  const activeAgency = agenciesList.find(a => a.id === currentAgency) || agency;

  return (
    <div className={`flex min-h-screen ${darkMode ? 'dark bg-[#07090e]' : 'bg-slate-50'} transition-colors duration-300`}>
      <div className="mesh-gradient-bg" />
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-[#0b0e14] shadow-2xl z-[70] lg:hidden flex flex-col"
            >
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <SidebarContent
                  navigation={getNavigation()}
                  currentPage={currentPage}
                  setCurrentPage={(p) => { setCurrentPage(p); setSidebarOpen(false); }}
                  userRole={profile?.role}
                  currentAgency={currentAgency}
                  setCurrentAgency={setCurrentAgency}
                  agenciesList={agenciesList}
                  activeAgency={activeAgency}
                />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <aside className="sidebar-container hidden lg:flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <SidebarContent
            navigation={getNavigation()}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            userRole={profile?.role}
            currentAgency={currentAgency}
            setCurrentAgency={setCurrentAgency}
            agenciesList={agenciesList}
            activeAgency={activeAgency}
          />
        </div>
        <div className="p-6 border-t border-slate-200 dark:border-slate-800/50 bg-slate-50/50 dark:bg-black/20">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Connectivité</p>
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_bg-emerald-500]' : 'bg-rose-500'}`} />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500">
              {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-none">Système {isOnline ? 'Live' : 'Offline'}</p>
              <p className="text-[10px] text-slate-500 mt-1">v2.0 - Pro</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="main-content min-h-screen">
        <header className="pro-header">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden text-slate-500"
            >
              <Menu size={20} />
            </button>
            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 lg:hidden" />
            <div className="flex items-center gap-2">
              <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-black uppercase tracking-widest text-slate-500">
                {currentPage.replace('-', ' ')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2" />
            <button className="flex items-center gap-3 group" onClick={() => setCurrentPage('settings')}>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-none capitalize">
                  {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : user.email?.split('@')[0]}
                </p>
                <p className="text-[10px] font-medium text-slate-400 mt-1">
                    {['super_admin', 'Administrateur'].includes(profile?.role) ? 'Super Admin' :
                      ['commercial', 'Commercial'].includes(profile?.role) ? 'Commercial' :
                        profile?.companyName || 'Agence'}
                  </p>
              </div>
              <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-primary-600 text-xs font-black ring-2 ring-slate-100 dark:ring-slate-800 group-hover:ring-primary-500/20 transition-all shadow-lg overflow-hidden">
                {activeAgency?.logo ? (
                  <img src={activeAgency.logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary-600 flex items-center justify-center text-white uppercase">
                    {profile?.firstName?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </button>
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2" />
            <button
              onClick={() => signOut(auth)}
              className="p-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-500/10 transition-all"
              title="Déconnexion"
            >
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="flex-1 w-full flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.3 }}
              className="p-8 max-w-[1600px] mx-auto w-full flex-1"
            >
              {(() => {
                const allowedPages = getAllowedPages(profile?.role);
                const isSuperAdmin = ['SuperAdmin', 'super_admin', 'Administrateur'].includes(profile?.role);
                const isCommercial = ['Commercial', 'commercial'].includes(profile?.role);
                const isCompanyAdmin = ['Entreprise', 'entreprise', 'company_admin', 'company_agent'].includes(profile?.role);
                
                if (!allowedPages.includes(currentPage)) return null;
                
                if (currentPage === 'dashboard') {
                  if (isSuperAdmin) {
                    return <SuperAdminDashboard setCurrentPage={setCurrentPage} activeAgency={activeAgency} profile={profile} />;
                  } else if (isCommercial) {
                    return <CommercialDashboard setCurrentPage={setCurrentPage} activeAgency={activeAgency} profile={profile} />;
                  } else {
                    return <CompanyDashboard setCurrentPage={setCurrentPage} activeAgency={activeAgency} profile={profile} />;
                  }
                }
                if (currentPage === 'stats') return <Analytics currentAgency={currentAgency} companyId={profile?.companyId} />;
                if (currentPage === 'rentals') return <Rentals setCurrentPage={setCurrentPage} setPageData={setPageData} currentAgency={currentAgency} companyId={profile?.companyId} />;
                if (currentPage === 'vehicles') return <Vehicles currentAgency={currentAgency} companyId={profile?.companyId} />;
                if (currentPage === 'clients') return <Clients currentAgency={currentAgency} companyId={profile?.companyId} />;
                if (currentPage === 'agencies') return <Agencies companyId={profile?.companyId} />;
                if (currentPage === 'employees') return <Employees currentAgency={currentAgency} companyId={profile?.companyId} />;
                if (currentPage === 'maintenance') return <Maintenance currentAgency={currentAgency} companyId={profile?.companyId} />;
                if (currentPage === 'settings') {
                  return (
                    <SettingsPage
                      profile={profile}
                      onUpdate={async () => {
                        const p = await getUser(user.uid);
                        setProfile(p);
                      }}
                    />
                  );
                }
                if (currentPage === 'inspection') {
                  return (
                    <InspectionWizard
                      onComplete={() => setCurrentPage('dashboard')}
                      onCancel={() => setCurrentPage('dashboard')}
                      preSelectedVehicle={pageData?.preSelectedVehicle}
                      preSelectedClient={pageData?.preSelectedClient}
                    />
                  );
                }
                if (currentPage === 'commercials') return <Commercials />;
                if (currentPage === 'companies') return <Companies />;
                if (currentPage === 'objectives') return <Objectives />;
                if (currentPage === 'messages') return <Messages />;
                if (currentPage === 'documents') return <Documents />;
                if (currentPage === 'alerts') return <Alerts companyId={profile?.companyId} userId={user?.uid} />;
                if (currentPage === 'logs') return <Logs />;
                return null;
              })()}
            </motion.div>
          </AnimatePresence>
        </div>
        <SyncManager />
      </main>
    </div>
  );
};

const SidebarContent = ({ navigation, currentPage, setCurrentPage, userRole, currentAgency, setCurrentAgency, agenciesList, activeAgency }) => {
  const getSidebarBranding = () => {
    if (['super_admin', 'Administrateur'].includes(userRole)) {
      return {
        title: 'LocaVision Pro',
        subtitle: 'Super Admin',
        bg: 'bg-gradient-to-br from-blue-600 to-indigo-600',
        icon: 'L'
      };
    } else if (['commercial', 'Commercial'].includes(userRole)) {
      return {
        title: 'LocaVision',
        subtitle: 'Espace Commercial',
        bg: 'bg-gradient-to-br from-orange-600 to-teal-600',
        icon: 'C'
      };
    } else {
      return {
        title: activeAgency?.name || 'LocaVision',
        subtitle: 'Gestion de Flotte',
        bg: 'bg-gradient-to-br from-emerald-600 to-green-600',
        icon: activeAgency?.name?.charAt(0) || 'L'
      };
    }
  };

  const branding = getSidebarBranding();

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0b0e14] border-r border-slate-200 dark:border-slate-800">
      <div className="p-6">
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="w-12 h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center shadow-xl overflow-hidden group">
            {activeAgency?.logo && userRole !== 'super_admin' && userRole !== 'commercial' ? (
              <img src={activeAgency.logo} alt={activeAgency.name} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full ${branding.bg} flex items-center justify-center text-white text-xl font-black italic`}>
                {branding.icon}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-black tracking-tighter text-slate-900 dark:text-white uppercase italic truncate">
              {branding.title}
            </h1>
            <p className="text-[9px] font-black text-primary-600 uppercase tracking-widest leading-none opacity-60">
              {branding.subtitle}
            </p>
          </div>
        </div>
      </div>
      {agenciesList.length > 0 && !(['super_admin', 'Administrateur'].includes(userRole)) && !(['commercial', 'Commercial'].includes(userRole)) && (
        <div className="mx-4 mb-8 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
            <MapPin size={10} /> Agence Actuelle
          </div>
          <select
            value={currentAgency || ''}
            onChange={(e) => setCurrentAgency(e.target.value)}
            className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
          >
            {agenciesList.map(agency => (
              <option key={agency.id} value={agency.id}>{agency.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex-1 px-4 overflow-y-auto custom-scrollbar pb-10">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 relative group ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/20'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950/50 hover:text-primary-600'
                }`}
              >
                <Icon size={20} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="relative z-10">{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default App;
