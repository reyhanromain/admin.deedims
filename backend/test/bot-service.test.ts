import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from './helpers'
import {
  addToCart,
  cancelSubmittedOrder,
  checkout,
  checkoutPreview,
  clearCart,
  customerOrderDetail,
  getCart,
  listCustomerOrders,
  listOrderableMenus,
  maxAddableQuantity,
  reorderCompleted,
  requestOrderCancellation,
  subscribeReminder,
  unsubscribeReminder,
} from '../src/bot/service'

const user = { id: 222n, username: 'budi', name: 'Budi' }

async function variants() {
  const main = await prisma.menuVariant.findFirstOrThrow({ where: { menuId: 1 } })
  const addon = await prisma.menuVariant.findFirstOrThrow({ where: { menuId: 2 } })
  return { main, addon }
}

beforeEach(resetDb)

describe('bot ordering domain', () => {
  it('menampilkan hanya menu orderable saat PO open', async () => {
    const result = await listOrderableMenus()
    expect(result.preOrder?.id).toBe(1)
    expect(result.menus.map((menu) => menu.name)).toEqual(['Menu A'])

    await prisma.stockItem.update({ where: { id: 1 }, data: { quantity: 1 } })
    expect((await listOrderableMenus()).menus).toHaveLength(0)
  })

  it('capacity memperhitungkan stock yang sudah dipakai cart user', async () => {
    const { main } = await variants()
    expect(await maxAddableQuantity(user.id, main.id)).toBe(25)
    await addToCart({ telegramUserId: user.id, variantId: main.id, quantity: 3 })
    expect(await maxAddableQuantity(user.id, main.id)).toBe(22)
  })

  it('menambah main item dan add-on dengan quantity mengikuti main', async () => {
    const { main, addon } = await variants()
    await addToCart({ telegramUserId: user.id, variantId: main.id, addonVariantId: addon.id, quantity: 2 })
    const cart = await getCart(user.id)
    expect(cart.main).toHaveLength(1)
    expect(cart.main[0].quantity).toBe(2)
    expect(cart.main[0].addons[0]).toMatchObject({ quantity: 2, itemType: 'addon' })
    expect(cart.total).toBe(30000)
  })

  it('menambahkan free complement otomatis dan tetap mendukung paid add-on yang sama', async () => {
    const { main, addon } = await variants()
    await prisma.menuAddon.create({ data: { menuId: 1, addonMenuId: 2, isFree: true } })

    expect(await maxAddableQuantity(user.id, main.id)).toBe(5)
    await addToCart({ telegramUserId: user.id, variantId: main.id, addonVariantId: addon.id, quantity: 2 })

    const cart = await getCart(user.id)
    expect(cart.main[0].addons).toHaveLength(2)
    expect(cart.main[0].addons.map((item) => item.unitPrice)).toEqual([0, 5000])
    expect(cart.main[0].addons.map((item) => item.quantity)).toEqual([2, 2])
    expect(cart.total).toBe(30000)
    expect(await maxAddableQuantity(user.id, main.id)).toBe(1)
  })

  it('menu tidak orderable jika stock free complement tidak tersedia', async () => {
    await prisma.menuAddon.create({ data: { menuId: 1, addonMenuId: 2, isFree: true } })
    await prisma.stockItem.update({ where: { id: 2 }, data: { quantity: 0 } })
    expect((await listOrderableMenus()).menus).toHaveLength(0)
  })

  it('checkout atomik membuat order snapshot, mengurangi stock, dan mengosongkan cart', async () => {
    const { main, addon } = await variants()
    await addToCart({ telegramUserId: user.id, variantId: main.id, addonVariantId: addon.id, quantity: 2 })
    const order = await checkout(user)

    expect(order).toMatchObject({ preOrderId: 1, totalAmount: 30000, orderStatus: 'submitted', paymentMethod: 'cod' })
    expect(await prisma.cartItem.count({ where: { telegramUserId: user.id } })).toBe(0)
    expect((await prisma.stockItem.findUniqueOrThrow({ where: { id: 1 } })).quantity).toBe(46)
    expect((await prisma.stockItem.findUniqueOrThrow({ where: { id: 2 } })).quantity).toBe(3)
    expect(await prisma.orderItem.count({ where: { orderId: order.id } })).toBe(2)
    expect(await prisma.orderItemStockUsage.count()).toBe(2)
  })

  it('checkout menghitung ulang harga terkini dan tidak menagih add-on gratis', async () => {
    const { main } = await variants()
    await prisma.menuAddon.create({ data: { menuId: 1, addonMenuId: 2, isFree: true } })
    await addToCart({ telegramUserId: user.id, variantId: main.id, quantity: 1 })
    expect((await getCart(user.id)).total).toBe(10000)
    await prisma.menuVariant.update({ where: { id: main.id }, data: { price: 12000 } })
    expect(await checkoutPreview(user.id)).toEqual({ total: 12000, priceChanged: true })

    const order = await checkout(user)
    expect(order.totalAmount).toBe(12000)
    const items = await prisma.orderItem.findMany({ where: { orderId: order.id }, orderBy: { sortOrder: 'asc' } })
    expect(items.map((item) => item.unitPrice)).toEqual([12000, 0])
  })

  it('cancel submitted mengembalikan stock tepat sekali', async () => {
    const { main } = await variants()
    await addToCart({ telegramUserId: user.id, variantId: main.id, quantity: 2 })
    const order = await checkout(user)
    expect((await prisma.stockItem.findUniqueOrThrow({ where: { id: 1 } })).quantity).toBe(46)

    await cancelSubmittedOrder(user.id, order.id)
    expect((await prisma.stockItem.findUniqueOrThrow({ where: { id: 1 } })).quantity).toBe(50)
    await expect(cancelSubmittedOrder(user.id, order.id)).rejects.toMatchObject({ code: 'ORDER_NOT_CANCELLABLE' })
    expect((await prisma.stockItem.findUniqueOrThrow({ where: { id: 1 } })).quantity).toBe(50)
  })

  it('history/detail memvalidasi ownership dan cancellation request hanya untuk confirmed', async () => {
    const { main } = await variants()
    await addToCart({ telegramUserId: user.id, variantId: main.id, quantity: 1 })
    const order = await checkout(user)
    await prisma.order.update({ where: { id: order.id }, data: { orderStatus: 'confirmed' } })

    expect((await listCustomerOrders(user.id, 1, 5)).rows[0].id).toBe(order.id)
    expect((await customerOrderDetail(user.id, order.id)).orderCode).toBe(order.orderCode)
    await expect(customerOrderDetail(999n, order.id)).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' })
    expect(await requestOrderCancellation(user.id, order.id)).toEqual({ alreadyRequested: false })
    expect(await requestOrderCancellation(user.id, order.id)).toEqual({ alreadyRequested: true })
  })

  it('reorder completed memakai harga sekarang dan menyaring item invalid', async () => {
    const { main } = await variants()
    await addToCart({ telegramUserId: user.id, variantId: main.id, quantity: 1 })
    const order = await checkout(user)
    await prisma.order.update({ where: { id: order.id }, data: { orderStatus: 'completed' } })
    await prisma.menuVariant.update({ where: { id: main.id }, data: { price: 12000 } })

    const result = await reorderCompleted(user.id, order.id)
    expect(result).toEqual({ added: 1, filtered: 0, priceChanged: true })
    expect((await getCart(user.id)).total).toBe(12000)
  })

  it('subscribe/unsubscribe reminder idempotent', async () => {
    expect(await subscribeReminder(user)).toEqual({ alreadyActive: false })
    expect(await subscribeReminder(user)).toEqual({ alreadyActive: true })
    expect(await unsubscribeReminder(user.id)).toEqual({ wasActive: true })
    expect(await unsubscribeReminder(user.id)).toEqual({ wasActive: false })
  })

  it('clear cart hanya menghapus cart user terkait', async () => {
    const { main } = await variants()
    await addToCart({ telegramUserId: user.id, variantId: main.id, quantity: 1 })
    await addToCart({ telegramUserId: 333n, variantId: main.id, quantity: 1 })
    await clearCart(user.id)
    expect(await prisma.cartItem.count({ where: { telegramUserId: user.id } })).toBe(0)
    expect(await prisma.cartItem.count({ where: { telegramUserId: 333n } })).toBe(1)
  })
})
