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
  increment,
  limit as limitFirestore,
  onSnapshot
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';

/**
 * SERVICE DE STOCKAGE FIRESTORE COMPLET
 * Refonte pour la nouvelle architecture multi-rôles
 */

const COLLECTIONS = {
  VEHICLES: 'vehicles',
  CLIENTS: 'clients',
  INSPECTIONS: 'inspections',
  USERS: 'users',
  RENTALS: 'rentals',
  EMPLOYEES: 'employees',
  SETTINGS: 'settings',
  AGENCIES: 'agencies',
  COMPANIES: 'companies',
  COMMERCIALS: 'commercials',
  OBJECTIVES: 'objectives',
  MESSAGES: 'messages',
  ALERTS: 'alerts',
  DOCUMENTS: 'documents',
  LOGS: 'logs',
  INVOICES: 'invoices',
  CLAIMS: 'claims'
};

// ==================== USERS ====================
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

export const getUsersByRole = async (role) => {
  const q = query(collection(db, COLLECTIONS.USERS), where('role', '==', role), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getUsersByCompany = async (companyId) => {
  const q = query(collection(db, COLLECTIONS.USERS), where('companyId', '==', companyId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ==================== COMPANIES ====================
export const createCompany = async (data) => {
  // Generate random UID (Firestore-like)
  const uid = doc(collection(db, COLLECTIONS.COMPANIES)).id;

  // Save company data in Firestore
  await setDoc(doc(db, COLLECTIONS.COMPANIES, uid), {
    ...data,
    uid,
    role: 'company_admin',
    createdAt: serverTimestamp()
  });

  // Also save the user in the users collection
  await setDoc(doc(db, COLLECTIONS.USERS, uid), {
    ...data,
    role: 'company_admin',
    companyId: uid,
    hasAgency: false,
    createdAt: serverTimestamp()
  });

  return uid;
};

export const getCompany = async (id) => {
  const docSnap = await getDoc(doc(db, COLLECTIONS.COMPANIES, id));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const getCompanies = async () => {
  const q = query(collection(db, COLLECTIONS.COMPANIES), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const subscribeToCompanies = (callback) => {
  const q = query(collection(db, COLLECTIONS.COMPANIES), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const getCompaniesByCommercial = async (commercialId) => {
  // Get all companies and filter in memory to avoid needing an index
  const q = query(collection(db, COLLECTIONS.COMPANIES), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const allCompanies = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return allCompanies.filter(company => company.commercialId === commercialId);
};

export const subscribeToCompaniesByCommercial = (commercialId, callback) => {
  const q = query(collection(db, COLLECTIONS.COMPANIES), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const allCompanies = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(allCompanies.filter(company => company.commercialId === commercialId));
  });
};

export const updateCompany = async (id, data) => {
  const docRef = doc(db, COLLECTIONS.COMPANIES, id);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  return true;
};

export const deleteCompany = async (id) => {
  await deleteDoc(doc(db, COLLECTIONS.COMPANIES, id));
  return true;
};

// ==================== AGENCIES ====================
export const createAgency = async (companyId, data) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.AGENCIES), {
    ...data,
    companyId,
    createdAt: serverTimestamp()
  });
  
  // Update the user (company admin) to set agencyId and hasAgency
  const userDoc = doc(db, COLLECTIONS.USERS, companyId);
  await updateDoc(userDoc, {
    agencyId: docRef.id,
    hasAgency: true,
    updatedAt: serverTimestamp()
  });
  
  // Also update the company document in companies collection if needed
  try {
    const companyDoc = doc(db, COLLECTIONS.COMPANIES, companyId);
    await updateDoc(companyDoc, {
      agencyId: docRef.id,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    // If company doc doesn't exist, just skip
  }
  
  return docRef.id;
};

export const getAgency = async (id) => {
  const docSnap = await getDoc(doc(db, COLLECTIONS.AGENCIES, id));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const getAgencies = async () => {
  const q = query(collection(db, COLLECTIONS.AGENCIES), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getAgenciesByCompany = async (companyId) => {
  // If companyId is not provided, return empty array
  if (!companyId) return [];
  
  try {
    const q = query(collection(db, COLLECTIONS.AGENCIES), where('companyId', '==', companyId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    // If index error or other, fall back to getting all and filtering in memory
    const allAgencies = await getAgencies();
    return allAgencies.filter(agency => agency.companyId === companyId);
  }
};

export const subscribeToAgenciesByCompany = (companyId, callback) => {
  if (!companyId) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, COLLECTIONS.AGENCIES), where('companyId', '==', companyId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, async (error) => {
    // Fallback if index missing
    const allQ = query(collection(db, COLLECTIONS.AGENCIES), orderBy('createdAt', 'desc'));
    onSnapshot(allQ, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(all.filter(a => a.companyId === companyId));
    });
  });
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

// ==================== VEHICLES ====================
export const createVehicle = async (data) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.VEHICLES), {
    ...data,
    damages: [],
    inspections: [], // For storing inspection history
    status: data.status || 'Disponible',
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getVehicles = async (filters = {}) => {
  // First, get all vehicles sorted by date
  const allQ = query(collection(db, COLLECTIONS.VEHICLES), orderBy('createdAt', 'desc'));
  const allSnap = await getDocs(allQ);
  let allVehicles = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Now filter in memory
  if (filters.companyId) {
    allVehicles = allVehicles.filter(v => v.companyId === filters.companyId);
  }
  if (filters.agencyId) {
    allVehicles = allVehicles.filter(v => v.agencyId === filters.agencyId);
  }
  
  return allVehicles;
};

export const subscribeToVehicles = (filters = {}, callback) => {
  const allQ = query(collection(db, COLLECTIONS.VEHICLES), orderBy('createdAt', 'desc'));
  return onSnapshot(allQ, (snap) => {
    let allVehicles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (filters.companyId) {
      allVehicles = allVehicles.filter(v => v.companyId === filters.companyId);
    }
    if (filters.agencyId) {
      allVehicles = allVehicles.filter(v => v.agencyId === filters.agencyId);
    }
    callback(allVehicles);
  });
};

export const getVehicle = async (id) => {
  const docSnap = await getDoc(doc(db, COLLECTIONS.VEHICLES, id));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const updateVehicle = async (id, data) => {
  const docRef = doc(db, COLLECTIONS.VEHICLES, id);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  return true;
};

export const addInspectionToVehicle = async (vehicleId, inspection) => {
  const docRef = doc(db, COLLECTIONS.VEHICLES, vehicleId);
  const docSnap = await getDoc(docRef);
  const data = docSnap.data() || {};
  await updateDoc(docRef, {
    inspections: [...(data.inspections || []), { ...inspection, id: doc(collection(db, 'inspections')).id, createdAt: serverTimestamp() }],
    mileage: inspection.mileage,
    damages: [...(data.damages || []), ...(inspection.damages || [])],
    updatedAt: serverTimestamp()
  });
  return true;
};

export const deleteVehicle = async (id) => {
  await deleteDoc(doc(db, COLLECTIONS.VEHICLES, id));
  return true;
};

// ==================== CLIENTS ====================
export const createClient = async (data) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.CLIENTS), {
    ...data,
    loyaltyPoints: 0,
    damageCount: 0,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getClients = async (filters = {}) => {
  let q = collection(db, COLLECTIONS.CLIENTS);
  const constraints = [orderBy('createdAt', 'desc')];
  if (filters.agencyId) constraints.push(where('agencyId', '==', filters.agencyId));
  if (filters.companyId) constraints.push(where('companyId', '==', filters.companyId));
  q = query(q, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const subscribeToClients = (filters = {}, callback) => {
  let q = collection(db, COLLECTIONS.CLIENTS);
  const constraints = [orderBy('createdAt', 'desc')];
  if (filters.agencyId) constraints.push(where('agencyId', '==', filters.agencyId));
  if (filters.companyId) constraints.push(where('companyId', '==', filters.companyId));
  q = query(q, ...constraints);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const getClient = async (id) => {
  const docSnap = await getDoc(doc(db, COLLECTIONS.CLIENTS, id));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const updateClient = async (id, data) => {
  const docRef = doc(db, COLLECTIONS.CLIENTS, id);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  return true;
};

export const deleteClient = async (id) => {
  await deleteDoc(doc(db, COLLECTIONS.CLIENTS, id));
  return true;
};

// ==================== INSPECTIONS ====================
export const createInspection = async (data) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.INSPECTIONS), {
    ...data,
    createdAt: serverTimestamp()
  });
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

export const getInspections = async (filters = {}) => {
  let q = collection(db, COLLECTIONS.INSPECTIONS);
  const constraints = [orderBy('createdAt', 'desc')];
  if (filters.vehicleId) constraints.push(where('vehicleId', '==', filters.vehicleId));
  if (filters.agencyId) constraints.push(where('agencyId', '==', filters.agencyId));
  if (filters.companyId) constraints.push(where('companyId', '==', filters.companyId));
  q = query(q, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const subscribeToInspections = (filters = {}, callback) => {
  let q = collection(db, COLLECTIONS.INSPECTIONS);
  const constraints = [orderBy('createdAt', 'desc')];
  if (filters.vehicleId) constraints.push(where('vehicleId', '==', filters.vehicleId));
  if (filters.agencyId) constraints.push(where('agencyId', '==', filters.agencyId));
  if (filters.companyId) constraints.push(where('companyId', '==', filters.companyId));
  q = query(q, ...constraints);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// ==================== RENTALS ====================
export const createRental = async (data) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.RENTALS), {
    ...data,
    status: 'Actif',
    createdAt: serverTimestamp()
  });
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
  const vRef = doc(db, COLLECTIONS.VEHICLES, rSnap.data().vehicleId);
  await updateDoc(vRef, { status: 'Disponible' });
  return true;
};

export const getRentals = async (filters = {}) => {
  let q = collection(db, COLLECTIONS.RENTALS);
  const constraints = [orderBy('createdAt', 'desc')];
  if (filters.agencyId) constraints.push(where('agencyId', '==', filters.agencyId));
  if (filters.companyId) constraints.push(where('companyId', '==', filters.companyId));
  q = query(q, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const subscribeToRentals = (filters = {}, callback) => {
  let q = collection(db, COLLECTIONS.RENTALS);
  const constraints = [orderBy('createdAt', 'desc')];
  if (filters.agencyId) constraints.push(where('agencyId', '==', filters.agencyId));
  if (filters.companyId) constraints.push(where('companyId', '==', filters.companyId));
  q = query(q, ...constraints);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// ==================== EMPLOYEES ====================
export const getEmployees = async (filters = {}) => {
  let q = collection(db, COLLECTIONS.EMPLOYEES);
  const constraints = [orderBy('createdAt', 'desc')];
  if (filters.agencyId) constraints.push(where('agencyId', '==', filters.agencyId));
  if (filters.companyId) constraints.push(where('companyId', '==', filters.companyId));
  q = query(q, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

// ==================== COMMERCIALS ====================
export const createCommercial = async (data) => {
  // Generate random UID (Firestore-like)
  const uid = doc(collection(db, COLLECTIONS.COMMERCIALS)).id;
  
  // Save commercial data in Firestore with the generated UID as the document ID
  await setDoc(doc(db, COLLECTIONS.COMMERCIALS, uid), {
    ...data,
    uid,
    role: 'commercial',
    createdAt: serverTimestamp()
  });

  // Also save the user in the users collection
  await setDoc(doc(db, COLLECTIONS.USERS, uid), {
    ...data,
    role: 'commercial',
    createdAt: serverTimestamp()
  });
  
  return uid;
};

export const getCommercials = async () => {
  const q = query(collection(db, COLLECTIONS.COMMERCIALS), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const subscribeToCommercials = (callback) => {
  const q = query(collection(db, COLLECTIONS.COMMERCIALS), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const getCommercial = async (id) => {
  const docSnap = await getDoc(doc(db, COLLECTIONS.COMMERCIALS, id));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const updateCommercial = async (id, data) => {
  const docRef = doc(db, COLLECTIONS.COMMERCIALS, id);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  return true;
};

export const deleteCommercial = async (id) => {
  await deleteDoc(doc(db, COLLECTIONS.COMMERCIALS, id));
  return true;
};

// ==================== OBJECTIVES ====================
export const createObjective = async (data) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.OBJECTIVES), {
    ...data,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getObjectivesByCommercial = async (commercialId) => {
  const q = query(collection(db, COLLECTIONS.OBJECTIVES), where('commercialId', '==', commercialId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const subscribeToObjectivesByCommercial = (commercialId, callback) => {
  const q = query(collection(db, COLLECTIONS.OBJECTIVES), where('commercialId', '==', commercialId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const updateObjective = async (id, data) => {
  const docRef = doc(db, COLLECTIONS.OBJECTIVES, id);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  return true;
};

// ==================== MESSAGES ====================
export const sendMessage = async (data) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.MESSAGES), {
    ...data,
    read: false,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getMessages = async (userId1, userId2) => {
  const q1 = query(
    collection(db, COLLECTIONS.MESSAGES),
    where('senderId', '==', userId1),
    where('receiverId', '==', userId2),
    orderBy('createdAt', 'asc')
  );
  const q2 = query(
    collection(db, COLLECTIONS.MESSAGES),
    where('senderId', '==', userId2),
    where('receiverId', '==', userId1),
    orderBy('createdAt', 'asc')
  );
  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const messages = [
    ...snap1.docs.map(d => ({ id: d.id, ...d.data() })),
    ...snap2.docs.map(d => ({ id: d.id, ...d.data() }))
  ].sort((a, b) => a.createdAt?.toDate() - b.createdAt?.toDate());
  return messages;
};

export const subscribeToMessages = (userId1, userId2, callback) => {
  const q1 = query(
    collection(db, COLLECTIONS.MESSAGES),
    where('senderId', '==', userId1),
    where('receiverId', '==', userId2),
    orderBy('createdAt', 'asc')
  );
  const q2 = query(
    collection(db, COLLECTIONS.MESSAGES),
    where('senderId', '==', userId2),
    where('receiverId', '==', userId1),
    orderBy('createdAt', 'asc')
  );
  
  let msgs1 = [];
  let msgs2 = [];
  
  const updateMsgs = () => {
    const combined = [...msgs1, ...msgs2].sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return timeA - timeB;
    });
    callback(combined);
  };

  const unsub1 = onSnapshot(q1, (snap) => {
    msgs1 = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateMsgs();
  });
  const unsub2 = onSnapshot(q2, (snap) => {
    msgs2 = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateMsgs();
  });

  return () => {
    unsub1();
    unsub2();
  };
};

export const markAsRead = async (messageId) => {
  const docRef = doc(db, COLLECTIONS.MESSAGES, messageId);
  await updateDoc(docRef, { read: true });
  return true;
};

export const getUnreadCount = async (userId, otherUserId) => {
  const q = query(
    collection(db, COLLECTIONS.MESSAGES),
    where('senderId', '==', otherUserId),
    where('receiverId', '==', userId),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  return snap.size;
};

export const subscribeToUnreadCount = (userId, otherUserId, callback) => {
  const q = query(
    collection(db, COLLECTIONS.MESSAGES),
    where('senderId', '==', otherUserId),
    where('receiverId', '==', userId),
    where('read', '==', false)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.size);
  });
};

// ==================== ALERTS ====================
export const createAlert = async (data) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.ALERTS), {
    ...data,
    read: false,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getAlerts = async (filters = {}) => {
  let q = collection(db, COLLECTIONS.ALERTS);
  const constraints = [orderBy('createdAt', 'desc')];
  if (filters.companyId) constraints.push(where('companyId', '==', filters.companyId));
  if (filters.userId) constraints.push(where('userId', '==', filters.userId));
  q = query(q, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const subscribeToAlerts = (filters = {}, callback) => {
  let q = collection(db, COLLECTIONS.ALERTS);
  const constraints = [orderBy('createdAt', 'desc')];
  if (filters.companyId) constraints.push(where('companyId', '==', filters.companyId));
  if (filters.userId) constraints.push(where('userId', '==', filters.userId));
  q = query(q, ...constraints);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const markAlertAsRead = async (alertId) => {
  const docRef = doc(db, COLLECTIONS.ALERTS, alertId);
  await updateDoc(docRef, { read: true });
  return true;
};

// ==================== DOCUMENTS ====================
export const uploadDocument = async (data) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.DOCUMENTS), {
    ...data,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getDocuments = async (filters = {}) => {
  let q = collection(db, COLLECTIONS.DOCUMENTS);
  const constraints = [orderBy('createdAt', 'desc')];
  if (filters.clientId) constraints.push(where('clientId', '==', filters.clientId));
  if (filters.companyId) constraints.push(where('companyId', '==', filters.companyId));
  q = query(q, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ==================== LOGS ====================
export const addLog = async (data) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.LOGS), {
    ...data,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getLogs = async (limit = 100) => {
  const q = query(collection(db, COLLECTIONS.LOGS), orderBy('createdAt', 'desc'), limitFirestore(limit));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const subscribeToLogs = (limit = 100, callback) => {
  const q = query(collection(db, COLLECTIONS.LOGS), orderBy('createdAt', 'desc'), limitFirestore(limit));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// ==================== ANALYTICS ====================
export const computeAdvancedStats = (vehicles, rentals, clients, userRole) => {
  const now = new Date();
  const currentMonth = now.getMonth();

  // Calculate MoM occupancy growth
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const activeRentalsLastMonth = rentals.filter(r => {
    const date = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
    return date.getMonth() === prevMonth && date.getFullYear() === prevMonthYear;
  }).length;
  const activeRentalsThisMonth = rentals.filter(r => {
    const date = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
    return date.getMonth() === currentMonth && date.getFullYear() === now.getFullYear();
  }).length;
  const occGrowth = activeRentalsLastMonth > 0 ? ((activeRentalsThisMonth - activeRentalsLastMonth) / activeRentalsLastMonth * 100).toFixed(0) : '0';
  const occTrend = parseInt(occGrowth) >= 0 ? `+${occGrowth}%` : `${occGrowth}%`;

  const stats = {
    totalVehicles: vehicles.length,
    rentedVehicles: vehicles.filter(v => v.status === 'Loué').length,
    availableVehicles: vehicles.filter(v => v.status === 'Disponible').length,
    maintenanceVehicles: vehicles.filter(v => v.status === 'Maintenance' || v.status === 'Litige').length,
    occupancyRate: vehicles.length > 0 ? Math.round((vehicles.filter(v => v.status === 'Loué').length / vehicles.length) * 100) : 0,
    activeRentals: rentals.filter(r => r.status === 'Actif').length,
    totalClients: clients.length,
    trends: {
      occupancy: occTrend,
      fleet: vehicles.length
    }
  };
  if (['super_admin', 'Administrateur', 'company_admin', 'company_agent'].includes(userRole)) {
    const totalRevenue = rentals.reduce((acc, r) => acc + (parseFloat(r.totalPrice) || 0), 0);
    const thisMonthRevenue = rentals
      .filter(r => {
        const date = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
        return date.getMonth() === currentMonth && date.getFullYear() === now.getFullYear();
      })
      .reduce((acc, r) => acc + (parseFloat(r.totalPrice) || 0), 0);
    const prevMonthRevenue = rentals
      .filter(r => {
        const date = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
        return date.getMonth() === prevMonth && date.getFullYear() === prevMonthYear;
      })
      .reduce((acc, r) => acc + (parseFloat(r.totalPrice) || 0), 0);
    const growthVal = prevMonthRevenue > 0 ? ((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue * 100).toFixed(1) : '0';
    const growth = parseFloat(growthVal) >= 0 ? `+${growthVal}%` : `${growthVal}%`;

    const history = Array.from({ length: 4 }).map((_, i) => {
      const d = new Date();
      d.setMonth(now.getMonth() - (3 - i));
      const monthName = d.toLocaleDateString('fr-FR', { month: 'short' });
      const monthVal = rentals
        .filter(r => {
          const date = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
          return date.getMonth() === d.getMonth() && date.getFullYear() === d.getFullYear();
        })
        .reduce((acc, r) => acc + (parseFloat(r.totalPrice) || 0), 0);
      return { name: monthName.charAt(0).toUpperCase() + monthName.slice(1), val: monthVal };
    });

    stats.revenue = {
      total: totalRevenue,
      thisMonth: thisMonthRevenue,
      growth,
      history
    };
    stats.categoryBreakdown = [
      { name: 'Citadines', val: vehicles.filter(v => v.category === 'citadine').length },
      { name: 'SUV', val: vehicles.filter(v => v.category === 'suv').length },
      { name: 'Utilitaires', val: vehicles.filter(v => v.category === 'utilitaire').length },
      { name: 'Luxe', val: vehicles.filter(v => v.category === 'luxe').length }
    ];
  } else {
    // Ensure stats.revenue exists even if not an admin/company admin
    stats.revenue = { total: 0, thisMonth: 0, growth: '+0%', history: [] };
    stats.categoryBreakdown = [];
  }
  return stats;
};

export const getAdvancedStats = async (userRole, filters = {}) => {
  let rentals, vehicles, clients;
  if (filters.companyId) {
    [rentals, vehicles, clients] = await Promise.all([
      getRentals({ companyId: filters.companyId }),
      getVehicles({ companyId: filters.companyId }),
      getClients({ companyId: filters.companyId })
    ]);
  } else if (filters.agencyId) {
    [rentals, vehicles, clients] = await Promise.all([
      getRentals({ agencyId: filters.agencyId }),
      getVehicles({ agencyId: filters.agencyId }),
      getClients({ agencyId: filters.agencyId })
    ]);
  } else {
    [rentals, vehicles, clients] = await Promise.all([
      getRentals(),
      getVehicles(),
      getClients()
    ]);
  }
  return computeAdvancedStats(vehicles, rentals, clients, userRole);
};

export const computeFleetAnalytics = (vehicles) => {
  return {
    totalVehicles: vehicles.length,
    availableVehicles: vehicles.filter(x => x.status === 'Disponible').length,
    rentedVehicles: vehicles.filter(x => x.status === 'Loué').length,
    maintenanceVehicles: vehicles.filter(x => x.status === 'Maintenance').length,
    totalDamages: vehicles.reduce((acc, curr) => acc + (curr.damages?.length || 0), 0),
    occupancyRate: vehicles.length > 0 ? Math.round((vehicles.filter(x => x.status === 'Loué').length / vehicles.length) * 100) : 0,
  };
};

export const getFleetAnalytics = async (filters = {}) => {
  const vehicles = await getVehicles(filters);
  return computeFleetAnalytics(vehicles);
};

export const getMaintenanceForecast = async (filters = {}) => {
  const vehicles = await getVehicles(filters);
  return vehicles.map(v => {
    let urgency = 'basse';
    if (v.mileage > 20000) urgency = 'haute';
    else if (v.mileage > 10000) urgency = 'moyenne';
    return {
      vehicleId: v.id,
      brand: v.brand,
      model: v.model,
      licensePlate: v.licensePlate,
      urgency,
      nextService: new Date(Date.now() + (urgency === 'haute' ? 7 : urgency === 'moyenne' ? 30 : 90) * 86400000).toISOString()
    };
  }).sort((a, b) => (a.urgency === 'haute' ? -1 : 1));
};

export const seedDatabase = async () => {
  const existing = await getVehicles();
  if (existing.length === 0) {
    await createVehicle({ brand: 'BMW', model: 'Série 3', licensePlate: 'GF-555-RT', category: 'berline', status: 'Disponible', fuel: 'Diesel' });
  }
  return true;
};

// ==================== DOSSIERS ====================
export const getVehicleDossier = async (id) => {
  const vehicle = await getVehicle(id);
  if (!vehicle) return null;
  const inspections = await getInspections({ vehicleId: id });
  
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

// ==================== INVOICES ====================
export const createInvoice = async (data) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.INVOICES), {
    ...data,
    status: data.status || 'brouillon',
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getInvoices = async (filters = {}) => {
  let q = collection(db, COLLECTIONS.INVOICES);
  const constraints = [orderBy('createdAt', 'desc')];
  if (filters.companyId) constraints.push(where('companyId', '==', filters.companyId));
  if (filters.clientId) constraints.push(where('clientId', '==', filters.clientId));
  if (filters.rentalId) constraints.push(where('rentalId', '==', filters.rentalId));
  q = query(q, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const updateInvoice = async (id, data) => {
  const docRef = doc(db, COLLECTIONS.INVOICES, id);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  return true;
};

export const deleteInvoice = async (id) => {
  await deleteDoc(doc(db, COLLECTIONS.INVOICES, id));
  return true;
};

export const subscribeToInvoices = (filters = {}, callback) => {
  let q = collection(db, COLLECTIONS.INVOICES);
  const constraints = [orderBy('createdAt', 'desc')];
  if (filters.companyId) constraints.push(where('companyId', '==', filters.companyId));
  if (filters.clientId) constraints.push(where('clientId', '==', filters.clientId));
  q = query(q, ...constraints);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// ==================== CLAIMS (SINISTRES) ====================
export const createClaim = async (data) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.CLAIMS), {
    ...data,
    status: data.status || 'a_traiter',
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getClaims = async (filters = {}) => {
  let q = collection(db, COLLECTIONS.CLAIMS);
  const constraints = [orderBy('createdAt', 'desc')];
  if (filters.companyId) constraints.push(where('companyId', '==', filters.companyId));
  if (filters.vehicleId) constraints.push(where('vehicleId', '==', filters.vehicleId));
  q = query(q, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const updateClaim = async (id, data) => {
  const docRef = doc(db, COLLECTIONS.CLAIMS, id);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  return true;
};

export const deleteClaim = async (id) => {
  await deleteDoc(doc(db, COLLECTIONS.CLAIMS, id));
  return true;
};

export const subscribeToClaims = (filters = {}, callback) => {
  let q = collection(db, COLLECTIONS.CLAIMS);
  const constraints = [orderBy('createdAt', 'desc')];
  if (filters.companyId) constraints.push(where('companyId', '==', filters.companyId));
  if (filters.vehicleId) constraints.push(where('vehicleId', '==', filters.vehicleId));
  q = query(q, ...constraints);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// ==================== CLIENT PORTAL ====================
export const createClientAccount = async (clientData, email, password) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;
  await setDoc(doc(db, COLLECTIONS.USERS, uid), {
    uid,
    email,
    role: 'client',
    clientId: clientData.id,
    firstName: clientData.firstName || '',
    lastName: clientData.lastName || '',
    companyId: clientData.companyId || null,
    agencyId: clientData.agencyId || null,
    createdAt: serverTimestamp()
  });
  // Link portal UID back to the client doc
  await updateDoc(doc(db, COLLECTIONS.CLIENTS, clientData.id), { portalUid: uid, hasPortal: true });
  return uid;
};

export const getClientByPortalUid = async (uid) => {
  const q = query(collection(db, COLLECTIONS.CLIENTS), where('portalUid', '==', uid));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};
