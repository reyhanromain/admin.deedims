import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { hashPassword } from '../auth/password'
import { HttpError, ok, pageMeta } from '../lib/http'
import { parsePage } from '../lib/paginate'

const createSchema = z.object({
  username: z.string().min(1),
  fullName: z.string().min(1),
  password: z.string().min(1),
})

const updateSchema = z.object({
  username: z.string().min(1).optional(),
  fullName: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
})

const publicUser = (u: { id: number; username: string; fullName: string; isSuper: boolean }) => ({ id: u.id, username: u.username, fullName: u.fullName, isSuper: u.isSuper })
const idOf = (req: { params: unknown }) => Number((req.params as { id: string }).id)

export async function usersRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // GET /api/users?page=&limit=
  app.get('/', async (req) => {
    const { skip, take, page, limit } = parsePage(req)
    const [total, users] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({ orderBy: { id: 'asc' }, skip, take }),
    ])
    return ok(users.map(publicUser), pageMeta(total, page, limit))
  })

  // POST /api/users — hanya super user
  app.post('/', async (req, reply) => {
    if (!req.user.isSuper) throw new HttpError(403, 'Hanya super user', 'FORBIDDEN')
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', 'VALIDATION')

    const username = parsed.data.username.toLowerCase()
    if (await prisma.user.findUnique({ where: { username } })) throw new HttpError(409, 'Username sudah dipakai', 'CONFLICT')

    const user = await prisma.user.create({
      data: { username, fullName: parsed.data.fullName, password: await hashPassword(parsed.data.password), isSuper: false },
    })
    reply.code(201)
    return ok(publicUser(user))
  })

  // PATCH /api/users/:id — super edit siapa saja; non-super hanya dirinya
  app.patch('/:id', async (req) => {
    const id = idOf(req)
    if (!req.user.isSuper && req.user.id !== id) throw new HttpError(403, 'Tidak diizinkan', 'FORBIDDEN')
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', 'VALIDATION')

    const data: Record<string, unknown> = {}
    if (parsed.data.username) data.username = parsed.data.username.toLowerCase()
    if (parsed.data.fullName) data.fullName = parsed.data.fullName
    if (parsed.data.password) data.password = await hashPassword(parsed.data.password)

    const user = await prisma.user.update({ where: { id }, data })
    return ok(publicUser(user))
  })

  // DELETE /api/users/:id — hanya super; super user tak bisa dihapus
  app.delete('/:id', async (req) => {
    if (!req.user.isSuper) throw new HttpError(403, 'Hanya super user', 'FORBIDDEN')
    const id = idOf(req)
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) throw new HttpError(404, 'User tidak ditemukan', 'NOT_FOUND')
    if (target.isSuper) throw new HttpError(400, 'Super user tidak bisa dihapus', 'BAD_REQUEST')

    await prisma.user.delete({ where: { id } })
    return ok({ ok: true })
  })
}
