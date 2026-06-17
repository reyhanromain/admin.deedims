import type { FastifyInstance } from 'fastify'
import { prisma } from '../db'
import { HttpError, ok, pageMeta } from '../lib/http'
import { parsePage } from '../lib/paginate'

const idOf = (req: { params: unknown }) => Number((req.params as { id: string }).id)
const toDto = (s: { id: number; label: string; value: string | null; description: string | null; inputType: string }) => ({ id: s.id, label: s.label, value: s.value, description: s.description, inputType: s.inputType })

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // GET /api/settings?page=&limit= — urut sortOrder
  app.get('/', async (req) => {
    const { skip, take, page, limit } = parsePage(req)
    const [total, rows] = await Promise.all([
      prisma.setting.count(),
      prisma.setting.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], skip, take }),
    ])
    return ok(rows.map(toDto), pageMeta(total, page, limit))
  })

  // PATCH /api/settings/:id
  app.patch('/:id', async (req) => {
    const id = idOf(req)
    const { value } = (req.body ?? {}) as { value?: string }
    const setting = await prisma.setting.findUnique({ where: { id } })
    if (!setting) throw new HttpError(404, 'Setting tidak ditemukan', 'NOT_FOUND')
    const s = await prisma.setting.update({ where: { id }, data: { value: value ?? null } })
    return ok(toDto(s))
  })
}
