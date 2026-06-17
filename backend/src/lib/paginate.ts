import type { FastifyRequest } from 'fastify'

/** Baca ?page=&limit= → { skip, take, page, limit }. Default page 1, limit 20 (maks 100). */
export function parsePage(req: FastifyRequest): { skip: number; take: number; page: number; limit: number } {
  const q = req.query as { page?: string; limit?: string }
  const page = Math.max(1, Number(q.page ?? 1) || 1)
  const limit = Math.min(100, Math.max(1, Number(q.limit ?? 20) || 20))
  return { skip: (page - 1) * limit, take: limit, page, limit }
}
