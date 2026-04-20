import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, Plus, Search, MapPin, Calendar, Clock, User, Car, 
  ChevronRight, AlertCircle, CheckCircle2, Filter, X, Smartphone,
  PenTool, ShieldCheck
} from 'lucide-react';
import { getRentals, getVehicles, getClients, createRental } from '../services/firestore';
import { generateRentalContractPDF } from '../services/pdfGenerator';
import SignaturePad from '../components/SignaturePad';

const Rentals = ({ setCurrentPage, setPageData, currentAgency }) => {
  const [rentals, setRentals] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelRentalData, setCancelRentalData] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const CANCEL_REASONS = [
    "Annulation Client",
    "Client non-présent (No-show)",
    "Erreur de saisie",
    "Véhicule indisponible (Panne/Accident)",
    "Autre motif"
  ];
  const [searchTerm, setSearchTerm] = useState('');
  const [modalStep, setModalStep] = useState(0); // 0: Form, 1: Signatures
  const [signatures, setSignatures] = useState([]);

  // Modal Filters
  const [clientSearch, setClientSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');

  const [formData, setFormData] = useState({
    vehicleId: '',
    clientId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    location: 'Agence Centrale',
    startMileage: '',
    conditionNotes: 'Véhicule en bon état général, conforme à l\'expertise.',
    paymentMethod: 'Carte Bancaire',
    dailyPrice: 0,
    depositAmount: 0,
    totalPrice: 0
  });

  useEffect(() => {
    loadData();
  }, [currentAgency]);

  useEffect(() => {
    if (formData.vehicleId && vehicles.length > 0) {
      const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
      if (selectedVehicle) {
        setFormData(prev => ({ 
          ...prev, 
          startMileage: selectedVehicle.mileage || 0,
          dailyPrice: selectedVehicle.dailyPrice || 45,
          depositAmount: selectedVehicle.depositAmount || 1500
        }));
      }
    }
  }, [formData.vehicleId, vehicles]);

  // Calcul auto du prix total
  useEffect(() => {
    if (formData.startDate && formData.endDate && formData.dailyPrice) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      setFormData(prev => ({ ...prev, totalPrice: diffDays * prev.dailyPrice }));
    }
  }, [formData.startDate, formData.endDate, formData.dailyPrice]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [r, v, c] = await Promise.all([
        getRentals(currentAgency), 
        getVehicles(currentAgency), 
        getClients(currentAgency)
      ]);
      setRentals(r || []);
      setVehicles(v || []); 
      setClients(c || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (modalStep === 0) {
      setModalStep(1);
      return;
    }

    setLoading(true);
    try {
      const vehicle = vehicles.find(v => v.id === formData.vehicleId);
      const client = clients.find(c => c.id === formData.clientId);
      
      const rentalId = await createRental({
        ...formData,
        vehicleName: `${vehicle.brand} ${vehicle.model}`,
        clientName: `${client.name}`,
        status: 'Actif',
        signatures: signatures // Include captured signatures
      });
      
      // Auto-generate Contract PDF
      const pdf = await generateRentalContractPDF(
        { id: rentalId, signatures, createdAt: new Date().toISOString() },
        vehicle,
        client
      );
      pdf.save(`contrat_${vehicle.licensePlate}.pdf`);

      setShowModal(false);
      resetModal();
      loadData();
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la création de la location.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignature = (res) => {
    const data = typeof res === 'object' ? res.data : res;
    const typeLabel = signatures.length === 0 ? 'agent' : 'client';
    const updatedSignatures = [...signatures, { type: typeLabel, data, timestamp: new Date().toISOString() }];
    setSignatures(updatedSignatures);
    
    // If both signed, submit
    if (updatedSignatures.length === 2) {
      // Need to use updatedSignatures directly because signatures state isn't updated yet
      finishSubmit(updatedSignatures);
    }
  };

  const finishSubmit = async (finalSignatures) => {
    setLoading(true);
    try {
      const vehicle = vehicles.find(v => v.id === formData.vehicleId);
      const client = clients.find(c => c.id === formData.clientId);
      
      const rentalId = await createRental({
        ...formData,
        vehicleName: `${vehicle.brand} ${vehicle.model}`,
        clientName: `${client.name}`,
        status: 'Actif',
        agencyId: currentAgency,
        signatures: finalSignatures
      });
      
      const pdf = await generateRentalContractPDF(
        { 
          id: rentalId, 
          signatures: finalSignatures, 
          createdAt: new Date().toISOString(),
          startMileage: formData.startMileage,
          conditionNotes: formData.conditionNotes,
          paymentMethod: formData.paymentMethod,
          startDate: formData.startDate,
          endDate: formData.endDate,
          totalPrice: formData.totalPrice,
          depositAmount: formData.depositAmount
        },
        vehicle,
        client
      );
      pdf.save(`contrat_${vehicle.licensePlate}.pdf`);

      setShowModal(false);
      resetModal();
      loadData();
    } catch (error) {
      alert('Erreur lors de la validation finale du contrat.');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setFormData({
      vehicleId: '',
      clientId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      location: 'Agence Centrale'
    });
    setClientSearch('');
    setVehicleSearch('');
    setModalStep(0);
    setSignatures([]);
  };

  const handleStartInspection = (rental) => {
    const v = vehicles.find(veh => veh.id === rental.vehicleId);
    const c = clients.find(cli => cli.id === rental.clientId);
    setPageData({ preSelectedVehicle: v, preSelectedClient: c });
    setCurrentPage('inspection');
  };

  const handleCancel = async () => {
    if (!cancelRentalData || !cancelReason) return;
    const { cancelRental } = await import('../services/firestore');
    await cancelRental(cancelRentalData.id, cancelReason);
    setShowCancelModal(false);
    setCancelRentalData(null);
    setCancelReason('');
    loadData();
  };

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const availableVehicles = vehicles.filter(v => 
    v.status === 'Disponible' && (
      v.brand?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.model?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.licensePlate?.toLowerCase().includes(vehicleSearch.toLowerCase())
    )
  );

  const filteredRentals = rentals.filter(r => 
    r.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.vehicleName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Actif': return 'bg-emerald-100 text-emerald-700';
      case 'Terminé': return 'bg-gray-100 text-gray-500';
      case 'Retard': return 'bg-rose-100 text-rose-700';
      case 'Annulé': return 'bg-red-50 text-red-600 border border-red-100';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  return (
    <div className="pt-4 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto pb-20 space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase italic">Gestion des Locations</h1>
          <p className="text-gray-500 font-medium">Suivez les contrats actifs et les mouvements de flotte.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-6 py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 shadow-xl shadow-black/10"
        >
          <Plus size={20} />
          <span>Nouvelle Location</span>
        </button>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
      >
        {[
          { label: 'Locations Actives', value: rentals.filter(r => r.status === 'Actif').length, icon: Calendar, color: 'text-primary-600' },
          { label: 'Véhicules Libres', value: vehicles.filter(v => v.status === 'Disponible').length, icon: Car, color: 'text-emerald-600' },
          { label: 'Alertes Retours', value: 0, icon: AlertCircle, color: 'text-rose-600' }
        ].map((stat, i) => (
          <div key={i} className="glass-card p-8 rounded-2xl flex items-center justify-between group">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{stat.label}</p>
              <p className={`text-4xl font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
            </div>
            <div className={`p-5 rounded-xl bg-slate-50 dark:bg-slate-900 ${stat.color} transition-transform group-hover:scale-110 group-hover:rotate-3`}>
              <stat.icon size={32} />
            </div>
          </div>
        ))}
      </motion.div>

      {/* Search & List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Rechercher un contrat, client ou véhicule..."
              className="w-full pl-16 pr-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-4 ring-primary-500/10 font-bold transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <th className="px-8 py-6">Contrat / Client</th>
                <th className="px-8 py-6">Véhicule</th>
                <th className="px-8 py-6">Période</th>
                <th className="px-8 py-6">Statut</th>
                <th className="px-8 py-6 text-right">Inspec.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {filteredRentals.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-32 text-center">
                    <div className="max-w-xs mx-auto text-gray-300">
                      <Briefcase size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="font-bold uppercase tracking-widest text-[10px]">Aucune location trouvée</p>
                    </div>
                  </td>
                </tr>
              ) : filteredRentals.map(rental => (
                <tr key={rental.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-600">
                        <User size={24} />
                      </div>
                      <div>
                        <p className="font-black text-gray-900 dark:text-white uppercase text-sm tracking-tight">{rental.clientName}</p>
                        <p className="text-[10px] font-bold text-gray-400">#{rental.id?.slice(-4)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <Car size={18} className="text-gray-400" />
                      <p className="text-sm font-bold">{rental.vehicleName}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <Calendar size={12} className="text-emerald-500" />
                        <span>{rental.startDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                        <Clock size={12} />
                        <span>— {rental.endDate || '...'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusStyle(rental.status)}`}>
                      {rental.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {rental.status === 'Actif' && (
                      <button 
                        onClick={() => handleStartInspection(rental)}
                        className="p-3 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-600 hover:text-white transition-all shadow-sm"
                        title="Lancer l'inspection"
                      >
                        <Smartphone size={20} />
                      </button>
                    )}
                    {rental.status === 'Actif' && (
                      <button 
                        onClick={() => {
                          setCancelRentalData(rental);
                          setShowCancelModal(true);
                        }}
                        className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm ml-2"
                        title="Annuler la location"
                      >
                        <X size={20} />
                      </button>
                    )}
                    <button className="p-3 text-gray-300 ml-2">
                       <ChevronRight size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-8">
                 <h2 className="text-2xl font-black uppercase tracking-tight italic">
                   {modalStep === 0 ? 'Établir un contrat' : 'Validation Juridique'}
                 </h2>
                 <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X /></button>
              </div>
              
              <AnimatePresence mode="wait">
                {modalStep === 0 ? (
                  <motion.form 
                    key="step0"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onSubmit={handleSubmit} 
                    className="space-y-8"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* CLIENT SELECTION WITH SEARCH */}
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">1. Choisir le Client</label>
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                            type="text" 
                            placeholder="Rechercher un client..." 
                            className="premium-input pl-11 !py-3 !text-xs"
                            value={clientSearch}
                            onChange={e => setClientSearch(e.target.value)}
                          />
                        </div>
                        <select 
                          required
                          value={formData.clientId} 
                          onChange={e => setFormData({...formData, clientId: e.target.value})}
                          className="premium-input appearance-none cursor-pointer"
                        >
                          <option value="">{filteredClients.length} clients trouvés</option>
                          {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>

                      {/* VEHICLE SELECTION WITH SEARCH */}
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">2. Choisir le Véhicule</label>
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                            type="text" 
                            placeholder="Marque, Modèle ou Plaque..." 
                            className="premium-input pl-11 !py-3 !text-xs"
                            value={vehicleSearch}
                            onChange={e => setVehicleSearch(e.target.value)}
                          />
                        </div>
                        <select 
                          required
                          value={formData.vehicleId} 
                          onChange={e => setFormData({...formData, vehicleId: e.target.value})}
                          className="premium-input appearance-none cursor-pointer"
                        >
                          <option value="">{availableVehicles.length} véhicules disponibles</option>
                          {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.licensePlate})</option>)}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">3. Date de départ</label>
                        <input 
                          type="date"
                          value={formData.startDate}
                          onChange={e => setFormData({...formData, startDate: e.target.value})}
                          className="premium-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">4. Date de retour prévue</label>
                        <input 
                          type="date"
                          value={formData.endDate}
                          onChange={e => setFormData({...formData, endDate: e.target.value})}
                          className="premium-input"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">5. Kilométrage Départ</label>
                        <input 
                          type="number"
                          value={formData.startMileage}
                          onChange={e => setFormData({...formData, startMileage: e.target.value})}
                          className="premium-input font-mono"
                          placeholder="Ex: 45000"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">6. Mode de Paiement</label>
                        <select 
                          value={formData.paymentMethod}
                          onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                          className="premium-input"
                        >
                          <option value="Carte Bancaire">Carte Bancaire (Stripe)</option>
                          <option value="Espèces">Espèces</option>
                          <option value="Chèque">Chèque</option>
                          <option value="Virement">Virement Bancaire</option>
                        </select>
                      </div>

                      <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-primary-50 dark:bg-primary-900/10 rounded-2xl border border-primary-100 dark:border-primary-800">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-primary-600">Location / Jour (€)</label>
                          <input 
                            type="number"
                            value={formData.dailyPrice}
                            onChange={e => setFormData({...formData, dailyPrice: e.target.value})}
                            className="w-full bg-transparent border-b border-primary-200 outline-none font-bold text-sm py-1"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-primary-600">Caution à prévoir (€)</label>
                          <input 
                            type="number"
                            value={formData.depositAmount}
                            onChange={e => setFormData({...formData, depositAmount: e.target.value})}
                            className="w-full bg-transparent border-b border-primary-200 outline-none font-bold text-sm py-1"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-primary-600">Total estimé (€)</label>
                          <div className="text-xl font-black italic tracking-tighter text-primary-700">
                             {formData.totalPrice} €
                          </div>
                        </div>
                      </div>

                      <div className="col-span-full space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">7. État & Observations (Vérification Initiale)</label>
                        <textarea 
                          value={formData.conditionNotes}
                          onChange={e => setFormData({...formData, conditionNotes: e.target.value})}
                          className="premium-input min-h-[100px] py-4"
                          placeholder="Indiquez ici les éventuels défauts, rayures ou remarques particulières..."
                        />
                      </div>
                    </div>

                    <div className="pt-8 border-t border-white/10 flex justify-end gap-4">
                      <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Abondonner</button>
                      <button type="submit" className="px-12 py-4 bg-primary-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl group active:scale-95 transition-all">
                        <span className="flex items-center gap-2">Continuer vers Signature <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" /></span>
                      </button>
                    </div>
                  </motion.form>
                ) : (
                  <motion.div 
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div className="bg-primary-50 dark:bg-primary-900/10 p-6 rounded-2xl border border-primary-100 dark:border-primary-800 mb-8 flex items-center gap-4">
                       <ShieldCheck className="text-primary-600" size={32} />
                       <div>
                         <p className="text-xs font-black uppercase text-primary-600">Sécurisation Juridique</p>
                         <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Signature de l'<b>{signatures.length === 0 ? 'AGENT' : 'CLIENT'}</b> pour validation du bail.</p>
                       </div>
                    </div>

                    <div className="max-w-xl mx-auto">
                      <SignaturePad onSignature={handleSignature} />
                      
                      <div className="mt-8 flex justify-center gap-8">
                        <div className={`text-center space-y-2 ${signatures.length >= 1 ? 'text-emerald-500' : 'text-gray-400'}`}>
                           <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center mx-auto ${signatures.length >= 1 ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-200 dashed'}`}>
                             {signatures.length >= 1 ? <ShieldCheck size={20} /> : <User size={20} />}
                           </div>
                           <p className="text-[9px] font-black uppercase tracking-widest">Agent</p>
                        </div>
                        <div className={`text-center space-y-2 ${signatures.length >= 2 ? 'text-emerald-500' : 'text-gray-400'}`}>
                           <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center mx-auto ${signatures.length >= 2 ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-200 dashed'}`}>
                             {signatures.length >= 2 ? <ShieldCheck size={20} /> : <User size={20} />}
                           </div>
                           <p className="text-[9px] font-black uppercase tracking-widest">Client</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-white/10 flex justify-between">
                       <button onClick={() => setModalStep(0)} className="px-6 py-3 font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-900">Retour</button>
                       {loading && <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancellation Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCancelModal(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl">
                <div className="text-center space-y-4 mb-8">
                   <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto"><AlertCircle size={32} /></div>
                   <h3 className="text-xl font-black uppercase italic">Annulation de Location</h3>
                   <p className="text-sm text-gray-500 font-medium">Veuillez sélectionner le motif pour le contrat de <span className="font-bold text-gray-900 dark:text-white">{cancelRentalData?.clientName}</span>.</p>
                </div>

                <div className="space-y-3">
                   {CANCEL_REASONS.map((reason) => (
                     <button
                       key={reason}
                       onClick={() => setCancelReason(reason)}
                       className={`w-full p-4 rounded-2xl text-left border-2 transition-all font-bold text-sm ${
                         cancelReason === reason 
                         ? 'border-rose-500 bg-rose-50 text-rose-700' 
                         : 'border-gray-50 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:border-gray-200'
                       }`}
                     >
                        {reason}
                     </button>
                   ))}
                </div>

                <div className="pt-8 flex flex-col gap-2">
                   <button 
                     onClick={handleCancel}
                     disabled={!cancelReason}
                     className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-rose-500/20 disabled:opacity-50"
                   >
                     Confirmer l'annulation
                   </button>
                   <button onClick={() => setShowCancelModal(false)} className="w-full py-4 text-xs font-black uppercase text-gray-400">Retour</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Rentals;
