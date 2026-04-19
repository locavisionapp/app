import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Interactive 2.5D (Isometric) Vehicle Model
 * Allows users to interact with specific parts of a vehicle to report damages.
 */

const InteractiveModel = ({ 
  vehicleType = 'citadine', 
  damages = [], 
  onPartClick,
  view = 'front' // 'front' or 'rear'
}) => {
  const [hoveredPart, setHoveredPart] = useState(null);

  const getPartColor = (partId) => {
    const partDamages = damages.filter(d => d.partId === partId || d.location === partId);
    if (partDamages.length > 0) {
      const maxSeverity = Math.max(...partDamages.map(d => d.severity));
      if (maxSeverity >= 4) return 'fill-red-500/60 stroke-red-600';
      if (maxSeverity >= 3) return 'fill-yellow-500/60 stroke-yellow-600';
      return 'fill-green-500/60 stroke-green-600';
    }
    return hoveredPart === partId 
      ? 'fill-primary-500/30 stroke-primary-500' 
      : 'fill-gray-100 dark:fill-gray-800 stroke-gray-300 dark:stroke-gray-600';
  };

  const renderFrontView = () => (
    <motion.g
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4 }}
    >
      <defs>
        <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Main Body Bottom */}
      <path className="fill-gray-200 dark:fill-gray-700 stroke-gray-400 dark:stroke-gray-500" d="M 50 140 L 150 170 L 250 140 L 250 100 L 150 130 L 50 100 Z" />

      {/* Hood (Front-Top) */}
      <path
        id="front"
        className={`transition-all cursor-pointer ${getPartColor('front')}`}
        d="M 50 100 L 150 130 L 250 100 L 200 70 L 100 70 Z"
        onClick={() => onPartClick?.('front')}
        onMouseEnter={() => setHoveredPart('front')}
        onMouseLeave={() => setHoveredPart(null)}
      />
      
      {/* Headlights */}
      <ellipse cx="80" cy="115" rx="10" ry="5" className="fill-yellow-100/80 stroke-yellow-400" />
      <ellipse cx="220" cy="115" rx="10" ry="5" className="fill-yellow-100/80 stroke-yellow-400" />

      {/* Windshield */}
      <path
        className="fill-[url(#glassGrad)] stroke-blue-400/30"
        d="M 100 70 L 200 70 L 180 30 L 120 30 Z"
      />

      {/* Roof */}
      <path
        id="roof"
        className={`transition-all cursor-pointer ${getPartColor('roof')}`}
        d="M 120 30 L 180 30 L 230 40 L 170 40 L 70 40 L 120 30 Z"
        onClick={() => onPartClick?.('roof')}
        onMouseEnter={() => setHoveredPart('roof')}
        onMouseLeave={() => setHoveredPart(null)}
      />

      {/* Left Side (Simplified 2.5D) */}
      <path
        id="left"
        className={`transition-all cursor-pointer ${getPartColor('left')}`}
        d="M 50 100 L 100 70 L 70 40 L 20 70 Z"
        onClick={() => onPartClick?.('left')}
        onMouseEnter={() => setHoveredPart('left')}
        onMouseLeave={() => setHoveredPart(null)}
      />

      {/* Wheels */}
      <circle cx="90" cy="150" r="15" className="fill-gray-900 border-2 border-gray-700" />
      <circle cx="210" cy="150" r="15" className="fill-gray-900 border-2 border-gray-700" />
    </motion.g>
  );

  const renderRearView = () => (
    <motion.g
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4 }}
    >
      {/* Rear Body */}
      <path className="fill-gray-200 dark:fill-gray-700 stroke-gray-400 dark:stroke-gray-500" d="M 50 140 L 150 170 L 250 140 L 250 100 L 150 130 L 50 100 Z" />

      {/* Trunk (Rear-Top) */}
      <path
        id="rear"
        className={`transition-all cursor-pointer ${getPartColor('rear')}`}
        d="M 50 100 L 150 130 L 250 100 L 200 70 L 100 70 Z"
        onClick={() => onPartClick?.('rear')}
        onMouseEnter={() => setHoveredPart('rear')}
        onMouseLeave={() => setHoveredPart(null)}
      />

      {/* Tail lights */}
      <rect x="70" y="110" width="20" height="8" rx="2" className="fill-red-600/80 stroke-red-800" />
      <rect x="210" y="110" width="20" height="8" rx="2" className="fill-red-600/80 stroke-red-800" />

      {/* Rear Window */}
      <path
        className="fill-blue-100/30 stroke-blue-400/20"
        d="M 110 70 L 190 70 L 175 45 L 125 45 Z"
      />
    </motion.g>
  );

  return (
    <div className="relative w-full aspect-square flex items-center justify-center p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-inner">
      <svg 
        viewBox="0 0 300 300" 
        className="w-full h-full max-w-[400px] transform-gpu"
        style={{ filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.1))' }}
      >
        <AnimatePresence mode="wait">
          {view === 'front' ? renderFrontView() : renderRearView()}
        </AnimatePresence>
        
        {/* Wheels & Shadows */}
        <ellipse cx="60" cy="110" rx="20" ry="10" className="fill-gray-900/10" />
        <ellipse cx="160" cy="110" rx="20" ry="10" className="fill-gray-900/10" />
      </svg>

      {/* Floating Instructions */}
      <div className="absolute top-4 left-4 flex flex-col space-y-2">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Vue Interactive
        </span>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${hoveredPart ? 'bg-primary-500 animate-ping' : 'bg-gray-300'}`} />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {hoveredPart ? `Zone: ${hoveredPart.toUpperCase()}` : 'Cliquez sur une zone'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default InteractiveModel;
