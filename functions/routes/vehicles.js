const express = require('express')
const { randomUUID } = require('crypto')
const { db, FieldValue } = require('../lib/db')
const { requireRole, requireModule } = require('../lib/auth')
const { asyncRoute, ApiError } = require('../lib/asyncRoute')
const { identifyVehicleFromPlateImage, identifyVehicleFromPlateText, normalizePlate, enrichSparseSpecs } = require('../lib/plate')
const { validateCapture, analyzeInspection } = require('../lib/ai')
const {
  uploadInspectionPhoto,
  downloadInspectionPhotos,
  inspectionPhotoPath,
  toPhotoUrls,
  deleteVehiclePhotos,
  WEBHOOK_URL_TTL_MS,
} = require('../lib/storage')
const { getCategoryLabel } = require('../lib/categories')
const { dispatchWebhook } = require('../lib/webhooks')
const { buildInspectionReport, PURPOSE_LABELS } = require('../lib/report')
const { fetchWithTimeout } = require('../lib/fetchWithTimeout')
const { sendEmail, emailEnabled } = require('../lib/email')

const router = express.Router()
const companyRole = requireRole('company_admin', 'employee')
const adminOnly = requireRole('company_admin')
const fleetModule = requireModule('fleet')
const scanModule = requireModule('scan')

const MAX_PHOTOS_PER_INSPECTION = 60 // quick walk-around: ~25-45 frames + close-ups
const PLATE_MAX_LENGTH = 20
const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/
const STEP_ID_PATTERN = /^[A-Za-z0-9_-]{1,60}$/
// A crashed/timed-out analysis leaves its lock behind; past this age a retry
// may take it over.
const INSPECTION_LOCK_TTL_MS = 150 * 1000

// Optional spec sheet fields, populated from plate scan / SIV lookup / AI
// fallback when available. Whitelisted here so a client can never inject
// arbitrary Firestore fields through vehicle creation.
const STRING_SPEC_FIELDS = { color: 40, transmission: 30, specsSource: 20 }
const NUMBER_SPEC_FIELDS = [
  'seats', 'doors', 'power', 'torque', 'acceleration', 'maxSpeed',
  'length', 'width', 'height', 'weight', 'trunkVolume', 'co2', 'critAir', 'consumptionMixed',
]

function extractSpecs(body) {
  const specs = {}
  for (const [field, maxLen] of Object.entries(STRING_SPEC_FIELDS)) {
    if (body[field] != null) specs[field] = String(body[field]).slice(0, maxLen)
  }
  for (const field of NUMBER_SPEC_FIELDS) {
    const n = Number(body[field])
    if (body[field] != null && Number.isFinite(n)) specs[field] = n
  }
  return specs
}

function vehiclesCol(companyId) {
  return db.collection('companies').doc(companyId).collection('vehicles')
}

function parseLimit(value, fallback, max) {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(n, max)
}

function parseMileage(value) {
  if (value == null || value === '') return null
  const mileage = Number(value)
  if (!Number.isFinite(mileage) || mileage < 0 || mileage > 2_000_000) throw new ApiError(400, 'Kilométrage invalide.')
  return Math.round(mileage)
}

/** Finds a vehicle by plate, matching both the canonical and compact spellings (older records may lack dashes). */
async function findVehicleByPlate(companyId, plate) {
  const variants = [...new Set([plate, plate.replace(/-/g, '')])]
  const snap = await vehiclesCol(companyId).where('licensePlate', 'in', variants).limit(1).get()
  return snap.empty ? null : snap.docs[0]
}

async function getVehicleOr404(companyId, vehicleId) {
  const ref = vehiclesCol(companyId).doc(vehicleId)
  const doc = await ref.get()
  if (!doc.exists) throw new ApiError(404, 'Véhicule introuvable.')
  return { ref, doc }
}

/**
 * Public shape of an inspection. Photos are stored as private Storage paths
 * and turned into short-lived signed URLs here; inspections from before that
 * change stored public URLs in `photos`, passed through unchanged.
 */
async function serializeInspection(req, id, data, ttlMs) {
  const { photoPaths, photos, signatures, ...rest } = data
  const urls = await toPhotoUrls(photoPaths || photos || [], { ttlMs, baseUrl: `${req.protocol}://${req.get('host')}` })
  // Signature images only go into the PDF report; the API exposes who signed and when.
  const signed = Object.fromEntries(
    Object.entries(signatures || {}).map(([role, sig]) => [role, { name: sig.name, email: sig.email || null, signedAt: sig.signedAt }])
  )
  return { id, ...rest, signatures: signed, photos: urls, status_label: rest.statusLabel ?? null, health_score: rest.healthScore ?? null }
}

// The AI request carries every photo inline; keep it well under Gemini's
// ~20MB request limit (base64 adds a third).
const AI_IMAGE_BUDGET_BYTES = 13 * 1024 * 1024
const DAMAGE_STATUSES = ['open', 'repaired', 'dismissed']

function damageId() {
  return `dmg_${randomUUID().replace(/-/g, '').slice(0, 12)}`
}

/** Evenly keeps as many items as fit in `budget` bytes (sizes from `sizeOf`). */
function fitToBudget(items, sizeOf, budget) {
  const total = items.reduce((sum, it) => sum + sizeOf(it), 0)
  if (total <= budget) return items
  const keep = Math.max(1, Math.floor((items.length * budget) / total))
  const step = items.length / keep
  return Array.from({ length: keep }, (_, i) => items[Math.floor(i * step)])
}

/**
 * Sanitizes the model's damage list: stable ids, photo index/box clamped to
 * real values, and known/dismissed references only to ids that exist.
 */
function normalizeDamages(raw, photoCount, knownIds) {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, 100).map((d) => {
    const photoIndex = Number.isInteger(Number(d?.photo_index)) ? Math.min(Math.max(Number(d.photo_index), 0), photoCount - 1) : null
    const box = Array.isArray(d?.box_2d) && d.box_2d.length === 4 && d.box_2d.every((n) => Number.isFinite(Number(n)))
      ? d.box_2d.map((n) => Math.min(Math.max(Math.round(Number(n)), 0), 1000))
      : null
    const knownId = d?.known_id && knownIds.has(String(d.known_id)) ? String(d.known_id) : null
    const change = !knownId ? 'new' : d?.change === 'worse' ? 'worse' : 'same'
    return {
      id: damageId(),
      location: String(d?.location || 'Zone non précisée').slice(0, 120),
      type: String(d?.type || 'autre').slice(0, 30),
      severity: Math.min(Math.max(Math.round(Number(d?.severity) || 1), 1), 5),
      description: String(d?.description || '').slice(0, 400),
      photoIndex,
      box,
      knownId,
      change,
    }
  })
}

/** knownDamages with lastSeenAt refreshed for defects re-seen unchanged. */
function matchedKnownUpdate(known, damages, at) {
  const seen = new Set(damages.filter((d) => d.knownId).map((d) => d.knownId))
  if (!seen.size) return {}
  return { knownDamages: known.map((k) => (seen.has(k.id) ? { ...k, lastSeenAt: at } : k)) }
}

/** Inspection status from what changed: comparison mode only counts new/worse defects. */
function statusFromDamages(damages, comparison, aiStatus) {
  const relevant = comparison ? damages.filter((d) => d.change !== 'same') : damages
  if (relevant.length === 0) return comparison ? 'green' : ['green', 'orange', 'red'].includes(aiStatus) ? aiStatus : 'green'
  return relevant.some((d) => d.severity >= 3) ? 'red' : 'orange'
}

/** Vehicle as returned by GET /vehicles/:id: known defects get a signed URL to their photo. */
async function serializeVehicle(req, doc) {
  const data = doc.data()
  const known = data.knownDamages || []
  const urls = await toPhotoUrls(known.map((d) => d.photoPath || ''), { baseUrl: `${req.protocol}://${req.get('host')}` })
  return {
    id: doc.id,
    ...data,
    knownDamages: known.map(({ photoPath, ...d }, i) => ({ ...d, photoUrl: photoPath ? urls[i] : null })),
  }
}

router.post(
  '/scan-plate',
  companyRole,
  scanModule,
  asyncRoute(async (req, res) => {
    const { image } = req.body
    if (!image || typeof image !== 'string') throw new ApiError(400, 'Image manquante.')
    const result = await identifyVehicleFromPlateImage(image, {
      findExisting: async (plate) => {
        const doc = await findVehicleByPlate(req.auth.companyId, plate)
        return doc ? { ...doc.data(), id: undefined, existingVehicleId: doc.id, licensePlate: doc.data().licensePlate } : null
      },
    })
    // 200 even on failure: lets the client fall back to manual entry instead
    // of treating a "couldn't read the plate" outcome as a hard error.
    res.json(result)
  })
)

/**
 * Typed plate -> vehicle identification. A plate already in the fleet is
 * answered from it (no registry call, no cost) with `existingVehicleId`;
 * otherwise the SIV registry is queried. 200 with `error: true` when not
 * found, so the client can ask for brand/model by hand.
 */
router.post(
  '/lookup-plate',
  companyRole,
  scanModule,
  asyncRoute(async (req, res) => {
    const raw = String(req.body?.licensePlate || '')
    const plate = normalizePlate(raw)
    if (plate.replace(/-/g, '').length < 2 || plate.length > PLATE_MAX_LENGTH) throw new ApiError(400, 'Plaque invalide.')
    const existing = await findVehicleByPlate(req.auth.companyId, plate)
    if (existing) return res.json({ ...existing.data(), id: undefined, existingVehicleId: existing.id, licensePlate: plate })
    res.json(await identifyVehicleFromPlateText(plate))
  })
)

/**
 * Fleet listing, newest first, paginated: `?limit=` (default 50, max 200)
 * and `?cursor=` (the id from the previous page's X-Next-Cursor response
 * header). The body stays a plain array so existing integrations keep
 * working; X-Next-Cursor is absent on the last page.
 */
router.get(
  '/vehicles',
  companyRole,
  fleetModule,
  asyncRoute(async (req, res) => {
    const col = vehiclesCol(req.auth.companyId)
    const limit = parseLimit(req.query.limit, 50, 200)
    const cursor = req.query.cursor ? String(req.query.cursor) : null
    const filters = {
      agencyId: req.query.agencyId ? String(req.query.agencyId) : null,
      city: req.query.city ? String(req.query.city) : null,
      category: req.query.category ? String(req.query.category) : null,
      lastStatus: req.query.status ? String(req.query.status) : null,
    }
    const q = String(req.query.q || '').trim().toLowerCase()

    let page = null
    if (!q) {
      // Fast path: filters and pagination run in Firestore, so a request
      // only reads the documents it returns.
      try {
        let query = col
        for (const [field, value] of Object.entries(filters)) {
          if (value) query = query.where(field, '==', value)
        }
        query = query.orderBy('createdAt', 'desc')
        if (cursor) {
          const cursorDoc = await col.doc(cursor).get()
          if (cursorDoc.exists) query = query.startAfter(cursorDoc)
        }
        const snap = await query.limit(limit + 1).get()
        const docs = snap.docs.slice(0, limit)
        page = {
          vehicles: docs.map((d) => ({ id: d.id, ...d.data() })),
          nextCursor: snap.docs.length > limit ? docs[docs.length - 1].id : null,
        }
      } catch (e) {
        // FAILED_PRECONDITION = composite index for this filter combination
        // not deployed (see firestore.indexes.json): fall through to the
        // in-memory path rather than failing the request.
        if (e.code !== 9) throw e
        console.warn('[vehicles] missing Firestore index, falling back to in-memory filtering:', e.message)
      }
    }

    if (!page) {
      // Free-text search (Firestore has no "contains" query) or missing
      // index: scan the most recent vehicles and filter in memory.
      const snap = await col.orderBy('createdAt', 'desc').limit(1000).get()
      let vehicles = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      if (filters.agencyId) vehicles = vehicles.filter((v) => v.agencyId === filters.agencyId)
      if (filters.city) vehicles = vehicles.filter((v) => (v.city || '').toLowerCase() === filters.city.toLowerCase())
      if (filters.category) vehicles = vehicles.filter((v) => v.category === filters.category)
      if (filters.lastStatus) vehicles = vehicles.filter((v) => v.lastStatus === filters.lastStatus)
      if (q) {
        const compactQ = q.replace(/[\s-]/g, '')
        vehicles = vehicles.filter(
          (v) =>
            [v.brand, v.model, v.vin].some((f) => String(f || '').toLowerCase().includes(q)) ||
            String(v.licensePlate || '').toLowerCase().replace(/[\s-]/g, '').includes(compactQ)
        )
      }
      const start = cursor ? vehicles.findIndex((v) => v.id === cursor) + 1 : 0
      const slice = vehicles.slice(start, start + limit)
      page = { vehicles: slice, nextCursor: start + limit < vehicles.length ? slice[slice.length - 1].id : null }
    }

    if (page.nextCursor) res.set('X-Next-Cursor', page.nextCursor)
    res.json(page.vehicles)
  })
)

router.post(
  '/vehicles',
  companyRole,
  fleetModule,
  asyncRoute(async (req, res) => {
    const { licensePlate, brand, model, year, category, fuel, vin, agencyId } = req.body
    if (!licensePlate || typeof licensePlate !== 'string' || !licensePlate.trim() || licensePlate.length > PLATE_MAX_LENGTH) {
      throw new ApiError(400, 'Plaque manquante ou invalide.')
    }
    const plate = normalizePlate(licensePlate)
    if (plate.replace(/-/g, '').length < 2) throw new ApiError(400, 'Plaque manquante ou invalide.')

    let city = null
    if (agencyId) {
      const agencyDoc = await db.collection('companies').doc(req.auth.companyId).collection('agencies').doc(String(agencyId)).get()
      if (!agencyDoc.exists) throw new ApiError(400, 'Agence invalide.')
      city = agencyDoc.data().city || null
    }

    const col = vehiclesCol(req.auth.companyId)
    const existing = await findVehicleByPlate(req.auth.companyId, plate)
    if (existing) {
      // Re-scanning a known plate opens its existing record (and history)
      // instead of creating a duplicate.
      return res.json({ id: existing.id, ...existing.data() })
    }

    const maxVehicles = req.company?.license?.limits?.maxVehicles
    if (maxVehicles) {
      const count = await col.count().get()
      if (count.data().count >= maxVehicles) throw new ApiError(403, `Limite de ${maxVehicles} véhicule(s) atteinte pour votre licence.`)
    }

    let specs = extractSpecs(req.body)
    // Manual entry only gives us brand/model/category — the scan pipeline
    // already enriches its own result (specsSource is set) before it reaches
    // this endpoint, so this only fires for genuinely un-enriched input.
    // Re-whitelist through extractSpecs so only spec fields (never
    // brand/model/year/category) can flow from the enrichment result.
    if (brand && model && !specs.specsSource) {
      specs = extractSpecs(await enrichSparseSpecs({ brand, model, year, category, ...specs }))
    }

    const vehicle = {
      licensePlate: plate,
      brand: (brand || 'Inconnu').toString().slice(0, 60),
      model: (model || '').toString().slice(0, 60),
      year: year != null && year !== '' && Number.isFinite(Number(year)) ? Number(year) : null,
      category: (category || 'autre').toString().slice(0, 40),
      fuel: fuel ? String(fuel).slice(0, 30) : null,
      vin: (vin || '').toString().slice(0, 30),
      agencyId: agencyId ? String(agencyId) : null,
      city,
      mileage: null,
      ...specs,
      pricing: { dailyRate: 0, currency: 'EUR' },
      lastStatus: null,
      lastInspectionId: null,
      createdAt: Date.now(),
    }
    const ref = await col.add(vehicle)
    dispatchWebhook(req.auth.companyId, 'vehicle.created', { id: ref.id, ...vehicle })
    res.status(201).json({ id: ref.id, ...vehicle })
  })
)

// ---- CSV exports (Excel-friendly: ';' separator, UTF-8 BOM, French dates) ----

function csvCell(value) {
  if (value == null) return ''
  const s = String(value)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(header, rows) {
  return '\uFEFF' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')
}

function csvDate(ms) {
  return ms ? new Date(ms).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) : ''
}

async function allVehicles(companyId) {
  const snap = await vehiclesCol(companyId).orderBy('createdAt', 'desc').limit(5000).get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

function sendCsv(res, name, csv) {
  res.set('Content-Type', 'text/csv; charset=utf-8')
  res.set('Content-Disposition', `attachment; filename="${name}_${new Date().toISOString().slice(0, 10)}.csv"`)
  res.send(csv)
}

const STATUS_FR = { green: 'Bon état', orange: 'À surveiller', red: 'Dégâts détectés' }

router.get(
  '/vehicles/export.csv',
  companyRole,
  fleetModule,
  asyncRoute(async (req, res) => {
    const vehicles = await allVehicles(req.auth.companyId)
    const rows = vehicles.map((v) => [
      v.licensePlate, v.brand, v.model, v.year, v.category, v.fuel, v.vin, v.city,
      v.mileage, v.pricing?.dailyRate, STATUS_FR[v.lastStatus] || '', csvDate(v.lastInspectionAt),
      (v.knownDamages || []).filter((d) => d.status === 'open').length, v.pendingReviewCount || 0, csvDate(v.createdAt),
    ])
    sendCsv(res, 'flotte', toCsv(
      ['Plaque', 'Marque', 'Modèle', 'Année', 'Type', 'Carburant', 'VIN', 'Ville', 'Kilométrage', 'Tarif/jour (EUR)', 'Dernier état', 'Dernière inspection', 'Défauts ouverts', 'Inspections à valider', 'Ajouté le'],
      rows
    ))
  })
)

router.get(
  '/damages/export.csv',
  companyRole,
  fleetModule,
  asyncRoute(async (req, res) => {
    const vehicles = await allVehicles(req.auth.companyId)
    const statusFr = { open: 'Ouvert', repaired: 'Réparé', dismissed: 'Écarté' }
    const rows = []
    for (const v of vehicles) {
      for (const d of v.knownDamages || []) {
        if (d.status === 'dismissed' && req.query.all !== '1') continue
        rows.push([v.licensePlate, `${v.brand || ''} ${v.model || ''}`.trim(), d.location, d.type, d.severity, d.description, statusFr[d.status] || d.status, csvDate(d.firstSeenAt), csvDate(d.lastSeenAt), csvDate(d.repairedAt)])
      }
    }
    sendCsv(res, 'defauts', toCsv(['Plaque', 'Véhicule', 'Zone', 'Type', 'Gravité (1-5)', 'Description', 'Statut', 'Relevé le', 'Vu pour la dernière fois', 'Réparé le'], rows))
  })
)

router.get(
  '/vehicles/:id',
  companyRole,
  fleetModule,
  asyncRoute(async (req, res) => {
    const { doc } = await getVehicleOr404(req.auth.companyId, req.params.id)
    res.json(await serializeVehicle(req, doc))
  })
)

// Deleting a vehicle erases its whole inspection history (records + photos):
// admins only.
router.delete(
  '/vehicles/:id',
  adminOnly,
  fleetModule,
  asyncRoute(async (req, res) => {
    const { ref } = await getVehicleOr404(req.auth.companyId, req.params.id)
    await db.recursiveDelete(ref) // vehicle doc + its inspections subcollection
    await deleteVehiclePhotos(req.auth.companyId, req.params.id)
    dispatchWebhook(req.auth.companyId, 'vehicle.deleted', { id: req.params.id })
    res.status(204).end()
  })
)

router.put(
  '/vehicles/:id/pricing',
  companyRole,
  fleetModule,
  asyncRoute(async (req, res) => {
    const dailyRate = Number(req.body?.dailyRate)
    if (!Number.isFinite(dailyRate) || dailyRate < 0 || dailyRate > 100000) {
      throw new ApiError(400, 'Tarif invalide.')
    }
    const { ref } = await getVehicleOr404(req.auth.companyId, req.params.id)
    const currency = /^[A-Z]{3}$/.test(String(req.body?.currency || '')) ? req.body.currency : 'EUR'
    await ref.set({ pricing: { dailyRate, currency } }, { merge: true })
    const doc = await ref.get()
    res.json({ id: doc.id, ...doc.data() })
  })
)

router.put(
  '/vehicles/:id/mileage',
  companyRole,
  fleetModule,
  asyncRoute(async (req, res) => {
    const mileage = parseMileage(req.body?.mileage)
    if (mileage == null) throw new ApiError(400, 'Kilométrage invalide.')
    const { ref } = await getVehicleOr404(req.auth.companyId, req.params.id)
    await ref.set({ mileage, mileageUpdatedAt: Date.now() }, { merge: true })
    const doc = await ref.get()
    res.json({ id: doc.id, ...doc.data() })
  })
)

router.put(
  '/vehicles/:id/agency',
  companyRole,
  fleetModule,
  asyncRoute(async (req, res) => {
    const { ref } = await getVehicleOr404(req.auth.companyId, req.params.id)

    const agencyId = req.body?.agencyId ? String(req.body.agencyId) : null
    let city = null
    if (agencyId) {
      const agencyDoc = await db.collection('companies').doc(req.auth.companyId).collection('agencies').doc(agencyId).get()
      if (!agencyDoc.exists) throw new ApiError(400, 'Agence invalide.')
      city = agencyDoc.data().city || null
    }

    await ref.set({ agencyId, city }, { merge: true })
    const doc = await ref.get()
    res.json({ id: doc.id, ...doc.data() })
  })
)

/** Inspection history, newest first, paginated like /vehicles (default 20, max 100). */
router.get(
  '/vehicles/:id/inspections',
  companyRole,
  fleetModule,
  asyncRoute(async (req, res) => {
    const limit = parseLimit(req.query.limit, 20, 100)
    const col = vehiclesCol(req.auth.companyId).doc(req.params.id).collection('inspections')
    let query = col.orderBy('createdAt', 'desc')
    if (req.query.cursor) {
      const cursorDoc = await col.doc(String(req.query.cursor)).get()
      if (cursorDoc.exists) query = query.startAfter(cursorDoc)
    }
    const snap = await query.limit(limit + 1).get()
    const docs = snap.docs.slice(0, limit)
    if (snap.docs.length > limit) res.set('X-Next-Cursor', docs[docs.length - 1].id)
    res.json(await Promise.all(docs.map((d) => serializeInspection(req, d.id, d.data()))))
  })
)

router.get(
  '/vehicles/:id/inspections/:inspectionId',
  companyRole,
  fleetModule,
  asyncRoute(async (req, res) => {
    const doc = await vehiclesCol(req.auth.companyId).doc(req.params.id).collection('inspections').doc(req.params.inspectionId).get()
    if (!doc.exists) throw new ApiError(404, 'Inspection introuvable.')
    res.json(await serializeInspection(req, doc.id, doc.data()))
  })
)

/**
 * Legacy live framing check (image sent on its own, not stored). The web app
 * now uses POST .../inspections/:inspectionId/photos, which stores the photo
 * and runs this same check in a single upload. Kept for API compatibility.
 */
router.post(
  '/vehicles/:id/inspections/validate-step',
  companyRole,
  scanModule,
  asyncRoute(async (req, res) => {
    const { image, pointName } = req.body
    if (!image || typeof image !== 'string') throw new ApiError(400, 'Image manquante.')
    try {
      const vehicleDoc = await vehiclesCol(req.auth.companyId).doc(req.params.id).get()
      const vehicleType = getCategoryLabel(vehicleDoc.data()?.category)
      const result = await validateCapture(image, String(pointName || '').slice(0, 80), vehicleType)
      res.json(result)
    } catch (e) {
      // Live validation is a UX nicety, not a hard gate: let the capture
      // through if the AI call itself fails.
      console.warn('[validate-step] AI check failed, letting capture through', e.message)
      res.json({ valid: true })
    }
  })
)

/**
 * Step 1 of an inspection: upload ONE photo (base64 JPEG, ~0.5MB) under a
 * client-generated inspectionId. Idempotent per (inspectionId, stepId) —
 * re-uploading a step replaces it, which is how retakes and offline retries
 * work. With `validate: true` the framing check runs on the same upload.
 * Photos are sent one per request on purpose: batching 16 full photos in one
 * body is what used to blow past the 4.5MB serverless request limit.
 */
router.post(
  '/vehicles/:id/inspections/:inspectionId/photos',
  companyRole,
  scanModule,
  asyncRoute(async (req, res) => {
    const { inspectionId } = req.params
    const stepId = String(req.body?.stepId || '')
    if (!ID_PATTERN.test(inspectionId)) throw new ApiError(400, "Identifiant d'inspection invalide.")
    if (!STEP_ID_PATTERN.test(stepId)) throw new ApiError(400, "Identifiant d'étape invalide.")
    if (!req.body?.image || typeof req.body.image !== 'string') throw new ApiError(400, 'Image manquante.')

    const { doc: vehicleDoc } = await getVehicleOr404(req.auth.companyId, req.params.id)
    const existing = await vehicleDoc.ref.collection('inspections').doc(inspectionId).get()
    if (existing.exists) throw new ApiError(409, 'Cette inspection est déjà terminée.')

    const validation = req.body.validate
      ? validateCapture(req.body.image, String(req.body.pointName || stepId).slice(0, 80), getCategoryLabel(vehicleDoc.data().category)).catch((e) => {
          console.warn('[photos] AI framing check failed, letting capture through', e.message)
          return { valid: true }
        })
      : Promise.resolve(null)

    const [path, check] = await Promise.all([
      uploadInspectionPhoto(req.auth.companyId, req.params.id, inspectionId, stepId, req.body.image),
      validation,
    ])
    res.status(201).json({ stepId, stored: !!path, ...(check ? { valid: check.valid !== false, reason: check.reason || null, instruction: check.instruction || null } : {}) })
  })
)

/**
 * Step 2: run the AI analysis and record the inspection. Two body shapes:
 * - `{ inspectionId, steps: [stepId...], mileage? }` — photos uploaded
 *   beforehand via .../photos (web app; required for >3 photos given the
 *   request size limit). Idempotent on inspectionId: re-submitting a
 *   finished inspection returns it instead of analyzing (and billing) twice,
 *   so the offline queue can safely retry after a dropped response.
 * - `{ photos: [{ stepId, image }], mileage? }` — inline photos, kept for
 *   API clients sending a handful of small images in one call.
 */
router.post(
  '/vehicles/:id/inspections',
  companyRole,
  scanModule,
  asyncRoute(async (req, res) => {
    const companyId = req.auth.companyId
    const { ref: vehicleRef, doc: vehicleDoc } = await getVehicleOr404(companyId, req.params.id)
    const mileage = parseMileage(req.body?.mileage)

    const inlinePhotos = Array.isArray(req.body?.photos) ? req.body.photos : null
    const inspectionId = inlinePhotos ? randomUUID() : String(req.body?.inspectionId || '')
    let stepIds
    if (inlinePhotos) {
      if (inlinePhotos.length === 0) throw new ApiError(400, 'Aucune photo fournie.')
      if (inlinePhotos.length > MAX_PHOTOS_PER_INSPECTION) throw new ApiError(400, 'Trop de photos pour une seule inspection.')
      stepIds = inlinePhotos.map((p, i) => (STEP_ID_PATTERN.test(String(p?.stepId || '')) ? String(p.stepId) : `photo-${i + 1}`))
    } else {
      if (!ID_PATTERN.test(inspectionId)) throw new ApiError(400, "Identifiant d'inspection invalide.")
      const steps = Array.isArray(req.body?.steps) ? req.body.steps.map((s) => String(typeof s === 'object' ? s?.stepId : s)) : []
      if (steps.length === 0) throw new ApiError(400, 'Aucune photo fournie.')
      if (steps.length > MAX_PHOTOS_PER_INSPECTION) throw new ApiError(400, 'Trop de photos pour une seule inspection.')
      if (!steps.every((s) => STEP_ID_PATTERN.test(s))) throw new ApiError(400, "Identifiant d'étape invalide.")
      stepIds = [...new Set(steps)]
    }

    const inspectionRef = vehicleRef.collection('inspections').doc(inspectionId)
    const already = await inspectionRef.get()
    if (already.exists) return res.json(await serializeInspection(req, already.id, already.data()))

    // Guard against two concurrent submissions of the same inspection (retry
    // fired while the first attempt is still analyzing): only one runs.
    const companyRef = db.collection('companies').doc(companyId)
    const lockRef = companyRef.collection('inspectionLocks').doc(inspectionId)
    try {
      await lockRef.create({ createdAt: Date.now() })
    } catch (e) {
      if (e.code !== 6) throw e // 6 = ALREADY_EXISTS
      const lock = await lockRef.get()
      if (Date.now() - (lock.data()?.createdAt || 0) < INSPECTION_LOCK_TTL_MS) {
        throw new ApiError(409, 'Analyse déjà en cours pour cette inspection. Réessayez dans un instant.')
      }
      await lockRef.set({ createdAt: Date.now() })
    }

    try {
      const maxScansPerMonth = req.company?.license?.limits?.maxScansPerMonth
      const monthKey = new Date().toISOString().slice(0, 7) // YYYY-MM
      const scanUsageRef = companyRef.collection('scanUsage').doc(monthKey)
      if (maxScansPerMonth) {
        const usageDoc = await scanUsageRef.get()
        if ((usageDoc.data()?.count || 0) >= maxScansPerMonth) {
          throw new ApiError(403, `Limite de ${maxScansPerMonth} scans/mois atteinte pour votre licence.`)
        }
      }

      let images
      let photoPaths
      if (inlinePhotos) {
        photoPaths = await Promise.all(
          inlinePhotos.map((p, i) => uploadInspectionPhoto(companyId, req.params.id, inspectionId, stepIds[i], p?.image))
        )
        images = inlinePhotos.map((p) => ({ image: p.image }))
      } else {
        photoPaths = stepIds.map((stepId) => inspectionPhotoPath(companyId, req.params.id, inspectionId, stepId))
        const downloaded = await downloadInspectionPhotos(photoPaths)
        const missingSteps = stepIds.filter((_, i) => downloaded[i].missing)
        if (missingSteps.length) {
          const err = new ApiError(409, `${missingSteps.length} photo(s) manquante(s) : renvoyez-les avant de lancer l'analyse.`)
          err.payload = { missingSteps }
          throw err
        }
        images = downloaded
      }

      // Comparison mode: previous validated inspection's photos + the
      // vehicle's known (validated or dismissed) defects. First inspection
      // of a vehicle = baseline.
      const vehicleData = vehicleDoc.data()
      const knownAll = vehicleData.knownDamages || []
      const knownOpen = knownAll.filter((d) => d.status === 'open')
      const dismissed = knownAll.filter((d) => d.status === 'dismissed')
      let reference = []
      let referenceInspectionId = null
      if (vehicleData.lastValidatedInspectionId && vehicleData.lastValidatedInspectionId !== inspectionId) {
        const refDoc = await vehicleRef.collection('inspections').doc(vehicleData.lastValidatedInspectionId).get()
        const refPaths = refDoc.exists ? refDoc.data().photoPaths || [] : []
        if (refPaths.length) {
          referenceInspectionId = refDoc.id
          reference = (await downloadInspectionPhotos(refPaths)).filter((p) => !p.missing)
        }
      }
      const comparison = reference.length > 0 || knownOpen.length > 0
      const currentBytes = images.reduce((sum, img) => sum + img.image.length * 0.75, 0)
      reference = fitToBudget(reference, (img) => img.image.length * 0.75, Math.max(AI_IMAGE_BUDGET_BYTES - currentBytes, 2 * 1024 * 1024))

      const analysis = await analyzeInspection({
        current: images,
        reference,
        knownDamages: knownOpen,
        dismissedDamages: dismissed,
        vehicleType: getCategoryLabel(vehicleData.category),
      })
      const knownIds = new Set([...knownOpen, ...dismissed].map((d) => d.id))
      const damages = normalizeDamages(analysis.damages, images.length, knownIds)
      const openIds = new Set(knownOpen.map((d) => d.id))
      const missingKnownIds = Array.isArray(analysis.missing_known_ids)
        ? analysis.missing_known_ids.map(String).filter((id) => openIds.has(id) && !damages.some((d) => d.knownId === id))
        : []
      const status = statusFromDamages(damages, comparison, analysis.status)

      const inspection = {
        createdAt: Date.now(),
        inspectorUid: req.auth.uid,
        mode: comparison ? 'comparison' : 'baseline',
        referenceInspectionId,
        status,
        statusLabel: analysis.status_label || null,
        summary: analysis.summary || null,
        healthScore: Number.isFinite(Number(analysis.health_score)) ? Number(analysis.health_score) : null,
        damages,
        newDamageCount: damages.filter((d) => d.change !== 'same').length,
        missingKnownIds,
        review: { status: damages.some((d) => d.change !== 'same') ? 'pending' : 'validated' },
        photoPaths,
        photoSteps: stepIds,
        mileage,
        source: req.auth.via === 'apikey' ? 'api' : 'web',
      }

      // Nothing new to decide on: the inspection becomes the comparison
      // reference right away.
      if (inspection.review.status === 'validated') {
        inspection.review = { status: 'validated', acceptedIds: [], rejectedIds: [], validatedAt: inspection.createdAt, validatedBy: 'auto' }
      }

      await inspectionRef.set(inspection)
      await vehicleRef.set(
        {
          lastStatus: inspection.status,
          lastInspectionId: inspectionId,
          lastInspectionAt: inspection.createdAt,
          pendingReviewCount: FieldValue.increment(inspection.review.status === 'pending' ? 1 : 0),
          ...(inspection.review.status === 'validated' ? { lastValidatedInspectionId: inspectionId, lastValidatedInspectionAt: inspection.createdAt } : {}),
          ...(inspection.review.status === 'validated' ? matchedKnownUpdate(vehicleData.knownDamages || [], damages, inspection.createdAt) : {}),
          ...(mileage != null ? { mileage, mileageUpdatedAt: inspection.createdAt } : {}),
        },
        { merge: true }
      )
      await scanUsageRef.set({ count: FieldValue.increment(1) }, { merge: true })

      serializeInspection(req, inspectionId, inspection, WEBHOOK_URL_TTL_MS)
        .then((payload) => dispatchWebhook(companyId, 'inspection.completed', { vehicleId: req.params.id, inspectionId, ...payload }))
        .catch((e) => console.warn('[inspections] webhook payload failed', e.message))

      res.status(201).json(await serializeInspection(req, inspectionId, inspection))
    } finally {
      await lockRef.delete().catch(() => {})
    }
  })
)

/**
 * Human validation of an inspection's new/worse defects. `acceptedIds` are
 * the defect ids confirmed as real (all others are recorded as dismissed
 * false positives, so the AI won't report them as new again). Confirmed
 * defects join the vehicle's known defects, and the inspection becomes the
 * reference the next inspection is compared against.
 */
router.post(
  '/vehicles/:id/inspections/:inspectionId/review',
  companyRole,
  fleetModule,
  asyncRoute(async (req, res) => {
    if (!Array.isArray(req.body?.acceptedIds)) throw new ApiError(400, 'acceptedIds doit être une liste.')
    const accepted = new Set(req.body.acceptedIds.map(String))
    const vehicleRef = vehiclesCol(req.auth.companyId).doc(req.params.id)
    const inspectionRef = vehicleRef.collection('inspections').doc(req.params.inspectionId)

    const result = await db.runTransaction(async (t) => {
      const [vehicleSnap, inspectionSnap] = await Promise.all([t.get(vehicleRef), t.get(inspectionRef)])
      if (!vehicleSnap.exists) throw new ApiError(404, 'Véhicule introuvable.')
      if (!inspectionSnap.exists) throw new ApiError(404, 'Inspection introuvable.')
      const inspection = inspectionSnap.data()
      if (inspection.review?.status !== 'pending') throw new ApiError(409, 'Cette inspection a déjà été validée.')

      const vehicle = vehicleSnap.data()
      const now = Date.now()
      const known = [...(vehicle.knownDamages || [])]
      const byId = new Map(known.map((k, i) => [k.id, i]))
      const acceptedIds = []
      const rejectedIds = []

      for (const d of inspection.damages || []) {
        const photoPath = d.photoIndex != null ? (inspection.photoPaths || [])[d.photoIndex] || null : null
        if (d.change === 'same') {
          if (byId.has(d.knownId)) known[byId.get(d.knownId)] = { ...known[byId.get(d.knownId)], lastSeenAt: inspection.createdAt }
          continue
        }
        const isAccepted = accepted.has(d.id)
        ;(isAccepted ? acceptedIds : rejectedIds).push(d.id)
        if (d.change === 'worse' && byId.has(d.knownId)) {
          if (isAccepted) {
            const k = known[byId.get(d.knownId)]
            known[byId.get(d.knownId)] = {
              ...k,
              type: d.type,
              severity: Math.max(d.severity, k.severity || 1),
              description: d.description,
              photoPath: photoPath || k.photoPath,
              box: d.box || k.box,
              lastSeenAt: inspection.createdAt,
              worsenedAt: inspection.createdAt,
              history: [...(k.history || []), { inspectionId: inspectionSnap.id, at: inspection.createdAt, change: 'worse', description: d.description }].slice(-20),
            }
          }
          continue
        }
        known.push({
          id: d.id,
          status: isAccepted ? 'open' : 'dismissed',
          location: d.location,
          type: d.type,
          severity: d.severity,
          description: d.description,
          photoPath,
          box: d.box,
          inspectionId: inspectionSnap.id,
          firstSeenAt: inspection.createdAt,
          lastSeenAt: inspection.createdAt,
          ...(isAccepted ? {} : { dismissedAt: now }),
        })
      }

      const review = { status: 'validated', acceptedIds, rejectedIds, validatedAt: now, validatedBy: req.auth.uid || 'api' }
      t.update(inspectionRef, { review })
      const isLatest = !vehicle.lastValidatedInspectionAt || inspection.createdAt >= vehicle.lastValidatedInspectionAt
      t.set(
        vehicleRef,
        {
          knownDamages: known,
          pendingReviewCount: Math.max((vehicle.pendingReviewCount || 1) - 1, 0),
          ...(isLatest ? { lastValidatedInspectionId: inspectionSnap.id, lastValidatedInspectionAt: inspection.createdAt } : {}),
        },
        { merge: true }
      )
      return { ...inspection, review }
    })

    dispatchWebhook(req.auth.companyId, 'inspection.reviewed', { vehicleId: req.params.id, inspectionId: req.params.inspectionId, review: result.review })
    res.json(await serializeInspection(req, req.params.inspectionId, result))
  })
)

/** Marks a known defect as repaired (or re-opens it). Repaired defects are no longer expected on the next inspection. */
router.put(
  '/vehicles/:id/damages/:damageId',
  companyRole,
  fleetModule,
  asyncRoute(async (req, res) => {
    const status = String(req.body?.status || '')
    if (!DAMAGE_STATUSES.includes(status)) throw new ApiError(400, 'Statut invalide.')
    const vehicleRef = vehiclesCol(req.auth.companyId).doc(req.params.id)
    await db.runTransaction(async (t) => {
      const snap = await t.get(vehicleRef)
      if (!snap.exists) throw new ApiError(404, 'Véhicule introuvable.')
      const known = snap.data().knownDamages || []
      const i = known.findIndex((d) => d.id === req.params.damageId)
      if (i === -1) throw new ApiError(404, 'Défaut introuvable.')
      known[i] = { ...known[i], status, ...(status === 'repaired' ? { repairedAt: Date.now() } : {}) }
      t.update(vehicleRef, { knownDamages: known })
    })
    res.json(await serializeVehicle(req, await vehicleRef.get()))
  })
)

const SIGNATURE_ROLES = ['customer', 'inspector']
const MAX_SIGNATURE_BYTES = 200 * 1024
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function loadInspection(req) {
  const { ref: vehicleRef, doc: vehicleDoc } = await getVehicleOr404(req.auth.companyId, req.params.id)
  const inspectionDoc = await vehicleRef.collection('inspections').doc(req.params.inspectionId).get()
  if (!inspectionDoc.exists) throw new ApiError(404, 'Inspection introuvable.')
  return { vehicleRef, vehicle: vehicleDoc.data(), inspectionRef: inspectionDoc.ref, inspection: { id: inspectionDoc.id, ...inspectionDoc.data() } }
}

/** Builds the PDF report of an inspection (photos fetched server-side). */
async function renderReport(req) {
  const { vehicle, inspection } = await loadInspection(req)
  let photos
  if (inspection.photoPaths?.length) {
    photos = (await downloadInspectionPhotos(inspection.photoPaths)).map((p) => ({ buffer: p.missing ? null : Buffer.from(p.image, 'base64') }))
  } else {
    // Inspections from before private storage: public URLs.
    photos = await Promise.all(
      (inspection.photos || []).map(async (url) => {
        try {
          const r = await fetchWithTimeout(url, {}, 8000)
          return { buffer: r.ok ? Buffer.from(await r.arrayBuffer()) : null }
        } catch {
          return { buffer: null }
        }
      })
    )
  }
  let inspectorName = inspection.source === 'api' ? 'API' : null
  if (inspection.inspectorUid) {
    const user = await db.collection('users').doc(inspection.inspectorUid).get()
    inspectorName = user.data()?.username || user.data()?.email || null
  }
  const pdf = await buildInspectionReport({ company: req.company || {}, vehicle, inspection, inspectorName, photos })
  const date = new Date(inspection.createdAt).toISOString().slice(0, 10)
  return { pdf, vehicle, inspection, filename: `etat-des-lieux_${vehicle.licensePlate}_${date}.pdf` }
}

/** PDF report (état des lieux) of an inspection. */
router.get(
  '/vehicles/:id/inspections/:inspectionId/report.pdf',
  companyRole,
  fleetModule,
  asyncRoute(async (req, res) => {
    const { pdf, filename } = await renderReport(req)
    res.set('Content-Type', 'application/pdf')
    res.set('Content-Disposition', `inline; filename="${filename}"`)
    res.set('Cache-Control', 'private, no-store')
    res.send(pdf)
  })
)

/**
 * Signature of the inspection (contradictory état des lieux): `role` =
 * customer | inspector, `name`, `image` (PNG data URL from the signature
 * pad), optional `purpose` (checkout | checkin | control) and customer
 * `email`. Defects must be validated first, and a signature can't be
 * replaced once given — the signed document must not change afterwards.
 */
router.post(
  '/vehicles/:id/inspections/:inspectionId/signatures',
  companyRole,
  fleetModule,
  asyncRoute(async (req, res) => {
    const role = String(req.body?.role || '')
    const name = String(req.body?.name || '').trim().slice(0, 120)
    const image = String(req.body?.image || '')
    const email = String(req.body?.email || '').trim().toLowerCase()
    const purpose = req.body?.purpose && PURPOSE_LABELS[req.body.purpose] ? req.body.purpose : null
    if (!SIGNATURE_ROLES.includes(role)) throw new ApiError(400, 'Signataire invalide.')
    if (name.length < 2) throw new ApiError(400, 'Nom du signataire requis.')
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image) || image.length * 0.75 > MAX_SIGNATURE_BYTES) throw new ApiError(400, 'Signature invalide.')
    if (email && !EMAIL_PATTERN.test(email)) throw new ApiError(400, 'Email invalide.')

    const { inspectionRef } = await loadInspection(req)
    const updated = await db.runTransaction(async (t) => {
      const snap = await t.get(inspectionRef)
      const data = snap.data()
      if (data.review?.status === 'pending') throw new ApiError(409, "Validez d'abord les défauts avant de faire signer.")
      if (data.signatures?.[role]) throw new ApiError(409, role === 'customer' ? 'Le client a déjà signé cette inspection.' : "L'inspecteur a déjà signé cette inspection.")
      const signature = { name, image, signedAt: Date.now(), byUid: req.auth.uid || null, ...(email ? { email } : {}) }
      const patch = { [`signatures.${role}`]: signature, ...(purpose && !data.purpose ? { purpose } : {}) }
      t.update(inspectionRef, patch)
      return { ...data, purpose: data.purpose || purpose, signatures: { ...(data.signatures || {}), [role]: signature } }
    })
    dispatchWebhook(req.auth.companyId, 'inspection.signed', { vehicleId: req.params.id, inspectionId: req.params.inspectionId, role, name })
    res.json(await serializeInspection(req, req.params.inspectionId, updated))
  })
)

/** Emails the PDF report (e.g. to the customer after signing). Requires an email provider (see lib/email.js). */
router.post(
  '/vehicles/:id/inspections/:inspectionId/report/send',
  companyRole,
  fleetModule,
  asyncRoute(async (req, res) => {
    if (!emailEnabled()) throw new ApiError(501, "L'envoi d'emails n'est pas configuré. Téléchargez le PDF et envoyez-le vous-même.")
    const to = String(req.body?.email || '').trim().toLowerCase()
    if (!EMAIL_PATTERN.test(to)) throw new ApiError(400, 'Email invalide.')
    const { pdf, vehicle, inspection, filename } = await renderReport(req)
    const company = req.company?.name || 'LocaVision'
    const title = PURPOSE_LABELS[inspection.purpose] || "Rapport d'inspection"
    await sendEmail({
      to,
      subject: `${title} — ${vehicle.licensePlate} — ${company}`,
      text: `Bonjour,\n\nVeuillez trouver ci-joint le document « ${title} » du véhicule ${vehicle.brand || ''} ${vehicle.model || ''} (${vehicle.licensePlate}), établi le ${new Date(inspection.createdAt).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })}.\n\nCordialement,\n${company}`,
      attachments: [{ filename, content: pdf.toString('base64') }],
    })
    await vehiclesCol(req.auth.companyId).doc(req.params.id).collection('inspections').doc(req.params.inspectionId)
      .update({ reportSentTo: FieldValue.arrayUnion({ email: to, at: Date.now() }) })
    res.json({ sent: true, to })
  })
)

module.exports = router
