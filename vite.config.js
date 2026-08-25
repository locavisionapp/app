import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// En dev, on proxy vers l'émulateur Firebase Hosting (voir firebase.json),
// qui applique la même réécriture "/v1/**" -> Cloud Function "api" qu'en prod.
const FUNCTIONS_EMULATOR_TARGET = process.env.VITE_HOSTING_EMULATOR_URL || 'http://127.0.0.1:5000'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'LocaVision',
        short_name: 'LocaVision',
        description: "Scan de véhicule et inspection IA guidée pour les professionnels de la location",
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Toutes les données transitent par l'API publique (Cloud Functions), jamais par des clés côté client.
      '/v1': {
        target: FUNCTIONS_EMULATOR_TARGET,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
