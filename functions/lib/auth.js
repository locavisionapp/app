const crypto = require('crypto')
const { db, auth } = require('./db')
const { MODULES } = require('./config')

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex')
}

function generateApiKey() {
  return `sk_live_${crypto.randomBytes(24).toString('hex')}`
}

/**
 * Checks whether a company's access is currently valid (not suspended, trial
 * not expired, annual license not lapsed) and flips its status to 'expired'
 * the first time an expiry is observed, so the platform admin sees it
 * without having to poll every company on a schedule.
 */
async function checkCompanyAccess(companyDoc) {
  const data = companyDoc.data()
  if (data.status === 'suspended') return { ok: false, reason: 'Compte entreprise suspendu.' }
  if (data.status === 'expired') return { ok: false, reason: 'Licence expirée. Contactez LocaVision pour la renouveler.' }

  const now = Date.now()
  if (data.status === 'trial' && data.trialEndsAt && now > data.trialEndsAt) {
    await companyDoc.ref.set({ status: 'expired' }, { merge: true })
    return { ok: false, reason: "Période d'essai terminée. Contactez LocaVision pour souscrire." }
  }
  if (data.status === 'active' && data.license?.endsAt && now > data.license.endsAt) {
    await companyDoc.ref.set({ status: 'expired' }, { merge: true })
    return { ok: false, reason: 'Licence expirée. Contactez LocaVision pour la renouveler.' }
  }
  return { ok: true }
}

/**
 * Resolves the caller from the Authorization header:
 * - `Bearer sk_live_...` -> company API key (third-party CRM integration)
 * - `Bearer <idToken>`   -> Firebase Auth user (LocaVision web app)
 * Attaches req.auth = { uid, role, companyId, via } and, for company callers,
 * req.company (the company document's data, already loaded for the access
 * check — routes reuse it instead of re-reading it).
 */
async function authenticate(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Authentification requise.' })

  try {
    if (token.startsWith('sk_live_')) {
      const snap = await db.collection('companies').where('apiKeyHash', '==', hashApiKey(token)).limit(1).get()
      if (snap.empty) return res.status(401).json({ error: 'Clé API invalide.' })
      const companyDoc = snap.docs[0]
      const modules = companyDoc.data().enabledModules || MODULES // missing = pre-existing company, treat as full access
      if (!modules.includes('api')) return res.status(403).json({ error: "Accès API non activé pour ce compte." })
      const access = await checkCompanyAccess(companyDoc)
      if (!access.ok) return res.status(403).json({ error: access.reason })
      req.auth = { uid: null, role: 'company_admin', companyId: companyDoc.id, via: 'apikey' }
      req.company = companyDoc.data()
      return next()
    }

    let decoded
    try {
      decoded = await auth.verifyIdToken(token)
    } catch (e) {
      return res.status(401).json({ error: 'Jeton invalide ou expiré.' })
    }
    const userDoc = await db.collection('users').doc(decoded.uid).get()
    if (!userDoc.exists) return res.status(403).json({ error: 'Utilisateur non provisionné.' })
    const { role, companyId, active } = userDoc.data()
    if (active === false) return res.status(403).json({ error: 'Ce compte a été désactivé.' })

    if (companyId) {
      const companyDoc = await db.collection('companies').doc(companyId).get()
      if (!companyDoc.exists) return res.status(403).json({ error: 'Entreprise introuvable.' })
      const access = await checkCompanyAccess(companyDoc)
      if (!access.ok) return res.status(403).json({ error: access.reason })
      req.company = companyDoc.data()
    }

    req.auth = { uid: decoded.uid, role, companyId: companyId || null, via: 'firebase' }
    return next()
  } catch (e) {
    // Datastore outage etc. — a server error, not a bad credential: don't
    // tell the client its (valid) session is invalid.
    return next(e)
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.auth?.role)) return res.status(403).json({ error: 'Accès refusé.' })
    next()
  }
}

/** Gates a route behind a company feature module (see config.js#MODULES). */
function requireModule(moduleName) {
  return (req, res, next) => {
    if (req.auth.role === 'platform_admin') return next() // platform admin bypasses module gating
    if (!MODULES.includes(moduleName)) return next()
    const modules = req.company?.enabledModules || MODULES // missing = pre-existing company, treat as full access
    if (!modules.includes(moduleName)) {
      return res.status(403).json({ error: `Module "${moduleName}" non activé pour ce compte.` })
    }
    next()
  }
}

module.exports = { authenticate, requireRole, requireModule, hashApiKey, generateApiKey }
