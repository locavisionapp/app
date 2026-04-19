import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  setDoc,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * SERVICE DE STOCKAGE FIRESTORE RÉEL
 * Migration effectuée depuis localStorage vers Cloud Persistence.
 */

const COLLECTIONS = {
  VEHICLES: 'vehicles',
  CLIENTS: 'clients',
  INSPECTIONS: 'inspections',
  USERS: 'users',
  RENTALS: 'rentals',
  EMPLOYEES: 'employees',
  SETTINGS: 'settings',
  AGENCIES: 'agencies'
};

/**
 * USERS / AUTH
 */
export const createUser = async (data) => {
  if (!data.uid) throw new Error("UID is required to create a user profile.");
  const docRef = doc(db, COLLECTIONS.USERS, data.uid);
  await setDoc(docRef, {
    ...data,
    createdAt: serverTimestamp()
  });
  return data.uid;
};

export const getUser = async (id) => {
  const docSnap = await getDoc(doc(db, COLLECTIONS.USERS, id));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const updateUser = async (id, data) => {
  const docRef = doc(db, COLLECTIONS.USERS, id);
  await setDoc(docRef, { 
    ...data, 
    updatedAt: serverTimestamp() 
  }, { merge: true });
  return true;
};

/**
 * VEHICULES
 */
export const createVehicle = async (data) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.VEHICLES), {
    ...data,
    damages: [],
    agencyId: data.agencyId || 'agency_main',
    status: data.status || 'Disponible',
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getVehicles = async () => {
  const q = query(collection(db, COLLECTIONS.VEHICLES), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getVehicle = async (id) => {
  const docSnap = await getDoc(doc(db, COLLECTIONS.VEHICLES, id));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const updateVehicle = async (id, data) => {
  const docRef = doc(db, COLLECTIONS.VEHICLES, id);
  await updateDoc(docRef, { 
    ...data, 
    updatedAt: serverTimestamp() 
  });
  return true;
};

export const deleteVehicle = async (id) => {
  await deleteDoc(doc(db, COLLECTIONS.VEHICLES, id));
  return true;
};

/**
 * AGENCIES
 */
export const createAgency = async (userId, data) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.AGENCIES), {
    ...data,
    ownerId: userId,
    createdAt: serverTimestamp()
  });
  
  // Link to user profile
  await updateUser(userId, { 
    agencyId: docRef.id,
    hasAgency: true,
    companyName: data.name // Keep sync with profile
  });
  
  return docRef.id;
};

export const getAgency = async (id) => {
  const docSnap = await getDoc(doc(db, COLLECTIONS.AGENCIES, id));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const getAgencies = async () => {
  const q = query(collection(db, COLLECTIONS.AGENCIES), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateAgency = async (id, data) => {
  const docRef = doc(db, COLLECTIONS.AGENCIES, id);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  return true;
};

export const deleteAgency = async (id) => {
  await deleteDoc(doc(db, COLLECTIONS.AGENCIES, id));
  return true;
};

/**
 * CLIENTS
 */
export const createClient = async (data) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.CLIENTS), {
    ...data,
    loyaltyPoints: 0,
    damageCount: 0,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getClients = async () => {
  const q = query(collection(db, COLLECTIONS.CLIENTS), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getClient = async (id) => {
  const docSnap = await getDoc(doc(db, COLLECTIONS.CLIENTS, id));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const updateClient = async (id, data) => {
  const docRef = doc(db, COLLECTIONS.CLIENTS, id);
  await updateDoc(docRef, { 
    ...data, 
    updatedAt: serverTimestamp() 
  });
  return true;
};

export const deleteClient = async (id) => {
  await deleteDoc(doc(db, COLLECTIONS.CLIENTS, id));
  return true;
};

/**
 * INSPECTIONS
 */
export const createInspection = async (data) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.INSPECTIONS), {
    ...data,
    createdAt: serverTimestamp()
  });

  // Auto-Update vehicle damages if analysis found something
  if (data.aiAnalysis?.damages?.length > 0) {
    const vRef = doc(db, COLLECTIONS.VEHICLES, data.vehicleId);
    const vSnap = await getDoc(vRef);
    if (vSnap.exists()) {
      const currentDamages = vSnap.data().damages || [];
      await updateDoc(vRef, {
        damages: [...currentDamages, ...data.aiAnalysis.damages]
      });
    }
  }
  return docRef.id;
};

export const getInspections = async (vehId = null) => {
  let q;
  if (vehId) {
    q = query(collection(db, COLLECTIONS.INSPECTIONS), where('vehicleId', '==', vehId), orderBy('createdAt', 'desc'));
  } else {
    q = query(collection(db, COLLECTIONS.INSPECTIONS), orderBy('createdAt', 'desc'));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * LOCATIONS (RENTALS)
 */
export const createRental = async (data) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.RENTALS), {
    ...data,
    status: 'Actif',
    createdAt: serverTimestamp()
  });
  
  // Update vehicle status
  const vRef = doc(db, COLLECTIONS.VEHICLES, data.vehicleId);
  await updateDoc(vRef, { status: 'Loué' });
  
  return docRef.id;
};

export const cancelRental = async (rentalId, reason) => {
  const rRef = doc(db, COLLECTIONS.RENTALS, rentalId);
  const rSnap = await getDoc(rRef);
  if (!rSnap.exists()) return false;
  
  await updateDoc(rRef, {
    status: 'Annulé',
    cancelReason: reason,
    cancelledAt: serverTimestamp()
  });
  
  // Re-release vehicle
  const vRef = doc(db, COLLECTIONS.VEHICLES, rSnap.data().vehicleId);
  await updateDoc(vRef, { status: 'Disponible' });
  
  return true;
};

export const getRentals = async () => {
  const q = query(collection(db, COLLECTIONS.RENTALS), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * EMPLOYÉS
 */
export const getEmployees = async () => {
  const q = query(collection(db, COLLECTIONS.EMPLOYEES), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createEmployee = async (data) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.EMPLOYEES), {
    ...data,
    status: 'Actif',
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateEmployee = async (id, data) => {
  const docRef = doc(db, COLLECTIONS.EMPLOYEES, id);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  return true;
};

export const deleteEmployee = async (id) => {
  await deleteDoc(doc(db, COLLECTIONS.EMPLOYEES, id));
  return true;
};

/**
 * DOSSIERS DÉTAILLÉS (HISTORY)
 */
export const getVehicleDossier = async (id) => {
  const vehicle = await getVehicle(id);
  if (!vehicle) return null;
  const inspections = await getInspections(id);
  
  // Get rentals via query
  const q = query(collection(db, COLLECTIONS.RENTALS), where('vehicleId', '==', id));
  const rSnap = await getDocs(q);
  const rentals = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  return { ...vehicle, inspections, rentals };
};

export const getClientDossier = async (id) => {
  const client = await getClient(id);
  if (!client) return null;
  
  const qR = query(collection(db, COLLECTIONS.RENTALS), where('clientId', '==', id));
  const rSnap = await getDocs(qR);
  const rentals = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const qI = query(collection(db, COLLECTIONS.INSPECTIONS), where('clientId', '==', id));
  const iSnap = await getDocs(qI);
  const inspections = iSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  return { ...client, rentals, inspections };
};

/**
 * ANALYTICS & STATS
 */
export const getAdvancedStats = async (userRole = 'Administrateur') => {
  const rentalsSnap = await getDocs(collection(db, COLLECTIONS.RENTALS));
  const vehiclesSnap = await getDocs(collection(db, COLLECTIONS.VEHICLES));
  const clientsSnap = await getDocs(collection(db, COLLECTIONS.CLIENTS));
  
  const rentals = rentalsSnap.docs.map(d => d.data());
  const vehicles = vehiclesSnap.docs.map(d => d.data());
  const clients = clientsSnap.docs.map(d => d.data());
  
  const now = new Date();
  const currentMonth = now.getMonth();
  
  const stats = {
    totalVehicles: vehicles.length,
    rentedVehicles: vehicles.filter(v => v.status === 'Loué').length,
    availableVehicles: vehicles.filter(v => v.status === 'Disponible').length,
    maintenanceVehicles: vehicles.filter(v => v.status === 'Maintenance' || v.status === 'Litige').length,
    occupancyRate: vehicles.length > 0 ? Math.round((vehicles.filter(v => v.status === 'Loué').length / vehicles.length) * 100) : 0,
    activeRentals: rentals.filter(r => r.status === 'Actif').length,
    totalClients: clients.length,
    trends: {
      occupancy: '+5%',
      fleet: vehicles.length
    }
  };

  if (userRole === 'Administrateur') {
    const totalRevenue = rentals.reduce((acc, r) => acc + (parseFloat(r.totalPrice) || 0), 0);
    const thisMonthRevenue = rentals
      .filter(r => {
        const date = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
        return date.getMonth() === currentMonth;
      })
      .reduce((acc, r) => acc + (parseFloat(r.totalPrice) || 0), 0);
    
    stats.revenue = {
      total: totalRevenue,
      thisMonth: thisMonthRevenue,
      growth: '+12.4%',
      history: [
        { name: 'Jan', val: totalRevenue * 0.15 },
        { name: 'Fév', val: totalRevenue * 0.25 },
        { name: 'Mar', val: totalRevenue * 0.35 },
        { name: 'Avr', val: thisMonthRevenue }
      ]
    };
    
    stats.categoryBreakdown = [
      { name: 'Citadines', val: vehicles.filter(v => v.category === 'citadine').length },
      { name: 'SUV', val: vehicles.filter(v => v.category === 'suv').length },
      { name: 'Utilitaires', val: vehicles.filter(v => v.category === 'utilitaire').length },
      { name: 'Luxe', val: vehicles.filter(v => v.category === 'luxe').length }
    ];
  }

  return stats;
};

export const getFleetAnalytics = async () => {
  const vSnap = await getDocs(collection(db, COLLECTIONS.VEHICLES));
  const v = vSnap.docs.map(d => d.data());
  return {
    totalVehicles: v.length,
    availableVehicles: v.filter(x => x.status === 'Disponible').length,
    rentedVehicles: v.filter(x => x.status === 'Loué').length,
    maintenanceVehicles: v.filter(x => x.status === 'Maintenance').length,
    totalDamages: v.reduce((acc, curr) => acc + (curr.damages?.length || 0), 0)
  };
};

/**
 * MAINTENANCE & PRÉDICTION
 */
export const getMaintenanceForecast = async () => {
  const vehicles = await getVehicles();
  const inspectionsSnap = await getDocs(collection(db, COLLECTIONS.INSPECTIONS));
  const inspections = inspectionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  return vehicles.map(v => {
    const vInspections = inspections.filter(i => i.vehicleId === v.id);
    const lastScore = vInspections[0]?.aiAnalysis?.health_score || 10;
    
    let urgency = 'basse';
    if (lastScore < 6 || (v.mileage > 20000)) urgency = 'haute';
    else if (lastScore < 8 || (v.mileage > 10000)) urgency = 'moyenne';
    
    return {
      vehicleId: v.id,
      brand: v.brand,
      model: v.model,
      licensePlate: v.licensePlate,
      urgency,
      lastScore,
      nextService: new Date(Date.now() + (urgency === 'haute' ? 7 : urgency === 'moyenne' ? 30 : 90) * 86400000).toISOString()
    };
  }).sort((a,b) => (a.urgency === 'haute' ? -1 : 1));
};

export const seedDatabase = async () => {
  // Not needed for Firebase as it auto-creates collections, 
  // but we can add a test vehicle if empty.
  const existing = await getVehicles();
  if (existing.length === 0) {
    await createVehicle({ brand: 'BMW', model: 'Série 3', licensePlate: 'GF-555-RT', category: 'berline', status: 'Disponible', fuel: 'Diesel' });
  }
  return true;
};
