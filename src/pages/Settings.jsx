import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Settings2, 
  Webhook, 
  Database, 
  Bell, 
  Shield, 
  Cpu, 
  Save,
  Globe,
  Mail,
  Phone,
  User,
  MapPin,
  FileText,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { updateUser } from '../services/firestore';

const SettingsPage = ({ profile, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('agency');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    city: profile?.city || '',
    companyName: profile?.companyName || '',
    siren: profile?.siren || '',
    // Technical settings
    aiSensitivity: profile?.aiSensitivity || 0.8,
    notifyOnDamage: profile?.notifyOnDamage ?? true,
    syncFrequency: profile?.syncFrequency || 'realtime'
  });

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        ...profile
      }));
    }
  }, [profile]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser(profile.id, {
        ...formData,
        displayName: `${formData.firstName} ${formData.lastName}`
      });
      await onUpdate?.();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Save settings error:', error);
      alert('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'agency', name: 'Profil Entreprise', icon: Building2 },
    { id: 'admin', name: 'Identité Admin', icon: User },
    { id: 'ai', name: 'Configuration IA', icon: Cpu },
  ];

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase italic tracking-tighter">Paramètres</h1>
          <p className="text-gray-500 font-medium">Gérez votre agence et vos informations légales.</p>
        </div>
        
        <div className="flex items-center gap-4">
          {showSuccess && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-widest">
              <CheckCircle size={16} /> Enregistré
            </motion.div>
          )}
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? 'Sauvegarde...' : 'Enregistrer'}
          </button>
        </div>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-72 space-y-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-4 px-6 py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest transition-all ${
                  activeTab === tab.id 
                    ? 'bg-primary-600 text-white shadow-2xl shadow-primary-500/20' 
                    : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <Icon size={20} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-2xl border border-slate-200 dark:border-slate-800 min-h-[600px]">
          {activeTab === 'agency' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-primary-600">
                    <Building2 size={24} />
                 </div>
                 <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Informations Légales</h3>
                    <p className="text-sm text-gray-500">Ces données apparaîtront sur vos contrats.</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Raison Sociale</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      name="companyName"
                      value={formData.companyName} 
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-4 ring-primary-500/10 font-bold transition-all"
                      placeholder="Ex: LocaCar Lyon"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">N° SIREN</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      name="siren"
                      value={formData.siren} 
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-4 ring-primary-500/10 font-bold transition-all"
                      placeholder="9 chiffres"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Adresse de l'agence</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      name="address"
                      value={formData.address} 
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-4 ring-primary-500/10 font-bold transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Ville</label>
                  <input 
                    type="text" 
                    name="city"
                    value={formData.city} 
                    onChange={handleChange}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-4 ring-primary-500/10 font-bold transition-all"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'admin' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600">
                    <User size={24} />
                 </div>
                 <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Compte Administrateur</h3>
                    <p className="text-sm text-gray-500">Informations de contact de l'administrateur de l'agence.</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Prénom</label>
                  <input 
                    type="text" 
                    name="firstName"
                    value={formData.firstName} 
                    onChange={handleChange}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-4 ring-primary-500/10 font-bold transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nom</label>
                  <input 
                    type="text" 
                    name="lastName"
                    value={formData.lastName} 
                    onChange={handleChange}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-4 ring-primary-500/10 font-bold transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Email (Lecture seule)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="email" 
                      value={formData.email} 
                      readOnly
                      disabled
                      className="w-full pl-12 pr-4 py-4 bg-gray-100 dark:bg-gray-800/50 text-gray-400 border-none rounded-2xl outline-none cursor-not-allowed font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="tel" 
                      name="phone"
                      value={formData.phone} 
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-4 ring-primary-500/10 font-bold transition-all"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
               <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600">
                    <Cpu size={24} />
                 </div>
                 <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Moteur d'Analyse IA</h3>
                    <p className="text-sm text-gray-500">Configurez la sensibilité de détection de Gemini.</p>
                 </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Sensibilité de détection</label>
                    <span className="text-xs font-black text-primary-600">{(formData.aiSensitivity * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" 
                    name="aiSensitivity"
                    min="0.1" 
                    max="1" 
                    step="0.05"
                    value={formData.aiSensitivity} 
                    onChange={(e) => setFormData(prev => ({ ...prev, aiSensitivity: parseFloat(e.target.value) }))}
                    className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                  <div className="flex justify-between text-[8px] font-black uppercase text-gray-400 tracking-widest px-1">
                    <span>Prudent</span>
                    <span>Équilibré</span>
                    <span>Aggressif</span>
                  </div>
                </div>

                <div className="p-6 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                  <div className="flex gap-4">
                    <Shield className="text-blue-600 shrink-0" size={20} />
                    <div>
                      <p className="text-xs font-bold text-blue-900 dark:text-blue-100 uppercase tracking-tighter">Analyse Certifiée LocaVision</p>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                        Le moteur IA scanne les véhicules à la recherche de rayures, bosses et anomalies structurelles.
                        Une sensibilité élevée augmentera le nombre de faux positifs mais garantira une détection totale.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
