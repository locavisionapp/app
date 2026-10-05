const { storage } = require('./db')
const { ApiError } = require('./asyncRoute')

// Per-photo cap. The client downscales to ~1600px / JPEG 0.8 (a few hundred
// KB), so anything near this limit is either a misbehaving API client or a
// raw camera frame that skipped downscaling.
const MAX_IMAGE_BYTES = 3 * 1024 * 1024

// Signed read URLs: inspection photos are private (B2B fleet data must not
// be world-readable), so every URL handed to a client or a webhook is a
// short-lived signed one.
const READ_URL_TTL_MS = 60 * 60 * 1000 // 1h, for the web app
const WEBHOOK_URL_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days (GCS v4 maximum), for CRM webhooks

function decodeImage(imageBase64) {
  if (typeof imageBase64 !== 'string') throw new ApiError(400, 'Image manquante.')
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
  const buffer = Buffer.from(base64Data, 'base64')
  if (buffer.length === 0) throw new ApiError(400, 'Photo vide ou illisible.')
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new ApiError(413, 'Photo trop volumineuse (3 Mo max).')
  }
  return buffer
}

function safeSegment(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)
}

function inspectionPhotoPath(companyId, vehicleId, inspectionId, stepId) {
  return `companies/${companyId}/vehicles/${vehicleId}/inspections/${safeSegment(inspectionId)}/${safeSegment(stepId)}.jpg`
}

/** Uploads one inspection photo (private) and returns its Storage path. */
async function uploadInspectionPhoto(companyId, vehicleId, inspectionId, stepId, imageBase64) {
  const buffer = decodeImage(imageBase64)
  const path = inspectionPhotoPath(companyId, vehicleId, inspectionId, stepId)
  await storage.bucket().file(path).save(buffer, { metadata: { contentType: 'image/jpeg' }, resumable: false })
  return path
}

/** Downloads previously uploaded photos as base64 (for the AI analysis). Missing files are reported, not thrown. */
async function downloadInspectionPhotos(paths) {
  const bucket = storage.bucket()
  return Promise.all(
    paths.map(async (path) => {
      try {
        const [buffer] = await bucket.file(path).download()
        return { path, image: buffer.toString('base64') }
      } catch (e) {
        if (e.code === 404) return { path, missing: true }
        throw e
      }
    })
  )
}

/**
 * Turns stored photo references into URLs a client can display. New
 * inspections store private Storage paths (signed on read); inspections
 * created before photos went private stored full public URLs, returned as-is.
 */
async function toPhotoUrls(refs = [], ttlMs = READ_URL_TTL_MS) {
  const bucket = storage.bucket()
  const expires = Date.now() + ttlMs
  return Promise.all(
    refs.map(async (ref) => {
      if (/^https?:\/\//.test(ref)) return ref
      try {
        const [url] = await bucket.file(ref).getSignedUrl({ version: 'v4', action: 'read', expires })
        return url
      } catch (e) {
        console.error('[storage] could not sign photo URL', e.message)
        return null
      }
    })
  )
}

/** Deletes every Storage object under a prefix (vehicle or company deletion — RGPD erasure). */
async function deletePrefix(prefix) {
  try {
    await storage.bucket().deleteFiles({ prefix, force: true })
  } catch (e) {
    console.error(`[storage] could not delete prefix ${prefix}`, e.message)
  }
}

module.exports = {
  uploadInspectionPhoto,
  downloadInspectionPhotos,
  inspectionPhotoPath,
  toPhotoUrls,
  deletePrefix,
  WEBHOOK_URL_TTL_MS,
}
