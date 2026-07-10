import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Car,
  MapPin,
  Users,
  TrendingUp,
  AlertTriangle,
  Calendar,
  FileText,
  Settings
} from 'lucide-react';
import { subscribeToVehicles, subscribeToAgenciesByCompany, subscribeToAlerts, computeFleetAnalytics } from '../services/firestore';

const CompanyDashboard = ({ setCurrentPage, activeAgency, profile }) => {
  const [analytics, setAnalytics] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const filters = {};
    if (activeAgency?.id) {
      filters.agencyId = activeAgency.id;
    } else if (profile?.companyId) {
      filters.companyId = profile.companyId;
    }

    const unsubVehicles = subscribeToVehicles(filters, (vics) => {
      setVehicles(vics);
      setAnalytics(computeFleetAnalytics(vics));
      setLoading(false);
    });

    const unsubAgencies = subscribeToAgenciesByCompany(profile?.companyId, (ags) => {
      setAgencies(ags);
    });

    const unsubAlerts = subscribeToAlerts({ companyId: profile?.companyId }, (alrts) => {
      setAlerts(alrts);
    });

    return () => {
      unsubVehicles();
      unsubAgencies();
      unsubAlerts();
    };
  }, [profile?.companyId, activeAgency?.id]);

  const statCards = [
    { 
      title: 'Véhicules Total', 
      value: analytics?.totalVehicles || 0, 
      icon: Car, 
      color: 'from-emerald-500 to-green-600', 
      bg: 'bg-emerald-50 dark:bg-emerald-900/30', 
      text: 'text-emerald-600 dark:text-emerald-400'
    },
    { 
      title: 'Disponibles', 
      value: analytics?.availableVehicles || 0, 
      icon: MapPin, 
      color: 'from-green-500 to-emerald-600', 
      bg: 'bg-green-50 dark:bg-green-900/30', 
      text: 'text-green-600 dark:text-green-400'
    },
    { 
      title: 'Agences', 
      value: agencies.length, 
      icon: Users, 
      color: 'from-lime-500 to-green-600', 
      bg: 'bg-lime-50 dark:bg-lime-900/30', 
      text: 'text-lime-600 dark:text-lime-400'
    },
    { 
      title: 'Occupation', 
      value: `${analytics?.occupancyRate || 0}%`, 
      icon: TrendingUp, 
      color: 'from-green-600 to-emerald-700', 
      bg: 'bg-emerald-50 dark:bg-emerald-900/30', 
      text: 'text-emerald-700 dark:text-emerald-500'
    }
  ];

  const quickActions = [
    { label: 'Véhicules', icon: Car, action: () => setCurrentPage('vehicles'), color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: 'Agences', icon: MapPin, action: () => setCurrentPage('agencies'), color: 'bg-green-600 hover:bg-green-700' },
    { label: 'Locations', icon: Calendar, action: () => setCurrentPage('rentals'), color: 'bg-lime-600 hover:bg-lime-700' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-emerald-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-emerald-400 border-r-4 border-green-400 border-b-4 border-lime-400 mx-auto mb-4"></div>
          <p className="text-xl font-bold">Chargement de votre Espace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-emerald-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter italic mb-4">
            Espace <span className="text-emerald-400">Entreprise</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl">
            Gérez votre flotte, vos agences et suivez les performances en temps réel. Optimisez vos locations et maintenez une vue d'ensemble complète.
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black tracking-tighter italic">Votre Flotte</h3>
                <button
                  onClick={() => setCurrentPage('vehicles')}
                  className="text-emerald-400 hover:text-emerald-300 text-sm font-bold uppercase tracking-widest flex items-center gap-2"
                >
                  <Car size={16} /> Voir tout
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicles.slice(0, 4).map((vehicle, index) => (
                  <div
                    key={vehicle.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                        <Car size={24} className="text-white" />
                      </div>
                      <div>
                        <p className="font-black text-lg">{vehicle.brand} {vehicle.model}</p>
                        <p className="text-slate-400 text-sm">{vehicle.licensePlate}</p>
                      </div>
                    </div>
                    <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
                      vehicle.status === 'Disponible'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : vehicle.status === 'Loué'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}>
                      {vehicle.status}
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
                <h3 className="text-2xl font-black tracking-tighter italic">Alertes</h3>
                <button
                  onClick={() => setCurrentPage('alerts')}
                  className="text-yellow-400 hover:text-yellow-300 text-sm font-bold uppercase tracking-widest flex items-center gap-2"
                >
                  <AlertTriangle size={16} /> Voir tout
                </button>
              </div>
               <div className="space-y-4">
                {alerts.length === 0 ? (
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-slate-400 text-sm text-center">
                    Aucune alerte pour le moment.
                  </div>
                ) : (
                  alerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="flex items-start gap-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                      <AlertTriangle size={24} className="text-yellow-400 mt-1" />
                      <div>
                        <p className="font-bold">{alert.title}</p>
                        <p className="text-slate-400 text-sm">{alert.message || alert.text}</p>
                      </div>
                    </div>
                  ))
                )}
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
              className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-black tracking-tighter italic mb-6">Vos Agences</h3>
              <div className="space-y-4">
                {agencies.slice(0, 3).map((agency, index) => (
                  <div
                    key={agency.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                        <MapPin size={20} className="text-emerald-400" />
                      </div>
                      <p className="font-bold">{agency.name}</p>
                    </div>
                    <p className="text-slate-400 text-sm">{agency.location}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage('agencies')}
                className="w-full mt-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all uppercase tracking-widest"
              >
                Gérer les agences
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;
