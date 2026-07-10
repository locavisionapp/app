import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile 
} from 'firebase/auth';
import { auth } from '../firebase';
import { createUser } from '../services/firestore';

const AuthForm = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    // Step 1: Account
    email: 'entreprise@locavision.fr',
    password: 'Auriol13390@',
    
    // Step 2: Individual
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    
    // Step 3: Company
    companyName: '',
    siren: ''
  });

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If registration and not at final step, just move forward
    if (!isLogin && step < 3) {
      nextStep();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          formData.email, 
          formData.password
        );
        
        const fullName = `${formData.firstName} ${formData.lastName}`;
        
        // Update Firebase Auth profile
        await updateProfile(userCredential.user, {
          displayName: fullName
        });

        // Create Firestore record with full administrative data
        await createUser({
          uid: userCredential.user.uid,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          displayName: fullName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          companyName: formData.companyName,
          siren: formData.siren,
          role: 'Administrateur',
          subscriptionStatus: 'pending_payment',
          createdAt: new Date().toISOString()
        });
      }
      onSuccess?.();
    } catch (err) {
      console.error('Auth error:', err);
      let errorMessage = 'Une erreur est survenue.';
      if (err.code === 'auth/invalid-credential') errorMessage = 'Email ou mot de passe incorrect.';
      else if (err.code === 'auth/email-already-in-use') errorMessage = 'Cet email est déjà utilisé.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-gray-800"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-lg text-[9px] font-black uppercase tracking-widest mb-4">
             LocaVision SaaS v2.0
          </div>
          <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
            {isLogin ? 'Connexion' : 'Propulsez votre agence'}
          </h2>
          <p className="text-gray-500 font-medium mt-2">
            {isLogin 
              ? 'Heureux de vous revoir.' 
              : `Étape ${step} sur 3 — ${step === 1 ? 'Compte' : step === 2 ? 'Administrateur' : 'Entreprise'}`}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold uppercase">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div key="login" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 dark:text-primary-500/60 tracking-[0.2em] ml-1">Email professionnel</label>
                  <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/5 rounded-2xl outline-none focus:ring-4 ring-primary-500/10 font-bold transition-all" placeholder="nom@agence.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 dark:text-primary-500/60 tracking-[0.2em] ml-1">Mot de passe</label>
                  <input type="password" name="password" required value={formData.password} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/5 rounded-2xl outline-none focus:ring-4 ring-primary-500/10 font-bold transition-all" placeholder="••••••••" />
                </div>
              </motion.div>
            ) : (
              <motion.div key={`step${step}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                {step === 1 && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 dark:text-primary-500/60 tracking-[0.2em] ml-1">Email de l'administrateur</label>
                      <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/5 rounded-2xl outline-none focus:ring-4 ring-primary-500/10 font-bold transition-all" placeholder="votre@email.com" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 dark:text-primary-500/60 tracking-[0.2em] ml-1">Mot de passe sécurisé</label>
                      <input type="password" name="password" required value={formData.password} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/5 rounded-2xl outline-none focus:ring-4 ring-primary-500/10 font-bold transition-all" placeholder="Min. 8 caractères" />
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 dark:text-primary-500/60 tracking-[0.2em] ml-1">Prénom</label>
                        <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-white/5 rounded-2xl outline-none font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 dark:text-primary-500/60 tracking-[0.2em] ml-1">Nom</label>
                        <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-white/5 rounded-2xl outline-none font-bold" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 dark:text-primary-500/60 tracking-[0.2em] ml-1">Téléphone Direct</label>
                      <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-white/5 rounded-2xl outline-none font-bold" placeholder="06 .. .. .. .." />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 dark:text-primary-500/60 tracking-[0.2em] ml-1">Adresse Personnelle / Bureau</label>
                      <input type="text" name="address" required value={formData.address} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-white/5 rounded-2xl outline-none font-bold" />
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 dark:text-primary-500/60 tracking-[0.2em] ml-1">Raison Sociale</label>
                      <input type="text" name="companyName" required value={formData.companyName} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-white/5 rounded-2xl outline-none font-bold" placeholder="Nom de l'agence..." />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 dark:text-primary-500/60 tracking-[0.2em] ml-1">N° SIREN (Optionnel)</label>
                      <input type="text" name="siren" value={formData.siren} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-white/5 rounded-2xl outline-none font-bold" placeholder="9 chiffres" />
                    </div>
                    <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-2xl border border-primary-100 dark:border-primary-800">
                       <p className="text-[9px] font-black text-primary-600 uppercase tracking-widest leading-relaxed">
                         En cliquant sur terminer, vous acceptez nos conditions générales de vente et d'utilisation du service LocaVision.
                       </p>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-4 pt-4">
            {!isLogin && step > 1 && (
              <button type="button" onClick={prevStep} className="flex-1 py-4 bg-slate-100 dark:bg-gray-800 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Retour</button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] btn-primary py-4 rounded-2xl flex items-center justify-center gap-3 group shadow-xl shadow-primary-500/20 active:scale-95 transition-all"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span className="font-black uppercase text-[10px] tracking-widest">
                    {isLogin ? 'Se connecter' : step === 3 ? 'Finaliser l\'inscription' : 'Continuer'}
                  </span>
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800 text-center">
          <p className="text-xs font-bold text-gray-400">
            {isLogin ? "Nouveau chez LocaVision ?" : "Déjà membre de la flotte ?"}
            <button
              onClick={() => { setIsLogin(!isLogin); setStep(1); }}
              className="ml-2 font-black text-primary-600 hover:text-primary-700 transition-colors uppercase tracking-widest"
            >
              {isLogin ? "S'inscrire" : "Connexion"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthForm;
