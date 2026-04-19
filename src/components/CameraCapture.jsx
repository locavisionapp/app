import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Check, AlertCircle } from 'lucide-react';
import InteractiveModel from './InteractiveModel';
const INSPECTION_POINTS = [
  { id: 'front', name: 'Avant', angle: 0 },
  { id: 'front-left', name: 'Avant Gauche', angle: 45 },
  { id: 'left', name: 'Gauche', angle: 90 },
  { id: 'rear-left', name: 'Arrière Gauche', angle: 135 },
  { id: 'rear', name: 'Arrière', angle: 180 },
  { id: 'rear-right', name: 'Arrière Droit', angle: 225 },
  { id: 'right', name: 'Droit', angle: 270 },
  { id: 'front-right', name: 'Avant Droit', angle: 315 }
];

const VehicleGuide = ({ vehicleType, currentPoint }) => {
  // Map INSPECTION_POINTS ids to InteractiveModel part ids
  const partMap = {
    'front': 'front',
    'front-left': 'left',
    'left': 'left',
    'rear-left': 'left',
    'rear': 'rear',
    'rear-right': 'right',
    'right': 'right',
    'front-right': 'right'
  };

  const viewMap = {
    'front': 'front',
    'front-left': 'front',
    'left': 'front',
    'rear-left': 'rear',
    'rear': 'rear',
    'rear-right': 'rear',
    'right': 'rear',
    'front-right': 'front'
  };

  return (
    <div className="absolute bottom-24 right-4 w-32 h-32 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-2 z-20 pointer-events-none">
      <InteractiveModel 
        vehicleType={vehicleType}
        view={viewMap[currentPoint.id] || 'front'}
        hoveredPart={partMap[currentPoint.id]}
        damages={[{ partId: partMap[currentPoint.id], severity: 3 }]} // Highlight target zone
      />
      <div className="absolute -top-8 left-0 right-0 text-center">
        <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-primary-600 px-2 py-0.5 rounded-full shadow-lg">
          Cible: {currentPoint.name}
        </span>
      </div>
    </div>
  );
};

const CameraCapture = ({ 
  vehicleType = 'citadine', 
  onCapture, 
  onClose,
  capturedImages = [] 
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState(null);
  
  const currentPoint = INSPECTION_POINTS[currentPointIndex];
  
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (err) {
      setError('Impossible d\'accéder à la caméra. Veuillez vérifier les permissions.');
      console.error('Camera error:', err);
    }
  }, []);
  
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);
  
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsCapturing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data and compress
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Create compressed version for upload
      const compressedCanvas = document.createElement('canvas');
      const compressedContext = compressedCanvas.getContext('2d');
      const maxWidth = 1024;
      const maxHeight = 768;
      
      let width = canvas.width;
      let height = canvas.height;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      compressedCanvas.width = width;
      compressedCanvas.height = height;
      compressedContext.drawImage(canvas, 0, 0, width, height);
      
      const compressedImage = compressedCanvas.toDataURL('image/jpeg', 0.7);
      
      // Flash effect
      const flash = document.createElement('div');
      flash.className = 'fixed inset-0 bg-white z-50 pointer-events-none';
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 200);
      
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
      
      const photoData = {
        id: currentPoint.id,
        name: currentPoint.name,
        image: compressedImage,
        timestamp: new Date().toISOString(),
        coordinates: await getCurrentPosition()
      };
      
      onCapture(photoData);
      
      // Move to next point
      if (currentPointIndex < INSPECTION_POINTS.length - 1) {
        setCurrentPointIndex(prev => prev + 1);
      }
      
    } catch (err) {
      setError('Erreur lors de la capture de la photo.');
      console.error('Capture error:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [currentPoint, currentPointIndex, onCapture]);
  
  const getCurrentPosition = () => {
    return new Promise((resolve) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            });
          },
          () => resolve(null)
        );
      } else {
        resolve(null);
      }
    });
  };
  
  const isPointCaptured = (pointId) => {
    return capturedImages.some(img => img.id === pointId);
  };
  
  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);
  
  const allPointsCaptured = capturedImages.length === INSPECTION_POINTS.length;
  
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Inspection Véhicule</h2>
          <p className="text-sm text-gray-400">
            Point {currentPointIndex + 1}/{INSPECTION_POINTS.length}: {currentPoint.name}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X size={24} />
        </button>
      </div>
      
      {/* Camera View */}
      <div className="flex-1 relative bg-black">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center text-white">
              <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
              <p>{error}</p>
              <button
                onClick={startCamera}
                className="mt-4 px-4 py-2 bg-primary-600 rounded-lg"
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            <VehicleGuide 
              vehicleType={vehicleType} 
              currentPoint={currentPoint}
            />
            
            {/* Progress indicator */}
            <div className="absolute top-4 left-4 right-4">
              <div className="bg-gray-800 bg-opacity-80 rounded-lg p-2">
                <div className="flex space-x-1">
                  {INSPECTION_POINTS.map((point, index) => (
                    <div
                      key={point.id}
                      className={`flex-1 h-1 rounded-full transition-colors ${
                        isPointCaptured(point.id)
                          ? 'bg-green-500'
                          : index === currentPointIndex
                          ? 'bg-primary-500'
                          : 'bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Controls */}
      <div className="bg-gray-900 p-4">
        <div className="flex justify-between items-center">
          <button
            onClick={() => currentPointIndex > 0 && setCurrentPointIndex(prev => prev - 1)}
            disabled={currentPointIndex === 0}
            className="p-3 bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Précédent
          </button>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={capturePhoto}
            disabled={isCapturing || isPointCaptured(currentPoint.id)}
            className={`p-6 rounded-full transition-all ${
              isPointCaptured(currentPoint.id)
                ? 'bg-green-500'
                : 'bg-primary-600 hover:bg-primary-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isPointCaptured(currentPoint.id) ? (
              <Check size={32} className="text-white" />
            ) : (
              <Camera size={32} className="text-white" />
            )}
          </motion.button>
          
          <button
            onClick={() => currentPointIndex < INSPECTION_POINTS.length - 1 && setCurrentPointIndex(prev => prev + 1)}
            disabled={currentPointIndex === INSPECTION_POINTS.length - 1}
            className="p-3 bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suivant
          </button>
        </div>
        
        {allPointsCaptured && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center"
          >
            <p className="text-green-500 font-medium mb-2">Inspection complète!</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Terminer l'inspection
            </button>
          </motion.div>
        )}
      </div>
      
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
