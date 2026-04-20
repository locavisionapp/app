import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, Search, Mail, Phone, Edit2, X, 
  MapPin, Star, History, AlertCircle, ShieldCheck, Briefcase, ChevronRight, Filter,
  Fingerprint, CreditCard, Calendar as CalendarIcon, Home
} from 'lucide-react';
import { getClients, createClient, updateClient, getClientDossier } from '../services/firestore';

const Clients = ({ currentAgency }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [dossier, setDossier] = useState(null);
  
  // Advanced Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'Tous',
    risk: 'Tous'
  });

  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    email: '',
    phone: '',
    birthDate: '',
    address: '',
    city: '',
    idNumber: '',
    licenseNumber: '',
    status: 'Actif'
  });

  useEffect(() => {
    loadClients();
  }, [currentAgency]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await getClients(currentAgency);
      setClients(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleOpenDossier = async (client) => {
    setSelectedClient(client);
    try {
      const data = await getClientDossier(client.id);
      setDossier(data);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Logic for naming
      const fullName = `${formData.firstName} ${formData.lastName}`;
      await createClient({ 
        ...formData, 
        name: fullName,
        agencyId: currentAgency 
      });
      setShowModal(false);
      resetForm();
      loadClients();
    } catch (e) { alert("Erreur lors de la création."); }
  };

  const resetForm = () => {
    setFormData({
      lastName: '', firstName: '', email: '', phone: '', birthDate: '',
      address: '', city: '', idNumber: '', licenseNumber: '', status: 'Actif'
    });
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = 
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.licenseNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status === 'Tous' || c.status === filters.status;
    const matchesRisk = filters.risk === 'Tous' || (c.riskScore?.label || 'Optimal') === filters.risk;
    
    return matchesSearch && matchesStatus && matchesRisk;
  });

  return (
    <div className="pt-4 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto pb-20">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-lg text-[9px] font-black uppercase tracking-widest mb-3">
             <Users size={12} className="animate-pulse" /> CRM Hub
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">
            Fichier <span className="text-primary-600">Clients</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">Relations et historique locataires.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }} 
          className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-500/20 flex items-center gap-3 active:scale-95 transition-all"
        >
          <Plus size={20} /> Nouveau Client
        </button>
      </motion.div>

      {/* Modern Search & Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Rechercher par nom, email, téléphone..."
              className="w-full pl-16 pr-6 py-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-4 ring-primary-500/10 font-bold transition-all text-sm shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all shadow-sm ${
              showFilters || filters.status !== 'Tous' || filters.risk !== 'Tous'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Filter size={16} />
            <span>Options de tri</span>
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Statut Client</label>
                  <select 
                    className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 outline-none font-bold text-xs"
                    value={filters.status}
                    onChange={e => setFilters({...filters, status: e.target.value})}
                  >
                    <option value="Tous">TOUS LES STATUTS</option>
                    <option value="Actif">ACTIF</option>
                    <option value="Inactif">INACTIF</option>
                    <option value="Litige">EN LITIGE</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Score de Risque</label>
                  <select 
                    className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 outline-none font-bold text-xs"
                    value={filters.risk}
                    onChange={e => setFilters({...filters, risk: e.target.value})}
                  >
                    <option value="Tous">TOUS LES NIVEAUX</option>
                    <option value="Optimal">OPTIMAL (FAIBLE)</option>
                    <option value="Moyen">MOYEN</option>
                    <option value="Critique">CRITIQUE (ÉLEVÉ)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-gray-400 font-bold animate-pulse uppercase tracking-[0.3em]">Synchro CRM...</div>
        ) : filteredClients.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-gray-800/50 rounded-[3rem] border border-dashed border-gray-200">
             <Users className="mx-auto text-gray-200 mb-4" size={64} />
             <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Aucun client enregistré</p>
          </div>
        ) : filteredClients.map(client => (
          <motion.div
            key={client.id}
            whileHover={{ y: -5 }}
            onClick={() => handleOpenDossier(client)}
            className="group cursor-pointer bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all relative overflow-hidden"
          >
            <div className="flex items-center gap-4 mb-6">
               <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  {client.firstName?.charAt(0) || client.name?.charAt(0)}
               </div>
               <div>
                  <h3 className="font-black text-gray-900 dark:text-white uppercase leading-tight">{client.name}</h3>
                  <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase truncate max-w-[150px]">{client.email}</p>
               </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl mb-4">
               <div className="text-center">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Score Risque</p>
                  <p className="text-[10px] font-black text-emerald-500 uppercase">Excellent</p>
               </div>
               <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
               <div className="text-center">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Contrats</p>
                  <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase">{(client.rentals?.length || 0)}</p>
               </div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-primary-600 font-mono">
               <span>Permis: {client.licenseNumber || 'N/A'}</span>
               <ChevronRight size={16} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Dossier Detail Slide-Over */}
      <AnimatePresence>
        {selectedClient && dossier && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedClient(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              className="relative w-full max-w-2xl bg-gray-50 dark:bg-gray-900 h-full shadow-2xl overflow-y-auto flex flex-col"
            >
              <div className="p-8 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
                <div className="flex gap-6 items-center">
                   <div className="w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-emerald-500/20">
                      {dossier.name.charAt(0)}
                   </div>
                   <div>
                      <h2 className="text-3xl font-black text-gray-900 dark:text-white leading-none mb-1 uppercase italic tracking-tighter">{dossier.name}</h2>
                      <p className="text-sm font-bold text-gray-400">{dossier.email} • {dossier.phone}</p>
                   </div>
                </div>
                <div className="flex gap-2">
                   <button 
                     onClick={async () => {
                       if (window.confirm('Supprimer définitivement ce client ?')) {
                         const { deleteClient } = await import('../services/firestore');
                         await deleteClient(dossier.id);
                         setSelectedClient(null);
                         loadClients();
                       }
                     }}
                     className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                     title="Supprimer le client"
                   >
                     <X size={24} />
                   </button>
                   <button onClick={() => setSelectedClient(null)} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:bg-gray-200 transition-all">
                     <Edit2 size={24} className="text-gray-400" />
                   </button>
                </div>
              </div>

              <div className="p-8 space-y-8">
                 {/* ID Details Card */}
                 <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] mb-6 flex items-center gap-2">
                       <ShieldCheck size={16} className="text-primary-600" /> Informations d'identité
                    </h4>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date de naissance</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><CalendarIcon size={14}/> {dossier.birthDate || 'N/A'}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">N° Identité</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Fingerprint size={14}/> {dossier.idNumber || 'N/A'}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">N° Permis</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><CreditCard size={14}/> {dossier.licenseNumber || 'N/A'}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lieu de résidence</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Home size={14}/> {dossier.city || 'N/A'}</p>
                       </div>
                    </div>
                 </div>

                 {/* History Sections */}
                 <div className="space-y-8">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                       <h4 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] mb-6 flex items-center gap-2">
                          <Briefcase size={16} className="text-primary-600" /> Historique Locations
                       </h4>
                       <div className="space-y-4">
                          {dossier.rentals?.length === 0 ? (
                            <p className="text-xs font-bold text-gray-400 italic">Aucun contrat enregistré.</p>
                          ) : dossier.rentals.map(rental => (
                            <div key={rental.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex justify-between items-center border border-transparent hover:border-primary-100 transition-all">
                               <div>
                                  <p className="text-xs font-black uppercase">{rental.vehicleName}</p>
                                  <p className="text-[10px] font-bold text-gray-400">{rental.startDate}</p>
                               </div>
                               <span className="text-[9px] font-black uppercase text-emerald-500 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">{rental.status}</span>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Client Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl my-auto">
                <h2 className="text-2xl font-black uppercase italic mb-8 tracking-tighter">Nouveau Client Expert</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Prénom</label>
                        <input required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold focus:ring-2 ring-primary-500/20" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Nom</label>
                        <input required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold uppercase focus:ring-2 ring-primary-500/20" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Date de Naissance</label>
                        <input type="date" required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold focus:ring-2 ring-primary-500/20" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Ville</label>
                        <input required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold uppercase focus:ring-2 ring-primary-500/20" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                      </div>
                   </div>

                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Adresse Complète</label>
                      <input required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold focus:ring-2 ring-primary-500/20" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">N° Identité (CNI/Passport)</label>
                        <input required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold uppercase focus:ring-2 ring-primary-500/20" value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">N° Permis de conduire</label>
                        <input required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold uppercase focus:ring-2 ring-primary-500/20" value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Email</label>
                        <input type="email" required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold focus:ring-2 ring-primary-500/20" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Téléphone</label>
                        <input type="tel" required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold focus:ring-2 ring-primary-500/20" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                      </div>
                   </div>

                   <div className="pt-8 flex justify-end gap-3">
                      <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 font-black uppercase text-[10px] text-gray-400">Annuler</button>
                      <button type="submit" className="px-10 py-5 bg-primary-600 text-white rounded-[2rem] font-black uppercase text-[12px] tracking-[0.2em] shadow-xl shadow-primary-500/20 active:scale-95 transition-all">Enregistrer le dossier</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Clients;
