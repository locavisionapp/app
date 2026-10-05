import { PricingSimulator } from '../../components/admin/PricingSimulator'

/** Stand-alone price simulator (sales calls): nothing is saved. */
export default function Pricing() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Simulateur de prix</h1>
        <p className="text-sm text-slate-500">
          Chiffrez un prospect en direct. Pour émettre un devis, ouvrez l'entreprise dans « Entreprises » → « Nouveau devis ».
        </p>
      </div>
      <PricingSimulator />
    </div>
  )
}
