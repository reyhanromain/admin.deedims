import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { makeApp, resetDb, prisma, data, errOf } from './helpers'
import { config } from '../src/config'
import { setThrottleClock } from '../src/lib/throttle'

let app: FastifyInstance

beforeAll(async () => { app = await makeApp() })
afterAll(async () => { await app.close(); await prisma.$disconnect() })
beforeEach(resetDb)

/** Login dari IP tertentu — CF-Connecting-IP adalah yang dibaca clientIp(). */
const login = (ip: string, password: string, username = 'admin') =>
  app.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: { 'cf-connecting-ip': ip },
    payload: { username, password },
  })

describe('throttle login', () => {
  it('gagal sampai batas → 401, percobaan berikutnya 429 + Retry-After', async () => {
    for (let i = 0; i < config.loginRateMax; i++) {
      const res = await login('203.0.113.10', 'salah')
      expect(res.statusCode).toBe(401)
    }

    const blocked = await login('203.0.113.10', 'salah')
    expect(blocked.statusCode).toBe(429)
    expect(errOf(blocked)).toMatchObject({ code: 'RATE_LIMITED' })
    expect(blocked.headers['retry-after']).toBeTruthy()
  })

  it('password BENAR pun ditolak selama masih terkunci', async () => {
    for (let i = 0; i < config.loginRateMax; i++) await login('203.0.113.11', 'salah')

    const res = await login('203.0.113.11', 'secret')
    expect(res.statusCode).toBe(429)
  })

  it('IP lain punya ember sendiri — satu penyerang tidak mengunci admin lain', async () => {
    for (let i = 0; i < config.loginRateMax + 1; i++) await login('203.0.113.12', 'salah')
    expect((await login('203.0.113.12', 'secret')).statusCode).toBe(429)

    // Admin sah dari IP berbeda harus tetap bisa masuk.
    const other = await login('203.0.113.99', 'secret')
    expect(other.statusCode).toBe(200)
    expect(data(other).token).toBeTruthy()
  })

  it('login sukses mereset hitungan pasangan IP+username', async () => {
    for (let i = 0; i < config.loginRateMax - 1; i++) {
      expect((await login('203.0.113.13', 'salah')).statusCode).toBe(401)
    }

    expect((await login('203.0.113.13', 'secret')).statusCode).toBe(200)

    // Jatah penuh lagi setelah sukses.
    for (let i = 0; i < config.loginRateMax; i++) {
      expect((await login('203.0.113.13', 'salah')).statusCode).toBe(401)
    }
  })

  it('username berbeda dari IP sama tidak saling menghabiskan jatah', async () => {
    for (let i = 0; i < config.loginRateMax; i++) await login('203.0.113.14', 'salah', 'admin')
    expect((await login('203.0.113.14', 'salah', 'admin')).statusCode).toBe(429)

    // 'staff' masih punya jatah pasangannya sendiri di IP yang sama.
    expect((await login('203.0.113.14', 'secret', 'staff')).statusCode).toBe(200)
  })

  it('batas per-IP menahan spraying lintas username', async () => {
    // Username berbeda-beda supaya penghitung pasangan tak pernah tercapai;
    // yang menghentikan hanyalah batas per-IP.
    for (let i = 0; i < config.loginRateIpMax; i++) {
      const res = await login('203.0.113.15', 'salah', `nobody${i}`)
      expect(res.statusCode).toBe(401)
    }

    const blocked = await login('203.0.113.15', 'secret', 'admin')
    expect(blocked.statusCode).toBe(429)
  })

  it('jendela kedaluwarsa memulihkan akses', async () => {
    const start = Date.now()
    setThrottleClock(() => start)

    for (let i = 0; i < config.loginRateMax; i++) await login('203.0.113.16', 'salah')
    expect((await login('203.0.113.16', 'secret')).statusCode).toBe(429)

    // Maju melewati jendela — pakai jam yang disuntikkan, bukan fake timer.
    setThrottleClock(() => start + config.loginRateWindowMs + 1000)
    expect((await login('203.0.113.16', 'secret')).statusCode).toBe(200)
  })

  it('tanpa CF-Connecting-IP jatuh ke X-Forwarded-For paling kiri', async () => {
    const attempt = (password: string) =>
      app.inject({
        method: 'POST',
        url: '/api/auth/login',
        headers: { 'x-forwarded-for': '198.51.100.7, 172.20.0.5' },
        payload: { username: 'admin', password },
      })

    for (let i = 0; i < config.loginRateMax; i++) expect((await attempt('salah')).statusCode).toBe(401)
    expect((await attempt('secret')).statusCode).toBe(429)

    // IP kiri yang berbeda = ember berbeda, meski hop terakhirnya sama.
    const other = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'x-forwarded-for': '198.51.100.8, 172.20.0.5' },
      payload: { username: 'admin', password: 'secret' },
    })
    expect(other.statusCode).toBe(200)
  })
})

describe('throttle miniapp auth', () => {
  const auth = (ip: string) =>
    app.inject({
      method: 'POST',
      url: '/api/miniapp/auth',
      headers: { 'cf-connecting-ip': ip },
      payload: { devUserId: '111' },
    })

  it('menghitung semua request, bukan hanya yang gagal', async () => {
    for (let i = 0; i < config.miniappAuthRateMax; i++) {
      expect((await auth('203.0.113.20')).statusCode).toBe(200)
    }

    const blocked = await auth('203.0.113.20')
    expect(blocked.statusCode).toBe(429)
    expect(errOf(blocked)).toMatchObject({ code: 'RATE_LIMITED' })
  })

  it('tidak berbagi ember dengan IP lain', async () => {
    for (let i = 0; i < config.miniappAuthRateMax + 1; i++) await auth('203.0.113.21')
    expect((await auth('203.0.113.22')).statusCode).toBe(200)
  })
})
