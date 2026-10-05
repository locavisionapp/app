const { fetchWithTimeout } = require('./fetchWithTimeout')

const API_KEY = process.env.GEMINI_API_KEY
// Prefer Google's self-updating "-latest" aliases over dated model names:
// dated names get deprecated/removed every few months (this list has already
// gone stale once — see git history), while "-latest" always resolves to
// whatever Google currently considers the best model in that tier, with no
// maintenance needed on our side. The dated names at the end are a last
// resort in case an alias is ever pulled entirely.
const MODEL_PRIORITY = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-pro-latest', 'gemini-2.5-flash', 'gemini-2.5-pro']

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
      availableModels = sorted.length ? sorted : ['models/gemini-flash-latest']
    }
  } catch (e) {
    availableModels = ['models/gemini-flash-latest']
  }
}

/**
 * Calls Gemini, falling back through availableModels on quota/availability
 * errors. `timeoutMs` is per attempt, `maxAttempts` caps the fallback chain
 * and `budgetMs` caps the whole call (all attempts together), so it can never
 * outlive the serverless function's own time limit (vercel.json maxDuration).
 */
async function callGemini(contents, { timeoutMs = 20000, maxAttempts = 3, budgetMs = 45000, deadline } = {}, retryIndex = 0) {
  deadline = deadline || Date.now() + budgetMs
  await discoverModels()
  const lastIndex = Math.min(availableModels.length, maxAttempts) - 1
  if (retryIndex > lastIndex) throw new Error('Gemini: all model fallbacks exhausted.')
  const attemptTimeout = Math.min(timeoutMs, deadline - Date.now())
  if (attemptTimeout < 2000) throw new Error('Gemini: time budget exhausted.')
  const modelId = availableModels[retryIndex]
  const url = `https://generativelanguage.googleapis.com/v1beta/${modelId}:generateContent?key=${API_KEY}`
  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig: { temperature: 0.1, topP: 0.95, maxOutputTokens: 8192, response_mime_type: 'application/json' } }),
      },
      attemptTimeout
    )
    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || `Gemini API error (${response.status})`)
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error(`Gemini returned no content (${data.candidates?.[0]?.finishReason || 'unknown reason'})`)
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    return JSON.parse(text.substring(start, end + 1))
  } catch (error) {
    if (retryIndex < lastIndex) return callGemini(contents, { timeoutMs, maxAttempts, deadline }, retryIndex + 1)
    throw error
  }
}

function inlineImage(imageBase64) {
  const data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
  return { inline_data: { mime_type: 'image/jpeg', data } }
}

/** Vehicle identification fallback, used when OCR + SIV lookup both fail. */
async function extractVehicleInfoFromPlate(imageBase64) {
  const prompt = `You are a specialized vehicle expert (cars, trucks, motorcycles, construction machinery). Identify the vehicle from the photo and fill in as many technical specs as you can from your general knowledge of this make/model/year — leave a field null rather than guessing wildly if you're not confident.
  JSON format ONLY: { "licensePlate": "string", "brand": "string", "model": "string", "year": number, "vin": "string",
  "category": "citadine|berline|suv|utilitaire|fourgon|camion|poids-lourd|moto|scooter|engin-btp|remorque|luxe|autre",
  "fuel": "Essence|Diesel|Électrique|Hybride|GNR|Hydrogène", "transmission": "Manuelle|Automatique|Hydrostatique", "color": "string",
  "seats": number, "doors": number, "power": number, "torque": number, "acceleration": number, "maxSpeed": number,
  "length": number, "width": number, "height": number, "weight": number, "trunkVolume": number,
  "co2": number, "critAir": number, "consumptionMixed": number }`
  try {
    return await callGemini([{ parts: [{ text: prompt }, inlineImage(imageBase64)] }], { timeoutMs: 15000, maxAttempts: 2, budgetMs: 15000 })
  } catch (error) {
    return { error: true, message: error.message }
  }
}

/**
 * Fills in the spec-sheet fields a SIV lookup didn't provide (many SIV
 * providers only return brand/model/year/fuel), from Gemini's general
 * knowledge of the confirmed make/model/year — no image involved, so it's a
 * much more reliable lookup than identifying a vehicle from a photo.
 */
async function enrichVehicleSpecs({ brand, model, year, category }) {
  const prompt = `Vehicle: ${brand} ${model}${year ? `, model year ${year}` : ''} (category: ${category || 'unknown'}).
  From your general automotive knowledge of this exact make/model/year, give its typical technical specs.
  Leave a field null if you're not confident rather than guessing wildly.
  JSON format ONLY: { "transmission": "Manuelle|Automatique|Hydrostatique",
  "seats": number, "doors": number, "power": number, "torque": number, "acceleration": number, "maxSpeed": number,
  "length": number, "width": number, "height": number, "weight": number, "trunkVolume": number,
  "co2": number, "critAir": number, "consumptionMixed": number }`
  try {
    return await callGemini([{ parts: [{ text: prompt }] }], { timeoutMs: 12000, maxAttempts: 2, budgetMs: 15000 })
  } catch (error) {
    return {}
  }
}

/** Quick capture validation (framing / quality) during the guided walkthrough. */
async function validateCapture(imageBase64, pointName, vehicleType = 'véhicule') {
  const prompt = `Valide cette photo pour l'étape "${pointName}" d'un(e) ${vehicleType}.
  La photo doit être claire, bien cadrée et montrer la partie demandée.
  Réponds UNIQUEMENT en JSON: { "valid": true/false, "reason": "string", "instruction": "string" }`
  return callGemini([{ parts: [{ text: prompt }, inlineImage(imageBase64)] }], { timeoutMs: 12000, maxAttempts: 2, budgetMs: 20000 })
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
  // 16 photos take a while to analyze: allow one long attempt, and a
  // fallback model only with whatever time is left of the 60s function limit.
  return callGemini([{ parts }], { timeoutMs: 45000, maxAttempts: 2, budgetMs: 48000 })
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

module.exports = { extractVehicleInfoFromPlate, enrichVehicleSpecs, validateCapture, analyzeBatchInspection, compareInspections }
