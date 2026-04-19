/**
 * Simple cache service to persist dashboard state in localStorage
 * for instant loading (Optimistic UI).
 */

export const saveDashboardCache = (data) => saveCache('dashboard', data);
export const loadDashboardCache = () => loadCache('dashboard');

export const saveVehiclesCache = (data) => saveCache('vehicles', data);
export const loadVehiclesCache = () => loadCache('vehicles');

export const saveClientsCache = (data) => saveCache('clients', data);
export const loadClientsCache = () => loadCache('clients');

const saveCache = (key, data) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(`locavision_${key}_cache`, JSON.stringify(cacheData));
  } catch (error) {
    console.error(`Error saving ${key} cache:`, error);
  }
};

const loadCache = (key) => {
  try {
    const cached = localStorage.getItem(`locavision_${key}_cache`);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > 1000 * 60 * 60;
    return isExpired ? null : data;
  } catch (error) {
    console.error(`Error loading ${key} cache:`, error);
    return null;
  }
};

export const clearAllCache = () => {
  localStorage.clear();
};
