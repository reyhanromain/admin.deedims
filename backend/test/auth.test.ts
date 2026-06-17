import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { makeApp, resetDb, tokenFor, authH, prisma, data, errOf } from './helpers'

let app: FastifyInstance

beforeAll(async () => { app = await makeApp() })
afterAll(async () => { await app.close(); await prisma.$disconnect() })
beforeEach(resetDb)

describe('auth', () => {
  it('login benar → envelope { data:{token,user}, error:null }', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'admin', password: 'secret' } })
    expect(res.statusCode).toBe(200)
    const d = data(res)
    expect(d.token).toBeTruthy()
    expect(d.user).toMatchObject({ username: 'admin', isSuper: true })
    expect(errOf(res)).toBeNull()
  })

  it('login uppercase tetap berhasil', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'ADMIN', password: 'secret' } })
    expect(res.statusCode).toBe(200)
  })

  it('login salah → 401 + error envelope', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'admin', password: 'salah' } })
    expect(res.statusCode).toBe(401)
    expect(errOf(res)).toMatchObject({ code: 'UNAUTHORIZED' })
    expect(errOf(res).message).toBeTruthy()
  })

  it('payload tak lengkap → 400 VALIDATION', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'admin' } })
    expect(res.statusCode).toBe(400)
    expect(errOf(res).code).toBe('VALIDATION')
  })

  it('/me tanpa token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' })
    expect(res.statusCode).toBe(401)
    expect(errOf(res).code).toBe('UNAUTHORIZED')
  })

  it('/me dengan token → profil', async () => {
    const token = await tokenFor(app)
    const res = await app.inject({ method: 'GET', url: '/api/auth/me', headers: authH(token) })
    expect(res.statusCode).toBe(200)
    expect(data(res)).toMatchObject({ username: 'admin', isSuper: true })
  })
})
