import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin } from 'lucide-react';

const GlobalMap = ({ companies = [], title = "Vue des entreprises" }) => {
  const [hoveredCompany, setHoveredCompany] = useState(null);

  // Generate dummy coordinates for companies if not present
  const companiesWithCoords = companies.map((company, index) => ({
    ...company,
    lat: 30 + Math.random() * 40, // Random lat in northern hemisphere
    lng: -10 + Math.random() * 50, // Random lng in Europe/Africa/Americas
  }));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-700 shadow-xl">
      <h3 className="text-2xl font-black text-slate-900 dark:text-white italic mb-6 flex items-center gap-2">
        <MapPin size={24} className="text-primary-600" />
        {title}
      </h3>
      
      <div className="relative bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-[1.5rem] p-6 min-h-[400px] overflow-hidden">
        {/* Simplified World Map Background */}
        <div className="absolute inset-0 opacity-30">
          <svg viewBox="0 0 800 400" className="w-full h-full">
            <path 
              d="M 50 150 Q 100 120 150 130 T 250 140 T 350 120 T 450 130 T 550 120 T 650 130 T 750 140" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="20" 
              className="text-primary-500"
              opacity="0.3"
            />
            <path 
              d="M 80 250 Q 150 230 220 240 T 320 220 T 420 240 T 520 230 T 620 240 T 720 230" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="20" 
              className="text-primary-500"
              opacity="0.3"
            />
          </svg>
        </div>

        {/* Company Pins */}
        <div className="relative w-full h-[350px]">
          {companiesWithCoords.map((company, index) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="absolute transform -translate-x-1/2 -translate-y-full"
              style={{
                left: `${(company.lng + 180) / 360 * 100}%`,
                top: `${(90 - company.lat) / 180 * 100}%`,
              }}
              onMouseEnter={() => setHoveredCompany(company)}
              onMouseLeave={() => setHoveredCompany(null)}
            >
              <div className="relative">
                <div className="p-3 bg-gradient-to-br from-primary-600 to-primary-700 rounded-full shadow-lg shadow-primary-500/25 hover:scale-110 transition-transform cursor-pointer">
                  <Building2 size={24} className="text-white" />
                </div>
                <div className="w-4 h-4 bg-primary-600 absolute -bottom-2 left-1/2 -translate-x-1/2 rotate-45" />
                
                {/* Tooltip */}
                {hoveredCompany?.id === company.id && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl min-w-[200px]"
                  >
                    <p className="font-black text-lg">{company.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{company.email}</p>
                    {company.price && (
                      <p className="text-xs font-bold text-emerald-400 mt-1">
                        {company.price}€/{company.subscriptionType === 'monthly' ? 'mois' : 'an'}
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
          {companies.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-slate-400 font-black">Aucune entreprise pour le moment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalMap;
