import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { HttpError, ok, pageMeta } from '../lib/http'
import { parsePage } from '../lib/paginate'

const createSchema = z.object({
  label: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().min(0).default(0),
  unit: z.string().optional(),
})
const updateSchema = createSchema.partial()

const idOf = (req: { params: unknown }) => Number((req.params as { id: string }).id)
const toDto = (s: { id: number; label: string; name: string; quantity: number; unit: string | null }) => ({ id: s.id, label: s.label, name: s.name, quantity: s.quantity, unit: s.unit })

export async function stockRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // GET /api/stock?page=&limit=
  app.get('/', async (req) => {
    const { skip, take, page, limit } = parsePage(req)
    const [total, rows] = await Promise.all([
      prisma.stockItem.count(),
      prisma.stockItem.findMany({ orderBy: { id: 'asc' }, skip, take }),
    ])
    return ok(rows.map(toDto), pageMeta(total, page, limit))
  })

  // POST /api/stock
  app.post('/', async (req, reply) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', 'VALIDATION')
    if (await prisma.stockItem.findUnique({ where: { label: parsed.data.label } })) {
      throw new HttpError(409, 'Label sudah dipakai', 'CONFLICT')
    }
    const s = await prisma.stockItem.create({ data: parsed.data })
    reply.code(201)
    return ok(toDto(s))
  })

  // PATCH /api/stock/:id — ubah nama, label, jumlah absolut, dan unit.
  app.patch('/:id', async (req) => {
    const id = idOf(req)
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', 'VALIDATION')

    const item = await prisma.stockItem.findUnique({ where: { id } })
    if (!item) throw new HttpError(404, 'Stock tidak ditemukan', 'NOT_FOUND')

    if (parsed.data.label) {
      const conflict = await prisma.stockItem.findFirst({ where: { label: parsed.data.label, id: { not: id } } })
      if (conflict) throw new HttpError(409, 'Label sudah dipakai', 'CONFLICT')
    }

    const s = await prisma.stockItem.update({ where: { id }, data: parsed.data })
    return ok(toDto(s))
  })

  // POST /api/stock/:id/adjust — { delta } ±, tidak boleh negatif
  app.post('/:id/adjust', async (req) => {
    const id = idOf(req)
    const { delta } = (req.body ?? {}) as { delta?: number }
    if (typeof delta !== 'number') throw new HttpError(400, 'delta wajib number', 'VALIDATION')

    const item = await prisma.stockItem.findUnique({ where: { id } })
    if (!item) throw new HttpError(404, 'Stock tidak ditemukan', 'NOT_FOUND')

    const quantity = Math.max(0, item.quantity + delta)
    const s = await prisma.stockItem.update({ where: { id }, data: { quantity } })
    return ok(toDto(s))
  })
}
