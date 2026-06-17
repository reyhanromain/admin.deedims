import { useAdmin } from '../store'
import { getTheme } from '../theme'
import { HoverButton } from '../ui'

/** Pager prev/next + "Hal X / Y" — dipakai semua layar list. */
export function Pager({ page, totalPages, loading, onPage }: { page: number; totalPages: number; loading?: boolean; onPage: (p: number) => void }) {
  const s = useAdmin()
  const t = getTheme(s.dark)

  const btn = (disabled: boolean) => ({
    border: `1px solid ${t.inputBorder}`,
    background: t.surface,
    color: disabled ? t.faint : t.ink,
    fontSize: 12.5, fontWeight: 700, borderRadius: 9, padding: '7px 13px',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1,
  })

  const prevDisabled = page <= 1 || !!loading
  const nextDisabled = page >= totalPages || !!loading

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
      <HoverButton disabled={prevDisabled} onClick={() => onPage(page - 1)} style={btn(prevDisabled)} hover={prevDisabled ? {} : { opacity: 0.75 }}>‹ Sebelumnya</HoverButton>
      <span style={{ fontSize: 12.5, color: t.muted, fontWeight: 600 }}>Hal {page} / {totalPages}</span>
      <HoverButton disabled={nextDisabled} onClick={() => onPage(page + 1)} style={btn(nextDisabled)} hover={nextDisabled ? {} : { opacity: 0.75 }}>Berikutnya ›</HoverButton>
    </div>
  )
}
