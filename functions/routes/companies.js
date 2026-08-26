const crypto = require('crypto')
const express = require('express')
const { db, auth, todayKey } = require('../lib/db')
const { requireRole, generateApiKey, hashApiKey } = require('../lib/auth')
const { asyncRoute, ApiError } = require('../lib/asyncRoute')
const { API_COST_PER_CALL_EUR } = require('../lib/config')

const router = express.Router()
const platformOnly = requireRole('platform_admin')

async function withStats(doc) {
  const data = doc.data()
  const companyRef = db.collection('companies').doc(doc.id)
  const [vehiclesCount, agenciesSnap] = await Promise.all([
    companyRef.collection('vehicles').count().get(),
    companyRef.collection('agencies').get(),
  ])
  const cities = new Set(agenciesSnap.docs.map((a) => a.data().city).filter(Boolean))
  const apiCallCount = data.apiCallCount || 0

  return {
    id: doc.id,
    ...data,
    apiKeyHash: undefined,
    vehicleCount: vehiclesCount.data().count,
    agencyCount: agenciesSnap.size,
    cityCount: cities.size,
    estimatedApiCostEur: Math.round(apiCallCount * API_COST_PER_CALL_EUR * 100) / 100,
  }
}

router.get(
  '/companies',
  platformOnly,
  asyncRoute(async (req, res) => {
    const snap = await db.collection('companies').orderBy('createdAt', 'desc').get()
    res.json(await Promise.all(snap.docs.map(withStats)))
  })
)

router.post(
  '/companies',
  platformOnly,
  asyncRoute(async (req, res) => {
    const name = String(req.body?.name || '').trim()
    const contactEmail = String(req.body?.contactEmail || '').trim().toLowerCase()
    if (!name || name.length > 120) throw new ApiError(400, "Nom d'entreprise invalide.")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) throw new ApiError(400, 'Email de contact invalide.')

    const apiKey = generateApiKey()
    const companyRef = db.collection('companies').doc()
    await companyRef.set({
      name,
      contactEmail,
      status: 'active',
      apiKeyHash: hashApiKey(apiKey),
      apiCallCount: 0,
      monthlyFee: 0,
      createdAt: Date.now(),
    })

    // Random password the company never sees or uses — they set their own
    // via the password-setup link below (standard "invite" pattern).
    const initialPassword = crypto.randomBytes(24).toString('hex')
    const userRecord = await auth.createUser({ email: contactEmail, password: initialPassword, displayName: name })
    await db.collection('users').doc(userRecord.uid).set({ email: contactEmail, role: 'company_admin', companyId: companyRef.id })

    let passwordSetupLink = null
    try {
      passwordSetupLink = await auth.generatePasswordResetLink(contactEmail)
    } catch (e) {
      console.warn('[companies] password reset link generation failed', e.message)
    }

    res.status(201).json({ id: companyRef.id, name, contactEmail, apiKey, loginEmail: contactEmail, passwordSetupLink })
  })
)

router.put(
  '/companies/:id/status',
  platformOnly,
  asyncRoute(async (req, res) => {
    const status = req.body?.status
    if (!['active', 'suspended'].includes(status)) throw new ApiError(400, 'Statut invalide.')
    const ref = db.collection('companies').doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) throw new ApiError(404, 'Entreprise introuvable.')
    await ref.set({ status }, { merge: true })
    res.json(await withStats(await ref.get()))
  })
)

router.put(
  '/companies/:id/pricing',
  platformOnly,
  asyncRoute(async (req, res) => {
    const monthlyFee = Number(req.body?.monthlyFee)
    if (!Number.isFinite(monthlyFee) || monthlyFee < 0 || monthlyFee > 1_000_000) {
      throw new ApiError(400, 'Tarif mensuel invalide.')
    }
    const ref = db.collection('companies').doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) throw new ApiError(404, 'Entreprise introuvable.')
    await ref.set({ monthlyFee }, { merge: true })
    res.json(await withStats(await ref.get()))
  })
)

router.post(
  '/companies/:id/regenerate-key',
  platformOnly,
  asyncRoute(async (req, res) => {
    const ref = db.collection('companies').doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) throw new ApiError(404, 'Entreprise introuvable.')

    const apiKey = generateApiKey()
    await ref.set({ apiKeyHash: hashApiKey(apiKey) }, { merge: true }) // old key stops working immediately
    res.json({ apiKey })
  })
)

router.delete(
  '/companies/:id',
  platformOnly,
  asyncRoute(async (req, res) => {
    const ref = db.collection('companies').doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) throw new ApiError(404, 'Entreprise introuvable.')

    const usersSnap = await db.collection('users').where('companyId', '==', req.params.id).get()
    await Promise.all(
      usersSnap.docs.map(async (u) => {
        await auth.deleteUser(u.id).catch((e) => console.warn('[companies] auth.deleteUser failed', e.message))
        await u.ref.delete()
      })
    )

    await db.recursiveDelete(ref) // company doc + vehicles/agencies/apiUsage subcollections
    res.status(204).end()
  })
)

router.get(
  '/usage',
  platformOnly,
  asyncRoute(async (req, res) => {
    const days = req.query.range === '7d' ? 7 : 30
    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceKey = todayKey(since)

    const [usageSnap, companiesSnap] = await Promise.all([
      db.collectionGroup('apiUsage').where('date', '>=', sinceKey).get(),
      db.collection('companies').get(),
    ])

    const dailyMap = {}
    for (const doc of usageSnap.docs) {
      const { date, count } = doc.data()
      dailyMap[date] = (dailyMap[date] || 0) + (count || 0)
    }
    const daily = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const byCompany = companiesSnap.docs
      .map((d) => {
        const count = d.data().apiCallCount || 0
        const monthlyFee = d.data().monthlyFee || 0
        const estimatedCost = Math.round(count * API_COST_PER_CALL_EUR * 100) / 100
        return {
          companyId: d.id,
          name: d.data().name,
          count,
          monthlyFee,
          estimatedCost,
          estimatedMargin: Math.round((monthlyFee - estimatedCost) * 100) / 100,
        }
      })
      .sort((a, b) => b.count - a.count)

    res.json({
      total: daily.reduce((sum, d) => sum + d.count, 0),
      daily,
      byCompany,
      costPerCallEur: API_COST_PER_CALL_EUR,
    })
  })
)

module.exports = router
