// Catalog of vehicle categories and their guided capture walkthrough.
// Each step has a short on-screen instruction shown while the camera is open.

const EXTERIOR_360 = [
  { id: 'front', label: 'Avant', instruction: 'Placez-vous face au véhicule, à environ 2 mètres.' },
  { id: 'front-left', label: 'Avant gauche', instruction: 'Déplacez-vous sur le coin avant gauche.' },
  { id: 'left', label: 'Côté gauche', instruction: 'Reculez pour cadrer tout le flanc gauche.' },
  { id: 'rear-left', label: 'Arrière gauche', instruction: 'Placez-vous sur le coin arrière gauche.' },
  { id: 'rear', label: 'Arrière', instruction: 'Placez-vous face à l\'arrière du véhicule.' },
  { id: 'rear-right', label: 'Arrière droit', instruction: 'Placez-vous sur le coin arrière droit.' },
  { id: 'right', label: 'Côté droit', instruction: 'Reculez pour cadrer tout le flanc droit.' },
  { id: 'front-right', label: 'Avant droit', instruction: 'Placez-vous sur le coin avant droit.' },
]

// One step per wheel — easier to get a sharp, close, well-lit photo of a
// single tire/rim than to try to fit all four in one shot.
const WHEELS_4 = [
  { id: 'wheel-front-left', label: 'Jante avant gauche', instruction: 'Cadrez la jante et le pneu avant gauche, de près.' },
  { id: 'wheel-front-right', label: 'Jante avant droite', instruction: 'Cadrez la jante et le pneu avant droit, de près.' },
  { id: 'wheel-rear-left', label: 'Jante arrière gauche', instruction: 'Cadrez la jante et le pneu arrière gauche, de près.' },
  { id: 'wheel-rear-right', label: 'Jante arrière droite', instruction: 'Cadrez la jante et le pneu arrière droit, de près.' },
]

const WHEELS_2 = [
  { id: 'wheel-front', label: 'Roue avant', instruction: 'Cadrez le pneu et la jante avant, de près.' },
  { id: 'wheel-rear', label: 'Roue arrière', instruction: 'Cadrez le pneu et la jante arrière, de près.' },
]

const SEATS = [
  { id: 'seats-front', label: 'Sièges avant', instruction: 'Cadrez les deux sièges avant.' },
  { id: 'seats-rear', label: 'Sièges arrière', instruction: 'Cadrez la banquette ou les sièges arrière.' },
]

const CAR_INTERIOR = [
  { id: 'dashboard', label: 'Tableau de bord', instruction: 'Photographiez le tableau de bord et le compteur kilométrique.' },
  ...SEATS,
  { id: 'trunk', label: 'Coffre', instruction: 'Ouvrez et photographiez le coffre vide.' },
]

const CARGO_STEP = { id: 'cargo', label: 'Zone de chargement', instruction: 'Ouvrez les portes arrière et photographiez la zone de chargement vide.' }

export const VEHICLE_CATEGORIES = [
  { id: 'citadine', label: 'Citadine', steps: [...EXTERIOR_360, ...WHEELS_4, ...CAR_INTERIOR] },
  { id: 'berline', label: 'Berline', steps: [...EXTERIOR_360, ...WHEELS_4, ...CAR_INTERIOR] },
  { id: 'suv', label: 'SUV', steps: [...EXTERIOR_360, ...WHEELS_4, ...CAR_INTERIOR] },
  { id: 'utilitaire', label: 'Utilitaire léger', steps: [...EXTERIOR_360, ...WHEELS_4, { id: 'dashboard', label: 'Tableau de bord', instruction: 'Photographiez le tableau de bord et le compteur kilométrique.' }, { id: 'seats-front', label: 'Sièges avant', instruction: 'Cadrez les sièges avant.' }, CARGO_STEP] },
  { id: 'fourgon', label: 'Fourgon', steps: [...EXTERIOR_360, ...WHEELS_4, { id: 'dashboard', label: 'Tableau de bord', instruction: 'Photographiez le tableau de bord et le compteur kilométrique.' }, { id: 'seats-front', label: 'Sièges avant', instruction: 'Cadrez les sièges avant.' }, CARGO_STEP] },
  { id: 'camion', label: 'Camion', steps: [...EXTERIOR_360, ...WHEELS_4, { id: 'dashboard', label: 'Cabine', instruction: 'Photographiez le poste de conduite et le compteur.' }, { id: 'cargo', label: 'Zone de chargement', instruction: 'Photographiez la benne ou la remorque.' }] },
  { id: 'poids-lourd', label: 'Poids lourd', steps: [...EXTERIOR_360, ...WHEELS_4, { id: 'dashboard', label: 'Cabine', instruction: 'Photographiez le poste de conduite et le compteur.' }, { id: 'cargo', label: 'Zone de chargement', instruction: 'Photographiez la benne ou la remorque.' }] },
  {
    id: 'moto', label: 'Moto', steps: [
      { id: 'front', label: 'Avant', instruction: 'Placez-vous face à la moto, à 2 mètres.' },
      { id: 'left', label: 'Côté gauche', instruction: 'Cadrez tout le flanc gauche.' },
      { id: 'right', label: 'Côté droit', instruction: 'Cadrez tout le flanc droit.' },
      { id: 'rear', label: 'Arrière', instruction: 'Placez-vous face à l\'arrière.' },
      { id: 'dashboard', label: 'Compteur', instruction: 'Photographiez le compteur et le kilométrage.' },
      { id: 'seats-front', label: 'Selle', instruction: 'Cadrez la selle.' },
      ...WHEELS_2,
    ]
  },
  {
    id: 'scooter', label: 'Scooter', steps: [
      { id: 'front', label: 'Avant', instruction: 'Placez-vous face au scooter, à 2 mètres.' },
      { id: 'left', label: 'Côté gauche', instruction: 'Cadrez tout le flanc gauche.' },
      { id: 'right', label: 'Côté droit', instruction: 'Cadrez tout le flanc droit.' },
      { id: 'rear', label: 'Arrière', instruction: 'Placez-vous face à l\'arrière.' },
      { id: 'dashboard', label: 'Compteur', instruction: 'Photographiez le compteur et le kilométrage.' },
      { id: 'seats-front', label: 'Selle', instruction: 'Cadrez la selle.' },
      ...WHEELS_2,
    ]
  },
  { id: 'engin-btp', label: 'Engin BTP', steps: [...EXTERIOR_360, { id: 'dashboard', label: 'Cabine', instruction: 'Photographiez le poste de conduite et le compteur d\'heures.' }] },
  { id: 'remorque', label: 'Remorque', steps: [EXTERIOR_360[0], EXTERIOR_360[2], EXTERIOR_360[4], EXTERIOR_360[6], ...WHEELS_2] },
  { id: 'luxe', label: 'Véhicule de luxe', steps: [...EXTERIOR_360, ...WHEELS_4, ...CAR_INTERIOR] },
  { id: 'autre', label: 'Autre', steps: [...EXTERIOR_360, ...WHEELS_4, ...CAR_INTERIOR] },
]

export function getCategorySteps(categoryId) {
  const cat = VEHICLE_CATEGORIES.find((c) => c.id === categoryId)
  return (cat || VEHICLE_CATEGORIES.find((c) => c.id === 'autre')).steps
}

export function getCategoryLabel(categoryId) {
  return VEHICLE_CATEGORIES.find((c) => c.id === categoryId)?.label || 'Véhicule'
}
