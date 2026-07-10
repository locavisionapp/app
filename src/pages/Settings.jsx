import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings2, 
  Save,
  Mail,
  Lock,
  UserCircle,
  Loader2,
  CheckCircle,
  RefreshCw,
  Copy
} from 'lucide-react';
import { updateUser } from '../services/firestore';

const SettingsPage = ({ profile, onUpdate }) => {
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  
  const [formData, setFormData] = useState({
    email: profile?.email || '',
    phone: profile?.phone || ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        email: profile.email || '',
        phone: profile.phone || ''
      });
    }
  }, [profile]);

  const isSuperAdmin = ['SuperAdmin', 'super_admin', 'Administrateur'].includes(profile?.role);
  const isCommercial = ['Commercial', 'commercial'].includes(profile?.role);
  const isCompanyAdmin = ['Entreprise', 'entreprise', 'company_admin', 'company_agent'].includes(profile?.role);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGeneratePassword = () => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setNewPassword(password);
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy password:', error);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser(profile.id, formData);
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

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase italic tracking-tighter">Paramètres</h1>
          <p className="text-gray-500 font-medium">Gérez votre compte et vos préférences.</p>
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

      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="space-y-10">
          {/* Profile Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black italic`}>
                {profile?.firstName?.charAt(0) || profile?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white">
                  {profile?.firstName && profile?.lastName 
                    ? `${profile.firstName} ${profile.lastName}`
                    : profile?.email?.split('@')[0]}
                </h3>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">
                  {isSuperAdmin ? 'Super Admin' :
                   isCommercial ? 'Commercial' : 'Entreprise'}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email} 
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 ring-primary-500/10 font-bold transition-all"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Téléphone</label>
                <div className="relative">
                  <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="tel" 
                    name="phone"
                    value={formData.phone} 
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 ring-primary-500/10 font-bold transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-lg font-black uppercase italic tracking-tighter text-gray-900 dark:text-white">Mot de passe</h4>
                <p className="text-sm text-gray-500">Gérez votre mot de passe de connexion.</p>
              </div>
              <button 
                onClick={() => setShowChangePassword(!showChangePassword)}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-all"
              >
                {showChangePassword ? 'Annuler' : 'Changer le mot de passe'}
              </button>
            </div>

            {showChangePassword && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nouveau mot de passe</label>
                  <div className="flex gap-3">
                    <div className="flex-1 flex gap-2">
                      <div className="relative flex-1">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          type="text" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 ring-primary-500/10 font-bold transition-all"
                          placeholder="Mot de passe"
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={handleGeneratePassword}
                        className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                        title="Générer un mot de passe"
                      >
                        <RefreshCw size={20} className="text-gray-600 dark:text-gray-400" />
                      </button>
                      <button 
                        type="button"
                        onClick={handleCopyPassword}
                        className={`p-3 rounded-xl transition-all ${copied ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                        title="Copier le mot de passe"
                      >
                        {copied ? <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={20} className="text-gray-600 dark:text-gray-400" />}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
