import { useAdmin } from '../store'
import { getTheme } from '../theme'

export function Toast() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  if (!s.toast) return null
  return (
    <div
      style={{
        position: 'fixed', bottom: 26, left: '50%', transform: 'translateX(-50%)',
        background: t.toastBg, color: t.toastColor, fontSize: 13.5, fontWeight: 600,
        borderRadius: 12, padding: '12px 20px', boxShadow: t.shadow,
        animation: 'toastIn 0.25s ease', zIndex: 50, maxWidth: '80vw',
      }}
    >
      {s.toast}
    </div>
  )
}
