import type { FastifyInstance } from 'fastify'
import { prisma } from '../db'
import { ok } from '../lib/http'
import { itemsSummary } from '../lib/itemsSummary'

const LOW_STOCK_THRESHOLD = 10 // samakan dengan LOW_STOCK_THRESHOLD di FE theme.ts

/** Ringkasan dashboard — KPI + 4 order terbaru + PO open + stock menipis, dihitung server. */
export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  app.get('/', async () => {
    const openPo = await prisma.preOrder.findFirst({ where: { status: 'open' }, orderBy: { openedAt: 'desc' } })

    const [newOrders, cancelRequests] = await Promise.all([
      prisma.order.count({ where: { orderStatus: 'submitted' } }),
      prisma.order.count({ where: { cancelRequested: true, orderStatus: 'confirmed' } }),
    ])

    let batchOrders = 0
    let batchRevenue = 0
    let recentOrders: Array<{ id: number; code: string; customer: string; itemsSummary: string; total: number; status: string }> = []
    if (openPo) {
      batchOrders = await prisma.order.count({ where: { preOrderId: openPo.id } })
      const rev = await prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { preOrderId: openPo.id, orderStatus: { not: 'cancelled' } },
      })
      batchRevenue = rev._sum.totalAmount ?? 0
      const recent = await prisma.order.findMany({
        where: { preOrderId: openPo.id },
        orderBy: { createdAt: 'desc' },
        take: 4,
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      })
      recentOrders = recent.map((o) => ({
        id: o.id, code: o.orderCode, customer: o.customerName ?? '',
        itemsSummary: itemsSummary(o.items), total: o.totalAmount, status: o.orderStatus,
      }))
    }

    const lowStock = (
      await prisma.stockItem.findMany({ where: { quantity: { lte: LOW_STOCK_THRESHOLD } }, orderBy: { quantity: 'asc' } })
    ).map((s) => ({ id: s.id, name: s.name, quantity: s.quantity, unit: s.unit }))

    return ok({
      kpis: { newOrders, batchOrders, batchRevenue, cancelRequests },
      openPreorder: openPo
        ? { id: openPo.id, title: openPo.title, fulfillmentDate: openPo.fulfillmentDate, fulfillmentNote: openPo.fulfillmentNote }
        : null,
      recentOrders,
      lowStock,
    })
  })
}
