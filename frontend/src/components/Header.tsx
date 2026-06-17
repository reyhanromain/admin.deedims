import { useAdmin } from '../store'
import { getTheme, BRAND, SCREEN_TITLES, poStatusBadge, inactiveBadge } from '../theme'
import { initials } from '../format'
import { HoverButton, Icon } from '../ui'
import { RefreshButton } from './RefreshButton'

export function Header() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const openPo = s.dashboard?.openPreorder ?? null
  const po = poStatusBadge(s.dark)
  const inactive = inactiveBadge(s.dark)
  const me = s.currentUser ?? { name: '', username: '', super: false }

  const poPillBg = openPo ? po.open.bg : inactive.bg
  const poPillColor = openPo ? po.open.color : inactive.color
  const poPillText = openPo ? 'PO Open · ' + openPo.title : 'PO Closed'

  return (
    <header
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '16px 28px',
        background: t.surfaceAlt, borderBottom: `1px solid ${t.border}`,
      }}
    >
      <h1 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', flex: 1 }}>
        {SCREEN_TITLES[s.screen]}
      </h1>

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, background: poPillBg, color: poPillColor,
          borderRadius: 99, padding: '6px 14px', fontSize: 12.5, fontWeight: 700,
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: 99, background: 'currentColor', display: 'inline-block' }} />
        {poPillText}
      </div>

      <RefreshButton />

      <HoverButton
        onClick={() => s.set({ dark: !s.dark })}
        title="Mode terang / gelap"
        style={{
          width: 36, height: 36, border: `1px solid ${t.inputBorder}`, background: t.surface, color: t.ink,
          borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        hover={{ opacity: 0.75 }}
      >
        <Icon
          size={17}
          path={
            s.dark
              ? 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42'
              : 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'
          }
        />
      </HoverButton>

      <div style={{ position: 'relative' }}>
        <HoverButton
          onClick={() => s.set({ profileOpen: !s.profileOpen })}
          style={{
            width: 36, height: 36, border: 'none', borderRadius: 99, background: BRAND.terracotta, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14,
          }}
          hover={{ opacity: 0.85 }}
        >
          {initials(me.name)}
        </HoverButton>

        {s.profileOpen && (
          <>
            <div onClick={() => s.set({ profileOpen: false })} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
            <div
              style={{
                position: 'absolute', top: 44, right: 0, width: 240, background: t.surface,
                border: `1px solid ${t.border}`, borderRadius: 14, boxShadow: t.shadow, padding: 8, zIndex: 41,
              }}
            >
              <div style={{ padding: '10px 12px 12px 12px', borderBottom: `1px solid ${t.rowBorder}` }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{me.name}</div>
                <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>
                  @{me.username}{me.super ? ' · Super User' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 12px' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Mode gelap</span>
                <button
                  onClick={() => s.set({ dark: !s.dark })}
                  style={{
                    border: 'none', padding: 0, width: 42, height: 24, borderRadius: 99,
                    background: s.dark ? BRAND.bamboo : '#D4C4B0', position: 'relative', transition: 'background 0.15s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute', top: 3, left: s.dark ? 21 : 3, width: 18, height: 18, borderRadius: 99,
                      background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    }}
                  />
                </button>
              </div>
              <HoverButton
                onClick={s.doLogout}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 9, border: 'none', background: 'none',
                  color: BRAND.terracotta, fontSize: 13, fontWeight: 700, padding: '11px 12px', borderRadius: 9, textAlign: 'left',
                }}
                hover={{ opacity: 0.7 }}
              >
                <Icon size={16} path="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" />
                Keluar
              </HoverButton>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
