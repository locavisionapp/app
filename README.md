# LocaVision - Plateforme SaaS de Gestion de Flotte avec Inspection IA

Une solution complète de gestion de flotte de véhicules avec inspection par intelligence artificielle utilisant Google Gemini 1.5 Flash pour la détection automatique des dommages.

## 🚀 Fonctionnalités

### 📱 Inspection IA "Step-by-Step"
- Interface caméra avec overlay SVG dynamique adapté au type de véhicule
- Séquence de 8 points de contrôle obligatoires (360° extérieur + intérieur)
- Analyse en temps réel par IA pour détecter les dommages
- Heatmap interactive de visualisation des dommages
- Capture GPS automatique pour chaque photo

### 📊 Dashboard Administrateur
- Analytics en temps réel du taux d'utilisation de la flotte
- Gestion CRUD complète des véhicules avec score de santé
- Générateur de rapports PDF automatiques
- Comparatif "Avant/Après" pour facturation des nouveaux dommages
- Alertes et notifications intelligentes

### 🖋️ Signature Électronique & Documents
- Signature électronique sur écran tactile
- Génération PDF avec valeur légale
- Rapports comparatifs Départ vs Retour
- Photos horodatées pour preuves juridiques

### 🌐 Mode Hors-ligne
- Capture photos sans connexion internet
- Synchronisation automatique dès le retour en ligne
- Stockage local optimisé avec IndexedDB
- Gestion intelligente de la file d'attente de synchronisation

### 📱 PWA Optimisée
- Progressive Web App pour usage terrain
- Design responsive mobile-first
- Thème dark mode haute performance
- Feedback haptique lors des captures

## 🛠️ Stack Technique

### Frontend
- **React.js** avec Vite
- **Tailwind CSS** pour le styling
- **Framer Motion** pour les animations
- **Lucide React** pour les icônes
- **PWA** avec Service Workers

### Backend & Database
- **Firebase** (Auth, Firestore, Storage)
- **Firestore Security Rules** strictes
- **Cloud Storage** pour les images optimisées

### IA Vision
- **Google Gemini 1.5 Flash** API
- Analyse en temps réel des dommages
- Comparaison intelligente Avant/Après
- Estimation automatique des coûts de réparation

### Mobile & Performance
- **PWA** optimisée pour terrain
- **IndexedDB** pour le mode hors-ligne
- **Canvas API** pour compression images
- **Geolocation API** pour coordonnées GPS

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+
- Compte Firebase
- Clé API Google Gemini

### Installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd LocaVision
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos clés API
```

4. **Démarrer le développement**
```bash
npm run dev
```

### Configuration Firebase

1. Créer un projet Firebase
2. Activer Authentication, Firestore, et Storage
3. Configurer les règles de sécurité Firestore
4. Ajouter les clés dans le fichier `.env`

### Configuration Gemini

1. Obtenir une clé API Google AI Platform
2. Ajouter `VITE_GEMINI_API_KEY` dans `.env`

## 📁 Structure du Projet

```
src/
├── components/          # Composants React
│   ├── CameraCapture.jsx      # Interface caméra avec overlay
│   ├── DamageHeatmap.jsx      # Visualisation dommages
│   └── SignaturePad.jsx       # Signature électronique
├── pages/              # Pages principales
│   └── Dashboard.jsx          # Dashboard admin
├── services/           # Services backend
│   ├── firebase.js            # Configuration Firebase
│   ├── firestore.js           # Opérations Firestore
│   ├── gemini.js              # API Gemini Vision
│   ├── pdfGenerator.js        # Génération PDF
│   └── offlineStorage.js      # Stockage hors-ligne
├── types/              # Types et constantes
└── App.jsx             # Application principale
```

## 🔧 Fonctionnalités Techniques

### Analyse par IA
- Détection automatique des types de dommages (rayures, enfoncements, vitres brisées)
- Niveau de sévérité (1-5)
- Estimation des coûts de réparation
- Comparaison intelligente Avant/Après

### Gestion des Images
- Compression automatique côté client (Canvas API)
- Redimensionnement optimisé pour l'IA
- Stockage avec métadonnées GPS
- Synchronisation différée hors-ligne

### Sécurité
- Règles Firestore strictes
- Authentification Firebase
- Validation des données côté serveur
- Chiffrement des données sensibles

## 📊 Analytics & Rapports

### Dashboard Analytics
- Taux d'utilisation de la flotte
- Coût total des dommages par mois
- Score de santé des véhicules
- Historique des inspections

### Rapports PDF
- Rapport d'inspection complet
- Comparatif Avant/Après
- Photos horodatées
- Signatures électroniques intégrées

## 🌐 PWA Features

### Installation
- Ajout à l'écran d'accueil
- Mode plein écran
- Lancement rapide

### Hors-ligne
- Capture photos sans réseau
- File d'attente de synchronisation
- Notifications de statut

## 🚀 Déploiement

### Build Production
```bash
npm run build
```

### Déploiement
- Firebase Hosting recommandé
- Vercel, Netlify compatibles
- Configuration PWA automatique

## 📝 License

Ce projet est sous licence MIT.

## 🤝 Contribuer

1. Fork le projet
2. Créer une branche feature
3. Commit les changements
4. Push vers la branche
5. Ouvrir une Pull Request

## 📞 Support

Pour toute question ou support technique :
- Email: support@locavision.com
- Documentation: docs.locavision.com
