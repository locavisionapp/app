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

// Reasoning-token cap for the damage analysis (env-tunable without a deploy
// of code: raise it if precision ever drops, lower it to save more).
const ANALYSIS_THINKING_BUDGET = Number(process.env.ANALYSIS_THINKING_BUDGET) || 3072

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

/** Model fallback order for a tier: 'lite' = cheapest model first (simple checks), 'standard' = best value first. */
function modelsFor(tier) {
  if (tier !== 'lite') return availableModels
  const lite = availableModels.filter((m) => m.includes('lite'))
  return [...lite, ...availableModels.filter((m) => !lite.includes(m))]
}

/**
 * Calls Gemini, falling back through the tier's models on quota/availability
 * errors. `timeoutMs` is per attempt, `maxAttempts` caps the fallback chain
 * and `budgetMs` caps the whole call (all attempts together), so it can never
 * outlive the serverless function's own time limit (vercel.json maxDuration).
 *
 * Cost controls: `tier: 'lite'` routes simple tasks to Flash-Lite (~3x
 * cheaper input, ~6x cheaper output); `thinkingBudget` caps the model's
 * internal reasoning tokens, billed as output — the most expensive part
 * (0 = no reasoning, for tasks that don't need it).
 */
async function callGemini(contents, opts = {}, retryIndex = 0) {
  const { timeoutMs = 20000, maxAttempts = 3, budgetMs = 45000, maxOutputTokens = 8192, tier = 'standard', thinkingBudget } = opts
  const deadline = opts.deadline || Date.now() + budgetMs
  await discoverModels()
  const models = modelsFor(tier)
  const lastIndex = Math.min(models.length, maxAttempts) - 1
  if (retryIndex > lastIndex) throw new Error('Gemini: all model fallbacks exhausted.')
  const attemptTimeout = Math.min(timeoutMs, deadline - Date.now())
  if (attemptTimeout < 2000) throw new Error('Gemini: time budget exhausted.')
  const modelId = models[retryIndex]
  const url = `https://generativelanguage.googleapis.com/v1beta/${modelId}:generateContent?key=${API_KEY}`
  const generationConfig = { temperature: 0.1, topP: 0.95, maxOutputTokens, response_mime_type: 'application/json' }
  if (thinkingBudget != null && !opts.noThinkingConfig) generationConfig.thinkingConfig = { thinkingBudget }
  try {
    const response = await fetchWithTimeout(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents, generationConfig }) },
      attemptTimeout
    )
    const data = await response.json()
    if (!response.ok) {
      // A model that doesn't accept this thinking setting: same model, default thinking.
      if (response.status === 400 && generationConfig.thinkingConfig && /thinking/i.test(data.error?.message || '')) {
        return callGemini(contents, { ...opts, deadline, noThinkingConfig: true }, retryIndex)
      }
      throw new Error(data.error?.message || `Gemini API error (${response.status})`)
    }
    const text = (data.candidates?.[0]?.content?.parts || []).filter((p) => p.text && !p.thought).map((p) => p.text).join('')
    if (!text) throw new Error(`Gemini returned no content (${data.candidates?.[0]?.finishReason || 'unknown reason'})`)
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    return JSON.parse(text.substring(start, end + 1))
  } catch (error) {
    if (retryIndex < lastIndex) return callGemini(contents, { ...opts, deadline, noThinkingConfig: false }, retryIndex + 1)
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
    return await callGemini([{ parts: [{ text: prompt }, inlineImage(imageBase64)] }], { timeoutMs: 15000, maxAttempts: 2, budgetMs: 15000, thinkingBudget: 512 })
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
    return await callGemini([{ parts: [{ text: prompt }] }], { timeoutMs: 12000, maxAttempts: 2, budgetMs: 15000, tier: 'lite', thinkingBudget: 0, maxOutputTokens: 1024 })
  } catch (error) {
    return {}
  }
}

/** Reads the license plate text only (cheap model, no reasoning). */
async function readPlateText(imageBase64) {
  const prompt = `Lis la plaque d'immatriculation visible sur la photo. Réponds UNIQUEMENT en JSON :
  { "plate": "texte exact de la plaque, sans espaces, ou null si illisible", "confidence": nombre entre 0 et 1 }`
  return callGemini([{ parts: [{ text: prompt }, inlineImage(imageBase64)] }], { timeoutMs: 8000, maxAttempts: 1, budgetMs: 8000, tier: 'lite', thinkingBudget: 0, maxOutputTokens: 128 })
}

/** Quick capture validation (framing / quality) during the guided walkthrough. */
async function validateCapture(imageBase64, pointName, vehicleType = 'véhicule') {
  const prompt = `Valide cette photo pour l'étape "${pointName}" d'un(e) ${vehicleType}.
  La photo doit être claire, bien cadrée et montrer la partie demandée.
  Réponds UNIQUEMENT en JSON, phrases de 10 mots max : { "valid": true/false, "reason": "string", "instruction": "string" }`
  return callGemini([{ parts: [{ text: prompt }, inlineImage(imageBase64)] }], { timeoutMs: 12000, maxAttempts: 2, budgetMs: 20000, tier: 'lite', thinkingBudget: 0, maxOutputTokens: 512 })
}

/**
 * Inspection analysis. Two modes:
 * - baseline (no `reference`): list every visible defect on the vehicle;
 * - comparison: also given the photos of the previous validated inspection
 *   and the vehicle's known defects (validated, and dismissed false
 *   positives), classify each defect seen now as known / worse / new, and
 *   report known defects no longer visible.
 * Every defect points at the photo it's best seen on (`photo_index`, into
 * the CURRENT photos) with a bounding box, so a human can check it.
 * Photos are labelled inline ("PHOTO ACTUELLE #3") so indexes are reliable.
 */
async function analyzeInspection({ current, reference = [], knownDamages = [], dismissedDamages = [], vehicleType = 'véhicule' }) {
  const comparison = reference.length > 0 || knownDamages.length > 0
  const known = knownDamages.map((d) => ({ id: d.id, location: d.location, type: d.type, severity: d.severity, description: d.description }))
  const dismissed = dismissedDamages.map((d) => ({ id: d.id, location: d.location, description: d.description }))

  const prompt = `Tu es un expert en inspection de véhicules de location (état des lieux départ/retour). Véhicule : ${vehicleType}.
Ton objectif est la PRÉCISION : repère le moindre défaut visible sur les PHOTOS ACTUELLES — rayures même fines, éclats de peinture, bosses même légères, impacts/fissures de vitrage, jantes frottées ou rayées, pneus abîmés, optiques fêlées, pare-chocs déformés ou mal fixés, rétroviseurs abîmés, taches ou déchirures intérieures.
Ignore les reflets, la saleté, l'eau, les ombres et les éléments de décor : ne signale que des défauts réels du véhicule. Si un défaut apparaît sur plusieurs photos, ne le liste qu'UNE fois (sur la photo où il est le plus visible).
${comparison ? `
MODE COMPARAISON. Les PHOTOS DE RÉFÉRENCE montrent le véhicule lors de la dernière inspection validée.
Défauts CONNUS (déjà validés) : ${JSON.stringify(known)}
Éléments déjà écartés par un humain (ce NE sont PAS des défauts, ne les signale pas comme nouveaux) : ${JSON.stringify(dismissed)}
Pour chaque défaut visible sur les photos actuelles :
- s'il correspond à un défaut connu inchangé : "known_id" = son id, "change" = "same" ;
- s'il correspond à un défaut connu qui s'est aggravé (plus grand, plus profond, nouveau dégât au même endroit) : "known_id" = son id, "change" = "worse" ;
- s'il correspond à un élément écarté : "known_id" = son id, "change" = "same" ;
- sinon c'est un NOUVEAU défaut : "known_id" = null, "change" = "new". Compare attentivement avec les photos de référence pour ne rien rater.
Liste dans "missing_known_ids" les défauts connus que tu ne vois plus alors que la zone est bien visible (réparés ?).` : `
MODE RÉFÉRENCE (premier état des lieux) : liste TOUS les défauts existants, "known_id" = null, "change" = "new".`}

Réponds UNIQUEMENT en JSON :
{
  "status": "green" | "orange" | "red",
  "status_label": "string court en français",
  "summary": "résumé en français, 2 phrases max${comparison ? ', centré sur ce qui a changé depuis la référence' : ''}",
  "health_score": 1-10,
  "damages": [ {
    "location": "zone précise du véhicule (ex: aile avant gauche, bas de porte arrière droite)",
    "type": "rayure|éclat|bosse|fissure|impact|cassé|usure|tache|déchirure|autre",
    "severity": 1-5,
    "description": "description précise et courte",
    "photo_index": numéro de la PHOTO ACTUELLE où le défaut est le plus visible,
    "box_2d": [ymin, xmin, ymax, xmax] position du défaut sur cette photo, entiers de 0 à 1000,
    "known_id": "id" | null,
    "change": "new" | "same" | "worse"
  } ],
  "missing_known_ids": []
}`

  const parts = [{ text: prompt }]
  reference.forEach((img, i) => parts.push({ text: `PHOTO DE RÉFÉRENCE #${i}` }, inlineImage(img.image)))
  current.forEach((img, i) => parts.push({ text: `PHOTO ACTUELLE #${i}` }, inlineImage(img.image)))
  // Many images (up to ~80 in comparison mode) take a while: one long
  // attempt, plus a fallback model only with what's left of the function's
  // time limit (vercel.json maxDuration = 120s).
  // Damage detection keeps the best-value model and some reasoning (that's
  // what makes it precise), but capped: reasoning tokens are billed as output.
  return callGemini([{ parts }], { timeoutMs: 95000, maxAttempts: 2, budgetMs: 105000, maxOutputTokens: 16384, thinkingBudget: ANALYSIS_THINKING_BUDGET })
}

module.exports = { extractVehicleInfoFromPlate, enrichVehicleSpecs, validateCapture, analyzeInspection, readPlateText }
