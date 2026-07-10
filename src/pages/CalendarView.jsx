import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Car, Calendar, AlertCircle } from 'lucide-react';
import { subscribeToRentals, subscribeToVehicles } from '../services/firestore';

const COLORS = [
  'bg-primary-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-cyan-500', 'bg-violet-500', 'bg-orange-500', 'bg-teal-500'
];

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

const parseDate = (ts) => {
  if (!ts) return null;
  return ts?.toDate ? ts.toDate() : new Date(ts);
};

const toLocaleDateParts = (date) => ({
  year: date.getFullYear(),
  month: date.getMonth(),
  day: date.getDate()
});

const CalendarView = ({ companyId, currentAgency }) => {
  const [rentals, setRentals] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  useEffect(() => {
    const filters = currentAgency ? { agencyId: currentAgency } : companyId ? { companyId } : {};
    const unsubR = subscribeToRentals(filters, (data) => {
      setRentals(data);
      setLoading(false);
    });
    const unsubV = subscribeToVehicles(filters, (data) => setVehicles(data));
    return () => { unsubR(); unsubV(); };
  }, [companyId, currentAgency]);

  // Map vehicle id -> color index
  const vehicleColorMap = useMemo(() => {
    const map = {};
    vehicles.forEach((v, i) => { map[v.id] = COLORS[i % COLORS.length]; });
    return map;
  }, [vehicles]);

  // For each vehicle, compute which days have a rental bar
  const vehicleRentals = useMemo(() => {
    return vehicles.map(vehicle => {
      const vehicleRentalBars = rentals
        .filter(r => r.vehicleId === vehicle.id)
        .map(r => {
          const start = parseDate(r.startDate || r.createdAt);
          const end = parseDate(r.endDate || r.createdAt);
          if (!start || !end) return null;
          const startDay = start.getFullYear() === year && start.getMonth() === month ? start.getDate() : 1;
          const endDay = end.getFullYear() === year && end.getMonth() === month ? end.getDate() : daysInMonth;
          // Only show if within this month
          if (end.getFullYear() < year || (end.getFullYear() === year && end.getMonth() < month)) return null;
          if (start.getFullYear() > year || (start.getFullYear() === year && start.getMonth() > month)) return null;
          return { rental: r, startDay: Math.max(1, startDay), endDay: Math.min(daysInMonth, endDay) };
        })
        .filter(Boolean);
      return { vehicle, bars: vehicleRentalBars };
    });
  }, [vehicles, rentals, year, month, daysInMonth]);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter italic uppercase text-slate-900 dark:text-white">Planning</h1>
          <p className="text-slate-400 mt-1 text-sm capitalize">{monthName}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            Aujourd'hui
          </button>
          <button onClick={nextMonth} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-3 h-3 rounded bg-primary-100 dark:bg-primary-900/40 border-2 border-primary-400" />
          Aujourd'hui
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-6 h-3 rounded bg-emerald-500/70" /> Location active
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary-600" /></div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-24 text-slate-400">
          <Car size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-bold">Aucun véhicule à afficher</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xl">
          {/* Timeline header - Days */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
            {/* Vehicle column header */}
            <div className="w-48 flex-shrink-0 px-4 py-3 border-r border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Véhicule</p>
            </div>
            {/* Days */}
            <div className="flex-1 flex overflow-x-auto">
              {days.map(day => {
                const isToday = isCurrentMonth && day === today.getDate();
                return (
                  <div key={day} className={`flex-1 min-w-[32px] text-center py-3 border-r border-slate-50 dark:border-slate-800/50 last:border-r-0 ${isToday ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                    <p className={`text-[10px] font-black ${isToday ? 'text-primary-600' : 'text-slate-400'}`}>{day}</p>
                    <p className={`text-[8px] uppercase ${isToday ? 'text-primary-400' : 'text-slate-300 dark:text-slate-700'}`}>
                      {new Date(year, month, day).toLocaleDateString('fr-FR', { weekday: 'short' }).charAt(0)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vehicle rows */}
          <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {vehicleRentals.map(({ vehicle, bars }) => {
              const color = vehicleColorMap[vehicle.id] || COLORS[0];
              const statusColors = {
                'Disponible': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
                'Loué': 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
                'Maintenance': 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
                'Litige': 'text-red-600 bg-red-50 dark:bg-red-900/30',
              };
              const statusCls = statusColors[vehicle.status] || 'text-slate-500 bg-slate-100';

              return (
                <motion.div key={vehicle.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  {/* Vehicle info */}
                  <div className="w-48 flex-shrink-0 px-4 py-3 border-r border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">{vehicle.brand} {vehicle.model}</p>
                    <p className="text-[10px] text-slate-400 truncate">{vehicle.licensePlate}</p>
                    <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${statusCls} w-fit`}>
                      {vehicle.status}
                    </span>
                  </div>

                  {/* Timeline grid */}
                  <div className="flex-1 relative py-2 min-h-[60px] overflow-x-auto">
                    {/* Day grid lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {days.map(day => {
                        const isToday = isCurrentMonth && day === today.getDate();
                        return (
                          <div key={day} className={`flex-1 min-w-[32px] border-r border-slate-50 dark:border-slate-800/30 last:border-r-0 ${isToday ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`} />
                        );
                      })}
                    </div>

                    {/* Rental bars */}
                    {bars.map((bar, idx) => {
                      const totalCols = daysInMonth;
                      const leftPct = ((bar.startDay - 1) / totalCols) * 100;
                      const widthPct = ((bar.endDay - bar.startDay + 1) / totalCols) * 100;
                      const rentalStatusLabel = bar.rental.status || '';
                      return (
                        <div
                          key={bar.rental.id}
                          title={`${vehicle.brand} ${vehicle.model} — J${bar.startDay} au J${bar.endDay} — ${rentalStatusLabel}`}
                          className={`absolute top-3 h-6 rounded-full ${color} opacity-80 hover:opacity-100 transition-opacity cursor-pointer flex items-center px-2`}
                          style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%` }}
                        >
                          <span className="text-[9px] font-black text-white truncate">
                            {bar.endDay - bar.startDay > 1 ? `${bar.startDay}→${bar.endDay}` : `J${bar.startDay}`}
                          </span>
                        </div>
                      );
                    })}

                    {bars.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] text-slate-300 dark:text-slate-700 font-medium">Disponible</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Summary footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/10">
            <p className="text-xs text-slate-400 font-medium">{vehicles.length} véhicule{vehicles.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-slate-400 font-medium">{rentals.length} location{rentals.length !== 1 ? 's' : ''} ce mois</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
