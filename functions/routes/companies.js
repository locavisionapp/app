const express = require('express')
const { db, auth, todayKey } = require('../lib/db')
const { requireRole, generateApiKey, hashApiKey } = require('../lib/auth')
const { asyncRoute, ApiError } = require('../lib/asyncRoute')

const router = express.Router()
const platformOnly = requireRole('platform_admin')

router.get(
  '/companies',
  platformOnly,
  asyncRoute(async (req, res) => {
    const snap = await db.collection('companies').orderBy('createdAt', 'desc').get()
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data(), apiKeyHash: undefined })))
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
      createdAt: Date.now(),
    })

    const tempPassword = generateApiKey().slice(8, 20)
    const userRecord = await auth.createUser({ email: contactEmail, password: tempPassword, displayName: name })
    await db.collection('users').doc(userRecord.uid).set({ email: contactEmail, role: 'company_admin', companyId: companyRef.id })

    res.status(201).json({ id: companyRef.id, name, contactEmail, apiKey, loginEmail: contactEmail, tempPassword })
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
      .map((d) => ({ companyId: d.id, name: d.data().name, count: d.data().apiCallCount || 0 }))
      .sort((a, b) => b.count - a.count)

    res.json({ total: daily.reduce((sum, d) => sum + d.count, 0), daily, byCompany })
  })
)

module.exports = router
