import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const manifest = {
  name: 'SuLoCut',
  short_name: 'SuLoCut',
  description: 'Premium barber shop reservations and shop management.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  theme_color: '#0a0805',
  background_color: '#0a0805',
  icons: [
    {
      src: '/icons/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable'
    },
    {
      src: '/icons/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable'
    }
  ]
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ]
})
