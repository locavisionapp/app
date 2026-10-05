/**
 * Pricing engine: one source of truth for the admin simulator, quotes and
 * their PDFs. Everything here is a DEFAULT — the platform admin overrides
 * any value from the "Paramètres" page (stored in platform/billing).
 *
 * Positioning (October 2026): priced below Fleetee Check — the closest
 * French competitor on digital vehicle check-in/out, without AI damage
 * detection — at every fleet size, while keeping a healthy margin thanks
 * to low AI costs (Gemini Flash: a few cents per inspection).
 *
 * Prices are excl. VAT, per year (annual license, paid by bank transfer).
 * Costs are LocaVision's own estimated running costs, used only to show the
 * margin in the simulator — adjust them to the real Google/Vercel bills.
 */
const DEFAULT_PRICING = {
  platformFee: 120, // € / year / company: account, support, updates
  minimumAnnual: 290, // € / year floor: below this, a customer doesn't cover its own support
  vehicleTiers: [
    // € per vehicle per MONTH, graduated by fleet-size bracket (like tax brackets)
    { upTo: 20, monthly: 2.4 },
    { upTo: 50, monthly: 1.6 },
    { upTo: 100, monthly: 1.3 },
    { upTo: 250, monthly: 1.1 },
    { upTo: null, monthly: 0.9 },
  ],
  includedAgencies: 1,
  extraAgencyYearly: 60, // € / year per agency beyond the included ones
  apiModuleYearly: 290, // € / year: API key + webhooks (CRM integration)
  // Inspections included per vehicle per month. Usage above it (e.g. a
  // vehicle inspected twice a day) is billed as an "intensive pack" at
  // extraScanPrice, so heavy users pay for what they consume.
  fairUseScansPerVehicleMonth: 20,
  extraScanPrice: 0.12, // € HT per inspection beyond the included ones
  usageCapBufferPct: 50, // license cap = max(included, expected usage) + this %, so nobody is blocked by a busy month
  // A quote for N vehicles allows N + this % before the license blocks new
  // vehicles, so an extra car or two never stops a customer.
  vehicleTolerancePct: 10,
  commitmentDiscounts: { 1: 0, 2: 0.08, 3: 0.12 }, // multi-year commitment discount (prices locked for the term)
  vatRate: 0.2,
}

const DEFAULT_COSTS = {
  avgScansPerVehicleMonth: 6, // default expected usage when the customer can't say (short-term rental: check-out + check-in)
  aiPerInspection: 0.035, // € — Gemini Flash, comparison mode (~70 images + ~4k output tokens ≈ 0.02-0.03 €)
  plateScanPerInspection: 0.01, // € — plate OCR (only when the inspection starts from a plate scan)
  sivLookupPerVehicle: 0.1, // € — registry lookup, once per new vehicle
  storageMbPerInspection: 8, // MB of photos per inspection
  storagePerGbYear: 0.35, // € / GB / year (Cloud Storage europe-west9 + operations)
  photoRetentionYears: 3, // photos kept this long: one year of inspections is stored for N years
  infraPerCompanyYear: 40, // € / year — share of hosting (Vercel Pro), monitoring, email
}

// Public list prices of the closest competitor, for the sales simulator.
// Indicative only — re-check before quoting them to a prospect.
const MARKET_BENCHMARK = {
  name: 'Fleetee Check (sans IA de détection)',
  source: 'fleetee.io/tarifs, octobre 2026, paiement annuel -10 %',
  brackets: [
    { upTo: 20, yearly: 73 * 12 * 0.9 },
    { upTo: 50, yearly: 133 * 12 * 0.9 },
    { upTo: 100, yearly: 223 * 12 * 0.9 },
  ],
}

const clampInt = (v, min, max, fallback) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback
}
const round2 = (n) => Math.round(n * 100) / 100
const fr = (n, digits = 0) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: digits })

const OVERRIDE_KEYS = ['platformFee', 'vehicleMonthly', 'fairUseScansPerVehicleMonth', 'extraScanPrice', 'extraAgencyYearly', 'apiModuleYearly', 'minimumAnnual', 'vehicleTolerancePct']

const optionalNumber = (v, min, max) => {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : null
}

/** Normalizes simulator/quote inputs (every per-quote override is optional). */
function normalizeInputs(raw = {}) {
  const commitmentYears = [1, 2, 3].includes(Number(raw.commitmentYears)) ? Number(raw.commitmentYears) : 1
  const overrides = {}
  for (const key of OVERRIDE_KEYS) {
    const n = optionalNumber(raw.overrides?.[key], 0, key === 'vehicleTolerancePct' ? 100 : 100000)
    if (n != null) overrides[key] = n
  }
  const customLines = (Array.isArray(raw.customLines) ? raw.customLines : [])
    .slice(0, 15)
    .map((l) => ({
      label: String(l?.label || '').trim().slice(0, 160),
      qty: optionalNumber(l?.qty, 0, 100000) ?? 1,
      unitPrice: optionalNumber(l?.unitPrice, -100000, 100000) ?? 0,
    }))
    .filter((l) => l.label)
  return {
    vehicles: clampInt(raw.vehicles, 1, 100000, 10),
    agencies: clampInt(raw.agencies, 1, 1000, 1),
    // Expected inspections per vehicle per month (null = default assumption).
    // `scansPerVehicleMonth` is the pre-overrides name of the same input.
    expectedScansPerVehicleMonth: optionalNumber(raw.expectedScansPerVehicleMonth ?? raw.scansPerVehicleMonth, 0, 3000),
    apiModule: Boolean(raw.apiModule),
    commitmentYears,
    discountPct: Math.min(Math.max(Number(raw.discountPct) || 0, 0), 50),
    overrides,
    customLines,
  }
}

/**
 * Computes a quote: invoice lines (yearly, excl. VAT), totals, the
 * estimated cost/margin for LocaVision at several usage levels, and a
 * market comparison.
 */
function computeQuote(rawInputs, pricing = DEFAULT_PRICING, costs = DEFAULT_COSTS) {
  const input = normalizeInputs(rawInputs)
  pricing = { ...pricing, ...input.overrides }
  const lines = []
  const warnings = []
  const expected = input.expectedScansPerVehicleMonth ?? costs.avgScansPerVehicleMonth

  lines.push({ label: 'Licence plateforme LocaVision (compte, mises à jour, support)', qty: 1, unit: 'an', unitPrice: pricing.platformFee })

  if (input.overrides.vehicleMonthly != null) {
    // Negotiated flat price per vehicle, replacing the graduated grid.
    lines.push({ label: `Véhicules suivis (tarif négocié : ${fr(input.overrides.vehicleMonthly, 2)} € / véhicule / mois)`, qty: input.vehicles, unit: 'véhicule / an', unitPrice: round2(input.overrides.vehicleMonthly * 12) })
  }
  // Graduated vehicle pricing: each bracket bills the vehicles that fall in it.
  let remaining = input.overrides.vehicleMonthly != null ? 0 : input.vehicles
  let previousCap = 0
  for (const tier of pricing.vehicleTiers) {
    if (remaining <= 0) break
    const bracket = tier.upTo == null ? Infinity : tier.upTo - previousCap
    const size = Math.min(remaining, bracket)
    if (size > 0) {
      lines.push({
        label: `Véhicules ${previousCap + 1} à ${previousCap + size} (${fr(tier.monthly, 2)} € / véhicule / mois)`,
        qty: size,
        unit: 'véhicule / an',
        unitPrice: round2(tier.monthly * 12),
      })
      remaining -= size
    }
    if (tier.upTo != null) previousCap = tier.upTo
  }

  const extraAgencies = Math.max(input.agencies - pricing.includedAgencies, 0)
  if (extraAgencies) lines.push({ label: 'Agences supplémentaires (multi-sites)', qty: extraAgencies, unit: 'agence / an', unitPrice: pricing.extraAgencyYearly })
  if (input.apiModule) lines.push({ label: 'Module API & webhooks (intégration CRM / logiciel métier)', qty: 1, unit: 'an', unitPrice: pricing.apiModuleYearly })

  // Intensive usage: inspections beyond the included ones are billed.
  const included = pricing.fairUseScansPerVehicleMonth
  const extraPerVehicleMonth = Math.max(expected - included, 0)
  if (extraPerVehicleMonth > 0) {
    lines.push({
      label: `Pack inspections intensif : +${fr(extraPerVehicleMonth, 1)} inspection(s) / véhicule / mois (${fr(pricing.extraScanPrice, 2)} € l'inspection)`,
      qty: Math.round(extraPerVehicleMonth * input.vehicles * 12),
      unit: 'inspection',
      unitPrice: pricing.extraScanPrice,
    })
  }
  for (const l of input.customLines) lines.push({ label: l.label, qty: l.qty, unit: 'personnalisé', unitPrice: l.unitPrice })

  const maxVehicles = Math.ceil(input.vehicles * (1 + (pricing.vehicleTolerancePct || 0) / 100))
  // License cap: comfortably above both the included and the expected usage.
  const capPerVehicle = Math.ceil(Math.max(included, expected) * (1 + (pricing.usageCapBufferPct ?? 50) / 100))
  const fairUseScansPerMonth = maxVehicles * capPerVehicle
  lines.push({
    label: `Inspections IA : ${fr(Math.max(included, expected), 1)} / véhicule / mois incluses (usage raisonnable : ${fr(fairUseScansPerMonth)} / mois au total)`,
    qty: 1,
    unit: 'inclus',
    unitPrice: 0,
  })
  if (maxVehicles > input.vehicles) {
    lines.push({ label: `Tolérance de flotte : jusqu'à ${maxVehicles} véhicules sans surcoût`, qty: 1, unit: 'inclus', unitPrice: 0 })
  }

  lines.forEach((l) => (l.total = round2(l.qty * l.unitPrice)))
  const subtotal = round2(lines.reduce((s, l) => s + l.total, 0))

  const discounts = []
  const commitmentRate = pricing.commitmentDiscounts[input.commitmentYears] || 0
  if (commitmentRate) discounts.push({ label: `Remise engagement ${input.commitmentYears} ans (-${Math.round(commitmentRate * 100)} %)`, amount: -round2(subtotal * commitmentRate) })
  const afterCommitment = subtotal + (discounts[0]?.amount || 0)
  if (input.discountPct) discounts.push({ label: `Remise commerciale (-${fr(input.discountPct, 1)} %)`, amount: -round2((afterCommitment * input.discountPct) / 100) })

  let totalHT = round2(subtotal + discounts.reduce((s, d) => s + d.amount, 0))
  // Floor: very small fleets (or deep discounts) still pay the minimum.
  if (pricing.minimumAnnual && totalHT < pricing.minimumAnnual) {
    const complement = round2(pricing.minimumAnnual - totalHT)
    lines.push({ label: `Complément minimum de facturation annuelle (${fr(pricing.minimumAnnual)} € HT)`, qty: 1, unit: 'an', unitPrice: complement, total: complement })
    if (input.discountPct) warnings.push('La remise fait passer le prix sous le minimum annuel : le minimum s’applique.')
    totalHT = pricing.minimumAnnual
  }
  const vat = round2(totalHT * pricing.vatRate)
  const totalTTC = round2(totalHT + vat)

  // ---- estimated running costs (yearly) at a given usage level ----
  const estimate = (scansPerVehicleMonth) => {
    const inspectionsYear = input.vehicles * scansPerVehicleMonth * 12
    const storageGb = (inspectionsYear * costs.storageMbPerInspection) / 1024
    // One year of photos is kept `photoRetentionYears` years: its full storage cost.
    const storageCost = storageGb * costs.storagePerGbYear * (costs.photoRetentionYears || 1)
    const costLines = [
      { label: 'Analyse IA des inspections', amount: round2(inspectionsYear * costs.aiPerInspection) },
      { label: 'Lecture de plaque', amount: round2(inspectionsYear * costs.plateScanPerInspection) },
      { label: 'Fiches SIV (nouveaux véhicules)', amount: round2(input.vehicles * costs.sivLookupPerVehicle) },
      { label: `Stockage photos (~${fr(storageGb, 1)} Go / an, conservés ${costs.photoRetentionYears || 1} an(s))`, amount: round2(storageCost) },
      { label: 'Hébergement & services (quote-part)', amount: round2(costs.infraPerCompanyYear) },
    ]
    const total = round2(costLines.reduce((sum, c) => sum + c.amount, 0))
    const margin = round2(totalHT - total)
    return { scansPerVehicleMonth, inspectionsYear, lines: costLines, total, margin, marginPct: totalHT ? Math.round((margin / totalHT) * 100) : 0 }
  }
  const base = estimate(expected)
  // How the margin moves if real usage differs from what the customer said.
  const scenarios = [
    { label: 'Moitié de l’usage prévu', ...estimate(Math.max(1, Math.round(expected / 2))) },
    { label: 'Usage prévu', ...base },
    { label: 'Double de l’usage prévu', ...estimate(Math.round(expected * 2)) },
    { label: 'Plafond de la licence', ...estimate(capPerVehicle) },
  ]
  if (base.marginPct < 50) warnings.push(`Marge faible à l'usage prévu (${base.marginPct} %) : réduisez la remise ou relevez un tarif.`)
  const atCap = scenarios[scenarios.length - 1]
  if (atCap.margin < 0) warnings.push('Un client au plafond de sa licence serait déficitaire : baissez la tolérance, relevez le prix de l’inspection supplémentaire ou réduisez la remise.')

  // ---- market comparison ----
  const bracket = MARKET_BENCHMARK.brackets.find((b) => input.vehicles <= b.upTo)
  const market = bracket
    ? { name: MARKET_BENCHMARK.name, source: MARKET_BENCHMARK.source, yearly: round2(bracket.yearly), savingPct: Math.round((1 - totalHT / bracket.yearly) * 100) }
    : null

  return {
    input,
    lines,
    subtotal,
    discounts,
    totalHT,
    vatRate: pricing.vatRate,
    vat,
    totalTTC,
    monthlyHT: round2(totalHT / 12),
    monthlyTTC: round2(totalTTC / 12),
    perVehicleMonthHT: round2(totalHT / 12 / input.vehicles),
    maxVehicles,
    fairUseScansPerMonth,
    assumedScansPerVehicleMonth: expected,
    includedScansPerVehicleMonth: included,
    capPerVehicleMonth: capPerVehicle,
    appliedPricing: pricing,
    inspectionsYear: base.inspectionsYear,
    costs: { lines: base.lines, total: base.total, perInspection: base.inspectionsYear ? round2(base.total / base.inspectionsYear) : null },
    margin: base.margin,
    marginPct: base.marginPct,
    scenarios: scenarios.map(({ lines: _lines, ...rest }) => rest).sort((a, b) => a.scansPerVehicleMonth - b.scansPerVehicleMonth),
    market,
    warnings,
    // Limits enforced by the license once the quote is paid.
    limits: { maxVehicles, maxAgencies: input.agencies, maxScansPerMonth: fairUseScansPerMonth },
  }
}

module.exports = { DEFAULT_PRICING, DEFAULT_COSTS, MARKET_BENCHMARK, OVERRIDE_KEYS, computeQuote, normalizeInputs }
