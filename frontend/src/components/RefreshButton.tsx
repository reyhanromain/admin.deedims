import { useAdmin } from '../store'
import { getTheme } from '../theme'
import { HoverButton, Icon } from '../ui'

/** Segarkan data layar aktif (force-refetch list/summary layar tsb). */
export function RefreshButton() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const loading = s.isScreenLoading()

  return (
    <HoverButton
      onClick={() => s.refresh()}
      title="Segarkan data"
      disabled={loading}
      style={{
        width: 36, height: 36, border: `1px solid ${t.inputBorder}`, background: t.surface, color: t.ink,
        borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
      hover={{ opacity: 0.75 }}
    >
      <Icon
        size={16}
        path="M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
        style={loading ? { animation: 'spin 0.8s linear infinite' } : undefined}
      />
    </HoverButton>
  )
}
