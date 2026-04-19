import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  ShieldCheck, 
  UserCircle, 
  MoreVertical, 
  X, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../services/firestore';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Employé',
    status: 'Actif'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getEmployees();
      setEmployees(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedEmployee) {
        await updateEmployee(selectedEmployee.id, formData);
      } else {
        await createEmployee(formData);
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      alert('Erreur lors de l\'enregistrement.');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', role: 'Employé', status: 'Actif' });
    setSelectedEmployee(null);
  };

  const handleEdit = (emp) => {
    setSelectedEmployee(emp);
    setFormData({ name: emp.name, email: emp.email, role: emp.role, status: emp.status });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Voulez-vous vraiment supprimer cet employé ?')) {
      await deleteEmployee(id);
      loadData();
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pt-4 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto pb-20 space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-lg text-[9px] font-black uppercase tracking-widest mb-4">
             <ShieldCheck size={12} /> Administration Système
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase italic">Gestion des Employés</h1>
          <p className="text-gray-500 font-medium">Contrôlez les accès et suivez les performances de votre équipe.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-500/20 active:scale-95 transition-all"
        >
          <Plus size={20} />
          <span>Nouvel Employé</span>
        </button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Équipe', value: employees.length, icon: Users, color: 'text-primary-600' },
          { label: 'En Poste', value: employees.filter(e => e.status === 'Actif').length, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Administrateurs', value: employees.filter(e => e.role === 'Administrateur').length, icon: ShieldCheck, color: 'text-indigo-600' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 rounded-2xl flex items-center justify-between border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{stat.label}</p>
              <p className={`text-3xl font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <stat.icon size={24} className={stat.color} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search & List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher par nom ou email..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl outline-none border border-slate-200 dark:border-slate-800 focus:ring-4 ring-primary-500/10 font-bold transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-6 py-4">Nom / Profil</th>
                <th className="px-6 py-4">Rôle</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Rejoint le</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center text-slate-400 font-black uppercase tracking-widest text-xs animate-pulse">Syncing Team...</td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center text-slate-300">
                    <Users size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-[10px]">Aucun employé trouvé</p>
                  </td>
                </tr>
              ) : filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 font-black">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white uppercase text-sm tracking-tight">{emp.name}</p>
                        <p className="text-[10px] font-medium text-slate-400">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                      emp.role === 'Administrateur' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${emp.status === 'Actif' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      <span className="text-xs font-bold">{emp.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-400">
                    {new Date(emp.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(emp)} className="p-2 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-all">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(emp.id)} className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Profile/Add Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">
                  {selectedEmployee ? 'Modifier l\'Employé' : 'Nouvel Employé'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nom Complet</label>
                  <input 
                    required 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold focus:ring-2 ring-primary-500/20" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email Professionnel</label>
                  <input 
                    required 
                    type="email"
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold focus:ring-2 ring-primary-500/20" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Rôle Système</label>
                    <select 
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold"
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                    >
                      <option value="Administrateur">Administrateur</option>
                      <option value="Employé">Employé</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Statut</label>
                    <select 
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none font-bold"
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="Actif">Actif</option>
                      <option value="Inactif">Inactif</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 font-black uppercase text-[10px] text-slate-400">Annuler</button>
                  <button type="submit" className="px-10 py-4 bg-primary-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-500/20 active:scale-95 transition-all">
                    {selectedEmployee ? 'Enregistrer' : 'Créer le Dossier'}
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

export default Employees;
