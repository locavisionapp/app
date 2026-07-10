import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Users, 
  Car, 
  Calendar, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Search,
  MoreVertical,
  X,
  FileText,
  RefreshCcw,
  Download,
  Building2,
  UserCircle,
  Settings
} from 'lucide-react';
import { subscribeToVehicles, subscribeToInspections, subscribeToCompanies, subscribeToCommercials, subscribeToLogs, computeFleetAnalytics } from '../services/firestore';
import DamageHeatmap from '../components/DamageHeatmap';
import ComparisonView from '../components/ComparisonView';

const Dashboard = ({ setCurrentPage, setPageData, activeAgency, profile }) => {
  const [analytics, setAnalytics] = useState(null);
  const [recentInspections, setRecentInspections] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [commercials, setCommercials] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [comparisonTarget, setComparisonTarget] = useState(null);

  useEffect(() => {
    setLoading(true);
    let unsubVehicles, unsubInspections, unsubCompanies, unsubCommercials, unsubLogs;

    if (profile?.role === 'super_admin') {
      unsubVehicles = subscribeToVehicles({}, (cars) => {
        setVehicles(cars);
        setAnalytics(computeFleetAnalytics(cars));
        setLoading(false);
      });
      unsubInspections = subscribeToInspections({}, (insps) => setRecentInspections(insps));
      unsubCompanies = subscribeToCompanies((comps) => setCompanies(comps));
      unsubCommercials = subscribeToCommercials((comms) => setCommercials(comms));
      unsubLogs = subscribeToLogs(100, (logList) => setLogs(logList));
    } else {
      const filters = activeAgency?.id ? { agencyId: activeAgency.id } : {};
      unsubVehicles = subscribeToVehicles(filters, (cars) => {
        setVehicles(cars);
        setAnalytics(computeFleetAnalytics(cars));
        setLoading(false);
      });
      unsubInspections = subscribeToInspections(filters, (insps) => setRecentInspections(insps));
    }

    return () => {
      if (unsubVehicles) unsubVehicles();
      if (unsubInspections) unsubInspections();
      if (unsubCompanies) unsubCompanies();
      if (unsubCommercials) unsubCommercials();
      if (unsubLogs) unsubLogs();
    };
  }, [activeAgency?.id, profile?.role]);

  const handleVehicleClick = (vehicle) => {
    setSelectedVehicle(vehicle);
    const vehicleInspections = recentInspections.filter(i => i.vehicleId === vehicle.id);
    if (vehicleInspections.length >= 2) {
      const sorted = [...vehicleInspections].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const checkin = sorted.find(i => i.type === 'checkin');
      const checkout = sorted.find(i => i.type === 'checkout');
      if (checkin && checkout) {
        setComparisonTarget({ checkout, checkin });
      } else {
        setComparisonTarget(null);
      }
    } else {
      setComparisonTarget(null);
    }
  };

  const StatSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-8 w-12 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      </div>
      <div className="h-3 w-32 bg-gray-100 dark:bg-gray-800 rounded"></div>
    </div>
  );

  const StatCard = ({ title, value, icon: Icon, color, delay }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card p-6 relative group overflow-hidden"
    >
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{title}</p>
          <h3 className="text-3xl font-black italic tracking-tighter text-gray-900 dark:text-white">{value}</h3>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-green-500">
            <ArrowUpRight size={12} /> +12% <span className="opacity-50">vs last month</span>
          </div>
        </div>
        <div className={`p-4 rounded-2xl ${
          color === 'blue' ? 'bg-blue-50 text-blue-600' :
          color === 'green' ? 'bg-emerald-50 text-emerald-600' :
          color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
          'bg-slate-50 text-slate-600'
        }`}>
          <Icon className="w-8 h-8" />
        </div>
      </div>
    </motion.div>
  );

  const VehicleCard = ({ vehicle }) => {
    const statusStyles = {
      'Disponible': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'Loué': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'Maintenance': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      'Litige': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };

    const statusStyle = statusStyles[vehicle.status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800';

    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all h-full"
        onClick={() => handleVehicleClick(vehicle)}
      >
        <div className="flex justify-between items-start mb-3 gap-2">
          <div className="flex items-center space-x-3">
             <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-primary-600">
               <Car size={20} />
             </div>
             <div>
               <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                 {vehicle.brand} {vehicle.model}
               </h4>
               <p className="text-xs font-mono text-gray-500 uppercase">
                 {vehicle.licensePlate}
               </p>
             </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${statusStyle}`}>
            {vehicle.status}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Kilométrage:</span>
            <p className="font-medium">{vehicle.mileage?.toLocaleString() || 'N/A'} km</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Catégorie:</span>
            <p className="font-medium">{vehicle.category || 'N/A'}</p>
          </div>
        </div>
        
        {vehicle.healthScore && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Score Santé:</span>
              <span className={`font-bold ${
                vehicle.healthScore >= 8 ? 'text-green-600' :
                vehicle.healthScore >= 5 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {vehicle.healthScore}/10
              </span>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  if (loading && !analytics) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <StatSkeleton key={i} />)}
        </div>
        <div className="h-[400px] bg-white dark:bg-gray-800 rounded-2xl animate-pulse border border-gray-100 dark:border-gray-700"></div>
      </div>
    );
  }

  if (profile?.role === 'super_admin') {
    return (
      <div className="pt-4 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto pb-20">
        {/* Super Admin Welcome Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-12 p-10 rounded-[3rem] bg-gradient-to-br from-slate-900 to-primary-950 border border-white/10 shadow-2xl overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
             <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 0 L100 0 L100 100 Z" fill="currentColor" className="text-primary-500" />
             </svg>
          </div>
          
          <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
             <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/20 text-primary-400 rounded-lg text-[9px] font-black uppercase tracking-widest mb-6 border border-primary-500/30">
                   <Activity size={12} className="animate-pulse" /> Super Admin - LocaVision Global
                </div>
                <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter italic leading-none mb-6">
                  Centre de Contrôle <span className="text-primary-500">LocaVision</span>
                </h1>
                <p className="text-slate-400 font-medium text-lg leading-relaxed max-w-lg">
                  Vue d'ensemble globale de la plateforme. Gérez les commerciaux, les entreprises et surveillez la santé du système.
                </p>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/5 rounded-[2rem] flex flex-col justify-end">
                   <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Entreprises Actives</p>
                   <p className="text-3xl font-black italic text-emerald-500">{companies.length}</p>
                </div>
                <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/5 rounded-[2rem] flex flex-col justify-end">
                   <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Commerciaux</p>
                   <p className="text-3xl font-black italic text-primary-500">{commercials.length}</p>
                </div>
                <div className="col-span-2 p-6 bg-primary-500/10 border border-primary-500/20 rounded-[2rem] flex items-center justify-between">
                   <div>
                      <p className="text-[10px] font-black uppercase text-primary-500 mb-1">Status Système</p>
                      <p className="text-xl font-black text-white italic">Opérationnel</p>
                   </div>
                   <div className="px-4 py-2 bg-emerald-600 rounded-xl text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    Online
                   </div>
                </div>
             </div>
          </div>
        </motion.div>

        {/* Super Admin Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12">
          <StatCard title="Total Entreprises" value={companies.length} icon={Building2} color="blue" delay={0.1} />
          <StatCard title="Total Commerciaux" value={commercials.length} icon={UserCircle} color="green" delay={0.2} />
          <StatCard title="Total Véhicules" value={analytics?.totalVehicles || 0} icon={Car} color="indigo" delay={0.3} />
          <StatCard title="Taux Occupation" value={`${analytics?.occupancyRate || 0}%`} icon={Activity} color="red" delay={0.4} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Commerciaux List */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Commerciaux</h2>
                <button onClick={() => setCurrentPage('commercials')} className="text-primary-600 hover:text-primary-700 text-sm font-medium">Gérer</button>
              </div>
              <div className="p-6 space-y-4">
                {commercials.slice(0, 5).map((comm) => (
                  <div key={comm.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600">
                        <UserCircle size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{comm.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{comm.email}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${comm.status === 'Actif' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                      {comm.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity Logs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Journal d'activité</h2>
                <button onClick={() => setCurrentPage('logs')} className="text-primary-600 hover:text-primary-700 text-sm font-medium">Voir tout</button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {logs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center space-x-4">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.action}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Utilisateur: {log.user}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {log.date} {log.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Actions Rapides</h2>
              </div>
              <div className="p-6 space-y-3">
                <button 
                  onClick={() => setCurrentPage('commercials')}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  <UserCircle className="w-4 h-4" /> <span>Gérer Commerciaux</span>
                </button>
                <button 
                  onClick={() => setCurrentPage('companies')}
                  className="w-full btn-secondary flex items-center justify-center space-x-2"
                >
                  <Building2 className="w-4 h-4" /> <span>Gérer Entreprises</span>
                </button>
                <button 
                  onClick={() => setCurrentPage('logs')}
                  className="w-full btn-secondary flex items-center justify-center space-x-2"
                >
                  <FileText className="w-4 h-4" /> <span>Voir Logs</span>
                </button>
                <button 
                  onClick={() => setCurrentPage('settings')}
                  className="w-full btn-secondary flex items-center justify-center space-x-2"
                >
                  <Settings className="w-4 h-4" /> <span>Paramètres Système</span>
                </button>
              </div>
            </div>

            {/* Platform Health */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Santé Plateforme</h2>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Serveur</span>
                  <span className="text-sm font-bold text-emerald-600">OK</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Base de données</span>
                  <span className="text-sm font-bold text-emerald-600">OK</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Stockage</span>
                  <span className="text-sm font-bold text-yellow-600">75%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto pb-20">
      {/* Welcome Hero / "Vrai Page d'accueil" du Dashboard */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-12 p-10 rounded-[3rem] bg-gradient-to-br from-slate-900 to-primary-950 border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
           <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 0 L100 0 L100 100 Z" fill="currentColor" className="text-primary-500" />
           </svg>
        </div>
        
        <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
           <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/20 text-primary-400 rounded-lg text-[9px] font-black uppercase tracking-widest mb-6 border border-primary-500/30">
                 <Activity size={12} className="animate-pulse" /> Centre de Commandement LocaVision
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter italic leading-none mb-6">
                Bienvenue chez <br/><span className="text-primary-500">votre Centre de Flotte</span>
              </h1>
              <p className="text-slate-400 font-medium text-lg leading-relaxed max-w-lg">
                Votre écosystème est opérationnel. LocaVision analyse actuellement vos actifs pour maximiser votre rentabilité et minimiser vos litiges.
              </p>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/5 rounded-[2rem] flex flex-col justify-end">
                 <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Taux d'Occupation</p>
                 <p className="text-3xl font-black italic text-emerald-500">{analytics?.occupancyRate || 0}%</p>
              </div>
              <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/5 rounded-[2rem] flex flex-col justify-end">
                 <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Véhicules Disponibles</p>
                 <p className="text-3xl font-black italic text-primary-500">{analytics?.availableVehicles || 0}</p>
              </div>
              <div className="col-span-2 p-6 bg-primary-500/10 border border-primary-500/20 rounded-[2rem] flex items-center justify-between">
                 <div>
                    <p className="text-[10px] font-black uppercase text-primary-500 mb-1">Status Abonnement</p>
                    <p className="text-xl font-black text-white italic">Business Pro Elite</p>
                 </div>
                 <div className="px-4 py-2 bg-primary-600 rounded-xl text-[10px] font-black text-white uppercase tracking-widest">Actif</div>
              </div>
           </div>
        </div>
      </motion.div>

      {/* Dynamic Header Original (Mise à jour) */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 px-4"
      >
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">
             Vue d'ensemble <span className="opacity-20 text-slate-400">Analytique</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">

           <button className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
              Générer Rapport
           </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12">
        <StatCard title="Total Véhicules" value={analytics?.totalVehicles || 0} icon={Car} color="blue" delay={0.1} />
        <StatCard title="Disponibles" value={analytics?.availableVehicles || 0} icon={Activity} color="green" delay={0.2} />
        <StatCard title="En Location" value={analytics?.rentedVehicles || 0} icon={Calendar} color="indigo" delay={0.3} />
        <StatCard title="Alertes Entretien" value={(analytics?.maintenanceVehicles || 0) + (analytics?.disputeVehicles || 0)} icon={AlertTriangle} color="red" delay={0.4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Vehicle Fleet */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Flotte de Véhicules</h2>
                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">Voir tout</button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicles.slice(0, 6).map((vehicle) => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} />
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Activité Récente</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentInspections.slice(0, 5).map((inspection) => {
                  const vehicle = vehicles.find(v => v.id === inspection.vehicleId);
                  return (
                    <div key={inspection.id} className="flex items-center space-x-4">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <Car className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {inspection.type === 'checkout' ? 'Check-out' : 'Check-in'} terminé - {vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Véhicule inconnu'}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Agent: {inspection.agentName}</p>
                      </div>
                      <span className={`px-2 py-1 ${inspection.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} text-xs rounded-full`}>
                        {new Date(inspection.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Actions Rapides</h2>
            </div>
            <div className="p-6 space-y-3">
              <button 
                onClick={() => setCurrentPage('inspection')}
                className="w-full btn-primary flex items-center justify-center space-x-2"
              >
                <Car className="w-4 h-4" /> <span>Nouvelle Inspection</span>
              </button>
              <button 
                onClick={() => {
                  setCurrentPage('vehicles');
                  setPageData({ openAddModal: true });
                }}
                className="w-full btn-secondary flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" /> <span>Ajouter Véhicule</span>
              </button>
              <button 
                onClick={() => window.print()}
                className="w-full btn-secondary flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" /> <span>Exporter Dashboard</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Alertes</h2>
            </div>
            <div className="p-6 space-y-3">
              {analytics?.maintenanceVehicles > 0 && (
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{analytics.maintenanceVehicles} véhicule{analytics.maintenanceVehicles > 1 ? 's' : ''} en maintenance</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Vérifiez l'état de santé dans la flotte.</p>
                  </div>
                </div>
              )}
              {recentInspections.some(i => i.aiAnalysis?.damages?.some(d => d.severity >= 4)) && (
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Dommages critiques détectés</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Consultez les dernières inspections pour détails.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase italic">{selectedVehicle.brand} {selectedVehicle.model}</h2>
              <button onClick={() => setSelectedVehicle(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6">
              {comparisonTarget ? (
                <ComparisonView checkoutInspection={comparisonTarget.checkout} checkinInspection={comparisonTarget.checkin} vehicle={selectedVehicle} />
              ) : (
                <DamageHeatmap damages={recentInspections.find(i => i.vehicleId === selectedVehicle.id)?.aiAnalysis?.damages || []} vehicleType={selectedVehicle.category} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
