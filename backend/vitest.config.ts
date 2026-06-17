import { defineConfig } from 'vitest/config'
import path from 'node:path'

// DB test terpisah (absolut, supaya konsisten antara `prisma db push` & Prisma Client).
const testDbUrl = `file:${path.join(process.cwd(), 'prisma', 'test.db')}`

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false, // satu file SQLite dipakai bersama → jalankan berurutan
    hookTimeout: 30000,
    testTimeout: 30000,
    // Di-inject ke process.env worker SEBELUM modul (config.ts/db.ts) di-import,
    // jadi dotenv tidak menimpa (dotenv tak override env yang sudah ada).
    env: {
      DATABASE_URL: testDbUrl,
      JWT_SECRET: 'test-secret',
      BOT_TOKEN: '',
      TZ: 'Asia/Jakarta',
      RETENTION_DAYS: '14',
      CORS_ORIGIN: 'http://localhost:5173',
      UPLOADS_DIR: path.join(process.cwd(), 'test', '.uploads'),
      MAX_UPLOAD_MB: '1',
    },
  },
})
