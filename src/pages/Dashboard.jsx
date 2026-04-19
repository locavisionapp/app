import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Car, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign,
  Activity,
  Calendar,
  Download,
  Eye,
  Settings,
  RefreshCcw
} from 'lucide-react';
import { 
  calculateFleetAnalytics, 
  getVehicles, 
  getInspections, 
  createClient,
  seedDatabase 
} from '../services/firestore';
import { auth } from '../firebase';
import { saveDashboardCache, loadDashboardCache } from '../services/cacheService';
import DamageHeatmap from '../components/DamageHeatmap';
import ComparisonView from '../components/ComparisonView';

const StatSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
    <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
    <div className="h-4 w-32 bg-gray-100 dark:bg-gray-700 rounded"></div>
  </div>
);

const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [recentInspections, setRecentInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [comparisonTarget, setComparisonTarget] = useState(null);

  useEffect(() => {
    // 1. Load from cache for instant UI
    const cached = loadDashboardCache();
    if (cached) {
      setAnalytics(cached.analytics);
      setVehicles(cached.vehicles);
      setRecentInspections(cached.inspections);
      setLoading(false);
    }
    
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    try {
      // Background fetch
      const uid = auth.currentUser?.uid;
      const [vehiclesData, inspectionsData] = await Promise.all([
        getVehicles(uid),
        getInspections(uid)
      ]);
      
      const analyticsData = calculateFleetAnalytics(vehiclesData, inspectionsData);
      
      setAnalytics(analyticsData);
      setVehicles(vehiclesData);
      setRecentInspections(inspectionsData);
      
      // Save for next visit
      saveDashboardCache({
        analytics: analyticsData,
        vehicles: vehiclesData,
        inspections: inspectionsData
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      await seedDatabase(auth.currentUser.uid);
      await loadData();
      alert('Base de données initialisée avec succès !');
    } catch (error) {
      console.error('Seeding failed:', error);
      alert('Échec de l\'initialisation : ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleClick = async (vehicle) => {
    setSelectedVehicle(vehicle);
    // Try to find if the last inspection was a check-in to offer comparison
    const vehicleInspections = recentInspections.filter(i => i.vehicleId === vehicle.id);
    if (vehicleInspections.length > 0 && vehicleInspections[0].type === 'checkin') {
      // Find the last checkout for this vehicle
      const lastCheckout = vehicleInspections.find((i, idx) => i.type === 'checkout' && idx > 0);
      if (lastCheckout) {
        setComparisonTarget({
          checkin: vehicleInspections[0],
          checkout: lastCheckout
        });
      }
    } else {
      setComparisonTarget(null);
    }
  };

  const StatCard = ({ title, value, icon: Icon, change, color = 'blue' }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {value}
          </p>
          {change && (
            <p className={`text-sm mt-2 ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {change >= 0 ? '+' : ''}{change}% vs période précédente
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100 dark:bg-${color}-900`}>
          <Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
    </motion.div>
  );

  const VehicleCard = ({ vehicle }) => {
    const statusStyles = {
      'Disponible': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'Loué': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'Maintenance': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      'Litige': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };

    const statusStyle = statusStyles[vehicle.status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800';

    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all h-full"
        onClick={() => handleVehicleClick(vehicle)}
      >
        <div className="flex justify-between items-start mb-3 gap-2">
          <div className="flex items-center space-x-3">
             <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-primary-600">
               <Car size={20} />
             </div>
             <div>
               <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                 {vehicle.brand} {vehicle.model}
               </h4>
               <p className="text-xs font-mono text-gray-500 uppercase">
                 {vehicle.licensePlate}
               </p>
             </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${statusStyle}`}>
            {vehicle.status}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Kilométrage:</span>
            <p className="font-medium">{vehicle.mileage?.toLocaleString() || 'N/A'} km</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Catégorie:</span>
            <p className="font-medium">{vehicle.category || 'N/A'}</p>
          </div>
        </div>
        
        {vehicle.healthScore && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Score Santé:</span>
              <span className={`font-bold ${
                vehicle.healthScore >= 8 ? 'text-green-600' :
                vehicle.healthScore >= 5 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {vehicle.healthScore}/10
              </span>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  if (loading && !analytics) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <StatSkeleton key={i} />)}
        </div>
        <div className="h-[400px] bg-white dark:bg-gray-800 rounded-2xl animate-pulse border border-gray-100 dark:border-gray-700"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Dashboard LocaVision
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gestion de flotte et inspection IA
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
                <option value="quarter">Ce trimestre</option>
                <option value="year">Cette année</option>
              </select>
              <button 
                onClick={handleSeed}
                className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg text-sm font-bold hover:bg-primary-200 transition-colors"
                title="Ajouter des données de test"
              >
                Seed Test Data
              </button>
              <button 
                onClick={() => { localStorage.clear(); window.location.reload(); }}
                className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Vider le cache et rafraîchir"
              >
                <RefreshCcw className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          <StatCard 
            title="Total Véhicules" 
            value={analytics?.totalVehicles || 0} 
            icon={Car}
            color="blue"
          />
          <StatCard 
            title="Disponibles" 
            value={analytics?.availableVehicles || 0} 
            icon={Activity}
            color="green"
          />
          <StatCard 
            title="En Location" 
            value={analytics?.rentedVehicles || 0} 
            icon={Calendar}
            color="indigo"
          />
          <StatCard 
            title="Litiges / Entretien" 
            value={(analytics?.maintenanceVehicles || 0) + (analytics?.disputeVehicles || 0)} 
            icon={AlertTriangle}
            color="red"
          />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Vehicle Fleet */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Flotte de Véhicules
                  </h2>
                  <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                    Voir tout
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vehicles.slice(0, 6).map((vehicle) => (
                    <VehicleCard key={vehicle.id} vehicle={vehicle} />
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Activité Récente
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentInspections.slice(0, 5).map((inspection) => {
                    const vehicle = vehicles.find(v => v.id === inspection.vehicleId);
                    return (
                      <div key={inspection.id} className="flex items-center space-x-4">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <Car className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {inspection.type === 'checkout' ? 'Check-out' : 'Check-in'} terminé - {vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Véhicule inconnu'}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Agent: {inspection.agentName}
                          </p>
                        </div>
                        <span className={`px-2 py-1 ${inspection.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} text-xs rounded-full`}>
                          {new Date(inspection.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Actions Rapides
                </h2>
              </div>
              <div className="p-6 space-y-3">
                <button className="w-full btn-primary flex items-center justify-center space-x-2">
                  <Car className="w-4 h-4" />
                  <span>Nouvelle Inspection</span>
                </button>
                <button className="w-full btn-secondary flex items-center justify-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Ajouter Véhicule</span>
                </button>
                <button className="w-full btn-secondary flex items-center justify-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Exporter Rapport</span>
                </button>
              </div>
            </div>

            {/* Alerts */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Alertes
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {analytics?.maintenanceVehicles > 0 && (
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {analytics.maintenanceVehicles} véhicule{analytics.maintenanceVehicles > 1 ? 's' : ''} en maintenance
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Vérifiez l'état de santé dans la flotte.
                      </p>
                    </div>
                  </div>
                )}
                {recentInspections.some(i => i.aiAnalysis?.damages?.some(d => d.severity >= 4)) && (
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Dommages critiques détectés
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Consultez les dernières inspections pour détails.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {selectedVehicle.brand} {selectedVehicle.model}
                </h2>
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 space-y-8">
              {comparisonTarget ? (
                <ComparisonView 
                  checkoutInspection={comparisonTarget.checkout}
                  checkinInspection={comparisonTarget.checkin}
                  vehicle={selectedVehicle}
                />
              ) : (
                <DamageHeatmap 
                  damages={recentInspections.find(i => i.vehicleId === selectedVehicle.id)?.aiAnalysis?.damages || []}
                  vehicleType={selectedVehicle.category}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
