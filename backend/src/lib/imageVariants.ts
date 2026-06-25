import { existsSync } from 'node:fs'
import path from 'node:path'
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
