const { db, todayKey, FieldValue } = require('./db')

/**
 * Per-company API call counter, used by the platform admin usage dashboard.
 * Non-blocking: a failed counter write must never break the actual request.
 */
function logUsage(req, res, next) {
  next()
  const companyId = req.auth?.companyId
  if (!companyId) return // platform_admin calls aren't tied to a company

  const endpoint = `${req.method} ${req.baseUrl}${req.path}`.replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:id')
  const date = todayKey()

  const dayRef = db.collection('companies').doc(companyId).collection('apiUsage').doc(date)
  const companyRef = db.collection('companies').doc(companyId)

  dayRef
    .set(
      {
        date,
        count: FieldValue.increment(1),
        [`byEndpoint.${endpoint.replace(/\//g, '_')}`]: FieldValue.increment(1),
      },
      { merge: true }
    )
    .catch((e) => console.error('[usage] write failed', e))

  companyRef.set({ apiCallCount: FieldValue.increment(1) }, { merge: true }).catch((e) => console.error('[usage] total write failed', e))
}

module.exports = { logUsage }
