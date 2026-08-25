const { onRequest } = require('firebase-functions/v2/https')
const app = require('./app')

// Firebase Cloud Functions entry point (requires the Blaze plan). While the
// project stays on Spark, api/handler.js (Vercel) serves this same Express
// app instead — see README for the switch-over.
exports.api = onRequest({ region: 'europe-west1', secrets: ['GEMINI_API_KEY', 'PLATE_RECOGNIZER_TOKEN', 'SIV_API_KEY'] }, app)
