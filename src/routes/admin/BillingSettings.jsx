import { useEffect, useState } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { FullscreenSpinner, Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { api } from '../../lib/api'

const SELLER_FIELDS = [
  ['name', 'Raison sociale'],
  ['legalForm', 'Forme juridique et capital (ex : SAS au capital de 1 000 €)'],
  ['address', 'Adresse du siège'],
  ['siret', 'SIRET'],
  ['vatNumber', 'N° TVA intracommunautaire'],
  ['email', 'Email facturation'],
  ['phone', 'Téléphone'],
  ['iban', 'IBAN (affiché sur les devis)'],
  ['bic', 'BIC'],
]

const PRICE_FIELDS = [
  ['platformFee', 'Licence plateforme (€ HT / an / entreprise)'],
  ['minimumAnnual', 'Minimum de facturation (€ HT / an)'],
  ['includedAgencies', 'Agences incluses'],
  ['extraAgencyYearly', 'Agence supplémentaire (€ HT / an)'],
  ['apiModuleYearly', 'Module API & webhooks (€ HT / an)'],
  ['fairUseScansPerVehicleMonth', 'Inspections incluses / véhicule / mois'],
  ['extraScanPrice', 'Inspection supplémentaire, pack intensif (€ HT)'],
  ['usageCapBufferPct', 'Marge du plafond de licence au-delà de l’usage prévu (%)'],
  ['vehicleTolerancePct', 'Tolérance de flotte (%) — ex : 10 = 25 véhicules → 28 autorisés'],
]

const COST_FIELDS = [
  ['avgScansPerVehicleMonth', 'Usage par défaut si le client ne sait pas : inspections / véhicule / mois'],
  ['photoRetentionYears', 'Durée de conservation des photos (années)'],
  ['aiPerInspection', 'Analyse IA par inspection (€)'],
  ['plateScanPerInspection', 'Lecture de plaque par inspection (€)'],
  ['sivLookupPerVehicle', 'Fiche SIV par nouveau véhicule (€)'],
  ['storageMbPerInspection', 'Photos par inspection (Mo)'],
  ['storagePerGbYear', 'Stockage (€ / Go / an)'],
  ['infraPerCompanyYear', 'Hébergement, quote-part par client (€ / an)'],
]

/** Platform admin: legal identity on quotes/invoices, price grid and cost assumptions. */
export default function BillingSettings() {
  const toast = useToast()
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getBillingSettings().then(setSettings).catch((e) => toast.error(e))
  }, [toast])

  if (!settings) return <FullscreenSpinner />

  const setSeller = (key, value) => setSettings({ ...settings, seller: { ...settings.seller, [key]: value } })
  const setPricing = (key, value) => setSettings({ ...settings, pricing: { ...settings.pricing, [key]: value } })
  const setCost = (key, value) => setSettings({ ...settings, costs: { ...settings.costs, [key]: value } })
  const tiers = settings.pricing.vehicleTiers
  const setTier = (i, key, value) => setPricing('vehicleTiers', tiers.map((t, j) => (j === i ? { ...t, [key]: value } : t)))

  async function resetGrid() {
    if (!window.confirm('Remplacer votre grille tarifaire et vos hypothèses de coûts par la grille recommandée ? Vos coordonnées ne changent pas.')) return
    setSaving(true)
    try {
      setSettings(await api.saveBillingSettings({ resetPricing: true }))
      toast.success('Grille recommandée appliquée.')
    } catch (e) {
      toast.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      setSettings(await api.saveBillingSettings(settings))
      toast.success('Paramètres enregistrés. Les prochains devis utiliseront ces valeurs.')
    } catch (e) {
      toast.error(e)
    } finally {
      setSaving(false)
    }
  }

  const missingLegal = ['name', 'address', 'siret'].filter((k) => !settings.seller[k])

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-900">Paramètres de facturation</h1>
        <Button onClick={save} disabled={saving}>
          {saving ? <Spinner size={16} className="text-white" /> : <Save size={16} />} Enregistrer
        </Button>
      </div>

      {missingLegal.length > 0 && (
        <Card className="border-status-warn bg-status-warnBg p-4 text-sm text-status-warn">
          Complétez votre identité légale (raison sociale, adresse, SIRET) : elle est obligatoire sur les devis et factures.
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold text-slate-700">Votre société (en-tête des devis et factures)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SELLER_FIELDS.map(([key, label]) => (
            <Field key={key} label={label} className={key === 'address' || key === 'legalForm' ? 'sm:col-span-2' : ''}>
              <Input value={settings.seller[key] || ''} onChange={(e) => setSeller(key, e.target.value)} />
            </Field>
          ))}
          <Field label="Délai de paiement (jours)">
            <Input type="number" min="0" max="90" value={settings.seller.paymentTermsDays} onChange={(e) => setSeller('paymentTermsDays', e.target.value)} />
          </Field>
          <Field label="Validité des devis (jours)">
            <Input type="number" min="1" max="365" value={settings.seller.quoteValidityDays} onChange={(e) => setSeller('quoteValidityDays', e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={!!settings.seller.vatExempt} onChange={(e) => setSeller('vatExempt', e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-brand-600" />
          Franchise en base de TVA (micro-entreprise : « TVA non applicable, art. 293 B du CGI »)
        </label>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700">Grille tarifaire (HT)</p>
          <button type="button" onClick={resetGrid} disabled={saving} className="text-xs text-brand-700 hover:underline">
            Appliquer la grille recommandée
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {PRICE_FIELDS.map(([key, label]) => (
            <Field key={key} label={label}>
              <Input type="number" min="0" step="any" value={settings.pricing[key]} onChange={(e) => setPricing(key, e.target.value)} />
            </Field>
          ))}
          {!settings.seller.vatExempt && (
            <Field label="Taux de TVA (ex : 0.2)">
              <Input type="number" min="0" max="0.3" step="0.001" value={settings.pricing.vatRate} onChange={(e) => setPricing('vatRate', e.target.value)} />
            </Field>
          )}
        </div>

        <p className="pt-2 text-sm font-medium text-slate-700">Prix par véhicule et par mois, par tranche (dégressif)</p>
        <div className="space-y-2">
          {tiers.map((t, i) => {
            const last = i === tiers.length - 1
            const from = i === 0 ? 1 : Number(tiers[i - 1].upTo) + 1
            return (
              <div key={i} className="flex items-end gap-2">
                <span className="w-24 pb-3 text-sm text-slate-500">À partir de {from}</span>
                <Field label={last ? 'Jusqu’à' : 'Jusqu’à (véhicules)'} className="flex-1">
                  {last ? <Input value="et au-delà" disabled /> : <Input type="number" min={from} value={t.upTo ?? ''} onChange={(e) => setTier(i, 'upTo', e.target.value)} />}
                </Field>
                <Field label="€ HT / véhicule / mois" className="flex-1">
                  <Input type="number" min="0" step="0.1" value={t.monthly} onChange={(e) => setTier(i, 'monthly', e.target.value)} />
                </Field>
                {tiers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPricing('vehicleTiers', tiers.filter((_, j) => j !== i).map((x, j, arr) => (j === arr.length - 1 ? { ...x, upTo: null } : x)))}
                    className="mb-2 p-2 text-slate-400 hover:text-status-bad"
                    aria-label="Supprimer la tranche"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            )
          })}
          {tiers.length < 8 && (
            <button
              type="button"
              onClick={() => {
                const prevCap = tiers.length > 1 ? Number(tiers[tiers.length - 2].upTo) : 0
                const next = tiers.map((t, j) => (j === tiers.length - 1 ? { ...t, upTo: prevCap + 100 } : t))
                setPricing('vehicleTiers', [...next, { upTo: null, monthly: tiers[tiers.length - 1].monthly }])
              }}
              className="flex items-center gap-1 text-sm text-brand-700 hover:underline"
            >
              <Plus size={14} /> Ajouter une tranche
            </button>
          )}
        </div>

        <p className="pt-2 text-sm font-medium text-slate-700">Remises d'engagement</p>
        <div className="grid grid-cols-2 gap-3">
          {['2', '3'].map((y) => (
            <Field key={y} label={`Engagement ${y} ans (ex : 0.08 = 8 %)`}>
              <Input
                type="number"
                min="0"
                max="0.5"
                step="0.01"
                value={settings.pricing.commitmentDiscounts?.[y] ?? 0}
                onChange={(e) => setPricing('commitmentDiscounts', { ...settings.pricing.commitmentDiscounts, [y]: e.target.value })}
              />
            </Field>
          ))}
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold text-slate-700">Hypothèses de coûts (calcul de marge, interne)</p>
        <p className="text-xs text-slate-500">Ajustez-les avec vos factures réelles Google Cloud / Gemini / Vercel / Plate Recognizer / SIV.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {COST_FIELDS.map(([key, label]) => (
            <Field key={key} label={label}>
              <Input type="number" min="0" step="any" value={settings.costs[key]} onChange={(e) => setCost(key, e.target.value)} />
            </Field>
          ))}
        </div>
      </Card>
    </div>
  )
}
