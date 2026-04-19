import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { getVehicles, createVehicle, updateVehicle } from '../services/firestore';
import { loadVehiclesCache, saveVehiclesCache } from '../services/cacheService';
import { extractVehicleInfoFromPlate } from '../services/gemini';
import { auth } from '../firebase';
import { Camera, Scan, Sparkles, RefreshCcw } from 'lucide-react';

const TableRowSkeleton = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4"><div className="flex items-center space-x-3"><div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl"></div><div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div></div></td>
    <td className="px-6 py-4"><div className="w-20 h-4 bg-gray-100 dark:bg-gray-700 rounded"></div></td>
    <td className="px-6 py-4"><div className="w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div></td>
    <td className="px-6 py-4"><div className="w-16 h-4 bg-gray-100 dark:bg-gray-700 rounded"></div></td>
    <td className="px-6 py-4"><div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div></td>
    <td className="px-6 py-4 text-right"><div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded ml-auto"></div></td>
  </tr>
);

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  
  // Smart Lookup States
  const [lookupStep, setLookupStep] = useState('initial'); // initial, loading, confirm, full_form
  const [lookupPlate, setLookupPlate] = useState('');
  const [lookupResult, setLookupResult] = useState(null);

  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    licensePlate: '',
    vin: '',
    category: 'citadine',
    mileage: '',
    status: 'Disponible'
  });

  useEffect(() => {
    // Instant load from cache
    const cached = loadVehiclesCache();
    if (cached) {
      setVehicles(cached);
      setLoading(false);
    }
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const data = await getVehicles(auth.currentUser?.uid);
      setVehicles(data);
      saveVehiclesCache(data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlateLookup = async (input) => {
    if (!input) return;
    setLookupStep('loading');
    setLoading(true);
    try {
      const result = await extractVehicleInfoFromPlate(input);
      if (result.error) {
        setLookupStep('full_form');
        return;
      }
      setLookupResult(result);
      setFormData(prev => ({
        ...prev,
        brand: result.brand || '',
        model: result.model || '',
        licensePlate: result.licensePlate || input.toUpperCase(),
        category: result.category || 'citadine'
      }));
      setLookupStep('confirm');
    } catch (error) {
      console.error('Lookup failed:', error);
      setLookupStep('full_form');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      handlePlateLookup(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tempId = Date.now().toString();
    const optimisticVehicle = { ...formData, id: editingVehicle?.id || tempId, isOptimistic: true };
    
    // Optimistic Update
    if (editingVehicle) {
      setVehicles(prev => prev.map(v => v.id === editingVehicle.id ? optimisticVehicle : v));
    } else {
      setVehicles(prev => [optimisticVehicle, ...prev]);
    }
    
    setShowModal(false);

    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, { ...formData, agencyId: auth.currentUser?.uid });
      } else {
        await createVehicle({ ...formData, agencyId: auth.currentUser?.uid });
      }
      resetForm();
      loadVehicles(); // Sync with server
    } catch (error) {
      console.error('Error saving vehicle:', error);
      alert('Erreur lors de l\'enregistrement. Les modifications ont été annulées.');
      loadVehicles(); // Revert on error
    }
  };

  const resetForm = () => {
    setEditingVehicle(null);
    setLookupStep('initial');
    setLookupPlate('');
    setLookupResult(null);
    setFormData({
      brand: '',
      model: '',
      licensePlate: '',
      vin: '',
      category: 'citadine',
      mileage: '',
      status: 'Disponible'
    });
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      brand: vehicle.brand,
      model: vehicle.model,
      licensePlate: vehicle.licensePlate,
      vin: vehicle.vin,
      category: vehicle.category,
      mileage: vehicle.mileage,
      status: vehicle.status
    });
    setShowModal(true);
  };

  const filteredVehicles = vehicles.filter(v => 
    v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.licensePlate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flotte de Véhicules</h1>
          <p className="text-gray-600 dark:text-gray-400">Gérez vos véhicules et leur état de santé.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-primary flex items-center justify-center space-x-2"
        >
          <Plus size={20} />
          <span>Ajouter un véhicule</span>
        </button>
      </div>

        {/* List / Table View */}
        <div className="overflow-x-hidden">
          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {loading && vehicles.length === 0 ? (
              [1, 2, 3].map(i => (
                <div key={i} className="p-4 space-y-4 animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="w-24 h-3 bg-gray-100 dark:bg-gray-800 rounded" />
                    </div>
                  </div>
                </div>
              ))
            ) : filteredVehicles.length === 0 ? (
              <div className="py-12 text-center text-gray-500">Aucun véhicule trouvé.</div>
            ) : (
              filteredVehicles.map((val) => (
                <div key={val.id} className="p-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                        <Car size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white capitalize">{val.brand} {val.model}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tighter">{val.category}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleEdit(val)}
                      className="p-2 text-gray-400 hover:text-primary-500 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs text-gray-700 dark:text-gray-300">
                      {val.licensePlate}
                    </span>
                    <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      val.status === 'Disponible' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                      val.status === 'Loué' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-800'
                    }`}>
                      {val.status}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 mt-4">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          (val.healthScore || 10) >= 8 ? 'bg-green-500' :
                          (val.healthScore || 10) >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${(val.healthScore || 10) * 10}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500">{(val.healthScore || 10)}/10</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table - Hidden on mobile */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Véhicule</th>
                <th className="px-6 py-4 font-semibold">Immatriculation</th>
                <th className="px-6 py-4 font-semibold">Statut</th>
                <th className="px-6 py-4 font-semibold">Kilométrage</th>
                <th className="px-6 py-4 font-semibold">Santé</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading && vehicles.length === 0 ? (
                [1, 2, 3, 4, 5].map(i => <TableRowSkeleton key={i} />)
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    Aucun véhicule trouvé.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((val) => (
                  <tr key={val.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                          <Car size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white capitalize">{val.brand} {val.model}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tighter">{val.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm text-gray-700 dark:text-gray-300">
                        {val.licensePlate}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        val.status === 'Disponible' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        val.status === 'Loué' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        val.status === 'Maintenance' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          val.status === 'Disponible' ? 'bg-green-500' :
                          val.status === 'Loué' ? 'bg-blue-500' :
                          val.status === 'Maintenance' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`} />
                        <span>{val.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {val.mileage?.toLocaleString()} km
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 h-1.5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              (val.healthScore || 10) >= 8 ? 'bg-green-500' :
                              (val.healthScore || 10) >= 5 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${(val.healthScore || 10) * 10}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-500">{(val.healthScore || 10)}/10</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleEdit(val)}
                        className="p-2 text-gray-400 hover:text-primary-500 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl h-full md:h-auto md:rounded-2xl rounded-none bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto border border-white/10 flex flex-col"
            >
              <div className="p-4 lg:p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-10">
                <h3 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white">
                  {editingVehicle ? 'Modifier le véhicule' : 'Nouveau véhicule'}
                </h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <AnimatePresence mode="wait">
                  {lookupStep === 'initial' && !editingVehicle ? (
                    <motion.div
                      key="lookup"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6 py-2 lg:py-4"
                    >
                      <div className="text-center space-y-2">
                        <div className="w-12 h-12 lg:w-16 lg:h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto text-primary-600">
                          <Scan size={28} className="lg:hidden" />
                          <Scan size={32} className="hidden lg:block" />
                        </div>
                        <h4 className="text-base lg:text-lg font-bold text-gray-900 dark:text-white">Identification Rapide</h4>
                        <p className="text-xs lg:text-sm text-gray-500 max-w-xs mx-auto">Entrez la plaque ou scannez-la pour remplir les détails automatiquement.</p>
                      </div>

                      <div className="space-y-4">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="ex: AB-123-CD"
                            value={lookupPlate}
                            onChange={(e) => setLookupPlate(e.target.value.toUpperCase())}
                            className="w-full pl-4 pr-12 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl text-2xl font-black tracking-widest text-center focus:border-primary-500 transition-all uppercase"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <label className="p-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 transition-colors block">
                              <Camera className="w-6 h-6 text-primary-600" />
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                            </label>
                          </div>
                        </div>

                        <button
                          onClick={() => handlePlateLookup(lookupPlate)}
                          disabled={!lookupPlate || loading}
                          className="w-full py-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-2xl font-bold shadow-lg shadow-primary-500/20 flex items-center justify-center space-x-2 transition-all uppercase tracking-widest"
                        >
                          <Sparkles size={20} />
                          <span>{loading ? 'Recherche...' : 'Identifier par IA'}</span>
                        </button>
                        
                        <button
                          onClick={() => setLookupStep('full_form')}
                          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
                        >
                          Saisie manuelle classique
                        </button>
                      </div>
                    </motion.div>
                  ) : lookupStep === 'loading' ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-12 flex flex-col items-center justify-center space-y-4"
                    >
                      <div className="relative">
                        <div className="w-20 h-20 border-4 border-primary-100 dark:border-primary-900 rounded-full" />
                        <div className="w-20 h-20 border-4 border-primary-600 rounded-full border-t-transparent animate-spin absolute inset-0" />
                        <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-primary-600 animate-pulse" />
                      </div>
                      <p className="font-bold text-gray-900 dark:text-white">L'IA identifie le véhicule...</p>
                    </motion.div>
                  ) : lookupStep === 'confirm' ? (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-6 py-4"
                    >
                      <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 p-6 rounded-3xl text-center">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white mb-4">
                          <CheckCircle2 size={24} />
                        </div>
                        <h4 className="text-xl font-bold text-green-800 dark:text-green-300">Véhicule Identifié !</h4>
                        <p className="text-sm text-green-600 dark:text-green-400">Veuillez confirmer les informations trouvées.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="card p-4">
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Marque / Modèle</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">{lookupResult?.brand} {lookupResult?.model}</p>
                        </div>
                        <div className="card p-4">
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Catégorie</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">{lookupResult?.category}</p>
                        </div>
                        <div className="card p-4 col-span-2 text-center bg-gray-900 text-white">
                          <p className="text-xs text-gray-400 uppercase font-bold mb-1">Plaque d'immatriculation</p>
                          <p className="text-3xl font-black tracking-widest">{lookupResult?.licensePlate}</p>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => setLookupStep('initial')}
                          className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl flex items-center justify-center space-x-2"
                        >
                          <RefreshCcw size={18} />
                          <span>Réessayer</span>
                        </button>
                        <button
                          onClick={() => setLookupStep('full_form')}
                          className="flex-[2] py-3 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-500/20"
                        >
                          Valider & Continuer
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onSubmit={handleSubmit}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Marque</label>
                          <input
                            type="text"
                            required
                            value={formData.brand}
                            onChange={(e) => setFormData({...formData, brand: e.target.value})}
                            className="input-field"
                            placeholder="ex: Peugeot"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Modèle</label>
                          <input
                            type="text"
                            required
                            value={formData.model}
                            onChange={(e) => setFormData({...formData, model: e.target.value})}
                            className="input-field"
                            placeholder="ex: 308"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Immatriculation</label>
                          <input
                            type="text"
                            required
                            value={formData.licensePlate}
                            onChange={(e) => setFormData({...formData, licensePlate: e.target.value.toUpperCase()})}
                            className="input-field"
                            placeholder="ex: AB-123-CD"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">N° de Série (VIN)</label>
                          <input
                            type="text"
                            required
                            value={formData.vin}
                            onChange={(e) => setFormData({...formData, vin: e.target.value.toUpperCase()})}
                            className="input-field"
                            placeholder="VIN complet"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Catégorie</label>
                          <select
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                            className="input-field"
                          >
                            <option value="citadine">Citadine</option>
                            <option value="berline">Berline</option>
                            <option value="suv">SUV</option>
                            <option value="utilitaire">Utilitaire</option>
                            <option value="fourgon">Fourgon</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kilométrage</label>
                          <input
                            type="number"
                            required
                            value={formData.mileage}
                            onChange={(e) => setFormData({...formData, mileage: parseInt(e.target.value)})}
                            className="input-field"
                            placeholder="ex: 25000"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Statut actuel</label>
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                            className="input-field"
                          >
                            <option value="Disponible">Disponible</option>
                            <option value="Loué">Loué</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Litige">Litige</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
                        <button
                          type="button"
                          onClick={() => editingVehicle ? setShowModal(false) : setLookupStep('initial')}
                          className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="btn-primary"
                        >
                          {editingVehicle ? 'Mettre à jour' : 'Enregistrer le véhicule'}
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
    </div>
  );
};

export default Vehicles;
