const { db, todayKey, FieldValue } = require('./db')

/**
 * Compteur d'appels API par entreprise, utilisé par le dashboard admin plateforme.
 * Non bloquant : une écriture de comptage qui échoue ne doit jamais casser une requête.
 */
function logUsage(req, res, next) {
  next()
  const companyId = req.auth?.companyId
  if (!companyId) return // appels platform_admin non rattachés à une entreprise

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
