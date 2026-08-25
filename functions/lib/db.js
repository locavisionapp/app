const { initializeApp, getApps, cert } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { getAuth } = require('firebase-admin/auth')
const { getStorage } = require('firebase-admin/storage')

if (!getApps().length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // Environments with no ambient Google credentials (Vercel, etc.):
    // initialize with an explicit service account.
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    })
  } else {
    // Cloud Functions / emulators: ambient credentials are auto-detected.
    initializeApp()
  }
}

const db = getFirestore()
const auth = getAuth()
const storage = getStorage()

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10) // YYYY-MM-DD
}

module.exports = { db, auth, storage, FieldValue, todayKey }
