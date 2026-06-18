import { useAdmin } from '../store'
import { getTheme, BRAND, ICONS, SCREEN_NAV } from '../theme'
import { HoverButton, Icon } from '../ui'
import { useIsMobile } from '../responsive'

export function Sidebar() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const isMobile = useIsMobile()

  // Badge global dari ringkasan dashboard (dimuat saat boot).
  const orderBadge = s.dashboard ? s.dashboard.kpis.newOrders + s.dashboard.kpis.cancelRequests : 0

  const showLabels = !s.sidebarCollapsed
  const justify = s.sidebarCollapsed ? 'center' : 'flex-start'

  if (isMobile) {
    return (
      <aside
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          background: t.sideBg,
          borderTop: `1px solid ${t.sideBorder}`,
          padding: '8px 8px calc(8px + env(safe-area-inset-bottom))',
        }}
      >
        <nav style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {SCREEN_NAV.map((nv) => {
            const active = s.screen === nv.id
            const hasBadge = nv.id === 'orders' && orderBadge > 0
            return (
              <HoverButton
                key={nv.id}
                onClick={() => s.goScreen(nv.id)}
                title={nv.label}
                style={{
                  position: 'relative',
                  flex: '0 0 70px',
                  minHeight: 56,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '7px 6px',
                  border: 'none',
                  borderRadius: 8,
                  background: active ? BRAND.terracotta : 'transparent',
                  color: active ? '#fff' : t.sideText,
                  fontSize: 10.5,
                  fontWeight: active ? 800 : 700,
                  textAlign: 'center',
                }}
                hover={{ filter: 'brightness(1.15)' }}
              >
                <Icon path={ICONS[nv.id]} size={18} style={{ flexShrink: 0 }} />
                <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nv.label}</span>
                {hasBadge && (
                  <span style={{ position: 'absolute', top: 5, right: 12, background: BRAND.terracotta, color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 99, padding: '1px 5px', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>
                    {orderBadge}
                  </span>
                )}
              </HoverButton>
            )
          })}
        </nav>
      </aside>
    )
  }

  return (
    <aside
      style={{
        width: s.sidebarCollapsed ? 66 : 232,
        flexShrink: 0,
        background: t.sideBg,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 12px',
        transition: 'width 0.2s ease',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: justify, gap: 10,
          padding: '4px 8px 18px 8px', borderBottom: `1px solid ${t.sideBorder}`, marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 38, height: 38, flexShrink: 0, borderRadius: 12, background: BRAND.terracotta, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 19, fontWeight: 800,
          }}
        >
          D
        </div>
        {showLabels && (
          <div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', color: t.sideInk }}>
              Deedims
            </div>
            <div style={{ fontSize: 11, color: t.sideMuted, fontWeight: 500 }}>Admin CMS</div>
          </div>
        )}
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {SCREEN_NAV.map((nv) => {
          const active = s.screen === nv.id
          const hasBadge = nv.id === 'orders' && orderBadge > 0
          return (
            <HoverButton
              key={nv.id}
              onClick={() => s.goScreen(nv.id)}
              title={nv.label}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: justify, gap: 10,
                padding: '10px 12px', border: 'none', borderRadius: 10,
                background: active ? BRAND.terracotta : 'transparent',
                color: active ? '#fff' : t.sideText,
                fontSize: 13.5, fontWeight: active ? 700 : 600, textAlign: 'left', transition: 'filter 0.15s',
              }}
              hover={{ filter: 'brightness(1.18)' }}
            >
              <Icon path={ICONS[nv.id]} size={18} style={{ flexShrink: 0 }} />
              {showLabels && (
                <>
                  <span style={{ flex: 1 }}>{nv.label}</span>
                  {hasBadge && (
                    <span style={{ background: BRAND.terracotta, color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '1px 7px' }}>
                      {orderBadge}
                    </span>
                  )}
                </>
              )}
            </HoverButton>
          )
        })}
      </nav>

      <HoverButton
        onClick={() => s.set({ sidebarCollapsed: !s.sidebarCollapsed })}
        title="Minimize sidebar"
        style={{
          marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: justify, gap: 10,
          padding: '10px 12px', border: 'none', borderRadius: 10, background: 'transparent',
          color: t.sideMuted, fontSize: 13, fontWeight: 600,
        }}
        hover={{ filter: 'brightness(1.3)' }}
      >
        <Icon
          path={s.sidebarCollapsed ? 'M13 17l5-5-5-5 M6 17l5-5-5-5' : 'M11 17l-5-5 5-5 M18 17l-5-5 5-5'}
          size={18}
          style={{ flexShrink: 0 }}
        />
        {showLabels && <span style={{ flex: 1 }}>Minimize</span>}
      </HoverButton>
    </aside>
  )
}
