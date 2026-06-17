import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { makeApp, resetDb, tokenFor, authH, prisma, data, meta } from './helpers'

let app: FastifyInstance
let token: string

beforeAll(async () => { app = await makeApp() })
afterAll(async () => { await app.close(); await prisma.$disconnect() })
beforeEach(async () => { await resetDb(); token = await tokenFor(app) })

describe('orders list', () => {
  it('baris ramping + meta.counts + pagination', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/orders', headers: authH(token) })
    const rows = data(res)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ code: 'DD-1', status: 'confirmed', itemsSummary: 'Menu A x1' })
    expect(rows[0]).not.toHaveProperty('items') // ramping: tak ada objek item
    const m = meta(res)
    expect(m).toMatchObject({ page: 1, total: 1 })
    expect(m.counts).toMatchObject({ all: 1, confirmed: 1, submitted: 0 })
  })

  it('filter status tak cocok → kosong', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/orders?status=completed', headers: authH(token) })
    expect(data(res)).toHaveLength(0)
    expect(meta(res).total).toBe(0)
  })

  it('limit kecil → totalPages mencerminkan total', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/orders?page=1&limit=1', headers: authH(token) })
    expect(meta(res)).toMatchObject({ page: 1, limit: 1, total: 1, totalPages: 1 })
  })

  it('hanya order dari PO yang open (order PO lain dikecualikan)', async () => {
    // tambah order di PO 2 (draft) — tidak boleh muncul di list
    await prisma.order.create({ data: { orderCode: 'DD-2', preOrderId: 2, customerName: 'X', orderStatus: 'submitted', paymentStatus: 'pending', subtotalAmount: 5000, totalAmount: 5000 } })
    const res = await app.inject({ method: 'GET', url: '/api/orders', headers: authH(token) })
    expect(data(res)).toHaveLength(1)
    expect(data(res)[0].code).toBe('DD-1')
    expect(meta(res).counts.all).toBe(1)
  })

  it('tanpa PO open → list kosong', async () => {
    await prisma.preOrder.update({ where: { id: 1 }, data: { status: 'closed' } })
    const res = await app.inject({ method: 'GET', url: '/api/orders', headers: authH(token) })
    expect(data(res)).toHaveLength(0)
    expect(meta(res).counts.all).toBe(0)
  })
})

describe('order detail', () => {
  it('DTO detail: items snapshot + preOrder + cancelRequested', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/orders/1', headers: authH(token) })
    const d = data(res)
    expect(d).toMatchObject({ code: 'DD-1', cancelRequested: true })
    expect(d.items[0]).toMatchObject({ menuNameSnapshot: 'Menu A', quantity: 1 })
    expect(d.preOrder).toMatchObject({ title: 'PO Open' })
  })

  it('id tak ada → 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/orders/999', headers: authH(token) })
    expect(res.statusCode).toBe(404)
  })
})

describe('order mutations', () => {
  it('patch → confirmed mengisi confirmedAt (DB) & balikan status', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/orders/1', headers: authH(token), payload: { orderStatus: 'confirmed' } })
    expect(res.statusCode).toBe(200)
    expect(data(res)).toMatchObject({ id: 1, status: 'confirmed' })
    expect((await prisma.order.findUniqueOrThrow({ where: { id: 1 } })).confirmedAt).toBeTruthy()
  })

  it('status tidak valid → 400', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/orders/1', headers: authH(token), payload: { orderStatus: 'ngawur' } })
    expect(res.statusCode).toBe(400)
  })

  it('approve cancellation → order cancelled & request approved', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/orders/1/cancellation/approve', headers: authH(token) })
    expect(data(res)).toMatchObject({ status: 'approved' })
    const order = await prisma.order.findUniqueOrThrow({ where: { id: 1 }, include: { cancellationRequests: true } })
    expect(order.orderStatus).toBe('cancelled')
    expect(order.paymentStatus).toBe('cancelled')
    expect(order.cancelRequested).toBe(false)
    expect(order.cancellationRequests[0].status).toBe('approved')
    expect(order.cancellationRequests[0].reviewedById).toBeTruthy()
  })

  it('reject cancellation → request rejected, order status tak berubah', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/orders/1/cancellation/reject', headers: authH(token) })
    expect(data(res)).toMatchObject({ status: 'rejected' })
    const order = await prisma.order.findUniqueOrThrow({ where: { id: 1 }, include: { cancellationRequests: true } })
    expect(order.orderStatus).toBe('confirmed')
    expect(order.cancelRequested).toBe(false)
    expect(order.cancellationRequests[0].status).toBe('rejected')
  })

  it('approve tanpa request pending → 404', async () => {
    await app.inject({ method: 'POST', url: '/api/orders/1/cancellation/approve', headers: authH(token) })
    const res = await app.inject({ method: 'POST', url: '/api/orders/1/cancellation/approve', headers: authH(token) })
    expect(res.statusCode).toBe(404)
  })
})
