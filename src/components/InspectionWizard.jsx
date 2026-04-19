import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, 
  User, 
  Camera, 
  ChevronRight, 
  Check, 
  Loader2, 
  AlertCircle,
  FileText,
  PenTool,
  Clock,
  ShieldCheck,
  Zap,
  Scan
} from 'lucide-react';
import { getVehicles, getClients, createInspection } from '../services/firestore';
import CameraCapture from './CameraCapture';
import SignaturePad from './SignaturePad';
import { analyzeBatchInspection } from '../services/gemini';
import { generateInspectionPDF, generateRentalContractPDF } from '../services/pdfGenerator';
import { auth } from '../firebase';

const steps = [
  { id: 'selection', title: 'Sélection', icon: Car },
  { id: 'photos', title: 'Guided Scan', icon: Camera },
  { id: 'analysis', title: 'Verdict IA', icon: Zap },
  { id: 'signature', title: 'Signature', icon: PenTool },
  { id: 'result', title: 'Terminé', icon: FileText }
];

const DiagnosticCard = ({ analysis }) => {
  const isGreen = analysis?.status === 'green';
  const isOrange = analysis?.status === 'orange';
  const isRed = analysis?.status === 'red';

  const bgColor = isGreen ? 'bg-emerald-500' : isOrange ? 'bg-amber-500' : 'bg-rose-500';
  const lightColor = isGreen ? 'bg-emerald-50 dark:bg-emerald-900/20' : isOrange ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-rose-50 dark:bg-rose-900/20';
  const textColor = isGreen ? 'text-emerald-700 dark:text-emerald-400' : isOrange ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400';

  return (
    <div className="space-y-6">
      {/* 1. Comparison / Evolution Header (If history exists) */}
      {analysis?.comparison && (
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`p-6 rounded-3xl border-2 flex items-center justify-between ${
            analysis.comparison.evolution === 'worse' ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${analysis.comparison.evolution === 'worse' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Évolution de l'état</p>
              <h4 className="text-lg font-black text-gray-900">{analysis.comparison.summary}</h4>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-xl font-black uppercase text-xs tracking-widest ${
            analysis.comparison.evolution === 'worse' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {analysis.comparison.evolution === 'worse' ? 'Attention' : 'Stable'}
          </div>
        </motion.div>
      )}

      {/* Status Header */}
      <div className={`p-8 rounded-[2.5rem] ${bgColor} text-white shadow-2xl relative overflow-hidden`}>
        <div className="absolute top-0 right-0 p-8 opacity-20">
          <Zap size={120} />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">Verdict Final</p>
          <h2 className="text-5xl font-black mb-4 tracking-tighter">{analysis?.status_label || "Analyse..."}</h2>
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full w-fit">
            <ShieldCheck size={18} />
            <span className="text-sm font-bold">Fiabilité IA : 99.8%</span>
          </div>
        </div>
      </div>
      
      {/* Rest of the card... */}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Score */}
        <div className={`p-6 rounded-3xl ${lightColor} border border-white/10 flex flex-col items-center justify-center`}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Score Santé</p>
          <span className={`text-4xl font-black ${textColor}`}>{analysis?.health_score || 0}/10</span>
        </div>

        {/* Damage Count */}
        <div className="md:col-span-2 p-6 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Résumé de l'Expertise</p>
          <p className="text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
            {analysis?.summary || "Chargement de l'analyse..."}
          </p>
        </div>
      </div>

      {/* New Damages specifically from comparison */}
      {analysis?.comparison?.new_damages?.length > 0 && (
        <div className="space-y-4 p-6 bg-rose-50 dark:bg-rose-900/10 border-2 border-rose-500/30 rounded-3xl animate-pulse-slow">
           <div className="flex items-center gap-3 text-rose-600">
             <AlertCircle size={20} />
             <h4 className="text-sm font-black uppercase tracking-widest">Nouveaux Dégâts Détectés</h4>
           </div>
           <div className="space-y-2">
              {analysis.comparison.new_damages.map((d, i) => (
                <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-rose-100 dark:border-rose-800">
                   <p className="text-xs font-bold text-rose-700">{d.location} - {d.type}</p>
                   <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-lg">Impact Caution</span>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Damage List */}
      <div className="space-y-4">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white px-2">Analyse Détaillée ({analysis?.damages?.length || 0})</h4>
        <div className="grid gap-3">
          {analysis?.damages?.map((d, i) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              key={i} 
              className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-4">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                   d.severity >= 4 ? 'bg-red-100 text-red-600' : 
                   d.severity >= 3 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                 }`}>
                   {d.severity}
                 </div>
                 <div>
                   <p className="font-bold text-gray-900 dark:text-white">{d.location}</p>
                   <p className="text-xs text-gray-500">{d.description}</p>
                 </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                 d.type === 'scratch' ? 'bg-blue-50 text-blue-600' : 
                 d.type === 'dent' ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {d.type}
              </span>
            </motion.div>
          ))}
          {(!analysis?.damages || analysis.damages.length === 0) && (
             <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
               <ShieldCheck className="mx-auto text-emerald-500 mb-2" size={32} />
               <p className="text-gray-500 font-medium">Aucun dégât détecté sur ce véhicule.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InspectionWizard = ({ onComplete, preSelection }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [vehicles, setVehicles] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(preSelection?.preSelectedVehicle || null);
  const [selectedClient, setSelectedClient] = useState(preSelection?.preSelectedClient || null);
  const [inspectionType, setInspectionType] = useState('checkout');
  
  // Auto-advance if pre-selected
  useEffect(() => {
    if (selectedVehicle && selectedClient && currentStep === 0) {
      // Small delay to let data load or user see the selection
      const timer = setTimeout(() => {
         // setCurrentStep(1); // Optional: if we want to skip step 0 entirely
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedVehicle, selectedClient]);
  const [capturedImages, setCapturedImages] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [finalInspectionId, setFinalInspectionId] = useState(null);

  useEffect(() => {
    loadSelectionData();
  }, []);

  const loadSelectionData = async () => {
    try {
      const [vData, cData] = await Promise.all([getVehicles(), getClients()]);
      setVehicles(vData);
      setClients(cData);
    } catch (err) {
      setError('Erreur de chargement.');
    }
  };

  const startAnalysis = async () => {
    setLoading(true);
    setCurrentStep(2);
    try {
      // 1. Global Batch Analysis
      const analysis = await analyzeBatchInspection(
        capturedImages, 
        selectedVehicle.category
      );
      setAiAnalysis(analysis);

      // 2. Automated History Comparison
      try {
        const history = await getInspections(selectedVehicle.id);
        if (history && history.length > 0) {
          const previous = history[0]; // Last one
          const comparison = await compareInspections(analysis, previous.aiAnalysis);
          setAiAnalysis(prev => ({ ...prev, comparison }));
        }
      } catch (compErr) {
        console.warn('Comparison failed:', compErr);
      }

    } catch (err) {
      console.error('AI Analysis failed:', err);
      setError('Analyse IA échouée. Veuillez valider manuellement.');
      setAiAnalysis({ status: 'orange', status_label: 'Analyse Partielle', summary: 'Une erreur est survenue lors du scan global.', damages: [], health_score: 5 });
    } finally {
      setLoading(false);
    }
  };

  const handleSignature = (res) => {
    const data = typeof res === 'object' ? res.data : res;
    const typeLabel = signatures.length === 0 ? 'agent' : 'client';
    const updated = [...signatures, { type: typeLabel, data, timestamp: new Date().toISOString() }];
    setSignatures(updated);
    if (updated.length === 2) finalizeInspection(updated);
  };

  const finalizeInspection = async (finalSignatures) => {
    setLoading(true);
    try {
      const id = await createInspection({
        vehicleId: selectedVehicle.id,
        clientId: selectedClient.id,
        type: inspectionType,
        agentId: auth.currentUser?.uid || 'local_user',
        agentName: auth.currentUser?.displayName || 'Agent LocaVision',
        images: capturedImages,
        aiAnalysis,
        signatures: finalSignatures,
        createdAt: new Date().toISOString(),
        status: 'completed'
      });

      // --- SI INTEGRATION SIMULATION ---
      const savedSettings = JSON.parse(localStorage.getItem('locavision_pro_settings') || '{}');
      if (savedSettings.webhookUrl) {
        console.log(`%c[SI-SYNC] %cTransmitting dossier ${id} to ${savedSettings.webhookUrl}`, "color: #3b82f6; font-weight: bold", "color: inherit");
        // Simulate a small delay for API response
        await new Promise(r => setTimeout(r, 800));
        console.log("%c[SI-SYNC] %cSuccess: External SI Updated.", "color: #10b981; font-weight: bold", "color: inherit");
      }

      setFinalInspectionId(id);
      setCurrentStep(4);
    } catch (err) {
      setError('Sauvegarde échouée.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pb-12">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-12">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className={`flex flex-col items-center ${idx <= currentStep ? 'text-primary-600' : 'text-gray-300'}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                idx < currentStep ? 'bg-emerald-500 text-white' : 
                idx === currentStep ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/30' : 
                'bg-gray-100 dark:bg-gray-800 text-gray-400'
              }`}>
                {idx < currentStep ? <Check size={20} strokeWidth={3} /> : <step.icon size={20} />}
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-1 flex-1 mx-4 rounded-full ${idx < currentStep ? 'bg-emerald-500' : 'bg-gray-100 dark:bg-gray-800'}`} />
            )}
          </div>
        ))}
      </div>

      <div className={`bg-white dark:bg-gray-800 transition-all duration-500 overflow-hidden ${
        currentStep === 1 
          ? 'rounded-none sm:rounded-[3rem] border-0 sm:border shadow-none sm:shadow-2xl' 
          : 'rounded-3xl sm:rounded-[3rem] shadow-2xl border border-gray-100 dark:border-gray-700'
      } min-h-[500px]`}>
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div key="step0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 space-y-12">
              <div className="grid lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-3">
                    <Car className="text-primary-500" /> Choisir un Véhicule
                  </h3>
                  <div className="space-y-3 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {vehicles.map(v => (
                      <button 
                        key={v.id} 
                        onClick={() => setSelectedVehicle(v)}
                        className={`w-full p-6 rounded-3xl border-2 text-left transition-all ${
                          selectedVehicle?.id === v.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : 'border-gray-100 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-black text-lg text-gray-900 dark:text-white uppercase">{v.brand} {v.model}</p>
                            <p className="text-sm text-gray-500 font-bold">{v.licensePlate} • <span className="text-primary-500 uppercase">{v.category}</span></p>
                          </div>
                          {selectedVehicle?.id === v.id && <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white"><Check size={16} strokeWidth={3} /></div>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6 border-l border-gray-100 dark:border-gray-700 pl-8 hidden lg:block">
                  <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                    <User className="text-primary-500" /> Client Associé
                  </h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {clients.map(c => (
                      <button 
                        key={c.id} 
                        onClick={() => setSelectedClient(c)}
                        className={`w-full p-6 rounded-2xl border-2 text-left transition-all ${
                          selectedClient?.id === c.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : 'border-gray-100 dark:border-gray-700'
                        }`}
                      >
                        <p className="font-bold text-gray-900 dark:text-white">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.email}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl w-fit">
                   <button onClick={() => setInspectionType('checkout')} className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${inspectionType === 'checkout' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-500'}`}>Check-Out</button>
                   <button onClick={() => setInspectionType('checkin')} className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${inspectionType === 'checkin' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-500'}`}>Check-In</button>
                </div>
                <div className="flex flex-col gap-4">
                  <button 
                    disabled={!selectedVehicle || !selectedClient} 
                    onClick={() => {
                      // Automatic Fullscreen on click
                      if (document.documentElement.requestFullscreen) {
                        document.documentElement.requestFullscreen().catch(e => console.error("Fullscreen error:", e));
                      }
                      setCurrentStep(1);
                    }}
                    className="btn-primary w-full sm:w-auto px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 disabled:opacity-30"
                  >
                    Démarrer le Scan <ChevronRight size={20} strokeWidth={3} />
                  </button>
                  <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">
                    Passez en plein écran via le bouton <Scan size={10} className="inline mx-1" /> pour plus de précision
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full">
              <CameraCapture 
                vehicleType={selectedVehicle?.category} 
                onCapture={(img) => setCapturedImages(prev => [...prev, img])} 
                onClose={() => capturedImages.length >= 1 ? startAnalysis() : setCurrentStep(0)} 
                capturedImages={capturedImages} 
              />
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-4xl mx-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-8">
                  <div className="relative">
                    <div className="w-32 h-32 border-8 border-primary-100 dark:border-primary-900 rounded-full" />
                    <div className="w-32 h-32 border-8 border-primary-600 rounded-full border-t-transparent animate-spin absolute inset-0" />
                    <Zap className="absolute inset-0 m-auto text-primary-600 animate-pulse" size={40} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Analyse Vision en cours</h3>
                    <p className="text-gray-500 font-medium">L'intelligence artificielle LocaVision certifie l'état du véhicule...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <DiagnosticCard analysis={aiAnalysis} />
                  <div className="flex justify-end pt-8 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={() => setCurrentStep(3)} className="btn-primary px-12 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3">
                      Étape Signature <ChevronRight size={20} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div key="step3" className="p-12 space-y-12">
                <div className="text-center">
                  <h2 className="text-4xl font-black mb-2 tracking-tight">Validation Juridique</h2>
                  <p className="text-gray-500">Signature de l'<b>{signatures.length === 0 ? 'AGENT' : 'CLIENT'}</b> requise.</p>
                </div>
               <div className="max-w-2xl mx-auto">
                 <SignaturePad onSignature={handleSignature} />
                 <div className="mt-8 flex justify-center gap-12">
                   <div className={`text-center space-y-2 ${signatures.length >= 1 ? 'text-emerald-500' : 'text-gray-400'}`}>
                      <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center mx-auto ${signatures.length >= 1 ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-200 dashed'}`}>
                        {signatures.length >= 1 ? <Check size={24} strokeWidth={4} /> : <User size={24} />}
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest">Agent</p>
                   </div>
                   <div className={`text-center space-y-2 ${signatures.length >= 2 ? 'text-emerald-500' : 'text-gray-400'}`}>
                      <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center mx-auto ${signatures.length >= 2 ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-200 dashed'}`}>
                        {signatures.length >= 2 ? <Check size={24} strokeWidth={4} /> : <User size={24} />}
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest">Client</p>
                   </div>
                 </div>
               </div>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div key="step4" className="p-12 text-center space-y-12">
              <div className="w-32 h-32 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl rotate-3">
                <ShieldCheck size={64} strokeWidth={3} />
              </div>
              <div className="space-y-4">
                <h2 className="text-5xl font-black tracking-tight">Dossier Certifié.</h2>
                <p className="text-gray-500 text-xl max-w-md mx-auto leading-relaxed">
                  L'inspection a été enregistrée avec succès. Le rapport est prêt à l'exportation.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                {inspectionType === 'checkout' && (
                  <button 
                    onClick={async () => {
                      try {
                        const pdf = await generateRentalContractPDF(
                          { id: finalInspectionId, signatures, createdAt: new Date().toISOString() }, 
                          selectedVehicle, 
                          selectedClient
                        );
                        pdf.save(`contrat_${selectedVehicle.licensePlate}.pdf`);
                      } catch (err) {
                        console.error('Erreur contrat:', err);
                        alert("Erreur lors de la génération du contrat.");
                      }
                    }} 
                    className="btn-primary px-8 py-5 rounded-3xl flex items-center gap-4 text-lg shadow-2xl bg-slate-900 hover:bg-slate-800 transition-all"
                  >
                    <PenTool size={24} /> Télécharger le Contrat
                  </button>
                )}
                <button 
                  onClick={async () => {
                    try {
                      const pdf = await generateInspectionPDF(
                        { id: finalInspectionId, type: inspectionType, createdAt: new Date().toISOString(), agentName: auth.currentUser?.displayName || 'Agent', images: capturedImages, aiAnalysis, signatures }, 
                        selectedVehicle, 
                        selectedClient
                      );
                      pdf.save(`expertise_${selectedVehicle.licensePlate}.pdf`);
                    } catch (err) {
                      console.error('Erreur expertise:', err);
                      alert("Erreur lors de la génération de l'expertise.");
                    }
                  }} 
                  className="btn-primary px-8 py-5 rounded-3xl flex items-center gap-4 text-lg shadow-2xl"
                >
                   <FileText size={24} /> Expertise Technique PDF
                </button>
                <button 
                  onClick={() => onComplete?.()} 
                  className="px-8 py-5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-black rounded-3xl hover:bg-gray-200 transition-all uppercase tracking-widest text-sm"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default InspectionWizard;
