import { useMemo } from 'react'
import type { Theme } from '../theme'
import { inputStyle } from '../styles'
import { upcomingIsoWeeks, isoWeekRangeLabel } from '../format'

type Props = {
  t: Theme
  value: string
  onChange: (value: string) => void
  /** How many upcoming weeks to offer. */
  weeks?: number
}

/**
 * Week selector backed by a native <select>, so it renders consistently across
 * browsers (including Firefox, which has no native type="week" picker).
 * Value is an ISO week string "YYYY-Www"; options show the Mon–Fri range label.
 */
export function WeekPicker({ t, value, onChange, weeks = 16 }: Props) {
  const options = useMemo(() => upcomingIsoWeeks(weeks), [weeks])
  // Keep a previously stored value selectable even if it predates the window.
  const hasValue = value !== ''
  const valueInList = options.some((o) => o.value === value)
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={inputStyle(t, { padding: '9px 12px', cursor: 'pointer' })}
    >
      <option value="">Pilih pekan…</option>
      {hasValue && !valueInList && (
        <option value={value}>{isoWeekRangeLabel(value) || value}</option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
