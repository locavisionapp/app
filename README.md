# LocaVision

Scannez un véhicule, lancez une inspection IA guidée, gardez l'historique complet — et
branchez tout ça à votre propre CRM via une API publique.

## Ce que fait l'app

1. **Scan de plaque** : une photo suffit à identifier le véhicule (OCR PlateRecognizer →
   fiche technique SIV via RapidAPI → repli sur Gemini si besoin).
2. **Inspection IA guidée** : un parcours de capture adapté au type de véhicule (citadine,
   utilitaire, camion, moto, scooter...), avec validation de cadrage en direct, puis une
   analyse globale qui rend un verdict clair — vert / orange / rouge — et la liste des points
   relevés.
3. **Historique** : chaque inspection est archivée par véhicule.
4. **Agences & flotte** : chaque entreprise peut organiser sa flotte par agence (ville), et
   filtrer sa flotte par agence, ville, catégorie de véhicule, état ou recherche libre.
5. **Tarifs** : chaque entreprise fixe le tarif journalier de ses véhicules.
6. **Admin plateforme** : ouverture des comptes entreprise (génère une clé API) et suivi du
   volume d'appels API par entreprise.

## Architecture

- **Frontend** : React + Vite + Tailwind CSS, mobile-first, PWA installable, routes
  chargées à la demande (code-splitting) — déployé sur **Vercel**.
- **Backend** : une API REST publique et versionnée (`/v1/...`), **seule porte d'entrée**
  vers les données. Le frontend web consomme cette même API (avec un jeton Firebase Auth) ;
  les CRM tiers l'appellent avec une clé API d'entreprise (`Authorization: Bearer
  sk_live_...`). Les clés Gemini / PlateRecognizer / RapidAPI ne vivent que côté serveur.
  Toute la logique métier vit dans `functions/app.js` (Express), servie par deux runtimes
  interchangeables selon le plan Firebase disponible :
  - `api/handler.js` — fonction serverless **Vercel** (aucun plan payant requis) ;
  - `functions/index.js` — **Firebase Cloud Functions** (nécessite le plan Blaze).
- **Données** : Firestore (`companies/{id}/agencies/{id}`, `companies/{id}/vehicles/{id}/
  inspections/{id}`), Storage pour les photos. Les règles Firestore/Storage bloquent tout
  accès direct depuis un client — seul l'Admin SDK (utilisé par l'API) y accède.
- **Fiabilité & sécurité** : en-têtes de sécurité (helmet + `vercel.json`), limitation de
  débit par IP client réelle, validation des entrées sur chaque route, gestion d'erreurs
  centralisée qui ne renvoie jamais de détail interne au client, timeouts et budget de
  temps global sur tous les appels IA/tiers, photos privées (URLs signées), suppression
  des photos avec le véhicule/l'entreprise (RGPD), webhooks protégés contre le SSRF.
- **Hors ligne** : PWA installable qui s'ouvre sans réseau ; les inspections faites sans
  connexion sont conservées sur l'appareil et envoyées automatiquement au retour du réseau.
- **Rôles** : `employee` (scan, inspections, flotte) / `company_admin` (en plus : agences,
  suppression de véhicules, accès, clé API, webhooks) / `platform_admin` (LocaVision).

### Un seul back-end, plusieurs clients (API-first)

Parce que toute la logique (scan, inspection, flotte, tarifs, agences) vit derrière l'API
`/v1/...` et nulle part ailleurs, une future app **Flutter** (ou tout autre client) consomme
exactement la même API que ce front web et les CRM tiers — aucune logique métier à
dupliquer ou à réécrire, juste un nouveau client HTTP authentifié par jeton Firebase ou clé
API.

## Installation

```bash
npm install
cd functions && npm install && cd ..
cp .env.example .env                       # config Firebase publique
cp functions/.env.example functions/.env   # clés Gemini / PlateRecognizer / SIV
```

Renseignez les valeurs dans `.env` et `functions/.env` (projet Firebase existant).

### Lancer en local

```bash
npm run functions:serve   # émulateurs Firebase (hosting + functions + firestore + auth + storage)
npm run dev                # frontend Vite, proxying /v1 vers l'émulateur hosting
```

### Créer le premier compte administrateur plateforme

L'ouverture de comptes entreprise se fait depuis l'espace admin, mais il faut un premier
compte `platform_admin` pour y accéder, ainsi qu'une entreprise de démo pour tester le
parcours entreprise. `functions/scripts/seed.js` crée les deux d'un coup (+ une agence de
démo) :

```bash
# Contre l'émulateur local (voir "Lancer en local" ci-dessus)
cd functions
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
  GCLOUD_PROJECT=demo-smoketest node scripts/seed.js

# Contre le vrai projet Firebase (après `firebase login`, ou avec une clé de service via
# GOOGLE_APPLICATION_CREDENTIALS)
GCLOUD_PROJECT=<votre-project-id> node scripts/seed.js
```

Comptes créés : `admin@locavision.app` (platform_admin) et `demo@locavision.app`
(company_admin), mot de passe `LocaVision2026!` pour les deux — à changer avant toute
utilisation réelle.

### Déploiement

Le frontend et l'API sont hébergés sur **Vercel** (une seule plateforme, pas de plan
payant requis) ; Firestore/Storage/Auth restent sur **Firebase**. `vercel.json` route
`/v1/**` vers `api/handler.js`, qui délègue à l'app Express partagée
(`functions/app.js`).

**Variables d'environnement Vercel** (Project Settings → Environment Variables) :

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Config Firebase publique (identique à `.env`) |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Contenu JSON complet d'une clé de compte de service (Firebase Console → Paramètres du projet → Comptes de service) |
| `FIREBASE_STORAGE_BUCKET` | Même valeur que `VITE_FIREBASE_STORAGE_BUCKET` |
| `GEMINI_API_KEY`, `PLATE_RECOGNIZER_TOKEN`, `SIV_API_KEY` | Clés tierces (jamais préfixées `VITE_`, jamais exposées au client) |

**Région & limites** (`vercel.json`) : la fonction API tourne à **Paris (`cdg1`)**, avec
60 s max par requête (l'analyse IA de 16 photos peut prendre ~30 s). Pour que la promesse
« données en UE » soit vraie de bout en bout, vérifiez que la base Firestore et le bucket
Storage sont aussi en Europe (Console Firebase → Firestore → onglet *Données*, l'emplacement
est affiché en haut ; `eur3` ou `europe-west*` = OK). L'emplacement d'une base Firestore ne
peut pas être changé après coup : si elle est aux États-Unis (`nam5`, `us-*`), il faut
créer une nouvelle base en Europe et y migrer les données.

**Index Firestore** (filtres de la flotte paginés côté serveur) — à déployer une fois, et
à chaque modification de `firestore.indexes.json` :

```bash
firebase deploy --only firestore:indexes,storage --project locavision-13692
```

Tant qu'ils ne sont pas construits, l'API retombe automatiquement sur un filtrage en
mémoire (plus lent, mais sans erreur).

**Photos d'inspection** : stockées en privé, servies via des URLs signées temporaires.
La signature utilise la clé `FIREBASE_SERVICE_ACCOUNT_KEY` (Vercel). Sur Firebase Cloud
Functions, le compte de service doit avoir le rôle *Service Account Token Creator*.

**Envoi des photos** : chaque photo est réduite à 1600 px / JPEG 80 % sur le téléphone
(~150-400 Ko) et envoyée seule, dès la prise de vue — aucune requête ne s'approche de la
limite de 4,5 Mo de Vercel. Sans réseau, l'inspection est conservée sur l'appareil
(IndexedDB) et renvoyée automatiquement (`src/lib/inspectionQueue.js`) ; côté serveur, la
soumission est idempotente sur l'identifiant d'inspection, donc jamais analysée deux fois.

Désactivez aussi la **Deployment Protection** (Vercel SSO) dans les réglages du projet si
le site doit être accessible sans authentification Vercel.

**Bascule optionnelle vers Firebase Cloud Functions** (si le projet passe un jour sur le
plan Blaze) :

```bash
firebase login
firebase deploy --only functions,firestore,storage
firebase functions:secrets:set GEMINI_API_KEY   # + PLATE_RECOGNIZER_TOKEN, SIV_API_KEY
```

Puis pointer `vercel.json` vers l'URL des Cloud Functions au lieu de `api/handler.js`.
