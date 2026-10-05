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
  includedScansPerVehicleMonth: 6, // fair-use inspections included per vehicle per month
  commitmentDiscounts: { 1: 0, 2: 0.08, 3: 0.12 }, // multi-year commitment discount
  vatRate: 0.2,
}

const DEFAULT_COSTS = {
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
    scansPerVehicleMonth: clampInt(raw.scansPerVehicleMonth, 0, 200, 4),
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

  const includedScansPerMonth = input.vehicles * pricing.includedScansPerVehicleMonth
  lines.push({ label: `Inspections IA incluses : jusqu'à ${includedScansPerMonth.toLocaleString('fr-FR')} par mois`, qty: 1, unit: 'inclus', unitPrice: 0 })

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

  // ---- estimated running costs (yearly) ----
  const inspectionsYear = input.vehicles * input.scansPerVehicleMonth * 12
  const storageGb = (inspectionsYear * costs.storageMbPerInspection) / 1024
  const costLines = [
    { label: 'Analyse IA des inspections', amount: round2(inspectionsYear * costs.aiPerInspection) },
    { label: 'Lecture de plaque', amount: round2(inspectionsYear * costs.plateScanPerInspection) },
    { label: 'Fiches SIV (nouveaux véhicules)', amount: round2(input.vehicles * costs.sivLookupPerVehicle) },
    { label: `Stockage photos (~${storageGb.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Go / an)`, amount: round2(storageGb * costs.storagePerGbYear) },
    { label: 'Hébergement & services (quote-part)', amount: round2(costs.infraPerCompanyYear) },
  ]
  const totalCost = round2(costLines.reduce((s, c) => s + c.amount, 0))
  const margin = round2(totalHT - totalCost)

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
    includedScansPerMonth,
    inspectionsYear,
    costs: { lines: costLines, total: totalCost, perInspection: inspectionsYear ? round2(totalCost / inspectionsYear) : null },
    margin,
    marginPct: totalHT ? Math.round((margin / totalHT) * 100) : 0,
    // Limits enforced by the license once the quote is paid.
    limits: { maxVehicles: input.vehicles, maxAgencies: input.agencies, maxScansPerMonth: includedScansPerMonth },
  }
}

module.exports = { DEFAULT_PRICING, DEFAULT_COSTS, computeQuote, normalizeInputs }
