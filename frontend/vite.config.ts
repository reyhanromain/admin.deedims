import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Backend dev berjalan di :3100 (3000 dipakai layanan lain). Proxy API + foto upload.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3100',
      '/uploads': 'http://localhost:3100',
    },
  },
})
