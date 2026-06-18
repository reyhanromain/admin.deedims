import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { makeApp, resetDb, tokenFor, authH, prisma, data, meta } from './helpers'

let app: FastifyInstance
let token: string

beforeAll(async () => { app = await makeApp() })
afterAll(async () => { await app.close(); await prisma.$disconnect() })
beforeEach(async () => { await resetDb(); token = await tokenFor(app) })

describe('customers', () => {
  it('list + stats per customer (server) + paginated', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/customers', headers: authH(token) })
    const sari = data(res).find((c: { username: string }) => c.username === 'sari')
    expect(sari).toMatchObject({ orderCount: 1, totalSpent: 10000, reminderActive: true, blocked: false })
    expect(sari.lastOrderAt).toBeTruthy()
    expect(meta(res)).toMatchObject({ page: 1, total: 1 })
  })

  it('block lalu unblock (toggle) → data {id,blocked}', async () => {
    const r1 = await app.inject({ method: 'POST', url: '/api/customers/1/block', headers: authH(token), payload: {} })
    expect(data(r1)).toMatchObject({ id: 1, blocked: true })
    const r2 = await app.inject({ method: 'POST', url: '/api/customers/1/block', headers: authH(token), payload: {} })
    expect(data(r2)).toMatchObject({ id: 1, blocked: false })
  })

  it('GET /:id/orders → track record ramping + paginated', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/customers/1/orders', headers: authH(token) })
    expect(data(res)[0]).toMatchObject({ code: 'DD-1', itemsSummary: 'Menu A x1', total: 10000, status: 'confirmed' })
    expect(meta(res)).toMatchObject({ total: 1 })
  })
})

describe('stock', () => {
  it('adjust tidak boleh di bawah 0', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/stock/2/adjust', headers: authH(token), payload: { delta: -100 } })
    expect(data(res).quantity).toBe(0)
  })
  it('adjust menambah qty', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/stock/1/adjust', headers: authH(token), payload: { delta: 10 } })
    expect(data(res).quantity).toBe(60)
  })
  it('label duplikat → 409', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/stock', headers: authH(token), payload: { label: 's1', name: 'X' } })
    expect(res.statusCode).toBe(409)
  })
  it('update nama, label, quantity, unit', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/stock/1', headers: authH(token), payload: { label: 'satu', name: 'Stock Satu', quantity: 12, unit: 'pack' } })
    expect(data(res)).toMatchObject({ id: 1, label: 'satu', name: 'Stock Satu', quantity: 12, unit: 'pack' })
  })
  it('update label duplikat → 409', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/stock/1', headers: authH(token), payload: { label: 's2' } })
    expect(res.statusCode).toBe(409)
  })
  it('list ramping + paginated', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/stock', headers: authH(token) })
    expect(data(res)[0]).not.toHaveProperty('isActive')
    expect(meta(res)).toMatchObject({ page: 1, total: 2 })
  })
})

describe('settings & subscribers', () => {
  it('patch setting mengubah value', async () => {
    const s = await prisma.setting.findFirstOrThrow()
    const res = await app.inject({ method: 'PATCH', url: `/api/settings/${s.id}`, headers: authH(token), payload: { value: 'baru' } })
    expect(data(res).value).toBe('baru')
  })
  it('list subscribers ramping + paginated', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/subscribers', headers: authH(token) })
    expect(data(res)[0]).toMatchObject({ telegramUsername: 'sari', isActive: true })
    expect(meta(res)).toMatchObject({ total: 1 })
  })
})

describe('bot-messages', () => {
  it('list + meta + label Jakarta', async () => {
    await prisma.botMessage.create({ data: { telegramChatId: 1n, direction: 'incoming', messageType: 'text', text: 'hai', receivedAt: new Date('2026-06-12T02:13:00Z') } })
    const res = await app.inject({ method: 'GET', url: '/api/bot-messages', headers: authH(token) })
    expect(data(res)[0].receivedAtLabel).toBe('12 Jun 2026, 09:13')
    expect(meta(res)).toMatchObject({ total: 1 })
  })

  it('list customers with messages only', async () => {
    await prisma.customer.create({ data: { id: 2, telegramUserId: 222n, username: 'budi', name: 'Budi' } })
    await prisma.botMessage.create({ data: { telegramChatId: 1n, customerId: 1, direction: 'incoming', messageType: 'text', text: 'hai', receivedAt: new Date('2026-06-12T02:13:00Z') } })
    const res = await app.inject({ method: 'GET', url: '/api/bot-messages/customers', headers: authH(token) })
    expect(data(res)).toEqual([{ id: 1, name: 'Sari', username: 'sari', messageCount: 1 }])
  })
})
