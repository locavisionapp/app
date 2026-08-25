const { onRequest } = require('firebase-functions/v2/https')
const app = require('./app')

// Point d'entrée Firebase Cloud Functions (nécessite le plan Blaze). Tant que
// le projet reste sur Spark, c'est api/v1/[...path].cjs (Vercel) qui sert
// cette même app Express — voir README pour la bascule.
exports.api = onRequest({ region: 'europe-west1', secrets: ['GEMINI_API_KEY', 'PLATE_RECOGNIZER_TOKEN', 'SIV_API_KEY'] }, app)
