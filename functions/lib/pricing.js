/**
 * Pricing engine: one source of truth for the admin simulator, quotes and
 * their PDFs. Everything here is a DEFAULT — the platform admin overrides
 * any value from the "Paramètres" page (stored in platform/billing).
 *
 * Prices are excl. VAT, per year (annual license, paid by bank transfer).
 * Costs are LocaVision's own estimated running costs, used only to show the
 * margin in the simulator — adjust them to the real Google/Vercel bills.
 */
const DEFAULT_PRICING = {
  platformFee: 490, // € / year / company: account, support, updates
  vehicleTiers: [
    // € per vehicle per MONTH, by fleet-size bracket (graduated, like tax brackets)
    { upTo: 20, monthly: 4 },
    { upTo: 100, monthly: 3 },
    { upTo: 500, monthly: 2.2 },
    { upTo: null, monthly: 1.6 },
  ],
  includedAgencies: 1,
  extraAgencyYearly: 120, // € / year per agency beyond the included ones
  apiModuleYearly: 390, // € / year: API key + webhooks (CRM integration)
  // Customers know their fleet size, not how many inspections they'll do:
  // inspections are unlimited, with a high fair-use cap (anti-abuse only).
  fairUseScansPerVehicleMonth: 30,
  // A quote for N vehicles allows N + this % before the license blocks new
  // vehicles, so an extra car or two never stops a customer.
  vehicleTolerancePct: 10,
  commitmentDiscounts: { 1: 0, 2: 0.08, 3: 0.12 }, // multi-year commitment discount
  vatRate: 0.2,
}

const DEFAULT_COSTS = {
  avgScansPerVehicleMonth: 4, // internal usage assumption for the margin estimate
  aiPerInspection: 0.05, // € — Gemini analysis (up to ~80 images in comparison mode)
  plateScanPerInspection: 0.01, // € — plate OCR at each inspection
  sivLookupPerVehicle: 0.1, // € — registry lookup, once per new vehicle
  storageMbPerInspection: 8, // MB of photos per inspection
  storagePerGbYear: 0.35, // € / GB / year (Cloud Storage europe-west9 + operations)
  infraPerCompanyYear: 40, // € / year — share of hosting, monitoring, email
}

const clampInt = (v, min, max, fallback) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback
}
const round2 = (n) => Math.round(n * 100) / 100

/** Normalizes simulator/quote inputs. */
function normalizeInputs(raw = {}) {
  const commitmentYears = [1, 2, 3].includes(Number(raw.commitmentYears)) ? Number(raw.commitmentYears) : 1
  return {
    vehicles: clampInt(raw.vehicles, 1, 100000, 10),
    agencies: clampInt(raw.agencies, 1, 1000, 1),
    // Internal margin assumption only (null = the default from settings).
    scansPerVehicleMonth: raw.scansPerVehicleMonth === '' || raw.scansPerVehicleMonth == null ? null : clampInt(raw.scansPerVehicleMonth, 0, 200, null),
    apiModule: Boolean(raw.apiModule),
    commitmentYears,
    discountPct: Math.min(Math.max(Number(raw.discountPct) || 0, 0), 50),
  }
}

/**
 * Computes a quote: invoice lines (yearly, excl. VAT), totals, and the
 * estimated cost/margin for LocaVision.
 */
function computeQuote(rawInputs, pricing = DEFAULT_PRICING, costs = DEFAULT_COSTS) {
  const input = normalizeInputs(rawInputs)
  const lines = []

  lines.push({ label: 'Licence plateforme LocaVision (compte, mises à jour, support)', qty: 1, unit: 'an', unitPrice: pricing.platformFee })

  let remaining = input.vehicles
  let previousCap = 0
  for (const tier of pricing.vehicleTiers) {
    if (remaining <= 0) break
    const bracket = tier.upTo == null ? Infinity : tier.upTo - previousCap
    const size = Math.min(remaining, bracket)
    if (size > 0) {
      lines.push({
        label: `Véhicules suivis — de ${previousCap + 1} à ${tier.upTo == null ? previousCap + size : tier.upTo} (${tier.monthly.toLocaleString('fr-FR')} € / véhicule / mois)`,
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

  const maxVehicles = Math.ceil(input.vehicles * (1 + (pricing.vehicleTolerancePct || 0) / 100))
  const fairUseScansPerMonth = maxVehicles * pricing.fairUseScansPerVehicleMonth
  lines.push({ label: `Inspections IA illimitées (usage raisonnable : ${fairUseScansPerMonth.toLocaleString('fr-FR')} / mois)`, qty: 1, unit: 'inclus', unitPrice: 0 })
  if (maxVehicles > input.vehicles) {
    lines.push({ label: `Tolérance de flotte : jusqu'à ${maxVehicles} véhicules sans surcoût`, qty: 1, unit: 'inclus', unitPrice: 0 })
  }

  lines.forEach((l) => (l.total = round2(l.qty * l.unitPrice)))
  const subtotal = round2(lines.reduce((s, l) => s + l.total, 0))

  const discounts = []
  const commitmentRate = pricing.commitmentDiscounts[input.commitmentYears] || 0
  if (commitmentRate) discounts.push({ label: `Remise engagement ${input.commitmentYears} ans (-${Math.round(commitmentRate * 100)} %)`, amount: -round2(subtotal * commitmentRate) })
  const afterCommitment = subtotal + (discounts[0]?.amount || 0)
  if (input.discountPct) discounts.push({ label: `Remise commerciale (-${input.discountPct} %)`, amount: -round2((afterCommitment * input.discountPct) / 100) })

  const totalHT = round2(subtotal + discounts.reduce((s, d) => s + d.amount, 0))
  const vat = round2(totalHT * pricing.vatRate)
  const totalTTC = round2(totalHT + vat)

  // ---- estimated running costs (yearly) at a given usage level ----
  const estimate = (scansPerVehicleMonth) => {
    const inspectionsYear = input.vehicles * scansPerVehicleMonth * 12
    const storageGb = (inspectionsYear * costs.storageMbPerInspection) / 1024
    const lines = [
      { label: 'Analyse IA des inspections', amount: round2(inspectionsYear * costs.aiPerInspection) },
      { label: 'Lecture de plaque', amount: round2(inspectionsYear * costs.plateScanPerInspection) },
      { label: 'Fiches SIV (nouveaux véhicules)', amount: round2(input.vehicles * costs.sivLookupPerVehicle) },
      { label: `Stockage photos (~${storageGb.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Go / an)`, amount: round2(storageGb * costs.storagePerGbYear) },
      { label: 'Hébergement & services (quote-part)', amount: round2(costs.infraPerCompanyYear) },
    ]
    const total = round2(lines.reduce((sum, c) => sum + c.amount, 0))
    const margin = round2(totalHT - total)
    return { scansPerVehicleMonth, inspectionsYear, lines, total, margin, marginPct: totalHT ? Math.round((margin / totalHT) * 100) : 0 }
  }
  const avg = input.scansPerVehicleMonth ?? costs.avgScansPerVehicleMonth
  const base = estimate(avg)
  // How the margin moves with real usage, which nobody knows in advance.
  const scenarios = [
    { label: 'Usage faible', ...estimate(Math.max(1, Math.round(avg / 2))) },
    { label: 'Usage moyen', ...base },
    { label: 'Usage intensif', ...estimate(Math.round(avg * 3)) },
    { label: 'Plafond (usage raisonnable)', ...estimate(pricing.fairUseScansPerVehicleMonth) },
  ]

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
    perVehicleMonthHT: round2(totalHT / 12 / input.vehicles),
    maxVehicles,
    fairUseScansPerMonth,
    assumedScansPerVehicleMonth: avg,
    inspectionsYear: base.inspectionsYear,
    costs: { lines: base.lines, total: base.total, perInspection: base.inspectionsYear ? round2(base.total / base.inspectionsYear) : null },
    margin: base.margin,
    marginPct: base.marginPct,
    scenarios: scenarios.map(({ lines, ...rest }) => rest),
    // Limits enforced by the license once the quote is paid.
    limits: { maxVehicles, maxAgencies: input.agencies, maxScansPerMonth: fairUseScansPerMonth },
  }
}

module.exports = { DEFAULT_PRICING, DEFAULT_COSTS, computeQuote, normalizeInputs }
