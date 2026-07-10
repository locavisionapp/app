import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Car,
  UserCircle,
  Building2,
  Activity,
  Settings,
  FileText,
  Target
} from 'lucide-react';
import { subscribeToCompanies, subscribeToCommercials, subscribeToLogs, subscribeToVehicles, computeFleetAnalytics } from '../services/firestore';
import GlobalMap from '../components/GlobalMap';

const SuperAdminDashboard = ({ setCurrentPage, activeAgency, profile }) => {
  const [analytics, setAnalytics] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [commercials, setCommercials] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // No need to check role here since App.jsx already handles which dashboard to show
  useEffect(() => {
    const unsubCompanies = subscribeToCompanies((comps) => setCompanies(comps));
    const unsubCommercials = subscribeToCommercials((comms) => setCommercials(comms));
    const unsubLogs = subscribeToLogs(100, (logData) => setLogs(logData));
    const unsubVehicles = subscribeToVehicles({}, (vics) => {
      setAnalytics(computeFleetAnalytics(vics));
      setLoading(false);
    });

    return () => {
      unsubCompanies();
      unsubCommercials();
      unsubLogs();
      unsubVehicles();
    };
  }, []);

  const statCards = [
    { 
      title: 'Total Entreprises', 
      value: companies.length, 
      icon: Building2, 
      color: 'from-blue-500 to-indigo-600', 
      bg: 'bg-blue-50 dark:bg-blue-900/30', 
      text: 'text-blue-600 dark:text-blue-400'
    },
    { 
      title: 'Total Commerciaux', 
      value: commercials.length, 
      icon: UserCircle, 
      color: 'from-purple-500 to-pink-600', 
      bg: 'bg-purple-50 dark:bg-purple-900/30', 
      text: 'text-purple-600 dark:text-purple-400'
    },
    { 
      title: 'Total Véhicules', 
      value: analytics?.totalVehicles || 0, 
      icon: Car, 
      color: 'from-indigo-500 to-blue-600', 
      bg: 'bg-indigo-50 dark:bg-indigo-900/30', 
      text: 'text-indigo-600 dark:text-indigo-400'
    },
    { 
      title: 'Taux Occupation', 
      value: `${analytics?.occupancyRate || 0}%`, 
      icon: Activity, 
      color: 'from-emerald-500 to-green-600', 
      bg: 'bg-emerald-50 dark:bg-emerald-900/30', 
      text: 'text-emerald-600 dark:text-emerald-400'
    }
  ];

  const quickActions = [
    { label: 'Gérer Commerciaux', icon: UserCircle, action: () => setCurrentPage('commercials'), color: 'bg-blue-600 hover:bg-blue-700' },
    { label: 'Gérer Entreprises', icon: Building2, action: () => setCurrentPage('companies'), color: 'bg-purple-600 hover:bg-purple-700' },
    { label: 'Voir Logs', icon: FileText, action: () => setCurrentPage('logs'), color: 'bg-indigo-600 hover:bg-indigo-700' },
    { label: 'Paramètres Système', icon: Settings, action: () => setCurrentPage('settings'), color: 'bg-emerald-600 hover:bg-emerald-700' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-400 border-r-4 border-purple-400 border-b-4 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-xl font-bold">Chargement du Super Admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter italic mb-4">
            Centre de Contrôle <span className="text-blue-400">Super Admin</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl">
            Vue d'ensemble complète de la plateforme LocaVision. Gérez les commerciaux, les entreprises et surveillez la santé du système.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {statCards.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`p-8 rounded-3xl border border-white/10 ${stat.bg} backdrop-blur-xl shadow-2xl`}
            >
              <div className={`w-14 h-14 bg-gradient-to-br ${stat.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                <stat.icon size={28} className="text-white" />
              </div>
              <p className={`text-[11px] font-black uppercase tracking-widest ${stat.text} opacity-75 mb-2`}>
                {stat.title}
              </p>
              <p className="text-4xl font-black tracking-tighter italic">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Global Map */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-12"
        >
          <GlobalMap companies={companies} title="Toutes les entreprises de la plateforme" />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black tracking-tighter italic">Commerciaux Actifs</h3>
                <button
                  onClick={() => setCurrentPage('commercials')}
                  className="text-blue-400 hover:text-blue-300 text-sm font-bold uppercase tracking-widest flex items-center gap-2"
                >
                  <Activity size={16} /> Voir tout
                </button>
              </div>
              <div className="space-y-4">
                {commercials.slice(0, 4).map((comm, index) => (
                  <div
                    key={comm.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <UserCircle size={24} className="text-white" />
                      </div>
                      <div>
                        <p className="font-black text-lg">{comm.name}</p>
                        <p className="text-slate-400 text-sm">{comm.email}</p>
                      </div>
                    </div>
                    <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
                      comm.status === 'Actif'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    }`}>
                      {comm.status}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black tracking-tighter italic">Journal d'activité</h3>
                <button
                  onClick={() => setCurrentPage('logs')}
                  className="text-purple-400 hover:text-purple-300 text-sm font-bold uppercase tracking-widest flex items-center gap-2"
                >
                  <FileText size={16} /> Voir tout
                </button>
              </div>
              <div className="space-y-4">
                {logs.slice(0, 4).map((log, index) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5"
                  >
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                      <FileText size={20} className="text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{log.action}</p>
                      <p className="text-slate-400 text-sm">Utilisateur: {log.user}</p>
                    </div>
                    <span className="text-slate-500 text-sm">{log.date} {log.time}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-black tracking-tighter italic mb-6">Actions Rapides</h3>
              <div className="space-y-4">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl ${action.color} text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-lg`}
                  >
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <action.icon size={20} />
                    </div>
                    <span className="uppercase tracking-widest">{action.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-xl border border-blue-500/20 rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-black tracking-tighter italic mb-6">Santé Plateforme</h3>
              <div className="space-y-4">
                {[
                  { label: 'Serveur Connexion', status: navigator.onLine ? 'ONLINE' : 'OFFLINE', color: navigator.onLine ? 'text-emerald-400' : 'text-rose-400', bg: navigator.onLine ? 'bg-emerald-500/20' : 'bg-rose-500/20' },
                  { label: 'Base de données', status: (companies.length > 0 || analytics !== null) ? 'OK' : 'ERROR', color: (companies.length > 0 || analytics !== null) ? 'text-emerald-400' : 'text-rose-400', bg: (companies.length > 0 || analytics !== null) ? 'bg-emerald-500/20' : 'bg-rose-500/20' },
                  { label: 'Réseau Synchro', status: navigator.onLine ? 'SYNCED' : 'LOCAL ONLY', color: navigator.onLine ? 'text-emerald-400' : 'text-yellow-400', bg: navigator.onLine ? 'bg-emerald-500/20' : 'bg-yellow-500/20' }
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-2xl"
                  >
                    <span className="font-bold">{item.label}</span>
                    <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest ${item.bg} ${item.color}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
