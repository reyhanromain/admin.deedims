import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Backend dev berjalan di :3100 (3000 dipakai layanan lain). Proxy API + foto upload.
// Dua entry: admin CMS (index.html) + customer Telegram Mini App (miniapp.html).
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        admin: 'index.html',
        miniapp: 'miniapp.html',
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3100',
      '/uploads': 'http://localhost:3100',
    },
  },
})
