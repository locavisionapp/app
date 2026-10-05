import { api, ApiError } from './api'
import { auth } from './firebase'

/**
 * Offline-safe inspection delivery.
 *
 * Inspections are captured in places with bad or no network (underground
 * car parks, rental lots). Nothing captured may be lost because the
 * connection dropped, so:
 * - each photo is uploaded on its own as soon as it's taken (best effort);
 * - on "submit", the whole inspection (photos + mileage) is first persisted
 *   to IndexedDB, then sent; if sending fails for a network reason it stays
 *   queued and is retried automatically (back online, app reopened, every
 *   30s) until the server confirms it;
 * - the server side is idempotent on the client-generated inspectionId, so a
 *   retry after a lost response never analyzes (or bills) an inspection twice.
 *
 * Record shape (IndexedDB "inspections" store, keyed by id = inspectionId):
 * { id, vehicleId, vehicleLabel, ownerUid, createdAt,
 *   steps: [{ stepId, label }], photos: { [stepId]: { image, v } },
 *   uploaded: { [stepId]: v }, mileage, status: 'pending' | 'failed', error }
 */

const DB_NAME = 'locavision'
const STORE = 'inspections'
const UPLOAD_CONCURRENCY = 3
const RETRY_INTERVAL_MS = 30000

// ---------- minimal IndexedDB wrapper ----------

let dbPromise = null
function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    }).catch((e) => {
      dbPromise = null
      throw e
    })
  }
  return dbPromise
}

async function tx(mode, fn) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const result = fn(t.objectStore(STORE))
    t.oncomplete = () => resolve(result instanceof IDBRequest ? result.result : result)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error || new Error('IndexedDB transaction aborted'))
  })
}

const store = {
  put: (record) => tx('readwrite', (s) => s.put(record)),
  get: (id) => tx('readonly', (s) => s.get(id)),
  delete: (id) => tx('readwrite', (s) => s.delete(id)),
  all: () => tx('readonly', (s) => s.getAll()),
}

// ---------- change notifications (for the sync banner) ----------

const listeners = new Set()
const sending = new Map() // id -> Promise, dedupes concurrent sends of one inspection

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notify(event = {}) {
  listeners.forEach((fn) => {
    try {
      fn(event)
    } catch (e) {
      console.error(e)
    }
  })
}

export function isSending(id) {
  return sending.has(id)
}

export async function listQueued() {
  try {
    const uid = auth.currentUser?.uid
    const all = await store.all()
    return all.filter((r) => !uid || r.ownerUid === uid).sort((a, b) => a.createdAt - b.createdAt)
  } catch (e) {
    console.error('[queue] IndexedDB unavailable', e)
    return []
  }
}

export async function discard(id) {
  await store.delete(id)
  notify({ type: 'discarded', id })
}

// ---------- photo uploads ----------

// Uploads of the same step are chained so the last capture always lands
// last (a retake can't be overwritten by a slower upload of the old photo).
const stepChains = new Map()

/** Uploads one photo; resolves with the server response ({ valid, instruction, ... }). */
export function uploadStepPhoto({ vehicleId, inspectionId, stepId, image, validate = false, pointName }) {
  const key = `${inspectionId}:${stepId}`
  const previous = stepChains.get(key) || Promise.resolve()
  const p = previous
    .catch(() => {})
    .then(() => api.uploadInspectionPhoto(vehicleId, inspectionId, { stepId, image, validate, pointName }))
  stepChains.set(key, p)
  p.catch(() => {}).finally(() => {
    if (stepChains.get(key) === p) stepChains.delete(key)
  })
  return p
}

async function uploadMissing(record, onProgress, persist) {
  const todo = record.steps.filter((s) => record.uploaded[s.stepId] !== record.photos[s.stepId]?.v)
  let done = record.steps.length - todo.length
  onProgress?.({ phase: 'upload', done, total: record.steps.length })

  const queue = [...todo]
  async function worker() {
    while (queue.length) {
      const step = queue.shift()
      const photo = record.photos[step.stepId]
      await uploadStepPhoto({ vehicleId: record.vehicleId, inspectionId: record.id, stepId: step.stepId, image: photo.image })
      record.uploaded[step.stepId] = photo.v
      done += 1
      onProgress?.({ phase: 'upload', done, total: record.steps.length })
      if (persist) await store.put(record).catch(() => {})
    }
  }
  await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, worker))
}

async function deliver(record, onProgress, persist) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await uploadMissing(record, onProgress, persist)
    onProgress?.({ phase: 'analyze' })
    try {
      return await api.submitInspection(record.vehicleId, {
        inspectionId: record.id,
        steps: record.steps.map((s) => s.stepId),
        mileage: record.mileage ?? undefined,
      })
    } catch (e) {
      // Server says some photos never made it (e.g. an upload "succeeded"
      // just before the connection died): re-upload those and retry once.
      const missing = e instanceof ApiError && e.status === 409 ? e.payload?.missingSteps : null
      if (!missing?.length || attempt > 0) throw e
      missing.forEach((stepId) => delete record.uploaded[stepId])
    }
  }
}

/**
 * Persists the inspection, then tries to deliver it right away.
 * Resolves with the analysis result once delivered; rejects with an
 * ApiError otherwise — the record stays queued ('pending', retried
 * automatically) for network/server errors, or is marked 'failed' (needs
 * a human decision) when the server rejected it.
 */
export async function submit(record, onProgress) {
  record.status = 'pending'
  record.error = null
  record.ownerUid = record.ownerUid || auth.currentUser?.uid || null
  record.createdAt = record.createdAt || Date.now()
  let persisted = true
  try {
    await store.put(record)
  } catch (e) {
    // Private browsing / storage full: still try to send, just without the
    // offline safety net.
    console.error('[queue] could not persist inspection', e)
    persisted = false
  }
  notify({ type: 'queued', id: record.id })
  return send(record, onProgress, persisted)
}

function send(record, onProgress, persisted = true) {
  if (sending.has(record.id)) return sending.get(record.id)
  const p = (async () => {
    notify({ type: 'sending', id: record.id })
    try {
      const result = await deliver(record, onProgress, persisted)
      if (persisted) await store.delete(record.id).catch(() => {})
      notify({ type: 'delivered', id: record.id, record, result })
      return result
    } catch (e) {
      const retryable = !(e instanceof ApiError) || e.isRetryable
      record.status = retryable ? 'pending' : 'failed'
      record.error = e.message
      if (persisted) await store.put(record).catch(() => {})
      notify({ type: retryable ? 'deferred' : 'failed', id: record.id, error: e })
      throw e
    } finally {
      sending.delete(record.id)
    }
  })()
  sending.set(record.id, p)
  return p
}

/** Retries a queued inspection on demand (e.g. "Réessayer" on a failed one). */
export async function retry(id) {
  const record = await store.get(id)
  if (!record) return null
  return send(record)
}

let processing = null

/** Sends every pending inspection of the signed-in user, oldest first. Stops at the first network failure. */
export function processQueue() {
  if (processing) return processing
  processing = (async () => {
    if (!auth.currentUser || (typeof navigator !== 'undefined' && navigator.onLine === false)) return
    const pending = (await listQueued()).filter((r) => r.status === 'pending' && !sending.has(r.id))
    for (const record of pending) {
      try {
        await send(record)
      } catch (e) {
        if (e instanceof ApiError && e.isNetworkError) break // still offline: try again later
      }
    }
  })().finally(() => {
    processing = null
  })
  return processing
}

let started = false

/** Wires automatic retries. Called once at app start. */
export function startBackgroundSync() {
  if (started || typeof window === 'undefined') return
  started = true
  window.addEventListener('online', () => {
    notify({ type: 'online' })
    processQueue()
  })
  window.addEventListener('offline', () => notify({ type: 'offline' }))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') processQueue()
  })
  setInterval(() => processQueue(), RETRY_INTERVAL_MS)
  auth.onAuthStateChanged((user) => {
    if (user) processQueue()
    notify({ type: 'auth' })
  })
}

/** Random id usable as an inspectionId (crypto.randomUUID needs a secure context, which camera access requires anyway). */
export function newInspectionId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
