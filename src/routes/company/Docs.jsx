import { Card } from '../../components/ui/Card'

const SECTIONS = [
  {
    title: 'Prise en main',
    items: [
      { q: 'Scanner un véhicule', a: "Onglet Scanner → photographiez la plaque → l'IA identifie le véhicule (marque, modèle, fiche technique) → confirmez ou complétez à la main → suivez le parcours guidé photo par photo → indiquez le kilométrage → l'analyse IA vous donne un état vert/orange/rouge avec le détail des dégâts." },
      { q: 'Organiser la flotte par agence', a: "Onglet Agences → créez une agence par ville/site. Chaque véhicule peut ensuite être rattaché à une agence depuis sa fiche, ce qui active les filtres par agence/ville dans Ma flotte." },
      { q: 'Gérer les accès de votre équipe', a: "Onglet Employés (réservé aux administrateurs) → créez un identifiant par collaborateur, avec le rôle Employé (usage courant) ou Administrateur (gestion complète, y compris la facturation et les accès)." },
    ],
  },
  {
    title: 'Intégration avec vos outils',
    items: [
      { q: "Utiliser l'API depuis votre CRM", a: "Onglet Mon compte → récupérez votre clé API (Authorization: Bearer sk_live_...). L'API publique /v1/... est la même que celle utilisée par cette application web — tout ce que vous faites ici est possible par API." },
      { q: 'Recevoir les événements en temps réel', a: "Onglet Mon compte → configurez une URL de webhook (HTTPS). LocaVision y envoie un POST signé (en-tête X-LocaVision-Signature, HMAC-SHA256 avec votre secret) à chaque véhicule créé/supprimé et à chaque inspection terminée — pratique pour synchroniser votre CRM sans avoir à interroger l'API en continu." },
      { q: 'Vérifier une signature de webhook', a: "Calculez HMAC-SHA256(corps_brut_de_la_requete, votre_secret) et comparez au header X-LocaVision-Signature. Rejetez la requête si les deux ne correspondent pas." },
    ],
  },
  {
    title: 'Facturation',
    items: [
      { q: 'Comment est facturé LocaVision ?', a: "Licence annuelle, payée par virement bancaire. LocaVision vous envoie un devis (nombre d'agences, de véhicules, de scans mensuels inclus) que vous validez ; une fois le virement reçu, votre licence est activée pour un an." },
      { q: "Période d'essai", a: "Si votre compte a été créé avec une période d'essai, le nombre de jours restants est visible dans Mon compte. Passé ce délai sans licence active, l'accès est suspendu jusqu'à régularisation." },
    ],
  },
]

export default function Docs() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Documentation</h1>
        <p className="text-sm text-slate-500">Comment utiliser LocaVision et le connecter à vos outils.</p>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="mb-2 text-sm font-semibold text-slate-700">{section.title}</p>
          <div className="space-y-2">
            {section.items.map((item) => (
              <Card key={item.q} className="p-4">
                <p className="font-medium text-slate-900">{item.q}</p>
                <p className="mt-1 text-sm text-slate-500">{item.a}</p>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
