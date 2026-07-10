import React from 'react';
import { FileText, Upload, Search } from 'lucide-react';

const Documents = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Documents</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gestion des documents clients</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Upload size={20} />
          <span>Importer</span>
        </button>
      </div>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Rechercher un document..."
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
        />
      </div>
      <div className="grid gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <FileText size={24} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Permis de conduire - Jean Dupont</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ajouté le 15/06/2026</p>
            </div>
          </div>
          <button className="text-primary-600 hover:text-primary-700 font-bold text-sm">
            Télécharger
          </button>
        </div>
      </div>
    </div>
  );
};

export default Documents;
