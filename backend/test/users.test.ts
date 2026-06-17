import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { makeApp, resetDb, tokenFor, authH, prisma, data, meta } from './helpers'

let app: FastifyInstance

beforeAll(async () => { app = await makeApp() })
afterAll(async () => { await app.close(); await prisma.$disconnect() })
beforeEach(resetDb)

const staffId = async () => (await prisma.user.findUniqueOrThrow({ where: { username: 'staff' } })).id
const adminId = async () => (await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } })).id

describe('users', () => {
  it('list butuh auth', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/users' })).statusCode).toBe(401)
  })

  it('list paginated + tidak membocorkan password', async () => {
    const token = await tokenFor(app)
    const res = await app.inject({ method: 'GET', url: '/api/users', headers: authH(token) })
    expect(data(res)).toHaveLength(2)
    expect(data(res)[0]).not.toHaveProperty('password')
    expect(meta(res)).toMatchObject({ page: 1, total: 2 })
  })

  it('super user bisa membuat admin (non-super)', async () => {
    const token = await tokenFor(app, 'admin')
    const res = await app.inject({ method: 'POST', url: '/api/users', headers: authH(token), payload: { username: 'Baru', fullName: 'Baru', password: 'p' } })
    expect(res.statusCode).toBe(201)
    expect(data(res)).toMatchObject({ username: 'baru', isSuper: false })
  })

  it('staff tidak bisa membuat admin → 403', async () => {
    const token = await tokenFor(app, 'staff')
    const res = await app.inject({ method: 'POST', url: '/api/users', headers: authH(token), payload: { username: 'x', fullName: 'x', password: 'p' } })
    expect(res.statusCode).toBe(403)
  })

  it('username duplikat → 409', async () => {
    const token = await tokenFor(app)
    const res = await app.inject({ method: 'POST', url: '/api/users', headers: authH(token), payload: { username: 'staff', fullName: 'x', password: 'p' } })
    expect(res.statusCode).toBe(409)
  })

  it('staff bisa edit dirinya sendiri', async () => {
    const token = await tokenFor(app, 'staff')
    const res = await app.inject({ method: 'PATCH', url: `/api/users/${await staffId()}`, headers: authH(token), payload: { fullName: 'Staff Baru' } })
    expect(res.statusCode).toBe(200)
    expect(data(res).fullName).toBe('Staff Baru')
  })

  it('staff tidak bisa edit user lain → 403', async () => {
    const token = await tokenFor(app, 'staff')
    const res = await app.inject({ method: 'PATCH', url: `/api/users/${await adminId()}`, headers: authH(token), payload: { fullName: 'x' } })
    expect(res.statusCode).toBe(403)
  })

  it('super user tidak bisa dihapus → 400', async () => {
    const token = await tokenFor(app)
    const res = await app.inject({ method: 'DELETE', url: `/api/users/${await adminId()}`, headers: authH(token) })
    expect(res.statusCode).toBe(400)
  })

  it('super user bisa menghapus staff', async () => {
    const token = await tokenFor(app)
    const res = await app.inject({ method: 'DELETE', url: `/api/users/${await staffId()}`, headers: authH(token) })
    expect(res.statusCode).toBe(200)
    expect(data(res)).toMatchObject({ ok: true })
    expect(await prisma.user.findUnique({ where: { username: 'staff' } })).toBeNull()
  })
})
