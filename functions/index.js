const { onRequest } = require('firebase-functions/v2/https')
const express = require('express')
const cors = require('cors')
const { db } = require('./lib/db')
const { authenticate } = require('./lib/auth')
const { logUsage } = require('./lib/usage')

const vehiclesRoutes = require('./routes/vehicles')
const companiesRoutes = require('./routes/companies')

const app = express()
app.use(cors({ origin: true }))
app.use(express.json({ limit: '15mb' }))

const v1 = express.Router()
v1.use(authenticate, logUsage)

v1.get('/me', async (req, res) => {
  const { role, companyId, uid } = req.auth
  let companyName = null
  if (companyId) {
    const doc = await db.collection('companies').doc(companyId).get()
    companyName = doc.data()?.name || null
  }
  res.json({ role, companyId, companyName, uid })
})

v1.use(vehiclesRoutes)
v1.use(companiesRoutes)

app.use('/v1', v1)

exports.api = onRequest({ region: 'europe-west1', secrets: ['GEMINI_API_KEY', 'PLATE_RECOGNIZER_TOKEN', 'SIV_API_KEY'] }, app)
