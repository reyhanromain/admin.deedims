import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { HttpError, ok, pageMeta } from '../lib/http'
import { parsePage } from '../lib/paginate'
import { itemsSummary } from '../lib/itemsSummary'
import { approveOrderCancellation, BotBusinessError, cancelOrderByAdmin } from '../bot/service'
import { notifyOrderStatus } from '../bot/notifications'

const patchSchema = z.object({
  // `cancelled` sengaja tidak ada di sini: pembatalan admin punya endpoint sendiri
  // (POST /:id/cancel) agar catatan opsional dan notifikasi pembatalan tidak bisa
  // terlewat lewat jalur PATCH yang generik.
  orderStatus: z.enum(['submitted', 'confirmed', 'ready', 'completed']).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'cancelled']).optional(),
  adminNotes: z.string().optional(),
})

const cancelSchema = z.object({ note: z.string().max(500).optional() })

const idOf = (req: { params: unknown }) => Number((req.params as { id: string }).id)

export async function ordersRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // GET /api/orders?status=&page=&limit= — HANYA order dari PO yang sedang open.
  // (Order dari PO lama dilihat via GET /api/preorders/:id/orders.)
  app.get('/', async (req) => {
    const { status } = req.query as { status?: string }
    const { skip, take, page, limit } = parsePage(req)

    const openPo = await prisma.preOrder.findFirst({ where: { status: 'open' }, select: { id: true } })
    const scope = { preOrderId: openPo?.id ?? -1 } // -1 → tak ada PO open → kosong
    const where = { ...scope, ...(status && status !== 'all' ? { orderStatus: status } : {}) }

    const [total, rows, grouped] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take, include: { items: { orderBy: { sortOrder: 'asc' } } } }),
      prisma.order.groupBy({ by: ['orderStatus'], _count: { _all: true }, where: scope }),
    ])

    const counts: Record<string, number> = { all: 0, submitted: 0, confirmed: 0, ready: 0, completed: 0, cancelled: 0 }
    for (const g of grouped) {
      counts[g.orderStatus] = g._count._all
      counts.all += g._count._all
    }

    const data = rows.map((o) => ({
      id: o.id, code: o.orderCode, customer: o.customerName ?? '', username: o.telegramUsername ?? '',
      createdAt: o.createdAt, itemsSummary: itemsSummary(o.items), total: o.totalAmount,
      status: o.orderStatus, pay: o.paymentStatus, cancelRequested: o.cancelRequested,
    }))
    return ok(data, pageMeta(total, page, limit, { counts }))
  })

  // GET /api/orders/:id — detail DTO (item snapshot + PO ringkas)
  app.get('/:id', async (req) => {
    const order = await prisma.order.findUnique({
      where: { id: idOf(req) },
      include: { items: { orderBy: { sortOrder: 'asc' } }, preOrder: true },
    })
    if (!order) throw new HttpError(404, 'Order tidak ditemukan', 'NOT_FOUND')
    return ok({
      id: order.id, code: order.orderCode, customer: order.customerName ?? '', username: order.telegramUsername ?? '',
      createdAt: order.createdAt, updatedAt: order.updatedAt, status: order.orderStatus, pay: order.paymentStatus,
      // `notes` diisi customer saat checkout mini app (nomor WA + catatannya); read-only bagi admin,
      // terpisah dari `adminNotes` yang memang ditulis admin.
      notes: order.notes ?? '', adminNotes: order.adminNotes ?? '', cancelRequested: order.cancelRequested,
      cancellationNote: order.cancellationNote ?? '', total: order.totalAmount,
      items: order.items.map((it) => ({
        menuNameSnapshot: it.menuNameSnapshot, variantNameSnapshot: it.variantNameSnapshot, unitPrice: it.unitPrice, quantity: it.quantity,
      })),
      preOrder: order.preOrder ? { title: order.preOrder.title, fulfillmentStartDate: order.preOrder.fulfillmentStartDate, fulfillmentEndDate: order.preOrder.fulfillmentEndDate } : null,
    })
  })

  // PATCH /api/orders/:id — ubah status/pembayaran/catatan; balikan field yang berubah saja
  app.patch('/:id', async (req) => {
    const parsed = patchSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', 'VALIDATION')

    const data: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.orderStatus === 'confirmed') data.confirmedAt = new Date()

    const id = idOf(req)
    const u = await prisma.order.update({ where: { id }, data })
    if (parsed.data.orderStatus) await notifyOrderStatus(u.id, 'status')
    return ok({ id: u.id, status: u.orderStatus, pay: u.paymentStatus, adminNotes: u.adminNotes ?? '', cancelRequested: u.cancelRequested, updatedAt: u.updatedAt })
  })

  // POST /api/orders/:id/cancel — pembatalan oleh admin, termasuk order yang sudah
  // dikonfirmasi. Catatan opsional ikut dikirim ke customer lewat notifikasi Telegram.
  app.post('/:id/cancel', async (req) => {
    const parsed = cancelSchema.safeParse(req.body ?? {})
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', 'VALIDATION')

    const id = idOf(req)
    if (!await prisma.order.findUnique({ where: { id }, select: { id: true } })) throw new HttpError(404, 'Order tidak ditemukan', 'NOT_FOUND')

    let cancelled
    try {
      cancelled = await cancelOrderByAdmin(id, parsed.data.note)
    } catch (error) {
      if (error instanceof BotBusinessError && error.code === 'ORDER_NOT_CANCELLABLE') throw new HttpError(409, error.message, 'ORDER_NOT_CANCELLABLE')
      throw error
    }
    await notifyOrderStatus(id, 'cancelled_by_admin')
    return ok({
      id: cancelled.id, status: cancelled.orderStatus, pay: cancelled.paymentStatus,
      cancelRequested: cancelled.cancelRequested, cancellationNote: cancelled.cancellationNote ?? '', updatedAt: cancelled.updatedAt,
    })
  })

  // POST /api/orders/:id/cancellation/approve
  app.post('/:id/cancellation/approve', async (req) => {
    const id = idOf(req)
    try {
      await approveOrderCancellation(id, req.user.id)
    } catch (error) {
      if (error instanceof BotBusinessError && error.code === 'CANCELLATION_NOT_FOUND') throw new HttpError(404, error.message, 'NOT_FOUND')
      throw error
    }
    await notifyOrderStatus(id, 'cancel_approved')
    return ok({ status: 'approved' })
  })

  // POST /api/orders/:id/cancellation/reject
  app.post('/:id/cancellation/reject', async (req) => {
    const id = idOf(req)
    const pending = await prisma.orderCancellationRequest.findFirst({ where: { orderId: id, status: 'pending' } })
    if (!pending) throw new HttpError(404, 'Tidak ada permintaan pembatalan pending', 'NOT_FOUND')

    const now = new Date()
    await prisma.$transaction([
      prisma.orderCancellationRequest.update({ where: { id: pending.id }, data: { status: 'rejected', reviewedById: req.user.id, reviewedAt: now } }),
      prisma.order.update({ where: { id }, data: { cancelRequested: false } }),
    ])
    await notifyOrderStatus(id, 'cancel_rejected')
    return ok({ status: 'rejected' })
  })
}
