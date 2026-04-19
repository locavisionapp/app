import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Mail, 
  Phone, 
  CreditCard,
  X,
  UserCheck
} from 'lucide-react';
import { getClients, createClient, updateClient } from '../services/firestore';
import { loadClientsCache, saveClientsCache } from '../services/cacheService';
import { auth } from '../firebase';

const ClientRowSkeleton = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4"><div className="flex items-center space-x-3"><div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div><div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div></div></td>
    <td className="px-6 py-4"><div className="space-y-1"><div className="w-40 h-3 bg-gray-100 dark:bg-gray-700 rounded"></div><div className="w-32 h-3 bg-gray-100 dark:bg-gray-700 rounded"></div></div></td>
    <td className="px-6 py-4"><div className="w-24 h-4 bg-gray-100 dark:bg-gray-700 rounded"></div></td>
    <td className="px-6 py-4 text-right"><div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded ml-auto"></div></td>
  </tr>
);

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    licenseNumber: '',
    idNumber: ''
  });

  useEffect(() => {
    // Instant load from cache
    const cached = loadClientsCache();
    if (cached) {
      setClients(cached);
      setLoading(false);
    }
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await getClients(auth.currentUser?.uid);
      setClients(data);
      saveClientsCache(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tempId = Date.now().toString();
    const optimisticClient = { ...formData, id: editingClient?.id || tempId, isOptimistic: true };
    
    // Optimistic Update
    if (editingClient) {
      setClients(prev => prev.map(c => c.id === editingClient.id ? optimisticClient : c));
    } else {
      setClients(prev => [optimisticClient, ...prev]);
    }
    
    setShowModal(false);

    try {
      if (editingClient) {
        await updateClient(editingClient.id, { ...formData, agencyId: auth.currentUser?.uid });
      } else {
        await createClient({ ...formData, agencyId: auth.currentUser?.uid });
      }
      resetForm();
      loadClients();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Erreur lors de l\'enregistrement. Les modifications ont été annulées.');
      loadClients(); // Revert
    }
  };

  const resetForm = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      licenseNumber: '',
      idNumber: ''
    });
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      licenseNumber: client.licenseNumber,
      idNumber: client.idNumber
    });
    setShowModal(true);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Annuaire Clients</h1>
          <p className="text-gray-600 dark:text-gray-400">Gérez les dossiers clients et leurs documents.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-primary flex items-center justify-center space-x-2"
        >
          <Plus size={20} />
          <span>Ajouter un client</span>
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-hidden">
          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {loading && clients.length === 0 ? (
              [1, 2, 3].map(i => (
                <div key={i} className="p-4 space-y-3 animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              ))
            ) : filteredClients.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">Aucun client trouvé.</div>
            ) : (
              filteredClients.map((client) => (
                <div key={client.id} className="p-4 space-y-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                        <UserCheck size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white capitalize leading-none">{client.name}</p>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Client ID: {client.id?.slice(-6)}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleEdit(client)}
                      className="p-2 text-gray-400 hover:text-primary-500 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <a href={`mailto:${client.email}`} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-[11px] text-gray-600 dark:text-gray-400">
                      <Mail size={12} className="text-primary-500" />
                      <span className="truncate">{client.email}</span>
                    </a>
                    <a href={`tel:${client.phone}`} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-[11px] text-gray-600 dark:text-gray-400">
                      <Phone size={12} className="text-primary-500" />
                      <span>Appeler</span>
                    </a>
                    <div className="col-span-2 flex items-center space-x-2 p-2 border border-gray-100 dark:border-gray-800 rounded-lg text-[11px] text-gray-500">
                      <CreditCard size={12} />
                      <span className="font-mono">Permis: {client.licenseNumber}</span>
                    </div>
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
                  <th className="px-6 py-4 font-semibold">Client</th>
                  <th className="px-6 py-4 font-semibold">Coordonnées</th>
                  <th className="px-6 py-4 font-semibold">Permis de conduire</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading && clients.length === 0 ? (
                  [1, 2, 3, 4, 5].map(i => <ClientRowSkeleton key={i} />)
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                      Aucun client trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                            <UserCheck size={20} />
                          </div>
                          <span className="font-bold text-gray-900 dark:text-white capitalize">{client.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm space-y-1">
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <Mail size={14} className="mr-2" />
                            <span>{client.email}</span>
                          </div>
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <Phone size={14} className="mr-2" />
                            <span>{client.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm font-mono text-gray-700 dark:text-gray-300">
                          <CreditCard size={14} className="mr-2 text-gray-400" />
                          <span>{client.licenseNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleEdit(client)}
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
              className="relative w-full max-w-xl h-full md:h-auto md:rounded-2xl rounded-none bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto border border-white/10 flex flex-col"
            >
              <div className="p-4 lg:p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-10">
                <h3 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white">
                  {editingClient ? 'Modifier le client' : 'Nouveau client'}
                </h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nom complet</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input-field"
                    placeholder="Jean Dupont"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="input-field"
                      placeholder="jean@email.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Téléphone</label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="input-field"
                      placeholder="06 12 34 56 78"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">N° de Permis</label>
                    <input
                      type="text"
                      required
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({...formData, licenseNumber: e.target.value.toUpperCase()})}
                      className="input-field"
                      placeholder="123456789"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">N° de Pièce d'identité</label>
                    <input
                      type="text"
                      required
                      value={formData.idNumber}
                      onChange={(e) => setFormData({...formData, idNumber: e.target.value.toUpperCase()})}
                      className="input-field"
                      placeholder="ID123456"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    {editingClient ? 'Mettre à jour' : 'Ajouter le client'}
                  </button>
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
