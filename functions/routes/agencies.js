const express = require('express')
const { db } = require('../lib/db')
const { requireRole, requireModule } = require('../lib/auth')
const { asyncRoute, ApiError } = require('../lib/asyncRoute')

const router = express.Router()
const companyRole = requireRole('company_admin', 'employee')
const agenciesModule = requireModule('agencies')

function agenciesCol(companyId) {
  return db.collection('companies').doc(companyId).collection('agencies')
}

// Branches/locations under a company (e.g. "Europcar Paris", "Europcar Lyon").
// Vehicles are optionally attached to one, denormalizing its city onto the
// vehicle doc so fleet filtering stays a single indexed Firestore query.
router.get(
  '/agencies',
  companyRole,
  agenciesModule,
  asyncRoute(async (req, res) => {
    const snap = await agenciesCol(req.auth.companyId).orderBy('name', 'asc').get()
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
)

router.post(
  '/agencies',
  companyRole,
  agenciesModule,
  asyncRoute(async (req, res) => {
    const name = String(req.body?.name || '').trim()
    const city = String(req.body?.city || '').trim()
    if (!name || name.length > 120) throw new ApiError(400, 'Nom d\'agence invalide.')
    if (!city || city.length > 120) throw new ApiError(400, 'Ville invalide.')

    const maxAgencies = (await db.collection('companies').doc(req.auth.companyId).get()).data()?.license?.limits?.maxAgencies
    if (maxAgencies) {
      const count = await agenciesCol(req.auth.companyId).count().get()
      if (count.data().count >= maxAgencies) throw new ApiError(403, `Limite de ${maxAgencies} agence(s) atteinte pour votre licence.`)
    }

    const agency = { name, city, address: String(req.body?.address || '').trim().slice(0, 240), createdAt: Date.now() }
    const ref = await agenciesCol(req.auth.companyId).add(agency)
    res.status(201).json({ id: ref.id, ...agency })
  })
)

router.put(
  '/agencies/:id',
  companyRole,
  agenciesModule,
  asyncRoute(async (req, res) => {
    const ref = agenciesCol(req.auth.companyId).doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) throw new ApiError(404, 'Agence introuvable.')

    const updates = {}
    if (req.body?.name != null) updates.name = String(req.body.name).trim().slice(0, 120)
    if (req.body?.city != null) updates.city = String(req.body.city).trim().slice(0, 120)
    if (req.body?.address != null) updates.address = String(req.body.address).trim().slice(0, 240)
    await ref.set(updates, { merge: true })
    res.json({ id: doc.id, ...doc.data(), ...updates })
  })
)

router.delete(
  '/agencies/:id',
  companyRole,
  agenciesModule,
  asyncRoute(async (req, res) => {
    await agenciesCol(req.auth.companyId).doc(req.params.id).delete()
    res.status(204).end()
  })
)

module.exports = router
