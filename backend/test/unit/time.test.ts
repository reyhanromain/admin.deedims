import { describe, expect, it } from 'vitest'
import { formatJakarta, retentionCutoff, APP_TZ } from '../../src/time'

describe('time helpers', () => {
  it('APP_TZ = Asia/Jakarta', () => {
    expect(APP_TZ).toBe('Asia/Jakarta')
  })

  it('formatJakarta menampilkan UTC dalam WIB (+7)', () => {
    // 02:13 UTC → 09:13 WIB
    const utc = new Date('2026-06-12T02:13:00Z')
    expect(formatJakarta(utc)).toBe('12 Jun 2026, 09:13')
  })

  it('formatJakarta menerima format custom', () => {
    const utc = new Date('2026-06-12T17:00:00Z') // → 13 Jun 00:00 WIB
    expect(formatJakarta(utc, 'yyyy-MM-dd HH:mm')).toBe('2026-06-13 00:00')
  })

  it('retentionCutoff = now - N hari', () => {
    const now = new Date('2026-06-16T00:00:00Z')
    const cutoff = retentionCutoff(14, now)
    expect(cutoff.toISOString()).toBe('2026-06-02T00:00:00.000Z')
  })
})
