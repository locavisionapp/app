import React from 'react';
import { motion } from 'framer-motion';
import { DAMAGE_TYPES, DAMAGE_LOCATIONS } from '../types';
import InteractiveModel from './InteractiveModel';

const DamageHeatmap = ({ damages, vehicleType = 'citadine' }) => {
  // Plus besoin de switch de vue car le plan technique affiche tout d'un coup
  
  const getDamageIcon = (type) => {
    switch (type) {
      case DAMAGE_TYPES.SCRATCH:
        return '═';
      case DAMAGE_TYPES.DENT:
        return '●';
      case DAMAGE_TYPES.BROKEN_GLASS:
        return '◊';
      default:
        return '⚠';
    }
  };
  
  const calculateHealthScore = () => {
    if (!damages || damages.length === 0) return 10;
    
    const totalSeverity = damages.reduce((sum, damage) => sum + damage.severity, 0);
    const maxPossibleSeverity = damages.length * 5;
    const score = 10 - (totalSeverity / maxPossibleSeverity) * 9;
    return Math.max(1, Math.round(score * 10) / 10);
  };
  
  const healthScore = calculateHealthScore();
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Modèle d'Inspection Interactif
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Score Santé:</span>
          <span className={`text-2xl font-bold ${
            healthScore >= 8 ? 'text-green-500' :
            healthScore >= 5 ? 'text-yellow-500' :
            'text-red-500'
          }`}>
            {healthScore}/10
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Plan Technique Interactif */}
        <div className="xl:col-span-2 space-y-4">
          <InteractiveModel 
            vehicleType={vehicleType}
            damages={damages}
            view="all"
            onPartClick={(part) => console.log('Part clicked:', part)}
          />
          
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500/60 rounded-full border border-green-600"></div>
              <span className="text-xs font-medium text-gray-500">Mineur</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500/60 rounded-full border border-yellow-600"></div>
              <span className="text-xs font-medium text-gray-500">Modéré</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500/60 rounded-full border border-red-600"></div>
              <span className="text-xs font-medium text-gray-500">Critique</span>
            </div>
          </div>
        </div>
        
        {/* Damage list */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
            Détail des Dommages ({damages.length})
          </h4>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {damages.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Aucun dommage détecté
              </p>
            ) : (
              damages.map((damage, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">
                          {getDamageIcon(damage.type)}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {damage.location}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {damage.description}
                      </p>
                      {damage.estimated_cost && (
                        <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mt-1">
                          ~{damage.estimated_cost}€
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        damage.severity <= 2 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        damage.severity <= 3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        Sévérité {damage.severity}/5
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Summary */}
      {damages.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {damages.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Dommages</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {damages.filter(d => d.severity >= 4).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Critiques</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {damages.filter(d => d.severity === 3).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Modérés</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {damages.filter(d => d.severity <= 2).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Mineurs</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DamageHeatmap;
