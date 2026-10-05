const crypto = require('crypto')
const express = require('express')
const { db, auth, todayKey } = require('../lib/db')
const { requireRole, generateApiKey, hashApiKey } = require('../lib/auth')
const { asyncRoute, ApiError } = require('../lib/asyncRoute')
const { API_COST_PER_CALL_EUR, MODULES } = require('../lib/config')
const { slugify, synthesizeEmail } = require('../lib/slug')
const { deletePrefix } = require('../lib/storage')
const { SYNTHETIC_EMAIL_DOMAIN } = require('../lib/config')

const router = express.Router()
const platformOnly = requireRole('platform_admin')

const YEAR_MS = 365 * 24 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

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
    webhookSecret: undefined,
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

    let slug = slugify(req.body?.slug || name)
    if (!slug) throw new ApiError(400, 'Identifiant entreprise invalide.')
    const slugTaken = await db.collection('companies').where('slug', '==', slug).limit(1).get()
    if (!slugTaken.empty) slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`

    const trialDays = Number(req.body?.trialDays) || 0
    const enabledModules = Array.isArray(req.body?.enabledModules) ? req.body.enabledModules.filter((m) => MODULES.includes(m)) : MODULES

    const apiKey = generateApiKey()
    const companyRef = db.collection('companies').doc()
    await companyRef.set({
      name,
      contactEmail,
      slug,
      status: trialDays > 0 ? 'trial' : 'active',
      trialEndsAt: trialDays > 0 ? Date.now() + trialDays * DAY_MS : null,
      enabledModules,
      apiKeyHash: hashApiKey(apiKey),
      apiCallCount: 0,
      license: null,
      createdAt: Date.now(),
    })

    // Company logins are slug + username + password (no real email involved),
    // so there's no "send a reset link" flow — the initial password is shown
    // once here, same pattern as the API key. The admin employee can be
    // renamed/rotated afterwards from the company's own employee management.
    const username = slugify(req.body?.initialUsername || 'admin') || 'admin'
    const initialPassword = crypto.randomBytes(9).toString('base64url')
    const email = synthesizeEmail(slug, username, SYNTHETIC_EMAIL_DOMAIN)
    const userRecord = await auth.createUser({ email, password: initialPassword, displayName: `${name} (${username})` })
    await db.collection('users').doc(userRecord.uid).set({ companyId: companyRef.id, username, role: 'company_admin', active: true, createdAt: Date.now() })

    res.status(201).json({ id: companyRef.id, name, slug, contactEmail, apiKey, username, initialPassword })
  })
)

router.put(
  '/companies/:id/status',
  platformOnly,
  asyncRoute(async (req, res) => {
    const status = req.body?.status
    if (!['active', 'suspended', 'trial', 'expired'].includes(status)) throw new ApiError(400, 'Statut invalide.')
    const ref = db.collection('companies').doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) throw new ApiError(404, 'Entreprise introuvable.')
    await ref.set({ status }, { merge: true })
    res.json(await withStats(await ref.get()))
  })
)

router.put(
  '/companies/:id/modules',
  platformOnly,
  asyncRoute(async (req, res) => {
    const enabledModules = Array.isArray(req.body?.enabledModules) ? req.body.enabledModules.filter((m) => MODULES.includes(m)) : null
    if (!enabledModules) throw new ApiError(400, 'Liste de modules invalide.')
    const ref = db.collection('companies').doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) throw new ApiError(404, 'Entreprise introuvable.')
    await ref.set({ enabledModules }, { merge: true })
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

    await db.recursiveDelete(ref) // company doc + vehicles/agencies/apiUsage/quotes subcollections
    await deletePrefix(`companies/${req.params.id}/`) // inspection photos (RGPD erasure)
    res.status(204).end()
  })
)

// --- Quotes / invoices (annual license, paid by bank transfer — no live
// payment processor here: "mark paid" just records that a transfer landed) ---

router.get(
  '/companies/:id/quotes',
  platformOnly,
  asyncRoute(async (req, res) => {
    const snap = await db.collection('companies').doc(req.params.id).collection('quotes').orderBy('createdAt', 'desc').get()
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
)

router.post(
  '/companies/:id/quotes',
  platformOnly,
  asyncRoute(async (req, res) => {
    const companyDoc = await db.collection('companies').doc(req.params.id).get()
    if (!companyDoc.exists) throw new ApiError(404, 'Entreprise introuvable.')

    const pricingModel = req.body?.pricingModel === 'usage' ? 'usage' : 'flat'
    const quote = {
      status: 'draft', // draft -> sent -> paid | cancelled
      pricingModel,
      amount: pricingModel === 'flat' ? Number(req.body?.amount) || 0 : null,
      usageTiers: pricingModel === 'usage' ? (Array.isArray(req.body?.usageTiers) ? req.body.usageTiers : []) : null,
      limits: {
        maxAgencies: Number(req.body?.limits?.maxAgencies) || null,
        maxVehicles: Number(req.body?.limits?.maxVehicles) || null,
        maxScansPerMonth: Number(req.body?.limits?.maxScansPerMonth) || null,
      },
      notes: String(req.body?.notes || '').slice(0, 1000),
      createdAt: Date.now(),
      paidAt: null,
      paymentReference: null,
    }
    const ref = await db.collection('companies').doc(req.params.id).collection('quotes').add(quote)
    res.status(201).json({ id: ref.id, ...quote })
  })
)

router.put(
  '/companies/:id/quotes/:quoteId/mark-paid',
  platformOnly,
  asyncRoute(async (req, res) => {
    const companyRef = db.collection('companies').doc(req.params.id)
    const quoteRef = companyRef.collection('quotes').doc(req.params.quoteId)
    const quoteDoc = await quoteRef.get()
    if (!quoteDoc.exists) throw new ApiError(404, 'Devis/facture introuvable.')

    const paymentReference = String(req.body?.paymentReference || '').slice(0, 120)
    const paidAt = Date.now()
    const quote = quoteDoc.data()

    await quoteRef.set({ status: 'paid', paidAt, paymentReference }, { merge: true })
    await companyRef.set(
      {
        status: 'active',
        trialEndsAt: null,
        license: {
          type: 'annual',
          pricingModel: quote.pricingModel,
          amount: quote.amount,
          usageTiers: quote.usageTiers,
          limits: quote.limits,
          startsAt: paidAt,
          endsAt: paidAt + YEAR_MS,
        },
      },
      { merge: true }
    )

    res.json({ ok: true })
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
        const annualFee = d.data().license?.amount || 0
        const estimatedCost = Math.round(count * API_COST_PER_CALL_EUR * 100) / 100
        return {
          companyId: d.id,
          name: d.data().name,
          count,
          annualFee,
          estimatedCost,
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
