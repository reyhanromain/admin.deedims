import { fmt } from '../format'
import type { Menu, OrderStatus } from './types'

export { fmt }

/** Warna + label badge per status order (selaras desain). */
export const STATUS: Record<OrderStatus, { label: string; bg: string; color: string }> = {
  submitted: { label: 'Menunggu konfirmasi', bg: '#FBF0DC', color: '#9A6516' },
  confirmed: { label: 'Dikonfirmasi', bg: '#E2F0EE', color: '#27695F' },
  ready: { label: 'Siap diambil', bg: '#E6F0E9', color: '#2E5A43' },
  completed: { label: 'Selesai', bg: '#E2F0EE', color: '#27695F' },
  cancelled: { label: 'Dibatalkan', bg: '#FBEAE4', color: '#B0421F' },
}

export const STEP_ORDER: OrderStatus[] = ['submitted', 'confirmed', 'ready', 'completed']
export const STEP_LABEL: Record<string, string> = {
  submitted: 'Pesanan dibuat', confirmed: 'Dikonfirmasi admin', ready: 'Siap diambil / dikirim', completed: 'Selesai',
}
export const STEP_HINT: Record<string, string> = {
  submitted: 'Menunggu admin', confirmed: 'Disiapkan', ready: 'Hubungi admin untuk ambil', completed: 'Terima kasih!',
}

/** "dari Rp 25.000" untuk multi-varian, atau harga tunggal. */
export function priceLabel(menu: Menu): string {
  if (menu.variants.length > 1) return 'dari ' + fmt(Math.min(...menu.variants.map((v) => v.price)))
  return fmt(menu.variants[0]?.price ?? 0)
}

export function tagOf(menu: Menu): string {
  if (menu.category === 'frozen') return 'Frozen'
  return menu.variants.length > 1 ? `${menu.variants.length} varian` : 'Siap makan'
}

/** ISO datetime → "12 Jun 2026" di Asia/Jakarta. */
export function fmtDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })
}

/** Label rentang fulfillment PO, mis. "22 Jun – 26 Jun 2026" atau '—'. */
export function fulfillmentLabel(start: string | null, end: string | null): string {
  const s = start ? fmtDate(start) : ''
  const e = end ? fmtDate(end) : ''
  if (s && e) return `${s} – ${e}`
  return s || e || '—'
}
