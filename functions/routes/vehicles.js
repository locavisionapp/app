const express = require('express')
const { randomUUID } = require('crypto')
const { db, FieldValue } = require('../lib/db')
const { requireRole, requireModule } = require('../lib/auth')
const { asyncRoute, ApiError } = require('../lib/asyncRoute')
const { identifyVehicleFromPlateImage, enrichSparseSpecs } = require('../lib/plate')
const { validateCapture, analyzeBatchInspection } = require('../lib/ai')
const {
  uploadInspectionPhoto,
  downloadInspectionPhotos,
  inspectionPhotoPath,
  toPhotoUrls,
  deletePrefix,
  WEBHOOK_URL_TTL_MS,
} = require('../lib/storage')
const { getCategoryLabel } = require('../lib/categories')
const { dispatchWebhook } = require('../lib/webhooks')

const router = express.Router()
const companyRole = requireRole('company_admin', 'employee')
const adminOnly = requireRole('company_admin')
const fleetModule = requireModule('fleet')
const scanModule = requireModule('scan')

const MAX_PHOTOS_PER_INSPECTION = 30
const PLATE_MAX_LENGTH = 20
const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/
const STEP_ID_PATTERN = /^[A-Za-z0-9_-]{1,60}$/
// A crashed/timed-out analysis leaves its lock behind; past this age a retry
// may take it over.
const INSPECTION_LOCK_TTL_MS = 90 * 1000

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
async function serializeInspection(id, data, urlTtlMs) {
  const { photoPaths, photos, ...rest } = data
  const urls = await toPhotoUrls(photoPaths || photos || [], urlTtlMs)
  return { id, ...rest, photos: urls, status_label: rest.statusLabel ?? null, health_score: rest.healthScore ?? null }
}

router.post(
  '/scan-plate',
  companyRole,
  scanModule,
  asyncRoute(async (req, res) => {
    const { image } = req.body
    if (!image || typeof image !== 'string') throw new ApiError(400, 'Image manquante.')
    const result = await identifyVehicleFromPlateImage(image)
    // 200 even on failure: lets the client fall back to manual entry instead
    // of treating a "couldn't read the plate" outcome as a hard error.
    res.json(result)
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
    const plate = licensePlate.trim().toUpperCase()

    let city = null
    if (agencyId) {
      const agencyDoc = await db.collection('companies').doc(req.auth.companyId).collection('agencies').doc(String(agencyId)).get()
      if (!agencyDoc.exists) throw new ApiError(400, 'Agence invalide.')
      city = agencyDoc.data().city || null
    }

    const col = vehiclesCol(req.auth.companyId)
    const existing = await col.where('licensePlate', '==', plate).limit(1).get()
    if (!existing.empty) {
      // Re-scanning a known plate opens its existing record (and history)
      // instead of creating a duplicate.
      const doc = existing.docs[0]
      return res.json({ id: doc.id, ...doc.data() })
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

router.get(
  '/vehicles/:id',
  companyRole,
  fleetModule,
  asyncRoute(async (req, res) => {
    const { doc } = await getVehicleOr404(req.auth.companyId, req.params.id)
    res.json({ id: doc.id, ...doc.data() })
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
    await deletePrefix(`companies/${req.auth.companyId}/vehicles/${req.params.id}/`)
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
    res.json(await Promise.all(docs.map((d) => serializeInspection(d.id, d.data()))))
  })
)

router.get(
  '/vehicles/:id/inspections/:inspectionId',
  companyRole,
  fleetModule,
  asyncRoute(async (req, res) => {
    const doc = await vehiclesCol(req.auth.companyId).doc(req.params.id).collection('inspections').doc(req.params.inspectionId).get()
    if (!doc.exists) throw new ApiError(404, 'Inspection introuvable.')
    res.json(await serializeInspection(doc.id, doc.data()))
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
    if (already.exists) return res.json(await serializeInspection(already.id, already.data()))

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

      const analysis = await analyzeBatchInspection(images, getCategoryLabel(vehicleDoc.data().category))

      const inspection = {
        createdAt: Date.now(),
        inspectorUid: req.auth.uid,
        status: ['green', 'orange', 'red'].includes(analysis.status) ? analysis.status : 'orange',
        statusLabel: analysis.status_label || null,
        summary: analysis.summary || null,
        healthScore: Number.isFinite(Number(analysis.health_score)) ? Number(analysis.health_score) : null,
        damages: Array.isArray(analysis.damages) ? analysis.damages : [],
        photoPaths,
        photoSteps: stepIds,
        mileage,
        source: req.auth.via === 'apikey' ? 'api' : 'web',
      }

      await inspectionRef.set(inspection)
      await vehicleRef.set(
        {
          lastStatus: inspection.status,
          lastInspectionId: inspectionId,
          lastInspectionAt: inspection.createdAt,
          ...(mileage != null ? { mileage, mileageUpdatedAt: inspection.createdAt } : {}),
        },
        { merge: true }
      )
      await scanUsageRef.set({ count: FieldValue.increment(1) }, { merge: true })

      serializeInspection(inspectionId, inspection, WEBHOOK_URL_TTL_MS)
        .then((payload) => dispatchWebhook(companyId, 'inspection.completed', { vehicleId: req.params.id, inspectionId, ...payload }))
        .catch((e) => console.warn('[inspections] webhook payload failed', e.message))

      res.status(201).json(await serializeInspection(inspectionId, inspection))
    } finally {
      await lockRef.delete().catch(() => {})
    }
  })
)

module.exports = router
