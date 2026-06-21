import { describe, expect, it } from 'vitest'
import { formatFulfillmentWeek, parseFulfillmentWeek } from '../src/time'

describe('fulfillment week', () => {
  it('mengubah ISO week menjadi Senin-Jumat pada tengah malam WIB', () => {
    const range = parseFulfillmentWeek('2026-W26')
    expect(range?.start.toISOString()).toBe('2026-06-21T17:00:00.000Z')
    expect(range?.end.toISOString()).toBe('2026-06-25T17:00:00.000Z')
    expect(formatFulfillmentWeek(range?.start ?? null, range?.end ?? null)).toBe('22–26 Juni 2026')
  })

  it('memformat pekan lintas bulan dan menolak ISO week tidak valid', () => {
    const range = parseFulfillmentWeek('2026-W27')
    expect(formatFulfillmentWeek(range?.start ?? null, range?.end ?? null)).toBe('29 Juni–3 Juli 2026')
    expect(parseFulfillmentWeek('2025-W53')).toBeNull()
    expect(parseFulfillmentWeek('2026-26')).toBeNull()
  })
})
