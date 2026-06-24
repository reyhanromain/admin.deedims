import type { Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { prisma } from '../db'

export class BotBusinessError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
  }
}

export type TelegramCustomer = {
  id: bigint
  username?: string
  name?: string
}

const variantInclude = {
  menu: true,
  stockUsages: { include: { stockItem: true } },
} satisfies Prisma.MenuVariantInclude

const cartInclude = {
  menu: true,
  variant: { include: { stockUsages: { include: { stockItem: true } } } },
} satisfies Prisma.CartItemInclude

export type CartRow = Prisma.CartItemGetPayload<{ include: typeof cartInclude }>

export async function ensureCustomer(user: TelegramCustomer) {
  const customer = await prisma.customer.upsert({
    where: { telegramUserId: user.id },
    create: {
      telegramUserId: user.id,
      username: user.username ?? null,
      name: user.name ?? null,
      joinedAt: new Date(),
    },
    update: { username: user.username ?? null, name: user.name ?? null },
  })
  if (customer.blocked) throw new BotBusinessError('CUSTOMER_BLOCKED', 'Akun kakak sedang tidak dapat melakukan pemesanan.')
  return customer
}

export async function setting(label: string, fallback: string) {
  return (await prisma.setting.findUnique({ where: { label } }))?.value || fallback
}

export async function openPreOrder() {
  return prisma.preOrder.findFirst({ where: { status: 'open' }, orderBy: { openedAt: 'desc' } })
}

export async function listOrderableMenus() {
  const preOrder = await openPreOrder()
  if (!preOrder) return { preOrder: null, menus: [] }
  const candidates = await prisma.menu.findMany({
    where: { isActive: true },
    include: {
      variants: {
        where: { isActive: true },
        include: { stockUsages: { include: { stockItem: true } } },
        orderBy: { id: 'asc' },
      },
      addonLinks: {
        where: { isActive: true },
        include: { addonMenu: { include: { variants: { where: { isActive: true }, include: { stockUsages: { include: { stockItem: true } } } } } } },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { id: 'asc' },
  })
  const menus = candidates.filter((menu) => {
    const freeVariants = Array.from(new Map(menu.addonLinks
      .filter((link) => link.isFree && link.addonMenu.isActive && link.addonMenu.variants.length === 1)
      .map((link) => [link.addonMenuId, link.addonMenu.variants[0]])).values())
    const freeConfigurationValid = menu.addonLinks
      .filter((link) => link.isFree)
      .every((link) => link.addonMenu.isActive && link.addonMenu.variants.length === 1)
    return freeConfigurationValid && menu.variants.some((variant) => variantsFitAvailableStock([variant, ...freeVariants]))
  })
  return { preOrder, menus }
}

type StockedVariant = {
  stockUsages: Array<{ stockItemId: number; quantity: number; stockItem: { quantity: number; isActive: boolean } }>
}

function variantsFitAvailableStock(variants: StockedVariant[]) {
  const required = new Map<number, { quantity: number; available: number; active: boolean }>()
  for (const variant of variants) for (const usage of variant.stockUsages) {
    const current = required.get(usage.stockItemId)
    required.set(usage.stockItemId, {
      quantity: (current?.quantity ?? 0) + usage.quantity,
      available: usage.stockItem.quantity,
      active: usage.stockItem.isActive,
    })
  }
  return Array.from(required.values()).every((row) => row.active && row.available >= row.quantity)
}

export async function listAutomaticFreeAddonVariants(menuId: number) {
  const links = await prisma.menuAddon.findMany({
    where: { menuId, isFree: true, isActive: true },
    include: { addonMenu: { include: { variants: { where: { isActive: true }, include: variantInclude, orderBy: { id: 'asc' } } } } },
    orderBy: { sortOrder: 'asc' },
  })
  const variants = [] as Array<Prisma.MenuVariantGetPayload<{ include: typeof variantInclude }>>
  const seenMenus = new Set<number>()
  for (const link of links) {
    if (seenMenus.has(link.addonMenuId)) continue
    seenMenus.add(link.addonMenuId)
    if (!link.addonMenu.isActive || link.addonMenu.variants.length !== 1) {
      throw new BotBusinessError('FREE_ADDON_INVALID', `Pelengkap gratis ${link.addonMenu.name} harus memiliki tepat satu varian aktif.`)
    }
    variants.push(link.addonMenu.variants[0])
  }
  return variants
}

async function currentCartStock(telegramUserId: bigint) {
  const rows = await prisma.cartItem.findMany({
    where: { telegramUserId },
    include: { variant: { include: { stockUsages: true } } },
  })
  const totals = new Map<number, number>()
  for (const row of rows) {
    for (const usage of row.variant.stockUsages) {
      totals.set(usage.stockItemId, (totals.get(usage.stockItemId) ?? 0) + usage.quantity * row.quantity)
    }
  }
  return totals
}

export async function maxAddableQuantity(telegramUserId: bigint, variantId: number) {
  const variant = await prisma.menuVariant.findUnique({ where: { id: variantId }, include: variantInclude })
  if (!variant?.isActive || !variant.menu.isActive) return 0
  const freeAddons = await listAutomaticFreeAddonVariants(variant.menuId)
  return capacityForVariants(telegramUserId, [variant, ...freeAddons])
}

type AddCartInput = {
  telegramUserId: bigint
  variantId: number
  quantity: number
  addonVariantId?: number
}

export async function addToCart(input: AddCartInput) {
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 99) {
    throw new BotBusinessError('INVALID_QUANTITY', 'Quantity tidak valid.')
  }
  if (!await openPreOrder()) throw new BotBusinessError('PREORDER_CLOSED', 'Pre-order sudah tidak dibuka.')
  const main = await prisma.menuVariant.findUnique({ where: { id: input.variantId }, include: variantInclude })
  if (!main?.isActive || !main.menu.isActive) {
    throw new BotBusinessError('MENU_INVALID', 'Menu sudah tidak tersedia.')
  }
  let addon: Prisma.MenuVariantGetPayload<{ include: typeof variantInclude }> | null = null
  if (input.addonVariantId) {
    addon = await prisma.menuVariant.findUnique({ where: { id: input.addonVariantId }, include: variantInclude })
    if (!addon?.isActive || !addon.menu.isActive || !addon.menu.isAddon) {
      throw new BotBusinessError('ADDON_INVALID', 'Add-on sudah tidak tersedia.')
    }
    const link = await prisma.menuAddon.findFirst({
      where: { menuId: main.menuId, addonMenuId: addon.menuId, isActive: true, isFree: false },
    })
    if (!link) throw new BotBusinessError('ADDON_INVALID', 'Add-on tidak berlaku untuk menu ini.')
  }

  const freeAddons = await listAutomaticFreeAddonVariants(main.menuId)

  const capacity = await capacityForVariants(input.telegramUserId, [main, ...freeAddons, ...(addon ? [addon] : [])])
  if (capacity < input.quantity) throw new BotBusinessError('STOCK_INSUFFICIENT', 'Stock tidak cukup untuk quantity tersebut.')

  return prisma.$transaction(async (tx) => {
    const parent = await tx.cartItem.create({
      data: {
        telegramUserId: input.telegramUserId,
        itemType: 'main',
        menuId: main!.menuId,
        menuVariantId: main!.id,
        menuNameSnapshot: main!.menu.name,
        variantNameSnapshot: visibleVariantName(main!.name),
        unitPrice: main!.price,
        quantity: input.quantity,
      },
    })
    for (const freeAddon of freeAddons) {
      await tx.cartItem.create({
        data: {
          telegramUserId: input.telegramUserId,
          parentCartItemId: parent.id,
          itemType: 'addon',
          isFree: true,
          menuId: freeAddon.menuId,
          menuVariantId: freeAddon.id,
          menuNameSnapshot: freeAddon.menu.name,
          variantNameSnapshot: visibleVariantName(freeAddon.name),
          unitPrice: 0,
          quantity: input.quantity,
        },
      })
    }
    if (addon) await tx.cartItem.create({
      data: {
        telegramUserId: input.telegramUserId,
      parentCartItemId: parent.id,
      itemType: 'addon',
      isFree: false,
        menuId: addon.menuId,
        menuVariantId: addon.id,
        menuNameSnapshot: addon.menu.name,
        variantNameSnapshot: visibleVariantName(addon.name),
        unitPrice: addon.price,
        quantity: input.quantity,
      },
    })
    return parent
  })
}

async function capacityForVariants(
  telegramUserId: bigint,
  variants: Array<Prisma.MenuVariantGetPayload<{ include: typeof variantInclude }>>,
) {
  const used = await currentCartStock(telegramUserId)
  const needed = new Map<number, { perUnit: number; available: number }>()
  for (const variant of variants) {
    for (const usage of variant.stockUsages) {
      if (!usage.stockItem.isActive) return 0
      const current = needed.get(usage.stockItemId)
      needed.set(usage.stockItemId, {
        perUnit: (current?.perUnit ?? 0) + usage.quantity,
        available: usage.stockItem.quantity - (used.get(usage.stockItemId) ?? 0),
      })
    }
  }
  if (needed.size === 0) return 99
  return Math.max(0, Math.min(...Array.from(needed.values()).map((x) => Math.floor(x.available / x.perUnit))))
}

export async function getCart(telegramUserId: bigint) {
  const rows = await prisma.cartItem.findMany({ where: { telegramUserId }, include: cartInclude, orderBy: { id: 'asc' } })
  return summarizeCart(rows)
}

export function summarizeCart(rows: CartRow[]) {
  const stock = new Map<number, { name: string; unit: string | null; required: number; available: number }>()
  let total = 0
  for (const row of rows) {
    total += row.unitPrice * row.quantity
    for (const usage of row.variant.stockUsages) {
      const current = stock.get(usage.stockItemId)
      stock.set(usage.stockItemId, {
        name: usage.stockItem.name,
        unit: usage.stockItem.unit,
        required: (current?.required ?? 0) + usage.quantity * row.quantity,
        available: usage.stockItem.quantity,
      })
    }
  }
  const main = rows.filter((row) => row.itemType === 'main').map((row) => ({
    ...row,
    addons: rows.filter((candidate) => candidate.parentCartItemId === row.id),
  }))
  return { rows, main, total, stock: Array.from(stock.values()), stockSufficient: Array.from(stock.values()).every((x) => x.required <= x.available) }
}

export async function deleteCartItem(telegramUserId: bigint, cartItemId: number) {
  const item = await prisma.cartItem.findFirst({ where: { id: cartItemId, telegramUserId, itemType: 'main' } })
  if (!item) throw new BotBusinessError('CART_ITEM_NOT_FOUND', 'Item keranjang tidak ditemukan.')
  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { telegramUserId, parentCartItemId: item.id } }),
    prisma.cartItem.delete({ where: { id: item.id } }),
  ])
}

export async function clearCart(telegramUserId: bigint) {
  return prisma.cartItem.deleteMany({ where: { telegramUserId } })
}

export async function checkout(customer: TelegramCustomer) {
  await ensureCustomer(customer)
  return prisma.$transaction(async (tx) => {
    const preOrder = await tx.preOrder.findFirst({ where: { status: 'open' }, orderBy: { openedAt: 'desc' } })
    if (!preOrder) throw new BotBusinessError('PREORDER_CLOSED', 'Pre-order sudah tidak dibuka.')
    const rows = await tx.cartItem.findMany({ where: { telegramUserId: customer.id }, include: cartInclude, orderBy: { id: 'asc' } })
    if (!rows.length) throw new BotBusinessError('CART_EMPTY', 'Keranjang masih kosong.')
    const effectivePrices = await validateCartRows(tx, rows)

    const summary = summarizeCart(rows)
    if (!summary.stockSufficient) throw new BotBusinessError('STOCK_INSUFFICIENT', 'Stock untuk isi keranjang tidak mencukupi.')
    const currentTotal = rows.reduce((total, row) => total + (effectivePrices.get(row.id) ?? row.variant.price) * row.quantity, 0)
    const order = await tx.order.create({
      data: {
        orderCode: orderCode(customer.id),
        preOrderId: preOrder.id,
        telegramUserId: customer.id,
        telegramUsername: customer.username ?? null,
        customerName: customer.name ?? null,
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        orderStatus: 'submitted',
        subtotalAmount: currentTotal,
        totalAmount: currentTotal,
        submittedAt: new Date(),
      },
    })

    const orderItemByCartId = new Map<number, number>()
    let sortOrder = 0
    for (const row of rows) {
      const created = await tx.orderItem.create({
        data: {
          orderId: order.id,
          parentOrderItemId: row.parentCartItemId ? orderItemByCartId.get(row.parentCartItemId) ?? null : null,
          menuId: row.menuId,
          menuVariantId: row.menuVariantId,
          menuNameSnapshot: row.menu.name,
          variantNameSnapshot: visibleVariantName(row.variant.name),
          unitPrice: effectivePrices.get(row.id) ?? row.variant.price,
          quantity: row.quantity,
          lineTotal: (effectivePrices.get(row.id) ?? row.variant.price) * row.quantity,
          sortOrder: sortOrder++,
        },
      })
      orderItemByCartId.set(row.id, created.id)
      if (row.variant.stockUsages.length) {
        await tx.orderItemStockUsage.createMany({
          data: row.variant.stockUsages.map((usage) => ({
            orderItemId: created.id,
            stockItemId: usage.stockItemId,
            quantity: usage.quantity * row.quantity,
          })),
        })
      }
    }

    for (const [stockItemId, usage] of aggregateStock(rows)) {
      const result = await tx.stockItem.updateMany({ where: { id: stockItemId, quantity: { gte: usage } }, data: { quantity: { decrement: usage } } })
      if (result.count !== 1) throw new BotBusinessError('STOCK_INSUFFICIENT', 'Stock berubah dan tidak lagi mencukupi.')
    }
    await tx.cartItem.deleteMany({ where: { telegramUserId: customer.id } })
    return order
  })
}

export type SubmitOrderItem = {
  variantId: number
  quantity: number
  addonVariantIds?: number[]
}

export type SubmitOrderMeta = {
  name?: string
  phone?: string
  method?: string
  note?: string
}

/** Versi tx-aware dari free add-on otomatis (tepat 1 varian aktif per menu pelengkap gratis). */
async function freeAddonVariantsTx(tx: Prisma.TransactionClient, menuId: number) {
  const links = await tx.menuAddon.findMany({
    where: { menuId, isFree: true, isActive: true },
    include: { addonMenu: { include: { variants: { where: { isActive: true }, include: variantInclude, orderBy: { id: 'asc' } } } } },
    orderBy: { sortOrder: 'asc' },
  })
  const variants: Array<Prisma.MenuVariantGetPayload<{ include: typeof variantInclude }>> = []
  const seen = new Set<number>()
  for (const link of links) {
    if (seen.has(link.addonMenuId)) continue
    seen.add(link.addonMenuId)
    if (!link.addonMenu.isActive || link.addonMenu.variants.length !== 1) {
      throw new BotBusinessError('FREE_ADDON_INVALID', `Pelengkap gratis ${link.addonMenu.name} harus memiliki tepat satu varian aktif.`)
    }
    variants.push(link.addonMenu.variants[0])
  }
  return variants
}

/**
 * Buat order langsung dari daftar item (mini app menyimpan cart di sisi klien).
 * Mirip {@link checkout} tapi sumbernya payload, bukan tabel CartItem: harga
 * dihitung ulang dari DB (tidak mempercayai klien), free add-on dilampirkan
 * otomatis, stok divalidasi & dipotong atomik dalam satu transaksi.
 */
export async function submitOrder(customer: TelegramCustomer, items: SubmitOrderItem[], meta: SubmitOrderMeta = {}) {
  await ensureCustomer(customer)
  if (!items.length) throw new BotBusinessError('CART_EMPTY', 'Keranjang masih kosong.')
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw new BotBusinessError('INVALID_QUANTITY', 'Quantity tidak valid.')
    }
  }

  return prisma.$transaction(async (tx) => {
    const preOrder = await tx.preOrder.findFirst({ where: { status: 'open' }, orderBy: { openedAt: 'desc' } })
    if (!preOrder) throw new BotBusinessError('PREORDER_CLOSED', 'Pre-order sudah tidak dibuka.')

    type ResolvedVariant = Prisma.MenuVariantGetPayload<{ include: typeof variantInclude }>
    type ResolvedItem = { main: ResolvedVariant; quantity: number; addons: Array<{ variant: ResolvedVariant; isFree: boolean }> }

    const resolved: ResolvedItem[] = []
    const stockNeeded = new Map<number, number>()
    const requireStock = (variant: ResolvedVariant, quantity: number) => {
      for (const usage of variant.stockUsages) {
        if (!usage.stockItem.isActive) throw new BotBusinessError('STOCK_INSUFFICIENT', 'Stock untuk isi keranjang tidak mencukupi.')
        stockNeeded.set(usage.stockItemId, (stockNeeded.get(usage.stockItemId) ?? 0) + usage.quantity * quantity)
      }
    }

    for (const item of items) {
      const main = await tx.menuVariant.findUnique({ where: { id: item.variantId }, include: variantInclude })
      if (!main?.isActive || !main.menu.isActive || main.menu.isAddon) {
        throw new BotBusinessError('MENU_INVALID', 'Menu sudah tidak tersedia.')
      }
      const addons: ResolvedItem['addons'] = []
      const seenAddonMenus = new Set<number>()
      for (const addonVariantId of Array.from(new Set(item.addonVariantIds ?? []))) {
        const addon = await tx.menuVariant.findUnique({ where: { id: addonVariantId }, include: variantInclude })
        if (!addon?.isActive || !addon.menu.isActive || !addon.menu.isAddon) {
          throw new BotBusinessError('ADDON_INVALID', 'Add-on sudah tidak tersedia.')
        }
        const link = await tx.menuAddon.findFirst({ where: { menuId: main.menuId, addonMenuId: addon.menuId, isActive: true, isFree: false } })
        if (!link) throw new BotBusinessError('ADDON_INVALID', 'Add-on tidak berlaku untuk menu ini.')
        if (seenAddonMenus.has(addon.menuId)) continue
        seenAddonMenus.add(addon.menuId)
        addons.push({ variant: addon, isFree: false })
      }
      for (const free of await freeAddonVariantsTx(tx, main.menuId)) addons.push({ variant: free, isFree: true })

      requireStock(main, item.quantity)
      for (const addon of addons) requireStock(addon.variant, item.quantity)
      resolved.push({ main, quantity: item.quantity, addons })
    }

    for (const [stockItemId, quantity] of stockNeeded) {
      const result = await tx.stockItem.updateMany({ where: { id: stockItemId, quantity: { gte: quantity } }, data: { quantity: { decrement: quantity } } })
      if (result.count !== 1) throw new BotBusinessError('STOCK_INSUFFICIENT', 'Stock berubah dan tidak lagi mencukupi.')
    }

    const total = resolved.reduce((sum, item) => {
      const addonsUnit = item.addons.reduce((value, addon) => value + (addon.isFree ? 0 : addon.variant.price), 0)
      return sum + (item.main.price + addonsUnit) * item.quantity
    }, 0)

    const order = await tx.order.create({
      data: {
        orderCode: orderCode(customer.id),
        preOrderId: preOrder.id,
        telegramUserId: customer.id,
        telegramUsername: customer.username ?? null,
        customerName: meta.name?.trim() || customer.name || null,
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        orderStatus: 'submitted',
        subtotalAmount: total,
        totalAmount: total,
        notes: composeOrderNotes(meta),
        submittedAt: new Date(),
      },
    })

    let sortOrder = 0
    for (const item of resolved) {
      const main = await tx.orderItem.create({
        data: {
          orderId: order.id,
          menuId: item.main.menuId,
          menuVariantId: item.main.id,
          menuNameSnapshot: item.main.menu.name,
          variantNameSnapshot: visibleVariantName(item.main.name),
          unitPrice: item.main.price,
          quantity: item.quantity,
          lineTotal: item.main.price * item.quantity,
          sortOrder: sortOrder++,
        },
      })
      if (item.main.stockUsages.length) {
        await tx.orderItemStockUsage.createMany({
          data: item.main.stockUsages.map((usage) => ({ orderItemId: main.id, stockItemId: usage.stockItemId, quantity: usage.quantity * item.quantity })),
        })
      }
      for (const addon of item.addons) {
        const unitPrice = addon.isFree ? 0 : addon.variant.price
        const created = await tx.orderItem.create({
          data: {
            orderId: order.id,
            parentOrderItemId: main.id,
            menuId: addon.variant.menuId,
            menuVariantId: addon.variant.id,
            menuNameSnapshot: addon.variant.menu.name,
            variantNameSnapshot: visibleVariantName(addon.variant.name),
            unitPrice,
            quantity: item.quantity,
            lineTotal: unitPrice * item.quantity,
            sortOrder: sortOrder++,
          },
        })
        if (addon.variant.stockUsages.length) {
          await tx.orderItemStockUsage.createMany({
            data: addon.variant.stockUsages.map((usage) => ({ orderItemId: created.id, stockItemId: usage.stockItemId, quantity: usage.quantity * item.quantity })),
          })
        }
      }
    }

    // Bersihkan cart bot (kalau ada) agar konsisten dengan checkout via bot.
    await tx.cartItem.deleteMany({ where: { telegramUserId: customer.id } })
    return order
  })
}

/** Susun catatan order dari data checkout mini app (no. WA, metode ambil, catatan). */
function composeOrderNotes(meta: SubmitOrderMeta) {
  const lines: string[] = []
  if (meta.phone?.trim()) lines.push(`WA: ${meta.phone.trim()}`)
  if (meta.method) lines.push(`Metode: ${meta.method === 'pickup' ? 'Pickup' : 'COD'}`)
  if (meta.note?.trim()) lines.push(meta.note.trim())
  return lines.length ? lines.join('\n') : null
}

export async function checkoutPreview(telegramUserId: bigint) {
  return prisma.$transaction(async (tx) => {
    const preOrder = await tx.preOrder.findFirst({ where: { status: 'open' } })
    if (!preOrder) throw new BotBusinessError('PREORDER_CLOSED', 'Pre-order sudah tidak dibuka.')
    const rows = await tx.cartItem.findMany({ where: { telegramUserId }, include: cartInclude, orderBy: { id: 'asc' } })
    if (!rows.length) throw new BotBusinessError('CART_EMPTY', 'Keranjang masih kosong.')
    const effectivePrices = await validateCartRows(tx, rows)
    const summary = summarizeCart(rows)
    if (!summary.stockSufficient) throw new BotBusinessError('STOCK_INSUFFICIENT', 'Stock untuk isi keranjang tidak mencukupi.')
    const total = rows.reduce((value, row) => value + (effectivePrices.get(row.id) ?? row.variant.price) * row.quantity, 0)
    return { total, priceChanged: rows.some((row) => row.unitPrice !== (effectivePrices.get(row.id) ?? row.variant.price)) }
  })
}

async function validateCartRows(tx: Prisma.TransactionClient, rows: CartRow[]) {
  const mainMenuIds = new Set(rows.filter((row) => row.itemType === 'main').map((row) => row.menuId))
  const effectivePrices = new Map<number, number>()
  for (const row of rows) {
    if (!row.menu.isActive || !row.variant.isActive || row.variant.menuId !== row.menuId) {
      throw new BotBusinessError('CART_INVALID', `${row.menuNameSnapshot} sudah tidak tersedia.`)
    }
    if (row.itemType === 'addon') {
      const parent = rows.find((candidate) => candidate.id === row.parentCartItemId && candidate.itemType === 'main')
      const link = parent ? await tx.menuAddon.findFirst({ where: { menuId: parent.menuId, addonMenuId: row.menuId, isActive: true, isFree: row.isFree } }) : null
      if (!parent || !mainMenuIds.has(parent.menuId) || !link) {
        throw new BotBusinessError('CART_INVALID', `Add-on ${row.menuNameSnapshot} sudah tidak berlaku.`)
      }
      effectivePrices.set(row.id, row.isFree ? 0 : row.variant.price)
    } else {
      effectivePrices.set(row.id, row.variant.price)
    }
  }
  return effectivePrices
}

function aggregateStock(rows: CartRow[]) {
  const totals = new Map<number, number>()
  for (const row of rows) for (const usage of row.variant.stockUsages) {
    totals.set(usage.stockItemId, (totals.get(usage.stockItemId) ?? 0) + usage.quantity * row.quantity)
  }
  return totals
}

export async function listCustomerOrders(telegramUserId: bigint, page: number, limit: number) {
  const where = { telegramUserId }
  const total = await prisma.order.count({ where })
  const rows = await prisma.order.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit })
  return { rows, total, pages: Math.max(1, Math.ceil(total / limit)) }
}

export async function customerOrderDetail(telegramUserId: bigint, orderId: number) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, telegramUserId },
    include: { preOrder: true, items: { orderBy: { sortOrder: 'asc' } } },
  })
  if (!order) throw new BotBusinessError('ORDER_NOT_FOUND', 'Order tidak ditemukan.')
  return order
}

export async function cancelSubmittedOrder(telegramUserId: bigint, orderId: number) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, telegramUserId },
      include: { items: { include: { stockUsages: true } } },
    })
    if (!order) throw new BotBusinessError('ORDER_NOT_FOUND', 'Order tidak ditemukan.')
    if (order.orderStatus !== 'submitted') throw new BotBusinessError('ORDER_NOT_CANCELLABLE', 'Order ini tidak dapat dibatalkan langsung.')
    await restoreOrderStock(tx, order.items)
    return tx.order.update({ where: { id: order.id }, data: { orderStatus: 'cancelled', paymentStatus: 'cancelled', cancelledAt: new Date() } })
  })
}

export async function requestOrderCancellation(telegramUserId: bigint, orderId: number) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, telegramUserId } })
    if (!order) throw new BotBusinessError('ORDER_NOT_FOUND', 'Order tidak ditemukan.')
    if (order.orderStatus !== 'confirmed') throw new BotBusinessError('ORDER_NOT_CANCELLABLE', 'Order ini tidak dapat mengajukan pembatalan.')
    const existing = await tx.orderCancellationRequest.findFirst({ where: { orderId, status: 'pending' } })
    if (!existing) await tx.orderCancellationRequest.create({ data: { orderId, status: 'pending' } })
    await tx.order.update({ where: { id: orderId }, data: { cancelRequested: true } })
    return { alreadyRequested: Boolean(existing) }
  })
}

export async function approveOrderCancellation(orderId: number, reviewerId: number) {
  return prisma.$transaction(async (tx) => {
    const pending = await tx.orderCancellationRequest.findFirst({ where: { orderId, status: 'pending' } })
    if (!pending) throw new BotBusinessError('CANCELLATION_NOT_FOUND', 'Tidak ada permintaan pembatalan pending.')
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: { include: { stockUsages: true } } } })
    await restoreOrderStock(tx, order.items)
    const now = new Date()
    await tx.orderCancellationRequest.update({ where: { id: pending.id }, data: { status: 'approved', reviewedById: reviewerId, reviewedAt: now } })
    return tx.order.update({ where: { id: orderId }, data: { orderStatus: 'cancelled', paymentStatus: 'cancelled', cancelRequested: false, cancelledAt: now } })
  })
}

export async function cancelOrderByAdmin(orderId: number) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: { include: { stockUsages: true } } } })
    if (order.orderStatus !== 'cancelled') await restoreOrderStock(tx, order.items)
    return tx.order.update({ where: { id: orderId }, data: { orderStatus: 'cancelled', paymentStatus: 'cancelled', cancelRequested: false, cancelledAt: new Date() } })
  })
}

async function restoreOrderStock(tx: Prisma.TransactionClient, items: Array<{ stockUsages: Array<{ stockItemId: number; quantity: number }> }>) {
  const totals = new Map<number, number>()
  for (const item of items) for (const usage of item.stockUsages) totals.set(usage.stockItemId, (totals.get(usage.stockItemId) ?? 0) + usage.quantity)
  for (const [id, quantity] of totals) await tx.stockItem.update({ where: { id }, data: { quantity: { increment: quantity } } })
}

export async function reorderCompleted(telegramUserId: bigint, orderId: number) {
  const order = await customerOrderDetail(telegramUserId, orderId)
  if (order.orderStatus !== 'completed') throw new BotBusinessError('ORDER_NOT_REORDERABLE', 'Order ini belum dapat dipesan ulang.')
  if (!await openPreOrder()) throw new BotBusinessError('PREORDER_CLOSED', 'Pre-order belum dibuka.')
  const mains = order.items.filter((item) => item.parentOrderItemId == null)
  let added = 0
  let filtered = 0
  let priceChanged = false
  for (const main of mains) {
    if (!main.menuVariantId) { filtered++; continue }
    const addon = order.items.find((item) => item.parentOrderItemId === main.id && item.unitPrice > 0)
    const current = await prisma.menuVariant.findUnique({ where: { id: main.menuVariantId } })
    if (!current) { filtered++; continue }
    priceChanged ||= current.price !== main.unitPrice
    try {
      await addToCart({ telegramUserId, variantId: main.menuVariantId, quantity: main.quantity, addonVariantId: addon?.menuVariantId ?? undefined })
      added++
    } catch (error) {
      if (error instanceof BotBusinessError) filtered++
      else throw error
    }
  }
  if (!added) throw new BotBusinessError('REORDER_EMPTY', 'Tidak ada item lama yang masih dapat dipesan.')
  return { added, filtered, priceChanged }
}

export async function subscribeReminder(user: TelegramCustomer) {
  const existing = await prisma.reminderSubscriber.findUnique({ where: { telegramUserId: user.id } })
  if (existing?.isActive) return { alreadyActive: true }
  await prisma.reminderSubscriber.upsert({
    where: { telegramUserId: user.id },
    create: { telegramUserId: user.id, telegramUsername: user.username ?? null, isActive: true },
    update: { telegramUsername: user.username ?? null, isActive: true, unsubscribedAt: null },
  })
  return { alreadyActive: false }
}

export async function unsubscribeReminder(telegramUserId: bigint) {
  const existing = await prisma.reminderSubscriber.findUnique({ where: { telegramUserId } })
  if (!existing?.isActive) return { wasActive: false }
  await prisma.reminderSubscriber.update({ where: { telegramUserId }, data: { isActive: false, unsubscribedAt: new Date() } })
  return { wasActive: true }
}

export function visibleVariantName(name: string | null) {
  return !name || name === '(default)' ? null : name
}

function orderCode(userId: bigint) {
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(2, 14)
  const tail = userId.toString().slice(-4).padStart(4, '0')
  return `DD-${stamp}-${tail}${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
}
