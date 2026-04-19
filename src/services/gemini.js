const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let availableModels = [];

/**
 * Découverte dynamique
 */
async function discoverModels() {
  if (availableModels.length > 0) return;
  if (!API_KEY) throw new Error("Clé API manquante.");
  try {
    const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    if (listResponse.ok) {
      const listData = await listResponse.json();
      const priorities = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-flash-latest', 'gemini-1.5-pro', 'gemini-pro'];
      const sorted = [];
      const rawModels = listData.models || [];
      for (const keyword of priorities) {
        const found = rawModels.find(m => m.name.includes(keyword) && m.supportedGenerationMethods.includes('generateContent'));
        if (found && !sorted.includes(found.name)) sorted.push(found.name);
      }
      availableModels = sorted.length > 0 ? sorted : ['models/gemini-1.5-flash'];
    }
  } catch (e) {
    availableModels = ['models/gemini-1.5-flash'];
  }
}

/**
 * Appel API avec fallback
 */
async function callGemini(contents, retryIndex = 0) {
  await discoverModels();
  if (retryIndex >= availableModels.length) throw new Error("Échec global de l'IA.");
  const modelId = availableModels[retryIndex];
  const url = `https://generativelanguage.googleapis.com/v1beta/${modelId}:generateContent?key=${API_KEY}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.1, topP: 0.95, maxOutputTokens: 2048, response_mime_type: 'application/json' } })
    });
    const data = await response.json();
    if (response.status === 429 || response.status === 404) return callGemini(contents, retryIndex + 1);
    if (!response.ok) throw new Error(data.error?.message || "Erreur API");
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    return JSON.parse(text.substring(start, end + 1));
  } catch (error) {
    if (retryIndex < availableModels.length - 1) return callGemini(contents, retryIndex + 1);
    throw error;
  }
}

/**
 * Identification Multi-Véhicule (Voiture, Camion, Moto, BTP)
 */
export const extractVehicleInfoFromPlate = async (plateOrImage) => {
  const isImage = typeof plateOrImage === 'string' && (plateOrImage.startsWith('data:image') || plateOrImage.length > 100);
  try {
    const prompt = `You are a specialized vehicle expert (Cars, Trucks, Motorcycles, Construction Machinery/BTP). Identify the asset.
    - Fields: brand, model, year, licensePlate (or Asset ID), vin
    - category: (citadine|berline|suv|utilitaire|fourgon|camion|poids-lourd|moto|scooter|engin-btp|remorque|luxe)
    - fuel: (Essence|Diesel|Électrique|Hybride|GNR|Hydrogène)
    - transmission: (Manuelle|Automatique|Hydrostatique)
    - Technical Specs: power (CV), torque (Nm), acceleration (0-100), maxSpeed (km/h)
    - Dimensions: length (mm), width (mm), height (mm), weight (kg), trunkVolume (L)
    - Fleet Info: co2, critAir, consumptionMixed, maintenanceInterval (km or months)
    
    JSON format ONLY (be as precise as possible, search your knowledge base):
    { 
      "licensePlate": "string", "brand": "string", "model": "string", "year": number, "vin": "string", 
      "category": "string", "fuel": "string", "transmission": "string", "color": "string", 
      "seats": number, "doors": number, "power": number, "torque": number, "acceleration": number,
      "maxSpeed": number, "length": number, "width": number, "height": number, "weight": number, 
      "trunkVolume": number, "co2": number, "critAir": number, "consumptionMixed": number, 
      "maintenanceInterval": "string" 
    }`;

    let parts = [{ text: prompt }];
    if (isImage) {
      const data = plateOrImage.split(',')[1] || plateOrImage;
      parts.push({ inline_data: { mime_type: 'image/jpeg', data } });
    } else {
      parts[0].text += ` Identify: ${plateOrImage}`;
    }

    return await callGemini([{ parts }]);
  } catch (error) {
    return { error: true, message: error.message, brand: 'Inconnu', model: 'Inconnu', licensePlate: isImage ? 'Scanner' : plateOrImage, category: 'autre' };
  }
};

/**
 * Analyse Globale de l'Inspection (Toutes les photos)
 */
export const analyzeBatchInspection = async (images, vehicleType = 'vehicle') => {
  const prompt = `Analyse ces photos d'inspection pour un véhicule de type ${vehicleType}. 
  Fournis un diagnostic santé global en FRANÇAIS.
  
  Format JSON UNIQUEMENT:
  {
    "status": "green" | "orange" | "red",
    "status_label": "Excellent" | "État Standard" | "Dégâts Détectés" | "Critique",
    "summary": "Résumé global en français",
    "damages": [
       { "location": "Zone (ex: Pare-chocs avant, Aile gauche, etc.)", "type": "rayure|bosse|fissure|cassé", "severity": 1-5, "description": "Description courte en français" }
    ],
    "health_score": 1-10
  }`;


  const parts = [{ text: prompt }];
  
  // Combine all images (capped at 8 for context limits if needed, but Gemini 2.0/1.5 handles many)
  images.forEach(img => {
    const data = img.image.includes(',') ? img.image.split(',')[1] : img.image;
    parts.push({ inline_data: { mime_type: 'image/jpeg', data } });
  });
  return await callGemini([{ parts }]);
};

/**
 * Analyse de dégâts (Solo - Legacy support)
 */
export const analyzeVehicleImage = async (imageBase64, vehicleType = 'vehicle') => {
  const prompt = `Analyze this ${vehicleType} for damages. Respond with JSON: { "damages": [], "overall_condition": 1-10 }`;
  const data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  return callGemini([{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data } }] }]);
};


/**
 * Validation RAPIDE d'une capture (Qualité & Contenu)
 */
export const validateCapture = async (imageBase64, pointName, vehicleType = 'véhicule') => {
  const prompt = `Valide cette photo pour l'étape "${pointName}" d'un(e) ${vehicleType}.
  La photo doit être claire, bien cadrée et montrer la partie demandée.
  
  Réponds UNIQUEMENT en JSON:
  {
    "valid": true/false,
    "reason": "Ex: Trop sombre ou Mauvais angle",
    "instruction": "Ex: Reculez de 1 mètre"
  }`;
  
  const data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  return callGemini([{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data } }] }]);
};

/**
 * Analyse Différentielle (Comparaison avec ancien scan)
 */
export const compareInspections = async (currentAnalysis, previousAnalysis) => {
  const prompt = `Compare ces deux analyses d'inspection pour le même véhicule.
  Analyse Précédente: ${JSON.stringify(previousAnalysis)}
  Analyse Actuelle: ${JSON.stringify(currentAnalysis)}
  
  Identifie spécifiquement les NOUVEAUX dégâts qui n'existaient pas avant.
  Réponds UNIQUEMENT en JSON:
  {
    "new_damages": [], 
    "summary": "Résumé des changements depuis la dernière fois en français",
    "evolution": "better/worse/stable"
  }`;
  
  return callGemini([{ parts: [{ text: prompt }] }]);
};