import { useEffect, useState } from 'react'
import { Calculator, TrendingUp, FileText } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Field'
import { Spinner } from '../ui/Spinner'
import { useToast } from '../ui/Toast'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'

const eur = (n, digits = 2) => `${Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })} €`

const DEFAULT_INPUT = { vehicles: 25, agencies: 1, scansPerVehicleMonth: 4, apiModule: false, commitmentYears: 1, discountPct: 0 }

/**
 * Sales simulator: fleet inputs -> price (lines, excl./incl. VAT, monthly
 * and per-vehicle equivalents) next to LocaVision's estimated running cost
 * and margin. With `companyId`, also creates the numbered quote.
 */
export function PricingSimulator({ companyId, company, onQuoteCreated }) {
  const toast = useToast()
  const [input, setInput] = useState(DEFAULT_INPUT)
  const [customer, setCustomer] = useState({ name: company?.name || '', address: '', vatNumber: '', email: company?.contactEmail || '' })
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

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

  const set = (key) => (e) => setInput({ ...input, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

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

  const marginTone = !result ? '' : result.marginPct >= 70 ? 'text-status-good' : result.marginPct >= 40 ? 'text-status-warn' : 'text-status-bad'

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="space-y-3 p-4 lg:col-span-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Calculator size={15} /> Besoin du client
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Véhicules">
            <Input type="number" min="1" inputMode="numeric" value={input.vehicles} onChange={set('vehicles')} />
          </Field>
          <Field label="Agences / sites">
            <Input type="number" min="1" inputMode="numeric" value={input.agencies} onChange={set('agencies')} />
          </Field>
          <Field label="Inspections / véhicule / mois" hint="Pour estimer vos coûts">
            <Input type="number" min="0" inputMode="numeric" value={input.scansPerVehicleMonth} onChange={set('scansPerVehicleMonth')} />
          </Field>
          <Field label="Engagement">
            <Select value={input.commitmentYears} onChange={set('commitmentYears')}>
              <option value={1}>1 an</option>
              <option value={2}>2 ans</option>
              <option value={3}>3 ans</option>
            </Select>
          </Field>
          <Field label="Remise commerciale (%)">
            <Input type="number" min="0" max="50" inputMode="decimal" value={input.discountPct} onChange={set('discountPct')} />
          </Field>
          <label className="flex items-end gap-2 pb-3 text-sm text-slate-700">
            <input type="checkbox" checked={input.apiModule} onChange={set('apiModule')} className="h-5 w-5 rounded border-slate-300 text-brand-600" />
            Module API / CRM
          </label>
        </div>

        {companyId && (
          <div className="space-y-3 border-t border-slate-100 pt-3">
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
          </div>
        )}
      </Card>

      <div className="space-y-4 lg:col-span-3">
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
                      <td className="whitespace-nowrap px-2 py-2 text-right text-slate-500">{l.unitPrice ? `${l.qty} × ${eur(l.unitPrice)}` : ''}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-slate-900">{l.unitPrice ? eur(l.total) : 'Inclus'}</td>
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
              <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 text-center">
                <div className="p-3">
                  <p className="text-lg font-bold text-slate-900">{eur(result.monthlyHT, 0)}</p>
                  <p className="text-xs text-slate-500">HT / mois</p>
                </div>
                <div className="p-3">
                  <p className="text-lg font-bold text-slate-900">{eur(result.perVehicleMonthHT)}</p>
                  <p className="text-xs text-slate-500">HT / véhicule / mois</p>
                </div>
                <div className="p-3">
                  <p className="text-lg font-bold text-slate-900">{result.includedScansPerMonth.toLocaleString('fr-FR')}</p>
                  <p className="text-xs text-slate-500">inspections incluses / mois</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {result && (
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <TrendingUp size={15} /> Vos coûts estimés & marge (interne)
              </p>
              <p className={cn('text-sm font-bold', marginTone)}>
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
            <p className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-sm font-semibold text-slate-800">
              <span>Coût total / an ({result.inspectionsYear.toLocaleString('fr-FR')} inspections)</span>
              <span>{eur(result.costs.total)}</span>
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Estimations à partir des hypothèses de coûts (Paramètres). Ces chiffres n'apparaissent jamais sur le devis.
            </p>
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
