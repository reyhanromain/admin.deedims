import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { makeApp, resetDb, tokenFor, authH, prisma, data, meta } from './helpers'

let app: FastifyInstance
let token: string

beforeAll(async () => { app = await makeApp() })
afterAll(async () => { await app.close(); await prisma.$disconnect() })
beforeEach(async () => { await resetDb(); token = await tokenFor(app) })

describe('preorders', () => {
  it('list + stats (orderCount/revenue) per PO + paginated', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/preorders', headers: authH(token) })
    const rows = data(res)
    const open = rows.find((p: { id: number }) => p.id === 1)
    const draft = rows.find((p: { id: number }) => p.id === 2)
    expect(open).toMatchObject({ status: 'open', orderCount: 1, revenue: 10000 })
    expect(draft).toMatchObject({ status: 'draft', orderCount: 0, revenue: 0 })
    expect(meta(res)).toMatchObject({ page: 1, total: 2 })
  })

  it('create draft → 201, stats 0', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/preorders', headers: authH(token), payload: { title: 'PO Baru', fulfillmentWeek: '2026-W26' } })
    expect(res.statusCode).toBe(201)
    expect(data(res)).toMatchObject({
      title: 'PO Baru', status: 'draft', orderCount: 0, revenue: 0,
      fulfillmentStartDate: '2026-06-21T17:00:00.000Z',
      fulfillmentEndDate: '2026-06-25T17:00:00.000Z',
    })
  })

  it('create tanpa judul → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/preorders', headers: authH(token), payload: {} })
    expect(res.statusCode).toBe(400)
  })

  it('create tanpa pekan atau dengan ISO week tidak valid → 400', async () => {
    const missing = await app.inject({ method: 'POST', url: '/api/preorders', headers: authH(token), payload: { title: 'PO Baru' } })
    const invalid = await app.inject({ method: 'POST', url: '/api/preorders', headers: authH(token), payload: { title: 'PO Baru', fulfillmentWeek: '2025-W53' } })
    expect(missing.statusCode).toBe(400)
    expect(invalid.statusCode).toBe(400)
  })

  it('open saat sudah ada PO open → 409', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/preorders/2/open', headers: authH(token) })
    expect(res.statusCode).toBe(409)
  })

  it('tutup PO open lalu buka PO lain → sukses', async () => {
    await app.inject({ method: 'POST', url: '/api/preorders/1/close', headers: authH(token) })
    const res = await app.inject({ method: 'POST', url: '/api/preorders/2/open', headers: authH(token) })
    expect(res.statusCode).toBe(200)
    expect(data(res)).toMatchObject({ id: 2, status: 'open' })
  })

  it('membuka kembali PO yang sudah open (id sama) tidak diblokir', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/preorders/1/open', headers: authH(token) })
    expect(res.statusCode).toBe(200)
  })

  it('GET /:id/orders → order PO tsb (paginated)', async () => {
    const r1 = await app.inject({ method: 'GET', url: '/api/preorders/1/orders', headers: authH(token) })
    expect(data(r1)[0]).toMatchObject({ code: 'DD-1', itemsSummary: 'Menu A x1', status: 'confirmed' })
    expect(meta(r1)).toMatchObject({ total: 1 })
    const r2 = await app.inject({ method: 'GET', url: '/api/preorders/2/orders', headers: authH(token) })
    expect(data(r2)).toHaveLength(0)
  })

  it('GET /:id/orders untuk PO tak ada → 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/preorders/999/orders', headers: authH(token) })
    expect(res.statusCode).toBe(404)
  })

  it('complete menandai selesai', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/preorders/1/complete', headers: authH(token) })
    expect(data(res)).toMatchObject({ status: 'completed' })
    expect((await prisma.preOrder.findUniqueOrThrow({ where: { id: 1 } })).status).toBe('completed')
  })
})
