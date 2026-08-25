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
4. **Tarifs** : chaque entreprise fixe le tarif journalier de ses véhicules.
5. **Admin plateforme** : ouverture des comptes entreprise (génère une clé API) et suivi du
   volume d'appels API par entreprise.

## Architecture

- **Frontend** : React + Vite + Tailwind CSS, mobile-first, PWA installable — **déployé sur
  Vercel** (https://app-locavision.vercel.app).
- **Backend** : Firebase Cloud Functions — une API REST publique et versionnée (`/v1/...`)
  qui est **l'unique porte d'entrée** vers les données. Le frontend web consomme cette même
  API (avec un jeton Firebase Auth) ; les CRM tiers l'appellent avec une clé API
  d'entreprise (`Authorization: Bearer sk_live_...`). Les clés Gemini / PlateRecognizer /
  RapidAPI ne vivent que côté serveur.
- **Données** : Firestore (`companies/{id}/vehicles/{id}/inspections/{id}`), Storage pour les
  photos. Les règles Firestore/Storage bloquent tout accès direct depuis un client — seul
  l'Admin SDK des Cloud Functions y accède.

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
parcours entreprise. `functions/scripts/seed.js` crée les deux d'un coup :

```bash
# Contre l'émulateur local (voir "Lancer en local" ci-dessus)
cd functions
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
  GCLOUD_PROJECT=demo-smoketest node scripts/seed.js

# Contre le vrai projet Firebase (après `firebase login`)
GCLOUD_PROJECT=<votre-project-id> node scripts/seed.js
```

Comptes créés : `admin@locavision.app` (platform_admin) et `demo@locavision.app`
(company_admin), mot de passe `LocaVision2026!` pour les deux — à changer avant toute
utilisation réelle.

### Déploiement

Le frontend est hébergé sur **Vercel** ; le backend (Cloud Functions, Firestore, Storage)
sur **Firebase**. `vercel.json` réécrit `/v1/**` vers l'URL des Cloud Functions
(`https://europe-west1-<project-id>.cloudfunctions.net/api/v1/**`) — adaptez ce fichier si
l'ID de projet ou la région changent.

**Backend (Firebase)** :

```bash
firebase login
firebase deploy --only functions,firestore,storage
```

Les secrets `GEMINI_API_KEY`, `PLATE_RECOGNIZER_TOKEN`, `SIV_API_KEY` doivent être définis
en production via `firebase functions:secrets:set <NOM>`.

**Frontend (Vercel)** : dans les réglages du projet Vercel, renseignez les variables
`VITE_FIREBASE_*` (les mêmes que dans `.env`, sans `VITE_USE_FIREBASE_EMULATOR`), et
désactivez la **Deployment Protection** (Vercel SSO) si le site doit être accessible sans
authentification Vercel.
