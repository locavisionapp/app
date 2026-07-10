import React, { useState, useEffect } from 'react';
import { AlertCircle, Bell, Settings } from 'lucide-react';
import { getAlerts, markAlertAsRead } from '../services/firestore';

const Alerts = ({ companyId, userId }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const filters = {};
      if (companyId) filters.companyId = companyId;
      if (userId) filters.userId = userId;
      const data = await getAlerts(filters);
      setAlerts(data);
    } catch (e) {
      console.error("Error fetching alerts:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [companyId, userId]);

  const handleMarkAsRead = async (alertId) => {
    try {
      await markAlertAsRead(alertId);
      // Reload alerts
      fetchAlerts();
    } catch (error) {
      console.error("Error marking alert as read:", error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'maintenance': return <AlertCircle size={24} className="text-amber-500" />;
      case 'technical': return <AlertCircle size={24} className="text-red-500" />;
      case 'subscription': return <Bell size={24} className="text-primary-500" />;
      default: return <AlertCircle size={24} className="text-slate-500" />;
    }
  };

  const getBg = (type) => {
    switch (type) {
      case 'maintenance': return 'bg-amber-100 dark:bg-amber-900/30';
      case 'technical': return 'bg-red-100 dark:bg-red-900/30';
      case 'subscription': return 'bg-primary-100 dark:bg-primary-900/30';
      default: return 'bg-slate-100 dark:bg-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Alertes</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Suivez les notifications importantes</p>
        </div>
      </div>
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 text-center text-slate-500">
            Aucune alerte pour le moment.
          </div>
        ) : (
          alerts.map(alert => (
            <div 
              key={alert.id} 
              onClick={() => !alert.read && handleMarkAsRead(alert.id)}
              className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all hover:scale-[1.01] ${!alert.read ? 'ring-2 ring-primary-500/20' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${getBg(alert.type)} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  {getIcon(alert.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white">{alert.title}</h3>
                    <span className="text-xs text-slate-400">
                      {alert.createdAt?.toDate ? alert.createdAt.toDate().toLocaleDateString() : new Date(alert.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">{alert.message || alert.text}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Alerts;
