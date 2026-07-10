import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Car, 
  DollarSign, 
  Activity, 
  Calendar,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  PieChart,
  Layers,
  Circle
} from 'lucide-react';
import { subscribeToVehicles, subscribeToRentals, subscribeToClients, computeAdvancedStats } from '../services/firestore';

const Analytics = ({ currentAgency, companyId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(localStorage.getItem('locavision_user_role') || 'Administrateur');

  useEffect(() => {
    setLoading(true);
    const filters = {};
    if (currentAgency) {
      filters.agencyId = currentAgency;
    } else if (companyId) {
      filters.companyId = companyId;
    }

    let currentVehicles = null;
    let currentRentals = null;
    let currentClients = null;

    const updateStats = () => {
      if (currentVehicles && currentRentals && currentClients) {
        setStats(computeAdvancedStats(currentVehicles, currentRentals, currentClients, userRole));
        setLoading(false);
      }
    };

    const unsubV = subscribeToVehicles(filters, (v) => { currentVehicles = v; updateStats(); });
    const unsubR = subscribeToRentals(filters, (r) => { currentRentals = r; updateStats(); });
    const unsubC = subscribeToClients(filters, (c) => { currentClients = c; updateStats(); });

    return () => {
      unsubV();
      unsubR();
      unsubC();
    };
  }, [userRole, currentAgency, companyId]);

  const isAdmin = ['super_admin', 'Administrateur', 'company_admin', 'company_agent'].includes(userRole);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Génération des Rapports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto pb-20 space-y-10">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-lg text-[9px] font-black uppercase tracking-widest mb-4">
             <BarChart3 size={12} className="animate-pulse" /> Business Intelligence
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">
            Centre d'<span className="text-primary-600 text-5xl">Analyses</span>
          </h1>
          <p className="text-slate-500 font-medium mt-2">Vision panoramique de performance {isAdmin ? 'globale' : 'opérationnelle'}.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <Activity size={14} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider">Live System Sync</span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 pr-4">Mise à jour: {new Date().toLocaleTimeString()}</div>
        </div>
      </motion.div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAdmin && (
          <StatCard 
            title="Chiffre d'Affaires" 
            value={`${stats.revenue.total.toLocaleString()} €`} 
            trend={stats.revenue.growth} 
            icon={DollarSign} 
            color="bg-primary-600"
            delay={0}
          />
        )}
        
        <StatCard 
          title="Taux d'Occupation" 
          value={`${stats.occupancyRate}%`} 
          trend={stats.trends.occupancy} 
          icon={TrendingUp} 
          color="bg-indigo-600"
          delay={0.1}
        />
        
        <StatCard 
          title="Flotte Active" 
          value={stats.rentedVehicles} 
          subValue={`sur ${stats.totalVehicles}`} 
          icon={Car} 
          color="bg-slate-900"
          delay={0.2}
        />

        <StatCard 
          title="Clients Totaux" 
          value={stats.totalClients} 
          trend="+8%" 
          icon={Users} 
          color="bg-emerald-600"
          delay={0.3}
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Activity Chart (Custom SVG) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-8 glass-card p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative"
        >
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-2">
                <Calendar size={14} className="text-primary-600" /> 
                {isAdmin ? "Croissance des Revenus" : "Activité des Locations"}
              </h3>
              <p className="text-2xl font-black italic tracking-tighter">Évolution Mensuelle</p>
            </div>
            <div className="flex gap-2">
              {['7J', '30J', '12M'].map(t => (
                <button key={t} className={`px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all ${t === '30J' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-64 mt-12 relative">
             <CustomLineChart 
              data={stats.revenue?.history?.length > 0 ? stats.revenue.history : [
                {name: '-', val: 0}, {name: '-', val: 0}, {name: '-', val: 0}, {name: '-', val: 0}
              ]} 
              color="#d946ef" 
             />
          </div>
        </motion.div>

        {/* Breakdown Card */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-4 glass-card p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col"
        >
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
            <PieChart size={14} className="text-indigo-600" /> Répartition Flotte
          </h3>
          
          <div className="flex-1 flex flex-col justify-center gap-6">
            {(stats.categoryBreakdown || [
              {name: 'Disponibles', val: stats.availableVehicles},
              {name: 'En Location', val: stats.rentedVehicles},
              {name: 'Maintenance', val: stats.maintenanceVehicles}
            ]).map((cat, i) => (
              <div key={i} className="group">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{cat.name}</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{cat.val}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                   <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(cat.val / stats.totalVehicles) * 100}%` }}
                    transition={{ delay: 0.8 + (i * 0.1), duration: 1 }}
                    className={`h-full rounded-full ${i === 0 ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                   />
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-8 py-4 bg-slate-900 dark:bg-white dark:text-slate-900 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest transition-all hover:gap-5 group">
            Voir Inventaire <ArrowRight size={14} />
          </button>
        </motion.div>
      </div>

      {/* Footer Info Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-[2rem] border border-emerald-100 dark:border-emerald-800/50 flex items-center gap-4">
           <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
              <Circle size={24} className="fill-emerald-500" />
           </div>
           <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700/60">Disponibilité Immédiate</p>
              <p className="text-xl font-black text-emerald-700">{stats.availableVehicles} Véhicules</p>
           </div>
        </div>
        
        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center gap-4">
           <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-600 shadow-sm font-black uppercase text-xs tracking-tighter">
              {stats.activeRentals}
           </div>
           <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Contrats en Cours</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">Opérations Actives</p>
           </div>
        </div>

        <div className="p-6 bg-primary-50 dark:bg-primary-900/10 rounded-[2rem] border border-primary-100 dark:border-primary-800/50 flex items-center gap-4">
           <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-primary-600 shadow-sm">
              <Layers size={24} />
           </div>
           <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-primary-700/60">Maintenance Flotte</p>
              <p className="text-xl font-black text-primary-700">{stats.maintenanceVehicles} Scans Requis</p>
           </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subValue, trend, icon: Icon, color, delay }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="glass-card p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex flex-col gap-4 shadow-sm hover:shadow-xl transition-all"
  >
    <div className="flex justify-between items-start">
      <div className={`p-3 ${color} text-white rounded-2xl shadow-lg`}>
        <Icon size={20} />
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg tracking-widest">
          <ChevronUp size={10} /> {trend}
        </div>
      )}
    </div>
    <div>
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</h3>
        {subValue && <span className="text-xs font-bold text-slate-400">{subValue}</span>}
      </div>
    </div>
  </motion.div>
);

const CustomLineChart = ({ data, color }) => {
  const max = Math.max(...data.map(d => d.val)) || 1;
  const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - (d.val / max) * 100}`).join(' ');

  return (
    <div className="w-full h-full relative">
      <svg viewBox="0 0 100 100" className="w-full h-full preserve-3d overflow-visible" preserveAspectRatio="none">
        {/* Gradient Fill */}
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Area fill */}
        <motion.path 
          initial={{ opacity: 0, d: `M 0,100 L 0,100 L 100,100 L 100,100 Z` }}
          animate={{ opacity: 1, d: `M 0,100 L ${points} L 100,100 Z` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          fill="url(#chartGradient)"
        />

        {/* Main Line */}
        <motion.polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />

        {/* Dots */}
        {data.map((d, i) => (
          <motion.circle
            key={i}
            cx={(i / (data.length - 1)) * 100}
            cy={100 - (d.val / max) * 100}
            r="1.5"
            fill="white"
            stroke={color}
            strokeWidth="1.5"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1 + i * 0.1 }}
          />
        ))}
      </svg>
      {/* Labels */}
      <div className="absolute inset-x-0 bottom-[-24px] flex justify-between px-2">
        {data.map((d, i) => (
          <span key={i} className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{d.name}</span>
        ))}
      </div>
    </div>
  );
};

export default Analytics;
