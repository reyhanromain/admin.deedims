import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Terpisah dari vite.config.ts (yang punya proxy dev). Vitest memakai file ini.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
