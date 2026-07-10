import React, { useState, useEffect } from 'react';
import { Plus, UserCircle, Search, X, Loader2, Edit2, Trash2 } from 'lucide-react';
import { getCommercials, createCommercial, updateCommercial, deleteCommercial } from '../services/firestore';

const Commercials = () => {
  const [commercials, setCommercials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCommercial, setEditingCommercial] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'Actif'
  });

  useEffect(() => {
    loadCommercials();
  }, []);

  const loadCommercials = async () => {
    setLoading(true);
    try {
      const data = await getCommercials();
      setCommercials(data);
    } catch (error) {
      console.error('Error fetching commercials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingCommercial) {
        await updateCommercial(editingCommercial.id, formData);
      } else {
        await createCommercial(formData);
      }
      await loadCommercials();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving commercial:', error);
      alert(`Erreur lors de la sauvegarde: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (commercial) => {
    setEditingCommercial(commercial);
    setFormData({
      name: commercial.name || '',
      email: commercial.email || '',
      phone: commercial.phone || '',
      status: commercial.status || 'Actif'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce commercial ?')) {
      try {
        await deleteCommercial(id);
        await loadCommercials();
      } catch (error) {
        console.error('Error deleting commercial:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingCommercial(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      status: 'Actif'
    });
  };

  const filtered = commercials.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Commerciaux</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez votre équipe de commerciaux</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          <span>Nouveau Commercial</span>
        </button>
      </div>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Rechercher un commercial..."
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
          {filtered.map((commercial) => (
            <div key={commercial.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                  <UserCircle size={24} className="text-primary-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{commercial.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{commercial.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  commercial.status === 'Actif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {commercial.status}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(commercial)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(commercial.id)} className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {editingCommercial ? 'Modifier' : 'Nouveau'} Commercial
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nom complet</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 ring-primary-500/10 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Email</label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 ring-primary-500/10 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Téléphone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 ring-primary-500/10 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Statut</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 ring-primary-500/10 outline-none"
                >
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Annuler
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 btn-primary py-3">
                  {isSaving ? <Loader2 className="animate-spin" /> : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Commercials;
