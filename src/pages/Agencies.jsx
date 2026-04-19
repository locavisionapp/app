import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, 
  Plus, 
  MapPin, 
  Phone, 
  Mail, 
  Building2, 
  TrendingUp, 
  Users, 
  MoreVertical,
  X,
  CheckCircle2,
  Lock
} from 'lucide-react';

const Agencies = () => {
  const [agencies, setAgencies] = useState([
    { id: 'agency_main', name: 'Agence Nord', city: 'Lille', address: '12 Rue de la Paix', phone: '03 20 00 00 00', staff: 12, vehicles: 45, status: 'Principal' },
    { id: 'agency_south', name: 'Agence Sud', city: 'Lyon', address: '45 Avenue Jean Jaurès', phone: '04 72 00 00 00', staff: 8, vehicles: 28, status: 'Actif' },
    { id: 'agency_log', name: 'Centre Logistique', city: 'Paris', address: 'ZAC des Batignolles', phone: '01 40 00 00 00', staff: 25, vehicles: 120, status: 'Logistique' },
  ]);
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="pt-4 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto pb-20">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full text-[9px] font-black uppercase tracking-widest mb-4">
             <Building2 size={12} className="animate-pulse" /> Network Governance
          </div>
          <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic">
            Gestion des <span className="text-primary-600">Agences</span>
          </h1>
          <p className="text-slate-500 font-medium mt-2">Pilotez votre réseau national et configurez vos points de vente.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="px-8 py-4 bg-primary-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary-500/30 flex items-center gap-3 active:scale-95 transition-all"
        >
          <Plus size={20} /> Nouvelle Agence
        </button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {agencies.map((agency, i) => (
          <motion.div
            key={agency.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 relative group overflow-hidden"
          >
            <div className="flex justify-between items-start mb-8">
               <div className="w-14 h-14 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center text-primary-600 shadow-sm border border-primary-500/10">
                  <Briefcase size={24} />
               </div>
               <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                 agency.status === 'Principal' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
               }`}>
                 {agency.status}
               </span>
            </div>

            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic mb-2">{agency.name}</h3>
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">
               <MapPin size={12} /> {agency.city}
            </div>

            <div className="space-y-4 mb-8">
               <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                  <Phone size={14} className="text-primary-500" />
                  <span className="font-medium">{agency.phone}</span>
               </div>
               <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                  <Mail size={14} className="text-primary-500" />
                  <span className="font-medium">{agency.address}</span>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/50">
               <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Véhicules</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white italic tracking-tighter">{agency.vehicles}</p>
               </div>
               <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Employés</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white italic tracking-tighter">{agency.staff}</p>
               </div>
            </div>

            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
               <button className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-all">
                  <MoreVertical size={16} />
               </button>
            </div>

            {agency.status === 'Logistique' && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/5 rotate-45 translate-x-16 -translate-y-16 pointer-events-none" />
            )}
          </motion.div>
        ))}
        
        {/* Placeholder for expansion */}
        <motion.div 
          onClick={() => setShowModal(true)}
          className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-400 hover:border-primary-500 hover:text-primary-500 transition-all cursor-pointer group"
        >
           <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-4 group-hover:bg-primary-500 group-hover:text-white transition-all">
              <Plus size={32} />
           </div>
           <p className="font-black uppercase tracking-widest text-[10px]">Étendre le Réseau</p>
        </motion.div>
      </div>

      {/* Stats Summary */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-8">
         <div className="p-8 bg-slate-900 dark:bg-white rounded-[2rem] text-white dark:text-slate-900 shadow-xl">
            <TrendingUp size={24} className="mb-4 text-primary-500" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Agences</p>
            <p className="text-4xl font-black italic tracking-tighter">{agencies.length}</p>
         </div>
         <div className="p-8 bg-primary-600 rounded-[2rem] text-white shadow-xl shadow-primary-500/30">
            <Users size={24} className="mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Effectif Global</p>
            <p className="text-4xl font-black italic tracking-tighter">45</p>
         </div>
      </div>

      {/* Modal Simulation */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-slate-950 p-10 rounded-[3rem] w-full max-w-xl shadow-2xl border border-white/10 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/10 blur-[60px] rounded-full" />
                <div className="relative z-10">
                   <div className="flex justify-between items-center mb-8">
                      <h2 className="text-3xl font-black italic uppercase tracking-tighter">Nouvelle Agence</h2>
                      <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                         <X size={24} />
                      </button>
                   </div>
                   <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); setShowModal(false); }}>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nom Commercial</label>
                         <input className="premium-input" placeholder="ex: Agence Est - Strasbourg" required />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Ville</label>
                            <input className="premium-input" placeholder="Ville" required />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Statut</label>
                            <select className="premium-input">
                               <option>Actif</option>
                               <option>Logistique</option>
                               <option>Maintenance Only</option>
                            </select>
                         </div>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Adresse Complète</label>
                         <textarea className="premium-input min-h-[100px]" placeholder="Numéro et rue..." />
                      </div>
                      <button className="w-full py-5 bg-primary-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-500/20 active:scale-95 transition-all">
                         Enregistrer l'Agence
                      </button>
                   </form>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Agencies;
