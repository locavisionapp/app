import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, X, AlertTriangle, AlertCircle, CheckCircle2, XCircle, 
  ChevronRight, ChevronLeft, Camera, Upload, Info, Car, Zap, Droplets, 
  Gauge, Shield, FileText, ArrowLeft, Sparkles
} from 'lucide-react';

const VEHICLE_INSPECTION_PLANS = {
  berline: [
    { id: 'front_bumper', label: 'Pare-chocs avant', area: 'front' },
    { id: 'hood', label: 'Capot', area: 'front' },
    { id: 'left_front_door', label: 'Porte avant gauche', area: 'left' },
    { id: 'left_rear_door', label: 'Porte arrière gauche', area: 'left' },
    { id: 'left_front_fender', label: 'Aile avant gauche', area: 'left' },
    { id: 'left_rear_fender', label: 'Aile arrière gauche', area: 'left' },
    { id: 'rear_bumper', label: 'Pare-chocs arrière', area: 'rear' },
    { id: 'trunk', label: 'Coffre', area: 'rear' },
    { id: 'right_rear_door', label: 'Porte arrière droite', area: 'right' },
    { id: 'right_front_door', label: 'Porte avant droite', area: 'right' },
    { id: 'right_front_fender', label: 'Aile avant droite', area: 'right' },
    { id: 'right_rear_fender', label: 'Aile arrière droite', area: 'right' },
    { id: 'roof', label: 'Toit', area: 'top' },
    { id: 'front_windshield', label: 'Pare-brise avant', area: 'front' },
    { id: 'rear_windshield', label: 'Pare-brise arrière', area: 'rear' },
  ],
  moto: [
    { id: 'front_fender', label: 'Garde-boue avant', area: 'front' },
    { id: 'front_wheel', label: 'Roue avant', area: 'front' },
    { id: 'fuel_tank', label: 'Réservoir', area: 'center' },
    { id: 'seat', label: 'Selle', area: 'center' },
    { id: 'engine', label: 'Moteur', area: 'center' },
    { id: 'rear_wheel', label: 'Roue arrière', area: 'rear' },
    { id: 'rear_fender', label: 'Garde-boue arrière', area: 'rear' },
  ],
  default: [
    { id: 'front', label: 'Zone avant', area: 'front' },
    { id: 'left', label: 'Côté gauche', area: 'left' },
    { id: 'rear', label: 'Zone arrière', area: 'rear' },
    { id: 'right', label: 'Côté droit', area: 'right' },
  ],
};

const CRITICALITY_LEVELS = {
  none: { label: 'Aucun', color: 'bg-slate-100 text-slate-600', borderColor: 'border-slate-200', bgAccent: 'bg-slate-100' },
  low: { label: 'Faible', color: 'bg-emerald-100 text-emerald-700', borderColor: 'border-emerald-200', bgAccent: 'bg-emerald-50' },
  medium: { label: 'Moyenne', color: 'bg-amber-100 text-amber-700', borderColor: 'border-amber-200', bgAccent: 'bg-amber-50' },
  high: { label: 'Haute', color: 'bg-orange-100 text-orange-700', borderColor: 'border-orange-200', bgAccent: 'bg-orange-50' },
  critical: { label: 'Critique', color: 'bg-red-100 text-red-700', borderColor: 'border-red-200', bgAccent: 'bg-red-50' },
};

const VEHICLE_QUESTIONS = [
  { id: 'engine', label: 'État du moteur', icon: Zap },
  { id: 'brakes', label: 'État des freins', icon: Shield },
  { id: 'suspension', label: 'Suspension & amortisseurs', icon: Car },
  { id: 'fluids', label: 'Niveaux des fluides', icon: Droplets },
  { id: 'tires', label: 'État des pneus', icon: Car },
];

const VehicleInspectionWizard = ({ 
  vehicleType = 'default', 
  onComplete, 
  onCancel 
}) => {
  const [step, setStep] = useState('intro'); // 'intro' → 'health' → 'mileage' → 'inspection' → 'summary'
  const [healthAnswers, setHealthAnswers] = useState({});
  const [currentInspectionStep, setCurrentInspectionStep] = useState(0);
  const [inspectionData, setInspectionData] = useState({});
  const [mileage, setMileage] = useState('');
  const [documents, setDocuments] = useState([]);
  
  const plan = VEHICLE_INSPECTION_PLANS[vehicleType] || VEHICLE_INSPECTION_PLANS.default;
  const currentItem = plan[currentInspectionStep];

  const calculateHealthScore = () => {
    const total = Object.values(healthAnswers).length;
    const sum = Object.values(healthAnswers).reduce((a, b) => a + b, 0);
    return total > 0 ? Math.round((sum / (total * 3)) * 100) : 0;
  };

  const handleHealthAnswer = (id, value) => setHealthAnswers(p => ({ ...p, [id]: value }));

  const handleSetDamage = (itemId, criticality, notes = '', images = []) => {
    setInspectionData(prev => ({ ...prev, [itemId]: { criticality, notes, images } }));
  };

  const finalize = () => {
    const damagesArray = Object.entries(inspectionData)
      .filter(([_, data]) => data.criticality !== 'none')
      .map(([key, data]) => ({
        id: key,
        ...data,
        location: plan.find(p => p.id === key)?.label,
        createdAt: new Date()
      }));

    onComplete({
      mileage: parseInt(mileage),
      healthScore: calculateHealthScore(),
      healthAnswers,
      damages: damagesArray,
      documents,
      fullInspection: inspectionData,
      createdAt: new Date()
    });
  };

  const progress = 
    step === 'intro' ? 0 :
    step === 'health' ? 0.2 :
    step === 'mileage' ? 0.4 :
    step === 'inspection' ? 0.4 + ((currentInspectionStep + 1) / plan.length) * 0.5 :
    1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-slate-100 dark:from-slate-950 dark:via-primary-950/20 dark:to-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-12">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={onCancel} className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-full shadow-sm transition-all">
            <ArrowLeft size={24} className="text-slate-600 dark:text-slate-300" />
          </button>
          <div className="flex-1 mx-8">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                className="h-full bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 rounded-full"
              />
            </div>
          </div>
          <div className="w-10" />
        </div>

        {/* Content Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <AnimatePresence mode="wait">
            
            {/* INTRO STEP */}
            {step === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-10 sm:p-16 text-center"
              >
                <div className="w-32 h-32 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl">
                  <Sparkles size={64} className="text-primary-600" />
                </div>
                <h2 className="text-4xl sm:text-5xl font-black italic text-slate-900 dark:text-white tracking-tighter mb-4">
                  Inspection Complète
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg max-w-lg mx-auto mb-12 font-medium leading-relaxed">
                  Remplissez ce questionnaire pour évaluer l'état du véhicule. Ce processus prend environ 5 minutes.
                </p>
                <button
                  onClick={() => setStep('health')}
                  className="px-16 py-5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-primary-500/25 transition-all active:scale-95"
                >
                  Commencer l'inspection
                </button>
              </motion.div>
            )}

            {/* HEALTH QUESTIONNAIRE */}
            {step === 'health' && (
              <motion.div
                key="health"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                className="p-8 sm:p-12"
              >
                <div className="text-center mb-12">
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white italic mb-2">
                    Santé du Véhicule
                  </h3>
                  <p className="text-slate-500 font-medium">
                    Notez chaque point de 0 (très mauvais) à 3 (parfait)
                  </p>
                  <div className="mt-6 inline-flex items-center gap-3 bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-full">
                    <Gauge size={20} className="text-primary-600" />
                    <span className="text-xl font-black text-slate-900 dark:text-white">{calculateHealthScore()}/100</span>
                  </div>
                </div>
                <div className="grid gap-4 max-w-2xl mx-auto">
                  {VEHICLE_QUESTIONS.map(q => {
                    const Icon = q.icon;
                    return (
                      <div key={q.id} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                            <Icon size={24} className="text-primary-600" />
                          </div>
                          <span className="font-black text-slate-900 dark:text-white">{q.label}</span>
                        </div>
                        <div className="flex gap-3 justify-between">
                          {[0, 1, 2, 3].map(val => (
                            <button
                              key={val}
                              onClick={() => handleHealthAnswer(q.id, val)}
                              className={`
                                flex-1 py-4 rounded-xl font-black text-sm uppercase transition-all
                                ${healthAnswers[q.id] === val 
                                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25 scale-105'
                                  : 'bg-white dark:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-600 hover:scale-102'
                                }
                              `}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-center gap-4 mt-10">
                  <button onClick={() => setStep('intro')} className="px-8 py-4 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black uppercase text-xs tracking-widest">
                    Retour
                  </button>
                  <button 
                    onClick={() => setStep('mileage')} 
                    disabled={Object.keys(healthAnswers).length !== VEHICLE_QUESTIONS.length}
                    className="px-12 py-4 bg-primary-600 hover:bg-primary-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase text-xs tracking-widest"
                  >
                    Suivant
                  </button>
                </div>
              </motion.div>
            )}

            {/* MILEAGE STEP */}
            {step === 'mileage' && (
              <motion.div
                key="mileage"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="p-8 sm:p-16 text-center"
              >
                <div className="w-28 h-28 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl">
                  <Gauge size={56} className="text-emerald-600" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white italic mb-3">Kilométrage Actuel</h3>
                <p className="text-slate-500 font-medium mb-10">Saisissez le kilométrage au compteur</p>
                <div className="max-w-md mx-auto">
                  <input
                    type="number"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    placeholder="Ex: 145000"
                    className="w-full px-10 py-8 text-5xl font-black text-center bg-slate-50 dark:bg-slate-800 border-3 border-slate-200 dark:border-slate-700 rounded-[2rem] focus:border-primary-600 focus:ring-4 ring-primary-500/10 outline-none"
                  />
                </div>
                <div className="flex justify-center gap-4 mt-10">
                  <button onClick={() => setStep('health')} className="px-8 py-4 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black uppercase text-xs tracking-widest">
                    Retour
                  </button>
                  <button 
                    onClick={() => setStep('inspection')} 
                    disabled={!mileage.trim()}
                    className="px-12 py-4 bg-primary-600 hover:bg-primary-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase text-xs tracking-widest"
                  >
                    Continuer
                  </button>
                </div>
              </motion.div>
            )}

            {/* BODY INSPECTION STEP */}
            {step === 'inspection' && currentItem && (
              <motion.div
                key="inspection"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="p-8 sm:p-10"
              >
                <div className="text-center mb-8">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-3">
                    Inspection Carrosserie {currentInspectionStep + 1}/{plan.length}
                  </p>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white italic">{currentItem.label}</h3>
                </div>

                {/* Visual Car Area Indicator (simplified) */}
                <div className="flex justify-center mb-8">
                  <div className="w-48 h-48 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-[3rem] flex items-center justify-center border border-slate-300 dark:border-slate-600 shadow-inner">
                    <Car size={80} className="text-slate-400" />
                  </div>
                </div>

                {/* Criticality Selection */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8 max-w-3xl mx-auto">
                  {Object.entries(CRITICALITY_LEVELS).map(([key, level]) => (
                    <button
                      key={key}
                      onClick={() => handleSetDamage(currentItem.id, key)}
                      className={`
                        p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 shadow-sm
                        ${level.borderColor} ${level.color}
                        ${inspectionData[currentItem.id]?.criticality === key
                          ? 'ring-4 ring-primary-500/30 scale-105 shadow-xl border-transparent'
                          : 'hover:scale-102 hover:shadow-md opacity-90 hover:opacity-100'
                        }
                      `}
                    >
                      {key === 'none' && <CheckCircle2 size={32} />}
                      {key === 'low' && <Check size={32} />}
                      {key === 'medium' && <AlertTriangle size={32} />}
                      {key === 'high' && <AlertCircle size={32} />}
                      {key === 'critical' && <XCircle size={32} />}
                      <span className="text-sm font-black uppercase tracking-wide">{level.label}</span>
                    </button>
                  ))}
                </div>

                {/* Notes & Photos */}
                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-3xl mx-auto">
                  <div className="mb-4">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Notes (optionnel)</label>
                    <textarea
                      value={inspectionData[currentItem.id]?.notes || ''}
                      onChange={(e) => handleSetDamage(
                        currentItem.id,
                        inspectionData[currentItem.id]?.criticality || 'none',
                        e.target.value
                      )}
                      placeholder="Ajoutez une description précise..."
                      className="w-full p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 ring-primary-500/10 font-medium text-base"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="py-4 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-xl font-black text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2">
                      <Upload size={18} /> Ajouter un fichier
                    </button>
                    <button className="py-4 bg-gradient-to-r from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-primary-800/30 rounded-xl font-black text-xs uppercase tracking-widest text-primary-700 dark:text-primary-300 flex items-center justify-center gap-2">
                      <Camera size={18} /> Prendre une photo
                    </button>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-8 max-w-3xl mx-auto">
                  <button onClick={() => currentInspectionStep > 0 ? setCurrentInspectionStep(p => p - 1) : setStep('mileage')} className="px-6 py-4 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                    <ChevronLeft size={20} /> Retour
                  </button>
                  <div className="flex gap-3">
                    <button onClick={() => {
                      const newData = {};
                      plan.forEach(p => newData[p.id] = { criticality: 'none', notes: '', images: [] });
                      setInspectionData(newData);
                    }} className="px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-black text-xs uppercase tracking-widest text-slate-600">
                      Aucun dommage
                    </button>
                  </div>
                  <button onClick={() => {
                    if (currentInspectionStep < plan.length - 1) setCurrentInspectionStep(p => p + 1);
                    else setStep('summary');
                  }} className="px-10 py-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2">
                    {currentInspectionStep < plan.length - 1 ? 'Suivant' : 'Voir résumé'}
                    {currentInspectionStep < plan.length - 1 && <ChevronRight size={20} />}
                  </button>
                </div>
              </motion.div>
            )}

            {/* SUMMARY STEP */}
            {step === 'summary' && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                className="p-8 sm:p-12"
              >
                <div className="text-center mb-10">
                  <h3 className="text-4xl font-black italic text-slate-900 dark:text-white mb-4">
                    Résumé Final
                  </h3>
                  <div className="inline-flex items-center gap-4 px-8 py-4 bg-gradient-to-r from-emerald-50 to-slate-50 dark:from-emerald-900/20 dark:to-slate-800 rounded-2xl border border-emerald-200 dark:border-emerald-800/30">
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Santé</p>
                      <p className="text-3xl font-black text-emerald-600">{calculateHealthScore()}/100</p>
                    </div>
                    <div className="h-12 w-px bg-slate-200 dark:bg-slate-700" />
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Kilométrage</p>
                      <p className="text-3xl font-black text-primary-600">{mileage} km</p>
                    </div>
                  </div>
                </div>

                <div className="max-h-[40vh] overflow-y-auto custom-scrollbar mb-8">
                  <div className="space-y-4">
                    {plan.map((item) => {
                      const data = inspectionData[item.id];
                      const level = CRITICALITY_LEVELS[data?.criticality || 'none'];
                      return (
                        <div
                          key={item.id}
                          className={`
                            p-6 rounded-2xl border-2 flex items-center justify-between
                            ${level.bgAccent} ${level.borderColor}
                          `}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm">
                              {data?.criticality === 'none' ? (
                                <CheckCircle2 size={24} className="text-emerald-600" />
                              ) : data?.criticality === 'low' ? (
                                <Check size={24} className="text-emerald-600" />
                              ) : data?.criticality === 'medium' ? (
                                <AlertTriangle size={24} className="text-amber-600" />
                              ) : data?.criticality === 'high' ? (
                                <AlertCircle size={24} className="text-orange-600" />
                              ) : (
                                <XCircle size={24} className="text-red-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-black text-lg text-slate-900 dark:text-white">{item.label}</p>
                              <p className={`text-xs font-black uppercase tracking-widest ${level.color}`}>
                                {level.label}
                              </p>
                            </div>
                          </div>
                          {data?.notes && (
                            <p className="text-sm text-slate-500 max-w-xs truncate">{data.notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Document Upload */}
                <div className="mb-10 bg-slate-50 dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <FileText size={20} className="text-primary-600" />
                    Documents du véhicule
                  </h4>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button className="py-4 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/30 rounded-xl font-black text-xs uppercase tracking-widest text-primary-700 dark:text-primary-300 flex items-center justify-center gap-2">
                      <Upload size={18} /> Ajouter des documents
                    </button>
                    <button className="py-4 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-xl font-black text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2">
                      <Camera size={18} /> Prendre des photos
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
                  <button onClick={() => setStep('inspection')} className="px-8 py-4 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black uppercase text-xs tracking-widest">
                    Modifier
                  </button>
                  <button onClick={finalize} className="px-14 py-5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-emerald-500/25 transition-all active:scale-95 flex items-center gap-3">
                    Valider & Enregistrer
                    <Check size={20} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default VehicleInspectionWizard;
