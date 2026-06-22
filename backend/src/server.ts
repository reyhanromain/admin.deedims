import Fastify, { type FastifyError, type FastifyReply, type FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { mkdirSync } from 'node:fs'
import { ZodError } from 'zod'
import { config } from './config'
import { HttpError } from './lib/http'
import { authRoutes } from './auth/routes'
import { dashboardRoutes } from './api/dashboard'
import { usersRoutes } from './api/users'
import { customersRoutes } from './api/customers'
import { stockRoutes } from './api/stock'
import { settingsRoutes } from './api/settings'
import { botMessagesRoutes } from './api/botMessages'
import { ordersRoutes } from './api/orders'
import { menusRoutes } from './api/menus'
import { preordersRoutes } from './api/preorders'
import { subscribersRoutes } from './api/subscribers'
import { uploadsRoutes } from './api/uploads'
import { upsertBotMessageTemplates } from './bot/templates'

/** Payload JWT yang kita tandatangani saat login. */
export interface JwtPayload {
  id: number
  username: string
  isSuper: boolean
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export async function buildServer() {
  const app = Fastify({ logger: !process.env.VITEST })

  await upsertBotMessageTemplates()

  await app.register(cors, { origin: config.corsOrigin, credentials: true })
  await app.register(jwt, { secret: config.jwtSecret })
  await app.register(multipart, { limits: { fileSize: config.maxUploadBytes, files: 1 } })

  // Sajikan foto yang di-upload (hosting lokal) di /uploads/*
  const uploadsDir = path.resolve(config.uploadsDir)
  mkdirSync(uploadsDir, { recursive: true })
  await app.register(fastifyStatic, { root: uploadsDir, prefix: '/uploads/' })

  // Envelope error seragam untuk semua kegagalan.
  app.setErrorHandler((err: FastifyError, _req, reply) => {
    if (err instanceof HttpError) {
      return reply.code(err.status).send({ data: null, meta: null, error: { message: err.message, code: err.code } })
    }
    if (err instanceof ZodError) {
      return reply.code(400).send({ data: null, meta: null, error: { message: 'Invalid payload', code: 'VALIDATION' } })
    }
    const status = typeof err.statusCode === 'number' && err.statusCode >= 400 ? err.statusCode : 500
    if (status >= 500) app.log.error(err)
    const code = status === 401 ? 'UNAUTHORIZED' : status === 400 ? 'VALIDATION' : status >= 500 ? 'INTERNAL' : 'ERROR'
    return reply.code(status).send({ data: null, meta: null, error: { message: status >= 500 ? 'Internal server error' : err.message, code } })
  })

  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ data: null, meta: null, error: { message: 'Not found', code: 'NOT_FOUND' } })
  })

  // Guard rute terproteksi: verifikasi JWT dari header Authorization: Bearer <token>.
  app.decorate('authenticate', async (req: FastifyRequest) => {
    try {
      await req.jwtVerify()
    } catch {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }
  })

  app.get('/health', async () => ({ ok: true }))

  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' })
  await app.register(usersRoutes, { prefix: '/api/users' })
  await app.register(customersRoutes, { prefix: '/api/customers' })
  await app.register(stockRoutes, { prefix: '/api/stock' })
  await app.register(settingsRoutes, { prefix: '/api/settings' })
  await app.register(botMessagesRoutes, { prefix: '/api/bot-messages' })
  await app.register(ordersRoutes, { prefix: '/api/orders' })
  await app.register(menusRoutes, { prefix: '/api/menus' })
  await app.register(preordersRoutes, { prefix: '/api/preorders' })
  await app.register(subscribersRoutes, { prefix: '/api/subscribers' })
  await app.register(uploadsRoutes, { prefix: '/api/uploads' })

  return app
}
