import type { FastifyInstance } from 'fastify'
import { prisma } from '../db'
import { HttpError, ok, pageMeta } from '../lib/http'
import { parsePage } from '../lib/paginate'
import { itemsSummary } from '../lib/itemsSummary'

const idOf = (req: { params: unknown }) => Number((req.params as { id: string }).id)

export async function customersRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // GET /api/customers?page=&limit= — paginated + stats per customer (server)
  app.get('/', async (req) => {
    const { skip, take, page, limit } = parsePage(req)
    const [total, rows] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.findMany({ orderBy: { id: 'asc' }, skip, take }),
    ])

    const tgIds = rows.map((c) => c.telegramUserId).filter((x): x is bigint => x != null)
    const [countAgg, revAgg, subs] = await Promise.all([
      prisma.order.groupBy({ by: ['telegramUserId'], _count: { _all: true }, _max: { createdAt: true }, where: { telegramUserId: { in: tgIds } } }),
      prisma.order.groupBy({ by: ['telegramUserId'], _sum: { totalAmount: true }, where: { telegramUserId: { in: tgIds }, orderStatus: { not: 'cancelled' } } }),
      prisma.reminderSubscriber.findMany({ where: { telegramUserId: { in: tgIds }, isActive: true }, select: { telegramUserId: true } }),
    ])
    const cMap = new Map(countAgg.map((g) => [g.telegramUserId?.toString(), { count: g._count._all, last: g._max.createdAt }]))
    const rMap = new Map(revAgg.map((g) => [g.telegramUserId?.toString(), g._sum.totalAmount ?? 0]))
    const subSet = new Set(subs.map((s) => s.telegramUserId.toString()))

    const data = rows.map((c) => {
      const k = c.telegramUserId?.toString()
      const cm = k ? cMap.get(k) : undefined
      return {
        id: c.id, username: c.username, name: c.name, blocked: c.blocked, joinedAt: c.joinedAt,
        orderCount: cm?.count ?? 0,
        totalSpent: (k ? rMap.get(k) : 0) ?? 0,
        lastOrderAt: cm?.last ?? null,
        reminderActive: k ? subSet.has(k) : false,
      }
    })
    return ok(data, pageMeta(total, page, limit))
  })

  // GET /api/customers/:id/orders?page=&limit= — track record (paginated, ramping)
  app.get('/:id/orders', async (req) => {
    const customer = await prisma.customer.findUnique({ where: { id: idOf(req) } })
    if (!customer) throw new HttpError(404, 'Customer tidak ditemukan', 'NOT_FOUND')

    const { skip, take, page, limit } = parsePage(req)
    const where = { telegramUserId: customer.telegramUserId ?? -1n }
    const [total, rows] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { items: { orderBy: { sortOrder: 'asc' } } } }),
    ])
    const data = rows.map((o) => ({ id: o.id, code: o.orderCode, createdAt: o.createdAt, itemsSummary: itemsSummary(o.items), total: o.totalAmount, status: o.orderStatus }))
    return ok(data, pageMeta(total, page, limit))
  })

  // POST /api/customers/:id/block — blokir / buka blokir
  app.post('/:id/block', async (req) => {
    const id = idOf(req)
    const { blocked } = (req.body ?? {}) as { blocked?: boolean }
    const customer = await prisma.customer.findUnique({ where: { id } })
    if (!customer) throw new HttpError(404, 'Customer tidak ditemukan', 'NOT_FOUND')

    const next = blocked ?? !customer.blocked
    const u = await prisma.customer.update({
      where: { id },
      data: { blocked: next, blockedAt: next ? new Date() : null, blockedById: next ? req.user.id : null },
    })
    return ok({ id: u.id, blocked: u.blocked })
  })
}
