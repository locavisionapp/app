import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

// Collections
const USERS_COLLECTION = 'users';
const VEHICLES_COLLECTION = 'vehicles';
const INSPECTIONS_COLLECTION = 'inspections';
const CLIENTS_COLLECTION = 'clients';

// Users
export const createUser = async (userData) => {
  try {
    const docRef = await addDoc(collection(db, USERS_COLLECTION), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const getUser = async (userId) => {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

export const updateUser = async (userId, userData) => {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(docRef, {
      ...userData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Vehicles
export const createVehicle = async (vehicleData) => {
  try {
    const docRef = await addDoc(collection(db, VEHICLES_COLLECTION), {
      ...vehicleData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating vehicle:', error);
    throw error;
  }
};

export const getVehicles = async (agencyId = null) => {
  try {
    let q = collection(db, VEHICLES_COLLECTION);
    
    if (agencyId) {
      q = query(q, where('agencyId', '==', agencyId));
    }
    
    q = query(q, orderBy('createdAt', 'desc'), limit(50));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting vehicles:', error);
    throw error;
  }
};

export const getVehicle = async (vehicleId) => {
  try {
    const docRef = doc(db, VEHICLES_COLLECTION, vehicleId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error('Error getting vehicle:', error);
    throw error;
  }
};

export const updateVehicle = async (vehicleId, vehicleData) => {
  try {
    const docRef = doc(db, VEHICLES_COLLECTION, vehicleId);
    await updateDoc(docRef, {
      ...vehicleData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
};

// Inspections
export const createInspection = async (inspectionData) => {
  try {
    const docRef = await addDoc(collection(db, INSPECTIONS_COLLECTION), {
      ...inspectionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating inspection:', error);
    throw error;
  }
};

export const getInspections = async (vehicleId = null, clientId = null) => {
  try {
    let q = collection(db, INSPECTIONS_COLLECTION);
    
    if (vehicleId) {
      q = query(q, where('vehicleId', '==', vehicleId));
    }
    
    if (clientId) {
      q = query(q, where('clientId', '==', clientId));
    }
    
    q = query(q, orderBy('createdAt', 'desc'), limit(20));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting inspections:', error);
    throw error;
  }
};

export const getInspection = async (inspectionId) => {
  try {
    const docRef = doc(db, INSPECTIONS_COLLECTION, inspectionId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error('Error getting inspection:', error);
    throw error;
  }
};

export const updateInspection = async (inspectionId, inspectionData) => {
  try {
    const docRef = doc(db, INSPECTIONS_COLLECTION, inspectionId);
    await updateDoc(docRef, {
      ...inspectionData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating inspection:', error);
    throw error;
  }
};

// Clients
export const createClient = async (clientData) => {
  try {
    const docRef = await addDoc(collection(db, CLIENTS_COLLECTION), {
      ...clientData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
};

export const getClients = async (agencyId = null) => {
  try {
    let q = collection(db, CLIENTS_COLLECTION);
    
    if (agencyId) {
      q = query(q, where('agencyId', '==', agencyId));
    }
    
    q = query(q, orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting clients:', error);
    throw error;
  }
};

export const getClient = async (clientId) => {
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, clientId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error('Error getting client:', error);
    throw error;
  }
};

export const updateClient = async (clientId, clientData) => {
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, clientId);
    await updateDoc(docRef, {
      ...clientData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating client:', error);
    throw error;
  }
};

// Analytics (Optimized to avoid re-fetching)
export const calculateFleetAnalytics = (vehicles, inspections) => {
  const analytics = {
    totalVehicles: vehicles.length,
    availableVehicles: vehicles.filter(v => v.status === 'Disponible').length,
    rentedVehicles: vehicles.filter(v => v.status === 'Loué').length,
    maintenanceVehicles: vehicles.filter(v => v.status === 'Maintenance').length,
    disputeVehicles: vehicles.filter(v => v.status === 'Litige').length,
    totalDamages: 0,
    totalDamageCost: 0,
    monthlyStats: {}
  };
  
  // Calculate damage statistics
  inspections.forEach(inspection => {
    if (inspection.aiAnalysis?.damages) {
      analytics.totalDamages += inspection.aiAnalysis.damages.length;
      inspection.aiAnalysis.damages.forEach(damage => {
        if (damage.estimated_cost) {
          analytics.totalDamageCost += damage.estimated_cost;
        }
      });
    }
  });
  
  return analytics;
};

// Alias for backward compatibility and avoid breaking changes
export const getFleetAnalytics = calculateFleetAnalytics;

// Seed Data
export const seedDatabase = async (uid) => {
  try {
    const testVehicles = [
      { brand: 'Peugeot', model: '308', licensePlate: 'AB-123-CD', vin: 'VF312345678901234', category: 'citadine', mileage: 12500, status: 'Disponible', agencyId: uid },
      { brand: 'Renault', model: 'Master', licensePlate: 'EF-456-GH', vin: 'VF122345678901234', category: 'fourgon', mileage: 45000, status: 'Loué', agencyId: uid },
      { brand: 'Tesla', model: 'Model 3', licensePlate: 'IJ-789-KL', vin: '5YJ312345678901234', category: 'berline', mileage: 5000, status: 'Disponible', agencyId: uid }
    ];

    const testClients = [
      { name: 'Jean Dupont', email: 'jean.dupont@email.com', phone: '0612345678', licenseNumber: 'LP123456', idNumber: 'ID987654', agencyId: uid },
      { name: 'Marie Curie', email: 'marie.curie@science.fr', phone: '0789456123', licenseNumber: 'LP789012', idNumber: 'ID456123', agencyId: uid }
    ];

    await Promise.all([
      ...testVehicles.map(v => addDoc(collection(db, VEHICLES_COLLECTION), { ...v, createdAt: serverTimestamp() })),
      ...testClients.map(c => addDoc(collection(db, CLIENTS_COLLECTION), { ...c, createdAt: serverTimestamp() }))
    ]);
    
    return true;
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  }
};
