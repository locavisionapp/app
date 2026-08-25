// Fonction serverless Vercel : sert l'API publique /v1/** sans dépendre de
// Firebase Cloud Functions (plan Blaze non requis). Même app Express que
// functions/index.js — voir functions/app.js.
module.exports = require('../../functions/app.js')
