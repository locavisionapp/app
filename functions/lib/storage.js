const crypto = require('crypto')
const { db, storage } = require('./db')
const { ApiError } = require('./asyncRoute')

/**
 * Inspection photo storage, with two interchangeable backends:
 * - 'firestore' (default): each photo is one Firestore document holding the
 *   JPEG bytes. Works on the free Spark plan (no Cloud Storage bucket
 *   needed), but a document is capped at 1MiB and Spark at 1GiB in total
 *   (~150-300 inspections).
 * - 'gcs': Firebase/Cloud Storage bucket (requires the Blaze plan). Set
 *   PHOTO_STORAGE=gcs once the bucket exists.
 * Either way photos are private and only reachable through short-lived
 * signed URLs. Inspections reference photos by a backend-neutral path
 * (companies/{c}/vehicles/{v}/inspections/{i}/{step}.jpg).
 */
const BACKEND = process.env.PHOTO_STORAGE === 'gcs' ? 'gcs' : 'firestore'

// Per-photo cap. The client downscales to ~1600px / JPEG 0.8 (150-400KB)
// and re-compresses anything bigger, so hitting this means a misbehaving
// API client or a raw camera frame.
const MAX_IMAGE_BYTES = BACKEND === 'gcs' ? 3 * 1024 * 1024 : 900 * 1024

const READ_URL_TTL_MS = 60 * 60 * 1000 // 1h, for the web app
const WEBHOOK_URL_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days, for CRM webhooks

const PATH_PATTERN = /^companies\/([^/]+)\/vehicles\/([^/]+)\/inspections\/([^/]+)\/([^/]+)\.jpg$/
const MAX_THUMB_BYTES = 250 * 1024

/** Path of the 768px thumbnail stored next to a photo. */
function thumbPathOf(path) {
  return path.replace(/\.jpg$/, '.thumb.jpg')
}

function decodeImage(imageBase64, maxBytes = MAX_IMAGE_BYTES) {
  if (typeof imageBase64 !== 'string') throw new ApiError(400, 'Image manquante.')
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
  const buffer = Buffer.from(base64Data, 'base64')
  if (buffer.length === 0) throw new ApiError(400, 'Photo vide ou illisible.')
  if (buffer.length > maxBytes) {
    throw new ApiError(413, `Photo trop volumineuse (${Math.round(maxBytes / 1024)} Ko max).`)
  }
  return buffer
}

function safeSegment(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)
}

function inspectionPhotoPath(companyId, vehicleId, inspectionId, stepId) {
  return `companies/${companyId}/vehicles/${vehicleId}/inspections/${safeSegment(inspectionId)}/${safeSegment(stepId)}.jpg`
}

// ---------- Firestore backend ----------

function photoDocId(vehicleId, inspectionId, stepId) {
  return `${vehicleId}__${inspectionId}__${stepId}`
}

function photoDocFromPath(path) {
  const m = PATH_PATTERN.exec(path)
  if (!m) return null
  const [, companyId, vehicleId, inspectionId, stepId] = m
  return { companyId, docId: photoDocId(vehicleId, inspectionId, stepId), vehicleId, inspectionId, stepId }
}

function photosCol(companyId) {
  return db.collection('companies').doc(companyId).collection('photos')
}

// Signing secret for photo URLs: explicit env var, else derived from the
// service account private key (already a secret on Vercel). Emulator-only
// fallback so local dev works without configuration.
function urlSecret() {
  if (process.env.PHOTO_URL_SECRET) return process.env.PHOTO_URL_SECRET
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    return crypto.createHash('sha256').update(`photo-urls:${process.env.FIREBASE_SERVICE_ACCOUNT_KEY}`).digest('hex')
  }
  if (process.env.FIRESTORE_EMULATOR_HOST) return 'emulator-only-photo-secret'
  throw new Error('No secret available to sign photo URLs (set PHOTO_URL_SECRET).')
}

function sign(companyId, docId, exp) {
  return crypto.createHmac('sha256', urlSecret()).update(`${companyId}/${docId}:${exp}`).digest('base64url')
}

/** Checks a /v1/photos/:companyId/:docId?e=&s= request; returns the photo bytes or null. */
async function readSignedPhoto(companyId, docId, exp, sig) {
  const expires = Number(exp)
  if (!Number.isFinite(expires) || expires < Date.now() || typeof sig !== 'string') return null
  const expected = sign(companyId, docId, expires)
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  const doc = await photosCol(companyId).doc(docId).get()
  return doc.exists ? doc.data().data : null
}

// ---------- public API ----------

async function storeBuffer(companyId, vehicleId, path, buffer) {
  if (BACKEND === 'gcs') {
    await storage.bucket().file(path).save(buffer, { metadata: { contentType: 'image/jpeg' }, resumable: false })
    return
  }
  const ref = photoDocFromPath(path)
  await photosCol(companyId).doc(ref.docId).set({
    vehicleId,
    inspectionId: ref.inspectionId,
    stepId: ref.stepId,
    contentType: 'image/jpeg',
    size: buffer.length,
    data: buffer,
    createdAt: Date.now(),
  })
}

/** Stores one inspection photo (private) — and its thumbnail when given — and returns the photo path. */
async function uploadInspectionPhoto(companyId, vehicleId, inspectionId, stepId, imageBase64, { thumb } = {}) {
  const buffer = decodeImage(imageBase64)
  const thumbBuffer = typeof thumb === 'string' && thumb ? decodeImage(thumb, MAX_THUMB_BYTES) : null
  const path = inspectionPhotoPath(companyId, vehicleId, inspectionId, stepId)
  await Promise.all([
    storeBuffer(companyId, vehicleId, path, buffer),
    thumbBuffer ? storeBuffer(companyId, vehicleId, thumbPathOf(path), thumbBuffer) : null,
  ])
  return path
}

async function readOne(path) {
  if (BACKEND === 'gcs') {
    try {
      const [buffer] = await storage.bucket().file(path).download()
      return buffer
    } catch (e) {
      if (e.code === 404) return null
      throw e
    }
  }
  const ref = photoDocFromPath(path)
  const doc = ref && (await photosCol(ref.companyId).doc(ref.docId).get())
  return doc?.exists ? Buffer.from(doc.data().data) : null
}

/** Which thumbnails exist, for a list of photo paths (array of thumb path | null). */
async function existingThumbPaths(paths) {
  return Promise.all(
    paths.map(async (path) => {
      const thumb = thumbPathOf(path)
      if (BACKEND === 'gcs') {
        const [exists] = await storage.bucket().file(thumb).exists()
        return exists ? thumb : null
      }
      const ref = photoDocFromPath(thumb)
      const doc = await photosCol(ref.companyId).doc(ref.docId).get()
      return doc.exists ? thumb : null
    })
  )
}

/**
 * Downloads previously uploaded photos as base64 (for the AI analysis).
 * `preferThumbs` reads the thumbnail when there is one (comparison
 * references). Missing files are reported, not thrown.
 */
async function downloadInspectionPhotos(paths, { preferThumbs = false } = {}) {
  return Promise.all(
    paths.map(async (path) => {
      const buffer = (preferThumbs && (await readOne(thumbPathOf(path)))) || (await readOne(path))
      return buffer ? { path, image: buffer.toString('base64') } : { path, missing: true }
    })
  )
}

/**
 * Turns stored photo references into URLs a client can display, valid for
 * `ttlMs`. `baseUrl` (e.g. https://app.example.com) makes Firestore-backend
 * URLs absolute, which webhook receivers need. Inspections created before
 * photos went private stored full public URLs, returned as-is.
 */
async function toPhotoUrls(refs = [], { ttlMs = READ_URL_TTL_MS, baseUrl = '' } = {}) {
  const expires = Date.now() + ttlMs
  return Promise.all(
    refs.map(async (ref) => {
      if (/^https?:\/\//.test(ref)) return ref
      try {
        if (BACKEND === 'gcs') {
          const [url] = await storage.bucket().file(ref).getSignedUrl({ version: 'v4', action: 'read', expires })
          return url
        }
        const photo = photoDocFromPath(ref)
        if (!photo) return null
        return `${baseUrl}/v1/photos/${photo.companyId}/${photo.docId}?e=${expires}&s=${sign(photo.companyId, photo.docId, expires)}`
      } catch (e) {
        console.error('[storage] could not sign photo URL', e.message)
        return null
      }
    })
  )
}

/** Deletes every photo of a vehicle (RGPD erasure on vehicle deletion). */
async function deleteVehiclePhotos(companyId, vehicleId) {
  try {
    if (BACKEND === 'gcs') {
      await storage.bucket().deleteFiles({ prefix: `companies/${companyId}/vehicles/${vehicleId}/`, force: true })
      return
    }
    const snap = await photosCol(companyId).where('vehicleId', '==', vehicleId).select().get()
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = db.batch()
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
  } catch (e) {
    console.error(`[storage] could not delete photos of vehicle ${vehicleId}`, e.message)
  }
}

/** Deletes the photos (and thumbnails) of one inspection — abandoned uploads. */
async function deleteInspectionPhotos(companyId, vehicleId, inspectionId) {
  if (BACKEND === 'gcs') {
    await storage.bucket().deleteFiles({ prefix: `companies/${companyId}/vehicles/${vehicleId}/inspections/${safeSegment(inspectionId)}/`, force: true })
    return
  }
  const snap = await photosCol(companyId).where('inspectionId', '==', safeSegment(inspectionId)).select().get()
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db.batch()
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
}

/**
 * Cheaper storage classes for old photos (Cloud Storage backend): photos are
 * read often in their first weeks (review, comparison, reports), rarely
 * after. Nearline after 60 days (~45 % cheaper), Coldline after a year
 * (~75 % cheaper); reading an old photo stays possible (small per-GB fee).
 */
async function applyColdStorageLifecycle() {
  if (BACKEND !== 'gcs') throw new ApiError(400, 'Disponible uniquement avec PHOTO_STORAGE=gcs (Firebase Storage).')
  const rules = [
    { action: { type: 'SetStorageClass', storageClass: 'NEARLINE' }, condition: { age: 60, matchesStorageClass: ['STANDARD'] } },
    { action: { type: 'SetStorageClass', storageClass: 'COLDLINE' }, condition: { age: 365, matchesStorageClass: ['NEARLINE'] } },
  ]
  await storage.bucket().setMetadata({ lifecycle: { rule: rules } })
  return rules
}

/** Deletes every photo of a company. Firestore-backend photos already go with the company's recursiveDelete. */
async function deleteCompanyPhotos(companyId) {
  if (BACKEND !== 'gcs') return
  try {
    await storage.bucket().deleteFiles({ prefix: `companies/${companyId}/`, force: true })
  } catch (e) {
    console.error(`[storage] could not delete photos of company ${companyId}`, e.message)
  }
}

module.exports = {
  BACKEND,
  deleteInspectionPhotos,
  applyColdStorageLifecycle,
  thumbPathOf,
  existingThumbPaths,
  uploadInspectionPhoto,
  downloadInspectionPhotos,
  inspectionPhotoPath,
  toPhotoUrls,
  readSignedPhoto,
  deleteVehiclePhotos,
  deleteCompanyPhotos,
  WEBHOOK_URL_TTL_MS,
}
