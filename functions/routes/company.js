const crypto = require('crypto')
const express = require('express')
const { db } = require('../lib/db')
const { requireRole, generateApiKey, hashApiKey } = require('../lib/auth')
const { asyncRoute, ApiError } = require('../lib/asyncRoute')
const { API_COST_PER_CALL_EUR } = require('../lib/config')

const router = express.Router()
const companyRole = requireRole('company_admin', 'employee')
const adminOnly = requireRole('company_admin')

function companyRef(req) {
  return db.collection('companies').doc(req.auth.companyId)
}

// Self-service view of your own company account — API key status, usage,
// estimated cost, license/trial, module access. No plaintext API key is
// ever returned here; only a regenerate action reveals a new one, once.
router.get(
  '/company',
  companyRole,
  asyncRoute(async (req, res) => {
    const doc = await companyRef(req).get()
    if (!doc.exists) throw new ApiError(404, 'Entreprise introuvable.')
    const data = doc.data()
    const apiCallCount = data.apiCallCount || 0
    res.json({
      id: doc.id,
      name: data.name,
      contactEmail: data.contactEmail,
      slug: data.slug,
      status: data.status,
      trialEndsAt: data.trialEndsAt || null,
      license: data.license || null,
      enabledModules: data.enabledModules || null,
      apiCallCount,
      estimatedApiCostEur: Math.round(apiCallCount * API_COST_PER_CALL_EUR * 100) / 100,
      hasApiKey: !!data.apiKeyHash,
      webhookUrl: data.webhookUrl || null,
      webhookSecret: data.webhookSecret || null,
    })
  })
)

router.post(
  '/company/regenerate-key',
  adminOnly,
  asyncRoute(async (req, res) => {
    const apiKey = generateApiKey()
    await companyRef(req).set({ apiKeyHash: hashApiKey(apiKey) }, { merge: true })
    res.json({ apiKey })
  })
)

router.put(
  '/company/webhook',
  adminOnly,
  asyncRoute(async (req, res) => {
    const webhookUrl = String(req.body?.webhookUrl || '').trim()
    if (webhookUrl && !/^https:\/\//.test(webhookUrl)) throw new ApiError(400, 'L\'URL du webhook doit être en https://')

    const doc = await companyRef(req).get()
    const webhookSecret = doc.data()?.webhookSecret || crypto.randomBytes(24).toString('hex')
    await companyRef(req).set({ webhookUrl: webhookUrl || null, webhookSecret }, { merge: true })
    res.json({ webhookUrl: webhookUrl || null, webhookSecret })
  })
)

router.get(
  '/company/quotes',
  companyRole,
  asyncRoute(async (req, res) => {
    const snap = await companyRef(req).collection('quotes').orderBy('createdAt', 'desc').get()
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
)

module.exports = router
