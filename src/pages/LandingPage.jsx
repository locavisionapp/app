import React from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  ShieldCheck, 
  BarChart3, 
  Car, 
  Camera, 
  FileText, 
  ArrowRight, 
  Globe, 
  Smartphone,
  Cpu,
  Check,
  CheckCircle2,
  HelpCircle,
  Mail
} from 'lucide-react';

const Twitter = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const Instagram = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const Linkedin = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

import InteractiveModel from '../components/InteractiveModel';

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.8 }}
    className="glass-card p-8 rounded-[2.5rem] border border-white/5 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-all group"
  >
    <div className="w-14 h-14 bg-primary-600/20 rounded-2xl flex items-center justify-center text-primary-500 mb-6 group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white transition-all">
      <Icon size={28} />
    </div>
    <h3 className="text-xl font-black uppercase italic tracking-tighter text-white mb-4">{title}</h3>
    <p className="text-gray-400 text-sm leading-relaxed font-medium">{description}</p>
  </motion.div>
);

const DemoSimulation = () => {
    const [damages, setDamages] = React.useState([]);
    const [phase, setPhase] = React.useState('scanning');

    React.useEffect(() => {
        const interval = setInterval(() => {
            if (phase === 'scanning') {
                setPhase('detected');
                setDamages([
                    { partId: 'front', severity: 4, label: 'Rayure Prononcée' },
                    { partId: 'left', severity: 2, label: 'Impact Léger' }
                ]);
            } else {
                setPhase('scanning');
                setDamages([]);
            }
        }, 4000);
        return () => clearInterval(interval);
    }, [phase]);

    return (
        <div className="relative group">
            <div className={`absolute inset-0 bg-primary-500/10 blur-[100px] transition-opacity duration-1000 ${phase === 'detected' ? 'opacity-100' : 'opacity-0'}`} />
            <div className="relative z-10 bg-black/40 backdrop-blur-3xl rounded-[3rem] border border-white/10 p-2 shadow-2xl">
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5 rounded-t-[2.5rem]">
                   <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${phase === 'scanning' ? 'bg-primary-500 animate-pulse' : 'bg-emerald-500'}`} />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">
                         Status: {phase === 'scanning' ? 'Scan en cours...' : 'Expertise Terminée'}
                      </span>
                   </div>
                   <div className="px-4 py-1.5 bg-primary-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full">Gemini 2.0 Flash</div>
                </div>
                <div className="p-8">
                   <InteractiveModel damages={damages} />
                </div>
                {phase === 'detected' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-8 bg-primary-900/20 border-t border-white/5 space-y-4"
                    >
                        <div className="flex justify-between items-center">
                           <span className="text-xs font-black uppercase tracking-widest text-primary-400">Rapport de Dommages</span>
                           <span className="text-xs font-black text-rose-500">2 Anomalies</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                              <p className="text-[9px] font-black uppercase text-gray-500 mb-1">Pare-choc Avant</p>
                              <p className="text-sm font-bold text-white">Rayure Profonde (8cm)</p>
                           </div>
                           <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                              <p className="text-[9px] font-black uppercase text-gray-500 mb-1">Aile Gauche</p>
                              <p className="text-sm font-bold text-white">Impact Gravier</p>
                           </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

const LandingPage = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary-500/30 overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-900/20 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[150px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 p-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center bg-white/5 backdrop-blur-md px-10 py-5 rounded-[2rem] border border-white/10">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                <Zap size={20} fill="white" />
             </div>
             <span className="text-2xl font-black uppercase italic tracking-tighter">Loca<span className="text-primary-500">Vision</span></span>
          </div>
          <div className="hidden md:flex items-center gap-10 text-[10px] font-black uppercase tracking-widest text-gray-400">
             <a href="#features" className="hover:text-primary-500 transition-colors">Fonctionnalités</a>
             <a href="#ia" className="hover:text-primary-500 transition-colors">Expertise IA</a>
             <a href="#saas" className="hover:text-primary-500 transition-colors">Solution SaaS</a>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={onStart} className="px-10 py-4 bg-primary-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl flex items-center gap-2">
                Connexion <ArrowRight size={16} />
             </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
            className="space-y-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600/10 border border-primary-600/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-primary-500">
               ✨ Alimenté par Gemini 2.0 Flash
            </div>
            <h1 className="text-7xl md:text-8xl font-black uppercase italic italic tracking-tighter leading-[0.9]">
              L'avenir de la <br />
              <span className="text-primary-600">Location</span> est <br />
              Intelligent.
            </h1>
            <p className="text-xl text-gray-400 font-medium max-w-lg leading-relaxed">
              LocaVision transforme chaque inspection de véhicule en expertise scientifique. Automatisez vos processus de location de l'entrée à la sortie.
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
               <button onClick={onStart} className="px-12 py-6 bg-primary-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-primary-700 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary-500/40 flex items-center justify-center gap-3">
                  Se connecter <ArrowRight size={18} />
               </button>
               <a href="#demo" className="px-12 py-6 bg-white/5 border border-white/10 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all backdrop-blur-xl flex items-center justify-center">
                  Voir la démo technique
               </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotateY: -20 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.2 }}
            className="relative"
          >
            <div className="aspect-square bg-gradient-to-tr from-primary-600/20 to-blue-600/10 rounded-[3rem] border border-white/10 overflow-hidden relative shadow-2xl shadow-primary-500/10 p-1">
               <div className="absolute inset-0 bg-primary-600 opacity-5 mix-blend-overlay" />
               <div className="w-full h-full bg-black/40 backdrop-blur-3xl p-12 flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-4 w-full h-full">
                     <div className="bg-white/5 rounded-[2rem] border border-white/5 p-8 flex flex-col justify-end">
                        <Camera size={32} className="text-primary-500 mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Scanner IA</span>
                     </div>
                     <div className="bg-white/5 rounded-[2rem] border border-white/5 p-8 flex flex-col justify-end">
                        <BarChart3 size={32} className="text-primary-500 mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Analytique</span>
                     </div>
                     <div className="col-span-2 bg-primary-600/10 rounded-[2rem] border border-primary-500/20 p-8 flex flex-col justify-end relative overflow-hidden group">
                        <ShieldCheck size={48} className="text-primary-600 mb-6 group-hover:scale-110 transition-transform" />
                        <h4 className="text-2xl font-black uppercase italic tracking-tighter">Sécurité 100%</h4>
                        <p className="text-xs text-gray-400 mt-2">Dossiers d'expertise cryptés et horodatés.</p>
                     </div>
                  </div>
               </div>
            </div>
            
            {/* Floating Badges */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="absolute -top-12 -right-12 p-6 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl"
            >
               <Cpu size={24} className="text-emerald-500 mb-2" />
               <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Puissance IA</p>
               <p className="text-lg font-black text-emerald-500 tracking-tighter">FLASH 2.0</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Technical Demo Section */}
      <section id="demo" className="py-32 px-8 relative">
          <div className="max-w-7xl mx-auto text-center mb-20">
             <div className="w-fit mx-auto px-4 py-2 bg-primary-600/10 rounded-full text-[10px] font-black uppercase tracking-widest text-primary-500 mb-6 border border-primary-600/20 tracking-[0.4em]">Live Showcase</div>
             <h2 className="text-6xl font-black uppercase italic tracking-tighter mb-4 italic">Un Scanner <span className="text-primary-600">Omniscient</span></h2>
             <p className="text-gray-400 font-medium max-w-xl mx-auto">Visualisez comment notre IA identifie instantanément les moindres défauts sur tout type de carrosserie.</p>
          </div>
          <div className="max-w-4xl mx-auto">
             <DemoSimulation />
          </div>
      </section>

      {/* Trust Section: Partners */}
      <section className="py-20 border-y border-white/5 bg-white/[0.02]">
         <div className="max-w-7xl mx-auto px-8 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 mb-12">Ils propulsent leur flotte avec LocaVision</p>
            <div className="flex flex-wrap justify-center gap-12 lg:gap-24 opacity-40 grayscale hover:grayscale-0 transition-all">
               <div className="text-2xl font-black italic tracking-tighter uppercase text-white">EuroRent</div>
               <div className="text-2xl font-black italic tracking-tighter uppercase text-white">SwiftCar</div>
               <div className="text-2xl font-black italic tracking-tighter uppercase text-white">EliteDrive</div>
               <div className="text-2xl font-black italic tracking-tighter uppercase text-white">MetroMove</div>
            </div>
         </div>
      </section>

      {/* Workflow Section: How it works */}
      <section id="ia" className="py-32 px-8 bg-white/5 border-y border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
             <div className="text-left">
                <h2 className="text-5xl font-black uppercase italic tracking-tighter mb-8 leading-tight">Le Futur de la Location <br /><span className="text-primary-600">en 3 étapes</span></h2>
                <div className="space-y-12">
                   {[
                     { h: "Scan Instantané", p: "L'agent capture 4 photos clés du véhicule. Gemini 2.0 Flash analyse la carrosserie en 5ms pour identifier les dommages.", i: Camera },
                     { h: "Certification IA", p: "Le rapport d'expertise est généré avec détection automatique des rayures, chocs et zones saines.", i: Cpu },
                     { h: "Signature Sécurisée", p: "Le contrat PDF est créé instantanément et signé électroniquement sur tablette ou smartphone.", i: FileText }
                   ].map((step, idx) => (
                     <div key={idx} className="flex gap-8 group text-left">
                        <div className="shrink-0 w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-primary-500 border border-white/10 group-hover:bg-primary-600 group-hover:text-white transition-all shadow-xl">
                           <step.i size={24} />
                        </div>
                        <div>
                           <h4 className="text-xl font-black uppercase italic tracking-tight text-white mb-2">{step.h}</h4>
                           <p className="text-gray-400 font-medium leading-relaxed">{step.p}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
             <div className="relative p-10 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-[3rem] shadow-2xl overflow-hidden group">
                <div className="absolute inset-0 bg-black/20 group-hover:opacity-0 transition-opacity" />
                <img src="https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&q=80&w=1000" className="w-full rounded-2xl shadow-inner mix-blend-overlay opacity-40" alt="Tech Background" />
                <div className="relative space-y-6">
                   <div className="w-fit px-4 py-2 bg-white/20 backdrop-blur-xl border border-white/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-white italic">Interface Inspecteur v6.0</div>
                   <div className="bg-black/60 backdrop-blur-2xl p-8 rounded-3xl border border-white/10 space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-primary-400"><span>Analyse Gemini en cours...</span> <span>89%</span></div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} whileInView={{ width: '89%' }} className="h-full bg-primary-500" /></div>
                      <p className="text-sm font-medium text-gray-300">"Rayure détectée sur aile avant gauche. Profondeur: 1.2mm. Réparation estimée : 150€."</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-8">
        <div className="max-w-7xl mx-auto text-center mb-20">
          <h2 className="text-5xl font-black uppercase italic tracking-tighter mb-4">L'écosystème <span className="text-primary-600">Enterprise</span></h2>
          <p className="text-gray-400 font-medium max-w-xl mx-auto">Une suite d'outils complète conçue pour l'efficacité opérationnelle et la croissance de votre réseau d'agences.</p>
        </div>
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={Camera} 
            title="Inspection IA" 
            description="Analysez les dommages en temps réel avec une précision chirurgicale. L'IA Gemini détecte les anomalies invisibles à l'oeil nu."
            delay={0.1}
          />
          <FeatureCard 
            icon={FileText} 
            title="Contrats PDF" 
            description="Générez des contrats professionnels signés électroniquement. Sécurisation juridique totale avec archivage cloud."
            delay={0.2}
          />
          <FeatureCard 
            icon={Smartphone} 
            title="Mobilité Totale" 
            description="Accédez à votre flotte depuis n'importe où. Optimisé pour tablette et mobile pour vos agents terrain."
            delay={0.3}
          />
          <FeatureCard 
            icon={Globe} 
            title="SaaS Multi-Agences" 
            description="Gérez plusieurs lieux de stockage et affectez des employés à des dépôts spécifiques. Centralisation totale."
            delay={0.4}
          />
          <FeatureCard 
            icon={ShieldCheck} 
            title="Gestion Caution" 
            description="Le système de pré-autorisation et de gestion des cautions assure que chaque risque est couvert financièrement."
            delay={0.5}
          />
          <FeatureCard 
            icon={BarChart3} 
            title="Analytics Pro" 
            description="Suivez vos revenus, votre taux d'occupation et la santé de votre flotte avec des tableaux de bord dynamiques."
            delay={0.6}
          />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="saas" className="py-32 px-8">
        <div className="max-w-7xl mx-auto text-center mb-24">
           <h2 className="text-6xl font-black uppercase italic tracking-tighter mb-4 italic text-center text-white">Tarification <span className="text-primary-600">Enterprise</span></h2>
           <p className="text-gray-400 font-medium max-w-xl mx-auto text-lg text-center">Des forfaits adaptés à la taille de votre flotte. Transparent. Sans engagement.</p>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
           {[
             { name: "Solo", price: "29", features: ["1 Agence inclus", "Jusqu'à 10 véhicules", "Scan IA standard", "Support email"], color: "bg-white/5", text: "text-white" },
             { name: "Agence", price: "79", features: ["3 Agences incluses", "Illimité véhicules", "Scan IA Prioritaire", "Multi-employés", "Dashboard Analytique"], color: "bg-primary-600", text: "text-white", popular: true },
             { name: "Enterprise", price: "199", features: ["Agences illimitées", "Intégration API", "Accès Gemini Ultra", "Support 24/7 dédié", "Contrats personnalisés"], color: "bg-white/5", text: "text-white" }
           ].map((plan, i) => (
             <motion.div 
               key={i} 
               whileHover={{ y: -10 }}
               className={`p-12 rounded-[4rem] border border-white/10 relative overflow-hidden flex flex-col justify-between ${plan.color}`}
             >
                {plan.popular && <div className="absolute top-10 right-10 px-4 py-1 bg-white text-primary-600 rounded-full text-[9px] font-black uppercase tracking-widest text-center">Le plus populaire</div>}
                <div>
                   <h4 className="text-2xl font-black uppercase italic mb-4 text-white">{plan.name}</h4>
                   <div className="flex items-end gap-2 mb-10 text-white">
                      <span className="text-6xl font-black italic tracking-tighter">{plan.price}€</span>
                      <span className="text-gray-400 font-medium italic mb-2">/mois</span>
                   </div>
                   <div className="space-y-4">
                      {plan.features.map((f, idx) => (
                        <div key={idx} className="flex gap-4 items-center">
                           <CheckCircle2 size={18} className={plan.popular ? "text-white" : "text-primary-600"} />
                           <span className="text-sm font-medium opacity-80 text-white/80">{f}</span>
                        </div>
                      ))}
                   </div>
                </div>
                <button onClick={onStart} className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest mt-12 transition-all ${plan.popular ? 'bg-white text-primary-600 hover:bg-gray-100' : 'bg-primary-600 text-white hover:bg-primary-500 shadow-xl shadow-primary-500/20'}`}>
                   Se connecter
                </button>
             </motion.div>
           ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-8">
         <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
               <h2 className="text-6xl font-black uppercase italic tracking-tighter italic">L'Expérience <span className="text-primary-600">Utilisateur</span></h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8 text-left">
               {[
                  { name: "Marc Lefebvre", role: "Directeur, AutoPlus Lyon", text: "LocaVision a réduit nos litiges de fin de contrat de 85%. L'IA ne manque jamais une rayure." },
                  { name: "Sophie Martin", role: "Gérante, CityRent", text: "La rapidité de Gemini 2.0 est bluffante. Une inspection complète prend désormais moins de 2 minutes." },
                  { name: "Julien Dubosc", role: "Resp. Flotte, Transp'Hertz", text: "L'interface est d'une clarté absolue. Mes agents ont adopté l'outil en une seule matinée." }
               ].map((t, i) => (
                  <div key={i} className="p-10 bg-white/5 border border-white/10 rounded-[2.5rem] relative group">
                     <div className="absolute top-8 left-8 text-primary-500 opacity-20 group-hover:opacity-100 transition-opacity">
                        <Zap size={40} fill="currentColor" />
                     </div>
                     <p className="text-gray-300 font-medium leading-relaxed relative z-10 mt-8 mb-10">"{t.text}"</p>
                     <div>
                        <p className="font-black uppercase italic tracking-tighter text-white">{t.name}</p>
                        <p className="text-[10px] font-bold text-primary-500 uppercase tracking-widest">{t.role}</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* CTA Final */}
      <section className="py-40 px-8 relative overflow-hidden">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-primary-900/40 to-primary-600 p-16 rounded-[4rem] text-center border border-white/20 shadow-2xl relative z-10">
           <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white mb-6">Prêt à moderniser votre flotte ?</h2>
           <p className="text-white/80 text-xl font-medium mb-10 max-w-xl mx-auto">Rejoignez les agences de location qui font confiance à l'intelligence artificielle pour leur rentabilité.</p>
           <button onClick={onStart} className="px-12 py-6 bg-white text-black rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] hover:bg-black hover:text-white transition-all shadow-2xl active:scale-95">
              Se connecter 🚀
           </button>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-primary-600/10 blur-[150px] pointer-events-none" />
      </section>

      {/* Footer */}
      <footer className="py-32 px-8 border-t border-white/5 bg-black/40 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20 text-left">
              <div className="col-span-1 md:col-span-1 space-y-6">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/20"><Zap size={16} fill="white" /></div>
                    <span className="text-xl font-black uppercase italic tracking-tighter">Loca<span className="text-primary-600">Vision</span></span>
                 </div>
                 <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-xs">
                    Plateforme certifiée de gestion de flotte et d'expertise par Intelligence Artificielle. Optimisé pour la conversion et la sécurité des loueurs professionnels.
                 </p>
                 <div className="flex gap-4">
                    {[Twitter, Instagram, Linkedin].map((Icon, i) => (
                      <Icon key={i} size={18} className="text-gray-600 hover:text-white transition-colors cursor-pointer" />
                    ))}
                 </div>
              </div>

              <div>
                 <h5 className="text-[10px] font-black uppercase text-white tracking-[0.3em] mb-8">Solution</h5>
                 <ul className="space-y-4 text-xs font-bold text-gray-500">
                    <li className="hover:text-primary-500 transition-colors cursor-pointer">Scan Dommages IA</li>
                    <li className="hover:text-primary-500 transition-colors cursor-pointer">Gestion Mobilité</li>
                    <li className="hover:text-primary-500 transition-colors cursor-pointer">Analytics Flotte</li>
                 </ul>
              </div>

              <div>
                 <h5 className="text-[10px] font-black uppercase text-white tracking-[0.3em] mb-8">Juridique</h5>
                 <ul className="space-y-4 text-xs font-bold text-gray-500">
                    <li className="hover:text-primary-500 transition-colors cursor-pointer">Mentions Légales</li>
                    <li className="hover:text-primary-500 transition-colors cursor-pointer">CGU & CGV</li>
                    <li className="hover:text-primary-500 transition-colors cursor-pointer">Protection Données (RGPD)</li>
                 </ul>
              </div>

              <div>
                 <h5 className="text-[10px] font-black uppercase text-white tracking-[0.3em] mb-8">Assistance</h5>
                 <div className="p-6 bg-white/5 rounded-3xl border border-white/10 border-dashed">
                    <p className="text-[9px] font-black uppercase text-primary-500 mb-2 tracking-widest">Support Disponible</p>
                    <p className="text-white text-xs font-black">support@locavision.ai</p>
                    <p className="text-gray-600 text-[9px] mt-2 font-medium">Réponse en moins de 2h</p>
                 </div>
              </div>
           </div>

           <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-[9px] font-black uppercase text-gray-600 tracking-widest">© 2026 LocaVision SAS. Tous droits réservés. Fabriqué en France.</p>
              <div className="flex items-center gap-8 text-[9px] font-black uppercase text-gray-600 tracking-widest">
                 <span className="flex items-center gap-2"><Globe size={10} /> Hébergé en Europe</span>
                 <span className="flex items-center gap-2"><ShieldCheck size={10} /> Conforme RGPD</span>
              </div>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
