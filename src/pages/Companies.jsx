import React, { useState, useEffect } from 'react';
import { Plus, Building2, Search, X, Loader2, Edit2, Trash2, History, UserCircle } from 'lucide-react';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../services/firestore';
import { auth } from '../firebase';

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [editingCompany, setEditingCompany] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    siren: '',
    maxAgencies: 1,
    maxVehicles: 10,
    maxEmployees: 5,
    price: 99,
    subscriptionType: 'monthly',
    paymentMethod: 'card',
    status: 'active'
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (editingCompany) {
        await updateCompany(editingCompany.id, formData);
      } else {
        await createCompany({
          ...formData,
          commercialId: currentUser?.uid,
          commercialName: currentUser?.displayName || 'Commercial'
        });
      }
      await loadCompanies();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving company:', error);
      alert(`Erreur lors de la sauvegarde: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name || '',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      siren: company.siren || '',
      maxAgencies: company.maxAgencies || 1,
      maxVehicles: company.maxVehicles || 10,
      maxEmployees: company.maxEmployees || 5,
      price: company.price || 99,
      subscriptionType: company.subscriptionType || 'monthly',
      paymentMethod: company.paymentMethod || 'card',
      status: company.status || 'active'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette entreprise ?')) {
      try {
        await deleteCompany(id);
        await loadCompanies();
      } catch (error) {
        console.error('Error deleting company:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingCompany(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      siren: '',
      maxAgencies: 1,
      maxVehicles: 10,
      maxEmployees: 5,
      price: 99,
      subscriptionType: 'monthly',
      paymentMethod: 'card',
      status: 'active'
    });
  };

  const filtered = companies.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Entreprises</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez les entreprises clientes</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          <span>Nouvelle Entreprise</span>
        </button>
      </div>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Rechercher une entreprise..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
        />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin h-8 w-8 text-primary-600" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((company) => (
            <div key={company.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                  <Building2 size={24} className="text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{company.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{company.email}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {company.price}€/{company.subscriptionType === 'monthly' ? 'mois' : 'an'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  company.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {company.status === 'active' ? 'Actif' : 'Inactif'}
                </span>
                <button
                  onClick={() => { setSelectedCompany(company); setShowHistoryModal(true); }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500"
                  title="Historique"
                >
                  <History size={16} />
                </button>
                <button onClick={() => handleEdit(company)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(company.id)} className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de création/édition */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {editingCompany ? 'Modifier l\'entreprise' : 'Créer une entreprise'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nom de l'entreprise</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 ring-primary-500/10 focus:border-primary-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Email</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 ring-primary-500/10 focus:border-primary-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Téléphone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 ring-primary-500/10 focus:border-primary-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">SIREN</label>
                  <input
                    type="text"
                    value={formData.siren}
                    onChange={(e) => setFormData({ ...formData, siren: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 ring-primary-500/10 focus:border-primary-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Adresse</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 ring-primary-500/10 focus:border-primary-500 outline-none"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Max agences</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxAgencies}
                    onChange={(e) => setFormData({ ...formData, maxAgencies: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 ring-primary-500/10 focus:border-primary-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Max véhicules</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxVehicles}
                    onChange={(e) => setFormData({ ...formData, maxVehicles: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 ring-primary-500/10 focus:border-primary-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Max employés</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxEmployees}
                    onChange={(e) => setFormData({ ...formData, maxEmployees: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 ring-primary-500/10 focus:border-primary-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Prix</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 ring-primary-500/10 focus:border-primary-500 outline-none"
                    />
                    <span className="text-slate-600 dark:text-slate-400 font-bold">€</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Type d'abonnement</label>
                  <select
                    value={formData.subscriptionType}
                    onChange={(e) => setFormData({ ...formData, subscriptionType: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 ring-primary-500/10 focus:border-primary-500 outline-none"
                  >
                    <option value="monthly">Mensuel</option>
                    <option value="yearly">Annuel (-10%)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Méthode de paiement</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 ring-primary-500/10 focus:border-primary-500 outline-none"
                  >
                    <option value="card">Carte bancaire</option>
                    <option value="sepa">Prélèvement SEPA</option>
                    <option value="transfer">Virement</option>
                    <option value="check">Chèque</option>
                  </select>
                </div>
              </div>

              {editingCompany && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Statut</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 ring-primary-500/10 focus:border-primary-500 outline-none"
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 btn-primary py-3"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : (editingCompany ? 'Modifier' : 'Créer l\'entreprise')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal d'historique */}
      {showHistoryModal && selectedCompany && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-xl">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Historique</h2>
              <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <History size={20} className="text-slate-400" />
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-white">Entreprise créée</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{new Date(selectedCompany.createdAt?.toDate ? selectedCompany.createdAt.toDate() : Date.now()).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <UserCircle size={20} className="text-slate-400" />
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-white">Commercial assigné</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{selectedCompany.commercialName || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Companies;
