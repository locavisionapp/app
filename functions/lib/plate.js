/**
 * License plate identification pipeline, run server-side (third-party keys
 * never leave Cloud Functions / the Vercel function), cheapest step first:
 * 1. Gemini Flash-Lite reads the plate (~0.0001 €); accepted only for a
 *    confident, well-formed French plate — otherwise PlateRecognizer
 *    (specialized OCR, paid per lookup beyond its free tier) reads it.
 * 2. SIV registry -> spec sheet, cached forever per plate (shared by all
 *    customers: a plate is never paid for twice).
 * 3. Gemini fallback -> identify the vehicle from the photo if all else fails.
 */
const { extractVehicleInfoFromPlate, enrichVehicleSpecs, readPlateText } = require('./ai')
const { db } = require('./db')
const { fetchWithTimeout } = require('./fetchWithTimeout')

const PLATE_RECOGNIZER_TOKEN = process.env.PLATE_RECOGNIZER_TOKEN
const RAPIDAPI_KEY = process.env.SIV_API_KEY

const SIV_PLATE = /^[A-Z]{2}-?\d{3}-?[A-Z]{2}$/

/** Plate text from a photo: cheap AI read when it's unambiguous, specialized OCR otherwise. */
async function ocrPlateFromImage(imageBase64) {
  try {
    const read = await readPlateText(imageBase64)
    const plate = String(read?.plate || '').toUpperCase().replace(/\s+/g, '')
    if (SIV_PLATE.test(plate) && Number(read?.confidence) >= 0.85) return plate
  } catch (e) {
    console.warn('[Pipeline] AI plate read skipped:', e.message)
  }
  return ocrWithPlateRecognizer(imageBase64)
}

async function ocrWithPlateRecognizer(imageBase64) {
  if (!PLATE_RECOGNIZER_TOKEN) return null

  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
  const buffer = Buffer.from(base64Data, 'base64')
  const formData = new FormData()
  formData.append('upload', new Blob([buffer], { type: 'image/jpeg' }), 'plate.jpg')
  formData.append('regions', 'fr')

  const response = await fetchWithTimeout(
    'https://api.platerecognizer.com/v1/plate-reader/',
    { method: 'POST', headers: { Authorization: `Token ${PLATE_RECOGNIZER_TOKEN}` }, body: formData },
    8000
  )
  if (!response.ok) return null

  const data = await response.json()
  const best = data.results?.[0]
  return best?.plate?.toUpperCase() || null
}

/**
 * Registry data rarely changes for a given plate: cache it (no expiry) so
 * each plate costs one SIV call ever, across all customers. Only technical
 * vehicle data is cached — nothing about the owner.
 */
async function fetchVehicleDataFromSIV(plate) {
  if (!plate) return null
  const key = plate.replace(/[\s-]/g, '').toUpperCase()
  const cacheRef = db.collection('sivCache').doc(key)
  try {
    const cached = await cacheRef.get()
    if (cached.exists) return { ...cached.data().data, licensePlate: plate }
  } catch (e) {
    console.warn('[SIV] cache read failed:', e.message)
  }
  const data = await fetchVehicleDataFromSIVProviders(plate)
  if (data?.brand) cacheRef.set({ data, cachedAt: Date.now() }).catch((e) => console.warn('[SIV] cache write failed:', e.message))
  return data
}

async function fetchVehicleDataFromSIVProviders(plate) {
  if (!RAPIDAPI_KEY || !plate) return null

  const cleanPlate = plate.replace(/[\s-]/g, '').toUpperCase()
  let dashedPlate = cleanPlate
  if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(cleanPlate)) {
    dashedPlate = `${cleanPlate.substring(0, 2)}-${cleanPlate.substring(2, 5)}-${cleanPlate.substring(5, 7)}`
  }

  const endpoints = [
    {
      url: `https://api-de-plaque-d-immatriculation-france.p.rapidapi.com/?plaque=${dashedPlate}`,
      host: 'api-de-plaque-d-immatriculation-france.p.rapidapi.com',
      extraHeaders: { plaque: dashedPlate, 'Content-Type': 'application/json' },
    },
    {
      url: `https://immatriculation.p.rapidapi.com/immatriculation?immatriculation=${cleanPlate}`,
      host: 'immatriculation.p.rapidapi.com',
    },
    {
      url: `https://checkcar.p.rapidapi.com/api/car?plate=${cleanPlate}&country=FR`,
      host: 'checkcar.p.rapidapi.com',
    },
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetchWithTimeout(
        endpoint.url,
        { headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': endpoint.host, ...(endpoint.extraHeaders || {}) } },
        6000
      )
      if (!response.ok) continue
      const data = await response.json()
      if (!data || data.error) continue
      return normalizeSIVResponse(data, plate)
    } catch (e) {
      console.warn(`[SIV] ${endpoint.host} exception:`, e.message)
    }
  }
  return null
}

function normalizeSIVResponse(rawData, originalPlate) {
  const data = rawData.data || rawData.vehicle || rawData

  const marque = data.marque || data.brand || data.make || data.Marque || data.AWN_marque || ''
  const modele = data.modele || data.model || data.Modele || data.commercial_name || data.AWN_modele || ''
  const rawDate = data.annee_premiere_immatriculation || data.Date_1ere_Mise_En_Circulation || data.first_registration_date || data.AWN_date_mise_en_circulation
  const annee = rawDate ? new Date(rawDate.split('-').reverse().join('-')).getFullYear() : data.year || data.annee || null
  const carburant = data.energieNGC || data.energie || data.fuel_type || data.carburant || data.fuel || data.AWN_energie || ''
  const puissance = data.puissance_din || data.puissance || data.power_hp || data.puisFisc || data.AWN_puissance_fiscale || null
  const co2 = data.co2 || data.CO2 || data.Taux_De_CO2 || data.AWN_taux_de_co2 || null
  const vin = data.vin || data.VIN || data.numero_serie || data.AWN_numero_de_serie || ''
  const seats = data.nbPlaces || data.places || data.seats || null
  const doors = data.nbPortes || data.doors || null
  const weight = data.poidsAVide || data.weight || data.AWN_poids_a_vide || null

  const fuelMap = {
    ES: 'Essence', GO: 'Diesel', EL: 'Électrique', GH: 'Hybride', EH: 'Hybride', GN: 'GNV',
    gasoline: 'Essence', diesel: 'Diesel', electric: 'Électrique', hybrid: 'Hybride', petrol: 'Essence',
  }
  const normalizedFuel = fuelMap[carburant?.toUpperCase?.()] || fuelMap[carburant?.toLowerCase?.()] || carburant || 'Essence'

  return {
    licensePlate: originalPlate,
    brand: marque,
    model: modele,
    year: annee ? parseInt(annee) : null,
    fuel: normalizedFuel,
    power: puissance ? parseInt(puissance) : null,
    co2: co2 ? parseInt(co2) : null,
    vin: vin || '',
    category: guessCategoryFromModel(modele, marque),
    color: data.couleur || data.color || '',
    transmission: data.boite_vitesses || data.transmission || 'Manuelle',
    seats: seats ? parseInt(seats) : null,
    doors: doors ? parseInt(doors) : null,
    weight: weight ? parseInt(weight) : null,
  }
}

function guessCategoryFromModel(model, brand) {
  const text = `${model} ${brand}`.toLowerCase()
  if (text.includes('suv') || text.includes('4x4') || text.includes('crossover')) return 'suv'
  if (text.includes('van') || text.includes('fourgon') || text.includes('sprinter')) return 'fourgon'
  if (text.includes('truck') || text.includes('camion') || text.includes('semi')) return 'camion'
  if (text.includes('moto') || text.includes('cbr') || text.includes('gsxr')) return 'moto'
  if (text.includes('scooter')) return 'scooter'
  if (text.includes('berline') || text.includes('308') || text.includes('classe c')) return 'berline'
  return 'citadine'
}

const ENRICHABLE_FIELDS = [
  'seats', 'doors', 'power', 'torque', 'acceleration', 'maxSpeed',
  'length', 'width', 'height', 'weight', 'trunkVolume', 'co2', 'critAir', 'consumptionMixed',
]

/**
 * Most SIV providers only reliably return brand/model/year/fuel — the rest
 * of the spec sheet comes back null more often than not. When that happens,
 * ask Gemini to fill the gaps from its general knowledge of the now-confirmed
 * make/model/year (see ai.js#enrichVehicleSpecs). SIV-confirmed values are
 * never overwritten.
 */
async function enrichSparseSpecs(vehicleData) {
  const knownCount = ENRICHABLE_FIELDS.filter((f) => vehicleData[f] != null).length
  // specsSource flags whether the spec sheet is registry-confirmed (SIV) or
  // an AI estimate from general make/model/year knowledge — surfaced in the
  // UI so nobody mistakes a plausible guess for a certified fact.
  if (knownCount >= 4) return { ...vehicleData, specsSource: vehicleData.specsSource || 'siv' }

  try {
    const enrichment = await enrichVehicleSpecs(vehicleData)
    const merged = { ...vehicleData, specsSource: 'estimated' }
    for (const field of ENRICHABLE_FIELDS) {
      if (merged[field] == null && enrichment[field] != null) merged[field] = enrichment[field]
    }
    if (!merged.transmission && enrichment.transmission) merged.transmission = enrichment.transmission
    return merged
  } catch (e) {
    console.warn('[Pipeline] Spec enrichment skipped:', e.message)
    return { ...vehicleData, specsSource: vehicleData.specsSource || null }
  }
}

/**
 * Canonical plate format, so the same vehicle is always stored (and
 * de-duplicated) under one string whether it was OCR'd ("AB123CD"), typed
 * ("ab 123 cd") or sent by an API client. Current French SIV plates become
 * "AB-123-CD"; anything else (old FNI plates, foreign plates) is just
 * upper-cased with spaces/dashes collapsed.
 */
function normalizePlate(value) {
  const compact = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(compact)) return `${compact.slice(0, 2)}-${compact.slice(2, 5)}-${compact.slice(5)}`
  return String(value || '').toUpperCase().trim().replace(/[\s-]+/g, '-').replace(/^-|-$/g, '')
}

/** Plate text typed by the user -> vehicle spec sheet (registry lookup only, no image). */
async function identifyVehicleFromPlateText(plateText) {
  const plate = normalizePlate(plateText)
  try {
    const sivData = await fetchVehicleDataFromSIV(plate)
    if (sivData?.brand) return { ...(await enrichSparseSpecs(sivData)), licensePlate: plate }
  } catch (e) {
    console.warn('[Pipeline] SIV lookup failed:', e.message)
  }
  return { error: true, message: 'Véhicule introuvable dans le registre.', licensePlate: plate }
}

/**
 * Full pipeline: photo -> plate text -> vehicle spec sheet. `findExisting`
 * (plate -> fleet record or null) short-circuits the registry lookup when
 * the vehicle is already in the fleet.
 */
async function identifyVehicleFromPlateImage(imageBase64, { findExisting } = {}) {
  let plate = null
  try {
    plate = await ocrPlateFromImage(imageBase64)
  } catch (e) {
    console.warn('[Pipeline] PlateRecognizer skipped:', e.message)
  }
  if (plate) plate = normalizePlate(plate)

  if (plate && findExisting) {
    const existing = await findExisting(plate)
    if (existing) return existing
  }

  if (plate) {
    try {
      const sivData = await fetchVehicleDataFromSIV(plate)
      if (sivData?.brand) return { ...(await enrichSparseSpecs(sivData)), licensePlate: plate }
    } catch (e) {
      console.warn('[Pipeline] SIV skipped:', e.message)
    }
  }

  // Fallback: ask Gemini to identify the vehicle directly from the image.
  try {
    const fallback = await extractVehicleInfoFromPlate(imageBase64)
    if (fallback && !fallback.error) {
      const fallbackPlate = normalizePlate(plate || fallback.licensePlate)
      if (fallbackPlate && findExisting) {
        const existing = await findExisting(fallbackPlate)
        if (existing) return existing
      }
      const enriched = await enrichSparseSpecs(fallback)
      return { ...enriched, licensePlate: normalizePlate(plate || enriched.licensePlate) }
    }
  } catch (e) {
    console.warn('[Pipeline] Gemini fallback failed:', e.message)
  }

  return { error: true, message: "Impossible d'identifier la plaque.", licensePlate: plate }
}

module.exports = {
  identifyVehicleFromPlateImage,
  identifyVehicleFromPlateText,
  normalizePlate,
  ocrPlateFromImage,
  fetchVehicleDataFromSIV,
  enrichSparseSpecs,
}
