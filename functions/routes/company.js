const crypto = require('crypto')
const express = require('express')
const { db } = require('../lib/db')
const { requireRole, generateApiKey, hashApiKey } = require('../lib/auth')
const { asyncRoute, ApiError } = require('../lib/asyncRoute')
const { getBillingSettings } = require('../lib/billing')
const { sendQuotePdf } = require('../lib/quotePdf')

const router = express.Router()
const companyRole = requireRole('company_admin', 'employee')
const adminOnly = requireRole('company_admin')

// Webhooks are POSTed from our servers: refuse URLs pointing at internal
// hosts (SSRF), not just non-https ones.
function assertPublicHttpsUrl(value) {
  if (value.length > 500) throw new ApiError(400, 'URL de webhook trop longue.')
  let url
  try {
    url = new URL(value)
  } catch {
    throw new ApiError(400, 'URL de webhook invalide.')
  }
  if (url.protocol !== 'https:') throw new ApiError(400, "L'URL du webhook doit être en https://")
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  const isPrivate =
    host === 'localhost' ||
    /\.(localhost|internal|local)$/.test(host) ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === '::1' ||
    /^f[cd][0-9a-f]{2}:/.test(host) ||
    /^fe80:/.test(host)
  if (isPrivate) throw new ApiError(400, "L'URL du webhook doit pointer vers un serveur public.")
}

function companyRef(req) {
  return db.collection('companies').doc(req.auth.companyId)
}

// Self-service view of your own company account — API key status, usage,
// license/trial, module access (internal cost estimates stay admin-side). No plaintext API key is
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
      hasApiKey: !!data.apiKeyHash,
      webhookUrl: data.webhookUrl || null,
      // The signing secret lets anyone forge webhook events: admins only.
      webhookSecret: req.auth.role === 'company_admin' ? data.webhookSecret || null : null,
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
    if (webhookUrl) assertPublicHttpsUrl(webhookUrl)

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
    // Internal cost/margin estimates stay admin-side; cancelled quotes are hidden.
    res.json(
      snap.docs
        .filter((d) => d.data().status !== 'cancelled')
        .map((d) => {
          const { internal, ...quote } = d.data()
          return { id: d.id, ...quote }
        })
    )
  })
)

/** Activity log (admins), newest first, paginated with X-Next-Cursor; user names resolved. */
router.get(
  '/audit-log',
  adminOnly,
  asyncRoute(async (req, res) => {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200)
    const col = companyRef(req).collection('auditLog')
    let query = col.orderBy('at', 'desc')
    if (req.query.cursor) {
      const cursorDoc = await col.doc(String(req.query.cursor)).get()
      if (cursorDoc.exists) query = query.startAfter(cursorDoc)
    }
    const snap = await query.limit(limit + 1).get()
    const docs = snap.docs.slice(0, limit)
    const uids = [...new Set(docs.map((d) => d.data().uid).filter(Boolean))]
    const users = uids.length ? await db.getAll(...uids.map((uid) => db.collection('users').doc(uid))) : []
    const names = Object.fromEntries(users.filter((u) => u.exists).map((u) => [u.id, u.data().username || u.data().email]))
    if (snap.docs.length > limit) res.set('X-Next-Cursor', docs[docs.length - 1].id)
    res.json(docs.map((d) => {
      const { expireAt, ...entry } = d.data()
      return { id: d.id, ...entry, user: entry.via === 'apikey' ? 'Clé API' : names[entry.uid] || 'Compte supprimé' }
    }))
  })
)

router.get(
  '/company/quotes/:quoteId/pdf',
  companyRole,
  asyncRoute(async (req, res) => {
    const [quoteDoc, companyDoc, { seller }] = await Promise.all([
      companyRef(req).collection('quotes').doc(req.params.quoteId).get(),
      companyRef(req).get(),
      getBillingSettings(),
    ])
    if (!quoteDoc.exists || quoteDoc.data().status === 'cancelled') throw new ApiError(404, 'Document introuvable.')
    await sendQuotePdf(res, { quote: quoteDoc.data(), company: companyDoc.data(), seller })
  })
)

module.exports = router
