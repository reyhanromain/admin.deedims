export type ImageVariantKey = 'thumb' | 'card' | 'detail' | 'large'

export type ImageVariants = Partial<Record<ImageVariantKey, string>> | null | undefined

export function imageFor(original: string, variants: ImageVariants, key: ImageVariantKey): string {
  return variants?.[key] || original
}
