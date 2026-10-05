/**
 * Creates a platform admin account and a demo company (with its login +
 * API key + one demo agency) so the app can be tested immediately.
 *
 * Local (emulators):
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 *   GCLOUD_PROJECT=demo-smoketest node functions/scripts/seed.js
 *
 * Real project (after `firebase login`):
 *   GCLOUD_PROJECT=<your-project-id> node functions/scripts/seed.js
 */
const { db, auth } = require('../lib/db')
const crypto = require('crypto')
const { generateApiKey, hashApiKey } = require('../lib/auth')

// Never a fixed password in the repo: SEED_PASSWORD if given, otherwise a
// random one printed once at the end.
const SEED_PASSWORD = process.env.SEED_PASSWORD || `${crypto.randomBytes(9).toString('base64url')}!`

async function upsertUser(email, password, displayName) {
  try {
    return await auth.getUserByEmail(email)
  } catch {
    return auth.createUser({ email, password, displayName, emailVerified: true })
  }
}

async function seed() {
  // 1. Platform admin
  const adminEmail = 'admin@locavision.app'
  const adminPassword = SEED_PASSWORD
  const adminUser = await upsertUser(adminEmail, adminPassword, 'Admin LocaVision')
  await db.collection('users').doc(adminUser.uid).set({ email: adminEmail, role: 'platform_admin', companyId: null }, { merge: true })

  // 2. Demo company + its login + its API key
  const companyEmail = 'demo@locavision.app'
  const companyPassword = SEED_PASSWORD
  const existingCompany = await db.collection('companies').where('contactEmail', '==', companyEmail).limit(1).get()

  let companyId, apiKey
  if (!existingCompany.empty) {
    companyId = existingCompany.docs[0].id
    apiKey = '(déjà créée — régénérez-la depuis /admin/companies si besoin)'
  } else {
    apiKey = generateApiKey()
    const companyRef = db.collection('companies').doc()
    companyId = companyRef.id
    await companyRef.set({
      name: 'Entreprise Démo',
      contactEmail: companyEmail,
      status: 'active',
      apiKeyHash: hashApiKey(apiKey),
      apiCallCount: 0,
      createdAt: Date.now(),
    })
  }

  const companyUser = await upsertUser(companyEmail, companyPassword, 'Entreprise Démo')
  await db.collection('users').doc(companyUser.uid).set({ email: companyEmail, role: 'company_admin', companyId }, { merge: true })

  // 3. One demo agency, so fleet filters have something to filter by.
  const agenciesCol = db.collection('companies').doc(companyId).collection('agencies')
  const existingAgency = await agenciesCol.limit(1).get()
  if (existingAgency.empty) {
    await agenciesCol.add({ name: 'Agence Paris Centre', city: 'Paris', address: '', createdAt: Date.now() })
  }

  console.log('\n=== Comptes de test créés ===')
  console.log('Admin plateforme  →', adminEmail, '/', adminPassword)
  console.log('Entreprise démo   →', companyEmail, '/', companyPassword)
  console.log('Clé API entreprise →', apiKey)
  console.log('==============================\n')
  process.exit(0)
}

seed().catch((e) => {
  console.error('Échec du seed:', e)
  process.exit(1)
})
