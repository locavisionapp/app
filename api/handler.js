// Vercel serverless function (fixed path, no dynamic route): serves the
// public /v1/** API without depending on Firebase Cloud Functions (no Blaze
// plan required). The sub-path is passed as a query string parameter by
// vercel.json — Vercel's [...path] catch-all routes don't correctly handle
// multi-segment paths under the Vite preset — then reconstructed here
// before being handed to the shared Express app (functions/app.js,
// CommonJS, imported via standard Node ESM/CJS interop).
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
