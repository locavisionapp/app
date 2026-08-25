// Fonction serverless Vercel (chemin fixe, pas de route dynamique) : sert
// l'API publique /v1/** sans dépendre de Firebase Cloud Functions (plan
// Blaze non requis). Le sous-chemin est passé en query string par
// vercel.json (les routes catch-all [...path] de Vercel ne gèrent pas
// correctement les chemins à plusieurs segments sous le preset Vite),
// puis reconstruit ici avant d'être transmis à l'app Express partagée
// (functions/app.js, CommonJS, importée en ESM par interop Node standard).
import app from '../functions/app.js'

export default function handler(req, res) {
  const [, search = ''] = req.url.split('?')
  const params = new URLSearchParams(search)
  const subPath = params.get('path') || ''
  params.delete('path')
  const rest = params.toString()
  req.url = `/v1/${subPath}${rest ? `?${rest}` : ''}`
  return app(req, res)
}
