import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'Icon-app 1.png', 'Icon-app 2.png'], // Thêm icon vào đây
      manifest: {
        name: 'Đọc Sách Nè - Doc Sach',
        short_name: 'Đọc Sách',
        description: 'Offline book reader for EPUB, PDF, ZIP/CBZ, TXT',
        theme_color: '#F5EDE0',
        background_color: '#F5EDE0',
        display: 'standalone',
        orientation: 'any',
        lang: 'vi',
        icons: [
          {
            src: 'Icon-app 1.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'Icon-app 2.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'Icon-app 2.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable' // Cái này giúp icon đẹp hơn trên một số dòng máy
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      }
    })
  ],
})