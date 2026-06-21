export function fmt(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID')
}

export function fmtDate(iso: string): string {
  if (!iso) return 'TBD'
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

const ID_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

/** Parse "YYYY-Www" → UTC date of that ISO week's Monday. Returns null when invalid. */
export function isoWeekToMonday(value: string): Date | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const week = Number(match[2])
  if (week < 1 || week > 53) return null
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Dow = jan4.getUTCDay() || 7
  const week1Monday = new Date(jan4)
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Dow - 1))
  const monday = new Date(week1Monday)
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7)
  return monday
}

/** ISO week string for a given UTC date, e.g. "2026-W26". */
export function dateToIsoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dow = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dow)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Label Senin–Jumat dari ISO week, mis. "22–26 Juni 2026". Empty value → ''. */
export function isoWeekRangeLabel(value: string): string {
  const monday = isoWeekToMonday(value)
  if (!monday) return ''
  const friday = new Date(monday)
  friday.setUTCDate(monday.getUTCDate() + 4)
  const sd = monday.getUTCDate()
  const sm = monday.getUTCMonth()
  const sy = monday.getUTCFullYear()
  const ed = friday.getUTCDate()
  const em = friday.getUTCMonth()
  const ey = friday.getUTCFullYear()
  if (sy === ey && sm === em) return `${sd}–${ed} ${ID_MONTHS[em]} ${ey}`
  if (sy === ey) return `${sd} ${ID_MONTHS[sm]}–${ed} ${ID_MONTHS[em]} ${ey}`
  return `${sd} ${ID_MONTHS[sm]} ${sy}–${ed} ${ID_MONTHS[em]} ${ey}`
}

/** Daftar ISO week ke depan mulai pekan yang memuat `from` (default: hari ini). */
export function upcomingIsoWeeks(count: number, from: Date = new Date()): { value: string; label: string }[] {
  const base = isoWeekToMonday(dateToIsoWeek(from))
  const weeks: { value: string; label: string }[] = []
  if (!base) return weeks
  for (let i = 0; i < count; i++) {
    const monday = new Date(base)
    monday.setUTCDate(base.getUTCDate() + i * 7)
    const value = dateToIsoWeek(monday)
    weeks.push({ value, label: isoWeekRangeLabel(value) })
  }
  return weeks
}
