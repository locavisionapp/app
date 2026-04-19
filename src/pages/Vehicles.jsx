import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car, Plus, Search, Filter, Edit2, CheckCircle2, X,
  Camera, Scan, Sparkles, RefreshCcw, Fuel, Settings2, Zap, Leaf, Truck, Bike, Construction, Box, History, Map as MapIcon, ChevronRight, AlertCircle, Info, Calendar,
  TrendingUp,
  DollarSign,
  User,
  Clock,
  ArrowUpRight,
  Shield,
  Gauge
} from 'lucide-react';
import { getVehicles, createVehicle, updateVehicle, getVehicleDossier } from '../services/firestore';
import { extractVehicleInfoFromPlate } from '../services/gemini';
import DamageHeatmap from '../components/DamageHeatmap';
import CameraCapture from '../components/CameraCapture';

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [dossierTab, setDossierTab] = useState('overview');

  const [lookupStep, setLookupStep] = useState('initial');
  const [lookupPlate, setLookupPlate] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [scannedImage, setScannedImage] = useState(null);
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [newMileage, setNewMileage] = useState('');
  
  // Advanced Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'Tous',
    category: 'Toutes',
    fuel: 'Tous'
  });

  const [formData, setFormData] = useState({
    brand: '', model: '', year: '', licensePlate: '', vin: '', category: 'citadine', mileage: '', status: 'Disponible',
    fuel: 'Essence', transmission: 'Manuelle', color: '', seats: 5, doors: 5, power: '', co2: '', critAir: '',
    dailyPrice: 45, depositAmount: 1500,
    length: '', width: '', height: '', trunkVolume: '', acceleration: '', torque: ''
  });

  useEffect(() => {
    loadVehicles();
    // Check for quick actions from dashboard
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'add') {
      setShowModal(true);
    }
  }, []);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const data = await getVehicles();
      setVehicles(data || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleOpenDossier = async (vehicle) => {
    setSelectedVehicle(vehicle);
    setDossierTab('overview');
    try {
      const data = await getVehicleDossier(vehicle.id);
      setDossier(data);
    } catch (err) { console.error(err); }
  };

  const handleEdit = (v) => {
     setEditingId(v.id);
     setFormData({ ...v });
     setLookupStep('full_form');
     setShowModal(true);
     setSelectedVehicle(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const cleanData = { ...formData, updatedAt: new Date() };
      if (editingId) { 
        await updateVehicle(editingId, cleanData); 
      } else { 
        await createVehicle(cleanData); 
      }
      setShowModal(false);
      resetForm();
      loadVehicles();
    } catch (error) { alert(`Erreur : ${error.message}`); }
    finally { setIsSaving(false); }
  };

  const resetForm = () => {
    setEditingId(null);
    setLookupStep('initial');
    setLookupPlate('');
    setScannedImage(null);
    setFormData({
      brand: '', model: '', year: '', licensePlate: '', vin: '', category: 'citadine', mileage: '', status: 'Disponible',
      fuel: 'Essence', transmission: 'Manuelle', color: '', seats: 5, doors: 5, power: '', co2: '', critAir: '',
      dailyPrice: 45, depositAmount: 1500,
      length: '', width: '', height: '', trunkVolume: '', acceleration: '', torque: ''
    });
  };

  const getCategoryIcon = (category) => {
    if (['camion', 'utilitaire'].includes(category?.toLowerCase())) return <Truck size={20} />;
    if (['moto', 'scooter'].includes(category?.toLowerCase())) return <Bike size={20} />;
    if (['suv'].includes(category?.toLowerCase())) return <Construction size={20} />;
    return <Car size={20} />;
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = 
      v.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status === 'Tous' || v.status === filters.status;
    const matchesCategory = filters.category === 'Toutes' || v.category === filters.category;
    const matchesFuel = filters.fuel === 'Tous' || v.fuel === filters.fuel;
    
    return matchesSearch && matchesStatus && matchesCategory && matchesFuel;
  });

  // Financial Stats Calculation
  const calculateStats = (rentals) => {
     if (!rentals) return { total: 0, count: 0 };
     const activeRentals = rentals.filter(r => r.status !== 'Annulé');
     const total = activeRentals.reduce((sum, r) => sum + (parseFloat(r.totalPrice) || 0), 0);
     return { total, count: activeRentals.length };
  };

  return (
    <div className="pt-4 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto pb-20">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full text-[9px] font-black uppercase tracking-widest mb-4">
             <Car size={12} className="animate-pulse" /> Fleet Inventory 2026
          </div>
          <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic">
            Votre <span className="text-primary-600">Flotte</span>
          </h1>
          <p className="text-slate-500 font-medium mt-2">Gérez vos actifs avec une précision chirurgicale.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }} 
          className="px-8 py-4 bg-primary-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary-500/30 flex items-center gap-3 active:scale-95 transition-all"
        >
          <Plus size={20} /> Ajouter un véhicule
        </button>
      </motion.div>

      {/* Filters & Search */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-[2rem] overflow-hidden mb-8 border border-white/10"
      >
        <div className="p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Rechercher par plaque, marque, modèle..."
                className="w-full pl-16 pr-6 py-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-4 ring-primary-500/10 font-bold transition-all text-sm mb-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 transition-all ${
                showFilters 
                  ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/20'
                  : 'bg-white dark:bg-gray-800 text-slate-500 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Filter size={16} />
              Filtres Avancés
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 mt-8 border-t border-slate-100 dark:border-slate-800/50">
                  {/* Reuse Existing Selectors */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Statut Actuel</label>
                    <select className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-xl outline-none font-bold text-xs" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
                      <option value="Tous">TOUS LES STATUTS</option>
                      <option value="Disponible">DISPONIBLE</option>
                      <option value="Loué">LOUÉ</option>
                      <option value="Maintenance">MAINTENANCE</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Typologie</label>
                    <select className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-xl outline-none font-bold text-xs" value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}>
                      <option value="Toutes">TOUTES LES CATÉGORIES</option>
                      <option value="citadine">CITADINE</option>
                      <option value="suv">SUV</option>
                      <option value="utilitaire">UTILITAIRE</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Carburation</label>
                    <select className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-xl outline-none font-bold text-xs" value={filters.fuel} onChange={e => setFilters({...filters, fuel: e.target.value})}>
                      <option value="Tous">TOUS LES CARBURANTS</option>
                      <option value="Essence">ESSENCE</option>
                      <option value="Diesel">DIESEL</option>
                      <option value="Électrique">ÉLECTRIQUE</option>
                      <option value="Hybride">HYBRIDE</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
        {loading ? (
          <div className="col-span-full py-40 flex flex-col items-center gap-4">
             <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
             <p className="font-black uppercase text-xs tracking-[0.3em] text-gray-400">Accès Fleet Database...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-gray-50/50 dark:bg-gray-800/30 rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800">
             <Car className="mx-auto text-gray-200 dark:text-gray-800 mb-6" size={80} />
             <p className="font-black text-gray-400 uppercase tracking-[0.2em] text-xs">Aucun véhicule répertorié</p>
          </div>
        ) : filteredVehicles.map(vehicle => (
          <motion.div
            key={vehicle.id}
            whileHover={{ y: -8, scale: 1.02 }}
            onClick={() => handleOpenDossier(vehicle)}
            className="group cursor-pointer bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-2xl hover:border-primary-500/30 transition-all relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-600 opacity-[0.03] rounded-full group-hover:scale-150 transition-transform" />
            
            <div className="flex justify-between items-start mb-8">
               <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-all shadow-sm">
                     {getCategoryIcon(vehicle.category)}
                  </div>
                  <div>
                     <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase leading-none italic">{vehicle.brand} {vehicle.model}</h3>
                     <p className="text-[10px] font-black tracking-widest text-gray-400 mt-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded uppercase">{vehicle.licensePlate}</p>
                  </div>
               </div>
               <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                 vehicle.status === 'Disponible' ? 'bg-emerald-100 text-emerald-700' : 'bg-primary-100 text-primary-700'
               }`}>
                 {vehicle.status}
               </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-6 grid grid-cols-2 gap-4 mb-8">
               <div>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Tarif Journalier</p>
                  <p className="text-2xl font-black text-primary-600 tracking-tighter">{vehicle.dailyPrice || 0}€</p>
               </div>
               <div>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Caution Système</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter opacity-70 italic">{vehicle.depositAmount || 0}€</p>
               </div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-primary-600 group-hover:tracking-[0.3em] transition-all">
               <span>Explorer le Dossier</span>
               <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                  <ChevronRight size={16} />
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* IMMERSIVE DOSSIER CONSOLE */}
      <AnimatePresence mode="wait">
        {selectedVehicle && dossier && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedVehicle(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-5xl bg-white dark:bg-gray-950 h-full shadow-2xl overflow-hidden flex flex-col"
            >
               {/* Dossier Header */}
               <div className="p-10 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="flex gap-8">
                     <motion.div 
                       layoutId={`icon-${dossier.id}`}
                       className="w-32 h-32 bg-primary-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-primary-500/30"
                     >
                        {getCategoryIcon(dossier.category)}
                     </motion.div>
                     <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-4 mb-4">
                           <span className="px-4 py-1.5 bg-white dark:bg-gray-800 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border border-gray-100 dark:border-gray-700">{dossier.category}</span>
                           <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${dossier.status === 'Disponible' ? 'bg-emerald-500 text-white' : 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'}`}>
                              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                              {dossier.status}
                           </div>
                        </div>
                        <h2 className="text-5xl font-black text-gray-900 dark:text-white leading-[0.9] uppercase italic tracking-tighter mb-2">
                           {dossier.brand} <span className="text-primary-600">{dossier.model}</span>
                        </h2>
                        <div className="flex items-center gap-4 font-mono text-xl font-black text-gray-400">
                           <Shield size={20} className="text-emerald-500" /> {dossier.licensePlate}
                           <span className="text-xs font-sans font-black uppercase tracking-widest ml-4">ID: {dossier.id.slice(-6).toUpperCase()}</span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex gap-3">
                     <button 
                       onClick={() => handleEdit(dossier)}
                       className="p-4 bg-white dark:bg-gray-800 text-primary-600 rounded-2xl hover:bg-primary-600 hover:text-white transition-all shadow-xl shadow-gray-200/20 group"
                       title="Modifier le véhicule"
                     >
                        <Edit2 size={24} className="group-hover:rotate-12 transition-transform" />
                     </button>
                     <button 
                       onClick={async () => {
                         if (window.confirm('Action irréversible : Supprimer ce véhicule de la flotte ?')) {
                           const { deleteVehicle } = await import('../services/firestore');
                           await deleteVehicle(dossier.id);
                           setSelectedVehicle(null);
                           loadVehicles();
                         }
                       }}
                       className="p-4 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-lg"
                     >
                        <X size={24} />
                     </button>
                  </div>
               </div>

               {/* Tabs Navigation */}
               <div className="flex gap-10 px-10 pt-8 border-b border-gray-100 dark:border-gray-800">
                  {['overview', 'history', 'finance'].map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setDossierTab(tab)}
                      className={`pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${
                        dossierTab === tab ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                       {tab === 'overview' ? 'Dossier Technique' : tab === 'history' ? 'Historique Scans' : 'Console Financière'}
                       {dossierTab === tab && (
                         <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-primary-600 rounded-full" />
                       )}
                    </button>
                  ))}
               </div>

               {/* Dossier Content Area */}
               <div className="flex-1 p-10 overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {dossierTab === 'overview' && (
                      <motion.div 
                        key="overview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="grid grid-cols-12 gap-8"
                      >
                         {/* Damage Map */}
                         <div className="col-span-12 lg:col-span-7 space-y-8">
                            <div className="glass-card p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                               <div className="absolute top-10 right-10 flex flex-col items-end">
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Santé Carrosserie</p>
                                  <p className="text-3xl font-black text-emerald-500 leading-none">98.4%</p>
                               </div>
                               <h4 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] mb-10 flex items-center gap-3">
                                  <MapIcon size={20} className="text-primary-600" /> Matrice des Dommages
                               </h4>
                               <DamageHeatmap damages={dossier.damages || []} />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/50">
                               <h4 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] mb-8 flex items-center gap-3">
                                  <Settings2 size={20} className="text-primary-600" /> Fiche Technique IA
                               </h4>
                               <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                  {[
                                     { label: 'Energie', value: dossier.fuel, icon: Fuel },
                                     { label: 'Transmission', value: dossier.transmission, icon: Settings2 },
                                     { 
                                       label: 'Kilométrage', 
                                       value: (
                                         <div className="flex items-center gap-2">
                                           <span>{dossier.mileage || 0} km</span>
                                           <button 
                                             onClick={() => {
                                               setNewMileage(dossier.mileage || '');
                                               setShowMileageModal(true);
                                             }}
                                             className="p-1.5 hover:bg-white dark:hover:bg-primary-600 rounded-lg text-primary-600 dark:text-primary-400 dark:hover:text-white transition-all shadow-sm"
                                           >
                                             <Edit2 size={12} />
                                           </button>
                                         </div>
                                       ), 
                                       icon: Gauge 
                                     },
                                     { label: 'Puissance', value: `${dossier.power || '-'} CV`, icon: Zap },
                                    { label: 'Crit\'Air', value: dossier.critAir || '1', icon: Leaf },
                                    { label: 'Portes', value: dossier.doors, icon: Box },
                                    { label: 'Modèle', value: dossier.year, icon: Calendar },
                                    { label: 'Teinte', value: dossier.color || 'Standard', icon: Sparkles }
                                  ].map((spec, i) => (
                                    <div key={i} className="flex flex-col gap-2">
                                       <div className="flex items-center gap-2 text-primary-500">
                                          <spec.icon size={16} />
                                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{spec.label}</span>
                                       </div>
                                       <p className="text-sm font-black text-gray-900 dark:text-white uppercase truncate">{spec.value}</p>
                                    </div>
                                  ))}
                               </div>
                            </div>
                         </div>

                         {/* Quick KPIs Sidebar */}
                         <div className="col-span-12 lg:col-span-5 space-y-6">
                             <div className="p-8 bg-primary-600 rounded-[3rem] text-white shadow-2xl shadow-primary-500/40 relative overflow-hidden group">
                                <TrendingUp className="absolute bottom-[-20px] right-[-20px] w-40 h-40 opacity-10 group-hover:scale-110 transition-transform" />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-6">Performance Financière</p>
                                <div className="space-y-4">
                                   <div>
                                      <p className="text-xs font-black uppercase tracking-widest opacity-70 italic">Revenu Total Généré</p>
                                      <p className="text-6xl font-black italic tracking-tighter">{calculateStats(dossier.rentals).total.toLocaleString()}€</p>
                                   </div>
                                   <div className="flex justify-between items-end border-t border-white/20 pt-4">
                                      <div>
                                         <p className="text-[10px] font-black uppercase opacity-70">Locations</p>
                                         <p className="text-2xl font-black">{calculateStats(dossier.rentals).count}</p>
                                      </div>
                                      <ArrowUpRight size={32} />
                                   </div>
                                </div>
                             </div>

                             <div className="p-8 bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-6">Dernière Location</h4>
                                {dossier.rentals?.length > 0 ? (
                                  <div className="flex items-center justify-between">
                                     <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center text-primary-600">
                                           <User size={20} />
                                        </div>
                                        <div>
                                           <p className="text-sm font-black uppercase italic tracking-tighter whitespace-nowrap">{dossier.rentals[0].clientName}</p>
                                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(dossier.rentals[0].createdAt).toLocaleDateString()}</p>
                                        </div>
                                     </div>
                                     <span className="text-emerald-500 font-black text-sm">+{dossier.rentals[0].totalPrice}€</span>
                                  </div>
                                ) : (
                                  <p className="text-xs font-bold text-gray-400 italic">Aucune location enregistrée.</p>
                                )}
                             </div>
                         </div>
                      </motion.div>
                    )}

                    {dossierTab === 'history' && (
                       <motion.div 
                        key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="max-w-3xl space-y-10"
                       >
                          <div className="space-y-8 relative">
                             <div className="absolute top-0 bottom-0 left-[18px] w-[2px] bg-gray-100 dark:bg-gray-800" />
                             {dossier.inspections?.length === 0 ? (
                               <div className="p-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem]">
                                  <Sparkles size={48} className="mx-auto text-gray-200 mb-4" />
                                  <p className="text-xs font-black uppercase tracking-widest text-gray-400">En attente du premier scan IA</p>
                               </div>
                             ) : dossier.inspections.map((ins, idx) => (
                               <motion.div 
                                 initial={{ opacity: 0, scale: 0.95 }}
                                 whileInView={{ opacity: 1, scale: 1 }}
                                 key={ins.id} 
                                 className="relative flex gap-10 items-start group"
                               >
                                  <div className="w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 border-2 border-primary-600 flex items-center justify-center text-primary-600 relative z-10 group-hover:bg-primary-600 group-hover:text-white transition-all shadow-lg">
                                     {idx + 1}
                                  </div>
                                  <div className="flex-1 bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all">
                                     <div className="flex justify-between items-start mb-6">
                                        <div>
                                           <div className="flex items-center gap-3 mb-2">
                                              <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">{new Date(ins.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                              <span className="p-1 px-2 bg-slate-100 dark:bg-slate-800 rounded-md text-[8px] font-black uppercase">{new Date(ins.createdAt).toLocaleTimeString()}</span>
                                           </div>
                                           <p className="text-xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white">{ins.aiAnalysis?.status_label || 'Expertise Standard'}</p>
                                        </div>
                                        <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-tighter border border-emerald-100 dark:border-emerald-800">
                                           Certifié Gemini
                                        </div>
                                     </div>
                                     <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-l-4 border-primary-500">
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed italic">"{ins.aiAnalysis?.summary || 'Inspection visuelle effectuée. Aucun dommage structurel majeur détecté sur les zones analysées.'}"</p>
                                     </div>
                                  </div>
                               </motion.div>
                             ))}
                          </div>
                       </motion.div>
                    )}

                    {dossierTab === 'finance' && (
                       <motion.div 
                        key="finance" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                       >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             {[
                               { label: 'Revenu Mensuel', value: calculateStats(dossier.rentals).total, icon: TrendingUp, color: 'text-primary-600' },
                               { label: 'Rentabilité Annuelle', value: (calculateStats(dossier.rentals).total * 12).toLocaleString(), icon: DollarSign, color: 'text-emerald-500' },
                               { label: 'Nombre de Jours Loués', value: calculateStats(dossier.rentals).count * 3, icon: Clock, color: 'text-blue-500' }
                             ].map((kpi, i) => (
                               <div key={i} className="p-8 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] bg-white dark:bg-gray-900 shadow-sm relative overflow-hidden group">
                                  <kpi.icon className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] ${kpi.color} group-hover:scale-110 transition-transform`} />
                                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">{kpi.label}</p>
                                  <p className={`text-4xl font-black ${kpi.color} italic tracking-tighter`}>{kpi.value}{i < 2 ? '€' : ' j'}</p>
                               </div>
                             ))}
                          </div>

                          <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-2xl">
                             <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                <h4 className="text-xs font-black uppercase italic tracking-tighter">Historique des Transactions de Location</h4>
                                <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Exporter PDF</button>
                             </div>
                             <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                   <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                                      <tr>
                                         <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Client</th>
                                         <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                         <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Etat</th>
                                         <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Montant</th>
                                      </tr>
                                   </thead>
                                   <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                      {dossier.rentals?.length === 0 ? (
                                        <tr>
                                          <td colSpan="4" className="px-8 py-20 text-center text-xs font-bold text-gray-400 italic">Aucune transaction financière répertoriée.</td>
                                        </tr>
                                      ) : dossier.rentals.map(rent => (
                                        <tr key={rent.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                          <td className="px-8 py-5">
                                             <p className="text-sm font-black uppercase italic tracking-tighter">{rent.clientName}</p>
                                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{rent.id.slice(-6).toUpperCase()}</p>
                                          </td>
                                          <td className="px-8 py-5">
                                             <p className="text-sm font-bold text-gray-600 dark:text-gray-400">{new Date(rent.createdAt).toLocaleDateString()}</p>
                                          </td>
                                          <td className="px-8 py-5">
                                             <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                               rent.status === 'Actif' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                             }`}>{rent.status}</span>
                                          </td>
                                          <td className="px-8 py-5">
                                             <p className="text-lg font-black text-primary-600 italic tracking-tighter">{rent.totalPrice}€</p>
                                          </td>
                                        </tr>
                                      ))}
                                   </tbody>
                                </table>
                             </div>
                          </div>
                       </motion.div>
                    )}
                  </AnimatePresence>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD / EDIT VEHICLE MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} className="relative w-full max-w-3xl bg-white dark:bg-gray-950 rounded-[3rem] p-10 shadow-2xl overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-[6px] bg-primary-600" />
               <div className="max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence mode="wait">
                  {lookupStep === 'initial' ? (
                    <motion.div key="initial" className="space-y-8 text-center py-6">
                      <div className="w-24 h-24 bg-primary-50 dark:bg-primary-900/30 rounded-[2rem] flex items-center justify-center mx-auto text-primary-600 shadow-xl shadow-primary-500/10"><Scan size={44} /></div>
                      <div className="space-y-2">
                         <h4 className="text-3xl font-black uppercase italic tracking-tight">Identification <span className="text-primary-600">Smart-SIV</span></h4>
                         <p className="text-sm text-gray-500 max-w-sm mx-auto font-medium leading-relaxed">Scannez une plaque d'immatriculation pour auto-paramétrer l'ensemble de la fiche technique via l'IA.</p>
                      </div>
                      
                      <div className="flex flex-col gap-4 max-w-sm mx-auto">
                        <button 
                          onClick={() => setShowCamera(true)}
                          className="w-full py-6 bg-primary-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary-500/30 flex items-center justify-center gap-4 active:scale-95 transition-all hover:bg-primary-500"
                        >
                          <Camera size={24} />
                          <span>Activer le Scanner IA</span>
                        </button>
                        
                        <div className="relative flex items-center py-6 text-[10px] font-black uppercase text-gray-300 tracking-[0.3em] before:flex-1 before:h-px before:bg-gray-100 dark:before:bg-gray-800 after:flex-1 after:h-px after:bg-gray-100 dark:after:bg-gray-800 gap-6 uppercase shadow-sm">OU IDENTIFICATION MANUELLE</div>

                        <div className="relative group">
                          <input 
                            type="text" 
                            placeholder="PLAQUE (ex: AA-123-BB)" 
                            value={lookupPlate} 
                            onChange={(e) => setLookupPlate(e.target.value.toUpperCase())} 
                            className="w-full py-6 bg-gray-50 dark:bg-gray-900 border-2 border-transparent rounded-[1.5rem] text-3xl font-black text-center focus:border-primary-500 focus:bg-white dark:focus:bg-gray-800 outline-none uppercase tracking-widest transition-all shadow-inner" 
                          />
                        </div>
                        <button 
                          onClick={() => {
                            if (!lookupPlate) return;
                            setLookupStep('loading');
                            extractVehicleInfoFromPlate(lookupPlate).then(res => {
                              if (res.error) { setLookupStep('full_form'); } 
                              else {
                                setLookupResult(res);
                                setFormData(prev => ({ ...prev, ...res, licensePlate: lookupPlate }));
                                setLookupStep('confirm');
                              }
                            }).catch(() => setLookupStep('full_form'));
                          }}
                          className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-4 transition-all active:scale-95 hover:bg-slate-800"
                        >
                          <Sparkles size={20} className="text-emerald-500" />
                          <span>Vérifier par IA</span>
                        </button>
                      </div>
                    </motion.div>
                  ) : lookupStep === 'loading' ? (
                    <motion.div key="loading" className="py-32 flex flex-col items-center space-y-8">
                       <div className="relative">
                          <div className="w-20 h-20 border-4 border-primary-100 dark:border-gray-800 rounded-full" />
                          <div className="absolute top-0 left-0 w-20 h-20 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                       </div>
                       <div className="text-center space-y-2">
                          <p className="font-black uppercase text-sm tracking-[0.3em] text-primary-600 animate-pulse">Extraction Technique...</p>
                          <p className="text-xs text-gray-500 font-bold uppercase">Connexion aux bases de données Gemini 2.0 Flash</p>
                       </div>
                    </motion.div>
                  ) : lookupStep === 'confirm' ? (
                    <motion.div key="confirm" className="space-y-8">
                       <div className="bg-slate-50 dark:bg-slate-900 rounded-[3rem] text-center border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                        {scannedImage && (
                          <div className="w-full h-56 relative overflow-hidden">
                             <img src={scannedImage} className="w-full h-full object-cover scale-110 blur-[2px] opacity-40" alt="Scan Plate" />
                             <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                             <div className="absolute inset-0 flex items-center justify-center">
                                <div className="px-10 py-5 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-3xl text-4xl font-mono font-black text-white tracking-[0.2em] shadow-2xl">
                                   {lookupPlate || formData.licensePlate}
                                </div>
                             </div>
                          </div>
                        )}
                        <div className="p-10">
                          <h4 className="text-4xl font-black uppercase italic tracking-tighter mb-8 leading-none">
                             {lookupResult?.brand} <span className="text-primary-600">{lookupResult?.model}</span>
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             {[
                               { l: 'Energie', v: lookupResult?.fuel, i: Fuel },
                               { l: 'Puissance', v: `${lookupResult?.power} CV`, i: Zap },
                               { l: 'Boite', v: lookupResult?.transmission, i: Settings2 },
                               { l: 'Crit\'Air', v: lookupResult?.critAir, i: Leaf }
                             ].map((chip, idx) => (
                               <div key={idx} className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center gap-2">
                                  <chip.i size={16} className="text-primary-500" />
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{chip.l}</p>
                                  <p className="text-xs font-black uppercase">{chip.v}</p>
                               </div>
                             ))}
                          </div>
                        </div>
                       </div>
                       <button onClick={() => setLookupStep('full_form')} className="w-full py-6 bg-primary-600 text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-2xl shadow-primary-500/30 active:scale-95 transition-all">Confirmer & Compléter le Profil financier</button>
                    </motion.div>
                  ) : (
                    <motion.form key="form" onSubmit={handleSubmit} className="space-y-8 py-4">
                       <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-primary-600">
                             {editingId ? <Edit2 size={24} /> : <Plus size={24} />}
                          </div>
                          <div>
                             <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none">{editingId ? 'Mise à jour Fiche' : 'Nouvelle Entrée Flotte'}</h3>
                             <p className="text-xs text-gray-500 font-medium tracking-wide">Validation des paramètres opérationnels et financiers.</p>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                          <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-1">Immatriculation</label>
                             <input required readOnly={!!editingId} className={`w-full p-5 ${editingId ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-800'} rounded-2xl outline-none font-mono font-black text-xl tracking-[0.1em] shadow-sm`} value={formData.licensePlate} onChange={e => setFormData({...formData, licensePlate: e.target.value.toUpperCase()})} />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-1">Catégorie Plateforme</label>
                             <select className="w-full p-5 bg-white dark:bg-gray-800 rounded-2xl outline-none font-black uppercase text-sm shadow-sm" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                <option value="citadine">🚗 CITADINE</option>
                                <option value="suv">🚙 SUV / CROSSOVER</option>
                                <option value="utilitaire">🚚 UTILITAIRE</option>
                                <option value="camion">🚛 CAMION / LOURD</option>
                                <option value="berline">🚘 BERLINE</option>
                             </select>
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-1">Marque Constructeur</label>
                             <input required className="w-full p-5 bg-white dark:bg-gray-800 rounded-2xl outline-none font-black uppercase text-sm shadow-sm" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-1">Modèle Précis</label>
                             <input required className="w-full p-5 bg-white dark:bg-gray-800 rounded-2xl outline-none font-black uppercase text-sm shadow-sm" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                          <div className="p-8 bg-primary-600 rounded-[2.5rem] shadow-2xl shadow-primary-500/30 text-white space-y-6">
                             <div className="flex items-center gap-3">
                                <DollarSign size={20} />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">Stratégie de Prix</h4>
                             </div>
                             <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase opacity-70 tracking-widest ml-1">Location Journalière (TTC)</label>
                                <div className="relative">
                                   <input type="number" required className="w-full p-6 bg-white/10 backdrop-blur-md rounded-2xl outline-none font-black text-4xl tracking-tighter placeholder:text-white/20" value={formData.dailyPrice} onChange={e => setFormData({...formData, dailyPrice: e.target.value})} />
                                   <span className="absolute right-6 top-1/2 -translate-y-1/2 text-3xl font-black italic opacity-40">€</span>
                                </div>
                             </div>
                          </div>

                          <div className="p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl text-white space-y-6 relative overflow-hidden">
                             <Shield className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
                             <div className="flex items-center gap-3">
                                <Shield size={20} className="text-emerald-500" />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">Sécurité Caution</h4>
                             </div>
                             <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase opacity-70 tracking-widest ml-1">Montant Pré-autorisation</label>
                                <div className="relative">
                                   <input type="number" required className="w-full p-6 bg-white/10 backdrop-blur-md rounded-2xl outline-none font-black text-4xl tracking-tighter placeholder:text-emerald-500/20" value={formData.depositAmount} onChange={e => setFormData({...formData, depositAmount: e.target.value})} />
                                   <span className="absolute right-6 top-1/2 -translate-y-1/2 text-3xl font-black italic text-emerald-500 opacity-40">€</span>
                                </div>
                             </div>
                          </div>
                       </div>

                       <div className="pt-10 flex flex-col sm:flex-row justify-end gap-6">
                          <button type="button" onClick={() => editingId ? setShowModal(false) : setLookupStep('initial')} className="px-10 py-5 font-black uppercase text-xs tracking-widest text-gray-400 hover:text-gray-900 transition-colors">{editingId ? 'Annuler' : 'Retour Identification'}</button>
                          <button type="submit" className="px-14 py-6 bg-primary-600 text-white rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-primary-500/40 hover:bg-primary-500 transition-all active:scale-95">
                             {editingId ? 'Appliquer les Changements ⚡' : 'Propulser en Flotte 🚀'}
                          </button>
                       </div>
                    </motion.form>
                  )}
                </AnimatePresence>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK MILEAGE MODAL */}
      <AnimatePresence>
        {showMileageModal && selectedVehicle && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMileageModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-gray-900 p-8 rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-black italic uppercase tracking-tighter">Kilométrage</h3>
                   <button onClick={() => setShowMileageModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                      <X size={20} />
                   </button>
                </div>
                <div className="space-y-6">
                   <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Valeur actuelle</p>
                      <p className="text-2xl font-black italic">{selectedVehicle.mileage} km</p>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nouvel Index Km</label>
                      <input 
                        type="number" 
                        className="premium-input text-2xl font-black" 
                        value={newMileage} 
                        onChange={(e) => setNewMileage(e.target.value)}
                        autoFocus
                      />
                   </div>
                   <button 
                     onClick={async () => {
                        try {
                           await updateVehicle(selectedVehicle.id, { mileage: parseInt(newMileage) });
                           setShowMileageModal(false);
                           // Update local state
                           setDossier(prev => ({ ...prev, mileage: parseInt(newMileage) }));
                           loadVehicles();
                        } catch (e) {
                           alert("Erreur lors de la mise à jour");
                        }
                     }}
                     className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-500/20 active:scale-95 transition-all"
                   >
                      Mettre à jour ⚡
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Camera Overlays */}
      <AnimatePresence>
        {showCamera && (
          <CameraCapture
            vehicleType="plaque"
            onClose={() => setShowCamera(false)}
            onCapture={(data) => {
              setScannedImage(data.image);
              setLookupStep('loading');
              extractVehicleInfoFromPlate(data.image).then(res => {
                if (res.error) { setLookupStep('full_form'); } 
                else {
                  setLookupResult(res);
                  setFormData(prev => ({ ...prev, ...res }));
                  setLookupStep('confirm');
                }
              }).catch(() => setLookupStep('full_form'));
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Vehicles;
