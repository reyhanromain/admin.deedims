import { useAdmin } from '../store'
import { getTheme } from '../theme'
import { HoverButton } from '../ui'
import { useIsMobile } from '../responsive'

/** Pager prev/next + "Hal X / Y" — dipakai semua layar list. */
export function Pager({ page, totalPages, loading, onPage }: { page: number; totalPages: number; loading?: boolean; onPage: (p: number) => void }) {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const isMobile = useIsMobile()

  const btn = (disabled: boolean) => ({
    border: `1px solid ${t.inputBorder}`,
    background: t.surface,
    color: disabled ? t.faint : t.ink,
    fontSize: 12.5, fontWeight: 700, borderRadius: 8, padding: isMobile ? '9px 12px' : '7px 13px',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1,
    flex: isMobile ? 1 : '0 0 auto',
  })

  const prevDisabled = page <= 1 || !!loading
  const nextDisabled = page >= totalPages || !!loading

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: isMobile ? 'stretch' : 'flex-end', marginTop: 14, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
      <span style={{ fontSize: 12.5, color: t.muted, fontWeight: 700, order: isMobile ? -1 : 0, flex: isMobile ? '1 1 100%' : '0 0 auto', textAlign: isMobile ? 'center' : 'left' }}>Hal {page} / {totalPages}</span>
      <HoverButton disabled={prevDisabled} onClick={() => onPage(page - 1)} style={btn(prevDisabled)} hover={prevDisabled ? {} : { opacity: 0.75 }}>‹ {isMobile ? 'Prev' : 'Sebelumnya'}</HoverButton>
      <HoverButton disabled={nextDisabled} onClick={() => onPage(page + 1)} style={btn(nextDisabled)} hover={nextDisabled ? {} : { opacity: 0.75 }}>{isMobile ? 'Next' : 'Berikutnya'} ›</HoverButton>
    </div>
  )
}
