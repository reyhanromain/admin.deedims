import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { makeApp, resetDb, tokenFor, authH, prisma, data } from './helpers'

let app: FastifyInstance
let token: string

beforeAll(async () => { app = await makeApp() })
afterAll(async () => { await app.close(); await prisma.$disconnect() })
beforeEach(async () => { await resetDb(); token = await tokenFor(app) })

describe('dashboard', () => {
  it('butuh auth', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/dashboard' })).statusCode).toBe(401)
  })

  it('KPI + recent + open PO + low-stock dihitung server', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/dashboard', headers: authH(token) })
    const d = data(res)
    // fixture: 1 order confirmed (cancelRequested) di PO open, total 10000
    expect(d.kpis).toMatchObject({ newOrders: 0, batchOrders: 1, batchRevenue: 10000, cancelRequests: 1 })
    expect(d.openPreorder).toMatchObject({ title: 'PO Open' })
    expect(d.recentOrders).toHaveLength(1)
    expect(d.recentOrders[0]).toMatchObject({ code: 'DD-1', itemsSummary: 'Menu A x1', total: 10000 })
    // stock 2 (qty 5) <= 10 → low; stock 1 (qty 50) tidak
    expect(d.lowStock).toHaveLength(1)
    expect(d.lowStock[0]).toMatchObject({ name: 'Stock 2', quantity: 5 })
  })
})
