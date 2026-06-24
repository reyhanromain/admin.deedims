import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { makeApp, resetDb, prisma, data, errOf } from './helpers'

let app: FastifyInstance

beforeAll(async () => { app = await makeApp() })
afterAll(async () => { await app.close(); await prisma.$disconnect() })
beforeEach(async () => { await resetDb() })

/** Auth sebagai customer (dev fallback, BOT_TOKEN kosong di test) → token customer. */
async function customerToken(devUserId = '111'): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/api/miniapp/auth', payload: { devUserId } })
  return data(res).token as string
}
const auth = (token: string) => ({ authorization: `Bearer ${token}` })

describe('miniapp auth', () => {
  it('dev fallback: devUserId → token + customer', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/miniapp/auth', payload: { devUserId: '111' } })
    expect(res.statusCode).toBe(200)
    const d = data(res)
    expect(typeof d.token).toBe('string')
    expect(d.customer).toMatchObject({ id: '111', name: 'Sari' })
  })

  it('tanpa initData & tanpa devUserId → 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/miniapp/auth', payload: {} })
    expect(res.statusCode).toBe(401)
    expect(errOf(res).code).toBe('INITDATA_REQUIRED')
  })

  it('customer yang diblok → 403', async () => {
    await prisma.customer.update({ where: { telegramUserId: 111n }, data: { blocked: true } })
    const res = await app.inject({ method: 'POST', url: '/api/miniapp/auth', payload: { devUserId: '111' } })
    expect(res.statusCode).toBe(403)
    expect(errOf(res).code).toBe('CUSTOMER_BLOCKED')
  })

  it('token customer ditolak di rute admin', async () => {
    const token = await customerToken()
    const res = await app.inject({ method: 'GET', url: '/api/orders', headers: auth(token) })
    expect(res.statusCode).toBe(401)
  })
})

describe('miniapp catalog', () => {
  it('publik: PO terbuka + menu dengan varian & add-on berbayar', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/miniapp/catalog' })
    expect(res.statusCode).toBe(200)
    const d = data(res)
    expect(d.po).toMatchObject({ title: 'PO Open' })
    expect(d.menus).toHaveLength(1) // Menu A (Addon B disembunyikan karena isAddon)
    const menu = d.menus[0]
    expect(menu).toMatchObject({ name: 'Menu A' })
    expect(menu.variants[0]).toMatchObject({ name: 'Reg', price: 10000 })
    expect(menu.addons[0]).toMatchObject({ name: 'Addon B', price: 5000 })
  })

  it('tanpa PO open → menus kosong', async () => {
    await prisma.preOrder.update({ where: { id: 1 }, data: { status: 'closed' } })
    const res = await app.inject({ method: 'GET', url: '/api/miniapp/catalog' })
    expect(data(res).po).toBeNull()
    expect(data(res).menus).toHaveLength(0)
  })
})

describe('miniapp submit order', () => {
  async function variantIds() {
    const cat = data(await app.inject({ method: 'GET', url: '/api/miniapp/catalog' }))
    return { variantId: cat.menus[0].variants[0].id as number, addonVariantId: cat.menus[0].addons[0].variantId as number }
  }

  it('buat order: harga dihitung server, stok dipotong, item ter-snapshot', async () => {
    const token = await customerToken()
    const { variantId, addonVariantId } = await variantIds()
    const res = await app.inject({
      method: 'POST', url: '/api/miniapp/orders', headers: auth(token),
      payload: { items: [{ variantId, quantity: 2, addonVariantIds: [addonVariantId] }], name: 'Sari', phone: '0812', method: 'cod', note: 'pedas' },
    })
    expect(res.statusCode).toBe(201)
    const d = data(res)
    expect(d.total).toBe(2 * (10000 + 5000)) // main 10000 + addon 5000, ×2
    expect(d.status).toBe('submitted')

    // stok dipotong: s1 50→46 (2/unit ×2), s2 5→3 (1/unit ×2)
    const s1 = await prisma.stockItem.findUnique({ where: { id: 1 } })
    const s2 = await prisma.stockItem.findUnique({ where: { id: 2 } })
    expect(s1?.quantity).toBe(46)
    expect(s2?.quantity).toBe(3)

    // order + item (main + addon) tersimpan untuk customer ini
    const order = await prisma.order.findUnique({ where: { id: d.id }, include: { items: true } })
    expect(order?.telegramUserId).toBe(111n)
    expect(order?.notes).toContain('WA: 0812')
    expect(order?.items).toHaveLength(2)
    expect(order?.items.find((it) => it.parentOrderItemId != null)?.menuNameSnapshot).toBe('Addon B')
  })

  it('harga klien diabaikan — tetap pakai harga DB', async () => {
    const token = await customerToken()
    const { variantId } = await variantIds()
    const res = await app.inject({
      method: 'POST', url: '/api/miniapp/orders', headers: auth(token),
      payload: { items: [{ variantId, quantity: 1, addonVariantIds: [] }], name: 'Sari' },
    })
    expect(data(res).total).toBe(10000)
  })

  it('stok tak cukup → 409', async () => {
    const token = await customerToken()
    const { variantId } = await variantIds() // ambil id sebelum stok dikurangi (katalog menyaring menu kurang stok)
    await prisma.stockItem.update({ where: { id: 1 }, data: { quantity: 1 } }) // butuh 2/unit
    const res = await app.inject({
      method: 'POST', url: '/api/miniapp/orders', headers: auth(token),
      payload: { items: [{ variantId, quantity: 1, addonVariantIds: [] }], name: 'Sari' },
    })
    expect(res.statusCode).toBe(409)
    expect(errOf(res).code).toBe('STOCK_INSUFFICIENT')
  })

  it('tanpa token → 401', async () => {
    const { variantId } = await variantIds()
    const res = await app.inject({ method: 'POST', url: '/api/miniapp/orders', payload: { items: [{ variantId, quantity: 1 }], name: 'Sari' } })
    expect(res.statusCode).toBe(401)
  })
})

describe('miniapp orders list + detail + cancel', () => {
  it('list hanya order milik customer (scoped telegramUserId)', async () => {
    // order milik user lain tidak boleh muncul
    await prisma.order.create({ data: { orderCode: 'DD-OTHER', preOrderId: 1, telegramUserId: 999n, orderStatus: 'submitted', paymentStatus: 'pending', subtotalAmount: 1, totalAmount: 1 } })
    const token = await customerToken()
    const res = await app.inject({ method: 'GET', url: '/api/miniapp/orders', headers: auth(token) })
    const rows = data(res)
    expect(rows.every((o: { code: string }) => o.code !== 'DD-OTHER')).toBe(true)
    expect(rows.find((o: { code: string }) => o.code === 'DD-1')).toBeTruthy()
  })

  it('detail order milik orang lain → 404', async () => {
    const other = await prisma.order.create({ data: { orderCode: 'DD-OTHER', preOrderId: 1, telegramUserId: 999n, orderStatus: 'submitted', paymentStatus: 'pending', subtotalAmount: 1, totalAmount: 1 } })
    const token = await customerToken()
    const res = await app.inject({ method: 'GET', url: `/api/miniapp/orders/${other.id}`, headers: auth(token) })
    expect(res.statusCode).toBe(404)
  })

  it('cancel order confirmed → ajukan pembatalan (requested)', async () => {
    // DD-1 sudah confirmed + ada request pending; buat order confirmed baru tanpa request
    const o = await prisma.order.create({ data: { orderCode: 'DD-C', preOrderId: 1, telegramUserId: 111n, orderStatus: 'confirmed', paymentStatus: 'pending', subtotalAmount: 1, totalAmount: 1 } })
    const token = await customerToken()
    const res = await app.inject({ method: 'POST', url: `/api/miniapp/orders/${o.id}/cancel`, headers: auth(token) })
    expect(res.statusCode).toBe(200)
    expect(data(res)).toMatchObject({ requested: true })
    const updated = await prisma.order.findUnique({ where: { id: o.id } })
    expect(updated?.cancelRequested).toBe(true)
  })

  it('cancel order submitted → batal langsung (cancelled)', async () => {
    const o = await prisma.order.create({ data: { orderCode: 'DD-S', preOrderId: 1, telegramUserId: 111n, orderStatus: 'submitted', paymentStatus: 'pending', subtotalAmount: 1, totalAmount: 1 } })
    const token = await customerToken()
    const res = await app.inject({ method: 'POST', url: `/api/miniapp/orders/${o.id}/cancel`, headers: auth(token) })
    expect(res.statusCode).toBe(200)
    expect(data(res)).toMatchObject({ status: 'cancelled', requested: false })
  })
})
