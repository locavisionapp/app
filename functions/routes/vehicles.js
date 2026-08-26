const express = require('express')
const { randomUUID } = require('crypto')
const { db } = require('../lib/db')
const { requireRole } = require('../lib/auth')
const { asyncRoute, ApiError } = require('../lib/asyncRoute')
const { identifyVehicleFromPlateImage, enrichSparseSpecs } = require('../lib/plate')
const { validateCapture, analyzeBatchInspection } = require('../lib/ai')
const { uploadInspectionPhoto } = require('../lib/storage')
const { getCategoryLabel } = require('../lib/categories')

const router = express.Router()
const companyRole = requireRole('company_admin', 'company_user')

const MAX_PHOTOS_PER_INSPECTION = 30
const PLATE_MAX_LENGTH = 20

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

router.post(
  '/scan-plate',
  companyRole,
  asyncRoute(async (req, res) => {
    const { image } = req.body
    if (!image || typeof image !== 'string') throw new ApiError(400, 'Image manquante.')
    const result = await identifyVehicleFromPlateImage(image)
    // 200 even on failure: lets the client fall back to manual entry instead
    // of treating a "couldn't read the plate" outcome as a hard error.
    res.json(result)
  })
)

router.get(
  '/vehicles',
  companyRole,
  asyncRoute(async (req, res) => {
    // A single `createdAt` ordered query (already indexed by default) covers
    // every company's fleet in one read; all filters below run in-memory.
    // That avoids needing a bespoke Firestore composite index per filter
    // combination, and is plenty fast at realistic per-company fleet sizes
    // (capped at 500 here) — swap for server-side `where()` filtering plus
    // composite indexes, or a dedicated search index (Algolia/Typesense),
    // if a single company's fleet ever grows past that.
    const snap = await vehiclesCol(req.auth.companyId).orderBy('createdAt', 'desc').limit(500).get()
    let vehicles = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

    const { agencyId, city, category, status } = req.query
    if (agencyId) vehicles = vehicles.filter((v) => v.agencyId === String(agencyId))
    if (city) vehicles = vehicles.filter((v) => (v.city || '').toLowerCase() === String(city).toLowerCase())
    if (category) vehicles = vehicles.filter((v) => v.category === String(category))
    if (status) vehicles = vehicles.filter((v) => v.lastStatus === String(status))

    const q = String(req.query.q || '').trim().toLowerCase()
    if (q) {
      vehicles = vehicles.filter((v) =>
        [v.licensePlate, v.brand, v.model].some((f) => String(f || '').toLowerCase().includes(q))
      )
    }

    res.json(vehicles)
  })
)

router.post(
  '/vehicles',
  companyRole,
  asyncRoute(async (req, res) => {
    const { licensePlate, brand, model, year, category, fuel, vin, agencyId } = req.body
    if (!licensePlate || typeof licensePlate !== 'string' || licensePlate.length > PLATE_MAX_LENGTH) {
      throw new ApiError(400, 'Plaque manquante ou invalide.')
    }

    let city = null
    if (agencyId) {
      const agencyDoc = await db.collection('companies').doc(req.auth.companyId).collection('agencies').doc(String(agencyId)).get()
      if (!agencyDoc.exists) throw new ApiError(400, 'Agence invalide.')
      city = agencyDoc.data().city || null
    }

    const col = vehiclesCol(req.auth.companyId)
    const existing = await col.where('licensePlate', '==', licensePlate.toUpperCase()).limit(1).get()
    if (!existing.empty) {
      const doc = existing.docs[0]
      return res.json({ id: doc.id, ...doc.data() })
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
      licensePlate: licensePlate.toUpperCase(),
      brand: (brand || 'Inconnu').toString().slice(0, 60),
      model: (model || '').toString().slice(0, 60),
      year: Number.isFinite(Number(year)) ? Number(year) : null,
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
    res.status(201).json({ id: ref.id, ...vehicle })
  })
)

router.get(
  '/vehicles/:id',
  companyRole,
  asyncRoute(async (req, res) => {
    const doc = await vehiclesCol(req.auth.companyId).doc(req.params.id).get()
    if (!doc.exists) throw new ApiError(404, 'Véhicule introuvable.')
    res.json({ id: doc.id, ...doc.data() })
  })
)

router.delete(
  '/vehicles/:id',
  companyRole,
  asyncRoute(async (req, res) => {
    const ref = vehiclesCol(req.auth.companyId).doc(req.params.id)
    const existing = await ref.get()
    if (!existing.exists) throw new ApiError(404, 'Véhicule introuvable.')
    await db.recursiveDelete(ref) // vehicle doc + its inspections subcollection
    res.status(204).end()
  })
)

router.put(
  '/vehicles/:id/pricing',
  companyRole,
  asyncRoute(async (req, res) => {
    const dailyRate = Number(req.body?.dailyRate)
    if (!Number.isFinite(dailyRate) || dailyRate < 0 || dailyRate > 100000) {
      throw new ApiError(400, 'Tarif invalide.')
    }
    const ref = vehiclesCol(req.auth.companyId).doc(req.params.id)
    const existing = await ref.get()
    if (!existing.exists) throw new ApiError(404, 'Véhicule introuvable.')

    await ref.set({ pricing: { dailyRate, currency: (req.body?.currency || 'EUR').toString().slice(0, 3) } }, { merge: true })
    const doc = await ref.get()
    res.json({ id: doc.id, ...doc.data() })
  })
)

router.put(
  '/vehicles/:id/mileage',
  companyRole,
  asyncRoute(async (req, res) => {
    const mileage = Number(req.body?.mileage)
    if (!Number.isFinite(mileage) || mileage < 0 || mileage > 2_000_000) {
      throw new ApiError(400, 'Kilométrage invalide.')
    }
    const ref = vehiclesCol(req.auth.companyId).doc(req.params.id)
    const existing = await ref.get()
    if (!existing.exists) throw new ApiError(404, 'Véhicule introuvable.')

    await ref.set({ mileage, mileageUpdatedAt: Date.now() }, { merge: true })
    const doc = await ref.get()
    res.json({ id: doc.id, ...doc.data() })
  })
)

router.put(
  '/vehicles/:id/agency',
  companyRole,
  asyncRoute(async (req, res) => {
    const ref = vehiclesCol(req.auth.companyId).doc(req.params.id)
    const existing = await ref.get()
    if (!existing.exists) throw new ApiError(404, 'Véhicule introuvable.')

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

router.get(
  '/vehicles/:id/inspections',
  companyRole,
  asyncRoute(async (req, res) => {
    const snap = await vehiclesCol(req.auth.companyId)
      .doc(req.params.id)
      .collection('inspections')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get()
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
)

router.post(
  '/vehicles/:id/inspections/validate-step',
  companyRole,
  asyncRoute(async (req, res) => {
    const { image, pointName } = req.body
    if (!image || typeof image !== 'string') throw new ApiError(400, 'Image manquante.')
    try {
      const vehicleDoc = await vehiclesCol(req.auth.companyId).doc(req.params.id).get()
      const vehicleType = getCategoryLabel(vehicleDoc.data()?.category)
      const result = await validateCapture(image, pointName, vehicleType)
      res.json(result)
    } catch (e) {
      // Live validation is a UX nicety, not a hard gate: let the capture
      // through if the AI call itself fails.
      console.warn('[validate-step] AI check failed, letting capture through', e.message)
      res.json({ valid: true })
    }
  })
)

router.post(
  '/vehicles/:id/inspections',
  companyRole,
  asyncRoute(async (req, res) => {
    const { photos } = req.body
    if (!Array.isArray(photos) || photos.length === 0) throw new ApiError(400, 'Aucune photo fournie.')
    if (photos.length > MAX_PHOTOS_PER_INSPECTION) throw new ApiError(400, 'Trop de photos pour une seule inspection.')

    const vehicleRef = vehiclesCol(req.auth.companyId).doc(req.params.id)
    const vehicleDoc = await vehicleRef.get()
    if (!vehicleDoc.exists) throw new ApiError(404, 'Véhicule introuvable.')
    const vehicleType = getCategoryLabel(vehicleDoc.data().category)

    const analysis = await analyzeBatchInspection(photos, vehicleType)

    const inspectionId = randomUUID()
    const photoUrls = await Promise.all(
      photos.map((p) => uploadInspectionPhoto(req.auth.companyId, req.params.id, inspectionId, p.stepId, p.image))
    )

    const inspection = {
      createdAt: Date.now(),
      inspectorUid: req.auth.uid,
      status: analysis.status || 'orange',
      statusLabel: analysis.status_label || null,
      summary: analysis.summary || null,
      healthScore: analysis.health_score ?? null,
      damages: analysis.damages || [],
      photos: photoUrls,
      source: req.auth.via === 'apikey' ? 'api' : 'web',
    }

    await vehicleRef.collection('inspections').doc(inspectionId).set(inspection)
    await vehicleRef.set({ lastStatus: inspection.status, lastInspectionId: inspectionId }, { merge: true })

    res.status(201).json({ id: inspectionId, ...inspection, status_label: inspection.statusLabel, health_score: inspection.healthScore })
  })
)

module.exports = router
