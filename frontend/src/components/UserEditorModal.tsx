import { useAdmin } from '../store'
import { getTheme, BRAND } from '../theme'
import { inputStyle, labelStyle } from '../styles'
import { HoverButton } from '../ui'
import { CloseBtn } from './MenuEditorModal'

export function UserEditorModal() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const ud = s.userDraft
  if (s.editUserU === null || !ud) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '60px 20px', overflow: 'auto', background: 'rgba(20,12,8,0.55)', animation: 'overlayIn 0.18s ease',
      }}
    >
      <div onClick={s.closeUserEditor} style={{ position: 'fixed', inset: 0 }} />
      <div style={{ position: 'relative', width: 420, maxWidth: '100%', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, boxShadow: t.shadow, animation: 'modalIn 0.22s ease', zIndex: 61 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${t.rowBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700 }}>Edit admin</h2>
            {ud.super && (
              <span style={{ background: t.chipBg, color: t.chipColor, fontSize: 10, fontWeight: 800, borderRadius: 99, padding: '2px 8px', textTransform: 'uppercase' }}>Super User</span>
            )}
          </div>
          <CloseBtn onClick={s.closeUserEditor} />
        </div>
        <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle(t)}>Nama lengkap</label>
            <input value={ud.name} onChange={(e) => s.updateUserDraft({ name: e.target.value })} style={inputStyle(t)} />
          </div>
          <div>
            <label style={labelStyle(t)}>Username</label>
            <input value={ud.username} onChange={(e) => s.updateUserDraft({ username: e.target.value })} style={inputStyle(t)} />
          </div>
          <div>
            <label style={labelStyle(t)}>Password</label>
            <input value={ud.password} onChange={(e) => s.updateUserDraft({ password: e.target.value })} style={inputStyle(t, { fontFamily: 'monospace' })} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: `1px solid ${t.rowBorder}` }}>
          <HoverButton onClick={s.closeUserEditor} style={{ border: `1px solid ${t.inputBorder}`, background: t.surface, color: t.ink, fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '10px 18px' }} hover={{ opacity: 0.75 }}>Batal</HoverButton>
          <HoverButton onClick={s.saveUser} style={{ border: 'none', background: BRAND.terracotta, color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '10px 22px' }} hover={{ background: BRAND.terracottaDark }}>Simpan</HoverButton>
        </div>
      </div>
    </div>
  )
}
