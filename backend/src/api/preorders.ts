import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { HttpError, ok, pageMeta } from '../lib/http'
import { parsePage } from '../lib/paginate'
import { itemsSummary } from '../lib/itemsSummary'
import { dispatchPreOrderReminders } from '../bot/notifications'

const idOf = (req: { params: unknown }) => Number((req.params as { id: string }).id)

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  fulfillmentDate: z.string().nullable().optional(),
  fulfillmentNote: z.string().nullable().optional(),
})

export async function preordersRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // GET /api/preorders?page=&limit= — paginated + orderCount/revenue per PO (server)
  app.get('/', async (req) => {
    const { skip, take, page, limit } = parsePage(req)
    const [total, rows] = await Promise.all([
      prisma.preOrder.count(),
      prisma.preOrder.findMany({ orderBy: [{ fulfillmentDate: 'desc' }, { id: 'desc' }], skip, take }),
    ])
    const ids = rows.map((r) => r.id)
    const [countByPo, revByPo] = await Promise.all([
      prisma.order.groupBy({ by: ['preOrderId'], _count: { _all: true }, where: { preOrderId: { in: ids } } }),
      prisma.order.groupBy({ by: ['preOrderId'], _sum: { totalAmount: true }, where: { preOrderId: { in: ids }, orderStatus: { not: 'cancelled' } } }),
    ])
    const cMap = new Map(countByPo.map((g) => [g.preOrderId, g._count._all]))
    const rMap = new Map(revByPo.map((g) => [g.preOrderId, g._sum.totalAmount ?? 0]))
    const data = rows.map((p) => ({
      id: p.id, title: p.title, description: p.description, status: p.status,
      fulfillmentDate: p.fulfillmentDate, fulfillmentNote: p.fulfillmentNote,
      orderCount: cMap.get(p.id) ?? 0, revenue: rMap.get(p.id) ?? 0,
    }))
    return ok(data, pageMeta(total, page, limit))
  })

  // GET /api/preorders/:id/orders?page=&limit= — order dari PO tertentu (drill-down detail)
  app.get('/:id/orders', async (req) => {
    const id = idOf(req)
    const po = await prisma.preOrder.findUnique({ where: { id } })
    if (!po) throw new HttpError(404, 'Pre-order tidak ditemukan', 'NOT_FOUND')

    const { skip, take, page, limit } = parsePage(req)
    const where = { preOrderId: id }
    const [total, rows] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take, include: { items: { orderBy: { sortOrder: 'asc' } } } }),
    ])
    const data = rows.map((o) => ({
      id: o.id, code: o.orderCode, customer: o.customerName ?? '', username: o.telegramUsername ?? '',
      createdAt: o.createdAt, itemsSummary: itemsSummary(o.items), total: o.totalAmount,
      status: o.orderStatus, pay: o.paymentStatus, cancelRequested: o.cancelRequested,
    }))
    return ok(data, pageMeta(total, page, limit))
  })

  // POST /api/preorders — draft baru
  app.post('/', async (req, reply) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Judul batch wajib diisi', 'VALIDATION')
    const d = parsed.data
    const po = await prisma.preOrder.create({
      data: {
        title: d.title, description: d.description ?? null, status: 'draft',
        fulfillmentDate: d.fulfillmentDate ? new Date(d.fulfillmentDate) : null, fulfillmentNote: d.fulfillmentNote ?? null,
      },
    })
    reply.code(201)
    return ok({ id: po.id, title: po.title, description: po.description, status: po.status, fulfillmentDate: po.fulfillmentDate, fulfillmentNote: po.fulfillmentNote, orderCount: 0, revenue: 0 })
  })

  // POST /api/preorders/:id/open — aturan: hanya satu PO boleh open
  app.post('/:id/open', async (req) => {
    const id = idOf(req)
    const open = await prisma.preOrder.findFirst({ where: { status: 'open' } })
    if (open && open.id !== id) throw new HttpError(409, 'Tutup dulu PO yang sedang open — hanya boleh satu open', 'CONFLICT')
    const po = await prisma.preOrder.update({ where: { id }, data: { status: 'open', openedAt: new Date() } })
    await dispatchPreOrderReminders(po.id)
    return ok({ id: po.id, status: po.status })
  })

  app.post('/:id/close', async (req) => {
    const po = await prisma.preOrder.update({ where: { id: idOf(req) }, data: { status: 'closed', closedAt: new Date() } })
    return ok({ id: po.id, status: po.status })
  })

  app.post('/:id/complete', async (req) => {
    const po = await prisma.preOrder.update({ where: { id: idOf(req) }, data: { status: 'completed' } })
    return ok({ id: po.id, status: po.status })
  })
}
