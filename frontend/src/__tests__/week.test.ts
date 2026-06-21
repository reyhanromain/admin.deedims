import { describe, expect, it } from 'vitest'
import { isoWeekToMonday, dateToIsoWeek, isoWeekRangeLabel, upcomingIsoWeeks } from '../format'

describe('isoWeekToMonday', () => {
  it('2026-W26 → Monday 22 Juni 2026 (UTC)', () => {
    const d = isoWeekToMonday('2026-W26')!
    expect(d.toISOString().slice(0, 10)).toBe('2026-06-22')
  })
  it('rejects malformed input', () => {
    expect(isoWeekToMonday('2026-26')).toBeNull()
    expect(isoWeekToMonday('')).toBeNull()
    expect(isoWeekToMonday('2026-W00')).toBeNull()
    expect(isoWeekToMonday('2026-W54')).toBeNull()
  })
})

describe('dateToIsoWeek', () => {
  it('round-trips with isoWeekToMonday', () => {
    expect(dateToIsoWeek(isoWeekToMonday('2026-W26')!)).toBe('2026-W26')
  })
  it('Jan 1 2027 belongs to ISO week 2026-W53', () => {
    expect(dateToIsoWeek(new Date(Date.UTC(2027, 0, 1)))).toBe('2026-W53')
  })
})

describe('isoWeekRangeLabel', () => {
  it('same month range', () => {
    expect(isoWeekRangeLabel('2026-W26')).toBe('22–26 Juni 2026')
  })
  it('cross-month range keeps both month names', () => {
    expect(isoWeekRangeLabel('2026-W18')).toBe('27 April–1 Mei 2026')
  })
  it('invalid → empty string', () => {
    expect(isoWeekRangeLabel('nope')).toBe('')
  })
})

describe('upcomingIsoWeeks', () => {
  it('on a weekday, starts at the current week', () => {
    const list = upcomingIsoWeeks(3, new Date(Date.UTC(2026, 5, 24, 5)))
    expect(list[0].value).toBe('2026-W26')
    expect(list[0].label).toBe('22–26 Juni 2026')
    expect(list).toHaveLength(3)
    expect(list[2].value).toBe('2026-W28')
  })
  it('on Friday, still offers the current week', () => {
    const list = upcomingIsoWeeks(2, new Date(Date.UTC(2026, 5, 26, 5)))
    expect(list[0].value).toBe('2026-W26')
    expect(list[0].label).toBe('22–26 Juni 2026')
  })
  it('on Saturday, skips the current week (range already over)', () => {
    const list = upcomingIsoWeeks(2, new Date(Date.UTC(2026, 5, 27, 5)))
    expect(list[0].value).toBe('2026-W27')
    expect(list[0].label).toBe('29 Juni–3 Juli 2026')
  })
  it('on Sunday in Asia/Jakarta, skips the current week', () => {
    // 2026-06-21 08:10Z is Sunday 15:10 WIB → current week 2026-W25 skipped.
    const list = upcomingIsoWeeks(1, new Date(Date.UTC(2026, 5, 21, 8, 10)))
    expect(list[0].value).toBe('2026-W26')
    expect(list[0].label).toBe('22–26 Juni 2026')
  })
})
