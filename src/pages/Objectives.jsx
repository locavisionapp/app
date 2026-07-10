import React from 'react';
import { Target, TrendingUp, Calendar } from 'lucide-react';

const Objectives = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Objectifs</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Suivez vos performances</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
              <Target size={20} className="text-primary-600" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white">Nouvelles Entreprises</h3>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">3 / 5</p>
          <div className="mt-4 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-primary-600 rounded-full" style={{ width: '60%' }}></div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-600" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white">CA Mensuel</h3>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">12k€ / 15k€</p>
          <div className="mt-4 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 rounded-full" style={{ width: '80%' }}></div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <Calendar size={20} className="text-amber-600" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white">Rendez-vous</h3>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">8 / 10</p>
          <div className="mt-4 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-amber-600 rounded-full" style={{ width: '80%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Objectives;
