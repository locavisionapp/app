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
- **Fiabilité & sécurité** : en-têtes de sécurité (helmet), limitation de débit par IP,
  validation des entrées sur chaque route, gestion d'erreurs centralisée qui ne renvoie
  jamais de détail interne au client, timeouts sur tous les appels IA/tiers.

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
