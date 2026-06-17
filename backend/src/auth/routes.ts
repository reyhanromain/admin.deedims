import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { verifyPassword } from './password'
import { HttpError, ok } from '../lib/http'

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/login — verifikasi kredensial, terbitkan JWT.
  app.post('/login', async (req) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', 'VALIDATION')

    const { username, password } = parsed.data
    const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } })
    if (!user || !(await verifyPassword(password, user.password))) {
      throw new HttpError(401, 'Username atau password salah', 'UNAUTHORIZED')
    }

    const token = app.jwt.sign(
      { id: user.id, username: user.username, isSuper: user.isSuper },
      { expiresIn: '12h' },
    )
    return ok({ token, user: { id: user.id, username: user.username, fullName: user.fullName, isSuper: user.isSuper } })
  })

  // GET /api/auth/me — profil dari token.
  app.get('/me', { onRequest: [app.authenticate] }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) throw new HttpError(404, 'User tidak ditemukan', 'NOT_FOUND')
    return ok({ id: user.id, username: user.username, fullName: user.fullName, isSuper: user.isSuper })
  })
}
