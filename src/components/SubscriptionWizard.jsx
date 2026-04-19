import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ShieldCheck, Zap, Globe, CreditCard, Loader2 } from 'lucide-react';
import { updateUser, getUser } from '../services/firestore';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Idéal pour les petites agences indépendantes.',
    locations: 1,
    monthlyPrice: 29,
    icon: Globe,
    color: 'slate',
    features: ['1 Local / Agence', 'Flotte illimitée', 'Inspections IA (Standard)', 'Support par Email']
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Parfait pour les réseaux en croissance.',
    locations: 3,
    monthlyPrice: 79,
    icon: Zap,
    color: 'primary',
    popular: true,
    features: ['Jusqu\'à 3 Locaux', 'Flotte illimitée', 'Inspections IA (Premium)', 'Analytiques Avancés', 'Support Prioritaire']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'La puissance totale pour les grands groupes.',
    locations: 10,
    monthlyPrice: 199,
    icon: ShieldCheck,
    color: 'emerald',
    features: ['Jusqu\'à 10 Locaux', 'Flotte illimitée', 'IA Temps Réel', 'API de Gestion', 'Accompagnement Dédié']
  }
];

const PERIODS = [
  { id: 'monthly', name: 'Mensuel', label: 'Au mois', discount: 0 },
  { id: 'quarterly', name: 'Trimestriel', label: '-10% économique', discount: 0.1 },
  { id: 'yearly', name: 'Annuel', label: '-20% recommandé', discount: 0.2 }
];

const SubscriptionWizard = ({ user, onComplete }) => {
  const [selectedPlan, setSelectedPlan] = useState('business');
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [showStripe, setShowStripe] = useState(false);

  const currentPlan = PLANS.find(p => p.id === selectedPlan);
  const currentPeriod = PERIODS.find(p => p.id === period);
  
  // Calculate price
  const basePrice = currentPlan.monthlyPrice;
  let multiplier = 1;
  if (period === 'quarterly') multiplier = 3;
  if (period === 'yearly') multiplier = 12;
  
  const totalPrice = Math.round(basePrice * multiplier * (1 - currentPeriod.discount));

  const handlePayment = async () => {
    setLoading(true);
    // Simulate Stripe Gateway
    setTimeout(async () => {
       await updateUser(user.uid, {
         subscriptionStatus: 'active',
         planId: selectedPlan,
         billingCycle: period,
         maxLocations: currentPlan.locations,
         subscribedAt: new Date().toISOString()
       });
       setLoading(false);
       onComplete();
    }, 2500);
  };

  if (showStripe) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-10 shadow-2xl border border-primary-500/20">
          <div className="text-center mb-8">
             <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-primary-600 mx-auto mb-4">
                <CreditCard size={32} />
             </div>
             <h3 className="text-2xl font-black uppercase italic tracking-tighter">Paiement Sécurisé</h3>
             <p className="text-gray-400 text-sm mt-2">Transaction cryptée via Stripe</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl mb-8">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{currentPlan.name} — {currentPeriod.name}</span>
                <span className="text-xl font-black tracking-tighter">{totalPrice}€</span>
             </div>
             <div className="h-px bg-gray-200 dark:bg-gray-700 my-4" />
             <p className="text-[10px] text-gray-400">En confirmant, vous autorisez LocaVision à débiter votre carte pour ce montant. Pas d'engagement, résiliable en un clic.</p>
          </div>

          <button 
            onClick={handlePayment}
            disabled={loading}
            className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-primary-500/20 transition-all disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="animate-spin" size={18} /> Traitement en cours...</>
            ) : (
              `Payer ${totalPrice}€ maintenant`
            )}
          </button>
          
          <button onClick={() => setShowStripe(false)} className="w-full mt-4 text-[10px] font-black uppercase text-gray-400 hover:text-gray-600">Retour aux formules</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-20 px-4 flex flex-col items-center">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16 max-w-2xl">
        <h2 className="text-5xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-4">Choisissez votre envergure</h2>
        <p className="text-gray-500 font-medium">Une tarification simple et transparente qui s'adapte au nombre de vos agences locales.</p>
      </motion.div>

      {/* Period Selector */}
      <div className="bg-white dark:bg-gray-900 p-2 rounded-2xl flex gap-2 mb-16 shadow-xl border border-gray-100 dark:border-gray-800">
        {PERIODS.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === p.id ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            {p.name}
            {p.discount > 0 && <span className="block text-[8px] opacity-70 italic">{p.label}</span>}
          </button>
        ))}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
        {PLANS.map(plan => (
          <motion.div
            key={plan.id}
            whileHover={{ y: -10 }}
            className={`bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-2xl border-4 relative overflow-hidden flex flex-col ${selectedPlan === plan.id ? 'border-primary-600 shadow-primary-500/10' : 'border-transparent'}`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-primary-600 text-white px-8 py-2 rotate-45 translate-x-8 translate-y-2 text-[10px] font-black uppercase tracking-widest">Populaire</div>
            )}
            
            <div className={`w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-8 ${selectedPlan === plan.id ? 'text-primary-600' : 'text-gray-400'}`}>
              <plan.icon size={32} />
            </div>

            <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2 text-slate-900 dark:text-white">{plan.name}</h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm font-medium mb-8 leading-relaxed">{plan.description}</p>
            
            <div className="mb-10">
               <div className="flex items-baseline gap-1 text-slate-900 dark:text-white">
                 <span className="text-5xl font-black tracking-tighter">{plan.monthlyPrice}€</span>
                 <span className="text-gray-400 font-bold uppercase text-[10px]">/ mois</span>
               </div>
               <p className="text-[10px] font-black text-primary-500 uppercase tracking-[0.2em] mt-2">{plan.locations} Local inclus</p>
            </div>

            <div className="space-y-4 mb-12 flex-grow">
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold">
                    <Check size={12} />
                  </div>
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{f}</span>
                </div>
              ))}
            </div>

            <button
               onClick={() => { setSelectedPlan(plan.id); setShowStripe(true); }}
               className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${selectedPlan === plan.id ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200'}`}
            >
              Sélectionner cette offre
            </button>
          </motion.div>
        ))}
      </div>

      <p className="mt-16 text-[10px] font-black text-gray-400 uppercase tracking-widest italic max-w-lg text-center leading-relaxed">
        Tous nos abonnements incluent l'expertise IA de LocaVision et le support 24/7. 
        Paiement mensuel, trimestriel ou annuel sécurisé via Stripe.
      </p>
    </div>
  );
};

export default SubscriptionWizard;
