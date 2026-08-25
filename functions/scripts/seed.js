/**
 * Crée un compte admin plateforme et une entreprise de démo (avec son compte
 * de connexion + clé API) pour pouvoir tester l'app immédiatement.
 *
 * Local (émulateurs) :
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 *   GCLOUD_PROJECT=demo-smoketest node functions/scripts/seed.js
 *
 * Projet réel (après `firebase login`) :
 *   GCLOUD_PROJECT=<votre-project-id> node functions/scripts/seed.js
 */
const { db, auth } = require('../lib/db')
const { generateApiKey, hashApiKey } = require('../lib/auth')

async function upsertUser(email, password, displayName) {
  try {
    return await auth.getUserByEmail(email)
  } catch {
    return auth.createUser({ email, password, displayName, emailVerified: true })
  }
}

async function seed() {
  // 1. Admin plateforme
  const adminEmail = 'admin@locavision.app'
  const adminPassword = 'LocaVision2026!'
  const adminUser = await upsertUser(adminEmail, adminPassword, 'Admin LocaVision')
  await db.collection('users').doc(adminUser.uid).set({ email: adminEmail, role: 'platform_admin', companyId: null }, { merge: true })

  // 2. Entreprise de démo + son compte + sa clé API
  const companyEmail = 'demo@locavision.app'
  const companyPassword = 'LocaVision2026!'
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
