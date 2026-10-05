import { Card } from '../../components/ui/Card'

const SECTIONS = [
  {
    title: 'Prise en main',
    items: [
      { q: 'Scanner un véhicule', a: "Onglet Scanner → photographiez la plaque (ou tapez-la : les tirets se placent tout seuls) → le véhicule est identifié automatiquement. S'il est déjà dans votre flotte, sa fiche s'ouvre directement. Choisissez ensuite « Tour rapide » (vous filmez en faisant le tour du véhicule, ~1 min ; l'app garde seule les vues nettes) ou « Photo par photo » (étapes guidées), ajoutez des gros plans si besoin, indiquez le kilométrage et lancez l'analyse." },
      { q: 'Référence et comparaison', a: "Le premier scan validé d'un véhicule sert de référence : l'IA y liste chaque défaut, photo et zone encadrée à l'appui. Vous validez tout d'un coup ou case par case — ce que vous décochez (reflet, saleté…) est retenu comme « pas un défaut ». Chaque scan suivant est comparé au précédent validé : seuls les défauts nouveaux ou aggravés vous sont soumis. Un défaut réparé se retire depuis la fiche du véhicule (bouton « Réparé »)." },
      { q: 'Organiser la flotte par agence', a: "Onglet Agences → créez une agence par ville/site. Chaque véhicule peut ensuite être rattaché à une agence depuis sa fiche, ce qui active les filtres par agence/ville dans Ma flotte." },
      { q: 'Gérer les accès de votre équipe', a: "Chaque entreprise a un compte administrateur unique (ouvert par LocaVision, non supprimable). Depuis l'onglet Employés, il crée un accès Employé par collaborateur (scan, inspections, suivi de flotte), peut le désactiver, réinitialiser son mot de passe ou le supprimer. Chacun change son propre mot de passe dans l'onglet Sécurité." },
      { q: "Faire signer l'état des lieux", a: "Une fois les défauts validés, ouvrez « Faire signer » (écran de résultat ou historique du véhicule) : choisissez départ / retour / contrôle, l'inspecteur puis le client signent du doigt sur l'écran. Une signature ne peut plus être modifiée. Le rapport PDF (photos, défauts encadrés, signatures, empreintes des photos) se télécharge, se partage depuis le téléphone ou s'envoie au client par email." },
      { q: 'Exporter mes données', a: "Ma flotte → « Exporter la flotte » ou « Exporter les défauts » : fichiers CSV qui s'ouvrent directement dans Excel. Chaque inspection a aussi son rapport PDF." },
      { q: "Journal d'activité", a: "Onglet Activité (administrateur) : qui a ajouté, modifié, validé, signé ou supprimé quoi, et quand — y compris les actions faites via la clé API. Conservé un an." },
      { q: 'Inspecter sans réseau (parking souterrain…)', a: "Prenez vos photos normalement : si le réseau coupe, l'inspection est enregistrée sur le téléphone et envoyée automatiquement dès le retour de la connexion. Un bandeau orange indique les inspections en attente. Pour un véhicule déjà connu, lancez l'inspection depuis sa fiche : l'identification de plaque (qui nécessite le réseau) n'est alors pas nécessaire." },
      { q: 'Reprendre ou retirer une photo', a: "Avant l'analyse, un écran récapitulatif affiche toutes les prises. En tour rapide, retirez les vues inutiles (✕) ou complétez le tour ; en mode photo par photo, touchez une photo pour la reprendre (pictogramme orange = cadrage douteux). Dans les deux modes, « Ajouter un gros plan » permet de documenter un défaut de près." },
    ],
  },
  {
    title: 'Intégration avec vos outils',
    items: [
      { q: "Utiliser l'API depuis votre CRM", a: "Onglet Mon compte → récupérez votre clé API (Authorization: Bearer sk_live_...). L'API publique /v1/... est la même que celle utilisée par cette application web — tout ce que vous faites ici est possible par API." },
      { q: 'Recevoir les événements en temps réel', a: "Onglet Mon compte → configurez une URL de webhook (HTTPS). LocaVision y envoie un POST signé (en-tête X-LocaVision-Signature, HMAC-SHA256 avec votre secret) à chaque véhicule créé/supprimé et à chaque inspection terminée — pratique pour synchroniser votre CRM sans avoir à interroger l'API en continu." },
      { q: 'Lister la flotte (pagination)', a: "GET /v1/vehicles renvoie les véhicules du plus récent au plus ancien, 50 par page (paramètre limit, 200 max). Filtres : agencyId, city, category, status, q (recherche libre). S'il reste des résultats, l'en-tête de réponse X-Next-Cursor contient un curseur à repasser en paramètre cursor pour obtenir la page suivante. Même principe pour GET /v1/vehicles/{id}/inspections (20 par page)." },
      { q: 'Créer une inspection par API', a: "1) Générez un identifiant unique (UUID) pour l'inspection. 2) Envoyez chaque photo séparément : POST /v1/vehicles/{id}/inspections/{inspectionId}/photos avec { stepId, image } (JPEG base64, 3 Mo max par photo). 3) Lancez l'analyse : POST /v1/vehicles/{id}/inspections avec { inspectionId, steps: [stepId…], mileage }. Cet appel est idempotent : le rejouer avec le même inspectionId renvoie l'inspection existante sans la refacturer. Les URLs de photos renvoyées sont signées et temporaires (1 h ; 7 jours dans les webhooks)." },
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
