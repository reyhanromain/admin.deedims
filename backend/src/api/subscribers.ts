import type { FastifyInstance } from 'fastify'
import { prisma } from '../db'
import { ok, pageMeta } from '../lib/http'
import { parsePage } from '../lib/paginate'

export async function subscribersRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // GET /api/subscribers?page=&limit= — + counts {active,inactive} di meta
  app.get('/', async (req) => {
    const { skip, take, page, limit } = parsePage(req)
    const [total, active, rows] = await Promise.all([
      prisma.reminderSubscriber.count(),
      prisma.reminderSubscriber.count({ where: { isActive: true } }),
      prisma.reminderSubscriber.findMany({ orderBy: { id: 'asc' }, skip, take }),
    ])
    const data = rows.map((s) => ({ telegramUsername: s.telegramUsername, isActive: s.isActive, createdAt: s.createdAt }))
    return ok(data, pageMeta(total, page, limit, { counts: { active, inactive: total - active } }))
  })
}
