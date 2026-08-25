import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// In dev, proxy to the Firebase Hosting emulator (see firebase.json), which
// applies the same "/v1/**" -> API function rewrite as production.
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
      // Every data call goes through the public API — never a client-side key.
      '/v1': {
        target: FUNCTIONS_EMULATOR_TARGET,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Split rarely-changing vendor code from app code so a deploy only
        // busts the cache for what actually changed, and the initial paint
        // doesn't wait on the whole dependency graph.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth'],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },
})
