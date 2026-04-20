import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, 
  Camera, 
  BarChart3, 
  Users, 
  Settings, 
  Menu, 
  X,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  Scan,
  Calendar,
  Briefcase,
  LayoutDashboard,
  UserCircle,
  Activity,
  Wrench,
  MapPin
} from 'lucide-react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Clients from './pages/Clients';
import CameraCapture from './components/CameraCapture';
import DamageHeatmap from './components/DamageHeatmap';
import SignaturePad from './components/SignaturePad';
import { offlineStorage } from './services/offlineStorage';
import AuthForm from './components/AuthForm';
import { signOut } from 'firebase/auth';
import InspectionWizard from './components/InspectionWizard';
import SyncManager from './components/SyncManager';
import Rentals from './pages/Rentals';
import SettingsPage from './pages/Settings';
import Employees from './pages/Employees';
import Analytics from './pages/Analytics';
import Maintenance from './pages/Maintenance';
import { getAdvancedStats, getUser, getAgencies } from './services/firestore';
import SubscriptionWizard from './components/SubscriptionWizard';
import LandingPage from './pages/LandingPage';
import AgencySetup from './components/AgencySetup';
import Legal from './pages/Legal';
import Agencies from './pages/Agencies';

const App = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [agency, setAgency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showLegal, setShowLegal] = useState(null); // 'mentions', 'cgu', 'privacy'
  const [currentAgency, setCurrentAgency] = useState('agency_main');
  const [agenciesList, setAgenciesList] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return JSON.parse(saved);
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pageData, setPageData] = useState(null);


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
        if (userProfile?.agencyId) {
          const { getAgency } = await import('./services/firestore');
          const agencyData = await getAgency(userProfile.agencyId);
          setAgency(agencyData);
        }
      } else {
        setProfile(null);
        setAgency(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

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



  const handleCapture = (photoData) => {
    setCapturedImages(prev => [...prev, photoData]);
    
    // Store offline if needed
    if (!isOnline) {
      offlineStorage.storeImage(photoData);
    }
  };

  const handleSignature = (signatureData) => {
    console.log('Signature captured:', signatureData);
    setShowSignature(false);
    // Handle signature logic here
  };

  const [userRole, setUserRole] = useState('Administrateur'); // Mock role: 'Administrateur' or 'Employé'
  const [navigation, setNavigation] = useState([
    { name: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
    { name: 'Statistiques', icon: BarChart3, id: 'stats' },
    { name: 'Locations', icon: Calendar, id: 'rentals' },
    { name: 'Véhicules', icon: Car, id: 'vehicles' },
    { name: 'Inspection', icon: Camera, id: 'inspection' },
    {name: 'Clients', icon: Users, id: 'clients'},
    {name: 'Agences', icon: Briefcase, id: 'agencies', adminOnly: true},
    {name: 'Employés', icon: UserCircle, id: 'employees', adminOnly: true},
    {name: 'Maintenance', icon: Wrench, id: 'maintenance'},
    {name: 'Paramètres', icon: Settings, id: 'settings'},
  ]);

  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        const list = await getAgencies();
        setAgenciesList(list);
        if (list.length > 0 && currentAgency === 'agency_main') {
          // Si on n'a pas encore choisi d'agence, on prend la première par défaut
          // Mais on garde currentAgency si elle est déjà valide
          const exists = list.find(a => a.id === currentAgency);
          if (!exists) setCurrentAgency(list[0].id);
        }
      } catch (error) {
        console.error("Erreur chargement agences:", error);
      }
    };
    if (user) fetchAgencies();
  }, [user]);

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
    if (showLegal) {
      return <Legal type={showLegal} onClose={() => setShowLegal(null)} />;
    }
    return <LandingPage onStart={() => setShowAuth(true)} onLogin={(type) => typeof type === 'string' ? setShowLegal(type) : setShowAuth(true)} />;
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
        {/* Background glow effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        </div>
        
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center relative z-10 px-4">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:block space-y-8"
          >
            <div className="space-y-6">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="w-24 h-24 bg-primary-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-primary-500/30"
              >
                <Car className="w-12 h-12 text-white" />
              </motion.div>
              <h1 className="text-6xl font-black text-white leading-tight tracking-tight">
                L'inspection <br/>de demain, <br/><span className="text-primary-500 underline decoration-primary-500/30 underline-offset-8">aujourd'hui.</span>
              </h1>
              <p className="text-xl text-gray-400 max-w-md leading-relaxed">
                LocaVision automatise la détection de dommages par IA pour sécuriser vos contrats et accélérer vos processus métiers.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-6 pt-4">
              {[
                { label: 'Précision IA', value: '99%' },
                { label: 'Gain de temps', value: '75%' },
                { label: 'Réduction litiges', value: '60%' },
                { label: 'Disponibilité', value: '24/7' }
              ].map((stat, i) => (
                <div key={i} className="p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
                  <p className="text-primary-400 font-black text-3xl mb-1">{stat.value}</p>
                  <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <AuthForm onSuccess={async () => {
             const u = auth.currentUser;
             if (u) {
               const p = await getUser(u.uid);
               setProfile(p);
             }
          }} />
        </div>
      </div>
    );
  }

  // Subscription Guard - Must be paid to access dash
  if (profile?.subscriptionStatus !== 'active') {
    return (
      <SubscriptionWizard 
        user={user} 
        onComplete={async () => {
          const updatedProfile = await getUser(user.uid);
          setProfile(updatedProfile);
        }} 
      />
    );
  }

  // Agency Guard - Must create first agency after payment
  if (profile?.subscriptionStatus === 'active' && !profile?.hasAgency) {
    return (
      <AgencySetup 
        user={user} 
        onComplete={async () => {
          const updatedProfile = await getUser(user.uid);
          setProfile(updatedProfile);
        }} 
      />
    );
  }

  return (
    <div className={`flex min-h-screen ${darkMode ? 'dark bg-[#07090e]' : 'bg-slate-50'} transition-colors duration-300`}>
      <div className="mesh-gradient-bg" />

      {/* Mobile Nav Drawer */}
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
                  navigation={navigation} 
                  currentPage={currentPage}
                  setCurrentPage={(p) => { setCurrentPage(p); setSidebarOpen(false); }}
                  userRole={userRole}
                  currentAgency={currentAgency}
                  setCurrentAgency={setCurrentAgency}
                />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar (Solid) */}
      <aside className="sidebar-container hidden lg:flex">
          <SidebarContent 
            navigation={navigation} 
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            userRole={userRole}
            currentAgency={currentAgency}
            setCurrentAgency={setCurrentAgency}
            agenciesList={agenciesList}
          />
          
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
                   <p className="text-[10px] text-slate-500 mt-1">v6.0.4 - Pro Edition</p>
                </div>
             </div>
          </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content min-h-screen">
        {/* Solid Header */}
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
                  <p className="text-[10px] font-medium text-slate-400 mt-1">{profile?.companyName || 'Agence LocaVision'}</p>
               </div>
               <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-primary-600 text-xs font-black ring-2 ring-slate-100 dark:ring-slate-800 group-hover:ring-primary-500/20 transition-all shadow-lg overflow-hidden">
                  {agency?.logo ? (
                    <img src={agency.logo} alt="Agency Logo" className="w-full h-full object-cover" />
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

        {/* Content Wrapper */}
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
              {currentPage === 'dashboard' && (
                <Dashboard 
                  setCurrentPage={setCurrentPage} 
                  setPageData={setPageData} 
                  activeAgency={agenciesList.find(a => a.id === currentAgency)}
                />
              )}
              {currentPage === 'stats' && <Analytics currentAgency={currentAgency} />}
              {currentPage === 'rentals' && <Rentals setCurrentPage={setCurrentPage} setPageData={setPageData} currentAgency={currentAgency} />}
              {currentPage === 'vehicles' && <Vehicles currentAgency={currentAgency} />}
              {currentPage === 'clients' && <Clients currentAgency={currentAgency} />}
              {currentPage === 'agencies' && userRole === 'Administrateur' && <Agencies />}
              {currentPage === 'employees' && userRole === 'Administrateur' && <Employees currentAgency={currentAgency} />}
              {currentPage === 'maintenance' && <Maintenance currentAgency={currentAgency} />}
              {currentPage === 'settings' && (
                <SettingsPage 
                  profile={profile} 
                  onUpdate={async () => {
                    const p = await getUser(user.uid);
                    setProfile(p);
                  }} 
                />
              )}
              {currentPage === 'inspection' && (
                <InspectionWizard 
                  onComplete={() => setCurrentPage('dashboard')} 
                  onCancel={() => setCurrentPage('dashboard')}
                  preSelectedVehicle={pageData?.preSelectedVehicle}
                  preSelectedClient={pageData?.preSelectedClient}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <SyncManager />
      </main>
    </div>
  );
};

const SidebarContent = ({ navigation, currentPage, setCurrentPage, userRole, currentAgency, setCurrentAgency, agenciesList }) => {
  const activeAgency = agenciesList.find(a => a.id === currentAgency) || agenciesList[0];

  return (
  <div className="flex flex-col h-full bg-white dark:bg-[#0b0e14] border-r border-slate-200 dark:border-slate-800">
    <div className="p-6">
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-12 h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center shadow-xl overflow-hidden group">
          {activeAgency?.logo ? (
            <img src={activeAgency.logo} alt={activeAgency.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary-600 flex items-center justify-center text-white text-xl font-black italic">
              {activeAgency?.name?.charAt(0) || 'L'}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-black tracking-tighter text-slate-900 dark:text-white uppercase italic truncate">
            {activeAgency?.name || 'LocaVision'}
          </h1>
          <p className="text-[9px] font-black text-primary-600 uppercase tracking-widest leading-none opacity-60">Gestion de Flotte</p>
        </div>
      </div>
    </div>

    <div className="mx-4 mb-8 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
       <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
          <MapPin size={10} /> Agence Actuelle
       </div>
       <select 
          value={currentAgency}
          onChange={(e) => setCurrentAgency(e.target.value)}
          className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
       >
          {agenciesList.length > 0 ? (
            agenciesList.map(agency => (
              <option key={agency.id} value={agency.id}>{agency.name}</option>
            ))
          ) : (
            <option value="agency_main">Chargement...</option>
          )}
       </select>
    </div>

    <div className="flex-1 px-4 overflow-y-auto custom-scrollbar pb-10">
      <nav className="space-y-1">
        {navigation.filter(item => !item.adminOnly || userRole === 'Administrateur').map((item) => {
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
