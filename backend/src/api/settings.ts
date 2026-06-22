import type { FastifyInstance } from 'fastify'
import { prisma } from '../db'
import { HttpError, ok, pageMeta } from '../lib/http'
import { parsePage } from '../lib/paginate'
import { validateTemplateValue } from '../bot/templates'

const idOf = (req: { params: unknown }) => Number((req.params as { id: string }).id)
const toDto = (s: { id: number; label: string; value: string | null; description: string | null; inputType: string; category: string; placeholders: string | null }) => ({
  id: s.id,
  label: s.label,
  value: s.value,
  description: s.description,
  inputType: s.inputType,
  category: s.category,
  placeholders: s.placeholders ? JSON.parse(s.placeholders) as string[] : [],
})

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // GET /api/settings?page=&limit= — urut sortOrder
  app.get('/', async (req) => {
    const { skip, take, page, limit } = parsePage(req)
    const category = typeof (req.query as { category?: unknown }).category === 'string' ? (req.query as { category: string }).category : undefined
    const where = category ? { category } : {}
    const [total, rows] = await Promise.all([
      prisma.setting.count({ where }),
      prisma.setting.findMany({ where, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }], skip, take }),
    ])
    return ok(rows.map(toDto), pageMeta(total, page, limit))
  })

  // PATCH /api/settings/:id
  app.patch('/:id', async (req) => {
    const id = idOf(req)
    const { value } = (req.body ?? {}) as { value?: string }
    const setting = await prisma.setting.findUnique({ where: { id } })
    if (!setting) throw new HttpError(404, 'Setting tidak ditemukan', 'NOT_FOUND')
    try {
      if (setting.inputType === 'html') validateTemplateValue(setting.label, value ?? '')
    } catch (error) {
      throw new HttpError(400, error instanceof Error ? error.message : 'Template tidak valid', 'VALIDATION')
    }
    const s = await prisma.setting.update({ where: { id }, data: { value: value ?? null } })
    return ok(toDto(s))
  })
}
