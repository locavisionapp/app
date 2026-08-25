const { initializeApp, getApps } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { getAuth } = require('firebase-admin/auth')
const { getStorage } = require('firebase-admin/storage')

if (!getApps().length) {
  initializeApp()
}

const db = getFirestore()
const auth = getAuth()
const storage = getStorage()

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10) // YYYY-MM-DD
}

module.exports = { db, auth, storage, FieldValue, todayKey }
