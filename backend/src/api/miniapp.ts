import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { config } from '../config'
import { HttpError, ok, pageMeta } from '../lib/http'
import { parsePage } from '../lib/paginate'
import { validateInitData } from '../lib/telegramAuth'
import {
  BotBusinessError,
  cancelSubmittedOrder,
  customerOrderDetail,
  ensureCustomer,
  listOrderableMenus,
  requestOrderCancellation,
  submitOrder,
  visibleVariantName,
  type SubmitOrderItem,
} from '../bot/service'

/** Petakan error bisnis bot ke status HTTP yang sesuai untuk envelope. */
function mapBotError(error: unknown): never {
  if (error instanceof BotBusinessError) {
    const status =
      error.code === 'CUSTOMER_BLOCKED' ? 403 :
      error.code === 'ORDER_NOT_FOUND' ? 404 :
      error.code === 'INVALID_QUANTITY' || error.code === 'CART_EMPTY' ? 400 :
      409
    throw new HttpError(status, error.message, error.code)
  }
  throw error
}

const idOf = (req: { params: unknown }) => Number((req.params as { id: string }).id)

const authSchema = z.object({
  initData: z.string().optional(),
  devUserId: z.union([z.string(), z.number()]).optional(),
  name: z.string().optional(),
})

const submitSchema = z.object({
  items: z.array(z.object({
    variantId: z.number().int(),
    quantity: z.number().int().min(1).max(99),
    addonVariantIds: z.array(z.number().int()).optional(),
  })).min(1),
  name: z.string().optional(),
  phone: z.string().optional(),
  method: z.enum(['cod', 'pickup']).optional(),
  note: z.string().optional(),
})

/** DTO katalog mini app: PO + menu (varian, add-on berbayar, add-on gratis). */
function shapeCatalog(data: Awaited<ReturnType<typeof listOrderableMenus>>) {
  const po = data.preOrder
    ? {
        title: data.preOrder.title,
        description: data.preOrder.description,
        fulfillmentStartDate: data.preOrder.fulfillmentStartDate,
        fulfillmentEndDate: data.preOrder.fulfillmentEndDate,
        fulfillmentNote: data.preOrder.fulfillmentNote,
      }
    : null

  const menus = data.menus
    .filter((menu) => !menu.isAddon)
    .map((menu) => {
      const paidAddons = menu.addonLinks
        .filter((link) => !link.isFree)
        .map((link) => {
          const variant = link.addonMenu.variants[0]
          return variant ? { menuId: link.addonMenuId, variantId: variant.id, name: link.addonMenu.name, price: variant.price } : null
        })
        .filter((x): x is { menuId: number; variantId: number; name: string; price: number } => x !== null)
      const freeAddons = menu.addonLinks
        .filter((link) => link.isFree && link.addonMenu.variants[0])
        .map((link) => ({ menuId: link.addonMenuId, name: link.addonMenu.name }))
      return {
        id: menu.id,
        name: menu.name,
        description: menu.description,
        category: menu.category,
        imageUrl: menu.imageUrl,
        variants: menu.variants.map((v) => ({ id: v.id, name: visibleVariantName(v.name), price: v.price })),
        addons: paidAddons,
        freeAddons,
      }
    })

  return { po, menus }
}

export async function miniappRoutes(app: FastifyInstance) {
  // POST /api/miniapp/auth — validasi Telegram initData → JWT customer.
  // Dev (BOT_TOKEN kosong): terima { devUserId } tanpa validasi agar bisa dites di browser.
  app.post('/auth', async (req) => {
    const parsed = authSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', 'VALIDATION')
    const { initData, devUserId, name } = parsed.data

    let user: { id: bigint; username?: string; name?: string }
    if (config.botToken) {
      user = validateInitData(initData ?? '', config.botToken)
    } else if (devUserId != null) {
      // Dev: jangan menimpa nama customer yang sudah ada bila tidak dikirim.
      const existing = await prisma.customer.findUnique({ where: { telegramUserId: BigInt(devUserId) } })
      user = { id: BigInt(devUserId), name: name?.trim() || existing?.name || undefined }
    } else {
      throw new HttpError(401, 'initData diperlukan', 'INITDATA_REQUIRED')
    }

    let customer
    try {
      customer = await ensureCustomer(user)
    } catch (error) {
      mapBotError(error)
    }

    const token = app.jwt.sign(
      { kind: 'customer', telegramUserId: user.id.toString(), username: user.username, name: customer.name ?? undefined },
      { expiresIn: '7d' },
    )
    return ok({ token, customer: { id: customer.telegramUserId, name: customer.name, username: customer.username } })
  })

  // GET /api/miniapp/catalog — PO terbuka + menu yang bisa dipesan (publik).
  app.get('/catalog', async () => {
    const data = await listOrderableMenus()
    return ok(shapeCatalog(data))
  })

  // ---- Rute yang butuh token customer ----

  // POST /api/miniapp/orders — buat order dari cart klien.
  app.post('/orders', { preHandler: app.authenticateCustomer }, async (req, reply) => {
    const parsed = submitSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', 'VALIDATION')
    const customer = req.customer!
    const items: SubmitOrderItem[] = parsed.data.items
    try {
      const order = await submitOrder(
        { id: customer.id, username: customer.username, name: customer.name },
        items,
        { name: parsed.data.name, phone: parsed.data.phone, method: parsed.data.method, note: parsed.data.note },
      )
      reply.code(201)
      return ok({ id: order.id, code: order.orderCode, total: order.totalAmount, status: order.orderStatus })
    } catch (error) {
      mapBotError(error)
    }
  })

  // GET /api/miniapp/orders?page=&limit= — order milik customer ini (slim).
  app.get('/orders', { preHandler: app.authenticateCustomer }, async (req) => {
    const customer = req.customer!
    const { skip, take, page, limit } = parsePage(req)
    const where = { telegramUserId: customer.id }
    const [total, rows] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: { items: { where: { parentOrderItemId: null }, orderBy: { sortOrder: 'asc' } } },
      }),
    ])
    const data = rows.map((o) => ({
      id: o.id,
      code: o.orderCode,
      status: o.orderStatus,
      total: o.totalAmount,
      createdAt: o.createdAt,
      summary: o.items.map((it) => `${it.quantity}× ${it.menuNameSnapshot}`).join(', '),
      cancelled: o.orderStatus === 'cancelled',
    }))
    return ok(data, pageMeta(total, page, limit))
  })

  // GET /api/miniapp/orders/:id — detail order (item utk timeline) milik customer.
  app.get('/orders/:id', { preHandler: app.authenticateCustomer }, async (req) => {
    const customer = req.customer!
    let order
    try {
      order = await customerOrderDetail(customer.id, idOf(req))
    } catch (error) {
      mapBotError(error)
    }
    return ok({
      id: order.id,
      code: order.orderCode,
      status: order.orderStatus,
      total: order.totalAmount,
      createdAt: order.createdAt,
      notes: order.notes,
      cancelled: order.orderStatus === 'cancelled',
      canCancel: order.orderStatus === 'submitted' || order.orderStatus === 'confirmed',
      items: order.items.map((it) => ({
        name: it.menuNameSnapshot,
        variant: it.variantNameSnapshot,
        quantity: it.quantity,
        isAddon: it.parentOrderItemId != null,
        unitPrice: it.unitPrice,
      })),
    })
  })

  // POST /api/miniapp/orders/:id/cancel — submitted → batal langsung; confirmed → ajukan pembatalan.
  app.post('/orders/:id/cancel', { preHandler: app.authenticateCustomer }, async (req) => {
    const customer = req.customer!
    const id = idOf(req)
    let order
    try {
      order = await customerOrderDetail(customer.id, id)
    } catch (error) {
      mapBotError(error)
    }
    try {
      if (order.orderStatus === 'submitted') {
        const updated = await cancelSubmittedOrder(customer.id, id)
        return ok({ status: updated.orderStatus, requested: false })
      }
      if (order.orderStatus === 'confirmed') {
        const result = await requestOrderCancellation(customer.id, id)
        return ok({ status: 'confirmed', requested: true, alreadyRequested: result.alreadyRequested })
      }
      throw new HttpError(409, 'Order ini tidak dapat dibatalkan.', 'ORDER_NOT_CANCELLABLE')
    } catch (error) {
      mapBotError(error)
    }
  })
}
