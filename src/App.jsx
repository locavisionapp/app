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
  WifiOff
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

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
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

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

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

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'vehicles', name: 'Véhicules', icon: Car },
    { id: 'inspection', name: 'Inspection', icon: Camera },
    { id: 'clients', name: 'Clients', icon: Users },
    { id: 'settings', name: 'Paramètres', icon: Settings },
  ];

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

  if (!user) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-900 via-gray-900 to-black flex items-center justify-center p-4">
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

          <AuthForm onSuccess={() => {}} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              
              <div className="ml-3 lg:ml-0">
                <h1 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <Scan className="w-5 h-5 mr-2 text-primary-600 lg:hidden" />
                  LocaVision
                </h1>
                <p className="hidden xs:block text-xs text-gray-600 dark:text-gray-400">
                  Inspection IA de véhicules
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 lg:space-x-4">
              {/* Connection Status - Label hidden on mobile */}
              <div className="flex items-center space-x-1">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className="hidden md:inline text-xs text-gray-600 dark:text-gray-400">
                  {isOnline ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* User Avatar & Logout */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium shadow-lg shadow-primary-500/20">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={() => signOut(auth)}
                  className="hidden sm:block text-sm font-medium text-gray-500 hover:text-red-500 transition-colors"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              />
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg z-50 lg:hidden"
              >
                <SidebarContent 
                  navigation={navigation} 
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white dark:bg-gray-800 shadow-lg min-h-screen">
          <SidebarContent 
            navigation={navigation} 
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        </aside>

        {/* Main Content - Tighten padding on mobile */}
        <main className="flex-1 p-4 lg:p-8 w-full overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentPage === 'dashboard' && <Dashboard />}
              {currentPage === 'vehicles' && <Vehicles />}
              {currentPage === 'clients' && <Clients />}
              {currentPage === 'inspection' && (
                <InspectionWizard onComplete={() => setCurrentPage('dashboard')} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modals are now handled inside pages or components */}
      <SyncManager />
    </div>
  );
};

const SidebarContent = ({ navigation, currentPage, setCurrentPage }) => (
  <nav className="p-4 space-y-2">
    {navigation.map((item) => {
      const Icon = item.icon;
      return (
        <button
          key={item.id}
          onClick={() => setCurrentPage(item.id)}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
            currentPage === item.id
              ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <Icon size={20} />
          <span className="font-medium">{item.name}</span>
        </button>
      );
    })}
  </nav>
);

export default App;
