const { fetchWithTimeout } = require('./fetchWithTimeout')

const API_KEY = process.env.GEMINI_API_KEY
const MODEL_PRIORITY = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-flash-latest', 'gemini-1.5-pro']

let availableModels = []

async function discoverModels() {
  if (availableModels.length > 0) return
  if (!API_KEY) throw new Error('Missing server-side Gemini API key.')
  try {
    const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`, {}, 8000)
    if (res.ok) {
      const data = await res.json()
      const raw = data.models || []
      const sorted = []
      for (const keyword of MODEL_PRIORITY) {
        const found = raw.find((m) => m.name.includes(keyword) && m.supportedGenerationMethods.includes('generateContent'))
        if (found && !sorted.includes(found.name)) sorted.push(found.name)
      }
      availableModels = sorted.length ? sorted : ['models/gemini-1.5-flash']
    }
  } catch (e) {
    availableModels = ['models/gemini-1.5-flash']
  }
}

async function callGemini(contents, retryIndex = 0) {
  await discoverModels()
  if (retryIndex >= availableModels.length) throw new Error('Gemini: all model fallbacks exhausted.')
  const modelId = availableModels[retryIndex]
  const url = `https://generativelanguage.googleapis.com/v1beta/${modelId}:generateContent?key=${API_KEY}`
  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig: { temperature: 0.1, topP: 0.95, maxOutputTokens: 2048, response_mime_type: 'application/json' } }),
      },
      20000
    )
    const data = await response.json()
    if (response.status === 429 || response.status === 404) return callGemini(contents, retryIndex + 1)
    if (!response.ok) throw new Error(data.error?.message || 'Gemini API error')
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    return JSON.parse(text.substring(start, end + 1))
  } catch (error) {
    if (retryIndex < availableModels.length - 1) return callGemini(contents, retryIndex + 1)
    throw error
  }
}

function inlineImage(imageBase64) {
  const data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
  return { inline_data: { mime_type: 'image/jpeg', data } }
}

/** Vehicle identification fallback, used when OCR + SIV lookup both fail. */
async function extractVehicleInfoFromPlate(imageBase64) {
  const prompt = `You are a specialized vehicle expert (cars, trucks, motorcycles, construction machinery). Identify the vehicle from the photo.
  JSON format ONLY: { "licensePlate": "string", "brand": "string", "model": "string", "year": number, "vin": "string",
  "category": "citadine|berline|suv|utilitaire|fourgon|camion|poids-lourd|moto|scooter|engin-btp|remorque|luxe|autre",
  "fuel": "Essence|Diesel|Électrique|Hybride|GNR|Hydrogène", "color": "string" }`
  try {
    return await callGemini([{ parts: [{ text: prompt }, inlineImage(imageBase64)] }])
  } catch (error) {
    return { error: true, message: error.message }
  }
}

/** Quick capture validation (framing / quality) during the guided walkthrough. */
async function validateCapture(imageBase64, pointName, vehicleType = 'véhicule') {
  const prompt = `Valide cette photo pour l'étape "${pointName}" d'un(e) ${vehicleType}.
  La photo doit être claire, bien cadrée et montrer la partie demandée.
  Réponds UNIQUEMENT en JSON: { "valid": true/false, "reason": "string", "instruction": "string" }`
  return callGemini([{ parts: [{ text: prompt }, inlineImage(imageBase64)] }])
}

/** Full inspection analysis (all photos from the guided walkthrough). */
async function analyzeBatchInspection(images, vehicleType = 'véhicule') {
  const prompt = `Analyse ces photos d'inspection pour un véhicule de type ${vehicleType}.
  Fournis un diagnostic santé global en FRANÇAIS.
  Format JSON UNIQUEMENT:
  {
    "status": "green" | "orange" | "red",
    "status_label": "Excellent" | "État Standard" | "Dégâts Détectés" | "Critique",
    "summary": "Résumé global en français",
    "damages": [ { "location": "string", "type": "rayure|bosse|fissure|cassé", "severity": 1-5, "description": "string" } ],
    "health_score": 1-10
  }`
  const parts = [{ text: prompt }, ...images.map((img) => inlineImage(img.image))]
  return callGemini([{ parts }])
}

/** Diff against the vehicle's previous inspection. */
async function compareInspections(currentAnalysis, previousAnalysis) {
  const prompt = `Compare ces deux analyses d'inspection pour le même véhicule.
  Analyse Précédente: ${JSON.stringify(previousAnalysis)}
  Analyse Actuelle: ${JSON.stringify(currentAnalysis)}
  Identifie spécifiquement les NOUVEAUX dégâts qui n'existaient pas avant.
  Réponds UNIQUEMENT en JSON: { "new_damages": [], "summary": "string", "evolution": "better/worse/stable" }`
  return callGemini([{ parts: [{ text: prompt }] }])
}

module.exports = { extractVehicleInfoFromPlate, validateCapture, analyzeBatchInspection, compareInspections }
