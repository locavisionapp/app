import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Professional Technical 2D Inspection Model (Blueprint Style)
 * Provides multiple technical views (Top, Front, Rear, Sides) for precise inspection.
 */

const InteractiveModel = ({ 
  vehicleType = 'citadine', 
  damages = [], 
  onPartClick,
  view = 'all' // Default to show technical blueprint
}) => {
  const [hoveredPart, setHoveredPart] = useState(null);

  const getPartStyle = (partId) => {
    const partDamages = damages.filter(d => d.partId === partId || d.location === partId);
    if (partDamages.length > 0) {
      const maxSeverity = Math.max(...partDamages.map(d => d.severity));
      if (maxSeverity >= 4) return 'fill-red-500/40 stroke-red-600 stroke-[2px]';
      if (maxSeverity >= 3) return 'fill-yellow-500/40 stroke-yellow-600 stroke-[2px]';
      return 'fill-green-500/40 stroke-green-600 stroke-[2px]';
    }
    return hoveredPart === partId 
      ? 'fill-primary-500/20 stroke-primary-500 stroke-[2px]' 
      : 'fill-transparent stroke-gray-300 dark:stroke-gray-700 hover:stroke-primary-400 group-hover:stroke-primary-400 transition-all duration-300';
  };

  // Helper to render a clickable technical part
  const Part = ({ id, d, label }) => (
    <g 
      className="cursor-pointer group" 
      onClick={() => onPartClick?.(id)}
      onMouseEnter={() => setHoveredPart(id)}
      onMouseLeave={() => setHoveredPart(null)}
    >
      <path id={id} d={d} className={getPartStyle(id)} />
      {label && (
        <text 
          x="0" y="0" 
          className="pointer-events-none fill-gray-400 dark:fill-gray-600 text-[8px] font-bold"
          style={{ transform: 'translate(5px, 5px)' }}
        >
          {label}
        </text>
      )}
    </g>
  );

  const renderBlueprint = () => (
    <svg viewBox="0 0 600 400" className="w-full h-full">
      {/* BACKGROUND GRID (Aesthetic) */}
      <defs>
        <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gray-100 dark:text-gray-800/50" />
        </pattern>
      </defs>
      <rect width="600" height="400" fill="url(#grid)" />

      {/* --- VUE DE DESSUS (CENTER) --- */}
      <g transform="translate(200, 100)">
        {/* Outline */}
        <rect x="0" y="0" width="200" height="100" rx="20" className="fill-white dark:fill-gray-900 stroke-gray-200 dark:stroke-gray-800 stroke-[1px]" />
        
        {/* Capot (Hood) */}
        <Part id="front" d="M 0 20 Q 0 0 20 0 L 60 0 L 60 100 L 20 100 Q 0 100 0 80 Z" label="FRONT" />
        
        {/* Toit (Roof) */}
        <Part id="roof" d="M 60 0 L 140 0 L 140 100 L 60 100 Z" label="ROOF" />
        
        {/* Coffre (Rear) */}
        <Part id="rear" d="M 140 0 L 180 0 Q 200 0 200 20 L 200 80 Q 200 100 180 100 L 140 100 Z" label="REAR" />
        
        {/* Windshield Lines */}
        <line x1="60" y1="0" x2="70" y2="20" className="stroke-gray-200 dark:stroke-gray-800" />
        <line x1="60" y1="100" x2="70" y2="80" className="stroke-gray-200 dark:stroke-gray-800" />
      </g>

      {/* --- CÔTÉ GAUCHE (TOP) --- */}
      <g transform="translate(200, 20)">
         <path className="fill-white dark:fill-gray-900 stroke-gray-200 dark:stroke-gray-800" d="M 0 50 L 20 20 L 180 20 L 200 50 Z" />
         <Part id="left" d="M 0 50 L 20 20 L 180 20 L 200 50 Z" label="LEFT SIDE" />
         {/* Wheels */}
         <circle cx="40" cy="50" r="10" className="fill-gray-800" />
         <circle cx="160" cy="50" r="10" className="fill-gray-800" />
      </g>

      {/* --- CÔTÉ DROIT (BOTTOM) --- */}
      <g transform="translate(200, 230)">
         <path className="fill-white dark:fill-gray-900 stroke-gray-200 dark:stroke-gray-800" d="M 0 20 L 20 50 L 180 50 L 200 20 Z" />
         <Part id="right" d="M 0 20 L 20 50 L 180 50 L 200 20 Z" label="RIGHT SIDE" />
         {/* Wheels */}
         <circle cx="40" cy="20" r="10" className="fill-gray-800" />
         <circle cx="160" cy="20" r="10" className="fill-gray-800" />
      </g>

      {/* --- FACE AVANT (LEFT) --- */}
      <g transform="translate(50, 100)">
        <Part id="front_grill" d="M 20 0 L 100 0 L 100 100 L 20 100 L 0 50 Z" label="FRONT VIEW" />
        {/* Lights */}
        <rect x="70" y="10" width="20" height="10" rx="2" className="fill-yellow-100 stroke-yellow-400" />
        <rect x="70" y="80" width="20" height="10" rx="2" className="fill-yellow-100 stroke-yellow-400" />
      </g>

      {/* --- FACE ARRIÈRE (RIGHT) --- */}
      <g transform="translate(450, 100)">
        <Part id="rear_view" d="M 0 0 L 80 0 L 100 50 L 80 100 L 0 100 Z" label="REAR VIEW" />
        {/* Lights */}
        <rect x="10" y="10" width="20" height="10" rx="2" className="fill-red-100 stroke-red-400" />
        <rect x="10" y="80" width="20" height="10" rx="2" className="fill-red-100 stroke-red-400" />
      </g>

      {/* ANNOTATIONS */}
      <text x="300" y="350" textAnchor="middle" className="fill-gray-400 dark:fill-gray-600 text-xs font-black uppercase tracking-widest">
        Plan Technique d'Inspection - {vehicleType.toUpperCase()}
      </text>
    </svg>
  );

  return (
    <div className="relative w-full aspect-video flex items-center justify-center p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-inner overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div 
          key={vehicleType}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full h-full"
        >
          {renderBlueprint()}
        </motion.div>
      </AnimatePresence>

      {/* Floating Instructions */}
      <div className="absolute top-4 left-4 flex flex-col space-y-2 pointer-events-none">
        <span className="text-[10px] font-black text-primary-500 uppercase tracking-[0.2em] bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded">
          Interactive Design
        </span>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${hoveredPart ? 'bg-primary-500 animate-pulse' : 'bg-gray-300'}`} />
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
            {hoveredPart ? `Zone: ${hoveredPart.toUpperCase()}` : 'Cliquer pour marquer'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default InteractiveModel;
