import type { FastifyInstance } from 'fastify'
import { prisma } from '../db'
import { ok, pageMeta } from '../lib/http'
import { parsePage } from '../lib/paginate'
import { formatJakarta } from '../time'

/** Read-only di CMS: log percakapan ditulis bot, di sini hanya dibaca & ditampilkan. */
export async function botMessagesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // GET /api/bot-messages?customerId=&direction=&page=&limit=
  app.get('/', async (req) => {
    const q = req.query as { customerId?: string; direction?: 'incoming' | 'outgoing' }
    const { skip, take, page, limit } = parsePage(req)

    const where = {
      ...(q.customerId ? { customerId: Number(q.customerId) } : {}),
      ...(q.direction ? { direction: q.direction } : {}),
    }

    const [total, rows] = await Promise.all([
      prisma.botMessage.count({ where }),
      prisma.botMessage.findMany({ where, orderBy: { receivedAt: 'desc' }, skip, take }),
    ])

    const data = rows.map((m) => ({
      id: m.id,
      direction: m.direction,
      messageType: m.messageType,
      text: m.text,
      telegramUsername: m.telegramUsername,
      customerName: m.customerName,
      isCommand: m.isCommand,
      command: m.command,
      customerId: m.customerId,
      receivedAtLabel: formatJakarta(m.receivedAt),
      telegramUserId: m.telegramUserId?.toString() ?? null,
      telegramChatId: m.telegramChatId.toString(),
    }))
    return ok(data, pageMeta(total, page, limit))
  })
}
