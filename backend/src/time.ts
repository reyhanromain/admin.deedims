import { formatInTimeZone, toZonedTime } from 'date-fns-tz'
import { config } from './config'

/** Timezone aplikasi. Semua tampilan & penjadwalan pakai ini; DB tetap UTC. */
export const APP_TZ = config.tz // 'Asia/Jakarta' (WIB, UTC+7, tanpa DST)

/** Format sebuah Date (UTC di DB) ke string waktu Jakarta untuk ditampilkan. */
export function formatJakarta(date: Date, fmt = 'dd MMM yyyy, HH:mm'): string {
  return formatInTimeZone(date, APP_TZ, fmt)
}

/** Date yang sama, tapi "digeser" ke wall-clock Jakarta — berguna untuk komponen tanggal. */
export function toJakarta(date: Date): Date {
  return toZonedTime(date, APP_TZ)
}

/**
 * Ambang retensi: titik waktu `days` hari yang lalu (UTC).
 * Murni durasi, jadi timezone-agnostic — yang penting hanya umur baris.
 */
export function retentionCutoff(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}
