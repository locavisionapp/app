const { db } = require('./db')

const RETENTION_MS = 365 * 24 * 60 * 60 * 1000

/**
 * Company activity log: every successful write (POST/PUT/DELETE) made by a
 * company user or API key — who, what, when. Photo uploads are skipped
 * (dozens per inspection; the inspection itself is logged). `expireAt` lets
 * a Firestore TTL policy purge entries after a year. Never blocks or fails
 * the request.
 */
function auditLog(req, res, next) {
  if (req.method === 'GET' || !req.auth?.companyId) return next()
  res.on('finish', () => {
    if (res.statusCode >= 400) return
    const path = `${req.baseUrl}${req.path}`
    if (/\/photos$/.test(path) || /\/validate-step$/.test(path) || /\/lookup-plate$/.test(path) || /\/scan-plate$/.test(path)) return
    const now = Date.now()
    db.collection('companies')
      .doc(req.auth.companyId)
      .collection('auditLog')
      .add({
        at: now,
        expireAt: new Date(now + RETENTION_MS),
        uid: req.auth.uid || null,
        via: req.auth.via,
        method: req.method,
        path: path.slice(0, 300),
        status: res.statusCode,
      })
      .catch((e) => console.error('[audit] write failed', e.message))
  })
  next()
}

module.exports = { auditLog }
