import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  X, 
  Check, 
  AlertCircle, 
  ChevronRight, 
  Info, 
  Layers, 
  Zap, 
  Maximize2,
  RefreshCw,
  Compass
} from 'lucide-react';
import { validateCapture } from '../services/gemini';

const GUIDES = {
  voiture: [
    { id: 'front', name: 'Avant', instruction: 'Face avant complète' },
    { id: 'front-left', name: 'Avant Gauche', instruction: 'Angle 45° conducteur' },
    { id: 'left', name: 'Côté Gauche', instruction: 'Profil complet gauche' },
    { id: 'rear-left', name: 'Arrière Gauche', instruction: 'Angle 45° coffre conducteur' },
    { id: 'rear', name: 'Arrière', instruction: 'Face arrière complète' },
    { id: 'rear-right', name: 'Arrière Droit', instruction: 'Angle 45° coffre passager' },
    { id: 'right', name: 'Côté Droit', instruction: 'Profil complet droit' },
    { id: 'front-right', name: 'Avant Droit', instruction: 'Angle 45° avant passager' }
  ],
  moto: [
    { id: 'front', name: 'Avant', instruction: 'Face avant et optique' },
    { id: 'left', name: 'Côté Gauche', instruction: 'Transmission et flanc gauche' },
    { id: 'rear', name: 'Arrière', instruction: 'Plaque et feu arrière' },
    { id: 'right', name: 'Côté Droit', instruction: 'Échappement et flanc droit' },
    { id: 'dashboard', name: 'Tableau de bord', instruction: 'Compteur et guidon' }
  ],
  camion: [
    { id: 'front', name: 'Cabine', instruction: 'Face avant calandre' },
    { id: 'left-cab', name: 'Cabine Gauche', instruction: 'Portière et accès' },
    { id: 'left-body', name: 'Côté Gauche', instruction: 'Châssis et remorque' },
    { id: 'rear', name: 'Arrière', instruction: 'Pont et portes' },
    { id: 'right-body', name: 'Côté Droit', instruction: 'Châssis et remorque' },
    { id: 'right-cab', name: 'Cabine Droite', instruction: 'Portière passager' }
  ],
  btp: [
    { id: 'front', name: 'Outil', instruction: 'Outil/Godet avant' },
    { id: 'cab', name: 'Commandes', instruction: 'Poste de conduite' },
    { id: 'engine', name: 'Moteur', instruction: 'Capotage et arrière' },
    { id: 'hydraulics-l', name: 'Hydraulique G', instruction: 'Vérins gauches' },
    { id: 'hydraulics-r', name: 'Hydraulique D', instruction: 'Vérins droits' }
  ],
  plaque: [
    { id: 'plate', name: 'Plaque d\'Immatriculation', instruction: 'Cadrez la plaque de face, bien centrée' }
  ]
};

const CameraCapture = ({ 
  vehicleType = 'voiture', 
  onCapture, 
  onClose,
  capturedImages = [] 
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [flashOn, setFlashOn] = useState(false);
  
  const category = GUIDES[vehicleType] ? vehicleType : 'voiture';
  const points = GUIDES[category];
  const currentPoint = points[currentPointIndex];

  // Gyroscope tracking for Level
  useEffect(() => {
    const handleOrientation = (e) => {
      setOrientation({
        alpha: Math.round(e.alpha || 0),
        beta: Math.round(e.beta || 0),
        gamma: Math.round(e.gamma || 0)
      });
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }

      const constraints = {
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => console.error("Play error:", e));
        };
        setStream(mediaStream);
      }
    } catch (err) {
      console.error('Camera error:', err);
      // Fallback to any camera if environment ideal fails
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch(e => console.error("Fallback play error:", e));
          setStream(fallbackStream);
        }
      } catch (innerErr) {
        setValidationError("Impossible d'accéder à la caméra.");
      }
    }
  }, [stream]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []); // Only on mount


  const allPointsCaptured = capturedImages.length >= points.length;
  const currentCapture = capturedImages.find(img => img.id === currentPoint.id);
  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    setIsValidated(false);
  }, [currentPointIndex]);

  const capturePhoto = async () => {
    if (!videoRef.current || isProcessing) return;
    setIsProcessing(true);
    setValidationError(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      const result = await validateCapture(imageData, currentPoint.name, vehicleType);
      
      if (result.valid) {
        onCapture({
          id: currentPoint.id,
          name: currentPoint.name,
          image: imageData,
          timestamp: new Date().toISOString()
        });
        setIsValidated(true);
        
        // Final action for single mode
        if (points.length === 1) {
           setTimeout(() => onClose(), 500); 
        }
      } else {
        setValidationError(result.reason + ": " + (result.instruction || "Recommencez."));
      }
    } catch (err) {
      setValidationError("Erreur IA.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] h-[100dvh] w-screen text-white font-sans overflow-hidden flex flex-col">
      
      {/* 1. Viewfinder (Deep Background) */}
      <div className="absolute inset-0 z-0">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover" 
        />
        <div className="absolute inset-x-[10%] inset-y-[20%] border border-white/10 rounded-[2rem] pointer-events-none" />
      </div>

      {/* 2. Top Banner (Status & Step) */}
      <div className="relative z-20 bg-black/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/10">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary-500">Banc d'Expertise v3</span>
          <h2 className="text-sm font-bold truncate">Étape {currentPointIndex + 1}/{points.length} : {currentPoint.name}</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* 3. Center HUD (Error/Processing) */}
      <div className="flex-1 relative z-10 flex flex-col items-center justify-center pointer-events-none p-6">
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div 
              key="processing"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black/60 backdrop-blur-xl px-10 py-8 rounded-[2.5rem] text-center border border-white/20 shadow-2xl"
            >
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-black uppercase tracking-widest animate-pulse">Scan IA en cours...</p>
            </motion.div>
          ) : validationError ? (
            <motion.div 
              key="error"
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} 
              className="bg-rose-600/90 backdrop-blur-xl p-6 rounded-3xl flex items-center gap-4 border border-white/20 shadow-2xl pointer-events-auto max-w-sm"
            >
              <AlertCircle size={24} className="shrink-0" />
              <div>
                <p className="font-black uppercase text-[10px] tracking-widest opacity-80 mb-1">Qualité insuffisante</p>
                <p className="text-sm font-bold leading-tight">{validationError}</p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* 4. Minimal Footer (One Large Button) */}
      <div className="relative z-20 p-8 pb-12 bg-gradient-to-t from-black via-black/40 to-transparent">
        <div className="max-w-xs mx-auto flex flex-col items-center gap-6">
          
          <AnimatePresence mode="wait">
            {isValidated ? (
              <motion.button
                key="continue"
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                onClick={() => {
                  if (allPointsCaptured) {
                    onClose();
                  } else {
                    setCurrentPointIndex(prev => prev + 1);
                  }
                }}
                className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-white font-black uppercase tracking-[0.2em] rounded-3xl shadow-[0_20px_50px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                {allPointsCaptured ? 'Terminer le Scan' : 'Continuer'}
                <ChevronRight size={20} />
              </motion.button>
            ) : (
              <motion.button
                key="capture"
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                onClick={capturePhoto}
                disabled={isProcessing}
                className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-8 border-white/20 shadow-2xl active:scale-95 transition-all disabled:opacity-30"
              >
                <div className="w-4 h-4 bg-black rounded-full" />
              </motion.button>
            )}
          </AnimatePresence>

          {!isValidated && (
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest text-center">
              Positionnez le véhicule dans le cadre
            </p>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
