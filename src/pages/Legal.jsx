import React from 'react';
import { motion } from 'framer-motion';
import { Shield, FileText, Lock, Scale, ArrowLeft } from 'lucide-react';

const Legal = ({ type, onClose }) => {
  const contents = {
    mentions: {
      title: "Mentions Légales",
      icon: Shield,
      sections: [
        {
          h: "Éditeur du Site",
          p: "Le site LocaVision est édité par la société LocaVision SAS, au capital de 10 000€, immatriculée au RCS de Paris sous le numéro 123 456 789. Siège social : 12 rue de l'Innovation, 75001 Paris."
        },
        {
          h: "Directeur de la Publication",
          p: "Monsieur Jo, en sa qualité de Président de LocaVision SAS."
        },
        {
          h: "Hébergement",
          p: "Le site est hébergé par Google Cloud Platform, dont le siège social est situé à Gordon House, Barrow St, Dublin 4, Irlande."
        }
      ]
    },
    cgu: {
      title: "Conditions Générales d'Utilisation",
      icon: Scale,
      sections: [
        {
          h: "Objet du Service",
          p: "LocaVision est une plateforme SaaS permettant la gestion de flottes de véhicules et l'automatisation des expertises par Intelligence Artificielle. L'utilisation du service implique l'acceptation pleine et entière des présentes CGU."
        },
        {
          h: "Accès au Service",
          p: "L'accès aux fonctionnalités avancées (scan IA, exports PDF) est réservé aux utilisateurs ayant souscrit à une offre payante (Solo, Agence ou Enterprise)."
        },
        {
          h: "Propriété Intellectuelle",
          p: "Tous les algorithmes de scan, designs et codes sources sont la propriété exclusive de LocaVision SAS."
        }
      ]
    },
    privacy: {
      title: "Confidentialité & RGPD",
      icon: Lock,
      sections: [
        {
          h: "Collecte des Données",
          p: "Nous collectons les données nécessaires à la gestion de vos contrats : identité des clients, photos des véhicules et données techniques de flotte. Ces données sont cryptées et stockées en Europe."
        },
        {
          h: "Traitement IA",
          p: "Les images téléchargées sont traitées par l'API Gemini de Google Cloud pour la détection de dommages. Aucune donnée n'est revendue à des tiers ou utilisée à des fins publicitaires."
        },
        {
          h: "Vos Droits",
          p: "Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles via l'onglet Paramètres de votre console."
        }
      ]
    }
  };

  const content = contents[type] || contents.mentions;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-slate-900 dark:text-white p-6 sm:p-12 lg:p-24 relative overflow-hidden">
       {/* Decorative Elements */}
       <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-600/5 rounded-full blur-[120px] pointer-events-none" />
       
       <div className="max-w-4xl mx-auto">
          <motion.button 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onClose}
            className="flex items-center gap-2 text-primary-600 font-black uppercase text-[10px] tracking-widest mb-12 hover:gap-4 transition-all"
          >
             <ArrowLeft size={16} /> Retour à l'accueil
          </motion.button>

          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="space-y-12"
          >
             <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-primary-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-primary-500/20">
                   <content.icon size={40} />
                </div>
                <div>
                   <h1 className="text-4xl sm:text-6xl font-black uppercase italic tracking-tighter leading-none italic">{content.title}</h1>
                   <p className="text-slate-400 font-medium mt-2">Dernière mise à jour : 20 Avril 2026</p>
                </div>
             </div>

             <div className="grid gap-12 pt-12 border-t border-slate-200 dark:border-slate-800">
                {content.sections.map((section, idx) => (
                  <div key={idx} className="space-y-4">
                     <h2 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-4">
                        <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-primary-600 text-xs">{idx + 1}</span>
                        {section.h}
                     </h2>
                     <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                        {section.p}
                     </p>
                  </div>
                ))}
             </div>

             <div className="pt-12 bg-slate-100 dark:bg-slate-900/50 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-800 text-center">
                <p className="text-sm font-bold text-slate-500 italic">Pour toute question juridique, contactez-nous à : <span className="text-primary-600">legal@locavision.fr</span></p>
             </div>
          </motion.div>
       </div>
    </div>
  );
};

export default Legal;
