import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, 
  User, 
  Camera, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Loader2, 
  AlertCircle,
  FileText,
  PenTool
} from 'lucide-react';
import InteractiveModel from './InteractiveModel';
import { getVehicles, getClients, createInspection } from '../services/firestore';
import CameraCapture from './CameraCapture';
import SignaturePad from './SignaturePad';
import DamageHeatmap from './DamageHeatmap';
import { analyzeVehicleImage } from '../services/gemini';
import { generateInspectionPDF } from '../services/pdfGenerator';
import { auth } from '../firebase';

const steps = [
  { id: 'selection', title: 'Sélection', icon: Car },
  { id: 'photos', title: 'Photos', icon: Camera },
  { id: 'analysis', title: 'Analyse IA', icon: AlertCircle },
  { id: 'signature', title: 'Signature', icon: PenTool },
  { id: 'result', title: 'Rapport', icon: FileText }
];

const InspectionWizard = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Data State
  const [vehicles, setVehicles] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [inspectionType, setInspectionType] = useState('checkout'); // checkout or checkin
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
      console.error('Error loading data:', err);
      setError('Impossible de charger les données de sélection.');
    }
  };

  const handleCapture = (photoData) => {
    setCapturedImages(prev => [...prev, photoData]);
  };

  const startAnalysis = async () => {
    setLoading(true);
    setCurrentStep(2);
    try {
      // Analyze the first image (front) for now to get a general idea
      // In a real app, we might analyze all and merge, or specific damage shots
      // For the MVP, let's analyze a few key angles
      const frontImage = capturedImages.find(img => img.id === 'front');
      const analysis = await analyzeVehicleImage(
        frontImage.image.split(',')[1], 
        selectedVehicle.category
      );
      setAiAnalysis(analysis);
    } catch (err) {
      console.error('AI Analysis failed:', err);
      setError('L\'analyse IA a échoué. Vous pouvez continuer manuellement.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignature = (signatureResult) => {
    // SignaturePad returns an object { data, timestamp, type }
    const signatureData = typeof signatureResult === 'object' ? signatureResult.data : signatureResult;
    
    const newSignature = {
      type: signatures.length === 0 ? 'agent' : 'client',
      data: signatureData,
      timestamp: new Date().toISOString()
    };
    const updatedSignatures = [...signatures, newSignature];
    setSignatures(updatedSignatures);
    
    if (updatedSignatures.length === 2) {
      finalizeInspection(updatedSignatures);
    }
  };

  const finalizeInspection = async (finalSignatures) => {
    setLoading(true);
    try {
      const inspectionData = {
        vehicleId: selectedVehicle.id,
        clientId: selectedClient.id,
        type: inspectionType,
        agentId: auth.currentUser.uid,
        agentName: auth.currentUser.displayName || auth.currentUser.email,
        images: capturedImages,
        aiAnalysis: aiAnalysis,
        signatures: finalSignatures,
        createdAt: new Date().toISOString(),
        status: 'completed'
      };

      const id = await createInspection(inspectionData);
      setFinalInspectionId(id);
      setCurrentStep(4);
    } catch (err) {
      console.error('Finalize failed:', err);
      setError('Erreur lors de la sauvegarde de l\'inspection.');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    try {
      const inspectionData = {
        id: finalInspectionId,
        type: inspectionType,
        createdAt: new Date().toISOString(),
        agentName: auth.currentUser.displayName || auth.currentUser.email,
        images: capturedImages,
        aiAnalysis: aiAnalysis,
        signatures: signatures
      };
      const pdf = await generateInspectionPDF(inspectionData, selectedVehicle, selectedClient);
      pdf.save(`inspection_${selectedVehicle.licensePlate}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className={`flex flex-col items-center ${index <= currentStep ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all ${
                index < currentStep ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 
                index === currentStep ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 
                'bg-gray-100 dark:bg-gray-700 text-gray-400'
              }`}>
                {index < currentStep ? <Check size={20} /> : <step.icon size={20} />}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">{step.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-4 rounded-full ${index < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden min-h-[500px] border border-gray-100 dark:border-gray-700">
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 space-y-8"
            >
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-4">
                  <label className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Car className="text-primary-500" size={24} />
                    Véhicule
                  </label>
                  <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {vehicles.map(v => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVehicle(v)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                          selectedVehicle?.id === v.id 
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                            : 'border-gray-100 dark:border-gray-700 hover:border-primary-200'
                        }`}
                      >
                        <p className="font-bold text-gray-900 dark:text-white">{v.brand} {v.model}</p>
                        <p className="text-sm text-gray-500">{v.licensePlate} • {v.category}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800">
                  {selectedVehicle ? (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-full max-w-[250px]"
                    >
                      <InteractiveModel 
                        vehicleType={selectedVehicle.category}
                        view="front"
                      />
                      <div className="mt-4 text-center">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedVehicle.brand} {selectedVehicle.model}</p>
                        <span className="inline-block px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-600 text-[10px] font-black uppercase rounded-full mt-1">
                          Prêt pour inspection
                        </span>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-300">
                        <Car size={32} />
                      </div>
                      <p className="text-sm text-gray-400">Veuillez sélectionner un véhicule pour continuer</p>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-4">
                  <label className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="text-primary-500" size={24} />
                    Client
                  </label>
                  <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {clients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedClient(c)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                          selectedClient?.id === c.id 
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                            : 'border-gray-100 dark:border-gray-700 hover:border-primary-200'
                        }`}
                      >
                        <p className="font-bold text-gray-900 dark:text-white">{c.name}</p>
                        <p className="text-sm text-gray-500">{c.email}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex gap-4">
                    <button
                      onClick={() => setInspectionType('checkout')}
                      className={`px-6 py-2 rounded-xl font-bold transition-all ${
                        inspectionType === 'checkout' 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                      }`}
                    >
                      Check-out (Départ)
                    </button>
                    <button
                      onClick={() => setInspectionType('checkin')}
                      className={`px-6 py-2 rounded-xl font-bold transition-all ${
                        inspectionType === 'checkin' 
                          ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                      }`}
                    >
                      Check-in (Retour)
                    </button>
                  </div>
                  <button
                    disabled={!selectedVehicle || !selectedClient}
                    onClick={() => setCurrentStep(1)}
                    className="btn-primary px-8 py-3 rounded-xl disabled:opacity-50 flex items-center gap-2"
                  >
                    <span>Continuer vers les photos</span>
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="photos"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-[600px]"
            >
              <CameraCapture
                vehicleType={selectedVehicle?.category}
                onCapture={handleCapture}
                onClose={() => capturedImages.length === 8 ? startAnalysis() : setCurrentStep(0)}
                capturedImages={capturedImages}
              />
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analyse Vision IA par Gemini</h2>
                <p className="text-gray-500">Détection automatique des dommages détectés sur les photos.</p>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-primary-100 dark:border-primary-900 rounded-full" />
                    <div className="w-20 h-20 border-4 border-primary-600 rounded-full border-t-transparent animate-spin absolute inset-0" />
                  </div>
                  <p className="text-primary-600 font-bold animate-pulse">L'IA de LocaVision analyse vos photos...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <DamageHeatmap damages={aiAnalysis?.damages || []} vehicleType={selectedVehicle?.category} />
                  <div className="flex justify-end">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="btn-primary px-8 py-3 rounded-xl flex items-center gap-2"
                    >
                      <span>Valider et Signer</span>
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="signature"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 space-y-8"
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Validation du contrat</h2>
                <p className="text-gray-500">Signature électronique de l'{signatures.length === 0 ? "agent" : "client"}.</p>
              </div>

              <div className="max-w-2xl mx-auto bg-gray-50 dark:bg-gray-900 p-6 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <SignaturePad onSignature={handleSignature} />
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500">
                <div className={`flex items-center gap-2 ${signatures.length >= 1 ? 'text-green-500' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${signatures.length >= 1 ? 'bg-green-500 text-white border-green-500' : 'border-gray-300'}`}>
                    {signatures.length >= 1 ? <Check size={16} /> : "1"}
                  </div>
                  <span>Signature Agent</span>
                </div>
                <div className={`flex items-center gap-2 ${signatures.length >= 2 ? 'text-green-500' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${signatures.length >= 2 ? 'bg-green-500 text-white border-green-500' : 'border-gray-300'}`}>
                    {signatures.length >= 2 ? <Check size={16} /> : "2"}
                  </div>
                  <span>Signature Client</span>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-12 text-center space-y-8"
            >
              <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-xl">
                <Check size={48} strokeWidth={3} />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-gray-900 dark:text-white">Inspection Terminée !</h2>
                <p className="text-xl text-gray-500 max-w-md mx-auto">
                  Le rapport a été généré et les données ont été synchronisées sur le Cloud.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={downloadReport}
                  className="w-full sm:w-auto btn-primary px-8 py-4 rounded-2xl flex items-center justify-center gap-2 text-lg shadow-xl shadow-primary-500/20"
                >
                  <FileText size={24} />
                  <span>Télécharger le Rapport PDF</span>
                </button>
                <button
                  onClick={() => onComplete?.()}
                  className="w-full sm:w-auto px-8 py-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold rounded-2xl hover:bg-gray-200 transition-colors text-lg"
                >
                  Retour au Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
    </div>
  );
};

export default InspectionWizard;
