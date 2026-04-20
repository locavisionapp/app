import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wrench, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Car,
  Filter,
  BarChart2
} from 'lucide-react';
import { getMaintenanceForecast } from '../services/firestore';

const Maintenance = ({ currentAgency }) => {
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadForecast();
  }, [currentAgency]);

  const loadForecast = async () => {
    setLoading(true);
    try {
      const data = await getMaintenanceForecast(currentAgency);
      setForecast(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = forecast.filter(item => {
    if (filter === 'all') return true;
    return item.urgency === filter;
  });

  if (loading) {
     return <div className="flex items-center justify-center h-64"><div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-slate-900 dark:text-white">
        <div>
           <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-widest mb-4">
             <Wrench size={12} /> Gestion Prédictive
           </div>
           <h1 className="text-4xl font-black tracking-tighter italic uppercase">Maintenance <span className="text-primary-600">&</span> Révisions</h1>
           <p className="text-slate-500 font-medium mt-2">Planification intelligente basée sur le kilométrage et l'analyse IA.</p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
           {['all', 'haute', 'moyenne', 'basse'].map(f => (
             <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${filter === f ? 'bg-white dark:bg-slate-800 shadow-sm text-primary-600' : 'text-slate-400'}`}
             >
               {f === 'all' ? 'Toutes' : f}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-4">
           {filteredData.map((item, i) => (
             <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              key={item.vehicleId} 
              className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-primary-500/30 transition-all shadow-sm"
             >
               <div className="flex items-center gap-6">
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                   item.urgency === 'haute' ? 'bg-rose-500 text-white shadow-rose-500/20' : 
                   item.urgency === 'moyenne' ? 'bg-amber-500 text-white shadow-amber-500/20' : 
                   'bg-emerald-500 text-white shadow-emerald-500/20'
                 }`}>
                   <Car size={24} />
                 </div>
                 <div>
                    <h4 className="font-black text-lg uppercase italic tracking-tight">{item.brand} {item.model}</h4>
                    <p className="text-xs text-slate-400 font-bold tracking-widest">{item.licensePlate}</p>
                 </div>
               </div>

               <div className="hidden md:flex items-center gap-12">
                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Score IA</p>
                    <div className="flex items-center gap-1 font-black text-sm">
                       {item.lastScore}/10
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Prochaine Échéance</p>
                    <div className="flex items-center gap-2 font-black text-sm text-slate-600 dark:text-slate-300">
                       <Calendar size={14} className="text-primary-600" /> {new Date(item.nextService).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
               </div>

               <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                    item.urgency === 'haute' ? 'bg-rose-100 text-rose-600' : 
                    item.urgency === 'moyenne' ? 'bg-amber-100 text-amber-600' : 
                    'bg-emerald-100 text-emerald-600'
                  }`}>
                    Urgence {item.urgency}
                  </div>
                  <button className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:bg-primary-600 transition-colors">
                    <ChevronRight size={18} />
                  </button>
               </div>
             </motion.div>
           ))}

           {filteredData.length === 0 && (
             <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4 opacity-20" />
                <p className="font-black uppercase tracking-widest text-slate-400 text-xs">Aucune maintenance requise</p>
             </div>
           )}
        </div>

        <div className="lg:col-span-4 space-y-6">
           <div className="glass-card p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 bg-primary-600 text-white shadow-xl shadow-primary-500/20">
              <BarChart2 size={32} className="mb-6 opacity-40" />
              <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none mb-1">Résumé Santé</h3>
              <p className="text-primary-100 text-xs font-bold uppercase tracking-widest mb-8">Statistiques Flotte Globale</p>
              
              <div className="space-y-6">
                 <div className="flex justify-between items-end border-b border-primary-500/50 pb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">En Alerte (Haute)</span>
                    <span className="text-3xl font-black">{forecast.filter(f => f.urgency === 'haute').length}</span>
                 </div>
                 <div className="flex justify-between items-end border-b border-primary-500/50 pb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">À Prévoir (Moyenne)</span>
                    <span className="text-3xl font-black">{forecast.filter(f => f.urgency === 'moyenne').length}</span>
                 </div>
                 <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">État Sain</span>
                    <span className="text-3xl font-black">{forecast.filter(f => f.urgency === 'basse').length}</span>
                 </div>
              </div>
           </div>

           <div className="glass-card p-8 rounded-[4rem] border border-slate-200 dark:border-slate-800 text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                 <AlertTriangle size={32} />
              </div>
              <h4 className="font-black uppercase tracking-tight italic text-lg mb-2">Conseil Expert IA</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                "Le véhicule <b>GF-555-RT</b> présente des micro-rayures sur le bas de caisse. Prévoyez un lustrage lors de la prochaine révision pour maintenir sa valeur de revente."
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
