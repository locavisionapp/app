const crypto = require('crypto')
const { db, auth } = require('./db')

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex')
}

function generateApiKey() {
  return `sk_live_${crypto.randomBytes(24).toString('hex')}`
}

/**
 * Résout l'appelant à partir du header Authorization :
 * - `Bearer sk_live_...`  -> clé API d'entreprise (CRM tiers)
 * - `Bearer <idToken>`    -> utilisateur Firebase Auth (app web LocaVision)
 * Attache req.auth = { uid, role, companyId, via }.
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
      if (companyDoc.data().status !== 'active') return res.status(403).json({ error: 'Compte entreprise suspendu.' })
      req.auth = { uid: null, role: 'company_admin', companyId: companyDoc.id, via: 'apikey' }
      return next()
    }

    const decoded = await auth.verifyIdToken(token)
    const userDoc = await db.collection('users').doc(decoded.uid).get()
    if (!userDoc.exists) return res.status(403).json({ error: 'Utilisateur non provisionné.' })
    const { role, companyId } = userDoc.data()
    req.auth = { uid: decoded.uid, role, companyId: companyId || null, via: 'firebase' }
    return next()
  } catch (e) {
    return res.status(401).json({ error: 'Jeton invalide ou expiré.' })
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.auth?.role)) return res.status(403).json({ error: 'Accès refusé.' })
    next()
  }
}

module.exports = { authenticate, requireRole, hashApiKey, generateApiKey }
