import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitCompare, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  DollarSign,
  Maximize2,
  Minimize2,
  FileText
} from 'lucide-react';
import { compareInspections } from '../services/gemini';
import { generateComparisonPDF } from '../services/pdfGenerator';

const ComparisonView = ({ checkoutInspection, checkinInspection, vehicle }) => {
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('summary'); // summary or photos

  const handleCompare = async () => {
    setComparing(true);
    setError(null);
    try {
      const beforeImages = checkoutInspection.images.map(img => img.image.split(',')[1] || img.image);
      const afterImages = checkinInspection.images.map(img => img.image.split(',')[1] || img.image);
      
      const comparison = await compareInspections(beforeImages, afterImages);
      setResult(comparison);
    } catch (err) {
      console.error('Comparison error:', err);
      setError('Erreur lors de la comparaison IA. Veuillez vérifier la qualité des photos.');
    } finally {
      setComparing(false);
    }
  };

  const downloadReport = async () => {
    if (!result) return;
    try {
      const pdf = await generateComparisonPDF(checkoutInspection, checkinInspection, result);
      pdf.save(`comparaison_${vehicle.licensePlate}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl text-primary-600">
            <Maximize2 size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Comparaison Avant/Après</h3>
            <p className="text-sm text-gray-500">Identification des nouveaux dommages pour facturation.</p>
          </div>
        </div>
        {!result && !comparing && (
          <button
            onClick={handleCompare}
            className="btn-primary flex items-center space-x-2 px-6 py-2 rounded-xl shadow-lg shadow-primary-500/20"
          >
            <span>Lancer l'Analyse IA</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4 bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Check-out (Départ)</p>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">{new Date(checkoutInspection.createdAt).toLocaleDateString()}</span>
            <span className="font-bold text-gray-900 dark:text-white">{checkoutInspection.agentName}</span>
          </div>
        </div>
        <div className="card p-4 bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Check-in (Retour)</p>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">{new Date(checkinInspection.createdAt).toLocaleDateString()}</span>
            <span className="font-bold text-gray-900 dark:text-white">{checkinInspection.agentName}</span>
          </div>
        </div>
      </div>

      {comparing && (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary-100 dark:border-primary-900 rounded-full" />
            <div className="w-16 h-16 border-4 border-primary-600 rounded-full border-t-transparent animate-spin absolute inset-0" />
          </div>
          <p className="font-bold text-primary-600 animate-pulse">L'IA compare les deux inspections...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center space-x-3 text-red-600">
          <AlertCircle size={20} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-6 text-center">
              <p className="text-3xl font-black text-red-500 mb-1">{result.new_damages?.length || 0}</p>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Nouveaux Dommages</p>
            </div>
            <div className="card p-6 text-center border-l-4 border-l-red-500">
              <p className="text-3xl font-black text-red-500 mb-1">{result.total_new_cost || 0}€</p>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Coût Additionnel</p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-3xl font-black text-green-500 mb-1">{Math.round((result.comparison_confidence || 0) * 100)}%</p>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Confiance IA</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-gray-900 dark:text-white">Détails de l'analyse différentielle</h4>
            <div className="space-y-2">
              {result.new_damages?.length === 0 ? (
                <div className="p-8 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-2xl text-center">
                  <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
                  <p className="text-green-800 dark:text-green-300 font-bold">Aucun nouveau dommage détecté</p>
                  <p className="text-green-600 dark:text-green-400 text-sm">Le véhicule est revenu dans le même état qu'au départ.</p>
                </div>
              ) : (
                result.new_damages.map((damage, i) => (
                  <div key={i} className="card p-4 flex items-center justify-between border-l-4 border-l-red-500">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gray-900 dark:text-white capitalize">{damage.type} - {damage.location}</span>
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase">Sévérité {damage.severity}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{damage.description}</p>
                    </div>
                    <p className="text-lg font-black text-red-600">{damage.estimated_cost}€</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={downloadReport}
              className="px-6 py-3 bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-bold rounded-xl flex items-center space-x-2 shadow-xl"
            >
              <FileText size={20} />
              <span>Générer Facture/Rapport Comparatif</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ComparisonView;
