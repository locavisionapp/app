// Display config for the vehicle spec sheet. Only fields present on the
// vehicle are rendered — a scooter simply won't show a trunk volume, a
// vehicle scanned without SIV data won't show weight/dimensions, etc.
export const SPEC_GROUPS = [
  {
    title: 'Caractéristiques',
    fields: [
      { key: 'color', label: 'Couleur' },
      { key: 'transmission', label: 'Transmission' },
      { key: 'fuel', label: 'Carburant' },
      { key: 'power', label: 'Puissance', unit: 'ch' },
      { key: 'torque', label: 'Couple', unit: 'Nm' },
      { key: 'acceleration', label: '0-100 km/h', unit: 's' },
      { key: 'maxSpeed', label: 'Vitesse max', unit: 'km/h' },
      { key: 'seats', label: 'Places' },
      { key: 'doors', label: 'Portes' },
    ],
  },
  {
    title: 'Dimensions & poids',
    fields: [
      { key: 'length', label: 'Longueur', unit: 'mm' },
      { key: 'width', label: 'Largeur', unit: 'mm' },
      { key: 'height', label: 'Hauteur', unit: 'mm' },
      { key: 'weight', label: 'Poids', unit: 'kg' },
      { key: 'trunkVolume', label: 'Coffre', unit: 'L' },
    ],
  },
  {
    title: 'Environnement',
    fields: [
      { key: 'co2', label: 'CO2', unit: 'g/km' },
      { key: 'critAir', label: "Crit'Air" },
      { key: 'consumptionMixed', label: 'Consommation mixte', unit: 'L/100km' },
    ],
  },
]
