import { useEffect, useMemo, useState } from 'react'
import { Calculator, TrendingUp, FileText, SlidersHorizontal, Plus, Trash2, AlertTriangle, Trophy, ChevronDown } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Field'
import { Spinner } from '../ui/Spinner'
import { useToast } from '../ui/Toast'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'

const eur = (n, digits = 2) => `${Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })} €`

// Per-quote overrides of the price grid (empty = grid value from Paramètres).
const OVERRIDES = [
  ['platformFee', 'Licence plateforme (€ HT / an)'],
  ['vehicleMonthly', 'Prix négocié par véhicule (€ HT / mois)', 'Vide = grille dégressive'],
  ['fairUseScansPerVehicleMonth', 'Inspections incluses / véhicule / mois'],
  ['extraScanPrice', 'Prix d’une inspection supplémentaire (€ HT)'],
  ['extraAgencyYearly', 'Agence supplémentaire (€ HT / an)'],
  ['apiModuleYearly', 'Module API (€ HT / an)'],
  ['minimumAnnual', 'Minimum de facturation (€ HT / an)'],
  ['vehicleTolerancePct', 'Tolérance de flotte (%)'],
]

/**
 * Sales simulator: everything about the deal is adjustable (fleet, expected
 * usage, any price of the grid for this quote only, free lines, discounts)
 * and price, cost and margin update live. With `companyId`, also creates
 * the numbered quote.
 */
export function PricingSimulator({ companyId, company, onQuoteCreated }) {
  const toast = useToast()
  const [form, setForm] = useState({ vehicles: 25, agencies: 1, usage: '', usageUnit: 'month', commitmentYears: 1, discountPct: 0, apiModule: false })
  const [overrides, setOverrides] = useState({})
  const [customLines, setCustomLines] = useState([])
  const [showCustom, setShowCustom] = useState(false)
  const [grid, setGrid] = useState(null) // grid values, shown as placeholders
  const [customer, setCustomer] = useState({ name: company?.name || '', address: '', vatNumber: '', email: company?.contactEmail || '' })
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    api.getBillingSettings().then((s) => setGrid({ ...s.pricing, vehicleMonthly: '' })).catch(() => {})
  }, [])

  const input = useMemo(() => {
    const usage = form.usage === '' ? null : Number(form.usage) * (form.usageUnit === 'day' ? 30 : 1)
    return {
      vehicles: form.vehicles,
      agencies: form.agencies,
      expectedScansPerVehicleMonth: usage,
      commitmentYears: form.commitmentYears,
      discountPct: form.discountPct,
      apiModule: form.apiModule,
      overrides,
      customLines: customLines.filter((l) => l.label.trim()),
    }
  }, [form, overrides, customLines])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const t = setTimeout(() => {
      api
        .simulatePricing(input)
        .then((r) => !cancelled && setResult(r))
        .catch((e) => !cancelled && toast.error(e))
        .finally(() => !cancelled && setLoading(false))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [input, toast])

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const overrideCount = Object.values(overrides).filter((v) => v !== '' && v != null).length

  async function createQuote() {
    setCreating(true)
    try {
      const quote = await api.createCompanyQuote(companyId, { input, customer, notes })
      toast.success(`Devis ${quote.number} créé.`)
      onQuoteCreated?.(quote)
    } catch (e) {
      toast.error(e)
    } finally {
      setCreating(false)
    }
  }

  const tone = (pct) => (pct >= 60 ? 'text-status-good' : pct >= 30 ? 'text-status-warn' : 'text-status-bad')

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        <Card className="space-y-3 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Calculator size={15} /> Besoin du client
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Véhicules (environ)" hint={result && result.maxVehicles > result.input.vehicles ? `Tolérance : jusqu'à ${result.maxVehicles}` : null}>
              <Input type="number" min="1" inputMode="numeric" value={form.vehicles} onChange={set('vehicles')} />
            </Field>
            <Field label="Agences / sites">
              <Input type="number" min="1" inputMode="numeric" value={form.agencies} onChange={set('agencies')} />
            </Field>
          </div>
          <Field
            label="Inspections prévues par véhicule"
            hint={result ? `${result.assumedScansPerVehicleMonth.toLocaleString('fr-FR')} / véhicule / mois retenues${form.usage === '' ? ' (valeur par défaut)' : ''} — ${result.includedScansPerVehicleMonth} incluses, le reste en pack intensif` : null}
          >
            <div className="flex gap-2">
              <Input type="number" min="0" step="any" inputMode="decimal" value={form.usage} onChange={set('usage')} placeholder="Inconnu" />
              <Select className="w-36" value={form.usageUnit} onChange={set('usageUnit')}>
                <option value="day">par jour</option>
                <option value="month">par mois</option>
              </Select>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Engagement">
              <Select value={form.commitmentYears} onChange={set('commitmentYears')}>
                <option value={1}>1 an</option>
                <option value={2}>2 ans</option>
                <option value={3}>3 ans</option>
              </Select>
            </Field>
            <Field label="Remise commerciale (%)">
              <Input type="number" min="0" max="50" step="any" inputMode="decimal" value={form.discountPct} onChange={set('discountPct')} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.apiModule} onChange={set('apiModule')} className="h-5 w-5 rounded border-slate-300 text-brand-600" />
            Module API / CRM
          </label>
        </Card>

        <Card className="p-4">
          <button type="button" onClick={() => setShowCustom(!showCustom)} className="flex w-full items-center justify-between text-left">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <SlidersHorizontal size={15} /> Personnaliser ce devis
              {(overrideCount > 0 || customLines.length > 0) && (
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] text-brand-700">{overrideCount + customLines.length} modif.</span>
              )}
            </span>
            <ChevronDown size={16} className={cn('text-slate-400 transition-transform', showCustom && 'rotate-180')} />
          </button>
          {showCustom && (
            <div className="mt-3 space-y-4">
              <p className="text-xs text-slate-500">Tarifs de ce devis uniquement (vide = valeur de la grille). La grille se règle dans Paramètres.</p>
              <div className="grid grid-cols-2 gap-3">
                {OVERRIDES.map(([key, label, hint]) => (
                  <Field key={key} label={label} hint={hint}>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      value={overrides[key] ?? ''}
                      placeholder={grid && grid[key] !== '' && grid[key] != null ? String(grid[key]) : ''}
                      onChange={(e) => setOverrides({ ...overrides, [key]: e.target.value })}
                    />
                  </Field>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Lignes libres</p>
                {customLines.map((l, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <Field label={i === 0 ? 'Désignation' : ''} className="flex-[3]">
                      <Input value={l.label} placeholder="Ex : Formation sur site" onChange={(e) => setCustomLines(customLines.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    </Field>
                    <Field label={i === 0 ? 'Qté' : ''} className="w-16">
                      <Input type="number" min="0" step="any" value={l.qty} onChange={(e) => setCustomLines(customLines.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} />
                    </Field>
                    <Field label={i === 0 ? 'PU HT (€)' : ''} className="w-24">
                      <Input type="number" step="any" value={l.unitPrice} onChange={(e) => setCustomLines(customLines.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x)))} />
                    </Field>
                    <button type="button" onClick={() => setCustomLines(customLines.filter((_, j) => j !== i))} className="mb-2 p-2 text-slate-400 hover:text-status-bad" aria-label="Supprimer la ligne">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setCustomLines([...customLines, { label: '', qty: 1, unitPrice: 0 }])} className="flex items-center gap-1 text-sm text-brand-700 hover:underline">
                  <Plus size={14} /> Ajouter une ligne (formation, installation, geste commercial avec prix négatif…)
                </button>
              </div>
              {(overrideCount > 0 || customLines.length > 0) && (
                <button type="button" onClick={() => { setOverrides({}); setCustomLines([]) }} className="text-xs text-slate-500 hover:underline">
                  Revenir à la grille standard
                </button>
              )}
            </div>
          )}
        </Card>

        {companyId && (
          <Card className="space-y-3 p-4">
            <p className="text-sm font-semibold text-slate-700">Facturer à</p>
            <Field label="Raison sociale">
              <Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
            </Field>
            <Field label="Adresse de facturation">
              <Input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder="12 rue …, 75000 Paris" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="N° TVA (optionnel)">
                <Input value={customer.vatNumber} onChange={(e) => setCustomer({ ...customer, vatNumber: e.target.value })} />
              </Field>
              <Field label="Email facturation">
                <Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
              </Field>
            </div>
            <Field label="Notes sur le devis (optionnel)">
              <Input value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </Card>
        )}
      </div>

      <div className="space-y-4 lg:col-span-3">
        {result?.warnings?.length > 0 && (
          <div className="space-y-1 rounded-xl bg-status-warnBg px-4 py-3 text-sm text-status-warn">
            {result.warnings.map((w) => (
              <p key={w} className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {w}
              </p>
            ))}
          </div>
        )}

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-700">Proposition annuelle</p>
            {loading && <Spinner size={14} />}
          </div>
          {result && (
            <div className={cn('transition-opacity', loading && 'opacity-60')}>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {result.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-slate-700">{l.label}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-right text-slate-500">{l.unit !== 'inclus' ? `${l.qty.toLocaleString('fr-FR')} × ${eur(l.unitPrice)}` : ''}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-slate-900">{l.unit === 'inclus' ? 'Inclus' : eur(l.total)}</td>
                    </tr>
                  ))}
                  {result.discounts.map((d, i) => (
                    <tr key={`d${i}`}>
                      <td className="px-4 py-2 text-status-good" colSpan={2}>{d.label}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-status-good">{eur(d.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-1 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <div className="flex justify-between"><span>Total HT / an</span><span className="font-semibold">{eur(result.totalHT)}</span></div>
                <div className="flex justify-between text-slate-500"><span>TVA {Math.round(result.vatRate * 100)} %</span><span>{eur(result.vat)}</span></div>
                <div className="flex justify-between text-base font-bold"><span>Total TTC / an</span><span>{eur(result.totalTTC)}</span></div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-t border-slate-100 text-center sm:grid-cols-4 sm:divide-y-0">
                {[
                  [eur(result.monthlyHT, 0), 'HT / mois'],
                  [eur(result.monthlyTTC, 0), 'TTC / mois'],
                  [eur(result.perVehicleMonthHT), 'HT / véhicule / mois'],
                  [result.fairUseScansPerMonth.toLocaleString('fr-FR'), 'inspections max / mois'],
                ].map(([value, label]) => (
                  <div key={label} className="p-3">
                    <p className="text-lg font-bold text-slate-900">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {result?.market && (
          <Card className={cn('flex items-start gap-3 p-4 text-sm', result.market.savingPct > 0 ? 'border-status-good bg-status-goodBg' : 'border-status-warn bg-status-warnBg')}>
            <Trophy size={18} className={cn('mt-0.5 shrink-0', result.market.savingPct > 0 ? 'text-status-good' : 'text-status-warn')} />
            <div>
              <p className="font-semibold text-slate-900">
                {result.market.savingPct > 0
                  ? `${result.market.savingPct} % moins cher que ${result.market.name}`
                  : `${-result.market.savingPct} % plus cher que ${result.market.name}`}
              </p>
              <p className="text-slate-600">
                Repère : {eur(result.market.yearly, 0)} HT / an à taille de flotte comparable — et LocaVision inclut la détection IA des dégâts.
              </p>
              <p className="mt-1 text-xs text-slate-400">Source : {result.market.source}. Indicatif, à revérifier avant de le citer.</p>
            </div>
          </Card>
        )}

        {result && (
          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <TrendingUp size={15} /> Vos coûts & marge (interne)
              </p>
              <p className={cn('text-sm font-bold', tone(result.marginPct))}>
                Marge {eur(result.margin, 0)} · {result.marginPct} %
              </p>
            </div>
            <ul className="space-y-1 text-sm text-slate-600">
              {result.costs.lines.map((c) => (
                <li key={c.label} className="flex justify-between gap-2">
                  <span>{c.label}</span>
                  <span className="whitespace-nowrap">{eur(c.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="flex justify-between border-t border-slate-100 pt-2 text-sm font-semibold text-slate-800">
              <span>Coût total / an ({result.inspectionsYear.toLocaleString('fr-FR')} inspections, {eur(result.costs.perInspection ?? 0, 3)} / inspection)</span>
              <span>{eur(result.costs.total)}</span>
            </p>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Si l'usage réel diffère</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {result.scenarios.map((sc) => (
                    <tr key={sc.label}>
                      <td className="py-1.5 text-slate-600">{sc.label}</td>
                      <td className="py-1.5 text-right text-slate-500">{sc.scansPerVehicleMonth.toLocaleString('fr-FR')} / véh. / mois</td>
                      <td className="py-1.5 text-right text-slate-500">coût {eur(sc.total, 0)}</td>
                      <td className={cn('py-1.5 text-right font-semibold', tone(sc.marginPct))}>{sc.marginPct} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400">Estimations à partir des hypothèses de coûts (Paramètres). Jamais visibles sur le devis.</p>
          </Card>
        )}

        {companyId && (
          <Button className="w-full" onClick={createQuote} disabled={creating || !result}>
            {creating ? <Spinner size={16} className="text-white" /> : <FileText size={16} />} Créer le devis numéroté
          </Button>
        )}
      </div>
    </div>
  )
}
