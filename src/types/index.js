export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',       // Administrateur global
  COMMERCIAL: 'commercial',         // Commercial de LocaVision
  COMPANY_ADMIN: 'company_admin',   // Responsable de l'entreprise
  COMPANY_AGENT: 'company_agent',   // Employé de l'entreprise (commercial interne)
  CLIENT: 'client'                  // Client final (locataire)
};

export const SUBSCRIPTION_TYPES = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
};

export const PAYMENT_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
};

export const VEHICLE_STATUS = {
  AVAILABLE: 'Disponible',
  RENTED: 'Loué',
  MAINTENANCE: 'Maintenance',
  DISPUTE: 'Litige'
};

export const VEHICLE_CATEGORIES = {
  UTILITY: 'utilitaire',
  SEDAN: 'citadine',
  SUV: 'suv',
  VAN: 'fourgon',
  LUXURY: 'luxe'
};

export const INSPECTION_TYPES = {
  CHECKOUT: 'checkout',
  CHECKIN: 'checkin'
};

export const DAMAGE_TYPES = {
  SCRATCH: 'scratch',
  DENT: 'dent',
  BROKEN_GLASS: 'broken_glass',
  OTHER: 'other'
};

export const DAMAGE_LOCATIONS = {
  FRONT: 'front',
  REAR: 'rear',
  LEFT: 'left',
  RIGHT: 'right',
  ROOF: 'roof',
  INTERIOR: 'interior'
};

export const ALERT_TYPES = {
  FINANCIAL: 'financial',
  MAINTENANCE: 'maintenance',
  TECHNICAL_CONTROL: 'technical_control',
  SUBSCRIPTION: 'subscription'
};
