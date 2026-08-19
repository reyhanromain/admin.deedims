import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { makeApp, resetDb, tokenFor, authH, prisma, data, errOf, meta } from './helpers'
import { registerTelegramSender } from '../src/bot/notifications'

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

  // `notes` diisi customer di checkout mini app (nomor WA + catatannya). Sebelumnya tidak
  // ikut DTO sehingga admin tidak bisa melihat nomor WA customer di mana pun.
  it('DTO detail memuat catatan customer, terpisah dari catatan admin', async () => {
    await prisma.order.update({ where: { id: 1 }, data: { notes: 'WA: 0812\nTitip di pos satpam', adminNotes: 'sudah ditelepon' } })
    const d = data(await app.inject({ method: 'GET', url: '/api/orders/1', headers: authH(token) }))
    expect(d.notes).toBe('WA: 0812\nTitip di pos satpam')
    expect(d.adminNotes).toBe('sudah ditelepon')
  })

  it('order tanpa catatan customer → notes string kosong', async () => {
    await prisma.order.update({ where: { id: 1 }, data: { notes: null } })
    expect(data(await app.inject({ method: 'GET', url: '/api/orders/1', headers: authH(token) })).notes).toBe('')
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

  // Jalur cancel lewat PATCH ditutup supaya pembatalan tidak bisa lolos tanpa
  // catatan opsional dan tanpa notifikasi pembatalan yang benar.
  it('patch → cancelled ditolak, arahkan ke endpoint cancel', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/orders/1', headers: authH(token), payload: { orderStatus: 'cancelled' } })
    expect(res.statusCode).toBe(400)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: 1 } })).orderStatus).toBe('confirmed')
  })
})

describe('pembatalan order oleh admin', () => {
  const sent: string[] = []

  beforeEach(async () => {
    sent.length = 0
    registerTelegramSender(async (_chatId, text) => {
      sent.push(text)
      return { message_id: sent.length, date: Math.floor(Date.now() / 1000) }
    })
    // Fixture order tidak memakai stock; dipasang di sini agar restore stock terlihat.
    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: 1 } })
    await prisma.orderItemStockUsage.create({ data: { orderItemId: item.id, stockItemId: 1, quantity: 2 } })
  })
  afterEach(() => registerTelegramSender(null))

  it('order confirmed dibatalkan + catatan → status, stock, dan notifikasi customer', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/orders/1/cancel', headers: authH(token), payload: { note: 'Bahan habis, maaf ya kak' } })
    expect(res.statusCode).toBe(200)
    expect(data(res)).toMatchObject({ id: 1, status: 'cancelled', pay: 'cancelled', cancelRequested: false, cancellationNote: 'Bahan habis, maaf ya kak' })

    const order = await prisma.order.findUniqueOrThrow({ where: { id: 1 } })
    expect(order).toMatchObject({ orderStatus: 'cancelled', paymentStatus: 'cancelled', cancelRequested: false, cancellationNote: 'Bahan habis, maaf ya kak' })
    expect(order.cancelledAt).toBeTruthy()
    expect((await prisma.stockItem.findUniqueOrThrow({ where: { id: 1 } })).quantity).toBe(52)

    expect(sent).toHaveLength(1)
    expect(sent[0]).toContain('<b>DD-1</b>')
    expect(sent[0]).toContain('Catatan dari admin:')
    expect(sent[0]).toContain('Bahan habis, maaf ya kak')
    expect(await prisma.botMessage.findFirst({ where: { orderId: 1, direction: 'outgoing' } })).toMatchObject({ intent: 'order_cancelled_by_admin' })
  })

  it('tanpa catatan → notifikasi tanpa blok catatan', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/orders/1/cancel', headers: authH(token), payload: {} })
    expect(res.statusCode).toBe(200)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: 1 } })).cancellationNote).toBeNull()
    expect(sent[0]).not.toContain('Catatan dari admin:')
  })

  it('catatan berisi spasi saja dianggap kosong', async () => {
    await app.inject({ method: 'POST', url: '/api/orders/1/cancel', headers: authH(token), payload: { note: '   ' } })
    expect((await prisma.order.findUniqueOrThrow({ where: { id: 1 } })).cancellationNote).toBeNull()
    expect(sent[0]).not.toContain('Catatan dari admin:')
  })

  // Catatan diketik bebas oleh admin; Telegram memakai parse_mode HTML.
  it('catatan yang mengandung HTML dikirim ter-escape', async () => {
    await app.inject({ method: 'POST', url: '/api/orders/1/cancel', headers: authH(token), payload: { note: 'stock <b>habis</b> & tutup' } })
    expect(sent[0]).toContain('stock &lt;b&gt;habis&lt;/b&gt; &amp; tutup')
  })

  it('order submitted dan ready juga bisa dibatalkan', async () => {
    for (const status of ['submitted', 'ready'] as const) {
      await prisma.order.update({ where: { id: 1 }, data: { orderStatus: status, paymentStatus: 'pending', cancellationNote: null } })
      const res = await app.inject({ method: 'POST', url: '/api/orders/1/cancel', headers: authH(token), payload: {} })
      expect(res.statusCode).toBe(200)
      expect((await prisma.order.findUniqueOrThrow({ where: { id: 1 } })).orderStatus).toBe('cancelled')
    }
  })

  it('order completed → 409 dan tidak mengubah apa pun', async () => {
    await prisma.order.update({ where: { id: 1 }, data: { orderStatus: 'completed' } })
    const res = await app.inject({ method: 'POST', url: '/api/orders/1/cancel', headers: authH(token), payload: { note: 'telat' } })
    expect(res.statusCode).toBe(409)
    expect(errOf(res).code).toBe('ORDER_NOT_CANCELLABLE')
    expect((await prisma.order.findUniqueOrThrow({ where: { id: 1 } })).orderStatus).toBe('completed')
    expect((await prisma.stockItem.findUniqueOrThrow({ where: { id: 1 } })).quantity).toBe(50)
    expect(sent).toHaveLength(0)
  })

  it('order yang sudah cancelled → 409, stock tidak dikembalikan dua kali', async () => {
    await app.inject({ method: 'POST', url: '/api/orders/1/cancel', headers: authH(token), payload: {} })
    const res = await app.inject({ method: 'POST', url: '/api/orders/1/cancel', headers: authH(token), payload: {} })
    expect(res.statusCode).toBe(409)
    expect((await prisma.stockItem.findUniqueOrThrow({ where: { id: 1 } })).quantity).toBe(52)
  })

  it('catatan lebih dari 500 karakter → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/orders/1/cancel', headers: authH(token), payload: { note: 'x'.repeat(501) } })
    expect(res.statusCode).toBe(400)
  })

  it('order tak ada → 404', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/orders/999/cancel', headers: authH(token), payload: {} })
    expect(res.statusCode).toBe(404)
  })

  it('detail order membawa catatan pembatalan', async () => {
    await app.inject({ method: 'POST', url: '/api/orders/1/cancel', headers: authH(token), payload: { note: 'Bahan habis' } })
    expect(data(await app.inject({ method: 'GET', url: '/api/orders/1', headers: authH(token) })).cancellationNote).toBe('Bahan habis')
  })
})
