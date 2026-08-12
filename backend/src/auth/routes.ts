import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db'
import { config } from '../config'
import { verifyPassword } from './password'
import { HttpError, ok } from '../lib/http'
import { clientIp } from '../lib/clientIp'
import { loginKey, recordLoginFailure, recordLoginSuccess } from '../lib/throttle'

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

/** Username untuk kunci throttle sebelum payload tervalidasi. */
function usernameOf(body: unknown): string {
  const raw = (body as { username?: unknown } | null)?.username
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/login — verifikasi kredensial, terbitkan JWT.
  //
  // Di-throttle per (IP + username): 5 KEGAGALAN per 15 menit, dan login sukses
  // mereset hitungannya. Sengaja tidak ada penghitung khusus-username — kalau
  // ada, penyerang dari mana pun bisa mengunci super user.
  app.post(
    '/login',
    {
      config: {
        rateLimit: {
          // preHandler, bukan onRequest (default plugin): kuncinya memuat
          // username, dan di fase onRequest body belum di-parse.
          hook: 'preHandler',
          max: config.loginRateMax,
          timeWindow: config.loginRateWindowMs,
          keyGenerator: (req) => loginKey(clientIp(req), usernameOf(req.body)),
        },
      },
    },
    async (req) => {
      const parsed = loginSchema.safeParse(req.body)
      if (!parsed.success) throw new HttpError(400, 'Invalid payload', 'VALIDATION')

      const { username, password } = parsed.data
      const ip = clientIp(req)
      const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } })
      if (!user || !(await verifyPassword(password, user.password))) {
        recordLoginFailure(ip, username)
        throw new HttpError(401, 'Username atau password salah', 'UNAUTHORIZED')
      }

      recordLoginSuccess(ip, username)
      const token = app.jwt.sign(
        { id: user.id, username: user.username, isSuper: user.isSuper },
        { expiresIn: '12h' },
      )
      return ok({ token, user: { id: user.id, username: user.username, fullName: user.fullName, isSuper: user.isSuper } })
    },
  )

  // GET /api/auth/me — profil dari token.
  app.get('/me', { onRequest: [app.authenticate] }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) throw new HttpError(404, 'User tidak ditemukan', 'NOT_FOUND')
    return ok({ id: user.id, username: user.username, fullName: user.fullName, isSuper: user.isSuper })
  })
}
