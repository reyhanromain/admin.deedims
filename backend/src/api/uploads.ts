import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'
import { config } from '../config'
import { HttpError, ok } from '../lib/http'

const ALLOWED = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
])

/** Upload foto (hosting lokal). Mengembalikan { url } yang dipakai sbg `menus.imageUrl`. */
export async function uploadsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // POST /api/uploads — multipart, field "file"
  app.post('/', async (req, reply) => {
    const file = await req.file()
    if (!file) throw new HttpError(400, 'File wajib (field "file")', 'VALIDATION')

    const ext = ALLOWED.get(file.mimetype)
    if (!ext) throw new HttpError(415, 'Hanya JPG, PNG, WebP, atau GIF', 'UNSUPPORTED_MEDIA_TYPE')

    const name = `${randomUUID()}.${ext}`
    const dest = path.join(path.resolve(config.uploadsDir), name)
    await pipeline(file.file, createWriteStream(dest))

    if (file.file.truncated) {
      await unlink(dest).catch(() => {})
      throw new HttpError(413, `File terlalu besar (maks ${config.maxUploadBytes / 1024 / 1024} MB)`, 'PAYLOAD_TOO_LARGE')
    }

    reply.code(201)
    return ok({ url: `/uploads/${name}` })
  })
}
