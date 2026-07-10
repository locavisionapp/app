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
  const streamRef = useRef(null); // Ref pour éviter les closures stale
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });

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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setIsCameraReady(false);
    setCameraError(null);

    // Stop toute stream existante avant de commencer
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Votre navigateur ne supporte pas l'accès à la caméra ou la connexion n'est pas sécurisée (HTTPS requis).");
      return;
    }

    // Contraintes progressives
    const FAST_CONSTRAINTS = [
      // 1er essai : Caméra arrière (idéale) + Résolution standard
      { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
      // 2e essai : Caméra arrière uniquement (sans contrainte de résolution)
      { video: { facingMode: 'environment' } },
      // 3e essai : N'importe quelle caméra disponible
      { video: true },
    ];

    for (const constraints of FAST_CONSTRAINTS) {
      let mediaStream = null;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

        // Si le composant s'est démonté entre temps
        if (!videoRef.current) {
          mediaStream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = mediaStream;
        videoRef.current.srcObject = mediaStream;

        // Attendre que la vidéo soit prête avec un mécanisme de nettoyage en cas de timeout
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('timeout'));
          }, 4000); // 4 secondes suffisent largement

          videoRef.current.onloadedmetadata = () => {
            clearTimeout(timeout);
            videoRef.current.play()
              .then(resolve)
              .catch(reject);
          };

          videoRef.current.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('video_error'));
          };
        });

        // Si on arrive ici, le flux fonctionne !
        setIsCameraReady(true);
        return;

      } catch (err) {
        console.warn('[Camera] Tentative échouée:', constraints, err.name || err);

        // CRUCIAL : Si cette tentative a ouvert un flux mais a planté après (ex: timeout play/metadata),
        // il FAUT couper les pistes avant de tenter le jeu de contraintes suivant.
        if (mediaStream) {
          mediaStream.getTracks().forEach(t => t.stop());
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        streamRef.current = null;

        // La boucle continue vers le prochain jeu de contraintes
      }
    }

    // Tous les essais ont échoué
    setCameraError("Impossible d'accéder à la caméra. Vérifiez les permissions ou connectez une webcam.");
  }, [stopCamera]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []); // Seulement au montage

  const allPointsCaptured = capturedImages.length >= points.length;
  const currentCapture = capturedImages.find(img => img.id === currentPoint.id);
  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    setIsValidated(false);
  }, [currentPointIndex]);

  const capturePhoto = async () => {
    if (!videoRef.current || isProcessing || !isCameraReady) return;
    setIsProcessing(true);
    setValidationError(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.9);

      if (vehicleType === 'plaque') {
        onCapture({
          id: currentPoint.id,
          name: currentPoint.name,
          image: imageData,
          timestamp: new Date().toISOString()
        });
        stopCamera();
        setTimeout(() => onClose(), 300);
        return;
      }

      const result = await validateCapture(imageData, currentPoint.name, vehicleType);

      if (result.valid) {
        onCapture({
          id: currentPoint.id,
          name: currentPoint.name,
          image: imageData,
          timestamp: new Date().toISOString()
        });
        setIsValidated(true);

        if (points.length === 1) {
          setTimeout(() => onClose(), 500);
        }
      } else {
        setValidationError((result.reason || 'Photo invalide') + (result.instruction ? ` — ${result.instruction}` : " Recommencez."));
      }
    } catch (err) {
      console.error('Capture error:', err);
      if (vehicleType !== 'plaque') {
        setValidationError("Service IA indisponible. Réessayez ou continuez.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] h-[100dvh] w-screen text-white font-sans overflow-hidden flex flex-col">

      {/* ── Écran de chargement caméra ── */}
      <AnimatePresence>
        {!isCameraReady && !cameraError && (
          <motion.div
            key="cam-loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center gap-6"
          >
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full border-4 border-white/10" />
              <div className="absolute inset-0 rounded-full border-4 border-t-blue-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              <div className="absolute inset-3 rounded-full border-2 border-t-transparent border-white/20 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              <Camera size={24} className="absolute inset-0 m-auto text-blue-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-black uppercase tracking-[0.3em] text-white animate-pulse">Activation caméra...</p>
              <p className="text-[10px] text-white/40 font-medium">Veuillez autoriser l'accès</p>
            </div>
            <button onClick={() => { stopCamera(); onClose(); }} className="mt-6 px-6 py-3 border border-white/20 rounded-2xl text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white hover:border-white/40 transition-all">
              Annuler
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Écran d'erreur caméra ── */}
      <AnimatePresence>
        {cameraError && (
          <motion.div
            key="cam-error"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center gap-6 p-8"
          >
            <div className="w-20 h-20 bg-rose-600/20 border border-rose-500/30 rounded-[2rem] flex items-center justify-center">
              <AlertCircle size={36} className="text-rose-400" />
            </div>
            <div className="text-center space-y-2 max-w-xs">
              <p className="text-sm font-black uppercase tracking-widest text-rose-400">Caméra inaccessible</p>
              <p className="text-xs text-white/60 font-medium leading-relaxed">{cameraError}</p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={startCamera}
                className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <RefreshCw size={16} /> Réessayer
              </button>
              <button onClick={() => { stopCamera(); onClose(); }} className="w-full py-4 border border-white/20 rounded-2xl text-xs font-bold uppercase tracking-widest text-white/60">
                Fermer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1. Viewfinder ── */}
      <div className="absolute inset-0 z-0">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

        {/* Guide de cadrage plaque — rectangle format plaque SIV */}
        {vehicleType === 'plaque' && isCameraReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-black/45" />
            <div className="relative z-10 w-[78%] max-w-[340px]" style={{ aspectRatio: '4.5/1' }}>
              <div className="absolute inset-0 border-2 border-white/80 rounded-lg" />
              <div className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-blue-400 rounded-tl-md" />
              <div className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-blue-400 rounded-tr-md" />
              <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-blue-400 rounded-bl-md" />
              <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-blue-400 rounded-br-md" />
              <motion.div
                className="absolute left-2 right-2 h-px bg-blue-400/50"
                animate={{ top: ['15%', '85%', '15%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <p className="absolute text-center text-[11px] font-bold uppercase tracking-widest text-white/60"
              style={{ top: 'calc(50% + 3.5rem)' }}>
              Centrez la plaque dans le cadre
            </p>
          </div>
        )}

        {/* Cadre générique pour les autres modes */}
        {vehicleType !== 'plaque' && (
          <div className="absolute inset-x-[10%] inset-y-[20%] border border-white/10 rounded-[2rem] pointer-events-none" />
        )}
      </div>

      {/* ── 2. Barre du haut ── */}
      <div className="relative z-20 bg-black/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/10">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Scanner LocaVision</span>
          <h2 className="text-sm font-bold truncate">
            Étape {currentPointIndex + 1}/{points.length} : {currentPoint.name}
          </h2>
        </div>
        <button onClick={() => { stopCamera(); onClose(); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* ── 3. HUD central (erreur / processing) ── */}
      <div className="flex-1 relative z-10 flex flex-col items-center justify-center pointer-events-none p-6">
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black/70 backdrop-blur-xl px-10 py-8 rounded-[2.5rem] text-center border border-white/20 shadow-2xl"
            >
              <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-black uppercase tracking-widest animate-pulse">
                {vehicleType === 'plaque' ? 'Capture en cours...' : 'Analyse IA...'}
              </p>
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

      {/* ── 4. Footer avec bouton capture ── */}
      <div className="relative z-20 p-8 pb-12 bg-gradient-to-t from-black via-black/60 to-transparent">
        <div className="max-w-xs mx-auto flex flex-col items-center gap-6">
          <AnimatePresence mode="wait">
            {isValidated ? (
              <motion.button
                key="continue"
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                onClick={() => {
                  if (allPointsCaptured) { onClose(); }
                  else { setCurrentPointIndex(prev => prev + 1); }
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
                disabled={isProcessing || !isCameraReady}
                className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-8 border-white/20 shadow-2xl active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isCameraReady
                  ? <div className="w-5 h-5 bg-black rounded-full" />
                  : <div className="w-5 h-5 border-[3px] border-black border-t-transparent rounded-full animate-spin" />
                }
              </motion.button>
            )}
          </AnimatePresence>

          {!isValidated && isCameraReady && (
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest text-center">
              {vehicleType === 'plaque'
                ? 'Appuyez pour capturer la plaque'
                : 'Positionnez le véhicule dans le cadre'}
            </p>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
