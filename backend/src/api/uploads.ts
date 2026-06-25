import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'
import sharp from 'sharp'
import { config } from '../config'
import { HttpError, ok } from '../lib/http'
import { IMAGE_VARIANT_SPECS, imageVariantName, imageVariantUrls, type ImageVariantKey } from '../lib/imageVariants'

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

    const variants = await generateVariants(dest, name, ext, app.log.warn.bind(app.log))

    reply.code(201)
    return ok({ url: `/uploads/${name}`, variants })
  })
}

async function generateVariants(sourcePath: string, originalName: string, ext: string, warn: (obj: unknown, msg?: string) => void) {
  const urls = imageVariantUrls(`/uploads/${originalName}`)!
  const generated: Partial<Record<ImageVariantKey, string>> = {}

  for (const [key, spec] of Object.entries(IMAGE_VARIANT_SPECS) as Array<[ImageVariantKey, (typeof IMAGE_VARIANT_SPECS)[ImageVariantKey]]>) {
    const variantName = imageVariantName(originalName, key)
    const variantPath = path.join(path.resolve(config.uploadsDir), variantName)
    try {
      let image = sharp(sourcePath, { animated: ext !== 'gif' }).rotate().resize({ width: spec.width, height: spec.height, fit: spec.fit, withoutEnlargement: true })
      if (ext === 'gif') image = sharp(sourcePath, { pages: 1 }).rotate().resize({ width: spec.width, height: spec.height, fit: spec.fit, withoutEnlargement: true })
      await image.webp({ quality: 82, effort: 4 }).toFile(variantPath)
      generated[key] = urls[key]
    } catch (error) {
      await unlink(variantPath).catch(() => {})
      warn({ err: error, variant: key, source: originalName }, 'Gagal membuat varian gambar')
    }
  }

  return generated
}
