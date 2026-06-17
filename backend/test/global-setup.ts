import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import path from 'node:path'

const dbFile = path.join(process.cwd(), 'prisma', 'test.db')
const testDbUrl = `file:${dbFile}`

function removeDb() {
  rmSync(dbFile, { force: true })
  rmSync(`${dbFile}-journal`, { force: true })
}

/**
 * Mulai dari DB test yang benar-benar baru, lalu terapkan migrasi yang ada
 * (`migrate deploy` non-destruktif — tidak memicu guard reset). Hapus filenya setelah selesai.
 */
export default function setup() {
  removeDb()
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: testDbUrl },
  })

  return removeDb
}
