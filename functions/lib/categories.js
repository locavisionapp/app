// Mirrors src/config/vehicleCategories.js labels (kept minimal server-side —
// only used to phrase AI prompts, not to drive the guided capture UI).
const LABELS = {
  citadine: 'Citadine', berline: 'Berline', suv: 'SUV', utilitaire: 'Utilitaire léger',
  fourgon: 'Fourgon', camion: 'Camion', 'poids-lourd': 'Poids lourd', moto: 'Moto',
  scooter: 'Scooter', 'engin-btp': 'Engin BTP', remorque: 'Remorque', luxe: 'Véhicule de luxe', autre: 'Véhicule',
}

function getCategoryLabel(categoryId) {
  return LABELS[categoryId] || 'Véhicule'
}

module.exports = { getCategoryLabel }
