import { useAdmin } from '../store'
import { getTheme, BRAND } from '../theme'
import { inputStyle, labelStyle } from '../styles'
import { HoverButton } from '../ui'

export function Login() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 380,
          maxWidth: '100%',
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 20,
          padding: '36px 32px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 26 }}>
          <div
            style={{
              width: 52, height: 52, borderRadius: 16, background: BRAND.terracotta, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 14,
            }}
          >
            D
          </div>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Deedims Admin
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle(t)}>Username</label>
          <input
            value={s.loginUser}
            onChange={(e) => s.set({ loginUser: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && s.doLogin()}
            style={inputStyle(t, { fontSize: 14, padding: '11px 13px' })}
          />
        </div>
        <div style={{ marginBottom: 22 }}>
          <label style={labelStyle(t)}>Password</label>
          <input
            type="password"
            value={s.loginPass}
            onChange={(e) => s.set({ loginPass: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && s.doLogin()}
            style={inputStyle(t, { fontSize: 14, padding: '11px 13px' })}
          />
        </div>
        <HoverButton
          onClick={s.doLogin}
          style={{
            width: '100%', border: 'none', background: BRAND.terracotta, color: '#fff',
            fontSize: 14, fontWeight: 700, borderRadius: 11, padding: 13,
          }}
          hover={{ background: BRAND.terracottaDark }}
        >
          Masuk
        </HoverButton>
      </div>
    </div>
  )
}
