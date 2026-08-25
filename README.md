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

- **Frontend** : React + Vite + Tailwind CSS, mobile-first, PWA installable.
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
compte `platform_admin` pour y accéder. Une fois un compte Firebase Auth créé (console
Firebase ou `firebase auth:import`), ajoutez son document dans Firestore :

```
users/{uid} = { email: "admin@locavision.app", role: "platform_admin", companyId: null }
```

### Déploiement

```bash
firebase login
firebase deploy --only functions,firestore,storage,hosting
```

Les secrets `GEMINI_API_KEY`, `PLATE_RECOGNIZER_TOKEN`, `SIV_API_KEY` doivent être définis
en production via `firebase functions:secrets:set <NOM>`.
