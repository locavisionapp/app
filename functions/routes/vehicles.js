const express = require('express')
const { randomUUID } = require('crypto')
const { db } = require('../lib/db')
const { requireRole } = require('../lib/auth')
const { identifyVehicleFromPlateImage } = require('../lib/plate')
const { validateCapture, analyzeBatchInspection } = require('../lib/ai')
const { uploadInspectionPhoto } = require('../lib/storage')
const { getCategoryLabel } = require('../lib/categories')

const router = express.Router()
const companyRole = requireRole('company_admin', 'company_user')

function vehiclesCol(companyId) {
  return db.collection('companies').doc(companyId).collection('vehicles')
}

router.post('/scan-plate', companyRole, async (req, res) => {
  const { image } = req.body
  if (!image) return res.status(400).json({ error: 'Image manquante.' })
  const result = await identifyVehicleFromPlateImage(image)
  if (result.error) return res.status(200).json(result) // laisse le client basculer en saisie manuelle
  res.json(result)
})

router.get('/vehicles', companyRole, async (req, res) => {
  const snap = await vehiclesCol(req.auth.companyId).orderBy('createdAt', 'desc').get()
  res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
})

router.post('/vehicles', companyRole, async (req, res) => {
  const { licensePlate, brand, model, year, category, fuel, vin } = req.body
  if (!licensePlate) return res.status(400).json({ error: 'Plaque manquante.' })

  const col = vehiclesCol(req.auth.companyId)
  const existing = await col.where('licensePlate', '==', licensePlate.toUpperCase()).limit(1).get()
  if (!existing.empty) {
    const doc = existing.docs[0]
    return res.json({ id: doc.id, ...doc.data() })
  }

  const vehicle = {
    licensePlate: licensePlate.toUpperCase(),
    brand: brand || 'Inconnu',
    model: model || '',
    year: year || null,
    category: category || 'autre',
    fuel: fuel || null,
    vin: vin || '',
    pricing: { dailyRate: 0, currency: 'EUR' },
    lastStatus: null,
    lastInspectionId: null,
    createdAt: Date.now(),
  }
  const ref = await col.add(vehicle)
  res.status(201).json({ id: ref.id, ...vehicle })
})

router.get('/vehicles/:id', companyRole, async (req, res) => {
  const doc = await vehiclesCol(req.auth.companyId).doc(req.params.id).get()
  if (!doc.exists) return res.status(404).json({ error: 'Véhicule introuvable.' })
  res.json({ id: doc.id, ...doc.data() })
})

router.put('/vehicles/:id/pricing', companyRole, async (req, res) => {
  const { dailyRate, currency } = req.body
  const ref = vehiclesCol(req.auth.companyId).doc(req.params.id)
  await ref.set({ pricing: { dailyRate: Number(dailyRate) || 0, currency: currency || 'EUR' } }, { merge: true })
  const doc = await ref.get()
  res.json({ id: doc.id, ...doc.data() })
})

router.get('/vehicles/:id/inspections', companyRole, async (req, res) => {
  const snap = await vehiclesCol(req.auth.companyId)
    .doc(req.params.id)
    .collection('inspections')
    .orderBy('createdAt', 'desc')
    .get()
  res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
})

router.post('/vehicles/:id/inspections/validate-step', companyRole, async (req, res) => {
  const { image, pointName } = req.body
  if (!image) return res.status(400).json({ error: 'Image manquante.' })
  try {
    const vehicleDoc = await vehiclesCol(req.auth.companyId).doc(req.params.id).get()
    const vehicleType = getCategoryLabel(vehicleDoc.data()?.category)
    const result = await validateCapture(image, pointName, vehicleType)
    res.json(result)
  } catch (e) {
    // La validation en direct est un confort, pas un blocage : on laisse passer si l'IA échoue.
    res.json({ valid: true })
  }
})

router.post('/vehicles/:id/inspections', companyRole, async (req, res) => {
  const { photos } = req.body
  if (!Array.isArray(photos) || photos.length === 0) return res.status(400).json({ error: 'Aucune photo fournie.' })

  const vehicleRef = vehiclesCol(req.auth.companyId).doc(req.params.id)
  const vehicleDoc = await vehicleRef.get()
  if (!vehicleDoc.exists) return res.status(404).json({ error: 'Véhicule introuvable.' })
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

module.exports = router
