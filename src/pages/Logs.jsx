import React from 'react';
import { Clock, Search } from 'lucide-react';

const Logs = () => {
  const logs = [
    { id: 1, action: 'Connexion', user: 'admin@locavision.fr', time: '12:30', date: 'Aujourd’hui' },
    { id: 2, action: 'Création entreprise', user: 'commercial@locavision.fr', time: '11:45', date: 'Aujourd’hui' },
    { id: 3, action: 'Modification véhicule', user: 'agent@entreprise.fr', time: '10:20', date: 'Hier' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Journal d'activité</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Suivez toutes les actions</p>
      </div>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Rechercher dans les logs..."
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
        />
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">Action</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">Utilisateur</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">Date/Heure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900 dark:text-white">{log.action}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{log.user}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      {log.time} • {log.date}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Logs;
