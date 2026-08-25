// Fonction serverless Vercel : sert l'API publique /v1/** sans dépendre de
// Firebase Cloud Functions (plan Blaze non requis). Même app Express que
// functions/index.js — voir functions/app.js (CommonJS, importé ici en ESM
// car le package.json racine déclare "type": "module").
import app from '../../functions/app.js'

export default app
