const { db } = require('./db')
const { ApiError } = require('./asyncRoute')
const { DEFAULT_PRICING, DEFAULT_COSTS } = require('./pricing')

// Seller identity printed on quotes/invoices — filled in from the admin
// "Paramètres" page. French invoices legally need: name, legal form,
// address, SIREN/SIRET, VAT number, payment terms and late-payment terms.
const DEFAULT_SELLER = {
  name: 'LocaVision',
  legalForm: '',
  address: '',
  siret: '',
  vatNumber: '',
  email: '',
  phone: '',
  iban: '',
  bic: '',
  paymentTermsDays: 30,
  quoteValidityDays: 30,
  vatExempt: false, // micro-entreprise: "TVA non applicable, art. 293 B du CGI"
}

const settingsRef = () => db.collection('platform').doc('billing')
const countersRef = () => db.collection('platform').doc('counters')

let cache = null
let cacheAt = 0

async function getBillingSettings({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cacheAt < 60000) return cache
  const data = (await settingsRef().get()).data() || {}
  cache = {
    seller: { ...DEFAULT_SELLER, ...(data.seller || {}) },
    pricing: { ...DEFAULT_PRICING, ...(data.pricing || {}), commitmentDiscounts: { ...DEFAULT_PRICING.commitmentDiscounts, ...(data.pricing?.commitmentDiscounts || {}) } },
    costs: { ...DEFAULT_COSTS, ...(data.costs || {}) },
  }
  if (cache.seller.vatExempt) cache.pricing = { ...cache.pricing, vatRate: 0 }
  cacheAt = Date.now()
  return cache
}

const num = (v, min, max, label) => {
  const n = Number(v)
  if (!Number.isFinite(n) || n < min || n > max) throw new ApiError(400, `Valeur invalide : ${label}.`)
  return n
}
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max)

/** Validates and saves the admin's billing settings. */
async function saveBillingSettings(body = {}) {
  const seller = {}
  for (const key of ['name', 'legalForm', 'address', 'siret', 'vatNumber', 'email', 'phone', 'iban', 'bic']) {
    if (body.seller?.[key] != null) seller[key] = str(body.seller[key], key === 'address' ? 400 : 120)
  }
  if (body.seller?.paymentTermsDays != null) seller.paymentTermsDays = num(body.seller.paymentTermsDays, 0, 90, 'délai de paiement')
  if (body.seller?.quoteValidityDays != null) seller.quoteValidityDays = num(body.seller.quoteValidityDays, 1, 365, 'validité du devis')
  if (body.seller?.vatExempt != null) seller.vatExempt = Boolean(body.seller.vatExempt)

  const pricing = {}
  const p = body.pricing || {}
  for (const [key, max] of [['platformFee', 100000], ['extraAgencyYearly', 100000], ['apiModuleYearly', 100000], ['includedAgencies', 1000], ['includedScansPerVehicleMonth', 1000]]) {
    if (p[key] != null) pricing[key] = num(p[key], 0, max, key)
  }
  if (p.vatRate != null) pricing.vatRate = num(p.vatRate, 0, 0.3, 'taux de TVA')
  if (p.vehicleTiers != null) {
    if (!Array.isArray(p.vehicleTiers) || p.vehicleTiers.length < 1 || p.vehicleTiers.length > 8) throw new ApiError(400, 'Tranches de prix invalides.')
    let previous = 0
    pricing.vehicleTiers = p.vehicleTiers.map((t, i) => {
      const last = i === p.vehicleTiers.length - 1
      const upTo = last ? null : num(t.upTo, previous + 1, 1000000, 'borne de tranche')
      previous = upTo || previous
      return { upTo, monthly: num(t.monthly, 0, 1000, 'prix de tranche') }
    })
  }
  if (p.commitmentDiscounts != null) {
    pricing.commitmentDiscounts = {}
    for (const years of ['1', '2', '3']) pricing.commitmentDiscounts[years] = num(p.commitmentDiscounts[years] ?? 0, 0, 0.5, 'remise engagement')
  }

  const costs = {}
  for (const key of Object.keys(DEFAULT_COSTS)) {
    if (body.costs?.[key] != null) costs[key] = num(body.costs[key], 0, 100000, key)
  }

  await settingsRef().set({ seller, pricing, costs, updatedAt: Date.now() }, { merge: true })
  cache = null
  return getBillingSettings({ fresh: true })
}

/** Next sequential document number, e.g. DEV-2026-0001 / FAC-2026-0001 (no gaps, per year — French invoicing rule). */
async function nextDocumentNumber(prefix) {
  const year = new Date().getFullYear()
  const field = `${prefix}-${year}`
  const n = await db.runTransaction(async (t) => {
    const snap = await t.get(countersRef())
    const next = (snap.data()?.[field] || 0) + 1
    t.set(countersRef(), { [field]: next }, { merge: true })
    return next
  })
  return `${prefix}-${year}-${String(n).padStart(4, '0')}`
}

module.exports = { getBillingSettings, saveBillingSettings, nextDocumentNumber, DEFAULT_SELLER }
