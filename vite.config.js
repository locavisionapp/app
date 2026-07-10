import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'LocaVision - Gestion de Flotte IA',
        short_name: 'LocaVision',
        description: 'Plateforme SaaS de gestion de flotte avec inspection IA',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          },
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Proxy PlateRecognizer pour éviter CORS en dev
      '/api/platerecognizer': {
        target: 'https://api.platerecognizer.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/platerecognizer/, ''),
        secure: true,
      },
      // Proxy RapidAPI SIV immatriculation pour éviter CORS en dev
      '/api/rapidapi-immat': {
        target: 'https://immatriculation.p.rapidapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rapidapi-immat/, ''),
        secure: true,
      },
      // Proxy RapidAPI checkcar pour éviter CORS en dev
      '/api/rapidapi-checkcar': {
        target: 'https://checkcar.p.rapidapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rapidapi-checkcar/, ''),
        secure: true,
      },
      // Nouveau Proxy pour la nouvelle API SIV
      '/api/rapidapi-france': {
        target: 'https://api-de-plaque-d-immatriculation-france.p.rapidapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rapidapi-france/, ''),
        secure: true,
      },
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
