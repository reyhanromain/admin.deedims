import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { HttpError, ok, pageMeta } from '../lib/http'
import { parsePage } from '../lib/paginate'
import { itemsSummary } from '../lib/itemsSummary'

const patchSchema = z.object({
  orderStatus: z.enum(['submitted', 'confirmed', 'ready', 'completed', 'cancelled']).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'cancelled']).optional(),
  adminNotes: z.string().optional(),
})

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
      adminNotes: order.adminNotes ?? '', cancelRequested: order.cancelRequested, total: order.totalAmount,
      items: order.items.map((it) => ({
        menuNameSnapshot: it.menuNameSnapshot, variantNameSnapshot: it.variantNameSnapshot, unitPrice: it.unitPrice, quantity: it.quantity,
      })),
      preOrder: order.preOrder ? { title: order.preOrder.title, fulfillmentDate: order.preOrder.fulfillmentDate } : null,
    })
  })

  // PATCH /api/orders/:id — ubah status/pembayaran/catatan; balikan field yang berubah saja
  app.patch('/:id', async (req) => {
    const parsed = patchSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', 'VALIDATION')

    const data: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.orderStatus === 'confirmed') data.confirmedAt = new Date()
    if (parsed.data.orderStatus === 'cancelled') data.cancelledAt = new Date()

    const u = await prisma.order.update({ where: { id: idOf(req) }, data })
    return ok({ id: u.id, status: u.orderStatus, pay: u.paymentStatus, adminNotes: u.adminNotes ?? '', cancelRequested: u.cancelRequested, updatedAt: u.updatedAt })
  })

  // POST /api/orders/:id/cancellation/approve
  app.post('/:id/cancellation/approve', async (req) => {
    const id = idOf(req)
    const pending = await prisma.orderCancellationRequest.findFirst({ where: { orderId: id, status: 'pending' } })
    if (!pending) throw new HttpError(404, 'Tidak ada permintaan pembatalan pending', 'NOT_FOUND')

    const now = new Date()
    await prisma.$transaction([
      prisma.orderCancellationRequest.update({ where: { id: pending.id }, data: { status: 'approved', reviewedById: req.user.id, reviewedAt: now } }),
      prisma.order.update({ where: { id }, data: { orderStatus: 'cancelled', paymentStatus: 'cancelled', cancelRequested: false, cancelledAt: now } }),
    ])
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
    return ok({ status: 'rejected' })
  })
}
