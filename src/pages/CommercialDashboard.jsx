import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  Target,
  MessageSquare,
  TrendingUp,
  Plus,
  Calendar,
  Mail
} from 'lucide-react';
import { subscribeToCompaniesByCommercial, subscribeToObjectivesByCommercial } from '../services/firestore';
import GlobalMap from '../components/GlobalMap';

const CommercialDashboard = ({ setCurrentPage, activeAgency, profile }) => {
  const [companies, setCompanies] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    setLoading(true);
    
    const unsubCompanies = subscribeToCompaniesByCommercial(profile.id, (comps) => {
      setCompanies(comps);
      setLoading(false);
    });

    const unsubObjectives = subscribeToObjectivesByCommercial(profile.id, (objs) => {
      setObjectives(objs);
    });

    return () => {
      unsubCompanies();
      unsubObjectives();
    };
  }, [profile?.id]);

  const statCards = [
    { 
      title: 'Entreprises Gérées', 
      value: companies.length, 
      icon: Building2, 
      color: 'from-orange-500 to-teal-600', 
      bg: 'bg-orange-50 dark:bg-orange-900/30', 
      text: 'text-orange-600 dark:text-orange-400'
    },
    { 
      title: 'Objectifs Atteints', 
      value: objectives.filter(o => o.completed).length, 
      icon: Target, 
      color: 'from-teal-500 to-emerald-600', 
      bg: 'bg-teal-50 dark:bg-teal-900/30', 
      text: 'text-teal-600 dark:text-teal-400'
    },
    { 
      title: 'Objectifs Restants', 
      value: objectives.length - objectives.filter(o => o.completed).length, 
      icon: Target, 
      color: 'from-amber-500 to-orange-600', 
      bg: 'bg-amber-50 dark:bg-amber-900/30', 
      text: 'text-amber-600 dark:text-amber-400'
    },
    { 
      title: 'Total Objectifs', 
      value: objectives.length, 
      icon: TrendingUp, 
      color: 'from-cyan-500 to-teal-600', 
      bg: 'bg-cyan-50 dark:bg-cyan-900/30', 
      text: 'text-cyan-600 dark:text-cyan-400'
    }
  ];

  const quickActions = [
    { label: 'Créer Entreprise', icon: Plus, action: () => setCurrentPage('companies'), color: 'bg-orange-600 hover:bg-orange-700' },
    { label: 'Mes Objectifs', icon: Target, action: () => setCurrentPage('objectives'), color: 'bg-teal-600 hover:bg-teal-700' },
    { label: 'Mes Messages', icon: MessageSquare, action: () => setCurrentPage('messages'), color: 'bg-amber-600 hover:bg-amber-700' },
    { label: 'Calendrier', icon: Calendar, action: () => {}, color: 'bg-cyan-600 hover:bg-cyan-700' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-900 via-amber-900 to-teal-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-orange-400 border-r-4 border-teal-400 border-b-4 border-amber-400 mx-auto mb-4"></div>
          <p className="text-xl font-bold">Chargement du Tableau de Bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-900 via-amber-900 to-teal-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter italic mb-4">
            Tableau de Bord <span className="text-orange-400">Commercial</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl">
            Gérez vos entreprises clients, suivez vos objectifs et maintenez une communication fluide avec votre équipe.
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

        {/* Global Map for Commercial */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-12"
        >
          <GlobalMap companies={companies} title="Mes entreprises clientes" />
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
                <h3 className="text-2xl font-black tracking-tighter italic">Mes Entreprises</h3>
                <button
                  onClick={() => setCurrentPage('companies')}
                  className="text-orange-400 hover:text-orange-300 text-sm font-bold uppercase tracking-widest flex items-center gap-2"
                >
                  <Plus size={16} /> Voir tout
                </button>
              </div>
              <div className="space-y-4">
                {companies.slice(0, 4).map((comp, index) => (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-teal-600 rounded-xl flex items-center justify-center">
                        <Building2 size={24} className="text-white" />
                      </div>
                      <div>
                        <p className="font-black text-lg">{comp.name}</p>
                        <p className="text-slate-400 text-sm">{comp.email}</p>
                      </div>
                    </div>
                    <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
                      comp.status === 'Actif'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    }`}>
                      {comp.status || 'Actif'}
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
                <h3 className="text-2xl font-black tracking-tighter italic">Objectifs à Atteindre</h3>
                <button
                  onClick={() => setCurrentPage('objectives')}
                  className="text-teal-400 hover:text-teal-300 text-sm font-bold uppercase tracking-widest flex items-center gap-2"
                >
                  <Target size={16} /> Voir tout
                </button>
              </div>
              <div className="space-y-4">
                {objectives.slice(0, 3).map((obj, index) => (
                  <div
                    key={obj.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center">
                        <Target size={20} className="text-teal-400" />
                      </div>
                      <div>
                        <p className="font-bold">{obj.title}</p>
                        <p className="text-slate-400 text-sm">{obj.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-black">{obj.current}/{obj.target}</p>
                        <p className="text-slate-400 text-xs">{Math.round((obj.current / obj.target) * 100)}%</p>
                      </div>
                      <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-teal-500"
                          style={{ width: `${Math.min((obj.current / obj.target) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
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
              className="bg-gradient-to-br from-orange-500/20 to-teal-500/20 backdrop-blur-xl border border-orange-500/20 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center">
                  <Mail size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tighter italic">Messagerie</h3>
                  <p className="text-slate-400 text-sm">Gérez vos communications</p>
                </div>
              </div>
              <button
                onClick={() => setCurrentPage('messages')}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all uppercase tracking-widest"
              >
                Ouvrir la messagerie
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommercialDashboard;
