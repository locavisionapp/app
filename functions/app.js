const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const { db } = require('./lib/db')
const { authenticate } = require('./lib/auth')
const { logUsage } = require('./lib/usage')
const { asyncRoute } = require('./lib/asyncRoute')

const vehiclesRoutes = require('./routes/vehicles')
const companiesRoutes = require('./routes/companies')
const agenciesRoutes = require('./routes/agencies')

// Shared Express app: mounted on Firebase Cloud Functions (index.js) and on
// Vercel serverless functions (../api/handler.js). Keeping all business
// logic here means any future client (Flutter app, third-party CRM, this
// web app) talks to the exact same versioned HTTP API — no logic duplicated
// per platform.
const app = express()

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }))
app.use(cors({ origin: true }))
app.use(express.json({ limit: '15mb' }))

// Coarse abuse protection. Per-company/API-key throttling happens on top of
// this via req.auth once authenticated (see routes), this layer just caps
// raw request volume per IP before we've even resolved who's calling.
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
})

const v1 = express.Router()
v1.use(limiter, authenticate, logUsage)

v1.get(
  '/me',
  asyncRoute(async (req, res) => {
    const { role, companyId, uid } = req.auth
    let companyName = null
    if (companyId) {
      const doc = await db.collection('companies').doc(companyId).get()
      companyName = doc.data()?.name || null
    }
    res.json({ role, companyId, companyName, uid })
  })
)

v1.use(vehiclesRoutes)
v1.use(companiesRoutes)
v1.use(agenciesRoutes)

app.use('/v1', v1)

// 404 for anything under /v1 that didn't match a route above.
app.use('/v1', (req, res) => res.status(404).json({ error: 'Not found.' }))

// Central error handler: never leak internal error details (stack traces,
// third-party API messages) to the client — log server-side, return a safe
// generic message. Route-specific user-facing errors are thrown as
// ApiError(status, message) before reaching here.
app.use((err, req, res, next) => {
  console.error('[api] unhandled error', err)
  const status = err.status || 500
  const message = err.expose ? err.message : status === 400 ? 'Invalid request.' : 'Internal server error.'
  res.status(status).json({ error: message })
})

module.exports = app
