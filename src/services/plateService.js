/**
 * plateService.js
 * Chaîne d'identification de plaque d'immatriculation :
 * 1. PlateRecognizer API  → OCR image → texte de la plaque
 * 2. RapidAPI SIV         → texte plaque → données techniques véhicule
 * 3. Gemini (fallback)    → si les APIs externes échouent
 */

const PLATE_RECOGNIZER_TOKEN = import.meta.env.VITE_PLATE_RECOGNIZER_TOKEN;
const RAPIDAPI_KEY            = import.meta.env.VITE_SIV_API_KEY;

// ─────────────────────────────────────────────────────────────
// ÉTAPE 1 : OCR de la plaque via PlateRecognizer
// ─────────────────────────────────────────────────────────────

/**
 * Envoie l'image base64 à PlateRecognizer et retourne le texte de la plaque.
 * @param {string} imageBase64 - data:image/jpeg;base64,... ou base64 pur
 * @returns {Promise<string|null>} - ex: "AB-123-CD" ou null si échec
 */
export async function ocrPlateFromImage(imageBase64) {
  if (!PLATE_RECOGNIZER_TOKEN) {
    console.warn('[PlateRecognizer] Token manquant');
    return null;
  }

  try {
    // Convertir le base64 en Blob pour l'API multipart
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const byteChars  = atob(base64Data);
    const byteNums   = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
    const blob = new Blob([new Uint8Array(byteNums)], { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('upload', blob, 'plate.jpg');
    formData.append('regions', 'fr'); // Optimisé pour les plaques françaises

    // En dev, on passe par le proxy Vite pour éviter CORS
    const isDevMode = import.meta.env.DEV;
    const apiUrl = isDevMode
      ? '/api/platerecognizer/v1/plate-reader/'
      : 'https://api.platerecognizer.com/v1/plate-reader/';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { Authorization: `Token ${PLATE_RECOGNIZER_TOKEN}` },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[PlateRecognizer] Erreur:', response.status, err);
      return null;
    }

    const data = await response.json();
    const bestResult = data.results?.[0];
    if (!bestResult) return null;

    const rawPlate = bestResult.plate?.toUpperCase() || null;
    console.info('[PlateRecognizer] Plaque détectée:', rawPlate, '| Confiance:', bestResult.score);
    return rawPlate;
  } catch (err) {
    console.error('[PlateRecognizer] Exception:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// ÉTAPE 2 : Données techniques via RapidAPI SIV France
// ─────────────────────────────────────────────────────────────

/**
 * Interroge l'API SIV via RapidAPI pour obtenir les données du véhicule.
 * @param {string} plate - ex: "AB-123-CD"
 * @returns {Promise<object|null>} - données normalisées ou null si échec
 */
export async function fetchVehicleDataFromSIV(plate) {
  if (!RAPIDAPI_KEY || !plate) return null;

  // Nettoyer la plaque (enlever tirets/espaces, mettre en majuscules)
  const cleanPlate = plate.replace(/[\s-]/g, '').toUpperCase();
  
  // L'API de la capture d'écran demande un format avec tirets "FH-034-DD" pour les plaques SIV (7 caractères)
  let dashedPlate = cleanPlate;
  if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(cleanPlate)) {
    dashedPlate = `${cleanPlate.substring(0, 2)}-${cleanPlate.substring(2, 5)}-${cleanPlate.substring(5, 7)}`;
  }

  const isDevMode = import.meta.env.DEV;

  // Endpoints avec support proxy Vite (dev) ou direct (prod)
  const endpoints = [
    {
      // Nouvelle API "API De Plaque D'immatriculation (France)" ajoutée par l'utilisateur
      url: isDevMode
        ? `/api/rapidapi-france/?plaque=${dashedPlate}`
        : `https://api-de-plaque-d-immatriculation-france.p.rapidapi.com/?plaque=${dashedPlate}`,
      host: 'api-de-plaque-d-immatriculation-france.p.rapidapi.com',
      extraHeaders: {
        'plaque': dashedPlate,
        'Content-Type': 'application/json'
      }
    },
    {
      url: isDevMode
        ? `/api/rapidapi-immat/immatriculation?immatriculation=${cleanPlate}`
        : `https://immatriculation.p.rapidapi.com/immatriculation?immatriculation=${cleanPlate}`,
      host: 'immatriculation.p.rapidapi.com',
    },
    {
      url: isDevMode
        ? `/api/rapidapi-checkcar/api/car?plate=${cleanPlate}&country=FR`
        : `https://checkcar.p.rapidapi.com/api/car?plate=${cleanPlate}&country=FR`,
      host: 'checkcar.p.rapidapi.com',
    },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': endpoint.host,
          ...(endpoint.extraHeaders || {})
        },
      });

      if (!response.ok) {
        console.warn(`[RapidAPI SIV] ${endpoint.host} → ${response.status}`);
        continue;
      }

      const data = await response.json();
      if (!data || data.error) continue;

      console.info('[RapidAPI SIV] Données reçues:', data);

      // Normaliser les données (les différentes APIs ont des formats variés)
      return normalizeSIVResponse(data, plate);
    } catch (err) {
      console.warn(`[RapidAPI SIV] ${endpoint.host} exception:`, err.message);
    }
  }

  return null;
}

/**
 * Normalise la réponse SIV (différents formats possibles selon l'API)
 * vers le format interne de LocaVision.
 */
function normalizeSIVResponse(rawData, originalPlate) {
  // Extraire le payload si les données sont imbriquées (comme dans la nouvelle API Autoways)
  const data = rawData.data || rawData.vehicle || rawData;

  // Format Autoways / immatriculationapi
  const marque = data.marque || data.brand || data.make || data.Marque || data.Marque_BMM || data.AWN_marque || data.AWN_Marque || '';
  const modele  = data.modele || data.model || data.Modele || data.Modele_BMM || data.commercial_name || data.AWN_modele || data.AWN_Modele || '';
  
  // Date de mise en circulation
  const rawDate = data.annee_premiere_immatriculation || data.Date_1ere_Mise_En_Circulation || data.first_registration_date || data.date1erCir_us || data.date1erCir_fr || data.AWN_date_mise_en_circulation || data.AWN_Date_1ere_Mise_En_Circulation;
  const annee   = rawDate
    ? new Date(rawDate.split('-').reverse().join('-')).getFullYear()
    : data.year || data.Year || data.annee || null;
    
  const carburant = data.energieNGC || data.energie || data.fuel_type || data.Energie || data.carburant || data.fuel || data.AWN_energie || data.AWN_Energie || '';
  const puissance = data.puissance_din || data.puissance || data.power_hp || data.cv || data.puisFisc || data.Puissance_Fiscale || data.AWN_puissance_fiscale || data.AWN_Puissance_Fiscale || null;
  const co2       = data.co2 || data.CO2 || data.co2Emission || data.Taux_De_CO2 || data.AWN_emission_co_2 || data.AWN_Taux_De_CO2 || null;
  const vin       = data.vin || data.VIN || data.numero_serie || data.Numero_De_Serie || data.AWN_numero_de_serie || data.AWN_Numero_De_Serie || '';

  const fuelMap = {
    ES: 'Essence', GO: 'Diesel', EL: 'Électrique',
    GH: 'Hybride', EH: 'Hybride', GN: 'GNV',
    gasoline: 'Essence', diesel: 'Diesel', electric: 'Électrique',
    hybrid: 'Hybride', petrol: 'Essence',
    1: 'Essence', 2: 'Diesel', 3: 'Électrique',
    4: 'Hybride', 5: 'GPL', 6: 'GNV',
  };
  const normalizedFuel = fuelMap[carburant?.toUpperCase()] || fuelMap[carburant?.toLowerCase()] || fuelMap[carburant] || carburant || 'Essence';

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
    // Champs supplémentaires si disponibles
    color: data.couleur || data.color || '',
    critAir: co2 ? guessCritAir(parseInt(co2)) : null,
    transmission: data.boite_vitesses || data.boite_vitesse || data.transmission || 'Manuelle',
  };
}

function guessCategoryFromModel(model, brand) {
  const text = `${model} ${brand}`.toLowerCase();
  if (text.includes('suv') || text.includes('4x4') || text.includes('crossover')) return 'suv';
  if (text.includes('van') || text.includes('fourgon') || text.includes('transit') || text.includes('sprinter')) return 'fourgon';
  if (text.includes('truck') || text.includes('camion') || text.includes('semi')) return 'camion';
  if (text.includes('moto') || text.includes('scooter') || text.includes('cbr') || text.includes('gsxr')) return 'moto';
  if (text.includes('berline') || text.includes('308') || text.includes('3 series') || text.includes('classe c')) return 'berline';
  return 'citadine';
}

function guessCritAir(co2) {
  if (co2 === 0)    return 0; // Électrique
  if (co2 <= 60)   return 1;
  if (co2 <= 100)  return 1;
  if (co2 <= 120)  return 2;
  if (co2 <= 150)  return 3;
  if (co2 <= 190)  return 4;
  return 5;
}

// ─────────────────────────────────────────────────────────────
// PIPELINE COMPLET : Image → Plaque → Données véhicule
// ─────────────────────────────────────────────────────────────

/**
 * Pipeline principal :
 * 1. OCR plaque (PlateRecognizer)
 * 2. Lookup SIV (RapidAPI)
 *
 * @param {string} imageBase64 - image de la plaque (data URI ou base64)
 * @returns {Promise<{source: string, plate: string|null, data: object}>}
 */
export async function identifyVehicleFromPlateImage(imageBase64) {
  let detectedPlate = null;

  // ── Étape 1 : OCR PlateRecognizer ──
  try {
    detectedPlate = await ocrPlateFromImage(imageBase64);
  } catch (e) {
    console.warn('[Pipeline] PlateRecognizer skipped:', e.message);
  }

  // ── Étape 2 : SIV RapidAPI ──
  if (detectedPlate) {
    try {
      const sivData = await fetchVehicleDataFromSIV(detectedPlate);
      if (sivData && sivData.brand) {
        return { source: 'rapidapi-siv', plate: detectedPlate, data: sivData };
      }
    } catch (e) {
      console.warn('[Pipeline] RapidAPI SIV skipped:', e.message);
    }
  }

  // ── Échec total ──
  console.error('[Pipeline] Échec de l\'identification PlateRecognizer/RapidAPI.');
  return { source: 'error', plate: detectedPlate, data: { error: true, message: "Impossible d'identifier la plaque via les services SIV" } };
}
