import { existsSync } from 'node:fs'
import { unlink } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { config } from '../config'

export type ImageVariantKey = 'thumb' | 'card' | 'detail' | 'large'

export type ImageVariants = Record<ImageVariantKey, string>

export const IMAGE_VARIANT_SPECS: Record<ImageVariantKey, { width: number; height?: number; fit: 'cover' | 'inside' }> = {
  thumb: { width: 128, height: 128, fit: 'cover' },
  card: { width: 420, fit: 'inside' },
  detail: { width: 880, fit: 'inside' },
  large: { width: 1280, fit: 'inside' },
}

export function imageVariantName(originalName: string, key: ImageVariantKey) {
  const parsed = path.parse(originalName)
  return `${parsed.name}@${key}.webp`
}

export function imageVariantUrls(imageUrl: string | null | undefined): ImageVariants | null {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return null
  const originalName = path.basename(imageUrl)
  return Object.fromEntries(
    (Object.keys(IMAGE_VARIANT_SPECS) as ImageVariantKey[]).map((key) => [key, `/uploads/${imageVariantName(originalName, key)}`]),
  ) as ImageVariants
}

export function existingImageVariantUrls(imageUrl: string | null | undefined): ImageVariants | null {
  const variants = imageVariantUrls(imageUrl)
  if (!variants) return null
  const allExist = Object.values(variants).every((url) => existsSync(path.join(path.resolve(config.uploadsDir), path.basename(url))))
  return allExist ? variants : null
}

export async function generateImageVariants(sourcePath: string, originalName: string, uploadsDir = config.uploadsDir, warn?: (obj: unknown, msg?: string) => void) {
  const urls = imageVariantUrls(`/uploads/${originalName}`)!
  const generated: Partial<Record<ImageVariantKey, string>> = {}
  const ext = path.extname(originalName).slice(1).toLowerCase()

  for (const [key, spec] of Object.entries(IMAGE_VARIANT_SPECS) as Array<[ImageVariantKey, (typeof IMAGE_VARIANT_SPECS)[ImageVariantKey]]>) {
    const variantName = imageVariantName(originalName, key)
    const variantPath = path.join(path.resolve(uploadsDir), variantName)
    try {
      let image = sharp(sourcePath, { animated: ext !== 'gif' }).rotate().resize({ width: spec.width, height: spec.height, fit: spec.fit, withoutEnlargement: true })
      if (ext === 'gif') image = sharp(sourcePath, { pages: 1 }).rotate().resize({ width: spec.width, height: spec.height, fit: spec.fit, withoutEnlargement: true })
      await image.webp({ quality: 82, effort: 4 }).toFile(variantPath)
      generated[key] = urls[key]
    } catch (error) {
      await unlink(variantPath).catch(() => {})
      warn?.({ err: error, variant: key, source: originalName }, 'Gagal membuat varian gambar')
    }
  }

  return generated
}
