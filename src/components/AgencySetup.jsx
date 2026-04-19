import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  MapPin, 
  Phone, 
  FileText, 
  Upload, 
  CheckCircle, 
  ArrowRight, 
  Loader2,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { createAgency } from '../services/firestore';

const AgencySetup = ({ user, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    siren: '',
    logo: null
  });

  const compressImage = (base64Str, maxWidth = 400, maxHeight = 400) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compression JPEG à 70%
      };
    });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result);
        setLogoPreview(compressed);
        setFormData(prev => ({ ...prev, logo: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createAgency(user.uid, formData);
      onComplete?.();
    } catch (error) {
      console.error('Agency creation error:', error);
      alert('Erreur lors de la création de l\'agence. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-900 via-gray-950 to-black flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary-500/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row shadow-primary-500/5"
      >
        {/* Left Side: Brand & Visual */}
        <div className="w-full lg:w-2/5 p-12 bg-gradient-to-br from-primary-600 to-primary-800 text-white flex flex-col justify-between relative overflow-hidden">
           {/* Abstract Pattern */}
           <div className="absolute inset-0 opacity-10 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path d="M0 100 C 20 0 50 0 100 100 Z" fill="currentColor" />
              </svg>
           </div>

           <div className="relative z-10">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-8">
                 <Building2 size={32} />
              </div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none mb-6">Établissez votre <br/><span className="text-primary-100/50">Enseigne</span></h2>
              <p className="text-primary-50/80 font-medium leading-relaxed">
                 Créez votre première agence pour commencer à gérer votre flotte et automatiser vos contrats. LocaVision centralise vos données techniques et administratives.
              </p>
           </div>
           
           <div className="relative z-10 mt-12 bg-black/20 p-6 rounded-[2rem] border border-white/10">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <CheckCircle size={20} />
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Prêt pour le multi-agences</p>
              </div>
            </div>
         </div>
               {/* Right Side: Form */}
        <div className="w-full lg:w-3/5 p-12 lg:p-16 bg-white dark:bg-gray-900">
          <form onSubmit={handleSubmit} className="space-y-8 text-left">
            {/* Logo Upload Section */}
            <div className="flex flex-col items-center justify-center space-y-4">
               <label className="relative group cursor-pointer">
                  <div className={`w-32 h-32 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-white/20 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary-500/50 ${logoPreview ? 'border-solid border-primary-500' : ''}`}>
                     {logoPreview ? (
                       <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-cover" />
                     ) : (
                       <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-primary-500">
                          <ImageIcon size={32} strokeWidth={1.5} />
                          <span className="text-[9px] font-black uppercase tracking-widest text-center px-4">Déposer le logo</span>
                       </div>
                     )}
                     <div className="absolute inset-0 bg-primary-600/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <Upload className="text-white" size={24} />
                     </div>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
               </label>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PNG, JPG ou SVG (Max 2Mo)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2 col-span-full">
                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-primary-500/60 tracking-[0.2em] ml-1">Nom de l'Agence</label>
                <div className="relative">
                  <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required 
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white outline-none focus:border-primary-500 focus:ring-4 ring-primary-500/5 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    placeholder="ex: LocaVision Lyon"
                  />
                </div>
              </div>

              <div className="space-y-2 col-span-full">
                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-primary-500/60 tracking-[0.2em] ml-1">Adresse Siège</label>
                <div className="relative">
                  <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required 
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white outline-none focus:border-primary-500 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    placeholder="Adresse complète"
                  />
                </div>
              </div>
               <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-primary-500/60 tracking-[0.2em] ml-1">Ville</label>
                <input 
                  required 
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white outline-none focus:border-primary-500 transition-all font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-primary-500/60 tracking-[0.2em] ml-1">Téléphone Agence</label>
                <div className="relative">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required 
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white outline-none focus:border-primary-500 transition-all font-bold"
                    placeholder="01 .."
                  />
                </div>
              </div>

              <div className="space-y-2 col-span-full">
                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-primary-500/60 tracking-[0.2em] ml-1">N° SIREN (Obligatoire pour les contrats)</label>
                <div className="relative">
                  <FileText className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required 
                    type="text"
                    value={formData.siren}
                    onChange={(e) => setFormData(prev => ({ ...prev, siren: e.target.value }))}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white outline-none focus:border-primary-500 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    placeholder="9 chiffres"
                  />
                </div>
              </div>
        </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-6 bg-primary-600 hover:bg-primary-500 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary-500/20 flex items-center justify-center gap-4 transition-all active:scale-95 disabled:opacity-50 mt-8"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  <span>Traitement de l'ouverture...</span>
                </>
              ) : (
                <>
                  <span>Ouvrir mon Agence</span>
                  <ArrowRight size={24} />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AgencySetup;
