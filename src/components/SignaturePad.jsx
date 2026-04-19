import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Pen, RotateCcw, Download, Check } from 'lucide-react';

const SignaturePad = ({ onSignature, width = 400, height = 200 }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [signatureData, setSignatureData] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = parent.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = height * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [height]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    setIsEmpty(false);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // Prevent scrolling when drawing on touch devices
    if (e.type === 'touchstart') {
      e.preventDefault();
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Prevent scrolling when drawing on touch devices
    if (e.type === 'touchmove') {
      e.preventDefault();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Save signature data
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureData(dataUrl);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    setIsEmpty(true);
    setSignatureData(null);
  };

  const saveSignature = () => {
    if (isEmpty || !signatureData) return;
    
    onSignature({
      data: signatureData,
      timestamp: new Date().toISOString(),
      type: 'customer' // or 'agent' based on context
    });
  };

  const downloadSignature = () => {
    if (!signatureData) return;
    
    const link = document.createElement('a');
    link.download = `signature_${Date.now()}.png`;
    link.href = signatureData;
    link.click();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Signature Électronique
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Signez ci-dessous pour valider l'inspection
        </p>
      </div>

      {/* Canvas Container */}
      <div className="relative mb-4">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="border-2 border-gray-300 dark:border-gray-600 rounded-lg cursor-crosshair w-full"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ touchAction: 'none' }}
        />
        
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Pen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Signez ici
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={clear}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <RotateCcw size={16} />
            <span>Effacer</span>
          </motion.button>
          
          {signatureData && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={downloadSignature}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              <Download size={16} />
              <span>Télécharger</span>
            </motion.button>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={saveSignature}
          disabled={isEmpty}
          className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors ${
            isEmpty
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          <Check size={16} />
          <span>Valider la signature</span>
        </motion.button>
      </div>

      {/* Signature Info */}
      {signatureData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
        >
          <p className="text-sm text-green-800 dark:text-green-200">
            ✓ Signature capturée avec succès
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            {new Date().toLocaleString('fr-FR')}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default SignaturePad;
