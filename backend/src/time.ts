import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'
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

function dateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value)
  return { year: value('year'), month: value('month'), day: value('day') }
}

/** Ubah ISO week (mis. 2026-W26) menjadi Senin-Jumat pada tengah malam WIB. */
export function parseFulfillmentWeek(value: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const week = Number(match[2])
  if (week < 1 || week > 53) return null

  const januaryFourth = new Date(Date.UTC(year, 0, 4))
  const januaryFourthDay = januaryFourth.getUTCDay() || 7
  const monday = new Date(Date.UTC(year, 0, 4 - januaryFourthDay + 1 + (week - 1) * 7))
  const thursday = new Date(monday.getTime() + 3 * 24 * 60 * 60 * 1000)
  if (thursday.getUTCFullYear() !== year) return null

  const friday = new Date(monday.getTime() + 4 * 24 * 60 * 60 * 1000)
  return {
    start: fromZonedTime(`${monday.toISOString().slice(0, 10)}T00:00:00`, APP_TZ),
    end: fromZonedTime(`${friday.toISOString().slice(0, 10)}T00:00:00`, APP_TZ),
  }
}

/** Format rentang hari kerja dengan nama bulan Indonesia. */
export function formatFulfillmentWeek(start: Date | null, end: Date | null): string | null {
  if (!start || !end) return null
  const { year: startYear, month: startMonth, day: startDay } = dateParts(start)
  const { year: endYear, month: endMonth, day: endDay } = dateParts(end)
  const month = (date: Date) => new Intl.DateTimeFormat('id-ID', { timeZone: APP_TZ, month: 'long' }).format(date)

  if (startYear === endYear && startMonth === endMonth) return `${startDay}–${endDay} ${month(end)} ${endYear}`
  if (startYear === endYear) return `${startDay} ${month(start)}–${endDay} ${month(end)} ${endYear}`
  return `${startDay} ${month(start)} ${startYear}–${endDay} ${month(end)} ${endYear}`
}

/**
 * Ambang retensi: titik waktu `days` hari yang lalu (UTC).
 * Murni durasi, jadi timezone-agnostic — yang penting hanya umur baris.
 */
export function retentionCutoff(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}
