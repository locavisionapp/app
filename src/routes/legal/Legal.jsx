import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// ⚠️ Templates describing what the app actually does (data, sub-processors,
// retention). Every "[à compléter]" must be filled in, and the whole text
// reviewed by a lawyer before signing customers.
const EDITOR = {
  name: '[Raison sociale à compléter]',
  form: '[forme juridique, capital — à compléter]',
  address: '[adresse du siège — à compléter]',
  rcs: '[RCS / SIREN — à compléter]',
  vat: '[n° TVA intracommunautaire — à compléter]',
  director: '[nom du directeur de la publication — à compléter]',
  email: '[contact@… — à compléter]',
  dpo: '[email du contact données personnelles — à compléter]',
}

const SUBPROCESSORS = [
  ['Google Cloud EMEA Ltd / Google Ireland (Firebase)', 'Authentification, base de données, stockage des photos', 'Union européenne (eur3 / europe-west9)'],
  ['Google (Gemini API, offre payante)', "Analyse des photos par intelligence artificielle", "Traitement possible hors UE — clauses contractuelles types ; données non utilisées pour l'entraînement des modèles (offre payante)"],
  ['Vercel Inc.', "Hébergement de l'application et de l'API", 'Fonctions exécutées à Paris (cdg1) ; société américaine — clauses contractuelles types / Data Privacy Framework'],
  ['Plate Recognizer (ParkPow)', "Lecture de la plaque d'immatriculation sur photo", '[localisation à vérifier]'],
  ['[Fournisseur API SIV via RapidAPI — à compléter]', "Fiche technique du véhicule à partir de l'immatriculation", '[localisation à vérifier]'],
  ['Resend (si l\'envoi d\'emails est activé)', 'Envoi des rapports par email', 'États-Unis — clauses contractuelles types'],
]

const DOCS = {
  'mentions-legales': {
    title: 'Mentions légales',
    sections: [
      ['Éditeur', `${EDITOR.name}, ${EDITOR.form}. Siège : ${EDITOR.address}. ${EDITOR.rcs}. ${EDITOR.vat}. Directeur de la publication : ${EDITOR.director}. Contact : ${EDITOR.email}.`],
      ['Hébergement', "Application et API : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (fonctions exécutées en région Paris). Données : Google Cloud EMEA Ltd / Google Ireland Ltd, Gordon House, Barrow Street, Dublin 4, Irlande (stockage en Union européenne)."],
      ['Propriété intellectuelle', "L'application LocaVision, sa marque, son interface et son code sont la propriété de l'éditeur. Toute reproduction non autorisée est interdite. Les photos et données saisies par les clients restent leur propriété."],
      ['Données personnelles', 'Voir la politique de confidentialité.'],
    ],
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    sections: [
      ['Qui est responsable ?', `Pour la gestion des comptes clients (entreprises abonnées), ${EDITOR.name} est responsable de traitement. Pour les données des véhicules, inspections, photos et signatures de leurs propres clients, chaque entreprise cliente est responsable de traitement et ${EDITOR.name} agit en tant que sous-traitant (voir l'accord de sous-traitance).`],
      ['Données traitées', "Comptes : identifiant, nom d'utilisateur, rôle, journal des actions (qui, quoi, quand). Inspections : immatriculation et caractéristiques du véhicule, photos (pouvant faire apparaître des plaques, lieux ou personnes), kilométrage, défauts constatés, nom de l'inspecteur. États des lieux : nom, email (facultatif) et signature manuscrite du client du loueur. Données techniques : adresse IP traitée temporairement pour la limitation de débit (non conservée)."],
      ['Finalités et bases légales', "Fourniture du service (exécution du contrat) ; sécurité et prévention des abus (intérêt légitime) ; facturation et obligations comptables (obligation légale). Aucune donnée n'est vendue ni utilisée à des fins publicitaires."],
      ['Durées de conservation', "Comptes : durée de l'abonnement. Inspections, photos et signatures : durée de l'abonnement, puis suppression à la résiliation (ou restitution sur demande), sauf décision contraire du client. Journal d'activité : 1 an. Données de facturation : 10 ans (obligation légale)."],
      ['Destinataires et sous-traitants', SUBPROCESSORS.map(([n, r, l]) => `${n} — ${r} (${l})`).join(' · ')],
      ['Sécurité', "Accès authentifié et cloisonné par entreprise, rôles (administrateur / employé), photos privées accessibles uniquement par liens temporaires signés, chiffrement des échanges (HTTPS), journal d'activité, sauvegardes."],
      ['Vos droits', `Accès, rectification, effacement, limitation, opposition et portabilité : écrivez à ${EDITOR.dpo}. Si vos données ont été collectées par une entreprise cliente (ex. : votre loueur), adressez-vous d'abord à elle. Vous pouvez saisir la CNIL (www.cnil.fr).`],
    ],
  },
  cgv: {
    title: "Conditions générales d'utilisation et de vente",
    sections: [
      ['Objet', "Les présentes conditions régissent l'accès à la plateforme LocaVision (application web, API) permettant aux professionnels de scanner, inspecter et suivre l'état de leurs véhicules. Elles s'appliquent entre l'éditeur et l'entreprise cliente, à l'exclusion de toute autre condition."],
      ['Accès et comptes', "L'éditeur ouvre un compte administrateur unique par entreprise cliente, qui crée lui-même les accès de ses employés. Le client est responsable de la confidentialité des identifiants et de l'usage fait de ses comptes et de sa clé API."],
      ['Licence et prix', "Le service est fourni sous forme de licence annuelle, selon le devis accepté (nombre d'agences, de véhicules et de scans mensuels). Paiement par virement à réception de facture. [Conditions de renouvellement, de révision des prix et pénalités de retard — à compléter.] Les éventuelles périodes d'essai sont gratuites et sans engagement."],
      ['Analyse par intelligence artificielle', "La détection des défauts est réalisée par un modèle d'intelligence artificielle et constitue une aide à l'inspection. Elle peut omettre un défaut ou en signaler un à tort : chaque défaut doit être validé par l'utilisateur avant d'être enregistré. Le client reste seul responsable des états des lieux qu'il établit et fait signer, et de leur usage, notamment dans ses relations avec ses propres clients."],
      ['Disponibilité et support', "L'éditeur met en œuvre les moyens raisonnables pour assurer la disponibilité du service, sans garantie de continuité absolue (obligation de moyens). Les inspections réalisées hors connexion sont conservées sur l'appareil et transmises au retour du réseau. [Délais de support et engagement de disponibilité — à compléter.]"],
      ['Données', "Le client reste propriétaire de ses données. L'éditeur les traite en qualité de sous-traitant conformément à l'accord de sous-traitance. Le client peut exporter ses données (CSV, rapports PDF) à tout moment. À la fin du contrat, les données sont supprimées sous [30] jours, sauf demande de restitution."],
      ['Responsabilité', "[Plafond de responsabilité (par ex. montant annuel payé), exclusions des dommages indirects — à compléter avec un juriste.]"],
      ['Durée et résiliation', "[Durée, reconduction, préavis, résiliation pour manquement — à compléter.]"],
      ['Droit applicable', "Droit français. [Tribunal compétent — à compléter.]"],
    ],
  },
  dpa: {
    title: 'Accord de sous-traitance (article 28 RGPD)',
    sections: [
      ['Parties et objet', `Le client (responsable de traitement) confie à ${EDITOR.name} (sous-traitant) le traitement des données nécessaires au service LocaVision : inspection de véhicules, conservation des photos et de l'historique, états des lieux signés.`],
      ['Données et personnes concernées', "Employés du client (identifiants, actions), clients du client (nom, email, signature manuscrite), toute personne pouvant apparaître sur les photos, données des véhicules (immatriculation, caractéristiques, kilométrage)."],
      ['Obligations du sous-traitant', "Traiter les données uniquement sur instruction documentée du client ; garantir la confidentialité des personnes autorisées ; mettre en œuvre les mesures de sécurité décrites ci-dessous ; aider le client à répondre aux demandes d'exercice de droits et à ses obligations (sécurité, analyses d'impact) ; notifier toute violation de données dans les meilleurs délais et au plus tard sous 48 heures après en avoir pris connaissance ; supprimer ou restituer les données en fin de contrat ; mettre à disposition les informations nécessaires aux audits."],
      ['Mesures de sécurité', "Cloisonnement des données par entreprise ; authentification obligatoire ; rôles ; photos privées servies par liens signés à durée limitée ; HTTPS ; règles d'accès directes à la base et au stockage fermées ; journal d'activité ; sauvegardes ; limitation de débit ; secrets techniques uniquement côté serveur."],
      ['Sous-traitants ultérieurs', `Le client autorise le recours aux sous-traitants suivants : ${SUBPROCESSORS.map(([n, r, l]) => `${n} (${r} ; ${l})`).join(' ; ')}. Tout changement sera notifié au client, qui pourra s'y opposer.`],
      ['Transferts hors UE', "Les données sont stockées dans l'Union européenne. Certains traitements (analyse IA, hébergement applicatif) peuvent impliquer des prestataires établis hors UE ; ils sont encadrés par les clauses contractuelles types de la Commission européenne et/ou le Data Privacy Framework."],
    ],
  },
}

export const LEGAL_LINKS = [
  ['mentions-legales', 'Mentions légales'],
  ['confidentialite', 'Confidentialité'],
  ['cgv', 'CGU / CGV'],
  ['dpa', 'Sous-traitance RGPD'],
]

export default function Legal() {
  const { doc } = useParams()
  const page = DOCS[doc]
  if (!page) return <Navigate to="/legal/mentions-legales" replace />
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-700">
          <ArrowLeft size={16} /> Accueil
        </Link>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {LEGAL_LINKS.map(([id, label]) => (
            <Link key={id} to={`/legal/${id}`} className={id === doc ? 'font-semibold text-brand-700' : 'text-slate-500 hover:text-brand-700'}>
              {label}
            </Link>
          ))}
        </nav>
        <h1 className="text-2xl font-bold text-slate-900">{page.title}</h1>
        {page.sections.map(([title, text]) => (
          <section key={title} className="space-y-1">
            <h2 className="font-semibold text-slate-900">{title}</h2>
            <p className="text-sm leading-relaxed text-slate-600">{text}</p>
          </section>
        ))}
        <p className="text-xs text-slate-400">Dernière mise à jour : [date à compléter]</p>
      </div>
    </div>
  )
}
