const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const { authenticate } = require('./lib/auth')
const { logUsage } = require('./lib/usage')
const { auditLog } = require('./lib/audit')
const { asyncRoute } = require('./lib/asyncRoute')
const { MODULES } = require('./lib/config')
const { readSignedPhoto } = require('./lib/storage')
const { emailEnabled } = require('./lib/email')

const vehiclesRoutes = require('./routes/vehicles')
const companiesRoutes = require('./routes/companies')
const agenciesRoutes = require('./routes/agencies')
const employeesRoutes = require('./routes/employees')
const companyRoutes = require('./routes/company')

// Shared Express app: mounted on Firebase Cloud Functions (index.js) and on
// Vercel serverless functions (../api/handler.js). Keeping all business
// logic here means any future client (Flutter app, third-party CRM, this
// web app) talks to the exact same versioned HTTP API — no logic duplicated
// per platform.
const app = express()

// Behind Vercel's / Google's proxy: trust the first hop so req.ip is the real
// client IP. Without this every caller shares the proxy's IP — i.e. one
// global rate-limit bucket for all customers.
app.set('trust proxy', 1)

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }))
app.use(cors({ origin: true, exposedHeaders: ['X-Next-Cursor'] }))
// Vercel rejects request bodies over 4.5MB before they reach us; stay under
// it so the error is ours (clear message) rather than a bare platform 413.
// Photos are uploaded one per request (~0.5MB each), never batched.
app.use(express.json({ limit: '4mb' }))

// Coarse abuse protection, per client IP, before we've even resolved who's
// calling. Sized for a whole agency behind one NAT running inspections at
// the same time (~20 calls per inspection).
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, réessayez dans une minute.' },
})

// Inspection photos (Firestore storage backend). <img> tags can't send an
// Authorization header, so access is granted by the URL's own short-lived
// HMAC signature instead (same model as Cloud Storage signed URLs).
app.get(
  '/v1/photos/:companyId/:photoId',
  limiter,
  asyncRoute(async (req, res) => {
    const data = await readSignedPhoto(req.params.companyId, req.params.photoId, req.query.e, req.query.s)
    if (!data) return res.status(403).json({ error: 'Lien de photo invalide ou expiré.' })
    res.set('Content-Type', 'image/jpeg')
    res.set('Cache-Control', 'private, max-age=3600')
    res.send(Buffer.from(data))
  })
)

const v1 = express.Router()
v1.use(limiter, authenticate, logUsage, auditLog)

v1.get(
  '/me',
  asyncRoute(async (req, res) => {
    const { role, companyId, uid } = req.auth
    const company = req.company || null
    res.json({
      role,
      companyId,
      companyName: company?.name || null,
      uid,
      username: req.auth.username || null,
      enabledModules: company ? company.enabledModules || MODULES : null,
      companyStatus: company?.status || null,
      trialEndsAt: company?.trialEndsAt || null,
      features: { email: emailEnabled() },
    })
  })
)

v1.use(vehiclesRoutes)
v1.use(companiesRoutes)
v1.use(agenciesRoutes)
v1.use(employeesRoutes)
v1.use(companyRoutes)

app.use('/v1', v1)

// 404 for anything under /v1 that didn't match a route above.
app.use('/v1', (req, res) => res.status(404).json({ error: 'Not found.' }))

// Central error handler: never leak internal error details (stack traces,
// third-party API messages) to the client — log server-side, return a safe
// generic message. Route-specific user-facing errors are thrown as
// ApiError(status, message) before reaching here.
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Requête trop volumineuse (4 Mo max). Envoyez les photos une par une.' })
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Corps de requête JSON invalide.' })
  }
  if (!err.expose) console.error('[api] unhandled error', err)
  const status = err.status || 500
  const message = err.expose ? err.message : status === 400 ? 'Requête invalide.' : 'Erreur interne du serveur. Réessayez dans un instant.'
  res.status(status).json({ error: message, ...(err.expose && err.payload ? err.payload : {}) })
})

module.exports = app
