import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { makeApp, resetDb, tokenFor, authH, prisma, data, meta } from './helpers'

let app: FastifyInstance
let token: string

beforeAll(async () => { app = await makeApp() })
afterAll(async () => { await app.close(); await prisma.$disconnect() })
beforeEach(async () => { await resetDb(); token = await tokenFor(app) })

describe('menus', () => {
  it('list ramping: variant {name,price,stockId,qty} (tanpa id/telegramFileId) + paginated', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/menus', headers: authH(token) })
    const a = data(res).find((m: { id: number }) => m.id === 1)
    expect(a.variants[0]).toEqual({ name: 'Reg', price: 10000, stockId: 1, qty: 2 })
    expect(a).not.toHaveProperty('telegramFileId')
    expect(a.addons).toEqual([2])
    expect(a.freeAddons).toEqual([])
    expect(meta(res)).toMatchObject({ page: 1, total: 2 })
  })

  it('create menu dengan variant + addon → 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/menus', headers: authH(token),
      payload: { name: 'Baru', basePrice: 9000, variants: [{ name: 'V', price: 9000, stockId: 1, qty: 1 }], addons: [2], freeAddons: [2] },
    })
    expect(res.statusCode).toBe(201)
    expect(data(res).variants[0]).toEqual({ name: 'V', price: 9000, stockId: 1, qty: 1 })
    expect(data(res).addons).toEqual([2])
    expect(data(res).freeAddons).toEqual([2])
    const links = await prisma.menuAddon.findMany({ where: { menuId: data(res).id, addonMenuId: 2 }, orderBy: { isFree: 'asc' } })
    expect(links.map((x) => x.isFree)).toEqual([false, true])
  })

  it('ganti imageUrl me-reset telegramFileId (aturan hybrid)', async () => {
    await prisma.menu.update({ where: { id: 1 }, data: { imageUrl: '/uploads/a.jpg', telegramFileId: 'CACHED' } })
    const res = await app.inject({
      method: 'PATCH', url: '/api/menus/1', headers: authH(token),
      payload: { name: 'Menu A', basePrice: 10000, imageUrl: '/uploads/b.jpg', variants: [{ name: 'Reg', price: 10000, stockId: 1, qty: 2 }], addons: [2] },
    })
    expect(data(res).imageUrl).toBe('/uploads/b.jpg')
    expect((await prisma.menu.findUniqueOrThrow({ where: { id: 1 } })).telegramFileId).toBeNull()
  })

  it('imageUrl sama → telegramFileId dipertahankan', async () => {
    await prisma.menu.update({ where: { id: 1 }, data: { imageUrl: '/uploads/a.jpg', telegramFileId: 'CACHED' } })
    await app.inject({
      method: 'PATCH', url: '/api/menus/1', headers: authH(token),
      payload: { name: 'Menu A', basePrice: 10000, imageUrl: '/uploads/a.jpg', variants: [{ name: 'Reg', price: 10000, stockId: 1, qty: 2 }], addons: [2] },
    })
    expect((await prisma.menu.findUniqueOrThrow({ where: { id: 1 } })).telegramFileId).toBe('CACHED')
  })

  it('patch mengganti variants & addons (tidak menumpuk)', async () => {
    await app.inject({
      method: 'PATCH', url: '/api/menus/1', headers: authH(token),
      payload: { name: 'Menu A', basePrice: 10000, variants: [{ name: 'Solo', price: 12000, stockId: 2, qty: 3 }], addons: [] },
    })
    const m = await prisma.menu.findUniqueOrThrow({ where: { id: 1 }, include: { variants: true, addonLinks: true } })
    expect(m.variants).toHaveLength(1)
    expect(m.variants[0].price).toBe(12000)
    expect(m.addonLinks).toHaveLength(0)
  })

  it('patch bisa menyimpan menu yang sama sebagai free dan add-on berbayar', async () => {
    const res = await app.inject({
      method: 'PATCH', url: '/api/menus/1', headers: authH(token),
      payload: { name: 'Menu A', basePrice: 10000, variants: [{ name: 'Reg', price: 10000, stockId: 1, qty: 2 }], addons: [2], freeAddons: [2] },
    })
    expect(data(res).addons).toEqual([2])
    expect(data(res).freeAddons).toEqual([2])
    const links = await prisma.menuAddon.findMany({ where: { menuId: 1, addonMenuId: 2 }, orderBy: { isFree: 'asc' } })
    expect(links.map((x) => x.isFree)).toEqual([false, true])
  })

  it('free add-on wajib memiliki tepat satu varian aktif', async () => {
    await prisma.menuVariant.create({ data: { menuId: 2, name: 'Extra', price: 7000 } })
    const res = await app.inject({
      method: 'PATCH', url: '/api/menus/1', headers: authH(token),
      payload: { name: 'Menu A', basePrice: 10000, variants: [{ name: 'Reg', price: 10000, stockId: 1, qty: 2 }], freeAddons: [2] },
    })
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body).error).toMatchObject({ code: 'FREE_ADDON_VARIANT_INVALID' })
  })

  it('pelengkap yang sedang dipakai sebagai free tidak boleh memiliki banyak varian', async () => {
    await prisma.menuAddon.create({ data: { menuId: 1, addonMenuId: 2, isFree: true } })
    const res = await app.inject({
      method: 'PATCH', url: '/api/menus/2', headers: authH(token),
      payload: { name: 'Addon B', basePrice: 5000, isAddon: true, variants: [{ name: 'A', price: 5000 }, { name: 'B', price: 6000 }] },
    })
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body).error).toMatchObject({ code: 'FREE_ADDON_VARIANT_INVALID' })
  })

  it('toggle → data {id,isActive}', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/menus/1/toggle', headers: authH(token) })
    expect(data(res)).toEqual({ id: 1, isActive: false })
  })

  it('create tanpa nama → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/menus', headers: authH(token), payload: { basePrice: 1 } })
    expect(res.statusCode).toBe(400)
  })
})
